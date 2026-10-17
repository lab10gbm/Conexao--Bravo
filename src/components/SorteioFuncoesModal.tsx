import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Truck, ClipboardList, Settings, Shuffle, X, Check, Dices, RotateCcw, ChevronDown,
  AlertTriangle, Sparkles, Users, LayoutGrid, Ban, Info, Eraser, ShieldCheck,
  Star, UserPlus, ArrowLeftRight, Search, Plus,
} from "lucide-react";
import { cn, formatMilitaryName } from "../lib/utils";
import { parseRank, sortAllBySeniority } from "../lib/rankUtils";
import { RankInsignia } from "./RankInsignia";
import {
  SorteioScope, SorteioRequirement, SorteioMilitar, SorteioOptions, SorteioResult,
  SORTEIO_PRESETS, computeSorteio, getPresetOptions, getScopeRequirements, normalizeFnName,
  isSentinelaFn, isPreferredAssignment, isMilitarAllowedForFn,
} from "../lib/sorteioFuncoes";

// ═════════════════════════════════════════════════════════════════════════════
// BARRA DE AÇÕES (Sortear Viaturas | Sortear Administrativas | ⚙ | Limpar ▾)
// ═════════════════════════════════════════════════════════════════════════════

interface SorteioActionBarProps {
  onSortear: (scope: SorteioScope) => void;
  onConfig: () => void;
  onLimpar: (scope: SorteioScope | "tudo") => void;
  /** Versão compacta para cabeçalhos de seção */
  compact?: boolean;
}

