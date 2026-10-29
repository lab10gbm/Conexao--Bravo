export interface OfficerSectionItem {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  badge: string;
  icon: string; // 'shield' | 'anchor' | 'stethoscope' | 'flame' | 'award' | 'compass' | 'star' | 'settings'
  color: string; // 'indigo' | 'cyan' | 'rose' | 'emerald' | 'amber' | 'blue' | 'purple' | 'slate'
  enabled: boolean;
  isCustom?: boolean;
  col1Name?: string;
  col2Name?: string;
  allowNonOfficers?: boolean; // Permite cadastrar militares não-oficiais (ex: Subtenente como Comandante de Socorro)
}

export function getDefaultSectionsForObm(obm: string): OfficerSectionItem[] {
  const clean = (obm || '10º GBM').trim().toUpperCase().replace(/°/g, 'º');
  const is10Sede = clean === '10º GBM' || clean === '10 GBM' || clean.includes('10º GBM SEDE') || clean === 'GLOBAL';
  const is26Sede = clean === '26º GBM' || clean === '26 GBM' || clean.includes('26º GBM SEDE');
  const isDbm = clean.includes('1/10') || clean.includes('2/10') || clean.includes('3/10') || clean.includes('4/10') || clean.includes('1/26');

  return [
    {
      id: 'servicos-grd',
      name: 'Serviços e GRD',
      subtitle: 'Escala de Oficiais',
      description: 'Oficial de Dia, Sobreaviso e gerenciamento da escala geral de oficiais.',
      badge: 'Geral & Sobreaviso',
      icon: 'shield',
      color: 'indigo',
      enabled: true,
      col1Name: 'OFICIAL DE DIA / CMT OP / SOBREAVISO 1 / GRD 1',
      col2Name: 'SOBREAVISO 2 / GRD 2'
    },
    {
      id: 'nucleo-nautico',
      name: 'Núcleo Náutico',
      subtitle: 'Operações Náuticas',
      description: 'Serviços especializados, escalas e GRD marítima e náutica.',
      badge: 'Operações Náuticas',
      icon: 'anchor',
      color: 'cyan',
      // Núcleo Náutico só existe no 10º GBM por padrão
      enabled: is10Sede,
      col1Name: 'OFICIAL DE DIA / CMT OP / SOBREAVISO 1 / GRD 1',
      col2Name: 'SOBREAVISO 2 / GRD 2'
    },
    {
      id: 'oficiais-medicos',
      name: 'Oficiais Médicos',
      subtitle: 'Corpo de Saúde',
      description: 'Serviços médicos, escala hospitalar e atendimento operacional de saúde.',
      badge: 'Corpo de Saúde',
      icon: 'stethoscope',
      color: 'rose',
      // DBMs menores geralmente não possuem oficiais médicos
      enabled: !isDbm,
      col1Name: 'OFICIAL MÉDICO DE DIA / SOBREAVISO 1',
      col2Name: 'SOBREAVISO MÉDICO 2'
    }
  ];
}
