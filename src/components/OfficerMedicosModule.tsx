import React, { useState, useEffect, useMemo } from 'react';
import { useMilitars } from '../contexts/MilitarContext';
import { db } from '../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  ChevronLeft, 
  ChevronRight, 
  Shield, 
  Search,
  X,
  Plus,
  Calendar as CalendarIcon,
  Settings,
  Users,
  Wand2,
  Check,
  Stethoscope,
  HeartPulse
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';
import { COLS_OFICIAIS, parseRank, sortOfficersBySeniority } from '../lib/rankUtils';
import { cleanUndefined } from "../lib/utils";

interface OfficerMedicosModuleProps {
  user: UserProfile;
  obmContext: string;
  setObmContext?: (obm: string) => void;
  availableObms?: string[];
}

export function OfficerMedicosModule({ user, obmContext, setObmContext, availableObms = [] }: OfficerMedicosModuleProps) {
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

  const isGlobal = obmContext === 'GLOBAL';
  // Normalize OBM for doc ID
  const obmId = isGlobal ? 'GLOBAL' : obmContext.replace(/\//g, '_').replace(/\s/g, '_');
  const docId = obmId;

  useEffect(() => {
    setLoading(true);
    
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

      const unsub10 = onSnapshot(doc(db, 'medico_scales', '10º_GBM'), (snap) => {
          if (snap.exists()) db10 = snap.data().days || {};
          else db10 = {};
          updateMerged();
      });
      
      const unsub26 = onSnapshot(doc(db, 'medico_scales', '26º_GBM'), (snap) => {
          if (snap.exists()) db26 = snap.data().days || {};
          else db26 = {};
          updateMerged();
          setLoading(false);
      });
      
      setSelectedRgsOficialDia([]);
      setSelectedRgsSobreaviso([]);
      
      return () => { unsub10(); unsub26(); };
    } else {
      const unsubscribe = onSnapshot(doc(db, 'medico_scales', docId), (snapshot) => {
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
        console.error("Error loading Medico scale:", error);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [obmContext, currentDate]);

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
    
    await setDoc(doc(db, 'medico_scales', docId), cleanUndefined({
          lists: {
            [monthKey]: {
                oficialDia: newOficialDia,
                sobreaviso: newSobreaviso
            }
          }
        }), { merge: true });
  };

  const distributionQuotas = useMemo(() => {
    const currentActiveList = configTab === 'oficialDia' ? selectedRgsOficialDia : selectedRgsSobreaviso;
    const activeOfficers = militars.filter(m => currentActiveList.includes(m.rg));
    if (activeOfficers.length === 0) return [];

    activeOfficers.sort(sortOfficersBySeniority);

    const totalDays = monthDaysOnly.length;
    const numOfficers = activeOfficers.length;
    const baseQuota = Math.floor(totalDays / numOfficers);
    const remainder = totalDays % numOfficers;

    const dist = activeOfficers.map(m => ({
      rg: m.rg,
      name: `${parseRank(m.rank)} ${m.warName || (m.name || '').split(' ')[0]}`,
      quotaTotal: baseQuota,
      quotaRed: 0,
      quotaPurple: 0,
      quotaBlack: 0,
      daysRed: [] as string[],
      daysPurple: [] as string[],
      daysBlack: [] as string[]
    }));

    for (let i = 0; i < remainder; i++) {
        dist[dist.length - 1 - i].quotaTotal += 1;
    }

    const redDays: string[] = [];
    const purpleDays: string[] = [];
    const blackDays: string[] = [];

    monthDaysOnly.forEach(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayOfWeek = getDay(day);
      if (dayOfWeek === 0 || dayOfWeek === 6) redDays.push(dayStr);
      else if (dayOfWeek === 5) purpleDays.push(dayStr);
      else blackDays.push(dayStr);
    });

    let currentModernIdx = dist.length - 1;
    redDays.forEach(day => {
       dist[currentModernIdx].daysRed.push(day);
       dist[currentModernIdx].quotaRed += 1;
       currentModernIdx -= 1;
       if (currentModernIdx < 0) currentModernIdx = dist.length - 1;
    });

    purpleDays.forEach(day => {
       let minPurple = Infinity;
       for (let i = 0; i < dist.length; i++) {
           const potentialTotal = dist[i].quotaRed + dist[i].quotaPurple + 1;
           if (potentialTotal <= dist[i].quotaTotal) {
               if (dist[i].quotaPurple < minPurple) {
                   minPurple = dist[i].quotaPurple;
               }
           }
       }

       let chosenIdx = -1;
       let bestModernity = -1;
       for (let i = 0; i < dist.length; i++) {
           const potentialTotal = dist[i].quotaRed + dist[i].quotaPurple + 1;
           if (potentialTotal <= dist[i].quotaTotal) {
               if (dist[i].quotaPurple === minPurple) {
                   if (i > bestModernity) {
                       bestModernity = i;
                       chosenIdx = i;
                   }
               }
           }
       }

       if (chosenIdx !== -1) {
           dist[chosenIdx].daysPurple.push(day);
           dist[chosenIdx].quotaPurple += 1;
       }
    });

    let availableBlackDays = [...blackDays];
    dist.forEach(officer => {
       const missing = officer.quotaTotal - (officer.quotaRed + officer.quotaPurple);
       if (missing > 0) {
           officer.quotaBlack = missing;
           for(let i=0; i<missing; i++) {
               if (availableBlackDays.length > 0) {
                   officer.daysBlack.push(availableBlackDays.shift() as string);
               }
           }
       }
    });

    return dist;
  }, [militars, selectedRgsOficialDia, selectedRgsSobreaviso, configTab, monthDaysOnly]);

  const handleGenerateScale = async () => {
    const label = configTab === 'oficialDia' ? 'Oficial Médico de Dia / Sobreaviso 1' : 'Sobreaviso Médico 2';
    if (!window.confirm(`Isso irá sobrescrever a coluna de ${label} com a distribuição automática. Deseja continuar?`)) return;
    
    setSaving(true);
    try {
        const updates: Record<string, any> = {};
        
        distributionQuotas.forEach(officer => {
            const allDays = [...officer.daysRed, ...officer.daysPurple, ...officer.daysBlack];
            allDays.forEach(day => {
                updates[`days.${day}.${configTab}`] = officer.name;
                if (configTab === 'oficialDia') {
                  updates[`days.${day}.oficialMedico`] = officer.name;
                }
            });
        });
        
        if (Object.keys(updates).length > 0) {
            const newOfficerData: Record<string, Record<string, string>> = {};
            distributionQuotas.forEach(officer => {
                const allDays = [...officer.daysRed, ...officer.daysPurple, ...officer.daysBlack];
                allDays.forEach(day => {
                    if (!newOfficerData[day]) newOfficerData[day] = {};
                    newOfficerData[day][configTab] = officer.name;
                    if (configTab === 'oficialDia') {
                      newOfficerData[day]['oficialMedico'] = officer.name;
                    }
                });
            });
            await setDoc(doc(db, 'medico_scales', docId), cleanUndefined({
                days: newOfficerData
            }), { merge: true });
        }
    } catch (err) {
        console.error(err);
    } finally {
        setSaving(false);
    }
  };

  const availableOfficers = useMemo(() => {
    const list = militars.filter(m => {
       const rawMObm = m.obm ? m.obm : '10º GBM';
       const mObm = rawMObm.replace(/º/g, '°').trim().toUpperCase();
       const ctxObm = (obmContext || '').replace(/º/g, '°').trim().toUpperCase();
       
       if (ctxObm && ctxObm !== 'GLOBAL' && mObm !== ctxObm) return false;

       const r = parseRank(m.rank);
       if (!COLS_OFICIAIS.includes(r)) return false;

       const role = (m.officerRole || (m as any).role || '').toUpperCase();
       const quadro = (m.quadro || '').toUpperCase();
       const name = (m.name || '').toUpperCase();

       // Prioritize Medical Officers (QOS / OFICIAL MÉDICO)
       if (role.includes('MEDIC') || role.includes('MÉDIC') || quadro.includes('QOS') || quadro.includes('MED') || name.includes('MEDIC')) {
         return true;
       }

       return false;
    });

    if (list.length > 0) {
      return list.sort(sortOfficersBySeniority);
    }

    // Fallback: all officers of the OBM so user can pick any officer
    return militars.filter(m => {
       const rawMObm = m.obm ? m.obm : '10º GBM';
       const mObm = rawMObm.replace(/º/g, '°').trim().toUpperCase();
       const ctxObm = (obmContext || '').replace(/º/g, '°').trim().toUpperCase();
       if (ctxObm && ctxObm !== 'GLOBAL' && mObm !== ctxObm) return false;
       const r = parseRank(m.rank);
       return COLS_OFICIAIS.includes(r);
    }).sort(sortOfficersBySeniority);
  }, [militars, obmContext]);

  const updateOfficerDay = async (dateStr: string, field: string, value: string) => {
    setOfficerData(prev => ({
      ...prev,
      [dateStr]: {
        ...prev[dateStr],
        [field]: value,
        ...(field.includes('oficialDia') ? { oficialMedico: value } : {})
      }
    }));
    
    setSaving(true);
    try {
      if (isGlobal) {
         const is10 = field.startsWith('10º_GBM');
         const realField = field.split('-')[1];
         const targetId = is10 ? '10º_GBM' : '26º_GBM';
         
         const payload: Record<string, any> = {
           [realField]: value
         };
         if (realField === 'oficialDia') {
           payload.oficialMedico = value;
         }

         await setDoc(doc(db, 'medico_scales', targetId), cleanUndefined({
            days: {
              [dateStr]: payload
            }
          }), { merge: true });
      } else {
          const payload: Record<string, any> = {
            [field]: value
          };
          if (field === 'oficialDia') {
            payload.oficialMedico = value;
          }

          await setDoc(doc(db, 'medico_scales', docId), cleanUndefined({
            days: {
              [dateStr]: payload
            }
          }), { merge: true });
      }
    } catch (error) {
      console.error("Error saving Medico scale:", error);
    } finally {
      setSaving(false);
      setActiveSearchDay(null);
      setSearchTerm('');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-inner">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black uppercase tracking-widest text-slate-800">
                Oficiais Médicos
              </h1>
              <span className="bg-rose-100 text-rose-800 text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-widest border border-rose-200">
                Saúde & Plantão
              </span>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Escala de Oficiais Médicos de Dia e Sobreaviso (24H)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {availableObms && availableObms.length > 1 && setObmContext && (
            <select
              value={obmContext}
              onChange={(e) => setObmContext(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-black uppercase text-slate-700 bg-white shadow-sm focus:border-rose-500 outline-none"
            >
              {availableObms.map((obm) => (
                <option key={obm} value={obm}>
                  {obm}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center bg-slate-100 rounded-lg p-1 min-w-[200px] justify-between shadow-inner">
            <button onClick={handlePrevMonth} className="p-1 hover:bg-white rounded-md transition-all shadow-sm">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-xs font-black uppercase tracking-widest text-slate-700 mx-2">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button onClick={handleNextMonth} className="p-1 hover:bg-white rounded-md transition-all shadow-sm">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-8 space-y-6">
        {/* Distribuição e Configuração */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black uppercase tracking-widest text-rose-800 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-600" /> Distribuição de Serviços (Médicos)
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowConfig(!showConfig)}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" /> {showConfig ? 'Ocultar Médicos' : 'Configurar Médicos'}
              </button>
              <button 
                onClick={handleGenerateScale}
                disabled={distributionQuotas.length === 0}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-rose-700 hover:bg-rose-800 text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                <Wand2 className="w-3.5 h-3.5" /> Gerar Automático
              </button>
            </div>
          </div>

          {showConfig && !isGlobal && (
            <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex gap-2 mb-4 border-b border-slate-200 pb-2">
                 <button 
                   onClick={() => setConfigTab('oficialDia')}
                   className={cn("px-3 py-1 text-[11px] font-black uppercase tracking-widest rounded-t-lg transition-all", configTab === 'oficialDia' ? "bg-rose-700 text-white" : "bg-slate-200 text-slate-600 hover:bg-slate-300")}
                 >OFICIAL MÉDICO DE DIA / SOBREAVISO 1</button>
                 <button 
                   onClick={() => setConfigTab('sobreaviso')}
                   className={cn("px-3 py-1 text-[11px] font-black uppercase tracking-widest rounded-t-lg transition-all", configTab === 'sobreaviso' ? "bg-rose-700 text-white" : "bg-slate-200 text-slate-600 hover:bg-slate-300")}
                 >SOBREAVISO MÉDICO 2</button>
              </div>
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-3">
                Selecione os Oficiais Médicos para a Escala ({configTab === 'oficialDia' ? 'Oficial Médico de Dia' : 'Sobreaviso Médico 2'}):
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                {availableOfficers.map(mil => {
                  const isSelected = configTab === 'oficialDia' ? selectedRgsOficialDia.includes(mil.rg) : selectedRgsSobreaviso.includes(mil.rg);
                  return (
                    <button
                      key={mil.rg}
                      onClick={() => handleToggleOfficer(mil.rg)}
                      className={cn(
                        "text-left p-2.5 rounded-xl border text-[11px] font-black uppercase tracking-wider flex items-center justify-between transition-all shadow-sm",
                        isSelected ? "bg-rose-50 border-rose-500 text-rose-800" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      )}
                    >
                      <span className="truncate">{mil.rank} {mil.warName || (mil.name || '').split(' ')[0]}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black uppercase tracking-widest border-b border-slate-200">
                  <th className="px-3 py-2 border-r border-slate-200">Oficial Médico (Antiguidade)</th>
                  <th className="px-3 py-2 border-r border-slate-200 text-center text-rose-600">Vermelha</th>
                  <th className="px-3 py-2 border-r border-slate-200 text-center text-purple-600">Roxa</th>
                  <th className="px-3 py-2 border-r border-slate-200 text-center text-slate-800">Preta</th>
                  <th className="px-3 py-2 text-center text-emerald-700">Total (Cota)</th>
                </tr>
              </thead>
              <tbody>
                {distributionQuotas.length === 0 ? (
                   <tr><td colSpan={5} className="p-4 text-center text-slate-400 font-bold">Nenhum oficial médico configurado nesta OBM.</td></tr>
                ) : (
                  distributionQuotas.map((officer) => (
                    <tr key={officer.rg} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-bold border-r border-slate-200 text-slate-800">{officer.name}</td>
                      <td className="px-3 py-2 text-center border-r border-slate-200 font-bold text-rose-600">{officer.quotaRed}</td>
                      <td className="px-3 py-2 text-center border-r border-slate-200 font-bold text-purple-600">{officer.quotaPurple}</td>
                      <td className="px-3 py-2 text-center border-r border-slate-200 font-bold text-slate-700">{officer.quotaBlack}</td>
                      <td className="px-3 py-2 text-center font-black text-emerald-700 bg-emerald-50/50">{officer.quotaTotal}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabela Principal da Escala Mensal */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-rose-950 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Stethoscope className="w-5 h-5 text-rose-300" />
              <h2 className="text-sm font-black uppercase tracking-widest">
                Escala Mensal de Oficiais Médicos ({format(currentDate, 'MMMM yyyy', { locale: ptBR })})
              </h2>
            </div>
            {saving && (
              <span className="text-[10px] font-bold text-rose-200 animate-pulse uppercase tracking-widest">
                Salvando alterações...
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-rose-900/90 text-white border-b border-rose-800">
                  <th className="px-3 py-3 text-[11px] font-black uppercase tracking-widest border-r border-rose-800 w-28">DATA</th>
                  <th className="px-3 py-3 text-[11px] font-black uppercase tracking-widest border-r border-rose-800 w-36">DIA</th>
                  {isGlobal ? (
                    <>
                      <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest border-r border-rose-800 bg-rose-950">OF MÉDICO (10º GBM)</th>
                      <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest border-r border-rose-800 bg-rose-950">OF MÉDICO (26º GBM)</th>
                      <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest border-r border-rose-800">SOBREAVISO (10º GBM)</th>
                      <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest">SOBREAVISO (26º GBM)</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-3 text-[11px] font-black uppercase tracking-widest border-r border-rose-800">
                        OFICIAL MÉDICO DE DIA / SOBREAVISO 1
                      </th>
                      <th className="px-3 py-3 text-[11px] font-black uppercase tracking-widest">
                        SOBREAVISO MÉDICO 2
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthDaysOnly.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayOfWeek = getDay(day);
                  
                  let rowColorClass = "hover:bg-slate-50 bg-white";
                  if (dayOfWeek === 0 || dayOfWeek === 6) {
                    rowColorClass = "bg-rose-50/50 hover:bg-rose-100/50";
                  } else if (dayOfWeek === 5) {
                    rowColorClass = "bg-purple-50/50 hover:bg-purple-100/50";
                  }

                  const offDay = officerData[dateStr] || { oficialDia: '', sobreaviso: '' };

                  return (
                    <tr key={dateStr} className={cn("transition-colors", rowColorClass)}>
                      <td className="px-3 py-2.5 border-r border-slate-200 text-xs font-black text-slate-700">
                        {format(day, 'dd/MM/yyyy')}
                      </td>
                      <td className="px-3 py-2.5 border-r border-slate-200 text-[11px] font-black uppercase text-slate-500 italic">
                        {format(day, 'eeee', { locale: ptBR })}
                      </td>
                      {(isGlobal ? ['10º_GBM-oficialDia', '26º_GBM-oficialDia', '10º_GBM-sobreaviso', '26º_GBM-sobreaviso'] : ['oficialDia', 'sobreaviso']).map((field) => {
                        const val = offDay[field as keyof typeof offDay] || '';
                        const isActiveSearch = activeSearchDay?.date === dateStr && activeSearchDay?.field === field;

                        return (
                          <td 
                            key={field} 
                            className="px-3 py-2 border-r last:border-r-0 border-slate-200 relative group cursor-pointer"
                            onClick={() => {
                              if (!isActiveSearch) {
                                setActiveSearchDay({ date: dateStr, field });
                                setSearchTerm(val);
                              }
                            }}
                          >
                            {isActiveSearch ? (
                              <div className="flex flex-col gap-1.5 bg-white p-2 rounded-lg shadow-xl border border-rose-300 z-20 min-w-[200px]" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  autoFocus
                                  placeholder="Digite ou busque o oficial médico..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="w-full text-xs font-bold uppercase p-1.5 border border-slate-300 rounded outline-none focus:border-rose-500"
                                />
                                <div className="max-h-36 overflow-y-auto divide-y divide-slate-100">
                                  {availableOfficers
                                    .filter(o => !searchTerm || `${o.rank} ${o.warName || o.name}`.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map(o => (
                                      <button
                                        key={o.rg}
                                        onClick={() => updateOfficerDay(dateStr, field, `${parseRank(o.rank)} ${o.warName || (o.name || '').split(' ')[0]}`)}
                                        className="w-full text-left p-1 text-[10px] font-bold uppercase hover:bg-rose-50 text-slate-700 rounded transition-colors"
                                      >
                                        {o.rank} {o.warName || o.name}
                                      </button>
                                  ))}
                                </div>
                                <div className="flex justify-between gap-1 mt-1 pt-1 border-t border-slate-100">
                                  {val && (
                                    <button
                                      onClick={() => updateOfficerDay(dateStr, field, '')}
                                      className="text-[9px] font-black uppercase text-rose-600 hover:underline"
                                    >
                                      Limpar
                                    </button>
                                  )}
                                  <button
                                    onClick={() => updateOfficerDay(dateStr, field, searchTerm.toUpperCase())}
                                    className="text-[9px] font-black uppercase text-slate-700 hover:underline ml-auto"
                                  >
                                    Salvar Texto
                                  </button>
                                  <button
                                    onClick={() => setActiveSearchDay(null)}
                                    className="text-[9px] font-black uppercase text-slate-400 hover:underline"
                                  >
                                    Fechar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between min-h-[24px]">
                                <span className={cn(
                                  "text-xs font-black uppercase tracking-tight",
                                  val ? "text-slate-900" : "text-slate-300 italic text-[10px]"
                                )}>
                                  {val || "— Não Definido —"}
                                </span>
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
      </div>
    </div>
  );
}
