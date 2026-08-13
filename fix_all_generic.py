import re
with open('src/components/EscalaEspelhoModule.tsx', 'r') as f:
    content = f.read()

# Make sure reqs type is correct
content = content.replace(
    "let reqs: {name: string, req: number, category: string}[] = [",
    "let reqs: {name: string, genericName: string, req: number, category: string}[] = ["
)
content = content.replace(
    "{ name: \"ADJUNTO\", req: roleQtds[\"ADJUNTO\"] ?? 1, category: 'admin' },",
    "{ name: \"ADJUNTO\", genericName: \"ADJUNTO\", req: roleQtds[\"ADJUNTO\"] ?? 1, category: 'admin' },"
)
content = content.replace(
    "{ name: \"ENCARREGADO DE MOTORISTA\", req: roleQtds[\"ENCARREGADO DE MOTORISTA\"] ?? 1, category: 'admin' },",
    "{ name: \"ENCARREGADO DE MOTORISTA\", genericName: \"ENCARREGADO DE MOTORISTA\", req: roleQtds[\"ENCARREGADO DE MOTORISTA\"] ?? 1, category: 'admin' },"
)

# VtrReqs
content = content.replace(
    "const vtrReqs: Record<string, {req: number, category: string}> = {};",
    "const vtrReqs: Record<string, {req: number, category: string, genericName: string}> = {};"
)

content = content.replace(
    """          if (!vtrReqs[roleName]) {
             vtrReqs[roleName] = { req: 0, category: cat };
          }""",
    """          const genericName = getDefaultName(v, slot);
          if (!vtrReqs[roleName]) {
             vtrReqs[roleName] = { req: 0, category: cat, genericName };
          }"""
)

content = content.replace(
    "reqs.push({ name, req: data.req, category: data.category });",
    "reqs.push({ name, genericName: data.genericName, req: data.req, category: data.category });"
)

# All the push for admin
content = re.sub(
    r"reqs\.push\(\{ name: \"([^\"]+)\", req: roleQtds\[\"[^\"]+\"\] \?\? (\d+), category: 'admin' \}\);",
    r"reqs.push({ name: \"\1\", genericName: \"\1\", req: roleQtds[\"\1\"] ?? \2, category: 'admin' });",
    content
)

# allSlots
content = content.replace(
    "const allSlots: {name: string, category: string}[] = [];",
    "const allSlots: {name: string, genericName: string, category: string}[] = [];"
)

content = content.replace(
    "allSlots.push({ name: req.name, category: req.category });",
    "allSlots.push({ name: req.name, genericName: req.genericName, category: req.category });"
)

# Finally, estudoTecnico filter logic
content = content.replace(
    "if (!m.allowed.includes(slot.name)) return false;",
    "if (!m.allowed.includes(slot.genericName)) return false;"
)
content = content.replace(
    "if (m.assignedRoles.includes(slot.name)) return false;",
    "if (m.assignedRoles.includes(slot.genericName)) return false;"
)
content = content.replace(
    "correlation[slot.name]",
    "correlation[slot.genericName]"
)
content = content.replace(
    "[slot.name]",
    "[slot.genericName]"
)
content = content.replace(
    "m.assignedRoles.push(slot.name);",
    "m.assignedRoles.push(slot.genericName);"
)

with open('src/components/EscalaEspelhoModule.tsx', 'w') as f:
    f.write(content)
