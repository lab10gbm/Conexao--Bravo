import re
with open('src/components/EscalaEspelhoModule.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "if (militar.ativoCondutor) {",
    "if (militar.ativoCondutor) {\n      allowed.add('CONDUTOR');"
)

content = content.replace(
    "if (militar.ativoChefeGua) {",
    "if (militar.ativoChefeGua) {\n      allowed.add('CHEFE GUA');"
)

content = content.replace(
    "if (militar.ativoAuxiliar) {",
    "if (militar.ativoAuxiliar) {\n      allowed.add('AUXILIAR GUA');"
)

with open('src/components/EscalaEspelhoModule.tsx', 'w') as f:
    f.write(content)
