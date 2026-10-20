import { useState, useEffect, useMemo } from "react";
import { doc, onSnapshot, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { UserProfile } from "../../../types";
import { parseRank, sortOfficersBySeniority } from "../../../lib/rankUtils";
import { cleanUndefined } from "../../../lib/utils";

interface UseOfficerScalesProps {
  obmContext: string;
  militars: UserProfile[];
  selectedDate: string;
}

export function useOfficerScales({ obmContext, militars, selectedDate }: UseOfficerScalesProps) {
  const [officerScaleDays, setOfficerScaleDays] = useState<Record<string, Record<string, string>>>({});
  const [nauticoScaleDays, setNauticoScaleDays] = useState<Record<string, Record<string, string>>>({});
  const [medicoScaleDays, setMedicoScaleDays] = useState<Record<string, Record<string, string>>>({});

  const [loadingOfficerScale, setLoadingOfficerScale] = useState(false);
  const [loadingNauticoScale, setLoadingNauticoScale] = useState(false);
  const [loadingMedicoScale, setLoadingMedicoScale] = useState(false);
  const [poolConfig, setPoolConfig] = useState<Record<string, string[]> | null>(null);

  const [isOfficerSectionExpanded, setIsOfficerSectionExpanded] = useState<boolean>(true);

  const [savingOficialDia, setSavingOficialDia] = useState(false);
  const [savingNautico, setSavingNautico] = useState(false);
  const [savingMedico, setSavingMedico] = useState(false);

  useEffect(() => {
    if (!db) return;
    const rawObm = obmContext || "10º GBM";
    const normalizedObm = rawObm === 'GLOBAL' ? '10º_GBM' : rawObm.replace(/°/g, 'º').replace(/\//g, '_').replace(/\s/g, '_');
    
    // 0. Fast load via API
    fetch(`/api/officer-pool?obm=${encodeURIComponent(rawObm)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.config) {
          setPoolConfig(data.config);
        }
      })
      .catch(() => {});

    // Pool config listener
    const unsubPool = onSnapshot(doc(db, 'officer_pool_config', normalizedObm), (snap) => {
      if (snap.exists()) {
        setPoolConfig(snap.data() as Record<string, string[]>);
      } else if (normalizedObm !== '10º_GBM') {
        getDoc(doc(db, 'officer_pool_config', '10º_GBM')).then(fallbackSnap => {
          if (fallbackSnap.exists()) {
            setPoolConfig(fallbackSnap.data() as Record<string, string[]>);
          } else {
            setPoolConfig(null);
          }
        }).catch(() => setPoolConfig(null));
      } else {
        setPoolConfig(null);
      }
    });
    
    // 1. officer_scales (Serviço & GRD)
    setLoadingOfficerScale(true);
    const unsubOfficer = onSnapshot(doc(db, 'officer_scales', normalizedObm), (snap) => {
      if (snap.exists()) {
        setOfficerScaleDays(snap.data().days || {});
      } else if (normalizedObm !== '10º_GBM') {
        getDoc(doc(db, 'officer_scales', '10º_GBM')).then(fallbackSnap => {
          if (fallbackSnap.exists()) {
            setOfficerScaleDays(fallbackSnap.data().days || {});
          } else {
            setOfficerScaleDays({});
          }
        }).catch(() => setOfficerScaleDays({}));
      } else {
        setOfficerScaleDays({});
      }
      setLoadingOfficerScale(false);
    }, (err) => {
      console.warn("[EscalaEspelho] Erro ao carregar escala de oficiais:", err);
      setLoadingOfficerScale(false);
    });

    // 2. nautico_scales (Núcleo Náutico)
    setLoadingNauticoScale(true);
    const unsubNautico = onSnapshot(doc(db, 'nautico_scales', normalizedObm), (snap) => {
      if (snap.exists()) {
        setNauticoScaleDays(snap.data().days || {});
      } else if (normalizedObm !== '10º_GBM') {
        getDoc(doc(db, 'nautico_scales', '10º_GBM')).then(fallbackSnap => {
          if (fallbackSnap.exists()) {
            setNauticoScaleDays(fallbackSnap.data().days || {});
          } else {
            setNauticoScaleDays({});
          }
        }).catch(() => setNauticoScaleDays({}));
      } else {
        setNauticoScaleDays({});
      }
      setLoadingNauticoScale(false);
    }, (err) => {
      console.warn("[EscalaEspelho] Erro ao carregar escala náutica:", err);
      setLoadingNauticoScale(false);
    });

    // 3. medico_scales (Oficiais Médicos)
    setLoadingMedicoScale(true);
    const unsubMedico = onSnapshot(doc(db, 'medico_scales', normalizedObm), (snap) => {
      if (snap.exists()) {
        setMedicoScaleDays(snap.data().days || {});
      } else if (normalizedObm !== '10º_GBM') {
        getDoc(doc(db, 'medico_scales', '10º_GBM')).then(fallbackSnap => {
          if (fallbackSnap.exists()) {
            setMedicoScaleDays(fallbackSnap.data().days || {});
          } else {
            setMedicoScaleDays({});
          }
        }).catch(() => setMedicoScaleDays({}));
      } else {
        setMedicoScaleDays({});
      }
      setLoadingMedicoScale(false);
    }, (err) => {
      console.warn("[EscalaEspelho] Erro ao carregar escala médica:", err);
      setLoadingMedicoScale(false);
    });

    return () => {
      unsubPool();
      unsubOfficer();
      unsubNautico();
      unsubMedico();
    };
  }, [obmContext]);

  const findOfficerMilitary = (officerStr: string) => {
    if (!officerStr) return null;
    const clean = officerStr.trim().toUpperCase();
    
    let match = militars.find(m => {
      const fullWar = `${parseRank(m.rank)} ${m.warName || ''}`.trim().toUpperCase();
      const fullName = `${parseRank(m.rank)} ${m.name || ''}`.trim().toUpperCase();
      const firstPartName = `${parseRank(m.rank)} ${(m.name || '').split(' ')[0]}`.trim().toUpperCase();
      
      return (
        (m.rg && clean.includes(m.rg)) ||
        clean === fullWar ||
        clean === fullName ||
        clean === firstPartName
      );
    });

    if (match) return match;

    match = militars.find(m => {
      const rank = parseRank(m.rank).toUpperCase();
      if (!rank || !clean.includes(rank)) return false;

      return (
        (m.warName && clean.includes(m.warName.toUpperCase())) ||
        (m.name && clean.includes(m.name.toUpperCase()))
      );
    });

    return match || null;
  };

  const availableOfficers = useMemo(() => {
    if (!poolConfig || !poolConfig.servicosGrd) return [];
    const cleanList = (poolConfig.servicosGrd || []).map(r => String(r).trim());
    return militars.filter(m => cleanList.includes(String(m.rg || '').trim())).sort(sortOfficersBySeniority);
  }, [militars, poolConfig]);

  const availableNauticoOfficers = useMemo(() => {
    if (!poolConfig || !poolConfig.nucleoNautico) return [];
    const cleanList = (poolConfig.nucleoNautico || []).map(r => String(r).trim());
    return militars.filter(m => cleanList.includes(String(m.rg || '').trim())).sort(sortOfficersBySeniority);
  }, [militars, poolConfig]);

  const availableMedicalOfficers = useMemo(() => {
    if (!poolConfig || !poolConfig.oficiaisMedicos) return [];
    const cleanList = (poolConfig.oficiaisMedicos || []).map(r => String(r).trim());
    return militars.filter(m => cleanList.includes(String(m.rg || '').trim())).sort(sortOfficersBySeniority);
  }, [militars, poolConfig]);

  const currentOfficerDay = officerScaleDays[selectedDate] || {};
  const oficialDiaValue = currentOfficerDay.oficialDia || '';
  const sobreavisoValue = currentOfficerDay.sobreaviso || '';
  const matchedOficialDia = useMemo(() => findOfficerMilitary(oficialDiaValue), [oficialDiaValue, militars]);

  const currentNauticoDay = nauticoScaleDays[selectedDate] || {};
  const nauticoOficialValue = currentNauticoDay.oficialDia || '';
  const nauticoSobreavisoValue = currentNauticoDay.sobreaviso || '';
  const matchedNauticoOficial = useMemo(() => findOfficerMilitary(nauticoOficialValue), [nauticoOficialValue, militars]);

  const currentMedicoDay = medicoScaleDays[selectedDate] || {};
  const medicoOficialValue = currentMedicoDay.oficialDia || '';
  const medicoSobreavisoValue = currentMedicoDay.sobreaviso || '';
  const matchedMedicoOficial = useMemo(() => findOfficerMilitary(medicoOficialValue), [medicoOficialValue, militars]);

  const handleSaveOficialDia = async (officerName: string) => {
    if (!selectedDate) return;
    setSavingOficialDia(true);
    try {
      const rawObm = obmContext || "10º GBM";
      const normalizedObm = rawObm === 'GLOBAL' ? '10º_GBM' : rawObm.replace(/\//g, '_').replace(/\s/g, '_');
      const payload = cleanUndefined({
        days: {
          [selectedDate]: {
            oficialDia: officerName
          }
        }
      });

      // Persistência via backend API com credenciais seguras de servidor
      await fetch('/api/officer-scales/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionName: 'officer_scales',
          docId: normalizedObm,
          data: payload
        })
      }).catch(e => console.warn('[useOfficerScales] Aviso na API officer-scales/update:', e));

      setOfficerScaleDays(prev => ({
        ...prev,
        [selectedDate]: {
          ...(prev[selectedDate] || {}),
          oficialDia: officerName
        }
      }));
    } catch (err) {
      console.error("Erro ao salvar oficial de dia:", err);
    } finally {
      setSavingOficialDia(false);
    }
  };

  const handleSaveNauticoOficial = async (officerName: string) => {
    if (!selectedDate) return;
    setSavingNautico(true);
    try {
      const rawObm = obmContext || "10º GBM";
      const normalizedObm = rawObm === 'GLOBAL' ? '10º_GBM' : rawObm.replace(/\//g, '_').replace(/\s/g, '_');
      const payload = cleanUndefined({
        days: {
          [selectedDate]: {
            oficialDia: officerName
          }
        }
      });

      // Persistência via backend API com credenciais seguras de servidor
      await fetch('/api/officer-scales/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionName: 'nautico_scales',
          docId: normalizedObm,
          data: payload
        })
      }).catch(e => console.warn('[useOfficerScales] Aviso na API nautico_scales update:', e));

      setNauticoScaleDays(prev => ({
        ...prev,
        [selectedDate]: {
          ...(prev[selectedDate] || {}),
          oficialDia: officerName
        }
      }));
    } catch (err) {
      console.error("Erro ao salvar oficial náutico:", err);
    } finally {
      setSavingNautico(false);
    }
  };

  const handleSaveMedicoOficial = async (officerName: string) => {
    if (!selectedDate) return;
    setSavingMedico(true);
    try {
      const rawObm = obmContext || "10º GBM";
      const normalizedObm = rawObm === 'GLOBAL' ? '10º_GBM' : rawObm.replace(/\//g, '_').replace(/\s/g, '_');
      const payload = cleanUndefined({
        days: {
          [selectedDate]: {
            oficialDia: officerName
          }
        }
      });

      // Persistência via backend API com credenciais seguras de servidor
      await fetch('/api/officer-scales/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionName: 'medico_scales',
          docId: normalizedObm,
          data: payload
        })
      }).catch(e => console.warn('[useOfficerScales] Aviso na API medico_scales update:', e));

      setMedicoScaleDays(prev => ({
        ...prev,
        [selectedDate]: {
          ...(prev[selectedDate] || {}),
          oficialDia: officerName
        }
      }));
    } catch (err) {
      console.error("Erro ao salvar oficial médico:", err);
    } finally {
      setSavingMedico(false);
    }
  };

  return {
    officerScaleDays,
    nauticoScaleDays,
    medicoScaleDays,
    loadingOfficerScale,
    loadingNauticoScale,
    loadingMedicoScale,
    isOfficerSectionExpanded,
    setIsOfficerSectionExpanded,
    savingOficialDia,
    savingNautico,
    savingMedico,
    oficialDiaValue,
    sobreavisoValue,
    matchedOficialDia,
    nauticoOficialValue,
    nauticoSobreavisoValue,
    matchedNauticoOficial,
    medicoOficialValue,
    medicoSobreavisoValue,
    matchedMedicoOficial,
    availableOfficers,
    availableNauticoOfficers,
    availableMedicalOfficers,
    handleSaveOficialDia,
    handleSaveNauticoOficial,
    handleSaveMedicoOficial,
  };
}
