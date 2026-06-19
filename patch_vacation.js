const fs = require('fs');

const path = 'src/components/VacationImporter.tsx';
let content = fs.readFileSync(path, 'utf-8');

const tStart = content.indexOf('  const tampermonkeyCode = `// ==UserScript==');
const endMarker = '  })();`.replace(/\\\\s+/g, \\' \\').trim();';
const tEnd = content.indexOf(endMarker, tStart);

if (tStart > -1 && tEnd > -1) {
    const head = content.substring(0, tStart);
    const tail = content.substring(tEnd + endMarker.length);
    const insert = `  const tampermonkeyCode = buildUnifiedTampermonkeyScript(appUrl);
  const bookmarkletCode = buildUnifiedBookmarkletScript();
  const scannerCode = "";`;
    
    // Add imports
    const importInsert = `import { buildUnifiedTampermonkeyScript, buildUnifiedBookmarkletScript } from '../lib/tampermonkey';\\n`;
    
    fs.writeFileSync(path, importInsert + head + insert + tail);
    console.log('Patched VacationImporter.tsx');
} else {
    console.log('Failed to find markers!', { tStart, tEnd });
}
