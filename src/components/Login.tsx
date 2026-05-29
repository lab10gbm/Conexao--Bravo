import React, { useState } from "react";
import { auth } from "../lib/firebase";
import { Shield, LogIn } from "lucide-react";
import { signInWithCustomToken } from "firebase/auth";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { PlatformLogo } from "./PlatformLogo";

import { UserProfile } from "../types";

export function Login({
  onLogin,
}: {
  onLogin?: (profile: UserProfile) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ rg: "", password: "" });
  const [error, setError] = useState<string | null>(null);

  const [isRecovering, setIsRecovering] = useState(false);
  const [recoverData, setRecoverData] = useState({
    rg: "",
    dataNascimento: "",
  });
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverSuccess, setRecoverSuccess] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 0. Clear any old session state BEFORE starting new login
    localStorage.removeItem("militar_profile");
    localStorage.removeItem("militar_verify_code");
    localStorage.removeItem("cache_permutas");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          uid: auth.currentUser?.uid || null, // Include anonymous UID for server-side mapping
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Save initial profile right away so UI can optimistically render
        localStorage.setItem("militar_profile", JSON.stringify(data.profile));

        // Let auth happen in the background to not stall the user
        const authenticate = async () => {
          if (data.token) {
            try {
              await signInWithCustomToken(auth, data.token);
              console.log("[Auth] Signed in with secure custom token.");
              return; // Skip verify session if custom token works
            } catch (err: any) {
              console.error(
                "[Auth] Custom token sign-in failed, falling back:",
                err,
              );
            }
          }

          if (data.verifyCode && auth.currentUser) {
            try {
              const linkRes = await fetch("/api/auth/verify-session", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify({
                  uid: auth.currentUser.uid,
                  rg: data.profile.rg,
                  verifyCode: data.verifyCode,
                }),
              });
              const linkData = await linkRes.json();
              if (linkData.success && linkData.profile) {
                try {
                  await auth.currentUser?.getIdToken(true);
                  console.log("[Auth] Refreshed token to apply claims");
                } catch (e) {}
                localStorage.setItem(
                  "militar_profile",
                  JSON.stringify(linkData.profile),
                );
              }
            } catch (e) {
              console.warn("[Login] Session link failed...", e);
            }
          }
        };

        // Fire and forget
        authenticate().catch((e) => console.error(e));

        const finalProfile = localStorage.getItem("militar_profile");
        if (finalProfile && onLogin) {
          onLogin(JSON.parse(finalProfile));
        } else {
          window.location.href = `${window.location.origin}/?v=${Date.now()}`;
        }
      } else {
        setError(data.error || "RG ou Data de Nascimento incorretos");
      }
    } catch (err) {
      console.error(err);
      setError("Erro de conexão com o servidor");
    } finally {
      // Don't set loading to false if we're redirecting
      const hasProfile = !!localStorage.getItem("militar_profile");
      if (!hasProfile) setLoading(false);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverLoading(true);
    setError(null);
    setRecoverSuccess(null);

    try {
      const response = await fetch("/api/recover-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recoverData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setRecoverSuccess(
          "Senha redefinida com sucesso! Você já pode acessar o sistema utilizando sua Data de Nascimento (DDMMYYYY) como senha.",
        );
        setTimeout(() => setIsRecovering(false), 5000);
      } else {
        setError(
          data.error || "Erro ao recuperar senha. Verifique seus dados.",
        );
      }
    } catch (err) {
      console.error(err);
      setError("Erro de conexão com o servidor");
    } finally {
      setRecoverLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] flex items-center justify-center sm:p-6 lg:p-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full flex flex-col min-h-screen sm:min-h-0 sm:flex-none sm:max-w-lg bg-white sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 overflow-hidden relative z-10"
      >
        <div className="bg-[var(--color-brand-dark)] p-8 lg:p-12 text-white text-center flex flex-col items-center border-b-4 border-[var(--color-brand-red)] shrink-0 pt-16 sm:pt-12">
          <div className="w-[100px] h-[100px] bg-white rounded-full flex items-center justify-center p-0 mb-6 overflow-hidden shadow-inner shrink-0">
            <PlatformLogo className="w-[100px] h-[100px] text-[var(--color-brand-dark)] scale-[1.25]" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tighter leading-none mb-4 uppercase">
            CONEXÃO BRAVO
          </h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-0.5 bg-white/20" />
            <p className="text-white/60 font-mono text-sm sm:text-base uppercase tracking-[0.2em]">
              CBA VII - COSTA VERDE
            </p>
            <div className="w-10 h-0.5 bg-white/20" />
          </div>
        </div>

        <div className="p-8 lg:p-12 flex flex-col flex-1 justify-center sm:block">
          {isRecovering ? (
            <form onSubmit={handleRecover} className="space-y-6">
              <div className="text-center mb-8">
                <p className="text-slate-500 font-bold text-xs leading-relaxed uppercase tracking-wider">
                  Recuperação de Senha <br />
                  Informe seu RG e Data de Nascimento para restaurar a senha
                  padrão.
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded text-red-600 text-xs font-bold uppercase tracking-tight text-center">
                  {error}
                </div>
              )}

              {recoverSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded text-emerald-600 text-xs font-bold uppercase tracking-tight text-center">
                  {recoverSuccess}
                </div>
              )}

              {!recoverSuccess && (
                <>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                        RG Militar
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="DIGITE SEU RG"
                        value={recoverData.rg}
                        onChange={(e) =>
                          setRecoverData((prev) => ({
                            ...prev,
                            rg: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded focus:border-[var(--color-brand-dark)] focus:ring-0 transition-all font-mono text-xs text-slate-700 placeholder:text-slate-300 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                        Data de Nascimento
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="DDMMYYYY"
                        value={recoverData.dataNascimento}
                        onChange={(e) =>
                          setRecoverData((prev) => ({
                            ...prev,
                            dataNascimento: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded focus:border-[var(--color-brand-dark)] focus:ring-0 transition-all font-mono text-xs text-slate-700 placeholder:text-slate-300 uppercase"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={recoverLoading}
                    className="w-full flex items-center justify-center gap-4 bg-[var(--color-brand-dark)] text-white py-4 rounded font-black shadow-lg hover:shadow-xl hover:bg-black transition-all group disabled:opacity-50 uppercase text-xs tracking-widest"
                  >
                    {recoverLoading ? "PROCESSANDO..." : "Recuperar Senha"}
                  </button>
                </>
              )}

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsRecovering(false);
                    setError(null);
                    setRecoverSuccess(null);
                  }}
                  className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-[var(--color-brand-dark)]"
                >
                  Voltar para o Login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="text-center mb-8">
                <p className="text-slate-500 font-bold text-xs leading-relaxed uppercase tracking-wider">
                  {loading && !!localStorage.getItem("militar_profile") ? (
                    <span className="text-amber-600 animate-pulse">
                      Sincronizando Sessão Final... Aguarde.
                    </span>
                  ) : (
                    <>
                      Acesso restrito a militares do Corpo de Bombeiros. <br />
                      Utilize seu RG e Senha.
                    </>
                  )}
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded text-red-600 text-xs font-bold uppercase tracking-tight text-center">
                  {error}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                    RG Militar
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="DIGITE SEU RG"
                    value={formData.rg}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, rg: e.target.value }))
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded focus:border-[var(--color-brand-dark)] focus:ring-0 transition-all font-mono text-xs text-slate-700 placeholder:text-slate-300 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                    Senha
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="MÍNIMO 6 CARACTERES"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded focus:border-[var(--color-brand-dark)] focus:ring-0 transition-all font-mono text-xs text-slate-700 placeholder:text-slate-300 uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsRecovering(true);
                    setError(null);
                  }}
                  className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest hover:text-indigo-700"
                >
                  Esqueci minha senha
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-4 bg-[var(--color-brand-dark)] text-white py-4 rounded font-black shadow-lg hover:shadow-xl hover:bg-black transition-all group disabled:opacity-50 uppercase text-xs tracking-widest"
              >
                <LogIn className="w-4 h-4" />
                {loading ? "AUTENTICANDO..." : "Acessar Painel"}
              </button>

              <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col items-center gap-2">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">
                  Status do Sistema
                </span>
                <span className="text-[9px] font-mono text-emerald-500 flex items-center gap-1.5 uppercase font-bold">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Banco de Dados Interno (Ativo)
                </span>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
