import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '../types';

interface MilitarContextType {
  militars: UserProfile[];
  loading: boolean;
  refreshMilitars: (rg?: string) => Promise<void>;
  updateMilitarLocal: (rg: string, updates: Partial<UserProfile>) => void;
}

const MilitarContext = createContext<MilitarContextType | undefined>(undefined);

export function MilitarProvider({ children }: { children: ReactNode }) {
  const [militars, setMilitars] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMilitars = async (rg?: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const cacheKey = rg ? `militars_data_cache_${rg}` : 'militars_data_cache';
      const cacheTimeKey = rg ? `militars_data_time_${rg}` : 'militars_data_time';
      const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

      // Try reading from cache first if silent is false (initial load)
      if (!silent) {
        const cachedMilitars = localStorage.getItem(cacheKey);
        const cachedTime = localStorage.getItem(cacheTimeKey);
        if (cachedMilitars && cachedTime) {
          const age = Date.now() - parseInt(cachedTime, 10);
          if (age < CACHE_TTL_MS) {
             setMilitars(JSON.parse(cachedMilitars));
             setLoading(false);
             // Keep loading in background silently to ensure it's up to date eventually but don't block
             silent = true; 
          }
        }
      }

      const url = rg ? `/api/militar?rg=${rg}` : '/api/militar';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.members) {
        setMilitars(data.members);
        // Update cache
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data.members));
          localStorage.setItem(cacheTimeKey, Date.now().toString());
        } catch (e) {
          console.warn('LocalStorage is full or unavailable');
        }
      }
    } catch (e) {
      console.error('Error fetching militars:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMilitars();
  }, []);

  const updateMilitarLocal = (rg: string, updates: Partial<UserProfile>) => {
    setMilitars(prev => prev.map(m => {
      // Comparação flexível considerando null/undefined
      if (m.rg === rg || m.uid === rg || (m.rg && m.rg.toString() === rg.toString())) {
        return { ...m, ...updates };
      }
      return m;
    }));
  };

  return (
    <MilitarContext.Provider value={{
      militars,
      loading,
      refreshMilitars: (rg?: string) => fetchMilitars(rg, true),
      updateMilitarLocal
    }}>
      {children}
    </MilitarContext.Provider>
  );
}

export function useMilitars() {
  const context = useContext(MilitarContext);
  if (context === undefined) {
    throw new Error('useMilitars must be used within a MilitarProvider');
  }
  return context;
}
