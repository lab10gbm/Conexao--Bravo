import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Plus } from 'lucide-react';
import { getLocalIsoDateString } from '../../../lib/utils';

interface AprovisionamentoNovaListaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { nome: string; dataCriacao: string; estabelecimento: string; local: string }) => void;
}

export function AprovisionamentoNovaListaModal({
  isOpen,
  onClose,
  onSave,
}: AprovisionamentoNovaListaModalProps) {
  const [dataCriacao, setDataCriacao] = useState(getLocalIsoDateString());
  const [nome, setNome] = useState('');
  const [estabelecimento, setEstabelecimento] = useState('');
  const [local, setLocal] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSave({
      nome: nome.trim() || 'Lista de Compras',
      dataCriacao: dataCriacao || getLocalIsoDateString(),
      estabelecimento: estabelecimento.trim(),
      local: local.trim(),
    });
    setNome('');
    setEstabelecimento('');
    setLocal('');
    setDataCriacao(getLocalIsoDateString());
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
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Criar Nova Lista</h3>
              <p className="text-xs font-semibold text-slate-500">Adicione as informações para a nova lista.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data da Referência</label>
            <input 
              type="date"
              className="w-full bg-slate-100 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={dataCriacao}
              onChange={e => setDataCriacao(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome / Título da Lista</label>
            <input 
              autoFocus
              placeholder="Ex: Compras da Semana"
              className="w-full bg-slate-100 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={nome}
              onChange={e => setNome(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Estabelecimento</label>
            <input 
              placeholder="Ex: Dom Atacadista"
              className="w-full bg-slate-100 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={estabelecimento}
              onChange={e => setEstabelecimento(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Local / Filial</label>
            <input 
              placeholder="Ex: Balneário"
              className="w-full bg-slate-100 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={local}
              onChange={e => setLocal(e.target.value)}
            />
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSubmit}
            className="flex-1 py-3 px-4 rounded-2xl bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Criar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
