import React, { useState, useEffect, useMemo } from 'react';
import { parseRank, sortAllBySeniority } from "../lib/rankUtils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserProfile, PermutaRequest } from '../types';
import { doc, onSnapshot, setDoc, updateDoc, query, collection, getDocs, deleteField, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn, formatMilitaryName, getAlaForDate, getAlaLightColor, getAlaColor, normalizeObm } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, ChevronDown, Settings, CheckCircle2, User, AlertCircle, Save, CalendarRange, Table, ArrowUpDown, X, UserPlus, Trash2, List, Columns, Copy, Shield, FileSpreadsheet, Printer, Eye, Map as MapIcon, Briefcase, Clock, Coffee, Lock, Check, Calendar, Info, Send, XCircle, FileText, LayoutGrid } from 'lucide-react';
import { useMilitars } from '../contexts/MilitarContext';
import { cleanUndefined } from "../lib/utils";
import type {
  SwapRequest,
  WeeklyDayChange,
  WeeklyChangeRequest,
  Afastamento,
  PermutaDayDetails,
  DayStatusResult,
  ExpedienteData,
  MilitaryMoveModalData,
  QuickAddModalData
} from '../features/expediente/types';
export type {
  SwapRequest,
  WeeklyDayChange,
  WeeklyChangeRequest,
  Afastamento,
  PermutaDayDetails,
  DayStatusResult,
  ExpedienteData,
  MilitaryMoveModalData,
  QuickAddModalData
};
import {
  FUNCOES_ESCALA,
  COMPETENCY_MAP,
  WORK_REGIMES,
  parseRankAndNameFromString,
  splitMilitaryRankAndWarName,
  formatPreferenceFunction,
  safeArr
} from '../features/expediente/lib/expedienteCalculos';
export { FUNCOES_ESCALA, COMPETENCY_MAP, WORK_REGIMES, parseRankAndNameFromString, splitMilitaryRankAndWarName, formatPreferenceFunction };
import { ExpedienteSwapModal } from '../features/expediente/components/ExpedienteSwapModal';
import { ExpedienteWeeklyChangeModal } from '../features/expediente/components/ExpedienteWeeklyChangeModal';
import { ExpedienteMilitaryMoveModal } from '../features/expediente/components/ExpedienteMilitaryMoveModal';
import { ExpedienteQuickAddModal } from '../features/expediente/components/ExpedienteQuickAddModal';
import { ExpedienteRemoveMemberModal } from '../features/expediente/components/ExpedienteRemoveMemberModal';
import { ExpedienteMappingView } from '../features/expediente/components/ExpedienteMappingView';
import { ExpedienteNeedsView } from '../features/expediente/components/ExpedienteNeedsView';
import { ExpedienteReportsView } from '../features/expediente/components/ExpedienteReportsView';
import { ExpedienteMemberManagementView } from '../features/expediente/components/ExpedienteMemberManagementView';
import { ExpedienteWeeklyView } from '../features/expediente/components/ExpedienteWeeklyView';
import { ExpedienteCalendarView } from '../features/expediente/components/ExpedienteCalendarView';
import { useExpedienteData } from '../features/expediente/hooks/useExpedienteData';

interface ExpedienteSchedulerProps {
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

    militars.forEach(u => {
      const rawObm = normalizeObm(u.obm || '10º GBM');
      const obmMatch = rawObm === selectedObm;
      if (!obmMatch) return;

      const docId = u.uid || u.rg || '';
      const alaUpper = u.ala?.toString().toUpperCase() || '';
      
      const inData = docId ? (data.requirements[docId] !== undefined || !!data.selections[docId] || data.userNames[docId] !== undefined) : false;

      if (alaUpper.includes('EXP') || alaUpper === 'E' || alaUpper === 'EXPEDIENTE' || inData) {
        usersList.push({ ...u, uid: docId, rg: u.rg || docId, name: u.name || '' });
        if (docId) addedRgs.add(docId);
      }
    });

    Object.keys(data.userNames || {}).forEach(rg => {
       if (rg !== 'ESCALANTE_PREF' && !addedRgs.has(rg)) {
           usersList.push({ uid: rg, rg, name: data.userNames[rg], rank: '', ala: 'EXP' });
           addedRgs.add(rg);
       }
    });

