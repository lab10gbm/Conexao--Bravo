import type { ViaturaConfig, VtrModalFunctionRow } from '../types';
import { normalizeObm } from '../../../lib/utils';

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export function getFunctionRoleCategory(
  fnId: string, 
  customName?: string, 
  availableFunctions: Array<{ id: string; scaleName: string; categoryId: string }> = []
): 'condutor' | 'chefe' | 'auxiliar' {
  if (fnId && fnId !== '__CUSTOM__') {
    const fn = availableFunctions.find(f => f.id === fnId);
    if (fn) {
      const sName = fn.scaleName.toUpperCase();
      if (
        fn.categoryId === 'condutores' ||
        fn.id.startsWith('viaturas.') ||
        fn.id === 'ativoCondutor' ||
        fn.id === 'mestreAl' ||
        fn.id === 'mestreBia' ||
        fn.id === 'opAma' ||
        sName.startsWith('CONDUTOR') ||
        sName.startsWith('MESTRE')
      ) {
        return 'condutor';
      }
      if (
        fn.categoryId === 'chefes' ||
        fn.id === 'chefeAbt' ||
        fn.id === 'chefeAbsl' ||
        fn.id === 'ativoChefeGua' ||
        sName.startsWith('CHEFE')
      ) {
        return 'chefe';
      }
      return 'auxiliar';
    }
  }
  const upper = (customName || '').trim().toUpperCase();
  if (upper.startsWith('CONDUTOR') || upper.startsWith('MESTRE') || upper.startsWith('MOTORISTA') || upper.startsWith('OPERADOR')) {
    return 'condutor';
  }
  if (upper.startsWith('CHEFE')) {
    return 'chefe';
  }
  return 'auxiliar';
}

export function inferDefaultFnIdForSlot(v: ViaturaConfig, slotGroup: 'condutor' | 'auxiliar' | 'chefe'): string {
  const vtrName = (v.vtr || '').trim().toUpperCase();
  const rawSigla = vtrName.split(/[-_\s]/)[0] || '';
  const sigla = (rawSigla.startsWith('AR') && rawSigla !== 'ARC') ? 'AR' : rawSigla;
  const isMar = Boolean(v.maritima || sigla === 'L' || sigla === 'BIA');

  if (slotGroup === 'condutor') {
    if (isMar) return sigla === 'BIA' ? 'mestreBia' : 'mestreAl';
    if (sigla === 'ABT') return 'viaturas.ABT';
    if (sigla === 'ABSL') return 'viaturas.ABSL';
    if (sigla === 'ASE') return 'viaturas.ASE';
    if (sigla === 'ARC') return 'viaturas.ARC';
    if (sigla === 'AR') return 'viaturas.AR';
    return 'viaturas.ABT';
  }
  if (slotGroup === 'chefe') {
    if (sigla === 'ABT') return 'chefeAbt';
    if (sigla === 'ABSL') return 'chefeAbsl';
    return 'chefeAbt';
  }
  // auxiliar
  if (isMar) return 'marinheiros';
  if (sigla === 'ABT') return 'auxAbt';
  if (sigla === 'ABSL') return 'auxAbsl';
  if (sigla === 'ASE') return 'auxAse';
  if (sigla === 'ARC') return 'auxArc';
  return 'auxAbt';
}

