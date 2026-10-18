import React, { useState, useMemo, useEffect } from "react";
import { parseRank } from "../lib/rankUtils";
import { useMilitars } from "../contexts/MilitarContext";
import { db, auth } from "../lib/firebase";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import {
  Search,
  Truck,
  Settings,
  FolderCog
} from "lucide-react";
import { cn, getObmSettingsDocKey, getObmSettingsFallbackKeys, cleanUndefined } from "../lib/utils";
import { UserProfile } from "../types";
import { CorrelacaoFuncoesModal } from "./CorrelacaoFuncoesModal";
import { ControleCategoriasModal, CategoryConfig, DEFAULT_CATEGORIES } from "./ControleCategoriasModal";

import { checkConditions, getValue, sortByRankAndRg } from "../features/funcoes/lib/funcoesUtils";
import { FuncoesFilterBar } from "../features/funcoes/components/FuncoesFilterBar";
import { FuncoesTable } from "../features/funcoes/components/FuncoesTable";

export { checkConditions };

interface ControleDeFuncoesProps {
  obmContext: string;
}

export function ControleDeFuncoes({ obmContext }: ControleDeFuncoesProps) {
  const { militars, updateMilitarLocal } = useMilitars();
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [activeTab, setActiveTab] = useState<string>("condutores");

  const [filterPostoGrad, setFilterPostoGrad] = useState<string[]>([]);
  const [filterQuadro, setFilterQuadro] = useState<string[]>([]);
  const [filterAla, setFilterAla] = useState<string[]>([]);
  const [filterSituacao, setFilterSituacao] = useState<string[]>([]);
  const [filterCursos, setFilterCursos] = useState<string[]>([]);
  const [somenteAtivos, setSomenteAtivos] = useState(false);

  useEffect(() => {
    if (!db || !obmContext) return;
    const canonicalKey = getObmSettingsDocKey(obmContext);
    const docRef = doc(db, "obm_settings", canonicalKey);
    const unsub = onSnapshot(docRef, async (snap) => {
      let rawCategories = snap.exists() ? snap.data()?.categorias_funcoes : null;
      if (!rawCategories) {
        const fallbacks = getObmSettingsFallbackKeys(obmContext).filter(k => k !== canonicalKey);
        for (const fk of fallbacks) {
          try {
            const fallbackSnap = await getDoc(doc(db, "obm_settings", fk));
            if (fallbackSnap.exists() && fallbackSnap.data()?.categorias_funcoes) {
              rawCategories = fallbackSnap.data()?.categorias_funcoes;
              setDoc(docRef, { categorias_funcoes: rawCategories }, { merge: true }).catch(() => {});
              break;
            }
          } catch(e) {}
        }
      }

      if (rawCategories && Array.isArray(rawCategories)) {
        const migrated = rawCategories.map((cat: any) => {
          if (cat.activeProperty !== undefined) return cat;
          let activeProp = `dynamicFunctions.ativo_${cat.id}`;
          const newFunctions = [...(cat.functions || [])];
          const ativoIndex = newFunctions.findIndex((f: any) => f.name.toLowerCase() === "ativo");
          if (ativoIndex >= 0) {
            activeProp = newFunctions[ativoIndex].id;
            newFunctions.splice(ativoIndex, 1);
          } else {
            const defCat = DEFAULT_CATEGORIES.find(d => d.id === cat.id);
            if (defCat) activeProp = defCat.activeProperty;
          }
          return { ...cat, activeProperty: activeProp, functions: newFunctions };
        });
        setCategories(migrated);
      } else {
        setCategories(DEFAULT_CATEGORIES);
      }
    });
    return () => unsub();
  }, [obmContext]);

  const {
    uniqueRanks,
    uniqueQuadros,
    uniqueAlas,
    uniqueSituacoes,
    uniqueCursos,
  } = useMemo(() => {
    const cursosSet = new Set<string>();
    militars.forEach((m) => {
      const rawMObm = m.obm ? m.obm.trim().toUpperCase() : "10º GBM";
      const ctxObm = (obmContext || "").trim().toUpperCase();
      const isSameObm = !ctxObm || ctxObm === "GLOBAL" || rawMObm === ctxObm;
      if (isSameObm && m.cursos) {
        m.cursos.split(",").forEach((c) => {
          const tc = c.trim();
          if (tc) cursosSet.add(tc);
        });
      }
    });

    const contextMilitars = militars.filter((m) => {
      const rawMObm = m.obm ? m.obm.trim().toUpperCase() : "10º GBM";
      const ctxObm = (obmContext || "").trim().toUpperCase();
      return !ctxObm || ctxObm === "GLOBAL" || rawMObm === ctxObm;
    });

    return {
      uniqueRanks: Array.from(
        new Set(contextMilitars.map((m) => parseRank(m.rank)).filter(Boolean)),
      ) as string[],
      uniqueQuadros: Array.from(
        new Set(contextMilitars.map((m) => (m.quadro ? m.quadro.split('/')[0] : '')).filter(Boolean)),
      ) as string[],
      uniqueAlas: Array.from(
        new Set(
          contextMilitars
            .map((m) => m.ala?.toString())
            .filter((v) => v && v.toUpperCase() !== "ALA"),
        ),
      ) as string[],
      uniqueSituacoes: Array.from(
        new Set(contextMilitars.map((m) => m.situacao).filter(Boolean)),
      ) as string[],
      uniqueCursos: Array.from(cursosSet).sort(),
    };
  }, [militars, obmContext]);

  const filteredMilitars = useMemo(() => {
    return militars
      .filter((m) => {
        const rawMObm = m.obm ? m.obm.trim().toUpperCase() : "10º GBM";
        const ctxObm = (obmContext || "").trim().toUpperCase();
        const isSameObm = !ctxObm || ctxObm === "GLOBAL" || rawMObm === ctxObm;
        if (!isSameObm) return false;

        const r = (m.rank || "").toUpperCase().trim();
        const isOff = [
          "CEL", "CORONEL", "TC", "TENENTE CORONEL", "TENENTE-CORONEL",
          "MAJ", "MAJOR", "CAP", "CAPITÃO", "1º TEN", "1º TENENTE",
          "2º TEN", "2º TENENTE", "ASP", "ASPIRANTE",
        ].includes(r);

        if (isOff) return false;

        const isActiveInCurrentTab = () => {
          if (activeTab === "mostruario") return true;
          const cat = categories.find(c => c.id === activeTab);
          if (!cat) return false;
          if (cat.activeProperty) {
            return getValue(m, cat.activeProperty);
          }
          return false;
        };

        const active = isActiveInCurrentTab();

        let matches = true;
        if (search.length >= 1) {
          const s = search.toLowerCase();
          matches =
            matches &&
            ((m.name || "").toLowerCase().includes(s) ||
              (m.warName || "").toLowerCase().includes(s) ||
              (m.rg || "").toString().includes(search));
        }
        if (filterPostoGrad.length > 0)
          matches = matches && filterPostoGrad.includes(parseRank(m.rank || ""));
        if (filterQuadro.length > 0)
          matches = matches && filterQuadro.includes(m.quadro ? m.quadro.split('/')[0] : '');
        if (filterAla.length > 0)
          matches = matches && filterAla.includes(m.ala?.toString() || "");
        if (filterSituacao.length > 0)
          matches = matches && filterSituacao.includes(m.situacao || "");
        if (filterCursos.length > 0) {
          const userCursos = m.cursos
            ? m.cursos.toUpperCase().split(",").map((s) => s.trim())
            : [];
          matches =
            matches &&
            filterCursos.some((c) => c && userCursos.includes(c.toUpperCase()));
        }

        if (!matches) return false;

        if (somenteAtivos) return true;
        if (search.length >= 1) return true;

        return active;
      })
      .sort(sortByRankAndRg)
      .slice(0, 100);
  }, [
    militars, search, obmContext, activeTab, categories,
    filterPostoGrad, filterQuadro, filterAla, filterSituacao, filterCursos, somenteAtivos,
  ]);

  const toggleValue = async (militar: UserProfile, path: string) => {
    if (!militar.rg || !path) return;
    
    const currentState = getValue(militar, path);
    
    if (!currentState) {
      let fnConfig = null;
      for (const cat of categories) {
        const found = cat.functions.find(f => f.id === path);
        if (found) {
          fnConfig = found;
          break;
        }
      }
      
      if (fnConfig && fnConfig.conditions) {
        const res = checkConditions(militar, fnConfig.conditions);
        if (!res.valid) {
          alert(`Não é possível habilitar esta função para ${militar.name || militar.warName}:\n\n${res.reason}`);
          return;
        }
      }
    }

    const safeRg = String(militar.rg).replace(/^0+/, "").replace(/\D/g, "");
    setProcessing(safeRg);

    let newData: Partial<UserProfile> = {};

    if (path.startsWith("viaturas.")) {
      const key = path.split(".")[1];
      newData = { viaturas: { ...(militar.viaturas || {}), [key]: !currentState } };
    } else if (path.startsWith("dynamicFunctions.")) {
      const key = path.split(".")[1];
      newData = { dynamicFunctions: { ...(militar.dynamicFunctions || {}), [key]: !currentState } };
    } else {
      newData = { [path]: !currentState };
    }

    updateMilitarLocal(safeRg, newData);

    try {
      if (db) {
        let updatePayload: any = {};
        if (path.startsWith("viaturas.")) {
          const key = path.split(".")[1];
          updatePayload = { viaturas: { ...(militar.viaturas || {}), [key]: !getValue(militar, path) } };
        } else if (path.startsWith("dynamicFunctions.")) {
          const key = path.split(".")[1];
          updatePayload = { dynamicFunctions: { ...(militar.dynamicFunctions || {}), [key]: !getValue(militar, path) } };
        } else {
          updatePayload = { [path]: !getValue(militar, path) };
        }
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
        await fetch('/api/militar/update', {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          method: 'POST',
          body: JSON.stringify({ rg: safeRg, data: cleanUndefined(updatePayload) })
        });
      }
      setTimeout(() => {
        setProcessing(null);
      }, 300);
    } catch (e) {
      console.error(e);
      setProcessing(null);
    }
  };

  const toggleColumnAll = async (path: string) => {
    if (filteredMilitars.length === 0 || !path) return;
    const allChecked = filteredMilitars.every((m) => getValue(m, path));
    const newState = !allChecked;

    let fnConfig = null;
    if (newState) {
      for (const cat of categories) {
        const found = cat.functions.find(f => f.id === path);
        if (found) {
          fnConfig = found;
          break;
        }
      }
    }

    const militarsToUpdate = filteredMilitars.filter(m => {
      if (!m.rg) return false;
      if (newState && fnConfig && fnConfig.conditions) {
        return checkConditions(m, fnConfig.conditions).valid;
      }
      return true;
    });

    if (militarsToUpdate.length === 0) {
      if (newState) alert("Nenhum militar atende aos requisitos desta função na visualização atual.");
      return;
    }

    militarsToUpdate.forEach((m) => {
      const safeRg = String(m.rg).replace(/^0+/, "").replace(/\D/g, "");
      let newData: Partial<UserProfile> = {};
      if (path.startsWith("viaturas.")) {
        const key = path.split(".")[1];
        newData = { viaturas: { ...(m.viaturas || {}), [key]: newState } };
      } else if (path.startsWith("dynamicFunctions.")) {
        const key = path.split(".")[1];
        newData = { dynamicFunctions: { ...(m.dynamicFunctions || {}), [key]: newState } };
      } else {
        newData = { [path]: newState };
      }
      updateMilitarLocal(safeRg, newData);
    });

    await Promise.all(
      militarsToUpdate.map(async (m) => {
        if (!m.rg) return Promise.resolve();
        const safeRg = String(m.rg).replace(/^0+/, "").replace(/\D/g, "");
        if (db) {
          let updatePayload: any = {};
          if (path.startsWith("viaturas.")) {
            const key = path.split('.')[1];
            updatePayload = { viaturas: { ...(m.viaturas || {}), [key]: newState } };
          } else if (path.startsWith("dynamicFunctions.")) {
            const key = path.split('.')[1];
            updatePayload = { dynamicFunctions: { ...(m.dynamicFunctions || {}), [key]: newState } };
          } else {
            updatePayload = { [path]: newState };
          }
          const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
          return fetch('/api/militar/update', {
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            method: 'POST',
            body: JSON.stringify({ rg: safeRg, data: cleanUndefined(updatePayload) })
          }).catch(() => {});
        }
        return Promise.resolve();
      }),
    );
  };

  const activeCategoryData = categories.find(c => c.id === activeTab) || categories[0];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <CorrelacaoFuncoesModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        obmContext={obmContext}
      />
      <ControleCategoriasModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        obmContext={obmContext}
        initialCategories={categories}
      />
      <div className="p-4 sm:p-6 bg-white border-b border-slate-200 shrink-0">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600" />
                Controle de Funções
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Gerencie categorias, funções e habilitações da {obmContext}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar militar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border-2 border-slate-200 rounded-lg text-sm font-medium focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all shadow-sm"
                />
              </div>
              <button
                onClick={() => setIsCatModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm whitespace-nowrap cursor-pointer"
              >
                <FolderCog className="w-4 h-4" />
                <span className="hidden sm:inline">Categorias e Funções</span>
              </button>
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-2 rounded-lg text-sm transition-colors border border-slate-200 shadow-sm whitespace-nowrap cursor-pointer"
                title="Configurar Correlacionamento de Funções"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Regras de Escala</span>
              </button>
            </div>
          </div>

          <div className="flex overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs min-w-max">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveTab(cat.id);
                    setSearch("");
                  }}
                  className={cn(
                    "px-3.5 py-1.5 text-xs font-black rounded-lg transition-all whitespace-nowrap cursor-pointer uppercase tracking-wider",
                    activeTab === cat.id
                      ? "bg-white text-indigo-700 shadow-xs border border-slate-200 dark:border-slate-700"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/60",
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <FuncoesFilterBar
          uniqueRanks={uniqueRanks}
          filterPostoGrad={filterPostoGrad}
          setFilterPostoGrad={setFilterPostoGrad}
          uniqueQuadros={uniqueQuadros}
          filterQuadro={filterQuadro}
          setFilterQuadro={setFilterQuadro}
          uniqueAlas={uniqueAlas}
          filterAla={filterAla}
          setFilterAla={setFilterAla}
          uniqueSituacoes={uniqueSituacoes}
          filterSituacao={filterSituacao}
          setFilterSituacao={setFilterSituacao}
          uniqueCursos={uniqueCursos}
          filterCursos={filterCursos}
          setFilterCursos={setFilterCursos}
          somenteAtivos={somenteAtivos}
          setSomenteAtivos={setSomenteAtivos}
        />
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <FuncoesTable
          displayMilitars={filteredMilitars}
          activeCategoryData={activeCategoryData}
          processing={processing}
          onToggleValue={toggleValue}
          onToggleColumnAll={toggleColumnAll}
          getValue={getValue}
        />
      </div>
    </div>
  );
}
