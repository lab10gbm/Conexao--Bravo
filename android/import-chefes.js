import fs from 'fs';

const chefes = [
  { rg: "12708", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "18779", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "20936", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "20945", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "20955", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "20960", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "21266", ativoChefeGua: false, chefeAbt: false, chefeAbsl: false },
  { rg: "21870", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "22332", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "22333", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "22352", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "22567", ativoChefeGua: false, chefeAbt: false, chefeAbsl: false },
  { rg: "23458", ativoChefeGua: false, chefeAbt: false, chefeAbsl: false },
  { rg: "23518", ativoChefeGua: false, chefeAbt: false, chefeAbsl: false },
  { rg: "23609", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "23721", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "26029", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "27843", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "27899", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "28019", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "31602", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "31607", ativoChefeGua: false, chefeAbt: false, chefeAbsl: false },
  { rg: "31610", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "31627", ativoChefeGua: false, chefeAbt: false, chefeAbsl: true },
  { rg: "31992", ativoChefeGua: true, chefeAbt: false, chefeAbsl: true },
  { rg: "32046", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "32102", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "43427", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "43408", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "43560", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "43581", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "43386", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "44098", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "44306", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "49075", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true },
  { rg: "49628", ativoChefeGua: true, chefeAbt: true, chefeAbsl: true }
];

if (!fs.existsSync('./data')) fs.mkdirSync('./data');
fs.writeFileSync('./data/chefes.json', JSON.stringify(chefes, null, 2));

async function run() {
  for (const chefe of chefes) {
    const data = {
       ativoChefeGua: chefe.ativoChefeGua,
       chefeAbt: chefe.chefeAbt,
       chefeAbsl: chefe.chefeAbsl
    };
    try {
      const resp = await fetch('http://127.0.0.1:3000/api/militar/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rg: chefe.rg, data })
      });
      console.log(`Updated ${chefe.rg}: ${resp.status}`);
    } catch(e) {
      console.log(`Error ${chefe.rg}: ${e.message}`);
    }
  }
}

run();
