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
      // 1. Try to load from cache
      const cacheKey = 'global_configs_cache';
      const cacheTimeKey = 'global_configs_time';
      
      let fetchedFromCache = false;
      if (!forceNetwork) {
        try {
          const cachedStr = localStorage.getItem(cacheKey);
          const timeStr = localStorage.getItem(cacheTimeKey);
          if (cachedStr && timeStr) {
             const age = Date.now() - parseInt(timeStr, 10);
             if (age < CACHE_TTL_MS) {
                const data = JSON.parse(cachedStr);
                if (data.alaConfig) {
                  setAlaConfig(data.alaConfig);
                  setGlobalAlaConfig(data.alaConfig.referenceYear || 2026, data.alaConfig.startAla || 2);
                }
                if (data.roles) setEscalanteRGs(data.roles);
                if (data.activeMonths) setActiveMonths(data.activeMonths.map(Number));
                if (data.appVisibility !== undefined) setAppVisibility(data.appVisibility);
                if (data.vacationSettings) setVacationSettings(data.vacationSettings);
                setLoading(false);
                fetchedFromCache = true;
             }
          }
        } catch(e) {}
      }

      // 2. Fetch from Firebase directly since the backend cache is disabled due to security rules
      try {
        
        
        const [visSnap, rolSnap, vacSnap, alaSnap, monSnap] = await Promise.all([
          getDoc(doc(db, 'config', 'app_visibility')),
          getDoc(doc(db, 'config', 'roles')),
          getDoc(doc(db, 'config', 'vacation_settings')),
          getDoc(doc(db, 'config', 'ala_config')),
          getDoc(doc(db, 'config', 'active_months'))
        ]);
        
        const newData: any = {};

        if (alaSnap.exists()) {
          const alaData = alaSnap.data() as any;
          setAlaConfig(alaData);
          setGlobalAlaConfig(alaData.referenceYear || 2026, alaData.startAla || 2);
          newData.alaConfig = alaData;
        }

        if (rolSnap.exists()) {
          const rolData = rolSnap.data() as any;
          if (rolData.escalanteRGs) {
            newData.roles = rolData.escalanteRGs;
            setEscalanteRGs(newData.roles);
          } else {
            newData.roles = rolData.roles || [];
            if (Array.isArray(newData.roles)) setEscalanteRGs(newData.roles);
          }
        }

        if (monSnap.exists()) {
          const monData = monSnap.data() as any;
          if (Array.isArray(monData.months)) {
            newData.activeMonths = monData.months.map(Number);
            setActiveMonths(newData.activeMonths);
          } else if (Array.isArray(monData)) {
            // Fallback for legacy format where it might be a direct array
            newData.activeMonths = monData.map(Number);
            setActiveMonths(newData.activeMonths);
          }
        }

        if (visSnap.exists()) {
           const visData = visSnap.data() as any;
           if (visData.visibility) {
             newData.appVisibility = visData.visibility;
             setAppVisibility(newData.appVisibility);
           } else {
             newData.appVisibility = visData;
             setAppVisibility(newData.appVisibility);
           }
        }

        if (vacSnap.exists()) {
           const vacData = vacSnap.data() as any;
           newData.vacationSettings = vacData;
           setVacationSettings(vacData);
        }

        try {
          localStorage.setItem(cacheKey, JSON.stringify(newData));
          localStorage.setItem(cacheTimeKey, Date.now().toString());
        } catch(e) {}

      } catch (error) {
        console.warn('[ConfigContext] Error fetching configs:', error);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    // Initial load
    loadConfigs();

    // Setup real-time listeners for critical configs
    const unsubMonths = onSnapshot(doc(db, 'config', 'active_months'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.months)) {
          setActiveMonths(data.months.map(Number));
        } else if (Array.isArray(data)) {
          setActiveMonths(data.map(Number));
        }
      }
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

    return () => {
      unsubMonths();
      unsubRoles();
      unsubAla();
    };
  }, []);

  const refreshConfigs = async () => {
    setLoading(true);
    await loadConfigs(true);
  };

  return (
    <ConfigContext.Provider value={{ activeMonths, escalanteRGs, appVisibility, alaConfig, vacationSettings, loading, refreshConfigs }}>
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
