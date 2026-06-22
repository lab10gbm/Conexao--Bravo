import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';
import { GROUPS } from '../constants';

interface LendMilitarModalProps {
  lendingMilitar: UserProfile;
  onClose: () => void;
  onLendConfirm: (militar: UserProfile, newGroup: string) => Promise<void>;
  isLending: boolean;
}

export function LendMilitarModal({ lendingMilitar, onClose, onLendConfirm, isLending }: LendMilitarModalProps) {
  const [selectedLendGroup, setSelectedLendGroup] = useState('');

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 p-4">
       <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl"
       >
          <h3 className="text-lg font-black text-slate-800 mb-2">Emprestar Militar</h3>
          <p className="text-sm text-slate-500 mb-6 font-medium">
             Selecione a OBM/Subunidade para onde <strong className="text-slate-800">{lendingMilitar.rank} {lendingMilitar.warName || (lendingMilitar.name || '').split(' ')[0]}</strong> será emprestado.
          </p>

          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto mb-6 pr-2">
             {GROUPS.map(g => {
                const isOriginal = lendingMilitar.obm === g.id || (!lendingMilitar.obm && g.id === '10º GBM');
                const isCurrent = (lendingMilitar.lentTo || lendingMilitar.obm || '10º GBM') === g.id;
                const isSelected = selectedLendGroup === g.id;

                return (
                  <button
                    key={g.id}
                    onClick={() => setSelectedLendGroup(g.id)}
                    disabled={isCurrent}
                    className={`p-3 rounded-lg border-2 text-left font-bold text-sm transition-all flex items-center justify-between ${
                      isCurrent 
                        ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed' 
                        : isSelected
                           ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                           : 'border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                     <span>{g.label} {isOriginal && <span className="text-[10px] ml-2 text-slate-400 font-black uppercase">(Origem)</span>}</span>
                     {isCurrent ? (
                        <div className="w-2 h-2 rounded-full bg-slate-400" />
                     ) : isSelected ? (
                        <div className="w-4 h-4 rounded-full border-4 border-indigo-500 bg-white" />
                     ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                     )}
                  </button>
                );
             })}
          </div>

          <div className="flex justify-end gap-3">
             <button 
               onClick={onClose}
               className="px-4 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest text-slate-600 hover:bg-slate-100"
             >
               Cancelar
             </button>
             {lendingMilitar.lentTo ? (
                <button 
                  onClick={() => onLendConfirm(lendingMilitar, lendingMilitar.obm || '10º GBM')}
                  disabled={isLending}
                  className="px-4 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50"
                >
                  {isLending ? 'Processando...' : 'Devolver à Origem'}
                </button>
             ) : null}
             <button 
               onClick={() => selectedLendGroup && onLendConfirm(lendingMilitar, selectedLendGroup)}
               disabled={!selectedLendGroup || isLending}
               className="px-6 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
             >
               {isLending ? 'Processando...' : 'Confirmar'}
             </button>
          </div>
       </motion.div>
    </div>
  );
}
