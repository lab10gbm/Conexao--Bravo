import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../server/lib/firebase-admin';
import { db as clientDb } from '../../../lib/firebase';
import { collection, getDocs, query as firestoreQuery, where } from 'firebase/firestore';
import { normalizeObm, withTimeout } from '../../../lib/utils';
import { resolveCanonicalScope, isSameUnit, isSameScope } from '../../../lib/canonicalScope';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const obmParam = searchParams.get('obm');
    const subunitParam = searchParams.get('scopeSubunit') || searchParams.get('subunitId');
    const unitParam = searchParams.get('scopeUnit') || searchParams.get('unitId');
    const alaParam = searchParams.get('ala');
    const searchParam = searchParams.get('search')?.toLowerCase().trim();

    // Determina escopo alvo prioritário
    let targetSubunit = subunitParam || null;
    let targetUnit = unitParam && unitParam !== 'GLOBAL' ? unitParam : null;

    if (!targetSubunit && !targetUnit && obmParam && obmParam !== 'GLOBAL') {
      const resolved = resolveCanonicalScope(obmParam);
      // Se a string original especificava subunidade (ex: '2/10', '1/10', '1/26', '2/26')
      const cleanUpper = obmParam.toUpperCase();
      if (cleanUpper.includes('/') || cleanUpper.includes('DBM') || cleanUpper.includes('FRADE') || cleanUpper.includes('ILHA') || cleanUpper.includes('MAMBUCABA') || cleanUpper.includes('MANGARATIBA') || cleanUpper.includes('ITAGUA')) {
        targetSubunit = resolved.subunitId;
      } else {
        targetUnit = resolved.unitId;
      }
    }

    let militars: any[] = [];

    // 1. Tenta Firebase Admin SDK
    try {
      const adminDb = getAdminDb();
      let q: any = adminDb.collection('militaries');

      if (targetSubunit) {
        q = q.where('scope.subunitId', '==', targetSubunit);
      } else if (targetUnit) {
        q = q.where('scope.unitId', '==', targetUnit);
      }

      const snap: any = await withTimeout(q.get(), 2500);
      militars = snap.docs.map((d: any) => {
        const data = d.data() as any;
        return {
          id: d.id,
          ...data,
          scope: data.scope || resolveCanonicalScope(data.obm)
        };
      });
    } catch (adminErr) {
      // 2. Fallback para Client Firestore SDK
      try {
        let q: any = collection(clientDb, 'militaries');
        if (targetSubunit) {
          q = firestoreQuery(q, where('scope.subunitId', '==', targetSubunit));
        } else if (targetUnit) {
          q = firestoreQuery(q, where('scope.unitId', '==', targetUnit));
        }
        const snap: any = await withTimeout(getDocs(q), 2500);
        militars = snap.docs.map((d: any) => {
          const data = d.data() as any;
          return {
            id: d.id,
            ...data,
            scope: data.scope || resolveCanonicalScope(data.obm)
          };
        });
      } catch (clientErr) {
        // Fallback amplo se índice composto ainda não foi criado
        try {
          const snap: any = await withTimeout(getDocs(collection(clientDb, 'militaries')), 2500);
          militars = snap.docs.map((d: any) => {
            const data = d.data() as any;
            return {
              id: d.id,
              ...data,
              scope: data.scope || resolveCanonicalScope(data.obm)
            };
          });
        } catch (e: any) {}
      }
    }

    // Filtro em memória para retrocompatibilidade e refinamento
    if (targetSubunit) {
      militars = militars.filter((m) => m.scope?.subunitId === targetSubunit);
    } else if (targetUnit) {
      militars = militars.filter((m) => m.scope?.unitId === targetUnit);
    } else if (obmParam && obmParam !== 'GLOBAL') {
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
