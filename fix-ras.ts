import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { resolve } from 'path';
import * as fs from 'fs';

const serviceAccountPath = resolve('./service-account.json');
let app;
if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
} else {
  console.error("No service account found");
  process.exit(1);
}

const db = getFirestore(app);

async function run() {
  console.log("Fetching militaries...");
  const milSnap = await db.collection('militaries').get();
  const militaries = {};
  milSnap.forEach(doc => {
    const data = doc.data();
    if (data.rg) {
      militaries[data.rg] = data;
    }
  });

  console.log("Fetching RAS applications...");
  const appsSnap = await db.collection('ras_applications').get();
  
  const batch = db.batch();
  let count = 0;

  appsSnap.forEach(doc => {
    const data = doc.data();
    if (!data.militarWarName || !data.militarQuadro) {
      const mil = militaries[data.militarRg];
      if (mil) {
        batch.update(doc.ref, {
          militarWarName: mil.warName || data.militarName,
          militarQuadro: mil.quadro || ''
        });
        count++;
      }
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`Updated ${count} applications!`);
  } else {
    console.log("No applications to update.");
  }
}

run().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
