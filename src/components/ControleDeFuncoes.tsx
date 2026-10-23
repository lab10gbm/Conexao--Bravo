import React, { useState, useMemo, useEffect } from "react";
import { parseRank } from "../lib/rankUtils";
import { useMilitars } from "../contexts/MilitarContext";
import { db, auth } from "../lib/firebase";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import {
  Search,
  Truck,
  Settings,
  FolderCog,
  Briefcase,
  ShieldAlert,
  LayoutGrid
} from "lucide-react";
import { cn, normalizeObm, getObmSettingsDocKey, getObmSettingsFallbackKeys, cleanUndefined } from "../lib/utils";
import { UserProfile } from "../types";
import { CorrelacaoFuncoesModal } from "./CorrelacaoFuncoesModal";
import {
  ControleCategoriasModal,
  CategoryConfig,
  DEFAULT_CATEGORIES,
  migrateCategoryList,
  isAdministrativeCategory,
  isOperationalCategory,
  isGeneralCategory
} from "./ControleCategoriasModal";

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
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [activeTab, setActiveTab] = useState<string>("condutores");

  const [filterPostoGrad, setFilterPostoGrad] = useState<string[]>([]);
  const [filterQuadro, setFilterQuadro] = useState<string[]>([]);
  const [filterAla, setFilterAla] = useState<string[]>([]);
  const [filterSituacao, setFilterSituacao] = useState<string[]>([]);
  const [filterCursos, setFilterCursos] = useState<string[]>([]);
  const [somenteAtivos, setSomenteAtivos] = useState(false);

  useEffect(() => {
    if (!obmContext) return;
    const canonicalKey = getObmSettingsDocKey(obmContext);

    // Fast initial fetch from backend API
    fetch(`/api/obm-settings?key=${canonicalKey}`)
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data?.categorias_funcoes) {
          setCategories(migrateCategoryList(result.data.categorias_funcoes));
        }
      })
      .catch(() => {});

    if (!db) return;
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
              fetch('/api/obm-settings/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: canonicalKey, data: { categorias_funcoes: rawCategories } })
              }).catch(() => {});
              setDoc(docRef, { categorias_funcoes: rawCategories }, { merge: true }).catch(() => {});
              break;
            }
          } catch(e) {}
        }
      }

      setCategories(migrateCategoryList(rawCategories));
    }, (err) => {
      console.warn("Aviso ao sincronizar categorias_funcoes:", err);
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
      const rawMObm = normalizeObm(m.obm);
      const ctxObm = normalizeObm(obmContext);
      const isSameObm = !obmContext || ctxObm === "GLOBAL" || rawMObm === ctxObm;
      if (isSameObm && m.cursos) {
        m.cursos.split(",").forEach((c) => {
          const tc = c.trim();
          if (tc) cursosSet.add(tc);
        });
      }
    });

    const contextMilitars = militars.filter((m) => {
      const rawMObm = normalizeObm(m.obm);
      const ctxObm = normalizeObm(obmContext);
      return !obmContext || ctxObm === "GLOBAL" || rawMObm === ctxObm;
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
        const rawMObm = normalizeObm(m.obm);
        const ctxObm = normalizeObm(obmContext);
        const isSameObm = !obmContext || ctxObm === "GLOBAL" || rawMObm === ctxObm;
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
    } else if (path === "ativoAdministrativo") {
      const nextVal = !currentState;
      newData = {
        ativoAdministrativo: nextVal,
        ativoGraduado: nextVal,
        ativoCbsSds: nextVal
      };
    } else {
      newData = { [path]: !currentState };
    }

    // Optimistic UI update immediately
    updateMilitarLocal(safeRg, newData);

    try {
      let token = '';
      try {
        token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      } catch (tokenErr) {}

      // 1. Atualização via backend
      await fetch('/api/militar/update', {
        headers: {
          'Content-Type': 'application/json',
          'x-user-rg': safeRg,
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        method: 'POST',
        body: JSON.stringify({ rg: safeRg, data: cleanUndefined(newData) })
      });

      // 2. Atualização direta no Firestore do cliente para reatividade instantânea
      if (db) {
        try {
          await setDoc(doc(db, 'militaries', safeRg), cleanUndefined(newData), { merge: true });
        } catch (dbErr) {
          console.warn('[ControleDeFuncoes] setDoc note:', dbErr);
        }
      }

      setTimeout(() => {
        setProcessing(null);
      }, 300);
    } catch (e) {
      console.error('[ControleDeFuncoes] Erro ao alternar valor:', e);
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
      } else if (path === "ativoAdministrativo") {
        newData = {
          ativoAdministrativo: newState,
          ativoGraduado: newState,
          ativoCbsSds: newState
        };
      } else {
        newData = { [path]: newState };
      }
      updateMilitarLocal(safeRg, newData);
    });

    let token = '';
    try {
      token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
    } catch (tokenErr) {}

    await Promise.all(
      militarsToUpdate.map(async (m) => {
        if (!m.rg) return Promise.resolve();
        const safeRg = String(m.rg).replace(/^0+/, "").replace(/\D/g, "");
        let updatePayload: any = {};
        if (path.startsWith("viaturas.")) {
          const key = path.split('.')[1];
          updatePayload = { viaturas: { ...(m.viaturas || {}), [key]: newState } };
        } else if (path.startsWith("dynamicFunctions.")) {
          const key = path.split('.')[1];
          updatePayload = { dynamicFunctions: { ...(m.dynamicFunctions || {}), [key]: newState } };
        } else if (path === "ativoAdministrativo") {
          updatePayload = {
            ativoAdministrativo: newState,
            ativoGraduado: newState,
            ativoCbsSds: newState
          };
        } else {
          updatePayload = { [path]: newState };
        }
        return fetch('/api/militar/update', {
          headers: {
            'Content-Type': 'application/json',
            'x-user-rg': safeRg,
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          method: 'POST',
          body: JSON.stringify({ rg: safeRg, data: cleanUndefined(updatePayload) })
        }).catch(() => {});
      }),
    );
  };

  const operationalCategories = useMemo(
    () => categories.filter(c => isOperationalCategory(c.id)),
    [categories]
  );
  const adminCategories = useMemo(
    () => categories.filter(c => isAdministrativeCategory(c.id)),
    [categories]
  );
  const generalCategories = useMemo(
    () => categories.filter(c => isGeneralCategory(c.id)),
    [categories]
  );

  useEffect(() => {
    if (categories.length > 0 && !categories.some(c => c.id === activeTab)) {
      if (activeTab === "graduados" || activeTab === "cbs_sds") {
        const adminCat = categories.find(c => isAdministrativeCategory(c.id));
        if (adminCat) {
          setActiveTab(adminCat.id);
          return;
        }
      }
      setActiveTab(categories[0].id);
    }
  }, [categories, activeTab]);

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

          <div className="flex items-center gap-3 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            {/* Bloco Operacionais */}
            {operationalCategories.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200 shadow-2xs shrink-0">
                <div className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-black tracking-wider uppercase text-blue-800 bg-blue-100/90 rounded-lg border border-blue-200/80 select-none">
                  <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
                  <span>Operacionais</span>
                </div>
                <div className="flex items-center gap-1">
                  {operationalCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setActiveTab(cat.id);
                        setSearch("");
                      }}
                      className={cn(
                        "px-3 py-1.5 text-xs font-black rounded-lg transition-all whitespace-nowrap cursor-pointer uppercase tracking-wider",
                        activeTab === cat.id
                          ? "bg-white text-blue-700 shadow-xs border border-blue-200 font-black"
                          : "text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 font-bold",
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bloco Administrativas */}
            {adminCategories.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200 shadow-2xs shrink-0">
                <div className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-black tracking-wider uppercase text-amber-900 bg-amber-100/90 rounded-lg border border-amber-200/80 select-none">
                  <Briefcase className="w-3.5 h-3.5 text-amber-700" />
                  <span>Administrativas</span>
                </div>
                <div className="flex items-center gap-1">
                  {adminCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setActiveTab(cat.id);
                        setSearch("");
                      }}
                      className={cn(
                        "px-3 py-1.5 text-xs font-black rounded-lg transition-all whitespace-nowrap cursor-pointer uppercase tracking-wider",
                        activeTab === cat.id
                          ? "bg-white text-amber-800 shadow-xs border border-amber-300 font-black"
                          : "text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 font-bold",
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bloco Geral */}
            {generalCategories.length > 0 && (
              <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200 shadow-2xs shrink-0">
                {generalCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveTab(cat.id);
                      setSearch("");
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-lg transition-all whitespace-nowrap cursor-pointer uppercase tracking-wider",
                      activeTab === cat.id
                        ? "bg-white text-indigo-700 shadow-xs border border-slate-200 font-black"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 font-bold",
                    )}
                  >
                    <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            )}
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

      <div className="flex-1 min-h-0 p-4 sm:p-6 flex flex-col overflow-hidden">
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
