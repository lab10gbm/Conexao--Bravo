import re

with open('src/components/EscalaEspelhoModule.tsx', 'r') as f:
    content = f.read()

content = content.replace("const DEFAULT_VIATURAS = [", "const DEFAULT_VIATURAS: any[] = [")

with open('src/components/EscalaEspelhoModule.tsx', 'w') as f:
    f.write(content)
