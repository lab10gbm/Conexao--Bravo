import fs from 'fs';

const path = 'src/components/EfetivoPanel.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace('text-[var(--color-brand-red)]', 'text-red-500');
fs.writeFileSync(path, content);
console.log('Replaced text color successfully');
