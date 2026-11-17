import express from 'express';
import { query, collection, orderBy, limit, getDocs, getDoc, doc, where, setDoc, addDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { format, subDays } from 'date-fns';
import { cleanUndefined, getUserObmAccess } from '../../lib/utils.ts';
import { resolveCanonicalScope } from '../../lib/canonicalScope.ts';
import * as fs from 'fs';
import * as path from 'path';

const normalizeRg = (rg: string | number) => {
  const str = (rg || '').toString().trim().toUpperCase();
  const clean = str.replace(/[^A-Z0-9]/g, '');
  return clean.replace(/^0+/, '') || clean;
};

let cachedMuralAvisos: any[] = [];
let lastMuralFetch = 0;
let cachedRefeitorioData: any = { menu: 'Não atualizado', lastUpdate: '' };
let lastRefeitorioFetch = 0;
let cachedViaturaAlert: any = null;
let lastViaturaFetch = 0;
let cachedGuarnicoes: any = null;
let lastGuarnicoesFetch = 0;
let cachedPermutas: any[] = [];
let lastPermutasFetch = 0;

type SrvDeps = { db: any, isDbHealthy: boolean };
export function setupServiceRoutes(app: express.Express, getDeps: () => any) {
  app.get('/api/seed_menus', async (req, res) => {
      res.json({ error: "disabled" });
  });

  app.get('/api/mural', async (req, res) => {
    const { db, isDbHealthy, clientDb } = getDeps();
    if (Date.now() - lastMuralFetch > 15000 && db && isDbHealthy) {
      try {
        const snap = await db.collection('mural_avisos').orderBy('createdAt', 'desc').limit(15).get();
        cachedMuralAvisos = snap.docs.map((doc: any) => {
           let data = doc.data();
           if (data.createdAt && typeof data.createdAt.toMillis === 'function') {
              data.createdAt = data.createdAt.toMillis();
           }
           return { id: doc.id, ...data };
        });
        lastMuralFetch = Date.now();
      } catch (e: any) {
        if (!e.message?.includes('PERMISSION_DENIED')) {
           console.error('[API] Mural fetch error:', e.message);
        }
      }
    }
    return res.json(cachedMuralAvisos);
  });

app.get('/api/refeitorio', async (req, res) => {
    const { db, isDbHealthy, clientDb } = getDeps();
    if (Date.now() - lastRefeitorioFetch > 120000 && db && isDbHealthy) {
      try {
        const snap = await db.collection('refeitorio').doc('data').get();
        if (snap.exists) {
          cachedRefeitorioData = snap.data();
        }
        lastRefeitorioFetch = Date.now();
      } catch (e: any) {
         if (!e.message?.includes('PERMISSION_DENIED')) {
            console.error('[API] Refeitorio fetch error:', e.message);
         }
      }
    }
    return res.json(cachedRefeitorioData || { menus: [], catalog: null });
  });

app.get('/api/viaturas/alerts', async (req, res) => {
    const { db, isDbHealthy, clientDb } = getDeps();
    if (Date.now() - lastViaturaFetch > 5000 && db && isDbHealthy) {
      try {
        const snap = await db.collection('viatura_alerts').orderBy('timestamp', 'desc').limit(1).get();
        if (!snap.empty) {
          cachedViaturaAlert = snap.docs[0].data();
          if (cachedViaturaAlert && cachedViaturaAlert.timestamp && typeof cachedViaturaAlert.timestamp.toMillis === 'function') {
             cachedViaturaAlert.timestamp = cachedViaturaAlert.timestamp.toMillis();
          }
        }
        lastViaturaFetch = Date.now();
      } catch (e: any) {
        if (!e.message?.includes('PERMISSION_DENIED')) {
           console.warn('[API] Viatura fetch error:', e.message);
        }
      }
    }
    return res.json(cachedViaturaAlert);
  });

app.get('/api/guarnicoes', async (req, res) => {
    const { db, isDbHealthy, clientDb } = getDeps();
    if (Date.now() - lastGuarnicoesFetch > 10000 && db && isDbHealthy) {
       try {
         const snap = await db.collection('guarnicoes').doc('ativas').get();
         if (snap.exists) {
            cachedGuarnicoes = snap.data();
         }
         lastGuarnicoesFetch = Date.now();
       } catch (e: any) {
          if (!e.message?.includes('PERMISSION_DENIED')) {
             console.warn('[API] Guarnicoes fetch error:', e.message);
          }
       }
    }
    return res.json(cachedGuarnicoes || {});
  });

app.get('/api/agenda/:rg/:year', async (req, res) => {
    const { db, isDbHealthy, clientDb } = getDeps();
    const { rg, year } = req.params;
    if (!rg || !year) return res.status(400).json({ error: 'Missing parameters' });

    if (Date.now() - lastPermutasFetch > 3600000 && db && isDbHealthy) { // Cache for 1 hour
       try {
           const startDate = `${year}-01-01`;
           const endDate = `${year}-12-31`;
           const snap = await db.collection('permutas').where('date', '>=', startDate).where('date', '<=', endDate).get();
           cachedPermutas = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
           lastPermutasFetch = Date.now();
       } catch (e) {
           console.error('[API] Permutas agenda fetch err:', e);
       }
    }

    const safeRg = normalizeRg(rg);
    
    // Filter internally in Node server
    const userPermutas = cachedPermutas.filter(p => {
       const strReq = String(p.requesterRg).replace(/\D/g, '');
       const strSub = String(p.substituteRg).replace(/\D/g, '');
       return strReq === safeRg || strSub === safeRg;
    });
    
    // Delivered pure datas for Calendar/Agenda
    const permutasPuras = userPermutas.map(p => {
       const type = (String(p.requesterRg).replace(/\D/g, '') === safeRg) ? 'PAGOU' : 'COBREU';
       return { 
         id: p.id, 
         date: p.date, 
         type, 
         status: p.status, 
         requesterRg: p.requesterRg, 
         substituteRg: p.substituteRg, 
         requesterSigned: p.requesterSigned, 
         substituteSigned: p.substituteSigned 
       };
    });

    return res.json({ 
       year,
       permutas: permutasPuras
    });
  });

  // --- /api/permutas (GET & POST) and /api/permutas/update ---
  app.get('/api/permutas', async (req, res) => {
    const { db, isDbHealthy, clientDb, normalizeObm } = getDeps();
    try {
      const obmParam = req.query.obm ? String(req.query.obm) : '';
      const startDateParam = req.query.startDate ? String(req.query.startDate) : '';
      const endDateParam = req.query.endDate ? String(req.query.endDate) : '';
      const daysAgoParam = req.query.daysAgo ? parseInt(String(req.query.daysAgo), 10) : 45;
      const daysAgo = isNaN(daysAgoParam) ? 45 : daysAgoParam;

      const startDate = startDateParam || format(subDays(new Date(), daysAgo), 'yyyy-MM-dd');

      let allDocs: any[] = [];
      let fetched = false;

      if (db && isDbHealthy) {
        try {
          let q: any = db.collection('permutas').where('date', '>=', startDate);
          if (endDateParam) {
            q = q.where('date', '<=', endDateParam);
          }
          const snap = await q.get();
          allDocs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
          fetched = true;
        } catch (e: any) {
          console.warn('[API] /api/permutas admin SDK notice:', e.message);
        }
      }

      if (!fetched && clientDb) {
        try {
          let q = query(collection(clientDb, 'permutas'), where('date', '>=', startDate));
          if (endDateParam) {
            q = query(q, where('date', '<=', endDateParam));
          }
          const snap = await getDocs(q);
          allDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          fetched = true;
        } catch (e: any) {
          try {
            const snap = await getDocs(collection(clientDb, 'permutas'));
            allDocs = snap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((p: any) => !p.date || p.date >= startDate);
            fetched = true;
          } catch (fallbackErr: any) {
            console.error('[API] /api/permutas fallback error:', fallbackErr.message);
          }
        }
      }

      let permutas = allDocs;
      if (obmParam && obmParam !== 'GLOBAL') {
        const cleanObm = normalizeObm ? normalizeObm(obmParam) : obmParam.trim().toUpperCase();
        const targetScope = resolveCanonicalScope(obmParam);
        const allowedObms = getUserObmAccess(cleanObm, false);

        permutas = permutas.filter((p: any) => {
          if (!p.obm && !p.scope) return true;
          if (p.scope && p.scope.unitId) {
            return p.scope.unitId === targetScope.unitId;
          }
          const pObm = normalizeObm ? normalizeObm(p.obm || '') : String(p.obm || '').trim().toUpperCase();
          return allowedObms.includes(pObm);
        });
      }

      permutas.sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));

      return res.json({
        success: true,
        count: permutas.length,
        permutas,
      });
    } catch (err: any) {
      console.error('[API] /api/permutas GET error:', err);
      return res.status(500).json({ success: false, error: err.message, permutas: [] });
    }
  });

  app.post('/api/permutas', async (req, res) => {
    const { db, isDbHealthy, clientDb } = getDeps();
    try {
      const { action, id, updates, ids, data } = req.body || {};

      if (action === 'batch-archive' && Array.isArray(ids) && ids.length > 0) {
        if (db && isDbHealthy) {
          try {
            const batch = db.batch();
            for (const docId of ids) {
              batch.update(db.collection('permutas').doc(docId), {
                archived: true,
                updatedAt: Date.now(),
              });
            }
            await batch.commit();
            return res.json({ success: true, archivedCount: ids.length });
          } catch (e) {}
        }
        if (clientDb) {
          const batch = writeBatch(clientDb);
          for (const docId of ids) {
            batch.update(doc(clientDb, 'permutas', docId), {
              archived: true,
              updatedAt: Date.now(),
            });
          }
          await batch.commit();
          return res.json({ success: true, archivedCount: ids.length });
        }
      }

      if ((action === 'update' || id) && (updates || data)) {
        const targetId = id;
        const targetUpdates = cleanUndefined({
          ...(updates || data),
          updatedAt: Date.now(),
        });
        let updated = false;
        if (db && isDbHealthy) {
          try {
            await db.collection('permutas').doc(targetId).set(targetUpdates, { merge: true });
            updated = true;
          } catch (e) {}
        }
        if (!updated && clientDb) {
          await setDoc(doc(clientDb, 'permutas', targetId), targetUpdates, { merge: true });
        }
        return res.json({ success: true, id: targetId, updates: targetUpdates });
      }

      if (action === 'create' && data) {
        const sanitized = cleanUndefined({
          ...data,
          createdAt: data.createdAt || Date.now(),
          updatedAt: Date.now(),
        });
        if (db && isDbHealthy) {
          try {
            const ref = await db.collection('permutas').add(sanitized);
            return res.json({ success: true, id: ref.id });
          } catch (e) {}
        }
        if (clientDb) {
          const ref = await addDoc(collection(clientDb, 'permutas'), sanitized);
          return res.json({ success: true, id: ref.id });
        }
      }

      return res.status(400).json({ success: false, error: 'Invalid payload for /api/permutas' });
    } catch (err: any) {
      console.error('[API] /api/permutas POST error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/permutas/update', async (req, res) => {
    const { db, isDbHealthy, clientDb } = getDeps();
    try {
      const body = req.body || {};
      const targetId = body.id || body.permutaId;
      const updates = cleanUndefined({ ...(body.updates || body.data || body) });
      delete updates.id;
      delete updates.permutaId;

      if (!targetId || Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, error: 'id and updates are required' });
      }

      if (!updates.updatedAt) {
        updates.updatedAt = Date.now();
      }

      let updated = false;
      if (db && isDbHealthy) {
        try {
          await db.collection('permutas').doc(targetId).set(updates, { merge: true });
          updated = true;
        } catch (e) {}
      }
      if (!updated && clientDb) {
        await setDoc(doc(clientDb, 'permutas', targetId), updates, { merge: true });
      }

      return res.json({ success: true, id: targetId, updates });
    } catch (err: any) {
      console.error('[API] /api/permutas/update error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- /api/presence (Server-side presence heartbeat to avoid client Write/channel adblocker errors) ---
  app.post('/api/presence', async (req, res) => {
    const { db, isDbHealthy, clientDb } = getDeps();
    try {
      const body = req.body || {};
      const rawRg = String(body.rg || '').trim();
      const cleanRg = normalizeRg(rawRg) || rawRg.replace(/[/\\#?]/g, '');
      if (!cleanRg) {
        return res.status(400).json({ success: false, error: 'RG inválido' });
      }

      const payload = cleanUndefined({
        rg: cleanRg,
        name: body.name || 'Militar',
        warName: body.warName || body.name || '',
        rank: body.rank || '',
        obm: body.obm || '',
        ala: body.ala ? String(body.ala) : '',
        quadro: body.quadro || '',
        clientTimestamp: Date.now(),
      });

      let saved = false;
      if (db && isDbHealthy) {
        try {
          await db.collection('presence').doc(cleanRg).set({
            ...payload,
            lastActive: new Date(),
          }, { merge: true });
          saved = true;
        } catch (e) {}
      }
      if (!saved && clientDb) {
        await setDoc(doc(clientDb, 'presence', cleanRg), {
          ...payload,
          lastActive: serverTimestamp(),
        }, { merge: true });
      }

      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/notifications/push', async (req, res) => {
    const { db, isDbHealthy, clientDb } = getDeps();
    try {
      const payload = req.body || {};
      const { action, rg, token, platform = 'web', title, body, data } = payload;
      const safeRg = normalizeRg(rg);
      if (!safeRg) {
        return res.status(400).json({ success: false, error: 'RG obrigatório' });
      }

      if (action === 'register_token') {
        if (!token) {
          return res.status(400).json({ success: false, error: 'Token obrigatório' });
        }
        const tokenDoc = {
          rg: safeRg,
          token,
          platform,
          updatedAt: new Date().toISOString(),
        };
        if (db && isDbHealthy) {
          try {
            await db.collection('push_tokens').doc(safeRg).set(tokenDoc, { merge: true });
            return res.json({ success: true });
          } catch (e) {}
        }
        if (clientDb) {
          await setDoc(doc(clientDb, 'push_tokens', safeRg), tokenDoc, { merge: true });
        }
        return res.json({ success: true });
      }

      if (action === 'send') {
        const notifDoc = {
          targetRg: safeRg,
          title: title || 'Notificação Conexão Bravo',
          body: body || '',
          data: data || {},
          sentAt: new Date().toISOString(),
        };
        if (db && isDbHealthy) {
          try {
            await db.collection('notification_events').add(notifDoc);
            return res.json({ success: true });
          } catch (e) {}
        }
        if (clientDb) {
          await addDoc(collection(clientDb, 'notification_events'), notifDoc).catch(() => {});
        }
        return res.json({ success: true });
      }

      return res.status(400).json({ success: false, error: 'Ação desconhecida' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

}
