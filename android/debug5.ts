const fetchUsers = async () => {
  const resp = await fetch('http://127.0.0.1:3000/api/militar');
  const data = await resp.json();
  const militars = Array.isArray(data) ? data : (data.users || data.militars || []);
  const enf = militars.filter(m => m.ativoEnfermeiro);
  console.log('Enfermeiros in API:', enf.length);
  if (enf.length > 0) {
    console.log(enf.slice(0, 5).map(m => m.rg + ' ' + m.name));
  }
};
fetchUsers();
