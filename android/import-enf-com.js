import fs from 'fs';

const enfermeiros = [
  { rg: "30833", ativoEnfermeiro: true },
  { rg: "42374", ativoEnfermeiro: true },
  { rg: "42998", ativoEnfermeiro: true },
  { rg: "42851", ativoEnfermeiro: true }
];

const comunicantes = [
  { rg: "54313", ativoComunicante: true },
  { rg: "61173", ativoComunicante: true },
  { rg: "54380", ativoComunicante: true },
  { rg: "54428", ativoComunicante: true },
  { rg: "2200861", ativoComunicante: true },
  { rg: "53753", ativoComunicante: true },
  { rg: "53772", ativoComunicante: true },
  { rg: "53808", ativoComunicante: true },
  { rg: "2200842", ativoComunicante: true },
  { rg: "2200844", ativoComunicante: true },
  { rg: "2201002", ativoComunicante: true },
  { rg: "53786", ativoComunicante: true },
  { rg: "54309", ativoComunicante: true },
  { rg: "54315", ativoComunicante: true },
  { rg: "54381", ativoComunicante: true },
  { rg: "2201179", ativoComunicante: true },
  { rg: "2201188", ativoComunicante: true }
];

if (!fs.existsSync('./data')) fs.mkdirSync('./data');
fs.writeFileSync('./data/enfermeiros.json', JSON.stringify(enfermeiros, null, 2));
fs.writeFileSync('./data/comunicantes.json', JSON.stringify(comunicantes, null, 2));

async function run() {
  for (const enf of enfermeiros) {
    const data = {
       ativoEnfermeiro: enf.ativoEnfermeiro
    };
    try {
      const resp = await fetch('http://127.0.0.1:3000/api/militar/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rg: enf.rg, data })
      });
      console.log(`Updated Enfermeiro ${enf.rg}: ${resp.status}`);
    } catch(e) {
      console.log(`Error ${enf.rg}: ${e.message}`);
    }
  }

  for (const com of comunicantes) {
    const data = {
       ativoComunicante: com.ativoComunicante
    };
    try {
      const resp = await fetch('http://127.0.0.1:3000/api/militar/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rg: com.rg, data })
      });
      console.log(`Updated Comunicante ${com.rg}: ${resp.status}`);
    } catch(e) {
      console.log(`Error ${com.rg}: ${e.message}`);
    }
  }
}

run();
