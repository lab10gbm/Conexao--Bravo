import { getDoc, getDocs } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, collection, query, orderBy, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { motion } from 'motion/react';
import { UserProfile, PermutaRequest, PermutaStatus } from '../types';
import { ptBR } from 'date-fns/locale';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, isSameMonth, isSameDay, subDays } from 'date-fns';
import { AlertTriangle, Shield, X, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';

import { useAppConfig } from '../contexts/ConfigContext';
import { getAlaForDate, cn, getUserObmAccess, normalizeObm, getAlaColor, normalizeRg } from '../lib/utils';

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
      const filteredByObm = ofertas.filter(p => !p.archived && (!p.obm || getUserObmAccess(normalizeObm(obmContext), normalizeObm(obmContext) === 'GLOBAL').includes(normalizeObm(p.obm))));
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
      
      const filteredByObm = data.filter(p => !p.obm || getUserObmAccess(normalizeObm(obmContext), normalizeObm(obmContext) === 'GLOBAL').includes(normalizeObm(p.obm)));
      const safeRg = normalizeRg(user.rg);
      
      const pending = filteredByObm.filter(p => {
         const strReq = normalizeRg(p.requesterRg);
         const strSub = normalizeRg(p.substituteRg);
         if (p.status !== PermutaStatus.PENDING && p.status !== PermutaStatus.SCHEDULED) return false;
         
         const userIsReq = Boolean(safeRg && strReq === safeRg);
         const userIsSub = Boolean(safeRg && strSub === safeRg);
         
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
              user={user}
              userAla={user.ala}
              obmContext={obmContext}
              userRg={user.rg}
              onDateSelect={onDateClick} 
              onMonthSelect={onMonthSelect}
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

function matchesMilitar(
  user: UserProfile | undefined,
  targetRg?: string | number | null,
  targetId?: string | null,
  targetName?: string | null
): boolean {
  if (!user) return false;
  const userCleanRg = normalizeRg(user.rg);
  const targetCleanRg = normalizeRg(targetRg);

  if (userCleanRg && targetCleanRg && userCleanRg === targetCleanRg) {
    return true;
  }

  if (userCleanRg && targetId) {
    const idCleanRg = normalizeRg(targetId);
    if (idCleanRg && idCleanRg === userCleanRg) return true;
  }

  if (user.uid && targetId && user.uid === String(targetId)) {
    return true;
  }

  if (targetName && user.warName) {
    const tUpper = String(targetName).trim().toUpperCase();
    const wUpper = user.warName.trim().toUpperCase();
    if (wUpper.length >= 3 && tUpper.includes(wUpper)) {
      return true;
    }
  }

  return false;
}

export interface CalendarPermutaDay {
  type: 'SV_PERMUTA' | 'SV_PERMUTA_PENDING' | 'FOLGA_PERMUTA' | 'FOLGA_PERMUTA_PENDING';
  partnerName: string;
  partnerRg?: string;
  status: string;
  is24h: boolean;
  permutaId?: string;
}

interface MonthDetailProps {
  month: Date;
  user: UserProfile;
  userAla: string | number;
  obmContext?: string;
  userRg?: string;
  onDateSelect: (date: Date) => void;
  onMonthSelect?: (month: number) => void;
  key?: any;
}

export function MonthDetail({ month, user, userAla, obmContext, userRg, onDateSelect, onMonthSelect }: MonthDetailProps) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });
  const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const [grdDays, setGrdDays] = useState<Record<string, boolean>>({});
  const [rasDays, setRasDays] = useState<Record<string, boolean>>({});
  const [expedienteBaseDays, setExpedienteBaseDays] = useState<Record<string, 'SV' | 'EXP'>>({});
  const [permutaStatusDays, setPermutaStatusDays] = useState<Record<string, CalendarPermutaDay>>({});
  const [selectedDayPermutaInfo, setSelectedDayPermutaInfo] = useState<{ date: Date; info: CalendarPermutaDay } | null>(null);

  useEffect(() => {
    if (!obmContext || !userRg) return;

    const obmId = obmContext.replace(/\//g, '_').replace(/\s/g, '_');
    const normalizedObm = obmContext.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const userCleanRg = normalizeRg(userRg);

    // We only need the month's key
    const monthKey = format(month, 'yyyy-MM');
    
    const docRef = doc(db, 'grd_configs', `${obmId}_${monthKey}`);
    // --- RAS INTEGRATION ---
    const oppsQuery = query(collection(db, "ras_opportunities"), where("obm", "==", obmContext));
    const appsQuery = query(collection(db, "ras_applications"), where("militarRg", "==", userCleanRg));
    let oppsCache: any[] = [];
    let appsCache: any[] = [];
    const updateRasDays = () => {
       const newRasDays: Record<string, boolean> = {};
       appsCache.forEach(app => {
         if (app.status === "selected" || app.status === "completed") {
            const opp = oppsCache.find(o => o.id === app.rasId);
            if (opp && opp.date) {
               newRasDays[opp.date] = true;
            }
         }
       });
       setRasDays(newRasDays);
    };
    const unsubOpps = onSnapshot(oppsQuery, (snap) => {
       oppsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
       updateRasDays();
    });
    const unsubApps = onSnapshot(appsQuery, (snap) => {
       appsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
       updateRasDays();
    });
    // -----------------------
    const unsubGrd = onSnapshot(docRef, (snapshot) => {
       if (snapshot.exists()) {
           const daysData = snapshot.data().days || {};
           setGrdDays(prev => {
              const updated = { ...prev };
              Object.keys(daysData).forEach(dateStr => {
                   const rgs = daysData[dateStr] || [];
                   const normalizedGrdRgs = rgs.map((r: string) => normalizeRg(r));
                   updated[dateStr] = normalizedGrdRgs.includes(userCleanRg);
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
            const swapRequests = data.swapRequests || [];
            
            // 1. Set base days
            const baseUpdated: Record<string, 'SV' | 'EXP'> = {};
            const matchedKeys = Object.keys(selections).filter(k => normalizeRg(k) === userCleanRg);
            const matchedExpKeys = Object.keys(exp).filter(k => normalizeRg(k) === userCleanRg);
            
            matchedKeys.forEach(key => {
               (selections[key] || []).forEach((d: string) => { baseUpdated[d] = 'SV'; });
            });
            matchedExpKeys.forEach(key => {
               (exp[key] || []).forEach((d: string) => { baseUpdated[d] = 'EXP'; });
            });
            setExpedienteBaseDays(baseUpdated);

            // 2. Set internal permuta days
            swapRequests.forEach((req: any) => {
                const subMatches = matchesMilitar(user, req.toUserRg, req.toUserRg, req.toUserName);
                const reqMatches = matchesMilitar(user, req.rg, req.rg, req.userName);
                const isApproved = ['accepted', 'approved', 'scheduled'].includes(req.status);
                
                if (subMatches && req.toDay) {
                    setPermutaStatusDays(prev => ({
                        ...prev,
                        [req.toDay]: {
                            type: isApproved ? 'SV_PERMUTA' : 'SV_PERMUTA_PENDING',
                            partnerName: req.userName || 'Militar Solicitante',
                            partnerRg: req.rg,
                            status: req.status,
                            is24h: true,
                            permutaId: req.id
                        }
                    }));
                }
                if (reqMatches) {
                    if (isApproved && req.fromDay) {
                        setPermutaStatusDays(prev => ({
                            ...prev,
                            [req.fromDay]: {
                                type: 'FOLGA_PERMUTA',
                                partnerName: req.toUserName || 'Militar Substituto',
                                partnerRg: req.toUserRg,
                                status: req.status,
                                is24h: false,
                                permutaId: req.id
                            }
                        }));
                    }
                    if (isApproved && req.toDay) {
                        baseUpdated[req.toDay] = 'SV';
                    }
                }
            });
        }
    });

    // Fetch global permutas from 'permutas' collection covering this month
    const startDate = format(start, 'yyyy-MM-dd');
    const endDate = format(end, 'yyyy-MM-dd');
    
    const qPermutas = query(
        collection(db, 'permutas'),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
    );

    const unsubPermutas = onSnapshot(qPermutas, (snapshot) => {
        const globalPermutas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        
        setPermutaStatusDays(prev => {
            const pUpdated = { ...prev };
            
            globalPermutas.forEach((p: any) => {
                if (p.archived) return;
                const statusClean = String(p.status || '').toLowerCase().trim();
                if (statusClean === 'cancelled' || statusClean === 'rejected') return;

                const isSub = matchesMilitar(user, p.substituteRg, p.substituteId, p.substituteName) ||
                              matchesMilitar(user, p.acceptedById, p.acceptedById, p.acceptedByName);

                const isReq = matchesMilitar(user, p.requesterRg, p.requesterId, p.requesterName) ||
                              (p.submittedByRg && normalizeRg(p.submittedByRg) === userCleanRg);

                if (!isSub && !isReq) return;

                const dateStr = p.date || p.day;
                if (!dateStr || typeof dateStr !== 'string') return;

                const isApproved = statusClean === 'accepted' || statusClean === 'approved';
                const isPending = statusClean === 'pending' || statusClean === 'scheduled';

                if (isSub) {
                    // O militar substitui outro: ELE TRABALHA 24H NESTE DIA!
                    // Se deferida: SV_PERMUTA (Serviço 24h Deferido)
                    // Se pendente: SV_PERMUTA_PENDING (Serviço 24h Pendente de homologação)
                    const existing = pUpdated[dateStr];
                    if (!existing || isApproved || existing.type !== 'SV_PERMUTA') {
                        pUpdated[dateStr] = {
                            type: isApproved ? 'SV_PERMUTA' : 'SV_PERMUTA_PENDING',
                            partnerName: p.requesterName || (p.requesterRg ? `RG ${p.requesterRg}` : 'Militar Solicitante'),
                            partnerRg: p.requesterRg,
                            status: statusClean,
                            is24h: true,
                            permutaId: p.id
                        };
                    }
                } else if (isReq) {
                    // O militar solicitou substituto para passar seu serviço
                    // Se deferida: FOLGA_PERMUTA (Folga regulamentar)
                    // Se pendente: FOLGA_PERMUTA_PENDING (Plantão com permuta pendente)
                    const existing = pUpdated[dateStr];
                    if (!existing || (existing.type !== 'SV_PERMUTA' && existing.type !== 'SV_PERMUTA_PENDING')) {
                        pUpdated[dateStr] = {
                            type: isApproved ? 'FOLGA_PERMUTA' : 'FOLGA_PERMUTA_PENDING',
                            partnerName: p.substituteName || p.acceptedByName || (p.substituteRg ? `RG ${p.substituteRg}` : 'Militar Substituto'),
                            partnerRg: p.substituteRg,
                            status: statusClean,
                            is24h: false,
                            permutaId: p.id
                        };
                    }
                }
            });
            return pUpdated;
        });
    }, (error) => {
        console.error("Erro ao escutar permutas no MonthDetail:", error);
    });

    return () => {
      unsubOpps();
      unsubApps();
        unsubGrd();
        unsubExp();
        unsubPermutas();
    };
  }, [obmContext, userRg, month, user?.uid, user?.name, user?.warName]);

  return (
    <>
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
              const isGrd = grdDays[dateStr] || rasDays[dateStr];
              const pInfo = permutaStatusDays[dateStr];
              const baseStatus = expedienteBaseDays[dateStr];

              const isPermutaWorking24h = pInfo?.type === 'SV_PERMUTA';
              const isPermutaPending24h = pInfo?.type === 'SV_PERMUTA_PENDING';
              const isPermutaFolga = pInfo?.type === 'FOLGA_PERMUTA';
              const isPermutaReqPending = pInfo?.type === 'FOLGA_PERMUTA_PENDING';

              return (
                <motion.div 
                  key={day.toISOString()}
                  whileHover={!outsideMonth ? { scale: 1.05, y: -2 } : {}}
                  onClick={() => {
                    if (outsideMonth) return;
                    if (pInfo) {
                      setSelectedDayPermutaInfo({ date: day, info: pInfo });
                    } else {
                      onDateSelect(day);
                    }
                  }}
                  className={cn(
                    "relative aspect-square flex flex-col items-center justify-center rounded-lg text-[11px] sm:text-xs font-mono font-bold transition-all cursor-pointer border-2",
                    outsideMonth ? "opacity-0 pointer-events-none" : getAlaBg(ala),
                    
                    // PERMUTA DEFERIDA - TRABALHA 24H (PÚRPURA FORTE COM DESTAQUE MÁXIMO)
                    isPermutaWorking24h && !outsideMonth && "ring-[5px] ring-purple-600/70 border-2 border-purple-600 bg-purple-50 shadow-[0_0_22px_rgba(147,51,234,0.45)] z-20",

                    // PERMUTA PENDENTE - 24H PREVISTO (ÂMBAR COM BORDA TRACEJADA)
                    isPermutaPending24h && !outsideMonth && "ring-[4px] ring-amber-400/80 border-2 border-dashed border-amber-500 bg-amber-50 shadow-[0_0_18px_rgba(245,158,11,0.4)] z-20",

                    // FOLGA POR PERMUTA DEFERIDA (TEAL/VERDE)
                    isPermutaFolga && !outsideMonth && "border-2 border-teal-400 bg-teal-50/70 shadow-xs z-10",

                    // PERMUTA SOLICITADA PENDENTE (SEU SERVIÇO COM ALERTA)
                    isPermutaReqPending && !outsideMonth && "ring-3 ring-amber-400/70 border-2 border-dashed border-indigo-500 bg-indigo-50/60 z-15",

                    // EXPEDIENTE BASE: SV 24h
                    !pInfo && baseStatus === 'SV' && !outsideMonth && "ring-[5px] ring-indigo-500 ring-opacity-50 z-20 shadow-[0_0_20px_rgba(79,70,229,0.5)] border-indigo-400 bg-indigo-50/50",

                    // EXPEDIENTE BASE: EXP
                    !pInfo && baseStatus === 'EXP' && !outsideMonth && "ring-[5px] ring-emerald-500 ring-opacity-50 shadow-[0_0_20px_rgba(16,185,129,0.5)] z-20 border-emerald-400 bg-emerald-50/50",

                    // ALA REGULAR DE SERVIÇO (SE NÃO HOUVER PERMUTA/EXPEDIENTE)
                    !pInfo && !baseStatus && isMyAla && !outsideMonth && "ring-4 ring-indigo-500/40 border-2 border-indigo-400 bg-indigo-50/40 shadow-sm z-10"
                  )}
                >
                  {/* PULSAÇÃO DE FUNDO EM DIAS DE SERVIÇO / PERMUTA */}
                  {!outsideMonth && (
                    <>
                      {isPermutaWorking24h && (
                        <div className="absolute inset-0 rounded-lg animate-pulse-slow bg-purple-600/15 pointer-events-none" />
                      )}
                      {isPermutaPending24h && (
                        <div className="absolute inset-0 rounded-lg animate-pulse-slow bg-amber-500/15 pointer-events-none" />
                      )}
                      {isPermutaReqPending && (
                        <div className="absolute inset-0 rounded-lg animate-pulse-slow bg-amber-400/15 pointer-events-none" />
                      )}
                      {!pInfo && baseStatus === 'SV' && (
                        <div className="absolute inset-0 rounded-lg animate-pulse-slow bg-indigo-500/20 pointer-events-none" />
                      )}
                      {!pInfo && baseStatus === 'EXP' && (
                        <div className="absolute inset-0 rounded-lg animate-pulse-slow bg-emerald-500/20 pointer-events-none" />
                      )}
                      {!pInfo && !baseStatus && isMyAla && (
                        <div className="absolute inset-0 rounded-lg animate-pulse-slow bg-indigo-500/15 pointer-events-none" />
                      )}
                    </>
                  )}

                  {/* BADGES NO CANTO SUPERIOR ESQUERDO */}
                  {!outsideMonth && (
                    <>
                      {isPermutaWorking24h && (
                        <div 
                          className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded-[3px] z-30 bg-purple-700 text-white font-black text-[6.5px] leading-none shadow-xs flex items-center gap-0.5 uppercase tracking-tight"
                          title={`Serviço 24h · Permuta Deferida pelo Escalante (Substituindo ${pInfo.partnerName})`}
                        >
                          <span>SV 24H</span>
                        </div>
                      )}

                      {isPermutaPending24h && (
                        <div 
                          className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded-[3px] z-30 bg-amber-500 text-white font-black text-[6px] leading-none shadow-xs flex items-center gap-0.5 uppercase tracking-tight border border-amber-400"
                          title={`Serviço 24h · Permuta Pendente de Homologação (Substituindo ${pInfo.partnerName})`}
                        >
                          <span>24H PEND</span>
                        </div>
                      )}

                      {isPermutaFolga && (
                        <div 
                          className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded-[3px] z-30 bg-teal-600 text-white font-black text-[6px] leading-none shadow-xs uppercase tracking-tight"
                          title={`Folga Regulamentar · Permuta Deferida (Substituído por ${pInfo.partnerName})`}
                        >
                          <span>FOLGA</span>
                        </div>
                      )}

                      {isPermutaReqPending && (
                        <div 
                          className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded-[3px] z-30 bg-indigo-700 text-white font-black text-[5.5px] leading-none shadow-xs uppercase tracking-tight border border-amber-400"
                          title={`Seu Plantão · Permuta de Saída Pendente (Substituto: ${pInfo.partnerName})`}
                        >
                          <span>SV PEND</span>
                        </div>
                      )}

                      {!pInfo && baseStatus === 'SV' && (
                        <div 
                          className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded-[3px] z-30 bg-indigo-600 text-white font-black text-[6.5px] leading-none shadow-xs"
                          title="S.24h Mensal · Plantão Ordinário do Expediente"
                        >
                          <span>SV</span>
                        </div>
                      )}

                      {!pInfo && baseStatus === 'EXP' && (
                        <div 
                          className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded-[3px] z-30 bg-emerald-600 text-white font-black text-[6.5px] leading-none shadow-xs"
                          title="Expediente Regular"
                        >
                          <span>EXP</span>
                        </div>
                      )}

                      {!pInfo && !baseStatus && isMyAla && (
                        <div 
                          className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded-[3px] z-30 bg-indigo-600 text-white font-black text-[6.5px] leading-none shadow-xs"
                          title="Plantão 24h Regular da sua Ala"
                        >
                          <span>SV</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Shield background if user is in GRD */}
                  {isGrd && !outsideMonth && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                       <Shield className="w-full h-full fill-indigo-500 text-indigo-500" />
                    </div>
                  )}
                  
                  {/* NÚMERO DO DIA */}
                  <span className={cn(
                    "z-10 transition-colors",
                    outsideMonth ? "text-slate-400" :
                    isPermutaWorking24h ? "text-purple-950 font-black" :
                    isPermutaPending24h ? "text-amber-950 font-black" :
                    isPermutaFolga ? "text-teal-900 font-bold" :
                    isPermutaReqPending ? "text-indigo-950 font-black" :
                    baseStatus === 'SV' ? "text-indigo-900 font-black" :
                    baseStatus === 'EXP' ? "text-emerald-900 font-black" :
                    isMyAla ? "text-slate-900 font-black" : "text-slate-600"
                  )}>
                    {format(day, 'd')}
                  </span>
                  
                  {/* PONTO INDICADOR DO DIA */}
                  {!outsideMonth && (
                    <div className={cn(
                        "mt-1 w-1.5 h-1.5 rounded-full z-10 transition-all", 
                        isPermutaWorking24h ? "bg-purple-600 ring-2 ring-purple-200" :
                        isPermutaPending24h ? "bg-amber-500 ring-2 ring-amber-200" :
                        isPermutaFolga ? "bg-teal-500" :
                        isPermutaReqPending ? "bg-indigo-600 ring-2 ring-amber-300" :
                        baseStatus === 'SV' ? "bg-indigo-600" :
                        baseStatus === 'EXP' ? "bg-emerald-600" :
                        isGrd ? "bg-indigo-600" :
                        getAlaColor(ala)
                    )} />
                  )}

                  {/* MICRO-INDICADORES DE 24H */}
                  {!outsideMonth && isPermutaWorking24h && (
                    <span className="text-[5.5px] font-black uppercase text-purple-700 tracking-tighter leading-none mt-0.5 z-10">24h Def</span>
                  )}
                  {!outsideMonth && isPermutaPending24h && (
                    <span className="text-[5.5px] font-black uppercase text-amber-700 tracking-tighter leading-none mt-0.5 z-10">24h Pend</span>
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
        
        {/* LEGENDA OPERACIONAL DETALHADA NO RODAPÉ */}
        <div className="px-4 sm:px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex flex-col gap-3 mt-auto">
           <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Escala Operacional · {format(month, 'yyyy')}
              </span>
              <div className="flex items-center gap-1.5" title="Cores das Alas">
                {[1,2,3,4].map(a => (
                  <div 
                    key={a} 
                    title={`Ala ${a}`}
                    className={cn(
                      "w-2.5 h-2.5 rounded-full transition-transform", 
                      getAlaColor(a),
                      userAla && userAla.toString() === a.toString() && "ring-2 ring-slate-800 ring-offset-1 scale-110"
                    )} 
                  />
                ))}
              </div>
           </div>
           
           <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[9px] font-bold">
              <span className="flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-800 px-2 py-0.5 rounded shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0"></span> SV (S.24h Mensal / Plantão)
              </span>
              <span className="flex items-center gap-1 bg-purple-50 border border-purple-300 text-purple-900 px-2 py-0.5 rounded shadow-2xs font-black">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0"></span> SV 24h (Permuta Deferida)
              </span>
              <span className="flex items-center gap-1 bg-amber-50 border border-dashed border-amber-400 text-amber-900 px-2 py-0.5 rounded shadow-2xs font-black">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span> 24h (Permuta Pendente)
              </span>
              <span className="flex items-center gap-1 bg-rose-50 border border-rose-200 text-rose-800 px-2 py-0.5 rounded shadow-2xs font-black">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0"></span> EXTRA (Serviço Extra RAS)
              </span>
              <span className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"></span> EXP (Expediente)
              </span>
              <span className="flex items-center gap-1 bg-teal-50 border border-teal-200 text-teal-800 px-2 py-0.5 rounded shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0"></span> Folga (Permuta)
              </span>
           </div>
        </div>
      </motion.div>

      {/* MODAL DE DETALHAMENTO DO DIA COM PERMUTA */}
      {selectedDayPermutaInfo && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedDayPermutaInfo(null)}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "p-2 rounded-xl text-white shadow-xs",
                  selectedDayPermutaInfo.info.type === 'SV_PERMUTA' ? "bg-purple-600" :
                  selectedDayPermutaInfo.info.type === 'SV_PERMUTA_PENDING' ? "bg-amber-500" :
                  selectedDayPermutaInfo.info.type === 'FOLGA_PERMUTA' ? "bg-teal-600" : "bg-indigo-600"
                )}>
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">
                    Escala de Serviço · {format(selectedDayPermutaInfo.date, "dd 'de' MMMM", { locale: ptBR })}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Detalhamento do Plantão
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDayPermutaInfo(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={cn(
              "p-4 rounded-xl border flex flex-col gap-2",
              selectedDayPermutaInfo.info.type === 'SV_PERMUTA' ? "bg-purple-50/70 border-purple-200 text-purple-900" :
              selectedDayPermutaInfo.info.type === 'SV_PERMUTA_PENDING' ? "bg-amber-50/70 border-amber-200 text-amber-900" :
              selectedDayPermutaInfo.info.type === 'FOLGA_PERMUTA' ? "bg-teal-50/70 border-teal-200 text-teal-900" : "bg-indigo-50/70 border-indigo-200 text-indigo-900"
            )}>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                  selectedDayPermutaInfo.info.type === 'SV_PERMUTA' ? "bg-purple-600 text-white" :
                  selectedDayPermutaInfo.info.type === 'SV_PERMUTA_PENDING' ? "bg-amber-500 text-white" :
                  selectedDayPermutaInfo.info.type === 'FOLGA_PERMUTA' ? "bg-teal-600 text-white" : "bg-indigo-600 text-white"
                )}>
                  {selectedDayPermutaInfo.info.type === 'SV_PERMUTA' ? "Serviço 24h · Permuta Deferida" :
                   selectedDayPermutaInfo.info.type === 'SV_PERMUTA_PENDING' ? "Serviço 24h · Permuta Pendente" :
                   selectedDayPermutaInfo.info.type === 'FOLGA_PERMUTA' ? "Folga Regulamentar · Permuta Deferida" : "Seu Plantão · Permuta Pendente"}
                </span>
              </div>

              <p className="text-xs font-semibold leading-relaxed mt-1">
                {selectedDayPermutaInfo.info.type === 'SV_PERMUTA' && (
                  <>Você está escalado para trabalhar <strong>24 HORAS DE SERVIÇO</strong> neste dia através de permuta <strong>deferida pelo Escalante</strong>, substituindo o militar <strong>{selectedDayPermutaInfo.info.partnerName}</strong>.</>
                )}
                {selectedDayPermutaInfo.info.type === 'SV_PERMUTA_PENDING' && (
                  <>Você assumiu este plantão de <strong>24 HORAS DE SERVIÇO</strong> em substituição ao militar <strong>{selectedDayPermutaInfo.info.partnerName}</strong>. A solicitação está <strong>pendente de homologação pelo Escalante</strong> ou de assinaturas.</>
                )}
                {selectedDayPermutaInfo.info.type === 'FOLGA_PERMUTA' && (
                  <>Sua permuta foi <strong>deferida com sucesso</strong> pelo Escalante. Você foi substituído pelo militar <strong>{selectedDayPermutaInfo.info.partnerName}</strong> e está de <strong>folga regulamentar</strong>.</>
                )}
                {selectedDayPermutaInfo.info.type === 'FOLGA_PERMUTA_PENDING' && (
                  <>Você solicitou que o militar <strong>{selectedDayPermutaInfo.info.partnerName}</strong> substitua você neste plantão. Como ainda está <strong>pendente de deferimento</strong>, você deve permanecer de prontidão.</>
                )}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={() => {
                  const mIdx = selectedDayPermutaInfo.date.getMonth();
                  setSelectedDayPermutaInfo(null);
                  onMonthSelect?.(mIdx);
                  const el = document.getElementById('requests-board');
                  if (el) {
                    try { el.scrollIntoView({ behavior: 'smooth' }); } catch(e) { el.scrollIntoView(); }
                  }
                }}
                className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
              >
                <span>Ver Permutas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  const d = selectedDayPermutaInfo.date;
                  setSelectedDayPermutaInfo(null);
                  onDateSelect(d);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Abrir Formulário
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
