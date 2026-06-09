import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Library, 
  Calendar, 
  Plus, 
  History, 
  Download, 
  Search, 
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Filter,
  FileJson,
  FileText,
  X,
  Table as TableIcon,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '../lib/utils';
import { RankInsignia } from './RankInsignia';
import { MultiSelectFilter } from './ui/MultiSelectFilter';
import { UserProfile, Vacation } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, setDoc, doc, updateDoc, deleteDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { VacationImporter } from './VacationImporter';

import { useMilitars } from '../contexts/MilitarContext';
import { exportToExcel } from '../lib/exportUtils';
import { VacationStats } from './VacationStats';
import { cleanUndefined } from "../lib/utils";

interface VacationModuleProps {
  user: UserProfile;
  onBackToPortal: () => void;
  isSadMode?: boolean;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function VacationModule({ user, onBackToPortal, isSadMode = false }: VacationModuleProps) {
  const { militars } = useMilitars();
  const isPowerUser = user.isAdmin || (user.isEscalante && isSadMode);
  
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [targetRg, setTargetRg] = useState((isPowerUser && isSadMode) ? '' : user.rg);
  const [selectedMilitar, setSelectedMilitar] = useState<UserProfile | null>((isPowerUser && isSadMode) ? null : user);
  const [viewMode, setViewMode] = useState<'individual' | 'report'>('individual');
  
  const [activeYear, setActiveYear] = useState('2026');
  const [reportYear, setReportYear] = useState('2026');

  // Filter States
  const [reportSearch, setReportSearch] = useState('');
  const [filterPostoGrad, setFilterPostoGrad] = useState<string[]>([]);
  const [filterObm, setFilterObm] = useState<string[]>([]);
  const [filterAla, setFilterAla] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);

  // Vacation Preference Stats
  const [preferencesEnabled, setPreferencesEnabled] = useState(false);
  const [userPrefs, setUserPrefs] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [allPreferences, setAllPreferences] = useState<Record<string, any>>({});
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [isNavMenuExpanded, setIsNavMenuExpanded] = useState(true);

  useEffect(() => {
    let unsubAllPrefs = () => {};
    if (isPowerUser && viewMode === 'report') {
      setLoading(true);
      unsubAllPrefs = onSnapshot(collection(db, 'vacation_preferences'), (snap) => {
        const prefs: Record<string, any> = {};
        snap.forEach(doc => {
          prefs[normalizeRg(doc.id)] = doc.data();
        });
        setAllPreferences(prefs);
        setLoading(false);
      }, (e) => {
        console.error('Error fetching all preferences:', e);
        setLoading(false);
      });
    }
    return () => unsubAllPrefs();
  }, [isPowerUser, viewMode]);

  const fetchAllPreferences = async () => {
    // Deprecated in favor of the real-time effect above
  };

