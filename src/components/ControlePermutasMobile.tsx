import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, PermutaRequest, PermutaStatus } from '../types';
import { Check, X, Star, CalendarDays, Undo2, ArrowRightLeft, Activity, Users, Loader2, ChevronDown, ChevronUp, FastForward, Info, Eye } from 'lucide-react';
import { cn, getAlaForDate, getOppositeAla } from '../lib/utils';
import { RankInsignia } from './RankInsignia';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMilitars } from '../contexts/MilitarContext';
import { isOfficer } from '../lib/rankUtils';
import { cleanUndefined } from "../lib/utils";

interface ControlePermutasMobileProps {
  user: UserProfile;
  obmContext: string;
}

function getCapabilities(m: UserProfile) {
  return [
    {
      active: m.ativoCondutor,
      label: "Motorista",
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
      items: [
        ...(m.viaturas?.ABT ? ["ABT"] : []),
        ...(m.viaturas?.ABSL ? ["ABSL"] : []),
        ...(m.viaturas?.ASE ? ["ASE"] : []),
        ...(m.viaturas?.AR ? ["AR"] : []),
        ...(m.viaturas?.ARC ? ["ARC"] : []),
        ...(m.ativoEncarregado ? ["ENCARR."] : []),
        ...(m.ativoAbastecedor ? ["ABAST."] : []),
      ],
    },
    {
      active: m.ativoChefeGua,
      label: "Chefe",
      color: "bg-blue-100 text-blue-700 border-blue-200",
      items: [
        ...(m.chefeAbt ? ["ABT"] : []),
        ...(m.chefeAbsl ? ["ABSL"] : []),
      ],
    },
    {
      active: m.ativoMaritimo,
      label: "Marítimo",
      color: "bg-cyan-100 text-cyan-700 border-cyan-200",
      items: [
        ...(m.mestreAl ? ["MESTRE AL"] : []),
        ...(m.mestreBia ? ["MESTRE BIA"] : []),
        ...(m.opAma ? ["OP. AMA"] : []),
        ...(m.gvAma ? ["GV AMA"] : []),
        ...(m.marinheiros ? ["MARINHEIRO"] : []),
      ],
    },
    {
      active: m.ativoEnfermeiro,
      label: "Enfermeiro",
      color: "bg-rose-100 text-rose-700 border-rose-200",
      items: [],
    },
    {
      active: m.ativoComunicante,
      label: "Comunicante",
      color: "bg-amber-100 text-amber-700 border-amber-200",
      items: [],
    },
    {
      active: m.ativoGraduado,
      label: "Graduado",
      color: "bg-purple-100 text-purple-700 border-purple-200",
      items: [
        ...(m.adjunto ? ["ADJUNTO"] : []),
        ...(m.sgtDia ? ["SGT DIA"] : []),
        ...(m.cmtGuarda ? ["CMT GUARDA"] : []),
        ...(m.disponivel1 ? ["DISP 1"] : []),
        ...(m.disponivel2 ? ["DISP 2"] : []),
      ],
    },
    {
      active: m.ativoCbsSds,
      label: "Sentinela/CbDia",
      color: "bg-indigo-100 text-indigo-700 border-indigo-200",
      items: [
        ...(m.faxina ? ["FAXINA"] : []),
        ...(m.sentinela ? ["SENTINELA"] : []),
        ...(m.deposito ? ["DEPÓSITO"] : []),
        ...(m.toqueDeFogo ? ["TQ FOGO"] : []),
        ...(m.auxRancho ? ["AUX RANCHO"] : []),
        ...(m.cbGuarda ? ["CB GUARDA"] : []),
        ...(m.cbDia ? ["CB DIA"] : []),
        ...(m.disponivelCbsSds ? ["DISP"] : []),
      ],
    },
    {
      active: m.ativoAuxiliar,
      label: "Auxiliar VTR",
      color: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
      items: [
        ...(m.auxAbt ? ["ABT"] : []),
        ...(m.auxAbsl ? ["ABSL"] : []),
        ...(m.auxArc ? ["ARC"] : []),
        ...(m.auxAse ? ["ASE"] : []),
        ...(m.disponivelAux ? ["DISP"] : []),
      ],
    },
  ];
}

