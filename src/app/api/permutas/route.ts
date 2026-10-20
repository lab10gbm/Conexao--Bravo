import { NextResponse } from 'next/server';
import { getServerFirestore } from '../../../server/lib/server-firebase';
import { getAdminDb } from '../../../server/lib/firebase-admin';
import { collection, query, getDocs, where, doc, updateDoc, writeBatch, serverTimestamp, addDoc, setDoc } from 'firebase/firestore';
import { normalizeObm, getUserObmAccess, withTimeout, cleanUndefined } from '../../../lib/utils';
import { resolveCanonicalScope } from '../../../lib/canonicalScope';
import { format, subDays } from 'date-fns';
import { PermutaRequest } from '../../../types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const obmParam = searchParams.get('obm');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const daysAgoParam = searchParams.get('daysAgo');
    const daysAgo = daysAgoParam ? parseInt(daysAgoParam, 10) : 45;

    const startDate = startDateParam || format(subDays(new Date(), daysAgo), 'yyyy-MM-dd');

    let allDocs: any[] = [];
    let fetched = false;

    // 1. Try Firebase Admin SDK if available
    try {
      const adminDb = getAdminDb();
      if (adminDb) {
        let q: any = adminDb.collection('permutas').where('date', '>=', startDate);
        if (endDateParam) {
          q = q.where('date', '<=', endDateParam);
        }
        const snap: any = await withTimeout(q.get(), 3000);
        allDocs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        fetched = true;
      }
    } catch (e: any) {
      console.warn('[API] /api/permutas admin SDK notice:', e.message);
    }

    // 2. Try Server Firestore (authenticated system_admin)
    if (!fetched) {
      try {
        const db = await getServerFirestore();
        let q = query(collection(db, 'permutas'), where('date', '>=', startDate));
        if (endDateParam) {
          q = query(q, where('date', '<=', endDateParam));
        }
        const snap: any = await withTimeout(getDocs(q), 3500);
        allDocs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        fetched = true;
      } catch (e: any) {
        console.error('[API] /api/permutas server Firestore error:', e.message);
      }
    }

    // 3. Fallback: broad fetch without date filter if index error
    if (!fetched) {
      try {
        const db = await getServerFirestore();
        const snap: any = await withTimeout(getDocs(collection(db, 'permutas')), 3500);
        allDocs = snap.docs
          .map((d: any) => ({ id: d.id, ...d.data() }))
          .filter((p: any) => !p.date || p.date >= startDate);
      } catch (e: any) {
        console.error('[API] /api/permutas broad fallback error:', e.message);
        return NextResponse.json({ success: false, error: e.message, permutas: [] }, { status: 500 });
      }
    }

    // Filter by OBM / canonical scope if requested
    let permutas: PermutaRequest[] = allDocs;
    if (obmParam && obmParam !== 'GLOBAL') {
      const cleanObm = normalizeObm(obmParam);
      const targetScope = resolveCanonicalScope(obmParam);
      const allowedObms = getUserObmAccess(cleanObm, false);

      permutas = permutas.filter((p: any) => {
        if (!p.obm && !p.scope) return true;
        if (p.scope && p.scope.unitId) {
          return p.scope.unitId === targetScope.unitId;
        }
        const pObm = normalizeObm(p.obm || '');
        return allowedObms.includes(pObm);
      });
    }

    // Sort ascending by date
    permutas.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    return NextResponse.json({
      success: true,
      count: permutas.length,
      permutas
    });
  } catch (err: any) {
    console.error('[API] /api/permutas fatal error:', err);
    return NextResponse.json({ success: false, error: err.message, permutas: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, id, updates, ids, data } = body;

    // Handle batch archive
    if (action === 'batch-archive' && Array.isArray(ids) && ids.length > 0) {
      const adminDb = getAdminDb();
      if (adminDb) {
        const batch = adminDb.batch();
        for (const docId of ids) {
          batch.update(adminDb.collection('permutas').doc(docId), {
            archived: true,
            updatedAt: Date.now()
          });
        }
        await withTimeout(batch.commit(), 3000);
        return NextResponse.json({ success: true, archivedCount: ids.length });
      }

      const db = await getServerFirestore();
      const batch = writeBatch(db);
      for (const docId of ids) {
        batch.update(doc(db, 'permutas', docId), {
          archived: true,
          updatedAt: Date.now()
        });
      }
      await withTimeout(batch.commit(), 3500);
      return NextResponse.json({ success: true, archivedCount: ids.length });
    }

    // Handle single update
    const targetId = id || body.permutaId;
    const targetUpdates = cleanUndefined(updates || data || {});

    if (targetId && Object.keys(targetUpdates).length > 0) {
      // Ensure updatedAt is recorded
      if (!targetUpdates.updatedAt) {
        targetUpdates.updatedAt = Date.now();
      }

      let updated = false;
      const adminDb = getAdminDb();
      if (adminDb) {
        try {
          await withTimeout(
            adminDb.collection('permutas').doc(targetId).set(targetUpdates, { merge: true }),
            2500
          );
          updated = true;
        } catch (e) {}
      }

      if (!updated) {
        const db = await getServerFirestore();
        await withTimeout(
          setDoc(doc(db, 'permutas', targetId), targetUpdates, { merge: true }),
          3000
        );
      }

      return NextResponse.json({ success: true, id: targetId, updates: targetUpdates });
    }

    // Handle create new permuta
    if (action === 'create' && data) {
      const sanitized = cleanUndefined({
        ...data,
        createdAt: data.createdAt || Date.now(),
        updatedAt: Date.now()
      });

      const db = await getServerFirestore();
      const ref = await withTimeout(addDoc(collection(db, 'permutas'), sanitized), 3000);
      return NextResponse.json({ success: true, id: ref.id });
    }

    return NextResponse.json({ success: false, error: 'Invalid payload for /api/permutas' }, { status: 400 });
  } catch (err: any) {
    console.error('[API] /api/permutas POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
