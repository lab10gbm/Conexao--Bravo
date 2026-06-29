import { getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { initFirebaseAdmin } from './src/server/lib/firebase-admin';
import path from 'path';

process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(process.cwd(), 'service-account.json');

async function run() {
  console.log("Initializing firebase admin...");
  initFirebaseAdmin();
  const db = getFirestore(getApp(), "ai-studio-4572982c-0772-4965-98e3-8ccd137a6b92");

  const rgsToUpdate = [
    "20960", "26029", "43427", "43408", "43581", "43386", "49075", "61427",
    "54168", "54208", "54211", "54236", "54237", "61205", "61109", "61168",
    "61173", "61207", "22352"
  ];

  const updateData = {
    ativoCondutor: true,
    viaturas: {
      ABT: true,
      ABSL: true,
      ASE: true,
      AR: true,
      ARC: true
    },
    ativoEncarregado: true,
    ativoAbastecedor: true
  };

  for (const rg of rgsToUpdate) {
    try {
      console.log(`Updating RG ${rg}...`);
      await db.collection('militaries').doc(rg).set(updateData, { merge: true });
    } catch (err) {
      console.error(`Error updating RG ${rg}`, err);
    }
  }

  console.log("Finished updating!");
  process.exit(0);
}

run().catch(console.error);

