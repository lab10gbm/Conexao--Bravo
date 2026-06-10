import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "../lib/utils";
import { RankInsignia } from "./RankInsignia";
import { MultiSelectFilter } from "./ui/MultiSelectFilter";
import { UserProfile, Vacation } from "../types";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { VacationImporter } from "./VacationImporter";

import { useMilitars } from "../contexts/MilitarContext";
import { exportToExcel } from "../lib/exportUtils";
import { VacationStats } from "./VacationStats";
import { cleanUndefined } from "../lib/utils";

interface VacationModuleProps {
  user: UserProfile;
  onBackToPortal: () => void;
  isSadMode?: boolean;
}

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function VacationModule({
  user,
  onBackToPortal,
  isSadMode = false,
}: VacationModuleProps) {
  const { militars } = useMilitars();
  const isPowerUser = user.isAdmin || (user.isEscalante && isSadMode);

  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");
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

  useEffect(() => {
    if (viewMode === "panorama") {
      setLoadingPanorama(true);
      getDocs(collection(db, "vacations"))
        .then((snapshot) => {
          const data = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as Vacation,
          );
          setAllVacations(data);
          setLoadingPanorama(false);
        })
        .catch((e) => {
          console.error(e);
          setLoadingPanorama(false);
        });
    }
  }, [viewMode]);

  const [activeYear, setActiveYear] = useState("2026");
  const [reportYear, setReportYear] = useState("2026");

  // Filter States
  const [reportSearch, setReportSearch] = useState("");
  const [showHiddenAsseguradas, setShowHiddenAsseguradas] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>(
    {},
  );

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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isNavMenuExpanded, setIsNavMenuExpanded] = useState(true);

  useEffect(() => {
    let unsubAllPrefs = () => {};
    if (isPowerUser && viewMode === "report") {
      setLoading(true);

      const fetchAllFallback = async () => {
        try {
          const res = await fetch('/api/all-vacation-preferences');
          const json = await res.json();
          if (json.success && json.data) {
             const prefs: Record<string, any> = {};
             Object.entries(json.data).forEach(([key, val]) => {
                prefs[normalizeRg(key)] = val;
             });
             setAllPreferences(prefs);
             setLoading(false);
          }
        } catch(e) {
          console.error("All prefs fallback failed: ", e);
        }
      };

      fetchAllFallback();

      unsubAllPrefs = onSnapshot(
        collection(db, "vacation_preferences"),
        (snap) => {
          if (snap.metadata.fromCache && snap.empty) {
            console.log("Ignoring empty offline cache for preferences.");
            return;
          }
          const prefs: Record<string, any> = {};
          snap.forEach((doc) => {
            prefs[normalizeRg(doc.id)] = doc.data();
          });
          
          setAllPreferences((prev) => {
             // Only update if we actually have data, or if we didn't have data before
             if (Object.keys(prefs).length > 0 || Object.keys(prev).length === 0) {
               return prefs;
             }
             return prev;
          });
          setLoading(false);
        },
        (e) => {
          console.error("Error fetching all preferences:", e);
          setLoading(false);
          fetchAllFallback();
        },
      );
    }
    return () => unsubAllPrefs();
  }, [isPowerUser, viewMode]);

  const fetchAllPreferences = async () => {
    // Deprecated in favor of the real-time effect above
  };

  useEffect(() => {
    if (!db) return;

    const fetchConfigFallback = async () => {
      try {
        const res = await fetch('/api/vacation-settings');
        const json = await res.json();
        if (json.success && json.data) {
          setPreferencesEnabled(json.data.preferencesEnabled || false);
          if (json.data.activeYear) setActiveYear(json.data.activeYear);
        }
      } catch (err) {
        console.error("Config API fallback failed", err);
      }
    };

    // Try initial fetch via API to bypass potential adblock
    fetchConfigFallback();

    const unsubConfig = onSnapshot(
      doc(db, "config", "vacation_settings"),
      (snap) => {
        if (snap.metadata.fromCache && !snap.exists()) {
          console.log("Ignoring empty offline cache for settings.");
          return;
        }
        if (snap.exists()) {
          const data = snap.data();
          if (data.preferencesEnabled !== undefined) setPreferencesEnabled(data.preferencesEnabled);
          if (data.activeYear) setActiveYear(data.activeYear);
        }
      },
      (error) => {
        console.error("Error listening to config:", error);
        fetchConfigFallback();
      },
    );

    return () => unsubConfig();
  }, []);

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
             console.log("Ignoring empty offline cache for single preference.");
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
      newPrefs = newPrefs.filter((m) => m !== month);
    } else {
      if (newPrefs.length >= 3) {
        return; // Exceeded limit
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
    if (!selectedMilitar) return;
    if (userPrefs.length !== 3) {
      return;
    }
    
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
      // Update local state without unmounting
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
      console.log("Successfully saved config/vacation_settings");
    } catch (e) {
      console.error("Error updating global config:", e);
    }
  };

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

  const fetchVacations = async (rg: string) => {
    // Deprecated in favor of the real-time effect above
  };

  const handleImport = async (newVacations: Vacation[]) => {
    setLoading(true);
    try {
      for (const v of newVacations) {
        // Use RefYear + StartDate as a composite ID to avoid duplicates
        const docId = `${v.militarRg}_${v.anoRef}_${v.dataInicio.replace(/\//g, "")}`;
        const savedData = cleanUndefined({
          ...v,
          updatedAt: new Date().toISOString(),
        });
        await setDoc(doc(db, "vacations", docId), savedData, { merge: true });
        await setDoc(
          doc(db, "militaries", v.militarRg, "ferias", docId),
          savedData,
          { merge: true },
        );
      }
      setShowImporter(false);
      if (selectedMilitar) {
        await fetchVacations(selectedMilitar.rg);
      }
    } catch (e) {
      console.error("Error importing vacations:", e);
      alert("Erro ao salvar os dados no sistema seguro.");
    } finally {
      setLoading(false);
    }
  };

  const deleteVacation = async (id: string) => {
    if (
      !confirm("Deseja realmente excluir este registro de férias do sistema?")
    )
      return;
    try {
      const rg = id.split("_")[0];
      await deleteDoc(doc(db, "vacations", id));
      if (rg) await deleteDoc(doc(db, "militaries", rg, "ferias", id));
      if (selectedMilitar) fetchVacations(selectedMilitar.rg);
    } catch (e) {
      console.error("Error deleting vacation:", e);
    }
  };

  const vacationsByAnoRef = React.useMemo(() => {
    return vacations.reduce(
      (acc, v) => {
        if (v.ato && v.ato.toUpperCase().includes("CONCESS")) {
          acc[v.anoRef] = (acc[v.anoRef] || 0) + (v.diasGozados || 0);
        }
        return acc;
      },
      {} as Record<string, number>,
    );
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
    startYear,
    endYear,
    vacationsStats,
    missingYears,
    pendingYears,
    groupedVacations,
  } = React.useMemo(() => {
    let sYear = new Date().getFullYear();
    const eYear = new Date().getFullYear();

    // Calcula o startYear baseado no menor anoRef
    const validYears = vacations
      .map((v) => parseInt(v.anoRef))
      .filter((n) => !isNaN(n) && n > 1900);
    if (validYears.length > 0) {
      sYear = Math.min(...validYears);
    }

    // Stats
    const statsByYear: Record<
      number,
      {
        totalGozados: number;
        pending: number;
        temConcessoes: boolean;
        temAsseguradas: boolean;
      }
    > = {};
    for (let y = sYear; y <= eYear; y++) {
      statsByYear[y] = {
        totalGozados: 0,
        pending: 30,
        temConcessoes: false,
        temAsseguradas: false,
      };
    }

    vacations.forEach((v) => {
      const y = parseInt(v.anoRef);
      if (!isNaN(y) && statsByYear[y]) {
        if (v.ato?.toUpperCase().includes("CONCESS")) {
          statsByYear[y].totalGozados += v.diasGozados || 0;
          statsByYear[y].pending = Math.max(
            0,
            30 - statsByYear[y].totalGozados,
          );
          statsByYear[y].temConcessoes = true;
        }
        if (v.ato?.toUpperCase().includes("ASSEGURADAS")) {
          statsByYear[y].temAsseguradas = true;
        }
      }
    });

    const mY = [];
    const pY = [];
    for (let y = sYear; y <= eYear; y++) {
      if (!statsByYear[y].temConcessoes && !statsByYear[y].temAsseguradas) {
        mY.push(y);
      } else if (statsByYear[y].pending > 0 && statsByYear[y].temConcessoes) {
        // Tem pendência parciais. Se não tiver concessão e tiver assegurada, o pending é 30.
        pY.push({ year: y, pending: statsByYear[y].pending });
      } else if (
        !statsByYear[y].temConcessoes &&
        statsByYear[y].temAsseguradas
      ) {
        // Só assegurou, não gozou nada ainda
        pY.push({ year: y, pending: 30 });
      }
    }

    // Grouping
    const groups: Record<string, Vacation[]> = {};
    visibleVacations.forEach((v) => {
      if (!groups[v.anoRef]) groups[v.anoRef] = [];
      groups[v.anoRef].push(v);
    });
    const gV = Object.keys(groups)
      .sort((a, b) => parseInt(b) - parseInt(a))
      .map((anoRef) => {
        const items = groups[anoRef];
        items.sort((a, b) => {
          const ad = a.dataInicio?.split("/").reverse().join("") || "";
          const bd = b.dataInicio?.split("/").reverse().join("") || "";
          return bd.localeCompare(ad);
        });
        return {
          anoRef,
          items,
          totalGozados: statsByYear[parseInt(anoRef)]?.totalGozados || 0,
          pending: statsByYear[parseInt(anoRef)]?.pending || 0,
        };
      });

    return {
      startYear: sYear,
      endYear: eYear,
      vacationsStats: statsByYear,
      missingYears: mY,
      pendingYears: pY,
      groupedVacations: gV,
    };
  }, [vacations, visibleVacations]);

  const currentYearVacations = vacations.filter(
    (v) => v.anoRef === "2026" || v.status === "marcado",
  );
  const pastVacations = vacations.filter(
    (v) => v.anoRef !== "2026" && v.status === "gozado",
  );

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
      "Dias Gozados": v.diasGozados,
      "Saldo a Gozar": v.diasAGozar,
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
        new Set(militars.map((m) => m.rank).filter(Boolean)),
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
        filterPostoGrad.length === 0 || filterPostoGrad.includes(m.rank || "");
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
    });
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

  const panoramaData = React.useMemo(() => {
    if (viewMode !== "panorama" || allVacations.length === 0) return [];

    const currentYear = new Date().getFullYear();
    const vacsByRg: Record<string, Vacation[]> = {};
    allVacations.forEach((v) => {
      if (!vacsByRg[v.militarRg]) vacsByRg[v.militarRg] = [];
      vacsByRg[v.militarRg].push(v);
    });

    const panoramaRows = [];

    for (const m of filteredMilitarsReport) {
      const cleanRg = normalizeRg(m.rg);
      const mVacations = vacsByRg[cleanRg] || [];
      if (mVacations.length === 0) continue;

      let sYear = currentYear;
      const validYears = mVacations
        .map((v) => parseInt(v.anoRef))
        .filter((n) => !isNaN(n) && n > 1900);
      if (validYears.length > 0) sYear = Math.min(...validYears);

      const statsByYear: Record<
        number,
        {
          totalGozados: number;
          pending: number;
          temConcessoes: boolean;
          temAsseguradas: boolean;
        }
      > = {};
      for (let y = sYear; y <= currentYear; y++) {
        statsByYear[y] = {
          totalGozados: 0,
          pending: 30,
          temConcessoes: false,
          temAsseguradas: false,
        };
      }

      mVacations.forEach((v) => {
        const y = parseInt(v.anoRef);
        if (!isNaN(y) && statsByYear[y]) {
          if (v.ato?.toUpperCase().includes("CONCESS")) {
            statsByYear[y].totalGozados += v.diasGozados || 0;
            statsByYear[y].pending = Math.max(
              0,
              30 - statsByYear[y].totalGozados,
            );
            statsByYear[y].temConcessoes = true;
          }
          if (v.ato?.toUpperCase().includes("ASSEGURADAS")) {
            statsByYear[y].temAsseguradas = true;
          }
        }
      });

      const missing = [];
      const pending = [];
      for (let y = sYear; y <= currentYear; y++) {
        if (!statsByYear[y].temConcessoes && !statsByYear[y].temAsseguradas) {
          missing.push(y);
        } else if (statsByYear[y].pending > 0 && statsByYear[y].temConcessoes) {
          pending.push({ year: y, days: statsByYear[y].pending });
        } else if (
          !statsByYear[y].temConcessoes &&
          statsByYear[y].temAsseguradas
        ) {
          pending.push({ year: y, days: 30 });
        }
      }

      const totalPendingDays =
        pending.reduce((acc, p) => acc + p.days, 0) + missing.length * 30;

      if (totalPendingDays > 0) {
        panoramaRows.push({
          militar: m,
          startYear: sYear,
          missingYears: missing,
          pendingBalances: pending,
          totalPendingDays,
        });
      }
    }

    return panoramaRows.sort((a, b) => b.totalPendingDays - a.totalPendingDays);
  }, [allVacations, filteredMilitarsReport, viewMode]);

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
          <p className="text-[10px] sm:text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">
            Escalonamento Anual e Sincronização Intranet
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isPowerUser && (
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
              <button
                onClick={() => setViewMode("individual")}
                className={`px-4 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest ${viewMode === "individual" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                Individual
              </button>
              <button
                onClick={() => setViewMode("report")}
                className={`px-4 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 ${viewMode === "report" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                <TableIcon className="w-3.5 h-3.5" /> Preferências
              </button>
              <button
                onClick={() => setViewMode("panorama")}
                className={`px-4 py-2 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 ${viewMode === "panorama" ? "bg-white text-orange-600 shadow-sm border border-orange-100" : "text-slate-500 hover:text-slate-800"}`}
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
                    .filter(
                      (m) =>
                        normalizeRg(m.rg).includes(normalizeRg(targetRg)) ||
                        (m.name || "")
                          .toLowerCase()
                          .includes(targetRg.toLowerCase()),
                    )
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
                          {m.rank} {m.warName || m.name}
                        </span>
                        <span className="text-slate-400">RG: {m.rg}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
          <button
            onClick={() =>
              window.open(
                "https://cbmerj.rj.gov.br/dgp/sistema/relatorio_mapa_forca.php",
                "_blank",
              )
            }
            className="px-4 py-3 bg-slate-100 text-slate-600 border border-slate-200 rounded-2xl hover:bg-slate-200 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" /> Acessar DGP
          </button>
          <button
            onClick={() => selectedMilitar && setShowImporter(true)}
            disabled={!selectedMilitar || !isPowerUser}
            className={cn(
              "flex-1 sm:flex-none px-6 py-3 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-orange-100 disabled:opacity-50",
              !isPowerUser && "hidden",
            )}
          >
            <Download className="w-4 h-4" />{" "}
            <span className="hidden sm:inline">Sincronizar DGP</span>
            <span className="sm:hidden">Sincronizar</span>
          </button>
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
                  setActiveYear(newYear); // Optimistic UI update
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
                className={`relative overflow-hidden px-4 py-1.5 rounded-xl transition-all duration-300 font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 shadow-sm ${
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border-2 border-slate-50 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 sm:p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/50 gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsNavMenuExpanded(!isNavMenuExpanded)}
                  className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm shrink-0"
                  title={
                    isNavMenuExpanded
                      ? "Minimizar Navegador"
                      : "Maximizar Navegador"
                  }
                >
                  {isNavMenuExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight">
                    Relatório Consolidado de Preferências
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Lista completa de militares e seus meses de preferência para
                    o escalonamento SAD
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const exportData = filteredMilitarsReport.map((m) => {
                      const data: any = allPreferences[normalizeRg(m.rg)] || {};
                      const prefs =
                        data.preferences?.[reportYear] ||
                        (reportYear === "2026" ? data.months : []) ||
                        [];
                      const granted = data.granted?.[reportYear] || "-";
                      return {
                        Militar: `${m.rank} ${m.name}`,
                        RG: m.rg,
                        "Mês 1": prefs[0] || "-",
                        "Mês 2": prefs[1] || "-",
                        "Mês 3": prefs[2] || "-",
                        "Mês Concedido": granted,
                        Contagem: prefs.length,
                      };
                    });
                    exportToExcel(
                      exportData,
                      `Consolidado_Preferencias_${reportYear}`,
                      "Preferencias_Ferias_SAD",
                    );
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                >
                  <FileSpreadsheet className="w-4 h-4" />{" "}
                  <span className="sm:hidden">Exportar</span>
                  <span className="hidden sm:inline">Exportar Filtrados</span>
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
                  <MultiSelectFilter
                    label="Posto/Grad"
                    options={uniqueRanks.sort()}
                    selected={filterPostoGrad}
                    onChange={setFilterPostoGrad}
                  />
                  <MultiSelectFilter
                    label="OBM"
                    options={uniqueObms.sort()}
                    selected={filterObm}
                    onChange={setFilterObm}
                  />
                  <MultiSelectFilter
                    label="Ala"
                    options={uniqueAlas.sort()}
                    selected={filterAla}
                    onChange={setFilterAla}
                  />
                  <MultiSelectFilter
                    label="Status SAD"
                    options={["COMPLETO", "PARCIAL", "PENDENTE"]}
                    selected={filterStatus}
                    onChange={setFilterStatus}
                  />
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/20">
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                      Militar
                    </th>
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                      RG
                    </th>
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                      Opc 1
                    </th>
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                      Opc 2
                    </th>
                    <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                      Opc 3
                    </th>
                    <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-center">
                      Status
                    </th>
                    <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-center">
                      Mês Concedido
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-20 text-center text-[10px] font-black text-slate-300 uppercase animate-pulse"
                      >
                        Cruzando dados de preferências...
                      </td>
                    </tr>
                  ) : filteredMilitarsReport.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-20 text-center text-[10px] font-black text-slate-300 uppercase"
                      >
                        Nenhum militar encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredMilitarsReport
                      .sort((a, b) =>
                        (a.name || "").localeCompare(b.name || ""),
                      )
                      .map((m) => {
                        const rg = normalizeRg(m.rg);
                        const data: any = allPreferences[rg] || {};
                        const prefs =
                          data.preferences?.[reportYear] ||
                          (reportYear === "2026" ? data.months : []) ||
                          [];
                        const granted = data.granted?.[reportYear] || "";
                        const isComplete = prefs.length === 3;

                        return (
                          <tr
                            key={m.rg}
                            className="hover:bg-slate-50/50 transition-colors group"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="shrink-0 w-8 flex justify-center">
                                  <RankInsignia rankStr={m.rank} />
                                </div>
                                <div className="flex flex-col leading-tight">
                                  <div className="text-[11px] font-black text-slate-800 uppercase">
                                    {m.rank}
                                  </div>
                                  <div className="text-[14px] font-black text-indigo-600 uppercase tracking-tight">
                                    {m.warName || m.name}
                                  </div>
                                  <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                                    {m.obm}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-[10px] font-bold text-slate-500 font-mono tracking-widest">
                                {m.rg}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              {prefs[0] ? (
                                <span
                                  className={cn(
                                    "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border",
                                    granted === prefs[0]
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-indigo-50 text-indigo-700 border-indigo-100",
                                  )}
                                >
                                  {prefs[0]}
                                </span>
                              ) : (
                                <span className="text-slate-200 text-[10px]">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              {prefs[1] ? (
                                <span
                                  className={cn(
                                    "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border",
                                    granted === prefs[1]
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-indigo-50 text-indigo-700 border-indigo-100",
                                  )}
                                >
                                  {prefs[1]}
                                </span>
                              ) : (
                                <span className="text-slate-200 text-[10px]">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              {prefs[2] ? (
                                <span
                                  className={cn(
                                    "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border",
                                    granted === prefs[2]
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-indigo-50 text-indigo-700 border-indigo-100",
                                  )}
                                >
                                  {prefs[2]}
                                </span>
                              ) : (
                                <span className="text-slate-200 text-[10px]">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-center">
                              {prefs.length > 0 ? (
                                <div
                                  className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                    isComplete
                                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                      : "bg-amber-50 text-amber-600 border-amber-100",
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "w-1.5 h-1.5 rounded-full",
                                      isComplete
                                        ? "bg-emerald-500"
                                        : "bg-amber-500",
                                    )}
                                  ></div>
                                  {isComplete
                                    ? "Completo"
                                    : `${prefs.length}/3`}
                                </div>
                              ) : (
                                <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">
                                  Pendente
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-center">
                              {isSadMode ? (
                                <select
                                  value={granted}
                                  onChange={(e) =>
                                    handleGrantMonth(m.rg, e.target.value)
                                  }
                                  className={cn(
                                    "px-2 py-1.5 border rounded-lg text-[9px] font-black uppercase tracking-widest outline-none transition-colors",
                                    granted
                                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                      : "bg-white border-slate-200 text-slate-500 hover:border-indigo-200",
                                  )}
                                >
                                  <option value="">- Conceder -</option>
                                  {MONTHS.map((mo) => (
                                    <option key={mo} value={mo}>
                                      {mo} {prefs.includes(mo) ? "★" : ""}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-500">
                                  {granted || "-"}
                                </span>
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
      ) : viewMode === "panorama" ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {loadingPanorama ? (
            <div className="py-24 text-center">
              <Loader2 className="w-12 h-12 text-orange-400 mx-auto animate-spin mb-4" />
              <div className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                Sintetizando Histórico de Férias Global
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-sm flex flex-col justify-center">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Total de Dias Pendentes (Geral)
                  </h3>
                  <div className="text-5xl font-black text-red-500 tracking-tighter">
                    {panoramaData
                      .reduce((acc, row) => acc + row.totalPendingDays, 0)
                      .toLocaleString()}
                  </div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-sm flex flex-col justify-center">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Militares c/ Alta Pendência (&gt;60 dias)
                  </h3>
                  <div className="text-5xl font-black text-orange-500 tracking-tighter">
                    {panoramaData.filter((r) => r.totalPendingDays > 60).length}
                  </div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-sm flex flex-col justify-center">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Anos de Lapsos Totais Registrados
                  </h3>
                  <div className="text-5xl font-black text-indigo-500 tracking-tighter">
                    {panoramaData.reduce(
                      (acc, row) => acc + row.missingYears.length,
                      0,
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 sm:p-8 border-b border-slate-50 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                      Panorama Global SAD
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Visão geral sobre férias atrasadas, organizadas pelas
                      maiores pendências (antes da aposentadoria)
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const exportData = panoramaData.map((row) => ({
                        Militar: `${row.militar.rank} ${row.militar.name}`,
                        RG: row.militar.rg,
                        "Admissão Estimada": row.startYear,
                        "Lapsos (Anos Sem Registro)":
                          row.missingYears.join(", "),
                        "Saldos Parciais": row.pendingBalances
                          .map((p) => `${p.year} (${p.days}d)`)
                          .join("; "),
                        "Total Dias Pendentes": row.totalPendingDays,
                      }));
                      exportToExcel(
                        exportData,
                        "Panorama_Global_SAD",
                        "PanoramaGlobalSAD",
                      );
                    }}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Exportar Planilha
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/20">
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                          Militar
                        </th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-center">
                          Carreira (Est.)
                        </th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                          Lapsos de Registro (0 dias)
                        </th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                          Saldos Parciais Pendentes
                        </th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-center">
                          Dias a Cumprir
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {panoramaData.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-16 text-center text-[10px] font-black text-slate-400 uppercase"
                          >
                            Nenhuma pendência encontrada.
                          </td>
                        </tr>
                      ) : (
                        panoramaData.map((row, i) => (
                          <tr
                            key={row.militar.rg}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="shrink-0 w-8 flex justify-center">
                                  <RankInsignia rankStr={row.militar.rank} />
                                </div>
                                <div>
                                  <div className="text-xs font-black text-slate-800 uppercase">
                                    {row.militar.warName || row.militar.name}
                                  </div>
                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    RG: {row.militar.rg} • {row.militar.obm}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-[9px] font-black px-2 py-1 bg-slate-100 text-slate-500 rounded uppercase">
                                {new Date().getFullYear() - row.startYear} anos
                                ({row.startYear})
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {row.missingYears.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {row.missingYears.map((y) => (
                                    <span
                                      key={y}
                                      className="text-[8px] font-black bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100"
                                    >
                                      {y}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-300">
                                  -
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {row.pendingBalances.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {row.pendingBalances.map((p) => (
                                    <span
                                      key={p.year}
                                      className="text-[8px] font-black bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100"
                                    >
                                      {p.year} ({p.days}d)
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-300">
                                  -
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span
                                className={cn(
                                  "text-sm font-black px-3 py-1 rounded-lg border inline-block min-w-[3rem]",
                                  row.totalPendingDays > 100
                                    ? "bg-red-50 text-red-600 border-red-200"
                                    : row.totalPendingDays > 50
                                      ? "bg-orange-50 text-orange-600 border-orange-200"
                                      : "bg-indigo-50 text-indigo-600 border-indigo-200",
                                )}
                              >
                                {row.totalPendingDays}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      ) : selectedMilitar ? (
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-50 shadow-sm flex flex-col md:flex-row md:items-center gap-6 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-6 flex-1">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xl overflow-hidden p-2">
              <RankInsignia rankStr={selectedMilitar.rank} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                <span className="text-indigo-600 mr-2">
                  {selectedMilitar.rank}
                </span>
                {selectedMilitar.warName || selectedMilitar.name}
              </h3>
              <div className="flex gap-4 mt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  RG: {selectedMilitar.rg}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  OBM: {selectedMilitar.obm}
                </span>
              </div>
            </div>
          </div>
          {isPowerUser && isSadMode && (
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
          <h3 className="text-sm font-black text-amber-800 uppercase tracking-widest">
            Selecione um militar acima
          </h3>
          <p className="text-amber-600 font-bold uppercase text-[9px] tracking-[0.2em] mt-2">
            Para gerenciar férias, busque pelo RG ou Nome
          </p>
        </div>
      )}

      {selectedMilitar && viewMode === "individual" && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Sidebar Stats */}
          <div className="xl:col-span-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-6">
            <div className="bg-slate-900 rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-600/20 rounded-full blur-3xl"></div>
              <h3 className="text-orange-400 font-black text-[10px] uppercase tracking-[0.3em] mb-6">
                Resumo Anual
              </h3>
              <div className="space-y-6">
                <div>
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    Total Dias Gozados
                  </div>
                  <div className="text-3xl sm:text-4xl font-black tracking-tighter">
                    {vacations.reduce(
                      (acc, v) => acc + (v.diasGozados || 0),
                      0,
                    )}
                  </div>
                </div>
                <div className="pt-6 border-t border-white/10">
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    Total Saldo a Gozar
                  </div>
                  <div className="text-3xl sm:text-4xl font-black tracking-tighter text-orange-500">
                    {vacations.reduce((acc, v) => acc + (v.diasAGozar || 0), 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Próximos Afastamentos */}
            <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 border-2 border-slate-50 shadow-sm">
              <h3 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-6">
                Próximos Afastamentos
              </h3>
              <div className="space-y-4">
                {vacations.filter((v) => v.status === "marcado").length > 0 ? (
                  vacations
                    .filter((v) => v.status === "marcado")
                    .map((v) => (
                      <div
                        key={v.id}
                        className="p-4 bg-orange-50 rounded-2xl border border-orange-100"
                      >
                        <div className="text-[9px] font-black text-orange-600 uppercase mb-1">
                          Ref: {v.anoRef}
                        </div>
                        <div className="text-xs font-black text-slate-800 uppercase">
                          {v.dataInicio}
                        </div>
                        <div className="text-[8px] font-bold text-orange-400 uppercase tracking-widest mt-1">
                          Status: Confirmado
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-[10px] font-black text-slate-300 uppercase text-center py-8">
                    Nenhum agendamento
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Table Content Area */}
          <div className="xl:col-span-3 space-y-8">
            {/* Preferences Section - Always visible but controlled */}
            {selectedMilitar && (
              <div
                className={cn(
                  "bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 border-2 border-dashed shadow-sm relative group overflow-hidden transition-all",
                  preferencesEnabled
                    ? "border-indigo-200"
                    : "border-slate-100 opacity-80",
                )}
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Calendar className="w-16 h-16 text-indigo-600" />
                </div>

                <div className="flex items-center justify-between mb-2">
                  <h3
                    className={cn(
                      "font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2",
                      preferencesEnabled ? "text-indigo-600" : "text-slate-400",
                    )}
                  >
                    Escalonamento de Férias {activeYear}
                    {savingPrefs && (
                      <Loader2 className="w-3 h-3 animate-spin mx-2" />
                    )}
                    {!preferencesEnabled && (
                      <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[8px]">
                        Período Encerrado
                      </span>
                    )}
                  </h3>
                  {isPowerUser && (
                    <button
                      onClick={toggleGlobalPreferences}
                      className="text-[9px] font-bold text-indigo-600 hover:underline uppercase tracking-widest"
                    >
                      {preferencesEnabled ? "Encerrar Coleta" : "Abrir Coleta"}
                    </button>
                  )}
                </div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                  {preferencesEnabled
                    ? "Escolha 3 meses de sua preferência para gozo de férias (Sincronizado com SAD)"
                    : "A escolha de meses está temporariamente desativada pelo administrador."}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
                  {MONTHS.map((month) => {
                    const isSelected = userPrefs.includes(month);
                    const selIndex = userPrefs.indexOf(month);
                    const canSelect = preferencesEnabled || isPowerUser;
                    const isDisabled =
                      isSubmitted ||
                      (!isSelected && userPrefs.length >= 3 && !isPowerUser);

                    return (
                      <button
                        key={month}
                        onClick={() => toggleMonthPreference(month)}
                        disabled={isDisabled || !canSelect}
                        className={cn(
                          "py-2.5 px-3 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all flex items-center justify-between border-2",
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100"
                            : "bg-white text-slate-500 border-slate-50 hover:border-indigo-100",
                        )}
                      >
                        {month}
                        {isSelected && (
                          <span className="flex items-center gap-1">
                            <span className="text-[8px] opacity-80">
                              {selIndex + 1}º Opção
                            </span>
                            <CheckCircle2 className="w-3 h-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {preferencesEnabled &&
                  !isSubmitted &&
                  userPrefs.length === 3 && (
                    <div className="mt-6 flex flex-col items-end">
                      <button
                        onClick={handleInitiateSubmit}
                        disabled={savingPrefs}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-100 disabled:opacity-50"
                      >
                        {savingPrefs ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        Confirmar e Enviar Opções
                      </button>
                      
                      {showConfirmDialog && (
                        <div className="fixed z-50 inset-0 flex items-center justify-center p-4">
                          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowConfirmDialog(false)} />
                          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full relative z-10 shadow-2xl border-2 border-indigo-50 animate-in fade-in zoom-in-95 duration-200">
                             <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter">Confirmar Envio</h3>
                             <p className="text-sm text-slate-500 mb-6 leading-relaxed font-medium">Após enviar, será necessário solicitar ao administrador caso queira alterar as suas opções. Deseja continuar?</p>
                             <div className="flex items-center gap-3 w-full">
                               <button 
                                 onClick={() => setShowConfirmDialog(false)}
                                 className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
                               >
                                 Cancelar
                               </button>
                               <button 
                                 onClick={handleSubmitPreferences}
                                 className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
                               >
                                 Sim, Enviar
                               </button>
                             </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                {isSubmitted && (
                  <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center gap-2 text-emerald-700">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Suas opções foram enviadas e estão bloqueadas para
                      alteração.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* History Table */}
            <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="p-6 sm:p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/50 gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                    Histórico de Férias (DGP)
                  </h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Registros oficiais sincronizados via DGP (Diretoria Geral de
                    Pessoal)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setShowHiddenAsseguradas(!showHiddenAsseguradas)
                    }
                    className={cn(
                      "flex-1 sm:flex-none px-4 py-2 border rounded-xl flex items-center justify-center gap-2 transition-colors text-[10px] font-black uppercase tracking-widest",
                      showHiddenAsseguradas
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50",
                    )}
                  >
                    <Filter className="w-4 h-4" />{" "}
                    <span className="hidden sm:inline">
                      Asseguradas Ocultas
                    </span>
                    <span className="sm:hidden">Ass. Ocultas</span>
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="flex-1 sm:flex-none px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors text-[10px] font-black uppercase tracking-widest px-4"
                  >
                    <FileSpreadsheet className="w-4 h-4" />{" "}
                    <span className="hidden sm:inline">Exportar Planilha</span>
                    <span className="sm:hidden">Excel</span>
                  </button>
                  <button className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                    <Filter className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Report Header */}
              {vacations.length > 0 && (
                <div className="m-6 sm:m-8 p-6 bg-indigo-50/50 rounded-[2rem] border-2 border-indigo-100 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-400" />
                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">
                      Relatório Analítico de Pendências
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Missing Years */}
                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-indigo-50">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">
                        Anos Faltantes (Lapsos)
                      </span>
                      {missingYears.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {missingYears.map((y) => (
                            <span
                              key={y}
                              className="px-3 py-1.5 bg-red-50 border border-red-100 text-red-600 text-[10px] font-black rounded-lg"
                            >
                              {y}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-[10px] font-black text-emerald-600 uppercase">
                            Nenhum lapso identificado
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Pending balances */}
                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-indigo-50">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">
                        Anos com Saldo Pendente
                      </span>
                      {pendingYears.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {pendingYears.map((p) => (
                            <span
                              key={p.year}
                              className="px-3 py-1.5 bg-orange-50 border border-orange-100 text-orange-600 text-[10px] font-black rounded-lg"
                            >
                              {p.year}{" "}
                              <span className="opacity-70 mx-1">•</span>{" "}
                              {p.pending} dias
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-[10px] font-black text-emerald-600 uppercase">
                            Férias em dia
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/20">
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                        Ano Ref.
                      </th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                        Período
                      </th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                        Dias Goz.
                      </th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                        Saldo / Ass.
                      </th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                        Boletim / OBS
                      </th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                        Status
                      </th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-20 text-center text-[10px] font-black text-slate-300 uppercase animate-pulse"
                        >
                          Carregando dados...
                        </td>
                      </tr>
                    ) : groupedVacations.length > 0 ? (
                      groupedVacations.map((group) => {
                        const isExpanded = expandedYears[group.anoRef];
                        const v = group.items[0]; // display newest info for the main row.
                        const dateParts = (v.dataInicio || "").split("/");
                        let displayStatus: string = v.status;
                        if (dateParts.length === 3) {
                          const d = new Date(
                            parseInt(dateParts[2]),
                            parseInt(dateParts[1]) - 1,
                            parseInt(dateParts[0]),
                          );
                          displayStatus = d > new Date() ? "marcado" : "gozado";
                        }
                        if (
                          v.ato &&
                          v.ato.toUpperCase().includes("ASSEGURADAS")
                        )
                          displayStatus = "asseguradas";

                        return (
                          <React.Fragment key={group.anoRef}>
                            <tr
                              onClick={() => toggleYearGroup(group.anoRef)}
                              className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                            >
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-lg italic">
                                    {group.anoRef}
                                  </span>
                                  {group.items.length > 1 && (
                                    <span className="bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded-md text-[8px] font-black">
                                      +{group.items.length - 1} acts
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <div className="text-xs font-black text-slate-800 uppercase tracking-tighter">
                                  {v.dataInicio || "—"}{" "}
                                  {v.dataRetorno && (
                                    <>
                                      <span className="text-slate-300 mx-1">
                                        ➜
                                      </span>{" "}
                                      {v.dataRetorno}
                                    </>
                                  )}
                                </div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                                  {v.ato} (Mais recente)
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-slate-700">
                                    {group.totalGozados}
                                  </span>
                                  {group.totalGozados > 0 &&
                                    group.totalGozados < 30 && (
                                      <span className="text-[8px] text-amber-500 font-bold">
                                        Parcial
                                      </span>
                                    )}
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <div
                                  className={cn(
                                    "text-xs font-black",
                                    group.pending > 0
                                      ? "text-emerald-600"
                                      : "text-slate-400",
                                  )}
                                >
                                  {group.pending}
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <div className="text-[10px] font-black text-slate-600 uppercase">
                                  {v.boletim || "—"}
                                </div>
                                <div className="text-[8px] font-bold text-slate-300 uppercase leading-none mt-0.5">
                                  {v.boletimOrigem}
                                </div>
                                {v.obs && (
                                  <div
                                    className="text-[9px] font-bold text-amber-600 uppercase leading-none mt-1 truncate max-w-xs"
                                    title={v.obs}
                                  >
                                    {v.obs}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-5">
                                <div
                                  className={`
                                      inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest
                                      ${displayStatus === "gozado" ? "bg-emerald-50 text-emerald-600" : displayStatus === "marcado" ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"}
                                   `}
                                >
                                  <div
                                    className={`w-1.5 h-1.5 rounded-full ${displayStatus === "gozado" ? "bg-emerald-500" : displayStatus === "marcado" ? "bg-indigo-500" : "bg-amber-500"}`}
                                  ></div>
                                  {displayStatus}
                                </div>
                              </td>
                              <td className="px-6 py-5 text-right">
                                <div className="flex items-center justify-end gap-2 text-slate-400">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteVacation(v.id);
                                    }}
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                  {group.items.length > 1 ? (
                                    isExpanded ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )
                                  ) : (
                                    <div className="w-4 h-4"></div>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {isExpanded &&
                              group.items.length > 1 &&
                              group.items.slice(1).map((subV) => {
                                const sdParts = (subV.dataInicio || "").split(
                                  "/",
                                );
                                let subStatus: string = subV.status;
                                if (sdParts.length === 3) {
                                  const d = new Date(
                                    parseInt(sdParts[2]),
                                    parseInt(sdParts[1]) - 1,
                                    parseInt(sdParts[0]),
                                  );
                                  subStatus =
                                    d > new Date() ? "marcado" : "gozado";
                                }
                                if (
                                  subV.ato &&
                                  subV.ato.toUpperCase().includes("ASSEGURADAS")
                                )
                                  subStatus = "asseguradas";
                                return (
                                  <tr
                                    key={subV.id}
                                    className="bg-slate-50 border-t border-slate-100/50 group"
                                  >
                                    <td className="px-6 py-3"></td>
                                    <td className="px-6 py-3">
                                      <div className="text-xs font-bold text-slate-600 uppercase tracking-tighter opacity-80">
                                        {subV.dataInicio || "—"}{" "}
                                        {subV.dataRetorno && (
                                          <>
                                            <span className="text-slate-300 mx-1">
                                              ➜
                                            </span>{" "}
                                            {subV.dataRetorno}
                                          </>
                                        )}
                                      </div>
                                      <div className="text-[9px] font-bold text-slate-400 uppercase">
                                        {subV.ato}
                                      </div>
                                    </td>
                                    <td className="px-6 py-3 text-xs font-bold text-slate-600 opacity-80">
                                      {subV.diasGozados}
                                    </td>
                                    <td className="px-6 py-3"></td>
                                    <td className="px-6 py-3">
                                      <div className="text-[9px] font-black text-slate-500 uppercase">
                                        {subV.boletim || "—"}
                                      </div>
                                      <div className="text-[8px] font-bold text-slate-300 uppercase leading-none">
                                        {subV.boletimOrigem}
                                      </div>
                                      {subV.obs && (
                                        <div className="text-[8px] font-bold text-amber-600/80 uppercase leading-none mt-1 truncate max-w-xs">
                                          {subV.obs}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-6 py-3">
                                      <div
                                        className={`
                                          inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest
                                          ${subStatus === "gozado" ? "text-emerald-500" : subStatus === "marcado" ? "text-indigo-500" : "text-amber-500"}
                                      `}
                                      >
                                        {subStatus}
                                      </div>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                      <button
                                        onClick={() => deleteVacation(subV.id)}
                                        className="p-1.5 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-24 text-center">
                          <div className="max-w-xs mx-auto opacity-30">
                            <FileJson className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">
                              Sem Dados Sincronizados
                            </h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">
                              Clique em 'Sincronizar DGP' acima para importar o
                              histórico deste militar.
                            </p>
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
            militarRg={selectedMilitar?.rg || ""}
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
        <div
          className={`w-16 h-16 rounded-2xl shrink-0 flex flex-col items-center justify-center ${vacation.status === "gozado" ? "bg-slate-100 text-slate-400" : "bg-orange-600 text-white shadow-lg shadow-orange-100"}`}
        >
          <Calendar className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase mt-1">
            {vacation.anoRef}
          </span>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">
              {vacation.dataInicio} — {vacation.dataRetorno}
            </h4>
            <span
              className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${
                vacation.status === "gozado"
                  ? "bg-slate-100 text-slate-500"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-100"
              }`}
            >
              {vacation.status === "gozado" ? "Finalizado" : "Próximo Período"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Bol: {vacation.boletim}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {vacation.ato}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 border-l border-slate-100 pl-6 h-12">
          <div className="text-right">
            <div className="text-xl font-black text-orange-600 leading-none">
              {vacation.diasGozados}
            </div>
            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
              Dias Gozados
            </div>
          </div>
          <div className="text-right border-l border-slate-100 pl-4">
            <div className="text-xl font-black text-slate-800 leading-none">
              {vacation.diasAGozar}
            </div>
            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
              Saldo Reman.
            </div>
          </div>
        </div>
      </div>
      {vacation.obs && (
        <div className="mt-4 pt-4 border-t border-slate-50">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
            {vacation.obs}
          </p>
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-8">
      <History className="w-12 h-12 text-slate-200 mb-4" />
      <p className="text-slate-400 text-xs font-black uppercase tracking-widest">
        {message}
      </p>
      <p className="mt-2 text-slate-300 text-[10px] font-bold uppercase tracking-widest">
        Utilize o botão de sincronização para importar dados do DGP.
      </p>
    </div>
  );
}

function normalizeRg(rg: string | number) {
  const str = (rg || "").toString().trim().toUpperCase();
  const clean = str.replace(/[^A-Z0-9]/g, "");
  return clean.replace(/^0+/, "") || clean;
}
