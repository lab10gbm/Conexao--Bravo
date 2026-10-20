import { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { normalizeObm, cleanUndefined } from "../../../lib/utils";
import { resolveCanonicalScope } from "../../../lib/canonicalScope";
import { normalizeFnName } from "../lib/escalaCalculos";
import { OfficerVisibility } from "../../../types";
import { SentinelaSlot } from "../../../lib/sentinelaUtils";
import { EscalaPostoData } from "../../postos/types";

interface UseEscalaPersistenceProps {
  selectedDate: string;
  obmContext: string;
  userObm?: string;
  selectedFunctions: Record<string, string[]>;
  setSelectedFunctions: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  viaturasInfo: any[];
  setViaturasInfo: React.Dispatch<React.SetStateAction<any[]>>;
  isViaturasCustomizedForDate: React.MutableRefObject<boolean>;
  getObmActivePattern: (cleanObm: string) => Promise<any[]>;
  manuallyAddedRgs: Record<string, string[]>;
  setManuallyAddedRgs: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  manuallyRemovedRgs: Record<string, string[]>;
  setManuallyRemovedRgs: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  officerVisibility: OfficerVisibility;
  setOfficerVisibility: React.Dispatch<React.SetStateAction<OfficerVisibility>>;
  adminRolesVisibility: Record<string, boolean>;
  setAdminRolesVisibility: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  sentinelaRgs: (string | null)[];
  setSentinelaRgs: React.Dispatch<React.SetStateAction<(string | null)[]>>;
  sentinelaSlots: SentinelaSlot[] | null;
  setSentinelaSlots: React.Dispatch<React.SetStateAction<SentinelaSlot[] | null>>;
  postosEscalaEnabled?: boolean;
  setPostosEscalaEnabled?: React.Dispatch<React.SetStateAction<boolean>>;
  postosData?: EscalaPostoData[];
  setPostosData?: React.Dispatch<React.SetStateAction<EscalaPostoData[]>>;
}

export function useEscalaPersistence({
  selectedDate,
  obmContext,
  userObm,
  selectedFunctions,
  setSelectedFunctions,
  viaturasInfo,
  setViaturasInfo,
  isViaturasCustomizedForDate,
  getObmActivePattern,
  manuallyAddedRgs,
  setManuallyAddedRgs,
  manuallyRemovedRgs,
  setManuallyRemovedRgs,
  officerVisibility,
  setOfficerVisibility,
  adminRolesVisibility,
  setAdminRolesVisibility,
  sentinelaRgs,
  setSentinelaRgs,
  sentinelaSlots,
  setSentinelaSlots,
  postosEscalaEnabled,
  setPostosEscalaEnabled,
  postosData,
  setPostosData,
}: UseEscalaPersistenceProps) {
  const isFirstLoad = useRef(true);
  const previousDate = useRef(selectedDate);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Load state from Firebase when date or obm changes
  useEffect(() => {
    if (!selectedDate) return;
    const rawObm = obmContext && obmContext !== 'GLOBAL' ? obmContext : (userObm || '10º GBM');
    const cleanObm = normalizeObm(rawObm);

    if (previousDate.current !== selectedDate) {
      setSelectedFunctions({});
      setManuallyAddedRgs({});
      setSentinelaRgs([null, null, null, null]);
      setSentinelaSlots(null);
      if (setPostosData) setPostosData([]);
      previousDate.current = selectedDate;
      isFirstLoad.current = true;
    }

    const normalizedObm = cleanObm.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const docRef = doc(db, `escala24h_${normalizedObm}`, selectedDate);

    let isMounted = true;
    const loadState = async () => {
      try {
        let data: any = null;
        let exists = false;

        // 1. Carga inicial rápida via API Backend (ignora bloqueadores de client e contorna permissões)
        try {
          const res = await fetch(`/api/escala24h?obm=${encodeURIComponent(cleanObm)}&date=${encodeURIComponent(selectedDate)}`);
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.exists && json.data) {
              data = json.data;
              exists = true;
            }
          }
        } catch (apiErr) {
          console.warn('[useEscalaPersistence] Backend API load warning:', apiErr);
        }

        // 2. Fallback via Firestore Client SDK
        if (!exists && db) {
          try {
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              data = snap.data();
              exists = true;
            }
          } catch (dbErr) {
            console.warn('[useEscalaPersistence] Client getDoc warning:', dbErr);
          }
        }

        let savedViaturas: any[] | null = null;
        let isExplicitCustomization = false;

        if (exists && data && isMounted) {
          if (data.selectedFunctions) setSelectedFunctions(data.selectedFunctions);
          if (data.manuallyAddedRgs) {
            setManuallyAddedRgs(prev => ({ ...prev, [selectedDate]: data.manuallyAddedRgs }));
          }
          if (data.manuallyRemovedRgs) {
            setManuallyRemovedRgs(prev => ({ ...prev, [selectedDate]: data.manuallyRemovedRgs }));
          }
          if (data.viaturasInfo && Array.isArray(data.viaturasInfo)) {
            savedViaturas = data.viaturasInfo;
            isExplicitCustomization = Boolean(data.viaturasCustomizedForDate);
            isViaturasCustomizedForDate.current = isExplicitCustomization;
          }
          if (data.officerVisibility) {
            setOfficerVisibility({
              showSection: data.officerVisibility.showSection !== false,
              showOficialDia: data.officerVisibility.showOficialDia !== false,
              showOficialNautica: data.officerVisibility.showOficialNautica !== false,
              showOficialMedico: data.officerVisibility.showOficialMedico !== false,
            });
          }
          if (data.adminRolesVisibility) {
            setAdminRolesVisibility(data.adminRolesVisibility);
          }
          if (data.sentinelaSlots && Array.isArray(data.sentinelaSlots)) {
            setSentinelaSlots(data.sentinelaSlots);
          } else {
            setSentinelaSlots(null);
          }
          if (data.sentinelaRgs && Array.isArray(data.sentinelaRgs)) {
            setSentinelaRgs(data.sentinelaRgs);
          } else if (data.selectedFunctions) {
            const sentinelasFromFuncs = Object.entries(data.selectedFunctions as Record<string, string[]>)
              .filter(([_, funcs]) => funcs.some(f => normalizeFnName(f) === 'SENTINELA'))
              .map(([rg]) => rg);
            if (sentinelasFromFuncs.length > 0) {
              const recovered = [...sentinelasFromFuncs];
              while (recovered.length < 4) recovered.push(null);
              setSentinelaRgs(recovered);
            } else {
              setSentinelaRgs([null, null, null, null]);
            }
          } else {
            setSentinelaRgs([null, null, null, null]);
          }

          if (setPostosEscalaEnabled && data.postosEscalaEnabled !== undefined) {
            setPostosEscalaEnabled(Boolean(data.postosEscalaEnabled));
          }
          if (setPostosData && data.postosData && Array.isArray(data.postosData)) {
            setPostosData(data.postosData);
          }
        } else if (isMounted) {
          setSelectedFunctions({});
          setSentinelaSlots(null);
          setSentinelaRgs([null, null, null, null]);
          if (setPostosData) setPostosData([]);
        }

        if (isMounted) {
          const baseVtrs = await getObmActivePattern(cleanObm);

          const LEGACY_STALE_IDS = new Set(['ABT-183', 'ASE-404', 'AR-583']);
          const hasStaleLegacyVehicles = savedViaturas && savedViaturas.some((s: any) => {
            const sId = (s.id || s.vtr || '').toUpperCase();
            return LEGACY_STALE_IDS.has(sId) && !baseVtrs.some((b: any) => (b.id || b.vtr || '').toUpperCase() === sId);
          });

          const OLD_DEFAULT_IDS = ['ABT-143', 'ABSL-152', 'ASE-572', 'AR-600', 'ARC-162', 'L-09', 'BIA-006', 'BIA-013', 'ABT-12'];
          const isOldDefaultHardcodedFleet = savedViaturas && savedViaturas.length === 9 && 
            OLD_DEFAULT_IDS.every((id, idx) => (savedViaturas[idx]?.id || savedViaturas[idx]?.vtr || '').toUpperCase() === id);

          const baseMatchesOldDefault = baseVtrs.length === 9 &&
            OLD_DEFAULT_IDS.every((id, idx) => (baseVtrs[idx]?.id || baseVtrs[idx]?.vtr || '').toUpperCase() === id);

          if (!savedViaturas || savedViaturas.length === 0 || hasStaleLegacyVehicles || (!isExplicitCustomization && isOldDefaultHardcodedFleet && !baseMatchesOldDefault)) {
            setViaturasInfo(baseVtrs);
          } else if (!isExplicitCustomization) {
            const genuineExtras = savedViaturas.filter((s: any) => s.isExtra && !baseVtrs.some((b: any) => b.id === s.id || b.vtr === s.vtr));
            setViaturasInfo([...baseVtrs, ...genuineExtras]);
          } else {
            const mergedBase = baseVtrs.map((base: any) => {
              const saved = savedViaturas.find((s: any) => s.id === base.id || s.vtr === base.vtr);
              if (saved) {
                return { 
                  ...base, 
                  ativa: saved.ativa !== undefined ? saved.ativa : base.ativa,
                  exibir: saved.exibir !== undefined ? saved.exibir : base.exibir,
                  espaco: saved.espaco !== undefined ? saved.espaco : base.espaco,
                  condutor: saved.condutor !== undefined ? saved.condutor : base.condutor,
                  g1: saved.g1 !== undefined ? saved.g1 : base.g1,
                  g2: saved.g2 !== undefined ? saved.g2 : base.g2,
                  g3: saved.g3 !== undefined ? saved.g3 : base.g3,
                  g4: saved.g4 !== undefined ? saved.g4 : base.g4,
                  cg: saved.cg !== undefined ? saved.cg : base.cg,
                  customNames: base.customNames || saved.customNames,
                  customFunctions: base.customFunctions || saved.customFunctions,
                };
              }
              return base;
            });
            const genuineExtras = savedViaturas.filter((s: any) => s.isExtra && !baseVtrs.some((b: any) => b.id === s.id || b.vtr === s.vtr));
            setViaturasInfo([...mergedBase, ...genuineExtras]);
          }

          isFirstLoad.current = false;
        }
      } catch (e) {
        console.error("Error loading escala24h state:", e);
        if (isMounted) isFirstLoad.current = false;
      }
    };

    loadState();
    return () => { isMounted = false; };
  }, [selectedDate, obmContext]);

  // Auto-save state to Firebase & Backend API
  useEffect(() => {
    if (isFirstLoad.current) return;
    if (!selectedDate) return;
    const rawObm = obmContext && obmContext !== 'GLOBAL' ? obmContext : (userObm || '10º GBM');
    const cleanObm = normalizeObm(rawObm);

    setSavingState('saving');
    const timeout = setTimeout(async () => {
      try {
        const payload = cleanUndefined({
          scope: resolveCanonicalScope(rawObm),
          selectedFunctions,
          viaturasInfo,
          viaturasCustomizedForDate: isViaturasCustomizedForDate.current,
          manuallyAddedRgs: manuallyAddedRgs[selectedDate] || [],
          manuallyRemovedRgs: manuallyRemovedRgs[selectedDate] || [],
          officerVisibility,
          adminRolesVisibility,
          sentinelaRgs,
          sentinelaSlots: sentinelaSlots || null,
          postosEscalaEnabled: postosEscalaEnabled !== undefined ? postosEscalaEnabled : false,
          postosData: postosData || null,
        });

        // Persistência via Backend API (garantida via credenciais de servidor)
        await fetch('/api/escala24h/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            obm: cleanObm,
            date: selectedDate,
            data: payload
          })
        }).catch(err => console.warn('[useEscalaPersistence] Backend API save notice:', err));

        setSavingState('saved');
        setTimeout(() => setSavingState('idle'), 2000);
      } catch (e) {
        console.error("Error saving escala24h state:", e);
        setSavingState('idle');
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [
    selectedFunctions,
    viaturasInfo,
    manuallyAddedRgs,
    manuallyRemovedRgs,
    selectedDate,
    obmContext,
    officerVisibility,
    adminRolesVisibility,
    sentinelaRgs,
    sentinelaSlots,
    postosEscalaEnabled,
    postosData,
  ]);

  return { savingState, isFirstLoad };
}
