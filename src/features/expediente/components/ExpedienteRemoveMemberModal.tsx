import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2 } from 'lucide-react';

interface ExpedienteRemoveMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  removeMemberAla: string;
  setRemoveMemberAla: (ala: string) => void;
  onConfirm: () => void;
}

export function ExpedienteRemoveMemberModal({
  isOpen,
  onClose,
  removeMemberAla,
  setRemoveMemberAla,
  onConfirm
}: ExpedienteRemoveMemberModalProps) {
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
          className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden pointer-events-auto my-auto"
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-red-50">
            <h3 className="font-black text-red-800 uppercase tracking-widest text-sm flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-600" />
              Remover do Expediente
            </h3>
          </div>
          <div className="p-6 flex flex-col gap-6">
            <p className="text-sm font-bold text-slate-700">Para qual Ala (1, 2, 3 ou 4) deseja mover este militar?</p>
            <p className="text-xs text-slate-500">Deixe em branco ou digite '0' para deixar SEM ALA</p>
            <input
              type="text"
              value={removeMemberAla}
              onChange={(e) => setRemoveMemberAla(e.target.value)}
              className="w-full text-sm p-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-red-500"
              placeholder="Ala"
            />
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-colors shadow-md cursor-pointer"
              >
                Confirmar Remoção
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
