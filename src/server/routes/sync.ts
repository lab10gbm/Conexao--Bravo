import express from "express";
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from "../lib/firebase-admin";
import { writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { parseRank } from "../../lib/rankUtils";

export function setupSyncRoutes(app: express.Express, getDeps: () => any) {
  const syncRouter = express.Router();

  const apiKeyMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const apiKey = process.env.SYNC_API_KEY || "MINHA_CHAVE_SECRETA_SUPER_SEGURA_123";
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'Configuração do Servidor Incompleta: SYNC_API_KEY ausente' });
    }
    const provided = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');
    if (provided !== apiKey) {
      return res.status(401).json({ success: false, error: 'Acesso Negado: Chave de API inválida ou ausente' });
    }
    next();
  };

  const normalizeRg = (rg: string | number) => {
    const str = (rg || '').toString().trim().toUpperCase();
    const clean = str.replace(/[^A-Z0-9]/g, '');
    return clean.replace(/^0+/, '') || clean;
  };

const bulkSyncHandler = async (req: any, res: any) => {
  const { db: adminDb, clientDb } = getDeps();
  
  try {
    let data = req.body;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) {}
    }

    const { vacations } = data || {};
    if (!vacations || !Array.isArray(vacations)) {
      return res.status(200).json({ success: false, error: 'Lista vazia' });
    }

    let batch;
    let isClientDb = false;
    if (adminDb) batch = adminDb.batch();
    else if (clientDb) { batch = writeBatch(clientDb); isClientDb = true; }
    else return res.status(500).json({ success: false, error: 'No db' });

    let count = 0;
    let batchCount = 0;

    for (const v of vacations) {
      if (!v) continue;
      const cleanRg = normalizeRg(v.militarRg);
      if (!cleanRg) continue;
      
      const docId = `${cleanRg}_${v.anoRef || '0000'}_${(v.dataInicio || '').replace(/\//g, '')}`;
      const docRef = isClientDb ? doc(clientDb, 'vacations', docId) : adminDb.collection('vacations').doc(docId);
      
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
        anoRetifi: String(v.anoRetifi || ''),
        obs: String(v.obs || ''),
        updatedAt: isClientDb ? serverTimestamp() : FieldValue.serverTimestamp()
      }, { merge: true });

      count++;
      batchCount++;

      if (batchCount >= 400) {
        await batch.commit();
        batch = isClientDb ? writeBatch(clientDb) : adminDb.batch();
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

syncRouter.post('/admin/vacation/bulk-sync', apiKeyMiddleware, bulkSyncHandler);
syncRouter.post('/admin/vacation/bulk-sync/', apiKeyMiddleware, bulkSyncHandler);
syncRouter.post('/admin/vacations/bulk-sync', apiKeyMiddleware, bulkSyncHandler);
syncRouter.post('/sync/vacations', apiKeyMiddleware, bulkSyncHandler);

syncRouter.post('/admin/vacation/raw-sync', apiKeyMiddleware, async (req, res) => {
  const db = getAdminDb();
  try {
    const { rawText, html } = req.body;
    if (!rawText) return res.status(400).json({ success: false, error: 'Sem texto' });

    // Tenta encontrar RG
    let rgMatch = rawText.match(/RG[:\s]*([\d.]+)/i);
    let rg = rgMatch ? rgMatch[1].replace(/\D/g, '') : null;
    
    // Fallback pra qualquer número de 5 dígitos no começo se falhar
    if (!rg) {
        let possibleRg = rawText.match(/\b(\d{5})\b/);
        if (possibleRg) rg = possibleRg[1];
    }
    
    if (!rg) return res.status(400).json({ success: false, error: 'RG não encontrado no texto da página' });
    
    // Extract vacations line by line
    // Concessão | 2026 | ... | 01/01/2026 | 30/01/2026
    const lines = rawText.split('\n');
    let vacations = [];
    
    for (let line of lines) {
        if (!line.includes('/') && !line.includes('202')) continue;
        
        let cols = line.split('\t').map((s: string) => s.trim());
        if (cols.length < 5) continue;
        if (cols[0].toUpperCase() === 'ATO' || cols[1].toUpperCase().includes('ANO')) continue;
        
        let dtInicio = cols[4] || '';
        if (dtInicio.match(/\d{2}\/\d{2}\/\d{4}/) || cols[1].toUpperCase().includes('ASSEGURADAS') || cols[1].toUpperCase().includes('PRESUMIDAS')) {
           vacations.push({
              militarRg: rg, 
              ato: cols[1]||'Concessão', 
              anoRef: cols[2]||'',
              anoRetifi: cols[3]||'',
              dataInicio: dtInicio, 
              dataRetorno: cols[5]||'',
              boletim: cols[6]||'', 
              diasGozados: parseInt(cols[7])||0, 
              diasAGozar: parseInt(cols[8])||0,
              boletimOrigem: cols[9]||'',
              obs: cols[10]||'',
              status: dtInicio.includes('2026') || dtInicio.includes('2027') ? 'marcado' : 'gozado'
           });
        }
    }
    
    if (vacations.length === 0) return res.status(400).json({ success: false, error: 'RG encontrado, mas Nenhuma férias localizada/parseada', rg });
    
    // Save to DB
    const serverTimestampValue = FieldValue.serverTimestamp();
    let batch = db.batch();
    for (const v of vacations) {
        const docId = `${rg}_${v.anoRef || '0000'}_${(v.dataInicio || '').replace(/\//g, '')}`;
        batch.set(db.collection('vacations').doc(docId), {
            id: docId,
            ...v,
            updatedAt: serverTimestampValue
        }, { merge: true });
    }
    await batch.commit();
    return res.json({ success: true, count: vacations.length, rg });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

syncRouter.post('/admin/personal-data/bulk-sync', apiKeyMiddleware, async (req, res) => {
  const { db: adminDb, clientDb, militaryCache, cacheEvents } = getDeps();
  try {
    let data = req.body;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (e) {}
    }
    
    const personalDataList = data?.personalDataList;
    console.log(`[bulk-sync] Received request. personalDataList is array?`, Array.isArray(personalDataList), 'length:', personalDataList?.length);
    
    if (!personalDataList || !Array.isArray(personalDataList)) {
      return res.status(400).json({ success: false, error: 'Lista de dados pessoais vazia ou inválida' });
    }

    const timestamp = new Date().toISOString();
    let count = 0;
    
    let batch;
    let isClientDb = false;
    
    if (adminDb) {
       batch = adminDb.batch();
    } else if (clientDb) {
       batch = writeBatch(clientDb);
       isClientDb = true;
    } else {
       return res.status(500).json({ success: false, error: 'No database available' });
    }

    let batchCount = 0;

    for (const item of personalDataList) {
      if (!item) continue;
      const cleanRg = normalizeRg(item.rg);
      if (!cleanRg) continue;
      
      console.log(`[bulk-sync] Processing RG ${cleanRg}. Has promotions?`, !!item.promotions, item.promotions?.length);

      const docRef = isClientDb ? doc(clientDb, 'personalData', cleanRg) : adminDb.collection('personalData').doc(cleanRg);
      const militaryRef = isClientDb ? doc(clientDb, 'militaries', cleanRg) : adminDb.collection('militaries').doc(cleanRg);
      const ts = isClientDb ? serverTimestamp() : FieldValue.serverTimestamp();
      
      // Save full extracted personal data to a separate 'personalData' collection
      batch.set(docRef, {
        ...item,
        rg: cleanRg,
        updatedAt: ts
      }, { merge: true });

      // Sync all fields back to 'militaries' for global app usage
      const updatesToMilitary: any = { 
        ...item,
        updatedAt: ts 
      };
      
      // Map legacy/specific fields to match the military profile expected names
      if (item.cpf) updatesToMilitary.cpf = item.cpf;
      if (item.telefoneCelular) updatesToMilitary.cel = item.telefoneCelular;
      if (item.telefoneResidencial) updatesToMilitary.tel = item.telefoneResidencial;
      if (item.nomeGuerra) updatesToMilitary.warName = item.nomeGuerra;
      if (item.nomeGuerra && !updatesToMilitary.name) updatesToMilitary.name = item.nomeGuerra;
      if (item.promotions && item.promotions.length > 0) {
        updatesToMilitary.rank = parseRank(item.promotions[0].posto);
        console.log(`[bulk-sync] Extracted rank ${updatesToMilitary.rank} from promotion ${item.promotions[0].posto}`);
      }

      batch.set(militaryRef, updatesToMilitary, { merge: true });

      // Update in-memory cache directly!
      if (militaryCache) {
         const existing = militaryCache.get(cleanRg) || {};
         militaryCache.set(cleanRg, { ...existing, ...updatesToMilitary, updatedAt: timestamp });
         if (cacheEvents && getDeps().incrementCacheVersion) {
             const newVer = getDeps().incrementCacheVersion();
             cacheEvents.emit('update', newVer);
         } else if (cacheEvents) {
             cacheEvents.emit('update', Date.now());
         }
      }

      count++;
      batchCount++;

      if (batchCount >= 200) {
        await batch.commit();
        batch = isClientDb ? writeBatch(clientDb) : adminDb.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }
    
    return res.json({ success: true, count });
  } catch (err: any) {
    console.error('Bulk sync error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

syncRouter.post('/admin/militaries/bulk-sync', apiKeyMiddleware, async (req, res) => {
  const { db: adminDb, clientDb } = getDeps();
  const { militaries } = req.body;
  
  if (!militaries || !Array.isArray(militaries)) {
    return res.status(400).json({ success: false, error: 'Lista inválida' });
  }

  let batch;
  let isClientDb = false;
  if (adminDb) { batch = adminDb.batch(); }
  else if (clientDb) { batch = writeBatch(clientDb); isClientDb = true; }
  else return res.status(500).json({ success: false, error: 'No db' });
  
  let savedCount = 0;
  try {
    let currentBatch = batch;
    let batchCount = 0;
    
    for (const m of militaries) {
      const safeRg = normalizeRg(m.rg);
      if (!safeRg) continue;
      
      const docRef = isClientDb ? doc(clientDb, 'militaries', safeRg) : adminDb.collection('militaries').doc(safeRg);
      const dataToSave = { ...m };
      if (safeRg === '54444') {
        dataToSave.isAdmin = true;
        dataToSave.isEscalante = true;
      }
      
      const ts = isClientDb ? serverTimestamp() : FieldValue.serverTimestamp();
      
      currentBatch.set(docRef, {
          ...dataToSave,
          updatedAt: ts
      }, { merge: true });
      
      batchCount++;
      savedCount++;
      
      if (batchCount >= 450) {
          await currentBatch.commit();
          currentBatch = isClientDb ? writeBatch(clientDb) : adminDb.batch();
          batchCount = 0;
      }
    }
    if (batchCount > 0) await currentBatch.commit();
    res.json({ success: true, count: savedCount });
  } catch(e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.use('/api', syncRouter);
}
