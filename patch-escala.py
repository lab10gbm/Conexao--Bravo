import re

with open('src/components/EscalaEspelhoModule.tsx', 'r') as f:
    content = f.read()

# Replace the dynamicRequirements logic inside EscalaEspelhoModule
old_logic = r"const countCondutor = \(prefix: string\).*?reqs\.push\(\{ name: \"SENTINELA\", req: roleQtds\[\"SENTINELA\"\] \?\? 4 \}\);"

new_logic = """
    const isVtrType = (vtrName: string, prefix: string) => {
      const name = (vtrName || "").trim().toUpperCase();
      const p = prefix.trim().toUpperCase();
      if (p === 'AR-' || p === 'AR') return (name.startsWith('AR-') || name.startsWith('AR ') || name === 'AR') && !name.startsWith('ARC');
      if (p === 'L-' || p === 'L') return name.startsWith('L-') || name.startsWith('L ') || name === 'L';
      if (p === 'BIA-' || p === 'BIA') return name.startsWith('BIA');
      return name.startsWith(p) || name.includes(p);
    };

    const isMaritima = (v: any) => {
      if (v.maritima !== undefined) return v.maritima;
      return isVtrType(v.vtr, "L-") || isVtrType(v.vtr, "BIA-");
    };

    const getDefaultName = (v: any, slot: string) => {
      const vtrName = v.vtr.toUpperCase();
      const maritima = isMaritima(v);
      
      if (slot === 'condutor') {
        if (maritima) return vtrName.startsWith('BIA') ? 'MESTRE BIA' : 'MESTRE AL';
        if (isVtrType(vtrName, 'AR')) return 'CONDUTOR AR';
        if (isVtrType(vtrName, 'ABSL')) return 'CONDUTOR ABSL';
        if (isVtrType(vtrName, 'ABT')) return 'CONDUTOR ABT';
        if (isVtrType(vtrName, 'ASE')) return 'CONDUTOR ASE';
        if (isVtrType(vtrName, 'ARC')) return 'CONDUTOR ARC';
        return 'CONDUTOR';
      }
      if (slot === 'cg') {
        if (isVtrType(vtrName, 'ABSL')) return 'CHEFE ABSL';
        if (isVtrType(vtrName, 'ABT')) return 'CHEFE ABT';
        if (isVtrType(vtrName, 'ARC')) return 'AUXILIAR / CHEFE ARC';
        return 'CHEFE GUA';
      }
      // Auxiliares (g1, g2, g3, g4)
      if (maritima) return 'MARINHEIRO';
      if (isVtrType(vtrName, 'ARC')) return 'AUXILIAR / CHEFE ARC';
      if (isVtrType(vtrName, 'ABT')) return 'AUXILIAR ABT';
      if (isVtrType(vtrName, 'ABSL')) return 'AUXILIAR ABSL';
      if (isVtrType(vtrName, 'ASE')) return 'ENFERMEIRO';
      return 'AUXILIAR GUA';
    };

    const vtrReqs: Record<string, number> = {};
    viaturasInfo.forEach(v => {
      if (!v.ativa) return;
      ['condutor', 'g1', 'g2', 'g3', 'g4', 'cg'].forEach(slot => {
        if (v[slot as keyof typeof v] === true) {
          const roleName = v.customNames?.[slot]?.trim().toUpperCase() || getDefaultName(v, slot);
          vtrReqs[roleName] = (vtrReqs[roleName] || 0) + 1;
        }
      });
    });

    Object.entries(vtrReqs).forEach(([name, req]) => {
      reqs.push({ name, req });
    });

    reqs.push({ name: "AUXILIAR RANCHO", req: roleQtds["AUXILIAR RANCHO"] ?? 1 });
    reqs.push({ name: "TOQUE DE FOGO", req: roleQtds["TOQUE DE FOGO"] ?? 1 });
    reqs.push({ name: "DIA AO DEPOSITO", req: roleQtds["DIA AO DEPOSITO"] ?? 2 });
    reqs.push({ name: "RESP FAXINA", req: roleQtds["RESP FAXINA"] ?? 1 });
    reqs.push({ name: "ABASTECEDOR", req: roleQtds["ABASTECEDOR"] ?? 1 });

    reqs.push({ name: "SGT DIA", req: roleQtds["SGT DIA"] ?? 1 });
    reqs.push({ name: "CMT GUARDA", req: roleQtds["CMT GUARDA"] ?? 1 });
    reqs.push({ name: "CB GUARDA", req: roleQtds["CB GUARDA"] ?? 1 });
    reqs.push({ name: "CB DIA", req: roleQtds["CB DIA"] ?? 1 });
    reqs.push({ name: "COMUNICANTE", req: roleQtds["COMUNICANTE"] ?? 2 });
    reqs.push({ name: "ESCALANTE", req: roleQtds["ESCALANTE"] ?? 1 });
    reqs.push({ name: "SENTINELA", req: roleQtds["SENTINELA"] ?? 4 });
"""

# Find the block and replace
content = re.sub(r"const countCondutor = \(prefix: string\).*?reqs\.push\(\{ name: \"SENTINELA\", req: roleQtds\[\"SENTINELA\"\] \?\? 4 \}\);", new_logic, content, flags=re.DOTALL)

with open('src/components/EscalaEspelhoModule.tsx', 'w') as f:
    f.write(content)
