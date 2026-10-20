import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../server/lib/firebase-admin';
import { db as clientDb } from '../../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { withTimeout } from '../../../../lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const collectionName = searchParams.get('collection') || '';
    const docId = searchParams.get('docId') || '';

    if (!collectionName || !docId) {
      return NextResponse.json({ success: false, error: 'collection and docId required' }, { status: 400 });
    }

    let data: any = null;
    let exists = false;

    // 1. Tenta Firebase Admin
    try {
      const adminDb = getAdminDb();
      const snap: any = await withTimeout(adminDb.collection(collectionName).doc(docId).get(), 2000);
      if (snap.exists) {
        data = snap.data();
        exists = true;
      }
    } catch (e) {}

    // 2. Fallback Client SDK
    if (!exists && clientDb) {
      try {
        const snap: any = await withTimeout(getDoc(doc(clientDb, collectionName, docId)), 2000);
        if (snap.exists()) {
          data = snap.data();
          exists = true;
        }
      } catch (e) {}
    }

    return NextResponse.json({ success: true, exists, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
