import React, { useState, useEffect, useMemo } from 'react';
import { useMilitars } from '../../../contexts/MilitarContext';
import { db } from '../../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Anchor,
  Shield, 
  Search,
  X,
  Plus,
  Calendar as CalendarIcon,
  Settings,
  Users,
  Wand2,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  getDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, cleanUndefined } from '../../../lib/utils';
import { parseRank, sortOfficersBySeniority, COLS_OFICIAIS } from '../../../lib/rankUtils';
import { resolveCanonicalScope, formatScopeLabel } from '../../../lib/canonicalScope';
import { GenericOfficerGrdModuleProps } from '../types';
import { calculateOfficerQuotas } from '../lib/officerQuotas';

export function GenericOfficerGrdModule({ 
  user, 
  obmContext, 
  setObmContext, 
  availableObms = [], 
  config 
}: GenericOfficerGrdModuleProps) {
  const { militars } = useMilitars();
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    if (today.getDate() >= 20) {
      return addMonths(today, 1);
    }
    return today;
  });
  const [officerData, setOfficerData] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchDay, setActiveSearchDay] = useState<{ date: string; field: string } | null>(null);
  const [selectedRgsOficialDia, setSelectedRgsOficialDia] = useState<string[]>([]);
  const [selectedRgsSobreaviso, setSelectedRgsSobreaviso] = useState<string[]>([]);
  const [configTab, setConfigTab] = useState<'oficialDia' | 'sobreaviso'>('oficialDia');
  const [showConfig, setShowConfig] = useState(false);
  const [poolConfig, setPoolConfig] = useState<string[] | null>(null);
  const [isQuotasExpanded, setIsQuotasExpanded] = useState(true);

  const isCyan = config.themeColor === 'cyan';
  const IconComponent = config.icon === 'anchor' ? Anchor : Shield;

  const isGlobal = obmContext === 'GLOBAL';
  const poolDocId = (obmContext === 'GLOBAL' ? '10º_GBM' : (obmContext || '10º GBM')).replace(/°/g, 'º').replace(/\//g, '_').replace(/\s/g, '_');
  const obmId = isGlobal ? 'GLOBAL' : (obmContext || '10º GBM').replace(/\//g, '_').replace(/\s/g, '_');
  const docId = obmId;

  // Listen to officer pool config
  useEffect(() => {
    let isMounted = true;

    // 1. Carga inicial rápida via API
    fetch(`/api/officer-pool?obm=${encodeURIComponent(obmContext || '10º GBM')}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && data.config) {
          const list = data.config[config.poolConfigField];
          if (Array.isArray(list) && list.length > 0) {
            setPoolConfig(list.map((r: any) => String(r).trim()));
          }
        }
      })
      .catch(() => {});

    // 2. Listener Firestore
    const unsub = onSnapshot(doc(db, 'officer_pool_config', poolDocId), (snap) => {
      if (!isMounted) return;
      if (snap.exists() && snap.data()[config.poolConfigField] !== undefined) {
        const rawList = snap.data()[config.poolConfigField] || [];
        setPoolConfig(rawList.map((r: any) => String(r).trim()));
      } else {
        setPoolConfig(null);
      }
    }, (err) => {
      console.warn('[GenericOfficerGrdModule] officer_pool_config notice:', err?.message);
    });
    return () => {
      isMounted = false;
      unsub();
    };
  }, [poolDocId, config.poolConfigField, obmContext]);

  // Listen to monthly scales
  useEffect(() => {
    setLoading(true);
    let isMounted = true;
    
    // Carga inicial rápida via API backend
    const targetDoc = isGlobal ? '10º_GBM' : docId;
    fetch(`/api/officer-scales?collection=${encodeURIComponent(config.collectionName)}&docId=${encodeURIComponent(targetDoc)}`)
      .then(res => res.json())
      .then(res => {
        if (!isMounted) return;
        if (res.success && res.data) {
          const data = res.data;
          if (data.days && !isGlobal) {
            setOfficerData(prev => ({ ...data.days, ...prev }));
          }
          const monthKey = format(currentDate, 'yyyy-MM');
          if (data.lists && data.lists[monthKey]) {
            const currentMonthLists = data.lists[monthKey];
            if (Array.isArray(currentMonthLists)) {
              setSelectedRgsOficialDia(currentMonthLists);
              setSelectedRgsSobreaviso([]);
            } else {
              setSelectedRgsOficialDia(currentMonthLists.oficialDia || []);
              setSelectedRgsSobreaviso(currentMonthLists.sobreaviso || []);
            }
          }
        }
      })
      .catch(() => {});

    if (isGlobal) {
      let db10: Record<string, any> = {};
      let db26: Record<string, any> = {};
      
      const updateMerged = () => {
         const merged: Record<string, Record<string, string>> = {};
         const allDates = new Set([...Object.keys(db10), ...Object.keys(db26)]);
         allDates.forEach(date => {
            merged[date] = {
               '10º_GBM-oficialDia': db10[date]?.oficialDia || '',
               '10º_GBM-sobreaviso': db10[date]?.sobreaviso || '',
               '26º_GBM-oficialDia': db26[date]?.oficialDia || '',
               '26º_GBM-sobreaviso': db26[date]?.sobreaviso || ''
            };
         });
         setOfficerData(merged);
      };

      const unsub10 = onSnapshot(doc(db, config.collectionName, '10º_GBM'), (snap) => {
          if (snap.exists()) db10 = snap.data().days || {};
          else db10 = {};
          updateMerged();
      }, (err) => {
          console.warn('[GenericOfficerGrdModule] unsub10 notice:', err?.message);
      });
      
      const unsub26 = onSnapshot(doc(db, config.collectionName, '26º_GBM'), (snap) => {
          if (snap.exists()) db26 = snap.data().days || {};
          else db26 = {};
          updateMerged();
      }, (err) => {
          console.warn('[GenericOfficerGrdModule] unsub26 notice:', err?.message);
      });
      
      return () => { isMounted = false; unsub10(); unsub26(); };
    } else {
      const unsubscribe = onSnapshot(doc(db, config.collectionName, docId), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setOfficerData(data.days || {});
          const monthKey = format(currentDate, 'yyyy-MM');
          if (data.lists && data.lists[monthKey]) {
             const currentMonthLists = data.lists[monthKey];
             if (Array.isArray(currentMonthLists)) {
                 setSelectedRgsOficialDia(currentMonthLists);
                 setSelectedRgsSobreaviso([]);
             } else {
                 setSelectedRgsOficialDia(currentMonthLists.oficialDia || []);
                 setSelectedRgsSobreaviso(currentMonthLists.sobreaviso || []);
             }
          } else {
             setSelectedRgsOficialDia([]);
             setSelectedRgsSobreaviso([]);
          }
        } else {
          setOfficerData({});
          setSelectedRgsOficialDia([]);
          setSelectedRgsSobreaviso([]);
        }
        setLoading(false);
      }, (error) => {
        console.error(`Error loading ${config.title} scale:`, error);
        setLoading(false);
      });

      return () => { isMounted = false; unsubscribe(); };
    }
  }, [obmContext, currentDate, config.collectionName, config.title, docId, isGlobal]);

  const monthDaysOnly = useMemo(() => {
    return eachDayOfInterval({ 
      start: startOfMonth(currentDate), 
      end: endOfMonth(currentDate) 
    });
  }, [currentDate]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleToggleOfficer = async (rg: string) => {
    const monthKey = format(currentDate, 'yyyy-MM');
    let newOficialDia = [...selectedRgsOficialDia];
    let newSobreaviso = [...selectedRgsSobreaviso];

    if (configTab === 'oficialDia') {
        newOficialDia = newOficialDia.includes(rg) ? newOficialDia.filter(r => r !== rg) : [...newOficialDia, rg];
        setSelectedRgsOficialDia(newOficialDia);
    } else if (configTab === 'sobreaviso') {
        newSobreaviso = newSobreaviso.includes(rg) ? newSobreaviso.filter(r => r !== rg) : [...newSobreaviso, rg];
        setSelectedRgsSobreaviso(newSobreaviso);
    }
    
    const payload = cleanUndefined({
      lists: {
        [monthKey]: {
          oficialDia: newOficialDia,
          sobreaviso: newSobreaviso
        }
      }
    });

    // Persistência via backend com credenciais seguras de servidor
    try {
      await fetch('/api/officer-scales/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionName: config.collectionName,
          docId,
          data: payload
        })
      });
    } catch (err: any) {
      console.warn('[GenericOfficerGrdModule] Erro ao salvar:', err?.message);
    }
  };

  const availableOfficers = useMemo(() => {
    if (!poolConfig || poolConfig.length === 0) {
      return militars
        .filter(m => {
          const rawMObm = m.obm ? m.obm : '10º GBM';
          const mObm = rawMObm.replace(/º/g, '°').trim().toUpperCase();
          const ctxObm = (obmContext || '').replace(/º/g, '°').trim().toUpperCase();
          if (ctxObm && ctxObm !== 'GLOBAL' && mObm !== ctxObm) return false;
          const r = parseRank(m.rank);
          return COLS_OFICIAIS.includes(r);
        })
        .sort(sortOfficersBySeniority);
    }
    const cleanPool = (poolConfig || []).map(r => String(r).trim());
    return militars
      .filter(m => cleanPool.includes(String(m.rg || '').trim()))
      .sort(sortOfficersBySeniority);
  }, [militars, poolConfig, obmContext]);

  const distributionQuotas = useMemo(() => {
    const rawList = configTab === 'oficialDia' ? selectedRgsOficialDia : selectedRgsSobreaviso;
    const currentActiveList = (rawList || []).map(r => String(r).trim());
    const activeOfficers = availableOfficers.filter(m => currentActiveList.includes(String(m.rg || '').trim()));
    return calculateOfficerQuotas(activeOfficers, monthDaysOnly);
  }, [availableOfficers, selectedRgsOficialDia, selectedRgsSobreaviso, configTab, monthDaysOnly]);

  const getOfficerFilledDays = (distRg: string, distName: string) => {
    const militarObj = availableOfficers.find(m => String(m.rg || '').trim() === String(distRg || '').trim());
    const warName = militarObj?.warName?.trim().toUpperCase() || '';
    const cleanName = (militarObj?.name || '').trim().toUpperCase();
    const firstName = cleanName.split(' ')[0] || '';
    const upperDistName = distName.trim().toUpperCase();

    let filledRed = 0;
    let filledPurple = 0;
    let filledBlack = 0;

    monthDaysOnly.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const assignedVal = (officerData[dateStr]?.[configTab] || '').trim().toUpperCase();
      if (!assignedVal) return;

      const isMatch =
        assignedVal === upperDistName ||
        (warName && assignedVal.includes(warName)) ||
        (distRg && assignedVal.includes(distRg)) ||
        (firstName && assignedVal.endsWith(' ' + firstName));

      if (isMatch) {
        const dayOfWeek = getDay(day);
        if (dayOfWeek === 0 || dayOfWeek === 6) filledRed++;
        else if (dayOfWeek === 5) filledPurple++;
        else filledBlack++;
      }
    });

    const filledTotal = filledRed + filledPurple + filledBlack;
    return { filledRed, filledPurple, filledBlack, filledTotal };
  };

  const handleGenerateScale = async () => {
    const label = configTab === 'oficialDia' ? config.configSelectorLabel1 : config.configSelectorLabel2;
    if (!window.confirm(`Isso irá sobrescrever a coluna de ${label} com a distribuição automática. Deseja continuar?`)) return;
    
    setSaving(true);
    try {
        const updates: Record<string, any> = {};
        
        distributionQuotas.forEach(officer => {
            const allDays = [...officer.daysRed, ...officer.daysPurple, ...officer.daysBlack];
            allDays.forEach(day => {
                updates[`days.${day}.${configTab}`] = officer.name;
            });
        });
        
        if (Object.keys(updates).length > 0) {
            const newOfficerData: Record<string, Record<string, string>> = {};
            distributionQuotas.forEach(officer => {
                const allDays = [...officer.daysRed, ...officer.daysPurple, ...officer.daysBlack];
                allDays.forEach(day => {
                    if (!newOfficerData[day]) newOfficerData[day] = {};
                    newOfficerData[day][configTab] = officer.name;
                });
            });

            // Atualização otimista no estado local
            setOfficerData(prev => {
              const updated = { ...prev };
              Object.entries(newOfficerData).forEach(([d, vals]) => {
                updated[d] = { ...(updated[d] || {}), ...vals };
              });
              return updated;
            });

            const payload = cleanUndefined({
                days: newOfficerData
            });

            // Persistência via API backend com credenciais seguras de servidor
            try {
              await fetch('/api/officer-scales/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  collectionName: config.collectionName,
                  docId,
                  data: payload
                })
              });
            } catch (e: any) {
              console.warn('[GenericOfficerGrdModule] Erro ao salvar escala automática:', e?.message);
            }
        }
    } catch (err) {
        console.error('Erro ao gerar escala automática:', err);
    } finally {
        setSaving(false);
    }
  };

  const updateOfficerDay = async (dateStr: string, field: string, value: string) => {
    setOfficerData(prev => ({
      ...prev,
      [dateStr]: {
        ...prev[dateStr],
        [field]: value
      }
    }));
    
    setSaving(true);
    try {
      if (isGlobal) {
         const is10 = field.startsWith('10º_GBM');
         const realField = field.split('-')[1];
         const targetId = is10 ? '10º_GBM' : '26º_GBM';
         const payload = cleanUndefined({
            days: {
              [dateStr]: {
                [realField]: value
              }
            }
          });

         try {
           await fetch('/api/officer-scales/update', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               collectionName: config.collectionName,
               docId: targetId,
               data: payload
             })
           });
         } catch (e: any) {
           console.warn('[GenericOfficerGrdModule] Erro na API ao atualizar dia:', e?.message);
         }
      } else {
         const payload = cleanUndefined({
            days: {
              [dateStr]: {
                [field]: value
              }
            }
          });

         try {
           await fetch('/api/officer-scales/update', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               collectionName: config.collectionName,
               docId,
               data: payload
             })
           });
         } catch (e: any) {
           console.warn('[GenericOfficerGrdModule] Erro na API ao atualizar dia:', e?.message);
         }
      }
    } catch (error) {
      console.error(`Error saving ${config.title} scale:`, error);
    } finally {
      setSaving(false);
    }
  };

  const isRowWeekend = (date: Date) => {
    const day = getDay(date);
    return day === 0 || day === 6;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Top Header */}
      <div className="p-4 sm:p-6 border-b bg-white flex flex-col sm:flex-row items-center justify-between shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-xl text-white", isCyan ? "bg-cyan-700" : "bg-emerald-700")}>
            <IconComponent className="w-6 h-6 shrink-0" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter shrink-0 leading-tight">
              {config.title}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unidade: {obmContext}</span>
              {availableObms.length > 1 && setObmContext && (
                <select
                  value={obmContext}
                  onChange={(e) => setObmContext(e.target.value)}
                  className={cn(
                    "bg-slate-100 border border-slate-200 text-slate-500 text-[10px] uppercase font-black tracking-widest rounded px-1.5 py-0.5 outline-none transition-colors",
                    isCyan ? "focus:border-cyan-500" : "focus:border-emerald-500"
                  )}
                >
                  {availableObms.map((obm) => {
                    const label = obm === 'GLOBAL' ? '🌐 TODAS AS UNIDADES' : formatScopeLabel(resolveCanonicalScope(obm));
                    return (
                      <option key={obm} value={obm}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center bg-slate-100 rounded-lg p-1 justify-between flex-1 sm:flex-none w-full sm:w-[220px]">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-white rounded-md transition-all shadow-sm">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="text-xs font-black uppercase tracking-widest text-slate-700 mx-2 text-center flex-1">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button onClick={handleNextMonth} className="p-2 hover:bg-white rounded-md transition-all shadow-sm">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Global User Info & Configuration Toggle */}
        <div className="flex items-center gap-4">
          {!isGlobal && (
            <button
              onClick={() => setShowConfig(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase rounded-lg transition-colors border border-slate-200"
            >
              <Settings className="w-4 h-4" />
              Configurar Escala
            </button>
          )}

          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Militar Conectado</span>
            <span className={cn("text-xs font-black uppercase", isCyan ? "text-cyan-700" : "text-emerald-700")}>
              {user.rank} {user.warName || (user.name || '').split(' ')[0]}
            </span>
          </div>
        </div>
      </div>

      {/* Modal de Configuração de Oficiais do Mês */}
      {showConfig && !isGlobal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border-2", isCyan ? "bg-cyan-100 border-cyan-200" : "bg-emerald-100 border-emerald-200")}>
                   <Shield className={cn("w-5 h-5", isCyan ? "text-cyan-700" : "text-emerald-700")} />
                </div>
                <div>
                  <h3 className={cn("text-sm font-black uppercase tracking-widest flex items-center gap-2", isCyan ? "text-[#0e7490]" : "text-[#406b53]")}>
                    <Settings className="w-4 h-4" /> {config.distTitle}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Selecione quem entra na escala de {format(currentDate, 'MMMM yyyy', { locale: ptBR })}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateScale}
                  disabled={saving || distributionQuotas.length === 0}
                  className={cn(
                    "px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white rounded transition-colors flex items-center gap-1 disabled:opacity-50",
                    isCyan ? "bg-[#0e7490] hover:bg-[#164e63]" : "bg-[#406b53] hover:bg-[#305542]"
                  )}
                  title="Distribuir dias e cotas automaticamente"
                >
                  <Wand2 className="w-3.5 h-3.5" /> Gerar Escala
                </button>
                <button
                  onClick={() => setShowConfig(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Abas de Configuração */}
            <div className="flex border-b border-slate-200 px-6 pt-3 gap-2 bg-slate-50">
               <button
                 onClick={() => setConfigTab('oficialDia')}
                 className={cn(
                   "px-3 py-1 text-[11px] font-black uppercase tracking-widest rounded-t-md transition-all",
                   configTab === 'oficialDia' 
                     ? (isCyan ? "bg-[#0e7490] text-white" : "bg-[#406b53] text-white") 
                     : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                 )}
               >
                 {config.configSelectorLabel1}
               </button>
               <button
                 onClick={() => setConfigTab('sobreaviso')}
                 className={cn(
                   "px-3 py-1 text-[11px] font-black uppercase tracking-widest rounded-t-md transition-all",
                   configTab === 'sobreaviso' 
                     ? (isCyan ? "bg-[#0e7490] text-white" : "bg-[#406b53] text-white") 
                     : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                 )}
               >
                 {config.configSelectorLabel2}
               </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
              {/* Pool Selection */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-3">
                  Selecione os Oficiais para a Escala ({configTab === 'oficialDia' ? config.configSelectorLabel1 : config.configSelectorLabel2}):
                </h4>
                {availableOfficers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nenhum militar configurado no pool desta unidade.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {availableOfficers.map((officer) => {
                      const isSelected = configTab === 'oficialDia' 
                        ? selectedRgsOficialDia.includes(officer.rg) 
                        : selectedRgsSobreaviso.includes(officer.rg);
                      return (
                        <button
                          key={officer.rg}
                          onClick={() => handleToggleOfficer(officer.rg)}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg border text-left transition-all",
                            isSelected 
                              ? (isCyan ? "bg-cyan-50 border-cyan-500 text-cyan-700" : "bg-emerald-50 border-emerald-500 text-emerald-700") 
                              : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                          )}
                        >
                          <div className={cn(
                            "w-4 h-4 rounded flex items-center justify-center border",
                            isSelected 
                              ? (isCyan ? "bg-cyan-600 border-cyan-600 text-white" : "bg-emerald-600 border-emerald-600 text-white") 
                              : "border-slate-300 bg-white"
                          )}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="text-[11px] font-bold uppercase truncate">
                            {parseRank(officer.rank)} {officer.warName || (officer.name || '').split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Distribution Preview Table */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-3 flex items-center justify-between">
                  <span>Previsão de Cotas (Ordenado por Antiguidade)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Vermelho: Fim de semana | Roxo: Sexta-feira | Preto: Seg-Qui</span>
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                        <th className="px-3 py-2 border-r border-slate-200">Oficial</th>
                        <th className="px-3 py-2 border-r border-slate-200 text-center text-rose-600">FDS (Vermelho)</th>
                        <th className="px-3 py-2 border-r border-slate-200 text-center text-purple-600">Sexta (Roxo)</th>
                        <th className="px-3 py-2 border-r border-slate-200 text-center text-slate-700">Semana (Preto)</th>
                        <th className={cn("px-3 py-2 border-r border-slate-200 text-center", isCyan ? "text-cyan-700" : "text-emerald-700")}>Total (Cota)</th>
                        <th className="px-3 py-2 text-center text-slate-700">Validação / Preenchimento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {distributionQuotas.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-4 text-slate-400 italic">
                            Nenhum oficial selecionado para cálculo.
                          </td>
                        </tr>
                      ) : (
                        distributionQuotas.map((dist) => {
                          const { filledRed, filledPurple, filledBlack, filledTotal } = getOfficerFilledDays(dist.rg, dist.name);
                          const isComplete = dist.quotaTotal > 0 && filledTotal === dist.quotaTotal;
                          const isExceeded = dist.quotaTotal > 0 && filledTotal > dist.quotaTotal;
                          const isPartial = dist.quotaTotal > 0 && filledTotal > 0 && filledTotal < dist.quotaTotal;
                          const isZero = dist.quotaTotal > 0 && filledTotal === 0;

                          return (
                            <tr key={dist.rg} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3 py-2 border-r border-slate-100 font-bold uppercase text-slate-700">{dist.name}</td>
                              <td className="px-3 py-2 border-r border-slate-100 text-center font-black text-rose-600">{dist.quotaRed}</td>
                              <td className="px-3 py-2 border-r border-slate-100 text-center font-black text-purple-600">{dist.quotaPurple}</td>
                              <td className="px-3 py-2 border-r border-slate-100 text-center font-black text-slate-800">{dist.quotaBlack}</td>
                              <td className={cn("px-3 py-2 border-r border-slate-100 text-center font-black", isCyan ? "text-cyan-700 bg-cyan-50" : "text-emerald-700 bg-emerald-50")}>
                                {dist.quotaTotal}
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                <div className="flex flex-col items-center justify-center">
                                  {isComplete && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Preenchido ({filledTotal}/{dist.quotaTotal})
                                    </span>
                                  )}
                                  {isExceeded && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-100 text-cyan-800 border border-cyan-300 shadow-sm">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" /> Excedente ({filledTotal}/{dist.quotaTotal})
                                    </span>
                                  )}
                                  {isPartial && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-sm">
                                      <Clock className="w-3.5 h-3.5 text-amber-600" /> {filledTotal}/{dist.quotaTotal} (Falta {dist.quotaTotal - filledTotal})
                                    </span>
                                  )}
                                  {isZero && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                      <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Pendente (0/{dist.quotaTotal})
                                    </span>
                                  )}
                                  {dist.quotaTotal === 0 && (
                                    <span className="text-[10px] font-bold text-slate-400 italic">Sem cota</span>
                                  )}

                                  {dist.quotaTotal > 0 && (
                                    <div className="text-[9px] text-slate-400 font-medium mt-0.5 flex items-center gap-1.5 whitespace-nowrap">
                                      <span className={cn(filledRed >= dist.quotaRed ? "text-slate-600" : "text-rose-600 font-bold")}>
                                        {filledRed}/{dist.quotaRed} FDS
                                      </span>
                                      <span>·</span>
                                      <span className={cn(filledPurple >= dist.quotaPurple ? "text-slate-600" : "text-purple-600 font-bold")}>
                                        {filledPurple}/{dist.quotaPurple} Sex
                                      </span>
                                      <span>·</span>
                                      <span className={cn(filledBlack >= dist.quotaBlack ? "text-slate-600" : "text-slate-700 font-bold")}>
                                        {filledBlack}/{dist.quotaBlack} Sem
                                      </span>
                                    </div>
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
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowConfig(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold uppercase rounded-lg transition-colors"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6">
        {/* Seção Superior Expansível: Previsão de Cotas / Tabela Configurada */}
        {!isGlobal && (
          <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className={cn("text-sm font-black uppercase tracking-widest flex items-center gap-2", isCyan ? "text-cyan-800" : "text-emerald-800")}>
                  <Shield className={cn("w-4 h-4", isCyan ? "text-cyan-600" : "text-emerald-600")} />
                  Previsão de Cotas (Ordenado por Antiguidade)
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  Vermelho: Fim de semana | Roxo: Sexta-feira | Preto: Seg-Qui
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Abas para alternar entre as 2 funções da escala */}
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    onClick={() => setConfigTab('oficialDia')}
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all",
                      configTab === 'oficialDia'
                        ? (isCyan ? "bg-cyan-600 text-white shadow-sm" : "bg-emerald-600 text-white shadow-sm")
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {config.configSelectorLabel1}
                  </button>
                  <button
                    onClick={() => setConfigTab('sobreaviso')}
                    className={cn(
                      "px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all",
                      configTab === 'sobreaviso'
                        ? (isCyan ? "bg-cyan-600 text-white shadow-sm" : "bg-emerald-600 text-white shadow-sm")
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {config.configSelectorLabel2}
                  </button>
                </div>

                {/* Botão para Configurar Oficiais */}
                <button
                  onClick={() => setShowConfig(true)}
                  className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-200"
                >
                  <Users className="w-3.5 h-3.5" /> Configurar Seleção
                </button>

                {/* Botão de Expandir / Diminuir */}
                <button
                  onClick={() => setIsQuotasExpanded(!isQuotasExpanded)}
                  className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
                  title={isQuotasExpanded ? "Diminuir / Recolher seção" : "Expandir seção"}
                >
                  {isQuotasExpanded ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" /> Recolher
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" /> Expandir Cotas
                    </>
                  )}
                </button>
              </div>
            </div>

            {!isQuotasExpanded ? (
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 py-1">
                <span>
                  {distributionQuotas.length} oficiais configurados na cota de {configTab === 'oficialDia' ? config.configSelectorLabel1 : config.configSelectorLabel2} ({format(currentDate, 'MMMM yyyy', { locale: ptBR })}).
                </span>
                <button
                  onClick={() => setIsQuotasExpanded(true)}
                  className={cn("text-xs font-black uppercase tracking-wider flex items-center gap-1", isCyan ? "text-cyan-700 hover:text-cyan-800" : "text-emerald-700 hover:text-emerald-800")}
                >
                  Expandir Tabela <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <th className="px-3 py-2 border-r border-slate-200">Oficial</th>
                      <th className="px-3 py-2 border-r border-slate-200 text-center text-rose-600">FDS (Vermelho)</th>
                      <th className="px-3 py-2 border-r border-slate-200 text-center text-purple-600">Sexta (Roxo)</th>
                      <th className="px-3 py-2 border-r border-slate-200 text-center text-slate-700">Semana (Preto)</th>
                      <th className={cn("px-3 py-2 border-r border-slate-200 text-center", isCyan ? "text-cyan-700" : "text-emerald-700")}>Total (Cota)</th>
                      <th className="px-3 py-2 text-center text-slate-700">Validação / Preenchimento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {distributionQuotas.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-4 text-slate-400 italic">
                          Nenhum oficial selecionado para cálculo nesta função. Clique em "Configurar Seleção" para selecionar.
                        </td>
                      </tr>
                    ) : (
                      distributionQuotas.map((dist) => {
                        const { filledRed, filledPurple, filledBlack, filledTotal } = getOfficerFilledDays(dist.rg, dist.name);
                        const isComplete = dist.quotaTotal > 0 && filledTotal === dist.quotaTotal;
                        const isExceeded = dist.quotaTotal > 0 && filledTotal > dist.quotaTotal;
                        const isPartial = dist.quotaTotal > 0 && filledTotal > 0 && filledTotal < dist.quotaTotal;
                        const isZero = dist.quotaTotal > 0 && filledTotal === 0;

                        return (
                          <tr key={dist.rg} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-2 border-r border-slate-100 font-bold uppercase text-slate-700">{dist.name}</td>
                            <td className="px-3 py-2 border-r border-slate-100 text-center font-black text-rose-600">{dist.quotaRed}</td>
                            <td className="px-3 py-2 border-r border-slate-100 text-center font-black text-purple-600">{dist.quotaPurple}</td>
                            <td className="px-3 py-2 border-r border-slate-100 text-center font-black text-slate-800">{dist.quotaBlack}</td>
                            <td className={cn("px-3 py-2 border-r border-slate-100 text-center font-black", isCyan ? "text-cyan-700 bg-cyan-50" : "text-emerald-700 bg-emerald-50")}>
                              {dist.quotaTotal}
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <div className="flex flex-col items-center justify-center">
                                {isComplete && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Preenchido ({filledTotal}/{dist.quotaTotal})
                                  </span>
                                )}
                                {isExceeded && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-100 text-cyan-800 border border-cyan-300 shadow-sm">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" /> Excedente ({filledTotal}/{dist.quotaTotal})
                                  </span>
                                )}
                                {isPartial && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-sm">
                                    <Clock className="w-3.5 h-3.5 text-amber-600" /> {filledTotal}/{dist.quotaTotal} (Falta {dist.quotaTotal - filledTotal})
                                  </span>
                                )}
                                {isZero && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Pendente (0/{dist.quotaTotal})
                                  </span>
                                )}
                                {dist.quotaTotal === 0 && (
                                  <span className="text-[10px] font-bold text-slate-400 italic">Sem cota</span>
                                )}

                                {dist.quotaTotal > 0 && (
                                  <div className="text-[9px] text-slate-400 font-medium mt-0.5 flex items-center gap-1.5 whitespace-nowrap">
                                    <span className={cn(filledRed >= dist.quotaRed ? "text-slate-600" : "text-rose-600 font-bold")}>
                                      {filledRed}/{dist.quotaRed} FDS
                                    </span>
                                    <span>·</span>
                                    <span className={cn(filledPurple >= dist.quotaPurple ? "text-slate-600" : "text-purple-600 font-bold")}>
                                      {filledPurple}/{dist.quotaPurple} Sex
                                    </span>
                                    <span>·</span>
                                    <span className={cn(filledBlack >= dist.quotaBlack ? "text-slate-600" : "text-slate-700 font-bold")}>
                                      {filledBlack}/{dist.quotaBlack} Sem
                                    </span>
                                  </div>
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
            )}
          </div>
        )}

        <div className="min-w-[1000px] bg-white border border-slate-300 shadow-xl overflow-hidden rounded-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={cn("border-b border-slate-400", isCyan ? "bg-[#0e7490]" : "bg-[#406b53]")}>
                <th className={cn("px-3 py-4 text-[11px] font-black uppercase tracking-widest text-white border-r w-32 shrink-0", isCyan ? "border-[#164e63]" : "border-[#305542]")}>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 opacity-50" />
                    DATA
                  </div>
                </th>
                <th className={cn("px-3 py-4 text-[11px] font-black uppercase tracking-widest text-white border-r w-40 shrink-0", isCyan ? "border-[#164e63]" : "border-[#305542]")}>
                  DIA
                </th>
                {isGlobal ? (
                  <>
                    <th className={cn("px-3 py-4 text-[10px] font-black uppercase tracking-widest text-white border-r", isCyan ? "border-[#164e63] bg-[#0c6a85]" : "border-[#305542] bg-[#3a614b]")}>
                      {config.col1Global10Label || `${config.col1Label} (10º GBM)`}
                    </th>
                    <th className={cn("px-3 py-4 text-[10px] font-black uppercase tracking-widest text-white border-r", isCyan ? "border-[#164e63] bg-[#0c6a85]" : "border-[#305542] bg-[#3a614b]")}>
                      {config.col1Global26Label || `${config.col1Label} (26º GBM)`}
                    </th>
                    <th className={cn("px-3 py-4 text-[10px] font-black uppercase tracking-widest text-white border-r", isCyan ? "border-[#164e63]" : "border-[#305542]")}>
                      {config.col2Global10Label || `${config.col2Label} (10º GBM)`}
                    </th>
                    <th className="px-3 py-4 text-[10px] font-black uppercase tracking-widest text-white">
                      {config.col2Global26Label || `${config.col2Label} (26º GBM)`}
                    </th>
                  </>
                ) : (
                  <>
                    <th className={cn("px-3 py-4 text-[11px] font-black uppercase tracking-widest text-white border-r", isCyan ? "border-[#164e63]" : "border-[#305542]")}>
                      {config.col1Label}
                    </th>
                    <th className="px-3 py-4 text-[11px] font-black uppercase tracking-widest text-white">
                      {config.col2Label}
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {monthDaysOnly.map((date) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const isFds = isRowWeekend(date);
                const dayOfWeekNum = getDay(date);
                const isFriday = dayOfWeekNum === 5;
                const rowData = officerData[dateStr] || {};

                const dateColorClass = isFds 
                  ? "text-rose-600 bg-rose-50/50" 
                  : (isFriday ? "text-purple-600 bg-purple-50/30" : "text-slate-800");

                const fields = isGlobal 
                  ? ['10º_GBM-oficialDia', '26º_GBM-oficialDia', '10º_GBM-sobreaviso', '26º_GBM-sobreaviso']
                  : ['oficialDia', 'sobreaviso'];

                return (
                  <tr 
                    key={dateStr}
                    className={cn(
                      "transition-colors h-12 border-b border-slate-300",
                      isToday(date) ? "bg-amber-50/60" : "hover:bg-slate-50/80"
                    )}
                  >
                    {/* DATA */}
                    <td className={cn(
                      "px-3 py-2 border-r border-slate-300 font-mono text-[11px] font-bold tracking-tight whitespace-nowrap",
                      dateColorClass
                    )}>
                      {format(date, 'dd/MM/yyyy')}
                    </td>

                    {/* DIA */}
                    <td className={cn(
                      "px-3 py-2 border-r border-slate-300 text-[11px] font-black uppercase tracking-tight whitespace-nowrap",
                      dateColorClass
                    )}>
                      {format(date, 'EEEE', { locale: ptBR })}
                    </td>

                    {/* Cells for Fields */}
                    {fields.map((field) => {
                      const val = rowData[field] || '';
                      const isMe = user && val.includes(user.warName || (user.name || '').split(' ')[0]);
                      const isActiveSearch = activeSearchDay?.date === dateStr && activeSearchDay?.field === field;

                      return (
                        <td key={field} className="px-2 py-1.5 border-r border-slate-300 last:border-r-0 relative">
                          <button
                            onClick={() => {
                              setActiveSearchDay({ date: dateStr, field });
                              setSearchTerm('');
                            }}
                            className={cn(
                              "w-full h-full min-h-[40px] px-3 py-2 text-[12px] font-black uppercase text-left rounded-md transition-all flex items-center justify-between group",
                              val 
                                ? (isMe ? (isCyan ? "bg-cyan-600 text-white shadow-md" : "bg-emerald-600 text-white shadow-md") : "bg-white text-slate-700") 
                                : cn("bg-white/50 border border-dashed border-slate-300 text-slate-300", isCyan ? "hover:border-cyan-500 hover:text-cyan-600" : "hover:border-emerald-500 hover:text-emerald-600")
                            )}
                          >
                            <span className="truncate">{val || "Vaga Disponível"}</span>
                            {val && (
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateOfficerDay(dateStr, field, '');
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/10 rounded transition-opacity"
                                title="Limpar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </button>

                          {isActiveSearch && (
                            <div className={cn(
                              "absolute top-0 left-0 w-80 bg-white shadow-2xl border rounded-xl z-50 p-2 mt-12 animate-in fade-in zoom-in-95 duration-200",
                              isCyan ? "border-cyan-200" : "border-emerald-200"
                            )}>
                              <div className="relative mb-2">
                                <Search className={cn("w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2", isCyan ? "text-cyan-600" : "text-emerald-600")} />
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder="Selecione ou busque..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className={cn(
                                    "w-full p-2 pl-7 text-[10px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2",
                                    isCyan ? "focus:ring-cyan-500" : "focus:ring-emerald-500"
                                  )}
                                />
                                <button 
                                  onClick={() => setActiveSearchDay(null)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="max-h-48 overflow-y-auto space-y-1">
                                {user && COLS_OFICIAIS.includes(parseRank(user.rank)) && (
                                   <button
                                     onClick={() => {
                                       updateOfficerDay(dateStr, field, `${parseRank(user.rank)} ${user.warName || (user.name || '').split(' ')[0]}`);
                                       setActiveSearchDay(null);
                                     }}
                                     className={cn(
                                       "w-full text-left p-3 rounded-lg transition-all flex items-center gap-3 border mb-2",
                                       isCyan 
                                         ? "bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200" 
                                         : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                                     )}
                                   >
                                     <div className={cn("rounded p-1 text-white", isCyan ? "bg-cyan-600" : "bg-emerald-600")}>
                                        <Plus className="w-3 h-3" />
                                     </div>
                                     <div className="flex-1">
                                       <span className="text-[11px] font-black uppercase block leading-tight">Escalar a Mim Mesmo</span>
                                       <span className="text-[9px] font-bold opacity-75">{parseRank(user.rank)} {user.warName}</span>
                                     </div>
                                   </button>
                                )}

                                {availableOfficers
                                  .filter(m => {
                                    if (!searchTerm) return true;
                                    const term = searchTerm.toLowerCase();
                                    return (m.name || '').toLowerCase().includes(term) ||
                                           (m.warName || '').toLowerCase().includes(term) ||
                                           (m.rank || '').toLowerCase().includes(term) ||
                                           (m.rg || '').toString().includes(term);
                                  })
                                  .map(m => (
                                    <button
                                      key={m.rg}
                                      onClick={() => {
                                        updateOfficerDay(dateStr, field, `${parseRank(m.rank)} ${m.warName || (m.name || '').split(' ')[0]}`);
                                        setActiveSearchDay(null);
                                      }}
                                      className="w-full text-left p-1.5 hover:bg-slate-100 rounded text-[11px] font-black uppercase text-slate-700 flex items-center justify-between cursor-pointer"
                                    >
                                      <span>{parseRank(m.rank)} {m.warName || (m.name || '').split(' ')[0]}</span>
                                      <span className="text-[9px] text-slate-400 font-mono">{m.rg}</span>
                                    </button>
                                  ))}

                                {availableOfficers.length === 0 && (
                                  <div className="p-3 text-center text-slate-400 text-xs">
                                    Nenhum oficial configurado para este módulo. Acesse <strong>Configuração Serviços de Oficiais</strong>.
                                  </div>
                                )}
                              </div>
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
        </div>
      </div>
      
      {saving && (
        <div className={cn(
          "fixed bottom-8 right-8 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce",
          isCyan ? "bg-cyan-600" : "bg-emerald-600"
        )}>
          <Shield className="w-4 h-4 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-widest">Salvando Escala...</span>
        </div>
      )}
    </div>
  );
}
