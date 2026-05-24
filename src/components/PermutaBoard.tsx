import { getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, updateDoc, doc, serverTimestamp, orderBy, addDoc, writeBatch, where } from 'firebase/firestore';
import { PermutaRequest, PermutaStatus, UserProfile } from '../types';
import { format, differenceInDays, startOfYear, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAlaColor, getAlaName, getAlaForDate, cn, calculateDeadline } from '../lib/utils';
import { MessageSquare, UserCheck, Trash2, CalendarDays, X, Check, RefreshCw, ExternalLink, AlertTriangle, PenTool, Clock, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PermutaBoardProps {
  user: UserProfile;
  obmContext: string;
  selectedMonth?: number | null;
  onMonthSelect?: (month: number) => void;
  onBack?: () => void;
  adminMode?: boolean;
}

export function PermutaBoard({ user, obmContext, selectedMonth, onMonthSelect, onBack, adminMode = false }: PermutaBoardProps) {
  const [permutas, setPermutas] = useState<PermutaRequest[]>(() => {
    const cached = localStorage.getItem('cache_permutas');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(true);
  const [signPermuta, setSignPermuta] = useState<PermutaRequest | null>(null);
  const [cancelPermuta, setCancelPermuta] = useState<PermutaRequest | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'mine'>('mine');

  useEffect(() => {
    // Safety timeout: if Firestore takes too long, stop loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 5000);

    let isMounted = true;
    
    async function loadPermutas() {
      try {
        const sixtyDaysAgo = format(subDays(new Date(), 60), 'yyyy-MM-dd');
        const q = query(
          collection(db, 'permutas'),
          where('date', '>=', sixtyDaysAgo),
          orderBy('date', 'asc')
        );
        const snapshot = await getDocs(q);
        
        clearTimeout(timer);
        if (!isMounted) return;
        
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as PermutaRequest[];
        
        const filteredByObm = data.filter(p => !p.obm || p.obm === obmContext || p.obm === '10º GBM');

        const filtered = adminMode ? filteredByObm : filteredByObm.filter(p => 
          p.status === PermutaStatus.ACCEPTED || 
          p.requesterId === (user?.uid || '') ||
          p.acceptedById === (user?.uid || '') ||
          p.requesterRg === (user?.rg || '') ||
          p.substituteRg === (user?.rg || '')
        );

        setPermutas(filtered);
        localStorage.setItem('cache_permutas', JSON.stringify(filtered));
        setLoading(false);
      } catch (error) {
        clearTimeout(timer);
        if (isMounted) {
            setLoading(false);
            handleFirestoreError(error, OperationType.LIST, 'permutas', false);
        }
      }
    }
    
    loadPermutas();

    return () => { 
        isMounted = false;
        clearTimeout(timer);
    };
  }, [user?.uid, user?.isAdmin, user?.rg]);

  const confirmSign = async () => {
    if (!signPermuta?.id) return;
    
    try {
      const isRequester = user?.rg && (signPermuta.requesterRg === user.rg);
      const isSubstitute = user?.rg && (signPermuta.substituteRg === user.rg);

      await updateDoc(doc(db, 'permutas', signPermuta.id), {
        requesterSigned: isRequester ? true : signPermuta.requesterSigned,
        substituteSigned: isSubstitute ? true : signPermuta.substituteSigned,
        updatedAt: serverTimestamp()
      }).catch(error => {
        handleFirestoreError(error, OperationType.UPDATE, `permutas/${signPermuta.id}`);
      });
      setSignPermuta(null);
    } catch (error) {
      console.error('Update Sign Error:', error);
    }
  };

  const confirmCancel = async () => {
    if (!cancelPermuta?.id) return;
    try {
      await updateDoc(doc(db, 'permutas', cancelPermuta.id), {
        status: PermutaStatus.CANCELLED,
        updatedAt: serverTimestamp()
      }).catch(error => {
        handleFirestoreError(error, OperationType.UPDATE, `permutas/${cancelPermuta.id}`);
      });
      setCancelPermuta(null);
    } catch (error) {
      console.error('Cancel Error:', error);
    }
  };

  const handleStatusChange = async (permuta: PermutaRequest, newStatus: PermutaStatus) => {
    if (!permuta.id) return;
    try {
      await updateDoc(doc(db, 'permutas', permuta.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      }).catch(error => {
        handleFirestoreError(error, OperationType.UPDATE, `permutas/${permuta.id}`);
      });
    } catch (error) {
      console.error('Update Status Error:', error);
    }
  };

  if (loading && permutas.length === 0) {
     return <div className="text-center py-20 font-black text-[10px] text-slate-400 uppercase animate-pulse tracking-widest">[ Sincronizando Quadro Operacional ]</div>;
  }

  const handleArchiveDay = async (itemsToArchive: PermutaRequest[]) => {
    if (!window.confirm('Arquivar todas as permutas deste dia?')) return;
    try {
      const batch = writeBatch(db);
      for (const p of itemsToArchive) {
        if (!p.id) continue;
        batch.update(doc(db, 'permutas', p.id), { archived: true, updatedAt: serverTimestamp() });
      }
      await batch.commit();
    } catch (error) {
      console.error('Error archiving permutas', error);
      handleFirestoreError(error, OperationType.UPDATE, 'permutas/batch-archive');
    }
  };

  const filteredPermutas = permutas.filter(p => {
    if (p.archived) return false;

    // Arquivar automaticamente permutas antigas (> 1 dia)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const permutaDate = new Date(p.date + 'T00:00:00');
    const diffTime = today.getTime() - permutaDate.getTime();
    if (diffTime > 1000 * 60 * 60 * 24) {
       return false;
    }

    if (selectedMonth != null && permutaDate.getMonth() !== selectedMonth) return false;
    if (filterMode === 'mine' && user?.rg) {
       return p.requesterRg === user.rg || p.substituteRg === user.rg;
    }
    return true;
  });

  const pendingMySignature = filteredPermutas.filter(p => 
    (p.status === PermutaStatus.PENDING || p.status === PermutaStatus.SCHEDULED) &&
    user?.rg && 
    ((p.requesterRg === user.rg && !p.requesterSigned) || 
     (p.substituteRg === user.rg && !p.substituteSigned))
  );

  // Group by date
  const grouped = filteredPermutas.reduce((acc, p) => {
    if (!acc[p.date]) acc[p.date] = [];
    acc[p.date].push(p);
    return acc;
  }, {} as Record<string, PermutaRequest[]>);

  if (Object.keys(grouped).length === 0 && pendingMySignature.length === 0) {
    return (
      <div id="permuta-board" className="flex flex-col gap-4">
        <div className="flex justify-between items-center bg-white p-3 rounded-lg border-2 border-slate-200 shadow-sm mx-auto w-full max-w-sm">
           <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-500">Filtrar Quadro</span>
           <div className="flex gap-2">
              <button
                 onClick={() => setFilterMode('all')}
                 className={cn("px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors", filterMode === 'all' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
              >
                 Todas
              </button>
              <button
                 onClick={() => setFilterMode('mine')}
                 className={cn("px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors", filterMode === 'mine' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
              >
                 Minhas
              </button>
           </div>
        </div>
        <div className="text-center py-12 text-slate-400 font-bold uppercase tracking-widest text-sm">
          Nenhuma permuta encontrada neste mês.
        </div>
      </div>
    );
  }

  // Sort grouped entries mapping dates with pending signatures for this user to top
  const sortedGroupedEntries = (Object.entries(grouped) as [string, PermutaRequest[]][]).sort((a, b) => {
    const aHasPending = a[1].some(p => (p.status === PermutaStatus.PENDING || p.status === PermutaStatus.SCHEDULED) && ((p.requesterRg === user?.rg && !p.requesterSigned) || (p.substituteRg === user?.rg && !p.substituteSigned)));
    const bHasPending = b[1].some(p => (p.status === PermutaStatus.PENDING || p.status === PermutaStatus.SCHEDULED) && ((p.requesterRg === user?.rg && !p.requesterSigned) || (p.substituteRg === user?.rg && !p.substituteSigned)));
    if (aHasPending && !bHasPending) return -1;
    if (!aHasPending && bHasPending) return 1;
    // Standard sort ascending by date
    return a[0].localeCompare(b[0]);
  });

  return (
    <div id="permuta-board" className="space-y-6">
      <div className="flex justify-between items-center bg-white p-3 rounded-lg border-2 border-slate-300 shadow-sm max-w-md">
         <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-600">Filtro de Exibição</span>
         <div className="flex gap-2">
            <button
               onClick={() => setFilterMode('all')}
               className={cn("px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors", filterMode === 'all' ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
            >
               Todas
            </button>
            <button
               onClick={() => setFilterMode('mine')}
               className={cn("px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors", filterMode === 'mine' ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
            >
               Minhas
            </button>
         </div>
      </div>
      {pendingMySignature.length > 0 && (
        <div className="bg-amber-100 border-2 border-amber-300 rounded-xl p-4 flex items-center justify-between shadow-sm animate-pulse-slow">
           <div className="flex items-center gap-4 text-amber-900">
             <div className="bg-amber-500 rounded-full p-2 text-white shadow-sm">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
             </div>
             <div>
                <h4 className="font-black text-sm uppercase tracking-tight">Assinatura Pendente no Mês Exibido</h4>
                <p className="font-bold text-[11px] opacity-80 uppercase tracking-widest leading-tight mt-0.5">
                   Você possui {pendingMySignature.length} solicitação(ões) de permuta aguardando <span className="font-black">sua assinatura</span>. A tabela com pendência foi movida para o topo.
                </p>
             </div>
           </div>
        </div>
      )}

      <div className="space-y-12">
        {sortedGroupedEntries.map(([date, items]) => {
          const dateObj = new Date(date + 'T00:00:00');
          const dayOfYear = differenceInDays(dateObj, startOfYear(dateObj)) + 1;
          const ala = getAlaForDate(dateObj);
          const hasPendingForMe = items.some(p => (p.status === PermutaStatus.PENDING || p.status === PermutaStatus.SCHEDULED) && ((p.requesterRg === user?.rg && !p.requesterSigned) || (p.substituteRg === user?.rg && !p.substituteSigned)));

          return (
            <div key={date} className="overflow-x-auto pb-4 no-scrollbar relative">
              <div className="sm:hidden mb-2 flex items-center gap-1.5 px-1">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Deslize para ver mais →</span>
              </div>
              <table className={cn("w-full table-fixed border-collapse border-2 shadow-xl text-[10px] uppercase font-bold min-w-[680px] sm:min-w-[800px]", hasPendingForMe ? "border-amber-400" : "border-[#1e293b]")}>
                  <thead>
                    {hasPendingForMe && (
                       <tr>
                         <td colSpan={9} className="bg-amber-100 text-amber-900 font-black text-center py-2 px-4 uppercase tracking-widest animate-pulse-slow border-b-2 border-amber-400 text-[9px]">
                            Assinatura Pendente Neste Dia
                         </td>
                       </tr>
                    )}
                    <tr className={cn(getAlaColor(ala), "text-slate-900 border-b-2 font-black", hasPendingForMe ? "border-amber-400" : "border-slate-900")}>
                       <th className={cn("border-r p-1.5 sm:p-2 text-center w-10 text-[11px] sm:text-sm font-black", hasPendingForMe ? "border-amber-400" : "border-slate-900")}>
                          {dayOfYear}
                       </th>
                       <th className="border-r border-slate-900 p-1.5 sm:p-2 text-center text-[11px] sm:text-sm font-black uppercase tracking-widest" colSpan={2}>
                          {getAlaName(ala)}
                       </th>
                       <th className="border-r border-slate-900 p-1.5 sm:p-2 text-center text-[10px] sm:text-sm font-black uppercase tracking-widest" colSpan={2}>
                          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                            <CalendarDays className="w-3 h-3 sm:w-4 h-4 opacity-75" />
                            <span className="hidden sm:inline">{format(dateObj, 'EEEE', { locale: ptBR })}</span>
                            <span className="sm:hidden">{format(dateObj, 'EEE', { locale: ptBR })}</span>
                          </div>
                       </th>
                       <th className="p-1.5 sm:p-2 px-2 sm:px-4" colSpan={4}>
                          <div className="flex justify-between items-center gap-2 sm:gap-3">
                            <div className="flex justify-center items-center gap-2 sm:gap-3 mx-auto">
                              <div className="bg-slate-900/10 text-slate-900 px-2 sm:px-3 py-0.5 sm:py-1 rounded text-[8px] sm:text-[11px] font-black tracking-widest flex items-center gap-1 whitespace-nowrap" title="Prazo limite para fechamento do tempo">
                                <Clock className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                                <span className="hidden sm:inline">PRAZO:</span> {format(calculateDeadline(dateObj), 'dd/MM HH:mm')}
                              </div>
                              <div className="font-black text-[11px] sm:text-sm tracking-[0.05em] sm:tracking-[0.15em] bg-white/50 px-2 sm:px-3 py-0.5 sm:py-1 rounded border border-slate-900/10 shadow-sm flex items-center whitespace-nowrap">
                                {format(dateObj, 'dd/MM/yyyy')}
                              </div>
                            </div>
                            {(user?.rg === '54444' || adminMode) && (
                              <button
                                onClick={() => handleArchiveDay(items)}
                                className="bg-slate-800 text-slate-100 hover:bg-slate-700 px-1.5 sm:px-2 py-0.5 sm:py-1 object-right rounded shadow flex items-center gap-1.5 text-[7px] sm:text-[10px] tracking-widest transition-colors whitespace-nowrap ml-auto"
                                title="Arquivar permutas deste dia"
                              >
                                <Archive className="w-2.5 h-2.5 sm:w-3 h-3" />
                                <span className="hidden sm:inline">Arquivar</span>
                              </button>
                            )}
                          </div>
                       </th>
                    </tr>
                    <tr className="bg-[#ced6e3] text-slate-900 border-b border-slate-900 text-[9px] sm:text-[10px] font-black italic">
                     <th className="border-r border-slate-900 py-1.5 sm:py-2 w-8 sm:w-10 text-center">✓</th>
                     <th className="border-r border-slate-900 py-1.5 sm:py-2 w-[12%] text-center">RG</th>
                     <th className="border-r border-slate-900 py-1.5 sm:py-2 text-center">SAI</th>
                     <th className="border-r border-slate-900 py-1.5 sm:py-2 w-8 sm:w-10 text-center uppercase text-[11px] sm:text-sm font-black">X</th>
                     <th className="border-r border-slate-900 py-1.5 sm:py-2 text-center">ENTRA</th>
                     <th className="border-r border-slate-900 py-1.5 sm:py-2 w-[12%] text-center">RG</th>
                     <th className="border-r border-slate-900 py-1.5 sm:py-2 w-8 sm:w-10 text-center">✓</th>
                     <th className="border-r border-slate-900 py-1.5 sm:py-2 w-[110px] sm:w-[140px] tracking-tighter text-center">STATUS</th>
                     <th className="py-1.5 sm:py-2 w-10 sm:w-12 text-center">RESP.</th>
                    </tr>
                  </thead>

                  <tbody>
                  {items.map((permuta) => {
                    const isRequester = user?.rg && permuta.requesterRg === user.rg;
                    const isSubstitute = user?.rg && permuta.substituteRg === user.rg;
                    const isEscalante = user?.rg === '54444' || adminMode;
                    const isMyTurnToSign = (isRequester && !permuta.requesterSigned) || (isSubstitute && !permuta.substituteSigned);
                    
                    const getStatusText = () => {
                      if (permuta.status === 'accepted') return 'DEFERIDO';
                      if (permuta.status === 'rejected') return 'INDEFERIDO';
                      if (permuta.status === 'cancelled') return 'CANCELADA';
                      const fullySigned = permuta.requesterSigned && permuta.substituteSigned;
                      if (permuta.status === 'scheduled') return fullySigned ? 'AGENDADO' : 'AGENDADO (PEND.)';
                      if (fullySigned) return 'EM ANÁLISE';
                      return '1/2 PENDENTE';
                    };

                    const getRowBgColor = () => {
                      if (permuta.status === 'cancelled') return 'opacity-40 grayscale bg-white';
                      if (permuta.status === 'scheduled') return 'bg-amber-50';
                      if (permuta.status === 'accepted') return 'bg-emerald-100';
                      if (permuta.status === 'rejected') return 'bg-red-100';
                      if (permuta.status === 'pending') {
                        if (permuta.requesterSigned && permuta.substituteSigned) return 'bg-yellow-100';
                        return 'bg-red-100';
                      }
                      return 'bg-white';
                    };

                    const getSelectBgColor = () => {
                      if (permuta.status === 'accepted') return 'bg-emerald-100 text-emerald-900 border-emerald-300';
                      if (permuta.status === 'rejected') return 'bg-red-100 text-red-900 border-red-300';
                      if (permuta.status === 'scheduled') return 'bg-amber-100 text-amber-900 border-amber-300';
                      if (permuta.status === 'pending') {
                        if (permuta.requesterSigned && permuta.substituteSigned) return 'bg-yellow-100 text-yellow-900 border-yellow-300';
                        return 'bg-red-100 text-red-900 border-red-300';
                      }
                      return 'bg-slate-50 text-slate-800 border-slate-200';
                    };

                    const canSelectStatus = isEscalante && permuta.status !== 'cancelled';

                    return (
                      <tr key={permuta.id} className={cn(
                        "border-b border-slate-300 hover:opacity-80 transition-colors h-12",
                        getRowBgColor()
                      )}>
                         <td className="border-r border-slate-300 p-1 text-center">
                            {permuta.requesterSigned ? (
                              <div className="w-5 h-5 bg-slate-900 rounded flex items-center justify-center mx-auto shadow-sm">
                                 <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                              </div>
                            ) : (
                              <div className="flex items-center justify-center">
                                <div className="w-5 h-5 border-2 border-slate-300 rounded mx-auto" />
                              </div>
                            )}
                         </td>
                         <td className="border-r border-slate-300 p-1 text-center font-mono bg-transparent text-slate-700 mix-blend-multiply">
                            {permuta.requesterRg}
                         </td>
                         <td className="border-r border-slate-300 p-2 text-center font-black tracking-tighter text-slate-900">
                            {permuta.requesterName}
                         </td>
                         <td className="border-r border-slate-300 p-1 text-center bg-transparent mix-blend-multiply align-middle">
                            <div className="flex items-center justify-center w-full h-full min-h-[32px]">
                               {(isRequester || isSubstitute || isEscalante) && permuta.status !== 'cancelled' ? (
                                 <button 
                                   onClick={() => setCancelPermuta(permuta)}
                                   className="w-7 h-7 flex items-center justify-center hover:bg-red-200 rounded-full transition-colors group mx-auto"
                                   title="Cancelar Permuta"
                                 >
                                   <X className="w-4 h-4 text-red-600 font-black stroke-[4] group-hover:scale-125 transition-transform" />
                                 </button>
                               ) : (
                                 <div className="w-7 h-7 flex items-center justify-center mx-auto">
                                   <X className="w-4 h-4 text-red-600 opacity-60 font-black stroke-[3]" />
                                 </div>
                               )}
                            </div>
                         </td>
                         <td className="border-r border-slate-300 p-2 text-center font-black tracking-tighter text-slate-900">
                            {permuta.acceptedByName || '-'}
                         </td>
                         <td className="border-r border-slate-300 p-1 text-center font-mono bg-transparent text-slate-700 mix-blend-multiply">
                            {permuta.substituteRg || '-'}
                         </td>
                         <td className="border-r border-slate-300 p-1 text-center relative group">
                            {permuta.substituteSigned ? (
                              <div className="w-5 h-5 bg-slate-900 rounded flex items-center justify-center mx-auto shadow-sm">
                                 <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-slate-300 rounded mx-auto" />
                              </div>
                            )}
                         </td>
                         <td className="border-r border-slate-300 p-1 text-center px-2 align-middle">
                           {isMyTurnToSign && permuta.status !== 'cancelled' ? (
                             <button
                               onClick={() => setSignPermuta(permuta)}
                               className="bg-indigo-600 w-full text-white px-2 py-1.5 rounded-[4px] text-[9px] font-black hover:bg-emerald-600 transition-all shadow-md active:scale-95 uppercase tracking-widest flex items-center justify-center gap-1"
                             >
                               <PenTool className="w-3 h-3" /> Assinar
                             </button>
                           ) : canSelectStatus ? (
                             <select 
                               className={cn(
                                 "w-[120px] border-2 rounded px-1 py-1 text-[8px] font-black uppercase outline-none focus:border-slate-500 cursor-pointer",
                                 getSelectBgColor()
                               )}
                               value={(permuta.status === 'pending' || permuta.status === 'scheduled') ? permuta.status : permuta.status}
                               onChange={(e) => handleStatusChange(permuta, e.target.value as PermutaStatus)}
                             >
                               <option value="pending" className={
                                 (permuta.requesterSigned && permuta.substituteSigned) 
                                   ? 'bg-yellow-100 text-yellow-900' 
                                   : 'bg-red-100 text-red-900'
                               }>
                                 {getStatusText() === 'DEFERIDO' || getStatusText() === 'INDEFERIDO' ? 'ANÁLISE' : getStatusText()}
                               </option>
                               <option value="scheduled" className="bg-amber-100 text-amber-900">AGEND.</option>
                               <option value="accepted" className="bg-emerald-100 text-emerald-900">DEFER.</option>
                               <option value="rejected" className="bg-red-100 text-red-900">INDEF.</option>
                             </select>
                           ) : (
                             <span className={cn(
                               "text-[8px] sm:text-[9px] font-black uppercase tracking-tighter sm:tracking-tight inline-block align-middle",
                               permuta.status === 'accepted' ? 'text-emerald-700' :
                               permuta.status === 'scheduled' ? 'text-amber-700' :
                               permuta.status === 'rejected' ? 'text-red-700' :
                               (permuta.requesterSigned && permuta.substituteSigned) ? 'text-yellow-700' :
                               'text-red-700'
                             )}>
                               {getStatusText()}
                             </span>
                           )}
                         </td>
                         <td className="p-1 text-center">
                             <div className={cn(
                               "w-4 h-4 sm:w-5 sm:h-5 mx-auto border-2 rounded transition-all flex items-center justify-center shadow-inner",
                               permuta.status === 'accepted' || permuta.status === 'rejected' ? "bg-emerald-500 border-emerald-600" : 
                               permuta.status === 'scheduled' ? "bg-amber-400 border-amber-500" :
                               permuta.status === 'cancelled' ? "bg-red-500 border-red-600" : 
                               "bg-white border-slate-200"
                             )}>
                                {(permuta.status === 'accepted' || permuta.status === 'rejected') && <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white stroke-[4]" />}
                                {permuta.status === 'cancelled' && <X className="w-3 h-3 sm:w-4 sm:h-4 text-white stroke-[4]" />}
                                {permuta.status === 'scheduled' && <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-white stroke-[3]" />}
                             </div>
                         </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr className="bg-white border-b border-slate-100 h-10">
                      <td colSpan={9} className="text-center p-3 sm:p-4 text-[9px] sm:text-[10px] font-black text-slate-400">
                        NENHUMA PERMUTA REGISTRADA NESTE DIA
                      </td>
                    </tr>
                  )}

                  </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* Sign Modal */}
      <AnimatePresence>
        {signPermuta && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setSignPermuta(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative z-10 overflow-hidden border-2 border-indigo-100"
            >
              <div className="bg-indigo-50 p-6 flex flex-col items-center border-b border-indigo-100">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                  <PenTool className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter text-center">Assinar Permuta</h3>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-2">{format(new Date(signPermuta.date + 'T00:00:00'), 'dd/MM/yyyy')}</p>
              </div>
              
              <div className="p-6">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                   <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Saindo</span>
                      <span className="text-xs font-black text-slate-800">{signPermuta.requesterName}</span>
                   </div>
                   <div className="flex justify-between items-center pt-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Entrando</span>
                      <span className="text-xs font-black text-slate-800">{signPermuta.acceptedByName || signPermuta.substituteName || '-'}</span>
                   </div>
                </div>

                <p className="text-xs font-bold text-slate-600 text-center mb-6 leading-relaxed">
                  Confirma sua anuência na permuta descrita acima?
                </p>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setSignPermuta(null)}
                    className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-lg transition-colors"
                  >
                    Voltar
                  </button>
                  <button 
                    onClick={confirmSign}
                    className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <PenTool className="w-3.5 h-3.5" /> Assinar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

      {/* Cancel Modal */}
        {cancelPermuta && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setCancelPermuta(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative z-10 overflow-hidden border-2 border-red-100"
            >
              <div className="bg-red-50 p-6 flex flex-col items-center border-b border-red-100">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter text-center">Cancelar Permuta</h3>
                <p className="text-xs font-bold text-red-600 uppercase tracking-widest mt-2">Ação Irreversível</p>
              </div>
              
              <div className="p-6">
                <p className="text-sm font-medium text-slate-600 text-center mb-6 leading-relaxed">
                  Tem certeza que deseja cancelar a permuta do dia <strong className="text-slate-900">{format(new Date(cancelPermuta.date + 'T00:00:00'), 'dd/MM/yyyy')}</strong>? 
                  Esta solicitação não poderá ser recuperada.
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setCancelPermuta(null)}
                    className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-lg transition-colors"
                  >
                    Voltar
                  </button>
                  <button 
                    onClick={confirmCancel}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-lg hover:shadow-xl transition-all active:scale-95"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
