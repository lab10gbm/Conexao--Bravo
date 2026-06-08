const projectId = 'ai-studio-applet-webapp-33cfe';
const apiKey = 'AIzaSyB46AKE1I7nke459STRmIZ--bURelU3rNY';
const dbId = '(default)';

const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents:commit?key=${apiKey}`;
const payload = {
  writes: [
    {
      update: {
        name: `projects/${projectId}/databases/${dbId}/documents/test/ping`,
        fields: {
          test: { stringValue: "ok" }
        }
      }
    }
  ]
};

fetch(url, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(payload) })
  .then(r => r.json().then(d => console.log(r.status, d)))
  .catch(e => console.error(e));
