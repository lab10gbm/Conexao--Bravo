import React from 'react';
import { motion } from 'motion/react';
import { MoveRight, X, ChevronRight } from 'lucide-react';
import { PatrimonioItem, PatrimonioSection } from '../types';

interface PatrimonyTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentItem: PatrimonioItem | null;
  allSections: PatrimonioSection[];
  selectedSectionId?: string;
  onExecuteTransfer: (targetSectionId: string) => void;
}

export function PatrimonyTransferModal({
  isOpen,
  onClose,
  currentItem,
  allSections,
  selectedSectionId,
  onExecuteTransfer,
}: PatrimonyTransferModalProps) {
  if (!isOpen || !currentItem) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="bg-amber-600 p-4 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <MoveRight className="w-5 h-5" />
            <h2 className="font-bold tracking-tight">Transferir Item</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded-xl">
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Item a transferir</p>
            <p className="text-sm font-bold text-slate-700">{currentItem.id} - {currentItem.descricao}</p>
          </div>
          
          <p className="text-xs uppercase font-black tracking-widest text-slate-500 mb-3">Selecione o Destino:</p>
          <div className="grid gap-2">
            {allSections.filter(s => s.id !== selectedSectionId).map(s => (
              <button
                key={s.id}
                onClick={() => onExecuteTransfer(s.id)}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-600 hover:text-amber-700 transition-colors flex items-center justify-between group"
              >
                <div>
                  <p className="text-sm font-bold">{s.nome}</p>
                  {s.obm && <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-0.5">{s.obm}</p>}
                </div>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
