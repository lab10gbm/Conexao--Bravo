import https from 'https';

const url = 'https://firestore.googleapis.com/v1/projects/ai-studio-applet-webapp-33cfe/databases';

function getData() {
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log("Response:", data);
    });
  }).on('error', e => console.error("HTTP error:", e));
}

getData();
