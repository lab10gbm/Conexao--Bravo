import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Edit2, Check, Settings } from 'lucide-react';

export interface AprovisionamentoGerenciarCategoriasModalProps {
  isOpen: boolean;
  onClose: () => void;
  categorias: string[];
  materiais: any[];
  onAddCategoria: (nome: string) => void;
  onRenameCategoria: (oldName: string, newName: string) => void;
  onDeleteCategoria: (nome: string) => void;
}

export function AprovisionamentoGerenciarCategoriasModal({
  isOpen,
  onClose,
  categorias,
  materiais,
  onAddCategoria,
  onRenameCategoria,
  onDeleteCategoria
}: AprovisionamentoGerenciarCategoriasModalProps) {
  const [novaCategoria, setNovaCategoria] = useState('');
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaCategoria.trim()) return;
    onAddCategoria(novaCategoria.trim().toUpperCase());
    setNovaCategoria('');
  };

  const handleSaveEdit = (oldName: string) => {
    if (!editValue.trim() || editValue.trim().toUpperCase() === oldName) {
      setEditingCat(null);
      return;
    }
    onRenameCategoria(oldName, editValue.trim().toUpperCase());
    setEditingCat(null);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]"
        >
          <div className="p-6 border-b border-slate-100 bg-slate-50 shrink-0">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Gerenciar Categorias</h3>
                  <p className="text-xs font-semibold text-slate-500">Adicione, edite ou exclua categorias.</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>
          
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            {categorias.map(cat => {
              const count = materiais.filter(m => m.categoria === cat).length;
              const isEditing = editingCat === cat;
              
              return (
                <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-2 mr-2">
                      <input 
                        type="text" 
                        autoFocus
                        value={editValue} 
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit(cat)}
                        className="flex-1 bg-white border border-indigo-300 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 uppercase outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <button 
                        onClick={() => handleSaveEdit(cat)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setEditingCat(null)}
                        className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="text-sm font-bold text-slate-700 uppercase truncate">{cat}</div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{count} produto{count !== 1 ? 's' : ''}</div>
                    </div>
                  )}
                  
                  {!isEditing && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => {
                          setEditingCat(cat);
                          setEditValue(cat);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Renomear Categoria"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDeleteCategoria(cat)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Excluir Categoria"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0">
            <form onSubmit={handleAdd} className="flex gap-2">
              <input 
                type="text" 
                placeholder="NOVA CATEGORIA..."
                value={novaCategoria}
                onChange={e => setNovaCategoria(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 uppercase"
              />
              <button 
                type="submit"
                disabled={!novaCategoria.trim()}
                className="px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
