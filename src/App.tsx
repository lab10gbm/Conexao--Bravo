/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, signOut, signInAnonymously } from "firebase/auth";
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import { useAppConfig } from "./contexts/ConfigContext";
import { useMilitars } from "./contexts/MilitarContext";
import { UserProfile } from "./types";
import { Login } from "./components/Login";
import { Header } from "./components/Header";
import { WeeklyMonitor } from "./components/WeeklyMonitor";
import { AgendaPessoal } from "./components/AgendaPessoal";
import { PermutaBoard } from "./components/PermutaBoard";
import { RequestPermuta } from "./components/RequestPermuta";
import { CalendarHighlights } from "./components/CalendarHighlights";
import { AdminPanel } from "./components/AdminPanel";
import { ExpedienteScheduler } from "./components/ExpedienteScheduler";
import {
  LogOut,
  User,
  Menu,
  X,
  Send,
  ShieldCheck,
  Users,
  ArrowLeft,
  Loader2,
  BellRing,
  Home,
  Calendar,
  ArrowLeftRight,
  Utensils,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  setGlobalAlaConfig,
  getAlaForDate,
  GLOBAL_REF_YEAR,
} from "./lib/utils";
import { HomePortal } from "./components/HomePortal";
import { PlatformLogo } from "./components/PlatformLogo";
import { RankInsignia } from "./components/RankInsignia";

import { OBM_HIERARCHY } from "./constants";

// Lazy load heavy route components
const EfetivoPanel = React.lazy(() =>
  import("./components/EfetivoPanel").then((m) => ({
    default: m.EfetivoPanel,
  })),
);
const OfficerDashboard = React.lazy(() =>
  import("./components/OfficerDashboard").then((m) => ({
    default: m.OfficerDashboard,
  })),
);
const PermutaModule = React.lazy(() =>
  import("./components/PermutaModule").then((m) => ({
    default: m.PermutaModule,
  })),
);
const VacationModule = React.lazy(() =>
  import("./components/VacationModule").then((m) => ({
    default: m.VacationModule,
  })),
);
const ProfileUpdate = React.lazy(() =>
  import("./components/ProfileUpdate").then((m) => ({
    default: m.ProfileUpdate,
  })),
);
const PatrimonyModule = React.lazy(() =>
  import("./components/PatrimonyModule").then((m) => ({
    default: m.PatrimonyModule,
  })),
);
const EscalanteDashboard = React.lazy(() =>
  import("./components/EscalanteDashboard").then((m) => ({
    default: m.EscalanteDashboard,
  })),
);
const MedidasModule = React.lazy(() =>
  import("./components/MedidasModule").then((m) => ({
    default: m.MedidasModule,
  })),
);
const SopMedidasModule = React.lazy(() =>
  import("./components/SopMedidasModule").then((m) => ({
    default: m.SopMedidasModule,
  })),
);
const SopConfigModule = React.lazy(() =>
  import("./components/SopConfigModule").then((m) => ({
    default: m.SopConfigModule,
  })),
);
const GrdModule = React.lazy(() =>
  import("./components/GrdModule").then((m) => ({ default: m.GrdModule })),
);
const TerceirizadosModule = React.lazy(() =>
  import("./components/TerceirizadosModule").then((m) => ({
    default: m.TerceirizadosModule,
  })),
);
const OfficerGrdModule = React.lazy(() =>
  import("./components/OfficerGrdModule").then((m) => ({
    default: m.OfficerGrdModule,
  })),
);
const OfficerConfigModule = React.lazy(() =>
  import("./components/OfficerConfigModule").then((m) => ({
    default: m.OfficerConfigModule,
  })),
);
const PublicCargaViewer = React.lazy(() =>
  import("./components/PublicCargaViewer").then((m) => ({
    default: m.PublicCargaViewer,
  })),
);
const RefeitorioModule = React.lazy(() =>
  import("./components/RefeitorioModule").then((m) => ({
    default: m.RefeitorioModule,
  })),
);
const AprovisionamentoModule = React.lazy(() =>
  import("./components/AprovisionamentoModule").then((m) => ({
    default: m.AprovisionamentoModule,
  })),
);
const PublicCardapioViewer = React.lazy(() =>
  import("./components/PublicCardapioViewer").then((m) => ({
    default: m.PublicCardapioViewer,
  })),
);
const TransladoModule = React.lazy(() =>
  import("./components/TransladoModule").then((m) => ({
    default: m.TransladoModule,
  })),
);
const ComunicanteDashboard = React.lazy(() =>
  import("./components/ComunicanteDashboard").then((m) => ({
    default: m.ComunicanteDashboard,
  })),
);

