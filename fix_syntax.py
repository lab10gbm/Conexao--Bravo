import re

with open('src/components/EscalaEspelhoModule.tsx', 'r') as f:
    content = f.read()

content = content.replace('\\"', '"')

with open('src/components/EscalaEspelhoModule.tsx', 'w') as f:
    f.write(content)