export function buildModalFunctionsFromVtr(
  v: ViaturaConfig, 
  availableFunctions: Array<{ id: string; name: string; scaleName: string; categoryId: string }> = []
): VtrModalFunctionRow[] {
  const rows: VtrModalFunctionRow[] = [];

  const resolveSlotFn = (slot: 'condutor' | 'g1' | 'g2' | 'g3' | 'g4' | 'cg', fallbackGroup: 'condutor' | 'auxiliar' | 'chefe') => {
    let explicitId = v.customFunctions?.[slot];
    // Normalize legacy category-level IDs so Marítimos (Geral) is never shown instead of Marinheiro
    if (explicitId === 'ativoMaritimo') explicitId = 'marinheiros';
    if (explicitId === 'ativoCondutor') explicitId = inferDefaultFnIdForSlot(v, 'condutor');
    if (explicitId === 'ativoAuxiliar') explicitId = inferDefaultFnIdForSlot(v, 'auxiliar');
    if (explicitId === 'ativoChefeGua') explicitId = inferDefaultFnIdForSlot(v, 'chefe');

    if (explicitId && availableFunctions.some(f => f.id === explicitId)) {
      return { fnId: explicitId, customName: v.customNames?.[slot] || '' };
    }
    const cName = v.customNames?.[slot]?.trim();
    if (cName) {
      const upper = cName.toUpperCase();
      // Map generic single-word labels to the specific vehicle function
      if (upper === 'MESTRE' || upper === 'CONDUTOR') {
        const defId = inferDefaultFnIdForSlot(v, 'condutor');
        if (availableFunctions.some(f => f.id === defId)) {
          return { fnId: defId, customName: '' };
        }
      }
      if (upper === 'MARINHEIRO' || upper === 'MARINHEIROS' || upper === 'MARITIMO' || upper === 'MARÍTIMOS' || upper.includes('MARÍTIMOS (GERAL)')) {
        if (availableFunctions.some(f => f.id === 'marinheiros')) {
          return { fnId: 'marinheiros', customName: '' };
        }
      }
      if (upper === 'AUXILIAR' || upper === 'AUXILIARES') {
        const defId = inferDefaultFnIdForSlot(v, 'auxiliar');
        if (availableFunctions.some(f => f.id === defId)) {
          return { fnId: defId, customName: '' };
        }
      }
      if (upper === 'CHEFE' || upper === 'CHEFE GUA' || upper === 'CHEFE DE GUARNIÇÃO') {
        const defId = inferDefaultFnIdForSlot(v, 'chefe');
        if (availableFunctions.some(f => f.id === defId)) {
          return { fnId: defId, customName: '' };
        }
      }
      const match = availableFunctions.find(f => f.scaleName === upper || f.name.trim().toUpperCase() === upper);
      if (match) {
        return { fnId: match.id, customName: cName };
      }
      return { fnId: '__CUSTOM__', customName: cName };
    }
    const defId = inferDefaultFnIdForSlot(v, fallbackGroup);
    const foundDef = availableFunctions.find(f => f.id === defId);
    return { fnId: foundDef ? foundDef.id : (availableFunctions[0]?.id || ''), customName: '' };
  };

  // 1. Condutor / Mestre (sempre 1 vaga)
  if (!v.blocked.includes('condutor') && v.condutor !== null) {
    const { fnId, customName } = resolveSlotFn('condutor', 'condutor');
    rows.push({
      uid: 'fn-condutor',
      fnId,
      customName,
      maxQty: 1,
    });
  }

  // 2. Auxiliares / Marinheiros / Guarnição (até 1..4 vagas)
  const gSlots = (['g1', 'g2', 'g3', 'g4'] as const).filter(s => !v.blocked.includes(s) && v[s] !== null);
  if (gSlots.length > 0) {
    const activeG = gSlots.filter(s => v[s] === true);
    const effectiveSlots = activeG.length > 0 ? activeG : gSlots;
    const groupedG: { fnId: string; customName: string; count: number }[] = [];
    for (const s of effectiveSlots) {
      const resolved = resolveSlotFn(s, 'auxiliar');
      const last = groupedG[groupedG.length - 1];
      if (last && last.fnId === resolved.fnId && (resolved.fnId !== '__CUSTOM__' || last.customName === resolved.customName)) {
        last.count += 1;
      } else {
        groupedG.push({ ...resolved, count: 1 });
      }
    }
    groupedG.forEach((grp, idx) => {
      if (rows.length < 3) {
        rows.push({
          uid: `fn-aux-${idx}-${Date.now()}`,
          fnId: grp.fnId,
          customName: grp.customName,
          maxQty: Math.max(1, Math.min(4, grp.count)),
        });
      }
    });
  }

  // 3. Chefe de Guarnição (sempre 1 vaga)
  if (rows.length < 3 && !v.blocked.includes('cg') && v.cg !== null) {
    const { fnId, customName } = resolveSlotFn('cg', 'chefe');
    rows.push({
      uid: 'fn-chefe',
      fnId,
      customName,
      maxQty: 1,
    });
  }

  return rows;
}

