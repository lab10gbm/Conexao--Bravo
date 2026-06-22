const fetchUsers = async () => {
  const resp = await fetch('http://127.0.0.1:3000/api/militar');
  const data = await resp.json();
  const militars = data.members || [];
  const rgs = ["54313", "61173", "54380", "54428"];
  const found = militars.filter(m => rgs.includes(m.rg?.replace(/\D/g, '') || m.rg));
  console.log('Comunicantes in DB for our RGs:', found.length);
  if (found.length > 0) {
    found.forEach(f => console.log(f.name, f.ativoComunicante));
  }
};
fetchUsers();
