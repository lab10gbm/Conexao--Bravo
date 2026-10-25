import React, { useState, useEffect } from "react";
import { auth } from "../lib/firebase";
import { Shield, LogIn, KeyRound, CheckCircle2, Lock, Mail, RefreshCw, ShieldCheck, ArrowLeft, Send, AlertCircle, Moon, Sun } from "lucide-react";
import { signInWithEmailAndPassword, signInWithCustomToken, createUserWithEmailAndPassword, signInAnonymously } from "firebase/auth";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { PlatformLogo } from "./PlatformLogo";
import { useTheme } from "../contexts/ThemeContext";

import { UserProfile } from "../types";

export function Login({
  onLogin,
}: {
  onLogin?: (profile: UserProfile) => void;
}) {
  const { isDark, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ rg: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<{
    message: string;
    code?: string;
    canRecover?: boolean;
  } | null>(null);

  // Email-based password recovery state
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'request' | 'verify'>('request');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string>('');
  const [recoverData, setRecoverData] = useState({
    rg: "",
    dataNascimento: "",
  });
  const [verifyData, setVerifyData] = useState({
    code: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverSuccess, setRecoverSuccess] = useState<string | null>(null);
  const [isLocalDelivery, setIsLocalDelivery] = useState(false);
  const [devTestCode, setDevTestCode] = useState<string | null>(null);

  // Auto-detect direct password reset link from URL (?reset_token=...&rg=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('reset_token');
      const urlRg = params.get('rg');
      if (urlToken) {
        setResetToken(urlToken);
        setIsRecovering(true);
        setRecoveryStep('verify');
        if (urlRg) {
          setRecoverData(prev => ({ ...prev, rg: urlRg }));
        }
        fetch(`/api/verify-reset-token?token=${urlToken}`)
          .then(res => res.json())
          .then(data => {
            if (data.valid) {
              setMaskedEmail(data.maskedEmail);
              if (data.rg) setRecoverData(prev => ({ ...prev, rg: data.rg }));
            } else {
              setError(data.error || 'Link de recuperação expirado.');
            }
          })
          .catch(() => {});
      }
    } catch (e) {}
  }, []);

  // First Access state
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [firstAccessData, setFirstAccessData] = useState({
    email: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [firstAccessLoading, setFirstAccessLoading] = useState(false);
  const [pendingFirstAccess, setPendingFirstAccess] = useState<{
    rg: string;
    currentPassword: string;
    profile: any;
    authEmail?: string;
    authPassword?: string;
    useClientAuth?: boolean;
    needsClientRegistration?: boolean;
    token?: string;
  } | null>(null);

  const handleFirstAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingFirstAccess) return;
    setError(null);

    const cleanEmail = firstAccessData.email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError("Por favor, informe um endereço de e-mail válido para recuperação de senha.");
      return;
    }

    const cleanNew = firstAccessData.newPassword.trim();
    if (cleanNew.length < 6) {
      setError("A nova senha deve possuir no mínimo 6 caracteres.");
      return;
    }

    if (cleanNew !== firstAccessData.confirmPassword.trim()) {
      setError("A nova senha e a confirmação não coincidem.");
      return;
    }

    setFirstAccessLoading(true);

    try {
      const response = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rg: pendingFirstAccess.rg,
          currentPassword: pendingFirstAccess.currentPassword,
          newPassword: cleanNew,
          email: cleanEmail,
        }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || "Erro ao cadastrar nova senha e e-mail.");
      }

      const updatedProfile = {
        ...pendingFirstAccess.profile,
        email: cleanEmail,
        hasCustomPassword: true,
        mustChangePassword: false,
      };

      if (pendingFirstAccess.authEmail) {
        try {
          await signInWithEmailAndPassword(
            auth,
            pendingFirstAccess.authEmail,
            cleanNew
          );
        } catch (authErr) {
          console.warn("[Auth] Client background auth notice:", authErr);
          if (!auth.currentUser) {
            await signInAnonymously(auth).catch(() => {});
          }
        }
      }

      localStorage.setItem("militar_profile", JSON.stringify(updatedProfile));

      if (onLogin) {
        onLogin(updatedProfile);
      } else {
        window.location.href = `${window.location.origin}/?v=${Date.now()}`;
      }
    } catch (err: any) {
      console.error("First access password creation error", err);
      setError(err.message || "Erro ao salvar nova senha");
      setFirstAccessLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setLoginError(null);

    // 0. Reset login error state
    setError(null);
    setLoginError(null);

    try {
      // 1. Post to secure server-side login
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rg: formData.rg, password: formData.password }),
      }).catch(() => {
        throw new Error("Erro de conexão com o servidor. Por favor, aguarde alguns instantes enquanto o sistema inicializa e tente novamente.");
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
         console.warn(`[Login] Falha de login para RG ${formData.rg}:`, data.code || 'UNKNOWN', data.error);
         setLoginError({
           message: data.error || "RG ou Senha incorretos.",
           code: data.code,
           canRecover: Boolean(
             data.canRecover ||
             data.code === 'INVALID_PASSWORD' ||
             data.code === 'DEFAULT_PASSWORD_BLOCKED' ||
             data.code === 'BIRTHDATE_BLOCKED'
           ),
         });
         setLoading(false);
         return;
      }

      const profileData = data.profile;

      // Check if user is required to set a personal password (First Access / mustChangePassword)
      if (data.mustChangePassword) {
        setPendingFirstAccess({
          rg: formData.rg,
          currentPassword: formData.password,
          profile: profileData,
          authEmail: data.authEmail,
          authPassword: data.authPassword,
          useClientAuth: data.useClientAuth,
          needsClientRegistration: data.needsClientRegistration,
          token: data.token,
        });
        setFirstAccessData({
          email: profileData?.email || "",
          newPassword: "",
          confirmPassword: "",
        });
        setIsFirstAccess(true);
        setLoading(false);
        return;
      }

      // 2. Client sign-in securely via Custom Token, Email/Password, or Anonymous session
      // This ensures Firestore permissions (request.auth != null) and API Bearer tokens are active.
      if (data.token) {
        try {
          await signInWithCustomToken(auth, data.token);
        } catch (authErr: any) {
          if (!auth.currentUser) {
            await signInAnonymously(auth).catch(() => {});
          }
        }
      } else if (data.useClientAuth && data.authEmail && data.authPassword) {
        try {
          let signedIn = false;
          try {
            await signInWithEmailAndPassword(auth, data.authEmail, data.authPassword);
            signedIn = true;
          } catch (authErr: any) {
            const code = authErr?.code;
            if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || data.needsClientRegistration) {
              try {
                await createUserWithEmailAndPassword(auth, data.authEmail, data.authPassword);
                signedIn = true;
              } catch (createErr: any) {
                // If account exists with previous password or signUp fails, fallback seamlessly
              }
            }
          }
          if (!signedIn && !auth.currentUser) {
            await signInAnonymously(auth).catch(() => {});
          }
        } catch (e) {
          if (!auth.currentUser) {
            await signInAnonymously(auth).catch(() => {});
          }
        }
      } else {
        if (!auth.currentUser) {
          await signInAnonymously(auth).catch(() => {});
        }
      }

      localStorage.setItem("militar_profile", JSON.stringify(profileData));
      
      if (onLogin) {
        onLogin(profileData);
      } else {
        window.location.href = `${window.location.origin}/?v=${Date.now()}`;
      }
      
    } catch (err: any) {
      console.warn('[Login] Erro ao comunicar com servidor de login:', err.message);
      setLoginError({
        message: err.message || "Erro de conexão com o servidor. Tente novamente.",
        canRecover: false,
      });
    } finally {
      const hasProfile = !!localStorage.getItem("militar_profile");
      if (!hasProfile) setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverLoading(true);
    setError(null);
    setRecoverSuccess(null);

    try {
      const response = await fetch("/api/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rg: recoverData.rg,
          dataNascimento: recoverData.dataNascimento,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMaskedEmail(data.maskedEmail);
        setIsLocalDelivery(!!data.isLocalDelivery);
        setDevTestCode(data.codePreview || null);
        setRecoveryStep("verify");
        setRecoverSuccess(data.message || `Código enviado para ${data.maskedEmail}.`);
      } else {
        setError(data.error || "Erro ao solicitar recuperação de senha.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Erro de conexão com o servidor. Tente novamente.");
    } finally {
      setRecoverLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRecoverSuccess(null);

    const cleanNew = verifyData.newPassword.trim();
    if (cleanNew.length < 6) {
      setError("A nova senha deve possuir no mínimo 6 caracteres.");
      return;
    }

    if (cleanNew !== verifyData.confirmPassword.trim()) {
      setError("A nova senha e a confirmação não coincidem.");
      return;
    }

    if (!resetToken && (!verifyData.code || verifyData.code.trim().length !== 6)) {
      setError("Por favor, digite o código de segurança de 6 dígitos enviado ao seu e-mail.");
      return;
    }

    setRecoverLoading(true);

    try {
      const response = await fetch("/api/confirm-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rg: recoverData.rg,
          code: verifyData.code.trim(),
          token: resetToken || undefined,
          newPassword: cleanNew,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setRecoverSuccess("Senha pessoal alterada com sucesso! Redirecionando para o login...");
        setFormData((prev) => ({ ...prev, rg: recoverData.rg, password: cleanNew }));
        if (window.history?.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        setTimeout(() => {
          setIsRecovering(false);
          setRecoveryStep("request");
          setResetToken(null);
          setVerifyData({ code: "", newPassword: "", confirmPassword: "" });
          setRecoverSuccess(null);
        }, 2500);
      } else {
        setError(data.error || "Erro ao confirmar nova senha.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Erro de conexão com o servidor.");
    } finally {
      setRecoverLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] flex items-center justify-center sm:p-6 lg:p-12 relative">
      {/* Botão de Modo Noturno no Login */}
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed top-4 right-4 sm:top-6 sm:right-6 w-11 h-11 rounded-2xl flex items-center justify-center bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-amber-400 hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer z-50"
        title={isDark ? "Desativar Modo Noturno (Mudar para Claro)" : "Ativar Modo Noturno (Mudar para Escuro)"}
        aria-label="Alternar Modo Noturno"
      >
        {isDark ? (
          <Sun className="w-5 h-5 text-amber-400 fill-amber-400/20" />
        ) : (
          <Moon className="w-5 h-5 text-slate-700" />
        )}
      </button>

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
            recoveryStep === "request" ? (
              <form onSubmit={handleRequestReset} className="space-y-6">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-red-50 text-red-600 rounded-full mb-3 border border-red-200 shadow-sm">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    Recuperação Segura por E-mail
                  </h3>
                  <p className="text-slate-500 font-bold text-[10px] leading-relaxed uppercase tracking-wider mt-1.5 px-2">
                    Informe seu RG Militar e Data de Nascimento para receber um <span className="text-slate-800">código de validação</span> no seu e-mail cadastrado.
                  </p>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded text-red-600 text-xs font-bold uppercase tracking-tight text-center leading-relaxed">
                    {error}
                  </div>
                )}

                {recoverSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded text-emerald-600 text-xs font-bold uppercase tracking-tight text-center leading-relaxed">
                    {recoverSuccess}
                  </div>
                )}

                <div className="space-y-4">
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
                      Data de Nascimento (Confirmação)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="DDMMAAAA"
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
                  className="w-full flex items-center justify-center gap-3 bg-[var(--color-brand-dark)] text-white py-4 rounded font-black shadow-lg hover:shadow-xl hover:bg-black transition-all group disabled:opacity-50 uppercase text-xs tracking-widest"
                >
                  <Send className="w-4 h-4 text-rose-400" />
                  {recoverLoading ? "ENVIANDO CÓDIGO..." : "Enviar Código de Recuperação"}
                </button>

                <div className="mt-4 text-center">
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
              <form onSubmit={handleConfirmReset} className="space-y-6">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full mb-3 border border-emerald-200 shadow-sm">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    Definir Nova Senha
                  </h3>
                  <p className="text-slate-500 font-bold text-[10px] leading-relaxed uppercase tracking-wider mt-1.5 px-2">
                    Código enviado para <span className="font-mono text-slate-800 font-black">{maskedEmail || "seu e-mail"}</span>. <br />
                    Insira o código de 6 dígitos e cadastre sua nova senha.
                  </p>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded text-red-600 text-xs font-bold uppercase tracking-tight text-center leading-relaxed">
                    {error}
                  </div>
                )}

                {recoverSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded text-emerald-600 text-xs font-bold uppercase tracking-tight text-center leading-relaxed">
                    {recoverSuccess}
                  </div>
                )}

                {isLocalDelivery && devTestCode && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-amber-800 font-black">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        Ambiente de Teste (SMTP Pendente)
                      </span>
                      <button
                        type="button"
                        onClick={() => setVerifyData((prev) => ({ ...prev, code: devTestCode }))}
                        className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded font-mono text-[10px] font-black uppercase tracking-tight transition-colors shadow-sm"
                      >
                        Inserir Código
                      </button>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-800">
                      O envio de e-mails reais requer configuração de SMTP (como Gmail com Senha de App). Enquanto não estiver configurado, utilize o código de simulação: <strong className="font-mono font-black text-amber-950 tracking-widest text-sm bg-white px-2 py-0.5 rounded border border-amber-300 shadow-inner ml-1">{devTestCode}</strong>
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  {!resetToken && (
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                        Código de Segurança (6 Dígitos)
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        autoFocus
                        placeholder="000000"
                        value={verifyData.code}
                        onChange={(e) =>
                          setVerifyData((prev) => ({
                            ...prev,
                            code: e.target.value.replace(/\D/g, ""),
                          }))
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded focus:border-[var(--color-brand-dark)] focus:ring-0 transition-all font-mono text-center tracking-[0.4em] font-black text-lg text-slate-800 placeholder:text-slate-300"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                      Nova Senha Pessoal
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="MÍNIMO 6 CARACTERES"
                      value={verifyData.newPassword}
                      onChange={(e) =>
                        setVerifyData((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded focus:border-[var(--color-brand-dark)] focus:ring-0 transition-all font-mono text-xs text-slate-700 placeholder:text-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="DIGITE A SENHA NOVAMENTE"
                      value={verifyData.confirmPassword}
                      onChange={(e) =>
                        setVerifyData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded focus:border-[var(--color-brand-dark)] focus:ring-0 transition-all font-mono text-xs text-slate-700 placeholder:text-slate-300"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={recoverLoading}
                  className="w-full flex items-center justify-center gap-3 bg-[var(--color-brand-dark)] text-white py-4 rounded font-black shadow-lg hover:shadow-xl hover:bg-black transition-all group disabled:opacity-50 uppercase text-xs tracking-widest"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {recoverLoading ? "SALVANDO NOVA SENHA..." : "Salvar Nova Senha e Concluir"}
                </button>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryStep("request");
                      setError(null);
                    }}
                    className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-[var(--color-brand-dark)] flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" /> Voltar
                  </button>

                  <button
                    type="button"
                    disabled={recoverLoading}
                    onClick={handleRequestReset}
                    className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest hover:text-indigo-700 flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className="w-3 h-3" /> Reenviar código
                  </button>
                </div>
              </form>
            )
          ) : isFirstAccess ? (
            <form onSubmit={handleFirstAccessSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-50 text-amber-600 rounded-full mb-3 border border-amber-200 shadow-sm">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Primeiro Acesso - Nova Senha e E-mail
                </h3>
                <p className="text-slate-500 font-bold text-[10px] leading-relaxed uppercase tracking-wider mt-1.5 px-2">
                  Por segurança, cadastre seu <span className="text-slate-800">e-mail de contato</span> e sua <span className="text-slate-800">senha pessoal</span> (mínimo 6 dígitos). <br />
                  A senha inicial padrão (00 + RG) será <span className="text-rose-600 font-black">desativada</span> após este cadastro.
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded text-red-600 text-xs font-bold uppercase tracking-tight text-center">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                    E-mail de Contato (Obrigatório)
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="seu.email@exemplo.com"
                      value={firstAccessData.email}
                      onChange={(e) =>
                        setFirstAccessData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded focus:border-[var(--color-brand-dark)] focus:ring-0 transition-all font-mono text-xs text-slate-700 placeholder:text-slate-300 lowercase"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 ml-1 leading-tight">
                    Utilizado para recuperação de senha caso você a esqueça no futuro.
                  </p>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                    Nova Senha Pessoal
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="MÍNIMO 6 CARACTERES"
                    value={firstAccessData.newPassword}
                    onChange={(e) =>
                      setFirstAccessData((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded focus:border-[var(--color-brand-dark)] focus:ring-0 transition-all font-mono text-xs text-slate-700 placeholder:text-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="DIGITE A SENHA NOVAMENTE"
                    value={firstAccessData.confirmPassword}
                    onChange={(e) =>
                      setFirstAccessData((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded focus:border-[var(--color-brand-dark)] focus:ring-0 transition-all font-mono text-xs text-slate-700 placeholder:text-slate-300"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={firstAccessLoading}
                className="w-full flex items-center justify-center gap-3 bg-[var(--color-brand-dark)] text-white py-4 rounded font-black shadow-lg hover:shadow-xl hover:bg-black transition-all group disabled:opacity-50 uppercase text-xs tracking-widest"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {firstAccessLoading ? "CADASTRANDO SENHA E E-MAIL..." : "Cadastrar Senha, E-mail e Acessar"}
              </button>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsFirstAccess(false);
                    setPendingFirstAccess(null);
                    setError(null);
                  }}
                  className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-[var(--color-brand-dark)]"
                >
                  Cancelar e Voltar ao Início
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
                      Utilize seu RG e Senha. <br />
                      <span className="inline-block mt-1 text-[10px] text-slate-400 font-normal lowercase tracking-normal">
                        (primeiro acesso: senha padrão é <b>00</b> seguido do seu RG)
                      </span>
                    </>
                  )}
                </p>
              </div>

              {loginError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center space-y-2.5">
                  <div className="flex items-center justify-center gap-1.5 text-red-700 font-black text-xs uppercase tracking-tight">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Atenção na Autenticação</span>
                  </div>
                  <p className="text-red-700 text-xs font-semibold leading-relaxed px-1">
                    {loginError.message}
                  </p>
                  {loginError.canRecover && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setRecoverData((prev) => ({ ...prev, rg: formData.rg || prev.rg }));
                          setIsRecovering(true);
                          setLoginError(null);
                          setError(null);
                        }}
                        className="inline-flex items-center gap-2 px-3.5 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-lg text-[11px] font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        Esqueci Minha Senha / Recuperar Acesso
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!loginError && error && (
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
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, rg: e.target.value }));
                      if (loginError) setLoginError(null);
                      if (error) setError(null);
                    }}
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
                    placeholder="MÍNIMO 6 CARACTERES (OU 00 + RG)"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }));
                      if (loginError) setLoginError(null);
                      if (error) setError(null);
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded focus:border-[var(--color-brand-dark)] focus:ring-0 transition-all font-mono text-xs text-slate-700 placeholder:text-slate-300 uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setRecoverData((prev) => ({ ...prev, rg: formData.rg || prev.rg }));
                    setIsRecovering(true);
                    setLoginError(null);
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
