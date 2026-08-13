import re

with open('src/components/EscalaEspelhoModule.tsx', 'r') as f:
    content = f.read()

content = content.replace("m => !m.used &&", "m =>")
content = content.replace("available[0].used = true;", "")

with open('src/components/EscalaEspelhoModule.tsx', 'w') as f:
    f.write(content)
