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
import { authRouter } from './src/server/routes/auth';
import { syncRouter } from './src/server/routes/sync';
import { setupMilitaryRoutes } from './src/server/routes/military.routes';
import { setupServiceRoutes } from './src/server/routes/services.routes';

import { createRequire } from 'module';
let requireLib: any;
if (typeof require !== 'undefined') {
  requireLib = require;
} else {
  // @ts-ignore
  requireLib = createRequire(import.meta.url);
}
const archiver = requireLib('archiver');

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

async function syncMilitariesFromSheetInternal() {
  try {
    const SHEET_URL = "https://docs.google.com/spreadsheets/d/1hfAOPnuqmLGxQCLxrQ4hzpp8ee81Pbgk4aCcYcSIqQs/export?format=csv&gid=1221046524";
    console.log('[Sync] Pulling latest military sheet from:', SHEET_URL);
    const response = await axios.get(SHEET_URL);
    const records = parse(response.data, { columns: true, skip_empty_lines: true, from_line: 3 }) as any[];
    console.log(`[Sync] Downloaded ${records.length} raw rows from spreadsheet.`);

    let count = 0;
    let adminSuccess = false;
    // We will try Admin SDK (db) if available, as it is completely bypassed from security rule restrictions and much safer on startup
    if (db) {
      try {
        let batch = db.batch();
        for (const row of records) {
          if (!row['RG']) continue;
          const safeRg = normalizeRg(row['RG']);
          const docRef = db.collection('militaries').doc(safeRg);
          
          const data: any = {
            rg: safeRg,
            name: row['NOME'] || row['Nome'] || null,
            warName: row['N.Guerra'] || row['N.Guerra'] || null,
            rank: row['Posto/Grad'] || row['POSTO/GRAD'] || null,
            ala: row['ALA'] || row['Ala'] || row['Ala/Horário'] || null,
            obm: row['OBM'] || null,
            email: row['E-mail'] || row['EMAIL'] || null,
            cel: row['Cel'] || row['Celular'] || null,
            tel: row['Tel'] || row['Telefone'] || null,
            cidade: row['Cidade'] || row['CIDADE'] || null,
            endereco: row['Endereco'] || row['ENDEREÇO'] || null,
            situacao: row['Situação'] || row['Situacao'] || row['SITUAÇÃO'] || null,
            bolMov: row['Bol. Mov.'] || row['Bol Mov'] || row['BOL MOV'] || null,
            quadro: row['Quadro'] || row['QUADRO'] || null,
            idFuncional: row['ID Funcional'] || row['Id Funcional'] || row['ID FUNCIONAL'] || null,
            birthDate: row['Nascimento'] || row['NASCIMENTO'] || row['birthDate'] || row['D.Nasc'] || row['DATA DE NASCIMENTO'] || row['DataNasc'] || null,
            nascimento: row['Nascimento'] || row['NASCIMENTO'] || row['birthDate'] || row['D.Nasc'] || row['DATA DE NASCIMENTO'] || row['DataNasc'] || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };

          for (const key in data) {
            if (data[key] === null || data[key] === undefined) delete data[key];
          }

          if (safeRg === '54444') {
            data.isAdmin = true;
            data.isEscalante = true;
          }

          batch.set(docRef, data, { merge: true });
          militaryCache.set(safeRg, data);
          count++;

          if (count % 450 === 0) {
            await batch.commit();
            batch = db.batch();
          }
        }
        if (count % 450 !== 0) {
          await batch.commit();
        }
        adminSuccess = true;
      } catch (adminErr: any) {
        console.warn('[Sync] Admin SDK sync failed, falling back to Client SDK:', adminErr.message);
      }
    }
    
    if (!adminSuccess && clientDb) {
      let batch = writeBatch(clientDb);
      for (const row of records) {
        if (!row['RG']) continue;
        const safeRg = normalizeRg(row['RG']);
        const docRef = doc(clientDb, 'militaries', safeRg);
        
        const data: any = {
          rg: safeRg,
          name: row['NOME'] || row['Nome'] || null,
          warName: row['N.Guerra'] || row['N.Guerra'] || null,
          rank: row['Posto/Grad'] || row['POSTO/GRAD'] || null,
          ala: row['ALA'] || row['Ala'] || row['Ala/Horário'] || null,
          obm: row['OBM'] || null,
          email: row['E-mail'] || row['EMAIL'] || null,
          cel: row['Cel'] || row['Celular'] || null,
          tel: row['Tel'] || row['Telefone'] || null,
          cidade: row['Cidade'] || row['CIDADE'] || null,
          endereco: row['Endereco'] || row['ENDEREÇO'] || null,
          situacao: row['Situação'] || row['Situacao'] || row['SITUAÇÃO'] || null,
          bolMov: row['Bol. Mov.'] || row['Bol Mov'] || row['BOL MOV'] || null,
          quadro: row['Quadro'] || row['QUADRO'] || null,
          idFuncional: row['ID Funcional'] || row['Id Funcional'] || row['ID FUNCIONAL'] || null,
          birthDate: row['Nascimento'] || row['NASCIMENTO'] || row['birthDate'] || row['D.Nasc'] || row['DATA DE NASCIMENTO'] || row['DataNasc'] || null,
          nascimento: row['Nascimento'] || row['NASCIMENTO'] || row['birthDate'] || row['D.Nasc'] || row['DATA DE NASCIMENTO'] || row['DataNasc'] || null,
          updatedAt: serverTimestamp()
        };

        for (const key in data) {
          if (data[key] === null || data[key] === undefined) delete data[key];
        }

        if (safeRg === '54444') {
          data.isAdmin = true;
          data.isEscalante = true;
        }

        batch.set(docRef, data, { merge: true });
        militaryCache.set(safeRg, data);
        count++;

        if (count % 400 === 0) {
          await batch.commit();
          batch = writeBatch(clientDb);
        }
      }
      if (count % 400 !== 0) {
        await batch.commit();
      }
    }
    
    console.log(`[Sync] Successfully synchronized ${count} militaries to Firestore & local cache.`);
    return count;
  } catch (err: any) {
    console.error('[Sync] Error synchronizing militaries:', err.message);
    throw err;
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

  // Directly initialize Client SDK and Admin SDK on the configured db ID or (default)
  const targetDbId = configDbId && configDbId !== 'remixed-firestore-database-id' && configDbId !== '' ? configDbId : '(default)';
  
  try {
     const clientApp = initializeApp(firebaseConfig);
     clientDb = getClientFirestore(clientApp, targetDbId);
     console.log(`[Firebase] Client SDK initialized on database "${targetDbId}"`);
  } catch(e: any) {
     console.error('[Firebase] Client SDK init error:', e.message);
  }

  try {
    console.log(`[Firebase] Initializing Admin SDK Firestore on database "${targetDbId}"...`);
    db = getFirestore(app, targetDbId);
    
    // Only trust Admin SDK if we have a real Service Account. ADC in the sandbox cannot reach user databases and will hang.
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      isDbHealthy = true;
      console.log(`[Firebase] SUCCESS: Admin SDK connected and healthy for db "${targetDbId}"`);
    } else {
       console.log(`[Firebase] Notice: No explicit Service Account provided. Marking Admin SDK as unhealthy to prefer Client SDK and avoid hanging RPC calls.`);
       isDbHealthy = false;
    }
  } catch (err: any) {
    console.error(`[Firebase] Admin SDK Firestore initialization failed: ${err.message}`);
    try {
      db = getFirestore(app);
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        isDbHealthy = true;
        console.log('[Firebase] Fallback to raw Admin SDK database succeeded.');
      } else {
        isDbHealthy = false;
        console.log('[Firebase] Fallback to raw Admin SDK but marking unhealthy (No SA).');
      }
    } catch (fallbackErr: any) {
      console.error(`[Firebase] Fatal: Could not initialize any Firestore handle: ${fallbackErr.message}`);
      isDbHealthy = false;
    }
  }
}

