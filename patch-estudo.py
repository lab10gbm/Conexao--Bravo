import re

with open('src/components/EscalaEspelhoModule.tsx', 'r') as f:
    content = f.read()

# 1. Update dynamicRequirements
dynamic_logic = """
  const dynamicRequirements = useMemo(() => {
    let reqs: {name: string, req: number, category: string}[] = [
      { name: "ADJUNTO", req: roleQtds["ADJUNTO"] ?? 1, category: 'admin' },
      { name: "ENCARREGADO DE MOTORISTA", req: roleQtds["ENCARREGADO DE MOTORISTA"] ?? 1, category: 'admin' },
    ];
    
    const vtrReqs: Record<string, {req: number, category: string}> = {};
    viaturasInfo.forEach(v => {
      if (!v.ativa) return;
      ['condutor', 'g1', 'g2', 'g3', 'g4', 'cg'].forEach(slot => {
        if (v[slot as keyof typeof v] === true) {
          const roleName = v.customNames?.[slot]?.trim().toUpperCase() || getDefaultName(v, slot);
          let cat = 'auxiliar';
          if (slot === 'condutor') cat = 'condutor';
          else if (slot === 'cg') cat = 'chefe';
          
          if (!vtrReqs[roleName]) {
             vtrReqs[roleName] = { req: 0, category: cat };
          }
          vtrReqs[roleName].req += 1;
        }
      });
    });

    Object.entries(vtrReqs).forEach(([name, data]) => {
      reqs.push({ name, req: data.req, category: data.category });
    });

    reqs.push({ name: "AUXILIAR RANCHO", req: roleQtds["AUXILIAR RANCHO"] ?? 1, category: 'admin' });
    reqs.push({ name: "TOQUE DE FOGO", req: roleQtds["TOQUE DE FOGO"] ?? 1, category: 'admin' });
    reqs.push({ name: "DIA AO DEPOSITO", req: roleQtds["DIA AO DEPOSITO"] ?? 2, category: 'admin' });
    reqs.push({ name: "RESP FAXINA", req: roleQtds["RESP FAXINA"] ?? 1, category: 'admin' });
    reqs.push({ name: "ABASTECEDOR", req: roleQtds["ABASTECEDOR"] ?? 1, category: 'admin' });

    reqs.push({ name: "SGT DIA", req: roleQtds["SGT DIA"] ?? 1, category: 'admin' });
    reqs.push({ name: "CMT GUARDA", req: roleQtds["CMT GUARDA"] ?? 1, category: 'admin' });
    reqs.push({ name: "CB GUARDA", req: roleQtds["CB GUARDA"] ?? 1, category: 'admin' });
    reqs.push({ name: "CB DIA", req: roleQtds["CB DIA"] ?? 1, category: 'admin' });
    reqs.push({ name: "COMUNICANTE", req: roleQtds["COMUNICANTE"] ?? 2, category: 'admin' });
    reqs.push({ name: "ESCALANTE", req: roleQtds["ESCALANTE"] ?? 1, category: 'admin' });
    reqs.push({ name: "SENTINELA", req: roleQtds["SENTINELA"] ?? 4, category: 'admin' });

    return reqs;
"""

content = re.sub(
    r"const dynamicRequirements = useMemo\(\(\) => \{[\s\S]*?return reqs;\n  \}, \[viaturasInfo, roleQtds\]\);",
    dynamic_logic + "\n  }, [viaturasInfo, roleQtds]);",
    content
)

