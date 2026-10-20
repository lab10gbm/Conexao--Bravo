import { getMilitarCacheVersion, militarEvents } from '../../../../server/lib/militar-cache-tracker';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send current stable baseline version (does not change continuously)
      const currentVersion = getMilitarCacheVersion();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ version: currentVersion })}\n\n`));

      // Listen to real update events
      const onUpdate = (newVersion: number) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ version: newVersion })}\n\n`));
        } catch (e) {
          cleanup();
        }
      };

      militarEvents.on('update', onUpdate);

      // Keepalive heartbeat interval (every 25s)
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (e) {
          cleanup();
        }
      }, 25000);

      const cleanup = () => {
        clearInterval(interval);
        militarEvents.off('update', onUpdate);
        try {
          controller.close();
        } catch (e) {}
      };

      request.signal.addEventListener('abort', cleanup);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
