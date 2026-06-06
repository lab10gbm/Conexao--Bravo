import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

let isInitialized = false;

export function initFirebaseAdmin() {
  if (isInitialized) return admin;

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
    if (admin.apps.length > 0) {
      try { admin.app().delete().catch(()=>{}); } catch(e) {}
    }
    
    const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (saJson) {
      const sa = JSON.parse(saJson);
      admin.initializeApp({
        credential: admin.credential.cert(sa),
        projectId: sa.project_id
      });
    } else if (targetProject && targetProject !== 'remixed-project-id' && targetProject !== '') {
      admin.initializeApp({ projectId: targetProject });
    } else {
      admin.initializeApp();
    }
    isInitialized = true;
  } catch (e: any) {
    console.error('[Firebase] Admin Init error:', e.message);
    if (admin.apps.length === 0) {
      try { admin.initializeApp(); isInitialized = true; } catch (f) {}
    }
  }
  return admin;
}

export const getAdminDb = () => {
    if (!isInitialized) initFirebaseAdmin();
    // Default to the correct database from config file
    const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(firebaseConfigPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
            if (config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)') {
                return getFirestore(admin.app(), config.firestoreDatabaseId);
            }
        } catch (e) {
            console.error('[Firebase] Error reading firestoreDatabaseId in getAdminDb:', e);
        }
    }
    return getFirestore(admin.app());
};
