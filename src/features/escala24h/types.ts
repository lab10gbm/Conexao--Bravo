import { UserProfile, OfficerVisibility, PermutaRequest, PermutaStatus } from '../../types';
import { SentinelaSlot } from '../../lib/sentinelaUtils';
import { SorteioScope, SorteioResult, SorteioMilitar } from '../../lib/sorteioFuncoes';

export { PermutaStatus };
export type { UserProfile, OfficerVisibility, PermutaRequest, SentinelaSlot, SorteioScope, SorteioResult, SorteioMilitar };

export type ViaturaSlotType = 'condutor' | 'g1' | 'g2' | 'g3' | 'g4' | 'cg';

export interface EscalaViaturaInfo {
  id: string;
  vtr: string;
  ativa: boolean;
  exibir?: boolean;
  espaco?: '1' | '1/2' | '1/3';
  maritima?: boolean;
  obm?: string;
  tipo?: string;
  condutor?: boolean | null;
  g1?: boolean | null;
  g2?: boolean | null;
  g3?: boolean | null;
  g4?: boolean | null;
  cg?: boolean | null;
  blocked?: ViaturaSlotType[];
}

export interface EscalaEspelhoModuleProps {
  obmContext: string;
  user: UserProfile;
  initialDate?: string;
}

export interface SorteioFeedback {
  type: 'success' | 'warning' | 'info';
  message: string;
  undoable?: boolean;
}

export interface EscalaPrintViewProps {
  selectedDate: string;
  identifiedAla: number | string;
  baseRoster: any[];
  permutasOut: Set<string>;
  militars: any[];
  selectedFunctions: Record<string, string[]>;
  viaturasInfo: EscalaViaturaInfo[];
  rasApplications: any[];
  expedienteMilitars?: any[];
  oficialDia?: string;
  oficialNautica?: string;
  oficialMedico?: string;
  officerVisibility?: OfficerVisibility;
  onOfficerVisibilityChange?: (updated: OfficerVisibility) => void;
  adminRolesVisibility?: Record<string, boolean>;
  onAdminRolesVisibilityChange?: (updated: Record<string, boolean>) => void;
  user?: UserProfile;
  afastamentos?: any[];
  obmContext: string;
  grdRgs?: string[];
  sentinelaRgs?: (string | null)[];
  sentinelaSlots?: SentinelaSlot[];
  onRegister?: () => void;
  onClose: () => void;
}

export interface OfficerAssignment {
  officerStr: string;
  isCustom?: boolean;
  notes?: string;
}
