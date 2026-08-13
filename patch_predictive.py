import re

def patch_file(filepath):
    with open(filepath, "r") as f:
        content = f.read()

    # We need to find the useMemo block for estudoTecnico / alasStats and replace it.
    
    if "EscalaEspelhoModule" in filepath:
        # Search for `const estudoTecnico = useMemo(() => {` up to `}, [dynamicRequirements, selectedFunctions]);` or similar
        # Since I just replaced it with `patch_espelho.py`, I will match that new block and replace it with the advanced predictive block.
        old_pattern = r"const estudoTecnico = useMemo\(\(\) => \{.*?\}, \[dynamicRequirements, selectedFunctions\]\);"
        
        new_block = """const estudoTecnico = useMemo(() => {
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

    const slotOptionsCount = allSlots.map(slot => {
       const count = militarCapabilities.filter(m => m.allowed.includes(slot.genericName)).length;
       return { slot, count };
    });

    // Sort strategy for predictive assignment:
    // 1. Priority to Operational over Admin
    // 2. Fewest capable militars first (fill hardest slots first)
    slotOptionsCount.sort((a, b) => {
       const aIsAdmin = a.slot.category === 'admin';
       const bIsAdmin = b.slot.category === 'admin';
       if (aIsAdmin && !bIsAdmin) return 1;
       if (!aIsAdmin && bIsAdmin) return -1;
       return a.count - b.count;
    });

    const unfulfilledSlots: {name: string, category: string}[] = [];
    
    let reqCondutores = 0, reqCondutoresMaritimos = 0, reqChefes = 0, reqChefesMaritimos = 0, reqAuxiliares = 0, reqAuxiliaresMaritimos = 0, reqAdmin = 0;
    let unfulfilledCondutores = 0, unfulfilledCondutoresMaritimos = 0, unfulfilledChefes = 0, unfulfilledChefesMaritimos = 0, unfulfilledAuxiliares = 0, unfulfilledAuxiliaresMaritimos = 0, unfulfilledAdmin = 0;
    let reqEfetivo = allSlots.length;
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
          if (!m.allowed.includes(slot.genericName)) return false; 
          if (m.assignedRoles.includes(slot.genericName)) return false; 
          for (const role of m.assignedRoles) { 
             const val1 = correlation[slot.genericName]?.[role] ?? 0; 
             const val2 = correlation[role]?.[slot.genericName] ?? 0; 
             if (val1 === 0 || val2 === 0) return false; 
          } 
          return true; 
       });

       if (available.length > 0) { 
          // Advanced Selection: Pick the most specialized militar available (fewest total allowed roles)
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
        
        content = re.sub(old_pattern, new_block, content, flags=re.DOTALL)
        
    else:
        # EstudoTecnicoGuarnicoesModule.tsx
        old_pattern = r"const slotOptionsCount = allSlots\.map\(slot => \{.*?\}\);\s*slotOptionsCount\.sort\(\(a, b\) => a\.count - b\.count\);"
        new_block = """const slotOptionsCount = allSlots.map(slot => {
         const count = militarCapabilities.filter(m => m.allowed.includes(slot.genericName)).length;
         return { slot, count };
       });

       slotOptionsCount.sort((a, b) => {
         const aIsAdmin = a.slot.category === 'admin';
         const bIsAdmin = b.slot.category === 'admin';
         if (aIsAdmin && !bIsAdmin) return 1;
         if (!aIsAdmin && bIsAdmin) return -1;
         return a.count - b.count;
       });"""
       
        content = re.sub(old_pattern, new_block, content, flags=re.DOTALL)
        
        # Now fix the available.sort bug in EstudoTecnicoGuarnicoesModule.tsx
        old_avail = r"if \(available\.length > 0\) \{\s*available\.sort\(\(a, b\) => a\.allowed\.length - b\.allowed\.length\);\s*available\[0\]\.assignedRoles\.push\(slot\.genericName\);\s*\}"
        new_avail = """if (available.length > 0) {
             available.sort((a, b) => {
                 if (a.allowed.length !== b.allowed.length) return a.allowed.length - b.allowed.length;
                 return a.assignedRoles.length - b.assignedRoles.length;
             });
             available[0].assignedRoles.push(slot.genericName);
          }"""
          
        content = re.sub(old_avail, new_avail, content, flags=re.DOTALL)

    with open(filepath, "w") as f:
        f.write(content)
    print(f"Patched {filepath}")

patch_file("src/components/EscalaEspelhoModule.tsx")
patch_file("src/components/EstudoTecnicoGuarnicoesModule.tsx")
