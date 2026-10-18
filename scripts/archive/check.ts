import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));

const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({ credential: cert(serviceAccount), projectId: firebaseConfig.projectId });

const db = getFirestore();
db.settings({ databaseId: firebaseConfig.firestoreDatabaseId });

async function run() {
  const doc = await db.collection('militaries').doc('12764').get();
  console.log('Exists in militaries?', doc.exists);
  if (doc.exists) console.log(JSON.stringify(doc.data(), null, 2));
}

run().catch(console.error);
