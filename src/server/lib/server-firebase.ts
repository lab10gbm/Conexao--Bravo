import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

let serverDb: any = null;
let serverAuthPromise: Promise<any> | null = null;

export async function getServerFirestore() {
  if (serverDb) return serverDb;

  if (!serverAuthPromise) {
    serverAuthPromise = (async () => {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      let firebaseConfig: any = {};
      if (fs.existsSync(configPath)) {
        try {
          firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch (e) {}
      }

      const existingApp = getApps().find(a => a.name === 'server-app');
      const app = existingApp || initializeApp(firebaseConfig, 'server-app');
      const auth = getAuth(app);
      const dbId = firebaseConfig.firestoreDatabaseId;
      const targetDbId = dbId && dbId !== '(default)' && dbId !== 'remixed-firestore-database-id' ? dbId : '(default)';
      const db = initializeFirestore(app, { experimentalForceLongPolling: true }, targetDbId);

      try {
        await signInWithEmailAndPassword(auth, 'system_admin@cbmerj.com', 'AdminServerSecret123!');
        console.log('[Server Firebase] Authenticated with system_admin authority.');
      } catch (e: any) {
        try {
          await signInAnonymously(auth);
          console.log('[Server Firebase] Authenticated anonymously.');
        } catch (e2: any) {
          console.warn('[Server Firebase] Auth notice:', e2.message);
        }
      }
      serverDb = db;
      return db;
    })();
  }

  return serverAuthPromise;
}
