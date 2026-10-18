import React from 'react';
import { UserProfile } from '../types';
import { GenericOfficerGrdModule } from '../features/grd/components/GenericOfficerGrdModule';
import { GenericOfficerGrdConfig } from '../features/grd/types';

const NAUTICO_GRD_CONFIG: GenericOfficerGrdConfig = {
  collectionName: 'nautico_scales',
  poolConfigField: 'nucleoNautico',
  title: 'Núcleo Náutico',
  icon: 'anchor',
  themeColor: 'cyan',
  col1Label: 'OFICIAL DE DIA / CMT OP / SOBREAVISO 1 / GRD 1',
  col2Label: 'SOBREAVISO 2 / GRD 2',
  col1Global10Label: 'OF E CMT / G1 (10º GBM)',
  col1Global26Label: 'OF E CMT / G1 (26º GBM)',
  col2Global10Label: 'SOBREAVISO / G2 (10º GBM)',
  col2Global26Label: 'SOBREAVISO / G2 (26º GBM)',
  distTitle: 'Distribuição de Serviços (Oficiais Náutica)',
  configSelectorLabel1: 'Of e CMT / G1',
  configSelectorLabel2: 'Sobreaviso / G2',
};

export interface NucleoNauticoGrdModuleProps {
  user: UserProfile;
  obmContext: string;
  setObmContext?: (obm: string) => void;
  availableObms?: string[];
}

export function NucleoNauticoGrdModule(props: NucleoNauticoGrdModuleProps) {
  return <GenericOfficerGrdModule {...props} config={NAUTICO_GRD_CONFIG} />;
}
