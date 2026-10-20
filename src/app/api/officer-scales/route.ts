import { NextResponse } from 'next/server';
import { getServerFirestore } from '../../../server/lib/server-firebase';
import { getAdminDb } from '../../../server/lib/firebase-admin';
import { doc, getDoc } from 'firebase/firestore';
import { withTimeout } from '../../../lib/utils';

export const dynamic = 'force-dynamic';

const ALLOWED_COLLECTIONS = ['officer_scales', 'nautico_scales', 'medico_scales', 'grd_configs'];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const collectionName = searchParams.get('collection') || 'officer_scales';
    const docId = searchParams.get('docId') || '';

    if (!ALLOWED_COLLECTIONS.includes(collectionName)) {
      return NextResponse.json({ success: false, error: 'Coleção não permitida' }, { status: 403 });
    }
    if (!docId) {
      return NextResponse.json({ success: false, error: 'docId é obrigatório' }, { status: 400 });
    }

    let scaleData: any = null;

    // 1. Try Firebase Admin SDK if service account credentials exist
    try {
      const adminDb = getAdminDb();
      if (adminDb) {
        const snap: any = await withTimeout(adminDb.collection(collectionName).doc(docId).get(), 2000);
        if (snap && snap.exists) scaleData = snap.data();
      }
    } catch (e: any) {}

    // 2. Authenticated Server Firestore
    if (!scaleData) {
      try {
        const db = await getServerFirestore();
        const snap: any = await withTimeout(getDoc(doc(db, collectionName, docId)), 2500);
        if (snap && snap.exists()) scaleData = snap.data();
      } catch (e: any) {}
    }

    return NextResponse.json({ success: true, collectionName, docId, data: scaleData || {} });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