export function syncModalFunctionsToVtr(
  baseVtr: ViaturaConfig, 
  rows: VtrModalFunctionRow[],
  availableFunctions: Array<{ id: string; scaleName: string; categoryId: string }> = []
): ViaturaConfig {
  const nextBlocked = new Set<string>(['condutor', 'g1', 'g2', 'g3', 'g4', 'cg']);
  const nextCustomFunctions: NonNullable<ViaturaConfig['customFunctions']> = {};
  const nextCustomNames: NonNullable<ViaturaConfig['customNames']> = {};
  const nextSlots: Record<'condutor' | 'g1' | 'g2' | 'g3' | 'g4' | 'cg', boolean | null> = {
    condutor: null,
    g1: null,
    g2: null,
    g3: null,
    g4: null,
    cg: null,
  };

  const slotActiveVal = baseVtr.ativa !== false;
  let condutorUsed = false;
  let cgUsed = false;
  let gIndex = 0;

  for (const row of rows) {
    if (!row.fnId) continue;
    const roleCat = getFunctionRoleCategory(row.fnId, row.customName, availableFunctions);
    const foundFn = availableFunctions.find(f => f.id === row.fnId);
    const resolvedScaleName = row.fnId === '__CUSTOM__'
      ? row.customName.trim().toUpperCase()
      : (foundFn?.scaleName || '');

    if (roleCat === 'condutor' && !condutorUsed) {
      condutorUsed = true;
      nextSlots.condutor = slotActiveVal;
      nextBlocked.delete('condutor');
      if (row.fnId !== '__CUSTOM__') nextCustomFunctions.condutor = row.fnId;
      if (resolvedScaleName) nextCustomNames.condutor = resolvedScaleName;
    } else if (roleCat === 'chefe' && !cgUsed) {
      cgUsed = true;
      nextSlots.cg = slotActiveVal;
      nextBlocked.delete('cg');
      if (row.fnId !== '__CUSTOM__') nextCustomFunctions.cg = row.fnId;
      if (resolvedScaleName) nextCustomNames.cg = resolvedScaleName;
    } else {
      // Auxiliar / Marinheiro / Enfermeiro (até N vagas)
      if (gIndex < 4) {
        const qty = Math.max(1, Math.min(4 - gIndex, row.maxQty || 1));
        for (let k = 0; k < qty; k++) {
          const gSlot = (['g1', 'g2', 'g3', 'g4'] as const)[gIndex++];
          nextSlots[gSlot] = slotActiveVal;
          nextBlocked.delete(gSlot);
          if (row.fnId !== '__CUSTOM__') nextCustomFunctions[gSlot] = row.fnId;
          if (resolvedScaleName) nextCustomNames[gSlot] = resolvedScaleName;
        }
      } else if (!cgUsed) {
        cgUsed = true;
        nextSlots.cg = slotActiveVal;
        nextBlocked.delete('cg');
        if (row.fnId !== '__CUSTOM__') nextCustomFunctions.cg = row.fnId;
        if (resolvedScaleName) nextCustomNames.cg = resolvedScaleName;
      }
    }
  }

  return {
    ...baseVtr,
    ...nextSlots,
    blocked: Array.from(nextBlocked),
    customFunctions: nextCustomFunctions,
    customNames: nextCustomNames,
  };
}

