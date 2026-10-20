import {
  collection,
  query,
  onSnapshot,
  orderBy,
  doc,
  getDoc,
  getDocs,
  where,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { subDays, format, addDays } from "date-fns";
import React, { useState, useEffect } from "react";
import {
  Shield,
  ShieldCheck,
  ChevronDown,
  Calendar,
  ArrowRightLeft,
  Clock,
  Bell,
  X,
  CheckCircle2,
  AlertCircle,
  XCircle,
  CalendarDays,
  Hourglass,
  FileClock,
  FileCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UserProfile, PermutaRequest, PermutaStatus } from "../types";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { getAlaForDate, getAlaColor, cn, getThemeColors, normalizeRg } from "../lib/utils";
import { resolveCanonicalScope, formatScopeLabel } from "../lib/canonicalScope";
import { motion, AnimatePresence } from "motion/react";
import { ptBR } from "date-fns/locale";
import { RankInsignia } from "./RankInsignia";
import { useAppConfig } from "../contexts/ConfigContext";

interface HeaderProps {
  profile: UserProfile;
  realProfile?: UserProfile;
  adminModeActive?: boolean;
  onToggleAdminMode?: () => void;
  obmContext: string;
  setObmContext: (obm: string) => void;
  availableObms: string[];
  isOfficerMode?: boolean;
}

export function Header({
  profile,
  realProfile,
  adminModeActive = false,
  onToggleAdminMode,
  obmContext,
  setObmContext,
  availableObms,
  isOfficerMode = false,
}: HeaderProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activePermutas, setActivePermutas] = useState<PermutaRequest[]>([]);
  const [notifications, setNotifications] = useState<PermutaRequest[]>([]);
  const [epiRequestActive, setEpiRequestActive] = useState(false);
  const [epiRequestMessage, setEpiRequestMessage] = useState("");

  const [dismissedNotifs, setDismissedNotifs] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("dismissed_notifs") || "[]");
    } catch {
      return [];
    }
  });

  const { activeMonths: ctxActiveMonths } = useAppConfig();

  const [activeMonthIndices, setActiveMonthIndices] = useState<number[]>(() => {
    const now = new Date();
    return [now.getMonth(), now.getMonth() === 11 ? 0 : now.getMonth() + 1];
  });

  const dismissNotif = (id: string, statusKey?: string) => {
    const key = statusKey ? `${id}_${statusKey}` : id;
    const next = [...dismissedNotifs, key, id];
    setDismissedNotifs(next);
    try {
      localStorage.setItem("dismissed_notifs", JSON.stringify(next));
    } catch {
      // ignore
    }
    setNotifications((prev) => prev.filter((p) => p.id !== id));
  };

  useEffect(() => {
    if (ctxActiveMonths && ctxActiveMonths.length > 0) {
      setActiveMonthIndices(ctxActiveMonths.map(Number));
    }
  }, [ctxActiveMonths]);

  useEffect(() => {
    if (!profile.rg || !db) return;

    const userRgStr = profile.rg.toString().padStart(5, "0");
    let unsubscribeConfig: () => void;
    let unsubscribeUser: () => void;
    let currentReqData: any = null;
    let currentUserData: any = null;

    const handleUpdate = () => {
      if (
        currentReqData &&
        currentReqData.isActive &&
        currentReqData.requestedAt
      ) {
        let needsUpdate = true;
        if (currentUserData && currentUserData.updatedAt) {
          const reqDate = new Date(currentReqData.requestedAt).getTime();
          const updateDate = new Date(currentUserData.updatedAt).getTime();
          if (updateDate >= reqDate) {
            needsUpdate = false;
          }
        }
        setEpiRequestActive(needsUpdate);
        setEpiRequestMessage(
          currentReqData.message ||
            "Por favor, revise e confirme seus dados de EPI no sistema.",
        );
      } else {
        setEpiRequestActive(false);
      }
    };

    const setupListeners = () => {
      try {
        unsubscribeConfig = onSnapshot(
          doc(db, "config", "epi_request"),
          (snap) => {
            currentReqData = snap.exists() ? snap.data() : null;
            handleUpdate();
          },
        );
        unsubscribeUser = onSnapshot(
          doc(db, "medidasAntropometricas", userRgStr),
          (snap) => {
            currentUserData = snap.exists() ? snap.data() : null;
            handleUpdate();
          },
        );
      } catch (err) {}
    };
    setupListeners();
    return () => {
      if (unsubscribeConfig) unsubscribeConfig();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, [profile.rg]);

  useEffect(() => {
    if (!profile.rg) return;

    let isMounted = true;
    let unsubSnapshot: (() => void) | void = undefined;

    function loadPermutas() {
      try {
        const sixtyDaysAgo = format(subDays(new Date(), 60), "yyyy-MM-dd");
        const q = query(
          collection(db, "permutas"),
          where("date", ">=", sixtyDaysAgo),
          orderBy("date", "asc"),
        );

        unsubSnapshot = onSnapshot(
          q,
          (snapshot) => {
            if (!isMounted) return;
            const data = snapshot.docs.map((doc) => ({
              ...doc.data(),
              id: doc.id,
            })) as PermutaRequest[];
            processPermutasData(data);
          },
          (error) => {
            if (isMounted) {
              handleFirestoreError(
                error,
                OperationType.LIST,
                "permutas",
                false,
              );
            }
          },
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "permutas", false);
      }
    }

    function processPermutasData(data: PermutaRequest[]) {
      const myCleanRg = normalizeRg(profile.rg);
      const active = data.filter((p) => {
        if (p.status === PermutaStatus.CANCELLED) return false;
        const reqRg = normalizeRg(p.requesterRg);
        const subRg = normalizeRg(p.substituteRg);
        if (reqRg !== myCleanRg && subRg !== myCleanRg)
          return false;
        const pDate = (p.date as any).toDate
          ? (p.date as any).toDate()
          : new Date(p.date as unknown as string);
        return activeMonthIndices.includes(pDate.getMonth());
      });
      setActivePermutas(active);

      const notifs = data.filter((p) => {
        const reqRg = normalizeRg(p.requesterRg);
        const subRg = normalizeRg(p.substituteRg);
        const isReq = reqRg === myCleanRg;
        const isSub = subRg === myCleanRg;
        if (!isReq && !isSub) return false;

        const needsMySign =
          p.status === PermutaStatus.PENDING &&
          ((isSub && !p.substituteSigned) || (isReq && !p.requesterSigned));

        // Se requer ação (assinatura pendente do militar), SEMPRE exibe!
        if (needsMySign) return true;

        const notifKey = `${p.id}_${p.status}`;
        if (dismissedNotifs.includes(notifKey) || dismissedNotifs.includes(p.id!)) {
          return false;
        }

        // Mostra permutas aceitas, indeferidas, canceladas, agendadas ou em análise do escalante
        return true;
      });

      // Prioridade: assinaturas pendentes do militar no topo
      notifs.sort((a, b) => {
        const aReq = normalizeRg(a.requesterRg) === myCleanRg;
        const aSub = normalizeRg(a.substituteRg) === myCleanRg;
        const aNeedsSign =
          a.status === PermutaStatus.PENDING &&
          ((aSub && !a.substituteSigned) || (aReq && !a.requesterSigned));

        const bReq = normalizeRg(b.requesterRg) === myCleanRg;
        const bSub = normalizeRg(b.substituteRg) === myCleanRg;
        const bNeedsSign =
          b.status === PermutaStatus.PENDING &&
          ((bSub && !b.substituteSigned) || (bReq && !b.requesterSigned));

        if (aNeedsSign && !bNeedsSign) return -1;
        if (!aNeedsSign && bNeedsSign) return 1;
        return 0;
      });

      setNotifications(notifs);
    }

    loadPermutas();

    return () => {
      isMounted = false;
      if (unsubSnapshot) unsubSnapshot();
    };
  }, [profile.rg, dismissedNotifs, activeMonthIndices]);

  const [userRegime, setUserRegime] = useState<string>("");

  useEffect(() => {
    if (!profile.rg || !obmContext) return;
    const normalizedObm = obmContext
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();
    const globalDocRef = doc(
      db,
      "config",
      `expediente_global_${normalizedObm}`,
    );

    let isMounted = true;
    const cacheKey = `expediente_global_${normalizedObm}_${profile.rg}_cache`;

    async function fetchGlobalExpediente() {
      try {
        const cachedStr = localStorage.getItem(cacheKey);
        if (cachedStr) {
          const data = JSON.parse(cachedStr);
          if (isMounted) setUserRegime(data.regimes?.[profile.rg!] || "");
        }
      } catch (e) {}

      try {
        const snap = await getDoc(globalDocRef);
        if (snap.exists() && isMounted) {
          const data = snap.data();
          setUserRegime(data.regimes?.[profile.rg!] || "");
          try {
            localStorage.setItem(cacheKey, JSON.stringify(data));
          } catch (e) {}
        }
      } catch (e) {
        console.warn("Failed to fetch global expediente", e);
      }
    }

    fetchGlobalExpediente();
    return () => {
      isMounted = false;
    };
  }, [profile.rg, obmContext]);

  // Upcoming services calculation based on active months
  const [upcomingServices, setUpcomingServices] = useState<Date[]>([]);
  const isExp = Boolean(
    ["EXP", "E", "EXPEDIENTE"].includes(
      profile.ala?.toString().toUpperCase() || "",
    ) || Boolean(userRegime) || profile.rg === "54444"
  );

  const [expedienteSelections, setExpedienteSelections] = useState<string[]>(
    [],
  );
  const [grdDays, setGrdDays] = useState<string[]>([]);

  useEffect(() => {
    if (!profile.rg || activeMonthIndices.length === 0 || !obmContext) return;

    const obmId = obmContext.replace(/\//g, "_").replace(/\s/g, "_");
    const userRgEscaped = normalizeRg(profile.rg);

    const now = new Date();
    let isMounted = true;
    const unsubscribes: (() => void)[] = [];

    activeMonthIndices.forEach((monthIndex) => {
      let year = now.getFullYear();
      if (monthIndex < now.getMonth() && now.getMonth() === 11) {
        year += 1;
      }
      const mDate = new Date(year, monthIndex, 1);
      const monthKey = format(mDate, "yyyy-MM");

      const docRef = doc(db, "grd_configs", `${obmId}_${monthKey}`);
      const unsub = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const days = snapshot.data().days || {};
          setGrdDays((prev) => {
            const remaining = prev.filter((d) => !d.startsWith(monthKey));
            const newDays: string[] = [];
            Object.keys(days).forEach((dateStr) => {
              const rgs = days[dateStr] || [];
              const normalizedGrdRgs = rgs.map((r: string) => normalizeRg(r));
              if (normalizedGrdRgs.includes(userRgEscaped)) {
                newDays.push(dateStr);
              }
            });
            return [...remaining, ...newDays];
          });
        }
      });
      unsubscribes.push(unsub);
    });

    return () => {
      isMounted = false;
      unsubscribes.forEach((u) => u());
    };
  }, [profile.rg, obmContext, activeMonthIndices]);

  useEffect(() => {
    if (!isExp || !profile.rg || activeMonthIndices.length === 0 || !obmContext)
      return;

    const normalizedObm = obmContext
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();
    const now = new Date();

    // We will store all fetched dates in a Map or array. For simplicity, just an array inside ref or state.

    const currentSelections = new Set<string>();

    let isMounted = true;
    async function loadMonthData() {
      for (const monthIndex of activeMonthIndices) {
        if (!isMounted) break;
        let year = now.getFullYear();
        if (monthIndex < now.getMonth() && now.getMonth() === 11) {
          year += 1;
        }
        const mDate = new Date(year, monthIndex, 1);
        const monthKey = format(mDate, "yyyy-MM");
        const docRef = doc(db, `expediente_${normalizedObm}`, monthKey);
        const cacheKey = `expediente_${normalizedObm}_${monthKey}_${profile.rg}_v2`;
        try {
          const cachedStr = localStorage.getItem(cacheKey);
          if (cachedStr) {
            const data = JSON.parse(cachedStr);
            updateSelections(monthKey, data);
          }
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && isMounted) {
            const data = docSnap.data();
            updateSelections(monthKey, data);
            try {
              localStorage.setItem(cacheKey, JSON.stringify(data));
            } catch (e) {}
          }
        } catch (e) {
          console.warn(e);
        }
      }
    }

    function updateSelections(monthKey: string, data: any) {
      if (!isMounted) return;
      const arr = Array.from(currentSelections).filter(
        (d) => !d.startsWith(monthKey),
      );
      currentSelections.clear();
      arr.forEach((d) => currentSelections.add(d));
      if (data?.selections && data.selections[profile.rg!]) {
        data.selections[profile.rg!].forEach((d: string) =>
          currentSelections.add(d),
        );
      }
      setExpedienteSelections(Array.from(currentSelections));
    }

    loadMonthData();
    return () => {
      isMounted = false;
    };
  }, [profile.rg, isExp, activeMonthIndices, obmContext]);

  useEffect(() => {
    if (activeMonthIndices.length === 0) return;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const dates: Date[] = [];
    const alaType = profile.ala?.toString().toUpperCase() || "";
    const alaNum = parseInt(alaType, 10);

    activeMonthIndices.forEach((monthIndex) => {
      let year = now.getFullYear();
      if (monthIndex < now.getMonth() && now.getMonth() === 11) {
        year += 1;
      }
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, monthIndex, i);
        if (d < now) continue;

        const dStr = format(d, "yyyy-MM-dd");
        const nAla = getAlaForDate(d);
        const isAla = !isExp && nAla === alaNum;
        const isExpDay = isExp && expedienteSelections.includes(dStr);
        const isGrdDay = grdDays.includes(dStr);
        const naturallyScheduled = isAla || isExpDay || isGrdDay;

        const myCleanRg = normalizeRg(profile.rg);
        const hasPermutaAsSubstitute = activePermutas.some((p) => {
          const pDate = new Date(p.date + "T00:00:00");
          return (
            pDate.getTime() === d.getTime() &&
            normalizeRg(p.substituteRg) === myCleanRg &&
            p.status !== "cancelled"
          );
        });
        const hasPermutaAsRequester = activePermutas.some((p) => {
          const pDate = new Date(p.date + "T00:00:00");
          return (
            pDate.getTime() === d.getTime() &&
            normalizeRg(p.requesterRg) === myCleanRg &&
            p.status !== "cancelled"
          );
        });

        if (
          naturallyScheduled ||
          hasPermutaAsSubstitute ||
          hasPermutaAsRequester
        ) {
          // Prevent duplicates
          if (!dates.some((existing) => existing.getTime() === d.getTime())) {
            dates.push(d);
          }
        }
      }
    });

    dates.sort((a, b) => a.getTime() - b.getTime());
    setUpcomingServices(dates);
  }, [
    activeMonthIndices,
    activePermutas,
    profile.ala,
    profile.rg,
    expedienteSelections,
    isExp,
    grdDays,
  ]);

  const alaType = isExp ? "EXP" : (profile.ala?.toString().toUpperCase() || "");
  const theme = getThemeColors(alaType);

  const r = profile.rank ? profile.rank.toUpperCase() : "";

  const getStatusText = (p: PermutaRequest) => {
    if (p.status === "accepted") return "DEFERIDO";
    if (p.status === "rejected") return "INDEFERIDO";
    if (p.status === "cancelled") return "CANCELADA";
    if (p.requesterSigned && p.substituteSigned) return "EM ANÁLISE";
    return "1/2 PENDENTE";
  };

  const getStatusColor = (p: PermutaRequest) => {
    if (p.status === "accepted")
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (p.status === "rejected")
      return "bg-red-100 text-red-700 border-red-200";
    if (p.status === "cancelled")
      return "bg-slate-100 text-slate-600 border-slate-200";
    if (p.requesterSigned && p.substituteSigned)
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-amber-100 text-amber-700 border-amber-200";
  };

  const formatMilitar = (rank: string, name: string) => {
    let fullName = `${rank || ""} ${name || ""}`.trim().toUpperCase();

    fullName = fullName
      .replace(/SOLDADO/g, "SD")
      .replace(/CABO/g, "CB")
      .replace(/SARGENTO/g, "SGT")
      .replace(/SUBTENENTE/g, "ST")
      .replace(/TENENTE/g, "TEN")
      .replace(/CAPITÃO/g, "CAP")
      .replace(/CAPITAO/g, "CAP")
      .replace(/MAJOR/g, "MAJ")
      .replace(/CORONEL/g, "CEL");

    // deduplicate if both name and rank had the title
    fullName = fullName
      .replace(/SD\s+SD/g, "SD")
      .replace(/CB\s+CB/g, "CB")
      .replace(/SGT\s+SGT/g, "SGT")
      .replace(/ST\s+ST/g, "ST")
      .replace(/TEN\s+TEN/g, "TEN")
      .replace(/CAP\s+CAP/g, "CAP")
      .replace(/MAJ\s+MAJ/g, "MAJ")
      .replace(/CEL\s+CEL/g, "CEL");

    return fullName;
  };

  const myCleanRg = normalizeRg(profile.rg);
  const pendingActionCount = notifications.filter((n) => {
    const isReq = normalizeRg(n.requesterRg) === myCleanRg;
    const isSub = normalizeRg(n.substituteRg) === myCleanRg;
    return (
      n.status === PermutaStatus.PENDING &&
      ((isSub && !n.substituteSigned) || (isReq && !n.requesterSigned))
    );
  }).length;

  return (
    <div
      id="header"
      className={cn(
        "relative mb-8 rounded-2xl shadow-sm border border-slate-300 dark:border-slate-700 overflow-hidden transition-colors duration-500 bg-white dark:bg-[#141c2e]",
        theme.panel,
      )}
    >
      <div className="p-3 sm:p-6">
        <div className="flex flex-row items-center justify-between gap-2 xs:gap-3 sm:gap-6 min-w-0 w-full">
          <div className="flex-1 min-w-0 pr-1">
            {/* Texto de Unidade acima da apresentação */}
            <div className="flex items-center gap-1 font-mono text-[8px] xs:text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em] mb-1 sm:mb-2 px-0.5">
              <span className="text-slate-400 dark:text-slate-500 shrink-0">Unidade:</span>
              {availableObms && availableObms.length > 1 && setObmContext ? (
                <select
                  value={obmContext}
                  onChange={(e) => setObmContext(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-black rounded px-1.5 py-0.5 outline-none focus:border-[var(--color-brand-red)] transition-colors max-w-[120px] xs:max-w-[140px] sm:max-w-none text-ellipsis text-[8px] xs:text-[9px] sm:text-[10px]"
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
              ) : (
                <span className="font-black text-slate-700 dark:text-slate-300 text-[8px] xs:text-[9px] sm:text-[10px] uppercase">
                  {obmContext || profile.obm || '10º GBM'}
                </span>
              )}
            </div>

            {/* Linha da Apresentação do Militar */}
            <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
              <div className="w-1 sm:w-1.5 h-6 sm:h-7 bg-[var(--color-brand-red)] shrink-0 rounded-full" />

              <div className="relative shrink-0">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className={cn(
                    "px-1.5 py-1 sm:px-2.5 sm:py-1.5 rounded-lg flex items-center gap-1 sm:gap-2 transition-all relative shadow-xs cursor-pointer",
                    pendingActionCount > 0
                      ? "text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 ring-2 ring-amber-400/50"
                      : notifications.length > 0 || epiRequestActive
                        ? "text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200"
                        : "text-[var(--color-brand-red)] bg-red-50 dark:bg-red-950/40 hover:bg-red-100 border border-red-100 dark:border-red-900/50",
                  )}
                  title={
                    pendingActionCount > 0
                      ? `Você tem ${pendingActionCount} assinatura(s) pendente(s)!`
                      : "Expandir Resumo e Notificações"
                  }
                >
                  <div className="relative">
                    <Bell className={cn("w-3.5 h-3.5 sm:w-5 sm:h-5", pendingActionCount > 0 && "animate-bounce text-amber-700")} />
                    {(notifications.length > 0 || epiRequestActive) && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={cn(
                          "absolute -top-1.5 -right-2 min-w-3.5 h-3.5 sm:min-w-4 sm:h-4 px-0.5 sm:px-1 flex items-center justify-center text-[8px] sm:text-[9px] font-black rounded-full border border-white dark:border-slate-900 leading-none",
                          pendingActionCount > 0
                            ? "bg-amber-600 text-white animate-pulse"
                            : "bg-red-500 text-white"
                        )}
                      >
                        {notifications.length + (epiRequestActive ? 1 : 0)}
                      </motion.span>
                    )}
                  </div>
                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                    <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-[var(--color-brand-red)]" strokeWidth={3} />
                  </motion.div>
                </button>
              </div>

              {/* Rank Insignia */}
              <div className="mr-0.5 sm:mr-3 shrink-0 text-[var(--color-brand-red)]">
                <RankInsignia
                  rankStr={profile.rank}
                  className="scale-[1.1] sm:scale-[1.8] min-[880px]:scale-[2.2] origin-left"
                />
              </div>

              <div
                className={`flex flex-col min-w-0 ${["CORONEL", "TENENTE CORONEL", "MAJOR", "CAPITÃO", "1º TENENTE", "2º TENENTE", "ASP OF", "CADETE"].includes(profile.rank?.trim()?.toUpperCase() || "") ? "ml-4 sm:ml-28 min-[880px]:ml-36" : "ml-0.5 sm:ml-4 min-[880px]:ml-8"}`}
              >
                <div className="flex items-center gap-1">
                  <h2 className="text-[8px] xs:text-[9px] sm:text-sm font-black text-[var(--color-brand-red)] uppercase tracking-[0.15em] sm:tracking-[0.2em] mb-0.5 truncate">
                    {profile.rank}
                  </h2>
                </div>
                <div className="flex items-center flex-wrap gap-1 sm:gap-2">
                  <h2 className="text-xs xs:text-sm sm:text-xl min-[880px]:text-2xl font-black text-[var(--color-brand-dark)] dark:text-slate-100 uppercase tracking-tight truncate max-w-[85px] xs:max-w-[120px] sm:max-w-none">
                    {profile.warName || profile.name}
                  </h2>
                  {(() => {
                    const actualProfile = realProfile || profile;
                    const hasAdminPrivilege =
                      actualProfile?.isAdmin ||
                      (actualProfile?.adminObms &&
                        actualProfile.adminObms.length > 0);

                    if (!hasAdminPrivilege) return null;

                    if (onToggleAdminMode) {
                      return (
                        <button
                          onClick={onToggleAdminMode}
                          className={cn(
                            "p-1 sm:p-2 rounded-md sm:rounded-xl flex items-center justify-center border transition-all shadow-xs active:scale-95 cursor-pointer shrink-0",
                            adminModeActive
                              ? "bg-indigo-600 text-white border-indigo-700 shadow-indigo-100/50 hover:bg-indigo-700"
                              : "bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300",
                          )}
                          title={adminModeActive ? "Modo Moderador Ativo (clique para desativar)" : "Ativar Modo Moderador"}
                          aria-label="Modo Moderador"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                        </button>
                      );
                    }

                    return (
                      <span
                        className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 p-1 rounded-md flex items-center justify-center border border-amber-200 dark:border-amber-800 shrink-0"
                        title="Moderador"
                        aria-label="Moderador"
                      >
                        <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Cubo com Informações da Escala (à direita) */}
          <div className="shrink-0 flex items-center justify-end">
            {isOfficerMode ? (
              <div className="p-1.5 xs:p-2 sm:p-3 rounded-xl shadow-xs border border-[var(--color-brand-red)] bg-red-50 dark:bg-red-950/40 text-[var(--color-brand-red)] text-center flex flex-col items-center justify-center shrink-0 w-auto min-w-[90px] xs:min-w-[105px] sm:min-w-[170px] max-w-[130px] sm:max-w-none">
                <div className="text-[7px] xs:text-[8px] sm:text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                  FUNÇÃO / CHEFIA
                </div>
                <div className="text-[10px] xs:text-[11.5px] sm:text-[12px] font-black leading-tight uppercase truncate max-w-full">
                  {profile.officerRole || "A SER DEFINIDO"}
                </div>
              </div>
            ) : isExp ? (
              <div className="p-1.5 xs:p-2 sm:p-3 rounded-xl shadow-xs border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 text-center flex flex-col items-center justify-center shrink-0 w-auto min-w-[90px] xs:min-w-[105px] sm:min-w-[170px] max-w-[130px] sm:max-w-none">
                <div className="text-[7px] xs:text-[8px] sm:text-[10px] font-black uppercase tracking-wider whitespace-nowrap text-slate-500 dark:text-slate-400">
                  REGIME / ESCALA
                </div>
                <div className="text-[10.5px] xs:text-[12px] sm:text-[14px] font-black leading-tight uppercase text-slate-800 dark:text-slate-100">
                  EXPEDIENTE
                </div>
                {userRegime ? (
                  <div className="text-[7px] xs:text-[8px] sm:text-[9.5px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-0.5 truncate max-w-full">
                    {userRegime}
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                {/* Mobile view: single active Ala cube */}
                <div className="flex sm:hidden">
                  <div
                    className={cn(
                      "rounded-xl shadow-xs text-center flex flex-col items-center justify-center border p-1.5 shrink-0 min-w-[90px] xs:min-w-[105px] max-w-[125px]",
                      alaType === "1"
                        ? "bg-emerald-600 text-white border-transparent"
                        : alaType === "2"
                          ? "bg-rose-600 text-white border-transparent"
                          : alaType === "3"
                            ? "bg-sky-600 text-white border-transparent"
                            : alaType === "4"
                              ? "bg-amber-500 text-white border-transparent"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700",
                    )}
                  >
                    <div className="text-[7px] xs:text-[7.5px] uppercase font-bold opacity-80 whitespace-nowrap">
                      REGIME / ESCALA
                    </div>
                    <div className="text-[10.5px] xs:text-[11.5px] font-black leading-tight uppercase whitespace-nowrap">
                      {alaType ? `ALA ${alaType}` : "SEM ALA"}
                    </div>
                    <div className="text-[7px] xs:text-[7.5px] font-black tracking-widest uppercase opacity-90">
                      {alaType === "1"
                        ? "VERDE"
                        : alaType === "2"
                          ? "VERMELHO"
                          : alaType === "3"
                            ? "AZUL"
                            : alaType === "4"
                              ? "AMARELO"
                              : ""}
                    </div>
                  </div>
                </div>

                {/* Tablet and Desktop view: 4 alas */}
                <div className="hidden sm:grid grid-cols-2 min-[880px]:grid-cols-4 gap-1.5 sm:gap-2">
                  <div
                    className={cn(
                      "rounded-lg shadow-sm text-center flex flex-col items-center justify-center border transition-all",
                      "w-[72px] sm:w-20 min-[880px]:w-20 py-2 sm:py-2.5 min-[880px]:p-3",
                      alaType === "1"
                        ? "bg-emerald-600 text-white border-transparent"
                        : "bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700",
                    )}
                  >
                    <div
                      className={cn(
                        "text-[8px] uppercase font-bold",
                        alaType === "1" ? "opacity-80" : "",
                      )}
                    >
                      Ala 1
                    </div>
                    <div
                      className={cn(
                        "text-[9px] sm:text-[10px] font-black leading-tight min-[880px]:leading-none",
                        alaType === "1" ? "" : "text-slate-300 dark:text-slate-500",
                      )}
                    >
                      VERDE
                    </div>
                  </div>

                  <div
                    className={cn(
                      "rounded-lg shadow-sm text-center flex flex-col items-center justify-center border transition-all",
                      "w-[72px] sm:w-20 min-[880px]:w-20 py-2 sm:py-2.5 min-[880px]:p-3",
                      alaType === "2"
                        ? "bg-rose-600 text-white border-transparent"
                        : "bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700",
                    )}
                  >
                    <div
                      className={cn(
                        "text-[8px] uppercase font-bold",
                        alaType === "2" ? "opacity-80" : "",
                      )}
                    >
                      Ala 2
                    </div>
                    <div
                      className={cn(
                        "text-[9px] sm:text-[10px] font-black leading-tight min-[880px]:leading-none",
                        alaType === "2" ? "" : "text-slate-300 dark:text-slate-500",
                      )}
                    >
                      VERMELHO
                    </div>
                  </div>

                  <div
                    className={cn(
                      "rounded-lg shadow-sm text-center flex flex-col items-center justify-center border transition-all",
                      "w-[72px] sm:w-20 min-[880px]:w-20 py-2 sm:py-2.5 min-[880px]:p-3",
                      alaType === "3"
                        ? "bg-sky-600 text-white border-transparent"
                        : "bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700",
                    )}
                  >
                    <div
                      className={cn(
                        "text-[8px] uppercase font-bold",
                        alaType === "3" ? "opacity-80" : "",
                      )}
                    >
                      Ala 3
                    </div>
                    <div
                      className={cn(
                        "text-[9px] sm:text-[10px] font-black leading-tight min-[880px]:leading-none",
                        alaType === "3" ? "" : "text-slate-300 dark:text-slate-500",
                      )}
                    >
                      AZUL
                    </div>
                  </div>

                  <div
                    className={cn(
                      "rounded-lg shadow-sm text-center flex flex-col items-center justify-center border transition-all",
                      "w-[72px] sm:w-20 min-[880px]:w-20 py-2 sm:py-2.5 min-[880px]:p-3",
                      alaType === "4"
                        ? "bg-amber-500 text-white border-transparent"
                        : "bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700",
                    )}
                  >
                    <div
                      className={cn(
                        "text-[8px] uppercase font-bold",
                        alaType === "4" ? "opacity-80" : "",
                      )}
                    >
                      Ala 4
                    </div>
                    <div
                      className={cn(
                        "text-[9px] sm:text-[10px] font-black leading-tight min-[880px]:leading-none",
                        alaType === "4" ? "" : "text-slate-300 dark:text-slate-500",
                      )}
                    >
                      AMARELO
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {!isOfficerMode && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={cn(
              "border-t transition-colors duration-500",
              theme.borderInner,
              theme.panel,
            )}
          >
            <div className="p-6 flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <h4
                  className={cn(
                    "flex items-center gap-2 text-xs font-black mb-3 uppercase tracking-widest",
                    theme.title,
                  )}
                >
                  <CalendarDays className="w-4 h-4" /> Próximos Serviços
                </h4>
                {upcomingServices.length > 0 ? (
                  <div className="flex flex-wrap gap-2 max-h-[240px] overflow-y-auto pr-1 py-1 custom-scrollbar">
                    {upcomingServices.map((d, i) => {
                      const dStr = format(d, "yyyy-MM-dd");
                      const isGrdDay = grdDays.includes(dStr);
                      const dayPermutas = activePermutas.filter((p) => {
                        const pDate = new Date(p.date + "T00:00:00");
                        return pDate.getTime() === d.getTime();
                      });
                      const p = dayPermutas[0];

                      let isCrossedOut = false;
                      let pIcon = isGrdDay ? (
                        <Shield className="w-4 h-4 text-indigo-500" />
                      ) : null;
                      let pText = isGrdDay ? "GRD" : "";
                      let pColor = isGrdDay
                        ? "text-indigo-700 bg-indigo-50 border-indigo-200"
                        : "";

                      let bgColor = isGrdDay
                        ? "bg-indigo-50 border-indigo-200"
                        : cn(theme.card, "border-transparent");
                      let textDayColor = isGrdDay
                        ? "text-indigo-800"
                        : theme.text;

                      if (p) {
                        const isRequester = normalizeRg(p.requesterRg) === myCleanRg;
                        if (isRequester && p.status === "accepted") {
                          isCrossedOut = true;
                          bgColor = "bg-slate-50 border-slate-200 opacity-50";
                          textDayColor = "text-slate-400";
                        }

                        if (p.status === "accepted") {
                          pIcon = (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          );
                          pText = "DEFERIDO";
                          pColor =
                            "text-emerald-700 bg-emerald-50 border-emerald-200";
                          if (!isCrossedOut) {
                            bgColor = "bg-emerald-50 border-emerald-200";
                            textDayColor = "text-emerald-800";
                          }
                        } else if (p.status === "rejected") {
                          pIcon = <XCircle className="w-4 h-4 text-red-500" />;
                          pText = "INDEFERIDO";
                          pColor = "text-red-700 bg-red-50 border-red-200";
                        } else if (p.requesterSigned && p.substituteSigned) {
                          pIcon = (
                            <Hourglass className="w-4 h-4 text-yellow-500" />
                          );
                          pText = "EM ANÁLISE";
                          pColor =
                            "text-yellow-700 bg-yellow-50 border-yellow-300";
                          if (!isCrossedOut) {
                            bgColor = "bg-yellow-50 border-yellow-300";
                            textDayColor = "text-yellow-800";
                          }
                        } else {
                          pIcon = (
                            <ArrowRightLeft className="w-4 h-4 text-amber-500" />
                          );
                          pText = "PENDENTE";
                          pColor =
                            "text-amber-700 bg-amber-50 border-amber-200";
                          if (!isCrossedOut) {
                            bgColor = "bg-amber-50 border-amber-200";
                            textDayColor = "text-amber-800";
                          }
                        }
                      }

                      return (
                        <div
                          key={i}
                          className={cn(
                            "border rounded-xl shadow-sm flex flex-col items-center justify-center p-2 min-w-[56px] relative",
                            bgColor,
                          )}
                          title={
                            pText
                              ? `${format(d, "dd/MM/yyyy")} - ${pText}`
                              : format(d, "dd/MM/yyyy")
                          }
                        >
                          {isGrdDay && (
                            <div className="absolute inset-0 overflow-hidden rounded-xl">
                              <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                                <Shield className="w-full h-full fill-indigo-500 text-indigo-500" />
                              </div>
                            </div>
                          )}
                          {(p && p.status !== "cancelled") || isGrdDay ? (
                            <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full shadow-sm ring-1 ring-slate-900/5 z-10 w-5 h-5 flex items-center justify-center">
                              {pIcon}
                            </div>
                          ) : null}
                          <span
                            className={cn(
                              "text-lg font-black leading-none mt-1 z-10",
                              isCrossedOut && "line-through",
                              textDayColor,
                            )}
                          >
                            {format(d, "dd")}
                          </span>
                          <span
                            className={cn(
                              "text-[9px] font-bold uppercase tracking-widest mt-1 opacity-70 z-10",
                              textDayColor,
                            )}
                          >
                            {format(d, "MMM", { locale: ptBR })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className={cn(
                      "text-sm border rounded p-3 opacity-90",
                      theme.card,
                      theme.text,
                    )}
                  >
                    Nenhum serviço agendado neste período.
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h4
                  className={cn(
                    "flex items-center gap-2 text-xs font-black mb-3 uppercase tracking-widest",
                    theme.title,
                  )}
                >
                  <ArrowRightLeft className="w-4 h-4" /> Resumo de Permutas
                </h4>
                {activePermutas.length > 0 ? (
                  <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
                    {activePermutas.slice(0, 5).map((p) => {
                      const isRequester = normalizeRg(p.requesterRg) === myCleanRg;
                      const otherMilitar = isRequester
                        ? p.substituteName || ""
                        : p.requesterName || "";

                      const pDate = new Date(p.date + "T00:00:00");
                      const alaNum = getAlaForDate(pDate);

                      let borderColor = theme.borderInner;
                      let bgColor = theme.card;
                      let textColor = theme.text;

                      if (p.status === "accepted") {
                        borderColor = "border-emerald-300";
                        bgColor = "bg-emerald-100";
                        textColor = "text-emerald-900";
                      } else if (p.status === "rejected") {
                        borderColor = "border-red-300";
                        bgColor = "bg-red-100";
                        textColor = "text-red-900";
                      } else if (p.status === "cancelled") {
                        borderColor = "border-slate-300";
                        bgColor = "bg-slate-100";
                        textColor = "text-slate-800";
                      } else if (p.requesterSigned && p.substituteSigned) {
                        borderColor = "border-yellow-400";
                        bgColor = "bg-yellow-100";
                        textColor = "text-yellow-900";
                      }

                      return (
                        <div
                          key={p.id}
                          className={cn(
                            "border rounded p-3 shadow-sm text-sm flex flex-col gap-2 transition-colors",
                            borderColor,
                            bgColor,
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                "flex items-center gap-1.5 text-xs font-black uppercase px-2 py-1 rounded shadow-sm border",
                                alaNum === 1
                                  ? "bg-emerald-200/50 text-emerald-900 border-emerald-300"
                                  : alaNum === 2
                                    ? "bg-rose-200/50 text-rose-900 border-rose-300"
                                    : alaNum === 3
                                      ? "bg-sky-200/50 text-sky-900 border-sky-300"
                                      : alaNum === 4
                                        ? "bg-amber-200/50 text-amber-900 border-amber-300"
                                        : "bg-slate-200/50 text-slate-800 border-slate-300",
                              )}
                            >
                              <span className="tracking-tight">
                                {format(pDate, "dd/MM/yyyy")}
                              </span>
                              <span className="opacity-40">|</span>
                              <span>Ala {alaNum}</span>
                            </span>
                            <span
                              className={cn(
                                "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border bg-white shadow-sm",
                                getStatusColor(p),
                              )}
                            >
                              {getStatusText(p)}
                            </span>
                          </div>

                          <div
                            className={cn(
                              "text-xs font-medium leading-relaxed opacity-90",
                              textColor,
                            )}
                          >
                            {isRequester ? (
                              <>
                                Solicitação para que o militar{" "}
                                <strong className="font-black">
                                  {otherMilitar}
                                </strong>{" "}
                                substitua{" "}
                                <strong className="font-black uppercase tracking-widest text-[#1e293b]">
                                  VOCÊ
                                </strong>
                                .
                              </>
                            ) : (
                              <>
                                Solicitação para que{" "}
                                <strong className="font-black uppercase tracking-widest text-[#1e293b]">
                                  VOCÊ
                                </strong>{" "}
                                substitua o militar{" "}
                                <strong className="font-black">
                                  {otherMilitar}
                                </strong>
                                .
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className={cn(
                      "text-sm border rounded p-3 opacity-90",
                      theme.card,
                      theme.text,
                    )}
                  >
                    Nenhuma permuta futura ou em andamento.
                  </div>
                )}
              </div>

              {/* Seção de Notificações */}
              <div className="flex-1">
                <h4
                  className={cn(
                    "flex items-center gap-2 text-xs font-black mb-3 uppercase tracking-widest",
                    theme.title,
                  )}
                >
                  <Bell className="w-4 h-4" /> Notificações & Avisos
                  {(notifications.length > 0 || epiRequestActive) && (
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded ml-auto",
                        pendingActionCount > 0
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-slate-100 text-slate-700",
                      )}
                    >
                      {notifications.length + (epiRequestActive ? 1 : 0)} nova(s)
                    </span>
                  )}
                </h4>
                {notifications.length > 0 || epiRequestActive ? (
                  <div className="flex flex-col max-h-[260px] overflow-y-auto pr-1 custom-scrollbar border rounded shadow-sm bg-white overflow-hidden">
                    {epiRequestActive && (
                      <div className="p-3 relative group transition-colors bg-amber-50 hover:bg-amber-100 border-b last:border-b-0 border-amber-200">
                        <div className="flex gap-3">
                          <div className="mt-0.5">
                            <AlertCircle className="w-5 h-5 text-amber-500 animate-pulse" />
                          </div>
                          <div className="flex-1 pr-4">
                            <div className="text-xs text-amber-900 leading-relaxed font-bold">
                              {epiRequestMessage}
                            </div>
                            <div className="text-[10px] text-amber-700 mt-1 uppercase font-black tracking-widest">
                              Medidas e Fardamento (Ir para o Início)
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {notifications.map((n) => {
                      const isRequester = normalizeRg(n.requesterRg) === myCleanRg;
                      const isSubstitute = normalizeRg(n.substituteRg) === myCleanRg;
                      const otherName = isRequester
                        ? n.substituteName || "Militar"
                        : n.requesterName || "Militar";
                      const pDate = new Date(n.date + "T00:00:00");
                      const formattedDate = format(pDate, "dd/MM/yyyy");

                      const needsMySignature =
                        n.status === PermutaStatus.PENDING &&
                        ((isSubstitute && !n.substituteSigned) ||
                          (isRequester && !n.requesterSigned));

                      const isWaitingOther =
                        n.status === PermutaStatus.PENDING &&
                        ((isRequester && !n.substituteSigned) ||
                          (isSubstitute && !n.requesterSigned));

                      const isWaitingEscalante =
                        n.status === PermutaStatus.PENDING &&
                        n.requesterSigned &&
                        n.substituteSigned;

                      return (
                        <div
                          key={n.id}
                          className={cn(
                            "p-3 relative group transition-all border-b last:border-b-0",
                            needsMySignature
                              ? "bg-amber-50/90 hover:bg-amber-100/90 border-amber-200"
                              : n.status === PermutaStatus.ACCEPTED
                                ? "bg-emerald-50/40 hover:bg-emerald-50/70 border-emerald-100"
                                : "hover:bg-slate-50 border-slate-100",
                          )}
                        >
                          {!needsMySignature && (
                            <button
                              onClick={() => dismissNotif(n.id!, n.status)}
                              className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-opacity opacity-0 group-hover:opacity-100 bg-white shadow-sm ring-1 ring-slate-900/5 rounded-full p-1 z-10 cursor-pointer"
                              title="Descartar notificação"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <div className="flex gap-3">
                            <div className="mt-0.5 shrink-0">
                              {needsMySignature && (
                                <AlertCircle className="w-5 h-5 text-amber-600 animate-pulse" />
                              )}
                              {!needsMySignature && isWaitingOther && (
                                <Clock className="w-5 h-5 text-amber-500" />
                              )}
                              {isWaitingEscalante && (
                                <Hourglass className="w-5 h-5 text-indigo-500" />
                              )}
                              {n.status === PermutaStatus.ACCEPTED && (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              )}
                              {n.status === PermutaStatus.REJECTED && (
                                <XCircle className="w-5 h-5 text-red-500" />
                              )}
                              {n.status === PermutaStatus.CANCELLED && (
                                <AlertCircle className="w-5 h-5 text-slate-400" />
                              )}
                              {n.status === PermutaStatus.SCHEDULED && (
                                <CalendarDays className="w-5 h-5 text-blue-500" />
                              )}
                            </div>
                            <div className="flex-1 pr-4">
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                {needsMySignature && (
                                  <span className="text-[9px] font-black uppercase tracking-wider bg-amber-600 text-white px-1.5 py-0.5 rounded shadow-xs">
                                    Assinatura Obrigatória
                                  </span>
                                )}
                                {!needsMySignature && isWaitingOther && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                                    Aguardando Outro Militar
                                  </span>
                                )}
                                {isWaitingEscalante && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                                    Na Mesa do Escalante
                                  </span>
                                )}
                                {n.status === PermutaStatus.ACCEPTED && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                    Deferida / Homologada
                                  </span>
                                )}
                                {n.status === PermutaStatus.REJECTED && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                                    Indeferida
                                  </span>
                                )}
                                {n.status === PermutaStatus.CANCELLED && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                    Cancelada
                                  </span>
                                )}
                              </div>

                              <div className="text-xs text-slate-700 leading-relaxed font-medium">
                                {needsMySignature ? (
                                  <>
                                    <strong>{otherName}</strong> solicitou permuta com você para o dia{" "}
                                    <strong>{formattedDate}</strong>. Sua assinatura é obrigatória para validar!
                                  </>
                                ) : isWaitingOther ? (
                                  <>
                                    Sua permuta com <strong>{otherName}</strong> para o dia{" "}
                                    <strong>{formattedDate}</strong> aguarda assinatura dele(a).
                                  </>
                                ) : isWaitingEscalante ? (
                                  <>
                                    Permuta com <strong>{otherName}</strong> para o dia{" "}
                                    <strong>{formattedDate}</strong> já possui ambas assinaturas e aguarda homologação do Escalante.
                                  </>
                                ) : n.status === PermutaStatus.ACCEPTED ? (
                                  <>
                                    Sua permuta com <strong>{otherName}</strong> para o dia{" "}
                                    <strong>{formattedDate}</strong> foi{" "}
                                    <span className="font-bold text-emerald-600">DEFERIDA</span> pelo Escalante.
                                  </>
                                ) : n.status === PermutaStatus.REJECTED ? (
                                  <>
                                    Sua permuta com <strong>{otherName}</strong> para o dia{" "}
                                    <strong>{formattedDate}</strong> foi{" "}
                                    <span className="font-bold text-red-600">INDEFERIDA</span> pelo Escalante.
                                  </>
                                ) : n.status === PermutaStatus.CANCELLED ? (
                                  <>
                                    A permuta com <strong>{otherName}</strong> para o dia{" "}
                                    <strong>{formattedDate}</strong> foi cancelada.
                                  </>
                                ) : (
                                  <>
                                    Permuta com <strong>{otherName}</strong> para o dia{" "}
                                    <strong>{formattedDate}</strong> ({n.status.toUpperCase()}).
                                  </>
                                )}
                              </div>

                              {needsMySignature && (
                                <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        const isReq = normalizeRg(n.requesterRg) === myCleanRg;
                                        const isSub = normalizeRg(n.substituteRg) === myCleanRg;
                                        await updateDoc(doc(db, "permutas", n.id!), {
                                          requesterSigned: isReq ? true : Boolean(n.requesterSigned),
                                          substituteSigned: isSub ? true : Boolean(n.substituteSigned),
                                          updatedAt: serverTimestamp(),
                                        });
                                        alert("✓ Permuta assinada com sucesso! A solicitação foi encaminhada para homologação do Escalante.");
                                      } catch (e: any) {
                                        alert("Erro ao assinar permuta: " + e.message);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-xs transition active:scale-95 cursor-pointer"
                                  >
                                    <FileCheck className="w-3.5 h-3.5" />
                                    Assinar Agora ✓
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsExpanded(false);
                                      navigate("/permutas");
                                    }}
                                    className="text-slate-500 hover:text-indigo-600 text-[10px] font-bold uppercase tracking-wider underline cursor-pointer"
                                  >
                                    Ver Detalhes →
                                  </button>
                                </div>
                              )}

                              <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">
                                {n.status === PermutaStatus.ACCEPTED || n.status === PermutaStatus.REJECTED
                                  ? `Decisão por: Escalante (${n.acceptedById || ""})`
                                  : `Ref: ${n.id?.slice(0, 8) || "PERMUTA"}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className={cn(
                      "text-sm border rounded p-3 opacity-90",
                      theme.card,
                      theme.text,
                    )}
                  >
                    Nenhuma notificação no momento.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
