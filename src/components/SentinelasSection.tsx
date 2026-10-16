import React, { useState, useMemo, useEffect } from 'react';
import { 
  Shield, 
  Clock, 
  X, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Car, 
  Search, 
  Users, 
  Sparkles,
  Edit2, 
  Check, 
  Info, 
  ChevronUp, 
  ChevronDown, 
  Power,
  Calendar,
  ListOrdered,
  LayoutGrid,
  Sun,
  Moon,
  UtensilsCrossed
} from 'lucide-react';
import { RankInsignia } from './RankInsignia';
import { formatRankAbbr } from '../lib/rankUtils';
import { cn, normalizeRg } from '../lib/utils';
import { 
  SentinelaSlot, 
  SentinelaTipo, 
  ScheduleMode,
  SentinelaTimelineRow,
  generateSentinelaSchedule,
  checkSlotConflict, 
  createDefault4Slots, 
  buildSlotsFromSelectedMilitars
} from '../lib/sentinelaUtils';

export interface SentinelasSectionProps {
  obmContext?: string;
  selectedDate: string;
  baseRoster: any[];
  militars: any[];
  sentinelaRgs: (string | null)[];
  sentinelaSlots?: SentinelaSlot[] | null;
  onSentinelaChange: (newSentinelaRgs: (string | null)[], newSlots?: SentinelaSlot[]) => void;
  identifiedAlaStr?: string;
  readonly?: boolean;
}

