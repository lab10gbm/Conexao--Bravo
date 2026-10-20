import React, { useState, useEffect, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { safeSaveDocRef } from '../../lib/apiClient';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings,
  CheckCircle2,
  AlertCircle,
  CalendarRange,
  ArrowUpDown,
  Copy,
  FileSpreadsheet,
  Printer,
  Map as MapIcon,
  Briefcase,
  Clock,
  Calendar,
  Info
} from 'lucide-react';

import { UserProfile } from '../../types';
import { db } from '../../lib/firebase';
import { cn, formatMilitaryName, getAlaForDate, getAlaLightColor, getAlaColor, normalizeObm, cleanUndefined } from '../../lib/utils';
import { sortAllBySeniority } from '../../lib/rankUtils';
import { useMilitars } from '../../contexts/MilitarContext';

// Feature components, types, hooks, and helpers
import type { ExpedienteData } from './types';
import {
  FUNCOES_ESCALA,
  WORK_REGIMES,
  splitMilitaryRankAndWarName,
  formatPreferenceFunction,
  safeArr
} from './lib/expedienteCalculos';
import { copyExpedienteTables } from './lib/expedienteCopy';
import { useExpedienteData } from './hooks/useExpedienteData';
import { useExpedienteStatus } from './hooks/useExpedienteStatus';
import { useWeeklyChanges } from './hooks/useWeeklyChanges';
import { useExpedienteActions } from './hooks/useExpedienteActions';

import { ExpedienteSwapModal } from './components/ExpedienteSwapModal';
import { ExpedienteWeeklyChangeModal } from './components/ExpedienteWeeklyChangeModal';
import { ExpedienteMilitaryMoveModal } from './components/ExpedienteMilitaryMoveModal';
import { ExpedienteQuickAddModal } from './components/ExpedienteQuickAddModal';
import { ExpedienteRemoveMemberModal } from './components/ExpedienteRemoveMemberModal';
import { ExpedienteMappingView } from './components/ExpedienteMappingView';
import { ExpedienteNeedsView } from './components/ExpedienteNeedsView';
import { ExpedienteReportsView } from './components/ExpedienteReportsView';
import { ExpedienteMemberManagementView } from './components/ExpedienteMemberManagementView';
import { ExpedienteWeeklyView } from './components/ExpedienteWeeklyView';
import { ExpedienteCalendarView } from './components/ExpedienteCalendarView';

export interface ExpedienteSchedulerProps {
  user: UserProfile;
  obmContext: string;
  forceExpanded?: boolean;
  allowCollapse?: boolean;
  defaultExpanded?: boolean;
}

