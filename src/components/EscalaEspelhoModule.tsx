import React, { useState, useEffect, useMemo, useRef } from "react";
import { useMilitars } from "../contexts/MilitarContext";
import { PermutaRequest, PermutaStatus, UserProfile, OfficerVisibility } from "../types";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  getDoc,
  setDoc,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { format, parseISO, addDays, startOfToday, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseDateToIso } from "../lib/conflitosOperacionais";

import { parseRank, sortAllBySeniority } from "../lib/rankUtils";
import { lazyWithRetry } from "../lib/lazyWithRetry";
const EscalaPrintView = lazyWithRetry(() => import("./EscalaPrintView").then(m => ({ default: m.EscalaPrintView })));
const RequestPermuta = lazyWithRetry(() => import("./RequestPermuta").then(m => ({ default: m.RequestPermuta })));
import { AfastamentosAlaModule } from "./AfastamentosAlaModule";
import { ExpedienteDiaModule } from "./ExpedienteDiaModule";
import { GrdDiaModule } from "./GrdDiaModule";
import { SentinelasSection } from "./SentinelasSection";
import { SentinelaSlot } from "../lib/sentinelaUtils";
import { EscalaPostosSection } from "../features/escala24h/components/EscalaPostosSection";
import { PostoConfig, EscalaPostoData, DEFAULT_POSTOS } from "../features/postos/types";
import { EscalanteDashboardCalendar } from "./EscalanteDashboardCalendar";
import { CategoryConfig, DEFAULT_CATEGORIES, getAvailableControlFunctions } from "./ControleCategoriasModal";
const SorteioFuncoesModal = lazyWithRetry(() => import("./SorteioFuncoesModal").then(m => ({ default: m.SorteioFuncoesModal })));
import { SorteioScope, SorteioResult, SorteioMilitar, clearFunctionsByScope } from "../lib/sorteioFuncoes";

import {
  cleanUndefined,
  getUserObmAccess,
  normalizeObm,
  getAlaForDate,
  cn,
  normalizeAlaField,
  normalizeRg,
  getObmSettingsDocKey,
  getObmSettingsFallbackKeys,
} from '../lib/utils';

// Subcomponents extracted in features/escala24h
import { EscalaHeaderBanner } from "../features/escala24h/components/EscalaHeaderBanner";
import { EscalaOficiaisSection } from "../features/escala24h/components/EscalaOficiaisSection";
import { EscalaPermutasSection } from "../features/escala24h/components/EscalaPermutasSection";
import { EscalaRasSection } from "../features/escala24h/components/EscalaRasSection";
import { EscalaRosterTable } from "../features/escala24h/components/EscalaRosterTable";
import { EscalaAdminRolesSection } from "../features/escala24h/components/EscalaAdminRolesSection";
import { EscalaOperacionalSection } from "../features/escala24h/components/EscalaOperacionalSection";
import { EscalaViaturasSection } from "../features/escala24h/components/EscalaViaturasSection";
const EscalaPredefinicoesModal = lazyWithRetry(() => import("../features/escala24h/components/EscalaPredefinicoesModal").then(m => ({ default: m.EscalaPredefinicoesModal })));
import { EscalaTransferModals } from "../features/escala24h/components/EscalaTransferModals";
import { EscalaFeedbackToasts } from "../features/escala24h/components/EscalaFeedbackToasts";

// Logic and Hooks extracted in features/escala24h
import {
  normalizeFnName,
  getSlotDisplayName as getSlotDisplayNameCalc,
  getMostruario as getMostruarioCalc,
  getRawAllowedOptions as getRawAllowedOptionsCalc,
} from "../features/escala24h/lib/escalaCalculos";
import { calculateDynamicRequirements, calculateEstudoTecnico } from "../features/escala24h/lib/estudoTecnicoCalculo";
import { useOfficerScales } from "../features/escala24h/hooks/useOfficerScales";
import { useEscalaViaturas } from "../features/escala24h/hooks/useEscalaViaturas";
import { useRasEscala } from "../features/escala24h/hooks/useRasEscala";
import { useEscalaPersistence } from "../features/escala24h/hooks/useEscalaPersistence";

interface EscalaEspelhoModuleProps {
  obmContext: string;
  user: UserProfile;
  initialDate?: string;
}

