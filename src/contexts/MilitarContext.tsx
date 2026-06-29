import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
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
  const cacheVersionRef = useRef<number>(0);

  const fetchMilitars = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      let rg = '';
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          rg = parsed.rg || '';
        } catch (e) {}
      }

      const res = await fetch(`/api/militar${rg ? `?rg=${rg}` : ''}`);
      if (!res.ok) {
        console.warn('[MilitarContext] Failed to fetch militars:', res.status, res.statusText);
        return;
      }
      const data = await res.json();
      if (data.success && data.members) {
        setMilitars(data.members as UserProfile[]);
      }
    } catch (e) {
      console.error('[MilitarContext] Error fetching militars:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch to populate data before SSE connects
    fetchMilitars();

    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;
    let isMounted = true;

    const connectSSE = () => {
      if (!isMounted) return;
      
      eventSource = new EventSource('/api/militar/stream');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.version && data.version > cacheVersionRef.current) {
            console.log(`[MilitarContext] Cache version changed (${cacheVersionRef.current} -> ${data.version}). Fetching updates...`);
            cacheVersionRef.current = data.version;
            fetchMilitars();
          }
        } catch (e) {
          console.error('[MilitarContext] Error parsing SSE data:', e);
        }
      };

      eventSource.onerror = (error) => {
        // SSE connections normally get closed by proxies/timeouts, this is expected behavior.
        console.log('[MilitarContext] SSE connection closed, reconnecting in 5s...');
        if (eventSource) {
          eventSource.close();
        }
        if (isMounted) {
          retryTimeout = setTimeout(() => connectSSE(), 5000);
        }
      };
    };

    connectSSE();

    return () => {
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, []);

  const refreshMilitars = async (rg?: string) => {
    await fetchMilitars();
  };

  const updateMilitarLocal = (rg: string, updates: Partial<UserProfile>) => {
    setMilitars(prev => prev.map(m => {
      if (m.rg === rg || m.uid === rg || (m.rg && m.rg.toString() === rg.toString())) {
        return { ...m, ...updates };
      }
      return m;
    }));
  };

  const value = React.useMemo(() => ({
    militars,
    loading,
    refreshMilitars,
    updateMilitarLocal
  }), [militars, loading]);

  return (
    <MilitarContext.Provider value={value}>
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
