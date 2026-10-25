import { useEffect, useState, useMemo, useCallback } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp, collection, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '../types';
import { cleanUndefined, normalizeRg, normalizeObm } from "../lib/utils";

export interface OnlineMilitaryUser {
  rg: string;
  name: string;
  warName: string;
  rank: string;
  obm: string;
  ala: string;
  quadro?: string;
  lastActiveMillis: number;
  lastActiveFormatted: string;
  isCurrentUser?: boolean;
}

const ONLINE_THRESHOLD_MS = 25 * 60 * 1000; // 25 minutes active session window

function getMillis(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val?.toMillis === 'function') return val.toMillis();
  if (typeof val?.toDate === 'function') return val.toDate().getTime();
  if (typeof val?.seconds === 'number') return val.seconds * 1000;
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }
  return 0;
}

function formatRelativeMinutes(diffMs: number): string {
  const mins = Math.floor(diffMs / 60000);
  if (mins <= 1) return 'Agora';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  return `há ${hours}h`;
}

/**
 * Registers the current user as online in Firestore presence collection.
 */
export function usePresence(user: UserProfile | null) {
  useEffect(() => {
    if (!user || !user.rg) return;
    
    const cleanRg = normalizeRg(user.rg);
    const presenceRef = doc(db, 'presence', cleanRg);
    
    const updatePresence = () => {
      setDoc(presenceRef, cleanUndefined({
        rg: cleanRg,
        name: user.name || 'Militar',
        warName: user.warName || user.name || '',
        rank: user.rank || '',
        obm: user.obm || '',
        ala: user.ala ? String(user.ala) : '',
        quadro: user.quadro || '',
        clientTimestamp: Date.now(),
        lastActive: serverTimestamp()
      }), { merge: true }).catch(err => {
        console.warn('Erro ao atualizar presence:', err);
      });
    };

    // Update immediately and then every 2 minutes
    updatePresence();
    const intervalId = setInterval(updatePresence, 120000);
    
    // Also update on activity (with debounce of 60s)
    const handleActivity = debounce(() => {
      updatePresence();
    }, 60000);
    
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [user?.rg, user?.obm, user?.ala]);
}

/**
 * Real-time hook to observe online users across the system and by OBM.
 */
export function useOnlinePresence(currentUser?: UserProfile | null) {
  const [presenceDocs, setPresenceDocs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'presence'), (snap) => {
      const map: Record<string, any> = {};
      snap.forEach(d => {
        map[d.id] = { id: d.id, ...d.data() };
      });
      setPresenceDocs(map);
      setLoading(false);
    }, (err) => {
      console.warn('Erro ao escutar presence collection:', err.message);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const now = Date.now();
  const currentRg = currentUser?.rg ? normalizeRg(currentUser.rg) : '';

  // Process and filter active users
  const onlineUsers = useMemo<OnlineMilitaryUser[]>(() => {
    const list: OnlineMilitaryUser[] = [];
    const seenRgs = new Set<string>();

    Object.entries(presenceDocs).forEach(([rg, data]) => {
      const cleanRg = normalizeRg(data.rg || rg);
      if (!cleanRg) return;

      const millis = Math.max(
        getMillis(data.lastActive),
        getMillis(data.clientTimestamp)
      );

      // Check if user was active recently
      const isOnline = (now - millis) <= ONLINE_THRESHOLD_MS;
      const isSelf = cleanRg === currentRg;

      if (isOnline || isSelf) {
        seenRgs.add(cleanRg);
        const diffMs = Math.max(0, now - (millis || now));
        list.push({
          rg: cleanRg,
          name: data.name || (isSelf ? currentUser?.name || '' : 'Militar'),
          warName: data.warName || (isSelf ? currentUser?.warName || currentUser?.name || '' : data.name || ''),
          rank: data.rank || (isSelf ? currentUser?.rank || '' : ''),
          obm: data.obm || (isSelf ? currentUser?.obm || '' : ''),
          ala: data.ala || (isSelf ? String(currentUser?.ala || '') : ''),
          quadro: data.quadro || (isSelf ? currentUser?.quadro || '' : ''),
          lastActiveMillis: millis || now,
          lastActiveFormatted: isSelf && (!millis || diffMs < 60000) ? 'Online Agora' : formatRelativeMinutes(diffMs),
          isCurrentUser: isSelf
        });
      }
    });

    // Ensure current user is present even if Firestore write hasn't propagated
    if (currentUser && currentRg && !seenRgs.has(currentRg)) {
      list.unshift({
        rg: currentRg,
        name: currentUser.name || 'Militar',
        warName: currentUser.warName || currentUser.name || '',
        rank: currentUser.rank || '',
        obm: currentUser.obm || '',
        ala: currentUser.ala ? String(currentUser.ala) : '',
        quadro: currentUser.quadro || '',
        lastActiveMillis: now,
        lastActiveFormatted: 'Online Agora',
        isCurrentUser: true
      });
    }

    return list.sort((a, b) => b.lastActiveMillis - a.lastActiveMillis);
  }, [presenceDocs, now, currentRg, currentUser]);

  const totalOnlineCount = onlineUsers.length;

  const isUserOnline = useCallback((rg: string | number | null | undefined): boolean => {
    if (!rg) return false;
    const clean = normalizeRg(rg);
    return onlineUsers.some(u => u.rg === clean);
  }, [onlineUsers]);

  const getOnlineByObm = useCallback((targetObm: string): OnlineMilitaryUser[] => {
    if (!targetObm || targetObm === 'GLOBAL') {
      return onlineUsers;
    }
    const cleanTarget = normalizeObm(targetObm);
    return onlineUsers.filter(u => normalizeObm(u.obm) === cleanTarget);
  }, [onlineUsers]);

  return {
    onlineUsers,
    totalOnlineCount,
    isUserOnline,
    getOnlineByObm,
    loading
  };
}

function debounce(func: Function, wait: number) {
  let timeout: any;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    if (!timeout) {
      func(...args);
    }
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
