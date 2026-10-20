export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    process.on('unhandledRejection', (reason: any) => {
      const msg = reason?.message || String(reason);
      if (msg.includes('Could not load the default credentials') || msg.includes('MetadataLookupWarning')) {
        // Silently ignore GCP metadata server lookup in local development environment
        return;
      }
      console.warn('[Server] Unhandled rejection:', msg);
    });

    try {
      const { initFirebaseAdmin, hasAdminCredentials } = await import('./server/lib/firebase-admin');
      if (hasAdminCredentials()) {
        initFirebaseAdmin();
        console.log('[Instrumentation] Firebase Admin initialized on Next.js startup.');
      } else {
        console.log('[Instrumentation] Running with client Firebase credentials in development.');
      }
    } catch (e: any) {
      console.warn('[Instrumentation] Notice during server startup:', e.message);
    }
  }
}
