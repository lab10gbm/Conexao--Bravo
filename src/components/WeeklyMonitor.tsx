import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  format,
  addDays,
  startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  cn,
  getAlaForDate,
  getThemeColors,
  calculateDeadline,
} from "../lib/utils";
import { UserProfile, PermutaRequest } from "../types";
import {
  Clock,
  Shield,
  ChevronDown,
  CheckCircle2,
  Lock,
  Info,
  ArrowRight,
  HelpCircle,
  X,
  AlertTriangle,
  Timer,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../lib/firebase";
import { doc, onSnapshot, collection } from "firebase/firestore";

interface WeeklyMonitorProps {
  user?: UserProfile;
  obmContext?: string;
  onRequestPermuta?: (date: Date) => void;
}

interface UserPermutaItem {
  id: string;
  role: "substitute" | "requester";
  status: string; // 'accepted' | 'pending' | 'scheduled' | 'rejected'
  partnerName?: string;
}

const ALA_THEME: Record<
  number,
  {
    name: string;
    accent: string;
    dot: string;
    text: string;
    badgeBg: string;
  }
> = {
  1: {
    name: "ALA 1",
    accent: "bg-emerald-500",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    badgeBg: "bg-emerald-50 border-emerald-200 text-emerald-800",
  },
  2: {
    name: "ALA 2",
    accent: "bg-rose-500",
    dot: "bg-rose-500",
    text: "text-rose-700",
    badgeBg: "bg-rose-50 border-rose-200 text-rose-800",
  },
  3: {
    name: "ALA 3",
    accent: "bg-sky-500",
    dot: "bg-sky-500",
    text: "text-sky-700",
    badgeBg: "bg-sky-50 border-sky-200 text-sky-800",
  },
  4: {
    name: "ALA 4",
    accent: "bg-amber-500",
    dot: "bg-amber-500",
    text: "text-amber-800",
    badgeBg: "bg-amber-50 border-amber-200 text-amber-800",
  },
};

const MILITARY_RANKS = new Set([
  "SOLDADO",
  "SD",
  "CABO",
  "CB",
  "3SGT",
  "3º SGT",
  "2SGT",
  "2º SGT",
  "1SGT",
  "1º SGT",
  "SUBTENENTE",
  "SUBTEN",
  "ST",
  "ASPIRANTE",
  "ASP",
  "2TEN",
  "2º TEN",
  "1TEN",
  "1º TEN",
  "CAPITÃO",
  "CAPITAO",
  "CAP",
  "MAJOR",
  "MAJ",
  "TEN CEL",
  "TC",
  "CORONEL",
  "CEL",
]);

function cleanDigits(val: string | number | undefined | null): string {
  if (!val) return "";
  const s = String(val).replace(/\D/g, "");
  return s.replace(/^0+/, "") || s;
}

function matchesMilitar(
  user: UserProfile | undefined,
  targetRg?: string | number | null,
  targetId?: string | null,
  targetName?: string | null,
): boolean {
  if (!user) return false;
  const userCleanRg = cleanDigits(user.rg);
  const targetCleanRg = cleanDigits(targetRg);

  // Direct RG numeric match
  if (userCleanRg && targetCleanRg && userCleanRg === targetCleanRg) {
    return true;
  }

  // targetId matching user's clean RG (e.g. 'rg_54444')
  if (userCleanRg && targetId) {
    const idCleanRg = cleanDigits(targetId);
    if (idCleanRg && idCleanRg === userCleanRg) return true;
  }

  // UID match
  if (user.uid && targetId && user.uid === targetId) {
    return true;
  }

  // War Name match (excluding standard rank prefixes)
  if (targetName) {
    const tUpper = targetName.trim().toUpperCase();
    if (user.warName) {
      const wUpper = user.warName.trim().toUpperCase();
      if (!MILITARY_RANKS.has(wUpper) && wUpper.length >= 3) {
        const regex = new RegExp("(?:^|\\s+)" + wUpper + "(?:$|\\s+)");
        if (regex.test(tUpper)) return true;
      }
    }
  }

  return false;
}

export function WeeklyMonitor({
  user,
  obmContext,
  onRequestPermuta,
}: WeeklyMonitorProps) {
  const [now, setNow] = useState(new Date());
  const [isExpanded, setIsExpanded] = useState(true);
  const [showRulesInfo, setShowRulesInfo] = useState(false);
  const [weekOffset, setWeekOffset] = useState<0 | 1>(0);
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);
  const [mobileViewMode, setMobileViewMode] = useState<"cards" | "list">("cards");
  const [selectedMobileDayIndex, setSelectedMobileDayIndex] = useState(0);

  const [grdDays, setGrdDays] = useState<Record<string, boolean>>({});
  const [expedienteDaysState, setExpedienteDaysState] = useState<
    Record<string, "SV" | "EXP" | null>
  >({});
  const [userPermutasMap, setUserPermutasMap] = useState<
    Record<string, UserPermutaItem>
  >({});

  const cardsContainerRef = useRef<HTMLDivElement | null>(null);

  const theme = getThemeColors(user?.ala);

  const goToWeek = (offset: 0 | 1) => {
    if (offset === weekOffset) return;
    setSlideDirection(offset > weekOffset ? 1 : -1);
    setWeekOffset(offset);
    setSelectedMobileDayIndex(0);
  };

  // Live real-time clock ticker
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for user's permutas in real-time
  useEffect(() => {
    if (!user?.rg && !user?.uid && !user?.name) return;

    const unsub = onSnapshot(
      collection(db, "permutas"),
      (snapshot) => {
        const map: Record<string, UserPermutaItem> = {};

        const priority: Record<string, number> = {
          accepted: 4,
          pending: 3,
          scheduled: 2,
          rejected: 1,
        };

        snapshot.docs.forEach((docSnap) => {
          const p = docSnap.data() as PermutaRequest;
          const statusClean = String(p.status || "").toLowerCase().trim();

          if (p.archived || statusClean === "cancelled") return;

          const isSub =
            matchesMilitar(user, p.substituteRg, p.substituteId, p.substituteName) ||
            matchesMilitar(user, p.acceptedById, p.acceptedById, p.acceptedByName);

          const isReq =
            matchesMilitar(user, p.requesterRg, p.requesterId, p.requesterName);

          if (!isSub && !isReq) return;

          const d = p.date;
          if (!d) return;

          const existing = map[d];
          const currentP = priority[statusClean] || 0;
          const existingP = existing ? priority[existing.status] || 0 : -1;

          if (!existing || currentP > existingP) {
            map[d] = {
              id: docSnap.id,
              role: isSub ? "substitute" : "requester",
              status: statusClean,
              partnerName: isSub
                ? p.requesterName || "Militar Solicitante"
                : p.substituteName || p.acceptedByName || "Militar Substituto",
            };
          }
        });

        setUserPermutasMap(map);
      },
      (error) => {
        console.error("Error fetching user permutas for weekly monitor:", error);
      },
    );

    return () => unsub();
  }, [user?.rg, user?.uid, user?.name, user?.warName]);

  // Listen for user's GRD and Expediente assignments covering both weeks
  useEffect(() => {
    if (!obmContext || !user?.rg) return;

    const obmId = obmContext.replace(/\//g, "_").replace(/\s/g, "_");
    const normalizedObm = obmContext.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

    const normalizeRg = (rg: string | number) => {
      const str = (rg || "").toString().trim().toUpperCase();
      const clean = str.replace(/[^A-Z0-9]/g, "");
      return clean.replace(/^0+/, "") || clean;
    };
    const userRgEscaped = normalizeRg(user.rg);

    const today = startOfDay(new Date());
    const windowDays = Array.from({ length: 16 }, (_, i) => addDays(today, i));
    const monthKeys = Array.from(
      new Set(windowDays.map((day) => format(day, "yyyy-MM"))),
    );

    const unsubscribesGrd = monthKeys.map((monthKey) => {
      const docRef = doc(db, "grd_configs", `${obmId}_${monthKey}`);
      return onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const days = snapshot.data().days || {};
          setGrdDays((prev) => {
            const updated = { ...prev };
            Object.keys(days).forEach((dateStr) => {
              const rgs = days[dateStr] || [];
              const normalizedGrdRgs = rgs.map((r: string) => normalizeRg(r));
              updated[dateStr] = normalizedGrdRgs.includes(userRgEscaped);
            });
            return updated;
          });
        }
      });
    });

    const unsubscribesExp = monthKeys.map((monthKey) => {
      const docRef = doc(db, `expediente_${normalizedObm}`, monthKey);
      return onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const selections = data.selections || {};
          const expDays = data.expedienteDays || {};

          setExpedienteDaysState((prev) => {
            const updated = { ...prev };

            const matchedKeys = Object.keys(selections).filter(
              (k) => normalizeRg(k) === userRgEscaped,
            );
            const matchedExpKeys = Object.keys(expDays).filter(
              (k) => normalizeRg(k) === userRgEscaped,
            );

            matchedKeys.forEach((key) => {
              (selections[key] || []).forEach((d: string) => {
                updated[d] = "SV";
              });
            });
            matchedExpKeys.forEach((key) => {
              (expDays[key] || []).forEach((d: string) => {
                updated[d] = "EXP";
              });
            });

            return updated;
          });
        }
      });
    });

    return () => {
      unsubscribesGrd.forEach((unsub) => unsub());
      unsubscribesExp.forEach((unsub) => unsub());
    };
  }, [obmContext, user?.rg]);

  const today = startOfDay(now);
  const startOfWeekDate = addDays(today, weekOffset * 7);

  const daysList = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(startOfWeekDate, i));
  }, [startOfWeekDate]);

  const rangeLabel = useMemo(() => {
    if (daysList.length < 7) return "";
    return `${format(daysList[0], "dd/MM")} a ${format(daysList[6], "dd/MM")}`;
  }, [daysList]);

  // Compute status for all 7 days of the selected week
  const daysData = useMemo(() => {
    const userAlaNum = user?.ala
      ? parseInt(String(user.ala).replace(/\D/g, ""), 10)
      : null;

    return daysList.map((day, idx) => {
      const ala = getAlaForDate(day);
      const alaConfig = ALA_THEME[ala] || ALA_THEME[1];
      const dateStr = format(day, "yyyy-MM-dd");
      const isGrd = Boolean(grdDays[dateStr]);
      const expedienteStatus = expedienteDaysState[dateStr] || null;
      const isToday = weekOffset === 0 && idx === 0;
      const isUserAla = userAlaNum === ala;
      const permuta = userPermutasMap[dateStr] || null;
      const hasActivePermuta = Boolean(permuta && (permuta.status === 'accepted' || permuta.status === 'pending' || permuta.status === 'scheduled'));

      const deadline = calculateDeadline(day);
      const diffMs = deadline.getTime() - now.getTime();
      const isExpired = diffMs <= 0;

      let days = 0;
      let hours = 0;
      let minutes = 0;
      let seconds = 0;
      let totalHours = 0;

      if (!isExpired) {
        const totalSecs = Math.max(0, Math.floor(diffMs / 1000));
        totalHours = Math.floor(totalSecs / 3600);
        days = Math.floor(totalHours / 24);
        hours = totalHours % 24;
        minutes = Math.floor((totalSecs % 3600) / 60);
        seconds = totalSecs % 60;
      }

      const isUrgent = !isExpired && totalHours < 24;

      // Operational duty status of user for this day
      let dutyBadge = {
        text: "Folga na Escala",
        subtext: "Folga regulamentar",
        badgeClass: "bg-slate-50 border border-slate-200 text-slate-500 font-medium",
        expiredClass: "bg-slate-100 text-slate-400 font-medium",
        icon: "calendar" as "shield" | "clock" | "check" | "alert" | "cross" | "calendar",
        tooltip: "Folga regulamentar na escala.",
        isDuty: false,
      };

      if (permuta) {
        if (permuta.role === "substitute") {
          // Militar cobrindo serviço de outro militar
          if (permuta.status === "accepted") {
            dutyBadge = {
              text: "SERVIÇO 24H · PERMUTA APROVADA",
              subtext: permuta.partnerName ? `Substituindo ${permuta.partnerName}` : "Permuta aprovada pelo Escalante",
              badgeClass: "bg-emerald-600 text-white font-black shadow-xs border border-emerald-500",
              expiredClass: "bg-emerald-100 border border-emerald-300 text-emerald-900 font-black",
              icon: "shield",
              tooltip: `Escalado neste serviço através de permuta deferida/aprovada pelo Escalante. Substituindo: ${permuta.partnerName || "militar"}.`,
              isDuty: true,
            };
          } else if (permuta.status === "pending" || permuta.status === "scheduled") {
            dutyBadge = {
              text: "SV 24H · PERMUTA PENDENTE",
              subtext: "Aguardando homologação do Escalante",
              badgeClass: "bg-amber-500 text-white font-black shadow-xs border border-amber-400",
              expiredClass: "bg-amber-100 border border-amber-300 text-amber-900 font-black",
              icon: "clock",
              tooltip: "Permuta assumida para este dia aguardando deferimento do Escalante ou assinaturas.",
              isDuty: true,
            };
          } else if (permuta.status === "rejected") {
            dutyBadge = {
              text: "PERMUTA INDEFERIDA (FOLGA)",
              subtext: "Indeferida pelo Escalante",
              badgeClass: "bg-rose-50 border border-rose-200 text-rose-700 font-bold",
              expiredClass: "bg-slate-200/80 border border-slate-300 text-slate-500 font-bold",
              icon: "cross",
              tooltip: "A solicitação de permuta para este dia foi indeferida pelo Escalante. Você permanece de folga.",
              isDuty: false,
            };
          }
        } else if (permuta.role === "requester") {
          // Militar solicitou para passar seu serviço
          if (permuta.status === "accepted") {
            dutyBadge = {
              text: "FOLGA · PERMUTA DEFERIDA",
              subtext: permuta.partnerName ? `Substituído por ${permuta.partnerName}` : "Substituído com sucesso",
              badgeClass: "bg-teal-600 text-white font-black shadow-xs border border-teal-500",
              expiredClass: "bg-teal-100 border border-teal-300 text-teal-900 font-black",
              icon: "check",
              tooltip: `Sua permuta foi deferida pelo Escalante. Você foi substituído com sucesso por ${permuta.partnerName || "militar"} e está de folga regulamentar.`,
              isDuty: false,
            };
          } else if (permuta.status === "pending" || permuta.status === "scheduled") {
            dutyBadge = {
              text: "SEU PLANTÃO (PERMUTA PEND.)",
              subtext: "Aguardando deferimento do Escalante",
              badgeClass: "bg-indigo-50 border border-indigo-200 text-indigo-800 font-black shadow-xs",
              expiredClass: "bg-slate-200/80 border border-slate-300 text-slate-700 font-black",
              icon: "shield",
              tooltip: "Você solicitou permuta para passar este plantão. Aguardando homologação do Escalante.",
              isDuty: true,
            };
          } else if (permuta.status === "rejected") {
            dutyBadge = {
              text: "SEU PLANTÃO (INDEFERIDA)",
              subtext: "Permuta indeferida · Serviço obrigatório",
              badgeClass: "bg-rose-100 border border-rose-300 text-rose-900 font-black shadow-xs",
              expiredClass: "bg-rose-100 border border-rose-300 text-rose-900 font-black",
              icon: "alert",
              tooltip: "Sua permuta foi indeferida pelo Escalante. O cumprimento do plantão é obrigatório.",
              isDuty: true,
            };
          }
        }
      } else {
        if (isUserAla) {
          dutyBadge = {
            text: "SEU PLANTÃO",
            subtext: "Plantão regular da sua Ala",
            badgeClass: "bg-indigo-50 border border-indigo-200 text-indigo-800 font-black shadow-xs",
            expiredClass: "bg-slate-200/80 border border-slate-300 text-slate-700 font-black",
            icon: "shield",
            tooltip: "Plantão regular da sua Ala de serviço.",
            isDuty: true,
          };
        } else if (expedienteStatus === "SV") {
          dutyBadge = {
            text: "SERVIÇO EXTRA (SV)",
            subtext: "Escalado em Serviço Voluntário",
            badgeClass: "bg-purple-50 border border-purple-200 text-purple-800 font-black shadow-xs",
            expiredClass: "bg-slate-200/80 border border-slate-300 text-slate-700 font-bold",
            icon: "calendar",
            tooltip: "Escalado em Serviço Extra (SV).",
            isDuty: true,
          };
        } else if (expedienteStatus === "EXP") {
          dutyBadge = {
            text: "EXPEDIENTE",
            subtext: "Escala administrativa",
            badgeClass: "bg-emerald-50 border border-emerald-200 text-emerald-800 font-black shadow-xs",
            expiredClass: "bg-slate-200/80 border border-slate-300 text-slate-700 font-bold",
            icon: "calendar",
            tooltip: "Escala de expediente administrativo.",
            isDuty: false,
          };
        } else if (isGrd) {
          dutyBadge = {
            text: "GRD ESCALADO",
            subtext: "Guarnição de Reforço",
            badgeClass: "bg-purple-50 border border-purple-200 text-purple-800 font-black shadow-xs",
            expiredClass: "bg-slate-200/80 border border-slate-300 text-slate-700 font-bold",
            icon: "shield",
            tooltip: "Escalado em Guarnição de Reforço / GRD.",
            isDuty: true,
          };
        }
      }

      return {
        day,
        idx,
        dateStr,
        ala,
        alaConfig,
        isGrd,
        expedienteStatus,
        isToday,
        isUserAla,
        permuta,
        hasActivePermuta,
        dutyBadge,
        deadline,
        isExpired,
        isUrgent,
        days,
        hours,
        minutes,
        seconds,
        totalHours,
      };
    });
  }, [daysList, now, grdDays, expedienteDaysState, user?.ala, userPermutasMap, weekOffset]);

  // Scroll to selected card on mobile when day indicator is clicked
  const scrollToMobileDay = (index: number) => {
    setSelectedMobileDayIndex(index);
    if (cardsContainerRef.current) {
      const cardWidth = 290;
      cardsContainerRef.current.scrollTo({
        left: index * cardWidth,
        behavior: "smooth",
      });
    }
  };

  // Metrics
  const openCount = daysData.filter((d) => !d.isExpired).length;
  const expiredCount = daysData.filter((d) => d.isExpired).length;
  const userDutyCount = daysData.filter((d) => d.dutyBadge.isDuty).length;

  return (
    <div
      id="weekly-monitor"
      className={cn(
        "mb-6 sm:mb-10 rounded-2xl overflow-hidden border shadow-sm transition-all duration-300 bg-white",
        theme.borderInner,
      )}
    >
      {/* ======================================================== */}
      {/* HEADER SECTION: RESPONSIVE ACROSS ALL SCREEN SIZES */}
      {/* ======================================================== */}
      <div
        className={cn(
          "w-full p-3.5 sm:p-5 border-b transition-colors flex flex-col gap-3",
          theme.borderInner,
          theme.panel,
        )}
      >
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div
              className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border shadow-xs shrink-0",
                theme.iconBg,
              )}
            >
              <Clock className={cn("w-5 h-5 sm:w-6 sm:h-6", theme.iconText)} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className={cn(
                    "text-sm sm:text-lg font-black uppercase tracking-tight truncate",
                    theme.title,
                  )}
                >
                  Monitor Semanal de Permutas
                </h3>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-800 border border-blue-200">
                  48h a 72h Úteis
                </span>
              </div>
              <p
                className={cn(
                  "text-[11px] sm:text-xs font-semibold mt-0.5 truncate flex items-center gap-1.5",
                  theme.textLight,
                )}
              >
                <span>Acompanhamento operacional de prazos regulamentares para solicitação e homologação</span>
              </p>
            </div>
          </div>

          {/* Action buttons (Regras & Collapse) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowRulesInfo(!showRulesInfo)}
              title="Consultar regras regulamentares de prazos"
              className={cn(
                "px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs",
                showRulesInfo
                  ? "bg-blue-600 text-white border-blue-700 shadow-xs"
                  : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200",
              )}
            >
              <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
              <span className="text-[11px] font-black">Regras</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Recolher Monitor" : "Expandir Monitor"}
              className="p-1.5 sm:p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs"
            >
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform duration-300",
                  isExpanded ? "rotate-180" : "",
                )}
              />
            </button>
          </div>
        </div>

        {/* Second Row: Week Navigation with Sliding Switcher + Metrics + Mobile View Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1 border-t border-slate-200/60">
          {/* Week Switcher with Sliding Indicator */}
          <div className="flex items-center gap-2">
            <div className="relative inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/90 shadow-inner w-full sm:w-auto">
              <button
                type="button"
                onClick={() => goToWeek(0)}
                className={cn(
                  "relative z-10 flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5",
                  weekOffset === 0
                    ? "text-blue-700 shadow-xs bg-white font-extrabold"
                    : "text-slate-600 hover:text-slate-900 font-semibold",
                )}
              >
                <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
                <span>Esta Semana</span>
              </button>

              <button
                type="button"
                onClick={() => goToWeek(1)}
                className={cn(
                  "relative z-10 flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5",
                  weekOffset === 1
                    ? "text-blue-700 shadow-xs bg-white font-extrabold"
                    : "text-slate-600 hover:text-slate-900 font-semibold",
                )}
              >
                <span>Próxima Semana</span>
                <ChevronRight className="w-3.5 h-3.5 text-blue-600 font-black" />
              </button>
            </div>

            {/* Date range pill */}
            <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs">
              {rangeLabel}
            </span>
          </div>

          {/* Right Metrics & Mobile View Mode Switcher */}
          <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
            {/* Quick Metrics Chips */}
            <div className="flex items-center gap-1.5">
              <span
                title="Dias com prazo aberto para permuta"
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-black bg-emerald-500/10 text-emerald-800 border border-emerald-200"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{openCount} abertos</span>
              </span>

              <span
                title="Dias com prazo regular esgotado"
                className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200"
              >
                <Lock className="w-2.5 h-2.5 text-slate-400" />
                <span>{expiredCount} encerrados</span>
              </span>

              {userDutyCount > 0 && (
                <span
                  title="Seus plantões ou permutas previstas neste período"
                  className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs"
                >
                  <Shield className="w-3 h-3 text-indigo-600" />
                  <span>{userDutyCount} seu(s) sv</span>
                </span>
              )}
            </div>

            {/* Mobile View Toggle: Cards vs List */}
            <div className="lg:hidden flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setMobileViewMode("cards")}
                title="Visualização em Cards"
                className={cn(
                  "p-1.5 rounded-md transition-all flex items-center gap-1 text-[10px] font-bold",
                  mobileViewMode === "cards"
                    ? "bg-white text-blue-700 shadow-2xs font-black"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileViewMode("list")}
                title="Visualização em Lista Compacta"
                className={cn(
                  "p-1.5 rounded-md transition-all flex items-center gap-1 text-[10px] font-bold",
                  mobileViewMode === "list"
                    ? "bg-white text-blue-700 shadow-2xs font-black"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Lista</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RULES EXPLANATORY DRAWER */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showRulesInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-slate-900 text-white border-b border-slate-800"
          >
            <div className="p-4 sm:p-6 max-w-5xl mx-auto">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-wider text-blue-300">
                      Entenda o Cálculo Regulamentar dos Prazos de Permuta
                    </h4>
                    <p className="text-xs text-slate-400">
                      Critérios oficiais do CBMERJ / Diretrizes de Prazos Operacionais
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRulesInfo(false)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 text-xs mt-4">
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <span className="font-black text-amber-400 uppercase tracking-wider block mb-1">
                    1. Antecedência de 72h Úteis
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    A permuta deve ser solicitada e homologada (assinada por ambos os militares) com no mínimo <strong>3 dias úteis</strong> de antecedência.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <span className="font-black text-blue-400 uppercase tracking-wider block mb-1">
                    2. Finais de Semana e Feriados
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    Sábados e Domingos não são dias úteis. Para serviços na <strong>Segunda ou Terça-feira</strong>, o prazo se encerra na <strong>Quarta-feira da semana anterior às 23:59</strong>.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                  <span className="font-black text-emerald-400 uppercase tracking-wider block mb-1">
                    3. Serviço na Quarta-feira
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    Para escalas na <strong>Quarta-feira</strong>, o prazo regular encerra pontualmente no <strong>Domingo anterior às 23:59</strong>.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2">
                <span>
                  * Fora do prazo regulamentar, a permuta é considerada extraordinária e depende de aprovação expressa do Escalante ou CHEFE DA SAD da OBM.
                </span>
                <button
                  type="button"
                  onClick={() => setShowRulesInfo(false)}
                  className="text-blue-400 hover:text-blue-300 font-bold underline"
                >
                  Entendi
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* MAIN CONTENT AREA WITH SMOOTH SLIDING TRANSITION */}
      {/* ======================================================== */}
      <motion.div
        initial={false}
        animate={{
          height: isExpanded ? "auto" : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        className="overflow-hidden"
      >
        <div className="p-3 sm:p-5">
          {/* Mobile Day Selector Tabs (only shown on mobile cards view) */}
          {mobileViewMode === "cards" && (
            <div className="lg:hidden mb-3">
              <div className="flex items-center justify-between text-[10.5px] text-slate-500 font-bold mb-1.5 px-0.5">
                <span>Dias da {weekOffset === 0 ? "Semana Atual" : "Próxima Semana"} ({rangeLabel}):</span>
                <span className="font-mono text-blue-600 font-black">
                  {selectedMobileDayIndex + 1} de 7
                </span>
              </div>

              <div className="grid grid-cols-7 gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                {daysData.map((d, index) => {
                  const isSelected = selectedMobileDayIndex === index;
                  const hasDuty = d.dutyBadge.isDuty;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => scrollToMobileDay(index)}
                      className={cn(
                        "py-1.5 px-0.5 rounded-lg flex flex-col items-center justify-center transition-all relative",
                        isSelected
                          ? "bg-white text-blue-700 shadow-2xs border border-blue-200 font-black"
                          : "text-slate-600 hover:bg-white/60 font-semibold",
                      )}
                    >
                      <span className="text-[9px] uppercase tracking-wider">
                        {format(d.day, "EEE", { locale: ptBR }).slice(0, 3)}
                      </span>
                      <span className="text-xs font-black leading-tight">
                        {format(d.day, "dd")}
                      </span>

                      {/* Flag dot for user duty/permuta */}
                      {hasDuty && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* SLIDING ANIMATION WRAPPER FOR BOTH VIEWS */}
          {/* ======================================================== */}
          <AnimatePresence mode="wait" custom={slideDirection}>
            <motion.div
              key={`${weekOffset}-${mobileViewMode}`}
              custom={slideDirection}
              variants={{
                enter: (dir: number) => ({
                  x: dir > 0 ? 100 : -100,
                  opacity: 0,
                  filter: "blur(2px)",
                }),
                center: {
                  x: 0,
                  opacity: 1,
                  filter: "blur(0px)",
                  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
                },
                exit: (dir: number) => ({
                  x: dir > 0 ? -100 : 100,
                  opacity: 0,
                  filter: "blur(2px)",
                  transition: { duration: 0.18, ease: "easeIn" },
                }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full"
            >
              {/* ======================================================== */}
              {/* MOBILE VIEW MODE: COMPACT LIST VIEW */}
              {/* ======================================================== */}
              {mobileViewMode === "list" && (
                <div className="lg:hidden flex flex-col gap-2.5">
                  {daysData.map((item) => {
                    const {
                      day,
                      idx,
                      alaConfig,
                      isToday,
                      dutyBadge,
                      permuta,
                      hasActivePermuta,
                      deadline,
                      isExpired,
                      isUrgent,
                      days,
                      hours,
                      minutes,
                      seconds,
                    } = item;

                    const deadlineFormatted = format(
                      deadline,
                      "dd/MM 'às' HH:mm",
                      { locale: ptBR },
                    );

                    let countdownText = "";
                    if (!isExpired) {
                      if (days > 0) countdownText = `${days}d ${hours}h restantes`;
                      else if (hours > 0) countdownText = `${hours}h ${minutes}m restantes`;
                      else countdownText = `${minutes}m ${seconds}s restantes`;
                    }

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (!isExpired && !hasActivePermuta) onRequestPermuta?.(day);
                        }}
                        className={cn(
                          "p-3 rounded-xl border transition-all bg-white shadow-2xs flex flex-col gap-2 relative overflow-hidden",
                          isExpired
                            ? "bg-slate-50/70 border-slate-200 text-slate-500"
                            : hasActivePermuta
                              ? "border-slate-200 bg-white"
                              : "border-slate-200 hover:border-blue-400 active:scale-[0.99] cursor-pointer",
                          isToday ? "ring-2 ring-blue-500 ring-offset-1" : "",
                        )}
                      >
                        {/* Side Ala Accent Stripe */}
                        <div
                          className={cn(
                            "absolute top-0 left-0 bottom-0 w-1.5",
                            isExpired ? "opacity-40" : "",
                            alaConfig.accent,
                          )}
                        />

                        {/* Top row: Date, Ala, Status */}
                        <div className="flex items-center justify-between pl-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-black text-slate-900">
                              {format(day, "dd")}
                            </span>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black uppercase text-slate-700 leading-tight">
                                {format(day, "EEEE", { locale: ptBR })}
                              </span>
                              <span className="text-[9.5px] font-semibold text-slate-400 uppercase">
                                {format(day, "MMM/yyyy", { locale: ptBR })}
                              </span>
                            </div>

                            {isToday && (
                              <span className="bg-blue-600 text-white text-[8.5px] font-black px-1.5 py-0.5 rounded shadow-2xs">
                                HOJE
                              </span>
                            )}
                          </div>

                          {/* Ala Badge */}
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                            <span className={cn("w-2 h-2 rounded-full", alaConfig.dot)} />
                            <span className={cn("text-[10px] font-black", alaConfig.text)}>
                              {alaConfig.name}
                            </span>
                          </div>
                        </div>

                        {/* Middle row: Duty status (PROMINENT, NO TRUNCATION) */}
                        <div className="pl-1">
                          <div
                            className={cn(
                              "p-2 rounded-lg text-[11px] font-black flex items-center justify-between gap-2",
                              isExpired ? dutyBadge.expiredClass : dutyBadge.badgeClass,
                            )}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              {dutyBadge.icon === "shield" && <Shield className="w-4 h-4 shrink-0" />}
                              {dutyBadge.icon === "clock" && <Clock className="w-4 h-4 shrink-0" />}
                              {dutyBadge.icon === "check" && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                              {dutyBadge.icon === "alert" && <AlertTriangle className="w-4 h-4 shrink-0" />}
                              {dutyBadge.icon === "cross" && <X className="w-4 h-4 shrink-0" />}
                              <div className="flex flex-col min-w-0">
                                <span className="leading-tight">{dutyBadge.text}</span>
                                {dutyBadge.subtext && (
                                  <span className="text-[9px] font-semibold opacity-90 truncate">
                                    {dutyBadge.subtext}
                                  </span>
                                )}
                              </div>
                            </div>

                            {dutyBadge.isDuty && (
                              <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-black/20 font-black shrink-0">
                                Plantão
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom row: Deadline + Action button */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 pl-1 text-[10px]">
                          {!isExpired ? (
                            <div className="flex items-center gap-1.5 font-mono text-slate-700 font-bold">
                              <Timer className={cn("w-3.5 h-3.5", isUrgent ? "text-amber-600" : "text-blue-600")} />
                              <span>{countdownText}</span>
                              <span className="text-[9px] text-slate-400 font-normal">
                                (até {deadlineFormatted})
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                              <Lock className="w-3.5 h-3.5" />
                              <span>Prazo esgotado em {deadlineFormatted}</span>
                            </div>
                          )}

                          {hasActivePermuta ? (
                            <span className={cn(
                              "px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase flex items-center gap-1 shadow-2xs border",
                              permuta?.status === 'accepted'
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            )}>
                              {permuta?.status === 'accepted' ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>Deferida</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>Pendente</span>
                                </>
                              )}
                            </span>
                          ) : !isExpired ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRequestPermuta?.(day);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-black text-[10px] uppercase flex items-center gap-1 shadow-2xs hover:bg-blue-700 active:bg-blue-800"
                            >
                              <span>Solicitar</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-slate-100 text-slate-400">
                              Indisponível
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ======================================================== */}
              {/* CARDS VIEW: MOBILE TOUCH CAROUSEL + DESKTOP 7-COL GRID */}
              {/* ======================================================== */}
              {mobileViewMode === "cards" && (
                <div
                  ref={cardsContainerRef}
                  className="w-full flex lg:grid lg:grid-cols-7 gap-2.5 sm:gap-3 overflow-x-auto lg:overflow-visible snap-x snap-mandatory custom-scrollbar pb-2"
                >
                  {daysData.map((item) => {
                    const {
                      day,
                      idx,
                      alaConfig,
                      isToday,
                      dutyBadge,
                      permuta,
                      hasActivePermuta,
                      deadline,
                      isExpired,
                      isUrgent,
                      days,
                      hours,
                      minutes,
                      seconds,
                    } = item;

                    const deadlineFormatted = format(
                      deadline,
                      "EEE, dd/MM 'às' HH:mm",
                      { locale: ptBR },
                    );

                    let countdownText = "";
                    if (!isExpired) {
                      if (days > 0) {
                        countdownText = `${days}d ${hours.toString().padStart(2, "0")}h restantes`;
                      } else if (hours > 0) {
                        countdownText = `${hours}h ${minutes.toString().padStart(2, "0")}m restantes`;
                      } else {
                        countdownText = `${minutes}m ${seconds.toString().padStart(2, "0")}s restantes`;
                      }
                    }

                    // ==========================================
                    // CARD: DENTRO DO PRAZO (OPEN)
                    // ==========================================
                    if (!isExpired) {
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (!hasActivePermuta) onRequestPermuta?.(day);
                          }}
                          title={
                            hasActivePermuta
                              ? permuta?.status === "accepted"
                                ? "Permuta já deferida para esta data"
                                : "Permuta em andamento para esta data"
                              : `Solicitar permuta para ${format(day, "dd/MM/yyyy")}`
                          }
                          className={cn(
                            // Mobile: comfortable width with no truncation; Desktop: auto column
                            "w-[270px] xs:w-[290px] sm:w-[310px] lg:w-auto shrink-0 lg:shrink snap-start",
                            "rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden relative group bg-white shadow-xs",
                            hasActivePermuta
                              ? "cursor-default border-slate-200"
                              : "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
                            !hasActivePermuta && isUrgent
                              ? "border-amber-300 ring-2 ring-amber-400/20"
                              : !hasActivePermuta
                                ? "border-slate-200 hover:border-blue-400"
                                : "",
                            isToday ? "ring-2 ring-blue-500/80 ring-offset-2" : "",
                          )}
                        >
                          {/* Top colored Ala accent bar */}
                          <div className={cn("h-2 w-full", alaConfig.accent)} />

                          {/* Card Upper Info: Day, Date, Ala */}
                          <div className="p-3 sm:p-3.5 pb-2.5 flex-1 flex flex-col justify-between">
                            <div>
                              {/* Day of Week & Today Badge */}
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 truncate">
                                  {format(day, "EEEE", { locale: ptBR })}
                                </span>
                                {isToday && (
                                  <span className="bg-blue-600 text-white text-[8.5px] sm:text-[9px] font-black px-1.5 py-0.5 rounded tracking-wider shadow-2xs shrink-0">
                                    HOJE
                                  </span>
                                )}
                              </div>

                              {/* Big Date Number & Month */}
                              <div className="flex items-baseline gap-1.5 my-0.5">
                                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
                                  {format(day, "dd")}
                                </span>
                                <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">
                                  {format(day, "MMM", { locale: ptBR })}
                                </span>
                              </div>

                              {/* Ala on duty badge */}
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "w-2 h-2 rounded-full shrink-0",
                                    alaConfig.dot,
                                  )}
                                />
                                <span
                                  className={cn(
                                    "text-[10.5px] sm:text-[11px] font-black uppercase tracking-wide truncate",
                                    alaConfig.text,
                                  )}
                                >
                                  {alaConfig.name}
                                </span>
                              </div>
                            </div>

                            {/* Personal Military Duty Indicator (FULL DISPLAY, NO TRUNCATION) */}
                            <div className="mt-2.5">
                              <div
                                title={dutyBadge.tooltip}
                                className={cn(
                                  "py-1 px-2 rounded-xl text-[9.5px] sm:text-[10px] flex flex-col justify-center gap-0.5 transition-all text-center",
                                  dutyBadge.badgeClass,
                                )}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  {dutyBadge.icon === "shield" && (
                                    <Shield className="w-3.5 h-3.5 shrink-0" />
                                  )}
                                  {dutyBadge.icon === "clock" && (
                                    <Clock className="w-3.5 h-3.5 shrink-0" />
                                  )}
                                  {dutyBadge.icon === "check" && (
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  )}
                                  {dutyBadge.icon === "alert" && (
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  )}
                                  {dutyBadge.icon === "cross" && (
                                    <X className="w-3.5 h-3.5 shrink-0" />
                                  )}
                                  <span className="font-black leading-tight">
                                    {dutyBadge.text}
                                  </span>
                                </div>
                                {dutyBadge.subtext && (
                                  <span className="text-[8.5px] font-semibold opacity-90 truncate">
                                    {dutyBadge.subtext}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Middle Deadline Box */}
                          <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 bg-slate-50/90 border-t border-b border-slate-100 flex flex-col gap-1">
                            {/* Urgency Pill */}
                            <div className="flex items-center justify-between">
                              {isUrgent ? (
                                <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-1.5 sm:px-2 py-0.5 rounded-full animate-pulse">
                                  <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>ÚLTIMAS HORAS</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 sm:px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>PRAZO ABERTO</span>
                                </span>
                              )}
                            </div>

                            {/* Deadline Date */}
                            <div className="text-[9px] sm:text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                              Limite:{" "}
                              <span className="font-bold text-slate-800">
                                {deadlineFormatted}
                              </span>
                            </div>

                            {/* Live Ticking Countdown */}
                            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] sm:text-xs font-mono font-black text-slate-900 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-2xs">
                              <Timer
                                className={cn(
                                  "w-3.5 h-3.5 shrink-0",
                                  isUrgent ? "text-amber-600" : "text-blue-600",
                                )}
                              />
                              <span className="truncate">{countdownText}</span>
                            </div>
                          </div>

                          {/* Card Action Footer */}
                          <div className="p-2.5 sm:p-3 bg-white">
                            {hasActivePermuta ? (
                              <div className={cn(
                                "w-full py-2 px-2.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-2xs border",
                                permuta?.status === "accepted"
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                  : "bg-amber-50 border-amber-200 text-amber-800"
                              )}>
                                {permuta?.status === "accepted" ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>Permuta Deferida</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                    <span>Permuta em Andamento</span>
                                  </>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRequestPermuta?.(day);
                                }}
                                className="w-full py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-blue-600 active:bg-blue-700 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs group-hover:bg-blue-600"
                              >
                                <span>Solicitar Permuta</span>
                                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // ==========================================
                    // CARD: PRAZO ENCERRADO (EXPIRED)
                    // ==========================================
                    return (
                      <div
                        key={idx}
                        title={
                          hasActivePermuta
                            ? permuta?.status === "accepted"
                              ? "Permuta já deferida para esta data"
                              : "Permuta em andamento para esta data"
                            : `Prazo regulamentar de permuta esgotado para ${format(day, "dd/MM/yyyy")}`
                        }
                        className={cn(
                          // Mobile: comfortable width with no truncation; Desktop: auto column
                          "w-[270px] xs:w-[290px] sm:w-[310px] lg:w-auto shrink-0 lg:shrink snap-start",
                          "rounded-2xl border border-slate-200 bg-slate-50/70 text-slate-500 transition-all duration-300 flex flex-col justify-between overflow-hidden relative",
                          isToday ? "ring-2 ring-slate-400 ring-offset-2" : "",
                        )}
                      >
                        {/* Top muted Ala accent bar */}
                        <div className={cn("h-2 w-full opacity-35", alaConfig.accent)} />

                        {/* Card Upper Info: Day, Date, Ala */}
                        <div className="p-3 sm:p-3.5 pb-2.5 flex-1 flex flex-col justify-between">
                          <div>
                            {/* Day of Week & Today Badge */}
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
                                {format(day, "EEEE", { locale: ptBR })}
                              </span>
                              {isToday && (
                                <span className="bg-slate-400 text-white text-[8.5px] sm:text-[9px] font-black px-1.5 py-0.5 rounded tracking-wider shadow-2xs shrink-0">
                                  HOJE
                                </span>
                              )}
                            </div>

                            {/* Big Date Number & Month */}
                            <div className="flex items-baseline gap-1.5 my-0.5">
                              <span className="text-2xl sm:text-3xl font-black text-slate-400 tracking-tight leading-none">
                                {format(day, "dd")}
                              </span>
                              <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
                                {format(day, "MMM", { locale: ptBR })}
                              </span>
                            </div>

                            {/* Ala on duty */}
                            <div className="mt-1.5 flex items-center gap-1.5 opacity-60">
                              <span
                                className={cn(
                                  "w-2 h-2 rounded-full shrink-0",
                                  alaConfig.dot,
                                )}
                              />
                              <span className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wide text-slate-600 truncate">
                                {alaConfig.name}
                              </span>
                            </div>
                          </div>

                          {/* Personal Military Duty Indicator (Muted) */}
                          <div className="mt-2.5">
                            <div
                              title={dutyBadge.tooltip}
                              className={cn(
                                "py-1 px-2 rounded-xl text-[9.5px] sm:text-[10px] flex flex-col justify-center gap-0.5 transition-all text-center",
                                dutyBadge.expiredClass,
                              )}
                            >
                              <div className="flex items-center justify-center gap-1">
                                {dutyBadge.icon === "shield" && (
                                  <Shield className="w-3.5 h-3.5 shrink-0 opacity-80" />
                                )}
                                {dutyBadge.icon === "clock" && (
                                  <Clock className="w-3.5 h-3.5 shrink-0 opacity-80" />
                                )}
                                {dutyBadge.icon === "check" && (
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 opacity-80" />
                                )}
                                {dutyBadge.icon === "alert" && (
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 opacity-80" />
                                )}
                                {dutyBadge.icon === "cross" && (
                                  <X className="w-3.5 h-3.5 shrink-0 opacity-80" />
                                )}
                                <span className="font-bold leading-tight">
                                  {dutyBadge.text}
                                </span>
                              </div>
                              {dutyBadge.subtext && (
                                <span className="text-[8.5px] font-medium opacity-80 truncate">
                                  {dutyBadge.subtext}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Middle Deadline Box (Expired) */}
                        <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 bg-slate-100/80 border-t border-b border-slate-200/80 flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">
                              <Lock className="w-2.5 h-2.5 text-slate-500" />
                              <span>PRAZO ENCERRADO</span>
                            </span>
                          </div>

                          <div className="text-[9px] sm:text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                            Encerrou:{" "}
                            <span className="text-slate-500 line-through">
                              {deadlineFormatted}
                            </span>
                          </div>

                          <div className="mt-0.5 flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-slate-400 bg-slate-200/60 rounded-lg px-2 py-1">
                            {hasActivePermuta ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                                <span className="truncate">{permuta?.status === "accepted" ? "Permuta Homologada" : "Permuta Solicitada"}</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                <span className="truncate">72h úteis esgotadas</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Card Action Footer */}
                        <div className="p-2.5 sm:p-3 bg-slate-50/70">
                          {hasActivePermuta ? (
                            <div className={cn(
                              "w-full py-2 px-2.5 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-2xs border",
                              permuta?.status === "accepted"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : "bg-amber-50 border-amber-200 text-amber-800"
                            )}>
                              {permuta?.status === "accepted" ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>Permuta Deferida</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>Permuta em Andamento</span>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="w-full py-2 px-2.5 rounded-xl bg-slate-200/70 text-slate-400 text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-not-allowed">
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                              <span>Indisponível</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* ======================================================== */}
          {/* FOOTER LEGEND & NOTE */}
          {/* ======================================================== */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px] text-slate-400">
            <div className="flex items-center flex-wrap gap-3">
              <span className="font-bold text-slate-500">Alas de Serviço:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-600 font-bold">ALA 1</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-slate-600 font-bold">ALA 2</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span className="text-slate-600 font-bold">ALA 3</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-slate-600 font-bold">ALA 4</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowRulesInfo(!showRulesInfo)}
              className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 hover:underline"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Como são calculadas as 48h/72h úteis?</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
