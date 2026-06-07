import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { useRefeitorioData } from '../hooks/useRefeitorioData';
import { Loader2, BookOpen, Plus, Trash2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { cleanUndefined, cn } from "../lib/utils";

interface AprovisionamentoCatalogoProps {
  user: UserProfile;
  materiais: any[];
  paxDefaults: { cafe: number, almoco: number, jantar: number };
  onUpdatePaxDefaults: (newPaxDefaults: { cafe: number, almoco: number, jantar: number }) => void;
}

export type MetodologiaGasto = 'por_dia' | 'por_prato';

export interface GastoIngrediente {
  id: string;
  nome: string;
  metodologia: MetodologiaGasto;
  quantidadeSemana: number;
  quantidadeFDS: number;
  quantidadeEvento?: number;
  paxSimulacao?: number;
  paxSimulacaoSemana?: number;
  paxSimulacaoFDS?: number;
  paxSimulacaoEvento?: number;
  separarPax?: boolean;
}

function AutocompleteSelect({ value, onChange, options, placeholder }: { value: string, onChange: (v: string) => void, options: string[], placeholder?: string }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState(value);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  // De-duplicate options to avoid unique key errors and confusing UI
  const uniqueOptions = React.useMemo(() => Array.from(new Set(options)).sort(), [options]);

  React.useEffect(() => {
    setSearch(value);
  }, [value]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
        // On blur, if search exactly matches an option, use it. Otherwise revert to original value.
        const match = uniqueOptions.find(o => o.trim().toLowerCase() === search.trim().toLowerCase());
        if (match) {
          onChange(match);
          setSearch(match);
        } else {
          if (search.trim() === '') {
            setSearch(value);
          }
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, search, uniqueOptions, onChange]);

  const filtered = uniqueOptions.filter(opt => 
    opt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .includes(search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
  );

  return (
    <div ref={wrapperRef} className="relative flex-1 w-full min-w-[200px]">
      <input
        type="text"
        value={search}
        onChange={e => {
          const val = e.target.value;
          setSearch(val);
          setOpen(true);
          const match = uniqueOptions.find(o => o.trim().toLowerCase() === val.trim().toLowerCase());
          if (match) onChange(match);
        }}
        onFocus={() => {
          setOpen(true);
          // If input is empty when focusing, show all options.
          // Otherwise, the current search might be filtering them out if it doesn't match perfectly.
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder={placeholder}
        className="w-full bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-lg px-3 py-2.5 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
      />
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
             <div className="px-3 py-2 text-xs text-slate-400 font-semibold italic">Nenhum ingrediente encontrado</div>
          ) : (
            filtered.map((opt, idx) => (
              <div 
                key={`${opt}-${idx}`}
                onClick={() => {
                  onChange(opt);
                  setSearch(opt);
                  setOpen(false);
                }}
                className="px-3 py-4 sm:py-2 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 cursor-pointer border-b border-slate-50 last:border-0"
              >
                {opt}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function AprovisionamentoCatalogo({ user, materiais, paxDefaults, onUpdatePaxDefaults }: AprovisionamentoCatalogoProps) {
  const { catalog, loading, saveCatalog } = useRefeitorioData();
  const [gastos, setGastos] = useState<Record<string, GastoIngrediente[]>>(() => {
    try {
      const cached = localStorage.getItem('aprovisionamento_gastos_cache');
      if (cached) return JSON.parse(cached);
    } catch(e) {}
    return {};
  });
  const [loadingGastos, setLoadingGastos] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpand = (itemName: string) => {
    setExpandedItems(prev => ({ ...prev, [itemName]: !prev[itemName] }));
  };

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
      quantidadeEvento: 0,
      separarPax: false,
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

  const handleAddPrato = async (categoryKey: string, subCategoryName?: string) => {
    const pratoName = window.prompt("Digite o nome do novo prato:");
    if (!pratoName || pratoName.trim() === '') return;
    const name = pratoName.trim().toUpperCase();

    const newCatalog = { ...catalog };
    if (!newCatalog[categoryKey]) newCatalog[categoryKey] = [];

    if (subCategoryName) {
      newCatalog[categoryKey] = newCatalog[categoryKey].map((item: any) => {
        if (item.isCategory && item.name === subCategoryName) {
          return { ...item, items: [...item.items, name] };
        }
        return item;
      });
    } else {
      newCatalog[categoryKey].push(name);
    }
    
    // optimistically update view? well it might just rerender due to useRefeitorioData hook?
    // the saveCatalog actually updates state internally. We just call it.
    await saveCatalog(newCatalog);
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
    const isExpanded = expandedItems[itemName];
    const itemGastos = gastos[itemName] || [];

    return (
      <div className={cn(
      "flex flex-col bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm",
      isExpanded ? "border-amber-300 ring-1 ring-amber-100" : "border-slate-200 hover:border-slate-300"
    )}>
      {/* Header / Clickable Area to Expand */}
      <div 
        onClick={() => toggleExpand(itemName)}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg transition-colors",
            isExpanded ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
          )}>
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
          <div>
            <div className="font-black text-slate-800 text-sm uppercase tracking-wider">{itemName}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 mt-0.5">
              {itemGastos.length === 0 ? (
                <span className="text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Sem ingredientes
                </span>
              ) : (
                <span>{itemGastos.length} {itemGastos.length === 1 ? 'Ingrediente vinculado' : 'Ingredientes vinculados'}</span>
              )}
            </div>
          </div>
        </div>
        
        {!isExpanded && itemGastos.length > 0 && (
          <div className="flex -space-x-2 overflow-hidden px-2">
             {itemGastos.slice(0, 3).map((g, i) => (
               <div key={i} className="w-6 h-6 rounded-full bg-amber-50 border-2 border-white flex items-center justify-center text-[8px] font-black text-amber-700 uppercase">
                  {g.nome ? g.nome.substring(0, 2) : '?'}
               </div>
             ))}
             {itemGastos.length > 3 && (
               <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-500">
                  +{itemGastos.length - 3}
               </div>
             )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="p-5 pt-0 border-t border-slate-100 flex flex-col gap-4 mt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/30 p-2 rounded-xl mb-1 border border-amber-100/30">
                <div className="text-[10px] font-black text-amber-700 uppercase tracking-widest px-2">Gerenciar Composição de {itemName}</div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddIngrediente(itemName);
                  }}
                  className="text-[10px] w-full sm:w-auto justify-center font-black uppercase tracking-widest bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Vincular Ingrediente
                </button>
              </div>
              
              {itemGastos.length > 0 ? (
                <div className="space-y-4">
                  {itemGastos.map(gasto => (
                    <div key={gasto.id} className="flex flex-col gap-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100 shadow-sm relative pt-8 sm:pt-4">
                        <div className="sm:hidden absolute top-3 left-4">
                          <span className="text-[10px] font-black uppercase text-slate-400">Ingrediente</span>
                        </div>
                        <button 
                          onClick={() => handleRemoveIngrediente(itemName, gasto.id)}
                          className="absolute top-2 right-2 sm:top-4 sm:right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 shrink-0"
                          title="Remover Ingrediente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      <div className="flex w-full pr-10 items-center gap-3">
                        <AutocompleteSelect
                          value={gasto.nome}
                          onChange={val => handleUpdateIngrediente(itemName, gasto.id, 'nome', val)}
                          options={materiais.map(m => m.nome)}
                          placeholder="Selecione um ingrediente..."
                        />
                        <select 
                          value={gasto.metodologia}
                          onChange={e => handleUpdateIngrediente(itemName, gasto.id, 'metodologia', e.target.value)}
                          className="w-28 bg-white border border-slate-200 text-slate-600 font-bold uppercase text-[9px] tracking-wider rounded-lg px-2 py-2 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 shrink-0"
                        >
                          {(() => {
                            const material = materiais.find(m => m.nome === gasto.nome);
                            const und = material?.undMedida || 'KG';
                            return (
                              <>
                                <option value="por_dia">{und} / Dia</option>
                                <option value="por_prato">{und} / Prato</option>
                              </>
                            );
                          })()}
                        </select>
                      </div>
                      <div className="flex flex-col w-full mt-1 bg-white p-3 rounded-xl border border-slate-200 gap-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Configuração Diária</span>
                          <div className="flex items-center gap-1.5">
                             <input type="checkbox" id={`separarPax-${gasto.id}`} checked={!!gasto.separarPax} onChange={e => handleUpdateIngrediente(itemName, gasto.id, 'separarPax', e.target.checked)} className="w-3.5 h-3.5 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer" />
                             <label htmlFor={`separarPax-${gasto.id}`} className="text-[9px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer">Simulação: Separar PAX</label>
                          </div>
                        </div>

                        {/* SEMANA */}
                        <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4 p-2 bg-slate-50/50 rounded-lg">
                          <div className="flex items-center gap-2 flex-1 relative">
                            <span className="text-[9px] font-black text-slate-400 whitespace-nowrap w-[72px] uppercase">DIA/SEMANA</span>
                            <input 
                              type="number" 
                              value={gasto.quantidadeSemana || ''}
                              onChange={e => handleUpdateIngrediente(itemName, gasto.id, 'quantidadeSemana', parseFloat(e.target.value) || 0)}
                              placeholder="0.0"
                              className="w-24 bg-white border border-slate-200 text-slate-800 font-black text-right text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent rounded"
                            />
                          </div>
                          {gasto.separarPax ? (
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-[9px] font-black text-amber-700 whitespace-nowrap w-[40px] xl:w-auto uppercase">PAX</span>
                              <input 
                                type="number" 
                                value={gasto.paxSimulacaoSemana || ''}
                                onChange={e => handleUpdateIngrediente(itemName, gasto.id, 'paxSimulacaoSemana', parseInt(e.target.value) || null)}
                                placeholder={(paxDefaults?.almoco || 60).toString()}
                                className="w-20 bg-white border border-amber-200 text-amber-800 font-black text-right text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent rounded placeholder:text-amber-300"
                              />
                              <div className="text-[9px] font-black text-indigo-700 uppercase px-2">
                                 {(() => {
                                    const currentPax = gasto.paxSimulacaoSemana || gasto.paxSimulacao || paxDefaults?.almoco || 60;
                                    const und = materiais.find(m => m.nome === gasto.nome)?.undMedida || 'KG';
                                    return gasto.metodologia === 'por_prato' 
                                       ? `= ${Number((currentPax * (gasto.quantidadeSemana || 0)).toFixed(3))} ${und}`
                                       : `= ${Number(((gasto.quantidadeSemana || 0) / currentPax).toFixed(4))} ${und}/pax`;
                                 })()}
                              </div>
                            </div>
                          ) : null}
                        </div>

                        {/* FDS */}
                        <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4 p-2 bg-slate-50/50 rounded-lg">
                          <div className="flex items-center gap-2 flex-1 relative">
                            <span className="text-[9px] font-black text-slate-400 whitespace-nowrap w-[72px] uppercase">DIA FDS/FER</span>
                            <input 
                              type="number" 
                              value={gasto.quantidadeFDS || ''}
                              onChange={e => handleUpdateIngrediente(itemName, gasto.id, 'quantidadeFDS', parseFloat(e.target.value) || 0)}
                              placeholder="0.0"
                              className="w-24 bg-white border border-slate-200 text-slate-800 font-black text-right text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent rounded"
                            />
                          </div>
                          {gasto.separarPax ? (
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-[9px] font-black text-amber-700 whitespace-nowrap w-[40px] xl:w-auto uppercase">PAX</span>
                              <input 
                                type="number" 
                                value={gasto.paxSimulacaoFDS || ''}
                                onChange={e => handleUpdateIngrediente(itemName, gasto.id, 'paxSimulacaoFDS', parseInt(e.target.value) || null)}
                                placeholder={(paxDefaults?.almoco || 60).toString()}
                                className="w-20 bg-white border border-amber-200 text-amber-800 font-black text-right text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent rounded placeholder:text-amber-300"
                              />
                              <div className="text-[9px] font-black text-indigo-700 uppercase px-2">
                                 {(() => {
                                    const currentPax = gasto.paxSimulacaoFDS || gasto.paxSimulacao || paxDefaults?.almoco || 60;
                                    const und = materiais.find(m => m.nome === gasto.nome)?.undMedida || 'KG';
                                    return gasto.metodologia === 'por_prato' 
                                       ? `= ${Number((currentPax * (gasto.quantidadeFDS || 0)).toFixed(3))} ${und}`
                                       : `= ${Number(((gasto.quantidadeFDS || 0) / currentPax).toFixed(4))} ${und}/pax`;
                                 })()}
                              </div>
                            </div>
                          ) : null}
                        </div>

                        {/* EVENTO */}
                        <div className="flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-4 p-2 bg-slate-50/50 rounded-lg">
                          <div className="flex items-center gap-2 flex-1 relative">
                            <span className="text-[9px] font-black text-slate-400 whitespace-nowrap w-[72px] uppercase">DIA EVENTO</span>
                            <input 
                              type="number" 
                              value={gasto.quantidadeEvento || ''}
                              onChange={e => handleUpdateIngrediente(itemName, gasto.id, 'quantidadeEvento', parseFloat(e.target.value) || 0)}
                              placeholder="0.0"
                              className="w-24 bg-white border border-slate-200 text-slate-800 font-black text-right text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent rounded"
                            />
                          </div>
                          {gasto.separarPax ? (
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-[9px] font-black text-amber-700 whitespace-nowrap w-[40px] xl:w-auto uppercase">PAX</span>
                              <input 
                                type="number" 
                                value={gasto.paxSimulacaoEvento || ''}
                                onChange={e => handleUpdateIngrediente(itemName, gasto.id, 'paxSimulacaoEvento', parseInt(e.target.value) || null)}
                                placeholder={(paxDefaults?.almoco || 60).toString()}
                                className="w-20 bg-white border border-amber-200 text-amber-800 font-black text-right text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent rounded placeholder:text-amber-300"
                              />
                              <div className="text-[9px] font-black text-indigo-700 uppercase px-2">
                                 {(() => {
                                    const currentPax = gasto.paxSimulacaoEvento || gasto.paxSimulacao || paxDefaults?.almoco || 60;
                                    const und = materiais.find(m => m.nome === gasto.nome)?.undMedida || 'KG';
                                    return gasto.metodologia === 'por_prato' 
                                       ? `= ${Number((currentPax * (gasto.quantidadeEvento || 0)).toFixed(3))} ${und}`
                                       : `= ${Number(((gasto.quantidadeEvento || 0) / currentPax).toFixed(4))} ${und}/pax`;
                                 })()}
                              </div>
                            </div>
                          ) : null}
                        </div>

                        {!gasto.separarPax && (
                           <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-2 bg-amber-50/50 rounded-lg mt-1 border border-amber-100/50">
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                <span className="text-[9px] font-black text-amber-700 whitespace-nowrap uppercase w-[72px]">PAX ÚNICO</span>
                                <input 
                                  type="number" 
                                  value={gasto.paxSimulacao || ''}
                                  onChange={e => handleUpdateIngrediente(itemName, gasto.id, 'paxSimulacao', parseInt(e.target.value) || null)}
                                  placeholder={(paxDefaults?.almoco || 60).toString()}
                                  className="w-24 bg-white border border-amber-200 text-amber-800 font-black text-right text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent rounded placeholder:text-amber-300"
                                />
                              </div>
                              <div className="flex flex-col md:flex-row gap-2 md:gap-4 md:items-center text-[9px] font-black text-indigo-700 uppercase w-full sm:w-auto">
                                 {(() => {
                                    const currentPax = gasto.paxSimulacao || paxDefaults?.almoco || 60;
                                    const und = materiais.find(m => m.nome === gasto.nome)?.undMedida || 'KG';
                                    const isPrato = gasto.metodologia === 'por_prato';
                                    const calc = (q: number) => isPrato ? Number((currentPax * q).toFixed(3)) : Number((q / currentPax).toFixed(4));
                                    const lbl = isPrato ? und : `${und}/p`;
                                    return (
                                       <>
                                          <span>SEM: {calc(gasto.quantidadeSemana || 0)} {lbl}</span>
                                          <span className="hidden md:inline text-indigo-200">•</span>
                                          <span>FDS: {calc(gasto.quantidadeFDS || 0)} {lbl}</span>
                                          <span className="hidden md:inline text-indigo-200">•</span>
                                          <span>EVT: {calc(gasto.quantidadeEvento || 0)} {lbl}</span>
                                       </>
                                    );
                                 })()}
                              </div>
                           </div>
                        )}

                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs font-semibold text-slate-400 italic bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 text-center">
                  Nenhum ingrediente vinculado a este item.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

  const renderCategory = (title: string, dataKey: string, items: any[]) => {
    const safeItems = items || [];
    return (
      <div className="bg-slate-50/50 border border-slate-200 rounded-3xl p-6 mb-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2">
            {title}
            <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full">{safeItems.length}</span>
          </h3>
          {(!safeItems.length || typeof safeItems[0] === 'string') && (
            <button
              onClick={() => handleAddPrato(dataKey)}
              className="text-[10px] sm:w-auto font-black uppercase tracking-widest bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Prato
            </button>
          )}
        </div>

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
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-black text-slate-600 uppercase tracking-widest text-xs">{item.name}</h4>
                      <button
                        onClick={() => handleAddPrato(dataKey, item.name)}
                        className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Prato
                      </button>
                    </div>
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

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 flex flex-col md:flex-row gap-6 items-start md:items-center shadow-sm">
        <div className="flex-1">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-1">Panorama do Catálogo</h3>
          <div className="flex gap-4 mt-2">
            <div className="bg-white px-3 py-2 rounded-xl border border-slate-100 flex flex-col min-w-[100px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Pratos</span>
              <span className="text-lg font-black text-slate-800">
                {(() => {
                  let count = 0;
                  if (catalog) {
                    Object.values(catalog).forEach((items: any) => {
                      if (Array.isArray(items)) {
                        items.forEach(item => {
                          if (typeof item === 'string') count++;
                          else if (item.isCategory) count += item.items.length;
                        });
                      }
                    });
                  }
                  return count;
                })()}
              </span>
            </div>
            <div className="bg-white px-3 py-2 rounded-xl border border-slate-100 flex flex-col min-w-[100px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vinculados</span>
              <span className="text-lg font-black text-emerald-600">
                {(() => {
                  let count = 0;
                  Object.keys(gastos).forEach(key => {
                    if (gastos[key]?.length > 0 && key !== "Itens Alimentação" && key !== "Itens Não Alimentares") count++;
                  });
                  return count;
                })()}
              </span>
            </div>
            <div className="bg-white px-3 py-2 rounded-xl border border-slate-100 flex flex-col min-w-[100px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pendentes</span>
              <span className="text-lg font-black text-red-500">
                {(() => {
                  let total = 0;
                  let vinculados = 0;
                  if (catalog) {
                    Object.values(catalog).forEach((items: any) => {
                      if (Array.isArray(items)) {
                        items.forEach(item => {
                          if (typeof item === 'string') {
                            total++;
                            if (gastos[item]?.length > 0) vinculados++;
                          }
                          else if (item.isCategory) {
                            item.items.forEach((sub: string) => {
                               total++;
                               if (gastos[sub]?.length > 0) vinculados++;
                            });
                          }
                        });
                      }
                    });
                  }
                  return total - vinculados;
                })()}
              </span>
            </div>
          </div>
        </div>
        <div className="w-px h-12 bg-slate-200 hidden md:block"></div>
        <div className="flex-1">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-1">Efetivos Estimados Padrão</h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            (Utilizado na simulação quando não substituído)
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Café da Manhã</label>
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 w-32 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400">
              <input 
                type="number" 
                value={paxDefaults?.cafe || ''}
                onChange={e => onUpdatePaxDefaults({...paxDefaults, cafe: parseInt(e.target.value) || 0})}
                placeholder="0"
                className="w-full text-sm font-black text-slate-800 outline-none text-right bg-transparent"
              />
              <span className="text-[10px] font-black text-slate-400 ml-2 uppercase">Pax</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Almoço</label>
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 w-32 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400">
              <input 
                type="number" 
                value={paxDefaults?.almoco || ''}
                onChange={e => onUpdatePaxDefaults({...paxDefaults, almoco: parseInt(e.target.value) || 0})}
                placeholder="0"
                className="w-full text-sm font-black text-slate-800 outline-none text-right bg-transparent"
              />
              <span className="text-[10px] font-black text-slate-400 ml-2 uppercase">Pax</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Jantar</label>
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 w-32 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400">
              <input 
                type="number" 
                value={paxDefaults?.jantar || ''}
                onChange={e => onUpdatePaxDefaults({...paxDefaults, jantar: parseInt(e.target.value) || 0})}
                placeholder="0"
                className="w-full text-sm font-black text-slate-800 outline-none text-right bg-transparent"
              />
              <span className="text-[10px] font-black text-slate-400 ml-2 uppercase">Pax</span>
            </div>
          </div>
        </div>
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

          {renderCategory("Proteínas", "proteinas", catalog.proteinas)}
          {renderCategory("Acompanhamentos", "acompanhamentos", catalog.acompanhamentos)}
          {renderCategory("Saladas", "saladas", catalog.saladas)}
          {renderCategory("Sobremesas", "sobremesas", catalog.sobremesas)}
          {renderCategory("Ceia", "ceia", catalog.ceia)}
        </div>
      )}
    </div>
  );
}
