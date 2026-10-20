import { NextResponse } from 'next/server';
import { getServerFirestore } from '../../../../server/lib/server-firebase';
import { getAdminDb } from '../../../../server/lib/firebase-admin';
import { doc, setDoc } from 'firebase/firestore';
import { normalizeObm, cleanUndefined, withTimeout } from '../../../../lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { obm, date, data } = body;

    if (!date || !data) {
      return NextResponse.json({ success: false, error: 'date and data are required' }, { status: 400 });
    }

    const rawObm = obm || '10º GBM';
    const cleanObm = normalizeObm(rawObm);
    const normalizedObm = cleanObm.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const collectionName = `escala24h_${normalizedObm}`;
    const sanitized = cleanUndefined(data);

    let saved = false;

    // 1. Try Firebase Admin SDK if service account credentials exist
    try {
      const adminDb = getAdminDb();
      if (adminDb) {
        await withTimeout(adminDb.collection(collectionName).doc(date).set(sanitized, { merge: true }), 2500);
        saved = true;
      }
    } catch (e: any) {}

    // 2. Authenticated Server Firestore (system_admin credentials)
    if (!saved) {
      try {
        const db = await getServerFirestore();
        await withTimeout(setDoc(doc(db, collectionName, date), sanitized, { merge: true }), 3000);
        saved = true;
      } catch (e: any) {
        console.error('[API] /api/escala24h/save error:', e.message);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, collectionName, date });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
