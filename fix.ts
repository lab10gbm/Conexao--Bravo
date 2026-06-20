import fs from 'fs';

function replaceInFile(filePath: string, replacements: { regex: RegExp; replace: string }[]) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const r of replacements) {
    content = content.replace(r.regex, r.replace);
  }
  fs.writeFileSync(filePath, content);
}

replaceInFile('src/components/ControleDeFuncoes.tsx', [
  { regex: /const \{ doc, setDoc \} = await import\('firebase\/firestore'\);/g, replace: '' }
]);

replaceInFile('src/contexts/ConfigContext.tsx', [
  { regex: /const \{ db \} = await import\('\.\.\/lib\/firebase'\);/g, replace: '' }
]);

replaceInFile('src/components/Login.tsx', [
  { regex: /import\('firebase\/auth'\)\.then\(async \(\{ signInWithEmailAndPassword, createUserWithEmailAndPassword \}\) => \{/g, replace: 'try {' },
  { regex: /import\('firebase\/auth'\)\.then\(async \(\{ signInWithCustomToken \}\) => \{/g, replace: 'try {' },
  { regex: /signInWithEmailAndPassword, signInWithCustomToken/g, replace: 'signInWithEmailAndPassword, signInWithCustomToken, createUserWithEmailAndPassword' }
]);

replaceInFile('src/components/SopMedidasModule.tsx', [
  { regex: /import\('firebase\/firestore'\)\.then\(\(\{ onSnapshot \}\) => \{/g, replace: 'try {' }
]);

replaceInFile('src/components/MedidasModule.tsx', [
  { regex: /import\('firebase\/firestore'\)\.then\(\(\{ onSnapshot \}\) => \{/g, replace: 'try {' },
  { regex: /import \{ doc, getDoc, setDoc \} from 'firebase\/firestore';/g, replace: "import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';" }
]);

