import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import compression from 'compression';
import cors from 'cors';
import { EventEmitter } from 'events';

// Firebase imports
import {
  initializeApp as initAdminApp,
  getApps as getAdminApps,
  getApp as getAdminApp,
  cert,
  deleteApp,
} from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  doc,
  setDoc,
  collection,
  getDocs,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
} from 'firebase/auth';

import { authRouter, verifyFirebaseSession } from './src/server/routes/auth';
import { setupSyncRoutes } from './src/server/routes/sync';
import { setupMilitaryRoutes } from './src/server/routes/military.routes';
import { setupServiceRoutes } from './src/server/routes/services.routes';
import { setupAccountRoutes } from './src/server/routes/account.routes';
import { setupSmtpRoutes } from './src/server/routes/smtp.routes';
import { setupExtensionRoutes } from './src/server/routes/extension.routes';
import { importMilitariesFromLocal } from './src/server/lib/import-militaries';
import { syncMilitariesFromSheetInternal } from './src/server/lib/sheet-sync';
import { setupPermutaArchiveRoutine } from './src/server/lib/archive-permutas';
import { startKeepAliveRobot } from './src/server/lib/keep-alive';
import { setRuntimeSmtpConfig, maskEmail } from './src/server/lib/email.service';

// Initialize Firebase configuration
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = { projectId: '' };
if (fs.existsSync(firebaseConfigPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    console.log(`[Firebase] Config file loaded. Project: ${firebaseConfig.projectId}`);
    if (firebaseConfig.projectId) {
      process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
      console.log(`[Firebase] Set GOOGLE_CLOUD_PROJECT to ${firebaseConfig.projectId}`);
    }
  } catch (e) {
    console.error('[Firebase] Failed to parse config file:', e);
  }
}

// Global DB and Cache handles
let db: any;
let clientDb: any;
let hasServiceAccount = false;
let isDbHealthy = false;
const militaryCache: Map<string, any> = new Map();
const deletedMilitaries: Set<string> = new Set();
let militaryCacheVersion: number = Date.now();
const cacheEvents = new EventEmitter();
let isCacheLoaded = false;
let cachePromise: Promise<void> | null = null;
let isSyncing = false;
let lastSyncResult: any = null;
let syncProgress = { current: 0, total: 0 };

// Helper to normalize RGs
const normalizeRg = (rg: string | number) => {
  const str = (rg || '').toString().trim().toUpperCase();
  const clean = str.replace(/[^A-Z0-9]/g, '');
  return clean.replace(/^0+/, '') || clean;
};

const normalizeObm = (obm: string | null | undefined): string => {
  const clean = (obm || '').toString().trim().toUpperCase();
  const sede10Variations = [
    '10',
    '10º',
    '10 GBM',
    '10º GBM',
    '10ºGBM',
    '10GBM',
    'OBM',
    '10º GBM - SEDE',
    '10º GBM SEDE',
    '10 GBM SEDE',
    '10º GBM-SEDE',
    '10º GBM - ANGRA DOS REIS',
    '10º GBM ANGRA DOS REIS',
  ];
  if (sede10Variations.includes(clean)) return '10º GBM';
  const sede26Variations = [
    '26',
    '26º',
    '26 GBM',
    '26º GBM',
    '26ºGBM',
    '26GBM',
    '26º GBM - SEDE',
    '26º GBM - PARATY',
  ];
  if (sede26Variations.includes(clean)) return '26º GBM';
  if (['1/26', '1 / 26', '1/26 - MANGARATIBA / PARATY', '1/26 GBM'].includes(clean)) return '1/26';
  return clean;
};

