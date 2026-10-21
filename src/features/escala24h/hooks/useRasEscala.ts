import React, { useState, useEffect, useMemo, useRef } from "react";
import { collection, query, where, onSnapshot, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { UserProfile } from "../../../types";
import { normalizeObm, getRasSharedObms, getParentObm } from "../../../lib/utils";
import { resolveCanonicalScope } from "../../../lib/canonicalScope";
import { RAS_FUNCTION_MAP } from "../../../constants";

interface UseRasEscalaProps {
  obmContext: string;
  selectedDate: string;
  militars: UserProfile[];
  globalSearchResults: any[];
  extraMilitars: any[];
  setExtraMilitars: React.Dispatch<React.SetStateAction<any[]>>;
  manuallyRemovedRgs: Record<string, string[]>;
  setManuallyRemovedRgs: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setManuallyAddedRgs: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setSelectedFunctions: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setActionNotice: (notice: string | null) => void;
}

export function useRasEscala({
  obmContext,
  selectedDate,
  militars,
  globalSearchResults,
  extraMilitars,
  setExtraMilitars,
  manuallyRemovedRgs,
  setManuallyRemovedRgs,
  setManuallyAddedRgs,
  setSelectedFunctions,
  setActionNotice,
}: UseRasEscalaProps) {
  const [rasApplications, setRasApplications] = useState<any[]>([]);
  const [addRasMilitarSearch, setAddRasMilitarSearch] = useState('');
  const [showAddRasMenu, setShowAddRasMenu] = useState(false);
  const [rasDuration, setRasDuration] = useState<12 | 24>(24);
  const addRasMenuRef = useRef<HTMLDivElement>(null);

  const visibleRasApplications = useMemo(() => {
    const removedRgs = manuallyRemovedRgs[selectedDate] || [];
    return rasApplications.filter(app => !removedRgs.includes(app.militarRg));
  }, [rasApplications, manuallyRemovedRgs, selectedDate]);

  // Carregamento resiliente inicial via API de servidor (Admin)
  useEffect(() => {
    if (!selectedDate || !obmContext) return;
    let isCancelled = false;
    fetch(`/api/ras/by-date?date=${encodeURIComponent(selectedDate)}&obm=${encodeURIComponent(obmContext || '10º GBM')}`)
      .then(res => res.json())
      .then(data => {
        if (!isCancelled && data?.success && Array.isArray(data.applications) && data.applications.length > 0) {
          setRasApplications(prev => {
            const map = new Map(prev.map(a => [a.militarRg, a]));
            data.applications.forEach((a: any) => map.set(a.militarRg, a));
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});
    return () => { isCancelled = true; };
  }, [selectedDate, obmContext]);

  // Real-time listener for RAS opportunities and applications on selectedDate
  useEffect(() => {
    if (!selectedDate || !obmContext) return;

    let isCancelled = false;
    let appUnsubscribers: (() => void)[] = [];

    const cleanAppUnsubs = () => {
      appUnsubscribers.forEach(u => u());
      appUnsubscribers = [];
    };

    const qOpps = query(
      collection(db, 'ras_opportunities'),
      where('date', '==', selectedDate)
    );

    const unsubOpps = onSnapshot(qOpps, (oppsSnap) => {
      if (isCancelled) return;
      cleanAppUnsubs();

      const sharedObms = getRasSharedObms(obmContext);
      const matchingOpps = oppsSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(o => !o.obm || obmContext === 'GLOBAL' || sharedObms.includes(normalizeObm(o.obm)));

      if (matchingOpps.length === 0) {
        setRasApplications([]);
        return;
      }

      const appsMap: Record<string, any[]> = {};
      matchingOpps.forEach(opp => {
        const qApps = query(
          collection(db, 'ras_applications'),
          where('rasId', '==', opp.id)
        );
        const unsubApp = onSnapshot(qApps, (appSnap) => {
          if (isCancelled) return;
          const apps = appSnap.docs
            .map(d => ({ id: d.id, ...d.data(), oppDate: opp.date, oppDuration: opp.duration, oppLocal: opp.local }))
            .filter((a: any) => a.status === 'selected' || a.status === 'completed');
          appsMap[opp.id] = apps;
          const merged = Object.values(appsMap).flat();
          const uniqueMerged = Array.from(new Map(merged.map((app: any) => [app.militarRg, app])).values());
          setRasApplications(uniqueMerged);
        }, (err) => {
          console.warn('[useRasEscala] onSnapshot notice (ras_applications):', err.message);
        });
        appUnsubscribers.push(unsubApp);
      });
    }, (err) => {
      console.warn('[useRasEscala] onSnapshot notice (ras_opportunities):', err.message);
    });

    return () => {
      isCancelled = true;
      cleanAppUnsubs();
      unsubOpps();
    };
  }, [selectedDate, obmContext]);

  // Sincroniza funções pré-definidas no RAS quando os contemplados carregam
  const autoFilledRas = useRef(new Set<string>());

  useEffect(() => {
    if (rasApplications.length > 0) {
      setSelectedFunctions(prev => {
        const next = { ...prev };
        let changed = false;
        rasApplications.forEach(app => {
          if (app.id && !autoFilledRas.current.has(app.id) && app.militarRg) {
            const mappedRole = app.functionId ? RAS_FUNCTION_MAP[app.functionId] : undefined;
            if (mappedRole && (!next[app.militarRg] || next[app.militarRg].length === 0)) {
              next[app.militarRg] = [mappedRole];
              changed = true;
              autoFilledRas.current.add(app.id);
            }
          }
        });
        return changed ? next : prev;
      });
    }
  }, [rasApplications, setSelectedFunctions]);

  const addRasMenuOptions = useMemo(() => {
    if (addRasMilitarSearch.length < 2) return [];
    const s = addRasMilitarSearch.toLowerCase();
    
    const combinedPool = [...militars, ...globalSearchResults];
    const uniquePool = Array.from(new Map(combinedPool.map(m => [m.rg, m])).values());

    return uniquePool
      .filter(m => {
        return (m.name || '').toLowerCase().includes(s) || 
               (m.warName || '').toLowerCase().includes(s) || 
               (m.rg || '').toString().includes(addRasMilitarSearch);
      })
      .filter(m => !visibleRasApplications.some(app => app.militarRg === m.rg))
      .slice(0, 10);
  }, [addRasMilitarSearch, militars, globalSearchResults, visibleRasApplications]);

  const handleAddSingleRas = (app: any) => {
    setManuallyRemovedRgs(prev => {
      const curr = prev[selectedDate] || [];
      return { ...prev, [selectedDate]: curr.filter(rg => rg !== app.militarRg) };
    });

    let m = militars.find(item => item.rg === app.militarRg);
    if (!m) {
       m = extraMilitars.find(extra => extra.rg === app.militarRg);
    }
    if (!m) {
       m = {
         id: app.militarId,
         rg: app.militarRg,
         name: app.militarName,
         warName: app.militarWarName || '',
         rank: app.militarRank,
         quadro: app.militarQuadro || '',
         obm: obmContext
       } as any;
       setExtraMilitars(prev => [...prev, m]);
    }
    setManuallyAddedRgs(prev => {
      const curr = prev[selectedDate] || [];
      if (!curr.includes(m.rg)) {
         return { ...prev, [selectedDate]: [...curr, m.rg] };
      }
      return prev;
    });
  };

  const handleAddMilitarToRas = async (m: any) => {
    setAddRasMilitarSearch('');
    setShowAddRasMenu(false);
    setManuallyRemovedRgs(prev => {
      const curr = prev[selectedDate] || [];
      return { ...prev, [selectedDate]: curr.filter(rg => rg !== m.rg) };
    });

    try {
      let appWithId: any = null;

      // 1. Tenta salvar prioritariamente via API do backend (Admin SDK, 100% imune a permissões do cliente e adblockers)
      try {
        const res = await fetch('/api/ras/escalante-add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            obmContext,
            selectedDate,
            rasDuration,
            militar: {
              id: m.id || m.rg,
              rg: m.rg,
              name: m.name,
              warName: m.warName || '',
              quadro: m.quadro || '',
              rank: m.rank
            }
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.app) {
            appWithId = data.app;
          }
        }
      } catch (apiErr) {
        console.warn('[useRasEscala] Falha ao adicionar via API backend, tentando fallback:', apiErr);
      }

      // 2. Se a API do backend não respondeu (ex: offline), tenta fallback pelo Client SDK
      if (!appWithId) {
        const sharedObms = getRasSharedObms(obmContext);
        const qOpps = query(collection(db, 'ras_opportunities'), where('obm', 'in', sharedObms), where('date', '==', selectedDate), where('duration', '==', rasDuration));
        const oppsSnap = await getDocs(qOpps);
        
        let rasId = '';
        if (oppsSnap.empty) {
          const parentObm = getParentObm(obmContext || '10º GBM');
          const canonical = resolveCanonicalScope(obmContext || '10º GBM');
          const oppRef = await addDoc(collection(db, 'ras_opportunities'), {
            obm: parentObm,
            scope: canonical,
            local: normalizeObm(obmContext || '10º GBM'),
            date: selectedDate,
            duration: rasDuration,
            description: "RAS Adicionado pelo Escalante",
            functions: ["GERAL"],
            vacancies: 99,
            status: "closed", 
            createdBy: "ESCALANTE",
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          rasId = oppRef.id;
        } else {
          rasId = oppsSnap.docs[0].id;
        }
        
        const newApp = {
          rasId: rasId,
          militarId: m.id || m.rg,
          militarRg: m.rg,
          militarName: m.name,
          militarWarName: m.warName || '',
          militarQuadro: m.quadro || '',
          militarRank: m.rank,
          status: 'selected',
          appliedAt: Date.now()
        };
        
        const docRef = await addDoc(collection(db, 'ras_applications'), newApp);
        appWithId = { id: docRef.id, ...newApp };
      }

      if (appWithId) {
        setRasApplications(prev => {
          if (prev.some(p => p.militarRg === appWithId.militarRg)) return prev;
          return [...prev, appWithId];
        });
        
        handleAddSingleRas(appWithId);
        if (setActionNotice) {
          setActionNotice(`Militar ${m.warName || m.name} adicionado ao RAS.`);
          setTimeout(() => setActionNotice(null), 3000);
        }
      }
    } catch(err: any) {
      console.error('[useRasEscala] Erro ao adicionar militar ao RAS:', err);
      alert("Erro ao adicionar militar ao RAS: " + (err.message || ''));
    }
  };

  const handleFetchRas = async () => {
    try {
      let loaded = false;
      try {
        const res = await fetch(`/api/ras/by-date?date=${encodeURIComponent(selectedDate)}&obm=${encodeURIComponent(obmContext || '10º GBM')}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.applications)) {
            setRasApplications(data.applications);
            loaded = true;
            if (data.applications.length === 0) {
              alert("Nenhum militar selecionado para RAS nesta data.");
            }
          }
        }
      } catch (apiErr) {
        console.warn('[useRasEscala] Falha ao buscar RAS via API:', apiErr);
      }

      if (loaded) return;

      const sharedObms = getRasSharedObms(obmContext);
      const qOpps = query(collection(db, 'ras_opportunities'), where('obm', 'in', sharedObms), where('date', '==', selectedDate));
      const oppsSnap = await getDocs(qOpps);
      if (oppsSnap.empty) {
        alert("Nenhuma oportunidade de RAS encontrada para esta data e OBM.");
        setRasApplications([]);
        return;
      }
      
      const oppIds = oppsSnap.docs.map(d => d.id);
      const apps: any[] = [];
      
      for (let i = 0; i < oppIds.length; i += 10) {
        const chunk = oppIds.slice(i, i + 10);
        const qApps = query(collection(db, 'ras_applications'), where('rasId', 'in', chunk), where('status', 'in', ['selected', 'completed']));
        const snap = await getDocs(qApps);
        snap.docs.forEach(d => apps.push({ id: d.id, ...d.data() }));
      }
      
      if (apps.length === 0) {
        alert("Nenhum militar selecionado para RAS nesta data.");
      }
      const uniqueApps = Array.from(new Map(apps.map((app: any) => [app.militarRg, app])).values());
      setRasApplications(uniqueApps);
    } catch(err) {
      console.error(err);
      alert("Erro ao buscar RAS.");
    }
  };

  const handleRemoveRasMilitar = async (app: any) => {
    const militarRg = app.militarRg;
    if (!militarRg) return;
    const militarName = app.militarWarName || app.militarName || militarRg;
    const rank = app.militarRank || '';

    setManuallyRemovedRgs(prev => {
      const curr = prev[selectedDate] || [];
      if (!curr.includes(militarRg)) {
        return {
          ...prev,
          [selectedDate]: [...curr, militarRg]
        };
      }
      return prev;
    });

    setManuallyAddedRgs(prev => {
      const curr = prev[selectedDate] || [];
      return {
        ...prev,
        [selectedDate]: curr.filter(rg => rg !== militarRg)
      };
    });

    setRasApplications(prev => prev.filter(a => a.id !== app.id && a.militarRg !== militarRg));

    setSelectedFunctions(prev => {
      const next = { ...prev };
      delete next[militarRg];
      return next;
    });

    setExtraMilitars(prev => prev.filter(m => m.rg !== militarRg));

    if (setActionNotice) {
      setActionNotice(`${rank ? rank + ' ' : ''}${militarName} excluído do RAS e da escala.`);
      setTimeout(() => {
        setActionNotice(null);
      }, 3000);
    }

    // 1. Exclusão segura via API backend (Admin)
    fetch('/api/ras/escalante-remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ militarRg, appId: app.id })
    }).catch(err => {
      console.warn('[useRasEscala] Aviso ao excluir via API:', err);
    });

    // 2. Client SDK fallback
    try {
      if (app.id) {
        await deleteDoc(doc(db, 'ras_applications', app.id)).catch(() => {});
      }
      try {
        const qApps = query(collection(db, 'ras_applications'), where('militarRg', '==', militarRg));
        const snapApps = await getDocs(qApps);
        snapApps.docs.forEach(async (d) => {
          try {
            await deleteDoc(d.ref);
          } catch (e) {}
        });
      } catch (err) {}
    } catch (err) {}
  };

  const handleAddAllRas = () => {
    visibleRasApplications.forEach(app => {
       handleAddSingleRas(app);
    });
  };

  return {
    rasApplications,
    setRasApplications,
    visibleRasApplications,
    rasDuration,
    setRasDuration,
    addRasMilitarSearch,
    setAddRasMilitarSearch,
    showAddRasMenu,
    setShowAddRasMenu,
    addRasMenuRef,
    addRasMenuOptions,
    handleAddMilitarToRas,
    handleFetchRas,
    handleAddSingleRas,
    handleRemoveRasMilitar,
    handleAddAllRas,
  };
}
