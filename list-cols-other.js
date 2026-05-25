import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, config.firestoreDatabaseId);

async function check() {
  const colRef1 = collection(db, 'refeitorio_data');
  const snap1 = await getDocs(colRef1);
  snap1.forEach(doc => console.log("refeitorio_data DOC ID:", doc.id));
  
  const colRef2 = collection(db, 'menus');
  const snap2 = await getDocs(colRef2);
  snap2.forEach(doc => console.log("menus DOC ID:", doc.id));
}

check().then(() => process.exit(0)).catch(e => {
    console.error(e.message);
    process.exit(1);
});
