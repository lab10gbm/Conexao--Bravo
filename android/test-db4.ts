import { config } from 'dotenv';
config();
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

async function run() {
  const accountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
  if(!accountStr) { console.log('no service account in env'); return; }
  const opt = { credential: cert(JSON.parse(accountStr)) };
  const fbConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  const app = initializeApp(opt);
  
  const dbCandidates = [];
  if (fbConfig.firestoreDatabaseId) dbCandidates.push(fbConfig.firestoreDatabaseId);
  dbCandidates.push('(default)');

  for (const dbId of dbCandidates) {
    console.log(`Probing ${dbId}`);
    try {
      const db = getFirestore(app, dbId);
      await db.collection('militaries').doc('TESTING123').set({ role: true }, { merge: true });
      console.log(`SUCCESS for ${dbId}`);
    } catch (e) {
      console.log(`ERROR for ${dbId}:`, e.code, e.message);
    }
  }
}
run();
