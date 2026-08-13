import re

with open('src/components/EscalaEspelhoModule.tsx', 'r') as f:
    content = f.read()

# Replace used: false with assignedRoles: []
content = content.replace(
    "used: false",
    "assignedRoles: [] as string[]"
)

old_logic = """       const available = militarCapabilities.filter(m => !m.used && m.allowed.includes(slot.genericName));
       if (available.length > 0) {
          available.sort((a, b) => a.allowed.length - b.allowed.length);
          available[0].used = true;
       } else {"""

new_logic = """       const available = militarCapabilities.filter(m => {
          if (!m.allowed.includes(slot.genericName)) return false;
          if (m.assignedRoles.includes(slot.genericName)) return false;
          for (const role of m.assignedRoles) {
             const val1 = correlation[slot.genericName]?.[role] ?? 0;
             const val2 = correlation[role]?.[slot.genericName] ?? 0;
             if (val1 === 0 || val2 === 0) return false;
          }
          return true;
       });
       if (available.length > 0) {
          available.sort((a, b) => a.allowed.length - b.allowed.length);
          available[0].assignedRoles.push(slot.genericName);
       } else {"""

content = content.replace(old_logic, new_logic)

# Wait, `slotOptionsCount.forEach(({ slot }) => {` might need to be sorted properly, 
# but for now, we just replace the filter and assignment logic.

with open('src/components/EscalaEspelhoModule.tsx', 'w') as f:
    f.write(content)
