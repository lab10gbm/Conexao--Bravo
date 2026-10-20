import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  ArrowRightLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileSpreadsheet, 
  Plus, 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  Filter, 
  UserCheck, 
  Send, 
  X, 
  Check, 
  Calendar,
  Layers,
  Sparkles,
  HelpCircle,
  Phone
} from 'lucide-react';
import { format, subDays, isAfter, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, onSnapshot, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, PermutaRequest, PermutaStatus } from '../types';
import { useMilitars } from '../contexts/MilitarContext';
import { isOfficer, parseRank, sortAllBySeniority } from '../lib/rankUtils';
import { normalizeObm, normalizeRg, getUserObmAccess, cn } from '../lib/utils';
import { safeSaveDocument, safeDeleteDocument } from '../lib/apiClient';
import { exportToExcel } from '../lib/exportUtils';
import { resolveCanonicalScope } from '../lib/canonicalScope';

interface OficiaisPermutasModuleProps {
  user: UserProfile;
  obmContext: string;
  onBack?: () => void;
}

export function OficiaisPermutasModule({
  user,
  obmContext,
  onBack
}: OficiaisPermutasModuleProps) {
  const { militars } = useMilitars();
  const [permutas, setPermutas] = useState<PermutaRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'quadro' | 'tabela' | 'ofertas'>('quadro');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'mine'>('all');
  
  // Modais
  const [isNewPermutaOpen, setIsNewPermutaOpen] = useState(false);
  const [signModalPermuta, setSignModalPermuta] = useState<PermutaRequest | null>(null);
  const [deferModalPermuta, setDeferModalPermuta] = useState<{ permuta: PermutaRequest; action: 'deferir' | 'indeferir' } | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State Nova Permuta
  const [formDate, setFormDate] = useState('');
  const [formRequesterRg, setFormRequesterRg] = useState(user.rg || '');
  const [formSubstituteRg, setFormSubstituteRg] = useState('');
  const [formIsMural, setFormIsMural] = useState(false);
  const [formOfferType, setFormOfferType] = useState<'troca' | 'pago' | 'especial'>('troca');
  const [formError, setFormError] = useState('');

  const isAdminOrEscalante = Boolean(user.isAdmin || user.isEscalante);

  // Lista de Oficiais da unidade
  const unitOfficers = useMemo(() => {
    const rawObm = normalizeObm(obmContext || '10º GBM');
    const isGlobal = rawObm === 'global' || obmContext === 'GLOBAL';
    return militars.filter(m => {
      const obmMatch = isGlobal || getUserObmAccess(rawObm, isGlobal).includes(normalizeObm(m.obm || ''));
      const officerMatch = isOfficer(m.rank || '') || Boolean((m as any).isOfficer);
      return obmMatch && officerMatch;
    }).sort(sortAllBySeniority);
  }, [militars, obmContext]);

  // Listener em tempo real das permutas
  useEffect(() => {
    setLoading(true);
    const sixtyDaysAgo = format(subDays(new Date(), 60), 'yyyy-MM-dd');
    const q = query(
      collection(db, 'permutas'),
      where('date', '>=', sixtyDaysAgo),
      orderBy('date', 'asc')
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const rawList = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as PermutaRequest[];
        const rawObm = normalizeObm(obmContext || '10º GBM');
        const isGlobal = rawObm === 'global' || obmContext === 'GLOBAL';

        // Filtra estritamente permutas pertencentes à OBM e com militares Oficiais
        const officerPermutas = rawList.filter(p => {
          // Filtro OBM
          const permutaObm = normalizeObm(p.obm || '');
          const obmMatch = isGlobal || !permutaObm || getUserObmAccess(rawObm, isGlobal).includes(permutaObm);
          if (!obmMatch) return false;

          // Filtro de Oficial
          if (p.isOfficer || (p as any).isOfficerPermuta || (p as any).roleType === 'oficial') {
            return true;
          }

          // Se tiver solicitante ou substituto oficial
          const reqMil = militars.find(m => normalizeRg(m.rg) === normalizeRg(p.requesterRg || ''));
          const subMil = militars.find(m => normalizeRg(m.rg) === normalizeRg(p.substituteRg || ''));
          const isReqOfficer = reqMil ? isOfficer(reqMil.rank || '') : false;
          const isSubOfficer = subMil ? isOfficer(subMil.rank || '') : false;

          return isReqOfficer || isSubOfficer;
        });

        setPermutas(officerPermutas);
        setLoading(false);
      },
      (error) => {
        console.warn('[OficiaisPermutasModule] Notice loading permutas:', error?.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [obmContext, militars]);

  // Feedback timer
  useEffect(() => {
    if (actionFeedback) {
      const timer = setTimeout(() => setActionFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionFeedback]);

  // Filtragem local baseada nos estados de tab, search e status
  const filteredPermutas = useMemo(() => {
    const userCleanRg = normalizeRg(user.rg || '');
    return permutas.filter(p => {
      // Tab Ofertas
      if (activeTab === 'ofertas') {
        if (!p.isLookingForSubstitute) return false;
      }

      // Filtro de Status
      if (statusFilter === 'pending' && p.status !== PermutaStatus.PENDING) return false;
      if (statusFilter === 'accepted' && p.status !== PermutaStatus.ACCEPTED) return false;
      if (statusFilter === 'rejected' && p.status !== PermutaStatus.REJECTED) return false;
      if (statusFilter === 'mine') {
        const isMine = normalizeRg(p.requesterRg) === userCleanRg || normalizeRg(p.substituteRg) === userCleanRg;
        if (!isMine) return false;
      }

      // Filtro de Busca
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const reqMatch = (p.requesterName || '').toLowerCase().includes(term) || (p.requesterRg || '').includes(term);
        const subMatch = (p.substituteName || '').toLowerCase().includes(term) || (p.substituteRg || '').includes(term);
        const dateMatch = (p.date || '').includes(term);
        if (!reqMatch && !subMatch && !dateMatch) return false;
      }

      return true;
    });
  }, [permutas, activeTab, statusFilter, searchTerm, user.rg]);

  // Métricas
  const userCleanRg = normalizeRg(user.rg || '');
  const stats = useMemo(() => {
    const total = permutas.length;
    const pendentes = permutas.filter(p => p.status === PermutaStatus.PENDING).length;
    const deferidas = permutas.filter(p => p.status === PermutaStatus.ACCEPTED).length;
    const minhas = permutas.filter(p => normalizeRg(p.requesterRg) === userCleanRg || normalizeRg(p.substituteRg) === userCleanRg).length;
    const ofertas = permutas.filter(p => p.isLookingForSubstitute).length;
    return { total, pendentes, deferidas, minhas, ofertas };
  }, [permutas, userCleanRg]);

  // Ação: Exportar para Excel Oficial
  const handleExportExcel = async () => {
    const data = filteredPermutas.map(p => ({
      'DATA DO SERVIÇO': p.date ? format(new Date(p.date + 'T00:00:00'), 'dd/MM/yyyy') : '',
      'OFICIAL QUE SAI': p.requesterName || p.requesterRg || '-',
      'RG QUE SAI': p.requesterRg || '-',
      'ASSINATURA QUE SAI': p.requesterSigned ? 'ASSINADO DIGITALMENTE' : 'PENDENTE',
      'OFICIAL QUE ENTRA': p.substituteName || p.substituteRg || (p.isLookingForSubstitute ? 'MURAL DE OFICIAIS' : '-'),
      'RG QUE ENTRA': p.substituteRg || '-',
      'ASSINATURA QUE ENTRA': p.substituteSigned ? 'ASSINADO DIGITALMENTE' : 'PENDENTE',
      'STATUS REGULAMENTAR': (p.status || '').toUpperCase(),
      'UNIDADE / OBM': p.obm || obmContext || '10º GBM'
    }));

    await exportToExcel(
      data,
      'Permutas de Oficiais',
      `Livro_Permutas_Oficiais_${normalizeObm(obmContext || '10_GBM')}_${format(new Date(), 'yyyy_MM_dd')}`
    );
  };

  // Ação: Assinatura Digital
  const handleConfirmSignature = async () => {
    if (!signModalPermuta) return;
    setIsSubmitting(true);

    try {
      const isReq = normalizeRg(signModalPermuta.requesterRg) === userCleanRg;
      const isSub = normalizeRg(signModalPermuta.substituteRg) === userCleanRg;

      const updates: Partial<PermutaRequest> = {
        updatedAt: new Date().toISOString() as any
      };

      if (isReq) updates.requesterSigned = true;
      if (isSub) updates.substituteSigned = true;

      // Se ambos tiverem assinado, permanece PENDING para deferimento do comando/escalante
      await safeSaveDocument('permutas', signModalPermuta.id, updates, true);

      setActionFeedback({
        type: 'success',
        message: 'Permuta assinada digitalmente com sucesso!'
      });
      setSignModalPermuta(null);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: 'Falha ao assinar permuta: ' + (err?.message || 'Erro de conexão')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ação: Deferir ou Indeferir
  const handleConfirmDecision = async () => {
    if (!deferModalPermuta) return;
    setIsSubmitting(true);

    try {
      const newStatus = deferModalPermuta.action === 'deferir' ? PermutaStatus.ACCEPTED : PermutaStatus.REJECTED;
      const updates = {
        status: newStatus,
        reviewedByRg: user.rg || '',
        reviewedByName: user.name || user.warName || '',
        reviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await safeSaveDocument('permutas', deferModalPermuta.permuta.id, updates, true);

      setActionFeedback({
        type: 'success',
        message: `Permuta de Oficial ${deferModalPermuta.action === 'deferir' ? 'DEFERIDA' : 'INDEFERIDA'} com sucesso!`
      });
      setDeferModalPermuta(null);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: 'Falha ao registrar decisão: ' + (err?.message || 'Erro')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ação: Pegar serviço do mural (assumir vaga)
  const handleTakeOffer = async (permuta: PermutaRequest) => {
    if (!user.rg) return;
    const officerProfile = unitOfficers.find(o => normalizeRg(o.rg) === userCleanRg) || user;
    const nameFormatted = `${parseRank(officerProfile.rank || '')} ${officerProfile.warName || officerProfile.name}`;

    try {
      await safeSaveDocument('permutas', permuta.id, {
        substituteRg: user.rg,
        substituteName: nameFormatted,
        substituteId: user.uid || '',
        isLookingForSubstitute: false,
        substituteSigned: true,
        updatedAt: new Date().toISOString()
      }, true);

      setActionFeedback({
        type: 'success',
        message: 'Você assumiu o serviço de Oficial com sucesso!'
      });
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: 'Erro ao assumir serviço: ' + err?.message
      });
    }
  };

  // Ação: Criar Nova Permuta de Oficial
  const handleSubmitNewPermuta = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formDate) {
      setFormError('Selecione a data do serviço de oficial.');
      return;
    }

    if (!formIsMural && !formSubstituteRg) {
      setFormError('Selecione o Oficial Substituto ou marque a opção de Mural.');
      return;
    }

    if (!formIsMural && formRequesterRg === formSubstituteRg) {
      setFormError('O oficial que sai não pode ser igual ao oficial que entra.');
      return;
    }

    setIsSubmitting(true);
    try {
      const reqOfficer = unitOfficers.find(o => normalizeRg(o.rg) === normalizeRg(formRequesterRg)) || user;
      const subOfficer = formIsMural ? null : unitOfficers.find(o => normalizeRg(o.rg) === normalizeRg(formSubstituteRg));

      const reqName = `${parseRank(reqOfficer.rank || '')} ${reqOfficer.warName || reqOfficer.name}`.trim();
      const subName = subOfficer ? `${parseRank(subOfficer.rank || '')} ${subOfficer.warName || subOfficer.name}`.trim() : '';

      const isUserRequester = normalizeRg(formRequesterRg) === userCleanRg;
      const isUserSubstitute = !formIsMural && normalizeRg(formSubstituteRg) === userCleanRg;

      const newDocId = `perm_ofic_${formDate}_${formRequesterRg}_${Date.now()}`;
      const payload = {
        obm: normalizeObm(obmContext || user.obm || '10º GBM'),
        scope: user?.scope || resolveCanonicalScope(obmContext || user?.obm),
        date: formDate,
        requesterId: reqOfficer.uid || '',
        requesterRg: formRequesterRg,
        requesterName: reqName,
        substituteId: subOfficer ? (subOfficer.uid || '') : '',
        substituteRg: formIsMural ? '' : formSubstituteRg,
        substituteName: subName,
        isLookingForSubstitute: formIsMural,
        offerType: formIsMural ? formOfferType : null,
        status: PermutaStatus.PENDING,
        isOfficer: true,
        isOfficerPermuta: true,
        roleType: 'oficial',
        requesterSigned: isUserRequester || isAdminOrEscalante,
        substituteSigned: isUserSubstitute,
        submittedByRg: user.rg || '',
        submittedByName: user.name || user.warName || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const success = await safeSaveDocument('permutas', newDocId, payload, false);
      if (success) {
        setActionFeedback({
          type: 'success',
          message: 'Permuta de Oficial solicitada com sucesso!'
        });
        setIsNewPermutaOpen(false);
        setFormDate('');
        setFormSubstituteRg('');
        setFormIsMural(false);
      } else {
        setFormError('Erro ao gravar a permuta. Tente novamente.');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Erro inesperado ao salvar permuta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      {/* Alerta de Feedback */}
      <AnimatePresence>
        {actionFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "p-4 rounded-2xl flex items-center gap-3 shadow-md border text-sm font-bold uppercase tracking-wider",
              actionFeedback.type === 'success' 
                ? "bg-emerald-50 border-emerald-300 text-emerald-800" 
                : "bg-rose-50 border-rose-300 text-rose-800"
            )}
          >
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500" /> Total de Permutas
          </span>
          <span className="text-2xl font-black text-slate-800 mt-2">{stats.total}</span>
          <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">Últimos 60 dias</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs flex flex-col justify-between bg-amber-50/20">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" /> Pendentes
          </span>
          <span className="text-2xl font-black text-amber-700 mt-2">{stats.pendentes}</span>
          <span className="text-[9px] font-bold text-amber-600 uppercase mt-1">Aguardando deferimento</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs flex flex-col justify-between bg-emerald-50/20">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Deferidas
          </span>
          <span className="text-2xl font-black text-emerald-700 mt-2">{stats.deferidas}</span>
          <span className="text-[9px] font-bold text-emerald-600 uppercase mt-1">Homologadas pelo comando</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-purple-200 shadow-xs flex flex-col justify-between bg-purple-50/20">
          <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-purple-500" /> Minhas Permutas
          </span>
          <span className="text-2xl font-black text-purple-700 mt-2">{stats.minhas}</span>
          <span className="text-[9px] font-bold text-purple-600 uppercase mt-1">Seus serviços envolvidos</span>
        </div>
      </div>

      {/* Barra de Ações & Navegação Superior */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('quadro')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
              activeTab === 'quadro' 
                ? "bg-white text-indigo-700 shadow-xs" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Quadro de Oficiais
          </button>
          <button
            onClick={() => setActiveTab('tabela')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
              activeTab === 'tabela' 
                ? "bg-white text-indigo-700 shadow-xs" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Tabela / Livro
          </button>
          <button
            onClick={() => setActiveTab('ofertas')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
              activeTab === 'ofertas' 
                ? "bg-white text-purple-700 shadow-xs" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <span>Mural de Ofertas</span>
            {stats.ofertas > 0 && (
              <span className="bg-purple-100 text-purple-700 text-[9px] px-1.5 py-0.2 rounded-full font-black">
                {stats.ofertas}
              </span>
            )}
          </button>
        </div>

        {/* Filtros e Busca */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 sm:w-56 min-w-[180px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar Oficial ou RG..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-700 uppercase outline-none focus:bg-white focus:border-indigo-400 transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-600 outline-none focus:border-indigo-400 cursor-pointer"
          >
            <option value="all">Todos Status</option>
            <option value="pending">Pendentes</option>
            <option value="accepted">Deferidas</option>
            <option value="rejected">Indeferidas</option>
            <option value="mine">Minhas Permutas</option>
          </select>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
            title="Exportar Livro Oficial para Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Excel Oficial</span>
          </button>

          <button
            onClick={() => {
              setFormDate('');
              setFormSubstituteRg('');
              setFormIsMural(false);
              setFormError('');
              setIsNewPermutaOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Permuta</span>
          </button>
        </div>
      </div>

      {/* Conteúdo: Visão em Quadro (Cards) */}
      {activeTab === 'quadro' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPermutas.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 p-8">
              <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-black text-slate-700 uppercase">Nenhuma permuta de oficial encontrada</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Não há solicitações registradas para os filtros selecionados nesta OBM.
              </p>
            </div>
          ) : (
            filteredPermutas.map((permuta) => {
              const isReq = normalizeRg(permuta.requesterRg) === userCleanRg;
              const isSub = normalizeRg(permuta.substituteRg) === userCleanRg;
              const isUserInvolved = isReq || isSub;
              const needsMySignature = (isReq && !permuta.requesterSigned) || (isSub && !permuta.substituteSigned);

              return (
                <div 
                  key={permuta.id}
                  className={cn(
                    "bg-white rounded-2xl p-5 border shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4 relative",
                    permuta.status === PermutaStatus.ACCEPTED ? "border-emerald-200" :
                    permuta.status === PermutaStatus.REJECTED ? "border-rose-200" :
                    "border-slate-200"
                  )}
                >
                  {/* Cabeçalho do Card */}
                  <div>
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-black text-slate-800">
                          {permuta.date ? format(new Date(permuta.date + 'T00:00:00'), "dd/MM/yyyy (EEEE)", { locale: ptBR }) : '-'}
                        </span>
                      </div>
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border",
                        permuta.status === PermutaStatus.ACCEPTED ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        permuta.status === PermutaStatus.REJECTED ? "bg-rose-50 text-rose-700 border-rose-200" :
                        "bg-amber-50 text-amber-700 border-amber-200"
                      )}>
                        {permuta.status === PermutaStatus.ACCEPTED ? 'Deferida' :
                         permuta.status === PermutaStatus.REJECTED ? 'Indeferida' :
                         'Pendente'}
                      </span>
                    </div>

                    {/* Partes Envolvidas */}
                    <div className="space-y-3">
                      {/* Quem Sai */}
                      <div className="flex items-start justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                            Quem Sai (Oficial Requerente)
                          </span>
                          <span className="text-xs font-black text-slate-800 block mt-0.5">
                            {permuta.requesterName || permuta.requesterRg}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            RG: {permuta.requesterRg}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded",
                            permuta.requesterSigned 
                              ? "bg-emerald-100 text-emerald-800" 
                              : "bg-slate-200 text-slate-600"
                          )}>
                            {permuta.requesterSigned ? 'Assinado' : 'Pendente'}
                          </span>
                        </div>
                      </div>

                      {/* Quem Entra */}
                      <div className="flex items-start justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                            Quem Entra (Oficial Substituto)
                          </span>
                          <span className="text-xs font-black text-slate-800 block mt-0.5">
                            {permuta.isLookingForSubstitute ? (
                              <span className="text-purple-600 italic">Disponível no Mural de Oficiais</span>
                            ) : (
                              permuta.substituteName || permuta.substituteRg || '-'
                            )}
                          </span>
                          {!permuta.isLookingForSubstitute && permuta.substituteRg && (
                            <span className="text-[10px] font-bold text-slate-400">
                              RG: {permuta.substituteRg}
                            </span>
                          )}
                        </div>
                        {!permuta.isLookingForSubstitute && (
                          <div className="text-right">
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded",
                              permuta.substituteSigned 
                                ? "bg-emerald-100 text-emerald-800" 
                                : "bg-slate-200 text-slate-600"
                            )}>
                              {permuta.substituteSigned ? 'Assinado' : 'Pendente'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações do Card */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    {/* Botão de Assinar */}
                    {needsMySignature && permuta.status === PermutaStatus.PENDING && (
                      <button
                        onClick={() => setSignModalPermuta(permuta)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Assinar
                      </button>
                    )}

                    {/* Botão de Pegar Serviço do Mural */}
                    {permuta.isLookingForSubstitute && !isReq && (
                      <button
                        onClick={() => handleTakeOffer(permuta)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> Assumir Serviço
                      </button>
                    )}

                    {/* Ações do Escalante/Admin */}
                    {isAdminOrEscalante && permuta.status === PermutaStatus.PENDING && !permuta.isLookingForSubstitute && (
                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          onClick={() => setDeferModalPermuta({ permuta, action: 'deferir' })}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                          title="Deferir Permuta de Oficial"
                        >
                          Deferir
                        </button>
                        <button
                          onClick={() => setDeferModalPermuta({ permuta, action: 'indeferir' })}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                          title="Indeferir Permuta de Oficial"
                        >
                          Indeferir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Conteúdo: Visão em Tabela / Livro */}
      {activeTab === 'tabela' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-widest text-[9.5px] font-black">
                <tr>
                  <th className="py-3 px-4">Data do Serviço</th>
                  <th className="py-3 px-4">Quem Sai (Requerente)</th>
                  <th className="py-3 px-4">Quem Entra (Substituto)</th>
                  <th className="py-3 px-4">Assinaturas</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                {filteredPermutas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 uppercase text-xs">
                      Nenhuma permuta de oficial encontrada nesta visualização.
                    </td>
                  </tr>
                ) : (
                  filteredPermutas.map((permuta) => {
                    const isReq = normalizeRg(permuta.requesterRg) === userCleanRg;
                    const isSub = normalizeRg(permuta.substituteRg) === userCleanRg;
                    const needsMySignature = (isReq && !permuta.requesterSigned) || (isSub && !permuta.substituteSigned);

                    return (
                      <tr key={permuta.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-black text-slate-800 whitespace-nowrap">
                          {permuta.date ? format(new Date(permuta.date + 'T00:00:00'), "dd/MM/yyyy (EEE)", { locale: ptBR }).toUpperCase() : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-black text-slate-800">{permuta.requesterName || '-'}</div>
                          <div className="text-[10px] text-slate-400 font-bold">RG: {permuta.requesterRg}</div>
                        </td>
                        <td className="py-3 px-4">
                          {permuta.isLookingForSubstitute ? (
                            <span className="text-purple-600 italic">Disponível no Mural de Oficiais</span>
                          ) : (
                            <>
                              <div className="font-black text-slate-800">{permuta.substituteName || '-'}</div>
                              <div className="text-[10px] text-slate-400 font-bold">RG: {permuta.substituteRg}</div>
                            </>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "text-[8.5px] px-1.5 py-0.5 rounded font-black uppercase",
                              permuta.requesterSigned ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                            )}>
                              Sai: {permuta.requesterSigned ? 'Sim' : 'Não'}
                            </span>
                            {!permuta.isLookingForSubstitute && (
                              <span className={cn(
                                "text-[8.5px] px-1.5 py-0.5 rounded font-black uppercase",
                                permuta.substituteSigned ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                              )}>
                                Entra: {permuta.substituteSigned ? 'Sim' : 'Não'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border",
                            permuta.status === PermutaStatus.ACCEPTED ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            permuta.status === PermutaStatus.REJECTED ? "bg-rose-50 text-rose-700 border-rose-200" :
                            "bg-amber-50 text-amber-700 border-amber-200"
                          )}>
                            {permuta.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {needsMySignature && permuta.status === PermutaStatus.PENDING && (
                              <button
                                onClick={() => setSignModalPermuta(permuta)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                              >
                                Assinar
                              </button>
                            )}

                            {isAdminOrEscalante && permuta.status === PermutaStatus.PENDING && !permuta.isLookingForSubstitute && (
                              <>
                                <button
                                  onClick={() => setDeferModalPermuta({ permuta, action: 'deferir' })}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                                >
                                  Deferir
                                </button>
                                <button
                                  onClick={() => setDeferModalPermuta({ permuta, action: 'indeferir' })}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                                >
                                  Indeferir
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conteúdo: Visão em Mural de Ofertas */}
      {activeTab === 'ofertas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPermutas.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 p-8">
              <Sparkles className="w-12 h-12 text-purple-300 mx-auto mb-3" />
              <h3 className="text-base font-black text-slate-700 uppercase">Mural de Ofertas Livre</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Nenhum oficial disponibilizou serviço no mural no momento.
              </p>
            </div>
          ) : (
            filteredPermutas.map((permuta) => {
              const isReq = normalizeRg(permuta.requesterRg) === userCleanRg;
              return (
                <div key={permuta.id} className="bg-white rounded-2xl p-5 border-2 border-purple-200 shadow-xs flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-3 border-b border-purple-100 pb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-purple-700">
                        {permuta.offerType === 'pago' ? 'Serviço a Pagar' : 'Oferta de Troca'}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                        {permuta.date ? format(new Date(permuta.date + 'T00:00:00'), 'dd/MM/yyyy') : '-'}
                      </span>
                    </div>

                    <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100">
                      <span className="text-[9px] font-black uppercase text-purple-600 block">Oficial Titular</span>
                      <span className="text-xs font-black text-slate-800 block mt-0.5">{permuta.requesterName}</span>
                      <span className="text-[10px] font-bold text-slate-400">RG: {permuta.requesterRg}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    {isReq ? (
                      <span className="text-[10px] font-bold text-slate-400 uppercase italic">
                        Esta oferta é sua
                      </span>
                    ) : (
                      <button
                        onClick={() => handleTakeOffer(permuta)}
                        className="w-full py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" /> Assumir Este Serviço
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal: Nova Permuta de Oficial */}
      <AnimatePresence>
        {isNewPermutaOpen && (
          <motion.div
            key="modal-nova-permuta-oficial"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setIsNewPermutaOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative my-8"
            >
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-700 text-white flex items-center justify-center shadow-md">
                    <ArrowRightLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                      Nova Permuta de Oficial
                    </h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {obmContext || '10º GBM'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNewPermutaOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmitNewPermuta} className="space-y-4">
                {/* Data do Serviço */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">
                    Data do Serviço de Oficial *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 uppercase outline-none focus:bg-white focus:border-indigo-400 transition-all"
                  />
                </div>

                {/* Quem Sai */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">
                    Oficial que Sai (Requerente) *
                  </label>
                  {isAdminOrEscalante ? (
                    <select
                      value={formRequesterRg}
                      onChange={(e) => setFormRequesterRg(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 uppercase outline-none focus:bg-white focus:border-indigo-400 transition-all"
                    >
                      {unitOfficers.map(o => (
                        <option key={o.rg} value={o.rg}>
                          {parseRank(o.rank || '')} {o.warName || o.name} (RG: {o.rg})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={`${parseRank(user.rank || '')} ${user.warName || user.name} (RG: ${user.rg})`}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-600 uppercase"
                    />
                  )}
                </div>

                {/* Opção de Mural ou Selecionar Substituto */}
                <div className="p-3 bg-purple-50/50 border border-purple-200 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsMural}
                      onChange={(e) => setFormIsMural(e.target.checked)}
                      className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-xs font-black uppercase text-purple-800">
                      Disponibilizar no Mural de Oficiais (Sem substituto definido)
                    </span>
                  </label>
                </div>

                {/* Quem Entra (Substituto Oficial) */}
                {!formIsMural ? (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">
                      Oficial Substituto (Quem Entra) *
                    </label>
                    <select
                      value={formSubstituteRg}
                      onChange={(e) => setFormSubstituteRg(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 uppercase outline-none focus:bg-white focus:border-indigo-400 transition-all cursor-pointer"
                    >
                      <option value="">Selecione o Oficial Substituto...</option>
                      {unitOfficers
                        .filter(o => normalizeRg(o.rg) !== normalizeRg(formRequesterRg))
                        .map(o => (
                          <option key={o.rg} value={o.rg}>
                            {parseRank(o.rank || '')} {o.warName || o.name} (RG: {o.rg})
                          </option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">
                      Tipo de Oferta no Mural
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormOfferType('troca')}
                        className={cn(
                          "py-2 rounded-xl text-xs font-black uppercase tracking-wider border cursor-pointer",
                          formOfferType === 'troca'
                            ? "bg-purple-100 text-purple-800 border-purple-300"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        )}
                      >
                        Troca Livre
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormOfferType('pago')}
                        className={cn(
                          "py-2 rounded-xl text-xs font-black uppercase tracking-wider border cursor-pointer",
                          formOfferType === 'pago'
                            ? "bg-purple-100 text-purple-800 border-purple-300"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        )}
                      >
                        Serviço a Pagar
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsNewPermutaOpen(false)}
                    className="px-4 py-2.5 text-slate-500 hover:text-slate-700 text-xs font-black uppercase tracking-wider cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-md cursor-pointer flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <span>Salvando...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Solicitar Permuta</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Assinar Permuta */}
      <AnimatePresence>
        {signModalPermuta && (
          <motion.div
            key="modal-assinar-permuta"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setSignModalPermuta(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase">Assinatura Digital de Oficial</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase">Acordo formal regulamentar</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 mb-6 text-xs font-bold text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Data do Serviço:</span>
                  <span className="text-slate-900 font-black">{signModalPermuta.date ? format(new Date(signModalPermuta.date + 'T00:00:00'), 'dd/MM/yyyy') : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Oficial Requerente:</span>
                  <span>{signModalPermuta.requesterName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Oficial Substituto:</span>
                  <span>{signModalPermuta.substituteName}</span>
                </div>
              </div>

              <p className="text-[11px] font-medium text-slate-500 mb-6">
                Ao assinar, declaro estar ciente e de acordo com a troca de serviço especificada, em conformidade com as normas do CBMERJ.
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSignModalPermuta(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmSignature}
                  className="flex-1 py-2.5 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-md cursor-pointer"
                >
                  {isSubmitting ? 'Assinando...' : 'Confirmar Assinatura'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Deferimento / Indeferimento */}
      <AnimatePresence>
        {deferModalPermuta && (
          <motion.div
            key="modal-decisao-permuta"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setDeferModalPermuta(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shadow-xs text-white",
                  deferModalPermuta.action === 'deferir' ? "bg-emerald-600" : "bg-rose-600"
                )}>
                  {deferModalPermuta.action === 'deferir' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase">
                    {deferModalPermuta.action === 'deferir' ? 'Deferir Permuta' : 'Indeferir Permuta'}
                  </h3>
                  <p className="text-xs font-bold text-slate-400 uppercase">Decisão do Escalante / Comando</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 mb-6 text-xs font-bold text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">Data do Serviço:</span>
                  <span className="text-slate-900 font-black">{deferModalPermuta.permuta.date ? format(new Date(deferModalPermuta.permuta.date + 'T00:00:00'), 'dd/MM/yyyy') : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sai:</span>
                  <span>{deferModalPermuta.permuta.requesterName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Entra:</span>
                  <span>{deferModalPermuta.permuta.substituteName}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeferModalPermuta(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmDecision}
                  className={cn(
                    "flex-1 py-2.5 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-md cursor-pointer",
                    deferModalPermuta.action === 'deferir' 
                      ? "bg-emerald-600 hover:bg-emerald-700" 
                      : "bg-rose-600 hover:bg-rose-700"
                  )}
                >
                  {isSubmitting ? 'Processando...' : `Confirmar ${deferModalPermuta.action === 'deferir' ? 'Deferimento' : 'Indeferimento'}`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
