/**
 * Motor de Sorteio de Funções da Escala 24h.
 *
 * Função pura (sem efeitos colaterais) usada tanto para a PRÉVIA exibida no
 * modal de sorteio quanto para a aplicação final — garantindo que o que o
 * escalante vê é exatamente o que será aplicado.
 *
 * O sorteio é dividido em dois escopos independentes:
 *  - 'viaturas'        → funções de guarnição (condutor, chefe, auxiliares, mestres, marinheiros…)
 *  - 'administrativas' → funções de quartel (adjunto, sgt dia, cmt guarda, comunicante, faxina…)
 *
 * A função SENTINELA nunca participa de nenhum dos dois sorteios
 * (é gerida exclusivamente na Seção de Sentinelas).
 */
import { sortAllBySeniority } from "./rankUtils";

export type SorteioScope = "viaturas" | "administrativas";

export interface SorteioRequirement {
  name: string;
  genericName: string;
  req: number;
  category: string;
  /** Quantidade base configurada quando a função está ativa */
  baseReq?: number;
  /** Se a função está ativa no sistema (se false, req = 0, não gera déficit e não entra no sorteio) */
  active?: boolean;
  /** Viaturas ativas que demandam esta função operacional */
  vtrsActive?: string[];
  /** Todas as viaturas da frota que possuem vaga para esta função operacional */
  vtrsAll?: string[];
}

export interface SorteioMilitar {
  rg: string;
  /** Militar efetivo no dia (já considerando permutas) */
  militar: any;
  /** Funções que o militar está habilitado a exercer */
  allowed: string[];
}

export interface SorteioOptions {
  /** 'preencher' mantém o que já está escalado; 'refazer' limpa o escopo e sorteia tudo de novo */
  modo: "preencher" | "refazer";
  /** Aplicar primeiro as pré-definições fixas (engrenagem) */
  respeitarPredefinicoes: boolean;
  /** Chefias/comando pelo militar mais antigo (hierarquia). Se desligado: rodízio equilibrado */
  hierarquia: boolean;
  /** Permite que um militar que já tem função principal assuma outra função principal */
  permitirAcumulo: boolean;
  /** (Administrativas) Máximo de encargos de rotina (faxina, rancho…) por militar. 0 = sem limite */
  maxEncargos: number;
  /** (Administrativas) Não dar encargos de rotina para quem é Adjunto */
  pouparAdjunto: boolean;
  /** Funções (nome normalizado) que ficam FORA deste sorteio */
  funcoesExcluidas: string[];
}

export interface SorteioAssignment {
  rg: string;
  fn: string;
}

export interface SorteioResult {
  newSelected: Record<string, string[]>;
  /** Atribuições criadas por este sorteio */
  novas: SorteioAssignment[];
  /** Atribuições removidas (modo 'refazer') */
  removidas: SorteioAssignment[];
  /** Vagas que ficaram sem militar habilitado */
  vagasSemEfetivo: { fn: string; count: number }[];
  /** Total de vagas do escopo (já descontando as funções excluídas) */
  totalVagas: number;
  /** Vagas que já estavam preenchidas antes do sorteio */
  jaPreenchidas: number;
}

export const normalizeFnName = (s: string) => {
  if (!s) return "";
  return s.replace(/\s*\/\s*/g, "/").replace(/\s+/g, " ").trim().toUpperCase();
};

export const isSentinelaFn = (fn: string) => normalizeFnName(fn) === "SENTINELA";

/** Requisito pertence a qual escopo? */
export const getRequirementScope = (r: SorteioRequirement): SorteioScope =>
  r.category === "admin" ? "administrativas" : "viaturas";

/** Requisitos de um escopo, SEMPRE sem a Sentinela */
export const getScopeRequirements = (reqs: SorteioRequirement[], scope: SorteioScope) =>
  reqs.filter(
    (r) =>
      getRequirementScope(r) === scope &&
      !isSentinelaFn(r.name) &&
      !isSentinelaFn(r.genericName)
  );

const isEquivalentFn = (a: string, b: string) =>
  a === b ||
  (a === "ENFERMEIRO" && b === "AUXILIAR ASE") ||
  (a === "AUXILIAR ASE" && b === "ENFERMEIRO");

