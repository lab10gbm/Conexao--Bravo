import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../server/lib/firebase-admin';
import { db as clientDb } from '../../../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { normalizeRg, cleanUndefined } from '../../../../lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rg, data } = body;

    if (!rg || !data) {
      return NextResponse.json({ success: false, error: 'Dados incompletos' }, { status: 400 });
    }

    const safeRg = normalizeRg(rg);
    const sanitizedData = cleanUndefined({
      ...data,
      updatedAt: new Date().toISOString(),
    });

    let saved = false;

    // 1. Try Firebase Admin
    try {
      const adminDb = getAdminDb();
      await adminDb.collection('militaries').doc(safeRg).set(sanitizedData, { merge: true });
      await adminDb.collection('users').doc(safeRg).set(sanitizedData, { merge: true });
      saved = true;
    } catch (adminErr) {
      // 2. Fallback to Client Firestore
      try {
        await setDoc(doc(clientDb, 'militaries', safeRg), sanitizedData, { merge: true });
        await setDoc(doc(clientDb, 'users', safeRg), sanitizedData, { merge: true });
        saved = true;
      } catch (clientErr: any) {
        return NextResponse.json({ success: false, error: clientErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: saved, rg: safeRg });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
