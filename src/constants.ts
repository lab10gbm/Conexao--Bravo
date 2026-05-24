export const INITIAL_COLUMNS = [
  { id: 'insignia', label: 'Insígnia' },
  { id: 'rank', label: 'Posto/Grad' },
  { id: 'quadro', label: 'Quadro' },
  { id: 'warName', label: 'N.Guerra' },
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
  { id: "10º GBM", label: "10º GBM - Angra dos Reis" },
  { id: "1/10", label: "1/10 - Itaguaí" },
  { id: "2/10", label: "2/10 - Ilha Grande" },
  { id: "3/10", label: "3/10 - Frade" },
  { id: "4/10", label: "4/10 - Mangaratiba" },
  { id: "26º GBM", label: "26º GBM - Paraty" },
  { id: "1/26", label: "1/26 - Mangaratiba / Paraty" }
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