export function ExpedienteScheduler({
  user,
  obmContext,
  forceExpanded = false,
  allowCollapse,
  defaultExpanded
}: ExpedienteSchedulerProps) {
  const { militars, updateMilitarLocal } = useMilitars();

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    if (now.getDate() > 20) {
      return startOfMonth(addMonths(now, 1));
    }
    return startOfMonth(now);
  });

  const [selectedObm, setSelectedObm] = useState<string>(() => {
    const rawUserObm = normalizeObm(user.obm || '10º GBM');
    if (user.isAdmin || user.isEscalante) {
      if (obmContext && obmContext !== 'GLOBAL') return normalizeObm(obmContext);
    }
    return rawUserObm;
  });

  const {
    data,
    setData,
    loading,
    afastamentos,
    generalPermutas,
    normalizedObm,
    monthKey,
    monthDocRef,
    globalDocRef
  } = useExpedienteData({
    selectedObm,
    currentMonth,
    obmContext
  });

  const [expedienteUsers, setExpedienteUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const usersList: UserProfile[] = [];
    const addedRgs = new Set<string>();

    militars.forEach((u) => {
      const rawObm = normalizeObm(u.obm || '10º GBM');
      const obmMatch = rawObm === selectedObm;
      if (!obmMatch) return;

      const docId = u.uid || u.rg || '';
      const alaUpper = u.ala?.toString().toUpperCase() || '';

      const inData = docId
        ? data.requirements[docId] !== undefined ||
          !!data.selections[docId] ||
          data.userNames[docId] !== undefined
        : false;

      if (
        alaUpper.includes('EXP') ||
        alaUpper === 'E' ||
        alaUpper === 'EXPEDIENTE' ||
        inData
      ) {
        usersList.push({ ...u, uid: docId, rg: u.rg || docId, name: u.name || '' });
        if (docId) addedRgs.add(docId);
      }
    });

    Object.keys(data.userNames || {}).forEach((rg) => {
      if (rg !== 'ESCALANTE_PREF' && !addedRgs.has(rg)) {
        usersList.push({ uid: rg, rg, name: data.userNames[rg], rank: '', ala: 'EXP' });
        addedRgs.add(rg);
      }
    });

    setExpedienteUsers(usersList.sort(sortAllBySeniority));
  }, [militars, selectedObm, data]);

  const [adminTargetRg, setAdminTargetRg] = useState<string | null>(null);
  const isCollapsible = allowCollapse !== undefined ? allowCollapse : !forceExpanded;
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    if (!isCollapsible) return true;
    if (defaultExpanded !== undefined) return defaultExpanded;
    return false;
  });

  useEffect(() => {
    if (!isCollapsible) {
      setIsExpanded(true);
    }
  }, [isCollapsible]);

  const [adminConfigMode, setAdminConfigMode] = useState(false);
  const [viewMode, setViewMode] = useState<
    'calendar' | 'semanal' | 'mapeamento' | 'necessidades' | 'relatorios'
  >('calendar');
  const [weeklyFilterDays, setWeeklyFilterDays] = useState<'all' | 'weekdays'>('weekdays');
  const [weeklyLayoutMode, setWeeklyLayoutMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('expediente_weekly_layout_mode');
      if (saved === 'grid' || saved === 'list') return saved as 'grid' | 'list';
      return window.innerWidth < 768 ? 'list' : 'grid';
    }
    return 'grid';
  });
  const [expandedDaysList, setExpandedDaysList] = useState<Record<string, boolean>>({});

  const handleToggleWeeklyLayoutMode = (mode: 'grid' | 'list') => {
    setWeeklyLayoutMode(mode);
    try {
      localStorage.setItem('expediente_weekly_layout_mode', mode);
    } catch {
      // ignore
    }
  };

  const [mapeamentoSubView, setMapeamentoSubView] = useState<'table' | 'lista' | 'escala_sv'>('table');
  const [transposeTable, setTransposeTable] = useState(false);
  const [reportType, setReportType] = useState<'mensal' | 'semanal'>('mensal');
  const [selectedWeekMonday, setSelectedWeekMonday] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    if (day === 5 || day === 6 || day === 0) {
      return startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
    }
    return startOfWeek(today, { weekStartsOn: 1 });
  });

  const [extraMonthData, setExtraMonthData] = useState<Record<string, any>>({});
  const [copyStatus, setCopyStatus] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmLock, setConfirmLock] = useState(false);

  const [militaryMoveModal, setMilitaryMoveModal] = useState<{
    isOpen: boolean;
    type: 'mensal_s24h' | 'semanal_exp';
    militarRg: string;
    militarName: string;
    currentDayStr: string;
    currentStatus?: 'servico' | 'expediente' | 'folga';
  } | null>(null);

  const [quickAddModal, setQuickAddModal] = useState<{
    isOpen: boolean;
    type: 'mensal_s24h' | 'semanal_exp';
    dayStr: string;
  } | null>(null);
  const [quickAddSearch, setQuickAddSearch] = useState('');

  const isAdmin = user.isAdmin;
  const isEscalante = user.isEscalante;

  useEffect(() => {
    if (
      !isAdmin &&
      !isEscalante &&
      (viewMode === 'mapeamento' ||
        viewMode === 'relatorios' ||
        viewMode === 'necessidades')
    ) {
      setViewMode('calendar');
    }
  }, [isAdmin, isEscalante, viewMode]);

  const alaCheck = (user.ala?.toString() || '').toUpperCase();
  const isExp =
    alaCheck.includes('EXP') || alaCheck === 'E' || alaCheck === 'EXPEDIENTE';
  const canInteract = isAdmin || isExp || user.isEscalante;
  const activeRg =
    (isAdmin || user.isEscalante) && adminTargetRg ? adminTargetRg : user.rg;

  const availableObms = useMemo(() => {
    const allowedObms = [
      '10º GBM',
      '1/10',
      '2/10',
      '3/10',
      '4/10',
      '26º GBM',
      '1/26'
    ];
    const target = normalizeObm(obmContext || user.obm || '10º GBM');
    const is26Context = target.includes('26');
    const is10Context = target.includes('10');

    let list = allowedObms.filter((obm) => {
      if (is26Context) return obm.includes('26');
      if (is10Context) return obm.includes('10');
      return true;
    });

    if (list.length === 0) list = [is26Context ? '26º GBM' : '10º GBM'];
    return list.sort();
  }, [obmContext, user.obm]);

  useEffect(() => {
    if (obmContext && obmContext !== 'GLOBAL') {
      setSelectedObm(obmContext.trim());
    }
  }, [obmContext]);

  const fullWeekDays = useMemo(() => {
    return [0, 1, 2, 3, 4, 5, 6].map((offset) =>
      addDays(selectedWeekMonday, offset)
    );
  }, [selectedWeekMonday]);

  const weekDays = useMemo(() => {
    return [0, 1, 2, 3, 4].map((offset) => addDays(selectedWeekMonday, offset));
  }, [selectedWeekMonday]);

  const weekMonthKeys = useMemo(() => {
    const keys = new Set<string>();
    fullWeekDays.forEach((d) => keys.add(format(d, 'yyyy-MM')));
    return Array.from(keys);
  }, [fullWeekDays]);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    weekMonthKeys.forEach((mKey) => {
      if (mKey !== monthKey) {
        const mRef = doc(db, `expediente_${normalizedObm}`, mKey);
        const unsub = onSnapshot(mRef, (snap) => {
          if (snap.exists()) {
            setExtraMonthData((prev) => ({ ...prev, [mKey]: snap.data() }));
          } else {
            setExtraMonthData((prev) => ({
              ...prev,
              [mKey]: { selections: {}, expedienteDays: {} }
            }));
          }
        });
        unsubs.push(unsub);
      }
    });
    return () => {
      unsubs.forEach((u) => u());
    };
  }, [weekMonthKeys, monthKey, normalizedObm]);

  // Hook for calculation helpers & inquiries
  const {
    getReqAmount,
    getRegime,
    getSector,
    getRegimeDisplay,
    getServicosOrdinariosDisplay,
    getExpQuota,
    getPermutaForDay,
    checkDayHasPermuta,
    getDayStatus,
    getWorkersForDay,
    checkNeedFulfilled,
    isOrdinarioLockedForUser,
    isWeeklyLockedForUser
  } = useExpedienteStatus({
    data,
    extraMonthData,
    afastamentos,
    generalPermutas,
    expedienteUsers,
    militars,
    monthKey
  });

  // Hook for weekly change requests
  const {
    allWeeklyChangeRequests,
    userCurrentWeekRequest,
    showWeeklyChangeModal,
    setShowWeeklyChangeModal,
    proposedWeeklyChanges,
    setProposedWeeklyChanges,
    weeklyChangeReason,
    setWeeklyChangeReason,
    handleOpenWeeklyChangeModal,
    handleSubmitWeeklyChangeRequest,
    handleApproveWeeklyChange,
    handleRejectWeeklyChange,
    handleCancelWeeklyChange
  } = useWeeklyChanges({
    data,
    setData,
    extraMonthData,
    setExtraMonthData,
    monthKey,
    monthDocRef,
    normalizedObm,
    activeRg,
    user,
    isAdmin,
    expedienteUsers,
    fullWeekDays,
    selectedWeekMonday,
    getDayStatus,
    setActionFeedback
  });

  // Hook for actions & updates
  const {
    addMemberRg,
    setAddMemberRg,
    memberSearchTerm,
    setMemberSearchTerm,
    showMemberDropdown,
    setShowMemberDropdown,
    removeMemberRg,
    setRemoveMemberRg,
    removeMemberAla,
    setRemoveMemberAla,
    autoExpStatus,
    handleMoveMilitaryDay,
    handleRemoveMilitaryFromDay,
    handleSwapMilitaryDays,
    handleQuickAssignMilitary,
    handleAddToExpediente,
    handleRemoveFromExpediente,
    confirmRemoveFromExpediente,
    handleTogglePrefDate,
    updateExpQuota,
    handleCycleCellStatus,
    handleSetWeeklyDayStatus,
    handleCycleWeeklyStatus,
    handleAutoFillExp,
    handleUpdatePrefDetail,
    handleToggleDay
  } = useExpedienteActions({
    data,
    setData,
    extraMonthData,
    setExtraMonthData,
    monthDocRef,
    globalDocRef,
    monthKey,
    normalizedObm,
    currentMonth,
    user,
    isAdmin,
    activeRg,
    expedienteUsers,
    afastamentos,
    getReqAmount,
    getExpQuota,
    getPermutaForDay,
    isOrdinarioLockedForUser,
    isWeeklyLockedForUser,
    updateMilitarLocal,
    setActionFeedback,
    setMilitaryMoveModal,
    setQuickAddModal
  });

  const handleCopyTables = async () => {
    const activeVisualMode =
      viewMode === 'mapeamento' ? mapeamentoSubView : viewMode;
    const ok = await copyExpedienteTables(activeVisualMode, () => {
      setCopyStatus(true);
      setTimeout(() => setCopyStatus(false), 2000);
    });
    if (!ok) {
      console.warn('Não foi possível copiar a tabela');
    }
  };

  const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });
  const currentMonthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

  const userReq = activeRg ? getReqAmount(activeRg) : 0;
  const userSels = activeRg ? safeArr(data.selections[activeRg]) : [];
  const progress =
    userReq > 0 ? Math.round((userSels.length / userReq) * 100) : 0;

  let activeMilitaryName = 'Seu Status';
  if ((isAdmin || user.isEscalante) && adminTargetRg && adminTargetRg !== user.rg) {
    const u = expedienteUsers.find((x) => x.rg === adminTargetRg);
    if (u) {
      activeMilitaryName = formatMilitaryName(
        u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name
      );
    } else {
      activeMilitaryName = `RG: ${adminTargetRg}`;
    }
  }

  const currentWeekExpCount = activeRg
    ? fullWeekDays.filter((d) => {
        const dStr = format(d, 'yyyy-MM-dd');
        return getDayStatus(activeRg, dStr).type === 'expediente';
      }).length
    : 0;

  const subShifts = currentMonthDays
    .map((d) => {
      if (!activeRg) return null;
      const dStr = format(d, 'yyyy-MM-dd');
      const st = getDayStatus(activeRg, dStr);
      if (
        st.type === 'servico' &&
        st.isPermuta &&
        st.permutaInfo?.role === 'substitute'
      ) {
        return {
          date: d,
          otherPartyName: st.permutaInfo.otherPartyName,
          status: st.permutaInfo.status
        };
      }
      return null;
    })
    .filter(Boolean) as { date: Date; otherPartyName?: string; status: string }[];

  const pendingUserWeeklyChangesCount = (
    data.weeklyChangeRequests || []
  ).filter((r) => r.rg === activeRg && r.status === 'pending').length;

  if (!canInteract && !isAdmin) return null;

  return (
    <div
      id="expediente-scheduler"
      className="mb-6 sm:mb-12 border-2 border-slate-300 rounded-xl overflow-hidden shadow-sm bg-white"
    >
      {/* Cabeçalho Interativo ou Fixo */}
      {isCollapsible ? (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          className={cn(
            'w-full flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-6 transition-all text-left gap-4 cursor-pointer',
            isExpanded
              ? 'bg-indigo-50/70 border-b-2 border-slate-200 hover:bg-indigo-100/50'
              : 'bg-white hover:bg-slate-50'
          )}
        >
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'p-3 rounded-lg border-2 transition-colors shadow-xs',
                isExpanded
                  ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              )}
            >
              <CalendarRange className="w-6 h-6" />
            </div>
            <div className="text-left flex flex-col items-start gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                  Escala do Expediente
                </h3>
                <div className="text-[9px] font-black text-indigo-500 bg-indigo-100/90 px-2 py-0.5 rounded uppercase tracking-widest hidden sm:block border border-indigo-200">
                  OPERAÇÕES EXP
                </div>
                {!isExpanded && (
                  <span className="text-[9px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider border border-indigo-200">
                    DASHBOARD
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                {isExpanded
                  ? 'Planejamento e Registro de Serviços 24h e Expediente Semanal'
                  : 'Painel compacto da escala de expediente • Clique para expandir ou recolher'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center shrink-0">
            <div className="hidden sm:flex flex-col items-end mr-1 text-right">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {isExpanded ? 'Escala Aberta' : 'Status Resumido'}
              </span>
              <span className="text-xs font-bold text-slate-700">
                {isExpanded
                  ? 'Clique para minimizar'
                  : `${userSels.length + subShifts.length} sv. 24h • ${currentWeekExpCount} exp.`}
              </span>
            </div>
            <div
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-black text-xs uppercase tracking-wider transition-all',
                isExpanded
                  ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  : 'bg-indigo-600 border-indigo-600 text-white shadow-xs hover:bg-indigo-700'
              )}
            >
              <span>{isExpanded ? 'RECOLHER SEÇÃO' : 'EXPANDIR SEÇÃO'}</span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 transition-transform duration-300',
                  isExpanded && 'rotate-180'
                )}
              />
            </div>
          </div>
        </button>
      ) : (
        <div className="w-full flex items-center justify-between p-4 sm:p-6 bg-indigo-50/70 border-b-2 border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg border-2 bg-indigo-100 border-indigo-300 shadow-sm">
              <CalendarRange className="w-6 h-6 text-indigo-700" />
            </div>
            <div className="text-left flex flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                  Escala do Expediente
                </h3>
                <div className="text-[9px] font-black text-indigo-500 bg-indigo-100/90 px-2 py-0.5 rounded uppercase tracking-widest hidden sm:block border border-indigo-200">
                  OPERAÇÕES EXP
                </div>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                Planejamento e Registro de Serviços 24h e Expediente Semanal
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD COMPACTO QUANDO MINIMIZADO */}
      {(() => {
        if (isExpanded || !isCollapsible) return null;
        const sortedSels = [...(userSels || [])].sort();

        return (
          <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-slate-100/40 to-slate-50 border-t border-slate-200 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 flex-1">
              {/* Mês Referência */}
              <div className="md:col-span-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-center gap-1 hover:border-slate-300 transition-colors">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5 mb-1">
                  <Calendar className="w-4 h-4 text-slate-400" /> Mês Referência
                </span>
                <span className="text-lg font-black text-slate-800 capitalize leading-none">
                  {format(currentMonth, 'MMMM', { locale: ptBR })}
                </span>
                <span className="text-sm font-bold text-slate-500 capitalize">
                  {format(currentMonth, 'yyyy', { locale: ptBR })}
                </span>
              </div>

              {/* Serviços 24h */}
              <div className="md:col-span-6 p-4 bg-gradient-to-br from-indigo-50/80 to-blue-50/50 rounded-2xl border border-indigo-100 shadow-2xs flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <Clock className="w-32 h-32 text-indigo-900" />
                </div>

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-indigo-200/50 pb-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-500" /> Serviços 24h
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-indigo-950 leading-none">
                        {userSels.length + subShifts.length}
                      </span>
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                        {userReq > 0 ? `(Previstos: ${userReq})` : 'Marcados'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[9px] font-black tracking-widest uppercase mb-1">
                    <span className="bg-white/70 text-indigo-800 px-2.5 py-1 rounded-md border border-indigo-200 shadow-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      {userSels.length} Ordinários
                    </span>
                    {subShifts.length > 0 && (
                      <span className="bg-purple-100/90 text-purple-800 px-2.5 py-1 rounded-md border border-purple-300 shadow-sm flex items-center gap-1">
                        <ArrowUpDown className="w-3 h-3 text-purple-500" />
                        +{subShifts.length} Permuta{subShifts.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative z-10 flex flex-wrap gap-2 mt-1">
                  {userSels.length === 0 && subShifts.length === 0 && (
                    <span className="text-xs font-bold text-slate-400 italic py-2">
                      Nenhum serviço 24h agendado.
                    </span>
                  )}
                  {sortedSels.map((s) => (
                    <div
                      key={s}
                      className="bg-white border-2 border-indigo-100 shadow-sm px-2.5 py-1.5 rounded-xl flex items-center gap-2 hover:border-indigo-300 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
                        <span className="text-[10px] font-black text-indigo-600">
                          {format(new Date(`${s}T12:00:00`), 'dd')}
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-indigo-900 uppercase tracking-wider pr-1">
                        {format(new Date(`${s}T12:00:00`), 'MMM', { locale: ptBR })}
                      </span>
                    </div>
                  ))}
                  {subShifts.map((s, i) => (
                    <div
                      key={`sub-${i}`}
                      className="bg-purple-600 border-2 border-purple-700 shadow-md px-2.5 py-1.5 rounded-xl flex flex-col justify-center hover:bg-purple-700 transition-colors"
                      title={`Substituindo ${s.otherPartyName} (${s.status})`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5">
                          <ArrowUpDown className="w-3.5 h-3.5 text-purple-200" />
                          <span className="text-[11px] font-black text-white">
                            {format(s.date, 'dd/MM')}
                          </span>
                        </div>
                        <span
                          className={cn(
                            'text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded',
                            s.status === 'pending'
                              ? 'bg-amber-400/20 text-amber-200'
                              : 'bg-emerald-400/20 text-emerald-200'
                          )}
                        >
                          {s.status === 'pending' ? 'Pendente' : 'Deferido'}
                        </span>
                      </div>
                      <span className="text-[8px] font-bold text-purple-200 uppercase tracking-widest mt-1">
                        Subs. {s.otherPartyName?.split(' ')[0] || 'Militar'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Semana Atual */}
              <div className="md:col-span-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-center gap-1 hover:border-slate-300 transition-colors">
                <span className="text-[10px] font-black uppercase text-sky-500 tracking-widest flex items-center gap-1.5 mb-1">
                  <Briefcase className="w-4 h-4 text-sky-500" /> Semana Atual
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-sky-950 leading-none">
                    {currentWeekExpCount}
                  </span>
                  <span className="text-xs font-bold text-slate-500 capitalize leading-none mb-1">
                    Dias
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 border-t border-slate-100 pt-1.5">
                  De Expediente
                </span>
              </div>
            </div>

            {pendingUserWeeklyChangesCount > 0 && (
              <div className="flex items-center justify-end mt-1 shrink-0">
                <span className="text-[10px] font-black text-amber-800 bg-amber-100/90 border border-amber-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  {pendingUserWeeklyChangesCount} alteração pendente
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* Conteúdo Expansível da Escala */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="expediente-main-content"
            initial={isCollapsible ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={isCollapsible ? { height: 0, opacity: 0 } : undefined}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 sm:p-6 bg-slate-50 flex flex-col gap-6">
              {/* Top controls */}
              <div className="flex flex-col xl:flex-row items-center justify-between gap-4 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  {(isAdmin || user.isEscalante) && (
                    <button
                      onClick={() => setAdminConfigMode(!adminConfigMode)}
                      className={cn(
                        'px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2',
                        adminConfigMode
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-indigo-300'
                      )}
                    >
                      <Settings className="w-4 h-4" /> Configurar Membros
                    </button>
                  )}

                  {!adminConfigMode && (
                    <div className="flex items-center">
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                        <button
                          onClick={() => setViewMode('calendar')}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer',
                            viewMode === 'calendar'
                              ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 dark:border-slate-700'
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/60'
                          )}
                        >
                          <CalendarRange className="w-3 h-3" />{' '}
                          <span className="hidden sm:inline">
                            Calendário (S.24h)
                          </span>
                          <span className="sm:hidden">Cal. (S.24h)</span>
                        </button>
                        <button
                          onClick={() => {
                            setViewMode('semanal');
                            setWeeklyFilterDays('weekdays');
                          }}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer',
                            viewMode === 'semanal'
                              ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 dark:border-slate-700'
                              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/60'
                          )}
                        >
                          <Calendar className="w-3 h-3" />{' '}
                          <span className="hidden sm:inline">
                            Semanal (S.EXP)
                          </span>
                          <span className="sm:hidden">Sem. (S.EXP)</span>
                        </button>
                        {(isAdmin || user.isEscalante) && (
                          <>
                            <button
                              onClick={() => setViewMode('mapeamento')}
                              className={cn(
                                'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer',
                                viewMode === 'mapeamento'
                                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 dark:border-slate-700'
                                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/60'
                              )}
                            >
                              <MapIcon className="w-3 h-3" />{' '}
                              <span className="hidden sm:inline">Mapeamento</span>
                              <span className="sm:hidden">Mapear</span>
                            </button>
                            <button
                              onClick={() => setViewMode('relatorios')}
                              className={cn(
                                'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer',
                                viewMode === 'relatorios'
                                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 dark:border-slate-700'
                                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/60'
                              )}
                            >
                              <FileSpreadsheet className="w-3 h-3" />{' '}
                              <span className="hidden sm:inline">Relatórios</span>
                            </button>
                            <button
                              onClick={() => setViewMode('necessidades')}
                              className={cn(
                                'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer',
                                viewMode === 'necessidades'
                                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 dark:border-slate-700'
                                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/60'
                              )}
                            >
                              <AlertCircle className="w-3 h-3" />{' '}
                              <span className="hidden sm:inline">Necessidades</span>
                            </button>
                          </>
                        )}
                      </div>

                      {viewMode === 'relatorios' && (isAdmin || user.isEscalante) && (
                        <>
                          <button
                            onClick={handleCopyTables}
                            className="ml-2 px-3 py-1.5 rounded-lg border-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 shrink-0 cursor-pointer"
                            title="Copiar Relatórios"
                          >
                            {copyStatus ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden sm:inline">
                              {copyStatus ? 'Copiado' : 'Copiar'}
                            </span>
                          </button>
                          <button
                            onClick={() => window.print()}
                            className="ml-2 px-3 py-1.5 rounded-lg border-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 shrink-0 cursor-pointer"
                            title="Imprimir Relatório"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Imprimir</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 xl:ml-auto">
                  {(isAdmin || isEscalante) && availableObms.length > 1 && (
                    <select
                      value={selectedObm}
                      onChange={(e) => setSelectedObm(e.target.value)}
                      className="px-3 py-2 bg-white border-2 border-slate-200 text-slate-700 font-bold text-xs rounded-lg outline-none hover:border-indigo-300 focus:border-indigo-500 uppercase h-[42px]"
                    >
                      {availableObms.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Month / Week controls */}
                  {viewMode === 'semanal' ? (
                    <div className="flex bg-white rounded-lg border-2 border-slate-200 p-1 shadow-sm h-[42px] items-center">
                      <button
                        onClick={() =>
                          setSelectedWeekMonday(subWeeks(selectedWeekMonday, 1))
                        }
                        className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-600 flex items-center justify-center cursor-pointer"
                        title="Semana Anterior"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="text-center flex flex-col justify-center px-3 min-w-[130px]">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider leading-none">
                          {format(fullWeekDays[0], 'dd/MM')} a{' '}
                          {format(fullWeekDays[6], 'dd/MM')}
                        </span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                          Semana •{' '}
                          {format(selectedWeekMonday, 'MMM yyyy', {
                            locale: ptBR
                          })}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setSelectedWeekMonday(addWeeks(selectedWeekMonday, 1))
                        }
                        className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-600 flex items-center justify-center cursor-pointer"
                        title="Próxima Semana"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex bg-white rounded-lg border-2 border-slate-200 p-1 shadow-sm h-[42px]">
                      <button
                        onClick={() =>
                          setCurrentMonth(subMonths(currentMonth, 1))
                        }
                        className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-600 flex items-center justify-center"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="text-center flex flex-col justify-center px-4 min-w-[120px]">
                        <span className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">
                          {format(currentMonth, 'MMMM', { locale: ptBR })}
                        </span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-0.5">
                          {format(currentMonth, 'yyyy')}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setCurrentMonth(addMonths(currentMonth, 1))
                        }
                        className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-600 flex items-center justify-center"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Frase explicativa */}
              {!adminConfigMode && (
                <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-50/90 border-2 border-indigo-200/90 rounded-xl p-3.5 sm:p-4 text-slate-800 shadow-sm flex items-start sm:items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0 mt-0.5 sm:mt-0 shadow-sm">
                    <Info className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    {viewMode === 'calendar' ? (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100/90 border border-indigo-200 px-2 py-0.5 rounded w-fit shrink-0">
                          Calendário (S. 24h)
                        </span>
                        <p className="text-xs sm:text-sm font-bold text-slate-700 leading-snug">
                          Esse ambiente é para a escolha do serviço 24h na prontidão, das 09:00 às 09:00.
                        </p>
                      </div>
                    ) : viewMode === 'semanal' ? (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100/90 border border-indigo-200 px-2 py-0.5 rounded w-fit shrink-0">
                          Semana (S. EXP)
                        </span>
                        <p className="text-xs sm:text-sm font-bold text-slate-700 leading-snug">
                          Esse ambiente é para escolha dos dias de expedientes de segunda a sexta.{' '}
                          <span className="text-slate-500 font-medium">
                            (cabendo excepcionalmente a escolha de dias sábado e domingo.)
                          </span>
                        </p>
                      </div>
                    ) : viewMode === 'mapeamento' ? (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100/90 border border-indigo-200 px-2 py-0.5 rounded w-fit shrink-0">
                          Mapeamento Geral
                        </span>
                        <p className="text-xs sm:text-sm font-bold text-slate-700 leading-snug">
                          Visão geral e mapeamento das escalas de serviço 24h e expediente de todo o efetivo.
                        </p>
                      </div>
                    ) : viewMode === 'relatorios' ? (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100/90 border border-indigo-200 px-2 py-0.5 rounded w-fit shrink-0">
                          Relatórios Oficiais
                        </span>
                        <p className="text-xs sm:text-sm font-bold text-slate-700 leading-snug">
                          Ambiente de visualização, cópia e impressão dos relatórios oficiais da escala para publicação em boletim.
                        </p>
                      </div>
                    ) : viewMode === 'necessidades' ? (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100/90 border border-indigo-200 px-2 py-0.5 rounded w-fit shrink-0">
                          Necessidades
                        </span>
                        <p className="text-xs sm:text-sm font-bold text-slate-700 leading-snug">
                          Ambiente para definição de quotas e vagas preferenciais do mês estabelecidas pela chefia/escalante.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {adminConfigMode && (isAdmin || user.isEscalante) ? (
                <ExpedienteMemberManagementView
                  militars={militars}
                  expedienteUsers={expedienteUsers}
                  data={data}
                  setData={setData}
                  memberSearchTerm={memberSearchTerm}
                  setMemberSearchTerm={setMemberSearchTerm}
                  addMemberRg={addMemberRg}
                  setAddMemberRg={setAddMemberRg}
                  showMemberDropdown={showMemberDropdown}
                  setShowMemberDropdown={setShowMemberDropdown}
                  handleAddToExpediente={handleAddToExpediente}
                  handleRemoveFromExpediente={handleRemoveFromExpediente}
                  getRegime={getRegime}
                  getExpQuota={getExpQuota}
                  getReqAmount={getReqAmount}
                  getSector={getSector}
                  globalDocRef={globalDocRef}
                  monthDocRef={monthDocRef}
                  workRegimes={WORK_REGIMES}
                />
              ) : viewMode === 'mapeamento' && (isAdmin || user.isEscalante) ? (
                <ExpedienteMappingView
                  mapeamentoSubView={mapeamentoSubView}
                  setMapeamentoSubView={setMapeamentoSubView}
                  transposeTable={transposeTable}
                  setTransposeTable={setTransposeTable}
                  handleCopyTables={handleCopyTables}
                  copyStatus={copyStatus}
                  handleAutoFillExp={handleAutoFillExp}
                  autoExpStatus={autoExpStatus}
                  isAdmin={isAdmin}
                  user={user}
                  expedienteUsers={expedienteUsers}
                  currentMonthDays={currentMonthDays}
                  data={data}
                  activeRg={activeRg}
                  afastamentos={afastamentos}
                  getReqAmount={getReqAmount}
                  getExpQuota={getExpQuota}
                  updateExpQuota={updateExpQuota}
                  handleCycleCellStatus={handleCycleCellStatus}
                />
              ) : viewMode === 'necessidades' && (isAdmin || user.isEscalante) ? (
                <ExpedienteNeedsView
                  currentMonthDays={currentMonthDays}
                  data={data}
                  handleTogglePrefDate={handleTogglePrefDate}
                  handleUpdatePrefDetail={handleUpdatePrefDetail}
                  funcoesEscala={FUNCOES_ESCALA}
                />
              ) : viewMode === 'relatorios' && (isAdmin || user.isEscalante) ? (
                <ExpedienteReportsView
                  reportType={reportType}
                  setReportType={setReportType}
                  currentMonth={currentMonth}
                  setCurrentMonth={setCurrentMonth}
                  selectedWeekMonday={selectedWeekMonday}
                  setSelectedWeekMonday={setSelectedWeekMonday}
                  weekDays={weekDays}
                  selectedObm={selectedObm}
                  expedienteUsers={expedienteUsers}
                  getSector={getSector}
                  getRegimeDisplay={getRegimeDisplay}
                  getServicosOrdinariosDisplay={getServicosOrdinariosDisplay}
                  getDayStatus={getDayStatus}
                  handleCycleWeeklyStatus={handleCycleWeeklyStatus}
                  handleCopyTables={handleCopyTables}
                  copyStatus={copyStatus}
                  isAdmin={isAdmin}
                  isEscalante={isEscalante}
                />
              ) : viewMode === 'semanal' ? (
                <ExpedienteWeeklyView
                  selectedWeekMonday={selectedWeekMonday}
                  setSelectedWeekMonday={setSelectedWeekMonday}
                  fullWeekDays={fullWeekDays}
                  weekDays={weekDays}
                  weeklyFilterDays={weeklyFilterDays}
                  setWeeklyFilterDays={setWeeklyFilterDays}
                  weeklyLayoutMode={weeklyLayoutMode}
                  handleToggleWeeklyLayoutMode={handleToggleWeeklyLayoutMode}
                  isAdmin={isAdmin}
                  user={user}
                  adminTargetRg={adminTargetRg}
                  setAdminTargetRg={setAdminTargetRg}
                  formatMilitaryName={formatMilitaryName}
                  expedienteUsers={expedienteUsers}
                  activeRg={activeRg}
                  getDayStatus={getDayStatus}
                  monthKey={monthKey}
                  monthDocRef={monthDocRef}
                  db={db}
                  normalizedObm={normalizedObm}
                  data={data}
                  setData={setData}
                  extraMonthData={extraMonthData}
                  setExtraMonthData={setExtraMonthData}
                  getReqAmount={getReqAmount}
                  getExpQuota={getExpQuota}
                  isWeeklyLockedForUser={isWeeklyLockedForUser}
                  isOrdinarioLockedForUser={isOrdinarioLockedForUser}
                  getRegimeDisplay={getRegimeDisplay}
                  handleOpenWeeklyChangeModal={handleOpenWeeklyChangeModal}
                  userCurrentWeekRequest={userCurrentWeekRequest}
                  actionFeedback={actionFeedback}
                  setActionFeedback={setActionFeedback}
                  handleCancelWeeklyChange={handleCancelWeeklyChange}
                  allWeeklyChangeRequests={allWeeklyChangeRequests}
                  handleRejectWeeklyChange={handleRejectWeeklyChange}
                  handleApproveWeeklyChange={handleApproveWeeklyChange}
                  getAlaForDate={getAlaForDate}
                  getAlaColor={getAlaColor}
                  getWorkersForDay={getWorkersForDay}
                  checkDayHasPermuta={checkDayHasPermuta}
                  expandedDaysList={expandedDaysList}
                  setExpandedDaysList={setExpandedDaysList}
                  handleSetWeeklyDayStatus={handleSetWeeklyDayStatus}
                  setMilitaryMoveModal={setMilitaryMoveModal}
                  checkNeedFulfilled={checkNeedFulfilled}
                />
              ) : (
                <ExpedienteCalendarView
                  currentMonthDays={currentMonthDays}
                  currentMonth={currentMonth}
                  data={data}
                  setData={setData}
                  monthDocRef={monthDocRef}
                  monthKey={monthKey}
                  isAdmin={isAdmin}
                  user={user}
                  setViewMode={setViewMode}
                  checkNeedFulfilled={checkNeedFulfilled}
                  handleToggleDay={handleToggleDay}
                  weekdays={weekdays}
                  days={days}
                  activeRg={activeRg}
                  expedienteUsers={expedienteUsers}
                  splitMilitaryRankAndWarName={splitMilitaryRankAndWarName}
                  formatMilitaryName={formatMilitaryName}
                  getAlaForDate={getAlaForDate}
                  getAlaLightColor={getAlaLightColor}
                  getAlaColor={getAlaColor}
                  setQuickAddSearch={setQuickAddSearch}
                  setQuickAddModal={setQuickAddModal}
                  formatPreferenceFunction={formatPreferenceFunction}
                  isExp={isExp}
                  activeMilitaryName={activeMilitaryName}
                  adminTargetRg={adminTargetRg}
                  setAdminTargetRg={setAdminTargetRg}
                  userSels={userSels}
                  userReq={userReq}
                  progress={progress}
                  getExpQuota={getExpQuota}
                  isOrdinarioLockedForUser={isOrdinarioLockedForUser}
                  confirmLock={confirmLock}
                  setConfirmLock={setConfirmLock}
                  setShowSwapModal={setShowSwapModal}
                  getReqAmount={getReqAmount}
                  getRegime={getRegime}
                  getSector={getSector}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAIS DO EXPEDIENTE */}
      <ExpedienteSwapModal
        isOpen={showSwapModal && !!activeRg}
        onClose={() => setShowSwapModal(false)}
        activeRg={activeRg}
        user={user}
        data={data}
        currentMonthDays={currentMonthDays}
        onSubmitSwap={async (newReq) => {
          const updatedRequests = [...(data.swapRequests || []), newReq];
          await safeSaveDocRef(
            monthDocRef,
            cleanUndefined({ swapRequests: updatedRequests }),
            true
          );
          alert('Solicitação enviada para avaliação!');
          setShowSwapModal(false);
        }}
      />

      <ExpedienteWeeklyChangeModal
        isOpen={showWeeklyChangeModal && !!activeRg}
        onClose={() => setShowWeeklyChangeModal(false)}
        activeRg={activeRg}
        fullWeekDays={fullWeekDays}
        getDayStatus={getDayStatus}
        proposedWeeklyChanges={proposedWeeklyChanges}
        setProposedWeeklyChanges={setProposedWeeklyChanges}
        weeklyChangeReason={weeklyChangeReason}
        setWeeklyChangeReason={setWeeklyChangeReason}
        onSubmit={handleSubmitWeeklyChangeRequest}
      />

      {militaryMoveModal && militaryMoveModal.isOpen && (
        <ExpedienteMilitaryMoveModal
          isOpen={militaryMoveModal.isOpen}
          onClose={() => setMilitaryMoveModal(null)}
          militarRg={militaryMoveModal.militarRg}
          militarName={militaryMoveModal.militarName}
          currentDayStr={militaryMoveModal.currentDayStr}
          currentStatus={militaryMoveModal.currentStatus}
          currentMonth={currentMonth}
          currentMonthDays={currentMonthDays}
          data={data}
          expedienteUsers={expedienteUsers}
          onMoveMilitaryDay={handleMoveMilitaryDay}
          onSwapMilitaryDays={handleSwapMilitaryDays}
          onRemoveMilitaryFromDay={handleRemoveMilitaryFromDay}
          onSelectMilitaryForEdit={(rg, name) => {
            setAdminTargetRg(rg);
            setMilitaryMoveModal(null);
            setActionFeedback({
              type: 'success',
              message: `Militar ${name} selecionado para edição!`
            });
          }}
        />
      )}

      {quickAddModal && quickAddModal.isOpen && (
        <ExpedienteQuickAddModal
          isOpen={quickAddModal.isOpen}
          onClose={() => setQuickAddModal(null)}
          dayStr={quickAddModal.dayStr}
          expedienteUsers={expedienteUsers}
          data={data}
          getReqAmount={getReqAmount}
          onQuickAssignMilitary={handleQuickAssignMilitary}
        />
      )}

      <ExpedienteRemoveMemberModal
        isOpen={!!removeMemberRg}
        onClose={() => setRemoveMemberRg(null)}
        removeMemberAla={removeMemberAla}
        setRemoveMemberAla={setRemoveMemberAla}
        onConfirm={confirmRemoveFromExpediente}
      />
    </div>
  );
}
