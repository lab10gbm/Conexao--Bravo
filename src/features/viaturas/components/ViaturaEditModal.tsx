import React from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import { ViaturaConfig, VtrModalFunctionRow } from '../types';
import { getFunctionRoleCategory, inferDefaultFnIdForSlot, syncModalFunctionsToVtr } from '../lib/viaturaUtils';

interface ViaturaEditModalProps {
  editingVtr: ViaturaConfig;
  isAdding: boolean;
  modalFunctions: VtrModalFunctionRow[];
  setModalFunctions: (rows: VtrModalFunctionRow[]) => void;
  setEditingVtr: React.Dispatch<React.SetStateAction<ViaturaConfig | null>>;
  onClose: () => void;
  onSave: (syncedVtr: ViaturaConfig) => void;
  availableFunctions: Array<{ id: string; name: string; scaleName: string; categoryId: string; categoryName: string }>;
  groupedFunctions: Array<{ categoryId: string; categoryName: string; items: any[] }>;
}

export const ViaturaEditModal: React.FC<ViaturaEditModalProps> = ({
  editingVtr,
  isAdding,
  modalFunctions,
  setModalFunctions,
  setEditingVtr,
  onClose,
  onSave,
  availableFunctions,
  groupedFunctions,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-black uppercase tracking-tight text-slate-800 mb-4">
          {isAdding ? "Adicionar Viatura" : "Editar Viatura"}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Nome da Viatura</label>
            <input 
              type="text" 
              value={editingVtr.vtr}
              onChange={(e) => setEditingVtr({...editingVtr, vtr: e.target.value.toUpperCase()})}
              className="w-full p-2 mt-1 border border-slate-200 rounded-xl uppercase font-bold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
              placeholder="Ex: ABT-999"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Tipo</label>
              <select 
                value={editingVtr.tipo || 'operacional'}
                onChange={(e) => setEditingVtr({...editingVtr, tipo: e.target.value as 'operacional' | 'administrativa'})}
                className="w-full p-2 mt-1 border border-slate-200 rounded-xl uppercase font-bold bg-white text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
              >
                <option value="operacional">Operacional</option>
                <option value="administrativa">Administrativa</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 p-2 px-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors h-[42px] mb-[1px]">
                <input
                  type="checkbox"
                  checked={editingVtr.maritima || false}
                  onChange={e => setEditingVtr({...editingVtr, maritima: e.target.checked})}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700 uppercase">Marítima</span>
              </label>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Espaço na Escala</label>
              <select 
                value={editingVtr.espaco || '1'}
                onChange={(e) => setEditingVtr({...editingVtr, espaco: e.target.value as '1' | '1/2' | '1/3'})}
                className="w-full p-2 mt-1 border border-slate-200 rounded-xl uppercase font-bold bg-white text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
              >
                <option value="1">1 (Espaço Completo)</option>
                <option value="1/2">1/2 (Meia Coluna Compartilhada)</option>
                <option value="1/3">1/3 (Terço de Coluna Compartilhada)</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 p-2 px-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors h-[42px] mb-[1px]">
                <input
                  type="checkbox"
                  checked={editingVtr.exibir !== undefined ? editingVtr.exibir : true}
                  onChange={e => setEditingVtr({...editingVtr, exibir: e.target.checked})}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700 uppercase">Exibir na Escala</span>
              </label>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-black uppercase text-slate-700">
                Funções da Viatura
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                {modalFunctions.length} de 3 funções
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
              Adicione até <strong>3 funções</strong> cadastradas no <strong>Controle de Função</strong>. Condutor/Mestre e Chefe possuem <strong>1 vaga fixa</strong>; Auxiliares e Marinheiros permitem escolher a quantidade (ex: <strong>até 3 militares</strong>).
            </p>

            <div className="space-y-2.5">
              {modalFunctions.map((row, idx) => {
                const roleCat = getFunctionRoleCategory(row.fnId, row.customName, availableFunctions);
                const isSingleRole = roleCat === 'condutor' || roleCat === 'chefe';
                const matchedFn = availableFunctions.find(f => f.id === row.fnId);

                const updateRow = (patch: Partial<VtrModalFunctionRow>) => {
                  const nextRows = modalFunctions.map((r, i) => (i === idx ? { ...r, ...patch } : r));
                  setModalFunctions(nextRows);
                  setEditingVtr(prev => (prev ? syncModalFunctionsToVtr(prev, nextRows, availableFunctions) : null));
                };

                const removeRow = () => {
                  const nextRows = modalFunctions.filter((_, i) => i !== idx);
                  setModalFunctions(nextRows);
                  setEditingVtr(prev => (prev ? syncModalFunctionsToVtr(prev, nextRows, availableFunctions) : null));
                };

                return (
                  <div
                    key={row.uid}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-black flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
                          {roleCat === 'condutor'
                            ? 'Condução / Mestre'
                            : roleCat === 'chefe'
                            ? 'Chefia de Guarnição'
                            : 'Guarnição / Auxiliar'}
                        </span>
                        {matchedFn && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[9px] font-bold uppercase">
                            {matchedFn.categoryName}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={removeRow}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[9px] font-bold uppercase"
                        title="Remover esta função da viatura"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    </div>

                    <div className="flex gap-2 items-end">
                      {/* Seletor da Função */}
                      <div className="flex-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">
                          Função (Controle de Função)
                        </label>
                        <select
                          value={row.fnId}
                          onChange={(e) => {
                            const newFnId = e.target.value;
                            const newRoleCat = getFunctionRoleCategory(newFnId, row.customName, availableFunctions);
                            const nextQty =
                              newRoleCat === 'condutor' || newRoleCat === 'chefe'
                                ? 1
                                : row.maxQty > 1
                                ? row.maxQty
                                : 3;
                            updateRow({
                              fnId: newFnId,
                              maxQty: nextQty,
                            });
                          }}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 uppercase outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
                        >
                          <option value="">-- Selecione a Função --</option>
                          {groupedFunctions.map(group => (
                            <optgroup key={group.categoryId} label={group.categoryName.toUpperCase()}>
                              {group.items.map(fn => (
                                <option key={fn.id} value={fn.id}>
                                  {fn.name.toUpperCase()} {fn.scaleName !== fn.name.toUpperCase() ? `(${fn.scaleName})` : ''}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                          <optgroup label="PERSONALIZADO">
                            <option value="__CUSTOM__">+ DIGITAR NOME PERSONALIZADO...</option>
                          </optgroup>
                        </select>
                      </div>

                      {/* Seletor de Quantidade */}
                      <div className="w-36 shrink-0">
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">
                          Quantidade (Vagas)
                        </label>
                        {isSingleRole ? (
                          <div
                            className="w-full p-2 bg-slate-200/70 border border-slate-200 rounded-xl text-xs font-black text-slate-600 uppercase text-center select-none"
                            title="Funções de Condutor, Mestre e Chefe possuem sempre 1 militar por viatura"
                          >
                            1 Militar (Fixo)
                          </div>
                        ) : (
                          <select
                            value={row.maxQty}
                            onChange={(e) => updateRow({ maxQty: Number(e.target.value) })}
                            className="w-full p-2 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs font-black text-indigo-700 uppercase outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
                          >
                            <option value={1}>Até 1 Militar</option>
                            <option value={2}>Até 2 Militares</option>
                            <option value={3}>Até 3 Militares</option>
                            <option value={4}>Até 4 Militares</option>
                          </select>
                        )}
                      </div>
                    </div>

                    {row.fnId === '__CUSTOM__' && (
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">
                          Digite o Nome da Função
                        </label>
                        <input
                          type="text"
                          value={row.customName}
                          onChange={(e) => updateRow({ customName: e.target.value.toUpperCase() })}
                          placeholder="Ex: AUXILIAR, MARINHEIRO, SOCORRISTA, CHEFE..."
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {modalFunctions.length === 0 && (
                <div className="p-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400 font-bold uppercase">
                  Nenhuma função adicionada nesta viatura.
                </div>
              )}
            </div>

            {modalFunctions.length < 3 && (
              <button
                type="button"
                onClick={() => {
                  const hasCond = modalFunctions.some(r => getFunctionRoleCategory(r.fnId, r.customName, availableFunctions) === 'condutor');
                  const hasAux = modalFunctions.some(r => getFunctionRoleCategory(r.fnId, r.customName, availableFunctions) === 'auxiliar');
                  const nextGroup: 'condutor' | 'auxiliar' | 'chefe' = !hasCond ? 'condutor' : !hasAux ? 'auxiliar' : 'chefe';
                  const suggestedFnId = inferDefaultFnIdForSlot(editingVtr, nextGroup);
                  const validFnId = availableFunctions.some(f => f.id === suggestedFnId)
                    ? suggestedFnId
                    : (availableFunctions[0]?.id || '');
                  const newRow: VtrModalFunctionRow = {
                    uid: `fn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    fnId: validFnId,
                    customName: '',
                    maxQty: nextGroup === 'auxiliar' ? 3 : 1,
                  };
                  const nextRows = [...modalFunctions, newRow];
                  setModalFunctions(nextRows);
                  setEditingVtr(prev => (prev ? syncModalFunctionsToVtr(prev, nextRows, availableFunctions) : null));
                }}
                className="mt-3 w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Adicionar Função ({modalFunctions.length}/3)
              </button>
            )}
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={() => {
              if (!editingVtr.vtr.trim()) {
                alert("O nome da viatura é obrigatório.");
                return;
              }
              const synced = syncModalFunctionsToVtr(editingVtr, modalFunctions, availableFunctions);
              onSave(synced);
            }}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            {isAdding ? "Adicionar" : "Salvar Alterações"}
          </button>
        </div>
      </div>
    </div>
  );
};
