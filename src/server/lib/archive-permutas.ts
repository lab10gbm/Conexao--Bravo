export function setupPermutaArchiveRoutine(getDb: () => { db: any; isDbHealthy: boolean }) {
  // Backend routine to archive old permutas (older than 4 months and CONCLUIDAS/EXPIRADAS/CANCELLED)
  // Runs every 12 hours
  setInterval(async () => {
    const { db, isDbHealthy } = getDb();
    if (!db || !isDbHealthy) return;
    try {
      console.log('[ARCHIVE] Running permutas archive routine...');
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 4);
      const cutoffStr = cutoffDate.toISOString().split('T')[0];

      const snapshot = await db.collection('permutas')
        .where('date', '<', cutoffStr)
        .where('status', 'in', ['accepted', 'rejected', 'cancelled'])
        .get();

      if (snapshot.empty) {
        console.log('[ARCHIVE] No old permutas to archive.');
        return;
      }

      console.log(`[ARCHIVE] Found ${snapshot.size} permutas to archive.`);
      let batch = db.batch();
      let count = 0;

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const refArquivo = db.collection('permutas_arquivo').doc(doc.id);
        batch.set(refArquivo, data);
        batch.delete(doc.ref);
        count++;

        if (count === 400) {
          await batch.commit();
          batch = db.batch();
          count = 0;
        }
      }
      
      if (count > 0) {
        await batch.commit();
      }
      console.log('[ARCHIVE] Success! Archived and removed permutas from active collection.');
    } catch (e: any) {
      if (e.code === 7 || (e.message && e.message.includes('PERMISSION_DENIED'))) {
        console.log('[ARCHIVE] Skipping archive routine (IAM restricted).');
      } else {
        console.error('[ARCHIVE] Error archiving permutas:', e);
      }
    }
  }, 12 * 60 * 60 * 1000); // 12 hours

  // Also run it 5 seconds after server start
  setTimeout(async () => {
    const { db, isDbHealthy } = getDb();
    if (!db || !isDbHealthy) return;
    try {
      console.log('[ARCHIVE] Initial boot permutas archive routine...');
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 4);
      const cutoffStr = cutoffDate.toISOString().split('T')[0];

      const snapshot = await db.collection('permutas')
        .where('date', '<', cutoffStr)
        .where('status', 'in', ['accepted', 'rejected', 'cancelled'])
        .get();

      if (snapshot.empty) return;

      console.log(`[ARCHIVE] Found ${snapshot.size} permutas to archive.`);
      let batch = db.batch();
      let count = 0;
      for (const doc of snapshot.docs) {
        batch.set(db.collection('permutas_arquivo').doc(doc.id), doc.data());
        batch.delete(doc.ref);
        count++;
        if (count === 400) {
          await batch.commit();
          batch = db.batch();
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
      console.log('[ARCHIVE] Success!');
    } catch (e: any) {
      if (e.code === 7 || (e.message && e.message.includes('PERMISSION_DENIED'))) {
        console.log('[ARCHIVE] Skipping archive routine (IAM restricted).');
      } else {
        console.error('[ARCHIVE] Error:', e);
      }
    }
  }, 5000);
}
