const fs = require('fs');
let content = fs.readFileSync('src/server/routes/sync.ts', 'utf8');

// Replace the condition
content = content.replace(
    /if\s*\(\s*dtInicio\.match\(\/\\d\{2\}\\\/\\d\{2\}\\\/\\d\{4\}\/\)\s*\|\|\s*cols\[1\]\.toUpperCase\(\)\.includes\('ASSEGURADAS'\)\s*\|\|\s*cols\[1\]\.toUpperCase\(\)\.includes\('PRESUMIDAS'\)\s*\)\s*\{/g,
    `let atoUpper = (cols[1] || '').toUpperCase();
        let isValidAto = atoUpper.includes('CONCESS') || 
                         atoUpper.includes('INTERRUP') || 
                         atoUpper.includes('CANCELAMENT') || 
                         atoUpper.includes('PENDENTE') || 
                         atoUpper.includes('PRESUMIDA') || 
                         atoUpper.includes('PRESUNCAO') || 
                         atoUpper.includes('PRESUNÇÃO') || 
                         atoUpper.includes('ABONO') ||
                         atoUpper.includes('ASSEGURADAS');

        if (dtInicio.match(/\\d{2}\\/\\d{2}\\/\\d{4}/) || isValidAto) {`
);

fs.writeFileSync('src/server/routes/sync.ts', content);
