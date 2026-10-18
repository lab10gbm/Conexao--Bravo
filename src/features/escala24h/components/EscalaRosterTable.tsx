import React, { useRef, useEffect } from 'react';
import { 
  Users, ArrowLeftRight, ArrowRightLeft, BriefcaseBusiness, Trash2, Star 
} from 'lucide-react';
import { parseRank } from '../../../lib/rankUtils';
import { cn, formatMilitaryName, normalizeObm } from '../../../lib/utils';
import { SorteioActionBar } from '../../../components/SorteioFuncoesModal';
import { RankInsignia } from '../../../components/RankInsignia';
import { FuncoesMultiSelect } from './FuncoesMultiSelect';
import { SorteioScope, PermutaRequest } from '../types';
import { normalizeFnName } from '../lib/escalaCalculos';
import { isPreferredAssignment } from '../../../lib/sorteioFuncoes';

export interface EscalaRosterTableProps {
  obmContext: string;
  identifiedAlaStr?: string;
  onOpenSorteio: (scope: SorteioScope) => void;
  onOpenPredefinicoes: () => void;
  onLimparFuncoes: (scope: SorteioScope | 'tudo') => void;
  onOpenTransferSearchModal: () => void;
  addMilitarSearch: string;
  setAddMilitarSearch: (s: string) => void;
  showAddMenu: boolean;
  setShowAddMenu: (show: boolean) => void;
  addMenuOptions: any[];
  onCandidateSelect: (militar: any) => void;
  baseRoster: any[];
  militarsLoading: boolean;
  permutasOut: Map<string, PermutaRequest>;
  militars: any[];
  selectedFunctions: Record<string, string[]>;
  setSelectedFunctions: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  predefinicoes: Record<string, string[]>;
  expedienteRgs: string[];
  visibleRasApplications: any[];
  rasApplications: any[];
  manuallyAddedRgs: Record<string, string[]>;
  selectedDate: string;
  onRemoveMilitaryFromScale: (militar: any, rg: string) => void;
  getAllowedOptions: (militar: any) => string[] | undefined;
  activeScaleFuncOptions: string[];
  functionUsageStats: any;
  getRawAllowedOptions: (militar: any) => string[];
}

