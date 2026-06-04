import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { useRefeitorioData } from '../hooks/useRefeitorioData';
import { Loader2, BookOpen, Plus, Trash2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { cleanUndefined } from "../lib/utils";

interface AprovisionamentoCatalogoProps {
  user: UserProfile;
  materiais: { id: string; nome: string }[];
}

export type MetodologiaGasto = 'por_dia' | 'por_prato';

export interface GastoIngrediente {
  id: string;
  nome: string;
  metodologia: MetodologiaGasto;
  quantidadeSemana: number;
  quantidadeFDS: number;
}

export function AprovisionamentoCatalogo({ user, materiais }: AprovisionamentoCatalogoProps) {
  const { catalog, loading } = useRefeitorioData();
  const [gastos, setGastos] = useState<Record<string, GastoIngrediente[]>>(() => {
    try {
      const cached = localStorage.getItem('aprovisionamento_gastos_cache');
      if (cached) return JSON.parse(cached);
    } catch(e) {}
    return {};
  });
  const [loadingGastos, setLoadingGastos] = useState(true);

  useEffect(() => {
    const fetchGastos = async () => {
      try {
        const docRef = doc(db, 'aprovisionamento', 'gastos_catalogo');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const fetchedGastos = snap.data().gastos || {};
          setGastos(fetchedGastos);
          localStorage.setItem('aprovisionamento_gastos_cache', JSON.stringify(fetchedGastos));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingGastos(false);
      }
    };
    fetchGastos();
  }, []);

  const saveGastos = async (newGastos: any) => {
    setGastos(newGastos);
    localStorage.setItem('aprovisionamento_gastos_cache', JSON.stringify(newGastos));
    try {
      await setDoc(doc(db, 'aprovisionamento', 'gastos_catalogo'), cleanUndefined({ gastos: newGastos }), { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddIngrediente = (itemName: string) => {
    const currentGastos = gastos[itemName] || [];
    const newGasto: GastoIngrediente = {
      id: Math.random().toString(36).substr(2, 9),
      nome: '',
      metodologia: 'por_dia',
      quantidadeSemana: 0,
      quantidadeFDS: 0,
    };
    saveGastos({
      ...gastos,
      [itemName]: [...currentGastos, newGasto]
    });
  };

  const handleUpdateIngrediente = (itemName: string, id: string, field: keyof GastoIngrediente, value: any) => {
    const currentGastos = gastos[itemName] || [];
    const updatedGastos = currentGastos.map(g => g.id === id ? { ...g, [field]: value } : g);
    saveGastos({
      ...gastos,
      [itemName]: updatedGastos
    });
  };

  const handleRemoveIngrediente = (itemName: string, id: string) => {
    const currentGastos = gastos[itemName] || [];
    const updatedGastos = currentGastos.filter(g => g.id !== id);
    saveGastos({
      ...gastos,
      [itemName]: updatedGastos
    });
  };

  if (loading || loadingGastos) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-white rounded-3xl border border-slate-200">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="font-bold uppercase tracking-widest text-xs">Carregando catálogo...</p>
      </div>
    );
  }

  const renderItemGastos = (itemName: string) => {
    const itemGastos = gastos[itemName] || [];
    return (
      <div className="flex flex-col gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm transition-all focus-within:border-amber-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="font-black text-slate-800 text-sm flex-1 uppercase tracking-tight">{itemName}</div>
          <button 
            onClick={() => handleAddIngrediente(itemName)}
            className="text-[10px] w-full sm:w-auto justify-center font-black uppercase tracking-widest bg-amber-50 hover:bg-amber-100 text-amber-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Vincular Ingrediente
          </button>
        </div>
        
        {itemGastos.length > 0 ? (
          <div className="space-y-3 mt-2">
            {itemGastos.map(gasto => (
              <div key={gasto.id} className="flex flex-col lg:flex-row lg:items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <select 
                  value={gasto.nome}
                  onChange={e => handleUpdateIngrediente(itemName, gasto.id, 'nome', e.target.value)}
                  className="flex-1 w-full bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-lg px-3 py-2.5 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                >
                  <option value="" disabled>Selecione um ingrediente...</option>
                  {materiais.map(mat => (
                    <option key={mat.id} value={mat.nome}>{mat.nome}</option>
                  ))}
                </select>
                <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-2 lg:shrink-0 w-full xl:w-auto">
                  <select 
                    value={gasto.metodologia}
                    onChange={e => handleUpdateIngrediente(itemName, gasto.id, 'metodologia', e.target.value)}
                    className="w-full sm:w-auto flex-1 bg-white border border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider rounded-lg px-3 py-2.5 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  >
                    <option value="por_dia">Kg / Dia</option>
                    <option value="por_prato">Kg / Prato</option>
                  </select>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto flex-1">
                    <div className="flex items-center gap-2 flex-1 bg-white sm:bg-transparent rounded-lg border sm:border-0 border-slate-200 pr-1 pl-3 sm:p-0">
                      <span className="text-[9px] font-black text-slate-400 whitespace-nowrap sm:w-14 sm:text-right tracking-widest uppercase">Semana</span>
                      <input 
                        type="number" 
                        value={gasto.quantidadeSemana || ''}
                        onChange={e => handleUpdateIngrediente(itemName, gasto.id, 'quantidadeSemana', parseFloat(e.target.value) || 0)}
                        placeholder="0.0"
                        className="w-full min-w-0 sm:w-20 bg-white border-0 sm:border sm:border-slate-200 text-slate-800 font-black text-right text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent rounded"
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-1 bg-white sm:bg-transparent rounded-lg border sm:border-0 border-slate-200 pr-1 pl-3 sm:p-0">
                      <span className="text-[9px] font-black text-slate-400 whitespace-nowrap sm:w-14 sm:text-right tracking-widest uppercase">FDS/Fer</span>
                      <input 
                        type="number" 
                        value={gasto.quantidadeFDS || ''}
                        onChange={e => handleUpdateIngrediente(itemName, gasto.id, 'quantidadeFDS', parseFloat(e.target.value) || 0)}
                        placeholder="0.0"
                        className="w-full min-w-0 sm:w-20 bg-white border-0 sm:border sm:border-slate-200 text-slate-800 font-black text-right text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent rounded"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemoveIngrediente(itemName, gasto.id)}
                    className="w-full sm:w-auto py-2.5 px-3 sm:p-2.5 text-slate-400 hover:text-red-500 bg-white sm:bg-transparent hover:bg-red-50 rounded-lg transition-colors border border-slate-200 sm:border-transparent hover:border-red-100 flex items-center justify-center shrink-0 mt-2 xl:mt-0"
                    title="Remover Ingrediente"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="sm:hidden ml-2 text-xs font-bold uppercase tracking-widest text-red-500">Remover Ingrediente</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs font-semibold text-slate-400 italic">
            Nenhum ingrediente vinculado a este item.
          </div>
        )}
      </div>
    );
  };

  const renderCategory = (title: string, items: any[]) => {
    const safeItems = items || [];
    return (
      <div className="bg-slate-50/50 border border-slate-200 rounded-3xl p-6 mb-8 shadow-sm">
        <h3 className="font-black text-slate-800 uppercase tracking-widest mb-6 text-sm flex items-center gap-2">
          {title}
          <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full">{safeItems.length}</span>
        </h3>
        <div className="space-y-4">
          {safeItems.length === 0 ? (
            <div className="text-xs font-semibold text-slate-400 italic">Nenhum item cadastrado nesta seção.</div>
          ) : (
            safeItems.map((item, idx) => {
              if (typeof item === 'string') {
                return <React.Fragment key={idx}>{renderItemGastos(item)}</React.Fragment>;
              } else if (item.isCategory) {
                return (
                  <div key={idx} className="mb-8 last:mb-0 bg-white/50 p-5 rounded-2xl border border-slate-100">
                    <h4 className="font-black text-slate-600 uppercase tracking-widest mb-4 text-xs">{item.name}</h4>
                    <div className="space-y-4">
                      {item.items.length === 0 ? (
                        <div className="text-xs font-semibold text-slate-400 italic">Nenhum item nesta categoria.</div>
                      ) : (
                        item.items.map((subItem: string, subIdx: number) => (
                          <React.Fragment key={subIdx}>{renderItemGastos(subItem)}</React.Fragment>
                        ))
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm min-h-[500px]">
      <div className="mb-8 flex flex-col gap-3">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-amber-500" />
          Catálogo & Composição de Pratos
        </h2>
        <p className="text-sm font-semibold text-slate-500 max-w-2xl leading-relaxed">
          Vincule um ou mais ingredientes do estoque físico aos itens do cardápio. Para cada ingrediente, defina a metodologia de uso (kilos por dia ou kilos por prato) para a correta previsão de compras.
        </p>
      </div>

      {catalog && (
        <div className="max-w-4xl mt-8">
          
          {/* Gastos Diários / Simulação */}
          <div className="bg-slate-50/50 border-2 border-amber-200/50 rounded-3xl p-6 mb-8 shadow-sm">
            <h3 className="font-black text-amber-800 uppercase tracking-widest mb-6 text-sm flex items-center gap-2">
              Gastos Diários / Simulação
            </h3>
            <p className="text-xs font-semibold text-slate-500 mb-6 leading-relaxed">
              Adicione nesta seção os itens de consumo fixo diário que não dependem necessariamente do cardápio variável.
            </p>
            <div className="space-y-4">
              {renderItemGastos("Itens Alimentação")}
              {renderItemGastos("Itens Não Alimentares")}
            </div>
          </div>

          {renderCategory("Proteínas", catalog.proteinas)}
          {renderCategory("Acompanhamentos", catalog.acompanhamentos)}
          {renderCategory("Saladas", catalog.saladas)}
          {renderCategory("Sobremesas", catalog.sobremesas)}
          {renderCategory("Ceia", catalog.ceia)}
        </div>
      )}
    </div>
  );
}
