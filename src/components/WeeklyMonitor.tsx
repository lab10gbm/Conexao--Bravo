import React, { useState, useEffect } from "react";
import {
  format,
  addDays,
  startOfDay,
  differenceInHours,
  differenceInMinutes,
  subDays,
  getDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  cn,
  getAlaForDate,
  getAlaName,
  getAlaCardColor,
  getThemeColors,
  calculateDeadline,
} from "../lib/utils";
import { UserProfile } from "../types";
import { Clock, AlertTriangle, Shield } from "lucide-react";
import { motion } from "motion/react";
import { db } from "../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

interface WeeklyMonitorProps {
  user?: UserProfile;
  obmContext?: string;
  onRequestPermuta?: (date: Date) => void;
}

export function WeeklyMonitor({
  user,
  obmContext,
  onRequestPermuta,
}: WeeklyMonitorProps) {
  const [now, setNow] = useState(new Date());
  const [isExpanded, setIsExpanded] = useState(true);
  const [grdDays, setGrdDays] = useState<Record<string, boolean>>({});

  const theme = getThemeColors(user?.ala);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!obmContext || !user?.rg) return;

    const obmId = obmContext.replace(/\//g, "_").replace(/\s/g, "_");
    const normalizeRg = (rg: string | number) => {
      const str = (rg || "").toString().trim().toUpperCase();
      const clean = str.replace(/[^A-Z0-9]/g, "");
      return clean.replace(/^0+/, "") || clean;
    };
    const userRgEscaped = normalizeRg(user.rg);

    const today = startOfDay(new Date());
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(today, i));
    const monthKeys = Array.from(
      new Set(weekDays.map((day) => format(day, "yyyy-MM"))),
    );

    const unsubscribes = monthKeys.map((monthKey) => {
      const docRef = doc(db, "grd_configs", `${obmId}_${monthKey}`);
      return onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const days = snapshot.data().days || {};
          setGrdDays((prev) => {
            const updated = { ...prev };
            Object.keys(days).forEach((dateStr) => {
              const rgs = days[dateStr] || [];
              const normalizedGrdRgs = rgs.map((r: string) => normalizeRg(r));
              if (normalizedGrdRgs.includes(userRgEscaped)) {
                updated[dateStr] = true;
              } else {
                updated[dateStr] = false;
              }
            });
            return updated;
          });
        }
      });
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [obmContext, user?.rg]);

  const today = startOfDay(now);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  const getStatus = (deadline: Date) => {
    const isExpired = now > deadline;
    if (isExpired) {
      return {
        expired: true,
        text: "ENCERRADO",
        bgClass: "bg-red-100",
        textClass: "text-red-900",
        badgeClass: "bg-red-200 text-red-800 border border-red-300",
      };
    }

    const diffHours = Math.max(0, differenceInHours(deadline, now));
    const days = Math.floor(diffHours / 24);
    const hours = diffHours % 24;
    const minutes = Math.max(0, differenceInMinutes(deadline, now) % 60);

    const formattedHours = hours.toString().padStart(2, "0");
    const formattedMinutes = minutes.toString().padStart(2, "0");

    return {
      expired: false,
      text: `${days}d e ${formattedHours}:${formattedMinutes}`,
      bgClass: "bg-amber-100",
      textClass: "text-amber-900",
      badgeClass: "bg-amber-200 text-amber-900 border border-amber-300",
    };
  };

  return (
    <div
      id="weekly-monitor"
      className={cn(
        "mb-6 sm:mb-12 border rounded-xl overflow-hidden shadow-sm transition-colors duration-500",
        theme.panel,
      )}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between p-4 sm:p-6 transition-colors border-b",
          isExpanded ? theme.borderInner : "border-transparent",
          theme.panel,
        )}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={cn("p-2 sm:p-3 rounded-lg border", theme.iconBg)}>
            <Clock className={cn("w-5 h-5 sm:w-6 h-6", theme.iconText)} />
          </div>
          <div className="text-left">
            <h3
              className={cn(
                "text-base sm:text-lg font-black uppercase tracking-tight",
                theme.title,
              )}
            >
              Monitor Semanal
            </h3>
            <p
              className={cn(
                "text-[9px] sm:text-xs font-bold uppercase tracking-widest mt-0.5 sm:mt-1",
                theme.textLight,
              )}
            >
              Prazos para permuta (48h a 72h Úteis)
            </p>
          </div>
        </div>
        <div
          className={cn(
            "p-2 rounded-full transition-colors",
            isExpanded ? theme.card : "bg-transparent",
            theme.text,
          )}
        >
          <svg
            className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      <motion.div
        initial={false}
        animate={{
          height: isExpanded ? "auto" : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        className="overflow-hidden"
      >
        <div className="p-3 sm:p-6 opacity-90">
          <div className="sm:hidden mb-2 flex items-center gap-1.5 px-2 py-1 bg-slate-50/50 rounded-lg border border-slate-200/50">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
              Deslize para ver a semana →
            </span>
          </div>
          <div className="w-full pb-2">
            <div className="flex w-full overflow-x-auto sm:overflow-visible gap-1.5 sm:gap-2 pb-2 custom-scrollbar">
              {weekDays.map((day, i) => {
                const ala = getAlaForDate(day);
                const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                const isToday = i === 0;
                const dateStr = format(day, "yyyy-MM-dd");
                const isGrd = grdDays[dateStr];

                const deadline = calculateDeadline(day);
                const status = getStatus(deadline);
                const isExpired = status.expired;

                if (isExpired) {
                  return (
                    <div
                      key={i}
                      title="Prazo encerrado"
                      className={cn(
                        "border rounded-xl shadow-sm flex flex-col items-center justify-center p-2 w-[52px] sm:w-[64px] shrink-0 relative cursor-not-allowed",
                        theme.borderInner,
                        theme.panel,
                      )}
                    >
                      <span className="text-base sm:text-lg font-black leading-none mt-1 opacity-50">
                        {format(day, "dd")}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-widest mt-1 opacity-40">
                        {format(day, "MMM", { locale: ptBR })}
                      </span>
                      <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full shadow-sm ring-1 ring-slate-200 z-10 w-4 h-4 flex items-center justify-center opacity-80">
                        <AlertTriangle className="w-2.5 h-2.5 text-red-500" />
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={i}
                    onClick={() => onRequestPermuta?.(day)}
                    title="Clique para solicitar permuta"
                    className={cn(
                      "border rounded-xl shadow-sm flex flex-col items-center p-1.5 sm:p-2 flex-1 min-w-[70px] sm:min-w-[80px] shrink-0 relative cursor-pointer hover:opacity-90 transition-opacity",
                      getAlaCardColor(ala),
                      isToday ? "ring-2 ring-blue-500 ring-offset-1" : "",
                    )}
                  >
                    {isGrd && (
                      <div className="absolute inset-0 overflow-hidden rounded-xl">
                        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                          <Shield className="w-full h-full fill-indigo-500 text-indigo-500" />
                        </div>
                      </div>
                    )}

                    <span
                      className={cn(
                        "text-lg sm:text-xl font-black leading-none mt-1 z-10",
                        isGrd ? "text-indigo-900" : "text-slate-900",
                      )}
                    >
                      {format(day, "dd")}
                    </span>
                    <span
                      className={cn(
                        "text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-1 z-10 opacity-70",
                        isGrd ? "text-indigo-900" : "text-slate-900",
                      )}
                    >
                      {format(day, "MMM", { locale: ptBR })}
                    </span>

                    <div
                      className={cn(
                        "mt-2 text-[9px] sm:text-[10px] font-black w-full text-center rounded p-1 leading-none shadow-sm flex flex-col items-center gap-0.5 z-10",
                        status.bgClass,
                        status.textClass,
                      )}
                    >
                      <span className="opacity-70 text-[7px] sm:text-[8px]">
                        {format(deadline, "EEE HH:mm", {
                          locale: ptBR,
                        }).toUpperCase()}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5 shrink-0" />
                        <span className="whitespace-nowrap truncate">
                          {status.text}
                        </span>
                      </div>
                    </div>

                    {isGrd && (
                      <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full shadow-sm ring-1 ring-slate-200 z-10 w-5 h-5 flex items-center justify-center">
                        <Shield className="w-3 h-3 text-indigo-500" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
