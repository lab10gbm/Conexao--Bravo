import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert } from 'firebase-admin/app';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount)
});

async function main() {
  const db = getFirestore(app);
  const snap1 = await db.doc('refeitorio/data').get();
  if (snap1.exists) {
    const data1 = snap1.data();
    console.log("menus:", data1?.menus?.length);
  } else {
    console.log("refeitorio doc not found");
  }

  const snap2 = await db.doc('aprovisionamento/dados').get();
  if (snap2.exists) {
    const data2 = snap2.data();
    console.log("materiais:", data2?.materiais?.length);
  }
}
main();
