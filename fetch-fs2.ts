import https from 'https';

const url = 'https://firestore.googleapis.com/v1/projects/ai-studio-applet-webapp-33cfe/databases/(default)/documents/refeitorio/data';

function getData() {
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) {
           console.error("Error:", parsed.error.message);
        } else {
           const menus = parsed.fields?.menus?.arrayValue?.values || [];
           console.log("MENUS in (default) count:", menus.length);
        }
      } catch (e) {
        console.error("Parse error", e);
      }
    });
  }).on('error', e => console.error("HTTP error:", e));
}

getData();
