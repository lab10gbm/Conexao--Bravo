import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../server/lib/firebase-admin';
import { db as clientDb } from '../../../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Try Firebase Admin Firestore
    try {
      const adminDb = getAdminDb();
      const snap = await adminDb
        .collection('mural_avisos')
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

      const avisos = snap.docs.map((doc: any) => {
        const data = doc.data();
        if (data.createdAt && typeof data.createdAt.toMillis === 'function') {
          data.createdAt = data.createdAt.toMillis();
        }
        return { id: doc.id, ...data };
      });

      return NextResponse.json(avisos);
    } catch (adminErr) {
      // 2. Fallback to Client Firestore
      const q = query(collection(clientDb, 'mural_avisos'), orderBy('createdAt', 'desc'), limit(20));
      const snap = await getDocs(q);
      const avisos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return NextResponse.json(avisos);
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao buscar mural' }, { status: 500 });
  }
}