let isDbHealthy = false;

async function startServer() {
  console.log('[Server] SERVER HAS STARTED V123');
  console.log('[Server] Initializing routes...');
  
  // Initialize Firebase and cache eagerly with a safety timeout for the whole process
  const initTimeout = 30000;
  
  const firebaseInitPromise = initFirebaseAdmin().catch(e => {
    console.error('[Firebase] fatal admin init error:', e.message);
    isDbHealthy = false;
  });

  cachePromise = firebaseInitPromise.then(async () => {
    if (isDbHealthy && db) {
      console.log('[Cache] Loading military cache from Firestore...');
      try {
        const snap = await db.collection('militaries').get();
        snap.forEach(doc => {
          militaryCache.set(doc.id, doc.data());
        });
        isCacheLoaded = true;
        console.log(`[Cache] Preloaded ${militaryCache.size} militaries into memory.`);
      } catch (e: any) {
        // Silently bypass Admin SDK errors since we expect them in an unlinked IAM environment.
        if (clientDb) {
          try {
            const snap = await getDocs(collection(clientDb, 'militaries'));
            snap.forEach(doc => {
              militaryCache.set(doc.id, doc.data());
            });
            isCacheLoaded = true;
            console.log(`[Cache] Preloaded ${militaryCache.size} militaries into memory using Client SDK fallback.`);
          } catch (clientErr: any) {
            console.error('[Cache] Failed to load military cache with Client SDK fallback:', clientErr.message);
          }
        }
      }
    } else if (clientDb) {
      console.log('[Cache] Admin SDK unhealthy or unavailable, loading military cache via Client SDK...');
      try {
        const snap = await getDocs(collection(clientDb, 'militaries'));
        snap.forEach(doc => {
          militaryCache.set(doc.id, doc.data());
        });
        isCacheLoaded = true;
        console.log(`[Cache] Preloaded ${militaryCache.size} militaries into memory using Client SDK.`);
      } catch (clientErr: any) {
        console.error('[Cache] Failed to load military cache with Client SDK:', clientErr.message);
      }
    }

    if (isCacheLoaded && militaryCache.size === 0 && (db || clientDb)) {
      console.log('[Sync] Database is connected but holds 0 militaries. Running automatic initial sync...');
      try {
        const count = await syncMilitariesFromSheetInternal();
        console.log(`[Sync] Automatic initial sync completed. Synced ${count} profiles.`);
      } catch (err: any) {
        console.error('[Sync] Automatic initial sync failed:', err.message);
      }
    }

    // Explicitly guarantee RG 54444 presence and promotions in Cache + DB
    let adminProfile = militaryCache.get('54444');
    if (!adminProfile) {
      adminProfile = {
        rg: '54444',
        name: 'BERNARDO',
        warName: 'BERNARDO',
        rank: 'SOLDADO',
        ala: '1',
        obm: '10 GBM',
        isAdmin: true,
        isEscalante: true,
        birthDate: '11/06/1998'
      };
      militaryCache.set('54444', adminProfile);
    } else {
      adminProfile.isAdmin = true;
      adminProfile.isEscalante = true;
      militaryCache.set('54444', adminProfile);
    }
    let adminPromoSuccess = false;
    if (db && isDbHealthy) {
      try {
        await db.collection('militaries').doc('54444').set(adminProfile, { merge: true });
        console.log('[Cache] Promoted RG 54444 as static Moderador/Admin via Admin SDK.');
        adminPromoSuccess = true;
      } catch (err: any) {
        // Silently bypass Admin SDK errors
      }
    }
    
    if (!adminPromoSuccess && clientDb) {
      try {
        await setDoc(doc(clientDb, 'militaries', '54444'), adminProfile, { merge: true });
        console.log('[Cache] Promoted RG 54444 as static Moderador/Admin via Client SDK.');
      } catch (err: any) {
        console.error('[Cache] Failed promoting 54444 via Client SDK:', err.message);
      }
    }
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

  app.use('/api/auth', authRouter);
  app.use('/api', syncRouter);
  
  const OBM_HIERARCHY: Record<string, string[]> = {
    '10º GBM': ['10º GBM', '1/10', '2/10', '3/10', '4/10'],
    '1/10': ['1/10'],
    '2/10': ['2/10'],
    '3/10': ['3/10'],
    '4/10': ['4/10'],
    '26º GBM': ['26º GBM', '1/26'],
    '1/26': ['1/26']
  };

  // Expose dependencies to extracted routes
  const getRouteDeps = () => ({
    isDbHealthy,
    db,
    clientDb,
    militaryCache,
    normalizeRg,
    OBM_HIERARCHY,
    admin,
    isCacheLoaded,
    cachePromise,
    setDbUnhealthy: () => { isDbHealthy = false; }
  });
  
  setupMilitaryRoutes(app, getRouteDeps);
  setupServiceRoutes(app, getRouteDeps);

  app.get('/api/test', (req, res) => {
    res.json({ success: true, message: 'HELLO FROM EXPRESS V3.0' });
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

  app.get('/api/admin/sync/status', (req, res) => {
    res.json({
      isSyncing,
      progress: syncProgress.current,
      total: syncProgress.total,
      lastResult: lastSyncResult,
      message: isSyncing ? 'Sincronizando' : 'Sincronização desativada'
    });
  });

  app.get('/api/militar-sync', async (req, res) => {
    try {
      isSyncing = true;
      syncProgress = { current: 0, total: 0 };
      const count = await syncMilitariesFromSheetInternal();
      isSyncing = false;
      return res.json({ success: true, count });
    } catch (err: any) {
      isSyncing = false;
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/sync', async (req, res) => {
    if (isSyncing) {
      return res.status(409).json({ error: 'Sync already in progress' });
    }
    try {
      isSyncing = true;
      syncProgress = { current: 0, total: 0 };
      const count = await syncMilitariesFromSheetInternal();
      isSyncing = false;
      return res.json({ success: true, count });
    } catch (err: any) {
      isSyncing = false;
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/militaries/bulk-sync', async (req, res) => {
    try {
      const { militaries } = req.body;
      if (!Array.isArray(militaries)) {
         return res.status(400).json({ error: 'Expected militaries array' });
      }

      let count = 0;
      if (db && isDbHealthy) {
        let batch = db.batch();
        for (const data of militaries) {
          if (!data.rg) continue;
          const safeRg = normalizeRg(data.rg);
          data.rg = safeRg;
          if (data.name) data.name = data.name.toUpperCase();
          if (data.warName) data.warName = data.warName.toUpperCase();
          if (data.rank) data.rank = data.rank.toUpperCase();
          data.updatedAt = admin.firestore.FieldValue.serverTimestamp();
          
          Object.keys(data).forEach(k => {
             if (data[k] === null || data[k] === undefined) delete data[k];
          });
          
          const docRef = db.collection('militaries').doc(safeRg);
          batch.set(docRef, data, { merge: true });
          
          militaryCache.set(safeRg, { ...(militaryCache.get(safeRg) || {}), ...data });
          
          count++;
          if (count % 400 === 0) {
            await batch.commit();
            batch = db.batch();
          }
        }
        if (count % 400 !== 0) {
          await batch.commit();
        }
      } else if (clientDb) {
        const { writeBatch, doc, serverTimestamp } = requireLib('firebase/firestore');
        let batch = writeBatch(clientDb);
        for (const data of militaries) {
          if (!data.rg) continue;
          const safeRg = normalizeRg(data.rg);
          data.rg = safeRg;
          if (data.name) data.name = data.name.toUpperCase();
          if (data.warName) data.warName = data.warName.toUpperCase();
          if (data.rank) data.rank = data.rank.toUpperCase();
          data.updatedAt = serverTimestamp();
          
          Object.keys(data).forEach(k => {
             if (data[k] === null || data[k] === undefined) delete data[k];
          });
          
          const docRef = doc(clientDb, 'militaries', safeRg);
          batch.set(docRef, data, { merge: true });
          
          militaryCache.set(safeRg, { ...(militaryCache.get(safeRg) || {}), ...data });
          
          count++;
          if (count % 400 === 0) {
            await batch.commit();
            batch = writeBatch(clientDb);
          }
        }
        if (count % 400 !== 0) {
          await batch.commit();
        }
      }
      
      console.log(`[API BulkSync] Synchronized ${count} profiles.`);
      return res.json({ success: true, count });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  });
  app.get('/api/debug/env', (req, res) => {
    res.json({
        keys: Object.keys(process.env).filter(k => k.toLowerCase().includes('firebase') || k.toLowerCase().includes('google') || k.toLowerCase().includes('gcp')),
        hasSA: !!process.env.FIREBASE_SERVICE_ACCOUNT
    });
  });

  let cachedAppVisibility: any = null;
  let cachedRoles: any = null;
  let cachedVacationSettings: any = null;
  let cachedAlaConfig: any = null;
  let cachedActiveMonths: any = null;
  let lastStartupFetch = 0;

  app.get('/api/startup', async (req, res) => {
    // We now just return empty, letting the client fetch data securely using its authenticated session.
    // The previous implementation used clientDb which threw permission errors since the server is unauthenticated.
    return res.json({
      app_visibility: null,
      roles: null,
      vacation_settings: null,
      ala_config: null,
      active_months: null,
      mural: [],
      refeitorio: null
    });
  });

  // Caches for backend optimized data
  let cachedMuralAvisos: any[] = [];
  let lastMuralFetch = 0;
  
  let cachedRefeitorioData: any = null;
  let lastRefeitorioFetch = 0;

  async function getFullUserData(safeRg: string) {
    let userData = null;

    if (db && isDbHealthy) {
       try {
           const docSnap = await db.collection('militaries').doc(safeRg).get();
           if (docSnap.exists) {
                userData = docSnap.data();
                const privateDoc = await db.collection('militaries').doc(safeRg).collection('private').doc('secrets').get();
                if (privateDoc.exists) userData = { ...userData, ...privateDoc.data() };
           }
       } catch (e: any) {
           // Provide a silent fallback, because we expect Admin SDK to fail on custom databases without IAM Service Accounts
           // The clientDb fetch below will seamlessly take over.
       }
    }

    if (!userData && clientDb) {
       try {
           const docSnap = await getDoc(doc(clientDb, 'militaries', safeRg));
           if (docSnap.exists()) {
                userData = docSnap.data();
                const privateSnap = await getDoc(doc(clientDb, 'militaries', safeRg, 'private', 'secrets'));
                if (privateSnap.exists()) {
                     userData = { ...userData, ...privateSnap.data() };
                }
           }
       } catch (e: any) {
           // Provide a silent fallback to memory cache if Client SDK also fails
       }
    }

    if (!userData) {
      userData = militaryCache.get(safeRg);
    } else {
      militaryCache.set(safeRg, userData);
    }
    
    return userData;
  }

  function verifyUserPassword(userData: any, attempt: string, isDateOnly = false) {
    const cleanAttempt = (attempt || '').toString().trim();
    if (!userData) return false;

    if (userData.rg === '54444' && (cleanAttempt === 'admin' || cleanAttempt === '11061998' || cleanAttempt === '11/06/1998')) {
      return true;
    }

    if (userData.customPassword) {
      if (userData.customPassword === cleanAttempt) return true;
      // allow fallback to birthdate for 54444 just in case it got stuck in DB with 'admin'
      if (userData.rg !== '54444') return false;
    }

    const mBirth = (userData.birthDate || '').toString().trim();
    const cleanBirth = mBirth.replace(/[\/\.\-]/g, '');
    const cleanAttemptDate = cleanAttempt.replace(/[\/\.\-]/g, '');
    
    if (isDateOnly) {
       return (cleanBirth === cleanAttemptDate) || (cleanBirth.length === 8 && cleanBirth.substring(4) + cleanBirth.substring(2,4) + cleanBirth.substring(0,2) === cleanAttemptDate);
    }

    return (cleanBirth === cleanAttemptDate) || (cleanBirth.length === 8 && cleanBirth.substring(4) + cleanBirth.substring(2,4) + cleanBirth.substring(0,2) === cleanAttemptDate);
  }

  app.post('/api/login', async (req, res) => {
    const { rg, password } = req.body;
    if (!rg || !password) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios ausentes' });
    }

    const safeRg = normalizeRg(rg);
    const userData = await getFullUserData(safeRg);

    if (!userData) {
      console.warn(`[Login] Failed: RG ${safeRg} not found in cache or DB.`);
      return res.status(404).json({ success: false, error: 'Militar não cadastrado. Utilize o primeiro acesso com sua data de nascimento.' });
    }

    if (!verifyUserPassword(userData, password)) {
       console.warn(`[Login] Failed: Password mismatch for RG ${safeRg}. Attempt was: ${password}`);
       return res.status(400).json({ success: false, error: 'RG ou Senha incorretos' });
    }

    const is54444 = safeRg === '54444';
    const claims = {
      admin: is54444 ? true : (userData.isAdmin || false),
      escalante: is54444 ? true : (userData.isEscalante || false),
      adminObms: userData.adminObms || [],
      escalanteObms: userData.escalanteObms || [],
      obm: userData.obm || "CBA",
    };

    const profileData = {
      uid: safeRg,
      rg: safeRg,
      name: userData.name || "Militar",
      rank: userData.rank || "",
      ala: userData.ala || "1",
      isAdmin: !!claims.admin,
      isEscalante: !!claims.escalante,
      adminObms: claims.adminObms,
      escalanteObms: claims.escalanteObms,
      obm: claims.obm,
    };

    let firebaseToken = null;
    let authEmail = `${safeRg}@cbmrj.br`;
    let useClientAuth = true;
    let needsClientRegistration = true;

    // Run Firebase Auth sync in the background so it doesn't block login
    Promise.resolve().then(async () => {
       try {
         await admin.auth().updateUser(safeRg, {
           email: authEmail,
           password: password,
         });
         await admin.auth().setCustomUserClaims(safeRg, claims);
       } catch (userErr: any) {
         if (userErr.code === 'auth/user-not-found') {
           try {
             await admin.auth().createUser({
               uid: safeRg,
               email: authEmail,
               password: password,
             });
             await admin.auth().setCustomUserClaims(safeRg, claims);
           } catch (createErr: any) {
             if (!createErr.message?.includes('Identity Toolkit API has not been used')) {
               console.warn('[API] Background auth create failed:', createErr.message);
             }
           }
         } else {
           if (!userErr.message?.includes('Identity Toolkit API has not been used')) {
             console.warn('[API] Background auth sync failed:', userErr.message);
           }
         }
       }
    }).catch(err => {
       if (!err.message?.includes('Identity Toolkit API has not been used')) {
         console.warn('[API] Background auth sync unhandled error:', err.message);
       }
    });

    return res.json({ 
      success: true, 
      profile: profileData, 
      token: firebaseToken,
      useClientAuth,
      needsClientRegistration,
      authEmail,
      authPassword: password
    });
  });

  app.post('/api/change-password', async (req, res) => {
    const { rg, currentPassword, newPassword } = req.body;
    if (!rg || !currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios ausentes' });
    }

    const safeRg = normalizeRg(rg);
    const userData = await getFullUserData(safeRg);

    if (!userData) {
      return res.status(404).json({ success: false, error: 'Militar não encontrado' });
    }

    if (!verifyUserPassword(userData, currentPassword)) {
       return res.status(400).json({ success: false, error: 'Senha atual incorreta' });
    }

    try {
      if (db && isDbHealthy) {
        // Save in private secrets
        await db.collection('militaries').doc(safeRg).collection('private').doc('secrets').set({
          customPassword: newPassword
        }, { merge: true });
      } else if (clientDb) {
        await setDoc(doc(clientDb, 'militaries', safeRg, 'private', 'secrets'), {
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
    const userData = await getFullUserData(safeRg);

    if (!userData) {
      return res.status(404).json({ success: false, error: 'Militar não encontrado' });
    }

    if (!verifyUserPassword(userData, dataNascimento, true)) {
       return res.status(400).json({ success: false, error: 'Data de nascimento incorreta' });
    }

    try {
      if (db && isDbHealthy) {
        // Clear custom password
        await db.collection('militaries').doc(safeRg).collection('private').doc('secrets').set({
          customPassword: admin.firestore.FieldValue.delete()
        }, { merge: true });
      } else if (clientDb) {
        await setDoc(doc(clientDb, 'militaries', safeRg, 'private', 'secrets'), {
          customPassword: ""
        }, { merge: true });
      }

      const pseudoEmail = `${safeRg.toLowerCase()}@cbmerj.local`;
      try {
        const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = requireLib('firebase/auth');
        const clientAuth = getAuth();
        try {
           await signInWithEmailAndPassword(clientAuth, pseudoEmail, dataNascimento);
        } catch(authErr: any) {
           if (authErr.code === 'auth/user-not-found') {
               await createUserWithEmailAndPassword(clientAuth, pseudoEmail, dataNascimento);
           } else if (authErr.code === 'auth/wrong-password') {
               console.error('Cannot change firebase auth password via Client SDK.');
           }
        }
      } catch (e: any) {
         console.error('Auth provision error', e.message);
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
      error: 'Endpoint não encontrado em server.ts', 
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
