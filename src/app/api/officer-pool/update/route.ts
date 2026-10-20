import { NextResponse } from 'next/server';
import { getServerFirestore } from '../../../../server/lib/server-firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { normalizeObm, withTimeout } from '../../../../lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { obm, moduleKey, rgs, config: fullConfig } = body;
    const rawObm = obm || '10º GBM';
    const cleanObm = rawObm === 'GLOBAL' ? '10º GBM' : normalizeObm(rawObm);
    const docId = cleanObm.replace(/°/g, 'º').replace(/\//g, '_').replace(/\s/g, '_');

    const db = await getServerFirestore();
    let currentData: any = {};

    try {
      const snap: any = await withTimeout(getDoc(doc(db, 'officer_pool_config', docId)), 2500);
      if (snap && snap.exists()) {
        currentData = snap.data();
      }
    } catch (e: any) {}

    let newConfig = fullConfig ? { ...fullConfig } : { ...currentData };
    if (moduleKey && rgs) {
      newConfig[moduleKey] = (Array.isArray(rgs) ? rgs : []).map((r: any) => String(r).trim());
    }

    newConfig.servicosGrd = (newConfig.servicosGrd || []).map((r: any) => String(r).trim());
    newConfig.nucleoNautico = (newConfig.nucleoNautico || []).map((r: any) => String(r).trim());
    newConfig.oficiaisMedicos = (newConfig.oficiaisMedicos || []).map((r: any) => String(r).trim());

    await withTimeout(setDoc(doc(db, 'officer_pool_config', docId), newConfig, { merge: true }), 3000);

    return NextResponse.json({ success: true, docId, config: newConfig });
  } catch (err: any) {
    console.error('[API] /api/officer-pool/update error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
