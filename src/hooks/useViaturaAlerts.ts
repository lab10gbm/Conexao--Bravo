import { useEffect, useState, useRef, useCallback } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  limit,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { UserProfile } from "../types";

export function useViaturaAlerts(user: UserProfile | null) {
  const [activeAlert, setActiveAlert] = useState<{
    id?: string;
    viatura: string;
    emittedBy: string;
    timestamp: number;
  } | null>(null);
  
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem("cbmerj_alert_sound_muted") === "true";
    } catch {
      return false;
    }
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Synchronize mute across tabs or components
  useEffect(() => {
    const handleSync = () => {
      try {
        const muted = localStorage.getItem("cbmerj_alert_sound_muted") === "true";
        setIsMuted(muted);
        if (muted && audioRef.current) {
          audioRef.current.pause();
        }
      } catch {}
    };

    window.addEventListener("storage", handleSync);
    window.addEventListener("cbmerj_alert_sound_toggle", handleSync);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("cbmerj_alert_sound_toggle", handleSync);
    };
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("cbmerj_alert_sound_muted", String(next));
        window.dispatchEvent(new Event("cbmerj_alert_sound_toggle"));
      } catch {}
      if (next && audioRef.current) {
        audioRef.current.pause();
      }
      return next;
    });
  }, []);

  useEffect(() => {
    // Create audio element
    const audio = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
    );
    audio.loop = true;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    let active = true;

    const q = query(
      collection(db, "viatura_alerts"),
      orderBy("timestamp", "desc"),
      limit(1)
    );

    const unsubAlerts = onSnapshot(q, async (snapshot) => {
      if (!active || snapshot.empty) return;
      
      const docSnap = snapshot.docs[0];
      const docData = docSnap.data();

      // Check if alert was cancelled or deactivated
      if (docData.active === false || docData.cancelled === true) {
        setActiveAlert((prev) => (prev?.id === docSnap.id ? null : prev));
        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.currentTime = 0;
        return;
      }
      
      // Check for actual new documents to avoid re-triggering old alerts
      const hasNew = snapshot.docChanges().some(change => change.type === 'added');
      const time = docData.timestamp?.toMillis?.() || Date.now();

      // Relax the time check to 60 seconds or just rely on 'hasNew' if it's not the initial load
      if (hasNew && (Date.now() - time < 60000 || !docData.timestamp)) {
        const viatura = docData.viatura;

        let isAssigned = false;
        try {
          // 1. Check in guarnicoes/ativas
          const gDoc = await getDoc(doc(db, "guarnicoes", "ativas"));
          if (gDoc.exists()) {
             const guarnicoesData = gDoc.data();
             const rgsInViatura = guarnicoesData[viatura] || [];
             const safeRg = String(user.rg)
                .replace(/^0+/, "")
                .replace(/\D/g, "");
             
             if (
                Array.isArray(rgsInViatura) && rgsInViatura.some((item: any) => {
                   const itemRg = String(typeof item === 'string' ? item : item.rg);
                   const safeItemRg = itemRg.replace(/^0+/, "").replace(/\D/g, "");
                   return safeItemRg === safeRg || itemRg === user.rg;
                })
             ) {
                isAssigned = true;
             }
          }
        } catch (e) {
          console.error("Erro ao checar guarnições", e);
        }

        if (isAssigned) {
          setActiveAlert({
            id: docSnap.id,
            viatura,
            emittedBy: docData.emittedBy,
            timestamp: time,
          });

          // Play sound only if not muted
          const currentlyMuted = localStorage.getItem("cbmerj_alert_sound_muted") === "true";
          if (!currentlyMuted && audioRef.current) {
            audioRef.current
              .play()
              .catch((e) => console.warn("Audio auto-play prevented", e));
          }
        }
      }
    }, (error) => {
      console.warn("Viatura fetch error (client):", error);
    });

    return () => {
      active = false;
      unsubAlerts();
    };
  }, [user?.rg]);

  // Clear alert if older than 20 seconds
  useEffect(() => {
    if (!activeAlert) return;
    const intervalId = setInterval(() => {
      if (Date.now() - activeAlert.timestamp > 20000) {
        setActiveAlert(null);
        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.currentTime = 0;
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [activeAlert]);

  const dismissAlert = () => {
    setActiveAlert(null);
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
  };

  return { activeAlert, dismissAlert, isMuted, toggleMute };
}
