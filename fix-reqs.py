import re

with open('src/components/EscalaEspelhoModule.tsx', 'r') as f:
    content = f.read()

content = content.replace("const dynamicRequirements = useMemo(() => {\nconst vtrReqs", "const dynamicRequirements = useMemo(() => {\n    let reqs: {name: string, req: number}[] = [];\n    const vtrReqs")

with open('src/components/EscalaEspelhoModule.tsx', 'w') as f:
    f.write(content)
