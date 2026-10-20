"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldCheck,
  LogOut,
  ChevronDown,
  User as UserIcon,
  Moon,
  Sun,
  Home,
  Calendar,
  ArrowLeftRight,
  Users,
  Utensils,
  Award,
  Loader2,
} from "lucide-react";
import { useSession } from "../../contexts/SessionContext";
import { useTheme } from "../../contexts/ThemeContext";
import { PlatformLogo } from "../../components/PlatformLogo";
import { Login } from "../../components/Login";
import { CentralNotificacoesSocial } from "../../features/permutas/components/CentralNotificacoesSocial";
import { resolveCanonicalScope, formatScopeLabel } from "../../lib/canonicalScope";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    profile,
    effectiveProfile,
    loading,
    adminModeActive,
    setAdminModeActive,
    escalanteModeActive,
    setEscalanteModeActive,
    simulatedVersion,
    setSimulatedVersion,
    obmContext,
    setObmContext,
    availableObms,
    handleSignOut,
    setProfile,
  } = useSession();

  const { isDark, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-main)] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">
          Carregando Conexão Bravo...
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-main)] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Login onLogin={(user) => setProfile(user)} />
        </div>
      </div>
    );
  }

  const hasAdminAccess = Boolean(
    profile && (profile.isAdmin || (Array.isArray(profile.adminObms) && profile.adminObms.length > 0))
  );
  const hasEscalanteAccess = Boolean(
    profile && (profile.isEscalante || (Array.isArray(profile.escalanteObms) && profile.escalanteObms.length > 0))
  );

  const navItems = [
    { href: "/", label: "INÍCIO", icon: Home },
    { href: "/em-desenvolvimento", label: "ESCALA", icon: Calendar },
    { href: "/refeitorio", label: "RANCHO", icon: Utensils },
    { href: "/permutas", label: "PERMUTAS", icon: ArrowLeftRight },
    { href: "/perfil", label: "PERFIL", icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[#1D1D1D] flex flex-col font-sans selection:bg-red-100 selection:text-red-900 pb-20 md:pb-6">
      {/* Moderation Bar */}
      {hasAdminAccess && adminModeActive && (
        <div className="bg-indigo-600 text-white px-3 py-2 border-b border-indigo-500 animate-in slide-in-from-top duration-300">
          <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-200" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100">
                Modo Moderador Ativo
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-indigo-700/50 p-1 rounded-xl border border-indigo-400/30 overflow-x-auto no-scrollbar">
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

      {/* Top Navbar */}
      <nav className="bg-[var(--color-brand-dark)] text-white p-3 sm:p-4 sticky top-0 z-[100] border-b-4 border-[var(--color-brand-red)] shadow-lg">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 sm:gap-4 hover:opacity-80 transition-opacity flex-1 min-w-0"
          >
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center p-0 shadow-inner overflow-hidden shrink-0 keep-light">
              <PlatformLogo className="w-10 h-10 sm:w-14 sm:h-14 text-[var(--color-brand-dark)] scale-[1.25]" />
            </div>
            <div className="flex flex-col truncate">
              <div className="text-sm sm:text-xl font-black tracking-tight leading-tight uppercase truncate">
                CONEXÃO BRAVO
              </div>
              <div className="text-[9px] sm:text-xs font-black opacity-80 uppercase tracking-widest truncate">
                {obmContext || effectiveProfile?.obm || "CBA VII"} - COSTA VERDE
              </div>
            </div>
          </Link>

          {/* Center Navigation Links (Desktop) */}
          <div className="hidden lg:flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 mx-4">
            {navItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    active
                      ? "bg-red-600 text-white shadow-md shadow-red-950/40"
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right Action Icons & Profile */}
          <div className="flex items-center gap-2 shrink-0">
            {/* OBM Switcher */}
            {availableObms && availableObms.length > 1 && (
              <select
                value={obmContext}
                onChange={(e) => setObmContext(e.target.value)}
                className="bg-white/10 hover:bg-white/15 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-white/15 outline-none cursor-pointer"
              >
                {availableObms.map((obm) => {
                  const label = obm === 'GLOBAL' ? '🌐 TODAS AS UNIDADES' : formatScopeLabel(resolveCanonicalScope(obm));
                  return (
                    <option key={obm} value={obm} className="bg-slate-900 text-white">
                      {label}
                    </option>
                  );
                })}
              </select>
            )}

            {/* Central de Avisos e Permutas da Tropa */}
            <CentralNotificacoesSocial
              user={effectiveProfile}
              onNavigateToPermutas={() => router.push("/permutas")}
            />

            {/* Admin Toggle */}
            {hasAdminAccess && (
              <button
                type="button"
                onClick={() => setAdminModeActive(!adminModeActive)}
                className={`w-9 h-9 sm:w-10 sm:h-10 transition-all rounded-xl flex items-center justify-center shrink-0 ${
                  adminModeActive
                    ? "bg-indigo-600 text-white border border-indigo-400/50"
                    : "text-white/60 hover:text-indigo-300 hover:bg-white/10 border border-white/10"
                }`}
                title="Modo Moderador"
              >
                <ShieldCheck className="w-5 h-5" />
              </button>
            )}

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 group hover:bg-white/5 py-1 px-2 rounded-2xl transition-all cursor-pointer"
                aria-label="Menu do Militar"
              >
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-0.5">
                    {effectiveProfile?.rank}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-slate-100 uppercase tracking-tight leading-tight">
                    {effectiveProfile?.warName || effectiveProfile?.name}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 group-hover:text-white transition-transform ml-1 ${
                    userDropdownOpen ? "-rotate-180" : ""
                  }`}
                />
              </button>

              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/10"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-52 bg-[#1D1D1D] rounded-xl shadow-2xl border border-zinc-700/50 overflow-hidden z-50 p-2 text-white animate-in fade-in slide-in-from-top-2">
                    <div className="p-2 border-b border-zinc-800 text-center">
                      <p className="text-xs font-bold truncate">{effectiveProfile?.name}</p>
                      <p className="text-[9px] text-zinc-400 font-black uppercase mt-0.5">
                        {effectiveProfile?.rank} • {effectiveProfile?.ala || "EXP"}
                      </p>
                    </div>

                    <div className="py-1 space-y-1">
                      {/* Modo Noturno (Lua / Sol) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTheme();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${isDark ? "bg-amber-400/20 text-amber-400" : "bg-indigo-500/20 text-indigo-300"}`}>
                            {isDark ? (
                              <Sun className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <Moon className="w-3.5 h-3.5 text-indigo-300" />
                            )}
                          </div>
                          <span>Modo Noturno</span>
                        </div>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            isDark
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {isDark ? "Ativo" : "Inativo"}
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          router.push("/atualizacao");
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-zinc-400" />
                        Atualização Cadastral
                      </button>

                      <div className="my-1 border-t border-zinc-800" />

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          handleSignOut();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
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

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#121927] border-t border-slate-200 dark:border-slate-800 px-2 py-2 flex items-center justify-around shadow-2xl">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors ${
                active ? "text-[var(--color-brand-red)] font-extrabold" : "text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
