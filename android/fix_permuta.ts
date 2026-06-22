import fs from 'fs';
let content = fs.readFileSync('src/components/PermutaBoard.tsx', 'utf8');

const target = `    const q = query(`;

const replacement = `    let isMounted = true;
    async function loadPermutas() {
      try {
        const { getDocs } = await import('firebase/firestore');
        const q = query(collection(db, 'permutas'), orderBy('date', 'asc'));
        const snapshot = await getDocs(q);
        
        clearTimeout(timer);
        if (!isMounted) return;
        
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as PermutaRequest[];
        
        const filteredByObm = data.filter(p => !p.obm || p.obm === obmContext || p.obm === '10º GBM');
        const filtered = adminMode ? filteredByObm : filteredByObm.filter(p => 
          p.status === PermutaStatus.ACCEPTED || 
          p.requesterId === (user?.uid || '') ||
          p.acceptedById === (user?.uid || '') ||
          p.requesterRg === (user?.rg || '') ||
          p.substituteRg === (user?.rg || '')
        );

        setPermutas(filtered);
        try { localStorage.setItem('cache_permutas', JSON.stringify(filtered)); } catch(e) {}
        setLoading(false);
      } catch (error) {
        clearTimeout(timer);
        if (isMounted) setLoading(false);
        handleFirestoreError(error, OperationType.LIST, 'permutas');
      }
    }
    
    loadPermutas();
    return () => { isMounted = false; };`;

const start = content.indexOf('    const q = query(');
const end = content.indexOf('return () => unsubscribe();', start);

if (start > 0 && end > start) {
    const endTotal = end + 'return () => unsubscribe();'.length;
    content = content.slice(0, start) + replacement + content.slice(endTotal);
    fs.writeFileSync('src/components/PermutaBoard.tsx', content);
    console.log('Replaced PermutaBoard DB queries');
} else {
    console.log('Not found');
}
