import { getDoc, getDocs } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, collection, query, orderBy, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { motion } from 'motion/react';
import { UserProfile, PermutaRequest, PermutaStatus } from '../types';
import { ptBR } from 'date-fns/locale';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, isSameMonth, isSameDay, subDays } from 'date-fns';
import { AlertTriangle, Shield } from 'lucide-react';
import { getAlaForDate, getAlaColor, cn } from '../lib/utils';
import { useAppConfig } from '../contexts/ConfigContext';

interface CalendarHighlightsProps {
  user: UserProfile;
  obmContext: string;
  onDateClick: (date: Date) => void;
  onMonthSelect?: (month: number) => void;
}

export function CalendarHighlights({ user, obmContext, onDateClick, onMonthSelect }: CalendarHighlightsProps) {
  const { activeMonths: contextActiveMonths } = useAppConfig();

  // Initialize with current and next month to avoid "April/May" staleness
  const [activeMonthIndices, setActiveMonthIndices] = useState<number[]>(() => {
    const now = new Date();
    const current = now.getMonth();
    const next = (current + 1) % 12;
    return [current, next];
  });

  useEffect(() => {
    if (contextActiveMonths && contextActiveMonths.length > 0) {
      const sorted = [...contextActiveMonths].sort((a, b) => a - b);
      setActiveMonthIndices(sorted);
    }
  }, [contextActiveMonths]);

  const [pendingMySignature, setPendingMySignature] = useState<PermutaRequest[]>([]);
  const [lookingForSubstitute, setLookingForSubstitute] = useState<PermutaRequest[]>([]);

  useEffect(() => {
    let isMounted = true;
    
    const startDate = format(subDays(new Date(), 3), 'yyyy-MM-dd');
    const q = query(
      collection(db, 'permutas'),
      where('date', '>=', startDate),
      where('isLookingForSubstitute', '==', true)
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      if (!isMounted) return;
      const ofertas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PermutaRequest));
      const filteredByObm = ofertas.filter(p => !p.archived && (!p.obm || p.obm === obmContext || p.obm === '10º GBM'));
      setLookingForSubstitute(filteredByObm);
    }, (error) => {
      console.error("Error fetching ofertas in highlights:", error);
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [obmContext]);

  useEffect(() => {
    if (!user?.rg) return;

    let isMounted = true;

    const year = new Date().getFullYear();
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const qPerm = query(
      collection(db, 'permutas'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    
    const unsubPerms = onSnapshot(qPerm, (snapshot) => {
      if (!isMounted) return;
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PermutaRequest));
      
      const filteredByObm = data.filter(p => !p.obm || p.obm === obmContext || p.obm === '10º GBM');
      const safeRg = String(user.rg).replace(/\D/g, '');
      
      const pending = filteredByObm.filter(p => {
         const strReq = String(p.requesterRg).replace(/\D/g, '');
         const strSub = String(p.substituteRg).replace(/\D/g, '');
         if (p.status !== PermutaStatus.PENDING) return false;
         
         const userIsReq = strReq === safeRg;
         const userIsSub = strSub === safeRg;
         
         if (userIsReq && !p.requesterSigned) return true;
         if (userIsSub && !p.substituteSigned) return true;
         return false;
      });

      setPendingMySignature(pending);
    }, (error) => {
      if (isMounted) console.error("Error fetching permutas for highlights:", error);
    });

    return () => { 
      isMounted = false; 
      unsubPerms();
    };
  }, [user?.rg, obmContext]);

  const monthsToShow = activeMonthIndices.map(m => new Date(2026, m, 1));
  if (monthsToShow.length === 0) return null;

  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-2 h-7 bg-[var(--color-brand-red)]" />
        <h2 className="text-xl font-bold text-[var(--color-brand-dark)] uppercase tracking-tight">
          Escala de Serviço em Aberto
        </h2>
      </div>

      {pendingMySignature.length > 0 && (
        <div className="flex flex-col gap-3 mb-6">
          {Object.entries(
             pendingMySignature.reduce((acc, p) => {
               const mInfo = new Date(p.date + 'T00:00:00').getMonth();
               acc[mInfo] = (acc[mInfo] || 0) + 1;
               return acc;
             }, {} as Record<number, number>)
          ).map(([monthStr, count]) => {
             const mInfo = parseInt(monthStr, 10);
             const monthName = format(new Date(2026, mInfo, 1), 'MMMM', { locale: ptBR });
             return (
               <div 
                 key={mInfo}
                 onClick={() => {
                   const element = document.getElementById('requests-board');
                   if (element) {
                    try {
                      element.scrollIntoView({ behavior: 'smooth' });
                    } catch (e) {
                      element.scrollIntoView();
                    }
                   }
                   onMonthSelect?.(mInfo);
                 }}
                 className="bg-amber-100 border-2 border-amber-300 rounded-xl p-4 flex items-center justify-between shadow-sm animate-pulse-slow cursor-pointer hover:bg-amber-200 transition-colors"
               >
                  <div className="flex items-center gap-4 text-amber-900">
                    <div className="bg-amber-500 rounded-full p-2 text-white shadow-sm">
                       <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                       <h4 className="font-black text-sm uppercase tracking-tight">Assinatura Pendente</h4>
                       <p className="font-bold text-[11px] opacity-80 uppercase tracking-widest leading-tight mt-0.5">
                          Você possui {count} solicitação(ões) de permuta no mês de <span className="font-black">{monthName}</span> aguardando <span className="font-black">sua assinatura</span>. <span className="underline cursor-pointer">Clique aqui para visualizar</span>.
                       </p>
                    </div>
                  </div>
               </div>
             );
          })}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {monthsToShow.map((month) => {
          const monthIndex = month.getMonth();
          const ofertasInMonth = lookingForSubstitute.filter(p => new Date(p.date + 'T00:00:00').getMonth() === monthIndex);
          
          return (
          <div key={month.getMonth()} className="flex flex-col gap-4">
            {/* The clickable Month Banner */}
            <button 
              onClick={() => {
                const element = document.getElementById('requests-board');
                if (element) {
                  try {
                    element.scrollIntoView({ behavior: 'smooth' });
                  } catch (e) {
                    element.scrollIntoView();
                  }
                }
                onMonthSelect?.(month.getMonth());
              }}
              className="bg-[#1e293b] p-6 text-white text-left font-black uppercase tracking-[0.2em] text-sm rounded-lg shadow-md hover:bg-[#0f172a] hover:-translate-y-1 hover:shadow-xl transition-all cursor-pointer flex justify-between items-center group relative overflow-hidden"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <span>{format(month, 'MMMM', { locale: ptBR })}</span>
              <span className="text-[10px] opacity-40 group-hover:opacity-100 transition-opacity tracking-widest border border-white/20 px-3 py-1 rounded bg-white/5">Ver Permutas &rarr;</span>
            </button>

            {ofertasInMonth.length > 0 && (
               <div 
                 onClick={() => {
                   const element = document.getElementById('requests-board');
                   if (element) {
                     try {
                       element.scrollIntoView({ behavior: 'smooth' });
                     } catch (e) {
                       element.scrollIntoView();
                     }
                   }
                   onMonthSelect?.(month.getMonth());
                   // A trigger to automatically open "Ofertas" tab in PermutaBoard?
                   // Currently don't have a way to pass viewMode down directly from here, but user can click it.
                 }}
                 className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-indigo-100 transition-colors shadow-sm"
               >
                 <div className="flex items-center gap-3">
                   <div className="bg-indigo-600 rounded-full w-2 h-2 animate-pulse" />
                   <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-indigo-900">
                     {ofertasInMonth.length} Militar{ofertasInMonth.length > 1 ? 'es' : ''} Procurando Permutante
                   </p>
                 </div>
                 <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-500 bg-white px-2 py-1 rounded-sm shadow-sm">Ofertas Abertas</span>
               </div>
            )}

            {/* The visual calendar */}
            <MonthDetail 
              month={month} 
              userAla={user.ala}
              obmContext={obmContext}
              userRg={user.rg}
              onDateSelect={onDateClick} 
            />
          </div>
        )})}
      </div>
    </div>
  );
}

function getAlaBg(ala: number): string {
  switch (ala) {
    case 1: return 'bg-emerald-50 border-emerald-100/50';
    case 2: return 'bg-rose-50 border-rose-100/50';
    case 3: return 'bg-blue-50 border-blue-100/50';
    case 4: return 'bg-amber-50 border-amber-100/50';
    default: return 'bg-slate-50 border-slate-100';
  }
}

interface MonthDetailProps {
  month: Date;
  userAla: string | number;
  obmContext?: string;
  userRg?: string;
  onDateSelect: (date: Date) => void;
  key?: any;
}

export function MonthDetail({ month, userAla, obmContext, userRg, onDateSelect }: MonthDetailProps) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });
  const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const [grdDays, setGrdDays] = useState<Record<string, boolean>>({});
  const [expedienteDays, setExpedienteDays] = useState<Record<string, 'SV' | 'EXP'>>({});

  useEffect(() => {
    if (!obmContext || !userRg) return;

    const obmId = obmContext.replace(/\//g, '_').replace(/\s/g, '_');
    const normalizedObm = obmContext.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const rawRg = String(userRg).trim();
    
    const normalizeRg = (rg: string | number) => {
        const str = (rg || '').toString().trim().toUpperCase();
        const clean = str.replace(/[^A-Z0-9]/g, '');
        return clean.replace(/^0+/, '') || clean;
    };
    const userRgEscaped = normalizeRg(userRg);

    // We only need the month's key
    const monthKey = format(month, 'yyyy-MM');
    
    const docRef = doc(db, 'grd_configs', `${obmId}_${monthKey}`);
    const unsubGrd = onSnapshot(docRef, (snapshot) => {
       if (snapshot.exists()) {
           const daysData = snapshot.data().days || {};
           setGrdDays(prev => {
              const updated = { ...prev };
              Object.keys(daysData).forEach(dateStr => {
                   const rgs = daysData[dateStr] || [];
                   const normalizedGrdRgs = rgs.map((r: string) => normalizeRg(r));
                   updated[dateStr] = normalizedGrdRgs.includes(userRgEscaped);
              });
              return updated;
           });
       }
    });

    const expDocRef = doc(db, `expediente_${normalizedObm}`, monthKey);
    const unsubExp = onSnapshot(expDocRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data();
            const selections = data.selections || {};
            const exp = data.expedienteDays || {};
            
            setExpedienteDays(prev => {
                const updated = { ...prev };
                
                // Flexible RG matching
                const matchedKeys = Object.keys(selections).filter(k => normalizeRg(k) === userRgEscaped);
                const matchedExpKeys = Object.keys(exp).filter(k => normalizeRg(k) === userRgEscaped);
                
                matchedKeys.forEach(key => {
                   (selections[key] || []).forEach((d: string) => { updated[d] = 'SV'; });
                });
                matchedExpKeys.forEach(key => {
                   (exp[key] || []).forEach((d: string) => { updated[d] = 'EXP'; });
                });
                
                return updated;
            });
        }
    });

    return () => {
        unsubGrd();
        unsubExp();
    };
  }, [obmContext, userRg, month]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden flex flex-col"
    >
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-7 mb-4 text-center">
          {weekdays.map((wd, i) => (
            <div key={i} className="text-[10px] font-black text-slate-300 uppercase">
              {wd}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {days.map((day) => {
            const ala = getAlaForDate(day);
            const outsideMonth = !isSameMonth(day, month);
            const isToday = isSameDay(day, new Date());
            const isMyAla = userAla && ala.toString() === userAla.toString();
            const dateStr = format(day, 'yyyy-MM-dd');
            const isGrd = grdDays[dateStr];
            const expedienteStatus = expedienteDays[dateStr];
            
            return (
              <motion.div 
                key={day.toISOString()}
                whileHover={!outsideMonth ? { scale: 1.05, y: -2 } : {}}
                onClick={() => !outsideMonth && onDateSelect(day)}
                className={cn(
                  "relative aspect-square flex flex-col items-center justify-center rounded-lg text-[11px] sm:text-xs font-mono font-bold transition-all cursor-pointer border-2",
                  outsideMonth ? "opacity-0 pointer-events-none" : getAlaBg(ala),
                  isMyAla && !outsideMonth && !expedienteStatus && "ring-4 ring-amber-400 ring-opacity-20 shadow-[0_0_15px_rgba(251,191,36,0.5)] z-10 border-amber-200",
                  expedienteStatus === 'SV' && !outsideMonth && "ring-[5px] ring-indigo-500 ring-opacity-50 shadow-[0_0_20px_rgba(79,70,229,0.5)] z-20 border-indigo-400 bg-indigo-50/50",
                  expedienteStatus === 'EXP' && !outsideMonth && "ring-[5px] ring-emerald-500 ring-opacity-50 shadow-[0_0_20px_rgba(16,185,129,0.5)] z-20 border-emerald-400 bg-emerald-50/50"
                )}
              >
                {(isMyAla || expedienteStatus) && !outsideMonth && (
                   <div className={cn(
                       "absolute inset-0 rounded-lg animate-pulse-slow",
                       expedienteStatus === 'SV' ? "bg-indigo-500/20" : 
                       expedienteStatus === 'EXP' ? "bg-emerald-500/20" : "bg-white/20"
                   )} />
                )}

                {/* Shield background if user is in GRD */}
                {isGrd && !outsideMonth && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-10">
                     <Shield className="w-full h-full fill-indigo-500 text-indigo-500" />
                  </div>
                )}
                
                <span className={cn(
                  "z-10",
                  !outsideMonth ? ( (isMyAla || expedienteStatus) ? "text-slate-900 font-black" : "text-slate-600") : "text-slate-400",
                  isGrd && !outsideMonth ? "text-indigo-900" : "",
                  expedienteStatus === 'SV' ? "text-indigo-900" : "",
                  expedienteStatus === 'EXP' ? "text-emerald-900" : ""
                )}>
                  {format(day, 'd')}
                </span>
                
                {!outsideMonth && (
                  <div className={cn(
                      "mt-1.5 w-1.5 h-1.5 rounded-full z-10", 
                      getAlaColor(ala), 
                      isGrd ? "bg-indigo-600" : "",
                      expedienteStatus === 'SV' ? "bg-indigo-600" :
                      expedienteStatus === 'EXP' ? "bg-emerald-600" : ""
                  )} />
                )}

                {expedienteStatus && !outsideMonth && (
                    <div className={cn(
                        "absolute top-0.5 left-0.5 px-1 rounded-[2px] z-30",
                        expedienteStatus === 'SV' ? "bg-indigo-600" : "bg-emerald-600"
                    )}>
                        <span className="text-[6px] font-black text-white leading-none">{expedienteStatus}</span>
                    </div>
                )}
                
                {isToday && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full border-2 border-white shadow-sm z-20 scale-75 sm:scale-100" />
                )}
                
                {isGrd && !outsideMonth && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full flex items-center justify-center shadow-sm z-30">
                     <Shield className="w-2 h-2 text-white" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
      
      <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center mt-auto">
         <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">2026</span>
         <div className="flex gap-1.5">
            {[1,2,3,4].map(a => (
              <div 
                key={a} 
                title={`Legenda Ala ${a}`}
                className={cn(
                  "w-2 h-2 rounded-full", 
                  getAlaColor(a),
                  userAla.toString() === a.toString() && "ring-2 ring-white ring-offset-2 ring-offset-slate-200"
                )} 
              />
            ))}
         </div>
      </div>
    </motion.div>
  );
}
