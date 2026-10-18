import React from 'react';
import { UserProfile } from '../types';
import { GenericOfficerGrdModule } from '../features/grd/components/GenericOfficerGrdModule';
import { GenericOfficerGrdConfig } from '../features/grd/types';

const OFFICER_GRD_CONFIG: GenericOfficerGrdConfig = {
  collectionName: 'officer_scales',
  poolConfigField: 'servicosGrd',
  title: 'Serviços e GRD de Oficiais',
  icon: 'shield',
  themeColor: 'emerald',
  col1Label: 'OFICIAL DE DIA / CMT OP / SOBREAVISO 1 / GRD 1',
  col2Label: 'SOBREAVISO 2 / GRD 2',
  col1Global10Label: 'OFICIAL DE DIA / CMT OP / SOBREAVISO 1 / GRD 1 (10º GBM)',
  col1Global26Label: 'OFICIAL DE DIA / CMT OP / SOBREAVISO 1 / GRD 1 (26º GBM)',
  col2Global10Label: 'SOBREAVISO 2 / GRD 2 (10º GBM)',
  col2Global26Label: 'SOBREAVISO 2 / GRD 2 (26º GBM)',
  distTitle: 'Distribuição de Serviços (Oficiais)',
  configSelectorLabel1: 'Of de Dia/Sobreaviso 1',
  configSelectorLabel2: 'Sobreaviso 2/GRD 2',
};

export interface OfficerGrdModuleProps {
  user: UserProfile;
  obmContext: string;
  setObmContext?: (obm: string) => void;
  availableObms?: string[];
}

export function OfficerGrdModule(props: OfficerGrdModuleProps) {
  return <GenericOfficerGrdModule {...props} config={OFFICER_GRD_CONFIG} />;
}
