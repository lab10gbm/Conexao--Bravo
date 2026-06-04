import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import axios from 'axios';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase/app';
import { getFirestore as getClientFirestore, doc, setDoc, writeBatch, serverTimestamp, collection, getDocs, getDoc, query, limit, orderBy, where } from 'firebase/firestore';
import fs from 'fs';
import compression from 'compression';
import cors from 'cors';

import { createRequire } from 'module';
let req: any;
if (typeof require !== 'undefined') {
  req = require;
} else {
  // @ts-ignore
  req = createRequire(import.meta.url);
}
const archiver = req('archiver');

// Initialize Firebase Admin
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = { projectId: '' };
if (fs.existsSync(firebaseConfigPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    console.log(`[Firebase] Config file loaded. Project: ${firebaseConfig.projectId}`);
    
    // Explicitly set the environment variable to force the SDK to the correct project
    if (firebaseConfig.projectId) {
      process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
      console.log(`[Firebase] Set GOOGLE_CLOUD_PROJECT to ${firebaseConfig.projectId}`);
    }
  } catch (e) {
    console.error('[Firebase] Failed to parse config file:', e);
  }
}

// Global DB and Cache handles
let db: admin.firestore.Firestore;
let clientDb: any;
let militaryCache: Map<string, any> = new Map();
let isCacheLoaded = false;
let cachePromise: Promise<void> | null = null;
let isSyncing = false;
let lastSyncResult: any = null;
let syncProgress = { current: 0, total: 0 };

// Helper to normalize RGs for consistency - Removes leading zeros and non-alphanumeric
const normalizeRg = (rg: string | number) => {
  const str = (rg || '').toString().trim().toUpperCase();
  // Remove non-alphanumeric first, then leading zeros
  const clean = str.replace(/[^A-Z0-9]/g, '');
  return clean.replace(/^0+/, '') || clean;
};

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRV3PAwJrGMQOUaUabnYNlbebEgrsE9wEnQ8Qpu0h-8ZT5WOgL3oyVIeQopb_X7g7PDByvP8OPy9upD/pub?gid=1221046524&single=true&output=csv";

async function loadMilitaryCache() {
  const startTime = Date.now();
  console.log('[Cache] Loading military records into memory...');
  
  const newCache = new Map();

  // 1. Try Spreadsheet FIRST (Master Source)
  const sourceTimeout = 90000; // Increased from 5s to 90s to avoid load timeouts
  try {
    console.log('[Cache] Fetching master data from Spreadsheet...');
    const sourcePromise = axios.get(SHEET_URL, {
      timeout: sourceTimeout,
      headers: { 
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    const response = await sourcePromise;
    
    const lines = (response.data || '').split('\n');
    console.log(`[Cache] Spreadsheet loaded. Total lines received: ${lines.length}`);
    
    // Find the header row (Line 2 in debug, but searching is safer)
    const upperLines = lines.map((l: string) => l.toUpperCase());
    let headerIndex = upperLines.findIndex((line: string) => 
      line.includes('RG') && 
      line.includes('NOME') && 
      line.includes('POSTO/GRAD')
    );
    
    if (headerIndex === -1) {
      headerIndex = upperLines.findIndex((line: string) => line.includes('RG'));
    }
    
    if (headerIndex === -1) {
      console.warn('[Cache] Could not find header row in spreadsheet data. Defaulting to line 2.');
      headerIndex = 2; // Based on debug output
    }
    
    if (headerIndex !== -1) {
      const csvData = lines.slice(headerIndex).join('\n');
      const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
      });

      if (records.length > 0) {
        console.log(`[Cache] Parse successful. Found ${records.length} rows.`);
      }

      const parseQuadro = (q: string) => {
        if (!q) return '';
        const parts = q.split('/');
        if (parts.length > 1) {
          parts.pop();
          return parts.join('/');
        }
        return q;
      };

      for (const m of records) {
        const rawRg = (m['RG'] || '').toString().trim();
        if (!rawRg || rawRg.toUpperCase() === 'RG') continue;
        
        const safeRg = normalizeRg(rawRg);
        const warName = (m['N.Guerra'] || '').toString().trim();
        const fullName = (m['NOME'] || '').toString().trim();
        const rank = (m['Posto/Grad'] || '').toString().trim();
        
        let ala = (m['ALA'] || '1').toString().trim();
        if (ala.toUpperCase() === 'ALA') ala = '';

        let obm = (m['OBM'] || '').toString().trim();
        const obmUpper = obm.toUpperCase();
        if (obmUpper === '10º' || obmUpper === '10' || obmUpper === 'OBM' || obmUpper === '10º GBM' || !obm) {
          obm = '10º GBM';
        }

        const rawQuadro = (m['Quadro'] || m['QUADRO'] || '').toString().trim();
        const quadro = parseQuadro(rawQuadro);
        
        const cidade = (m['Cidade'] || m['CIDADE'] || '').toString().trim();
        const idFuncional = (m['ID Funcional'] || '').toString().trim();
        const cel = (m['Cel'] || '').toString().trim();
        const tel = (m['Tel'] || '').toString().trim();
        const email = (m['E-mail'] || '').toString().trim();
        const situacao = (m['Situação'] || '').toString().trim();
        const endereco = (m['Endereco'] || m['ENDEREÇO'] || '').toString().trim();
        const nascimento = (m['Nascimento'] || '').toString().trim();

        // Extract specializations (columns with checkmarks or non-dash values)
        const specializations: string[] = [];
        const specKeys = [
          'ADJUNTO', 'ENCARREGADO DE MOTORISTA', 'ABASTECEDOR', 'CONDUTOR AR', 'CONDUTOR ABSL',
          'CONDUTOR ABT', 'CONDUTOR ASE', 'CONDUTOR ARC', 'CHEFE ABSL', 'CHEFE ABT',
          'AUXILIAR / CHEFE ARC', 'AUXILIAR ABT', 'AUXILIAR ABSL', 'ENFERMEIRO',
          'MESTRE AL', 'MESTRE BIA', 'MARINHEIRO', 'OPERADOR AMA', 'GV AMA', 'AUXILIAR RANCHO'
        ];
        
        for (const sk of specKeys) {
          const val = (m[sk] || '').toString().trim();
          if (val && val !== '-' && val !== '0') {
            specializations.push(sk);
          }
        }

        newCache.set(safeRg, {
          name: fullName,
          warName: warName || (fullName || '').split(' ')[0] || 'Militar',
          rank: rank,
          rg: rawRg,
          ala: ala,
          obm: obm,
          quadro: quadro,
          cidade: cidade,
          idFuncional: idFuncional,
          cel: cel,
          tel: tel,
          email: email,
          situacao: situacao,
          endereco: endereco,
          nascimento: nascimento,
          birthDate: nascimento,
          specializations: specializations
        });
      }
      try {
        if (fs.existsSync('./data/motoristas.json')) {
          const mData = JSON.parse(fs.readFileSync('./data/motoristas.json', 'utf8'));
          let mergedCount = 0;
          for (const m of mData) {
            const safeRg = normalizeRg(m.rg);
            const existing = newCache.get(safeRg) || {};
            newCache.set(safeRg, { ...existing, ...m });
            mergedCount++;
          }
          console.log(`[Cache] Merged ${mergedCount} motoristas over spreadsheet data.`);
        }
        if (fs.existsSync('./data/chefes.json')) {
          const cData = JSON.parse(fs.readFileSync('./data/chefes.json', 'utf8'));
          let mergedCount = 0;
          for (const c of cData) {
            const safeRg = normalizeRg(c.rg);
            const existing = newCache.get(safeRg) || {};
            newCache.set(safeRg, { ...existing, ...c });
            mergedCount++;
          }
          console.log(`[Cache] Merged ${mergedCount} chefes over spreadsheet data.`);
        }
        if (fs.existsSync('./data/maritimos.json')) {
          const mData = JSON.parse(fs.readFileSync('./data/maritimos.json', 'utf8'));
          let mergedCount = 0;
          for (const m of mData) {
            const safeRg = normalizeRg(m.rg);
            const existing = newCache.get(safeRg) || {};
            newCache.set(safeRg, { ...existing, ...m });
            mergedCount++;
          }
          console.log(`[Cache] Merged ${mergedCount} maritimos over spreadsheet data.`);
        }
        if (fs.existsSync('./data/enfermeiros.json')) {
          const mData = JSON.parse(fs.readFileSync('./data/enfermeiros.json', 'utf8'));
          for (const m of mData) {
            const safeRg = normalizeRg(m.rg);
            const existing = newCache.get(safeRg) || {};
            newCache.set(safeRg, { ...existing, ...m });
          }
        }
        if (fs.existsSync('./data/comunicantes.json')) {
          const mData = JSON.parse(fs.readFileSync('./data/comunicantes.json', 'utf8'));
          for (const m of mData) {
            const safeRg = normalizeRg(m.rg);
            const existing = newCache.get(safeRg) || {};
            newCache.set(safeRg, { ...existing, ...m });
          }
        }
        if (fs.existsSync('./data/graduados.json')) {
          const mData = JSON.parse(fs.readFileSync('./data/graduados.json', 'utf8'));
          for (const m of mData) {
            const safeRg = normalizeRg(m.rg);
            const existing = newCache.get(safeRg) || {};
            newCache.set(safeRg, { ...existing, ...m });
          }
        }
        if (fs.existsSync('./data/cbs.json')) {
          const mData = JSON.parse(fs.readFileSync('./data/cbs.json', 'utf8'));
          for (const m of mData) {
            const safeRg = normalizeRg(m.rg);
            const existing = newCache.get(safeRg) || {};
            newCache.set(safeRg, { ...existing, ...m });
          }
        }
        if (fs.existsSync('./data/auxiliares.json')) {
          const mData = JSON.parse(fs.readFileSync('./data/auxiliares.json', 'utf8'));
          for (const m of mData) {
            const safeRg = normalizeRg(m.rg);
            const existing = newCache.get(safeRg) || {};
            newCache.set(safeRg, { ...existing, ...m });
          }
        }
      } catch (e) {
        console.error('[Cache] Failed loading extra json:', e);
      }

      console.log(`[Cache] Spreadsheet loaded with ${newCache.size} records.`);
      militaryCache = new Map(newCache); // Update the global cache immediately
      isCacheLoaded = true; // Mark as loaded so API calls can proceed
    }
  } catch (err: any) {
    console.error('[Cache] Spreadsheet load failed:', err.message);
  }
}

async function initFirebaseAdmin() {
  const targetProject = firebaseConfig.projectId;
  console.log(`[Firebase] Initializing. Target Project from Config: ${targetProject}`);

  try {
    // Force reset if already initialized
    if (admin.apps.length > 0) {
      try { await admin.app().delete(); } catch(e) {}
    }
    
    // Check if we have an explicit Service Account provided via Environment Variable (for Render/External)
    const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (saJson) {
      console.log(`[Firebase] Using Service Account from environment variable.`);
      const sa = JSON.parse(saJson);
      admin.initializeApp({
        credential: admin.credential.cert(sa),
        projectId: sa.project_id
      });
    } else if (targetProject && targetProject !== 'remixed-project-id' && targetProject !== '') {
      console.log(`[Firebase] Initializing with explicit ProjectID: ${targetProject}`);
      admin.initializeApp({ projectId: targetProject });
    } else {
      console.log(`[Firebase] Initializing with ADC...`);
      admin.initializeApp();
    }
    
    console.log(`[Firebase] Admin initialized for: ${admin.app().options.projectId}`);
  } catch (e: any) {
    console.error('[Firebase] Admin Init error:', e.message);
    if (admin.apps.length === 0) {
      try { admin.initializeApp(); } catch (f) {}
    }
  }

  const app = admin.app();
  const project = app.options.projectId || 'unknown';
  const configDbId = firebaseConfig.firestoreDatabaseId;
  
  console.log(`[Firebase] Resolved Project: ${project}, Config DB ID: ${configDbId}`);

  // Test databases: Attempt configured ID first, then fallback to (default)
  const dbCandidates = [];
  if (configDbId && configDbId !== 'remixed-firestore-database-id' && configDbId !== '(default)' && configDbId !== '') {
    dbCandidates.push(configDbId);
  }
  dbCandidates.push('(default)');

  let connected = false;
  
  // Initialize Client SDK too
  try {
     const clientApp = initializeApp(firebaseConfig);
     clientDb = getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId || '(default)');
     console.log('[Firebase] Client SDK initialized for DB operations');
  } catch(e: any) {
     console.error('[Firebase] Client SDK init error:', e.message);
  }

  for (const dbId of dbCandidates) {
    let currentTestDb: any = null;
    try {
      console.log(`[Firebase] Probing database "${dbId}"...`);
      currentTestDb = getFirestore(app, dbId);
      
      // Perform a minimal check - if this fails with permission denied, we should try next candidate
      // We use a non-existent document get to test connectivity without needing actual data
      await currentTestDb.collection('health_check_probe').doc('test').get();
      
      db = currentTestDb;
      console.log(`[Firebase] SUCCESS: Connected to database "${dbId}"`);
      isDbHealthy = true;
      connected = true;
      break;
    } catch (err: any) {
      console.warn(`[Firebase] DB "${dbId}" probe FAILED with code ${err.code}: ${err.message}`);
      // If we get PERMISSION_DENIED (7) but not NOT_FOUND (5), it might still be the right database
      // but just restricted by IAM or other conditions.
      if (err.code !== 5 && dbId !== '(default)') {
        console.log(`[Firebase] Accepted database "${dbId}" despite probe failure (code ${err.code} != 5).`);
        db = currentTestDb;
        isDbHealthy = true;
        connected = true;
        break;
      }
    }
  }

  if (!connected) {
    console.error(`[Firebase] All database candidates failed. Falling back to default app database handle.`);
    try {
      const fallbackDb = getFirestore(app);
      // Brief test of default
      await fallbackDb.collection('health_check_probe').doc('test').get();
      db = fallbackDb;
      isDbHealthy = true; 
      console.log(`[Firebase] SUCCESS: Fallback to (default) database succeeded.`);
    } catch (e: any) {
      console.error(`[Firebase] Fatal: Could not initialize ANY firestore handle. Error: ${e.message}`);
      // We set it anyway as a last resort, maybe it will work later?
      try {
        db = getFirestore(app);
      } catch(e2) {}
    }
  }
}

