import React from 'react';
import { motion } from 'motion/react';
import { Search, Settings, Plus, X, Star, Save, Trash2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Material, TipoUso } from '../types';

interface AprovisionamentoEstoqueTabProps {
  categoriasAbas: string[];
  filtroCategoria: string;
  setFiltroCategoria: (cat: string) => void;
  cadastroFiltroMsg: string;
  setCadastroFiltroMsg: (msg: string) => void;
  onOpenCategoriasModal: () => void;
  onAddNewMaterial: () => void;
  datasEstoque: string[];
  onRemoveDataEstoque: (dt: string) => void;
  showNovaDataPopup: boolean;
  setShowNovaDataPopup: (show: boolean) => void;
  novaDataValue: string;
  setNovaDataValue: (val: string) => void;
  onAddDataEstoque: () => void;
  materiaisFiltrados: Material[];
  onUpdateMaterial: (id: string, updates: Partial<Material>) => void;
  onRemoveMaterial: (id: string, nome: string) => void;
}

export function AprovisionamentoEstoqueTab({
  categoriasAbas,
  filtroCategoria,
  setFiltroCategoria,
  cadastroFiltroMsg,
  setCadastroFiltroMsg,
  onOpenCategoriasModal,
  onAddNewMaterial,
  datasEstoque,
  onRemoveDataEstoque,
  showNovaDataPopup,
  setShowNovaDataPopup,
  novaDataValue,
  setNovaDataValue,
  onAddDataEstoque,
  materiaisFiltrados,
  onUpdateMaterial,
  onRemoveMaterial,
}: AprovisionamentoEstoqueTabProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-wrap rounded-xl bg-slate-100 p-1 items-center gap-1">
          {categoriasAbas.map(cat => (
            <button
              key={cat}
              onClick={() => setFiltroCategoria(cat)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors",
                filtroCategoria === cat ? `bg-indigo-600 text-white shadow-sm` : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"
              )}
            >
              {cat}
            </button>
          ))}
          <button
            onClick={onOpenCategoriasModal}
            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-dashed border-slate-300"
            title="Gerenciar Categorias"
          >
            <Settings className="w-3 h-3" />
          </button>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar produto..."
              value={cadastroFiltroMsg}
              onChange={e => setCadastroFiltroMsg(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all w-full sm:w-64"
            />
          </div>
          <button 
            onClick={onOpenCategoriasModal}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold uppercase transition-colors whitespace-nowrap"
          >
            <Settings className="w-4 h-4" /> Categorias
          </button>
          <button 
            onClick={onAddNewMaterial}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold uppercase transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Adicionar Produto
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className={cn(
              "uppercase text-[10px] tracking-wider text-white",
              filtroCategoria === 'MERCADO' ? 'bg-[#2A2B4C]' :
              filtroCategoria === 'PROTEINA' ? 'bg-[#821D21]' :
              filtroCategoria === 'SACOLAO' ? 'bg-[#315629]' :
              filtroCategoria === 'LIMPEZA' ? 'bg-[#5C3224]' :
              'bg-[#1E3A8A]'
            )}>
              <th className="py-3 px-4 font-black">Fav</th>
              <th className="py-3 px-4 font-black">Produto ({filtroCategoria})</th>
              {filtroCategoria === 'PROTEINA' && <th className="py-3 px-4 font-black text-center">Porção (KG)</th>}
              <th className="py-3 px-4 font-black text-center">Und. Medida</th>
              <th className="py-3 px-4 font-black text-center">Tipo Uso</th>
              {datasEstoque.slice(-3).map(dt => (
                <th key={dt} className="py-3 px-4 font-black whitespace-nowrap min-w-[120px]">
                  <div className="flex items-center justify-end gap-2">
                    Estoque ({dt})
                    {datasEstoque.length > 1 && (
                      <button
                        onClick={() => onRemoveDataEstoque(dt)}
                        className="text-slate-400 hover:text-red-500 hover:bg-slate-200 p-0.5 rounded-full transition-colors focus:outline-none"
                        title="Remover data"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="py-3 px-2 font-black text-center w-12">
                <div className="relative inline-block text-left">
                  <button
                    onClick={() => setShowNovaDataPopup(!showNovaDataPopup)}
                    className="p-1 hover:bg-white/20 rounded-md text-white transition-colors flex items-center justify-center w-full focus:outline-none"
                    title="Nova Data de Contagem"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  
                  {showNovaDataPopup && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200 font-sans">
                      <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">
                        Nova Data de Contagem
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Ex: 28/05"
                          value={novaDataValue}
                          onChange={(e) => setNovaDataValue(e.target.value)}
                          className="w-full text-slate-800 text-sm font-semibold border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder:text-slate-300 placeholder:font-normal"
                          onKeyDown={e => {
                            if (e.key === 'Enter') onAddDataEstoque();
                            if (e.key === 'Escape') setShowNovaDataPopup(false);
                          }}
                        />
                        <button
                          onClick={onAddDataEstoque}
                          disabled={!novaDataValue}
                          className="bg-amber-500 hover:bg-amber-600 focus:ring-2 focus:ring-offset-1 focus:ring-amber-500 text-white p-1.5 rounded-lg disabled:opacity-50 transition-colors flex justify-center items-center"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="text-sm font-semibold text-slate-700 divide-y divide-slate-100">
            {materiaisFiltrados.map(m => (
              <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-2.5 px-4">
                  <button
                    onClick={() => onUpdateMaterial(m.id, { favorito: !m.favorito })}
                    className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors focus:outline-none focus:bg-slate-200"
                  >
                    <Star className={cn(
                      "w-4 h-4 transition-all duration-300", 
                      m.favorito ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] scale-110" : "text-slate-300 hover:text-slate-400"
                    )} />
                  </button>
                </td>
                <td className="py-2.5 px-4 font-bold text-slate-800">{m.nome}</td>
                {filtroCategoria === 'PROTEINA' && (
                  <td className="py-2.5 px-4">
                    <input 
                      type="number" 
                      value={m.porcaoPadrao || 0} 
                      step="0.01"
                      onChange={e => onUpdateMaterial(m.id, { porcaoPadrao: parseFloat(e.target.value) })}
                      className="w-20 px-2 py-1 bg-white border border-slate-200 rounded text-center mx-auto block text-xs" 
                    />
                  </td>
                )}
                <td className="py-2.5 px-4">
                  <select 
                    value={m.undMedida}
                    onChange={e => onUpdateMaterial(m.id, { undMedida: e.target.value })}
                    className="w-full bg-transparent border-none text-center font-bold text-slate-600 focus:ring-0 cursor-pointer"
                  >
                    <option value="KG">KG.</option>
                    <option value="UND">UND.</option>
                    <option value="LT">LT.</option>
                    <option value="PCT">PCT.</option>
                    <option value="DZ">DZ.</option>
                    <option value="BDJ">BDJ.</option>
                    <option value="BTJ">BTJ.</option>
                  </select>
                </td>
                <td className="py-2.5 px-4 text-center">
                  <select 
                    value={m.tipoUso}
                    onChange={e => onUpdateMaterial(m.id, { tipoUso: e.target.value as TipoUso })}
                    className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border-none focus:ring-0 cursor-pointer text-center mx-auto block",
                      m.tipoUso === 'imediato' ? "bg-red-100 text-red-700" : 
                      m.tipoUso === 'prolongado' ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    <option value="">--</option>
                    <option value="imediato">Imediato</option>
                    <option value="prolongado">Prolongado</option>
                  </select>
                </td>
                {datasEstoque.slice(-3).map((dt, idx, arr) => {
                  const isLatest = idx === arr.length - 1;
                  const mEstoques = m.estoquesPorData || {};
                  let currentVal = mEstoques[dt];
                  if (currentVal === undefined && isLatest && Object.keys(mEstoques).length === 0) {
                    currentVal = m.estoque;
                  }
                  
                  return (
                    <td key={dt} className="py-2.5 px-4 text-right">
                       <input 
                          type="number" 
                          value={currentVal ?? ''} 
                          onChange={e => {
                            const valString = e.target.value;
                            const val = valString === '' ? 0 : parseFloat(valString);
                            const novosEstoques = { ...mEstoques, [dt]: val };
                            
                            const updates: Partial<Material> = { estoquesPorData: novosEstoques };
                            if (isLatest) {
                              updates.estoque = val;
                            }
                            
                            onUpdateMaterial(m.id, updates);
                          }}
                          className="w-24 px-3 py-1.5 bg-slate-100 border border-transparent focus:border-amber-400 focus:bg-white rounded-lg text-right font-black font-mono ml-auto block transition-all" 
                        />
                    </td>
                  );
                })}
                <td className="py-2.5 px-2 text-center">
                  <button
                    onClick={() => onRemoveMaterial(m.id, m.nome)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors focus:outline-none"
                    title="Excluir Material"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {materiaisFiltrados.length === 0 && (
              <tr>
                <td colSpan={7 + (filtroCategoria === 'PROTEINA' ? 1 : 0)} className="py-8 text-center text-slate-400 font-bold uppercase text-xs">Nenhum produto encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <button 
        onClick={onAddNewMaterial}
        className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 text-xs font-bold uppercase hover:bg-slate-50 hover:border-slate-400 hover:text-slate-700 transition-colors w-full justify-center"
      >
        <Plus className="w-4 h-4" /> Adicionar Novo Produto
      </button>
    </motion.div>
  );
}
