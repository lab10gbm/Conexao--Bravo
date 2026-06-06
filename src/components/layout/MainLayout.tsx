import React, { ReactNode, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShieldCheck, LogOut, ChevronDown, User as UserIcon } from "lucide-react";
import { PlatformLogo } from "../PlatformLogo";

interface MainLayoutProps {
  children: ReactNode;
  profile: any;
  handleSignOut: () => void;
  moderatorMode: boolean;
  setModeratorMode: (val: boolean) => void;
  adminModeActive: boolean;
  setAdminModeActive: (val: boolean) => void;
  escalanteModeActive: boolean;
  setEscalanteModeActive: (val: boolean) => void;
  simulatedVersion: string;
  setSimulatedVersion: (val: string) => void;
  GLOBAL_REF_YEAR: number;
}

export function MainLayout({
  children,
  profile,
  handleSignOut,
  moderatorMode,
  setModeratorMode,
  adminModeActive,
  setAdminModeActive,
  escalanteModeActive,
  setEscalanteModeActive,
  simulatedVersion,
  setSimulatedVersion,
  GLOBAL_REF_YEAR,
}: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
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

  const effectiveProfile = profile;

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
                className="flex items-center gap-2 sm:gap-3 group hover:bg-white/5 p-1 -ml-1 rounded-2xl transition-all text-left"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[14px] flex items-center justify-center shrink-0 border-[2px] border-slate-600/40 bg-transparent group-hover:border-slate-500/60 transition-colors">
                  <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400/80" strokeWidth={1.5} />
                </div>
                
                <ChevronDown
                  className={`w-4 h-4 sm:w-5 sm:h-5 text-red-700/90 shrink-0 transition-transform duration-300 ${userDropdownOpen ? "-rotate-180" : ""}`}
                  strokeWidth={3}
                />
                
                <div className="flex flex-col justify-center truncate ml-1 sm:ml-2">
                  <span className="text-[10px] sm:text-[12px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none mb-1">
                    {effectiveProfile?.rank || "SD"}
                  </span>
                  <span className="text-sm sm:text-lg font-black text-slate-200 uppercase tracking-wider leading-none mb-1.5">
                    {effectiveProfile?.warName || "USUÁRIO"}
                  </span>
                  <div className="text-[9px] sm:text-[11px] font-mono font-bold flex items-center leading-none">
                    <span className="text-slate-500 tracking-[0.1em]">RG:&nbsp;&nbsp;</span>
                    <span className="text-slate-400 tracking-[0.1em]">{effectiveProfile?.rg}</span>
                    <span className="text-slate-300 tracking-[0.1em] ml-2">{effectiveProfile?.ala || "EXP"}</span>
                  </div>
                </div>
              </button>

              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/10"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 sm:w-56 bg-[#1D1D1D] rounded-xl shadow-2xl border border-zinc-700/50 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 origin-top-right">
                    <div className="p-3 border-b border-zinc-700/50 bg-black/20">
                      <p className="text-[10px] sm:text-xs font-bold text-white truncate text-center">
                        {effectiveProfile?.name}
                      </p>
                      <p className="text-[8px] sm:text-[9px] text-zinc-400 font-bold uppercase tracking-widest text-center mt-0.5">
                        {effectiveProfile?.rank} • {effectiveProfile?.ala || "EXP"}
                      </p>
                    </div>
                    <div className="p-1 sm:p-2">
                       <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            navigate("/atualizacao");
                          }}
                          className="w-full flex items-center gap-2 sm:gap-3 px-3 py-2 sm:py-2.5 text-[10px] sm:text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          Atualização Cadastral
                        </button>
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          handleSignOut();
                        }}
                        className="w-full flex items-center gap-2 sm:gap-3 px-3 py-2 sm:py-2.5 text-[10px] sm:text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors mt-1"
                      >
                        <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Sair do Sistema
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-[2000px] 2xl:max-w-none mx-auto sm:px-6 lg:px-8 xl:px-12 transition-all">{children}</main>
    </div>
  );
}
