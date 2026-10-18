import React, { useState, useEffect } from "react";
import {
  Library,
  Calendar,
  History,
  Search,
  ArrowLeft,
  Clock,
  Table as TableIcon,
} from "lucide-react";
import { cn, normalizeRg, cleanUndefined } from "../lib/utils";
import { parseRank, sortAllBySeniority } from "../lib/rankUtils";
import { UserProfile, Vacation } from "../types";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { useMilitars } from "../contexts/MilitarContext";
import { exportToExcel } from "../lib/exportUtils";
import {
  calculateVacationsByAnoRef,
  calculateMilitarVacationYears,
  calculatePanoramaData,
} from "../features/ferias/lib/vacationCalculations";
import { VacationPanoramaView } from "../features/ferias/components/VacationPanoramaView";
import { VacationReportView } from "../features/ferias/components/VacationReportView";
import { VacationIndividualView } from "../features/ferias/components/VacationIndividualView";
import { VacationValidationModal } from "../features/ferias/components/VacationValidationModal";

interface VacationModuleProps {
  user: UserProfile;
  onBackToPortal: () => void;
  isSadMode?: boolean;
}

export function VacationModule({
  user,
  onBackToPortal,
  isSadMode = false,
}: VacationModuleProps) {
  const { militars } = useMilitars();
  const isPowerUser = user.isAdmin || (user.isEscalante && isSadMode);

  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [loading, setLoading] = useState(false);
  const [targetRg, setTargetRg] = useState(
    isPowerUser && isSadMode ? "" : user.rg,
  );
  const [selectedMilitar, setSelectedMilitar] = useState<UserProfile | null>(
    isPowerUser && isSadMode ? null : user,
  );
  const [viewMode, setViewMode] = useState<
    "individual" | "report" | "panorama"
  >("individual");
  const [allVacations, setAllVacations] = useState<Vacation[]>([]);
  const [loadingPanorama, setLoadingPanorama] = useState(false);
  const [panoramaSearch, setPanoramaSearch] = useState("");
  const [panoramaObmFilter, setPanoramaObmFilter] = useState("TODAS");
  const [panoramaStatusFilter, setPanoramaStatusFilter] = useState<"PENDENTES" | "REGULARIZADOS" | "VALIDADOS">("PENDENTES");
  const [panoramaSortMode, setPanoramaSortMode] = useState<"dias" | "graduacao">("dias");

  const [activeYear, setActiveYear] = useState("2026");
  const [reportYear, setReportYear] = useState("2026");

  // Filter States
  const [reportSearch, setReportSearch] = useState("");
  const [showHiddenAsseguradas, setShowHiddenAsseguradas] = useState(true);
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});

  const [filterPostoGrad, setFilterPostoGrad] = useState<string[]>([]);
  const [filterObm, setFilterObm] = useState<string[]>([]);
  const [filterAla, setFilterAla] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);

  // Preferences States
  const [preferencesEnabled, setPreferencesEnabled] = useState(false);
  const [userPrefs, setUserPrefs] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [userGrantedMonth, setUserGrantedMonth] = useState<string | null>(null);
  const [userGrantedMonths, setUserGrantedMonths] = useState<Record<string, string>>({});
  const [allPreferences, setAllPreferences] = useState<Record<string, any>>({});
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isNavMenuExpanded, setIsNavMenuExpanded] = useState(true);

  // Panorama validations state & modal
  const [panoramaValidations, setPanoramaValidations] = useState<Record<string, any>>({});
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [validationTargetRg, setValidationTargetRg] = useState("");
  const [validationTargetName, setValidationTargetName] = useState("");

  // Listen to all vacations for panorama view
  useEffect(() => {
    if (viewMode === "panorama") {
      setLoadingPanorama(true);
      const fetchAll = async () => {
        try {
          const vacSnapshot = await getDocs(collection(db, "vacations"));
          const data = vacSnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as Vacation,
          );
          setAllVacations(data);

          const valSnapshot = await getDocs(collection(db, "vacation_validations"));
          const vals: Record<string, any> = {};
          valSnapshot.docs.forEach((doc) => {
            const d = doc.data();
            if (d.targetRg) {
              vals[normalizeRg(d.targetRg)] = d;
            }
          });
          setPanoramaValidations(vals);
        } catch (e) {
          console.error("Error loading panorama vacations:", e);
        } finally {
          setLoadingPanorama(false);
        }
      };
      fetchAll();
    }
  }, [viewMode]);

  // Listen to all preferences for report view
  useEffect(() => {
    let unsubAllPrefs = () => {};
    if (isPowerUser && viewMode === "report") {
      const fetchAllFallback = async () => {
        try {
          const res = await fetch("/api/all-vacation-preferences");
          const json = await res.json();
          if (json.success && json.data) {
             const prefs: Record<string, any> = {};
             json.data.forEach((d: any) => {
               if (d.rg) {
                 prefs[normalizeRg(d.rg)] = d;
               }
             });
             setAllPreferences(prefs);
          }
        } catch (e) {
          console.error("Prefs API all fallback failed", e);
        }
      };

      fetchAllFallback();

      unsubAllPrefs = onSnapshot(
        collection(db, "vacation_preferences"),
        (snap) => {
          if (snap.metadata.fromCache && snap.empty) {
            return;
          }
          const prefs: Record<string, any> = {};
          snap.forEach((doc) => {
            const data = doc.data();
            const rg = data.rg || doc.id;
            prefs[normalizeRg(rg)] = data;
          });
          setAllPreferences(prefs);
        },
        (e) => {
          console.error("Error listening to all preferences:", e);
          fetchAllFallback();
        },
      );
    }
    return () => unsubAllPrefs();
  }, [isPowerUser, viewMode]);

  // Listen to vacation settings config
  useEffect(() => {
    const fetchConfigFallback = async () => {
      try {
        const res = await fetch("/api/vacation-settings");
        const json = await res.json();
        if (json.success && json.data) {
          setPreferencesEnabled(!!json.data.preferencesEnabled);
          if (json.data.activeYear) {
            setActiveYear(json.data.activeYear);
          }
        }
      } catch (e) {
        console.error("Config API fallback failed", e);
      }
    };

    fetchConfigFallback();

    const unsubConfig = onSnapshot(
      doc(db, "config", "vacation_settings"),
      (snap) => {
        if (snap.metadata.fromCache && !snap.exists()) {
          return;
        }
        if (snap.exists()) {
          const data = snap.data();
          setPreferencesEnabled(!!data.preferencesEnabled);
          if (data.activeYear) {
            setActiveYear(data.activeYear);
          }
        }
      },
      (e) => {
        console.error("Error listening to settings config:", e);
        fetchConfigFallback();
      },
    );
    return () => unsubConfig();
  }, []);

  // Listen to current user's preferences
  useEffect(() => {
    let unsubPrefs = () => {};
    if (selectedMilitar?.rg) {
      const cleanRg = normalizeRg(selectedMilitar.rg);
      
      const fetchPrefsFallback = async () => {
         try {
           const res = await fetch(`/api/vacation-preferences/${cleanRg}`);
           const json = await res.json();
           if (json.success && json.data) {
             const data = json.data;
             setUserPrefs(
               data.preferences?.[activeYear] ||
                 (activeYear === "2026" ? data.months : []) ||
                 [],
             );
             setIsSubmitted(data.submitted?.[activeYear] || false);
             setUserGrantedMonth(data.granted?.[activeYear] || null);
             setUserGrantedMonths(data.granted || {});
           }
         } catch (e) {
           console.error("Prefs API fallback failed", e);
         }
      };

      fetchPrefsFallback();

      unsubPrefs = onSnapshot(
        doc(db, "vacation_preferences", cleanRg),
        (snap) => {
          if (snap.metadata.fromCache && !snap.exists()) {
             return;
          }
          if (snap.exists()) {
            const data = snap.data();
            setUserPrefs(
              data.preferences?.[activeYear] ||
                (activeYear === "2026" ? data.months : []) ||
                [],
            );
            setIsSubmitted(data.submitted?.[activeYear] || false);
            setUserGrantedMonth(data.granted?.[activeYear] || null);
            setUserGrantedMonths(data.granted || {});
          }
        },
        (e) => {
          console.error("Error fetching preferences:", e);
          fetchPrefsFallback();
        },
      );
    } else {
      setUserPrefs([]);
      setIsSubmitted(false);
      setUserGrantedMonth(null);
      setUserGrantedMonths({});
    }
    return () => unsubPrefs();
  }, [selectedMilitar?.rg, activeYear]);

  // Listen to individual vacations
  useEffect(() => {
    let unsub = () => {};
    const rgToWatch =
      viewMode === "individual" ? selectedMilitar?.rg || "" : "";
    if (rgToWatch) {
      setLoading(true);
      const cleanRg = normalizeRg(rgToWatch);
      const q = query(
        collection(db, "vacations"),
        where("militarRg", "==", cleanRg),
      );
      unsub = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as Vacation,
          );
          setVacations(
            data.sort((a, b) => (b.anoRef || "").localeCompare(a.anoRef || "")),
          );
          setLoading(false);
        },
        (e) => {
          handleFirestoreError(e, OperationType.LIST, "vacations", false);
          setLoading(false);
        },
      );
    } else {
      setVacations([]);
    }
    return () => unsub();
  }, [viewMode, selectedMilitar?.rg]);

  const toggleMonthPreference = async (month: string) => {
    if (!selectedMilitar || isSubmitted) return;

    let newPrefs = [...userPrefs];
    if (newPrefs.includes(month)) {
      newPrefs = newPrefs.filter((m) => m !== month);
    } else {
      if (newPrefs.length >= 3) {
        return;
      }
      newPrefs.push(month);
    }

    setUserPrefs(newPrefs);
    setSavingPrefs(true);
    try {
      const updateData: any = {
        rg: normalizeRg(selectedMilitar.rg),
        preferences: {
          [activeYear]: newPrefs
        }
      };
      if (activeYear === "2026") {
        updateData.months = newPrefs;
      }
      
      await setDoc(
        doc(db, "vacation_preferences", normalizeRg(selectedMilitar.rg)),
        { ...updateData, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (e) {
      handleFirestoreError(
        e,
        OperationType.WRITE,
        `vacation_preferences/${selectedMilitar.rg}`,
        false,
      );
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleInitiateSubmit = () => {
    if (userPrefs.length !== 3) return;
    setShowConfirmDialog(true);
  };

  const handleSubmitPreferences = async () => {
    setShowConfirmDialog(false);
    if (!selectedMilitar || userPrefs.length !== 3) return;
    
    setSavingPrefs(true);
    try {
      const updateData = {
        submitted: {
          [activeYear]: true
        }
      };
      
      await setDoc(
        doc(db, "vacation_preferences", normalizeRg(selectedMilitar.rg)),
        { ...updateData, updatedAt: serverTimestamp() },
        { merge: true }
      );
      setIsSubmitted(true);
    } catch (e) {
      handleFirestoreError(
        e,
        OperationType.WRITE,
        `vacation_preferences/${selectedMilitar.rg}`,
        false,
      );
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleGrantMonth = async (rg: string, month: string) => {
    if (!isPowerUser) return;
    try {
      await setDoc(
        doc(db, "vacation_preferences", normalizeRg(rg)),
        cleanUndefined({
          granted: {
            [reportYear]: month
          },
          updatedAt: serverTimestamp(),
        }),
        { merge: true },
      );
      setAllPreferences((prev) => ({
        ...prev,
        [normalizeRg(rg)]: {
          ...prev[normalizeRg(rg)],
          granted: {
            ...(prev[normalizeRg(rg)]?.granted || {}),
            [reportYear]: month,
          },
        },
      }));
    } catch (e) {
      console.error("Error saving granted month:", e);
    }
  };

  const toggleGlobalPreferences = async () => {
    if (!isPowerUser) return;
    try {
      const dbDocInfo = {
        preferencesEnabled: !preferencesEnabled,
        updatedBy: user.name || "Admin",
      };
      await setDoc(doc(db, "config", "vacation_settings"), { ...dbDocInfo, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.error("Error updating global config:", e);
    }
  };

  const deleteVacation = async (id: string) => {
    try {
      const rg = id.split("_")[0];
      await deleteDoc(doc(db, "vacations", id));
      if (rg) await deleteDoc(doc(db, "militaries", rg, "ferias", id));
    } catch (e: any) {
      console.error("Error deleting vacation:", e);
    }
  };

  const vacationsByAnoRef = React.useMemo(() => {
    return calculateVacationsByAnoRef(vacations);
  }, [vacations]);

  const visibleVacations = React.useMemo(() => {
    return vacations.filter((v) => {
      if (v.ato && v.ato.toUpperCase().includes("ASSEGURADAS")) {
        const totalGozados = vacationsByAnoRef[v.anoRef] || 0;
        if (totalGozados >= 30 && !showHiddenAsseguradas) {
          return false;
        }
      }
      return true;
    });
  }, [vacations, vacationsByAnoRef, showHiddenAsseguradas]);

  const toggleYearGroup = (anoRef: string) => {
    setExpandedYears((prev) => ({ ...prev, [anoRef]: !prev[anoRef] }));
  };

  const {
    missingYears,
    pendingYears,
    groupedVacations,
  } = React.useMemo(() => {
    return calculateMilitarVacationYears(vacations, visibleVacations);
  }, [vacations, visibleVacations]);

  const handleExportExcel = () => {
    if (!selectedMilitar) return;
    const exportData = vacations.map((v) => ({
      Militar: `${selectedMilitar.rank} ${selectedMilitar.name}`,
      RG: selectedMilitar.rg,
      "Ano Ref": v.anoRef,
      Início: v.dataInicio,
      Retorno: v.dataRetorno,
      Status: v.status.toUpperCase(),
      "Ato/Bol": `${v.ato} - ${v.boletim}`,
      "Dias Tirados": v.diasGozados,
      "Saldo a Tirar": v.diasAGozar,
    }));
    exportToExcel(
      exportData,
      "Histórico de Férias",
      `Relatorio_Ferias_${selectedMilitar.rg}`,
    );
  };

  const { uniqueRanks, uniqueObms, uniqueAlas } = React.useMemo(() => {
    return {
      uniqueRanks: Array.from(
        new Set(militars.map((m) => parseRank(m.rank)).filter(Boolean)),
      ) as string[],
      uniqueObms: Array.from(
        new Set(militars.map((m) => m.obm || "10º GBM").filter(Boolean)),
      ) as string[],
      uniqueAlas: Array.from(
        new Set(militars.map((m) => m.ala?.toString() || "").filter(Boolean)),
      ) as string[],
    };
  }, [militars]);

  const filteredMilitarsReport = React.useMemo(() => {
    return militars.filter((m) => {
      const term = reportSearch.toLowerCase();
      const matchesSearch =
        m.name?.toLowerCase().includes(term) ||
        m.warName?.toLowerCase().includes(term) ||
        m.rg?.includes(term);
      const matchesPosto =
        filterPostoGrad.length === 0 || filterPostoGrad.includes(parseRank(m.rank || ""));
      const matchesObm =
        filterObm.length === 0 || filterObm.includes(m.obm || "10º GBM");
      const matchesAla =
        filterAla.length === 0 || filterAla.includes(m.ala?.toString() || "");

      const data: any = allPreferences[normalizeRg(m.rg)] || {};
      const prefs =
        data.preferences?.[reportYear] ||
        (reportYear === "2026" ? data.months : []) ||
        [];
      const status =
        prefs.length === 3
          ? "COMPLETO"
          : prefs.length === 0
            ? "PENDENTE"
            : "PARCIAL";
      const matchesStatus =
        filterStatus.length === 0 || filterStatus.includes(status);

      return (
        matchesSearch &&
        matchesPosto &&
        matchesObm &&
        matchesAla &&
        matchesStatus
      );
    }).sort(sortAllBySeniority);
  }, [
    militars,
    reportSearch,
    filterPostoGrad,
    filterObm,
    filterAla,
    filterStatus,
    allPreferences,
    reportYear,
  ]);

  const filteredMilitarsPanorama = React.useMemo(() => {
    return militars.filter((m) => {
      const term = panoramaSearch.toLowerCase();
      const matchesSearch =
        !term ||
        m.name?.toLowerCase().includes(term) ||
        m.warName?.toLowerCase().includes(term) ||
        m.rg?.includes(term);

      const mObm = (m.obm || "10º GBM").trim().toUpperCase();
      const filterStr = panoramaObmFilter.trim().toUpperCase();

      let matchesObm = true;
      if (filterStr !== "TODAS") {
        if (filterStr === "10º GBM") {
          matchesObm = mObm === "10º GBM" || mObm === "10ºGBM" || mObm === "10 GBM";
        } else if (filterStr === "2/10") {
          matchesObm = mObm === "2/10" || mObm === "2/10º" || mObm === "2/10º GBM" || mObm === "2º/10º" || mObm === "2º/10º GBM";
        } else if (filterStr === "3/10") {
          matchesObm = mObm === "3/10" || mObm === "3/10º" || mObm === "3/10º GBM" || mObm === "3º/10º" || mObm === "3º/10º GBM";
        } else if (filterStr === "4/10") {
          matchesObm = mObm === "4/10" || mObm === "4/10º" || mObm === "4/10º GBM" || mObm === "4º/10º" || mObm === "4º/10º GBM";
        } else if (filterStr === "1/26") {
          matchesObm = mObm === "1/26" || mObm === "1/26º" || mObm === "1/26º GBM" || mObm === "1º/26º" || mObm === "1º/26º GBM";
        } else if (filterStr === "26º GBM") {
          matchesObm = mObm === "26º GBM" || mObm === "26ºGBM" || mObm === "26 GBM";
        } else {
          matchesObm = mObm === filterStr;
        }
      }

      return matchesSearch && matchesObm;
    });
  }, [militars, panoramaSearch, panoramaObmFilter]);

  const panoramaData = React.useMemo(() => {
    if (viewMode !== "panorama" || allVacations.length === 0) {
      return { oficiais: [], pracas: [], regularizadosOficiais: [], regularizadosPracas: [], validadosOficiais: [], validadosPracas: [] };
    }
    return calculatePanoramaData(
      allVacations,
      filteredMilitarsPanorama,
      panoramaValidations,
      panoramaSortMode
    );
  }, [allVacations, filteredMilitarsPanorama, viewMode, panoramaSortMode, panoramaValidations]);

  return (
    <div className="flex flex-col gap-8 font-sans">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <button
            onClick={onBackToPortal}
            className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] mb-4 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline">Voltar ao Painel do Militar</span>
            <span className="sm:hidden">Voltar</span>
          </button>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-4">
            <Library className="w-8 h-8 sm:w-10 sm:h-10 text-orange-600" />
            Controle de Férias
          </h2>
          <p className="text-[10px] sm:text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">
            Escalonamento Anual e Sincronização Intranet
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isPowerUser && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <button
                onClick={() => setViewMode("individual")}
                className={`px-4 py-2 rounded-lg transition-all font-black text-[10px] uppercase tracking-widest cursor-pointer ${viewMode === "individual" ? "bg-white text-indigo-700 shadow-xs border border-slate-200 dark:border-slate-700" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"}`}
              >
                Individual
              </button>
              <button
                onClick={() => setViewMode("report")}
                className={`px-4 py-2 rounded-lg transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 cursor-pointer ${viewMode === "report" ? "bg-white text-indigo-700 shadow-xs border border-slate-200 dark:border-slate-700" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"}`}
              >
                <TableIcon className="w-3.5 h-3.5" /> Preferências
              </button>
              <button
                onClick={() => setViewMode("panorama")}
                className={`px-4 py-2 rounded-lg transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 cursor-pointer ${viewMode === "panorama" ? "bg-white text-orange-600 shadow-xs border border-slate-200 dark:border-slate-700" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/60"}`}
              >
                <History className="w-3.5 h-3.5" /> Panorama Global
              </button>
            </div>
          )}
          {isPowerUser && isSadMode && viewMode === "individual" && (
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
                    const m = militars.find(
                      (x) => normalizeRg(x.rg) === normalizeRg(e.target.value),
                    );
                    if (m) setSelectedMilitar(m);
                  }}
                />
              </div>
              {targetRg && !selectedMilitar && (
                <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-[200] max-h-48 overflow-y-auto">
                  {militars
                    .filter((m) => {
                      if (!targetRg) return true;
                      const searchRg = normalizeRg(targetRg);
                      const matchesRg = searchRg ? normalizeRg(m.rg || '').includes(searchRg) : false;
                      return (
                        matchesRg ||
                        (m.name || "")
                          .toLowerCase()
                          .includes(targetRg.toLowerCase())
                      );
                    })
                    .map((m) => (
                      <button
                        key={m.rg}
                        onClick={() => {
                          setSelectedMilitar(m);
                          setTargetRg(m.rg);
                        }}
                        className="w-full p-2 text-left hover:bg-slate-50 text-[9px] font-bold uppercase tracking-tight flex items-center justify-between"
                      >
                        <span>
                          {parseRank(m.rank)} {m.warName || m.name}
                        </span>
                        <span className="text-slate-400">RG: {m.rg}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {isPowerUser && (
            <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-white px-3 py-2 border border-indigo-100 shadow-sm rounded-2xl ring-1 ring-white/50 transition-all hover:border-indigo-200 group">
              <span className="hidden sm:flex items-center gap-1.5 text-[9px] font-black uppercase text-indigo-900 tracking-[0.1em]">
                <Calendar className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                Coleta SAD:
              </span>
              <select
                value={activeYear}
                onChange={async (e) => {
                  const newYear = e.target.value;
                  setActiveYear(newYear);
                  try {
                    await setDoc(
                      doc(db, "config", "vacation_settings"),
                      { activeYear: newYear },
                      { merge: true },
                    );
                  } catch (err) {
                    console.error("Failed to update active year:", err);
                  }
                }}
                className="text-[10px] bg-white font-black text-indigo-700 outline-none cursor-pointer tracking-widest px-2 py-1 rounded-lg border border-indigo-100/50 shadow-inner hover:bg-slate-50 transition-colors"
              >
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
                <option value="2029">2029</option>
              </select>
              <div className="w-px h-6 bg-indigo-100 mx-1"></div>
              <button
                onClick={toggleGlobalPreferences}
                className={`relative overflow-visible px-4 py-1.5 rounded-xl transition-all duration-300 font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 shadow-sm ${
                  preferencesEnabled
                    ? "bg-emerald-500 text-white border-transparent shadow-emerald-200/50 hover:bg-emerald-600 hover:scale-[1.02]"
                    : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50 hover:text-slate-600 hover:scale-[1.02]"
                }`}
              >
                <Clock
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-500",
                    preferencesEnabled ? "animate-pulse" : "",
                  )}
                />
                <span className="relative z-10">
                  {preferencesEnabled ? "ON" : "OFF"}
                </span>
                {preferencesEnabled && (
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {viewMode === "report" ? (
        <VacationReportView
          filteredMilitarsReport={filteredMilitarsReport}
          allPreferences={allPreferences}
          reportYear={reportYear}
          setReportYear={setReportYear}
          reportSearch={reportSearch}
          setReportSearch={setReportSearch}
          isNavMenuExpanded={isNavMenuExpanded}
          setIsNavMenuExpanded={setIsNavMenuExpanded}
          uniqueRanks={uniqueRanks}
          uniqueObms={uniqueObms}
          uniqueAlas={uniqueAlas}
          filterPostoGrad={filterPostoGrad}
          setFilterPostoGrad={setFilterPostoGrad}
          filterObm={filterObm}
          setFilterObm={setFilterObm}
          filterAla={filterAla}
          setFilterAla={setFilterAla}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          loading={loading}
          isSadMode={isSadMode}
          onGrantMonth={handleGrantMonth}
        />
      ) : viewMode === "panorama" ? (
        <VacationPanoramaView
          panoramaData={panoramaData}
          loadingPanorama={loadingPanorama}
          panoramaSearch={panoramaSearch}
          setPanoramaSearch={setPanoramaSearch}
          panoramaObmFilter={panoramaObmFilter}
          setPanoramaObmFilter={setPanoramaObmFilter}
          panoramaStatusFilter={panoramaStatusFilter}
          setPanoramaStatusFilter={setPanoramaStatusFilter}
          panoramaSortMode={panoramaSortMode}
          setPanoramaSortMode={setPanoramaSortMode}
          panoramaValidations={panoramaValidations}
          onOpenValidationModal={(rg, name) => {
            setValidationTargetRg(rg);
            setValidationTargetName(name);
            setValidationModalOpen(true);
          }}
        />
      ) : selectedMilitar ? (
        <VacationIndividualView
          selectedMilitar={selectedMilitar}
          vacations={vacations}
          activeYear={activeYear}
          userGrantedMonths={userGrantedMonths}
          userGrantedMonth={userGrantedMonth}
          isSubmitted={isSubmitted}
          preferencesEnabled={preferencesEnabled}
          userPrefs={userPrefs}
          savingPrefs={savingPrefs}
          isPowerUser={isPowerUser}
          toggleGlobalPreferences={toggleGlobalPreferences}
          toggleMonthPreference={toggleMonthPreference}
          handleInitiateSubmit={handleInitiateSubmit}
          showConfirmDialog={showConfirmDialog}
          setShowConfirmDialog={setShowConfirmDialog}
          handleSubmitPreferences={handleSubmitPreferences}
          showHiddenAsseguradas={showHiddenAsseguradas}
          setShowHiddenAsseguradas={setShowHiddenAsseguradas}
          handleExportExcel={handleExportExcel}
          missingYears={missingYears}
          pendingYears={pendingYears}
          loading={loading}
          groupedVacations={groupedVacations}
          expandedYears={expandedYears}
          toggleYearGroup={toggleYearGroup}
          deleteVacation={deleteVacation}
        />
      ) : (
        <div className="bg-amber-50/50 p-12 rounded-3xl border-2 border-dashed border-amber-200 text-center">
          <Search className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h3 className="text-sm font-black text-amber-800 uppercase tracking-widest">
            Selecione um militar acima
          </h3>
          <p className="text-amber-600 font-bold uppercase text-[9px] tracking-[0.2em] mt-2">
            Para gerenciar férias, busque pelo RG ou Nome
          </p>
        </div>
      )}

      {/* Validation Password Modal */}
      <VacationValidationModal
        isOpen={validationModalOpen}
        onClose={() => setValidationModalOpen(false)}
        targetName={validationTargetName}
        targetRg={validationTargetRg}
        user={user}
        onSuccess={(targetRgNorm, payload) => {
          setPanoramaValidations((prev) => ({ ...prev, [targetRgNorm]: payload }));
        }}
      />
    </div>
  );
}
