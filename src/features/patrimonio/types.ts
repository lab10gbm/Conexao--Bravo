import { UserProfile } from '../../types';

export interface PatrimonioItem {
  id: string;
  descricao?: string;
  quantidade?: number;
  situacao?: string;
  estado?: string;
  [key: string]: any;
}

export interface PatrimonioSection {
  nome?: string;
  title?: string;
  itens?: PatrimonioItem[];
  items?: PatrimonioItem[];
  id: string;
  obm?: string;
  insertedAt?: string;
  insertedBy?: string;
  [key: string]: any;
}

export interface PatrimonyModuleProps {
  user: UserProfile;
  adminModeActive: boolean;
  onToggleAdminMode: () => void;
  obmContext?: string;
  onBack: () => void;
}
