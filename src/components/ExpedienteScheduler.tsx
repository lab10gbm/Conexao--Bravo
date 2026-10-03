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

interface ExpedienteSchedulerProps {
  user: UserProfile;
  obmContext: string;
  forceExpanded?: boolean;
  allowCollapse?: boolean;
  defaultExpanded?: boolean;
}

interface SwapRequest {
  id: string;
  rg: string;
  userName: string;
  fromDay: string;
  toDay: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface WeeklyDayChange {
  dayStr: string;
  dayLabel: string;
  currentStatus: 'expediente' | 'servico' | 'folga';
  proposedStatus: 'expediente' | 'servico' | 'folga';
}

export interface WeeklyChangeRequest {
  id: string;
  rg: string;
  userName: string;
  weekKey: string;
  weekLabel: string;
  changes: WeeklyDayChange[];
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

interface Afastamento {
  id: string;
  rg: string;
  inicio: string;
  retorno: string;
  situacao: string;
}

export interface PermutaDayDetails {
  hasPermuta: boolean;
  role: 'substitute' | 'requester';
  status: string;
  otherPartyName?: string;
  otherPartyRg?: string;
  source: 'general' | 'internal';
  permutaDocId?: string;
}

export interface DayStatusResult {
  text: string;
  type: 'expediente' | 'servico' | 'folga' | 'afastamento';
  label: string;
  isPermuta?: boolean;
  permutaInfo?: PermutaDayDetails | null;
}

interface ExpedienteData {
  requirements: Record<string, number>;
  selections: Record<string, string[]>;
  userNames: Record<string, string>;
  sectors?: Record<string, string>;
  regimes?: Record<string, string>;
  locked?: Record<string, boolean>;
  lockedOrdinario?: Record<string, boolean>;
  lockedWeekly?: Record<string, Record<string, boolean>>;
  swapRequests?: SwapRequest[];
  weeklyChangeRequests?: WeeklyChangeRequest[];
  preferencesDetails?: Record<string, Record<string, number>>;
  expedienteDays?: Record<string, string[]>;
  expQuotas?: Record<string, number>;
  grdData?: Record<string, string[]>;
}

export const FUNCOES_ESCALA = [
  "Condutor de ABT",
  "Condutor de ABSL",
  "Condutor de ASE",
  "Condutor de AR",
  "Condutor de ARC",
  "Chefe de Guarnição ABT",
  "Chefe de Guarnição ABSL",
  "Auxiliar de ABT",
  "Auxiliar de ABSL",
  "Auxiliar de ARC",
  "Auxiliar de ASE",
  "Mestre AL",
  "Mestre BIA",
  "Operador AMA",
  "Guarda-Vidas AMA",
  "Marinheiro",
  "Enfermeiro",
  "Comunicante",
  "Adjunto",
  "Sargento de Dia",
  "Cmt da Guarda",
  "Cabo da Guarda",
  "Cabo de Dia",
  "Sentinela",
  "Faxina",
  "Armeque",
  "Toque de Fogo",
  "Auxiliar de Rancho"
];

const WORK_REGIMES = [
  "3 Exped. e 2 serv. 24h",
  "4 Exped. e 1 serv. 24h",
  "4 Expedientes (Militar Readaptado)",
  "2 e 1/2 Expedientes (Militar com Redução de Carga Horária)",
  "1 Exped. e 3 Serv. 24h (Militar com Redução de Carga Horária)"
];

function parseRankAndNameFromString(raw: string): { rank: string; name: string } {
  if (!raw) return { rank: '', name: 'MILITAR' };
  const clean = raw.trim().toUpperCase();

  const rankPatterns: [RegExp, string][] = [
    [/^(CORONEL|CEL\.?)\s+/i, 'CORONEL'],
    [/^(TENENTE\s+CORONEL|TEN\.?\s*CEL\.?|TC)\s+/i, 'TEN CEL'],
    [/^(MAJOR|MAJ\.?)\s+/i, 'MAJOR'],
    [/^(CAPITÃO|CAPITAO|CAP\.?)\s+/i, 'CAPITÃO'],
    [/^(1[º°]?\s*TENENTE|1[º°]?\s*TEN\.?)\s+/i, '1º TENENTE'],
    [/^(2[º°]?\s*TENENTE|2[º°]?\s*TEN\.?)\s+/i, '2º TENENTE'],
    [/^(ASPIRANTE|ASP\.?\s*OF\.?|ASP\.?)\s+/i, 'ASPIRANTE'],
    [/^(SUBTENENTE|SUBTEN\.?|SUB\s*TEN\.?|ST)\s+/i, 'SUBTENENTE'],
    [/^(1[º°]?\s*SARGENTO|1[º°]?\s*SGT\.?)\s+/i, '1º SARGENTO'],
    [/^(2[º°]?\s*SARGENTO|2[º°]?\s*SGT\.?)\s+/i, '2º SARGENTO'],
    [/^(3[º°]?\s*SARGENTO|3[º°]?\s*SGT\.?)\s+/i, '3º SARGENTO'],
    [/^(CABO|CB\.?)\s+/i, 'CABO'],
    [/^(SOLDADO|SD\.?)\s+/i, 'SOLDADO'],
  ];

  for (const [regex, rankLabel] of rankPatterns) {
    if (regex.test(clean)) {
      const remaining = clean.replace(regex, '').trim();
      return {
        rank: rankLabel,
        name: remaining || rankLabel
      };
    }
  }

  const parts = clean.split(/\s+/);
  if (parts.length > 1) {
    return {
      rank: parts[0],
      name: parts.slice(1).join(' ')
    };
  }

  return {
    rank: '',
    name: clean
  };
}

function splitMilitaryRankAndWarName(found?: UserProfile | null, rawFallbackName?: string): { rank: string; name: string } {
  if (found) {
    const rawRank = found.rank ? parseRank(found.rank).toUpperCase() : '';
    const warName = (found.warName && found.warName.trim())
      ? found.warName.trim().toUpperCase()
      : (found.name && found.name.trim())
        ? found.name.trim().split(/\s+/)[0].toUpperCase()
        : '';

    if (rawRank) {
      return {
        rank: rawRank,
        name: warName || rawRank
      };
    }

    if (found.name && found.name.trim()) {
      return parseRankAndNameFromString(found.name);
    }
  }

  if (rawFallbackName && rawFallbackName.trim()) {
    return parseRankAndNameFromString(rawFallbackName);
  }

  return { rank: '', name: 'MILITAR' };
}

function formatPreferenceFunction(func: string, qt: number): { line1: string; line2: string } {
  if (!func) return { line1: `★ ${qt}x`, line2: 'VAGA' };
  const trimmed = func.trim();
  const qtLabel = `★ ${qt}x`;

  // 1. Chefe de Guarnição ABT / ABSL / etc.
  const mChefe = trimmed.match(/^Chefe\s+de\s+Guarni[çc][ãa]o\s+(.+)$/i);
  if (mChefe) {
    return {
      line1: `${qtLabel} CHEFE GUARN.`,
      line2: mChefe[1].toUpperCase()
    };
  }

  // 2. Condutor de ABT / ABSL / ASE / AR / ARC / etc.
  const mCond = trimmed.match(/^Condutor\s+de\s+(.+)$/i);
  if (mCond) {
    return {
      line1: `${qtLabel} CONDUTOR`,
      line2: mCond[1].toUpperCase()
    };
  }

  // 3. Auxiliar de ABT / ABSL / ARC / ASE / Rancho / etc.
  const mAux = trimmed.match(/^Auxiliar\s+de\s+(.+)$/i);
  if (mAux) {
    return {
      line1: `${qtLabel} AUXILIAR`,
      line2: mAux[1].toUpperCase()
    };
  }

  // 4. Guarda-Vidas AMA
  const mGv = trimmed.match(/^Guarda-?Vidas\s+(.+)$/i);
  if (mGv) {
    return {
      line1: `${qtLabel} G-VIDAS`,
      line2: mGv[1].toUpperCase()
    };
  }

  // 5. Operador AMA / Mestre AL / Mestre BIA
  const mOp = trimmed.match(/^(Operador|Mestre)\s+(.+)$/i);
  if (mOp) {
    return {
      line1: `${qtLabel} ${mOp[1].toUpperCase()}`,
      line2: mOp[2].toUpperCase()
    };
  }

  // 6. Sargento de Dia / Cabo de Dia
  const mDia = trimmed.match(/^(Sargento|Cabo)\s+de\s+Dia$/i);
  if (mDia) {
    return {
      line1: `${qtLabel} ${mDia[1].toUpperCase()}`,
      line2: 'DE DIA'
    };
  }

  // 7. Cmt da Guarda / Cabo da Guarda
  const mGuarda = trimmed.match(/^(Cmt|Cabo)\s+da\s+Guarda$/i);
  if (mGuarda) {
    return {
      line1: `${qtLabel} ${mGuarda[1].toUpperCase()}`,
      line2: 'DA GUARDA'
    };
  }

  // 8. Toque de Fogo
  if (/^Toque\s+de\s+Fogo$/i.test(trimmed)) {
    return {
      line1: `${qtLabel} TOQUE`,
      line2: 'DE FOGO'
    };
  }

  // 9. Generic multi-word (2 words or more)
  const words = trimmed.split(/\s+/);
  if (words.length >= 2) {
    const lastWord = words[words.length - 1].toUpperCase();
    const prefix = words.slice(0, words.length - 1).join(' ').toUpperCase();
    return {
      line1: `${qtLabel} ${prefix}`,
      line2: lastWord
    };
  }

  // 10. Single word: e.g. Sentinela, Comunicante, Adjunto, Marinheiro, Enfermeiro, Faxina, Armeque
  return {
    line1: `${qtLabel} ${Number(qt) > 1 ? 'VAGAS' : 'VAGA'}`,
    line2: trimmed.toUpperCase()
  };
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
  const [data, setData] = useState<ExpedienteData>({ requirements: {}, selections: {}, userNames: {}, sectors: {} });
  const [loading, setLoading] = useState(true);
  const [expedienteUsers, setExpedienteUsers] = useState<UserProfile[]>([]);
  const [afastamentos, setAfastamentos] = useState<Afastamento[]>([]);
  
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

  useEffect(() => {
    if (!obmContext) return;
    const q = query(collection(db, 'afastamentos_alas'), where('obm', '==', normalizeObm(obmContext)));
    const unsub = onSnapshot(q, (snap) => {
      const data: Afastamento[] = [];
      snap.forEach(doc => {
         data.push({ id: doc.id, ...doc.data() } as Afastamento);
      });
      setAfastamentos(data);
    }, (err) => {
      console.error("Error fetching afastamentos:", err);
    });
    return () => unsub();
  }, [obmContext]);

  const [generalPermutas, setGeneralPermutas] = useState<PermutaRequest[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'permutas'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PermutaRequest));
      setGeneralPermutas(list);
    }, (err) => {
      console.error("Error fetching permutas in ExpedienteScheduler:", err);
    });
    return () => unsub();
  }, []);

  const normalizedObm = selectedObm.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const monthKey = format(currentMonth, 'yyyy-MM');
  const monthDocRef = doc(db, `expediente_${normalizedObm}`, monthKey);
  const globalDocRef = doc(db, 'config', `expediente_global_${normalizedObm}`);

  useEffect(() => {
    setLoading(true);
    let monthData: any = { selections: {}, expedienteDays: {} };
    let globalData: any = { requirements: {}, userNames: {}, sectors: {}, expQuotas: {} };
    let grdData: any = {};

    const mergeData = () => {
      setData({
        requirements: globalData.requirements || {},
        selections: monthData.selections || {},
        locked: monthData.locked || {},
        lockedOrdinario: monthData.lockedOrdinario || monthData.locked || {},
        lockedWeekly: monthData.lockedWeekly || {},
        swapRequests: monthData.swapRequests || [],
        weeklyChangeRequests: monthData.weeklyChangeRequests || [],
        preferencesDetails: monthData.preferencesDetails || {},
        expedienteDays: monthData.expedienteDays || {},
        expQuotas: globalData.expQuotas || {},
        userNames: globalData.userNames || {},
        sectors: globalData.sectors || {},
        regimes: globalData.regimes || {},
        grdData: grdData || {}
      });
      setLoading(false);
    };

    const unsubMonth = onSnapshot(monthDocRef, (docSnap) => {
      if (docSnap.exists()) {
         monthData = docSnap.data();
      } else {
         monthData = { selections: {}, locked: {}, swapRequests: [], weeklyChangeRequests: [] };
      }
      mergeData();
    });

    const unsubGlobal = onSnapshot(globalDocRef, (docSnap) => {
      if (docSnap.exists()) {
         globalData = docSnap.data();
      } else {
         globalData = { requirements: {}, userNames: {}, sectors: {} };
      }
      mergeData();
    });

    const obmGrdId = selectedObm.replace(/\//g, '_').replace(/\s/g, '_');
    const grdDocId = `${obmGrdId}_${monthKey}`;
    const unsubGrd = onSnapshot(doc(db, 'grd_configs', grdDocId), (docSnap) => {
        if (docSnap.exists()) {
            grdData = docSnap.data().days || {};
        } else {
            grdData = {};
        }
        mergeData();
    });

    return () => { unsubMonth(); unsubGlobal(); unsubGrd(); };
  }, [monthKey, selectedObm]);

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
      const val = data.requirements?.[rg];
      return (typeof val === 'number' && !isNaN(val)) ? val : 0;
  };
  const getRegime = (rg: string) => {
      const val = data.regimes?.[rg];
  return typeof val === 'string' ? val : '';
  };
  const safeArr = (val: any) => Array.isArray(val) ? val : [];

  const getPermutaForDay = (rg: string, dayStr: string, dataSource?: any): PermutaDayDetails | null => {
    if (!rg || !dayStr) return null;
    const targetCleanRg = String(rg || '').replace(/\D/g, '').trim();
    if (!targetCleanRg) return null;

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
          if (/3\s*Exped.*2\s*serv/i.test(raw)) return "03 Expedientes e 02 serviços";
          if (/4\s*Exped.*1\s*serv/i.test(raw)) return "04 Expedientes e 01 serviço";
          if (/4\s*Expedientes/i.test(raw)) return "04 Expedientes";
          if (/1\s*Exped.*3\s*serv/i.test(raw)) return "01 Expediente e 03 serviços";
          if (/2\s*(?:e\s*)?1\/2\s*Exped/i.test(raw)) return "02 e 1/2 Expedientes";
          return raw;
      }
      const req = getReqAmount(rg);
      if (req === 2) return "03 Expedientes e 02 serviços";
      if (req === 1) return "04 Expedientes e 01 serviço";
      if (req === 0) return "04 Expedientes";
      if (req === 3) return "01 Expediente e 03 serviços";
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
      if (data.expQuotas && data.expQuotas[rg] !== undefined) {
          return data.expQuotas[rg];
      }
      const regime = getRegime(rg);
      const match = regime.match(/(\d+)\s*Exped/i);
      return match ? parseInt(match[1], 10) : 0;
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
          return {
              text: 'SERVIÇO (PERMUTA)',
              type: 'servico' as const,
              label: 'SERVIÇO (PERMUTA)',
              isPermuta: true,
              permutaInfo
          };
      }

      // 2. Militar passou o serviço para outro via permuta aceita/homologada (solicitante)
      if (permutaInfo && permutaInfo.role === 'requester' && (permutaInfo.status === 'accepted' || permutaInfo.status === 'scheduled' || permutaInfo.status === 'approved')) {
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
      return !!(source.lockedOrdinario?.[rg] ?? source.locked?.[rg]);
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

      if (mode === 'cycle') {
          if (!isSel && !isExp) {
              // FOLGA -> EXPEDIENTE
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
              newSels.push(dayStr);
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
    const isLocked = isOrdinarioLockedForUser(rgSelection, monthKey);
    if (isLocked && rgSelection !== 'ESCALANTE_PREF' && !isAdmin && !user.isEscalante) {
      alert("Sua escala ordinária (24h) deste mês já foi confirmada e está bloqueada. Use a opção 'Solicitar Troca' se precisar permutar.");
      return;
    }

    const dayStr = format(day, 'yyyy-MM-dd');
    const permuta = getPermutaForDay(rgSelection, dayStr);
    if (permuta && permuta.role === 'substitute' && !isAdmin && !user.isEscalante) {
      alert("Você está escalado neste dia através de Permuta Homologada. Este serviço não pode ser alterado diretamente pelo calendário.");
      return;
    }

    let userSelections = safeArr(data.selections[rgSelection]);
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
        const req = getReqAmount(rgSelection);
        if (req === 0) {
           alert("Este militar não possui serviços definidos para este mês. Configure-os na aba de Configurar Membros.");
           return;
        }
        
        if (userSelections.includes(dayStr)) {
           userSelections = userSelections.filter(d => d !== dayStr);
        } else {
           if (userSelections.length >= req) {
              alert(`Você já selecionou todos os ${req} serviços permitidos.`);
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

  const start = startOfWeek(currentMonth, { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });
  const currentMonthDays = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

  const userReq = activeRg ? getReqAmount(activeRg) : 0;
  const userSels = activeRg ? safeArr(data.selections[activeRg]) : [];
  const progress = userReq > 0 ? Math.round((userSels.length / userReq) * 100) : 0;

  let activeMilitaryName = "Seu Status";
  if (isAdmin && adminTargetRg && adminTargetRg !== user.rg) {
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
                {isExpanded ? "Clique para minimizar" : `${userSels.length} sv. 24h • ${currentWeekExpCount} exp.`}
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
      {!isExpanded && isCollapsible && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 flex-1">
            <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" /> Mês Referência
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-800 capitalize mt-0.5">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </span>
            </div>

            <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs flex flex-col">
              <span className="text-[9px] font-black uppercase text-indigo-500 tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-500" /> Serviços 24h
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xs sm:text-sm font-black text-indigo-900">{userSels.length}</span>
                <span className="text-[10px] font-bold text-slate-500">
                  {userReq > 0 ? `de ${userReq} previstos` : 'marcado(s)'}
                </span>
              </div>
            </div>

            <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-sky-100 shadow-2xs flex flex-col col-span-2 sm:col-span-1">
              <span className="text-[9px] font-black uppercase text-sky-600 tracking-wider flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-sky-600" /> Semana Atual
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xs sm:text-sm font-black text-sky-950">{currentWeekExpCount}</span>
                <span className="text-[10px] font-bold text-slate-500">dias de expediente</span>
              </div>
            </div>
          </div>

          {pendingUserWeeklyChangesCount > 0 && (
            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
              <span className="text-[10px] font-black text-amber-800 bg-amber-100/90 border border-amber-300 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                {pendingUserWeeklyChangesCount} alteração pendente
              </span>
            </div>
          )}
        </div>
      )}

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
                          <div className="flex bg-slate-100 p-1 rounded-lg">
                              <button
                                  onClick={() => setViewMode('calendar')}
                                  className={cn(
                                      "px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1",
                                      viewMode === 'calendar' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
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
                                      "px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1",
                                      viewMode === 'semanal' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                  )}
                              >
                                  <Calendar className="w-3 h-3" /> <span className="hidden sm:inline">Semanal (S.EXP)</span><span className="sm:hidden">Sem. (S.EXP)</span>
                              </button>
                              {(isAdmin || user.isEscalante) && (
                                  <>
                                      <button
                                          onClick={() => setViewMode('mapeamento')}
                                          className={cn(
                                              "px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1",
                                              viewMode === 'mapeamento' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                          )}
                                      >
                                          <MapIcon className="w-3 h-3" /> <span className="hidden sm:inline">Mapeamento</span><span className="sm:hidden">Mapear</span>
                                      </button>
                                      <button
                                          onClick={() => setViewMode('relatorios')}
                                          className={cn(
                                              "px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1",
                                              viewMode === 'relatorios' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                          )}
                                      >
                                          <FileSpreadsheet className="w-3 h-3" /> <span className="hidden sm:inline">Relatórios</span>
                                      </button>
                                      <button
                                          onClick={() => setViewMode('necessidades')}
                                          className={cn(
                                              "px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1",
                                              viewMode === 'necessidades' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
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
               <div className="bg-white border-2 border-slate-200 rounded-xl shadow-sm overflow-x-auto no-scrollbar relative flex flex-col">
                     <div className="p-4 border-b-2 border-slate-200 bg-slate-50 flex items-center justify-between gap-4 flex-wrap sticky left-0 w-full min-w-max">
                         <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full max-w-[800px]">
                             <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none whitespace-nowrap">Novo Membro:</span>
                             <div className="relative flex-1 w-full">
                                <input
                                     type="text"
                                     value={memberSearchTerm}
                                     onChange={(e) => {
                                         setMemberSearchTerm(e.target.value);
                                         setAddMemberRg('');
                                         setShowMemberDropdown(true);
                                     }}
                                     onFocus={() => setShowMemberDropdown(true)}
                                     onBlur={() => setTimeout(() => setShowMemberDropdown(false), 200)}
                                     placeholder="Digite NOME ou RG para buscar..."
                                     className="w-full text-[10px] font-bold p-2 px-3 border-2 border-slate-200 rounded-lg bg-white text-slate-700 hover:border-indigo-300 focus:border-indigo-500 outline-none transition-colors"
                                />
                                {showMemberDropdown && (
                                   <div className="absolute z-[100] w-full mt-1 bg-white border-2 border-slate-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                                      {militars
                                        .filter(m => !expedienteUsers.find(eu => (eu.rg || eu.uid) === (m.uid||m.rg)))
                                        .filter(m => 
                                           memberSearchTerm.length === 0 || 
                                           m.name?.toLowerCase().includes(memberSearchTerm.toLowerCase()) || 
                                           m.warName?.toLowerCase().includes(memberSearchTerm.toLowerCase()) || 
                                           m.rg?.includes(memberSearchTerm)
                                        )
                                        .sort(sortAllBySeniority)
                                        .map((m, i) => (
                                          <button
                                              key={(m.uid||m.rg||`m-${i}`)}
                                              onClick={() => {
                                                  setAddMemberRg(m.uid||m.rg);
                                                  setMemberSearchTerm(`${parseRank(m.rank)} ${formatMilitaryName(m.warName || m.name?.split(' ')[0] || '')} - ${m.rg}`);
                                                  setShowMemberDropdown(false);
                                              }}
                                              className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-xs text-slate-700"
                                          >
                                              <div className="font-bold">{parseRank(m.rank)} {formatMilitaryName(m.warName || m.name?.split(' ')[0] || '')} {m.obm ? `- ${m.obm}` : ''}</div>
                                              <div className="text-[10px] text-slate-400 mt-0.5">RG: {m.rg}</div>
                                          </button>
                                      ))}
                                      {militars
                                        .filter(m => !expedienteUsers.find(eu => (eu.rg || eu.uid) === (m.uid||m.rg)))
                                        .filter(m => 
                                           memberSearchTerm.length > 0 && (
                                              m.name?.toLowerCase().includes(memberSearchTerm.toLowerCase()) || 
                                              m.warName?.toLowerCase().includes(memberSearchTerm.toLowerCase()) || 
                                              m.rg?.includes(memberSearchTerm)
                                           )
                                        ).length === 0 && memberSearchTerm.length > 0 && (
                                          <div className="p-3 text-xs text-slate-500 text-center italic">Nenhum militar encontrado</div>
                                      )}
                                   </div>
                                )}
                             </div>
                             <button
                                  onClick={handleAddToExpediente}
                                  disabled={!addMemberRg}
                                  className="w-full sm:w-auto bg-indigo-600 text-white p-2 px-4 rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                             >
                                  <UserPlus className="w-3.5 h-3.5" /> Adicionar
                             </button>
                         </div>
                     </div>
                     <div className="sm:hidden mb-1 flex items-center gap-1.5 px-3 py-1 bg-slate-50 border-b border-slate-100 sticky left-0">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Deslize para configurar →</span>
                    </div>
                    <table className="w-full text-left border-collapse min-w-[700px] sm:min-w-[800px]">
                       <thead>
                          <tr className="border-b-2 border-slate-200 bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                             <th className="py-3 px-4">Militar</th>
                             <th className="py-3 px-4 w-64 border-l-2 border-slate-200">Regime de Trabalho</th>
                             <th className="py-3 px-4 w-24 border-l-2 border-slate-200 text-center">Dias/Mês</th>
                             <th className="py-3 px-4 w-48 border-l-2 border-slate-200">Setor / Seção</th>
                             <th className="py-3 px-4 w-12 border-l-2 border-slate-200 text-center">Ações</th>
                          </tr>
                       </thead>
                       <tbody>
                          {expedienteUsers.length === 0 && (
                              <tr>
                                  <td colSpan={4} className="py-8 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                                      Nenhum militar do expediente encontrado.
                                  </td>
                              </tr>
                          )}
                          {expedienteUsers.filter(u => u.rg !== 'ESCALANTE_PREF').map((u) => {
                             const rg = u.rg || u.uid;
                             const reqAmount = getReqAmount(rg);
                             const sector = getSector(rg);
                             const currentRegime = getRegime(rg);
                             
                             return (
                                 <tr key={rg} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                     <td className="py-3 px-4">
                                         <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-800">{formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name)}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">RG: {rg}</span>
                                         </div>
                                     </td>
                                     <td className="py-3 px-4 border-l-2 border-slate-50">
                                         <div className="flex flex-col gap-2">
                                             <select 
                                               value={WORK_REGIMES.includes(currentRegime) ? currentRegime : (currentRegime ? "Outro" : "")}
                                               onChange={async (e) => {
                                                  const val = e.target.value;
                                                  let r = val;
                                                  if (val === "Outro") r = "";
                                                  
                                                  const newGlobal: any = {};
                                                  
                                                  // Auto-calculate required days based on selected regime
                                                  let autoReq = (typeof data.requirements?.[rg] === 'number' && !isNaN(data.requirements[rg])) ? data.requirements[rg] : undefined;
                                                  if (val === "3 Exped. e 2 serv. 24h") autoReq = 2;
                                                  else if (val === "4 Exped. e 1 serv. 24h") autoReq = 1;
                                                  else if (val === "1 Exped. e 3 Serv. 24h (Militar com Redução de Carga Horária)") autoReq = 3;
                                                  else if (val === "4 Expedientes (Militar Readaptado)") autoReq = 0;
                                                  else if (val === "2 e 1/2 Expedientes (Militar com Redução de Carga Horária)") autoReq = 0;

                                                  if (r === "") {
                                                      updateDoc(globalDocRef, { [`regimes.${rg}`]: deleteField() }).catch(console.error);
                                                  } else {
                                                      newGlobal.regimes = { [rg]: r };
                                                  }
                                                  
                                                  newGlobal.userNames = { [rg]: formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name) };
                                                  
                                                  if (autoReq !== undefined && autoReq !== data.requirements?.[rg]) {
                                                      if (autoReq === 0) {
                                                          updateDoc(globalDocRef, { [`requirements.${rg}`]: deleteField() }).catch(console.error);
                                                      } else {
                                                          newGlobal.requirements = { [rg]: autoReq };
                                                      }
                                                  }
                                                  
                                                  await setDoc(globalDocRef, cleanUndefined(newGlobal), { merge: true });
                                               }}
                                               className="w-full text-[10px] font-bold p-1.5 border-2 border-slate-200 rounded-md bg-white text-slate-700 hover:border-indigo-300 focus:border-indigo-500 outline-none transition-colors"
                                             >
                                               <option value="">Selecione o Regime...</option>
                                               {WORK_REGIMES.map(r => <option key={r} value={r}>{r}</option>)}
                                               <option value="Outro">Personalizado / Outro</option>
                                             </select>
                                             
                                             {(!WORK_REGIMES.includes(currentRegime) && currentRegime !== "") || (currentRegime === "" && !WORK_REGIMES.includes("")) ? (
                                                  <input 
                                                    type="text"
                                                    placeholder="Digite o regime personalizado..."
                                                    defaultValue={currentRegime}
                                                    key={`regime-${currentRegime}`}
                                                    onBlur={async (e) => {
                                                        const r = e.target.value;
                                                        if (r === currentRegime) return;
                                                        const newGlobal: any = {
                                                            regimes: { [rg]: r },
                                                            userNames: { [rg]: formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name) }
                                                        };
                                                        await setDoc(globalDocRef, cleanUndefined(newGlobal), { merge: true });
                                                    }}
                                                    className="w-full text-[9px] font-bold p-1 px-2 border border-indigo-100 rounded bg-indigo-50/30 text-indigo-900 focus:border-indigo-300 outline-none"
                                                  />
                                             ) : null}
                                         </div>
                                     </td>
                                     <td className="py-3 px-4 border-l-2 border-slate-50 text-center">
                                         <input 
                                             type="number"
                                             min="0"
                                             defaultValue={reqAmount}
                                             key={`req-${reqAmount}`}
                                             onBlur={async (e) => {
                                                const req = parseInt(e.target.value) || 0;
                                                if (req === reqAmount) return;
                                                const newGlobal: any = {
                                                    userNames: { [rg]: formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name) }
                                                };
                                                if (req <= 0) {
                                                    updateDoc(globalDocRef, { [`requirements.${rg}`]: deleteField() }).catch(console.error);
                                                } else {
                                                    newGlobal.requirements = { [rg]: req };
                                                }
                                                await setDoc(globalDocRef, cleanUndefined(newGlobal), { merge: true });
                                             }}
                                             className="w-16 p-2 text-center text-sm border-2 border-indigo-200 rounded-md bg-white font-black text-indigo-900 hover:border-indigo-400 focus:border-indigo-500 outline-none transition-colors mx-auto block"
                                         />
                                     </td>
                                     <td className="py-3 px-4 border-l-2 border-slate-50">
                                         <input 
                                             type="text"
                                             placeholder="Ex: SOp, SAd, DGP..."
                                             defaultValue={sector}
                                             key={`sec-${sector}`}
                                             onBlur={async (e) => {
                                                const s = e.target.value;
                                                if (s === sector) return;
                                                const newGlobal: any = {
                                                    userNames: { [rg]: formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name) }
                                                };
                                                if (!s) {
                                                    updateDoc(globalDocRef, { [`sectors.${rg}`]: deleteField() }).catch(console.error);
                                                } else {
                                                    newGlobal.sectors = { [rg]: s };
                                                }
                                                await setDoc(globalDocRef, cleanUndefined(newGlobal), { merge: true });
                                             }}
                                             className="w-full text-sm p-2 border-2 border-slate-200 rounded-md bg-white font-bold text-slate-700 hover:border-slate-300 focus:border-slate-500 outline-none transition-colors"
                                         />
                                     </td>
                                     <td className="py-3 px-4 border-l-2 border-slate-50 text-center">
                                         <button 
                                             onClick={() => handleRemoveFromExpediente(u.uid || rg)}
                                             className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors mx-auto block"
                                             title="Remover do Expediente"
                                         >
                                             <Trash2 className="w-4 h-4" />
                                         </button>
                                     </td>
                                 </tr>
                             );
                          })}
                       </tbody>
                    </table>
               </div>
           ) : viewMode === 'mapeamento' && (isAdmin || user.isEscalante) ? (
               <div className="flex flex-col gap-4 w-full">
                   {/* Sub-navegação interna de Mapeamento */}
                   <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border-2 border-slate-200 shadow-sm">
                       <div className="flex flex-wrap items-center gap-2">
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-1 flex items-center gap-1.5">
                               <MapIcon className="w-3.5 h-3.5 text-indigo-600" /> Modo:
                           </span>
                           <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                               <button
                                   onClick={() => setMapeamentoSubView('table')}
                                   className={cn(
                                       "px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer",
                                       mapeamentoSubView === 'table' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                                   )}
                               >
                                   <Table className="w-3.5 h-3.5" /> <span>Tabela</span>
                               </button>
                               <button
                                   onClick={() => setMapeamentoSubView('lista')}
                                   className={cn(
                                       "px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer",
                                       mapeamentoSubView === 'lista' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                                   )}
                               >
                                   <List className="w-3.5 h-3.5" /> <span>Lista</span>
                               </button>
                               <button
                                   onClick={() => setMapeamentoSubView('escala_sv')}
                                   className={cn(
                                       "px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer",
                                       mapeamentoSubView === 'escala_sv' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                                   )}
                               >
                                   <Columns className="w-3.5 h-3.5" /> <span>Escala SV</span>
                               </button>
                           </div>
                       </div>

                       {/* Ações contextuais de acordo com o sub-modo ativo */}
                       <div className="flex flex-wrap items-center gap-2">
                           {mapeamentoSubView === 'table' && (
                               <button
                                   onClick={() => setTransposeTable(!transposeTable)}
                                   className={cn(
                                       "px-3 py-1.5 rounded-lg border-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 cursor-pointer",
                                       transposeTable ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                                   )}
                                   title="Inverter Linhas e Colunas da Tabela"
                               >
                                   <ArrowUpDown className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Inverter Tabela</span><span className="sm:hidden">Inverter</span>
                               </button>
                           )}

                           {(mapeamentoSubView === 'escala_sv' || mapeamentoSubView === 'table') && (
                               <button
                                   onClick={handleCopyTables}
                                   className="px-3 py-1.5 rounded-lg border-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 shrink-0 cursor-pointer"
                                   title={mapeamentoSubView === 'escala_sv' ? "Copiar Escala SV formatada" : "Copiar Tabela formatada"}
                               >
                                   {copyStatus ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />} 
                                   <span>{copyStatus ? 'Copiado!' : mapeamentoSubView === 'escala_sv' ? 'Copiar Escala' : 'Copiar Tabela'}</span>
                               </button>
                           )}

                           {(mapeamentoSubView === 'escala_sv' || mapeamentoSubView === 'table') && (isAdmin || user.isEscalante) && (
                               <button
                                   onClick={handleAutoFillExp}
                                   className={cn(
                                       "px-3 py-1.5 rounded-lg border-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer",
                                       autoExpStatus ? "bg-green-50 border-green-200 text-green-700" : "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                                   )}
                                   title="Preencher Dias de Expediente Automaticamente"
                               >
                                   {autoExpStatus ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <CalendarRange className="w-3.5 h-3.5" />}
                                   <span>{autoExpStatus ? 'Preenchido' : 'Auto EXP'}</span>
                               </button>
                           )}
                       </div>
                   </div>

                   {/* Renderização do sub-modo ativo */}
                   {mapeamentoSubView === 'table' ? (
                 <div id="table-view-container" className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-x-auto custom-scrollbar">
                     {transposeTable ? (
                         <table className="w-full text-left border-collapse min-w-[max-content]">
                             <thead>
                                 <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-500">
                                     <th className="py-2 px-4 sticky left-0 z-30 bg-slate-100 border-r-2 border-slate-200 text-[10px] font-black uppercase tracking-widest min-w-[70px] shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)]">
                                         Dia
                                     </th>
                                     {expedienteUsers.map(u => {
                                         const rg = u.rg || u.uid;
                                         const isEscalantePref = rg === 'ESCALANTE_PREF';
                                         
                                         return (
                                             <th key={rg} className={cn(
                                                 "py-2 px-3 border-r-2 border-slate-200 text-[10px] font-black uppercase text-center min-w-[90px] xl:min-w-[120px]",
                                                 isEscalantePref ? "bg-red-50 text-red-700" : ""
                                             )}>
                                                 {isEscalantePref ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span>PREF.</span>
                                                        <span className="text-red-600 font-bold text-[9px] normal-case bg-red-100 px-1.5 py-0.5 rounded">{(safeArr(data.selections[rg]).length)} dias</span>
                                                    </div>
                                                 ) : (
                                                     <div className="flex flex-col items-center gap-1">
                                                         <span className="truncate max-w-[120px]">{formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name)}</span>
                                                         <span className={cn("text-[9px] normal-case px-1.5 py-0.5 rounded font-bold", (safeArr(data.selections[rg]).length) >= getReqAmount(rg) && getReqAmount(rg) > 0 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                                                             {(safeArr(data.selections[rg]).length)} / {typeof data.requirements[rg] === 'number' && !isNaN(data.requirements[rg]) ? data.requirements[rg] : '?'}
                                                         </span>
                                                     </div>
                                                 )}
                                             </th>
                                         );
                                     })}
                                 </tr>
                             </thead>
                             <tbody>
                                 {currentMonthDays.map((day, i) => {
                                     const dayStr = format(day, 'yyyy-MM-dd');
                                     const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                     const isPreferredDate = safeArr(data.selections['ESCALANTE_PREF']).includes(dayStr);
                                     const isEven = i % 2 === 0;

                                     return (
                                         <tr key={dayStr} className={cn(
                                             "border-b border-slate-100 transition-colors hover:bg-slate-200/50",
                                             isWeekend ? "bg-orange-50/80 hover:bg-orange-100/80" : "",
                                             isPreferredDate ? "bg-red-50/50 hover:bg-red-100/50" : ""
                                         )}>
                                             <td className={cn(
                                                 "py-2 px-3 sticky left-0 z-20 border-r-2 border-slate-200 text-[11px] sm:text-[12px] font-black shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)]",
                                                 isWeekend ? "bg-orange-100 text-orange-950 border-r-orange-300" :
                                                 isPreferredDate ? "bg-red-100 text-red-900 border-r-red-300" :
                                                 isEven ? "bg-slate-100 text-slate-800" : "bg-white text-slate-800"
                                             )}>
                                                 <div className="flex items-center justify-between">
                                                     <div className="flex flex-col">
                                                         <span className={cn(
                                                             "text-[9px] font-black uppercase leading-none mb-0.5",
                                                             isPreferredDate ? "text-red-500" :
                                                             isWeekend ? "text-orange-800" : "text-slate-400"
                                                         )}>{format(day, 'eee', { locale: ptBR }).slice(0, 3)}</span>
                                                         <span className={cn(
                                                             isPreferredDate ? "text-red-700" :
                                                             isWeekend ? "text-orange-950 font-black" : ""
                                                         )}>{format(day, 'd')}</span>
                                                     </div>
                                                     {isPreferredDate && <span className="text-red-500 text-[14px]">★</span>}
                                                 </div>
                                             </td>
                                             
                                             {expedienteUsers.map(u => {
                                                 const rg = u.rg || u.uid;
                                                 const isEscalantePref = rg === 'ESCALANTE_PREF';
                                                 const userSels = safeArr(data.selections[rg]);
                                                 const isSelected = userSels.includes(dayStr);
                                                 const isExp = safeArr(data.expedienteDays?.[rg]).includes(dayStr);
                                                 const isGrd = !isEscalantePref && data.grdData?.[dayStr]?.includes(rg);
                                                 const isTargetUser = activeRg === rg;
                                                 const canEdit = isAdmin || isTargetUser || (isEscalantePref && (isAdmin || user.isEscalante));
                                                 
                                                 const isSwapDay = !isEscalantePref && data.swapRequests?.some(r => r.rg === rg && r.status === 'pending' && (r.fromDay === dayStr || r.toDay === dayStr));
                                                 
                                                 const afastamentoAtivo = !isEscalantePref && afastamentos.find(a => a.rg === rg && dayStr >= a.inicio && dayStr <= a.retorno);
                                                 const cellCanEdit = canEdit && !afastamentoAtivo;
                                                 
                                                 return (
                                                     <td 
                                                         key={`${dayStr}-${rg}`} 
                                                         onClick={() => {
                                                             if (cellCanEdit) {
                                                                 handleCycleCellStatus(rg, dayStr);
                                                             }
                                                         }}
                                                         className={cn(
                                                             "py-1 px-1 border-r text-center relative select-none group",
                                                             isPreferredDate && !isSelected && !isEscalantePref ? "bg-red-50/70 border-r-red-100" : "",
                                                             isWeekend && !isPreferredDate ? "bg-orange-100/50 hover:bg-orange-200/50 border-r-orange-200/50" : "border-r-slate-100",
                                                             isSwapDay ? "bg-orange-100 border-orange-300 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.4)]" : "",
                                                             isGrd && !afastamentoAtivo ? "bg-emerald-50/50" : "",
                                                             cellCanEdit ? "cursor-pointer hover:bg-indigo-200 hover:shadow-inner" : "cursor-default hover:bg-slate-100",
                                                             afastamentoAtivo && "bg-orange-100/80 cursor-not-allowed"
                                                         )}
                                                     >
                                                         {afastamentoAtivo ? (
                                                             <div className="mx-auto w-[90%] h-5 sm:h-6 px-0.5 rounded flex items-center justify-center bg-orange-100 text-orange-700 border border-orange-200 shadow-sm relative overflow-hidden" title={afastamentoAtivo.situacao}>
                                                                 <span className="text-[7px] font-black leading-none uppercase truncate">{afastamentoAtivo.situacao}</span>
                                                             </div>
                                                         ) : (
                                                             <>
                                                                 {isSelected && (
                                                                     <div className={cn(
                                                                         "mx-auto w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center shadow-sm relative",
                                                                         isEscalantePref ? "bg-red-500 text-white border border-red-600 shadow-red-200" :
                                                                         isSwapDay ? "bg-orange-500 text-white shadow-orange-200 border border-orange-600 animate-pulse" :
                                                                         isTargetUser ? "bg-indigo-500 text-white" : "bg-slate-600 text-white"
                                                                     )}>
                                                                         <span className={cn("text-[10px] font-black leading-none pt-[1px]", isEscalantePref && "text-white")}>
                                                                             {isEscalantePref ? '★' : 'X'}
                                                                         </span>
                                                                     </div>
                                                                 )}
                                                                 {isExp && (
                                                                     <div className="mx-auto w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm relative">
                                                                         <span className="text-[8px] font-black leading-none">EXP</span>
                                                                     </div>
                                                                 )}
                                                                 {isGrd && !isSelected && !isExp && (
                                                                    <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none group-hover:opacity-20 transition-opacity">
                                                                        <span data-no-copy="true" className="text-[8px] font-black text-emerald-600 bg-emerald-100/50 px-1 rounded border border-emerald-200 shadow-sm">GRD</span>
                                                                    </div>
                                                                 )}
                                                             </>
                                                         )}
                                                         {!isSelected && !isExp && isSwapDay && (
                                                             <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-80">
                                                                 <ArrowUpDown className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                                                             </div>
                                                         )}
                                                         {isPreferredDate && !isSelected && !isEscalantePref && !isSwapDay && (
                                                             <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                                                                 <span className="text-[14px] text-red-500">★</span>
                                                             </div>
                                                         )}
                                                     </td>
                                                 );
                                             })}
                                         </tr>
                                     );
                                 })}
                             </tbody>
                         </table>
                     ) : (
                     <table className="w-full text-left border-collapse min-w-[max-content]">
                         <thead>
                            <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-500">
                                <th className="py-2 px-3 sticky left-0 z-30 bg-slate-100 border-r-2 border-slate-200 text-[10px] font-black uppercase tracking-widest min-w-[150px] shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)]">
                                    Militar
                                </th>
                                <th className="py-2 px-3 border-r-2 border-slate-200 text-[10px] font-black uppercase text-center min-w-[60px]">
                                    Total
                                </th>
                                {currentMonthDays.map(day => {
                                    const dayStr = format(day, 'yyyy-MM-dd');
                                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                    const isPreferredDate = safeArr(data.selections['ESCALANTE_PREF']).includes(dayStr);
                                    return (
                                        <th key={day.toISOString()} className={cn(
                                            "py-2 px-1 border-r text-center min-w-[32px] sm:min-w-[40px] text-[10px] font-black transition-colors",
                                            isWeekend ? "bg-orange-200 text-orange-950 border-r-orange-300 border-b-2 border-b-orange-400" : "bg-slate-50 border-r-slate-200 text-slate-500",
                                            isPreferredDate ? "bg-red-50/80 border-red-200 text-red-700 shadow-[inset_0_-2px_0_rgba(239,68,68,0.3)]" : ""
                                        )}>
                                            <div className="flex flex-col">
                                                <span className={cn(
                                                    "text-[8px] font-black uppercase leading-none mb-0.5",
                                                    isPreferredDate ? "text-red-500" :
                                                    isWeekend ? "text-orange-800" : "text-slate-400"
                                                )}>
                                                    {format(day, 'eee', { locale: ptBR }).slice(0, 3)}
                                                </span>
                                                <span className={cn(
                                                    "text-[10px] sm:text-[11px] font-black",
                                                    isPreferredDate ? "text-red-700" :
                                                    isWeekend ? "text-orange-950" : ""
                                                )}>
                                                    {format(day, 'd')}
                                                </span>
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {expedienteUsers.map((u, i) => {
                                 const rg = u.rg || u.uid;
                                 const isEscalantePref = rg === 'ESCALANTE_PREF';
                                 const userSels = safeArr(data.selections[rg]);
                                 const reqAmount = getReqAmount(rg);
                                 const isTargetUser = activeRg === rg;
                                 const canEdit = isAdmin || isTargetUser || (isEscalantePref && (isAdmin || user.isEscalante));
                                 const isEven = i % 2 === 0;
                                 
                                 return (
                                     <tr key={rg} className={cn(
                                         "border-b border-slate-100 transition-colors hover:bg-slate-200/50",
                                         isEscalantePref ? "bg-red-50/50 hover:bg-red-100/50" : ""
                                     )}>
                                         <td className={cn(
                                             "py-2 px-3 sticky left-0 z-20 border-r-2 border-slate-200 text-[10px] sm:text-[11px] font-black truncate max-w-[200px] shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)]",
                                             isEscalantePref ? "bg-red-100 text-red-900" :
                                             isTargetUser ? "bg-indigo-100 text-indigo-950" :
                                             isEven ? "bg-slate-100 text-slate-800" : "bg-white text-slate-800"
                                         )}>
                                             {isEscalantePref ? '🌟 PREFERÊNCIAS (ESCALANTE)' : formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name)}
                                         </td>
                                         <td className={cn(
                                            "py-2 px-3 border-r-2 border-slate-200 text-[10px] font-black text-center whitespace-nowrap",
                                            isEven && !isTargetUser && !isEscalantePref ? "bg-slate-50/50" : ""
                                         )}>
                                             {isEscalantePref ? (
                                                <span className="text-red-600 font-bold">{userSels.length} d</span>
                                             ) : (
                                                 <span className={cn(
                                                     userSels.length >= reqAmount && reqAmount > 0 ? "text-green-600" : "text-amber-600"
                                                 )}>
                                                     {userSels.length} / {reqAmount || '?'}
                                                 </span>
                                             )}
                                         </td>
                                         {currentMonthDays.map(day => {
                                             const dayStr = format(day, 'yyyy-MM-dd');
                                             const isSelected = userSels.includes(dayStr);
                                             const isExp = safeArr(data.expedienteDays?.[rg]).includes(dayStr);
                                             const isGrd = !isEscalantePref && data.grdData?.[dayStr]?.includes(rg);
                                             const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                             const isPreferredDate = !isEscalantePref && safeArr(data.selections['ESCALANTE_PREF']).includes(dayStr);
                                             const isSwapDay = !isEscalantePref && data.swapRequests?.some(r => r.rg === rg && r.status === 'pending' && (r.fromDay === dayStr || r.toDay === dayStr));
                                             
                                             const afastamentoAtivo = !isEscalantePref && afastamentos.find(a => a.rg === rg && dayStr >= a.inicio && dayStr <= a.retorno);
                                             const cellCanEdit = canEdit && !afastamentoAtivo;

                                             return (
                                                 <td 
                                                     key={dayStr} 
                                                     onClick={() => {
                                                         if (cellCanEdit) {
                                                             handleCycleCellStatus(rg, dayStr);
                                                         }
                                                     }}
                                                     className={cn(
                                                         "py-1 px-1 border-r text-center relative max-w-[40px] select-none group",
                                                         isPreferredDate && !isSelected ? "bg-red-50/70 border-r-red-100" :
                                                         isWeekend && !isPreferredDate ? "bg-orange-100/60 hover:bg-orange-200/70 border-r-orange-200/70" : "border-r-slate-100",
                                                         isEven && !isPreferredDate && !isEscalantePref && !isWeekend ? "bg-slate-50/30" : "",
                                                         isSwapDay ? "bg-orange-100 border-orange-300 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.4)]" : "",
                                                         isGrd && !afastamentoAtivo ? "bg-emerald-50/30" : "",
                                                         cellCanEdit ? "cursor-pointer hover:bg-indigo-200 hover:shadow-inner" : "hover:bg-slate-100",
                                                         afastamentoAtivo && "bg-orange-100/80 cursor-not-allowed"
                                                     )}
                                                 >
                                                     {afastamentoAtivo ? (
                                                         <div className="mx-auto w-[90%] h-5 sm:h-6 px-0.5 rounded flex items-center justify-center bg-orange-100 text-orange-700 border border-orange-200 shadow-sm relative overflow-hidden" title={afastamentoAtivo.situacao}>
                                                             <span className="text-[7px] font-black leading-none uppercase truncate">{afastamentoAtivo.situacao}</span>
                                                         </div>
                                                     ) : (
                                                         <>
                                                             {isSelected && (
                                                                <div className={cn(
                                                                    "mx-auto w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center shadow-sm relative",
                                                                    isEscalantePref ? "bg-red-500 text-white border border-red-600 shadow-red-200" :
                                                                    isSwapDay ? "bg-orange-500 text-white shadow-orange-200 border border-orange-600 animate-pulse" :
                                                                    isTargetUser ? "bg-indigo-500 text-white" : "bg-slate-600 text-white"
                                                                )}>
                                                                    <span className={cn("text-[10px] font-black leading-none pt-[1px]", isEscalantePref && "text-white")}>
                                                                        {isEscalantePref ? '★' : 'X'}
                                                                    </span>
                                                                </div>
                                                             )}
                                                             {isExp && (
                                                                 <div className="mx-auto w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm relative">
                                                                     <span className="text-[8px] font-black leading-none">EXP</span>
                                                                 </div>
                                                             )}
                                                             {!isSelected && !isExp && isGrd && (
                                                                 <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none group-hover:opacity-20 transition-opacity">
                                                                     <span className="text-[8px] font-black text-emerald-600 bg-emerald-100/50 px-1 rounded border border-emerald-200 shadow-sm">GRD</span>
                                                                 </div>
                                                             )}
                                                         </>
                                                     )}
                                                     {!isSelected && !isExp && isSwapDay && (
                                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-80">
                                                            <ArrowUpDown className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                                                        </div>
                                                     )}
                                                     {isPreferredDate && !isSelected && !isSwapDay && (
                                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                                                            <span className="text-[12px] text-red-500">★</span>
                                                        </div>
                                                     )}
                                                 </td>
                                             );
                                         })}
                                     </tr>
                                 );
                            })}
                        </tbody>
                    </table>
                    )}
                </div>
           ) : mapeamentoSubView === 'lista' ? (
                <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6 overflow-y-auto font-mono text-sm text-slate-800">
                    <div className="flex flex-col mb-8">
                        {currentMonthDays.map(day => {
                            const dayStr = format(day, 'yyyy-MM-dd');
                            const dayNum = format(day, 'dd');
                                
                            return (
                                <div key={dayStr} className="flex min-h-[1.5rem]">
                                    <span className="w-8 shrink-0">{dayNum}-</span>
                                    <span>
                                        {expedienteUsers
                                            .filter(u => u.rg !== 'ESCALANTE_PREF' && safeArr(data.selections[u.rg || u.uid]).includes(dayStr))
                                            .map((u, idx, arr) => {
                                                const rg = u.rg || u.uid;
                                                const isGrd = data.grdData?.[dayStr]?.includes(rg);
                                                const name = formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name);
                                                return (
                                                    <span key={rg}>
                                                        {name}
                                                        {isGrd && <span data-no-copy="true"> (🛡️ GRD)</span>}
                                                        {idx < arr.length - 1 && " / "}
                                                    </span>
                                                );
                                            })}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className="flex flex-col pt-6 border-t font-semibold border-slate-200 border-dashed">
                        {expedienteUsers.filter(u => u.rg !== 'ESCALANTE_PREF').map(u => {
                            const rg = u.rg || u.uid;
                            const count = safeArr(data.selections[rg]).length;
                            const req = getReqAmount(rg);
                            const isDTS = req === 0 && count === 0;
                            const name = formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name);
                            const suffix = isDTS ? "DTS" : `${count} serv.`;
                            return (
                                <div key={rg} className="flex">
                                    <span>{name} - {suffix}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
           ) : (
                <div id="escala-sv-container" className="flex flex-col gap-8 w-full">
                    {Array.from({ length: Math.ceil(expedienteUsers.filter(u => u.rg !== 'ESCALANTE_PREF').length / 7) }).map((_, tableIndex) => {
                        let tableUsers = expedienteUsers.filter(u => u.rg !== 'ESCALANTE_PREF').slice(tableIndex * 7, tableIndex * 7 + 7);
                        const paddedUsers = [...tableUsers];
                        while(paddedUsers.length < 7) {
                            paddedUsers.push(null as any);
                        }
                        return (
                            <div key={tableIndex} className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-x-auto custom-scrollbar">
                              <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
                                <thead>
                                   <tr className="bg-slate-100 border-b-2 border-slate-300">
                                       <th className="py-2 px-3 border-r-2 border-slate-200 text-[10px] font-black uppercase text-center text-slate-500 w-[16%] bg-slate-200/50">
                                           DATA
                                       </th>
                                       {paddedUsers.map((u, i) => (
                                           <th key={u ? (u.rg || u.uid) : `empty-${i}`} className="py-2 px-2 border-r-2 border-slate-200 text-[9px] sm:text-[10px] font-black uppercase text-center text-slate-700 bg-slate-100 w-[12%]">
                                               {u ? (
                                                  <div className="flex flex-col items-center gap-1">
                                                      <span>{formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name)}</span>
                                                      {(isAdmin || user.isEscalante) && (
                                                          <div data-no-copy="true" className="flex items-center gap-1 justify-center mt-0.5" onClick={e => e.stopPropagation()}>
                                                              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">EXP/Sem:</span>
                                                              <input 
                                                                type="number" 
                                                                min="0" 
                                                                max="7"
                                                                value={data.expQuotas?.[u.rg || u.uid] !== undefined ? data.expQuotas[u.rg || u.uid] : getExpQuota(u.rg || u.uid)}
                                                                onChange={(e) => updateExpQuota(u.rg || u.uid, parseInt(e.target.value) || 0)}
                                                                placeholder="0"
                                                                className={cn("w-8 h-4 text-[9px] font-black text-center border-b-2 bg-transparent outline-none focus:border-indigo-500", data.expQuotas?.[u.rg || u.uid] !== undefined ? "border-indigo-400 text-indigo-700" : "border-slate-300 text-slate-500")}
                                                                title={data.expQuotas?.[u.rg || u.uid] !== undefined ? "Cota manual (modificada)" : "Cota do Regime (automática)"}
                                                              />
                                                          </div>
                                                      )}
                                                  </div>
                                               ) : ''}
                                           </th>
                                       ))}
                                   </tr>
                               </thead>
                               <tbody>
                                  {currentMonthDays.map((day, idx) => {
                                      const dayStr = format(day, 'yyyy-MM-dd');
                                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                      return (
                                          <tr key={dayStr} className={cn("border-b border-slate-200", isWeekend ? "bg-amber-100/40" : "bg-white")}>
                                              <td className={cn("py-1.5 px-3 border-r-2 border-slate-200 text-[11px] font-black whitespace-nowrap text-center", isWeekend ? "text-amber-900 border-amber-300/50" : "text-slate-700")}>
                                                  {format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
                                              </td>
                                              {paddedUsers.map((u, i) => {
                                                  const isSelected = u && safeArr(data.selections[u.rg || u.uid]).includes(dayStr);
                                                  const isExp = u && safeArr(data.expedienteDays?.[u.rg || u.uid]).includes(dayStr);
                                                  const isGrd = u && data.grdData?.[dayStr]?.includes(u.rg || u.uid);
                                                  const afastamentoAtivo = u ? afastamentos.find(a => a.rg === (u.rg || u.uid) && dayStr >= a.inicio && dayStr <= a.retorno) : null;
                                                  const canClick = u && (isAdmin || user.isEscalante) && !afastamentoAtivo;
                                                  return (
                                                      <td 
                                                          key={u ? (u.rg || u.uid) : `empty-${i}`} 
                                                          onClick={() => {
                                                              if (canClick && u) {
                                                                  handleCycleCellStatus(u.rg || u.uid, dayStr);
                                                              }
                                                          }}
                                                          className={cn(
                                                            "py-1.5 px-3 border-r-2 border-slate-200 text-center text-[11px] font-black transition-colors", 
                                                            isWeekend && "border-amber-300/50", 
                                                            canClick && "cursor-pointer hover:bg-slate-100",
                                                            isGrd && !afastamentoAtivo && "bg-emerald-50 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.2)]",
                                                            afastamentoAtivo && "bg-orange-50 cursor-not-allowed"
                                                          )}
                                                      >
                                                          {afastamentoAtivo ? (
                                                              <span className="inline-flex items-center justify-center text-orange-700 bg-orange-100 px-2 py-0.5 rounded mx-1 whitespace-nowrap min-w-[38px] text-[9px] uppercase tracking-tighter border border-orange-200">
                                                                {afastamentoAtivo.situacao}
                                                              </span>
                                                          ) : (
                                                              <>
                                                                  {isSelected && <span className="inline-flex items-center justify-center text-red-600 font-bold mx-1 bg-red-50 px-2 py-0.5 rounded whitespace-nowrap min-w-[38px]">SV.</span>}
                                                                  {isExp && <span className="inline-flex items-center justify-center text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded mx-1 whitespace-nowrap min-w-[38px]">EXP.</span>}
                                                                  {isGrd && (
                                                                    <span data-no-copy="true" className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded mx-0.5 border border-emerald-200 shadow-sm text-[8px] font-black uppercase tracking-tighter flex items-center gap-0.5">
                                                                      <Shield className="w-2 h-2 fill-emerald-500" /> GRD
                                                                    </span>
                                                                  )}
                                                              </>
                                                          )}
                                                      </td>
                                                  );
                                              })}
                                          </tr>
                                      );
                                  })}
                               </tbody>
                             </table>
                           </div>
                        );
                    })}
                </div>
                   )}
               </div>
           ) : viewMode === 'necessidades' && (isAdmin || user.isEscalante) ? (
                <div className="bg-slate-50 flex flex-col gap-6 w-full">
                    <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-4 sm:p-6">
                        <div className="flex flex-col mb-6">
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Datas Preferenciais e Funções em Falta</h4>
                            <p className="text-[11px] text-slate-500 font-bold mt-1">
                                Identifique os dias em que há carência de efetivo. Para cada dia selecionado, especifique quais funções estão faltando e a quantidade de militares necessários.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {currentMonthDays.map(day => {
                                const dayStr = format(day, 'yyyy-MM-dd');
                                const isPreferred = safeArr(data.selections['ESCALANTE_PREF']).includes(dayStr);
                                const details = data.preferencesDetails?.[dayStr] || {};
                                
                                return (
                                    <div key={dayStr} className={cn("border-2 rounded-xl p-4 transition-all", isPreferred ? "bg-red-50/30 border-red-200" : "bg-white border-slate-100 hover:border-slate-200")}>
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex flex-col">
                                                <span className={cn("text-[10px] font-black uppercase tracking-widest", isPreferred ? "text-red-500" : "text-slate-400")}>
                                                    {format(day, 'eee', {locale: ptBR})}
                                                </span>
                                                <span className={cn("text-xs font-black", isPreferred ? "text-red-700" : "text-slate-700")}>
                                                    {format(day, 'dd/MM/yyyy')}
                                                </span>
                                            </div>
                                            <button 
                                                onClick={() => handleTogglePrefDate(dayStr)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors",
                                                    isPreferred ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                )}
                                            >
                                                {isPreferred ? 'Desmarcar' : 'Selecionar'}
                                            </button>
                                        </div>
                                        
                                        {isPreferred && (
                                            <div className="mt-4 pt-4 border-t-2 border-red-100/50 flex flex-col gap-3">
                                                {Object.entries(details).filter(([k]) => !k.startsWith('_')).length > 0 ? (
                                                    Object.entries(details)
                                                      .filter(([k]) => !k.startsWith('_'))
                                                      .map(([func, qtRaw]) => {
                                                        const qt = typeof qtRaw === 'number' ? qtRaw : 1;
                                                        return (
                                                        <div key={func} className="flex justify-between items-center bg-white border border-red-100 rounded-lg p-2 shadow-sm">
                                                            <span className="text-[10px] font-black text-slate-700 tracking-tight">{func}</span>
                                                            <div className="flex items-center gap-2 bg-slate-50 rounded-md border border-slate-100 p-0.5">
                                                                <button 
                                                                    onClick={() => handleUpdatePrefDetail(dayStr, func, qt - 1)}
                                                                    className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-slate-500 hover:text-red-500 font-bold"
                                                                >
                                                                    -
                                                                </button>
                                                                <span className="text-[11px] font-black text-indigo-700 w-4 text-center">{qt}</span>
                                                                <button 
                                                                    onClick={() => handleUpdatePrefDetail(dayStr, func, qt + 1)}
                                                                    className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-slate-500 hover:text-green-500 font-bold"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="text-[10px] font-bold text-red-400 text-center py-2 italic">
                                                        Nenhuma função especificada.
                                                    </div>
                                                )}
                                                
                                                <select 
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val) {
                                                            handleUpdatePrefDetail(dayStr, val, 1);
                                                            e.target.value = "";
                                                        }
                                                    }}
                                                    className="w-full text-[10px] font-bold text-slate-600 bg-white border-2 border-slate-200 rounded-lg p-2 outline-none focus:border-indigo-400 mt-1 cursor-pointer"
                                                >
                                                    <option value="">+ Adicionar Função</option>
                                                    {FUNCOES_ESCALA.filter(f => !details[f]).map(f => (
                                                        <option key={f} value={f}>{f}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
           ) : viewMode === 'relatorios' && (isAdmin || user.isEscalante) ? (
                <div className="flex flex-col gap-6 w-full">
                    {/* Barra Superior de Ações e Sub-Abas */}
                    <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-4 flex flex-wrap items-center justify-between gap-4 print:hidden">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Alternador de Sub-Aba: Mensal vs Semanal */}
                            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                                <button
                                    onClick={() => setReportType('mensal')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer",
                                        reportType === 'mensal' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                                    )}
                                >
                                    <CalendarRange className="w-3.5 h-3.5" />
                                    <span>Escala Mensal</span>
                                </button>
                                <button
                                    onClick={() => setReportType('semanal')}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer",
                                        reportType === 'semanal' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                                    )}
                                >
                                    <Columns className="w-3.5 h-3.5" />
                                    <span>Escala Semanal</span>
                                </button>
                            </div>

                            {/* Navegação de Mês (Relatório Mensal) */}
                            {reportType === 'mensal' ? (
                                <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                                    <button
                                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                        className="p-1.5 hover:bg-white rounded-md transition-colors text-slate-600 hover:text-slate-900 cursor-pointer"
                                        title="Mês Anterior"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="px-3 text-xs font-black uppercase text-slate-700 tracking-wider min-w-[140px] text-center select-none">
                                        {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                                    </span>
                                    <button
                                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                        className="p-1.5 hover:bg-white rounded-md transition-colors text-slate-600 hover:text-slate-900 cursor-pointer"
                                        title="Próximo Mês"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                /* Navegação de Semana (Relatório Semanal) */
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                                        <button
                                            onClick={() => setSelectedWeekMonday(subWeeks(selectedWeekMonday, 1))}
                                            className="p-1.5 hover:bg-white rounded-md transition-colors text-slate-600 hover:text-slate-900 cursor-pointer"
                                            title="Semana Anterior"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="px-3 text-xs font-black uppercase text-slate-700 tracking-wider min-w-[170px] text-center select-none">
                                            {format(weekDays[0], 'dd/MM')} a {format(weekDays[4], 'dd/MM/yyyy')}
                                        </span>
                                        <button
                                            onClick={() => setSelectedWeekMonday(addWeeks(selectedWeekMonday, 1))}
                                            className="p-1.5 hover:bg-white rounded-md transition-colors text-slate-600 hover:text-slate-900 cursor-pointer"
                                            title="Próxima Semana"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                                        <button
                                            onClick={() => setSelectedWeekMonday(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                                            className="px-2.5 py-1 rounded hover:bg-white text-slate-600 font-bold transition-colors cursor-pointer"
                                            title="Ir para a Semana Atual"
                                        >
                                            Semana Atual
                                        </button>
                                        <button
                                            onClick={() => setSelectedWeekMonday(startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 }))}
                                            className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                                            title="Ir para a Próxima Semana (a publicar)"
                                        >
                                            Próxima Semana
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-slate-600 text-xs font-bold">
                                <span>Total no Efetivo: <strong className="text-indigo-700">{expedienteUsers.filter(u => (u.rg || u.uid) !== 'ESCALANTE_PREF').length}</strong></span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopyTables}
                                className="px-3.5 py-2 rounded-lg border-2 text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-2 bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer shadow-sm"
                                title="Copiar tabela formatada para colar no Word / LibreOffice"
                            >
                                {copyStatus ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                                <span>{copyStatus ? 'Copiado!' : 'Copiar Tabela'}</span>
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-sm"
                                title="Imprimir relatório da escala"
                            >
                                <Printer className="w-4 h-4" />
                                <span>Imprimir</span>
                            </button>
                        </div>
                    </div>

                    {/* Folha do Relatório Oficial */}
                    <div 
                        id="relatorios-container" 
                        className="bg-white rounded-xl border-2 border-slate-300 shadow-md p-6 sm:p-10 w-full max-w-5xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none"
                    >
                        {reportType === 'mensal' ? (
                            <>
                                {/* Cabeçalho CBMERJ / CBA VII / OBM - Relatório Mensal */}
                                <div data-report-header="true" className="text-center font-bold font-sans text-xs sm:text-sm leading-relaxed uppercase text-black mb-6 select-text">
                                    <p>CORPO DE BOMBEIROS MILITAR DO ESTADO DO RIO DE JANEIRO</p>
                                    <p>COMANDO DE ÁREA DE BOMBEIRO-MILITAR VII - COSTA VERDE</p>
                                    <p>{selectedObm.toLowerCase().includes('10') ? 'GRUPAMENTO DE BOMBEIRO MILITAR-ANGRA DOS REIS' : selectedObm.toUpperCase()}</p>
                                    <p className="mt-5 font-black text-sm sm:text-base tracking-wide border-b-2 border-black pb-3">
                                        ESCALA DE EXPEDIENTE DO MÊS DE {format(currentMonth, 'MMMM', { locale: ptBR }).toUpperCase()} DE {format(currentMonth, 'yyyy')}
                                    </p>
                                </div>

                                {/* Tabela Mensal de 5 Colunas */}
                                <div className="overflow-x-auto w-full">
                                    <table className="w-full border-collapse border-2 border-black text-black font-sans text-xs sm:text-sm select-text">
                                        <thead>
                                            <tr className="bg-slate-100 border-b-2 border-black text-black font-black uppercase text-center">
                                                <th className="border border-black py-2.5 px-3 text-center tracking-wider w-[24%]">NOME</th>
                                                <th className="border border-black py-2.5 px-2 text-center tracking-wider w-[12%]">RG</th>
                                                <th className="border border-black py-2.5 px-2 text-center tracking-wider w-[12%]">FUNÇÃO</th>
                                                <th className="border border-black py-2.5 px-3 text-center tracking-wider w-[26%]">REGIME</th>
                                                <th className="border border-black py-2.5 px-3 text-center tracking-wider w-[26%]">SERVIÇOS ORDINÁRIOS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {expedienteUsers.filter(u => (u.rg || u.uid) !== 'ESCALANTE_PREF').length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="border border-black py-8 text-center text-slate-500 italic text-xs">
                                                        Nenhum militar cadastrado no expediente para esta OBM neste mês.
                                                    </td>
                                                </tr>
                                            ) : (
                                                expedienteUsers
                                                    .filter(u => (u.rg || u.uid) !== 'ESCALANTE_PREF')
                                                    .map((u) => {
                                                        const rg = u.rg || u.uid;
                                                        const nome = formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name);
                                                        const funcao = getSector(rg) || (u.specializations && u.specializations.length > 0 ? u.specializations[0] : '') || u.officerRole || '';
                                                        const regime = getRegimeDisplay(rg);
                                                        const servicos = getServicosOrdinariosDisplay(u);

                                                        return (
                                                            <tr key={rg} className="hover:bg-slate-50 transition-colors">
                                                                <td className="border border-black py-2 px-3 text-center font-bold">
                                                                    {nome}
                                                                </td>
                                                                <td className="border border-black py-2 px-2 text-center font-medium">
                                                                    {rg}
                                                                </td>
                                                                <td className="border border-black py-2 px-2 text-center font-bold">
                                                                    {funcao}
                                                                </td>
                                                                <td className="border border-black py-2 px-3 text-center">
                                                                    {regime}
                                                                </td>
                                                                <td className="border border-black py-2 px-3 text-center font-bold">
                                                                    {servicos}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Cabeçalho CBMERJ / CBA VII / OBM - Escala Semanal de Expediente (Conforme Imagem Oficial) */}
                                <div data-report-header="true" className="text-center font-bold font-sans text-xs sm:text-sm leading-relaxed uppercase text-black mb-6 select-text">
                                    <p>CORPO DE BOMBEIROS MILITAR DO ESTADO DO RIO DE JANEIRO</p>
                                    <p>COMANDO DE ÁREA DE BOMBEIRO-MILITAR VII - COSTA VERDE</p>
                                    <p>{selectedObm.toLowerCase().includes('10') ? 'GRUPAMENTO DE BOMBEIRO MILITAR-ANGRA DOS REIS' : selectedObm.toUpperCase()}</p>
                                    <p className="mt-5 font-black text-sm sm:text-base tracking-wide border-b-2 border-black pb-3">
                                        ESCALA SEMANAL DE EXPEDIENTE
                                    </p>
                                </div>

                                {/* Tabela Semanal de Segunda a Sexta */}
                                <div className="overflow-x-auto w-full">
                                    <table className="w-full border-collapse border-2 border-black text-black font-sans text-xs sm:text-sm select-text">
                                        <thead>
                                            <tr className="bg-slate-100 border-b-2 border-black text-black font-black uppercase text-center">
                                                <th className="border border-black py-2.5 px-3 text-center tracking-wider w-[22%]">NOME</th>
                                                <th className="border border-black py-2.5 px-2 text-center tracking-wider w-[10%]">RG</th>
                                                {weekDays.map((day, idx) => {
                                                    const dayNames = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA'];
                                                    return (
                                                        <th key={idx} className="border border-black py-2.5 px-2 text-center tracking-wider w-[13.6%]">
                                                            {dayNames[idx]} {format(day, 'dd/MM')}
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {expedienteUsers.filter(u => (u.rg || u.uid) !== 'ESCALANTE_PREF').length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="border border-black py-8 text-center text-slate-500 italic text-xs">
                                                        Nenhum militar cadastrado no expediente para esta OBM.
                                                    </td>
                                                </tr>
                                            ) : (
                                                expedienteUsers
                                                    .filter(u => (u.rg || u.uid) !== 'ESCALANTE_PREF')
                                                    .map((u) => {
                                                        const rg = u.rg || u.uid;
                                                        const nome = formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name);

                                                        return (
                                                            <tr key={rg} className="hover:bg-slate-50 transition-colors">
                                                                <td className="border border-black py-2 px-3 text-center font-bold">
                                                                    {nome}
                                                                </td>
                                                                <td className="border border-black py-2 px-2 text-center font-medium">
                                                                    {rg}
                                                                </td>
                                                                {weekDays.map((day, dIdx) => {
                                                                    const dayStr = format(day, 'yyyy-MM-dd');
                                                                    const cell = getDayStatus(rg, dayStr);
                                                                    const canEdit = isAdmin || user.isEscalante;

                                                                    return (
                                                                        <td
                                                                            key={dIdx}
                                                                            onClick={() => canEdit && handleCycleWeeklyStatus(rg, dayStr)}
                                                                            className={cn(
                                                                                "border border-black py-2 px-1 text-center font-bold transition-colors select-none",
                                                                                canEdit && "cursor-pointer hover:bg-slate-100",
                                                                                cell.type === 'servico' && (cell.isPermuta ? "bg-purple-100/90 text-purple-950 font-black border-purple-300" : "bg-slate-100 font-black"),
                                                                                cell.type === 'folga' && (cell.isPermuta ? "text-purple-700 bg-purple-50/50 font-semibold" : "text-slate-600 font-semibold"),
                                                                                cell.type === 'expediente' && "font-black",
                                                                                cell.type === 'afastamento' && "bg-orange-50/70 text-orange-900"
                                                                            )}
                                                                            title={canEdit ? (cell.isPermuta ? "Serviço 24h via Permuta" : "Clique para alternar: EXPEDIENTE -> SERVIÇO -> FOLGA") : (cell.isPermuta ? "Serviço 24h via Permuta" : undefined)}
                                                                        >
                                                                            {cell.isPermuta && cell.type === 'servico' ? (
                                                                                <div className="flex flex-col items-center justify-center leading-tight">
                                                                                    <span>SERVIÇO</span>
                                                                                    <span className="text-[9px] font-black text-purple-700 uppercase tracking-tighter">(PERMUTA)</span>
                                                                                </div>
                                                                            ) : (
                                                                                cell.text
                                                                            )}
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        );
                                                    })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
           ) : viewMode === 'semanal' ? (
                <div className="flex flex-col gap-6 w-full">
                    {/* Header Controls da Aba Semanal */}
                    <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Navegação Semanal */}
                            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                                <button
                                    onClick={() => setSelectedWeekMonday(subWeeks(selectedWeekMonday, 1))}
                                    className="p-1.5 hover:bg-white rounded-md transition-colors text-slate-600 hover:text-slate-900 cursor-pointer"
                                    title="Semana Anterior"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="px-3 text-xs font-black uppercase text-slate-800 tracking-wider min-w-[170px] text-center select-none">
                                    {format(fullWeekDays[0], 'dd/MM')} a {format(fullWeekDays[6], 'dd/MM/yyyy')}
                                </span>
                                <button
                                    onClick={() => setSelectedWeekMonday(addWeeks(selectedWeekMonday, 1))}
                                    className="p-1.5 hover:bg-white rounded-md transition-colors text-slate-600 hover:text-slate-900 cursor-pointer"
                                    title="Próxima Semana"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Atalhos rápidos de semana */}
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                                <button
                                    onClick={() => setSelectedWeekMonday(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                                    className="px-2.5 py-1 rounded hover:bg-white text-slate-600 font-bold transition-colors cursor-pointer"
                                    title="Ir para a Semana Atual"
                                >
                                    Semana Atual
                                </button>
                                <button
                                    onClick={() => setSelectedWeekMonday(startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 }))}
                                    className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                                    title="Ir para a Próxima Semana"
                                >
                                    Próxima Semana
                                </button>
                            </div>

                            {/* Filtro: 7 Dias vs 5 Dias */}
                            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                                <button
                                    onClick={() => setWeeklyFilterDays('all')}
                                    className={cn(
                                        "px-2.5 py-1 rounded font-bold transition-colors cursor-pointer",
                                        weeklyFilterDays === 'all' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                                    )}
                                >
                                    7 Dias (Seg a Dom)
                                </button>
                                <button
                                    onClick={() => setWeeklyFilterDays('weekdays')}
                                    className={cn(
                                        "px-2.5 py-1 rounded font-bold transition-colors cursor-pointer",
                                        weeklyFilterDays === 'weekdays' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                                    )}
                                >
                                    5 Dias (Seg a Sex)
                                </button>
                            </div>

                            {/* Alternador de Visualização: Grade vs Lista (Celular / Modal) */}
                            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                                <button
                                    type="button"
                                    onClick={() => handleToggleWeeklyLayoutMode('grid')}
                                    className={cn(
                                        "px-2.5 py-1 rounded font-bold transition-colors cursor-pointer flex items-center gap-1.5",
                                        weeklyLayoutMode === 'grid' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                                    )}
                                    title="Visualização em Grade / Cards"
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Grade</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleToggleWeeklyLayoutMode('list')}
                                    className={cn(
                                        "px-2.5 py-1 rounded font-bold transition-colors cursor-pointer flex items-center gap-1.5",
                                        weeklyLayoutMode === 'list' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                                    )}
                                    title="Visualização em Linhas / Lista Compacta (Estilo Celular e Modal)"
                                >
                                    <List className="w-3.5 h-3.5" />
                                    <span>Lista {weeklyLayoutMode === 'list' ? '(Celular)' : ''}</span>
                                </button>
                            </div>
                        </div>

                        {/* Seletor de Militar Alvo para Moderador/Escalante */}
                        <div className="flex items-center gap-3">
                            {(isAdmin || user.isEscalante) && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider hidden sm:inline">Preenchendo para:</span>
                                    <select
                                        className="bg-slate-50 border-2 border-slate-200 text-slate-800 text-xs font-bold p-2 rounded-lg outline-none cursor-pointer hover:border-indigo-400 focus:border-indigo-500 transition-colors"
                                        value={adminTargetRg || ''}
                                        onChange={(e) => setAdminTargetRg(e.target.value || null)}
                                    >
                                        <option value="">Você ({formatMilitaryName(user.rank ? `${user.rank} ${user.warName || user.name.split(' ')[0]}` : user.name)})</option>
                                        <optgroup label="Militares do Expediente">
                                            {expedienteUsers.filter(u => (u.rg || u.uid) !== 'ESCALANTE_PREF').map((u, i) => {
                                                const val = u.rg || u.uid || `usr-${i}`;
                                                return (
                                                    <option key={`opt-wk-${val}`} value={val}>
                                                        {formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name)} ({u.rg || 'S/RG'})
                                                    </option>
                                                );
                                            })}
                                        </optgroup>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Resumo & Status do Militar */}
                    {(() => {
                        const targetUserObj = expedienteUsers.find(u => (u.rg || u.uid) === activeRg) || user;
                        const targetName = formatMilitaryName(targetUserObj.rank ? `${targetUserObj.rank} ${targetUserObj.warName || targetUserObj.name.split(' ')[0]}` : targetUserObj.name);
                        const displayedDaysList = weeklyFilterDays === 'all' ? fullWeekDays : weekDays;

                        const weekStatusList = displayedDaysList.map(d => {
                            const dStr = format(d, 'yyyy-MM-dd');
                            return getDayStatus(activeRg, dStr);
                        });
                        const weekExpCount = weekStatusList.filter(s => s.type === 'expediente').length;
                        const weekSvCount = weekStatusList.filter(s => s.type === 'servico').length;
                        const weekFolgaCount = weekStatusList.filter(s => s.type === 'folga').length;

                        const currentWeekKey = format(selectedWeekMonday, 'yyyy-MM-dd');
                        const weekMondayMonthKey = format(selectedWeekMonday, 'yyyy-MM');
                        const weekDocRef = weekMondayMonthKey === monthKey ? monthDocRef : doc(db, `expediente_${normalizedObm}`, weekMondayMonthKey);

                        const userSels = safeArr(data.selections[activeRg]);
                        const userReq = getReqAmount(activeRg);
                        const isWeekLocked = isWeeklyLockedForUser(activeRg, selectedWeekMonday);
                        const isMonthOrdLocked = isOrdinarioLockedForUser(activeRg, weekMondayMonthKey);
                        const regimeText = getRegimeDisplay(activeRg);

                        return (
                            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                                            Preenchimento Semanal
                                        </span>
                                        {regimeText && regimeText !== '-' && (
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 bg-white/10 px-2 py-0.5 rounded">
                                                {regimeText}
                                            </span>
                                        )}
                                        {/* Status de Bloqueio do Expediente Semanal */}
                                        {isWeekLocked ? (
                                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                                                <Lock className="w-3 h-3" /> Expediente Semanal Homologado
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> Expediente Semanal Aberto
                                            </span>
                                        )}
                                        {/* Status de Bloqueio da Escala Ordinária 24h */}
                                        {isMonthOrdLocked ? (
                                            <span className="text-[10px] font-black uppercase tracking-wider text-red-300 bg-red-500/20 px-2 py-0.5 rounded border border-red-500/30 flex items-center gap-1">
                                                <Shield className="w-3 h-3" /> Escala 24h Mensal Fechada
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 bg-white/10 px-2 py-0.5 rounded flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> Escala 24h Mensal em Aberto
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                                        <User className="w-5 h-5 text-indigo-400" /> {targetName}
                                        {targetUserObj.rg && <span className="text-xs text-slate-400 font-bold">({targetUserObj.rg})</span>}
                                    </h3>
                                    <p className="text-xs text-slate-300 font-medium">
                                        Esse ambiente é para escolha dos dias de expedientes de segunda a sexta. (cabendo excepcionalmente a escolha de dias sábado e domingo.)
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-start md:justify-end">
                                    {/* Métricas da Semana */}
                                    <div className="flex items-center gap-2 bg-white/10 p-2 rounded-lg border border-white/10">
                                        <div className="flex flex-col items-center px-2 border-r border-white/10">
                                            <span className="text-xs font-black text-indigo-300">{weekExpCount}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Exped.</span>
                                        </div>
                                        <div className="flex flex-col items-center px-2 border-r border-white/10">
                                            <span className="text-xs font-black text-red-300">{weekSvCount}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Serviço</span>
                                        </div>
                                        <div className="flex flex-col items-center px-2">
                                            <span className="text-xs font-black text-emerald-300">{weekFolgaCount}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Folgas</span>
                                        </div>
                                    </div>

                                    {/* Cota no Mês */}
                                    {userReq > 0 && (
                                        <div className="flex flex-col gap-1 bg-white/10 p-2.5 rounded-lg border border-white/10 min-w-[140px]">
                                            <div className="flex justify-between items-center text-[10px] font-bold">
                                                <span className="text-slate-300 uppercase tracking-wider">Cota Mês</span>
                                                <span className="text-white font-black">{userSels.length} / {userReq} SV</span>
                                            </div>
                                            <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
                                                <div 
                                                    className={cn("h-full transition-all duration-300", userSels.length >= userReq ? "bg-emerald-400" : "bg-indigo-400")} 
                                                    style={{ width: `${Math.min(100, (userSels.length / userReq) * 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-[9px] text-right font-black uppercase tracking-wider text-slate-400">
                                                {userSels.length >= userReq ? "✓ Cota Atingida" : `Faltam ${userReq - userSels.length}`}
                                            </span>
                                        </div>
                                    )}

                                    {/* Botão de Bloqueio/Confirmação do Expediente Semanal */}
                                    {activeRg && activeRg !== 'ESCALANTE_PREF' && (
                                        !isWeekLocked ? (
                                            <button
                                                onClick={async () => {
                                                    const updatePayload = {
                                                        lockedWeekly: {
                                                            [currentWeekKey]: {
                                                                [activeRg]: true
                                                            }
                                                        }
                                                    };
                                                    if (weekMondayMonthKey === monthKey) {
                                                        setData(prev => ({
                                                            ...prev,
                                                            lockedWeekly: {
                                                                ...(prev.lockedWeekly || {}),
                                                                [currentWeekKey]: {
                                                                    ...((prev.lockedWeekly || {})[currentWeekKey] || {}),
                                                                    [activeRg]: true
                                                                }
                                                            }
                                                        }));
                                                    } else {
                                                        setExtraMonthData(prev => ({
                                                            ...prev,
                                                            [weekMondayMonthKey]: {
                                                                ...(prev[weekMondayMonthKey] || {}),
                                                                lockedWeekly: {
                                                                    ...((prev[weekMondayMonthKey]?.lockedWeekly) || {}),
                                                                    [currentWeekKey]: {
                                                                        ...(((prev[weekMondayMonthKey]?.lockedWeekly) || {})[currentWeekKey] || {}),
                                                                        [activeRg]: true
                                                                    }
                                                                }
                                                            }
                                                        }));
                                                    }
                                                    await setDoc(weekDocRef, cleanUndefined(updatePayload), { merge: true });
                                                }}
                                                className="px-3.5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                                                title="Confirmar e homologar expediente desta semana"
                                            >
                                                <Save className="w-3.5 h-3.5" /> Confirmar Expediente da Semana
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <div className="px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-200 text-xs font-bold flex items-center gap-1.5">
                                                    <Lock className="w-3.5 h-3.5 text-amber-300" /> Semana Homologada
                                                </div>
                                                <button
                                                    onClick={handleOpenWeeklyChangeModal}
                                                    className={cn(
                                                        "px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer",
                                                        userCurrentWeekRequest?.status === 'pending'
                                                            ? "bg-amber-500/30 border border-amber-400 text-amber-200 animate-pulse hover:bg-amber-500/40"
                                                            : "bg-indigo-600 hover:bg-indigo-500 text-white"
                                                    )}
                                                    title="Solicitar troca/alteração desta semana de expediente"
                                                >
                                                    <ArrowUpDown className="w-3.5 h-3.5" />
                                                    {userCurrentWeekRequest?.status === 'pending' ? 'Alteração em Análise' : 'Solicitar Alteração'}
                                                </button>
                                                {(isAdmin || user.isEscalante) && (
                                                    <button
                                                        onClick={async () => {
                                                            const updatePayload = {
                                                                lockedWeekly: {
                                                                    [currentWeekKey]: {
                                                                        [activeRg]: false
                                                                    }
                                                                }
                                                            };
                                                            if (weekMondayMonthKey === monthKey) {
                                                                setData(prev => ({
                                                                    ...prev,
                                                                    lockedWeekly: {
                                                                        ...(prev.lockedWeekly || {}),
                                                                        [currentWeekKey]: {
                                                                            ...((prev.lockedWeekly || {})[currentWeekKey] || {}),
                                                                            [activeRg]: false
                                                                        }
                                                                    }
                                                                }));
                                                            } else {
                                                                setExtraMonthData(prev => ({
                                                                    ...prev,
                                                                    [weekMondayMonthKey]: {
                                                                        ...(prev[weekMondayMonthKey] || {}),
                                                                        lockedWeekly: {
                                                                            ...((prev[weekMondayMonthKey]?.lockedWeekly) || {}),
                                                                            [currentWeekKey]: {
                                                                                ...(((prev[weekMondayMonthKey]?.lockedWeekly) || {})[currentWeekKey] || {}),
                                                                                [activeRg]: false
                                                                            }
                                                                        }
                                                                    }
                                                                }));
                                                            }
                                                            await setDoc(weekDocRef, cleanUndefined(updatePayload), { merge: true });
                                                        }}
                                                        className="px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                                                        title="Desbloquear expediente da semana para edição"
                                                    >
                                                        <Lock className="w-3.5 h-3.5" /> Desbloquear Semana
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Feedback Toast / Mensagem de Ação */}
                    {actionFeedback && (
                        <div className={cn(
                            "p-3 rounded-xl border-2 text-xs font-bold flex items-center justify-between gap-2 shadow-sm animate-in fade-in slide-in-from-top-2",
                            actionFeedback.type === 'success' ? "bg-emerald-50 border-emerald-300 text-emerald-900" : "bg-red-50 border-red-300 text-red-900"
                        )}>
                            <div className="flex items-center gap-2">
                                {actionFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                                <span>{actionFeedback.message}</span>
                            </div>
                            <button onClick={() => setActionFeedback(null)} className="p-1 hover:bg-black/5 rounded cursor-pointer">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Status da Solicitação do Militar para esta Semana */}
                    {userCurrentWeekRequest && (
                        <div className={cn(
                            "rounded-xl border-2 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm",
                            userCurrentWeekRequest.status === 'pending' ? "bg-amber-50 border-amber-300 text-amber-900" :
                            userCurrentWeekRequest.status === 'approved' ? "bg-emerald-50 border-emerald-300 text-emerald-900" :
                            "bg-red-50 border-red-300 text-red-900"
                        )}>
                            <div className="flex items-start gap-3">
                                <div className={cn(
                                    "p-2 rounded-lg text-white shrink-0 mt-0.5",
                                    userCurrentWeekRequest.status === 'pending' ? "bg-amber-500" :
                                    userCurrentWeekRequest.status === 'approved' ? "bg-emerald-600" :
                                    "bg-red-500"
                                )}>
                                    {userCurrentWeekRequest.status === 'pending' ? <Clock className="w-4 h-4" /> :
                                     userCurrentWeekRequest.status === 'approved' ? <CheckCircle2 className="w-4 h-4" /> :
                                     <AlertCircle className="w-4 h-4" />}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-black uppercase tracking-wider">
                                            {userCurrentWeekRequest.status === 'pending' ? 'Solicitação de Alteração em Análise' :
                                             userCurrentWeekRequest.status === 'approved' ? 'Solicitação de Alteração Aprovada' :
                                             'Solicitação de Alteração Recusada'}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-500">
                                            • {format(new Date(userCurrentWeekRequest.createdAt), "dd/MM/yyyy 'às' HH:mm")}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                        <span className="font-bold text-slate-600">Alterações solicitadas:</span>
                                        {userCurrentWeekRequest.changes.map((c, idx) => (
                                            <span key={idx} className="bg-white/80 border border-slate-200 px-2 py-0.5 rounded font-mono text-[10px] font-bold">
                                                {c.dayLabel}: <span className="uppercase text-slate-500">{c.currentStatus}</span> ➔ <span className="uppercase text-indigo-700 font-black">{c.proposedStatus}</span>
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-xs italic text-slate-600">
                                        Motivo: "{userCurrentWeekRequest.reason}"
                                    </p>
                                    {userCurrentWeekRequest.status === 'rejected' && userCurrentWeekRequest.rejectionReason && (
                                        <p className="text-xs font-bold text-red-700">
                                            Motivo da recusa: {userCurrentWeekRequest.rejectionReason}
                                        </p>
                                    )}
                                    {userCurrentWeekRequest.status === 'approved' && (
                                        <p className="text-xs font-bold text-emerald-700">
                                            ✓ Aprovado por {userCurrentWeekRequest.reviewedBy || 'Escalante'} {userCurrentWeekRequest.reviewedAt ? `em ${format(new Date(userCurrentWeekRequest.reviewedAt), "dd/MM/yyyy 'às' HH:mm")}` : ''}. Escala atualizada.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                {userCurrentWeekRequest.status === 'pending' ? (
                                    <button
                                        onClick={() => handleCancelWeeklyChange(userCurrentWeekRequest.id, userCurrentWeekRequest.weekKey)}
                                        className="px-3 py-1.5 rounded-lg border border-amber-400 bg-white hover:bg-amber-100 text-amber-900 font-bold text-xs transition-colors cursor-pointer"
                                    >
                                        Cancelar Solicitação
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleOpenWeeklyChangeModal}
                                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors cursor-pointer"
                                    >
                                        Nova Solicitação
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Painel do Escalante / Moderador: Gestão das Solicitações de Alteração */}
                    {(isAdmin || user.isEscalante) && allWeeklyChangeRequests.length > 0 && (
                        <div className="bg-white rounded-xl border-2 border-indigo-200 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-4 bg-indigo-50 border-b-2 border-indigo-100 flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <ArrowUpDown className="w-4 h-4 text-indigo-700" />
                                    <h3 className="font-black text-sm uppercase tracking-wider text-indigo-900">
                                        Solicitações de Alteração de Expediente da Semana
                                    </h3>
                                    {allWeeklyChangeRequests.filter(r => r.status === 'pending').length > 0 && (
                                        <span className="bg-amber-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                                            {allWeeklyChangeRequests.filter(r => r.status === 'pending').length} Pendente(s)
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    Semana {format(fullWeekDays[0], 'dd/MM')} a {format(fullWeekDays[6], 'dd/MM/yyyy')}
                                </span>
                            </div>

                            <div className="p-4 flex flex-col gap-3 max-h-[380px] overflow-y-auto">
                                {allWeeklyChangeRequests
                                    .filter(r => r.weekKey === currentWeekKey || r.status === 'pending')
                                    .map(req => (
                                        <div 
                                            key={req.id} 
                                            className={cn(
                                                "p-3.5 rounded-xl border-2 flex flex-col gap-2.5 transition-all",
                                                req.status === 'pending' ? "bg-amber-50/50 border-amber-200" :
                                                req.status === 'approved' ? "bg-emerald-50/40 border-emerald-200 opacity-90" :
                                                "bg-red-50/40 border-red-200 opacity-80"
                                            )}
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-slate-800">{req.userName}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">({req.rg})</span>
                                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                                                        Semana: {req.weekLabel}
                                                    </span>
                                                </div>
                                                <span className={cn(
                                                    "text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wider",
                                                    req.status === 'pending' ? "bg-amber-100 text-amber-800 border border-amber-300" :
                                                    req.status === 'approved' ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                                                    "bg-red-100 text-red-800 border border-red-300"
                                                )}>
                                                    {req.status === 'pending' ? 'Pendente de Aprovação' :
                                                     req.status === 'approved' ? 'Aprovado' : 'Recusado'}
                                                </span>
                                            </div>

                                            {/* Comparativo de dias alterados */}
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                {req.changes.map((c, i) => (
                                                    <div key={i} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1.5 px-2 text-[10px]">
                                                        <span className="font-bold text-slate-700">{c.dayLabel}:</span>
                                                        <span className="px-1.5 py-0.5 rounded uppercase font-black bg-slate-100 text-slate-500">{c.currentStatus}</span>
                                                        <span className="text-slate-400 font-bold">➔</span>
                                                        <span className={cn(
                                                            "px-1.5 py-0.5 rounded uppercase font-black",
                                                            c.proposedStatus === 'expediente' ? "bg-indigo-100 text-indigo-800" :
                                                            c.proposedStatus === 'servico' ? "bg-red-100 text-red-800" :
                                                            "bg-slate-200 text-slate-700"
                                                        )}>
                                                            {c.proposedStatus}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Motivo informado */}
                                            <div className="text-xs text-slate-600 bg-white/70 p-2 rounded-lg border border-slate-100">
                                                <span className="font-black text-slate-700">Justificativa: </span>
                                                <span className="italic">{req.reason}</span>
                                            </div>

                                            {/* Ações do Escalante */}
                                            {req.status === 'pending' ? (
                                                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/60">
                                                    <button
                                                        onClick={() => handleRejectWeeklyChange(req)}
                                                        className="px-3 py-1.5 rounded-lg border border-red-300 bg-white hover:bg-red-50 text-red-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5" /> Rejeitar
                                                    </button>
                                                    <button
                                                        onClick={() => handleApproveWeeklyChange(req)}
                                                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar Alteração
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-[10px] text-slate-400 font-bold text-right">
                                                    {req.reviewedBy && `Avaliado por ${req.reviewedBy}`}
                                                    {req.reviewedAt && ` em ${format(new Date(req.reviewedAt), "dd/MM/yyyy HH:mm")}`}
                                                    {req.rejectionReason && ` • Motivo: ${req.rejectionReason}`}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Grade ou Lista Semanal de Dias */}
                    {(() => {
                        const displayedDays = weeklyFilterDays === 'all' ? fullWeekDays : weekDays;

                        return (
                            <div className="flex flex-col gap-3">
                                {/* Barra Superior com título e botão de alternância de visualização */}
                                <div className="flex items-center justify-between flex-wrap gap-2 pt-1 pb-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                            Dias da Semana
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                                            {weeklyLayoutMode === 'list' ? 'Visualização em Linhas (Celular)' : 'Visualização em Grade'}
                                        </span>
                                    </div>

                                    {/* Botão de Alternar Forma de Visualização no topo dos dias */}
                                    <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleWeeklyLayoutMode('grid')}
                                            className={cn(
                                                "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                                                weeklyLayoutMode === 'grid' ? "bg-white text-indigo-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
                                            )}
                                            title="Visualizar em Grade (Cards)"
                                        >
                                            <LayoutGrid className="w-3 h-3" />
                                            <span>Grade</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleWeeklyLayoutMode('list')}
                                            className={cn(
                                                "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                                                weeklyLayoutMode === 'list' ? "bg-white text-indigo-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
                                            )}
                                            title="Visualizar em Linhas / Lista Compacta (Estilo Celular e Modal)"
                                        >
                                            <List className="w-3 h-3" />
                                            <span>Lista {weeklyLayoutMode === 'list' ? '(Ativo)' : ''}</span>
                                        </button>
                                    </div>
                                </div>

                                {weeklyLayoutMode === 'list' ? (
                                    /* MODO LISTA / LINHAS (Estilo Popup Modal de Solicitar Alteração) */
                                    <div className="flex flex-col gap-2.5">
                                        {displayedDays.map(day => {
                                            const dayStr = format(day, 'yyyy-MM-dd');
                                            const dayMonthKey = dayStr.substring(0, 7);
                                            const dataSource = dayMonthKey === monthKey ? data : (extraMonthData[dayMonthKey] || {});
                                            const isToday = isSameDay(day, new Date());
                                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                            const alaOfDay = getAlaForDate(day);
                                            const alaColor = getAlaColor(alaOfDay);

                                            const dayStatus = getDayStatus(activeRg, dayStr);
                                            const isPreferred = safeArr(dataSource.selections?.['ESCALANTE_PREF']).includes(dayStr);
                                            const prefDetails = (dataSource.preferencesDetails?.[dayStr] || {}) as Record<string, number>;
                                            const totalVagas = Object.values(prefDetails).reduce((sum: number, q: number) => sum + Number(q || 0), 0);

                                            const { servicoList, expedienteList } = getWorkersForDay(dayStr);
                                            const dayDate = new Date(`${dayStr}T12:00:00`);
                                            const dayMonday = startOfWeek(dayDate, { weekStartsOn: 1 });
                                            const isWeekLocked = isWeeklyLockedForUser(activeRg, dayMonday);
                                            const isOrd24hLocked = isOrdinarioLockedForUser(activeRg, dayMonthKey);
                                            const isDay24hLocked = (isOrd24hLocked && dayStatus.type === 'servico') || Boolean(dayStatus.isPermuta);
                                            const canEdit = (isAdmin || user.isEscalante || (!isWeekLocked && !isDay24hLocked && activeRg === (user.rg || user.uid))) && dayStatus.type !== 'afastamento';
                                            const isExpandedDetails = !!expandedDaysList[dayStr];
                                            const hasPermutaForDay = Boolean(dayStatus.isPermuta || (isDay24hLocked && checkDayHasPermuta(activeRg, dayStr, dataSource)));

                                            return (
                                                <div
                                                    key={dayStr}
                                                    className={cn(
                                                        "rounded-xl border-2 transition-all p-3 sm:p-3.5 bg-white shadow-2xs flex flex-col gap-2",
                                                        dayStatus.type === 'expediente' && "border-indigo-300 bg-indigo-50/20",
                                                        dayStatus.type === 'servico' && "border-red-300 bg-red-50/20",
                                                        dayStatus.type === 'folga' && "border-slate-200 hover:border-slate-300",
                                                        dayStatus.type === 'afastamento' && "border-orange-300 bg-orange-50/50",
                                                        isToday && "ring-2 ring-indigo-600 ring-offset-1"
                                                    )}
                                                >
                                                    {/* Linha Principal: Dia, Status Atual e Botões Rápidos */}
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {/* Ala Badge */}
                                                            <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-black text-slate-600 shrink-0">
                                                                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", alaColor)} />
                                                                <span>Ala {alaOfDay}</span>
                                                            </div>

                                                            {/* Nome do Dia e Data */}
                                                            <span className={cn(
                                                                "text-xs sm:text-sm font-black capitalize text-slate-800 tracking-tight min-w-[130px]",
                                                                isWeekend && "text-amber-800"
                                                            )}>
                                                                {format(day, 'EEEE', { locale: ptBR })} ({format(day, 'dd/MM')})
                                                            </span>

                                                            {/* Badges de Hoje / FDS */}
                                                            {isToday && (
                                                                <span className="text-[8px] font-black uppercase tracking-widest bg-indigo-600 text-white px-1.5 py-0.5 rounded">
                                                                    Hoje
                                                                </span>
                                                            )}
                                                            {isWeekend && !isToday && (
                                                                <span className="text-[8px] font-bold uppercase tracking-widest bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                                                    FDS
                                                                </span>
                                                            )}

                                                            {/* Badge de Status Atual (Estilo Modal de Solicitação) */}
                                                            <span className={cn(
                                                                "text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs",
                                                                dayStatus.isPermuta && dayStatus.type === 'servico' ? "bg-purple-100 text-purple-800 border border-purple-200" :
                                                                dayStatus.type === 'expediente' ? "bg-indigo-100 text-indigo-700 border border-indigo-200" :
                                                                dayStatus.type === 'servico' ? "bg-red-100 text-red-700 border border-red-200" :
                                                                dayStatus.type === 'afastamento' ? "bg-orange-100 text-orange-700 border border-orange-200" :
                                                                "bg-slate-200 text-slate-700 border border-slate-300"
                                                            )}>
                                                                {dayStatus.isPermuta && dayStatus.type === 'servico' ? <Shield className="w-3 h-3 text-purple-600" /> :
                                                                 dayStatus.type === 'expediente' ? <Briefcase className="w-3 h-3 text-indigo-600" /> :
                                                                 dayStatus.type === 'servico' ? <Shield className="w-3 h-3 text-red-600" /> :
                                                                 dayStatus.type === 'folga' ? <Coffee className="w-3 h-3 text-slate-500" /> :
                                                                 <AlertCircle className="w-3 h-3 text-orange-600" />}
                                                                Atual: {dayStatus.isPermuta && dayStatus.type === 'servico' ? 'SV (PERMUTA)' : dayStatus.type === 'expediente' ? 'EXP' : dayStatus.type === 'servico' ? 'SV' : dayStatus.type === 'afastamento' ? 'AFASTADO' : 'FOLGA'}
                                                            </span>

                                                            {/* 24h Homologado se aplicável (visível no cabeçalho quando admin/escalante para evitar duplicidade com o botão da direita) */}
                                                            {isDay24hLocked && (isAdmin || user.isEscalante) && (
                                                                <span className={cn(
                                                                    "text-[9px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-1 border",
                                                                    hasPermutaForDay ? "text-purple-800 bg-purple-100 border-purple-200" : "text-red-700 bg-red-100 border-red-200"
                                                                )}>
                                                                    <Lock className="w-2.5 h-2.5" /> {hasPermutaForDay ? "S.24h Homologado (Permuta)" : "S.24h Mensal Homologado"}
                                                                </span>
                                                            )}

                                                            {/* Vaga prioritária se aplicável */}
                                                            {isPreferred && (
                                                                <span className="text-[9px] font-black text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded flex items-center gap-1" title="Vagas prioritárias do dia">
                                                                    ★ Prioritária {totalVagas > 0 && `(${totalVagas})`}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Botões Rápidos: EXP, SV, FOLGA ou Botão de Solicitar Alteração */}
                                                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                                            {canEdit ? (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleSetWeeklyDayStatus(activeRg, dayStr, 'expediente')}
                                                                        className={cn(
                                                                            "px-3 sm:px-3.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1",
                                                                            dayStatus.type === 'expediente'
                                                                                ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400"
                                                                                : "bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300"
                                                                        )}
                                                                        title="Marcar como Expediente"
                                                                    >
                                                                        {dayStatus.type === 'expediente' && <Check className="w-3 h-3" />}
                                                                        EXP
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (isOrd24hLocked && !isAdmin && !user.isEscalante) {
                                                                                alert("A escala ordinária (24h) deste mês já está fechada. Apenas o Escalante pode alterar serviços operacionais de 24h.");
                                                                                return;
                                                                            }
                                                                            handleSetWeeklyDayStatus(activeRg, dayStr, 'servico');
                                                                        }}
                                                                        className={cn(
                                                                            "px-3 sm:px-3.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1",
                                                                            dayStatus.type === 'servico'
                                                                                ? "bg-red-600 text-white shadow-sm ring-2 ring-red-400"
                                                                                : isOrd24hLocked && !isAdmin && !user.isEscalante
                                                                                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
                                                                                    : "bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                                                                        )}
                                                                        title={isOrd24hLocked && !isAdmin && !user.isEscalante ? "Escala 24h fechada" : "Marcar como Serviço 24h"}
                                                                    >
                                                                        {dayStatus.type === 'servico' && <Check className="w-3 h-3" />}
                                                                        SV
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleSetWeeklyDayStatus(activeRg, dayStr, 'folga')}
                                                                        className={cn(
                                                                            "px-3 sm:px-3.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1",
                                                                            dayStatus.type === 'folga'
                                                                                ? "bg-slate-700 text-white shadow-sm ring-2 ring-slate-400"
                                                                                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                                                                        )}
                                                                        title="Marcar como Folga"
                                                                    >
                                                                        {dayStatus.type === 'folga' && <Check className="w-3 h-3" />}
                                                                        FOLGA
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5">
                                                                    {isDay24hLocked && !isAdmin && !user.isEscalante ? (
                                                                        <div 
                                                                            className={cn(
                                                                                "py-1 px-2.5 rounded-lg text-[10px] font-black flex items-center gap-1 shadow-2xs",
                                                                                hasPermutaForDay 
                                                                                    ? "bg-purple-50 border border-purple-200 text-purple-700" 
                                                                                    : "bg-red-50 border border-red-200 text-red-700"
                                                                            )}
                                                                            title={hasPermutaForDay ? "Serviço 24h assumido via Permuta Homologada" : "Serviço 24h Ordinário escolhido no Calendário Mensal e Homologado"}
                                                                        >
                                                                            <Shield className={cn("w-3 h-3 shrink-0", hasPermutaForDay ? "text-purple-600" : "text-red-600")} />
                                                                            <span>{hasPermutaForDay ? "S.24h Homologado (Permuta)" : "S.24h Mensal Homologado"}</span>
                                                                        </div>
                                                                    ) : isWeekLocked && !isAdmin && !user.isEscalante ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={handleOpenWeeklyChangeModal}
                                                                            className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                                                                            title="Solicitar alteração desta semana ao escalante"
                                                                        >
                                                                            <ArrowUpDown className="w-3.5 h-3.5" />
                                                                            <span>Solicitar Alteração</span>
                                                                        </button>
                                                                    ) : (
                                                                        dayStatus.type === 'afastamento' && (
                                                                            <div className="py-1 px-2.5 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 text-[10px] font-black flex items-center gap-1">
                                                                                <AlertCircle className="w-3 h-3 text-orange-600 shrink-0" />
                                                                                <span>Afastamento</span>
                                                                            </div>
                                                                        )
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Detalhes Expansíveis: Efetivo no Dia & Vagas Prioritárias */}
                                                    {(servicoList.length > 0 || expedienteList.length > 0 || isPreferred) && (
                                                        <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                                                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setExpandedDaysList(prev => ({ ...prev, [dayStr]: !prev[dayStr] }))}
                                                                    className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 font-black cursor-pointer transition-colors"
                                                                >
                                                                    <span className="text-[9px] uppercase tracking-wider">Efetivo Escalado ({servicoList.length + expedienteList.length}):</span>
                                                                    <span className="text-red-700 font-bold">{servicoList.length} SV</span>
                                                                    <span>•</span>
                                                                    <span className="text-indigo-700 font-bold">{expedienteList.length} EXP</span>
                                                                    <ChevronDown className={cn("w-3 h-3 transition-transform text-slate-400", isExpandedDetails && "rotate-180")} />
                                                                </button>

                                                                {isPreferred && totalVagas > 0 && (
                                                                    <span className="text-[9px] font-bold text-red-600 flex items-center gap-1">
                                                                        ★ {totalVagas} vaga(s) necessária(s)
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {isExpandedDetails && (
                                                                <div className="flex flex-col gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 animate-in fade-in">
                                                                    {servicoList.length > 0 && (
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <span className="text-[8px] font-black uppercase text-red-600 shrink-0">Serviço:</span>
                                                                            {servicoList.map((w, idx) => (
                                                                                <span key={idx} className="bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded text-[8px] font-bold">
                                                                                    {w.isGrd && '🛡️ '}{w.name}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    {expedienteList.length > 0 && (
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <span className="text-[8px] font-black uppercase text-indigo-600 shrink-0">Expediente:</span>
                                                                            {expedienteList.map((w, idx) => (
                                                                                <span key={idx} className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded text-[8px] font-bold">
                                                                                    {w.name}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    {isPreferred && Object.keys(prefDetails).length > 0 && (
                                                                        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200/60">
                                                                            <span className="text-[8px] font-black uppercase text-red-700 shrink-0">Vagas Prioritárias:</span>
                                                                            {Object.entries(prefDetails).map(([func, qtRaw]) => {
                                                                                const qt = typeof qtRaw === 'number' ? qtRaw : Number(qtRaw || 1);
                                                                                return (
                                                                                    <span key={func} className="bg-red-100/80 text-red-800 border border-red-200 px-1.5 py-0.5 rounded text-[8px] font-bold">
                                                                                        ★ {qt}x {func}
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    /* MODO GRADE / CARDS CLÁSSICO */
                                    <div className={cn(
                                        "grid gap-4",
                                        weeklyFilterDays === 'all' 
                                            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7" 
                                            : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
                                    )}>
                                        {displayedDays.map(day => {
                                            const dayStr = format(day, 'yyyy-MM-dd');
                                            const dayMonthKey = dayStr.substring(0, 7);
                                            const dataSource = dayMonthKey === monthKey ? data : (extraMonthData[dayMonthKey] || {});
                                            const isToday = isSameDay(day, new Date());
                                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                            const alaOfDay = getAlaForDate(day);
                                            const alaColor = getAlaColor(alaOfDay);

                                            const dayStatus = getDayStatus(activeRg, dayStr);
                                            const isPreferred = safeArr(dataSource.selections?.['ESCALANTE_PREF']).includes(dayStr);
                                            const prefDetails = (dataSource.preferencesDetails?.[dayStr] || {}) as Record<string, number>;
                                            const totalVagas = Object.values(prefDetails).reduce((sum: number, q: number) => sum + Number(q || 0), 0);

                                            const { servicoList, expedienteList } = getWorkersForDay(dayStr);
                                            const dayDate = new Date(`${dayStr}T12:00:00`);
                                            const dayMonday = startOfWeek(dayDate, { weekStartsOn: 1 });
                                            const isWeekLocked = isWeeklyLockedForUser(activeRg, dayMonday);
                                            const isOrd24hLocked = isOrdinarioLockedForUser(activeRg, dayMonthKey);
                                            const isDay24hLocked = isOrd24hLocked && dayStatus.type === 'servico';
                                            const canEdit = (isAdmin || user.isEscalante || (!isWeekLocked && !isDay24hLocked && activeRg === (user.rg || user.uid))) && dayStatus.type !== 'afastamento';
                                            const hasPermutaForDay = isDay24hLocked && checkDayHasPermuta(activeRg, dayStr, dataSource);

                                            return (
                                                <div
                                                    key={dayStr}
                                                    onClick={() => {
                                                        if (canEdit) {
                                                            handleSetWeeklyDayStatus(activeRg, dayStr, 'cycle');
                                                        } else if (isDay24hLocked && !isAdmin && !user.isEscalante) {
                                                            if (hasPermutaForDay) {
                                                                alert("Este dia é um Serviço (24h) homologado via Permuta. Não pode ser alterado diretamente.");
                                                            } else {
                                                                alert("Este dia é um S.24h Mensal Homologado. Para trocá-lo, utilize a solicitação de Permuta de Serviço.");
                                                            }
                                                        } else if (isWeekLocked && !isAdmin && !user.isEscalante) {
                                                            alert("O expediente desta semana já foi confirmado e está bloqueado.");
                                                        }
                                                    }}
                                                    className={cn(
                                                        "relative flex flex-col rounded-xl border-2 transition-all p-3.5 select-none bg-white",
                                                        canEdit ? "cursor-pointer hover:shadow-md" : "cursor-default",
                                                        dayStatus.type === 'expediente' && "border-indigo-400 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-300",
                                                        dayStatus.type === 'servico' && "border-red-400 bg-red-50/50 shadow-sm ring-1 ring-red-300",
                                                        dayStatus.type === 'folga' && "border-slate-200 hover:border-slate-300",
                                                        dayStatus.type === 'afastamento' && "border-orange-300 bg-orange-50/60 opacity-90",
                                                        isToday && "ring-2 ring-indigo-600 ring-offset-2"
                                                    )}
                                                >
                                                    {/* Cabeçalho do Dia */}
                                                    <div className="flex items-start justify-between gap-1.5 pb-2 border-b border-slate-100">
                                                        <div className="flex flex-col">
                                                            <span className={cn(
                                                                "text-[10px] font-black uppercase tracking-wider",
                                                                isWeekend ? "text-amber-700" : "text-slate-500"
                                                            )}>
                                                                {format(day, 'EEEE', { locale: ptBR }).split('-')[0]}
                                                            </span>
                                                            <div className="flex items-baseline gap-1 mt-0.5">
                                                                <span className={cn(
                                                                    "text-xl font-black leading-none",
                                                                    dayStatus.type === 'expediente' ? "text-indigo-900" : dayStatus.type === 'servico' ? "text-red-900" : "text-slate-800"
                                                                )}>
                                                                    {format(day, 'dd')}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                                    {format(day, 'MMM', { locale: ptBR })}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col items-end gap-1">
                                                            {/* Ala badge */}
                                                            <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-black text-slate-600">
                                                                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", alaColor)} />
                                                                <span>Ala {alaOfDay}</span>
                                                            </div>

                                                            {/* Tags: Hoje / Fim de Semana */}
                                                            {isToday && (
                                                                <span className="text-[8px] font-black uppercase tracking-widest bg-indigo-600 text-white px-1.5 py-0.5 rounded">
                                                                    Hoje
                                                                </span>
                                                            )}
                                                            {isWeekend && !isToday && (
                                                                <span className="text-[8px] font-bold uppercase tracking-widest bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                                                    FDS
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Vagas Preferenciais se houver */}
                                                    {isPreferred && (
                                                        <div className="my-2 bg-red-100/70 border border-red-200 rounded-lg p-1.5 flex flex-col gap-1">
                                                            <span className="text-[9px] font-black text-red-700 uppercase tracking-widest flex items-center gap-1">
                                                                ★ Vaga Prioritária {totalVagas > 0 && `(${totalVagas})`}
                                                            </span>
                                                            {Object.entries(prefDetails).length > 0 && (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {Object.entries(prefDetails).map(([func, qtRaw]) => {
                                                                        const qt = typeof qtRaw === 'number' ? qtRaw : Number(qtRaw || 1);
                                                                        const parsedFunc = formatPreferenceFunction(func, qt);
                                                                        return (
                                                                            <span key={func} className="text-[8px] font-bold bg-white text-red-800 px-1.5 py-0.5 rounded border border-red-200 flex flex-col min-w-0" title={`${qt}x ${func}`}>
                                                                                <span className="text-[7.5px] text-red-600 font-bold truncate leading-tight">{parsedFunc.line1}</span>
                                                                                <span className="text-[9px] text-red-950 font-black truncate leading-tight">{parsedFunc.line2}</span>
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Status Atual do Militar */}
                                                    <div className="my-3 flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-colors min-h-[70px] bg-slate-50/50">
                                                        {dayStatus.type === 'expediente' ? (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <div className="flex items-center gap-1.5 text-indigo-700 font-black text-xs uppercase tracking-wider">
                                                                    <Briefcase className="w-3.5 h-3.5" /> EXPEDIENTE
                                                                </div>
                                                                <span className="text-[9px] font-bold text-indigo-500">08h às 17h</span>
                                                            </div>
                                                        ) : dayStatus.type === 'servico' ? (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <div className="flex items-center gap-1.5 text-red-700 font-black text-xs uppercase tracking-wider">
                                                                    <Shield className="w-3.5 h-3.5 text-red-600" /> SERVIÇO 24H
                                                                </div>
                                                                <span className="text-[9px] font-bold text-red-500">09h às 09h</span>
                                                                {isOrd24hLocked && (isAdmin || user.isEscalante) && (
                                                                    <span className="text-[8px] font-black uppercase text-red-700 bg-red-100 px-1.5 py-0.5 rounded border border-red-200 flex items-center gap-1 mt-0.5">
                                                                        <Lock className="w-2.5 h-2.5" /> {hasPermutaForDay ? "S.24h Homologado (Permuta)" : "S.24h Mensal Homologado"}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : dayStatus.type === 'afastamento' ? (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <div className="flex items-center gap-1.5 text-orange-700 font-black text-xs uppercase tracking-wider">
                                                                    <AlertCircle className="w-3.5 h-3.5" /> {dayStatus.text}
                                                                </div>
                                                                <span className="text-[9px] font-bold text-orange-600">Afastamento</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <div className="flex items-center gap-1.5 text-slate-500 font-black text-xs uppercase tracking-wider">
                                                                    <Coffee className="w-3.5 h-3.5 text-slate-400" /> FOLGA
                                                                </div>
                                                                <span className="text-[9px] font-bold text-slate-400">Sem escala</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Controles Rápidos: Botões EXP / SV / FOLGA ou aviso de bloqueio */}
                                                    {canEdit ? (
                                                        <div 
                                                            className="grid grid-cols-3 gap-1 mb-3 pt-1 border-t border-slate-100"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <button
                                                                onClick={() => handleSetWeeklyDayStatus(activeRg, dayStr, 'expediente')}
                                                                className={cn(
                                                                    "py-1.5 px-1 rounded text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-0.5 transition-colors cursor-pointer",
                                                                    dayStatus.type === 'expediente'
                                                                        ? "bg-indigo-600 text-white shadow-sm"
                                                                        : "bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                                                                )}
                                                                title="Marcar como Expediente"
                                                            >
                                                                {dayStatus.type === 'expediente' && <Check className="w-2.5 h-2.5" />} EXP
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (isOrd24hLocked && !isAdmin && !user.isEscalante) {
                                                                        alert("A escala ordinária (24h) deste mês já está fechada. Apenas o Escalante pode alterar serviços operacionais de 24h.");
                                                                        return;
                                                                    }
                                                                    handleSetWeeklyDayStatus(activeRg, dayStr, 'servico');
                                                                }}
                                                                className={cn(
                                                                    "py-1.5 px-1 rounded text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-0.5 transition-colors cursor-pointer",
                                                                    dayStatus.type === 'servico'
                                                                        ? "bg-red-600 text-white shadow-sm"
                                                                        : isOrd24hLocked && !isAdmin && !user.isEscalante
                                                                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                                            : "bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700"
                                                                )}
                                                                title={isOrd24hLocked && !isAdmin && !user.isEscalante ? "Escala 24h fechada" : "Marcar como Serviço"}
                                                            >
                                                                {dayStatus.type === 'servico' && <Check className="w-2.5 h-2.5" />} SV
                                                            </button>
                                                            <button
                                                                onClick={() => handleSetWeeklyDayStatus(activeRg, dayStr, 'folga')}
                                                                className={cn(
                                                                    "py-1.5 px-1 rounded text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-0.5 transition-colors cursor-pointer",
                                                                    dayStatus.type === 'folga'
                                                                        ? "bg-slate-700 text-white shadow-sm"
                                                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                                )}
                                                                title="Marcar como Folga"
                                                            >
                                                                {dayStatus.type === 'folga' && <Check className="w-2.5 h-2.5" />} FOLGA
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="mb-3 pt-1 border-t border-slate-100 text-center text-[9px] font-bold">
                                                            {isDay24hLocked && !isAdmin && !user.isEscalante ? (
                                                                <div 
                                                                    className={cn(
                                                                        "py-1 px-1.5 rounded text-[9px] font-black flex items-center justify-center gap-1 shadow-2xs",
                                                                        hasPermutaForDay 
                                                                            ? "bg-purple-50 border border-purple-200 text-purple-700" 
                                                                            : "bg-red-50 border border-red-200 text-red-700"
                                                                    )}
                                                                    title={hasPermutaForDay ? "Serviço 24h assumido via Permuta Homologada" : "Serviço 24h Ordinário escolhido no Calendário Mensal e Homologado"}
                                                                >
                                                                    <Shield className={cn("w-3 h-3 shrink-0", hasPermutaForDay ? "text-purple-600" : "text-red-600")} />
                                                                    <span>{hasPermutaForDay ? "S.24h Homologado (Permuta)" : "S.24h Mensal Homologado"}</span>
                                                                </div>
                                                            ) : isWeekLocked && !isAdmin && !user.isEscalante ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleOpenWeeklyChangeModal();
                                                                    }}
                                                                    className="w-full py-1 px-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded text-amber-800 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                                                    title="Clique para solicitar alteração desta semana ao escalante"
                                                                >
                                                                    <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                                                                    <span>Semana Homologada (Solicitar)</span>
                                                                </button>
                                                            ) : (
                                                                dayStatus.type === 'afastamento' && (
                                                                    <div className="py-1 px-1.5 bg-orange-50 border border-orange-200 rounded text-orange-700 flex items-center justify-center gap-1">
                                                                        <AlertCircle className="w-3 h-3 text-orange-600 shrink-0" />
                                                                        <span>Afastamento</span>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Efetivo Escalado neste dia */}
                                                    <div 
                                                        className="mt-auto pt-2 border-t border-slate-100 flex flex-col gap-1 text-[9px]"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <div className="flex items-center justify-between text-slate-400 font-bold uppercase tracking-widest text-[8px]">
                                                            <span>Efetivo no Dia</span>
                                                            <span>{servicoList.length + expedienteList.length}</span>
                                                        </div>

                                                        {servicoList.length > 0 && (
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="font-black text-red-600 uppercase text-[8px]">
                                                                    Serviço ({servicoList.length}):
                                                                </span>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {servicoList.slice(0, 3).map((w, idx) => (
                                                                        <span 
                                                                            key={idx} 
                                                                            className="bg-red-50 text-red-700 border border-red-200 px-1 py-0.5 rounded font-bold text-[8px] truncate max-w-full"
                                                                            title={w.name}
                                                                        >
                                                                            {w.isGrd && '🛡️ '}{w.name}
                                                                        </span>
                                                                    ))}
                                                                    {servicoList.length > 3 && (
                                                                        <span className="text-[8px] font-black text-slate-400 self-center">
                                                                            +{servicoList.length - 3}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {expedienteList.length > 0 && (
                                                            <div className="flex flex-col gap-0.5 mt-0.5">
                                                                <span className="font-black text-indigo-600 uppercase text-[8px]">
                                                                    Expediente ({expedienteList.length}):
                                                                </span>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {expedienteList.slice(0, 3).map((w, idx) => (
                                                                        <span 
                                                                            key={idx} 
                                                                            className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-1 py-0.5 rounded font-bold text-[8px] truncate max-w-full"
                                                                            title={w.name}
                                                                        >
                                                                            {w.name}
                                                                        </span>
                                                                    ))}
                                                                    {expedienteList.length > 3 && (
                                                                        <span className="text-[8px] font-black text-slate-400 self-center">
                                                                            +{expedienteList.length - 3}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {servicoList.length === 0 && expedienteList.length === 0 && (
                                                            <span className="text-slate-400 italic text-[8px]">Nenhum militar registrado</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
           ) : (
                <div className="flex flex-col lg:flex-row gap-6">
                 {/* Calendar Column */}
                 <div className="flex-1 bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-2 sm:p-4 flex-1 flex flex-col overflow-y-auto sm:overflow-visible bg-slate-50 sm:bg-transparent">
                     <div className="flex flex-col flex-1 pb-1">
                      {(() => {
                          const preferredDays = currentMonthDays.filter(day => {
                              const dayStr = format(day, 'yyyy-MM-dd');
                              const isPreferred = safeArr(data.selections['ESCALANTE_PREF']).includes(dayStr);
                              if (!isPreferred) return false;
                              const details = data.preferencesDetails?.[dayStr] || {};
                              const totalVagas = Object.values(details).reduce((sum, qt) => sum + qt, 0);
                              return totalVagas > 0;
                          });
                          
                          if (preferredDays.length === 0) return null;
                          
                          return (
                              <div className="mb-4">
                                  <div className="flex items-center justify-between mb-2">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                          <AlertCircle className="w-3 h-3 text-red-500" /> Vagas Preferenciais
                                      </span>
                                      {(isAdmin || user.isEscalante) && (
                                         <button 
                                            onClick={() => setViewMode('necessidades')}
                                            className="text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors"
                                          >
                                              Ver Detalhes
                                          </button>
                                      )}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {preferredDays.map(day => {
                                        const dayStr = format(day, 'yyyy-MM-dd');
                                        const details = data.preferencesDetails?.[dayStr] || {};
                                        const totalVagas = Object.values(details).reduce((sum, qt) => sum + qt, 0);
                                        return (
                                            <button 
                                                key={dayStr}
                                                onClick={() => handleToggleDay(day)}
                                                className="relative flex flex-col items-center justify-center p-2 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 transition-colors py-2 px-3 min-w-[54px] sm:min-w-[64px]"
                                            >
                                                <span className="text-sm font-black text-red-800 leading-none mb-0.5">{format(day, 'dd')}</span>
                                                <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest leading-none">{format(day, 'MMM', {locale: ptBR})}</span>
                                                <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                                    {totalVagas}
                                                </div>
                                            </button>
                                        );
                                    })}
                                  </div>
                              </div>
                          );
                      })()}
                      <div className="hidden sm:grid grid-cols-7 mb-2 px-1 text-center">
                        {weekdays.map((wd) => (
                          <div key={wd} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {wd}
                          </div>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 sm:gap-2 flex-1">
                        {days.map((day) => {
                          const dayStr = format(day, 'yyyy-MM-dd');
                          const outsideMonth = !isSameMonth(day, currentMonth);
                          const isToday = isSameDay(day, new Date());
                          const isTargetUserSelected = activeRg && safeArr(data.selections[activeRg]).includes(dayStr);
                          const isPreferredDate = safeArr(data.selections['ESCALANTE_PREF']).includes(dayStr);
                          const isGrd = activeRg && data.grdData?.[dayStr]?.includes(activeRg);
                          
                          // Let's identify who is working this day (for all expedientes) to show on map
                          const workersOnThisDay = Object.entries(data.selections)
                            .filter(([rg, sels]: [string, any]) => rg !== 'ESCALANTE_PREF' && Array.isArray(sels) && sels.includes(dayStr))
                            .map(([rg, _]) => {
                               const found = expedienteUsers.find(u => (u.rg || u.uid) === rg);
                               const parsed = splitMilitaryRankAndWarName(found, data.userNames?.[rg]);
                               return {
                                 rg,
                                 rank: parsed.rank,
                                 name: parsed.name,
                                 fullName: found?.name || data.userNames?.[rg] || `${parsed.rank} ${parsed.name}`.trim(),
                                 isGrd: !!(data.grdData?.[dayStr]?.includes(rg))
                               };
                            });

                          const expWorkersOnThisDay = Object.entries(data.expedienteDays || {})
                            .filter(([rg, sels]: [string, any]) => rg !== 'ESCALANTE_PREF' && Array.isArray(sels) && sels.includes(dayStr))
                            .map(([rg, _]) => {
                               const found = expedienteUsers.find(u => u.rg === rg);
                               if (found) {
                                  return {
                                    name: found.rank ? `${found.rank} ${found.warName || found.name.split(' ')[0]}` : found.name,
                                    isGrd: data.grdData?.[dayStr]?.includes(rg)
                                  };
                               }
                               return null;
                            }).filter(Boolean) as { name: string, isGrd: boolean }[];
                          
                          const alaOfDay = getAlaForDate(day);
                          const alaLightColorClass = getAlaLightColor(alaOfDay);
                          const alaPointColorClass = getAlaColor(alaOfDay);
                          
                          return (
                            <motion.div 
                              key={day.toISOString()}
                              whileHover={!outsideMonth ? { scale: 1.02 } : {}}
                              onClick={() => !outsideMonth && handleToggleDay(day)}
                              className={cn(
                                "relative flex flex-col p-3 sm:p-2 border-2 rounded-xl sm:rounded-lg transition-all sm:min-h-[120px]",
                                outsideMonth 
                                  ? "hidden sm:flex opacity-30 bg-slate-50 border-transparent cursor-default pointer-events-none text-slate-400" 
                                  : isPreferredDate && !isTargetUserSelected ? "border-red-200 cursor-pointer bg-red-50 hover:border-red-300 shadow-sm sm:shadow-none"
                                  : isTargetUserSelected ? "bg-indigo-50 border-indigo-500 shadow-md sm:shadow-sm" 
                                  : cn(alaLightColorClass, "cursor-pointer hover:border-indigo-300 shadow-sm sm:shadow-none"),
                                isToday && !outsideMonth && "ring-2 ring-indigo-500 ring-offset-2"
                              )}
                            >
                               <div className="flex justify-between items-center sm:items-start mb-2 sm:mb-1.5">
                                   <div className="flex items-center gap-2 border-b-0 pb-0">
                                       {isGrd && <Shield className="w-5 h-5 sm:w-4 sm:h-4 text-emerald-600 fill-emerald-100" />}
                                       <span className={cn(
                                          "text-base sm:text-sm font-black text-slate-700",
                                          isTargetUserSelected && "text-indigo-700",
                                          isPreferredDate && !isTargetUserSelected && "text-red-700"
                                       )}>
                                          {format(day, 'd')}
                                       </span>
                                       {!outsideMonth && (
                                           <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", alaPointColorClass)} title={`Ala ${alaOfDay}`} />
                                       )}
                                       <span className="text-[11px] font-black text-slate-400 sm:hidden uppercase tracking-widest">
                                          {format(day, 'EEEE', {locale: ptBR}).split('-')[0]}
                                       </span>
                                   </div>
                                   {!outsideMonth && (
                                       <span className="text-[18px] sm:text-[14px] leading-none text-red-500">
                                            {isPreferredDate && "★"}
                                       </span>
                                   )}
                               </div>
                               
                               {!outsideMonth && (
                                  <div className="flex flex-col gap-2 sm:gap-1.5 mt-1 sm:mt-auto">
                                      {(safeArr(data.selections['ESCALANTE_PREF']).includes(dayStr)) && Object.entries(data.preferencesDetails?.[dayStr] || {}).length > 0 && (
                                          <div className="flex flex-col gap-1.5 sm:gap-1 w-full min-w-0">
                                               {Object.entries(data.preferencesDetails?.[dayStr] || {}).map(([func, qtRaw]) => {
                                                  const qt = typeof qtRaw === "number" ? qtRaw : Number(qtRaw || 1);
                                                  const parsedFunc = formatPreferenceFunction(func, qt);
                                                  return (
                                                    <span 
                                                       key={func} 
                                                       className="w-full text-left bg-red-100/90 text-red-800 border border-red-200/90 px-2 py-1 sm:px-1.5 sm:py-1 rounded-md uppercase cursor-help max-w-full flex flex-col justify-center shadow-xs transition-colors hover:bg-red-200/80" 
                                                       title={`${qt}x ${func}`}
                                                    >
                                                       <span className="flex items-center gap-1 text-[8px] sm:text-[7.5px] font-bold text-red-700 leading-tight truncate">
                                                         <span className="truncate">{parsedFunc.line1}</span>
                                                       </span>
                                                       <span className="text-[10px] sm:text-[9.5px] font-black text-red-950 leading-tight truncate tracking-tight mt-0.5">
                                                         {parsedFunc.line2}
                                                       </span>
                                                    </span>
                                                  );
                                               })}
                                          </div>
                                      )}

                                      {workersOnThisDay.length > 0 && (
                                          <div className="flex flex-col gap-1.5 sm:gap-1 sm:mt-1 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0 w-full min-w-0">
                                              {workersOnThisDay.map((w, i) => (
                                                 <span 
                                                    key={i} 
                                                    className={cn(
                                                        "w-full text-left bg-slate-800 text-white px-2 py-1 sm:px-1.5 sm:py-1 rounded-md uppercase cursor-help max-w-full flex flex-col justify-center shadow-xs transition-all hover:bg-slate-900 border border-slate-700/60 hover:border-slate-500",
                                                        i >= 5 ? "hidden" : ""
                                                    )} 
                                                    title={`${w.rank ? w.rank + ' ' : ''}${w.fullName || w.name}`}
                                                 >
                                                    {w.rank ? (
                                                      <>
                                                        <span className="flex items-center gap-1 text-[8px] sm:text-[7.5px] font-bold text-slate-300 leading-tight truncate">
                                                          {w.isGrd && <Shield className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400 shrink-0" />}
                                                          <span className="truncate">{w.rank}</span>
                                                        </span>
                                                        <span className="text-[10px] sm:text-[9.5px] font-black text-white leading-tight truncate tracking-tight">
                                                          {w.name}
                                                        </span>
                                                      </>
                                                    ) : (
                                                      <span className="flex items-center gap-1 text-[9.5px] sm:text-[9px] font-black text-white leading-tight truncate">
                                                        {w.isGrd && <Shield className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400 shrink-0" />}
                                                        <span className="truncate">{w.name}</span>
                                                      </span>
                                                    )}
                                                 </span>
                                              ))}
                                              {workersOnThisDay.length > 5 && (
                                                 <span className="text-[10px] sm:text-[9px] font-black text-slate-500 px-1 py-1">+ {workersOnThisDay.length - 5}</span>
                                              )}
                                          </div>
                                      )}
                                  </div>
                               )}

                               {!outsideMonth && isTargetUserSelected && (
                                   <div className="absolute top-2 right-2 sm:top-2 sm:right-2 flex items-center justify-center p-1 sm:p-0.5 bg-indigo-500 text-white rounded-full shadow-sm">
                                       <CheckCircle2 className="w-4 h-4 sm:w-4 sm:h-4" />
                                   </div>
                               )}

                               {!outsideMonth && isTargetUserSelected && activeRg && activeRg !== 'ESCALANTE_PREF' && !isOrdinarioLockedForUser(activeRg, monthKey) && (
                                   <button 
                                      onClick={async (e) => {
                                          e.stopPropagation();
                                          const newMonthData = {
                                              lockedOrdinario: {
                                                  [activeRg]: true
                                              },
                                              locked: {
                                                  [activeRg]: true
                                              }
                                          };
                                          setData(prev => ({
                                              ...prev,
                                              lockedOrdinario: {
                                                  ...(prev.lockedOrdinario || {}),
                                                  [activeRg]: true
                                              },
                                              locked: {
                                                  ...(prev.locked || {}),
                                                  [activeRg]: true
                                              }
                                          }));
                                          await setDoc(monthDocRef, cleanUndefined(newMonthData), { merge: true });
                                      }}
                                      className="sm:hidden mt-3 w-full bg-indigo-600 active:bg-indigo-700 hover:bg-indigo-500 text-white py-2.5 px-2 rounded-lg text-[9px] items-center justify-center font-black uppercase tracking-widest flex gap-1 shadow-sm transition-colors"
                                   >
                                      <Save className="w-3.5 h-3.5 shrink-0"/> Confirmar e Registrar esta data
                                   </button>
                               )}
                            </motion.div>
                          );
                        })}
                       </div>
                      </div>
                    </div>
                 </div>

                 {/* Legend / Status Column */}
                 <div className="w-full lg:w-80 flex flex-col gap-6">
                     {/* User Status Card */}
                     {(isExp || isAdmin) && user.rg && (
                         <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl p-4 text-white shadow-md relative overflow-hidden shrink-0">
                             <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
                             <div className="flex flex-col gap-2 mb-3">
                                <div className="flex justify-between items-start">
                                  <h3 className="font-black text-[11px] uppercase tracking-widest flex items-center gap-1.5 shrink-0">
                                     <User className="w-3.5 h-3.5" /> {activeMilitaryName}
                                  </h3>
                                  {activeRg && typeof data.regimes?.[activeRg] === 'string' && data.regimes[activeRg] !== '' && (
                                    <span className="text-[8px] font-black bg-white/20 px-1.5 py-0.5 rounded uppercase tracking-tighter truncate max-w-[120px] text-right ml-2 leading-tight">
                                      {data.regimes[activeRg] as string}
                                    </span>
                                  )}
                                </div>
                                {(isAdmin || user.isEscalante) && (
                                    <select
                                        className="w-full mt-1 bg-white/10 border border-white/20 text-white text-[10px] font-bold p-1.5 rounded outline-none cursor-pointer hover:bg-white/20 transition-colors"
                                        value={adminTargetRg || ''}
                                        onChange={(e) => setAdminTargetRg(e.target.value || null)}
                                    >
                                        <option value="" className="text-slate-800">Você (Default)</option>
                                        <optgroup label="Preferências (Escalante)" className="text-slate-800">
                                            <option value="ESCALANTE_PREF" className="text-red-700 font-bold bg-red-50">★ DATAS PREFERENCIAIS</option>
                                        </optgroup>
                                        {isAdmin && (
                                          <optgroup label="Militares do Expediente" className="text-slate-800">
                                              {expedienteUsers.filter(u => (u.rg || u.uid) !== 'ESCALANTE_PREF').map((u, i) => {
                                                  const val = u.rg || u.uid || `usr-${i}`;
                                                  return <option key={`opt-${val}`} value={val}>{formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name)}</option>
                                              })}
                                          </optgroup>
                                        )}
                                    </select>
                                )}
                             </div>
                             
                             <div className="flex items-end gap-1.5 mb-2">
                                 <span className="text-3xl font-black leading-none">{userSels.length}</span>
                                 {activeRg !== 'ESCALANTE_PREF' && <span className="text-sm font-bold opacity-80 leading-snug">/ {userReq}</span>}
                                 <span className="text-[9px] font-black uppercase tracking-widest opacity-70 ml-auto mb-1 border border-white/20 px-1.5 py-0.5 rounded">
                                     {activeRg === 'ESCALANTE_PREF' ? 'Datas Preferenciais' : 'Serviços'}
                                 </span>
                             </div>
                             
                             {activeRg !== 'ESCALANTE_PREF' && (
                                 <div className="w-full bg-black/20 rounded-full h-1.5 mb-2.5">
                                     <div className="bg-green-400 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, progress)}%` }}></div>
                                 </div>
                             )}
                             
                             {activeRg === 'ESCALANTE_PREF' ? (
                                <p className="text-[9px] font-bold text-red-200 flex items-start gap-1 leading-tight mt-2">
                                   <AlertCircle className="w-3 h-3 shrink-0 text-red-300" />
                                   Marque no calendário as datas sugeridas para este mês.
                                </p>
                             ) : userReq === 0 ? (
                                <p className="text-[9px] font-bold text-amber-200 flex items-start gap-1 leading-tight">
                                   <AlertCircle className="w-3 h-3 shrink-0" />
                                   Aguardando adm definir vagas.
                                </p>
                             ) : userSels.length >= userReq ? (
                                <p className="text-[9px] font-bold text-green-300 flex items-center gap-1 object-center">
                                   <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" /> Cota cumprida.
                                </p>
                             ) : (
                                <p className="text-[9px] font-bold opacity-80 uppercase tracking-wide">
                                   Mais {userReq - userSels.length} dia{userReq - userSels.length > 1 ? 's' : ''}.
                                </p>
                             )}

                             {activeRg && activeRg !== 'ESCALANTE_PREF' && userReq > 0 && userSels.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-white/20">
                                   {!isOrdinarioLockedForUser(activeRg, monthKey) ? (
                                      !confirmLock ? (
                                          <button 
                                            onClick={() => setConfirmLock(true)}
                                            className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm"
                                          >
                                            <Save className="w-3.5 h-3.5" /> Enviar Escolhas (Escala 24h)
                                          </button>
                                      ) : (
                                          <div className="flex flex-col gap-2">
                                              <span className="text-[10px] text-white/80 font-bold text-center">Confirmar o envio definitivo da escala 24h?</span>
                                              <div className="flex gap-2">
                                                  <button 
                                                    onClick={() => setConfirmLock(false)}
                                                    className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border border-white/20"
                                                  >
                                                    Cancelar
                                                  </button>
                                                  <button 
                                                    onClick={async () => {
                                                        const newMonthData = {
                                                            lockedOrdinario: {
                                                                [activeRg!]: true
                                                            },
                                                            locked: {
                                                                [activeRg!]: true
                                                            }
                                                        };
                                                        setData(prev => ({
                                                            ...prev,
                                                            lockedOrdinario: {
                                                                ...(prev.lockedOrdinario || {}),
                                                                [activeRg!]: true
                                                            },
                                                            locked: {
                                                                ...(prev.locked || {}),
                                                                [activeRg!]: true
                                                            }
                                                        }));
                                                        await setDoc(monthDocRef, cleanUndefined(newMonthData), { merge: true });
                                                        setConfirmLock(false);
                                                    }}
                                                    className="flex-1 bg-green-500 hover:bg-green-400 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm"
                                                  >
                                                    SIM, ENVIAR
                                                  </button>
                                              </div>
                                          </div>
                                      )
                                   ) : (
                                      <div className="flex flex-col gap-2">
                                          <div className="bg-green-500/20 border border-green-500/30 rounded p-2 flex items-center justify-center gap-2 text-green-100 text-[10px] font-bold uppercase text-center">
                                              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                                              <span>Escala 24h Homologada</span>
                                          </div>
                                          {(isAdmin || user.isEscalante) && (
                                              <button
                                                  onClick={async () => {
                                                      const newMonthData = {
                                                          lockedOrdinario: {
                                                              [activeRg!]: false
                                                          },
                                                          locked: {
                                                              [activeRg!]: false
                                                          }
                                                      };
                                                      setData(prev => ({
                                                          ...prev,
                                                          lockedOrdinario: {
                                                              ...(prev.lockedOrdinario || {}),
                                                              [activeRg!]: false
                                                          },
                                                          locked: {
                                                              ...(prev.locked || {}),
                                                              [activeRg!]: false
                                                          }
                                                      }));
                                                      await setDoc(monthDocRef, cleanUndefined(newMonthData), { merge: true });
                                                  }}
                                                  className="w-full flex items-center justify-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors border border-amber-500/30 cursor-pointer"
                                                  title="Desbloquear escala 24h para edição"
                                              >
                                                  <Lock className="w-3 h-3" /> Desbloquear 24h (Admin)
                                              </button>
                                          )}
                                          <button 
                                            onClick={() => setShowSwapModal(true)}
                                            className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border border-white/20"
                                          >
                                            <ArrowUpDown className="w-3.5 h-3.5" /> Solicitar Troca do Dia de Serviço (24h)
                                          </button>
                                      </div>
                                   )}

                                    {/* Display user's own pending swap requests */}
                                    {data.swapRequests && data.swapRequests.some(r => r.rg === activeRg && r.status === 'pending') && (
                                        <div className="mt-4 flex flex-col gap-2">
                                            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest text-center border-b border-white/10 pb-1">Permutas Pendentes</span>
                                            {data.swapRequests.filter(r => r.rg === activeRg && r.status === 'pending').map(req => (
                                                <div key={req.id} className="bg-white/5 border border-white/10 rounded-lg p-2.5 flex flex-col gap-2">
                                                    <div className="flex items-center justify-between text-[10px] font-bold text-white">
                                                        <div className="flex items-center gap-1.5 w-full justify-center">
                                                            <span className="text-red-300">{format(new Date(`${req.fromDay}T12:00:00`), 'dd/MM')}</span>
                                                            <ArrowUpDown className="w-3 h-3 text-white/50 rotate-90" />
                                                            <span className="text-green-300">{format(new Date(`${req.toDay}T12:00:00`), 'dd/MM')}</span>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={async (e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            const updatedRequests = data.swapRequests!.filter(r => r.id !== req.id);
                                                            await setDoc(monthDocRef, cleanUndefined({ swapRequests: updatedRequests }), { merge: true });
                                                        }}
                                                        className="w-full py-1.5 bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-200 text-[9px] font-black uppercase tracking-widest rounded transition-colors mt-1 z-20 relative cursor-pointer"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                </div>
                             )}
                         </div>
                     )}

                     {/* Legend Panel */}
                     <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm flex flex-col flex-1 max-h-[600px] overflow-hidden">
                         <div className="p-4 border-b-2 border-slate-100">
                             <h3 className="font-black text-sm uppercase tracking-widest text-slate-800 flex justify-between items-center">
                                Militares do Expediente
                             </h3>
                         </div>
                         <div className="flex flex-col flex-1 overflow-y-auto p-4 gap-6 custom-scrollbar">
                             {expedienteUsers.length === 0 && (
                                <div className="text-center py-4 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                                    <p className="text-[10px] font-black opacity-50 uppercase tracking-widest text-slate-500">Nenhum militar do expediente encontrado</p>
                                </div>
                             )}
                             
                             {(() => {
                                 const activeMembers = expedienteUsers.filter(u => u.rg !== 'ESCALANTE_PREF').filter(u => {
                                     const rg = u.rg || u.uid;
                                     const reqAmount = getReqAmount(rg);
                                     return true;
                                 });

                                 const hasPendingSwap = (u: any) => {
                                     const rg = u.rg || u.uid;
                                     return data.swapRequests?.some(r => r.rg === rg && r.status === 'pending');
                                 };

                                 const swappingMembers = activeMembers.filter(hasPendingSwap);

                                 const completedMembers = activeMembers.filter(u => {
                                     if (hasPendingSwap(u)) return false;
                                     const rg = u.rg || u.uid;
                                     const reqAmount = getReqAmount(rg);
                                     const sels = safeArr(data.selections[rg]);
                                     const regime = getRegime(rg);
                                     const isExento = reqAmount === 0 && (regime.includes('Readaptado') || regime.includes('Redução'));
                                     return isExento || (reqAmount > 0 && sels.length >= reqAmount);
                                 });

                                 const pendingMembers = activeMembers.filter(u => {
                                     if (hasPendingSwap(u)) return false;
                                     const rg = u.rg || u.uid;
                                     const reqAmount = getReqAmount(rg);
                                     const sels = safeArr(data.selections[rg]);
                                     const regime = getRegime(rg);
                                     const isExento = reqAmount === 0 && (regime.includes('Readaptado') || regime.includes('Redução'));
                                     return !isExento && !(reqAmount > 0 && sels.length >= reqAmount);
                                 });

                                 const renderMember = (u: UserProfile) => {
                                     const rg = u.rg || u.uid;
                                     const reqAmount = getReqAmount(rg);
                                     const sels = safeArr(data.selections[rg]);
                                     const sector = getSector(rg);
                                     const regime = getRegime(rg);
                                     const isExento = reqAmount === 0 && (regime.includes('Readaptado') || regime.includes('Redução'));
                                     const isComplete = isExento || (reqAmount > 0 && sels.length >= reqAmount);
                                     
                                     return (
                                         <div key={rg} className="flex flex-col p-3 rounded-lg border border-slate-100 bg-slate-50 relative">
                                             <div className="flex justify-between items-start mb-2">
                                                 <div className="flex flex-col leading-tight mr-2">
                                                    <span className="text-[12px] font-black text-slate-800">{formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name)}</span>
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">RG: {rg}</span>
                                                        {sector && <span className="text-[9px] font-black text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded shadow-sm">{sector}</span>}
                                                        {regime && <span className="text-[8px] font-black text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded uppercase tracking-tighter">{regime}</span>}
                                                    </div>
                                                 </div>
                                                 
                                                 <div className={cn("text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm shrink-0", isComplete ? (isExento ? "bg-slate-300 text-slate-700" : "bg-green-100 text-green-700") : "bg-amber-100 text-amber-700")}>
                                                     {isExento ? "DTS" : `${sels.length} / ${reqAmount > 0 ? reqAmount : '?'}`}
                                                 </div>
                                             </div>
                                             
                                             {!isExento && reqAmount > 0 && (
                                                 <div className="w-full bg-slate-200 rounded-full h-1 mt-1">
                                                     <div className={cn("h-1 rounded-full", isComplete ? "bg-green-500" : "bg-amber-500")} style={{ width: `${reqAmount > 0 ? Math.min(100, (sels.length / reqAmount) * 100) : 0}%` }}></div>
                                                 </div>
                                             )}
                                         </div>
                                     );
                                 };

                                 return (
                                     <>
                                         {swappingMembers.length > 0 && (
                                             <div className="flex flex-col gap-3">
                                                 <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest border-b border-orange-100 pb-1 flex items-center gap-2">
                                                     <ArrowUpDown className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                                                     Solicitando Troca ({swappingMembers.length})
                                                 </h4>
                                                 {swappingMembers.map(renderMember)}
                                             </div>
                                         )}
                                         
                                         {pendingMembers.length > 0 && (
                                             <div className="flex flex-col gap-3">
                                                 <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest border-b border-amber-100 pb-1 flex items-center gap-2 mt-2">
                                                     <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                                     Com Pendências ({pendingMembers.length})
                                                 </h4>
                                                 {pendingMembers.map(renderMember)}
                                             </div>
                                         )}
                                         
                                         {completedMembers.length > 0 && (
                                             <div className="flex flex-col gap-3">
                                                 <h4 className="text-[10px] font-black text-green-600 uppercase tracking-widest border-b border-green-100 pb-1 flex items-center gap-2 mt-2">
                                                     <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                     Sem Pendências ({completedMembers.length})
                                                 </h4>
                                                 {completedMembers.map(renderMember)}
                                             </div>
                                         )}
                                     </>
                                 );
                             })()}
                         </div>
                     </div>
                     
                     {/* Escalante Admin Panel for Swap Requests */}
                     {(isAdmin || user.isEscalante) && data.swapRequests && data.swapRequests.length > 0 && (
                        <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm flex flex-col mt-6 overflow-hidden">
                          <div className="p-4 border-b-2 border-slate-100 bg-amber-50">
                              <h3 className="font-black text-sm uppercase tracking-widest text-amber-800 flex justify-between items-center">
                                 Solicitações de Permuta
                              </h3>
                          </div>
                          <div className="flex flex-col p-4 gap-3 max-h-[300px] overflow-y-auto">
                              {data.swapRequests.map(req => (
                                  <div key={req.id} className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                      <div className="flex justify-between items-start">
                                          <span className="text-xs font-black text-slate-800">{req.userName}</span>
                                          <span className={cn(
                                              "text-[9px] font-black uppercase px-2 py-0.5 rounded",
                                              req.status === 'pending' ? "bg-amber-100 text-amber-700" :
                                              req.status === 'approved' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                          )}>
                                              {req.status === 'pending' ? 'Pendente' : req.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                                          </span>
                                      </div>
                                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                                          <span className="text-red-500 line-through">{format(new Date(`${req.fromDay}T12:00:00`), 'dd/MM (eee)', {locale: ptBR})}</span>
                                          <ArrowUpDown className="w-3 h-3 text-slate-400 rotate-90" />
                                          <span className="text-green-600">{format(new Date(`${req.toDay}T12:00:00`), 'dd/MM (eee)', {locale: ptBR})}</span>
                                      </div>
                                      {req.status === 'pending' && (
                                          <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200">
                                              <button 
                                                onClick={async () => {
                                                    // Approve
                                                    const userSels = safeArr(data.selections[req.rg]);
                                                    if (!userSels.includes(req.fromDay)) {
                                                        alert("O militar não possui mais o serviço original agendado. Permuta não pode ser concluída.");
                                                        return;
                                                    }
                                                    
                                                    const updatedRequests = data.swapRequests!.map(r => r.id === req.id ? { ...r, status: 'approved' as const } : r);
                                                    
                                                    // Update selections
                                                    const newSels = userSels.filter(d => d !== req.fromDay);
                                                    if (!newSels.includes(req.toDay)) newSels.push(req.toDay);

                                                    const newMonthData = {
                                                        swapRequests: updatedRequests,
                                                        selections: {
                                                            [req.rg]: newSels
                                                        }
                                                    };
                                                    await setDoc(monthDocRef, cleanUndefined(newMonthData), { merge: true });
                                                }}
                                                className="flex-1 bg-green-500 hover:bg-green-600 text-white text-[9px] font-black uppercase py-1.5 rounded transition-colors"
                                              >
                                                  Aprovar
                                              </button>
                                              <button 
                                                onClick={async () => {
                                                    // Reject
                                                    const updatedRequests = data.swapRequests!.map(r => r.id === req.id ? { ...r, status: 'rejected' as const } : r);
                                                    await setDoc(monthDocRef, cleanUndefined({ swapRequests: updatedRequests }), { merge: true });
                                                }}
                                                className="flex-1 bg-red-500 hover:bg-red-600 text-white text-[9px] font-black uppercase py-1.5 rounded transition-colors"
                                              >
                                                  Rejeitar
                                              </button>
                                          </div>
                                      )}
                                  </div>
                              ))}
                          </div>
                        </div>
                     )}

                 </div>
                </div>
           )}
        </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SWAP MODAL */}
      <AnimatePresence>
        {showSwapModal && activeRg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-indigo-600" />
                  Solicitar Troca do Dia de Serviço (24h)
                </h3>
                <button
                  onClick={() => setShowSwapModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form 
                onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const fromDay = formData.get('fromDay') as string;
                    const toDay = formData.get('toDay') as string;
                    
                    if (!fromDay || !toDay) {
                        alert("Selecione os dois dias.");
                        return;
                    }
                    if (fromDay === toDay) {
                        alert("Os dias devem ser diferentes.");
                        return;
                    }
                    
                    const newReq: SwapRequest = {
                        id: Math.random().toString(36).substr(2, 9),
                        rg: activeRg,
                        userName: formatMilitaryName(user.rank ? `${user.rank} ${user.warName || user.name.split(' ')[0]}` : user.name),
                        fromDay,
                        toDay,
                        status: 'pending',
                        createdAt: new Date().toISOString()
                    };
                    
                    const updatedRequests = [...(data.swapRequests || []), newReq];
                    await setDoc(monthDocRef, cleanUndefined({ swapRequests: updatedRequests }), { merge: true });
                    
                    alert("Solicitação enviada para avaliação!");
                    setShowSwapModal(false);
                }}
                className="p-6 flex flex-col gap-6"
              >
                  <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Saindo de (Serviço Atual)
                      </label>
                      <select name="fromDay" required className="w-full text-sm p-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500">
                          <option value="">Selecione o serviço atual...</option>
                          {safeArr(data.selections[activeRg]).sort().map(d => (
                              <option key={d} value={d}>{format(new Date(`${d}T12:00:00`), "dd/MM/yyyy (EEEE)", {locale: ptBR})}</option>
                          ))}
                      </select>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Entrando em (Novo Serviço)
                      </label>
                      <select name="toDay" required className="w-full text-sm p-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500">
                          <option value="">Selecione o novo serviço...</option>
                          {currentMonthDays.map(d => {
                              const dStr = format(d, 'yyyy-MM-dd');
                              if (safeArr(data.selections[activeRg]).includes(dStr)) return null;
                              return <option key={dStr} value={dStr}>{format(d, "dd/MM/yyyy (EEEE)", {locale: ptBR})}</option>;
                          })}
                      </select>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4">
                      <button 
                          type="button" 
                          onClick={() => setShowSwapModal(false)}
                          className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                          Cancelar
                      </button>
                      <button 
                          type="submit"
                          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-colors shadow-md"
                      >
                          Enviar Solicitação
                      </button>
                  </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* MODAL DE SOLICITAÇÃO DE ALTERAÇÃO DA SEMANA DE EXPEDIENTE */}
        {showWeeklyChangeModal && activeRg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col my-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
                    <ArrowUpDown className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm sm:text-base">
                      Solicitar Alteração no Expediente Semanal
                    </h3>
                    <p className="text-[10px] sm:text-xs text-slate-500 font-bold">
                      Semana: {format(fullWeekDays[0], 'dd/MM')} a {format(fullWeekDays[6], 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWeeklyChangeModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitWeeklyChangeRequest} className="p-4 sm:p-6 flex flex-col gap-4 overflow-y-auto">
                <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3 text-xs text-slate-700 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-indigo-900">Selecione o novo status desejado para os dias que deseja mudar:</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Sua solicitação será analisada e deliberada pelo Escalante / Moderador.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Dias da Semana (Clique para alterar o status)
                  </span>

                  <div className="flex flex-col gap-2">
                    {fullWeekDays.map(day => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const dayName = format(day, 'EEEE', { locale: ptBR });
                      const dayDate = format(day, 'dd/MM');
                      const curSt = getDayStatus(activeRg, dayStr).type;
                      const normCur = curSt === 'afastamento' ? 'folga' : curSt;
                      const propSt = proposedWeeklyChanges[dayStr] || normCur;
                      const isChanged = propSt !== normCur;

                      return (
                        <div 
                          key={dayStr}
                          className={cn(
                            "p-2.5 rounded-xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all",
                            isChanged ? "bg-indigo-50/40 border-indigo-400 shadow-sm" : "bg-slate-50/70 border-slate-200"
                          )}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black capitalize text-slate-800 min-w-[130px]">
                              {dayName} ({dayDate})
                            </span>
                            <span className={cn(
                              "text-[9px] font-black uppercase px-2 py-0.5 rounded",
                              normCur === 'expediente' ? "bg-indigo-100 text-indigo-700" :
                              normCur === 'servico' ? "bg-red-100 text-red-700" :
                              "bg-slate-200 text-slate-600"
                            )}>
                              Atual: {normCur === 'expediente' ? 'EXP' : normCur === 'servico' ? 'SV' : 'FOLGA'}
                            </span>
                            {isChanged && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-400 text-amber-950 font-bold shadow-xs">
                                ➔ Solicitado: {propSt === 'expediente' ? 'EXP' : propSt === 'servico' ? 'SV' : 'FOLGA'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => setProposedWeeklyChanges(prev => ({ ...prev, [dayStr]: 'expediente' }))}
                              className={cn(
                                "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                                propSt === 'expediente'
                                  ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400"
                                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                              )}
                            >
                              EXP
                            </button>
                            <button
                              type="button"
                              onClick={() => setProposedWeeklyChanges(prev => ({ ...prev, [dayStr]: 'servico' }))}
                              className={cn(
                                "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                                propSt === 'servico'
                                  ? "bg-red-600 text-white shadow-sm ring-2 ring-red-400"
                                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                              )}
                            >
                              SV
                            </button>
                            <button
                              type="button"
                              onClick={() => setProposedWeeklyChanges(prev => ({ ...prev, [dayStr]: 'folga' }))}
                              className={cn(
                                "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                                propSt === 'folga'
                                  ? "bg-slate-700 text-white shadow-sm ring-2 ring-slate-400"
                                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                              )}
                            >
                              FOLGA
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                    Motivo / Justificativa da Alteração *
                  </label>
                  <textarea
                    value={weeklyChangeReason}
                    onChange={e => setWeeklyChangeReason(e.target.value)}
                    required
                    placeholder="Informe o motivo da alteração solicitada (ex: permuta de expediente, compensação de plantão, necessidade administrativa...)"
                    rows={3}
                    className="w-full text-xs p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500">
                    {(() => {
                      const count = fullWeekDays.filter(d => {
                        const dStr = format(d, 'yyyy-MM-dd');
                        const cur = getDayStatus(activeRg, dStr).type;
                        const norm = cur === 'afastamento' ? 'folga' : cur;
                        return (proposedWeeklyChanges[dStr] || norm) !== norm;
                      }).length;
                      return count === 0 ? "Nenhum dia alterado" : `${count} dia(s) alterado(s)`;
                    })()}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowWeeklyChangeModal(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={!weeklyChangeReason.trim() || fullWeekDays.filter(d => {
                        const dStr = format(d, 'yyyy-MM-dd');
                        const cur = getDayStatus(activeRg, dStr).type;
                        const norm = cur === 'afastamento' ? 'folga' : cur;
                        return (proposedWeeklyChanges[dStr] || norm) !== norm;
                      }).length === 0}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider rounded-lg transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" /> Enviar Solicitação
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
        
        {removeMemberRg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 min-h-screen bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden pointer-events-auto my-auto"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-red-50">
                <h3 className="font-black text-red-800 uppercase tracking-widest text-sm flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-600" />
                  Remover do Expediente
                </h3>
              </div>
              <div className="p-6 flex flex-col gap-6">
                 <p className="text-sm font-bold text-slate-700">Para qual Ala (1, 2, 3 ou 4) deseja mover este militar?</p>
                 <p className="text-xs text-slate-500">Deixe em branco ou digite '0' para deixar SEM ALA</p>
                 <input
                     type="text"
                     value={removeMemberAla}
                     onChange={(e) => setRemoveMemberAla(e.target.value)}
                     className="w-full text-sm p-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-red-500"
                     placeholder="Ala"
                 />
                 <div className="flex justify-end gap-3 pt-4">
                     <button
                         type="button"
                         onClick={() => setRemoveMemberRg(null)}
                         className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                     >
                         Cancelar
                     </button>
                     <button
                         type="button"
                         onClick={confirmRemoveFromExpediente}
                         className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-colors shadow-md"
                     >
                         Confirmar Remoção
                     </button>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
