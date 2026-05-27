import http from 'http';

http.get('http://localhost:3000/api/militar', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    
    let stats = {
      condutores: 0,
      chefeGua: 0,
      maritimos: 0,
    };
    json.members.forEach(m => {
       if (m.ativoCondutor) stats.condutores++;
       if (m.ativoChefeGua) stats.chefeGua++;
       if (m.ativoMaritimo) stats.maritimos++;
    });
    console.log(stats);
  });
}).on('error', (err) => {
  console.log("Error:", err.message);
});
