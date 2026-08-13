import re
with open('src/components/EscalaEspelhoModule.tsx', 'r') as f:
    content = f.read()

# Replace allowed.add back to empty in getMostruario
content = content.replace(
    "    if (militar.ativoCondutor) {\n      allowed.add('CONDUTOR');\n      funcs.push(\"CONDUTOR\");",
    "    if (militar.ativoCondutor) {\n      funcs.push(\"CONDUTOR\");"
)

content = content.replace(
    "    if (militar.ativoChefeGua) {\n      allowed.add('CHEFE GUA');\n      funcs.push(\"CHEFE GUA\");",
    "    if (militar.ativoChefeGua) {\n      funcs.push(\"CHEFE GUA\");"
)

content = content.replace(
    "    if (militar.ativoAuxiliar) {\n      allowed.add('AUXILIAR GUA');\n      funcs.push(\"AUX GUA\");",
    "    if (militar.ativoAuxiliar) {\n      funcs.push(\"AUX GUA\");"
)

with open('src/components/EscalaEspelhoModule.tsx', 'w') as f:
    f.write(content)