async function initFirebaseAdmin() {
  const targetProject = firebaseConfig.projectId;
  console.log(`[Firebase] Initializing. Target Project from Config: ${targetProject}`);

  try {
    if (getAdminApps().length > 0) {
      try {
        await deleteApp(getAdminApp());
      } catch (e) {}
    }

    hasServiceAccount = false;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        if (sa.private_key) {
          sa.private_key = sa.private_key.replace(/\\n/g, '\n');
        }
        initAdminApp({
          credential: cert(sa),
          projectId: sa.project_id,
        });
        hasServiceAccount = true;
      } catch (e: any) {
        console.warn(`[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT env var:`, e.message);
      }
    } else if (targetProject && targetProject !== 'remixed-project-id' && targetProject !== '') {
      console.log(`[Firebase] Initializing with explicit ProjectID: ${targetProject}`);
      initAdminApp({ projectId: targetProject });
    } else {
      console.log(`[Firebase] Initializing with ADC...`);
      initAdminApp();
    }

    console.log(`[Firebase] Admin initialized for: ${getAdminApp().options.projectId}`);
  } catch (e: any) {
    console.error('[Firebase] Admin Init error:', e.message);
    if (getAdminApps().length === 0) {
      try {
        initAdminApp();
      } catch (f) {}
    }
  }

  const app = getAdminApp();
  const configDbId = firebaseConfig.firestoreDatabaseId;
  const targetDbId =
    configDbId && configDbId !== 'remixed-firestore-database-id' && configDbId !== ''
      ? configDbId
      : '(default)';

  try {
    const clientApp = initializeApp(firebaseConfig);
    clientDb = initializeFirestore(clientApp, { experimentalForceLongPolling: true }, targetDbId);
    console.log(`[Firebase] Client SDK initialized on database "${targetDbId}"`);

    const clientAuth = getAuth(clientApp);
    try {
      await signInWithEmailAndPassword(clientAuth, 'system_admin@cbmerj.com', 'AdminServerSecret123!');
      console.log('[Firebase] Backend clientDb authenticated as system_admin.');
    } catch (authErr: any) {
      if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(clientAuth, 'system_admin@cbmerj.com', 'AdminServerSecret123!');
          console.log('[Firebase] Backend clientDb created and authenticated system_admin.');
        } catch (createErr: any) {
          console.warn('[Firebase] Could not create system_admin user:', createErr.message);
        }
      }
    }
    if (!clientAuth.currentUser) {
      try {
        await signInAnonymously(clientAuth);
        console.log('[Firebase] Backend clientDb authenticated anonymously.');
      } catch (anonErr: any) {
        console.warn('[Firebase] Backend clientDb anonymous auth notice:', anonErr.message);
      }
    }
  } catch (e: any) {
    console.error('[Firebase] Client SDK init error:', e.message);
  }

  try {
    console.log(`[Firebase] Initializing Admin SDK Firestore on database "${targetDbId}"...`);
    db = getAdminFirestore(app, targetDbId);

    if (hasServiceAccount && process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        await getAdminAuth().listUsers(1);
        await db.collection('militaries').limit(1).get();
        isDbHealthy = true;
        console.log(`[Firebase] SUCCESS: Admin SDK connected and healthy for db "${targetDbId}"`);
      } catch (err: any) {
        console.warn(`[Firebase] Notice: Service Account verification failed (${err.message}). Operating safely with Client SDK.`);
        hasServiceAccount = false;
        isDbHealthy = false;
      }
    } else {
      console.log(`[Firebase] Notice: Running with authenticated Client SDK.`);
      isDbHealthy = false;
      hasServiceAccount = false;
    }
  } catch (err: any) {
    console.warn(`[Firebase] Admin SDK Firestore initialization note: ${err.message}. Operating with Client SDK.`);
    isDbHealthy = false;
    hasServiceAccount = false;
  }
}

