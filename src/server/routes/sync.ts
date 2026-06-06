import express from "express";
import admin from 'firebase-admin';
import { getAdminDb } from "../lib/firebase-admin";

export const syncRouter = express.Router();

// Helper to normalize RGs for consistency - Removes leading zeros and non-alphanumeric
const normalizeRg = (rg: string | number) => {
  const str = (rg || '').toString().trim().toUpperCase();
  // Remove non-alphanumeric first, then leading zeros
  const clean = str.replace(/[^A-Z0-9]/g, '');
  return clean.replace(/^0+/, '') || clean;
};

const bulkSyncHandler = async (req: any, res: any) => {
  const db = getAdminDb();
  
  try {
    let data = req.body;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) {}
    }

    const { vacations } = data || {};
    if (!vacations || !Array.isArray(vacations)) {
      return res.status(200).json({ success: false, error: 'Lista vazia' });
    }

    const timestamp = new Date().toISOString();
    const serverTimestampValue = admin.firestore.FieldValue.serverTimestamp() || timestamp;

    let batch = db.batch();
    let count = 0;
    let batchCount = 0;

    for (const v of vacations) {
      if (!v) continue;
      const cleanRg = normalizeRg(v.militarRg);
      if (!cleanRg) continue;
      
      const docId = `${cleanRg}_${v.anoRef || '0000'}_${(v.dataInicio || '').replace(/\//g, '')}`;
      const docRef = db.collection('vacations').doc(docId);
      
      batch.set(docRef, {
        id: docId,
        militarRg: cleanRg,
        anoRef: String(v.anoRef || ''),
        dataInicio: String(v.dataInicio || ''),
        dataRetorno: String(v.dataRetorno || ''),
        status: v.status || 'marcado',
        boletim: String(v.boletim || ''),
        boletimOrigem: String(v.boletimOrigem || ''),
        diasGozados: Number(v.diasGozados || 0),
        diasAGozar: Number(v.diasAGozar || 0),
        ato: String(v.ato || 'Concessão'),
        obs: String(v.obs || ''),
        updatedAt: serverTimestampValue
      }, { merge: true });

      count++;
      batchCount++;

      if (batchCount >= 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }
    
    return res.json({ success: true, count });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

syncRouter.post('/admin/vacation/bulk-sync', bulkSyncHandler);
syncRouter.post('/admin/vacation/bulk-sync/', bulkSyncHandler);
syncRouter.post('/admin/vacations/bulk-sync', bulkSyncHandler);
syncRouter.post('/sync/vacations', bulkSyncHandler);

syncRouter.post('/admin/militaries/bulk-sync', async (req, res) => {
  const db = getAdminDb();
  const { militaries } = req.body;
  
  if (!militaries || !Array.isArray(militaries)) {
    return res.status(400).json({ success: false, error: 'Lista inválida' });
  }
  
  let savedCount = 0;
  try {
    let currentBatch = db.batch();
    let batchCount = 0;
    
    for (const m of militaries) {
      const safeRg = normalizeRg(m.rg);
      if (!safeRg) continue;
      
      const docRef = db.collection('militaries').doc(safeRg);
      const dataToSave = { ...m };
      if (safeRg === '54444') {
        dataToSave.isAdmin = true;
        dataToSave.isEscalante = true;
      }
      
      currentBatch.set(docRef, {
          ...dataToSave,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      batchCount++;
      savedCount++;
      
      if (batchCount >= 450) {
          await currentBatch.commit();
          currentBatch = db.batch();
          batchCount = 0;
      }
    }
    if (batchCount > 0) await currentBatch.commit();
    res.json({ success: true, count: savedCount });
  } catch(e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});
