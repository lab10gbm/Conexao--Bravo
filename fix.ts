import fs from 'fs';
let content = fs.readFileSync('src/components/EscalanteDashboard.tsx', 'utf8');
content = content.replace(/<button[\s\S]*?onClick=\{\(\) => setActiveApp\(null\)\}[\s\S]*?<\/button>/g, '{renderHeaderActions(() => setActiveApp(null))}');
fs.writeFileSync('src/components/EscalanteDashboard.tsx', content);
