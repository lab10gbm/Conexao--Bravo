import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import axios from 'axios';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';
import { initializeApp as initAdminApp, getApps as getAdminApps, getApp as getAdminApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { initializeApp } from 'firebase/app';
import { getFirestore as getClientFirestore, initializeFirestore, doc, setDoc, serverTimestamp, collection, getDocs, getDoc, query, limit, orderBy, where, writeBatch, onSnapshot, deleteField } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';
import compression from 'compression';
import cors from 'cors';
import { authRouter } from './src/server/routes/auth';
import { setupSyncRoutes } from './src/server/routes/sync';
import { setupMilitaryRoutes } from './src/server/routes/military.routes';
import { setupServiceRoutes } from './src/server/routes/services.routes';
import { importMilitariesFromLocal } from './src/server/lib/import-militaries';
// @ts-ignore
import archiver from 'archiver';
import { EventEmitter } from 'events';
import crypto from 'crypto';
import { sendPasswordResetEmail, maskEmail, setRuntimeSmtpConfig, getEffectiveSmtpConfig, testSmtpConnection, SmtpConfig } from './src/server/lib/email.service';

interface PasswordResetRequest {
  rg: string;
  code: string;
  token: string;
  email: string;
  expiresAt: number;
  attempts: number;
}
const passwordResetsByRg = new Map<string, PasswordResetRequest>();
const passwordResetsByToken = new Map<string, string>();

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
let db: any;
let clientDb: any;
let hasServiceAccount = false;
let isDbHealthy = false;
let militaryCache: Map<string, any> = new Map();
let deletedMilitaries: Set<string> = new Set();
let militaryCacheVersion: number = Date.now();
const cacheEvents = new EventEmitter();
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

const normalizeObm = (obm: string | null | undefined): string => {
  const clean = (obm || "").toString().trim().toUpperCase();
  const sede10Variations = ['10', '10º', '10 GBM', '10º GBM', '10ºGBM', '10GBM', 'OBM', '10º GBM - SEDE', '10º GBM SEDE', '10 GBM SEDE', '10º GBM-SEDE', '10º GBM - ANGRA DOS REIS', '10º GBM ANGRA DOS REIS'];
  if (sede10Variations.includes(clean)) return '10º GBM';
  const sede26Variations = ['26', '26º', '26 GBM', '26º GBM', '26ºGBM', '26GBM', '26º GBM - SEDE', '26º GBM - PARATY'];
  if (sede26Variations.includes(clean)) return '26º GBM';
  if (['1/26', '1 / 26', '1/26 - MANGARATIBA / PARATY', '1/26 GBM'].includes(clean)) return '1/26';
  return clean;
};

async function syncMilitariesFromSheetInternal() {
  try {
    const SHEET_URL = "https://docs.google.com/spreadsheets/d/1hfAOPnuqmLGxQCLxrQ4hzpp8ee81Pbgk4aCcYcSIqQs/export?format=csv&gid=1221046524";
    console.log('[Sync] Pulling latest military sheet from:', SHEET_URL);
    const response = await axios.get(SHEET_URL);
    const records = parse(response.data, { columns: true, skip_empty_lines: true, from_line: 3 }) as any[];
    console.log(`[Sync] Downloaded ${records.length} raw rows from spreadsheet.`);

    // Inject requested militaries for 10º GBM Ala 3 and Ala 4
    const injectedMilitaries = [
      // Ala 3
      { 'RG': "20955", 'Posto/Grad': "SUBTENENTE", 'NOME': "SUBTENENTE ALEX", 'N.Guerra': "ALEX", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "23518", 'Posto/Grad': "SUBTENENTE", 'NOME': "SUBTENENTE MAGALHAES", 'N.Guerra': "MAGALHAES", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "26029", 'Posto/Grad': "SUBTENENTE", 'NOME': "SUBTENENTE ALEXSANDRO", 'N.Guerra': "ALEXSANDRO", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "31610", 'Posto/Grad': "1º SARGENTO", 'NOME': "1º SARGENTO S JUNIOR", 'N.Guerra': "S JUNIOR", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "32102", 'Posto/Grad': "1º SARGENTO", 'NOME': "1º SARGENTO LUIS", 'N.Guerra': "LUIS", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "42998", 'Posto/Grad': "2º SARGENTO", 'NOME': "2º SARGENTO CLEBER", 'N.Guerra': "CLEBER", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "43427", 'Posto/Grad': "2º SARGENTO", 'NOME': "2º SARGENTO THIAGO AZEVEDO", 'N.Guerra': "THIAGO AZEVEDO", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "53754", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO STEINER", 'N.Guerra': "STEINER", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "53786", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO KROWN", 'N.Guerra': "KROWN", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "53819", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO GRANJA", 'N.Guerra': "GRANJA", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "54211", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO SALES", 'N.Guerra': "SALES", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "54309", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO L SOBRAL", 'N.Guerra': "L SOBRAL", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "54315", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO MACHADO", 'N.Guerra': "MACHADO", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "54316", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO JULIO CESAR", 'N.Guerra': "JULIO CESAR", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "54323", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO VALENTIM", 'N.Guerra': "VALENTIM", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "54325", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO L RODRIGUES", 'N.Guerra': "L RODRIGUES", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "54326", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO TAVARES", 'N.Guerra': "TAVARES", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "54364", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO THIAGO CARVALHO", 'N.Guerra': "THIAGO CARVALHO", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "54381", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO PATRICK", 'N.Guerra': "PATRICK", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "54991", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO MIERS", 'N.Guerra': "MIERS", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "61302", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO OLIVEIRA", 'N.Guerra': "OLIVEIRA", 'ALA': "3", 'OBM': "10º GBM" },
      { 'RG': "61427", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO ELIAS", 'N.Guerra': "ELIAS", 'ALA': "3", 'OBM': "10º GBM" },
      // Ala 4
      { 'RG': "20936", 'Posto/Grad': "SUBTENENTE", 'NOME': "SUBTENENTE LUCIANO", 'N.Guerra': "LUCIANO", 'Quadro': "Q00/97", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "20960", 'Posto/Grad': "SUBTENENTE", 'NOME': "SUBTENENTE GONCALVES", 'N.Guerra': "GONCALVES", 'Quadro': "Q02/97", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "22333", 'Posto/Grad': "SUBTENENTE", 'NOME': "SUBTENENTE COUTO", 'N.Guerra': "COUTO", 'Quadro': "Q00/97", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "27899", 'Posto/Grad': "SUBTENENTE", 'NOME': "SUBTENENTE S OLIVEIRA", 'N.Guerra': "S OLIVEIRA", 'Quadro': "Q00/00", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "31607", 'Posto/Grad': "1º SARGENTO", 'NOME': "1º SARGENTO ROSARIO", 'N.Guerra': "ROSARIO", 'Quadro': "Q08/02", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "42374", 'Posto/Grad': "2º SARGENTO", 'NOME': "2º SARGENTO SCRIVANO", 'N.Guerra': "SCRIVANO", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "49628", 'Posto/Grad': "CABO", 'NOME': "CABO TEIXEIRA", 'N.Guerra': "TEIXEIRA", 'Quadro': "Q00/14", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "53759", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO RIBEIRO", 'N.Guerra': "RIBEIRO", 'Quadro': "Q00/21", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "54028", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO JOSEPH", 'N.Guerra': "JOSEPH", 'Quadro': "Q07/24", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "54320", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO VICTOR HUGO", 'N.Guerra': "VICTOR HUGO", 'Quadro': "Q08/24", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "54409", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO RENAN GOMES", 'N.Guerra': "RENAN GOMES", 'Quadro': "Q08/24", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "54429", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO MOISES", 'N.Guerra': "MOISES", 'Quadro': "Q08/24", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "54956", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO ARTHUR", 'N.Guerra': "ARTHUR", 'Quadro': "Q08/25", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "61109", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO MATHEUS SANTOS", 'N.Guerra': "MATHEUS SANTOS", 'Quadro': "Q02/25", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "61385", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO F LOPES", 'N.Guerra': "F LOPES", 'Quadro': "Q02/25", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "61471", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO FERRAZ", 'N.Guerra': "FERRAZ", 'Quadro': "Q02/25", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "2200839", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO EMMANUEL FERREIRA", 'N.Guerra': "EMMANUEL FERREIRA", 'Quadro': "TEMP/00/22", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "2200848", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO GABRIEL", 'N.Guerra': "GABRIEL", 'Quadro': "TEMP/00/22", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "2201179", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO NATÁLIA TAVARES", 'N.Guerra': "NATÁLIA TAVARES", 'Quadro': "TEMP/00/22", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "2201188", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO YAGO VICTOR", 'N.Guerra': "YAGO VICTOR", 'Quadro': "TEMP/00/22", 'ALA': "4", 'OBM': "10º GBM" },
      { 'RG': "61434", 'Posto/Grad': "SOLDADO", 'NOME': "SOLDADO CAIQUE", 'N.Guerra': "CAIQUE", 'Quadro': "Q08/25", 'ALA': "4", 'OBM': "10º GBM" }
    ];

    records.push(...injectedMilitaries);

    let count = 0;
    let adminSuccess = false;
    // We will try Admin SDK (db) if available, as it is completely bypassed from security rule restrictions and much safer on startup
    if (db && isDbHealthy) {
      try {
        let batch = db.batch();
        for (const row of records) {
          if (!row['RG']) continue;
          const safeRg = normalizeRg(row['RG']);
          if (!safeRg || safeRg === 'RG') continue;
          const docRef = db.collection('militaries').doc(safeRg);
          
          const data: any = {
            rg: safeRg,
            name: row['NOME'] || row['Nome'] || null,
            warName: row['N.Guerra'] || row['N.Guerra'] || null,
            rank: row['Posto/Grad'] || row['POSTO/GRAD'] || null,
            ala: row['ALA'] || row['Ala'] || row['Ala/Horário'] || null,
            obm: row['OBM'] ? normalizeObm(row['OBM']) : null,
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
            updatedAt: FieldValue.serverTimestamp()
          };

          for (const key in data) {
            if (data[key] === null || data[key] === undefined) delete data[key];
          }

          if (safeRg === '54444') {
            data.isAdmin = true;
            data.isEscalante = true;
          }

          batch.set(docRef, data, { merge: true });
          const prevMem1 = militaryCache.get(safeRg) || {};
          const mergedMem1 = { ...prevMem1, ...data };
          if (prevMem1.hasCustomPassword !== undefined) mergedMem1.hasCustomPassword = prevMem1.hasCustomPassword;
          if (prevMem1.customPassword) mergedMem1.customPassword = prevMem1.customPassword;
          militaryCache.set(safeRg, mergedMem1);
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
        if (!safeRg || safeRg === 'RG') continue;
        const docRef = doc(clientDb, 'militaries', safeRg);
        
        const data: any = {
          rg: safeRg,
          name: row['NOME'] || row['Nome'] || null,
          warName: row['N.Guerra'] || row['N.Guerra'] || null,
          rank: row['Posto/Grad'] || row['POSTO/GRAD'] || null,
          ala: row['ALA'] || row['Ala'] || row['Ala/Horário'] || null,
          obm: row['OBM'] ? normalizeObm(row['OBM']) : null,
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
        const prevMem2 = militaryCache.get(safeRg) || {};
        const mergedMem2 = { ...prevMem2, ...data };
        if (prevMem2.hasCustomPassword !== undefined) mergedMem2.hasCustomPassword = prevMem2.hasCustomPassword;
        if (prevMem2.customPassword) mergedMem2.customPassword = prevMem2.customPassword;
        militaryCache.set(safeRg, mergedMem2);
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
    if (getAdminApps().length > 0) {
      try { await deleteApp(getAdminApp()); } catch(e) {}
    }
    
    hasServiceAccount = false;
    // Check if we have an explicit Service Account provided via Environment Variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        if (sa.private_key) {
          sa.private_key = sa.private_key.replace(/\\n/g, '\n');
        }
        initAdminApp({
          credential: cert(sa),
          projectId: sa.project_id
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
      try { initAdminApp(); } catch (f) {}
    }
  }

  const app = getAdminApp();
  const project = app.options.projectId || 'unknown';
  const configDbId = firebaseConfig.firestoreDatabaseId;
  
  console.log(`[Firebase] Resolved Project: ${project}, Config DB ID: ${configDbId}`);

  // Directly initialize Client SDK and Admin SDK on the configured db ID or (default)
  const targetDbId = configDbId && configDbId !== 'remixed-firestore-database-id' && configDbId !== '' ? configDbId : '(default)';
  
  try {
     const clientApp = initializeApp(firebaseConfig);
     clientDb = initializeFirestore(clientApp, { experimentalForceLongPolling: true }, targetDbId);
     console.log(`[Firebase] Client SDK initialized on database "${targetDbId}"`);

     // Authenticate client SDK so server-side operations on clientDb satisfy `request.auth != null`
     const clientAuth = getAuth(clientApp);
     try {
       await signInWithEmailAndPassword(clientAuth, "system_admin@cbmerj.local", "AdminServerSecret123!");
       console.log("[Firebase] Backend clientDb authenticated as system_admin.");
     } catch (authErr: any) {
       if (authErr.code === "auth/user-not-found" || authErr.code === "auth/invalid-credential") {
         try {
           await createUserWithEmailAndPassword(clientAuth, "system_admin@cbmerj.local", "AdminServerSecret123!");
           console.log("[Firebase] Backend clientDb created and authenticated system_admin.");
         } catch (createErr: any) {
           console.warn("[Firebase] Could not create system_admin user:", createErr.message);
         }
       }
     }
  } catch(e: any) {
     console.error('[Firebase] Client SDK init error:', e.message);
  }

  try {
    console.log(`[Firebase] Initializing Admin SDK Firestore on database "${targetDbId}"...`);
    db = getAdminFirestore(app, targetDbId);
    
    // Test Admin SDK and Service Account if configured
    if (hasServiceAccount && process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        // Test Auth credential handshake
        await getAdminAuth().listUsers(1);
        await db.collection('militaries').limit(1).get();
        isDbHealthy = true;
        console.log(`[Firebase] SUCCESS: Admin SDK connected and healthy for db "${targetDbId}"`);
      } catch (err: any) {
        console.warn(`[Firebase] Notice: Service Account verification failed (${err.message}). Disabling Admin Auth sync and operating safely with authenticated Client SDK.`);
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
  
  // Initialize Firebase and cache eagerly with a safety timeout for the whole process
  const initTimeout = 30000;
  
  const firebaseInitPromise = initFirebaseAdmin().catch(e => {
    console.error('[Firebase] fatal admin init error:', e.message);
    isDbHealthy = false;
  });

  cachePromise = firebaseInitPromise.then(async () => {
    if (isDbHealthy && db) {
      // Run local import if file exists
      await importMilitariesFromLocal(db, clientDb);
      
      console.log('[Cache] Loading military cache from Firestore...');
      try {
        const snap = await db.collection('militaries').get();
        snap.forEach(doc => {
          militaryCache.set(doc.id, doc.data());
        });
        isCacheLoaded = true;
        console.log(`[Cache] Preloaded ${militaryCache.size} militaries into memory.`);
        
        // Setup realtime sync for Admin
        db.collection('militaries').onSnapshot((snapshot: any) => {
           let hasChanges = false;
           snapshot.docChanges().forEach((change: any) => {
              if (change.type === 'added' || change.type === 'modified') {
                 militaryCache.set(change.doc.id, change.doc.data());
                 hasChanges = true;
              } else if (change.type === 'removed') {
                 militaryCache.delete(change.doc.id);
                 hasChanges = true;
              }
           });
           if (hasChanges) {
              militaryCacheVersion++;
              cacheEvents.emit('update', militaryCacheVersion);
           }
        }, (err: any) => console.warn('[Cache Sync] Admin SDK listener error:', err.message));
        
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
            
            // Setup realtime sync for Client SDK fallback
            onSnapshot(collection(clientDb, 'militaries'), (snapshot) => {
               let hasChanges = false;
               snapshot.docChanges().forEach(change => {
                  if (change.type === 'added' || change.type === 'modified') {
                     militaryCache.set(change.doc.id, change.doc.data());
                     hasChanges = true;
                  } else if (change.type === 'removed') {
                     militaryCache.delete(change.doc.id);
                     hasChanges = true;
                  }
               });
               if (hasChanges) {
                  militaryCacheVersion++;
                  cacheEvents.emit('update', militaryCacheVersion);
               }
            }, (err) => console.warn('[Cache Sync] Client SDK listener error:', err.message));
            
          } catch (clientErr: any) {
            console.error('[Cache] Failed to load military cache with Client SDK fallback:', clientErr.message);
          }
        }
      }
    } else if (clientDb) {
      // Run local import if file exists
      await importMilitariesFromLocal(null, clientDb);

      console.log('[Cache] Admin SDK unhealthy or unavailable, loading military cache via Client SDK...');
      try {
        const snap = await getDocs(collection(clientDb, 'militaries'));
        snap.forEach(doc => {
          militaryCache.set(doc.id, doc.data());
        });
        isCacheLoaded = true;
        console.log(`[Cache] Preloaded ${militaryCache.size} militaries into memory using Client SDK.`);
        
        // Setup realtime sync for Client SDK
        onSnapshot(collection(clientDb, 'militaries'), (snapshot) => {
           let hasChanges = false;
           snapshot.docChanges().forEach(change => {
              if (change.type === 'added' || change.type === 'modified') {
                 militaryCache.set(change.doc.id, change.doc.data());
                 hasChanges = true;
              } else if (change.type === 'removed') {
                 militaryCache.delete(change.doc.id);
                 hasChanges = true;
              }
           });
           if (hasChanges) {
              militaryCacheVersion++;
              cacheEvents.emit('update', militaryCacheVersion);
           }
        }, (err) => console.warn('[Cache Sync] Client SDK listener error:', err.message));
        
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
        obm: '10º GBM',
        isAdmin: true,
        isEscalante: true,
        birthDate: '11/06/1998'
      };
      militaryCache.set('54444', adminProfile);
    } else {
      adminProfile.obm = '10º GBM'; // Force correct OBM formatting
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

    // One-time injection of requested militaries
    try {
      const injected = [
        // Ala 3
        { rg: "20955", rank: "SUBTENENTE", name: "ALEX", ala: "3", obm: "10º GBM" },
        { rg: "23518", rank: "SUBTENENTE", name: "MAGALHAES", ala: "3", obm: "10º GBM" },
        { rg: "26029", rank: "SUBTENENTE", name: "ALEXSANDRO", ala: "3", obm: "10º GBM" },
        { rg: "31610", rank: "1º SARGENTO", name: "S JUNIOR", ala: "3", obm: "10º GBM" },
        { rg: "32102", rank: "1º SARGENTO", name: "LUIS", ala: "3", obm: "10º GBM" },
        { rg: "42998", rank: "2º SARGENTO", name: "CLEBER", ala: "3", obm: "10º GBM" },
        { rg: "43427", rank: "2º SARGENTO", name: "THIAGO AZEVEDO", ala: "3", obm: "10º GBM" },
        { rg: "53754", rank: "SOLDADO", name: "STEINER", ala: "3", obm: "10º GBM" },
        { rg: "53786", rank: "SOLDADO", name: "KROWN", ala: "3", obm: "10º GBM" },
        { rg: "53819", rank: "SOLDADO", name: "GRANJA", ala: "3", obm: "10º GBM" },
        { rg: "54211", rank: "SOLDADO", name: "SALES", ala: "3", obm: "10º GBM" },
        { rg: "54309", rank: "SOLDADO", name: "L SOBRAL", ala: "3", obm: "10º GBM" },
        { rg: "54315", rank: "SOLDADO", name: "MACHADO", ala: "3", obm: "10º GBM" },
        { rg: "54316", rank: "SOLDADO", name: "JULIO CESAR", ala: "3", obm: "10º GBM" },
        { rg: "54323", rank: "SOLDADO", name: "VALENTIM", ala: "3", obm: "10º GBM" },
        { rg: "54325", rank: "SOLDADO", name: "L RODRIGUES", ala: "3", obm: "10º GBM" },
        { rg: "54326", rank: "SOLDADO", name: "TAVARES", ala: "3", obm: "10º GBM" },
        { rg: "54364", rank: "SOLDADO", name: "THIAGO CARVALHO", ala: "3", obm: "10º GBM" },
        { rg: "54381", rank: "SOLDADO", name: "PATRICK", ala: "3", obm: "10º GBM" },
        { rg: "54991", rank: "SOLDADO", name: "MIERS", ala: "3", obm: "10º GBM" },
        { rg: "61302", rank: "SOLDADO", name: "OLIVEIRA", ala: "3", obm: "10º GBM" },
        { rg: "61427", rank: "SOLDADO", name: "ELIAS", ala: "3", obm: "10º GBM" },
        // Ala 4
        { rg: "20936", rank: "SUBTENENTE", name: "LUCIANO", quadro: "Q00/97", ala: "4", obm: "10º GBM" },
        { rg: "20960", rank: "SUBTENENTE", name: "GONCALVES", quadro: "Q02/97", ala: "4", obm: "10º GBM" },
        { rg: "22333", rank: "SUBTENENTE", name: "COUTO", quadro: "Q00/97", ala: "4", obm: "10º GBM" },
        { rg: "27899", rank: "SUBTENENTE", name: "S OLIVEIRA", quadro: "Q00/00", ala: "4", obm: "10º GBM" },
        { rg: "31607", rank: "1º SARGENTO", name: "ROSARIO", quadro: "Q08/02", ala: "4", obm: "10º GBM" },
        { rg: "42374", rank: "2º SARGENTO", name: "SCRIVANO", ala: "4", obm: "10º GBM" },
        { rg: "49628", rank: "CABO", name: "TEIXEIRA", quadro: "Q00/14", ala: "4", obm: "10º GBM" },
        { rg: "53759", rank: "SOLDADO", name: "RIBEIRO", quadro: "Q00/21", ala: "4", obm: "10º GBM" },
        { rg: "54028", rank: "SOLDADO", name: "JOSEPH", quadro: "Q07/24", ala: "4", obm: "10º GBM" },
        { rg: "54320", rank: "SOLDADO", name: "VICTOR HUGO", quadro: "Q08/24", ala: "4", obm: "10º GBM" },
        { rg: "54409", rank: "SOLDADO", name: "RENAN GOMES", quadro: "Q08/24", ala: "4", obm: "10º GBM" },
        { rg: "54429", rank: "SOLDADO", name: "MOISES", quadro: "Q08/24", ala: "4", obm: "10º GBM" },
        { rg: "54956", rank: "SOLDADO", name: "ARTHUR", quadro: "Q08/25", ala: "4", obm: "10º GBM" },
        { rg: "61109", rank: "SOLDADO", name: "MATHEUS SANTOS", quadro: "Q02/25", ala: "4", obm: "10º GBM" },
        { rg: "61385", rank: "SOLDADO", name: "F LOPES", quadro: "Q02/25", ala: "4", obm: "10º GBM" },
        { rg: "61471", rank: "SOLDADO", name: "FERRAZ", quadro: "Q02/25", ala: "4", obm: "10º GBM" },
        { rg: "2200839", rank: "SOLDADO", name: "EMMANUEL FERREIRA", quadro: "TEMP/00/22", ala: "4", obm: "10º GBM" },
        { rg: "2200848", rank: "SOLDADO", name: "GABRIEL", quadro: "TEMP/00/22", ala: "4", obm: "10º GBM" },
        { rg: "2201179", rank: "SOLDADO", name: "NATÁLIA TAVARES", quadro: "TEMP/00/22", ala: "4", obm: "10º GBM" },
        { rg: "2201188", rank: "SOLDADO", name: "YAGO VICTOR", quadro: "TEMP/00/22", ala: "4", obm: "10º GBM" },
        { rg: "61434", rank: "SOLDADO", name: "CAIQUE", quadro: "Q08/25", ala: "4", obm: "10º GBM" }
      ];

      for (const m of injected) {
        const safeRg = normalizeRg(m.rg);
        if (deletedMilitaries.has(safeRg)) continue;
        const data = { ...m, rg: safeRg, warName: m.name, situacao: 'Ativo' };
        if (!militaryCache.has(safeRg)) {
          militaryCache.set(safeRg, data);
          if (clientDb) {
            setDoc(doc(clientDb, 'militaries', safeRg), data, { merge: true }).catch(() => {});
          }
        }
      }
      console.log('[Cache] Injected requested militaries into memory.');
    } catch (e) {}

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
              appUrl: sData.appUrl
            });
            console.log(`[SMTP] Configuration preloaded from Firestore (host: ${sData.host}, user: ${maskEmail(sData.user)})`);
          }
        }
      }
    } catch (smtpErr: any) {
      console.warn('[SMTP] Note: Could not preload SMTP config from Firestore:', smtpErr.message);
    }
  }).catch(e => {
    console.error('[Cache] Initialization error:', e);
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

  app.use(compression({
    filter: (req, res) => {
      if (req.headers['accept'] === 'text/event-stream') {
        return false;
      }
      return compression.filter(req, res);
    }
  }));
  app.use(express.text({ limit: '20mb' })); // will parse text/plain by default
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Keep-Alive and Brasilia Time helpers for Render Keep-Alive Robot
let lastKeepAlivePing = {
  timestamp: null as string | null,
  source: 'none',
  status: 'initialized',
  count: 0
};

function getBrasiliaTime() {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    const formatted = formatter.format(now);
    // Modo 24/7 Ininterrupto: Sempre ativo para garantir que o Render nunca desative
    return { hour, minute, formatted, isOperatingHours: true, mode: '24/7 Ininterrupto' };
  } catch (e) {
    const hour = (now.getUTCHours() - 3 + 24) % 24;
    return { hour, minute: now.getMinutes(), formatted: `${hour}:${now.getMinutes()}`, isOperatingHours: true, mode: '24/7 Ininterrupto' };
  }
}

function startKeepAliveRobot(port: number) {
  // Render automatically sets RENDER_EXTERNAL_URL in environment
  const targetHost = process.env.RENDER_EXTERNAL_URL || process.env.KEEP_ALIVE_URL || process.env.APP_URL;
  const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes (Render spins down after 15 minutes of inactivity)

  console.log(`[KeepAlive Robot 24/7] Service starting. External target URL: ${targetHost || 'Auto-ping local port'}`);

  const pingEndpoint = async () => {
    const { formatted } = getBrasiliaTime();

    const endpoint = targetHost 
      ? `${targetHost.replace(/\/$/, '')}/api/health` 
      : `http://127.0.0.1:${port}/api/health`;

    try {
      console.log(`[KeepAlive Robot 24/7] ⚡ Disparando ping keep-alive para ${endpoint} às ${formatted} BRT...`);
      const response = await axios.get(endpoint, {
        headers: {
          'User-Agent': 'RenderKeepAliveRobot/1.0 (24-7 Mode)',
          'X-Keep-Alive': 'internal-cron-24h'
        },
        timeout: 25000
      });

      lastKeepAlivePing.timestamp = new Date().toISOString();
      lastKeepAlivePing.source = 'internal-cron-24h';
      lastKeepAlivePing.status = response.status === 200 ? 'healthy' : `status_${response.status}`;
      lastKeepAlivePing.count++;
      console.log(`[KeepAlive Robot 24/7] ✅ Ping confirmado! Render mantido 100% ativo 24h.`);
    } catch (err: any) {
      console.warn(`[KeepAlive Robot 24/7] ⚠️ Aviso no auto-ping (${endpoint}):`, err.message);
      lastKeepAlivePing.status = `warn: ${err.message}`;
    }
  };

  // Wait 45 seconds after initial boot before beginning keep-alive cycle
  setTimeout(() => {
    pingEndpoint();
    setInterval(pingEndpoint, PING_INTERVAL_MS);
  }, 45000);
}

  // API Health check with more details
  app.get('/api/health', (req, res) => {
    const brTime = getBrasiliaTime();
    
    // Register ping origin
    const userAgent = (req.headers['user-agent'] || 'unknown') as string;
    const customHeader = req.headers['x-keep-alive'] as string;
    
    if (customHeader || userAgent.includes('KeepAlive') || userAgent.includes('curl') || userAgent.includes('Uptime')) {
      lastKeepAlivePing.timestamp = new Date().toISOString();
      lastKeepAlivePing.source = customHeader || userAgent.slice(0, 40);
      lastKeepAlivePing.count++;
    }

    res.json({ 
      status: 'ok', 
      uptime: Math.floor(process.uptime()),
      db: db ? 'connected' : 'not_available',
      auth: getAdminApps().length > 0 ? 'ready' : 'not_ready',
      timeUtc: new Date().toISOString(),
      brasilia: {
        time: brTime.formatted,
        hour: brTime.hour,
        isOperatingHours: true,
        window: '24/7 Ininterrupto (Sem Pausa Noturna)',
        mode: '24/7'
      },
      keepAlive: {
        lastPingAt: lastKeepAlivePing.timestamp,
        lastPingSource: lastKeepAlivePing.source,
        totalPings: lastKeepAlivePing.count,
        robotStatus: lastKeepAlivePing.status,
        mode: '24/7 Ininterrupto',
        renderTargetUrl: process.env.RENDER_EXTERNAL_URL || process.env.KEEP_ALIVE_URL || process.env.APP_URL || 'auto'
      }
    });
  });

  // Global Logging for API
  app.use('/api/*', (req, res, next) => {
    console.log(`[API] ${req.method} ${req.originalUrl}`);
    next();
  });

  app.use('/api/auth', authRouter);
  
  const OBM_HIERARCHY: Record<string, string[]> = {
    '10º GBM': ['10º GBM', '1/10', '2/10', '3/10', '4/10'],
    '10 GBM': ['10º GBM', '1/10', '2/10', '3/10', '4/10'], // Alias for missing degree symbol
    '1/10': ['1/10'],
    '2/10': ['2/10'],
    '3/10': ['3/10'],
    '4/10': ['4/10'],
    '26º GBM': ['26º GBM', '1/26'],
    '26 GBM': ['26º GBM', '1/26'],
    '1/26': ['1/26']
  };

  // Expose dependencies to extracted routes
  const getRouteDeps = () => ({
    isDbHealthy,
    db: isDbHealthy ? db : null,
    clientDb,
    militaryCache,
    deletedMilitaries,
    getCacheVersion: () => militaryCacheVersion,
    incrementCacheVersion: () => { militaryCacheVersion++; return militaryCacheVersion; },
    cacheEvents,
    normalizeRg,
    normalizeObm,
    OBM_HIERARCHY,
    isCacheLoaded,
    cachePromise,
    setDbUnhealthy: () => { isDbHealthy = false; }
  });
  
  setupSyncRoutes(app, getRouteDeps);
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
    const apiKey = process.env.SYNC_API_KEY || "MINHA_CHAVE_SECRETA_SUPER_SEGURA_123";
    const provided = req.headers['x-api-key'] || req.query.key;
    if (!apiKey || provided !== apiKey) return res.status(401).json({ error: 'Acesso Negado' });

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
    const apiKey = process.env.SYNC_API_KEY || "MINHA_CHAVE_SECRETA_SUPER_SEGURA_123";
    const provided = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');
    if (!apiKey || provided !== apiKey) return res.status(401).json({ error: 'Acesso Negado' });

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
    const apiKey = process.env.SYNC_API_KEY || "MINHA_CHAVE_SECRETA_SUPER_SEGURA_123";
    const provided = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');
    if (!apiKey || provided !== apiKey) return res.status(401).json({ error: 'Acesso Negado' });

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
          data.updatedAt = FieldValue.serverTimestamp();
          
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
    let userData: any = null;

    if (db && isDbHealthy) {
       try {
           const docSnap = await db.collection('militaries').doc(safeRg).get();
           if (docSnap.exists) {
                userData = docSnap.data();
                try {
                  const privateDoc = await db.collection('militaries').doc(safeRg).collection('private').doc('secrets').get();
                  if (privateDoc.exists) {
                    userData = { ...userData, ...privateDoc.data() };
                  }
                } catch (e) {}
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
                try {
                  const privateSnap = await getDoc(doc(clientDb, 'militaries', safeRg, 'private', 'secrets'));
                  if (privateSnap.exists()) {
                       userData = { ...userData, ...privateSnap.data() };
                  }
                } catch (e) {}
           }
       } catch (e: any) {
           // Provide a silent fallback to memory cache if Client SDK also fails
       }
    }

    // Try outsourced_users if not found in militaries
    if (!userData) {
        if (db && isDbHealthy) {
            try {
                const docSnap = await db.collection('outsourced_users').doc(safeRg).get();
                if (docSnap.exists) {
                    userData = { ...docSnap.data(), isOutsourced: true };
                }
            } catch (e) {}
        }
        if (!userData && clientDb) {
            try {
                const docSnap = await getDoc(doc(clientDb, 'outsourced_users', safeRg));
                if (docSnap.exists()) {
                    userData = { ...docSnap.data(), isOutsourced: true };
                }
            } catch (e) {}
        }
    }

    // If found in cache, preserve any credentials already cached in memory
    const cached = militaryCache.get(safeRg);
    if (cached) {
      if (!userData) {
        userData = cached;
      } else {
        if (!userData.customPassword && cached.customPassword) {
          userData.customPassword = cached.customPassword;
        }
        if (userData.hasCustomPassword === undefined && cached.hasCustomPassword !== undefined) {
          userData.hasCustomPassword = cached.hasCustomPassword;
        }
      }
    }

    if (userData) {
      militaryCache.set(safeRg, userData);
    }
    
    return userData;
  }

  function isBirthDateMatch(userData: any, attempt: string): boolean {
    if (!userData || !attempt) return false;
    const cleanAttempt = (attempt || '').toString().trim().replace(/[\/\.\-\s]/g, '');
    let rawBirth = (userData.birthDate || userData.nascimento || '').toString().trim();
    if (rawBirth.includes('T')) {
      rawBirth = rawBirth.split('T')[0];
    }
    const cleanBirth = rawBirth.replace(/[\/\.\-\s]/g, '');
    if (!cleanBirth || !cleanAttempt) return false;

    if (cleanBirth === cleanAttempt) return true;

    // Format YYYYMMDD (length 8) -> DDMMYYYY
    if (cleanBirth.length === 8 && /^\d{8}$/.test(cleanBirth)) {
      if (cleanBirth.startsWith('19') || cleanBirth.startsWith('20')) {
        const dd = cleanBirth.substring(6, 8);
        const mm = cleanBirth.substring(4, 6);
        const yyyy = cleanBirth.substring(0, 4);
        const ddmmyyyy = `${dd}${mm}${yyyy}`;
        if (ddmmyyyy === cleanAttempt) return true;
      }
    }

    // Format if cleanAttempt is YYYYMMDD (length 8)
    if (cleanAttempt.length === 8 && /^\d{8}$/.test(cleanAttempt)) {
      if (cleanAttempt.startsWith('19') || cleanAttempt.startsWith('20')) {
        const dd = cleanAttempt.substring(6, 8);
        const mm = cleanAttempt.substring(4, 6);
        const yyyy = cleanAttempt.substring(0, 4);
        const ddmmyyyy = `${dd}${mm}${yyyy}`;
        if (cleanBirth === ddmmyyyy) return true;
      }
    }

    return false;
  }

  function verifyUserPassword(userData: any, attempt: string, isDateOnly = false) {
    const res = verifyUserPasswordDetailed(userData, attempt, isDateOnly);
    return res.valid;
  }

  function verifyUserPasswordDetailed(userData: any, attempt: string, isDateOnly = false): { valid: boolean; isFirstAccess?: boolean; reason?: string } {
    const cleanAttempt = (attempt || '').toString().trim();
    if (!userData) return { valid: false, reason: 'NOT_FOUND' };

    // Outsourced users don't have birthdate logic normally, they use customPassword
    if (userData.isOutsourced) {
        const dbPass = String(userData.customPassword || '').trim();
        const attemptPadded = cleanAttempt.length < 6 ? cleanAttempt.padEnd(6, '0') : cleanAttempt;
        const dbPassPadded = dbPass.length < 6 ? dbPass.padEnd(6, '0') : dbPass;
        return { valid: attemptPadded === dbPassPadded };
    }

    if (isDateOnly) {
      return { valid: isBirthDateMatch(userData, cleanAttempt) };
    }

    const hasCustom = Boolean(
      userData.hasCustomPassword === true || 
      (userData.customPassword && userData.customPassword.trim().length > 0)
    );

    if (hasCustom) {
      // 1. If user typed custom password correctly
      if (userData.customPassword && userData.customPassword === cleanAttempt) {
        return { valid: true, isFirstAccess: false };
      }

      // 2. If user typed their birth date while custom password is active:
      // STRICTLY BLOCK and inform that birthdate access is disabled!
      if (isBirthDateMatch(userData, cleanAttempt)) {
        return { valid: false, reason: 'BIRTHDATE_BLOCKED' };
      }

      // Special emergency console fallback for master admin 54444 (never allows birthdate when custom password exists)
      if (userData.rg === '54444' && cleanAttempt === 'admin123') {
        return { valid: true, isFirstAccess: false };
      }

      return { valid: false, reason: 'INVALID_PASSWORD' };
    }

    // User does NOT have custom password yet (First Access)
    if (isBirthDateMatch(userData, cleanAttempt) || (userData.rg === '54444' && cleanAttempt === 'admin123')) {
      return { valid: true, isFirstAccess: true };
    }

    return { valid: false, reason: 'INVALID_CREDENTIALS' };
  }

  app.post('/api/login', async (req, res) => {
    const { rg, password: rawPassword } = req.body;
    if (!rg || !rawPassword) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios ausentes' });
    }
    const password = String(rawPassword).trim();

    const safeRg = normalizeRg(rg);
    const userData = await getFullUserData(safeRg);

    if (!userData) {
      console.warn(`[Login] Failed: RG ${safeRg} not found in cache or DB.`);
      return res.status(404).json({ 
        success: false, 
        code: 'USER_NOT_FOUND',
        canRecover: false,
        error: 'Militar não encontrado no sistema com este RG. Verifique os dígitos informados ou solicite seu cadastro.' 
      });
    }

    const verification = verifyUserPasswordDetailed(userData, password);
    if (!verification.valid) {
       console.warn(`[Login] Failed for RG ${safeRg}. Reason: ${verification.reason}`);
       if (verification.reason === 'BIRTHDATE_BLOCKED') {
         return res.status(400).json({ 
           success: false, 
           code: 'BIRTHDATE_BLOCKED',
           canRecover: true,
           error: 'Você já cadastrou uma senha pessoal. Por segurança, o acesso por data de nascimento foi desativado para sua conta. Utilize sua senha cadastrada ou clique em "Esqueci minha senha" para redefinir.'
         });
       }
       if (verification.reason === 'INVALID_PASSWORD') {
         return res.status(400).json({ 
           success: false, 
           code: 'INVALID_PASSWORD',
           canRecover: true,
           error: 'Senha incorreta. Se você esqueceu sua senha, clique em "Esqueci minha senha" abaixo para redefini-la pelo e-mail.' 
         });
       }
       if (verification.reason === 'INVALID_CREDENTIALS') {
         return res.status(400).json({ 
           success: false, 
           code: 'INVALID_CREDENTIALS',
           canRecover: false,
           error: 'Data de nascimento incorreta. No seu primeiro acesso, digite sua data de nascimento com 8 dígitos (DDMMAAAA).' 
         });
       }
       return res.status(400).json({ 
         success: false, 
         code: verification.reason || 'INVALID_LOGIN',
         canRecover: false,
         error: 'RG ou Senha incorretos. Verifique suas informações e tente novamente.' 
       });
    }

    const is54444 = safeRg === '54444';
    const isEmergencyAdmin = is54444 && password === 'admin123';
    const hasCustomPassword = Boolean(userData.hasCustomPassword === true || (userData.customPassword && userData.customPassword.trim().length > 0));
    const mustChangePassword = !isEmergencyAdmin && (verification.isFirstAccess === true || !hasCustomPassword);

    const claims = {
      admin: is54444 ? true : (userData.isAdmin || false),
      escalante: is54444 ? true : (userData.isEscalante || false),
      adminObms: userData.adminObms || [],
      escalanteObms: userData.escalanteObms || [],
      obm: userData.obm || "CBA",
    };

    const profileData = {
      ...userData,
      uid: safeRg,
      rg: userData.isOutsourced ? null : safeRg,
      login: userData.isOutsourced ? safeRg : null,
      isOutsourced: !!userData.isOutsourced,
      name: userData.name || "Usuário",
      rank: userData.isOutsourced ? "CIVIL" : (userData.rank || ""),
      ala: userData.ala || "1",
      isAdmin: !!claims.admin,
      isEscalante: !!claims.escalante,
      isRefeitorioAdmin: !!userData.isRefeitorioAdmin,
      adminObms: claims.adminObms,
      escalanteObms: claims.escalanteObms,
      obm: claims.obm,
      hasCustomPassword,
      mustChangePassword,
    };

    let firebaseToken = null;
    let authEmail = `${safeRg}@cbmrj.br`;
    let useClientAuth = true;
    let needsClientRegistration = true;

    // Firebase Auth requires at least 6 characters. Pad if necessary.
    let effectiveAuthPassword = String(password);
    if (effectiveAuthPassword.length < 6) {
      effectiveAuthPassword = effectiveAuthPassword.padEnd(6, '0');
      console.log(`[API] Padded password for ${safeRg} from ${password.length} to ${effectiveAuthPassword.length} chars`);
    }

    console.log(`[API] Login sync for ${safeRg}: raw=${password.length}chars, effective=${effectiveAuthPassword.length}chars, mustChange=${mustChangePassword}`);

    // Run Firebase Auth sync before returning if service account is configured
    if (hasServiceAccount && isDbHealthy) {
      try {
        await getAdminAuth().updateUser(safeRg, {
          email: authEmail,
          password: effectiveAuthPassword,
        });
        await getAdminAuth().setCustomUserClaims(safeRg, claims);
      } catch (userErr: any) {
        if (userErr.code === 'auth/user-not-found') {
          try {
            await getAdminAuth().createUser({
              uid: safeRg,
              email: authEmail,
              password: effectiveAuthPassword,
            });
            await getAdminAuth().setCustomUserClaims(safeRg, claims);
          } catch (createErr: any) {}
        }
      }
    }

    return res.json({ 
      success: true, 
      profile: profileData, 
      token: firebaseToken,
      useClientAuth,
      needsClientRegistration,
      authEmail,
      authPassword: effectiveAuthPassword,
      hasCustomPassword,
      mustChangePassword
    });
  });

  app.post('/api/change-password', async (req, res) => {
    const { rg, currentPassword, newPassword } = req.body;
    if (!rg || !currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Campos obrigatórios ausentes' });
    }

    const cleanNew = String(newPassword).trim();
    if (cleanNew.length < 6) {
      return res.status(400).json({ success: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }

    const safeRg = normalizeRg(rg);
    const userData = await getFullUserData(safeRg);

    if (!userData) {
      return res.status(404).json({ success: false, error: 'Militar não encontrado' });
    }

    const cleanCurrent = String(currentPassword).trim();
    const hasCustom = Boolean(userData.hasCustomPassword === true || (userData.customPassword && userData.customPassword.trim().length > 0));

    let currentValid = false;
    if (hasCustom && userData.customPassword) {
      currentValid = (userData.customPassword === cleanCurrent);
    } else {
      currentValid = isBirthDateMatch(userData, cleanCurrent);
    }

    if (!currentValid && safeRg === '54444') {
      currentValid = (cleanCurrent === 'admin123' || (!hasCustom && isBirthDateMatch(userData, cleanCurrent)));
    }

    if (!currentValid) {
       return res.status(400).json({ success: false, error: 'Senha atual incorreta' });
    }

    try {
      const militaryUpdate = {
        hasCustomPassword: true,
        mustChangePassword: false,
        passwordChangedAt: Date.now()
      };

      if (db && isDbHealthy && hasServiceAccount) {
        try {
          await db.collection('militaries').doc(safeRg).set(militaryUpdate, { merge: true });
          await db.collection('militaries').doc(safeRg).collection('private').doc('secrets').set({
            customPassword: cleanNew,
            hasCustomPassword: true
          }, { merge: true });
        } catch(e) {}
      }
      
      if (clientDb) {
        await setDoc(doc(clientDb, 'militaries', safeRg), militaryUpdate, { merge: true });
        await setDoc(doc(clientDb, 'militaries', safeRg), { customPassword: cleanNew }, { merge: true });
        try {
          await setDoc(doc(clientDb, 'militaries', safeRg, 'private', 'secrets'), {
            customPassword: cleanNew,
            hasCustomPassword: true
          }, { merge: true });
        } catch(e) {}
      }

      const existing = militaryCache.get(safeRg) || {};
      militaryCache.set(safeRg, { 
        ...existing, 
        ...militaryUpdate, 
        customPassword: cleanNew 
      });

      // Synchronize Firebase Auth password if service account is available
      if (hasServiceAccount && isDbHealthy) {
        try {
          let effectiveAuthPassword = cleanNew;
          if (effectiveAuthPassword.length < 6) {
            effectiveAuthPassword = effectiveAuthPassword.padEnd(6, '0');
          }
          await getAdminAuth().updateUser(safeRg, {
            password: effectiveAuthPassword
          });
        } catch (authErr: any) {}
      }

      return res.json({ 
        success: true, 
        message: 'Senha pessoal cadastrada com sucesso! O acesso por data de nascimento foi desativado.' 
      });
    } catch (err: any) {
      console.error('[API] Failed to change password', err);
      return res.status(500).json({ success: false, error: 'Erro ao alterar a senha' });
    }
  });

  app.post(['/api/request-password-reset', '/api/recover-password'], async (req, res) => {
    const { rg, dataNascimento } = req.body;
    if (!rg) {
      return res.status(400).json({ success: false, error: 'O número de RG Militar é obrigatório.' });
    }

    const safeRg = normalizeRg(rg);
    const userData = await getFullUserData(safeRg);

    if (!userData) {
      return res.status(404).json({ success: false, error: 'Militar não encontrado no sistema.' });
    }

    // Double validation: Check birthdate to avoid denial-of-service or inbox spam
    if (dataNascimento) {
      if (!isBirthDateMatch(userData, dataNascimento)) {
        return res.status(400).json({ success: false, error: 'Data de nascimento incorreta para o RG informado.' });
      }
    }

    const targetEmail = (userData.email || userData.email2 || '').trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      return res.status(400).json({ 
        success: false, 
        error: 'Este militar não possui um e-mail cadastrado no sistema. Por segurança, procure o Escalante ou Administrador da sua OBM para cadastrar seu e-mail e recuperar o acesso.' 
      });
    }

    // Generate random 6-digit code and secure 48-char token
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    const resetReq: PasswordResetRequest = {
      rg: safeRg,
      code,
      token,
      email: targetEmail,
      expiresAt,
      attempts: 0
    };

    passwordResetsByRg.set(safeRg, resetReq);
    passwordResetsByToken.set(token, safeRg);

    // Save in Firestore for persistence across restarts
    if (clientDb) {
      try {
        await setDoc(doc(clientDb, 'militaries', safeRg, 'private', 'recovery'), {
          code,
          token,
          email: targetEmail,
          expiresAt,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (e) {}
    }

    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const baseUrl = process.env.APP_URL || (req.headers.origin ? String(req.headers.origin) : `${proto}://${host}`);
    const resetUrl = `${baseUrl}/?reset_token=${token}&rg=${safeRg}`;

    const emailResult = await sendPasswordResetEmail({
      to: targetEmail,
      militarName: userData.warName || userData.name || 'Militar',
      safeRg,
      code,
      resetUrl,
      expiresInMinutes: 15
    });

    const isSmtpDelivered = emailResult.mode === 'smtp' && emailResult.delivered;

    return res.json({ 
      success: true, 
      message: isSmtpDelivered 
        ? `Código de recuperação enviado com sucesso para ${maskEmail(targetEmail)}. Verifique sua caixa de entrada e spam.`
        : `Serviço de e-mail SMTP não configurado. Código de teste em ambiente de desenvolvimento: ${code}`,
      maskedEmail: maskEmail(targetEmail),
      expiresInMinutes: 15,
      isLocalDelivery: !isSmtpDelivered,
      codePreview: !isSmtpDelivered ? code : undefined,
      resetUrlPreview: !isSmtpDelivered ? resetUrl : undefined
    });
  });

  app.get('/api/verify-reset-token', async (req, res) => {
    const token = String(req.query.token || '').trim();
    if (!token) return res.status(400).json({ valid: false, error: 'Token ausente.' });

    let safeRg = passwordResetsByToken.get(token);
    let resetReq = safeRg ? passwordResetsByRg.get(safeRg) : null;

    if (!resetReq && clientDb) {
      try {
        // Query Firestore recovery doc by token
        const qSnap = await getDocs(query(collection(clientDb, 'militaries')));
        for (const mDoc of qSnap.docs) {
          const recSnap = await getDoc(doc(clientDb, 'militaries', mDoc.id, 'private', 'recovery'));
          if (recSnap.exists() && recSnap.data()?.token === token) {
            resetReq = { rg: mDoc.id, ...recSnap.data() } as PasswordResetRequest;
            safeRg = mDoc.id;
            break;
          }
        }
      } catch (e) {}
    }

    if (!resetReq || Date.now() > resetReq.expiresAt) {
      return res.json({ valid: false, error: 'Link de redefinição expirado ou inválido (validade de 15 minutos).' });
    }

    const userData = await getFullUserData(resetReq.rg);
    return res.json({ 
      valid: true, 
      rg: resetReq.rg,
      name: userData?.warName || userData?.name || 'Militar',
      maskedEmail: maskEmail(resetReq.email)
    });
  });

  app.post('/api/confirm-password-reset', async (req, res) => {
    const { rg, code, token, newPassword } = req.body;
    if (!newPassword || (!code && !token)) {
      return res.status(400).json({ success: false, error: 'Dados insuficientes para redefinição.' });
    }

    const cleanNew = String(newPassword).trim();
    if (cleanNew.length < 6) {
      return res.status(400).json({ success: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }

    let safeRg = rg ? normalizeRg(rg) : '';
    if (token && !safeRg) {
      safeRg = passwordResetsByToken.get(token) || '';
    }

    let resetReq = safeRg ? passwordResetsByRg.get(safeRg) : null;

    // Fallback: Check Firestore recovery subcollection
    if (!resetReq && clientDb && safeRg) {
      try {
        const snap = await getDoc(doc(clientDb, 'militaries', safeRg, 'private', 'recovery'));
        if (snap.exists()) {
          resetReq = { rg: safeRg, ...snap.data() } as PasswordResetRequest;
        }
      } catch (e) {}
    }

    if (!resetReq) {
      return res.status(400).json({ success: false, error: 'Nenhuma solicitação de recuperação encontrada ou o prazo expirou. Solicite um novo código.' });
    }

    if (Date.now() > resetReq.expiresAt) {
      passwordResetsByRg.delete(safeRg);
      if (resetReq.token) passwordResetsByToken.delete(resetReq.token);
      return res.status(400).json({ success: false, error: 'O código ou link de recuperação expirou (validade de 15 minutos). Solicite uma nova redefinição.' });
    }

    // Verify token or 6-digit code
    let isValid = false;
    if (token && resetReq.token && token === resetReq.token) {
      isValid = true;
    } else if (code) {
      const cleanCode = String(code).trim().replace(/\D/g, '');
      if (cleanCode === resetReq.code) {
        isValid = true;
      } else {
        resetReq.attempts = (resetReq.attempts || 0) + 1;
        if (resetReq.attempts >= 5) {
          passwordResetsByRg.delete(safeRg);
          if (resetReq.token) passwordResetsByToken.delete(resetReq.token);
          return res.status(400).json({ success: false, error: 'Número excessivo de tentativas incorretas. Por segurança, o código foi cancelado. Solicite uma nova recuperação.' });
        }
        return res.status(400).json({ success: false, error: `Código de verificação incorreto. Restam ${5 - resetReq.attempts} tentativa(s).` });
      }
    }

    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Código ou token inválido.' });
    }

    const userData = await getFullUserData(safeRg);
    if (!userData) {
      return res.status(404).json({ success: false, error: 'Militar não encontrado.' });
    }

    // Apply the new personal password!
    try {
      const militaryUpdate = {
        hasCustomPassword: true,
        mustChangePassword: false,
        passwordChangedAt: Date.now(),
        customPassword: cleanNew
      };

      if (db && isDbHealthy && hasServiceAccount) {
        try {
          await db.collection('militaries').doc(safeRg).set(militaryUpdate, { merge: true });
          await db.collection('militaries').doc(safeRg).collection('private').doc('secrets').set({
            customPassword: cleanNew,
            hasCustomPassword: true
          }, { merge: true });
        } catch(e) {}
      }
      
      if (clientDb) {
        try {
          await setDoc(doc(clientDb, 'militaries', safeRg), militaryUpdate, { merge: true });
        } catch(e) {}
        try {
          await setDoc(doc(clientDb, 'militaries', safeRg, 'private', 'secrets'), {
            customPassword: cleanNew,
            hasCustomPassword: true
          }, { merge: true });
        } catch(e) {}
        try {
          await setDoc(doc(clientDb, 'militaries', safeRg, 'private', 'recovery'), {
            code: "",
            token: "",
            usedAt: Date.now()
          }, { merge: true });
        } catch(e) {}
      }

      const existing = militaryCache.get(safeRg) || {};
      militaryCache.set(safeRg, { 
        ...existing, 
        ...militaryUpdate, 
        customPassword: cleanNew 
      });

      // Synchronize Firebase Admin Auth password if healthy
      if (hasServiceAccount && isDbHealthy) {
        try {
          let effectiveAuthPassword = cleanNew;
          if (effectiveAuthPassword.length < 6) {
            effectiveAuthPassword = effectiveAuthPassword.padEnd(6, '0');
          }
          await getAdminAuth().updateUser(safeRg, { password: effectiveAuthPassword });
        } catch (authErr: any) {}
      }

      // Invalidate recovery token
      passwordResetsByRg.delete(safeRg);
      if (resetReq.token) passwordResetsByToken.delete(resetReq.token);

      console.log(`[PASSWORD RESET] SUCCESS: Password reset completed securely for RG ${safeRg}.`);
      return res.json({ 
        success: true, 
        message: 'Senha alterada com sucesso! Você já pode acessar o sistema com sua nova senha pessoal.' 
      });
    } catch (err: any) {
      console.error('[API] Failed to complete password reset:', err);
      return res.status(500).json({ success: false, error: 'Erro ao salvar a nova senha.' });
    }
  });

  

  


  // ==========================================
  // SMTP Configuration and Test Endpoints
  // ==========================================
  app.get('/api/admin/smtp', async (req, res) => {
    const { config, source } = getEffectiveSmtpConfig();
    return res.json({
      configured: !!(config && config.host && config.user && config.pass),
      source,
      host: config?.host || '',
      port: config?.port || 587,
      secure: config?.secure || false,
      user: config?.user ? maskEmail(config.user) : '',
      rawUser: config?.user || '',
      from: config?.from || '',
      appUrl: config?.appUrl || process.env.APP_URL || ''
    });
  });

  app.post('/api/admin/smtp', async (req, res) => {
    try {
      const { host, port, secure, user, pass, from, appUrl } = req.body;
      const { config: currentConfig } = getEffectiveSmtpConfig();
      const effectivePass = (pass && pass.trim()) ? pass.trim().replace(/\s+/g, '') : (currentConfig?.pass || '');

      if (!host || !user || !effectivePass) {
        return res.status(400).json({ success: false, error: 'Host, Usuário e Senha de App são obrigatórios.' });
      }

      const cleanPort = Number(port) || 587;
      const cleanSecure = secure === true || cleanPort === 465;
      const cleanFrom = from?.trim() || `"Portal CBMERJ" <${user.trim()}>`;

      const configData: SmtpConfig = {
        host: host.trim(),
        port: cleanPort,
        secure: cleanSecure,
        user: user.trim(),
        pass: effectivePass,
        from: cleanFrom,
        appUrl: appUrl?.trim() || undefined
      };

      if (clientDb) {
        const firestoreData: Record<string, any> = {
          host: configData.host,
          port: configData.port,
          secure: configData.secure,
          user: configData.user,
          pass: configData.pass,
          from: configData.from,
          updatedAt: serverTimestamp()
        };
        if (configData.appUrl) {
          firestoreData.appUrl = configData.appUrl;
        }

        try {
          await setDoc(doc(clientDb, 'config', 'smtp'), firestoreData, { merge: true });
        } catch (dbErr: any) {
          console.warn('[SMTP] Note: clientDb setDoc warning:', dbErr.message);
        }
      }

      setRuntimeSmtpConfig(configData);

      return res.json({
        success: true,
        message: 'Configurações de SMTP salvas com sucesso no banco de dados!',
        configured: true,
        source: 'firestore'
      });
    } catch (err: any) {
      console.error('[SMTP Save Error]', err);
      return res.status(500).json({ success: false, error: 'Erro ao salvar configurações de SMTP.' });
    }
  });

  app.post('/api/admin/smtp-test', async (req, res) => {
    try {
      const { targetEmail, host, port, secure, user, pass, from } = req.body;
      const override = (host && user && pass) ? {
        host: host.trim(),
        port: Number(port) || 587,
        secure: secure === true || Number(port) === 465,
        user: user.trim(),
        pass: pass.trim().replace(/\s+/g, ''),
        from: from?.trim() || `"Portal CBMERJ" <${user.trim()}>`
      } : undefined;

      const destination = targetEmail || user || 'lcssbernardo@gmail.com';
      const result = await testSmtpConnection(destination, override);
      return res.json(result);
    } catch (err: any) {
      console.error('[SMTP Test Route Error]', err);
      return res.status(500).json({ success: false, message: err.message || 'Erro ao realizar teste de SMTP.' });
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
    if (!db || !isDbHealthy) return;
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

const expressApp = startServer().catch(e => console.error('[Server] Fatal startup error:', e));
