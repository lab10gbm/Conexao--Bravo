import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../server/lib/firebase-admin';
import { db as clientDb } from '../../../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { normalizeRg, cleanUndefined, withTimeout } from '../../../../lib/utils';
import { bumpMilitarCacheVersion } from '../../../../server/lib/militar-cache-tracker';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rg, data } = body;

    if (!rg || !data) {
      return NextResponse.json({ success: false, error: 'Dados incompletos' }, { status: 400 });
    }

    const safeRg = normalizeRg(rg);
    let currentRecord: any = null;

    try {
      const adminDb = getAdminDb();
      if (adminDb) {
        const snap: any = await withTimeout(adminDb.collection('militaries').doc(safeRg).get(), 2000);
        if (snap && snap.exists) currentRecord = snap.data();
      }
    } catch (e: any) {}

    if (!currentRecord && clientDb) {
      try {
        const { getDoc } = await import('firebase/firestore');
        const snap: any = await withTimeout(getDoc(doc(clientDb, 'militaries', safeRg)), 2000);
        if (snap && snap.exists()) currentRecord = snap.data();
      } catch (e: any) {}
    }

    const mergedData = {
      ...(currentRecord || {}),
      ...data,
      id: safeRg,
      rg: safeRg,
      viaturas: { ...((currentRecord && currentRecord.viaturas) || {}), ...(data.viaturas || {}) },
      dynamicFunctions: { ...((currentRecord && currentRecord.dynamicFunctions) || {}), ...(data.dynamicFunctions || {}) },
      updatedAt: new Date().toISOString()
    };

    const sanitizedData = cleanUndefined(mergedData);

    let saved = false;

    // 1. Try Firebase Admin
    try {
      const adminDb = getAdminDb();
      if (adminDb) {
        await withTimeout(adminDb.collection('militaries').doc(safeRg).set(sanitizedData, { merge: true }), 2500);
        await withTimeout(adminDb.collection('users').doc(safeRg).set(sanitizedData, { merge: true }), 2500);
        saved = true;
      }
    } catch (adminErr) {}

    if (!saved && clientDb) {
      // 2. Fallback to Client Firestore
      try {
        await withTimeout(setDoc(doc(clientDb, 'militaries', safeRg), sanitizedData, { merge: true }), 2500);
        await withTimeout(setDoc(doc(clientDb, 'users', safeRg), sanitizedData, { merge: true }), 2500);
        saved = true;
      } catch (clientErr: any) {
        return NextResponse.json({ success: false, error: clientErr.message }, { status: 500 });
      }
    }

    if (saved) {
      bumpMilitarCacheVersion();
    }

    return NextResponse.json({ success: saved, rg: safeRg });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