/**
 * Verifica se a função atribuída ao militar corresponde a uma preferência
 * fixa configurada pelo escalante (predefinicoes).
 */
export const isPreferredAssignment = (
  predefinicoes: Record<string, string[]> | undefined,
  rg: string,
  fnName: string,
  genericName?: string
): boolean => {
  if (!predefinicoes || !rg) return false;
  const prefs = predefinicoes[rg];
  if (!prefs || prefs.length === 0) return false;
  const fNorm = normalizeFnName(fnName);
  const gNorm = genericName ? normalizeFnName(genericName) : "";
  return prefs.some((p) => {
    const pNorm = normalizeFnName(p);
    return (
      pNorm !== "" &&
      (isEquivalentFn(pNorm, fNorm) ||
        (gNorm !== "" && isEquivalentFn(pNorm, gNorm)) ||
        fNorm.includes(pNorm) ||
        pNorm.includes(fNorm))
    );
  });
};

/** Verifica se o militar possui habilitação no mostruário para a vaga */
export const isMilitarAllowedForFn = (
  allowed: string[] | undefined,
  slotName: string,
  genericName: string = slotName
): boolean => {
  if (!allowed || allowed.length === 0) return false;
  const sNorm = normalizeFnName(slotName);
  const gNorm = normalizeFnName(genericName);
  return allowed.some((a) => {
    const aNorm = normalizeFnName(a);
    return (
      isEquivalentFn(aNorm, sNorm) ||
      isEquivalentFn(aNorm, gNorm) ||
      sNorm.includes(aNorm) ||
      aNorm.includes(sNorm)
    );
  });
};

// ───────────────────────── Classificação funcional ─────────────────────────

/** Chefias & Comando: Adjunto, Chefe ABT/ABSL/ARC/GUA, CMT Guarda, SGT de Dia */
export const isLeadershipRole = (name: string, generic: string, category: string) => {
  const n = (name + " " + generic).toUpperCase();
  return (
    category === "chefe" ||
    category === "chefe_maritimo" ||
    n.includes("CHEFE") ||
    n.includes("ADJUNTO") ||
    n.includes("SGT DIA") ||
    n.includes("CMT GUARDA")
  );
};

/** Condutores & Motoristas */
export const isDriverRole = (name: string, generic: string, category: string) => {
  const n = (name + " " + generic).toUpperCase();
  return (
    category === "condutor" ||
    category === "condutor_maritimo" ||
    n.includes("CONDUTOR") ||
    n.includes("MESTRE") ||
    n.includes("ENCARREGADO DE MOTORISTA")
  );
};

/** Especialistas técnicos */
export const isSpecialistRole = (name: string, generic: string) => {
  const n = (name + " " + generic).toUpperCase();
  return (
    n.includes("COMUNICANTE") ||
    n.includes("ENFERMEIRO") ||
    n.includes("OPERADOR AMA") ||
    n.includes("GV AMA") ||
    n.includes("ESCALANTE")
  );
};

/** Encargos de rotina do quartel (concomitantes — não tiram ninguém da viatura) */
export const isSecondaryChore = (name: string, generic: string = name) => {
  const n = (name + " " + generic).toUpperCase();
  return (
    n.includes("FAXINA") ||
    n.includes("RANCHO") ||
    n.includes("TOQUE DE FOGO") ||
    n.includes("DEPOSITO") ||
    n.includes("DEPÓSITO") ||
    n.includes("ABASTECEDOR") ||
    n.includes("CB GUARDA") ||
    n.includes("CB DIA")
  );
};

// ───────────────────────── RNG determinístico ─────────────────────────

/** mulberry32 – RNG com semente, para a prévia ser estável e reproduzível */
export const createRng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ───────────────────────── Motor ─────────────────────────

interface Slot {
  name: string;
  genericName: string;
  category: string;
}