export const OBM_DEFAULT_VIATURAS: Record<string, ViaturaConfig[]> = {
  '10º GBM': [
    { id: "ABT-143", vtr: "ABT-143", ativa: true, exibir: true, espaco: "1", obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: true, g3: true, g4: false, cg: true, blocked: [] },
    { id: "ABSL-152", vtr: "ABSL-152", ativa: true, exibir: true, espaco: "1", obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: true, g3: false, g4: false, cg: true, blocked: [] },
    { id: "ASE-572", vtr: "ASE-572", ativa: true, exibir: true, espaco: "1", obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
    { id: "AR-600", vtr: "AR-600", ativa: true, exibir: true, espaco: "1/2", obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: null, g2: null, g3: null, g4: null, cg: null, blocked: ["g1", "g2", "g3", "g4", "cg"] },
    { id: "ARC-162", vtr: "ARC-162", ativa: true, exibir: true, espaco: "1/2", obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: null, g3: null, g4: null, cg: null, blocked: ["g2", "g3", "g4", "cg"] },
    { id: "L-09", vtr: "L-09", ativa: true, exibir: true, espaco: "1/3", obm: "10º GBM", tipo: 'operacional', maritima: true, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
    { id: "BIA-006", vtr: "BIA-006", ativa: false, exibir: true, espaco: "1/3", obm: "10º GBM", tipo: 'operacional', maritima: true, condutor: false, g1: false, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
    { id: "BIA-013", vtr: "BIA-013", ativa: false, exibir: true, espaco: "1/3", obm: "10º GBM", tipo: 'operacional', maritima: true, condutor: false, g1: false, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
    { id: "ABT-12", vtr: "ABT-12", ativa: false, exibir: false, espaco: "1", obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: false, g1: false, g2: false, g3: false, g4: false, cg: false, blocked: [] },
  ],
  '1/10': [
    { id: "ABT-144", vtr: "ABT-144", ativa: true, exibir: true, espaco: "1", obm: "1/10", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: true, g3: true, g4: false, cg: true, blocked: [] },
    { id: "ABSL-153", vtr: "ABSL-153", ativa: true, exibir: true, espaco: "1", obm: "1/10", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: true, g3: false, g4: false, cg: true, blocked: [] },
    { id: "ASE-573", vtr: "ASE-573", ativa: true, exibir: true, espaco: "1", obm: "1/10", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
    { id: "AR-601", vtr: "AR-601", ativa: true, exibir: true, espaco: "1/2", obm: "1/10", tipo: 'operacional', maritima: false, condutor: true, g1: null, g2: null, g3: null, g4: null, cg: null, blocked: ["g1", "g2", "g3", "g4", "cg"] },
  ],
  '2/10': [
    { id: "L-10", vtr: "L-10", ativa: true, exibir: true, espaco: "1/3", obm: "2/10", tipo: 'operacional', maritima: true, condutor: true, g1: true, g2: true, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
    { id: "BIA-014", vtr: "BIA-014", ativa: true, exibir: true, espaco: "1/3", obm: "2/10", tipo: 'operacional', maritima: true, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
    { id: "AR-602", vtr: "AR-602", ativa: true, exibir: true, espaco: "1/2", obm: "2/10", tipo: 'operacional', maritima: false, condutor: true, g1: null, g2: null, g3: null, g4: null, cg: null, blocked: ["g1", "g2", "g3", "g4", "cg"] },
    { id: "ASE-574", vtr: "ASE-574", ativa: true, exibir: true, espaco: "1", obm: "2/10", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  ],
  '3/10': [
    { id: "ABT-145", vtr: "ABT-145", ativa: true, exibir: true, espaco: "1", obm: "3/10", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: true, g3: true, g4: false, cg: true, blocked: [] },
    { id: "ABSL-154", vtr: "ABSL-154", ativa: true, exibir: true, espaco: "1", obm: "3/10", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: true, g3: false, g4: false, cg: true, blocked: [] },
    { id: "ASE-575", vtr: "ASE-575", ativa: true, exibir: true, espaco: "1", obm: "3/10", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
    { id: "AR-603", vtr: "AR-603", ativa: true, exibir: true, espaco: "1/2", obm: "3/10", tipo: 'operacional', maritima: false, condutor: true, g1: null, g2: null, g3: null, g4: null, cg: null, blocked: ["g1", "g2", "g3", "g4", "cg"] },
  ],
  '4/10': [
    { id: "ABT-146", vtr: "ABT-146", ativa: true, exibir: true, espaco: "1", obm: "4/10", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: true, g3: true, g4: false, cg: true, blocked: [] },
    { id: "ABSL-155", vtr: "ABSL-155", ativa: true, exibir: true, espaco: "1", obm: "4/10", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: true, g3: false, g4: false, cg: true, blocked: [] },
    { id: "ASE-576", vtr: "ASE-576", ativa: true, exibir: true, espaco: "1", obm: "4/10", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
    { id: "AR-604", vtr: "AR-604", ativa: true, exibir: true, espaco: "1/2", obm: "4/10", tipo: 'operacional', maritima: false, condutor: true, g1: null, g2: null, g3: null, g4: null, cg: null, blocked: ["g1", "g2", "g3", "g4", "cg"] },
    { id: "L-11", vtr: "L-11", ativa: true, exibir: true, espaco: "1/3", obm: "4/10", tipo: 'operacional', maritima: true, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  ],
  '26º GBM': [
    { id: "ABT-147", vtr: "ABT-147", ativa: true, exibir: true, espaco: "1", obm: "26º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: true, g3: true, g4: false, cg: true, blocked: [] },
    { id: "ABSL-156", vtr: "ABSL-156", ativa: true, exibir: true, espaco: "1", obm: "26º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: true, g3: false, g4: false, cg: true, blocked: [] },
    { id: "ASE-577", vtr: "ASE-577", ativa: true, exibir: true, espaco: "1", obm: "26º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
    { id: "AR-605", vtr: "AR-605", ativa: true, exibir: true, espaco: "1/2", obm: "26º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: null, g2: null, g3: null, g4: null, cg: null, blocked: ["g1", "g2", "g3", "g4", "cg"] },
    { id: "L-12", vtr: "L-12", ativa: true, exibir: true, espaco: "1/3", obm: "26º GBM", tipo: 'operacional', maritima: true, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  ],
  '1/26': [
    { id: "ABT-148", vtr: "ABT-148", ativa: true, exibir: true, espaco: "1", obm: "1/26", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: true, g3: true, g4: false, cg: true, blocked: [] },
    { id: "ABSL-157", vtr: "ABSL-157", ativa: true, exibir: true, espaco: "1", obm: "1/26", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: true, g3: false, g4: false, cg: true, blocked: [] },
    { id: "ASE-578", vtr: "ASE-578", ativa: true, exibir: true, espaco: "1", obm: "1/26", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
    { id: "AR-606", vtr: "AR-606", ativa: true, exibir: true, espaco: "1/2", obm: "1/26", tipo: 'operacional', maritima: false, condutor: true, g1: null, g2: null, g3: null, g4: null, cg: null, blocked: ["g1", "g2", "g3", "g4", "cg"] },
  ]
};

export function getDefaultViaturasForObm(obm?: string): ViaturaConfig[] {
  const clean = normalizeObm(obm);
  const found = OBM_DEFAULT_VIATURAS[clean];
  if (found) {
    return JSON.parse(JSON.stringify(found));
  }
  return JSON.parse(JSON.stringify(OBM_DEFAULT_VIATURAS['10º GBM']));
}

export function isContaminatedFleet(fleet?: any[] | null, targetObm?: string): boolean {
  if (!fleet || !Array.isArray(fleet) || fleet.length === 0) return false;
  const clean = normalizeObm(targetObm);
  
  // Specific signature of 10º GBM flagship viaturas
  const SEDE_10_SIGNATURE = new Set(['ABT-143', 'ABSL-152', 'ARC-162', 'BIA-006', 'BIA-013', 'L-09', 'ASE-572', 'AR-600']);
  
  // If target OBM is NOT 10º GBM, but contains 2 or more 10º GBM signature vehicles, it is contaminated!
  if (clean !== '10º GBM') {
    const hits = fleet.filter(v => SEDE_10_SIGNATURE.has((v.id || v.vtr || '').toUpperCase())).length;
    if (hits >= 2) return true;
  }
  
  // If target OBM is 2/10 (insular/maritimo), but has heavy urban fire trucks (ABT/ABSL):
  if (clean === '2/10') {
    const hasIncompatible = fleet.some(v => {
      const id = (v.id || v.vtr || '').toUpperCase();
      return id.startsWith('ABT-') || id.startsWith('ABSL-');
    });
    if (hasIncompatible) return true;
  }

  // If target OBM is 26º GBM, but has 10º GBM vehicles:
  if (clean === '26º GBM') {
    const has10 = fleet.some(v => ['ABT-143', 'ABSL-152', 'ARC-162'].includes((v.id || v.vtr || '').toUpperCase()));
    if (has10) return true;
  }

  // If target OBM is 1/26, but has 26º GBM sede vehicles (ABT-147) or 10º GBM vehicles (ABT-143):
  if (clean === '1/26') {
    const hasForeign = fleet.some(v => ['ABT-143', 'ABT-147', 'ABSL-152', 'ABSL-156'].includes((v.id || v.vtr || '').toUpperCase()));
    if (hasForeign) return true;
  }

  return false;
}

export function sanitizeFleetForObm(fleet?: any[] | null, targetObm?: string): any[] {
  if (!fleet || !Array.isArray(fleet) || fleet.length === 0 || isContaminatedFleet(fleet, targetObm)) {
    return getDefaultViaturasForObm(targetObm);
  }
  return fleet;
}
