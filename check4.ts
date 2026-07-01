async function run() {
  try {
    const payload = {
      personalDataList: [
        {
          rg: "12764",
          promotions: [
            {
              ato: "Promocao",
              criterio: "Tempo",
              posto: "SUBTEN",
              boletim: "067",
              dataPromocao: "13/08/2023"
            }
          ],
          promotionDate: "13/08/2023"
        }
      ]
    };
    const res = await fetch('http://localhost:3000/api/admin/personal-data/bulk-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'MINHA_CHAVE_SECRETA_SUPER_SEGURA_123'
      },
      body: JSON.stringify(payload)
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
