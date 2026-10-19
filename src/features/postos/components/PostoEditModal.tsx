import React, { useState } from 'react';
import { X, Plus, Trash2, Palmtree, Shield, Check, Sparkles } from 'lucide-react';
import { PostoConfig, PostoFuncaoConfig } from '../types';
import { OBM_OPTIONS } from '../../viaturas/types';

interface PostoEditModalProps {
  editingPosto: PostoConfig;
  isAdding: boolean;
  onClose: () => void;
  onSave: (posto: PostoConfig) => void;
  obmContext: string;
}

const COMMON_FUNCTIONS_SUGGESTIONS = [
  "CHEFE DO POSTO",
  "GUARDA-VIDAS 1",
  "GUARDA-VIDAS 2",
  "GUARDA-VIDAS 3",
  "CONDUTOR",
  "SOCORRISTA",
  "OPERADOR DE EMBARCAÇÃO",
  "MARINHEIRO",
  "TELEFONISTA / RÁDIO",
  "SENTINELA DE POSTO"
];

export function PostoEditModal({
  editingPosto,
  isAdding,
  onClose,
  onSave,
  obmContext
}: PostoEditModalProps) {
  const [nome, setNome] = useState(editingPosto.nome || '');
  const [tipo, setTipo] = useState<PostoConfig['tipo']>(editingPosto.tipo || 'praia');
  const [obm, setObm] = useState(editingPosto.obm || obmContext || '10º GBM');
  const [ativa, setAtiva] = useState(editingPosto.ativa !== undefined ? editingPosto.ativa : true);
  const [exibir, setExibir] = useState(editingPosto.exibir !== undefined ? editingPosto.exibir : true);
  const [funcoes, setFuncoes] = useState<PostoFuncaoConfig[]>(
    editingPosto.funcoes && editingPosto.funcoes.length > 0
      ? editingPosto.funcoes
      : [
          { id: 'f-chefe', nome: 'CHEFE DO POSTO', vagas: 1 },
          { id: 'f-gv1', nome: 'GUARDA-VIDAS 1', vagas: 1 },
          { id: 'f-gv2', nome: 'GUARDA-VIDAS 2', vagas: 1 },
          { id: 'f-cond', nome: 'CONDUTOR', vagas: 1 }
        ]
  );
  const [newFuncaoName, setNewFuncaoName] = useState('');

  const handleAddFuncao = (funcaoNome?: string) => {
    const fnToUse = (funcaoNome || newFuncaoName).trim().toUpperCase();
    if (!fnToUse) return;

    const newFn: PostoFuncaoConfig = {
      id: `fn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      nome: fnToUse,
      vagas: 1
    };

    setFuncoes(prev => [...prev, newFn]);
    setNewFuncaoName('');
  };

  const handleUpdateFuncaoName = (id: string, newName: string) => {
    setFuncoes(prev =>
      prev.map(f => (f.id === id ? { ...f, nome: newName.toUpperCase() } : f))
    );
  };

  const handleRemoveFuncao = (id: string) => {
    setFuncoes(prev => prev.filter(f => f.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      alert("Informe o nome do posto.");
      return;
    }
    if (funcoes.length === 0) {
      alert("Adicione ao menos uma função para este posto.");
      return;
    }

    onSave({
      ...editingPosto,
      nome: nome.trim().toUpperCase(),
      tipo,
      obm,
      ativa,
      exibir,
      funcoes
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 to-cyan-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Palmtree className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider">
                {isAdding ? "Cadastrar Novo Posto" : "Editar Posto de Serviço"}
              </h2>
              <p className="text-xs text-teal-100 font-medium">
                Defina o nome do posto e a guarnição (funções a serem escaladas)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Dados Gerais do Posto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Nome do Posto *
              </label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: POSTO DE PRAIA 01, POSTO SALVAMAR..."
                required
                className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 transition-all uppercase"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Tipo do Posto
              </label>
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value as PostoConfig['tipo'])}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 transition-all cursor-pointer"
              >
                <option value="praia">Praia / Salvamar</option>
                <option value="operacional">Operacional Geral</option>
                <option value="destacamento">Destacamento / DBM</option>
                <option value="fixo">Ponto Fixo / Apoio</option>
                <option value="outro">Outro Tipo</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                OBM Pertencente
              </label>
              <select
                value={obm}
                onChange={e => setObm(e.target.value)}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 transition-all cursor-pointer"
              >
                {OBM_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-6 pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ativa}
                  onChange={e => setAtiva(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                />
                <span className="text-xs font-bold text-slate-700">
                  Posto Ativo
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={exibir}
                  onChange={e => setExibir(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                />
                <span className="text-xs font-bold text-slate-700">
                  Exibir na Escala
                </span>
              </label>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Funções do Posto */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800">
                Funções da Guarnição do Posto ({funcoes.length} vagas)
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                Militares serão escalados nestas funções
              </span>
            </div>

            {/* Sugestões Rápidas */}
            <div className="mb-3">
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-1.5">
                <Sparkles className="w-3 h-3 text-amber-500" /> Sugestões de Funções Rápidas:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_FUNCTIONS_SUGGESTIONS.map(sug => {
                  const alreadyExists = funcoes.some(f => f.nome === sug);
                  return (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => handleAddFuncao(sug)}
                      disabled={alreadyExists}
                      className={`text-[9.5px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        alreadyExists
                          ? "bg-slate-100 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed"
                          : "bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100"
                      }`}
                    >
                      + {sug}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input para Adicionar Função Personalizada */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newFuncaoName}
                onChange={e => setNewFuncaoName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFuncao();
                  }
                }}
                placeholder="Nome de outra função (ex: SOCORRISTA 2, PILOTO...)"
                className="flex-1 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 transition-all uppercase"
              />
              <button
                type="button"
                onClick={() => handleAddFuncao()}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>

            {/* Lista de Funções Cadastradas */}
            <div className="space-y-2 border border-slate-200 rounded-2xl p-3 bg-slate-50/60 max-h-56 overflow-y-auto">
              {funcoes.length === 0 ? (
                <p className="text-xs font-medium text-slate-400 text-center py-4">
                  Nenhuma função cadastrada para este posto. Adicione ao menos uma acima.
                </p>
              ) : (
                funcoes.map((fn, idx) => (
                  <div
                    key={fn.id}
                    className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 flex-1">
                      <span className="w-5 h-5 rounded-md bg-teal-100 text-teal-800 text-[10px] font-black flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={fn.nome}
                        onChange={e => handleUpdateFuncaoName(fn.id, e.target.value)}
                        className="flex-1 text-xs font-black uppercase text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-teal-500 focus:outline-none px-1"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFuncao(fn.id)}
                      className="p-1 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-colors cursor-pointer"
                      title="Remover função deste posto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-teal-700 hover:bg-teal-800 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" /> {isAdding ? "Cadastrar Posto" : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
