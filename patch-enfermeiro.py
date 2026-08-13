import re

with open('src/components/EscalaEspelhoModule.tsx', 'r') as f:
    content = f.read()

new_get_slot = """  const getSlotDisplayName = (v: any, slot: string) => {
    if (v.customNames?.[slot]?.trim()) {
      const custom = v.customNames[slot].trim().toUpperCase();
      const sigla = (v.vtr || "").split('-')[0].trim();
      if (custom === 'ENFERMEIRO') return 'ENFERMEIRO';
      if (custom === 'AUXILIAR/CHEFE ARC' || custom === 'AUXILIAR / CHEFE ARC') return 'AUXILIAR/CHEFE ARC';
      if (custom === 'MESTRE L' || custom === 'MESTRE BIA') return custom;
      if (custom.endsWith(sigla)) return custom;
      if (slot === 'cg' && custom === 'CHEFE') return `CHEFE ${sigla}`;
      return `${custom} ${sigla}`.trim();
    }
    return getDefaultName(v, slot);
  };"""

content = re.sub(
    r"  const getSlotDisplayName = \(v: any, slot: string\) => \{.*?return getDefaultName\(v, slot\);\n  \};",
    new_get_slot,
    content,
    flags=re.DOTALL
)

with open('src/components/EscalaEspelhoModule.tsx', 'w') as f:
    f.write(content)
