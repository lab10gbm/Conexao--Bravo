import fs from 'fs';

// Header.tsx
{
    let content = fs.readFileSync('src/components/Header.tsx', 'utf8');
    content = content.replace("const { subDays, format } = require('date-fns');\n         const sixtyDaysAgo = format(subDays(new Date(), 60), 'yyyy-MM-dd');\n         const q = query(collection(db, 'permutas'), where('date', '>=', sixtyDaysAgo), orderBy('date', 'asc'));", "const { subDays, format } = await import('date-fns');\n         const sixtyDaysAgo = format(subDays(new Date(), 60), 'yyyy-MM-dd');\n         const q = query(collection(db, 'permutas'), where('date', '>=', sixtyDaysAgo), orderBy('date', 'asc'));");
    // it was const { getDocs, query, orderBy, where } = await import('firebase/firestore'); - this part was correct
    fs.writeFileSync('src/components/Header.tsx', content);
}

// PermutaBoard.tsx
{
    let content = fs.readFileSync('src/components/PermutaBoard.tsx', 'utf8');
    content = content.replace("import { collection, query, onSnapshot, updateDoc, doc, serverTimestamp, orderBy, addDoc, writeBatch } from 'firebase/firestore';", "import { collection, query, onSnapshot, updateDoc, doc, serverTimestamp, orderBy, addDoc, writeBatch, where } from 'firebase/firestore';");
    content = content.replace("const sixtyDaysAgo = format(subDays(new Date(), 60), 'yyyy-MM-dd');\n        const q = query(\n          collection(db, 'permutas'),\n          require('firebase/firestore').where('date', '>=', sixtyDaysAgo),\n          orderBy('date', 'asc')\n        );", "const sixtyDaysAgo = format(subDays(new Date(), 60), 'yyyy-MM-dd');\n        const q = query(\n          collection(db, 'permutas'),\n          where('date', '>=', sixtyDaysAgo),\n          orderBy('date', 'asc')\n        );");
    fs.writeFileSync('src/components/PermutaBoard.tsx', content);
}

// CalendarHighlights.tsx 
{
    let content = fs.readFileSync('src/components/CalendarHighlights.tsx', 'utf8');
    // add where, collection, query, orderBy
    content = content.replace("import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';", "import { doc, onSnapshot, collection, query, orderBy, where } from 'firebase/firestore';");
    content = content.replace("import { format, min, max, subDays } from 'date-fns';", "import { format, min, max, subDays } from 'date-fns';"); // Ensure subdays is there
    // if subDays missing add it
    if (!content.includes('subDays')) {
        content = content.replace("import { format, min, max } from 'date-fns';", "import { format, min, max, subDays } from 'date-fns';");
    }

    content = content.replace("const sixtyDaysAgo = require('date-fns').format(require('date-fns').subDays(new Date(), 60), 'yyyy-MM-dd');\n        const q = query(\n          collection(db, 'permutas'),\n          require('firebase/firestore').where('date', '>=', sixtyDaysAgo),\n          orderBy('date', 'asc')\n        );", "const sixtyDaysAgo = format(subDays(new Date(), 60), 'yyyy-MM-dd');\n        const q = query(\n          collection(db, 'permutas'),\n          where('date', '>=', sixtyDaysAgo),\n          orderBy('date', 'asc')\n        );");
    fs.writeFileSync('src/components/CalendarHighlights.tsx', content);
}

console.log('Fixed syntax issues');
