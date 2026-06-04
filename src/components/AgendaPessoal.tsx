import React, { memo, useState, useMemo, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAlaForDate, getAlaColor, getAlaLightColor, cn } from '../lib/utils';
import { generateICS } from '../lib/exportUtils';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, Briefcase, Coffee, ArrowRightLeft, CalendarOff, MessageSquare, Info, CalendarDays, Megaphone, CalendarSearch, Download } from 'lucide-react';
import { UserProfile, PermutaRequest } from '../types';
import { Simulador48x144 } from './Simulador48x144';
import { MuralAvisos } from './MuralAvisos';
import { DayDetailsModal } from './DayDetailsModal';

import { useMuralAvisos } from '../hooks/useMuralAvisos';
import { useAppConfig } from '../contexts/ConfigContext';

interface AgendaPessoalProps {
  user: UserProfile;
  onDateSelect?: (date: Date) => void;
  onBack?: () => void;
  standalone?: boolean;
}

// Temporary Mock Data for UI presentation
const MOCK_AFASTAMENTOS = [
  { id: '1', type: 'Férias', start: new Date(2026, 0, 10), end: new Date(2026, 0, 20) }
];
const MOCK_LEMBRETES = [
  { id: '1', date: new Date(2026, 0, 5), text: 'Instrução de Resgate' },
  { id: '2', date: new Date(2026, 0, 15), text: 'Levar Uniforme de Prontidão' }
];

