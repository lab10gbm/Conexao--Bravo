import { UserProfile } from '../../types';

export const ALAS = ['1', '2', '3', '4', 'EXP'];

export const COSTA_VERDE_OBMS = [
  { id: '10º GBM', label: '10º GBM - Angra dos Reis (Sede)' },
  { id: '1/10', label: '1/10 - Itaguaí' },
  { id: '2/10', label: '2/10 - Ilha Grande' },
  { id: '3/10', label: '3/10 - Frade' },
  { id: '4/10', label: '4/10 - Mangaratiba' },
  { id: '26º GBM', label: '26º GBM - Paraty (Sede)' },
  { id: '1/26', label: '1/26 - Parque Mambucaba' },
];

export interface PendingTransfer {
  militar: UserProfile;
  targetAla: string;
  targetObm: string;
}

export interface DefaultAlasInfo {
  hasDefault: boolean;
  updatedAt: string | null;
  totalMilitaries: number;
}