let isDbHealthy = false;

async function startServer() {
  console.log('[Server] SERVER HAS STARTED V123');
  console.log('[Server] Initializing routes...');
  
  // Initialize Firebase and cache eagerly with a safety timeout for the whole process
  const initTimeout = 30000;
  
  // Load cache from spreadsheet IMMEDIATELY so it's available as fast as possible
  // Don't wait for Firebase init to start loading basic data
  console.log('[Server] Starting background data initialization...');
  
  const sheetCachePromise = loadMilitaryCache().catch(e => {
    console.error('[Cache] Initial sheet load failed:', e.message);
  });
  
  const firebaseInitPromise = initFirebaseAdmin().catch(e => {
    console.error('[Firebase] fatal admin init error:', e.message);
    isDbHealthy = false;
  });

  async function supplementFromFirestore() {
    if (clientDb || (isDbHealthy && db)) {
      try {
        console.log('[Cache] Supplementing with Firestore data BEFORE serving...');
        let snapshot;
        if (clientDb) {
           snapshot = await getDocs(collection(clientDb, 'militaries'));
        } else {
           snapshot = await db.collection('militaries').get();
        }
        let supplementCount = 0;
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          const safeId = normalizeRg(doc.id);
          const safeDataRg = normalizeRg(data.rg);
          const safeRg = safeId || safeDataRg;
          
          if (safeRg) {
            const existing = militaryCache.get(safeRg);
            if (existing) {
              militaryCache.set(safeRg, { ...existing, ...data }); 
              supplementCount++;
            } else {
              if (!data.name) {
                data.name = (data.rank ? data.rank + ' ' : '') + (data.warName || 'Militar');
              }
              militaryCache.set(safeRg, data);
              supplementCount++;
            }
          }
        });
        console.log(`[Cache] Firestore supplement finished. Updated/Added ${supplementCount} records.`);
      } catch (err: any) {
        console.error('[Cache] Firestore merge failed:', err.message);
      }
    }
  }

  cachePromise = Promise.race<void>([
    Promise.all([sheetCachePromise, firebaseInitPromise]).then(supplementFromFirestore),
    new Promise<void>((_, reject) => setTimeout(() => reject(new Error('Background Init Timeout')), initTimeout))
  ]).catch(e => {
    console.error('[Server] background init timeout or error:', e.message);
  });

  const app = express();
  const PORT = 3000;

  // 1. Permissive CORS for extensions/bookmarklets
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    // Allow any origin for the synchronization API
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(compression());
  app.use(express.text({ limit: '20mb' })); // will parse text/plain by default
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // API Health check with more details
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      db: db ? 'connected' : 'not_available',
      auth: admin.apps.length > 0 ? 'ready' : 'not_ready',
      time: new Date().toISOString() 
    });
  });

  // Global Logging for API
  app.use('/api/*', (req, res, next) => {
    console.log(`[API] ${req.method} ${req.originalUrl}`);
    next();
  });

  app.get('/api/test', (req, res) => {
    res.json({ success: true, message: 'HELLO FROM EXPRESS V2.0' });
  });

  app.get('/api/admin/extension/raw/:filename', (req, res) => {
    try {
      const { filename } = req.params;
      const extensionPath = path.join(process.cwd(), 'intranet-extension');
      let targetFile = '';

      if (filename === 'manifest') targetFile = 'manifest.json';
      else if (filename === 'content') targetFile = 'content.js';
      else if (filename === 'popupjs') targetFile = 'popup.js';
      else if (filename === 'popuphtml') targetFile = 'popup.html';
      else return res.status(404).send('Not found');

      const fullPath = path.join(extensionPath, targetFile);
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: 'File not found locally' });
      }

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(fs.readFileSync(fullPath, 'utf-8'));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  app.get('/api/admin/vacation/debug', async (req, res) => {
    try {
      if (clientDb) {
        const snap = await getDocs(query(collection(clientDb, 'vacations'), limit(10)));
        res.json({ db: !!clientDb, data: snap.docs.map(d => d.data()) });
      } else {
        res.json({ db: false, data: [] });
      }
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });


  app.get('/api/admin/vacation/debug2', async (req, res) => {
    try {
      if (clientDb) {
        await setDoc(doc(clientDb, 'vacations', 'testrg_2026_0101'), { militarRg: 'test' });
        res.json({ success: true });
      } else {
        res.json({ db: false });
      }
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: '2.1', time: new Date().toISOString() });
  });

  // Add explicit route logging to debug 404s
  app.use('/api/admin/*', (req, res, next) => {
    console.log(`[AdminAPI] ${req.method} ${req.originalUrl}`);
    next();
  });

  app.post('/api/admin/vacation/bulk-sync', bulkSyncHandler);
  app.post('/api/admin/vacation/bulk-sync/', bulkSyncHandler);
  app.post('/api/admin/vacations/bulk-sync', bulkSyncHandler);
  app.post('/api/admin/vacations/bulk-sync/', bulkSyncHandler);
  app.post('/api/sync/vacations', bulkSyncHandler);
  app.post('/api/sync/vacations/', bulkSyncHandler);

  async function bulkSyncHandler(req: any, res: any) {
    try {
      console.log(`[BulkSync] Request received from: ${req.headers.origin || 'unknown'}`);
      
      // Handle the case where body might not be parsed (e.g. if content-type was slightly different)
      let data = req.body;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) {}
      }

      const { vacations } = data || {};
      console.log(`[BulkSync] Received ${vacations?.length || 0} vacations`);
      
      if (!vacations || !Array.isArray(vacations)) {
        console.error('[BulkSync] Error: Invalid vacations list or body empty');
        return res.status(200).json({ success: false, error: 'Lista de férias vazia ou inválida', received: typeof data });
      }

      const timestamp = new Date().toISOString();
      const serverTimestampValue = admin.firestore?.FieldValue?.serverTimestamp() || timestamp;
      
      // Preference: Use Admin SDK if available for efficiency and reliability
      if (db) {
        try {
          console.log(`[BulkSync] Processing ${vacations.length} records using Admin SDK...`);
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
          
          console.log(`[BulkSync] Successfully saved ${count} records using Admin SDK`);
          return res.json({ success: true, count });
        } catch (adminErr: any) {
          if (adminErr.code === 7 || adminErr.message?.includes('PERMISSION_DENIED')) {
            console.log(`[BulkSync] Admin SDK write restricted by IAM (expected in preview). Falling back to REST API...`);
          } else {
            console.warn(`[BulkSync] Admin SDK failed: ${adminErr.message}. Falling back to REST...`);
          }
          // Continue to REST fallback below
        }
      } 
      
      // Fallback: REST API (only if Admin SDK is not ready)
      console.log('[BulkSync] Admin SDK not available, attempting REST API fallback...');
      if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
        throw new Error('Database handles not available (No Admin DB and no REST config)');
      }

      const writes = [];
      for (const v of vacations) {
        if (!v) continue;
        const cleanRg = normalizeRg(v.militarRg);
        if (!cleanRg) continue;
        
        const docId = `${cleanRg}_${v.anoRef || '0000'}_${(v.dataInicio || '').replace(/\//g, '')}`;
        const name = `projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId || '(default)'}/documents/vacations/${docId}`;
        
        console.log(`[BulkSync REST] Preparing: ${docId}`);
        
        writes.push({
          update: {
            name,
            fields: {
              id: { stringValue: docId },
              militarRg: { stringValue: cleanRg },
              anoRef: { stringValue: String(v.anoRef || '') },
              dataInicio: { stringValue: String(v.dataInicio || '') },
              dataRetorno: { stringValue: String(v.dataRetorno || '') },
              status: { stringValue: String(v.status || 'marcado') },
              boletim: { stringValue: String(v.boletim || '') },
              boletimOrigem: { stringValue: String(v.boletimOrigem || '') },
              diasGozados: { integerValue: String(v.diasGozados || 0) },
              diasAGozar: { integerValue: String(v.diasAGozar || 0) },
              ato: { stringValue: String(v.ato || 'Concessão') },
              obs: { stringValue: String(v.obs || '') },
              updatedAt: { timestampValue: timestamp }
            }
          }
        });
      }

      if (writes.length > 0) {
        const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId || '(default)'}/documents:commit?key=${firebaseConfig.apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ writes })
        });
        
        if (!response.ok) {
           const errText = await response.text();
           throw new Error(`REST API Failed: ${errText}`);
        }
        console.log(`[BulkSync] Successfully saved ${vacations.length} records via REST`);
      }
      res.json({ success: true, count: vacations.length });
    } catch (e: any) {
      console.error('[BulkSync] CRITICAL ERROR:', e);
      res.status(200).json({ success: false, error: e.message, stack: e.stack?.substring(0, 100) });
    }
  }

  app.post('/api/admin/militaries/bulk-sync', async (req, res) => {
    const { militaries } = req.body;
    if (!militaries || !Array.isArray(militaries)) {
      return res.status(400).json({ success: false, error: 'Lista de militares inválida' });
    }
    if (db) {
      let savedCount = 0;
      try {
        let currentBatch = db.batch();
        let batchCount = 0;
        
        for (const m of militaries) {
          const safeRg = normalizeRg(m.rg);
          if (!safeRg) continue;
          
          const docRef = db.collection('militaries').doc(safeRg);
          currentBatch.set(docRef, {
             ...m,
             updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          
          militaryCache.set(safeRg, { ...militaryCache.get(safeRg), ...m });

          batchCount++;
          savedCount++;
          
          if (batchCount >= 450) {
             await currentBatch.commit();
             currentBatch = db.batch();
             batchCount = 0;
          }
        }
        if (batchCount > 0) {
           await currentBatch.commit();
        }
      } catch (e: any) {
        if (e.code === 7 || (e.message && e.message.includes('PERMISSION_DENIED'))) {
           console.log('[MilitariesSync] DB write restricted (IAM). Cache updated successfully.');
        } else {
           console.error('[MilitariesSync] Error during batch:', e);
        }
      }
      res.json({ success: true, count: savedCount });
    } else {
      res.status(500).json({ success: false, error: 'Database not available' });
    }
  });
  app.post("/api/auth/verify-session", async (req: any, res: any) => {
    const { uid, rg, verifyCode } = req.body;
    
    if (!uid || !rg) {
       return res.status(400).json({ success: false, error: 'UID e RG são obrigatórios' });
    }
    
    try {
      // Wait for cache with a short limit to prevent hanging UI
      if (!isCacheLoaded && cachePromise) {
        await Promise.race([
          cachePromise,
          new Promise(resolve => setTimeout(resolve, 5000))
        ]);
      }
      
      const safeRg = normalizeRg(rg);

      // Proactive load if empty
      if (militaryCache.size === 0) {
        try {
          await Promise.race([
            loadMilitaryCache(),
            new Promise(resolve => setTimeout(resolve, 3000))
          ]);
        } catch (e) {}
      }
      
      let cached = militaryCache.get(safeRg);
      
      // Always fetch from DB for freshest profile data during verify-session
      if (isDbHealthy && db) {
        try {
          const docRef = db.collection('militaries').doc(safeRg);
          const docSnap = await docRef.get();
          if (docSnap.exists) {
            cached = { ...cached, ...docSnap.data() };
            if (cached) {
              if (!cached.name) {
                cached.name = (cached.rank ? cached.rank + ' ' : '') + (cached.warName || 'Militar');
              }
              militaryCache.set(safeRg, cached);
            }
          }
        } catch (e) {}
      }

      const isRancho = normalizeRg(rg) === 'RANCHO';

      const profile = {
        uid: uid,
        rg: rg,
        name: cached?.name || (isRancho ? 'RANCHO' : 'Militar'),
        rank: cached?.rank || (isRancho ? 'CIVIL' : ''),
        warName: cached?.warName || '',
        ala: cached?.ala || '1',
        isAdmin: ['123', '43644', '28019', '54444'].includes(normalizeRg(rg)) || cached?.isAdmin || false,
        isEscalante: cached?.isEscalante || false,
        isRefeitorioAdmin: isRancho || cached?.isRefeitorioAdmin || false,
        obm: cached?.obm,
        quadro: cached?.quadro,
        cidade: cached?.cidade,
        idFuncional: cached?.idFuncional,
        cel: cached?.cel,
        cel2: cached?.cel2,
        tel: cached?.tel,
        email: cached?.email,
        email2: cached?.email2,
        situacao: cached?.situacao,
        endereco: cached?.endereco,
        nascimento: cached?.nascimento,
        cursos: cached?.cursos,
        lastProfileUpdate: cached?.lastProfileUpdate
      };

      if (isDbHealthy && db) {
        try {
          await db.collection('users').doc(uid).set({
            ...profile,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } catch (syncErr) {
          // Ignore sync errors from Cloud Run ADC permission denied
        }
      }

      if (admin.apps.length > 0) {
        try {
          await admin.auth().setCustomUserClaims(uid, {
            rg: profile.rg,
            isAdmin: profile.isAdmin,
            isEscalante: profile.isEscalante
          });
        } catch (e: any) {
          if (!e.message?.includes('Identity Toolkit')) {
            console.error('[Auth] Failed to set custom claims:', e.message || e);
          }
        }
      }

      return res.json({ success: true, profile });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Login API
  app.post('/api/login', async (req, res) => {
    let { rg: rawRg, password, uid: clientUid } = req.body;
    console.log(`Login attempt for RG: ${rawRg}, Client UID: ${clientUid || 'none'}`);

    if (!rawRg || !password) {
      return res.status(400).json({ error: 'RG e senha são obrigatórios' });
    }

    const isAdminLogin = rawRg.endsWith('-admin');
    const baseRg = isAdminLogin ? rawRg.replace('-admin', '').trim() : rawRg.trim();
    const safeRg = normalizeRg(baseRg);

    try {
      let userData: any = null;

      // 0. Validate Master or Real User First Step
      const isValidMaster = safeRg === '123' && password === '01011990';
      const isRancho = ['RANCHO10', 'RANCHO210', 'RANCHO310', 'RANCHO410'].includes(safeRg) && password === '0000';
      
      if (isValidMaster) {
        userData = { name: 'TC ADMINISTRADOR MESTRE', rank: 'TC', ala: '1', rg: '123' };
      } else if (isRancho) {
        // Map normalized RG back to display name if needed, or just use RG
        const displayNameParts: Record<string, string> = {
          'RANCHO10': 'RANCHO 10º',
          'RANCHO210': 'RANCHO 2/10',
          'RANCHO310': 'RANCHO 3/10',
          'RANCHO410': 'RANCHO 4/10',
        };
        userData = { name: displayNameParts[safeRg] || safeRg, rank: 'CIVIL', ala: '1', rg: safeRg, isRefeitorioAdmin: true };
      } else {
        // 1. Try Memory Cache
        userData = militaryCache.get(safeRg);

        // 2. Try Firestore ALWAYS to get the freshest data
        if (isDbHealthy && db) {
          try {
            const docRef = db.collection('militaries').doc(safeRg);
            const docSnap = await docRef.get();
            if (docSnap.exists) {
              userData = { ...userData, ...docSnap.data() };
              // Fetch private data too
              const privateDoc = await db.collection('militaries').doc(safeRg).collection('private').doc('secrets').get();
              if (privateDoc.exists) {
                userData = { ...userData, ...privateDoc.data() };
              }
              militaryCache.set(safeRg, userData);
            }
          } catch (dbError: any) {
            if (!dbError.message.includes('PERMISSION_DENIED')) {
              const proj = admin.app().options.projectId;
              console.warn(`[DB] Internal database access failed (RG: ${baseRg}, Project: ${proj}):`, dbError.message);
            } else {
              isDbHealthy = false;
            }
          }
        }

        // 3. Fallback to Sheet
        if (!userData) {
          console.log(`Checking Sheet for ${baseRg}...`);
          try {
            const response = await axios.get(SHEET_URL, { 
              timeout: 90000,
              headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const lines = response.data.split('\n');
            const upperLines = lines.map((l: string) => l.toUpperCase());
            let headerIndex = upperLines.findIndex((line: string) => line.includes('RG') && line.includes('NOME') && line.includes('POSTO/GRAD'));
            
            if (headerIndex === -1) {
              headerIndex = upperLines.findIndex((line: string) => line.includes('RG'));
            }
            
            if (headerIndex === -1) {
              headerIndex = 2; // Default based on debug
            }
            
            if (headerIndex !== -1) {
              const csvData = lines.slice(headerIndex).join('\n');
              const records = parse(csvData, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                relax_column_count: true,
              });

              const user = records.find((m: any) => normalizeRg(m['RG']) === safeRg);
              if (user) {
                const warName = (user['N.Guerra'] || '').toString().trim();
                const fullName = (user['NOME'] || '').toString().trim();
                const rank = (user['Posto/Grad'] || '').toString().trim();
                
                userData = {
                  name: (rank ? rank + ' ' : '') + (warName || fullName || 'Militar'),
                  warName: warName || (fullName || '').split(' ')[0] || 'Militar',
                  rank: rank,
                  ala: (user['ALA'] || '1').toString().trim(),
                  rg: user['RG'] || baseRg,
                  birthDate: (user['Nascimento'] || '').toString().trim()
                };
              }
            }
          } catch (sheetError: any) {
            console.error(`[Sheet] Spreadsheet fetch failed: ${sheetError.message}`);
          }
        }
      }

    if (userData) {
        // Sync back to cache for subsequent lookups if it came from fallback
        if (!militaryCache.has(safeRg)) {
          console.log(`[Auth] Populating cache for ${safeRg} after successful fallback lookup.`);
          militaryCache.set(safeRg, userData);
        }
        
        const mBirth = (userData.birthDate || '').toString().trim();
        const cleanBirth = mBirth.replace(/\//g, '').replace(/\./g, '').replace(/-/g, '');
        const isCorrectPass = userData.customPassword ? 
          (userData.customPassword === password) :
          (cleanBirth === password || (cleanBirth.length === 8 && cleanBirth.substring(4) + cleanBirth.substring(2,4) + cleanBirth.substring(0,2) === password));

        if (isCorrectPass || isValidMaster || isRancho) {
          const uid = `rg_${baseRg}`;
          const profile = {
            uid,
            name: userData.name,
            rank: userData.rank,
            warName: userData.warName || '',
            ala: userData.ala,
            rg: baseRg,
            isAdmin: isAdminLogin || isValidMaster || userData.isAdmin || false,
            isEscalante: userData.isEscalante || false,
            isRefeitorioAdmin: isRancho || userData.isRefeitorioAdmin || false,
            obm: userData.obm,
            quadro: userData.quadro,
            cidade: userData.cidade,
            idFuncional: userData.idFuncional,
            cel: userData.cel,
            cel2: userData.cel2,
            tel: userData.tel,
            email: userData.email,
            email2: userData.email2,
            situacao: userData.situacao,
            endereco: userData.endereco,
            nascimento: userData.nascimento,
            lastProfileUpdate: userData.lastProfileUpdate
          };

          if (isDbHealthy && db) {
            const syncData = {
              rg: baseRg,
              name: profile.name,
              rank: profile.rank,
              isAdmin: profile.isAdmin,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            // Truly non-blocking sync: move to next tick
            setImmediate(() => {
              try {
                db.collection('users').doc(uid).set(syncData, { merge: true }).catch(err => {
                   if (!err.message.includes('PERMISSION_DENIED')) {
                     console.error('[Auth] Sync users failed:', err.message);
                   }
                });
                if (clientUid && clientUid !== uid) {
                   db.collection('users').doc(clientUid).set(syncData, { merge: true }).catch(() => {});
                }
              } catch (e) {}
            });
          }

          // Generate Firebase Custom Token
          let customToken = '';
          if (admin.apps.length > 0) {
            try {
               const claims = { rg: profile.rg, isAdmin: profile.isAdmin, isEscalante: profile.isEscalante };
               customToken = await admin.auth().createCustomToken(uid, claims);
               console.log(`[Auth] Custom token generated for ${uid}`);
            } catch (err: any) {
               if (!err.message.includes('signBlob') && !err.message.includes('iam.serviceAccounts') && !err.message.includes('Identity Toolkit')) {
                 console.error(`[Auth] Custom token generation FAILED for ${uid}: ${err.message}`);
               }
               customToken = '';
            }
          }

          // Generate a transient verification code for the client to "claim" this RG session
          const verifyCode = Math.random().toString(36).substring(2, 15);
          
          console.log(`Login successful for ${baseRg}. VerifyCode generated.`);
          return res.json({ success: true, profile, verifyCode, token: customToken });
        }
      }

      console.log(`Login failed for ${baseRg}`);
      return res.status(401).json({ error: 'RG ou Senha incorretos' });
    } catch (error: any) {
      console.error('General login error:', error.message);
      return res.status(500).json({ error: 'Erro no servidor de autenticação' });
    }
  });

    // Lookup API - Resilient & Fast
  app.get('/api/csv', async (req, res) => {
    try {
      const response = await axios.get(SHEET_URL, { timeout: 90000 });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.send(response.data);
    } catch (e: any) {
      res.status(500).send("Error fetching CSV: " + e.message);
    }
  });

  const OBM_HIERARCHY: Record<string, string[]> = {
    '10º GBM': ['10º GBM', '1/10', '2/10', '3/10', '4/10'],
    '1/10': ['1/10'],
    '2/10': ['2/10'],
    '3/10': ['3/10'],
    '4/10': ['4/10'],
    '26º GBM': ['26º GBM', '1/26'],
    '1/26': ['1/26']
  };

  app.get('/api/militar', async (req, res) => {
    // Return all users in the cache
    if (!isCacheLoaded && cachePromise) {
      try {
        await Promise.race([
          cachePromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
        ]);
      } catch (e) {
        // Fallthrough
      }
    }
    
    // Convert Map to Array
    let allUsers = Array.from(militaryCache.values()).map(user => ({
      rg: user.rg,
      name: user.name,
      rank: user.rank,
      warName: user.warName,
      ala: user.ala,
      obm: user.obm,
      lentTo: user.lentTo,
      quadro: user.quadro,
      cidade: user.cidade,
      idFuncional: user.idFuncional,
      cel: user.cel,
      cel2: user.cel2,
      tel: user.tel,
      email: user.email,
      email2: user.email2,
      situacao: user.situacao,
      endereco: user.endereco,
      nascimento: user.nascimento,
      specializations: user.specializations,
      cursos: user.cursos,
      isAdmin: user.isAdmin,
      adminObms: user.adminObms,
      isEscalante: user.isEscalante,
      escalanteObms: user.escalanteObms,
      isRefeitorioAdmin: user.isRefeitorioAdmin,
      ativoCondutor: user.ativoCondutor,
      viaturas: user.viaturas,
      ativoEncarregado: user.ativoEncarregado,
      ativoAbastecedor: user.ativoAbastecedor,
      ativoChefeGua: user.ativoChefeGua,
      chefeAbt: user.chefeAbt,
      chefeAbsl: user.chefeAbsl,
      ativoMaritimo: user.ativoMaritimo,
      mestreAl: user.mestreAl,
      mestreBia: user.mestreBia,
      opAma: user.opAma,
      gvAma: user.gvAma,
      marinheiros: user.marinheiros,
      ativoEnfermeiro: user.ativoEnfermeiro,
      ativoComunicante: user.ativoComunicante,
      ativoGraduado: user.ativoGraduado,
      ativoCbsSds: user.ativoCbsSds,
      adjunto: user.adjunto,
      sgtDia: user.sgtDia,
      cmtGuarda: user.cmtGuarda,
      disponivel1: user.disponivel1,
      disponivel2: user.disponivel2,
      faxina: user.faxina,
      sentinela: user.sentinela,
      deposito: user.deposito,
      toqueDeFogo: user.toqueDeFogo,
      auxRancho: user.auxRancho,
      cbGuarda: user.cbGuarda,
      cbDia: user.cbDia,
      disponivelCbsSds: user.disponivelCbsSds,
      ativoAuxiliar: user.ativoAuxiliar,
      auxAbt: user.auxAbt,
      auxAbsl: user.auxAbsl,
      auxArc: user.auxArc,
      auxAse: user.auxAse,
      disponivelAux: user.disponivelAux
    }));

    const requesterRg = req.query.rg as string;
    
    // Server-side blindagem regional
    if (requesterRg) {
      const requester = militaryCache.get(requesterRg);
      // Se isAdmin for true, eles são Global Admins e não filtramos (vêem tudo).
      if (requester && !requester.isAdmin) {
         const userObm = requester.obm || '';
         const allowedSet = new Set<string>();
         
         // Por padrão o militar vê a própria OBM (e suas subordinadas)
         (OBM_HIERARCHY[userObm] || [userObm]).forEach(o => allowedSet.add(o));
         
         // E também as OBMs sobre as quais ele possua privilégios explícitos
         if (requester.adminObms) requester.adminObms.forEach(o => allowedSet.add(o));
         if (requester.escalanteObms) requester.escalanteObms.forEach(o => allowedSet.add(o));
         
         const allowedObms = Array.from(allowedSet);
         allUsers = allUsers.filter(u => allowedObms.includes(u.obm || '') || allowedObms.includes(u.lentTo || ''));
      }
    }

    res.json({ success: true, count: allUsers.length, members: allUsers });
  });

  app.get('/api/militar/:rg', async (req, res) => {
    const { rg } = req.params;
    if (!rg) return res.status(400).json({ success: false });

    console.log(`[API] GET /api/militar/${rg}`);

    // Wait for initial cache load if it hasn't finished yet, but with a timeout!
    if (!isCacheLoaded && cachePromise) {
      console.log(`[API] Lookup for ${rg} waiting for cache (max 2s)...`);
      try {
        await Promise.race([
          cachePromise.catch(() => {}), // Ignore rejection
          new Promise(resolve => setTimeout(resolve, 2000))
        ]);
      } catch (e) {
        console.warn(`[API] Cache wait failed for ${rg}, continuing without cache.`);
      }
    }

    const safeRg = normalizeRg(rg);
    console.log(`[API] Normalized RG for search: ${safeRg}. Cache size: ${militaryCache.size}`);

    // Proactive Recovery: If cache is empty, trigger a background reload and wait slightly
    if (militaryCache.size === 0) {
      console.warn(`[API] CACHE IS EMPTY during lookup for ${safeRg}. Triggering urgent reload...`);
      try {
        await Promise.race([
          loadMilitaryCache(),
          new Promise(resolve => setTimeout(resolve, 3000)) // Wait max 3s for first batch
        ]);
      } catch (e) {
        console.error('[API] Urgent cache reload failed or timed out.');
      }
    }

    try {
      // 1. Instant Cache Check
      let member = militaryCache.get(safeRg);
      
      if (member) {
        console.log(`[API] Found ${safeRg} in cache.`);
      } else {
        console.log(`[API] ${safeRg} not found in cache. Checking DB...`);
      }

      // 2. Database Fallback (if not in cache or cache failed to load something)
      if (!member && isDbHealthy && db) {
        try {
          const docSnap = await db.collection('militaries').doc(safeRg).get();
          if (docSnap.exists) {
            member = docSnap.data();
            console.log(`[API] Found ${safeRg} in Firestore.`);
            if (member) militaryCache.set(safeRg, member);
          } else {
             console.log(`[API] ${safeRg} not found in Firestore.`);
          }
        } catch (e: any) {
           console.log(`[API] Firestore error looking up ${safeRg}: ${e.message}`);
           if (e.message.includes('PERMISSION_DENIED')) {
             isDbHealthy = false; 
           }
        }
      }

      if (member) {
        return res.json({ 
          success: true, 
          member: {
            name: member.name || 'Militar',
            rank: member.rank || '',
            warName: member.warName || '',
            rg: member.rg || rg,
            ala: member.ala || '1'
          } 
        });
      }
      
      console.log(`[API] Militar ${safeRg} not localized.`);
      return res.status(404).json({ success: false, message: 'Militar não localizado' });
    } catch (err: any) {
      console.error('[API] Lookup fatal error:', err.message);
      return res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  // Admin Sync API (Exclusively for Militaries Database)
  // BACKGROUND SYNC: Optimized for perceived performance

  app.get('/api/admin/extension/download', (req, res) => {
    try {
      const extensionPath = path.join(process.cwd(), 'intranet-extension');
      if (!fs.existsSync(extensionPath)) {
        return res.status(404).json({ error: 'Extensão não encontrada no servidor' });
      }

      res.attachment('extensao-dgp-bulk-sync.zip');
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('error', function(err) {
        res.status(500).send({error: err.message});
      });

      archive.pipe(res);
      archive.directory(extensionPath, false);
      archive.finalize();
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/admin/sync', async (req, res) => {
    if (isSyncing) {
      return res.status(409).json({ error: 'Sincronização já em andamento.' });
    }

    try {
      console.log('[Sync] Initiating synchronization...');
      isSyncing = true;
      
      // Start the heavy work in background
      (async () => {
        const startTime = Date.now();
        try {
          const response = await axios.get(SHEET_URL, { timeout: 90000 });
          const lines = response.data.split('\n');
          const upperLines = lines.map((l: string) => l.toUpperCase());
          let headerIndex = upperLines.findIndex((line: string) => line.includes('RG') && line.includes('NOME') && line.includes('POSTO/GRAD'));
          
          if (headerIndex === -1) {
            headerIndex = upperLines.findIndex((line: string) => line.includes('RG'));
          }
          
          if (headerIndex === -1) {
            headerIndex = 2; // Default based on debug
          }

          const csvData = lines.slice(headerIndex).join('\n');
          const records = parse(csvData, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true,
          });

          const parseQuadro = (q: string) => {
            if (!q) return '';
            const parts = q.split('/');
            if (parts.length > 1) {
              parts.pop();
              return parts.join('/');
            }
            return q;
          };

          const parseRecord = (m: Record<string, any>) => {
            const rawRg = (m['RG'] || '').toString().trim();
            if (!rawRg || rawRg.toUpperCase() === 'RG') return null;
            
            const safeRg = normalizeRg(rawRg);
            const warName = (m['N.Guerra'] || '').toString().trim();
            const fullName = (m['NOME'] || '').toString().trim();
            const rank = (m['Posto/Grad'] || '').toString().trim();
            
            let ala = (m['ALA'] || '1').toString().trim();
            if (ala.toUpperCase() === 'ALA') ala = '';

            let obm = (m['OBM'] || '').toString().trim();
            if (obm.toUpperCase() === '10º' || obm.toUpperCase() === 'OBM' || obm.toUpperCase() === '10º GBM' || !obm) {
              obm = '10º GBM';
            }

            const rawQuadro = (m['Quadro'] || m['QUADRO'] || '').toString().trim();
            const quadro = parseQuadro(rawQuadro);
            
            const cidade = (m['Cidade'] || m['CIDADE'] || '').toString().trim();
            const idFuncional = (m['ID Funcional'] || '').toString().trim();
            const cel = (m['Cel'] || '').toString().trim();
            const tel = (m['Tel'] || '').toString().trim();
            const email = (m['E-mail'] || '').toString().trim();
            const situacao = (m['Situação'] || '').toString().trim();

            return {
              safeRg,
              rawRg,
              name: fullName,
              rank,
              warName: warName || (fullName || '').split(' ')[0] || 'Militar',
              ala,
              obm,
              quadro,
              cidade,
              idFuncional,
              cel,
              tel,
              email,
              situacao,
              birthDate: (m['Nascimento'] || '').toString().trim()
            };
          };

          let totalUpdated = 0;
          let dbErrors = 0;

          const newCache = new Map();
          
          if (db) {
            console.log(`[Sync] Processing ${records.length} records into Firestore database`);
            syncProgress = { current: 0, total: records.length };
            
            let currentBatch = db.batch();
            let batchCount = 0;

            for (const m of records) {
              const parsed = parseRecord(m);
              if (!parsed) {
                syncProgress.current++;
                continue;
              }
              
              const mData: any = {
                name: parsed.name,
                rank: parsed.rank,
                warName: parsed.warName,
                rg: parsed.rawRg,
                ala: parsed.ala,
                obm: parsed.obm,
                quadro: parsed.quadro,
                idFuncional: parsed.idFuncional,
                situacao: parsed.situacao,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              };
              if (parsed.cidade) mData.cidade = parsed.cidade;
              if (parsed.cel) mData.cel = parsed.cel;
              if (parsed.tel) mData.tel = parsed.tel;
              if (parsed.email) mData.email = parsed.email;

              const privateData = {
                birthDate: parsed.birthDate,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              };

              // Cache immediately for memory availability
              newCache.set(parsed.safeRg, { ...mData, ...privateData });

              try {
                const docRef = db.collection('militaries').doc(parsed.safeRg);
                const privateRef = db.collection('militaries').doc(parsed.safeRg).collection('private').doc('secrets');
                currentBatch.set(docRef, mData, { merge: true });
                currentBatch.set(privateRef, privateData, { merge: true });

                batchCount += 2;
                totalUpdated++;
                syncProgress.current++;

                if (batchCount >= 450) {
                  try {
                    console.log(`[Sync] Committing batch of ${batchCount} records...`);
                    await currentBatch.commit();
                  } catch (commitErr: any) {
                    console.error(`[Sync] Batch commit FAILED: ${commitErr.message}`);
                    dbErrors++;
                  }
                  currentBatch = db.batch();
                  batchCount = 0;
                }
              } catch (err: any) {
                dbErrors++;
                if (dbErrors < 10) console.error(`[Sync] Record preparation error:`, err.message);
              }
            }

            if (batchCount > 0) {
              try {
                await currentBatch.commit();
              } catch (err: any) {
                dbErrors++;
                console.error('[Sync] Final Firestore batch failed:', err.message);
              }
            }
            
            // Restore permanent overrides from data/motoristas.json
            try {
              if (fs.existsSync('./data/motoristas.json')) {
                const mData = JSON.parse(fs.readFileSync('./data/motoristas.json', 'utf8'));
                for (const m of mData) {
                  const safeRg = normalizeRg(m.rg);
                  const existing = newCache.get(safeRg) || {};
                  newCache.set(safeRg, { ...existing, ...m });
                }
              }
              if (fs.existsSync('./data/chefes.json')) {
                const cData = JSON.parse(fs.readFileSync('./data/chefes.json', 'utf8'));
                for (const c of cData) {
                  const safeRg = normalizeRg(c.rg);
                  const existing = newCache.get(safeRg) || {};
                  newCache.set(safeRg, { ...existing, ...c });
                }
              }
              if (fs.existsSync('./data/maritimos.json')) {
                const mData = JSON.parse(fs.readFileSync('./data/maritimos.json', 'utf8'));
                for (const m of mData) {
                  const safeRg = normalizeRg(m.rg);
                  const existing = newCache.get(safeRg) || {};
                  newCache.set(safeRg, { ...existing, ...m });
                }
              }
              if (fs.existsSync('./data/enfermeiros.json')) {
                const mData = JSON.parse(fs.readFileSync('./data/enfermeiros.json', 'utf8'));
                for (const m of mData) {
                  const safeRg = normalizeRg(m.rg);
                  const existing = newCache.get(safeRg) || {};
                  newCache.set(safeRg, { ...existing, ...m });
                }
              }
              if (fs.existsSync('./data/comunicantes.json')) {
                const mData = JSON.parse(fs.readFileSync('./data/comunicantes.json', 'utf8'));
                for (const m of mData) {
                  const safeRg = normalizeRg(m.rg);
                  const existing = newCache.get(safeRg) || {};
                  newCache.set(safeRg, { ...existing, ...m });
                }
              }
            } catch (e) {}

            militaryCache = newCache;
            console.log(`[Sync] FINISHED. ${totalUpdated} processed. DB Errors: ${dbErrors}`);
            
            if (dbErrors > 0) {
               console.warn(`[Sync] Warning: ${dbErrors} writes failed. Check project permissions.`);
            }
          } else {
             // NO DB AT ALL - Memory only
              console.log(`[Sync] DB handle missing. Memory sync only for ${records.length} records.`);
             for (const m of records) {
                const parsed = parseRecord(m);
                if (!parsed) continue;
                
                const mData: any = {
                  name: parsed.name,
                  warName: parsed.warName,
                  rank: parsed.rank,
                  rg: parsed.rawRg,
                  ala: parsed.ala,
                  obm: parsed.obm,
                  quadro: parsed.quadro,
                  idFuncional: parsed.idFuncional,
                  situacao: parsed.situacao,
                  birthDate: parsed.birthDate
                };
                if (parsed.cidade) mData.cidade = parsed.cidade;
                if (parsed.cel) mData.cel = parsed.cel;
                if (parsed.tel) mData.tel = parsed.tel;
                if (parsed.email) mData.email = parsed.email;

                // Merge with existing memory to keep user updates
                const existing = newCache.get(parsed.safeRg) || {};
                newCache.set(parsed.safeRg, { ...existing, ...mData });
             }
             // Restore permanent overrides from data/motoristas.json
             try {
               if (fs.existsSync('./data/motoristas.json')) {
                 const mData = JSON.parse(fs.readFileSync('./data/motoristas.json', 'utf8'));
                 for (const m of mData) {
                   const safeRg = normalizeRg(m.rg);
                   const existing = newCache.get(safeRg) || {};
                   newCache.set(safeRg, { ...existing, ...m });
                 }
               }
               if (fs.existsSync('./data/chefes.json')) {
                 const cData = JSON.parse(fs.readFileSync('./data/chefes.json', 'utf8'));
                 for (const c of cData) {
                   const safeRg = normalizeRg(c.rg);
                   const existing = newCache.get(safeRg) || {};
                   newCache.set(safeRg, { ...existing, ...c });
                 }
               }
               if (fs.existsSync('./data/maritimos.json')) {
                 const mData = JSON.parse(fs.readFileSync('./data/maritimos.json', 'utf8'));
                 for (const m of mData) {
                   const safeRg = normalizeRg(m.rg);
                   const existing = newCache.get(safeRg) || {};
                   newCache.set(safeRg, { ...existing, ...m });
                 }
               }
               if (fs.existsSync('./data/enfermeiros.json')) {
                 const mData = JSON.parse(fs.readFileSync('./data/enfermeiros.json', 'utf8'));
                 for (const m of mData) {
                   const safeRg = normalizeRg(m.rg);
                   const existing = newCache.get(safeRg) || {};
                   newCache.set(safeRg, { ...existing, ...m });
                 }
               }
               if (fs.existsSync('./data/comunicantes.json')) {
                 const mData = JSON.parse(fs.readFileSync('./data/comunicantes.json', 'utf8'));
                 for (const m of mData) {
                   const safeRg = normalizeRg(m.rg);
                   const existing = newCache.get(safeRg) || {};
                   newCache.set(safeRg, { ...existing, ...m });
                 }
               }
             } catch (e) {}

             militaryCache = newCache;
             totalUpdated = records.length;
          }
          
          isCacheLoaded = true;

          const duration = Date.now() - startTime;
          console.log(`[Sync] SUCCESS: ${totalUpdated} records in ${duration}ms.`);
          lastSyncResult = { success: true, count: totalUpdated, duration, timestamp: new Date() };
        } catch (error: any) {
          console.error('[Sync] Background error details:', error);
          const errorMsg = error.message || String(error);
          lastSyncResult = { success: false, error: errorMsg, timestamp: new Date() };
        } finally {
          isSyncing = false;
        }
      })();

      // Respond immediately that we started
      res.json({ success: true, message: 'Sincronização iniciada em segundo plano' });
    } catch (error: any) {
      isSyncing = false;
      res.status(500).json({ error: 'Erro ao iniciar sincronização: ' + error.message });
    }
  });

  app.get('/api/debug/db-status', (req, res) => {
    res.json({
        isDbHealthy,
        dbId: firebaseConfig.firestoreDatabaseId || '(default)',
        dbAssigned: !!db,
        hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT
    });
  });

  let cachedAppVisibility: any = null;
  let cachedRoles: any = null;
  let cachedVacationSettings: any = null;
  let cachedAlaConfig: any = null;
  let cachedActiveMonths: any = null;
  let lastStartupFetch = 0;

  app.get('/api/startup', async (req, res) => {
    if (Date.now() - lastStartupFetch > 60000 && clientDb) {
      try {
        const [vis, rol, vac, ala, mon, mur, ref] = await Promise.all([
          getDoc(doc(clientDb, 'config', 'app_visibility')),
          getDoc(doc(clientDb, 'config', 'roles')),
          getDoc(doc(clientDb, 'config', 'vacation_settings')),
          getDoc(doc(clientDb, 'config', 'ala_config')),
          getDoc(doc(clientDb, 'config', 'active_months')),
          getDocs(query(collection(clientDb, 'mural_avisos'), orderBy('createdAt', 'desc'), limit(15))),
          getDoc(doc(clientDb, 'refeitorio', 'data'))
        ]);
        
        if (vis.exists()) cachedAppVisibility = vis.data();
        if (rol.exists()) cachedRoles = rol.data();
        if (vac.exists()) cachedVacationSettings = vac.data();
        if (ala.exists()) cachedAlaConfig = ala.data();
        if (mon.exists()) cachedActiveMonths = mon.data();
        
        cachedMuralAvisos = mur.docs.map(doc => {
           let data = doc.data();
           if (data.createdAt && typeof data.createdAt.toMillis === 'function') data.createdAt = data.createdAt.toMillis();
           return { id: doc.id, ...data };
        });
        
        if (ref.exists()) cachedRefeitorioData = ref.data();
        
        lastStartupFetch = Date.now();
        lastMuralFetch = Date.now();
        lastRefeitorioFetch = Date.now();
      } catch (e) {
        console.error('[API] Startup fetch error:', e);
      }
    }

    return res.json({
      app_visibility: cachedAppVisibility,
      roles: cachedRoles,
      vacation_settings: cachedVacationSettings,
      ala_config: cachedAlaConfig,
      active_months: cachedActiveMonths,
      mural: cachedMuralAvisos,
      refeitorio: cachedRefeitorioData
    });
  });

  // Caches for backend optimized data
  let cachedMuralAvisos: any[] = [];
  let lastMuralFetch = 0;
  
  let cachedRefeitorioData: any = null;
  let lastRefeitorioFetch = 0;
  
  let cachedViaturaAlert: any = null;
  let lastViaturaFetch = 0;
  
  let cachedGuarnicoes: any = null;
  let lastGuarnicoesFetch = 0;

  app.get('/api/mural', async (req, res) => {
    if (Date.now() - lastMuralFetch > 15000 && clientDb) {
      try {
        const q = query(collection(clientDb, 'mural_avisos'), orderBy('createdAt', 'desc'), limit(15));
        const snap = await getDocs(q);
        cachedMuralAvisos = snap.docs.map(doc => {
           let data = doc.data();
           if (data.createdAt && typeof data.createdAt.toMillis === 'function') {
              data.createdAt = data.createdAt.toMillis();
           }
           return { id: doc.id, ...data };
        });
        lastMuralFetch = Date.now();
      } catch (e) {
        console.error('[API] Mural fetch error:', e);
      }
    }
    return res.json(cachedMuralAvisos);
  });

  app.get('/api/refeitorio', async (req, res) => {
    if (Date.now() - lastRefeitorioFetch > 120000 && clientDb) {
      try {
        const snap = await getDoc(doc(clientDb, 'refeitorio', 'data'));
        if (snap.exists()) {
          cachedRefeitorioData = snap.data();
        }
        lastRefeitorioFetch = Date.now();
      } catch (e) {
         console.error('[API] Refeitorio fetch error:', e);
      }
    }
    return res.json(cachedRefeitorioData || { menus: [], catalog: null });
  });

  app.get('/api/viaturas/alerts', async (req, res) => {
    if (Date.now() - lastViaturaFetch > 5000 && clientDb) {
      try {
        const q = query(collection(clientDb, 'viatura_alerts'), orderBy('timestamp', 'desc'), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          cachedViaturaAlert = snap.docs[0].data();
          if (cachedViaturaAlert && cachedViaturaAlert.timestamp && typeof cachedViaturaAlert.timestamp.toMillis === 'function') {
             cachedViaturaAlert.timestamp = cachedViaturaAlert.timestamp.toMillis();
          }
        }
        lastViaturaFetch = Date.now();
      } catch (e) {
        console.warn('[API] Viatura fetch error:', e);
      }
    }
    return res.json(cachedViaturaAlert);
  });

  app.get('/api/guarnicoes', async (req, res) => {
    if (Date.now() - lastGuarnicoesFetch > 10000 && clientDb) {
       try {
         const snap = await getDoc(doc(clientDb, 'guarnicoes', 'ativas'));
         if (snap.exists()) {
            cachedGuarnicoes = snap.data();
         }
         lastGuarnicoesFetch = Date.now();
       } catch (e) {
          console.warn('[API] Guarnicoes fetch error:', e);
       }
    }
    return res.json(cachedGuarnicoes || {});
  });

  let cachedPermutas: any[] = [];
  let lastPermutasFetch = 0;

  app.get('/api/agenda/:rg/:year', async (req, res) => {
    const { rg, year } = req.params;
    if (!rg || !year) return res.status(400).json({ error: 'Missing parameters' });

    if (Date.now() - lastPermutasFetch > 3600000 && clientDb) { // Cache for 1 hour
       try {
           const startDate = `${year}-01-01`;
           const endDate = `${year}-12-31`;
           const q = query(collection(clientDb, 'permutas'), where('date', '>=', startDate), where('date', '<=', endDate));
           const snap = await getDocs(q);
           cachedPermutas = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
           lastPermutasFetch = Date.now();
       } catch (e) {
           console.error('[API] Permutas agenda fetch err:', e);
       }
    }

    const safeRg = normalizeRg(rg);
    
    // Filter internally in Node server
    const userPermutas = cachedPermutas.filter(p => {
       const strReq = String(p.requesterRg).replace(/\D/g, '');
       const strSub = String(p.substituteRg).replace(/\D/g, '');
       return strReq === safeRg || strSub === safeRg;
    });
    
    // Delivered pure datas for Calendar/Agenda
    const permutasPuras = userPermutas.map(p => {
       const type = (String(p.requesterRg).replace(/\D/g, '') === safeRg) ? 'PAGOU' : 'COBREU';
       return { 
         id: p.id, 
         date: p.date, 
         type, 
         status: p.status, 
         requesterRg: p.requesterRg, 
         substituteRg: p.substituteRg, 
         requesterSigned: p.requesterSigned, 
         substituteSigned: p.substituteSigned 
       };
    });

    return res.json({ 
       year,
       permutas: permutasPuras
    });
  });

  app.post('/api/militar/update', async (req, res) => {
    const { rg, data } = req.body;
    if (!rg || !data) return res.status(400).json({ success: false });

    const safeRg = normalizeRg(rg);
    try {
      if (db && isDbHealthy) {
        try {
          await db.collection('militaries').doc(safeRg).set(data, { merge: true });
        } catch (e: any) {
          if (!e.message.includes('PERMISSION_DENIED')) {
            console.error('[API] Failed to update militar data in Firestore:', e);
          }
        }
      }

      const existing = militaryCache.get(safeRg) || {};
      
      const mergedData = { ...existing, ...data };
      if (data.viaturas && existing.viaturas) {
        mergedData.viaturas = { ...existing.viaturas, ...data.viaturas };
      }
      
      militaryCache.set(safeRg, mergedData);
      
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ success: false });
    }
  });

  app.post('/api/change-password', async (req, res) => {
    const { rg, currentPassword, newPassword } = req.body;
    if (!rg || !currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios ausentes' });
    }

    const safeRg = normalizeRg(rg);
    let userData = militaryCache.get(safeRg);

    // If not in cache, fallback check disabled for simplicity - assume they just logged in
    if (!userData && db && isDbHealthy) {
       try {
           const docSnap = await db.collection('militaries').doc(safeRg).get();
           if (docSnap.exists) {
                userData = docSnap.data();
                const privateDoc = await db.collection('militaries').doc(safeRg).collection('private').doc('secrets').get();
                if (privateDoc.exists) userData = { ...userData, ...privateDoc.data() };
           }
       } catch (e){}
    }

    if (!userData) {
      return res.status(404).json({ success: false, error: 'Militar não encontrado' });
    }

    const mBirth = (userData.birthDate || '').toString().trim();
    const cleanBirth = mBirth.replace(/\//g, '').replace(/\./g, '').replace(/-/g, '');
    const isCorrectPass = userData.customPassword ? 
      (userData.customPassword === currentPassword) :
      (cleanBirth === currentPassword || (cleanBirth.length === 8 && cleanBirth.substring(4) + cleanBirth.substring(2,4) + cleanBirth.substring(0,2) === currentPassword));

    if (!isCorrectPass) {
       return res.status(400).json({ success: false, error: 'Senha atual incorreta' });
    }

    try {
      if (db && isDbHealthy) {
        // Save in private secrets
        await db.collection('militaries').doc(safeRg).collection('private').doc('secrets').set({
          customPassword: newPassword
        }, { merge: true });
      }

      const existing = militaryCache.get(safeRg) || {};
      militaryCache.set(safeRg, { ...existing, customPassword: newPassword });

      return res.json({ success: true });
    } catch (err: any) {
      console.error('[API] Failed to change password', err);
      return res.status(500).json({ success: false, error: 'Erro ao alterar a senha' });
    }
  });

  app.post('/api/recover-password', async (req, res) => {
    const { rg, dataNascimento } = req.body;
    if (!rg || !dataNascimento) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios ausentes' });
    }

    const safeRg = normalizeRg(rg);
    let userData = militaryCache.get(safeRg);

    if (!userData && db && isDbHealthy) {
       try {
           const docSnap = await db.collection('militaries').doc(safeRg).get();
           if (docSnap.exists) {
                userData = docSnap.data();
                const privateDoc = await db.collection('militaries').doc(safeRg).collection('private').doc('secrets').get();
                if (privateDoc.exists) userData = { ...userData, ...privateDoc.data() };
           }
       } catch (e){}
    }

    if (!userData) {
      return res.status(404).json({ success: false, error: 'Militar não encontrado' });
    }

    const mBirth = (userData.birthDate || '').toString().trim();
    const cleanBirth = mBirth.replace(/\//g, '').replace(/\./g, '').replace(/-/g, '');
    const cleanInputBirth = dataNascimento.replace(/\//g, '').replace(/\./g, '').replace(/-/g, '');

    const isMatch = (cleanBirth === cleanInputBirth) || 
      (cleanBirth.length === 8 && cleanBirth.substring(4) + cleanBirth.substring(2,4) + cleanBirth.substring(0,2) === cleanInputBirth);

    if (!isMatch) {
       return res.status(400).json({ success: false, error: 'Data de nascimento incorreta' });
    }

    try {
      if (db && isDbHealthy) {
        // Clear custom password
        await db.collection('militaries').doc(safeRg).collection('private').doc('secrets').set({
          customPassword: admin.firestore.FieldValue.delete()
        }, { merge: true });
      }

      const existing = militaryCache.get(safeRg) || {};
      const newCache = { ...existing };
      delete newCache.customPassword;
      militaryCache.set(safeRg, newCache);

      return res.json({ success: true, message: 'Senha redefinida para a Data de Nascimento' });
    } catch (err: any) {
      console.error('[API] Failed to recover password', err);
      return res.status(500).json({ success: false, error: 'Erro ao recuperar a senha' });
    }
  });

  app.post('/api/militar/role', async (req, res) => {
    const { rg, role, value } = req.body;
    if (!rg || !role) return res.status(400).json({ success: false });

    const safeRg = normalizeRg(rg);
    try {
      if (db && isDbHealthy) {
        try {
          await db.collection('militaries').doc(safeRg).set({ [role]: value }, { merge: true });
        } catch (e: any) {
          if (!e.message.includes('PERMISSION_DENIED')) {
            console.error('[API] Failed to update role in Firestore:', e);
          }
        }
      }

      const existing = militaryCache.get(safeRg) || {};
      militaryCache.set(safeRg, { ...existing, [role]: value });
      
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ success: false });
    }
  });

  app.post('/api/militar/emprestar', async (req, res) => {
    const { lentTo, rg } = req.body;
    
    if (!rg) return res.status(400).json({ success: false, error: 'RG obrigatório' });
    
    const safeRg = normalizeRg(rg);
    
    try {
      if (db) {
        try {
          await db.collection('militaries').doc(safeRg).set({ lentTo: lentTo || null }, { merge: true });
        } catch (e: any) {
          if (!e.message.includes('PERMISSION_DENIED')) {
            console.error('[API] Failed to update lentTo in Firestore:', e);
          }
        }
      }
      
      // Update cache
      let cached = militaryCache.get(safeRg);
      if (cached) {
        cached.lentTo = lentTo || null;
        militaryCache.set(safeRg, cached);
      }
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });


  app.get('/api/admin/sync-status', (req, res) => {
    res.json({
      isSyncing,
      progress: syncProgress,
      lastResult: lastSyncResult,
      cacheSize: militaryCache.size,
      isCacheLoaded
    });
  });

  // Backend routine to archive old permutas (older than 4 months and CONCLUIDAS/EXPIRADAS/CANCELLED)
  // Runs every 12 hours
  setInterval(async () => {
    if (!db) return;
    try {
      console.log('[ARCHIVE] Running permutas archive routine...');
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 4);
      const cutoffStr = cutoffDate.toISOString().split('T')[0];

      const snapshot = await db.collection('permutas')
        .where('date', '<', cutoffStr)
        .where('status', 'in', ['accepted', 'rejected', 'cancelled']) // Or any "mortas" statuses
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

        if (count === 400) { // Firestore batch limit is 500
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
    if (!db) return;
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

  // API Catch-all: Prevent HTML fallback for missing API routes
  app.all('/api/*', (req, res) => {
    console.log(`[API 404] No route for ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
      success: false, 
      error: 'Endpoint não encontrado', 
      method: req.method,
      path: req.originalUrl 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Server] Starting Vite in middleware mode...');
    try {
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          hmr: false 
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('[Server] Vite middleware mounted.');
    } catch (e: any) {
      console.error('[Server] Vite init FAILED:', e.message);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`[Server] FATAL: Port ${PORT} is already in use.`);
    } else {
      console.error('[Server] Listen error:', e);
    }
  });
}

const expressApp = startServer();
