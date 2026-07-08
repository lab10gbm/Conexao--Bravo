const fs = require('fs');
let content = fs.readFileSync('src/components/VacationModule.tsx', 'utf8');

// Function to replace condition
function replaceCondition(content, oldStr, newStr) {
    return content.split(oldStr).join(newStr);
}

// 1. In vacationsByAnoRef
content = content.replace(
    /if\s*\(\s*v\.ato\s*&&\s*v\.ato\.toUpperCase\(\)\.includes\("CONCESS"\)\s*\)/g,
    'if (v.ato && !v.ato.toUpperCase().includes("ASSEGURADAS") && !v.ato.toUpperCase().includes("CANCELAMENT"))'
);

// 2. In statsByYear calculation for visibleVacations and panoramaData
content = content.replace(
    /if\s*\(\s*v\.ato\?\.toUpperCase\(\)\.includes\("CONCESS"\)\s*\)/g,
    'if (v.ato && !v.ato.toUpperCase().includes("ASSEGURADAS") && !v.ato.toUpperCase().includes("CANCELAMENT"))'
);

fs.writeFileSync('src/components/VacationModule.tsx', content);
