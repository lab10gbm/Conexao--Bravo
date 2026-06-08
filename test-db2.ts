import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import * as fs from 'fs';

const sa = JSON.parse(fs.readFileSync('./service-account.json', 'utf-8'));
admin.initializeApp({
  credential: admin.credential.cert(sa),
  projectId: 'ai-studio-applet-webapp-33cfe'
});

const db = getFirestore(admin.app(), 'ai-studio-4572982c-0772-4965-98e3-8ccd137a6b92');

async function test() {
  try {
    console.log("Testing collection 'test'...");
    await db.collection('test').doc('ping').set({ ts: new Date() });
    console.log("Successfully wrote to db!");
    const d = await db.collection('test').doc('ping').get();
    console.log("Read success:", d.exists);
  } catch(e) {
    console.error("Failed:", e);
  }
}
test();
