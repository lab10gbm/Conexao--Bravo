import { NextResponse } from 'next/server';
import { getServerFirestore } from '../../../../server/lib/server-firebase';
import { getAdminDb } from '../../../../server/lib/firebase-admin';
import { doc, setDoc } from 'firebase/firestore';
import { cleanUndefined, withTimeout } from '../../../../lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const targetId = body.id || body.permutaId;
    const updates = cleanUndefined(body.updates || body.data || body);
    delete updates.id;
    delete updates.permutaId;

    if (!targetId || Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'id and updates are required' }, { status: 400 });
    }

    if (!updates.updatedAt) {
      updates.updatedAt = Date.now();
    }

    let updated = false;
    const adminDb = getAdminDb();
    if (adminDb) {
      try {
        await withTimeout(
          adminDb.collection('permutas').doc(targetId).set(updates, { merge: true }),
          2500
        );
        updated = true;
      } catch (e) {}
    }

    if (!updated) {
      const db = await getServerFirestore();
      await withTimeout(
        setDoc(doc(db, 'permutas', targetId), updates, { merge: true }),
        3000
      );
    }

    return NextResponse.json({ success: true, id: targetId, updates });
  } catch (err: any) {
    console.error('[API] /api/permutas/update error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
