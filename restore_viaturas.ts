import { db } from './src/lib/firebase';
import { collection, updateDoc, getDocs, doc, writeBatch } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

async function restore() {
  const dataDir = path.join(process.cwd(), 'data');
  const files = ['motoristas.json', 'chefes.json', 'auxiliares.json'];
  
  const updatesByRg = new Map<string, any>();
  
  for (const file of files) {
    const p = path.join(dataDir, file);
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      for (const item of data) {
         let safeRg = item.rg.replace(/\D/g, '');
         if (safeRg.length < 5) safeRg = safeRg.padStart(5, '0');
         
         const cur = updatesByRg.get(safeRg) || {};
         updatesByRg.set(safeRg, { ...cur, ...item });
      }
    }
  }

  const batch = writeBatch(db);
  const snap = await getDocs(collection(db, 'militaries'));
  let count = 0;
  
  snap.forEach(docSnap => {
     const safeRg = docSnap.id;
     if (updatesByRg.has(safeRg)) {
        const item = updatesByRg.get(safeRg);
        const toUpdate: any = {};
        
        if (item.viaturas) toUpdate.viaturas = item.viaturas;
        if (item.chefeAbt !== undefined) toUpdate.chefeAbt = item.chefeAbt;
        if (item.chefeAbsl !== undefined) toUpdate.chefeAbsl = item.chefeAbsl;
        if (item.auxAbt !== undefined) toUpdate.auxAbt = item.auxAbt;
        if (item.auxAbsl !== undefined) toUpdate.auxAbsl = item.auxAbsl;
        if (item.auxArc !== undefined) toUpdate.auxArc = item.auxArc;
        if (item.auxAse !== undefined) toUpdate.auxAse = item.auxAse;

        if (Object.keys(toUpdate).length > 0) {
           batch.update(docSnap.ref, toUpdate);
           count++;
        }
     }
  });
  
  await batch.commit();
  console.log(`Restored viaturas for ${count} militaries.`);
  process.exit(0);
}

restore().catch(console.error);
