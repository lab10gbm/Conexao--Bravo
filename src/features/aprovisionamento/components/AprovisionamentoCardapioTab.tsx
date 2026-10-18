import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sunrise, Utensils, Sunset, Calculator, TrendingDown, Edit2 } from 'lucide-react';
import { PaxDefaults, Material } from '../types';
import { GastoIngrediente } from '../../../components/AprovisionamentoCatalogo';
import { RefeitorioEditModal } from '../../../components/RefeitorioEditModal';

interface AprovisionamentoCardapioTabProps {
  paxDefaults: PaxDefaults;
  onUpdatePaxDefaults: (pax: PaxDefaults) => void;
  isEditingMenu: boolean;
  setIsEditingMenu: (b: boolean) => void;
  editingMenuIndex: number | null;
  setEditingMenuIndex: (idx: number | null) => void;
  filteredMenus: any[];
  menus: any[];
  gastosCatalogo: Record<string, GastoIngrediente[]>;
  paxPratosCatalogo: Record<string, { semana?: number; fds?: number; evento?: number }>;
  materiais: Material[];
}

export function AprovisionamentoCardapioTab({
  paxDefaults,
  onUpdatePaxDefaults,
  isEditingMenu,
  setIsEditingMenu,
  editingMenuIndex,
  setEditingMenuIndex,
  filteredMenus,
  menus,
  gastosCatalogo,
  paxPratosCatalogo,
  materiais,
}: AprovisionamentoCardapioTabProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Simulador de Consumo</h2>
          <p className="text-xs font-semibold text-slate-500">
            Planejamento do Cardápio importado do <span className="text-rose-600 font-bold bg-rose-50 px-1 rounded">Planejamento Semanal</span>. A conversão usa os parâmetros do <span className="text-amber-600 font-bold bg-amber-50 px-1 rounded">Catálogo</span>.
          </p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="flex-1">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-1">Efetivos Estimados Padrão</h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            (Aplicado em dias que não possuem efetivo específico informado)
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Café da Manhã</label>
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 w-32 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400">
              <input 
                type="number" 
                value={paxDefaults?.cafe || ''}
                onChange={e => {
                  onUpdatePaxDefaults({ ...paxDefaults, cafe: parseInt(e.target.value) || 0 });
                }}
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
                onChange={e => {
                  onUpdatePaxDefaults({ ...paxDefaults, almoco: parseInt(e.target.value) || 0 });
                }}
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
                onChange={e => {
                  onUpdatePaxDefaults({ ...paxDefaults, jantar: parseInt(e.target.value) || 0 });
                }}
                placeholder="0"
                className="w-full text-sm font-black text-slate-800 outline-none text-right bg-transparent"
              />
              <span className="text-[10px] font-black text-slate-400 ml-2 uppercase">Pax</span>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isEditingMenu && (
          <RefeitorioEditModal 
            onClose={() => setIsEditingMenu(false)} 
            editIndex={editingMenuIndex} 
          />
        )}
      </AnimatePresence>
      
      <div className="space-y-4">
        {filteredMenus.map((menu: any, index: number) => {
          if (!menu.date) return null;
          const paxLocalCafe = menu.efetivoCafe || paxDefaults.cafe || 60;
          const paxLocalAlmoco = menu.efetivoAlmoco || paxDefaults.almoco || 60;
          const paxLocalJantar = menu.efetivoJantar || paxDefaults.jantar || 60;
          const isFds = menu.weekday?.toLowerCase().includes('sáb') || menu.weekday?.toLowerCase().includes('dom');

          // Extract all dishes
          const itemsOfDay: { name: string, meal: 'CAFE' | 'ALMOCO' | 'JANTAR' }[] = [];
          const addDishes = (dishes: string, meal: 'CAFE' | 'ALMOCO' | 'JANTAR') => {
            if (!dishes || dishes === '-') return;
            dishes.split(',').forEach(dStr => {
              const trimmed = dStr.trim();
              if (trimmed) itemsOfDay.push({ name: trimmed, meal });
            });
          };
          if (menu.cafeManha) addDishes(menu.cafeManha, 'CAFE');
          if (menu.lancheTarde) addDishes(menu.lancheTarde, 'CAFE');
          if (menu.almoco) {
            if (menu.almoco.principal) itemsOfDay.push({ name: menu.almoco.principal.trim(), meal: 'ALMOCO' });
            addDishes(menu.almoco.acompanhamentos, 'ALMOCO');
            addDishes(menu.almoco.saladas, 'ALMOCO');
            if (menu.almoco.sobremesa && menu.almoco.sobremesa !== '-') itemsOfDay.push({ name: menu.almoco.sobremesa.trim(), meal: 'ALMOCO' });
          }
          if (menu.jantar) {
            if (menu.jantar.principal) itemsOfDay.push({ name: menu.jantar.principal.trim(), meal: 'JANTAR' });
            addDishes(menu.jantar.acompanhamentos, 'JANTAR');
            addDishes(menu.jantar.saladas, 'JANTAR');
            if (menu.jantar.ceia && menu.jantar.ceia !== '-') itemsOfDay.push({ name: menu.jantar.ceia.trim(), meal: 'JANTAR' });
          }
          
          // Calculate simulation needed for these dishes
          const simulacaoRefeicoes: { nomeIngrediente: string; needed: number; und: string }[] = [];
          itemsOfDay.forEach(item => {
             const gastoKey = Object.keys(gastosCatalogo).find(k => k.toLowerCase() === item.name.toLowerCase());
             const regrasGasto = gastoKey ? gastosCatalogo[gastoKey] : undefined;
             if (regrasGasto) {
                const paxForMeal = item.meal === 'CAFE' ? paxLocalCafe : item.meal === 'ALMOCO' ? paxLocalAlmoco : paxLocalJantar;
                regrasGasto.forEach(gasto => {
                   const mat = materiais.find(m => m.nome.toLowerCase() === gasto.nome.toLowerCase());
                   if (mat) {
                      const isEvento = menu.isEvento;
                      const multiplier = isEvento ? (gasto.quantidadeEvento || 0) : (isFds ? gasto.quantidadeFDS : gasto.quantidadeSemana);
                      
                      const paxConfig = paxPratosCatalogo[gastoKey] || {};
                      const standardPax = isEvento 
                          ? (paxConfig.evento || paxDefaults.almoco || 60)
                          : (isFds ? (paxConfig.fds || paxDefaults.almoco || 60) : (paxConfig.semana || paxDefaults.almoco || 60));
                          
                      let qtd = (multiplier / standardPax) * paxForMeal;
                      
                      if (qtd > 0) {
                         const existing = simulacaoRefeicoes.find(s => s.nomeIngrediente === mat.nome);
                         if (existing) {
                            existing.needed += qtd;
                         } else {
                            simulacaoRefeicoes.push({ nomeIngrediente: mat.nome, needed: qtd, und: mat.undMedida });
                         }
                      }
                   }
                });
             }
          });

          // Calculate global daily fix costs as well for this day
          const currentGastos = [
            ...(gastosCatalogo['Itens Alimentação'] || []),
            ...(gastosCatalogo['Itens Não Alimentares'] || [])
          ];
          const simulacaoDiaria: { nomeIngrediente: string; needed: number; und: string }[] = [];
          currentGastos.forEach(gasto => {
             const mat = materiais.find(m => m.nome === gasto.nome);
             if (mat) {
                const multiplier = menu.isEvento ? (gasto.quantidadeEvento || 0) : (isFds ? gasto.quantidadeFDS : gasto.quantidadeSemana);
                let qtd = multiplier;
                if (qtd > 0) {
                   const existing = simulacaoDiaria.find(s => s.nomeIngrediente === mat.nome);
                   if (existing) {
                      existing.needed += qtd;
                   } else {
                      simulacaoDiaria.push({ nomeIngrediente: mat.nome, needed: qtd, und: mat.undMedida });
                   }
                }
             }
          });

          if (itemsOfDay.length === 0 && currentGastos.length === 0) return null;

          return (
            <div key={index} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm group">
              <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data</span>
                    <span className="text-base font-black text-slate-800">{menu.weekday} ({menu.date})</span>
                  </div>
                  <button
                    onClick={() => {
                      const actualIndex = menus.findIndex((m: any) => m.date === menu.date);
                      setEditingMenuIndex(actualIndex !== -1 ? actualIndex : null);
                      setIsEditingMenu(true);
                    }}
                    className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Editar Dia
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-200/60 pt-4">
                  {menu.cafeManha && menu.cafeManha !== '-' && (
                    <div className="flex flex-col gap-1.5">
                       <div className="flex items-center justify-between">
                         <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Café da Manhã</span>
                         <span className="text-[10px] font-black text-amber-700 bg-amber-100/50 px-2 pl-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm border border-amber-200/50"><Sunrise className="w-3 h-3" /> {paxLocalCafe} pax</span>
                       </div>
                       <span className="text-xs font-semibold text-slate-700 leading-relaxed uppercase">{menu.cafeManha}</span>
                    </div>
                  )}
                  {menu.almoco && (
                    <div className="flex flex-col gap-1.5 border-t md:border-t-0 md:border-l border-slate-200/60 pt-4 md:pt-0 md:pl-6">
                       <div className="flex items-center justify-between">
                         <span className="text-[10px] font-bold text-sky-500 uppercase tracking-widest">Almoço</span>
                         <span className="text-[10px] font-black text-sky-700 bg-sky-100/50 px-2 pl-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm border border-sky-200/50"><Utensils className="w-3 h-3" /> {paxLocalAlmoco} pax</span>
                       </div>
                       <span className="text-xs font-semibold text-slate-700 leading-relaxed uppercase">
                         {[menu.almoco.principal, menu.almoco.acompanhamentos, menu.almoco.saladas, menu.almoco.sobremesa].filter(Boolean).map(i => i.trim()).filter(i => i).join(' / ')}
                       </span>
                    </div>
                  )}
                  {menu.jantar && (
                    <div className="flex flex-col gap-1.5 border-t md:border-t-0 md:border-l border-slate-200/60 pt-4 md:pt-0 md:pl-6">
                       <div className="flex items-center justify-between">
                         <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Jantar & Ceia</span>
                         <span className="text-[10px] font-black text-indigo-700 bg-indigo-100/50 px-2 pl-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm border border-indigo-200/50"><Sunset className="w-3 h-3" /> {paxLocalJantar} pax</span>
                       </div>
                       <span className="text-xs font-semibold text-slate-700 leading-relaxed uppercase">
                         {[menu.jantar.principal, menu.jantar.acompanhamentos, menu.jantar.saladas, menu.jantar.ceia].filter(Boolean).map(i => i.trim()).filter(i => i !== '-').join(' / ')}
                       </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-5 bg-white flex flex-col gap-5">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                    <Calculator className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Simulação Refeições do Dia</h4>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {simulacaoRefeicoes.length === 0 ? (
                        <span className="text-slate-400 italic font-semibold">Nenhum ingrediente mapeado para os pratos deste dia no Catálogo.</span>
                      ) : (
                        simulacaoRefeicoes.map(item => (
                          <div key={item.nomeIngrediente} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1">
                            <span className="font-semibold text-slate-600">{item.nomeIngrediente}:</span>
                            <span className="font-black font-mono text-slate-800">{item.needed.toFixed(2)} {item.und}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                
                {simulacaoDiaria.length > 0 && (
                  <div className="flex gap-4 border-t border-slate-100 pt-5 mt-1">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <TrendingDown className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-2">Simulação de Gastos Diários</h4>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {simulacaoDiaria.map(item => (
                          <div key={item.nomeIngrediente} className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1">
                            <span className="font-semibold text-amber-700">{item.nomeIngrediente}:</span>
                            <span className="font-black font-mono text-amber-900">{item.needed.toFixed(2)} {item.und}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {(() => {
          const uniqueDates = Array.from(new Set(filteredMenus.map((c: any) => c.date).filter(Boolean)));
          const currentGastos = [
            ...(gastosCatalogo['Itens Alimentação'] || []),
            ...(gastosCatalogo['Itens Não Alimentares'] || [])
          ];
          if (currentGastos.length === 0 || uniqueDates.length === 0) return null;
          
          return (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden shadow-sm mt-6 p-5">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <TrendingDown className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-black uppercase tracking-widest text-amber-800 mb-2">Simulação de Gastos Diários (Fixos Globais)</h4>
                  <p className="text-[10px] text-amber-600 font-bold mb-4 uppercase tracking-widest">
                    {uniqueDates.length} dias identificados. Os valores abaixo refletem o total acumulado nesses dias com base na configuração do Catálogo para categorias de Gastos Diários.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {currentGastos.map((gasto, idx) => {
                      const mat = materiais.find(m => m.nome.toLowerCase() === gasto.nome.toLowerCase());
                      if (!mat) return null;
                      
                      let totalQtdCost = 0;

                      uniqueDates.forEach(dateStr => {
                        const parts = (dateStr as string).split('/');
                        if (parts.length < 2) return;
                        const d = parseInt(parts[0]);
                        const mo = parseInt(parts[1]);
                        const hoje = new Date();
                        let year = hoje.getFullYear();
                        if (hoje.getMonth() === 0 && mo === 12) year--;
                        else if (hoje.getMonth() === 11 && mo === 1) year++;
                        const cDate = new Date(year, mo - 1, d);
                        cDate.setHours(0,0,0,0);
                        
                        const dayOfWeek = cDate.getDay();
                        const isFds = dayOfWeek === 0 || dayOfWeek === 6;
                        
                        const findMenu = filteredMenus.find((m: any) => m.date === dateStr);
                        const multiplier = findMenu?.isEvento ? (gasto.quantidadeEvento || 0) : (isFds ? gasto.quantidadeFDS : gasto.quantidadeSemana);
                        
                        totalQtdCost += multiplier;
                      });

                      if (totalQtdCost <= 0) return null;

                      return (
                        <div key={idx} className="flex items-center gap-1.5 bg-white border border-amber-200/50 rounded-lg px-2.5 py-1">
                          <span className="font-semibold text-amber-900">{mat.nome}:</span>
                          <span className="font-black font-mono text-amber-600">{totalQtdCost.toFixed(2)} {mat.undMedida}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {filteredMenus.length === 0 && (
           <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhum cardápio importado do planejamento</p>
           </div>
        )}
      </div>
    </motion.div>
  );
}
