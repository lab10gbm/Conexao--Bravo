import { UserProfile } from '../../types';

export interface OfficerQuotaItem {
  rg: string;
  name: string;
  quotaTotal: number;
  quotaRed: number;
  quotaPurple: number;
  quotaBlack: number;
  daysRed: string[];
  daysPurple: string[];
  daysBlack: string[];
}

export interface GenericOfficerGrdConfig {
  collectionName: 'officer_scales' | 'nautico_scales';
  poolConfigField: 'servicosGrd' | 'nucleoNautico';
  title: string;
  icon: 'shield' | 'anchor';
  themeColor: 'emerald' | 'cyan';
  col1Label: string;
  col2Label: string;
  col1Global10Label?: string;
  col1Global26Label?: string;
  col2Global10Label?: string;
  col2Global26Label?: string;
  distTitle: string;
  configSelectorLabel1: string;
  configSelectorLabel2: string;
}

export interface GenericOfficerGrdModuleProps {
  user: UserProfile;
  obmContext: string;
  setObmContext?: (obm: string) => void;
  availableObms?: string[];
  config: GenericOfficerGrdConfig;
}
