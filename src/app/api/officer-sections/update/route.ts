import { NextResponse } from 'next/server';
import { getServerFirestore } from '../../../../server/lib/server-firebase';
import { doc, setDoc } from 'firebase/firestore';
import { normalizeObm, withTimeout } from '../../../../lib/utils';
import { OfficerSectionItem } from '../../../../types/officerSections';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { obm, sections } = body;

    const rawObm = obm || '10º GBM';
    const cleanObm = rawObm === 'GLOBAL' ? '10º GBM' : normalizeObm(rawObm);
    const docId = cleanObm.replace(/°/g, 'º').replace(/\//g, '_').replace(/\s/g, '_');

    if (!Array.isArray(sections)) {
      return NextResponse.json({ success: false, error: 'Formato inválido para seções.' }, { status: 400 });
    }

    const db = await getServerFirestore();

    const payload = {
      obm: cleanObm,
      docId,
      updatedAt: new Date().toISOString(),
      sections: sections.map((sec: OfficerSectionItem) => ({
        id: String(sec.id || '').trim(),
        name: String(sec.name || '').trim(),
        subtitle: String(sec.subtitle || '').trim(),
        description: String(sec.description || '').trim(),
        badge: String(sec.badge || '').trim(),
        icon: String(sec.icon || 'shield').trim(),
        color: String(sec.color || 'indigo').trim(),
        enabled: Boolean(sec.enabled),
        isCustom: Boolean(sec.isCustom),
        col1Name: sec.col1Name || 'OFICIAL DE DIA / CMT OP / SOBREAVISO 1 / GRD 1',
        col2Name: sec.col2Name || 'SOBREAVISO 2 / GRD 2'
      }))
    };

    await withTimeout(setDoc(doc(db, 'officer_sections_config', docId), payload, { merge: true }), 3500);

    return NextResponse.json({
      success: true,
      obm: cleanObm,
      docId,
      sections: payload.sections
    });
  } catch (err: any) {
    console.error('[API] /api/officer-sections/update error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
