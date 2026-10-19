/**
 * CONEXÃO BRAVO — Arquitetura de Escopo Multi-Tenant Hierárquico
 * Modelagem canônica de 4 níveis:
 * Nível 1: Órgão / Força (Ex: CBMERJ, CBMMG)
 * Nível 2: Comando Regional (Ex: CBA VII - Costa Verde)
 * Nível 3: Unidade / OBM (Ex: 10º GBM - Angra dos Reis, 26º GBM - Paraty)
 * Nível 4: Subunidade / Destacamento (Ex: Sede, DBM 1/10 Itaguaí, DBM 2/10 Ilha Grande, DBM 3/10 Frade, DBM 4/10 Mangaratiba, DBM 1/26 Parque Mambucaba)
 */

export interface ScopeContext {
  orgId: string;       // Identificador único do órgão (ex: 'cbmerj')
  cbaId: string;       // Identificador único do comando regional (ex: 'cba_vii')
  unitId: string;      // Identificador único da OBM principal (ex: '10_gbm', '26_gbm')
  subunitId: string;   // Identificador da subunidade específica (ex: '10_gbm_sede', 'dbm_2_10')
}

export interface Organization {
  id: string;          // 'cbmerj'
  name: string;        // 'Corpo de Bombeiros Militar do Estado do Rio de Janeiro'
  shortName: string;   // 'CBMERJ'
  state: string;       // 'RJ'
  country: string;     // 'BR'
}

export interface RegionalCommand {
  id: string;          // 'cba_vii'
  orgId: string;       // 'cbmerj'
  name: string;        // 'CBA VII - Costa Verde'
  shortName: string;   // 'CBA VII'
  region: string;      // 'Costa Verde'
}

export type UnitType = 'GBM' | 'DBM' | 'CBA' | 'DIR' | 'ESPECIAL' | 'GMAR' | 'GBS' | 'GRUPAMENTO';

export interface MilitaryUnit {
  id: string;          // '10_gbm' | '26_gbm'
  orgId: string;       // 'cbmerj'
  cbaId: string;       // 'cba_vii'
  name: string;        // '10º Grupamento de Bombeiro Militar'
  shortName: string;   // '10º GBM'
  city: string;        // 'Angra dos Reis'
  type: UnitType;
  subunits: string[];  // ['10_gbm_sede', 'dbm_1_10', 'dbm_2_10']
}

export interface Subunit {
  id: string;          // '10_gbm_sede' | 'dbm_1_10' | 'dbm_2_10'
  unitId: string;      // '10_gbm'
  cbaId: string;       // 'cba_vii'
  orgId: string;       // 'cbmerj'
  name: string;        // '10º GBM - Sede'
  shortName: string;   // '10º GBM Sede'
  location: string;    // 'Angra dos Reis - Balneário'
  isSede: boolean;
}

/**
 * Interface base para qualquer documento que carrega escopo hierárquico
 */
export interface ScopedDocument {
  scope?: ScopeContext;
}

/**
 * Governança de papéis e permissões por escopo
 */
export interface ScopedPermissions {
  isMasterAdmin?: boolean;     // Administrador Nacional / Geral
  isCbaAdmin?: boolean;        // Administrador Regional (ex: Comandante CBA VII)
  isAdmin?: boolean;           // Administrador da Unidade / OBM
  isEscalante?: boolean;       // Escalante de OBM / Subunidades
  managedUnits?: string[];     // IDs de unidades ou subunidades gerenciadas
  scope?: ScopeContext;
}
