import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, CheckCircle2, ChevronDown, Eye, EyeOff, ExternalLink, 
  Award, Edit3, Plus, Anchor, Stethoscope, Settings,
  Flame, Compass, Star, LifeBuoy, Waves, Crosshair, Sparkles,
  type LucideIcon
} from 'lucide-react';
import { RankInsignia } from '../../../components/RankInsignia';
import { parseRank } from '../../../lib/rankUtils';
import { cn, cleanUndefined } from '../../../lib/utils';
import { OfficerVisibility } from '../types';
import { OfficerSectionItem, getDefaultSectionsForObm } from '../../../types/officerSections';
import { db } from '../../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export interface EscalaOficiaisSectionProps {
  obmContext: string;
  selectedDate?: string;
  loadingOfficerScale: boolean;
  loadingNauticoScale: boolean;
  loadingMedicoScale: boolean;
  isOfficerSectionExpanded: boolean;
  setIsOfficerSectionExpanded: (val: boolean) => void;
  officerVisibility: OfficerVisibility;
  onToggleOfficerVisibility: (key: any) => void;
  oficialDiaValue?: string;
  sobreavisoValue?: string;
  matchedOficialDia?: any;
  availableOfficers: any[];
  onSaveOficialDia: (name: string) => Promise<void>;
  savingOficialDia: boolean;
  nauticoOficialValue?: string;
  nauticoSobreavisoValue?: string;
  matchedNauticoOficial?: any;
  availableNauticoOfficers: any[];
  onSaveNauticoOficial: (name: string) => Promise<void>;
  savingNautico: boolean;
  medicoOficialValue?: string;
  medicoSobreavisoValue?: string;
  matchedMedicoOficial?: any;
  availableMedicalOfficers: any[];
  onSaveMedicoOficial: (name: string) => Promise<void>;
  savingMedico: boolean;
  onNavigate?: (path: string) => void;
  sections?: OfficerSectionItem[];
}

const SECTION_ICONS: Record<string, LucideIcon> = {
  shield: Shield,
  anchor: Anchor,
  stethoscope: Stethoscope,
  flame: Flame,
  award: Award,
  compass: Compass,
  star: Star,
  lifebuoy: LifeBuoy,
  waves: Waves,
  crosshair: Crosshair,
  sparkles: Sparkles
};

const getSectionColorStyles = (colorName: string) => {
  switch (colorName) {
    case 'cyan':
      return { 
        bg: 'bg-cyan-600', 
        text: 'text-cyan-700 dark:text-cyan-300', 
        border: 'border-cyan-200',
        borderHover: 'hover:border-cyan-300',
        gradient: 'from-cyan-50 to-blue-50',
        badge: 'bg-cyan-50 text-cyan-800 border-cyan-200',
        btn: 'bg-cyan-600 hover:bg-cyan-700'
      };
    case 'rose':
      return { 
        bg: 'bg-rose-600', 
        text: 'text-rose-700 dark:text-rose-300', 
        border: 'border-rose-200',
        borderHover: 'hover:border-rose-300',
        gradient: 'from-rose-50 to-pink-50',
        badge: 'bg-rose-50 text-rose-800 border-rose-200',
        btn: 'bg-rose-600 hover:bg-rose-700'
      };
    case 'emerald':
      return { 
        bg: 'bg-emerald-600', 
        text: 'text-emerald-700 dark:text-emerald-300', 
        border: 'border-emerald-200',
        borderHover: 'hover:border-emerald-300',
        gradient: 'from-emerald-50 to-teal-50',
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        btn: 'bg-emerald-600 hover:bg-emerald-700'
      };
    case 'amber':
      return { 
        bg: 'bg-amber-500', 
        text: 'text-amber-800 dark:text-amber-300', 
        border: 'border-amber-200',
        borderHover: 'hover:border-amber-300',
        gradient: 'from-amber-50 to-orange-50',
        badge: 'bg-amber-50 text-amber-800 border-amber-200',
        btn: 'bg-amber-600 hover:bg-amber-700'
      };
    case 'blue':
      return { 
        bg: 'bg-blue-600', 
        text: 'text-blue-700 dark:text-blue-300', 
        border: 'border-blue-200',
        borderHover: 'hover:border-blue-300',
        gradient: 'from-blue-50 to-indigo-50',
        badge: 'bg-blue-50 text-blue-800 border-blue-200',
        btn: 'bg-blue-600 hover:bg-blue-700'
      };
    case 'purple':
      return { 
        bg: 'bg-purple-600', 
        text: 'text-purple-700 dark:text-purple-300', 
        border: 'border-purple-200',
        borderHover: 'hover:border-purple-300',
        gradient: 'from-purple-50 to-violet-50',
        badge: 'bg-purple-50 text-purple-800 border-purple-200',
        btn: 'bg-purple-600 hover:bg-purple-700'
      };
    case 'indigo':
    default:
      return { 
        bg: 'bg-indigo-600', 
        text: 'text-indigo-700 dark:text-indigo-300', 
        border: 'border-indigo-200',
        borderHover: 'hover:border-indigo-300',
        gradient: 'from-indigo-50 to-slate-50',
        badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        btn: 'bg-indigo-600 hover:bg-indigo-700'
      };
  }
};

