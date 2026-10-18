import { normalizeFnName, isMaritima, getDefaultName, getSlotDisplayName } from './escalaCalculos';
import { SelectableControlFunction } from '../../../components/ControleCategoriasModal';

export interface DynamicRequirement {
  name: string;
  genericName: string;
  req: number;
  baseReq: number;
  active: boolean;
  category: string;
  vtrsActive?: string[];
  vtrsAll?: string[];
}

export function calculateDynamicRequirements(
  viaturasInfo: any[],
  roleQtds: Record<string, number>,
  adminRolesVisibility: Record<string, boolean>,
  availableControlFunctions: SelectableControlFunction[] = []
): DynamicRequirement[] {
  const makeAdminReq = (name: string, defaultReq: number) => {
    const baseReq = roleQtds[name] ?? defaultReq;
    const norm = normalizeFnName(name);
    const active = adminRolesVisibility[norm] !== false && adminRolesVisibility[name] !== false;
    return {
      name,
      genericName: name,
      req: active ? baseReq : 0,
      baseReq,
      active,
      category: 'admin',
    };
  };

  const reqs: DynamicRequirement[] = [
    makeAdminReq("ADJUNTO", 1),
    makeAdminReq("ENCARREGADO DE MOTORISTA", 1),
  ];

  const vtrReqs: Record<string, {
    req: number;
    baseReq: number;
    category: string;
    genericName: string;
    vtrsActive: Set<string>;
    vtrsAll: Set<string>;
  }> = {};

  viaturasInfo.forEach(v => {
    (['condutor', 'g1', 'g2', 'g3', 'g4', 'cg'] as const).forEach(slot => {
      if (v.blocked?.includes(slot)) return;
      const roleName = getSlotDisplayName(v, slot, availableControlFunctions);
      let cat = 'auxiliar';
      const isMar = isMaritima(v);
      if (slot === 'condutor') cat = isMar ? 'condutor_maritimo' : 'condutor';
      else if (slot === 'cg') cat = isMar ? 'chefe_maritimo' : 'chefe';
      else cat = isMar ? 'auxiliar_maritimo' : 'auxiliar';

      const genericName = getDefaultName(v, slot);
      if (!vtrReqs[roleName]) {
        vtrReqs[roleName] = {
          req: 0,
          baseReq: 0,
          category: cat,
          genericName,
          vtrsActive: new Set<string>(),
          vtrsAll: new Set<string>(),
        };
      }
      vtrReqs[roleName].baseReq += 1;
      if (v.vtr) vtrReqs[roleName].vtrsAll.add(v.vtr);

      if (v.ativa && v[slot as keyof typeof v] === true) {
        vtrReqs[roleName].req += 1;
        if (v.vtr) vtrReqs[roleName].vtrsActive.add(v.vtr);
      }
    });
  });

  Object.entries(vtrReqs).forEach(([name, data]) => {
    reqs.push({
      name,
      genericName: data.genericName,
      req: data.req,
      baseReq: data.baseReq,
      active: data.req > 0,
      category: data.category,
      vtrsActive: Array.from(data.vtrsActive),
      vtrsAll: Array.from(data.vtrsAll),
    });
  });

  reqs.push(makeAdminReq("AUXILIAR RANCHO", 1));
  reqs.push(makeAdminReq("TOQUE DE FOGO", 1));
  reqs.push(makeAdminReq("DIA AO DEPOSITO", 2));
  reqs.push(makeAdminReq("RESP FAXINA", 1));
  reqs.push(makeAdminReq("ABASTECEDOR", 1));

  reqs.push(makeAdminReq("SGT DIA", 1));
  reqs.push(makeAdminReq("CMT GUARDA", 1));
  reqs.push(makeAdminReq("CB GUARDA", 1));
  reqs.push(makeAdminReq("CB DIA", 1));
  reqs.push(makeAdminReq("COMUNICANTE", 2));
  reqs.push(makeAdminReq("ESCALANTE", 1));

  return reqs;
}

