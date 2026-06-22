import React, { useState, useEffect } from 'react';
import { format, addDays, startOfDay, differenceInHours, differenceInMinutes, subDays, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, getAlaForDate, getAlaName, getAlaCardColor, getThemeColors, calculateDeadline } from '../lib/utils';
import { UserProfile } from '../types';
import { Clock, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface WeeklyMonitorProps {
  user?: UserProfile;
  onRequestPermuta?: (date: Date) => void;
}

export function WeeklyMonitor({ user, onRequestPermuta }: WeeklyMonitorProps) {
  const [now, setNow] = useState(new Date());
  const [isExpanded, setIsExpanded] = useState(true);

  const theme = getThemeColors(user?.ala);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const today = startOfDay(now);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  const getStatus = (deadline: Date) => {
    const isExpired = now > deadline;
    if (isExpired) {
      return { 
        expired: true, 
        text: 'ENCERRADO', 
        bgClass: 'bg-red-100',
        textClass: 'text-red-900',
        badgeClass: 'bg-red-200 text-red-800 border border-red-300'
      };
    }

    const diffHours = Math.max(0, differenceInHours(deadline, now));
    const days = Math.floor(diffHours / 24);
    const hours = diffHours % 24;
    const minutes = Math.max(0, differenceInMinutes(deadline, now) % 60);
    
    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');

    return {
      expired: false,
      text: `${days}d e ${formattedHours}:${formattedMinutes}`,
      bgClass: 'bg-amber-100',
      textClass: 'text-amber-900',
      badgeClass: 'bg-amber-200 text-amber-900 border border-amber-300'
    };
  };

  return (
    <div id="weekly-monitor" className={cn("mb-6 sm:mb-12 border rounded-xl overflow-hidden shadow-sm transition-colors duration-500", theme.panel)}>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn("w-full flex items-center justify-between p-4 sm:p-6 transition-colors border-b", isExpanded ? theme.borderInner : "border-transparent", theme.panel)}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={cn("p-2 sm:p-3 rounded-lg border", theme.iconBg)}>
            <Clock className={cn("w-5 h-5 sm:w-6 h-6", theme.iconText)} />
          </div>
          <div className="text-left">
            <h3 className={cn("text-base sm:text-lg font-black uppercase tracking-tight", theme.title)}>Monitor Semanal</h3>
            <p className={cn("text-[9px] sm:text-xs font-bold uppercase tracking-widest mt-0.5 sm:mt-1", theme.textLight)}>
              Prazos para permuta (48h a 72h Úteis)
            </p>
          </div>
        </div>
        <div className={cn("p-2 rounded-full transition-colors", isExpanded ? theme.card : "bg-transparent", theme.text)}>
           <svg className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </button>

      <motion.div 
        initial={false}
        animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
        className="overflow-hidden"
      >
        <div className="p-3 sm:p-6 opacity-90">
          <div className="sm:hidden mb-2 flex items-center gap-1.5 px-2 py-1 bg-slate-50/50 rounded-lg border border-slate-200/50">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Deslize para ver a semana →</span>
          </div>
          <div className="w-full overflow-x-auto pb-2 no-scrollbar">
            <div className={cn("min-w-[650px] sm:min-w-[800px] border-2 rounded-xl shadow-sm flex flex-col overflow-hidden", theme.borderInner, theme.card)}>
              {/* LINHA DE DATAS (DESTINO) */}
              <div className={cn("grid grid-cols-7 divide-x-2 border-b-2", theme.borderInner, theme.divide)}>
                {weekDays.map((day, i) => {
                  const ala = getAlaForDate(day);
                  const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                  const isToday = i === 0;

                  return (
                    <div 
                      key={`top-${i}`} 
                      className={cn(
                        "relative flex flex-col items-center justify-center p-2.5 sm:p-4 cursor-pointer hover:opacity-80 transition-opacity",
                        getAlaCardColor(ala),
                        isToday ? "ring-4 ring-blue-500 ring-inset" : ""
                      )}
                      onClick={() => onRequestPermuta?.(day)}
                      title="Clique para solicitar permuta"
                    >
                      {isToday && (
                        <span className="absolute top-0 left-0 bg-blue-500 text-white text-[8px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-br-lg uppercase tracking-widest z-10 pointer-events-none">
                          Hoje
                        </span>
                      )}
                      <span className="text-sm sm:text-[17px] font-black mb-0.5 sm:mb-1 text-slate-900 drop-shadow-sm">{format(day, 'dd/MM/yyyy')}</span>
                      <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-800">{format(day, 'EEE', { locale: ptBR })}</span>
                      <span className="text-[8px] sm:text-[10px] font-bold opacity-60 italic normal-case text-slate-700 mt-0.5 sm:mt-1">{isWeekend ? '0h' : '24H'}</span>
                    </div>
                  );
                })}
              </div>

              {/* LINHA DE PRAZOS (DEADLINES) */}
              <div className={cn("grid grid-cols-7 divide-x-2", theme.panel, theme.divide)}>
                {weekDays.map((day, i) => {
                  const deadline = calculateDeadline(day);
                  const status = getStatus(deadline);
                  
                  return (
                    <div 
                      key={`bottom-${i}`} 
                      className={cn(
                        "flex flex-col items-center justify-center p-2 sm:p-3 text-center border-t border-transparent",
                        status.bgClass, status.textClass
                      )}
                    >
                       <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-tighter opacity-80 mb-0.5 sm:mb-1">
                         {format(deadline, 'EEE', { locale: ptBR })} {format(deadline, 'HH:mm')}
                       </span>
                       <span className={cn("text-[11px] sm:text-[13px] font-bold mb-1.5 sm:mb-2", status.expired ? "line-through opacity-60" : "opacity-90")}>
                         {format(deadline, 'dd/MM/yyyy')}
                       </span>
                       <span className={cn(
                         "text-[8px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 sm:py-1 rounded shadow-sm flex items-center gap-1",
                         status.badgeClass
                       )}>
                         {status.expired ? <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                         {status.text}
                       </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
