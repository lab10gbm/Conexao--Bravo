import React, { useState, useEffect, useMemo } from 'react';
import { useMilitars } from '../contexts/MilitarContext';
import { db } from '../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  Settings, 
  ShieldCheck, 
  Anchor, 
  Search, 
  Check, 
  ArrowLeft, 
  Calendar,
  RefreshCw, 
  CheckCircle2,
  Users,
  UserPlus,
  Stethoscope,
  Plus,
  Trash2,
  Sliders,
  Layers,
  Award,
  Flame,
  Compass,
  Star,
  LifeBuoy,
  AlertTriangle,
  Waves,
  Crosshair,
  ToggleLeft,
  ToggleRight,
  Info
} from 'lucide-react';
import { parseRank, COLS_OFICIAIS, sortOfficersBySeniority, stripRankPrefix } from '../lib/rankUtils';
import { UserProfile } from '../types';
import { cn, cleanUndefined, normalizeObm } from '../lib/utils';
import { AdicionarMilitarModal } from './AdicionarMilitarModal';
import { NovaSecaoOficialModal } from './NovaSecaoOficialModal';
import { OfficerSectionItem, getDefaultSectionsForObm } from '../types/officerSections';
import { resolveCanonicalScope, formatScopeLabel } from '../lib/canonicalScope';

interface OficiaisConfigModuleProps {
  obmContext?: string;
  onClose?: () => void;
  user?: UserProfile;
}

const AVAILABLE_UNITS = [
  '10º GBM',
  '1/10',
  '2/10',
  '3/10',
  '4/10',
  '26º GBM',
  '1/26'
];

const formatToInputDate = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  if (dateStr.length >= 10 && dateStr.charAt(4) === '-' && dateStr.charAt(7) === '-') {
    return dateStr.substring(0, 10);
  }
  return '';
};

