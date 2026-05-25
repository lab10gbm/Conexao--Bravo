import * as dotenv from 'dotenv';
import https from 'https';
dotenv.config();

const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/refeitorio/data`;

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.error) {
         console.error("Error:", parsed.error);
         process.exit(1);
      }
      
      const menus = parsed.fields?.menus?.arrayValue?.values || [];
      console.log("MENUS LENGTH:", menus.length);
      if (menus.length > 0) {
        console.log("FIRST MENU:", JSON.stringify(menus[0]).substring(0, 500));
        console.log("LAST MENU:", JSON.stringify(menus[menus.length - 1]).substring(0, 500));
      }
    } catch (e) {
      console.log("Raw output:", data.substring(0, 500));
    }
  });
}).on('error', e => console.error(e));
