import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { 
  LayoutGrid, 
  Save, 
  Lock, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Check, 
  RotateCcw,
  Users,
  Shield,
  BookOpen,
  ShieldCheck,
  BriefcaseBusiness,
  ArrowRightLeft,
  Calendar,
  CalendarRange,
  Anchor,
  Settings,
  UtensilsCrossed,
  ShoppingCart,
  Package,
  FileText,
  UserCheck,
  Bus,
  Radio,
  Settings2,
  Ruler,
  Library,
  Layers,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { useAppConfig } from '../contexts/ConfigContext';
import { cleanUndefined } from "../lib/utils";
import { motion, AnimatePresence } from 'motion/react';

export interface ModuleVisibilityConfig {
  [moduleId: string]: string[];
}

export type ModuleSection = 'operacional' | 'informativo' | 'escalante' | 'moderador' | 'submodulos';

export interface ModuleCatalogItem {
  id: string;
  name: string;
  description: string;
  section: ModuleSection;
  sectionLabel: string;
  icon: any;
  color: string;
  defaultGroups: string[];
}

export const MODULE_CATALOG: ModuleCatalogItem[] = [
  // 1. Operacional (6 apps da Home)
  {
    id: 'permutas',
    name: 'Permutas de Escala',
    description: 'Gestão de trocas e solicitações de permutas entre militares',
    section: 'operacional',
    sectionLabel: 'Operacional',
    icon: ArrowRightLeft,
    color: 'bg-indigo-600 shadow-indigo-200',
    defaultGroups: ['TODOS']
  },
  {
    id: 'agenda',
    name: 'Agenda Operacional',
    description: 'Calendário integrado de serviços e plantões',
    section: 'operacional',
    sectionLabel: 'Operacional',
    icon: Calendar,
    color: 'bg-amber-500 shadow-amber-200',
    defaultGroups: ['TODOS']
  },
  {
    id: 'expediente',
    name: 'Escala do Expediente',
    description: 'Planejamento e controle de escala do serviço administrativo de expediente',
    section: 'operacional',
    sectionLabel: 'Operacional',
    icon: CalendarRange,
    color: 'bg-indigo-400 shadow-indigo-100',
    defaultGroups: ['EXP', 'ADMIN', 'ESCALANTE', 'OFICIAIS']
  },
  {
    id: 'servicos-grd',
    name: 'Serviços e GRD (Oficiais)',
    description: 'Escala de Oficiais, Oficial de Dia e Sobreaviso',
    section: 'operacional',
    sectionLabel: 'Operacional',
    icon: ShieldCheck,
    color: 'bg-indigo-700 shadow-indigo-200',
    defaultGroups: ['OFICIAIS', 'ADMIN', 'ESCALANTE']
  },
  {
    id: 'nucleo-nautico',
    name: 'Núcleo Náutico',
    description: 'Serviços especializados e GRD marítima/náutica',
    section: 'operacional',
    sectionLabel: 'Operacional',
    icon: Anchor,
    color: 'bg-cyan-600 shadow-cyan-200',
    defaultGroups: ['OFICIAIS', 'ADMIN', 'ESCALANTE']
  },
  {
    id: 'ras',
    name: 'RAS (Regime Adicional de Serviço)',
    description: 'Escala voluntária extraordinária e banco de horas',
    section: 'operacional',
    sectionLabel: 'Operacional',
    icon: BriefcaseBusiness,
    color: 'bg-amber-600 shadow-amber-200',
    defaultGroups: ['PRACAS', 'ADMIN', 'ESCALANTE']
  },

  // 2. Informativo (3 apps da Home)
  {
    id: 'painel-militar',
    name: 'Painel do Militar',
    description: 'Acesso do bombeiro a seus dados cadastrais, medidas e férias pessoais',
    section: 'informativo',
    sectionLabel: 'Informativo',
    icon: Settings,
    color: 'bg-teal-600 shadow-teal-200',
    defaultGroups: ['TODOS']
  },
  {
    id: 'documentos',
    name: 'Documentos',
    description: 'Boletins ostensivos, normas e manuais de serviço',
    section: 'informativo',
    sectionLabel: 'Informativo',
    icon: BookOpen,
    color: 'bg-slate-700 shadow-slate-200',
    defaultGroups: ['TODOS']
  },
  {
    id: 'refeitorio',
    name: 'Refeitório',
    description: 'Cardápio do dia e informações de refeições do rancho',
    section: 'informativo',
    sectionLabel: 'Informativo',
    icon: UtensilsCrossed,
    color: 'bg-rose-500 shadow-rose-200',
    defaultGroups: ['TODOS']
  },

  // 3. Espaço do Escalante / Admin (7 apps da Home)
  {
    id: 'buscar-militar',
    name: 'Buscar Militar',
    description: 'Diretório e consulta de fichas e contatos do efetivo',
    section: 'escalante',
    sectionLabel: 'Espaço do Escalante',
    icon: Search,
    color: 'bg-blue-600 shadow-blue-200',
    defaultGroups: ['ADMIN', 'ESCALANTE', 'OFICIAIS']
  },
  {
    id: 'aprovisionamento',
    name: 'Aprovisionamento',
    description: 'Cardápio, estoque, contagem de rancho e suprimentos',
    section: 'escalante',
    sectionLabel: 'Espaço do Escalante',
    icon: ShoppingCart,
    color: 'bg-amber-600 shadow-amber-200',
    defaultGroups: ['ADMIN', 'ESCALANTE', 'OFICIAIS', 'REFEITORIO_ADMIN']
  },
  {
    id: 'efetivo',
    name: 'Gestão de Efetivo',
    description: 'Mapa de força da tropa, subunidades, prontidão e alas',
    section: 'escalante',
    sectionLabel: 'Espaço do Escalante',
    icon: Users,
    color: 'bg-emerald-600 shadow-emerald-200',
    defaultGroups: ['ADMIN', 'ESCALANTE', 'OFICIAIS']
  },
  {
    id: 'patrimonio',
    name: 'Bens Patrimoniais',
    description: 'Inventário, cautelas individuais e carga de materiais',
    section: 'escalante',
    sectionLabel: 'Espaço do Escalante',
    icon: Package,
    color: 'bg-cyan-600 shadow-cyan-200',
    defaultGroups: ['ADMIN', 'ESCALANTE', 'OFICIAIS']
  },
  {
    id: 'relatorio',
    name: 'Relatórios do Efetivo',
    description: 'Mapas analíticos, gráficos e indicadores gerenciais',
    section: 'escalante',
    sectionLabel: 'Espaço do Escalante',
    icon: FileText,
    color: 'bg-rose-600 shadow-rose-200',
    defaultGroups: ['ADMIN', 'ESCALANTE', 'OFICIAIS']
  },
  {
    id: 'escalante-gerenciar',
    name: 'Painel do Escalante',
    description: 'Distribuição, moderação e planejamento das escalas',
    section: 'escalante',
    sectionLabel: 'Espaço do Escalante',
    icon: UserCheck,
    color: 'bg-violet-600 shadow-violet-200',
    defaultGroups: ['ADMIN', 'ESCALANTE', 'OFICIAIS']
  },
  {
    id: 'gestao-sad',
    name: 'Gestão SAD',
    description: 'Gestão de Oficiais, terceirizados civis, férias e sincronização DGP',
    section: 'escalante',
    sectionLabel: 'Espaço do Escalante',
    icon: BriefcaseBusiness,
    color: 'bg-emerald-800 shadow-emerald-200',
    defaultGroups: ['ADMIN', 'ESCALANTE']
  },

  // 4. Painel de Moderação (4 apps da Home)
  {
    id: 'grd',
    name: 'GRD (Guarnição de Resgate e Defesa)',
    description: 'Quadro operacional e lançamento de prontidão das guarnições',
    section: 'moderador',
    sectionLabel: 'Painel de Moderação',
    icon: Shield,
    color: 'bg-emerald-700 shadow-emerald-200',
    defaultGroups: ['EXP', 'PRONTIDAO', 'ADMIN', 'ESCALANTE']
  },
  {
    id: 'translado',
    name: 'Translado OBM',
    description: 'Escala e rotas de viaturas administrativas de transporte',
    section: 'moderador',
    sectionLabel: 'Painel de Moderação',
    icon: Bus,
    color: 'bg-blue-500 shadow-blue-200',
    defaultGroups: ['ADMIN', 'ESCALANTE']
  },
  {
    id: 'comunicacao',
    name: 'Painel do Comunicante',
    description: 'Acionamento e controle de viaturas em tempo real',
    section: 'moderador',
    sectionLabel: 'Painel de Moderação',
    icon: Radio,
    color: 'bg-rose-600 shadow-rose-200',
    defaultGroups: ['ADMIN', 'ESCALANTE']
  },
  {
    id: 'configuracoes',
    name: 'Configurações',
    description: 'Painel geral do sistema, papéis, regras de alas e visibilidade',
    section: 'moderador',
    sectionLabel: 'Painel de Moderação',
    icon: Settings2,
    color: 'bg-slate-800 shadow-slate-200',
    defaultGroups: ['ADMIN']
  },

  // 5. Submódulos e Telas Internas (4 módulos)
  {
    id: 'atualizacao',
    name: 'Atualização Cadastral',
    description: 'Submódulo interno do Painel do Militar (dados pessoais e telefones)',
    section: 'submodulos',
    sectionLabel: 'Submódulos / Telas Internas',
    icon: Settings,
    color: 'bg-teal-700 shadow-teal-200',
    defaultGroups: ['TODOS']
  },
  {
    id: 'medidas',
    name: 'Medidas Antropométricas',
    description: 'Submódulo interno do Painel do Militar (tamanhos de uniformes e EPIs)',
    section: 'submodulos',
    sectionLabel: 'Submódulos / Telas Internas',
    icon: Ruler,
    color: 'bg-indigo-600 shadow-indigo-200',
    defaultGroups: ['TODOS']
  },
  {
    id: 'ferias',
    name: 'Controle de Férias Pessoal',
    description: 'Submódulo interno do Painel do Militar (escalonamento anual)',
    section: 'submodulos',
    sectionLabel: 'Submódulos / Telas Internas',
    icon: Library,
    color: 'bg-orange-600 shadow-orange-200',
    defaultGroups: ['TODOS']
  },
  {
    id: 'sop-medidas',
    name: 'Gestão de Efetivo - SOP',
    description: 'Submódulo da Gestão de Efetivo (tabela de medidas e fardamento coletivo)',
    section: 'submodulos',
    sectionLabel: 'Submódulos / Telas Internas',
    icon: Layers,
    color: 'bg-indigo-800 shadow-indigo-200',
    defaultGroups: ['ADMIN', 'ESCALANTE']
  }
];

export const DEFAULT_CONFIG: ModuleVisibilityConfig = MODULE_CATALOG.reduce((acc, mod) => {
  acc[mod.id] = mod.defaultGroups;
  return acc;
}, {} as ModuleVisibilityConfig);

// Legacy alias to maintain backward compatibility
DEFAULT_CONFIG['ferias-sad'] = ['ADMIN', 'ESCALANTE'];

export const AVAILABLE_GROUPS = [
  { id: 'TODOS', label: 'Todos os Militares', short: 'Todos' },
  { id: 'OFICIAIS', label: 'Apenas Oficiais', short: 'Oficiais' },
  { id: 'PRACAS', label: 'Praças', short: 'Praças' },
  { id: 'EXP', label: 'Expediente', short: 'Expediente' },
  { id: 'PRONTIDAO', label: 'Prontidão (Alas 1 a 4)', short: 'Prontidão' },
  { id: 'ADMIN', label: 'Administradores', short: 'Admin' },
  { id: 'ESCALANTE', label: 'Escalantes', short: 'Escalante' },
  { id: 'REFEITORIO_ADMIN', label: 'Gestor de Refeitório', short: 'Gestor Rancho' },
];

export function AppVisibilityConfig() {
  const { refreshConfigs } = useAppConfig();
  const [config, setConfig] = useState<ModuleVisibilityConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activeSectionFilter, setActiveSectionFilter] = useState<'all' | ModuleSection>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'app_visibility'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.visibility) {
          const loaded = { ...data.visibility };
          // Sync gestao-sad and ferias-sad backward compatibility
          if (loaded['ferias-sad'] && !loaded['gestao-sad']) {
            loaded['gestao-sad'] = loaded['ferias-sad'];
          }
          setConfig({ ...DEFAULT_CONFIG, ...loaded });
        }
      }
    });
    return () => unsub();
  }, []);

  const toggleGroup = (moduleId: string, groupId: string) => {
    setConfig(prev => {
      const currentGroups = prev[moduleId] || [];
      const isTodos = groupId === 'TODOS';
      
      let newGroups = [...currentGroups];

      if (isTodos) {
        if (newGroups.includes('TODOS')) {
           newGroups = newGroups.filter(g => g.startsWith('RG:'));
           if (newGroups.length === 0) newGroups = [];
        } else {
           newGroups = ['TODOS', ...newGroups.filter(g => g.startsWith('RG:'))];
        }
      } else {
        if (newGroups.includes(groupId)) {
          newGroups = newGroups.filter(g => g !== groupId);
        } else {
          newGroups = newGroups.filter(g => g !== 'TODOS');
          newGroups.push(groupId);
        }
      }

      return {
        ...prev,
        [moduleId]: newGroups
      };
    });
  };

  const setPreset = (moduleId: string, preset: 'todos' | 'gestores' | 'bloquear' | 'padrao') => {
    setConfig(prev => {
      const currentGroups = prev[moduleId] || [];
      const existingRgs = currentGroups.filter(g => g.startsWith('RG:'));
      let target: string[] = [];

      if (preset === 'todos') {
        target = ['TODOS', ...existingRgs];
      } else if (preset === 'gestores') {
        target = ['ADMIN', 'ESCALANTE', ...existingRgs];
      } else if (preset === 'bloquear') {
        target = [];
      } else if (preset === 'padrao') {
        const defaultMod = MODULE_CATALOG.find(m => m.id === moduleId);
        target = defaultMod ? [...defaultMod.defaultGroups] : ['TODOS'];
      }

      return {
        ...prev,
        [moduleId]: target
      };
    });
  };

  const updateModuleRGs = (moduleId: string, rgsList: string) => {
    setConfig(prev => {
      const currentGroups = prev[moduleId] || [];
      const nonRggroups = currentGroups.filter(g => !g.startsWith('RG:'));
      
      const newRgs = rgsList.split(',')
        .map(s => s.trim())
        .filter(s => s)
        .map(rg => `RG:${rg}`);
        
      return {
        ...prev,
        [moduleId]: [...nonRggroups, ...newRgs]
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: ModuleVisibilityConfig = { ...config };
      // Always mirror gestao-sad and ferias-sad for backward compatibility
      if (payload['gestao-sad']) {
        payload['ferias-sad'] = payload['gestao-sad'];
      } else if (payload['ferias-sad']) {
        payload['gestao-sad'] = payload['ferias-sad'];
      }

      await setDoc(doc(db, 'config', 'app_visibility'), cleanUndefined({
        visibility: payload,
        updatedAt: new Date().toISOString()
      }), { merge: true });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Error saving visibility', e);
    } finally {
      if (refreshConfigs) {
        await refreshConfigs();
      }
      setSaving(false);
    }
  };

  const filteredModules = useMemo(() => {
    return MODULE_CATALOG.filter(mod => {
      const matchesSection = activeSectionFilter === 'all' || mod.section === activeSectionFilter;
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = !term || 
        mod.name.toLowerCase().includes(term) || 
        mod.description.toLowerCase().includes(term) ||
        mod.id.toLowerCase().includes(term) ||
        mod.sectionLabel.toLowerCase().includes(term);
      return matchesSection && matchesSearch;
    });
  }, [activeSectionFilter, searchTerm]);

  const sectionCounts = useMemo(() => {
    const counts = {
      all: MODULE_CATALOG.length,
      operacional: 0,
      informativo: 0,
      escalante: 0,
      moderador: 0,
      submodulos: 0
    };
    MODULE_CATALOG.forEach(m => {
      counts[m.section] = (counts[m.section] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col gap-6">
      {/* Header */}
      <div 
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-indigo-900 uppercase tracking-tight flex items-center gap-2">
                Visibilidade de Aplicativos (Home)
                {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </h3>
              <span className="bg-indigo-100 text-indigo-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                {MODULE_CATALOG.length} Módulos
              </span>
            </div>
            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest mt-0.5">
              Controle detalhado de acesso e exibição de cada aplicativo da Home e subtelas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Visibilidades Gravadas!
            </span>
          )}

          {expanded && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleSave(); }}
              disabled={saving}
              className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm active:scale-95"
            >
              {saving ? 'Gravando...' : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Salvar Visibilidades
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <motion.div
        initial={false}
        animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
        className="overflow-hidden"
      >
        <div className="flex flex-col gap-5 pt-2">
          {/* Controls: Search and Section Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: 'all', label: 'Todos', count: sectionCounts.all },
                { id: 'operacional', label: 'Operacional', count: sectionCounts.operacional },
                { id: 'informativo', label: 'Informativo', count: sectionCounts.informativo },
                { id: 'escalante', label: 'Escalante', count: sectionCounts.escalante },
                { id: 'moderador', label: 'Moderação', count: sectionCounts.moderador },
                { id: 'submodulos', label: 'Subtelas', count: sectionCounts.submodulos },
              ].map(tab => {
                const isActive = activeSectionFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSectionFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      isActive 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[8px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar módulo ou seção..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-300"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Module List */}
          <div className="flex flex-col gap-4">
            {filteredModules.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Nenhum aplicativo encontrado</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Tente ajustar o termo de busca ou o filtro de seção.</p>
              </div>
            ) : (
              filteredModules.map((mod) => {
                const activeGroups = config[mod.id] || [];
                const activeRGs = activeGroups.filter(g => g.startsWith('RG:')).map(g => g.replace('RG:', ''));
                const nonRggroups = activeGroups.filter(g => !g.startsWith('RG:'));
                const isTodos = nonRggroups.includes('TODOS');
                const isLocked = activeGroups.length === 0;
                const Icon = mod.icon;

                return (
                  <div 
                    key={mod.id} 
                    className="flex flex-col border border-slate-200/80 rounded-xl p-4 sm:p-5 bg-slate-50/70 hover:bg-slate-50 hover:border-indigo-200 transition-all gap-3.5 shadow-sm"
                  >
                    {/* Header of Module */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200/60 pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${mod.color} flex items-center justify-center text-white shrink-0 shadow-sm`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black uppercase text-slate-800 tracking-tight">
                              {mod.name}
                            </span>
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-600 tracking-wider">
                              {mod.sectionLabel}
                            </span>
                            <span className="text-[8px] font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                              id: {mod.id}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5 line-clamp-1">
                            {mod.description}
                          </p>
                        </div>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => setPreset(mod.id, 'todos')}
                          title="Liberar para todos os militares"
                          className="px-2 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded text-[8px] font-black uppercase text-indigo-700 tracking-wider transition-all"
                        >
                          Liberar Todos
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreset(mod.id, 'gestores')}
                          title="Apenas Administradores e Escalantes"
                          className="px-2 py-1 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-200 rounded text-[8px] font-black uppercase text-amber-700 tracking-wider transition-all"
                        >
                          Gestores
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreset(mod.id, 'padrao')}
                          title="Restaurar padrão inicial do sistema"
                          className="p-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-400 hover:text-slate-600 transition-all"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Group Selection Buttons */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                          Grupos com permissão de visualização:
                        </span>
                        {isTodos ? (
                          <span className="text-[8px] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                            Visível para Todos
                          </span>
                        ) : isLocked ? (
                          <span className="text-[8px] font-black uppercase text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            Acesso Restrito (Oculto)
                          </span>
                        ) : (
                          <span className="text-[8px] font-black uppercase text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                            {nonRggroups.length} grupo(s) selecionado(s)
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {AVAILABLE_GROUPS.map(grp => {
                          const isActive = nonRggroups.includes(grp.id);
                          const isGroupTodos = grp.id === 'TODOS';
                          return (
                            <button
                              key={grp.id}
                              type="button"
                              onClick={() => toggleGroup(mod.id, grp.id)}
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all border flex items-center gap-1.5 ${
                                isActive 
                                  ? isGroupTodos 
                                    ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm'
                                    : 'bg-indigo-100 border-indigo-300 text-indigo-900 shadow-sm' 
                                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              {isActive && <Check className="w-2.5 h-2.5" />}
                              <span>{grp.label}</span>
                            </button>
                          );
                        })}

                        {isLocked && (
                          <div className="flex items-center gap-1 text-[9px] font-black text-red-600 uppercase px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                            <Lock className="w-3 h-3" />
                            Oculto no Portal Principal
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Specific RGs Configuration */}
                    <div className="mt-1 flex flex-col gap-1.5 bg-white p-3 rounded-lg border border-slate-200/70">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                          Liberar pontualmente para RGs específicos (opcional):
                        </label>
                        {activeRGs.length > 0 && (
                          <span className="text-[8px] font-black text-indigo-600 uppercase">
                            {activeRGs.length} RG(s) adicionado(s)
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={activeRGs.join(', ')}
                        onChange={(e) => updateModuleRGs(mod.id, e.target.value)}
                        placeholder="Ex: 54444, 48098, 12764 (separados por vírgula)"
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:bg-white focus:border-indigo-500 transition-all placeholder:text-slate-300"
                      />
                      {activeRGs.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {activeRGs.map((rg) => (
                            <span 
                              key={rg}
                              className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md"
                            >
                              RG: {rg}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Guide */}
          <div className="mt-2 p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-[10px] font-medium leading-relaxed flex flex-col gap-1">
            <span className="font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Como funciona a regra de visibilidade:
            </span>
            <p>
              • Se <b>"Todos os Militares"</b> estiver selecionado, qualquer bombeiro autenticado verá o card na Home.
            </p>
            <p>
              • Ao selecionar grupos restritos (ex: <b>"Apenas Oficiais"</b> ou <b>"Expediente"</b>), o aplicativo será exibido exclusivamente para membros com essa qualificação ou ala.
            </p>
            <p>
              • <b>RGs específicos</b> ignoram filtros de grupo: mesmo que um módulo seja restrito a oficiais, um praça com o RG listado terá acesso total concedido.
            </p>
            <p>
              • Se nenhum grupo e nenhum RG estiver marcado, o módulo ficará em <b>Acesso Restrito (Oculto)</b> para todos os usuários.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
