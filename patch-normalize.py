import re

with open('src/components/EscalaEspelhoModule.tsx', 'r') as f:
    content = f.read()

# Add normalize function at the top
normalize_func = """
const normalizeFnName = (s: string) => {
  if (!s) return "";
  return s.replace(/\\s*\\/\\s*/g, '/').replace(/\\s+/g, ' ').trim().toUpperCase();
};
"""

if "normalizeFnName" not in content:
    content = content.replace("function FuncoesMultiSelect({", normalize_func + "\nfunction FuncoesMultiSelect({")

# Replace currentCount calculations
content = content.replace(
    "const currentCount = Object.values(newSelected).flat().filter(f => f === req.name).length;",
    "const currentCount = Object.values(newSelected).flat().filter(f => normalizeFnName(f) === normalizeFnName(req.name)).length;"
)

content = content.replace(
    "const currentCount = Object.values(selectedFunctions).flat().filter((v) => v === f.name).length;",
    "const currentCount = Object.values(selectedFunctions).flat().filter((v) => normalizeFnName(v) === normalizeFnName(f.name)).length;"
)

# Also fix the text in EscalaEspelhoModule
content = content.replace("'AUXILIAR / CHEFE ARC'", "'AUXILIAR/CHEFE ARC'")

with open('src/components/EscalaEspelhoModule.tsx', 'w') as f:
    f.write(content)

