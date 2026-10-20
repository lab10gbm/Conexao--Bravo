import { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { UserProfile } from "../../../types";
import { normalizeObm } from "../../../lib/utils";

export const DEFAULT_VIATURAS: any[] = [
  { id: "ABT-143", vtr: "ABT-143", ativa: true, exibir: true, espaco: "1", maritima: false, obm: "10º GBM", tipo: 'operacional', condutor: true, g1: true, g2: true, g3: true, g4: false, cg: true, blocked: [] },
  { id: "ABSL-152", vtr: "ABSL-152", ativa: true, exibir: true, espaco: "1", maritima: false, obm: "10º GBM", tipo: 'operacional', condutor: true, g1: true, g2: true, g3: false, g4: false, cg: true, blocked: [] },
  { id: "ASE-572", vtr: "ASE-572", ativa: true, exibir: true, espaco: "1", maritima: false, obm: "10º GBM", tipo: 'operacional', condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "AR-600", vtr: "AR-600", ativa: true, exibir: true, espaco: "1/2", maritima: false, obm: "10º GBM", tipo: 'operacional', condutor: true, g1: null, g2: null, g3: null, g4: null, cg: null, blocked: ["g1", "g2", "g3", "g4", "cg"] },
  { id: "ARC-162", vtr: "ARC-162", ativa: true, exibir: true, espaco: "1/2", maritima: false, obm: "10º GBM", tipo: 'operacional', condutor: true, g1: true, g2: null, g3: null, g4: null, cg: null, blocked: ["g2", "g3", "g4", "cg"] },
  { id: "L-09", vtr: "L-09", ativa: true, exibir: true, espaco: "1/3", maritima: true, obm: "10º GBM", tipo: 'operacional', condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "BIA-006", vtr: "BIA-006", ativa: false, exibir: true, espaco: "1/3", maritima: true, obm: "10º GBM", tipo: 'operacional', condutor: false, g1: false, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "BIA-013", vtr: "BIA-013", ativa: false, exibir: true, espaco: "1/3", maritima: true, obm: "10º GBM", tipo: 'operacional', condutor: false, g1: false, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "ABT-12", vtr: "ABT-12", ativa: false, exibir: false, espaco: "1", maritima: false, obm: "10º GBM", tipo: 'operacional', condutor: false, g1: false, g2: false, g3: false, g4: false, cg: false, blocked: [] },
];

interface UseEscalaViaturasProps {
  obmContext: string;
  user: UserProfile;
  selectedDate: string;
}

export function useEscalaViaturas({ obmContext, user, selectedDate }: UseEscalaViaturasProps) {
  const isViaturasCustomizedForDate = useRef(false);
  const [patternAppliedMessage, setPatternAppliedMessage] = useState<string | null>(null);

  const [viaturasInfo, setViaturasInfo] = useState<any[]>(() => {
    try {
      const rawObm = obmContext && obmContext !== 'GLOBAL' ? obmContext : '10º GBM';
      const cleanObm = normalizeObm(rawObm);
      const keys = [
        `custom_default_viaturas_${cleanObm}`,
        `custom_default_viaturas_${rawObm}`,
        `viaturas_config_${cleanObm}`,
        `viaturas_config_${rawObm}`,
        `custom_default_viaturas_${cleanObm.replace(/º/g, '°')}`,
        `custom_default_viaturas_${cleanObm.replace(/°/g, 'º')}`,
        `viaturas_config_${cleanObm.replace(/º/g, '°')}`,
        `viaturas_config_${cleanObm.replace(/°/g, 'º')}`,
        `custom_default_viaturas_10º GBM`,
        `custom_default_viaturas_10° GBM`,
        `viaturas_config_10º GBM`,
        `viaturas_config_10° GBM`,
        `custom_default_viaturas_global_active`,
        `viaturas_config_global_active`
      ];
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const op = parsed.filter((v: any) => v.tipo !== 'administrativa');
            const list = op.length > 0 ? op : parsed;
            return list.map((v: any) => ({
              ...v,
              exibir: v.exibir !== undefined ? v.exibir : true,
              espaco: v.espaco || (v.maritima || v.vtr?.startsWith('L-') || v.vtr?.startsWith('BIA') ? '1/3' : (v.vtr?.startsWith('AR') || v.vtr?.startsWith('ARC') ? '1/2' : '1'))
            }));
          }
        }
      }
    } catch {}
    return DEFAULT_VIATURAS;
  });

  const getObmActivePattern = async (targetObm?: string): Promise<any[]> => {
    const rawObm = targetObm && targetObm !== 'GLOBAL' ? targetObm : (obmContext && obmContext !== 'GLOBAL' ? obmContext : (user?.obm || '10º GBM'));
    const cleanObm = normalizeObm(rawObm);

    const localKeys = [
      `custom_default_viaturas_${cleanObm}`,
      `custom_default_viaturas_${rawObm}`,
      `viaturas_config_${cleanObm}`,
      `viaturas_config_${rawObm}`,
      `custom_default_viaturas_${cleanObm.replace(/º/g, '°')}`,
      `custom_default_viaturas_${cleanObm.replace(/°/g, 'º')}`,
      `viaturas_config_${cleanObm.replace(/º/g, '°')}`,
      `viaturas_config_${cleanObm.replace(/°/g, 'º')}`,
      `custom_default_viaturas_10º GBM`,
      `custom_default_viaturas_10° GBM`,
      `viaturas_config_10º GBM`,
      `viaturas_config_10° GBM`,
      `custom_default_viaturas_global_active`,
      `viaturas_config_global_active`
    ];
    for (const key of localKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const operational = parsed.filter((v: any) => v.tipo !== 'administrativa');
            const targetList = operational.length > 0 ? operational : parsed;
            return targetList.map((v: any) => ({
              ...v,
              exibir: v.exibir !== undefined ? v.exibir : true,
              espaco: v.espaco || (v.maritima || v.vtr?.startsWith('L-') || v.vtr?.startsWith('BIA') ? '1/3' : (v.vtr?.startsWith('AR') || v.vtr?.startsWith('ARC') ? '1/2' : '1'))
            }));
          }
        }
      } catch {}
    }

    if (db) {
      const docKeys = Array.from(new Set([
        cleanObm.replace(/\//g, '_').replace(/\s/g, '_'),
        rawObm.replace(/\//g, '_').replace(/\s/g, '_'),
        cleanObm.replace(/º/g, '°').replace(/\//g, '_').replace(/\s/g, '_'),
        cleanObm.replace(/°/g, 'º').replace(/\//g, '_').replace(/\s/g, '_'),
        cleanObm.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
        '10º_GBM',
        '10°_GBM',
        '10__gbm',
        '10_gbm',
        '10_GBM'
      ]));
      for (const k of docKeys) {
        try {
          const snap = await getDoc(doc(db, "obm_settings", k));
          if (snap.exists()) {
            const data = snap.data();
            const list = data.viaturas_config || data.viaturas_custom_default;
            if (Array.isArray(list) && list.length > 0) {
              const filtered = list.filter((v: any) => 
                v.tipo !== 'administrativa' && 
                (!v.obm || normalizeObm(v.obm) === cleanObm)
              );
              const targetList = filtered.length > 0 ? filtered : list.filter((v: any) => v.tipo !== 'administrativa');
              const finalItems = (targetList.length > 0 ? targetList : list).map((v: any) => ({
                ...v,
                exibir: v.exibir !== undefined ? v.exibir : true,
                espaco: v.espaco || (v.maritima || v.vtr?.startsWith('L-') || v.vtr?.startsWith('BIA') ? '1/3' : (v.vtr?.startsWith('AR') || v.vtr?.startsWith('ARC') ? '1/2' : '1'))
              }));
              
              try {
                localStorage.setItem(`custom_default_viaturas_${cleanObm}`, JSON.stringify(finalItems));
                localStorage.setItem(`viaturas_config_${cleanObm}`, JSON.stringify(finalItems));
              } catch {}

              return finalItems;
            }
          }
        } catch {}
      }
    }

    return DEFAULT_VIATURAS;
  };

  useEffect(() => {
    const handlePatternUpdate = (e: any) => {
      if (e.detail?.viaturas && Array.isArray(e.detail.viaturas)) {
        const op = e.detail.viaturas.filter((v: any) => v.tipo !== 'administrativa');
        const targetList = op.length > 0 ? op : e.detail.viaturas;
        const updated = targetList.map((v: any) => ({
          ...v,
          exibir: v.exibir !== undefined ? v.exibir : true,
          espaco: v.espaco || (v.maritima || v.vtr?.startsWith('L-') || v.vtr?.startsWith('BIA') ? '1/3' : (v.vtr?.startsWith('AR') || v.vtr?.startsWith('ARC') ? '1/2' : '1'))
        }));
        setViaturasInfo(updated);
      }
    };
    window.addEventListener('obm_viaturas_pattern_updated', handlePatternUpdate);
    return () => window.removeEventListener('obm_viaturas_pattern_updated', handlePatternUpdate);
  }, []);

  const handleApplyObmPattern = async () => {
    try {
      const rawObm = obmContext && obmContext !== 'GLOBAL' ? obmContext : (user?.obm || '10º GBM');
      const cleanObm = normalizeObm(rawObm);
      const pattern = await getObmActivePattern(cleanObm);
      
      setViaturasInfo(pattern);
      isViaturasCustomizedForDate.current = false;

      if (selectedDate) {
        const payload = {
          viaturasInfo: pattern,
          viaturasCustomizedForDate: false,
          updatedAt: new Date().toISOString()
        };

        // Persistência via Backend API com credenciais seguras de servidor
        fetch('/api/escala24h/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            obm: cleanObm,
            date: selectedDate,
            data: payload
          })
        }).catch(err => console.warn('[useEscalaViaturas] Backend API notice:', err));
      }

      setPatternAppliedMessage(`Padrão da OBM aplicado com sucesso! (${pattern.length} viaturas)`);
      setTimeout(() => setPatternAppliedMessage(null), 4000);
    } catch (e) {
      console.error("Erro ao aplicar padrão:", e);
      setPatternAppliedMessage("Erro ao aplicar o padrão da OBM.");
      setTimeout(() => setPatternAppliedMessage(null), 4000);
    }
  };

  const handleAddViaturaExtra = () => {
     const name = window.prompt("Qual o nome/prefixo da viatura extra? (ex: ABT-999)");
     if (!name || name.trim() === '') return;
     const id = name.trim().toUpperCase();
     if (viaturasInfo.some(v => v.id === id)) {
        alert("Viatura já existe na lista!");
        return;
     }
     
     const maritima = id.startsWith("L-") || id.startsWith("BIA-");
     
     const newVtr = {
        id,
        vtr: id,
        ativa: true,
        exibir: true,
        espaco: (maritima ? '1/3' : (id.startsWith('AR') || id.startsWith('ARC') ? '1/2' : '1')),
        maritima,
        condutor: true,
        g1: true,
        g2: true,
        g3: true,
        g4: false,
        cg: true,
        blocked: [],
        isExtra: true
     };
     
     isViaturasCustomizedForDate.current = true;
     setViaturasInfo([...viaturasInfo, newVtr]);
  };

  return {
    viaturasInfo,
    setViaturasInfo,
    isViaturasCustomizedForDate,
    patternAppliedMessage,
    getObmActivePattern,
    handleApplyObmPattern,
    handleAddViaturaExtra,
  };
}
