import React, { useState, useMemo, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Printer, X, Image as ImageIcon, PenTool, Save, Columns, LayoutList, Shield, ExternalLink, Eye, EyeOff, ChevronDown, Check } from 'lucide-react';
import { RankInsignia } from './RankInsignia';
import { LogoDecimoGbm } from './LogoDecimoGbm';
import { LogoCbaSete } from './LogoCbaSete';
import { LogoManagerModal } from './LogoManagerModal';
import { parseRank, sortAllBySeniority } from '../lib/rankUtils';
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
      'COMUNICANTE', 'SENTINELA', 'AUXILIAR RANCHO', 'TOQUE DE FOGO', 'ESCALANTE'
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
    if (clean.includes('COMUNICANTE')) return 'COMUNICANTE';
    if (clean.includes('SENTINELA')) return 'SENTINELA';
    if (clean.includes('RANCHO')) return 'AUXILIAR RANCHO';
    if (clean.includes('FOGO')) return 'TOQUE DE FOGO';
    return clean;
  };

  const [expedienteLayout, setExpedienteLayout] = useState<'coluna' | 'secao'>(() => {
    try {
      const saved = localStorage.getItem('escala_expediente_layout');
      return saved === 'secao' ? 'secao' : 'coluna';
    } catch {
      return 'coluna';
    }
  });

  const toggleExpedienteLayout = () => {
    setExpedienteLayout(prev => {
      const next = prev === 'coluna' ? 'secao' : 'coluna';
      try {
        localStorage.setItem('escala_expediente_layout', next);
      } catch {}
      return next;
    });
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
      return funcs.some((f: string) => {
        const fNorm = normalize(f);
        if (fNorm === targetNorm) return true;
        if (f.trim().toUpperCase() === funcName.trim().toUpperCase()) return true;
        return false;
      });
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
            <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest leading-none mb-[2px] whitespace-nowrap">{parseRank(militar.rank)}</span>
            <span className="text-[11px] font-black uppercase tracking-tight text-slate-800 leading-none truncate block">{militar.warName?.toUpperCase() || formatMilitaryName(militar.name || "")}</span>
          </div>
        </div>
      );
    }
    return `${militar.rank || ''} ${militar.warName || (militar.name ? militar.name.split(' ')[0] : militar.rg || '')}`;
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

  const comunicantes = getByFunc('COMUNICANTE');
  const auxRancho = getByFunc('AUXILIAR RANCHO');
  const toqueFogo = getByFunc('TOQUE DE FOGO');
  const sentinelas = getByFunc('SENTINELA');

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
        label: `${actualMilitar?.rank || ''} ${actualMilitar?.warName || (actualMilitar?.name ? actualMilitar.name.split(' ')[0] : actualMilitar?.rg || '')}`
      };
    }).sort((a: any, b: any) => sortAllBySeniority(a.militar, b.militar));
  }, [baseRoster, permutasOut, militars]);

  const permutasAtivas = Array.from(permutasOut.values()).map((p: any) => {
     const sub = militars.find((x:any) => x.rg === p.substituteRg);
     const req = militars.find((x:any) => x.rg === p.requesterRg);
     return { req, sub, text: `Sai: ${req?.rank} ${req?.warName || req?.name} - Entra: ${sub?.rank} ${sub?.warName || sub?.name}` };
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
  }, [selectedDate, identifiedAla, baseRoster, viaturasInfo, expedienteLayout, isSigned, showVisualMode, alaTheme, officerVisibility, adminRolesVisibility]);

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
                     { key: 'COMUNICANTE', label: 'Comunicantes' },
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

           <button
             type="button"
             onClick={toggleExpedienteLayout}
             className="bg-indigo-50 text-indigo-900 border border-indigo-200 px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-100 transition-colors cursor-pointer shadow-2xs"
             title="Alternar entre Expediente em Coluna na Chamada Geral ou Seção dedicada abaixo da tabela"
           >
             {expedienteLayout === 'coluna' ? (
               <>
                 <LayoutList className="w-4 h-4 text-indigo-700" />
                 <span>Expediente: Coluna</span>
               </>
             ) : (
               <>
                 <Columns className="w-4 h-4 text-indigo-700" />
                 <span>Expediente: Seção</span>
               </>
             )}
           </button>
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
        <div className="flex w-full mb-2 border-b border-black mt-8 print:mt-0">
           {/* Left column */}
           <div className="w-1/4 text-center border-r border-black pr-2 flex flex-col items-center pt-5 pb-2">
              <span className="font-bold text-sm mb-6">VISTO</span>
              
              <div className="w-full flex flex-col items-center mb-6">
                 <div className="w-3/4 border-b border-black mb-1"></div>
                 <span className="font-bold text-xs">Ch. SaD</span>
              </div>
              
              <div className="w-full flex flex-col items-center">
                 <div className="w-3/4 border-b border-black mb-1"></div>
                 <span className="font-bold text-xs">Escalante</span>
                 {isSigned && user && (
                   <span className="text-[9px] mt-1 font-bold uppercase leading-tight">
                     {parseRank(user.rank)} {user.warName || user.name}<br/>
                     RG: {user.rg}
                   </span>
                 )}
              </div>
           </div>

           {/* Right column */}
           <div className="w-3/4 text-center flex flex-col justify-between pl-2">
              <div className="flex items-center justify-center gap-3 sm:gap-5 print:gap-4 w-full mt-1 mb-2 px-1">
                 {/* Lado esquerdo: Décimo GBM */}
                 <div
                   onClick={() => setShowLogoModal(true)}
                   className="w-20 h-24 sm:w-24 sm:h-28 print:w-[86px] print:h-[102px] flex items-center justify-center shrink-0 cursor-pointer relative group rounded-sm hover:outline hover:outline-1 hover:outline-red-400 transition-transform hover:scale-102"
                   title="10º GBM - Clique para carregar ou alterar esta imagem"
                 >
                    <LogoDecimoGbm className="w-full h-full object-contain max-h-[92px] sm:max-h-[105px] print:max-h-[96px]" allowUpload={true} />
                 </div>

                 {/* Centro: Título Oficial */}
                 <div className="font-bold text-[11px] sm:text-[12px] flex flex-col justify-center items-center text-center px-1 shrink-0 leading-tight sm:leading-normal">
                    <span>CORPO DE BOMBEIROS MILITAR DO ESTADO DO RIO DE JANEIRO</span>
                    <span>COMANDO DE BOMBEIROS DA COSTA VERDE</span>
                    <span>DÉCIMO GRUPAMENTO DE BOMBEIRO MILITAR-ANGRA DOS REIS</span>
                 </div>

                 {/* Lado direito: CBA7 */}
                 <div
                   onClick={() => setShowLogoModal(true)}
                   className="w-20 h-24 sm:w-24 sm:h-28 print:w-[86px] print:h-[102px] flex items-center justify-center shrink-0 cursor-pointer relative group rounded-sm hover:outline hover:outline-1 hover:outline-emerald-400 transition-transform hover:scale-102"
                   title="CBA VII - Clique para carregar ou alterar esta imagem"
                 >
                    <LogoCbaSete className="w-full h-full object-contain max-h-[92px] sm:max-h-[105px] print:max-h-[96px]" allowUpload={true} />
                 </div>
              </div>
              
              <div className="flex justify-center gap-2 w-full text-sm font-bold px-16 mb-2">
                 <span>ESCALA DE SERVIÇO PARA O DIA:</span>
                 <span>{dateStr}</span>
              </div>

              <div className="font-bold flex flex-col text-left uppercase text-xs border-t border-black w-full pt-2 pb-2 pl-4 min-h-[58px]">
                {isDiaVisible ? (
                  <div className="flex items-center justify-between group/officer-row min-h-[16px]">
                    <span>OFICIAL DE DIA E PRONTIDÃO: {oficialDia ? <span className="ml-1 font-black underline">{oficialDia}</span> : ''}</span>
                    <button
                      type="button"
                      onClick={() => toggleOfficerVisibility('showOficialDia')}
                      className="print:hidden opacity-0 group-hover/officer-row:opacity-100 hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5 rounded cursor-pointer mr-3"
                      title="Desativar Oficial de Dia no arquivo Gerar Escala"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  /* Espaço vazio ao invés do texto quando desativado */
                  <div className="flex items-center justify-between group/officer-row min-h-[16px]">
                    <span className="opacity-0 select-none">&nbsp;</span>
                    <button
                      type="button"
                      onClick={() => toggleOfficerVisibility('showOficialDia')}
                      className="print:hidden opacity-0 group-hover/officer-row:opacity-100 hover:opacity-100 text-slate-400 hover:text-emerald-600 transition-opacity p-0.5 rounded cursor-pointer mr-3"
                      title="Ativar Oficial de Dia no arquivo Gerar Escala"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {isNauticaVisible ? (
                  <div className="flex items-center justify-between group/officer-row min-h-[16px]">
                    <span>OFICIAL DA NÁUTICA: {oficialNautica ? <span className="ml-1 font-black underline">{oficialNautica}</span> : ''}</span>
                    <button
                      type="button"
                      onClick={() => toggleOfficerVisibility('showOficialNautica')}
                      className="print:hidden opacity-0 group-hover/officer-row:opacity-100 hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5 rounded cursor-pointer mr-3"
                      title="Desativar Oficial da Náutica no arquivo Gerar Escala"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  /* Espaço vazio ao invés do texto quando desativado */
                  <div className="flex items-center justify-between group/officer-row min-h-[16px]">
                    <span className="opacity-0 select-none">&nbsp;</span>
                    <button
                      type="button"
                      onClick={() => toggleOfficerVisibility('showOficialNautica')}
                      className="print:hidden opacity-0 group-hover/officer-row:opacity-100 hover:opacity-100 text-slate-400 hover:text-emerald-600 transition-opacity p-0.5 rounded cursor-pointer mr-3"
                      title="Ativar Oficial da Náutica no arquivo Gerar Escala"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {isMedicoVisible ? (
                  <div className="flex items-center justify-between group/officer-row min-h-[16px]">
                    <span>OFICIAL MÉDICO: {oficialMedico ? <span className="ml-1 font-black underline">{oficialMedico}</span> : ''}</span>
                    <button
                      type="button"
                      onClick={() => toggleOfficerVisibility('showOficialMedico')}
                      className="print:hidden opacity-0 group-hover/officer-row:opacity-100 hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5 rounded cursor-pointer mr-3"
                      title="Desativar Oficial Médico no arquivo Gerar Escala"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  /* Espaço vazio ao invés do texto quando desativado */
                  <div className="flex items-center justify-between group/officer-row min-h-[16px]">
                    <span className="opacity-0 select-none">&nbsp;</span>
                    <button
                      type="button"
                      onClick={() => toggleOfficerVisibility('showOficialMedico')}
                      className="print:hidden opacity-0 group-hover/officer-row:opacity-100 hover:opacity-100 text-slate-400 hover:text-emerald-600 transition-opacity p-0.5 rounded cursor-pointer mr-3"
                      title="Ativar Oficial Médico no arquivo Gerar Escala"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
           </div>
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

        {/* ADMIN ROLES */}
        <div className="flex border-2 border-black mb-2 p-1 font-bold uppercase min-h-[90px] text-xs">
           <div className="w-1/2 flex flex-col gap-1 pr-4">
              {Object.entries(adminRoles).map(([k, v]) => {
                const roleKey = getAdminRoleMappedKey(k);
                const isVisible = isAdminRoleVisible(roleKey);
                return (
                  <div key={k} className="flex gap-2 w-full items-center min-h-[20px] group/admin-row">
                     {isVisible ? (
                       <>
                         <span className="w-[180px] shrink-0">{k}</span>
                         <span className="font-normal truncate">{renderMilitar(v[0])}</span>
                       </>
                     ) : (
                       /* Espaço vazio ao invés desse texto quando desativado! */
                       <>
                         <span className="w-[180px] shrink-0 opacity-0 select-none">{k}</span>
                         <span className="font-normal truncate opacity-0 select-none">&nbsp;</span>
                       </>
                     )}
                     <button
                       type="button"
                       onClick={() => toggleAdminRoleVisibility(roleKey)}
                       className="print:hidden opacity-0 group-hover/admin-row:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5 ml-auto cursor-pointer"
                       title={isVisible ? `Desativar ${k} no Gerar Escala` : `Ativar ${k} no Gerar Escala`}
                     >
                       {isVisible ? <EyeOff className="w-3 h-3 text-slate-400 hover:text-rose-600" /> : <Eye className="w-3 h-3 text-emerald-600" />}
                     </button>
                  </div>
                );
              })}
           </div>
           <div className="w-1/2 flex flex-col gap-1">
              {adminRolesRight.map((item, idx) => {
                const roleKey = getAdminRoleMappedKey(item.label);
                const isVisible = isAdminRoleVisible(roleKey);
                return (
                  <div key={idx} className="flex gap-2 w-full items-center min-h-[20px] group/admin-row">
                     {isVisible ? (
                       <>
                         <span className="w-[140px] shrink-0">{item.label}</span>
                         <span className="font-normal truncate">{renderMilitar(item.value)}</span>
                       </>
                     ) : (
                       /* Espaço vazio ao invés desse texto quando desativado! */
                       <>
                         <span className="w-[140px] shrink-0 opacity-0 select-none">{item.label}</span>
                         <span className="font-normal truncate opacity-0 select-none">&nbsp;</span>
                       </>
                     )}
                     <button
                       type="button"
                       onClick={() => toggleAdminRoleVisibility(roleKey)}
                       className="print:hidden opacity-0 group-hover/admin-row:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5 ml-auto cursor-pointer"
                       title={isVisible ? `Desativar ${item.label} no Gerar Escala` : `Ativar ${item.label} no Gerar Escala`}
                     >
                       {isVisible ? <EyeOff className="w-3 h-3 text-slate-400 hover:text-rose-600" /> : <Eye className="w-3 h-3 text-emerald-600" />}
                     </button>
                  </div>
                );
              })}
           </div>
        </div>

        {/* SENTINELAS & COMUNICANTES */}
        {(() => {
          const isSentinelaVisible = isAdminRoleVisible('SENTINELA');
          const isComunicanteVisible = isAdminRoleVisible('COMUNICANTE');
          const isAuxRanchoVisible = isAdminRoleVisible('AUXILIAR RANCHO');
          const isToqueFogoVisible = isAdminRoleVisible('TOQUE DE FOGO');

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
                     <th className="border-r border-black p-1 uppercase text-left pl-2 escala-ala-header" style={headerBgStyle} colSpan={2}>SENTINELAS:</th>
                     <th className="p-1 uppercase border-black border-l-2 text-center escala-ala-header" style={headerBgStyle} colSpan={1}>COMUNICANTE 1:</th>
                  </tr>
               </thead>
               <tbody className="text-left font-bold uppercase">
                  <tr>
                     <td className="border-r border-black p-1 pl-2 text-left font-bold border-b truncate text-[10px]">
                       <div className="flex items-center gap-1.5 min-w-0">
                         <span className="font-black shrink-0">1º</span>
                         <span className="truncate">{isSentinelaVisible ? renderMilitar(sentinelas[0]) : <span className="opacity-0 select-none">&nbsp;</span>}</span>
                       </div>
                     </td>
                     <td className="border-r border-black p-1 text-center font-normal border-b text-[10px]">6 às 8 / 14 às 16 / 22 às 00:00</td>
                     <td className="border-r border-black p-1 pl-2 text-left font-bold border-b truncate text-[10px]">
                       <div className="flex items-center gap-1.5 min-w-0">
                         <span className="font-black shrink-0">1º</span>
                         <span className="truncate">{isSentinelaVisible ? renderMilitar(sentinelas[4]) : <span className="opacity-0 select-none">&nbsp;</span>}</span>
                       </div>
                     </td>
                     <td className="border-r border-black p-1 text-center font-normal border-b text-[10px]">6 às 7:30 / 12 às 13:30</td>
                     <td className="border-l-2 border-black p-1 font-normal text-center border-b truncate" rowSpan={2}><div className="flex justify-center">{isComunicanteVisible ? renderMilitar(comunicantes[0]) : <span className="opacity-0 select-none">&nbsp;</span>}</div></td>
                  </tr>
                  <tr>
                     <td className="border-r border-black p-1 pl-2 text-left font-bold border-b truncate text-[10px]">
                       <div className="flex items-center gap-1.5 min-w-0">
                         <span className="font-black shrink-0">2º</span>
                         <span className="truncate">{isSentinelaVisible ? renderMilitar(sentinelas[1]) : <span className="opacity-0 select-none">&nbsp;</span>}</span>
                       </div>
                     </td>
                     <td className="border-r border-black p-1 text-center font-normal border-b text-[10px]">8 às 10 / 16 às 18 / 00 às 02:00</td>
                     <td className="border-r border-black p-1 pl-2 text-left font-bold border-b truncate text-[10px]">
                       <div className="flex items-center gap-1.5 min-w-0">
                         <span className="font-black shrink-0">2º</span>
                         <span className="truncate">{isSentinelaVisible ? renderMilitar(sentinelas[5]) : <span className="opacity-0 select-none">&nbsp;</span>}</span>
                       </div>
                     </td>
                     <td className="border-r border-black p-1 text-center font-normal border-b text-[10px]">7:30 às 9 / 13:30 às 15</td>
                  </tr>
                  <tr>
                     <td className="border-r border-black p-1 pl-2 text-left font-bold border-b truncate text-[10px]">
                       <div className="flex items-center gap-1.5 min-w-0">
                         <span className="font-black shrink-0">3º</span>
                         <span className="truncate">{isSentinelaVisible ? renderMilitar(sentinelas[2]) : <span className="opacity-0 select-none">&nbsp;</span>}</span>
                       </div>
                     </td>
                     <td className="border-r border-black p-1 text-center font-normal border-b text-[10px]">10 às 12 / 18 às 20 / 02 às 04:00</td>
                     <td className="border-r border-black p-1 pl-2 text-left font-bold border-b truncate text-[10px]">
                       <div className="flex items-center gap-1.5 min-w-0">
                         <span className="font-black shrink-0">3º</span>
                         <span className="truncate">{isSentinelaVisible ? renderMilitar(sentinelas[6]) : <span className="opacity-0 select-none">&nbsp;</span>}</span>
                       </div>
                     </td>
                     <td className="border-r border-black p-1 text-center font-normal border-b text-[10px]">9 às 10:30 / 15 às 16:30</td>
                     <td className={cn("border-y-2 border-l-2 border-black p-1", headerColorClass, "font-bold text-center escala-ala-header")} style={headerBgStyle}>COMUNICANTE 2:</td>
                  </tr>
                  <tr>
                     <td className="border-r border-black p-1 pl-2 text-left font-bold border-b truncate text-[10px]">
                       <div className="flex items-center gap-1.5 min-w-0">
                         <span className="font-black shrink-0">4º</span>
                         <span className="truncate">{isSentinelaVisible ? renderMilitar(sentinelas[3]) : <span className="opacity-0 select-none">&nbsp;</span>}</span>
                       </div>
                     </td>
                     <td className="border-r border-black p-1 text-center font-normal border-b text-[10px]">12 às 14 / 20 às 22 / 04 às 06:00</td>
                     <td className="border-r border-black p-1 pl-2 text-left font-bold border-b truncate text-[10px]">
                       <div className="flex items-center gap-1.5 min-w-0">
                         <span className="font-black shrink-0">4º</span>
                         <span className="truncate">{isSentinelaVisible ? renderMilitar(sentinelas[7]) : <span className="opacity-0 select-none">&nbsp;</span>}</span>
                       </div>
                     </td>
                     <td className="border-r border-black p-1 text-center font-normal border-b text-[10px]">10:30 às 12/16:30 às 18</td>
                     <td className="border-l-2 border-black p-1 font-normal text-center border-b truncate"><div className="flex justify-center">{isComunicanteVisible ? renderMilitar(comunicantes[1]) : <span className="opacity-0 select-none">&nbsp;</span>}</div></td>
                  </tr>
                  <tr className={cn(headerColorClass, "font-bold border-t-2 border-black escala-ala-header")} style={headerBgStyle}>
                     <td className="border-r border-black p-1 text-center uppercase escala-ala-header" style={headerBgStyle} colSpan={1}>AUX. RANCHO:</td>
                     <td className="border-r border-black p-1 font-normal bg-white text-center truncate" style={{ backgroundColor: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} colSpan={1}>
                       <div className="flex items-center justify-center gap-2">
                         {isAuxRanchoVisible ? (
                           auxRancho.map((m: any, i: number) => <React.Fragment key={i}>{i > 0 && <span>/</span>}{renderMilitar(m)}</React.Fragment>)
                         ) : (
                           <span className="opacity-0 select-none">&nbsp;</span>
                         )}
                       </div>
                     </td>
                     <td className="border-r border-black p-1 text-center uppercase escala-ala-header" style={headerBgStyle} colSpan={1}>Toque de Fogo:</td>
                     <td className="border-black p-1 font-normal bg-white text-center truncate" style={{ backgroundColor: '#ffffff', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} colSpan={2}>
                       <div className="flex items-center justify-center gap-2">
                         {isToqueFogoVisible ? (
                           toqueFogo.map((m: any, i: number) => <React.Fragment key={i}>{i > 0 && <span>/</span>}{renderMilitar(m)}</React.Fragment>)
                         ) : (
                           <span className="opacity-0 select-none">&nbsp;</span>
                         )}
                       </div>
                     </td>
                  </tr>
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
           {expedienteLayout === 'coluna' ? (
              <colgroup>
                 <col className="w-[21%]" />
                 <col className="w-[21%]" />
                 <col className="w-[21%]" />
                 <col className="w-[19%]" />
                 <col className="w-[18%]" />
              </colgroup>
           ) : (
              <colgroup>
                 <col className="w-[20.5%]" />
                 <col className="w-[20.5%]" />
                 <col className="w-[20.5%]" />
                 <col className="w-[20.5%]" />
                 <col className="w-[18%]" />
              </colgroup>
           )}
           <thead>
              <tr className={cn(headerColorClass, "font-bold border-b-2 border-black escala-ala-header")} style={headerBgStyle}>
                 <th className="border-r border-black p-1 text-center uppercase escala-ala-header" style={headerBgStyle} colSpan={expedienteLayout === 'coluna' ? 3 : 4}>CHAMADA GERAL</th>
                 {expedienteLayout === 'coluna' && (
                    <th className="border-r border-black p-1 text-center uppercase escala-ala-header" style={headerBgStyle} colSpan={1}>EXPEDIENTE</th>
                 )}
                 <th className={cn("p-1 text-center uppercase escala-ala-header", expedienteLayout === 'coluna' ? '' : 'w-[18%]')} style={headerBgStyle} colSpan={1}>RAS</th>
              </tr>
           </thead>
           <tbody>
              {(() => {
                 const numCols = expedienteLayout === 'coluna' ? 3 : 4;
                 const chamadaRows = Math.ceil(activeMembersList.length / numCols);
                 const expRows = expedienteLayout === 'coluna' ? (expedienteMilitars?.length || 0) : 0;
                 const rasCount = rasApplications?.length || 0;

                 // Exibir apenas as linhas estritamente necessárias (sem forçar 9 ou linhas vazias desnecessárias)
                 const totalRows = Math.max(chamadaRows, expRows, rasCount, 1);

                 return Array.from({ length: totalRows }).map((_, i) => {
                    const expMil = (expedienteMilitars && expedienteMilitars[i]) || null;

                    const rasItem = rasApplications && rasApplications[i];
                    const rasApp = rasItem ? {
                       rg: rasItem.militarRg || rasItem.rg,
                       name: rasItem.militarName || rasItem.name,
                       warName: rasItem.militarWarName || rasItem.warName,
                       rank: rasItem.militarRank || rasItem.rank,
                    } : null;

                    return (
                       <tr key={i}>
                          {Array.from({ length: numCols }).map((__, colIdx) => {
                             const itemIdx = i * numCols + colIdx;
                             const m = activeMembersList[itemIdx] || null;
                             return (
                                <td key={colIdx} className="border-r border-b border-black p-0.5 px-2 truncate">
                                   {m ? (
                                      <div className="flex gap-1 items-center min-h-[20px]">
                                         <span className="shrink-0">{m.rg} -</span> <span className="truncate">{renderMilitar(m.militar)}</span>
                                      </div>
                                   ) : ''}
                                </td>
                             );
                          })}

                          {expedienteLayout === 'coluna' && (
                             <td className="border-r border-b border-black p-0.5 px-2 truncate">
                                {expMil ? (
                                   <div className="flex gap-1 items-center min-h-[20px]">
                                      <span className="shrink-0">{expMil.rg} -</span>
                                      <span className="truncate">{renderMilitar(expMil.militar || expMil)}</span>
                                      {expMil.is24h && (
                                         <span className="text-[7.5px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-1 rounded ml-1 shrink-0">
                                            24H
                                         </span>
                                      )}
                                   </div>
                                ) : ''}
                             </td>
                          )}

                          {rasCount === 0 ? (
                             i === 0 ? (
                                <td rowSpan={totalRows} className="border-b border-black p-2 text-center text-slate-500 italic font-normal text-[10px] align-middle">
                                   Nenhum RAS realizado
                                </td>
                             ) : null
                          ) : (
                             <td className="border-b border-black p-0.5 text-left pl-2 font-bold text-[9px] truncate">
                                {rasApp ? (
                                   <div className="flex gap-1 items-center min-h-[20px]">
                                      <span className="shrink-0">{i + 1} -</span>
                                      <span className="truncate">{renderMilitar(rasApp)}</span>
                                   </div>
                                ) : ''}
                             </td>
                          )}
                       </tr>
                    );
                 });
              })()}
           </tbody>
        </table>

        {/* EXPEDIENTE DE SERVIÇO (SEÇÃO ESTILO AFASTAMENTOS) */}
        {expedienteLayout === 'secao' && (
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
        )}

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

           const grdMilitarsList = (grdRgs || []).map((rg: string) => {
              if (!rg || !rg.trim()) return '(VAGA ABERTA)';
              const mil = (militars || []).find((m: any) => normalizeRg(m.rg) === normalizeRg(rg));
              if (!mil) return rg ? `RG: ${rg}` : '(VAGA ABERTA)';
              return `${parseRank(mil.rank)} ${mil.warName || (mil.name || '').split(' ')[0]}`;
           });

           const hasGrd = grdMilitarsList.length > 0;
           const obmName = (obmContext || '10º GBM').split('-')[0].trim();

           return (
              <div className="border-2 border-black border-t-0 flex flex-col mb-4">
                 {/* AFASTAMENTOS HEADER */}
                 <div className={cn(headerColorClass, "font-bold border-b-2 border-black text-center p-1 text-[10px] uppercase tracking-wider escala-ala-header")} style={headerBgStyle}>
                    AFASTAMENTOS
                 </div>
                 
                 {/* AFASTAMENTOS LIST */}
                 <div className="p-1.5 px-3 border-b-2 border-black text-[10px] min-h-[30px] font-bold">
                    {afastadosList.length > 0 ? (
                       <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-4 gap-y-1">
                          {afastadosList.map((str: any, idx: number) => <span key={idx}>{str}</span>)}
                       </div>
                    ) : (
                       <div className="text-center font-normal text-slate-500 italic">Nenhum afastamento.</div>
                    )}
                 </div>

                 {/* GRD */}
                 <div className="flex w-full min-h-[40px] items-stretch">
                    <div className="w-[20%] border-r-2 border-black flex items-center justify-center font-black text-[11px] uppercase bg-slate-50 p-2 text-center shrink-0">
                       GRD - {obmName}
                    </div>
                    <div className="w-[80%] p-2 px-4 flex-1">
                       {hasGrd ? (
                          <div className={cn("grid gap-x-6 gap-y-1.5 text-[10px] font-bold uppercase", grdMilitarsList.length > 4 ? "grid-cols-3" : "grid-cols-2")}>
                             {grdMilitarsList.map((str: any, idx: number) => (
                                <div key={idx} className="flex gap-1 items-start">
                                   <span className="shrink-0">{idx + 1}-</span>
                                   <span className={cn("leading-[1.1]", str === '(VAGA ABERTA)' ? "text-slate-400 font-normal italic" : "")}>
                                      {str}
                                   </span>
                                </div>
                             ))}
                          </div>
                       ) : (
                          <div className="text-slate-500 italic font-normal h-full flex items-center text-[10px]">Sem GRD no dia.</div>
                       )}
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
