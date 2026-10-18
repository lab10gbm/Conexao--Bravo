import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { UserProfile, PermutaRequest, PermutaStatus } from '../types';
import { Check, Star, Undo2, Loader2, AlertTriangle } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMilitars } from '../contexts/MilitarContext';
import { getUserObmAccess, normalizeObm, cn, cleanUndefined } from '../lib/utils';
import { useConflitosOperacionais } from '../hooks/useConflitosOperacionais';

import { PermutaMonthDashboard } from '../features/permutas/components/PermutaMonthDashboard';
import { PermutaSwipeCard } from '../features/permutas/components/PermutaSwipeCard';
import { PermutaActionButtons } from '../features/permutas/components/PermutaActionButtons';

interface ControlePermutasMobileProps {
  user: UserProfile;
  obmContext: string;
}

export function ControlePermutasMobile({ user, obmContext }: ControlePermutasMobileProps) {
  const [activeTab, setActiveTab] = useState<'pendentes' | 'facilitadas'>('pendentes');
  const [permutas, setPermutas] = useState<PermutaRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'dashboard' | 'swipe'>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [queue, setQueue] = useState<PermutaRequest[]>([]);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const [selectedSubFunctions, setSelectedSubFunctions] = useState<string[]>([]);
  
  const [facilitadasIds, setFacilitadasIds] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  
  const { militars } = useMilitars();

  useEffect(() => {
    const q = query(
      collection(db, 'permutas'),
      where('status', '==', PermutaStatus.PENDING)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PermutaRequest));
      
      const filtered = data.filter(p => 
        (getUserObmAccess(normalizeObm(obmContext), normalizeObm(obmContext) === 'GLOBAL').includes(normalizeObm(p.obm)) || !p.obm) && 
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
      const monthKey = p.date.substring(0, 7);
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(p);
    });
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

  // --- SWIPE QUEUE & ACTIVE CARD ---
  const filteredQueue = useMemo(() => {
    return queue.filter(p => {
      const pairKey = `${p.requesterId}-${p.substituteId}`;
      const isFac = facilitadasIds.has(pairKey);
      return activeTab === 'facilitadas' ? isFac : !isFac;
    });
  }, [queue, facilitadasIds, activeTab]);

  const currentCard = filteredQueue[0];

  const { checarConflito } = useConflitosOperacionais({
    obmContext,
    selectedDate: currentCard?.date,
  });

  const cardConflitos = useMemo(() => {
    if (!currentCard) return [];
    const reqConf = checarConflito(currentCard.requesterRg, currentCard.date, currentCard.id);
    const subConf = checarConflito(currentCard.substituteRg, currentCard.date, currentCard.id);
    return [...reqConf, ...subConf];
  }, [currentCard, checarConflito]);

  const hasBloqueio = useMemo(() => {
    return cardConflitos.some(c => c.bloqueante);
  }, [cardConflitos]);

  const handleAction = async (action: 'deferir' | 'indeferir', currentCard: PermutaRequest) => {
    if (!currentCard.id) return;
    
    if (action === 'deferir') {
      const bloqueios = cardConflitos.filter(c => c.bloqueante);
      if (bloqueios.length > 0) {
        const motivos = bloqueios.map(b => `• ${b.titulo}: ${b.detalhe}`).join('\n');
        const confirmou = window.confirm(
          `ALERTA OPERACIONAL:\nEsta permuta possui conflitos impeditivos detectados no sistema:\n\n${motivos}\n\nDeseja autorizar mesmo assim por determinação do Escalante?`
        );
        if (!confirmou) return;
      }
    }

    setDirection(action === 'deferir' ? 'right' : 'left');
    
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
        substituteFunctions: action === 'deferir' ? selectedSubFunctions : [],
        updatedAt: Date.now()
      }));
      
      setSelectedSubFunctions([]);
    } catch (error) {
      console.error("Erro ao alterar permuta", error);
    }
  };

  const handleSkip = (currentCard: PermutaRequest) => {
    if (!currentCard.id) return;
    setDirection('right');
    
    setTimeout(() => {
      setQueue(prev => {
        const filtered = prev.filter(p => p.id !== currentCard.id);
        return [...filtered, currentCard];
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
      <PermutaMonthDashboard
        groupedByMonth={groupedByMonth}
        obmContext={obmContext}
        onSelectMonth={startSwiping}
      />
    );
  }

  // --- SWIPE MODE RENDER ---
  return (
    <div className="w-full max-w-md h-full flex flex-col bg-slate-100 sm:border-x sm:border-slate-800 relative overflow-hidden">
      {/* App Header Mobile */}
      <div className="bg-white px-4 py-3 border-b border-slate-200 flex flex-col gap-2 shrink-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setViewMode('dashboard')}
              className="p-1 -ml-1 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-md cursor-pointer"
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
              "flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer",
              activeTab === 'pendentes' ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
             Fila Principal
          </button>
          <button
            onClick={() => setActiveTab('facilitadas')}
            className={cn(
              "flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer",
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
              <PermutaSwipeCard
                key={currentCard.id}
                currentCard={currentCard}
                direction={direction}
                facilitadasIds={facilitadasIds}
                toggleFacilitada={toggleFacilitada}
                isExpanded={isExpanded}
                setIsExpanded={setIsExpanded}
                selectedSubFunctions={selectedSubFunctions}
                setSelectedSubFunctions={setSelectedSubFunctions}
                militars={militars}
                conflitos={cardConflitos}
              />
            ) : (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
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
                  className="mt-4 px-4 py-2 bg-white text-indigo-600 text-xs font-black uppercase tracking-widest rounded-xl border border-indigo-100 hover:bg-indigo-50 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Undo2 className="w-4 h-4" /> Voltar ao Painel
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          {currentCard && (
            <div className="w-full flex flex-col items-center">
              {hasBloqueio && (
                <div className="w-full max-w-sm mt-3 px-3 py-2 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-[11px] font-bold flex items-center gap-2 shadow-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Atenção: Conflito impeditivo ativo (Férias/GRD/Afastamento).</span>
                </div>
              )}
              <PermutaActionButtons
                onIndeferir={() => handleAction('indeferir', currentCard)}
                onSkip={() => handleSkip(currentCard)}
                onDeferir={() => handleAction('deferir', currentCard)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
