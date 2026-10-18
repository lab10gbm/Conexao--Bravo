import { UserProfile, Vacation } from '../../types';

export interface PendingYearItem {
  year: number;
  pending: number;
}

export interface GroupedVacationYear {
  anoRef: string;
  items: Vacation[];
  totalGozados: number;
  pending: number;
}

export interface PanoramaRow {
  militar: UserProfile;
  startYear: number;
  missingYears: number[];
  pendingBalances: { year: number; days: number }[];
  totalPendingDays: number;
  isVal?: any;
}

export interface PanoramaData {
  oficiais: PanoramaRow[];
  pracas: PanoramaRow[];
  regularizadosOficiais: PanoramaRow[];
  regularizadosPracas: PanoramaRow[];
  validadosOficiais: PanoramaRow[];
  validadosPracas: PanoramaRow[];
}

export interface Afastamento {
  id: string;
  rg: string;
  ala: string;
  inicio: string;
  retorno: string;
  situacao: string;
  obs: string;
  obm: string;
  isAutomatic?: boolean;
  source?: 'manual' | 'dgp';
}

