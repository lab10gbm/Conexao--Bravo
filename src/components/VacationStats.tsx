import React, { useMemo } from 'react';
import { UserProfile } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, CartesianGrid, PieChart, Pie } from 'recharts';
import { BarChart as BarChartIcon, Users, AlertTriangle } from 'lucide-react';

interface VacationStatsProps {
  militars: UserProfile[];
  allPreferences: Record<string, any>;
  reportYear: string;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function VacationStats({ militars, allPreferences, reportYear }: VacationStatsProps) {
  const stats = useMemo(() => {
    const monthCounts: Record<string, { opc1: number, opc2: number, opc3: number, total: number }> = {};
    MONTHS.forEach(m => { monthCounts[m] = { opc1: 0, opc2: 0, opc3: 0, total: 0 }; });

    let pending = 0;
    let partial = 0;
    let complete = 0;
    
    // Check conflicts (More than X people from same Ala in same month)
    const alaMonthCounts: Record<string, Record<string, number>> = {};
    
    militars.forEach(m => {
      const data: any = allPreferences[m.rg.replace(/\D/g, '')] || {};
      const prefs = data.preferences?.[reportYear] || (reportYear === '2026' ? data.months : []) || [];
      
      if (prefs.length === 0) pending++;
      else if (prefs.length < 3) partial++;
      else complete++;
      
      if (prefs[0]) monthCounts[prefs[0]].opc1++;
      if (prefs[1]) monthCounts[prefs[1]].opc2++;
      if (prefs[2]) monthCounts[prefs[2]].opc3++;
      
      prefs.forEach((p: string) => {
        if (p) {
          monthCounts[p].total++;
          const alaStr = m.ala?.toString() || 'Sem Ala';
          if (!alaMonthCounts[alaStr]) alaMonthCounts[alaStr] = {};
          alaMonthCounts[alaStr][p] = (alaMonthCounts[alaStr][p] || 0) + 1;
        }
      });
    });

    const monthChartData = MONTHS.map(m => ({
      name: m.substring(0, 3).toUpperCase(),
      fullName: m,
      'Opção 1': monthCounts[m].opc1,
      'Opção 2': monthCounts[m].opc2,
      'Opção 3': monthCounts[m].opc3,
      Total: monthCounts[m].total
    }));

    const conflicts: { ala: string, month: string, count: number }[] = [];
    Object.entries(alaMonthCounts).forEach(([ala, months]) => {
      Object.entries(months).forEach(([month, count]) => {
        if (count >= 2 && ala !== 'Sem Ala') { // If 2 or more from same Ala want same month
          conflicts.push({ ala, month, count });
        }
      });
    });

    return {
      monthChartData,
      statusData: [
        { name: 'Completos', value: complete, color: '#10b981' },
        { name: 'Parciais', value: partial, color: '#f59e0b' },
        { name: 'Pendentes', value: pending, color: '#94a3b8' },
      ],
      totalMilitars: militars.length,
      conflicts: conflicts.sort((a,b) => b.count - a.count).slice(0, 5) // top 5 conflicts
    };
  }, [militars, allPreferences, reportYear]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 font-sans">
      {/* Overview & Status */}
      <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm flex flex-col items-center justify-center">
         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Adesão ao Escalonamento</h4>
         <div className="w-full h-40">
           <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
             <PieChart>
               <Pie
                 data={stats.statusData}
                 cx="50%"
                 cy="50%"
                 innerRadius={50}
                 outerRadius={70}
                 paddingAngle={5}
                 dataKey="value"
               >
                 {stats.statusData.map((entry, index) => (
                   <Cell key={`cell-${index}`} fill={entry.color} />
                 ))}
               </Pie>
               <RechartsTooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
               />
             </PieChart>
           </ResponsiveContainer>
         </div>
         <div className="flex gap-4 mt-2">
            {stats.statusData.map(s => (
               <div key={s.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">{s.name} ({s.value})</span>
               </div>
            ))}
         </div>
      </div>

      {/* Monthly Demand Chart */}
      <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm lg:col-span-2 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
             <BarChartIcon className="w-4 h-4 text-indigo-500"/>
             Demanda por Mês
          </h4>
        </div>
        <div className="w-full flex-1 min-h-[160px]">
           <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
             <BarChart data={stats.monthChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
               <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} />
               <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
               <RechartsTooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontSize: '12px', fontWeight: 'black', color: '#1e293b', marginBottom: '8px' }}
               />
               <Bar dataKey="Opção 1" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
               <Bar dataKey="Opção 2" stackId="a" fill="#3b82f6" />
               <Bar dataKey="Opção 3" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
             </BarChart>
           </ResponsiveContainer>
         </div>
      </div>

      {/* Top Conflicts */}
      <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm lg:col-span-3">
         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
             <AlertTriangle className="w-4 h-4 text-amber-500"/>
             Correlações Críticas (Militares da Mesma Ala no mesmo Mês)
         </h4>
         {stats.conflicts.length > 0 ? (
           <div className="flex flex-wrap gap-3">
             {stats.conflicts.map((c, i) => (
                <div key={i} className="flex items-center gap-3 bg-amber-50/50 border border-amber-100 px-4 py-2 rounded-2xl">
                   <div className="flex flex-col">
                      <span className="text-[11px] font-black text-amber-800 uppercase">{c.month}</span>
                      <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Ala {c.ala}</span>
                   </div>
                   <div className="w-px h-6 bg-amber-200"></div>
                   <div className="flex items-center gap-1.5 text-amber-700 bg-white px-2 py-1 rounded-xl shadow-sm border border-amber-100">
                      <Users className="w-3 h-3" />
                      <span className="text-[11px] font-black">{c.count}</span>
                   </div>
                </div>
             ))}
           </div>
         ) : (
           <div className="p-4 bg-slate-50 rounded-2xl text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
             Sem conflitos expressivos identificados.
           </div>
         )}
      </div>
    </div>
  );
}
