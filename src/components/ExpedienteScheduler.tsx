import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserProfile } from '../types';
import { doc, onSnapshot, setDoc, query, collection, getDocs, deleteField } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn, formatMilitaryName, getAlaForDate, getAlaLightColor, getAlaColor } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Settings, CheckCircle2, User, AlertCircle, Save, CalendarRange, Table, ArrowUpDown, X, UserPlus, Trash2, List, Columns, Copy } from 'lucide-react';
import { useMilitars } from '../contexts/MilitarContext';
import { cleanUndefined } from "../lib/utils";

interface ExpedienteSchedulerProps {
  user: UserProfile;
  obmContext: string;
  forceExpanded?: boolean;
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

interface ExpedienteData {
  requirements: Record<string, number>;
  selections: Record<string, string[]>;
  userNames: Record<string, string>;
  sectors?: Record<string, string>;
  regimes?: Record<string, string>;
  locked?: Record<string, boolean>;
  swapRequests?: SwapRequest[];
  preferencesDetails?: Record<string, Record<string, number>>;
  expedienteDays?: Record<string, string[]>;
  expQuotas?: Record<string, number>;
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

export function ExpedienteScheduler({ user, obmContext, forceExpanded }: ExpedienteSchedulerProps) {
  const { militars, updateMilitarLocal } = useMilitars();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    if (now.getDate() > 20) {
      return startOfMonth(addMonths(now, 1));
    }
    return startOfMonth(now);
  });
  const normalizeObm = (val: string) => {
    const v = (val || '').trim().toUpperCase();
    if (v === '10º' || v === '10º GBM' || v === '10' || v === '10ºGBM') return '10º GBM';
    if (v === '26º' || v === '26º GBM' || v === '26' || v === '26ºGBM') return '26º GBM';
    return (val || '').trim();
  };

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

