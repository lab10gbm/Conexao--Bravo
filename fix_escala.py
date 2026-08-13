import re
filepath = 'src/components/EscalaEspelhoModule.tsx'
with open(filepath, 'r') as f:
    content = f.read()

pattern = re.compile(r"    // Auxiliares \(g1, g2, g3, g4\).*?return 'AUXILIAR GUA';\n  };", re.DOTALL)
replacement = """    // Auxiliares (g1, g2, g3, g4)
    if (maritima) return vtrName.startsWith('BIA') ? 'MARINHEIRO BIA' : 'MARINHEIRO L';
    return 'AUXILIAR GUA';
  };"""

if not pattern.search(content):
    print("Not found")
else:
    new_content = pattern.sub(replacement, content)
    with open(filepath, 'w') as f:
        f.write(new_content)
    print("Updated")
