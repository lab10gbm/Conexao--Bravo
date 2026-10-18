import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUpDown, X, Info, Send } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../../lib/utils';
import { DayStatusResult } from '../types';

interface ExpedienteWeeklyChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRg: string | null;
  fullWeekDays: Date[];
  getDayStatus: (rg: string, dayStr: string) => DayStatusResult;
  proposedWeeklyChanges: Record<string, 'expediente' | 'servico' | 'folga'>;
  setProposedWeeklyChanges: React.Dispatch<React.SetStateAction<Record<string, 'expediente' | 'servico' | 'folga'>>>;
  weeklyChangeReason: string;
  setWeeklyChangeReason: (reason: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ExpedienteWeeklyChangeModal({
  isOpen,
  onClose,
  activeRg,
  fullWeekDays,
  getDayStatus,
  proposedWeeklyChanges,
  setProposedWeeklyChanges,
  weeklyChangeReason,
  setWeeklyChangeReason,
  onSubmit
}: ExpedienteWeeklyChangeModalProps) {
  if (!isOpen || !activeRg) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col my-auto max-h-[90vh]"
        >
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
                <ArrowUpDown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm sm:text-base">
                  Solicitar Alteração no Expediente Semanal
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-500 font-bold">
                  Semana: {format(fullWeekDays[0], 'dd/MM')} a {format(fullWeekDays[6], 'dd/MM/yyyy')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="p-4 sm:p-6 flex flex-col gap-4 overflow-y-auto">
            <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3 text-xs text-slate-700 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-indigo-900">Selecione o novo status desejado para os dias que deseja mudar:</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Sua solicitação será analisada e deliberada pelo Escalante / Moderador.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                Dias da Semana (Clique para alterar o status)
              </span>

              <div className="flex flex-col gap-2">
                {fullWeekDays.map(day => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const dayName = format(day, 'EEEE', { locale: ptBR });
                  const dayDate = format(day, 'dd/MM');
                  const curSt = getDayStatus(activeRg, dayStr).type;
                  const normCur = curSt === 'afastamento' ? 'folga' : curSt;
                  const propSt = proposedWeeklyChanges[dayStr] || normCur;
                  const isChanged = propSt !== normCur;

                  return (
                    <div 
                      key={dayStr}
                      className={cn(
                        "p-2.5 rounded-xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all",
                        isChanged ? "bg-indigo-50/40 border-indigo-400 shadow-sm" : "bg-slate-50/70 border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black capitalize text-slate-800 min-w-[130px]">
                          {dayName} ({dayDate})
                        </span>
                        <span className={cn(
                          "text-[9px] font-black uppercase px-2 py-0.5 rounded",
                          normCur === 'expediente' ? "bg-indigo-100 text-indigo-700" :
                          normCur === 'servico' ? "bg-red-100 text-red-700" :
                          "bg-slate-200 text-slate-600"
                        )}>
                          Atual: {normCur === 'expediente' ? 'EXP' : normCur === 'servico' ? 'SV' : 'FOLGA'}
                        </span>
                        {isChanged && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-400 text-amber-950 font-bold shadow-xs">
                            ➔ Solicitado: {propSt === 'expediente' ? 'EXP' : propSt === 'servico' ? 'SV' : 'FOLGA'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => setProposedWeeklyChanges(prev => ({ ...prev, [dayStr]: 'expediente' }))}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                            propSt === 'expediente'
                              ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400"
                              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          EXP
                        </button>
                        <button
                          type="button"
                          onClick={() => setProposedWeeklyChanges(prev => ({ ...prev, [dayStr]: 'servico' }))}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                            propSt === 'servico'
                              ? "bg-red-600 text-white shadow-sm ring-2 ring-red-400"
                              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          SV
                        </button>
                        <button
                          type="button"
                          onClick={() => setProposedWeeklyChanges(prev => ({ ...prev, [dayStr]: 'folga' }))}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                            propSt === 'folga'
                              ? "bg-slate-700 text-white shadow-sm ring-2 ring-slate-400"
                              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          FOLGA
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                Motivo / Justificativa da Alteração *
              </label>
              <textarea
                value={weeklyChangeReason}
                onChange={e => setWeeklyChangeReason(e.target.value)}
                required
                placeholder="Informe o motivo da alteração solicitada (ex: permuta de expediente, compensação de plantão, necessidade administrativa...)"
                rows={3}
                className="w-full text-xs p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500">
                {(() => {
                  const count = fullWeekDays.filter(d => {
                    const dStr = format(d, 'yyyy-MM-dd');
                    const cur = getDayStatus(activeRg, dStr).type;
                    const norm = cur === 'afastamento' ? 'folga' : cur;
                    return (proposedWeeklyChanges[dStr] || norm) !== norm;
                  }).length;
                  return count === 0 ? "Nenhum dia alterado" : `${count} dia(s) alterado(s)`;
                })()}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!weeklyChangeReason.trim() || fullWeekDays.filter(d => {
                    const dStr = format(d, 'yyyy-MM-dd');
                    const cur = getDayStatus(activeRg, dStr).type;
                    const norm = cur === 'afastamento' ? 'folga' : cur;
                    return (proposedWeeklyChanges[dStr] || norm) !== norm;
                  }).length === 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider rounded-lg transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Enviar Solicitação
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
