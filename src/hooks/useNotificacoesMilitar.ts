import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { format, subDays } from "date-fns";
import { db } from "../lib/firebase";
import { PermutaRequest, PermutaStatus, UserProfile } from "../types";
import { normalizeRg, cleanUndefined } from "../lib/utils";
import {
  initPushNotifications,
  notifyNovaPermutaRecebida,
  notifyPermutaDeferida,
} from "../lib/pushNotifications";

export interface UseNotificacoesMilitarReturn {
  notifications: PermutaRequest[];
  pendingMySignature: PermutaRequest[];
  pendingOtherSignature: PermutaRequest[];
  inAnalysisByEscalante: PermutaRequest[];
  recentlyDecided: PermutaRequest[];
  totalBadgeCount: number;
  loading: boolean;
  signPermuta: (permutaId: string) => Promise<{ success: boolean; message: string }>;
  refusePermuta: (permutaId: string, motivo?: string) => Promise<{ success: boolean; message: string }>;
  dismissNotification: (id: string, status?: string) => void;
}

export function useNotificacoesMilitar(
  profile: UserProfile | null | undefined
): UseNotificacoesMilitarReturn {
  const [permutas, setPermutas] = useState<PermutaRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedNotifs, setDismissedNotifs] = useState<string[]>(() => {
    try {
      if (typeof window !== "undefined") {
        return JSON.parse(localStorage.getItem("dismissed_notifs") || "[]");
      }
    } catch {}
    return [];
  });

  const isInitialLoadRef = useRef(true);
  const knownPendingIdsRef = useRef<Set<string>>(new Set());
  const knownAcceptedIdsRef = useRef<Set<string>>(new Set());

  // Request permissions once on mount
  useEffect(() => {
    initPushNotifications();
  }, []);

  const myCleanRg = useMemo(() => normalizeRg(profile?.rg), [profile?.rg]);

  useEffect(() => {
    if (!myCleanRg) {
      setPermutas([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const sixtyDaysAgo = format(subDays(new Date(), 60), "yyyy-MM-dd");

    const q = query(
      collection(db, "permutas"),
      where("date", ">=", sixtyDaysAgo),
      orderBy("date", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!isMounted) return;
        const all = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        })) as PermutaRequest[];

        // Filter permutas belonging to this user
        const mine = all.filter((p) => {
          const reqRg = normalizeRg(p.requesterRg);
          const subRg = normalizeRg(p.substituteRg);
          return reqRg === myCleanRg || subRg === myCleanRg;
        });

        // Trigger device push / chime if new items arrive
        if (!isInitialLoadRef.current) {
          mine.forEach((p) => {
            if (!p.id) return;
            const isReq = normalizeRg(p.requesterRg) === myCleanRg;
            const isSub = normalizeRg(p.substituteRg) === myCleanRg;
            const needsSign =
              p.status === PermutaStatus.PENDING &&
              ((isSub && !p.substituteSigned) || (isReq && !p.requesterSigned));

            if (needsSign && !knownPendingIdsRef.current.has(p.id)) {
              const solicitante = isReq
                ? p.substituteName || "Militar"
                : p.requesterName || "Militar";
              notifyNovaPermutaRecebida({
                solicitante,
                data: p.date,
                ala: p.originalAla,
              });
            }

            if (
              p.status === PermutaStatus.ACCEPTED &&
              !knownAcceptedIdsRef.current.has(p.id)
            ) {
              notifyPermutaDeferida({
                data: p.date,
                escalante: p.acceptedByName || p.acceptedById,
              });
            }
          });
        }

        // Update tracking sets
        const currentPending = new Set<string>();
        const currentAccepted = new Set<string>();
        mine.forEach((p) => {
          if (!p.id) return;
          const isReq = normalizeRg(p.requesterRg) === myCleanRg;
          const isSub = normalizeRg(p.substituteRg) === myCleanRg;
          const needsSign =
            p.status === PermutaStatus.PENDING &&
            ((isSub && !p.substituteSigned) || (isReq && !p.requesterSigned));
          if (needsSign) currentPending.add(p.id);
          if (p.status === PermutaStatus.ACCEPTED) currentAccepted.add(p.id);
        });

        knownPendingIdsRef.current = currentPending;
        knownAcceptedIdsRef.current = currentAccepted;
        isInitialLoadRef.current = false;

        setPermutas(mine);
        setLoading(false);
      },
      (error) => {
        console.warn("[useNotificacoesMilitar] Erro ao sincronizar permutas:", error.message);
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [myCleanRg]);

  const dismissNotification = useCallback((id: string, status?: string) => {
    const key = status ? `${id}_${status}` : id;
    setDismissedNotifs((prev) => {
      const next = Array.from(new Set([...prev, key, id]));
      try {
        localStorage.setItem("dismissed_notifs", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Classify permutas into structured notification buckets
  const pendingMySignature = useMemo(() => {
    if (!myCleanRg) return [];
    return permutas.filter((p) => {
      if (p.status !== PermutaStatus.PENDING) return false;
      const isReq = normalizeRg(p.requesterRg) === myCleanRg;
      const isSub = normalizeRg(p.substituteRg) === myCleanRg;
      return (isSub && !p.substituteSigned) || (isReq && !p.requesterSigned);
    });
  }, [permutas, myCleanRg]);

  const pendingOtherSignature = useMemo(() => {
    if (!myCleanRg) return [];
    return permutas.filter((p) => {
      if (p.status !== PermutaStatus.PENDING) return false;
      const isReq = normalizeRg(p.requesterRg) === myCleanRg;
      const isSub = normalizeRg(p.substituteRg) === myCleanRg;
      return (isReq && !p.substituteSigned) || (isSub && !p.requesterSigned);
    });
  }, [permutas, myCleanRg]);

  const inAnalysisByEscalante = useMemo(() => {
    return permutas.filter((p) => {
      return (
        p.status === PermutaStatus.PENDING &&
        Boolean(p.requesterSigned) &&
        Boolean(p.substituteSigned)
      );
    });
  }, [permutas]);

  const recentlyDecided = useMemo(() => {
    return permutas.filter((p) => {
      if (p.status === PermutaStatus.PENDING) return false;
      const notifKey = `${p.id}_${p.status}`;
      return !dismissedNotifs.includes(notifKey) && !dismissedNotifs.includes(p.id!);
    });
  }, [permutas, dismissedNotifs]);

  const totalBadgeCount = useMemo(() => {
    return pendingMySignature.length + recentlyDecided.length;
  }, [pendingMySignature.length, recentlyDecided.length]);

  // Execute direct signature
  const signPermuta = useCallback(
    async (permutaId: string): Promise<{ success: boolean; message: string }> => {
      if (!myCleanRg || !permutaId) {
        return { success: false, message: "Militar não autenticado ou permuta inválida." };
      }

      const target = permutas.find((p) => p.id === permutaId);
      if (!target) {
        return { success: false, message: "Permuta não encontrada." };
      }

      const isReq = normalizeRg(target.requesterRg) === myCleanRg;
      const isSub = normalizeRg(target.substituteRg) === myCleanRg;

      if (!isReq && !isSub) {
        return { success: false, message: "Você não faz parte desta solicitação de permuta." };
      }

      try {
        const nextReqSigned = isReq ? true : Boolean(target.requesterSigned);
        const nextSubSigned = isSub ? true : Boolean(target.substituteSigned);

        await updateDoc(
          doc(db, "permutas", permutaId),
          cleanUndefined({
            requesterSigned: nextReqSigned,
            substituteSigned: nextSubSigned,
            updatedAt: serverTimestamp(),
          })
        );

        const bothSigned = nextReqSigned && nextSubSigned;
        return {
          success: true,
          message: bothSigned
            ? "Permuta assinada com sucesso! Ambas assinaturas concluídas e enviada ao Escalante."
            : "Assinatura registrada com sucesso! Aguardando a assinatura do outro militar.",
        };
      } catch (err: any) {
        return { success: false, message: `Erro ao assinar permuta: ${err.message}` };
      }
    },
    [permutas, myCleanRg]
  );

  // Execute refusal / cancellation
  const refusePermuta = useCallback(
    async (
      permutaId: string,
      motivo = "Recusada pelo militar participante"
    ): Promise<{ success: boolean; message: string }> => {
      if (!myCleanRg || !permutaId) {
        return { success: false, message: "Militar não autenticado ou permuta inválida." };
      }

      const target = permutas.find((p) => p.id === permutaId);
      if (!target) {
        return { success: false, message: "Permuta não encontrada." };
      }

      try {
        await updateDoc(
          doc(db, "permutas", permutaId),
          cleanUndefined({
            status: PermutaStatus.CANCELLED,
            cancelledByRg: myCleanRg,
            cancellationReason: motivo,
            updatedAt: serverTimestamp(),
          })
        );

        return {
          success: true,
          message: "A permuta foi recusada e o solicitante será informado.",
        };
      } catch (err: any) {
        return { success: false, message: `Erro ao recusar permuta: ${err.message}` };
      }
    },
    [permutas, myCleanRg]
  );

  return {
    notifications: permutas,
    pendingMySignature,
    pendingOtherSignature,
    inAnalysisByEscalante,
    recentlyDecided,
    totalBadgeCount,
    loading,
    signPermuta,
    refusePermuta,
    dismissNotification,
  };
}