export function computeSorteio(params: {
  scope: SorteioScope;
  requirements: SorteioRequirement[];
  roster: SorteioMilitar[];
  selectedFunctions: Record<string, string[]>;
  predefinicoes: Record<string, string[]>;
  options: SorteioOptions;
  /** Pares vetados manualmente na prévia: `${rg}|${FUNÇÃO_NORMALIZADA}` */
  vetos?: Set<string>;
  seed: number;
}): SorteioResult {
  const { scope, requirements, roster, selectedFunctions, predefinicoes, options, seed } = params;
  const vetos = params.vetos || new Set<string>();
  const rng = createRng(seed);

  const excluded = new Set(options.funcoesExcluidas.map(normalizeFnName));
  const scopeReqs = getScopeRequirements(requirements, scope).filter(
    (r) => r.active !== false && r.req > 0 && !excluded.has(normalizeFnName(r.name))
  );
  const scopeFnSet = new Set(scopeReqs.map((r) => normalizeFnName(r.name)));

  // Cópia profunda do estado atual
  const newSelected: Record<string, string[]> = {};
  Object.entries(selectedFunctions || {}).forEach(([rg, fns]) => {
    newSelected[rg] = [...(fns || [])];
  });

  const removidas: SorteioAssignment[] = [];
  const novas: SorteioAssignment[] = [];

  // MODO REFAZER: limpa as funções deste escopo (somente as incluídas no sorteio)
  if (options.modo === "refazer") {
    const rosterRgs = new Set(roster.map((m) => m.rg));
    Object.keys(newSelected).forEach((rg) => {
      if (!rosterRgs.has(rg)) return;
      const keep: string[] = [];
      newSelected[rg].forEach((fn) => {
        if (scopeFnSet.has(normalizeFnName(fn))) removidas.push({ rg, fn });
        else keep.push(fn);
      });
      newSelected[rg] = keep;
    });
  }

  // 1. Vagas em aberto
  const countAssigned = (fnNorm: string) =>
    Object.values(newSelected)
      .flat()
      .filter((f) => normalizeFnName(f) === fnNorm).length;

  let totalVagas = 0;
  let jaPreenchidas = 0;
  const missingSlots: Slot[] = [];
  scopeReqs.forEach((req) => {
    const norm = normalizeFnName(req.name);
    const current = countAssigned(norm);
    totalVagas += req.req;
    jaPreenchidas += Math.min(current, req.req);
    for (let i = 0; i < req.req - current; i++) {
      missingSlots.push({ name: req.name, genericName: req.genericName, category: req.category });
    }
  });

  // Helpers
  const isAllowed = (m: SorteioMilitar, slotName: string, genericName: string) =>
    isMilitarAllowedForFn(m.allowed, slotName, genericName);

  // Sentinela é neutra: não bloqueia nem conta como função principal
  const hasPrimaryRole = (rg: string) =>
    (newSelected[rg] || []).some((r) => !isSecondaryChore(r) && !isSentinelaFn(r));
  const getLoad = (rg: string) => (newSelected[rg] || []).length;
  const hasFn = (rg: string, fn: string) =>
    (newSelected[rg] || []).some((r) => normalizeFnName(r) === normalizeFnName(fn));
  const isVetado = (rg: string, fn: string) => vetos.has(`${rg}|${normalizeFnName(fn)}`);

  const assign = (rg: string, fn: string) => {
    newSelected[rg] = [...(newSelected[rg] || []), fn];
    novas.push({ rg, fn });
  };

  const unfilled: string[] = [];

  // FASE 0: Pré-definições fixas
  if (options.respeitarPredefinicoes) {
    roster.forEach((m) => {
      const prefs = predefinicoes[m.rg] || [];
      prefs.forEach((p) => {
        const pNorm = normalizeFnName(p);
        if (isSentinelaFn(p)) return;
        const idx = missingSlots.findIndex(
          (s) =>
            (isEquivalentFn(normalizeFnName(s.name), pNorm) ||
              isEquivalentFn(normalizeFnName(s.genericName), pNorm)) &&
            isAllowed(m, s.name, s.genericName)
        );
        if (idx === -1) return;
        const slot = missingSlots[idx];
        if (hasFn(m.rg, slot.name) || isVetado(m.rg, slot.name)) return;
        assign(m.rg, slot.name);
        missingSlots.splice(idx, 1);
      });
    });
  }

  type Sorter = (a: SorteioMilitar, b: SorteioMilitar, slot: Slot) => number;

  const fillSlotGroup = (
    slots: Slot[],
    filter: (m: SorteioMilitar, slot: Slot) => boolean,
    sorter: Sorter
  ) => {
    for (const slot of slots) {
      const eligible = roster.filter(
        (m) =>
          isAllowed(m, slot.name, slot.genericName) &&
          !hasFn(m.rg, slot.name) &&
          !isVetado(m.rg, slot.name) &&
          filter(m, slot)
      );
      if (eligible.length === 0) {
        unfilled.push(slot.name);
        continue;
      }
      eligible.sort((a, b) => sorter(a, b, slot));
      const best = eligible[0];
      const tied = eligible.filter((c) => sorter(c, best, slot) === 0);
      const chosen = tied[Math.floor(rng() * tied.length)];
      assign(chosen.rg, slot.name);
    }
  };

  const primaryFilter = (m: SorteioMilitar) => options.permitirAcumulo || !hasPrimaryRole(m.rg);

  const leadershipSorter: Sorter = (a, b) => {
    if (options.hierarquia) {
      const s = sortAllBySeniority(a.militar, b.militar);
      if (s !== 0) return s;
    }
    return getLoad(a.rg) - getLoad(b.rg);
  };
  const crewSorter: Sorter = (a, b) => {
    const d = getLoad(a.rg) - getLoad(b.rg);
    if (d !== 0) return d;
    // Praças mais modernas compondo a guarnição (apenas no modo hierárquico)
    return options.hierarquia ? sortAllBySeniority(b.militar, a.militar) : 0;
  };
  const scarcity = (s: Slot) =>
    roster.filter((m) => isAllowed(m, s.name, s.genericName) && primaryFilter(m)).length;

  if (scope === "viaturas") {
    // FASE 1: Chefias de guarnição
    const lead = missingSlots.filter((s) => isLeadershipRole(s.name, s.genericName, s.category));
    fillSlotGroup(lead, primaryFilter, leadershipSorter);

    // FASE 2: Condutores, mestres e especialistas (vagas mais escassas primeiro)
    const drivers = missingSlots
      .filter(
        (s) =>
          !isLeadershipRole(s.name, s.genericName, s.category) &&
          (isDriverRole(s.name, s.genericName, s.category) || isSpecialistRole(s.name, s.genericName))
      )
      .sort((a, b) => scarcity(a) - scarcity(b));
    fillSlotGroup(drivers, primaryFilter, crewSorter);

    // FASE 3: Auxiliares / marinheiros
    const aux = missingSlots.filter(
      (s) =>
        !isLeadershipRole(s.name, s.genericName, s.category) &&
        !isDriverRole(s.name, s.genericName, s.category) &&
        !isSpecialistRole(s.name, s.genericName)
    );
    fillSlotGroup(aux, primaryFilter, crewSorter);
  } else {
    // FASE 1: Comando de quartel (Adjunto, SGT Dia, CMT Guarda)
    const lead = missingSlots.filter(
      (s) => !isSecondaryChore(s.name, s.genericName) && isLeadershipRole(s.name, s.genericName, s.category)
    );
    fillSlotGroup(lead, primaryFilter, leadershipSorter);

    // FASE 2: Funções administrativas principais (Comunicante, Enc. Motorista, Escalante…)
    const principais = missingSlots
      .filter(
        (s) => !isSecondaryChore(s.name, s.genericName) && !isLeadershipRole(s.name, s.genericName, s.category)
      )
      .sort((a, b) => scarcity(a) - scarcity(b));
    fillSlotGroup(principais, primaryFilter, crewSorter);

    // FASE 3: Encargos de rotina (Faxina, Rancho, Depósito, Toque de Fogo, CB Guarda/Dia…)
    const encargos = missingSlots.filter((s) => isSecondaryChore(s.name, s.genericName));
    fillSlotGroup(
      encargos,
      (m) => {
        const roles = newSelected[m.rg] || [];
        if (options.pouparAdjunto && roles.some((r) => normalizeFnName(r).includes("ADJUNTO"))) return false;
        if (options.maxEncargos > 0) {
          const chores = roles.filter((r) => isSecondaryChore(r)).length;
          if (chores >= options.maxEncargos) return false;
        }
        return true;
      },
      crewSorter
    );
  }

  const unfilledMap = new Map<string, number>();
  unfilled.forEach((fn) => unfilledMap.set(fn, (unfilledMap.get(fn) || 0) + 1));

  return {
    newSelected,
    novas,
    removidas,
    vagasSemEfetivo: Array.from(unfilledMap.entries()).map(([fn, count]) => ({ fn, count })),
    totalVagas,
    jaPreenchidas,
  };
}

