import { NextResponse } from 'next/server';
import { getServerFirestore } from '../../../server/lib/server-firebase';
import { doc, getDoc } from 'firebase/firestore';
import { normalizeObm, withTimeout } from '../../../lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawObm = searchParams.get('obm') || '10º GBM';
    const cleanObm = rawObm === 'GLOBAL' ? '10º GBM' : normalizeObm(rawObm);
    const docId = cleanObm.replace(/°/g, 'º').replace(/\//g, '_').replace(/\s/g, '_');

    const db = await getServerFirestore();
    let poolData: any = null;

    try {
      const snap: any = await withTimeout(getDoc(doc(db, 'officer_pool_config', docId)), 2500);
      if (snap && snap.exists()) {
        poolData = snap.data();
      }
    } catch (e: any) {
      console.warn('[API] /api/officer-pool read notice:', e.message);
    }

    return NextResponse.json({
      success: true,
      docId,
      config: {
        servicosGrd: (poolData?.servicosGrd || []).map((r: any) => String(r).trim()),
        nucleoNautico: (poolData?.nucleoNautico || []).map((r: any) => String(r).trim()),
        oficiaisMedicos: (poolData?.oficiaisMedicos || []).map((r: any) => String(r).trim())
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
