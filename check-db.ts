import { initializeApp, cert, getApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

async function test() {
  const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
  
  if (getApps().length === 0) {
    initializeApp({ projectId: firebaseConfig.projectId });
  }
  
  const targetDbId = firebaseConfig.firestoreDatabaseId || '(default)';
  const db = getFirestore(getApp(), targetDbId);
  
  try {
    const snap = await db.collection('militaries').limit(5).get();
    console.log("Documents fetched via Admin SDK:");
    snap.forEach(doc => {
      console.log(doc.id, doc.data().nome);
    });
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
