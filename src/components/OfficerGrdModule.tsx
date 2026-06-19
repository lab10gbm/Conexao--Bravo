import React, { useState, useEffect, useMemo } from 'react';
import { useMilitars } from '../contexts/MilitarContext';
import { db } from '../lib/firebase';
import { doc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
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
  Check
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
  isWeekend,
  getDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';
import { COLS_OFICIAIS, parseRank, sortOfficersBySeniority } from '../lib/rankUtils';
import { cleanUndefined } from "../lib/utils";

interface OfficerGrdModuleProps {
  user: UserProfile;
  obmContext: string;
  setObmContext?: (obm: string) => void;
  availableObms?: string[];
}

export function OfficerGrdModule({ user, obmContext, setObmContext, availableObms = [] }: OfficerGrdModuleProps) {
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
  const [selectedRgsRas, setSelectedRgsRas] = useState<string[]>([]);
  const [configTab, setConfigTab] = useState<'oficialDia' | 'sobreaviso'>('oficialDia');
  const [showConfig, setShowConfig] = useState(false);

  // Normalize OBM for doc ID
  const obmId = obmContext.replace(/\//g, '_').replace(/\s/g, '_');
  const docId = obmId;

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(doc(db, 'officer_scales', docId), (snapshot) => {
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
      console.error("Error loading Officer scale:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [docId]);

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
    
    await setDoc(doc(db, 'officer_scales', docId), cleanUndefined({
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

    // Sort by Seniority (Antiguidade). CORONEL -> ASP OF
    activeOfficers.sort(sortOfficersBySeniority);

    const totalDays = monthDaysOnly.length;
    const numOfficers = activeOfficers.length;
    const baseQuota = Math.floor(totalDays / numOfficers);
    const remainder = totalDays % numOfficers;

    const dist = activeOfficers.map(m => ({
      rg: m.rg,
      name: `${m.rank} ${m.warName || (m.name || '').split(' ')[0]}`,
      quotaTotal: baseQuota,
      quotaRed: 0,
      quotaPurple: 0,
      quotaBlack: 0,
      daysRed: [] as string[],
      daysPurple: [] as string[],
      daysBlack: [] as string[]
    }));

    // Distribute remainder to the most modern (end of array)
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
       if (currentModernIdx < 0) {
           currentModernIdx = dist.length - 1;
       }
    });

    purpleDays.forEach(day => {
       let chosenIdx = -1;
       let minRed = 9999;
       let bestModernity = -1;

       for (let i = 0; i < dist.length; i++) {
           const officer = dist[i];
           const currentTotal = officer.quotaRed + officer.quotaPurple + officer.quotaBlack;
           if (currentTotal < officer.quotaTotal) {
               if (officer.quotaRed < minRed) {
                   minRed = officer.quotaRed;
                   bestModernity = i;
                   chosenIdx = i;
               } else if (officer.quotaRed === minRed) {
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
    const label = configTab === 'oficialDia' ? 'Oficial de Dia / Sobreaviso 1 / GRD 1' : 'Sobreaviso 2 / GRD 2';
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
            await setDoc(doc(db, 'officer_scales', docId), cleanUndefined({
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
    return militars.filter(m => {
       const rawMObm = m.obm ? m.obm : '10º GBM'; // Treat empty as 10º GBM
       const mObm = rawMObm.replace(/º/g, '°').trim().toUpperCase();
       const ctxObm = (obmContext || '').replace(/º/g, '°').trim().toUpperCase();
       
       if (ctxObm && ctxObm !== 'GLOBAL' && mObm !== ctxObm) return false;

       const r = parseRank(m.rank);
       if (!COLS_OFICIAIS.includes(r)) return false;

       const role = (m.officerRole || '').toUpperCase();
       if (role.includes('MÉDICO') || role.includes('MEDICO')) return false;
       if (role.includes('ADMINISTRATIVO')) return false;
       if (role.includes('COMBATENTE')) return true;

       const q = (m.quadro || '').toUpperCase();
       if (q.includes('QOS')) return false;
       if (q.includes('QOA')) return false;
       if (q.includes('QOC')) return true;

       return false;
    }).sort(sortOfficersBySeniority);
  }, [militars]);

  const updateOfficerDay = async (dateStr: string, field: string, value: string) => {
    // Optimistic UI Update
    setOfficerData(prev => ({
      ...prev,
      [dateStr]: {
        ...prev[dateStr],
        [field]: value
      }
    }));
    
    setSaving(true);
    try {
      await setDoc(doc(db, 'officer_scales', docId), cleanUndefined({
        days: {
          [dateStr]: {
            [field]: value
          }
        }
      }), { merge: true });
    } catch (error) {
      console.error("Error saving Officer scale:", error);
    } finally {
      setSaving(false);
    }
  };

  const isRowWeekend = (date: Date) => {
    const day = getDay(date);
    return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="p-4 sm:p-6 border-b bg-white flex flex-col sm:flex-row items-center justify-between shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-700 p-2 rounded-xl text-white">
            <Shield className="w-6 h-6 shrink-0" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter shrink-0 leading-tight">Serviços e GRD de Oficiais</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Escala Mensal {obmContext}</span>
              {availableObms.length > 1 && setObmContext && (
                <select
                  value={obmContext}
                  onChange={(e) => setObmContext(e.target.value)}
                  className="bg-slate-100 border border-slate-200 text-slate-500 text-[10px] uppercase font-black tracking-widest rounded px-1.5 py-0.5 outline-none focus:border-emerald-500 transition-colors"
                >
                  {availableObms.map((obm) => (
                    <option key={obm} value={obm}>
                      {obm}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="flex items-center bg-slate-100 rounded-lg p-1 min-w-[220px] justify-between ml-4">
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

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inscrito como:</span>
            <span className="text-xs font-black text-emerald-700 uppercase">{user.rank} {user.warName || (user.name || '').split(' ')[0]}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-emerald-200">
             <Shield className="w-5 h-5 text-emerald-700" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-4 sm:p-8 space-y-6">
        
        {/* Distribuição e Configuração */}
        <div className="flex flex-col xl:flex-row gap-6">
          
          <div className="flex-1 bg-white border border-slate-300 shadow-xl rounded-sm p-4">
            <div className="flex items-center justify-between mb-4 border-b pb-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#406b53] flex items-center gap-2">
                <Settings className="w-4 h-4" /> Distribuição de Serviços (Oficiais)
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowConfig(!showConfig)}
                  className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors flex items-center gap-1"
                >
                  <Users className="w-3 h-3" /> {showConfig ? 'Ocultar Oficiais' : 'Configurar Oficiais'}
                </button>
                <button 
                  onClick={handleGenerateScale}
                  disabled={distributionQuotas.length === 0}
                  className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-[#406b53] hover:bg-[#305542] text-white rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <Wand2 className="w-3 h-3" /> Gerar Automático
                </button>
              </div>
            </div>

            {showConfig && (
              <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-md">
                <div className="flex gap-2 mb-4 border-b border-slate-200 pb-2">
                   <button 
                     onClick={() => setConfigTab('oficialDia')}
                     className={cn("px-3 py-1 text-[11px] font-black uppercase tracking-widest rounded-t-md transition-all", configTab === 'oficialDia' ? "bg-[#406b53] text-white" : "bg-slate-200 text-slate-500 hover:bg-slate-300")}
                   >OF DE DIA / CMT OP / S1 / G1</button>
                   <button 
                     onClick={() => setConfigTab('sobreaviso')}
                     className={cn("px-3 py-1 text-[11px] font-black uppercase tracking-widest rounded-t-md transition-all", configTab === 'sobreaviso' ? "bg-[#406b53] text-white" : "bg-slate-200 text-slate-500 hover:bg-slate-300")}
                   >SOBREAVISO 2 / GRD 2</button>
                </div>
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-3">Selecione os Oficiais para a Escala ({configTab === 'oficialDia' ? 'Of de Dia/Sobreaviso 1' : 'Sobreaviso 2/GRD 2'}):</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                  {availableOfficers.map(mil => {
                    const isSelected = configTab === 'oficialDia' ? selectedRgsOficialDia.includes(mil.rg) : selectedRgsSobreaviso.includes(mil.rg);
                    return (
                      <button
                        key={mil.rg}
                        onClick={() => handleToggleOfficer(mil.rg)}
                        className={cn(
                          "text-left p-2 rounded border text-[11px] font-black uppercase tracking-wider flex items-center justify-between transition-all",
                          isSelected ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                        )}
                      >
                        <span className="truncate">{mil.rank} {mil.warName || (mil.name || '').split(' ')[0]}</span>
                        {isSelected && <Check className="w-3 h-3 shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="overflow-x-auto border border-slate-200 rounded">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-black uppercase tracking-widest border-b border-slate-200">
                    <th className="px-3 py-2 border-r border-slate-200">Oficial (Antiguidade)</th>
                    <th className="px-3 py-2 border-r border-slate-200 text-center text-red-600">Vermelha</th>
                    <th className="px-3 py-2 border-r border-slate-200 text-center text-purple-600">Roxa</th>
                    <th className="px-3 py-2 border-r border-slate-200 text-center text-slate-800">Preta</th>
                    <th className="px-3 py-2 text-center text-emerald-700">Total (Cota)</th>
                  </tr>
                </thead>
                <tbody>
                  {distributionQuotas.length === 0 ? (
                     <tr><td colSpan={5} className="p-4 text-center text-slate-400 font-bold">Nenhum oficial configurado.</td></tr>
                  ) : (
                    distributionQuotas.map((dist, idx) => (
                      <tr key={dist.rg} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 border-r border-slate-100 font-black text-slate-700 uppercase">
                           <span className="text-slate-400 mr-2">{idx + 1}º</span> {dist.name}
                        </td>
                        <td className="px-3 py-2 border-r border-slate-100 text-center font-black text-red-600">{dist.quotaRed}</td>
                        <td className="px-3 py-2 border-r border-slate-100 text-center font-black text-purple-600">{dist.quotaPurple}</td>
                        <td className="px-3 py-2 border-r border-slate-100 text-center font-black text-slate-800">{dist.quotaBlack}</td>
                        <td className="px-3 py-2 text-center font-black text-emerald-700 bg-emerald-50">{dist.quotaTotal}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="min-w-[1000px] bg-white border border-slate-300 shadow-xl overflow-hidden rounded-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#406b53] border-b border-slate-400">
                <th className="px-3 py-4 text-[11px] font-black uppercase tracking-widest text-white border-r border-[#305542] w-32">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 opacity-50" />
                    DATA
                  </div>
                </th>
                <th className="px-3 py-4 text-[11px] font-black uppercase tracking-widest text-white border-r border-[#305542] w-40">DIA</th>
                <th className="px-3 py-4 text-[11px] font-black uppercase tracking-widest text-white border-r border-[#305542]">OFICIAL DE DIA / CMT OP / SOBREAVISO 1 / GRD 1</th>
                <th className="px-3 py-4 text-[11px] font-black uppercase tracking-widest text-white">SOBREAVISO 2 / GRD 2</th>
              </tr>
            </thead>
            <tbody>
              {monthDaysOnly.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayOfWeek = getDay(day);
                
                let rowColorClass = "hover:bg-slate-50 bg-white"; // Preta (Branca por padrão)
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                  rowColorClass = "bg-[#d68585]/40 hover:bg-[#d68585]/50"; // Vermelha
                } else if (dayOfWeek === 5) {
                  rowColorClass = "bg-purple-200/60 hover:bg-purple-300/60"; // Roxa
                }

                const offDay = officerData[dateStr] || { oficialDia: '', sobreaviso: '' };
                const userDisplay = `${user.rank} ${user.warName || (user.name || '').split(' ')[0]}`;

                return (
                  <tr 
                    key={dateStr} 
                    className={cn(
                      "h-16 transition-colors border-b border-slate-200",
                      rowColorClass
                    )}
                  >
                    <td className="px-4 py-2 border-r border-slate-200 font-mono text-[13px] font-bold text-slate-600">
                      {format(day, 'dd/MM/yyyy')}
                    </td>
                    <td className="px-4 py-2 border-r border-slate-200 text-[11px] font-black uppercase text-slate-500 italic">
                      {format(day, 'eeee', { locale: ptBR })}
                    </td>
                    {['oficialDia', 'sobreaviso'].map((field) => {
                      const val = offDay[field as keyof typeof offDay] || '';
                      const isMe = val.includes(userDisplay) || (val.includes(user.rg || ''));
                      const isActiveSearch = activeSearchDay?.date === dateStr && activeSearchDay?.field === field;

                      return (
                        <td key={field} className="px-2 py-2 border-r border-slate-200 relative w-1/2">
                          <button
                            onClick={() => {
                              setActiveSearchDay({ date: dateStr, field });
                              setSearchTerm('');
                            }}
                            className={cn(
                              "w-full h-full min-h-[40px] px-3 py-2 text-[12px] font-black uppercase text-left rounded-md transition-all flex items-center justify-between group",
                              val 
                                ? (isMe ? "bg-emerald-600 text-white shadow-md" : "bg-white text-slate-700") 
                                : "bg-white/50 border border-dashed border-slate-300 text-slate-300 hover:border-emerald-500 hover:text-emerald-600"
                            )}
                          >
                            <span className="truncate">{val || "Vaga Disponível"}</span>
                            {val && isMe && (
                              <X 
                                className="w-4 h-4 text-white/70 hover:text-white shrink-0" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateOfficerDay(dateStr, field, '');
                                }}
                              />
                            )}
                            {!val && (
                               <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </button>

                          {isActiveSearch && (
                            <div className="absolute top-0 left-0 w-80 bg-white shadow-2xl border border-emerald-200 rounded-xl z-50 p-2 mt-12 animate-in fade-in zoom-in-95 duration-200">
                              <div className="relative mb-2">
                                <Search className="w-3 h-3 text-emerald-600 absolute left-2 top-1/2 -translate-y-1/2" />
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder="Selecione ou busque..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="w-full p-2 pl-7 text-[10px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <button 
                                  onClick={() => setActiveSearchDay(null)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"
                                >
                                  <X className="w-3 h-3 text-slate-400" />
                                </button>
                              </div>
                              <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                                {/* Suggest user first */}
                                {(!searchTerm || user.name.toLowerCase().includes(searchTerm.toLowerCase())) && (
                                   <button
                                     onClick={() => {
                                       updateOfficerDay(dateStr, field, `${user.rank} ${user.warName || (user.name || '').split(' ')[0]}`);
                                       setActiveSearchDay(null);
                                     }}
                                     className="w-full text-left p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-all flex items-center gap-3 border border-emerald-200 mb-2"
                                   >
                                     <div className="bg-emerald-600 text-white rounded p-1">
                                        <Plus className="w-3 h-3" />
                                     </div>
                                     <div className="flex-1">
                                        <p className="text-[11px] font-black uppercase">EU: {user.rank} {user.warName || (user.name || '').split(' ')[0]}</p>
                                     </div>
                                    </button>
                                 )}
                                 {militars
                                  .filter(m => {
                                    if (!m.name) return false;
                                    const rawMObm = m.obm ? m.obm : '10º GBM'; // Treat empty as 10º GBM
                                    const mObm = rawMObm.replace(/º/g, '°').trim().toUpperCase();
                                    const ctxObm = (obmContext || '').replace(/º/g, '°').trim().toUpperCase();
                                    if (ctxObm && ctxObm !== 'GLOBAL' && mObm !== ctxObm) return false;
                                    
                                    const sl = searchTerm.toLowerCase();
                                    const match = (m.name || '').toLowerCase().includes(sl) || (m.rg || '').includes(searchTerm);
                                    
                                    const r = parseRank(m.rank);
                                    const isOff = COLS_OFICIAIS.includes(r);
                                    let isCombatente = true;
                                    if (isOff) {
                                       const role = (m.officerRole || '').toUpperCase();
                                       if (role.includes('MÉDICO') || role.includes('MEDICO') || role.includes('ADMINISTRATIVO')) {
                                          isCombatente = false;
                                       } else if (role.includes('COMBATENTE')) {
                                          isCombatente = true;
                                       } else {
                                          const q = (m.quadro || '').toUpperCase();
                                          if (q.includes('QOS') || q.includes('QOA')) isCombatente = false;
                                          else if (q.includes('QOC')) isCombatente = true;
                                          else isCombatente = false;
                                       }
                                    }
                                    
                                    return match && (isOff ? isCombatente : (searchTerm.length > 3));
                                  })
                                  .sort((a,b) => (a.rank||'').localeCompare(b.rank||'') || (a.name || '').localeCompare(b.name || ''))
                                  .slice(0, 15)
                                  .map(mil => (
                                    <button
                                      key={mil.rg}
                                      onClick={() => {
                                        updateOfficerDay(dateStr, field, `${mil.rank} ${mil.warName || (mil.name || '').split(' ')[0]}`);
                                        setActiveSearchDay(null);
                                      }}
                                      className="w-full text-left p-2 hover:bg-slate-50 rounded-lg transition-all flex items-center gap-2 group"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black text-slate-700 truncate leading-tight uppercase">
                                          {mil.rank} {mil.name}
                                        </p>
                                        <p className="text-[8px] font-bold text-slate-400 font-mono">RG: {mil.rg}</p>
                                      </div>
                                    </button>
                                  ))}
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
        <div className="fixed bottom-8 right-8 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <Shield className="w-4 h-4 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-widest">Salvando Escala...</span>
        </div>
      )}
    </div>
  );
}

