import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';

interface ManualRgModalProps {
  onClose: () => void;
  onConfirm: (rg: string) => void;
}

export function ManualRgModal({ onClose, onConfirm }: ManualRgModalProps) {
  const [rg, setRg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rg.trim()) {
      onConfirm(rg.trim());
      onClose();
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[110] bg-white rounded-2xl shadow-xl p-6 w-[90vw] max-w-sm flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-800">Adicionar por RG</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={rg}
            onChange={(e) => setRg(e.target.value)}
            placeholder="Digite o RG..."
            autoFocus
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors"
          />
          <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Adicionar
          </button>
        </form>
      </motion.div>
    </>
  );
}