const formatToDisplayDate = (dateStr?: string | null): string => {
  if (!dateStr) return '-';
  if (dateStr.includes('/')) return dateStr;
  if (dateStr.length >= 10 && dateStr.charAt(4) === '-' && dateStr.charAt(7) === '-') {
    const [y, m, d] = dateStr.substring(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  return dateStr;
};

const normalizePoolDocId = (obm?: string): string => {
  const raw = (obm || '10º GBM').trim();
  if (raw === 'GLOBAL') return '10º_GBM';
  return raw.replace(/°/g, 'º').replace(/\//g, '_').replace(/\s/g, '_');
};

const getSectionIcon = (iconName: string) => {
  switch (iconName) {
    case 'anchor': return Anchor;
    case 'stethoscope': return Stethoscope;
    case 'flame': return Flame;
    case 'award': return Award;
    case 'compass': return Compass;
    case 'star': return Star;
    case 'lifebuoy': return LifeBuoy;
    case 'waves': return Waves;
    case 'crosshair': return Crosshair;
    case 'shield':
    default:
      return ShieldCheck;
  }
};

const getSectionColorStyles = (colorName: string) => {
  switch (colorName) {
    case 'cyan':
      return { bg: 'bg-cyan-600', text: 'text-cyan-600 dark:text-cyan-400', badge: 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800' };
    case 'rose':
      return { bg: 'bg-rose-600', text: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' };
    case 'emerald':
      return { bg: 'bg-emerald-600', text: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
    case 'amber':
      return { bg: 'bg-amber-600', text: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
    case 'blue':
      return { bg: 'bg-blue-600', text: 'text-blue-600 dark:text-blue-400', badge: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
    case 'purple':
      return { bg: 'bg-purple-600', text: 'text-purple-600 dark:text-purple-400', badge: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' };
    case 'indigo':
    default:
      return { bg: 'bg-indigo-600', text: 'text-indigo-600 dark:text-indigo-400', badge: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' };
  }
};

export function OficiaisConfigModule({ obmContext = '10º GBM', onClose }: OficiaisConfigModuleProps) {
  const { militars, refreshMilitars, updateMilitarLocal } = useMilitars();

  const [activeUnit, setActiveUnit] = useState<string>(obmContext === 'GLOBAL' ? '10º GBM' : obmContext);
  const [activeTab, setActiveTab] = useState<'sections' | 'officers' | 'seniority'>('sections');
  
  // Seções configuradas para a unidade ativa
  const [sections, setSections] = useState<OfficerSectionItem[]>(() => getDefaultSectionsForObm(activeUnit));
  
  // Piscinas de oficiais por seção
  const [poolConfig, setPoolConfig] = useState<Record<string, string[]>>({
    servicosGrd: [],
    nucleoNautico: [],
    oficiaisMedicos: []
  });

  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [savingPromotionRg, setSavingPromotionRg] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [showAddMilitarModal, setShowAddMilitarModal] = useState(false);
  const [showNovaSecaoModal, setShowNovaSecaoModal] = useState(false);

  const docId = normalizePoolDocId(activeUnit);

  // 1. Carrega Seções da Unidade Ativa (API + Firestore)
  useEffect(() => {
    let isMounted = true;

    // Busca via API do backend
    fetch(`/api/officer-sections?obm=${encodeURIComponent(activeUnit)}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && Array.isArray(data.sections)) {
          setSections(data.sections);
        }
      })
      .catch(() => {});

    // Sincronização em tempo real via Firestore
    const unsub = onSnapshot(doc(db, 'officer_sections_config', docId), (snap) => {
      if (!isMounted) return;
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.sections) && data.sections.length > 0) {
          setSections(data.sections);
        }
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [docId, activeUnit]);

  // 2. Carrega Piscinas de Oficiais da Unidade Ativa (API + Firestore)
  useEffect(() => {
    let isMounted = true;

    fetch(`/api/officer-pool?obm=${encodeURIComponent(activeUnit)}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && data.config) {
          setPoolConfig(data.config);
        }
      })
      .catch(() => {});

    const unsub = onSnapshot(doc(db, 'officer_pool_config', docId), (snap) => {
      if (!isMounted) return;
      if (snap.exists()) {
        const data = snap.data() as Record<string, any>;
        setPoolConfig(data);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [docId, activeUnit]);

  // Alterna ativação de uma seção (Switch On/Off)
  const handleToggleSection = async (sectionId: string) => {
    setSaving(true);
    try {
      const updatedSections = sections.map(sec => {
        if (sec.id === sectionId) {
          return { ...sec, enabled: !sec.enabled };
        }
        return sec;
      });

      // Atualização otimista local
      setSections(updatedSections);

      // Persistência via API Backend
      await fetch('/api/officer-sections/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          obm: activeUnit,
          sections: updatedSections
        })
      });

      // Persistência com fallback seguro no Firestore
      try {
        await setDoc(doc(db, 'officer_sections_config', docId), cleanUndefined({
          obm: activeUnit,
          docId,
          updatedAt: new Date().toISOString(),
          sections: updatedSections
        }), { merge: true });
      } catch (clientWriteErr: any) {
        console.warn('[OficiaisConfig] Firestore write handled via backend API:', clientWriteErr?.message);
      }

      const targetSec = updatedSections.find(s => s.id === sectionId);
      setActionNotice(`Seção "${targetSec?.name}" ${targetSec?.enabled ? 'ativada' : 'desativada'} para ${activeUnit}!`);
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      console.error('Erro ao alternar status da seção:', err);
      alert(`Falha ao alterar seção: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Cria uma nova seção personalizada para a unidade
  const handleSaveNovaSecao = async (newSection: OfficerSectionItem) => {
    const updatedSections = [...sections, newSection];
    setSections(updatedSections);

    await fetch('/api/officer-sections/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        obm: activeUnit,
        sections: updatedSections
      })
    });

    try {
      await setDoc(doc(db, 'officer_sections_config', docId), cleanUndefined({
        obm: activeUnit,
        docId,
        updatedAt: new Date().toISOString(),
        sections: updatedSections
      }), { merge: true });
    } catch (clientWriteErr: any) {
      console.warn('[OficiaisConfig] Firestore write handled via backend API:', clientWriteErr?.message);
    }

    setActionNotice(`Seção "${newSection.name}" criada com sucesso para ${activeUnit}!`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Remove seção personalizada
  const handleDeleteSecao = async (sectionId: string, sectionName: string) => {
    if (!window.confirm(`Deseja realmente remover a seção "${sectionName}" de ${activeUnit}?`)) return;

    setSaving(true);
    try {
      const updatedSections = sections.filter(sec => sec.id !== sectionId);
      setSections(updatedSections);

      await fetch('/api/officer-sections/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          obm: activeUnit,
          sections: updatedSections
        })
      });

      try {
        await setDoc(doc(db, 'officer_sections_config', docId), cleanUndefined({
          obm: activeUnit,
          docId,
          updatedAt: new Date().toISOString(),
          sections: updatedSections
        }), { merge: true });
      } catch (clientWriteErr: any) {}

      setActionNotice(`Seção "${sectionName}" removida de ${activeUnit}.`);
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      alert(`Erro ao remover seção: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Lista de oficiais da unidade ordenados estritamente por Antiguidade
  const allOfficers = useMemo(() => {
    return militars.filter(m => {
      const rawMObm = m.obm ? m.obm : '10º GBM';
      const mObm = rawMObm.replace(/º/g, '°').trim().toUpperCase();
      const mAtuacao = (m.obmAtuacao || '').replace(/º/g, '°').trim().toUpperCase();
      const ctxObm = (activeUnit || '').replace(/º/g, '°').trim().toUpperCase();
      
      if (ctxObm && ctxObm !== 'GLOBAL') {
        const matchesObm = mObm === ctxObm || mAtuacao === ctxObm;
        if (!matchesObm) return false;
      }
      const r = parseRank(m.rank);
      const q = (m.quadro || '').toUpperCase();
      const isMed = m.isMedico === true || q.includes('QOS/MÉD') || q.includes('QOS/MED');
      return COLS_OFICIAIS.includes(r) || isMed;
    }).sort(sortOfficersBySeniority);
  }, [militars, activeUnit]);

  const filteredOfficers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return allOfficers;
    return allOfficers.filter(o => {
      const rank = (o.rank || '').toLowerCase();
      const warName = (o.warName || '').toLowerCase();
      const name = (o.name || '').toLowerCase();
      const rg = (o.rg || '').toString().toLowerCase();
      return rank.includes(term) || warName.includes(term) || name.includes(term) || rg.includes(term);
    });
  }, [allOfficers, searchTerm]);

  // Seções habilitadas nesta OBM
  const activeSections = useMemo(() => {
    return sections.filter(sec => sec.enabled);
  }, [sections]);

  // Mapeamento de chave de piscina para cada seção
  const getPoolKeyForSection = (section: OfficerSectionItem): string => {
    if (section.id === 'servicos-grd') return 'servicosGrd';
    if (section.id === 'nucleo-nautico') return 'nucleoNautico';
    if (section.id === 'oficiais-medicos') return 'oficiaisMedicos';
    return section.id;
  };

  // Toggle de participação do militar em qualquer seção (padrão ou personalizada)
  const toggleOfficer = async (section: OfficerSectionItem, rawRg: string | number) => {
    const rg = String(rawRg || '').trim();
    if (!rg) return;

    const moduleKey = getPoolKeyForSection(section);

    setSaving(true);
    try {
      const currentList = (poolConfig[moduleKey] || []).map(r => String(r).trim());
      const isAlreadyIn = currentList.some(r => r === rg);
      const newList = isAlreadyIn 
        ? currentList.filter(r => r !== rg) 
        : [...currentList, rg];
      
      const newConfig = { 
        ...poolConfig, 
        [moduleKey]: newList 
      };

      setPoolConfig(newConfig);

      await fetch('/api/officer-pool/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          obm: activeUnit,
          moduleKey,
          rgs: newList,
          config: newConfig
        })
      }).catch(e => console.warn('[OficiaisConfig] Aviso na chamada da API officer-pool:', e));

      try {
        await setDoc(doc(db, 'officer_pool_config', docId), cleanUndefined(newConfig), { merge: true });
      } catch (clientWriteErr: any) {
        console.warn('[OficiaisConfig] Firestore write handled via backend API:', clientWriteErr?.message);
      }
    } catch (err) {
      console.error('Erro ao atualizar participação em módulo:', err);
    } finally {
      setSaving(false);
    }
  };

  // Atualização da Data de Promoção do Oficial
  const handleUpdatePromotionDate = async (rg: string, newDate: string) => {
    setSavingPromotionRg(rg);
    try {
      updateMilitarLocal(rg, { promotionDate: newDate });

      await fetch('/api/militar/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rg,
          data: { promotionDate: newDate }
        })
      });

      try {
        const cleanRg = rg.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const militarRef = doc(db, 'militaries', cleanRg);
        await setDoc(militarRef, { promotionDate: newDate }, { merge: true });
      } catch (clientWriteErr: any) {}

      setActionNotice(`Data de promoção do RG ${rg} atualizada com sucesso (${formatToDisplayDate(newDate)})!`);
      setTimeout(() => setActionNotice(null), 3500);

      await refreshMilitars(rg);
    } catch (err: any) {
      console.error('Erro ao atualizar data de promoção:', err);
      alert(`Falha ao salvar data de promoção: ${err.message}`);
    } finally {
      setSavingPromotionRg(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 lg:p-8 animate-in fade-in zoom-in-95 duration-500 w-full relative">
      {/* Botão Voltar se fornecido */}
      {onClose && (
        <div className="mb-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors uppercase font-black text-[10.5px] tracking-widest group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Voltar
          </button>
        </div>
      )}

      {/* Header com Nome Oficial e Seletor de OBM/DBM */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-700 to-slate-900 text-white flex items-center justify-center shadow-lg shadow-indigo-100 dark:shadow-none shrink-0 border border-indigo-400/20">
            <Settings className="w-7 h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                Configuração Serviços de Oficiais
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 px-3 py-1 rounded-xl">
                {activeUnit}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Gerencie as seções e escalas ativas para cada OBM/DBM, crie novas divisões especializadas e determine os oficiais habilitados com controle de antiguidade.
            </p>
          </div>
        </div>

        {/* Seletor Rápido de OBM / DBM */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
              Unidade / DBM Selecionado
            </span>
            <select
              value={activeUnit}
              onChange={(e) => setActiveUnit(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all cursor-pointer"
            >
              {AVAILABLE_UNITS.map(unit => (
                <option key={unit} value={unit}>
                  {unit === '10º GBM' ? '10º GBM - Angra (Sede)' :
                   unit === '26º GBM' ? '26º GBM - Paraty (Sede)' :
                   `DBM ${unit}`}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowAddMilitarModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-2xl text-[10.5px] uppercase font-black tracking-wider transition-all shadow-md shadow-blue-200 dark:shadow-none cursor-pointer self-end"
            title="Adicionar Militar diretamente ao Banco de Dados e Servidor"
          >
            <UserPlus className="w-4 h-4" />
            <span>Adicionar Militar</span>
          </button>
        </div>
      </div>

      {/* Notificação de Feedback */}
      {actionNotice && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-200 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Navegação por Abas */}
      <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('sections')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
            activeTab === 'sections'
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          )}
        >
          <Layers className="w-4 h-4" />
          <span>Seções da Unidade ({sections.filter(s => s.enabled).length}/{sections.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('officers')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
            activeTab === 'officers'
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          )}
        >
          <Users className="w-4 h-4" />
          <span>Habilitação de Oficiais ({allOfficers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('seniority')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
            activeTab === 'seniority'
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          )}
        >
          <Calendar className="w-4 h-4" />
          <span>Antiguidade & Promoção</span>
        </button>
      </div>

      {/* CONTEÚDO DA ABA 1: GESTÃO E CRIAÇÃO DE SEÇÕES DA OBM / DBM */}
      {activeTab === 'sections' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Ative ou desative seções conforme a realidade de <strong>{activeUnit}</strong>. Por exemplo, o <strong>Núcleo Náutico</strong> existe no 10º GBM Sede, enquanto em DBMs pode não haver oficial médico ou escala específica de GRD.
              </div>
            </div>
            <button
              onClick={() => setShowNovaSecaoModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-200 dark:shadow-none cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Seção para {activeUnit}</span>
            </button>
          </div>

          {/* Grid de Seções da Unidade */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sections.map((section) => {
              const IconComp = getSectionIcon(section.icon);
              const colorStyles = getSectionColorStyles(section.color);
              const poolKey = getPoolKeyForSection(section);
              const officersCount = (poolConfig[poolKey] || []).length;

              return (
                <div
                  key={section.id}
                  className={cn(
                    "border-2 rounded-3xl p-5 flex flex-col justify-between transition-all relative overflow-hidden",
                    section.enabled
                      ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-200 dark:hover:border-indigo-800"
                      : "bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-75"
                  )}
                >
                  <div>
                    {/* Top Row: Ícone + Badges + Ações */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md", colorStyles.bg)}>
                        <IconComp className="w-6 h-6" />
                      </div>

                      <div className="flex items-center gap-2">
                        {section.isCustom && (
                          <button
                            onClick={() => handleDeleteSecao(section.id, section.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Excluir Seção Personalizada"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <span className={cn("text-[9.5px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border", colorStyles.badge)}>
                          {section.badge}
                        </span>
                      </div>
                    </div>

                    {/* Informações da Seção */}
                    <div className="mb-4">
                      <h4 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                        {section.name}
                        {section.isCustom && (
                          <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                            Personalizada
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                        {section.subtitle}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                        {section.description}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Row: Contador de Oficiais + Switch Toggle */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{officersCount} oficiais habilitados</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleSection(section.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                        section.enabled
                          ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                      )}
                    >
                      {section.enabled ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Ativa</span>
                        </>
                      ) : (
                        <span>Desativada</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 2: HABILITAÇÃO DE OFICIAIS POR SEÇÃO */}
      {activeTab === 'officers' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Barra de Busca e Filtros */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Buscar oficial por posto, nome de guerra ou RG..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold">
              <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Marque as caixas para habilitar o oficial em cada seção ativa
              </span>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 underline cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Tabela de Oficiais e Seções Ativas */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  <th className="py-3.5 px-4 font-black uppercase text-[10px] tracking-wider w-12 text-center">Nº</th>
                  <th className="py-3.5 px-4 font-black uppercase text-[10px] tracking-wider min-w-[200px]">Oficial</th>
                  
                  {/* Colunas Dinâmicas baseadas nas seções ATIVAS da OBM */}
                  {activeSections.map(sec => {
                    const IconComp = getSectionIcon(sec.icon);
                    const colorStyles = getSectionColorStyles(sec.color);
                    return (
                      <th key={sec.id} className="py-3.5 px-4 text-center min-w-[130px]">
                        <div className="flex flex-col items-center gap-1">
                          <IconComp className={cn("w-4 h-4", colorStyles.text)} />
                          <span className="font-black uppercase tracking-wider text-[10px] truncate max-w-[140px]" title={sec.name}>
                            {sec.name}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOfficers.map((o, idx) => {
                  const officerRg = String(o.rg || '').trim();
                  
                  return (
                    <tr key={o.rg} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-4">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                              {parseRank(o.rank)}
                            </span>
                            <span className="font-black text-slate-800 dark:text-white uppercase tracking-tight">
                              {o.warName || stripRankPrefix(o.name || '')}
                            </span>
                          </div>
                          <div className="text-[10px] font-bold text-slate-400">
                            RG: {o.rg} {o.name && o.name !== o.warName && `• ${o.name}`}
                          </div>
                        </div>
                      </td>

                      {/* Checkbox para cada seção ativa */}
                      {activeSections.map(sec => {
                        const poolKey = getPoolKeyForSection(sec);
                        const isEnrolled = (poolConfig[poolKey] || []).some(r => String(r).trim() === officerRg);
                        const colorStyles = getSectionColorStyles(sec.color);

                        return (
                          <td key={sec.id} className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => toggleOfficer(sec, o.rg)}
                              className={cn(
                                "w-7 h-7 rounded-lg border flex items-center justify-center mx-auto transition-all cursor-pointer",
                                isEnrolled
                                  ? `${colorStyles.bg} border-transparent text-white shadow-xs scale-105`
                                  : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-indigo-400"
                              )}
                              title={isEnrolled ? `Remover de ${sec.name}` : `Habilitar em ${sec.name}`}
                            >
                              {isEnrolled && <Check className="w-4 h-4" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredOfficers.length === 0 && (
              <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                Nenhum oficial localizado em {activeUnit}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA 3: ANTIGUIDADE E DATAS DE PROMOÇÃO */}
      {activeTab === 'seniority' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-200 font-medium flex items-center gap-3">
            <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              A <strong>Data de Promoção</strong> no posto atual determina rigorosamente a antiguidade entre oficiais de mesmo posto na OBM, refletindo diretamente na ordem da escala e no algoritmo de distribuição de cotas (FDS, Sexta e Semana).
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  <th className="py-3.5 px-4 font-black uppercase text-[10px] tracking-wider w-12 text-center">Nº</th>
                  <th className="py-3.5 px-4 font-black uppercase text-[10px] tracking-wider">Oficial</th>
                  <th className="py-3.5 px-4 font-black uppercase text-[10px] tracking-wider text-center">Posto</th>
                  <th className="py-3.5 px-4 font-black uppercase text-[10px] tracking-wider text-center w-52">
                    Data de Promoção
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {allOfficers.map((o, idx) => {
                  const pDateValue = formatToInputDate(o.promotionDate || o.promotions?.[0]?.dataPromocao);

                  return (
                    <tr key={o.rg} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-black uppercase text-slate-800 dark:text-white">
                        {o.warName || stripRankPrefix(o.name || '')}
                        <span className="text-[10px] text-slate-400 ml-2 font-normal">RG: {o.rg}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                        {parseRank(o.rank)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 max-w-[180px] mx-auto">
                          <input
                            type="date"
                            defaultValue={pDateValue}
                            key={`promo-${o.rg}-${o.promotionDate}`}
                            onBlur={(e) => {
                              const val = e.target.value;
                              if (val !== pDateValue && o.rg) {
                                handleUpdatePromotionDate(o.rg, val);
                              }
                            }}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 focus:border-indigo-500 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-all w-full text-center"
                          />
                          {savingPromotionRg === o.rg && (
                            <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin shrink-0" />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {saving && (
        <div className="absolute top-4 right-4 text-xs font-bold text-indigo-500 animate-pulse uppercase flex items-center gap-1">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          Salvando...
        </div>
      )}

      {/* Modal para Criar Nova Seção */}
      <NovaSecaoOficialModal
        isOpen={showNovaSecaoModal}
        onClose={() => setShowNovaSecaoModal(false)}
        obmContext={activeUnit}
        onSave={handleSaveNovaSecao}
      />

      {/* Modal para Adicionar Militar Diretamente ao Banco de Dados e Servidor */}
      <AdicionarMilitarModal
        isOpen={showAddMilitarModal}
        onClose={() => setShowAddMilitarModal(false)}
        obmContext={activeUnit}
        onSuccess={() => {
          refreshMilitars();
        }}
      />
    </div>
  );
}