export function EscalaRosterTable({
  obmContext,
  identifiedAlaStr,
  onOpenSorteio,
  onOpenPredefinicoes,
  onLimparFuncoes,
  onOpenTransferSearchModal,
  addMilitarSearch,
  setAddMilitarSearch,
  showAddMenu,
  setShowAddMenu,
  addMenuOptions,
  onCandidateSelect,
  baseRoster,
  militarsLoading,
  permutasOut,
  militars,
  selectedFunctions,
  setSelectedFunctions,
  predefinicoes,
  expedienteRgs,
  visibleRasApplications,
  rasApplications,
  manuallyAddedRgs,
  selectedDate,
  onRemoveMilitaryFromScale,
  getAllowedOptions,
  activeScaleFuncOptions,
  functionUsageStats,
  getRawAllowedOptions,
}: EscalaRosterTableProps) {
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setShowAddMenu]);

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-visible relative z-30">
      <div className="bg-indigo-50 rounded-t-2xl border-b border-indigo-100 py-2 px-3.5 flex flex-col xl:flex-row xl:items-center justify-between gap-2">
        <h3 className="text-[11px] font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2 shrink-0">
          <Users className="w-3.5 h-3.5 text-indigo-600" />
          CONSTRUÇÃO DE ESCALA
        </h3>
        
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto xl:justify-end">
          {/* Sortear (Viaturas | Administrativas | ⚙) + Limpar ▾ */}
          <SorteioActionBar
            compact
            onSortear={onOpenSorteio}
            onConfig={onOpenPredefinicoes}
            onLimpar={onLimparFuncoes}
          />
          <span className="hidden sm:block w-px h-5 bg-indigo-200 shrink-0" />

          {/* Botão de Transferência Direta / Receber Militar do CBA VII */}
          {normalizeObm(obmContext) !== 'GLOBAL' && (
            <button
              type="button"
              onClick={onOpenTransferSearchModal}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-2xs shrink-0 cursor-pointer"
              title={`Receber e transferir militar de qualquer unidade do CBA VII para o ${obmContext}`}
            >
              <ArrowLeftRight className="w-3 h-3" />
              <span className="hidden md:inline">Transferir para {obmContext}</span>
              <span className="md:hidden">Transferir</span>
            </button>
          )}

          <div className="relative w-full sm:w-60 z-20" ref={addMenuRef}>
            <input
              type="text"
              placeholder="Buscar militar de qualquer unidade..."
              value={addMilitarSearch}
              onChange={(e) => {
                setAddMilitarSearch(e.target.value);
                setShowAddMenu(true);
              }}
              onFocus={() => setShowAddMenu(true)}
              className="w-full text-[11px] bg-white border border-indigo-200 rounded px-2.5 py-1 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400 text-slate-800 font-bold"
            />
            {showAddMenu && addMilitarSearch.length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded shadow-xl max-h-56 overflow-y-auto">
                {addMenuOptions.map((m) => {
                  const mObm = normalizeObm(m.obm || '10º GBM');
                  const currentObm = normalizeObm(obmContext || '10º GBM');
                  const isOtherUnit = mObm !== currentObm && currentObm !== 'GLOBAL';

                  return (
                    <button
                      key={m.rg}
                      type="button"
                      onClick={() => onCandidateSelect(m)}
                      className={cn(
                        "w-full text-left px-3 py-2 text-[10px] font-bold border-b border-slate-100 last:border-0 flex flex-col transition-colors cursor-pointer",
                        isOtherUnit ? "bg-amber-50/70 hover:bg-amber-100 text-amber-950" : "text-slate-700 hover:bg-indigo-50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="uppercase">{parseRank(m.rank)} {m.warName || m.name}</span>
                        <span className={cn(
                          "text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
                          isOtherUnit 
                            ? "bg-amber-200 text-amber-900 border border-amber-300" 
                            : "text-slate-400 bg-slate-100"
                        )}>
                          {isOtherUnit ? `${m.obm || '10º GBM'} (Transferir)` : (m.obm?.split(' ')[0] || 'S/Q')}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 font-medium">
                        RG: {m.rg} • {m.ala ? `Ala ${m.ala}` : 'Sem Ala'}
                      </span>
                    </button>
                  );
                })}
                {addMenuOptions.length === 0 && (
                  <div className="px-3 py-2 text-[10px] font-medium text-slate-500 text-center">
                    Nenhum militar encontrado
                  </div>
                )}
              </div>
            )}
          </div>
          <span className="text-[9.5px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
            {baseRoster.length} Militares
          </span>
        </div>
      </div>
      <div className="relative min-h-[200px] pb-20 overflow-x-auto no-scrollbar">
        {militarsLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest animate-pulse">
              Carregando EFETIVO...
            </span>
          </div>
        )}
        <table className="w-full text-left text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
          <thead className="bg-[#1e293b] text-white">
            <tr>
              <th
                className="py-2 px-1.5 border-r border-slate-700 w-[1%] text-center normal-case tracking-tight"
                title="Substituído por Permuta?"
              >
                S.Pm
              </th>
              <th className="py-2 px-2.5 border-r border-slate-700 w-[1%]">
                Escalado Origem
              </th>
              <th className="py-2 px-2.5 border-r border-slate-700 w-[1%] text-indigo-300 bg-indigo-900/20">
                Substituto (Permuta)
              </th>
              <th className="py-2 px-2.5 border-r border-slate-700 w-[1%] text-center">
                Função Desempenhada
              </th>
              <th className="py-2 px-3 text-left">
                Mostruário de Habilidades
              </th>
            </tr>
          </thead>
          <tbody>
            {baseRoster.map((militar) => {
              const rg = militar.rg || "";
              const permuta = permutasOut.get(rg);
              const isSwapped = !!permuta;

              return (
                <tr
                  key={rg}
                  className={cn(
                    "border-b border-slate-100 transition-colors",
                    isSwapped ? "bg-amber-50" : "hover:bg-slate-50",
                  )}
                >
                  <td className="py-1.5 px-1 border-r border-slate-100 text-center align-middle w-[1%]">
                    {isSwapped ? (
                      <div className="w-4 h-4 bg-amber-500 rounded text-white flex items-center justify-center mx-auto shadow-sm">
                        ✓
                      </div>
                    ) : (
                      <div className="w-4 h-4 border-2 border-slate-300 rounded mx-auto" />
                    )}
                  </td>

                  <td className="py-1.5 px-2.5 border-r border-slate-100 relative group w-[1%] whitespace-nowrap">
                    <div
                      className={cn(
                        "flex items-center gap-2 pr-1",
                        isSwapped ? "opacity-40" : "",
                      )}
                    >
                      <RankInsignia
                        rankStr={militar.rank}
                        className="w-4 h-4 flex-shrink-0"
                      />
                      <div className="flex flex-col text-left">
                        <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-0.5">
                          {parseRank(militar.rank)}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-black leading-none mb-0.5 uppercase tracking-tight flex items-center gap-1",
                            isSwapped
                              ? "text-slate-600 line-through"
                              : "text-slate-800",
                          )}
                        >
                          <span>{militar.warName?.toUpperCase() || formatMilitaryName(militar.name || "")}</span>
                          {!isSwapped && (selectedFunctions[rg] || []).some(fn => isPreferredAssignment(predefinicoes, rg, fn)) && (
                            <span
                              title="★ Escalado conforme preferência configurada pelo escalante"
                              className="inline-flex items-center"
                            >
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0 drop-shadow-2xs" />
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[8.5px] text-slate-400 font-mono tracking-widest leading-none">
                            RG: {rg}
                          </span>
                          <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1 py-0.2 rounded">
                            {militar.quadro?.split('/')[0] || 'S/Q'}
                          </span>
                          {expedienteRgs.includes(rg) && (
                            <span className="text-[7.5px] font-bold text-orange-600 bg-orange-100 px-1 py-0.2 rounded uppercase tracking-widest">
                              EXPEDIENTE
                            </span>
                          )}
                          {visibleRasApplications.some(a => a.militarRg === rg) && (
                            <span className="text-[7.5px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-1 py-0.2 rounded uppercase tracking-widest flex items-center gap-0.5 shadow-2xs">
                              <BriefcaseBusiness className="w-2.5 h-2.5 text-amber-600" />
                              RAS {visibleRasApplications.find(a => a.militarRg === rg)?.oppDuration ? `(${visibleRasApplications.find(a => a.militarRg === rg)?.oppDuration}h)` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {(manuallyAddedRgs[selectedDate]?.includes(rg) || visibleRasApplications.some(a => a.militarRg === rg)) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveMilitaryFromScale(militar, rg);
                        }}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded shadow-sm opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title={visibleRasApplications.some(a => a.militarRg === rg) ? "Excluir militar do RAS e da escala" : "Remover Adição Manual"}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </td>

                  <td
                    className={cn(
                      "py-1.5 px-2.5 border-r border-slate-100 w-[1%] whitespace-nowrap",
                      !isSwapped && "bg-slate-50/50",
                    )}
                  >
                    {isSwapped ? (
                      <div className="flex items-center gap-2 pr-1">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 shrink-0">
                          <ArrowRightLeft className="w-2.5 h-2.5" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-[8.5px] font-bold text-indigo-400 uppercase tracking-widest leading-none mb-0.5">
                            SUBSTITUTO
                          </span>
                          <span className="text-xs font-black text-indigo-700 leading-none mb-0.5 uppercase tracking-tight">
                            {(()=>{
                              const subData = militars.find(m => m.rg === permuta.substituteRg);
                              return subData?.warName?.toUpperCase() || formatMilitaryName(permuta.substituteName || "");
                            })()}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[8.5px] text-indigo-400/80 font-mono tracking-widest leading-none">
                              RG: {permuta.substituteRg}
                            </span>
                            <span className="text-[7.5px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-100/50 px-1 py-0.2 rounded">
                              {militars.find(m => m.rg === permuta.substituteRg)?.quadro?.split('/')[0] || 'S/Q'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-slate-300">-</div>
                    )}
                  </td>

                  <td className="py-1.5 px-2 border-r border-slate-100 bg-white w-[1%] whitespace-nowrap">
                    <FuncoesMultiSelect
                      selected={selectedFunctions[rg] || []}
                      allowedOptions={getAllowedOptions(isSwapped ? (militars.find(m => m.rg === permuta.substituteRg) || militar) : militar)}
                      extraOptions={activeScaleFuncOptions}
                      onlyActiveScaleOptions={true}
                      preferredOptions={predefinicoes[rg] || []}
                      overLimitSet={functionUsageStats.overLimitSet}
                      onChange={(newVal) =>
                        setSelectedFunctions((prev) => ({
                          ...prev,
                          [rg]: newVal,
                        }))
                      }
                    />
                  </td>
                  <td className="py-1.5 px-2.5 text-[8.5px] text-slate-500 whitespace-normal">
                    <div className="flex flex-wrap gap-1">
                      {(() => {
                         const actualMilitar = isSwapped ? (militars.find(m => m.rg === permuta.substituteRg) || militar) : militar;
                         const allowed = getAllowedOptions(actualMilitar);
                         const selected = selectedFunctions[rg] || [];
                         if (!allowed || allowed.length === 0) {
                           const rawSkills = getRawAllowedOptions(actualMilitar);
                           if (rawSkills.length > 0) {
                             return (
                               <span
                                 className="text-slate-400 italic"
                                 title={`Habilitações inativas nesta escala: ${rawSkills.join(', ')}`}
                               >
                                 SEM FUNÇÃO ATIVA NA ESCALA
                               </span>
                             );
                           }
                           return <span className="text-slate-400">NÃO CONFIGURADO</span>;
                         }
                         return allowed.map(opt => {
                            const isSelected = selected.some(s => normalizeFnName(s) === normalizeFnName(opt));
                            const isPref = isPreferredAssignment(predefinicoes, rg, opt);
                            const isOverLimit = isSelected && functionUsageStats.isOverLimit(opt);
                            const currCount = functionUsageStats.getCount(opt);
                            const currLimit = functionUsageStats.getLimit(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  setSelectedFunctions((prev) => {
                                    const curr = prev[rg] || [];
                                    const exists = curr.some(f => normalizeFnName(f) === normalizeFnName(opt));
                                    const next = exists
                                      ? curr.filter((f) => normalizeFnName(f) !== normalizeFnName(opt))
                                      : [...curr, opt];
                                    return {
                                      ...prev,
                                      [rg]: next,
                                    };
                                  });
                                }}
                                className={cn(
                                  "px-1.5 py-0.5 rounded uppercase tracking-tighter whitespace-nowrap transition-all cursor-pointer active:scale-95 border inline-flex items-center gap-0.5",
                                  isSelected
                                    ? isOverLimit
                                      ? "bg-red-100 hover:bg-red-200/80 text-red-700 font-black border-red-400 ring-1 ring-red-300/80 shadow-2xs"
                                      : isPref
                                      ? "bg-amber-100 text-amber-900 font-black border-amber-400 ring-1 ring-amber-300/70 shadow-2xs"
                                      : "bg-indigo-100 text-indigo-700 font-black border-indigo-300 ring-1 ring-indigo-200/70 shadow-2xs"
                                    : isPref
                                    ? "bg-amber-50/70 hover:bg-amber-100/80 text-amber-800 font-bold border-amber-200"
                                    : "bg-slate-100 hover:bg-indigo-50/70 text-slate-500 hover:text-indigo-600 font-bold border-slate-200/80 hover:border-indigo-200"
                                )}
                                title={
                                  isOverLimit
                                    ? `⚠️ Limite excedido em ${opt}: ${currCount} militares selecionados para o limite de ${currLimit} vaga(s) (clique para desativar)`
                                    : isPref
                                    ? `★ Preferência configurada pelo escalante (${isSelected ? "clique para desativar" : "clique para ativar"})`
                                    : isSelected
                                    ? `Clique para desativar ${opt}`
                                    : `Clique para ativar ${opt}`
                                }
                              >
                                {isPref && (
                                  <Star
                                    className={cn(
                                      "w-2.5 h-2.5 shrink-0",
                                      isOverLimit ? "fill-red-500 text-red-600" : "fill-amber-400 text-amber-500"
                                    )}
                                  />
                                )}
                                {opt}
                              </button>
                            );
                         });
                      })()}
                    </div>
                  </td>
                </tr>
              );
            })}
            {baseRoster.length === 0 && !militarsLoading && (
              <tr>
                <td
                  colSpan={5}
                  className="p-4 text-center text-slate-400 font-black text-xs uppercase tracking-widest"
                >
                  NENHUM MILITAR CADASTRADO NESTA ALA
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
