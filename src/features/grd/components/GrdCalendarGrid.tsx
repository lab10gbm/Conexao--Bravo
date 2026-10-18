import React from 'react';
import { format, isSameDay, isSameMonth, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { cn, getAlaForDate, getAlaColor, getAlaLightColor, getOppositeAla } from '../../../lib/utils';
import { parseRank } from '../../../lib/rankUtils';
import { UserProfile } from '../../../types';

export interface GrdCalendarGridProps {
  monthDays: Date[];
  currentDate: Date;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  mainTab: 'grd' | 'officers';
  grdData: Record<string, string[]>;
  officerData: Record<string, Record<string, string>>;
  militars: UserProfile[];
}

export function GrdCalendarGrid({
  monthDays,
  currentDate,
  selectedDate,
  onSelectDate,
  mainTab,
  grdData,
  officerData,
  militars,
}: GrdCalendarGridProps) {
  return (
    <div className="flex flex-col">
      <div className="hidden sm:grid grid-cols-7 mb-2 px-1 text-center">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 sm:gap-2">
        {monthDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const alaNum = getAlaForDate(day);
          const targetAlaNum = getOppositeAla(alaNum);
          const isCurrMonth = isSameMonth(day, currentDate);
          const alaLightColorClass = getAlaLightColor(targetAlaNum);
          
          // Show data based on mainTab
          let displayItems: string[] = [];
          if (mainTab === 'grd') {
            const teamRgs = grdData[dateStr] || [];
            displayItems = teamRgs.slice(0, 3).map(rg => {
              const m = militars.find(mil => mil.rg === rg);
              return m ? `${parseRank(m.rank)} ${m.warName || (m.name || '').split(' ')[0]}` : null;
            }).filter(Boolean) as string[];
          } else {
            const offDay = officerData[dateStr] || {};
            if (offDay.oficialDia) displayItems.push(`D: ${offDay.oficialDia}`);
            if (offDay.sobreaviso) displayItems.push(`S: ${offDay.sobreaviso}`);
          }
          
          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(day)}
              className={cn(
                "relative flex flex-col p-3 sm:p-2 border-2 rounded-xl sm:rounded-lg transition-all sm:min-h-[110px]",
                !isCurrMonth && "hidden sm:flex opacity-40 bg-slate-50 border-transparent cursor-default pointer-events-none text-slate-400 grayscale",
                isSelected ? "bg-cyan-50 border-cyan-500 shadow-md sm:shadow-sm z-10" : cn(alaLightColorClass, "hover:border-cyan-300 shadow-sm sm:shadow-none"),
                isToday(day) && "ring-2 ring-cyan-500 ring-offset-2"
              )}
            >
              <div className="flex justify-between items-center sm:items-start mb-2 sm:mb-1.5 w-full">
                <div className="flex items-center gap-2 border-b-0 pb-0">
                  <span className={cn(
                    "text-base sm:text-sm font-black",
                    isSelected ? "text-cyan-700" : "text-slate-700"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {!isCurrMonth ? null : (
                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", getAlaColor(targetAlaNum))} title={`GRD ${targetAlaNum}`} />
                  )}
                  <span className="text-[11px] font-black text-slate-400 sm:hidden uppercase tracking-widest">
                    {format(day, 'EEEE', { locale: ptBR })}
                  </span>
                </div>
                {mainTab === 'grd' && isCurrMonth && (
                  <span className={cn(
                    "text-[8px] font-black uppercase px-2 py-1 sm:px-1.5 sm:py-0.5 rounded outline outline-1 leading-none shrink-0",
                    getAlaLightColor(targetAlaNum)
                  )}>
                    GRD {targetAlaNum}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:gap-1 mt-1 sm:mt-auto flex-1 w-full text-left min-w-0 overflow-hidden">
                {displayItems.length > 0 ? (
                  <div className="flex flex-row sm:flex-col flex-wrap gap-1.5 sm:gap-1 w-full">
                    {displayItems.slice(0, 3).map((item, idx) => (
                      <span key={idx} className="text-[10px] sm:text-[9px] font-black bg-slate-800 text-white px-2 py-1 sm:px-1.5 sm:py-1 rounded-[4px] uppercase truncate leading-none max-w-full inline-block">
                        {item}
                      </span>
                    ))}
                    {displayItems.length > 3 && (
                       <span className="text-[10px] sm:text-[9px] font-black text-slate-500 px-1 py-1">+ {displayItems.length - 3}</span>
                    )}
                  </div>
                ) : isCurrMonth && (
                  <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity min-h-[20px]">
                    <Plus className="w-4 h-4 text-cyan-400" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
