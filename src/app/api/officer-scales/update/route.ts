import { NextResponse } from 'next/server';
import { getServerFirestore } from '../../../../server/lib/server-firebase';
import { getAdminDb } from '../../../../server/lib/firebase-admin';
import { doc, setDoc } from 'firebase/firestore';
import { cleanUndefined, withTimeout } from '../../../../lib/utils';

export const dynamic = 'force-dynamic';

const ALLOWED_COLLECTIONS = ['officer_scales', 'nautico_scales', 'medico_scales', 'grd_configs'];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { collectionName, docId, data } = body;

    if (!collectionName || !ALLOWED_COLLECTIONS.includes(collectionName)) {
      return NextResponse.json({ success: false, error: 'Coleção não permitida ou inválida' }, { status: 403 });
    }
    if (!docId) {
      return NextResponse.json({ success: false, error: 'docId é obrigatório' }, { status: 400 });
    }
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ success: false, error: 'data deve ser um objeto válido' }, { status: 400 });
    }

    const sanitizedData = cleanUndefined(data);
    let saved = false;

    // 1. Try Firebase Admin SDK if service account credentials exist
    try {
      const adminDb = getAdminDb();
      if (adminDb) {
        await withTimeout(adminDb.collection(collectionName).doc(docId).set(sanitizedData, { merge: true }), 2500);
        saved = true;
      }
    } catch (e: any) {}

    // 2. Authenticated Server Firestore (system_admin credentials)
    if (!saved) {
      try {
        const db = await getServerFirestore();
        await withTimeout(setDoc(doc(db, collectionName, docId), sanitizedData, { merge: true }), 3000);
        saved = true;
      } catch (e: any) {
        console.error('[API] /api/officer-scales/update error:', e.message);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, collectionName, docId });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
