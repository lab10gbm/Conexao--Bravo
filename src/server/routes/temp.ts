import { doc, getDoc, collection, getDocs, setDoc, deleteDoc } from 'firebase/firestore';

export function setupTempRoutes(app: any, getDeps: () => any) {
  app.get('/api/temp-delete-grd', async (req: any, res: any) => {
    const { clientDb } = getDeps();
    try {
      await deleteDoc(doc(clientDb, 'ras_opportunities', 'kZx7x5FFIHuFFHK6iEzh'));
      await deleteDoc(doc(clientDb, 'ras_applications', 'iAGolYKTMjNmtIMWjaX4'));
      res.json({ success: true, message: 'Deleted ghost RAS from Oct 10' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
