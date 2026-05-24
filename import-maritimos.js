import fs from 'fs';

const maritimos = [
  { rg: "23458", ativoMaritimo: false, mestreAl: false, mestreBia: false, opAma: false, gvAma: false, marinheiros: false },
  { rg: "21266", ativoMaritimo: true, mestreAl: true, mestreBia: true, opAma: false, gvAma: false, marinheiros: true },
  { rg: "31607", ativoMaritimo: true, mestreAl: true, mestreBia: true, opAma: false, gvAma: false, marinheiros: false },
  { rg: "31610", ativoMaritimo: false, mestreAl: false, mestreBia: false, opAma: false, gvAma: false, marinheiros: false },
  { rg: "31627", ativoMaritimo: true, mestreAl: true, mestreBia: true, opAma: false, gvAma: false, marinheiros: true },
  { rg: "32102", ativoMaritimo: true, mestreAl: true, mestreBia: true, opAma: false, gvAma: false, marinheiros: true },
  { rg: "43560", ativoMaritimo: true, mestreAl: true, mestreBia: true, opAma: false, gvAma: false, marinheiros: true },
  { rg: "53015", ativoMaritimo: true, mestreAl: true, mestreBia: true, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54991", ativoMaritimo: true, mestreAl: false, mestreBia: false, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54309", ativoMaritimo: false, mestreAl: false, mestreBia: false, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54313", ativoMaritimo: true, mestreAl: false, mestreBia: false, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54315", ativoMaritimo: false, mestreAl: false, mestreBia: false, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54316", ativoMaritimo: true, mestreAl: false, mestreBia: false, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54319", ativoMaritimo: true, mestreAl: false, mestreBia: false, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54320", ativoMaritimo: true, mestreAl: false, mestreBia: false, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54323", ativoMaritimo: true, mestreAl: false, mestreBia: false, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54325", ativoMaritimo: true, mestreAl: false, mestreBia: false, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54326", ativoMaritimo: false, mestreAl: false, mestreBia: false, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54338", ativoMaritimo: true, mestreAl: false, mestreBia: true, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54342", ativoMaritimo: false, mestreAl: false, mestreBia: false, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54358", ativoMaritimo: true, mestreAl: false, mestreBia: true, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54361", ativoMaritimo: true, mestreAl: false, mestreBia: true, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54364", ativoMaritimo: true, mestreAl: false, mestreBia: true, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54380", ativoMaritimo: true, mestreAl: false, mestreBia: true, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54381", ativoMaritimo: true, mestreAl: false, mestreBia: false, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54399", ativoMaritimo: true, mestreAl: false, mestreBia: true, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54400", ativoMaritimo: true, mestreAl: false, mestreBia: true, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54407", ativoMaritimo: true, mestreAl: false, mestreBia: true, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54409", ativoMaritimo: true, mestreAl: false, mestreBia: true, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54421", ativoMaritimo: true, mestreAl: false, mestreBia: true, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54428", ativoMaritimo: true, mestreAl: false, mestreBia: false, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54429", ativoMaritimo: true, mestreAl: false, mestreBia: false, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54444", ativoMaritimo: false, mestreAl: false, mestreBia: false, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54755", ativoMaritimo: true, mestreAl: false, mestreBia: false, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54956", ativoMaritimo: true, mestreAl: false, mestreBia: false, opAma: false, gvAma: false, marinheiros: true },
  { rg: "54989", ativoMaritimo: true, mestreAl: false, mestreBia: false, opAma: false, gvAma: false, marinheiros: true },
  { rg: "55040", ativoMaritimo: true, mestreAl: false, mestreBia: false, opAma: false, gvAma: false, marinheiros: true },
  { rg: "61433", ativoMaritimo: true, mestreAl: false, mestreBia: false, opAma: false, gvAma: false, marinheiros: true }
];

if (!fs.existsSync('./data')) fs.mkdirSync('./data');
fs.writeFileSync('./data/maritimos.json', JSON.stringify(maritimos, null, 2));

async function run() {
  for (const maritimo of maritimos) {
    const data = {
       ativoMaritimo: maritimo.ativoMaritimo,
       mestreAl: maritimo.mestreAl,
       mestreBia: maritimo.mestreBia,
       opAma: maritimo.opAma,
       gvAma: maritimo.gvAma,
       marinheiros: maritimo.marinheiros
    };
    try {
      const resp = await fetch('http://127.0.0.1:3000/api/militar/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rg: maritimo.rg, data })
      });
      console.log(`Updated ${maritimo.rg}: ${resp.status}`);
    } catch(e) {
      console.log(`Error ${maritimo.rg}: ${e.message}`);
    }
  }
}

run();
