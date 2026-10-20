import React, { useState, useTransition, useEffect, useMemo } from 'react';
import { UserProfile } from '../types';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Anchor, 
  Stethoscope, 
  Folder, 
  ChevronRight, 
  CheckCircle2, 
  Shield,
  Clock,
  Settings,
  Flame,
  Award,
  Compass,
  Star,
  LifeBuoy,
  Waves,
  Crosshair,
  type LucideIcon
} from 'lucide-react';
import { OfficerGrdModule } from './OfficerGrdModule';
import { NucleoNauticoGrdModule } from './NucleoNauticoGrdModule';
import { OfficerMedicosModule } from './OfficerMedicosModule';
import { GestaoOficiaisMedicosModule } from './GestaoOficiaisMedicosModule';
import { OficiaisConfigModule } from './OficiaisConfigModule';
import { GenericOfficerGrdModule } from '../features/grd/components/GenericOfficerGrdModule';
import { GenericOfficerGrdConfig } from '../features/grd/types';
import { OfficerSectionItem, getDefaultSectionsForObm } from '../types/officerSections';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { resolveCanonicalScope, formatScopeLabel } from '../lib/canonicalScope';

interface OficiaisDashboardProps {
  user: UserProfile;
  obmContext: string;
  setObmContext?: (obm: string) => void;
  availableObms?: string[];
  onBack: () => void;
  initialApp?: string | null;
}

const SECTION_ICONS: Record<string, LucideIcon> = {
  shield: ShieldCheck,
  anchor: Anchor,
  stethoscope: Stethoscope,
  flame: Flame,
  award: Award,
  compass: Compass,
  star: Star,
  lifebuoy: LifeBuoy,
  waves: Waves,
  crosshair: Crosshair
};

const SECTION_COLOR_MAP: Record<string, { bg: string; shadow: string; border: string; text: string }> = {
  indigo: { bg: 'bg-indigo-700', shadow: 'shadow-indigo-200', border: 'border-indigo-300', text: 'text-indigo-700' },
  cyan: { bg: 'bg-cyan-600', shadow: 'shadow-cyan-200', border: 'border-cyan-300', text: 'text-cyan-700' },
  rose: { bg: 'bg-rose-700', shadow: 'shadow-rose-200', border: 'border-rose-300', text: 'text-rose-700' },
  emerald: { bg: 'bg-emerald-700', shadow: 'shadow-emerald-200', border: 'border-emerald-300', text: 'text-emerald-700' },
  amber: { bg: 'bg-amber-600', shadow: 'shadow-amber-200', border: 'border-amber-300', text: 'text-amber-700' },
  blue: { bg: 'bg-blue-700', shadow: 'shadow-blue-200', border: 'border-blue-300', text: 'text-blue-700' },
  purple: { bg: 'bg-purple-700', shadow: 'shadow-purple-200', border: 'border-purple-300', text: 'text-purple-700' },
  slate: { bg: 'bg-slate-700', shadow: 'shadow-slate-200', border: 'border-slate-300', text: 'text-slate-700' }
};

