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
import { COLS_OFICIAIS, parseRank, sortAllBySeniority } from "./rankUtils";

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
 * Evita colisão entre funções de AR (Auto Rápido) e ARC (Auto Resgate…) em
 * comparações por substring: "CONDUTOR ARC".includes("CONDUTOR AR") === true.
 */
const hasArArcConflict = (aNorm: string, sNorm: string, gNorm: string = sNorm) => {
  const isAArc = /\bARC\b/.test(aNorm);
  const isSArc = /\bARC\b/.test(sNorm) || /\bARC\b/.test(gNorm);
  const isAAr = /\bAR\b/.test(aNorm) && !isAArc;
  const isSAr = (/\bAR\b/.test(sNorm) || /\bAR\b/.test(gNorm)) && !isSArc;
  return (isAArc && isSAr) || (isAAr && isSArc);
};

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
  if (!fNorm) return false;
  return prefs.some((p) => {
    const pNorm = normalizeFnName(p);
    if (pNorm === "") return false;
    if (isEquivalentFn(pNorm, fNorm) || (gNorm !== "" && isEquivalentFn(pNorm, gNorm))) return true;
    if (hasArArcConflict(pNorm, fNorm, gNorm || fNorm)) return false;
    return fNorm.includes(pNorm) || pNorm.includes(fNorm);
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
    if (isEquivalentFn(aNorm, sNorm) || isEquivalentFn(aNorm, gNorm)) {
      return true;
    }
    if (aNorm === 'CONDUTOR' || aNorm === 'CHEFE' || aNorm === 'AUXILIAR') {
      return false;
    }
    // Evita colisão entre AR e ARC em ambas as direções
    const isAArc = aNorm.includes('ARC');
    const isSArc = sNorm.includes('ARC') || gNorm.includes('ARC');
    const isAAr = (aNorm === 'CONDUTOR AR' || aNorm === 'AUXILIAR AR' || aNorm.endsWith(' AR') || /\bAR\b/.test(aNorm)) && !isAArc;
    const isSAr = (sNorm === 'CONDUTOR AR' || sNorm === 'AUXILIAR AR' || sNorm.endsWith(' AR') || /\bAR\b/.test(sNorm) || /\bAR\b/.test(gNorm)) && !isSArc;

    if ((isAArc && isSAr) || (isAAr && isSArc)) {
      return false;
    }
    return sNorm.includes(aNorm) || aNorm.includes(sNorm);
  });
};

// ───────────────────────── Classificação funcional ─────────────────────────

