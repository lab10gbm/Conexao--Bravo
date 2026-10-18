import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ShoppingBag, Calendar, Store, MapPin, ChevronUp, ChevronDown, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { ListaDeCompras } from '../types';

interface AprovisionamentoListaComprasTabProps {
  listasDeCompras: ListaDeCompras[];
  onOpenNovaListaModal: () => void;
  expandedListaId: string | null;
  setExpandedListaId: React.Dispatch<React.SetStateAction<string | null>>;
  onArchiveLista: (listaId: string) => void;
  onManualAddToLista: (listaId: string) => void;
  onToggleConcluido: (listaId: string, itemId: string) => void;
  onRemoveItem: (listaId: string, itemId: string) => void;
  onChangeQuantidade: (listaId: string, itemId: string, qty: number) => void;
  onChangeValorPago: (listaId: string, itemId: string, val: number) => void;
  showArquivadas: boolean;
  setShowArquivadas: (b: boolean) => void;
}

export function AprovisionamentoListaComprasTab({
  listasDeCompras,
  onOpenNovaListaModal,
  expandedListaId,
  setExpandedListaId,
  onArchiveLista,
  onManualAddToLista,
  onToggleConcluido,
  onRemoveItem,
  onChangeQuantidade,
  onChangeValorPago,
  showArquivadas,
  setShowArquivadas,
}: AprovisionamentoListaComprasTabProps) {
  const renderLista = (lista: ListaDeCompras) => {
    const isExpanded = expandedListaId === lista.id;
    const totalValue = lista.itens.reduce((acc, item) => acc + (item.valorPago || 0), 0);
    const completedCount = lista.itens.filter(i => i.concluido).length;
    
    return (
      <div 
        key={lista.id} 
        className={cn(
          "bg-white border transition-all overflow-hidden relative", 
          isExpanded ? "border-indigo-200 shadow-md rounded-2xl" : "border-slate-200 hover:border-slate-300 rounded-2xl", 
          lista.arquivada && !isExpanded && "opacity-70 bg-slate-50"
        )}
      >
        {lista.arquivada && <div className="absolute top-0 left-0 w-1 h-full bg-slate-300"></div>}
        {!lista.arquivada && <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>}
        
        <div 
          onClick={() => setExpandedListaId(isExpanded ? null : lista.id)}
          className="p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-base font-black text-slate-800 tracking-tight uppercase leading-tight">{lista.nome}</h3>
              {lista.arquivada ? (
                <span className="text-[9px] px-2 py-0.5 bg-slate-200 text-slate-500 font-bold uppercase rounded tracking-widest">Arquivada</span>
              ) : (
                <span className="text-[9px] px-2 py-0.5 bg-emerald-100 text-emerald-700 font-bold uppercase rounded tracking-widest">Ativa</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400"/> {new Date(lista.dataCriacao).toLocaleDateString('pt-BR')}</span>
              {lista.estabelecimento && <span className="flex items-center gap-1.5"><Store className="w-3.5 h-3.5 text-slate-400"/> {lista.estabelecimento}</span>}
              {lista.local && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400"/> {lista.local}</span>}
            </div>
          </div>
          <div className="flex items-center gap-8 md:gap-12">
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Itens</div>
              <div className="text-sm font-black text-slate-700">{completedCount} <span className="text-slate-400 font-semibold">/ {lista.itens.length}</span></div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Salvo</div>
              <div className="text-lg font-black text-emerald-600">
                {totalValue > 0 ? `R$ ${totalValue.toFixed(2).replace('.', ',')}` : '-'}
              </div>
            </div>
            <div className="text-slate-400">
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-slate-100 bg-slate-50 border-dashed"
            >
              <div className="p-5">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Itens da Lista</h4>
                  {!lista.arquivada && (
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          onArchiveLista(lista.id);
                        }} 
                        className="px-3 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg text-[10px] font-bold uppercase transition-colors tracking-widest"
                      >
                        Arquivar Lista
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          onManualAddToLista(lista.id); 
                        }} 
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg text-[10px] font-bold uppercase transition-colors tracking-widest"
                      >
                        <Plus className="w-3.5 h-3.5" /> Incluir Item
                      </button>
                    </div>
                  )}
                </div>

                {lista.itens.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">Sem itens nesta lista ainda.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {lista.itens.map(item => (
                      <div 
                        key={item.id} 
                        className={cn(
                          "p-4 rounded-xl border transition-all", 
                          item.concluido ? "bg-white/40 border-slate-200 opacity-70 grayscale-[0.5]" : "bg-white border-slate-200 shadow-sm hover:border-indigo-300"
                        )}
                      >
                        <div className="flex justify-between items-start mb-3 gap-3">
                          <div className="flex items-start gap-3">
                            <button 
                              onClick={() => onToggleConcluido(lista.id, item.id)} 
                              className={cn(
                                "w-6 h-6 rounded flex items-center justify-center border mt-0.5 transition-colors cursor-pointer shrink-0", 
                                item.concluido ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 bg-slate-50 hover:border-emerald-500"
                              )}
                            >
                              {item.concluido && <div className="w-2.5 h-2.5 bg-white rounded-[2px]" />}
                            </button>
                            <div>
                              <div className={cn("text-xs font-bold text-slate-800 leading-tight", item.concluido && "line-through text-slate-500")}>
                                {item.nome}
                              </div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {item.categoria}
                              </div>
                            </div>
                          </div>
                          {!lista.arquivada && (
                            <button 
                              onClick={() => onRemoveItem(lista.id, item.id)} 
                              className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2 border-t border-slate-100/50 pt-3 mt-3">
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] font-bold text-slate-500 tracking-wider">QUANTIDADE:</div>
                            <div className="flex items-center gap-1.5">
                              <input 
                                type="number"
                                min="0"
                                step="any"
                                disabled={lista.arquivada}
                                value={item.quantidade}
                                onChange={e => onChangeQuantidade(lista.id, item.id, parseFloat(e.target.value) || 0)}
                                className={cn("w-20 text-right rounded-lg text-sm font-black py-1 px-2 outline-none focus:ring-2 disabled:bg-transparent", lista.arquivada ? "bg-transparent text-slate-500 border-none" : "bg-slate-50 border border-slate-200 text-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20")}
                              />
                              <span className="text-[10px] font-bold text-slate-400 w-6">{item.undMedida}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] font-bold text-slate-500 tracking-wider">VALOR (R$):</div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-400">R$</span>
                              <input 
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0,00"
                                disabled={lista.arquivada}
                                value={item.valorPago || ''}
                                onChange={e => onChangeValorPago(lista.id, item.id, parseFloat(e.target.value) || 0)}
                                className={cn("w-24 text-right rounded-lg text-sm font-black py-1 px-2 outline-none focus:ring-2 disabled:bg-transparent placeholder:text-slate-300", lista.arquivada ? "bg-transparent text-slate-500 border-none px-0" : "bg-emerald-50/50 border border-emerald-200/50 text-emerald-700 focus:border-emerald-500 focus:ring-emerald-500/20")}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const listasAtivas = listasDeCompras.filter(l => !l.arquivada);
  const listasArquivadas = listasDeCompras.filter(l => l.arquivada);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Listas de Compras</h2>
            <p className="text-xs font-semibold text-slate-500">
              Gerencie suas listas de compras para os diferentes estabelecimentos.
            </p>
          </div>
          <button 
            onClick={onOpenNovaListaModal} 
            className="px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold uppercase transition-all tracking-widest shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Criar Nova Lista
          </button>
        </div>
      </div>

      {listasDeCompras.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border border-slate-200 border-dashed">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 mb-4 text-slate-300">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Nenhuma lista encontrada</p>
          <p className="text-xs font-semibold text-slate-400">Crie sua primeira lista para organizar as compras.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {listasAtivas.length > 0 ? (
            <div className="space-y-4">
              {listasAtivas.map(renderLista)}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest bg-white border border-dashed rounded-3xl">Nenhuma lista ativa.</div>
          )}
          
          {listasArquivadas.length > 0 && (
            <div className="pt-8">
              <button 
                onClick={() => setShowArquivadas(!showArquivadas)}
                className="w-full flex items-center justify-between gap-4 mb-2 p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Listas Arquivadas ({listasArquivadas.length})</h3>
                </div>
                {showArquivadas ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </button>
              
              <AnimatePresence>
                {showArquivadas && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-4 opacity-80 pt-4">
                      {listasArquivadas.map(renderLista)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
