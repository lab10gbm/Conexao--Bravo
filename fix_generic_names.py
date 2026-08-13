import re

files_to_fix = [
    'src/components/EscalaEspelhoModule.tsx',
    'src/components/EstudoTecnicoGuarnicoesModule.tsx'
]

replacement = """  const getDefaultName = (v: any, slot: string) => {
    const isMar = isMaritima(v);
    const prefix = v.vtr ? v.vtr.split('-')[0].trim().toUpperCase() : '';

    if (slot === 'condutor') {
       if (isMar) return 'CONDUTOR MARITIMO';
       if (prefix === 'ABT') return 'CONDUTOR ABT';
       if (prefix === 'ABSL') return 'CONDUTOR ABSL';
       if (prefix === 'AR') return 'CONDUTOR AR';
       if (prefix === 'ASE') return 'CONDUTOR ASE';
       if (prefix === 'ARC') return 'CONDUTOR ARC';
       return 'CONDUTOR';
    }
    if (slot === 'cg') {
       if (isMar) return 'CHEFE GUA MARITIMA';
       if (prefix === 'ABT') return 'CHEFE ABT';
       if (prefix === 'ABSL') return 'CHEFE ABSL';
       if (prefix === 'ARC') return 'AUXILIAR/CHEFE ARC';
       return 'CHEFE GUA';
    }
    
    return isMar ? 'AUXILIAR MARITIMO' : 'AUXILIAR GUA';
  };"""

for filepath in files_to_fix:
    with open(filepath, 'r') as f:
        content = f.read()

    # Find the old getDefaultName function
    pattern = re.compile(r"  const getDefaultName = \(v: any, slot: string\) => \{.*?return isMar \? 'AUXILIAR MARITIMO' : 'AUXILIAR GUA';\n  \};", re.DOTALL)
    
    if not pattern.search(content):
        print(f"Could not find getDefaultName in {filepath}")
    else:
        new_content = pattern.sub(replacement, content)
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")
