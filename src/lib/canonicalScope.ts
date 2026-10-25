/**
 * CONEXÃO BRAVO — Catálogo Canônico & Utilitários de Resolução de Escopo
 * 
 * Regra Arquitetural:
 * - O CBMERJ adota a hierarquia: Órgão (cbmerj) -> Regional (cba_vii) -> Unidade (10_gbm | 26_gbm) -> Subunidade (Sedes e DBMs).
 * - Custo Zero (Firebase Spark Plan): todas as queries particionadas devem usar scope.subunitId ou scope.unitId.
 * - Zero Downtime: normalizador converte qualquer variação legada de string para o ScopeContext canônico.
 */

import type {
  ScopeContext,
  Organization,
  RegionalCommand,
  MilitaryUnit,
  Subunit,
  ScopedPermissions
} from '../types/scope.ts';

export type {
  ScopeContext,
  Organization,
  RegionalCommand,
  MilitaryUnit,
  Subunit,
  ScopedPermissions
};

// ============================================================================
// 1. CATÁLOGO OFICIAL: ÓRGÃOS E COMANDOS REGIONAIS
// ============================================================================

export const CANONICAL_ORGANIZATIONS: Record<string, Organization> = {
  cbmerj: {
    id: 'cbmerj',
    name: 'Corpo de Bombeiros Militar do Estado do Rio de Janeiro',
    shortName: 'CBMERJ',
    state: 'RJ',
    country: 'BR'
  }
};

export const CANONICAL_REGIONAL_COMMANDS: Record<string, RegionalCommand> = {
  cba_i: {
    id: 'cba_i',
    orgId: 'cbmerj',
    name: 'Comando de Bombeiro de Área I – Capital',
    shortName: 'CBA I',
    region: 'Capital (Rio de Janeiro)'
  },
  cba_ii: {
    id: 'cba_ii',
    orgId: 'cbmerj',
    name: 'Comando de Bombeiro de Área II – Serrana',
    shortName: 'CBA II',
    region: 'Região Serrana'
  },
  cba_iii: {
    id: 'cba_iii',
    orgId: 'cbmerj',
    name: 'Comando de Bombeiro de Área III – Sul',
    shortName: 'CBA III',
    region: 'Sul Fluminense'
  },
  cba_iv: {
    id: 'cba_iv',
    orgId: 'cbmerj',
    name: 'Comando de Bombeiro de Área IV – Norte-Noroeste',
    shortName: 'CBA IV',
    region: 'Norte / Noroeste Fluminense'
  },
  cba_v: {
    id: 'cba_v',
    orgId: 'cbmerj',
    name: 'Comando de Bombeiro de Área V – Baixada Litorânea',
    shortName: 'CBA V',
    region: 'Baixada Litorânea (Região dos Lagos)'
  },
  cba_vi: {
    id: 'cba_vi',
    orgId: 'cbmerj',
    name: 'Comando de Bombeiro de Área VI – Baixada Fluminense',
    shortName: 'CBA VI',
    region: 'Baixada Fluminense'
  },
  cba_vii: {
    id: 'cba_vii',
    orgId: 'cbmerj',
    name: 'Comando de Bombeiro de Área VII – Costa Verde',
    shortName: 'CBA VII',
    region: 'Costa Verde'
  },
  cba_viii: {
    id: 'cba_viii',
    orgId: 'cbmerj',
    name: 'Comando de Bombeiro de Área VIII – Atividades Especializadas',
    shortName: 'CBA VIII',
    region: 'Atividades Especializadas'
  },
  cba_ix: {
    id: 'cba_ix',
    orgId: 'cbmerj',
    name: 'Comando de Bombeiro de Área IX – Metropolitana',
    shortName: 'CBA IX',
    region: 'Região Metropolitana'
  },
  cba_x: {
    id: 'cba_x',
    orgId: 'cbmerj',
    name: 'Comando de Bombeiro de Área X / XI – Atividades de Salvamentos Marítimos',
    shortName: 'CBA X / XI',
    region: 'Salvamentos Marítimos (GMARs e GBS)'
  },
  cbmerj_geral: {
    id: 'cbmerj_geral',
    orgId: 'cbmerj',
    name: 'Comando-Geral e Órgãos Especiais / Saúde',
    shortName: 'CBMERJ Geral',
    region: 'Estado do Rio de Janeiro'
  }
};

// ============================================================================
// 2. CATÁLOGO OFICIAL: UNIDADES (OBM)
// ============================================================================

