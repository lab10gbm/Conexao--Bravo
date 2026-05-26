import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

const configStr = readFileSync('./firebase-applet-config.json', 'utf-8');
const config = JSON.parse(configStr);

const app = initializeApp(config);
const db = getFirestore(app);

async function seed() {
  await setDoc(doc(db, 'translado_vehicles', 'van_10'), {
    name: 'Van 10º GBM',
    unit: '10º GBM',
    origin: 'Ponto Inicial (Saindo/Rio)',
    destination: '10º GBM',
    waypoints: 'Centro, Av Brasil'
  });
  await setDoc(doc(db, 'translado_vehicles', 'van_16'), {
    name: 'Van 16º GBM',
    unit: '16º GBM',
    origin: 'Ponto Inicial',
    destination: '16º GBM',
    waypoints: 'Centro'
  });
  console.log('Seed completo!');
  process.exit(0);
}
seed().catch(console.error);
