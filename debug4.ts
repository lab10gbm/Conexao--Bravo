import { readFileSync } from 'fs';
const fetchUsers = async () => {
  const resp = await fetch('http://127.0.0.1:3000/api/militar');
  const militars = await resp.json();
  const rgs = ["30833", "42374", "42998", "42851"];
  const found = militars.filter(m => rgs.includes(m.rg?.replace(/\D/g, '') || m.rg));
  console.log('Enfermeiros found:', found.map(m => ({ rg: m.rg, name: m.name, obm: m.obm, ativoEnfermeiro: m.ativoEnfermeiro })));
};
fetchUsers();