export const CANONICAL_UNITS: Record<string, MilitaryUnit> = {
  // --- CBA I – Capital ---
  '1_gbm': {
    id: '1_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_i',
    name: '1º Grupamento de Bombeiro Militar - Humaitá',
    shortName: '1º GBM',
    city: 'Rio de Janeiro (Humaitá)',
    type: 'GBM',
    subunits: ['1_gbm_sede']
  },
  '2_gbm': {
    id: '2_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_i',
    name: '2º Grupamento de Bombeiro Militar - Méier',
    shortName: '2º GBM',
    city: 'Rio de Janeiro (Méier)',
    type: 'GBM',
    subunits: ['2_gbm_sede']
  },
  '11_gbm': {
    id: '11_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_i',
    name: '11º Grupamento de Bombeiro Militar - Vila Isabel',
    shortName: '11º GBM',
    city: 'Rio de Janeiro (Vila Isabel)',
    type: 'GBM',
    subunits: ['11_gbm_sede']
  },
  '17_gbm': {
    id: '17_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_i',
    name: '17º Grupamento de Bombeiro Militar - Copacabana',
    shortName: '17º GBM',
    city: 'Rio de Janeiro (Copacabana)',
    type: 'GBM',
    subunits: ['17_gbm_sede']
  },
  '25_gbm': {
    id: '25_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_i',
    name: '25º Grupamento de Bombeiro Militar - Gávea',
    shortName: '25º GBM',
    city: 'Rio de Janeiro (Gávea)',
    type: 'GBM',
    subunits: ['25_gbm_sede']
  },

  // --- CBA II – Serrana ---
  '6_gbm': {
    id: '6_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_ii',
    name: '6º Grupamento de Bombeiro Militar - Nova Friburgo',
    shortName: '6º GBM',
    city: 'Nova Friburgo',
    type: 'GBM',
    subunits: ['6_gbm_sede']
  },
  '15_gbm': {
    id: '15_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_ii',
    name: '15º Grupamento de Bombeiro Militar - Petrópolis',
    shortName: '15º GBM',
    city: 'Petrópolis',
    type: 'GBM',
    subunits: ['15_gbm_sede']
  },
  '16_gbm': {
    id: '16_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_ii',
    name: '16º Grupamento de Bombeiro Militar - Teresópolis',
    shortName: '16º GBM',
    city: 'Teresópolis',
    type: 'GBM',
    subunits: ['16_gbm_sede']
  },

  // --- CBA III – Sul ---
  '7_gbm': {
    id: '7_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_iii',
    name: '7º Grupamento de Bombeiro Militar - Barra Mansa',
    shortName: '7º GBM',
    city: 'Barra Mansa',
    type: 'GBM',
    subunits: ['7_gbm_sede']
  },
  '22_gbm': {
    id: '22_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_iii',
    name: '22º Grupamento de Bombeiro Militar - Volta Redonda',
    shortName: '22º GBM',
    city: 'Volta Redonda',
    type: 'GBM',
    subunits: ['22_gbm_sede']
  },
  '23_gbm': {
    id: '23_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_iii',
    name: '23º Grupamento de Bombeiro Militar - Resende',
    shortName: '23º GBM',
    city: 'Resende',
    type: 'GBM',
    subunits: ['23_gbm_sede']
  },

  // --- CBA IV – Norte-Noroeste ---
  '5_gbm': {
    id: '5_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_iv',
    name: '5º Grupamento de Bombeiro Militar - Campos dos Goytacazes',
    shortName: '5º GBM',
    city: 'Campos dos Goytacazes',
    type: 'GBM',
    subunits: ['5_gbm_sede']
  },
  '9_gbm': {
    id: '9_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_iv',
    name: '9º Grupamento de Bombeiro Militar - Macaé',
    shortName: '9º GBM',
    city: 'Macaé',
    type: 'GBM',
    subunits: ['9_gbm_sede']
  },
  '21_gbm': {
    id: '21_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_iv',
    name: '21º Grupamento de Bombeiro Militar - Itaperuna',
    shortName: '21º GBM',
    city: 'Itaperuna',
    type: 'GBM',
    subunits: ['21_gbm_sede']
  },

  // --- CBA V – Baixada Litorânea ---
  '18_gbm': {
    id: '18_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_v',
    name: '18º Grupamento de Bombeiro Militar - Cabo Frio',
    shortName: '18º GBM',
    city: 'Cabo Frio',
    type: 'GBM',
    subunits: ['18_gbm_sede']
  },
  '27_gbm': {
    id: '27_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_v',
    name: '27º Grupamento de Bombeiro Militar - Araruama',
    shortName: '27º GBM',
    city: 'Araruama',
    type: 'GBM',
    subunits: ['27_gbm_sede']
  },

  // --- CBA VI – Baixada Fluminense ---
  '4_gbm': {
    id: '4_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_vi',
    name: '4º Grupamento de Bombeiro Militar - Nova Iguaçu',
    shortName: '4º GBM',
    city: 'Nova Iguaçu',
    type: 'GBM',
    subunits: ['4_gbm_sede']
  },
  '14_gbm': {
    id: '14_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_vi',
    name: '14º Grupamento de Bombeiro Militar - Duque de Caxias',
    shortName: '14º GBM',
    city: 'Duque de Caxias',
    type: 'GBM',
    subunits: ['14_gbm_sede']
  },

  // --- CBA VII – Costa Verde ---
  '10_gbm': {
    id: '10_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_vii',
    name: '10º Grupamento de Bombeiro Militar - Angra dos Reis',
    shortName: '10º GBM',
    city: 'Angra dos Reis',
    type: 'GBM',
    subunits: ['10_gbm_sede', 'dbm_1_10', 'dbm_2_10', 'dbm_3_10', 'dbm_4_10']
  },
  '26_gbm': {
    id: '26_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_vii',
    name: '26º Grupamento de Bombeiro Militar - Paraty',
    shortName: '26º GBM',
    city: 'Paraty',
    type: 'GBM',
    subunits: ['26_gbm_sede', 'dbm_1_26']
  },

  // --- CBA VIII – Atividades Especializadas ---
  'gopp': {
    id: 'gopp',
    orgId: 'cbmerj',
    cbaId: 'cba_viii',
    name: 'Grupamento de Operações com Produtos Perigosos',
    shortName: 'GOPP',
    city: 'Rio de Janeiro',
    type: 'ESPECIAL',
    subunits: ['gopp_sede']
  },
  'goa': {
    id: 'goa',
    orgId: 'cbmerj',
    cbaId: 'cba_viii',
    name: 'Grupamento de Operações Aéreas',
    shortName: 'GOA',
    city: 'Rio de Janeiro',
    type: 'ESPECIAL',
    subunits: ['goa_sede']
  },
  'gtsai': {
    id: 'gtsai',
    orgId: 'cbmerj',
    cbaId: 'cba_viii',
    name: 'Grupamento Tático de Suprimento de Água para Incêndio',
    shortName: 'GTSAI (Caju)',
    city: 'Rio de Janeiro (Caju)',
    type: 'ESPECIAL',
    subunits: ['gtsai_sede']
  },
  'gpe': {
    id: 'gpe',
    orgId: 'cbmerj',
    cbaId: 'cba_viii',
    name: 'Grupamento de Prevenção em Estádios',
    shortName: 'GPE',
    city: 'Rio de Janeiro',
    type: 'ESPECIAL',
    subunits: ['gpe_sede']
  },
  'gep': {
    id: 'gep',
    orgId: 'cbmerj',
    cbaId: 'cba_viii',
    name: 'Grupamento Especial Prisional',
    shortName: 'GEP',
    city: 'Rio de Janeiro',
    type: 'ESPECIAL',
    subunits: ['gep_sede']
  },
  'gb_musicos': {
    id: 'gb_musicos',
    orgId: 'cbmerj',
    cbaId: 'cba_viii',
    name: 'Grupamento de Bombeiros Músicos',
    shortName: 'GBMúsicos',
    city: 'Rio de Janeiro',
    type: 'ESPECIAL',
    subunits: ['gb_musicos_sede']
  },
  '1_gsfma': {
    id: '1_gsfma',
    orgId: 'cbmerj',
    cbaId: 'cba_viii',
    name: '1º Grupamento de Socorro Florestal e Meio Ambiente',
    shortName: '1º GSFMA',
    city: 'Rio de Janeiro (Alto da Boa Vista)',
    type: 'ESPECIAL',
    subunits: ['1_gsfma_sede']
  },
  '2_gsfma': {
    id: '2_gsfma',
    orgId: 'cbmerj',
    cbaId: 'cba_viii',
    name: '2º Grupamento de Socorro Florestal e Meio Ambiente',
    shortName: '2º GSFMA',
    city: 'Magé',
    type: 'ESPECIAL',
    subunits: ['2_gsfma_sede']
  },

  // --- CBA IX – Metropolitana ---
  '3_gbm': {
    id: '3_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_ix',
    name: '3º Grupamento de Bombeiro Militar - Niterói',
    shortName: '3º GBM',
    city: 'Niterói',
    type: 'GBM',
    subunits: ['3_gbm_sede']
  },
  '8_gbm': {
    id: '8_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_ix',
    name: '8º Grupamento de Bombeiro Militar - Campinho',
    shortName: '8º GBM',
    city: 'Rio de Janeiro (Campinho)',
    type: 'GBM',
    subunits: ['8_gbm_sede']
  },
  '12_gbm': {
    id: '12_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_ix',
    name: '12º Grupamento de Bombeiro Militar - Jacarepaguá',
    shortName: '12º GBM',
    city: 'Rio de Janeiro (Jacarepaguá)',
    type: 'GBM',
    subunits: ['12_gbm_sede']
  },
  '13_gbm': {
    id: '13_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_ix',
    name: '13º Grupamento de Bombeiro Militar - Campo Grande',
    shortName: '13º GBM',
    city: 'Rio de Janeiro (Campo Grande)',
    type: 'GBM',
    subunits: ['13_gbm_sede']
  },
  '19_gbm': {
    id: '19_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_ix',
    name: '19º Grupamento de Bombeiro Militar - Ilha do Governador',
    shortName: '19º GBM',
    city: 'Rio de Janeiro (Ilha do Governador)',
    type: 'GBM',
    subunits: ['19_gbm_sede']
  },
  '20_gbm': {
    id: '20_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_ix',
    name: '20º Grupamento de Bombeiro Militar - São Gonçalo',
    shortName: '20º GBM',
    city: 'São Gonçalo',
    type: 'GBM',
    subunits: ['20_gbm_sede']
  },
  '24_gbm': {
    id: '24_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_ix',
    name: '24º Grupamento de Bombeiro Militar - Irajá',
    shortName: '24º GBM',
    city: 'Rio de Janeiro (Irajá)',
    type: 'GBM',
    subunits: ['24_gbm_sede']
  },
  '28_gbm': {
    id: '28_gbm',
    orgId: 'cbmerj',
    cbaId: 'cba_ix',
    name: '28º Grupamento de Bombeiro Militar - Penha',
    shortName: '28º GBM',
    city: 'Rio de Janeiro (Penha)',
    type: 'GBM',
    subunits: ['28_gbm_sede']
  },

  // --- CBA X / XI – Atividades de Salvamentos Marítimos ---
  '1_gbs': {
    id: '1_gbs',
    orgId: 'cbmerj',
    cbaId: 'cba_x',
    name: '1º Grupamento de Busca e Salvamento',
    shortName: '1º GBS',
    city: 'Rio de Janeiro (Barra da Tijuca)',
    type: 'GBS',
    subunits: ['1_gbs_sede']
  },
  '1_gmar': {
    id: '1_gmar',
    orgId: 'cbmerj',
    cbaId: 'cba_x',
    name: '1º Grupamento Marítimo - Botafogo',
    shortName: '1º GMAR',
    city: 'Rio de Janeiro (Botafogo)',
    type: 'GMAR',
    subunits: ['1_gmar_sede']
  },
  '2_gmar': {
    id: '2_gmar',
    orgId: 'cbmerj',
    cbaId: 'cba_x',
    name: '2º Grupamento Marítimo - Barra da Tijuca',
    shortName: '2º GMAR',
    city: 'Rio de Janeiro (Barra da Tijuca)',
    type: 'GMAR',
    subunits: ['2_gmar_sede']
  },
  '3_gmar': {
    id: '3_gmar',
    orgId: 'cbmerj',
    cbaId: 'cba_x',
    name: '3º Grupamento Marítimo - Copacabana',
    shortName: '3º GMAR',
    city: 'Rio de Janeiro (Copacabana)',
    type: 'GMAR',
    subunits: ['3_gmar_sede']
  },
  '4_gmar': {
    id: '4_gmar',
    orgId: 'cbmerj',
    cbaId: 'cba_x',
    name: '4º Grupamento Marítimo - Itaipu',
    shortName: '4º GMAR',
    city: 'Niterói (Itaipu)',
    type: 'GMAR',
    subunits: ['4_gmar_sede']
  },

  // --- Complexo de Saúde, Policlínicas e Órgãos Especiais ---
  'gse': {
    id: 'gse',
    orgId: 'cbmerj',
    cbaId: 'cba_viii',
    name: 'Grupamento de Socorro de Emergência - GSE',
    shortName: 'GSE',
    city: 'Rio de Janeiro',
    type: 'ESPECIAL',
    subunits: ['gse_sede']
  },
  'hcap': {
    id: 'hcap',
    orgId: 'cbmerj',
    cbaId: 'cba_i',
    name: 'Hospital Central Aristarcho Pessoa - HCAP',
    shortName: 'HCAP',
    city: 'Rio de Janeiro (Rio Comprido)',
    type: 'ESPECIAL',
    subunits: ['hcap_sede']
  },
  'dgs': {
    id: 'dgs',
    orgId: 'cbmerj',
    cbaId: 'cba_i',
    name: 'Diretoria-Geral de Saúde - DGS',
    shortName: 'DGS',
    city: 'Rio de Janeiro',
    type: 'ESPECIAL',
    subunits: ['dgs_sede']
  },
  'cpm': {
    id: 'cpm',
    orgId: 'cbmerj',
    cbaId: 'cba_i',
    name: 'Centro de Perícias Médicas - CPM',
    shortName: 'CPM',
    city: 'Rio de Janeiro',
    type: 'ESPECIAL',
    subunits: ['cpm_sede']
  },
  'coaph': {
    id: 'coaph',
    orgId: 'cbmerj',
    cbaId: 'cba_i',
    name: 'Centro de Operações de Atendimento Pré-Hospitalar - COAPH',
    shortName: 'COAPH',
    city: 'Rio de Janeiro',
    type: 'ESPECIAL',
    subunits: ['coaph_sede']
  },
  'policlinica_1': {
    id: 'policlinica_1',
    orgId: 'cbmerj',
    cbaId: 'cba_i',
    name: '1ª Policlínica - Campinho',
    shortName: '1ª Policlínica',
    city: 'Rio de Janeiro (Campinho)',
    type: 'ESPECIAL',
    subunits: ['policlinica_1_sede']
  },
  'policlinica_2': {
    id: 'policlinica_2',
    orgId: 'cbmerj',
    cbaId: 'cba_vi',
    name: '2ª Policlínica - Nova Iguaçu',
    shortName: '2ª Policlínica',
    city: 'Nova Iguaçu',
    type: 'ESPECIAL',
    subunits: ['policlinica_2_sede']
  },
  'policlinica_3': {
    id: 'policlinica_3',
    orgId: 'cbmerj',
    cbaId: 'cba_ix',
    name: '3ª Policlínica - Niterói',
    shortName: '3ª Policlínica',
    city: 'Niterói',
    type: 'ESPECIAL',
    subunits: ['policlinica_3_sede']
  },
  'policlinica_4': {
    id: 'policlinica_4',
    orgId: 'cbmerj',
    cbaId: 'cba_iv',
    name: '4ª Policlínica - Campos dos Goytacazes',
    shortName: '4ª Policlínica',
    city: 'Campos dos Goytacazes',
    type: 'ESPECIAL',
    subunits: ['policlinica_4_sede']
  },
  'dgp_oe': {
    id: 'dgp_oe',
    orgId: 'cbmerj',
    cbaId: 'cbmerj_geral',
    name: 'Órgãos Externos / DGP',
    shortName: 'DGP/OE',
    city: 'Rio de Janeiro',
    type: 'ESPECIAL',
    subunits: ['dgp_oe_sede']
  },
  'cbmerj_geral': {
    id: 'cbmerj_geral',
    orgId: 'cbmerj',
    cbaId: 'cbmerj_geral',
    name: 'Comando-Geral / Órgãos Especiais',
    shortName: 'CBMERJ Geral',
    city: 'Rio de Janeiro',
    type: 'ESPECIAL',
    subunits: ['cbmerj_geral_sede']
  }
};

