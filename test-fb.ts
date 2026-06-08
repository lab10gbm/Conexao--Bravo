import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, cert } from 'firebase-admin/app';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount)
});

async function main() {
  try {
    console.log("Checking (default) database");
    const dbDefault = getFirestore(app); // uses (default)
    const snapDefault = await dbDefault.doc('aprovisionamento/dados').get();
    if (snapDefault.exists) {
      console.log("(default) data exists! materiais length:", snapDefault.data().materiais?.length);
    } else {
      console.log("(default) NOT FOUND");
    }
  } catch (e) {
    console.log("(default) error:", e.message);
  }

  try {
    console.log("Checking custom database");
    const dbCustom = getFirestore(app, "ai-studio-4572982c-0772-4965-98e3-8ccd137a6b92");
    const snapCustom = await dbCustom.doc('aprovisionamento/dados').get();
    if (snapCustom.exists) {
      console.log("Custom data exists! materiais length:", snapCustom.data().materiais?.length);
    } else {
      console.log("Custom NOT FOUND");
    }
  } catch (e) {
    console.log("Custom error:", e.message);
  }
}

main();
