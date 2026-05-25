import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UtensilsCrossed, Clock, Coffee, Utensils, Sunset, Grape, ChefHat, Sunrise, Info, Loader2 } from 'lucide-react';
import { useRefeitorioData } from '../hooks/useRefeitorioData';

export function PublicCardapioViewer() {
  const { menus, loading } = useRefeitorioData();
  const [selectedOriginalIndex, setSelectedOriginalIndex] = useState<number | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Only proceed if loading is finished
    if (loading) return;
    
    // Find the currently selected element and scroll it into view
    if (scrollContainerRef.current) {
      const selectedEl = scrollContainerRef.current.querySelector('.selected-day-tab') as HTMLElement;
      if (selectedEl) {
         try {
           selectedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
         } catch (e) {
           selectedEl.scrollIntoView(true);
         }
      }
    }
  }, [loading, selectedOriginalIndex]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-sm font-bold uppercase tracking-widest">Carregando cardápio...</p>
      </div>
    );
  }

  // Derived state for the 7 items
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const menusWithTime = menus.map((m: any, idx: number) => {
    let time = 0;
    if (m.date) {
      const parts = m.date.split('/');
      if (parts.length >= 2) {
        const d = parseInt(parts[0], 10);
        const mo = parseInt(parts[1], 10);
        if (!isNaN(d) && !isNaN(mo)) {
          let year = now.getFullYear();
          if (now.getMonth() === 0 && mo === 12) year--;
          else if (now.getMonth() === 11 && mo === 1) year++;
          time = new Date(year, mo - 1, d).getTime();
        }
      }
    }
    return { ...m, originalIndex: idx, time };
  });

  const sortedMenus = [...menusWithTime].sort((a, b) => a.time - b.time);

  let currentMenuId = selectedOriginalIndex;
  if (currentMenuId === null && sortedMenus.length > 0) {
    const todayItem = sortedMenus.find(m => m.time === todayStart) || 
                      sortedMenus.find(m => m.time > todayStart) || 
                      sortedMenus[sortedMenus.length - 1];
    if (todayItem) {
      currentMenuId = todayItem.originalIndex;
    }
  }

  const menu = (currentMenuId !== null && menus[currentMenuId]) 
    ? menus[currentMenuId] 
    : (sortedMenus[0] || null);

  const renderSnackItems = (text?: string) => {
    if (!text) return null;
    const items = text
      .replace(/ E /gi, ', ')
      .replace(/ C\/ /gi, ', ')
      .replace(/ COM /gi, ', ')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    
    return (
      <div className="flex flex-col gap-2 mt-1">
        {items.map((item, i) => {
          const lower = item.toLowerCase();
          let icon = '🔸'; 
          if (lower.includes('café') || lower.includes('cafe')) icon = '☕';
          else if (lower.includes('suco')) icon = '🧃';
          else if (lower.includes('pão') || lower.includes('pao') || lower.includes('bolo') || lower.includes('salgado') || lower.includes('empadão') || lower.includes('torta') || lower.includes('pipoca')) {
            if (lower.includes('bolo')) icon = '🍰';
            else if (lower.includes('pipoca')) icon = '🍿';
            else if (lower.includes('torta')) icon = '🥧';
            else if (lower.includes('empadão') || lower.includes('salgado')) icon = '🥟';
            else icon = '🥖';
          }
          else if (lower.includes('fruta') || lower.includes('banana') || lower.includes('abacaxi') || lower.includes('maracujá')) icon = '🍎';
          else if (lower.includes('queijo') || lower.includes('presunto') || lower.includes('ovo')) {
            if (lower.includes('ovo')) icon = '🥚';
            else if (lower.includes('queijo')) icon = '🧀';
            else if (lower.includes('presunto')) icon = '🥓';
            else icon = '🥪';
          }
          else if (lower.includes('leite')) icon = '🥛';
          
          return (
            <span key={i} className="inline-flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100/50 shadow-sm text-xs font-bold text-slate-700 uppercase">
               <span className="text-base">{icon}</span>
               {item}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-rose-100 pb-10">
      <header className="bg-white px-4 py-6 shadow-sm border-b border-slate-100 flex flex-col items-center sticky top-0 z-50">
        <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-200 mb-3">
          <UtensilsCrossed className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">10º GBM - Refeitório</h1>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cardápio Digital</p>
      </header>

      <div className="px-4 mt-6">
        {/* Navigation */}
        <div ref={scrollContainerRef} className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar mb-6 snap-x" style={{ scrollSnapType: 'x mandatory' }}>
          {sortedMenus.map((item) => {
            const isSelected = currentMenuId === item.originalIndex;
            return (
              <button
                key={item.originalIndex}
                onClick={() => setSelectedOriginalIndex(item.originalIndex)}
                className={`snap-center shrink-0 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${isSelected ? 'bg-rose-500 text-white shadow-md shadow-rose-200 selected-day-tab' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span>{item.weekday ? item.weekday.split('-')[0] : ''}</span>
                  <span className={`text-[8px] opacity-70 ${isSelected ? 'text-white' : 'text-slate-400'}`}>{item.date}</span>
                </div>
              </button>
            )
          })}
        </div>

        {!menu ? (
           <div className="flex flex-col items-center justify-center py-20 text-slate-400 opacity-60">
             <UtensilsCrossed className="w-12 h-12 mb-4" />
             <p className="text-xs font-bold uppercase tracking-widest text-center">Nenhum cardápio disponível<br/>neste período</p>
           </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentMenuId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-4"
          >
            {/* Almoço */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3 text-rose-600 mb-4 pb-3 border-b border-rose-50">
                <Utensils className="w-6 h-6" />
                <h3 className="font-black uppercase tracking-widest text-xs">Almoço</h3>
              </div>
              
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex items-center gap-2 text-rose-600/70 mb-1">
                    <ChefHat className="w-4 h-4" />
                    <span className="font-black uppercase tracking-widest text-[10px]">Prato Principal</span>
                  </div>
                  <p className="text-lg font-black text-slate-800 uppercase leading-snug">
                    {menu?.almoco?.principal || 'Não definido'}
                  </p>
                </div>
                
                <div>
                   <span className="font-black uppercase tracking-widest text-[10px] text-slate-400 block mb-2">Acompanhamentos</span>
                   <div className="flex flex-wrap text-xs font-bold text-slate-600 uppercase">
                     {(menu?.almoco?.acompanhamentos || '').split(',').map((item: string, i: number) => (
                       <span key={i} className="inline-flex items-center bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 shadow-sm mr-2 mb-2">
                         {item.trim()}
                       </span>
                     ))}
                   </div>
                </div>

                {menu?.almoco?.saladas && menu?.almoco?.saladas !== '-' && (
                  <div>
                    <span className="font-black uppercase tracking-widest text-[10px] text-slate-400 block mb-2">Saladas</span>
                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-100 text-[10px] font-bold uppercase">
                      🥗 {menu?.almoco?.saladas}
                    </span>
                  </div>
                )}
                
                {menu?.almoco?.sobremesa && (
                  <div className="pt-2">
                    <div className="flex items-center gap-1.5 text-rose-500 mb-1">
                      <Grape className="w-3.5 h-3.5" />
                      <span className="font-black uppercase tracking-widest text-[10px]">Sobremesa</span>
                    </div>
                    <p className="text-xs font-bold text-rose-900 uppercase">{menu?.almoco?.sobremesa}</p>
                  </div>
                 )}
              </div>
            </div>

            {/* Jantar */}
            <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-lg text-white">
              <div className="flex items-center gap-3 text-indigo-400 mb-4 pb-3 border-b border-slate-800">
                <Sunset className="w-6 h-6" />
                <h3 className="font-black uppercase tracking-widest text-xs">Jantar</h3>
              </div>
              
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex items-center gap-2 text-indigo-400/70 mb-1">
                    <ChefHat className="w-4 h-4" />
                    <span className="font-black uppercase tracking-widest text-[10px]">Prato Principal</span>
                  </div>
                  <p className="text-lg font-black text-white uppercase leading-snug">
                    {menu?.jantar?.principal || 'Não definido'}
                  </p>
                </div>
                
                <div>
                   <span className="font-black uppercase tracking-widest text-[10px] text-slate-500 block mb-2">Acompanhamentos</span>
                   <div className="flex flex-wrap text-xs font-bold text-slate-300 uppercase">
                     {(menu?.jantar?.acompanhamentos || '').split(',').map((item: string, i: number) => (
                       <span key={i} className="inline-flex items-center bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-700 mr-2 mb-2">
                         {item.trim()}
                       </span>
                     ))}
                   </div>
                </div>

                {menu?.jantar?.saladas && menu?.jantar?.saladas !== '-' && (
                  <div>
                    <span className="font-black uppercase tracking-widest text-[10px] text-slate-500 block mb-2">Saladas</span>
                    <span className="inline-flex items-center gap-1.5 bg-emerald-900/30 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-800/50 text-[10px] font-bold uppercase">
                      🥗 {menu?.jantar?.saladas}
                    </span>
                  </div>
                )}
                
                {menu?.jantar?.ceia && (
                  <div className="pt-2">
                    <div className="flex items-center gap-1.5 text-indigo-400/80 mb-1">
                      <Coffee className="w-3.5 h-3.5" />
                      <span className="font-black uppercase tracking-widest text-[10px]">Ceia</span>
                    </div>
                    <p className="text-xs font-bold text-indigo-200 uppercase">{menu?.jantar?.ceia}</p>
                  </div>
                 )}
              </div>
            </div>

            {/* Lanches */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col gap-5">
              <div>
                 <div className="flex items-center gap-2 text-emerald-500 mb-2">
                   <Sunrise className="w-5 h-5" />
                   <h3 className="font-black uppercase tracking-widest text-[10px]">Café da Manhã</h3>
                 </div>
                 {renderSnackItems(menu.cafeManha)}
              </div>
              
              <div className="h-px bg-slate-100 w-full line"></div>

              <div>
                 <div className="flex items-center gap-2 text-amber-500 mb-2">
                   <Coffee className="w-5 h-5" />
                   <h3 className="font-black uppercase tracking-widest text-[10px]">Lanche da Tarde</h3>
                 </div>
                 {renderSnackItems(menu.lancheTarde)}
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-center gap-2 opacity-50">
              <Info className="w-3 h-3" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Sujeito a alterações sem aviso prévio</span>
            </div>
            
            {/* Some safe margin at bottom */}
            <div className="h-4"></div>
          </motion.div>
        </AnimatePresence>
        )}
      </div>
    </div>
  );
}
