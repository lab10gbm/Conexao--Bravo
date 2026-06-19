import React, { useState, useEffect, useMemo } from 'react';
import { useMilitars } from '../contexts/MilitarContext';
import { db } from '../lib/firebase';
import { doc, setDoc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Loader2, 
  Shield, 
  Users, 
  Plus, 
  X, 
  Calendar as CalendarIcon,
  LayoutGrid,
  BadgeInfo,
  CheckCircle2,
  Trash2,
  CalendarCheck
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
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAlaForDate, getAlaColor, getAlaLightColor, getThemeColors, cn, getOppositeAla } from '../lib/utils';
import { UserProfile } from '../types';
import { RankInsignia } from './RankInsignia';
import { PermutaGrdModal } from './PermutaGrdModal';
import { AnimatePresence, motion } from 'motion/react';
import { cleanUndefined } from "../lib/utils";

interface GrdModuleProps {
  obmContext: string;
  readonly?: boolean;
  user?: UserProfile | null;
}

interface DayGrd {
  rgs: string[];
}

export function GrdModule({ obmContext, readonly = false, user = null }: GrdModuleProps) {
  const { militars, refreshMilitars } = useMilitars();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'spreadsheet'>('calendar');
  const [mainTab, setMainTab] = useState<'grd' | 'officers'>('grd');
  const [grdData, setGrdData] = useState<Record<string, string[]>>({});
  const [officerData, setOfficerData] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchDay, setActiveSearchDay] = useState<{ date: string; index: number | string } | null>(null);
  const [slotCount, setSlotCount] = useState(4);
  const [filterAlas, setFilterAlas] = useState<number[]>([]);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isPermutaModalOpen, setIsPermutaModalOpen] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [pasteResults, setPasteResults] = useState<{ success: number; errors: string[] } | null>(null);

  // Normalize OBM for doc ID
  const obmId = obmContext.replace(/\//g, '_').replace(/\s/g, '_');
  const monthKey = format(currentDate, 'yyyy-MM');
  const docId = `${obmId}_${monthKey}`;

  useEffect(() => {
    setLoading(true);
    // Listen to GRD data
    const unsubscribeGrd = onSnapshot(doc(db, 'grd_configs', docId), (snapshot) => {
      if (snapshot.exists()) {
        setGrdData(snapshot.data().days || {});
      } else {
        setGrdData({});
      }
    });

    // Listen to Officer data
    const unsubscribeOfficers = onSnapshot(doc(db, 'officer_scales', obmId), (snapshot) => {
      if (snapshot.exists()) {
        setOfficerData(snapshot.data().days || {});
      } else {
        setOfficerData({});
      }
      setLoading(false);
    }, (error) => {
      console.error("Error loading data:", error);
      setLoading(false);
    });

    return () => {
      unsubscribeGrd();
      unsubscribeOfficers();
    };
  }, [docId]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const monthDaysOnly = useMemo(() => {
    return eachDayOfInterval({ 
      start: startOfMonth(currentDate), 
      end: endOfMonth(currentDate) 
    });
  }, [currentDate]);

  const filteredMonthDays = useMemo(() => {
    return monthDaysOnly.filter(day => {
      if (mainTab === 'officers') return true;
      if (filterAlas.length === 0) return true;
      const ala = getAlaForDate(day);
      const target = getOppositeAla(ala);
      // Filter by target ala (the one being managed in GRD)
      return filterAlas.includes(target);
    });
  }, [monthDaysOnly, filterAlas, mainTab]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const meusDiasDeGrd = useMemo(() => {
    if (!user || user.isOficial) return [];
    const myRg = user.rg;
    
    // Sort monthDays only
    const sortedDays = [...monthDaysOnly].sort((a, b) => a.getTime() - b.getTime());
    const days: { dateStr: string, date: Date, index: number }[] = [];
    
    for (const d of sortedDays) {
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayRgs = grdData[dateStr] || [];
      const idx = dayRgs.indexOf(myRg || '');
      if (idx !== -1) {
        days.push({ dateStr, date: d, index: idx });
      }
    }
    return days;
  }, [user, monthDaysOnly, grdData]);

  const currentAlaOfDay = selectedDate ? getAlaForDate(selectedDate) : 0;
  const targetAla = getOppositeAla(currentAlaOfDay);

  const selectedDayRgs = selectedDate ? grdData[format(selectedDate, 'yyyy-MM-dd')] || [] : [];
  
  const getAvailableMilitarsByDay = (date: Date, excludeRgs: string[], forcedSearch?: string) => {
    const dayAla = getAlaForDate(date);
    const oppAla = getOppositeAla(dayAla);
    return militars.filter(m => {
      // Normalize OBM to avoid masculine ordinal vs degree symbol issues, spacing, etc.
      const mAla = (m.ala?.toString() || '').toUpperCase().trim();
      const numAla = parseInt(mAla.replace(/\D/g, '') || '0', 10);
      
      const isAllowedAla = numAla === oppAla ||
             mAla === 'EXP' || 
             mAla === 'EXPEDIENTE' ||
             mAla === 'ESCALANTE' ||
             mAla.includes('EXP');
             
      if (forcedSearch && forcedSearch.trim().length >= 2) {
        // Bypass ALA and OBM restrictions if searching explicitly
        if (excludeRgs.includes(m.rg || '')) return false;
        return true;
      }
      
      if (excludeRgs.includes(m.rg || '')) return false;
      
      const rawMObm = m.obm ? m.obm : '10º GBM'; // Treat empty as 10º GBM
      const mObm = rawMObm.replace(/º/g, '°').trim().toUpperCase();
      const ctxObm = (obmContext || '').replace(/º/g, '°').trim().toUpperCase();
      
      if (ctxObm && ctxObm !== 'GLOBAL' && mObm !== ctxObm) return false;
      
      return isAllowedAla;
    }).sort((a, b) => (a.rank || '').localeCompare(b.rank || '') || (a.name || '').localeCompare(b.name || ''));
  };

  const autoFillMayOfficers = async () => {
    setSaving(true);
    const mayData: Record<string, Record<string, string>> = {
      "2026-05-01": { "oficialDia": "CAP BM MACHADO", "sobreaviso": "CAP BM QUINTANILHA", "ras": "CAP BM QUINTANILHA 53352" },
      "2026-05-02": { "oficialDia": "CAP BM MACHADO", "sobreaviso": "CAP BM CASSERES", "ras": "1º TEN BM JULIO RAMOS 16193" },
      "2026-05-03": { "oficialDia": "1º TEN BM JULIO RAMOS", "sobreaviso": "CAP BM QUINTANILHA", "ras": "CAP BM MACHADO 53402" },
      "2026-05-04": { "oficialDia": "CAP BM MARCOS AUGUSTO", "sobreaviso": "CAP BM QUINTANILHA", "ras": "CAP BM KAIZER 14742" },
      "2026-05-05": { "oficialDia": "CAP BM QUINTANILHA", "sobreaviso": "CAP BM MARCOS AUGUSTO", "ras": "CAP BM PATRIK 47136" },
      "2026-05-06": { "oficialDia": "CAP BM MACHADO", "sobreaviso": "CAP BM DURÃO", "ras": "CAP BM QUINTANILHA 53352" },
      "2026-05-07": { "oficialDia": "CAP BM MARCOS AUGUSTO", "sobreaviso": "CAP BM KAIZER", "ras": "CAP BM MACIEL 47129" },
      "2026-05-08": { "oficialDia": "CAP BM MACIEL", "sobreaviso": "CAP BM DURÃO", "ras": "CAP BM DURÃO 48079" },
      "2026-05-09": { "oficialDia": "1º TEN BM JULIO RAMOS", "sobreaviso": "CAP BM MACIEL", "ras": "CAP BM GUSTAVO BOTELHO 53392" },
      "2026-05-10": { "oficialDia": "CAP BM MARCOS AUGUSTO", "sobreaviso": "CAP BM KAIZER", "ras": "CAP BM RAFAEL CALDAS 49155" },
      "2026-05-11": { "oficialDia": "CAP BM KAIZER", "sobreaviso": "CAP BM PATRIK", "ras": "CAP BM MACHADO 53402" },
      "2026-05-12": { "oficialDia": "CAP BM PATRIK", "sobreaviso": "CAP BM MARCOS AUGUSTO", "ras": "CAP BM CARDOSO 48098" },
      "2026-05-13": { "oficialDia": "CAP BM MACIEL", "sobreaviso": "CAP BM KAIZER", "ras": "CAP BM MARCOS AUGUSTO 49163" },
      "2026-05-14": { "oficialDia": "CAP BM MACHADO", "sobreaviso": "CAP BM MACIEL", "ras": "CAP BM ASSINO 53345" },
      "2026-05-15": { "oficialDia": "CAP BM MARCOS AUGUSTO", "sobreaviso": "CAP BM KAIZER", "ras": "CAP BM MARCOS AUGUSTO 49163" }
    };

    try {
      await setDoc(doc(db, 'officer_scales', obmId), cleanUndefined({ days: mayData }), { merge: true });
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const availableMilitars = useMemo(() => {
    if (!selectedDate) return [];
    return getAvailableMilitarsByDay(selectedDate, selectedDayRgs, searchTerm).filter(m => {
      const searchLower = searchTerm.trim().toLowerCase();
      const searchValue = searchTerm.trim();
      if (!searchValue) return true;
      const nameMatch = m.name?.toLowerCase().includes(searchLower) || false;
      const warNameMatch = m.warName?.toLowerCase().includes(searchLower) || false;
      const rankMatch = m.rank?.toLowerCase().includes(searchLower) || false;
      const rgMatch = m.rg?.includes(searchValue) || false;
      return nameMatch || warNameMatch || rankMatch || rgMatch;
    });
  }, [militars, obmContext, selectedDayRgs, searchTerm, selectedDate]);

  const currentTeam = useMemo(() => {
    return selectedDayRgs.map(rg => militars.find(m => m.rg === rg)).filter(Boolean) as UserProfile[];
  }, [selectedDayRgs, militars]);

  const updateDayGrd = async (dateStr: string, rgs: string[]) => {
    const safeRgs = Array.from(rgs, val => val || "");
    
    // Optimistic UI Update
    setGrdData(prev => ({
      ...prev,
      [dateStr]: safeRgs
    }));
    
    setSaving(true);
    try {
      await setDoc(doc(db, 'grd_configs', docId), cleanUndefined({
        days: {
          [dateStr]: safeRgs
        }
      }), { merge: true });
    } catch (error) {
      console.error("Error saving GRD:", error);
    } finally {
      setSaving(false);
    }
  };

  const toggleMilitar = async (rg: string) => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const currentRgs = grdData[dateStr] || [];
    
    let newRgs;
    if (currentRgs.includes(rg)) {
      newRgs = currentRgs.filter(r => r !== rg);
    } else {
      if (currentRgs.length >= 6) {
        alert("Máximo de 6 militares por dia no GRD.");
        return;
      }
      newRgs = [...currentRgs, rg];
    }
    await updateDayGrd(dateStr, newRgs);
  };

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
      await setDoc(doc(db, 'officer_scales', obmId), cleanUndefined({
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

  const handlePasteMass = async () => {
    if (!pasteContent.trim()) return;
    setSaving(true);
    setPasteResults(null);

    const rows = pasteContent.split('\n').filter(line => line.trim());
    let successCount = 0;
    const errors: string[] = [];
    
    if (mainTab === 'grd') {
      const newPastedGrdData: Record<string, string[]> = {};
      for (const row of rows) {
        const parts = row.split('\t').map(p => p.trim());
        if (parts.length < 2) continue;

        let dateStr = parts[0];
        let finalDateStr = '';
        
        const dateParts = dateStr.split(/[\/\-]/);
        if (dateParts.length >= 2) {
          let day = parseInt(dateParts[0]);
          let month = parseInt(dateParts[1]);
          let year = dateParts[2] ? (dateParts[2].length === 2 ? 2000 + parseInt(dateParts[2]) : parseInt(dateParts[2])) : currentDate.getFullYear();
          
          if (!isNaN(day) && !isNaN(month)) {
            const d = new Date(year, month - 1, day);
            if (!isNaN(d.getTime())) finalDateStr = format(d, 'yyyy-MM-dd');
          }
        }

        if (!finalDateStr) {
          errors.push(`Data inválida: ${dateStr}`);
          continue;
        }

        const rgs = parts.slice(1).filter(rg => rg.length > 0).slice(0, 6);
        const validRgs = rgs.filter(rg => {
          const found = militars.find(m => m.rg === rg);
          if (!found) {
            errors.push(`RG ${rg} não encontrado (Data ${dateStr})`);
            return false;
          }
          return true;
        });

        if (validRgs.length > 0) {
          newPastedGrdData[finalDateStr] = validRgs;
          successCount++;
        }
      }

      try {
        if (Object.keys(newPastedGrdData).length > 0) {
          await setDoc(doc(db, 'grd_configs', docId), cleanUndefined({ days: newPastedGrdData }), { merge: true });
        }
        setPasteResults({ success: successCount, errors });
      } catch (err) {
        console.error(err);
        setPasteResults({ success: successCount, errors: [...errors, "Erro ao salvar."] });
      }
    } else {
      // Officers Paste
      const newPastedOfficerData: Record<string, Record<string, string>> = {};
      for (const row of rows) {
        const parts = row.split('\t').map(p => p.trim());
        if (parts.length < 2) continue;

        let dateStr = parts[0];
        if (!dateStr || dateStr.toLowerCase().startsWith('data')) continue;
        
        let finalDateStr = '';
        const dateParts = dateStr.split(/[\/\-]/);
        if (dateParts.length >= 2) {
          let dayNum = parseInt(dateParts[0]);
          let monthNum = parseInt(dateParts[1]);
          // Handle YYYY or YY
          let yearPart = dateParts[2];
          let yearNum = yearPart 
            ? (yearPart.length === 2 ? 2000 + parseInt(yearPart) : parseInt(yearPart)) 
            : currentDate.getFullYear();
          
          if (!isNaN(dayNum) && !isNaN(monthNum)) {
            const d = new Date(yearNum, monthNum - 1, dayNum);
            if (!isNaN(d.getTime())) finalDateStr = format(d, 'yyyy-MM-dd');
          }
        }

        if (!finalDateStr) {
          errors.push(`Data inválida ou não encontrada: ${dateStr}`);
          continue;
        }

        // expected: DATA | OFICIAL DIA | SOBREAVISO
        // parts[2]: OFICIAL DIA, parts[3]: SOBREAVISO
        newPastedOfficerData[finalDateStr] = {
          oficialDia: parts[2] || '',
          sobreaviso: parts[3] || ''
        };
        successCount++;
      }

      try {
        if (Object.keys(newPastedOfficerData).length > 0) {
            await setDoc(doc(db, 'officer_scales', obmId), cleanUndefined({ days: newPastedOfficerData }), { merge: true });
        }
        setPasteResults({ success: successCount, errors });
      } catch (err) {
        console.error(err);
        setPasteResults({ success: successCount, errors: [...errors, "Erro ao salvar."] });
      }
    }
    setSaving(false);
  };

  return (
    <div className="flex h-full bg-slate-50 relative overflow-hidden">
      {/* Calendar Area */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-500 overflow-hidden",
        selectedDate && viewMode === 'calendar' ? "lg:mr-[400px]" : ""
      )}>
        <div className="p-4 sm:p-6 border-b bg-white flex flex-col sm:flex-row items-center justify-between shadow-sm gap-4">
          <div className="flex flex-col gap-4 w-full sm:w-auto">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-cyan-600 shrink-0" />
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter shrink-0">Gestão de Escalas</h2>
              </div>
              <div className="flex items-center bg-slate-100 rounded-lg p-1 justify-between flex-1 sm:flex-none w-full sm:w-[200px] z-10 relative">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-white rounded-md transition-all shadow-sm z-20">
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <span className="text-xs font-black uppercase tracking-widest text-slate-700 mx-2 text-center flex-1">
                  {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                </span>
                <button onClick={handleNextMonth} className="p-2 hover:bg-white rounded-md transition-all shadow-sm z-20">
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
              <button
                onClick={() => setMainTab('grd')}
                className={cn(
                  "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2",
                  mainTab === 'grd' ? "bg-white text-cyan-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Users className="w-3.5 h-3.5" />
                Praças (GRD)
              </button>
              {(!readonly || user?.isOficial) && (
                <button
                  onClick={() => setMainTab('officers')}
                  className={cn(
                    "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2",
                    mainTab === 'officers' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Shield className="w-3.5 h-3.5" />
                  Oficiais
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full sm:w-auto justify-end self-end sm:self-center flex-wrap">
            {readonly && (
              <button 
                onClick={() => setIsPermutaModalOpen(true)}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-amber-500 hover:bg-amber-600 border border-amber-600 text-white rounded-lg shadow-sm transition-colors whitespace-nowrap"
              >
                Solicitar Permuta GRD Extraordinariamente
              </button>
            )}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
              <button
                onClick={() => setViewMode('calendar')}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all flex items-center gap-2",
                  viewMode === 'calendar' ? "bg-white text-cyan-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <CalendarIcon className="w-3 h-3" />
                Calendário
              </button>
              <button
                onClick={() => setViewMode('spreadsheet')}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all flex items-center gap-2",
                  viewMode === 'spreadsheet' ? "bg-white text-cyan-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <LayoutGrid className="w-3 h-3" />
                Planilha
              </button>
            </div>
            
            {viewMode === 'spreadsheet' && (
              <>
                {mainTab === 'grd' && (
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-0.5 rounded-xl flex items-center gap-1">
                      <span className="text-[10px] font-black text-slate-400 px-2 uppercase">Filtrar GRD:</span>
                      {[1, 2, 3, 4].map(num => (
                        <button
                          key={num}
                          onClick={() => {
                            if (filterAlas.includes(num)) {
                              setFilterAlas(filterAlas.filter(a => a !== num));
                            } else {
                              setFilterAlas([...filterAlas, num]);
                            }
                          }}
                          className={cn(
                            "w-7 h-7 flex items-center justify-center text-[10px] font-black rounded-lg transition-all",
                            filterAlas.includes(num) ? getAlaColor(num) + " text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                          )}
                        >
                          {num}
                        </button>
                      ))}
                      {filterAlas.length > 0 && (
                        <button 
                          onClick={() => setFilterAlas([])}
                          className="p-1 px-2 text-[8px] font-black uppercase text-slate-400 hover:text-rose-500"
                        >
                          Limpar
                        </button>
                      )}
                    </div>

                    <div className="bg-slate-100 p-0.5 rounded-xl flex items-center gap-1">
                      <span className="text-[10px] font-black text-slate-400 px-2 uppercase">Colunas:</span>
                      {[4, 5, 6].map(num => (
                        <button
                          key={num}
                          onClick={() => setSlotCount(num)}
                          className={cn(
                            "w-7 h-7 flex items-center justify-center text-[10px] font-black rounded-lg transition-all",
                            slotCount === num ? "bg-white text-cyan-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                          )}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!readonly && mainTab === 'officers' && format(currentDate, 'yyyy-MM') === '2026-05' && Object.keys(officerData).length === 0 && (
                  <button
                    onClick={autoFillMayOfficers}
                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-all flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Auto-preencher Maio
                  </button>
                )}
                
                {!readonly && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPasteModalOpen(true)}
                      className="px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all flex items-center gap-2"
                    >
                      <Plus className="w-3 h-3" />
                      Importar Excel
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="hidden lg:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <div className="w-3 h-3 rounded bg-emerald-400"></div> Ala 1
              <div className="w-3 h-3 rounded bg-rose-400"></div> Ala 2
              <div className="w-3 h-3 rounded bg-blue-400"></div> Ala 3
              <div className="w-3 h-3 rounded bg-amber-400"></div> Ala 4
            </div>
          </div>
        </div>

        {readonly && user && !user.isOficial && (
          <div className="mx-4 sm:mx-6 mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <CalendarCheck className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[12px] font-black uppercase text-indigo-900 tracking-widest">Meus Serviços (GRD)</h3>
                <p className="text-[11px] font-bold text-indigo-700/80">
                   {meusDiasDeGrd.length > 0 
                      ? meusDiasDeGrd.map(d => `${format(d.date, 'dd/MM')} (Vaga ${d.index + 1})`).join('  •  ')
                      : "Nenhum serviço agendado para este mês."}
                </p>
              </div>
            </div>
            
            {meusDiasDeGrd.length > 0 && (
              <div className="px-3 py-1 bg-indigo-200 rounded text-[10px] font-black text-indigo-800">
                {meusDiasDeGrd.length} DIA{meusDiasDeGrd.length > 1 ? 'S' : ''}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {viewMode === 'calendar' ? (
            <div className="flex flex-col">
              <div className="hidden sm:grid grid-cols-7 mb-2 px-1 text-center">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 sm:gap-2">
                {monthDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const alaNum = getAlaForDate(day);
                  const targetAlaNum = getOppositeAla(alaNum);
                  const isCurrMonth = isSameMonth(day, currentDate);
                  const alaLightColorClass = getAlaLightColor(targetAlaNum);
                  
                  // Show data based on mainTab
                  let displayItems = [];
                  if (mainTab === 'grd') {
                    const teamRgs = grdData[dateStr] || [];
                    displayItems = teamRgs.slice(0, 3).map(rg => {
                      const m = militars.find(mil => mil.rg === rg);
                      return m ? `${m.rank} ${m.warName || (m.name || '').split(' ')[0]}` : null;
                    }).filter(Boolean);
                  } else {
                    const offDay = officerData[dateStr] || {};
                    if (offDay.oficialDia) displayItems.push(`D: ${offDay.oficialDia}`);
                    if (offDay.sobreaviso) displayItems.push(`S: ${offDay.sobreaviso}`);
                  }
                  
                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "relative flex flex-col p-3 sm:p-2 border-2 rounded-xl sm:rounded-lg transition-all sm:min-h-[110px]",
                        !isCurrMonth && "hidden sm:flex opacity-40 bg-slate-50 border-transparent cursor-default pointer-events-none text-slate-400 grayscale",
                        isSelected ? "bg-cyan-50 border-cyan-500 shadow-md sm:shadow-sm z-10" : cn(alaLightColorClass, "hover:border-cyan-300 shadow-sm sm:shadow-none"),
                        isToday(day) && "ring-2 ring-cyan-500 ring-offset-2"
                      )}
                    >
                      <div className="flex justify-between items-center sm:items-start mb-2 sm:mb-1.5 w-full">
                        <div className="flex items-center gap-2 border-b-0 pb-0">
                          <span className={cn(
                            "text-base sm:text-sm font-black",
                            isSelected ? "text-cyan-700" : "text-slate-700"
                          )}>
                            {format(day, 'd')}
                          </span>
                          {!isCurrMonth ? null : (
                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", getAlaColor(targetAlaNum))} title={`GRD ${targetAlaNum}`} />
                          )}
                          <span className="text-[11px] font-black text-slate-400 sm:hidden uppercase tracking-widest">
                            {format(day, 'EEEE', {locale: ptBR})}
                          </span>
                        </div>
                        {mainTab === 'grd' && isCurrMonth && (
                          <span className={cn(
                            "text-[8px] font-black uppercase px-2 py-1 sm:px-1.5 sm:py-0.5 rounded outline outline-1 leading-none shrink-0",
                            getAlaLightColor(targetAlaNum)
                          )}>
                            GRD {targetAlaNum}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 sm:gap-1 mt-1 sm:mt-auto flex-1 w-full text-left min-w-0 overflow-hidden">
                        {displayItems.length > 0 ? (
                          <div className="flex flex-row sm:flex-col flex-wrap gap-1.5 sm:gap-1 w-full">
                            {displayItems.slice(0, 3).map((item, idx) => (
                              <span key={idx} className="text-[10px] sm:text-[9px] font-black bg-slate-800 text-white px-2 py-1 sm:px-1.5 sm:py-1 rounded-[4px] uppercase truncate leading-none max-w-full inline-block">
                                {item}
                              </span>
                            ))}
                            {displayItems.length > 3 && (
                               <span className="text-[10px] sm:text-[9px] font-black text-slate-500 px-1 py-1">+ {displayItems.length - 3}</span>
                            )}
                          </div>
                        ) : isCurrMonth && (
                          <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity min-h-[20px]">
                            <Plus className="w-4 h-4 text-cyan-400" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 w-16 text-center">Dia</th>
                      {mainTab === 'grd' ? (
                        <>
                          <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 w-24 text-center border-l">Ala / Alvo</th>
                          {Array.from({ length: slotCount }).map((_, i) => (
                            <th key={i} className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 border-l">Vaga {i + 1}</th>
                          ))}
                        </>
                      ) : (
                        <>
                          <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 border-l">Oficial de Dia / CMT OP / Sobreaviso 1 / GRD 1</th>
                          <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 border-l">Sobreaviso 2 / GRD 2</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMonthDays.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const alaNum = getAlaForDate(day);
                      const targetAlaNum = getOppositeAla(alaNum);
                      const theme = getThemeColors(targetAlaNum);
                      
                      if (mainTab === 'grd') {
                        const teamRgs = grdData[dateStr] || [];
                        return (
                          <tr key={dateStr} className={cn("transition-all duration-200", theme.panel, "hover:bg-black/5")}>
                            <td className="px-3 py-4 text-center border-r border-black/5">
                              <span className={cn(
                                "text-sm font-black",
                                isToday(day) ? "text-cyan-600" : "text-slate-400"
                              )}>
                                {format(day, 'dd/MM')}
                              </span>
                              <div className="text-[8px] font-black uppercase text-slate-300 mt-1">
                                {format(day, 'eee', { locale: ptBR })}
                              </div>
                            </td>
                            <td className="px-3 py-4 text-center border-l bg-black/5">
                              <div className="flex flex-col items-center gap-2">
                                <span className={cn(
                                  "text-[9px] font-black uppercase px-1.5 py-0.5 rounded outline outline-1",
                                  getAlaLightColor(alaNum)
                                )}>
                                  ALA {alaNum}
                                </span>
                                <div className="h-px w-4 bg-slate-200"></div>
                                <span className={cn(
                                  "text-[9px] font-black uppercase px-1.5 py-0.5 rounded outline outline-1",
                                  getAlaLightColor(targetAlaNum)
                                )}>
                                  GRD {targetAlaNum}
                                </span>
                              </div>
                            </td>
                            {Array.from({ length: slotCount }).map((_, index) => {
                              const currentRg = teamRgs[index];
                              const m = currentRg ? militars.find(mil => mil.rg === currentRg) : null;
                              const isActiveSearch = activeSearchDay?.date === dateStr && activeSearchDay?.index === index;
                              
                              return (
                                <td key={index} className="px-2 py-2 border-l border-black/5 w-40 relative">
                                  {m ? (
                                    <div className="group relative flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2 shadow-sm">
                                      <div className="flex items-center gap-2 overflow-hidden">
                                        <RankInsignia rankStr={m.rank} className="scale-[0.4] origin-center shrink-0 -ml-2" />
                                        <div className="min-w-0">
                                          <p className="text-[10px] font-black text-slate-700 truncate">
                                            {m.warName || (m.name || '').split(' ')[0]}
                                          </p>
                                          <p className="text-[8px] font-bold text-slate-400 font-mono">RG: {m.rg}</p>
                                        </div>
                                      </div>
                                      {!readonly && (
                                        <button 
                                          onClick={() => {
                                            const newRgs = [...teamRgs];
                                            newRgs[index] = "";
                                            updateDayGrd(dateStr, newRgs);
                                          }}
                                          className="p-1 text-slate-300 hover:text-rose-500 rounded transition-all opacity-0 group-hover:opacity-100"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  ) : readonly ? (
                                    <div className="w-full flex items-center justify-center p-2 rounded-lg border border-dashed border-slate-200 text-slate-300 text-[10px] font-black uppercase tracking-widest bg-slate-50 opacity-50">
                                      Vazio
                                    </div>
                                  ) : (
                                    <div className="relative">
                                      <button
                                        onClick={() => {
                                          setActiveSearchDay({ date: dateStr, index });
                                          setSearchTerm('');
                                        }}
                                        className="w-full flex items-center justify-center gap-2 p-2 rounded-lg border border-dashed border-slate-200 text-slate-300 hover:border-cyan-300 hover:text-cyan-400 hover:bg-cyan-50/50 transition-all text-[10px] font-black uppercase tracking-widest"
                                      >
                                        <Plus className="w-3 h-3" />
                                        SELECIONAR
                                      </button>

                                      {isActiveSearch && (
                                        <div className="absolute top-0 left-0 w-64 bg-white shadow-2xl border border-slate-200 rounded-xl z-50 p-2 mt-10">
                                          <div className="relative mb-2">
                                            <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                                            <input
                                              autoFocus
                                              type="text"
                                              placeholder="Buscar..."
                                              value={searchTerm}
                                              onChange={(e) => setSearchTerm(e.target.value)}
                                              className="w-full p-2 pl-7 text-[10px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                            />
                                            <button 
                                              onClick={() => setActiveSearchDay(null)}
                                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"
                                            >
                                              <X className="w-3 h-3 text-slate-400" />
                                            </button>
                                          </div>
                                          <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                                            {(() => {
                                              const filteredMilitars = getAvailableMilitarsByDay(day, teamRgs, searchTerm)
                                                .filter(mil => {
                                                  const searchLower = searchTerm.trim().toLowerCase();
                                                  const searchValue = searchTerm.trim();
                                                  if (!searchValue) return true;
                                                  const nameMatch = (mil.name || '').toLowerCase().includes(searchLower);
                                                  const warNameMatch = (mil.warName || '').toLowerCase().includes(searchLower);
                                                  const rankMatch = (mil.rank || '').toLowerCase().includes(searchLower);
                                                  const rgMatch = (mil.rg || '').includes(searchValue);
                                                  return nameMatch || warNameMatch || rankMatch || rgMatch;
                                                });
                                                
                                              if (filteredMilitars.length === 0) {
                                                return (
                                                  <div className="text-center py-4 text-slate-400 italic text-[10px]">
                                                    Nenhuma possibilidade.
                                                  </div>
                                                );
                                              }
                                              
                                              return filteredMilitars.slice(0, 30).map(mil => (
                                                <button
                                                  key={mil.rg}
                                                  onClick={() => {
                                                    const newRgs = [...teamRgs];
                                                    newRgs[index] = mil.rg;
                                                    updateDayGrd(dateStr, newRgs);
                                                    setActiveSearchDay(null);
                                                  }}
                                                  className="w-full text-left p-2 hover:bg-cyan-50 rounded-lg transition-all flex items-center gap-2 group"
                                                >
                                                  <div className="w-6 shrink-0 flex justify-center">
                                                    <RankInsignia rankStr={mil.rank} className="scale-[0.35] origin-center shrink-0" />
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-black text-slate-700 truncate leading-tight uppercase">{mil.rank} {mil.warName || (mil.name || '').split(' ')[0]}</p>
                                                    <p className="text-[8px] font-bold text-slate-400 font-mono italic">RG: {mil.rg}</p>
                                                  </div>
                                                  <Plus className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100" />
                                                </button>
                                              ));
                                            })()}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      } else {
                        // Officer View
                        const offDay = officerData[dateStr] || { oficialDia: '', sobreaviso: '' };
                        return (
                          <tr key={dateStr} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-4 text-center">
                              <span className={cn("text-sm font-black", isToday(day) ? "text-indigo-600" : "text-slate-400")}>
                                {format(day, 'dd/MM')}
                              </span>
                              <div className="text-[8px] font-black uppercase text-slate-300 mt-1">
                                {format(day, 'eee', { locale: ptBR })}
                              </div>
                            </td>
                          {['oficialDia', 'sobreaviso'].map((field) => {
                            const val = offDay[field as keyof typeof offDay] || '';
                            const isActiveSearch = activeSearchDay?.date === dateStr && activeSearchDay?.index === field;
                            
                            return (
                              <td key={field} className="px-2 py-2 border-l border-slate-100 w-64 relative">
                                <div className="group relative flex items-center gap-2">
                                  <div className="flex-1 min-w-0">
                                    <button
                                      disabled={readonly}
                                      onClick={() => {
                                        setActiveSearchDay({ date: dateStr, index: field });
                                        setSearchTerm('');
                                      }}
                                      className={cn(
                                        "w-full text-left px-3 py-2 text-[11px] font-black uppercase border rounded-lg transition-all truncate flex items-center justify-between group",
                                        readonly ? "cursor-default border-slate-100 bg-slate-50 text-slate-500" :
                                        val 
                                          ? "bg-white border-slate-200 text-slate-700" 
                                          : "bg-slate-50 border-dashed border-slate-200 text-slate-300 hover:border-indigo-300 hover:text-indigo-400"
                                      )}
                                    >
                                      <span>{val || (readonly ? "Vazio" : "Selecionar Oficial...")}</span>
                                      {val && !readonly && (
                                        <X 
                                          className="w-3 h-3 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all shrink-0" 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateOfficerDay(dateStr, field, '');
                                          }}
                                        />
                                      )}
                                    </button>
                                  </div>

                                  {isActiveSearch && (
                                    <div className="absolute top-0 left-0 w-64 bg-white shadow-2xl border border-slate-200 rounded-xl z-50 p-2 mt-10">
                                      <div className="relative mb-2">
                                        <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                                        <input
                                          autoFocus
                                          type="text"
                                          placeholder="Buscar Oficial..."
                                          value={searchTerm}
                                          onChange={(e) => setSearchTerm(e.target.value)}
                                          className="w-full p-2 pl-7 text-[10px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <button 
                                          onClick={() => setActiveSearchDay(null)}
                                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"
                                        >
                                          <X className="w-3 h-3 text-slate-400" />
                                        </button>
                                      </div>
                                      <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                                        {(() => {
                                          const filteredMilitars = militars
                                            .filter(m => {
                                              if (!m.name) return false;
                                              const searchLower = searchTerm.trim().toLowerCase();
                                              const searchValue = searchTerm.trim();
                                              const nameMatch = (m.name || '').toLowerCase().includes(searchLower);
                                              const warNameMatch = (m.warName || '').toLowerCase().includes(searchLower);
                                              const rankMatch = (m.rank || '').toLowerCase().includes(searchLower);
                                              const rgMatch = (m.rg || '').includes(searchValue);
                                              
                                              // Focus on officers for this view, or everything if searching
                                              const isOfficer = ['MAJ', 'CAP', 'TEN', 'CEL'].some(r => (m.rank || '').includes(r));
                                              const matchesSearch = nameMatch || warNameMatch || rankMatch || rgMatch;
                                              
                                              if (!searchValue) return isOfficer;
                                              
                                              return matchesSearch && (isOfficer || searchValue.length > 2);
                                            })
                                            .sort((a, b) => (a.rank || '').localeCompare(b.rank || '') || (a.name || '').localeCompare(b.name || ''));
                                            
                                          if (filteredMilitars.length === 0) {
                                            return (
                                              <div className="text-center py-4 text-slate-400 italic text-[10px]">
                                                Nenhuma possibilidade.
                                              </div>
                                            );
                                          }
                                            
                                          return filteredMilitars.slice(0, 15).map(mil => (
                                            <button
                                              key={mil.rg}
                                              onClick={() => {
                                                updateOfficerDay(dateStr, field, `${mil.rank} ${mil.warName || (mil.name || '').split(' ')[0]}`);
                                                setActiveSearchDay(null);
                                              }}
                                              className="w-full text-left p-2 hover:bg-indigo-50 rounded-lg transition-all flex items-center gap-2 group"
                                            >
                                              <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-black text-slate-700 truncate leading-tight uppercase">
                                                  {mil.rank} {mil.name}
                                                </p>
                                                <p className="text-[8px] font-bold text-slate-400 font-mono">RG: {mil.rg}</p>
                                              </div>
                                              <Plus className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100" />
                                            </button>
                                          ));
                                        })()}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          </tr>
                        );
                      }
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor Sidebar (only in calendar mode) */}
      <AnimatePresence>
        {selectedDate && viewMode === 'calendar' && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full lg:w-[400px] bg-white shadow-2xl border-l z-20 flex flex-col"
          >
            <div className="p-6 border-b bg-cyan-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 opacity-70" />
                  {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-100 mt-1">
                  Configuração de GRD • {obmContext}
                </p>
              </div>
              <button 
                onClick={() => setSelectedDate(null)}
                className="p-2 hover:bg-cyan-700/50 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              {/* Day Info Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-100">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ala do Dia</span>
                    <span className={cn(
                      "text-xs font-black uppercase px-2 py-1 rounded inline-flex mt-1 outline outline-1",
                      getAlaLightColor(currentAlaOfDay)
                    )}>
                      ALA {currentAlaOfDay}
                    </span>
                  </div>
                  <div className="flex flex-col items-end text-right">
                    <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600">Alvo do GRD (Oposta)</span>
                    <span className={cn(
                      "text-xs font-black uppercase px-2 py-1 rounded inline-flex mt-1 outline outline-1",
                      getAlaLightColor(targetAla)
                    )}>
                      ALA {targetAla}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Users className="w-3 h-3" /> Guarnição do GRD ({currentTeam.length}/6)
                  </h4>
                  
                  {currentTeam.length === 0 ? (
                    <div className="text-center py-8 px-4 bg-white rounded-xl border border-dashed border-slate-300">
                      <BadgeInfo className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-400">Nenhum militar escalado para este dia.</p>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Selecione abaixo da Ala {targetAla}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentTeam.map(m => (
                        <div key={m.rg} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 group">
                          <div className="w-8 h-8 flex shrink-0 justify-center items-center bg-slate-50 rounded-lg">
                            <RankInsignia rankStr={m.rank} className="scale-50 origin-center" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-1">{m.rank}</p>
                            <p className="text-xs font-black text-slate-800 uppercase tracking-tight truncate leading-none">
                              {m.warName || (m.name || '').split(' ')[0]}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 font-mono mt-1">RG: {m.rg}</p>
                          </div>
                          {!readonly && (
                            <button 
                              disabled={saving}
                              onClick={() => toggleMilitar(m.rg)}
                              className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Selection Area */}
              {!readonly && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Disponíveis na Ala {targetAla}</h4>
                     <div className="relative w-32">
                       <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                       <input 
                         type="text" 
                         placeholder="Buscar..."
                         className="w-full pl-7 pr-2 py-1 text-[10px] border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                       />
                     </div>
                  </div>

                <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                  {availableMilitars.length === 0 ? (
                    <div className="text-center py-4 text-slate-400 italic text-[10px]">
                      Nenhum militar disponível para seleção.
                    </div>
                  ) : (
                    availableMilitars.map(m => (
                      <button
                        key={m.rg}
                        onClick={() => toggleMilitar(m.rg)}
                        disabled={saving || currentTeam.length >= 6}
                        className="p-2.5 rounded-xl border border-slate-100 hover:border-cyan-200 hover:bg-cyan-50 transition-all flex items-center gap-3 text-left group disabled:opacity-50"
                      >
                        <div className="w-10 flex shrink-0 justify-center">
                          <RankInsignia rankStr={m.rank} className="scale-75 origin-center" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-1 block">{m.rank}</span>
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight block">
                            {m.warName || (m.name || '').split(' ')[0]}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 font-mono mt-0.5 block italic">RG: {m.rg}</span>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300 group-hover:text-cyan-600 transition-colors">
                          <Plus className="w-4 h-4" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
              )}
            </div>

            <div className="p-6 border-t bg-slate-50 flex items-center justify-between">
               <div className="flex flex-col">
                 <span className="text-[9px] font-black uppercase text-slate-400">Dica</span>
                 <p className="text-[10px] text-slate-500 italic max-w-[200px]">Mínimo recomendado de 4 militares para garantir o serviço completo.</p>
               </div>
               {saving && (
                 <div className="flex items-center gap-2 text-cyan-600">
                   <Loader2 className="w-4 h-4 animate-spin" />
                   <span className="text-[10px] font-black uppercase">Salvando...</span>
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Paste Modal */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LayoutGrid className="w-6 h-6 text-cyan-600" />
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 leading-none">Importar da Planilha</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Cole aqui os dados do Google Sheets / Excel</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsPasteModalOpen(false);
                  setPasteResults(null);
                  setPasteContent('');
                }}
                className="p-2 hover:bg-slate-200 rounded-full transition-all"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-2 mb-2">
                  <BadgeInfo className="w-3 h-3" /> Instruções
                </p>
                <p className="text-xs text-amber-800 leading-relaxed italic">
                  Copie as colunas da sua planilha e cole abaixo. 
                  <br />
                  {mainTab === 'grd' ? (
                    <>Formato: <span className="font-bold underline">Data [TAB] RG1 [TAB] RG2...</span></>
                  ) : (
                    <>Formato: <span className="font-bold underline">Data [TAB] DIA [TAB] OFICIAL [TAB] SOBREAVISO</span></>
                  )}
                </p>
              </div>

              {!pasteResults ? (
                <textarea
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder="Cole aqui..."
                  className="w-full h-64 p-4 text-[11px] font-mono border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-cyan-500 transition-all resize-none bg-slate-50"
                />
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <h4 className="text-sm font-black text-emerald-800 uppercase tracking-tight">Importação Concluída</h4>
                    <p className="text-xs text-emerald-600 mt-1">{pasteResults.success} dias atualizados com sucesso.</p>
                  </div>

                  {pasteResults.errors.length > 0 && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                      <h4 className="text-[10px] font-black text-rose-700 uppercase tracking-widest mb-2">Avisos / Erros:</h4>
                      <ul className="space-y-1 text-[10px] text-rose-600 font-bold overflow-y-auto max-h-32">
                        {pasteResults.errors.map((err, i) => (
                          <li key={i} className="flex items-center gap-2">• {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-slate-50 flex items-center justify-end gap-3">
              {!pasteResults ? (
                <>
                  <button 
                    onClick={() => setIsPasteModalOpen(false)}
                    className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700"
                  >
                    Cancelar
                  </button>
                  <button 
                    disabled={saving || !pasteContent.trim()}
                    onClick={handlePasteMass}
                    className="px-6 py-2.5 bg-cyan-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-cyan-700 shadow-lg shadow-cyan-200 transition-all flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                    Confirmar Importação
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => {
                    setIsPasteModalOpen(false);
                    setPasteResults(null);
                    setPasteContent('');
                  }}
                  className="px-6 py-2.5 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-900 shadow-lg shadow-slate-200 transition-all"
                >
                  Fechar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {readonly && user && (
        <PermutaGrdModal 
           isOpen={isPermutaModalOpen}
           onClose={() => setIsPermutaModalOpen(false)}
           user={user}
           grdData={grdData}
           meusDiasDeGrd={meusDiasDeGrd}
           militars={militars}
           monthDaysOnly={monthDaysOnly}
        />
      )}
    </div>
  );
}
