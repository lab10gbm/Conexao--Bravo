import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function check() {
  const colRef = collection(db, 'refeitorio');
  const snap = await getDocs(colRef);
  snap.forEach(doc => {
    console.log("DOC ID:", doc.id);
  });
}

check().then(() => process.exit(0)).catch(e => {
    console.error(e.message);
    process.exit(1);
});
