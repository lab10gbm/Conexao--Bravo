import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { UserProfile } from '../types';
import { db, auth } from '../lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { cleanUndefined } from '../lib/utils';

const normalizeRgHelper = (rg: string | number | undefined | null): string => {
  const str = (rg || '').toString().trim().toUpperCase();
  const clean = str.replace(/[^A-Z0-9]/g, '');
  return clean.replace(/^0+/, '') || clean;
};

interface MilitarContextType {
  militars: UserProfile[];
  loading: boolean;
  refreshMilitars: (rg?: string) => Promise<void>;
  updateMilitarLocal: (rg: string, updates: Partial<UserProfile>) => void;
  deleteMilitar: (rg: string) => Promise<boolean>;
  addOrUpdateMilitar: (data: Partial<UserProfile> & { rg: string }) => Promise<boolean>;
}

const MilitarContext = createContext<MilitarContextType | undefined>(undefined);

export function MilitarProvider({ children }: { children: ReactNode }) {
  const [militars, setMilitars] = useState<UserProfile[]>(() => {
    try {
      const cached = localStorage.getItem('militars_cache_v2');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('militars_cache_v2');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return false;
      }
    } catch {}
    return true;
  });
  const cacheVersionRef = useRef<number>(0);

  const fetchMilitars = async (retryCount = 0) => {
    try {
      const storedUser = localStorage.getItem('militar_profile');
      let rg = '';
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          rg = parsed.rg || '';
        } catch (e) {}
      }

      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      if (rg) {
        headers['x-user-rg'] = String(rg);
      }

      const res = await fetch(`/api/militar${rg ? `?rg=${encodeURIComponent(rg)}` : ''}`, { 
        cache: 'no-store', 
        headers 
      });

      if (!res.ok) {
        console.warn('[MilitarContext] Failed to fetch militars:', res.status, res.statusText);
        if (retryCount < 3) {
          setTimeout(() => fetchMilitars(retryCount + 1), 1500 * (retryCount + 1));
        }
        return;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.members)) {
        if (data.members.length > 0) {
          setMilitars(data.members as UserProfile[]);
          try {
            localStorage.setItem('militars_cache_v2', JSON.stringify(data.members));
          } catch {}
        } else if (retryCount < 2) {
          // If empty array returned unexpectedly, retry after a short delay
          setTimeout(() => fetchMilitars(retryCount + 1), 1000);
        }
      }
    } catch (e) {
      console.error('[MilitarContext] Error fetching militars:', e);
      if (retryCount < 3) {
        setTimeout(() => fetchMilitars(retryCount + 1), 1500 * (retryCount + 1));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Ensure Firebase auth session is present (anonymous fallback if not logged in)
    if (!auth.currentUser) {
      signInAnonymously(auth).catch(() => {});
    }

    // Initial fetch to populate data
    fetchMilitars();
    
    // Subscribe to auth changes to refetch if user logs in later
    const unsubscribeAuth = auth.onAuthStateChanged(() => { fetchMilitars(); });

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
    const safeTarget = normalizeRgHelper(rg);
    setMilitars(prev => prev.map(m => {
      if (normalizeRgHelper(m.rg) === safeTarget || m.uid === rg) {
        return { ...m, ...updates };
      }
      return m;
    }));
  };

  const deleteMilitar = async (rg: string): Promise<boolean> => {
    const safeRg = normalizeRgHelper(rg);
    if (!safeRg) return false;

    // 1. Optimistic removal from client memory immediately and keep cache in sync
    setMilitars(prev => {
      const next = prev.filter(m => normalizeRgHelper(m.rg) !== safeRg);
      try {
        localStorage.setItem('militars_cache_v2', JSON.stringify(next));
      } catch {}
      return next;
    });

    // Also clean up militar_profile from localStorage if it matches
    try {
      const storedUser = localStorage.getItem('militar_profile');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (normalizeRgHelper(parsed?.rg) === safeRg) {
          localStorage.removeItem('militar_profile');
        }
      }
    } catch {}

    try {
      // 2. Call backend DELETE endpoint (removes from memory cache, updates deleted set, triggers SSE)
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const headers: Record<string, string> = { 'x-user-rg': safeRg };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/militar/${safeRg}`, {
        headers,
        method: 'DELETE',
      });

      // 3. Fallback client-side Firestore delete for redundancy
      try {
        if (db) {
          await deleteDoc(doc(db, 'militaries', safeRg));
        }
      } catch (err) {}

      // 4. Trigger refetch to ensure 100% synchronization
      await fetchMilitars();
      return true;
    } catch (e) {
      console.error('[MilitarContext] Error deleting militar:', e);
      await fetchMilitars();
      return false;
    }
  };

  const addOrUpdateMilitar = async (data: Partial<UserProfile> & { rg: string }): Promise<boolean> => {
    const safeRg = normalizeRgHelper(data.rg);
    if (!safeRg) return false;

    const payload = { ...data, rg: safeRg };

    // 1. Optimistic update
    setMilitars(prev => {
      const exists = prev.some(m => normalizeRgHelper(m.rg) === safeRg);
      if (exists) {
        return prev.map(m => normalizeRgHelper(m.rg) === safeRg ? { ...m, ...payload } : m);
      } else {
        return [...prev, payload as UserProfile];
      }
    });

    try {
      // 2. Update backend server cache & Firestore
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const headers: Record<string, string> = { 
        'Content-Type': 'application/json',
        'x-user-rg': safeRg
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch('/api/militar/update', {
        headers,
        method: 'POST',
        body: JSON.stringify({ rg: safeRg, data: payload })
      });

      // 3. Update client Firestore directly as well
      try {
        if (db) {
          await setDoc(doc(db, 'militaries', safeRg), cleanUndefined(payload), { merge: true });
        }
      } catch (err) {}

      await fetchMilitars();
      return true;
    } catch (e) {
      console.error('[MilitarContext] Error saving militar:', e);
      return false;
    }
  };

  const value = React.useMemo(() => ({
    militars,
    loading,
    refreshMilitars,
    updateMilitarLocal,
    deleteMilitar,
    addOrUpdateMilitar
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