export function OficiaisDashboard({
  user,
  obmContext,
  setObmContext,
  availableObms,
  onBack,
  initialApp = null
}: OficiaisDashboardProps) {
  const [activeApp, setActiveApp] = useState<string | null>(initialApp);
  const [isPending, startTransition] = useTransition();

  // Carrega as seções ativas para a OBM / DBM atual
  const [sections, setSections] = useState<OfficerSectionItem[]>(() => getDefaultSectionsForObm(obmContext));

  useEffect(() => {
    let isMounted = true;
    const cleanObm = obmContext === 'GLOBAL' ? '10º GBM' : obmContext;
    const docId = (cleanObm || '10º GBM').replace(/°/g, 'º').replace(/\//g, '_').replace(/\s/g, '_');

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
  }, [obmContext]);

  const handleObmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (setObmContext) {
      startTransition(() => {
        setObmContext(val);
      });
    }
  };

  const renderHeaderActions = (onClose?: () => void) => (
    <div className="flex items-center gap-3 shrink-0">
      {availableObms && availableObms.length > 1 && setObmContext && (
        <select
          value={obmContext}
          onChange={handleObmChange}
          disabled={isPending}
          className="px-3 py-2 bg-white border-2 border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all cursor-pointer disabled:opacity-50"
        >
          {availableObms.map((o) => {
            const label = o === 'GLOBAL' ? '🌐 TODAS AS UNIDADES' : formatScopeLabel(resolveCanonicalScope(o));
            return (
              <option key={o} value={o}>
                {label}
              </option>
            );
          })}
        </select>
      )}
      <button
        onClick={onClose || onBack}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all group cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        {onClose ? 'Voltar ao Painel' : 'Voltar à Home'}
      </button>
    </div>
  );

  // Lista dinâmica de apps/seções para o Grid baseada nas configurações da OBM
  const displayApps = useMemo(() => {
    // 1. Filtra apenas as seções ativas para esta OBM/DBM
    const enabledSections = sections.filter(sec => sec.enabled);

    const sectionCards = enabledSections.map(sec => {
      const colorStyles = SECTION_COLOR_MAP[sec.color] || SECTION_COLOR_MAP.indigo;
      const Icon = SECTION_ICONS[sec.icon] || ShieldCheck;

      return {
        id: sec.id,
        label: sec.name,
        subtitle: sec.subtitle,
        description: sec.description,
        badge: sec.badge,
        icon: Icon,
        color: `${colorStyles.bg} ${colorStyles.shadow}`,
        borderColor: `hover:${colorStyles.border}`,
        accentText: colorStyles.text,
        isCustom: sec.isCustom,
        rawSection: sec
      };
    });

    // 2. Card Administrativo sempre presente no final (Configuração Serviços de Oficiais)
    const configCard = {
      id: 'config-servicos-oficiais',
      label: 'Configuração Serviços de Oficiais',
      subtitle: 'Gestão de Seções & Efetivo',
      description: 'Determine quais militares aparecerão disponíveis nas escalas de Oficiais.',
      badge: 'Administrativo',
      icon: Settings,
      color: 'bg-slate-700 shadow-slate-200',
      borderColor: 'hover:border-slate-300',
      accentText: 'text-slate-700',
      isCustom: false,
      rawSection: null
    };

    return [...sectionCards, configCard];
  }, [sections]);

  // Sub-view 1: Serviços e GRD
  if (activeApp === 'servicos-grd') {
    return (
      <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-700 text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                Serviços e GRD{' '}
                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded uppercase tracking-widest ml-2">
                  {obmContext || '10º GBM'}
                </span>
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">
                Escala de Oficiais, Oficial de Dia e Sobreaviso.
              </p>
            </div>
          </div>
          {renderHeaderActions(() => setActiveApp(null))}
        </div>

        <OfficerGrdModule
          user={user}
          obmContext={obmContext}
          setObmContext={setObmContext}
          availableObms={availableObms}
        />
      </div>
    );
  }

  // Sub-view 2: Núcleo Náutico
  if (activeApp === 'nucleo-nautico') {
    return (
      <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-md">
              <Anchor className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                Núcleo Náutico{' '}
                <span className="text-xs font-bold bg-cyan-100 text-cyan-700 px-2 py-1 rounded uppercase tracking-widest ml-2">
                  {obmContext || '10º GBM'}
                </span>
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">
                Serviços Especializados e GRD Marítima e Náutica.
              </p>
            </div>
          </div>
          {renderHeaderActions(() => setActiveApp(null))}
        </div>

        <NucleoNauticoGrdModule
          user={user}
          obmContext={obmContext}
          setObmContext={setObmContext}
          availableObms={availableObms}
        />
      </div>
    );
  }

  // Sub-view 3: Oficiais Médicos
  if (activeApp === 'oficiais-medicos') {
    return (
      <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-700 text-white flex items-center justify-center shadow-md">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                Oficiais Médicos{' '}
                <span className="text-xs font-bold bg-rose-100 text-rose-700 px-2 py-1 rounded uppercase tracking-widest ml-2">
                  {obmContext || '10º GBM'}
                </span>
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">
                Serviços e Escala Médica Hospitalar e Operacional da OBM.
              </p>
            </div>
          </div>
          {renderHeaderActions(() => setActiveApp(null))}
        </div>

        <OfficerMedicosModule
          user={user}
          obmContext={obmContext}
          setObmContext={setObmContext}
          availableObms={availableObms}
        />
      </div>
    );
  }

  // Sub-view 4: Configuração Serviços de Oficiais (anteriormente Configuração de Efetivo)
  if (activeApp === 'config-servicos-oficiais' || activeApp === 'config-efetivo') {
    return (
      <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center shadow-md">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                Configuração Serviços de Oficiais{' '}
                <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded uppercase tracking-widest ml-2">
                  {obmContext || '10º GBM'}
                </span>
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">
                Gestão de seções da unidade e seleção de oficiais disponíveis em cada escala.
              </p>
            </div>
          </div>
          {renderHeaderActions(() => setActiveApp(null))}
        </div>

        <OficiaisConfigModule
          obmContext={obmContext}
          onClose={() => setActiveApp(null)}
        />
      </div>
    );
  }

  // Sub-view 5: Seções Personalizadas (Criadas dinamicamente para os DBMs/OBMs)
  const customSection = sections.find(s => s.id === activeApp);
  if (customSection) {
    const IconComp = SECTION_ICONS[customSection.icon] || ShieldCheck;
    const colorStyles = SECTION_COLOR_MAP[customSection.color] || SECTION_COLOR_MAP.indigo;

    const dynamicConfig: GenericOfficerGrdConfig = {
      collectionName: 'officer_scales',
      poolConfigField: customSection.id as any,
      title: customSection.name,
      icon: (customSection.icon === 'anchor' ? 'anchor' : 'shield'),
      themeColor: (customSection.color === 'cyan' ? 'cyan' : 'emerald'),
      col1Label: customSection.col1Name || 'OFICIAL DE DIA / CMT OP / SOBREAVISO 1',
      col2Label: customSection.col2Name || 'SOBREAVISO 2 / GRD 2',
      distTitle: `Distribuição de Serviços (${customSection.name})`,
      configSelectorLabel1: 'Oficial de Dia / G1',
      configSelectorLabel2: 'Sobreaviso / G2'
    };

    return (
      <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-md", colorStyles.bg)}>
              <IconComp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                {customSection.name}{' '}
                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded uppercase tracking-widest ml-2">
                  {obmContext || '10º GBM'}
                </span>
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">
                {customSection.description}
              </p>
            </div>
          </div>
          {renderHeaderActions(() => setActiveApp(null))}
        </div>

        <GenericOfficerGrdModule
          user={user}
          obmContext={obmContext}
          setObmContext={setObmContext}
          availableObms={availableObms}
          config={dynamicConfig}
        />
      </div>
    );
  }

  // Main Dashboard Grid View
  return (
    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-700 via-indigo-900 to-slate-900 text-white flex items-center justify-center shadow-md border border-indigo-400/30">
              <Folder className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                Serviço de Oficiais{' '}
                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded uppercase tracking-widest ml-2">
                  {obmContext || '10º GBM'}
                </span>
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">
                Selecione uma aplicação ou seção ativa da sua unidade.
              </p>
            </div>
          </div>
        </div>
        {renderHeaderActions()}
      </div>

      {/* Grid de Módulos e Seções Ativas da Unidade - Proporções Idênticas à Homepage */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4 w-full mb-6 sm:mb-8">
        {displayApps.map((app) => {
          const Icon = app.icon;
          return (
            <motion.button
              key={app.id}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveApp(app.id)}
              className={cn(
                "bg-white dark:bg-[#141c2e] border border-slate-300 dark:border-slate-700/80 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-3 sm:p-4 md:p-4.5 flex flex-col items-center justify-center gap-2 sm:gap-3 shadow-xs hover:shadow-md transition-all text-center group relative overflow-hidden cursor-pointer",
                "hover:shadow-lg"
              )}
            >
              {/* Badge superior */}
              {app.badge ? (
                <div className="absolute top-2 sm:top-2.5 right-2 sm:right-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[7px] sm:text-[8px] font-black py-0.5 px-2 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-2xs z-10">
                  <span>{app.badge}</span>
                </div>
              ) : (
                <div className="hidden" />
              )}

              {/* Ícone */}
              <div
                className={cn(
                  `w-10 h-10 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-xl sm:rounded-2xl ${app.color} flex items-center justify-center text-white shadow-md transition-transform group-hover:rotate-6`
                )}
              >
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
              </div>

              {/* Informações */}
              <div className="w-full">
                <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter text-[11px] sm:text-xs md:text-sm leading-tight truncate px-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {app.label}
                </h3>
                {(app.subtitle || app.description) && (
                  <p className="text-[8px] sm:text-[9.5px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5 sm:mt-1 transition-colors line-clamp-1 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                    {app.subtitle || app.description}
                  </p>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Banner Informativo da Sincronização */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl sm:rounded-3xl text-white shadow-md border border-indigo-900/50 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center shrink-0 text-amber-300">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-xs sm:text-base font-black uppercase tracking-tight">
              Sincronização em Tempo Real com a Escala 24h
            </h4>
            <p className="text-[10px] sm:text-xs text-slate-300 font-medium mt-0.5 max-w-2xl">
              As designações de Oficial de Dia nas seções ativas de {obmContext || '10º GBM'} alimentam diretamente a seção consolidada de oficiais na Escala 24h.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-white/10 text-slate-200 border border-white/10">
            {obmContext || '10º GBM'}
          </span>
        </div>
      </div>
    </div>
  );
}
