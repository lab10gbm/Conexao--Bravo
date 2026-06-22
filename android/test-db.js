const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

async function run() {
  const accountStr = fs.readFileSync('firebase-service-account.json', 'utf8');
  if(!accountStr) { console.log('no service account'); return; }
  const opt = { credential: cert(JSON.parse(accountStr)) };
  const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  const app = initializeApp(opt);
  
  let db;
  if (config.firestoreDatabaseId) {
    db = getFirestore(app, config.firestoreDatabaseId);
    console.log('Using database ID:', config.firestoreDatabaseId);
  } else {
    db = getFirestore(app);
    console.log('Using default database ID');
  }
  
  try {
    await db.collection('militaries').doc('TESTING123').set({ role: true }, { merge: true });
    console.log('Admin SET success');
  } catch (e) {
    console.log('Admin SET error:', e.code, e.message);
  }
}
run();
