import re

with open('src/components/EscalaEspelhoModule.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'className="h-full flex flex-col bg-slate-50 relative overflow-hidden"',
    'className="flex flex-col bg-slate-50 relative"'
)

content = content.replace(
    'className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6"',
    'className="p-4 sm:p-6 space-y-6"'
)

with open('src/components/EscalaEspelhoModule.tsx', 'w') as f:
    f.write(content)

