import React, { useState } from "react";
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  Hourglass,
  AlertCircle,
  FileCheck,
  X,
  PenTool,
  ThumbsDown,
  Loader2,
  Calendar,
  Building2,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile, PermutaRequest, PermutaStatus } from "../../../types";
import { useNotificacoesMilitar } from "../../../hooks/useNotificacoesMilitar";
import { normalizeRg } from "../../../lib/utils";

interface CentralNotificacoesSocialProps {
  user: UserProfile | null | undefined;
  onNavigateToPermutas?: () => void;
}

export function CentralNotificacoesSocial({
  user,
  onNavigateToPermutas,
}: CentralNotificacoesSocialProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"minhas_assinaturas" | "historico">("minhas_assinaturas");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const {
    pendingMySignature,
    pendingOtherSignature,
    inAnalysisByEscalante,
    recentlyDecided,
    totalBadgeCount,
    signPermuta,
    refusePermuta,
    dismissNotification,
  } = useNotificacoesMilitar(user);

  const myCleanRg = normalizeRg(user?.rg);

  const handleSign = async (permutaId: string) => {
    setActionLoadingId(permutaId);
    setFeedbackMessage(null);
    const result = await signPermuta(permutaId);
    setActionLoadingId(null);
    setFeedbackMessage({
      type: result.success ? "success" : "error",
      text: result.message,
    });
    if (result.success) {
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const handleRefuse = async (permutaId: string) => {
    if (!window.confirm("Deseja realmente recusar esta solicitação de permuta?")) {
      return;
    }
    setActionLoadingId(permutaId);
    setFeedbackMessage(null);
    const result = await refusePermuta(permutaId);
    setActionLoadingId(null);
    setFeedbackMessage({
      type: result.success ? "success" : "error",
      text: result.message,
    });
    if (result.success) {
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  return (
    <div className="relative">
      {/* Botão Sino de Notificações */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setFeedbackMessage(null);
        }}
        className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
          totalBadgeCount > 0
            ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-400/30"
            : "text-white/70 hover:text-white hover:bg-white/10 border border-white/10"
        }`}
        title="Central de Avisos e Permutas"
        aria-label="Notificações de Permutas"
      >
        <Bell className="w-5 h-5" />
        {totalBadgeCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center text-white shadow-md ${
              pendingMySignature.length > 0
                ? "bg-red-600 animate-pulse ring-2 ring-red-400/50"
                : "bg-indigo-600 ring-2 ring-indigo-400/40"
            }`}
          >
            {totalBadgeCount}
          </span>
        )}
      </button>

      {/* Painel Flutuante / Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-[92vw] sm:w-[420px] max-w-[440px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 flex flex-col max-h-[85vh]"
            >
              {/* Header do Painel */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider">
                      Central da Tropa
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold">
                      Notificações e Trocas de Serviço
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Feedback Toast */}
              {feedbackMessage && (
                <div
                  className={`p-3 text-xs font-bold flex items-center gap-2 border-b animate-in fade-in ${
                    feedbackMessage.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200"
                      : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200"
                  }`}
                >
                  {feedbackMessage.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  )}
                  <span className="flex-1">{feedbackMessage.text}</span>
                </div>
              )}

              {/* Seletor de Abas */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-1 gap-1">
                <button
                  onClick={() => setActiveTab("minhas_assinaturas")}
                  className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === "minhas_assinaturas"
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Pendentes</span>
                  {pendingMySignature.length > 0 && (
                    <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black">
                      {pendingMySignature.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("historico")}
                  className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === "historico"
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Avisos e Decisões</span>
                  {recentlyDecided.length > 0 && (
                    <span className="bg-slate-400 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black">
                      {recentlyDecided.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Lista de Notificações */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[380px] custom-scrollbar">
                {activeTab === "minhas_assinaturas" ? (
                  pendingMySignature.length === 0 ? (
                    <div className="py-8 text-center text-slate-400">
                      <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500/60" />
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Nenhuma assinatura pendente!
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Você está em dia com todas as solicitações de permutas.
                      </p>
                    </div>
                  ) : (
                    pendingMySignature.map((permuta) => {
                      const isReq = normalizeRg(permuta.requesterRg) === myCleanRg;
                      const colleagueName = isReq
                        ? permuta.substituteName || "Militar Substituto"
                        : permuta.requesterName || "Militar Solicitante";
                      const colleagueRg = isReq ? permuta.substituteRg : permuta.requesterRg;
                      const isProcessing = actionLoadingId === permuta.id;

                      return (
                        <div
                          key={permuta.id}
                          className="bg-amber-50/70 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-700/60 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white px-2 py-0.5 rounded shadow-xs">
                              {isReq ? "Sua Solicitação Aguardando Você" : "Pedido de Permuta para Você"}
                            </span>
                            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {permuta.date}
                            </span>
                          </div>

                          <div className="text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                            {isReq ? (
                              <span>
                                Você cadastrou esta troca com <strong>{colleagueName}</strong> (RG: {colleagueRg}) e precisa confirmar sua assinatura.
                              </span>
                            ) : (
                              <span>
                                O militar <strong>{colleagueName}</strong> (RG: {colleagueRg}) solicitou troca de serviço com você para o dia{" "}
                                <strong>{permuta.date}</strong> (Ala {permuta.originalAla || "N/A"}).
                              </span>
                            )}
                          </div>

                          {/* Ações Diretas */}
                          <div className="flex items-center gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-800/40">
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleSign(permuta.id!)}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                            >
                              {isProcessing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <PenTool className="w-3.5 h-3.5" />
                              )}
                              <span>Assinar Permuta</span>
                            </button>

                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleRefuse(permuta.id!)}
                              className="bg-slate-200 hover:bg-red-50 text-slate-700 hover:text-red-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-red-950/40 dark:hover:text-red-300 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer border border-transparent hover:border-red-300"
                              title="Recusar pedido"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Recusar</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )
                ) : (
                  // Aba Histórico / Decisões do Escalante
                  <div className="space-y-2">
                    {/* Aguardando outro militar */}
                    {pendingOtherSignature.map((permuta) => (
                      <div
                        key={permuta.id}
                        className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start gap-2.5 text-xs"
                      >
                        <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-bold text-slate-800 dark:text-slate-200">
                            Aguardando assinatura do colega
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Permuta do dia {permuta.date} com {permuta.substituteName || permuta.requesterName}.
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Na Mesa do Escalante */}
                    {inAnalysisByEscalante.map((permuta) => (
                      <div
                        key={permuta.id}
                        className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-start gap-2.5 text-xs"
                      >
                        <Hourglass className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-bold text-indigo-900 dark:text-indigo-200">
                            Na Mesa do Escalante (Em Análise)
                          </p>
                          <p className="text-[10px] text-indigo-700/80 dark:text-indigo-300 mt-0.5">
                            Ambos militares assinaram. Aguardando deferimento para o dia {permuta.date}.
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Decisões Recentes */}
                    {recentlyDecided.map((permuta) => {
                      const isAccepted = permuta.status === PermutaStatus.ACCEPTED;
                      const isRejected = permuta.status === PermutaStatus.REJECTED;

                      return (
                        <div
                          key={permuta.id}
                          className={`p-3 rounded-xl border flex items-start justify-between gap-2 text-xs relative ${
                            isAccepted
                              ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                              : isRejected
                              ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                              : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {isAccepted ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            ) : isRejected ? (
                              <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <p
                                className={`font-black uppercase tracking-wider text-[11px] ${
                                  isAccepted
                                    ? "text-emerald-800 dark:text-emerald-300"
                                    : isRejected
                                    ? "text-red-800 dark:text-red-300"
                                    : "text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                {isAccepted ? "✓ Permuta Deferida!" : isRejected ? "✕ Permuta Indeferida" : "Permuta Cancelada"}
                              </p>
                              <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                                Serviço do dia {permuta.date} ({permuta.substituteName || permuta.requesterName}).
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => dismissNotification(permuta.id!, permuta.status)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-colors"
                            title="Descartar aviso"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}

                    {pendingOtherSignature.length === 0 &&
                      inAnalysisByEscalante.length === 0 &&
                      recentlyDecided.length === 0 && (
                        <div className="py-6 text-center text-slate-400 text-xs">
                          Nenhum histórico recente de permutas.
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Rodapé do Painel */}
              {onNavigateToPermutas && (
                <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-center">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onNavigateToPermutas();
                    }}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Ver Quadro Geral de Permutas →
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
