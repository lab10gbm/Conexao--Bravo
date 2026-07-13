const fs = require('fs');
const path = require('path');

function addImports(filePath, imports) {
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;
  
  const utilsRegex = /import\s+{([^}]*)}\s+from\s+['"]\.\.\/lib\/utils['"]\s*;/g;
  let hasUtils = false;
  
  newContent = newContent.replace(utilsRegex, (match, p1) => {
    hasUtils = true;
    const existing = p1.split(',').map(s => s.trim()).filter(Boolean);
    if (imports.utils) {
      imports.utils.forEach(imp => {
        if (!existing.includes(imp)) {
          existing.push(imp);
        }
      });
    }
    return `import { ${existing.join(', ')} } from '../lib/utils';`;
  });
  
  if (!hasUtils && imports.utils && imports.utils.length > 0) {
    const importStr = `import { ${imports.utils.join(', ')} } from '../lib/utils';\n`;
    newContent = importStr + newContent;
  }
  
  const lucideRegex = /import\s+{([^}]*)}\s+from\s+['"]lucide-react['"]\s*;/g;
  let hasLucide = false;
  newContent = newContent.replace(lucideRegex, (match, p1) => {
    hasLucide = true;
    const existing = p1.split(',').map(s => s.trim()).filter(Boolean);
    if (imports.lucide) {
      imports.lucide.forEach(imp => {
        if (!existing.includes(imp)) {
          existing.push(imp);
        }
      });
    }
    return `import { ${existing.join(', ')} } from 'lucide-react';`;
  });
  
  if (!hasLucide && imports.lucide && imports.lucide.length > 0) {
    const importStr = `import { ${imports.lucide.join(', ')} } from 'lucide-react';\n`;
    newContent = importStr + newContent;
  }

  fs.writeFileSync(filePath, newContent);
}

addImports('src/components/CalendarHighlights.tsx', { utils: ['getUserObmAccess', 'normalizeObm', 'getAlaColor'] });
addImports('src/components/ControlePermutasMobile.tsx', { utils: ['getUserObmAccess', 'normalizeObm', 'getAlaColor', 'cn', 'cleanUndefined', 'getAlaForDate', 'getOppositeAla'] });
addImports('src/components/EscalaEspelhoModule.tsx', { utils: ['getAlaForDate', 'cn', 'getAlaColor', 'getAlaName', 'formatMilitaryName'] });
addImports('src/components/OfficerDashboard.tsx', { utils: ['getUserObmAccess', 'normalizeObm'] });
addImports('src/components/PermutaBoard.tsx', { utils: ['getUserObmAccess', 'normalizeObm', 'calculateDeadline', 'cleanUndefined', 'cn', 'getAlaForDate', 'getAlaColor', 'getAlaName'] });
addImports('src/components/RasClientModule.tsx', { lucide: ['XCircle'] });

console.log("Done");