export function EscalaEspelhoModule({ obmContext, user, initialDate }: EscalaEspelhoModuleProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (initialDate && typeof initialDate === 'string') {
      try {
        const clean = initialDate.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
          const [d, m, y] = clean.split('/');
          return `${y}-${m}-${d}`;
        }
        if (clean.includes('T')) return clean.split('T')[0];
        const d = new Date(clean);
        if (!isNaN(d.getTime())) return format(d, 'yyyy-MM-dd');
      } catch {}
    }
    return format(new Date(), "yyyy-MM-dd");
  });

  useEffect(() => {
    if (initialDate && typeof initialDate === 'string') {
      try {
        const clean = initialDate.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
          setSelectedDate(clean);
          return;
        }
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
          const [d, m, y] = clean.split('/');
          setSelectedDate(`${y}-${m}-${d}`);
          return;
        }
        if (clean.includes('T')) {
          setSelectedDate(clean.split('T')[0]);
          return;
        }
        const d = new Date(clean);
        if (!isNaN(d.getTime())) {
          setSelectedDate(format(d, 'yyyy-MM-dd'));
        }
      } catch {}
    }
  }, [initialDate]);

  const { militars, loading: militarsLoading, refreshMilitars, updateMilitarLocal } = useMilitars();
  const [permutas, setPermutas] = useState<PermutaRequest[]>([]);
  const [afastamentos, setAfastamentos] = useState<any[]>([]);
  const [isPermutaModalOpen, setIsPermutaModalOpen] = useState(false);
  const [loadingPermutas, setLoadingPermutas] = useState(false);
  const [manuallyAddedRgs, setManuallyAddedRgs] = useState<Record<string, string[]>>({});
  const [manuallyRemovedRgs, setManuallyRemovedRgs] = useState<Record<string, string[]>>({});
  const [expedienteRgs, setExpedienteRgs] = useState<string[]>([]);
  const [expediente24hRgs, setExpediente24hRgs] = useState<string[]>([]);
  const [expedienteMilitars, setExpedienteMilitars] = useState<any[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Transferência / Recebimento de Militar
  const [pendingTransferMilitar, setPendingTransferMilitar] = useState<any | null>(null);
  const [isTransferringMilitar, setIsTransferringMilitar] = useState(false);
  const [showTransferSearchModal, setShowTransferSearchModal] = useState(false);
  const [transferModalSearch, setTransferModalSearch] = useState('');
  const [transferModalSelectedMilitar, setTransferModalSelectedMilitar] = useState<any | null>(null);
  const [transferModalTargetAla, setTransferModalTargetAla] = useState('1');

  const [addMilitarSearch, setAddMilitarSearch] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [extraMilitars, setExtraMilitars] = useState<any[]>([]);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (addMilitarSearch.length >= 2) {
      const delay = setTimeout(() => {
        fetch(`/api/militar/search?q=${encodeURIComponent(addMilitarSearch)}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.militaries) {
              setGlobalSearchResults(data.militaries);
            }
          })
          .catch(err => console.error("Global search failed:", err));
      }, 400);
      return () => clearTimeout(delay);
    } else {
      setGlobalSearchResults([]);
    }
  }, [addMilitarSearch]);

  const [selectedFunctions, setSelectedFunctions] = useState<Record<string, string[]>>({});

  // Hook Viaturas
  const {
    viaturasInfo,
    setViaturasInfo,
    isViaturasCustomizedForDate,
    patternAppliedMessage,
    getObmActivePattern,
    handleApplyObmPattern,
    handleAddViaturaExtra,
  } = useEscalaViaturas({ obmContext, user, selectedDate });

  // Hook RAS
  const {
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
  } = useRasEscala({
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
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
      if (addRasMenuRef.current && !addRasMenuRef.current.contains(e.target as Node)) {
        setShowAddRasMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [addRasMenuRef]);

  // Hook Oficiais
  const {
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
  } = useOfficerScales({ obmContext, militars, selectedDate });

  // Expediente listener
  useEffect(() => {
    if (!selectedDate || !obmContext || obmContext === 'GLOBAL') {
      setExpedienteRgs([]);
      setExpedienteMilitars([]);
      setExpediente24hRgs([]);
      return;
    }
    const cleanObm = normalizeObm(obmContext || '10º GBM');
    const normalizedObm = cleanObm.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const monthKey = selectedDate.substring(0, 7);

    const docRef = doc(db, `expediente_${normalizedObm}`, monthKey);
    const globalDocRef = doc(db, 'config', `expediente_global_${normalizedObm}`);

    let globalNames: Record<string, string> = {};
    let globalSectors: Record<string, string> = {};
    const unsubGlobal = onSnapshot(globalDocRef, (gSnap) => {
      if (gSnap.exists()) {
        const gData = gSnap.data();
        globalNames = gData.userNames || {};
        globalSectors = gData.sectors || {};
      }
    });

    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const expDaysObj = data.expedienteDays || {};
        const selsObj = data.selections || {};
        const monthNames = data.userNames || {};

        const dayExpRgs: string[] = [];
        const daySelsRgs: string[] = [];
        const allExpDutyRgs = new Set<string>();

        Object.entries(expDaysObj).forEach(([rg, days]: [string, any]) => {
          if (rg === 'ESCALANTE_PREF' || !rg) return;
          if (Array.isArray(days) && days.includes(selectedDate)) {
            dayExpRgs.push(rg);
            allExpDutyRgs.add(rg);
          }
        });

        Object.entries(selsObj).forEach(([rg, days]: [string, any]) => {
          if (rg === 'ESCALANTE_PREF' || !rg) return;
          if (Array.isArray(days) && days.includes(selectedDate)) {
            daySelsRgs.push(rg);
            allExpDutyRgs.add(rg);
          }
        });

        const activeList = Array.from(allExpDutyRgs).filter(rg => {
          const cleanTargetRg = normalizeRg(rg);
          const isAfastado = (afastamentos || []).some((a: any) => {
            return normalizeRg(a.rg) === cleanTargetRg && selectedDate >= a.inicio && selectedDate <= a.retorno;
          });
          return !isAfastado;
        });

        const result = activeList.map(rg => {
          const cleanTargetRg = normalizeRg(rg);
          const mil = (militars || []).find((m: any) => normalizeRg(m.rg) === cleanTargetRg || m.uid === rg);
          const isExp = dayExpRgs.includes(rg);
          const is24h = !isExp && daySelsRgs.includes(rg);
          const name = mil?.name || globalNames[rg] || monthNames[rg] || rg;
          const warName = mil?.warName || '';
          const rank = mil?.rank || '';
          const quadro = mil?.quadro || '';
          const sector = globalSectors[rg] || ((mil as any)?.setor) || (data.sectors && data.sectors[rg]) || 'Expediente Geral';

          return {
            rg: mil?.rg || rg,
            name,
            warName,
            rank,
            quadro,
            sector,
            militar: mil || { rg: mil?.rg || rg, name, warName, rank, quadro, setor: sector },
            is24h,
            isExp
          };
        });

        result.sort(sortAllBySeniority);
        setExpedienteMilitars(result);
        setExpedienteRgs(Array.from(allExpDutyRgs));
        setExpediente24hRgs(daySelsRgs);
      } else {
        setExpedienteRgs([]);
        setExpedienteMilitars([]);
        setExpediente24hRgs([]);
      }
    });

    return () => {
      unsub();
      unsubGlobal();
    };
  }, [selectedDate, obmContext, militars, afastamentos]);

  const [showPrintView, setShowPrintView] = useState(false);
  const [officerVisibility, setOfficerVisibility] = useState<OfficerVisibility>(() => {
    try {
      const rawObm = obmContext && obmContext !== 'GLOBAL' ? obmContext : (user?.obm || '10º GBM');
      const cleanObm = normalizeObm(rawObm);
      const saved = localStorage.getItem(`escala_officer_visibility_${cleanObm}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      showSection: true,
      showOficialDia: true,
      showOficialNautica: true,
      showOficialMedico: true,
    };
  });

  const [adminRolesVisibility, setAdminRolesVisibility] = useState<Record<string, boolean>>(() => {
    try {
      const rawObm = obmContext && obmContext !== 'GLOBAL' ? obmContext : (user?.obm || '10º GBM');
      const cleanObm = normalizeObm(rawObm);
      const saved = localStorage.getItem(`escala_admin_roles_visibility_${cleanObm}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const handleToggleAdminRoleVisibility = (roleName: string) => {
    const norm = normalizeFnName(roleName);
    setAdminRolesVisibility(prev => {
      const current = prev[norm] !== false && prev[roleName] !== false;
      const next = {
        ...prev,
        [norm]: !current,
        [roleName]: !current,
      };
      try {
        const rawObm = obmContext && obmContext !== 'GLOBAL' ? obmContext : (user?.obm || '10º GBM');
        const cleanObm = normalizeObm(rawObm);
        localStorage.setItem(`escala_admin_roles_visibility_${cleanObm}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleSetAllAdminRolesVisibility = (visible: boolean) => {
    setAdminRolesVisibility(prev => {
      const next: Record<string, boolean> = { ...prev };
      dynamicRequirements.filter(f => f.category === 'admin').forEach(f => {
        next[normalizeFnName(f.name)] = visible;
        next[f.name] = visible;
      });
      ['ADJUNTO', 'ENCARREGADO DE MOTORISTA', 'RESP FAXINA', 'SGT DIA', 'CMT GUARDA', 'DIA AO DEPOSITO', 'ABASTECEDOR', 'CB DIA', 'CB GUARDA', 'COMUNICANTE', 'SENTINELA', 'AUXILIAR RANCHO', 'TOQUE DE FOGO', 'ESCALANTE'].forEach(k => {
        next[normalizeFnName(k)] = visible;
        next[k] = visible;
      });
      try {
        const rawObm = obmContext && obmContext !== 'GLOBAL' ? obmContext : (user?.obm || '10º GBM');
        const cleanObm = normalizeObm(rawObm);
        localStorage.setItem(`escala_admin_roles_visibility_${cleanObm}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleToggleOfficerVisibility = (key: 'showSection' | 'showOficialDia' | 'showOficialNautica' | 'showOficialMedico') => {
    setOfficerVisibility(prev => {
      let next: OfficerVisibility;
      if (key === 'showSection') {
        const nextVal = !prev.showSection;
        next = {
          showSection: nextVal,
          showOficialDia: nextVal,
          showOficialNautica: nextVal,
          showOficialMedico: nextVal,
        };
      } else {
        next = {
          ...prev,
          [key]: !prev[key]
        };
        next.showSection = next.showOficialDia || next.showOficialNautica || next.showOficialMedico;
      }
      try {
        const rawObm = obmContext && obmContext !== 'GLOBAL' ? obmContext : (user?.obm || '10º GBM');
        const cleanObm = normalizeObm(rawObm);
        localStorage.setItem(`escala_officer_visibility_${cleanObm}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const [correlation, setCorrelation] = useState<Record<string, Record<string, number>>>({});
  const [roleQtds, setRoleQtds] = useState<Record<string, number>>({});
  const [predefinicoes, setPredefinicoes] = useState<Record<string, string[]>>({});
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [isPreferenciasModalOpen, setIsPreferenciasModalOpen] = useState(false);
  const [sortearFeedback, setSortearFeedback] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
    undoable?: boolean;
  } | null>(null);

  const [sorteioScope, setSorteioScope] = useState<SorteioScope | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<Record<string, string[]> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [grdDayRgs, setGrdDayRgs] = useState<string[]>([]);
  const [sentinelaRgs, setSentinelaRgs] = useState<(string | null)[]>(() => [null, null, null, null]);
  const [sentinelaSlots, setSentinelaSlots] = useState<SentinelaSlot[] | null>(null);
  const [postosEscalaEnabled, setPostosEscalaEnabled] = useState<boolean>(false);
  const [postosData, setPostosData] = useState<EscalaPostoData[]>([]);
  const [availablePostosConfig, setAvailablePostosConfig] = useState<PostoConfig[]>(DEFAULT_POSTOS);
  const [postosAtivoObm, setPostosAtivoObm] = useState<boolean>(false);

  // Redefinição síncrona de estado na renderização quando a data muda
  const [prevSelectedDate, setPrevSelectedDate] = useState(selectedDate);
  if (selectedDate !== prevSelectedDate) {
    setPrevSelectedDate(selectedDate);
    setSelectedFunctions({});
    setSentinelaRgs([null, null, null, null]);
    setSentinelaSlots(null);
    setPostosData([]);
  }

  // Hook Persistência
  const { savingState } = useEscalaPersistence({
    selectedDate,
    obmContext,
    userObm: user?.obm,
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
  });

  const handlePostoSlotAssign = (postoId: string, slotId: string, rg: string | null, funcaoNome: string) => {
    const previousPosto = postosData.find(p => p.postoId === postoId);
    const previousSlot = previousPosto?.slots.find(s => s.slotId === slotId);
    const oldRg = previousSlot?.rg ? normalizeRg(previousSlot.rg) : null;
    const newRg = rg ? normalizeRg(rg) : null;

    setSelectedFunctions(prev => {
      const next = { ...prev };

      // Se havia militar anterior e é diferente do novo, remove a funcaoNome dele
      if (oldRg && oldRg !== newRg && next[oldRg]) {
        const filtered = next[oldRg].filter(f => normalizeFnName(f) !== normalizeFnName(funcaoNome));
        if (filtered.length === 0) {
          delete next[oldRg];
        } else {
          next[oldRg] = filtered;
        }
      }

      // Se há novo militar, adiciona a funcaoNome
      if (newRg) {
        const current = next[newRg] || [];
        if (!current.some(f => normalizeFnName(f) === normalizeFnName(funcaoNome))) {
          next[newRg] = [...current, funcaoNome];
        }
      }

      return next;
    });
  };

  const handleSentinelaChange = (newSentinelaRgs: (string | null)[], newSlots?: SentinelaSlot[]) => {
    setSentinelaRgs(newSentinelaRgs);
    setSentinelaSlots(newSlots !== undefined ? (newSlots && newSlots.length > 0 ? newSlots : null) : null);

    setSelectedFunctions(prev => {
      const next = { ...prev };
      const currentAssigned = new Set(newSentinelaRgs.filter(Boolean) as string[]);
      const previousAssigned = new Set((sentinelaRgs || []).filter(Boolean) as string[]);

      previousAssigned.forEach(rg => {
        if (!currentAssigned.has(rg) && next[rg]) {
          const filtered = next[rg].filter(f => normalizeFnName(f) !== 'SENTINELA');
          if (filtered.length === 0) {
            delete next[rg];
          } else {
            next[rg] = filtered;
          }
        }
      });

      Object.keys(next).forEach(rg => {
        if (!currentAssigned.has(rg) && next[rg]?.some(f => normalizeFnName(f) === 'SENTINELA')) {
          const filtered = next[rg].filter(f => normalizeFnName(f) !== 'SENTINELA');
          if (filtered.length === 0) {
            delete next[rg];
          } else {
            next[rg] = filtered;
          }
        }
      });

      currentAssigned.forEach(rg => {
        const existing = next[rg] || [];
        if (!existing.some(f => normalizeFnName(f) === 'SENTINELA')) {
          next[rg] = [...existing, 'SENTINELA'];
        }
      });

      return next;
    });
  };

  // Load obm_settings
  useEffect(() => {
    if (!obmContext || obmContext === 'GLOBAL') return;
    const canonicalKey = getObmSettingsDocKey(obmContext);
    const docRef = doc(db, "obm_settings", canonicalKey);

    const unsub = onSnapshot(docRef, async (snap) => {
      let data = snap.exists() ? snap.data() : null;

      if (!data?.escala_regras || !data?.escala_preferencias || !data?.categorias_funcoes) {
        const fallbacks = getObmSettingsFallbackKeys(obmContext).filter(k => k !== canonicalKey);
        for (const fk of fallbacks) {
          try {
            const fallbackSnap = await getDoc(doc(db, "obm_settings", fk));
            if (fallbackSnap.exists()) {
              const fbData = fallbackSnap.data();
              if (fbData) {
                data = { ...fbData, ...data };
                setDoc(docRef, cleanUndefined({
                  escala_regras: data?.escala_regras || fbData.escala_regras,
                  escala_preferencias: data?.escala_preferencias || fbData.escala_preferencias,
                  categorias_funcoes: data?.categorias_funcoes || fbData.categorias_funcoes,
                  viaturas_config: data?.viaturas_config || fbData.viaturas_config
                }), { merge: true }).catch(() => {});
                break;
              }
            }
          } catch (e) {}
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

        if (data.escala_regras) {
          setCorrelation(data.escala_regras.correlation || {});
          setRoleQtds(data.escala_regras.qtds || {});
        } else {
          setCorrelation({});
          setRoleQtds({});
        }
        if (data.escala_preferencias) {
          setPredefinicoes(data.escala_preferencias || {});
        } else {
          setPredefinicoes({});
        }

        if (data.postos_config && Array.isArray(data.postos_config)) {
          setAvailablePostosConfig(data.postos_config);
        } else if (data.postos_custom_default && Array.isArray(data.postos_custom_default)) {
          setAvailablePostosConfig(data.postos_custom_default);
        } else {
          setAvailablePostosConfig(DEFAULT_POSTOS);
        }

        if (data.postos_ativo_obm !== undefined) {
          setPostosAtivoObm(Boolean(data.postos_ativo_obm));
        } else {
          const cleanObm = normalizeObm(obmContext || '');
          const isDecimo = cleanObm === '10º GBM' || cleanObm.includes('10');
          setPostosAtivoObm(!isDecimo && Boolean(data.postos_config?.length));
        }
      } else {
        setCategories(DEFAULT_CATEGORIES);
        setCorrelation({});
        setRoleQtds({});
        setPredefinicoes({});
        setAvailablePostosConfig(DEFAULT_POSTOS);
        setPostosAtivoObm(false);
      }
    }, (e) => {
      console.warn("Could not listen to obm_settings in EscalaEspelhoModule:", e);
    });

    return () => unsub();
  }, [obmContext]);

  const targetDateObj = useMemo(() => {
    if (!selectedDate || typeof selectedDate !== 'string') return new Date();
    try {
      let dateToParse = selectedDate.trim();
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateToParse)) {
        const [d, m, y] = dateToParse.split('/');
        dateToParse = `${y}-${m}-${d}`;
      } else if (dateToParse.includes('T')) {
        dateToParse = dateToParse.split('T')[0];
      }
      const parsed = parseISO(dateToParse);
      if (!parsed || isNaN(parsed.getTime())) {
        const fallback = new Date(selectedDate);
        return isNaN(fallback.getTime()) ? new Date() : fallback;
      }
      return parsed;
    } catch {
      return new Date();
    }
  }, [selectedDate]);

  const identifiedAla = getAlaForDate(targetDateObj);
  const identifiedAlaStr = identifiedAla.toString();

  const [isDashboardExpanded, setIsDashboardExpanded] = useState(false);
  const [dashboardMonth, setDashboardMonth] = useState<Date>(() => startOfMonth(targetDateObj));

  useEffect(() => {
    if (targetDateObj && !isNaN(targetDateObj.getTime())) {
      const mStart = startOfMonth(targetDateObj);
      if (mStart.getTime() !== dashboardMonth.getTime()) {
        setDashboardMonth(mStart);
      }
    }
  }, [selectedDate]);

  const monthRange = useMemo(() => {
    const validMonth = dashboardMonth && !isNaN(dashboardMonth.getTime()) ? dashboardMonth : new Date();
    const start = format(startOfMonth(validMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(validMonth), 'yyyy-MM-dd');
    return { start, end };
  }, [dashboardMonth]);

  // DGP Vacations listener
  const [dgpVacations, setDgpVacations] = useState<any[]>([]);
  useEffect(() => {
    const qVac = query(collection(db, "vacations"));
    const unsub = onSnapshot(qVac, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setDgpVacations(list);
    }, (err) => console.warn("Erro ao ouvir vacations:", err.message));
    return () => unsub();
  }, []);

  // Permutas do mês inteiro e Afastamentos da Ala
  useEffect(() => {
    setLoadingPermutas(true);
    const qMonth = query(
      collection(db, "permutas"),
      where("date", ">=", monthRange.start),
      where("date", "<=", monthRange.end)
    );

    const unsubPermutas = onSnapshot(qMonth, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as PermutaRequest[];
      const filtered = data.filter(
        (p) => (!p.obm || getUserObmAccess(normalizeObm(obmContext), normalizeObm(obmContext) === 'GLOBAL').includes(normalizeObm(p.obm))) && p.status !== "cancelled"
      );
      setPermutas(filtered);
      setLoadingPermutas(false);
    }, (err) => {
      console.warn("Erro ao carregar permutas do mês:", err.message);
      setLoadingPermutas(false);
    });

    const qAfast = query(
      collection(db, "afastamentos_alas"),
      where("obm", "==", normalizeObm(obmContext))
    );

    const unsubAfast = onSnapshot(qAfast, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setAfastamentos(data);
    });

    return () => {
      unsubPermutas();
      unsubAfast();
    };
  }, [monthRange.start, monthRange.end, obmContext]);

  const upcomingDays = useMemo(() => {
    try {
      const today = startOfToday();
      const list = [];
      for (let i = 0; i <= 7; i++) {
        const d = addDays(today, i);
        const iso = format(d, 'yyyy-MM-dd');
        const alaNum = getAlaForDate(d);
        let label = '';
        if (i === 0) label = 'Hoje';
        else if (i === 1) label = 'Amanhã';
        else label = format(d, 'EEEE', { locale: ptBR }).split('-')[0].toUpperCase();

        list.push({
          date: d,
          iso,
          label,
          dayNumber: format(d, 'dd/MM'),
          alaNum,
          isSelected: iso === selectedDate,
        });
      }
      return list;
    } catch {
      return [];
    }
  }, [selectedDate]);

  const baseRoster = useMemo(() => {
    const manualRgs = manuallyAddedRgs[selectedDate] || [];
    const removedRgs = manuallyRemovedRgs[selectedDate] || [];
    const rasRgs = visibleRasApplications.map((a: any) => a.militarRg);

    const rasPoolMilitars = visibleRasApplications.map((app: any) => ({
      id: app.militarId || app.militarRg,
      rg: app.militarRg,
      name: app.militarName,
      warName: app.militarWarName || '',
      rank: app.militarRank,
      quadro: app.militarQuadro || '',
      obm: obmContext
    } as any));

    const allMilitarsPool = [...militars, ...extraMilitars, ...rasPoolMilitars];
    const uniquePool = Array.from(new Map(allMilitarsPool.map(m => [m.rg, m])).values());
    
    return uniquePool
      .filter((m) => {
        const rawObm = normalizeObm(m.obm || "10º GBM");
        const ctx = normalizeObm(obmContext || "10º GBM");
        const isInCtx = ctx === "GLOBAL" || rawObm === ctx;
        
        const isExcluded = ['INATIVO', 'EXCLUÍDO', 'EXCLUIDO', 'DESLIGADO'].some(status => (m.situacao || '').trim().toUpperCase().includes(status));

        if (removedRgs.some(r => normalizeRg(r) === normalizeRg(m.rg))) return false;

        const isAla = isInCtx && normalizeAlaField(m.ala) === identifiedAlaStr;
        const isManual = manualRgs.some(r => normalizeRg(r) === normalizeRg(m.rg));
        const isExpediente24h = isInCtx && expediente24hRgs.some(r => normalizeRg(r) === normalizeRg(m.rg));
        const isRas = rasRgs.some(r => normalizeRg(r) === normalizeRg(m.rg));
        
        if (isExcluded && !isManual && !isRas) return false;
        if (!isAla && !isManual && !isExpediente24h && !isRas) return false;
        
        const hasAfastamento = afastamentos.some((a) => {
          if (normalizeRg(a.rg) === normalizeRg(m.rg)) {
             return selectedDate >= a.inicio && selectedDate <= a.retorno;
          }
          return false;
        });

        const hasDgpVacation = dgpVacations.some((v) => {
          if (normalizeRg(v.militarRg) === normalizeRg(m.rg)) {
            const isoInicio = parseDateToIso(v.dataInicio);
            const isoRetorno = parseDateToIso(v.dataRetorno);
            if (isoInicio && isoRetorno) {
              return selectedDate >= isoInicio && selectedDate <= isoRetorno && v.status !== 'cancelado';
            }
          }
          return false;
        });

        return !hasAfastamento && !hasDgpVacation;
      })
      .sort((a, b) => {
        const isManualA = manualRgs.includes(a.rg || '') || rasRgs.includes(a.rg || '');
        const isManualB = manualRgs.includes(b.rg || '') || rasRgs.includes(b.rg || '');
        
        if (isManualA && !isManualB) return 1;
        if (!isManualA && isManualB) return -1;

        const rgA = parseInt((a.rg || "").replace(/\D/g, "") || "0");
        const rgB = parseInt((b.rg || "").replace(/\D/g, "") || "0");
        return rgA - rgB;
      });
  }, [militars, extraMilitars, identifiedAlaStr, afastamentos, dgpVacations, selectedDate, manuallyAddedRgs, manuallyRemovedRgs, expedienteRgs, expediente24hRgs, visibleRasApplications, obmContext]);

  const permutasDoDia = useMemo(() => {
    return permutas.filter((p) => p.date === selectedDate);
  }, [permutas, selectedDate]);

  const permutasOut = useMemo(() => {
    const map = new Map<string, PermutaRequest>();
    permutasDoDia.forEach((p) => {
      if (p.requesterRg && p.status === PermutaStatus.ACCEPTED) {
        map.set(p.requesterRg, p);
      }
    });
    return map;
  }, [permutasDoDia]);

  const availableControlFunctions = useMemo(() => getAvailableControlFunctions(categories), [categories]);

  const getSlotDisplayName = (v: any, slot: string) => getSlotDisplayNameCalc(v, slot, availableControlFunctions);
  const getMostruario = (militar: any) => getMostruarioCalc(militar, availableControlFunctions);
  const getRawAllowedOptions = (militar: any) => getRawAllowedOptionsCalc(militar, categories, availableControlFunctions, viaturasInfo);

  const dynamicRequirements = useMemo(() => {
    return calculateDynamicRequirements(viaturasInfo, roleQtds, adminRolesVisibility, availableControlFunctions);
  }, [viaturasInfo, roleQtds, adminRolesVisibility, availableControlFunctions]);

  const getAllowedOptions = (militar: any): string[] | undefined => {
    if (!militar) return undefined;
    const rawAllowed = getRawAllowedOptions(militar);
    const rawSet = new Set(rawAllowed.map(r => normalizeFnName(r)));
    const activeReqs = dynamicRequirements.filter(r => r.active !== false && r.req > 0);

    const activeAllowed = new Set<string>();
    activeReqs.forEach(req => {
      const reqNameNorm = normalizeFnName(req.name);
      const reqGenNorm = normalizeFnName(req.genericName);
      if (rawSet.has(reqNameNorm) || rawSet.has(reqGenNorm)) {
        activeAllowed.add(req.name);
      } else if (
        (reqNameNorm === 'AUXILIAR ASE' || reqGenNorm === 'AUXILIAR ASE') &&
        rawSet.has('ENFERMEIRO')
      ) {
        activeAllowed.add(req.name);
      } else if (
        (reqNameNorm === 'ENFERMEIRO' || reqGenNorm === 'ENFERMEIRO') &&
        rawSet.has('AUXILIAR ASE')
      ) {
        activeAllowed.add(req.name);
      }
    });

    return Array.from(activeAllowed);
  };

  const activeScaleFuncOptions = useMemo(() => {
    const list = dynamicRequirements
      .filter(r => r.active !== false && r.req > 0)
      .map(r => r.name);

    if (postosEscalaEnabled) {
      postosData.forEach(p => {
        if (p.ativa) {
          p.slots.forEach(s => {
            if (s.funcaoNome && !list.includes(s.funcaoNome)) {
              list.push(s.funcaoNome);
            }
          });
        }
      });
    }

    return list;
  }, [dynamicRequirements, postosEscalaEnabled, postosData]);

  const functionUsageStats = useMemo(() => {
    const counts: Record<string, number> = {};
    const rosterRgs = new Set(baseRoster.map(m => m.rg || ''));
    Object.entries(selectedFunctions).forEach(([rg, fns]) => {
      if (!rosterRgs.has(rg)) return;
      (fns || []).forEach(fn => {
        const norm = normalizeFnName(fn);
        if (!norm) return;
        counts[norm] = (counts[norm] || 0) + 1;
      });
    });

    const limits: Record<string, number> = {};
    dynamicRequirements.forEach(req => {
      const normName = normalizeFnName(req.name);
      const normGen = normalizeFnName(req.genericName);
      const limit = req.active !== false ? req.req : 0;
      limits[normName] = limit;
      if (normGen && limits[normGen] === undefined) {
        limits[normGen] = limit;
      }
    });

    const overLimitSet = new Set<string>();
    Object.entries(counts).forEach(([normFn, count]) => {
      const limit = limits[normFn] ?? 1;
      if (count > limit) {
        overLimitSet.add(normFn);
      }
    });

    return {
      counts,
      limits,
      overLimitSet,
      isOverLimit: (fnName: string) => overLimitSet.has(normalizeFnName(fnName)),
      getCount: (fnName: string) => counts[normalizeFnName(fnName)] || 0,
      getLimit: (fnName: string) => limits[normalizeFnName(fnName)] ?? 1,
    };
  }, [baseRoster, selectedFunctions, dynamicRequirements]);

  const estudoTecnico = useMemo(() => {
    return calculateEstudoTecnico(
      baseRoster,
      permutasOut,
      militars,
      dynamicRequirements,
      correlation,
      getAllowedOptions
    );
  }, [baseRoster, permutasOut, militars, dynamicRequirements, correlation]);

  const handleToggleOperationalRole = (roleName: string) => {
    const norm = normalizeFnName(roleName);
    isViaturasCustomizedForDate.current = true;
    setViaturasInfo(prev => {
      let currentlyActiveCount = 0;
      prev.forEach(v => {
        if (!v.ativa) return;
        (['condutor', 'g1', 'g2', 'g3', 'g4', 'cg'] as const).forEach(slot => {
          if (v.blocked?.includes(slot)) return;
          if (v[slot] === true && normalizeFnName(getSlotDisplayName(v, slot)) === norm) {
            currentlyActiveCount++;
          }
        });
      });

      if (currentlyActiveCount > 0) {
        return prev.map(v => {
          if (!v.ativa) return v;
          const nextV = { ...v };
          (['condutor', 'g1', 'g2', 'g3', 'g4', 'cg'] as const).forEach(slot => {
            if (v.blocked?.includes(slot)) return;
            if (normalizeFnName(getSlotDisplayName(v, slot)) === norm) {
              nextV[slot] = false;
            }
          });
          return nextV;
        });
      } else {
        let matchedOnActiveVtr = false;
        prev.forEach(v => {
          if (!v.ativa) return;
          (['condutor', 'g1', 'g2', 'g3', 'g4', 'cg'] as const).forEach(slot => {
            if (!v.blocked?.includes(slot) && normalizeFnName(getSlotDisplayName(v, slot)) === norm) {
              matchedOnActiveVtr = true;
            }
          });
        });

        if (matchedOnActiveVtr) {
          return prev.map(v => {
            if (!v.ativa) return v;
            const nextV = { ...v };
            (['condutor', 'g1', 'g2', 'g3', 'g4', 'cg'] as const).forEach(slot => {
              if (!v.blocked?.includes(slot) && normalizeFnName(getSlotDisplayName(v, slot)) === norm) {
                nextV[slot] = true;
              }
            });
            return nextV;
          });
        }

        return prev.map(v => {
          let hasMatch = false;
          const nextV = { ...v };
          (['condutor', 'g1', 'g2', 'g3', 'g4', 'cg'] as const).forEach(slot => {
            if (!v.blocked?.includes(slot) && normalizeFnName(getSlotDisplayName(v, slot)) === norm) {
              hasMatch = true;
              nextV[slot] = true;
            }
          });
          if (hasMatch) {
            nextV.ativa = true;
          }
          return nextV;
        });
      }
    });
  };

  const handleSetAllOperationalRoles = (active: boolean) => {
    isViaturasCustomizedForDate.current = true;
    setViaturasInfo(prev =>
      prev.map(v => {
        if (!v.ativa) return v;
        const nextV = { ...v };
        (['condutor', 'g1', 'g2', 'g3', 'g4', 'cg'] as const).forEach(slot => {
          if (!v.blocked?.includes(slot)) {
            nextV[slot] = active;
          }
        });
        return nextV;
      })
    );
  };

  const showSorteioFeedback = (fb: { type: 'success' | 'warning' | 'info'; message: string; undoable?: boolean }, ms = 6000) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setSortearFeedback(fb);
    feedbackTimerRef.current = setTimeout(() => setSortearFeedback(null), ms);
  };

  const sorteioRoster = useMemo<SorteioMilitar[]>(() => {
    if (!sorteioScope) return [];
    return baseRoster.map(m => {
      const isSwapped = permutasOut.has(m.rg || '');
      const actualMilitar = isSwapped ? (militars.find(x => x.rg === permutasOut.get(m.rg || '')?.substituteRg) || m) : m;
      return { rg: m.rg || '', militar: actualMilitar, allowed: getAllowedOptions(actualMilitar) || [] };
    });
  }, [sorteioScope, baseRoster, permutasOut, militars, categories, viaturasInfo, availableControlFunctions, dynamicRequirements]);

  const handleApplySorteio = (newSelected: Record<string, string[]>, result: SorteioResult, presetLabel: string) => {
    const scopeLabel = sorteioScope === 'administrativas' ? 'administrativa(s)' : 'de viatura';
    setUndoSnapshot(selectedFunctions);
    setSelectedFunctions(newSelected);
    setSorteioScope(null);
    const semEfetivo = result.vagasSemEfetivo.map(v => v.count > 1 ? `${v.fn} ×${v.count}` : v.fn);
    if (semEfetivo.length > 0) {
      showSorteioFeedback({
        type: 'warning',
        message: `${result.novas.length} função(ões) ${scopeLabel} aplicada(s) [${presetLabel}]. Faltou efetivo habilitado para: ${semEfetivo.join(', ')}.`,
        undoable: true,
      }, 9000);
    } else {
      showSorteioFeedback({
        type: 'success',
        message: `${result.novas.length} função(ões) ${scopeLabel} aplicada(s) com sucesso [${presetLabel}].`,
        undoable: true,
      }, 8000);
    }
  };

  const handleLimparFuncoes = (scope: SorteioScope | 'tudo') => {
    const next = clearFunctionsByScope(selectedFunctions, dynamicRequirements, scope);
    const countFns = (rec: Record<string, string[]>) => Object.values(rec).reduce((s, f) => s + (f?.length || 0), 0);
    const removed = countFns(selectedFunctions) - countFns(next);
    const label = scope === 'viaturas' ? 'de viatura' : scope === 'administrativas' ? 'administrativas' : '';
    if (removed <= 0) {
      showSorteioFeedback({ type: 'info', message: `Não há funções ${label} para limpar.`.replace('  ', ' ') }, 3500);
      return;
    }
    setUndoSnapshot(selectedFunctions);
    setSelectedFunctions(next);
    showSorteioFeedback({
      type: 'info',
      message: scope === 'tudo'
        ? `${removed} função(ões) removida(s). As sentinelas foram preservadas.`
        : `${removed} função(ões) ${label} removida(s).`,
      undoable: true,
    }, 8000);
  };

  const handleUndoFuncoes = () => {
    if (!undoSnapshot) return;
    setSelectedFunctions(undoSnapshot);
    setUndoSnapshot(null);
    showSorteioFeedback({ type: 'success', message: 'Alteração desfeita. As funções anteriores foram restauradas.' }, 3500);
  };

  const handleStatusChange = async (permuta: PermutaRequest, newStatus: PermutaStatus) => {
    if (!permuta.id) return;
    try {
      await updateDoc(doc(db, "permutas", permuta.id), cleanUndefined({
        status: newStatus,
        acceptedById: user?.warName || user?.name || user?.rg || "Escalante",
        acceptedByName: user?.name || user?.warName || "Escalante",
        updatedAt: serverTimestamp()
      }));
    } catch (error) {
      console.error("Update Status Error:", error);
    }
  };

  const handlePermutaUpdateFunctions = async (permutaId: string, newFuncs: string[]) => {
    try {
      await updateDoc(doc(db, "permutas", permutaId), {
        substituteFunctions: newFuncs,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Update Permuta Functions Error:", err);
    }
  };

  const handleRemoveMilitaryFromScale = (militar: any, rg: string) => {
    const rasApp = visibleRasApplications.find(a => a.militarRg === rg);
    if (rasApp) {
      handleRemoveRasMilitar(rasApp);
    } else {
      setManuallyAddedRgs(prev => {
        const curr = prev[selectedDate] || [];
        return {
          ...prev,
          [selectedDate]: curr.filter(r => r !== rg)
        };
      });
      setManuallyRemovedRgs(prev => {
        const curr = prev[selectedDate] || [];
        if (!curr.includes(rg)) {
          return {
            ...prev,
            [selectedDate]: [...curr, rg]
          };
        }
        return prev;
      });
      setSelectedFunctions(prev => {
        const next = { ...prev };
        delete next[rg];
        return next;
      });
      setActionNotice(`${militar.rank ? militar.rank + ' ' : ''}${militar.warName || militar.name || rg} removido da escala.`);
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  const handleGerarEscala = async () => {
    setShowPrintView(true);

    const today = format(new Date(), "yyyy-MM-dd");
    if (selectedDate === today) {
      try {
        const ativasData: Record<string, { rg: string, role: string }[]> = {};
        const activeVtrs = viaturasInfo.filter(v => v.ativa);
        
        activeVtrs.forEach(v => {
          const vtrName = (v.vtr || "").toUpperCase();
          if (!vtrName) return;
          const rgsForVtr: { rg: string, role: string }[] = [];
          
          ['condutor', 'g1', 'g2', 'g3', 'g4', 'cg'].forEach(slot => {
            if (v[slot as keyof typeof v] === true) {
              const roleName = getSlotDisplayName(v, slot);
              Object.entries(selectedFunctions).forEach(([rg, roles]) => {
                if (roles.includes(roleName) && !rgsForVtr.find(r => r.rg === rg)) {
                  rgsForVtr.push({ rg, role: roleName });
                }
              });
            }
          });
          
          ativasData[vtrName] = rgsForVtr;
        });

        await setDoc(doc(db, 'guarnicoes', 'ativas'), cleanUndefined(ativasData), { merge: false });
      } catch (e) {
        console.error("Erro ao sincronizar com Painel do Comunicante:", e);
      }
    }
  };

  const addMenuOptions = useMemo(() => {
    if (addMilitarSearch.length < 2) return [];
    const s = addMilitarSearch.toLowerCase();
    
    const combinedPool = [...militars, ...globalSearchResults];
    const uniquePool = Array.from(new Map(combinedPool.map(m => [m.rg, m])).values());

    return uniquePool
      .filter(m => {
        return (m.name || '').toLowerCase().includes(s) || 
               (m.warName || '').toLowerCase().includes(s) || 
               (m.rg || '').toString().includes(addMilitarSearch);
      })
      .filter(m => !baseRoster.some(br => br.rg === m.rg))
      .slice(0, 15);
  }, [addMilitarSearch, militars, globalSearchResults, baseRoster]);

  const handleCandidateSelect = (m: any) => {
    const mObm = normalizeObm(m.obm || '10º GBM');
    const currentObm = normalizeObm(obmContext || '10º GBM');
    const isOtherUnit = mObm !== currentObm && currentObm !== 'GLOBAL';

    if (isOtherUnit) {
      setPendingTransferMilitar(m);
      setShowAddMenu(false);
    } else {
      if (!militars.some(local => local.rg === m.rg) && !extraMilitars.some(extra => extra.rg === m.rg)) {
        setExtraMilitars(prev => [...prev, m]);
      }
      setManuallyAddedRgs(prev => {
        const curr = prev[selectedDate] || [];
        return {
          ...prev,
          [selectedDate]: [...curr, m.rg || '']
        };
      });
      setAddMilitarSearch('');
      setShowAddMenu(false);
      setActionNotice(`${parseRank(m.rank)} ${m.warName || m.name} adicionado à escala.`);
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  const executeMilitarTransfer = async (m: any, targetObm: string, permanentTransfer: boolean, targetAlaOption?: string) => {
    if (!m) return;
    setIsTransferringMilitar(true);
    try {
      const assignedAla = targetAlaOption || identifiedAlaStr || '1';

      if (permanentTransfer) {
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
        const res = await fetch('/api/militar/transfer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            rg: m.rg,
            targetObm,
            targetAla: assignedAla,
            originObm: m.obm || '10º GBM',
            reason: `Transferência confirmada no Espelho da Escala de ${targetObm}`
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Falha ao registrar transferência no servidor');
        }

        updateMilitarLocal(m.rg, {
          obm: targetObm,
          ala: assignedAla,
          situacao: 'Ativo'
        });
        refreshMilitars();
      }

      const militarWithTargetObm = {
        ...m,
        obm: targetObm,
        ala: assignedAla
      };

      setExtraMilitars(prev => [...prev.filter(x => x.rg !== m.rg), militarWithTargetObm]);
      setManuallyAddedRgs(prev => {
        const curr = prev[selectedDate] || [];
        return {
          ...prev,
          [selectedDate]: [...curr.filter(r => r !== m.rg), m.rg || '']
        };
      });

      setActionNotice(
        permanentTransfer
          ? `Militar ${parseRank(m.rank)} ${m.warName || m.name} transferido definitivamente para o ${targetObm} (Ala ${assignedAla}) e escalado com sucesso!`
          : `Militar ${parseRank(m.rank)} ${m.warName || m.name} adicionado à escala de ${selectedDate} como reforço.`
      );
      setTimeout(() => setActionNotice(null), 4500);

      setPendingTransferMilitar(null);
      setShowTransferSearchModal(false);
      setTransferModalSelectedMilitar(null);
      setTransferModalSearch('');
      setAddMilitarSearch('');
    } catch (err: any) {
      alert("Erro ao realizar transferência: " + (err.message || 'Erro de conexão'));
    } finally {
      setIsTransferringMilitar(false);
    }
  };

  const handleRegisterEscala = async (signatureData: any) => {
    try {
      const docId = `${(obmContext || '10º GBM').replace(/\//g, '_').replace(/\s/g, '_')}_${selectedDate}`;
      
      const payload = {
        obm: obmContext || '10º GBM',
        date: selectedDate,
        registeredAt: new Date().toISOString(),
        registeredBy: {
          rg: user?.rg || '',
          name: user?.name || '',
          rank: user?.rank || ''
        },
        signatureData,
        selectedFunctions,
        viaturasInfo,
        officerVisibility,
        adminRolesVisibility,
        oficialDia: (officerVisibility.showSection !== false && officerVisibility.showOficialDia !== false) ? oficialDiaValue : '',
        oficialNautica: (officerVisibility.showSection !== false && officerVisibility.showOficialNautica !== false) ? nauticoOficialValue : '',
        oficialMedico: (officerVisibility.showSection !== false && officerVisibility.showOficialMedico !== false) ? medicoOficialValue : '',
        expedienteMilitars: (expedienteMilitars || []).map(m => ({
          rg: m.rg,
          name: m.name,
          warName: m.warName,
          rank: m.rank,
          quadro: m.quadro,
          is24h: m.is24h
        })),
        grdRgs: grdDayRgs,
        sentinelaRgs,
        sentinelaSlots: sentinelaSlots || null,
        postosEscalaEnabled: Boolean(postosEscalaEnabled),
        postosData: postosData || null
      };

      await setDoc(doc(db, "registro_escalas_24h", docId), cleanUndefined(payload));
      alert("Escala registrada e assinada com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao registrar escala: " + (err as Error).message);
    }
  };

  const alaThemeStyle = useMemo(() => {
    switch (identifiedAlaStr) {
      case '1':
        return {
          borderColor: 'rgba(16, 185, 129, 0.7)',
          borderColorDark: 'rgba(52, 211, 153, 0.8)',
          borderColorStrong: '#10b981',
          borderGlow: 'rgba(16, 185, 129, 0.14)',
        };
      case '2':
        return {
          borderColor: 'rgba(244, 63, 94, 0.7)',
          borderColorDark: 'rgba(251, 113, 133, 0.8)',
          borderColorStrong: '#f43f5e',
          borderGlow: 'rgba(244, 63, 94, 0.14)',
        };
      case '3':
        return {
          borderColor: 'rgba(14, 165, 233, 0.7)',
          borderColorDark: 'rgba(56, 189, 248, 0.8)',
          borderColorStrong: '#0ea5e9',
          borderGlow: 'rgba(14, 165, 233, 0.14)',
        };
      case '4':
        return {
          borderColor: 'rgba(217, 119, 6, 0.75)',
          borderColorDark: 'rgba(251, 191, 36, 0.85)',
          borderColorStrong: '#f59e0b',
          borderGlow: 'rgba(245, 158, 11, 0.18)',
        };
      case 'EXP':
        return {
          borderColor: 'rgba(99, 102, 241, 0.7)',
          borderColorDark: 'rgba(129, 140, 248, 0.8)',
          borderColorStrong: '#6366f1',
          borderGlow: 'rgba(99, 102, 241, 0.14)',
        };
      default:
        return {
          borderColor: 'rgba(16, 185, 129, 0.7)',
          borderColorDark: 'rgba(52, 211, 153, 0.8)',
          borderColorStrong: '#10b981',
          borderGlow: 'rgba(16, 185, 129, 0.14)',
        };
    }
  }, [identifiedAlaStr]);

  return (
    <div
      className={cn("flex flex-col bg-slate-50 relative escala-module-container", `escala-ala-${identifiedAlaStr}`)}
      data-ala={identifiedAlaStr}
      style={{
        '--ala-border-color': alaThemeStyle.borderColor,
        '--ala-border-color-dark': alaThemeStyle.borderColorDark,
        '--ala-border-color-strong': alaThemeStyle.borderColorStrong,
        '--ala-border-glow': alaThemeStyle.borderGlow,
      } as React.CSSProperties}
    >
      {/* Top Control Bar Compacta */}
      <EscalaHeaderBanner
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        identifiedAla={identifiedAla}
        baseRosterCount={baseRoster.length}
        permutasCount={permutas.length}
        savingState={savingState}
        onOpenPermutaModal={() => setIsPermutaModalOpen(true)}
        onOpenSorteio={setSorteioScope}
        onOpenPredefinicoes={() => setIsPreferenciasModalOpen(true)}
        onLimparFuncoes={handleLimparFuncoes}
        onGerarEscala={handleGerarEscala}
        isDashboardExpanded={isDashboardExpanded}
        setIsDashboardExpanded={setIsDashboardExpanded}
        dashboardMonth={dashboardMonth}
        setDashboardMonth={setDashboardMonth}
        upcomingDays={upcomingDays}
      >
        <EscalanteDashboardCalendar
          selectedDate={selectedDate}
          onSelectDate={(newDate) => setSelectedDate(newDate)}
          obmContext={obmContext}
          militars={militars}
          afastamentos={afastamentos}
          permutas={permutas}
          baseRoster={baseRoster}
          expedienteMilitars={expedienteMilitars}
          dynamicRequirements={dynamicRequirements}
          selectedFunctions={selectedFunctions}
          oficialDiaValue={oficialDiaValue}
          nauticoOficialValue={nauticoOficialValue}
          medicoOficialValue={medicoOficialValue}
          estudoTecnico={estudoTecnico}
          isExpanded={isDashboardExpanded}
          onToggleExpanded={() => setIsDashboardExpanded((prev) => !prev)}
          currentMonth={dashboardMonth}
          onMonthChange={setDashboardMonth}
          hideHeader
        />
      </EscalaHeaderBanner>

      <div className="p-3 sm:p-4 space-y-3 escala-sections-container">
        {/* SEÇÃO CONEXÃO DE ESCALAS DE OFICIAIS */}
        <EscalaOficiaisSection
          obmContext={obmContext}
          loadingOfficerScale={loadingOfficerScale}
          loadingNauticoScale={loadingNauticoScale}
          loadingMedicoScale={loadingMedicoScale}
          isOfficerSectionExpanded={isOfficerSectionExpanded}
          setIsOfficerSectionExpanded={setIsOfficerSectionExpanded}
          officerVisibility={officerVisibility}
          onToggleOfficerVisibility={handleToggleOfficerVisibility}
          oficialDiaValue={oficialDiaValue}
          sobreavisoValue={sobreavisoValue}
          matchedOficialDia={matchedOficialDia}
          availableOfficers={availableOfficers}
          onSaveOficialDia={handleSaveOficialDia}
          savingOficialDia={savingOficialDia}
          nauticoOficialValue={nauticoOficialValue}
          nauticoSobreavisoValue={nauticoSobreavisoValue}
          matchedNauticoOficial={matchedNauticoOficial}
          availableNauticoOfficers={availableNauticoOfficers}
          onSaveNauticoOficial={handleSaveNauticoOficial}
          savingNautico={savingNautico}
          medicoOficialValue={medicoOficialValue}
          medicoSobreavisoValue={medicoSobreavisoValue}
          matchedMedicoOficial={matchedMedicoOficial}
          availableMedicalOfficers={availableMedicalOfficers}
          onSaveMedicoOficial={handleSaveMedicoOficial}
          savingMedico={savingMedico}
        />

        {/* SECTION 1: Permutas Deferidas */}
        <EscalaPermutasSection
          permutas={permutasDoDia}
          militars={militars}
          loadingPermutas={loadingPermutas}
          onOpenNewPermutaModal={() => setIsPermutaModalOpen(true)}
          onStatusChange={handleStatusChange}
          onUpdateFunctions={handlePermutaUpdateFunctions}
          getAllowedOptions={getRawAllowedOptions}
        />

        {/* SECTION 1.5: RAS_MODULE */}
        <EscalaRasSection
          rasDuration={rasDuration}
          setRasDuration={setRasDuration}
          addRasMilitarSearch={addRasMilitarSearch}
          setAddRasMilitarSearch={setAddRasMilitarSearch}
          showAddRasMenu={showAddRasMenu}
          setShowAddRasMenu={setShowAddRasMenu}
          addRasMenuOptions={addRasMenuOptions}
          onAddMilitarToRas={handleAddMilitarToRas}
          onFetchRas={handleFetchRas}
          onAddAllRas={handleAddAllRas}
          visibleRasApplications={visibleRasApplications}
          baseRoster={baseRoster}
          onAddSingleRas={handleAddSingleRas}
          onRemoveRasMilitar={handleRemoveRasMilitar}
        />

        {/* SECTION 2: Escala Espelho Base */}
        <EscalaRosterTable
          obmContext={obmContext}
          identifiedAlaStr={identifiedAlaStr}
          onOpenSorteio={setSorteioScope}
          onOpenPredefinicoes={() => setIsPreferenciasModalOpen(true)}
          onLimparFuncoes={handleLimparFuncoes}
          onOpenTransferSearchModal={() => setShowTransferSearchModal(true)}
          addMilitarSearch={addMilitarSearch}
          setAddMilitarSearch={setAddMilitarSearch}
          showAddMenu={showAddMenu}
          setShowAddMenu={setShowAddMenu}
          addMenuOptions={addMenuOptions}
          onCandidateSelect={handleCandidateSelect}
          baseRoster={baseRoster}
          militarsLoading={militarsLoading}
          permutasOut={permutasOut}
          militars={militars}
          selectedFunctions={selectedFunctions}
          setSelectedFunctions={setSelectedFunctions}
          predefinicoes={predefinicoes}
          expedienteRgs={expedienteRgs}
          visibleRasApplications={visibleRasApplications}
          rasApplications={rasApplications}
          manuallyAddedRgs={manuallyAddedRgs}
          selectedDate={selectedDate}
          onRemoveMilitaryFromScale={handleRemoveMilitaryFromScale}
          getAllowedOptions={getRawAllowedOptions}
          activeScaleFuncOptions={activeScaleFuncOptions}
          functionUsageStats={functionUsageStats}
          getRawAllowedOptions={getRawAllowedOptions}
        />

        {/* SEÇÃO 2.3: POSTOS DE SERVIÇO (POSTO DE PRAIA) */}
        <EscalaPostosSection
          key={`postos_${selectedDate}_${identifiedAlaStr}`}
          obmContext={obmContext}
          selectedDate={selectedDate}
          identifiedAlaStr={identifiedAlaStr}
          baseRoster={baseRoster}
          militars={militars}
          permutasOut={permutasOut}
          isSectionEnabled={postosEscalaEnabled}
          onToggleSectionEnabled={setPostosEscalaEnabled}
          postosData={postosData}
          onChangePostosData={setPostosData}
          availablePostosConfig={availablePostosConfig}
          selectedFunctions={selectedFunctions}
          onAssignSlot={handlePostoSlotAssign}
        />

        {/* SEÇÃO 2.4: SENTINELAS DA GUARDA */}
        <SentinelasSection
          key={`${selectedDate}_${identifiedAlaStr}`}
          obmContext={obmContext}
          selectedDate={selectedDate}
          baseRoster={baseRoster}
          militars={militars}
          sentinelaRgs={sentinelaRgs}
          sentinelaSlots={sentinelaSlots}
          onSentinelaChange={handleSentinelaChange}
          identifiedAlaStr={identifiedAlaStr}
          permutasOut={permutasOut}
        />

        {/* SECTION 2.5: AFASTAMENTOS DA ALA */}
        <AfastamentosAlaModule obmContext={obmContext} type="atuais" filterAla={identifiedAlaStr} targetDate={selectedDate} />

        {/* SECTION 2.6: MILITARES DE EXPEDIENTE NO DIA */}
        <ExpedienteDiaModule
          obmContext={obmContext}
          selectedDate={selectedDate}
          expedienteMilitars={expedienteMilitars}
          militars={militars}
        />

        {/* SECTION 2.7: GUARNIÇÃO DE REFORÇO (GRD) NO DIA */}
        <GrdDiaModule
          obmContext={obmContext}
          selectedDate={selectedDate}
          militars={militars}
          afastamentos={afastamentos}
          baseRoster={baseRoster}
          onGrdChange={(rgs) => {
            setGrdDayRgs(rgs);
          }}
          onOpenPrintView={() => setShowPrintView(true)}
          user={user}
        />

        {/* SEÇÃO 3A: FUNÇÕES ADMINISTRATIVAS */}
        <EscalaAdminRolesSection
          dynamicRequirements={dynamicRequirements}
          selectedFunctions={selectedFunctions}
          estudoTecnico={estudoTecnico}
          onToggleAdminRoleVisibility={handleToggleAdminRoleVisibility}
          onSetAllAdminRolesVisibility={handleSetAllAdminRolesVisibility}
          onOpenSorteioAdmin={() => setSorteioScope("administrativas")}
          militars={militars}
        />

        {/* SECTION 3B: PRONTIDÃO OPERACIONAL */}
        <EscalaOperacionalSection
          dynamicRequirements={dynamicRequirements}
          selectedFunctions={selectedFunctions}
          estudoTecnico={estudoTecnico}
          onToggleOperationalRole={handleToggleOperationalRole}
          onSetAllOperationalRoles={handleSetAllOperationalRoles}
          onOpenSorteioViaturas={() => setSorteioScope("viaturas")}
        />

        {/* SECTION 4: CONTROLE DE VIATURAS */}
        <EscalaViaturasSection
          viaturasInfo={viaturasInfo}
          onChangeViaturasInfo={setViaturasInfo}
          onApplyObmPattern={handleApplyObmPattern}
          onAddViaturaExtra={handleAddViaturaExtra}
          patternAppliedMessage={patternAppliedMessage}
          isViaturasCustomizedForDateRef={isViaturasCustomizedForDate}
        />
      </div>

      {sorteioScope && (
        <React.Suspense fallback={null}>
          <SorteioFuncoesModal
            key={sorteioScope}
            scope={sorteioScope}
            onClose={() => setSorteioScope(null)}
            onApply={handleApplySorteio}
            requirements={dynamicRequirements}
            roster={sorteioRoster}
            selectedFunctions={selectedFunctions}
            predefinicoes={predefinicoes}
            viaturasInfo={viaturasInfo}
            getSlotDisplayName={getSlotDisplayName}
            onOpenPredefinicoes={() => setIsPreferenciasModalOpen(true)}
            onToggleRoleActive={(roleName) =>
              sorteioScope === 'administrativas'
                ? handleToggleAdminRoleVisibility(roleName)
                : handleToggleOperationalRole(roleName)
            }
            onSetAllRolesActive={(active) =>
              sorteioScope === 'administrativas'
                ? handleSetAllAdminRolesVisibility(active)
                : handleSetAllOperationalRoles(active)
            }
          />
        </React.Suspense>
      )}

      {isPreferenciasModalOpen && (
        <React.Suspense fallback={null}>
          <EscalaPredefinicoesModal
            isOpen={isPreferenciasModalOpen}
            onClose={() => setIsPreferenciasModalOpen(false)}
            baseRoster={baseRoster}
            predefinicoes={predefinicoes}
            onUpdatePredefinicao={(rg, funcs) => {
              setPredefinicoes(prev => ({ ...prev, [rg]: funcs }));
            }}
            categories={categories}
            availableControlFunctions={availableControlFunctions}
            viaturasInfo={viaturasInfo}
            extraFuncOptions={activeScaleFuncOptions}
          />
        </React.Suspense>
      )}

      {showPrintView && (
        <React.Suspense fallback={null}>
          <EscalaPrintView
            selectedDate={selectedDate}
            identifiedAla={identifiedAla}
            obmContext={obmContext}
            afastamentos={afastamentos}
            baseRoster={baseRoster}
            permutasOut={permutasOut}
            militars={militars}
            selectedFunctions={selectedFunctions}
            viaturasInfo={viaturasInfo}
            rasApplications={rasApplications}
            expedienteMilitars={expedienteMilitars}
            grdRgs={grdDayRgs}
            sentinelaRgs={sentinelaRgs}
            sentinelaSlots={sentinelaSlots}
            oficialDia={oficialDiaValue}
            oficialNautica={nauticoOficialValue}
            oficialMedico={medicoOficialValue}
            officerVisibility={officerVisibility}
            onOfficerVisibilityChange={(updated: OfficerVisibility) => {
              setOfficerVisibility(updated);
              try {
                const rawObm = obmContext && obmContext !== 'GLOBAL' ? obmContext : '10º GBM';
                const cleanObm = normalizeObm(rawObm);
                localStorage.setItem(`escala_officer_visibility_${cleanObm}`, JSON.stringify(updated));
              } catch {}
            }}
            adminRolesVisibility={adminRolesVisibility}
            onAdminRolesVisibilityChange={(updated: Record<string, boolean>) => {
              setAdminRolesVisibility(updated);
              try {
                const rawObm = obmContext && obmContext !== 'GLOBAL' ? obmContext : '10º GBM';
                const cleanObm = normalizeObm(rawObm);
                localStorage.setItem(`escala_admin_roles_visibility_${cleanObm}`, JSON.stringify(updated));
              } catch {}
            }}
            user={user}
            onRegister={handleRegisterEscala}
            onClose={() => setShowPrintView(false)}
          />
        </React.Suspense>
      )}

      {isPermutaModalOpen && (
        <React.Suspense fallback={null}>
          <RequestPermuta 
            isOpen={isPermutaModalOpen}
            setIsOpen={setIsPermutaModalOpen}
            user={user}
            obmContext={obmContext}
            initialDate={selectedDate ? new Date(selectedDate + "T00:00:00") : null}
          />
        </React.Suspense>
      )}

      <EscalaTransferModals
        obmContext={obmContext}
        identifiedAlaStr={identifiedAlaStr}
        pendingTransferMilitar={pendingTransferMilitar}
        onCancelPending={() => setPendingTransferMilitar(null)}
        onExecuteTransfer={executeMilitarTransfer}
        isTransferring={isTransferringMilitar}
        showTransferSearchModal={showTransferSearchModal}
        onCloseTransferSearchModal={() => setShowTransferSearchModal(false)}
        militars={militars}
      />

      <EscalaFeedbackToasts
        sortearFeedback={sortearFeedback}
        onCloseSortearFeedback={() => setSortearFeedback(null)}
        undoSnapshot={undoSnapshot}
        onUndoFuncoes={handleUndoFuncoes}
        actionNotice={actionNotice}
      />
    </div>
  );
}
export default EscalaEspelhoModule;
