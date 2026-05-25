import https from 'https';

const url = 'https://firestore.googleapis.com/v1/projects/ai-studio-applet-webapp-33cfe/databases/ai-studio-aa98237e-b122-4540-826a-8b7c49b0842d/documents:runQuery';

const data = JSON.stringify({
  structuredQuery: {
    from: [{ collectionId: "refeitorio" }],
    select: { fields: [] }
  }
});

const req = https.request(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let str = '';
  res.on('data', chunk => str += chunk);
  res.on('end', () => console.log(str));
});
req.write(data);
req.end();
