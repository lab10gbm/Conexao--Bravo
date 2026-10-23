export interface ViaturaConfig {
  id: string;
  vtr: string;
  ativa: boolean;
  exibir?: boolean;
  espaco?: '1' | '1/2' | '1/3';
  obm?: string;
  tipo?: 'operacional' | 'administrativa';
  maritima?: boolean;
  condutor: boolean | null;
  g1: boolean | null;
  g2: boolean | null;
  g3: boolean | null;
  g4: boolean | null;
  cg: boolean | null;
  blocked: string[];
  customNames?: {
    condutor?: string;
    g1?: string;
    g2?: string;
    g3?: string;
    g4?: string;
    cg?: string;
  };
  customFunctions?: {
    condutor?: string;
    g1?: string;
    g2?: string;
    g3?: string;
    g4?: string;
    cg?: string;
  };
}

export interface VtrModalFunctionRow {
  uid: string;
  fnId: string; // ID from Controle de Função, or '__CUSTOM__' for custom name
  customName: string;
  maxQty: number; // 1 for Condutor/Chefe, 1..4 for Auxiliar/Marinheiro/etc.
}

export const OBM_OPTIONS = [
  "10º GBM",
  "DBM 1/10",
  "DBM 2/10",
  "DBM 3/10",
  "DBM 4/10",
  "26º GBM",
  "DBM 1/26"
];

export const DEFAULT_VIATURAS: ViaturaConfig[] = [
  { id: "ABT-143", vtr: "ABT-143", ativa: true, exibir: true, espaco: "1", obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: true, g3: true, g4: false, cg: true, blocked: [] },
  { id: "ABSL-152", vtr: "ABSL-152", ativa: true, exibir: true, espaco: "1", obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: true, g3: false, g4: false, cg: true, blocked: [] },
  { id: "ASE-572", vtr: "ASE-572", ativa: true, exibir: true, espaco: "1", obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "AR-600", vtr: "AR-600", ativa: true, exibir: true, espaco: "1/2", obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: null, g2: null, g3: null, g4: null, cg: null, blocked: ["g1", "g2", "g3", "g4", "cg"] },
  { id: "ARC-162", vtr: "ARC-162", ativa: true, exibir: true, espaco: "1/2", obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: null, g3: null, g4: null, cg: null, blocked: ["g2", "g3", "g4", "cg"] },
  { id: "L-09", vtr: "L-09", ativa: true, exibir: true, espaco: "1/3", obm: "10º GBM", tipo: 'operacional', maritima: true, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "BIA-006", vtr: "BIA-006", ativa: false, exibir: true, espaco: "1/3", obm: "10º GBM", tipo: 'operacional', maritima: true, condutor: false, g1: false, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "BIA-013", vtr: "BIA-013", ativa: false, exibir: true, espaco: "1/3", obm: "10º GBM", tipo: 'operacional', maritima: true, condutor: false, g1: false, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "ABT-12", vtr: "ABT-12", ativa: false, exibir: false, espaco: "1", obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: false, g1: false, g2: false, g3: false, g4: false, cg: false, blocked: [] },
];

export { getDefaultViaturasForObm, isContaminatedFleet, sanitizeFleetForObm, OBM_DEFAULT_VIATURAS } from './lib/viaturaUtils.ts';
