import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../server/lib/firebase-admin';
import { db as clientDb } from '../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { normalizeObm, withTimeout } from '../../../lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawObm = searchParams.get('obm') || '10º GBM';
    const date = searchParams.get('date') || '';

    if (!date) {
      return NextResponse.json({ success: false, error: 'date is required' }, { status: 400 });
    }

    const cleanObm = normalizeObm(rawObm);
    const normalizedObm = cleanObm.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const collectionName = `escala24h_${normalizedObm}`;

    let data: any = null;
    let exists = false;

    // 1. Try Firebase Admin
    try {
      const adminDb = getAdminDb();
      const snap: any = await withTimeout(adminDb.collection(collectionName).doc(date).get(), 2000);
      if (snap.exists) {
        data = snap.data();
        exists = true;
      }
    } catch (e: any) {}

    // 2. Fallback Client SDK
    if (!exists && clientDb) {
      try {
        const snap: any = await withTimeout(getDoc(doc(clientDb, collectionName, date)), 2000);
        if (snap.exists()) {
          data = snap.data();
          exists = true;
        }
      } catch (e: any) {}
    }

    return NextResponse.json({ success: true, exists, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