async function startServer() {
  console.log('[Server] SERVER HAS STARTED V123');
  console.log('[Server] Initializing routes...');

  const firebaseInitPromise = initFirebaseAdmin().catch((e) => {
    console.error('[Firebase] fatal admin init error:', e.message);
    isDbHealthy = false;
  });

  cachePromise = firebaseInitPromise
    .then(async () => {
      if (isDbHealthy && db) {
        await importMilitariesFromLocal(db, clientDb);
        console.log('[Cache] Loading military cache from Firestore...');
        try {
          const snap = await db.collection('militaries').get();
          snap.forEach((d: any) => {
            militaryCache.set(d.id, d.data());
          });
          isCacheLoaded = true;
          console.log(`[Cache] Preloaded ${militaryCache.size} militaries into memory.`);

          db.collection('militaries').onSnapshot(
            (snapshot: any) => {
              let hasChanges = false;
              snapshot.docChanges().forEach((change: any) => {
                const docRg = normalizeRg(change.doc.id);
                if (deletedMilitaries && deletedMilitaries.has(docRg)) {
                  militaryCache.delete(change.doc.id);
                  militaryCache.delete(docRg);
                  return;
                }
                if (change.type === 'added' || change.type === 'modified') {
                  militaryCache.set(change.doc.id, change.doc.data());
                  hasChanges = true;
                } else if (change.type === 'removed') {
                  militaryCache.delete(change.doc.id);
                  militaryCache.delete(docRg);
                  hasChanges = true;
                }
              });
              if (hasChanges) {
                militaryCacheVersion++;
                cacheEvents.emit('update', militaryCacheVersion);
              }
            },
            (err: any) => console.warn('[Cache Sync] Admin SDK listener error:', err.message),
          );
        } catch (e: any) {
          if (clientDb) {
            try {
              const snap = await getDocs(collection(clientDb, 'militaries'));
              snap.forEach((d) => {
                militaryCache.set(d.id, d.data());
              });
              isCacheLoaded = true;
              console.log(`[Cache] Preloaded ${militaryCache.size} militaries using Client SDK fallback.`);
            } catch (clientErr: any) {
              console.error('[Cache] Failed to load cache with Client SDK fallback:', clientErr.message);
            }
          }
        }
      } else if (clientDb) {
        await importMilitariesFromLocal(null, clientDb);
        console.log('[Cache] Loading military cache via Client SDK...');
        try {
          const snap = await getDocs(collection(clientDb, 'militaries'));
          snap.forEach((d) => {
            militaryCache.set(d.id, d.data());
          });
          isCacheLoaded = true;
          console.log(`[Cache] Preloaded ${militaryCache.size} militaries into memory using Client SDK.`);

          onSnapshot(
            collection(clientDb, 'militaries'),
            (snapshot) => {
              let hasChanges = false;
              snapshot.docChanges().forEach((change) => {
                const docRg = normalizeRg(change.doc.id);
                if (deletedMilitaries && deletedMilitaries.has(docRg)) {
                  militaryCache.delete(change.doc.id);
                  militaryCache.delete(docRg);
                  return;
                }
                if (change.type === 'added' || change.type === 'modified') {
                  militaryCache.set(change.doc.id, change.doc.data());
                  hasChanges = true;
                } else if (change.type === 'removed') {
                  militaryCache.delete(change.doc.id);
                  militaryCache.delete(docRg);
                  hasChanges = true;
                }
              });
              if (hasChanges) {
                militaryCacheVersion++;
                cacheEvents.emit('update', militaryCacheVersion);
              }
            },
            (err) => console.warn('[Cache Sync] Client SDK listener error:', err.message),
          );
        } catch (clientErr: any) {
          console.error('[Cache] Failed to load cache with Client SDK:', clientErr.message);
        }
      }

      // Load permanently deleted militaries
      try {
        if (clientDb) {
          const delSnap = await getDoc(doc(clientDb, 'config', 'deleted_militaries'));
          if (delSnap.exists() && Array.isArray(delSnap.data()?.rgs)) {
            delSnap.data()!.rgs.forEach((rg: string) => {
              const clean = normalizeRg(rg);
              deletedMilitaries.add(clean);
              militaryCache.delete(clean);
            });
            console.log(`[Cache] Loaded ${deletedMilitaries.size} permanently deleted military RGs.`);
          }
        }
      } catch (e: any) {
        console.warn('[Cache] Notice loading deleted_militaries config:', e.message);
      }

      if (isCacheLoaded && militaryCache.size === 0 && (db || clientDb)) {
        console.log('[Sync] Database holds 0 militaries. Running automatic initial sync...');
        try {
          const count = await syncMilitariesFromSheetInternal({
            db,
            clientDb,
            isDbHealthy,
            militaryCache,
            deletedMilitaries,
            normalizeRg,
            normalizeObm,
          });
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
          ala: 'EXP',
          obm: '10º GBM',
          isAdmin: true,
          isEscalante: true,
          birthDate: '11/06/1998',
        };
        militaryCache.set('54444', adminProfile);
      } else {
        adminProfile.obm = '10º GBM';
        adminProfile.isAdmin = true;
        adminProfile.isEscalante = true;
        adminProfile.ala = 'EXP';
        militaryCache.set('54444', adminProfile);
      }
      let adminPromoSuccess = false;
      if (db && isDbHealthy) {
        try {
          await db.collection('militaries').doc('54444').set(adminProfile, { merge: true });
          console.log('[Cache] Promoted RG 54444 as static Moderador/Admin via Admin SDK.');
          adminPromoSuccess = true;
        } catch (err: any) {}
      }

      if (!adminPromoSuccess && clientDb) {
        try {
          await setDoc(doc(clientDb, 'militaries', '54444'), adminProfile, { merge: true });
          console.log('[Cache] Promoted RG 54444 as static Moderador/Admin via Client SDK.');
        } catch (err: any) {
          console.error('[Cache] Failed promoting 54444 via Client SDK:', err.message);
        }
      }

      // Preload SMTP configuration from Firestore
      try {
        if (clientDb) {
          const smtpSnap = await getDoc(doc(clientDb, 'config', 'smtp'));
          if (smtpSnap.exists()) {
            const sData = smtpSnap.data();
            if (sData && sData.host && sData.user && sData.pass) {
              setRuntimeSmtpConfig({
                host: sData.host,
                port: Number(sData.port) || 587,
                secure: sData.secure === true || Number(sData.port) === 465,
                user: sData.user,
                pass: sData.pass,
                from: sData.from || `"Portal CBMERJ" <${sData.user}>`,
                appUrl: sData.appUrl,
              });
              console.log(`[SMTP] Configuration preloaded from Firestore (host: ${sData.host}, user: ${maskEmail(sData.user)})`);
            }
          }
        }
      } catch (smtpErr: any) {
        console.warn('[SMTP] Note: Could not preload SMTP config from Firestore:', smtpErr.message);
      }
    })
    .catch((e) => {
      console.error('[Cache] Initialization error:', e);
    });

  const app = express();
  const PORT = 3000;

  // Middleware setup
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (req.path.startsWith('/api/sync') || req.path.startsWith('/api/admin') || req.path.startsWith('/api/militar-sync')) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, Key');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      if (req.method === 'OPTIONS') return res.sendStatus(200);
    }
    next();
  });

  app.use(
    compression({
      filter: (req, res) => {
        if (req.headers.accept && req.headers.accept.includes('text/event-stream')) {
          return false;
        }
        return compression.filter(req, res);
      },
    }),
  );

  app.use(express.text({ limit: '20mb' }));
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Global Logging for API
  app.use('/api/*', (req, res, next) => {
    console.log(`[API] ${req.method} ${req.originalUrl}`);
    next();
  });

  app.use('/api/auth', authRouter);

  const OBM_HIERARCHY: Record<string, string[]> = {
    '10º GBM': ['10º GBM', '1/10', '2/10', '3/10', '4/10'],
    '10 GBM': ['10º GBM', '1/10', '2/10', '3/10', '4/10'],
    '1/10': ['1/10'],
    '2/10': ['2/10'],
    '3/10': ['3/10'],
    '4/10': ['4/10'],
    '26º GBM': ['26º GBM', '1/26'],
    '26 GBM': ['26º GBM', '1/26'],
    '1/26': ['1/26'],
  };

  // Expose dependencies to modular routes
  const getRouteDeps = () => ({
    isDbHealthy,
    hasServiceAccount,
    db: isDbHealthy ? db : null,
    clientDb,
    militaryCache,
    deletedMilitaries,
    getCacheVersion: () => militaryCacheVersion,
    incrementCacheVersion: () => {
      militaryCacheVersion++;
      return militaryCacheVersion;
    },
    cacheEvents,
    normalizeRg,
    normalizeObm,
    OBM_HIERARCHY,
    isCacheLoaded,
    cachePromise,
    setDbUnhealthy: () => {
      isDbHealthy = false;
    },
  });

  // Setup modular routers
  setupSyncRoutes(app, getRouteDeps);
  setupMilitaryRoutes(app, getRouteDeps);
  setupServiceRoutes(app, getRouteDeps);
  setupAccountRoutes(app, getRouteDeps);
  setupSmtpRoutes(app, getRouteDeps);
  setupExtensionRoutes(app, getRouteDeps);

  // General API Endpoints
  app.get('/api/test', (req, res) => {
    res.json({ success: true, message: 'HELLO FROM EXPRESS V3.0' });
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: '2.1', time: new Date().toISOString() });
  });

  app.get('/api/startup', async (req, res) => {
    return res.json({
      app_visibility: null,
      roles: null,
      vacation_settings: null,
      ala_config: null,
      active_months: null,
      mural: [],
      refeitorio: null,
    });
  });

  app.get('/api/debug/env', verifyFirebaseSession, (req: any, res) => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Acesso negado: Administradores apenas.' });
    }
    res.json({
      keys: Object.keys(process.env).filter(
        (k) =>
          k.toLowerCase().includes('firebase') ||
          k.toLowerCase().includes('google') ||
          k.toLowerCase().includes('gcp'),
      ),
      hasSA: !!process.env.FIREBASE_SERVICE_ACCOUNT,
    });
  });

  app.get('/api/admin/sync/status', (req, res) => {
    res.json({
      isSyncing,
      progress: syncProgress.current,
      total: syncProgress.total,
      lastResult: lastSyncResult,
      message: isSyncing ? 'Sincronizando' : 'Sincronização desativada',
    });
  });

  app.get('/api/admin/sync-status', (req, res) => {
    res.json({
      isSyncing,
      progress: syncProgress,
      lastResult: lastSyncResult,
      cacheSize: militaryCache.size,
      isCacheLoaded,
    });
  });

  app.get('/api/militar-sync', async (req, res) => {
    const apiKey = process.env.SYNC_API_KEY;
    const provided = req.headers['x-api-key'] || req.query.key;
    if (!apiKey || provided !== apiKey) return res.status(401).json({ error: 'Acesso Negado' });

    try {
      isSyncing = true;
      syncProgress = { current: 0, total: 0 };
      const count = await syncMilitariesFromSheetInternal({
        db,
        clientDb,
        isDbHealthy,
        militaryCache,
        deletedMilitaries,
        normalizeRg,
        normalizeObm,
      });
      isSyncing = false;
      return res.json({ success: true, count });
    } catch (err: any) {
      isSyncing = false;
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/sync', async (req, res) => {
    const apiKey = process.env.SYNC_API_KEY;
    const provided = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');
    if (!apiKey || provided !== apiKey) return res.status(401).json({ error: 'Acesso Negado' });

    if (isSyncing) {
      return res.status(409).json({ error: 'Sync already in progress' });
    }
    try {
      isSyncing = true;
      syncProgress = { current: 0, total: 0 };
      const count = await syncMilitariesFromSheetInternal({
        db,
        clientDb,
        isDbHealthy,
        militaryCache,
        deletedMilitaries,
        normalizeRg,
        normalizeObm,
      });
      isSyncing = false;
      return res.json({ success: true, count });
    } catch (err: any) {
      isSyncing = false;
      return res.status(500).json({ error: err.message });
    }
  });

  // Archive routine for old permutas
  setupPermutaArchiveRoutine(() => ({ db, isDbHealthy }));

  // API Catch-all: Prevent HTML fallback for missing API routes
  app.all('/api/*', (req, res) => {
    console.log(`[API 404] No route for ${req.method} ${req.originalUrl}`);
    res.status(404).json({
      success: false,
      error: 'Endpoint não encontrado em server.ts',
      method: req.method,
      path: req.originalUrl,
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Server] Starting Vite in middleware mode...');
    try {
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: false,
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
    startKeepAliveRobot(PORT);
  });

  server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`[Server] FATAL: Port ${PORT} is already in use.`);
    } else {
      console.error('[Server] Listen error:', e);
    }
  });
}

startServer().catch((e) => console.error('[Server] Fatal startup error:', e));
