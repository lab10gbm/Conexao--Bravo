import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert } from 'firebase-admin/app';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));
const app = initializeApp({ credential: cert(serviceAccount) });

async function main() {
  const db = getFirestore(app);
  try {
    const cols = await db.listCollections();
    console.log("Collections:", cols.map(c => c.id));
    for (const c of cols) {
       const snap = await c.limit(5).get();
       console.log(`Coll ${c.id}: ${snap.size} docs`);
    }
  } catch (e) {
    console.log("Error:", e.message);
  }
}
main();
