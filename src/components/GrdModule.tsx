import React, { useState, useEffect, useMemo } from 'react';
import { parseRank, sortAllBySeniority } from "../lib/rankUtils";
import { useMilitars } from '../contexts/MilitarContext';
import { db } from '../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  ChevronLeft, 
  ChevronRight, 
  Shield, 
  Users, 
  Plus, 
  Calendar as CalendarIcon,
  LayoutGrid,
  CheckCircle2,
  CalendarCheck
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  startOfWeek, 
  endOfWeek 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAlaForDate, getAlaColor, cn, getOppositeAla, cleanUndefined } from '../lib/utils';
import { UserProfile } from '../types';
import { PermutaGrdModal } from './PermutaGrdModal';
import { resolveCanonicalScope, formatScopeLabel } from '../lib/canonicalScope';
import { GrdPasteModal } from '../features/grd/components/GrdPasteModal';
import { GrdSideDrawer } from '../features/grd/components/GrdSideDrawer';
import { GrdCalendarGrid } from '../features/grd/components/GrdCalendarGrid';
import { GrdSpreadsheetView } from '../features/grd/components/GrdSpreadsheetView';

interface GrdModuleProps {
  obmContext: string;
  setObmContext?: (obm: string) => void;
  availableObms?: string[];
  readonly?: boolean;
  user?: UserProfile | null;
}

export function GrdModule({ obmContext, setObmContext, availableObms = [], readonly = false, user = null }: GrdModuleProps) {
  const { militars } = useMilitars();
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    if (today.getDate() >= 20) {
      return addMonths(today, 1);
    }
    return today;
  });
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
  }, [docId, obmId]);

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
      return filterAlas.includes(target);
    });
  }, [monthDaysOnly, filterAlas, mainTab]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const meusDiasDeGrd = useMemo(() => {
    if (!user || user.isOficial) return [];
    const myRg = user.rg;
    
    const sortedDays = [...monthDaysOnly].sort((a, b) => a.getTime() - b.getTime());
    const days: { dateStr: string; date: Date; index: number }[] = [];
    
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
      const mAla = (m.ala?.toString() || '').toUpperCase().trim();
      const numAla = parseInt(mAla.replace(/\D/g, '') || '0', 10);
      
      const isAllowedAla = numAla === oppAla ||
             mAla === 'EXP' || 
             mAla === 'EXPEDIENTE' ||
             mAla === 'ESCALANTE' ||
             mAla.includes('EXP');
             
      if (forcedSearch && forcedSearch.trim().length >= 2) {
        if (excludeRgs.includes(m.rg || '')) return false;
        return true;
      }
      
      if (excludeRgs.includes(m.rg || '')) return false;
      
      const rawMObm = m.obm ? m.obm : '10º GBM';
      const mObm = rawMObm.replace(/º/g, '°').trim().toUpperCase();
      const ctxObm = (obmContext || '').replace(/º/g, '°').trim().toUpperCase();
      
      if (ctxObm && ctxObm !== 'GLOBAL' && mObm !== ctxObm) return false;
      
      return isAllowedAla;
    }).sort(sortAllBySeniority);
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
    
    let newRgs: string[];
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
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <Shield className="w-6 h-6 text-cyan-600 shrink-0" />
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter shrink-0">Gestão de Escalas</h2>
                </div>
                <div className="flex items-center gap-2 mt-0.5 ml-8">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unidade: {obmContext}</span>
                  {availableObms.length > 1 && setObmContext && (
                    <select
                      value={obmContext}
                      onChange={(e) => setObmContext(e.target.value)}
                      className="bg-slate-100 border border-slate-200 text-slate-500 text-[10px] uppercase font-black tracking-widest rounded px-1.5 py-0.5 outline-none focus:border-cyan-500 transition-colors"
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
            <GrdCalendarGrid
              monthDays={monthDays}
              currentDate={currentDate}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              mainTab={mainTab}
              grdData={grdData}
              officerData={officerData}
              militars={militars}
            />
          ) : (
            <GrdSpreadsheetView
              filteredMonthDays={filteredMonthDays}
              mainTab={mainTab}
              slotCount={slotCount}
              grdData={grdData}
              officerData={officerData}
              militars={militars}
              obmContext={obmContext}
              readonly={readonly}
              activeSearchDay={activeSearchDay}
              setActiveSearchDay={setActiveSearchDay}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              updateDayGrd={updateDayGrd}
              updateOfficerDay={updateOfficerDay}
              getAvailableMilitarsByDay={getAvailableMilitarsByDay}
            />
          )}
        </div>
      </div>

      {/* Side Drawer for Selection in Calendar Mode */}
      <GrdSideDrawer
        isOpen={Boolean(selectedDate && viewMode === 'calendar')}
        onClose={() => setSelectedDate(null)}
        selectedDate={selectedDate}
        obmContext={obmContext}
        currentAlaOfDay={currentAlaOfDay}
        targetAla={targetAla}
        currentTeam={currentTeam}
        availableMilitars={availableMilitars}
        readonly={readonly}
        saving={saving}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onToggleMilitar={toggleMilitar}
      />

      {/* Paste Modal */}
      <GrdPasteModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        mainTab={mainTab}
        currentDate={currentDate}
        militars={militars}
        docId={docId}
        obmId={obmId}
      />
      
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
