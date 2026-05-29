import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { setGlobalAlaConfig } from '../lib/utils';

interface ConfigContextType {
  activeMonths: string[];
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
  const [activeMonths, setActiveMonths] = useState<string[]>([]);
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
                if (data.activeMonths) setActiveMonths(data.activeMonths);
                if (data.appVisibility !== undefined) setAppVisibility(data.appVisibility);
                if (data.vacationSettings) setVacationSettings(data.vacationSettings);
                setLoading(false);
                fetchedFromCache = true;
             }
          }
        } catch(e) {}
      }

      // 2. Fetch from network
      try {
        const res = await fetch('/api/startup');
        const data = await res.json();

        const newData: any = {};

        if (data.ala_config) {
          setAlaConfig(data.ala_config);
          setGlobalAlaConfig(data.ala_config.referenceYear || 2026, data.ala_config.startAla || 2);
          newData.alaConfig = data.ala_config;
        }

        if (data.roles && data.roles.escalanteRGs) {
          newData.roles = data.roles.escalanteRGs;
          setEscalanteRGs(newData.roles);
        } else if (data.roles) {
          newData.roles = data.roles;
          setEscalanteRGs(data.roles);
        }

        if (data.active_months && data.active_months.months) {
          newData.activeMonths = data.active_months.months;
          setActiveMonths(newData.activeMonths);
        } else if (data.active_months) {
          newData.activeMonths = data.active_months;
          setActiveMonths(data.active_months);
        }

        if (data.app_visibility && data.app_visibility.visibility) {
           newData.appVisibility = data.app_visibility.visibility;
           setAppVisibility(newData.appVisibility);
        } else {
           newData.appVisibility = data.app_visibility || null;
           setAppVisibility(newData.appVisibility);
        }

        if (data.vacation_settings) {
           newData.vacationSettings = data.vacation_settings;
           setVacationSettings(data.vacation_settings);
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
    let isMounted = true;
    
    // Initial load
    loadConfigs();

    return () => {
      isMounted = false;
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
