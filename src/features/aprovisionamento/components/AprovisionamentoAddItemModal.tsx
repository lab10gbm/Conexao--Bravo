import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronDown, Plus, Save } from 'lucide-react';
import { ListaDeCompras, Material } from '../types';

interface AprovisionamentoAddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  listasDeCompras: ListaDeCompras[];
  selectedListaId: string | null;
  onSelectListaId: (id: string) => void;
  manualItemForm: {
    nome: string;
    quantidade: number;
    undMedida: string;
    categoria: string;
    materialId?: string;
  };
  setManualItemForm: React.Dispatch<React.SetStateAction<{
    nome: string;
    quantidade: number;
    undMedida: string;
    categoria: string;
    materialId?: string;
  }>>;
  materiais: Material[];
  onSave: () => void;
  onOpenNovaListaModal: () => void;
}

export function AprovisionamentoAddItemModal({
  isOpen,
  onClose,
  listasDeCompras,
  selectedListaId,
  onSelectListaId,
  manualItemForm,
  setManualItemForm,
  materiais,
  onSave,
  onOpenNovaListaModal,
}: AprovisionamentoAddItemModalProps) {
  const [manualItemSuggestions, setManualItemSuggestions] = useState<Material[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  if (!isOpen) return null;

  const handleManualItemNameChange = (val: string) => {
    setManualItemForm(prev => ({ ...prev, nome: val, materialId: undefined }));
    if (val.trim().length >= 2) {
      const filtered = materiais.filter(m => 
        m.nome.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 5);
      setManualItemSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setManualItemSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (m: Material) => {
    setManualItemForm({
      nome: m.nome,
      quantidade: 1,
      undMedida: m.undMedida,
      categoria: m.categoria,
      materialId: m.id
    });
    setManualItemSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
      >
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                {manualItemForm.materialId ? "Adicionar à Lista" : "Novo Item"}
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                {manualItemForm.materialId ? "Confirme a quantidade e a unidade desejada." : "Adicione um item manual na lista de compras."}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Lista de Destino</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select 
                  className="w-full appearance-none bg-indigo-50 border border-indigo-100 rounded-2xl p-4 pr-10 text-sm font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={selectedListaId || ''}
                  onChange={e => onSelectListaId(e.target.value)}
                >
                   <option value="" disabled>Selecione uma lista...</option>
                   {listasDeCompras.filter(l => !l.arquivada).map(lista => (
                      <option key={lista.id} value={lista.id}>{lista.nome}</option>
                    ))}
                 </select>
                 <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
               </div>
               <button 
                 onClick={onOpenNovaListaModal} 
                 className="px-4 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-2xl transition-colors shrink-0 flex items-center justify-center font-bold text-xs uppercase tracking-widest shadow-sm" 
                 title="Criar Nova Lista"
               >
                  <Plus className="w-4 h-4" /> Nova
               </button>
             </div>
           </div>

          <div className="relative">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Descrição do Item</label>
            <input 
              autoFocus
              placeholder="Ex: ARROZ, DETERGENTE..."
              className="w-full bg-slate-100 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={manualItemForm.nome}
              onChange={e => handleManualItemNameChange(e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onFocus={() => {
                if (manualItemSuggestions.length > 0) setShowSuggestions(true);
              }}
              onKeyDown={e => e.key === 'Enter' && !showSuggestions && onSave()}
            />
            
            <AnimatePresence>
              {showSuggestions && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[110]"
                >
                  {manualItemSuggestions.map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleSelectSuggestion(m)}
                      className="w-full p-4 text-left hover:bg-indigo-50 flex items-center justify-between group transition-colors"
                    >
                      <div>
                        <p className="text-sm font-bold text-slate-700">{m.nome}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.categoria} • {m.undMedida}</p>
                      </div>
                      <Plus className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Quantidade</label>
              <input 
                type="number"
                step="any"
                min="0.1"
                className="w-full bg-slate-100 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={manualItemForm.quantidade}
                onChange={e => setManualItemForm(prev => ({ ...prev, quantidade: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Unidade</label>
              <input 
                placeholder="Ex: KG, UN, PCT"
                className="w-full bg-slate-100 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={manualItemForm.undMedida}
                onChange={e => setManualItemForm(prev => ({ ...prev, undMedida: e.target.value }))}
              />
            </div>
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
            onClick={onSave}
            disabled={!manualItemForm.nome.trim()}
            className="flex-1 py-3 px-4 rounded-2xl bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Salvar Item
          </button>
        </div>
      </motion.div>
    </div>
  );
}
