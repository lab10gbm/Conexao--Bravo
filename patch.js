const fs = require('fs');
const path = './src/server/routes/military.routes.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /const reqDoc = await db\.collection\('militaries'\)\.doc\(safeRg\)\.get\(\);\n\s*if \(reqDoc\.exists\) {\n\s*requester = reqDoc\.data\(\);\n\s*militaryCache\.set\(safeRg, requester\);\n\s*}/,
  `if (isDbHealthy && db) {
              const reqDoc = await db.collection('militaries').doc(safeRg).get();
              if (reqDoc.exists) {
                requester = reqDoc.data();
                militaryCache.set(safeRg, requester);
              }
            } else if (clientDb) {
              const reqDoc = await getDoc(doc(clientDb, 'militaries', safeRg));
              if (reqDoc.exists()) {
                requester = reqDoc.data();
                militaryCache.set(safeRg, requester);
              }
            }`
);

code = code.replace(
  /const snap = await db\.collection\('militaries'\)\.get\(\);\n\s*snap\.forEach\(\(d: any\) => usersData\.push\(\d\.data\(\)\)\);/,
  `if (isCacheLoaded && militaryCache.size > 0) {
                usersData.push(...Array.from(militaryCache.values()));
              } else if (isDbHealthy && db) {
                const snap = await db.collection('militaries').get();
                snap.forEach((d: any) => usersData.push(d.data()));
              } else if (clientDb) {
                const snap = await getDocs(collection(clientDb, 'militaries'));
                snap.forEach((d: any) => usersData.push(d.data()));
              }`
);

code = code.replace(
  /const snap = await db\.collection\('militaries'\)\.get\(\);\n\s*snap\.forEach\(\(d: any\) => {/,
  `const allMilitaries = (isCacheLoaded && militaryCache.size > 0) 
                ? Array.from(militaryCache.values()) 
                : [];
              
              if (allMilitaries.length === 0) {
                 if (isDbHealthy && db) {
                   const snap = await db.collection('militaries').get();
                   snap.forEach((d: any) => allMilitaries.push(d.data()));
                 } else if (clientDb) {
                   const snap = await getDocs(collection(clientDb, 'militaries'));
                   snap.forEach((d: any) => allMilitaries.push(d.data()));
                 }
              }

              allMilitaries.forEach((dat: any) => {`
);

fs.writeFileSync(path, code);
