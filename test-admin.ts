import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (getApps().length === 0) {
  initializeApp({
     projectId: process.env.GOOGLE_CLOUD_PROJECT || 'ais-pre-zrzalylqdof6l-725468'
  });
}

const db = getFirestore();

async function test() {
  try {
    const s = await db.collection('militaries').limit(5).get();
    console.log("Docs found:", s.docs.length);
    if(s.docs.length > 0) {
      console.log(s.docs[0].id, s.docs[0].data());
    }
  } catch (e: any) {
    console.log("Error:", e.message);
  }
}
test();
