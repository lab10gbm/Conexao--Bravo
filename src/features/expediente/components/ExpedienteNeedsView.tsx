import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../../lib/utils';
import { safeArr } from '../lib/expedienteCalculos';
import { ExpedienteData } from '../types';

interface ExpedienteNeedsViewProps {
  currentMonthDays: Date[];
  data: ExpedienteData;
  handleTogglePrefDate: (dayStr: string) => Promise<void>;
  handleUpdatePrefDetail: (dayStr: string, func: string, qty: number) => Promise<void>;
  funcoesEscala: string[];
}

export function ExpedienteNeedsView({
  currentMonthDays,
  data,
  handleTogglePrefDate,
  handleUpdatePrefDetail,
  funcoesEscala
}: ExpedienteNeedsViewProps) {
  return (
    <div className="bg-slate-50 flex flex-col gap-6 w-full">
      <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-4 sm:p-6">
        <div className="flex flex-col mb-6">
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">
            Datas Preferenciais e Funções em Falta
          </h4>
          <p className="text-[11px] text-slate-500 font-bold mt-1">
            Identifique os dias em que há carência de efetivo. Para cada dia selecionado, especifique quais funções estão faltando e a quantidade de militares necessários.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {currentMonthDays.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const isPreferred = safeArr(data.selections['ESCALANTE_PREF']).includes(dayStr);
            const details = data.preferencesDetails?.[dayStr] || {};

            return (
              <div
                key={dayStr}
                className={cn(
                  "border-2 rounded-xl p-4 transition-all",
                  isPreferred ? "bg-red-50/30 border-red-200" : "bg-white border-slate-100 hover:border-slate-200"
                )}
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex flex-col">
                    <span className={cn("text-[10px] font-black uppercase tracking-widest", isPreferred ? "text-red-500" : "text-slate-400")}>
                      {format(day, 'eee', { locale: ptBR })}
                    </span>
                    <span className={cn("text-xs font-black", isPreferred ? "text-red-700" : "text-slate-700")}>
                      {format(day, 'dd/MM/yyyy')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePrefDate(dayStr)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors cursor-pointer",
                      isPreferred ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    {isPreferred ? 'Desmarcar' : 'Selecionar'}
                  </button>
                </div>

                {isPreferred && (
                  <div className="mt-4 pt-4 border-t-2 border-red-100/50 flex flex-col gap-3">
                    {Object.entries(details).filter(([k]) => !k.startsWith('_')).length > 0 ? (
                      Object.entries(details)
                        .filter(([k]) => !k.startsWith('_'))
                        .map(([func, qtRaw]) => {
                          const qt = typeof qtRaw === 'number' ? qtRaw : 1;
                          return (
                            <div key={func} className="flex justify-between items-center bg-white border border-red-100 rounded-lg p-2 shadow-sm">
                              <span className="text-[10px] font-black text-slate-700 tracking-tight">{func}</span>
                              <div className="flex items-center gap-2 bg-slate-50 rounded-md border border-slate-100 p-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdatePrefDetail(dayStr, func, qt - 1)}
                                  className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-slate-500 hover:text-red-500 font-bold cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="text-[11px] font-black text-indigo-700 w-4 text-center">{qt}</span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdatePrefDetail(dayStr, func, qt + 1)}
                                  className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-slate-500 hover:text-green-500 font-bold cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="text-[10px] font-bold text-red-400 text-center py-2 italic">
                        Nenhuma função especificada.
                      </div>
                    )}

                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          handleUpdatePrefDetail(dayStr, val, 1);
                          e.target.value = "";
                        }
                      }}
                      className="w-full text-[10px] font-bold text-slate-600 bg-white border-2 border-slate-200 rounded-lg p-2 outline-none focus:border-indigo-400 mt-1 cursor-pointer"
                    >
                      <option value="">+ Adicionar Função</option>
                      {funcoesEscala.filter(f => !details[f]).map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
