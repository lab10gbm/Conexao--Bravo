import { NextResponse } from 'next/server';
import { getServerFirestore } from '../../../../server/lib/server-firebase';
import { getAdminDb } from '../../../../server/lib/firebase-admin';
import { doc, deleteDoc } from 'firebase/firestore';
import { withTimeout } from '../../../../lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { collection: collectionName, docId } = body;

    if (!collectionName || !docId) {
      return NextResponse.json({ success: false, error: 'collection and docId required' }, { status: 400 });
    }

    let deleted = false;

    // 1. Try Firebase Admin
    try {
      const adminDb = getAdminDb();
      if (adminDb) {
        await withTimeout(adminDb.collection(collectionName).doc(docId).delete(), 2500);
        deleted = true;
      }
    } catch (e: any) {}

    // 2. Authenticated Server Firestore (system_admin credentials)
    if (!deleted) {
      try {
        const db = await getServerFirestore();
        await withTimeout(deleteDoc(doc(db, collectionName, docId)), 3000);
        deleted = true;
      } catch (e: any) {
        console.error('[API] /api/doc/delete error:', e.message);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, collection: collectionName, docId });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
