import { initFirebaseAdmin, getAdminDb } from './src/server/lib/firebase-admin.js';
import admin from 'firebase-admin';

async function test() {
  const db = getAdminDb();
  try {
    console.log("Testing collection 'test' on real server admin...");
    await db.collection('test').doc('ping').set({ ts: new Date() });
    console.log("Successfully wrote to db!");
  } catch(e) {
    console.error("Failed:", e);
  }
}

test();
