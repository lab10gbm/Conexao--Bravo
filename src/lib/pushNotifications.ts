import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface PushNotificationPayload {
  title: string;
  body: string;
  id?: number;
  data?: Record<string, any>;
}

// Generates a pleasant two-tone audio notification chime via Web Audio API
export function playNotificationChime() {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Arpeggio chime: A5 (880Hz) to E6 (1320Hz)
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (err) {
    // Non-critical audio fallback
  }
}

/**
 * Initializes notification channels and requests user permissions
 * Handles both Native Android (Capacitor) and Browser/PWA Web Notifications.
 */
export async function initPushNotifications(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    // 1. Native Android via Capacitor
    if (Capacitor.isNativePlatform()) {
      // Create notification channel with high importance, vibration and sound
      await LocalNotifications.createChannel({
        id: 'conexao_bravo_alerts',
        name: 'Alertas Operacionais CBMERJ',
        description: 'Notificações de Permutas de Escala e RAS',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
      });

      const perm = await LocalNotifications.requestPermissions();
      return perm.display === 'granted';
    }

    // 2. Web Browser / PWA Notifications
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        return true;
      }
      if (Notification.permission !== 'denied') {
        const result = await Notification.requestPermission();
        return result === 'granted';
      }
    }
  } catch (e) {
    console.warn('[PushNotifications] Erro ao inicializar notificações:', e);
  }

  return false;
}

/**
 * Dispatches a native or web notification with audio feedback
 */
export async function sendDeviceNotification({
  title,
  body,
  id = Date.now() % 100000,
  data = {},
}: PushNotificationPayload): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  playNotificationChime();

  try {
    // Native Capacitor Android
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id,
            channelId: 'conexao_bravo_alerts',
            sound: 'default',
            smallIcon: 'ic_stat_icon_config_sample',
            extra: data,
          },
        ],
      });
      return true;
    }

    // Web Browser / PWA
    if ('Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `cbmerj-${id}`,
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      return true;
    }
  } catch (err) {
    console.warn('[PushNotifications] Falha ao despachar notificação:', err);
  }

  return false;
}

/**
 * Helper specifically for new incoming swap requests
 */
export async function notifyNovaPermutaRecebida({
  solicitante,
  data,
  ala,
}: {
  solicitante: string;
  data: string;
  ala?: string | number;
}) {
  const alaText = ala ? ` (Ala ${ala})` : '';
  return sendDeviceNotification({
    title: '🚨 Nova Solicitação de Permuta',
    body: `${solicitante} solicitou troca de serviço com você para o dia ${data}${alaText}. Toque para revisar e assinar.`,
  });
}

/**
 * Helper for when an escalante approves a swap
 */
export async function notifyPermutaDeferida({
  data,
  escalante,
}: {
  data: string;
  escalante?: string;
}) {
  const escText = escalante ? ` pelo Escalante (${escalante})` : '';
  return sendDeviceNotification({
    title: '✓ Permuta Deferida!',
    body: `Sua permuta para o dia ${data} foi deferida e homologada${escText}. A escala já está atualizada!`,
  });
}
