import { useEffect } from 'react';

/**
 * Sends a lightweight heartbeat to /api/health every 6 minutes
 * 24 hours a day, 7 days a week to keep Render Web Services permanently active.
 */
export function useKeepAliveHeartbeat() {
  useEffect(() => {
    let lastPingTime = 0;

    const sendHeartbeat = async (trigger = 'interval') => {
      const now = Date.now();
      // Enforce at least 3 minutes between pings from this client tab
      if (now - lastPingTime < 3 * 60 * 1000) return;
      
      lastPingTime = now;
      try {
        await fetch('/api/health', {
          method: 'GET',
          headers: {
            'X-Keep-Alive': `browser-${trigger}-24h`
          },
          // Cache control to avoid browser disk cache returning stale 304 without hitting server
          cache: 'no-store'
        });
      } catch {
        // Silently ignore connection issues (offline, etc)
      }
    };

    // Initial ping on app load
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
