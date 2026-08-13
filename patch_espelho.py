import re

with open("src/components/EscalaEspelhoModule.tsx", "r") as f:
    content = f.read()

# Define the old code to be replaced
old_code = """  const estudoTecnico = useMemo(() => {
    const realRoster = baseRoster.map(m => {
       const isSwapped = permutasOut.has(m.rg || '');
       return isSwapped ? (militars.find(x => x.rg === permutasOut.get(m.rg || '')?.substituteRg) || m) : m;
    });

    const allSlots: {name: string, genericName: string, category: string}[] = [];
    dynamicRequirements.forEach(req => {
      for (let i = 0; i < req.req; i++) {
        allSlots.push({ name: req.name, genericName: req.genericName, category: req.category });
      }
    });

    const militarCapabilities = realRoster.map(m => ({
      rg: m.rg || '',
      allowed: getAllowedOptions(m) || [],
      assignedRoles: [] as string[]
    }));

    let unfulfilledCondutores = 0;
    let unfulfilledCondutoresMaritimos = 0;
    let unfulfilledChefes = 0;
    let unfulfilledChefesMaritimos = 0;
    let unfulfilledAuxiliares = 0;
    let unfulfilledAuxiliaresMaritimos = 0;
    let unfulfilledAdmin = 0;
    let unfulfilledEfetivo = 0;

    let reqCondutores = 0;
    let reqCondutoresMaritimos = 0;
    let reqChefes = 0;
    let reqChefesMaritimos = 0;
    let reqAuxiliares = 0;
    let reqAuxiliaresMaritimos = 0;
    let reqAdmin = 0;
    const reqEfetivo = allSlots.length;

    const slotOptionsCount = allSlots.map(slot => {
       const count = militarCapabilities.filter(m => m.allowed.includes(slot.genericName)).length;
       return { slot, count };
    });
    slotOptionsCount.sort((a, b) => a.count - b.count);

    const unfulfilledSlots: {name: string, category: string}[] = [];

    slotOptionsCount.forEach(({ slot }) => {
       if (slot.category === 'admin') reqAdmin++;
       else if (slot.category === 'condutor') reqCondutores++;
       else if (slot.category === 'condutor_maritimo') reqCondutoresMaritimos++;
       else if (slot.category === 'chefe') reqChefes++;
       else if (slot.category === 'chefe_maritimo') reqChefesMaritimos++;
       else if (slot.category === 'auxiliar') reqAuxiliares++;
       else if (slot.category === 'auxiliar_maritimo') reqAuxiliaresMaritimos++;

       const available = militarCapabilities.filter(m => { if (!m.allowed.includes(slot.genericName)) return false; if (m.assignedRoles.includes(slot.genericName)) return false; for (const role of m.assignedRoles) { const val1 = correlation[slot.genericName]?.[role] ?? 0; const val2 = correlation[role]?.[slot.genericName] ?? 0; if (val1 === 0 || val2 === 0) return false; } return true; });
       if (available.length > 0) { available[0].assignedRoles.push(slot.genericName);
          available.sort((a, b) => a.allowed.length - b.allowed.length);
          
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

    let unfulfilledOperacional = unfulfilledCondutores + unfulfilledCondutoresMaritimos + unfulfilledChefes + unfulfilledChefesMaritimos + unfulfilledAuxiliares + unfulfilledAuxiliaresMaritimos;
    let reqOperacional = reqCondutores + reqCondutoresMaritimos + reqChefes + reqChefesMaritimos + reqAuxiliares + reqAuxiliaresMaritimos;

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

  }, [baseRoster, permutasOut, militars, dynamicRequirements, correlation]);"""

new_code = """  const estudoTecnico = useMemo(() => {
    let unfulfilledCondutores = 0;
    let unfulfilledCondutoresMaritimos = 0;
    let unfulfilledChefes = 0;
    let unfulfilledChefesMaritimos = 0;
    let unfulfilledAuxiliares = 0;
    let unfulfilledAuxiliaresMaritimos = 0;
    let unfulfilledAdmin = 0;
    let unfulfilledEfetivo = 0;

    let reqCondutores = 0;
    let reqCondutoresMaritimos = 0;
    let reqChefes = 0;
    let reqChefesMaritimos = 0;
    let reqAuxiliares = 0;
    let reqAuxiliaresMaritimos = 0;
    let reqAdmin = 0;
    let reqEfetivo = 0;

    dynamicRequirements.forEach(req => {
      const assignedCount = selectedFunctions[req.name]?.length || 0;
      const deficit = Math.max(0, req.req - assignedCount);
      
      reqEfetivo += req.req;
      unfulfilledEfetivo += deficit;

      if (req.category === 'admin') {
         reqAdmin += req.req;
         unfulfilledAdmin += deficit;
      } else if (req.category === 'condutor') {
         reqCondutores += req.req;
         unfulfilledCondutores += deficit;
      } else if (req.category === 'condutor_maritimo') {
         reqCondutoresMaritimos += req.req;
         unfulfilledCondutoresMaritimos += deficit;
      } else if (req.category === 'chefe') {
         reqChefes += req.req;
         unfulfilledChefes += deficit;
      } else if (req.category === 'chefe_maritimo') {
         reqChefesMaritimos += req.req;
         unfulfilledChefesMaritimos += deficit;
      } else if (req.category === 'auxiliar') {
         reqAuxiliares += req.req;
         unfulfilledAuxiliares += deficit;
      } else if (req.category === 'auxiliar_maritimo') {
         reqAuxiliaresMaritimos += req.req;
         unfulfilledAuxiliaresMaritimos += deficit;
      }
    });

    const calcChance = (deficit: number, req: number) => req > 0 ? Math.min(100, Math.round((deficit / req) * 100)) : 0;

    let unfulfilledOperacional = unfulfilledCondutores + unfulfilledCondutoresMaritimos + unfulfilledChefes + unfulfilledChefesMaritimos + unfulfilledAuxiliares + unfulfilledAuxiliaresMaritimos;
    let reqOperacional = reqCondutores + reqCondutoresMaritimos + reqChefes + reqChefesMaritimos + reqAuxiliares + reqAuxiliaresMaritimos;

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

  }, [dynamicRequirements, selectedFunctions]);"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open("src/components/EscalaEspelhoModule.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Old code not found. Trying flexible replacement.")
