import re

with open('src/components/EscalaEspelhoModule.tsx', 'r') as f:
    content = f.read()

# I need to insert getDefaultName BEFORE getAllowedOptions so it can be used by it.
# Actually, I can just define getDefaultName higher up in the component or file.
# Let's move getDefaultName out of dynamicRequirements to the component level, right after viaturasInfo state.

get_default_logic = """
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
    const vtrName = (v.vtr || "").toUpperCase();
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
"""

content = re.sub(r"const dynamicRequirements = useMemo\(\(\) => \{.*?(const vtrReqs.*?)\}", 
                 r"const dynamicRequirements = useMemo(() => {\n\1}", 
                 content, flags=re.DOTALL)

# Insert the functions above dynamicRequirements
content = content.replace("const dynamicRequirements = useMemo(() => {", get_default_logic + "\n  const dynamicRequirements = useMemo(() => {")

# Now modify getAllowedOptions
# Find: return Array.from(allowed);
# Replace with the logic
allow_patch = """
    const allowedArr = Array.from(allowed);
    viaturasInfo.forEach(v => {
      if (!v.ativa) return;
      ['condutor', 'g1', 'g2', 'g3', 'g4', 'cg'].forEach(slot => {
         const customName = v.customNames?.[slot]?.trim().toUpperCase();
         if (customName) {
            const baseName = getDefaultName(v, slot);
            if (allowedArr.includes(baseName)) {
               allowed.add(customName);
            }
         }
      });
    });
    return Array.from(allowed);
"""

content = re.sub(r"return Array\.from\(allowed\);\n  };", allow_patch + "\n  };", content)

with open('src/components/EscalaEspelhoModule.tsx', 'w') as f:
    f.write(content)
