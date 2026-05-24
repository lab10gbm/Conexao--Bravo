import fs from 'fs';

async function run() {
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch('http://127.0.0.1:3000/api/debug/db-status');
      const json = await res.json();
      console.log(JSON.stringify(json));
    } catch(e){}
    await new Promise(r => setTimeout(r, 1000));
  }
}
run();
