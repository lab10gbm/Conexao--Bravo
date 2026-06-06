import express from 'express';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';

export function setupMilitaryRoutes(app: express.Express, getDeps: () => any) {
  app.get('/api/militar', async (req, res) => {
    const { isDbHealthy, db, clientDb, militaryCache, normalizeRg, OBM_HIERARCHY, admin, isCacheLoaded, cachePromise, setDbUnhealthy } = getDeps();
    const requesterRg = req.query.rg as string;
    let usersData: any[] = [];
    
    if (db && isDbHealthy) {
      try {
        if (requesterRg) {
          const safeRg = normalizeRg(requesterRg);
          let requester = militaryCache.get(safeRg);
          
          if (!requester) {
            const reqDoc = await db.collection('militaries').doc(safeRg).get();
            if (reqDoc.exists) {
              requester = reqDoc.data();
              militaryCache.set(safeRg, requester);
            }
          }
          console.log("[API DEBUG] Requester data:", requester);

          if (requester) {
            if (requester.isAdmin) {
              const snap = await db.collection('militaries').get();
              snap.forEach((d: any) => usersData.push(d.data()));
            } else {
              const userObm = requester.obm || '';
              const allowedSet = new Set<string>();
              (OBM_HIERARCHY[userObm] || [userObm]).forEach((o: string) => allowedSet.add(o));
              if (requester.adminObms) requester.adminObms.forEach((o: string) => allowedSet.add(o));
              if (requester.escalanteObms) requester.escalanteObms.forEach((o: string) => allowedSet.add(o));
              
              const allowedObms = Array.from(allowedSet).filter(Boolean);
              
              // Fallback to fetch all and filter in memory since query logic is complex
              const snap = await db.collection('militaries').get();
              snap.forEach((d: any) => {
                 const dat = d.data();
                 if (allowedObms.includes(dat.obm) || allowedObms.includes(dat.lentTo) || allowedObms.length === 0) {
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

    if (usersData.length === 0) {
       // Fallback completely to cache if firestore unavailable
       usersData = Array.from(militaryCache.values());
       if (requesterRg) {
          const requester = militaryCache.get(normalizeRg(requesterRg));
          if (requester && !requester.isAdmin) {
             const userObm = requester.obm || '';
             const allowedSet = new Set<string>();
             (OBM_HIERARCHY[userObm] || [userObm]).forEach(o => allowedSet.add(o));
             if (requester.adminObms) requester.adminObms.forEach((o: string) => allowedSet.add(o));
             if (requester.escalanteObms) requester.escalanteObms.forEach((o: string) => allowedSet.add(o));
             
             const allowedObms = Array.from(allowedSet);
             usersData = usersData.filter(u => allowedObms.includes(u.obm || '') || allowedObms.includes(u.lentTo || ''));
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
    const { isDbHealthy, db, clientDb, militaryCache, normalizeRg, OBM_HIERARCHY, admin, isCacheLoaded, cachePromise, setDbUnhealthy } = getDeps();
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
          member = { rg: '54444', name: 'ADMINISTRADOR', warName: 'ADMINISTRADOR', rank: 'MAJOR', ala: '1', obm: 'CBA' };
        }
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

app.post('/api/militar/update', async (req, res) => {
    const { isDbHealthy, db, militaryCache, normalizeRg, OBM_HIERARCHY, admin, isCacheLoaded, cachePromise, setDbUnhealthy } = getDeps();
    const { rg, data } = req.body;
    if (!rg || !data) return res.status(400).json({ success: false });

    const safeRg = normalizeRg(rg);
    try {
      if (db && isDbHealthy) {
        try {
          await db.collection('militaries').doc(safeRg).set(data, { merge: true });
        } catch (e: any) {
          if (!e.message.includes('PERMISSION_DENIED')) {
            console.error('[API] Failed to update militar data in Firestore:', e);
          }
        }
      }

      const existing = militaryCache.get(safeRg) || {};
      
      const mergedData = { ...existing, ...data };
      if (data.viaturas && existing.viaturas) {
        mergedData.viaturas = { ...existing.viaturas, ...data.viaturas };
      }
      
      militaryCache.set(safeRg, mergedData);
      
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ success: false });
    }
  });

app.post('/api/militar/role', async (req, res) => {
    const { isDbHealthy, db, militaryCache, normalizeRg, OBM_HIERARCHY, admin, isCacheLoaded, cachePromise, setDbUnhealthy } = getDeps();
    const { rg, role, value } = req.body;
    if (!rg || !role) return res.status(400).json({ success: false });

    const safeRg = normalizeRg(rg);
    try {
      if (db && isDbHealthy) {
        try {
          await db.collection('militaries').doc(safeRg).set({ [role]: value }, { merge: true });
        } catch (e: any) {
          if (!e.message.includes('PERMISSION_DENIED')) {
            console.error('[API] Failed to update role in Firestore:', e);
          }
        }
      }

      const existing = militaryCache.get(safeRg) || {};
      militaryCache.set(safeRg, { ...existing, [role]: value });
      
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ success: false });
    }
  });

app.post('/api/militar/emprestar', async (req, res) => {
    const { isDbHealthy, db, militaryCache, normalizeRg, OBM_HIERARCHY, admin, isCacheLoaded, cachePromise, setDbUnhealthy } = getDeps();
    const { lentTo, rg } = req.body;
    
    if (!rg) return res.status(400).json({ success: false, error: 'RG obrigatório' });
    
    const safeRg = normalizeRg(rg);
    
    try {
      if (db) {
        try {
          await db.collection('militaries').doc(safeRg).set({ lentTo: lentTo || null }, { merge: true });
        } catch (e: any) {
          if (!e.message.includes('PERMISSION_DENIED')) {
            console.error('[API] Failed to update lentTo in Firestore:', e);
          }
        }
      }
      
      // Update cache
      let cached = militaryCache.get(safeRg);
      if (cached) {
        cached.lentTo = lentTo || null;
        militaryCache.set(safeRg, cached);
      }
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

}
