export interface PostoFuncaoConfig {
  id: string;
  nome: string; // e.g. "CHEFE DO POSTO", "GUARDA-VIDAS 1", "CONDUTOR", "SOCORRISTA"
  vagas?: number;
}

export interface PostoConfig {
  id: string;
  nome: string; // e.g. "POSTO DE PRAIA 01", "POSTO SALVAMAR"
  tipo?: 'praia' | 'operacional' | 'destacamento' | 'fixo' | 'outro';
  obm?: string;
  ativa: boolean;
  exibir?: boolean;
  funcoes: PostoFuncaoConfig[];
}

export interface EscalaPostoSlot {
  slotId: string;
  funcaoNome: string;
  rg: string | null;
}

export interface EscalaPostoData {
  postoId: string;
  postoNome: string;
  tipo?: string;
  ativa: boolean;
  slots: EscalaPostoSlot[];
}

export const DEFAULT_POSTOS: PostoConfig[] = [
  {
    id: "posto-praia-01",
    nome: "POSTO DE PRAIA 01",
    tipo: "praia",
    obm: "10º GBM",
    ativa: true,
    exibir: true,
    funcoes: [
      { id: "p1-chefe", nome: "CHEFE DO POSTO", vagas: 1 },
      { id: "p1-gv1", nome: "GUARDA-VIDAS 1", vagas: 1 },
      { id: "p1-gv2", nome: "GUARDA-VIDAS 2", vagas: 1 },
      { id: "p1-condutor", nome: "CONDUTOR", vagas: 1 },
    ]
  }
];
