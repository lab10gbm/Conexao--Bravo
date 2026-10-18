import React from 'react';
import { ArrowRightLeft, CalendarDays, Check } from 'lucide-react';
import { PermutaRequest } from '../../../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PermutaMonthDashboardProps {
  groupedByMonth: Record<string, PermutaRequest[]>;
  obmContext: string;
  onSelectMonth: (monthKey: string) => void;
}

export const PermutaMonthDashboard: React.FC<PermutaMonthDashboardProps> = ({
  groupedByMonth,
  obmContext,
  onSelectMonth,
}) => {
  return (
    <div className="w-full max-w-md h-full flex flex-col bg-slate-100 sm:border-x sm:border-slate-800 relative">
      <div className="bg-white px-4 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-pink-600" />
            Triagem Mobile
          </h2>
          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-widest">{obmContext}</span>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
          <CalendarDays className="w-4 h-4" /> Meses em Aberto
        </h3>
        
        {Object.keys(groupedByMonth).length === 0 ? (
          <div className="bg-white rounded-xl p-8 border border-slate-200 flex flex-col items-center text-center">
            <Check className="w-12 h-12 text-slate-200 mb-2" />
            <div className="text-sm font-bold text-slate-800">Sem Permutas Pendentes</div>
            <div className="text-xs text-slate-500">Todas as triagens foram finalizadas.</div>
          </div>
        ) : (
          <div className="grid gap-3">
            {Object.entries(groupedByMonth).map(([monthKey, items]) => {
              const dateObj = parseISO(monthKey + '-01');
              const monthName = format(dateObj, 'MMMM yyyy', { locale: ptBR });
              
              return (
                <button 
                  key={monthKey}
                  onClick={() => onSelectMonth(monthKey)}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-pink-300 hover:shadow-md transition-all flex items-center justify-between group text-left cursor-pointer"
                >
                  <div>
                    <div className="capitalize font-black text-slate-800">{monthName}</div>
                    <div className="text-xs text-slate-500 font-medium">{items.length} solicitações aguardando triagem</div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center font-black group-hover:bg-pink-100">
                    {items.length}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
