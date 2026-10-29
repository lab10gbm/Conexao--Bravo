import React, { useState, useMemo } from 'react';
import { 
  Settings, X, Shield, Truck, ClipboardList, Eye, EyeOff, Plus, Trash2, 
  RotateCcw, Check, ChevronRight, AlertCircle, Anchor, Stethoscope, Star, 
  Sparkles, Sliders, Users, Info, ArrowRightLeft, Radio, Building2, Flame,
  Sun, ShieldAlert, FileText, CheckCircle2, ChevronUp, ChevronDown, Search
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { normalizeFnName } from '../lib/escalaCalculos';
import { OfficerSectionItem } from '../../../types/officerSections';
import { OfficerVisibility, EscalaViaturaInfo, ViaturaSlotType, SentinelaSlot } from '../types';
import { NovaSecaoOficialModal } from '../../../components/NovaSecaoOficialModal';

export interface EscalaConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  obmContext: string;
  selectedDate: string;
  // Oficiais
  officerSections: OfficerSectionItem[];
  officerVisibility: OfficerVisibility;
  onToggleOfficerVisibility: (key: any) => void;
  onSaveOfficerSection: (section: OfficerSectionItem) => Promise<void>;
  onDeleteOfficerSection: (sectionId: string) => Promise<void>;
  // Viaturas
  viaturasInfo: EscalaViaturaInfo[];
  setViaturasInfo: React.Dispatch<React.SetStateAction<EscalaViaturaInfo[]>>;
  onApplyObmPattern: () => void;
  onAddViaturaExtra: () => void;
  // Funções Administrativas
  adminRolesVisibility: Record<string, boolean>;
  onToggleAdminRoleVisibility: (roleName: string) => void;
  onSetAllAdminRolesVisibility: (visible: boolean) => void;
  roleQtds: Record<string, number>;
  setRoleQtds: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  // Sentinelas & Postos
  postosEscalaEnabled: boolean;
  setPostosEscalaEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  sentinelaSlots: SentinelaSlot[] | null;
  // Visibilidade Geral das Seções da Escala
  sectionsVisibility: Record<string, boolean>;
  onToggleSectionVisibility: (sectionKey: string) => void;
  onSetAllSectionsVisibility: (visible: boolean) => void;
}

type TabType = 'oficiais' | 'viaturas' | 'admin' | 'secoes';

interface AdminRoleDefinition {
  name: string;
  label: string;
  defaultReq: number;
  desc: string;
  badge?: string;
}

const DEFAULT_ADMIN_ROLES: AdminRoleDefinition[] = [
  { name: 'ADJUNTO', label: 'Adjunto ao Oficial de Dia', defaultReq: 1, desc: 'Auxilia na coordenação geral do serviço e fiscalização da unidade', badge: 'Comando' },
  { name: 'ENCARREGADO DE MOTORISTA', label: 'Encarregado de Motoristas', defaultReq: 1, desc: 'Fiscalização das viaturas, abastecimento e guarnição de condutores', badge: 'Transporte' },
  { name: 'SGT DIA', label: 'Sargento de Dia', defaultReq: 1, desc: 'Supervisão direta das rotinas internas da tropa e prontidão', badge: 'Interno' },
  { name: 'CMT GUARDA', label: 'Comandante da Guarda', defaultReq: 1, desc: 'Comando do posto de sentinela, segurança do quartel e portaria', badge: 'Segurança' },
  { name: 'CB DIA', label: 'Cabo de Dia', defaultReq: 1, desc: 'Auxiliar direto do Sargento de Dia no controle interno do efetivo', badge: 'Interno' },
  { name: 'CB GUARDA', label: 'Cabo da Guarda', defaultReq: 1, desc: 'Auxiliar do Cmt da Guarda no rendimento e vigilância dos quartos', badge: 'Segurança' },
  { name: 'RESP FAXINA', label: 'Responsável pela Faxina', defaultReq: 1, desc: 'Coordenação das equipes de limpeza e manutenção do quartel', badge: 'Rotina' },
  { name: 'DIA AO DEPOSITO', label: 'Dia ao Depósito', defaultReq: 1, desc: 'Controle, carga e entrega de ferramentas e suprimentos', badge: 'Logística' },
  { name: 'ABASTECEDOR', label: 'Abastecedor de Viaturas', defaultReq: 1, desc: 'Verificação diária dos níveis de combustível da frota', badge: 'Logística' },
  { name: 'COMUNICANTE', label: 'Comunicante / Sala de Operações', defaultReq: 1, desc: 'Operação da central de telecomunicações e rádio do socorro', badge: 'Operações' },
  { name: 'SENTINELA', label: 'Sentinela da Guarda', defaultReq: 4, desc: 'Vigilância armada dos postos da guarda do quartel', badge: 'Segurança' },
  { name: 'AUXILIAR RANCHO', label: 'Auxiliar de Rancho', defaultReq: 1, desc: 'Apoio na preparação, organização e distribuição das refeições', badge: 'Aprovisionamento' },
  { name: 'TOQUE DE FOGO', label: 'Toque de Fogo', defaultReq: 1, desc: 'Guarnição rápida de primeira resposta e alarme no quartel', badge: 'Operações' },
  { name: 'ESCALANTE', label: 'Auxiliar da Administração / Escalante', defaultReq: 1, desc: 'Gestão da escala 24h e lançamentos de serviço diário', badge: 'Administração' },
];

