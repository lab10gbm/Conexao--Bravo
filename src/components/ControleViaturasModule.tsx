import React, { useState, useEffect, useMemo } from 'react';
import { Truck, Plus, Trash2, Save, RotateCcw, Edit2, Check, X, BookmarkCheck, Star, ShieldCheck, Info, Sparkles } from 'lucide-react';
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn, normalizeObm, getObmSettingsDocKey, getObmSettingsFallbackKeys } from '../lib/utils';
import { motion } from 'motion/react';
import { CategoryConfig, DEFAULT_CATEGORIES, getAvailableControlFunctions } from './ControleCategoriasModal';

interface ControleViaturasModuleProps {
  obmContext: string;
}

export interface ViaturaConfig {
  id: string;
  vtr: string;
  ativa: boolean;
  exibir?: boolean;
  espaco?: '1' | '1/2' | '1/3';
  obm?: string;
  tipo?: 'operacional' | 'administrativa';
  maritima?: boolean;
  condutor: boolean | null;
  g1: boolean | null;
  g2: boolean | null;
  g3: boolean | null;
  g4: boolean | null;
  cg: boolean | null;
  blocked: string[];
  customNames?: {
    condutor?: string;
    g1?: string;
    g2?: string;
    g3?: string;
    g4?: string;
    cg?: string;
  };
  customFunctions?: {
    condutor?: string;
    g1?: string;
    g2?: string;
    g3?: string;
    g4?: string;
    cg?: string;
  };
}

const OBM_OPTIONS = [
  "10º GBM",
  "DBM 1/10",
  "DBM 2/10",
  "DBM 3/10",
  "DBM 4/10",
  "26º GBM",
  "DBM 1/26"
];

const DEFAULT_VIATURAS: ViaturaConfig[] = [
  { id: "ABT-143", vtr: "ABT-143", ativa: true, exibir: true, espaco: "1", obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: true, g3: true, g4: false, cg: true, blocked: [] },
  { id: "ABSL-152", vtr: "ABSL-152", ativa: true, exibir: true, espaco: "1", obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: true, g3: false, g4: false, cg: true, blocked: [] },
  { id: "ASE-572", vtr: "ASE-572", ativa: true, exibir: true, espaco: "1", obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "AR-600", vtr: "AR-600", ativa: true, exibir: true, espaco: "1/2", obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: null, g2: null, g3: null, g4: null, cg: null, blocked: ["g1", "g2", "g3", "g4", "cg"] },
  { id: "ARC-162", vtr: "ARC-162", ativa: true, exibir: true, espaco: "1/2", obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: null, g3: null, g4: null, cg: null, blocked: ["g2", "g3", "g4", "cg"] },
  { id: "L-09", vtr: "L-09", ativa: true, exibir: true, espaco: "1/3", obm: "10º GBM", tipo: 'operacional', maritima: true, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "BIA-006", vtr: "BIA-006", ativa: false, exibir: true, espaco: "1/3", obm: "10º GBM", tipo: 'operacional', maritima: true, condutor: false, g1: false, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "BIA-013", vtr: "BIA-013", ativa: false, exibir: true, espaco: "1/3", obm: "10º GBM", tipo: 'operacional', maritima: true, condutor: false, g1: false, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "ABT-12", vtr: "ABT-12", ativa: false, exibir: false, espaco: "1", obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: false, g1: false, g2: false, g3: false, g4: false, cg: false, blocked: [] },
];

function cleanUndefined(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  if (obj !== null && typeof obj === 'object') {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        res[key] = cleanUndefined(val);
      }
    }
    return res;
  }
  return obj;
}

export interface VtrModalFunctionRow {
  uid: string;
  fnId: string; // ID from Controle de Função, or '__CUSTOM__' for custom name
  customName: string;
  maxQty: number; // 1 for Condutor/Chefe, 1..4 for Auxiliar/Marinheiro/etc.
}

