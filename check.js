import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(config);
const db = getFirestore(app);

async function check() {
  const docRef = doc(db, 'refeitorio', 'data');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    console.log("menus length:", data.menus?.length);
    console.log("first menu:", data.menus?.[0]);
  } else {
    console.log("No data document");
  }
}

check().then(() => process.exit(0)).catch(e => console.error(e));
