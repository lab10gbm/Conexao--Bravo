import re

with open('src/components/EscalaEspelhoModule.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'interface EscalaEspelhoModuleProps {\n  obmContext: string;\n}',
    'import { UserProfile } from "../types";\n\ninterface EscalaEspelhoModuleProps {\n  obmContext: string;\n  user: UserProfile;\n}'
)

content = content.replace(
    'export function EscalaEspelhoModule({ obmContext }: EscalaEspelhoModuleProps) {',
    'export function EscalaEspelhoModule({ obmContext, user }: EscalaEspelhoModuleProps) {'
)

with open('src/components/EscalaEspelhoModule.tsx', 'w') as f:
    f.write(content)

