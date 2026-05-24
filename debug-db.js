import fs from 'fs';
fetch('http://127.0.0.1:3000/api/debug/db-status')
  .then(res => res.json())
  .then(json => {
     console.log(JSON.stringify(json));
  })
  .catch(err => console.error(err));
