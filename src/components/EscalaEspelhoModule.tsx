import React, { useState, useEffect, useMemo, useRef } from "react";
import { useMilitars } from "../contexts/MilitarContext";
import { PermutaRequest, PermutaStatus } from "../types";
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp, getDoc, setDoc, getDocs, addDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { format, parseISO, addDays, subDays, startOfToday, startOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

import { parseRank, sortOfficersBySeniority, COLS_OFICIAIS, isOfficer, sortAllBySeniority } from "../lib/rankUtils";
import { RankInsignia } from "./RankInsignia";
import { EscalaPrintView } from "./EscalaPrintView";
import { RequestPermuta } from "./RequestPermuta";
import { AfastamentosAlaModule } from "./AfastamentosAlaModule";
import { ExpedienteDiaModule } from "./ExpedienteDiaModule";
import { GrdDiaModule } from "./GrdDiaModule";
import { SentinelasSection } from "./SentinelasSection";
import { SentinelaSlot } from "../lib/sentinelaUtils";
import { EscalanteDashboardCalendar } from "./EscalanteDashboardCalendar";
import { CategoryConfig, DEFAULT_CATEGORIES, getAvailableControlFunctions } from "./ControleCategoriasModal";
import { SorteioFuncoesModal, SorteioActionBar } from "./SorteioFuncoesModal";
import { SorteioScope, SorteioResult, SorteioMilitar, clearFunctionsByScope, isPreferredAssignment } from "../lib/sorteioFuncoes";
import { Calendar as CalendarIcon, CalendarRange, Users, ArrowRightLeft, ArrowRight, Shield, CheckCircle2, AlertCircle, Truck, ChevronDown, ChevronLeft, ChevronRight, Check, X, Clock, Printer, Shuffle, Plus, Settings, Activity, TrendingDown, PieChart, BriefcaseBusiness, Download, RotateCcw, ExternalLink, Edit3, Award, Star, UserCheck, Anchor, Stethoscope, HeartPulse, Sparkles, Trash2, Building2, ArrowLeftRight, UserPlus, Loader2, AlertTriangle, Search, Eye, EyeOff } from 'lucide-react';

import { motion } from "motion/react";
import { cleanUndefined, getUserObmAccess, normalizeObm, getAlaForDate, cn, getAlaColor, getAlaName, formatMilitaryName, normalizeAlaField, normalizeRg, getObmSettingsDocKey, getObmSettingsFallbackKeys } from '../lib/utils';


import { FuncoesMultiSelect } from "../features/escala24h/components/FuncoesMultiSelect";
import { EscalaHeaderBanner } from "../features/escala24h/components/EscalaHeaderBanner";
import { EscalaOficiaisSection } from "../features/escala24h/components/EscalaOficiaisSection";
import { EscalaPermutasSection } from "../features/escala24h/components/EscalaPermutasSection";
import { EscalaRasSection } from "../features/escala24h/components/EscalaRasSection";
import { EscalaRosterTable } from "../features/escala24h/components/EscalaRosterTable";
import { EscalaAdminRolesSection } from "../features/escala24h/components/EscalaAdminRolesSection";
import { EscalaOperacionalSection } from "../features/escala24h/components/EscalaOperacionalSection";
import { EscalaViaturasSection } from "../features/escala24h/components/EscalaViaturasSection";
import { EscalaPredefinicoesModal } from "../features/escala24h/components/EscalaPredefinicoesModal";
import { EscalaTransferModals } from "../features/escala24h/components/EscalaTransferModals";
import { EscalaFeedbackToasts } from "../features/escala24h/components/EscalaFeedbackToasts";
import {
  normalizeFnName,
  isVtrType,
  isMaritima,
  getDefaultName,
  getSlotDisplayName as getSlotDisplayNameCalc,
  getMilitarProp,
  getMostruario as getMostruarioCalc,
  getRawAllowedOptions as getRawAllowedOptionsCalc,
} from "../features/escala24h/lib/escalaCalculos";
import { EscalaViaturaInfo, ViaturaSlotType, SorteioFeedback } from "../features/escala24h/types";


import { UserProfile, OfficerVisibility } from "../types";
import { RAS_FUNCTION_MAP } from "../constants";

interface EscalaEspelhoModuleProps {
  obmContext: string;
  user: UserProfile;
  initialDate?: string;
}

const DEFAULT_VIATURAS: any[] = [
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

export function EscalaEspelhoModule({ obmContext, user, initialDate }: EscalaEspelhoModuleProps) {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (initialDate && typeof initialDate === 'string') {
      try {
        let clean = initialDate.trim();
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
        let clean = initialDate.trim();
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
  const [rasApplications, setRasApplications] = useState<any[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Estados para Transferência / Recebimento de Militar de outra unidade no CBA VII
  const [pendingTransferMilitar, setPendingTransferMilitar] = useState<any | null>(null);
  const [isTransferringMilitar, setIsTransferringMilitar] = useState(false);
  const [showTransferSearchModal, setShowTransferSearchModal] = useState(false);
  const [transferModalSearch, setTransferModalSearch] = useState('');
  const [transferModalSelectedMilitar, setTransferModalSelectedMilitar] = useState<any | null>(null);
  const [transferModalTargetAla, setTransferModalTargetAla] = useState('1');

  const visibleRasApplications = useMemo(() => {
    const removedRgs = manuallyRemovedRgs[selectedDate] || [];
    return rasApplications.filter(app => !removedRgs.includes(app.militarRg));
  }, [rasApplications, manuallyRemovedRgs, selectedDate]);
  const [addMilitarSearch, setAddMilitarSearch] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [extraMilitars, setExtraMilitars] = useState<any[]>([]);

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
  const addMenuRef = React.useRef<HTMLDivElement>(null);
  const [addRasMilitarSearch, setAddRasMilitarSearch] = useState('');
  const [showAddRasMenu, setShowAddRasMenu] = useState(false);
  const [rasDuration, setRasDuration] = useState<12 | 24>(24);
  const addRasMenuRef = React.useRef<HTMLDivElement>(null);

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
  }, []);

  useEffect(() => {
    if (!selectedDate || !obmContext || obmContext === 'GLOBAL') {
        setExpedienteRgs([]);
        setExpedienteMilitars([]);
        setExpediente24hRgs([]);
        return;
    }
    const cleanObm = normalizeObm(obmContext || '10º GBM');
    const normalizedObm = cleanObm.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const monthKey = selectedDate.substring(0, 7); // yyyy-MM
    
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

  const [selectedFunctions, setSelectedFunctions] = useState<
    Record<string, string[]>
  >({});

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

  const isViaturasCustomizedForDate = useRef(false);
  const [patternAppliedMessage, setPatternAppliedMessage] = useState<string | null>(null);

  const isFirstLoad = useRef(true);
  const previousDate = useRef(selectedDate);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
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

  const [isOfficerSectionExpanded, setIsOfficerSectionExpanded] = useState<boolean>(true);

  const [adminRolesVisibility, setAdminRolesVisibility] = useState<Record<string, boolean>>(() => {
    try {
      const rawObm = obmContext && obmContext !== 'GLOBAL' ? obmContext : (user?.obm || '10º GBM');
      const cleanObm = normalizeObm(rawObm);
      const saved = localStorage.getItem(`escala_admin_roles_visibility_${cleanObm}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const [adminTwoBlockMode, setAdminTwoBlockMode] = useState<'categories' | 'status' | 'table_analytics'>('categories');

  const handleToggleAdminRoleVisibility = (roleName: string) => {
    const norm = normalizeFnName(roleName);
    setAdminRolesVisibility(prev => {
      const current = prev[norm] !== false && prev[roleName] !== false; // default true
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
  // Sorteio dividido (viaturas / administrativas) com modal de prévia
  const [sorteioScope, setSorteioScope] = useState<SorteioScope | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<Record<string, string[]> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [grdDayRgs, setGrdDayRgs] = useState<string[]>([]);
  const [sentinelaRgs, setSentinelaRgs] = useState<(string | null)[]>(() => [null, null, null, null]);
  const [sentinelaSlots, setSentinelaSlots] = useState<SentinelaSlot[] | null>(null);

  const handleSentinelaChange = (newSentinelaRgs: (string | null)[], newSlots?: SentinelaSlot[]) => {
    setSentinelaRgs(newSentinelaRgs);
    if (newSlots) {
      setSentinelaSlots(newSlots);
    }

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

      currentAssigned.forEach(rg => {
        const existing = next[rg] || [];
        if (!existing.some(f => normalizeFnName(f) === 'SENTINELA')) {
          next[rg] = [...existing, 'SENTINELA'];
        }
      });

      return next;
    });
  };

  // Load correlation matrix, quantities and predefinicoes with realtime onSnapshot and canonical key
  useEffect(() => {
    if (!obmContext || obmContext === 'GLOBAL') return;
    const canonicalKey = getObmSettingsDocKey(obmContext);
    const docRef = doc(db, "obm_settings", canonicalKey);

    const unsub = onSnapshot(docRef, async (snap) => {
      let data = snap.exists() ? snap.data() : null;

      // Se o documento canônico ainda não tiver todas as configurações, verifica chaves legadas e migra
      if (!data?.escala_regras || !data?.escala_preferencias || !data?.categorias_funcoes) {
        const fallbacks = getObmSettingsFallbackKeys(obmContext).filter(k => k !== canonicalKey);
        for (const fk of fallbacks) {
          try {
            const fallbackSnap = await getDoc(doc(db, "obm_settings", fk));
            if (fallbackSnap.exists()) {
              const fbData = fallbackSnap.data();
              if (fbData) {
                data = { ...fbData, ...data };
                // Migra de forma transparente para a chave canônica
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
      } else {
        setCategories(DEFAULT_CATEGORIES);
        setCorrelation({});
        setRoleQtds({});
        setPredefinicoes({});
      }
    }, (e) => {
      console.warn("Could not listen to obm_settings in EscalaEspelhoModule:", e);
    });

    return () => unsub();
  }, [obmContext]);

  // Função auxiliar para carregar o padrão ativo da OBM (definido pelo usuário em Controle de Viaturas)
  const getObmActivePattern = async (targetObm?: string): Promise<any[]> => {
    const rawObm = targetObm && targetObm !== 'GLOBAL' ? targetObm : (obmContext && obmContext !== 'GLOBAL' ? obmContext : (user?.obm || '10º GBM'));
    const cleanObm = normalizeObm(rawObm);

    // 1. Tentar LocalStorage primeiro (instantâneo e síncrono)
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

    // 2. Tentar Firestore obm_settings
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
              
              // Cache no LocalStorage para consultas instantâneas
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

  // Ouvinte em tempo real para sincronizar o padrão atualizado em Controle de Viaturas
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

  // Sync state from Firebase when date changes
  useEffect(() => {
    if (!selectedDate) return;
    const rawObm = obmContext && obmContext !== 'GLOBAL' ? obmContext : (user?.obm || '10º GBM');
    const cleanObm = normalizeObm(rawObm);
    
    // Reset state locally if date changed
    if (previousDate.current !== selectedDate) {
       setSelectedFunctions({});
       setManuallyAddedRgs({});
       setSentinelaRgs([null, null, null, null]);
       previousDate.current = selectedDate;
       isFirstLoad.current = true;
    }
    
    const normalizedObm = cleanObm.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const docRef = doc(db, `escala24h_${normalizedObm}`, selectedDate);
    
    let isMounted = true;
    const loadState = async () => {
       try {
           const snap = await getDoc(docRef);
           let savedViaturas: any[] | null = null;
           let isExplicitCustomization = false;

           if (snap.exists() && isMounted) {
               const data = snap.data();
               if (data.selectedFunctions) setSelectedFunctions(data.selectedFunctions);
               if (data.manuallyAddedRgs) {
                   setManuallyAddedRgs(prev => ({...prev, [selectedDate]: data.manuallyAddedRgs}));
               }
               if (data.manuallyRemovedRgs) {
                   setManuallyRemovedRgs(prev => ({...prev, [selectedDate]: data.manuallyRemovedRgs}));
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
                   }
               }
           }
           
           if (isMounted) {
               const baseVtrs = await getObmActivePattern(cleanObm);
               
               // Detectar se o savedViaturas possui veículos obsoletos ou se é apenas o hardcoded default antigo:
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

               // Se não há dados salvos, ou se os dados salvos são a frota antiga obsoleta, ou se não houve customização explícita e o usuário definiu um padrão novo:
               if (!savedViaturas || savedViaturas.length === 0 || hasStaleLegacyVehicles || (!isExplicitCustomization && isOldDefaultHardcodedFleet && !baseMatchesOldDefault)) {
                   setViaturasInfo(baseVtrs);
               } else if (!isExplicitCustomization) {
                   // Se não foi customizado manualmente neste dia específico, preconfigura estritamente com o padrão do usuário,
                   // mantendo apenas viaturas extras que foram adicionadas manualmente (isExtra):
                   const genuineExtras = savedViaturas.filter((s: any) => s.isExtra && !baseVtrs.some((b: any) => b.id === s.id || b.vtr === s.vtr));
                   setViaturasInfo([...baseVtrs, ...genuineExtras]);
               } else {
                   // Dia teve customização pontual explícita: mescla respeitando a ordem do padrão
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

  // Auto-save state to Firebase
  useEffect(() => {
    if (isFirstLoad.current) return;
    if (!selectedDate) return;
    const rawObm = obmContext && obmContext !== 'GLOBAL' ? obmContext : (user?.obm || '10º GBM');
    const cleanObm = normalizeObm(rawObm);
    
    setSavingState('saving');
    const timeout = setTimeout(async () => {
      try {
          const normalizedObm = cleanObm.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
          const docRef = doc(db, `escala24h_${normalizedObm}`, selectedDate);
          await setDoc(docRef, {
             selectedFunctions,
             viaturasInfo,
             viaturasCustomizedForDate: isViaturasCustomizedForDate.current,
             manuallyAddedRgs: manuallyAddedRgs[selectedDate] || [],
             manuallyRemovedRgs: manuallyRemovedRgs[selectedDate] || [],
             officerVisibility,
             adminRolesVisibility,
             sentinelaRgs,
             sentinelaSlots: sentinelaSlots || null
          }, { merge: true });
          
          setSavingState('saved');
          setTimeout(() => setSavingState('idle'), 2000);
      } catch(e) {
          console.error("Error saving escala24h state:", e);
          setSavingState('idle');
      }
    }, 1000);
    
    return () => clearTimeout(timeout);
  }, [selectedFunctions, viaturasInfo, manuallyAddedRgs, manuallyRemovedRgs, selectedDate, obmContext, officerVisibility, adminRolesVisibility, sentinelaRgs, sentinelaSlots]);

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingPermutas(true);
    const qDate = query(
      collection(db, "permutas"),
      where("date", "==", selectedDate)
    );

    const unsubPermutas = onSnapshot(qDate, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PermutaRequest[];
      const filtered = data.filter(
        (p) => (!p.obm || getUserObmAccess(normalizeObm(obmContext), normalizeObm(obmContext) === 'GLOBAL').includes(normalizeObm(p.obm))) && p.status !== "cancelled"
      );
      setPermutas(filtered);
      setLoadingPermutas(false);
    });

    const qAfast = query(
      collection(db, "afastamentos_alas"),
      where("obm", "==", normalizeObm(obmContext))
    );

    const unsubAfast = onSnapshot(qAfast, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAfastamentos(data);
    });

    return () => {
      unsubPermutas();
      unsubAfast();
    };
  }, [selectedDate, obmContext]);

  // Real-time listener for RAS opportunities and contemplated applications on selectedDate
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

      const matchingOpps = oppsSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(o => !o.obm || obmContext === 'GLOBAL' || normalizeObm(o.obm) === normalizeObm(obmContext));

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
  }, [rasApplications]);

  // Sincroniza funções pré-definidas nas permutas quando elas carregam
  const autoFilledPermutas = useRef(new Set<string>());

  useEffect(() => {
    if (permutas.length > 0) {
      setSelectedFunctions(prev => {
        const next = { ...prev };
        let changed = false;
        permutas.forEach(p => {
          if (p.id && !autoFilledPermutas.current.has(p.id) && p.status === 'accepted' && p.substituteFunctions && p.substituteFunctions.length > 0 && p.requesterRg) {
            // Só aplica se ainda não houver função definida manualmente para este RG nesta sessão ou se queremos que a permuta mande
            // Como é um dashboard de triagem, faz sentido a permuta mandar no valor inicial
            if (!next[p.requesterRg] || next[p.requesterRg].length === 0) {
               next[p.requesterRg] = p.substituteFunctions;
               changed = true;
               autoFilledPermutas.current.add(p.id);
            }
          }
        });
        return changed ? next : prev;
      });
    }
  }, [permutas]);

  const handleStatusChange = async (permuta: PermutaRequest, newStatus: PermutaStatus) => {
    if (!permuta.id) return;
    try {
      await updateDoc(doc(db, "permutas", permuta.id), cleanUndefined({
              status: newStatus,
              updatedAt: serverTimestamp()
            }));
    } catch (error) {
      console.error("Update Status Error:", error);
    }
  };

  // INTEGRAÇÃO DE ESCALAS DE OFICIAIS (Serviço & GRD, Núcleo Náutico, Oficiais Médicos)
  const [officerScaleDays, setOfficerScaleDays] = useState<Record<string, Record<string, string>>>({});
  const [nauticoScaleDays, setNauticoScaleDays] = useState<Record<string, Record<string, string>>>({});
  const [medicoScaleDays, setMedicoScaleDays] = useState<Record<string, Record<string, string>>>({});

  const [loadingOfficerScale, setLoadingOfficerScale] = useState(false);
  const [loadingNauticoScale, setLoadingNauticoScale] = useState(false);
  const [loadingMedicoScale, setLoadingMedicoScale] = useState(false);
  const [poolConfig, setPoolConfig] = useState<Record<string, string[]> | null>(null);

  // Editing state for Serviço & GRD
  const [isEditingOficialDia, setIsEditingOficialDia] = useState(false);
  const [selectedOfficerInput, setSelectedOfficerInput] = useState('');
  const [savingOficialDia, setSavingOficialDia] = useState(false);

  // Editing state for Núcleo Náutico
  const [isEditingNautico, setIsEditingNautico] = useState(false);
  const [selectedNauticoInput, setSelectedNauticoInput] = useState('');
  const [savingNautico, setSavingNautico] = useState(false);

  // Editing state for Oficiais Médicos
  const [isEditingMedico, setIsEditingMedico] = useState(false);
  const [selectedMedicoInput, setSelectedMedicoInput] = useState('');
  const [savingMedico, setSavingMedico] = useState(false);

  // Real-time listeners para as 3 escalas em Firestore: officer_scales, nautico_scales, medico_scales
  useEffect(() => {
    if (!db) return;
    const rawObm = obmContext || "10º GBM";
    const normalizedObm = rawObm === 'GLOBAL' ? '10º_GBM' : rawObm.replace(/\//g, '_').replace(/\s/g, '_');
    
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

  // Helper para buscar militar completo por texto/nome
  const findOfficerMilitary = (officerStr: string) => {
    if (!officerStr) return null;
    const clean = officerStr.trim().toUpperCase();
    
    // 1. Tenta correspondência exata primeiro (incluindo o posto)
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

    // 2. Se não achou exato, busca parcial garantindo que o posto também está na string
    // Isso evita que "CAP MARCOS AUGUSTO" dê match em "1º SGT AUGUSTO"
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

  // Oficiais disponíveis para Serviço & GRD
  const availableOfficers = useMemo(() => {
    if (!poolConfig || !poolConfig.servicosGrd) return [];
    return militars.filter(m => poolConfig.servicosGrd.includes(m.rg || '')).sort(sortOfficersBySeniority);
  }, [militars, poolConfig]);

  // Oficiais disponíveis para Núcleo Náutico
  const availableNauticoOfficers = useMemo(() => {
    if (!poolConfig || !poolConfig.nucleoNautico) return [];
    return militars.filter(m => poolConfig.nucleoNautico.includes(m.rg || '')).sort(sortOfficersBySeniority);
  }, [militars, poolConfig]);

  // Oficiais disponíveis para Médicos
  const availableMedicalOfficers = useMemo(() => {
    if (!poolConfig || !poolConfig.oficiaisMedicos) return [];
    return militars.filter(m => poolConfig.oficiaisMedicos.includes(m.rg || '')).sort(sortOfficersBySeniority);
  }, [militars, poolConfig]);

  // 1. Dados de Serviço & GRD
  const currentOfficerDay = officerScaleDays[selectedDate] || {};
  const oficialDiaValue = currentOfficerDay.oficialDia || '';
  const sobreavisoValue = currentOfficerDay.sobreaviso || '';
  const matchedOficialDia = useMemo(() => findOfficerMilitary(oficialDiaValue), [oficialDiaValue, militars]);

  // 2. Dados de Núcleo Náutico
  const currentNauticoDay = nauticoScaleDays[selectedDate] || {};
  const nauticoOficialValue = currentNauticoDay.oficialDia || '';
  const nauticoSobreavisoValue = currentNauticoDay.sobreaviso || '';
  const matchedNauticoOficial = useMemo(() => findOfficerMilitary(nauticoOficialValue), [nauticoOficialValue, militars]);

  // 3. Dados de Oficiais Médicos
  const currentMedicoDay = medicoScaleDays[selectedDate] || {};
  const medicoOficialValue = currentMedicoDay.oficialDia || '';
  const medicoSobreavisoValue = currentMedicoDay.sobreaviso || '';
  const matchedMedicoOficial = useMemo(() => findOfficerMilitary(medicoOficialValue), [medicoOficialValue, militars]);

  // Handler para salvar Oficial de Dia (Serviço & GRD)
  const handleSaveOficialDia = async (officerName: string) => {
    if (!db || !selectedDate) return;
    setSavingOficialDia(true);
    try {
      const rawObm = obmContext || "10º GBM";
      const normalizedObm = rawObm === 'GLOBAL' ? '10º_GBM' : rawObm.replace(/\//g, '_').replace(/\s/g, '_');
      await setDoc(doc(db, 'officer_scales', normalizedObm), cleanUndefined({
        days: {
          [selectedDate]: {
            oficialDia: officerName
          }
        }
      }), { merge: true });
      setOfficerScaleDays(prev => ({
        ...prev,
        [selectedDate]: {
          ...(prev[selectedDate] || {}),
          oficialDia: officerName
        }
      }));
      setIsEditingOficialDia(false);
    } catch (err) {
      console.error("Erro ao salvar oficial de dia:", err);
    } finally {
      setSavingOficialDia(false);
    }
  };

  // Handler para salvar Oficial do Núcleo Náutico
  const handleSaveNauticoOficial = async (officerName: string) => {
    if (!db || !selectedDate) return;
    setSavingNautico(true);
    try {
      const rawObm = obmContext || "10º GBM";
      const normalizedObm = rawObm === 'GLOBAL' ? '10º_GBM' : rawObm.replace(/\//g, '_').replace(/\s/g, '_');
      await setDoc(doc(db, 'nautico_scales', normalizedObm), cleanUndefined({
        days: {
          [selectedDate]: {
            oficialDia: officerName
          }
        }
      }), { merge: true });
      setNauticoScaleDays(prev => ({
        ...prev,
        [selectedDate]: {
          ...(prev[selectedDate] || {}),
          oficialDia: officerName
        }
      }));
      setIsEditingNautico(false);
    } catch (err) {
      console.error("Erro ao salvar oficial náutico:", err);
    } finally {
      setSavingNautico(false);
    }
  };

  // Handler para salvar Oficial Médico
  const handleSaveMedicoOficial = async (officerName: string) => {
    if (!db || !selectedDate) return;
    setSavingMedico(true);
    try {
      const rawObm = obmContext || "10º GBM";
      const normalizedObm = rawObm === 'GLOBAL' ? '10º_GBM' : rawObm.replace(/\//g, '_').replace(/\s/g, '_');
      await setDoc(doc(db, 'medico_scales', normalizedObm), cleanUndefined({
        days: {
          [selectedDate]: {
            oficialDia: officerName
          }
        }
      }), { merge: true });
      setMedicoScaleDays(prev => ({
        ...prev,
        [selectedDate]: {
          ...(prev[selectedDate] || {}),
          oficialDia: officerName
        }
      }));
      setIsEditingMedico(false);
    } catch (err) {
      console.error("Erro ao salvar oficial médico:", err);
    } finally {
      setSavingMedico(false);
    }
  };

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

  // Estado unificado do Dashboard Mensal no cabeçalho superior
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

  // Navegação rápida: lista dos próximos dias com cálculo automático de alas
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

  // Base Roster for the identified Ala
  const baseRoster = useMemo(() => {
    const manualRgs = manuallyAddedRgs[selectedDate] || [];
    const removedRgs = manuallyRemovedRgs[selectedDate] || [];
    const rasRgs = visibleRasApplications.map((a: any) => a.militarRg);

    // Make sure all militars in visibleRasApplications exist in the pool even if from another OBM or external search
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
    // Remove duplicates
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
        
        // Verifica se há afastamento para o militar na data selecionada
        const hasAfastamento = afastamentos.some((a) => {
          if (normalizeRg(a.rg) === normalizeRg(m.rg)) {
             return selectedDate >= a.inicio && selectedDate <= a.retorno;
          }
          return false;
        });

        return !hasAfastamento;
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
  }, [militars, extraMilitars, identifiedAlaStr, afastamentos, selectedDate, manuallyAddedRgs, manuallyRemovedRgs, expedienteRgs, expediente24hRgs, visibleRasApplications, obmContext]);

  // Map to easily find if a militar is swapping out
  const permutasOut = useMemo(() => {
    const map = new Map<string, PermutaRequest>();
    permutas.forEach((p) => {
      if (p.requesterRg) map.set(p.requesterRg, p);
    });
    return map;
  }, [permutas]);

  const availableControlFunctions = useMemo(() => getAvailableControlFunctions(categories), [categories]);

  const getSlotDisplayName = (v: any, slot: string) => getSlotDisplayNameCalc(v, slot, availableControlFunctions);
  const getMostruario = (militar: any) => getMostruarioCalc(militar, availableControlFunctions);
  const getRawAllowedOptions = (militar: any) => getRawAllowedOptionsCalc(militar, categories, availableControlFunctions, viaturasInfo);


  const isAdminRoleActive = (roleName: string) => {
    const norm = normalizeFnName(roleName);
    return adminRolesVisibility[norm] !== false && adminRolesVisibility[roleName] !== false;
  };

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

  const dynamicRequirements = useMemo(() => {
    const makeAdminReq = (name: string, defaultReq: number) => {
      const baseReq = roleQtds[name] ?? defaultReq;
      const norm = normalizeFnName(name);
      const active = adminRolesVisibility[norm] !== false && adminRolesVisibility[name] !== false;
      return {
        name,
        genericName: name,
        req: active ? baseReq : 0,
        baseReq,
        active,
        category: 'admin',
      };
    };

    const reqs: {
      name: string;
      genericName: string;
      req: number;
      baseReq: number;
      active: boolean;
      category: string;
      vtrsActive?: string[];
      vtrsAll?: string[];
    }[] = [
      makeAdminReq("ADJUNTO", 1),
      makeAdminReq("ENCARREGADO DE MOTORISTA", 1),
    ];

    const vtrReqs: Record<string, {
      req: number;
      baseReq: number;
      category: string;
      genericName: string;
      vtrsActive: Set<string>;
      vtrsAll: Set<string>;
    }> = {};

    viaturasInfo.forEach(v => {
      (['condutor', 'g1', 'g2', 'g3', 'g4', 'cg'] as const).forEach(slot => {
        if (v.blocked?.includes(slot)) return;
        const roleName = getSlotDisplayName(v, slot);
        let cat = 'auxiliar';
        const isMar = isMaritima(v);
        if (slot === 'condutor') cat = isMar ? 'condutor_maritimo' : 'condutor';
        else if (slot === 'cg') cat = isMar ? 'chefe_maritimo' : 'chefe';
        else cat = isMar ? 'auxiliar_maritimo' : 'auxiliar';

        const genericName = getDefaultName(v, slot);
        if (!vtrReqs[roleName]) {
          vtrReqs[roleName] = {
            req: 0,
            baseReq: 0,
            category: cat,
            genericName,
            vtrsActive: new Set<string>(),
            vtrsAll: new Set<string>(),
          };
        }
        vtrReqs[roleName].baseReq += 1;
        if (v.vtr) vtrReqs[roleName].vtrsAll.add(v.vtr);

        if (v.ativa && v[slot as keyof typeof v] === true) {
          vtrReqs[roleName].req += 1;
          if (v.vtr) vtrReqs[roleName].vtrsActive.add(v.vtr);
        }
      });
    });

    Object.entries(vtrReqs).forEach(([name, data]) => {
      reqs.push({
        name,
        genericName: data.genericName,
        req: data.req,
        baseReq: data.baseReq,
        active: data.req > 0,
        category: data.category,
        vtrsActive: Array.from(data.vtrsActive),
        vtrsAll: Array.from(data.vtrsAll),
      });
    });

    reqs.push(makeAdminReq("AUXILIAR RANCHO", 1));
    reqs.push(makeAdminReq("TOQUE DE FOGO", 1));
    reqs.push(makeAdminReq("DIA AO DEPOSITO", 2));
    reqs.push(makeAdminReq("RESP FAXINA", 1));
    reqs.push(makeAdminReq("ABASTECEDOR", 1));

    reqs.push(makeAdminReq("SGT DIA", 1));
    reqs.push(makeAdminReq("CMT GUARDA", 1));
    reqs.push(makeAdminReq("CB GUARDA", 1));
    reqs.push(makeAdminReq("CB DIA", 1));
    reqs.push(makeAdminReq("COMUNICANTE", 2));
    reqs.push(makeAdminReq("ESCALANTE", 1));
    // SENTINELA é gerenciado exclusivamente na Seção de Sentinelas, removido do sorteio automático conforme solicitado

    return reqs;

  }, [viaturasInfo, roleQtds, adminRolesVisibility]);

  // Filtra as habilidades do militar para exibir/permitir apenas funções ATIVAS e CONFIGURADAS na escala atual
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

  // Opções ativas na escala atual (usadas na Construção de Escala)
  const activeScaleFuncOptions = useMemo(() => {
    return dynamicRequirements
      .filter(r => r.active !== false && r.req > 0)
      .map(r => r.name);
  }, [dynamicRequirements]);

  // Mapa de contagem e limite de vagas por função na escala atual (para destacar excesso em vermelho)
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

  // Todas as opções da unidade (usadas no modal de Pré-definições Fixas do escalante)
  const extraFuncOptions = useMemo(() => {
    const opts = new Set<string>();
    dynamicRequirements.forEach(r => opts.add(r.name));
    availableControlFunctions.forEach(f => opts.add(f.scaleName));
    return Array.from(opts);
  }, [dynamicRequirements, availableControlFunctions]);

  
  const estudoTecnico = useMemo(() => {
    const realRoster = baseRoster.map(m => {
       const isSwapped = permutasOut.has(m.rg || '');
       return isSwapped ? (militars.find(x => x.rg === permutasOut.get(m.rg || '')?.substituteRg) || m) : m;
    });

    const allSlots: {name: string, genericName: string, category: string}[] = [];
    dynamicRequirements.forEach(req => {
      for (let i = 0; i < req.req; i++) {
        allSlots.push({ name: req.name, genericName: req.genericName, category: req.category });
      }
    });

    const militarCapabilities = realRoster.map(m => ({
      rg: m.rg || '',
      rank: m.rank || '',
      allowed: getAllowedOptions(m) || [],
      assignedRoles: [] as string[]
    }));

    const slotOptionsCount = allSlots.map(slot => {
       const count = militarCapabilities.filter(m => m.allowed.includes(slot.name) || m.allowed.includes(slot.genericName)).length;
       return { slot, count };
    });

    // Sort strategy for predictive assignment:
    // 1. Priority to Operational over Admin
    // 2. Fewest capable militars first (fill hardest slots first)
    slotOptionsCount.sort((a, b) => {
       const aIsAdmin = a.slot.category === 'admin';
       const bIsAdmin = b.slot.category === 'admin';
       if (aIsAdmin && !bIsAdmin) return 1;
       if (!aIsAdmin && bIsAdmin) return -1;
       return a.count - b.count;
    });

    const unfulfilledSlots: {name: string, category: string}[] = [];
    
    let reqCondutores = 0, reqCondutoresMaritimos = 0, reqChefes = 0, reqChefesMaritimos = 0, reqAuxiliares = 0, reqAuxiliaresMaritimos = 0, reqAdmin = 0;
    let unfulfilledCondutores = 0, unfulfilledCondutoresMaritimos = 0, unfulfilledChefes = 0, unfulfilledChefesMaritimos = 0, unfulfilledAuxiliares = 0, unfulfilledAuxiliaresMaritimos = 0, unfulfilledAdmin = 0;
    let reqEfetivo = allSlots.length;
    let unfulfilledEfetivo = 0;

    slotOptionsCount.forEach(({ slot }) => {
       if (slot.category === 'admin') reqAdmin++;
       else if (slot.category === 'condutor') reqCondutores++;
       else if (slot.category === 'condutor_maritimo') reqCondutoresMaritimos++;
       else if (slot.category === 'chefe') reqChefes++;
       else if (slot.category === 'chefe_maritimo') reqChefesMaritimos++;
       else if (slot.category === 'auxiliar') reqAuxiliares++;
       else if (slot.category === 'auxiliar_maritimo') reqAuxiliaresMaritimos++;

       const available = militarCapabilities.filter(m => { 
          if (!m.allowed.includes(slot.name) && !m.allowed.includes(slot.genericName)) return false; 
          if (m.assignedRoles.includes(slot.genericName)) return false; 
          for (const role of m.assignedRoles) { 
             const isSentinelaAux = (
                (slot.genericName === 'SENTINELA' && ['AUXILIAR ABT', 'AUXILIAR ABSL', 'AUXILIAR/CHEFE ARC'].includes(role)) ||
                (role === 'SENTINELA' && ['AUXILIAR ABT', 'AUXILIAR ABSL', 'AUXILIAR/CHEFE ARC'].includes(slot.genericName))
             );
             
             if (isSentinelaAux) {
                const arcRole = slot.genericName === 'AUXILIAR/CHEFE ARC' || role === 'AUXILIAR/CHEFE ARC';
                if (arcRole) {
                   if (m.rank === 'Soldado') continue;
                } else {
                   continue;
                }
             }

             const val1 = correlation[slot.genericName]?.[role] ?? 0; 
             const val2 = correlation[role]?.[slot.genericName] ?? 0; 
             if (val1 === 0 || val2 === 0) return false; 
          } 
          return true; 
       });

       if (available.length > 0) { 
          // Advanced Selection: Pick the most specialized militar available (fewest total allowed roles)
          available.sort((a, b) => {
              if (a.allowed.length !== b.allowed.length) return a.allowed.length - b.allowed.length;
              return a.assignedRoles.length - b.assignedRoles.length;
          });
          available[0].assignedRoles.push(slot.genericName);
       } else {
          unfulfilledSlots.push(slot);
       }
    });

    unfulfilledSlots.forEach(slot => {
       unfulfilledEfetivo++;
       if (slot.category === 'admin') unfulfilledAdmin++;
       else if (slot.category === 'condutor') unfulfilledCondutores++;
       else if (slot.category === 'condutor_maritimo') unfulfilledCondutoresMaritimos++;
       else if (slot.category === 'chefe') unfulfilledChefes++;
       else if (slot.category === 'chefe_maritimo') unfulfilledChefesMaritimos++;
       else if (slot.category === 'auxiliar') unfulfilledAuxiliares++;
       else if (slot.category === 'auxiliar_maritimo') unfulfilledAuxiliaresMaritimos++;
    });

    const calcChance = (deficit: number, req: number) => req > 0 ? Math.min(100, Math.round((deficit / req) * 100)) : 0;

    let unfulfilledOperacional = unfulfilledCondutores + unfulfilledCondutoresMaritimos + unfulfilledChefes + unfulfilledChefesMaritimos + unfulfilledAuxiliares + unfulfilledAuxiliaresMaritimos;
    let reqOperacional = reqCondutores + reqCondutoresMaritimos + reqChefes + reqChefesMaritimos + reqAuxiliares + reqAuxiliaresMaritimos;

    return {
      efetivoOperacional: { req: reqOperacional, deficit: unfulfilledOperacional, chance: calcChance(unfulfilledOperacional, reqOperacional) },
      efetivoAdministrativo: { req: reqAdmin, deficit: unfulfilledAdmin, chance: calcChance(unfulfilledAdmin, reqAdmin) },
      efetivo: { req: reqEfetivo, deficit: unfulfilledEfetivo, chance: calcChance(unfulfilledEfetivo, reqEfetivo) },
      condutores: { req: reqCondutores, deficit: unfulfilledCondutores, chance: calcChance(unfulfilledCondutores, reqCondutores) },
      condutores_maritimos: { req: reqCondutoresMaritimos, deficit: unfulfilledCondutoresMaritimos, chance: calcChance(unfulfilledCondutoresMaritimos, reqCondutoresMaritimos) },
      chefes: { req: reqChefes, deficit: unfulfilledChefes, chance: calcChance(unfulfilledChefes, reqChefes) },
      chefes_maritimos: { req: reqChefesMaritimos, deficit: unfulfilledChefesMaritimos, chance: calcChance(unfulfilledChefesMaritimos, reqChefesMaritimos) },
      auxiliares: { req: reqAuxiliares, deficit: unfulfilledAuxiliares, chance: calcChance(unfulfilledAuxiliares, reqAuxiliares) },
      auxiliares_maritimos: { req: reqAuxiliaresMaritimos, deficit: unfulfilledAuxiliaresMaritimos, chance: calcChance(unfulfilledAuxiliaresMaritimos, reqAuxiliaresMaritimos) },
      admin: { req: reqAdmin, deficit: unfulfilledAdmin, chance: calcChance(unfulfilledAdmin, reqAdmin) }
    };

  }, [baseRoster, permutasOut, militars, dynamicRequirements, correlation]);

  const handleApplyObmPattern = async () => {
    try {
      const rawObm = obmContext && obmContext !== 'GLOBAL' ? obmContext : (user?.obm || '10º GBM');
      const cleanObm = normalizeObm(rawObm);
      const pattern = await getObmActivePattern(cleanObm);
      
      setViaturasInfo(pattern);
      isViaturasCustomizedForDate.current = false;

      if (db && selectedDate) {
        const normalizedObm = cleanObm.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const docRef = doc(db, `escala24h_${normalizedObm}`, selectedDate);
        await setDoc(docRef, {
          viaturasInfo: pattern,
          viaturasCustomizedForDate: false,
          updatedAt: new Date().toISOString()
        }, { merge: true });
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

  // ───────── SORTEIO DIVIDIDO (Viaturas / Administrativas) + LIMPAR ─────────
  // A lógica de sorteio vive em ../lib/sorteioFuncoes (função pura). O modal mostra a
  // prévia exata do que será aplicado; a SENTINELA nunca participa do sorteio.

  const showSorteioFeedback = (fb: { type: 'success' | 'warning' | 'info'; message: string; undoable?: boolean }, ms = 6000) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setSortearFeedback(fb);
    feedbackTimerRef.current = setTimeout(() => setSortearFeedback(null), ms);
  };

  // Elenco do dia já considerando permutas (substituto assume a vaga), com as habilitações
  const sorteioRoster = useMemo<SorteioMilitar[]>(() => {
    if (!sorteioScope) return [];
    return baseRoster.map(m => {
      const isSwapped = permutasOut.has(m.rg || '');
      const actualMilitar = isSwapped ? (militars.find(x => x.rg === permutasOut.get(m.rg || '')?.substituteRg) || m) : m;
      return { rg: m.rg || '', militar: actualMilitar, allowed: getAllowedOptions(actualMilitar) || [] };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleAddMilitarToRas = async (m: any) => {
    setAddRasMilitarSearch('');
    setShowAddRasMenu(false);
    // Se estava marcado como removido manualmente para esta data, desmarcar
    setManuallyRemovedRgs(prev => {
      const curr = prev[selectedDate] || [];
      return { ...prev, [selectedDate]: curr.filter(rg => rg !== m.rg) };
    });
    try {
      const qOpps = query(collection(db, 'ras_opportunities'), where('obm', '==', obmContext), where('date', '==', selectedDate), where('duration', '==', rasDuration));
      const oppsSnap = await getDocs(qOpps);
      
      let rasId = '';
      if (oppsSnap.empty) {
        const oppRef = await addDoc(collection(db, 'ras_opportunities'), {
          obm: obmContext,
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
      
      // Auto-incluir na escala também
      handleAddSingleRas(appWithId);
      
    } catch(err) {
      console.error(err);
      alert("Erro ao adicionar militar ao RAS.");
    }
  };

  const handleFetchRas = async () => {
    try {
      const qOpps = query(collection(db, 'ras_opportunities'), where('obm', '==', obmContext), where('date', '==', selectedDate));
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

  const handleAddSingleRas = (app: any) => {
    // Se estava marcado como removido, desmarcar para permitir reinclusão
    setManuallyRemovedRgs(prev => {
      const curr = prev[selectedDate] || [];
      return { ...prev, [selectedDate]: curr.filter(rg => rg !== app.militarRg) };
    });

    let m = militars.find(m => m.rg === app.militarRg);
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

  const handleRemoveRasMilitar = async (app: any) => {
    const militarRg = app.militarRg;
    if (!militarRg) return;
    const militarName = app.militarWarName || app.militarName || militarRg;
    const rank = app.militarRank || '';

    // 1. Ação imediata no estado local para resposta instantânea na interface
    // Marca em manuallyRemovedRgs para essa data
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

    // Remove de adições manuais para a data selecionada
    setManuallyAddedRgs(prev => {
      const curr = prev[selectedDate] || [];
      return {
        ...prev,
        [selectedDate]: curr.filter(rg => rg !== militarRg)
      };
    });

    // Remove da relação de aplicações de RAS no estado
    setRasApplications(prev => prev.filter(a => a.id !== app.id && a.militarRg !== militarRg));

    // Limpa funções atribuídas a este militar
    setSelectedFunctions(prev => {
      const next = { ...prev };
      delete next[militarRg];
      return next;
    });

    // Remove de extraMilitars caso tenha sido injetado dinamicamente
    setExtraMilitars(prev => prev.filter(m => m.rg !== militarRg));

    // Exibe aviso visual imediato de sucesso
    setActionNotice(`${rank ? rank + ' ' : ''}${militarName} excluído do RAS e da escala.`);
    setTimeout(() => {
      setActionNotice(null);
    }, 3000);

    // 2. Exclusão assíncrona no Firestore
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
    // Abrir a visualização de impressão e geração imediatamente
    setShowPrintView(true);

    // Check if the scale is for the current day
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
                 // find any RGs that have this role
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
    
    // Combine local militars and globalSearchResults
    const combinedPool = [...militars, ...globalSearchResults];
    // Remove duplicates by rg
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
      // Abre o aviso/modal de transferência de unidade
      setPendingTransferMilitar(m);
      setShowAddMenu(false);
    } else {
      // Adiciona diretamente à escala
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

        // Atualização em memória no contexto do cliente
        updateMilitarLocal(m.rg, {
          obm: targetObm,
          ala: assignedAla,
          situacao: 'Ativo'
        });
        refreshMilitars();
      }

      // Adiciona militar à escala do dia
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
        sentinelaSlots: sentinelaSlots || null
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
        {/* DASHBOARD MENSAL UNIFICADO (EXPANDE DENTRO DESTA MESMA SEÇÃO) */}
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

        {/* SEÇÃO CONEXÃO DE ESCALAS DE OFICIAIS: SERVIÇO & GRD, NÚCLEO NÁUTICO, OFICIAIS MÉDICOS */}
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

        {/* SECTION 1: IMPORT_PERMUTA (Permutas Deferidas) */}
        <EscalaPermutasSection
          permutas={permutas}
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

        {/* SECTION 2: TAB_PERMUTA (Escala Espelho Base) */}
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

        {/* SEÇÃO 2.4: SENTINELAS DA GUARDA (ACIMA DE AFASTAMENTOS E FÉRIAS) */}
        <SentinelasSection
          obmContext={obmContext}
          selectedDate={selectedDate}
          baseRoster={baseRoster}
          militars={militars}
          sentinelaRgs={sentinelaRgs}
          sentinelaSlots={sentinelaSlots}
          onSentinelaChange={handleSentinelaChange}
          identifiedAlaStr={identifiedAlaStr}
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

        {/* SEÇÃO 3A: FUNÇÕES ADMINISTRATIVAS (2 BLOCOS) */}
        <EscalaAdminRolesSection
          dynamicRequirements={dynamicRequirements}
          selectedFunctions={selectedFunctions}
          estudoTecnico={estudoTecnico}
          onToggleAdminRoleVisibility={handleToggleAdminRoleVisibility}
          onSetAllAdminRolesVisibility={handleSetAllAdminRolesVisibility}
          onOpenSorteioAdmin={() => setSorteioScope("administrativas")}
          militars={militars}
        />

        {/* SECTION 3B: PRONTIDÃO OPERACIONAL (QUANT_MILITARES1) */}
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

        {/* SECTION 5: AFASTAMENTOS DA ALA */}
      </div>

      {sorteioScope && (
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
      )}

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

      {showPrintView && (
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
      )}

      <RequestPermuta 
        isOpen={isPermutaModalOpen}
        setIsOpen={setIsPermutaModalOpen}
        user={user}
        obmContext={obmContext}
        initialDate={selectedDate ? new Date(selectedDate + "T00:00:00") : null}
      />

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