/** Chefias & Comando: Adjunto, Chefe ABT/ABSL/ARC/GUA, CMT Guarda, SGT de Dia */
export const isLeadershipRole = (name: string, generic: string, category: string) => {
  const n = (name + " " + generic).toUpperCase();
  if (n.includes("AUXILIAR/CHEFE") || n.includes("AUXILIAR / CHEFE")) return false;
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
    n.includes("AUXILIAR ASE") ||
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

interface FlowEdge {
  to: number;
  rev: number;
  cap: number;
  cost: number;
}

const GRADUADO_RANKS = new Set([...COLS_OFICIAIS, "SUBTEN", "1ºSGT", "2ºSGT", "3ºSGT"]);

const getLeadershipWeight = (name: string, generic: string): number => {
  const n = (name + " " + generic).toUpperCase();
  if (n.includes("ADJUNTO")) return 16;
  if (n.includes("CHEFE ABT")) return 15;
  if (n.includes("SGT DIA") || n.includes("CHEFE ABSL")) return 14;
  if (n.includes("CMT GUARDA")) return 13;
  return 12;
};

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

  const countPrimaryInScope = (rg: string) =>
    (newSelected[rg] || []).filter(
      (r) => !isSecondaryChore(r) && !isSentinelaFn(r) && scopeFnSet.has(normalizeFnName(r))
    ).length;

  const countPrimaryOtherScope = (rg: string) =>
    (newSelected[rg] || []).filter(
      (r) => !isSecondaryChore(r) && !isSentinelaFn(r) && !scopeFnSet.has(normalizeFnName(r))
    ).length;

  const countChores = (rg: string) =>
    (newSelected[rg] || []).filter((r) => isSecondaryChore(r)).length;

  const isAdjuntoAssigned = (rg: string) =>
    (newSelected[rg] || []).some((r) => normalizeFnName(r).includes("ADJUNTO"));

  const hasFn = (rg: string, fn: string) =>
    (newSelected[rg] || []).some((r) => normalizeFnName(r) === normalizeFnName(fn));

  const isVetado = (rg: string, fn: string) => vetos.has(`${rg}|${normalizeFnName(fn)}`);

  const assign = (rg: string, fn: string) => {
    newSelected[rg] = [...(newSelected[rg] || []), fn];
    novas.push({ rg, fn });
  };

  // Ordenação de antiguidade para cálculo de escores hierárquicos
  const sortedBySeniority = [...roster].sort((a, b) => sortAllBySeniority(a.militar || {}, b.militar || {}));
  const seniorityIndexMap = new Map<string, number>();
  sortedBySeniority.forEach((m, idx) => seniorityIndexMap.set(m.rg, idx));
  const N = Math.max(1, roster.length);

  // Quantas funções distintas deste escopo cada militar pode exercer (mede versatilidade vs especialização)
  const scopeUniqueReqs = scopeReqs.map((r) => ({ name: r.name, genericName: r.genericName }));
  const versatilityMap = new Map<string, number>();
  roster.forEach((m) => {
    const cnt = scopeUniqueReqs.filter((r) => isAllowed(m, r.name, r.genericName)).length;
    versatilityMap.set(m.rg, cnt);
  });

  // Pré-calcula ruído determinístico por (rg, fnNorm) para desempates estáveis
  const tieNoiseMap = new Map<string, number>();
  roster.forEach((m) => {
    scopeReqs.forEach((r) => {
      const key = `${m.rg}|${normalizeFnName(r.name)}`;
      if (!tieNoiseMap.has(key)) {
        tieNoiseMap.set(key, Math.floor(rng() * 900));
      }
    });
  });

  const scoreCandidateForSlot = (m: SorteioMilitar, slot: Slot, isChoreSlot: boolean): number => {
    let score = 0;
    const fNorm = normalizeFnName(slot.name);
    const gNorm = normalizeFnName(slot.genericName);
    const rank = parseRank(m.militar?.rank || m.militar?.postoGrad || "");
    const isGrad = GRADUADO_RANKS.has(rank) || Boolean(m.militar?.ativoGraduado);
    const isCb = rank === "CB";
    const isSd = rank === "SD";

    const senIdx = seniorityIndexMap.get(m.rg) ?? Math.floor(N / 2);
    const seniorityScore = N - senIdx; // Maior = mais antigo
    const modernityScore = senIdx + 1; // Maior = mais moderno

    // 1. Pré-definição fixa ★ (respeitada com altíssima prioridade sem inviabilizar vagas exclusivas)
    if (options.respeitarPredefinicoes && isPreferredAssignment(predefinicoes, m.rg, slot.name, slot.genericName)) {
      score += 50_000_000;
    }

    // 2. Consciência entre escopos (evita sobrecarregar Adjunto ou quem já tem função no outro escopo quando há outro militar livre)
    if (scope === "viaturas" && isAdjuntoAssigned(m.rg)) {
      score -= 15_000_000;
    }
    const otherPrimary = countPrimaryOtherScope(m.rg);
    const currentChores = countChores(m.rg);
    score -= otherPrimary * 350_000;
    score -= currentChores * 40_000;

    if (isChoreSlot) {
      // Encargos de rotina (Faxina, Rancho, Toque de Fogo, Depósito, Abastecedor, CB Guarda/Dia)
      const inScopePrimary = countPrimaryInScope(m.rg);
      if (inScopePrimary > 0) {
        score -= inScopePrimary * 4_000_000;
      }
      if (fNorm.includes("CB GUARDA") || fNorm.includes("CB DIA") || gNorm.includes("CB GUARDA") || gNorm.includes("CB DIA")) {
        if (isCb) score += 2_000_000;
        else if (isSd) score += 800_000;
        else if (isGrad) score -= 3_000_000;
      } else {
        if (isSd) score += 1_500_000;
        else if (isCb) score += 900_000;
        else if (isGrad) score -= 3_500_000;
      }
      if (options.hierarquia) {
        score += modernityScore * 4_000;
      }
    } else {
      const isLead = isLeadershipRole(slot.name, slot.genericName, slot.category);
      const isDrv = isDriverRole(slot.name, slot.genericName, slot.category);
      const isSpec = isSpecialistRole(slot.name, slot.genericName);

      if (isLead) {
        // Chefias e Comando: Graduados têm prioridade e respeitam antiguidade + relevância da chefia
        if (isGrad) score += 5_000_000;
        else if (isCb) score += 1_800_000;
        else score -= 1_500_000;

        if (options.hierarquia) {
          const w = getLeadershipWeight(slot.name, slot.genericName);
          score += w * seniorityScore * 10_000;
        }
      } else if (fNorm === "AUXILIAR ASE" || fNorm === "ENFERMEIRO" || gNorm === "ENFERMEIRO") {
        // Socorrista / Enfermeiro de ambulância (ASE)
        if (m.militar?.ativoEnfermeiro || m.militar?.auxAse) score += 4_500_000;
        if (options.hierarquia) score += modernityScore * 2_000;
      } else if (isDrv) {
        // Condutores, Mestres de Embarcação e Encarregado de Motorista
        const isMestreOrEnc = fNorm.includes("MESTRE") || fNorm.includes("ENCARREGADO DE MOTORISTA");
        if (isMestreOrEnc) {
          score += 2_000_000;
          if (options.hierarquia) score += seniorityScore * 3_000;
        } else {
          // Condutores operacionais: praças condutores (CB/SD) liberam graduados para chefias quando possível
          if (!isGrad) score += 1_200_000;
          if (options.hierarquia) score += modernityScore * 2_500;
        }
      } else if (isSpec) {
        score += 2_000_000;
        if (!isGrad) score += 600_000;
        if (options.hierarquia) score += modernityScore * 2_500;
      } else {
        // Auxiliares de guarnição (AUXILIAR ABT/ABSL/AR, AUXILIAR/CHEFE ARC) e Marinheiros
        const isAuxArc = fNorm.includes("AUXILIAR/CHEFE") || gNorm.includes("AUXILIAR/CHEFE");
        if (isAuxArc) {
          if (isCb) score += 2_200_000;
          else if (isSd) score += 1_600_000;
          else if (isGrad) score -= 1_000_000;
        } else {
          if (isSd) score += 1_800_000;
          else if (isCb) score += 1_400_000;
          else if (isGrad) score -= 2_000_000;
        }
        if (options.hierarquia) {
          score += modernityScore * 3_500;
        }
      }
    }

    // 3. Bônus de especialização (quem só faz 1 ou poucas funções entra primeiro nelas)
    const vers = versatilityMap.get(m.rg) || 1;
    score += Math.max(0, 20 - vers) * 1_200;

    // 4. Desempate pseudo-aleatório com semente (permite variar no botão "Sortear novamente")
    score += tieNoiseMap.get(`${m.rg}|${fNorm}`) || 0;

    return score;
  };

  /**
   * Resolve a alocação global de um grupo de vagas via Fluxo de Custo Mínimo e Cardinalidade Máxima
   * (Successive Shortest Augmenting Path / SPFA).
   * Garante matematicamente o maior número possível de vagas preenchidas sem desperdiçar especialistas,
   * respeitando o limite de 1 instância de cada função por militar.
   */
  const solveSlotGroupMinCostMaxFlow = (
    slots: Slot[],
    isChoreSlot: boolean,
    getCapacity: (m: SorteioMilitar) => number,
    getStepPenalty: (m: SorteioMilitar, stepIdx: number) => number
  ): { assigned: { rg: string; slot: Slot }[]; remaining: Slot[] } => {
    if (slots.length === 0 || roster.length === 0) {
      return { assigned: [], remaining: [...slots] };
    }

    // Agrupa as vagas por nome normalizado para impedir que o mesmo militar ocupe 2 vagas iguais
    const uniqueFnNames: string[] = [];
    const fnToSlotIndices = new Map<string, number[]>();
    slots.forEach((s, sIdx) => {
      const norm = normalizeFnName(s.name);
      if (!fnToSlotIndices.has(norm)) {
        fnToSlotIndices.set(norm, []);
        uniqueFnNames.push(norm);
      }
      fnToSlotIndices.get(norm)!.push(sIdx);
    });

    const source = 0;
    const sink = 1;
    const mBase = 2;
    const sBase = mBase + roster.length;
    let nextNode = sBase + slots.length;

    const adj: FlowEdge[][] = Array.from({ length: nextNode }, () => []);
    const ensureNode = (id: number) => {
      while (adj.length <= id) adj.push([]);
    };

    const addEdge = (from: number, to: number, cap: number, cost: number) => {
      ensureNode(Math.max(from, to));
      const fwd: FlowEdge = { to, rev: adj[to].length, cap, cost };
      const bwd: FlowEdge = { to: from, rev: adj[from].length, cap: 0, cost: -cost };
      adj[from].push(fwd);
      adj[to].push(bwd);
      return { from, edgeIdx: adj[from].length - 1 };
    };

    const BASE_COST_OFFSET = 100_000_000;
    const midEdgeRecords: { mIdx: number; uNorm: string; midNode: number }[] = [];

    // Arestas source -> militar (com custo marginal crescente para equilibrar carga)
    roster.forEach((m, mIdx) => {
      const cap = Math.min(getCapacity(m), uniqueFnNames.length);
      if (cap <= 0) return;
      const mNode = mBase + mIdx;
      for (let step = 0; step < cap; step++) {
        addEdge(source, mNode, 1, getStepPenalty(m, step));
      }

      uniqueFnNames.forEach((uNorm) => {
        if (hasFn(m.rg, uNorm) || isVetado(m.rg, uNorm)) return;
        const sIndices = fnToSlotIndices.get(uNorm)!;
        const sampleSlot = slots[sIndices[0]];
        if (!isAllowed(m, sampleSlot.name, sampleSlot.genericName)) return;

        const midNode = nextNode++;
        const score = scoreCandidateForSlot(m, sampleSlot, isChoreSlot);
        const edgeCost = Math.max(1, BASE_COST_OFFSET - score);
        addEdge(mNode, midNode, 1, edgeCost);
        midEdgeRecords.push({ mIdx, uNorm, midNode });

        sIndices.forEach((sIdx) => {
          addEdge(midNode, sBase + sIdx, 1, 0);
        });
      });
    });

    // Arestas slot -> sink
    slots.forEach((_, sIdx) => {
      addEdge(sBase + sIdx, sink, 1, 0);
    });

    const totalNodes = adj.length;
    const INF = Number.MAX_SAFE_INTEGER;

    // SPFA - Caminho aumentante mais curto sucessivo
    while (true) {
      const dist = new Array<number>(totalNodes).fill(INF);
      const parentNode = new Array<number>(totalNodes).fill(-1);
      const parentEdge = new Array<number>(totalNodes).fill(-1);
      const inQueue = new Array<boolean>(totalNodes).fill(false);
      const queue: number[] = [source];

      dist[source] = 0;
      inQueue[source] = true;

      let head = 0;
      while (head < queue.length) {
        const u = queue[head++];
        inQueue[u] = false;
        const edges = adj[u];
        for (let i = 0; i < edges.length; i++) {
          const e = edges[i];
          if (e.cap > 0 && dist[u] + e.cost < dist[e.to]) {
            dist[e.to] = dist[u] + e.cost;
            parentNode[e.to] = u;
            parentEdge[e.to] = i;
            if (!inQueue[e.to]) {
              inQueue[e.to] = true;
              queue.push(e.to);
            }
          }
        }
      }

      if (dist[sink] === INF) break;

      // Empurra 1 unidade de fluxo pelo caminho mínimo
      let cur = sink;
      while (cur !== source) {
        const p = parentNode[cur];
        const idx = parentEdge[cur];
        const edge = adj[p][idx];
        edge.cap -= 1;
        adj[cur][edge.rev].cap += 1;
        cur = p;
      }
    }

    // Extrai atribuições realizadas
    const filledSlotIndices = new Set<number>();
    const assigned: { rg: string; slot: Slot }[] = [];

    midEdgeRecords.forEach(({ mIdx, midNode }) => {
      const edges = adj[midNode];
      for (const e of edges) {
        if (e.to >= sBase && e.to < sBase + slots.length && e.cap === 0) {
          const sIdx = e.to - sBase;
          if (!filledSlotIndices.has(sIdx)) {
            filledSlotIndices.add(sIdx);
            assigned.push({ rg: roster[mIdx].rg, slot: slots[sIdx] });
            break;
          }
        }
      }
    });

    const remaining = slots.filter((_, idx) => !filledSlotIndices.has(idx));
    return { assigned, remaining };
  };

  // Separa vagas principais das vagas de encargos de rotina (concomitantes)
  const primarySlots = missingSlots.filter((s) => !isSecondaryChore(s.name, s.genericName));
  const choreSlots = missingSlots.filter((s) => isSecondaryChore(s.name, s.genericName));

  // PASSO 1: Funções principais do escopo — até 1 função principal por militar livre no escopo
  const pass1 = solveSlotGroupMinCostMaxFlow(
    primarySlots,
    false,
    (m) => (countPrimaryInScope(m.rg) === 0 ? 1 : 0),
    () => 0
  );
  pass1.assigned.forEach(({ rg, slot }) => assign(rg, slot.name));
  let remainingPrimary = pass1.remaining;

  // PASSO 1B: Se o militar tiver mais de uma pré-definição fixa ★ no escopo e a vaga ainda estiver aberta, aplica
  if (options.respeitarPredefinicoes && remainingPrimary.length > 0) {
    roster.forEach((m) => {
      const prefs = predefinicoes[m.rg] || [];
      if (prefs.length <= 1) return;
      prefs.forEach((p) => {
        const pNorm = normalizeFnName(p);
        if (!pNorm || isSentinelaFn(p)) return;
        const idx = remainingPrimary.findIndex(
          (s) =>
            isPreferredAssignment(predefinicoes, m.rg, s.name, s.genericName) &&
            (isEquivalentFn(normalizeFnName(s.name), pNorm) ||
              isEquivalentFn(normalizeFnName(s.genericName), pNorm) ||
              normalizeFnName(s.name).includes(pNorm) ||
              pNorm.includes(normalizeFnName(s.name))) &&
            !hasArArcConflict(pNorm, normalizeFnName(s.name), normalizeFnName(s.genericName)) &&
            isAllowed(m, s.name, s.genericName) &&
            !hasFn(m.rg, s.name) &&
            !isVetado(m.rg, s.name)
        );
        if (idx !== -1) {
          const [slot] = remainingPrimary.splice(idx, 1);
          assign(m.rg, slot.name);
        }
      });
    });
  }

  // PASSO 2: Acúmulo de funções principais (quando permitirAcumulo está ativo e restaram vagas abertas)
  if (options.permitirAcumulo && remainingPrimary.length > 0) {
    const pass2 = solveSlotGroupMinCostMaxFlow(
      remainingPrimary,
      false,
      () => remainingPrimary.length,
      (m, step) => (countPrimaryInScope(m.rg) + step) * 2_500_000
    );
    pass2.assigned.forEach(({ rg, slot }) => assign(rg, slot.name));
    remainingPrimary = pass2.remaining;
  }

  // PASSO 3: Encargos secundários de rotina (Faxina, Rancho, Toque de Fogo, Depósito, Abastecedor, CB Guarda/Dia)
  let remainingChores = choreSlots;
  if (remainingChores.length > 0) {
    const pass3 = solveSlotGroupMinCostMaxFlow(
      remainingChores,
      true,
      (m) => {
        if (options.pouparAdjunto && isAdjuntoAssigned(m.rg)) return 0;
        const current = countChores(m.rg);
        if (options.maxEncargos > 0) {
          return Math.max(0, options.maxEncargos - current);
        }
        return remainingChores.length;
      },
      (m, step) => (countChores(m.rg) + step) * 2_500_000
    );
    pass3.assigned.forEach(({ rg, slot }) => assign(rg, slot.name));
    remainingChores = pass3.remaining;
  }

  const unfilled = [...remainingPrimary, ...remainingChores].map((s) => s.name);
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
