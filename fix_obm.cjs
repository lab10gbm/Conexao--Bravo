const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src/components').filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('doc(db, "obm_settings", obmContext)')) {
    content = content.replace(/doc\(db, "obm_settings", obmContext\)/g, "doc(db, \"obm_settings\", obmContext.replace(/\\//g, '_').replace(/\\s/g, '_'))");
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
