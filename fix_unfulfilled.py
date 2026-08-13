import re

with open('src/components/EscalaEspelhoModule.tsx', 'r') as f:
    content = f.read()

old_logic = """       const available = militarCapabilities.filter(m => m.allowed.includes(slot.name));
       if (available.length > 0) {
          available.sort((a, b) => a.allowed.length - b.allowed.length);
                 
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

with open('src/components/EscalaEspelhoModule.tsx', 'w') as f:
    f.write(content)