export function SentinelasSection({
  obmContext,
  selectedDate,
  baseRoster = [],
  militars = [],
  sentinelaRgs = [null, null, null, null],
  sentinelaSlots,
  onSentinelaChange,
  identifiedAlaStr,
  readonly = false
}: SentinelasSectionProps) {
  // Controle de Abas: Guarda Norte e Guarda Sul
  const [activeTab, setActiveTab] = useState<'norte' | 'sul'>('norte');

  // Modo de Cálculo da Escala: Rotativo (Quartos intercalados de ~2h) ou Contínuo (24h / N)
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('rotativo');

  // Modo de Exibição dos Resultados: Tabela Cronológica Contínua (padrão solicitado), Cards ou Ambos
  const [viewMode, setViewMode] = useState<'tabela' | 'cards' | 'ambos'>('tabela');

  // Guarda Sul desativada por padrão a pedido do usuário
  const [isGuardaSulEnabled, setIsGuardaSulEnabled] = useState<boolean>(() => {
    if (sentinelaSlots && Array.isArray(sentinelaSlots)) {
      return sentinelaSlots.some(s => s.posto === 'GUARDA SUL' && Boolean(s.rg));
    }
    if (sentinelaRgs && Array.isArray(sentinelaRgs) && sentinelaRgs.length > 4) {
      return sentinelaRgs.slice(4).some(Boolean);
    }
    return false;
  });

  // Slots da Guarda Norte
  const [norteSlots, setNorteSlots] = useState<SentinelaSlot[]>(() => {
    if (sentinelaSlots && Array.isArray(sentinelaSlots)) {
      const norte = sentinelaSlots.filter(s => s.posto !== 'GUARDA SUL');
      if (norte.length > 0) return norte;
    }
    const norteRgs = (sentinelaRgs || []).slice(0, 4);
    const defaults = createDefault4Slots();
    return defaults.map((d, i) => ({
      ...d,
      rg: norteRgs[i] || null
    }));
  });

  // Slots da Guarda Sul
  const [sulSlots, setSulSlots] = useState<SentinelaSlot[]>(() => {
    if (sentinelaSlots && Array.isArray(sentinelaSlots)) {
      const sul = sentinelaSlots.filter(s => s.posto === 'GUARDA SUL');
      if (sul.length > 0) return sul;
    }
    const sulRgs = (sentinelaRgs || []).slice(4);
    if (sulRgs.length === 0) return [];
    return sulRgs.map((rg, idx) => ({
      id: `slot-sul-${idx}`,
      rg: rg || null,
      tipo: 'comum' as SentinelaTipo,
      posto: 'GUARDA SUL',
      turnoLabel: `${idx + 1}º TURNO SUL`,
      horario: '06:00 às 07:30 / 12:00 às 13:30',
      totalHoras: 3
    }));
  });

  // Sincroniza dados externos quando alterados
  useEffect(() => {
    if (sentinelaSlots && Array.isArray(sentinelaSlots) && sentinelaSlots.length > 0) {
      const norte = sentinelaSlots.filter(s => s.posto !== 'GUARDA SUL');
      const sul = sentinelaSlots.filter(s => s.posto === 'GUARDA SUL');
      if (norte.length > 0) setNorteSlots(norte);
      if (sul.length > 0) {
        setSulSlots(sul);
        if (sul.some(s => Boolean(s.rg))) {
          setIsGuardaSulEnabled(true);
        }
      }
    }
  }, [sentinelaSlots]);

  // Edição manual de horário inline nos cards
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editingHorarioText, setEditingHorarioText] = useState<string>('');

  // Estados dos dois espaços de busca/cadastro rápido
  const [searchComumText, setSearchComumText] = useState('');
  const [searchMotoristaText, setSearchMotoristaText] = useState('');
  const [filterRosterText, setFilterRosterText] = useState('');
  const [rosterFilterBadge, setRosterFilterBadge] = useState<'todos' | 'sentinela' | 'condutor' | 'escalados'>('todos');

  // Notifica o componente pai sobre mudanças
  const emitUpdate = (newNorte: SentinelaSlot[], newSul: SentinelaSlot[], isSulActive: boolean) => {
    setNorteSlots(newNorte);
    setSulSlots(newSul);
    
    let combinedSlots: SentinelaSlot[] = [];
    let combinedRgs: (string | null)[] = [];

    if (isSulActive) {
      combinedSlots = [...newNorte, ...newSul];
      combinedRgs = [...newNorte.map(s => s.rg), ...newSul.map(s => s.rg)];
    } else {
      combinedSlots = [...newNorte];
      combinedRgs = newNorte.map(s => s.rg);
    }

    onSentinelaChange(combinedRgs, combinedSlots);
  };

  // Lista enriquecida de militares candidatos da Ala
  const militaryCandidates = useMemo(() => {
    return baseRoster.map(m => {
      const full = militars.find((x: any) => normalizeRg(x.rg) === normalizeRg(m.rg)) || m;
      const isCondutor = Boolean(
        full.ativoCondutor ||
        full.motorista ||
        full.condutor ||
        full.dynamicFunctions?.motorista ||
        full.dynamicFunctions?.condutor ||
        m.ativoCondutor ||
        m.motorista
      );
      const isSentinela = Boolean(
        full.sentinela ||
        full.ativoSentinela ||
        m.sentinela ||
        m.ativoSentinela
      );

      return {
        rg: m.rg || '',
        name: full.name || m.name || '',
        warName: full.warName || m.warName || m.name || '',
        rank: full.rank || m.rank || '',
        isSentinela,
        isCondutor
      };
    }).sort((a, b) => {
      if (a.isSentinela && !b.isSentinela) return -1;
      if (!a.isSentinela && b.isSentinela) return 1;
      return (a.warName || a.name).localeCompare(b.warName || b.name);
    });
  }, [baseRoster, militars]);

  // Contexto do posto ativo
  const currentPostoName = activeTab === 'norte' ? 'GUARDA NORTE' : 'GUARDA SUL';
  const currentSlots = activeTab === 'norte' ? norteSlots : sulSlots;

  // Mapa de status dos militares no posto atual: rg -> slot
  const currentAssignedMap = useMemo(() => {
    const map = new Map<string, SentinelaSlot>();
    currentSlots.forEach(s => {
      if (s.rg) {
        map.set(normalizeRg(s.rg), s);
      }
    });
    return map;
  }, [currentSlots]);

  // Mapa de status no outro posto
  const otherPostoAssignedMap = useMemo(() => {
    const otherSlots = activeTab === 'norte' ? sulSlots : norteSlots;
    const map = new Map<string, string>();
    otherSlots.forEach(s => {
      if (s.rg) {
        map.set(normalizeRg(s.rg), s.turnoLabel);
      }
    });
    return map;
  }, [activeTab, norteSlots, sulSlots]);

  // GERAÇÃO MATEMÁTICA DA ESCALA E DA TIMELINE CRONOLÓGICA CONTÍNUA (SEM SALTOS)
  const scheduleData = useMemo(() => {
    return generateSentinelaSchedule(currentSlots, scheduleMode);
  }, [currentSlots, scheduleMode]);

  const timelineRows: SentinelaTimelineRow[] = scheduleData.timeline;

  // Estatísticas operacionais
  const stats = useMemo(() => {
    const activeAssignedSlots = currentSlots.filter(s => Boolean(s.rg));
    const total = activeAssignedSlots.length;
    const comuns = activeAssignedSlots.filter(s => s.tipo === 'comum').length;
    const motoristas = activeAssignedSlots.filter(s => s.tipo === 'motorista').length;

    const conflicts = currentSlots
      .map((s, idx) => ({ slotIdx: idx, ...checkSlotConflict(s) }))
      .filter(c => c.hasConflict);

    return {
      total,
      comuns,
      motoristas,
      conflicts,
      hasConflicts: conflicts.length > 0,
      hasNoComum: comuns === 0 && motoristas > 0
    };
  }, [currentSlots]);

  // ==========================================
  // AÇÕES: ATIVAÇÃO DE MILITARES VIA MINI CARDS
  // ==========================================

  const handleToggleMilitarCard = (rg: string, forcedTipo?: SentinelaTipo) => {
    if (readonly) return;
    const clean = normalizeRg(rg);
    const existingSlot = currentAssignedMap.get(clean);

    let nextList: { rg: string; tipo: SentinelaTipo }[] = [];

    const currentActiveList: { rg: string; tipo: SentinelaTipo }[] = [];
    currentSlots.forEach(s => {
      if (s.rg) {
        currentActiveList.push({ rg: s.rg, tipo: s.tipo });
      }
    });

    if (forcedTipo) {
      if (existingSlot) {
        if (existingSlot.tipo === forcedTipo) {
          nextList = currentActiveList.filter(item => normalizeRg(item.rg) !== clean);
        } else {
          nextList = currentActiveList.map(item => 
            normalizeRg(item.rg) === clean ? { ...item, tipo: forcedTipo } : item
          );
        }
      } else {
        nextList = [...currentActiveList, { rg, tipo: forcedTipo }];
      }
    } else {
      if (!existingSlot) {
        const cand = militaryCandidates.find(c => normalizeRg(c.rg) === clean);
        const defaultTipo: SentinelaTipo = cand?.isCondutor ? 'motorista' : 'comum';
        nextList = [...currentActiveList, { rg, tipo: defaultTipo }];
      } else if (existingSlot.tipo === 'comum') {
        nextList = currentActiveList.map(item => 
          normalizeRg(item.rg) === clean ? { ...item, tipo: 'motorista' as SentinelaTipo } : item
        );
      } else {
        nextList = currentActiveList.filter(item => normalizeRg(item.rg) !== clean);
      }
    }

    const recalculatedSlots = buildSlotsFromSelectedMilitars(nextList, currentPostoName, scheduleMode);

    if (activeTab === 'norte') {
      emitUpdate(recalculatedSlots, sulSlots, isGuardaSulEnabled);
    } else {
      emitUpdate(norteSlots, recalculatedSlots, isGuardaSulEnabled);
    }
  };

  // Remove um militar escalado
  const handleRemoveAssignedRg = (rg: string) => {
    if (readonly) return;
    const clean = normalizeRg(rg);
    const remaining = currentSlots
      .filter(s => s.rg && normalizeRg(s.rg) !== clean)
      .map(s => ({ rg: s.rg!, tipo: s.tipo }));

    const recalculated = buildSlotsFromSelectedMilitars(remaining, currentPostoName, scheduleMode);

    if (activeTab === 'norte') {
      emitUpdate(recalculated, sulSlots, isGuardaSulEnabled);
    } else {
      emitUpdate(norteSlots, recalculated, isGuardaSulEnabled);
    }
  };

  // Troca ordem de turnos (Subir / Descer)
  const handleMoveTurno = (slotIdx: number, direction: 'up' | 'down') => {
    if (readonly) return;
    const targetIdx = direction === 'up' ? slotIdx - 1 : slotIdx + 1;
    if (targetIdx < 0 || targetIdx >= currentSlots.length) return;

    const reordered = [...currentSlots];
    const temp = reordered[slotIdx];
    reordered[slotIdx] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    const list = reordered.filter(s => Boolean(s.rg)).map(s => ({ rg: s.rg!, tipo: s.tipo }));
    const recalculated = buildSlotsFromSelectedMilitars(list, currentPostoName, scheduleMode);

    if (activeTab === 'norte') {
      emitUpdate(recalculated, sulSlots, isGuardaSulEnabled);
    } else {
      emitUpdate(norteSlots, recalculated, isGuardaSulEnabled);
    }
  };

  // Limpa todos do posto ativo
  const handleClearCurrentPosto = () => {
    if (readonly) return;
    if (confirm(`Deseja limpar todos os sentinelas da ${currentPostoName}?`)) {
      if (activeTab === 'norte') {
        emitUpdate([], sulSlots, isGuardaSulEnabled);
      } else {
        emitUpdate(norteSlots, [], isGuardaSulEnabled);
      }
    }
  };

  // Alterna o modo de cálculo (Rotativo vs Contínuo)
  const handleToggleScheduleMode = (newMode: ScheduleMode) => {
    if (readonly) return;
    setScheduleMode(newMode);
    const list = currentSlots.filter(s => Boolean(s.rg)).map(s => ({ rg: s.rg!, tipo: s.tipo }));
    const recalculated = buildSlotsFromSelectedMilitars(list, currentPostoName, newMode);

    if (activeTab === 'norte') {
      emitUpdate(recalculated, sulSlots, isGuardaSulEnabled);
    } else {
      emitUpdate(norteSlots, recalculated, isGuardaSulEnabled);
    }
  };

  // Ativação / Desativação da Guarda Sul
  const handleToggleGuardaSulActivation = () => {
    if (readonly) return;
    if (isGuardaSulEnabled) {
      const hasSulFilled = sulSlots.some(s => Boolean(s.rg));
      if (hasSulFilled && !confirm("Existem militares na Guarda Sul. Desativar removerá a Guarda Sul da escala. Continuar?")) {
        return;
      }
      setIsGuardaSulEnabled(false);
      setActiveTab('norte');
      emitUpdate(norteSlots, [], false);
    } else {
      setIsGuardaSulEnabled(true);
      setActiveTab('sul');
      emitUpdate(norteSlots, sulSlots, true);
    }
  };

  // Edição manual de horário inline
  const handleSaveEditHorario = (slotId: string) => {
    const updated = currentSlots.map(s => {
      if (s.id === slotId) {
        return { ...s, horario: editingHorarioText.trim(), customHorario: true };
      }
      return s;
    });
    setEditingSlotId(null);
    if (activeTab === 'norte') {
      emitUpdate(updated, sulSlots, isGuardaSulEnabled);
    } else {
      emitUpdate(norteSlots, updated, isGuardaSulEnabled);
    }
  };

  // Filtragem dos mini cards
  const filteredCandidates = useMemo(() => {
    let list = militaryCandidates;

    if (filterRosterText.trim()) {
      const term = filterRosterText.toLowerCase();
      list = list.filter(c => 
        c.name.toLowerCase().includes(term) ||
        c.warName.toLowerCase().includes(term) ||
        c.rg.toLowerCase().includes(term) ||
        c.rank.toLowerCase().includes(term)
      );
    }

    if (rosterFilterBadge === 'sentinela') {
      list = list.filter(c => c.isSentinela);
    } else if (rosterFilterBadge === 'condutor') {
      list = list.filter(c => c.isCondutor);
    } else if (rosterFilterBadge === 'escalados') {
      list = list.filter(c => currentAssignedMap.has(normalizeRg(c.rg)));
    }

    return list;
  }, [militaryCandidates, filterRosterText, rosterFilterBadge, currentAssignedMap]);

  // Candidatos para o espaço de busca rápido Comum
  const quickComumMatches = useMemo(() => {
    if (!searchComumText.trim()) return [];
    const term = searchComumText.toLowerCase();
    return militaryCandidates.filter(c => 
      c.name.toLowerCase().includes(term) ||
      c.warName.toLowerCase().includes(term) ||
      c.rg.toLowerCase().includes(term)
    ).slice(0, 5);
  }, [searchComumText, militaryCandidates]);

  // Candidatos para o espaço de busca rápido Motorista
  const quickMotoristaMatches = useMemo(() => {
    if (!searchMotoristaText.trim()) return [];
    const term = searchMotoristaText.toLowerCase();
    return militaryCandidates.filter(c => 
      c.name.toLowerCase().includes(term) ||
      c.warName.toLowerCase().includes(term) ||
      c.rg.toLowerCase().includes(term)
    ).slice(0, 5);
  }, [searchMotoristaText, militaryCandidates]);

  // Busca militar pelo RG com fallback
  const getMilitarInfo = (rg: string | null) => {
    if (!rg) return null;
    const clean = normalizeRg(rg);
    return militars.find(m => normalizeRg(m.rg) === clean) ||
           baseRoster.find(m => normalizeRg(m.rg) === clean) ||
           null;
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col mb-6">
      {/* ======================================================== */}
      {/* 1. HEADER COM IDENTIFICAÇÃO E SEPARAÇÃO DE NORTE / SUL  */}
      {/* ======================================================== */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-blue-50/25 to-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                Escala de Sentinelas da Guarda
              </h3>
              {identifiedAlaStr && (
                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-widest">
                  {identifiedAlaStr}
                </span>
              )}
              {obmContext && (
                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-widest hidden sm:inline-block">
                  {obmContext}
                </span>
              )}
              <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full tracking-wide flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                24h Contínuas &amp; Sequenciais
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1">
              Escala sequencial hora a hora das <strong>06:00 às 06:00</strong>. Ative militares via mini cards ou campos rápidos; a matemática distribui o serviço sem saltos.
            </p>
          </div>
        </div>

        {/* Abas Guarda Norte vs Guarda Sul */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100/90 border border-slate-200 rounded-2xl">
            {/* Aba Guarda Norte */}
            <button
              type="button"
              onClick={() => setActiveTab('norte')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                activeTab === 'norte'
                  ? "bg-white text-blue-700 shadow-xs border border-blue-200/60"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Guarda Norte</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                {norteSlots.filter(s => Boolean(s.rg)).length}
              </span>
            </button>

            {/* Aba Guarda Sul */}
            <button
              type="button"
              onClick={() => setActiveTab('sul')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                activeTab === 'sul'
                  ? "bg-white text-blue-700 shadow-xs border border-blue-200/60"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Guarda Sul</span>
              {isGuardaSulEnabled ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {sulSlots.filter(s => Boolean(s.rg)).length}
                </span>
              ) : (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-500">
                  Desativada
                </span>
              )}
            </button>
          </div>

          {/* Botão de Limpar */}
          {stats.total > 0 && !readonly && (
            <button
              type="button"
              onClick={handleClearCurrentPosto}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer shadow-2xs"
              title={`Limpar sentinelas da ${currentPostoName}`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SEÇÃO DA GUARDA SUL DESATIVADA                           */}
      {/* ======================================================== */}
      {activeTab === 'sul' && !isGuardaSulEnabled ? (
        <div className="p-8 sm:p-12 text-center bg-slate-50/70 flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-3xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
            <Power className="w-7 h-7" />
          </div>
          <h4 className="text-base font-black text-slate-800 uppercase tracking-wide">
            A Guarda Sul está Desativada
          </h4>
          <p className="text-xs text-slate-500 max-w-md mt-1 mb-5">
            Por padrão operacional, apenas o posto da Guarda Norte permanece ativo. Se sua unidade necessitar de sentinelas na Guarda Sul, clique no botão abaixo.
          </p>
          <button
            type="button"
            onClick={handleToggleGuardaSulActivation}
            disabled={readonly}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <Power className="w-4 h-4 text-emerald-300" />
            <span>Ativar Posto da Guarda Sul</span>
          </button>
        </div>
      ) : (
        <>
          {/* ======================================================== */}
          {/* 2. REGRAS E STATUS OPERACIONAL DO POSTO ATIVO           */}
          {/* ======================================================== */}
          <div className="px-4 sm:px-5 py-2.5 bg-slate-50 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-[11px]">
                  Regras do Sentinela Motorista: Proibido <strong className="text-slate-900">22:00 às 06:00</strong> (descanso noturno) e <strong className="text-slate-900">11:00 às 13:30</strong> (almoço/trânsito).
                </span>
              </div>

              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                  {stats.comuns} Comuns
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                  {stats.motoristas} Motoristas
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {stats.hasNoComum ? (
                <div className="flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Ative ao menos 1 Sentinela Comum para cobrir o período noturno e almoço!</span>
                </div>
              ) : stats.hasConflicts ? (
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Ajustando horários para conformidade total...</span>
                </div>
              ) : stats.total > 0 ? (
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Sequência 100% Contínua: 24h sem saltos</span>
                </div>
              ) : (
                <span className="text-[11px] text-slate-500 italic">
                  Nenhum militar escalado neste posto ainda.
                </span>
              )}

              {activeTab === 'sul' && isGuardaSulEnabled && !readonly && (
                <button
                  type="button"
                  onClick={handleToggleGuardaSulActivation}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline ml-2 cursor-pointer"
                >
                  Desativar Guarda Sul
                </button>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* 3. DOIS ESPAÇOS DE CADASTRO RÁPIDO (NOME OU RG)          */}
          {/* ======================================================== */}
          <div className="p-4 sm:p-5 border-b border-slate-200/70 bg-gradient-to-b from-white to-slate-50/50">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2.5 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Cadastro Rápido por Nome ou RG</span>
              <span className="text-[10px] font-normal text-slate-400 normal-case">
                (digite para ativar diretamente na classificação desejada)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Espaço 1: Sentinela Comum */}
              <div className="relative">
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/40 border border-blue-200/90 rounded-2xl focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                  <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                  <input
                    type="text"
                    disabled={readonly}
                    value={searchComumText}
                    onChange={(e) => setSearchComumText(e.target.value)}
                    placeholder="Digite nome ou RG para Sentinela COMUM..."
                    className="w-full text-xs font-semibold text-slate-800 placeholder-slate-400 bg-transparent outline-none"
                  />
                  {searchComumText && (
                    <button
                      type="button"
                      onClick={() => setSearchComumText('')}
                      className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {quickComumMatches.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95">
                    {quickComumMatches.map(cand => {
                      const isAssignedHere = currentAssignedMap.has(normalizeRg(cand.rg));
                      return (
                        <button
                          key={cand.rg}
                          type="button"
                          onClick={() => {
                            handleToggleMilitarCard(cand.rg, 'comum');
                            setSearchComumText('');
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <RankInsignia rankStr={cand.rank} className="w-3.5 h-3.5" />
                            <span className="font-bold text-slate-800">{formatRankAbbr(cand.rank)} {cand.warName}</span>
                            <span className="text-[10px] font-mono text-slate-400">RG: {cand.rg}</span>
                          </div>
                          <span className={cn(
                            "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                            isAssignedHere ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                          )}>
                            {isAssignedHere ? 'Já Ativo' : '+ Ativar Comum'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Espaço 2: Sentinela Motorista */}
              <div className="relative">
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50/40 border border-amber-200/90 rounded-2xl focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500 transition-all">
                  <Car className="w-4 h-4 text-amber-700 shrink-0" />
                  <input
                    type="text"
                    disabled={readonly}
                    value={searchMotoristaText}
                    onChange={(e) => setSearchMotoristaText(e.target.value)}
                    placeholder="Digite nome ou RG para Sentinela MOTORISTA..."
                    className="w-full text-xs font-semibold text-slate-800 placeholder-slate-400 bg-transparent outline-none"
                  />
                  {searchMotoristaText && (
                    <button
                      type="button"
                      onClick={() => setSearchMotoristaText('')}
                      className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {quickMotoristaMatches.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95">
                    {quickMotoristaMatches.map(cand => {
                      const isAssignedHere = currentAssignedMap.has(normalizeRg(cand.rg));
                      return (
                        <button
                          key={cand.rg}
                          type="button"
                          onClick={() => {
                            handleToggleMilitarCard(cand.rg, 'motorista');
                            setSearchMotoristaText('');
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <RankInsignia rankStr={cand.rank} className="w-3.5 h-3.5" />
                            <span className="font-bold text-slate-800">{formatRankAbbr(cand.rank)} {cand.warName}</span>
                            <span className="text-[10px] font-mono text-slate-400">RG: {cand.rg}</span>
                            {cand.isCondutor && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">
                                Condutor
                              </span>
                            )}
                          </div>
                          <span className={cn(
                            "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                            isAssignedHere ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          )}>
                            {isAssignedHere ? 'Já Ativo' : '+ Ativar Motorista'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 4. SEQUÊNCIA DE MINI CARDS DOS MILITARES DA ALA          */}
          {/* ======================================================== */}
          <div className="p-4 sm:p-5 border-b border-slate-200/70 bg-slate-50/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Militares de Serviço na Ala ({militaryCandidates.length})
                </h4>
                <span className="text-[10px] text-slate-400">
                  — Clique para ativar/desativar ou use os botões rápidos
                </span>
              </div>

              {/* Filtro Rápido dos Mini Cards */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setRosterFilterBadge('todos')}
                  className={cn(
                    "text-[10px] font-black uppercase px-2 py-1 rounded-lg border transition-all cursor-pointer",
                    rosterFilterBadge === 'todos'
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  Todos ({militaryCandidates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRosterFilterBadge('sentinela')}
                  className={cn(
                    "text-[10px] font-black uppercase px-2 py-1 rounded-lg border transition-all cursor-pointer",
                    rosterFilterBadge === 'sentinela'
                      ? "bg-blue-700 text-white border-blue-700"
                      : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
                  )}
                >
                  ★ Sentinelas ({militaryCandidates.filter(c => c.isSentinela).length})
                </button>
                <button
                  type="button"
                  onClick={() => setRosterFilterBadge('condutor')}
                  className={cn(
                    "text-[10px] font-black uppercase px-2 py-1 rounded-lg border transition-all cursor-pointer",
                    rosterFilterBadge === 'condutor'
                      ? "bg-amber-700 text-white border-amber-700"
                      : "bg-white text-amber-800 border-amber-200 hover:bg-amber-50"
                  )}
                >
                  🚒 Condutores ({militaryCandidates.filter(c => c.isCondutor).length})
                </button>
                <button
                  type="button"
                  onClick={() => setRosterFilterBadge('escalados')}
                  className={cn(
                    "text-[10px] font-black uppercase px-2 py-1 rounded-lg border transition-all cursor-pointer",
                    rosterFilterBadge === 'escalados'
                      ? "bg-emerald-700 text-white border-emerald-700"
                      : "bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50"
                  )}
                >
                  Escalados ({stats.total})
                </button>
              </div>
            </div>

            {/* Grid de Mini Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
              {filteredCandidates.map(cand => {
                const assignedSlot = currentAssignedMap.get(normalizeRg(cand.rg));
                const isAssigned = Boolean(assignedSlot);
                const isComum = assignedSlot?.tipo === 'comum';
                const isMotorista = assignedSlot?.tipo === 'motorista';
                const otherPostoTurno = otherPostoAssignedMap.get(normalizeRg(cand.rg));

                return (
                  <div
                    key={cand.rg}
                    className={cn(
                      "rounded-2xl border transition-all p-2.5 flex flex-col justify-between gap-2 shadow-2xs relative group select-none",
                      isComum
                        ? "bg-blue-50/70 border-blue-400 ring-2 ring-blue-200 shadow-xs"
                        : isMotorista
                          ? "bg-amber-50/70 border-amber-400 ring-2 ring-amber-200 shadow-xs"
                          : "bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs"
                    )}
                  >
                    <div 
                      onClick={() => !readonly && handleToggleMilitarCard(cand.rg)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <RankInsignia rankStr={cand.rank} className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                            {formatRankAbbr(cand.rank)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {cand.isSentinela && (
                            <span className="text-[10px] font-black text-blue-600" title="Possui qualificação de Sentinela">
                              ★
                            </span>
                          )}
                          {cand.isCondutor && (
                            <span title="Condutor / Motorista no cadastro">
                              <Car className="w-3 h-3 text-amber-600" />
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="font-black text-xs uppercase tracking-tight text-slate-800 truncate mt-0.5">
                        {cand.warName}
                      </div>

                      <div className="text-[9.5px] font-mono text-slate-400 font-semibold truncate">
                        RG: {cand.rg}
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between gap-1">
                      {isAssigned ? (
                        <>
                          <div className="flex items-center gap-1 min-w-0">
                            <span className={cn(
                              "text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md truncate",
                              isMotorista ? "bg-amber-100 text-amber-900" : "bg-blue-100 text-blue-900"
                            )}>
                              {isMotorista ? 'Motorista' : 'Comum'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={readonly}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleMilitarCard(cand.rg, isMotorista ? 'comum' : 'motorista');
                              }}
                              className="text-[9px] font-black p-1 rounded-md text-slate-600 hover:bg-white hover:text-blue-700 transition-colors cursor-pointer"
                              title={isMotorista ? "Mudar para Sentinela Comum" : "Mudar para Sentinela Motorista"}
                            >
                              {isMotorista ? <Shield className="w-3 h-3 text-blue-600" /> : <Car className="w-3 h-3 text-amber-600" />}
                            </button>

                            <button
                              type="button"
                              disabled={readonly}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveAssignedRg(cand.rg);
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Remover militar da sentinela"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-1 w-full">
                          <button
                            type="button"
                            disabled={readonly}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleMilitarCard(cand.rg, 'comum');
                            }}
                            className="flex-1 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 transition-all cursor-pointer text-center"
                            title="Ativar como Sentinela Comum"
                          >
                            + Comum
                          </button>
                          <button
                            type="button"
                            disabled={readonly}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleMilitarCard(cand.rg, 'motorista');
                            }}
                            className="flex-1 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80 transition-all cursor-pointer text-center"
                            title="Ativar como Sentinela Motorista"
                          >
                            + Motorista
                          </button>
                        </div>
                      )}
                    </div>

                    {otherPostoTurno && (
                      <span className="text-[8.5px] font-bold text-amber-700 bg-amber-50 rounded px-1 py-0.2 mt-0.5">
                        Já no {otherPostoTurno}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/* 5. TABELA CONTÍNUA SEQUENCIAL DA HORA (06:00 ÀS 06:00)   */}
          {/* ======================================================== */}
          <div className="p-4 sm:p-5 bg-slate-50/60">
            {/* Barra de Controles da Escala: Modo de Cálculo e Visualização */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-200 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <span>Escala Contínua de 24 Horas — {currentPostoName}</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md">
                      {stats.total} Escalados
                    </span>
                  </h4>
                  <p className="text-[10.5px] text-slate-500 font-medium">
                    Sequência cronológica rigorosa de <strong>06:00 às 06:00</strong> sem interrupção nem saltos.
                  </p>
                </div>
              </div>

              {/* Seletor de Modo de Divisão e Modo de Visualização */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Modo de Divisão */}
                <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleScheduleMode('rotativo')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      scheduleMode === 'rotativo'
                        ? "bg-white text-blue-700 shadow-2xs border border-blue-200/70"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                    title="Quartos de hora intercalados de ~2h com descanso rotativo"
                  >
                    🔄 Quartos Intercalados (~2h)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleScheduleMode('continuo')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      scheduleMode === 'continuo'
                        ? "bg-white text-blue-700 shadow-2xs border border-blue-200/70"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                    title="Divisão direta de 24h pelo número de militares"
                  >
                    ⏱️ Turnos Contínuos (24h ÷ N)
                  </button>
                </div>

                {/* Alternador de Visualização: Tabela vs Cards vs Ambos */}
                <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('tabela')}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      viewMode === 'tabela'
                        ? "bg-white text-blue-700 shadow-2xs border border-blue-200/70"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                    title="Exibir como Tabela Cronológica Sequencial"
                  >
                    <ListOrdered className="w-3 h-3" />
                    <span>Tabela</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      viewMode === 'cards'
                        ? "bg-white text-blue-700 shadow-2xs border border-blue-200/70"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                    title="Exibir como Cards Consolidados por Militar"
                  >
                    <LayoutGrid className="w-3 h-3" />
                    <span>Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('ambos')}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      viewMode === 'ambos'
                        ? "bg-white text-blue-700 shadow-2xs border border-blue-200/70"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                    title="Exibir Tabela e Cards simultaneamente"
                  >
                    <span>Ambos</span>
                  </button>
                </div>
              </div>
            </div>

            {stats.total === 0 ? (
              <div className="p-10 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Nenhum militar ativado para a {currentPostoName}.
                </p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1">
                  Selecione os militares nos mini cards acima ou use os campos rápidos de busca. A escala cronológica das 24h será montada automaticamente.
                </p>
              </div>
            ) : (
              <>
                {/* 5.1 TABELA CRONOLÓGICA CONTÍNUA (HORA A HORA) */}
                {(viewMode === 'tabela' || viewMode === 'ambos') && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden mb-4">
                    <div className="p-3 bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-700" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                          Tabela Contínua da Escala — Sequência Cronológica das 24 Horas
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-600">
                        {timelineRows.length} Intervalos Contínuos (06:00 → 06:00 D+1)
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/90 text-slate-600 text-[10px] font-black uppercase tracking-wider border-b border-slate-200 select-none">
                            <th className="py-2.5 px-3 w-[150px]">Horário de Serviço</th>
                            <th className="py-2.5 px-3 w-[140px]">Período Operacional</th>
                            <th className="py-2.5 px-3 w-[110px]">Turno</th>
                            <th className="py-2.5 px-3">Militar de Sentinela</th>
                            <th className="py-2.5 px-3 w-[130px]">Classificação</th>
                            <th className="py-2.5 px-3 w-[80px] text-center">Carga</th>
                            <th className="py-2.5 px-3 w-[140px] text-right">Conformidade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {timelineRows.map((row, rIdx) => {
                            const militar = getMilitarInfo(row.rg);
                            const isMotorista = row.tipo === 'motorista';
                            const isNight = row.periodoTag === 'noturno';
                            const isLunch = row.periodoTag === 'almoco';

                            return (
                              <tr 
                                key={row.id || rIdx}
                                className={cn(
                                  "hover:bg-blue-50/30 transition-colors",
                                  row.hasConflict
                                    ? "bg-rose-50/40"
                                    : isNight
                                      ? "bg-slate-50/50"
                                      : isLunch
                                        ? "bg-amber-50/30"
                                        : "bg-white"
                                )}
                              >
                                {/* 1. Horário Sequencial */}
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className={cn(
                                      "w-3.5 h-3.5 shrink-0",
                                      isNight ? "text-indigo-600" : isLunch ? "text-amber-600" : "text-blue-600"
                                    )} />
                                    <span>{row.horario}</span>
                                  </div>
                                </td>

                                {/* 2. Período Operacional */}
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  {isNight ? (
                                    <span className="inline-flex items-center gap-1 text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 border border-indigo-200">
                                      <Moon className="w-3 h-3 text-indigo-700" />
                                      <span>Noturno (22h-06h)</span>
                                    </span>
                                  ) : isLunch ? (
                                    <span className="inline-flex items-center gap-1 text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                                      <UtensilsCrossed className="w-3 h-3 text-amber-700" />
                                      <span>Almoço (11h-13h30)</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                                      <Sun className="w-3 h-3 text-amber-500" />
                                      <span>Diurno</span>
                                    </span>
                                  )}
                                </td>

                                {/* 3. Turno */}
                                <td className="py-2.5 px-3 font-black text-slate-800 whitespace-nowrap">
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-900 text-white uppercase tracking-wider">
                                    {row.turnoLabel}
                                  </span>
                                </td>

                                {/* 4. Militar Escalado */}
                                <td className="py-2.5 px-3 min-w-0">
                                  {militar ? (
                                    <div className="flex items-center gap-2">
                                      <RankInsignia rankStr={militar.rank} className="w-4 h-4 shrink-0" />
                                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider shrink-0">
                                        {formatRankAbbr(militar.rank)}
                                      </span>
                                      <span className="font-black text-slate-800 uppercase tracking-tight truncate">
                                        {militar.warName || militar.name}
                                      </span>
                                      <span className="text-[10px] font-mono text-slate-400 font-semibold shrink-0">
                                        RG: {militar.rg}
                                      </span>
                                    </div>
                                  ) : row.rg ? (
                                    <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                                      <span>RG: {row.rg}</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">
                                      Vaga não preenchida
                                    </span>
                                  )}
                                </td>

                                {/* 5. Classificação (Comum ou Motorista) */}
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  {isMotorista ? (
                                    <span className="inline-flex items-center gap-1 text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                                      <Car className="w-3 h-3 text-amber-700" />
                                      <span>Motorista</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-300">
                                      <Shield className="w-3 h-3 text-blue-700" />
                                      <span>Comum</span>
                                    </span>
                                  )}
                                </td>

                                {/* 6. Carga do Intervalo */}
                                <td className="py-2.5 px-3 font-mono font-bold text-center text-slate-800 whitespace-nowrap">
                                  {row.durationHours}h
                                </td>

                                {/* 7. Conformidade das Regras */}
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  {row.hasConflict ? (
                                    <span className="inline-flex items-center gap-1 text-[9.5px] font-black text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-md">
                                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                                      <span>{row.conflictDesc || 'Regra Violada'}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[9.5px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span>Regra OK</span>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 5.2 CARDS CONSOLIDADOS POR MILITAR */}
                {(viewMode === 'cards' || viewMode === 'ambos') && (
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                          Resumo Consolidado por Sentinela Escalado ({currentSlots.length} Vagas)
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Total de horas e horários combinados de cada militar
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {currentSlots.map((slot, idx) => {
                        const conflictInfo = checkSlotConflict(slot);
                        const isMotorista = slot.tipo === 'motorista';
                        const assignedMilitar = getMilitarInfo(slot.rg);
                        const isEditingThisHorario = editingSlotId === slot.id;

                        return (
                          <div
                            key={slot.id || idx}
                            className={cn(
                              "bg-white rounded-2xl border transition-all flex flex-col justify-between p-3.5 shadow-2xs relative",
                              conflictInfo.hasConflict
                                ? "border-rose-400 ring-2 ring-rose-200 bg-rose-50/20"
                                : isMotorista
                                  ? "border-amber-300 ring-1 ring-amber-100 bg-gradient-to-b from-white to-amber-50/20"
                                  : "border-blue-300 ring-1 ring-blue-100 bg-gradient-to-b from-white to-blue-50/20"
                            )}
                          >
                            {/* Topo do Card */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-slate-900 text-white">
                                    {slot.turnoLabel || `${idx + 1}º TURNO`}
                                  </span>

                                  {/* Botão de Alternar Tipo Comum / Motorista */}
                                  <button
                                    type="button"
                                    disabled={readonly}
                                    onClick={() => slot.rg && handleToggleMilitarCard(slot.rg, isMotorista ? 'comum' : 'motorista')}
                                    className={cn(
                                      "flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border transition-all cursor-pointer",
                                      isMotorista
                                        ? "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200"
                                        : "bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200"
                                    )}
                                    title="Clique para alternar entre Comum e Motorista"
                                  >
                                    {isMotorista ? <Car className="w-3 h-3 text-amber-700" /> : <Shield className="w-3 h-3 text-blue-700" />}
                                    <span>{isMotorista ? 'Motorista' : 'Comum'}</span>
                                  </button>
                                </div>

                                {slot.totalHoras !== undefined && slot.totalHoras > 0 && (
                                  <div className="text-[10px] font-bold text-slate-500">
                                    Carga Total: <span className="text-slate-800 font-extrabold">{slot.totalHoras}h</span> / 24h
                                  </div>
                                )}
                              </div>

                              {/* Reordenação e Remover */}
                              <div className="flex items-center gap-0.5 shrink-0">
                                {idx > 0 && !readonly && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveTurno(idx, 'up')}
                                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                                    title="Mover para o turno anterior"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {idx < currentSlots.length - 1 && !readonly && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveTurno(idx, 'down')}
                                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                                    title="Mover para o próximo turno"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {slot.rg && !readonly && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAssignedRg(slot.rg!)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer ml-0.5"
                                    title="Remover deste turno"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Horários Combinados do Militar */}
                            <div className="mb-2.5">
                              {isEditingThisHorario ? (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <input
                                    type="text"
                                    value={editingHorarioText}
                                    onChange={(e) => setEditingHorarioText(e.target.value)}
                                    placeholder="06:00 às 08:00 / 14:00 às 16:00 / 22:00 às 00:00"
                                    className="flex-1 text-xs font-semibold px-2 py-1 border border-blue-400 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditHorario(slot.id)}
                                    className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer"
                                    title="Salvar horário"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingSlotId(null)}
                                    className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 cursor-pointer"
                                    title="Cancelar"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-1 text-[10px] font-medium text-slate-600 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200/60 group/horario">
                                  <div className="flex items-center gap-1 min-w-0">
                                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="font-semibold text-slate-700 truncate" title={slot.horario}>
                                      {slot.horario || 'Horário calculado'}
                                    </span>
                                  </div>
                                  {!readonly && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingSlotId(slot.id);
                                        setEditingHorarioText(slot.horario);
                                      }}
                                      className="opacity-0 group-hover/horario:opacity-100 p-0.5 text-slate-400 hover:text-blue-600 transition-opacity cursor-pointer"
                                      title="Editar horário manualmente"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}

                              {conflictInfo.hasConflict && (
                                <div className="mt-1.5 p-1.5 bg-rose-50 border border-rose-200 rounded-lg text-[9px] font-bold text-rose-800 flex items-start gap-1">
                                  <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0 mt-0.5" />
                                  <div>
                                    <span>Regra violada para Motorista:</span>
                                    {conflictInfo.conflicts.map((c, cIdx) => (
                                      <div key={cIdx} className="font-medium text-[8.5px] text-rose-700">
                                        • {c.descricao} ({c.intervalo})
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Card do Militar */}
                            {assignedMilitar && (
                              <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200/80 rounded-xl">
                                <div className="shrink-0">
                                  <RankInsignia rankStr={assignedMilitar.rank} className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                                      {formatRankAbbr(assignedMilitar.rank)}
                                    </span>
                                    <span className="text-xs font-black uppercase tracking-tight text-slate-800 truncate">
                                      {assignedMilitar.warName || assignedMilitar.name}
                                    </span>
                                  </div>
                                  <span className="text-[9px] font-mono text-slate-400 font-semibold">
                                    RG: {assignedMilitar.rg}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* 6. RODAPÉ COM LEGENDAS E INFORMAÇÕES                     */}
      {/* ======================================================== */}
      <div className="px-4 sm:px-5 py-3 border-t border-slate-200/60 bg-white flex items-center justify-between flex-wrap gap-2 text-[10.5px] text-slate-500">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
            <span>Militares com <strong>★</strong> possuem qualificação de Sentinela ativa.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Car className="w-3 h-3 text-amber-600" />
            <span><strong>Motoristas</strong> têm descanso protegido das 22h às 06h e das 11h às 13h30.</span>
          </div>
        </div>

        <div className="flex items-center gap-1 font-bold text-slate-600">
          <span>Sincronização com o Gerar Escala ativa</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-0.5" />
        </div>
      </div>
    </div>
  );
}
