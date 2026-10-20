import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../server/lib/firebase-admin';
import { db as clientDb } from '../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { withTimeout } from '../../../lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key') || '';

    if (!key) {
      return NextResponse.json({ success: false, error: 'Chave obrigatória' }, { status: 400 });
    }

    let data: any = null;

    // 1. Try Firebase Admin
    try {
      const adminDb = getAdminDb();
      const snap: any = await withTimeout(adminDb.collection('obm_settings').doc(key).get(), 2000);
      if (snap.exists) {
        data = snap.data();
      }
    } catch (e: any) {}

    // 2. Fallback Client SDK
    if (!data && clientDb) {
      try {
        const snap: any = await withTimeout(getDoc(doc(clientDb, 'obm_settings', key)), 2000);
        if (snap.exists()) {
          data = snap.data();
        }
      } catch (e: any) {}
    }

    return NextResponse.json({ success: true, key, data: data || {} });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
