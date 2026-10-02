import { useEffect } from 'react';

/**
 * Sends a lightweight heartbeat to /api/health every 6 minutes
 * between 06:00 and 23:59 (Brasília time) to keep Render Web Services active.
 * Pauses during the night (00:00 - 05:59) to save free tier compute hours.
 */
export function useKeepAliveHeartbeat() {
  useEffect(() => {
    let lastPingTime = 0;

    const isOperatingHours = () => {
      try {
        const formatter = new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: 'numeric',
          hour12: false
        });
        const hour = parseInt(formatter.format(new Date()), 10);
        return hour >= 6 && hour <= 23;
      } catch {
        const hour = new Date().getHours();
        return hour >= 6 && hour <= 23;
      }
    };

    const sendHeartbeat = async (trigger = 'interval') => {
      if (!isOperatingHours()) return;
      
      const now = Date.now();
      // Enforce at least 3 minutes between pings from this client tab
      if (now - lastPingTime < 3 * 60 * 1000) return;
      
      lastPingTime = now;
      try {
        await fetch('/api/health', {
          method: 'GET',
          headers: {
            'X-Keep-Alive': `browser-${trigger}`
          },
          // Cache control to avoid browser disk cache returning stale 304 without hitting server
          cache: 'no-store'
        });
      } catch {
        // Silently ignore connection issues (offline, etc)
      }
    };

    // Initial ping on app load if in operating window
    sendHeartbeat('initial');

    // Ping every 6 minutes (Render sleeps after 15 minutes of inactivity)
    const intervalId = setInterval(() => sendHeartbeat('interval'), 6 * 60 * 1000);

    // Ping on tab visibility restore (e.g. user returns to tab or unlocks phone screen)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat('visibility-restore');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
