export enum PermutaStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  SCHEDULED = 'scheduled',
}

export interface UserProfile {
  uid: string;
  name: string;
  rank: string;
  warName?: string;
  ala: string | number;
  email?: string;
  email2?: string;
  photoURL?: string;
  rg?: string;
  login?: string;
  isOutsourced?: boolean;
  isAdmin?: boolean;
  adminObms?: string[];
  isEscalante?: boolean;
  escalanteObms?: string[];
  isRefeitorioAdmin?: boolean;
  obm?: string;
  lentTo?: string | null;
  quadro?: string;
  cursos?: string;
  cidade?: string;
  isOficial?: boolean;
  idFuncional?: string;
  cel?: string;
  cel2?: string;
  tel?: string;
  situacao?: string;
  officerRole?: string;
  endereco?: string;
  bairro?: string;
  cep?: string;
  nascimento?: string;
  cpf?: string;
  pai?: string;
  mae?: string;
  cnh?: string;
  cnhCat?: string;
  grauInstrucao?: string;
  specializations?: string[];
  promotionDate?: string;
  promotions?: any[];
  lastProfileUpdate?: number;
  // Funções e Viaturas
  ativoCondutor?: boolean;
  ativoEncarregado?: boolean;
  ativoAbastecedor?: boolean;
  ativoChefeGua?: boolean;
  chefeAbt?: boolean;
  chefeAbsl?: boolean;
  ativoMaritimo?: boolean;
  mestreAl?: boolean;
  mestreBia?: boolean;
  opAma?: boolean;
  gvAma?: boolean;
  marinheiros?: boolean;
  ativoEnfermeiro?: boolean;
  ativoComunicante?: boolean;
  ativoGraduado?: boolean;
  ativoCbsSds?: boolean;
  adjunto?: boolean;
  sgtDia?: boolean;
  cmtGuarda?: boolean;
  disponivel1?: boolean;
  disponivel2?: boolean;
  faxina?: boolean;
  sentinela?: boolean;
  deposito?: boolean;
  toqueDeFogo?: boolean;
  auxRancho?: boolean;
  cbGuarda?: boolean;
  cbDia?: boolean;
  disponivelCbsSds?: boolean;
  ativoAuxiliar?: boolean;
  auxAbt?: boolean;
  auxAbsl?: boolean;
  auxArc?: boolean;
  auxAse?: boolean;
  disponivelAux?: boolean;
  viaturas?: {
    ABT?: boolean;
    ABSL?: boolean;
    ASE?: boolean;
    AR?: boolean;
    ARC?: boolean;
  };
  rasHours?: number; // Total hours accumulated from RAS
}

export interface RasOpportunity {
  id?: string;
  obm: string;
  date: string;
  duration: 12 | 24;
  description?: string;
  local?: string;
  functions: string[]; // Required functions
  vacancies?: number;
  functionVacancies?: { [key: string]: number };
  status: 'open' | 'closed' | 'completed';
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface RasApplication {
  id?: string;
  rasId: string;
  functionId?: string;
  militarId: string;
  militarRg: string;
  militarName: string;
  militarWarName?: string;
  militarQuadro?: string;
  militarRank: string;
  militarPromotionDate?: string;
  status: 'applied' | 'selected' | 'rejected' | 'completed';
  appliedAt: number;
}

export interface Vacation {
  id: string;
  militarRg: string;
  ato: string;
  anoRef: string;
  anoRetifi?: string;
  dataInicio: string;
  dataRetorno: string;
  boletim: string;
  boletimOrigem: string;
  diasGozados: number;
  diasAGozar: number;
  obs: string;
  status: 'gozado' | 'marcado' | 'pendente';
}

export interface PermutaRequest {
  id?: string;
  obm?: string;
  isOfficer?: boolean;
  requesterId: string;
  requesterName: string;
  requesterRg?: string;
  substituteId?: string;
  substituteName?: string;
  isLookingForSubstitute?: boolean;
  offerType?: 'troca' | 'pago' | 'especial';
  substituteRg?: string;
  requesterSigned?: boolean;
  substituteSigned?: boolean;
  date: string; // YYYY-MM-DD
  originalAla: string | number;
  targetMilitarId?: string;
  substituteFunctions?: string[]; 
  status: PermutaStatus;
  acceptedById?: string;
  acceptedByName?: string;
  cancelledByRg?: string;
  archived?: boolean;
  createdAt: number;
  updatedAt: number;
}
