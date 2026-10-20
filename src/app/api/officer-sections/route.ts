import { NextResponse } from 'next/server';
import { getServerFirestore } from '../../../server/lib/server-firebase';
import { doc, getDoc } from 'firebase/firestore';
import { normalizeObm, withTimeout } from '../../../lib/utils';
import { getDefaultSectionsForObm, OfficerSectionItem } from '../../../types/officerSections';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawObm = searchParams.get('obm') || '10º GBM';
    const cleanObm = rawObm === 'GLOBAL' ? '10º GBM' : normalizeObm(rawObm);
    const docId = cleanObm.replace(/°/g, 'º').replace(/\//g, '_').replace(/\s/g, '_');

    const db = await getServerFirestore();
    let sections: OfficerSectionItem[] = getDefaultSectionsForObm(cleanObm);

    try {
      const snap: any = await withTimeout(getDoc(doc(db, 'officer_sections_config', docId)), 2500);
      if (snap && snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.sections) && data.sections.length > 0) {
          sections = data.sections;
        }
      }
    } catch (e: any) {
      console.warn('[API] /api/officer-sections read notice:', e.message);
    }

    return NextResponse.json({
      success: true,
      obm: cleanObm,
      docId,
      sections
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
