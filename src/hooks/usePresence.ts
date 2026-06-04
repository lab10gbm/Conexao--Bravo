import { useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '../types';
import { cleanUndefined } from "../lib/utils";

export function usePresence(user: UserProfile | null) {
  useEffect(() => {
    if (!user || !user.rg) return;
    
    const presenceRef = doc(db, 'presence', user.rg.toString());
    
    const updatePresence = () => {
      setDoc(presenceRef, cleanUndefined({
              name: user.name || 'Militar',
              rank: user.rank || '',
              lastActive: serverTimestamp()
            }), { merge: true }).catch(err => {
        console.warn('Erro ao atualizar presence:', err);
      });
    };

    // Update immediately and then every minute
    updatePresence();
    const intervalId = setInterval(updatePresence, 60000);
    
    // Also update on activity (with basic debounce to avoid spamming)
    const handleActivity = debounce(() => {
       updatePresence();
    }, 30000); // at most every 30s
    
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [user?.rg]);
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