// ============================================================================
// 3. CATÁLOGO OFICIAL: SUBUNIDADES (SEDES E DESTACAMENTOS / DBMs)
// ============================================================================

export const CANONICAL_SUBUNITS: Record<string, Subunit> = {
  // --- CBA I Sedes ---
  '1_gbm_sede': { id: '1_gbm_sede', unitId: '1_gbm', cbaId: 'cba_i', orgId: 'cbmerj', name: '1º GBM - Humaitá (Sede)', shortName: '1º GBM Sede', location: 'Humaitá', isSede: true },
  '2_gbm_sede': { id: '2_gbm_sede', unitId: '2_gbm', cbaId: 'cba_i', orgId: 'cbmerj', name: '2º GBM - Méier (Sede)', shortName: '2º GBM Sede', location: 'Méier', isSede: true },
  '11_gbm_sede': { id: '11_gbm_sede', unitId: '11_gbm', cbaId: 'cba_i', orgId: 'cbmerj', name: '11º GBM - Vila Isabel (Sede)', shortName: '11º GBM Sede', location: 'Vila Isabel', isSede: true },
  '17_gbm_sede': { id: '17_gbm_sede', unitId: '17_gbm', cbaId: 'cba_i', orgId: 'cbmerj', name: '17º GBM - Copacabana (Sede)', shortName: '17º GBM Sede', location: 'Copacabana', isSede: true },
  '25_gbm_sede': { id: '25_gbm_sede', unitId: '25_gbm', cbaId: 'cba_i', orgId: 'cbmerj', name: '25º GBM - Gávea (Sede)', shortName: '25º GBM Sede', location: 'Gávea', isSede: true },

  // --- CBA II Sedes ---
  '6_gbm_sede': { id: '6_gbm_sede', unitId: '6_gbm', cbaId: 'cba_ii', orgId: 'cbmerj', name: '6º GBM - Nova Friburgo (Sede)', shortName: '6º GBM Sede', location: 'Nova Friburgo', isSede: true },
  '15_gbm_sede': { id: '15_gbm_sede', unitId: '15_gbm', cbaId: 'cba_ii', orgId: 'cbmerj', name: '15º GBM - Petrópolis (Sede)', shortName: '15º GBM Sede', location: 'Petrópolis', isSede: true },
  '16_gbm_sede': { id: '16_gbm_sede', unitId: '16_gbm', cbaId: 'cba_ii', orgId: 'cbmerj', name: '16º GBM - Teresópolis (Sede)', shortName: '16º GBM Sede', location: 'Teresópolis', isSede: true },

  // --- CBA III Sedes ---
  '7_gbm_sede': { id: '7_gbm_sede', unitId: '7_gbm', cbaId: 'cba_iii', orgId: 'cbmerj', name: '7º GBM - Barra Mansa (Sede)', shortName: '7º GBM Sede', location: 'Barra Mansa', isSede: true },
  '22_gbm_sede': { id: '22_gbm_sede', unitId: '22_gbm', cbaId: 'cba_iii', orgId: 'cbmerj', name: '22º GBM - Volta Redonda (Sede)', shortName: '22º GBM Sede', location: 'Volta Redonda', isSede: true },
  '23_gbm_sede': { id: '23_gbm_sede', unitId: '23_gbm', cbaId: 'cba_iii', orgId: 'cbmerj', name: '23º GBM - Resende (Sede)', shortName: '23º GBM Sede', location: 'Resende', isSede: true },

  // --- CBA IV Sedes ---
  '5_gbm_sede': { id: '5_gbm_sede', unitId: '5_gbm', cbaId: 'cba_iv', orgId: 'cbmerj', name: '5º GBM - Campos dos Goytacazes (Sede)', shortName: '5º GBM Sede', location: 'Campos dos Goytacazes', isSede: true },
  '9_gbm_sede': { id: '9_gbm_sede', unitId: '9_gbm', cbaId: 'cba_iv', orgId: 'cbmerj', name: '9º GBM - Macaé (Sede)', shortName: '9º GBM Sede', location: 'Macaé', isSede: true },
  '21_gbm_sede': { id: '21_gbm_sede', unitId: '21_gbm', cbaId: 'cba_iv', orgId: 'cbmerj', name: '21º GBM - Itaperuna (Sede)', shortName: '21º GBM Sede', location: 'Itaperuna', isSede: true },

  // --- CBA V Sedes ---
  '18_gbm_sede': { id: '18_gbm_sede', unitId: '18_gbm', cbaId: 'cba_v', orgId: 'cbmerj', name: '18º GBM - Cabo Frio (Sede)', shortName: '18º GBM Sede', location: 'Cabo Frio', isSede: true },
  '27_gbm_sede': { id: '27_gbm_sede', unitId: '27_gbm', cbaId: 'cba_v', orgId: 'cbmerj', name: '27º GBM - Araruama (Sede)', shortName: '27º GBM Sede', location: 'Araruama', isSede: true },

  // --- CBA VI Sedes ---
  '4_gbm_sede': { id: '4_gbm_sede', unitId: '4_gbm', cbaId: 'cba_vi', orgId: 'cbmerj', name: '4º GBM - Nova Iguaçu (Sede)', shortName: '4º GBM Sede', location: 'Nova Iguaçu', isSede: true },
  '14_gbm_sede': { id: '14_gbm_sede', unitId: '14_gbm', cbaId: 'cba_vi', orgId: 'cbmerj', name: '14º GBM - Duque de Caxias (Sede)', shortName: '14º GBM Sede', location: 'Duque de Caxias', isSede: true },

  // --- CBA VII – Costa Verde (10º GBM e 26º GBM com DBMs) ---
  '10_gbm_sede': {
    id: '10_gbm_sede',
    unitId: '10_gbm',
    cbaId: 'cba_vii',
    orgId: 'cbmerj',
    name: '10º GBM - Sede (Angra dos Reis)',
    shortName: '10º GBM Sede',
    location: 'Angra dos Reis (Balneário)',
    isSede: true
  },
  'dbm_1_10': {
    id: 'dbm_1_10',
    unitId: '10_gbm',
    cbaId: 'cba_vii',
    orgId: 'cbmerj',
    name: 'DBM 1/10 - Itaguaí',
    shortName: 'DBM 1/10 (Itaguaí)',
    location: 'Itaguaí',
    isSede: false
  },
  'dbm_2_10': {
    id: 'dbm_2_10',
    unitId: '10_gbm',
    cbaId: 'cba_vii',
    orgId: 'cbmerj',
    name: 'DBM 2/10 - Ilha Grande',
    shortName: 'DBM 2/10 (Ilha Grande)',
    location: 'Ilha Grande (Vila do Abraão)',
    isSede: false
  },
  'dbm_3_10': {
    id: 'dbm_3_10',
    unitId: '10_gbm',
    cbaId: 'cba_vii',
    orgId: 'cbmerj',
    name: 'DBM 3/10 - Frade',
    shortName: 'DBM 3/10 (Frade)',
    location: 'Frade / Mambucaba',
    isSede: false
  },
  'dbm_4_10': {
    id: 'dbm_4_10',
    unitId: '10_gbm',
    cbaId: 'cba_vii',
    orgId: 'cbmerj',
    name: 'DBM 4/10 - Mangaratiba',
    shortName: 'DBM 4/10 (Mangaratiba)',
    location: 'Mangaratiba',
    isSede: false
  },
  '26_gbm_sede': {
    id: '26_gbm_sede',
    unitId: '26_gbm',
    cbaId: 'cba_vii',
    orgId: 'cbmerj',
    name: '26º GBM - Sede (Paraty)',
    shortName: '26º GBM Sede',
    location: 'Paraty',
    isSede: true
  },
  'dbm_1_26': {
    id: 'dbm_1_26',
    unitId: '26_gbm',
    cbaId: 'cba_vii',
    orgId: 'cbmerj',
    name: 'DBM 1/26 - Parque Mambucaba',
    shortName: 'DBM 1/26 (P. Mambucaba)',
    location: 'Parque Mambucaba',
    isSede: false
  },

  // --- CBA VIII Sedes ---
  'gopp_sede': { id: 'gopp_sede', unitId: 'gopp', cbaId: 'cba_viii', orgId: 'cbmerj', name: 'GOPP - Sede', shortName: 'GOPP Sede', location: 'Rio de Janeiro', isSede: true },
  'goa_sede': { id: 'goa_sede', unitId: 'goa', cbaId: 'cba_viii', orgId: 'cbmerj', name: 'GOA - Sede', shortName: 'GOA Sede', location: 'Rio de Janeiro', isSede: true },
  'gtsai_sede': { id: 'gtsai_sede', unitId: 'gtsai', cbaId: 'cba_viii', orgId: 'cbmerj', name: 'GTSAI - Caju (Sede)', shortName: 'GTSAI Sede', location: 'Rio de Janeiro (Caju)', isSede: true },
  'gpe_sede': { id: 'gpe_sede', unitId: 'gpe', cbaId: 'cba_viii', orgId: 'cbmerj', name: 'GPE - Sede', shortName: 'GPE Sede', location: 'Rio de Janeiro', isSede: true },
  'gep_sede': { id: 'gep_sede', unitId: 'gep', cbaId: 'cba_viii', orgId: 'cbmerj', name: 'GEP - Sede', shortName: 'GEP Sede', location: 'Rio de Janeiro', isSede: true },
  'gb_musicos_sede': { id: 'gb_musicos_sede', unitId: 'gb_musicos', cbaId: 'cba_viii', orgId: 'cbmerj', name: 'GBMúsicos - Sede', shortName: 'GBMúsicos Sede', location: 'Rio de Janeiro', isSede: true },
  '1_gsfma_sede': { id: '1_gsfma_sede', unitId: '1_gsfma', cbaId: 'cba_viii', orgId: 'cbmerj', name: '1º GSFMA - Alto da Boa Vista (Sede)', shortName: '1º GSFMA Sede', location: 'Alto da Boa Vista', isSede: true },
  '2_gsfma_sede': { id: '2_gsfma_sede', unitId: '2_gsfma', cbaId: 'cba_viii', orgId: 'cbmerj', name: '2º GSFMA - Magé (Sede)', shortName: '2º GSFMA Sede', location: 'Magé', isSede: true },

  // --- CBA IX Sedes ---
  '3_gbm_sede': { id: '3_gbm_sede', unitId: '3_gbm', cbaId: 'cba_ix', orgId: 'cbmerj', name: '3º GBM - Niterói (Sede)', shortName: '3º GBM Sede', location: 'Niterói', isSede: true },
  '8_gbm_sede': { id: '8_gbm_sede', unitId: '8_gbm', cbaId: 'cba_ix', orgId: 'cbmerj', name: '8º GBM - Campinho (Sede)', shortName: '8º GBM Sede', location: 'Campinho', isSede: true },
  '12_gbm_sede': { id: '12_gbm_sede', unitId: '12_gbm', cbaId: 'cba_ix', orgId: 'cbmerj', name: '12º GBM - Jacarepaguá (Sede)', shortName: '12º GBM Sede', location: 'Jacarepaguá', isSede: true },
  '13_gbm_sede': { id: '13_gbm_sede', unitId: '13_gbm', cbaId: 'cba_ix', orgId: 'cbmerj', name: '13º GBM - Campo Grande (Sede)', shortName: '13º GBM Sede', location: 'Campo Grande', isSede: true },
  '19_gbm_sede': { id: '19_gbm_sede', unitId: '19_gbm', cbaId: 'cba_ix', orgId: 'cbmerj', name: '19º GBM - Ilha do Governador (Sede)', shortName: '19º GBM Sede', location: 'Ilha do Governador', isSede: true },
  '20_gbm_sede': { id: '20_gbm_sede', unitId: '20_gbm', cbaId: 'cba_ix', orgId: 'cbmerj', name: '20º GBM - São Gonçalo (Sede)', shortName: '20º GBM Sede', location: 'São Gonçalo', isSede: true },
  '24_gbm_sede': { id: '24_gbm_sede', unitId: '24_gbm', cbaId: 'cba_ix', orgId: 'cbmerj', name: '24º GBM - Irajá (Sede)', shortName: '24º GBM Sede', location: 'Irajá', isSede: true },
  '28_gbm_sede': { id: '28_gbm_sede', unitId: '28_gbm', cbaId: 'cba_ix', orgId: 'cbmerj', name: '28º GBM - Penha (Sede)', shortName: '28º GBM Sede', location: 'Penha', isSede: true },

  // --- CBA X / XI Sedes ---
  '1_gbs_sede': { id: '1_gbs_sede', unitId: '1_gbs', cbaId: 'cba_x', orgId: 'cbmerj', name: '1º GBS - Barra da Tijuca (Sede)', shortName: '1º GBS Sede', location: 'Barra da Tijuca', isSede: true },
  '1_gmar_sede': { id: '1_gmar_sede', unitId: '1_gmar', cbaId: 'cba_x', orgId: 'cbmerj', name: '1º GMAR - Botafogo (Sede)', shortName: '1º GMAR Sede', location: 'Botafogo', isSede: true },
  '2_gmar_sede': { id: '2_gmar_sede', unitId: '2_gmar', cbaId: 'cba_x', orgId: 'cbmerj', name: '2º GMAR - Barra da Tijuca (Sede)', shortName: '2º GMAR Sede', location: 'Barra da Tijuca', isSede: true },
  '3_gmar_sede': { id: '3_gmar_sede', unitId: '3_gmar', cbaId: 'cba_x', orgId: 'cbmerj', name: '3º GMAR - Copacabana (Sede)', shortName: '3º GMAR Sede', location: 'Copacabana', isSede: true },
  '4_gmar_sede': { id: '4_gmar_sede', unitId: '4_gmar', cbaId: 'cba_x', orgId: 'cbmerj', name: '4º GMAR - Itaipu (Sede)', shortName: '4º GMAR Sede', location: 'Niterói (Itaipu)', isSede: true },

  // --- Complexo de Saúde, Policlínicas e Órgãos Especiais ---
  'gse_sede': { id: 'gse_sede', unitId: 'gse', cbaId: 'cba_viii', orgId: 'cbmerj', name: 'GSE - Sede', shortName: 'GSE Sede', location: 'Rio de Janeiro', isSede: true },
  'hcap_sede': { id: 'hcap_sede', unitId: 'hcap', cbaId: 'cba_i', orgId: 'cbmerj', name: 'HCAP - Sede', shortName: 'HCAP Sede', location: 'Rio de Janeiro (Rio Comprido)', isSede: true },
  'dgs_sede': { id: 'dgs_sede', unitId: 'dgs', cbaId: 'cba_i', orgId: 'cbmerj', name: 'DGS - Sede', shortName: 'DGS Sede', location: 'Rio de Janeiro', isSede: true },
  'cpm_sede': { id: 'cpm_sede', unitId: 'cpm', cbaId: 'cba_i', orgId: 'cbmerj', name: 'CPM - Sede', shortName: 'CPM Sede', location: 'Rio de Janeiro', isSede: true },
  'coaph_sede': { id: 'coaph_sede', unitId: 'coaph', cbaId: 'cba_i', orgId: 'cbmerj', name: 'COAPH - Sede', shortName: 'COAPH Sede', location: 'Rio de Janeiro', isSede: true },
  'policlinica_1_sede': { id: 'policlinica_1_sede', unitId: 'policlinica_1', cbaId: 'cba_i', orgId: 'cbmerj', name: '1ª Policlínica - Campinho (Sede)', shortName: '1ª Policlínica Sede', location: 'Campinho', isSede: true },
  'policlinica_2_sede': { id: 'policlinica_2_sede', unitId: 'policlinica_2', cbaId: 'cba_vi', orgId: 'cbmerj', name: '2ª Policlínica - Nova Iguaçu (Sede)', shortName: '2ª Policlínica Sede', location: 'Nova Iguaçu', isSede: true },
  'policlinica_3_sede': { id: 'policlinica_3_sede', unitId: 'policlinica_3', cbaId: 'cba_ix', orgId: 'cbmerj', name: '3ª Policlínica - Niterói (Sede)', shortName: '3ª Policlínica Sede', location: 'Niterói', isSede: true },
  'policlinica_4_sede': { id: 'policlinica_4_sede', unitId: 'policlinica_4', cbaId: 'cba_iv', orgId: 'cbmerj', name: '4ª Policlínica - Campos (Sede)', shortName: '4ª Policlínica Sede', location: 'Campos dos Goytacazes', isSede: true },
  'dgp_oe_sede': { id: 'dgp_oe_sede', unitId: 'dgp_oe', cbaId: 'cbmerj_geral', orgId: 'cbmerj', name: 'DGP/Órgãos Externos - Sede', shortName: 'DGP/OE Sede', location: 'Rio de Janeiro', isSede: true },
  'cbmerj_geral_sede': { id: 'cbmerj_geral_sede', unitId: 'cbmerj_geral', cbaId: 'cbmerj_geral', orgId: 'cbmerj', name: 'CBMERJ Geral - Sede', shortName: 'CBMERJ Sede', location: 'Rio de Janeiro', isSede: true }
};