    setExpedienteUsers(usersList.sort(sortAllBySeniority));
  }, [militars, selectedObm, data]);

  const [adminTargetRg, setAdminTargetRg] = useState<string | null>(null);
  const [addMemberRg, setAddMemberRg] = useState('');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
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
  const [viewMode, setViewMode] = useState<'calendar' | 'semanal' | 'mapeamento' | 'necessidades' | 'relatorios'>('calendar');
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
      const day = today.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
      // Toda sexta-feira a publicação é referente à semana seguinte
      if (day === 5 || day === 6 || day === 0) {
          return startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
      }
      return startOfWeek(today, { weekStartsOn: 1 });
  });
  const [extraMonthData, setExtraMonthData] = useState<Record<string, any>>({});
  const [copyStatus, setCopyStatus] = useState(false);
  const [autoExpStatus, setAutoExpStatus] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showWeeklyChangeModal, setShowWeeklyChangeModal] = useState(false);
  const [proposedWeeklyChanges, setProposedWeeklyChanges] = useState<Record<string, 'expediente' | 'servico' | 'folga'>>({});
  const [weeklyChangeReason, setWeeklyChangeReason] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmLock, setConfirmLock] = useState(false);
  const [removeMemberRg, setRemoveMemberRg] = useState<string | null>(null);
  const [removeMemberAla, setRemoveMemberAla] = useState('');
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

  const handleMoveMilitaryDay = async (rg: string, fromDayStr: string, toDayStr: string) => {
    if (!rg || !fromDayStr || !toDayStr || fromDayStr === toDayStr) return;
    const userSels = safeArr(data.selections[rg]);
    let newSels = userSels.filter(d => d !== fromDayStr);
    if (!newSels.includes(toDayStr)) {
      newSels.push(toDayStr);
    }
    const userExp = safeArr(data.expedienteDays?.[rg]);
    const newExp = userExp.filter(d => d !== toDayStr);

    setData(prev => ({
      ...prev,
      selections: { ...prev.selections, [rg]: newSels },
      expedienteDays: { ...(prev.expedienteDays || {}), [rg]: newExp }
    }));

    await setDoc(monthDocRef, cleanUndefined({
      selections: { [rg]: newSels },
      expedienteDays: { [rg]: newExp }
    }), { merge: true });

    setActionFeedback({ type: 'success', message: `Militar remanejado com sucesso para ${toDayStr.split('-').reverse().join('/')}!` });
    setMilitaryMoveModal(null);
  };

  const handleRemoveMilitaryFromDay = async (rg: string, dayStr: string, isExpOnly: boolean = false) => {
    if (!rg || !dayStr) return;
    const userSels = safeArr(data.selections[rg]);
    const userExp = safeArr(data.expedienteDays?.[rg]);

    const newSels = isExpOnly ? userSels : userSels.filter(d => d !== dayStr);
    const newExp = userExp.filter(d => d !== dayStr);

    setData(prev => ({
      ...prev,
      selections: { ...prev.selections, [rg]: newSels },
      expedienteDays: { ...(prev.expedienteDays || {}), [rg]: newExp }
    }));

    await setDoc(monthDocRef, cleanUndefined({
      selections: { [rg]: newSels },
      expedienteDays: { [rg]: newExp }
    }), { merge: true });

    setActionFeedback({ type: 'success', message: `Escalação removida do dia ${dayStr.split('-').reverse().join('/')}!` });
    setMilitaryMoveModal(null);
  };

  const handleSwapMilitaryDays = async (rgA: string, dayA: string, rgB: string, dayB: string) => {
    if (!rgA || !rgB || !dayA || !dayB) return;
    const selsA = safeArr(data.selections[rgA]).filter(d => d !== dayA);
    if (!selsA.includes(dayB)) selsA.push(dayB);

    const selsB = safeArr(data.selections[rgB]).filter(d => d !== dayB);
    if (!selsB.includes(dayA)) selsB.push(dayA);

    setData(prev => ({
      ...prev,
      selections: {
        ...prev.selections,
        [rgA]: selsA,
        [rgB]: selsB
      }
    }));

    await setDoc(monthDocRef, cleanUndefined({
      selections: {
        [rgA]: selsA,
        [rgB]: selsB
      }
    }), { merge: true });

    setActionFeedback({ type: 'success', message: 'Posição trocada com sucesso entre os militares!' });
    setMilitaryMoveModal(null);
  };

  const handleQuickAssignMilitary = async (rg: string, dayStr: string, mode: 'servico' | 'expediente' = 'servico') => {
    if (!rg || !dayStr) return;
    const userSels = safeArr(data.selections[rg]);
    const userExp = safeArr(data.expedienteDays?.[rg]);

    let newSels = [...userSels];
    let newExp = [...userExp];

    if (mode === 'servico') {
      if (!newSels.includes(dayStr)) newSels.push(dayStr);
      newExp = newExp.filter(d => d !== dayStr);
    } else {
      if (!newExp.includes(dayStr)) newExp.push(dayStr);
      newSels = newSels.filter(d => d !== dayStr);
    }

    setData(prev => ({
      ...prev,
      selections: { ...prev.selections, [rg]: newSels },
      expedienteDays: { ...(prev.expedienteDays || {}), [rg]: newExp }
    }));

    await setDoc(monthDocRef, cleanUndefined({
      selections: { [rg]: newSels },
      expedienteDays: { [rg]: newExp }
    }), { merge: true });

    setActionFeedback({ type: 'success', message: `Militar adicionado com sucesso ao dia ${dayStr.split('-').reverse().join('/')}!` });
    setQuickAddModal(null);
  };

  const handleCopyTables = async () => {
      const activeVisualMode = viewMode === 'mapeamento' ? mapeamentoSubView : viewMode;
      const containerId = activeVisualMode === 'table' ? 'table-view-container' : activeVisualMode === 'escala_sv' ? 'escala-sv-container' : activeVisualMode === 'relatorios' ? 'relatorios-container' : null;
      if (!containerId) return;
      const el = document.getElementById(containerId);
      if (!el) return;
      
      try {
          // Criar uma versão limpa da tabela para copiar
          const cleanHtml = (element: HTMLElement) => {
            const clone = element.cloneNode(true) as HTMLElement;
            
            // Remover elementos indesejados (como o input de EXP/Sem)
            const removeItems = clone.querySelectorAll('[data-no-copy="true"]');
            removeItems.forEach(item => item.remove());

            // Adicionar estilos inline para garantir que o LibreOffice/Word reconheça
            if (activeVisualMode === 'escala_sv') {
                const tables = clone.querySelectorAll('table');
                tables.forEach((table) => {
                    (table as HTMLElement).style.borderCollapse = 'collapse';
                    (table as HTMLElement).style.width = '100%';
                    (table as HTMLElement).style.marginBottom = '30px';
                    (table as HTMLElement).style.border = '1px solid #cbd5e1';

                    // Headers
                    const ths = table.querySelectorAll('th');
                    ths.forEach(th => {
                        (th as HTMLElement).style.border = '1px solid #cbd5e1';
                        (th as HTMLElement).style.padding = '8px';
                        (th as HTMLElement).style.backgroundColor = '#f1f5f9';
                        (th as HTMLElement).style.fontSize = '10px';
                        (th as HTMLElement).style.fontWeight = 'bold';
                        (th as HTMLElement).style.textAlign = 'center';
                    });

                    // Rows and Cells
                    const rows = table.querySelectorAll('tr');
                    rows.forEach(row => {
                        const tr = row as HTMLElement;
                        const isWeekend = tr.classList.contains('bg-amber-100/40') || tr.className.includes('bg-amber-100');
                        
                        if (isWeekend) {
                            tr.style.backgroundColor = '#fef3c7'; // cor de fim de semana
                        }

                        const tds = tr.querySelectorAll('td');
                        tds.forEach((td, colIdx) => {
                            const tce = td as HTMLElement;
                            tce.style.border = '1px solid #cbd5e1';
                            tce.style.padding = '6px';
                            tce.style.fontSize = '10px';
                            tce.style.textAlign = 'center';
                            
                            // Make first column (date) bold
                            if (colIdx === 0) {
                                tce.style.fontWeight = 'bold';
                            }
                            
                            if (isWeekend) {
                                tce.style.backgroundColor = '#fef3c7';
                            }

                            // Style "Sv." and "EXP."
                            const spans = tce.querySelectorAll('span');
                            spans.forEach(span => {
                                const s = span as HTMLElement;
                                if (s.textContent === 'SV.') {
                                    s.style.color = 'red';
                                    s.style.fontWeight = 'bold';
                                    s.style.padding = '4px 8px';
                                    s.style.border = 'none';
                                    s.style.borderRadius = '4px';
                                    s.style.backgroundColor = '#fef2f2'; // bg-red-50
                                    s.style.display = 'inline-block';
                                    s.style.whiteSpace = 'nowrap';
                                    s.style.minWidth = '40px';
                                    s.style.margin = '2px';
                                } else if (s.textContent === 'EXP.') {
                                    s.style.color = '#4f46e5'; // indigo-600
                                    s.style.fontWeight = 'bold';
                                    s.style.padding = '4px 8px';
                                    s.style.border = 'none';
                                    s.style.borderRadius = '4px';
                                    s.style.backgroundColor = '#eef2ff'; // bg-indigo-50
                                    s.style.display = 'inline-block';
                                    s.style.whiteSpace = 'nowrap';
                                    s.style.minWidth = '40px';
                                    s.style.margin = '2px';
                                }
                            });
                        });
                    });
                });

                // Separar as tabelas radicalmente com quebras de linha se houver múltiplas
                const tableWrappers = clone.querySelectorAll('.bg-white.rounded-xl');
                tableWrappers.forEach((wrapper, idx) => {
                    if (idx < tableWrappers.length - 1) {
                        const spacer = document.createElement('div');
                        spacer.style.height = '30px';
                        spacer.innerHTML = '<br/>&nbsp;<br/>'; 
                        wrapper.parentNode?.insertBefore(spacer, wrapper.nextSibling);
                    }
                    (wrapper as HTMLElement).style.marginBottom = '30px';
                    (wrapper as HTMLElement).style.width = '100%';
                    (wrapper as HTMLElement).style.display = 'block';
                });
            } else if (activeVisualMode === 'relatorios') {
                const headerEl = clone.querySelector('[data-report-header="true"]');
                if (headerEl) {
                    (headerEl as HTMLElement).style.textAlign = 'center';
                    (headerEl as HTMLElement).style.fontFamily = 'Arial, sans-serif';
                    (headerEl as HTMLElement).style.fontWeight = 'bold';
                    (headerEl as HTMLElement).style.marginBottom = '20px';
                    (headerEl as HTMLElement).style.textTransform = 'uppercase';
                }
                const tables = clone.querySelectorAll('table');
                tables.forEach(table => {
                    (table as HTMLElement).style.borderCollapse = 'collapse';
                    (table as HTMLElement).style.width = '100%';
                    (table as HTMLElement).style.border = '1px solid #000000';
                    (table as HTMLElement).style.fontFamily = 'Arial, sans-serif';
                    const ths = table.querySelectorAll('th');
                    ths.forEach(th => {
                        (th as HTMLElement).style.border = '1px solid #000000';
                        (th as HTMLElement).style.padding = '8px 10px';
                        (th as HTMLElement).style.backgroundColor = '#f1f5f9';
                        (th as HTMLElement).style.fontWeight = 'bold';
                        (th as HTMLElement).style.textAlign = 'center';
                        (th as HTMLElement).style.fontSize = '12px';
                        (th as HTMLElement).style.textTransform = 'uppercase';
                    });
                    const tds = table.querySelectorAll('td');
                    tds.forEach(td => {
                        (td as HTMLElement).style.border = '1px solid #000000';
                        (td as HTMLElement).style.padding = '6px 10px';
                        (td as HTMLElement).style.textAlign = 'center';
                        (td as HTMLElement).style.fontSize = '12px';
                    });
                });
            } else if (activeVisualMode === 'table') {
                // Formatting for the general table view if needed
                const tables = clone.querySelectorAll('table');
                tables.forEach(table => {
                    (table as HTMLElement).style.borderCollapse = 'collapse';
                    const cells = table.querySelectorAll('th, td');
                    cells.forEach(c => {
                        (c as HTMLElement).style.border = '1px solid #cbd5e1';
                        (c as HTMLElement).style.padding = '4px';
                    });
                });
            }

            return clone.innerHTML;
          };

          const htmlContent = cleanHtml(el);
          
          // Tentar usar a API moderna de clipboard
          if (navigator.clipboard && navigator.clipboard.write) {
              const type = "text/html";
              const blob = new Blob([htmlContent], { type });
              const data = [new ClipboardItem({ [type]: blob, ["text/plain"]: new Blob([el.innerText], { type: "text/plain" }) })];
              await navigator.clipboard.write(data);
          } else {
              // Fallback para document.execCommand
              const range = document.createRange();
              range.selectNode(el);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
              document.execCommand('copy');
              selection?.removeAllRanges();
          }
          
          setCopyStatus(true);
          setTimeout(() => setCopyStatus(false), 2000);
      } catch (err) {
          console.error("Failed to copy", err);
      }
  };
  
  const isAdmin = user.isAdmin;
  const isEscalante = user.isEscalante;

  useEffect(() => {
    if (!isAdmin && !isEscalante && (viewMode === 'mapeamento' || viewMode === 'relatorios' || viewMode === 'necessidades')) {
      setViewMode('calendar');
    }
  }, [isAdmin, isEscalante, viewMode]);

  const alaCheck = (user.ala?.toString() || '').toUpperCase();
  const isExp = alaCheck.includes('EXP') || alaCheck === 'E' || alaCheck === 'EXPEDIENTE';
  const canInteract = isAdmin || isExp || user.isEscalante;
  
  const activeRg = ((isAdmin || user.isEscalante) && adminTargetRg) ? adminTargetRg : user.rg;

  const availableObms = useMemo(() => {
     // Defines the hard whitelist requested by user
     const allowedObms = ['10º GBM', '1/10', '2/10', '3/10', '4/10', '26º GBM', '1/26'];
     
     // Determine the "Mother OBM" (10 or 26) to properly separate the systems
     const target = normalizeObm(obmContext || user.obm || '10º GBM');
     const is26Context = target.includes('26');
     const is10Context = target.includes('10');

     let list = allowedObms.filter(obm => {
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

  const handleAddToExpediente = async () => {
      if (!addMemberRg) return;
      try {
          const safeRg = addMemberRg.toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^0+/, '');
          if (db) {
             await setDoc(doc(db, 'militaries', safeRg), { ala: 'EXP' }, { merge: true });
          }
          updateMilitarLocal(addMemberRg, { ala: 'EXP' });
          setAddMemberRg('');
          setMemberSearchTerm('');
      } catch (e) {
          console.error(e);
          alert('Erro ao adicionar militar ao expediente.');
      }
  };

  const handleRemoveFromExpediente = (rg: string) => {
      setRemoveMemberRg(rg);
      setRemoveMemberAla('');
  };

  const confirmRemoveFromExpediente = async () => {
      if (!removeMemberRg) return;
      
      let alaValue = '';
      const normalizedAla = removeMemberAla.trim();
      
      if (['1', '2', '3', '4'].includes(normalizedAla)) {
          alaValue = normalizedAla;
      } else if (normalizedAla !== '0' && normalizedAla !== '') {
          alert('Ala inválida. Digite 1, 2, 3, 4, ou deixe em branco.');
          return;
      }
      
      try {
          const rgToUpdate = removeMemberRg;
          const safeRg = rgToUpdate.toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^0+/, '');
          
          if (db) {
              await setDoc(doc(db, 'militaries', safeRg), { ala: alaValue }, { merge: true });
          }
          updateMilitarLocal(rgToUpdate, { ala: alaValue });

          try {
              const globalUpdates: any = {
                  [`requirements.${rgToUpdate}`]: deleteField(),
                  [`userNames.${rgToUpdate}`]: deleteField(),
                  [`sectors.${rgToUpdate}`]: deleteField(),
                  [`regimes.${rgToUpdate}`]: deleteField()
              };
              await updateDoc(globalDocRef, globalUpdates);
          } catch (e: any) {
              if (e.code !== 'not-found') console.error('Global doc update error:', e);
          }
          
          try {
              const monthUpdates: any = {
                  [`selections.${rgToUpdate}`]: deleteField(),
                  [`locked.${rgToUpdate}`]: deleteField(),
                  [`lockedOrdinario.${rgToUpdate}`]: deleteField(),
                  [`expedienteDays.${rgToUpdate}`]: deleteField()
              };
              await updateDoc(monthDocRef, monthUpdates);
          } catch (e: any) {
              if (e.code !== 'not-found') console.error('Month doc update error:', e);
          }

          setRemoveMemberRg(null);
      } catch (e) {
          console.error(e);
          alert('Erro ao remover militar e limpar dados do expediente.');
      }
  };

  const handleTogglePrefDate = async (dayStr: string) => {
      let sels = Array.isArray(data.selections['ESCALANTE_PREF']) ? data.selections['ESCALANTE_PREF'] : [];
      const isRemoving = sels.includes(dayStr);
      if (isRemoving) sels = sels.filter(d => d !== dayStr);
      else sels = [...sels, dayStr];
      
      if (isRemoving) {
          const newPrefs = { ...(data.preferencesDetails || {}) };
          delete newPrefs[dayStr];
          
          setData(prev => ({
              ...prev, 
              selections: {...prev.selections, 'ESCALANTE_PREF': sels},
              preferencesDetails: newPrefs
          }));
          
          await setDoc(monthDocRef, cleanUndefined({ 
                        selections: { 'ESCALANTE_PREF': sels }
                    }), { merge: true });
          try {
              await updateDoc(monthDocRef, { [`preferencesDetails.${dayStr}`]: deleteField() });
          } catch(e) {}
      } else {
          setData(prev => ({...prev, selections: {...prev.selections, 'ESCALANTE_PREF': sels}}));
          await setDoc(monthDocRef, cleanUndefined({ selections: { 'ESCALANTE_PREF': sels } }), { merge: true });
      }
  };

  const updateExpQuota = async (rg: string, quota: number) => {
      const newQuotas = { ...data.expQuotas, [rg]: quota };
      setData(prev => ({ ...prev, expQuotas: newQuotas }));
      await setDoc(globalDocRef, cleanUndefined({ expQuotas: newQuotas }), { merge: true });
  };

  const getReqAmount = (rg: string) => {
      if (!rg) return 0;
      const clean = String(rg).replace(/[^A-Z0-9]/g, '').replace(/^0+/, '');

      let val = data.requirements?.[rg];
      if (val === undefined || isNaN(val)) {
          val = data.requirements?.[clean];
      }
      if (val === undefined || isNaN(val)) {
          const foundKey = Object.keys(data.requirements || {}).find(k => k.replace(/[^A-Z0-9]/g, '').replace(/^0+/, '') === clean);
          if (foundKey && data.requirements?.[foundKey] !== undefined) val = data.requirements[foundKey];
      }

      // If requirement is explicitly defined in data.requirements (e.g. from Controle de Membros), IT PREVAILS!
      if (typeof val === 'number' && !isNaN(val)) {
          return val;
      }

      // Check regime string ONLY to infer if requirement is not explicitly defined in data.requirements
      const reg = getRegime(rg);
      if (reg) {
          if (/1\s*exped.*3\s*serv/i.test(reg)) return 3;
          if (/3\s*exped.*(?:2\s*serv|serv)/i.test(reg)) return 2;
          if (/4\s*exped.*1\s*serv/i.test(reg)) return 1;
          if (/readaptado|redu[çc][ãa]o/i.test(reg)) return 0;
      }

      return 0;
  };
  const getRegime = (rg: string) => {
      if (!rg) return '';
      const clean = String(rg).replace(/[^A-Z0-9]/g, '').replace(/^0+/, '');
      let val = data.regimes?.[rg];
      if (!val) val = data.regimes?.[clean];
      if (!val) {
          const foundKey = Object.keys(data.regimes || {}).find(k => k.replace(/[^A-Z0-9]/g, '').replace(/^0+/, '') === clean);
          if (foundKey) val = data.regimes[foundKey];
      }
      return typeof val === 'string' ? val : '';
  };
  const safeArr = (val: any) => Array.isArray(val) ? val : [];

  const getPermutaForDay = (rg: string, dayStr: string, dataSource?: any): PermutaDayDetails | null => {
    if (!rg || !dayStr) return null;
    const targetCleanRg = String(rg || '').replace(/\D/g, '').trim();
    if (!targetCleanRg) return null;

    // 2. Permutas gerais da coleção 'permutas'
    for (const p of generalPermutas) {
      if (p.archived) continue;
      const st = String(p.status || '').toLowerCase().trim();
      if (st === 'cancelled' || st === 'rejected') continue;
      if (p.date !== dayStr) continue;

      const subClean = String(p.substituteRg || '').replace(/\D/g, '').trim();
      const idClean = String(p.acceptedById || '').replace(/\D/g, '').trim();
      const targetMilClean = String(p.targetMilitarId || '').replace(/\D/g, '').trim();
      const subIdClean = String(p.substituteId || '').replace(/\D/g, '').trim();

      const isSub = (subClean && subClean === targetCleanRg) ||
                    (idClean && idClean === targetCleanRg) ||
                    (targetMilClean && targetMilClean === targetCleanRg) ||
                    (subIdClean && subIdClean === targetCleanRg);

      if (isSub) {
        return {
          hasPermuta: true,
          role: 'substitute',
          status: st,
          otherPartyName: p.requesterName,
          otherPartyRg: p.requesterRg,
          source: 'general',
          permutaDocId: p.id
        };
      }

      const reqClean = String(p.requesterRg || '').replace(/\D/g, '').trim();
      const reqIdClean = String(p.requesterId || '').replace(/\D/g, '').trim();
      const isReq = (reqClean && reqClean === targetCleanRg) ||
                    (reqIdClean && reqIdClean === targetCleanRg);

      if (isReq) {
        return {
          hasPermuta: true,
          role: 'requester',
          status: st,
          otherPartyName: p.substituteName || p.acceptedByName,
          otherPartyRg: p.substituteRg,
          source: 'general',
          permutaDocId: p.id
        };
      }
    }


    // 1. Troca interna do módulo ExpedienteScheduler (data.swapRequests)
    const currentMonthSwapReqs = safeArr(data?.swapRequests);
    const extraSwapReqs = safeArr(dataSource?.swapRequests);
    const allSwapReqs = [...currentMonthSwapReqs, ...extraSwapReqs];

    const enteringSwap = allSwapReqs.find(
      r => String(r.rg || '').replace(/\D/g, '').trim() === targetCleanRg &&
           r.toDay === dayStr &&
           (r.status === 'approved' || r.status === 'pending')
    );
    if (enteringSwap) {
      return {
        hasPermuta: true,
        role: 'substitute',
        status: enteringSwap.status || 'approved',
        otherPartyName: enteringSwap.userName,
        source: 'internal'
      };
    }

    const leavingSwap = allSwapReqs.find(
      r => String(r.rg || '').replace(/\D/g, '').trim() === targetCleanRg &&
           r.fromDay === dayStr &&
           (r.status === 'approved' || r.status === 'pending')
    );
    if (leavingSwap) {
      return {
        hasPermuta: true,
        role: 'requester',
        status: leavingSwap.status || 'approved',
        otherPartyName: leavingSwap.userName,
        source: 'internal'
      };
    }

    return null;
  };

  const checkDayHasPermuta = (rg: string, dayStr: string, dataSource?: any): boolean => {
    const info = getPermutaForDay(rg, dayStr, dataSource);
    return Boolean(info && info.role === 'substitute');
  };
  const getSector = (rg: string) => {
      const val = data.sectors?.[rg];
      return typeof val === 'string' ? val : '';
  };

  const getRegimeDisplay = (rg: string) => {
      const raw = getRegime(rg);
      if (raw) {
          if (/1\s*Exped.*3\s*serv/i.test(raw)) return "01 Expediente e 03 serviços";
          if (/3\s*Exped.*(?:2\s*serv|serv)/i.test(raw)) return "03 Expedientes e 02 serviços";
          if (/4\s*Exped.*1\s*serv/i.test(raw)) return "04 Expedientes e 01 serviço";
          if (/4\s*Expedientes/i.test(raw) || /readaptado/i.test(raw)) return "04 Expedientes";
          if (/2\s*(?:e\s*)?1\/2\s*Exped/i.test(raw) || /redu[çc][ãa]o/i.test(raw)) return "02 e 1/2 Expedientes";
          return raw;
      }
      const req = getReqAmount(rg);
      if (req === 3) return "01 Expediente e 03 serviços";
      if (req === 2) return "03 Expedientes e 02 serviços";
      if (req === 1) return "04 Expedientes e 01 serviço";
      if (req === 0) return "04 Expedientes";
      return "-";
  };

  const getServicosOrdinariosDisplay = (u: UserProfile) => {
      const rg = u.rg || u.uid;
      const reqAmount = getReqAmount(rg);
      const rawRegime = getRegime(rg);
      const sels = safeArr(data.selections[rg]);

      if (sels.length > 0) {
          const sorted = [...sels].sort();
          const formattedDays = sorted.map(dayStr => {
              const dateObj = new Date(dayStr + 'T12:00:00');
              const day = format(dateObj, 'dd');
              const mon = format(dateObj, 'MMM', { locale: ptBR }).replace('.', '').toLowerCase();
              return `${day} ${mon}`;
          });

          if (formattedDays.length === 1) return formattedDays[0];
          if (formattedDays.length === 2) return `${formattedDays[0]} e ${formattedDays[1]}`;
          return `${formattedDays.slice(0, -1).join(', ')} e ${formattedDays[formattedDays.length - 1]}`;
      }

      const isExento = reqAmount === 0 && (
          rawRegime.includes('Readaptado') || 
          rawRegime.includes('Redução') || 
          rawRegime.includes('4 Expedientes')
      );

      if (reqAmount === 0 || isExento) {
          return "DTS";
      }

      return "";
  };
  
  const getExpQuota = (rg: string) => {
      if (!rg) return 0;
      const clean = String(rg).replace(/[^A-Z0-9]/g, '').replace(/^0+/, '');

      let val = data.expQuotas?.[rg];
      if (val === undefined || isNaN(val)) {
          val = data.expQuotas?.[clean];
      }
      if (val === undefined || isNaN(val)) {
          const foundKey = Object.keys(data.expQuotas || {}).find(k => k.replace(/[^A-Z0-9]/g, '').replace(/^0+/, '') === clean);
          if (foundKey && data.expQuotas?.[foundKey] !== undefined) val = data.expQuotas[foundKey];
      }
      if (typeof val === 'number' && !isNaN(val)) {
          return val;
      }

      const regime = getRegime(rg);
      const match = regime.match(/(\d+)\s*Exped/i);
      if (match) return parseInt(match[1], 10);
      if (/readaptado/i.test(regime)) return 4;
      if (/redu[çc][ãa]o/i.test(regime)) return 2;
      return 0;
  };

  const handleCycleCellStatus = async (rg: string, dayStr: string) => {
      const isLocked = isOrdinarioLockedForUser(rg, monthKey);
      if (isLocked && !isAdmin && !user.isEscalante && rg !== 'ESCALANTE_PREF') {
          alert("Sua escala ordinária (24h) deste mês já está confirmada e bloqueada. Para trocar de serviço, solicite uma Permuta.");
          return;
      }

      const userSels = safeArr(data.selections[rg]);
      const userExp = safeArr(data.expedienteDays?.[rg]);
      const isSel = userSels.includes(dayStr);
      const isExp = userExp.includes(dayStr);

      let newSels = [...userSels];
      let newExp = [...userExp];

      if (!isSel && !isExp) {
          // Empty -> SV
          newSels.push(dayStr);
      } else if (isSel) {
          // SV -> EXP
          newSels = newSels.filter(d => d !== dayStr);
          newExp.push(dayStr);
      } else if (isExp) {
          // EXP -> Empty
          newExp = newExp.filter(d => d !== dayStr);
      }

      setData(prev => ({
          ...prev,
          selections: { ...prev.selections, [rg]: newSels },
          expedienteDays: { ...(prev.expedienteDays || {}), [rg]: newExp }
      }));

      await setDoc(monthDocRef, cleanUndefined({
                selections: { [rg]: newSels },
                expedienteDays: { [rg]: newExp }
            }), { merge: true });
  };

  const fullWeekDays = useMemo(() => {
      return [0, 1, 2, 3, 4, 5, 6].map(offset => addDays(selectedWeekMonday, offset));
  }, [selectedWeekMonday]);

  const weekDays = useMemo(() => {
      return [0, 1, 2, 3, 4].map(offset => addDays(selectedWeekMonday, offset));
  }, [selectedWeekMonday]);

  const weekMonthKeys = useMemo(() => {
      const keys = new Set<string>();
      fullWeekDays.forEach(d => keys.add(format(d, 'yyyy-MM')));
      return Array.from(keys);
  }, [fullWeekDays]);

  useEffect(() => {
      const unsubs: (() => void)[] = [];
      weekMonthKeys.forEach(mKey => {
          if (mKey !== monthKey) {
              const mRef = doc(db, `expediente_${normalizedObm}`, mKey);
              const unsub = onSnapshot(mRef, (snap) => {
                  if (snap.exists()) {
                      setExtraMonthData(prev => ({ ...prev, [mKey]: snap.data() }));
                  } else {
                      setExtraMonthData(prev => ({ ...prev, [mKey]: { selections: {}, expedienteDays: {} } }));
                  }
              });
              unsubs.push(unsub);
          }
      });
      return () => {
          unsubs.forEach(u => u());
      };
  }, [weekMonthKeys, monthKey, normalizedObm]);

  const getDayStatus = (rg: string, dayStr: string): DayStatusResult => {
      const dayMonthKey = dayStr.substring(0, 7);
      const dataSource = dayMonthKey === monthKey ? data : (extraMonthData[dayMonthKey] || {});
      const sels = safeArr(dataSource.selections?.[rg]);
      const expDays = safeArr(dataSource.expedienteDays?.[rg]);

      const cleanTargetRg = String(rg || '').replace(/\D/g, '').trim();
      const afastamento = afastamentos.find(a => String(a.rg || '').replace(/\D/g, '').trim() === cleanTargetRg && dayStr >= a.inicio && dayStr <= a.retorno);
      if (afastamento) {
          return {
              text: afastamento.situacao.toUpperCase(),
              type: 'afastamento' as const,
              label: afastamento.situacao.toUpperCase(),
              isPermuta: false
          };
      }

      // Check Permuta for this militar on this day
      const permutaInfo = getPermutaForDay(rg, dayStr, dataSource);

      // 1. Militar assumiu o serviço 24h via permuta (substituto)
      if (permutaInfo && permutaInfo.role === 'substitute') {
          const isApproved = ['accepted', 'scheduled', 'approved'].includes(permutaInfo.status);
          const textStr = isApproved ? 'PERMUTA DEFERIDA' : 'PERMUTA PENDENTE';
          return {
              text: textStr,
              type: 'servico' as const,
              label: textStr,
              isPermuta: true,
              permutaInfo
          };
      }

      // 2. Militar passou o serviço para outro via permuta aceita/homologada (solicitante)
      if (permutaInfo && permutaInfo.role === 'requester') {
          const isApproved = ['accepted', 'scheduled', 'approved'].includes(permutaInfo.status);
          if (isApproved) {
              if (expDays.includes(dayStr)) {
                  return {
                      text: 'EXPEDIENTE',
                      type: 'expediente' as const,
                      label: 'EXPEDIENTE',
                      isPermuta: true,
                      permutaInfo
                  };
              }
              return {
                  text: 'FOLGA (PERMUTA)',
                  type: 'folga' as const,
                  label: 'FOLGA (PERMUTA)',
                  isPermuta: true,
                  permutaInfo
              };
          } else {
              // Se está pendente, o solicitante ainda está de serviço (pois a permuta não foi deferida)
              // Vamos exibir PERMUTA PENDENTE para alertá-lo e aos outros
              const textStr = 'PERMUTA PENDENTE';
              return {
                  text: textStr,
                  type: 'servico' as const,
                  label: textStr,
                  isPermuta: true,
                  permutaInfo
              };
          }
      }

      // 3. Seleção do calendário mensal ordinário (24h)
      if (sels.includes(dayStr)) {
          return {
              text: 'SERVIÇO',
              type: 'servico' as const,
              label: 'SERVIÇO',
              isPermuta: false
          };
      }

      // 4. Expediente
      if (expDays.includes(dayStr)) {
          return {
              text: 'EXPEDIENTE',
              type: 'expediente' as const,
              label: 'EXPEDIENTE',
              isPermuta: false
          };
      }

      // 5. Folga
      return {
          text: 'FOLGA',
          type: 'folga' as const,
          label: 'FOLGA',
          isPermuta: false
      };
  };


  const checkNeedFulfilled = (funcStr: string, dayStr: string, qtRequired: number = 1): boolean => {
      const { servicoList } = getWorkersForDay(dayStr);
      // Necessidades (Vagas) no módulo 24h devem ser supridas por militares de serviço (24h)
      const allWorkers = [...servicoList];
      
      const map = COMPETENCY_MAP[funcStr];
      if (!map) return false;
      
      let fulfilledCount = 0;
      
      for (const worker of allWorkers) {
          const m = militars.find(mil => (mil.rg || mil.uid) === worker.rg);
          if (m) {
              let hasCompetency = false;
              for (const key of map) {
                  if (key.startsWith('viaturas.')) {
                      if (m.viaturas?.[key.split('.')[1]]) hasCompetency = true;
                  } else {
                      if ((m as any)[key] || m.dynamicFunctions?.[key]) hasCompetency = true;
                  }
              }
              if (hasCompetency) fulfilledCount++;
          }
      }
      return fulfilledCount >= qtRequired;
  };

  const getWorkersForDay = (dayStr: string) => {
      const dayMonthKey = dayStr.substring(0, 7);
      const dataSource = dayMonthKey === monthKey ? data : (extraMonthData[dayMonthKey] || {});
      const selsObj = dataSource.selections || {};
      const expObj = dataSource.expedienteDays || {};
      const grdObj = dataSource.grdData || {};

      const servicoMap = new Map<string, { rg: string; name: string; isGrd: boolean; isPermuta?: boolean }>();

      // A partir das seleções regulares do mês
      Object.entries(selsObj).forEach(([rg, sels]: [string, any]) => {
          if (rg !== 'ESCALANTE_PREF' && Array.isArray(sels) && sels.includes(dayStr)) {
              const st = getDayStatus(rg, dayStr);
              if (st.type === 'servico') {
                  const found = expedienteUsers.find(u => (u.rg || u.uid) === rg);
                  servicoMap.set(rg, {
                      rg,
                      name: found ? formatMilitaryName(found.rank ? `${found.rank} ${found.warName || found.name.split(' ')[0]}` : found.name) : (dataSource.userNames?.[rg] || rg),
                      isGrd: !!grdObj[dayStr]?.includes(rg),
                      isPermuta: Boolean(st.isPermuta)
                  });
              }
          }
      });

      // A partir de permutas onde o militar assumiu o serviço nesta data
      expedienteUsers.forEach(u => {
          const rg = u.rg || u.uid;
          if (!rg || servicoMap.has(rg) || rg === 'ESCALANTE_PREF') return;
          const st = getDayStatus(rg, dayStr);
          if (st.type === 'servico' && st.isPermuta) {
              servicoMap.set(rg, {
                  rg,
                  name: formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name),
                  isGrd: !!grdObj[dayStr]?.includes(rg),
                  isPermuta: true
              });
          }
      });

      const servicoList = Array.from(servicoMap.values());

      const expedienteList = Object.entries(expObj)
          .filter(([rg, expDays]: [string, any]) => rg !== 'ESCALANTE_PREF' && Array.isArray(expDays) && expDays.includes(dayStr))
          .filter(([rg]) => getDayStatus(rg, dayStr).type === 'expediente')
          .map(([rg]) => {
              const found = expedienteUsers.find(u => (u.rg || u.uid) === rg);
              return {
                  rg,
                  name: found ? formatMilitaryName(found.rank ? `${found.rank} ${found.warName || found.name.split(' ')[0]}` : found.name) : (dataSource.userNames?.[rg] || rg)
              };
          });

      return { servicoList, expedienteList };
  };

  // Helper: Verifica se a escala ordinária (24h) mensal está bloqueada para o militar
  const isOrdinarioLockedForUser = (rg: string, targetMonthKey: string = monthKey): boolean => {
      if (!rg || rg === 'ESCALANTE_PREF') return false;
      const source = targetMonthKey === monthKey ? data : (extraMonthData[targetMonthKey] || {});
      const isLocked = !!(source.lockedOrdinario?.[rg] ?? source.locked?.[rg]);
      if (!isLocked) return false;

      // Se a cota ainda não foi atingida, o militar não deve ser bloqueado de preencher os dias restantes
      const req = getReqAmount(rg);
      const userSels = safeArr(source.selections?.[rg]);
      if (req > 0 && userSels.length < req) {
          return false;
      }
      return true;
  };

  // Helper: Verifica se a semana de expediente específica está bloqueada para o militar
  const isWeeklyLockedForUser = (rg: string, weekMonday: Date): boolean => {
      if (!rg || rg === 'ESCALANTE_PREF') return false;
      const weekKey = format(weekMonday, 'yyyy-MM-dd');
      const weekMonthKey = format(weekMonday, 'yyyy-MM');
      const source = weekMonthKey === monthKey ? data : (extraMonthData[weekMonthKey] || {});
      return !!source.lockedWeekly?.[weekKey]?.[rg];
  };

  const handleSetWeeklyDayStatus = async (
      rg: string, 
      dayStr: string, 
      mode: 'cycle' | 'expediente' | 'servico' | 'folga' = 'cycle'
  ) => {
      const isSelf = user.rg === rg || user.uid === rg;
      if (!isAdmin && !user.isEscalante && !isSelf) return;

      const dayMonthKey = dayStr.substring(0, 7);
      const targetDocRef = dayMonthKey === monthKey ? monthDocRef : doc(db, `expediente_${normalizedObm}`, dayMonthKey);
      const dataSource = dayMonthKey === monthKey ? data : (extraMonthData[dayMonthKey] || {});

      const dayDate = new Date(`${dayStr}T12:00:00`);
      const dayMonday = startOfWeek(dayDate, { weekStartsOn: 1 });

      const isWeekLocked = isWeeklyLockedForUser(rg, dayMonday);
      const isOrd24hLocked = isOrdinarioLockedForUser(rg, dayMonthKey);

      // Se a semana de expediente já foi bloqueada/confirmada e não é admin/escalante
      if (isWeekLocked && !isAdmin && !user.isEscalante) {
          alert("O expediente desta semana já foi confirmado e está bloqueado para edições.");
          return;
      }

      const afastamento = afastamentos.find(a => a.rg === rg && dayStr >= a.inicio && dayStr <= a.retorno);
      if (afastamento) return;

      const userSels = safeArr(dataSource.selections?.[rg]);
      const userExp = safeArr(dataSource.expedienteDays?.[rg]);
      const isSel = userSels.includes(dayStr);
      const isExp = userExp.includes(dayStr);

      // Se o dia já é um Serviço 24h assumido via Permuta
      const permuta = getPermutaForDay(rg, dayStr, dataSource);
      if (permuta && permuta.role === 'substitute' && !isAdmin && !user.isEscalante) {
          alert("Este dia é um Serviço (24h) homologado via Permuta. Não pode ser alterado diretamente.");
          return;
      }

      // Se o dia já é um Serviço 24h e a escala ordinária 24h está bloqueada
      if (isSel && isOrd24hLocked && !isAdmin && !user.isEscalante) {
          alert("Este dia é um S.24h Mensal Homologado. Não pode ser alterado diretamente; utilize a solicitação de Permuta se precisar trocar.");
          return;
      }

      // Se o usuário tenta marcar como serviço 24h mas a escala ordinária está bloqueada
      if (mode === 'servico' && isOrd24hLocked && !isAdmin && !user.isEscalante) {
          alert("A escala ordinária (24h) deste mês já está bloqueada. Novos serviços 24h só podem ser lançados pelo Escalante.");
          return;
      }

      let newSels = [...userSels];
      let newExp = [...userExp];
      const req = getReqAmount(rg);
      const expQuota = getExpQuota(rg);
      const weekDaysList = [0, 1, 2, 3, 4, 5, 6].map(offset => format(addDays(dayMonday, offset), 'yyyy-MM-dd'));
      const currentWeekExpCount = userExp.filter(d => weekDaysList.includes(d)).length;

      if (mode === 'cycle') {
          if (!isSel && !isExp) {
              // FOLGA -> EXPEDIENTE
              if (expQuota > 0 && currentWeekExpCount >= expQuota && !isAdmin && !user.isEscalante) {
                  alert(`Você já atingiu a cota semanal de ${expQuota} expedientes definida para seu regime/cadastro.`);
                  return;
              }
              newExp.push(dayStr);
          } else if (isExp) {
              // EXPEDIENTE -> se escala 24h estiver bloqueada para o militar, pula direto para FOLGA!
              if (isOrd24hLocked && !isAdmin && !user.isEscalante) {
                  newExp = newExp.filter(d => d !== dayStr);
              } else if (req > 0 && userSels.length >= req) {
                  // Cota atingida: pula para folga
                  newExp = newExp.filter(d => d !== dayStr);
              } else {
                  newExp = newExp.filter(d => d !== dayStr);
                  newSels.push(dayStr);
              }
          } else if (isSel) {
              // SERVIÇO -> FOLGA
              newSels = newSels.filter(d => d !== dayStr);
          }
      } else if (mode === 'expediente') {
          if (expQuota > 0 && currentWeekExpCount >= expQuota && !isExp && !isAdmin && !user.isEscalante) {
              alert(`Você já selecionou todos os ${expQuota} expedientes permitidos para esta semana.`);
              return;
          }
          newSels = newSels.filter(d => d !== dayStr);
          if (!newExp.includes(dayStr)) {
              newExp.push(dayStr);
          }
      } else if (mode === 'servico') {
          if (req > 0 && userSels.length >= req && !isSel) {
              alert(`Você já selecionou todos os ${req} serviços permitidos.`);
              return;
          }
          newExp = newExp.filter(d => d !== dayStr);
          if (!newSels.includes(dayStr)) {
              newExp.push(dayStr);
          }
      } else if (mode === 'folga') {
          newSels = newSels.filter(d => d !== dayStr);
          newExp = newExp.filter(d => d !== dayStr);
      }

      if (dayMonthKey === monthKey) {
          setData(prev => ({
              ...prev,
              selections: { ...prev.selections, [rg]: newSels },
              expedienteDays: { ...(prev.expedienteDays || {}), [rg]: newExp }
          }));
      } else {
          setExtraMonthData(prev => ({
              ...prev,
              [dayMonthKey]: {
                  selections: { ...(prev[dayMonthKey]?.selections || {}), [rg]: newSels },
                  expedienteDays: { ...(prev[dayMonthKey]?.expedienteDays || {}), [rg]: newExp }
              }
          }));
      }

      await setDoc(targetDocRef, cleanUndefined({
          selections: { [rg]: newSels },
          expedienteDays: { [rg]: newExp }
      }), { merge: true });
  };

  const handleCycleWeeklyStatus = async (rg: string, dayStr: string) => {
      if (!isAdmin && !user.isEscalante) return;
      const dayMonthKey = dayStr.substring(0, 7);
      const targetDocRef = dayMonthKey === monthKey ? monthDocRef : doc(db, `expediente_${normalizedObm}`, dayMonthKey);
      const dataSource = dayMonthKey === monthKey ? data : (extraMonthData[dayMonthKey] || {});

      const userSels = safeArr(dataSource.selections?.[rg]);
      const userExp = safeArr(dataSource.expedienteDays?.[rg]);
      const isSel = userSels.includes(dayStr);
      const isExp = userExp.includes(dayStr);

      let newSels = [...userSels];
      let newExp = [...userExp];

      if (!isSel && !isExp) {
          // FOLGA -> EXPEDIENTE
          newExp.push(dayStr);
      } else if (isExp) {
          // EXPEDIENTE -> SERVIÇO
          newExp = newExp.filter(d => d !== dayStr);
          newSels.push(dayStr);
      } else if (isSel) {
          // SERVIÇO -> FOLGA
          newSels = newSels.filter(d => d !== dayStr);
      }

      if (dayMonthKey === monthKey) {
          setData(prev => ({
              ...prev,
              selections: { ...prev.selections, [rg]: newSels },
              expedienteDays: { ...(prev.expedienteDays || {}), [rg]: newExp }
          }));
      } else {
          setExtraMonthData(prev => ({
              ...prev,
              [dayMonthKey]: {
                  selections: { ...(prev[dayMonthKey]?.selections || {}), [rg]: newSels },
                  expedienteDays: { ...(prev[dayMonthKey]?.expedienteDays || {}), [rg]: newExp }
              }
          }));
      }

      await setDoc(targetDocRef, cleanUndefined({
          selections: { [rg]: newSels },
          expedienteDays: { [rg]: newExp }
      }), { merge: true });
  };

  const currentWeekKey = format(selectedWeekMonday, 'yyyy-MM-dd');

  const allWeeklyChangeRequests: WeeklyChangeRequest[] = useMemo(() => {
    const list: WeeklyChangeRequest[] = [];
    const seen = new Set<string>();

    (data.weeklyChangeRequests || []).forEach(r => {
      if (!seen.has(r.id)) {
        list.push(r);
        seen.add(r.id);
      }
    });

    Object.values(extraMonthData).forEach(m => {
      (m?.weeklyChangeRequests || []).forEach((r: WeeklyChangeRequest) => {
        if (!seen.has(r.id)) {
          list.push(r);
          seen.add(r.id);
        }
      });
    });

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data.weeklyChangeRequests, extraMonthData]);

  const userCurrentWeekRequest = useMemo(() => {
    return allWeeklyChangeRequests.find(r => r.rg === activeRg && r.weekKey === currentWeekKey);
  }, [allWeeklyChangeRequests, activeRg, currentWeekKey]);

  const handleOpenWeeklyChangeModal = () => {
    const initialChanges: Record<string, 'expediente' | 'servico' | 'folga'> = {};
    fullWeekDays.forEach(d => {
      const dStr = format(d, 'yyyy-MM-dd');
      const st = getDayStatus(activeRg, dStr);
      initialChanges[dStr] = st.type === 'afastamento' ? 'folga' : st.type;
    });
    setProposedWeeklyChanges(initialChanges);
    setWeeklyChangeReason(userCurrentWeekRequest?.reason || '');
    setShowWeeklyChangeModal(true);
  };

  const handleSubmitWeeklyChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRg) return;

    const changes: WeeklyDayChange[] = [];
    fullWeekDays.forEach(d => {
      const dStr = format(d, 'yyyy-MM-dd');
      const curStatus = getDayStatus(activeRg, dStr).type;
      const normCur = curStatus === 'afastamento' ? 'folga' : curStatus;
      const propStatus = proposedWeeklyChanges[dStr] || normCur;

      if (propStatus !== normCur) {
        changes.push({
          dayStr: dStr,
          dayLabel: `${format(d, 'EEEE', { locale: ptBR })} (${format(d, 'dd/MM')})`,
          currentStatus: normCur,
          proposedStatus: propStatus
        });
      }
    });

    if (changes.length === 0) {
      setActionFeedback({ type: 'error', message: 'Nenhum dia foi alterado. Selecione ao menos um status diferente.' });
      setTimeout(() => setActionFeedback(null), 4000);
      return;
    }

    if (!weeklyChangeReason.trim()) {
      setActionFeedback({ type: 'error', message: 'Por favor, informe a justificativa da alteração.' });
      setTimeout(() => setActionFeedback(null), 4000);
      return;
    }

    const weekLabel = `${format(fullWeekDays[0], 'dd/MM')} a ${format(fullWeekDays[6], 'dd/MM/yyyy')}`;
    const targetUserObj = expedienteUsers.find(u => (u.rg || u.uid) === activeRg) || user;
    const userName = formatMilitaryName(targetUserObj.rank ? `${targetUserObj.rank} ${targetUserObj.warName || targetUserObj.name.split(' ')[0]}` : targetUserObj.name);

    const newRequest: WeeklyChangeRequest = {
      id: Math.random().toString(36).substring(2, 9),
      rg: activeRg,
      userName,
      weekKey: currentWeekKey,
      weekLabel,
      changes,
      reason: weeklyChangeReason.trim(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const weekMondayMonthKey = format(selectedWeekMonday, 'yyyy-MM');
    const targetDocRef = weekMondayMonthKey === monthKey ? monthDocRef : doc(db, `expediente_${normalizedObm}`, weekMondayMonthKey);
    const dataSource = weekMondayMonthKey === monthKey ? data : (extraMonthData[weekMondayMonthKey] || {});

    const existing = (dataSource.weeklyChangeRequests || []).filter((r: WeeklyChangeRequest) => r.id !== newRequest.id && !(r.rg === activeRg && r.weekKey === currentWeekKey && r.status === 'pending'));
    const updated = [...existing, newRequest];

    if (weekMondayMonthKey === monthKey) {
      setData(prev => ({ ...prev, weeklyChangeRequests: updated }));
    } else {
      setExtraMonthData(prev => ({
        ...prev,
        [weekMondayMonthKey]: {
          ...(prev[weekMondayMonthKey] || {}),
          weeklyChangeRequests: updated
        }
      }));
    }

    await setDoc(targetDocRef, cleanUndefined({ weeklyChangeRequests: updated }), { merge: true });
    setShowWeeklyChangeModal(false);
    setActionFeedback({ type: 'success', message: 'Solicitação de alteração enviada com sucesso ao Escalante!' });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleApproveWeeklyChange = async (req: WeeklyChangeRequest) => {
    if (!isAdmin && !user.isEscalante) return;

    try {
      const changesByMonth: Record<string, WeeklyDayChange[]> = {};
      req.changes.forEach(c => {
        const mKey = c.dayStr.substring(0, 7);
        if (!changesByMonth[mKey]) changesByMonth[mKey] = [];
        changesByMonth[mKey].push(c);
      });

      for (const [mKey, changes] of Object.entries(changesByMonth)) {
        const docRef = mKey === monthKey ? monthDocRef : doc(db, `expediente_${normalizedObm}`, mKey);
        const source = mKey === monthKey ? data : (extraMonthData[mKey] || {});

        let userSels = safeArr(source.selections?.[req.rg]);
        let userExp = safeArr(source.expedienteDays?.[req.rg]);

        changes.forEach(c => {
          if (c.proposedStatus === 'expediente') {
            userExp = [...userExp.filter(d => d !== c.dayStr), c.dayStr];
            userSels = userSels.filter(d => d !== c.dayStr);
          } else if (c.proposedStatus === 'servico') {
            userSels = [...userSels.filter(d => d !== c.dayStr), c.dayStr];
            userExp = userExp.filter(d => d !== c.dayStr);
          } else if (c.proposedStatus === 'folga') {
            userExp = userExp.filter(d => d !== c.dayStr);
            userSels = userSels.filter(d => d !== c.dayStr);
          }
        });

        await setDoc(docRef, cleanUndefined({
          selections: { [req.rg]: userSels },
          expedienteDays: { [req.rg]: userExp }
        }), { merge: true });

        if (mKey === monthKey) {
          setData(prev => ({
            ...prev,
            selections: { ...prev.selections, [req.rg]: userSels },
            expedienteDays: { ...(prev.expedienteDays || {}), [req.rg]: userExp }
          }));
        } else {
          setExtraMonthData(prev => ({
            ...prev,
            [mKey]: {
              ...(prev[mKey] || {}),
              selections: { ...(prev[mKey]?.selections || {}), [req.rg]: userSels },
              expedienteDays: { ...(prev[mKey]?.expedienteDays || {}), [req.rg]: userExp }
            }
          }));
        }
      }

      const reviewerName = formatMilitaryName(user.rank ? `${user.rank} ${user.warName || user.name.split(' ')[0]}` : user.name);
      const reqMonthKey = req.weekKey.substring(0, 7);
      const reqDocRef = reqMonthKey === monthKey ? monthDocRef : doc(db, `expediente_${normalizedObm}`, reqMonthKey);
      const source = reqMonthKey === monthKey ? data : (extraMonthData[reqMonthKey] || {});

      const updatedRequests = (source.weeklyChangeRequests || []).map((r: WeeklyChangeRequest) => {
        if (r.id === req.id) {
          return {
            ...r,
            status: 'approved' as const,
            reviewedBy: reviewerName,
            reviewedAt: new Date().toISOString()
          };
        }
        return r;
      });

      await setDoc(reqDocRef, cleanUndefined({ weeklyChangeRequests: updatedRequests }), { merge: true });

      if (reqMonthKey === monthKey) {
        setData(prev => ({ ...prev, weeklyChangeRequests: updatedRequests }));
      } else {
        setExtraMonthData(prev => ({
          ...prev,
          [reqMonthKey]: {
            ...(prev[reqMonthKey] || {}),
            weeklyChangeRequests: updatedRequests
          }
        }));
      }

      setActionFeedback({ type: 'success', message: `Alteração de ${req.userName} aprovada com sucesso! A escala foi atualizada.` });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error("Erro ao aprovar alteração semanal:", err);
      setActionFeedback({ type: 'error', message: 'Erro ao aprovar alteração.' });
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const handleRejectWeeklyChange = async (req: WeeklyChangeRequest, rejectionReason?: string) => {
    if (!isAdmin && !user.isEscalante) return;

    try {
      const reviewerName = formatMilitaryName(user.rank ? `${user.rank} ${user.warName || user.name.split(' ')[0]}` : user.name);
      const reqMonthKey = req.weekKey.substring(0, 7);
      const reqDocRef = reqMonthKey === monthKey ? monthDocRef : doc(db, `expediente_${normalizedObm}`, reqMonthKey);
      const source = reqMonthKey === monthKey ? data : (extraMonthData[reqMonthKey] || {});

      const updatedRequests = (source.weeklyChangeRequests || []).map((r: WeeklyChangeRequest) => {
        if (r.id === req.id) {
          return {
            ...r,
            status: 'rejected' as const,
            rejectionReason: rejectionReason || 'Solicitação não aprovada pelo escalante',
            reviewedBy: reviewerName,
            reviewedAt: new Date().toISOString()
          };
        }
        return r;
      });

      await setDoc(reqDocRef, cleanUndefined({ weeklyChangeRequests: updatedRequests }), { merge: true });

      if (reqMonthKey === monthKey) {
        setData(prev => ({ ...prev, weeklyChangeRequests: updatedRequests }));
      } else {
        setExtraMonthData(prev => ({
          ...prev,
          [reqMonthKey]: {
            ...(prev[reqMonthKey] || {}),
            weeklyChangeRequests: updatedRequests
          }
        }));
      }

      setActionFeedback({ type: 'success', message: `Solicitação de ${req.userName} recusada.` });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error("Erro ao recusar alteração semanal:", err);
    }
  };

  const handleCancelWeeklyChange = async (reqId: string, weekKey: string) => {
    try {
      const reqMonthKey = weekKey.substring(0, 7);
      const reqDocRef = reqMonthKey === monthKey ? monthDocRef : doc(db, `expediente_${normalizedObm}`, reqMonthKey);
      const source = reqMonthKey === monthKey ? data : (extraMonthData[reqMonthKey] || {});

      const updatedRequests = (source.weeklyChangeRequests || []).filter((r: WeeklyChangeRequest) => r.id !== reqId);

      await setDoc(reqDocRef, cleanUndefined({ weeklyChangeRequests: updatedRequests }), { merge: true });

      if (reqMonthKey === monthKey) {
        setData(prev => ({ ...prev, weeklyChangeRequests: updatedRequests }));
      } else {
        setExtraMonthData(prev => ({
          ...prev,
          [reqMonthKey]: {
            ...(prev[reqMonthKey] || {}),
            weeklyChangeRequests: updatedRequests
          }
        }));
      }

      setActionFeedback({ type: 'success', message: 'Solicitação de alteração cancelada.' });
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error("Erro ao cancelar solicitação:", err);
    }
  };

  const handleAutoFillExp = async () => {
      // confirm e alert removidos porque o iframe bloqueia modals nativos.
      
      const newExpDays: Record<string, string[]> = {};
      const svSelections = data.selections || {};
      
      let totalAssigned = 0;
      let logs = [];

      expedienteUsers.forEach(u => {
          const rg = u.rg || u.uid;
          if (!rg || rg === 'ESCALANTE_PREF') return;
          
          const quota = getExpQuota(rg);
          logs.push(`RG ${rg}: Cota ${quota}`);
          if (quota <= 0) return;

          const userExpDays: string[] = [];
          
          const firstDay = startOfMonth(currentMonth);
          const lastDay = endOfMonth(currentMonth);
          const days = eachDayOfInterval({ start: firstDay, end: lastDay });
          
          const weeks = new Map<string, Date[]>();
          days.forEach(d => {
             const weekNum = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
             if (!weeks.has(weekNum)) weeks.set(weekNum, []);
             
             if (d.getDay() !== 0 && d.getDay() !== 6) {
                 weeks.get(weekNum)!.push(d);
             }
          });

          weeks.forEach((weekdays) => {
              let assignedThisWeek = 0;
              const sortedWeekdays = [...weekdays].sort(() => Math.random() - 0.5);
              
              for (const d of sortedWeekdays) {
                  if (assignedThisWeek >= quota) break;
                  
                  const dayStr = format(d, 'yyyy-MM-dd');
                  if (!safeArr(svSelections[rg]).includes(dayStr)) {
                      userExpDays.push(dayStr);
                      assignedThisWeek++;
                  }
              }
          });
          
          if (userExpDays.length > 0) {
              newExpDays[rg] = userExpDays;
              totalAssigned += userExpDays.length;
          }
      });

      console.log(logs.join('\n'));
      console.log("newExpDays", newExpDays);

      setData(prev => ({ ...prev, expedienteDays: newExpDays }));
      await setDoc(monthDocRef, cleanUndefined({ expedienteDays: newExpDays }), { merge: true });
      
      setAutoExpStatus(true);
      setTimeout(() => setAutoExpStatus(false), 2000);
  };

  const handleUpdatePrefDetail = async (dayStr: string, func: string, qty: number) => {
      if (!func || func.startsWith('_')) return;
      if (typeof qty !== 'number' || isNaN(qty)) return;

      const localDayData = { ...(data.preferencesDetails?.[dayStr] || {}) };
      const fbDayData = { ...(data.preferencesDetails?.[dayStr] || {}) };
      
      if (qty <= 0) {
          delete localDayData[func];
      } else {
          localDayData[func] = qty;
          fbDayData[func] = qty;
      }
      
      const newLocalPrefs = { ...(data.preferencesDetails || {}), [dayStr]: localDayData };
      setData(prev => ({...prev, preferencesDetails: newLocalPrefs}));
      
      if (qty <= 0) {
          try {
              await updateDoc(monthDocRef, { [`preferencesDetails.${dayStr}.${func}`]: deleteField() });
          } catch(e) {}
      } else {
          const newFbPrefs = { ...(data.preferencesDetails || {}), [dayStr]: fbDayData };
          await setDoc(monthDocRef, cleanUndefined({ preferencesDetails: newFbPrefs }), { merge: true });
      }
  };

  const handleTargetedToggle = async (rgSelection: string, day: Date) => {
    if (!rgSelection) {
      alert("Nenhum militar selecionado.");
      return;
    }
    const dayStr = format(day, 'yyyy-MM-dd');
    let userSelections = safeArr(data.selections[rgSelection]);
    const req = getReqAmount(rgSelection);
    const isLocked = isOrdinarioLockedForUser(rgSelection, monthKey);

    // Se estiver bloqueado e o militar já completou a cota devida:
    if (isLocked && rgSelection !== 'ESCALANTE_PREF' && !isAdmin && !user.isEscalante) {
      if (userSelections.length >= req && !userSelections.includes(dayStr)) {
        alert("Sua escala ordinária (24h) deste mês já foi confirmada e está bloqueada. Use a opção 'Solicitar Troca' se precisar permutar.");
        return;
      }
    }

    const permuta = getPermutaForDay(rgSelection, dayStr);
    if (permuta && permuta.role === 'substitute' && !isAdmin && !user.isEscalante) {
      alert("Você está escalado neste dia através de Permuta Homologada. Este serviço não pode ser alterado diretamente pelo calendário.");
      return;
    }

    let userExpDays = safeArr(data.expedienteDays?.[rgSelection]);
    let isRemovingExp = false;
    
    if (rgSelection === 'ESCALANTE_PREF') {
        if (!isAdmin && !user.isEscalante) {
            alert("Apenas o Escalante ou Administrador pode definir datas preferenciais.");
            return;
        }
        if (userSelections.includes(dayStr)) {
           userSelections = userSelections.filter(d => d !== dayStr);
        } else {
           userSelections = [...userSelections, dayStr];
        }
    } else {
        if (req === 0) {
           alert("Este militar não possui serviços definidos para este mês. Configure-os na aba de Configurar Membros.");
           return;
        }
        
        if (userSelections.includes(dayStr)) {
           userSelections = userSelections.filter(d => d !== dayStr);
        } else {
           if (userSelections.length >= req) {
              alert(`Você já selecionou todos os ${req} serviços permitidos (${userSelections.length}/${req}). Para escolher esta data (${format(day, 'dd/MM')}), desmarque primeiro outro dia selecionado.`);
              return;
           }
           userSelections = [...userSelections, dayStr];
           
           if (userExpDays.includes(dayStr)) {
               userExpDays = userExpDays.filter(d => d !== dayStr);
               isRemovingExp = true;
           }
        }
    }

    const newMonthData: any = {
      selections: {
        [rgSelection]: userSelections
      }
    };
    
    if (isRemovingExp) {
        newMonthData.expedienteDays = {
            [rgSelection]: userExpDays
        };
    }

    setData(prev => ({
      ...prev,
      selections: {
        ...prev.selections,
        [rgSelection]: userSelections
      },
      ...isRemovingExp ? {
          expedienteDays: {
              ...(prev.expedienteDays || {}),
              [rgSelection]: userExpDays
          }
      } : {}
    })); // optimistic
    await setDoc(monthDocRef, cleanUndefined(newMonthData), { merge: true });
  };

  const handleToggleDay = async (day: Date) => {
    if (!activeRg) {
      alert("Para marcar serviços, é necessário ter o seu RG cadastrado no perfil ou selecionar um militar (Admin).");
      return;
    }
    await handleTargetedToggle(activeRg, day);
  };

  const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });
  const currentMonthDays = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

  const userReq = activeRg ? getReqAmount(activeRg) : 0;
  const userSels = activeRg ? safeArr(data.selections[activeRg]) : [];
  const progress = userReq > 0 ? Math.round((userSels.length / userReq) * 100) : 0;

  let activeMilitaryName = "Seu Status";
  if ((isAdmin || user.isEscalante) && adminTargetRg && adminTargetRg !== user.rg) {
      const u = expedienteUsers.find(x => x.rg === adminTargetRg);
      if (u) {
         activeMilitaryName = formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name);
      } else {
         activeMilitaryName = `RG: ${adminTargetRg}`;
      }
  }

  const currentWeekExpCount = activeRg ? fullWeekDays.filter(d => {
    const dStr = format(d, 'yyyy-MM-dd');
    return getDayStatus(activeRg, dStr).type === 'expediente';
  }).length : 0;

  const subShifts = currentMonthDays.map(d => {
     if (!activeRg) return null;
     const dStr = format(d, 'yyyy-MM-dd');
     const st = getDayStatus(activeRg, dStr);
     if (st.type === 'servico' && st.isPermuta && st.permutaInfo?.role === 'substitute') {
         return {
             date: d,
             otherPartyName: st.permutaInfo.otherPartyName,
             status: st.permutaInfo.status
         }
     }
     return null;
  }).filter(Boolean);

  const pendingUserWeeklyChangesCount = (data.weeklyChangeRequests || []).filter(
    r => r.rg === activeRg && r.status === 'pending'
  ).length;

  if (!canInteract && !isAdmin) return null; // Or show read-only

  return (
    <div id="expediente-scheduler" className="mb-6 sm:mb-12 border-2 border-slate-300 rounded-xl overflow-hidden shadow-sm bg-white">
      {/* Cabeçalho Interativo ou Fixo dependendo do ambiente */}
      {isCollapsible ? (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          className={cn(
            "w-full flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-6 transition-all text-left gap-4 cursor-pointer",
            isExpanded 
              ? "bg-indigo-50/70 border-b-2 border-slate-200 hover:bg-indigo-100/50" 
              : "bg-white hover:bg-slate-50"
          )}
        >
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-lg border-2 transition-colors shadow-xs",
              isExpanded ? "bg-indigo-100 border-indigo-300 text-indigo-700" : "bg-slate-100 border-slate-200 text-slate-600"
            )}>
              <CalendarRange className="w-6 h-6" />
            </div>
            <div className="text-left flex flex-col items-start gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Escala do Expediente</h3>
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
                  ? "Planejamento e Registro de Serviços 24h e Expediente Semanal"
                  : "Painel compacto da escala de expediente • Clique para expandir ou recolher"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center shrink-0">
            <div className="hidden sm:flex flex-col items-end mr-1 text-right">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {isExpanded ? "Escala Aberta" : "Status Resumido"}
              </span>
              <span className="text-xs font-bold text-slate-700">
                {isExpanded ? "Clique para minimizar" : `${userSels.length + subShifts.length} sv. 24h • ${currentWeekExpCount} exp.`}
              </span>
            </div>
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-black text-xs uppercase tracking-wider transition-all",
              isExpanded 
                ? "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200" 
                : "bg-indigo-600 border-indigo-600 text-white shadow-xs hover:bg-indigo-700"
            )}>
              <span>{isExpanded ? "RECOLHER SEÇÃO" : "EXPANDIR SEÇÃO"}</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isExpanded && "rotate-180")} />
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
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Escala do Expediente</h3>
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

      {/* DASHBOARD COMPACTO QUANDO MINIMIZADO (No Módulo de Permutas) */}
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
                      <span className="text-3xl font-black text-indigo-950 leading-none">{userSels.length + subShifts.length}</span>
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
                     <span className="text-xs font-bold text-slate-400 italic py-2">Nenhum serviço 24h agendado.</span>
                  )}
                  {sortedSels.map(s => (
                    <div key={s} className="bg-white border-2 border-indigo-100 shadow-sm px-2.5 py-1.5 rounded-xl flex items-center gap-2 hover:border-indigo-300 transition-colors">
                       <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
                          <span className="text-[10px] font-black text-indigo-600">{format(new Date(`${s}T12:00:00`), 'dd')}</span>
                       </div>
                       <span className="text-[10px] font-black text-indigo-900 uppercase tracking-wider pr-1">{format(new Date(`${s}T12:00:00`), 'MMM', { locale: ptBR })}</span>
                    </div>
                  ))}
                  {subShifts.map((s, i) => (
                    <div key={`sub-${i}`} className="bg-purple-600 border-2 border-purple-700 shadow-md px-2.5 py-1.5 rounded-xl flex flex-col justify-center hover:bg-purple-700 transition-colors" title={`Substituindo ${s.otherPartyName} (${s.status})`}>
                       <div className="flex items-center justify-between gap-3">
                           <div className="flex items-center gap-1.5">
                             <ArrowUpDown className="w-3.5 h-3.5 text-purple-200" />
                             <span className="text-[11px] font-black text-white">{format(s.date, 'dd/MM')}</span>
                           </div>
                           <span className={cn("text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded", s.status === 'pending' ? "bg-amber-400/20 text-amber-200" : "bg-emerald-400/20 text-emerald-200")}>
                              {s.status === 'pending' ? 'Pendente' : 'Deferido'}
                           </span>
                       </div>
                       <span className="text-[8px] font-bold text-purple-200 uppercase tracking-widest mt-1">Subs. {s.otherPartyName?.split(' ')[0] || 'Militar'}</span>
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
                   <span className="text-3xl font-black text-sky-950 leading-none">{currentWeekExpCount}</span>
                   <span className="text-xs font-bold text-slate-500 capitalize leading-none mb-1">Dias</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 border-t border-slate-100 pt-1.5">De Expediente</span>
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
            transition={{ duration: 0.28, ease: "easeInOut" }}
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
                            "px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2", 
                            adminConfigMode ? "bg-indigo-600 text-white" : "bg-white border-2 border-slate-200 text-slate-600 hover:border-indigo-300"
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
                                      "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer",
                                      viewMode === 'calendar' ? "bg-white text-indigo-700 shadow-xs border border-slate-200 dark:border-slate-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/60"
                                  )}
                              >
                                  <CalendarRange className="w-3 h-3" /> <span className="hidden sm:inline">Calendário (S.24h)</span><span className="sm:hidden">Cal. (S.24h)</span>
                              </button>
                              <button
                                  onClick={() => {
                                      setViewMode('semanal');
                                      setWeeklyFilterDays('weekdays');
                                  }}
                                  className={cn(
                                      "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer",
                                      viewMode === 'semanal' ? "bg-white text-indigo-700 shadow-xs border border-slate-200 dark:border-slate-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/60"
                                  )}
                              >
                                  <Calendar className="w-3 h-3" /> <span className="hidden sm:inline">Semanal (S.EXP)</span><span className="sm:hidden">Sem. (S.EXP)</span>
                              </button>
                              {(isAdmin || user.isEscalante) && (
                                  <>
                                      <button
                                          onClick={() => setViewMode('mapeamento')}
                                          className={cn(
                                              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer",
                                              viewMode === 'mapeamento' ? "bg-white text-indigo-700 shadow-xs border border-slate-200 dark:border-slate-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/60"
                                          )}
                                      >
                                          <MapIcon className="w-3 h-3" /> <span className="hidden sm:inline">Mapeamento</span><span className="sm:hidden">Mapear</span>
                                      </button>
                                      <button
                                          onClick={() => setViewMode('relatorios')}
                                          className={cn(
                                              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer",
                                              viewMode === 'relatorios' ? "bg-white text-indigo-700 shadow-xs border border-slate-200 dark:border-slate-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/60"
                                          )}
                                      >
                                          <FileSpreadsheet className="w-3 h-3" /> <span className="hidden sm:inline">Relatórios</span>
                                      </button>
                                      <button
                                          onClick={() => setViewMode('necessidades')}
                                          className={cn(
                                              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer",
                                              viewMode === 'necessidades' ? "bg-white text-indigo-700 shadow-xs border border-slate-200 dark:border-slate-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/60"
                                          )}
                                      >
                                          <AlertCircle className="w-3 h-3" /> <span className="hidden sm:inline">Necessidades</span>
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
                                      {copyStatus ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />} 
                                      <span className="hidden sm:inline">{copyStatus ? 'Copiado' : 'Copiar'}</span>
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
                        {availableObms.map(o => (
                           <option key={o} value={o}>{o}</option>
                        ))}
                     </select>
                 )}

                 {/* Month / Week controls */}
                 {viewMode === 'semanal' ? (
                   <div className="flex bg-white rounded-lg border-2 border-slate-200 p-1 shadow-sm h-[42px] items-center">
                     <button 
                       onClick={() => setSelectedWeekMonday(subWeeks(selectedWeekMonday, 1))} 
                       className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-600 flex items-center justify-center cursor-pointer"
                       title="Semana Anterior"
                     >
                        <ChevronLeft className="w-4 h-4" />
                     </button>
                     <div className="text-center flex flex-col justify-center px-3 min-w-[130px]">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider leading-none">
                           {format(fullWeekDays[0], 'dd/MM')} a {format(fullWeekDays[6], 'dd/MM')}
                        </span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                           Semana • {format(selectedWeekMonday, 'MMM yyyy', { locale: ptBR })}
                        </span>
                     </div>
                     <button 
                       onClick={() => setSelectedWeekMonday(addWeeks(selectedWeekMonday, 1))} 
                       className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-600 flex items-center justify-center cursor-pointer"
                       title="Próxima Semana"
                     >
                        <ChevronRight className="w-4 h-4" />
                     </button>
                   </div>
                 ) : (
                   <div className="flex bg-white rounded-lg border-2 border-slate-200 p-1 shadow-sm h-[42px]">
                     <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-600 flex items-center justify-center">
                        <ChevronLeft className="w-4 h-4" />
                     </button>
                     <div className="text-center flex flex-col justify-center px-4 min-w-[120px]">
                        <span className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">{format(currentMonth, 'MMMM', { locale: ptBR })}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-0.5">{format(currentMonth, 'yyyy')}</span>
                     </div>
                     <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-600 flex items-center justify-center">
                        <ChevronRight className="w-4 h-4" />
                     </button>
                   </div>
                 )}
              </div>
           </div>

           {/* Frase explicativa do ambiente para os militares clientes */}
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
                       Esse ambiente é para escolha dos dias de expedientes de segunda a sexta. <span className="text-slate-500 font-medium">(cabendo excepcionalmente a escolha de dias sábado e domingo.)</span>
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
          await setDoc(monthDocRef, cleanUndefined({ swapRequests: updatedRequests }), { merge: true });
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
            setActionFeedback({ type: 'success', message: `Militar ${name} selecionado para edição!` });
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
