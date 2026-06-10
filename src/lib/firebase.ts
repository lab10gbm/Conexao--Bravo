import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, setLogLevel } from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';

const firebaseConfig = {
  ...firebaseConfigData,
};

console.log('[Firebase] Initializing with project:', firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);

// Resilient Firestore Init with Offline Persistence Cache
function initFirestore() {
  const settings = {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    experimentalForceLongPolling: true // Bypasses adblockers/VPNs blocking WebSockets (fixes ERR_BLOCKED_BY_CLIENT on Listen/channel)
  };

  const dbId = firebaseConfigData.firestoreDatabaseId;

  try {
    // Try the specific database ID if provided and allowed
    if (dbId && 
        dbId !== 'remixed-firestore-database-id' && 
        dbId !== '(default)' &&
        dbId !== '') {
      console.log('[Firebase] Attempting connection to custom database:', dbId);
      return initializeFirestore(app, settings, dbId);
    }
  } catch (e) {
    console.warn('[Firebase] Custom database init failed, falling back to (default):', e);
  }
  
  try {
    // Initialize default db with cache
    return initializeFirestore(app, settings);
  } catch(e: any) {
    // Fallback if initializeFirestore has issues (e.g. called twice)
    console.warn('[Firebase] initializeFirestore failed, using getFirestore:', e);
    return getFirestore(app);
  }
}

export const db = initFirestore();
export const auth = getAuth();

// Suppress Firestore WebChannelConnection warnings since it's operating offline/disabled
setLogLevel('error');

// Test connection on boot (Skill guideline)
import { doc, getDocFromCache, getDocFromServer } from 'firebase/firestore';
async function testConnection() {
  try {
    // Attempt server fetch to check sync
    await getDocFromServer(doc(db, 'test', 'connection')).catch(() => {});
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("[Firebase] Client appears to be offline. Data may be stale.");
    }
  }
}
testConnection();

// --- Firestore Error Handling ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, shouldThrow = true) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('[Firestore Error]', JSON.stringify(errInfo));
  if (shouldThrow) {
    throw new Error(JSON.stringify(errInfo));
  }
}