/**
 * Escopo canônico padrão de fallback (10º GBM Sede)
 */
export const DEFAULT_CANONICAL_SCOPE: ScopeContext = {
  orgId: 'cbmerj',
  cbaId: 'cba_vii',
  unitId: '10_gbm',
  subunitId: '10_gbm_sede'
};

// ============================================================================
// 4. RESOLVER CANÔNICO INTELIGENTE (RETROCOMPATIBILIDADE PURA)
// ============================================================================

/**
 * Normaliza qualquer entrada de texto, chave legada ou código de OBM
 * para o objeto ScopeContext canônico e tipado.
 */
export function resolveCanonicalScope(rawObm?: string | null): ScopeContext {
  if (!rawObm) {
    return { ...DEFAULT_CANONICAL_SCOPE };
  }

  const raw = String(rawObm).trim();
  const lower = raw.toLowerCase().replace(/[\s\-_/]+/g, '_');
  const normalized = lower.replace(/[º°ª]/g, '').replace(/_+/g, '_');
  const upper = raw.toUpperCase();

  // 1. Verificação direta por IDs canônicos de subunidade
  const matchedSub = CANONICAL_SUBUNITS[lower] || CANONICAL_SUBUNITS[normalized];
  if (matchedSub) {
    return {
      orgId: matchedSub.orgId,
      cbaId: matchedSub.cbaId,
      unitId: matchedSub.unitId,
      subunitId: matchedSub.id
    };
  }

  // 2. Verificação direta por IDs canônicos de unidade (aponta para a sede)
  const matchedUnit = CANONICAL_UNITS[lower] || CANONICAL_UNITS[normalized];
  if (matchedUnit) {
    const sedeId = `${matchedUnit.id}_sede`;
    return {
      orgId: matchedUnit.orgId,
      cbaId: matchedUnit.cbaId,
      unitId: matchedUnit.id,
      subunitId: CANONICAL_SUBUNITS[sedeId] ? sedeId : matchedUnit.subunits[0]
    };
  }

  // 2.1 Verificação inteligente por número de GBM (ex: "5º GBM - Campos", "22º GBM", "18º GBM")
  const gbmNumMatch = upper.match(/(\d+)[º°ª]?\s*GBM/);
  if (gbmNumMatch) {
    const unitKey = `${gbmNumMatch[1]}_gbm`;
    const unitObj = CANONICAL_UNITS[unitKey];
    if (unitObj) {
      const sedeId = `${unitObj.id}_sede`;
      return {
        orgId: unitObj.orgId,
        cbaId: unitObj.cbaId,
        unitId: unitObj.id,
        subunitId: CANONICAL_SUBUNITS[sedeId] ? sedeId : unitObj.subunits[0]
      };
    }
  }

  // 2.2 Verificação inteligente por número de GMAR (ex: "1º GMAR", "2º GMAR", "3º GMAR", "4º GMAR")
  const gmarNumMatch = upper.match(/(\d+)[º°ª]?\s*GMAR/);
  if (gmarNumMatch) {
    const unitKey = `${gmarNumMatch[1]}_gmar`;
    const unitObj = CANONICAL_UNITS[unitKey];
    if (unitObj) {
      const sedeId = `${unitObj.id}_sede`;
      return {
        orgId: unitObj.orgId,
        cbaId: unitObj.cbaId,
        unitId: unitObj.id,
        subunitId: CANONICAL_SUBUNITS[sedeId] ? sedeId : unitObj.subunits[0]
      };
    }
  }

  // 2.3 Verificação inteligente por DBM (ex: "1/10", "2/10", "3/10", "4/10", "1/26")
  const dbmSlashMatch = upper.match(/(\d+)\s*\/\s*(\d+)/);
  if (dbmSlashMatch) {
    const subKey = `dbm_${dbmSlashMatch[1]}_${dbmSlashMatch[2]}`;
    const subObj = CANONICAL_SUBUNITS[subKey];
    if (subObj) {
      return {
        orgId: subObj.orgId,
        cbaId: subObj.cbaId,
        unitId: subObj.unitId,
        subunitId: subObj.id
      };
    }
  }

  // 3. Mapeamento das Variações de Subunidades

  // DBM 2/10 - Ilha Grande
  if (
    upper.includes('2/10') ||
    upper.includes('ILHA GRANDE') ||
    upper.includes('ABRAAO') ||
    upper.includes('ABRAÃO') ||
    lower.includes('dbm_2_10') ||
    lower === '2_10'
  ) {
    const sub = CANONICAL_SUBUNITS['dbm_2_10'];
    return { orgId: sub.orgId, cbaId: sub.cbaId, unitId: sub.unitId, subunitId: sub.id };
  }

  // DBM 3/10 - Frade
  if (
    upper.includes('3/10') ||
    upper.includes('FRADE') ||
    lower.includes('dbm_3_10') ||
    lower === '3_10'
  ) {
    const sub = CANONICAL_SUBUNITS['dbm_3_10'];
    return { orgId: sub.orgId, cbaId: sub.cbaId, unitId: sub.unitId, subunitId: sub.id };
  }

  // DBM 4/10 - Mangaratiba
  if (
    upper.includes('4/10') ||
    upper.includes('MANGARATIBA') ||
    lower.includes('dbm_4_10') ||
    lower === '4_10'
  ) {
    const sub = CANONICAL_SUBUNITS['dbm_4_10'];
    return { orgId: sub.orgId, cbaId: sub.cbaId, unitId: sub.unitId, subunitId: sub.id };
  }

  // DBM 1/10 - Itaguaí
  if (
    upper.includes('1/10') ||
    upper.includes('ITAGUAI') ||
    upper.includes('ITAGUAÍ') ||
    lower.includes('dbm_1_10') ||
    lower === '1_10'
  ) {
    const sub = CANONICAL_SUBUNITS['dbm_1_10'];
    return { orgId: sub.orgId, cbaId: sub.cbaId, unitId: sub.unitId, subunitId: sub.id };
  }

  // DBM 1/26 - Parque Mambucaba
  if (
    upper.includes('1/26') ||
    upper.includes('PARQUE MAMBUCABA') ||
    upper.includes('MAMBUCABA') ||
    lower.includes('dbm_1_26') ||
    lower === '1_26'
  ) {
    const sub = CANONICAL_SUBUNITS['dbm_1_26'];
    return { orgId: sub.orgId, cbaId: sub.cbaId, unitId: sub.unitId, subunitId: sub.id };
  }

  // 4. Mapeamento das Unidades / Sedes e Setores de Saúde
  if (upper.includes('GSE') || upper.includes('SOCORRO DE EMERGÊNCIA')) {
    const sub = CANONICAL_SUBUNITS['gse_sede'];
    return { orgId: sub.orgId, cbaId: sub.cbaId, unitId: sub.unitId, subunitId: sub.id };
  }
  if (upper.includes('HCAP') || upper.includes('ARISTARCHO PESSOA') || upper.includes('HOSPITAL CENTRAL')) {
    const sub = CANONICAL_SUBUNITS['hcap_sede'];
    return { orgId: sub.orgId, cbaId: sub.cbaId, unitId: sub.unitId, subunitId: sub.id };
  }
  if (upper.includes('DGS') || upper.includes('DIRETORIA-GERAL DE SAÚDE') || upper.includes('DIRETORIA GERAL DE SAUDE')) {
    const sub = CANONICAL_SUBUNITS['dgs_sede'];
    return { orgId: sub.orgId, cbaId: sub.cbaId, unitId: sub.unitId, subunitId: sub.id };
  }
  if (upper.includes('CPM') || upper.includes('PERÍCIAS MÉDICAS') || upper.includes('PERICIAS MEDICAS')) {
    const sub = CANONICAL_SUBUNITS['cpm_sede'];
    return { orgId: sub.orgId, cbaId: sub.cbaId, unitId: sub.unitId, subunitId: sub.id };
  }
  if (upper.includes('COAPH')) {
    const sub = CANONICAL_SUBUNITS['coaph_sede'];
    return { orgId: sub.orgId, cbaId: sub.cbaId, unitId: sub.unitId, subunitId: sub.id };
  }
  if (upper.includes('1ª POLICLÍNICA') || upper.includes('1 POLICLINICA') || upper.includes('CTQUIM')) {
    const sub = CANONICAL_SUBUNITS['policlinica_1_sede'];
    return { orgId: sub.orgId, cbaId: sub.cbaId, unitId: sub.unitId, subunitId: sub.id };
  }
  if (upper.includes('2ª POLICLÍNICA') || upper.includes('2 POLICLINICA')) {
    const sub = CANONICAL_SUBUNITS['policlinica_2_sede'];
    return { orgId: sub.orgId, cbaId: sub.cbaId, unitId: sub.unitId, subunitId: sub.id };
  }
  if (upper.includes('3ª POLICLÍNICA') || upper.includes('3 POLICLINICA')) {
    const sub = CANONICAL_SUBUNITS['policlinica_3_sede'];
    return { orgId: sub.orgId, cbaId: sub.cbaId, unitId: sub.unitId, subunitId: sub.id };
  }
  if (upper.includes('4ª POLICLÍNICA') || upper.includes('4 POLICLINICA')) {
    const sub = CANONICAL_SUBUNITS['policlinica_4_sede'];
    return { orgId: sub.orgId, cbaId: sub.cbaId, unitId: sub.unitId, subunitId: sub.id };
  }
  if (upper.includes('DGP/OE') || upper.includes('DGP') || upper.includes('ALERJ') || upper.includes('PGE') || upper.includes('TRIBUNAL') || upper.includes('PREFEITURA')) {
    const sub = CANONICAL_SUBUNITS['dgp_oe_sede'];
    return { orgId: sub.orgId, cbaId: sub.cbaId, unitId: sub.unitId, subunitId: sub.id };
  }

  // 26º GBM - Paraty (Sede)
  const is26Gbm =
    upper.includes('26º') ||
    upper.includes('26°') ||
    upper.includes('26 GBM') ||
    upper.includes('26GBM') ||
    upper.includes('PARATY') ||
    upper.includes('PARATI') ||
    upper === '26' ||
    lower === '26_gbm' ||
    lower.includes('26_gbm_sede');

  if (is26Gbm) {
    const sub = CANONICAL_SUBUNITS['26_gbm_sede'];
    return { orgId: sub.orgId, cbaId: sub.cbaId, unitId: sub.unitId, subunitId: sub.id };
  }

  // 10º GBM - Angra dos Reis
  const is10Gbm =
    upper.includes('10º') ||
    upper.includes('10°') ||
    upper.includes('10 GBM') ||
    upper.includes('10GBM') ||
    upper.includes('ANGRA') ||
    upper.includes('COSTA VERDE') ||
    upper === '10' ||
    lower === '10_gbm' ||
    lower.includes('10_gbm_sede');

  if (is10Gbm) {
    const sub = CANONICAL_SUBUNITS['10_gbm_sede'];
    return { orgId: sub.orgId, cbaId: sub.cbaId, unitId: sub.unitId, subunitId: sub.id };
  }

  // Fallback seguro: se não especificado, assume padrão do sistema; se for string desconhecida, direciona ao CBMERJ Geral
  if (!rawObm || rawObm.trim() === '') {
    return { ...DEFAULT_CANONICAL_SCOPE };
  }

  const subGeral = CANONICAL_SUBUNITS['cbmerj_geral_sede'];
  return {
    orgId: subGeral.orgId,
    cbaId: subGeral.cbaId,
    unitId: subGeral.unitId,
    subunitId: subGeral.id
  };
}

