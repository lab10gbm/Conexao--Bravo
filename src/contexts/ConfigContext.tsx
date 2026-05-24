import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { setGlobalAlaConfig } from '../lib/utils';

interface ConfigContextType {
  activeMonths: string[];
  escalanteRGs: string[];
  appVisibility: Record<string, string[]> | null;
  alaConfig: { referenceYear: number; startAla: number } | null;
  loading: boolean;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [activeMonths, setActiveMonths] = useState<string[]>([]);
  const [escalanteRGs, setEscalanteRGs] = useState<string[]>([]);
  const [appVisibility, setAppVisibility] = useState<Record<string, string[]> | null>(null);
  const [alaConfig, setAlaConfig] = useState<{ referenceYear: number; startAla: number } | null>(null);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadConfigs() {
      // 1. Try to load from cache
      const cacheKey = 'global_configs_cache';
      const cacheTimeKey = 'global_configs_time';
      
      let fetchedFromCache = false;
      try {
        const cachedStr = localStorage.getItem(cacheKey);
        const timeStr = localStorage.getItem(cacheTimeKey);
        if (cachedStr && timeStr) {
           const age = Date.now() - parseInt(timeStr, 10);
           if (age < CACHE_TTL_MS) {
              const data = JSON.parse(cachedStr);
              if (isMounted) {
                if (data.alaConfig) {
                  setAlaConfig(data.alaConfig);
                  setGlobalAlaConfig(data.alaConfig.referenceYear || 2026, data.alaConfig.startAla || 2);
                }
                if (data.roles) setEscalanteRGs(data.roles);
                if (data.activeMonths) setActiveMonths(data.activeMonths);
                if (data.appVisibility !== undefined) setAppVisibility(data.appVisibility);
                setLoading(false);
                fetchedFromCache = true;
              }
           }
        }
      } catch(e) {}

      // 2. Fetch from network
      try {
        const fetchDoc = async (name: string, docId: string) => {
          try {
            return await getDoc(doc(db, 'config', docId));
          } catch (e: any) {
            console.error(`[ConfigContext] Failed to fetch ${name} (${docId}):`, e.message);
            throw e;
          }
        };

        const [alaSnap, rolesSnap, monthsSnap, visibilitySnap] = await Promise.all([
          fetchDoc('Ala Config', 'ala_config'),
          fetchDoc('Roles', 'roles'),
          fetchDoc('Active Months', 'active_months'),
          fetchDoc('App Visibility', 'app_visibility')
        ]);

        if (!isMounted) return;

        const newData: any = {};

        if (alaSnap.exists()) {
          const data = alaSnap.data() as { referenceYear: number; startAla: number };
          setAlaConfig(data);
          setGlobalAlaConfig(data.referenceYear || 2026, data.startAla || 2);
          newData.alaConfig = data;
        }

        if (rolesSnap.exists()) {
          newData.roles = rolesSnap.data()?.escalanteRGs || [];
          setEscalanteRGs(newData.roles);
        }

        if (monthsSnap.exists()) {
          newData.activeMonths = monthsSnap.data()?.months || [];
          setActiveMonths(newData.activeMonths);
        }

        if (visibilitySnap.exists() && visibilitySnap.data()?.visibility) {
           newData.appVisibility = visibilitySnap.data()?.visibility;
           setAppVisibility(newData.appVisibility);
        } else {
           newData.appVisibility = null;
           setAppVisibility(null);
        }

        try {
          localStorage.setItem(cacheKey, JSON.stringify(newData));
          localStorage.setItem(cacheTimeKey, Date.now().toString());
        } catch(e) {}

      } catch (error) {
        console.warn('[ConfigContext] Error fetching configs:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadConfigs();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ConfigContext.Provider value={{ activeMonths, escalanteRGs, appVisibility, alaConfig, loading: loading }}>
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