export function ControleViaturasModule({ obmContext }: ControleViaturasModuleProps) {
  const [viaturas, setViaturas] = useState<ViaturaConfig[]>([]);
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingVtr, setEditingVtr] = useState<ViaturaConfig | null>(null);
  const [modalFunctions, setModalFunctions] = useState<VtrModalFunctionRow[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isNewDefaultModalOpen, setIsNewDefaultModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [customDefault, setCustomDefault] = useState<ViaturaConfig[] | null>(null);
  const [customDefaultDate, setCustomDefaultDate] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const availableFunctions = useMemo(() => getAvailableControlFunctions(categories), [categories]);
  const groupedFunctions = useMemo(() => {
    const groups: { categoryId: string; categoryName: string; items: typeof availableFunctions }[] = [];
    for (const fn of availableFunctions) {
      let grp = groups.find(g => g.categoryId === fn.categoryId);
      if (!grp) {
        grp = { categoryId: fn.categoryId, categoryName: fn.categoryName, items: [] };
        groups.push(grp);
      }
      grp.items.push(fn);
    }
    return groups;
  }, [availableFunctions]);

  const getFunctionRoleCategory = (fnId: string, customName?: string): 'condutor' | 'chefe' | 'auxiliar' => {
    if (fnId && fnId !== '__CUSTOM__') {
      const fn = availableFunctions.find(f => f.id === fnId);
      if (fn) {
        const sName = fn.scaleName.toUpperCase();
        if (
          fn.categoryId === 'condutores' ||
          fn.id.startsWith('viaturas.') ||
          fn.id === 'ativoCondutor' ||
          fn.id === 'mestreAl' ||
          fn.id === 'mestreBia' ||
          fn.id === 'opAma' ||
          sName.startsWith('CONDUTOR') ||
          sName.startsWith('MESTRE')
        ) {
          return 'condutor';
        }
        if (
          fn.categoryId === 'chefes' ||
          fn.id === 'chefeAbt' ||
          fn.id === 'chefeAbsl' ||
          fn.id === 'ativoChefeGua' ||
          sName.startsWith('CHEFE')
        ) {
          return 'chefe';
        }
        return 'auxiliar';
      }
    }
    const upper = (customName || '').trim().toUpperCase();
    if (upper.startsWith('CONDUTOR') || upper.startsWith('MESTRE') || upper.startsWith('MOTORISTA') || upper.startsWith('OPERADOR')) {
      return 'condutor';
    }
    if (upper.startsWith('CHEFE')) {
      return 'chefe';
    }
    return 'auxiliar';
  };

  const inferDefaultFnIdForSlot = (v: ViaturaConfig, slotGroup: 'condutor' | 'auxiliar' | 'chefe'): string => {
    const vtrName = (v.vtr || '').trim().toUpperCase();
    const rawSigla = vtrName.split(/[-_\s]/)[0] || '';
    const sigla = (rawSigla.startsWith('AR') && rawSigla !== 'ARC') ? 'AR' : rawSigla;
    const isMar = Boolean(v.maritima || sigla === 'L' || sigla === 'BIA');

    if (slotGroup === 'condutor') {
      if (isMar) return sigla === 'BIA' ? 'mestreBia' : 'mestreAl';
      if (sigla === 'ABT') return 'viaturas.ABT';
      if (sigla === 'ABSL') return 'viaturas.ABSL';
      if (sigla === 'ASE') return 'viaturas.ASE';
      if (sigla === 'ARC') return 'viaturas.ARC';
      if (sigla === 'AR') return 'viaturas.AR';
      return 'viaturas.ABT';
    }
    if (slotGroup === 'chefe') {
      if (sigla === 'ABT') return 'chefeAbt';
      if (sigla === 'ABSL') return 'chefeAbsl';
      return 'chefeAbt';
    }
    // auxiliar
    if (isMar) return 'marinheiros';
    if (sigla === 'ABT') return 'auxAbt';
    if (sigla === 'ABSL') return 'auxAbsl';
    if (sigla === 'ASE') return 'auxAse';
    if (sigla === 'ARC') return 'auxArc';
    return 'auxAbt';
  };

  const buildModalFunctionsFromVtr = (v: ViaturaConfig): VtrModalFunctionRow[] => {
    const rows: VtrModalFunctionRow[] = [];

    const resolveSlotFn = (slot: 'condutor' | 'g1' | 'g2' | 'g3' | 'g4' | 'cg', fallbackGroup: 'condutor' | 'auxiliar' | 'chefe') => {
      let explicitId = v.customFunctions?.[slot];
      // Normalize legacy category-level IDs so Marítimos (Geral) is never shown instead of Marinheiro
      if (explicitId === 'ativoMaritimo') explicitId = 'marinheiros';
      if (explicitId === 'ativoCondutor') explicitId = inferDefaultFnIdForSlot(v, 'condutor');
      if (explicitId === 'ativoAuxiliar') explicitId = inferDefaultFnIdForSlot(v, 'auxiliar');
      if (explicitId === 'ativoChefeGua') explicitId = inferDefaultFnIdForSlot(v, 'chefe');

      if (explicitId && availableFunctions.some(f => f.id === explicitId)) {
        return { fnId: explicitId, customName: v.customNames?.[slot] || '' };
      }
      const cName = v.customNames?.[slot]?.trim();
      if (cName) {
        const upper = cName.toUpperCase();
        // Map generic single-word labels to the specific vehicle function (e.g. "MESTRE" on L-09 -> "MESTRE L", "MARINHEIROS" -> "MARINHEIRO")
        if (upper === 'MESTRE' || upper === 'CONDUTOR') {
          const defId = inferDefaultFnIdForSlot(v, 'condutor');
          if (availableFunctions.some(f => f.id === defId)) {
            return { fnId: defId, customName: '' };
          }
        }
        if (upper === 'MARINHEIRO' || upper === 'MARINHEIROS' || upper === 'MARITIMO' || upper === 'MARÍTIMOS' || upper.includes('MARÍTIMOS (GERAL)')) {
          if (availableFunctions.some(f => f.id === 'marinheiros')) {
            return { fnId: 'marinheiros', customName: '' };
          }
        }
        if (upper === 'AUXILIAR' || upper === 'AUXILIARES') {
          const defId = inferDefaultFnIdForSlot(v, 'auxiliar');
          if (availableFunctions.some(f => f.id === defId)) {
            return { fnId: defId, customName: '' };
          }
        }
        if (upper === 'CHEFE' || upper === 'CHEFE GUA' || upper === 'CHEFE DE GUARNIÇÃO') {
          const defId = inferDefaultFnIdForSlot(v, 'chefe');
          if (availableFunctions.some(f => f.id === defId)) {
            return { fnId: defId, customName: '' };
          }
        }
        const match = availableFunctions.find(f => f.scaleName === upper || f.name.trim().toUpperCase() === upper);
        if (match) {
          return { fnId: match.id, customName: cName };
        }
        return { fnId: '__CUSTOM__', customName: cName };
      }
      const defId = inferDefaultFnIdForSlot(v, fallbackGroup);
      const foundDef = availableFunctions.find(f => f.id === defId);
      return { fnId: foundDef ? foundDef.id : (availableFunctions[0]?.id || ''), customName: '' };
    };

    // 1. Condutor / Mestre (sempre 1 vaga)
    if (!v.blocked.includes('condutor') && v.condutor !== null) {
      const { fnId, customName } = resolveSlotFn('condutor', 'condutor');
      rows.push({
        uid: 'fn-condutor',
        fnId,
        customName,
        maxQty: 1,
      });
    }

    // 2. Auxiliares / Marinheiros / Guarnição (até 1..4 vagas)
    const gSlots = (['g1', 'g2', 'g3', 'g4'] as const).filter(s => !v.blocked.includes(s) && v[s] !== null);
    if (gSlots.length > 0) {
      const activeG = gSlots.filter(s => v[s] === true);
      const effectiveSlots = activeG.length > 0 ? activeG : gSlots;
      // Group by resolved function in case there are distinct functions in g1..g4
      const groupedG: { fnId: string; customName: string; count: number }[] = [];
      for (const s of effectiveSlots) {
        const resolved = resolveSlotFn(s, 'auxiliar');
        const last = groupedG[groupedG.length - 1];
        if (last && last.fnId === resolved.fnId && (resolved.fnId !== '__CUSTOM__' || last.customName === resolved.customName)) {
          last.count += 1;
        } else {
          groupedG.push({ ...resolved, count: 1 });
        }
      }
      groupedG.forEach((grp, idx) => {
        if (rows.length < 3) {
          rows.push({
            uid: `fn-aux-${idx}-${Date.now()}`,
            fnId: grp.fnId,
            customName: grp.customName,
            maxQty: Math.max(1, Math.min(4, grp.count)),
          });
        }
      });
    }

    // 3. Chefe de Guarnição (sempre 1 vaga)
    if (rows.length < 3 && !v.blocked.includes('cg') && v.cg !== null) {
      const { fnId, customName } = resolveSlotFn('cg', 'chefe');
      rows.push({
        uid: 'fn-chefe',
        fnId,
        customName,
        maxQty: 1,
      });
    }

    return rows;
  };

  const syncModalFunctionsToVtr = (baseVtr: ViaturaConfig, rows: VtrModalFunctionRow[]): ViaturaConfig => {
    const nextBlocked = new Set<string>(['condutor', 'g1', 'g2', 'g3', 'g4', 'cg']);
    const nextCustomFunctions: NonNullable<ViaturaConfig['customFunctions']> = {};
    const nextCustomNames: NonNullable<ViaturaConfig['customNames']> = {};
    const nextSlots: Record<'condutor' | 'g1' | 'g2' | 'g3' | 'g4' | 'cg', boolean | null> = {
      condutor: null,
      g1: null,
      g2: null,
      g3: null,
      g4: null,
      cg: null,
    };

    const slotActiveVal = baseVtr.ativa !== false;
    let condutorUsed = false;
    let cgUsed = false;
    let gIndex = 0;

    for (const row of rows) {
      if (!row.fnId) continue;
      const roleCat = getFunctionRoleCategory(row.fnId, row.customName);
      const foundFn = availableFunctions.find(f => f.id === row.fnId);
      const resolvedScaleName = row.fnId === '__CUSTOM__'
        ? row.customName.trim().toUpperCase()
        : (foundFn?.scaleName || '');

      if (roleCat === 'condutor' && !condutorUsed) {
        condutorUsed = true;
        nextSlots.condutor = slotActiveVal;
        nextBlocked.delete('condutor');
        if (row.fnId !== '__CUSTOM__') nextCustomFunctions.condutor = row.fnId;
        if (resolvedScaleName) nextCustomNames.condutor = resolvedScaleName;
      } else if (roleCat === 'chefe' && !cgUsed) {
        cgUsed = true;
        nextSlots.cg = slotActiveVal;
        nextBlocked.delete('cg');
        if (row.fnId !== '__CUSTOM__') nextCustomFunctions.cg = row.fnId;
        if (resolvedScaleName) nextCustomNames.cg = resolvedScaleName;
      } else {
        // Auxiliar / Marinheiro / Enfermeiro (até N vagas)
        if (gIndex < 4) {
          const qty = Math.max(1, Math.min(4 - gIndex, row.maxQty || 1));
          for (let k = 0; k < qty; k++) {
            const gSlot = (['g1', 'g2', 'g3', 'g4'] as const)[gIndex++];
            nextSlots[gSlot] = slotActiveVal;
            nextBlocked.delete(gSlot);
            if (row.fnId !== '__CUSTOM__') nextCustomFunctions[gSlot] = row.fnId;
            if (resolvedScaleName) nextCustomNames[gSlot] = resolvedScaleName;
          }
        } else if (!cgUsed) {
          cgUsed = true;
          nextSlots.cg = slotActiveVal;
          nextBlocked.delete('cg');
          if (row.fnId !== '__CUSTOM__') nextCustomFunctions.cg = row.fnId;
          if (resolvedScaleName) nextCustomNames.cg = resolvedScaleName;
        }
      }
    }

    return {
      ...baseVtr,
      ...nextSlots,
      blocked: Array.from(nextBlocked),
      customFunctions: nextCustomFunctions,
      customNames: nextCustomNames,
    };
  };

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => {
      setSuccessMessage(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (!obmContext) return;
    
    // Check local storage first for immediate access
    const localDefStr = localStorage.getItem(`custom_default_viaturas_${obmContext}`);
    const localDefDate = localStorage.getItem(`custom_default_viaturas_date_${obmContext}`);
    let localDef: ViaturaConfig[] | null = null;
    if (localDefStr) {
      try {
        localDef = JSON.parse(localDefStr);
        setCustomDefault(localDef);
        setCustomDefaultDate(localDefDate || null);
      } catch (e) {
        console.error("Erro ao carregar padrão local:", e);
      }
    }

    if (!db) {
      setViaturas(localDef || DEFAULT_VIATURAS);
      setLoading(false);
      return;
    }

    const cleanObm = normalizeObm(obmContext);
    const docKey = getObmSettingsDocKey(obmContext);
    const docRef = doc(db, "obm_settings", docKey);
    
    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      let data = docSnap.exists() ? docSnap.data() : null;

      // Fallback para outras chaves conhecidas se a chave direta não existir
      if (!data || !data.categorias_funcoes) {
        const fallbackKeys = getObmSettingsFallbackKeys(obmContext);
        for (const fk of fallbackKeys) {
          if (fk === docKey) continue;
          try {
            const snapFallback = await getDoc(doc(db, "obm_settings", fk));
            if (snapFallback.exists()) {
              const fbData = snapFallback.data();
              data = { ...fbData, ...(data || {}) };
              if (data?.categorias_funcoes && (data?.viaturas_config || data?.viaturas_custom_default)) {
                break;
              }
            }
          } catch {}
        }
      }

      if (data) {
        if (data.categorias_funcoes && Array.isArray(data.categorias_funcoes)) {
          const migrated = data.categorias_funcoes.map((cat: any) => {
            if (cat.activeProperty !== undefined) return cat;
            let activeProp = `dynamicFunctions.ativo_${cat.id}`;
            const newFunctions = [...(cat.functions || [])];
            const ativoIndex = newFunctions.findIndex((f: any) => f.name.toLowerCase() === "ativo");
            if (ativoIndex >= 0) {
              activeProp = newFunctions[ativoIndex].id;
              newFunctions.splice(ativoIndex, 1);
            } else {
              const defCat = DEFAULT_CATEGORIES.find(d => d.id === cat.id);
              if (defCat) activeProp = defCat.activeProperty;
            }
            return { ...cat, activeProperty: activeProp, functions: newFunctions };
          });
          setCategories(migrated);
        } else {
          setCategories(DEFAULT_CATEGORIES);
        }

        if (data.viaturas_custom_default && Array.isArray(data.viaturas_custom_default)) {
          const loadedDef: ViaturaConfig[] = data.viaturas_custom_default;
          setCustomDefault(loadedDef);
          setCustomDefaultDate(data.viaturas_custom_default_date || null);
          localStorage.setItem(`custom_default_viaturas_${obmContext}`, JSON.stringify(loadedDef));
          localStorage.setItem(`custom_default_viaturas_${cleanObm}`, JSON.stringify(loadedDef));
          if (data.viaturas_custom_default_date) {
            localStorage.setItem(`custom_default_viaturas_date_${obmContext}`, data.viaturas_custom_default_date);
            localStorage.setItem(`custom_default_viaturas_date_${cleanObm}`, data.viaturas_custom_default_date);
          }
        }

        const candidateList = data.viaturas_config || data.viaturas_custom_default;
        if (candidateList && Array.isArray(candidateList)) {
          const loaded: ViaturaConfig[] = candidateList;
          const normalized = loaded.map(v => ({
            ...v,
            exibir: v.exibir !== undefined ? v.exibir : true,
            espaco: v.espaco || (v.maritima || v.vtr?.startsWith('L-') || v.vtr?.startsWith('BIA') ? '1/3' : (v.vtr?.startsWith('AR') || v.vtr?.startsWith('ARC') ? '1/2' : '1'))
          }));
          setViaturas(normalized);
        } else {
          setViaturas(localDef || DEFAULT_VIATURAS);
        }
      } else {
        setCategories(DEFAULT_CATEGORIES);
        setViaturas(localDef || DEFAULT_VIATURAS);
      }
      setLoading(false);
    }, (err) => {
      console.error("Erro ao buscar viaturas config:", err);
      setViaturas(localDef || DEFAULT_VIATURAS);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [obmContext]);

  const handleSave = async () => {
    if (!obmContext) return;
    setSaving(true);
    const nowIso = new Date().toISOString();
    try {
      const payload = cleanUndefined({ 
        viaturas_config: viaturas,
        viaturas_custom_default: viaturas,
        viaturas_custom_default_date: nowIso,
        updatedAt: nowIso
      });
      const cleanObm = normalizeObm(obmContext);
      if (db) {
        const docKeys = Array.from(new Set([
          obmContext.replace(/\//g, '_').replace(/\s/g, '_'),
          cleanObm.replace(/\//g, '_').replace(/\s/g, '_'),
          cleanObm.replace(/º/g, '°').replace(/\//g, '_').replace(/\s/g, '_'),
          cleanObm.replace(/°/g, 'º').replace(/\//g, '_').replace(/\s/g, '_'),
          cleanObm.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
          '10º_GBM',
          '10°_GBM',
          '10__gbm',
          '10_gbm',
          '10_GBM'
        ]));
        for (const key of docKeys) {
          try {
            const docRef = doc(db, "obm_settings", key);
            await setDoc(docRef, payload, { merge: true });
          } catch (e) {
            console.warn("Erro salvando key em obm_settings:", key, e);
          }
        }
      }
      const allLocalKeys = [
        `custom_default_viaturas_${obmContext}`,
        `custom_default_viaturas_${cleanObm}`,
        `custom_default_viaturas_${cleanObm.replace(/º/g, '°')}`,
        `custom_default_viaturas_${cleanObm.replace(/°/g, 'º')}`,
        `custom_default_viaturas_10º GBM`,
        `custom_default_viaturas_10° GBM`,
        `custom_default_viaturas_global_active`,
        `viaturas_config_${obmContext}`,
        `viaturas_config_${cleanObm}`,
        `viaturas_config_${cleanObm.replace(/º/g, '°')}`,
        `viaturas_config_${cleanObm.replace(/°/g, 'º')}`,
        `viaturas_config_10º GBM`,
        `viaturas_config_10° GBM`,
        `viaturas_config_global_active`
      ];
      for (const k of allLocalKeys) {
        localStorage.setItem(k, JSON.stringify(viaturas));
      }
      localStorage.setItem(`custom_default_viaturas_date_${obmContext}`, nowIso);
      localStorage.setItem(`custom_default_viaturas_date_${cleanObm}`, nowIso);
      
      setCustomDefault(viaturas);
      setCustomDefaultDate(nowIso);

      window.dispatchEvent(new CustomEvent('obm_viaturas_pattern_updated', {
        detail: { obmContext, viaturas, date: nowIso }
      }));

      setSuccessMessage("Configuração de viaturas salva com sucesso! Novo padrão sincronizado para as escalas.");
    } catch (err) {
      console.error("Erro ao salvar viaturas:", err);
      alert("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewDefault = async () => {
    if (!obmContext) return;
    setSaving(true);
    const nowIso = new Date().toISOString();
    try {
      const payload = cleanUndefined({
        viaturas_config: viaturas,
        viaturas_custom_default: viaturas,
        viaturas_custom_default_date: nowIso,
        updatedAt: nowIso
      });
      const cleanObm = normalizeObm(obmContext);
      if (db) {
        const docKeys = Array.from(new Set([
          obmContext.replace(/\//g, '_').replace(/\s/g, '_'),
          cleanObm.replace(/\//g, '_').replace(/\s/g, '_'),
          cleanObm.replace(/º/g, '°').replace(/\//g, '_').replace(/\s/g, '_'),
          cleanObm.replace(/°/g, 'º').replace(/\//g, '_').replace(/\s/g, '_'),
          cleanObm.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
          '10º_GBM',
          '10°_GBM',
          '10__gbm',
          '10_gbm',
          '10_GBM'
        ]));
        for (const key of docKeys) {
          try {
            const docRef = doc(db, "obm_settings", key);
            await setDoc(docRef, payload, { merge: true });
          } catch (e) {
            console.warn("Erro salvando novo padrão na key:", key, e);
          }
        }
      }
      const allLocalKeys = [
        `custom_default_viaturas_${obmContext}`,
        `custom_default_viaturas_${cleanObm}`,
        `custom_default_viaturas_${cleanObm.replace(/º/g, '°')}`,
        `custom_default_viaturas_${cleanObm.replace(/°/g, 'º')}`,
        `custom_default_viaturas_10º GBM`,
        `custom_default_viaturas_10° GBM`,
        `custom_default_viaturas_global_active`,
        `viaturas_config_${obmContext}`,
        `viaturas_config_${cleanObm}`,
        `viaturas_config_${cleanObm.replace(/º/g, '°')}`,
        `viaturas_config_${cleanObm.replace(/°/g, 'º')}`,
        `viaturas_config_10º GBM`,
        `viaturas_config_10° GBM`,
        `viaturas_config_global_active`
      ];
      for (const k of allLocalKeys) {
        localStorage.setItem(k, JSON.stringify(viaturas));
      }
      localStorage.setItem(`custom_default_viaturas_date_${obmContext}`, nowIso);
      localStorage.setItem(`custom_default_viaturas_date_${cleanObm}`, nowIso);
      
      setCustomDefault(viaturas);
      setCustomDefaultDate(nowIso);
      setIsNewDefaultModalOpen(false);
      setSuccessMessage("Novo padrão criado com sucesso! Agora esta é a sua referência padrão ao retornar ao padrão.");

      window.dispatchEvent(new CustomEvent('obm_viaturas_pattern_updated', {
        detail: { obmContext, viaturas, date: nowIso }
      }));
    } catch (err) {
      console.error("Erro ao criar novo padrão:", err);
      alert("Erro ao salvar novo padrão.");
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreCustomDefault = () => {
    if (customDefault && customDefault.length > 0) {
      setViaturas(customDefault);
      setSuccessMessage("Viaturas restauradas com sucesso para o seu Novo Padrão de Referência!");
    } else {
      setViaturas(DEFAULT_VIATURAS);
      setSuccessMessage("Viaturas restauradas para o padrão inicial de fábrica.");
    }
    setIsRestoreModalOpen(false);
  };

  const handleRestoreFactoryDefault = () => {
    setViaturas(DEFAULT_VIATURAS);
    setSuccessMessage("Viaturas restauradas para o padrão original de fábrica do sistema.");
    setIsRestoreModalOpen(false);
  };

  const toggleProperty = (vtrId: string, property: keyof ViaturaConfig) => {
    setViaturas(prev => prev.map(v => {
      if (v.id === vtrId) {
        if (property === 'ativa') {
          return { ...v, ativa: !v.ativa };
        }
        
        // Handle positions (condutor, g1, g2, g3, g4, cg)
        if (v.blocked.includes(property as string)) {
          // Blocked -> False
          const newBlocked = v.blocked.filter(p => p !== property);
          return { ...v, [property]: false, blocked: newBlocked };
        } else {
          const currentValue = v[property];
          if (currentValue === false) {
             // False -> True
             return { ...v, [property]: true };
          } else {
             // True -> Blocked
             const newBlocked = [...v.blocked, property as string];
             return { ...v, [property]: null, blocked: newBlocked };
          }
        }
      }
      return v;
    }));
  };

  const handleObmChange = (vtrId: string, newObm: string) => {
    setViaturas(prev => prev.map(v => v.id === vtrId ? { ...v, obm: newObm } : v));
  };

  const moveViaturaUp = (vtrId: string, currentList: ViaturaConfig[]) => {
    const listIdx = currentList.findIndex(v => v.id === vtrId);
    if (listIdx <= 0) return;
    const targetId = currentList[listIdx - 1].id;
    setViaturas(prev => {
      const idxA = prev.findIndex(v => v.id === vtrId);
      const idxB = prev.findIndex(v => v.id === targetId);
      if (idxA === -1 || idxB === -1) return prev;
      const next = [...prev];
      const temp = next[idxA];
      next[idxA] = next[idxB];
      next[idxB] = temp;
      return next;
    });
  };

  const moveViaturaDown = (vtrId: string, currentList: ViaturaConfig[]) => {
    const listIdx = currentList.findIndex(v => v.id === vtrId);
    if (listIdx < 0 || listIdx >= currentList.length - 1) return;
    const targetId = currentList[listIdx + 1].id;
    setViaturas(prev => {
      const idxA = prev.findIndex(v => v.id === vtrId);
      const idxB = prev.findIndex(v => v.id === targetId);
      if (idxA === -1 || idxB === -1) return prev;
      const next = [...prev];
      const temp = next[idxA];
      next[idxA] = next[idxB];
      next[idxB] = temp;
      return next;
    });
  };

  const handleOpenAddVtr = () => {
    const newVtr: ViaturaConfig = {
      id: Date.now().toString(),
      vtr: '',
      ativa: true,
      exibir: true,
      espaco: '1',
      obm: obmContext || "10º GBM",
      tipo: 'operacional',
      maritima: false,
      condutor: true,
      g1: true,
      g2: true,
      g3: true,
      g4: null,
      cg: true,
      blocked: ['g4'],
      customNames: {},
      customFunctions: {}
    };
    setEditingVtr(newVtr);
    setModalFunctions(buildModalFunctionsFromVtr(newVtr));
    setIsAdding(true);
  };

  const handleDeleteVtr = (id: string) => {
    setViaturas(prev => prev.filter(v => v.id !== id));
    setConfirmDeleteId(null);
  };

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">Carregando...</div>;
  }

  const renderTable = (viaturasList: ViaturaConfig[], title: string, subtitle: string) => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="bg-slate-800 border-b border-slate-700 p-3 px-4 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Truck className="w-4 h-4 text-slate-400" />
            {title}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">{subtitle}</p>
        </div>
        <span className="text-[10px] font-bold text-slate-300 bg-slate-700 px-2 py-0.5 rounded-full uppercase tracking-widest">
          Configuração OBM
        </span>
      </div>

      <div className="p-4 sm:p-6 bg-slate-50 relative overflow-x-auto">
        <table className="w-full text-left text-[10px] font-bold uppercase tracking-wider bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm min-w-[760px]">
          <thead className="bg-[#1e293b] text-white text-[11px]">
            <tr>
              <th className="p-3 px-2 border-b border-r border-[#334155] w-14 text-center" title="Alterar ordem da viatura">
                Ordem
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] w-36 text-center" title="Exibir VTR na escala gerada e definir espaço (1, 1/2 ou 1/3)">
                Exibição
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] w-12 text-center" title="Ativar VTR?">
                Ativar
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-28">
                Viaturas
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-28">
                OBM
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-20">
                Situação
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-20" title="Condutor (Viatura Terrestre) ou Mestre (Embarcação Marítima)">
                Cond. / Mestre
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-12">
                G1
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-12">
                G2
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-12">
                G3
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-12">
                G4
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-12">
                CG
              </th>
              <th className="p-3 px-2 border-b border-[#334155] text-center w-20">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {viaturasList.map((vtr, idx) => {
              const isAtiva = Boolean(vtr.ativa);
              const isExibir = vtr.exibir !== undefined ? Boolean(vtr.exibir) : true;
              const vtrEspaco: '1' | '1/2' | '1/3' = vtr.espaco === '1/3' ? '1/3' : (vtr.espaco === '1/2' ? '1/2' : '1');

              const isFirst = idx === 0;
              const isLast = idx === viaturasList.length - 1;

              const setEspaco = (e: React.MouseEvent, esp: '1' | '1/2' | '1/3') => {
                e.stopPropagation();
                setViaturas(prev => prev.map(v => v.id === vtr.id ? { ...v, espaco: esp } : v));
              };

              const toggleExibir = (e: React.MouseEvent) => {
                e.stopPropagation();
                setViaturas(prev => prev.map(v => v.id === vtr.id ? { ...v, exibir: !(v.exibir !== undefined ? Boolean(v.exibir) : true) } : v));
              };

              const toggleVtr = (e: React.MouseEvent) => {
                e.stopPropagation();
                toggleProperty(vtr.id, 'ativa');
              };

              return (
                <tr key={vtr.id} className={cn("hover:bg-slate-50 transition-colors group", idx % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                  {/* Ordem */}
                  <td className="p-1 px-1.5 border-r border-slate-200 text-center align-middle">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveViaturaUp(vtr.id, viaturasList); }}
                        disabled={isFirst}
                        className={cn(
                          "w-5 h-5 rounded flex items-center justify-center text-[10px] font-black transition-colors cursor-pointer",
                          isFirst
                            ? "text-slate-300 cursor-not-allowed"
                            : "bg-slate-100 hover:bg-slate-700 hover:text-white text-slate-700 shadow-xs"
                        )}
                        title="Mover viatura para cima"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveViaturaDown(vtr.id, viaturasList); }}
                        disabled={isLast}
                        className={cn(
                          "w-5 h-5 rounded flex items-center justify-center text-[10px] font-black transition-colors cursor-pointer",
                          isLast
                            ? "text-slate-300 cursor-not-allowed"
                            : "bg-slate-100 hover:bg-slate-700 hover:text-white text-slate-700 shadow-xs"
                        )}
                        title="Mover viatura para baixo"
                      >
                        ▼
                      </button>
                    </div>
                  </td>

                  {/* Exibição */}
                  <td className="p-1 px-2 border-r border-slate-200 text-center align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                      <div
                        onClick={toggleExibir}
                        title={isExibir ? "Viatura exibida na escala gerada" : "Viatura oculta na escala gerada"}
                        className="cursor-pointer shrink-0"
                      >
                        {isExibir ? (
                          <div className="w-4 h-4 bg-slate-700/80 rounded-[3px] text-white flex items-center justify-center shadow-sm hover:bg-slate-800 transition">
                            <span className="text-[10px]">✓</span>
                          </div>
                        ) : (
                          <div className="w-4 h-4 border border-slate-300 rounded-[3px] hover:border-slate-500 transition" />
                        )}
                      </div>

                      <div
                        className={cn(
                          "inline-flex items-center rounded border border-slate-200 overflow-hidden bg-slate-100 text-[9px] font-black transition-opacity",
                          !isExibir && "opacity-40"
                        )}
                      >
                        <button
                          type="button"
                          onClick={(e) => setEspaco(e, '1')}
                          className={cn(
                            "px-1.5 py-0.5 transition-colors cursor-pointer",
                            vtrEspaco === '1'
                              ? "bg-slate-800 text-white font-black"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                          )}
                          title="1 espaço completo (coluna inteira)"
                        >
                          1
                        </button>
                        <button
                          type="button"
                          onClick={(e) => setEspaco(e, '1/2')}
                          className={cn(
                            "px-1 py-0.5 border-l border-slate-200 transition-colors cursor-pointer",
                            vtrEspaco === '1/2'
                              ? "bg-slate-800 text-white font-black"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                          )}
                          title="1/2 espaço (meia coluna compartilhada)"
                        >
                          1/2
                        </button>
                        <button
                          type="button"
                          onClick={(e) => setEspaco(e, '1/3')}
                          className={cn(
                            "px-1 py-0.5 border-l border-slate-200 transition-colors cursor-pointer",
                            vtrEspaco === '1/3'
                              ? "bg-slate-800 text-white font-black"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                          )}
                          title="1/3 espaço (terço de coluna compartilhada)"
                        >
                          1/3
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* Ativar */}
                  <td
                    className="p-1 border-r border-slate-200 text-center align-middle cursor-pointer"
                    onClick={toggleVtr}
                    title={isAtiva ? "Viatura ativa" : "Viatura inativa"}
                  >
                    {isAtiva ? (
                      <div className="w-4 h-4 bg-slate-700/80 rounded-[3px] text-white flex items-center justify-center mx-auto shadow-sm hover:bg-slate-800 transition">
                        <span className="text-[10px]">✓</span>
                      </div>
                    ) : (
                      <div className="w-4 h-4 border border-slate-300 rounded-[3px] mx-auto hover:border-slate-500 transition" />
                    )}
                  </td>

                  {/* Viatura Nome + Resumo de Funções */}
                  <td className="p-2 border-r border-slate-200 text-center">
                    <div className="font-black text-slate-800">{vtr.vtr}</div>
                    <div className="flex flex-col items-center justify-center gap-1 mt-1">
                      {buildModalFunctionsFromVtr(vtr).map((fnRow) => {
                        const found = availableFunctions.find(f => f.id === fnRow.fnId);
                        const label = fnRow.fnId === '__CUSTOM__'
                          ? (fnRow.customName || 'CUSTOM')
                          : (found?.scaleName || found?.name || 'FUNÇÃO');
                        const roleCat = getFunctionRoleCategory(fnRow.fnId, fnRow.customName);
                        const qtyLabel = roleCat === 'auxiliar' ? `ATÉ ${fnRow.maxQty}` : '1';
                        return (
                          <span
                            key={fnRow.uid}
                            className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[8px] font-bold text-slate-700 uppercase leading-tight whitespace-nowrap"
                          >
                            {label} ({qtyLabel})
                          </span>
                        );
                      })}
                    </div>
                  </td>

                  {/* OBM */}
                  <td className="p-2 border-r border-slate-200 text-center">
                    <select
                      value={vtr.obm || "10º GBM"}
                      onChange={(e) => handleObmChange(vtr.id, e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[10px] font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
                    >
                      {OBM_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </td>

                  {/* Situação */}
                  <td className="p-1 px-2 border-r border-slate-200 text-center align-middle">
                    {isAtiva ? (
                      <span className="bg-[#2c533e] text-emerald-50 px-2 py-1 text-[9px] w-full block rounded-[3px]">
                        ATIVA
                      </span>
                    ) : (
                      <span className="bg-[#fac7b0] text-[#783f2a] px-2 py-1 text-[9px] w-full block rounded-[3px] font-black">
                        INATIVA
                      </span>
                    )}
                  </td>

                  {/* Slots: Condutor, G1, G2, G3, G4, CG */}
                  {['condutor', 'g1', 'g2', 'g3', 'g4', 'cg'].map((prop) => {
                    const isBlocked = vtr.blocked.includes(prop);
                    const isChecked = vtr[prop as keyof ViaturaConfig] === true;

                    if (isBlocked) {
                      return (
                        <td
                          key={prop}
                          className="bg-slate-700 opacity-90 p-0 border-r border-slate-200 text-center cursor-pointer"
                          onClick={() => toggleProperty(vtr.id, prop as keyof ViaturaConfig)}
                          title="Clique para alternar: Bloqueado -> Desmarcado"
                        >
                          <div className="w-full h-full min-h-[32px] flex items-center justify-center"></div>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={prop}
                        className="p-1 border-r border-slate-200 text-center align-middle cursor-pointer"
                        onClick={() => toggleProperty(vtr.id, prop as keyof ViaturaConfig)}
                        title="Clique para alternar: Desmarcado -> Marcado -> Bloqueado"
                      >
                        <div className="flex items-center justify-center h-full p-2">
                          {isChecked ? (
                            <div className="w-3.5 h-3.5 bg-slate-700/80 rounded-[3px] text-white flex items-center justify-center shadow-sm hover:bg-slate-800 transition">
                              <span className="text-[10px]">✓</span>
                            </div>
                          ) : (
                            <div className="w-3.5 h-3.5 border border-slate-300 rounded-[3px] hover:border-slate-500 transition" />
                          )}
                        </div>
                      </td>
                    );
                  })}

                  {/* Ações */}
                  <td className="p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => {
                          setEditingVtr(vtr);
                          setModalFunctions(buildModalFunctionsFromVtr(vtr));
                          setIsAdding(false);
                        }}
                        className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Editar viatura"
                      >
                        <Edit2 className="w-4 h-4 mx-auto" />
                      </button>
                      {confirmDeleteId === vtr.id ? (
                        <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                          <button
                            onClick={() => handleDeleteVtr(vtr.id)}
                            className="p-1.5 text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Confirmar exclusão"
                          >
                            <Check className="w-4 h-4 mx-auto" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="p-1.5 text-slate-500 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4 mx-auto" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(vtr.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remover viatura"
                        >
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {viaturasList.length === 0 && (
              <tr>
                <td colSpan={13} className="p-8 text-center text-slate-400 font-bold">
                  Nenhuma viatura cadastrada nesta categoria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Toast de Notificação */}
      {successMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold">{successMessage}</p>
          <button
            onClick={() => setSuccessMessage(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal Criar Novo Padrão */}
      {isNewDefaultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsNewDefaultModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <BookmarkCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-slate-800">
                  Criar Novo Padrão de Viaturas
                </h2>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Unidade: {obmContext}
                </p>
              </div>
            </div>

            <div className="space-y-4 my-2">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs text-emerald-900 leading-relaxed font-medium">
                <p className="font-bold text-emerald-950 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Nova Referência Padrão Permanente
                </p>
                Você está prestes a definir a configuração atual como o <strong>novo padrão de referência</strong> para esta OBM. Uma vez definido:
                <ul className="list-disc pl-5 mt-2 space-y-1 text-[11px]">
                  <li>Ao clicar em <strong>"Retornar ao Padrão"</strong> (aqui ou na escala diária de 24h), esta nova referência será restaurada.</li>
                  <li>Novas escalas geradas herdarão esta ordem, visualizações e guarnições.</li>
                </ul>
              </div>

              {/* Resumo da Configuração Atual */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-3">
                  Resumo da Configuração que se tornará o Novo Padrão:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Total VTRs</span>
                    <span className="text-base font-black text-slate-800">{viaturas.length}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Ativas</span>
                    <span className="text-base font-black text-emerald-600">{viaturas.filter(v => v.ativa).length}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Exibidas</span>
                    <span className="text-base font-black text-indigo-600">{viaturas.filter(v => v.exibir !== false).length}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Espaços</span>
                    <span className="text-[11px] font-black text-slate-700 block mt-0.5">
                      {viaturas.filter(v => (v.espaco || '1') === '1').length} [1] • {viaturas.filter(v => v.espaco === '1/2').length} [½] • {viaturas.filter(v => v.espaco === '1/3').length} [⅓]
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-[10px] text-slate-500 font-semibold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  A ordem atual das viaturas também ficará gravada como padrão permanente.
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsNewDefaultModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateNewDefault}
                disabled={saving}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-colors shadow-sm disabled:opacity-50"
              >
                <BookmarkCheck className="w-4 h-4" />
                {saving ? "Salvando..." : "Confirmar e Definir Novo Padrão"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Retornar ao Padrão */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsRestoreModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-slate-800">
                  Retornar ao Padrão
                </h2>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Selecione a referência a restaurar
                </p>
              </div>
            </div>

            <div className="space-y-3 my-2">
              {customDefault && customDefault.length > 0 ? (
                <>
                  {/* Opção 1: Novo Padrão Definido */}
                  <div
                    onClick={handleRestoreCustomDefault}
                    className="p-4 rounded-2xl border-2 border-emerald-500/40 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                        <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                        Restaurar Meu Novo Padrão
                      </span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                        Ativo
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-snug">
                      Restaura o padrão personalizado definido para esta OBM ({customDefault.length} viaturas
                      {customDefaultDate ? ` • salvo em ${formatDateTime(customDefaultDate)}` : ''}).
                    </p>
                  </div>

                  {/* Opção 2: Padrão Original de Fábrica */}
                  <div
                    onClick={handleRestoreFactoryDefault}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-slate-500" />
                        Restaurar Padrão de Fábrica
                      </span>
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        Original
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Redefine para o padrão inicial do sistema (9 viaturas originais do Corpo de Bombeiros).
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 leading-relaxed">
                  <p className="font-bold text-slate-900 mb-1">Padrão Inicial do Sistema</p>
                  Ainda não foi definido um novo padrão personalizado para esta OBM. Deseja restaurar a configuração para o padrão original de fábrica (9 viaturas)?
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={handleRestoreFactoryDefault}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black uppercase text-xs tracking-wider py-2.5 rounded-xl transition"
                    >
                      Restaurar Padrão de Fábrica
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar / Editar Viatura */}
      {editingVtr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button 
              onClick={() => {
                setEditingVtr(null);
                setIsAdding(false);
              }}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-800 mb-4">
              {isAdding ? "Adicionar Viatura" : "Editar Viatura"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Nome da Viatura</label>
                <input 
                  type="text" 
                  value={editingVtr.vtr}
                  onChange={(e) => setEditingVtr({...editingVtr, vtr: e.target.value.toUpperCase()})}
                  className="w-full p-2 mt-1 border border-slate-200 rounded-xl uppercase font-bold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="Ex: ABT-999"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Tipo</label>
                  <select 
                    value={editingVtr.tipo || 'operacional'}
                    onChange={(e) => setEditingVtr({...editingVtr, tipo: e.target.value as 'operacional' | 'administrativa'})}
                    className="w-full p-2 mt-1 border border-slate-200 rounded-xl uppercase font-bold bg-white text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                  >
                    <option value="operacional">Operacional</option>
                    <option value="administrativa">Administrativa</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 p-2 px-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors h-[42px] mb-[1px]">
                    <input
                      type="checkbox"
                      checked={editingVtr.maritima || false}
                      onChange={e => setEditingVtr({...editingVtr, maritima: e.target.checked})}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700 uppercase">Marítima</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Espaço na Escala</label>
                  <select 
                    value={editingVtr.espaco || '1'}
                    onChange={(e) => setEditingVtr({...editingVtr, espaco: e.target.value as '1' | '1/2' | '1/3'})}
                    className="w-full p-2 mt-1 border border-slate-200 rounded-xl uppercase font-bold bg-white text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                  >
                    <option value="1">1 (Espaço Completo)</option>
                    <option value="1/2">1/2 (Meia Coluna Compartilhada)</option>
                    <option value="1/3">1/3 (Terço de Coluna Compartilhada)</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 p-2 px-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors h-[42px] mb-[1px]">
                    <input
                      type="checkbox"
                      checked={editingVtr.exibir !== undefined ? editingVtr.exibir : true}
                      onChange={e => setEditingVtr({...editingVtr, exibir: e.target.checked})}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700 uppercase">Exibir na Escala</span>
                  </label>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-black uppercase text-slate-700">
                    Funções da Viatura
                  </h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {modalFunctions.length} de 3 funções
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
                  Adicione até <strong>3 funções</strong> cadastradas no <strong>Controle de Função</strong>. Condutor/Mestre e Chefe possuem <strong>1 vaga fixa</strong>; Auxiliares e Marinheiros permitem escolher a quantidade (ex: <strong>até 3 militares</strong>).
                </p>

                <div className="space-y-2.5">
                  {modalFunctions.map((row, idx) => {
                    const roleCat = getFunctionRoleCategory(row.fnId, row.customName);
                    const isSingleRole = roleCat === 'condutor' || roleCat === 'chefe';
                    const matchedFn = availableFunctions.find(f => f.id === row.fnId);

                    const updateRow = (patch: Partial<VtrModalFunctionRow>) => {
                      const nextRows = modalFunctions.map((r, i) => (i === idx ? { ...r, ...patch } : r));
                      setModalFunctions(nextRows);
                      setEditingVtr(prev => (prev ? syncModalFunctionsToVtr(prev, nextRows) : null));
                    };

                    const removeRow = () => {
                      const nextRows = modalFunctions.filter((_, i) => i !== idx);
                      setModalFunctions(nextRows);
                      setEditingVtr(prev => (prev ? syncModalFunctionsToVtr(prev, nextRows) : null));
                    };

                    return (
                      <div
                        key={row.uid}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-black flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider">
                              {roleCat === 'condutor'
                                ? 'Condução / Mestre'
                                : roleCat === 'chefe'
                                ? 'Chefia de Guarnição'
                                : 'Guarnição / Auxiliar'}
                            </span>
                            {matchedFn && (
                              <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[9px] font-bold uppercase">
                                {matchedFn.categoryName}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={removeRow}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[9px] font-bold uppercase"
                            title="Remover esta função da viatura"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remover</span>
                          </button>
                        </div>

                        <div className="flex gap-2 items-end">
                          {/* Seletor da Função */}
                          <div className="flex-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">
                              Função (Controle de Função)
                            </label>
                            <select
                              value={row.fnId}
                              onChange={(e) => {
                                const newFnId = e.target.value;
                                const newRoleCat = getFunctionRoleCategory(newFnId, row.customName);
                                const nextQty =
                                  newRoleCat === 'condutor' || newRoleCat === 'chefe'
                                    ? 1
                                    : row.maxQty > 1
                                    ? row.maxQty
                                    : 3;
                                updateRow({
                                  fnId: newFnId,
                                  maxQty: nextQty,
                                });
                              }}
                              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 uppercase outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
                            >
                              <option value="">-- Selecione a Função --</option>
                              {groupedFunctions.map(group => (
                                <optgroup key={group.categoryId} label={group.categoryName.toUpperCase()}>
                                  {group.items.map(fn => (
                                    <option key={fn.id} value={fn.id}>
                                      {fn.name.toUpperCase()} {fn.scaleName !== fn.name.toUpperCase() ? `(${fn.scaleName})` : ''}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                              <optgroup label="PERSONALIZADO">
                                <option value="__CUSTOM__">+ DIGITAR NOME PERSONALIZADO...</option>
                              </optgroup>
                            </select>
                          </div>

                          {/* Seletor de Quantidade (1 fixo p/ Condutor/Chefe, Até 1..4 p/ Auxiliar/Marinheiro) */}
                          <div className="w-36 shrink-0">
                            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">
                              Quantidade (Vagas)
                            </label>
                            {isSingleRole ? (
                              <div
                                className="w-full p-2 bg-slate-200/70 border border-slate-200 rounded-xl text-xs font-black text-slate-600 uppercase text-center select-none"
                                title="Funções de Condutor, Mestre e Chefe possuem sempre 1 militar por viatura"
                              >
                                1 Militar (Fixo)
                              </div>
                            ) : (
                              <select
                                value={row.maxQty}
                                onChange={(e) => updateRow({ maxQty: Number(e.target.value) })}
                                className="w-full p-2 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs font-black text-indigo-700 uppercase outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
                              >
                                <option value={1}>Até 1 Militar</option>
                                <option value={2}>Até 2 Militares</option>
                                <option value={3}>Até 3 Militares</option>
                                <option value={4}>Até 4 Militares</option>
                              </select>
                            )}
                          </div>
                        </div>

                        {row.fnId === '__CUSTOM__' && (
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">
                              Digite o Nome da Função
                            </label>
                            <input
                              type="text"
                              value={row.customName}
                              onChange={(e) => updateRow({ customName: e.target.value.toUpperCase() })}
                              placeholder="Ex: AUXILIAR, MARINHEIRO, SOCORRISTA, CHEFE..."
                              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {modalFunctions.length === 0 && (
                    <div className="p-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400 font-bold uppercase">
                      Nenhuma função adicionada nesta viatura.
                    </div>
                  )}
                </div>

                {modalFunctions.length < 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      const hasCond = modalFunctions.some(r => getFunctionRoleCategory(r.fnId, r.customName) === 'condutor');
                      const hasAux = modalFunctions.some(r => getFunctionRoleCategory(r.fnId, r.customName) === 'auxiliar');
                      const nextGroup: 'condutor' | 'auxiliar' | 'chefe' = !hasCond ? 'condutor' : !hasAux ? 'auxiliar' : 'chefe';
                      const suggestedFnId = inferDefaultFnIdForSlot(editingVtr, nextGroup);
                      const validFnId = availableFunctions.some(f => f.id === suggestedFnId)
                        ? suggestedFnId
                        : (availableFunctions[0]?.id || '');
                      const newRow: VtrModalFunctionRow = {
                        uid: `fn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        fnId: validFnId,
                        customName: '',
                        maxQty: nextGroup === 'auxiliar' ? 3 : 1,
                      };
                      const nextRows = [...modalFunctions, newRow];
                      setModalFunctions(nextRows);
                      setEditingVtr(prev => (prev ? syncModalFunctionsToVtr(prev, nextRows) : null));
                    }}
                    className="mt-3 w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Função ({modalFunctions.length}/3)
                  </button>
                )}
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  if (!editingVtr.vtr.trim()) {
                    alert("O nome da viatura é obrigatório.");
                    return;
                  }
                  if (viaturas.some(v => v.vtr === editingVtr.vtr && v.id !== editingVtr.id)) {
                    alert("Já existe outra viatura com este nome.");
                    return;
                  }
                  const syncedVtr = syncModalFunctionsToVtr(editingVtr, modalFunctions);
                  if (isAdding) {
                    setViaturas(prev => [...prev, syncedVtr]);
                  } else {
                    setViaturas(prev => prev.map(v => v.id === syncedVtr.id ? syncedVtr : v));
                  }
                  setEditingVtr(null);
                  setIsAdding(false);
                }}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                {isAdding ? "Adicionar" : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Ações Superior com ferramenta Criar Novo Padrão */}
      <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
         <div className="flex flex-wrap items-center gap-3">
           <button
             onClick={handleOpenAddVtr}
             className="bg-rose-600 hover:bg-rose-700 text-white py-2.5 px-5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
           >
             <Plus className="w-4 h-4" /> Adicionar Viatura
           </button>

           {/* Ferramenta: Criar Novo Padrão */}
           <button
             type="button"
             onClick={() => setIsNewDefaultModalOpen(true)}
             className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
             title="Definir esta configuração (ordem, exibição, espaços e guarnições) como o Novo Padrão Permanente da OBM"
           >
             <BookmarkCheck className="w-4 h-4" /> Criar Novo Padrão
           </button>
         </div>

         {/* Status do Padrão Atual & Botões de Ação */}
         <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
           {/* Chip informativo do padrão ativo */}
           <div
             className={cn(
               "flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-2xs",
               customDefault
                 ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                 : "bg-slate-100 text-slate-600 border-slate-200"
             )}
             title={customDefault ? `Padrão salvo em ${formatDateTime(customDefaultDate)}` : "Padrão de fábrica do sistema"}
           >
             <span
               className={cn(
                 "w-2 h-2 rounded-full",
                 customDefault ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
               )}
             />
             <span>
               {customDefault ? "Novo Padrão OBM Ativo" : "Padrão de Fábrica"}
             </span>
           </div>

           {/* Botão Retornar ao Padrão */}
           <button
             type="button"
             onClick={() => setIsRestoreModalOpen(true)}
             className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 shadow-sm rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
             title="Restaurar para a referência padrão (Novo Padrão ou Padrão de Fábrica)"
           >
             <RotateCcw className="w-4 h-4 text-slate-500" /> Retornar ao Padrão
           </button>

           {/* Botão Salvar Configuração */}
           <button
             onClick={handleSave}
             disabled={saving}
             className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 text-white shadow-sm rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all disabled:opacity-50 cursor-pointer"
             title="Salvar alterações na configuração ativa"
           >
             <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Configuração"}
           </button>
         </div>
      </div>

      {renderTable(
        viaturas.filter(v => v.tipo !== 'administrativa'), 
        "Viaturas Operacionais", 
        "Viaturas destinadas ao socorro e atividades de resposta a emergências"
      )}

      {renderTable(
        viaturas.filter(v => v.tipo === 'administrativa'), 
        "Viaturas Administrativas", 
        "Viaturas destinadas a apoio, vistorias e atividades administrativas"
      )}

    </div>
  );
}
