import { NextResponse } from 'next/server';
import { getServerFirestore } from '../../../../server/lib/server-firebase';
import { getAdminDb } from '../../../../server/lib/firebase-admin';
import { doc, setDoc } from 'firebase/firestore';
import { cleanUndefined, withTimeout } from '../../../../lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { collection: collectionName, docId, data, merge = true } = body;

    if (!collectionName || !docId || !data) {
      return NextResponse.json({ success: false, error: 'collection, docId and data are required' }, { status: 400 });
    }

    const sanitized = cleanUndefined(data);
    let saved = false;

    // 1. Try Firebase Admin SDK if service account credentials exist
    try {
      const adminDb = getAdminDb();
      if (adminDb) {
        await withTimeout(adminDb.collection(collectionName).doc(docId).set(sanitized, { merge }), 2500);
        saved = true;
      }
    } catch (e: any) {}

    // 2. Authenticated Server Firestore (system_admin credentials)
    if (!saved) {
      try {
        const db = await getServerFirestore();
        await withTimeout(setDoc(doc(db, collectionName, docId), sanitized, { merge }), 3000);
        saved = true;
      } catch (e: any) {
        console.error('[API] /api/doc/save error:', e.message);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, collection: collectionName, docId });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