  useEffect(() => {
    const checkAuthAndListen = () => {
      if (!db || !auth.currentUser) return null;

      const unsubConfig = onSnapshot(doc(db, 'config', 'vacation_settings'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setPreferencesEnabled(data.preferencesEnabled || false);
          setActiveYear(data.activeYear || '2026');
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'config/vacation_settings', false);
      });
      return unsubConfig;
    };

    let unsub: any = checkAuthAndListen();
    
    // Auth state might change, so we might need to re-run
    const unsubAuth = auth.onAuthStateChanged(() => {
      if (unsub) unsub();
      unsub = checkAuthAndListen();
    });

    return () => {
      if (unsub) unsub();
      unsubAuth();
    };
  }, []);

  useEffect(() => {
    let unsubPrefs = () => {};
    if (selectedMilitar?.rg) {
      const cleanRg = normalizeRg(selectedMilitar.rg);
      unsubPrefs = onSnapshot(doc(db, 'vacation_preferences', cleanRg), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setUserPrefs(data.preferences?.[activeYear] || (activeYear === '2026' ? data.months : []) || []);
          setIsSubmitted(data.submitted?.[activeYear] || false);
        } else {
          setUserPrefs([]);
          setIsSubmitted(false);
        }
      }, (e) => {
         console.error('Error fetching preferences:', e);
      });
    } else {
      setUserPrefs([]);
      setIsSubmitted(false);
    }
    return () => unsubPrefs();
  }, [selectedMilitar?.rg, activeYear]);

  const fetchUserPreferences = async (rg: string) => {
    // Deprecated in favor of the real-time effect above
  };

  const toggleMonthPreference = async (month: string) => {
    if (!selectedMilitar || isSubmitted) return;
    
    let newPrefs = [...userPrefs];
    if (newPrefs.includes(month)) {
      newPrefs = newPrefs.filter(m => m !== month);
    } else {
      if (newPrefs.length >= 3) {
        alert('Você só pode escolher até 3 meses de preferência.');
        return;
      }
      newPrefs.push(month);
    }

    setUserPrefs(newPrefs);
    setSavingPrefs(true);
    try {
      const updateData: any = {
        rg: normalizeRg(selectedMilitar.rg),
        [`preferences.${activeYear}`]: newPrefs,
        updatedAt: serverTimestamp()
      };
      if (activeYear === '2026') {
        updateData.months = newPrefs;
      }
      await setDoc(doc(db, 'vacation_preferences', normalizeRg(selectedMilitar.rg)), cleanUndefined(updateData), { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `vacation_preferences/${selectedMilitar.rg}`, false);
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSubmitPreferences = async () => {
    if (!selectedMilitar) return;
    if (userPrefs.length !== 3) {
      alert('Selecione exatamente 3 meses antes de enviar.');
      return;
    }
    if (!confirm('Após enviar, não será possível alterar suas opções. Deseja continuar?')) {
      return;
    }
    setSavingPrefs(true);
    try {
      await setDoc(doc(db, 'vacation_preferences', normalizeRg(selectedMilitar.rg)), cleanUndefined({
              [`submitted.${activeYear}`]: true,
              updatedAt: serverTimestamp()
            }), { merge: true });
      setIsSubmitted(true);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `vacation_preferences/${selectedMilitar.rg}`, false);
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleGrantMonth = async (rg: string, month: string) => {
    if (!isPowerUser) return;
    try {
       await setDoc(doc(db, 'vacation_preferences', normalizeRg(rg)), cleanUndefined({
                [`granted.${reportYear}`]: month,
                updatedAt: serverTimestamp()
              }), { merge: true });
       // Update local state without unmounting
       setAllPreferences(prev => ({
         ...prev,
         [normalizeRg(rg)]: {
           ...prev[normalizeRg(rg)],
           granted: {
             ...(prev[normalizeRg(rg)]?.granted || {}),
             [reportYear]: month
           }
         }
       }));
    } catch (e) {
       console.error('Error saving granted month:', e);
    }
  };

  const toggleGlobalPreferences = async () => {
    if (!isPowerUser) return;
    try {
      await setDoc(doc(db, 'config', 'vacation_settings'), cleanUndefined({
              preferencesEnabled: !preferencesEnabled,
              updatedBy: user.name,
              updatedAt: serverTimestamp()
            }), { merge: true });
    } catch (e) {
      console.error('Error updating global config:', e);
    }
  };

  useEffect(() => {
    let unsub = () => {};
    const rgToWatch = isPowerUser && viewMode === 'report' ? selectedMilitarRg : (user?.rg || '');
    if (rgToWatch) {
      setLoading(true);
      const cleanRg = normalizeRg(rgToWatch);
      const q = query(collection(db, 'vacations'), where('militarRg', '==', cleanRg));
      unsub = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vacation));
        setVacations(data.sort((a, b) => (b.anoRef || '').localeCompare(a.anoRef || '')));
        setLoading(false);
      }, (e) => {
        handleFirestoreError(e, OperationType.LIST, 'vacations', false);
        setLoading(false);
      });
    } else {
      setVacations([]);
    }
    return () => unsub();
  }, [isPowerUser, viewMode, selectedMilitarRg, user?.rg]);

  const fetchVacations = async (rg: string) => {
    // Deprecated in favor of the real-time effect above
  };

  const handleImport = async (newVacations: Vacation[]) => {
    setLoading(true);
    try {
      for (const v of newVacations) {
        // Use RefYear + StartDate as a composite ID to avoid duplicates
        const docId = `${v.militarRg}_${v.anoRef}_${v.dataInicio.replace(/\//g, '')}`;
        const savedData = cleanUndefined({
          ...v,
          updatedAt: new Date().toISOString()
        });
        await setDoc(doc(db, 'vacations', docId), savedData, { merge: true });
        await setDoc(doc(db, 'militaries', v.militarRg, 'ferias', docId), savedData, { merge: true });
      }
      setShowImporter(false);
      if (selectedMilitar) {
        await fetchVacations(selectedMilitar.rg);
      }
    } catch (e) {
      console.error('Error importing vacations:', e);
      alert('Erro ao salvar os dados no sistema seguro.');
    } finally {
      setLoading(false);
    }
  };

   const deleteVacation = async (id: string) => {
    if (!confirm('Deseja realmente excluir este registro de férias do sistema?')) return;
    try {
      const rg = id.split('_')[0];
      await deleteDoc(doc(db, 'vacations', id));
      if (rg) await deleteDoc(doc(db, 'militaries', rg, 'ferias', id));
      if (selectedMilitar) fetchVacations(selectedMilitar.rg);
    } catch (e) {
      console.error('Error deleting vacation:', e);
    }
  };

  const currentYearVacations = vacations.filter(v => v.anoRef === '2026' || v.status === 'marcado');
  const pastVacations = vacations.filter(v => v.anoRef !== '2026' && v.status === 'gozado');

  const handleExportExcel = () => {
    if (!selectedMilitar) return;
    const exportData = vacations.map(v => ({
      'Militar': `${selectedMilitar.rank} ${selectedMilitar.name}`,
      'RG': selectedMilitar.rg,
      'Ano Ref': v.anoRef,
      'Início': v.dataInicio,
      'Retorno': v.dataRetorno,
      'Status': v.status.toUpperCase(),
      'Ato/Bol': `${v.ato} - ${v.boletim}`,
      'Dias Gozados': v.diasGozados,
      'Saldo a Gozar': v.diasAGozar
    }));
    exportToExcel(exportData, 'Histórico de Férias', `Relatorio_Ferias_${selectedMilitar.rg}`);
  };

  const { uniqueRanks, uniqueObms, uniqueAlas } = React.useMemo(() => {
    return {
      uniqueRanks: Array.from(new Set(militars.map(m => m.rank).filter(Boolean))) as string[],
      uniqueObms: Array.from(new Set(militars.map(m => m.obm || '10º GBM').filter(Boolean))) as string[],
      uniqueAlas: Array.from(new Set(militars.map(m => m.ala?.toString() || '').filter(Boolean))) as string[]
    };
  }, [militars]);

  const filteredMilitarsReport = React.useMemo(() => {
    return militars.filter(m => {
      const term = reportSearch.toLowerCase();
      const matchesSearch = (m.name?.toLowerCase().includes(term) || m.warName?.toLowerCase().includes(term) || m.rg?.includes(term));
      const matchesPosto = filterPostoGrad.length === 0 || filterPostoGrad.includes(m.rank || '');
      const matchesObm = filterObm.length === 0 || filterObm.includes(m.obm || '10º GBM');
      const matchesAla = filterAla.length === 0 || filterAla.includes(m.ala?.toString() || '');
      
      const data: any = allPreferences[normalizeRg(m.rg)] || {};
      const prefs = data.preferences?.[reportYear] || (reportYear === '2026' ? data.months : []) || [];
      const status = prefs.length === 3 ? 'COMPLETO' : prefs.length === 0 ? 'PENDENTE' : 'PARCIAL';
      const matchesStatus = filterStatus.length === 0 || filterStatus.includes(status);

      return matchesSearch && matchesPosto && matchesObm && matchesAla && matchesStatus;
    });
  }, [militars, reportSearch, filterPostoGrad, filterObm, filterAla, filterStatus, allPreferences, reportYear]);

  return (
    <div className="flex flex-col gap-8 font-sans">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
           <button 
             onClick={onBackToPortal}
             className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] mb-4 group"
           >
             <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
             <span className="hidden sm:inline">Voltar ao Portal Principal</span>
             <span className="sm:hidden">Voltar</span>
           </button>
           <h2 className="text-3xl sm:text-4xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-4">
              <Library className="w-8 h-8 sm:w-10 sm:h-10 text-orange-600" />
              Controle de Férias
           </h2>
           <p className="text-[10px] sm:text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Escalonamento Anual e Sincronização Intranet</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           {isPowerUser && (
             <button 
               onClick={() => setViewMode(viewMode === 'individual' ? 'report' : 'individual')}
               className={`px-4 py-3 border-2 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 ${
                 viewMode === 'report' 
                   ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                   : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
               }`}
             >
               <TableIcon className="w-4 h-4" /> {viewMode === 'report' ? 'Ver Individual' : 'Relatório Consolidado'}
             </button>
           )}
           {(isPowerUser && isSadMode && viewMode === 'individual') && (
             <div className="relative w-full sm:w-auto">
                <div className="flex items-center gap-2 bg-white border-2 border-slate-200 rounded-2xl px-4 py-2 focus-within:border-indigo-400 transition-all">
                   <Search className="w-5 h-5 text-slate-400" />
                   <input 
                     type="text"
                     placeholder="RG do Militar..."
                     className="outline-none text-[10px] font-black uppercase tracking-widest text-slate-700 w-full sm:w-32"
                     value={targetRg}
                     onChange={(e) => {
                       setTargetRg(e.target.value);
                       const m = militars.find(x => normalizeRg(x.rg) === normalizeRg(e.target.value));
                       if (m) setSelectedMilitar(m);
                     }}
                   />
                </div>
                {targetRg && !selectedMilitar && (
                  <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-[200] max-h-48 overflow-y-auto">
                    {militars.filter(m => normalizeRg(m.rg).includes(normalizeRg(targetRg)) || (m.name || '').toLowerCase().includes(targetRg.toLowerCase())).map(m => (
                      <button 
                        key={m.rg}
                        onClick={() => {
                          setSelectedMilitar(m);
                          setTargetRg(m.rg);
                        }}
                        className="w-full p-2 text-left hover:bg-slate-50 text-[9px] font-bold uppercase tracking-tight flex items-center justify-between"
                      >
                        <span>{m.rank} {m.warName || m.name}</span>
                        <span className="text-slate-400">RG: {m.rg}</span>
                      </button>
                    ))}
                  </div>
                )}
             </div>
           )}
           <button 
             onClick={() => window.open('https://cbmerj.rj.gov.br/dgp/sistema/relatorio_mapa_forca.php', '_blank')}
             className="px-4 py-3 bg-slate-100 text-slate-600 border border-slate-200 rounded-2xl hover:bg-slate-200 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
           >
              <ExternalLink className="w-4 h-4" /> Acessar DGP
           </button>
           <button 
             onClick={() => selectedMilitar && setShowImporter(true)}
             disabled={!selectedMilitar || !isPowerUser}
             className={cn("flex-1 sm:flex-none px-6 py-3 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-orange-100 disabled:opacity-50", !isPowerUser && "hidden")}
           >
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">Sincronizar DGP</span><span className="sm:hidden">Sincronizar</span>
           </button>
           {isPowerUser && (
              <div className="flex items-center gap-2 bg-white px-3 py-2 border-2 border-slate-200 rounded-2xl">
                 <span className="hidden sm:inline text-[9px] font-black uppercase text-slate-400">Coleta SAD:</span>
                 <select 
                   value={activeYear}
                   onChange={async (e) => {
                     const newYear = e.target.value;
                     await setDoc(doc(db, 'config', 'vacation_settings'), cleanUndefined({ activeYear: newYear }), { merge: true });
                   }}
                   className="text-[10px] font-black text-indigo-600 bg-transparent outline-none cursor-pointer tracking-widest"
                 >
                   <option value="2026">2026</option>
                   <option value="2027">2027</option>
                   <option value="2028">2028</option>
                   <option value="2029">2029</option>
                 </select>
                 <div className="w-px h-6 bg-slate-200 mx-1"></div>
                 <button 
                   onClick={toggleGlobalPreferences}
                   className={`px-3 py-1.5 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-1 ${
                     preferencesEnabled 
                       ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100' 
                       : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100'
                   }`}
                 >
                   <Clock className="w-3 h-3" /> {preferencesEnabled ? 'ON' : 'OFF'}
                 </button>
              </div>
            )}
        </div>
      </div>

      {viewMode === 'report' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border-2 border-slate-50 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 sm:p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/50 gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsNavMenuExpanded(!isNavMenuExpanded)}
                  className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm shrink-0"
                  title={isNavMenuExpanded ? "Minimizar Navegador" : "Maximizar Navegador"}
                >
                  {isNavMenuExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight">Relatório Consolidado de Preferências</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Lista completa de militares e seus meses de preferência para o escalonamento SAD</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const exportData = filteredMilitarsReport.map(m => {
                      const data: any = allPreferences[normalizeRg(m.rg)] || {};
                      const prefs = data.preferences?.[reportYear] || (reportYear === '2026' ? data.months : []) || [];
                      const granted = data.granted?.[reportYear] || '-';
                      return {
                        'Militar': `${m.rank} ${m.name}`,
                        'RG': m.rg,
                        'Mês 1': prefs[0] || '-',
                        'Mês 2': prefs[1] || '-',
                        'Mês 3': prefs[2] || '-',
                        'Mês Concedido': granted,
                        'Contagem': prefs.length
                      };
                    });
                    exportToExcel(exportData, `Consolidado_Preferencias_${reportYear}`, 'Preferencias_Ferias_SAD');
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                >
                  <FileSpreadsheet className="w-4 h-4" /> <span className="sm:hidden">Exportar</span><span className="hidden sm:inline">Exportar Filtrados</span>
                </button>
              </div>
            </div>

            {isNavMenuExpanded && (
              <div className="p-6 sm:p-8 border-b border-slate-50 space-y-6">
                <VacationStats 
                  militars={filteredMilitarsReport} 
                  allPreferences={allPreferences} 
                  reportYear={reportYear} 
                />
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 transition-all focus-within:border-indigo-200">
                  <Search className="w-6 h-6 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Filtrar por nome, guerra ou RG..."
                    className="bg-transparent outline-none flex-1 text-xs font-bold uppercase tracking-widest text-slate-700"
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                  />
                  <div className="w-px h-6 bg-slate-200 mx-2 hidden sm:block"></div>
                  <select 
                    value={reportYear}
                    onChange={(e) => setReportYear(e.target.value)}
                    className="bg-white border-2 border-slate-200 text-indigo-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
                  >
                    <option value="2026">Ano 2026</option>
                    <option value="2027">Ano 2027</option>
                    <option value="2028">Ano 2028</option>
                    <option value="2029">Ano 2029</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <MultiSelectFilter label="Posto/Grad" options={uniqueRanks.sort()} selected={filterPostoGrad} onChange={setFilterPostoGrad} />
                  <MultiSelectFilter label="OBM" options={uniqueObms.sort()} selected={filterObm} onChange={setFilterObm} />
                  <MultiSelectFilter label="Ala" options={uniqueAlas.sort()} selected={filterAla} onChange={setFilterAla} />
                  <MultiSelectFilter label="Status SAD" options={['COMPLETO', 'PARCIAL', 'PENDENTE']} selected={filterStatus} onChange={setFilterStatus} />
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/20">
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Militar</th>
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">RG</th>
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Opc 1</th>
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Opc 2</th>
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Opc 3</th>
                    <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-center">Status</th>
                    <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-center">Mês Concedido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan={7} className="p-20 text-center text-[10px] font-black text-slate-300 uppercase animate-pulse">Cruzando dados de preferências...</td></tr>
                  ) : filteredMilitarsReport.length === 0 ? (
                    <tr><td colSpan={7} className="p-20 text-center text-[10px] font-black text-slate-300 uppercase">Nenhum militar encontrado com os filtros aplicados.</td></tr>
                  ) : (
                    filteredMilitarsReport
                      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                      .map((m) => {
                        const rg = normalizeRg(m.rg);
                        const data: any = allPreferences[rg] || {};
                        const prefs = data.preferences?.[reportYear] || (reportYear === '2026' ? data.months : []) || [];
                        const granted = data.granted?.[reportYear] || '';
                        const isComplete = prefs.length === 3;
                        
                        return (
                          <tr key={m.rg} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="shrink-0 w-8 flex justify-center">
                                  <RankInsignia rankStr={m.rank} />
                                </div>
                                <div className="flex flex-col leading-tight">
                                  <div className="text-[11px] font-black text-slate-800 uppercase">{m.rank}</div>
                                  <div className="text-[14px] font-black text-indigo-600 uppercase tracking-tight">{m.warName || m.name}</div>
                                  <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{m.obm}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-[10px] font-bold text-slate-500 font-mono tracking-widest">{m.rg}</span>
                            </td>
                            <td className="px-5 py-4">
                              {prefs[0] ? (
                                <span className={cn("px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border", granted === prefs[0] ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-indigo-50 text-indigo-700 border-indigo-100")}>{prefs[0]}</span>
                              ) : <span className="text-slate-200 text-[10px]">—</span>}
                            </td>
                            <td className="px-5 py-4">
                              {prefs[1] ? (
                                <span className={cn("px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border", granted === prefs[1] ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-indigo-50 text-indigo-700 border-indigo-100")}>{prefs[1]}</span>
                              ) : <span className="text-slate-200 text-[10px]">—</span>}
                            </td>
                            <td className="px-5 py-4">
                              {prefs[2] ? (
                                <span className={cn("px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border", granted === prefs[2] ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-indigo-50 text-indigo-700 border-indigo-100")}>{prefs[2]}</span>
                              ) : <span className="text-slate-200 text-[10px]">—</span>}
                            </td>
                            <td className="px-5 py-4 text-center">
                              {prefs.length > 0 ? (
                                <div className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                  isComplete ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                )}>
                                  <div className={cn("w-1.5 h-1.5 rounded-full", isComplete ? "bg-emerald-500" : "bg-amber-500")}></div>
                                  {isComplete ? 'Completo' : `${prefs.length}/3`}
                                </div>
                              ) : (
                                <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Pendente</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-center">
                              {isSadMode ? (
                                <select
                                  value={granted}
                                  onChange={(e) => handleGrantMonth(m.rg, e.target.value)}
                                  className={cn("px-2 py-1.5 border rounded-lg text-[9px] font-black uppercase tracking-widest outline-none transition-colors",
                                    granted ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-slate-200 text-slate-500 hover:border-indigo-200"
                                  )}
                                >
                                  <option value="">- Conceder -</option>
                                  {MONTHS.map(mo => (
                                    <option key={mo} value={mo}>{mo} {prefs.includes(mo) ? '★' : ''}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-500">{granted || '-'}</span>
                              )}
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
      ) : selectedMilitar ? (
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-50 shadow-sm flex flex-col md:flex-row md:items-center gap-6 animate-in fade-in slide-in-from-top-2">
           <div className="flex items-center gap-6 flex-1">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xl overflow-hidden p-2">
                <RankInsignia rankStr={selectedMilitar.rank} />
              </div>
              <div className="flex-1">
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                   <span className="text-indigo-600 mr-2">{selectedMilitar.rank}</span>
                   {selectedMilitar.warName || selectedMilitar.name}
                 </h3>
                 <div className="flex gap-4 mt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">RG: {selectedMilitar.rg}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">OBM: {selectedMilitar.obm}</span>
                 </div>
              </div>
           </div>
           {(isPowerUser && isSadMode) && (
              <div className="flex items-center gap-3">
                 <button 
                   onClick={() => setShowImporter(true)}
                   className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors"
                 >
                    Sincronização em Massa (DGP)
                 </button>
                 <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 text-[10px] font-black uppercase tracking-widest">
                    Administrador
                 </div>
              </div>
           )}
        </div>
      ) : (
        <div className="bg-amber-50/50 p-12 rounded-3xl border-2 border-dashed border-amber-200 text-center">
           <Search className="w-12 h-12 text-amber-400 mx-auto mb-4" />
           <h3 className="text-sm font-black text-amber-800 uppercase tracking-widest">Selecione um militar acima</h3>
           <p className="text-amber-600 font-bold uppercase text-[9px] tracking-[0.2em] mt-2">Para gerenciar férias, busque pelo RG ou Nome</p>
        </div>
      )}

      {selectedMilitar && viewMode === 'individual' && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
           {/* Sidebar Stats */}
         <div className="xl:col-span-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-6">
            <div className="bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
               <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-600/20 rounded-full blur-3xl"></div>
               <h3 className="text-orange-400 font-black text-[10px] uppercase tracking-[0.3em] mb-6">Resumo Anual</h3>
               <div className="space-y-6">
                  <div>
                     <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Dias Gozados</div>
                     <div className="text-3xl sm:text-4xl font-black tracking-tighter">
                        {vacations.reduce((acc, v) => acc + (v.diasGozados || 0), 0)}
                     </div>
                  </div>
                  <div className="pt-6 border-t border-white/10">
                     <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Saldo a Gozar</div>
                     <div className="text-3xl sm:text-4xl font-black tracking-tighter text-orange-500">
                        {vacations.reduce((acc, v) => acc + (v.diasAGozar || 0), 0)}
                     </div>
                  </div>
               </div>
            </div>

            {/* Próximos Afastamentos */}
            <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 border-2 border-slate-50 shadow-sm">
               <h3 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-6">Próximos Afastamentos</h3>
               <div className="space-y-4">
                  {vacations.filter(v => v.status === 'marcado').length > 0 ? (
                    vacations.filter(v => v.status === 'marcado').map(v => (
                       <div key={v.id} className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                          <div className="text-[9px] font-black text-orange-600 uppercase mb-1">Ref: {v.anoRef}</div>
                          <div className="text-xs font-black text-slate-800 uppercase">{v.dataInicio}</div>
                          <div className="text-[8px] font-bold text-orange-400 uppercase tracking-widest mt-1">Status: Confirmado</div>
                       </div>
                    ))
                  ) : (
                    <div className="text-[10px] font-black text-slate-300 uppercase text-center py-8">Nenhum agendamento</div>
                  )}
               </div>
            </div>
         </div>

         {/* Main Table Content Area */}
         <div className="xl:col-span-3 space-y-8">
            {/* Preferences Section - Always visible but controlled */}
            {selectedMilitar && (
              <div className={cn(
                "bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 border-2 border-dashed shadow-sm relative group overflow-hidden transition-all",
                preferencesEnabled ? "border-indigo-200" : "border-slate-100 opacity-80"
              )}>
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Calendar className="w-16 h-16 text-indigo-600" />
                </div>
                
                <div className="flex items-center justify-between mb-2">
                  <h3 className={cn(
                    "font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2",
                    preferencesEnabled ? "text-indigo-600" : "text-slate-400"
                  )}>
                    Escalonamento de Férias {activeYear}
                    {savingPrefs && <Loader2 className="w-3 h-3 animate-spin mx-2" />}
                    {!preferencesEnabled && <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[8px]">Período Encerrado</span>}
                  </h3>
                  {isPowerUser && (
                    <button 
                      onClick={toggleGlobalPreferences}
                      className="text-[9px] font-bold text-indigo-600 hover:underline uppercase tracking-widest"
                    >
                      {preferencesEnabled ? 'Encerrar Coleta' : 'Abrir Coleta'}
                    </button>
                  )}
                </div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                  {preferencesEnabled 
                    ? "Escolha 3 meses de sua preferência para gozo de férias (Sincronizado com SAD)" 
                    : "A escolha de meses está temporariamente desativada pelo administrador."}
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
                  {MONTHS.map(month => {
                    const isSelected = userPrefs.includes(month);
                    const selIndex = userPrefs.indexOf(month);
                    const canSelect = preferencesEnabled || isPowerUser;
                    const isDisabled = isSubmitted || (!isSelected && userPrefs.length >= 3 && !isPowerUser);
                    
                    return (
                      <button
                        key={month}
                        onClick={() => toggleMonthPreference(month)}
                        disabled={isDisabled || !canSelect}
                        className={cn(
                          "py-2.5 px-3 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all flex items-center justify-between border-2",
                          isSelected 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' 
                            : 'bg-white text-slate-500 border-slate-50 hover:border-indigo-100'
                        )}
                      >
                        {month}
                        {isSelected && (
                          <span className="flex items-center gap-1">
                            <span className="text-[8px] opacity-80">{selIndex + 1}º Opção</span>
                            <CheckCircle2 className="w-3 h-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {preferencesEnabled && !isSubmitted && userPrefs.length === 3 && (
                  <div className="mt-6 flex justify-end">
                    <button 
                      onClick={handleSubmitPreferences}
                      disabled={savingPrefs}
                      className="px-6 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-100 disabled:opacity-50"
                    >
                      {savingPrefs ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Confirmar e Enviar Opções
                    </button>
                  </div>
                )}
                {isSubmitted && (
                  <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center gap-2 text-emerald-700">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Suas opções foram enviadas e estão bloqueadas para alteração.</span>
                  </div>
                )}
              </div>
            )}

            {/* History Table */}
            <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 sm:p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/50 gap-4">
               <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Histórico de Férias (DGP)</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registros oficiais sincronizados via DGP (Diretoria Geral de Pessoal)</p>
               </div>
               <div className="flex items-center gap-2">
                  <button 
                    onClick={handleExportExcel}
                    className="flex-1 sm:flex-none px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors text-[10px] font-black uppercase tracking-widest px-4"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> <span className="hidden sm:inline">Exportar Planilha</span><span className="sm:hidden">Excel</span>
                  </button>
                  <button className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                     <Filter className="w-4 h-4" />
                  </button>
               </div>
            </div>

               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-slate-50/20">
                           <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Ano Ref.</th>
                           <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Período</th>
                           <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Dias</th>
                           <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Boletim</th>
                           <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Status</th>
                           <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50"></th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-50">
                        {loading ? (
                          <tr><td colSpan={6} className="p-20 text-center text-[10px] font-black text-slate-300 uppercase animate-pulse">Carregando dados...</td></tr>
                        ) : vacations.length > 0 ? (
                          vacations.map((v) => (
                             <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-8 py-6">
                                   <span className="text-xs font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-lg italic">{v.anoRef}</span>
                                </td>
                                <td className="px-8 py-6">
                                   <div className="text-xs font-black text-slate-800 uppercase tracking-tighter">{v.dataInicio} <span className="text-slate-300 mx-1">➜</span> {v.dataRetorno}</div>
                                   <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">{v.ato}</div>
                                </td>
                                <td className="px-8 py-6">
                                   <div className="text-xs font-black text-slate-700">{v.diasGozados}</div>
                                   <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">DIAS</div>
                                </td>
                                <td className="px-8 py-6">
                                   <div className="text-[10px] font-black text-slate-600 uppercase">{v.boletim}</div>
                                   <div className="text-[8px] font-bold text-slate-300 uppercase leading-none">{v.boletimOrigem}</div>
                                </td>
                                <td className="px-8 py-6">
                                   <div className={`
                                      inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest
                                      ${v.status === 'gozado' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}
                                   `}>
                                      <div className={`w-1.5 h-1.5 rounded-full ${v.status === 'gozado' ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
                                      {v.status}
                                   </div>
                                </td>
                                <td className="px-8 py-6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button 
                                     onClick={() => deleteVacation(v.id)}
                                     className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                   >
                                      <X className="w-4 h-4" />
                                   </button>
                                </td>
                             </tr>
                          ))
                        ) : (
                          <tr>
                             <td colSpan={6} className="p-24 text-center">
                                <div className="max-w-xs mx-auto opacity-30">
                                   <FileJson className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                                   <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Sem Dados Sincronizados</h4>
                                   <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Clique em 'Sincronizar DGP' acima para importar o histórico deste militar.</p>
                                </div>
                             </td>
                          </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>
      </div>
      )}

      <AnimatePresence>
         {showImporter && (
            <VacationImporter 
              militarRg={selectedMilitar?.rg || ''} 
              allMilitars={militars}
              onClose={() => setShowImporter(false)}
              onImport={handleImport}
            />
         )}
      </AnimatePresence>
    </div>
  );
}

function VacationCard({ vacation }: { vacation: Vacation }) {
   return (
      <div className="group bg-white p-6 rounded-3xl border-2 border-slate-50 shadow-sm hover:border-orange-200 hover:shadow-xl hover:shadow-orange-100/30 transition-all">
         <div className="flex flex-col md:flex-row items-center gap-6">
            <div className={`w-16 h-16 rounded-2xl shrink-0 flex flex-col items-center justify-center ${vacation.status === 'gozado' ? 'bg-slate-100 text-slate-400' : 'bg-orange-600 text-white shadow-lg shadow-orange-100'}`}>
               <Calendar className="w-6 h-6" />
               <span className="text-[10px] font-black uppercase mt-1">{vacation.anoRef}</span>
            </div>
            
            <div className="flex-1">
               <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">{vacation.dataInicio} — {vacation.dataRetorno}</h4>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${
                     vacation.status === 'gozado' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  }`}>
                     {vacation.status === 'gozado' ? 'Finalizado' : 'Próximo Período'}
                  </span>
               </div>
               <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div className="flex items-center gap-2">
                     <FileText className="w-3.5 h-3.5 text-slate-400" />
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bol: {vacation.boletim}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{vacation.ato}</span>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-4 border-l border-slate-100 pl-6 h-12">
               <div className="text-right">
                  <div className="text-xl font-black text-orange-600 leading-none">{vacation.diasGozados}</div>
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Dias Gozados</div>
               </div>
               <div className="text-right border-l border-slate-100 pl-4">
                  <div className="text-xl font-black text-slate-800 leading-none">{vacation.diasAGozar}</div>
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Saldo Reman.</div>
               </div>
            </div>
         </div>
         {vacation.obs && (
            <div className="mt-4 pt-4 border-t border-slate-50">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">{vacation.obs}</p>
            </div>
         )}
      </div>
   );
}

function EmptyState({ message }: { message: string }) {
   return (
      <div className="py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-8">
         <History className="w-12 h-12 text-slate-200 mb-4" />
         <p className="text-slate-400 text-xs font-black uppercase tracking-widest">{message}</p>
         <p className="mt-2 text-slate-300 text-[10px] font-bold uppercase tracking-widest">Utilize o botão de sincronização para importar dados do DGP.</p>
      </div>
   );
}

function normalizeRg(rg: string | number) {
  const str = (rg || '').toString().trim().toUpperCase();
  const clean = str.replace(/[^A-Z0-9]/g, '');
  return clean.replace(/^0+/, '') || clean;
}
