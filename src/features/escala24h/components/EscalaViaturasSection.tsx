import React from 'react';
import { Truck, RotateCcw, Plus } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { EscalaViaturaInfo, ViaturaSlotType } from '../types';

export interface EscalaViaturasSectionProps {
  viaturasInfo: EscalaViaturaInfo[];
  onChangeViaturasInfo: React.Dispatch<React.SetStateAction<EscalaViaturaInfo[]>>;
  onApplyObmPattern: () => void;
  onAddViaturaExtra: () => void;
  patternAppliedMessage?: string | null;
  isViaturasCustomizedForDateRef?: React.MutableRefObject<boolean>;
}

export function EscalaViaturasSection({
  viaturasInfo,
  onChangeViaturasInfo,
  onApplyObmPattern,
  onAddViaturaExtra,
  patternAppliedMessage,
  isViaturasCustomizedForDateRef,
}: EscalaViaturasSectionProps) {
  const markCustomized = () => {
    if (isViaturasCustomizedForDateRef) {
      isViaturasCustomizedForDateRef.current = true;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-visible relative z-10">
      <div className="bg-slate-800 rounded-t-2xl border-b border-slate-700 py-2 px-3.5 flex items-center justify-between">
        <h3 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
          <Truck className="w-3.5 h-3.5 text-slate-400" />
          Distribuição (Viaturas)
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {patternAppliedMessage && (
            <span className="text-[9.5px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded animate-in fade-in">
              {patternAppliedMessage}
            </span>
          )}
          <button 
            type="button"
            onClick={onApplyObmPattern}
            className="flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 rounded transition-colors border border-amber-400/20 cursor-pointer shadow-2xs"
            title="Recarregar e aplicar o Novo Padrão de Viaturas da OBM definido no Controle de Viaturas para esta data"
          >
            <RotateCcw className="w-3 h-3 text-amber-400" />
            Aplicar Padrão da OBM
          </button>
          <button 
            type="button"
            onClick={onAddViaturaExtra}
            className="flex items-center gap-1 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 rounded transition-colors border border-emerald-400/20 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            Adicionar VTR Extra
          </button>
          <span className="text-[9.5px] font-bold text-slate-300 bg-slate-700 px-2 py-0.5 rounded-full uppercase tracking-widest">
            Manual
          </span>
        </div>
      </div>

      <div className="p-3 sm:p-4 bg-slate-50 relative">
        <table className="w-full text-left text-[10px] font-bold uppercase tracking-wider bg-white rounded-lg overflow-hidden border border-slate-200 shadow-2xs min-w-[700px]">
          <thead className="bg-[#1e293b] text-white text-[10px]">
            <tr>
              <th
                className="py-2 px-2 border-b border-r border-[#334155] w-14 text-center"
                title="Alterar ordem da viatura na escala (mover para esquerda ou direita no arquivo gerado)"
              >
                Ordem
              </th>
              <th
                className="py-2 px-2 border-b border-r border-[#334155] w-36 text-center"
                title="Exibir VTR na escala gerada e definir espaço (1, 1/2 ou 1/3)"
              >
                Exibição
              </th>
              <th
                className="py-2 px-2 border-b border-r border-[#334155] w-12 text-center"
                title="Ativar VTR?"
              >
                Ativar
              </th>
              <th className="py-2 px-2 border-b border-r border-[#334155] text-center w-24">
                Viaturas
              </th>
              <th className="py-2 px-2 border-b border-r border-[#334155] text-center w-20">
                Situação
              </th>
              <th className="py-2 px-2 border-b border-r border-[#334155] text-center w-16">
                Condutor
              </th>
              <th className="py-2 px-2 border-b border-r border-[#334155] text-center w-12">
                G1
              </th>
              <th className="py-2 px-2 border-b border-r border-[#334155] text-center w-12">
                G2
              </th>
              <th className="py-2 px-2 border-b border-r border-[#334155] text-center w-12">
                G3
              </th>
              <th className="py-2 px-2 border-b border-r border-[#334155] text-center w-12">
                G4
              </th>
              <th className="py-2 px-2 border-b border-[#334155] text-center w-12">
                CG
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {viaturasInfo.map((vtr, vtrIdx) => {
              const isAtiva = Boolean(vtr.ativa);
              const isExibir = vtr.exibir !== undefined ? Boolean(vtr.exibir) : true;
              const vtrEspaco: '1' | '1/2' | '1/3' = vtr.espaco === '1/3' ? '1/3' : (vtr.espaco === '1/2' ? '1/2' : '1');
              const multipleInactiveDisplayed = viaturasInfo.filter(
                (v) => !v.ativa && (v.exibir !== undefined ? Boolean(v.exibir) : true)
              ).length >= 2;
              const isGroupedInactive = !isAtiva && isExibir && multipleInactiveDisplayed;

              const moveVtrUp = (e: React.MouseEvent) => {
                e.stopPropagation();
                if (vtrIdx <= 0) return;
                markCustomized();
                onChangeViaturasInfo((prev) => {
                  const next = [...prev];
                  const temp = next[vtrIdx - 1];
                  next[vtrIdx - 1] = next[vtrIdx];
                  next[vtrIdx] = temp;
                  return next;
                });
              };

              const moveVtrDown = (e: React.MouseEvent) => {
                e.stopPropagation();
                if (vtrIdx >= viaturasInfo.length - 1) return;
                markCustomized();
                onChangeViaturasInfo((prev) => {
                  const next = [...prev];
                  const temp = next[vtrIdx + 1];
                  next[vtrIdx + 1] = next[vtrIdx];
                  next[vtrIdx] = temp;
                  return next;
                });
              };

              const toggleVtr = (e: React.MouseEvent) => {
                e.stopPropagation();
                markCustomized();
                onChangeViaturasInfo((prev) =>
                  prev.map((v, i) =>
                    i === vtrIdx ? { ...v, ativa: !Boolean(v.ativa) } : v,
                  ),
                );
              };

              const toggleExibir = (e: React.MouseEvent) => {
                e.stopPropagation();
                markCustomized();
                onChangeViaturasInfo((prev) =>
                  prev.map((v, i) =>
                    i === vtrIdx ? { ...v, exibir: !(v.exibir !== undefined ? Boolean(v.exibir) : true) } : v,
                  ),
                );
              };

              const setEspaco = (e: React.MouseEvent, esp: '1' | '1/2' | '1/3') => {
                e.stopPropagation();
                markCustomized();
                onChangeViaturasInfo((prev) =>
                  prev.map((v, i) =>
                    i === vtrIdx ? { ...v, espaco: esp } : v,
                  ),
                );
              };

              const toggleCheck = (
                field: ViaturaSlotType,
              ) => {
                if (vtr.blocked?.includes(field)) return;
                markCustomized();
                onChangeViaturasInfo((prev) =>
                  prev.map((v, i) =>
                    i === vtrIdx ? { ...v, [field]: !v[field] } : v,
                  ),
                );
              };

              const renderCheckbox = (
                field: ViaturaSlotType,
              ) => {
                if (vtr.blocked?.includes(field)) {
                  return (
                    <div className="bg-slate-700 opacity-90 w-full h-full min-h-[32px] flex items-center justify-center"></div>
                  );
                }
                return (
                  <div
                    className="flex items-center justify-center h-full p-2 cursor-pointer"
                    onClick={() => toggleCheck(field)}
                  >
                    {vtr[field] ? (
                      <div className="w-3.5 h-3.5 bg-slate-700/80 rounded-[3px] text-white flex items-center justify-center shadow-xs hover:bg-slate-800 transition">
                        <span className="text-[10px]">✓</span>
                      </div>
                    ) : (
                      <div className="w-3.5 h-3.5 border border-slate-300 rounded-[3px] hover:border-slate-500 transition" />
                    )}
                  </div>
                );
              };

              return (
                <tr
                  key={vtr.id || vtrIdx}
                  className="hover:bg-slate-50 transition-colors group"
                >
                  {/* Botões de Alterar Ordem */}
                  <td className="p-1 px-1.5 border-r border-slate-200 text-center align-middle">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={moveVtrUp}
                        disabled={vtrIdx === 0}
                        className={cn(
                          "w-5 h-5 rounded flex items-center justify-center text-[10px] font-black transition-colors cursor-pointer",
                          vtrIdx === 0
                            ? "text-slate-300 cursor-not-allowed"
                            : "bg-slate-100 hover:bg-slate-700 hover:text-white text-slate-700 shadow-2xs"
                        )}
                        title="Mover viatura para cima (posiciona mais à esquerda no arquivo gerado)"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={moveVtrDown}
                        disabled={vtrIdx === viaturasInfo.length - 1}
                        className={cn(
                          "w-5 h-5 rounded flex items-center justify-center text-[10px] font-black transition-colors cursor-pointer",
                          vtrIdx === viaturasInfo.length - 1
                            ? "text-slate-300 cursor-not-allowed"
                            : "bg-slate-100 hover:bg-slate-700 hover:text-white text-slate-700 shadow-2xs"
                        )}
                        title="Mover viatura para baixo (posiciona mais à direita no arquivo gerado)"
                      >
                        ▼
                      </button>
                    </div>
                  </td>

                  {/* Coluna Exibição + Seletor de Espaço */}
                  <td className="p-1 px-2 border-r border-slate-200 text-center align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Checkbox Exibir */}
                      <div
                        onClick={toggleExibir}
                        title={isExibir ? "Viatura exibida na escala" : "Viatura oculta na escala"}
                        className="cursor-pointer shrink-0"
                      >
                        {isExibir ? (
                          <div className="w-4 h-4 bg-slate-700/80 rounded-[3px] text-white flex items-center justify-center shadow-xs hover:bg-slate-800 transition">
                            <span className="text-[10px]">✓</span>
                          </div>
                        ) : (
                          <div className="w-4 h-4 border border-slate-300 rounded-[3px] hover:border-slate-500 transition" />
                        )}
                      </div>

                      {/* Seletor de Espaço 1, 1/2 ou 1/3 */}
                      <div
                        className={cn(
                          "inline-flex items-center rounded border border-slate-200 overflow-hidden bg-slate-100 text-[9px] font-black transition-opacity",
                          !isExibir && "opacity-40"
                        )}
                        title={isGroupedInactive ? "Viaturas inativas e exibidas ocupam automaticamente o mesmo bloco na escala gerada" : undefined}
                      >
                        <button
                          type="button"
                          onClick={(e) => setEspaco(e, '1')}
                          className={cn(
                            "px-1.5 py-0.5 transition-colors cursor-pointer",
                            vtrEspaco === '1'
                              ? "bg-slate-800 text-white font-black"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                          )}
                          title="1 espaço completo (coluna inteira)"
                        >
                          1
                        </button>
                        <button
                          type="button"
                          onClick={(e) => setEspaco(e, '1/2')}
                          className={cn(
                            "px-1 py-0.5 border-l border-slate-200 transition-colors cursor-pointer",
                            vtrEspaco === '1/2'
                              ? "bg-slate-800 text-white font-black"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                          )}
                          title="1/2 espaço (meia coluna compartilhada)"
                        >
                          1/2
                        </button>
                        <button
                          type="button"
                          onClick={(e) => setEspaco(e, '1/3')}
                          className={cn(
                            "px-1 py-0.5 border-l border-slate-200 transition-colors cursor-pointer",
                            vtrEspaco === '1/3'
                              ? "bg-slate-800 text-white font-black"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                          )}
                          title="1/3 espaço (terço de coluna compartilhada, ex: L-09, BIA-13 e BIA juntas)"
                        >
                          1/3
                        </button>
                      </div>
                    </div>
                  </td>
                  <td
                    className="p-1 border-r border-slate-200 text-center align-middle cursor-pointer"
                    onClick={toggleVtr}
                    title={isAtiva ? "Viatura ativa" : "Viatura inativa"}
                  >
                    {isAtiva ? (
                      <div className="w-4 h-4 bg-slate-700/80 rounded-[3px] text-white flex items-center justify-center mx-auto shadow-xs hover:bg-slate-800 transition">
                        <span className="text-[10px]">✓</span>
                      </div>
                    ) : (
                      <div className="w-4 h-4 border border-slate-300 rounded-[3px] mx-auto hover:border-slate-500 transition" />
                    )}
                  </td>
                  <td className="p-1.5 border-r border-slate-200 text-center text-slate-700 font-black">
                    {vtr.vtr}
                  </td>
                  <td className="p-1 px-2 border-r border-slate-200 text-center align-middle">
                    {isAtiva ? (
                      <span className="bg-[#2c533e] text-emerald-50 px-2 py-1 text-[9px] w-full block rounded-[3px]">
                        ATIVA
                      </span>
                    ) : (
                      <span 
                        className={cn(
                          "px-2 py-1 text-[9px] w-full block rounded-[3px] font-black transition-all",
                          isGroupedInactive 
                            ? "bg-[#fac7b0] text-[#783f2a] border border-[#d97757]/40 ring-1 ring-[#d97757]/20" 
                            : "bg-[#fac7b0] text-[#783f2a]"
                        )}
                        title={isGroupedInactive ? "Ocupará o mesmo espaço/bloco compartilhado na escala com as demais viaturas inativas" : "Viatura inativa no serviço"}
                      >
                        INATIVA
                        {isGroupedInactive && (
                          <span className="block text-[7.5px] font-black text-amber-900 tracking-tighter mt-0.5 opacity-90 uppercase">
                            (MESMO BLOCO)
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="p-0 border-r border-slate-200 align-middle">
                    {renderCheckbox("condutor")}
                  </td>
                  <td className="p-0 border-r border-slate-200 align-middle">
                    {renderCheckbox("g1")}
                  </td>
                  <td className="p-0 border-r border-slate-200 align-middle">
                    {renderCheckbox("g2")}
                  </td>
                  <td className="p-0 border-r border-slate-200 align-middle">
                    {renderCheckbox("g3")}
                  </td>
                  <td className="p-0 border-r border-slate-200 align-middle">
                    {renderCheckbox("g4")}
                  </td>
                  <td className="p-0 align-middle">
                    {renderCheckbox("cg")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