// Inline Capabilities View
function CapabilitiesView({ militar, otherMilitar }: { militar: UserProfile | undefined; otherMilitar?: UserProfile | undefined }) {
  if (!militar) return <div className="text-xs text-slate-400 p-2 text-center">Nenhum dado encontrado para as funções.</div>;
  
  const mCapabilities = getCapabilities(militar);
  const otherCapabilities = otherMilitar ? getCapabilities(otherMilitar) : null;
  
  let commonSubItemsCount = 0;

  const capabilitiesWithCommonFlags = mCapabilities.filter(c => c.active).map(cap => {
    const otherCap = otherCapabilities?.find(oc => oc.label === cap.label && oc.active);
    
    // Check missing subitems - if both are active but no items exist, it's 1 common parent
    const isParentCommon = !!otherCap && cap.items.length === 0 && otherCap.items.length === 0;

    const items = cap.items.map(item => {
      const isCommon = otherCap ? otherCap.items.includes(item) : false;
      if (isCommon) commonSubItemsCount++;
      return { text: item, isCommon };
    });

    return {
      ...cap,
      isParentCommon,
      items
    };
  });

  return (
    <div className="w-full mt-2 pt-2 border-t border-slate-200/50 flex flex-col gap-1.5">
      <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-0.5">
        <Star className="w-2.5 h-2.5" /> Funções Operacionais
      </h3>
      {capabilitiesWithCommonFlags.length === 0 ? (
        <div className="text-center py-2 text-slate-500 text-[10px] font-bold bg-white/50 rounded-lg border border-slate-100">
          Nenhuma função operacional cadastrada.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {capabilitiesWithCommonFlags.map(cap => (
            <div key={cap.label} className={cn("p-2 rounded-lg border flex flex-col relative", cap.color, cap.isParentCommon && "bg-yellow-100 border-yellow-300 text-yellow-900")}>
               <div className="font-black uppercase tracking-wider text-[11px] leading-none mb-1">{cap.label}</div>
               {cap.items.length > 0 && (
                 <div className="flex flex-wrap gap-1 mt-1">
                   {cap.items.map(item => (
                     <span 
                        key={item.text} 
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest leading-none border", 
                          item.isCommon 
                            ? "bg-yellow-300 text-yellow-900 border-yellow-400 shadow-[0_1px_4px_-1px_rgba(234,179,8,0.5)]" 
                            : "bg-white/50 border-transparent shadow-none"
                        )}
                     >
                       {item.text}
                     </span>
                   ))}
                 </div>
               )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ControlePermutasMobile({ user, obmContext }: ControlePermutasMobileProps) {
  const [activeTab, setActiveTab] = useState<'pendentes' | 'facilitadas'>('pendentes');
  const [permutas, setPermutas] = useState<PermutaRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'dashboard' | 'swipe'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [queue, setQueue] = useState<PermutaRequest[]>([]);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  
  // Local state for 'facilitadas' mapping to structure the idea
  const [facilitadasIds, setFacilitadasIds] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  
  const { militars } = useMilitars();

  const matchMilitar = (id?: string | null, rg?: string | null, name?: string | null) => {
    if (id) {
       const m = militars.find(mil => mil.uid === id);
       if (m) return m;
    }
    if (rg) {
       const r = String(rg).replace(/\D/g, '');
       const m = militars.find(mil => mil.rg && String(mil.rg).replace(/\D/g, '') === r);
       if (m) return m;
    }
    if (name) {
      const sName = name.toLowerCase().trim();
      return militars.find(mil => 
        (mil.name && mil.name.toLowerCase().trim() === sName) || 
        (mil.warName && mil.warName.toLowerCase().trim() === sName)
      );
    }
    return undefined;
  };

  useEffect(() => {
    // Fetch pending permutas for this OBM
    const q = query(
      collection(db, 'permutas'),
      where('status', '==', PermutaStatus.PENDING)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PermutaRequest));
      
      // Filter logically: same OBM, BOTH signed
      const filtered = data.filter(p => 
        (p.obm === obmContext || p.obm === '10º GBM' || !p.obm) && 
        p.requesterSigned && 
        p.substituteSigned
      );
      
      setPermutas(filtered);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => unsub();
  }, [obmContext]);

  // Group by month: format "yyyy-MM"
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, PermutaRequest[]> = {};
    permutas.forEach(p => {
      const monthKey = p.date.substring(0, 7); // e.g., "2026-06"
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(p);
    });
    // Sort keys logically
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {} as Record<string, PermutaRequest[]>);
  }, [permutas]);

  const startSwiping = (monthKey: string) => {
    const monthPermutas = groupedByMonth[monthKey] || [];
    setSelectedMonth(monthKey);
    setQueue(monthPermutas);
    setViewMode('swipe');
  };

  const handleAction = async (action: 'deferir' | 'indeferir', currentCard: PermutaRequest) => {
    if (!currentCard.id) return;
    
    setDirection(action === 'deferir' ? 'right' : 'left');
    
    // Optimistic UI Removal
    setTimeout(() => {
      setQueue(prev => prev.filter(p => p.id !== currentCard.id));
      setDirection(null);
    }, 300);

    try {
      const newStatus = action === 'deferir' ? PermutaStatus.ACCEPTED : PermutaStatus.REJECTED;
      
      await updateDoc(doc(db, 'permutas', currentCard.id), cleanUndefined({
              status: newStatus,
              acceptedById: user.uid,
              acceptedByName: user.name,
              updatedAt: Date.now()
            }));
      // FireStore listener will naturally keep `permutas` updated 
    } catch (error) {
      console.error("Erro ao alterar permuta", error);
    }
  };

  const handleSkip = (currentCard: PermutaRequest) => {
    if (!currentCard.id) return;
    
    // Animate it away (we can use right or left or down, let's use right)
    setDirection('right');
    
    // Move to end of queue or just remove from current session
    setTimeout(() => {
      setQueue(prev => {
        const filtered = prev.filter(p => p.id !== currentCard.id);
        return [...filtered, currentCard]; // Move to end of line
      });
      setIsExpanded(false);
      setDirection(null);
    }, 300);
  };

  const toggleFacilitada = (pairKey: string) => {
    setFacilitadasIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pairKey)) newSet.delete(pairKey);
      else newSet.add(pairKey);
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="w-full max-w-md h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-2" />
        <span className="text-xs font-bold uppercase tracking-widest">Carregando Permutas...</span>
      </div>
    );
  }

  if (viewMode === 'dashboard') {
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
                    onClick={() => startSwiping(monthKey)}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-pink-300 hover:shadow-md transition-all flex items-center justify-between group text-left"
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
  }

  // --- SWIPE MODE ---
  const filteredQueue = queue.filter(p => {
    const pairKey = `${p.requesterId}-${p.substituteId}`;
    const isFac = facilitadasIds.has(pairKey);
    return activeTab === 'facilitadas' ? isFac : !isFac;
  });

  const currentCard = filteredQueue[0];

  return (
    <div className="w-full max-w-md h-full flex flex-col bg-slate-100 sm:border-x sm:border-slate-800 relative overflow-hidden">
      
      {/* App Header Mobile */}
      <div className="bg-white px-4 py-3 border-b border-slate-200 flex flex-col gap-2 shrink-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setViewMode('dashboard')}
              className="p-1 -ml-1 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-md"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight truncate max-w-[150px]">
              {selectedMonth ? format(parseISO(selectedMonth + '-01'), 'MMMM yyyy', { locale: ptBR }) : ''}
            </h2>
          </div>
          <span className="text-[10px] font-bold bg-pink-100 text-pink-700 px-2 py-0.5 rounded uppercase tracking-widest">{filteredQueue.length} Pendentes</span>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab('pendentes')}
            className={cn(
              "flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all",
              activeTab === 'pendentes' ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
             Fila Principal
          </button>
          <button
            onClick={() => setActiveTab('facilitadas')}
            className={cn(
              "flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1",
              activeTab === 'facilitadas' ? "bg-amber-100 text-amber-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Star className="w-3 h-3" /> Facilitadas
          </button>
        </div>
      </div>

      {/* Main Tinder Area */}
      <div className="flex-1 relative overflow-y-auto overflow-x-hidden w-full flex flex-col bg-slate-100">
        <div className="w-full h-fit min-h-full flex flex-col items-center justify-start p-4 pb-12">
          <AnimatePresence mode="popLayout">
            {currentCard ? (
              <motion.div
                key={currentCard.id}
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ 
                scale: 1, 
                opacity: 1, 
                y: 0,
                x: direction === 'left' ? -200 : direction === 'right' ? 200 : 0,
                rotate: direction === 'left' ? -15 : direction === 'right' ? 15 : 0
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.9,
                transition: { duration: 0.2 }
              }}
              className="w-full max-w-[400px] mx-auto bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 flex flex-col overflow-hidden shrink-0"
            >
              {/* Card Header */}
              <div className="bg-slate-800 text-white p-4 flex justify-between items-center relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <ArrowRightLeft className="w-24 h-24" />
                </div>
                <div className="z-10">
                  <div className="flex flex-col gap-0.5 mb-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest bg-emerald-100 rounded px-1.5 py-0.5">
                        Ala {getAlaForDate(parseISO(currentCard.date))}
                      </span>
                      <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest bg-indigo-100 rounded px-1.5 py-0.5">
                        GRD {getOppositeAla(getAlaForDate(parseISO(currentCard.date)))}
                      </span>
                    </div>
                  </div>
                  <div className="text-xl font-black tracking-tight leading-none mb-1">
                    {format(parseISO(currentCard.date), 'dd/MM/yyyy')}
                  </div>
                  <div className="text-[11px] text-slate-300 capitalize font-medium flex items-center gap-2">
                    {format(parseISO(currentCard.date), 'EEEE', { locale: ptBR })}
                  </div>
                </div>
                
                <button 
                  onClick={() => toggleFacilitada(`${currentCard.requesterId}-${currentCard.substituteId}`)}
                  className="z-10 bg-slate-700 hover:bg-slate-600 p-2 rounded-full transition-colors"
                  title="Marcar como Permuta Facilitada para o futuro"
                >
                  <Star className={cn("w-5 h-5", facilitadasIds.has(`${currentCard.requesterId}-${currentCard.substituteId}`) ? "fill-amber-400 text-amber-400" : "text-slate-400")} />
                </button>
              </div>

              {/* Contexto Estrutural do Dia (A Implementar) */}
              <div className="bg-slate-50 p-3 grid grid-cols-2 gap-x-2 gap-y-3 border-b border-slate-100 text-[10px] shrink-0">
                
                <div className="flex flex-col gap-0.5">
                  <div className="font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Star className="w-3 h-3 text-indigo-400" /> Oficial de Dia
                  </div>
                  <div className="font-bold text-slate-700 truncate">A definir (Busca futura)</div>
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Users className="w-3 h-3 text-cyan-500" /> GRDs Escala
                  </div>
                  <div className="font-bold text-slate-700">0 Cadastrados</div>
                </div>

                <div className="flex flex-col gap-0.5 col-span-2 mt-1">
                  <div className="font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Activity className="w-3 h-3 text-amber-500" /> Alertas Sistêmicos da Permuta
                  </div>
                  <div className="flex gap-2 mt-1">
                     <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-black uppercase shadow-sm">Interstício OK</span>
                     <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-black uppercase shadow-sm">Efetivo OK</span>
                  </div>
                </div>

              </div>

              {/* Card Body - Swap Details */}
              <div className="p-4 flex flex-col gap-4 flex-1">
                <div className="flex flex-col gap-3">
                  
                  {/* SAI */}
                  <div 
                    className="shrink-0 bg-red-50/80 border border-red-100 rounded-2xl p-4 flex flex-col relative w-full overflow-hidden shadow-sm"
                  >
                    <div className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-widest text-red-500 opacity-80 z-10 flex items-center gap-1">
                       Sai
                    </div>
                    
                    <div className="flex flex-col w-full relative z-0">
                      {(() => {
                        const m = matchMilitar(currentCard.requesterId, currentCard.requesterRg, currentCard.requesterName);
                        const fallbackRank = currentCard.requesterName?.split(' ')[0] || '-';
                        const fallbackName = currentCard.requesterName?.split(' ').slice(1).join(' ') || '-';
                        return (
                          <div className="flex items-center gap-3 w-full mt-2">
                            <div className="w-12 flex items-center justify-center shrink-0">
                              <RankInsignia rankStr={m?.rank || fallbackRank} className="scale-[1.15] origin-center" />
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-[11px] font-bold text-slate-500 uppercase leading-none mb-1">
                                {m?.rank || fallbackRank}
                              </span>
                              <span className="text-sm font-black text-slate-800 uppercase tracking-wider leading-none">
                                {m?.warName || fallbackName}
                              </span>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                {(m?.rg || currentCard.requesterRg) && (
                                  <span className="text-[10px] font-bold text-slate-400 font-mono">
                                    RG: {m?.rg || currentCard.requesterRg}
                                  </span>
                                )}
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-200/80 px-1.5 py-0.5 rounded">
                                  {m?.quadro?.toUpperCase() || 'S/Q'}
                                </span>
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-200/80 px-1.5 py-0.5 rounded">
                                  Ala {currentCard.originalAla}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      
                      {isExpanded && (
                        <CapabilitiesView 
                           militar={matchMilitar(currentCard.requesterId, currentCard.requesterRg, currentCard.requesterName)}
                           otherMilitar={matchMilitar(currentCard.substituteId, currentCard.substituteRg, currentCard.substituteName)}
                        />
                      )}
                    </div>
                  </div>
                  
                  <div className="shrink-0 text-slate-300 flex justify-center -my-3 z-10 relative">
                    <div className="bg-white rounded-full p-1.5 px-2 border border-slate-100 shadow-sm flex items-center gap-1.5">
                      {(() => {
                        const reqM = matchMilitar(currentCard.requesterId, currentCard.requesterRg, currentCard.requesterName);
                        const subM = matchMilitar(currentCard.substituteId, currentCard.substituteRg, currentCard.substituteName);
                        
                        let common = 0;
                        if (reqM && subM) {
                          // Motorista
                          if (reqM.ativoCondutor && subM.ativoCondutor) {
                            if (reqM.viaturas?.ABT && subM.viaturas?.ABT) common++;
                            if (reqM.viaturas?.ABSL && subM.viaturas?.ABSL) common++;
                            if (reqM.viaturas?.ASE && subM.viaturas?.ASE) common++;
                            if (reqM.viaturas?.AR && subM.viaturas?.AR) common++;
                            if (reqM.viaturas?.ARC && subM.viaturas?.ARC) common++;
                          }
                          if (reqM.ativoEncarregado && subM.ativoEncarregado) common++;
                          if (reqM.ativoAbastecedor && subM.ativoAbastecedor) common++;

                          // Chefe Gua
                          if (reqM.ativoChefeGua && subM.ativoChefeGua) {
                            if (reqM.chefeAbt && subM.chefeAbt) common++;
                            if (reqM.chefeAbsl && subM.chefeAbsl) common++;
                          }

                          // Marítimo
                          if (reqM.ativoMaritimo && subM.ativoMaritimo) {
                            if (reqM.mestreAl && subM.mestreAl) common++;
                            if (reqM.mestreBia && subM.mestreBia) common++;
                            if (reqM.opAma && subM.opAma) common++;
                            if (reqM.gvAma && subM.gvAma) common++;
                            if (reqM.marinheiros && subM.marinheiros) common++;
                          }

                          // Enfermeiro e Comunicante (Não tem sub-funções)
                          if (reqM.ativoEnfermeiro && subM.ativoEnfermeiro) common++;
                          if (reqM.ativoComunicante && subM.ativoComunicante) common++;

                          // Graduado
                          if (reqM.ativoGraduado && subM.ativoGraduado) {
                            if (reqM.adjunto && subM.adjunto) common++;
                            if (reqM.sgtDia && subM.sgtDia) common++;
                            if (reqM.cmtGuarda && subM.cmtGuarda) common++;
                            if (reqM.disponivel1 && subM.disponivel1) common++;
                            if (reqM.disponivel2 && subM.disponivel2) common++;
                          }

                          // Cbs e Sds (Sentinela/CbDia)
                          if (reqM.ativoCbsSds && subM.ativoCbsSds) {
                            if (reqM.faxina && subM.faxina) common++;
                            if (reqM.sentinela && subM.sentinela) common++;
                            if (reqM.deposito && subM.deposito) common++;
                            if (reqM.toqueDeFogo && subM.toqueDeFogo) common++;
                            if (reqM.auxRancho && subM.auxRancho) common++;
                            if (reqM.cbGuarda && subM.cbGuarda) common++;
                            if (reqM.cbDia && subM.cbDia) common++;
                            if (reqM.disponivelCbsSds && subM.disponivelCbsSds) common++;
                          }

                          // Auxiliar VTR
                          if (reqM.ativoAuxiliar && subM.ativoAuxiliar) {
                            if (reqM.auxAbt && subM.auxAbt) common++;
                            if (reqM.auxAbsl && subM.auxAbsl) common++;
                            if (reqM.auxArc && subM.auxArc) common++;
                            if (reqM.auxAse && subM.auxAse) common++;
                            if (reqM.disponivelAux && subM.disponivelAux) common++;
                          }
                        }

                        if (common > 0) {
                          return (
                            <>
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[10px] font-black bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full uppercase tracking-widest whitespace-nowrap border border-yellow-200">
                                {common}
                              </span>
                            </>
                          );
                        } else if (reqM && subM) {
                           return (
                            <>
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[10px] font-black bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full uppercase tracking-widest whitespace-nowrap border border-slate-200">
                                0
                              </span>
                            </>
                          );
                        }
                        return (
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </div>
                        );
                      })()}

                      <span className="w-px h-4 bg-slate-200 mx-1"></span>

                      <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* ENTRA */}
                  <div 
                    className="shrink-0 bg-emerald-50/80 border border-emerald-100 rounded-2xl p-4 flex flex-col relative w-full overflow-hidden shadow-sm"
                  >
                    <div className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-widest text-emerald-600 opacity-80 z-10 flex items-center gap-1">
                       Entra
                    </div>
                    
                    <div className="flex flex-col w-full relative z-0">
                      {(() => {
                         const m = matchMilitar(currentCard.substituteId, currentCard.substituteRg, currentCard.substituteName);
                         const fallbackRank = currentCard.substituteName?.split(' ')[0] || '-';
                         const fallbackName = currentCard.substituteName?.split(' ').slice(1).join(' ') || '-';
                         return (
                           <div className="flex items-center gap-3 w-full mt-2">
                             <div className="w-12 flex items-center justify-center shrink-0">
                               <RankInsignia rankStr={m?.rank || fallbackRank} className="scale-[1.15] origin-center" />
                             </div>
                             <div className="flex flex-col text-left">
                               <span className="text-[11px] font-bold text-slate-500 uppercase leading-none mb-1">
                                 {m?.rank || fallbackRank}
                               </span>
                               <span className="text-sm font-black text-slate-800 uppercase tracking-wider leading-none">
                                 {m?.warName || fallbackName}
                               </span>
                               <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                 {(m?.rg || currentCard.substituteRg) && (
                                   <span className="text-[10px] font-bold text-slate-400 font-mono">
                                     RG: {m?.rg || currentCard.substituteRg}
                                   </span>
                                 )}
                                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-emerald-200/50 px-1.5 py-0.5 rounded">
                                   {m?.quadro?.toUpperCase() || 'S/Q'}
                                 </span>
                                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-emerald-200/50 px-1.5 py-0.5 rounded">
                                   Ala {m?.ala || 'S/A'}
                                 </span>
                               </div>
                             </div>
                           </div>
                         );
                      })()}
                      
                      {isExpanded && (
                        <CapabilitiesView 
                          militar={matchMilitar(currentCard.substituteId, currentCard.substituteRg, currentCard.substituteName)} 
                          otherMilitar={matchMilitar(currentCard.requesterId, currentCard.requesterRg, currentCard.requesterName)}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-100 w-full flex-shrink-0" />

                {/* Historicos */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Histórico Operacional Estimado
                  </h3>
                  
                  {/* Pair Stats - STRUCTURE ONLY */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="text-[11px] font-bold text-slate-700 mb-2 truncate">Parceria: {currentCard.requesterName?.split(' ')[0]} ↔ {currentCard.substituteName?.split(' ')[0]}</div>
                    <div className="flex gap-4">
                      <div>
                         {/* Defaulting to 0/100 until logic is built */}
                        <div className="text-lg font-black text-indigo-600 leading-none">0</div>
                        <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1">Permutas Realizadas</div>
                      </div>
                      <div>
                        <div className="text-lg font-black text-emerald-600 leading-none">100%</div>
                        <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1">Taxa Deferimento</div>
                      </div>
                    </div>
                  </div>

                  {/* Position Stats (Entrante) - STRUCTURE ONLY */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="text-[11px] font-bold text-slate-700 mb-2 truncate">Substituto na Função (A implementar):</div>
                    <div className="flex gap-4">
                      <div>
                        <div className="text-lg font-black text-amber-600 leading-none">0</div>
                        <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1">Serviços na Função</div>
                      </div>
                      <div>
                        <div className="text-lg font-black text-emerald-600 leading-none">100%</div>
                        <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1">Assiduidade</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center text-slate-400 gap-3"
            >
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200">
                <Check className="w-8 h-8 text-slate-300" />
              </div>
              <div className="text-center font-bold text-sm">
                Fila limpa na aba {activeTab}.<br/>
                <span className="text-xs font-normal">Todas as opções avaliadas!</span>
              </div>
              <button 
                onClick={() => setViewMode('dashboard')}
                className="mt-4 px-4 py-2 bg-white text-indigo-600 text-xs font-black uppercase tracking-widest rounded-xl border border-indigo-100 hover:bg-indigo-50 flex items-center gap-2 transition-colors"
              >
                <Undo2 className="w-4 h-4" /> Voltar ao Painel
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        {currentCard && (
          <div className="w-full pt-8 pb-4 shrink-0 flex justify-center items-center gap-4 sm:gap-6 z-10">
            <button 
              disabled={!currentCard}
          onClick={() => currentCard && handleAction('indeferir', currentCard)}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border-2 border-red-100 border-b-[4px] text-red-500 flex items-center justify-center hover:bg-red-50 hover:border-red-200 hover:-translate-y-1 active:translate-y-0 active:border-b-2 disabled:opacity-50 disabled:grayscale transition-all shadow-sm"
          title="Indeferir"
        >
          <X className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={3} />
        </button>
        
        <button 
          disabled={!currentCard}
          onClick={() => currentCard && handleSkip(currentCard)}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white border-2 border-slate-200 border-b-[4px] text-slate-500 flex items-center justify-center hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-1 active:translate-y-0 active:border-b-2 disabled:opacity-50 disabled:grayscale transition-all shadow-sm"
          title="Pular"
        >
          <FastForward className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={3} />
        </button>

        <button 
          disabled={!currentCard}
          onClick={() => currentCard && handleAction('deferir', currentCard)}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border-2 border-emerald-100 border-b-[4px] text-emerald-500 flex items-center justify-center hover:bg-emerald-50 hover:border-emerald-200 hover:-translate-y-1 active:translate-y-0 active:border-b-2 disabled:opacity-50 disabled:grayscale transition-all shadow-sm"
          title="Deferir"
        >
          <Check className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={3} />
        </button>
          </div>
        )}
        </div>
      </div>
      
    </div>
  );
}