// ============================================================================
// 5. FUNÇÕES AUXILIARES DE FORMATAÇÃO E CONSULTA
// ============================================================================

export function getCanonicalOrganization(orgId: string = 'cbmerj'): Organization | undefined {
  return CANONICAL_ORGANIZATIONS[orgId];
}

export function getCanonicalRegionalCommand(cbaId: string = 'cba_vii'): RegionalCommand | undefined {
  return CANONICAL_REGIONAL_COMMANDS[cbaId];
}

export function getAllCanonicalRegionalCommands(): RegionalCommand[] {
  return Object.values(CANONICAL_REGIONAL_COMMANDS);
}

export function getUnitsAndSubunitsForRegionalCommand(cbaId: string): { units: MilitaryUnit[]; subunits: Subunit[] } {
  const units = Object.values(CANONICAL_UNITS).filter(u => u.cbaId === cbaId);
  const subunits = Object.values(CANONICAL_SUBUNITS).filter(s => s.cbaId === cbaId);
  return { units, subunits };
}

export function getCanonicalUnit(unitId: string): MilitaryUnit | undefined {
  return CANONICAL_UNITS[unitId];
}

export function getCanonicalSubunit(subunitId: string): Subunit | undefined {
  return CANONICAL_SUBUNITS[subunitId];
}