# 2. Update estudoTecnico
estudo_logic = """
  const estudoTecnico = useMemo(() => {
    const realRoster = baseRoster.map(m => {
       const isSwapped = permutasOut.has(m.rg || '');
       return isSwapped ? (militars.find(x => x.rg === permutasOut.get(m.rg || '')?.substituteRg) || m) : m;
    });

    const allSlots: {name: string, category: string}[] = [];
    dynamicRequirements.forEach(req => {
      for (let i = 0; i < req.req; i++) {
        allSlots.push({ name: req.name, category: req.category });
      }
    });

    const militarCapabilities = realRoster.map(m => ({
      rg: m.rg || '',
      allowed: getAllowedOptions(m) || [],
      used: false
    }));

    let unfulfilledCondutores = 0;
    let unfulfilledChefes = 0;
    let unfulfilledAuxiliares = 0;
    let unfulfilledAdmin = 0;
    let unfulfilledEfetivo = 0;

    let reqCondutores = 0;
    let reqChefes = 0;
    let reqAuxiliares = 0;
    let reqAdmin = 0;
    const reqEfetivo = allSlots.length;

    const slotOptionsCount = allSlots.map(slot => {
       const count = militarCapabilities.filter(m => m.allowed.includes(slot.name)).length;
       return { slot, count };
    });
    slotOptionsCount.sort((a, b) => a.count - b.count);

    const unfulfilledSlots: {name: string, category: string}[] = [];

    slotOptionsCount.forEach(({ slot }) => {
       if (slot.category === 'admin') reqAdmin++;
       else if (slot.category === 'condutor') reqCondutores++;
       else if (slot.category === 'chefe') reqChefes++;
       else reqAuxiliares++;

       const available = militarCapabilities.filter(m => !m.used && m.allowed.includes(slot.name));
       if (available.length > 0) {
          available.sort((a, b) => a.allowed.length - b.allowed.length);
          available[0].used = true;
       } else {
          unfulfilledSlots.push(slot);
       }
    });

    unfulfilledSlots.forEach(slot => {
       unfulfilledEfetivo++;
       if (slot.category === 'admin') unfulfilledAdmin++;
       else if (slot.category === 'condutor') unfulfilledCondutores++;
       else if (slot.category === 'chefe') unfulfilledChefes++;
       else unfulfilledAuxiliares++;
    });

    const calcChance = (deficit: number, req: number) => req > 0 ? Math.min(100, Math.round((deficit / req) * 100)) : 0;

    return {
      efetivo: { req: reqEfetivo, deficit: unfulfilledEfetivo, chance: calcChance(unfulfilledEfetivo, reqEfetivo) },
      condutores: { req: reqCondutores, deficit: unfulfilledCondutores, chance: calcChance(unfulfilledCondutores, reqCondutores) },
      chefes: { req: reqChefes, deficit: unfulfilledChefes, chance: calcChance(unfulfilledChefes, reqChefes) },
      auxiliares: { req: reqAuxiliares, deficit: unfulfilledAuxiliares, chance: calcChance(unfulfilledAuxiliares, reqAuxiliares) },
      admin: { req: reqAdmin, deficit: unfulfilledAdmin, chance: calcChance(unfulfilledAdmin, reqAdmin) }
    };
"""

content = re.sub(
    r"const estudoTecnico = useMemo\(\(\) => \{[\s\S]*?admin: \{ req: reqAdmin, deficit: unfulfilledAdmin, chance: calcChance\(unfulfilledAdmin, reqAdmin\) \}\n    \};",
    estudo_logic,
    content
)

# 3. Update tables in UI
content = re.sub(
    r"const adminNames = \[\n\s*\"ADJUNTO\", \"ENCARREGADO DE MOTORISTA\", \"AUXILIAR RANCHO\", \"TOQUE DE FOGO\",\n\s*\"DIA AO DEPOSITO\", \"RESP FAXINA\", \"ABASTECEDOR\", \"SGT DIA\", \"CMT GUARDA\",\n\s*\"CB GUARDA\", \"CB DIA\", \"COMUNICANTE\", \"ESCALANTE\", \"SENTINELA\"\n\s*\];\n\s*const isOperacional = !adminNames.includes\(f\.name\);",
    "const isOperacional = f.category !== 'admin';",
    content
)

content = re.sub(
    r"const adminNames = \[\n\s*\"ADJUNTO\", \"ENCARREGADO DE MOTORISTA\", \"AUXILIAR RANCHO\", \"TOQUE DE FOGO\",\n\s*\"DIA AO DEPOSITO\", \"RESP FAXINA\", \"ABASTECEDOR\", \"SGT DIA\", \"CMT GUARDA\",\n\s*\"CB GUARDA\", \"CB DIA\", \"COMUNICANTE\", \"ESCALANTE\", \"SENTINELA\"\n\s*\];\n\s*const isAdmin = adminNames.includes\(f\.name\);",
    "const isAdmin = f.category === 'admin';",
    content
)

with open('src/components/EscalaEspelhoModule.tsx', 'w') as f:
    f.write(content)