export function EscalaConfigModal({
  isOpen,
  onClose,
  obmContext,
  selectedDate,
  officerSections,
  officerVisibility,
  onToggleOfficerVisibility,
  onSaveOfficerSection,
  onDeleteOfficerSection,
  viaturasInfo,
  setViaturasInfo,
  onApplyObmPattern,
  onAddViaturaExtra,
  adminRolesVisibility,
  onToggleAdminRoleVisibility,
  onSetAllAdminRolesVisibility,
  roleQtds,
  setRoleQtds,
  postosEscalaEnabled,
  setPostosEscalaEnabled,
  sectionsVisibility,
  onToggleSectionVisibility,
  onSetAllSectionsVisibility,
}: EscalaConfigModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('oficiais');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNovaSecaoModal, setShowNovaSecaoModal] = useState(false);
  const [extraVtrInput, setExtraVtrInput] = useState('');
  const [showAddVtrInline, setShowAddVtrInline] = useState(false);

  if (!isOpen) return null;

  const handleSetRoleQtd = (name: string, delta: number) => {
    setRoleQtds((prev) => {
      const def = DEFAULT_ADMIN_ROLES.find((r) => r.name === name)?.defaultReq ?? 1;
      const current = prev[name] ?? def;
      const nextVal = Math.max(0, current + delta);
      return { ...prev, [name]: nextVal };
    });
  };

  const handleSetRoleQtdDirect = (name: string, value: number) => {
    setRoleQtds((prev) => ({
      ...prev,
      [name]: Math.max(0, value),
    }));
  };

  // Mutação em Viaturas
  const handleToggleVtrAtiva = (vtrId: string) => {
    setViaturasInfo((prev) =>
      prev.map((v) => (v.id === vtrId || v.vtr === vtrId ? { ...v, ativa: !Boolean(v.ativa) } : v))
    );
  };

  const handleToggleVtrExibir = (vtrId: string) => {
    setViaturasInfo((prev) =>
      prev.map((v) =>
        v.id === vtrId || v.vtr === vtrId
          ? { ...v, exibir: !(v.exibir !== undefined ? Boolean(v.exibir) : true) }
          : v
      )
    );
  };

  const handleSetVtrEspaco = (vtrId: string, esp: '1' | '1/2' | '1/3') => {
    setViaturasInfo((prev) =>
      prev.map((v) => (v.id === vtrId || v.vtr === vtrId ? { ...v, espaco: esp } : v))
    );
  };

  const handleToggleSlot = (vtrId: string, slot: ViaturaSlotType) => {
    setViaturasInfo((prev) =>
      prev.map((v) => {
        if (v.id === vtrId || v.vtr === vtrId) {
          if (v.blocked?.includes(slot)) return v;
          return { ...v, [slot]: !v[slot] };
        }
        return v;
      })
    );
  };

  const handleAddVtrSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraVtrInput.trim()) return;
    const vtrName = extraVtrInput.trim().toUpperCase();
    onAddViaturaExtra();
    setExtraVtrInput('');
    setShowAddVtrInline(false);
  };

  const handleAddCustomVtrDirect = (name: string) => {
    if (!name.trim()) return;
    const cleanName = name.trim().toUpperCase();
    const newVtr: EscalaViaturaInfo = {
      id: `${cleanName}_${Date.now()}`,
      vtr: cleanName,
      ativa: true,
      exibir: true,
      espaco: '1',
      maritima: cleanName.startsWith('L-') || cleanName.startsWith('BIA'),
      obm: obmContext,
      tipo: 'operacional',
      condutor: true,
      cg: true,
      g1: true,
      g2: true,
      g3: false,
      g4: false,
      blocked: [],
    };
    setViaturasInfo((prev) => [...prev, newVtr]);
    setExtraVtrInput('');
    setShowAddVtrInline(false);
  };

  const SCALE_SECTIONS_LIST = [
    {
      id: 'oficiais',
      title: 'Seção de Cmt de Socorro & Oficiais',
      desc: 'Comandante de Socorro, Oficial de Dia (GRD), Núcleo Náutico, Médicos e funções operacionais (Oficiais e Subtenentes)',
      icon: Shield,
      color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      id: 'permutas',
      title: 'Solicitações de Permutas',
      desc: 'Quadro de permutas operacionais deferidas e em análise para a data',
      icon: ArrowRightLeft,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'ras',
      title: 'Regime Adicional de Serviço (RAS)',
      desc: 'Lançamentos de militares voluntários em RAS 12h ou 24h na escala',
      icon: Star,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    },
    {
      id: 'baseRoster',
      title: 'Escala Espelho da Ala (Efetivo Principal)',
      desc: 'Tabela principal com todo o efetivo da prontidão, funções atribuídas e sorteio',
      icon: Users,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    },
    {
      id: 'postos',
      title: 'Postos de Serviço / Postos de Praia',
      desc: 'Guarnição de postos externos, salvamento aquático e serviços destacados',
      icon: Sun,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    },
    {
      id: 'sentinelas',
      title: 'Sentinelas da Guarda (Quartos de Hora)',
      desc: 'Escala com divisão dos 4 quartos de hora da guarda do quartel',
      icon: ShieldAlert,
      color: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    },
    {
      id: 'afastamentos',
      title: 'Afastamentos da Ala',
      desc: 'Relação de militares em férias, licenças especiais ou dispensas médicas',
      icon: AlertCircle,
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    },
    {
      id: 'expediente',
      title: 'Militares de Expediente no Dia',
      desc: 'Militares que cumprem expediente administrativo diário na unidade',
      icon: Building2,
      color: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
    },
    {
      id: 'grd',
      title: 'Guarnição de Reforço (GRD) no Dia',
      desc: 'Efetivo de prontidão operacional escalado para reforço das guarnições',
      icon: Flame,
      color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    },
    {
      id: 'adminRoles',
      title: 'Funções Administrativas (Quadro de Vagas)',
      desc: 'Painel com resumo das funções internas: adjunto, sargento de dia, faxina, etc.',
      icon: ClipboardList,
      color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      id: 'operacional',
      title: 'Prontidão Operacional das Viaturas',
      desc: 'Resumo das guarnições necessárias por viatura de socorro (condutor, chefe, linha)',
      icon: Radio,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      id: 'viaturas',
      title: 'Controle e Distribuição de Viaturas',
      desc: 'Quadro técnico com slots, exibição e guarnições de cada veículo',
      icon: Truck,
      color: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* HEADER MODAL */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-400 flex items-center justify-center shadow-inner shrink-0">
              <Settings className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-white flex items-center gap-1.5">
                  Configurações da Escala 24h
                </h2>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {obmContext}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-300 font-semibold tracking-wide mt-0.5">
                Personalize seções, comandante de socorro, oficiais de dia, viaturas e funções operacionais
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Fechar configurações"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVEGAÇÃO DE TABS */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-3 sm:px-5 gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => { setActiveTab('oficiais'); setSearchTerm(''); }}
            className={cn(
              "py-3 px-3.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap",
              activeTab === 'oficiais'
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Shield className="w-4 h-4 text-indigo-500" />
            <span>Seção de Cmt de Socorro</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('viaturas'); setSearchTerm(''); }}
            className={cn(
              "py-3 px-3.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap",
              activeTab === 'viaturas'
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Truck className="w-4 h-4 text-emerald-500" />
            <span>Viaturas Operacionais</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('admin'); setSearchTerm(''); }}
            className={cn(
              "py-3 px-3.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap",
              activeTab === 'admin'
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <ClipboardList className="w-4 h-4 text-amber-500" />
            <span>Funções Administrativas</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('secoes'); setSearchTerm(''); }}
            className={cn(
              "py-3 px-3.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap",
              activeTab === 'secoes'
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Eye className="w-4 h-4 text-sky-500" />
            <span>Visibilidade das Seções</span>
          </button>
        </div>

        {/* CORPO DO MODAL COM CONTEÚDO DAS TABS */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
          
          {/* ======================================================== */}
          {/* TAB 1: SEÇÃO DE CMT DE SOCORRO & OFICIAIS */}
          {/* ======================================================== */}
          {activeTab === 'oficiais' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Card Master de Ativação Geral */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-indigo-950 dark:text-indigo-100">
                      Exibir Seção de Cmt de Socorro na Escala 24h
                    </h3>
                    <p className="text-[10px] sm:text-xs text-indigo-700 dark:text-indigo-300">
                      Liga ou desliga todo o bloco de comando de socorro e escalas de oficiais no espelho de serviço (Oficiais e Subtenentes)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleOfficerVisibility('showSection')}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 shadow-2xs",
                    officerVisibility.showSection !== false
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  )}
                >
                  {officerVisibility.showSection !== false ? "✓ Ativado" : "Desativado"}
                </button>
              </div>

              {/* Seções Padrão de Oficiais */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Seções Padrão da OBM
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Oficial de Dia */}
                  <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-black uppercase text-slate-800 dark:text-white">Oficial de Dia</div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">GRD Geral</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleOfficerVisibility('showOficialDia')}
                        className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                          officerVisibility.showOficialDia !== false
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                        )}
                        title="Ativar/desativar visualização"
                      >
                        {officerVisibility.showOficialDia !== false ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Coordenação de serviço geral de oficiais de dia da unidade
                    </span>
                  </div>

                  {/* Oficial Náutico */}
                  <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                          <Anchor className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-black uppercase text-slate-800 dark:text-white">Núcleo Náutico</div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Marítimo / Salvamento</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleOfficerVisibility('showOficialNautica')}
                        className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                          officerVisibility.showOficialNautica
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                        )}
                        title="Ativar/desativar visualização"
                      >
                        {officerVisibility.showOficialNautica ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Operações náuticas, embarcações e condutores marítimos
                    </span>
                  </div>

                  {/* Oficial Médico */}
                  <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                          <Stethoscope className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-black uppercase text-slate-800 dark:text-white">Oficiais Médicos</div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Socorro Médico</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleOfficerVisibility('showOficialMedico')}
                        className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                          officerVisibility.showOficialMedico
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                        )}
                        title="Ativar/desativar visualização"
                      >
                        {officerVisibility.showOficialMedico ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Escala médica, ambulâncias avançadas e regulação
                    </span>
                  </div>
                </div>
              </div>

              {/* Funções Personalizadas / Cmt de Socorro */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Funções Personalizadas / Cmt de Socorro
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Crie funções operacionais específicas como Comandante de Socorro (com Oficiais ou Subtenentes), eventos ou destacamentos
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNovaSecaoModal(true)}
                    className="h-7 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[10px] tracking-wider flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nova Função / Seção</span>
                  </button>
                </div>

                {officerSections.filter(s => s.isCustom).length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                    <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-60" />
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Nenhuma função personalizada cadastrada
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Clique em &quot;Nova Função / Seção&quot; para adicionar Comandante de Socorro ou outra função operacional.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {officerSections.filter(s => s.isCustom).map((sec) => {
                      const isVis = (officerVisibility as any)[`show_${sec.id}`] !== false;
                      return (
                        <div
                          key={sec.id}
                          className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                              <Star className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black uppercase text-slate-800 dark:text-white">
                                  {sec.name}
                                </span>
                                {sec.allowNonOfficers ? (
                                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 uppercase">
                                    Oficiais & Subtenentes
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 uppercase">
                                    {sec.badge || 'Oficiais'}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">{sec.description || sec.subtitle}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onToggleOfficerVisibility(`show_${sec.id}`)}
                              className={cn(
                                "h-7 px-2.5 rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer",
                                isVis
                                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                  : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                              )}
                            >
                              {isVis ? <Check className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                              <span>{isVis ? "Visível" : "Oculta"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onDeleteOfficerSection(sec.id)}
                              className="w-7 h-7 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                              title="Remover seção personalizada"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: FUNÇÕES OPERACIONAIS & VIATURAS */}
          {/* ======================================================== */}
          {activeTab === 'viaturas' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Toolbar de Ações Rápidas */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                    Viaturas no Socorro:
                  </span>
                  <span className="text-xs font-black text-emerald-500 font-mono">
                    {viaturasInfo.filter(v => v.ativa).length} ativas de {viaturasInfo.length}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={onApplyObmPattern}
                    className="h-7 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-black uppercase text-[10px] tracking-wider border border-amber-500/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Restaurar padrão oficial da OBM"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restaurar Padrão OBM</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAddVtrInline(prev => !prev)}
                    className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-wider flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar Viatura</span>
                  </button>
                </div>
              </div>

              {/* Form Inline Adicionar Viatura */}
              {showAddVtrInline && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 animate-in fade-in">
                  <input
                    type="text"
                    value={extraVtrInput}
                    onChange={(e) => setExtraVtrInput(e.target.value.toUpperCase())}
                    placeholder="PREFIXO (Ex: ABT-999, ASE-01, AR-50)"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-black uppercase text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCustomVtrDirect(extraVtrInput)}
                    className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs cursor-pointer shadow-xs"
                  >
                    Salvar VTR
                  </button>
                  <button
                    type="button"
                    onClick={() => { setExtraVtrInput(''); setShowAddVtrInline(false); }}
                    className="h-8 px-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {/* Lista Detalhada de Viaturas */}
              <div className="space-y-3">
                {viaturasInfo.map((vtr) => {
                  const isMaritima = vtr.maritima || vtr.vtr?.startsWith('L-') || vtr.vtr?.startsWith('BIA');
                  return (
                    <div
                      key={vtr.id || vtr.vtr}
                      className={cn(
                        "p-3.5 rounded-2xl border transition-all flex flex-col gap-3",
                        vtr.ativa
                          ? "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-xs"
                          : "bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-75"
                      )}
                    >
                      {/* Linha Superior da Viatura: Prefixo + Ativa + Exibir + Espaço */}
                      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-inner",
                            vtr.ativa 
                              ? (isMaritima ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-400/30" : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-400/30")
                              : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                          )}>
                            {isMaritima ? <Anchor className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="text-xs font-black uppercase text-slate-900 dark:text-white font-mono">
                              {vtr.vtr}
                            </span>
                            <span className="ml-2 text-[9px] font-bold uppercase text-slate-400">
                              {isMaritima ? 'Embarcação' : 'Operacional Terrestre'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Toggle Ativa */}
                          <button
                            type="button"
                            onClick={() => handleToggleVtrAtiva(vtr.id || vtr.vtr)}
                            className={cn(
                              "h-6 px-2 rounded-lg font-black text-[9px] uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer",
                              vtr.ativa
                                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                            )}
                          >
                            <span>{vtr.ativa ? "● No Socorro" : "○ Desativada"}</span>
                          </button>

                          {/* Toggle Exibir no Arquivo */}
                          <button
                            type="button"
                            onClick={() => handleToggleVtrExibir(vtr.id || vtr.vtr)}
                            className={cn(
                              "h-6 px-2 rounded-lg font-black text-[9px] uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer",
                              vtr.exibir !== false
                                ? "bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/40"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                            )}
                            title="Exibir no documento gerado da escala"
                          >
                            <span>{vtr.exibir !== false ? "Exibir ✓" : "Oculta"}</span>
                          </button>

                          {/* Seletor de Espaço */}
                          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-[9px] font-black">
                            {(['1', '1/2', '1/3'] as const).map((esp) => (
                              <button
                                key={esp}
                                type="button"
                                onClick={() => handleSetVtrEspaco(vtr.id || vtr.vtr, esp)}
                                className={cn(
                                  "px-2 py-0.5 transition-colors cursor-pointer",
                                  (vtr.espaco || '1') === esp
                                    ? "bg-indigo-600 text-white"
                                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                                )}
                              >
                                {esp}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Guarnições / Slots da Viatura */}
                      <div>
                        <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
                          Slots de Funções Operacionais:
                        </span>
                        <div className="flex items-center flex-wrap gap-1.5">
                          {([
                            { slot: 'condutor', label: isMaritima ? 'Mestre' : 'Condutor' },
                            { slot: 'cg', label: isMaritima ? 'Patrão / Chefe' : 'Comandante (CG)' },
                            { slot: 'g1', label: isMaritima ? 'Marinheiro 1' : 'Linha 1 (G1)' },
                            { slot: 'g2', label: isMaritima ? 'Marinheiro 2' : 'Linha 2 (G2)' },
                            { slot: 'g3', label: 'Guarnição 3' },
                            { slot: 'g4', label: 'Guarnição 4' },
                          ] as const).map(({ slot, label }) => {
                            const isBlocked = vtr.blocked?.includes(slot);
                            const isChecked = Boolean(vtr[slot]);
                            if (isBlocked) return null;
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => handleToggleSlot(vtr.id || vtr.vtr, slot)}
                                className={cn(
                                  "px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wide flex items-center gap-1.5 transition-all cursor-pointer border",
                                  isChecked
                                    ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 shadow-2xs"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                                )}
                              >
                                <span className={cn(
                                  "w-3 h-3 rounded flex items-center justify-center text-[8px]",
                                  isChecked ? "bg-indigo-600 text-white" : "border border-slate-400"
                                )}>
                                  {isChecked && "✓"}
                                </span>
                                <span>{label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: FUNÇÕES ADMINISTRATIVAS */}
          {/* ======================================================== */}
          {activeTab === 'admin' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Barra de Ações Rápidas */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300">
                    Funções de Serviço Interno & Rotina
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSetAllAdminRolesVisibility(true)}
                    className="h-7 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black uppercase text-[10px] tracking-wider border border-emerald-500/20 transition-colors cursor-pointer"
                  >
                    Ativar Todas
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetAllAdminRolesVisibility(false)}
                    className="h-7 px-2.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-black uppercase text-[10px] tracking-wider transition-colors cursor-pointer"
                  >
                    Desativar Todas
                  </button>
                </div>
              </div>

              {/* Bloco Postos de Serviço e Sentinelas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Postos de Praia / Serviço */}
                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Sun className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase text-slate-900 dark:text-white">
                        Postos de Praia / Serviço
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Ativa a seção de postos e guarnições de praia na escala
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPostosEscalaEnabled(prev => !prev)}
                    className={cn(
                      "h-7 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-2xs shrink-0",
                      postosEscalaEnabled
                        ? "bg-amber-500 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                    )}
                  >
                    {postosEscalaEnabled ? "Ativado ✓" : "Inativo"}
                  </button>
                </div>

                {/* Sentinelas da Guarda */}
                <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-sky-50/50 dark:bg-sky-950/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase text-slate-900 dark:text-white">
                        Sentinelas da Guarda
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Distribuição dos quartos de hora da guarda armada
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleAdminRoleVisibility('SENTINELA')}
                    className={cn(
                      "h-7 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-2xs shrink-0",
                      adminRolesVisibility['SENTINELA'] !== false
                        ? "bg-sky-600 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                    )}
                  >
                    {adminRolesVisibility['SENTINELA'] !== false ? "Ativo ✓" : "Inativo"}
                  </button>
                </div>
              </div>

              {/* Tabela de Funções Administrativas */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase text-[10px] font-black border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Função Administrativa</th>
                      <th className="py-2.5 px-3 w-32 text-center">Vagas Requeridas</th>
                      <th className="py-2.5 px-3 w-32 text-center">Status / Sorteio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {DEFAULT_ADMIN_ROLES.map((role) => {
                      const norm = normalizeFnName(role.name);
                      const isActive = adminRolesVisibility[norm] !== false && adminRolesVisibility[role.name] !== false;
                      const reqCount = roleQtds[role.name] ?? role.defaultReq;

                      return (
                        <tr key={role.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xs uppercase text-slate-800 dark:text-slate-200">
                                {role.label}
                              </span>
                              {role.badge && (
                                <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                                  {role.badge}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{role.desc}</span>
                          </td>

                          {/* Seletor de Quantidade Requerida */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSetRoleQtd(role.name, -1)}
                                className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-black text-xs flex items-center justify-center cursor-pointer transition-colors"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                max={20}
                                value={reqCount}
                                onChange={(e) => handleSetRoleQtdDirect(role.name, parseInt(e.target.value) || 0)}
                                className="w-10 text-center py-0.5 rounded-md border border-slate-200 dark:border-slate-700 font-mono font-black text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleSetRoleQtd(role.name, 1)}
                                className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-black text-xs flex items-center justify-center cursor-pointer transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* Toggle Ativo */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => onToggleAdminRoleVisibility(role.name)}
                              className={cn(
                                "px-2.5 py-1 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-2xs",
                                isActive
                                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                  : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                              )}
                            >
                              {isActive ? "Ativo ✓" : "Oculto"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: VISIBILIDADE DAS SEÇÕES DA ESCALA */}
          {/* ======================================================== */}
          {activeTab === 'secoes' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white">
                    Painel Geral de Visibilidade dos Módulos da Escala 24h
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Ligue ou desligue qualquer uma das seções exibidas no espelho diário da escala
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSetAllSectionsVisibility(true)}
                    className="h-7 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black uppercase text-[10px] tracking-wider border border-emerald-500/20 transition-colors cursor-pointer"
                  >
                    Exibir Todas
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SCALE_SECTIONS_LIST.map((sec) => {
                  const Icon = sec.icon;
                  const isVisible = sectionsVisibility[sec.id] !== false;

                  return (
                    <div
                      key={sec.id}
                      className={cn(
                        "p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3",
                        isVisible
                          ? "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-xs"
                          : "bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-60"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5", sec.color)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black uppercase text-slate-900 dark:text-white">
                            {sec.title}
                          </span>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                            {sec.desc}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleSectionVisibility(sec.id)}
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                          isVisible
                            ? "bg-emerald-500 text-white shadow-xs"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                        )}
                        title={isVisible ? "Ocultar seção" : "Exibir seção"}
                      >
                        {isVisible ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER MODAL */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Configurações sincronizadas automaticamente</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider text-xs shadow-xs transition-colors cursor-pointer"
          >
            Concluir
          </button>
        </div>

      </div>

      {/* MODAL PARA NOVA SEÇÃO DE OFICIAL */}
      <NovaSecaoOficialModal
        isOpen={showNovaSecaoModal}
        onClose={() => setShowNovaSecaoModal(false)}
        obmContext={obmContext}
        onSave={async (sec) => {
          await onSaveOfficerSection(sec);
          setShowNovaSecaoModal(false);
        }}
      />
    </div>
  );
}