export function calculateEstudoTecnico(
  baseRoster: any[],
  permutasOut: Map<string, any>,
  militars: any[],
  dynamicRequirements: DynamicRequirement[],
  correlation: Record<string, Record<string, number>>,
  getAllowedOptions: (militar: any) => string[] | undefined
) {
  const realRoster = baseRoster.map(m => {
    const isSwapped = permutasOut.has(m.rg || '');
    return isSwapped ? (militars.find(x => x.rg === permutasOut.get(m.rg || '')?.substituteRg) || m) : m;
  });

  const allSlots: { name: string; genericName: string; category: string }[] = [];
  dynamicRequirements.forEach(req => {
    for (let i = 0; i < req.req; i++) {
      allSlots.push({ name: req.name, genericName: req.genericName, category: req.category });
    }
  });

  const militarCapabilities = realRoster.map(m => ({
    rg: m.rg || '',
    rank: m.rank || '',
    allowed: getAllowedOptions(m) || [],
    assignedRoles: [] as string[]
  }));

  const slotOptionsCount = allSlots.map(slot => {
    const count = militarCapabilities.filter(m => m.allowed.includes(slot.name) || m.allowed.includes(slot.genericName)).length;
    return { slot, count };
  });

  slotOptionsCount.sort((a, b) => {
    const aIsAdmin = a.slot.category === 'admin';
    const bIsAdmin = b.slot.category === 'admin';
    if (aIsAdmin && !bIsAdmin) return 1;
    if (!aIsAdmin && bIsAdmin) return -1;
    return a.count - b.count;
  });

  const unfulfilledSlots: { name: string; category: string }[] = [];
  
  let reqCondutores = 0, reqCondutoresMaritimos = 0, reqChefes = 0, reqChefesMaritimos = 0, reqAuxiliares = 0, reqAuxiliaresMaritimos = 0, reqAdmin = 0;
  let unfulfilledCondutores = 0, unfulfilledCondutoresMaritimos = 0, unfulfilledChefes = 0, unfulfilledChefesMaritimos = 0, unfulfilledAuxiliares = 0, unfulfilledAuxiliaresMaritimos = 0, unfulfilledAdmin = 0;
  const reqEfetivo = allSlots.length;
  let unfulfilledEfetivo = 0;

  slotOptionsCount.forEach(({ slot }) => {
    if (slot.category === 'admin') reqAdmin++;
    else if (slot.category === 'condutor') reqCondutores++;
    else if (slot.category === 'condutor_maritimo') reqCondutoresMaritimos++;
    else if (slot.category === 'chefe') reqChefes++;
    else if (slot.category === 'chefe_maritimo') reqChefesMaritimos++;
    else if (slot.category === 'auxiliar') reqAuxiliares++;
    else if (slot.category === 'auxiliar_maritimo') reqAuxiliaresMaritimos++;

    const available = militarCapabilities.filter(m => { 
      if (!m.allowed.includes(slot.name) && !m.allowed.includes(slot.genericName)) return false; 
      if (m.assignedRoles.includes(slot.genericName)) return false; 
      for (const role of m.assignedRoles) { 
        const isSentinelaAux = (
          (slot.genericName === 'SENTINELA' && ['AUXILIAR ABT', 'AUXILIAR ABSL', 'AUXILIAR/CHEFE ARC'].includes(role)) ||
          (role === 'SENTINELA' && ['AUXILIAR ABT', 'AUXILIAR ABSL', 'AUXILIAR/CHEFE ARC'].includes(slot.genericName))
        );
        
        if (isSentinelaAux) {
          const arcRole = slot.genericName === 'AUXILIAR/CHEFE ARC' || role === 'AUXILIAR/CHEFE ARC';
          if (arcRole) {
            if (m.rank === 'Soldado') continue;
          } else {
            continue;
          }
        }

        const val1 = correlation[slot.genericName]?.[role] ?? 0; 
        const val2 = correlation[role]?.[slot.genericName] ?? 0; 
        if (val1 === 0 || val2 === 0) return false; 
      } 
      return true; 
    });

    if (available.length > 0) { 
      available.sort((a, b) => {
        if (a.allowed.length !== b.allowed.length) return a.allowed.length - b.allowed.length;
        return a.assignedRoles.length - b.assignedRoles.length;
      });
      available[0].assignedRoles.push(slot.genericName);
    } else {
      unfulfilledSlots.push(slot);
    }
  });

  unfulfilledSlots.forEach(slot => {
    unfulfilledEfetivo++;
    if (slot.category === 'admin') unfulfilledAdmin++;
    else if (slot.category === 'condutor') unfulfilledCondutores++;
    else if (slot.category === 'condutor_maritimo') unfulfilledCondutoresMaritimos++;
    else if (slot.category === 'chefe') unfulfilledChefes++;
    else if (slot.category === 'chefe_maritimo') unfulfilledChefesMaritimos++;
    else if (slot.category === 'auxiliar') unfulfilledAuxiliares++;
    else if (slot.category === 'auxiliar_maritimo') unfulfilledAuxiliaresMaritimos++;
  });

  const calcChance = (deficit: number, req: number) => req > 0 ? Math.min(100, Math.round((deficit / req) * 100)) : 0;

  const unfulfilledOperacional = unfulfilledCondutores + unfulfilledCondutoresMaritimos + unfulfilledChefes + unfulfilledChefesMaritimos + unfulfilledAuxiliares + unfulfilledAuxiliaresMaritimos;
  const reqOperacional = reqCondutores + reqCondutoresMaritimos + reqChefes + reqChefesMaritimos + reqAuxiliares + reqAuxiliaresMaritimos;

  return {
    efetivoOperacional: { req: reqOperacional, deficit: unfulfilledOperacional, chance: calcChance(unfulfilledOperacional, reqOperacional) },
    efetivoAdministrativo: { req: reqAdmin, deficit: unfulfilledAdmin, chance: calcChance(unfulfilledAdmin, reqAdmin) },
    efetivo: { req: reqEfetivo, deficit: unfulfilledEfetivo, chance: calcChance(unfulfilledEfetivo, reqEfetivo) },
    condutores: { req: reqCondutores, deficit: unfulfilledCondutores, chance: calcChance(unfulfilledCondutores, reqCondutores) },
    condutores_maritimos: { req: reqCondutoresMaritimos, deficit: unfulfilledCondutoresMaritimos, chance: calcChance(unfulfilledCondutoresMaritimos, reqCondutoresMaritimos) },
    chefes: { req: reqChefes, deficit: unfulfilledChefes, chance: calcChance(unfulfilledChefes, reqChefes) },
    chefes_maritimos: { req: reqChefesMaritimos, deficit: unfulfilledChefesMaritimos, chance: calcChance(unfulfilledChefesMaritimos, reqChefesMaritimos) },
    auxiliares: { req: reqAuxiliares, deficit: unfulfilledAuxiliares, chance: calcChance(unfulfilledAuxiliares, reqAuxiliares) },
    auxiliares_maritimos: { req: reqAuxiliaresMaritimos, deficit: unfulfilledAuxiliaresMaritimos, chance: calcChance(unfulfilledAuxiliaresMaritimos, reqAuxiliaresMaritimos) },
    admin: { req: reqAdmin, deficit: unfulfilledAdmin, chance: calcChance(unfulfilledAdmin, reqAdmin) }
  };
}
