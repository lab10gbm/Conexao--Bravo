import { useEffect, useState, useRef } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";
import { UserProfile } from "../types";

export function useViaturaAlerts(user: UserProfile | null) {
  const [activeAlert, setActiveAlert] = useState<{
    viatura: string;
    emittedBy: string;
    timestamp: number;
  } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      
      const docData = snapshot.docs[0].data();
      const time = docData.timestamp?.toMillis?.() || 0;

      // se o alerta for de menos de 15 segundos atrás
      if (Date.now() - time < 15000) {
        const viatura = docData.viatura;

        let isAssigned = false;
        try {
          const gDoc = await getDoc(doc(db, "guarnicoes", "ativas"));
          if (gDoc.exists()) {
             const guarnicoesData = gDoc.data();
             const rgsInViatura = guarnicoesData[viatura] || [];
             const safeRg = String(user.rg)
                .replace(/^0+/, "")
                .replace(/\D/g, "");
             const formattedRgForSearch = safeRg.length < 5 ? safeRg.padStart(5, "0") : safeRg;

             if (
                rgsInViatura.includes(formattedRgForSearch) ||
                rgsInViatura.includes(user.rg) ||
                rgsInViatura.includes(safeRg)
             ) {
                isAssigned = true;
             }
          }
        } catch (e) {
          console.error("Erro ao checar guarnições", e);
        }

        if (isAssigned) {
          setActiveAlert({
            viatura,
            emittedBy: docData.emittedBy,
            timestamp: time,
          });
          audioRef.current
            ?.play()
            .catch((e) => console.warn("Audio auto-play prevented", e));
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

  return { activeAlert, dismissAlert };
}