export const AgendaPessoal = memo(function AgendaPessoal({ user, onDateSelect, onBack, standalone }: AgendaPessoalProps) {
  const months = Array.from({ length: 12 }, (_, i) => new Date(new Date().getFullYear(), i, 1));
  const [isDashboardExpanded, setIsDashboardExpanded] = useState(standalone ? true : false);
  const [isSimuladorOpen, setIsSimuladorOpen] = useState(false);
  const [openMonths, setOpenMonths] = useState<number[]>([]);
  const [showPastMonths, setShowPastMonths] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedDayIsWorking, setSelectedDayIsWorking] = useState(false);
  const [showOnlyMyServices, setShowOnlyMyServices] = useState(false);
  const [personalTodos, setPersonalTodos] = useState<{ date: Date, id: string }[]>([]);
  const [institutionalEvents, setInstitutionalEvents] = useState<{ date: Date, title: string }[]>([]);
  const [userPermutas, setUserPermutas] = useState<{ date: Date, type: string, status: string }[]>([]);

  const { avisos } = useMuralAvisos();
  const { activeMonths: ctxActiveMonths } = useAppConfig();

  useEffect(() => {
    if (!user?.rg) return;
    let isMounted = true;
    
    // Instead of polling /api/agenda with a 1-hour cache, we use onSnapshot for real-time updates!
    const year = new Date().getFullYear();
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    const q = query(
      collection(db, 'permutas'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (!isMounted) return;
      
      const safeRg = String(user.rg).replace(/\D/g, '');
      const allPermutas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      const userPerms = allPermutas.filter(p => {
        const strReq = String(p.requesterRg).replace(/\D/g, '');
        const strSub = String(p.substituteRg).replace(/\D/g, '');
        return strReq === safeRg || strSub === safeRg;
      });
      
      const parsed = userPerms.map(p => {
        const type = (String(p.requesterRg).replace(/\D/g, '') === safeRg) ? 'PAGOU' : 'COBREU';
        return {
          date: new Date(p.date + 'T00:00:00'),
          type,
          status: p.status
        };
      });

      const activePermutas = parsed.filter(p => p.status !== 'cancelled' && p.status !== 'rejected');
      setUserPermutas(activePermutas);
    });
    
    return () => { 
      isMounted = false; 
      unsub();
    };
  }, [user?.rg]);


  useEffect(() => {
    if (ctxActiveMonths) {
      setOpenMonths(ctxActiveMonths.map(Number));
    }
  }, [ctxActiveMonths]);

  useEffect(() => {
    const qTodos = collection(db, `users/${user.rg}/todos`);
    const unsubTodos = onSnapshot(qTodos, (snap) => {
      const todosData = snap.docs.map(doc => {
         const data = doc.data();
         // using 'T12:00:00' to avoid timezone shift saving
         return { id: doc.id, date: data.date ? new Date(data.date + 'T12:00:00') : new Date() };
      });
      setPersonalTodos(todosData);
    });

    return () => unsubTodos();
  }, [user.rg]);

  useEffect(() => {
    const events: { date: Date, title: string }[] = [];
    avisos.forEach(aviso => {
      if (aviso.eventDate) {
        events.push({ title: aviso.texto, date: new Date(aviso.eventDate + 'T12:00:00') });
      }
    });
    setInstitutionalEvents(events);
  }, [avisos]);

  const { servicosRestantes, totalServicos, folgasRestantes, totalFolgas, permutaBalance, allYearServices, permutasEsteMes } = useMemo(() => {
    let servicosTotais = 0;
    let servicosFeitos = 0;
    let folgasTotais = 0;
    let folgasFeitas = 0;
    const start = new Date(new Date().getFullYear(), 0, 1);
    const end = new Date(new Date().getFullYear(), 11, 31);
    const today = new Date();
    today.setHours(0,0,0,0);
    const days = eachDayOfInterval({ start, end });
    const allYearServices: Date[] = [];
    
    days.forEach(day => {
      let isMyAla = user.ala && getAlaForDate(day).toString() === user.ala.toString();
      
      userPermutas.forEach(p => {
        if (isSameDay(p.date, day)) {
           if (p.type === 'COBREU') isMyAla = true;
           if (p.type === 'PAGOU') isMyAla = false;
        }
      });

      if (isMyAla) {
        servicosTotais++;
        allYearServices.push(day);
        if (isBefore(day, today)) servicosFeitos++;
      } else {
        folgasTotais++;
        if (isBefore(day, today)) folgasFeitas++;
      }
    });

    const saldo = userPermutas.filter(p => p.type === 'COBREU').length - userPermutas.filter(p => p.type === 'PAGOU').length;
    const permutasEsteMesVal = userPermutas.filter(p => isSameMonth(p.date, new Date())).length;

    return {
      servicosRestantes: servicosTotais - servicosFeitos,
      totalServicos: servicosTotais,
      folgasRestantes: folgasTotais - folgasFeitas,
      totalFolgas: folgasTotais,
      permutaBalance: saldo,
      allYearServices,
      permutasEsteMes: permutasEsteMesVal
    };
  }, [user.ala, userPermutas]);

  const handleSyncCalendar = () => {
    if (!user.ala) {
      alert("Configuração de ala não encontrada para gerar escala.");
      return;
    }
    const events = allYearServices.map(day => {
      // 08:00 of the day to 08:00 next day
      const eventStart = new Date(day);
      eventStart.setHours(8, 0, 0, 0);
      const eventEnd = new Date(day);
      eventEnd.setDate(eventEnd.getDate() + 1);
      eventEnd.setHours(8, 0, 0, 0);

      return {
        title: `Serviço ${user.ala}ª Ala`,
        start: eventStart,
        end: eventEnd,
        description: `Serviço de prontidão 24h - Ala ${user.ala}`
      };
    });
    
    generateICS(events, `escala_24hx72h_${user.rg}_${new Date().getFullYear()}`);
    alert("Calendário ICS gerado com sua escala anual. Você pode importar no Google Calendar ou Apple Calendar.");
  };

  return (
    <div id="agenda-pessoal" className="flex flex-col gap-0 mb-8 border-2 border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
      <div 
        onClick={() => !standalone && setIsDashboardExpanded(!isDashboardExpanded)}
        className={cn("w-full flex items-center justify-between p-6 transition-colors", !standalone ? "hover:bg-slate-50 cursor-pointer focus:outline-none" : "")}
      >
        <div className="flex items-center gap-4">
          {standalone && onBack && (
             <button 
                onClick={(e) => { e.stopPropagation(); onBack(); }}
                className="bg-slate-100 p-3 rounded-xl border border-slate-200 hover:bg-slate-200 transition-colors mr-2"
                title="Voltar"
             >
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
             </button>
          )}
          <div className="bg-amber-100 p-3 rounded-xl border border-amber-200">
             <CalendarOff className="w-6 h-6 text-amber-700" />
          </div>
          <div className="text-left">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
               Agenda Operacional / Pessoal
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">
              Acompanhe sua escala de serviço, permutas e folgas
            </p>
          </div>
        </div>
        {!standalone && (
          <div className={`p-2 rounded-full transition-colors ${isDashboardExpanded ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
             <svg className={`w-5 h-5 transition-transform duration-300 ${isDashboardExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
          </div>
        )}
      </div>

      <motion.div 
        initial={false}
        animate={{ height: isDashboardExpanded ? 'auto' : 0, opacity: isDashboardExpanded ? 1 : 0 }}
        className="overflow-hidden"
      >
        <div className="p-4 sm:p-6 bg-slate-50 flex flex-col gap-6">
          
          <MuralAvisos isAdminOrEscalante={!!(user.isAdmin || user.isEscalante)} userName={user.name} />

          {/* Resumo Operacional (Bento Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-200 pb-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Serviços Ano</p>
                <p className="text-2xl font-black text-slate-800">
                   {servicosRestantes} <span className="text-sm text-slate-400">faltam de {totalServicos}</span>
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 relative">
                <ArrowRightLeft className="w-6 h-6" />
                {permutasEsteMes >= 6 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" title="Limite Mensal Atingido"></span>}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Permutas Mês / Saldo Ano</p>
                <p className="text-2xl font-black text-slate-800 flex items-baseline gap-2">
                   <span className={cn(permutasEsteMes > 4 ? "text-amber-500" : "", permutasEsteMes >= 6 ? "text-red-500" : "")}>{permutasEsteMes}/6</span>
                   <span className="text-sm font-bold text-slate-400 border-l border-slate-300 pl-2">
                     {permutaBalance > 0 ? `+${permutaBalance}` : permutaBalance} Saldo
                   </span>
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Coffee className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Folgas Ano</p>
                <p className="text-2xl font-black text-slate-800">
                  {folgasRestantes} <span className="text-sm text-slate-400">restam de {totalFolgas}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Seção de Controles Extras (Afastamentos e Lembretes) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col xl:flex-row gap-4 items-center justify-between">
             <div className="flex items-center gap-3">
                 <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                     <CalendarOff className="w-5 h-5" />
                 </div>
                 <div>
                    <h3 className="font-black text-sm uppercase text-slate-800">Afastamentos e Exportação</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Sua agenda local com opções de nuvem.</p>
                 </div>
             </div>
             <div className="flex flex-wrap items-center justify-center gap-2">
                 <button 
                    onClick={handleSyncCalendar}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-300 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded shadow-sm hover:bg-slate-200 transition"
                 >
                     <Download className="w-3.5 h-3.5" />
                     Sincronizar Celular (.ics)
                 </button>
                 <button 
                    onClick={() => setIsSimuladorOpen(true)}
                    className="px-4 py-2 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded shadow-sm hover:bg-slate-700 transition"
                 >
                     Simular 48x144
                 </button>
                 <button className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded shadow-sm hover:bg-indigo-700 transition">
                     Novo Afastamento
                 </button>
             </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-2 border-b border-slate-100">
             <div className="bg-slate-800 text-white rounded-xl p-3 flex items-center gap-3 shadow-md w-full md:w-auto">
                <Info className="w-5 h-5 text-amber-400" />
                <p className="text-xs font-medium">Ícones: <span className="bg-amber-400 w-2 h-2 inline-block rounded-full mx-1"></span> Pessoal, <span className="bg-red-500 w-2 h-2 inline-block rounded-full mx-1"></span> Oficial, dias <span className="text-indigo-300 font-bold mx-1">Roxo</span> são afastamentos.</p>
             </div>
             <label className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm hover:bg-slate-50 w-full md:w-auto justify-center">
               <input 
                 type="checkbox"
                 checked={showOnlyMyServices}
                 onChange={(e) => setShowOnlyMyServices(e.target.checked)}
                 className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
               />
               <span className="text-xs font-black uppercase tracking-widest text-slate-700">Ver Apenas Meus Serviços</span>
             </label>
          </div>

          {/* Meses Calendário Grid */}
          <div className="flex flex-col gap-6">
             {/* Past Months Section (Hidden by default on mobile) */}
             {(() => {
                const now = new Date();
                const pastMonths = months.filter(m => isBefore(m, startOfMonth(now)));
                const currentAndFutureMonths = months.filter(m => !isBefore(m, startOfMonth(now)));

                if (pastMonths.length === 0) {
                    return (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
                            {currentAndFutureMonths.map((month) => {
                              const isOpen = openMonths.includes(month.getMonth());
                              return (
                                <MonthGrid 
                                  key={month.getMonth()} 
                                  month={month} 
                                  userAla={user.ala} 
                                  onDateSelect={(date, isWorking) => {
                                     setSelectedDay(date);
                                     setSelectedDayIsWorking(isWorking);
                                  }}
                                  mockAfastamentos={MOCK_AFASTAMENTOS}
                                  mockLembretes={personalTodos}
                                  mockPermutas={userPermutas}
                                  institutionalEvents={institutionalEvents}
                                  isOpenMonth={isOpen}
                                  showOnlyMyServices={showOnlyMyServices}
                                />
                              );
                            })}
                        </div>
                    );
                }

                return (
                    <>
                        <div className="md:hidden flex flex-col items-center border-b border-slate-200 pb-4 mb-2">
                           <button 
                              onClick={() => setShowPastMonths(!showPastMonths)}
                              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-colors duration-200"
                           >
                              {showPastMonths ? (
                                  <>Ocultar meses anteriores <ChevronUp className="w-4 h-4 text-slate-500" /></>
                              ) : (
                                  <>Ver meses que já passaram <ChevronDown className="w-4 h-4 text-slate-500" /></>
                              )}
                           </button>
                        </div>
                        
                        <AnimatePresence>
                            {showPastMonths && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start mb-6 border-b border-dashed border-slate-200 pb-6 opacity-60">
                                        {pastMonths.map((month) => {
                                          const isOpen = openMonths.includes(month.getMonth());
                                          return (
                                            <MonthGrid 
                                              key={month.getMonth()} 
                                              month={month} 
                                              userAla={user.ala} 
                                              onDateSelect={(date, isWorking) => {
                                                 setSelectedDay(date);
                                                 setSelectedDayIsWorking(isWorking);
                                              }}
                                              mockAfastamentos={MOCK_AFASTAMENTOS}
                                              mockLembretes={personalTodos}
                                              mockPermutas={userPermutas}
                                              institutionalEvents={institutionalEvents}
                                              isOpenMonth={isOpen}
                                              showOnlyMyServices={showOnlyMyServices}
                                            />
                                          );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        
                        {/* Always show past months on desktop, but allow the toggle on mobile */}
                        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start mb-6 border-b border-dashed border-slate-200 pb-6 opacity-60">
                             {pastMonths.map((month) => {
                               const isOpen = openMonths.includes(month.getMonth());
                               return (
                                 <MonthGrid 
                                   key={month.getMonth()} 
                                   month={month} 
                                   userAla={user.ala} 
                                   onDateSelect={(date, isWorking) => {
                                      setSelectedDay(date);
                                      setSelectedDayIsWorking(isWorking);
                                   }}
                                   mockAfastamentos={MOCK_AFASTAMENTOS}
                                   mockLembretes={personalTodos}
                                   mockPermutas={userPermutas}
                                   institutionalEvents={institutionalEvents}
                                   isOpenMonth={isOpen}
                                   showOnlyMyServices={showOnlyMyServices}
                                 />
                               );
                             })}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
                            {currentAndFutureMonths.map((month) => {
                              const isOpen = openMonths.includes(month.getMonth());
                              return (
                                <MonthGrid 
                                  key={month.getMonth()} 
                                  month={month} 
                                  userAla={user.ala} 
                                  onDateSelect={(date, isWorking) => {
                                     setSelectedDay(date);
                                     setSelectedDayIsWorking(isWorking);
                                  }}
                                  mockAfastamentos={MOCK_AFASTAMENTOS}
                                  mockLembretes={personalTodos}
                                  mockPermutas={userPermutas}
                                  institutionalEvents={institutionalEvents}
                                  isOpenMonth={isOpen}
                                  showOnlyMyServices={showOnlyMyServices}
                                />
                              );
                            })}
                        </div>
                    </>
                );
             })()}
          </div>

        </div>
      </motion.div>
      
      <Simulador48x144 
        isOpen={isSimuladorOpen}
        onClose={() => setIsSimuladorOpen(false)}
        user={user}
      />

      <DayDetailsModal 
         isOpen={selectedDay !== null}
         onClose={() => setSelectedDay(null)}
         date={selectedDay}
         userRg={user.rg}
         isWorkingDay={selectedDayIsWorking}
         onPermutaClick={(d) => {
            if (onDateSelect) {
                // If it came from props, we trigger the original behavior (like openPermutaRequest)
                onDateSelect(d);
            } else {
                alert("Nenhuma rota definida para permuta a partir daqui.");
            }
         }}
      />
    </div>
  );
});

interface MonthGridProps {
  month: Date;
  userAla?: string | number;
  onDateSelect?: (date: Date, isWorking: boolean) => void;
  mockAfastamentos: any[];
  mockLembretes: any[];
  mockPermutas: any[];
  institutionalEvents?: { date: Date, title: string }[];
  isOpenMonth?: boolean;
  showOnlyMyServices?: boolean;
}

const MonthGrid = memo(function MonthGrid({ month, userAla, onDateSelect, mockAfastamentos, mockLembretes, mockPermutas, institutionalEvents = [], isOpenMonth, showOnlyMyServices }: MonthGridProps) {
  const isPast = isBefore(endOfMonth(month), new Date());
  const [isCollapsed, setIsCollapsed] = useState(isPast); // Start collapsed if the month is past

  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

  const handleAgendarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    alert("Função 'Agendar Permuta' em desenvolvimento. Você poderá procurar permutas futuras aqui e elas ficarão pendentes até o mês abrir.");
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className={cn("bg-white rounded-xl border-2 shadow-sm overflow-hidden flex flex-col h-full", isOpenMonth ? "border-green-400" : "border-slate-200")}
    >
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn("text-slate-800 p-3 flex items-center justify-between font-black uppercase tracking-widest text-[12px] w-full border-b transition-colors", isOpenMonth ? "bg-green-50 border-green-100 hover:bg-green-100" : "bg-slate-50 border-slate-100 hover:bg-slate-100")}
      >
        <span className="flex-1 text-left px-2 flex items-center gap-2">
          {format(month, 'MMMM', { locale: ptBR })}
          {isOpenMonth && <span className="bg-green-500 text-white text-[8px] px-1.5 py-0.5 rounded-sm tracking-widest uppercase">Aberto</span>}
        </span>
        {isCollapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
      </button>
      
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-white"
          >
            <div className="p-3 flex-1">
              <div className="grid grid-cols-7 mb-2 px-1 text-center">
                {weekdays.map((wd) => (
                  <div key={wd} className="text-[9px] font-black text-slate-400 uppercase">
                    {wd}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1.5">
                {days.map((day) => {
                  const ala = getAlaForDate(day);
                  const outsideMonth = !isSameMonth(day, month);
                  const isToday = isSameDay(day, new Date());
                  
                  // Logical Checks
                  let isWorkingDay = userAla && ala.toString() === userAla.toString();
                  let isAfastamento = false;
                  let hasLembrete = false;
                  let hasInstitutionalEvent = false;
                  
                  mockAfastamentos.forEach(af => {
                    if (day >= af.start && day <= af.end) {
                      isAfastamento = true;
                      isWorkingDay = false; // Afastamento overrides work
                    }
                  });

                  mockLembretes.forEach(lem => {
                    if (isSameDay(lem.date, day)) hasLembrete = true;
                  });

                  institutionalEvents.forEach(ev => {
                    if (isSameDay(ev.date, day)) hasInstitutionalEvent = true;
                  });

                  mockPermutas.forEach(p => {
                    if (isSameDay(p.date, day)) {
                       if (p.type === 'COBREU') isWorkingDay = true;
                       if (p.type === 'PAGOU') isWorkingDay = false;
                    }
                  });
                  
                  const isWorkingDayFinal = isWorkingDay || isAfastamento;
                  const shouldHide = showOnlyMyServices && !isWorkingDayFinal && !outsideMonth;
                  
                  return (
                    <motion.div 
                      key={day.toISOString()}
                      whileHover={!outsideMonth && !shouldHide ? { scale: 1.05, zIndex: 20 } : {}}
                      onClick={(e) => {
                         if (!outsideMonth && !shouldHide) {
                             if (!isOpenMonth && !isPast) {
                                 handleAgendarClick(e);
                             } else if (onDateSelect) {
                                 onDateSelect(day, isWorkingDay);
                             }
                         }
                      }}
                      className={cn(
                        "relative aspect-square flex flex-col items-center justify-center rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer border sm:min-h-[44px]",
                        (outsideMonth || shouldHide)
                          ? "opacity-10 bg-slate-50 border-transparent text-transparent pointer-events-none" 
                          : "border-transparent hover:shadow-md",
                        isToday && !outsideMonth && !shouldHide && "ring-2 ring-slate-800 ring-offset-2",
                        !outsideMonth && !isAfastamento && !shouldHide && getAlaLightColor(ala),
                        isWorkingDay && !outsideMonth && !isAfastamento && !shouldHide && "shadow-md ring-2 ring-blue-500 ring-offset-1 flex flex-col pt-1",
                        isAfastamento && !outsideMonth && !shouldHide && "bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-300"
                      )}
                    >
                      <span className={cn(
                        "z-10",
                        !outsideMonth && !isAfastamento ? "text-slate-800 text-[13px] font-bold" : "text-slate-400",
                        isWorkingDay && !outsideMonth && !isAfastamento && "text-slate-900 font-black",
                        isAfastamento && "text-indigo-800 text-[13px] font-extrabold"
                      )}>
                        {format(day, 'd')}
                      </span>
                      
                      {!outsideMonth && !isAfastamento && !shouldHide && (
                        <div className={cn("w-1.5 h-1.5 rounded-full mt-1", getAlaColor(ala))} />
                      )}

                      {!outsideMonth && !shouldHide && (
                         <div className="flex gap-1 mt-0.5 z-10 w-full justify-center px-1">
                            {isWorkingDay && !isAfastamento && (
                               <span className="text-[6px] tracking-widest uppercase opacity-90 font-bold bg-black/5 text-slate-800 px-1 rounded-sm mt-0.5 inline-block truncate">Svc</span>
                            )}
                            {isAfastamento && (
                               <span className="text-[6px] tracking-widest uppercase opacity-90 font-bold bg-indigo-200/50 px-1 rounded-sm text-indigo-800 inline-block truncate">Afast</span>
                            )}
                         </div>
                      )}

                      {!outsideMonth && !shouldHide && hasLembrete && (
                        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-slate-800 border border-white shadow-sm z-20" title="Possui lembretes pessoais" />
                      )}

                      {!outsideMonth && !shouldHide && hasInstitutionalEvent && (
                        <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-red-500 border border-white shadow-sm z-20" title="Evento Institucional" />
                      )}

                    </motion.div>
                  );
                })}
              </div>
            </div>
            <div className="p-2 px-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-2 justify-between items-center text-[8px] font-black text-slate-400 uppercase tracking-widest">
               <span>2026</span>
               {!isOpenMonth && !isPast && (
                 <button 
                    onClick={handleAgendarClick}
                    className="flex items-center gap-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 hover:text-indigo-800 transition-colors px-2 py-1.5 rounded"
                  >
                    <CalendarSearch className="w-3 h-3" />
                    Agendar Permuta Futura
                 </button>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {isCollapsed && (
        <div className="p-2 text-center bg-slate-50">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2 py-0.5 rounded">Expandir Mês</span>
        </div>
      )}
    </motion.div>
  );
});
