import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface AprovisionamentoNovoProdutoModalProps {
  isOpen: boolean;
  onClose: () => void;
  filtroCategoria: string;
  onSave: (nome: string, undMedida: string) => void;
}

export function AprovisionamentoNovoProdutoModal({
  isOpen,
  onClose,
  filtroCategoria,
  onSave,
}: AprovisionamentoNovoProdutoModalProps) {
  const [nome, setNome] = useState('');
  const [undMedida, setUndMedida] = useState('UND');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    onSave(nome.trim().toUpperCase(), undMedida);
    setNome('');
    setUndMedida('UND');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
      >
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Novo Produto</h3>
              <p className="text-xs font-semibold text-slate-500">Adicionar produto na categoria {filtroCategoria}.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome do Produto</label>
              <input 
                type="text"
                autoFocus
                required
                placeholder="Ex: ARROZ AGULHINHA..."
                className="w-full bg-slate-100 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 uppercase"
                value={nome}
                onChange={e => setNome(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Unidade de Medida</label>
              <select
                className="w-full bg-slate-100 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 uppercase"
                value={undMedida}
                onChange={e => setUndMedida(e.target.value)}
              >
                <option value="KG">KG.</option>
                <option value="UND">UND.</option>
                <option value="LT">LT.</option>
                <option value="PCT">PCT.</option>
                <option value="DZ">DZ.</option>
                <option value="BDJ">BDJ.</option>
                <option value="BTJ">BTJ.</option>
              </select>
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-sm font-bold uppercase tracking-widest transition-colors shadow-md hover:shadow-lg"
            >
              Salvar Produto
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
