import re

with open('src/components/EscalaEspelhoModule.tsx', 'r') as f:
    content = f.read()

# Let's completely rewrite the unfulfilled logic to be robust
old_logic = """       const available = militarCapabilities.filter(m => {
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

new_logic = """       // Encontra os militares que possuem a capacidade GENÉRICA exigida pela vaga (ex: AUXILIAR GUA)
       const available = militarCapabilities.filter(m => {
          // Se o militar não possui a capacidade raiz, pula.
          if (!m.allowed.includes(slot.genericName)) return false;
          
          // Se ele já está cobrindo essa exata mesma vaga (em caso de múltiplas vagas iguais), não pode se duplicar nela
          if (m.assignedRoles.includes(slot.genericName)) return false;

          // Regra de Correlação / Acúmulo:
          // Se o militar já assumiu alguma outra função, verificamos a matriz de correlação cruzada.
          for (const role of m.assignedRoles) {
             const val1 = correlation[slot.genericName]?.[role] ?? 0;
             const val2 = correlation[role]?.[slot.genericName] ?? 0;
             // Se houver conflito (incompatibilidade), esse militar não serve para acúmulo.
             if (val1 === 0 || val2 === 0) return false;
          }
          return true;
       });

       if (available.length > 0) {
          // Prioriza atribuir a vaga a quem tem MENOS capacidades gerais no sistema (para não queimar o "coringa")
          available.sort((a, b) => a.allowed.length - b.allowed.length);
          // O militar assume a responsabilidade
          available[0].assignedRoles.push(slot.genericName);
       } else {"""

content = content.replace(old_logic, new_logic)

with open('src/components/EscalaEspelhoModule.tsx', 'w') as f:
    f.write(content)
