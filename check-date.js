import fs from 'fs';

const stats = fs.statSync('firebase-applet-config.json');
console.log("Modified:", stats.mtime);
