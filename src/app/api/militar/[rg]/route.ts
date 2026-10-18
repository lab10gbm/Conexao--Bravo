import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../server/lib/firebase-admin';
import { db as clientDb } from '../../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { normalizeRg } from '../../../../lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ rg: string }> | { rg: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const rawRg = resolvedParams.rg;
    const safeRg = normalizeRg(rawRg);

    if (!safeRg) {
      return NextResponse.json({ error: 'RG inválido' }, { status: 400 });
    }

    // 1. Try Firebase Admin
    try {
      const adminDb = getAdminDb();
      // First check users collection
      let userDoc = await adminDb.collection('users').doc(safeRg).get();
      if (!userDoc.exists) {
        userDoc = await adminDb.collection('militaries').doc(safeRg).get();
      }

      if (userDoc.exists) {
        return NextResponse.json({ id: userDoc.id, ...userDoc.data() });
      }
    } catch (adminErr) {
      // 2. Fallback to client SDK
      let userSnap = await getDoc(doc(clientDb, 'users', safeRg));
      if (!userSnap.exists()) {
        userSnap = await getDoc(doc(clientDb, 'militaries', safeRg));
      }

      if (userSnap.exists()) {
        return NextResponse.json({ id: userSnap.id, ...userSnap.data() });
      }
    }

    return NextResponse.json({ error: 'Militar não encontrado' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao buscar militar' }, { status: 500 });
  }
}
