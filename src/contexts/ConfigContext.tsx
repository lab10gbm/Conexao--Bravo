import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { setGlobalAlaConfig } from '../lib/utils';

interface ConfigContextType {
  activeMonths: number[];
  escalanteRGs: string[];
  appVisibility: Record<string, string[]> | null;
  alaConfig: { referenceYear: number; startAla: number } | null;
  vacationSettings: any;
  loading: boolean;
  refreshConfigs: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [activeMonths, setActiveMonths] = useState<number[]>([]);
  const [escalanteRGs, setEscalanteRGs] = useState<string[]>([]);
  const [appVisibility, setAppVisibility] = useState<Record<string, string[]> | null>(null);
  const [alaConfig, setAlaConfig] = useState<{ referenceYear: number; startAla: number } | null>(null);
  const [vacationSettings, setVacationSettings] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);

  const loadConfigs = async (forceNetwork = false) => {
    // We rely entirely on onSnapshot, so manual loading and localStorage
    // caching have been removed to prevent state-fighting and delays.
    // Initial loading state will be set to false rapidly by listeners.
  };

  useEffect(() => {
    // Setup real-time listeners for all configs to be our single source of truth
    const unsubMonths = onSnapshot(doc(db, 'config', 'active_months'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.months)) {
          setActiveMonths(data.months.map(Number));
        } else if (Array.isArray(data)) {
          setActiveMonths(data.map(Number));
        }
      }
      setLoading(false);
    });

    const unsubRoles = onSnapshot(doc(db, 'config', 'roles'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.escalanteRGs) setEscalanteRGs(data.escalanteRGs);
        else if (Array.isArray(data.roles)) setEscalanteRGs(data.roles);
      }
    });

    const unsubAla = onSnapshot(doc(db, 'config', 'ala_config'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as any;
        setAlaConfig(data);
        setGlobalAlaConfig(data.referenceYear || 2026, data.startAla || 2);
      }
    });

    const unsubVis = onSnapshot(doc(db, 'config', 'app_visibility'), (snap) => {
      if (snap.exists()) {
         const data = snap.data() as any;
         setAppVisibility(data.visibility || data);
      }
    });
    
    const unsubVac = onSnapshot(doc(db, 'config', 'vacation_settings'), (snap) => {
      if (snap.exists()) {
         setVacationSettings(snap.data() as any);
      }
    });

    return () => {
      unsubMonths();
      unsubRoles();
      unsubAla();
      unsubVis();
      unsubVac();
    };
  }, []);

  const refreshConfigs = async () => {
    setLoading(true);
    await loadConfigs(true);
  };

  const value = React.useMemo(() => ({
    activeMonths,
    escalanteRGs,
    appVisibility,
    alaConfig,
    vacationSettings,
    loading,
    refreshConfigs
  }), [activeMonths, escalanteRGs, appVisibility, alaConfig, vacationSettings, loading]);

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useAppConfig() {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useAppConfig must be used within a ConfigProvider');
  }
  return context;
}
