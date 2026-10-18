import express from 'express';
import path from 'path';
import fs from 'fs';
// @ts-ignore
import archiver from 'archiver';
import { collection, doc, getDocs, limit, query, setDoc } from 'firebase/firestore';

export function setupExtensionRoutes(app: express.Express, getDeps: () => any) {
  app.get('/api/admin/extension/raw/:filename', (req, res) => {
    try {
      const { filename } = req.params;
      const extensionPath = path.join(process.cwd(), 'intranet-extension');
      let targetFile = '';

      if (filename === 'manifest') targetFile = 'manifest.json';
      else if (filename === 'content') targetFile = 'content.js';
      else if (filename === 'popupjs') targetFile = 'popup.js';
      else if (filename === 'popuphtml') targetFile = 'popup.html';
      else return res.status(404).send('Not found');

      const fullPath = path.join(extensionPath, targetFile);
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: 'File not found locally' });
      }

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(fs.readFileSync(fullPath, 'utf-8'));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/vacation/debug', async (req, res) => {
    const { clientDb } = getDeps();
    try {
      if (clientDb) {
        const snap = await getDocs(
          query(collection(clientDb, 'vacations'), limit(10)),
        );
        res.json({ db: !!clientDb, data: snap.docs.map((d) => d.data()) });
      } else {
        res.json({ db: false, data: [] });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/vacation/debug2', async (req, res) => {
    const { clientDb } = getDeps();
    try {
      if (clientDb) {
        await setDoc(doc(clientDb, 'vacations', 'testrg_2026_0101'), {
          militarRg: 'test',
        });
        res.json({ success: true });
      } else {
        res.json({ db: false });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/admin/extension/download', (req, res) => {
    try {
      const extensionPath = path.join(process.cwd(), 'intranet-extension');
      if (!fs.existsSync(extensionPath)) {
        return res
          .status(404)
          .json({ error: 'Extensão não encontrada no servidor' });
      }

      res.attachment('extensao-dgp-bulk-sync.zip');
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('error', function (err: any) {
        res.status(500).send({ error: err.message });
      });

      archive.pipe(res);
      archive.directory(extensionPath, false);
      archive.finalize();
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
