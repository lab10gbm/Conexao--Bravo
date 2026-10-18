import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUpDown, X, Calendar, Trash2, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, formatMilitaryName } from '../../../lib/utils';
import { safeArr } from '../lib/expedienteCalculos';
import { UserProfile } from '../../../types';
import { ExpedienteData } from '../types';

interface ExpedienteMilitaryMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  militarRg: string;
  militarName: string;
  currentDayStr: string;
  currentStatus?: string;
  currentMonth: Date;
  currentMonthDays: Date[];
  data: ExpedienteData;
  expedienteUsers: UserProfile[];
  onMoveMilitaryDay: (rg: string, fromDay: string, toDay: string) => void;
  onSwapMilitaryDays: (rgA: string, dayA: string, rgB: string, dayB: string) => void;
  onRemoveMilitaryFromDay: (rg: string, dayStr: string, isExpOnly: boolean) => void;
  onSelectMilitaryForEdit: (rg: string, name: string) => void;
}

export function ExpedienteMilitaryMoveModal({
  isOpen,
  onClose,
  militarRg,
  militarName,
  currentDayStr,
  currentStatus = 'servico',
  currentMonth,
  currentMonthDays,
  data,
  expedienteUsers,
  onMoveMilitaryDay,
  onSwapMilitaryDays,
  onRemoveMilitaryFromDay,
  onSelectMilitaryForEdit
}: ExpedienteMilitaryMoveModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 min-h-screen bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden pointer-events-auto my-auto border-2 border-indigo-100"
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
                <ArrowUpDown className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <h3 className="font-black text-sm uppercase tracking-wider text-white">
                  Remanejar / Mudar Posição
                </h3>
                <span className="text-[10px] font-bold text-indigo-200">
                  Modo Escalante & Moderador
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-5">
            {/* Cartão do Militar e Data Atual */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800">{militarName}</span>
                <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded">
                  RG: {militarRg}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-slate-500 font-bold">Dia escalado:</span>
                <span className="font-black text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded">
                  {currentDayStr.split('-').reverse().join('/')}
                </span>
                <span className={cn(
                  "text-[9px] font-black uppercase px-2 py-0.5 rounded",
                  currentStatus === 'servico' ? "bg-red-100 text-red-700" : "bg-indigo-100 text-indigo-700"
                )}>
                  {currentStatus === 'servico' ? 'Serviço 24h' : 'Expediente'}
                </span>
              </div>
            </div>

            {/* Opções de Ação Direta */}
            <div className="flex flex-col gap-4">
              {/* Opção 1: Mover para outro dia do mês */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  Mover para outro dia do mês ({format(currentMonth, 'MMMM yyyy', { locale: ptBR })})
                </span>
                <div className="grid grid-cols-7 gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl custom-scrollbar">
                  {currentMonthDays.map(d => {
                    const dStr = format(d, 'yyyy-MM-dd');
                    const isCurrent = dStr === currentDayStr;
                    const isAlreadyHas = safeArr(data.selections[militarRg]).includes(dStr);
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                    return (
                      <button
                        key={dStr}
                        type="button"
                        disabled={isCurrent}
                        onClick={() => onMoveMilitaryDay(militarRg, currentDayStr, dStr)}
                        className={cn(
                          "p-2 rounded-lg text-center flex flex-col items-center justify-center transition-all cursor-pointer border text-xs font-black",
                          isCurrent ? "bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed" :
                          isAlreadyHas ? "bg-red-50 text-red-700 border-red-300 hover:bg-red-100" :
                          isWeekend ? "bg-amber-50 text-amber-900 border-amber-200 hover:bg-indigo-100 hover:border-indigo-400" :
                          "bg-white text-slate-700 border-slate-200 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700"
                        )}
                        title={isCurrent ? "Dia atual" : isAlreadyHas ? "Militar já tem serviço neste dia" : "Clique para mover para este dia"}
                      >
                        <span className="text-[8px] font-bold uppercase opacity-60 leading-none">{format(d, 'eee', { locale: ptBR }).slice(0, 3)}</span>
                        <span className="leading-tight mt-0.5">{format(d, 'dd')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Opção 2: Trocar de posição com outro militar escalado */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
                  Trocar serviço diretamente com outro militar do expediente
                </span>
                <select
                  className="w-full text-xs font-bold p-2.5 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 cursor-pointer"
                  defaultValue=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const [targetRg, targetDay] = val.split(':::');
                    if (targetRg && targetDay) {
                      onSwapMilitaryDays(militarRg, currentDayStr, targetRg, targetDay);
                    }
                  }}
                >
                  <option value="">Selecione outro militar escalado para permutar...</option>
                  {expedienteUsers
                    .filter(u => {
                      const rg = u.rg || u.uid;
                      return rg !== 'ESCALANTE_PREF' && rg !== militarRg;
                    })
                    .flatMap(u => {
                      const rg = u.rg || u.uid;
                      const name = formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name);
                      const sels = safeArr(data.selections[rg]);
                      return sels.map(dStr => ({
                        rg,
                        name,
                        dayStr: dStr
                      }));
                    })
                    .map(item => (
                      <option key={`${item.rg}:::${item.dayStr}`} value={`${item.rg}:::${item.dayStr}`}>
                        {item.name} — dia {item.dayStr.split('-').reverse().join('/')}
                      </option>
                    ))}
                </select>
              </div>

              {/* Opção 3 & 4: Alternar status semanal ou remover do dia */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => onRemoveMilitaryFromDay(militarRg, currentDayStr, currentStatus === 'expediente')}
                  className="px-3.5 py-2 rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remover deste Dia (Folga)
                </button>

                <button
                  type="button"
                  onClick={() => onSelectMilitaryForEdit(militarRg, militarName)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Editar Calendário deste Militar
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
