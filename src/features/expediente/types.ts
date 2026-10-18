import { UserProfile } from '../../types';

export interface SwapRequest {
  id: string;
  rg: string;
  userName: string;
  fromDay: string;
  toDay: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface WeeklyDayChange {
  dayStr: string;
  dayLabel: string;
  currentStatus: 'expediente' | 'servico' | 'folga';
  proposedStatus: 'expediente' | 'servico' | 'folga';
}

export interface WeeklyChangeRequest {
  id: string;
  rg: string;
  userName: string;
  weekKey: string;
  weekLabel: string;
  changes: WeeklyDayChange[];
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface Afastamento {
  id: string;
  rg: string;
  inicio: string;
  retorno: string;
  situacao: string;
}

export interface PermutaDayDetails {
  hasPermuta: boolean;
  role: 'substitute' | 'requester';
  status: string;
  otherPartyName?: string;
  otherPartyRg?: string;
  source: 'general' | 'internal';
  permutaDocId?: string;
}

export interface DayStatusResult {
  text: string;
  type: 'expediente' | 'servico' | 'folga' | 'afastamento';
  label: string;
  isPermuta?: boolean;
  permutaInfo?: PermutaDayDetails | null;
}

export interface ExpedienteData {
  requirements: Record<string, number>;
  selections: Record<string, string[]>;
  userNames: Record<string, string>;
  sectors?: Record<string, string>;
  regimes?: Record<string, string>;
  locked?: Record<string, boolean>;
  lockedOrdinario?: Record<string, boolean>;
  lockedWeekly?: Record<string, Record<string, boolean>>;
  swapRequests?: SwapRequest[];
  weeklyChangeRequests?: WeeklyChangeRequest[];
  preferencesDetails?: Record<string, Record<string, number>>;
  expedienteDays?: Record<string, string[]>;
  expQuotas?: Record<string, number>;
  grdData?: Record<string, string[]>;
}

export interface MilitaryMoveModalData {
  isOpen: boolean;
  militarRg: string;
  militarName: string;
  currentDayStr: string;
  currentStatus: string;
}

export interface QuickAddModalData {
  isOpen: boolean;
  dayStr: string;
}
