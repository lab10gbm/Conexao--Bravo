import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { setGlobalAlaConfig, getStartAlaForYear } from '../lib/utils';

export interface AlaConfigData {
  referenceYear: number;
  startAla: number;
  autoTransition?: boolean;
  anchorYear?: number;
  anchorStartAla?: number;
  rawReferenceYear?: number;
  rawStartAla?: number;
}

interface ConfigContextType {
  activeMonths: number[];
  activePeriods: string[];
  autoRolloverMonths: boolean;
  escalanteRGs: string[];
  appVisibility: Record<string, string[]> | null;
  alaConfig: AlaConfigData | null;
  vacationSettings: any;
  loading: boolean;
  refreshConfigs: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [activeMonths, setActiveMonths] = useState<number[]>([]);
  const [activePeriods, setActivePeriods] = useState<string[]>([]);
  const [autoRolloverMonths, setAutoRolloverMonths] = useState<boolean>(true);
  const [escalanteRGs, setEscalanteRGs] = useState<string[]>([]);
  const [appVisibility, setAppVisibility] = useState<Record<string, string[]> | null>(null);
  const [alaConfig, setAlaConfig] = useState<AlaConfigData | null>({
    referenceYear: 2026,
    startAla: 2,
    autoTransition: true,
  });
  const [vacationSettings, setVacationSettings] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);

  const loadConfigs = async (forceNetwork = false) => {
    // We rely entirely on onSnapshot, so manual loading and localStorage
    // caching have been removed to prevent state-fighting and delays.
    // Initial loading state will be set to false rapidly by listeners.
  };

  useEffect(() => {
    // Safety timeout: never block the app loading state for more than 1.5s
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    // Setup real-time listeners for all configs to be our single source of truth
    const unsubMonths = onSnapshot(doc(db, 'config', 'active_months'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        let months: number[] = [];
        let periods: string[] = [];

        if (Array.isArray(data.activePeriods)) {
          periods = data.activePeriods;
        }
        if (Array.isArray(data.months)) {
          months = data.months.map(Number);
        } else if (Array.isArray(data)) {
          months = data.map(Number);
        }

        // Se ainda não existirem activePeriods gravados no Firestore, gera inteligentemente a partir dos meses
        if (periods.length === 0 && months.length > 0) {
          const curYear = new Date().getFullYear();
          periods = months.map(m => `${curYear}-${String(m + 1).padStart(2, '0')}`);
        }

        setActiveMonths(months);
        setActivePeriods(periods);
        setAutoRolloverMonths(Boolean(data.autoRollover ?? true));
      }
      setLoading(false);
    }, (err) => {
      console.warn('[ConfigContext] active_months listener error:', err.message);
      setLoading(false);
    });

    const unsubRoles = onSnapshot(doc(db, 'config', 'roles'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.escalanteRGs) setEscalanteRGs(data.escalanteRGs);
        else if (Array.isArray(data.roles)) setEscalanteRGs(data.roles);
      }
    }, (err) => console.warn('[ConfigContext] roles listener error:', err.message));

    const unsubAla = onSnapshot(doc(db, 'config', 'ala_config'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as any;
        const autoTransition = data.autoTransition !== false;
        const calendarYear = new Date().getFullYear();
        let refYear = data.referenceYear || 2026;
        let startAla = data.startAla || 2;

        // Se a transição automática estiver ativa e o calendário civil virou (ex: 2027 > 2026)
        if (autoTransition && calendarYear > refYear) {
          refYear = calendarYear;
          startAla = getStartAlaForYear(calendarYear, data.anchorYear || 2026, data.anchorStartAla || 2);
        }

        setAlaConfig({
          referenceYear: refYear,
          startAla: startAla,
          autoTransition,
          anchorYear: data.anchorYear || 2026,
          anchorStartAla: data.anchorStartAla || 2,
          rawReferenceYear: data.referenceYear || 2026,
          rawStartAla: data.startAla || 2,
        });
        setGlobalAlaConfig(refYear, startAla);
      }
    }, (err) => console.warn('[ConfigContext] ala_config listener error:', err.message));

    const unsubVis = onSnapshot(doc(db, 'config', 'app_visibility'), (snap) => {
      if (snap.exists()) {
         const data = snap.data() as any;
         setAppVisibility(data.visibility || data);
      }
    }, (err) => console.warn('[ConfigContext] app_visibility listener error:', err.message));
    
    const unsubVac = onSnapshot(doc(db, 'config', 'vacation_settings'), (snap) => {
      if (snap.exists()) {
         setVacationSettings(snap.data() as any);
      }
    }, (err) => console.warn('[ConfigContext] vacation_settings listener error:', err.message));

    return () => {
      clearTimeout(safetyTimer);
      unsubMonths();
      unsubRoles();
      unsubAla();
      unsubVis();
      unsubVac();
    };
  }, []);

  const refreshConfigs = async () => {
    // We rely entirely on onSnapshot, no need to manually refresh or set loading state.
    await loadConfigs(true);
  };

  const value = React.useMemo(() => ({
    activeMonths,
    activePeriods,
    autoRolloverMonths,
    escalanteRGs,
    appVisibility,
    alaConfig,
    vacationSettings,
    loading,
    refreshConfigs
  }), [activeMonths, activePeriods, autoRolloverMonths, escalanteRGs, appVisibility, alaConfig, vacationSettings, loading]);

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
