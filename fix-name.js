import fs from 'fs';
let code = fs.readFileSync('src/components/ControleDeFuncoes.tsx', 'utf8');
code = code.replace(/m\.name\.split/g, "(m.name || '').split");
fs.writeFileSync('src/components/ControleDeFuncoes.tsx', code);
