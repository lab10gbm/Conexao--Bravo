import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, X, Calendar, Edit2, Sunrise, Utensils, Sunset, Coffee, Save } from 'lucide-react';
import { TagInput } from './TagInput';
import { useRefeitorioData } from '../hooks/useRefeitorioData';

interface RefeitorioEditModalProps {
  onClose: () => void;
  editIndex: number | null;
}

export function RefeitorioEditModal({ onClose, editIndex }: RefeitorioEditModalProps) {
  const { menus, catalog, defaults, saveMenus, saveDefaults } = useRefeitorioData();
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [editingDateValue, setEditingDateValue] = useState("");
  const [showDefaultsConfig, setShowDefaultsConfig] = useState(false);

  useEffect(() => {
    if (editIndex !== null) {
      const item = menus[editIndex];
      setEditingItem(JSON.parse(JSON.stringify(item)));
      setIsCustomDate(true);
      if (item.date) {
        const parts = item.date.split('/');
        if (parts.length === 2) {
          const d = parts[0].padStart(2, '0');
          const m = parts[1].padStart(2, '0');
          const y = new Date().getFullYear();
          setEditingDateValue(`${y}-${m}-${d}`);
        } else {
          setEditingDateValue("");
        }
      } else {
        setEditingDateValue("");
      }
    } else {
      setEditingItem({
        date: "",
        weekday: "",
        almoco: defaults?.almoco || { principal: "", acompanhamentos: "ARROZ, FEIJÃO", saladas: "SALADA TRADICIONAL", sobremesa: "" },
        jantar: defaults?.jantar || { principal: "", acompanhamentos: "ARROZ, FEIJÃO", saladas: "SALADA TRADICIONAL", ceia: "" },
        lancheTarde: defaults?.lancheTarde || "CAFÉ, SUCO, PIPOCA, PÃO RECHEADO",
        cafeManha: defaults?.cafeManha || "CAFÉ, PÃO, OVOS, QUEIJO, PRESUNTO"
      });
      setEditingDateValue("");
      setIsCustomDate(false);
    }
  }, [editIndex, menus, defaults]);

  const getSuggestedDates = () => {
    const suggestions: { value: string, label: string, dateKey: string, weekday: string }[] = [];
    const weekdays = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
    const existingDates = new Set(menus.map(m => m.date));
    const startD = new Date();
    
    for (let i = 0; i < 30; i++) {
      const y = startD.getFullYear();
      const mo = String(startD.getMonth() + 1).padStart(2, '0');
      const da = String(startD.getDate()).padStart(2, '0');
      const key = `${da}/${mo}`;
      
      if (!existingDates.has(key) || (editIndex !== null && editingItem?.date === key)) {
         suggestions.push({
             value: `${y}-${mo}-${da}`,
             label: `${da}/${mo}/${y} (${weekdays[startD.getDay()].toLowerCase()})`,
             dateKey: key,
             weekday: weekdays[startD.getDay()]
         });
      }
      if (suggestions.length >= 6) break;
      startD.setDate(startD.getDate() + 1);
    }
    return suggestions;
  };

  const suggestedDates = getSuggestedDates();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (showDefaultsConfig) {
      if (saveDefaults) {
          saveDefaults({
             almoco: editingItem.almoco,
             jantar: editingItem.jantar,
             lancheTarde: editingItem.lancheTarde,
             cafeManha: editingItem.cafeManha
          });
      }
      setShowDefaultsConfig(false);
      setEditingItem({
        date: "",
        weekday: "",
        almoco: editingItem.almoco,
        jantar: editingItem.jantar,
        lancheTarde: editingItem.lancheTarde,
        cafeManha: editingItem.cafeManha
      });
      return;
    }
    const newMenus = [...menus];
    if (editIndex !== null) {
      newMenus[editIndex] = editingItem;
      // Sort after edit to ensure chronological order
      newMenus.sort((a, b) => {
         const tA = a.date ? parseInt(a.date.split('/')[1]) * 100 + parseInt(a.date.split('/')[0]) : 0;
         const tB = b.date ? parseInt(b.date.split('/')[1]) * 100 + parseInt(b.date.split('/')[0]) : 0;
         return tA - tB;
      });
    } else {
      newMenus.push(editingItem);
      // Sort menus chronologically based on day/month
      newMenus.sort((a, b) => {
         const tA = a.date ? parseInt(a.date.split('/')[1]) * 100 + parseInt(a.date.split('/')[0]) : 0;
         const tB = b.date ? parseInt(b.date.split('/')[1]) * 100 + parseInt(b.date.split('/')[0]) : 0;
         return tA - tB;
      });
    }
    saveMenus(newMenus);
    onClose();
  };

  if (!editingItem) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 lg:p-8 overflow-y-auto" onClick={onClose} >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl p-4 sm:p-6 lg:p-8 max-w-4xl w-full shadow-2xl relative my-4 sm:my-8 mx-auto"
      >
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              {showDefaultsConfig ? <Settings2 className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
            </div>
            {showDefaultsConfig ? 'Configurar Refeição Padrão' : (editIndex !== null ? 'Editar Refeição' : 'Nova Refeição')}
          </h2>
          <div className="flex items-center gap-2">
            {!showDefaultsConfig && editIndex === null && (
              <button
                type="button"
                onClick={() => {
                  setShowDefaultsConfig(true);
                  setEditingItem({
                    date: "",
                    weekday: "",
                    almoco: defaults?.almoco || { principal: "", acompanhamentos: "ARROZ, FEIJÃO", saladas: "SALADA TRADICIONAL", sobremesa: "" },
                    jantar: defaults?.jantar || { principal: "", acompanhamentos: "ARROZ, FEIJÃO", saladas: "SALADA TRADICIONAL", ceia: "" },
                    lancheTarde: defaults?.lancheTarde || "CAFÉ, SUCO, PIPOCA, PÃO RECHEADO",
                    cafeManha: defaults?.cafeManha || "CAFÉ, PÃO, OVOS, QUEIJO, PRESUNTO"
                  });
                }}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                title="Configurar Refeição Padrão"
              >
                <Settings2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => {
                  if (showDefaultsConfig) {
                     setShowDefaultsConfig(false);
                  } else {
                     onClose();
                  }
              }}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {!showDefaultsConfig && (
            <div className="grid grid-cols-1 gap-4">
              <div>
                 <div className="flex items-center gap-6 mb-1.5 ml-1 mr-1">
                    <div className="flex items-center gap-2">
                       <input type="checkbox" id="isEvento" checked={!!editingItem.isEvento} onChange={e => setEditingItem({...editingItem, isEvento: e.target.checked})} className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                       <label htmlFor="isEvento" className="text-[10px] font-black text-rose-500 uppercase tracking-widest cursor-pointer">Dia de Evento Especial</label>
                    </div>
                    <button 
                       type="button" 
                       onClick={() => setIsCustomDate(!isCustomDate)}
                       className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 uppercase ml-auto"
                    >
                       {isCustomDate ? 'Usar Sugestões' : 'Informar Outra Data'}
                    </button>
                 </div>
                 {!isCustomDate ? (
                    <div className="relative">
                       <select
                          value={editingDateValue}
                          onChange={e => {
                             const val = e.target.value;
                             setEditingDateValue(val);
                             if (val) {
                                const opt = suggestedDates.find(d => d.value === val);
                                if (opt) {
                                   setEditingItem({
                                      ...editingItem,
                                      date: opt.dateKey,
                                      weekday: opt.weekday
                                   });
                                }
                             }
                          }}
                          required={!isCustomDate}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold uppercase text-slate-700 appearance-none outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                       >
                          <option value="" disabled>Selecione uma data sugerida...</option>
                          {suggestedDates.map(d => (
                             <option key={d.value} value={d.value}>{d.label}</option>
                          ))}
                       </select>
                       <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                 ) : (
                    <div className="relative">
                      <input 
                        type="date"
                        value={editingDateValue}
                        onChange={e => {
                          const val = e.target.value;
                          setEditingDateValue(val);
                          if (val) {
                             const [y, m, d] = val.split('-');
                             const dat = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
                             const weekdays = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
                             setEditingItem({
                               ...editingItem,
                               date: `${d}/${m}`,
                               weekday: weekdays[dat.getDay()]
                             });
                          }
                        }} 
                        required={isCustomDate}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold uppercase text-slate-700 outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                      />
                    </div>
                 )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-100 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h4 className="text-rose-700 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                   <Utensils className="w-4 h-4" /> Almoço
                </h4>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black uppercase text-rose-500 tracking-widest">Efetivo</label>
                  <input type="number" value={editingItem.efetivoAlmoco || ''} onChange={e => setEditingItem({...editingItem, efetivoAlmoco: parseInt(e.target.value) || 0})} placeholder="Padrão" className="w-20 bg-white border border-rose-200 text-slate-800 font-black text-right text-xs px-2 py-1 focus:outline-none focus:ring-2 focus:ring-rose-400 rounded-lg" />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-rose-500/70 uppercase tracking-widest mb-1.5 ml-1">Prato Principal</label>
                <TagInput value={editingItem.almoco.principal} onChange={val => setEditingItem({...editingItem, almoco: {...editingItem.almoco, principal: val}})} suggestions={catalog.proteinas} className="border-rose-200 focus-within:border-rose-400 focus-within:ring-rose-100 bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-rose-500/70 uppercase tracking-widest mb-1.5 ml-1">Acompanhamentos</label>
                <TagInput value={editingItem.almoco.acompanhamentos} onChange={val => setEditingItem({...editingItem, almoco: {...editingItem.almoco, acompanhamentos: val}})} suggestions={catalog.acompanhamentos} className="border-rose-200 focus-within:border-rose-400 focus-within:ring-rose-100 bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-rose-500/70 uppercase tracking-widest mb-1.5 ml-1">Saladas</label>
                <TagInput value={editingItem.almoco.saladas} onChange={val => setEditingItem({...editingItem, almoco: {...editingItem.almoco, saladas: val}})} suggestions={catalog.saladas} className="border-rose-200 focus-within:border-rose-400 focus-within:ring-rose-100 bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-rose-500/70 uppercase tracking-widest mb-1.5 ml-1">Sobremesa</label>
                <TagInput value={editingItem.almoco.sobremesa} onChange={val => setEditingItem({...editingItem, almoco: {...editingItem.almoco, sobremesa: val}})} suggestions={catalog.sobremesas} className="border-rose-200 focus-within:border-rose-400 focus-within:ring-rose-100 bg-white" />
              </div>
            </div>

            <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h4 className="text-indigo-700 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                   <Sunset className="w-4 h-4" /> Jantar
                </h4>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">Efetivo</label>
                  <input type="number" value={editingItem.efetivoJantar || ''} onChange={e => setEditingItem({...editingItem, efetivoJantar: parseInt(e.target.value) || 0})} placeholder="Padrão" className="w-20 bg-white border border-indigo-200 text-slate-800 font-black text-right text-xs px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded-lg" />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-indigo-500/70 uppercase tracking-widest mb-1.5 ml-1">Prato Principal</label>
                <TagInput value={editingItem.jantar.principal} onChange={val => setEditingItem({...editingItem, jantar: {...editingItem.jantar, principal: val}})} suggestions={catalog.proteinas} className="border-indigo-200 focus-within:border-indigo-400 focus-within:ring-indigo-100 bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-indigo-500/70 uppercase tracking-widest mb-1.5 ml-1">Acompanhamentos</label>
                <TagInput value={editingItem.jantar.acompanhamentos} onChange={val => setEditingItem({...editingItem, jantar: {...editingItem.jantar, acompanhamentos: val}})} suggestions={catalog.acompanhamentos} className="border-indigo-200 focus-within:border-indigo-400 focus-within:ring-indigo-100 bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-indigo-500/70 uppercase tracking-widest mb-1.5 ml-1">Saladas</label>
                <TagInput value={editingItem.jantar.saladas} onChange={val => setEditingItem({...editingItem, jantar: {...editingItem.jantar, saladas: val}})} suggestions={catalog.saladas} className="border-indigo-200 focus-within:border-indigo-400 focus-within:ring-indigo-100 bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-indigo-500/70 uppercase tracking-widest mb-1.5 ml-1">Ceia</label>
                <TagInput value={editingItem.jantar.ceia} onChange={val => setEditingItem({...editingItem, jantar: {...editingItem.jantar, ceia: val}})} suggestions={catalog.ceia} className="border-indigo-200 focus-within:border-indigo-400 focus-within:ring-indigo-100 bg-white" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
              <div className="flex items-center justify-between mb-1.5 ml-1">
                <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1"><Sunrise className="w-3 h-3" /> Café da Manhã</label>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black uppercase text-emerald-600/70 tracking-widest">Efetivo</label>
                  <input type="number" value={editingItem.efetivoCafe || ''} onChange={e => setEditingItem({...editingItem, efetivoCafe: parseInt(e.target.value) || 0})} placeholder="Padrão" className="w-20 bg-white border border-emerald-200 text-slate-800 font-black text-right text-xs px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-lg" />
                </div>
              </div>
              <TagInput value={editingItem.cafeManha} onChange={val => setEditingItem({...editingItem, cafeManha: val})} suggestions={['CAFÉ', 'PÃO', 'OVOS', 'QUEIJO', 'PRESUNTO', 'FRUTAS', 'BOLO']} className="border-emerald-200 focus-within:border-emerald-400 focus-within:ring-emerald-100 bg-white" />
            </div>
            <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
              <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1"><Coffee className="w-3 h-3" /> Lanche da Tarde</label>
              <TagInput value={editingItem.lancheTarde} onChange={val => setEditingItem({...editingItem, lancheTarde: val})} suggestions={['CAFÉ', 'SUCO', 'PIPOCA', 'PÃO RECHEADO', 'BOLO DE BANANA', 'BOLO DE ABACAXI']} className="border-amber-200 focus-within:border-amber-400 focus-within:ring-amber-100 bg-white" />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-6 border-t border-slate-100">
             <button 
               type="button"
               onClick={() => {
                  if (showDefaultsConfig) {
                     setShowDefaultsConfig(false);
                  } else {
                     onClose();
                  }
               }}
               className="px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-100 transition-all"
             >
               Cancelar
             </button>
             <button 
               type="submit"
               className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-md shadow-slate-200 transition-all"
             >
               <Save className="w-4 h-4" />
               {showDefaultsConfig ? 'Salvar Padrão' : 'Salvar Refeição'}
             </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
