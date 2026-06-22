const fetchUsers = async () => {
  const resp = await fetch('http://127.0.0.1:3000/api/militar');
  const data = await resp.json();
  const militars = data.members || [];
  const found = militars.filter(m => ["20960", "22352"].includes(m.rg?.replace(/\D/g, '') || m.rg));
  console.log('Goncalves/Cassiano:', found.map(m => ({ rg: m.rg, name: m.name, ativoEnfermeiro: m.ativoEnfermeiro, ativoComunicante: m.ativoComunicante, quadro: m.quadro })));
};
fetchUsers();
