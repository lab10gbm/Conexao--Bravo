import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../server/lib/firebase-admin';
import { db as clientDb } from '../../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { normalizeObm, normalizeRg } from '../../../lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const obmParam = searchParams.get('obm');
    const alaParam = searchParams.get('ala');
    const searchParam = searchParams.get('search')?.toLowerCase().trim();

    let militars: any[] = [];

    // 1. Try Firebase Admin
    try {
      const adminDb = getAdminDb();
      const snap = await adminDb.collection('militaries').get();
      militars = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (adminErr) {
      // 2. Fallback to Client Firestore
      const snap = await getDocs(collection(clientDb, 'militaries'));
      militars = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    // Apply filtering if requested
    if (obmParam && obmParam !== 'GLOBAL') {
      const cleanTargetObm = normalizeObm(obmParam);
      militars = militars.filter((m) => {
        const mObm = normalizeObm(m.obm);
        const mLent = normalizeObm(m.lentTo);
        return mObm === cleanTargetObm || mLent === cleanTargetObm;
      });
    }

    if (alaParam) {
      militars = militars.filter((m) => String(m.ala).trim() === alaParam.trim());
    }

    if (searchParam) {
      militars = militars.filter((m) => {
        const nameMatch = m.name?.toLowerCase().includes(searchParam);
        const warMatch = m.warName?.toLowerCase().includes(searchParam);
        const rgMatch = String(m.rg || '').includes(searchParam);
        return nameMatch || warMatch || rgMatch;
      });
    }

    return NextResponse.json(militars);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Erro ao listar efetivo' },
      { status: 500 }
    );
  }
}
