import { getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, onSnapshot, writeBatch, where, updateDoc, doc, serverTimestamp, orderBy, addDoc, getDoc } from 'firebase/firestore';
import { PermutaRequest, PermutaStatus, UserProfile } from '../types';
import { format, differenceInDays, startOfYear, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAlaColor, getAlaName, getAlaForDate, cn, calculateDeadline } from '../lib/utils';
import { MessageSquare, UserCheck, Trash2, CalendarDays, X, Check, RefreshCw, ExternalLink, AlertTriangle, PenTool, Clock, Archive } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMilitars } from '../contexts/MilitarContext';
import { RankInsignia } from './RankInsignia';
import { useAppConfig } from '../contexts/ConfigContext';
import { cleanUndefined } from "../lib/utils";

interface PermutaBoardProps {
  user: UserProfile;
  obmContext: string;
  selectedMonth?: number | null;
  onMonthSelect?: (month: number) => void;
  onBack?: () => void;
  adminMode?: boolean;
}

export function PermutaBoard({ user, obmContext, selectedMonth, onMonthSelect, onBack, adminMode = false }: PermutaBoardProps) {
  const { militars } = useMilitars();
  const { activeMonths: ctxActiveMonths } = useAppConfig();
  const [permutas, setPermutas] = useState<PermutaRequest[]>(() => {
    const cached = localStorage.getItem('cache_permutas');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(true);
  const [signPermuta, setSignPermuta] = useState<PermutaRequest | null>(null);
  const [cancelPermuta, setCancelPermuta] = useState<PermutaRequest | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'mine'>('all');
  const [viewMode, setViewMode] = useState<'geral' | 'ofertas'>('geral');

  useEffect(() => {
    // Safety timeout: if Firestore takes too long, stop loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // Scope: 3 days ago for standard users to avoid loading old history, admins get the same or maybe 60 days
    const daysAgo = adminMode ? 60 : 3;
    const startDate = format(subDays(new Date(), daysAgo), 'yyyy-MM-dd');

    const q = query(
      collection(db, 'permutas'),
      where('date', '>=', startDate),
      orderBy('date', 'asc')
    );

    let isMounted = true;
    let unsubSnapshot: (() => void) | undefined;
    
    unsubSnapshot = onSnapshot(q, (snapshot) => {
      clearTimeout(timer);
      if (!isMounted) return;
      
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as PermutaRequest[];
      
      const filteredByObm = data.filter(p => !p.obm || p.obm === obmContext || p.obm === '10º GBM');
      
      if (adminMode) {
        setPermutas(filteredByObm);
        localStorage.setItem('cache_permutas', JSON.stringify(filteredByObm));
      } else {
        const filtered = filteredByObm.filter(p => 
          p.status === PermutaStatus.ACCEPTED || 
          p.status === PermutaStatus.PENDING ||
          p.status === 'scheduled' ||
          p.requesterId === (user?.uid || '') ||
          p.acceptedById === (user?.uid || '') ||
          p.requesterRg === (user?.rg || '') ||
          p.substituteRg === (user?.rg || '') ||
          p.isLookingForSubstitute
        );
        setPermutas(filtered);
        localStorage.setItem('cache_permutas', JSON.stringify(filtered));
      }
      setLoading(false);
    }, (error) => {
      clearTimeout(timer);
      if (isMounted) {
          setLoading(false);
          handleFirestoreError(error, OperationType.LIST, 'permutas', false);
      }
    });

    return () => { 
        isMounted = false;
        clearTimeout(timer);
        if (unsubSnapshot) unsubSnapshot();
    };
  }, [user?.uid, user?.isAdmin, user?.rg]);

  // Refresh manual function
  const handleManualRefresh = async () => {
    setLoading(true);
    const daysAgo = adminMode ? 60 : 3;
    const startDate = format(subDays(new Date(), daysAgo), 'yyyy-MM-dd');

    const q = query(
      collection(db, 'permutas'),
      where('date', '>=', startDate),
      orderBy('date', 'asc')
    );
    try {
      const snapshot = await getDocs(q);
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
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  const confirmSign = async () => {
    if (!signPermuta?.id) return;
    
    try {
      const dateObj = new Date(signPermuta.date + 'T00:00:00');
      if (!user.isAdmin && new Date() > calculateDeadline(dateObj)) {
        alert("O prazo para assinatura desta permuta expirou.");
        setSignPermuta(null);
        return;
      }

      const isRequester = user?.rg && (signPermuta.requesterRg === user.rg);
      const isSubstitute = user?.rg && (signPermuta.substituteRg === user.rg);

      await updateDoc(doc(db, 'permutas', signPermuta.id), cleanUndefined({
              requesterSigned: isRequester ? true : signPermuta.requesterSigned,
              substituteSigned: isSubstitute ? true : signPermuta.substituteSigned,
              updatedAt: serverTimestamp()
            })).catch(error => {
        handleFirestoreError(error, OperationType.UPDATE, `permutas/${signPermuta.id}`);
      });
      
      setPermutas(prev => prev.map(p => {
        if (p.id === signPermuta.id) {
          return {
            ...p,
            requesterSigned: isRequester ? true : p.requesterSigned,
            substituteSigned: isSubstitute ? true : p.substituteSigned,
          };
        }
        return p;
      }));
      setSignPermuta(null);
    } catch (error) {
      console.error('Update Sign Error:', error);
    }
  };

  const handleFillVacancy = async (permuta: PermutaRequest, role: 'requester' | 'substitute') => {
    if (!permuta.id || !user?.rg) return;

    const dateObj = new Date(permuta.date + 'T00:00:00');
    if (!user.isAdmin && new Date() > calculateDeadline(dateObj)) {
       alert("O prazo para preenchimento de vaga nesta permuta já expirou.");
       return;
    }

    if (permuta.requesterRg === user.rg || permuta.substituteRg === user.rg) {
       alert("Você não pode se inscrever na sua própria permuta.");
       return;
    }

    if (role === 'substitute') {
      try {
        const obmId = (obmContext || '10º GBM').replace(/\//g, '_').replace(/\s/g, '_');
        const monthKey = permuta.date.substring(0, 7); // yyyy-MM
        const docId = `${obmId}_${monthKey}`;
        const grdDoc = await getDoc(doc(db, 'grd_configs', docId));
        if (grdDoc.exists()) {
          const grdData = grdDoc.data().days || {};
          const dayRgs = grdData[permuta.date] || [];
          const normalizeRg = (rg: string | number) => {
            const str = (rg || '').toString().trim().toUpperCase();
            const clean = str.replace(/[^A-Z0-9]/g, '');
            return clean.replace(/^0+/, '') || clean;
          };
          const normalizedGrdRgs = dayRgs.map((r: string) => normalizeRg(r));
          if (normalizedGrdRgs.includes(normalizeRg(user.rg))) {
            alert("Você está escalado de GRD neste dia. É proibido permutar para efetivo enquanto escalado no GRD.");
            return;
          }
        }
      } catch (err) {
         console.error("Error checking GRD status:", err);
      }
    }

    if (!window.confirm('Deseja se inscrever nesta vaga?')) return;

    try {
      const formattedName = user.rank ? `${user.rank} ${user.warName || user.name}` : user.name;
      
      const dateObj = new Date(permuta.date + 'T00:00:00');
      const isMonthOpen = ctxActiveMonths ? ctxActiveMonths.includes(dateObj.getMonth()) : true;

      const updates: any = {
        isLookingForSubstitute: false,
        status: isMonthOpen ? PermutaStatus.PENDING : PermutaStatus.SCHEDULED,
        updatedAt: serverTimestamp()
      };

      if (role === 'requester') {
         updates.requesterRg = user.rg;
         updates.requesterName = formattedName;
         updates.requesterId = auth.currentUser?.uid || user.uid;
         updates.requesterSigned = true; // Volunteer auto-signs
         updates.substituteSigned = false; // Revoke creator signature so they must accept the volunteer
      } else {
         updates.substituteRg = user.rg;
         updates.substituteName = formattedName;
         updates.acceptedById = `rg_${user.rg}`; // Standard ID format used in RequestPermuta
         updates.acceptedByName = formattedName;
         updates.substituteSigned = true; // Volunteer auto-signs
         updates.requesterSigned = false; // Revoke creator signature so they must accept the volunteer
      }

      await updateDoc(doc(db, 'permutas', permuta.id), cleanUndefined(updates)).catch(error => {
        handleFirestoreError(error, OperationType.UPDATE, `permutas/${permuta.id}`);
      });

      setPermutas(prev => prev.map(p => 
        p.id === permuta.id ? { ...p, ...updates } : p
      ));
      
      alert('Vaga preenchida com sucesso! A permuta agora aguarda a assinatura da outra parte no Quadro Geral.');
    } catch (error) {
      console.error('Fill Vacancy Error:', error);
    }
  };

  const confirmCancel = async () => {
    if (!cancelPermuta?.id) return;
    try {
      const dateObj = new Date(cancelPermuta.date + 'T00:00:00');
      if (!user.isAdmin && new Date() > calculateDeadline(dateObj)) {
        alert("O prazo para cancelamento desta permuta já expirou.");
        setCancelPermuta(null);
        return;
      }

      await updateDoc(doc(db, 'permutas', cancelPermuta.id), cleanUndefined({
              status: PermutaStatus.CANCELLED,
              cancelledByRg: user.rg,
              updatedAt: serverTimestamp()
            })).catch(error => {
        handleFirestoreError(error, OperationType.UPDATE, `permutas/${cancelPermuta.id}`);
      });
      setPermutas(prev => prev.map(p => 
        p.id === cancelPermuta.id ? { ...p, status: PermutaStatus.CANCELLED, cancelledByRg: user.rg } : p
      ));
      setCancelPermuta(null);
    } catch (error) {
      console.error('Cancel Error:', error);
    }
  };

  const handleStatusChange = async (permuta: PermutaRequest, newStatus: PermutaStatus) => {
    if (!permuta.id) return;
    try {
      await updateDoc(doc(db, 'permutas', permuta.id), cleanUndefined({
              status: newStatus,
              updatedAt: serverTimestamp()
            })).catch(error => {
        handleFirestoreError(error, OperationType.UPDATE, `permutas/${permuta.id}`);
      });
      setPermutas(prev => prev.map(p => 
        p.id === permuta.id ? { ...p, status: newStatus } : p
      ));
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
      const archivedIds = new Set<string>();
      for (const p of itemsToArchive) {
        if (!p.id) continue;
        batch.update(doc(db, 'permutas', p.id), { archived: true, updatedAt: serverTimestamp() });
        archivedIds.add(p.id);
      }
      await batch.commit();
      setPermutas(prev => prev.filter(p => p.id && !archivedIds.has(p.id)));
    } catch (error) {
      console.error('Error archiving permutas', error);
      handleFirestoreError(error, OperationType.UPDATE, 'permutas/batch-archive');
    }
  };

  const filteredPermutas = permutas.filter(p => {
    if (p.archived) return false;

    if (viewMode === 'geral' && p.isLookingForSubstitute) return false;
    if (viewMode === 'ofertas' && !p.isLookingForSubstitute) return false;

    // Arquivar automaticamente permutas antigas (> 1 dia)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const permutaDate = new Date(p.date + 'T00:00:00');
    const diffTime = today.getTime() - permutaDate.getTime();
    if (diffTime > 1000 * 60 * 60 * 24) {
       return false;
    }

    if (viewMode === 'geral' && selectedMonth != null && permutaDate.getMonth() !== selectedMonth) return false;
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
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        id="permuta-board" 
        className="flex flex-col gap-4"
      >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-3 rounded-lg border-2 border-slate-300 shadow-sm gap-4">
         <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-600 hidden sm:inline-block">Tipo</span>
            <div className="flex gap-2 flex-1 sm:flex-initial">
              <button
                 onClick={() => setViewMode('geral')}
                 className={cn("flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors", viewMode === 'geral' ? "bg-slate-800 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
              >
                 Quadro Geral
              </button>
              <button
                 onClick={() => setViewMode('ofertas')}
                 className={cn("flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors", viewMode === 'ofertas' ? "bg-slate-800 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
              >
                 Mural de Ofertas
              </button>
            </div>
         </div>
         <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-600 hidden sm:inline-block">Filtrar</span>
            {!adminMode && (
              <button
                 onClick={handleManualRefresh}
                 disabled={loading}
                 className="px-2 py-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                 title="Atualizar Quadro"
              >
                 <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>
            )}
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
        <div className="text-center py-12 text-slate-400 font-bold uppercase tracking-widest text-sm">
          Nenhuma permuta encontrada neste filtro.
        </div>
      </motion.div>
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
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      id="permuta-board" 
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-3 rounded-lg border-2 border-slate-300 shadow-sm gap-4">
         <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-600 hidden sm:inline-block">Tipo</span>
            <div className="flex gap-2 flex-1 sm:flex-initial">
              <button
                 onClick={() => setViewMode('geral')}
                 className={cn("flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors", viewMode === 'geral' ? "bg-slate-800 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
              >
                 Quadro Geral
              </button>
              <button
                 onClick={() => setViewMode('ofertas')}
                 className={cn("flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors", viewMode === 'ofertas' ? "bg-slate-800 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
              >
                 Mural de Ofertas
              </button>
            </div>
         </div>
         <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-600 hidden sm:inline-block">Filtrar</span>
            {!adminMode && (
              <button
                 onClick={handleManualRefresh}
                 disabled={loading}
                 className="px-2 py-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                 title="Atualizar Quadro"
              >
                 <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>
            )}
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
        {(() => {
          let lastRenderedMonth = -1;
          return sortedGroupedEntries.map(([date, items]) => {
            const dateObj = new Date(date + 'T00:00:00');
            const dayOfYear = differenceInDays(dateObj, startOfYear(dateObj)) + 1;
            const ala = getAlaForDate(dateObj);
            const hasPendingForMe = items.some(p => (p.status === PermutaStatus.PENDING || p.status === PermutaStatus.SCHEDULED) && ((p.requesterRg === user?.rg && !p.requesterSigned) || (p.substituteRg === user?.rg && !p.substituteSigned)));
            const currentMonth = dateObj.getMonth();
            const showMonthHeader = viewMode === 'ofertas' && currentMonth !== lastRenderedMonth;
            lastRenderedMonth = currentMonth;

            return (
              <React.Fragment key={date}>
                {showMonthHeader && (
                  <div className="bg-[#1e293b] p-4 text-white text-center font-black uppercase tracking-[0.2em] text-sm rounded shadow-md mt-12 mb-6">
                    {format(dateObj, 'MMMM', { locale: ptBR })}
                  </div>
                )}
                <div className="overflow-x-auto pb-4 no-scrollbar relative">
                  <div className="sm:hidden mb-2 flex items-center gap-1.5 px-1">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Deslize para ver mais →</span>
              </div>
              <table className={cn("w-full table-fixed border-collapse border-2 shadow-xl text-[10px] uppercase font-bold min-w-[500px] sm:min-w-[750px]", hasPendingForMe ? "border-amber-400" : "border-[#1e293b]")}>
                  <colgroup>
                    <col className="w-[30px] sm:w-[40px]" />
                    <col className="w-auto" />
                    <col className="w-[30px] sm:w-[40px]" />
                    <col className="w-auto" />
                    <col className="w-[30px] sm:w-[40px]" />
                    <col className="w-[90px] sm:w-[120px]" />
                    <col className="w-[45px] sm:w-[55px]" />
                  </colgroup>
                  <thead>
                    {hasPendingForMe && (
                       <tr>
                         <td colSpan={7} className="bg-amber-100 text-amber-900 font-black text-center py-2 px-4 uppercase tracking-widest animate-pulse-slow border-b-2 border-amber-400 text-[9px]">
                            Assinatura Pendente Neste Dia
                         </td>
                       </tr>
                    )}
                    <tr className={cn(getAlaColor(ala), "text-slate-900 border-b-2 font-black", hasPendingForMe ? "border-amber-400" : "border-slate-900")}>
                       <th colSpan={7} className="p-0">
                         <div className="flex items-stretch w-full">
                           <div className={cn("border-r py-1 sm:py-1.5 flex flex-col items-center justify-center text-[11px] sm:text-sm flex-shrink-0 w-[50px] sm:w-[60px]", hasPendingForMe ? "border-amber-400" : "border-slate-900")}>
                             <span className="font-black leading-none mb-0.5">{format(dateObj, 'dd/MM')}</span>
                             <span className="text-[9px] sm:text-[10px] font-bold leading-none tracking-widest opacity-80">{dayOfYear}</span>
                           </div>
                           <div className="border-r border-slate-900 py-1 sm:py-1.5 px-2 flex items-center justify-center text-[10px] sm:text-sm font-black uppercase tracking-widest flex-1 min-w-0">
                              <span className="truncate">{getAlaName(ala)}</span>
                           </div>
                           <div className="border-r border-slate-900 py-1 sm:py-1.5 px-1 sm:px-2 flex items-center justify-center text-[10px] sm:text-sm font-black uppercase tracking-widest flex-[1.5] min-w-0">
                              <div className="flex items-center justify-center gap-1 sm:gap-1.5 min-w-0 overflow-hidden">
                                <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4 opacity-75 shrink-0" />
                                <span className="hidden sm:inline truncate text-[10px] sm:text-xs">{format(dateObj, 'EEEE', { locale: ptBR }).replace('-feira', '')}</span>
                                <span className="sm:hidden truncate text-[10px]">{format(dateObj, 'EEEE', { locale: ptBR }).replace('-feira', '')}</span>
                              </div>
                           </div>
                           <div className="border-r border-slate-900 py-1 sm:py-1.5 px-1 sm:px-2 flex items-center justify-center sm:justify-start flex-[1.5] min-w-0">
                             <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-1.5 opacity-50 min-w-0 overflow-hidden">
                               <div className="w-3 h-3 rounded-full border-[1.5px] border-slate-900 border-dashed shrink-0" />
                               <span className="text-[8px] sm:text-[9px] uppercase font-bold tracking-widest pt-0.5 whitespace-nowrap">Oficial de Dia</span>
                             </div>
                           </div>
                           <div className="py-1 sm:py-1.5 px-1 sm:px-2 flex items-center justify-end shrink-0">
                             <div className="flex justify-end items-center gap-1 sm:gap-2 w-full">
                               <div className="flex justify-end items-center gap-1 sm:gap-2 mx-auto sm:mx-0 sm:ml-auto">
                                 <div className="bg-slate-900/10 text-slate-900 px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-black tracking-widest flex items-center gap-0.5 sm:gap-1 whitespace-nowrap shrink-0" title="Prazo limite para fechamento do tempo">
                                   <Clock className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 shrink-0" />
                                   <span>{format(calculateDeadline(dateObj), 'dd/MM HH:mm')}</span>
                                 </div>
                               </div>
                               {adminMode && (
                                 <button
                                   onClick={() => handleArchiveDay(items)}
                                   className="bg-slate-800 text-slate-100 hover:bg-slate-700 px-1 sm:px-2 py-0.5 sm:py-1 rounded shadow flex items-center gap-1 text-[7px] sm:text-[9px] tracking-widest transition-colors whitespace-nowrap shrink-0"
                                   title="Arquivar permutas deste dia"
                                 >
                                   <Archive className="w-2.5 h-2.5 sm:w-3 h-3" />
                                   <span className="hidden sm:inline">Arquivar</span>
                                 </button>
                               )}
                             </div>
                           </div>
                         </div>
                       </th>
                    </tr>
                    <tr className="bg-[#ced6e3] text-slate-900 border-b border-slate-900 text-[9px] sm:text-[10px] font-black italic">
                     <th className="border-r border-slate-900 py-1 sm:py-1.5 text-center px-0">✓</th>
                     <th className="border-r border-slate-900 py-1 sm:py-1.5 text-center px-1">SAI</th>
                     <th className="border-r border-slate-900 py-1 sm:py-1.5 text-center uppercase text-[10px] sm:text-[12px] font-black px-0">X</th>
                     <th className="border-r border-slate-900 py-1 sm:py-1.5 text-center px-1">ENTRA</th>
                     <th className="border-r border-slate-900 py-1 sm:py-1.5 text-center px-0">✓</th>
                     <th className="border-r border-slate-900 py-1 sm:py-1.5 tracking-tighter text-center px-1">STATUS</th>
                     <th className="py-1 sm:py-1.5 text-center px-1">RESP.</th>
                    </tr>
                  </thead>

                  <tbody>
                  {items.map((permuta) => {
                    const isRequester = user?.rg && permuta.requesterRg === user.rg;
                    const isSubstitute = user?.rg && permuta.substituteRg === user.rg;
                    const isEscalante = adminMode;
                    const isMyTurnToSign = (isRequester && !permuta.requesterSigned) || (isSubstitute && !permuta.substituteSigned);
                    
                    const requesterData = militars.find(m => m.rg === permuta.requesterRg);
                    const substituteData = militars.find(m => m.rg === permuta.substituteRg);
                    
                    const reqRank = requesterData?.rank || '';
                    const rawReqName = permuta.requesterName || '';
                    const subRank = substituteData?.rank || '';
                    const rawSubName = permuta.substituteName || permuta.acceptedByName || '-';

                    const removeRankFromName = (name: string, rank: string) => {
                      if (!name) return '';
                      let resultName = name.toUpperCase().trim();
                      const upRank = rank?.toUpperCase().trim();
                      if (upRank && resultName.startsWith(upRank)) {
                        resultName = resultName.substring(upRank.length).trim();
                      }
                      const prefixes = ['SOLDADO ', 'SD ', 'CABO ', 'CB ', '3º SGT ', '3SGT ', '3 SGT ', '2º SGT ', '2SGT ', '2 SGT ', '1º SGT ', '1SGT ', '1 SGT ', 'SUBTENENTE ', 'SUBTEN ', 'ST ', 'ASP OF ', 'ASPIRANTE ', 'ASP ', '2º TEN ', '2TEN ', '2 TEN ', '1º TEN ', '1TEN ', '1 TEN ', 'CAPITÃO ', 'CAPITAO ', 'CAP ', 'MAJOR ', 'MAJ ', 'TEN CEL ', 'TEN CORONEL ', 'TC ', 'CORONEL ', 'CEL '];
                      for (const p of prefixes) {
                         if (resultName.startsWith(p)) {
                            resultName = resultName.substring(p.length).trim();
                            break;
                         }
                      }
                      return resultName;
                    };

                    const displayReqName = removeRankFromName(rawReqName, reqRank);
                    const displaySubName = removeRankFromName(rawSubName, subRank);
                    
                    const getStatusText = () => {
                      if (permuta.status === 'accepted') return 'DEFERIDO';
                      if (permuta.status === 'rejected') return 'INDEFERIDO';
                      if (permuta.status === 'cancelled') return 'CANCELADA';
                      const fullySigned = permuta.requesterSigned && permuta.substituteSigned;
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
                         <td className="border-r border-slate-300 px-0.5 py-1 sm:p-1 text-center">
                            {permuta.requesterSigned ? (
                              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-slate-900 rounded flex items-center justify-center mx-auto shadow-sm">
                                 <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white stroke-[3]" />
                              </div>
                            ) : (
                              <div className="flex items-center justify-center">
                                <div className="w-4 h-4 sm:w-5 sm:h-5 border-[1.5px] sm:border-2 border-slate-300 rounded mx-auto" />
                              </div>
                            )}
                         </td>
                         <td className="border-r border-slate-300 p-1 sm:p-2 align-middle">
                            <div className="flex text-left justify-start sm:justify-center items-center gap-1.5 sm:gap-2 max-w-[200px] w-[fit-content] sm:w-[full] mx-auto">
                              {reqRank && (
                                <div className="scale-[0.9] sm:scale-100 origin-left shrink-0 -ml-1 sm:ml-0">
                                  <RankInsignia rankStr={reqRank} />
                                </div>
                              )}
                              <div className="flex flex-col text-left justify-center py-1 min-w-0">
                                {(permuta.isLookingForSubstitute && !permuta.requesterRg) ? (
                                  <>
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <div className={`w-3.5 h-3.5 rounded-full shrink-0 animate-pulse ${
                                        permuta.offerType === 'troca' ? 'bg-[#1E293B]' :
                                        permuta.offerType === 'pago' ? 'bg-[#8B4513]' :
                                         'bg-[#3B0764]'
                                      }`} />
                                      <span className="text-[10px] sm:text-[11px] font-black uppercase text-indigo-500 tracking-widest leading-none whitespace-nowrap opacity-75">
                                        {permuta.offerType === 'troca' && 'TROCA'}
                                        {permuta.offerType === 'pago' && 'TABELA COMUM'}
                                        {permuta.offerType === 'especial' && 'TABELA ESPECIAL'}
                                      </span>
                                    </div>
                                    <button 
                                      onClick={() => handleFillVacancy(permuta, 'requester')}
                                      className="text-[9px] sm:text-[10px] bg-slate-800 text-white font-black uppercase tracking-tight py-1 px-1.5 rounded hover:scale-105 transition-transform mt-1 whitespace-nowrap"
                                    >
                                      ASSUMIR VAGA
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-[10px] sm:text-[11px] font-black uppercase text-indigo-500 tracking-widest leading-none mb-0.5 whitespace-nowrap">{reqRank || 'MIL'}</span>
                                    <span className="text-[12px] sm:text-[15px] font-black uppercase tracking-tight text-slate-800 leading-none truncate block mt-0.5">{displayReqName}</span>
                                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400 font-mono leading-none mt-1 whitespace-nowrap">RG: {permuta.requesterRg}</span>
                                  </>
                                )}
                              </div>
                            </div>
                         </td>
                         <td className="border-r border-slate-300 px-0.5 py-1 sm:p-1 text-center bg-transparent mix-blend-multiply align-middle">
                            <div className="flex items-center justify-center w-full h-full min-h-[32px]">
                               {(isRequester || isSubstitute || isEscalante) && permuta.status !== 'cancelled' ? (
                                 <button 
                                   onClick={() => {
                                     const dateObj = new Date(permuta.date + 'T00:00:00');
                                     if (!user.isAdmin && new Date() > calculateDeadline(dateObj)) {
                                       alert("O prazo para cancelamento desta permuta expirou.");
                                       return;
                                     }
                                     setCancelPermuta(permuta);
                                   }}
                                   className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center hover:bg-red-200 rounded-full transition-colors group mx-auto"
                                   title="Cancelar Permuta"
                                 >
                                   <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 font-black stroke-[4] group-hover:scale-125 transition-transform" />
                                 </button>
                               ) : (
                                 <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center mx-auto">
                                   <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 opacity-60 font-black stroke-[3]" />
                                 </div>
                               )}
                            </div>
                         </td>
                         <td className="border-r border-slate-300 p-1 sm:p-2 align-middle">
                            <div className="flex text-left justify-start sm:justify-center items-center gap-1.5 sm:gap-2 max-w-[200px] w-[fit-content] sm:w-[full] mx-auto">
                              {permuta.isLookingForSubstitute ? null : subRank && (
                                <div className="scale-[0.9] sm:scale-100 origin-left shrink-0 -ml-1 sm:ml-0">
                                  <RankInsignia rankStr={subRank} />
                                </div>
                              )}
                              <div className="flex flex-col text-left justify-center py-1 min-w-0">
                                {(permuta.isLookingForSubstitute && !permuta.substituteRg) ? (
                                  <>
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <div className={`w-3.5 h-3.5 rounded-full shrink-0 animate-pulse ${
                                        permuta.offerType === 'troca' ? 'bg-[#1E293B]' :
                                        permuta.offerType === 'pago' ? 'bg-[#8B4513]' :
                                         'bg-[#3B0764]'
                                      }`} />
                                      <span className="text-[10px] sm:text-[11px] font-black uppercase text-indigo-500 tracking-widest leading-none whitespace-nowrap opacity-75">
                                        {permuta.offerType === 'troca' && 'TROCA'}
                                        {permuta.offerType === 'pago' && 'TABELA COMUM'}
                                        {permuta.offerType === 'especial' && 'TABELA ESPECIAL'}
                                      </span>
                                    </div>
                                    <button 
                                      onClick={() => handleFillVacancy(permuta, 'substitute')}
                                      className="text-[9px] sm:text-[10px] bg-slate-800 text-white font-black uppercase tracking-tight py-1 px-1.5 rounded hover:scale-105 transition-transform mt-1 whitespace-nowrap"
                                    >
                                      ASSUMIR VAGA
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-[10px] sm:text-[11px] font-black uppercase text-indigo-500 tracking-widest leading-none mb-0.5 whitespace-nowrap">{subRank || 'MIL'}</span>
                                    <span className="text-[12px] sm:text-[15px] font-black uppercase tracking-tight text-slate-800 leading-none truncate block mt-0.5">{displaySubName}</span>
                                    {permuta.substituteRg && (
                                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400 font-mono leading-none mt-1 whitespace-nowrap">RG: {permuta.substituteRg}</span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                         </td>
                         <td className="border-r border-slate-300 px-0.5 py-1 sm:p-1 text-center relative group">
                            {permuta.substituteSigned ? (
                              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-slate-900 rounded flex items-center justify-center mx-auto shadow-sm">
                                 <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white stroke-[3]" />
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 sm:w-5 sm:h-5 border-[1.5px] sm:border-2 border-slate-300 rounded mx-auto" />
                              </div>
                            )}
                         </td>
                         <td className="border-r border-slate-300 p-1 text-center px-2 align-middle">
                           {isMyTurnToSign && permuta.status !== 'cancelled' ? (
                             <button
                               onClick={() => {
                                 const dateObj = new Date(permuta.date + 'T00:00:00');
                                 if (!user.isAdmin && new Date() > calculateDeadline(dateObj)) {
                                   alert("O prazo para assinatura desta permuta expirou.");
                                   return;
                                 }
                                 setSignPermuta(permuta);
                               }}
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
                                 {getStatusText() === 'DEFERIDO' || getStatusText() === 'INDEFERIDO' ? 'PENDENTE' : getStatusText()}
                               </option>
                               <option value="scheduled" className="bg-amber-100 text-amber-900">EM ANÁLISE</option>
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
                      <td colSpan={7} className="text-center p-3 sm:p-4 text-[9px] sm:text-[10px] font-black text-slate-400">
                        NENHUMA PERMUTA REGISTRADA NESTE DIA
                      </td>
                    </tr>
                  )}

                  </tbody>
              </table>
            </div>
            </React.Fragment>
          );
        })})()}
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
    </motion.div>
  );
}
