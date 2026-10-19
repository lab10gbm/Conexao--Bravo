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
        });
        appUnsubscribers.push(unsubApp);
      });
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
      
      const appWithId = { id: docRef.id, ...newApp };
      setRasApplications(prev => {
        if (prev.some(p => p.militarRg === appWithId.militarRg)) return prev;
        return [...prev, appWithId];
      });
      
      handleAddSingleRas(appWithId);
      
    } catch(err) {
      console.error(err);
      alert("Erro ao adicionar militar ao RAS.");
    }
  };

  const handleFetchRas = async () => {
    try {
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

    setActionNotice(`${rank ? rank + ' ' : ''}${militarName} excluído do RAS e da escala.`);
    setTimeout(() => {
      setActionNotice(null);
    }, 3000);

    try {
      if (app.id) {
        await deleteDoc(doc(db, 'ras_applications', app.id)).catch(err => {
          console.warn("Aviso ao excluir doc direto em ras_applications:", err);
        });
      }
      try {
        const qApps = query(collection(db, 'ras_applications'), where('militarRg', '==', militarRg));
        const snapApps = await getDocs(qApps);
        snapApps.docs.forEach(async (d) => {
          try {
            await deleteDoc(d.ref);
          } catch (e) {
            console.warn("Aviso ao excluir doc em ras_applications:", e);
          }
        });
      } catch (err) {
        console.warn("Aviso ao buscar ras_applications para exclusão:", err);
      }
    } catch (err) {
      console.warn("Erro ao excluir militar do RAS no Firestore:", err);
    }
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
