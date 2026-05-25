import https from 'https';

const url = 'https://firestore.googleapis.com/v1/projects/ai-studio-applet-webapp-33cfe/databases/ai-studio-aa98237e-b122-4540-826a-8b7c49b0842d/documents/refeitorio';

function getData() {
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log("ALL DOCS:", data.substring(0, 1000));
    });
  }).on('error', e => console.error("HTTP error:", e));
}

getData();
