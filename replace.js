const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "src/components/ControleDeFuncoes.tsx");
let content = fs.readFileSync(filePath, "utf8");
content = content.replace(/\{m\.quadro \|\| m\.specializations\?\.\[0\] \|\| \"\-\"\}/g, '{m.quadro || "-"}');
fs.writeFileSync(filePath, content);

console.log("Replaced all occurrences");
