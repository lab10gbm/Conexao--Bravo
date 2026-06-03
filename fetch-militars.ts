import https from 'https';

const url = 'https://firestore.googleapis.com/v1/projects/ai-studio-applet-webapp-33cfe/databases/ai-studio-aa98237e-b122-4540-826a-8b7c49b0842d/documents/militaries';

function getData() {
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log("TOTAL MILITARS:", json.documents ? json.documents.length : 0);
        if (json.documents) {
            json.documents.forEach((doc: any) => {
                const fields = doc.fields;
                if (fields && fields.ala && fields.ala.stringValue && fields.ala.stringValue.toUpperCase().includes('EXP')) {
                    console.log(`EXP MILITAR: ${fields.name?.stringValue} - OBM: ${fields.obm?.stringValue} - ALA: ${fields.ala?.stringValue}`);
                }
            });
        }
      } catch(e) { console.error("Parse error:", e); }
    });
  }).on('error', e => console.error("HTTP error:", e));
}

getData();