import { usePresence } from "./hooks/usePresence";
import { useViaturaAlerts } from "./hooks/useViaturaAlerts";

export default function App() {
  const [user, setUser] = useState<any>(null);

  // Initialize profile with immediate access to local storage
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const stored = localStorage.getItem("militar_profile");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Loading defaults to true only if we have no profile in memory
  const [loading, setLoading] = useState(() => {
    return !localStorage.getItem("militar_profile");
  });

  const [authReady, setAuthReady] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPermutaButtonExpanded, setIsPermutaButtonExpanded] = useState(true);

  // Controlled modal state
  const [isPermutaModalOpen, setIsPermutaModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  useEffect(() => {
    if (currentPath.includes("permutas")) {
      setIsPermutaButtonExpanded(true);
      const timer = setTimeout(() => {
        setIsPermutaButtonExpanded(false);
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [currentPath]);
  // State for view transition
  const [selectedMonthView, setSelectedMonthView] = useState<number | null>(
    null,
  );
  const [adminModeActive, setAdminModeActive] = useState(false);
  const [escalanteModeActive, setEscalanteModeActive] = useState(false);
  const [simulatedVersion, setSimulatedVersion] = useState<string>("");
  const [moderatorMode, setModeratorMode] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Only hide on scroll down, show on scroll up. Keep visible at top.
      if (currentScrollY < 50) {
        setIsHeaderVisible(true);
      } else if (currentScrollY > lastScrollY) {
        setIsHeaderVisible(false);
      } else {
        setIsHeaderVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const { escalanteRGs, alaConfig, loading: configLoading } = useAppConfig();
  const { refreshMilitars } = useMilitars();
  const alaConfigLoaded = !configLoading; // Since we moved global config loading out

  const simulatedAla =
    simulatedVersion !== "OFICIAIS" && simulatedVersion !== ""
      ? simulatedVersion
      : "";

  const effectiveProfile = profile
    ? {
        ...profile,
        isAdmin:
          (profile.isAdmin ||
            (profile.adminObms && profile.adminObms.length > 0)) &&
          adminModeActive,
        isEscalante:
          (profile.isEscalante ||
            (profile.escalanteObms && profile.escalanteObms.length > 0)) &&
          escalanteModeActive,
        ala:
          (profile.isAdmin ||
            (profile.adminObms && profile.adminObms.length > 0)) &&
          simulatedAla
            ? simulatedAla
            : profile.ala,
      }
    : null;

  const isOfficerMode =
    simulatedVersion === "OFICIAIS" || effectiveProfile?.isOficial || false;

  // OBM Context for admins
  const [obmContext, setObmContext] = useState<string>("");
  const allObms = Object.keys(OBM_HIERARCHY);

  const availableObms = profile?.isAdmin
    ? ["GLOBAL", ...allObms]
    : Array.from(
        new Set([
          profile?.obm ? profile.obm.trim() : "10º GBM",
          ...(profile?.adminObms || []),
          ...(profile?.escalanteObms || []),
        ]),
      );

  usePresence(effectiveProfile);
  const { activeAlert, dismissAlert } = useViaturaAlerts(effectiveProfile);

  // Update profile with escalante role dynamically from legacy config
  useEffect(() => {
    if (profile?.rg) {
      const isLegacyEscalante =
        escalanteRGs.includes(profile.rg) || profile.rg === "54444";
      if (isLegacyEscalante && !profile.isEscalante) {
        setProfile((prev) => (prev ? { ...prev, isEscalante: true } : null));
      }
    }
  }, [profile?.rg, profile?.isEscalante, escalanteRGs]);

  // Auto-redirect to /patrimonio if a section query parameter exists
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sectionParam = params.get("section");
    if (sectionParam && location.pathname !== "/patrimonio") {
      navigate(`/patrimonio?section=${encodeURIComponent(sectionParam)}`, {
        replace: true,
      });
    }
  }, [location.search, location.pathname, navigate]);

  // Identity & Session Linking logic
  useEffect(() => {
    let isMounted = true;

    // Safety timeout: Never stay in loading state for more than 5 seconds
    const safetyTimeout = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 5000);

    // 2. Listen for Auth changes
    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (!isMounted) return;
      setUser(u);

      if (u) {
        setAuthReady(true);
        setLoading(false);
      } else {
        // 4. No session found, joining anonymously
        signInAnonymously(auth).catch((e) => {
          if (!e.message?.includes("network-request-failed")) {
            console.warn("[Auth] Anonymous join failed:", e.message);
          }
          if (isMounted) setLoading(false);
        });
      }
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
      clearTimeout(safetyTimeout);
    };
  }, []);

  // Proactive profile refresh to ensure data is never stale (Ala, rank etc)
  useEffect(() => {
    if (profile?.rg && !loading && authReady) {
      // Trigger a military list fetch with the new RG for security filtering
      refreshMilitars(profile.rg);

      const refreshProfile = async () => {
        try {
          const res = await fetch(`/api/militar/${profile.rg}`);
          const data = await res.json();
          if (data.success && data.member) {
            // Only update if the new data is "better" (not just generic 'Militar')
            // or if the current profile has no name
            const isNewDataBetter =
              data.member.name && data.member.name !== "Militar";
            const isCurrentProfileDefault =
              !profile.name || profile.name === "Militar";

            if (isNewDataBetter || isCurrentProfileDefault) {
              const updatedProfile = {
                ...profile,
                name: data.member.name || profile.name,
                rank: data.member.rank || profile.rank,
                warName: data.member.warName || profile.warName,
                ala: data.member.ala || profile.ala,
              };

              // Only update if something actually changed to avoid re-render loops
              if (JSON.stringify(updatedProfile) !== JSON.stringify(profile)) {
                console.log("[Auth] Profile updated with server data.");
                setProfile(updatedProfile);
                localStorage.setItem(
                  "militar_profile",
                  JSON.stringify(updatedProfile),
                );
              }
            }
          }
        } catch (e) {
          console.warn("[Auth] Failed to refresh profile:", e);
        }
      };

      refreshProfile();
    }
  }, [profile?.rg, loading, authReady]);

  useEffect(() => {
    if (profile && !obmContext) {
      const rawUserObm = profile.obm ? profile.obm.trim() : "10º GBM";
      setObmContext(rawUserObm);
    }
  }, [profile, obmContext]);

  const handleSignOut = () => {
    // Clear state immediately for instant feedback
    localStorage.removeItem("militar_profile");
    localStorage.removeItem("militar_verify_code");
    localStorage.removeItem("cache_permutas");
    setProfile(null);
    setUser(null);

    // Background signout
    signOut(auth);
    window.location.reload();
  };

  const openPermutaRequest = (date?: Date) => {
    setSelectedDate(date || null);
    setIsPermutaModalOpen(true);
  };

  const isPublicCargaView = location.pathname.startsWith("/carga-fixa/");
  const publicSectionId = isPublicCargaView
    ? location.pathname.split("/")[2]
    : null;

  if (isPublicCargaView && publicSectionId) {
    if (!authReady) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-400">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin mb-4" />
          <p className="text-[10px] font-black uppercase tracking-widest">
            Iniciando conexão segura...
          </p>
        </div>
      );
    }
    return <PublicCargaViewer sectionId={publicSectionId} />;
  }

  const isPublicCardapio = location.pathname.startsWith("/cardapio");
  if (isPublicCardapio) {
    if (!authReady) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-400">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin mb-4" />
          <p className="text-[10px] font-black uppercase tracking-widest">
            Iniciando conexão segura...
          </p>
        </div>
      );
    }
    return (
      <React.Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
          </div>
        }
      >
        <PublicCardapioViewer />
      </React.Suspense>
    );
  }

  // Se não temos perfil, pedimos login IMEDIATAMENTE.
  // Isso mascara o tempo de inicialização do Firebase e config.
  if (!profile) {
    return <Login onLogin={setProfile} />;
  }

  if (loading || !alaConfigLoaded) {
    return (
      <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-[#8B0000] rounded-full animate-spin" />
          <span className="font-black text-[10px] text-gray-400 uppercase tracking-widest">
            Iniciando Sistema...
          </span>
        </div>
      </div>
    );
  }

  // Force RANCHO users directly into the kitchen module
  if (profile.rg?.startsWith("RANCHO")) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-main)] text-[#1D1D1D] font-sans selection:bg-red-100 selection:text-red-900 overflow-y-auto w-full">
        <div className="mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 transition-all max-w-[2000px] 2xl:max-w-none">
          <React.Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
              </div>
            }
          >
            <RefeitorioModule user={effectiveProfile!} onBack={() => {}} />
          </React.Suspense>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[#1D1D1D] font-sans selection:bg-red-100 selection:text-red-900 flex flex-col">
      {(profile.isAdmin ||
        (profile.adminObms && profile.adminObms.length > 0)) &&
        moderatorMode && (
          <div className="bg-indigo-600 text-white px-3 py-2 border-b border-indigo-500 animate-in slide-in-from-top duration-300">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-200" />
                <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100">
                  Modo Moderador
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-indigo-700/50 p-1 rounded-xl border border-indigo-400/30 shadow-inner overflow-x-auto no-scrollbar w-full sm:w-auto">
                {[
                  { id: "", label: "Original" },
                  { id: "OFICIAIS", label: "Oficiais" },
                  { id: "1", label: "Ala 1" },
                  { id: "2", label: "Ala 2" },
                  { id: "3", label: "Ala 3" },
                  { id: "4", label: "Ala 4" },
                  { id: "EXP", label: "EXP" },
                  { id: "ESCALANTE", label: "Escalante" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSimulatedVersion(opt.id)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all whitespace-nowrap ${
                      simulatedVersion === opt.id
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-indigo-200 hover:text-white hover:bg-indigo-500"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      <nav
        className={`bg-[var(--color-brand-dark)] text-white p-4 sticky top-0 z-[100] border-b-4 border-[var(--color-brand-red)] shadow-lg transition-transform duration-300 ${isHeaderVisible ? "translate-y-0" : "-translate-y-full"}`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div
            className="flex items-center gap-2 sm:gap-4 cursor-pointer hover:opacity-80 transition-opacity flex-1 min-w-0"
            onClick={() => {
              navigate("/");
              setSelectedMonthView(null);
            }}
          >
            <div className="w-10 h-10 sm:w-[70px] sm:h-[70px] bg-white rounded-full flex items-center justify-center p-0 shadow-inner overflow-hidden shrink-0">
              <PlatformLogo className="w-10 h-10 sm:w-[70px] sm:h-[70px] text-[var(--color-brand-dark)] scale-[1.25]" />
            </div>
            <div className="flex flex-col truncate">
              <div className="text-xs min-[400px]:text-sm min-[800px]:text-xl xl:text-3xl font-black tracking-tight leading-tight uppercase truncate">
                CONEXÃO BRAVO
              </div>
              <div className="text-[9px] min-[400px]:text-[10px] xl:text-sm font-black opacity-80 uppercase tracking-widest truncate">
                {effectiveProfile?.obm || "CBA VII"} - COSTA VERDE
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-6 shrink-0">
            <div className="hidden lg:flex items-center gap-4 border-l border-white/10 pl-6 h-10">
              <div className="text-right">
                <span className="block text-2xl font-black leading-none text-[var(--color-brand-red)] italic">
                  {GLOBAL_REF_YEAR}
                </span>
                <span className="text-[8px] uppercase font-bold tracking-tighter opacity-60">
                  Ano de Referência
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 ml-1 sm:ml-2">
              {profile && profile.isEscalante && !profile.isAdmin && (
                <button
                  onClick={() => setEscalanteModeActive(!escalanteModeActive)}
                  className={`p-1.5 sm:p-2 transition-colors rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 px-1.5 sm:px-3 ${escalanteModeActive ? "bg-blue-500 text-white shadow-inner" : "text-white/50 hover:text-blue-400 hover:bg-white/5 border border-white/10"}`}
                  title="Modo Escalante"
                >
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest hidden sm:block">
                    Escalante
                  </span>
                </button>
              )}
              {profile && profile.isAdmin && (
                <button
                  onClick={() => {
                    const nextMode = !moderatorMode;
                    setModeratorMode(nextMode);
                    setAdminModeActive(nextMode);
                  }}
                  className={`p-1.5 sm:p-2 transition-colors rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 px-1.5 sm:px-3 ${moderatorMode ? "bg-indigo-500 text-white shadow-inner" : "text-white/50 hover:text-indigo-400 hover:bg-white/5 border border-white/10"}`}
                  title="Modo Moderador"
                >
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest hidden sm:block">
                    Moderador
                  </span>
                </button>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 sm:gap-3 px-1 sm:px-2 py-1 ml-1 sm:ml-2 transition-opacity hover:opacity-80 text-white text-left"
              >
                <div className="flex flex-col items-center justify-center shrink-0">
                  <div className="scale-[0.8] sm:scale-100 origin-center drop-shadow-sm">
                    <RankInsignia rankStr={profile.rank || ""} />
                  </div>
                </div>

                <div className="flex flex-col text-left justify-center pb-0.5 pt-1">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase text-current opacity-80 tracking-widest leading-none mb-0.5 whitespace-nowrap">
                    <span className="hidden sm:inline">
                      {profile.rank ? profile.rank.replace("º", "") : "MIL"}
                    </span>
                    <span className="sm:hidden">
                      {profile.rank
                        ? profile.rank
                            .replace("º", "")
                            .replace(/.*SGT/, "SGT")
                            .replace("SOLDADO", "SD")
                            .replace("CABO", "CB")
                            .replace("SUBTENENTE", "ST")
                            .replace("ASPIRANTE", "ASP")
                        : "MIL"}
                    </span>
                  </span>
                  <span className="text-[11px] sm:text-[13px] font-black uppercase tracking-tight text-current leading-none truncate block mt-[1px]">
                    {profile.warName || profile.name.split(" ")[0]}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-current opacity-70 font-mono leading-none whitespace-nowrap">
                      RG: {profile.rg || "----"}
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase opacity-90 leading-none">
                      {typeof profile.ala === "string" &&
                      profile.ala.toUpperCase() === "EXP"
                        ? "EXP"
                        : typeof profile.ala === "string" &&
                            profile.ala.toUpperCase() === "ESCALANTE"
                          ? "ESC"
                          : `ALA ${profile.ala}`}
                    </span>
                  </div>
                </div>
              </button>

              <AnimatePresence>
                {userDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 overflow-hidden z-[200]"
                  >
                    <div className="p-1.5 pt-2">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors font-bold group"
                      >
                        Sair da Conta
                        <LogOut className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 flex-1 overflow-x-hidden pb-24 sm:pb-10">
        <React.Suspense
          fallback={
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          }
        >
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route
                path="/efetivo"
                element={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <EfetivoPanel
                      user={effectiveProfile!}
                      obmContext={obmContext}
                      onBack={() => navigate("/")}
                    />
                  </motion.div>
                }
              />
              <Route
                path="/"
                element={
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <Header
                      profile={effectiveProfile!}
                      obmContext={obmContext}
                      setObmContext={setObmContext}
                      availableObms={availableObms}
                      isOfficerMode={isOfficerMode}
                    />

                    <HomePortal
                      user={effectiveProfile!}
                      isAdminRaw={effectiveProfile!.isAdmin}
                      isEscalanteRaw={effectiveProfile!.isEscalante}
                      onLaunchModule={(id) => navigate(`/${id}`)}
                    />
                  </motion.div>
                }
              />
              <Route
                path="/atualizacao"
                element={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ProfileUpdate
                      user={effectiveProfile!}
                      onUpdate={(updated) => {
                        setProfile(updated);
                        localStorage.setItem(
                          "militar_profile",
                          JSON.stringify(updated),
                        );
                      }}
                      onBack={() => navigate("/")}
                    />
                  </motion.div>
                }
              />
              <Route
                path="/patrimonio"
                element={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <PatrimonyModule
                      user={effectiveProfile!}
                      adminModeActive={adminModeActive}
                      onToggleAdminMode={() =>
                        setAdminModeActive(!adminModeActive)
                      }
                      obmContext={obmContext}
                      onBack={() => navigate("/")}
                    />
                  </motion.div>
                }
              />
              <Route
                path="/medidas"
                element={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <MedidasModule
                      user={effectiveProfile!}
                      onBack={() => navigate("/")}
                    />
                  </motion.div>
                }
              />
              <Route
                path="/sop-medidas"
                element={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <SopMedidasModule
                      user={effectiveProfile!}
                      militars={[]}
                      onBack={() => navigate("/")}
                    />
                  </motion.div>
                }
              />
              <Route
                path="/sop-config"
                element={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <SopConfigModule
                      user={effectiveProfile!}
                      onBack={() => navigate("/")}
                    />
                  </motion.div>
                }
              />
              <Route
                path="/grd"
                element={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex flex-col gap-6">
                      <div className="mb-4">
                        <button
                          onClick={() => navigate("/")}
                          className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] group"
                        >
                          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                          Voltar ao Portal Principal
                        </button>
                      </div>
                      <GrdModule
                        obmContext={obmContext}
                        readonly={
                          !(
                            effectiveProfile?.isAdmin ||
                            effectiveProfile?.isEscalante
                          )
                        }
                        user={effectiveProfile}
                      />
                    </div>
                  </motion.div>
                }
              />
              <Route
                path="/servicos-grd"
                element={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex flex-col gap-6">
                      <div className="mb-4">
                        <button
                          onClick={() => navigate("/")}
                          className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] group"
                        >
                          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                          Voltar ao Portal Principal
                        </button>
                      </div>
                      <OfficerGrdModule
                        user={effectiveProfile!}
                        obmContext={obmContext}
                      />
                    </div>
                  </motion.div>
                }
              />
              <Route
                path="/refeitorio"
                element={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <RefeitorioModule
                      user={effectiveProfile!}
                      onBack={() => navigate("/")}
                    />
                  </motion.div>
                }
              />
              <Route
                path="/aprovisionamento"
                element={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex flex-col gap-6">
                      <div className="mb-4">
                        <button
                          onClick={() => navigate("/")}
                          className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] group"
                        >
                          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                          Voltar ao Portal Principal
                        </button>
                      </div>
                      <AprovisionamentoModule userProfile={effectiveProfile!} />
                    </div>
                  </motion.div>
                }
              />
              <Route
                path="/agenda"
                element={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <AgendaPessoal
                      user={effectiveProfile!}
                      onBack={() => navigate("/")}
                      standalone={true}
                    />
                  </motion.div>
                }
              />
              <Route
                path="/ferias"
                element={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <VacationModule
                      user={effectiveProfile!}
                      onBackToPortal={() => navigate("/")}
                    />
                  </motion.div>
                }
              />
              <Route
                path="/ferias-sad"
                element={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <VacationModule
                      user={effectiveProfile!}
                      onBackToPortal={() => navigate("/")}
                      isSadMode={true}
                    />
                  </motion.div>
                }
              />
              <Route
                path="/expediente"
                element={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex flex-col gap-6">
                      <div className="mb-4">
                        <button
                          onClick={() => navigate("/")}
                          className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] group"
                        >
                          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                          Voltar ao Portal Principal
                        </button>
                      </div>
                      <ExpedienteScheduler
                        user={effectiveProfile!}
                        obmContext={obmContext}
                        forceExpanded={true}
                      />
                    </div>
                  </motion.div>
                }
              />
              <Route
                path="/perfil"
                element={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4"
                  >
                    <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 mb-6 border-4 border-white shadow-xl">
                      <User className="w-12 h-12" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-widest mb-1 mt-4">
                      {effectiveProfile?.name}
                    </h2>
                    <p className="text-slate-500 font-bold text-sm tracking-widest uppercase opacity-80 mb-8">
                      {effectiveProfile?.rank} • {effectiveProfile?.obm}
                    </p>
                    <button
                      onClick={handleSignOut}
                      className="mt-8 flex items-center gap-2 bg-red-50 text-red-600 px-6 py-3 rounded-xl font-bold uppercase tracking-wider hover:bg-red-100 transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      Sair do Aplicativo
                    </button>
                  </motion.div>
                }
              />
              <Route
                path="/permutas"
                element={
                  selectedMonthView === null ? (
                    <motion.div
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ duration: 0.4 }}
                    >
                      <Header
                        profile={effectiveProfile!}
                        obmContext={obmContext}
                        setObmContext={setObmContext}
                        availableObms={availableObms}
                        isOfficerMode={isOfficerMode}
                      />

                      <PermutaModule
                        user={effectiveProfile!}
                        obmContext={obmContext}
                        isOfficerMode={isOfficerMode}
                        adminModeActive={adminModeActive}
                        onToggleAdminMode={() =>
                          setAdminModeActive(!adminModeActive)
                        }
                        onDateClick={openPermutaRequest}
                        onMonthSelect={setSelectedMonthView}
                        onBackToPortal={() => navigate("/")}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, x: 100 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 50 }}
                      transition={{ duration: 0.4 }}
                      className="min-h-[60vh] flex flex-col"
                    >
                      <div className="mb-8">
                        <button
                          onClick={() => setSelectedMonthView(null)}
                          className="mb-8 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors uppercase font-black text-[10px] tracking-widest"
                        >
                          &larr; Voltar para Dashboard
                        </button>
                      </div>
                      <section id="requests-board" className="flex-1">
                        {authReady && (
                          <PermutaBoard
                            user={effectiveProfile!}
                            obmContext={obmContext}
                            selectedMonth={selectedMonthView}
                            onMonthSelect={setSelectedMonthView}
                            onBack={() => setSelectedMonthView(null)}
                            adminMode={adminModeActive || escalanteModeActive}
                          />
                        )}
                      </section>
                    </motion.div>
                  )
                }
              />
              <Route
                path="/escalante-gerenciar"
                element={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <EscalanteDashboard
                      user={effectiveProfile!}
                      obmContext={obmContext}
                      setObmContext={setObmContext}
                      availableObms={availableObms}
                      onBack={() => navigate("/")}
                    />
                  </motion.div>
                }
              />
              <Route
                path="/oficiais-config"
                element={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                    className="h-screen w-full fixed inset-0 z-50 bg-slate-50 overflow-y-auto"
                  >
                    <OfficerConfigModule onClose={() => navigate("/")} />
                  </motion.div>
                }
              />
              <Route
                path="/terceirizados"
                element={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex flex-col gap-6">
                      <div className="mb-4">
                        <button
                          onClick={() => navigate("/")}
                          className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] group"
                        >
                          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                          Voltar ao Portal Principal
                        </button>
                      </div>
                      <TerceirizadosModule
                        user={effectiveProfile!}
                        onBack={() => navigate("/")}
                      />
                    </div>
                  </motion.div>
                }
              />
              <Route
                path="/translado"
                element={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TransladoModule
                      user={effectiveProfile!}
                      onBack={() => navigate("/")}
                    />
                  </motion.div>
                }
              />
              <Route
                path="/comunicacao"
                element={
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ComunicanteDashboard
                      user={effectiveProfile!}
                      onBack={() => navigate("/")}
                    />
                  </motion.div>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </React.Suspense>
      </main>

      {/* Controlled Floating Button */}
      {currentPath.includes("permutas") && !isPermutaModalOpen && (
        <button
          onClick={() => openPermutaRequest()}
          className={`fixed bottom-24 md:bottom-8 right-4 md:right-8 bg-[var(--color-brand-red)] text-white p-4 rounded-full shadow-2xl hover:bg-black transition-all duration-1000 ease-in-out flex items-center font-bold z-50 group hover:scale-110 active:scale-95 overflow-hidden ${
            isPermutaButtonExpanded ? "gap-2 max-w-[300px]" : "gap-0 max-w-[60px]"
          }`}
        >
          <Send className="w-6 h-6 shrink-0 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          <span className={`uppercase tracking-widest text-[10px] font-black whitespace-nowrap transition-all duration-1000 ease-in-out origin-left ${
            isPermutaButtonExpanded ? "opacity-100 pr-2 scale-100 max-w-[200px]" : "opacity-0 scale-0 w-0 pr-0 max-w-0"
          }`}>
            Solicitar Permuta
          </span>
        </button>
      )}

      <RequestPermuta
        user={effectiveProfile!}
        obmContext={obmContext}
        isOpen={isPermutaModalOpen}
        setIsOpen={setIsPermutaModalOpen}
        initialDate={selectedDate}
        onSuccess={(dateStr) => {
          navigate("/permutas");
          const dateObj = new Date(dateStr + "T00:00:00");
          setSelectedMonthView(dateObj.getMonth());
          setIsPermutaModalOpen(false);
        }}
      />

      {/* Active Alert Overlay */}
      <AnimatePresence>
        {activeAlert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-6"
          >
            <div className="bg-rose-600 rounded-[3rem] p-12 max-w-2xl w-full text-center shadow-[0_0_100px_rgba(225,29,72,0.8)] border-4 border-rose-400 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>

              <motion.div
                animate={{ rotate: [0, 10, -10, 10, 0] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className="w-32 h-32 bg-white rounded-full mx-auto flex items-center justify-center mb-8 shadow-2xl"
              >
                <div className="w-24 h-24 bg-rose-500 rounded-full flex items-center justify-center animate-ping absolute" />
                <BellRing className="w-16 h-16 text-rose-600 relative z-10" />
              </motion.div>

              <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tighter text-white mb-4 drop-shadow-md">
                Viatura Bradou
              </h1>
              <h2 className="text-6xl sm:text-8xl font-black text-rose-200 mb-8 tracking-tight">
                {activeAlert.viatura}
              </h2>

              <div className="bg-black/20 rounded-2xl p-6 mb-10 w-max mx-auto border border-rose-500/50 backdrop-blur-sm">
                <p className="text-rose-100 font-bold uppercase tracking-widest text-sm">
                  Acionado por:{" "}
                  <span className="text-white ml-2">
                    {activeAlert.emittedBy}
                  </span>
                </p>
              </div>

              <button
                onClick={dismissAlert}
                className="bg-white text-rose-700 hover:bg-rose-50 px-12 py-6 rounded-full font-black uppercase tracking-[0.2em] text-sm sm:text-lg transition-transform active:scale-95 shadow-2xl"
              >
                Ciente da Ocorrência
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="bg-gray-50 border-t border-gray-100 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <div className="w-6 h-6 bg-gray-800 rounded-lg flex items-center justify-center text-white font-black text-[10px]">
                10
              </div>
              <span className="font-black text-xs uppercase tracking-widest">
                Corpo de Bombeiros Militar - RJ
              </span>
            </div>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest max-w-sm leading-relaxed">
              Sistema de gestão de escala desenvolvido para facilitar o
              planejamento operacional e o bem-estar do efetivo do 10º GBM.
            </p>
          </div>
          <div className="flex gap-8">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
                Suporte Técnico
              </span>
              <a
                href="mailto:lab.10gbm@gmail.com"
                className="text-sm font-bold text-gray-600 hover:text-[#8B0000] transition-colors"
              >
                lab.10gbm@gmail.com
              </a>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
                Unidade
              </span>
              <span className="text-sm font-bold text-gray-600">
                Angra dos Reis, RJ
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around z-[100] pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {[
          { icon: Home, label: "Início", path: "/" },
          { icon: Calendar, label: "Escala", path: "/agenda" },
          { icon: Utensils, label: "Rancho", path: "/refeitorio" },
          { icon: ArrowLeftRight, label: "Permutas", path: "/permutas" },
          { icon: User, label: "Perfil", path: "/perfil" },
        ].map((item, idx) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <button
              key={idx}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center w-full py-3 gap-1 transition-colors ${
                isActive
                  ? "text-[var(--color-brand-red)]"
                  : "text-slate-400 hover:text-slate-900"
              }`}
            >
              <item.icon
                className={`w-5 h-5 ${isActive && item.icon !== Home && item.icon !== ArrowLeftRight && item.icon !== Utensils && item.icon !== Calendar ? "fill-current" : ""}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-[9px] font-black uppercase tracking-wider ${isActive ? "opacity-100" : "opacity-70"}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
