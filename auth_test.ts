import admin from 'firebase-admin';

const targetProject = 'ai-studio-4572982c-0772-4965-98e3-8ccd137a6b92';
admin.initializeApp({ projectId: targetProject });

admin.auth().listUsers(1)
  .then((users) => {
    console.log("Success fetching users:", users.users.length);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
