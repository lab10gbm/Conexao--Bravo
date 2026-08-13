import re

with open("src/components/EscalaEspelhoModule.tsx", "r") as f:
    content = f.read()

old_code = """    dynamicRequirements.forEach(req => {
      const assignedCount = selectedFunctions[req.name]?.length || 0;
      const deficit = Math.max(0, req.req - assignedCount);"""

new_code = """    dynamicRequirements.forEach(req => {
      const assignedCount = Object.values(selectedFunctions).flat().filter((v) => normalizeFnName(v) === normalizeFnName(req.name)).length;
      const deficit = Math.max(0, req.req - assignedCount);"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open("src/components/EscalaEspelhoModule.tsx", "w") as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Old code not found.")
