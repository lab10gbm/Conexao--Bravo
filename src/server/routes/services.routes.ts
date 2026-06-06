import express from 'express';
import { query, collection, orderBy, limit, getDocs, getDoc, doc, where, setDoc } from 'firebase/firestore';
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

}
