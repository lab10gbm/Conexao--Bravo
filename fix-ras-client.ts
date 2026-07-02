import { db } from './src/lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

async function run() {
  console.log("Fetching militaries...");
  const milSnap = await getDocs(collection(db, 'militaries'));
  const militaries = {};
  milSnap.forEach(d => {
    const data = d.data();
    if (data.rg) {
      militaries[data.rg] = data;
    }
  });

  console.log("Fetching RAS applications...");
  const appsSnap = await getDocs(collection(db, 'ras_applications'));
  let count = 0;

  for (const appDoc of appsSnap.docs) {
    const data = appDoc.data();
    if (!data.militarWarName || !data.militarQuadro) {
      const mil = militaries[data.militarRg];
      if (mil) {
        await updateDoc(doc(db, 'ras_applications', appDoc.id), {
          militarWarName: mil.warName || data.militarName,
          militarQuadro: mil.quadro || ''
        });
        count++;
      }
    }
  }

  console.log(`Updated ${count} applications!`);
  process.exit(0);
}

run().catch(console.error);
