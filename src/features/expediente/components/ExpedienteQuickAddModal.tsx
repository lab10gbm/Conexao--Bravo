import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, X } from 'lucide-react';
import { formatMilitaryName } from '../../../lib/utils';
import { UserProfile } from '../../../types';
import { ExpedienteData } from '../types';

interface ExpedienteQuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayStr: string;
  expedienteUsers: UserProfile[];
  data: ExpedienteData;
  getReqAmount: (rg: string) => number | string;
  onQuickAssignMilitary: (rg: string, dayStr: string, mode: 'servico' | 'expediente') => void;
}

export function ExpedienteQuickAddModal({
  isOpen,
  onClose,
  dayStr,
  expedienteUsers,
  data,
  getReqAmount,
  onQuickAssignMilitary
}: ExpedienteQuickAddModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const safeArr = (val: any) => (Array.isArray(val) ? val : []);

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
          className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden pointer-events-auto my-auto border-2 border-indigo-100"
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-300" />
              <div className="flex flex-col">
                <h3 className="font-black text-sm uppercase tracking-wider text-white">
                  Escalar Militar no Dia {dayStr.split('-').reverse().join('/')}
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

          <div className="p-5 flex flex-col gap-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar militar por nome ou RG..."
              className="w-full text-xs p-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold"
              autoFocus
            />

            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto custom-scrollbar">
              {expedienteUsers
                .filter(u => (u.rg || u.uid) !== 'ESCALANTE_PREF')
                .filter(u => {
                  if (!searchTerm.trim()) return true;
                  const q = searchTerm.toLowerCase();
                  const name = (u.name || '').toLowerCase();
                  const warName = (u.warName || '').toLowerCase();
                  const rg = (u.rg || u.uid || '').toLowerCase();
                  return name.includes(q) || warName.includes(q) || rg.includes(q);
                })
                .map(u => {
                  const rg = u.rg || u.uid || '';
                  const name = formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name);
                  const isAlreadyWorking = safeArr(data.selections[rg]).includes(dayStr);
                  const isExpWorking = safeArr(data.expedienteDays?.[rg]).includes(dayStr);
                  const curCount = safeArr(data.selections[rg]).length;
                  const req = getReqAmount(rg);

                  return (
                    <div
                      key={rg}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-indigo-50/50 hover:border-indigo-200 transition-colors"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-xs font-black text-slate-800 truncate">{name}</span>
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500">
                          <span>RG: {rg}</span>
                          <span>•</span>
                          <span>{curCount}/{req || '?'} SV no mês</span>
                          {isAlreadyWorking && (
                            <span className="bg-red-100 text-red-700 px-1 rounded uppercase font-black">Já neste dia</span>
                          )}
                          {isExpWorking && (
                            <span className="bg-indigo-100 text-indigo-700 px-1 rounded uppercase font-black">Expediente</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onQuickAssignMilitary(rg, dayStr, 'servico')}
                          className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors shadow-2xs cursor-pointer"
                          title="Escalar como Serviço 24h"
                        >
                          + SV 24h
                        </button>
                        <button
                          type="button"
                          onClick={() => onQuickAssignMilitary(rg, dayStr, 'expediente')}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors shadow-2xs cursor-pointer"
                          title="Escalar como Expediente"
                        >
                          + EXP
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
