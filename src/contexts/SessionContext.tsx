import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { UserProfile } from "../types";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged, signOut, signInAnonymously } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useAppConfig } from "./ConfigContext";
import { normalizeObm, normalizeRg } from "../lib/utils";
import { OBM_HIERARCHY } from "../constants";

export interface SessionContextType {
  user: any;
  profile: UserProfile | null;
  effectiveProfile: UserProfile | null;
  loading: boolean;
  authReady: boolean;
  adminModeActive: boolean;
  setAdminModeActive: React.Dispatch<React.SetStateAction<boolean>>;
  escalanteModeActive: boolean;
  setEscalanteModeActive: React.Dispatch<React.SetStateAction<boolean>>;
  obmContext: string;
  setObmContext: React.Dispatch<React.SetStateAction<string>>;
  availableObms: string[];
  isOfficerMode: boolean;
  simulatedVersion: string;
  setSimulatedVersion: React.Dispatch<React.SetStateAction<string>>;
  handleSignOut: () => Promise<void>;
  setProfile: (profile: UserProfile | null) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem("militar_profile");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.rg === "54444" || parsed.rg === 54444)) {
          parsed.ala = "EXP";
        }
        return parsed;
      }
    } catch {}
    return null;
  });

  const [loading, setLoading] = useState(() => !localStorage.getItem("militar_profile"));
  const [authReady, setAuthReady] = useState(false);
  const [adminModeActive, setAdminModeActive] = useState(false);
  const [escalanteModeActive, setEscalanteModeActive] = useState(false);
  const [simulatedVersion, setSimulatedVersion] = useState<string>("");
  const [obmContext, setObmContext] = useState<string>("");

  const { escalanteRGs } = useAppConfig();

  const simulatedAla =
    simulatedVersion !== "OFICIAIS" && simulatedVersion !== "" ? simulatedVersion : "";

  const effectiveProfile = useMemo(() => {
    if (!profile) return null;
    return {
      ...profile,
      isAdmin:
        (profile.isAdmin || (profile.adminObms && profile.adminObms.length > 0)) &&
        adminModeActive,
      isEscalante:
        (profile.isEscalante || (profile.escalanteObms && profile.escalanteObms.length > 0)) &&
        escalanteModeActive,
      ala:
        (profile.isAdmin || (profile.adminObms && profile.adminObms.length > 0)) && simulatedAla
          ? simulatedAla
          : profile.ala,
    };
  }, [profile, adminModeActive, escalanteModeActive, simulatedAla]);

  const isOfficerMode =
    simulatedVersion === "OFICIAIS" || effectiveProfile?.isOficial || false;

  const allObms = Object.keys(OBM_HIERARCHY);

  const availableObms = useMemo(() => {
    if (profile?.isAdmin || profile?.isEscalante) {
      return ["GLOBAL", ...allObms];
    }
    return Array.from(
      new Set([
        normalizeObm(profile?.obm),
        ...(profile?.adminObms || []).map((o) => normalizeObm(o)),
        ...(profile?.escalanteObms || []).map((o) => normalizeObm(o)),
      ])
    ).filter(Boolean);
  }, [profile, allObms]);

  // Sync profile with escalante / admin privileges
  useEffect(() => {
    if (profile?.rg) {
      const isLegacyEscalante = escalanteRGs.includes(profile.rg) || profile.rg === "54444";
      const isLegacyAdmin = profile.rg === "54444";

      let changed = false;
      const nextProfile = { ...profile };

      if (isLegacyEscalante && !profile.isEscalante) {
        nextProfile.isEscalante = true;
        changed = true;
      }
      if (isLegacyAdmin && !profile.isAdmin) {
        nextProfile.isAdmin = true;
        changed = true;
      }

      if (changed) {
        setProfile(nextProfile);
        try {
          localStorage.setItem("militar_profile", JSON.stringify(nextProfile));
        } catch {}
      }
    }
  }, [profile?.rg, profile?.isEscalante, profile?.isAdmin, escalanteRGs]);

  // Auth bootstrap
  useEffect(() => {
    let isMounted = true;
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
        setAuthReady(true);
      }
    }, 5000);

    if (!auth.currentUser) {
      signInAnonymously(auth).catch((err) => {
        console.warn("[Auth] Client anonymous auth notice:", err?.message || err);
      });
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      if (!isMounted) return;
      setUser(u);
      setAuthReady(true);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
      clearTimeout(safetyTimeout);
    };
  }, []);

  // Sync OBM context default
  useEffect(() => {
    if (profile) {
      const rawUserObm = profile.obm ? profile.obm.trim() : "10º GBM";
      if (!obmContext || (!adminModeActive && !escalanteModeActive && obmContext !== rawUserObm)) {
        setObmContext(rawUserObm);
      }
    }
  }, [profile?.obm, adminModeActive, escalanteModeActive, obmContext]);

  // Listen to profile updates in Firestore
  useEffect(() => {
    if (profile?.rg && !loading && authReady) {
      const safeRg = normalizeRg(profile.rg);
      if (!safeRg) return;

      const profileDocRef = doc(db, "users", safeRg);
      const unsub = onSnapshot(
        profileDocRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setProfile((prev) => {
              if (!prev) return null;
              const hasChanged =
                prev.ala !== data.ala ||
                prev.name !== data.name ||
                prev.rank !== data.rank ||
                prev.obm !== data.obm ||
                prev.isAdmin !== data.isAdmin ||
                prev.isEscalante !== data.isEscalante;

              if (hasChanged) {
                const updated = { ...prev, ...data };
                try {
                  localStorage.setItem("militar_profile", JSON.stringify(updated));
                } catch {}
                return updated;
              }
              return prev;
            });
          }
        },
        (err) => {
          console.warn("[Auth] Failed to subscribe to profile updates:", err.message);
        }
      );
      return () => unsub();
    }
  }, [profile?.rg, loading, authReady]);

  const handleSignOut = async () => {
    try {
      localStorage.removeItem("militar_profile");
      localStorage.removeItem("militar_verify_code");
      localStorage.removeItem("cache_permutas");
    } catch {}
    setProfile(null);
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("SignOut error:", e);
    }
  };

  return (
    <SessionContext.Provider
      value={{
        user,
        profile,
        effectiveProfile,
        loading,
        authReady,
        adminModeActive,
        setAdminModeActive,
        escalanteModeActive,
        setEscalanteModeActive,
        obmContext,
        setObmContext,
        availableObms,
        isOfficerMode,
        simulatedVersion,
        setSimulatedVersion,
        handleSignOut,
        setProfile,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
