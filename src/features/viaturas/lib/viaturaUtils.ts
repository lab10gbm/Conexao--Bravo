import { ViaturaConfig, VtrModalFunctionRow } from '../types';

export { cleanUndefined } from '../../../lib/utils';

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