export function getCanonicalSubunitsForUnit(unitId: string): Subunit[] {
  const unit = CANONICAL_UNITS[unitId];
  if (!unit) return [];
  return unit.subunits.map(id => CANONICAL_SUBUNITS[id]).filter(Boolean);
}

export function getAllCanonicalUnits(): MilitaryUnit[] {
  return Object.values(CANONICAL_UNITS);
}

export function getAllCanonicalSubunits(): Subunit[] {
  return Object.values(CANONICAL_SUBUNITS);
}

export function formatScopeLabel(scope?: Partial<ScopeContext> | null): string {
  if (!scope) return '10º GBM - Sede';
  if (scope.subunitId && CANONICAL_SUBUNITS[scope.subunitId]) {
    return CANONICAL_SUBUNITS[scope.subunitId].name;
  }
  if (scope.unitId && CANONICAL_UNITS[scope.unitId]) {
    return CANONICAL_UNITS[scope.unitId].shortName;
  }
  return '10º GBM - Sede';
}

export function formatUnitLabel(unitId?: string | null): string {
  if (!unitId || !CANONICAL_UNITS[unitId]) return '10º GBM';
  return CANONICAL_UNITS[unitId].shortName;
}

export function formatSubunitLabel(subunitId?: string | null): string {
  if (!subunitId || !CANONICAL_SUBUNITS[subunitId]) return '10º GBM - Sede';
  return CANONICAL_SUBUNITS[subunitId].shortName;
}

