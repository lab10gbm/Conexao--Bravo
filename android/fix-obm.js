import fs from 'fs';

const dataPaths = ['./data/enfermeiros.json', './data/comunicantes.json'];
dataPaths.forEach(path => {
  if (fs.existsSync(path)) {
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    data.forEach(d => {
      d.obm = "10º GBM";
    });
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
  }
});
