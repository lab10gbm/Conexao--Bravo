import re

with open('src/components/EscalaEspelhoModule.tsx', 'r') as f:
    content = f.read()

# Add reqs init
content = content.replace(
"""  const dynamicRequirements = useMemo(() => {
    const isVtrType = (vtrName: string, prefix: string) => {""",
"""  const dynamicRequirements = useMemo(() => {
    let reqs: {name: string, req: number}[] = [
      { name: "ADJUNTO", req: roleQtds["ADJUNTO"] ?? 1 },
      { name: "ENCARREGADO DE MOTORISTA", req: roleQtds["ENCARREGADO DE MOTORISTA"] ?? 1 },
    ];
    const isVtrType = (vtrName: string, prefix: string) => {""")

# Fix viaturasInfo typing
content = content.replace("const [viaturasInfo, setViaturasInfo] = useState(DEFAULT_VIATURAS);",
"const [viaturasInfo, setViaturasInfo] = useState<any[]>(DEFAULT_VIATURAS);")

with open('src/components/EscalaEspelhoModule.tsx', 'w') as f:
    f.write(content)