export function isSameScope(a?: ScopeContext | null, b?: ScopeContext | null): boolean {
  if (!a || !b) return false;
  return (
    a.orgId === b.orgId &&
    a.cbaId === b.cbaId &&
    a.unitId === b.unitId &&
    a.subunitId === b.subunitId
  );
}

export function isSameUnit(a?: ScopeContext | null, b?: ScopeContext | null): boolean {
  if (!a || !b) return false;
  return a.orgId === b.orgId && a.unitId === b.unitId;
}

/**
 * Valida se um usuário possui permissão de leitura/escrita no escopo de destino
 */
export function userHasScopeAccess(
  permissions: ScopedPermissions,
  targetScope?: ScopeContext | null
): boolean {
  if (!targetScope) return true;
  if (permissions.isMasterAdmin) return true;
  if (permissions.isCbaAdmin && permissions.scope?.cbaId === targetScope.cbaId) return true;
  if (permissions.isAdmin && permissions.scope?.unitId === targetScope.unitId) return true;

  // Escalante por subunidades gerenciadas
  if (permissions.isEscalante && permissions.managedUnits && permissions.managedUnits.length > 0) {
    return (
      permissions.managedUnits.includes(targetScope.subunitId) ||
      permissions.managedUnits.includes(targetScope.unitId)
    );
  }

  // Militar comum: apenas sua própria subunidade ou mesma unidade
  if (permissions.scope) {
    return permissions.scope.unitId === targetScope.unitId;
  }

  return false;
}

