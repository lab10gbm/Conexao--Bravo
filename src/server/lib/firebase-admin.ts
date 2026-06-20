import { initializeApp, getApps, getApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

let isInitialized = false;

export function initFirebaseAdmin() {
  if (isInitialized) return true;

  const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
  let firebaseConfig: any = { projectId: '' };
  
  if (fs.existsSync(firebaseConfigPath)) {
    try {
      firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
      if (firebaseConfig.projectId) {
        process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
      }
    } catch (e) {
      console.error('[Firebase] Failed to parse config file:', e);
    }
  }

  const targetProject = firebaseConfig.projectId;

  try {
    if (getApps().length > 0) {
      try { deleteApp(getApp()).catch(()=>{}); } catch(e) {}
    }
    
    const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    const saFilePath = path.join(process.cwd(), 'service-account.json');
    if (saJson) {
      const sa = JSON.parse(saJson);
      initializeApp({
        credential: cert(sa),
        projectId: sa.project_id
      });
    } else if (fs.existsSync(saFilePath)) {
      const sa = JSON.parse(fs.readFileSync(saFilePath, 'utf8'));
      initializeApp({
        credential: cert(sa),
        projectId: sa.project_id
      });
    } else if (targetProject && targetProject !== 'remixed-project-id' && targetProject !== '') {
      initializeApp({ projectId: targetProject });
    } else {
      initializeApp();
    }
    isInitialized = true;
  } catch (e: any) {
    console.error('[Firebase] Admin Init error:', e.message);
    if (getApps().length === 0) {
      try { initializeApp(); isInitialized = true; } catch (f) {}
    }
  }
  return true;
}

export const getAdminDb = () => {
    if (!isInitialized) initFirebaseAdmin();
    // Default to the correct database from config file
    const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(firebaseConfigPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
            if (config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)') {
                return getFirestore(getApp(), config.firestoreDatabaseId);
            }
        } catch (e) {
            console.error('[Firebase] Error reading firestoreDatabaseId in getAdminDb:', e);
        }
    }
    return getFirestore(getApp());
};
