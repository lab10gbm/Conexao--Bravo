import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../server/lib/firebase-admin';
import { db as clientDb } from '../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    try {
      const adminDb = getAdminDb();
      const snap = await adminDb.collection('refeitorio').doc('data').get();
      if (snap.exists) {
        return NextResponse.json(snap.data());
      }
    } catch (adminErr) {
      const snap = await getDoc(doc(clientDb, 'refeitorio', 'data'));
      if (snap.exists()) {
        return NextResponse.json(snap.data());
      }
    }

    return NextResponse.json({ menu: 'Cardápio em elaboração', lastUpdate: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao carregar cardápio' }, { status: 500 });
  }
}
