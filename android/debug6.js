import fs from 'fs';
const db = JSON.parse(fs.readFileSync('./data/military_cache.json', 'utf8'));
const rgs = ["30833", "42374", "42998", "42851"];
for (const rg of rgs) {
  let found = null;
  for (const [key, val] of Object.entries(db)) {
    if (key.includes(rg)) found = val;
  }
  console.log('DB found for', rg, ':', found);
}
