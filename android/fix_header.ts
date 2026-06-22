import fs from 'fs';
let content = fs.readFileSync('src/components/Header.tsx', 'utf8');

const replacement = `     const currentSelections = new Set<string>();

     let isMounted = true;
     async function loadMonthData() {
        const { getDoc } = await import('firebase/firestore');
        for (const monthIndex of activeMonthIndices) {
           if (!isMounted) break;
           let year = now.getFullYear();
           if (monthIndex < now.getMonth() && now.getMonth() === 11) { year += 1; }
           const mDate = new Date(year, monthIndex, 1);
           const monthKey = format(mDate, 'yyyy-MM');
           const docRef = doc(db, \`expediente_\${normalizedObm}\`, monthKey);
           const cacheKey = \`expediente_\${normalizedObm}_\${monthKey}_\${profile.rg}_v2\`;
           try {
              const cachedStr = localStorage.getItem(cacheKey);
              if (cachedStr) {
                 const data = JSON.parse(cachedStr);
                 updateSelections(monthKey, data);
              }
              const docSnap = await getDoc(docRef);
              if (docSnap.exists() && isMounted) {
                 const data = docSnap.data();
                 updateSelections(monthKey, data);
                 try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch(e) {}
              }
           } catch(e) { console.warn(e); }
        }
     }

     function updateSelections(monthKey: string, data: any) {
        if (!isMounted) return;
        const arr = Array.from(currentSelections).filter(d => !d.startsWith(monthKey));
        currentSelections.clear();
        arr.forEach(d => currentSelections.add(d));
        if (data?.selections && data.selections[profile.rg!]) {
           data.selections[profile.rg!].forEach((d: string) => currentSelections.add(d));
        }
        setExpedienteSelections(Array.from(currentSelections));
     }

     loadMonthData();
     return () => { isMounted = false; };`;

const start = content.indexOf('     const unsubs: (() => void)[] = [];');
const end = content.indexOf('unsubs.forEach(u => u());\n     };', start);

if (start > 0 && end > start) {
    const endTotal = end + 'unsubs.forEach(u => u());\n     };'.length;
    content = content.slice(0, start) + replacement + content.slice(endTotal);
    fs.writeFileSync('src/components/Header.tsx', content);
    console.log('Replaced by indexing');
} else {
    console.log('Not found');
}
