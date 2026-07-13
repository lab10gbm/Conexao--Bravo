import React, { useState, useMemo, useEffect } from "react";
import { parseRank, sortRanks } from "../lib/rankUtils";
import { useMilitars } from "../contexts/MilitarContext";
import { db } from "../lib/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import {
  Search,
  Truck,
  BadgeInfo,
  Settings,
  FolderCog
} from "lucide-react";
import { cn } from "../lib/utils";
import { UserProfile } from "../types";
import { RankInsignia } from "./RankInsignia";
import { MultiSelectFilter } from "./ui/MultiSelectFilter";
import { CorrelacaoFuncoesModal } from "./CorrelacaoFuncoesModal";
import { ControleCategoriasModal, CategoryConfig, DEFAULT_CATEGORIES } from "./ControleCategoriasModal";
import { cleanUndefined } from "../lib/utils";

interface ControleDeFuncoesProps {
  obmContext: string;
}

export function ControleDeFuncoes({ obmContext }: ControleDeFuncoesProps) {
  const { militars, refreshMilitars, updateMilitarLocal } = useMilitars();
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
    const docRef = doc(db, "obm_settings", obmContext);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists() && snap.data()?.categorias_funcoes) {
        // We migrate the on-the-fly to ensure activeProperty exists for viewing
        const dbCategories = snap.data().categorias_funcoes;
        const migrated = dbCategories.map((cat: any) => {
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

  const getValue = (militar: UserProfile, path: string): boolean => {
    if (!path) return false;
    if (path.startsWith("viaturas.")) {
      const key = path.split(".")[1];
      return !!militar.viaturas?.[key as keyof typeof militar.viaturas];
    }
    if (path.startsWith("dynamicFunctions.")) {
      const key = path.split(".")[1];
      return !!militar.dynamicFunctions?.[key];
    }
    return !!militar[path as keyof UserProfile];
  };

  const filteredMilitars = useMemo(() => {
    return militars
      .filter((m) => {
        const rawMObm = m.obm ? m.obm.trim().toUpperCase() : "10º GBM";
        const ctxObm = (obmContext || "").trim().toUpperCase();
        const isSameObm = !ctxObm || ctxObm === "GLOBAL" || rawMObm === ctxObm;
        if (!isSameObm) return false;

        const r = (m.rank || "").toUpperCase().trim();
        const isOfficer = [
          "CEL", "CORONEL", "TC", "TENENTE CORONEL", "TENENTE-CORONEL",
          "MAJ", "MAJOR", "CAP", "CAPITÃO", "1º TEN", "1º TENENTE",
          "2º TEN", "2º TENENTE", "ASP", "ASPIRANTE",
        ].includes(r);

        if (isOfficer) return false;

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
      .sort((a, b) => {
        const rankWeights: Record<string, number> = {
          CORONEL: 1, CEL: 1, "TENENTE CORONEL": 2, "TENENTE-CORONEL": 2, TC: 2,
          MAJOR: 3, MAJ: 3, CAPITÃO: 4, CAP: 4, "1º TENENTE": 5, "1º TEN": 5,
          "2º TENENTE": 6, "2º TEN": 6, ASPIRANTE: 7, ASP: 7, SUBTENENTE: 8,
          "SUB TENENTE": 8, ST: 8, "1º SARGENTO": 9, "1º SGT": 9,
          "2º SARGENTO": 10, "2º SGT": 10, "3º SARGENTO": 11, "3º SGT": 11,
          CABO: 12, CB: 12, SOLDADO: 13, SD: 13,
        };
        const getWeight = (r: string) => rankWeights[r?.toUpperCase()?.trim()] || 99;

        const weightA = getWeight(a.rank || "");
        const weightB = getWeight(b.rank || "");
        if (weightA !== weightB) return weightA - weightB;

        const rgA = parseInt(a.rg?.toString().replace(/\D/g, "") || "0", 10);
        const rgB = parseInt(b.rg?.toString().replace(/\D/g, "") || "0", 10);
        return rgA - rgB;
      })
      .slice(0, 100);
  }, [
    militars, search, obmContext, activeTab, categories,
    filterPostoGrad, filterQuadro, filterAla, filterSituacao, filterCursos, somenteAtivos,
  ]);

  const displayMilitars = filteredMilitars;

  const toggleValue = async (militar: UserProfile, path: string) => {
    if (!militar.rg || !path) return;
    const safeRg = String(militar.rg).replace(/^0+/, "").replace(/\D/g, "");
    setProcessing(safeRg);

    let newData: Partial<UserProfile> = {};

    if (path.startsWith("viaturas.")) {
      const key = path.split(".")[1];
      const currentState = !!militar.viaturas?.[key as keyof typeof militar.viaturas];
      newData = { viaturas: { ...(militar.viaturas || {}), [key]: !currentState } };
    } else if (path.startsWith("dynamicFunctions.")) {
      const key = path.split(".")[1];
      const currentState = !!militar.dynamicFunctions?.[key];
      newData = { dynamicFunctions: { ...(militar.dynamicFunctions || {}), [key]: !currentState } };
    } else {
      const currentState = !!militar[path as keyof UserProfile];
      newData = { [path]: !currentState };
    }

    updateMilitarLocal(safeRg, newData);

    try {
      if (db) {
        let updatePayload: any = {};
        if (path.startsWith("viaturas.")) {
          updatePayload = { [`viaturas.${path.split(".")[1]}`]: !getValue(militar, path) };
        } else if (path.startsWith("dynamicFunctions.")) {
          updatePayload = { [`dynamicFunctions.${path.split(".")[1]}`]: !getValue(militar, path) };
        } else {
          updatePayload = { [path]: !getValue(militar, path) };
        }
        await setDoc(doc(db, "militaries", safeRg), cleanUndefined(updatePayload), { merge: true });
      }
      setTimeout(() => {
        refreshMilitars();
        setProcessing(null);
      }, 300);
    } catch (e) {
      console.error(e);
      refreshMilitars();
      setProcessing(null);
    }
  };

  const toggleColumnAll = async (path: string) => {
    if (displayMilitars.length === 0 || !path) return;
    const allChecked = displayMilitars.every((m) => getValue(m, path));
    const newState = !allChecked;

    displayMilitars.forEach((m) => {
      if (m.rg) {
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
      }
    });

    await Promise.all(
      displayMilitars.map(async (m) => {
        if (!m.rg) return Promise.resolve();
        const safeRg = String(m.rg).replace(/^0+/, "").replace(/\D/g, "");
        if (db) {
            let updatePayload: any = {};
            if (path.startsWith("viaturas.")) {
               updatePayload = { [`viaturas.${path.split('.')[1]}`]: newState };
            } else if (path.startsWith("dynamicFunctions.")) {
               updatePayload = { [`dynamicFunctions.${path.split('.')[1]}`]: newState };
            } else {
               updatePayload = { [path]: newState };
            }
            return setDoc(doc(db, 'militaries', safeRg), cleanUndefined(updatePayload), { merge: true }).catch(() => {});
        }
        return Promise.resolve();
      }),
    );
  };

  const ColumnHeaderToggle = ({ field, label }: { field: string; label: React.ReactNode }) => (
    <div className="flex flex-col items-center justify-center gap-1 group">
      <span>{label}</span>
      {field && (
        <button
          onClick={() => toggleColumnAll(field)}
          title="Marcar/Desmarcar todos"
          className="px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase font-bold bg-slate-200 text-slate-500 opacity-50 xl:group-hover:opacity-100 hover:bg-indigo-500 hover:text-white hover:opacity-100 transition-all shadow-sm"
        >
          LOTE
        </button>
      )}
    </div>
  );

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
                className="flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm whitespace-nowrap"
              >
                <FolderCog className="w-4 h-4" />
                <span className="hidden sm:inline">Categorias e Funções</span>
              </button>
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-4 py-2 rounded-lg text-sm transition-colors border border-slate-200 shadow-sm whitespace-nowrap"
                title="Configurar Correlacionamento de Funções"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Regras de Escala</span>
              </button>
            </div>
          </div>

          <div className="flex overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex bg-slate-100 p-1 rounded-lg min-w-max gap-1">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveTab(cat.id);
                    setSearch("");
                  }}
                  className={cn(
                    "px-4 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap",
                    activeTab === cat.id
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-start gap-4 p-4 bg-slate-50 border-2 border-slate-200 rounded-xl">
          <div className="text-[10px] font-black uppercase text-slate-400 self-center w-full sm:w-auto">
            Filtros:
          </div>
          <div className="flex-1 min-w-[150px]">
            <MultiSelectFilter label="Posto/Grad" options={uniqueRanks.sort(sortRanks)} selected={filterPostoGrad} onChange={setFilterPostoGrad} />
          </div>
          <div className="flex-1 min-w-[150px]">
            <MultiSelectFilter label="Quadro" options={uniqueQuadros} selected={filterQuadro} onChange={setFilterQuadro} />
          </div>
          <div className="flex-1 min-w-[150px]">
            <MultiSelectFilter label="Ala" options={uniqueAlas} selected={filterAla} onChange={setFilterAla} />
          </div>
          <div className="flex-1 min-w-[150px]">
            <MultiSelectFilter label="Situação" options={uniqueSituacoes} selected={filterSituacao} onChange={setFilterSituacao} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <MultiSelectFilter label="Cursos" options={uniqueCursos} selected={filterCursos} onChange={setFilterCursos} />
          </div>
          <div className="flex items-center gap-2 self-center shrink-0">
            <input
              type="checkbox"
              id="somenteAtivos"
              checked={somenteAtivos}
              onChange={(e) => setSomenteAtivos(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <label htmlFor="somenteAtivos" className="text-xs font-semibold text-slate-700 select-none cursor-pointer">
              Exibir Não Ativos
            </label>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  {activeCategoryData?.activeProperty && (
                    <th className="w-16 px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">
                      <ColumnHeaderToggle field={activeCategoryData.activeProperty} label="Ativo" />
                    </th>
                  )}
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Militar
                  </th>
                  {activeCategoryData?.functions.map(fn => (
                    <th key={fn.id} className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200 bg-slate-50">
                      <ColumnHeaderToggle field={fn.id} label={fn.name} />
                    </th>
                  ))}
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200">
                    Ala
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayMilitars.length === 0 ? (
                  <tr>
                    <td colSpan={(activeCategoryData?.functions.length || 0) + 3} className="px-4 py-8 text-center text-slate-400">
                      <BadgeInfo className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium">Nenhum militar encontrado nesta visão.</p>
                      <p className="text-xs mt-1">Pesquise por nome ou altere os filtros.</p>
                    </td>
                  </tr>
                ) : null}
                {displayMilitars.map((m) => {
                  const isProcessing = processing === m.rg?.replace(/\D/g, "").replace(/^0+/, "");
                  // Active state drives the row highlight
                  const isActive = activeCategoryData?.activeProperty ? getValue(m, activeCategoryData.activeProperty) : false;

                  return (
                    <tr key={m.rg} className={cn("hover:bg-indigo-50/30 transition-colors", isActive ? "bg-emerald-50/10" : "")}>
                      
                      {activeCategoryData?.activeProperty && (
                        <td className="px-3 py-2 text-center border-r border-slate-100 bg-white">
                          <button
                            onClick={() => toggleValue(m, activeCategoryData.activeProperty)}
                            disabled={isProcessing}
                            className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center transition-colors mx-auto ring-2 ring-offset-1",
                              isActive
                                ? "bg-emerald-500 text-white ring-emerald-200 shadow-sm"
                                : "bg-white text-slate-200 ring-slate-100 hover:bg-slate-50",
                              isProcessing && "opacity-50",
                            )}
                          >
                            {isActive && "✓"}
                          </button>
                        </td>
                      )}
                      
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 flex shrink-0 justify-center">
                            <RankInsignia rankStr={parseRank(m.rank)} className="scale-75 origin-center" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-1">
                              {parseRank(m.rank)}
                            </span>
                            <span className="text-xs font-black text-slate-700 uppercase tracking-wider leading-none">
                              {m.warName || (m.name || "").split(" ")[0]}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] font-bold text-slate-400 font-mono">
                                RG: {m.rg}
                              </span>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1 rounded">
                                {m.quadro ? m.quadro.split('/')[0] : (m.specializations?.[0] || '-')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {activeCategoryData?.functions.map(fn => {
                        const isChecked = getValue(m, fn.id);
                        return (
                          <td key={fn.id} className="px-3 py-2 text-center border-l border-slate-100 bg-slate-50/50">
                            <button
                              onClick={() => toggleValue(m, fn.id)}
                              disabled={isProcessing}
                              className={cn(
                                "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto",
                                isChecked
                                  ? "bg-indigo-600 text-white shadow-sm"
                                  : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50",
                                isProcessing && "opacity-50",
                              )}
                            >
                              {isChecked && "✓"}
                            </button>
                          </td>
                        )
                      })}

                      <td className="px-3 py-2 text-center border-l border-slate-200">
                        {m.lentTo ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest">
                            {m.lentTo}
                          </span>
                        ) : m.ala ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                            Ala {m.ala}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
