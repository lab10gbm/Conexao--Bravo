import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';
import path from 'path';

async function test() {
  const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
  
  const clientApp = initializeApp(firebaseConfig);
  const targetDbId = firebaseConfig.firestoreDatabaseId || '(default)';
  const clientDb = initializeFirestore(clientApp, { experimentalForceLongPolling: true }, targetDbId);
  const auth = getAuth(clientApp);
  
  try {
    await signInWithEmailAndPassword(auth, "system_admin@cbmerj.local", "AdminServerSecret123!");
    console.log("Logged in!");
    
    const snap = await getDocs(query(collection(clientDb, 'militaries'), limit(5)));
    console.log(`Documents fetched via Client SDK (${snap.docs.length}):`);
    snap.forEach(doc => {
      console.log(doc.id, doc.data().nome || doc.data().name);
    });
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}
test();