/**
 * Retorna a Unidade-Mãe (Parent OBM) normalizada para uma dada OBM ou subunidade.
 * Exemplo: '1/10', '2/10', '3/10', '4/10', '10º GBM' -> '10º GBM'
 * Exemplo: '1/26', '26º GBM' -> '26º GBM'
 */
export function getParentObm(obm?: string): string {
  if (!obm || obm === 'GLOBAL') return 'GLOBAL';
  const scope = resolveCanonicalScope(obm);
  if (scope.unitId === '10_gbm') return '10º GBM';
  if (scope.unitId === '26_gbm') return '26º GBM';
  const clean = (obm || '').toUpperCase().trim();
  if (clean.includes('10')) return '10º GBM';
  if (clean.includes('26')) return '26º GBM';
  return clean || '10º GBM';
}

/**
 * Retorna a lista de OBMs que compartilham o mesmo ambiente de concorrência e vagas no RAS.
 * No ambiente de RAS, as vagas e o banco de concorrência ultrapassam as fronteiras das subunidades
 * e formam uma fonte única em todo o âmbito da OBM-mãe.
 * Exemplo: '10º GBM', '1/10', '2/10', '3/10', '4/10' -> ['10º GBM', '1/10', '2/10', '3/10', '4/10']
 * Exemplo: '26º GBM', '1/26' -> ['26º GBM', '1/26']
 */
export function getRasSharedObms(obm?: string): string[] {
  if (!obm || obm === 'GLOBAL') return ['GLOBAL'];
  const parent = getParentObm(obm);
  if (parent === 'GLOBAL') return ['GLOBAL'];

  if (parent === '10º GBM') {
    return ['10º GBM', '1/10', '2/10', '3/10', '4/10'];
  }
  if (parent === '26º GBM') {
    return ['26º GBM', '1/26'];
  }
  return [parent];
}

