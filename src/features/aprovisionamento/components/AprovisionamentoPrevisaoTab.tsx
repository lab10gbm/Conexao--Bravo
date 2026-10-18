import React from 'react';
import { motion } from 'motion/react';
import { X, AlertTriangle, TrendingDown, ShoppingBag } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Material, ListaDeCompras } from '../types';

interface AprovisionamentoPrevisaoTabProps {
  previsaoDiasOptions: number[];
  setPrevisaoDiasOptions: (opts: number[]) => void;
  newPrevisaoDiaStr: string;
  setNewPrevisaoDiaStr: (s: string) => void;
  mostrarTodosPrevisao: boolean;
  setMostrarTodosPrevisao: (b: boolean) => void;
  categoriasAbas: string[];
  filtroCategoriaPrevisao: string;
  setFiltroCategoriaPrevisao: (cat: string) => void;
  materiais: Material[];
  calculoPrevisao: Record<string, { inDays: Record<number, number>; hoje: number; total: number }>;
  datasEstoque: string[];
  latestEstoqueDate: Date;
  listasDeCompras: ListaDeCompras[];
  onPromptAddToListaCompras: (material: Material, suggestedQty: number) => void;
  onSyncAndSave: (newData: any) => void;
}

export function AprovisionamentoPrevisaoTab({
  previsaoDiasOptions,
  setPrevisaoDiasOptions,
  newPrevisaoDiaStr,
  setNewPrevisaoDiaStr,
  mostrarTodosPrevisao,
  setMostrarTodosPrevisao,
  categoriasAbas,
  filtroCategoriaPrevisao,
  setFiltroCategoriaPrevisao,
  materiais,
  calculoPrevisao,
  datasEstoque,
  latestEstoqueDate,
  listasDeCompras,
  onPromptAddToListaCompras,
  onSyncAndSave,
}: AprovisionamentoPrevisaoTabProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Ordens de Compra & Previsão</h2>
        <p className="text-xs font-semibold text-slate-500 mb-4">
          Subtração lógica do Estoque atual contra a necessidade extraída dos próximos dias no Cardápio. A matemática desconta o que já foi utilizado, começando as projeções a partir do dia seguinte ao estoque lançado.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest mr-2">Configuração de Prazos (Max 4):</div>
            {previsaoDiasOptions.map(opt => (
              <div key={opt} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-2 shadow-sm">
                {opt} Dias
                <button 
                  onClick={() => {
                    const n = previsaoDiasOptions.filter(o => o !== opt);
                    setPrevisaoDiasOptions(n);
                    onSyncAndSave({ previsaoDiasOptions: n });
                  }} 
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {previsaoDiasOptions.length < 4 && (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const val = parseInt(newPrevisaoDiaStr);
                  if (!isNaN(val) && val > 0 && !previsaoDiasOptions.includes(val)) {
                    const n = [...previsaoDiasOptions, val].sort((a,b) => a-b);
                    setPrevisaoDiasOptions(n);
                    onSyncAndSave({ previsaoDiasOptions: n });
                    setNewPrevisaoDiaStr('');
                  }
                }} 
                className="flex items-center gap-2"
              >
                <input 
                  type="number" 
                  min="1" 
                  max="180" 
                  className="w-20 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:ring-amber-500 focus:border-amber-500 outline-none text-slate-700 shadow-sm" 
                  placeholder="Ex: 14" 
                  value={newPrevisaoDiaStr} 
                  onChange={e => setNewPrevisaoDiaStr(e.target.value)} 
                />
                <button type="submit" className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors uppercase tracking-widest shadow-sm">Adicionar</button>
              </form>
            )}
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              <input 
                type="checkbox" 
                checked={mostrarTodosPrevisao} 
                onChange={e => setMostrarTodosPrevisao(e.target.checked)}
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Exibir todos os itens cadastrados</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap rounded-xl bg-slate-100 p-1 mb-6 items-center gap-1">
        {categoriasAbas.map(cat => (
          <button
            key={cat}
            onClick={() => setFiltroCategoriaPrevisao(cat)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors",
              filtroCategoriaPrevisao === cat ? `bg-indigo-600 text-white shadow-sm` : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {[filtroCategoriaPrevisao].map(cat => {
        const catItems = [...materiais]
          .filter(m => m.categoria === cat)
          .filter(m => mostrarTodosPrevisao || calculoPrevisao[m.id]?.total > 0 || m.estoque < 5 || m.favorito)
          .sort((a, b) => {
            if (a.favorito && !b.favorito) return -1;
            if (!a.favorito && b.favorito) return 1;
            return (a.nome || '').localeCompare(b.nome || '');
          });

        if (catItems.length === 0) return null;

        return (
          <div key={cat} className="mb-6">
            <h3 className="font-black text-slate-700 uppercase tracking-widest text-xs mb-3 flex items-center gap-2">
              {cat}
              <span className="bg-slate-200 text-slate-500 text-[10px] px-2 py-0.5 rounded-full">{catItems.length}</span>
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-800 uppercase text-[10px] tracking-wider text-white">
                    <th className="py-3 px-4 font-black">Material</th>
                    <th className="py-3 px-4 font-black text-center">Unidade</th>
                    <th className="py-3 px-4 font-black text-right leading-tight">
                      Estoque Atual
                      {datasEstoque.length > 0 && <div className="text-[9px] text-slate-300 font-medium tracking-normal mt-0.5">({datasEstoque[datasEstoque.length - 1]})</div>}
                    </th>
                    {previsaoDiasOptions.map(opt => {
                      const date = new Date(latestEstoqueDate);
                      date.setDate(date.getDate() + opt);
                      const optDateStr = date.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
                      return (
                        <th key={opt} className="py-3 px-4 font-black text-right border-l border-slate-700 bg-slate-700/50 leading-tight">
                          Prev. {opt} Dias
                          <div className="text-[9px] text-slate-300 font-medium tracking-normal mt-0.5">({optDateStr})</div>
                        </th>
                      )
                    })}
                    <th className="py-3 px-4 font-black text-right border-l border-slate-700 bg-indigo-900/40 text-indigo-200 leading-tight">
                      Prev. Hoje
                      <div className="text-[9px] text-indigo-300 font-medium tracking-normal mt-0.5">
                         ({Math.round((new Date().getTime() - latestEstoqueDate.getTime()) / (1000 * 60 * 60 * 24))} Dias) - {new Date().toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}
                      </div>
                    </th>
                    <th className="py-3 px-4 font-black text-right border-l border-slate-700 bg-slate-700/10">Total Planejado</th>
                    <th className="py-3 px-4 font-black text-right bg-amber-600/20 text-amber-200">Saldo/Déficit</th>
                    <th className="py-3 px-4 font-black text-center border-l border-slate-700 bg-slate-700/50">Ações</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-semibold text-slate-700 divide-y divide-slate-100">
                  {catItems.map(m => {
                    const needs = calculoPrevisao[m.id] || { inDays: {}, hoje: 0, total: 0 };
                    const saldo = m.estoque - needs.total;
                    const isDeficit = saldo < 0;

                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-slate-800">
                          <div className="flex items-center gap-2">
                            {isDeficit && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                            {m.nome}
                            {m.favorito && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded uppercase font-bold tracking-widest">Fav</span>}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-500 text-xs font-bold">{m.undMedida}</span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-black text-slate-600">
                          {m.estoque.toFixed(2)}
                        </td>
                        {previsaoDiasOptions.map(opt => {
                           const val = needs.inDays?.[opt] || 0;
                           return (
                             <td key={opt} className="py-2.5 px-4 text-right bg-slate-50 font-mono font-semibold text-slate-500 border-l border-slate-100">
                               {val > 0 ? val.toFixed(2) : '-'}
                             </td>
                           );
                        })}
                        <td className="py-2.5 px-4 text-right bg-indigo-50/50 font-mono font-semibold text-indigo-900 border-l border-indigo-100/50">
                          {needs.hoje > 0 ? needs.hoje.toFixed(2) : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right bg-slate-50 font-mono font-bold text-slate-800 border-l border-slate-100">
                          {needs.total > 0 ? needs.total.toFixed(2) : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-black border-l border-slate-100">
                           <span className={cn(
                             "px-2.5 py-1 rounded-lg flex items-center justify-end gap-1.5 ml-auto w-max",
                             isDeficit ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                           )}>
                             {isDeficit ? <TrendingDown className="w-3.5 h-3.5" /> : null}
                             {Math.abs(saldo).toFixed(2)} {m.undMedida} {isDeficit && 'em falta'}
                           </span>
                        </td>
                        <td className="py-2.5 px-4 text-center border-l border-slate-100">
                           <button 
                             onClick={() => onPromptAddToListaCompras(m, isDeficit ? Math.abs(saldo) : 1)}
                             disabled={listasDeCompras.some(l => !l.arquivada && l.itens.some(lc => lc.materialId === m.id))}
                             className={cn(
                               "p-2 rounded-lg transition-colors inline-flex mb-0",
                               listasDeCompras.some(l => !l.arquivada && l.itens.some(lc => lc.materialId === m.id)) 
                                 ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                                 : "bg-amber-100 text-amber-600 hover:bg-amber-200"
                             )}
                             title={listasDeCompras.some(l => !l.arquivada && l.itens.some(lc => lc.materialId === m.id)) ? 'Já na Listas Ativas' : 'Adicionar à Lista'}
                           >
                             <ShoppingBag className="w-4 h-4" />
                           </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      {materiais.filter(m => mostrarTodosPrevisao || calculoPrevisao[m.id]?.total > 0 || m.estoque < 5 || m.favorito).length === 0 && (
        <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 font-bold uppercase text-xs">
          Nenhum consumo previsto ou item em falta detectado.
        </div>
      )}
    </motion.div>
  );
}
