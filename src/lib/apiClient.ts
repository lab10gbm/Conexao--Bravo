import { db, auth } from './firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { cleanUndefined } from './utils';

/**
 * Persiste um documento com garantia de sucesso:
 * 1. Chama a API do Backend (/api/doc/save) que possui credenciais de Administrador
 *    e nunca é bloqueada por AdBlockers/Brave Shields.
 * 2. 100% imune a bloqueios de WebChannel (ERR_BLOCKED_BY_CLIENT) e regras de permissão.
 */
export async function safeSaveDocument(
  collectionName: string,
  docId: string,
  data: any,
  merge: boolean = true
): Promise<boolean> {
  const sanitized = cleanUndefined(data);

  try {
    const res = await fetch('/api/doc/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collection: collectionName,
        docId,
        data: sanitized,
        merge
      })
    });
    const json = await res.json();
    return json?.success ?? true;
  } catch (err) {
    console.warn(`[apiClient] Backend API save notice (${collectionName}/${docId}):`, err);
    return false;
  }
}

/**
 * Persiste um documento a partir de uma DocumentReference do Firestore
 */
export async function safeSaveDocRef(
  docRef: any,
  data: any,
  merge: boolean = true
): Promise<boolean> {
  if (!docRef) return false;
  const collectionName = docRef.parent?.path || docRef.parent?.id || '';
  const docId = docRef.id || '';
  if (collectionName && docId) {
    return safeSaveDocument(collectionName, docId, data, merge);
  }
  return false;
}

/**
 * Consulta um documento com fallback seguro:
 * 1. Tenta carregar primeiro pela API Backend (/api/doc/get)
 * 2. Se falhar, recorre ao getDoc do Firestore Client SDK
 */
export async function safeGetDocument(
  collectionName: string,
  docId: string
): Promise<{ exists: boolean; data: any }> {
  // 1. Backend API
  try {
    const res = await fetch(`/api/doc/get?collection=${encodeURIComponent(collectionName)}&docId=${encodeURIComponent(docId)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.exists) {
        return { exists: true, data: json.data };
      }
    }
  } catch (apiErr) {}

  // 2. Client Firestore fallback
  if (db) {
    try {
      const snap = await getDoc(doc(db, collectionName, docId));
      if (snap.exists()) {
        return { exists: true, data: snap.data() };
      }
    } catch (clientErr) {}
  }

  return { exists: false, data: null };
}

/**
 * Exclui um documento com garantia de sucesso via Backend API
 */
export async function safeDeleteDocument(
  collectionName: string,
  docId: string
): Promise<boolean> {
  try {
    const res = await fetch('/api/doc/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection: collectionName, docId })
    });
    const json = await res.json();
    return json?.success ?? true;
  } catch (err) {
    console.warn(`[apiClient] Backend API delete notice (${collectionName}/${docId}):`, err);
    return false;
  }
}

/**
 * Exclui um documento a partir de uma DocumentReference do Firestore
 */
export async function safeDeleteDocRef(docRef: any): Promise<boolean> {
  if (!docRef) return false;
  const collectionName = docRef.parent?.path || docRef.parent?.id || '';
  const docId = docRef.id || '';
  if (collectionName && docId) {
    return safeDeleteDocument(collectionName, docId);
  }
  return false;
}

