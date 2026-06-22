const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

async function run() {
  const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
  const app = initializeApp({ projectId: config.projectId });
  
  const dbCandidates = [];
  if (config.firestoreDatabaseId) dbCandidates.push(config.firestoreDatabaseId);
  dbCandidates.push('(default)');

  for (const dbId of dbCandidates) {
    console.log(`Probing ${dbId}`);
    try {
      const db = getFirestore(app, dbId);
      await db.collection('militaries').doc('TESTING123').set({ role: true }, { merge: true });
      console.log(`SUCCESS for ${dbId}`);
    } catch (e) {
      console.log(`ERROR for ${dbId}:`, e.code, e.message);
    }
  }
}
run();
