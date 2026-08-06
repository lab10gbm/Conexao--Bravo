import re

with open('src/components/ControleViaturasModule.tsx', 'r') as f:
    content = f.read()

content = re.sub(r"\s*const saveEdit = \(id: string\) => \{[\s\S]*?setEditingId\(null\);\s*\};", "", content)

with open('src/components/ControleViaturasModule.tsx', 'w') as f:
    f.write(content)
