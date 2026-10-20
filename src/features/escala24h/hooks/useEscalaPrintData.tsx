import React, { useState, useEffect, useMemo, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { RankInsignia } from '../../../components/RankInsignia';
import {
  parseRank,
  sortAllBySeniority,
  formatRankAndName,
  formatRankAbbr
} from '../../../lib/rankUtils';
import {
  cn,
  formatMilitaryName,
  normalizeObm,
  normalizeRg,
  normalizeAlaField,
  getAlaForDate
} from '../../../lib/utils';
import { getStoredAlaNomenclatures } from '../../../lib/alaUtils';
import { OfficerVisibility, UserProfile } from '../../../types';
import { generatePrintHtmlDocument } from '../lib/printHtmlGenerator';

export interface UseEscalaPrintDataProps {
  selectedDate: string;
  identifiedAla: number | string;
  baseRoster: any[];
  permutasOut: any;
  militars: any[];
  selectedFunctions: Record<string, string[]>;
  viaturasInfo: any[];
  rasApplications: any[];
  expedienteMilitars?: any[];
  oficialDia?: string;
  oficialNautica?: string;
  oficialMedico?: string;
  officerVisibility?: OfficerVisibility;
  onOfficerVisibilityChange?: (updated: OfficerVisibility) => void;
  adminRolesVisibility?: Record<string, boolean>;
  onAdminRolesVisibilityChange?: (updated: Record<string, boolean>) => void;
  user?: UserProfile;
  afastamentos?: any[];
  obmContext: string;
  grdRgs?: string[];
  sentinelaRgs?: (string | null)[];
  sentinelaSlots?: any[];
  onRegister?: (data: { isSigned: boolean }) => Promise<void> | void;
  onClose?: () => void;
}

export function useEscalaPrintData(props: UseEscalaPrintDataProps) {
  const {
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
    sentinelaRgs: propSentinelaRgs,
    sentinelaSlots: propSentinelaSlots
  } = props;

  const [showVisualMode, setShowVisualMode] = useState(false);
  const [isExpandedView, setIsExpandedView] = useState(false);
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

  const [viaturaTableLayout, setViaturaTableLayout] = useState<'duplo' | 'classico' | 'antigo'>(() => {
    try {
      const saved = localStorage.getItem('escala_viatura_table_layout');
      if (saved === 'classico' || saved === 'duplo' || saved === 'antigo') return saved;
    } catch {}
    return 'duplo';
  });

  useEffect(() => {
    try {
      localStorage.setItem('escala_viatura_table_layout', viaturaTableLayout);
    } catch {}
  }, [viaturaTableLayout]);

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
      showOficialMedico: true
    };
  });

  useEffect(() => {
    if (propOfficerVisibility) {
      setOfficerVisibility(propOfficerVisibility);
    }
  }, [propOfficerVisibility]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        officerMenuRef.current &&
        !officerMenuRef.current.contains(e.target as Node)
      ) {
        setShowOfficerMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUpdateOfficerVisibility = (
    updater: (prev: OfficerVisibility) => OfficerVisibility
  ) => {
    setOfficerVisibility((prev) => {
      const next = updater(prev);
      try {
        const rawObm = obmContext && obmContext !== 'GLOBAL' ? obmContext : '10º GBM';
        const cleanObm = normalizeObm(rawObm);
        localStorage.setItem(
          `escala_officer_visibility_${cleanObm}`,
          JSON.stringify(next)
        );
      } catch {}
      onOfficerVisibilityChange?.(next);
      return next;
    });
  };

  const toggleOfficerVisibility = (
    key: 'showOficialDia' | 'showOficialNautica' | 'showOficialMedico'
  ) => {
    handleUpdateOfficerVisibility((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      next.showSection =
        next.showOficialDia || next.showOficialNautica || next.showOficialMedico;
      return next;
    });
  };

  const setAllOfficersVisibility = (visible: boolean) => {
    handleUpdateOfficerVisibility(() => ({
      showSection: visible,
      showOficialDia: visible,
      showOficialNautica: visible,
      showOficialMedico: visible
    }));
  };

  const isSectionVisible = officerVisibility.showSection !== false;
  const isDiaVisible = isSectionVisible && officerVisibility.showOficialDia !== false;
  const isNauticaVisible =
    isSectionVisible && officerVisibility.showOficialNautica !== false;
  const isMedicoVisible =
    isSectionVisible && officerVisibility.showOficialMedico !== false;
  const hasAnyVisibleOfficer = isDiaVisible || isNauticaVisible || isMedicoVisible;
  const activeOfficerCount =
    (isDiaVisible ? 1 : 0) + (isNauticaVisible ? 1 : 0) + (isMedicoVisible ? 1 : 0);

  const [adminRolesVisibility, setAdminRolesVisibility] = useState<
    Record<string, boolean>
  >(() => {
    if (propAdminRolesVisibility && Object.keys(propAdminRolesVisibility).length > 0) {
      return propAdminRolesVisibility;
    }
    try {
      const rawObm =
        obmContext && obmContext !== 'GLOBAL' ? obmContext : user?.obm || '10º GBM';
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
      if (
        adminMenuRef.current &&
        !adminMenuRef.current.contains(event.target as Node)
      ) {
        setShowAdminMenu(false);
      }
    }
    if (showAdminMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAdminMenu]);

  const normalize = (s: string) => {
    if (!s) return '';
    return s
      .replace(/[-_]/g, ' ')
      .replace(/\s*\/\s*/g, '/')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  };

  const isAdminRoleVisible = (roleKey: string) => {
    const norm = normalize(roleKey);
    if (norm === 'COMUNICANTE 1') {
      if (adminRolesVisibility['COMUNICANTE 1'] !== undefined)
        return adminRolesVisibility['COMUNICANTE 1'];
      if (adminRolesVisibility['comunicante 1'] !== undefined)
        return adminRolesVisibility['comunicante 1'];
      return true;
    }
    if (norm === 'COMUNICANTE 2') {
      if (adminRolesVisibility['COMUNICANTE 2'] !== undefined)
        return adminRolesVisibility['COMUNICANTE 2'];
      if (adminRolesVisibility['comunicante 2'] !== undefined)
        return adminRolesVisibility['comunicante 2'];
      return true;
    }
    if (adminRolesVisibility[norm] !== undefined)
      return adminRolesVisibility[norm];
    if (adminRolesVisibility[roleKey] !== undefined)
      return adminRolesVisibility[roleKey];
    for (const [k, v] of Object.entries(adminRolesVisibility)) {
      if (normalize(k) === norm) return v;
    }
    return true;
  };

  const toggleAdminRoleVisibility = (roleKey: string) => {
    const norm = normalize(roleKey);
    const current = isAdminRoleVisible(roleKey);
    const next = {
      ...adminRolesVisibility,
      [norm]: !current,
      [roleKey]: !current
    };
    setAdminRolesVisibility(next);
    if (onAdminRolesVisibilityChange) {
      onAdminRolesVisibilityChange(next);
    }
    try {
      const rawObm =
        obmContext && obmContext !== 'GLOBAL' ? obmContext : user?.obm || '10º GBM';
      const cleanObm = normalizeObm(rawObm);
      localStorage.setItem(
        `escala_admin_roles_visibility_${cleanObm}`,
        JSON.stringify(next)
      );
    } catch {}
  };

  const setAllAdminRolesVisibility = (visible: boolean) => {
    const next: Record<string, boolean> = { ...adminRolesVisibility };
    const allAdminKeys = [
      'ADJUNTO',
      'ENCARREGADO DE MOTORISTA',
      'RESP FAXINA',
      'SGT DIA',
      'CMT GUARDA',
      'DIA AO DEPOSITO',
      'ABASTECEDOR',
      'CB DIA',
      'CB GUARDA',
      'COMUNICANTE',
      'COMUNICANTE 1',
      'COMUNICANTE 2',
      'SENTINELA',
      'AUXILIAR RANCHO',
      'TOQUE DE FOGO',
      'ESCALANTE'
    ];
    allAdminKeys.forEach((k) => {
      next[normalize(k)] = visible;
      next[k] = visible;
    });
    setAdminRolesVisibility(next);
    if (onAdminRolesVisibilityChange) {
      onAdminRolesVisibilityChange(next);
    }
    try {
      const rawObm =
        obmContext && obmContext !== 'GLOBAL' ? obmContext : user?.obm || '10º GBM';
      const cleanObm = normalizeObm(rawObm);
      localStorage.setItem(
        `escala_admin_roles_visibility_${cleanObm}`,
        JSON.stringify(next)
      );
    } catch {}
  };

  const getAdminRoleMappedKey = (label: string): string => {
    const clean = label.replace(/[:.]/g, '').trim().toUpperCase();
    if (clean.includes('ENCARREGADO')) return 'ENCARREGADO DE MOTORISTA';
    if (clean.includes('FAXINA')) return 'RESP FAXINA';
    if (clean.includes('SGT')) return 'SGT DIA';
    if (clean.includes('CMT')) return 'CMT GUARDA';
    if (clean.includes('DEPOSITO') || clean.includes('DEPÓSITO'))
      return 'DIA AO DEPOSITO';
    if (clean.includes('ABASTECEDOR')) return 'ABASTECEDOR';
    if (clean.includes('CB DIA') || clean.includes('CB DE DIA')) return 'CB DIA';
    if (clean.includes('CB GUARDA') || clean.includes('CB DA GUARDA'))
      return 'CB GUARDA';
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
    if (
      Array.isArray(initialExpedienteMilitars) &&
      initialExpedienteMilitars.length > 0
    ) {
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

        const activeList = Array.from(allExpDutyRgs).filter((rg) => {
          const cleanTargetRg = normalizeRg(rg);
          const isAfastado = (afastamentos || []).some((a: any) => {
            return (
              normalizeRg(a.rg) === cleanTargetRg &&
              selectedDate >= a.inicio &&
              selectedDate <= a.retorno
            );
          });
          return !isAfastado;
        });

        const result = activeList.map((rg) => {
          const cleanTargetRg = normalizeRg(rg);
          const mil = (militars || []).find(
            (m: any) => normalizeRg(m.rg) === cleanTargetRg || m.uid === rg
          );
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
      console.error('Erro sincronizando expediente na escala:', err);
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
        console.error('Erro ao buscar GRD:', err);
      }
    };
    fetchGrd();
  }, [selectedDate, obmContext, propGrdRgs]);

  const [alaCustomNames, setAlaCustomNames] = useState<Record<string, string>>(() =>
    getStoredAlaNomenclatures()
  );

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'system_config', 'ala_nomenclatures'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data && data.names) {
            setAlaCustomNames((prev) => ({ ...prev, ...data.names }));
          }
        }
      },
      (err) => console.warn('Could not listen to ala_nomenclatures:', err)
    );

    const handleLocalUpdate = (e: any) => {
      if (e.detail) {
        setAlaCustomNames((prev) => ({ ...prev, ...e.detail }));
      }
    };
    window.addEventListener('cbmerj-ala-names-updated', handleLocalUpdate);

    return () => {
      unsub();
      window.removeEventListener('cbmerj-ala-names-updated', handleLocalUpdate);
    };
  }, []);

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

    const customName = alaCustomNames[String(alaNum)];

    switch (alaNum) {
      case 1:
        return {
          num: 1,
          name: customName || 'ALA 1',
          label: 'VERDE',
          bgClass: 'bg-emerald-200',
          bgHex: '#a7f3d0',
          borderHex: '#6ee7b7',
          textHex: '#000000'
        };
      case 2:
        return {
          num: 2,
          name: customName || 'ALA 2',
          label: 'VERMELHA',
          bgClass: 'bg-rose-200',
          bgHex: '#fecdd3',
          borderHex: '#fda4af',
          textHex: '#000000'
        };
      case 3:
        return {
          num: 3,
          name: customName || 'ALA 3',
          label: 'AZUL',
          bgClass: 'bg-blue-200',
          bgHex: '#bfdbfe',
          borderHex: '#93c5fd',
          textHex: '#000000'
        };
      case 4:
        return {
          num: 4,
          name: customName || 'ALA 4',
          label: 'AMARELA',
          bgClass: 'bg-amber-200',
          bgHex: '#fde68a',
          borderHex: '#fcd34d',
          textHex: '#000000'
        };
      default:
        return {
          num: 1,
          name: customName || 'ALA 1',
          label: 'VERDE',
          bgClass: 'bg-slate-200',
          bgHex: '#e2e8f0',
          borderHex: '#cbd5e1',
          textHex: '#000000'
        };
    }
  }, [identifiedAla, selectedDate, alaCustomNames]);

  const headerColorClass = alaTheme.bgClass;
  const headerBgStyle = useMemo(
    () => ({
      backgroundColor: alaTheme.bgHex,
      color: '#000000',
      WebkitPrintColorAdjust: 'exact' as const,
      printColorAdjust: 'exact' as const
    }),
    [alaTheme.bgHex]
  );

  const getByFunc = (funcName: string) => {
    const targetNorm = normalize(funcName);
    return baseRoster
      .filter((m: any) => {
        const rg = m.rg || '';
        const funcs = selectedFunctions[rg] || [];
        const hasSelectedFunc = funcs.some((f: string) => {
          const fNorm = normalize(f);
          if (fNorm === targetNorm) return true;

          if (
            targetNorm === 'AUXILIAR RANCHO' &&
            (fNorm === 'AUX RANCHO' || fNorm === 'RANCHO' || fNorm.includes('RANCHO'))
          )
            return true;
          if (
            targetNorm === 'TOQUE DE FOGO' &&
            (fNorm === 'T FOGO' ||
              fNorm === 'TQ FOGO' ||
              fNorm === 'T. FOGO' ||
              fNorm.includes('FOGO'))
          )
            return true;
          if (targetNorm === 'SENTINELA' && fNorm.includes('SENTINELA')) return true;
          if (targetNorm === 'COMUNICANTE' && fNorm.includes('COMUNICANTE')) return true;
          if (targetNorm === 'COMUNICANTE 1' && fNorm === 'COMUNICANTE 1') return true;
          if (targetNorm === 'COMUNICANTE 2' && fNorm === 'COMUNICANTE 2') return true;
          if (
            targetNorm === 'ENCARREGADO DE MOTORISTA' &&
            (fNorm === 'ENC MOTORISTA' ||
              (fNorm.includes('ENC') && fNorm.includes('MOTORISTA')))
          )
            return true;
          if (targetNorm === 'RESP FAXINA' && fNorm.includes('FAXINA')) return true;
          if (
            targetNorm === 'DIA AO DEPOSITO' &&
            (fNorm.includes('DEPOSITO') || fNorm === 'DEPOSITO')
          )
            return true;
          if (targetNorm === 'SGT DIA' && fNorm.includes('SGT') && fNorm.includes('DIA'))
            return true;
          if (targetNorm === 'CB DIA' && fNorm.includes('CB') && fNorm.includes('DIA'))
            return true;
          if (
            targetNorm === 'CB GUARDA' &&
            fNorm.includes('CB') &&
            fNorm.includes('GUARDA')
          )
            return true;
          if (
            targetNorm === 'CMT GUARDA' &&
            fNorm.includes('CMT') &&
            fNorm.includes('GUARDA')
          )
            return true;
          if (targetNorm === 'ADJUNTO' && fNorm.includes('ADJUNTO')) return true;
          if (targetNorm === 'ABASTECEDOR' && fNorm.includes('ABASTECEDOR')) return true;

          if (f.trim().toUpperCase() === funcName.trim().toUpperCase()) return true;
          return fNorm.includes(targetNorm) || targetNorm.includes(fNorm);
        });
        if (hasSelectedFunc) return true;
        if (
          (targetNorm === 'COMUNICANTE' || targetNorm === 'COMUNICANTE 1') &&
          m.ativoComunicante
        ) {
          const otherRoles = funcs.filter(
            (f: string) => !normalize(f).includes('COMUNICANTE')
          );
          if (otherRoles.length === 0) return true;
        }
        return false;
      })
      .map((m: any) => {
        const rg = m.rg || '';
        const isSwapped = permutasOut.has(rg);
        const actualMilitar = isSwapped
          ? militars.find((x: any) => x.rg === permutasOut.get(rg)?.substituteRg) || m
          : m;
        return actualMilitar;
      });
  };

  const isRasMilitar = (militar: any) => {
    if (!militar?.rg) return false;
    const cleanRg = normalizeRg(militar.rg);
    if (!cleanRg) return false;
    return Boolean(
      (rasApplications || []).some(
        (app: any) => normalizeRg(app?.militarRg || app?.rg) === cleanRg
      )
    );
  };

  const renderRasBadge = () => (
    <span
      className="inline-flex items-center px-1 py-[0.5px] ml-1 rounded text-[7.5px] sm:text-[8px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 border border-amber-400 shrink-0 leading-none align-middle"
      style={{
        backgroundColor: '#fde68a',
        color: '#78350f',
        borderColor: '#f59e0b',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact'
      }}
    >
      RAS
    </span>
  );

  const renderMilitar = (
    militar: any,
    options?: { compact?: boolean; hideRank?: boolean }
  ) => {
    if (!militar) return '';
    const isRas = isRasMilitar(militar);
    const compact = options?.compact ?? false;
    const hideRank = options?.hideRank ?? compact;

    if (showVisualMode) {
      const rawName =
        militar.warName?.toUpperCase() ||
        formatMilitaryName(militar.name || '') ||
        '';
      const rankAbbr = formatRankAbbr(militar.rank);

      // Tamanho de fonte reativo e sem truncamento por reticências
      let nameFontSizeClass = 'text-[9.5px]';
      if (compact) {
        if (rawName.length > 12) {
          nameFontSizeClass = 'text-[7.5px] tracking-tighter';
        } else if (rawName.length > 9) {
          nameFontSizeClass = 'text-[8px] tracking-tight';
        } else if (rawName.length > 7) {
          nameFontSizeClass = 'text-[8.5px] tracking-tight';
        } else {
          nameFontSizeClass = 'text-[9px]';
        }
      } else {
        if (rawName.length > 14) {
          nameFontSizeClass = 'text-[8px] tracking-tight';
        } else if (rawName.length > 10) {
          nameFontSizeClass = 'text-[8.5px] tracking-tight';
        } else {
          nameFontSizeClass = 'text-[9.5px]';
        }
      }

      return (
        <div className="inline-flex items-center justify-center gap-1 max-w-full leading-tight align-middle">
          <div className="shrink-0 flex items-center justify-center opacity-90">
            <RankInsignia rankStr={militar.rank} size="xs" className="w-3.5 h-3.5 shrink-0" />
          </div>
          <div className="inline-flex items-center gap-1 min-w-0">
            {!hideRank && rankAbbr && (
              <span className="text-[7.5px] font-bold text-slate-500 uppercase leading-none shrink-0">
                {rankAbbr}
              </span>
            )}
            <span
              className={cn(
                'font-black uppercase text-slate-900 leading-none whitespace-normal break-words',
                nameFontSizeClass
              )}
            >
              {rawName}
            </span>
            {isRas && renderRasBadge()}
          </div>
        </div>
      );
    }
    const formatted = formatRankAndName(militar);
    if (!formatted) return '';
    if (!isRas) return formatted;
    return (
      <>
        <span>{formatted}</span>
        {renderRasBadge()}
      </>
    );
  };

  // Obter todos os militares com função de comunicante (qualquer variação que inclua COMUNICANTE)
  const allComRaw = getByFunc('COMUNICANTE');
  const uniqueComMilitars: any[] = [];
  const seenComRgs = new Set<string>();
  allComRaw.forEach((m: any) => {
    const id = m?.rg || m?.id;
    if (id && !seenComRgs.has(id)) {
      seenComRgs.add(id);
      uniqueComMilitars.push(m);
    }
  });

  const explicitCom1 = uniqueComMilitars.find((m: any) => {
    const funcs = selectedFunctions[m?.rg] || [];
    return funcs.some(f => normalize(f) === 'COMUNICANTE 1');
  });
  const explicitCom2 = uniqueComMilitars.find((m: any) => {
    const funcs = selectedFunctions[m?.rg] || [];
    return funcs.some(f => normalize(f) === 'COMUNICANTE 2');
  });

  let com1Militars: any[] = [];
  let com2Militars: any[] = [];

  if (uniqueComMilitars.length === 1) {
    com1Militars = [uniqueComMilitars[0]];
    com2Militars = [];
  } else if (uniqueComMilitars.length >= 2) {
    if (explicitCom1 && explicitCom2 && explicitCom1.rg !== explicitCom2.rg) {
      com1Militars = [explicitCom1];
      com2Militars = [explicitCom2];
    } else {
      com1Militars = [uniqueComMilitars[0]];
      com2Militars = [uniqueComMilitars[1]];
    }
  }

  const comunicantes = [...com1Militars, ...com2Militars];
  const auxRancho = getByFunc('AUXILIAR RANCHO');
  const toqueFogo = getByFunc('TOQUE DE FOGO');

  const sentinelas = useMemo(() => {
    const isRgValidForDay = (rgStr: string) => {
      if (baseRoster.length === 0) return true;
      const clean = normalizeRg(rgStr);
      if (baseRoster.some((m: any) => normalizeRg(m.rg) === clean)) return true;
      if (permutasOut.has(clean)) return true;
      for (const p of permutasOut.values()) {
        if (p?.substituteRg && normalizeRg(p.substituteRg) === clean) return true;
      }
      return false;
    };

    if (
      propSentinelaSlots &&
      Array.isArray(propSentinelaSlots) &&
      propSentinelaSlots.length > 0
    ) {
      return propSentinelaSlots.map((slot: any) => {
        const rg = slot?.rg;
        if (!rg) return null;
        const clean = normalizeRg(rg);
        if (!isRgValidForDay(clean)) return null;
        const isSwapped = permutasOut.has(clean);
        const subRg = isSwapped ? permutasOut.get(clean)?.substituteRg : clean;
        return (
          baseRoster.find((m: any) => normalizeRg(m.rg) === subRg) ||
          militars.find((m: any) => normalizeRg(m.rg) === subRg) ||
          null
        );
      });
    }
    if (
      propSentinelaRgs &&
      Array.isArray(propSentinelaRgs) &&
      propSentinelaRgs.length > 0
    ) {
      return propSentinelaRgs.map((rg: string | null) => {
        if (!rg) return null;
        const clean = normalizeRg(rg);
        if (!isRgValidForDay(clean)) return null;
        const isSwapped = permutasOut.has(clean);
        const subRg = isSwapped ? permutasOut.get(clean)?.substituteRg : clean;
        return (
          baseRoster.find((m: any) => normalizeRg(m.rg) === subRg) ||
          militars.find((m: any) => normalizeRg(m.rg) === subRg) ||
          null
        );
      });
    }
    return getByFunc('SENTINELA');
  }, [
    propSentinelaSlots,
    propSentinelaRgs,
    militars,
    baseRoster,
    permutasOut,
    selectedFunctions
  ]);

  const adminRoles = {
    'ADJUNTO:': getByFunc('ADJUNTO'),
    'ENCARREGADO DE MOTORIS:': getByFunc('ENCARREGADO DE MOTORISTA'),
    'RESP. P/ FAXINA:': getByFunc('RESP FAXINA'),
    'SGT DE DIA:': getByFunc('SGT DIA'),
    'CMT DA GUARDA:': getByFunc('CMT GUARDA')
  };

  const diaDepositoList = getByFunc('DIA AO DEPOSITO');
  const adminRolesRight = [
    { label: 'DIA AO DEPÓSITO:', values: diaDepositoList.slice(0, 1) },
    { label: 'DIA AO DEPÓSITO:', values: diaDepositoList.slice(1) },
    { label: 'ABASTECEDOR:', values: getByFunc('ABASTECEDOR') },
    { label: 'CB DE DIA:', values: getByFunc('CB DIA') },
    { label: 'CB DA GUARDA:', values: getByFunc('CB GUARDA') }
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

  const dateStr = selectedDate
    ? format(safeDateObj, "dd 'DE' MMMM 'DE' yyyy", { locale: ptBR }).toUpperCase()
    : '';
  const shortDateStr = selectedDate ? format(safeDateObj, 'dd/MM/yyyy') : '';

  const activeMembersList = useMemo(() => {
    return (baseRoster || [])
      .map((item: any) => {
        const m = item?.militar || item;
        const cleanRg = normalizeRg(m?.rg || '');
        const isSwapped = Boolean(
          cleanRg &&
            permutasOut &&
            (permutasOut instanceof Map
              ? permutasOut.has(cleanRg) || permutasOut.has(m?.rg)
              : permutasOut.has?.(cleanRg) || permutasOut.has?.(m?.rg))
        );
        let subRg = cleanRg;
        if (isSwapped && permutasOut && permutasOut instanceof Map) {
          const perm = permutasOut.get(cleanRg) || permutasOut.get(m?.rg);
          if (perm?.substituteRg) {
            subRg = normalizeRg(perm.substituteRg);
          }
        }
        const actualMilitar =
          (militars || []).find((x: any) => normalizeRg(x.rg) === subRg) ||
          (militars || []).find((x: any) => x.rg === subRg) ||
          m;
        const resolved = actualMilitar?.militar || actualMilitar || m;
        const label =
          formatRankAndName(resolved) ||
          [resolved?.rank, resolved?.warName || resolved?.name]
            .filter(Boolean)
            .join(' ') ||
          resolved?.rg ||
          cleanRg;
        return {
          rg: resolved?.rg || m?.rg || cleanRg,
          militar: resolved,
          label
        };
      })
      .sort((a: any, b: any) => sortAllBySeniority(a.militar, b.militar));
  }, [baseRoster, permutasOut, militars]);

  const permutasAtivas = Array.from(permutasOut.values()).map((p: any) => {
    const sub = militars.find((x: any) => x.rg === p.substituteRg);
    const req = militars.find((x: any) => x.rg === p.requesterRg);
    return {
      req,
      sub,
      text: `Sai: ${formatRankAndName(req)} - Entra: ${formatRankAndName(sub)}`
    };
  });

  const generatePrintHtml = () => {
    return generatePrintHtmlDocument(
      'escala-print-sheet',
      `Escala de Serviço 24h - ${dateStr || shortDateStr}`,
      alaTheme
    );
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const html = generatePrintHtml();
      if (html) {
        try {
          const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          setPrintFallbackUrl(url);
        } catch (e) {
          console.warn('Blob generation error:', e);
        }
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [
    selectedDate,
    identifiedAla,
    baseRoster,
    selectedFunctions,
    viaturasInfo,
    rasApplications,
    isSigned,
    showVisualMode,
    alaTheme,
    officerVisibility,
    adminRolesVisibility
  ]);

  const handlePrintEscala = () => {
    const fullHtml = generatePrintHtml();

    if (fullHtml) {
      try {
        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        setPrintFallbackUrl(url);
      } catch (e) {
        console.warn('Blob generation error:', e);
      }
    }

    let winOpened = false;
    if (fullHtml) {
      try {
        const printWin = window.open('', '_blank');
        if (printWin) {
          printWin.document.open();
          printWin.document.write(fullHtml);
          printWin.document.close();
          winOpened = true;
        }
      } catch (err) {
        console.warn('window.open falhou:', err);
      }
    }

    if (!winOpened) {
      try {
        window.print();
      } catch (e) {
        console.warn('window.print() direto não pôde ser executado:', e);
      }
    }
  };

  return {
    showVisualMode,
    setShowVisualMode,
    isExpandedView,
    setIsExpandedView,
    showLogoModal,
    setShowLogoModal,
    isSigned,
    setIsSigned,
    isRegistering,
    setIsRegistering,
    grdRgs,
    setGrdRgs,
    printFallbackUrl,
    showOfficerMenu,
    setShowOfficerMenu,
    officerMenuRef,
    officerTableLayout,
    setOfficerTableLayout,
    viaturaTableLayout,
    setViaturaTableLayout,
    officerVisibility,
    toggleOfficerVisibility,
    setAllOfficersVisibility,
    isDiaVisible,
    isNauticaVisible,
    isMedicoVisible,
    hasAnyVisibleOfficer,
    activeOfficerCount,
    adminRolesVisibility,
    showAdminMenu,
    setShowAdminMenu,
    adminMenuRef,
    isAdminRoleVisible,
    toggleAdminRoleVisibility,
    setAllAdminRolesVisibility,
    getAdminRoleMappedKey,
    expedienteMilitars,
    alaCustomNames,
    alaTheme,
    headerColorClass,
    headerBgStyle,
    getByFunc,
    renderMilitar,
    isRasMilitar,
    renderRasBadge,
    com1Militars,
    com2Militars,
    comunicantes,
    auxRancho,
    toqueFogo,
    sentinelas,
    adminRoles,
    diaDepositoList,
    adminRolesRight,
    dateStr,
    shortDateStr,
    activeMembersList,
    permutasAtivas,
    handlePrintEscala
  };
}
