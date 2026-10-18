export type CategoriaMaterial = string;
export type TipoUso = 'imediato' | 'prolongado';

export interface ItemListaCompras {
  id: string;
  materialId?: string;
  nome: string;
  categoria: CategoriaMaterial | 'OUTROS' | string;
  undMedida: string;
  quantidade: number;
  valorPago?: number;
  concluido: boolean;
}

export interface ListaDeCompras {
  id: string;
  nome: string;
  estabelecimento: string;
  local: string;
  dataCriacao: string;
  arquivada: boolean;
  itens: ItemListaCompras[];
}

export interface Material {
  id: string;
  nome: string;
  categoria: CategoriaMaterial;
  undMedida: string;
  tipoUso: TipoUso | '';
  estoque: number;
  estoquesPorData?: Record<string, number>;
  porcaoPadrao?: number; // em KG
  favorito: boolean;
}

export interface ReceitaItem {
  materialId: string;
  porcao: number;
}

export interface Receita {
  id: string;
  nome: string;
  itens: ReceitaItem[];
}

export interface CardapioDia {
  id: string;
  data: string; // YYYY-MM-DD
  refeicao: 'CAFE' | 'ALMOCO' | 'JANTA';
  receitaId: string;
  qtdMilitares: number;
}

export type AprovisionamentoTab = 'CADASTRO' | 'RECEITAS' | 'CARDAPIO' | 'PREVISAO' | 'CATALOGO' | 'LISTA_COMPRAS';

export interface PaxDefaults {
  cafe: number;
  almoco: number;
  jantar: number;
}
