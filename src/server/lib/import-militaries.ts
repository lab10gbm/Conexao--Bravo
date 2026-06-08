
import fs from 'fs';
import path from 'path';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getFirestore as getClientFirestore, doc, setDoc, writeBatch } from 'firebase/firestore';

export async function importMilitariesFromLocal(adminDb: any, clientDb: any, admin: any) {
  const dataPath = path.join(process.cwd(), 'src/server/lib/detailed_militaries_data.json');
  if (!fs.existsSync(dataPath)) {
    console.log('[Import] Detailed data file not found at', dataPath);
    return;
  }

  try {
    const militaries = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log(`[Import] Starting processing of ${militaries.length} militaries...`);

    let count = 0;
    
    // Normalize RGs helper
    const normalizeRg = (rg: string | number) => {
      const str = (rg || '').toString().trim().toUpperCase();
      const clean = str.replace(/[^A-Z0-9]/g, '');
      return clean.replace(/^0+/, '') || clean;
    };

    if (adminDb && admin) {
      console.log('[Import] Using Admin SDK for batch import...');
      let batch = adminDb.batch();
      for (const m of militaries) {
        const safeRg = normalizeRg(m.rg);
        const docRef = adminDb.collection('militaries').doc(safeRg);
        
        const data = {
          ...m,
          rg: safeRg,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        batch.set(docRef, data, { merge: true });
        count++;

        if (count % 450 === 0) {
          await batch.commit();
          batch = adminDb.batch();
          console.log(`[Import] Committed ${count} (Admin)`);
        }
      }
      if (count % 450 !== 0) {
        await batch.commit();
      }
      console.log(`[Import] Successfully imported ${count} militaries via Admin SDK.`);
    } else if (clientDb) {
      console.log('[Import] Admin SDK not available, using Client SDK writeBatch...');
      let batch = writeBatch(clientDb);
      for (const m of militaries) {
        const safeRg = normalizeRg(m.rg);
        const docRef = doc(clientDb, 'militaries', safeRg);
        
        const data = {
          ...m,
          rg: safeRg,
          updatedAt: new Date()
        };

        batch.set(docRef, data, { merge: true });
        count++;

        if (count % 400 === 0) {
          await batch.commit();
          batch = writeBatch(clientDb);
          console.log(`[Import] Committed ${count} (Client)`);
        }
      }
      if (count % 400 !== 0) {
        await batch.commit();
      }
      console.log(`[Import] Successfully imported ${count} militaries via Client SDK.`);
    }
    
    // Rename file so it doesn't run again on next restart
    try {
      const processedPath = dataPath + '.processed';
      fs.renameSync(dataPath, processedPath);
      console.log('[Import] Marked data file as processed.');
    } catch (e) {}

  } catch (err: any) {
    console.error('[Import] Error:', err.message);
  }
}