export function EscalaOficiaisSection({
  obmContext,
  selectedDate,
  loadingOfficerScale,
  loadingNauticoScale,
  loadingMedicoScale,
  isOfficerSectionExpanded,
  setIsOfficerSectionExpanded,
  officerVisibility,
  onToggleOfficerVisibility,
  oficialDiaValue,
  sobreavisoValue,
  matchedOficialDia,
  availableOfficers,
  onSaveOficialDia,
  savingOficialDia,
  nauticoOficialValue,
  nauticoSobreavisoValue,
  matchedNauticoOficial,
  availableNauticoOfficers,
  onSaveNauticoOficial,
  savingNautico,
  medicoOficialValue,
  medicoSobreavisoValue,
  matchedMedicoOficial,
  availableMedicalOfficers,
  onSaveMedicoOficial,
  savingMedico,
  onNavigate,
  sections: propSections,
}: EscalaOficiaisSectionProps) {
  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };

  // Carrega dinamicamente as seções configuradas para esta OBM/DBM
  const [sections, setSections] = useState<OfficerSectionItem[]>(() => (propSections && propSections.length > 0) ? propSections : getDefaultSectionsForObm(obmContext));

  useEffect(() => {
    if (propSections && propSections.length > 0) {
      setSections(propSections);
    }
  }, [propSections]);

  const [customOfficerValues, setCustomOfficerValues] = useState<Record<string, string>>({});
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [customOfficerInput, setCustomOfficerInput] = useState<string>('');
  const [savingCustom, setSavingCustom] = useState(false);

  const cleanObm = obmContext === 'GLOBAL' ? '10º GBM' : (obmContext || '10º GBM');
  const docId = cleanObm.replace(/°/g, 'º').replace(/\//g, '_').replace(/\s/g, '_');

  // 1. Sincroniza seções configuradas para a OBM
  useEffect(() => {
    let isMounted = true;

    fetch(`/api/officer-sections?obm=${encodeURIComponent(cleanObm)}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && Array.isArray(data.sections)) {
          setSections(data.sections);
        }
      })
      .catch(() => {});

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
  }, [docId, cleanObm]);

  // 2. Sincroniza valores das seções personalizadas para o dia selecionado
  useEffect(() => {
    if (!selectedDate) return;
    let isMounted = true;

    const unsub = onSnapshot(doc(db, 'officer_scales', docId), (snap) => {
      if (!isMounted) return;
      if (snap.exists()) {
        const days = snap.data()?.days || {};
        const dayData = days[selectedDate] || {};
        const customVals: Record<string, string> = {};
        sections.forEach(sec => {
          if (sec.isCustom && dayData[sec.id]) {
            customVals[sec.id] = dayData[sec.id];
          }
        });
        setCustomOfficerValues(customVals);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [docId, selectedDate, sections]);

  // Salva oficial de seção personalizada para o dia
  const handleSaveCustomOfficer = async (sectionId: string, officerName: string) => {
    if (!selectedDate) return;
    setSavingCustom(true);
    try {
      const payload = cleanUndefined({
        days: {
          [selectedDate]: {
            [sectionId]: officerName
          }
        }
      });

      await fetch('/api/officer-scales/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionName: 'officer_scales',
          docId,
          data: payload
        })
      });

      setCustomOfficerValues(prev => ({
        ...prev,
        [sectionId]: officerName
      }));
      setEditingSectionId(null);
    } catch (err) {
      console.error('Erro ao salvar oficial de seção personalizada:', err);
    } finally {
      setSavingCustom(false);
    }
  };

  const [isEditingOficialDia, setIsEditingOficialDia] = useState(false);
  const [selectedOfficerInput, setSelectedOfficerInput] = useState('');

  const [isEditingNautico, setIsEditingNautico] = useState(false);
  const [selectedNauticoInput, setSelectedNauticoInput] = useState('');

  const [isEditingMedico, setIsEditingMedico] = useState(false);
  const [selectedMedicoInput, setSelectedMedicoInput] = useState('');

  // Filtra apenas as seções ATIVAS para esta unidade
  const enabledSections = useMemo(() => {
    return sections.filter(sec => sec.enabled);
  }, [sections]);

  // Texto resumido dinâmico para quando o bloco estiver recolhido
  const summaryText = useMemo(() => {
    if (enabledSections.length === 0) return 'Nenhuma seção de oficiais ativada nesta OBM';
    return enabledSections.map(sec => {
      if (sec.id === 'servicos-grd') {
        return `Of. Dia: ${oficialDiaValue || 'Sem Of. Dia'}`;
      }
      if (sec.id === 'nucleo-nautico') {
        return `Náut: ${nauticoOficialValue || 'Sem Náut.'}`;
      }
      if (sec.id === 'oficiais-medicos') {
        return `Méd: ${medicoOficialValue || 'Sem Méd.'}`;
      }
      const customVal = customOfficerValues[sec.id];
      return `${sec.badge || sec.name}: ${customVal || 'Não Definido'}`;
    }).join(' | ');
  }, [enabledSections, oficialDiaValue, nauticoOficialValue, medicoOficialValue, customOfficerValues]);

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden relative">
      {/* Header Compacto da Seção */}
      <div className="bg-slate-900 border-b border-slate-800 py-1.5 px-3 sm:px-3.5 flex flex-wrap items-center justify-between gap-2 text-white">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
            <Shield className="w-3 h-3" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-white truncate">
              Oficiais de Dia & Serviços Operacionais (24h)
            </h3>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest flex items-center gap-1 shrink-0">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
              Sincronizado
            </span>
            {(loadingOfficerScale || loadingNauticoScale || loadingMedicoScale) && (
              <span className="text-[8.5px] font-bold text-amber-400 animate-pulse uppercase tracking-widest shrink-0">
                Atualizando...
              </span>
            )}
            {!isOfficerSectionExpanded && (
              <span className="text-[9px] text-slate-400 font-mono hidden md:inline truncate max-w-xs xl:max-w-md">
                • {summaryText}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Botão de Atalho para Configuração de Seções */}
          <button
            type="button"
            onClick={() => handleNavigate('/oficiais-config')}
            className="px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer border border-indigo-400/30 bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/80"
            title="Acessar Configuração Serviços de Oficiais para gerenciar seções da unidade"
          >
            <Settings className="w-3 h-3 text-indigo-400" />
            <span className="hidden sm:inline">Gerenciar Seções</span>
          </button>

          {/* Botão de Ativação Geral no Gerar Escala */}
          <button
            type="button"
            onClick={() => onToggleOfficerVisibility('showSection')}
            className={cn(
              "px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer border shadow-2xs",
              officerVisibility.showSection !== false
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                : "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30"
            )}
            title="Ativar ou desativar o aparecimento de todos os oficiais no arquivo Gerar Escala"
          >
            {officerVisibility.showSection !== false ? (
              <>
                <Eye className="w-3 h-3 text-emerald-400" />
                <span>Gerar Escala: Ativo</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3 text-rose-400" />
                <span>Gerar Escala: Desativado</span>
              </>
            )}
          </button>

          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono hidden sm:inline">
            OBM: <strong className="text-white">{cleanObm}</strong>
          </span>

          {/* Botão de Expandir / Recolher */}
          <button
            type="button"
            onClick={() => setIsOfficerSectionExpanded(!isOfficerSectionExpanded)}
            className="p-1 hover:bg-slate-800 rounded-md text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-[9px] font-black uppercase cursor-pointer"
            title={isOfficerSectionExpanded ? "Recolher painel de oficiais" : "Expandir painel de oficiais"}
          >
            <span>{isOfficerSectionExpanded ? "Recolher" : "Expandir"}</span>
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", !isOfficerSectionExpanded && "-rotate-90")} />
          </button>
        </div>
      </div>

      {/* Conteúdo Dinâmico das Seções Ativas da Unidade */}
      {isOfficerSectionExpanded && (
        <div className="p-2 bg-slate-50/40">
          {enabledSections.length === 0 ? (
            <div className="p-4 text-center rounded-xl bg-white border border-dashed border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Nenhuma seção de oficiais ativada para {cleanObm}.
              </p>
              <button
                type="button"
                onClick={() => handleNavigate('/oficiais-config')}
                className="mt-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-3 h-3" /> Configurar Seções da Unidade
              </button>
            </div>
          ) : (
            <div className={cn(
              "grid gap-2",
              enabledSections.length === 1 && "grid-cols-1 max-w-md",
              enabledSections.length === 2 && "grid-cols-1 md:grid-cols-2",
              enabledSections.length === 3 && "grid-cols-1 lg:grid-cols-3",
              enabledSections.length >= 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            )}>
              {enabledSections.map((sec) => {
                // SEÇÃO 1: SERVIÇOS & GRD
                if (sec.id === 'servicos-grd') {
                  return (
                    <div key={sec.id} className="rounded-xl border border-slate-200 bg-white flex flex-col justify-between overflow-hidden shadow-2xs hover:border-amber-300 transition-colors">
                      <div className="p-2 px-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-amber-500 text-white flex items-center justify-center shadow-2xs shrink-0">
                            <Shield className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h4 className="text-[10.5px] font-black uppercase tracking-wider text-slate-800 leading-tight">
                              {sec.name}
                            </h4>
                            <span className="text-[7.5px] font-black uppercase tracking-widest text-amber-800 leading-none block">
                              {sec.subtitle || 'Serviço & GRD (CMT OP)'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onToggleOfficerVisibility('showOficialDia')}
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 transition-all cursor-pointer border",
                              officerVisibility.showSection !== false && officerVisibility.showOficialDia !== false
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200"
                            )}
                            title={officerVisibility.showSection !== false && officerVisibility.showOficialDia !== false ? "Função ativa no Gerar Escala" : "Função desativada no Gerar Escala"}
                          >
                            {officerVisibility.showSection !== false && officerVisibility.showOficialDia !== false ? (
                              <>
                                <Eye className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Ativo</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-2.5 h-2.5 text-slate-400" />
                                <span>Oculto</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleNavigate('/servicos-grd')}
                            className="p-1 hover:bg-white rounded text-slate-500 hover:text-amber-700 transition-colors text-[8px] font-black uppercase flex items-center gap-0.5 border border-transparent hover:border-amber-200 cursor-pointer"
                            title="Acessar módulo de Serviços & GRD"
                          >
                            <ExternalLink className="w-2.5 h-2.5 text-amber-600" />
                          </button>
                        </div>
                      </div>

                      <div className="p-2 sm:p-2.5 flex-1 flex flex-col justify-between">
                        {isEditingOficialDia ? (
                          <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-2 flex flex-col gap-1.5 shadow-2xs">
                            <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-700">
                              Definir Oficial de Dia
                            </span>
                            <select
                              value={selectedOfficerInput}
                              onChange={(e) => setSelectedOfficerInput(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded p-1 text-[11px] font-bold uppercase text-slate-800 outline-none focus:border-amber-500"
                            >
                              <option value="">-- Selecione um Oficial --</option>
                              {availableOfficers.map((mil) => {
                                const optName = `${parseRank(mil.rank)} ${mil.warName || (mil.name || '').split(' ')[0]}`;
                                return (
                                  <option key={mil.rg} value={optName}>
                                    {optName} (RG: {mil.rg})
                                  </option>
                                );
                              })}
                            </select>
                            <input
                              type="text"
                              placeholder="Ou digite o nome..."
                              value={selectedOfficerInput}
                              onChange={(e) => setSelectedOfficerInput(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded p-1 text-[11px] font-bold uppercase text-slate-800 outline-none focus:border-amber-500"
                            />
                            <div className="flex justify-end gap-1 pt-0.5">
                              {oficialDiaValue && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSaveOficialDia('').then(() => setIsEditingOficialDia(false));
                                  }}
                                  disabled={savingOficialDia}
                                  className="px-2 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[8.5px] font-black uppercase cursor-pointer"
                                >
                                  Remover
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setIsEditingOficialDia(false)}
                                disabled={savingOficialDia}
                                className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[8.5px] font-black uppercase cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onSaveOficialDia(selectedOfficerInput).then(() => setIsEditingOficialDia(false));
                                }}
                                disabled={savingOficialDia || !selectedOfficerInput.trim()}
                                className="px-2.5 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[8.5px] font-black uppercase shadow-2xs disabled:opacity-50 cursor-pointer"
                              >
                                {savingOficialDia ? "..." : "Salvar"}
                              </button>
                            </div>
                          </div>
                        ) : oficialDiaValue ? (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between gap-2.5">
                              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                <div className="min-h-[32px] min-w-[34px] px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0 shadow-2xs">
                                  {matchedOficialDia?.rank ? (
                                    <RankInsignia rankStr={matchedOficialDia.rank} size="sm" />
                                  ) : (
                                    <Award className="w-4 h-4 text-amber-600" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 pl-0.5">
                                  <h5 className="text-[11px] font-black text-slate-900 uppercase truncate leading-tight">
                                    {matchedOficialDia ? `${parseRank(matchedOficialDia.rank)} ${matchedOficialDia.warName || matchedOficialDia.name}` : oficialDiaValue}
                                  </h5>
                                  <div className="flex items-center gap-2 text-[8.5px] font-mono text-slate-500 leading-none mt-1">
                                    {matchedOficialDia?.rg && <span>RG: <strong className="text-slate-700">{matchedOficialDia.rg}</strong></span>}
                                    {matchedOficialDia?.cel && <span>Tel: <strong className="text-slate-700">{matchedOficialDia.cel}</strong></span>}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsEditingOficialDia(true);
                                  setSelectedOfficerInput(oficialDiaValue || '');
                                }}
                                className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded flex items-center gap-0.5 transition-colors cursor-pointer shrink-0"
                              >
                                <Edit3 className="w-2.5 h-2.5 text-slate-500" /> Alterar
                              </button>
                            </div>

                            {sobreavisoValue && (
                              <div className="bg-amber-50/80 border border-amber-200/60 rounded p-1 px-2 text-[8px] font-bold text-amber-900 uppercase flex items-center justify-between leading-none">
                                <span>Sobreaviso 2 / GRD 2:</span>
                                <strong className="truncate max-w-[140px]">{sobreavisoValue}</strong>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/40 flex items-center justify-between">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              Nenhum Oficial de Dia
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingOficialDia(true);
                                setSelectedOfficerInput('');
                              }}
                              className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-black uppercase text-[8.5px] tracking-wider rounded flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            >
                              <Plus className="w-2.5 h-2.5" /> Definir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // SEÇÃO 2: NÚCLEO NÁUTICO
                if (sec.id === 'nucleo-nautico') {
                  return (
                    <div key={sec.id} className="rounded-xl border border-slate-200 bg-white flex flex-col justify-between overflow-hidden shadow-2xs hover:border-cyan-300 transition-colors">
                      <div className="p-2 px-3 bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-cyan-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-cyan-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                            <Anchor className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h4 className="text-[10.5px] font-black uppercase tracking-wider text-slate-800 leading-tight">
                              {sec.name}
                            </h4>
                            <span className="text-[7.5px] font-black uppercase tracking-widest text-cyan-800 leading-none block">
                              {sec.subtitle || 'Núcleo Náutico (Embarcação)'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onToggleOfficerVisibility('showOficialNautica')}
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 transition-all cursor-pointer border",
                              officerVisibility.showSection !== false && officerVisibility.showOficialNautica !== false
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200"
                            )}
                            title={officerVisibility.showSection !== false && officerVisibility.showOficialNautica !== false ? "Função ativa no Gerar Escala" : "Função desativada no Gerar Escala"}
                          >
                            {officerVisibility.showSection !== false && officerVisibility.showOficialNautica !== false ? (
                              <>
                                <Eye className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Ativo</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-2.5 h-2.5 text-slate-400" />
                                <span>Oculto</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleNavigate('/nucleo-nautico')}
                            className="p-1 hover:bg-white rounded text-slate-500 hover:text-cyan-700 transition-colors text-[8px] font-black uppercase flex items-center gap-0.5 border border-transparent hover:border-cyan-200 cursor-pointer"
                            title="Acessar módulo Núcleo Náutico"
                          >
                            <ExternalLink className="w-2.5 h-2.5 text-cyan-600" />
                          </button>
                        </div>
                      </div>

                      <div className="p-2 sm:p-2.5 flex-1 flex flex-col justify-between">
                        {isEditingNautico ? (
                          <div className="bg-cyan-50/50 border border-cyan-200 rounded-lg p-2 flex flex-col gap-1.5 shadow-2xs">
                            <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-700">
                              Definir Oficial Náutico
                            </span>
                            <select
                              value={selectedNauticoInput}
                              onChange={(e) => setSelectedNauticoInput(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded p-1 text-[11px] font-bold uppercase text-slate-800 outline-none focus:border-cyan-500"
                            >
                              <option value="">-- Selecione um Oficial --</option>
                              {availableNauticoOfficers.map((mil) => {
                                const optName = `${parseRank(mil.rank)} ${mil.warName || (mil.name || '').split(' ')[0]}`;
                                return (
                                  <option key={mil.rg} value={optName}>
                                    {optName} (RG: {mil.rg})
                                  </option>
                                );
                              })}
                            </select>
                            <input
                              type="text"
                              placeholder="Ou digite o nome..."
                              value={selectedNauticoInput}
                              onChange={(e) => setSelectedNauticoInput(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded p-1 text-[11px] font-bold uppercase text-slate-800 outline-none focus:border-cyan-500"
                            />
                            <div className="flex justify-end gap-1 pt-0.5">
                              {nauticoOficialValue && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSaveNauticoOficial('').then(() => setIsEditingNautico(false));
                                  }}
                                  disabled={savingNautico}
                                  className="px-2 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[8.5px] font-black uppercase cursor-pointer"
                                >
                                  Remover
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setIsEditingNautico(false)}
                                disabled={savingNautico}
                                className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[8.5px] font-black uppercase cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onSaveNauticoOficial(selectedNauticoInput).then(() => setIsEditingNautico(false));
                                }}
                                disabled={savingNautico || !selectedNauticoInput.trim()}
                                className="px-2.5 py-0.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-[8.5px] font-black uppercase shadow-2xs disabled:opacity-50 cursor-pointer"
                              >
                                {savingNautico ? "..." : "Salvar"}
                              </button>
                            </div>
                          </div>
                        ) : nauticoOficialValue ? (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between gap-2.5">
                              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                <div className="min-h-[32px] min-w-[34px] px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0 shadow-2xs">
                                  {matchedNauticoOficial?.rank ? (
                                    <RankInsignia rankStr={matchedNauticoOficial.rank} size="sm" />
                                  ) : (
                                    <Anchor className="w-4 h-4 text-cyan-600" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 pl-0.5">
                                  <h5 className="text-[11px] font-black text-slate-900 uppercase truncate leading-tight">
                                    {matchedNauticoOficial ? `${parseRank(matchedNauticoOficial.rank)} ${matchedNauticoOficial.warName || matchedNauticoOficial.name}` : nauticoOficialValue}
                                  </h5>
                                  <div className="flex items-center gap-2 text-[8.5px] font-mono text-slate-500 leading-none mt-1">
                                    {matchedNauticoOficial?.rg && <span>RG: <strong className="text-slate-700">{matchedNauticoOficial.rg}</strong></span>}
                                    {matchedNauticoOficial?.cel && <span>Tel: <strong className="text-slate-700">{matchedNauticoOficial.cel}</strong></span>}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsEditingNautico(true);
                                  setSelectedNauticoInput(nauticoOficialValue || '');
                                }}
                                className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded flex items-center gap-0.5 transition-colors cursor-pointer shrink-0"
                              >
                                <Edit3 className="w-2.5 h-2.5 text-slate-500" /> Alterar
                              </button>
                            </div>

                            {nauticoSobreavisoValue && (
                              <div className="bg-cyan-50/80 border border-cyan-200/60 rounded p-1 px-2 text-[8px] font-bold text-cyan-900 uppercase flex items-center justify-between leading-none">
                                <span>Apoio Náutico 2:</span>
                                <strong className="truncate max-w-[140px]">{nauticoSobreavisoValue}</strong>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/40 flex items-center justify-between">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              Nenhum Oficial Náutico
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingNautico(true);
                                setSelectedNauticoInput('');
                              }}
                              className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-700 text-white font-black uppercase text-[8.5px] tracking-wider rounded flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            >
                              <Plus className="w-2.5 h-2.5" /> Definir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // SEÇÃO 3: OFICIAIS MÉDICOS
                if (sec.id === 'oficiais-medicos') {
                  return (
                    <div key={sec.id} className="rounded-xl border border-slate-200 bg-white flex flex-col justify-between overflow-hidden shadow-2xs hover:border-rose-300 transition-colors">
                      <div className="p-2 px-3 bg-gradient-to-r from-rose-50 to-pink-50 border-b border-rose-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-rose-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                            <Stethoscope className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h4 className="text-[10.5px] font-black uppercase tracking-wider text-slate-800 leading-tight">
                              {sec.name}
                            </h4>
                            <span className="text-[7.5px] font-black uppercase tracking-widest text-rose-800 leading-none block">
                              {sec.subtitle || 'Oficiais Médicos (Saúde)'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onToggleOfficerVisibility('showOficialMedico')}
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 transition-all cursor-pointer border",
                              officerVisibility.showSection !== false && officerVisibility.showOficialMedico !== false
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200"
                            )}
                            title={officerVisibility.showSection !== false && officerVisibility.showOficialMedico !== false ? "Função ativa no Gerar Escala" : "Função desativada no Gerar Escala"}
                          >
                            {officerVisibility.showSection !== false && officerVisibility.showOficialMedico !== false ? (
                              <>
                                <Eye className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Ativo</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-2.5 h-2.5 text-slate-400" />
                                <span>Oculto</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleNavigate('/oficiais-medicos')}
                            className="p-1 hover:bg-white rounded text-slate-500 hover:text-rose-700 transition-colors text-[8px] font-black uppercase flex items-center gap-0.5 border border-transparent hover:border-rose-200 cursor-pointer"
                            title="Acessar módulo Oficiais Médicos"
                          >
                            <ExternalLink className="w-2.5 h-2.5 text-rose-600" />
                          </button>
                        </div>
                      </div>

                      <div className="p-2 sm:p-2.5 flex-1 flex flex-col justify-between">
                        {isEditingMedico ? (
                          <div className="bg-rose-50/50 border border-rose-200 rounded-lg p-2 flex flex-col gap-1.5 shadow-2xs">
                            <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-700">
                              Definir Oficial Médico
                            </span>
                            <select
                              value={selectedMedicoInput}
                              onChange={(e) => setSelectedMedicoInput(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded p-1 text-[11px] font-bold uppercase text-slate-800 outline-none focus:border-rose-500"
                            >
                              <option value="">-- Selecione um Médico --</option>
                              {availableMedicalOfficers.map((mil) => {
                                const optName = `${parseRank(mil.rank)} ${mil.warName || (mil.name || '').split(' ')[0]}`;
                                return (
                                  <option key={mil.rg} value={optName}>
                                    {optName} (RG: {mil.rg})
                                  </option>
                                );
                              })}
                            </select>
                            <input
                              type="text"
                              placeholder="Ou digite o nome..."
                              value={selectedMedicoInput}
                              onChange={(e) => setSelectedMedicoInput(e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded p-1 text-[11px] font-bold uppercase text-slate-800 outline-none focus:border-rose-500"
                            />
                            <div className="flex justify-end gap-1 pt-0.5">
                              {medicoOficialValue && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSaveMedicoOficial('').then(() => setIsEditingMedico(false));
                                  }}
                                  disabled={savingMedico}
                                  className="px-2 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[8.5px] font-black uppercase cursor-pointer"
                                >
                                  Remover
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setIsEditingMedico(false)}
                                disabled={savingMedico}
                                className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[8.5px] font-black uppercase cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onSaveMedicoOficial(selectedMedicoInput).then(() => setIsEditingMedico(false));
                                }}
                                disabled={savingMedico || !selectedMedicoInput.trim()}
                                className="px-2.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[8.5px] font-black uppercase shadow-2xs disabled:opacity-50 cursor-pointer"
                              >
                                {savingMedico ? "..." : "Salvar"}
                              </button>
                            </div>
                          </div>
                        ) : medicoOficialValue ? (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between gap-2.5">
                              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                <div className="min-h-[32px] min-w-[34px] px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0 shadow-2xs">
                                  {matchedMedicoOficial?.rank ? (
                                    <RankInsignia rankStr={matchedMedicoOficial.rank} size="sm" />
                                  ) : (
                                    <Stethoscope className="w-4 h-4 text-rose-600" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 pl-0.5">
                                  <h5 className="text-[11px] font-black text-slate-900 uppercase truncate leading-tight">
                                    {matchedMedicoOficial ? `${parseRank(matchedMedicoOficial.rank)} ${matchedMedicoOficial.warName || matchedMedicoOficial.name}` : medicoOficialValue}
                                  </h5>
                                  <div className="flex items-center gap-2 text-[8.5px] font-mono text-slate-500 leading-none mt-1">
                                    {matchedMedicoOficial?.rg && <span>RG: <strong className="text-slate-700">{matchedMedicoOficial.rg}</strong></span>}
                                    {matchedMedicoOficial?.cel && <span>Tel: <strong className="text-slate-700">{matchedMedicoOficial.cel}</strong></span>}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsEditingMedico(true);
                                  setSelectedMedicoInput(medicoOficialValue || '');
                                }}
                                className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded flex items-center gap-0.5 transition-colors cursor-pointer shrink-0"
                              >
                                <Edit3 className="w-2.5 h-2.5 text-slate-500" /> Alterar
                              </button>
                            </div>

                            {medicoSobreavisoValue && (
                              <div className="bg-rose-50/80 border border-rose-200/60 rounded p-1 px-2 text-[8px] font-bold text-rose-900 uppercase flex items-center justify-between leading-none">
                                <span>Apoio / Sobreaviso:</span>
                                <strong className="truncate max-w-[140px]">{medicoSobreavisoValue}</strong>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/40 flex items-center justify-between">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              Nenhum Oficial Médico
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingMedico(true);
                                setSelectedMedicoInput('');
                              }}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[8.5px] tracking-wider rounded flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            >
                              <Plus className="w-2.5 h-2.5" /> Definir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // SEÇÃO PERSONALIZADA (Criada para a OBM / DBM)
                const IconComponent = SECTION_ICONS[sec.icon] || Shield;
                const colorStyles = getSectionColorStyles(sec.color);
                const assignedVal = customOfficerValues[sec.id] || '';
                const isEditingThis = editingSectionId === sec.id;
                const isVisible = (officerVisibility as any)[`show_${sec.id}`] !== false;

                return (
                  <div key={sec.id} className={cn("rounded-xl border border-slate-200 bg-white flex flex-col justify-between overflow-hidden shadow-2xs transition-colors", colorStyles.borderHover)}>
                    <div className={cn("p-2 px-3 bg-gradient-to-r border-b flex items-center justify-between", colorStyles.gradient, colorStyles.border)}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-6 h-6 rounded-md text-white flex items-center justify-center shadow-2xs shrink-0", colorStyles.bg)}>
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-[10.5px] font-black uppercase tracking-wider text-slate-800 leading-tight">
                            {sec.name}
                          </h4>
                          <span className={cn("text-[7.5px] font-black uppercase tracking-widest leading-none block", colorStyles.text)}>
                            {sec.subtitle || sec.badge}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onToggleOfficerVisibility(`show_${sec.id}`)}
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-0.5 transition-all cursor-pointer border",
                            officerVisibility.showSection !== false && isVisible
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200"
                          )}
                          title="Alternar visibilidade no Gerar Escala"
                        >
                          {officerVisibility.showSection !== false && isVisible ? (
                            <>
                              <Eye className="w-2.5 h-2.5 text-emerald-600" />
                              <span>Ativo</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-2.5 h-2.5 text-slate-400" />
                              <span>Oculto</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNavigate('/servicos-oficiais')}
                          className="p-1 hover:bg-white rounded text-slate-500 hover:text-indigo-700 transition-colors text-[8px] font-black uppercase flex items-center gap-0.5 border border-transparent cursor-pointer"
                          title={`Acessar escala de ${sec.name}`}
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-2 sm:p-2.5 flex-1 flex flex-col justify-between">
                      {isEditingThis ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col gap-1.5 shadow-2xs">
                          <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-700">
                            Definir {sec.name}
                          </span>
                          <select
                            value={customOfficerInput}
                            onChange={(e) => setCustomOfficerInput(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded p-1 text-[11px] font-bold uppercase text-slate-800 outline-none focus:border-indigo-500"
                          >
                            <option value="">-- Selecione um Oficial --</option>
                            {availableOfficers.map((mil) => {
                              const optName = `${parseRank(mil.rank)} ${mil.warName || (mil.name || '').split(' ')[0]}`;
                              return (
                                <option key={mil.rg} value={optName}>
                                  {optName} (RG: {mil.rg})
                                </option>
                              );
                            })}
                          </select>
                          <input
                            type="text"
                            placeholder="Ou digite o nome..."
                            value={customOfficerInput}
                            onChange={(e) => setCustomOfficerInput(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded p-1 text-[11px] font-bold uppercase text-slate-800 outline-none focus:border-indigo-500"
                          />
                          <div className="flex justify-end gap-1 pt-0.5">
                            {assignedVal && (
                              <button
                                type="button"
                                onClick={() => handleSaveCustomOfficer(sec.id, '')}
                                disabled={savingCustom}
                                className="px-2 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-[8.5px] font-black uppercase cursor-pointer"
                              >
                                Remover
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setEditingSectionId(null)}
                              disabled={savingCustom}
                              className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[8.5px] font-black uppercase cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveCustomOfficer(sec.id, customOfficerInput)}
                              disabled={savingCustom || !customOfficerInput.trim()}
                              className={cn("px-2.5 py-0.5 text-white rounded text-[8.5px] font-black uppercase shadow-2xs disabled:opacity-50 cursor-pointer", colorStyles.btn)}
                            >
                              {savingCustom ? "..." : "Salvar"}
                            </button>
                          </div>
                        </div>
                      ) : assignedVal ? (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-2.5">
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              <div className="min-h-[32px] min-w-[34px] px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0 shadow-2xs">
                                <IconComponent className={cn("w-4 h-4", colorStyles.text)} />
                              </div>
                              <div className="min-w-0 flex-1 pl-0.5">
                                <h5 className="text-[11px] font-black text-slate-900 uppercase truncate leading-tight">
                                  {assignedVal}
                                </h5>
                                <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">
                                  Oficial Escalado
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSectionId(sec.id);
                                setCustomOfficerInput(assignedVal);
                              }}
                              className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded flex items-center gap-0.5 transition-colors cursor-pointer shrink-0"
                            >
                              <Edit3 className="w-2.5 h-2.5 text-slate-500" /> Alterar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/40 flex items-center justify-between">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Nenhum {sec.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSectionId(sec.id);
                              setCustomOfficerInput('');
                            }}
                            className={cn("px-2 py-0.5 text-white font-black uppercase text-[8.5px] tracking-wider rounded flex items-center gap-1 shadow-2xs transition-colors cursor-pointer", colorStyles.btn)}
                          >
                            <Plus className="w-2.5 h-2.5" /> Definir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Barra de Status Dinâmica do Gerar Escala */}
          <div className="mt-2 pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-[8.5px] font-bold text-slate-500 uppercase tracking-wider">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-slate-700 font-black">
                <Shield className="w-3 h-3 text-indigo-600" />
                No Gerar Escala:
              </span>
              {enabledSections.map((sec) => {
                let isSecActive = true;
                if (sec.id === 'servicos-grd') {
                  isSecActive = officerVisibility.showSection !== false && officerVisibility.showOficialDia !== false;
                } else if (sec.id === 'nucleo-nautico') {
                  isSecActive = officerVisibility.showSection !== false && officerVisibility.showOficialNautica !== false;
                } else if (sec.id === 'oficiais-medicos') {
                  isSecActive = officerVisibility.showSection !== false && officerVisibility.showOficialMedico !== false;
                } else {
                  isSecActive = officerVisibility.showSection !== false && (officerVisibility as any)[`show_${sec.id}`] !== false;
                }

                return (
                  <span 
                    key={sec.id}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[7.5px] font-black transition-colors", 
                      isSecActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500 line-through"
                    )}
                  >
                    {sec.name}: {isSecActive ? "Ativo" : "Oculto"}
                  </span>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                onToggleOfficerVisibility('showSection');
              }}
              className="text-[8.5px] font-black uppercase text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
            >
              {officerVisibility.showSection !== false
                ? "Desativar todos no Gerar Escala"
                : "Ativar todos no Gerar Escala"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
