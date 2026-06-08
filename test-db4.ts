import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import * as fs from 'fs';

const sa = JSON.parse(fs.readFileSync('./service-account.json', 'utf-8'));
admin.initializeApp({
  credential: admin.credential.cert(sa),
  projectId: 'ai-studio-applet-webapp-33cfe'
});

const db = getFirestore(admin.app());

async function test() {
  try {
    console.log("Testing empty databaseId...");
    await db.collection('test').doc('ping').set({ ts: new Date() });
    console.log("Successfully wrote to db!");
    const d = await db.collection('test').doc('ping').get();
    console.log("Read success:", d.exists);
  } catch(e) {
    console.error("Failed:", e);
  }
}
test();
