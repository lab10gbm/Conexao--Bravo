import React, { useState, useMemo } from 'react';
import { 
  Palmtree, 
  Waves, 
  Shield, 
  Plus, 
  X, 
  RotateCcw, 
  Check, 
  Search, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  Power,
  Trash2,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { RankInsignia } from '../../../components/RankInsignia';
import { parseRank, formatRankAbbr } from '../../../lib/rankUtils';
import { cn, normalizeRg, formatMilitaryName } from '../../../lib/utils';
import { PostoConfig, EscalaPostoData, EscalaPostoSlot, DEFAULT_POSTOS } from '../../postos/types';

export interface EscalaPostosSectionProps {
  obmContext: string;
  selectedDate: string;
  identifiedAlaStr?: string;
  baseRoster: any[];
  militars: any[];
  permutasOut?: Map<string, any>;
  isSectionEnabled: boolean;
  onToggleSectionEnabled: (enabled: boolean) => void;
  postosData: EscalaPostoData[];
  onChangePostosData: (data: EscalaPostoData[]) => void;
  availablePostosConfig?: PostoConfig[];
  selectedFunctions?: Record<string, string[]>;
  onAssignSlot: (postoId: string, slotId: string, rg: string | null, funcaoNome: string) => void;
}

export function EscalaPostosSection({
  obmContext,
  selectedDate,
  identifiedAlaStr,
  baseRoster = [],
  militars = [],
  permutasOut,
  isSectionEnabled,
  onToggleSectionEnabled,
  postosData,
  onChangePostosData,
  availablePostosConfig,
  selectedFunctions = {},
  onAssignSlot
}: EscalaPostosSectionProps) {
  const [activeSlotSearch, setActiveSlotSearch] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [rosterFilter, setRosterFilter] = useState<'todos' | 'disponiveis' | 'gv' | 'condutor'>('todos');
  const [isRosterOpen, setIsRosterOpen] = useState(false);

  // Inicializa postosData a partir da configuração da OBM se ainda estiver vazio
  const currentPostos = useMemo(() => {
    if (postosData && postosData.length > 0) {
      return postosData;
    }
    const configsToUse = availablePostosConfig && availablePostosConfig.length > 0
      ? availablePostosConfig
      : DEFAULT_POSTOS;

    return configsToUse.map(cfg => ({
      postoId: cfg.id,
      postoNome: cfg.nome,
      tipo: cfg.tipo || 'praia',
      ativa: cfg.ativa !== undefined ? cfg.ativa : true,
      slots: (cfg.funcoes || []).map(f => ({
        slotId: f.id,
        funcaoNome: f.nome,
        rg: null
      }))
    }));
  }, [postosData, availablePostosConfig]);

  // Lista enriquecida de militares da Ala
  const militaryCandidates = useMemo(() => {
    return baseRoster.map(m => {
      const cleanRg = normalizeRg(m.rg);
      const isSwapped = Boolean(permutasOut?.has(cleanRg));
      const subRg = isSwapped ? permutasOut?.get(cleanRg)?.substituteRg : null;
      let full = militars.find((x: any) => normalizeRg(x.rg) === cleanRg) || m;
      if (subRg) {
        const subMilitar = militars.find((x: any) => normalizeRg(x.rg) === normalizeRg(subRg));
        if (subMilitar) full = subMilitar;
      }

      const isCondutor = Boolean(
        full.ativoCondutor ||
        full.motorista ||
        full.condutor ||
        full.dynamicFunctions?.motorista ||
        full.dynamicFunctions?.condutor ||
        m.ativoCondutor ||
        m.motorista
      );

      const isGv = Boolean(
        full.gvAma ||
        full.opAma ||
        full.ativoMaritimo ||
        full.dynamicFunctions?.gv ||
        full.dynamicFunctions?.guarda_vidas ||
        (full.quadro || '').toUpperCase().includes('GV')
      );

      // Checa se já está escalado no posto
      let assignedInPostoSlot: string | null = null;
      currentPostos.forEach(p => {
        p.slots.forEach(s => {
          if (s.rg && normalizeRg(s.rg) === cleanRg) {
            assignedInPostoSlot = `${p.postoNome} - ${s.funcaoNome}`;
          }
        });
      });

      const currentFuncs = selectedFunctions[cleanRg] || [];

      return {
        rg: full.rg || m.rg || '',
        name: full.name || m.name || '',
        warName: full.warName || m.warName || m.name || '',
        rank: full.rank || m.rank || '',
        quadro: full.quadro || m.quadro || '',
        isCondutor,
        isGv,
        isSwapped,
        assignedInPostoSlot,
        currentFuncs
      };
    }).sort((a, b) => {
      if (!a.assignedInPostoSlot && b.assignedInPostoSlot) return -1;
      if (a.assignedInPostoSlot && !b.assignedInPostoSlot) return 1;
      return (a.warName || a.name).localeCompare(b.warName || b.name);
    });
  }, [baseRoster, militars, permutasOut, currentPostos, selectedFunctions]);

  // Contadores
  const totalSlotsCount = currentPostos.reduce((acc, p) => acc + (p.ativa ? p.slots.length : 0), 0);
  const filledSlotsCount = currentPostos.reduce((acc, p) => acc + (p.ativa ? p.slots.filter(s => Boolean(s.rg)).length : 0), 0);
  const activePostosCount = currentPostos.filter(p => p.ativa).length;

  const handleSlotAssign = (postoId: string, slotId: string, rg: string | null, funcaoNome: string) => {
    const updated = currentPostos.map(p => {
      if (p.postoId === postoId) {
        return {
          ...p,
          slots: p.slots.map(s => s.slotId === slotId ? { ...s, rg } : s)
        };
      }
      return p;
    });

    onChangePostosData(updated);
    onAssignSlot(postoId, slotId, rg, funcaoNome);
    setActiveSlotSearch(null);
    setSearchTerm('');
  };

  const handleTogglePostoAtiva = (postoId: string) => {
    const updated = currentPostos.map(p => {
      if (p.postoId === postoId) {
        return { ...p, ativa: !p.ativa };
      }
      return p;
    });
    onChangePostosData(updated);
  };

  const handleLimparTodosPostos = () => {
    if (!window.confirm("Deseja realmente limpar todas as escalações nos postos de serviço para esta data?")) {
      return;
    }
    const updated = currentPostos.map(p => ({
      ...p,
      slots: p.slots.map(s => {
        if (s.rg) {
          onAssignSlot(p.postoId, s.slotId, null, s.funcaoNome);
        }
        return { ...s, rg: null };
      })
    }));
    onChangePostosData(updated);
  };

  const handleAddExtraSlot = (postoId: string) => {
    const fnName = window.prompt("Informe o nome da função para a vaga extra no posto:", "GUARDA-VIDAS EXTRA");
    if (!fnName || !fnName.trim()) return;

    const newSlot: EscalaPostoSlot = {
      slotId: `slot-extra-${Date.now()}`,
      funcaoNome: fnName.trim().toUpperCase(),
      rg: null
    };

    const updated = currentPostos.map(p => {
      if (p.postoId === postoId) {
        return {
          ...p,
          slots: [...p.slots, newSlot]
        };
      }
      return p;
    });
    onChangePostosData(updated);
  };

  const handleRemoveSlot = (postoId: string, slotId: string) => {
    const posto = currentPostos.find(p => p.postoId === postoId);
    const slot = posto?.slots.find(s => s.slotId === slotId);
    if (slot?.rg) {
      onAssignSlot(postoId, slotId, null, slot.funcaoNome);
    }
    const updated = currentPostos.map(p => {
      if (p.postoId === postoId) {
        return {
          ...p,
          slots: p.slots.filter(s => s.slotId !== slotId)
        };
      }
      return p;
    });
    onChangePostosData(updated);
  };

  // Se a seção estiver desativada no módulo Escala 24h, exibe a barra informativa com o botão para ativar
  if (!isSectionEnabled) {
    return (
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
            <Palmtree className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                Escala de Postos de Serviço (Posto de Praia)
              </span>
              <span className="text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 border border-slate-300">
                Posto está desativado
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              Esta seção está desativada no momento para o {obmContext}. Caso sua unidade utilize postos de praia ou postos operacionais fixos, ative para escalar militares.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onToggleSectionEnabled(true)}
          className="bg-teal-700 hover:bg-teal-800 text-white text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0 self-end sm:self-auto"
        >
          <Power className="w-3.5 h-3.5 text-teal-200" />
          <span>Ativar Seção de Postos</span>
        </button>
      </div>
    );
  }

  // Seção Ativada: Interface Completa
  return (
    <div className="bg-white rounded-2xl shadow-xs border border-teal-200/80 overflow-visible relative z-20">
      {/* Header Superior da Seção */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 rounded-t-2xl border-b border-teal-700 py-2.5 px-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 text-teal-200 flex items-center justify-center border border-white/20">
            <Waves className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
              ESCALA DE POSTOS DE SERVIÇO (POSTO DE PRAIA)
              {identifiedAlaStr && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-800/80 text-teal-200 border border-teal-600">
                  Ala {identifiedAlaStr}
                </span>
              )}
            </h3>
            <span className="text-[9.5px] text-teal-200/80 font-medium">
              Escalação de militares em postos de praia, salvamar e postos fixos
            </span>
          </div>
        </div>

        {/* Badges e Ações do Header */}
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <span className="text-[9.5px] font-black text-teal-200 bg-teal-800/60 border border-teal-700 px-2.5 py-1 rounded-lg uppercase tracking-wider">
            {activePostosCount} {activePostosCount === 1 ? 'Posto Ativo' : 'Postos Ativos'}
          </span>

          <span className="text-[9.5px] font-black text-emerald-200 bg-emerald-900/60 border border-emerald-700 px-2.5 py-1 rounded-lg uppercase tracking-wider">
            {filledSlotsCount} / {totalSlotsCount} Escalados
          </span>

          <button
            type="button"
            onClick={handleLimparTodosPostos}
            className="px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider text-rose-200 bg-rose-900/40 hover:bg-rose-900/60 border border-rose-700/60 transition-colors cursor-pointer flex items-center gap-1"
            title="Limpar todos os militares escalados nos postos"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpar</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleSectionEnabled(false)}
            className="px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider text-slate-300 bg-slate-800/60 hover:bg-slate-800 border border-slate-600 transition-colors cursor-pointer flex items-center gap-1"
            title="Desativar temporariamente a seção de postos nesta escala"
          >
            <Power className="w-3 h-3 text-rose-400" />
            <span>Desativar Seção</span>
          </button>
        </div>
      </div>

      {/* Grid de Postos */}
      <div className="p-4 bg-slate-50/60 space-y-4">
        {currentPostos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-teal-200 p-8 text-center">
            <Palmtree className="w-10 h-10 text-teal-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700 uppercase mb-1">
              Nenhum posto de serviço ativo no momento
            </p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto mb-3">
              Cadastre postos no módulo de Controle de Viaturas e Postos ou clique abaixo para carregar o modelo padrão de Posto de Praia.
            </p>
            <button
              type="button"
              onClick={() => onChangePostosData(DEFAULT_POSTOS.map(cfg => ({
                postoId: cfg.id,
                postoNome: cfg.nome,
                tipo: cfg.tipo || 'praia',
                ativa: true,
                slots: cfg.funcoes.map(f => ({ slotId: f.id, funcaoNome: f.nome, rg: null }))
              })))}
              className="px-4 py-2 bg-teal-700 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-teal-800 transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-teal-200" />
              Carregar Modelo Posto de Praia
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {currentPostos.map((posto) => {
              const filledInPosto = posto.slots.filter(s => Boolean(s.rg)).length;
              const totalInPosto = posto.slots.length;

              return (
                <div
                  key={posto.postoId}
                  className={cn(
                    "bg-white rounded-2xl border transition-all shadow-xs overflow-visible",
                    posto.ativa ? "border-teal-200/90" : "border-slate-200 opacity-60 bg-slate-100"
                  )}
                >
                  {/* Topo do Posto */}
                  <div className="bg-gradient-to-r from-teal-50 to-cyan-50/50 border-b border-teal-100 px-4 py-2.5 rounded-t-2xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                        <Palmtree className="w-3.5 h-3.5 text-teal-100" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-[11.5px] font-black uppercase text-slate-800 tracking-wide">
                            {posto.postoNome}
                          </h4>
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 border border-teal-200">
                            {posto.tipo === 'praia' ? 'Praia' : (posto.tipo?.toUpperCase() || 'POSTO')}
                          </span>
                        </div>
                        <span className="text-[9.5px] font-bold text-slate-500">
                          {filledInPosto}/{totalInPosto} Vagas Preenchidas
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddExtraSlot(posto.postoId)}
                        className="px-2 py-0.8 bg-white border border-teal-200 hover:bg-teal-50 text-teal-800 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                        title="Adicionar vaga extra neste posto para esta data"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>Vaga Extra</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTogglePostoAtiva(posto.postoId)}
                        className={cn(
                          "px-2 py-0.8 rounded-lg text-[9px] font-black uppercase tracking-wider border cursor-pointer transition-colors",
                          posto.ativa
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : "bg-slate-200 text-slate-600 border-slate-300"
                        )}
                        title={posto.ativa ? "Desativar este posto hoje" : "Ativar este posto hoje"}
                      >
                        {posto.ativa ? "Ativo" : "Inativo"}
                      </button>
                    </div>
                  </div>

                  {/* Vagas / Slots do Posto */}
                  <div className="p-3 space-y-2.5">
                    {posto.slots.map((slot, sIdx) => {
                      const cleanRg = slot.rg ? normalizeRg(slot.rg) : null;
                      const candidate = cleanRg ? militaryCandidates.find(c => normalizeRg(c.rg) === cleanRg) : null;
                      const isDropdownOpen = activeSlotSearch === `${posto.postoId}_${slot.slotId}`;

                      return (
                        <div
                          key={slot.slotId || sIdx}
                          className={cn(
                            "p-2.5 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5",
                            slot.rg
                              ? "bg-teal-50/40 border-teal-200"
                              : "bg-slate-50/70 border-slate-200 hover:border-slate-300"
                          )}
                        >
                          {/* Identificação da Função */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="w-5 h-5 rounded-md bg-teal-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                              {sIdx + 1}
                            </span>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-800">
                                {slot.funcaoNome}
                              </span>
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                Função de Posto
                              </span>
                            </div>
                          </div>

                          {/* Militar Escalado ou Seletor */}
                          <div className="relative w-full sm:w-auto flex-1 sm:max-w-xs flex items-center justify-end">
                            {slot.rg && candidate ? (
                              <div className="flex items-center justify-between gap-2 w-full bg-white px-2.5 py-1.5 rounded-xl border border-teal-200 shadow-2xs">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <RankInsignia rankStr={candidate.rank} className="w-4 h-4 shrink-0" />
                                  <div className="flex flex-col truncate">
                                    <span className="text-[10px] font-black uppercase text-slate-800 truncate">
                                      {candidate.rank} {candidate.warName}
                                    </span>
                                    <span className="text-[8px] text-slate-400 font-mono">
                                      RG: {candidate.rg}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSlotAssign(posto.postoId, slot.slotId, null, slot.funcaoNome)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                  title="Remover militar desta vaga"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="relative w-full">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isDropdownOpen) {
                                      setActiveSlotSearch(null);
                                    } else {
                                      setActiveSlotSearch(`${posto.postoId}_${slot.slotId}`);
                                      setSearchTerm('');
                                    }
                                  }}
                                  className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border border-dashed border-teal-300 bg-white hover:bg-teal-50/50 text-[10px] font-black uppercase tracking-wider text-teal-800 transition-colors cursor-pointer shadow-2xs"
                                >
                                  <span className="text-slate-400 font-bold normal-case">
                                    + Escalar militar...
                                  </span>
                                  <ChevronDown className="w-3 h-3 text-teal-600" />
                                </button>

                                {/* Dropdown de Busca do Militar */}
                                {isDropdownOpen && (
                                  <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 mb-2">
                                      <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <input
                                        type="text"
                                        placeholder="Buscar por nome ou RG..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        autoFocus
                                        className="w-full text-[10px] font-bold bg-transparent outline-none uppercase"
                                      />
                                      {searchTerm && (
                                        <button
                                          type="button"
                                          onClick={() => setSearchTerm('')}
                                          className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>

                                    {/* Lista de Militares Candidatos */}
                                    <div className="max-h-48 overflow-y-auto space-y-1">
                                      {militaryCandidates
                                        .filter(m => {
                                          if (!searchTerm) return true;
                                          const term = searchTerm.toLowerCase();
                                          return (
                                            (m.name || '').toLowerCase().includes(term) ||
                                            (m.warName || '').toLowerCase().includes(term) ||
                                            (m.rg || '').includes(term)
                                          );
                                        })
                                        .map(m => {
                                          const isAlreadyInThisPosto = m.assignedInPostoSlot !== null;
                                          return (
                                            <button
                                              key={m.rg}
                                              type="button"
                                              onClick={() => handleSlotAssign(posto.postoId, slot.slotId, m.rg, slot.funcaoNome)}
                                              className={cn(
                                                "w-full text-left px-2 py-1.5 rounded-lg text-[9.5px] font-bold flex items-center justify-between gap-2 transition-colors cursor-pointer",
                                                isAlreadyInThisPosto
                                                  ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200"
                                                  : "hover:bg-teal-50 text-slate-800"
                                              )}
                                            >
                                              <div className="flex items-center gap-1.5 truncate">
                                                <RankInsignia rankStr={m.rank} className="w-3.5 h-3.5 shrink-0" />
                                                <span className="truncate uppercase font-black">
                                                  {m.rank} {m.warName}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-1 shrink-0">
                                                {isAlreadyInThisPosto && (
                                                  <span className="text-[7.5px] font-black uppercase px-1 py-0.2 rounded bg-amber-200 text-amber-950">
                                                    Escalado
                                                  </span>
                                                )}
                                                <span className="text-[8px] text-slate-400 font-mono">
                                                  {m.rg}
                                                </span>
                                              </div>
                                            </button>
                                          );
                                        })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Botão de Excluir Vaga Extra */}
                            {slot.slotId.startsWith('slot-extra') && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSlot(posto.postoId, slot.slotId)}
                                className="ml-1 p-1 text-slate-300 hover:text-rose-500 rounded cursor-pointer"
                                title="Excluir esta vaga extra"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rodapé Retrátil: Efetivo da Ala para Consulta Rápida */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsRosterOpen(prev => !prev)}
              className="flex items-center gap-2 text-[10.5px] font-black uppercase tracking-wider text-slate-700 hover:text-teal-700 transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-teal-600" />
              <span>Efetivo de Serviço na Ala ({militaryCandidates.length} Militares)</span>
              {isRosterOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hidden sm:inline">
                Filtro:
              </span>
              <button
                type="button"
                onClick={() => setRosterFilter('todos')}
                className={cn(
                  "px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider cursor-pointer border",
                  rosterFilter === 'todos' ? "bg-teal-700 text-white border-teal-700" : "bg-slate-100 text-slate-600 border-slate-200"
                )}
              >
                Todos ({militaryCandidates.length})
              </button>
              <button
                type="button"
                onClick={() => setRosterFilter('disponiveis')}
                className={cn(
                  "px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider cursor-pointer border",
                  rosterFilter === 'disponiveis' ? "bg-teal-700 text-white border-teal-700" : "bg-slate-100 text-slate-600 border-slate-200"
                )}
              >
                Sem Posto ({militaryCandidates.filter(m => !m.assignedInPostoSlot).length})
              </button>
            </div>
          </div>

          {isRosterOpen && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {militaryCandidates
                .filter(m => rosterFilter === 'todos' || !m.assignedInPostoSlot)
                .map(m => (
                  <div
                    key={m.rg}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[9.5px] font-black uppercase tracking-wide border shadow-2xs",
                      m.assignedInPostoSlot
                        ? "bg-teal-50 border-teal-200 text-teal-900"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    )}
                  >
                    <RankInsignia rankStr={m.rank} className="w-3.5 h-3.5 shrink-0" />
                    <span>{m.rank} {m.warName}</span>
                    <span className="text-[8px] text-slate-400 font-mono">{m.rg}</span>
                    {m.assignedInPostoSlot && (
                      <span className="text-[7.5px] px-1 py-0.2 rounded bg-teal-200 text-teal-950 font-black">
                        {m.assignedInPostoSlot}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
