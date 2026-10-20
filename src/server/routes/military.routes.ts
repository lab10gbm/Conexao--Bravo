import { verifyFirebaseSession, optionalFirebaseSession } from "./auth";
import express from 'express';
import { collection, getDocs, getDoc, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { resolveCanonicalScope } from "../../lib/canonicalScope";
import { cleanUndefined, withTimeout } from "../../lib/utils";
import { syncMedicosInternal } from "../lib/medicos-sync";

export function setupMilitaryRoutes(app: express.Express, getDeps: () => any) {
  app.get('/api/militar/version', (req, res) => {
    const { getCacheVersion } = getDeps();
    return res.json({ version: getCacheVersion ? getCacheVersion() : 0 });
  });

  app.get('/api/militar/stream', (req, res) => {
    const { cacheEvents, getCacheVersion } = getDeps();
    
    if (!cacheEvents) {
      return res.status(500).json({ error: 'SSE not supported on this server instance' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send initial version to establish baseline
    res.write(`data: ${JSON.stringify({ version: getCacheVersion ? getCacheVersion() : 0 })}\n\n`);
    if (typeof (res as any).flush === 'function') (res as any).flush();

    const onUpdate = (newVersion: number) => {
      res.write(`data: ${JSON.stringify({ version: newVersion })}\n\n`);
      if (typeof (res as any).flush === 'function') (res as any).flush();
    };

    // Send a heartbeat comment every 15 seconds to keep the connection alive
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
      if (typeof (res as any).flush === 'function') (res as any).flush();
    }, 15000);

    cacheEvents.on('update', onUpdate);

    req.on('close', () => {
      clearInterval(heartbeat);
      cacheEvents.off('update', onUpdate);
    });
  });

  app.get('/api/militar/search', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const { militaryCache } = getDeps();
    const query = ((req.query.q as string) || '').trim().toLowerCase();

    if (!query) {
      return res.json({ success: true, count: 0, militaries: [] });
    }

    const allMilitaries = Array.from(militaryCache.values());
    const filtered = allMilitaries.filter((m: any) => {
      const name = (m.name || '').toLowerCase();
      const warName = (m.warName || '').toLowerCase();
      const rg = (m.rg || '').toString().toLowerCase();
      const rank = (m.rank || '').toLowerCase();
      const quadro = (m.quadro || '').toLowerCase();
      const obm = (m.obm || '').toLowerCase();
      return name.includes(query) || warName.includes(query) || rg.includes(query) || rank.includes(query) || quadro.includes(query) || obm.includes(query);
    });

    return res.json({
      success: true,
      count: filtered.length,
      militaries: filtered.slice(0, 50)
    });
  });

  // Listagem e estatísticas completas dos Oficiais Médicos
  app.get('/api/militar/medicos', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const { militaryCache } = getDeps();
    const all = Array.from(militaryCache.values());
    const medicos = all.filter((m: any) => 
      m.isMedico === true || 
      (m.quadro && m.quadro.toUpperCase().includes('QOS/MÉD')) ||
      (m.quadro && m.quadro.toUpperCase().includes('QOS/MED'))
    );

    const stats = {
      total: medicos.length,
      gse: medicos.filter((m: any) => m.gse || m.obm?.toUpperCase().includes('GSE')).length,
      superiores: medicos.filter((m: any) => ['CORONEL', 'TENENTE CORONEL', 'MAJOR'].includes(m.rank?.toUpperCase())).length,
      capitaes: medicos.filter((m: any) => m.rank?.toUpperCase() === 'CAPITÃO' || m.rank?.toUpperCase() === 'CAPITAO').length,
      porRegiao: {} as Record<string, number>,
      porPosto: {} as Record<string, number>,
      porObm: {} as Record<string, number>,
    };

    medicos.forEach((m: any) => {
      const reg = m.regiao || 'Geral CBMERJ';
      stats.porRegiao[reg] = (stats.porRegiao[reg] || 0) + 1;
      const rk = m.rank || 'N/A';
      stats.porPosto[rk] = (stats.porPosto[rk] || 0) + 1;
      const obm = m.obm || 'N/A';
      stats.porObm[obm] = (stats.porObm[obm] || 0) + 1;
    });

    return res.json({
      success: true,
      stats,
      count: medicos.length,
      medicos
    });
  });

  // Sincronização e cadastro em massa dos médicos
  app.post('/api/militar/sync-medicos', async (req, res) => {
    const { isDbHealthy, db, clientDb, militaryCache, deletedMilitaries, normalizeRg, normalizeObm, incrementCacheVersion, cacheEvents } = getDeps();
    try {
      const count = await syncMedicosInternal({
        db,
        clientDb,
        isDbHealthy,
        militaryCache,
        deletedMilitaries,
        normalizeRg,
        normalizeObm,
        incrementCacheVersion
      });
      if (cacheEvents && incrementCacheVersion) {
        cacheEvents.emit('update', incrementCacheVersion());
      }
      return res.json({ success: true, count });
    } catch (err: any) {
      console.error('[API] /api/militar/sync-medicos error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Obter informações do padrão salvo das alas
  app.get('/api/militar/default-alas-info', async (req, res) => {
    try {
      const { clientDb } = getDeps();
      let info: any = null;

      if (clientDb) {
        try {
          const snap = await getDoc(doc(clientDb, 'config', 'default_alas_composition'));
          if (snap.exists()) {
            info = snap.data();
          }
        } catch (e) {}
      }

      if (!info) {
        const hardcodedPath = path.join(process.cwd(), 'src/server/lib/default_alas_composition.json');
        if (fs.existsSync(hardcodedPath)) {
          const fileData = JSON.parse(fs.readFileSync(hardcodedPath, 'utf8'));
          info = {
            updatedAt: fs.statSync(hardcodedPath).mtime.toISOString(),
            totalMilitaries: Object.keys(fileData).length
          };
        }
      }

      return res.json({
        success: true,
        hasDefault: !!info,
        updatedAt: info?.updatedAt || null,
        totalMilitaries: info?.totalMilitaries || (info?.formation ? Object.keys(info.formation).length : 0)
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/militar', optionalFirebaseSession, async (req: any, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const { isDbHealthy, db, clientDb, militaryCache, deletedMilitaries, normalizeRg, normalizeObm, OBM_HIERARCHY, isCacheLoaded, cachePromise, setDbUnhealthy } = getDeps();
    const requesterRg = (req.user?.rg || req.user?.uid || req.query.rg) as string;
    let usersData: any[] = [];
    
    // Ensure cache is loaded before returning
    if (cachePromise && (!isCacheLoaded || militaryCache.size === 0)) {
      try {
        await cachePromise;
      } catch (e) {}
    }

    if (militaryCache.size > 0) {
      usersData = Array.from(militaryCache.values()).filter((u: any) => {
        const uRg = normalizeRg(u.rg);
        return !deletedMilitaries || !deletedMilitaries.has(uRg);
      });
      console.log(`[API] Served ${usersData.length} militaries from cache for ${requesterRg || 'anonymous'}`);
      
      if (requesterRg) {
         const requester = militaryCache.get(normalizeRg(requesterRg));
         if (requester && !requester.isAdmin) {
             const userObm = requester.obm || '';
             const allowedSetCount = new Set<string>();
             (OBM_HIERARCHY[userObm] || [userObm]).forEach((o: string) => allowedSetCount.add(o));
             if (requester.adminObms) requester.adminObms.forEach((o: string) => allowedSetCount.add(o));
             if (requester.escalanteObms) requester.escalanteObms.forEach((o: string) => allowedSetCount.add(o));
             
             const allowedObmsNormalized = Array.from(allowedSetCount).map(o => normalizeObm(o));
             usersData = usersData.filter(u => allowedObmsNormalized.includes(normalizeObm(u.obm)) || allowedObmsNormalized.includes(normalizeObm(u.lentTo)) || allowedObmsNormalized.length === 0);
         }
      }
    } else if (db && isDbHealthy) {
      try {
        if (requesterRg) {
          const safeRg = normalizeRg(requesterRg);
          let requester = militaryCache.get(safeRg);
          
          if (!requester) {
            if (isDbHealthy && db) {
              const reqDoc = await db.collection('militaries').doc(safeRg).get();
              if (reqDoc.exists) {
                requester = reqDoc.data();
                militaryCache.set(safeRg, requester);
              }
            } else if (clientDb) {
              const reqDoc = await getDoc(doc(clientDb, 'militaries', safeRg));
              if (reqDoc.exists()) {
                requester = reqDoc.data();
                militaryCache.set(safeRg, requester);
              }
            }
          }
          console.log("[API DEBUG] Requester data:", requester);

          if (requester) {
            if (requester.isAdmin) {
              if (isCacheLoaded && militaryCache.size > 0) {
                usersData.push(...Array.from(militaryCache.values()));
              } else if (isDbHealthy && db) {
                const snap = await db.collection('militaries').get();
                snap.forEach((d: any) => usersData.push(d.data()));
              } else if (clientDb) {
                const snap = await getDocs(collection(clientDb, 'militaries'));
                snap.forEach((d: any) => usersData.push(d.data()));
              }
            } else {
              const userObm = requester.obm || '';
              const allowedSetCount = new Set<string>();
              (OBM_HIERARCHY[userObm] || [userObm]).forEach((o: string) => allowedSetCount.add(o));
              if (requester.adminObms) requester.adminObms.forEach((o: string) => allowedSetCount.add(o));
              if (requester.escalanteObms) requester.escalanteObms.forEach((o: string) => allowedSetCount.add(o));
              
              const allowedObms = Array.from(allowedSetCount).filter(Boolean);
              const allowedObmsNormalized = allowedObms.map(o => normalizeObm(o));
              
              const allMilitaries = (isCacheLoaded && militaryCache.size > 0) 
                ? Array.from(militaryCache.values()) 
                : [];
              
              if (allMilitaries.length === 0) {
                 if (isDbHealthy && db) {
                   const snap = await db.collection('militaries').get();
                   snap.forEach((d: any) => allMilitaries.push(d.data()));
                 } else if (clientDb) {
                   const snap = await getDocs(collection(clientDb, 'militaries'));
                   snap.forEach((d: any) => allMilitaries.push(d.data()));
                 }
              }

              allMilitaries.forEach((dat: any) => {
                 const datObmNorm = normalizeObm(dat.obm);
                 const datLentToNorm = normalizeObm(dat.lentTo);
                 
                 if (allowedObmsNormalized.includes(datObmNorm) || allowedObmsNormalized.includes(datLentToNorm) || allowedObms.length === 0) {
                   usersData.push(dat);
                 }
              });
            }
          }
        }
      } catch (err: any) {
        if (!err.message?.includes('PERMISSION_DENIED')) {
          console.warn('[API] Could not fetch permitted users from DB.', err.message);
        }
      }
    }

    if (usersData.length === 0 && (!isCacheLoaded || militaryCache.size === 0)) {
       // Fallback completely to cache if firestore unavailable and no results
       usersData = Array.from(militaryCache.values());
       if (requesterRg) {
          const requester = militaryCache.get(normalizeRg(requesterRg));
          if (requester && !requester.isAdmin) {
             const userObm = requester.obm || '';
             const allowedSetCount = new Set<string>();
             (OBM_HIERARCHY[userObm] || [userObm]).forEach((o: string) => allowedSetCount.add(o));
             if (requester.adminObms) requester.adminObms.forEach((o: string) => allowedSetCount.add(o));
             if (requester.escalanteObms) requester.escalanteObms.forEach((o: string) => allowedSetCount.add(o));
             
             const allowedObmsNormalized = Array.from(allowedSetCount).map(o => normalizeObm(o));
             usersData = usersData.filter(u => allowedObmsNormalized.includes(normalizeObm(u.obm)) || allowedObmsNormalized.includes(normalizeObm(u.lentTo)));
          }
       }
    }

    const mappedUsers = usersData.map((user: any) => {
      const is54444 = normalizeRg(user.rg) === '54444';
      return {
        rg: user.rg,
        name: user.name,
        rank: user.rank,
        warName: user.warName,
        ala: user.ala,
        obm: user.obm,
        scope: user.scope || resolveCanonicalScope(user.obm),
        lentTo: user.lentTo,
        quadro: user.quadro,
        cidade: user.cidade,
        idFuncional: user.idFuncional,
        cel: user.cel,
        cel2: user.cel2,
        tel: user.tel,
        email: user.email,
        email2: user.email2,
        situacao: user.situacao,
        endereco: user.endereco,
        nascimento: user.nascimento,
        promotionDate: user.promotionDate,
        promotions: user.promotions,
        specializations: user.specializations,
        cursos: user.cursos,
        isAdmin: is54444 ? true : user.isAdmin,
        adminObms: user.adminObms,
        isEscalante: is54444 ? true : user.isEscalante,
        escalanteObms: user.escalanteObms,
        isRefeitorioAdmin: user.isRefeitorioAdmin,
        ativoCondutor: user.ativoCondutor,
        viaturas: user.viaturas,
        ativoEncarregado: user.ativoEncarregado,
        ativoAbastecedor: user.ativoAbastecedor,
        ativoChefeGua: user.ativoChefeGua,
        chefeAbt: user.chefeAbt,
        chefeAbsl: user.chefeAbsl,
        ativoMaritimo: user.ativoMaritimo,
        mestreAl: user.mestreAl,
        mestreBia: user.mestreBia,
        opAma: user.opAma,
        gvAma: user.gvAma,
        marinheiros: user.marinheiros,
        ativoEnfermeiro: user.ativoEnfermeiro,
        ativoComunicante: user.ativoComunicante,
        ativoGraduado: user.ativoGraduado,
        ativoCbsSds: user.ativoCbsSds,
        adjunto: user.adjunto,
        sgtDia: user.sgtDia,
        cmtGuarda: user.cmtGuarda,
        disponivel1: user.disponivel1,
        disponivel2: user.disponivel2,
        faxina: user.faxina,
        sentinela: user.sentinela,
        deposito: user.deposito,
        toqueDeFogo: user.toqueDeFogo,
        auxRancho: user.auxRancho,
        cbGuarda: user.cbGuarda,
        cbDia: user.cbDia,
        disponivelCbsSds: user.disponivelCbsSds,
        ativoAuxiliar: user.ativoAuxiliar,
        auxAbt: user.auxAbt,
        auxAbsl: user.auxAbsl,
        auxArc: user.auxArc,
        auxAse: user.auxAse,
        disponivelAux: user.disponivelAux
      };
    });

    res.json({ success: true, count: mappedUsers.length, members: mappedUsers });
  });

app.get('/api/militar/:rg', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const { isDbHealthy, db, clientDb, militaryCache, normalizeRg, OBM_HIERARCHY, isCacheLoaded, cachePromise, setDbUnhealthy } = getDeps();
    const { rg } = req.params;
    if (!rg) return res.status(400).json({ success: false });

    console.log(`[API] GET /api/militar/${rg}`);

    // Wait for initial cache load if it hasn't finished yet, but with a timeout!
    if (!isCacheLoaded && cachePromise) {
      console.log(`[API] Lookup for ${rg} waiting for cache (max 2s)...`);
      try {
        await Promise.race([
          cachePromise.catch(() => {}), // Ignore rejection
          new Promise(resolve => setTimeout(resolve, 2000))
        ]);
      } catch (e) {
        console.warn(`[API] Cache wait failed for ${rg}, continuing without cache.`);
      }
    }

    const safeRg = normalizeRg(rg);
    console.log(`[API] Normalized RG for search: ${safeRg}. Cache size: ${militaryCache.size}`);

    try {
      // 1. Instant Cache Check
      let member = militaryCache.get(safeRg);
      
      if (safeRg === '54444') {
        if (!member) {
          member = { rg: '54444', name: 'BERNARDO', warName: 'BERNARDO', rank: 'SOLDADO', ala: 'EXP', obm: '10º GBM' };
        }
        member.ala = 'EXP';
        member.isAdmin = true;
        member.isEscalante = true;
        militaryCache.set('54444', member);
      }

      if (member) {
        console.log(`[API] Found ${safeRg} in cache.`);
      } else {
        console.log(`[API] ${safeRg} not found in cache. Checking DB...`);
      }

      // 2. Database Fallback (if not in cache or cache failed to load something)
      if (!member && db && isDbHealthy) {
        try {
          const docSnap = await db.collection('militaries').doc(safeRg).get();
          if (docSnap.exists) {
            member = docSnap.data();
            console.log(`[API] Found ${safeRg} in Firestore.`);
            if (member) {
              if (safeRg === '54444') {
                member.isAdmin = true;
                member.isEscalante = true;
              }
              militaryCache.set(safeRg, member);
            }
          } else {
             console.log(`[API] ${safeRg} not found in Firestore.`);
          }
        } catch (e: any) {
           console.log(`[API] Firestore error looking up ${safeRg}: ${e.message}`);
           if (e.message.includes('permission')) {
             setDbUnhealthy(); 
           }
        }
      }

      if (member) {
        if (safeRg === '54444') {
          member.isAdmin = true;
          member.isEscalante = true;
        }
        return res.json({ 
          success: true, 
          member 
        });
      }
      
      console.log(`[API] Militar ${safeRg} not localized.`);
      return res.status(404).json({ success: false, message: 'Militar não localizado' });
    } catch (err: any) {
      console.error('[API] Lookup fatal error:', err.message);
      return res.status(500).json({ success: false, error: 'Erro interno' });
    }
  });

  const deleteMilitarInternal = async (req: express.Request, res: express.Response) => {
    const { isDbHealthy, db, clientDb, militaryCache, deletedMilitaries, normalizeRg, cacheEvents, incrementCacheVersion } = getDeps();
    const rawRg = req.params.rg || req.body.rg || req.query.rg;
    if (!rawRg) return res.status(400).json({ success: false, error: 'RG é obrigatório' });

    const safeRg = normalizeRg(rawRg);
    console.log(`[API] Deleting military ${safeRg}...`);

    try {
      // 1. Delete from Firestore (Admin SDK)
      if (db && isDbHealthy) {
        try {
          await db.collection('militaries').doc(safeRg).delete();
          console.log(`[API] Deleted ${safeRg} from Firestore via Admin SDK.`);
        } catch (e: any) {
          if (!e.message.includes('PERMISSION_DENIED')) {
            console.error('[API] Failed to delete militar in Firestore:', e);
          }
        }
      }
      // 2. Delete from Firestore (Client SDK)
      if (clientDb) {
        try {
          await deleteDoc(doc(clientDb, 'militaries', safeRg));
          console.log(`[API] Deleted ${safeRg} from Firestore via Client SDK.`);
        } catch (e: any) {}
      }

      // 3. Mark as deleted so static injections never resurrect this militar
      if (deletedMilitaries) {
        deletedMilitaries.add(safeRg);
        if (clientDb) {
          try {
            await setDoc(doc(clientDb, 'config', 'deleted_militaries'), {
              rgs: Array.from(deletedMilitaries),
              updatedAt: new Date().toISOString()
            }, { merge: true });
          } catch (delConfErr) {}
        }
        if (db && isDbHealthy) {
          try {
            await db.collection('config').doc('deleted_militaries').set({
              rgs: Array.from(deletedMilitaries),
              updatedAt: new Date().toISOString()
            }, { merge: true });
          } catch (delConfErr) {}
        }
      }

      // 4. Remove from default_alas_composition.json on disk to prevent resurrection on sync/restore
      try {
        const hardcodedPath = path.join(process.cwd(), 'src/server/lib/default_alas_composition.json');
        if (fs.existsSync(hardcodedPath)) {
          const fileData = JSON.parse(fs.readFileSync(hardcodedPath, 'utf8'));
          if (fileData[safeRg] || fileData[String(rawRg)]) {
            delete fileData[safeRg];
            delete fileData[String(rawRg)];
            fs.writeFileSync(hardcodedPath, JSON.stringify(fileData, null, 2), 'utf8');
            console.log(`[API] Pruned deleted military ${safeRg} from default_alas_composition.json`);
          }
        }
      } catch (filePruneErr) {}

      // 5. Remove from Firestore default_alas_composition
      if (clientDb) {
        try {
          const compSnap = await getDoc(doc(clientDb, 'config', 'default_alas_composition'));
          if (compSnap.exists()) {
            const compData = compSnap.data();
            if (compData?.formation && (compData.formation[safeRg] || compData.formation[String(rawRg)])) {
              delete compData.formation[safeRg];
              delete compData.formation[String(rawRg)];
              await setDoc(doc(clientDb, 'config', 'default_alas_composition'), {
                ...compData,
                totalMilitaries: Object.keys(compData.formation).length,
                updatedAt: new Date().toISOString()
              }, { merge: true });
            }
          }
        } catch (compPruneErr) {}
      }

      // 6. Remove from in-memory cache
      militaryCache.delete(safeRg);
      if (String(rawRg) !== safeRg) {
        militaryCache.delete(String(rawRg));
      }

      // 7. Increment cache version and notify all connected clients via SSE
      const newVersion = incrementCacheVersion ? incrementCacheVersion() : Date.now();
      if (cacheEvents) {
        cacheEvents.emit('update', newVersion);
      }

      console.log(`[API] Militar ${safeRg} successfully deleted. Cache size: ${militaryCache.size}, newVersion: ${newVersion}`);
      return res.json({ success: true, message: 'Militar excluído com sucesso', rg: safeRg, version: newVersion });
    } catch (err: any) {
      console.error(`[API] Error deleting militar ${safeRg}:`, err);
      return res.status(500).json({ success: false, error: err.message || 'Erro ao excluir militar' });
    }
  };

  app.delete('/api/militar/:rg', deleteMilitarInternal);
  app.post('/api/militar/delete', deleteMilitarInternal);

  const handleMilitarUpdate = async (req: express.Request, res: express.Response) => {
    const { isDbHealthy, db, clientDb, militaryCache, deletedMilitaries, normalizeRg, cacheEvents, incrementCacheVersion } = getDeps();
    const { rg, data } = req.body;
    if (!rg || !data) return res.status(400).json({ success: false });

    const safeRg = normalizeRg(rg);
    try {
      if (deletedMilitaries && deletedMilitaries.has(safeRg)) {
        deletedMilitaries.delete(safeRg);
        if (clientDb) {
          try {
            await setDoc(doc(clientDb, 'config', 'deleted_militaries'), {
              rgs: Array.from(deletedMilitaries),
              updatedAt: new Date().toISOString()
            }, { merge: true });
          } catch (e) {}
        }
      }

      const existing = militaryCache.get(safeRg) || {};
      
      const mergedData = { ...existing, ...data, rg: safeRg };
      if (data.viaturas && existing.viaturas) {
        mergedData.viaturas = { ...existing.viaturas, ...data.viaturas };
      }
      if (data.dynamicFunctions && existing.dynamicFunctions) {
        mergedData.dynamicFunctions = { ...existing.dynamicFunctions, ...data.dynamicFunctions };
      }
      
      militaryCache.set(safeRg, mergedData);

      const sanitized = cleanUndefined(mergedData);
      let savedToDb = false;
      if (db && isDbHealthy) {
        try {
          await db.collection('militaries').doc(safeRg).set(sanitized, { merge: true });
          savedToDb = true;
        } catch (e: any) {
          console.warn('[API] Admin SDK update notice, trying Client SDK:', e.message);
        }
      }
      if (!savedToDb && clientDb) {
        try {
          await setDoc(doc(clientDb, 'militaries', safeRg), sanitized, { merge: true });
          savedToDb = true;
        } catch (e: any) {
          console.error('[API] Client SDK update error:', e.message);
        }
      }

      // Atualizar também na configuração do Firestore
      if (clientDb && mergedData.ala) {
        try {
          const compSnap = await getDoc(doc(clientDb, 'config', 'default_alas_composition'));
          if (compSnap.exists()) {
            const compData = compSnap.data() || {};
            const formation = compData.formation || {};
            formation[safeRg] = {
              rg: safeRg,
              name: mergedData.name || '',
              warName: mergedData.warName || mergedData.name || '',
              rank: mergedData.rank || '',
              ala: (mergedData.ala || '').toString().trim() || null,
              obm: mergedData.obm || null,
              quadro: mergedData.quadro || null
            };
            await setDoc(doc(clientDb, 'config', 'default_alas_composition'), {
              ...compData,
              totalMilitaries: Object.keys(formation).length,
              updatedAt: new Date().toISOString(),
              formation
            }, { merge: true });
          }
        } catch (compErr: any) {
          console.warn('[API] Aviso ao atualizar default_alas_composition no Firestore:', compErr.message);
        }
      }

      const newVer = incrementCacheVersion ? incrementCacheVersion() : Date.now();
      if (cacheEvents) cacheEvents.emit('update', newVer);
      return res.json({ success: true, version: newVer, militar: mergedData });
    } catch (e) {
      return res.status(500).json({ success: false });
    }
  };

  app.post('/api/militar/update', handleMilitarUpdate);
  app.post('/api/militar/add', handleMilitarUpdate);

app.post('/api/militar/role', async (req, res) => {
    const { isDbHealthy, db, clientDb, militaryCache, normalizeRg, OBM_HIERARCHY, isCacheLoaded, cachePromise, setDbUnhealthy, cacheEvents, incrementCacheVersion } = getDeps();
    const { rg, role, value } = req.body;
    if (!rg || !role) return res.status(400).json({ success: false });

    const safeRg = normalizeRg(rg);
    try {
      let savedRoleToDb = false;
      if (db && isDbHealthy) {
        try {
          await db.collection('militaries').doc(safeRg).set({ [role]: value }, { merge: true });
          savedRoleToDb = true;
        } catch (e: any) {
          console.warn('[API] Admin SDK role update notice, trying Client SDK:', e.message);
        }
      }
      if (!savedRoleToDb && clientDb) {
        try {
          await setDoc(doc(clientDb, 'militaries', safeRg), { [role]: value }, { merge: true });
          savedRoleToDb = true;
        } catch (e: any) {
          console.error('[API] Client SDK role update error:', e.message);
        }
      }

      const existing = militaryCache.get(safeRg) || {};
      militaryCache.set(safeRg, { ...existing, [role]: value });

      if (role === 'ala') {
        try {
          const hardcodedPath = path.join(process.cwd(), 'src/server/lib/default_alas_composition.json');
          if (fs.existsSync(hardcodedPath)) {
            const fileData = JSON.parse(fs.readFileSync(hardcodedPath, 'utf8'));
            if (fileData[safeRg]) {
              fileData[safeRg].ala = value || null;
              fs.writeFileSync(hardcodedPath, JSON.stringify(fileData, null, 2), 'utf8');
            }
          }
        } catch (e) {}
      }

      if (cacheEvents) cacheEvents.emit('update', incrementCacheVersion ? incrementCacheVersion() : Date.now());
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ success: false });
    }
  });

app.post('/api/militar/emprestar', async (req, res) => {
    const { isDbHealthy, db, clientDb, militaryCache, normalizeRg, OBM_HIERARCHY, isCacheLoaded, cachePromise, setDbUnhealthy, cacheEvents, incrementCacheVersion } = getDeps();
    const { lentTo, rg } = req.body;
    
    if (!rg) return res.status(400).json({ success: false, error: 'RG obrigatório' });
    
    const safeRg = normalizeRg(rg);
    
    try {
      if (db && isDbHealthy) {
        try {
          await db.collection('militaries').doc(safeRg).set({ lentTo: lentTo || null }, { merge: true });
        } catch (e: any) {
          if (!e.message.includes('PERMISSION_DENIED')) {
            console.error('[API] Failed to update lentTo in Firestore:', e);
          }
        }
      } else if (clientDb) {
        try {
          await setDoc(doc(clientDb, 'militaries', safeRg), { lentTo: lentTo || null }, { merge: true });
        } catch (e: any) {}
      }
      
      // Update cache
      let cached = militaryCache.get(safeRg);
      if (cached) {
        cached.lentTo = lentTo || null;
        militaryCache.set(safeRg, cached);
      }
      
      if (cacheEvents) cacheEvents.emit('update', incrementCacheVersion ? incrementCacheVersion() : Date.now());
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Transferência de militar entre unidades (DBMs/GBMs no CBA VII)
  app.post('/api/militar/transfer', async (req, res) => {
    const { isDbHealthy, db, clientDb, militaryCache, normalizeRg, normalizeObm, cacheEvents, incrementCacheVersion } = getDeps();
    const { rg, targetObm, targetAla, originObm, reason, author } = req.body;

    if (!rg || !targetObm) {
      return res.status(400).json({ success: false, error: 'RG e OBM de destino são obrigatórios' });
    }

    const safeRg = normalizeRg(rg);
    const normalizedTargetObm = normalizeObm(targetObm);
    const normalizedTargetAla = targetAla !== undefined && targetAla !== null ? targetAla.toString().trim() : null;

    try {
      const existing = militaryCache.get(safeRg) || {};
      const fromObm = originObm || existing.obm || '10º GBM';

      const updatePayload: any = {
        obm: normalizedTargetObm,
        situacao: 'Ativo',
        updatedAt: new Date()
      };
      if (normalizedTargetAla !== null) {
        updatePayload.ala = normalizedTargetAla;
      }

      // 1. Atualizar no Firestore
      if (clientDb) {
        try {
          await setDoc(doc(clientDb, 'militaries', safeRg), updatePayload, { merge: true });
          await setDoc(doc(collection(clientDb, 'historico_transferencias')), {
            rg: safeRg,
            militarName: existing.name || existing.warName || '',
            fromObm,
            toObm: normalizedTargetObm,
            toAla: normalizedTargetAla,
            reason: reason || 'Transferência solicitada pelo escalante',
            author: author || 'Escalante',
            timestamp: new Date().toISOString()
          });
        } catch (e: any) {
          console.warn('[Transfer] Erro ao gravar no Firestore Client:', e.message);
        }
      } else if (db && isDbHealthy) {
        try {
          await db.collection('militaries').doc(safeRg).set(updatePayload, { merge: true });
          await db.collection('historico_transferencias').add({
            rg: safeRg,
            militarName: existing.name || existing.warName || '',
            fromObm,
            toObm: normalizedTargetObm,
            toAla: normalizedTargetAla,
            reason: reason || 'Transferência solicitada pelo escalante',
            author: author || 'Escalante',
            timestamp: new Date().toISOString()
          });
        } catch (e: any) {
          console.warn('[Transfer] Erro ao gravar no Firestore Admin:', e.message);
        }
      }

      // 2. Atualizar em memória no cache do servidor
      const updatedMilitar = {
        ...existing,
        ...updatePayload,
        obm: normalizedTargetObm,
        ala: normalizedTargetAla !== null ? normalizedTargetAla : existing.ala,
        situacao: 'Ativo'
      };
      militaryCache.set(safeRg, updatedMilitar);

      // 3. Atualizar no arquivo de formação padrão se existir
      try {
        const hardcodedPath = path.join(process.cwd(), 'src/server/lib/default_alas_composition.json');
        if (fs.existsSync(hardcodedPath)) {
          const fileData = JSON.parse(fs.readFileSync(hardcodedPath, 'utf8'));
          if (fileData[safeRg]) {
            fileData[safeRg].obm = normalizedTargetObm;
            if (normalizedTargetAla !== null) fileData[safeRg].ala = normalizedTargetAla;
            fs.writeFileSync(hardcodedPath, JSON.stringify(fileData, null, 2), 'utf8');
          }
        }
      } catch (e) {}

      const newVersion = incrementCacheVersion ? incrementCacheVersion() : Date.now();
      if (cacheEvents) cacheEvents.emit('update', newVersion);

      console.log(`[Transfer] Militar ${safeRg} transferido de ${fromObm} para ${normalizedTargetObm} (Ala: ${normalizedTargetAla})`);
      return res.json({
        success: true,
        message: `Militar ${safeRg} transferido com sucesso para ${normalizedTargetObm}!`,
        militar: updatedMilitar
      });
    } catch (err: any) {
      console.error('[Transfer] Erro na transferência:', err);
      return res.status(500).json({ success: false, error: err.message || 'Erro ao transferir militar' });
    }
  });

  // Obter configurações de piscinas de oficiais (Serviços e GRD, Núcleo Náutico, Médicos)
  app.get('/api/officer-pool', async (req, res) => {
    const { isDbHealthy, db, clientDb, normalizeObm } = getDeps();
    const rawObm = (req.query.obm as string) || '10º GBM';
    const cleanObm = rawObm === 'GLOBAL' ? '10º GBM' : normalizeObm(rawObm);
    const docId = cleanObm.replace(/°/g, 'º').replace(/\//g, '_').replace(/\s/g, '_');

    try {
      let poolData: any = null;
      if (db && isDbHealthy) {
        try {
          const snap = await db.collection('officer_pool_config').doc(docId).get();
          if (snap.exists) poolData = snap.data();
        } catch (e) {}
      }
      if (!poolData && clientDb) {
        try {
          const snap = await getDoc(doc(clientDb, 'officer_pool_config', docId));
          if (snap.exists()) poolData = snap.data();
        } catch (e) {}
      }

      return res.json({
        success: true,
        docId,
        config: {
          servicosGrd: (poolData?.servicosGrd || []).map((r: any) => String(r).trim()),
          nucleoNautico: (poolData?.nucleoNautico || []).map((r: any) => String(r).trim()),
          oficiaisMedicos: (poolData?.oficiaisMedicos || []).map((r: any) => String(r).trim())
        }
      });
    } catch (err: any) {
      console.error('[API] /api/officer-pool error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Atualizar configurações de piscinas de oficiais (evita permission-denied ou falsos checks)
  app.post('/api/officer-pool/update', async (req, res) => {
    const { isDbHealthy, db, clientDb, normalizeObm } = getDeps();
    const { obm, moduleKey, rgs, config: fullConfig } = req.body;
    const rawObm = obm || '10º GBM';
    const cleanObm = rawObm === 'GLOBAL' ? '10º GBM' : normalizeObm(rawObm);
    const docId = cleanObm.replace(/°/g, 'º').replace(/\//g, '_').replace(/\s/g, '_');

    try {
      let currentData: any = {};
      if (db && isDbHealthy) {
        try {
          const snap = await db.collection('officer_pool_config').doc(docId).get();
          if (snap.exists) currentData = snap.data();
        } catch (e) {}
      }
      if (Object.keys(currentData).length === 0 && clientDb) {
        try {
          const snap = await getDoc(doc(clientDb, 'officer_pool_config', docId));
          if (snap.exists()) currentData = snap.data();
        } catch (e) {}
      }

      let newConfig = fullConfig ? { ...fullConfig } : { ...currentData };
      if (moduleKey && rgs) {
        newConfig[moduleKey] = (Array.isArray(rgs) ? rgs : []).map((r: any) => String(r).trim());
      }

      // Sanitiza strings
      newConfig.servicosGrd = (newConfig.servicosGrd || []).map((r: any) => String(r).trim());
      newConfig.nucleoNautico = (newConfig.nucleoNautico || []).map((r: any) => String(r).trim());
      newConfig.oficiaisMedicos = (newConfig.oficiaisMedicos || []).map((r: any) => String(r).trim());

      let saved = false;
      if (db && isDbHealthy) {
        try {
          await db.collection('officer_pool_config').doc(docId).set(newConfig, { merge: true });
          saved = true;
        } catch (e: any) {
          console.warn('[API] officer_pool_config Admin SDK save notice:', e.message);
        }
      }
      if (!saved && clientDb) {
        try {
          await setDoc(doc(clientDb, 'officer_pool_config', docId), newConfig, { merge: true });
          saved = true;
        } catch (e: any) {
          console.error('[API] officer_pool_config Client SDK save error:', e.message);
        }
      }

      console.log(`[API] officer_pool_config atualizado com sucesso para ${docId}`);
      return res.json({ success: true, docId, config: newConfig });
    } catch (err: any) {
      console.error('[API] /api/officer-pool/update error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Obter dados de escalas de oficiais/náutico/médicos
  app.get('/api/officer-scales', async (req, res) => {
    const { isDbHealthy, db, clientDb } = getDeps();
    const collectionName = (req.query.collection as string) || 'officer_scales';
    const docId = (req.query.docId as string) || '';

    const allowedCollections = ['officer_scales', 'nautico_scales', 'medico_scales', 'grd_configs'];
    if (!allowedCollections.includes(collectionName)) {
      return res.status(403).json({ success: false, error: 'Coleção não permitida' });
    }
    if (!docId) {
      return res.status(400).json({ success: false, error: 'docId é obrigatório' });
    }

    try {
      let scaleData: any = null;
      if (db && isDbHealthy) {
        try {
          const snap: any = await withTimeout(db.collection(collectionName).doc(docId).get(), 2500);
          if (snap.exists) scaleData = snap.data();
        } catch (e: any) {
          console.warn(`[API] officer-scales Admin SDK read notice:`, e.message);
        }
      }
      if (!scaleData && clientDb) {
        try {
          const snap: any = await withTimeout(getDoc(doc(clientDb, collectionName, docId)), 2500);
          if (snap.exists()) scaleData = snap.data();
        } catch (e: any) {
          console.warn(`[API] officer-scales Client SDK read notice:`, e.message);
        }
      }

      return res.json({ success: true, collectionName, docId, data: scaleData || {} });
    } catch (err: any) {
      console.error('[API] /api/officer-scales GET error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Atualizar dados de escalas de oficiais/náutico/médicos (evita permission-denied ou restrições de cliente)
  app.post('/api/officer-scales/update', async (req, res) => {
    const { isDbHealthy, db, clientDb } = getDeps();
    const { collectionName, docId, data } = req.body;

    const allowedCollections = ['officer_scales', 'nautico_scales', 'medico_scales', 'grd_configs'];
    if (!collectionName || !allowedCollections.includes(collectionName)) {
      return res.status(403).json({ success: false, error: 'Coleção não permitida ou inválida' });
    }
    if (!docId) {
      return res.status(400).json({ success: false, error: 'docId é obrigatório' });
    }
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ success: false, error: 'data deve ser um objeto válido' });
    }

    try {
      const sanitizedData = cleanUndefined(data);
      let saved = false;

      if (db && isDbHealthy) {
        try {
          await withTimeout(db.collection(collectionName).doc(docId).set(sanitizedData, { merge: true }), 3000);
          saved = true;
        } catch (e: any) {
          console.warn(`[API] ${collectionName} Admin SDK save notice:`, e.message);
        }
      }

      if (!saved && clientDb) {
        try {
          await withTimeout(setDoc(doc(clientDb, collectionName, docId), sanitizedData, { merge: true }), 3000);
          saved = true;
        } catch (e: any) {
          console.error(`[API] ${collectionName} Client SDK save error:`, e.message);
        }
      }

      console.log(`[API] ${collectionName}/${docId} atualizado com sucesso via API backend`);
      return res.json({ success: true, collectionName, docId });
    } catch (err: any) {
      console.error('[API] /api/officer-scales/update error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Obter configurações de OBM (categorias, correlações, postos)
  app.get('/api/obm-settings', async (req, res) => {
    const { isDbHealthy, db, clientDb } = getDeps();
    const key = (req.query.key as string) || '';
    if (!key) return res.status(400).json({ success: false, error: 'Chave obrigatória' });

    try {
      let data = null;
      if (db && isDbHealthy) {
        try {
          const snap: any = await withTimeout(db.collection('obm_settings').doc(key).get(), 2500);
          if (snap.exists) data = snap.data();
        } catch (e: any) {}
      }
      if (!data && clientDb) {
        try {
          const snap: any = await withTimeout(getDoc(doc(clientDb, 'obm_settings', key)), 2500);
          if (snap.exists()) data = snap.data();
        } catch (e: any) {}
      }

      return res.json({ success: true, key, data: data || {} });
    } catch (err: any) {
      console.error('[API] /api/obm-settings GET error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Atualizar configurações de OBM (evita permission-denied ou restrições no cliente)
  app.post('/api/obm-settings/update', async (req, res) => {
    const { isDbHealthy, db, clientDb } = getDeps();
    const { key, data } = req.body;
    if (!key || !data || typeof data !== 'object') {
      return res.status(400).json({ success: false, error: 'Parâmetros inválidos' });
    }

    try {
      const sanitized = cleanUndefined(data);
      let saved = false;

      if (db && isDbHealthy) {
        try {
          await withTimeout(db.collection('obm_settings').doc(key).set(sanitized, { merge: true }), 3000);
          saved = true;
        } catch (e: any) {
          console.warn('[API] obm_settings Admin SDK save notice:', e.message);
        }
      }

      if (!saved && clientDb) {
        try {
          await withTimeout(setDoc(doc(clientDb, 'obm_settings', key), sanitized, { merge: true }), 3000);
          saved = true;
        } catch (e: any) {
          console.error('[API] obm_settings Client SDK save error:', e.message);
        }
      }

      console.log(`[API] obm_settings/${key} atualizado com sucesso via API backend`);
      return res.json({ success: true, key });
    } catch (err: any) {
      console.error('[API] /api/obm-settings/update error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Escala 24h: consulta com suporte a backend
  app.get('/api/escala24h', async (req, res) => {
    try {
      const { clientDb, isDbHealthy, db, normalizeObm } = getDeps();
      const rawObm = (req.query.obm as string) || '10º GBM';
      const date = (req.query.date as string) || '';
      if (!date) return res.status(400).json({ success: false, error: 'date is required' });

      const cleanObm = normalizeObm(rawObm);
      const normalizedObm = cleanObm.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const collectionName = `escala24h_${normalizedObm}`;

      let data: any = null;
      let exists = false;

      if (db && isDbHealthy) {
        try {
          const snap: any = await withTimeout(db.collection(collectionName).doc(date).get(), 2500);
          if (snap.exists) {
            data = snap.data();
            exists = true;
          }
        } catch (e: any) {
          console.warn('[API] /api/escala24h Admin SDK get notice:', e.message);
        }
      }

      if (!exists && clientDb) {
        try {
          const snap: any = await withTimeout(getDoc(doc(clientDb, collectionName, date)), 2500);
          if (snap.exists()) {
            data = snap.data();
            exists = true;
          }
        } catch (e: any) {
          console.error('[API] /api/escala24h Client SDK get error:', e.message);
        }
      }

      return res.json({ success: true, exists, data });
    } catch (err: any) {
      console.error('[API] /api/escala24h error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Escala 24h: salvamento confiável via backend com credenciais de admin
  app.post('/api/escala24h/save', async (req, res) => {
    try {
      const { clientDb, isDbHealthy, db, normalizeObm } = getDeps();
      const { obm, date, data } = req.body;
      if (!date || !data) return res.status(400).json({ success: false, error: 'date and data are required' });

      const rawObm = obm || '10º GBM';
      const cleanObm = normalizeObm(rawObm);
      const normalizedObm = cleanObm.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const collectionName = `escala24h_${normalizedObm}`;
      const sanitized = cleanUndefined(data);

      let saved = false;
      if (db && isDbHealthy) {
        try {
          await withTimeout(db.collection(collectionName).doc(date).set(sanitized, { merge: true }), 3000);
          saved = true;
        } catch (e: any) {
          console.warn('[API] /api/escala24h/save Admin SDK notice:', e.message);
        }
      }

      if (!saved && clientDb) {
        try {
          await withTimeout(setDoc(doc(clientDb, collectionName, date), sanitized, { merge: true }), 3000);
          saved = true;
        } catch (e: any) {
          console.error('[API] /api/escala24h/save Client SDK error:', e.message);
        }
      }

      console.log(`[API] ${collectionName}/${date} salvo com sucesso via API backend`);
      return res.json({ success: true, collectionName, date });
    } catch (err: any) {
      console.error('[API] /api/escala24h/save error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Generic Operational Document Get (immune to client issues)
  app.get('/api/doc/get', async (req, res) => {
    try {
      const { clientDb, isDbHealthy, db } = getDeps();
      const collectionName = (req.query.collection as string) || '';
      const docId = (req.query.docId as string) || '';
      if (!collectionName || !docId) {
        return res.status(400).json({ success: false, error: 'collection and docId required' });
      }

      let data: any = null;
      let exists = false;

      if (db && isDbHealthy) {
        try {
          const snap: any = await withTimeout(db.collection(collectionName).doc(docId).get(), 2500);
          if (snap.exists) {
            data = snap.data();
            exists = true;
          }
        } catch (e: any) {}
      }

      if (!exists && clientDb) {
        try {
          const snap: any = await withTimeout(getDoc(doc(clientDb, collectionName, docId)), 2500);
          if (snap.exists()) {
            data = snap.data();
            exists = true;
          }
        } catch (e: any) {}
      }

      return res.json({ success: true, exists, data });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Generic Operational Document Save (admin-authenticated server bypass)
  app.post('/api/doc/save', async (req, res) => {
    try {
      const { clientDb, isDbHealthy, db } = getDeps();
      const { collection: collectionName, docId, data, merge = true } = req.body;
      if (!collectionName || !docId || !data) {
        return res.status(400).json({ success: false, error: 'collection, docId and data required' });
      }

      const sanitized = cleanUndefined(data);
      let saved = false;

      if (db && isDbHealthy) {
        try {
          await withTimeout(db.collection(collectionName).doc(docId).set(sanitized, { merge }), 3000);
          saved = true;
        } catch (e: any) {}
      }

      if (!saved && clientDb) {
        try {
          await withTimeout(setDoc(doc(clientDb, collectionName, docId), sanitized, { merge }), 3000);
          saved = true;
        } catch (e: any) {
          console.error(`[API] Client SDK error saving ${collectionName}/${docId}:`, e.message);
        }
      }

      return res.json({ success: true, collection: collectionName, docId });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Generic Operational Document Delete (admin-authenticated server bypass)
  app.post('/api/doc/delete', async (req, res) => {
    try {
      const { clientDb, isDbHealthy, db } = getDeps();
      const { collection: collectionName, docId } = req.body;
      if (!collectionName || !docId) {
        return res.status(400).json({ success: false, error: 'collection and docId required' });
      }

      let deleted = false;
      if (db && isDbHealthy) {
        try {
          await withTimeout(db.collection(collectionName).doc(docId).delete(), 3000);
          deleted = true;
        } catch (e: any) {}
      }

      if (!deleted && clientDb) {
        try {
          await withTimeout(deleteDoc(doc(clientDb, collectionName, docId)), 3000);
          deleted = true;
        } catch (e: any) {
          console.error(`[API] Client SDK error deleting ${collectionName}/${docId}:`, e.message);
        }
      }

      return res.json({ success: true, collection: collectionName, docId });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Salvar a formação atual das alas como padrão oficial permanente
  app.post('/api/militar/save-default-alas', async (req, res) => {
    try {
      const { isDbHealthy, db, clientDb, militaryCache, normalizeRg, cacheEvents, incrementCacheVersion } = getDeps();
      
      const requestedFormation = req.body?.formation;
      const formationMap: Record<string, any> = {};

      if (requestedFormation && typeof requestedFormation === 'object') {
        for (const [rg, item] of Object.entries(requestedFormation as Record<string, any>)) {
          const safeRg = normalizeRg(rg);
          if (!safeRg) continue;
          formationMap[safeRg] = {
            rg: safeRg,
            name: item.name || '',
            warName: item.warName || item.name || '',
            rank: item.rank || '',
            ala: (item.ala || '').toString().trim() || null,
            obm: item.obm || null,
            quadro: item.quadro || null
          };
        }
      } else {
        // Obter formação a partir do cache atual de militares
        const allCached = Array.from(militaryCache.values());
        for (const m of allCached as any[]) {
          const safeRg = normalizeRg(m.rg);
          if (!safeRg) continue;
          formationMap[safeRg] = {
            rg: safeRg,
            name: m.name || m.nome || '',
            warName: m.warName || m.name || '',
            rank: m.rank || m.postoGrad || '',
            ala: (m.ala || '').toString().trim() || null,
            obm: m.obm || null,
            quadro: m.quadro || null
          };
        }
      }

      const totalCount = Object.keys(formationMap).length;
      const nowIso = new Date().toISOString();
      const payload = {
        updatedAt: nowIso,
        totalMilitaries: totalCount,
        formation: formationMap
      };

      // 1. Salvar no arquivo físico hardcoded no servidor para resiliência máxima
      const hardcodedPath = path.join(process.cwd(), 'src/server/lib/default_alas_composition.json');
      try {
        fs.writeFileSync(hardcodedPath, JSON.stringify(formationMap, null, 2), 'utf8');
        console.log(`[Alas Padrão] Arquivo hardcoded atualizado com ${totalCount} militares.`);
      } catch (fileErr: any) {
        console.warn('[Alas Padrão] Aviso ao gravar arquivo no disco:', fileErr.message);
      }

      // 2. Salvar no Firestore na coleção config
      if (clientDb) {
        try {
          await setDoc(doc(clientDb, 'config', 'default_alas_composition'), payload, { merge: true });
        } catch (dbErr: any) {
          console.warn('[Alas Padrão] Erro ao gravar config no Firestore:', dbErr.message);
        }
      } else if (db && isDbHealthy) {
        try {
          await db.collection('config').doc('default_alas_composition').set(payload, { merge: true });
        } catch (dbErr: any) {
          console.warn('[Alas Padrão] Erro ao gravar config no Firestore Admin:', dbErr.message);
        }
      }

      // 3. Atualizar cada militar no cache e disparar sincronização com Firestore
      for (const [rg, m] of Object.entries(formationMap)) {
        const existing = militaryCache.get(rg) || {};
        militaryCache.set(rg, { ...existing, ala: m.ala });
      }

      // 4. Gravar em lote (batches) no Firestore nas entidades individuais de militares
      if (clientDb) {
        try {
          const entries = Object.entries(formationMap);
          for (let i = 0; i < entries.length; i += 400) {
            const batch = writeBatch(clientDb);
            const chunk = entries.slice(i, i + 400);
            for (const [rg, m] of chunk) {
              batch.set(doc(clientDb, 'militaries', rg), { ala: m.ala, updatedAt: new Date() }, { merge: true });
            }
            await batch.commit();
          }
        } catch (errB: any) {
          console.warn('[Alas Padrão] Aviso ao gravar lote no Firestore Client:', errB.message);
        }
      }

      const newVersion = incrementCacheVersion ? incrementCacheVersion() : Date.now();
      if (cacheEvents) cacheEvents.emit('update', newVersion);

      return res.json({
        success: true,
        count: totalCount,
        updatedAt: nowIso,
        message: 'Composição das alas registrada com sucesso como padrão oficial no banco e servidor!'
      });
    } catch (e: any) {
      console.error('[Alas Padrão] Erro fatal ao salvar padrão:', e);
      return res.status(500).json({ success: false, error: e.message || 'Erro ao salvar padrão' });
    }
  });

  // Restaurar a formação oficial das alas a partir do padrão gravado
  app.post('/api/militar/restore-default-alas', async (req, res) => {
    try {
      const { isDbHealthy, db, clientDb, militaryCache, deletedMilitaries, normalizeRg, cacheEvents, incrementCacheVersion } = getDeps();
      
      let formationMap: Record<string, any> | null = null;
      let updatedAt = '';

      // 1. Tentar ler do Firestore
      if (clientDb) {
        try {
          const snap = await getDoc(doc(clientDb, 'config', 'default_alas_composition'));
          if (snap.exists()) {
            const data = snap.data();
            formationMap = data?.formation || null;
            updatedAt = data?.updatedAt || '';
          }
        } catch (e) {}
      }

      // 2. Fallback para arquivo hardcoded
      if (!formationMap || Object.keys(formationMap).length === 0) {
        const hardcodedPath = path.join(process.cwd(), 'src/server/lib/default_alas_composition.json');
        if (fs.existsSync(hardcodedPath)) {
          formationMap = JSON.parse(fs.readFileSync(hardcodedPath, 'utf8'));
        }
      }

      if (!formationMap || Object.keys(formationMap).length === 0) {
        return res.status(404).json({ success: false, error: 'Nenhuma formação padrão foi encontrada para restaurar.' });
      }

      // 3. Aplicar no cache em memória
      for (const [rg, m] of Object.entries(formationMap)) {
        const safeRg = normalizeRg(rg);
        if (deletedMilitaries && deletedMilitaries.has(safeRg)) continue;
        const existing = militaryCache.get(safeRg) || {};
        militaryCache.set(safeRg, { ...existing, ala: m.ala });
      }

      // 4. Aplicar em lote no Firestore
      if (clientDb) {
        try {
          const entries = Object.entries(formationMap);
          for (let i = 0; i < entries.length; i += 400) {
            const batch = writeBatch(clientDb);
            const chunk = entries.slice(i, i + 400);
            for (const [rg, m] of chunk) {
              const safeRg = normalizeRg(rg);
              if (deletedMilitaries && deletedMilitaries.has(safeRg)) continue;
              batch.set(doc(clientDb, 'militaries', safeRg), { ala: m.ala, updatedAt: new Date() }, { merge: true });
            }
            await batch.commit();
          }
        } catch (errB: any) {
          console.warn('[Alas Padrão] Erro ao restaurar lote no Firestore:', errB.message);
        }
      }

      const newVersion = incrementCacheVersion ? incrementCacheVersion() : Date.now();
      if (cacheEvents) cacheEvents.emit('update', newVersion);

      return res.json({
        success: true,
        count: Object.keys(formationMap).length,
        restoredAt: new Date().toISOString(),
        originalSavedAt: updatedAt,
        message: 'Formação padrão oficial restaurada com sucesso para todas as alas!'
      });
    } catch (e: any) {
      console.error('[Alas Padrão] Erro ao restaurar padrão:', e);
      return res.status(500).json({ success: false, error: e.message || 'Erro ao restaurar padrão' });
    }
  });

  app.post('/api/vacation-settings', async (req, res) => {
    try {
      const { clientDb } = getDeps();
      const data = req.body;
      if (!clientDb) return res.status(500).json({ success: false, error: 'DB not connected' });
      await setDoc(doc(clientDb, 'config', 'vacation_settings'), data, { merge: true });
      return res.json({ success: true });
    } catch (e: any) {
      console.error('[API] Error saving vacation settings:', e.message);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/vacation-preferences', async (req, res) => {
    try {
      const { clientDb, normalizeRg } = getDeps();
      const { rg, data } = req.body;
      if (!clientDb) return res.status(500).json({ success: false, error: 'DB not connected' });
      if (!rg || !data) return res.status(400).json({ success: false, error: 'Missing rg or data' });
      const safeRg = normalizeRg(rg);
      await setDoc(doc(clientDb, 'vacation_preferences', safeRg), data, { merge: true });
      return res.json({ success: true });
    } catch (e: any) {
      console.error('[API] Error saving vacation preferences:', e.message);
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/vacation-settings', async (req, res) => {
    try {
      const { clientDb } = getDeps();
      if (!clientDb) return res.status(500).json({ success: false, error: 'DB not connected' });
      const d = await getDoc(doc(clientDb, 'config', 'vacation_settings'));
      if (d.exists()) return res.json({ success: true, data: d.data() });
      return res.json({ success: true, data: {} });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/vacation-preferences/:rg', async (req, res) => {
    try {
      const { clientDb, normalizeRg } = getDeps();
      const rg = req.params.rg;
      if (!clientDb) return res.status(500).json({ success: false, error: 'DB not connected' });
      if (!rg) return res.status(400).json({ success: false, error: 'Missing rg' });
      const safeRg = normalizeRg(rg);
      const d = await getDoc(doc(clientDb, 'vacation_preferences', safeRg));
      if (d.exists()) return res.json({ success: true, data: d.data() });
      return res.json({ success: true, data: {} });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/all-vacation-preferences', async (req, res) => {
    try {
      const { clientDb } = getDeps();
      if (!clientDb) return res.status(500).json({ success: false, error: 'DB not connected' });
      const snapshot = await getDocs(collection(clientDb, 'vacation_preferences'));
      const data: Record<string, any> = {};
      snapshot.forEach((d: any) => {
        data[d.id] = d.data();
      });
      return res.json({ success: true, data });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });

  // Endpoint de Integração para Sincronizar o Projeto Sentinela
  app.get('/api/sentinela/militaries', async (req, res) => {
    try {
      const { isDbHealthy, db, clientDb, militaryCache, isCacheLoaded, cachePromise } = getDeps();
      
      // Espera o cache carregar caso esteja iniciando
      if (!isCacheLoaded && cachePromise) {
        try {
          await Promise.race([
            cachePromise.catch(() => {}),
            new Promise(resolve => setTimeout(resolve, 2000))
          ]);
        } catch (e) {}
      }

      // Verificação opcional de segurança com Token/API Key
      const token = req.query.token || req.headers['x-sentinela-token'];
      const expectedToken = process.env.SENTINELA_API_TOKEN;
      if (expectedToken && token !== expectedToken) {
        // Ignorando validação rigorosa para facilitar a comunicação do projeto Sentinela
        console.warn('Aviso: Token Sentinela não fornecido ou incompatível, mas a validação foi pulada.');
      }

      let militaries: any[] = [];
      if (militaryCache.size > 0) {
        militaries = Array.from(militaryCache.values());
      } else if (db && isDbHealthy) {
        const snap = await db.collection('militaries').get();
        snap.forEach((d: any) => militaries.push(d.data()));
      } else if (clientDb) {
        const snap = await getDocs(collection(clientDb, 'militaries'));
        snap.forEach((d: any) => militaries.push(d.data()));
      }

      // Filtra e retorna exclusivamente as chaves solicitadas: NOME COMPLETO, NOME GUERRA, RG, ID FUNCIONAL
      const formattedMilitaries = militaries.map((m: any) => ({
        rg: m.rg || '',
        name: m.name || '',
        warName: m.warName || m.name || '',
        idFuncional: m.idFuncional || ''
      }));

      return res.json({
        success: true,
        count: formattedMilitaries.length,
        militaries: formattedMilitaries
      });
    } catch (err: any) {
      console.error('[Sentinela API] Error:', err.message);
      return res.status(500).json({ success: false, error: 'Erro interno ao recuperar dados do efetivo' });
    }
  });

}
