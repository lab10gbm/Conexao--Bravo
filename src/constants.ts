export const INITIAL_COLUMNS = [
  { id: 'insignia', label: 'Insígnia' },
  { id: 'rank', label: 'Posto/Grad' },
  { id: 'quadro', label: 'Quadro' },
  { id: 'warName', label: 'N.Guerra' },
  { id: 'promotionDate', label: 'Data Promoção' },
  { id: 'rg', label: 'RG' },
  { id: 'idFuncional', label: 'ID Funcional' },
  { id: 'ala', label: 'ALA' },
  { id: 'obm', label: 'OBM' },
  { id: 'name', label: 'NOME' },
  { id: 'cidade', label: 'Cidade' },
  { id: 'cel', label: 'Cel' },
  { id: 'tel', label: 'Tel' },
  { id: 'email', label: 'E-mail' },
  { id: 'situacao', label: 'Situação' },
  { id: 'cursos', label: 'Cursos' }
];

export const GROUPS = [
  { id: "10º GBM", label: "10º GBM" },
  { id: "1/10", label: "1/10 - Itaguaí" },
  { id: "2/10", label: "2/10 - Ilha Grande" },
  { id: "3/10", label: "3/10 - Frade" },
  { id: "4/10", label: "4/10 - Mangaratiba" },
  { id: "26º GBM", label: "26º GBM - Paraty" },
  { id: "1/26", label: "1/26 - Mangaratiba / Paraty" }
];

export const RAS_FUNCTION_MAP: Record<string, string> = {
  condutorAbt: 'CONDUTOR ABT',
  condutorAbsl: 'CONDUTOR ABSL',
  condutorArc: 'CONDUTOR ARC',
  condutorAse: 'CONDUTOR ASE',
  condutorAr: 'CONDUTOR AR',
  chefeAbt: 'CHEFE ABT',
  chefeAbsl: 'CHEFE ABSL',
  ativoMaritimo: 'MARITIMO',
  mestreAl: 'MESTRE L',
  mestreBia: 'MESTRE BIA',
  opAma: 'OPERADOR AMA',
  gvAma: 'GV AMA',
  marinheiros: 'MARINHEIRO L',
  ativoEnfermeiro: 'ENFERMEIRO',
  ativoComunicante: 'COMUNICANTE',
  adjunto: 'ADJUNTO',
  auxRancho: 'AUXILIAR RANCHO',
  auxAbt: 'AUXILIAR ABT',
  auxAbsl: 'AUXILIAR ABSL',
  auxArc: 'AUXILIAR/CHEFE ARC',
  auxAse: 'AUXILIAR ASE',
};

export const DEFAULT_VIATURAS: any[] = [
  { id: "ABT-183", vtr: "ABT-183", ativa: true, exibir: true, espaco: "1", maritima: false, condutor: true, g1: true, g2: true, g3: true, g4: false, cg: true, blocked: [] },
  { id: "ABSL-152", vtr: "ABSL-152", ativa: true, exibir: true, espaco: "1", maritima: false, condutor: true, g1: true, g2: true, g3: false, g4: false, cg: true, blocked: [] },
  { id: "ASE-404", vtr: "ASE-404", ativa: true, exibir: true, espaco: "1", maritima: false, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "ARC-162", vtr: "ARC-162", ativa: true, exibir: true, espaco: "1/2", maritima: false, condutor: true, g1: true, g2: null, g3: null, g4: null, cg: null, blocked: ["g2", "g3", "g4", "cg"] },
  { id: "AR-583", vtr: "AR-583", ativa: true, exibir: true, espaco: "1/2", maritima: false, condutor: true, g1: null, g2: null, g3: null, g4: null, cg: null, blocked: ["g1", "g2", "g3", "g4", "cg"] },
  { id: "L-09", vtr: "L-09", ativa: true, exibir: true, espaco: "1/3", maritima: true, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "BIA-006", vtr: "BIA-006", ativa: true, exibir: true, espaco: "1/3", maritima: true, condutor: true, g1: true, g2: true, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "BIA-013", vtr: "BIA-013", ativa: false, exibir: false, espaco: "1/3", maritima: true, condutor: false, g1: false, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "ABT-12", vtr: "ABT-12", ativa: false, exibir: false, espaco: "1", maritima: false, condutor: false, g1: false, g2: false, g3: false, g4: false, cg: false, blocked: [] },
];

export const OBM_HIERARCHY: Record<string, string[]> = {
  '10º GBM': ['10º GBM', '1/10', '2/10', '3/10', '4/10'],
  '1/10': ['1/10'],
  '2/10': ['2/10'],
  '3/10': ['3/10'],
  '4/10': ['4/10'],
  '26º GBM': ['26º GBM', '1/26'],
  '1/26': ['1/26']
};

export const LETTER_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'EG', 'EGG', 'EXG', 'ÚNICO'];
export const NUMERIC_SIZES = ['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50', '52', '54', '56', '58', '60', '0', '1', '2', '3', '4', '5', '6'];

export const DEFAULT_SOP_SCHEMA = {
  areas: [
    {
      id: 'fardamento',
      label: 'Fardamento',
      fields: [
        { id: 'calca', label: 'Calça', type: 'number' },
        { id: 'camisa', label: 'Camisa', type: 'letter' },
        { id: 'quepe', label: 'Quepe', type: 'number' },
        { id: 'calcado', label: 'Calçado', type: 'number' }
      ]
    },
    {
      id: 'epi',
      label: 'Carga EPI',
      fields: [
        { id: 'capaceteIncendio', label: 'Cap Incêndio', type: 'text' },
        { id: 'jaquetaCalca', label: 'Jaq & Calça', type: 'text' },
        { id: 'luvaVaqueta', label: 'Luva Vaqueta', type: 'text' },
        { id: 'capaceteSalvamento', label: 'Cap Salvamento', type: 'text' },
        { id: 'balaclava', label: 'Balaclava', type: 'text' },
        { id: 'capaChuva', label: 'Capa Chuva', type: 'text' },
        { id: 'luvaAp', label: 'Luva AP', type: 'text' },
        { id: 'coturnoAp', label: 'Coturno AP', type: 'text' },
        { id: 'oculosAbrasao', label: 'Óculos Abr.', type: 'text' },
        { id: 'camisaLycra', label: 'Lycra', type: 'text' },
        { id: 'oculosSolar', label: 'Óculos Sol', type: 'text' },
        { id: 'garrafaTermica', label: 'Garrafa T.', type: 'text' },
        { id: 'apito', label: 'Apito', type: 'text' }
      ]
    }
  ]
} as any;