    setExpedienteUsers(usersList.sort((a, b) => {
      const numA = parseInt(String(a.rg || '0').replace(/\D/g, ''), 10);
      const numB = parseInt(String(b.rg || '0').replace(/\D/g, ''), 10);
      const validA = !isNaN(numA) && numA !== 0;
      const validB = !isNaN(numB) && numB !== 0;

      if (validA && validB) {
          return numA - numB;
      } else if (validA && !validB) {
          return -1;
      } else if (!validA && validB) {
          return 1;
      }
      return (a.name || '').localeCompare(b.name || '');
    }));
  }, [militars, selectedObm, data]);

  const [adminTargetRg, setAdminTargetRg] = useState<string | null>(null);
  const [addMemberRg, setAddMemberRg] = useState('');
  const [isExpanded, setIsExpanded] = useState(forceExpanded || false);
  const [adminConfigMode, setAdminConfigMode] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'table' | 'lista' | 'escala_sv' | 'necessidades'>('calendar');
  const [transposeTable, setTransposeTable] = useState(false);
  const [copyStatus, setCopyStatus] = useState(false);
  const [autoExpStatus, setAutoExpStatus] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [confirmLock, setConfirmLock] = useState(false);
  const [removeMemberRg, setRemoveMemberRg] = useState<string | null>(null);
  const [removeMemberAla, setRemoveMemberAla] = useState('');

  const handleCopyTables = () => {
      const containerId = viewMode === 'table' ? 'table-view-container' : viewMode === 'escala_sv' ? 'escala-sv-container' : null;
      if (!containerId) return;
      const el = document.getElementById(containerId);
      if (!el) return;
      
      try {
          const range = document.createRange();
          range.selectNode(el);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
          document.execCommand('copy');
          selection?.removeAllRanges();
          
          setCopyStatus(true);
          setTimeout(() => setCopyStatus(false), 2000);
      } catch (err) {
          console.error("Failed to copy", err);
      }
  };
  
  const isAdmin = user.isAdmin;
  const isEscalante = user.isEscalante;
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

  const normalizedObm = selectedObm.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const monthKey = format(currentMonth, 'yyyy-MM');
  const monthDocRef = doc(db, `expediente_${normalizedObm}`, monthKey);
  const globalDocRef = doc(db, 'config', `expediente_global_${normalizedObm}`);

  useEffect(() => {
    setLoading(true);
    let monthData: any = { selections: {}, expedienteDays: {} };
    let globalData: any = { requirements: {}, userNames: {}, sectors: {}, expQuotas: {} };

    const mergeData = () => {
      setData({
        requirements: globalData.requirements || {},
        selections: monthData.selections || {},
        locked: monthData.locked || {},
        swapRequests: monthData.swapRequests || [],
        preferencesDetails: monthData.preferencesDetails || {},
        expedienteDays: monthData.expedienteDays || {},
        expQuotas: globalData.expQuotas || {},
        userNames: globalData.userNames || {},
        sectors: globalData.sectors || {},
        regimes: globalData.regimes || {}
      });
      setLoading(false);
    };

    const unsubMonth = onSnapshot(monthDocRef, (docSnap) => {
      if (docSnap.exists()) {
         monthData = docSnap.data();
      } else {
         monthData = { selections: {}, locked: {}, swapRequests: [] };
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

    return () => { unsubMonth(); unsubGlobal(); };
  }, [monthKey, selectedObm]);

  const handleAddToExpediente = async () => {
      if (!addMemberRg) return;
      try {
          const safeRg = addMemberRg.toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^0+/, '');
          if (db) {
             const { doc, setDoc } = await import('firebase/firestore');
             await setDoc(doc(db, 'militaries', safeRg), { ala: 'EXP' }, { merge: true });
          }
          updateMilitarLocal(addMemberRg, { ala: 'EXP' });
          setAddMemberRg('');
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
              const { doc, setDoc } = await import('firebase/firestore');
              await setDoc(doc(db, 'militaries', safeRg), { ala: alaValue }, { merge: true });
          }
          updateMilitarLocal(rgToUpdate, { ala: alaValue });

          const globalUpdates: any = {
              requirements: { [rgToUpdate]: deleteField() },
              userNames: { [rgToUpdate]: deleteField() },
              sectors: { [rgToUpdate]: deleteField() },
              regimes: { [rgToUpdate]: deleteField() }
          };
          await setDoc(globalDocRef, cleanUndefined(globalUpdates), { merge: true });
          
          const monthUpdates: any = {
              selections: { [rgToUpdate]: deleteField() },
              locked: { [rgToUpdate]: deleteField() }
          };
          await setDoc(monthDocRef, cleanUndefined(monthUpdates), { merge: true });

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
                        selections: { 'ESCALANTE_PREF': sels },
                        preferencesDetails: {
                            [dayStr]: deleteField()
                        }
                    }), { merge: true });
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
  const getSector = (rg: string) => {
      const val = data.sectors?.[rg];
      return typeof val === 'string' ? val : '';
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
          (fbDayData as any)[func] = deleteField();
      } else {
          localDayData[func] = qty;
          fbDayData[func] = qty;
      }
      
      const newLocalPrefs = { ...(data.preferencesDetails || {}), [dayStr]: localDayData };
      const newFbPrefs = { ...(data.preferencesDetails || {}), [dayStr]: fbDayData };
      
      setData(prev => ({...prev, preferencesDetails: newLocalPrefs}));
      await setDoc(monthDocRef, cleanUndefined({ preferencesDetails: newFbPrefs }), { merge: true });
  };

  const handleTargetedToggle = async (rgSelection: string, day: Date) => {
    if (!rgSelection) {
      alert("Nenhum militar selecionado.");
      return;
    }
    const isLocked = data.locked?.[rgSelection];
    if (isLocked && rgSelection !== 'ESCALANTE_PREF' && !isAdmin && !user.isEscalante) {
      alert("Suas escolhas já foram enviadas e estão bloqueadas. Use a opção 'Solicitar Troca' se precisar alterar.");
      return;
    }

    const dayStr = format(day, 'yyyy-MM-dd');
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

  if (!canInteract && !isAdmin) return null; // Or show read-only

  return (
    <div id="expediente-scheduler" className="mb-6 sm:mb-12 border-2 border-slate-300 rounded-xl overflow-hidden shadow-sm bg-white">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors active:bg-slate-100 ${isExpanded ? 'bg-indigo-50 border-b-2 border-slate-300' : 'bg-white'}`}
      >
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg border-2 ${isExpanded ? 'bg-indigo-200 border-indigo-400' : 'bg-indigo-100 border-indigo-300'}`}>
            <CalendarRange className={`w-6 h-6 ${isExpanded ? 'text-indigo-800' : 'text-indigo-600'}`} />
          </div>
          <div className="text-left flex flex-col items-start gap-1">
            <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Escala do Expediente</h3>
                <div className="text-[9px] font-black text-indigo-400 bg-indigo-100 px-2 py-0.5 rounded uppercase tracking-widest hidden sm:block">
                  OPERAÇÕES EXP
                </div>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">
              Marque os dias de serviço que trabalhará no mês
            </p>
          </div>
        </div>
        <div className={`p-2 rounded-full transition-colors ${isExpanded ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
           <svg className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </button>

      <motion.div 
        initial={false}
        animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
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
                                      viewMode === 'calendar' ? "bg-white text-indigo-700 shadow-sm" : "text-transparent text-slate-500 hover:text-slate-700"
                                  )}
                              >
                                  <CalendarRange className="w-3 h-3" /> <span className="hidden sm:inline">Calendário</span>
                              </button>
                              <button
                                  onClick={() => setViewMode('table')}
                                  className={cn(
                                      "px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1",
                                      viewMode === 'table' ? "bg-white text-indigo-700 shadow-sm" : "text-transparent text-slate-500 hover:text-slate-700"
                                  )}
                              >
                                  <Table className="w-3 h-3" /> <span className="hidden sm:inline">Tabela</span>
                              </button>
                              <button
                                  onClick={() => setViewMode('lista')}
                                  className={cn(
                                      "px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1",
                                      viewMode === 'lista' ? "bg-white text-indigo-700 shadow-sm" : "text-transparent text-slate-500 hover:text-slate-700"
                                  )}
                              >
                                  <List className="w-3 h-3" /> <span className="hidden sm:inline">Lista</span>
                              </button>
                              <button
                                  onClick={() => setViewMode('escala_sv')}
                                  className={cn(
                                      "px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1",
                                      viewMode === 'escala_sv' ? "bg-white text-indigo-700 shadow-sm" : "text-transparent text-slate-500 hover:text-slate-700"
                                  )}
                              >
                                  <Columns className="w-3 h-3" /> <span className="hidden sm:inline">Escala SV</span>
                              </button>
                              {(isAdmin || user.isEscalante) && (
                                  <button
                                      onClick={() => setViewMode('necessidades')}
                                      className={cn(
                                          "px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1",
                                          viewMode === 'necessidades' ? "bg-white text-indigo-700 shadow-sm" : "text-transparent text-slate-500 hover:text-slate-700"
                                      )}
                                  >
                                      <AlertCircle className="w-3 h-3" /> <span className="hidden sm:inline">Necessidades</span>
                                  </button>
                              )}
                          </div>
                          
                          {viewMode === 'table' && (
                              <button
                                  onClick={() => setTransposeTable(!transposeTable)}
                                  className={cn(
                                      "ml-2 px-3 py-1.5 rounded-lg border-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5",
                                      transposeTable ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600"
                                  )}
                                  title="Inverter Tabela"
                              >
                                  <ArrowUpDown className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Inverter</span>
                              </button>
                          )}
                          {(viewMode === 'escala_sv' || viewMode === 'table') && (isAdmin || user.isEscalante) && (
                              <>
                                  <button
                                      onClick={handleAutoFillExp}
                                      className={cn(
                                          "ml-2 px-3 py-1.5 rounded-lg border-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer",
                                          autoExpStatus ? "bg-green-50 border-green-200 text-green-700" : "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                                      )}
                                      title="Preencher Dias de Expediente Automaticamente"
                                  >
                                      {autoExpStatus ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <CalendarRange className="w-3.5 h-3.5" />}
                                      <span className="hidden sm:inline">{autoExpStatus ? 'Preenchido' : 'Auto EXP'}</span>
                                  </button>
                                  <button
                                      onClick={handleCopyTables}
                                      className="ml-2 px-3 py-1.5 rounded-lg border-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 shrink-0 cursor-pointer"
                                      title="Copiar Tabelas"
                                  >
                                      {copyStatus ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />} 
                                      <span className="hidden sm:inline">{copyStatus ? 'Copiado' : 'Copiar'}</span>
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

                 {/* Month controls */}
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
              </div>
           </div>

           {adminConfigMode && (isAdmin || user.isEscalante) ? (
               <div className="bg-white border-2 border-slate-200 rounded-xl shadow-sm overflow-x-auto no-scrollbar relative flex flex-col">
                     <div className="p-4 border-b-2 border-slate-200 bg-slate-50 flex items-center justify-between gap-4 flex-wrap sticky left-0 w-full min-w-max">
                         <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full max-w-[800px]">
                             <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none whitespace-nowrap">Novo Membro:</span>
                             <select
                                  value={addMemberRg}
                                  onChange={(e) => setAddMemberRg(e.target.value)}
                                  className="flex-1 w-full text-[10px] font-bold p-2 px-3 border-2 border-slate-200 rounded-lg bg-white text-slate-700 hover:border-indigo-300 focus:border-indigo-500 outline-none transition-colors"
                             >
                                  <option value="">Selecione um militar...</option>
                                  {militars.filter(m => !expedienteUsers.find(eu => (eu.rg || eu.uid) === (m.uid||m.rg))).sort((a,b) => (a.name||'').localeCompare(b.name||'')).map((m, i) => (
                                      <option key={(m.uid||m.rg||`m-${i}`)} value={m.uid||m.rg}>
                                          {m.rank} {formatMilitaryName(m.warName || m.name?.split(' ')[0] || '')} {m.obm ? `- ${m.obm}` : ''}
                                      </option>
                                  ))}
                             </select>
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
                                                  
                                                  // Auto-calculate required days based on selected regime
                                                  let autoReq = (typeof data.requirements?.[rg] === 'number' && !isNaN(data.requirements[rg])) ? data.requirements[rg] : undefined;
                                                  if (val === "3 Exped. e 2 serv. 24h") autoReq = 2;
                                                  else if (val === "4 Exped. e 1 serv. 24h") autoReq = 1;
                                                  else if (val === "1 Exped. e 3 Serv. 24h (Militar com Redução de Carga Horária)") autoReq = 3;
                                                  else if (val === "4 Expedientes (Militar Readaptado)") autoReq = 0;
                                                  else if (val === "2 e 1/2 Expedientes (Militar com Redução de Carga Horária)") autoReq = 0;

                                                  const newGlobal: any = {
                                                      regimes: { [rg]: r || deleteField() },
                                                      userNames: { [rg]: formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name) }
                                                  };
                                                  
                                                  if (autoReq !== undefined && autoReq !== data.requirements?.[rg]) {
                                                      newGlobal.requirements = { [rg]: autoReq === 0 ? deleteField() : autoReq };
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
                                                    requirements: { [rg]: req <= 0 ? deleteField() : req },
                                                    userNames: { [rg]: formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name) }
                                                };
                                                await setDoc(globalDocRef, cleanUndefined(newGlobal), { merge: true });
                                             }}
                                             className="w-16 p-2 text-center text-sm border-2 border-indigo-200 rounded-md bg-white font-black text-indigo-900 hover:border-indigo-400 focus:border-indigo-500 outline-none transition-colors mx-auto block"
                                         />
                                     </td>
                                     <td className="py-3 px-4 border-l-2 border-slate-50">
                                         <input 
                                             type="text"
                                             placeholder="Ex: DGP, SOP..."
                                             defaultValue={sector}
                                             key={`sec-${sector}`}
                                             onBlur={async (e) => {
                                                const s = e.target.value;
                                                if (s === sector) return;
                                                const newGlobal: any = {
                                                    sectors: { [rg]: s || deleteField() },
                                                    userNames: { [rg]: formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name) }
                                                };
                                                await setDoc(globalDocRef, cleanUndefined(newGlobal), { merge: true });
                                             }}
                                             className="w-full text-sm p-2 border-2 border-slate-200 rounded-md bg-white font-bold text-slate-700 hover:border-slate-300 focus:border-slate-500 outline-none transition-colors uppercase"
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
           ) : viewMode === 'table' ? (
                 <div id="table-view-container" className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-x-auto custom-scrollbar">
                     {transposeTable ? (
                         <table className="w-full text-left border-collapse min-w-[max-content]">
                             <thead>
                                 <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-500">
                                     <th className="py-2 px-4 sticky left-0 z-20 bg-slate-50 border-r-2 border-slate-200 text-[10px] font-black uppercase tracking-widest min-w-[70px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
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
                                             isWeekend ? "bg-slate-50/80 hover:bg-slate-200/50" : "",
                                             isPreferredDate ? "bg-red-50/50 hover:bg-red-100/50" : ""
                                         )}>
                                             <td className={cn(
                                                 "py-2 px-3 sticky left-0 z-10 border-r-2 border-slate-200 text-[11px] sm:text-[12px] font-black shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]",
                                                 isWeekend ? "bg-slate-100 text-slate-500" : "bg-white text-slate-700",
                                                 isPreferredDate ? "bg-red-50 text-red-900 border-r-red-300" : ""
                                             )}>
                                                 <div className="flex items-center justify-between">
                                                     <div className="flex flex-col">
                                                         <span className={cn("text-[9px] font-bold uppercase leading-none mb-0.5", isPreferredDate ? "text-red-500" : "text-slate-400")}>{format(day, 'eee', { locale: ptBR }).slice(0, 3)}</span>
                                                         <span className={isPreferredDate ? "text-red-700" : ""}>{format(day, 'd')}</span>
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
                                                 const isTargetUser = activeRg === rg;
                                                 const canEdit = isAdmin || isTargetUser || (isEscalantePref && (isAdmin || user.isEscalante));
                                                 
                                                 const isSwapDay = !isEscalantePref && data.swapRequests?.some(r => r.rg === rg && r.status === 'pending' && (r.fromDay === dayStr || r.toDay === dayStr));
                                                 
                                                 return (
                                                     <td 
                                                         key={`${dayStr}-${rg}`} 
                                                         onClick={() => {
                                                             if (canEdit) {
                                                                 handleCycleCellStatus(rg, dayStr);
                                                             }
                                                         }}
                                                         className={cn(
                                                             "py-1 px-1 border-r border-slate-100 text-center relative select-none",
                                                             isPreferredDate && !isSelected && !isEscalantePref ? "bg-red-50/70 border-r-red-100" : "",
                                                             isSwapDay ? "bg-orange-50 border-orange-200 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.3)] z-10" : "",
                                                             canEdit ? "cursor-pointer hover:bg-indigo-200 hover:shadow-inner" : "cursor-default hover:bg-slate-100"
                                                         )}
                                                     >
                                                         {isSelected && (
                                                             <div className={cn(
                                                                 "mx-auto w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center shadow-sm",
                                                                 isEscalantePref ? "bg-red-500 text-white border border-red-600 shadow-red-200" :
                                                                 isSwapDay ? "bg-orange-500 text-white shadow-orange-200 border border-orange-600 animate-pulse" :
                                                                 isTargetUser ? "bg-indigo-500 text-white" : "bg-slate-600 text-white"
                                                             )}>
                                                                 <span className={cn("text-[10px] font-black leading-none pt-[1px]", isEscalantePref && "text-white")}>
                                                                     {isEscalantePref ? '★' : 'X'}
                                                                 </span>
                                                             </div>
                                                         )}
                                                         {!isSelected && isSwapDay && (
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
                                <th className="py-2 px-3 sticky left-0 z-20 bg-slate-50 border-r-2 border-slate-200 text-[10px] font-black uppercase tracking-widest min-w-[150px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">
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
                                            "py-2 px-1 border-r border-slate-200 text-center min-w-[32px] sm:min-w-[40px] text-[10px] font-black",
                                            isWeekend ? "bg-slate-100/50" : "",
                                            isPreferredDate ? "bg-red-50/80 border-red-200 text-red-700 shadow-[inset_0_-2px_0_rgba(239,68,68,0.3)]" : ""
                                        )}>
                                            <div className="flex flex-col">
                                                <span className={cn("text-[8px] font-bold uppercase leading-none mb-0.5", isPreferredDate ? "text-red-500" : "text-slate-400")}>{format(day, 'eee', { locale: ptBR }).slice(0, 3)}</span>
                                                <span className={isPreferredDate ? "text-red-700" : ""}>{format(day, 'd')}</span>
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
                                             "py-2 px-3 sticky left-0 z-10 border-r-2 border-slate-200 text-[10px] sm:text-[11px] font-black truncate max-w-[200px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]",
                                             isEscalantePref ? "bg-red-100 text-red-900" :
                                             isTargetUser ? "bg-indigo-50 text-indigo-800" : "bg-white text-slate-700",
                                             isEven && !isTargetUser && !isEscalantePref ? "bg-slate-50/50" : ""
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
                                             const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                             const isPreferredDate = !isEscalantePref && safeArr(data.selections['ESCALANTE_PREF']).includes(dayStr);
                                             const isSwapDay = !isEscalantePref && data.swapRequests?.some(r => r.rg === rg && r.status === 'pending' && (r.fromDay === dayStr || r.toDay === dayStr));
                                             
                                             return (
                                                 <td 
                                                     key={dayStr} 
                                                     onClick={() => {
                                                         if (canEdit) {
                                                             handleCycleCellStatus(rg, dayStr);
                                                         }
                                                     }}
                                                     className={cn(
                                                         "py-1 px-1 border-r border-slate-100 text-center relative max-w-[40px] select-none",
                                                         isPreferredDate && !isSelected ? "bg-red-50/70 border-r-red-100" :
                                                         isWeekend && !isPreferredDate ? "bg-slate-50/50" : "",
                                                         isEven && !isPreferredDate && !isEscalantePref ? "bg-slate-50/30" : "",
                                                         isSwapDay ? "bg-orange-50 border-orange-200 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.3)] z-10" : "",
                                                         canEdit ? "cursor-pointer hover:bg-indigo-200 hover:shadow-inner" : "hover:bg-slate-100"
                                                     )}
                                                 >
                                                     {isSelected && (
                                                        <div className={cn(
                                                            "mx-auto w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center shadow-sm",
                                                            isEscalantePref ? "bg-red-500 text-white border border-red-600 shadow-red-200" :
                                                            isSwapDay ? "bg-orange-500 text-white shadow-orange-200 border border-orange-600 animate-pulse" :
                                                            isTargetUser ? "bg-indigo-500 text-white" : "bg-slate-600 text-white"
                                                        )}>
                                                            <span className={cn("text-[10px] font-black leading-none pt-[1px]", isEscalantePref && "text-white")}>
                                                                {isEscalantePref ? '★' : 'X'}
                                                            </span>
                                                        </div>
                                                     )}
                                                     {!isSelected && isSwapDay && (
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
           ) : viewMode === 'lista' ? (
                <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6 overflow-y-auto font-mono text-sm text-slate-800">
                    <div className="flex flex-col mb-8">
                        {currentMonthDays.map(day => {
                            const dayStr = format(day, 'yyyy-MM-dd');
                            const dayNum = format(day, 'dd');
                            const selectedUsers = expedienteUsers
                                .filter(u => u.rg !== 'ESCALANTE_PREF' && safeArr(data.selections[u.rg || u.uid]).includes(dayStr))
                                .map(u => formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name))
                                .join(' / ');
                                
                            return (
                                <div key={dayStr} className="flex min-h-[1.5rem]">
                                    <span className="w-8 shrink-0">{dayNum}-</span>
                                    <span>{selectedUsers}</span>
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
           ) : viewMode === 'escala_sv' ? (
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
                                                          <div className="flex items-center gap-1 justify-center mt-0.5" onClick={e => e.stopPropagation()}>
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
                                              <td className={cn("py-1.5 px-3 border-r-2 border-slate-200 text-[11px] font-bold whitespace-nowrap text-center", isWeekend ? "text-amber-900 border-amber-300/50" : "text-slate-700")}>
                                                  {format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
                                              </td>
                                              {paddedUsers.map((u, i) => {
                                                  const isSelected = u && safeArr(data.selections[u.rg || u.uid]).includes(dayStr);
                                                  const isExp = u && safeArr(data.expedienteDays?.[u.rg || u.uid]).includes(dayStr);
                                                  const canClick = u && (isAdmin || user.isEscalante);
                                                  return (
                                                      <td 
                                                          key={u ? (u.rg || u.uid) : `empty-${i}`} 
                                                          onClick={() => {
                                                              if (canClick && u) {
                                                                  handleCycleCellStatus(u.rg || u.uid, dayStr);
                                                              }
                                                          }}
                                                          className={cn("py-1.5 px-3 border-r-2 border-slate-200 text-center text-[11px] font-black transition-colors", isWeekend && "border-amber-300/50", canClick && "cursor-pointer hover:bg-slate-100")}
                                                      >
                                                          {isSelected && <span className="text-slate-900 mx-0.5">SV.</span>}
                                                          {isExp && <span className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded mx-0.5 border border-indigo-200">EXP.</span>}
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
                          
                          // Let's identify who is working this day (for all expedientes) to show on map
                          const workersOnThisDay = Object.entries(data.selections).filter(([rg, sels]: [string, any]) => rg !== 'ESCALANTE_PREF' && Array.isArray(sels) && sels.includes(dayStr)).map(([rg, _]) => {
                               const found = expedienteUsers.find(u => u.rg === rg);
                               if (found) {
                                  return found.rank ? `${found.rank} ${found.warName || found.name.split(' ')[0]}` : found.name;
                               }
                               return null;
                          }).filter(Boolean) as string[];

                          const expWorkersOnThisDay = Object.entries(data.expedienteDays || {}).filter(([rg, sels]: [string, any]) => rg !== 'ESCALANTE_PREF' && Array.isArray(sels) && sels.includes(dayStr)).map(([rg, _]) => {
                               const found = expedienteUsers.find(u => u.rg === rg);
                               if (found) {
                                  return found.rank ? `${found.rank} ${found.warName || found.name.split(' ')[0]}` : found.name;
                               }
                               return null;
                          }).filter(Boolean) as string[];
                          
                          const alaOfDay = getAlaForDate(day);
                          const alaLightColorClass = getAlaLightColor(alaOfDay);
                          const alaPointColorClass = getAlaColor(alaOfDay);
                          
                          return (
                            <motion.div 
                              key={day.toISOString()}
                              whileHover={!outsideMonth ? { scale: 1.02 } : {}}
                              onClick={() => !outsideMonth && handleToggleDay(day)}
                              className={cn(
                                "relative flex flex-col p-3 sm:p-2 border-2 rounded-xl sm:rounded-lg transition-all sm:min-h-[110px]",
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
                                          <div className="flex flex-row sm:flex-col flex-wrap gap-1.5 sm:gap-1 w-full min-w-0 overflow-hidden">
                                              {Object.entries(data.preferencesDetails?.[dayStr] || {}).map(([func, qt]) => (
                                                 <span key={func} className="text-[10px] sm:text-[9px] font-bold bg-red-100 text-red-700 border border-red-200 px-2 py-1 sm:px-1.5 sm:py-1 rounded-[4px] uppercase truncate leading-none max-w-full inline-block" title={`${qt}x ${func}`}>
                                                    {qt}x {func}
                                                 </span>
                                              ))}
                                          </div>
                                      )}

                                      {workersOnThisDay.length > 0 && (
                                          <div className="flex flex-row sm:flex-col flex-wrap gap-1.5 sm:gap-1 sm:mt-1 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0 w-full min-w-0 overflow-hidden">
                                              {workersOnThisDay.map((name, i) => (
                                                 <span key={i} className={cn(
                                                     "text-[10px] sm:text-[9px] font-black bg-slate-800 text-white px-2 py-1 sm:px-1.5 sm:py-1 rounded-[4px] uppercase truncate leading-none cursor-help max-w-full inline-block",
                                                     i >= 5 ? "hidden" : ""
                                                 )} title={name}>
                                                    {formatMilitaryName(name)}
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

                               {!outsideMonth && isTargetUserSelected && activeRg && activeRg !== 'ESCALANTE_PREF' && !data.locked?.[activeRg] && (
                                   <button 
                                      onClick={async (e) => {
                                          e.stopPropagation();
                                          const newMonthData = {
                                              locked: {
                                                  [activeRg]: true
                                              }
                                          };
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
                                   {!data.locked?.[activeRg] ? (
                                      !confirmLock ? (
                                          <button 
                                            onClick={() => setConfirmLock(true)}
                                            className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm"
                                          >
                                            <Save className="w-3.5 h-3.5" /> Enviar Escolhas
                                          </button>
                                      ) : (
                                          <div className="flex flex-col gap-2">
                                              <span className="text-[10px] text-white/80 font-bold text-center">Confirmar o envio definitivo?</span>
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
                                                            locked: {
                                                                [activeRg!]: true
                                                            }
                                                        };
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
                                              <span>Enviado e Bloqueado</span>
                                          </div>
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