// ───────────────────────── Limpeza ─────────────────────────

/**
 * Remove funções da escala por escopo. A SENTINELA é sempre preservada,
 * pois é controlada pela Seção de Sentinelas.
 */
export function clearFunctionsByScope(
  selectedFunctions: Record<string, string[]>,
  requirements: SorteioRequirement[],
  scope: SorteioScope | "tudo"
): Record<string, string[]> {
  const scopeSet =
    scope === "tudo" ? null : new Set(getScopeRequirements(requirements, scope).map((r) => normalizeFnName(r.name)));
  const next: Record<string, string[]> = {};
  Object.entries(selectedFunctions || {}).forEach(([rg, fns]) => {
    const keep = (fns || []).filter((fn) => {
      if (isSentinelaFn(fn)) return true;
      if (scopeSet === null) return false;
      return !scopeSet.has(normalizeFnName(fn));
    });
    if (keep.length > 0) next[rg] = keep;
  });
  return next;
}

// ───────────────────────── Predefinições (presets) ─────────────────────────

export interface SorteioPreset {
  id: string;
  label: string;
  description: string;
  options: Omit<SorteioOptions, "funcoesExcluidas">;
}

export const SORTEIO_PRESETS: Record<SorteioScope, SorteioPreset[]> = {
  viaturas: [
    {
      id: "padrao",
      label: "Padrão CBMERJ",
      description: "Mais antigo na chefia, condutores escassos primeiro e mantém o que já foi escalado.",
      options: { modo: "preencher", respeitarPredefinicoes: true, hierarquia: true, permitirAcumulo: false, maxEncargos: 1, pouparAdjunto: true },
    },
    {
      id: "rodizio",
      label: "Rodízio Justo",
      description: "Ignora antiguidade e distribui de forma equilibrada e aleatória entre os habilitados.",
      options: { modo: "preencher", respeitarPredefinicoes: true, hierarquia: false, permitirAcumulo: false, maxEncargos: 1, pouparAdjunto: true },
    },
    {
      id: "refazer",
      label: "Refazer do Zero",
      description: "Limpa todas as guarnições das viaturas e monta tudo novamente.",
      options: { modo: "refazer", respeitarPredefinicoes: true, hierarquia: true, permitirAcumulo: false, maxEncargos: 1, pouparAdjunto: true },
    },
  ],
  administrativas: [
    {
      id: "padrao",
      label: "Padrão CBMERJ",
      description: "Comando pelo mais antigo, 1 encargo de rotina por militar e Adjunto poupado.",
      options: { modo: "preencher", respeitarPredefinicoes: true, hierarquia: true, permitirAcumulo: false, maxEncargos: 1, pouparAdjunto: true },
    },
    {
      id: "flexivel",
      label: "Flexível",
      description: "Permite acumular funções e até 2 encargos por militar. Ideal com efetivo reduzido.",
      options: { modo: "preencher", respeitarPredefinicoes: true, hierarquia: true, permitirAcumulo: true, maxEncargos: 2, pouparAdjunto: true },
    },
    {
      id: "refazer",
      label: "Refazer do Zero",
      description: "Limpa todas as funções administrativas e sorteia novamente.",
      options: { modo: "refazer", respeitarPredefinicoes: true, hierarquia: true, permitirAcumulo: false, maxEncargos: 1, pouparAdjunto: true },
    },
  ],
};

export const getPresetOptions = (scope: SorteioScope, presetId: string): SorteioOptions => {
  const preset = SORTEIO_PRESETS[scope].find((p) => p.id === presetId) || SORTEIO_PRESETS[scope][0];
  return { ...preset.options, funcoesExcluidas: [] };
};
