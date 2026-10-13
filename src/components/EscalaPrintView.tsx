import React, { useState, useMemo, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Printer, X, Image as ImageIcon, PenTool, Save, Shield, ExternalLink, Eye, EyeOff, ChevronDown, Check } from 'lucide-react';
import { RankInsignia } from './RankInsignia';
import { LogoDecimoGbm } from './LogoDecimoGbm';
import { LogoCbaSete } from './LogoCbaSete';
import { LogoManagerModal } from './LogoManagerModal';
import { parseRank, sortAllBySeniority, formatRankAndName, formatRankAbbr } from '../lib/rankUtils';
import { formatMilitaryName, normalizeObm, normalizeRg, normalizeAlaField, cn, getAlaForDate } from '../lib/utils';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OfficerVisibility } from '../types';

export function EscalaPrintView({
  selectedDate,
  identifiedAla,
  baseRoster,
  permutasOut,
  militars,
  selectedFunctions,
  viaturasInfo,
  rasApplications,
  expedienteMilitars: initialExpedienteMilitars,
  oficialDia,
  oficialNautica,
  oficialMedico,
  officerVisibility: propOfficerVisibility,
  onOfficerVisibilityChange,
  adminRolesVisibility: propAdminRolesVisibility,
  onAdminRolesVisibilityChange,
  user,
  afastamentos,
  obmContext,
  grdRgs: propGrdRgs,
  onRegister,
  onClose
}: any) {
  const [showVisualMode, setShowVisualMode] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [isSigned, setIsSigned] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [grdRgs, setGrdRgs] = useState<string[]>(() => propGrdRgs || []);
  const [printFallbackUrl, setPrintFallbackUrl] = useState<string | null>(null);

  useEffect(() => {
    if (propGrdRgs !== undefined && Array.isArray(propGrdRgs)) {
      setGrdRgs(propGrdRgs);
    }
  }, [propGrdRgs]);
  const [showOfficerMenu, setShowOfficerMenu] = useState(false);
  const officerMenuRef = useRef<HTMLDivElement>(null);
  const [officerTableLayout, setOfficerTableLayout] = useState<'colunas' | 'linhas'>(() => {
    try {
      const saved = localStorage.getItem('escala_officer_table_layout');
      if (saved === 'linhas' || saved === 'colunas') return saved;
    } catch {}
    return 'colunas';
  });

  useEffect(() => {
    try {
      localStorage.setItem('escala_officer_table_layout', officerTableLayout);
    } catch {}
  }, [officerTableLayout]);

  const [officerVisibility, setOfficerVisibility] = useState<OfficerVisibility>(() => {
    if (propOfficerVisibility) return propOfficerVisibility;
    try {
      const rawObm = obmContext && obmContext !== 'GLOBAL' ? obmContext : '10º GBM';
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

  useEffect(() => {
    if (propOfficerVisibility) {
      setOfficerVisibility(propOfficerVisibility);
    }
  }, [propOfficerVisibility]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (officerMenuRef.current && !officerMenuRef.current.contains(e.target as Node)) {
        setShowOfficerMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUpdateOfficerVisibility = (updater: (prev: OfficerVisibility) => OfficerVisibility) => {
    setOfficerVisibility(prev => {
      const next = updater(prev);
      try {
        const rawObm = obmContext && obmContext !== 'GLOBAL' ? obmContext : '10º GBM';
        const cleanObm = normalizeObm(rawObm);
        localStorage.setItem(`escala_officer_visibility_${cleanObm}`, JSON.stringify(next));
      } catch {}
      onOfficerVisibilityChange?.(next);
      return next;
    });
  };

  const toggleOfficerVisibility = (key: 'showOficialDia' | 'showOficialNautica' | 'showOficialMedico') => {
    handleUpdateOfficerVisibility(prev => {
      const next = { ...prev, [key]: !prev[key] };
      next.showSection = next.showOficialDia || next.showOficialNautica || next.showOficialMedico;
      return next;
    });
  };

  const setAllOfficersVisibility = (visible: boolean) => {
    handleUpdateOfficerVisibility(() => ({
      showSection: visible,
      showOficialDia: visible,
      showOficialNautica: visible,
      showOficialMedico: visible,
    }));
  };

  const isSectionVisible = officerVisibility.showSection !== false;
  const isDiaVisible = isSectionVisible && officerVisibility.showOficialDia !== false;
  const isNauticaVisible = isSectionVisible && officerVisibility.showOficialNautica !== false;
  const isMedicoVisible = isSectionVisible && officerVisibility.showOficialMedico !== false;
  const hasAnyVisibleOfficer = isDiaVisible || isNauticaVisible || isMedicoVisible;
  const activeOfficerCount = (isDiaVisible ? 1 : 0) + (isNauticaVisible ? 1 : 0) + (isMedicoVisible ? 1 : 0);

  const [adminRolesVisibility, setAdminRolesVisibility] = useState<Record<string, boolean>>(() => {
    if (propAdminRolesVisibility && Object.keys(propAdminRolesVisibility).length > 0) {
      return propAdminRolesVisibility;
    }
    try {
      const rawObm = obmContext && obmContext !== 'GLOBAL' ? obmContext : (user?.obm || '10º GBM');
      const cleanObm = normalizeObm(rawObm);
      const saved = localStorage.getItem(`escala_admin_roles_visibility_${cleanObm}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  useEffect(() => {
    if (propAdminRolesVisibility) {
      setAdminRolesVisibility(propAdminRolesVisibility);
    }
  }, [propAdminRolesVisibility]);

  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setShowAdminMenu(false);
      }
    }
    if (showAdminMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAdminMenu]);

  const isAdminRoleVisible = (roleKey: string) => {
    const norm = normalize(roleKey);
    if (norm === 'COMUNICANTE 1') {
      if (adminRolesVisibility['COMUNICANTE 1'] !== undefined) return adminRolesVisibility['COMUNICANTE 1'];
      if (adminRolesVisibility['comunicante 1'] !== undefined) return adminRolesVisibility['comunicante 1'];
      return true;
    }
    if (norm === 'COMUNICANTE 2') {
      if (adminRolesVisibility['COMUNICANTE 2'] !== undefined) return adminRolesVisibility['COMUNICANTE 2'];
      if (adminRolesVisibility['comunicante 2'] !== undefined) return adminRolesVisibility['comunicante 2'];
      return true;
    }
    if (adminRolesVisibility[norm] !== undefined) return adminRolesVisibility[norm];
    if (adminRolesVisibility[roleKey] !== undefined) return adminRolesVisibility[roleKey];
    for (const [k, v] of Object.entries(adminRolesVisibility)) {
      if (normalize(k) === norm) return v;
    }
    return true; // default is visible
  };

  const toggleAdminRoleVisibility = (roleKey: string) => {
    const norm = normalize(roleKey);
    const current = isAdminRoleVisible(roleKey);
    const next = {
      ...adminRolesVisibility,
      [norm]: !current,
      [roleKey]: !current,
    };
    setAdminRolesVisibility(next);
    if (onAdminRolesVisibilityChange) {
      onAdminRolesVisibilityChange(next);
    }
    try {
      const rawObm = obmContext && obmContext !== 'GLOBAL' ? obmContext : (user?.obm || '10º GBM');
      const cleanObm = normalizeObm(rawObm);
      localStorage.setItem(`escala_admin_roles_visibility_${cleanObm}`, JSON.stringify(next));
    } catch {}
  };

  const setAllAdminRolesVisibility = (visible: boolean) => {
    const next: Record<string, boolean> = { ...adminRolesVisibility };
    const allAdminKeys = [
      'ADJUNTO', 'ENCARREGADO DE MOTORISTA', 'RESP FAXINA', 'SGT DIA', 'CMT GUARDA',
      'DIA AO DEPOSITO', 'ABASTECEDOR', 'CB DIA', 'CB GUARDA',
      'COMUNICANTE', 'COMUNICANTE 1', 'COMUNICANTE 2', 'SENTINELA', 'AUXILIAR RANCHO', 'TOQUE DE FOGO', 'ESCALANTE'
    ];
    allAdminKeys.forEach(k => {
      next[normalize(k)] = visible;
      next[k] = visible;
    });
    setAdminRolesVisibility(next);
    if (onAdminRolesVisibilityChange) {
      onAdminRolesVisibilityChange(next);
    }
    try {
      const rawObm = obmContext && obmContext !== 'GLOBAL' ? obmContext : (user?.obm || '10º GBM');
      const cleanObm = normalizeObm(rawObm);
      localStorage.setItem(`escala_admin_roles_visibility_${cleanObm}`, JSON.stringify(next));
    } catch {}
  };

  const getAdminRoleMappedKey = (label: string): string => {
    const clean = label.replace(/[:.]/g, '').trim().toUpperCase();
    if (clean.includes('ENCARREGADO')) return 'ENCARREGADO DE MOTORISTA';
    if (clean.includes('FAXINA')) return 'RESP FAXINA';
    if (clean.includes('SGT')) return 'SGT DIA';
    if (clean.includes('CMT')) return 'CMT GUARDA';
    if (clean.includes('DEPOSITO') || clean.includes('DEPÓSITO')) return 'DIA AO DEPOSITO';
    if (clean.includes('ABASTECEDOR')) return 'ABASTECEDOR';
    if (clean.includes('CB DIA') || clean.includes('CB DE DIA')) return 'CB DIA';
    if (clean.includes('CB GUARDA') || clean.includes('CB DA GUARDA')) return 'CB GUARDA';
    if (clean.includes('ADJUNTO')) return 'ADJUNTO';
    if (clean.includes('COMUNICANTE 1')) return 'COMUNICANTE 1';
    if (clean.includes('COMUNICANTE 2')) return 'COMUNICANTE 2';
    if (clean.includes('COMUNICANTE')) return 'COMUNICANTE';
    if (clean.includes('SENTINELA')) return 'SENTINELA';
    if (clean.includes('RANCHO')) return 'AUXILIAR RANCHO';
    if (clean.includes('FOGO')) return 'TOQUE DE FOGO';
    return clean;
  };


  const [expedienteMilitars, setExpedienteMilitars] = useState<any[]>(
    Array.isArray(initialExpedienteMilitars) ? initialExpedienteMilitars : []
  );

  useEffect(() => {
    if (Array.isArray(initialExpedienteMilitars) && initialExpedienteMilitars.length > 0) {
      setExpedienteMilitars(initialExpedienteMilitars);
    }
  }, [initialExpedienteMilitars]);

  // Real-time listener for expediente scale sync
  useEffect(() => {
    if (!selectedDate || !obmContext || obmContext === 'GLOBAL') return;
    try {
      const cleanObm = normalizeObm(obmContext || '10º GBM');
      const normalizedObm = cleanObm.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const monthKey = selectedDate.substring(0, 7);
      const docRef = doc(db, `expediente_${normalizedObm}`, monthKey);
      const globalDocRef = doc(db, 'config', `expediente_global_${normalizedObm}`);

      let globalNames: Record<string, string> = {};
      const unsubGlobal = onSnapshot(globalDocRef, (gSnap) => {
        if (gSnap.exists()) {
          globalNames = gSnap.data().userNames || {};
        }
      });

      const unsub = onSnapshot(docRef, (docSnap) => {
        if (!docSnap.exists()) {
          if (!initialExpedienteMilitars || initialExpedienteMilitars.length === 0) {
            setExpedienteMilitars([]);
          }
          return;
        }
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

          return {
            rg: mil?.rg || rg,
            name,
            warName,
            rank,
            quadro,
            militar: mil || { rg: mil?.rg || rg, name, warName, rank, quadro },
            is24h,
            isExp
          };
        });

        result.sort(sortAllBySeniority);
        setExpedienteMilitars(result);
      });

      return () => {
        unsub();
        unsubGlobal();
      };
    } catch (err) {
      console.error("Erro sincronizando expediente na escala:", err);
    }
  }, [selectedDate, obmContext, militars, afastamentos]);

  useEffect(() => {
    if (propGrdRgs !== undefined && Array.isArray(propGrdRgs) && propGrdRgs.length > 0) {
      setGrdRgs(propGrdRgs);
      return;
    }
    const fetchGrd = async () => {
      if (!selectedDate || !obmContext) return;
      try {
        const dateObj = parseISO(selectedDate);
        const monthKey = format(dateObj, 'yyyy-MM');
        const obmId = (obmContext || '10º GBM').replace(/\//g, '_').replace(/\s/g, '_');
        const docRef = doc(db, 'grd_configs', `${obmId}_${monthKey}`);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          const rgs = data.days?.[selectedDate] || [];
          setGrdRgs(rgs);
        }
      } catch (err) {
        console.error("Erro ao buscar GRD:", err);
      }
    };
    fetchGrd();
  }, [selectedDate, obmContext, propGrdRgs]);

  // Helper to get active viaturas dynamically
  const getActiveVtr = (prefix: string, index: number = 0) => {
     if (!viaturasInfo) return prefix;
     const activeVtrs = viaturasInfo.filter((v: any) => (v.exibir !== undefined ? Boolean(v.exibir) : true) && (prefix === 'AR' ? v.vtr.startsWith('AR-') : v.vtr.startsWith(prefix)));
     if (activeVtrs.length > index) return activeVtrs[index].vtr;
     return `${prefix}-???`; 
  };

  // Identificação robusta e cores temáticas oficiais da Ala (para tela e impressões/PDF)
  const alaTheme = useMemo(() => {
    let alaNum: number | null = null;
    if (identifiedAla !== undefined && identifiedAla !== null && identifiedAla !== '') {
      if (typeof identifiedAla === 'number' && identifiedAla >= 1 && identifiedAla <= 4) {
        alaNum = identifiedAla;
      } else {
        const str = String(identifiedAla).trim().toUpperCase();
        if (str.includes('VERDE') || str === '1' || str === 'ALA 1') alaNum = 1;
        else if (str.includes('VERMELH') || str === '2' || str === 'ALA 2') alaNum = 2;
        else if (str.includes('AZUL') || str === '3' || str === 'ALA 3') alaNum = 3;
        else if (str.includes('AMAREL') || str === '4' || str === 'ALA 4') alaNum = 4;
        else {
          const digits = str.replace(/\D/g, '');
          if (digits) {
            const parsed = parseInt(digits, 10);
            if (parsed >= 1 && parsed <= 4) alaNum = parsed;
          }
        }
      }
    }

    if (!alaNum && selectedDate) {
      try {
        let clean = selectedDate.trim();
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
          const [d, m, y] = clean.split('/');
          clean = `${y}-${m}-${d}`;
        } else if (clean.includes('T')) {
          clean = clean.split('T')[0];
        }
        const d = new Date(`${clean}T12:00:00`);
        if (!isNaN(d.getTime())) {
          alaNum = getAlaForDate(d);
        }
      } catch {}
    }

    if (!alaNum) alaNum = 1;

    switch (alaNum) {
      case 1:
        return {
          num: 1,
          name: 'ALA 1',
          label: 'VERDE',
          bgClass: 'bg-emerald-200',
          bgHex: '#a7f3d0',       // Verde Esmeralda suave
          borderHex: '#6ee7b7',
          textHex: '#000000',
        };
      case 2:
        return {
          num: 2,
          name: 'ALA 2',
          label: 'VERMELHA',
          bgClass: 'bg-rose-200',
          bgHex: '#fecdd3',       // Vermelho / Rosa suave
          borderHex: '#fda4af',
          textHex: '#000000',
        };
      case 3:
        return {
          num: 3,
          name: 'ALA 3',
          label: 'AZUL',
          bgClass: 'bg-blue-200',
          bgHex: '#bfdbfe',       // Azul suave
          borderHex: '#93c5fd',
          textHex: '#000000',
        };
      case 4:
        return {
          num: 4,
          name: 'ALA 4',
          label: 'AMARELA',
          bgClass: 'bg-amber-200',
          bgHex: '#fde68a',       // Amarelo suave idêntico ao modelo
          borderHex: '#fcd34d',
          textHex: '#000000',
        };
      default:
        return {
          num: 1,
          name: 'ALA 1',
          label: 'VERDE',
          bgClass: 'bg-slate-200',
          bgHex: '#e2e8f0',
          borderHex: '#cbd5e1',
          textHex: '#000000',
        };
    }
  }, [identifiedAla, selectedDate]);

  const headerColorClass = alaTheme.bgClass;
  const headerBgStyle = useMemo(() => ({
    backgroundColor: alaTheme.bgHex,
    color: '#000000',
    WebkitPrintColorAdjust: 'exact' as const,
    printColorAdjust: 'exact' as const,
  }), [alaTheme.bgHex]);
  
  // Normalize function names for robust matching
  const normalize = (s: string) => {
    if (!s) return '';
    return s.replace(/[-_]/g, ' ').replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim().toUpperCase();
  };

  // Helpers to get militars by function
  const getByFunc = (funcName: string) => {
    const targetNorm = normalize(funcName);
    return baseRoster.filter((m: any) => {
      const rg = m.rg || '';
      const funcs = selectedFunctions[rg] || [];
      const hasSelectedFunc = funcs.some((f: string) => {
        const fNorm = normalize(f);
        if (fNorm === targetNorm) return true;

        if (targetNorm === 'AUXILIAR RANCHO' && (fNorm === 'AUX RANCHO' || fNorm === 'RANCHO' || fNorm.includes('RANCHO'))) return true;
        if (targetNorm === 'TOQUE DE FOGO' && (fNorm === 'T FOGO' || fNorm === 'TQ FOGO' || fNorm === 'T. FOGO' || fNorm.includes('FOGO'))) return true;
        if (targetNorm === 'SENTINELA' && fNorm.includes('SENTINELA')) return true;
        if (targetNorm === 'COMUNICANTE' && fNorm.includes('COMUNICANTE')) return true;
        if (targetNorm === 'COMUNICANTE 1' && (fNorm === 'COMUNICANTE 1' || fNorm === 'COMUNICANTE')) return true;
        if (targetNorm === 'COMUNICANTE 2' && fNorm === 'COMUNICANTE 2') return true;
        if (targetNorm === 'ENCARREGADO DE MOTORISTA' && (fNorm === 'ENC MOTORISTA' || (fNorm.includes('ENC') && fNorm.includes('MOTORISTA')))) return true;
        if (targetNorm === 'RESP FAXINA' && fNorm.includes('FAXINA')) return true;
        if (targetNorm === 'DIA AO DEPOSITO' && (fNorm.includes('DEPOSITO') || fNorm === 'DEPOSITO')) return true;
        if (targetNorm === 'SGT DIA' && fNorm.includes('SGT') && fNorm.includes('DIA')) return true;
        if (targetNorm === 'CB DIA' && fNorm.includes('CB') && fNorm.includes('DIA')) return true;
        if (targetNorm === 'CB GUARDA' && fNorm.includes('CB') && fNorm.includes('GUARDA')) return true;
        if (targetNorm === 'CMT GUARDA' && fNorm.includes('CMT') && fNorm.includes('GUARDA')) return true;
        if (targetNorm === 'ADJUNTO' && fNorm.includes('ADJUNTO')) return true;
        if (targetNorm === 'ABASTECEDOR' && fNorm.includes('ABASTECEDOR')) return true;

        if (f.trim().toUpperCase() === funcName.trim().toUpperCase()) return true;
        return fNorm.includes(targetNorm) || targetNorm.includes(fNorm);
      });
      if (hasSelectedFunc) return true;
      if ((targetNorm === 'COMUNICANTE' || targetNorm === 'COMUNICANTE 1') && m.ativoComunicante) {
        const otherRoles = funcs.filter((f: string) => !normalize(f).includes('COMUNICANTE'));
        if (otherRoles.length === 0) return true;
      }
      return false;
    }).map((m: any) => {
      const rg = m.rg || '';
      const isSwapped = permutasOut.has(rg);
      const actualMilitar = isSwapped ? (militars.find((x: any) => x.rg === permutasOut.get(rg)?.substituteRg) || m) : m;
      return actualMilitar;
    });
  };

  const renderMilitar = (militar: any) => {
    if (!militar) return '';
    if (showVisualMode) {
      return (
        <div className="flex items-center gap-1">
          <div className="origin-left shrink-0 opacity-80">
            <RankInsignia rankStr={militar.rank} className="w-4 h-4" />
          </div>
          <div className="flex flex-col text-left justify-center min-w-0">
            <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest leading-none mb-[2px] whitespace-nowrap">{formatRankAbbr(militar.rank)}</span>
            <span className="text-[11px] font-black uppercase tracking-tight text-slate-800 leading-none truncate block">{militar.warName?.toUpperCase() || formatMilitaryName(militar.name || "")}</span>
          </div>
        </div>
      );
    }
    return formatRankAndName(militar);
  };

  
  let usedMilitars = new Set<string>();
  const getVtrByPrefix = (prefix: string, index: number = 0) => {
     if (!viaturasInfo) return null;
     const activeVtrs = viaturasInfo.filter((v: any) => (v.exibir !== undefined ? Boolean(v.exibir) : true) && (prefix === 'AR' ? (v.vtr.startsWith('AR-') || v.vtr.startsWith('AR ')) && !v.vtr.startsWith('ARC') : (v.vtr.startsWith(prefix) || v.vtr.includes(prefix))));
     return activeVtrs[index] || null;
  };

  const getSlotName = (v: any, slot: string, defaultName: string) => {
     if (!v) return defaultName;
     if (v.customNames?.[slot]?.trim()) {
        const custom = v.customNames[slot].trim().toUpperCase();
        const sigla = (v.vtr || "").split('-')[0].trim();
        if (custom === 'ENFERMEIRO') return 'ENFERMEIRO';
        if (custom === 'AUXILIAR/CHEFE ARC' || custom === 'AUXILIAR / CHEFE ARC') return 'AUXILIAR/CHEFE ARC';
        if (custom === 'MESTRE L' || custom === 'MESTRE BIA') return custom;
        if (custom.endsWith(sigla)) return custom;
        if (slot === 'cg' && (custom === 'CHEFE' || custom === 'CHEFE DE GUARNIÇÃO' || custom === 'CHEFE GUA')) return `CHEFE ${sigla}`;
        return `${custom} ${sigla}`.trim();
     }
     return defaultName;
  };

  const getVtrSlotMilitar = (v: any, slot: string, defaultName: string, forceRender = false) => {
     if (!forceRender && (!v || v[slot] === false || v.blocked?.includes(slot))) return null;
     const funcName = getSlotName(v, slot, defaultName);
     const rawSigla = (v?.vtr || defaultName || "").split(/[-_\s]/);
     const sigla = rawSigla[0] === 'CHEFE' || rawSigla[0] === 'CONDUTOR' || rawSigla[0] === 'AUXILIAR'
        ? rawSigla[1] || ''
        : rawSigla[0] || '';
     
     // 1. Primary check: exact or normalized slot function name
     const candidates = getByFunc(funcName);
     let unused = candidates.find((m: any) => !usedMilitars.has(m.rg));
     if (unused) {
        usedMilitars.add(unused.rg);
        return unused;
     }

     // 2. Specific Fallbacks for Chefe (cg)
     if (slot === 'cg') {
        // Fallback A: specific "CHEFE <SIGLA>" (e.g. CHEFE ABT, CHEFE ABSL)
        if (sigla) {
           const specificCandidates = getByFunc(`CHEFE ${sigla}`);
           unused = specificCandidates.find((m: any) => !usedMilitars.has(m.rg));
           if (unused) {
              usedMilitars.add(unused.rg);
              return unused;
           }
        }

        // Fallback B: any function with both "CHEFE" and sigla (e.g. CHEFE DA GU ABT, CHEFE DE OPERAÇÃO ABT)
        const anyChefeSigla = baseRoster.filter((m: any) => {
           if (usedMilitars.has(m.rg)) return false;
           const funcs = (selectedFunctions[m.rg] || []).map(normalize);
           return funcs.some(f => f.includes('CHEFE') && (sigla ? f.includes(sigla) : true));
        });
        if (anyChefeSigla.length > 0) {
           const chosen = anyChefeSigla[0];
           const isSwapped = permutasOut.has(chosen.rg);
           const actualMilitar = isSwapped ? (militars.find((x: any) => x.rg === permutasOut.get(chosen.rg)?.substituteRg) || chosen) : chosen;
           usedMilitars.add(chosen.rg);
           return actualMilitar;
        }

        // Fallback C: generic CHEFE GUA / CHEFE DE GU / CHEFE GUARNIÇÃO / CHEFE
        const genericChefe = baseRoster.filter((m: any) => {
           if (usedMilitars.has(m.rg)) return false;
           const funcs = (selectedFunctions[m.rg] || []).map(normalize);
           return funcs.some(f => f === 'CHEFE GUA' || f === 'CHEFE DE GU' || f === 'CHEFE GUARNIÇÃO' || f === 'CHEFE' || f === 'CHEFE GUA ABT' || f === 'CHEFE GUA ABSL');
        });
        if (genericChefe.length > 0) {
           // If slot is ABT, prefer militar with chefeAbt: true if available
           if (sigla === 'ABT') {
              const pref = genericChefe.find((m: any) => m.chefeAbt);
              if (pref) {
                 const isSwapped = permutasOut.has(pref.rg);
                 const actualMilitar = isSwapped ? (militars.find((x: any) => x.rg === permutasOut.get(pref.rg)?.substituteRg) || pref) : pref;
                 usedMilitars.add(pref.rg);
                 return actualMilitar;
              }
           } else if (sigla === 'ABSL') {
              const pref = genericChefe.find((m: any) => m.chefeAbsl);
              if (pref) {
                 const isSwapped = permutasOut.has(pref.rg);
                 const actualMilitar = isSwapped ? (militars.find((x: any) => x.rg === permutasOut.get(pref.rg)?.substituteRg) || pref) : pref;
                 usedMilitars.add(pref.rg);
                 return actualMilitar;
              }
           }
           const chosen = genericChefe[0];
           const isSwapped = permutasOut.has(chosen.rg);
           const actualMilitar = isSwapped ? (militars.find((x: any) => x.rg === permutasOut.get(chosen.rg)?.substituteRg) || chosen) : chosen;
           usedMilitars.add(chosen.rg);
           return actualMilitar;
        }
     }

     // 3. Fallbacks for Condutor
     if (slot === 'condutor') {
        if (sigla) {
           const condutorSigla = getByFunc(`CONDUTOR ${sigla}`);
           unused = condutorSigla.find((m: any) => !usedMilitars.has(m.rg));
           if (unused) {
              usedMilitars.add(unused.rg);
              return unused;
           }
        }
        if (sigla === 'L' || sigla === 'BIA' || v?.maritima) {
           const mestreGeneric = getByFunc(sigla === 'BIA' ? 'MESTRE BIA' : 'MESTRE L');
           unused = mestreGeneric.find((m: any) => !usedMilitars.has(m.rg));
           if (unused) {
              usedMilitars.add(unused.rg);
              return unused;
           }
           const anyMaritimo = baseRoster.filter((m: any) => {
              if (usedMilitars.has(m.rg)) return false;
              const funcs = (selectedFunctions[m.rg] || []).map(normalize);
              return funcs.some(f => f.includes('MESTRE') || f.includes('MARITIMO'));
           });
           if (anyMaritimo.length > 0) {
              const chosen = anyMaritimo[0];
              const isSwapped = permutasOut.has(chosen.rg);
              const actualMilitar = isSwapped ? (militars.find((x: any) => x.rg === permutasOut.get(chosen.rg)?.substituteRg) || chosen) : chosen;
              usedMilitars.add(chosen.rg);
              return actualMilitar;
           }
        }
     }

     // 4. Fallbacks for Auxiliar (g1..g4)
     if (slot.startsWith('g')) {
        if (sigla) {
           const auxSigla = getByFunc(`AUXILIAR ${sigla}`);
           unused = auxSigla.find((m: any) => !usedMilitars.has(m.rg));
           if (unused) {
              usedMilitars.add(unused.rg);
              return unused;
           }
        }
        if (sigla === 'L' || sigla === 'BIA' || v?.maritima) {
           const marinheiroGeneric = getByFunc(sigla === 'BIA' ? 'MARINHEIRO BIA' : 'MARINHEIRO L');
           unused = marinheiroGeneric.find((m: any) => !usedMilitars.has(m.rg));
           if (unused) {
              usedMilitars.add(unused.rg);
              return unused;
           }
           const anyMarinheiro = baseRoster.filter((m: any) => {
              if (usedMilitars.has(m.rg)) return false;
              const funcs = (selectedFunctions[m.rg] || []).map(normalize);
              return funcs.some(f => f.includes('MARINHEIRO') || f.includes('MARITIMO') || f.includes('GV AMA') || f.includes('OP AMA'));
           });
           if (anyMarinheiro.length > 0) {
              const chosen = anyMarinheiro[0];
              const isSwapped = permutasOut.has(chosen.rg);
              const actualMilitar = isSwapped ? (militars.find((x: any) => x.rg === permutasOut.get(chosen.rg)?.substituteRg) || chosen) : chosen;
              usedMilitars.add(chosen.rg);
              return actualMilitar;
           }
        }
     }

     return null;
  };

  const renderVtrSlot = (v: any, slot: string, defaultName: string, fallbackLabel: string, forceRender = false, invisible = false) => {
     if (!forceRender && (!v || v[slot] === false || v.blocked?.includes(slot))) return null;
     const m = getVtrSlotMilitar(v, slot, defaultName, forceRender);
     // Shorten label if it's too long, or just use fallbackLabel
     const displayLabel = v?.customNames?.[slot]?.trim() ? v.customNames[slot].trim().substring(0, 15) : fallbackLabel;
     
     return (
       <div className={`flex gap-1 items-start min-h-[20px] ${invisible ? 'opacity-0' : ''}`}>
         <span className="font-bold shrink-0 pt-[1px]">{displayLabel}:</span> 
         <span className="leading-[1.1]">{renderMilitar(m)}</span>
       </div>
     );
  };


  const com1List = getByFunc('COMUNICANTE 1');
  const com2List = getByFunc('COMUNICANTE 2');
  const generalComList = getByFunc('COMUNICANTE');

  let com1Militar = com1List[0];
  let com2Militar = com2List[0];

  if (!com1Militar && generalComList.length > 0) {
    com1Militar = generalComList[0];
  }
  if (!com2Militar) {
    const remaining = generalComList.filter(m => (m.rg || m.id) !== (com1Militar?.rg || com1Militar?.id));
    if (remaining.length > 0) {
      com2Militar = remaining[0];
    }
  }

  const comunicantes = [
    ...(com1Militar ? [com1Militar] : []),
    ...(com2Militar ? [com2Militar] : []),
  ];
  const auxRancho = getByFunc('AUXILIAR RANCHO');
  const toqueFogo = getByFunc('TOQUE DE FOGO');
  const sentinelas = getByFunc('SENTINELA');

  const adminRoles = {
    'ADJUNTO:': getByFunc('ADJUNTO'),
    'ENCARREGADO DE MOTORIS:': getByFunc('ENCARREGADO DE MOTORISTA'),
    'RESP. P/ FAXINA:': getByFunc('RESP FAXINA'),
    'SGT DE DIA:': getByFunc('SGT DIA'),
    'CMT DA GUARDA:': getByFunc('CMT GUARDA'),
  };

  const adminRolesRight = [
    { label: 'DIA AO DEPÓSITO:', value: getByFunc('DIA AO DEPOSITO')[0] },
    { label: 'DIA AO DEPÓSITO:', value: getByFunc('DIA AO DEPOSITO')[1] },
    { label: 'ABASTECEDOR:', value: getByFunc('ABASTECEDOR')[0] },
    { label: 'CB DE DIA:', value: getByFunc('CB DIA')[0] },
    { label: 'CB DA GUARDA:', value: getByFunc('CB GUARDA')[0] },
  ];

  const safeDateObj = useMemo(() => {
    if (!selectedDate || typeof selectedDate !== 'string') return new Date();
    try {
      let clean = selectedDate.trim();
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
        const [d, m, y] = clean.split('/');
        clean = `${y}-${m}-${d}`;
      } else if (clean.includes('T')) {
        clean = clean.split('T')[0];
      }
      const d = new Date(`${clean}T12:00:00`);
      return isNaN(d.getTime()) ? new Date() : d;
    } catch {
      return new Date();
    }
  }, [selectedDate]);

  const dateStr = selectedDate ? format(safeDateObj, "dd 'DE' MMMM 'DE' yyyy", { locale: ptBR }).toUpperCase() : '';
  const shortDateStr = selectedDate ? format(safeDateObj, "dd/MM/yyyy") : '';

  const renderInativaMsg = (customLabel?: string) => (
     <div className="flex flex-col items-center justify-center text-center font-bold text-slate-600 px-1 py-1.5 leading-tight opacity-75 my-auto">
        <span className="text-[9.5px] uppercase tracking-wider font-extrabold text-slate-700">{customLabel || "INATIVA NO SERVIÇO"}</span>
        {shortDateStr && (
           <span className="text-[8px] opacity-75 font-semibold mt-0.5">({shortDateStr})</span>
        )}
     </div>
  );

  // Get active members list
  const activeMembersList = useMemo(() => {
    return (baseRoster || []).map((m: any) => {
      const rg = m.rg || '';
      const isSwapped = permutasOut?.has(rg);
      const actualMilitar = isSwapped ? (militars?.find((x: any) => x.rg === permutasOut.get(rg)?.substituteRg) || m) : m;
      return {
        rg: actualMilitar?.rg || rg,
        militar: actualMilitar || m,
        label: formatRankAndName(actualMilitar)
      };
    }).sort((a: any, b: any) => sortAllBySeniority(a.militar, b.militar));
  }, [baseRoster, permutasOut, militars]);

  const permutasAtivas = Array.from(permutasOut.values()).map((p: any) => {
     const sub = militars.find((x:any) => x.rg === p.substituteRg);
     const req = militars.find((x:any) => x.rg === p.requesterRg);
     return { req, sub, text: `Sai: ${formatRankAndName(req)} - Entra: ${formatRankAndName(sub)}` };
  });

  // Gerador de documento HTML isolado com cores da ala preservadas para impressão e PDF
  const generatePrintHtml = () => {
    try {
      const sheetEl = document.getElementById("escala-print-sheet");
      if (!sheetEl) return null;

      // Coleta todas as regras CSS processadas da página
      let collectedCss = '';
      try {
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            if (sheet.cssRules) {
              for (const rule of Array.from(sheet.cssRules)) {
                collectedCss += rule.cssText + '\n';
              }
            }
          } catch {}
        }
      } catch {}

      // Converte links de folhas de estilo para URLs absolutas para funcionamento garantido em Blob/about:blank
      const linkTags = Array.from(document.querySelectorAll("link[rel='stylesheet']"))
        .map(node => {
          const href = (node as HTMLLinkElement).href;
          return `<link rel="stylesheet" href="${href}" />`;
        })
        .join("\n");

      // Clonar e limpar controles interativos exclusivos da tela
      const clone = sheetEl.cloneNode(true) as HTMLElement;
      const hiddenEls = clone.querySelectorAll(".print\\:hidden, [class*='print:hidden']");
      hiddenEls.forEach(el => el.remove());

      // Forçar atributos inline de cor exata e print-color-adjust em todos os cabeçalhos de ala
      const alaElements = clone.querySelectorAll(".escala-ala-header, ." + alaTheme.bgClass);
      alaElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.backgroundColor = alaTheme.bgHex;
        htmlEl.style.color = '#000000';
        htmlEl.style.setProperty('-webkit-print-color-adjust', 'exact', 'important');
        htmlEl.style.setProperty('print-color-adjust', 'exact', 'important');
      });

      return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Escala de Serviço 24h - ${dateStr || shortDateStr}</title>
  ${linkTags}
  <style>
    ${collectedCss}
  </style>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 6mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      background: white !important;
      color: black !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .print\\:hidden, [class*="print:hidden"] {
      display: none !important;
    }
    /* Estilos definitivos para impressão das cores oficiais da Ala */
    .escala-ala-header {
      background-color: ${alaTheme.bgHex} !important;
      color: #000000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .bg-emerald-200 {
      background-color: #a7f3d0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .bg-rose-200 {
      background-color: #fecdd3 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .bg-blue-200, .bg-sky-200 {
      background-color: #bfdbfe !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .bg-amber-200, .bg-yellow-200 {
      background-color: #fde68a !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .bg-slate-200 {
      background-color: #e2e8f0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .bg-slate-50 {
      background-color: #f8fafc !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .bg-white {
      background-color: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
  </style>
</head>
<body class="bg-white text-black p-2">
  <div class="max-w-[1200px] mx-auto bg-white relative text-black font-sans text-[11px] leading-tight flex flex-col">
    ${clone.innerHTML}
  </div>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 350);
    });
  </script>
</body>
</html>`;
    } catch (e) {
      console.warn("Erro ao gerar HTML de impressão:", e);
      return null;
    }
  };

  // Pré-gera o link "Abrir para Imprimir" para estar sempre disponível com as cores da Ala
  useEffect(() => {
    const timer = setTimeout(() => {
      const html = generatePrintHtml();
      if (html) {
        try {
          const blob = new Blob([html], { type: "text/html;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          setPrintFallbackUrl(url);
        } catch (e) {
          console.warn("Blob generation error:", e);
        }
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [selectedDate, identifiedAla, baseRoster, viaturasInfo, isSigned, showVisualMode, alaTheme, officerVisibility, adminRolesVisibility]);

  const handlePrintEscala = () => {
    const fullHtml = generatePrintHtml();

    // 1. Atualiza Blob URL para o link manual "Abrir para Imprimir"
    if (fullHtml) {
      try {
        const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        setPrintFallbackUrl(url);
      } catch (e) {
        console.warn("Blob generation error:", e);
      }
    }

    // 2. Tentar abrir diretamente em nova janela (desbloqueia print nativo do navegador em alta fidelidade de cores)
    let winOpened = false;
    if (fullHtml) {
      try {
        const printWin = window.open("", "_blank");
        if (printWin) {
          printWin.document.open();
          printWin.document.write(fullHtml);
          printWin.document.close();
          winOpened = true;
        }
      } catch (err) {
        console.warn("window.open falhou:", err);
      }
    }

    // 3. Se janela não pôde ser aberta (ex: restrição do sandbox do iframe), acionar print da janela atual
    if (!winOpened) {
      try {
        window.print();
      } catch (e) {
        console.warn("window.print() direto não pôde ser executado:", e);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-800/80 z-[200] overflow-y-auto print:absolute print:inset-0 print:bg-white print:z-[9999] print:block">
      <div id="escala-print-sheet" className="max-w-[1200px] mx-auto bg-white min-h-screen my-8 print:my-0 shadow-2xl print:shadow-none print:w-full print:max-w-none relative p-8 print:p-0 text-black font-sans text-[11px] leading-tight flex flex-col">
        {/* Estilo embutido para garantir preservação exata da cor da Ala na impressão direta */}
        <style>{`
          @media print {
            *, *::before, *::after {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            #escala-print-sheet {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .escala-ala-header {
              background-color: ${alaTheme.bgHex} !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          }
        `}</style>
        
        {/* Actions - hidden in print */}
        <div className="absolute top-4 right-4 flex items-center gap-2 print:hidden flex-wrap justify-end">
           <button
             type="button"
             onClick={() => setShowLogoModal(true)}
             className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
             title="Carregar ou alterar as fotos/logos do 10º GBM e CBA VII"
           >
             <Shield className="w-4 h-4 text-amber-700" />
             <span>Brasões (Fotos)</span>
           </button>
           <button type="button" onClick={() => setShowVisualMode(!showVisualMode)} className="bg-slate-200 text-slate-800 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-300 cursor-pointer">
             <ImageIcon className="w-4 h-4" /> {showVisualMode ? 'Modo Texto' : 'Modo Visual'}
           </button>
           {/* Seletor/Menu de Funções dos Oficiais */}
           <div className="relative" ref={officerMenuRef}>
             <button
               type="button"
               onClick={() => setShowOfficerMenu(!showOfficerMenu)}
               className={cn(
                 "border px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs text-xs",
                 hasAnyVisibleOfficer
                   ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                   : "bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300"
               )}
               title="Ativar ou desativar o aparecimento das funções dos oficiais no arquivo de escala"
             >
               {hasAnyVisibleOfficer ? (
                 <Shield className="w-4 h-4 text-indigo-700" />
               ) : (
                 <EyeOff className="w-4 h-4 text-rose-600" />
               )}
               <span>Oficiais ({activeOfficerCount}/3)</span>
               <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
             </button>

             {showOfficerMenu && (
               <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-300 rounded-xl shadow-2xl p-3 z-50 text-left">
                 <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                   <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                     Funções dos Oficiais
                   </span>
                   <button
                     type="button"
                     onClick={() => setAllOfficersVisibility(!hasAnyVisibleOfficer)}
                     className="text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-800 cursor-pointer underline"
                   >
                     {hasAnyVisibleOfficer ? "Desativar Todos" : "Ativar Todos"}
                   </button>
                 </div>

                 <div className="space-y-1.5">
                   <label className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                     <span className="text-[11px] font-bold text-slate-800">Oficial de Dia</span>
                     <input
                       type="checkbox"
                       checked={isDiaVisible}
                       onChange={() => toggleOfficerVisibility('showOficialDia')}
                       className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                     />
                   </label>

                   <label className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                     <span className="text-[11px] font-bold text-slate-800">Oficial da Náutica</span>
                     <input
                       type="checkbox"
                       checked={isNauticaVisible}
                       onChange={() => toggleOfficerVisibility('showOficialNautica')}
                       className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                     />
                   </label>

                   <label className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                     <span className="text-[11px] font-bold text-slate-800">Oficial Médico</span>
                     <input
                       type="checkbox"
                       checked={isMedicoVisible}
                       onChange={() => toggleOfficerVisibility('showOficialMedico')}
                       className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                     />
                   </label>
                 </div>

                 <div className="pt-2 border-t border-slate-100 mt-2">
                   <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 block mb-1.5">
                     Estilo da Tabela
                   </span>
                   <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                     <button
                       type="button"
                       onClick={() => setOfficerTableLayout('colunas')}
                       className={cn(
                         "py-1 rounded-md transition-all cursor-pointer text-center",
                         officerTableLayout === 'colunas'
                           ? "bg-white text-indigo-700 shadow-2xs font-black"
                           : "text-slate-600 hover:text-slate-900"
                       )}
                     >
                       3 Colunas
                     </button>
                     <button
                       type="button"
                       onClick={() => setOfficerTableLayout('linhas')}
                       className={cn(
                         "py-1 rounded-md transition-all cursor-pointer text-center",
                         officerTableLayout === 'linhas'
                           ? "bg-white text-indigo-700 shadow-2xs font-black"
                           : "text-slate-600 hover:text-slate-900"
                       )}
                     >
                       Linhas
                     </button>
                   </div>
                 </div>

                 <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-500 font-medium">
                   <span>Salvo no Gerar Escala</span>
                   <button
                     type="button"
                     onClick={() => setShowOfficerMenu(false)}
                     className="text-slate-700 font-bold hover:underline"
                   >
                     Fechar
                   </button>
                 </div>
               </div>
             )}
           </div>

           {/* Seletor/Menu de Funções Administrativas */}
           <div className="relative" ref={adminMenuRef}>
             <button
               type="button"
               onClick={() => setShowAdminMenu(!showAdminMenu)}
               className="border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs text-xs"
               title="Ativar ou desativar o aparecimento das funções administrativas no arquivo de escala"
             >
               <Printer className="w-4 h-4 text-slate-600" />
               <span>Funções Admin</span>
               <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
             </button>

             {showAdminMenu && (
               <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-slate-300 rounded-xl shadow-2xl p-3 z-50 text-left max-h-[420px] overflow-y-auto">
                 <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                   <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                     Funções Administrativas
                   </span>
                   <div className="flex items-center gap-1.5">
                     <button
                       type="button"
                       onClick={() => setAllAdminRolesVisibility(true)}
                       className="text-[9px] font-black uppercase text-emerald-600 hover:text-emerald-800 cursor-pointer underline"
                     >
                       Ativar
                     </button>
                     <span className="text-slate-300 text-xs">/</span>
                     <button
                       type="button"
                       onClick={() => setAllAdminRolesVisibility(false)}
                       className="text-[9px] font-black uppercase text-rose-600 hover:text-rose-800 cursor-pointer underline"
                     >
                       Ocultar
                     </button>
                   </div>
                 </div>

                 <div className="space-y-1">
                   {[
                     { key: 'ADJUNTO', label: 'Adjunto' },
                     { key: 'ENCARREGADO DE MOTORISTA', label: 'Encarregado de Motoristas' },
                     { key: 'RESP FAXINA', label: 'Resp. Faxina' },
                     { key: 'SGT DIA', label: 'Sargento de Dia' },
                     { key: 'CMT GUARDA', label: 'Comandante da Guarda' },
                     { key: 'DIA AO DEPOSITO', label: 'Dia ao Depósito' },
                     { key: 'ABASTECEDOR', label: 'Abastecedor' },
                     { key: 'CB DIA', label: 'Cabo de Dia' },
                     { key: 'CB GUARDA', label: 'Cabo da Guarda' },
                     { key: 'COMUNICANTE 1', label: 'Comunicante 1' },
                     { key: 'COMUNICANTE 2', label: 'Comunicante 2' },
                     { key: 'SENTINELA', label: 'Sentinelas' },
                     { key: 'AUXILIAR RANCHO', label: 'Auxiliar Rancho' },
                     { key: 'TOQUE DE FOGO', label: 'Toque de Fogo' },
                   ].map(item => {
                     const isVis = isAdminRoleVisible(item.key);
                     return (
                       <label
                         key={item.key}
                         className="flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer"
                       >
                         <span className="text-[11px] font-bold text-slate-800">{item.label}</span>
                         <input
                           type="checkbox"
                           checked={isVis}
                           onChange={() => toggleAdminRoleVisibility(item.key)}
                           className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                         />
                       </label>
                     );
                   })}
                 </div>

                 <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-500 font-medium">
                   <span>Salvo no Gerar Escala</span>
                   <button
                     type="button"
                     onClick={() => setShowAdminMenu(false)}
                     className="text-slate-700 font-bold hover:underline"
                   >
                     Fechar
                   </button>
                 </div>
               </div>
             )}
           </div>

           <button type="button" onClick={() => setIsSigned(true)} disabled={isSigned} className="bg-amber-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-amber-400 cursor-pointer">
             <PenTool className="w-4 h-4" /> {isSigned ? 'Assinado' : 'Assinar'}
           </button>
           <button type="button" onClick={async () => {
             setIsRegistering(true);
             if (onRegister) await onRegister({ isSigned });
             setIsRegistering(false);
           }} disabled={isRegistering} className="bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-500 cursor-pointer">
             <Save className="w-4 h-4" /> Registrar
           </button>
           <button
             type="button"
             onClick={handlePrintEscala}
             className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
             title="Imprimir ou Salvar Escala de Serviço em PDF"
           >
             <Printer className="w-4 h-4" /> Imprimir
           </button>
           {printFallbackUrl && (
             <a
               href={printFallbackUrl}
               target="_blank"
               rel="noopener noreferrer"
               className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs shadow-sm"
               title="Clique para abrir a escala em nova aba e imprimir/salvar em PDF"
             >
               <ExternalLink className="w-3.5 h-3.5" /> Abrir para Imprimir
             </a>
           )}
           <button type="button" onClick={onClose} className="bg-slate-200 text-slate-800 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-300 cursor-pointer">
             <X className="w-4 h-4" /> Fechar
           </button>
        </div>

        {/* HEADER */}
        <div className="flex flex-col w-full mb-2 border-b border-black mt-8 print:mt-0 text-center justify-between">
           <div className="flex flex-col w-full">
                 <div className="flex items-start justify-between w-full mt-0 mb-1 px-2 sm:px-5 print:px-3 pl-3 sm:pl-5">
                    {/* Lado esquerdo: Décimo GBM na linha do topo */}
                    <div
                      onClick={() => setShowLogoModal(true)}
                      className="w-20 h-24 sm:w-24 sm:h-28 print:w-[86px] print:h-[102px] flex items-start justify-center shrink-0 cursor-pointer relative group rounded-sm hover:outline hover:outline-1 hover:outline-red-400 transition-transform hover:scale-102 mr-2 sm:mr-4 pt-0"
                      title="10º GBM - Clique para carregar ou alterar esta imagem"
                    >
                       <LogoDecimoGbm className="w-full h-full object-contain object-top max-h-[92px] sm:max-h-[105px] print:max-h-[96px]" allowUpload={true} />
                    </div>

                    {/* Centro: Cabeçalho Oficial unificado com o texto da Escala */}
                    <div className="font-bold flex flex-col justify-start items-center text-center px-1 flex-1 leading-tight -mt-0.5 sm:-mt-1 pt-0">
                       <div className="text-[13px] sm:text-[14px] flex flex-col justify-start items-center text-center tracking-tight leading-tight">
                          <span>CORPO DE BOMBEIROS MILITAR DO ESTADO DO RIO DE JANEIRO</span>
                          <span>COMANDO DE BOMBEIROS DA COSTA VERDE</span>
                          <span>DÉCIMO GRUPAMENTO DE BOMBEIRO MILITAR-ANGRA DOS REIS</span>
                       </div>
                       
                       {/* Texto da Escala integrado como parte do cabeçalho */}
                       <div className="flex justify-center items-center gap-2 text-sm sm:text-base font-bold mt-2 sm:mt-2.5 tracking-tight">
                          <span>ESCALA DE SERVIÇO PARA O DIA:</span>
                          <span>{dateStr}</span>
                       </div>
                    </div>

                    {/* Lado direito: CBA7 na linha do topo */}
                    <div
                      onClick={() => setShowLogoModal(true)}
                      className="w-20 h-24 sm:w-24 sm:h-28 print:w-[86px] print:h-[102px] flex items-start justify-center shrink-0 cursor-pointer relative group rounded-sm hover:outline hover:outline-1 hover:outline-emerald-400 transition-transform hover:scale-102 ml-2 sm:ml-4 pt-0"
                      title="CBA VII - Clique para carregar ou alterar esta imagem"
                    >
                       <LogoCbaSete className="w-full h-full object-contain object-top max-h-[92px] sm:max-h-[105px] print:max-h-[96px]" allowUpload={true} />
                    </div>
                 </div>
              </div>

              {/* OFICIAIS TABLE (ESTRUTURA ESTILO TABELA) */}
              {officerTableLayout === 'linhas' ? (
                <table className="w-full border-collapse border-t border-black table-fixed text-xs select-none">
                  <tbody>
                    <tr className="border-b border-black group/officer-row h-[20px]">
                      <td
                        className={cn("w-[42%] sm:w-[38%] border-r border-black px-2.5 py-0.5 font-bold uppercase text-[9.5px] sm:text-[10.5px] text-left escala-ala-header", headerColorClass)}
                        style={headerBgStyle}
                      >
                        <div className="flex items-center justify-between">
                          <span>OFICIAL DE DIA E PRONTIDÃO:</span>
                          <button
                            type="button"
                            onClick={() => toggleOfficerVisibility('showOficialDia')}
                            className="print:hidden opacity-0 group-hover/officer-row:opacity-100 hover:opacity-100 text-slate-700 hover:text-rose-700 transition-opacity p-0.5 rounded cursor-pointer"
                            title={isDiaVisible ? "Desativar Oficial de Dia" : "Ativar Oficial de Dia"}
                          >
                            {isDiaVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-0.5 font-bold uppercase text-[11px] sm:text-xs text-left">
                        {isDiaVisible ? (
                          oficialDia ? <span className="font-black underline">{oficialDia}</span> : <span className="text-slate-400 font-normal italic text-[10px] select-none">-</span>
                        ) : (
                          <span className="opacity-0 select-none">&nbsp;</span>
                        )}
                      </td>
                    </tr>
                    <tr className="border-b border-black group/officer-row h-[20px]">
                      <td
                        className={cn("w-[42%] sm:w-[38%] border-r border-black px-2.5 py-0.5 font-bold uppercase text-[9.5px] sm:text-[10.5px] text-left escala-ala-header", headerColorClass)}
                        style={headerBgStyle}
                      >
                        <div className="flex items-center justify-between">
                          <span>OFICIAL DA NÁUTICA:</span>
                          <button
                            type="button"
                            onClick={() => toggleOfficerVisibility('showOficialNautica')}
                            className="print:hidden opacity-0 group-hover/officer-row:opacity-100 hover:opacity-100 text-slate-700 hover:text-rose-700 transition-opacity p-0.5 rounded cursor-pointer"
                            title={isNauticaVisible ? "Desativar Oficial da Náutica" : "Ativar Oficial da Náutica"}
                          >
                            {isNauticaVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-0.5 font-bold uppercase text-[11px] sm:text-xs text-left">
                        {isNauticaVisible ? (
                          oficialNautica ? <span className="font-black underline">{oficialNautica}</span> : <span className="text-slate-400 font-normal italic text-[10px] select-none">-</span>
                        ) : (
                          <span className="opacity-0 select-none">&nbsp;</span>
                        )}
                      </td>
                    </tr>
                    <tr className="group/officer-row h-[20px]">
                      <td
                        className={cn("w-[42%] sm:w-[38%] border-r border-black px-2.5 py-0.5 font-bold uppercase text-[9.5px] sm:text-[10.5px] text-left escala-ala-header", headerColorClass)}
                        style={headerBgStyle}
                      >
                        <div className="flex items-center justify-between">
                          <span>OFICIAL MÉDICO:</span>
                          <button
                            type="button"
                            onClick={() => toggleOfficerVisibility('showOficialMedico')}
                            className="print:hidden opacity-0 group-hover/officer-row:opacity-100 hover:opacity-100 text-slate-700 hover:text-rose-700 transition-opacity p-0.5 rounded cursor-pointer"
                            title={isMedicoVisible ? "Desativar Oficial Médico" : "Ativar Oficial Médico"}
                          >
                            {isMedicoVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-0.5 font-bold uppercase text-[11px] sm:text-xs text-left">
                        {isMedicoVisible ? (
                          oficialMedico ? <span className="font-black underline">{oficialMedico}</span> : <span className="text-slate-400 font-normal italic text-[10px] select-none">-</span>
                        ) : (
                          <span className="opacity-0 select-none">&nbsp;</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                /* DEFAULT: TABELA EM 3 COLUNAS LADO A LADO */
                <table className="w-full border-collapse border-t border-black table-fixed text-xs select-none">
                  <thead>
                    <tr
                      className={cn("font-bold border-b border-black text-center text-[9.5px] sm:text-[11px] uppercase tracking-tight escala-ala-header", headerColorClass)}
                      style={headerBgStyle}
                    >
                      <th className="border-r border-black py-1 px-1.5 w-[34%] escala-ala-header relative group/officer-col">
                        <div className="flex items-center justify-center relative">
                          <span className="truncate">OFICIAL DE DIA E PRONTIDÃO</span>
                          <button
                            type="button"
                            onClick={() => toggleOfficerVisibility('showOficialDia')}
                            className="print:hidden opacity-0 group-hover/officer-col:opacity-100 hover:opacity-100 text-slate-700 hover:text-rose-700 transition-opacity p-0.5 rounded cursor-pointer absolute right-0"
                            title={isDiaVisible ? "Desativar Oficial de Dia" : "Ativar Oficial de Dia"}
                          >
                            {isDiaVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </th>
                      <th className="border-r border-black py-1 px-1.5 w-[33%] escala-ala-header relative group/officer-col">
                        <div className="flex items-center justify-center relative">
                          <span className="truncate">OFICIAL DA NÁUTICA</span>
                          <button
                            type="button"
                            onClick={() => toggleOfficerVisibility('showOficialNautica')}
                            className="print:hidden opacity-0 group-hover/officer-col:opacity-100 hover:opacity-100 text-slate-700 hover:text-rose-700 transition-opacity p-0.5 rounded cursor-pointer absolute right-0"
                            title={isNauticaVisible ? "Desativar Oficial da Náutica" : "Ativar Oficial da Náutica"}
                          >
                            {isNauticaVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </th>
                      <th className="py-1 px-1.5 w-[33%] escala-ala-header relative group/officer-col">
                        <div className="flex items-center justify-center relative">
                          <span className="truncate">OFICIAL MÉDICO</span>
                          <button
                            type="button"
                            onClick={() => toggleOfficerVisibility('showOficialMedico')}
                            className="print:hidden opacity-0 group-hover/officer-col:opacity-100 hover:opacity-100 text-slate-700 hover:text-rose-700 transition-opacity p-0.5 rounded cursor-pointer absolute right-0"
                            title={isMedicoVisible ? "Desativar Oficial Médico" : "Ativar Oficial Médico"}
                          >
                            {isMedicoVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-center font-bold text-xs uppercase h-7 sm:h-8">
                      <td className="border-r border-black py-1 px-1.5 align-middle">
                        {isDiaVisible ? (
                          oficialDia ? <span className="font-black underline tracking-tight">{oficialDia}</span> : <span className="text-slate-400 font-normal italic text-[10px] select-none">-</span>
                        ) : (
                          <span className="opacity-0 select-none">&nbsp;</span>
                        )}
                      </td>
                      <td className="border-r border-black py-1 px-1.5 align-middle">
                        {isNauticaVisible ? (
                          oficialNautica ? <span className="font-black underline tracking-tight">{oficialNautica}</span> : <span className="text-slate-400 font-normal italic text-[10px] select-none">-</span>
                        ) : (
                          <span className="opacity-0 select-none">&nbsp;</span>
                        )}
                      </td>
                      <td className="py-1 px-1.5 align-middle">
                        {isMedicoVisible ? (
                          oficialMedico ? <span className="font-black underline tracking-tight">{oficialMedico}</span> : <span className="text-slate-400 font-normal italic text-[10px] select-none">-</span>
                        ) : (
                          <span className="opacity-0 select-none">&nbsp;</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
        </div>

        {/* VIATURAS TABLE */}
        {(() => {
          usedMilitars.clear();
          const displayedVtrs = (viaturasInfo || []).filter((v: any) => v.exibir !== undefined ? Boolean(v.exibir) : true);
          if (displayedVtrs.length === 0) return null;

          const getVtrEspaco = (v: any): '1' | '1/2' | '1/3' => {
            if (v.espaco === '1/3' || v.espaco === '1/2' || v.espaco === '1') return v.espaco;
            const name = (v.vtr || '').toUpperCase();
            if (v.maritima || name.startsWith('L-') || name.startsWith('L ') || name.startsWith('BIA')) return '1/3';
            if (name.startsWith('AR-') || name.startsWith('AR ') || name.startsWith('ARC-') || name.startsWith('ARC ') || name === 'AR' || name === 'ARC') return '1/2';
            return '1';
          };

          type VtrColumn = 
            | { type: 'full'; vtr: any }
            | { type: 'pair'; top: any; bottom: any }
            | { type: 'trio'; items: any[] }
            | { type: 'half'; vtr: any };

          const columns: VtrColumn[] = [];

          // Agrupamento de viaturas inativas que compartilham o mesmo espaço configurado (1/3 ou 1/2):
          // Viaturas com 1/3 (ex: BIA-006 e BIA-013) ocupam O MESMO ESPAÇO de 1/3 com a mensagem inativa,
          // mantendo a configuração "como era" em 1/3 no trio em vez de virar 1 bloco inteiro.
          const inactiveThirds = displayedVtrs.filter((v: any) => !v.ativa && getVtrEspaco(v) === '1/3');
          const mergedInactiveThird = inactiveThirds.length >= 2 ? {
             id: 'merged_inactive_' + inactiveThirds.map((v: any) => v.id).join('_'),
             vtr: inactiveThirds.map((v: any) => v.vtr).join(' / '),
             ativa: false,
             exibir: true,
             espaco: '1/3' as const,
             isMergedInactive: true,
             items: inactiveThirds
          } : null;

          const inactiveHalves = displayedVtrs.filter((v: any) => !v.ativa && getVtrEspaco(v) === '1/2');
          const mergedInactiveHalf = inactiveHalves.length >= 2 ? {
             id: 'merged_inactive_' + inactiveHalves.map((v: any) => v.id).join('_'),
             vtr: inactiveHalves.map((v: any) => v.vtr).join(' / '),
             ativa: false,
             exibir: true,
             espaco: '1/2' as const,
             isMergedInactive: true,
             items: inactiveHalves
          } : null;

          // Group 1/2 viaturas into pairs
          const halfPool: any[] = [];
          displayedVtrs.forEach((v: any) => {
            if (getVtrEspaco(v) === '1/2') {
              if (!v.ativa && mergedInactiveHalf) {
                if (!halfPool.some((x: any) => x.id === mergedInactiveHalf.id)) {
                  halfPool.push(mergedInactiveHalf);
                }
              } else {
                halfPool.push(v);
              }
            }
          });

          const halfPairs: Array<{ top: any; bottom: any } | { vtr: any }> = [];
          for (let i = 0; i < halfPool.length; i += 2) {
            if (i + 1 < halfPool.length) {
              halfPairs.push({ top: halfPool[i], bottom: halfPool[i + 1] });
            } else {
              halfPairs.push({ vtr: halfPool[i] });
            }
          }

          // Group 1/3 viaturas into trios (up to 3 viaturas sharing 1 space)
          const thirdPool: any[] = [];
          displayedVtrs.forEach((v: any) => {
            if (getVtrEspaco(v) === '1/3') {
              if (!v.ativa && mergedInactiveThird) {
                if (!thirdPool.some((x: any) => x.id === mergedInactiveThird.id)) {
                  thirdPool.push(mergedInactiveThird);
                }
              } else {
                thirdPool.push(v);
              }
            }
          });

          const thirdGroups: Array<any[]> = [];
          for (let i = 0; i < thirdPool.length; i += 3) {
            thirdGroups.push(thirdPool.slice(i, i + 3));
          }

          let pairIdx = 0;
          let trioIdx = 0;
          const consumedIds = new Set<string>();

          displayedVtrs.forEach((v: any) => {
            if (consumedIds.has(v.id)) return;

            const esp = getVtrEspaco(v);
            if (esp === '1') {
              columns.push({ type: 'full', vtr: v });
              consumedIds.add(v.id);
            } else if (esp === '1/2') {
              const pair = halfPairs[pairIdx++];
              if (pair && 'top' in pair) {
                consumedIds.add(pair.top.id);
                if (pair.top.items) pair.top.items.forEach((it: any) => consumedIds.add(it.id));
                consumedIds.add(pair.bottom.id);
                if (pair.bottom.items) pair.bottom.items.forEach((it: any) => consumedIds.add(it.id));
                columns.push({ type: 'pair', top: pair.top, bottom: pair.bottom });
              } else if (pair && 'vtr' in pair) {
                consumedIds.add(pair.vtr.id);
                if (pair.vtr.items) pair.vtr.items.forEach((it: any) => consumedIds.add(it.id));
                columns.push({ type: 'half', vtr: pair.vtr });
              }
            } else if (esp === '1/3') {
              const group = thirdGroups[trioIdx++];
              if (group && group.length > 0) {
                group.forEach((item: any) => {
                  consumedIds.add(item.id);
                  if (item.items) item.items.forEach((it: any) => consumedIds.add(it.id));
                });
                columns.push({ type: 'trio', items: group });
              }
            }
          });

          const renderSlotsForVtr = (v: any) => {
            const vtrName = (v.vtr || "").toUpperCase();
            const rawSigla = vtrName.split(/[-_\s]/)[0] || '';
            const sigla = (rawSigla.startsWith('AR') && rawSigla !== 'ARC') ? 'AR' : rawSigla;
            const isMaritima = Boolean(v.maritima || sigla === 'L' || sigla === 'BIA');

            // 1. Chefe (cg)
            const defaultCg = sigla === 'ABSL' ? 'CHEFE ABSL' : sigla === 'ABT' ? 'CHEFE ABT' : sigla === 'ARC' ? 'AUXILIAR/CHEFE ARC' : sigla === 'ASE' ? 'CHEFE ASE' : 'CHEFE GUA';
            const fallbackCg = sigla === 'ARC' ? 'AUXILIAR/CHEFE' : 'CHEFE';
            const forceCg = sigla === 'ABT' || sigla === 'ABSL';

            // 2. Auxiliares (g1..g4)
            const getAuxDefault = (slot: string) => {
              if (sigla === 'ASE') return 'ENFERMEIRO';
              if (sigla === 'ARC') return 'AUXILIAR/CHEFE ARC';
              if (isMaritima) return vtrName.startsWith('BIA') ? 'MARINHEIRO BIA' : 'MARINHEIRO L';
              if (sigla === 'ABT') return 'AUXILIAR ABT';
              if (sigla === 'ABSL') return 'AUXILIAR ABSL';
              return `AUXILIAR ${sigla}`;
            };

            const getAuxFallback = (slot: string) => {
              if (sigla === 'ASE') return 'ENFERMEIRO';
              if (sigla === 'ARC') return 'AUXILIAR/CHEFE';
              return 'AUXILIAR';
            };

            // 3. Condutor
            const defaultCondutor = isMaritima
              ? (vtrName.startsWith('BIA') ? 'MESTRE BIA' : 'MESTRE L')
              : `CONDUTOR ${sigla || 'AR'}`;
            const fallbackCondutor = 'CONDUTOR';

            return (
              <>
                {/* Chefe (cg) */}
                {(v.cg === true || forceCg) && renderVtrSlot(v, 'cg', defaultCg, fallbackCg, forceCg)}

                {/* Auxiliares / Guarnição / Enfermeiro (g1..g4) */}
                {v.g1 === true && renderVtrSlot(v, 'g1', getAuxDefault('g1'), getAuxFallback('g1'))}
                {v.g2 === true && renderVtrSlot(v, 'g2', getAuxDefault('g2'), getAuxFallback('g2'))}
                {v.g3 === true && renderVtrSlot(v, 'g3', getAuxDefault('g3'), getAuxFallback('g3'))}
                {v.g4 === true && renderVtrSlot(v, 'g4', getAuxDefault('g4'), getAuxFallback('g4'))}

                {/* Condutor */}
                {v.condutor === true && renderVtrSlot(v, 'condutor', defaultCondutor, fallbackCondutor, true)}
              </>
            );
          };

          const getSlotCount = (v: any) => {
            if (!v || !v.ativa) return 1;
            let count = 0;
            const vtrName = (v.vtr || "").toUpperCase();
            const rawSigla = vtrName.split(/[-_\s]/)[0] || '';
            const sigla = (rawSigla.startsWith('AR') && rawSigla !== 'ARC') ? 'AR' : rawSigla;
            const forceCg = sigla === 'ABT' || sigla === 'ABSL';

            if ((v.cg === true || forceCg) && (forceCg || !v.blocked?.includes('cg'))) count++;
            if (v.g1 === true && !v.blocked?.includes('g1')) count++;
            if (v.g2 === true && !v.blocked?.includes('g2')) count++;
            if (v.g3 === true && !v.blocked?.includes('g3')) count++;
            if (v.g4 === true && !v.blocked?.includes('g4')) count++;
            if (v.condutor === true && !v.blocked?.includes('condutor')) count++;
            return Math.max(1, count);
          };

          const getDistributionClass = (count: number, isFraction: boolean = false) => {
            if (count <= 1) {
              return 'justify-center';
            }
            if (count === 2) {
              return isFraction ? 'justify-center gap-1.5' : 'justify-center gap-3.5';
            }
            if (count === 3) {
              return isFraction ? 'justify-evenly py-0.5' : 'justify-evenly py-1';
            }
            // 4 ou mais slots: distribui proporcionalmente no espaço
            return isFraction ? 'justify-between' : 'justify-between py-0.5';
          };

          return (
            <table className="w-full border-collapse border-2 border-black text-left mb-2 table-fixed text-[11px]">
               <thead>
                  <tr className={cn(headerColorClass, "font-bold border-b-2 border-black text-center text-xs escala-ala-header")} style={headerBgStyle}>
                     {columns.map((col, idx) => {
                        let headerTitle: React.ReactNode = '';
                        if (col.type === 'pair') {
                           headerTitle = col.top.vtr;
                        } else if (col.type === 'trio') {
                           headerTitle = col.items[0]?.vtr || '';
                        } else {
                           headerTitle = col.vtr.vtr;
                        }

                        return (
                           <th key={idx} className="border-2 border-black py-1 px-1 escala-ala-header" style={headerBgStyle}>
                              {headerTitle}
                           </th>
                        );
                     })}
                  </tr>
               </thead>
               <tbody>
                  <tr>
                     {columns.map((col, colIdx) => {
                        if (col.type === 'pair') {
                           const topCount = col.top.ativa ? getSlotCount(col.top) : 1;
                           const bottomCount = col.bottom.ativa ? getSlotCount(col.bottom) : 1;

                           return (
                              <td key={colIdx} className="border border-black p-0 align-top">
                                 <div className="flex flex-col h-full">
                                    {/* Top viatura (1/2 espaço) */}
                                    <div className={`p-1 px-1.5 flex-1 flex flex-col ${getDistributionClass(topCount, true)}`}>
                                       {!col.top.ativa ? renderInativaMsg() : renderSlotsForVtr(col.top)}
                                    </div>

                                    {/* Separador com o nome da viatura inferior */}
                                    <div className={cn("border-y-2 border-black", headerColorClass, "font-bold text-center py-0.5 shrink-0 escala-ala-header")} style={headerBgStyle}>
                                       {col.bottom.vtr}
                                    </div>

                                    {/* Bottom viatura (1/2 espaço) */}
                                    <div className={`p-1 px-1.5 flex-1 flex flex-col ${getDistributionClass(bottomCount, true)}`}>
                                       {!col.bottom.ativa ? renderInativaMsg() : renderSlotsForVtr(col.bottom)}
                                    </div>
                                 </div>
                              </td>
                           );
                        }

                        if (col.type === 'trio') {
                           const isSingleInactive = col.items.length === 1 && !col.items[0].ativa;

                           return (
                              <td key={colIdx} className="border border-black p-0 align-top">
                                 <div className="flex flex-col h-full">
                                    {col.items.map((itemVtr: any, itemIdx: number) => {
                                       const count = itemVtr.ativa ? getSlotCount(itemVtr) : 1;
                                       const isInactive = !itemVtr.ativa;

                                       // Altura / flex proporcional:
                                       // Em um trio de 2 viaturas (ex: L-09 ativa + BIA 006/013 inativas):
                                       // a ativa fica com o espaço necessário e a inativa com 1/3 exato (basis-1/3 shrink-0).
                                       // Se for 1 única viatura inativa no trio, ocupa 1/3 da altura total.
                                       let flexClass = 'flex-1';
                                       if (col.items.length === 2 && isInactive) {
                                          flexClass = 'basis-1/3 shrink-0';
                                       } else if (isSingleInactive) {
                                          flexClass = 'h-1/3 min-h-[50px] shrink-0';
                                       }

                                       return (
                                          <React.Fragment key={itemVtr.id || itemIdx}>
                                             {itemIdx > 0 && (
                                                <div className={cn("border-y-2 border-black", headerColorClass, "font-bold text-center py-0.5 shrink-0 escala-ala-header")} style={headerBgStyle}>
                                                   {itemVtr.vtr}
                                                </div>
                                             )}
                                             <div className={cn(
                                                "p-1 px-1.5 flex flex-col justify-center",
                                                flexClass,
                                                itemVtr.ativa ? getDistributionClass(count, true) : 'items-center text-center'
                                             )}>
                                                {!itemVtr.ativa ? renderInativaMsg() : renderSlotsForVtr(itemVtr)}
                                             </div>
                                          </React.Fragment>
                                       );
                                    })}
                                    {isSingleInactive && (
                                       <div className="flex-1 bg-slate-50/10 border-t border-dashed border-slate-200" />
                                    )}
                                 </div>
                              </td>
                           );
                        }

                        const fullCount = col.vtr.ativa ? getSlotCount(col.vtr) : 1;
                        const isHalfCol = col.type === 'half';
                        return (
                           <td key={colIdx} className="border border-black p-0 align-top">
                              <div className={`flex flex-col h-full ${isHalfCol ? '' : 'p-1.5 px-2 ' + getDistributionClass(fullCount, false)}`}>
                                 {isHalfCol ? (
                                    <>
                                       <div className="p-1 px-1.5 h-1/2 min-h-[50px] flex flex-col justify-center items-center">
                                          {!col.vtr.ativa ? renderInativaMsg() : renderSlotsForVtr(col.vtr)}
                                       </div>
                                       <div className="flex-1 bg-slate-50/10 border-t border-dashed border-slate-200" />
                                    </>
                                 ) : (
                                    !col.vtr.ativa ? renderInativaMsg() : renderSlotsForVtr(col.vtr)
                                 )}
                              </div>
                           </td>
                        );
                     })}
                  </tr>
               </tbody>
            </table>
          );
        })()}

        {/* FUNÇÕES ADMINISTRATIVAS & COMUNICANTES */}
        <div className="flex border-2 border-black mb-1.5 uppercase text-[9px] leading-tight">
           {/* FUNÇÕES ADMINISTRATIVAS (80% da largura, alinhado com Sentinelas) */}
           <div className="w-[80%] flex font-bold py-[2px] px-1.5">
              <div className="w-1/2 flex flex-col gap-[1px] pr-2.5">
                 {Object.entries(adminRoles).map(([k, v]) => {
                   const roleKey = getAdminRoleMappedKey(k);
                   const isVisible = isAdminRoleVisible(roleKey);
                   return (
                     <div key={k} className="flex gap-1 w-full items-center min-h-[12.5px] leading-tight group/admin-row">
                        {isVisible ? (
                          <>
                            <span className="w-[145px] shrink-0 font-bold">{k}</span>
                            <span className="font-normal truncate">{renderMilitar(v[0])}</span>
                          </>
                        ) : (
                          /* Espaço vazio ao invés desse texto quando desativado! */
                          <>
                            <span className="w-[145px] shrink-0 opacity-0 select-none font-bold">{k}</span>
                            <span className="font-normal truncate opacity-0 select-none">&nbsp;</span>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleAdminRoleVisibility(roleKey)}
                          className="print:hidden opacity-0 group-hover/admin-row:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5 ml-auto cursor-pointer h-3 flex items-center"
                          title={isVisible ? `Desativar ${k} no Gerar Escala` : `Ativar ${k} no Gerar Escala`}
                        >
                          {isVisible ? <EyeOff className="w-2.5 h-2.5 text-slate-400 hover:text-rose-600" /> : <Eye className="w-2.5 h-2.5 text-emerald-600" />}
                        </button>
                     </div>
                   );
                 })}
              </div>
              <div className="w-1/2 flex flex-col gap-[1px]">
                 {adminRolesRight.map((item, idx) => {
                   const roleKey = getAdminRoleMappedKey(item.label);
                   const isVisible = isAdminRoleVisible(roleKey);
                   return (
                     <div key={idx} className="flex gap-1 w-full items-center min-h-[12.5px] leading-tight group/admin-row">
                        {isVisible ? (
                          <>
                            <span className="w-[115px] shrink-0 font-bold">{item.label}</span>
                            <span className="font-normal truncate">{renderMilitar(item.value)}</span>
                          </>
                        ) : (
                          /* Espaço vazio ao invés desse texto quando desativado! */
                          <>
                            <span className="w-[115px] shrink-0 opacity-0 select-none font-bold">{item.label}</span>
                            <span className="font-normal truncate opacity-0 select-none">&nbsp;</span>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleAdminRoleVisibility(roleKey)}
                          className="print:hidden opacity-0 group-hover/admin-row:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5 ml-auto cursor-pointer h-3 flex items-center"
                          title={isVisible ? `Desativar ${item.label} no Gerar Escala` : `Ativar ${item.label} no Gerar Escala`}
                        >
                          {isVisible ? <EyeOff className="w-2.5 h-2.5 text-slate-400 hover:text-rose-600" /> : <Eye className="w-2.5 h-2.5 text-emerald-600" />}
                        </button>
                     </div>
                   );
                 })}
              </div>
           </div>

           {/* COMUNICANTE 1 E COMUNICANTE 2 (20% da largura, idêntico a Auxiliar Rancho & Toque de Fogo) */}
           {(() => {
              const isCom1Visible = isAdminRoleVisible('COMUNICANTE 1');
              const isCom2Visible = isAdminRoleVisible('COMUNICANTE 2');
              return (
                 <div className="w-[20%] border-l-2 border-black flex flex-col justify-between font-bold">
                    {/* COMUNICANTE 1 */}
                    <div className="flex flex-col flex-1">
                       <div
                          className={cn("p-1 uppercase border-b border-black text-center escala-ala-header font-bold text-[9px]", headerColorClass)}
                          style={headerBgStyle}
                       >
                          COMUNICANTE 1:
                       </div>
                       <div className="flex-1 flex items-center justify-center p-1 font-normal text-center truncate relative group/com1 min-h-[20px]">
                          {isCom1Visible ? (
                             com1Militar ? (
                                <div className="truncate">{renderMilitar(com1Militar)}</div>
                             ) : (
                                <span className="opacity-0 select-none">&nbsp;</span>
                             )
                          ) : (
                             <span className="opacity-0 select-none">&nbsp;</span>
                          )}
                          <button
                             type="button"
                             onClick={() => toggleAdminRoleVisibility('COMUNICANTE 1')}
                             className="print:hidden opacity-0 group-hover/com1:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5 absolute right-1 top-1 cursor-pointer"
                             title={isCom1Visible ? "Desativar Comunicante 1 no Gerar Escala" : "Ativar Comunicante 1 no Gerar Escala"}
                          >
                             {isCom1Visible ? <EyeOff className="w-2.5 h-2.5 text-slate-400 hover:text-rose-600" /> : <Eye className="w-2.5 h-2.5 text-emerald-600" />}
                          </button>
                       </div>
                    </div>

                    {/* COMUNICANTE 2 */}
                    <div className="flex flex-col flex-1">
                       <div
                          className={cn("p-1 uppercase border-t-2 border-b border-black text-center escala-ala-header font-bold text-[9px]", headerColorClass)}
                          style={headerBgStyle}
                       >
                          COMUNICANTE 2:
                       </div>
                       <div className="flex-1 flex items-center justify-center p-1 font-normal text-center truncate relative group/com2 min-h-[20px]">
                          {isCom2Visible ? (
                             com2Militar ? (
                                <div className="truncate">{renderMilitar(com2Militar)}</div>
                             ) : (
                                <span className="opacity-0 select-none">&nbsp;</span>
                             )
                          ) : (
                             <span className="opacity-0 select-none">&nbsp;</span>
                          )}
                          <button
                             type="button"
                             onClick={() => toggleAdminRoleVisibility('COMUNICANTE 2')}
                             className="print:hidden opacity-0 group-hover/com2:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5 absolute right-1 top-1 cursor-pointer"
                             title={isCom2Visible ? "Desativar Comunicante 2 no Gerar Escala" : "Ativar Comunicante 2 no Gerar Escala"}
                          >
                             {isCom2Visible ? <EyeOff className="w-2.5 h-2.5 text-slate-400 hover:text-rose-600" /> : <Eye className="w-2.5 h-2.5 text-emerald-600" />}
                          </button>
                       </div>
                    </div>
                 </div>
              );
           })()}
        </div>

        {/* SENTINELAS, AUXILIAR RANCHO & TOQUE DE FOGO */}
        {(() => {
          const isSentinelaVisible = isAdminRoleVisible('SENTINELA');
          const isAuxRanchoVisible = isAdminRoleVisible('AUXILIAR RANCHO');
          const isToqueFogoVisible = isAdminRoleVisible('TOQUE DE FOGO');

          const horariosNorte = [
            '6 às 8 / 14 às 16 / 22 às 00:00',
            '8 às 10 / 16 às 18 / 00 às 02:00',
            '10 às 12 / 18 às 20 / 02 às 04:00',
            '12 às 14 / 20 às 22 / 04 às 06:00',
          ];

          const horariosSul = [
            '6 às 7:30 / 12 às 13:30',
            '7:30 às 9 / 13:30 às 15',
            '9 às 10:30 / 15 às 16:30',
            '10:30 às 12/16:30 às 18',
          ];

          const turnLabels = ['1º', '2º', '3º', '4º'];

          const hasMilitar = (m: any) => Boolean(m) && Boolean(renderMilitar(m)) && isSentinelaVisible;
          const hasAnySul = [0, 1, 2, 3].some(i => hasMilitar(sentinelas[i + 4]));

          return (
            <table className="w-full border-collapse border-2 border-black text-center mb-2 table-fixed">
               <colgroup>
                  <col className="w-[23%]" />
                  <col className="w-[17%]" />
                  <col className="w-[23%]" />
                  <col className="w-[17%]" />
                  <col className="w-[20%]" />
               </colgroup>
               <thead>
                  <tr className={cn(headerColorClass, "font-bold border-b-2 border-black escala-ala-header")} style={headerBgStyle}>
                     <th className="border-r border-black p-1 uppercase text-left pl-2 escala-ala-header" style={headerBgStyle} colSpan={2}>SENTINELAS: <span className="ml-8">GUARDA NORTE</span></th>
                     <th className="border-r border-black p-1 uppercase text-left pl-2 escala-ala-header" style={headerBgStyle} colSpan={2}>{hasAnySul ? 'SENTINELAS:' : ''}</th>
                     <th className="p-1 uppercase border-black border-l-2 text-center escala-ala-header" style={headerBgStyle} colSpan={1}>AUXILIAR RANCHO:</th>
                  </tr>
               </thead>
               <tbody className="text-left font-bold uppercase">
                  {[0, 1, 2, 3].map((rowIdx) => {
                     const mNorte = sentinelas[rowIdx];
                     const mSul = sentinelas[rowIdx + 4];
                     const norteFilled = hasMilitar(mNorte);
                     const sulFilled = hasMilitar(mSul);

                     return (
                        <tr key={rowIdx}>
                           {/* Guarda Norte - Militar */}
                           <td className="border-r border-black p-1 pl-2 text-left font-bold truncate text-[10px]">
                              {norteFilled ? (
                                 <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-black shrink-0">{turnLabels[rowIdx]}</span>
                                    <span className="truncate">{renderMilitar(mNorte)}</span>
                                 </div>
                              ) : (
                                 <span className="opacity-0 select-none">&nbsp;</span>
                              )}
                           </td>

                           {/* Guarda Norte - Horário */}
                           <td className="border-r border-black p-1 text-center font-normal text-[10px]">
                              {norteFilled ? (
                                 horariosNorte[rowIdx]
                              ) : (
                                 <span className="opacity-0 select-none">&nbsp;</span>
                              )}
                           </td>

                           {/* Guarda Sul - Militar */}
                           <td className="border-r border-black p-1 pl-2 text-left font-bold truncate text-[10px]">
                              {sulFilled ? (
                                 <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-black shrink-0">{turnLabels[rowIdx]}</span>
                                    <span className="truncate">{renderMilitar(mSul)}</span>
                                 </div>
                              ) : (
                                 <span className="opacity-0 select-none">&nbsp;</span>
                              )}
                           </td>

                           {/* Guarda Sul - Horário */}
                           <td className="border-r border-black p-1 text-center font-normal text-[10px]">
                              {sulFilled ? (
                                 horariosSul[rowIdx]
                              ) : (
                                 <span className="opacity-0 select-none">&nbsp;</span>
                              )}
                           </td>

                           {/* Coluna 5: Auxiliar Rancho (linhas 0 e 1 com rowSpan 2) */}
                           {rowIdx === 0 && (
                              <td className="border-l-2 border-black p-1 font-normal text-center truncate relative group/aux" rowSpan={2}>
                                 <div className="flex items-center justify-center gap-2">
                                    {isAuxRanchoVisible ? (
                                       auxRancho.length > 0 ? (
                                          auxRancho.map((m: any, i: number) => (
                                             <React.Fragment key={i}>
                                                {i > 0 && <span>/</span>}
                                                {renderMilitar(m)}
                                             </React.Fragment>
                                          ))
                                       ) : (
                                          <span className="opacity-0 select-none">&nbsp;</span>
                                       )
                                    ) : (
                                       <span className="opacity-0 select-none">&nbsp;</span>
                                    )}
                                 </div>
                                 <button
                                    type="button"
                                    onClick={() => toggleAdminRoleVisibility('AUXILIAR RANCHO')}
                                    className="print:hidden opacity-0 group-hover/aux:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5 absolute right-1 top-1 cursor-pointer"
                                    title={isAuxRanchoVisible ? "Desativar Auxiliar Rancho no Gerar Escala" : "Ativar Auxiliar Rancho no Gerar Escala"}
                                 >
                                    {isAuxRanchoVisible ? <EyeOff className="w-2.5 h-2.5 text-slate-400 hover:text-rose-600" /> : <Eye className="w-2.5 h-2.5 text-emerald-600" />}
                                 </button>
                              </td>
                           )}

                           {/* Coluna 5: Cabeçalho Toque de Fogo (linha 2) */}
                           {rowIdx === 2 && (
                              <td className={cn("border-y-2 border-l-2 border-black p-1", headerColorClass, "font-bold text-center escala-ala-header")} style={headerBgStyle}>
                                 TOQUE DE FOGO:
                              </td>
                           )}

                           {/* Coluna 5: Toque de Fogo Militar (linha 3) */}
                           {rowIdx === 3 && (
                              <td className="border-l-2 border-black p-1 font-normal text-center truncate relative group/fogo">
                                 <div className="flex items-center justify-center gap-2">
                                    {isToqueFogoVisible ? (
                                       toqueFogo.length > 0 ? (
                                          toqueFogo.map((m: any, i: number) => (
                                             <React.Fragment key={i}>
                                                {i > 0 && <span>/</span>}
                                                {renderMilitar(m)}
                                             </React.Fragment>
                                          ))
                                       ) : (
                                          <span className="opacity-0 select-none">&nbsp;</span>
                                       )
                                    ) : (
                                       <span className="opacity-0 select-none">&nbsp;</span>
                                    )}
                                 </div>
                                 <button
                                    type="button"
                                    onClick={() => toggleAdminRoleVisibility('TOQUE DE FOGO')}
                                    className="print:hidden opacity-0 group-hover/fogo:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5 absolute right-1 top-1 cursor-pointer"
                                    title={isToqueFogoVisible ? "Desativar Toque de Fogo no Gerar Escala" : "Ativar Toque de Fogo no Gerar Escala"}
                                 >
                                    {isToqueFogoVisible ? <EyeOff className="w-2.5 h-2.5 text-slate-400 hover:text-rose-600" /> : <Eye className="w-2.5 h-2.5 text-emerald-600" />}
                                 </button>
                              </td>
                           )}
                        </tr>
                     );
                  })}
               </tbody>
            </table>
          );
        })()}

        {/* PERMUTAS AUTORIZADAS */}
        <div className="border-2 border-black mb-2 flex flex-col min-h-[50px]">
           <div className={cn(headerColorClass, "border-b border-black font-bold uppercase text-center p-1 escala-ala-header")} style={headerBgStyle}>
              PERMUTAS AUTORIZADAS:
           </div>
           <div className="p-2 flex flex-wrap gap-4 flex-1 items-center">
              {permutasAtivas.length > 0 ? (
                 permutasAtivas.map((p: any, idx: number) => (
                    <div key={idx} className="uppercase text-[10px] flex items-center gap-2">
                      <span className="font-bold">Sai:</span> {renderMilitar(p.req)} <span className="font-bold ml-2">Entra:</span> {renderMilitar(p.sub)}
                    </div>
                 ))
              ) : (
                 <div className="w-full text-center font-normal text-slate-500 italic text-[10px]">
                    Nenhuma permuta foi realizada.
                 </div>
              )}
           </div>
        </div>

        {/* CHAMADA GERAL */}
        <table className="w-full border-collapse border-2 border-black text-left table-fixed text-[10px]">
           <colgroup>
              <col className="w-[82%]" />
              <col className="w-[18%]" />
           </colgroup>
           <thead>
              <tr className={cn(headerColorClass, "font-bold border-b-2 border-black escala-ala-header")} style={headerBgStyle}>
                 <th className="border-r border-black p-1 text-center uppercase tracking-wider escala-ala-header" style={headerBgStyle}>CHAMADA GERAL</th>
                 <th className="p-1 text-center uppercase tracking-wider escala-ala-header" style={headerBgStyle}>RAS</th>
              </tr>
           </thead>
           <tbody>
              <tr>
                 <td className="border-r border-black p-1.5 px-3 align-top text-[10px] font-bold">
                    {activeMembersList.length > 0 ? (
                       <div className="grid grid-cols-4 gap-x-4 gap-y-1">
                          {activeMembersList.map((m: any, idx: number) => (
                             <div key={idx} className="flex items-center gap-1.5 truncate">
                                <span className="font-mono text-slate-700 shrink-0">{m.rg} -</span>
                                <span className="truncate">{renderMilitar(m.militar)}</span>
                             </div>
                          ))}
                       </div>
                    ) : (
                       <div className="text-center font-normal text-slate-500 italic py-2">
                          Nenhum militar na chamada geral.
                       </div>
                    )}
                 </td>
                 <td className="p-1.5 px-2 align-top text-[9px] font-bold">
                    {rasApplications && rasApplications.length > 0 ? (
                       <div className="flex flex-col gap-1">
                          {rasApplications.map((rasItem: any, idx: number) => {
                             const rasApp = {
                                rg: rasItem.militarRg || rasItem.rg,
                                name: rasItem.militarName || rasItem.name,
                                warName: rasItem.militarWarName || rasItem.warName,
                                rank: rasItem.militarRank || rasItem.rank,
                             };
                             return (
                                <div key={idx} className="flex items-center gap-1 truncate">
                                   <span className="font-mono text-slate-700 shrink-0">{idx + 1} -</span>
                                   <span className="truncate">{renderMilitar(rasApp)}</span>
                                </div>
                             );
                          })}
                       </div>
                    ) : (
                       <div className="min-h-[50px] flex items-center justify-center p-2 text-center text-slate-500 italic font-normal text-[10px]">
                          Nenhum RAS realizado
                       </div>
                    )}
                 </td>
              </tr>
           </tbody>
        </table>

        {/* EXPEDIENTE DE SERVIÇO (SEÇÃO DEDICADA) */}
        <div className="border-2 border-black border-t-0 flex flex-col">
           {/* EXPEDIENTE HEADER */}
           <div className={cn(headerColorClass, "font-bold border-b-2 border-black text-center p-1 text-[10px] uppercase tracking-wider escala-ala-header")} style={headerBgStyle}>
              MILITARES DE EXPEDIENTE NO DIA
           </div>
           
           {/* EXPEDIENTE LIST */}
           <div className="p-1.5 px-3 border-b-2 border-black text-[10px] min-h-[30px] font-bold">
              {expedienteMilitars.length > 0 ? (
                 <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-4 gap-y-1">
                    {expedienteMilitars.map((m: any, idx: number) => {
                       const sectorName = m.sector || m.militar?.setor;
                       return (
                          <div key={idx} className="flex items-center gap-1.5 truncate">
                             <span className="font-mono text-slate-700 shrink-0">{m.rg} -</span>
                             <span className="truncate">{renderMilitar(m.militar || m)}</span>
                             {sectorName && (
                                <span className="text-[7.5px] font-bold text-slate-600 bg-slate-100 border border-slate-300 px-1 rounded ml-0.5 shrink-0 uppercase">
                                   {sectorName}
                                </span>
                             )}
                             {m.is24h && (
                                <span className="text-[7.5px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-1 rounded ml-1 shrink-0">
                                   24H
                                </span>
                             )}
                          </div>
                       );
                    })}
                 </div>
              ) : (
                 <div className="text-center font-normal text-slate-500 italic">Nenhum militar de expediente escalado neste dia.</div>
              )}
           </div>
        </div>

        {/* AFASTAMENTOS E GRD */}
        {(() => {
           const activeAfastamentos = (afastamentos || []).filter((a: any) => {
              if (selectedDate < a.inicio || selectedDate > a.retorno) return false;
              const mil = (militars || []).find((m: any) => normalizeRg(m.rg) === normalizeRg(a.rg));
              if (identifiedAla) {
                 const effectiveAla = normalizeAlaField(a.ala || mil?.ala);
                 if (effectiveAla && effectiveAla !== normalizeAlaField(identifiedAla)) {
                    return false;
                 }
              }
              return true;
           });
           
           const afastadosList = activeAfastamentos.map((a: any) => {
              const mil = (militars || []).find((m: any) => normalizeRg(m.rg) === normalizeRg(a.rg));
              if (!mil) return null;
              const typeStr = a.situacao || a.tipoAfastamento || 'Afastamento';
              return `${parseRank(mil.rank)} ${mil.warName || (mil.name || '').split(' ')[0]} (${typeStr})`;
           }).filter(Boolean);

           const grdMilitarsList = (grdRgs || [])
              .map((rg: any) => {
                 const cleanRg = typeof rg === 'string' ? rg : rg?.rg;
                 if (!cleanRg || !cleanRg.trim()) return null;
                 const mil = (militars || []).find((m: any) => normalizeRg(m.rg) === normalizeRg(cleanRg));
                 if (!mil) return cleanRg ? `RG: ${cleanRg.trim()}` : null;
                 return `${parseRank(mil.rank)} ${mil.warName || (mil.name || '').split(' ')[0]}`;
              })
              .filter(Boolean) as string[];

           const hasGrd = grdMilitarsList.length > 0;
           const obmName = (obmContext || '10º GBM').split('-')[0].trim();

           return (
              <div className="border-2 border-black border-t-0 flex w-full mb-4 items-stretch">
                 {/* COLUNA ESQUERDA: AFASTAMENTOS E GRD (82% de largura, alinhado com Chamada Geral) */}
                 <div className="w-[82%] border-r-2 border-black flex flex-col justify-between">
                    {/* AFASTAMENTOS HEADER */}
                    <div className={cn(headerColorClass, "font-bold border-b-2 border-black text-center p-1 text-[10px] uppercase tracking-wider escala-ala-header")} style={headerBgStyle}>
                       AFASTAMENTOS
                    </div>
                    
                    {/* AFASTAMENTOS LIST */}
                    <div className="p-1.5 px-3 border-b-2 border-black text-[10px] min-h-[30px] font-bold flex-1 flex items-center">
                       {afastadosList.length > 0 ? (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-4 gap-y-1 w-full">
                             {afastadosList.map((str: any, idx: number) => <span key={idx}>{str}</span>)}
                          </div>
                       ) : (
                          <div className="text-center font-normal text-slate-500 italic w-full">Nenhum afastamento.</div>
                       )}
                    </div>

                    {/* GRD */}
                    <div className="flex w-full min-h-[46px] items-stretch">
                       <div className="w-[22%] border-r-2 border-black flex items-center justify-center font-black text-[10.5px] uppercase bg-slate-50 p-2 text-center shrink-0">
                          GRD - {obmName}
                       </div>
                       <div className="w-[78%] p-2 px-3 flex-1 flex items-center">
                          {hasGrd ? (
                             <div className={cn("grid gap-x-6 gap-y-1 text-[10px] font-bold uppercase w-full", grdMilitarsList.length > 4 ? "grid-cols-3" : "grid-cols-2")}>
                                {grdMilitarsList.map((str: any, idx: number) => (
                                   <div key={idx} className="flex gap-1 items-start">
                                      <span className="shrink-0">{idx + 1}-</span>
                                      <span className="leading-[1.1]">
                                         {str}
                                      </span>
                                   </div>
                                ))}
                             </div>
                          ) : null}
                       </div>
                    </div>
                 </div>

                 {/* COLUNA DIREITA: VISTO (18% de largura, estilo lateral como o RAS) */}
                 <div className="w-[18%] flex flex-col shrink-0 text-center justify-between">
                    {/* VISTO HEADER */}
                    <div className={cn(headerColorClass, "font-bold border-b-2 border-black text-center p-1 text-[10px] uppercase tracking-wider escala-ala-header")} style={headerBgStyle}>
                       VISTO
                    </div>

                    {/* VISTO BODY (Ch. SaD e Escalante) */}
                    <div className="flex-1 flex flex-col items-center justify-between p-1.5 text-center">
                       {/* Ch. SaD: espaço para rubrica e linha acima do Ch. SaD */}
                       <div className="w-full flex flex-col items-center my-auto pt-1">
                          <div className="h-4 w-full"></div>
                          <div className="w-4/5 border-b border-black mb-0.5"></div>
                          <span className="font-bold text-[9.5px] leading-tight">Ch. SaD</span>
                        </div>
                        
                        {/* Escalante: texto na base do bloco, com a assinatura acima da linha */}
                        <div className="w-full flex flex-col items-center mt-auto pt-1 pb-0.5">
                           {/* Assinatura do escalante (acima da linha de escalante) */}
                           <div className="min-h-[20px] flex flex-col items-center justify-end w-full mb-0.5">
                             {isSigned && user ? (
                               <div className="text-[8px] font-bold uppercase leading-tight text-center px-0.5">
                                 <span>{parseRank(user.rank)} {user.warName || user.name}</span>
                                 <span className="block text-[7px] font-semibold text-slate-700">RG: {user.rg}</span>
                               </div>
                             ) : (
                               <div className="h-3.5"></div>
                             )}
                           </div>
                           {/* Linha de escalante */}
                           <div className="w-4/5 border-b border-black mb-0.5"></div>
                           {/* Texto Escalante na base */}
                           <span className="font-bold text-[9.5px] leading-tight mb-0">Escalante</span>
                        </div>
                     </div>
                  </div>
               </div>
            );
        })()}

      </div>

      {/* Modal de Gerenciamento e Upload de Brasões */}
      <LogoManagerModal isOpen={showLogoModal} onClose={() => setShowLogoModal(false)} />
    </div>
  );
}
