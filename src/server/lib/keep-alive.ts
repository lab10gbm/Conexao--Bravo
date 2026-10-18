import axios from 'axios';

export const lastKeepAlivePing = {
  timestamp: null as string | null,
  source: 'none',
  status: 'initialized',
  count: 0
};

export function getBrasiliaTime() {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    const formatted = formatter.format(now);
    return { hour, minute, formatted, isOperatingHours: true, mode: '24/7 Ininterrupto' };
  } catch (e) {
    const hour = (now.getUTCHours() - 3 + 24) % 24;
    return { hour, minute: now.getMinutes(), formatted: `${hour}:${now.getMinutes()}`, isOperatingHours: true, mode: '24/7 Ininterrupto' };
  }
}

export function startKeepAliveRobot(port: number) {
  const targetHost = process.env.RENDER_EXTERNAL_URL || process.env.KEEP_ALIVE_URL || process.env.APP_URL;
  const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

  console.log(`[KeepAlive Robot 24/7] Service starting. External target URL: ${targetHost || 'Auto-ping local port'}`);

  const pingEndpoint = async () => {
    const { formatted } = getBrasiliaTime();

    const endpoint = targetHost 
      ? `${targetHost.replace(/\/$/, '')}/api/health` 
      : `http://127.0.0.1:${port}/api/health`;

    try {
      console.log(`[KeepAlive Robot 24/7] ⚡ Disparando ping keep-alive para ${endpoint} às ${formatted} BRT...`);
      const response = await axios.get(endpoint, {
        headers: {
          'User-Agent': 'RenderKeepAliveRobot/1.0 (24-7 Mode)',
          'X-Keep-Alive': 'internal-cron-24h'
        },
        timeout: 25000
      });

      lastKeepAlivePing.timestamp = new Date().toISOString();
      lastKeepAlivePing.source = 'internal-cron-24h';
      lastKeepAlivePing.status = response.status === 200 ? 'healthy' : `status_${response.status}`;
      lastKeepAlivePing.count++;
      console.log(`[KeepAlive Robot 24/7] ✅ Ping confirmado! Render mantido 100% ativo 24h.`);
    } catch (err: any) {
      console.warn(`[KeepAlive Robot 24/7] ⚠️ Aviso no auto-ping (${endpoint}):`, err.message);
      lastKeepAlivePing.status = `warn: ${err.message}`;
    }
  };

  setTimeout(() => {
    pingEndpoint();
    setInterval(pingEndpoint, PING_INTERVAL_MS);
  }, 45000);
}