export function SorteioActionBar({ onSortear, onConfig, onLimpar, compact }: SorteioActionBarProps) {
  const [limparOpen, setLimparOpen] = useState(false);
  const limparRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!limparOpen) return;
    const handler = (e: MouseEvent) => {
      if (limparRef.current && !limparRef.current.contains(e.target as Node)) setLimparOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [limparOpen]);

  const h = compact ? "h-7" : "h-8";
  const text = compact ? "text-[10px]" : "text-[10.5px]";
  const icon = compact ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* Cluster Sortear */}
      <div className="flex items-center rounded-lg shadow-2xs border border-amber-500/40 overflow-hidden shrink-0">
        <button
          onClick={() => onSortear("viaturas")}
          className={cn(h, text, "px-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer")}
          title="Sortear funções de VIATURA (condutores, chefes, auxiliares…)"
        >
          <Truck className={icon} />
          <span className={compact ? "hidden lg:inline" : ""}>Sortear</span>
          <span>Viaturas</span>
        </button>
        <button
          onClick={() => onSortear("administrativas")}
          className={cn(h, text, "px-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-black uppercase tracking-wider flex items-center gap-1.5 border-l border-orange-300/40 transition-all active:scale-95 cursor-pointer")}
          title="Sortear funções ADMINISTRATIVAS (adjunto, sgt dia, comunicante, faxina…)"
        >
          <ClipboardList className={icon} />
          <span className={compact ? "hidden lg:inline" : ""}>Sortear</span>
          <span>Admin.</span>
        </button>
        <button
          onClick={onConfig}
          className={cn(h, "px-2 bg-orange-600 hover:bg-orange-500 text-white border-l border-orange-400/40 flex items-center justify-center transition-colors cursor-pointer")}
          title="Pré-definições fixas por militar"
        >
          <Settings className={icon} />
        </button>
      </div>

      {/* Limpar com menu */}
      <div className="relative shrink-0" ref={limparRef}>
        <button
          onClick={() => setLimparOpen((o) => !o)}
          className={cn(h, text, "px-2.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 font-black uppercase tracking-wider shadow-2xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer", limparOpen && "bg-rose-50 text-rose-700 border-rose-200")}
          title="Limpar funções da escala"
        >
          <RotateCcw className={cn(icon, "text-rose-500")} />
          <span>Limpar</span>
          <ChevronDown className={cn("w-3 h-3 transition-transform", limparOpen && "rotate-180")} />
        </button>
        {limparOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-xl border border-slate-200 shadow-2xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-1">
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
              O que deseja limpar?
            </div>
            {([
              { id: "viaturas", label: "Funções de viatura", desc: "Condutores, chefes e auxiliares", Icon: Truck, color: "text-orange-500" },
              { id: "administrativas", label: "Funções administrativas", desc: "Adjunto, SGT dia, faxina…", Icon: ClipboardList, color: "text-indigo-500" },
              { id: "tudo", label: "Limpar tudo", desc: "Todas as funções (sentinela preservada)", Icon: Eraser, color: "text-rose-500" },
            ] as const).map(({ id, label, desc, Icon, color }) => (
              <button
                key={id}
                onClick={() => { setLimparOpen(false); onLimpar(id); }}
                className={cn("w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-rose-50/60 transition-colors cursor-pointer border-b border-slate-100 last:border-0", id === "tudo" && "bg-rose-50/30")}
              >
                <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", color)} />
                <span className="flex flex-col">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-800">{label}</span>
                  <span className="text-[10px] font-medium text-slate-500">{desc}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MODAL DE SORTEIO COM PRÉVIA, CAMPO DE MILITARES E ESCALAÇÃO VOLUNTÁRIA
// ═════════════════════════════════════════════════════════════════════════════

const SLOT_ORDER = ["cg", "condutor", "g1", "g2", "g3", "g4"] as const;
const SLOT_LABEL: Record<string, string> = { cg: "Chefe", condutor: "Condutor", g1: "Aux 1", g2: "Aux 2", g3: "Aux 3", g4: "Aux 4" };

const STORAGE_KEY = (scope: SorteioScope) => `cb_sorteio_prefs_${scope}`;

type Status = "novo" | "mantido";
interface Occupant {
  rg: string;
  status: Status;
  manual?: boolean;
}

interface ModalSlot {
  slotId: string;
  vtrId?: string;
  vtrName?: string;
  slotKey?: string;
  slotLabel: string;
  fn: string;
  genericName: string;
}

interface SorteioFuncoesModalProps {
  scope: SorteioScope;
  onClose: () => void;
  onApply: (newSelected: Record<string, string[]>, result: SorteioResult, presetLabel: string) => void;
  requirements: SorteioRequirement[];
  roster: SorteioMilitar[];
  selectedFunctions: Record<string, string[]>;
  predefinicoes: Record<string, string[]>;
  viaturasInfo: any[];
  getSlotDisplayName: (v: any, slot: string) => string;
  onOpenPredefinicoes: () => void;
  onToggleRoleActive?: (roleName: string) => void;
  onSetAllRolesActive?: (active: boolean) => void;
}

const loadSaved = (scope: SorteioScope): { presetId: string; options: SorteioOptions } => {
  const fallback = { presetId: SORTEIO_PRESETS[scope][0].id, options: getPresetOptions(scope, SORTEIO_PRESETS[scope][0].id) };
  try {
    const raw = localStorage.getItem(STORAGE_KEY(scope));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return {
      presetId: parsed.presetId || fallback.presetId,
      options: { ...getPresetOptions(scope, parsed.presetId || fallback.presetId), ...(parsed.options || {}) },
    };
  } catch {
    return fallback;
  }
};

const optionsMatchPreset = (scope: SorteioScope, presetId: string, o: SorteioOptions) => {
  const p = SORTEIO_PRESETS[scope].find((x) => x.id === presetId);
  if (!p) return false;
  return (Object.keys(p.options) as (keyof typeof p.options)[]).every((k) => p.options[k] === o[k]);
};

function Toggle({ checked, onChange, label, hint, disabled, extra }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean; extra?: React.ReactNode;
}) {
  return (
    <label className={cn("flex items-start gap-3 py-2 cursor-pointer select-none group", disabled && "opacity-50 cursor-not-allowed")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 w-8 h-[18px] rounded-full transition-colors shrink-0 cursor-pointer", checked ? "bg-emerald-500" : "bg-slate-300")}
      >
        <span className={cn("absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform", checked && "translate-x-[14px]")} />
      </button>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-700">
          {label}
          {extra}
        </span>
        {hint && <span className="block text-[10px] font-medium text-slate-500 leading-snug mt-0.5">{hint}</span>}
      </span>
    </label>
  );
}

export function SorteioFuncoesModal({
  scope, onClose, onApply, requirements, roster, selectedFunctions, predefinicoes,
  viaturasInfo, getSlotDisplayName, onOpenPredefinicoes, onToggleRoleActive, onSetAllRolesActive,
}: SorteioFuncoesModalProps) {
  const isVtr = scope === "viaturas";
  const initial = useMemo(() => loadSaved(scope), [scope]);
  const [presetId, setPresetId] = useState(initial.presetId);
  const [options, setOptions] = useState<SorteioOptions>(initial.options);
  const [view, setView] = useState<"estrutura" | "militar">("estrutura");
  const [rolling, setRolling] = useState(false);

  // Militares retirados manualmente de vagas (vão para o Campo de Militares sem bagunçar o resto)
  const [retiradosInfo, setRetiradosInfo] = useState<Record<string, string>>({});
  // Militar selecionado no Campo de Militares para alocação com 1 clique em qualquer vaga
  const [selectedPoolRg, setSelectedPoolRg] = useState<string | null>(null);
  // Filtro do Campo de Militares
  const [poolFilter, setPoolFilter] = useState<"disponiveis" | "retirados" | "todos">("disponiveis");
  const [poolSearch, setPoolSearch] = useState("");
  // Vaga que está com o seletor voluntário aberto
  const [pickerSlotId, setPickerSlotId] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  // Militar na aba "Por militar" com seletor de função aberto
  const [addFnForRg, setAddFnForRg] = useState<string | null>(null);

  const scopeReqs = useMemo(() => getScopeRequirements(requirements, scope), [requirements, scope]);
  const scopeFnNormSet = useMemo(() => new Set(scopeReqs.map((r) => normalizeFnName(r.name))), [scopeReqs]);
  const excludedSet = useMemo(() => new Set(options.funcoesExcluidas.map(normalizeFnName)), [options.funcoesExcluidas]);

  const reqByNorm = useMemo(() => {
    const m = new Map<string, SorteioRequirement>();
    scopeReqs.forEach((r) => m.set(normalizeFnName(r.name), r));
    return m;
  }, [scopeReqs]);

  // Lista determinística de todas as vagas físicas ativas deste escopo
  const allSlots = useMemo<ModalSlot[]>(() => {
    if (isVtr) {
      const list: ModalSlot[] = [];
      viaturasInfo
        .filter((v) => v.ativa)
        .forEach((v) => {
          const vId = v.id || v.vtr;
          SLOT_ORDER.filter((s) => !v.blocked?.includes(s) && v[s] === true).forEach((s) => {
            const fn = getSlotDisplayName(v, s);
            const genericName = reqByNorm.get(normalizeFnName(fn))?.genericName || fn;
            list.push({
              slotId: `${vId}::${s}`,
              vtrId: vId,
              vtrName: v.vtr,
              slotKey: s,
              slotLabel: SLOT_LABEL[s],
              fn,
              genericName,
            });
          });
        });
      return list;
    }
    const list: ModalSlot[] = [];
    scopeReqs
      .filter((r) => r.active !== false && r.req > 0)
      .forEach((r) => {
        for (let i = 0; i < r.req; i++) {
          list.push({
            slotId: `${r.name}::${i}`,
            slotLabel: r.req > 1 ? `Vaga ${i + 1}` : "Titular",
            fn: r.name,
            genericName: r.genericName,
          });
        }
      });
    return list;
  }, [isVtr, viaturasInfo, getSlotDisplayName, reqByNorm, scopeReqs]);

  // Constrói o mapa de vagas a partir de um resultado do motor
  const buildSlotsFromEngine = (opts: SorteioOptions, seedVal: number): Record<string, Occupant | null> => {
    const res = computeSorteio({
      scope,
      requirements,
      roster,
      selectedFunctions,
      predefinicoes,
      options: opts,
      seed: seedVal,
    });
    const novasSet = new Set(res.novas.map((a) => `${a.rg}|${normalizeFnName(a.fn)}`));
    const queues = new Map<string, Occupant[]>();
    Object.entries(res.newSelected).forEach(([rg, fns]) => {
      (fns || []).forEach((fn) => {
        const norm = normalizeFnName(fn);
        if (!scopeFnNormSet.has(norm)) return;
        const status: Status = novasSet.has(`${rg}|${norm}`) ? "novo" : "mantido";
        queues.set(norm, [...(queues.get(norm) || []), { rg, status }]);
      });
    });
    queues.forEach((list) => list.sort((a, b) => (a.status === b.status ? 0 : a.status === "mantido" ? -1 : 1)));

    const map: Record<string, Occupant | null> = {};
    allSlots.forEach((s) => {
      const norm = normalizeFnName(s.fn);
      const occ = queues.get(norm)?.shift() || null;
      map[s.slotId] = occ;
    });
    return map;
  };

  // Estado independente por vaga: remover ou escalar em uma vaga NUNCA bagunça as outras!
  const [slotAssignments, setSlotAssignments] = useState<Record<string, Occupant | null>>(() =>
    buildSlotsFromEngine(initial.options, Math.floor(Math.random() * 1e9))
  );
  const prevSlotIdsRef = useRef<Set<string>>(new Set(allSlots.map((s) => s.slotId)));

  // Quando funções/viaturas são ativadas ou desativadas em tempo real, preenche apenas as vagas recém-ativadas sem bagunçar as existentes
  useEffect(() => {
    const prevIds = prevSlotIdsRef.current;
    const currentIds = new Set(allSlots.map((s) => s.slotId));
    const addedSlots = allSlots.filter((s) => !prevIds.has(s.slotId));
    const removedAny = Array.from(prevIds).some((id) => !currentIds.has(id));
    prevSlotIdsRef.current = currentIds;

    if (addedSlots.length === 0 && !removedAny) return;

    setSlotAssignments((prev) => {
      const next: Record<string, Occupant | null> = {};
      allSlots.forEach((s) => {
        if (s.slotId in prev) {
          next[s.slotId] = prev[s.slotId];
        }
      });

      if (addedSlots.length > 0) {
        // Constrói o estado parcial já alocado nas vagas preservadas
        const tempSelected: Record<string, string[]> = {};
        Object.entries(selectedFunctions || {}).forEach(([rg, fns]) => {
          const outside = (fns || []).filter((fn) => !scopeFnNormSet.has(normalizeFnName(fn)));
          if (outside.length > 0) tempSelected[rg] = [...outside];
        });
        allSlots.forEach((s) => {
          const occ = next[s.slotId];
          if (!occ) return;
          const curr = tempSelected[occ.rg] || [];
          if (!curr.some((f) => normalizeFnName(f) === normalizeFnName(s.fn))) {
            tempSelected[occ.rg] = [...curr, s.fn];
          }
        });

        const res = computeSorteio({
          scope,
          requirements,
          roster,
          selectedFunctions: tempSelected,
          predefinicoes,
          options: { ...options, modo: "preencher" },
          seed: Math.floor(Math.random() * 1e9),
        });

        const addedByNorm = new Map<string, string[]>();
        res.novas.forEach((a) => {
          const norm = normalizeFnName(a.fn);
          addedByNorm.set(norm, [...(addedByNorm.get(norm) || []), a.rg]);
        });

        addedSlots.forEach((s) => {
          const norm = normalizeFnName(s.fn);
          if (excludedSet.has(norm)) {
            next[s.slotId] = null;
            return;
          }
          const rg = addedByNorm.get(norm)?.shift();
          next[s.slotId] = rg ? { rg, status: "novo" } : null;
        });
      }

      return next;
    });
  }, [allSlots]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (pickerSlotId) setPickerSlotId(null);
        else if (selectedPoolRg) setSelectedPoolRg(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pickerSlotId, selectedPoolRg]);

  const rosterMap = useMemo(() => new Map(roster.map((m) => [m.rg, m])), [roster]);

  // Funções que já estavam escaladas originalmente neste escopo (para saber o que é novo vs mantido)
  const initialScopePairs = useMemo(() => {
    const s = new Set<string>();
    Object.entries(selectedFunctions || {}).forEach(([rg, fns]) => {
      (fns || []).forEach((fn) => {
        const norm = normalizeFnName(fn);
        if (scopeFnNormSet.has(norm)) s.add(`${rg}|${norm}`);
      });
    });
    return s;
  }, [selectedFunctions, scopeFnNormSet]);

  // Estado final consolidado (`Record<rg, string[]>`) derivado exatamente das vagas atuais da prévia
  const effectiveSelected = useMemo(() => {
    const next: Record<string, string[]> = {};
    // 1. Preserva todas as funções fora deste escopo (ex: Sentinela e o outro grupo)
    Object.entries(selectedFunctions || {}).forEach(([rg, fns]) => {
      const outside = (fns || []).filter((fn) => !scopeFnNormSet.has(normalizeFnName(fn)));
      if (outside.length > 0) next[rg] = [...outside];
    });
    // 2. Adiciona as vagas ocupadas neste escopo
    allSlots.forEach((s) => {
      const occ = slotAssignments[s.slotId];
      if (!occ) return;
      const curr = next[occ.rg] || [];
      if (!curr.some((f) => normalizeFnName(f) === normalizeFnName(s.fn))) {
        next[occ.rg] = [...curr, s.fn];
      }
    });
    return next;
  }, [selectedFunctions, scopeFnNormSet, allSlots, slotAssignments]);

  // Estatísticas e listas derivadas das vagas atuais
  const stats = useMemo(() => {
    const activeSlots = allSlots.filter((s) => !excludedSet.has(normalizeFnName(s.fn)));
    const totalVagas = activeSlots.length;
    let jaPreenchidas = 0;
    const novas: { rg: string; fn: string }[] = [];
    const missingByFn = new Map<string, number>();

    activeSlots.forEach((s) => {
      const occ = slotAssignments[s.slotId];
      if (occ) {
        if (occ.status === "mantido") jaPreenchidas++;
        else novas.push({ rg: occ.rg, fn: s.fn });
      } else {
        missingByFn.set(s.fn, (missingByFn.get(s.fn) || 0) + 1);
      }
    });

    // Funções que estavam antes e saíram
    const currentPairs = new Set<string>();
    allSlots.forEach((s) => {
      const occ = slotAssignments[s.slotId];
      if (occ) currentPairs.add(`${occ.rg}|${normalizeFnName(s.fn)}`);
    });
    const removidas: { rg: string; fn: string }[] = [];
    Object.entries(selectedFunctions || {}).forEach(([rg, fns]) => {
      (fns || []).forEach((fn) => {
        const norm = normalizeFnName(fn);
        if (scopeFnNormSet.has(norm) && !currentPairs.has(`${rg}|${norm}`)) {
          removidas.push({ rg, fn });
        }
      });
    });

    return {
      totalVagas,
      jaPreenchidas,
      novas,
      removidas,
      vagasSemEfetivo: Array.from(missingByFn.entries()).map(([fn, count]) => ({ fn, count })),
    };
  }, [allSlots, excludedSet, slotAssignments, selectedFunctions, scopeFnNormSet]);

  // Quantas vagas cada militar ocupa neste escopo atualmente
  const scopeRolesByRg = useMemo(() => {
    const m = new Map<string, { slotId: string; fn: string; genericName: string; status: Status }[]>();
    allSlots.forEach((s) => {
      const occ = slotAssignments[s.slotId];
      if (!occ) return;
      m.set(occ.rg, [
        ...(m.get(occ.rg) || []),
        { slotId: s.slotId, fn: s.fn, genericName: s.genericName, status: occ.status },
      ]);
    });
    return m;
  }, [allSlots, slotAssignments]);

  const isCustom = !optionsMatchPreset(scope, presetId, options);
  const presetLabel = isCustom ? "Personalizado" : SORTEIO_PRESETS[scope].find((p) => p.id === presetId)?.label || "";

  // ── Ações de Configuração (recalculam a sugestão) ──
  const applyNewOptions = (nextOpts: SorteioOptions) => {
    setOptions(nextOpts);
    setSlotAssignments(buildSlotsFromEngine(nextOpts, Math.floor(Math.random() * 1e9)));
    setRetiradosInfo({});
  };

  const updateOption = <K extends keyof SorteioOptions>(k: K, v: SorteioOptions[K]) => {
    applyNewOptions({ ...options, [k]: v });
  };

  const choosePreset = (id: string) => {
    setPresetId(id);
    applyNewOptions({ ...getPresetOptions(scope, id), funcoesExcluidas: options.funcoesExcluidas });
  };

  const toggleFn = (name: string) => {
    const norm = normalizeFnName(name);
    const r = reqByNorm.get(norm);
    const isSystemActive = r ? r.active !== false && r.req > 0 : true;

    if (onToggleRoleActive) {
      onToggleRoleActive(name);
      if (!isSystemActive && options.funcoesExcluidas.some((f) => normalizeFnName(f) === norm)) {
        setOptions((prev) => ({
          ...prev,
          funcoesExcluidas: prev.funcoesExcluidas.filter((f) => normalizeFnName(f) !== norm),
        }));
      }
      return;
    }

    const has = options.funcoesExcluidas.map(normalizeFnName).includes(norm);
    const nextExcl = has
      ? options.funcoesExcluidas.filter((f) => normalizeFnName(f) !== norm)
      : [...options.funcoesExcluidas, name];
    applyNewOptions({ ...options, funcoesExcluidas: nextExcl });
  };

  const handleSetAllFns = (active: boolean) => {
    if (onSetAllRolesActive) {
      onSetAllRolesActive(active);
      setOptions((prev) => ({ ...prev, funcoesExcluidas: [] }));
      if (!active) {
        clearAllPreviewSlots();
      }
      return;
    }
    applyNewOptions({ ...options, funcoesExcluidas: active ? [] : scopeReqs.map((r) => r.name) });
  };

  // Sortear novamente todas as vagas
  const rerollAll = () => {
    setRolling(true);
    setSlotAssignments(buildSlotsFromEngine(options, Math.floor(Math.random() * 1e9)));
    setRetiradosInfo({});
    setTimeout(() => setRolling(false), 350);
  };

  // Preencher APENAS as vagas que estão VAGO no momento, sem mexer em quem já está nas outras vagas!
  const fillOnlyEmptySlots = () => {
    setRolling(true);
    const res = computeSorteio({
      scope,
      requirements,
      roster,
      selectedFunctions: effectiveSelected,
      predefinicoes,
      options: { ...options, modo: "preencher" },
      seed: Math.floor(Math.random() * 1e9),
    });

    // Descobre quais atribuições novas o motor sugeriu além do effectiveSelected
    const addedByNorm = new Map<string, string[]>();
    res.novas.forEach((a) => {
      const norm = normalizeFnName(a.fn);
      addedByNorm.set(norm, [...(addedByNorm.get(norm) || []), a.rg]);
    });

    setSlotAssignments((prev) => {
      const next = { ...prev };
      const placedRgs = new Set<string>();
      allSlots.forEach((s) => {
        if (next[s.slotId]) return;
        const norm = normalizeFnName(s.fn);
        if (excludedSet.has(norm)) return;
        const queue = addedByNorm.get(norm);
        const rg = queue?.shift();
        if (rg) {
          next[s.slotId] = {
            rg,
            status: initialScopePairs.has(`${rg}|${norm}`) ? "mantido" : "novo",
          };
          placedRgs.add(rg);
        }
      });
      if (placedRgs.size > 0) {
        setRetiradosInfo((old) => {
          const copy = { ...old };
          placedRgs.forEach((r) => delete copy[r]);
          return copy;
        });
      }
      return next;
    });
    setTimeout(() => setRolling(false), 350);
  };

  // Esvaziar todas as vagas na prévia (para montar manualmente se desejar)
  const clearAllPreviewSlots = () => {
    const empty: Record<string, Occupant | null> = {};
    allSlots.forEach((s) => { empty[s.slotId] = null; });
    setSlotAssignments(empty);
  };

  // ── Ações Diretas por Vaga (SEM cascata!) ──
  const removeFromSlot = (slot: ModalSlot) => {
    const occ = slotAssignments[slot.slotId];
    if (!occ) return;
    // Apenas esvazia esta vaga específica — ninguém mais muda de lugar!
    setSlotAssignments((prev) => ({ ...prev, [slot.slotId]: null }));
    setRetiradosInfo((prev) => ({ ...prev, [occ.rg]: slot.fn }));
    setPoolFilter("retirados");
  };

  const assignToSlot = (slot: ModalSlot, rg: string) => {
    const norm = normalizeFnName(slot.fn);
    const prevOcc = slotAssignments[slot.slotId];
    setSlotAssignments((prev) => ({
      ...prev,
      [slot.slotId]: {
        rg,
        status: initialScopePairs.has(`${rg}|${norm}`) ? "mantido" : "novo",
        manual: true,
      },
    }));
    setRetiradosInfo((prev) => {
      const copy = { ...prev };
      delete copy[rg];
      if (prevOcc && prevOcc.rg !== rg) {
        copy[prevOcc.rg] = slot.fn;
      }
      return copy;
    });
    setSelectedPoolRg(null);
    setPickerSlotId(null);
    setPickerSearch("");
  };

  // Helper de nome do militar
  const nameOf = (rg: string) => {
    const m = rosterMap.get(rg)?.militar;
    if (!m) return `RG ${rg}`;
    return m.warName?.toUpperCase() || formatMilitaryName(m.name || "") || `RG ${rg}`;
  };

  // Preferências do militar neste escopo
  const getScopePrefsForMilitar = (rg: string): string[] => {
    const prefs = predefinicoes?.[rg] || [];
    return prefs.filter((p) =>
      scopeReqs.some(
        (r) =>
          normalizeFnName(r.name) === normalizeFnName(p) ||
          normalizeFnName(r.genericName) === normalizeFnName(p)
      )
    );
  };

  // Agrupamento de cartões por viatura
  const vehicleCards = useMemo(() => {
    if (!isVtr) return [];
    const byVtr = new Map<string, { vtrName: string; slots: (ModalSlot & { occ: Occupant | null; excluded: boolean })[] }>();
    allSlots.forEach((s) => {
      const key = s.vtrId || s.vtrName || "";
      if (!byVtr.has(key)) byVtr.set(key, { vtrName: s.vtrName || key, slots: [] });
      byVtr.get(key)!.slots.push({
        ...s,
        occ: slotAssignments[s.slotId] || null,
        excluded: excludedSet.has(normalizeFnName(s.fn)),
      });
    });
    return Array.from(byVtr.entries()).map(([id, data]) => ({ id, ...data }));
  }, [isVtr, allSlots, slotAssignments, excludedSet]);

  // Agrupamento de cartões por função administrativa
  const adminCards = useMemo(() => {
    if (isVtr) return [];
    return scopeReqs.map((r) => {
      const slots = allSlots
        .filter((s) => normalizeFnName(s.fn) === normalizeFnName(r.name))
        .map((s) => ({
          ...s,
          occ: slotAssignments[s.slotId] || null,
          excluded: excludedSet.has(normalizeFnName(s.fn)),
        }));
      return { req: r, slots };
    });
  }, [isVtr, scopeReqs, allSlots, slotAssignments, excludedSet]);

  // Contagens para o Campo de Militares
  const retiradosCount = Object.keys(retiradosInfo).length;
  const livresCount = useMemo(
    () => roster.filter((m) => (scopeRolesByRg.get(m.rg) || []).length === 0).length,
    [roster, scopeRolesByRg]
  );

  // Lista exibida no Campo de Militares
  const poolMilitars = useMemo(() => {
    const q = poolSearch.trim().toLowerCase();
    return roster
      .filter((m) => {
        if (q) {
          const full = `${m.militar?.rank || ""} ${m.militar?.warName || ""} ${m.militar?.name || ""} ${m.rg}`.toLowerCase();
          if (!full.includes(q)) return false;
        }
        const roles = scopeRolesByRg.get(m.rg) || [];
        const isRetirado = Boolean(retiradosInfo[m.rg]);
        if (poolFilter === "retirados") return isRetirado;
        if (poolFilter === "disponiveis") return isRetirado || roles.length === 0;
        return true;
      })
      .sort((a, b) => {
        const retA = Boolean(retiradosInfo[a.rg]);
        const retB = Boolean(retiradosInfo[b.rg]);
        if (retA !== retB) return retA ? -1 : 1;
        const freeA = (scopeRolesByRg.get(a.rg) || []).length === 0;
        const freeB = (scopeRolesByRg.get(b.rg) || []).length === 0;
        if (freeA !== freeB) return freeA ? -1 : 1;
        return sortAllBySeniority(a.militar, b.militar);
      });
  }, [roster, poolSearch, poolFilter, scopeRolesByRg, retiradosInfo]);

  const totalNovas = stats.novas.length;
  const totalRemovidas = stats.removidas.length;
  const totalSemEfetivo = stats.vagasSemEfetivo.reduce((s, v) => s + v.count, 0);
  const preenchidasDepois = Math.min(stats.totalVagas, stats.jaPreenchidas + totalNovas);
  const coverage = stats.totalVagas > 0 ? Math.round((preenchidasDepois / stats.totalVagas) * 100) : 100;
  const militaresEnvolvidos = new Set(stats.novas.map((n) => n.rg)).size;

  const handleOk = () => {
    try {
      localStorage.setItem(STORAGE_KEY(scope), JSON.stringify({ presetId, options }));
    } catch { /* ignore */ }
    onApply(
      effectiveSelected,
      {
        newSelected: effectiveSelected,
        novas: stats.novas,
        removidas: stats.removidas,
        vagasSemEfetivo: stats.vagasSemEfetivo,
        totalVagas: stats.totalVagas,
        jaPreenchidas: stats.jaPreenchidas,
      },
      presetLabel
    );
  };

  // Renderiza o Seletor Voluntário de Militar para uma vaga específica
  const renderSlotPicker = (slot: ModalSlot) => {
    const q = pickerSearch.trim().toLowerCase();
    const filtered = roster.filter((m) => {
      if (!q) return true;
      const full = `${m.militar?.rank || ""} ${m.militar?.warName || ""} ${m.militar?.name || ""} ${m.rg}`.toLowerCase();
      return full.includes(q);
    });

    const sortForSlot = (a: SorteioMilitar, b: SorteioMilitar) => {
      const prefA = isPreferredAssignment(predefinicoes, a.rg, slot.fn, slot.genericName);
      const prefB = isPreferredAssignment(predefinicoes, b.rg, slot.fn, slot.genericName);
      if (prefA !== prefB) return prefA ? -1 : 1;
      const retA = Boolean(retiradosInfo[a.rg]);
      const retB = Boolean(retiradosInfo[b.rg]);
      if (retA !== retB) return retA ? -1 : 1;
      const freeA = (scopeRolesByRg.get(a.rg) || []).length === 0;
      const freeB = (scopeRolesByRg.get(b.rg) || []).length === 0;
      if (freeA !== freeB) return freeA ? -1 : 1;
      return sortAllBySeniority(a.militar, b.militar);
    };

    const qualified = filtered.filter((m) => isMilitarAllowedForFn(m.allowed, slot.fn, slot.genericName)).sort(sortForSlot);
    const others = filtered.filter((m) => !isMilitarAllowedForFn(m.allowed, slot.fn, slot.genericName)).sort(sortForSlot);

    const renderCandidateRow = (m: SorteioMilitar, isQual: boolean) => {
      const isPref = isPreferredAssignment(predefinicoes, m.rg, slot.fn, slot.genericName);
      const isRet = Boolean(retiradosInfo[m.rg]);
      const currentRoles = scopeRolesByRg.get(m.rg) || [];
      return (
        <button
          key={m.rg}
          type="button"
          onClick={() => assignToSlot(slot, m.rg)}
          className={cn(
            "w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors cursor-pointer border border-transparent",
            isPref
              ? "bg-amber-50/90 hover:bg-amber-100/90 border-amber-200"
              : isQual
              ? "hover:bg-emerald-50"
              : "hover:bg-slate-100 opacity-85"
          )}
        >
          <RankInsignia rankStr={m.militar?.rank} className="w-4 h-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase">{parseRank(m.militar?.rank)}</span>
              <span className="text-[11px] font-black text-slate-800 uppercase truncate">{nameOf(m.rg)}</span>
              {isPref && (
                <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-200/80 text-amber-900 text-[8.5px] font-black uppercase shrink-0" title="Preferência configurada pelo escalante para esta função">
                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-600" /> Pref.
                </span>
              )}
            </div>
            {currentRoles.length > 0 && (
              <div className="text-[8.5px] font-bold text-slate-400 uppercase truncate">
                Já em: {currentRoles.map((r) => r.fn).join(", ")}
              </div>
            )}
          </div>
          {isRet ? (
            <span className="text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 shrink-0">
              Retirado
            </span>
          ) : currentRoles.length === 0 ? (
            <span className="text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 shrink-0">
              Livre
            </span>
          ) : (
            <span className="text-[8.5px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">
              {currentRoles.length} função
            </span>
          )}
        </button>
      );
    };

    return (
      <div className="mt-1.5 rounded-xl border border-indigo-200 bg-white shadow-xl overflow-hidden z-30 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-2 bg-indigo-50/80 border-b border-indigo-100 flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <input
            type="text"
            autoFocus
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
            placeholder={`Escalar militar em ${slot.fn}...`}
            className="w-full bg-white border border-indigo-200 rounded-md px-2 py-1 text-[10px] font-bold text-slate-800 outline-none focus:border-indigo-400"
          />
          <button
            type="button"
            onClick={() => { setPickerSlotId(null); setPickerSearch(""); }}
            className="p-1 rounded hover:bg-indigo-100 text-slate-500 cursor-pointer"
            title="Fechar seletor"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="max-h-52 overflow-y-auto p-1.5 space-y-1">
          {qualified.length > 0 && (
            <>
              <div className="px-2 py-0.5 text-[8.5px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 rounded">
                Habilitados para {slot.fn} ({qualified.length})
              </div>
              {qualified.map((m) => renderCandidateRow(m, true))}
            </>
          )}
          {others.length > 0 && (
            <>
              <div className="px-2 py-0.5 text-[8.5px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 rounded mt-1">
                Escalar Voluntariamente • Outros da Ala ({others.length})
              </div>
              {others.map((m) => renderCandidateRow(m, false))}
            </>
          )}
          {qualified.length === 0 && others.length === 0 && (
            <div className="py-4 text-center text-[10px] font-bold text-slate-400 uppercase">
              Nenhum militar encontrado
            </div>
          )}
        </div>
      </div>
    );
  };

  // Renderiza o chip de militar ocupando uma vaga
  const renderOccupant = (occ: Occupant, slot: ModalSlot) => {
    const m = rosterMap.get(occ.rg)?.militar;
    const isPref = isPreferredAssignment(predefinicoes, occ.rg, slot.fn, slot.genericName);
    const isPickerOpen = pickerSlotId === slot.slotId;

    return (
      <div key={slot.slotId} className="min-w-0">
        <motion.div
          layout
          initial={occ.status === "novo" ? { scale: 0.92, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          onClick={() => {
            if (selectedPoolRg && selectedPoolRg !== occ.rg) {
              assignToSlot(slot, selectedPoolRg);
            }
          }}
          className={cn(
            "group/chip flex items-center gap-1.5 rounded-md border px-1.5 py-1 min-w-0 transition-all",
            isPref
              ? "bg-amber-50/95 border-amber-400 text-amber-950 ring-1 ring-amber-300/60"
              : occ.status === "novo"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-slate-50 border-slate-200 text-slate-700",
            selectedPoolRg && selectedPoolRg !== occ.rg && "cursor-pointer hover:ring-2 hover:ring-indigo-400"
          )}
          title={`${parseRank(m?.rank)} ${nameOf(occ.rg)} • RG ${occ.rg}${
            isPref ? " • ★ Escalado conforme preferência do escalante" : ""
          }${occ.status === "novo" ? " • NOVO" : " • Já escalado"}`}
        >
          {m?.rank && <RankInsignia rankStr={m.rank} className="w-3.5 h-3.5 shrink-0" />}
          <span className="font-black uppercase truncate text-[11px]">{nameOf(occ.rg)}</span>
          {isPref && (
            <span
              className="inline-flex items-center shrink-0"
              title="★ Escalado conforme preferência configurada pelo escalante"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 drop-shadow-2xs" />
            </span>
          )}
          <div className="ml-auto flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (selectedPoolRg) {
                  assignToSlot(slot, selectedPoolRg);
                } else {
                  setPickerSlotId(isPickerOpen ? null : slot.slotId);
                  setPickerSearch("");
                }
              }}
              className="p-0.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer"
              title={selectedPoolRg ? `Substituir por ${nameOf(selectedPoolRg)}` : "Trocar militar desta vaga"}
            >
              <ArrowLeftRight className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeFromSlot(slot);
              }}
              className="p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
              title="Retirar militar desta vaga (vai para o Campo de Militares sem alterar as outras vagas)"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
        {isPickerOpen && renderSlotPicker(slot)}
      </div>
    );
  };

  // Renderiza uma vaga vazia (clicável para escalar voluntariamente qualquer militar!)
  const renderEmpty = (slot: ModalSlot, excluded: boolean) => {
    const isPickerOpen = pickerSlotId === slot.slotId;
    return (
      <div key={slot.slotId} className="min-w-0">
        <button
          type="button"
          onClick={() => {
            if (selectedPoolRg) {
              assignToSlot(slot, selectedPoolRg);
            } else {
              setPickerSlotId(isPickerOpen ? null : slot.slotId);
              setPickerSearch("");
            }
          }}
          className={cn(
            "w-full flex items-center justify-between gap-1.5 rounded-md border border-dashed px-2 py-1 text-[10px] font-black uppercase tracking-wide transition-all cursor-pointer",
            selectedPoolRg
              ? "border-indigo-400 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200 animate-pulse"
              : isPickerOpen
              ? "border-indigo-400 bg-indigo-50 text-indigo-700"
              : excluded
              ? "border-slate-200 text-slate-400 bg-slate-50/50 hover:border-indigo-300 hover:text-indigo-600"
              : "border-amber-300 text-amber-700 bg-amber-50/60 hover:bg-amber-100/70 hover:border-amber-400"
          )}
          title="Clique para escolher e escalar voluntariamente um militar nesta vaga"
        >
          <span className="flex items-center gap-1 truncate">
            {selectedPoolRg ? (
              <>
                <UserPlus className="w-3 h-3 shrink-0" />
                <span className="truncate">Escalar {nameOf(selectedPoolRg)}</span>
              </>
            ) : excluded ? (
              <>
                <Ban className="w-3 h-3 shrink-0" />
                <span>Fora do sorteio</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>Vago</span>
              </>
            )}
          </span>
          <span className="inline-flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.2 rounded bg-white/80 text-indigo-600 border border-indigo-200/70 shrink-0">
            <Plus className="w-2.5 h-2.5" /> Escalar
          </span>
        </button>
        {isPickerOpen && renderSlotPicker(slot)}
      </div>
    );
  };

  const theme = isVtr
    ? { grad: "from-orange-600 via-red-600 to-rose-700", Icon: Truck, title: "Sortear Funções de Viatura", sub: "Guarnições: condutores, chefes, auxiliares e marítimos" }
    : { grad: "from-indigo-600 via-violet-600 to-purple-700", Icon: ClipboardList, title: "Sortear Funções Administrativas", sub: "Quartel: adjunto, sgt dia, cmt guarda, comunicante e encargos de rotina" };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[94vh]"
      >
        {/* ── HEADER ── */}
        <div className={cn("relative px-5 py-3.5 bg-gradient-to-r text-white shrink-0 overflow-hidden", theme.grad)}>
          <div className="absolute -right-8 -top-10 opacity-10 pointer-events-none">
            <theme.Icon className="w-48 h-48" />
          </div>
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shadow-inner">
                <Shuffle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black uppercase tracking-tight leading-tight">{theme.title}</h2>
                <p className="text-[10px] font-bold text-white/75 uppercase tracking-widest">{theme.sub}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/15 transition-colors cursor-pointer" title="Fechar (Esc)">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold text-white/85">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              A função <span className="px-1.5 py-0.5 rounded bg-white/15 font-black">SENTINELA</span> não participa deste sorteio.
            </span>
            <span className="flex items-center gap-1 text-amber-200">
              <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300 shrink-0" />
              Estrela indica militar escalado pela preferência configurada.
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {/* ── COLUNA ESQUERDA: CONFIGURAÇÃO ── */}
          <aside className="lg:w-[330px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/70 overflow-y-auto max-h-[34vh] lg:max-h-none">
            <div className="p-4 space-y-5">
              {/* Predefinição */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">1. Predefinição</h3>
                  {isCustom && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 border border-violet-200">Personalizado</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {SORTEIO_PRESETS[scope].map((p) => {
                    const active = presetId === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => choosePreset(p.id)}
                        className={cn(
                          "w-full text-left rounded-xl border px-3 py-2 transition-all cursor-pointer",
                          active
                            ? isVtr ? "bg-orange-50 border-orange-400 ring-2 ring-orange-200" : "bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn("w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0", active ? (isVtr ? "border-orange-500" : "border-indigo-500") : "border-slate-300")}>
                            {active && <span className={cn("w-1.5 h-1.5 rounded-full", isVtr ? "bg-orange-500" : "bg-indigo-500")} />}
                          </span>
                          <span className="text-[11.5px] font-black uppercase tracking-wide text-slate-800">{p.label}</span>
                          {active && isCustom && <span className="text-[9px] font-bold text-violet-600">(ajustado)</span>}
                        </div>
                        <p className="text-[10px] font-medium text-slate-500 leading-snug mt-1 pl-[22px]">{p.description}</p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Ajustes */}
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">2. Ajustes</h3>
                <div className="bg-white rounded-xl border border-slate-200 px-3 py-1.5 divide-y divide-slate-100">
                  <div className="py-2">
                    <span className="block text-[11px] font-black uppercase tracking-wide text-slate-700 mb-1.5">Modo</span>
                    <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 rounded-lg">
                      {([
                        { id: "preencher", label: "Preencher vagas", Icon: Sparkles },
                        { id: "refazer", label: "Refazer do zero", Icon: RotateCcw },
                      ] as const).map(({ id, label, Icon }) => (
                        <button
                          key={id}
                          onClick={() => updateOption("modo", id)}
                          className={cn(
                            "flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wide transition-all cursor-pointer",
                            options.modo === id ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                          )}
                        >
                          <Icon className="w-3 h-3" /> {label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] font-medium text-slate-500 mt-1.5 leading-snug">
                      {options.modo === "preencher" ? "Mantém quem já está escalado e só completa o que falta." : "Remove as funções deste grupo e monta tudo novamente."}
                    </p>
                  </div>

                  <Toggle
                    checked={options.respeitarPredefinicoes}
                    onChange={(v) => updateOption("respeitarPredefinicoes", v)}
                    label="Pré-definições fixas ★"
                    hint="Aplica primeiro as funções preferenciais (ganham estrela ★)."
                    extra={
                      <button type="button" onClick={(e) => { e.preventDefault(); onOpenPredefinicoes(); }} className="text-[9px] font-black text-indigo-600 hover:underline normal-case tracking-normal cursor-pointer">
                        configurar ★
                      </button>
                    }
                  />
                  <Toggle
                    checked={options.hierarquia}
                    onChange={(v) => updateOption("hierarquia", v)}
                    label="Respeitar hierarquia"
                    hint={options.hierarquia ? "Chefias para os mais antigos; guarnição com os mais modernos." : "Rodízio: escolhe por menor carga e sorteia entre empates."}
                  />
                  <Toggle
                    checked={options.permitirAcumulo}
                    onChange={(v) => updateOption("permitirAcumulo", v)}
                    label="Permitir acúmulo"
                    hint={isVtr ? "Militar com função principal (ex.: Adjunto) pode entrar na viatura." : "Militar já em viatura ou comando pode assumir outra função principal."}
                  />
                  {!isVtr && (
                    <>
                      <Toggle
                        checked={options.pouparAdjunto}
                        onChange={(v) => updateOption("pouparAdjunto", v)}
                        label="Poupar o Adjunto"
                        hint="Adjunto não recebe faxina, rancho, depósito etc."
                      />
                      <div className="py-2">
                        <span className="block text-[11px] font-black uppercase tracking-wide text-slate-700 mb-1.5">Encargos de rotina por militar</span>
                        <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-100 rounded-lg">
                          {[1, 2, 3, 0].map((n) => (
                            <button
                              key={n}
                              onClick={() => updateOption("maxEncargos", n)}
                              className={cn("py-1.5 rounded-md text-[10.5px] font-black transition-all cursor-pointer", options.maxEncargos === n ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700")}
                            >
                              {n === 0 ? "∞" : `máx ${n}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </section>

              {/* Funções incluídas */}
              <section>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    3. Funções Ativas no Sorteio
                  </h3>
                  <div className="flex gap-2 text-[9.5px] font-black uppercase">
                    <button
                      type="button"
                      className="text-indigo-600 hover:underline cursor-pointer"
                      onClick={() => handleSetAllFns(true)}
                      title={isVtr ? "Ativar todas as funções nas viaturas ativas" : "Ativar todas as funções administrativas no sistema"}
                    >
                      Todas
                    </button>
                    <button
                      type="button"
                      className="text-slate-500 hover:underline cursor-pointer"
                      onClick={() => handleSetAllFns(false)}
                      title={isVtr ? "Desativar todas as funções nas viaturas ativas" : "Desativar todas as funções administrativas no sistema"}
                    >
                      Nenhuma
                    </button>
                  </div>
                </div>
                <p className="text-[9.5px] font-medium text-slate-500 mb-2 leading-snug">
                  {isVtr
                    ? "Sincronizado com a Distribuição de Viaturas e Funções Operacionais."
                    : "Sincronizado com a seção de Funções Administrativas (inativas não apitam déficit)."}
                </p>
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                  {scopeReqs.length === 0 && (
                    <p className="p-3 text-[10px] font-bold text-slate-400 uppercase text-center">Nenhuma função configurada</p>
                  )}
                  {scopeReqs.map((r) => {
                    const norm = normalizeFnName(r.name);
                    const isSystemActive = r.active !== false && r.req > 0;
                    const included = isSystemActive && !excludedSet.has(norm);
                    const before = Object.values(selectedFunctions).flat().filter((f) => normalizeFnName(f) === norm).length;
                    const after = allSlots.filter((s) => normalizeFnName(s.fn) === norm && slotAssignments[s.slotId]).length;
                    const full = isSystemActive && after >= r.req;
                    const vtrs = isVtr ? (isSystemActive ? r.vtrsActive : r.vtrsAll) || [] : [];
                    return (
                      <label
                        key={r.name}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-slate-50 transition-colors",
                          !included && "opacity-55 bg-slate-50/60"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={included}
                          onChange={() => toggleFn(r.name)}
                          className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className={cn("block text-[10.5px] font-black uppercase tracking-wide text-slate-700 truncate", !included && "line-through decoration-slate-300 text-slate-500")}>
                            {r.name}
                          </span>
                          {vtrs.length > 0 && (
                            <span className="block text-[8.5px] font-bold text-slate-400 truncate">
                              {vtrs.join(", ")}
                            </span>
                          )}
                        </div>
                        {included ? (
                          <>
                            <span className="text-[9.5px] font-mono font-bold text-slate-400" title="Antes do sorteio">
                              {Math.min(before, r.req)}/{r.req}
                            </span>
                            <span className="text-slate-300 text-[9px]">→</span>
                            <span
                              className={cn(
                                "text-[9.5px] font-mono font-black px-1 rounded",
                                full ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"
                              )}
                              title="Na prévia atual"
                            >
                              {Math.min(after, r.req)}/{r.req}
                            </span>
                          </>
                        ) : (
                          <span
                            className="text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200 shrink-0"
                            title={`Função inativa (capacidade padrão: ${r.baseReq ?? 1}) — marque para ativar`}
                          >
                            Inativa ({r.baseReq ?? 1})
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </section>
            </div>
          </aside>

          {/* ── COLUNA DIREITA: CAMPO DE MILITARES + PRÉVIA INTERATIVA ── */}
          <main className="flex-1 min-w-0 flex flex-col min-h-0">
            {/* Topo: Indicadores + Campo de Militares */}
            <div className="p-3.5 pb-2.5 border-b border-slate-200 shrink-0 space-y-2.5 bg-white">
              {/* Indicadores compactos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "Vagas no grupo", value: stats.totalVagas, cls: "text-slate-800", bg: "bg-slate-50 border-slate-200" },
                  { label: "Já preenchidas", value: stats.jaPreenchidas, cls: "text-slate-600", bg: "bg-slate-50 border-slate-200" },
                  { label: "Novas na prévia", value: totalNovas, cls: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", sub: militaresEnvolvidos ? `${militaresEnvolvidos} militar(es)` : undefined },
                  { label: "Vagas em aberto", value: totalSemEfetivo, cls: totalSemEfetivo ? "text-amber-700" : "text-slate-400", bg: totalSemEfetivo ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200" },
                ].map((k) => (
                  <div key={k.label} className={cn("rounded-xl border px-3 py-1.5", k.bg)}>
                    <div className="text-[8.5px] font-black uppercase tracking-widest text-slate-500">{k.label}</div>
                    <div className="flex items-baseline gap-1.5">
                      <span className={cn("text-lg font-black tabular-nums", k.cls)}>{k.value}</span>
                      {k.sub && <span className="text-[9px] font-bold text-emerald-600">{k.sub}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── CAMPO DE MILITARES (Retirados & Disponíveis para Escalação Voluntária) ── */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      Campo de Militares:
                    </span>
                    {([
                      { id: "disponiveis", label: `Disponíveis / Retirados (${livresCount + retiradosCount})` },
                      { id: "retirados", label: `Retirados (${retiradosCount})`, highlight: retiradosCount > 0 },
                      { id: "todos", label: `Todos da Ala (${roster.length})` },
                    ] as const).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPoolFilter(tab.id)}
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wide transition-all cursor-pointer border",
                          poolFilter === tab.id
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                            : "highlight" in tab && tab.highlight
                            ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={poolSearch}
                        onChange={(e) => setPoolSearch(e.target.value)}
                        placeholder="Filtrar militar..."
                        className="bg-white border border-slate-200 rounded-md pl-6 pr-2 py-0.5 text-[10px] font-bold text-slate-700 outline-none focus:border-indigo-400 w-36"
                      />
                    </div>
                  </div>
                </div>

                {selectedPoolRg && (
                  <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-between gap-2 shadow-xs">
                    <span className="flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Escalando voluntariamente: <strong className="font-black uppercase underline">{nameOf(selectedPoolRg)}</strong> — clique em qualquer vaga abaixo para colocá-lo lá!
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedPoolRg(null)}
                      className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-[9px] font-black uppercase cursor-pointer shrink-0"
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-h-20">
                  {poolMilitars.length === 0 ? (
                    <span className="text-[10px] font-bold text-slate-400 py-1 px-2">
                      {poolFilter === "retirados"
                        ? "Nenhum militar foi retirado de vaga ainda. Ao clicar no ✕ de uma vaga, o militar vem para cá sem bagunçar o restante."
                        : "Todos os militares da Ala já estão alocados (mude para 'Todos da Ala' para ver todos)."}
                    </span>
                  ) : (
                    poolMilitars.map((m) => {
                      const isSelected = selectedPoolRg === m.rg;
                      const removedFrom = retiradosInfo[m.rg];
                      const currentRoles = scopeRolesByRg.get(m.rg) || [];
                      const scopePrefs = getScopePrefsForMilitar(m.rg);
                      return (
                        <button
                          key={m.rg}
                          type="button"
                          onClick={() => setSelectedPoolRg(isSelected ? null : m.rg)}
                          className={cn(
                            "shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-left transition-all cursor-pointer",
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-300 shadow-xs"
                              : removedFrom
                              ? "bg-rose-50/90 hover:bg-rose-100 border-rose-300 text-rose-950"
                              : currentRoles.length === 0
                              ? "bg-white hover:bg-emerald-50 border-slate-200 hover:border-emerald-300 text-slate-800"
                              : "bg-slate-100/80 hover:bg-slate-200/70 border-slate-200 text-slate-600"
                          )}
                          title={
                            removedFrom
                              ? `Retirado de ${removedFrom}. Clique para selecioná-lo e escalar em qualquer vaga.`
                              : scopePrefs.length > 0
                              ? `★ Preferência configurada: ${scopePrefs.join(", ")}. Clique para escalar manualmente.`
                              : "Clique para selecionar este militar e escalá-lo em qualquer vaga abaixo."
                          }
                        >
                          <RankInsignia rankStr={m.militar?.rank} className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[9px] font-bold uppercase opacity-75">{parseRank(m.militar?.rank)}</span>
                          <span className="text-[10.5px] font-black uppercase">{nameOf(m.rg)}</span>
                          {scopePrefs.length > 0 && (
                            <span title={`★ Preferência: ${scopePrefs.join(", ")}`}>
                              <Star className={cn("w-3 h-3 fill-amber-400", isSelected ? "text-amber-200" : "text-amber-500")} />
                            </span>
                          )}
                          {removedFrom ? (
                            <span className={cn("text-[8px] font-black uppercase px-1 py-0.2 rounded", isSelected ? "bg-white/20 text-white" : "bg-rose-200/80 text-rose-800")}>
                              Retirado
                            </span>
                          ) : currentRoles.length === 0 ? (
                            <span className={cn("text-[8px] font-black uppercase px-1 py-0.2 rounded", isSelected ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700")}>
                              Livre
                            </span>
                          ) : (
                            <span className={cn("text-[8px] font-bold uppercase px-1 py-0.2 rounded", isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600")}>
                              {currentRoles.length}x
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Abas de visualização + Legenda */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="inline-flex p-0.5 bg-slate-100 rounded-lg">
                    {([
                      { id: "estrutura", label: isVtr ? "Por viatura" : "Por função", Icon: LayoutGrid },
                      { id: "militar", label: "Por militar", Icon: Users },
                    ] as const).map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        onClick={() => setView(id)}
                        className={cn("flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wide transition-all cursor-pointer", view === id ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700")}
                      >
                        <Icon className="w-3 h-3" /> {label}
                      </button>
                    ))}
                  </div>
                  {totalSemEfetivo > 0 && !options.permitirAcumulo && (
                    <button onClick={() => updateOption("permitirAcumulo", true)} className="text-[9.5px] font-black uppercase text-indigo-600 hover:underline cursor-pointer">
                      Faltou efetivo? Tentar com acúmulo →
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[9.5px] font-bold text-slate-500">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-500" /> Preferência
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-300" /> Novo
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-slate-100 border border-slate-300" /> Mantido
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-50 border border-dashed border-amber-400" /> Vago (clique p/ escalar)
                  </span>
                </div>
              </div>
            </div>

            {/* Conteúdo da prévia */}
            <div className={cn("flex-1 overflow-y-auto p-4 bg-slate-50/50 transition-opacity", rolling && "opacity-40")}>
              {view === "estrutura" && isVtr && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {vehicleCards.map(({ id, vtrName, slots }) => (
                    <div key={id} className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-visible">
                      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 text-white rounded-t-xl">
                        <span className="flex items-center gap-2 text-[11.5px] font-black uppercase tracking-wider">
                          <Truck className="w-3.5 h-3.5 text-orange-400" /> {vtrName}
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">
                          {slots.filter((s) => s.occ).length}/{slots.length}
                        </span>
                      </div>
                      <div className="p-2 space-y-1.5">
                        {slots.map((s) => (
                          <div key={s.slotId} className="grid grid-cols-[86px_1fr] items-start gap-2">
                            <div className="min-w-0 pt-1">
                              <div className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 leading-none">{s.slotLabel}</div>
                              <div className="text-[9px] font-bold uppercase text-slate-600 truncate" title={s.fn}>{s.fn}</div>
                            </div>
                            {s.occ ? renderOccupant(s.occ, s) : renderEmpty(s, s.excluded)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {vehicleCards.length === 0 && (
                    <p className="col-span-full text-center text-[11px] font-black uppercase text-slate-400 py-10">Nenhuma viatura ativa nesta data</p>
                  )}
                </div>
              )}

              {view === "estrutura" && !isVtr && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {adminCards.map(({ req: r, slots }) => {
                    const norm = normalizeFnName(r.name);
                    const isSystemActive = r.active !== false && r.req > 0;
                    const excluded = !isSystemActive || excludedSet.has(norm);
                    const filledCount = slots.filter((s) => s.occ).length;
                    const vagos = r.req - filledCount;
                    return (
                      <div
                        key={r.name}
                        className={cn(
                          "bg-white rounded-xl border shadow-2xs overflow-visible",
                          excluded
                            ? "border-slate-200 opacity-65 bg-slate-50/50"
                            : vagos > 0
                            ? "border-amber-200"
                            : "border-slate-200"
                        )}
                      >
                        <div className={cn(
                          "flex items-center justify-between px-3 py-1.5 border-b rounded-t-xl gap-2",
                          excluded ? "bg-slate-100 border-slate-200" : "bg-indigo-50 border-indigo-100"
                        )}>
                          <span className={cn(
                            "text-[10.5px] font-black uppercase tracking-wider truncate",
                            excluded ? "text-slate-500 line-through decoration-slate-300" : "text-indigo-900"
                          )}>
                            {r.name}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isSystemActive && (
                              <span className={cn("text-[9.5px] font-mono font-black", vagos > 0 ? "text-amber-600" : "text-emerald-600")}>
                                {filledCount}/{r.req}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleFn(r.name)}
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border transition-colors cursor-pointer",
                                !excluded
                                  ? "bg-emerald-100/80 text-emerald-800 border-emerald-300 hover:bg-rose-100 hover:text-rose-800 hover:border-rose-300"
                                  : "bg-slate-200/80 text-slate-600 border-slate-300 hover:bg-indigo-100 hover:text-indigo-800 hover:border-indigo-300"
                              )}
                              title={!excluded ? "Clique para desativar esta função no sistema e no sorteio" : "Clique para ativar esta função no sistema e no sorteio"}
                            >
                              {!excluded ? "Ativa" : "Inativa"}
                            </button>
                          </div>
                        </div>
                        <div className="p-2 space-y-1.5">
                          {isSystemActive ? (
                            slots.map((s) => (s.occ ? renderOccupant(s.occ, s) : renderEmpty(s, s.excluded)))
                          ) : (
                            <div className="flex items-center justify-between gap-2 rounded-md border border-dashed border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[9.5px] font-bold text-slate-400 uppercase">
                              <span className="flex items-center gap-1 truncate">
                                <Ban className="w-3 h-3 shrink-0" />
                                <span>Inativa ({r.baseReq ?? 1} vaga{(r.baseReq ?? 1) > 1 ? "s" : ""})</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleFn(r.name)}
                                className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[8.5px] font-black uppercase tracking-wider cursor-pointer shrink-0"
                              >
                                Ativar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {view === "militar" && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                  {roster.map((m) => {
                    const fns = effectiveSelected[m.rg] || [];
                    const scopeSlotsForMilitar = scopeRolesByRg.get(m.rg) || [];
                    const scopePrefs = getScopePrefsForMilitar(m.rg);
                    const isAddingFn = addFnForRg === m.rg;
                    return (
                      <div key={m.rg} className="px-3 py-2 hover:bg-slate-50/70">
                        <div className="flex items-center gap-3">
                          <RankInsignia rankStr={m.militar?.rank} className="w-5 h-5 shrink-0" />
                          <div className="w-44 shrink-0 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-[8.5px] font-bold uppercase tracking-widest text-slate-400 leading-none">{parseRank(m.militar?.rank)}</span>
                              {scopePrefs.length > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[8px] font-black text-amber-700 bg-amber-100 px-1 rounded" title={`Preferência configurada: ${scopePrefs.join(", ")}`}>
                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" /> {scopePrefs.join(", ")}
                                </span>
                              )}
                            </div>
                            <div className="text-[12px] font-black uppercase text-slate-800 truncate">{nameOf(m.rg)}</div>
                          </div>
                          <div className="flex-1 flex flex-wrap items-center gap-1 min-w-0">
                            {scopeSlotsForMilitar.map((slotItem) => {
                              const isNew = slotItem.status === "novo";
                              const isPref = isPreferredAssignment(predefinicoes, m.rg, slotItem.fn, slotItem.genericName);
                              const modalSlot = allSlots.find((x) => x.slotId === slotItem.slotId);
                              return (
                                <span
                                  key={slotItem.slotId}
                                  className={cn(
                                    "flex items-center gap-1 text-[9.5px] font-black uppercase px-1.5 py-0.5 rounded border",
                                    isPref
                                      ? "bg-amber-50 border-amber-400 text-amber-900"
                                      : isNew
                                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                      : "bg-slate-50 border-slate-200 text-slate-600"
                                  )}
                                >
                                  {isPref ? (
                                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                                  ) : (
                                    isNew && <Sparkles className="w-2.5 h-2.5" />
                                  )}
                                  {slotItem.fn}
                                  {modalSlot && (
                                    <button
                                      type="button"
                                      onClick={() => removeFromSlot(modalSlot)}
                                      className="hover:text-rose-600 cursor-pointer ml-0.5"
                                      title="Retirar desta função (sem alterar os demais militares)"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </span>
                              );
                            })}
                            {/* Outras funções fora deste escopo */}
                            {fns
                              .filter((f) => !scopeFnNormSet.has(normalizeFnName(f)))
                              .map((f) => {
                                const isSent = isSentinelaFn(f);
                                const isPref = isPreferredAssignment(predefinicoes, m.rg, f);
                                return (
                                  <span
                                    key={`out-${f}`}
                                    className={cn(
                                      "flex items-center gap-1 text-[9.5px] font-black uppercase px-1.5 py-0.5 rounded border",
                                      isSent ? "bg-sky-50 border-sky-200 text-sky-700" : "bg-slate-50 border-slate-200 text-slate-500"
                                    )}
                                  >
                                    {isPref && <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />}
                                    {f}
                                  </span>
                                );
                              })}
                            {fns.length === 0 && (
                              <span className="text-[9.5px] font-bold uppercase text-slate-300 italic">sem função</span>
                            )}
                            <button
                              type="button"
                              onClick={() => setAddFnForRg(isAddingFn ? null : m.rg)}
                              className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase px-1.5 py-0.5 rounded border border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                              title="Escalar voluntariamente este militar em uma vaga"
                            >
                              <Plus className="w-2.5 h-2.5" /> Escalar em vaga
                            </button>
                          </div>
                        </div>

                        {isAddingFn && (
                          <div className="mt-2 pl-8 flex flex-wrap items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase text-slate-400">Escolher vaga para {nameOf(m.rg)}:</span>
                            {allSlots.map((s) => {
                              const occ = slotAssignments[s.slotId];
                              const isQual = isMilitarAllowedForFn(m.allowed, s.fn, s.genericName);
                              return (
                                <button
                                  key={s.slotId}
                                  type="button"
                                  onClick={() => {
                                    assignToSlot(s, m.rg);
                                    setAddFnForRg(null);
                                  }}
                                  className={cn(
                                    "text-[9px] font-black uppercase px-2 py-0.5 rounded border cursor-pointer transition-colors",
                                    !occ
                                      ? isQual
                                        ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                                        : "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
                                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                  )}
                                  title={occ ? `Ocupada por ${nameOf(occ.rg)} (clique para substituir)` : "Vaga aberta"}
                                >
                                  {s.vtrName ? `${s.vtrName} • ${s.slotLabel}` : s.fn} {!occ ? "(VAGO)" : `(${nameOf(occ.rg)})`}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>

        {/* ── FOOTER ── */}
        <div className="px-4 py-3 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={rerollAll}
              className="h-9 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[10.5px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              title="Sorteia uma nova combinação completa"
            >
              <motion.span animate={{ rotate: rolling ? 360 : 0 }} transition={{ duration: 0.35 }} className="inline-flex">
                <Dices className="w-4 h-4" />
              </motion.span>
              Sortear novamente
            </button>
            {totalSemEfetivo > 0 && (
              <button
                onClick={fillOnlyEmptySlots}
                className="h-9 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                title="Preenche automaticamente apenas as vagas que estão como VAGO, mantendo intactos os demais militares"
              >
                <Sparkles className="w-3.5 h-3.5" /> Preencher só vagas abertas ({totalSemEfetivo})
              </button>
            )}
            <button
              onClick={clearAllPreviewSlots}
              className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
              title="Esvazia todas as vagas desta prévia para você escalar manualmente do zero"
            >
              <Eraser className="w-3.5 h-3.5" /> Esvaziar vagas
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="h-9 px-5 rounded-xl text-[10.5px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer">
              Cancelar
            </button>
            <button
              onClick={handleOk}
              className={cn(
                "h-9 px-6 rounded-xl text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer",
                "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400"
              )}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              OK{totalNovas > 0 ? ` • Aplicar ${totalNovas}` : " • Confirmar"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
