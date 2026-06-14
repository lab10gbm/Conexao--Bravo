import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ShoppingCart, 
  Package, 
  ChefHat, 
  CalendarDays, 
  ClipboardList, 
  Search, 
  Plus, 
  Filter, 
  Save, 
  AlertTriangle,
  TrendingDown,
  Calculator,
  ArrowRight,
  Star,
  X,
  BookOpen,
  ShoppingBag,
  Sunrise,
  Utensils,
  Sunset,
  Edit2,
  Trash2,
  Calendar,
  Store,
  MapPin,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { RefeitorioModule } from './RefeitorioModule';
import { AprovisionamentoCatalogo, GastoIngrediente } from './AprovisionamentoCatalogo';
import { cleanUndefined } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useRefeitorioData } from '../hooks/useRefeitorioData';
import { RefeitorioEditModal } from './RefeitorioEditModal';


type CategoriaMaterial = 'MERCADO' | 'PROTEINA' | 'SACOLAO' | 'LIMPEZA';
type TipoUso = 'imediato' | 'prolongado';

interface ItemListaCompras {
  id: string;
  materialId?: string;
  nome: string;
  categoria: CategoriaMaterial | 'OUTROS' | string;
  undMedida: string;
  quantidade: number;
  valorPago?: number;
  concluido: boolean;
}

interface ListaDeCompras {
  id: string;
  nome: string;
  estabelecimento: string;
  local: string;
  dataCriacao: string;
  arquivada: boolean;
  itens: ItemListaCompras[];
}

interface Material {
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

interface ReceitaItem {
  materialId: string;
  porcao: number;
}

interface Receita {
  id: string;
  nome: string;
  itens: ReceitaItem[];
}

interface CardapioDia {
  id: string;
  data: string; // YYYY-MM-DD
  refeicao: 'CAFE' | 'ALMOCO' | 'JANTA';
  receitaId: string;
  qtdMilitares: number;
}

// Mok Data
const MOCK_MATERIAIS: Material[] = [
  // MERCADO
  { id: 'm1', nome: 'AÇAFRÃO', categoria: 'MERCADO', undMedida: 'KG', tipoUso: '', estoque: 1.5, favorito: false },
  { id: 'm2', nome: 'AÇUCAR', categoria: 'MERCADO', undMedida: 'KG', tipoUso: 'imediato', estoque: 50, favorito: false },
  { id: 'm3', nome: 'ADOÇANTE', categoria: 'MERCADO', undMedida: 'KG', tipoUso: 'prolongado', estoque: 2, favorito: false },
  { id: 'mer_1', nome: 'AMENDOIM', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_2', nome: 'AMIDO DE MILHO', categoria: 'MERCADO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'm4', nome: 'ARROZ', categoria: 'MERCADO', undMedida: 'KG', tipoUso: 'imediato', estoque: 120, favorito: true },
  { id: 'm5', nome: 'AZEITE 5 Lt', categoria: 'MERCADO', undMedida: 'LT', tipoUso: 'prolongado', estoque: 4, favorito: false },
  { id: 'mer_3', nome: 'AZEITONA', categoria: 'MERCADO', undMedida: 'UND', tipoUso: '', estoque: 0, favorito: false },
  { id: 'mer_4', nome: 'BATATA PALHA 900G', categoria: 'MERCADO', undMedida: 'LT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_5', nome: 'BISCOITO ROSQUINHA', categoria: 'MERCADO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_6', nome: 'BISCOITO CREAN CRACKER', categoria: 'MERCADO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_7', nome: 'BISCOITO MAIZENA', categoria: 'MERCADO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_8', nome: 'BOLO PRONTO', categoria: 'MERCADO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_9', nome: 'BOMBOM', categoria: 'MERCADO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_10', nome: 'CAFÉ 500G', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: true },
  { id: 'mer_11', nome: 'CASTANHA', categoria: 'MERCADO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_12', nome: 'CATCHUP', categoria: 'MERCADO', undMedida: 'PCT', tipoUso: '', estoque: 0, favorito: false },
  { id: 'mer_13', nome: 'COCO RALADO', categoria: 'MERCADO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_14', nome: 'COLORAL', categoria: 'MERCADO', undMedida: 'UND', tipoUso: '', estoque: 0, favorito: false },
  { id: 'mer_15', nome: 'CREME DE LEITE', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: true },
  { id: 'mer_16', nome: 'CREME DE LEITE (MISTURA LACTA)', categoria: 'MERCADO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_17', nome: 'DAMASCO', categoria: 'MERCADO', undMedida: 'UND', tipoUso: '', estoque: 0, favorito: false },
  { id: 'mer_18', nome: 'ERVILHA', categoria: 'MERCADO', undMedida: 'UND', tipoUso: '', estoque: 0, favorito: false },
  { id: 'mer_19', nome: 'MILHO (EM CONSERVA)', categoria: 'MERCADO', undMedida: 'UND', tipoUso: '', estoque: 0, favorito: true },
  { id: 'mer_20', nome: 'FARINHA DE MANDIOCA', categoria: 'MERCADO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_21', nome: 'FARINHA DE ROSCA', categoria: 'MERCADO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: true },
  { id: 'mer_22', nome: 'FARINHA DE TRIGO', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: true },
  { id: 'm6', nome: 'FEIJÃO', categoria: 'MERCADO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 80, favorito: true },
  { id: 'mer_23', nome: 'FEIJÃO BRANCO', categoria: 'MERCADO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_24', nome: 'FEIJÃO MULATINHO', categoria: 'MERCADO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_25', nome: 'FERMENTO QUIMICO EM PÓ ROYAL', categoria: 'MERCADO', undMedida: 'KG', tipoUso: 'prolongado', estoque: 0, favorito: false },
  { id: 'mer_26', nome: 'FUBÁ', categoria: 'MERCADO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_27', nome: 'GELATINA', categoria: 'MERCADO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_28', nome: 'GOIABADA CASCÃO', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_29', nome: 'LATA DE ATUN RALADO', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_30', nome: 'LEITE', categoria: 'MERCADO', undMedida: 'LT', tipoUso: 'imediato', estoque: 0, favorito: true },
  { id: 'mer_31', nome: 'LEITE CONDENSADO', categoria: 'MERCADO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'm7', nome: 'MACARRÃO ESPAGUETE 500G', categoria: 'MERCADO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 40, favorito: false },
  { id: 'mer_32', nome: 'MACARRÃO PARAFUSO 500G', categoria: 'MERCADO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_33', nome: 'MAIONESE', categoria: 'MERCADO', undMedida: 'LT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_34', nome: 'MANTEIGA 250G', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_35', nome: 'MANTEIGA 500G', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_36', nome: 'MASSA PARA LASANHA', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_37', nome: 'MOLHO DE TOMATE', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_38', nome: 'MOLHO SHOYO', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_39', nome: 'MOSTARDA', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_40', nome: 'NESCAU', categoria: 'MERCADO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_41', nome: 'NOZES', categoria: 'MERCADO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'm8', nome: 'ÓLEO DE SOJA', categoria: 'MERCADO', undMedida: 'LT', tipoUso: 'imediato', estoque: 30, favorito: true },
  { id: 'mer_42', nome: 'ORÉGANO', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_43', nome: 'OVOS', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_44', nome: 'PANETONE', categoria: 'MERCADO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_45', nome: 'PÃO', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_46', nome: 'PÃO DE RABANADA', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_47', nome: 'PICOLÉ', categoria: 'MERCADO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_48', nome: 'PIMENTA', categoria: 'MERCADO', undMedida: 'BDJ', tipoUso: '', estoque: 0, favorito: false },
  { id: 'mer_49', nome: 'PIMENTA DO REINO', categoria: 'MERCADO', undMedida: 'KG', tipoUso: '', estoque: 0, favorito: false },
  { id: 'mer_50', nome: 'PRESUNTO', categoria: 'MERCADO', undMedida: 'KG', tipoUso: '', estoque: 0, favorito: false },
  { id: 'mer_51', nome: 'QUEIJO BRANCO', categoria: 'MERCADO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_52', nome: 'QUEIJO MUSSARELA', categoria: 'MERCADO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_53', nome: 'QUEIJO PRATO', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_54', nome: 'QUEIJO RALADO', categoria: 'MERCADO', undMedida: 'LT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_55', nome: 'REFRIGERANTE COCA-COLA', categoria: 'MERCADO', undMedida: 'LT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_56', nome: 'REFRIGERANTE FANTA LARANJA', categoria: 'MERCADO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_57', nome: 'REFRIGERANTE GUARANÁ', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_58', nome: 'REQUEIJÃO', categoria: 'MERCADO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_59', nome: 'SAL', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_60', nome: 'SAL GROSSO', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_61', nome: 'SALSICHA', categoria: 'MERCADO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_62', nome: 'SARDINHA EM LATA', categoria: 'MERCADO', undMedida: 'LT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_63', nome: 'SORVETE', categoria: 'MERCADO', undMedida: 'LT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_64', nome: 'SUCO DE CAJU 5LT', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_65', nome: 'SUCO DE GUARANÁ 5 LT', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_66', nome: 'SUCO EM PÓ', categoria: 'MERCADO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_67', nome: 'SUCO GUARACAMP 1000ML', categoria: 'MERCADO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_68', nome: 'TAPIOCA', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_69', nome: 'TEMPEIRO BAIANO', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: true },
  { id: 'mer_70', nome: 'TEMPERO SAZON DE ALHO', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_71', nome: 'TEMPERO SAZON DE CARNE', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_72', nome: 'TEMPERO SAZON DE FEIJÃO', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_73', nome: 'TEMPERO SAZON DE NORDESTINO', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_74', nome: 'UVA PASSAS', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_75', nome: 'VINAGRE 500ML', categoria: 'MERCADO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_76', nome: 'PAÇOCA', categoria: 'MERCADO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_77', nome: 'PIPOCA', categoria: 'MERCADO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_78', nome: 'CANJICA (MILHO)', categoria: 'MERCADO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_79', nome: 'CANELA EM PÓ', categoria: 'MERCADO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'mer_80', nome: 'AVEIA', categoria: 'MERCADO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 0, favorito: false },
  
  // PROTEÍNAS
  { id: 'prot_1', nome: 'CARNE CONTRA-FILÉ/ CURRASCO NO PALITO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: 0.220, favorito: false },
  { id: 'prot_2', nome: 'ESPETINHO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: 0.220, favorito: false },
  { id: 'prot_3', nome: 'FRANGO PEITO/ CHURRASCO NO PALITO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: 0.220, favorito: false },
  { id: 'prot_4', nome: 'LINGUIÇA CALABRESA/ CHURRASCO NO PALITO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: 0.220, favorito: false },
  { id: 'prot_5', nome: 'BACON PEÇA', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: 0.220, favorito: false },
  { id: 'prot_6', nome: 'CARNE DE PORCO SALGADO ORELHA DE PORCO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: 0.220, favorito: false },
  { id: 'prot_7', nome: 'CARNE LAGARTO PLANO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: 0.220, favorito: false },
  { id: 'p1', nome: 'CARNE ACÉM BOVINO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 35, porcaoPadrao: 0.220, favorito: true },
  { id: 'prot_8', nome: 'CARNE ACÉM BOVINO MOIDA', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: 0.220, favorito: false },
  { id: 'prot_9', nome: 'CARNE ALCATRA', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: 0.220, favorito: false },
  { id: 'prot_10', nome: 'CARNE CHÃ', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: 0.220, favorito: false },
  { id: 'prot_11', nome: 'CARNE CONTRA-FILÉ', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: 0.220, favorito: false },
  { id: 'prot_12', nome: 'CARNE COXÃO DURO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: 0.220, favorito: false },
  { id: 'prot_13', nome: 'CARNE COXÃO MOLE', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: 0.220, favorito: false },
  { id: 'prot_14', nome: 'CARNE CUPIM', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: 0.230, favorito: false },
  { id: 'prot_15', nome: 'CARNE DE PORCO COPA LOMBO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: 0.260, favorito: false },
  { id: 'prot_16', nome: 'CARNE DE PORCO LOMBO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: 0.260, favorito: false },
  { id: 'prot_17', nome: 'CARNE DE PORCO PERNIL COM OSSO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: 0.260, favorito: false },
  { id: 'prot_18', nome: 'CARNE DE PORCO PERNIL SEM OSSO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: 0.260, favorito: false },
  { id: 'prot_19', nome: 'CARNE DE PORCO SALGADO LOMBO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: 0.280, favorito: false },
  { id: 'prot_20', nome: 'CARNE FIGADO BOVINO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: 0.400, favorito: false },
  { id: 'prot_21', nome: 'CARNE LAGARTO REDONDO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: 0.400, favorito: false },
  { id: 'prot_22', nome: 'CARNE MUSCULO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: 0.400, favorito: false },
  { id: 'prot_23', nome: 'CARNE PATINHO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: 0.600, favorito: false },
  { id: 'prot_24', nome: 'CARNE PEITO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_25', nome: 'CARNE PICANHA', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_26', nome: 'CARNE SECA', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_27', nome: 'FRANGO ASA', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'p2', nome: 'FRANGO PEITO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 40, porcaoPadrao: 0.220, favorito: true },
  { id: 'prot_28', nome: 'FILE DE PEITO DE FRANGO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_29', nome: 'CARNE DE PORCO CARRÉ FATIADO (BISTÉCA SUINA)', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_30', nome: 'CARNE DE PORCO COSTELINHA', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_31', nome: 'CARNE DE PORCO SALGADO COSTELINHA DE PORCO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_32', nome: 'CARNE RABADA', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'p3', nome: 'LINGUIÇA CALABRESA', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 15, porcaoPadrao: 0.220, favorito: false },
  { id: 'prot_33', nome: 'CARNE COSTELA BOVINA', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_34', nome: 'CARNE DE PORCO SALGADO PÉ DE PORCO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_35', nome: 'CARNE DE PORCO SALGADO RABO DE PORCO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_36', nome: 'CARNE DE PORCOSALGADO GARGANTA SUINA', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_37', nome: 'FRANGO COXA C/ SOBRE COXA', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_38', nome: 'LINGUIÇA DE CHURRASCO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_39', nome: 'LINGUIÇA DE PAIO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_40', nome: 'LINGUIÇA MINEIRA FINA', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_41', nome: 'MOCOTÓ', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_42', nome: 'PEIXE ANCHOVA', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_43', nome: 'PEIXE ATUN', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_44', nome: 'PEIXE BACALHAU', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_45', nome: 'PEIXE CAMARÃO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_46', nome: 'PEIXE CAVALA', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_47', nome: 'PEIXE CHERNE', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_48', nome: 'PEIXE DOURADO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_49', nome: 'PEIXE ESPADA', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_50', nome: 'PEIXE GAROUPA', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_51', nome: 'PEIXE LINGUADO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_52', nome: 'PEIXE LULA', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_53', nome: 'PEIXE MERLUZA', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_54', nome: 'PEIXE MEXILHÃO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_55', nome: 'PEIXE OLHO DE BOI', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_56', nome: 'PEIXE PANGA', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_57', nome: 'PEIXE PINTADO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_58', nome: 'PEIXE POLVO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_59', nome: 'PEIXE ROBALO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_60', nome: 'PEIXE SARDINHA', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_61', nome: 'PEIXE SARGO', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_62', nome: 'PEIXE TILÁPIA', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_63', nome: 'TENDER', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_64', nome: 'CARNE MOIDA', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  { id: 'prot_65', nome: 'PAELLA', categoria: 'PROTEINA', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, porcaoPadrao: undefined, favorito: false },
  
  // SACOLÃO
  { id: 'sac_1', nome: 'ABACATE', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_2', nome: 'ABACAXI', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_3', nome: 'ABÓBORA', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_4', nome: 'ABÓBRINHA', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_5', nome: 'AGRIÃO', categoria: 'SACOLAO', undMedida: 'MÇ', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_6', nome: 'AIPIM', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_7', nome: 'ALCACHOFRA', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_8', nome: 'ALFACE', categoria: 'SACOLAO', undMedida: 'MÇ', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 's1', nome: 'ALHO', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 5, favorito: false },
  { id: 'sac_9', nome: 'AMEIXA', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_10', nome: 'BANANA', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 's3', nome: 'BATATA', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 15, favorito: false },
  { id: 'sac_11', nome: 'BATATA DOCE', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_12', nome: 'BERINJELA', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_13', nome: 'BETERRABA', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_14', nome: 'BROCOLIS', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_15', nome: 'CAQUI', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 's2', nome: 'CEBOLA', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 10, favorito: false },
  { id: 'sac_16', nome: 'CENOURA', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_17', nome: 'CHEIRO-VERDE', categoria: 'SACOLAO', undMedida: 'MÇ', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_18', nome: 'CHUCHU', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_19', nome: 'COENTRO', categoria: 'SACOLAO', undMedida: 'MÇ', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_20', nome: 'COUVE', categoria: 'SACOLAO', undMedida: 'MÇ', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_21', nome: 'COUVE-FLOR', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_22', nome: 'ESPINAFRE', categoria: 'SACOLAO', undMedida: 'MÇ', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_23', nome: 'GOIABA', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_24', nome: 'HORTELÃ', categoria: 'SACOLAO', undMedida: 'MÇ', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_25', nome: 'INHAME', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_26', nome: 'JILÓ', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_27', nome: 'KIWI', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_28', nome: 'LARANJA', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_29', nome: 'LIMÃO', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_30', nome: 'LOURO EM FOLHA', categoria: 'SACOLAO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_31', nome: 'MAÇÃ', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_32', nome: 'MAMÃO', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_33', nome: 'MANGA', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_34', nome: 'MARACUJÁ', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_35', nome: 'MELANCIA', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_36', nome: 'MELÃO', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_37', nome: 'MORANGO', categoria: 'SACOLAO', undMedida: 'BDJ', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_38', nome: 'PEPINO', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_39', nome: 'PERA', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_40', nome: 'PÊSSEGO', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_41', nome: 'PIMENTÃO', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_42', nome: 'QUIABO', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_43', nome: 'REPOLHO', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_44', nome: 'SALSA', categoria: 'SACOLAO', undMedida: 'MÇ', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_45', nome: 'TANGERINA', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_46', nome: 'TOMATE', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_47', nome: 'UVA', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 's4', nome: 'OVO', categoria: 'SACOLAO', undMedida: 'DZ', tipoUso: 'imediato', estoque: 20, favorito: true },
  { id: 'sac_48', nome: 'OVOS', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_49', nome: 'PANETONE', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_50', nome: 'PÃO', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_51', nome: 'PÃO DE RABANADA', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_52', nome: 'PICOLÉ', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_53', nome: 'PIMENTA', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_54', nome: 'PIMENTA DO REINO', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_55', nome: 'PRESUNTO', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_56', nome: 'QUEIJO BRANCO', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_57', nome: 'QUEIJO MUSSARELA', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_58', nome: 'QUEIJO PRATO', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_59', nome: 'QUEIJO RALADO', categoria: 'SACOLAO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_60', nome: 'REFRIGERANTE COCA-COLA', categoria: 'SACOLAO', undMedida: 'LT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_61', nome: 'REFRIGERANTE FANTA LARANJA', categoria: 'SACOLAO', undMedida: 'LT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_62', nome: 'REFRIGERANTE GUARANÁ', categoria: 'SACOLAO', undMedida: 'LT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_63', nome: 'REQUEIJÃO', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_64', nome: 'SAL', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_65', nome: 'SAL GROSSO', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_66', nome: 'SALSICHA', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_67', nome: 'SARDINHA EM LATA', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_68', nome: 'SORVETE', categoria: 'SACOLAO', undMedida: 'LT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_69', nome: 'SUCO DE CAJU 900ML', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_70', nome: 'SUCO DE GOIABA 900ML', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_71', nome: 'SUCO DE MARACUJÁ 900ML', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_72', nome: 'SUCO GUARACAMP 1000ML', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_73', nome: 'TAPIOCA', categoria: 'SACOLAO', undMedida: 'KG', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_74', nome: 'TEMPEIRO BAIANO', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_75', nome: 'TEMPERO SAZON DE ALHO', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_76', nome: 'TEMPERO SAZON DE CARNE', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_77', nome: 'TEMPERO SAZON DE FEIJÃO', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_78', nome: 'TEMPERO SAZON DE NORDESTINO', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_79', nome: 'UVA PASSAS', categoria: 'SACOLAO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_80', nome: 'VINAGRE 500ML', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_81', nome: 'PAÇOCA', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_82', nome: 'PIPOCA', categoria: 'SACOLAO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_83', nome: 'CANJICA (MILHO)', categoria: 'SACOLAO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_84', nome: 'ERVILHA', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_85', nome: 'MILHO (EM CONSERVA)', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_86', nome: 'AVEIA', categoria: 'SACOLAO', undMedida: 'PCT', tipoUso: 'imediato', estoque: 0, favorito: false },
  { id: 'sac_87', nome: 'SUCO (EM PÓ)', categoria: 'SACOLAO', undMedida: 'UND', tipoUso: 'imediato', estoque: 0, favorito: false },
  
  // LIMPEZA
  { id: 'l1', nome: 'DETERGENTE', categoria: 'LIMPEZA', undMedida: 'UND', tipoUso: 'prolongado', estoque: 30, favorito: false },
  { id: 'l2', nome: 'ÁGUA SANITÁRIA', categoria: 'LIMPEZA', undMedida: 'LT', tipoUso: 'prolongado', estoque: 10, favorito: false },
];

const MOCK_RECEITAS: Receita[] = [
  {
    id: 'r1',
    nome: 'Strogonoff de Frango',
    itens: [
      { materialId: 'p2', porcao: 0.250 }, // Frango
      { materialId: 'm4', porcao: 0.150 }, // Arroz
      { materialId: 's1', porcao: 0.005 }, // Alho
      { materialId: 's2', porcao: 0.020 }, // Cebola
      { materialId: 'm8', porcao: 0.010 }, // Oleo
    ]
  },
  {
    id: 'r2',
    nome: 'Carne de Panela com Batata',
    itens: [
      { materialId: 'p1', porcao: 0.220 }, // Acém
      { materialId: 'm4', porcao: 0.150 }, // Arroz
      { materialId: 'm6', porcao: 0.080 }, // Feijao
      { materialId: 's3', porcao: 0.100 }, // Batata
    ]
  }
];

const MOCK_CARDAPIO: CardapioDia[] = [
  { id: 'c1', data: new Date().toISOString().split('T')[0], refeicao: 'ALMOCO', receitaId: 'r1', qtdMilitares: 67 },
  { id: 'c2', data: new Date(Date.now() + 86400000).toISOString().split('T')[0], refeicao: 'ALMOCO', receitaId: 'r2', qtdMilitares: 80 },
  { id: 'c3', data: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], refeicao: 'ALMOCO', receitaId: 'r1', qtdMilitares: 75 },
];

export function AprovisionamentoModule({ userProfile }: { userProfile: UserProfile | null }) {
  const [activeTab, setActiveTab] = useState<'CADASTRO' | 'RECEITAS' | 'CARDAPIO' | 'PREVISAO' | 'CATALOGO' | 'LISTA_COMPRAS'>('CADASTRO');
  
  const [materiais, setMateriais] = useState<Material[]>(() => {
    try {
      const cached = localStorage.getItem('aprovisionamento_dados_cache');
      if (cached) {
         const parsed = JSON.parse(cached);
         if (parsed.materiais && parsed.materiais.length > 0) return parsed.materiais;
      }
    } catch(e) {}
    return MOCK_MATERIAIS;
  });
  const [receitas, setReceitas] = useState<Receita[]>(() => {
    try {
      const cached = localStorage.getItem('aprovisionamento_dados_cache');
      if (cached) {
         const parsed = JSON.parse(cached);
         if (parsed.receitas && parsed.receitas.length > 0) return parsed.receitas;
      }
    } catch(e) {}
    return MOCK_RECEITAS;
  });
  const [cardapio, setCardapio] = useState<CardapioDia[]>(() => {
    try {
      const cached = localStorage.getItem('aprovisionamento_dados_cache');
      if (cached && JSON.parse(cached).cardapio) return JSON.parse(cached).cardapio;
    } catch(e) {}
    return MOCK_CARDAPIO;
  });
  const [listasDeCompras, setListasDeCompras] = useState<ListaDeCompras[]>(() => {
    try {
      const cached = localStorage.getItem('aprovisionamento_dados_cache');
      if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.listasDeCompras) return parsed.listasDeCompras;
          let migrated: ListaDeCompras[] = [];
          if (parsed.historicoListas) migrated = [...parsed.historicoListas].map(h => ({ ...h, arquivada: h.arquivada ?? true }));
          if (parsed.listaCompras && parsed.listaCompras.length > 0) {
             migrated.push({
                id: `lista_migrada_${Date.now()}`,
                nome: 'Lista Salva Anterior',
                estabelecimento: '',
                local: '',
                dataCriacao: new Date().toISOString(),
                arquivada: false,
                itens: parsed.listaCompras
             });
          }
          if (migrated.length > 0) return migrated;
      }
    } catch(e) {}
    return [];
  });
  const [paxDefaults, setPaxDefaults] = useState<{ cafe: number, almoco: number, jantar: number }>(() => {
    try {
      const cached = localStorage.getItem('aprovisionamento_dados_cache');
      if (cached && JSON.parse(cached).paxDefaults) return JSON.parse(cached).paxDefaults;
    } catch(e) {}
    return { cafe: 60, almoco: 60, jantar: 60 };
  });
  const [datasEstoque, setDatasEstoque] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('aprovisionamento_dados_cache');
      if (cached) return JSON.parse(cached).datasEstoque || ['27/05'];
    } catch(e) {}
    return ['27/05'];
  });
  const [cadastroFiltroMsg, setCadastroFiltroMsg] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaMaterial>('MERCADO');
  const [filtroCategoriaPrevisao, setFiltroCategoriaPrevisao] = useState<CategoriaMaterial>('MERCADO');
  const [gastosCatalogo, setGastosCatalogo] = useState<Record<string, GastoIngrediente[]>>(() => {
    try {
      const cached = localStorage.getItem('aprovisionamento_gastos_cache');
      if (cached) return JSON.parse(cached);
    } catch(e) {}
    return {};
  });
  const [paxPratosCatalogo, setPaxPratosCatalogo] = useState<Record<string, { semana?: number, fds?: number, evento?: number }>>(() => {
    try {
      const cached = localStorage.getItem('aprovisionamento_pax_pratos_cache');
      if (cached) return JSON.parse(cached);
    } catch(e) {}
    return {};
  });

  
  const [previsaoDiasOptions, setPrevisaoDiasOptions] = useState<number[]>(() => {
    try {
      const cached = localStorage.getItem('previsaoDiasOptions');
      if (cached) return JSON.parse(cached);
    } catch(e) {}
    return [3, 5, 10];
  });
  const [newPrevisaoDiaStr, setNewPrevisaoDiaStr] = useState<string>('');
  const [mostrarTodosPrevisao, setMostrarTodosPrevisao] = useState(false);
  const [showAddListaModal, setShowAddListaModal] = useState(false);
  const [manualItemForm, setManualItemForm] = useState({ 
    nome: '', 
    quantidade: 1, 
    undMedida: 'UN', 
    categoria: 'OUTROS',
    materialId: '' as string | undefined
  });
  const [manualItemSuggestions, setManualItemSuggestions] = useState<Material[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [showNovaListaModal, setShowNovaListaModal] = useState(false);
  const [expandedListaId, setExpandedListaId] = useState<string | null>(null);
  const [archiveForm, setArchiveForm] = useState({
     nome: '',
     dataCriacao: new Date().toISOString().split('T')[0],
     estabelecimento: '',
     local: '',
     valorPago: 0
  });

  const { menus } = useRefeitorioData();

  const filteredMenus = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const ontemTime = hoje.getTime() - (86400000 * 1); // yesterday
    
    const validMenusAndTimes = menus.map((menu: any) => {
       if (!menu.date) return null;
       const parts = menu.date.split('/');
       if (parts.length < 2) return null;
       const d = parseInt(parts[0]);
       const mo = parseInt(parts[1]);
       if (isNaN(d) || isNaN(mo)) return null;
       let year = hoje.getFullYear();
       if (hoje.getMonth() === 0 && mo === 12) year--;
       else if (hoje.getMonth() === 11 && mo === 1) year++;
       const cDate = new Date(year, mo - 1, d);
       cDate.setHours(0,0,0,0);
       return { menu, time: cDate.getTime() };
    }).filter(Boolean) as { menu: any, time: number }[];

    return validMenusAndTimes
      .filter(item => item.time >= ontemTime)
      .sort((a, b) => a.time - b.time)
      .map(item => item.menu);
  }, [menus]);
  const [showNovaDataPopup, setShowNovaDataPopup] = useState(false);
  const [novaDataValue, setNovaDataValue] = useState('');

  const [isEditingMenu, setIsEditingMenu] = useState(false);
  const [editingMenuIndex, setEditingMenuIndex] = useState<number | null>(null);

  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    let unsubscribeGastos: (() => void) | undefined;
    let unsubscribeDados: (() => void) | undefined;

    const fetchDados = async () => {
      try {
        // Fetch Gastos via real-time listener so it syncs across module tabs instantly
        const docRefGastos = doc(db, 'aprovisionamento', 'gastos_catalogo');
        unsubscribeGastos = onSnapshot(docRefGastos, (snapGastos) => {
          if (snapGastos.exists()) {
            const data = snapGastos.data();
            const gastos = data.gastos || {};
            const paxPratos = data.paxPratos || {};
            setGastosCatalogo(gastos);
            setPaxPratosCatalogo(paxPratos);
            localStorage.setItem('aprovisionamento_gastos_cache', JSON.stringify(gastos));
            localStorage.setItem('aprovisionamento_pax_pratos_cache', JSON.stringify(paxPratos));
          }
        });

        // Fetch Dados Principais via real-time listener
        const docRefDados = doc(db, 'aprovisionamento', 'dados');
        unsubscribeDados = onSnapshot(docRefDados, (snapDados) => {
          // If we are currently debouncing local saves, ignore the incoming snapshot
          // to prevent jumpy UI. Our local save will resolve shortly.
          if (pendingSaveRef.current) return;

          if (snapDados.exists()) {
            const data = snapDados.data();
            const loadedMateriais = data.materiais && data.materiais.length > 0 ? data.materiais : MOCK_MATERIAIS;
            const loadedReceitas = data.receitas && data.receitas.length > 0 ? data.receitas : MOCK_RECEITAS;
            
            const loadedCardapio = data.cardapio || cardapio;
            const loadedDatasEstoque = data.datasEstoque || datasEstoque;
            const loadedListasDeCompras = data.listasDeCompras || listasDeCompras;
            const loadedPaxDefaults = data.paxDefaults || paxDefaults;
            const loadedPrevisaoDias = data.previsaoDiasOptions || previsaoDiasOptions;

            setMateriais(loadedMateriais);
            setReceitas(loadedReceitas);
            setCardapio(loadedCardapio);
            setDatasEstoque(loadedDatasEstoque);
            setListasDeCompras(loadedListasDeCompras);
            setPaxDefaults(loadedPaxDefaults);
            setPrevisaoDiasOptions(loadedPrevisaoDias);
            
            const fullDataToCache = {
              ...data,
              materiais: loadedMateriais,
              receitas: loadedReceitas,
              cardapio: loadedCardapio,
              datasEstoque: loadedDatasEstoque,
              listasDeCompras: loadedListasDeCompras,
              paxDefaults: loadedPaxDefaults,
              previsaoDiasOptions: loadedPrevisaoDias
            };
            dataRef.current = fullDataToCache;
            localStorage.setItem('aprovisionamento_dados_cache', JSON.stringify(fullDataToCache));
          } else {
            // First time init
            const initialData = { 
              materiais, 
              receitas, 
              cardapio, 
              datasEstoque, 
              listasDeCompras,
              paxDefaults,
              previsaoDiasOptions
            };
            setDoc(docRefDados, cleanUndefined(initialData)).catch(e => console.warn('Could not seed initial db', e));
          }
          setIsDataLoaded(true);
        }, (err) => {
          console.error("Error fetching aprovisionamento dados:", err);
          setIsDataLoaded(true);
        });
      } catch (e) {
        console.error("Error setting up aprovisionamento listeners:", e);
        setIsDataLoaded(true);
      }
    };
    fetchDados();

    return () => {
      if (unsubscribeGastos) unsubscribeGastos();
      if (unsubscribeDados) unsubscribeDados();
    };
  }, []);

  const getActiveListaId = () => {
     const unarchived = listasDeCompras.filter(l => !l.arquivada);
     return unarchived.length > 0 ? unarchived[0].id : null;
  };

  const currentListaAddId = useRef<string | null>(null);

  const promptAddToListaCompras = (material: Material, suggestedQty: number) => {
    const listId = getActiveListaId();
    if (!listId) {
      alert("Crie uma lista de compras primeiro na aba 'Lista de Compras'!");
      return;
    }
    currentListaAddId.current = listId;

    const qt = suggestedQty > 0 ? Math.ceil(suggestedQty) : 1;
    setManualItemForm({
      nome: material.nome,
      quantidade: qt,
      undMedida: material.undMedida,
      categoria: material.categoria,
      materialId: material.id
    });
    setManualItemSuggestions([]);
    setShowSuggestions(false);
    setShowAddListaModal(true);
  };

  const handleManualAddToLista = (listaId: string) => {
    currentListaAddId.current = listaId;
    setManualItemForm({ nome: '', quantidade: 1, undMedida: 'UN', categoria: 'OUTROS', materialId: undefined });
    setManualItemSuggestions([]);
    setShowSuggestions(false);
    setShowAddListaModal(true);
  };

  const handleManualItemNameChange = (val: string) => {
    setManualItemForm(prev => ({ ...prev, nome: val, materialId: undefined }));
    if (val.trim().length >= 2) {
      const filtered = materiais.filter(m => 
        m.nome.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 5);
      setManualItemSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setManualItemSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (m: Material) => {
    setManualItemForm({
      nome: m.nome,
      quantidade: 1,
      undMedida: m.undMedida,
      categoria: m.categoria,
      materialId: m.id
    });
    setManualItemSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSaveManualItem = () => {
    if (!manualItemForm.nome.trim() || !currentListaAddId.current) return;

    const newItem: ItemListaCompras = {
      id: Math.random().toString(36).substring(2, 9),
      materialId: manualItemForm.materialId,
      nome: manualItemForm.nome.toUpperCase().trim(),
      categoria: manualItemForm.categoria.toUpperCase().trim() || 'OUTROS',
      undMedida: manualItemForm.undMedida.toUpperCase().trim() || 'UN',
      quantidade: manualItemForm.quantidade,
      concluido: false
    };

    setListasDeCompras(prev => {
      const next = prev.map(l => {
         if (l.id === currentListaAddId.current) {
            return { ...l, itens: [...l.itens, newItem] };
         }
         return l;
      });
      syncAndSave({ listasDeCompras: next });
      return next;
    });
    setShowAddListaModal(false);
  };

  const handleRemoveFromListaCompras = (listaId: string, itemId: string) => {
    setListasDeCompras(prev => {
      const next = prev.map(l => {
         if (l.id === listaId) {
            return { ...l, itens: l.itens.filter(i => i.id !== itemId) };
         }
         return l;
      });
      syncAndSave({ listasDeCompras: next });
      return next;
    });
  };

  const handleNovaListaCompras = () => {
    const novaLista: ListaDeCompras = {
       id: `lista_${Date.now()}_${Math.random().toString(36).substring(2,9)}`,
       nome: archiveForm.nome.trim() || `Lista de Compras`,
       estabelecimento: archiveForm.estabelecimento.trim(),
       local: archiveForm.local.trim(),
       dataCriacao: archiveForm.dataCriacao,
       arquivada: false,
       itens: []
    };
    
    setListasDeCompras(prev => {
       const next = [novaLista, ...prev];
       syncAndSave({ listasDeCompras: next });
       return next;
    });
    setShowNovaListaModal(false);
    setArchiveForm({
       nome: '',
       dataCriacao: new Date().toISOString().split('T')[0],
       estabelecimento: '',
       local: '',
       valorPago: 0
    });
  };

  const handleToggleConcluidoListaCompras = (listaId: string, itemId: string) => {
    setListasDeCompras(prev => {
      const next = prev.map(l => {
         if (l.id === listaId) {
            return { ...l, itens: l.itens.map(i => i.id === itemId ? { ...i, concluido: !i.concluido } : i) };
         }
         return l;
      });
      syncAndSave({ listasDeCompras: next });
      return next;
    });
  };

  const handleChangeQuantidadeListaCompras = (listaId: string, itemId: string, qty: number) => {
    setListasDeCompras(prev => {
      const next = prev.map(l => {
         if (l.id === listaId) {
            return { ...l, itens: l.itens.map(i => i.id === itemId ? { ...i, quantidade: qty } : i) };
         }
         return l;
      });
      syncAndSave({ listasDeCompras: next });
      return next;
    });
  };

  const handleChangeValorPagoListaCompras = (listaId: string, itemId: string, val: number) => {
    setListasDeCompras(prev => {
      const next = prev.map(l => {
         if (l.id === listaId) {
            return { ...l, itens: l.itens.map(i => i.id === itemId ? { ...i, valorPago: val } : i) }
         }
         return l;
      });
      syncAndSave({ listasDeCompras: next });
      return next;
    });
  };

  const pendingSaveRef = useRef<NodeJS.Timeout | null>(null);
  const dataRef = useRef({ materiais, receitas, cardapio, datasEstoque, listasDeCompras, paxDefaults, previsaoDiasOptions });

  const syncAndSave = (newData: Partial<typeof dataRef.current>) => {
    dataRef.current = { ...dataRef.current, ...newData };
    localStorage.setItem('aprovisionamento_dados_cache', JSON.stringify(dataRef.current));
    
    if (pendingSaveRef.current) clearTimeout(pendingSaveRef.current);
    
    pendingSaveRef.current = setTimeout(async () => {
      try {
        const cleanedData = cleanUndefined(dataRef.current);
        await setDoc(doc(db, 'aprovisionamento', 'dados'), cleanUndefined(cleanedData), { merge: true });
        pendingSaveRef.current = null;
      } catch (e) {
        console.error("Error saving aprovisionamento dados:", e);
      }
    }, 1000);
  };

  // Flush remaining saves exactly when component unmounts
  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) {
        clearTimeout(pendingSaveRef.current);
        // Fire and forget save using the latest data from the ref
        const cleanedData = cleanUndefined(dataRef.current);
        setDoc(doc(db, 'aprovisionamento', 'dados'), cleanUndefined(cleanedData), { merge: true }).catch(console.error);
        pendingSaveRef.current = null;
      }
    };
  }, []);

  const handleAddDataEstoque = () => {
    if (novaDataValue && !datasEstoque.includes(novaDataValue)) {
      const novaData = novaDataValue;
      const newDatasEstoque = [...datasEstoque, novaData];
      setDatasEstoque(newDatasEstoque);
      
      const latestData = datasEstoque[datasEstoque.length - 1];
      
      let newMateriais = materiais;
      setMateriais(prev => {
        newMateriais = prev.map(m => {
          const estoques = m.estoquesPorData || { '27/05': m.estoque };
          const val = estoques[latestData] ?? m.estoque;
          return {
            ...m,
            estoquesPorData: { ...estoques, [novaData]: val },
            estoque: val
          };
        });
        return newMateriais;
      });
      
      if (isDataLoaded) {
        syncAndSave({ datasEstoque: newDatasEstoque, materiais: newMateriais });
      }
    }
    setShowNovaDataPopup(false);
    setNovaDataValue('');
  };

  const handleRemoveDataEstoque = (dataToRemove: string) => {
    if (datasEstoque.length > 1) {
      const newDatas = datasEstoque.filter(dt => dt !== dataToRemove);
      setDatasEstoque(newDatas);
      if (isDataLoaded) syncAndSave({ datasEstoque: newDatas });
    }
  };

  // Cálculos de Previsão
  const calculoPrevisao = useMemo(() => {
    // Dias a considerar: usando as datas escolhidas nas opções
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    
    const latestEstoqueDataStr = datasEstoque[datasEstoque.length - 1]; // e.g. "09/06"
    let latestEstoqueDate = new Date(hoje);
    if (latestEstoqueDataStr) {
       const [ed, em] = latestEstoqueDataStr.split('/').map(Number);
       if (!isNaN(ed) && !isNaN(em)) {
          let eYear = hoje.getFullYear();
          if (hoje.getMonth() === 0 && em === 12) eYear--;
          else if (hoje.getMonth() === 11 && em === 1) eYear++;
          latestEstoqueDate = new Date(eYear, em - 1, ed);
          latestEstoqueDate.setHours(0,0,0,0);
       }
    }
    
    const needsByMaterialId: Record<string, { inDays: Record<number, number>, total: number }> = {};
    
    materiais.forEach(m => {
      needsByMaterialId[m.id] = { inDays: {}, total: 0 };
      previsaoDiasOptions.forEach(opt => needsByMaterialId[m.id].inDays[opt] = 0);
    });

    menus.forEach((menu: any) => {
      if (!menu.date) return;
      const parts = menu.date.split('/');
      if (parts.length < 2) return;
      const d = parseInt(parts[0]);
      const mo = parseInt(parts[1]);
      if (isNaN(d) || isNaN(mo)) return;
      
      let year = hoje.getFullYear();
      if (hoje.getMonth() === 0 && mo === 12) year--;
      else if (hoje.getMonth() === 11 && mo === 1) year++;
      
      const cDate = new Date(year, mo - 1, d);
      cDate.setHours(0,0,0,0);
      
      const isPast = cDate.getTime() <= latestEstoqueDate.getTime();
      const diffTime = cDate.getTime() - hoje.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      const paxLocalCafe = menu.efetivoCafe || paxDefaults.cafe || 60;
      const paxLocalAlmoco = menu.efetivoAlmoco || paxDefaults.almoco || 60;
      const paxLocalJantar = menu.efetivoJantar || paxDefaults.jantar || 60;
      // Default to almoco pax for standard daily items if not specified
      const paxForDay = paxLocalAlmoco;

      // Extract all dishes names configured for this day
      const itemsOfDay: { name: string, meal: 'CAFE' | 'ALMOCO' | 'JANTAR' }[] = [];
      const addDishes = (dishes: string, meal: 'CAFE' | 'ALMOCO' | 'JANTAR') => {
        if (!dishes || dishes === '-') return;
        dishes.split(',').forEach(dStr => {
           const trimmed = dStr.trim();
           if (trimmed) itemsOfDay.push({ name: trimmed, meal });
        });
      };
      
      if (menu.cafeManha) addDishes(menu.cafeManha, 'CAFE');
      if (menu.lancheTarde) addDishes(menu.lancheTarde, 'CAFE');

      // Almoço
      if (menu.almoco) {
        if (menu.almoco.principal) itemsOfDay.push({ name: menu.almoco.principal.trim(), meal: 'ALMOCO' });
        addDishes(menu.almoco.acompanhamentos, 'ALMOCO');
        addDishes(menu.almoco.saladas, 'ALMOCO');
        if (menu.almoco.sobremesa && menu.almoco.sobremesa !== '-') itemsOfDay.push({ name: menu.almoco.sobremesa.trim(), meal: 'ALMOCO' });
      }
      
      // Jantar
      if (menu.jantar) {
        if (menu.jantar.principal) itemsOfDay.push({ name: menu.jantar.principal.trim(), meal: 'JANTAR' });
        addDishes(menu.jantar.acompanhamentos, 'JANTAR');
        addDishes(menu.jantar.saladas, 'JANTAR');
        if (menu.jantar.ceia && menu.jantar.ceia !== '-') itemsOfDay.push({ name: menu.jantar.ceia.trim(), meal: 'JANTAR' });
      }
      
      // Para cada prato, checamos se existe configuracao em gastos_catalogo
      itemsOfDay.forEach(item => {
         const gastoKey = Object.keys(gastosCatalogo).find(k => k.toLowerCase() === item.name.toLowerCase());
         const regrasGasto = gastoKey ? gastosCatalogo[gastoKey] : undefined;
         if (!regrasGasto) return;
         
         const dayOfWeek = cDate.getDay();
         const isFds = dayOfWeek === 0 || dayOfWeek === 6;
         
         const paxForMeal = item.meal === 'CAFE' ? paxLocalCafe : item.meal === 'ALMOCO' ? paxLocalAlmoco : paxLocalJantar;

         regrasGasto.forEach(gasto => {
            const mat = materiais.find(m => m.nome.toLowerCase() === gasto.nome.toLowerCase());
            if (!mat || !needsByMaterialId[mat.id]) return;

            let qtdCost = 0;
            const isEvento = menu.isEvento;
            const multiplier = isEvento ? (gasto.quantidadeEvento || 0) : (isFds ? gasto.quantidadeFDS : gasto.quantidadeSemana);
            
            // Calculate proportional multiplier
            const paxConfig = paxPratosCatalogo[gastoKey] || {};
            const standardPax = isEvento 
                ? (paxConfig.evento || paxDefaults.almoco || 60)
                : (isFds ? (paxConfig.fds || paxDefaults.almoco || 60) : (paxConfig.semana || paxDefaults.almoco || 60));
                
            qtdCost = (multiplier / standardPax) * paxForMeal;

            if (qtdCost > 0 && !isPast) {
              needsByMaterialId[mat.id].total += qtdCost;
              previsaoDiasOptions.forEach(opt => {
                if (diffDays < opt) {
                  needsByMaterialId[mat.id].inDays[opt] += qtdCost;
                }
              });
            }
         });
      });
    });

    // Gastos Diários globais (Itens Alimentação e Não Alimentares)
    const currentGastosGlobais = [
      ...(gastosCatalogo['Itens Alimentação'] || []),
      ...(gastosCatalogo['Itens Não Alimentares'] || [])
    ];

    const maxDays = previsaoDiasOptions.length > 0 ? Math.max(...previsaoDiasOptions) : 0;
    
    // We want to simulate global daily expenses every day from the day AFTER latestEstoqueDate
    // up to (hoje + maxDays)
    const maxDate = new Date(hoje.getTime() + maxDays * 24 * 60 * 60 * 1000);
    let simDate = new Date(latestEstoqueDate.getTime() + 24 * 60 * 60 * 1000);
    
    // Safety check just in case inventory date is messed up
    const failSafeDate = new Date(hoje.getTime() - 60 * 24 * 60 * 60 * 1000);
    if (simDate < failSafeDate) simDate = failSafeDate;

    while (simDate < maxDate) {
      const cDate = new Date(simDate);
      const isFds = cDate.getDay() === 0 || cDate.getDay() === 6;
      
      const diffTime = cDate.getTime() - hoje.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      // For daily total calculation, we need to find what the likely pax is.
      const d = String(cDate.getDate()).padStart(2, '0');
      const m = String(cDate.getMonth() + 1).padStart(2, '0');
      const dateStr = `${d}/${m}`;
      
      const findMenu = menus.find((menu: any) => menu.date === dateStr);
      const paxForDay = findMenu?.efetivoAlmoco || paxDefaults?.almoco || 60;

      currentGastosGlobais.forEach(gasto => {
        const mat = materiais.find(m => m.nome.toLowerCase() === gasto.nome.toLowerCase());
        if (!mat || !needsByMaterialId[mat.id]) return;

        let qtdCost = 0;
        const multiplier = findMenu?.isEvento ? (gasto.quantidadeEvento || 0) : (isFds ? gasto.quantidadeFDS : gasto.quantidadeSemana);
        qtdCost = multiplier;

        if (qtdCost > 0) {
          needsByMaterialId[mat.id].total += qtdCost; // Update Total Planejado as well (representing up to maxDays)
          previsaoDiasOptions.forEach(opt => {
            if (diffDays < opt) {
              needsByMaterialId[mat.id].inDays[opt] += qtdCost;
            }
          });
        }
      });
      
      simDate = new Date(simDate.getTime() + 24 * 60 * 60 * 1000);
    }

    return needsByMaterialId;
  }, [menus, materiais, gastosCatalogo, previsaoDiasOptions, datasEstoque]);

  const updateMaterial = (id: string, updates: Partial<Material>) => {
    setMateriais(prev => {
      const next = prev.map(m => m.id === id ? { ...m, ...updates } : m);
      if (isDataLoaded) syncAndSave({ materiais: next });
      return next;
    });
  };

  const handleAddNewMaterial = () => {
    const nome = prompt("Digite o nome do novo material:");
    if (!nome?.trim()) return;

    const newMat: Material = {
      id: `mat_${Date.now()}`,
      nome: nome.trim().toUpperCase(),
      categoria: filtroCategoria,
      undMedida: 'KG',
      tipoUso: 'imediato',
      estoque: 0,
      estoquesPorData: {},
      favorito: false
    };

    setMateriais(prev => {
      const next = [...prev, newMat];
      if (isDataLoaded) syncAndSave({ materiais: next });
      return next;
    });
  };

  const handleRemoveMaterial = (id: string, nome: string) => {
    if (!window.confirm(`Deseja realmente remover o material "${nome}"?`)) return;
    
    setMateriais(prev => {
      const next = prev.filter(m => m.id !== id);
      if (isDataLoaded) syncAndSave({ materiais: next });
      return next;
    });
  };

  const tabs = [
    { id: 'CADASTRO', label: 'Cadastro & Estoque', icon: Package },
    { id: 'RECEITAS', label: 'Planejamento Semanal', icon: ChefHat },
    { id: 'CATALOGO', label: 'Catálogo / Comp. de Pratos', icon: BookOpen },
    { id: 'CARDAPIO', label: 'Cardápio / Simulação', icon: CalendarDays },
    { id: 'PREVISAO', label: 'Listas e Previsão', icon: ClipboardList },
    { id: 'LISTA_COMPRAS', label: 'Lista de Compras', icon: ShoppingBag },
  ] as const;

  const materiaisFiltrados = materiais.filter(m => 
    m.categoria === filtroCategoria &&
    m.nome.toLowerCase().includes(cadastroFiltroMsg.toLowerCase())
  ).sort((a, b) => {
    if (a.favorito && !b.favorito) return -1;
    if (!a.favorito && b.favorito) return 1;
    return a.nome.localeCompare(b.nome);
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pt-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 shadow-inner">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">
              Aprovisionamento
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              Integração Cardápio / Estoque
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 bg-slate-100/50 p-2 rounded-2xl border border-slate-200/60 shadow-inner">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300",
                isActive 
                  ? "bg-white text-amber-600 shadow-sm border border-slate-200 translate-y-[-1px]" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>
      
      {activeTab === 'RECEITAS' ? (
        <div className="-mt-8">
          <RefeitorioModule 
            key={activeTab}
            user={userProfile || { uid: '0', name: 'User', rank: 'SD', ala: '0', isAdmin: false }} 
            onBack={() => setActiveTab('CADASTRO')} 
            initialTab="cardapio"
          />
        </div>
      ) : activeTab === 'CATALOGO' ? (
        <div className="-mt-8">
          <AprovisionamentoCatalogo 
            user={userProfile || { uid: '0', name: 'User', rank: 'SD', ala: '0', isAdmin: false }} 
            materiais={materiais}
            paxDefaults={paxDefaults}
            onUpdatePaxDefaults={(newPaxDefaults) => {
              setPaxDefaults(newPaxDefaults);
              syncAndSave({ paxDefaults: newPaxDefaults });
            }}
          />
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm min-h-[500px]">
          {activeTab === 'CADASTRO' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="flex rounded-xl bg-slate-100 p-1">
                {(['MERCADO', 'PROTEINA', 'SACOLAO', 'LIMPEZA'] as CategoriaMaterial[]).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFiltroCategoria(cat)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors",
                      filtroCategoria === cat ? `${
                        cat === 'MERCADO' ? 'bg-[#2A2B4C] text-white' :
                        cat === 'PROTEINA' ? 'bg-[#821D21] text-white' :
                        cat === 'SACOLAO' ? 'bg-[#315629] text-white' :
                        'bg-[#5C3224] text-white'
                      } shadow-sm` : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar material..."
                    value={cadastroFiltroMsg}
                    onChange={e => setCadastroFiltroMsg(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all w-full sm:w-64"
                  />
                </div>
                <button 
                  onClick={handleAddNewMaterial}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold uppercase transition-colors whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className={cn(
                    "uppercase text-[10px] tracking-wider text-white",
                    filtroCategoria === 'MERCADO' ? 'bg-[#2A2B4C]' :
                    filtroCategoria === 'PROTEINA' ? 'bg-[#821D21]' :
                    filtroCategoria === 'SACOLAO' ? 'bg-[#315629]' :
                    'bg-[#5C3224]'
                  )}>
                    <th className="py-3 px-4 font-black">Fav</th>
                    <th className="py-3 px-4 font-black">Material ({filtroCategoria})</th>
                    {filtroCategoria === 'PROTEINA' && <th className="py-3 px-4 font-black text-center">Porção (KG)</th>}
                    <th className="py-3 px-4 font-black text-center">Und. Medida</th>
                    <th className="py-3 px-4 font-black text-center">Tipo Uso</th>
                    {datasEstoque.slice(-3).map(dt => (
                      <th key={dt} className="py-3 px-4 font-black whitespace-nowrap min-w-[120px]">
                        <div className="flex items-center justify-end gap-2">
                          Estoque ({dt})
                          {datasEstoque.length > 1 && (
                            <button
                              onClick={() => handleRemoveDataEstoque(dt)}
                              className="text-slate-400 hover:text-red-500 hover:bg-slate-200 p-0.5 rounded-full transition-colors focus:outline-none"
                              title="Remover data"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="py-3 px-2 font-black text-center w-12">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={() => setShowNovaDataPopup(!showNovaDataPopup)}
                          className="p-1 hover:bg-white/20 rounded-md text-white transition-colors flex items-center justify-center w-full focus:outline-none"
                          title="Nova Data de Contagem"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                        
                        {showNovaDataPopup && (
                          <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200 font-sans">
                            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">
                              Nova Data de Contagem
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Ex: 28/05"
                                value={novaDataValue}
                                onChange={(e) => setNovaDataValue(e.target.value)}
                                className="w-full text-slate-800 text-sm font-semibold border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder:text-slate-300 placeholder:font-normal"
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleAddDataEstoque();
                                  if (e.key === 'Escape') setShowNovaDataPopup(false);
                                }}
                              />
                              <button
                                onClick={handleAddDataEstoque}
                                disabled={!novaDataValue}
                                className="bg-amber-500 hover:bg-amber-600 focus:ring-2 focus:ring-offset-1 focus:ring-amber-500 text-white p-1.5 rounded-lg disabled:opacity-50 transition-colors flex justify-center items-center"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm font-semibold text-slate-700 divide-y divide-slate-100">
                  {materiaisFiltrados.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4">
                        <button
                          onClick={() => updateMaterial(m.id, { favorito: !m.favorito })}
                          className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors focus:outline-none focus:bg-slate-200"
                        >
                          <Star className={cn(
                            "w-4 h-4 transition-all duration-300", 
                            m.favorito ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] scale-110" : "text-slate-300 hover:text-slate-400"
                          )} />
                        </button>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-800">{m.nome}</td>
                      {filtroCategoria === 'PROTEINA' && (
                        <td className="py-2.5 px-4">
                          <input 
                            type="number" 
                            value={m.porcaoPadrao || 0} 
                            step="0.01"
                            onChange={e => updateMaterial(m.id, { porcaoPadrao: parseFloat(e.target.value) })}
                            className="w-20 px-2 py-1 bg-white border border-slate-200 rounded text-center mx-auto block text-xs" 
                          />
                        </td>
                      )}
                      <td className="py-2.5 px-4">
                        <select 
                          value={m.undMedida}
                          onChange={e => updateMaterial(m.id, { undMedida: e.target.value })}
                          className="w-full bg-transparent border-none text-center font-bold text-slate-600 focus:ring-0 cursor-pointer"
                        >
                          <option value="KG">KG.</option>
                          <option value="UND">UND.</option>
                          <option value="LT">LT.</option>
                          <option value="PCT">PCT.</option>
                          <option value="DZ">DZ.</option>
                          <option value="BDJ">BDJ.</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <select 
                          value={m.tipoUso}
                          onChange={e => updateMaterial(m.id, { tipoUso: e.target.value as TipoUso })}
                          className={cn(
                            "px-2 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border-none focus:ring-0 cursor-pointer text-center mx-auto block",
                            m.tipoUso === 'imediato' ? "bg-red-100 text-red-700" : 
                            m.tipoUso === 'prolongado' ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-500"
                          )}
                        >
                          <option value="">--</option>
                          <option value="imediato">Imediato</option>
                          <option value="prolongado">Prolongado</option>
                        </select>
                      </td>
                      {datasEstoque.slice(-3).map((dt, idx, arr) => {
                        const isLatest = idx === arr.length - 1;
                        const mEstoques = m.estoquesPorData || {};
                        let currentVal = mEstoques[dt];
                        if (currentVal === undefined && isLatest && Object.keys(mEstoques).length === 0) {
                          currentVal = m.estoque;
                        }
                        
                        return (
                          <td key={dt} className="py-2.5 px-4 text-right">
                             <input 
                                type="number" 
                                value={currentVal ?? ''} 
                                onChange={e => {
                                  const valString = e.target.value;
                                  const val = valString === '' ? 0 : parseFloat(valString);
                                  const novosEstoques = { ...mEstoques, [dt]: val };
                                  
                                  const updates: Partial<Material> = { estoquesPorData: novosEstoques };
                                  if (isLatest) {
                                    updates.estoque = val;
                                  }
                                  
                                  updateMaterial(m.id, updates);
                                }}
                                className="w-24 px-3 py-1.5 bg-slate-100 border border-transparent focus:border-amber-400 focus:bg-white rounded-lg text-right font-black font-mono ml-auto block transition-all" 
                              />
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={() => handleRemoveMaterial(m.id, m.nome)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors focus:outline-none"
                          title="Excluir Material"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {materiaisFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={7 + (filtroCategoria === 'PROTEINA' ? 1 : 0)} className="py-8 text-center text-slate-400 font-bold uppercase text-xs">Nenhum material encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <button 
              onClick={handleAddNewMaterial}
              className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 text-xs font-bold uppercase hover:bg-slate-50 hover:border-slate-400 hover:text-slate-700 transition-colors w-full justify-center"
            >
              <Plus className="w-4 h-4" /> Adicionar Novo Material
            </button>
          </motion.div>
        )}

        {activeTab === 'CARDAPIO' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Simulador de Consumo</h2>
                <p className="text-xs font-semibold text-slate-500">
                  Planejamento do Cardápio importado do <span className="text-rose-600 font-bold bg-rose-50 px-1 rounded">Planejamento Semanal</span>. A conversão usa os parâmetros do <span className="text-amber-600 font-bold bg-amber-50 px-1 rounded">Catálogo</span>.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
              <div className="flex-1">
                <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs mb-1">Efetivos Estimados Padrão</h3>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                  (Aplicado em dias que não possuem efetivo específico informado)
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Café da Manhã</label>
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 w-32 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400">
                    <input 
                      type="number" 
                      value={paxDefaults?.cafe || ''}
                      onChange={e => {
                        const newPax = {...paxDefaults, cafe: parseInt(e.target.value) || 0};
                        setPaxDefaults(newPax);
                        syncAndSave({ paxDefaults: newPax });
                      }}
                      placeholder="0"
                      className="w-full text-sm font-black text-slate-800 outline-none text-right bg-transparent"
                    />
                    <span className="text-[10px] font-black text-slate-400 ml-2 uppercase">Pax</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Almoço</label>
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 w-32 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400">
                    <input 
                      type="number" 
                      value={paxDefaults?.almoco || ''}
                      onChange={e => {
                        const newPax = {...paxDefaults, almoco: parseInt(e.target.value) || 0};
                        setPaxDefaults(newPax);
                        syncAndSave({ paxDefaults: newPax });
                      }}
                      placeholder="0"
                      className="w-full text-sm font-black text-slate-800 outline-none text-right bg-transparent"
                    />
                    <span className="text-[10px] font-black text-slate-400 ml-2 uppercase">Pax</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Jantar</label>
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 w-32 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400">
                    <input 
                      type="number" 
                      value={paxDefaults?.jantar || ''}
                      onChange={e => {
                        const newPax = {...paxDefaults, jantar: parseInt(e.target.value) || 0};
                        setPaxDefaults(newPax);
                        syncAndSave({ paxDefaults: newPax });
                      }}
                      placeholder="0"
                      className="w-full text-sm font-black text-slate-800 outline-none text-right bg-transparent"
                    />
                    <span className="text-[10px] font-black text-slate-400 ml-2 uppercase">Pax</span>
                  </div>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {isEditingMenu && (
                <RefeitorioEditModal 
                  onClose={() => setIsEditingMenu(false)} 
                  editIndex={editingMenuIndex} 
                />
              )}
            </AnimatePresence>
            
            <div className="space-y-4">
              {filteredMenus.map((menu: any, index: number) => {
                if (!menu.date) return null;
                const paxLocalCafe = menu.efetivoCafe || paxDefaults.cafe || 60;
                const paxLocalAlmoco = menu.efetivoAlmoco || paxDefaults.almoco || 60;
                const paxLocalJantar = menu.efetivoJantar || paxDefaults.jantar || 60;
                const paxForDay = paxLocalAlmoco; // Global fallback
                const isFds = menu.weekday?.toLowerCase().includes('sáb') || menu.weekday?.toLowerCase().includes('dom');

                // Extract all dishes
                const itemsOfDay: { name: string, meal: 'CAFE' | 'ALMOCO' | 'JANTAR' }[] = [];
                const addDishes = (dishes: string, meal: 'CAFE' | 'ALMOCO' | 'JANTAR') => {
                  if (!dishes || dishes === '-') return;
                  dishes.split(',').forEach(dStr => {
                    const trimmed = dStr.trim();
                    if (trimmed) itemsOfDay.push({ name: trimmed, meal });
                  });
                };
                if (menu.cafeManha) addDishes(menu.cafeManha, 'CAFE');
                if (menu.lancheTarde) addDishes(menu.lancheTarde, 'CAFE');
                if (menu.almoco) {
                  if (menu.almoco.principal) itemsOfDay.push({ name: menu.almoco.principal.trim(), meal: 'ALMOCO' });
                  addDishes(menu.almoco.acompanhamentos, 'ALMOCO');
                  addDishes(menu.almoco.saladas, 'ALMOCO');
                  if (menu.almoco.sobremesa && menu.almoco.sobremesa !== '-') itemsOfDay.push({ name: menu.almoco.sobremesa.trim(), meal: 'ALMOCO' });
                }
                if (menu.jantar) {
                  if (menu.jantar.principal) itemsOfDay.push({ name: menu.jantar.principal.trim(), meal: 'JANTAR' });
                  addDishes(menu.jantar.acompanhamentos, 'JANTAR');
                  addDishes(menu.jantar.saladas, 'JANTAR');
                  if (menu.jantar.ceia && menu.jantar.ceia !== '-') itemsOfDay.push({ name: menu.jantar.ceia.trim(), meal: 'JANTAR' });
                }
                
                // Calculate simulation needed for these dishes
                const simulacaoRefeicoes: { nomeIngrediente: string; needed: number; und: string }[] = [];
                itemsOfDay.forEach(item => {
                   const gastoKey = Object.keys(gastosCatalogo).find(k => k.toLowerCase() === item.name.toLowerCase());
                   const regrasGasto = gastoKey ? gastosCatalogo[gastoKey] : undefined;
                   if (regrasGasto) {
                      const paxForMeal = item.meal === 'CAFE' ? paxLocalCafe : item.meal === 'ALMOCO' ? paxLocalAlmoco : paxLocalJantar;
                      regrasGasto.forEach(gasto => {
                         const mat = materiais.find(m => m.nome.toLowerCase() === gasto.nome.toLowerCase());
                         if (mat) {
                            const isEvento = menu.isEvento;
                            const multiplier = isEvento ? (gasto.quantidadeEvento || 0) : (isFds ? gasto.quantidadeFDS : gasto.quantidadeSemana);
                            
                            const paxConfig = paxPratosCatalogo[gastoKey] || {};
                            const standardPax = isEvento 
                                ? (paxConfig.evento || paxDefaults.almoco || 60)
                                : (isFds ? (paxConfig.fds || paxDefaults.almoco || 60) : (paxConfig.semana || paxDefaults.almoco || 60));
                                
                            let qtd = (multiplier / standardPax) * paxForMeal;
                            
                            if (qtd > 0) {
                               const existing = simulacaoRefeicoes.find(s => s.nomeIngrediente === mat.nome);
                               if (existing) {
                                  existing.needed += qtd;
                               } else {
                                  simulacaoRefeicoes.push({ nomeIngrediente: mat.nome, needed: qtd, und: mat.undMedida });
                               }
                            }
                         }
                      });
                   }
                });

                // Calculate global daily fix costs as well for this day
                const currentGastos = [
                  ...(gastosCatalogo['Itens Alimentação'] || []),
                  ...(gastosCatalogo['Itens Não Alimentares'] || [])
                ];
                const simulacaoDiaria: { nomeIngrediente: string; needed: number; und: string }[] = [];
                currentGastos.forEach(gasto => {
                   const mat = materiais.find(m => m.nome === gasto.nome);
                   if (mat) {
                      const multiplier = menu.isEvento ? (gasto.quantidadeEvento || 0) : (isFds ? gasto.quantidadeFDS : gasto.quantidadeSemana);
                      let qtd = multiplier;
                      if (qtd > 0) {
                         const existing = simulacaoDiaria.find(s => s.nomeIngrediente === mat.nome);
                         if (existing) {
                            existing.needed += qtd;
                         } else {
                            simulacaoDiaria.push({ nomeIngrediente: mat.nome, needed: qtd, und: mat.undMedida });
                         }
                      }
                   }
                });

                if (itemsOfDay.length === 0 && currentGastos.length === 0) return null;

                return (
                  <div key={index} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm group">
                    <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data</span>
                          <span className="text-base font-black text-slate-800">{menu.weekday} ({menu.date})</span>
                        </div>
                        <button
                          onClick={() => {
                            const actualIndex = menus.findIndex((m: any) => m.date === menu.date);
                            setEditingMenuIndex(actualIndex !== -1 ? actualIndex : null);
                            setIsEditingMenu(true);
                          }}
                          className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Editar Dia
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-200/60 pt-4">
                        {menu.cafeManha && menu.cafeManha !== '-' && (
                          <div className="flex flex-col gap-1.5">
                             <div className="flex items-center justify-between">
                               <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Café da Manhã</span>
                               <span className="text-[10px] font-black text-amber-700 bg-amber-100/50 px-2 pl-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm border border-amber-200/50"><Sunrise className="w-3 h-3" /> {paxLocalCafe} pax</span>
                             </div>
                             <span className="text-xs font-semibold text-slate-700 leading-relaxed uppercase">{menu.cafeManha}</span>
                          </div>
                        )}
                        {menu.almoco && (
                          <div className="flex flex-col gap-1.5 border-t md:border-t-0 md:border-l border-slate-200/60 pt-4 md:pt-0 md:pl-6">
                             <div className="flex items-center justify-between">
                               <span className="text-[10px] font-bold text-sky-500 uppercase tracking-widest">Almoço</span>
                               <span className="text-[10px] font-black text-sky-700 bg-sky-100/50 px-2 pl-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm border border-sky-200/50"><Utensils className="w-3 h-3" /> {paxLocalAlmoco} pax</span>
                             </div>
                             <span className="text-xs font-semibold text-slate-700 leading-relaxed uppercase">
                               {[menu.almoco.principal, menu.almoco.acompanhamentos, menu.almoco.saladas, menu.almoco.sobremesa].filter(Boolean).map(i => i.trim()).filter(i => i).join(' / ')}
                             </span>
                          </div>
                        )}
                        {menu.jantar && (
                          <div className="flex flex-col gap-1.5 border-t md:border-t-0 md:border-l border-slate-200/60 pt-4 md:pt-0 md:pl-6">
                             <div className="flex items-center justify-between">
                               <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Jantar & Ceia</span>
                               <span className="text-[10px] font-black text-indigo-700 bg-indigo-100/50 px-2 pl-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm border border-indigo-200/50"><Sunset className="w-3 h-3" /> {paxLocalJantar} pax</span>
                             </div>
                             <span className="text-xs font-semibold text-slate-700 leading-relaxed uppercase">
                               {[menu.jantar.principal, menu.jantar.acompanhamentos, menu.jantar.saladas, menu.jantar.ceia].filter(Boolean).map(i => i.trim()).filter(i => i !== '-').join(' / ')}
                             </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-5 bg-white flex flex-col gap-5">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                          <Calculator className="w-5 h-5 text-slate-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Simulação Refeições do Dia</h4>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {simulacaoRefeicoes.length === 0 ? (
                              <span className="text-slate-400 italic font-semibold">Nenhum ingrediente mapeado para os pratos deste dia no Catálogo.</span>
                            ) : (
                              simulacaoRefeicoes.map(item => (
                                <div key={item.nomeIngrediente} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1">
                                  <span className="font-semibold text-slate-600">{item.nomeIngrediente}:</span>
                                  <span className="font-black font-mono text-slate-800">{item.needed.toFixed(2)} {item.und}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {simulacaoDiaria.length > 0 && (
                        <div className="flex gap-4 border-t border-slate-100 pt-5 mt-1">
                          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                            <TrendingDown className="w-5 h-5 text-amber-500" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-2">Simulação de Gastos Diários</h4>
                            <div className="flex flex-wrap gap-2 text-xs">
                              {simulacaoDiaria.map(item => (
                                <div key={item.nomeIngrediente} className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1">
                                  <span className="font-semibold text-amber-700">{item.nomeIngrediente}:</span>
                                  <span className="font-black font-mono text-amber-900">{item.needed.toFixed(2)} {item.und}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {(() => {
                const uniqueDates = Array.from(new Set(filteredMenus.map((c: any) => c.date).filter(Boolean)));
                const currentGastos = [
                  ...(gastosCatalogo['Itens Alimentação'] || []),
                  ...(gastosCatalogo['Itens Não Alimentares'] || [])
                ];
                if (currentGastos.length === 0 || uniqueDates.length === 0) return null;
                
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden shadow-sm mt-6 p-5">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <TrendingDown className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-black uppercase tracking-widest text-amber-800 mb-2">Simulação de Gastos Diários (Fixos Globais)</h4>
                        <p className="text-[10px] text-amber-600 font-bold mb-4 uppercase tracking-widest">
                          {uniqueDates.length} dias identificados. Os valores abaixo refletem o total acumulado nesses dias com base na configuração do Catálogo para categorias de Gastos Diários.
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {currentGastos.map((gasto, idx) => {
                            const mat = materiais.find(m => m.nome.toLowerCase() === gasto.nome.toLowerCase());
                            if (!mat) return null;
                            
                            let totalQtdCost = 0;

                            uniqueDates.forEach(dateStr => {
                              const parts = (dateStr as string).split('/');
                              if (parts.length < 2) return;
                              const d = parseInt(parts[0]);
                              const mo = parseInt(parts[1]);
                              const hoje = new Date();
                              let year = hoje.getFullYear();
                              if (hoje.getMonth() === 0 && mo === 12) year--;
                              else if (hoje.getMonth() === 11 && mo === 1) year++;
                              const cDate = new Date(year, mo - 1, d);
                              cDate.setHours(0,0,0,0);
                              
                              const dayOfWeek = cDate.getDay();
                              const isFds = dayOfWeek === 0 || dayOfWeek === 6;
                              
                              const findMenu = filteredMenus.find((m: any) => m.date === dateStr);
                              const paxForDay = findMenu?.efetivoAlmoco || paxDefaults?.almoco || 60;
                              const multiplier = findMenu?.isEvento ? (gasto.quantidadeEvento || 0) : (isFds ? gasto.quantidadeFDS : gasto.quantidadeSemana);
                              
                              totalQtdCost += multiplier;
                            });

                            if (totalQtdCost <= 0) return null;

                            return (
                              <div key={idx} className="flex items-center gap-1.5 bg-white border border-amber-200/50 rounded-lg px-2.5 py-1">
                                <span className="font-semibold text-amber-900">{mat.nome}:</span>
                                <span className="font-black font-mono text-amber-600">{totalQtdCost.toFixed(2)} {mat.undMedida}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {filteredMenus.length === 0 && (
                 <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhum cardápio importado do planejamento</p>
                 </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'PREVISAO' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
             <div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Ordens de Compra & Previsão</h2>
                <p className="text-xs font-semibold text-slate-500 mb-4">
                  Subtração lógica do Estoque atual contra a necessidade extraída dos próximos dias no Cardápio. A matemática desconta o que já foi utilizado, começando as projeções a partir do dia seguinte ao estoque lançado.
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest mr-2">Configuração de Prazos (Max 4):</div>
                    {previsaoDiasOptions.map(opt => (
                       <div key={opt} className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-2 shadow-sm">
                          {opt} Dias
                          <button onClick={() => {
                             const n = previsaoDiasOptions.filter(o => o !== opt);
                             setPrevisaoDiasOptions(n);
                             syncAndSave({ previsaoDiasOptions: n });
                          }} className="text-slate-400 hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                       </div>
                    ))}
                    {previsaoDiasOptions.length < 4 && (
                       <form onSubmit={(e) => {
                          e.preventDefault();
                          const val = parseInt(newPrevisaoDiaStr);
                          if (!isNaN(val) && val > 0 && !previsaoDiasOptions.includes(val)) {
                             const n = [...previsaoDiasOptions, val].sort((a,b) => a-b);
                             setPrevisaoDiasOptions(n);
                             syncAndSave({ previsaoDiasOptions: n });
                             setNewPrevisaoDiaStr('');
                          }
                       }} className="flex items-center gap-2">
                          <input type="number" min="1" max="180" className="w-20 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:ring-amber-500 focus:border-amber-500 outline-none text-slate-700 shadow-sm" placeholder="Ex: 14" value={newPrevisaoDiaStr} onChange={e => setNewPrevisaoDiaStr(e.target.value)} />
                          <button type="submit" className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors uppercase tracking-widest shadow-sm">Adicionar</button>
                       </form>
                    )}
                  </div>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                      <input 
                        type="checkbox" 
                        checked={mostrarTodosPrevisao} 
                        onChange={e => setMostrarTodosPrevisao(e.target.checked)}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Exibir todos os itens cadastrados</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex rounded-xl bg-slate-100 p-1 mb-6 inline-flex">
                {(['MERCADO', 'PROTEINA', 'SACOLAO', 'LIMPEZA'] as CategoriaMaterial[]).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFiltroCategoriaPrevisao(cat)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors",
                      filtroCategoriaPrevisao === cat ? `${
                        cat === 'MERCADO' ? 'bg-[#2A2B4C] text-white' :
                        cat === 'PROTEINA' ? 'bg-[#821D21] text-white' :
                        cat === 'SACOLAO' ? 'bg-[#315629] text-white' :
                        'bg-[#5C3224] text-white'
                      } shadow-sm` : "text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {[filtroCategoriaPrevisao].map(cat => {
              const catItems = [...materiais]
                .filter(m => m.categoria === cat)
                .filter(m => mostrarTodosPrevisao || calculoPrevisao[m.id]?.total > 0 || m.estoque < 5 || m.favorito)
                .sort((a, b) => {
                  if (a.favorito && !b.favorito) return -1;
                  if (!a.favorito && b.favorito) return 1;
                  return a.nome.localeCompare(b.nome);
                });

              if (catItems.length === 0) return null;

              return (
                <div key={cat} className="mb-6">
                  <h3 className="font-black text-slate-700 uppercase tracking-widest text-xs mb-3 flex items-center gap-2">
                    {cat}
                    <span className="bg-slate-200 text-slate-500 text-[10px] px-2 py-0.5 rounded-full">{catItems.length}</span>
                  </h3>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead>
                        <tr className="bg-slate-800 uppercase text-[10px] tracking-wider text-white">
                          <th className="py-3 px-4 font-black">Material</th>
                          <th className="py-3 px-4 font-black text-center">Unidade</th>
                          <th className="py-3 px-4 font-black text-right leading-tight">
                            Estoque Atual
                            {datasEstoque.length > 0 && <div className="text-[9px] text-slate-300 font-medium tracking-normal mt-0.5">({datasEstoque[datasEstoque.length - 1]})</div>}
                          </th>
                          {previsaoDiasOptions.map(opt => (
                            <th key={opt} className="py-3 px-4 font-black text-right border-l border-slate-700 bg-slate-700/50">Prev. {opt} Dias</th>
                          ))}
                          <th className="py-3 px-4 font-black text-right border-l border-slate-700 bg-slate-700/10">Total Planejado</th>
                          <th className="py-3 px-4 font-black text-right bg-amber-600/20 text-amber-200">Saldo/Déficit</th>
                          <th className="py-3 px-4 font-black text-center border-l border-slate-700 bg-slate-700/50">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm font-semibold text-slate-700 divide-y divide-slate-100">
                        {catItems.map(m => {
                          const needs = calculoPrevisao[m.id] || { inDays: {}, total: 0 };
                          const saldo = m.estoque - needs.total;
                          const isDeficit = saldo < 0;

                          return (
                            <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-4 font-bold text-slate-800">
                                <div className="flex items-center gap-2">
                                  {isDeficit && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                                  {m.nome}
                                  {m.favorito && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded uppercase font-bold tracking-widest">Fav</span>}
                                </div>
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-500 text-xs font-bold">{m.undMedida}</span>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-black text-slate-600">
                                {m.estoque.toFixed(2)}
                              </td>
                              {previsaoDiasOptions.map(opt => {
                                 const val = needs.inDays?.[opt] || 0;
                                 return (
                                   <td key={opt} className="py-2.5 px-4 text-right bg-slate-50 font-mono font-semibold text-slate-500 border-l border-slate-100">
                                     {val > 0 ? val.toFixed(2) : '-'}
                                   </td>
                                 );
                              })}
                              <td className="py-2.5 px-4 text-right bg-slate-50 font-mono font-bold text-slate-800 border-l border-slate-100">
                                {needs.total > 0 ? needs.total.toFixed(2) : '-'}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-black border-l border-slate-100">
                                 <span className={cn(
                                   "px-2.5 py-1 rounded-lg flex items-center justify-end gap-1.5 ml-auto w-max",
                                   isDeficit ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                                 )}>
                                   {isDeficit ? <TrendingDown className="w-3.5 h-3.5" /> : null}
                                   {Math.abs(saldo).toFixed(2)} {m.undMedida} {isDeficit && 'em falta'}
                                 </span>
                              </td>
                              <td className="py-2.5 px-4 text-center border-l border-slate-100">
                                 <button 
                                   onClick={() => promptAddToListaCompras(m, isDeficit ? Math.abs(saldo) : 1)}
                                   disabled={listasDeCompras.some(l => !l.arquivada && l.itens.some(lc => lc.materialId === m.id))}
                                   className={cn(
                                     "p-2 rounded-lg transition-colors inline-flex mb-0",
                                     listasDeCompras.some(l => !l.arquivada && l.itens.some(lc => lc.materialId === m.id)) 
                                       ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                                       : "bg-amber-100 text-amber-600 hover:bg-amber-200"
                                   )}
                                   title={listasDeCompras.some(l => !l.arquivada && l.itens.some(lc => lc.materialId === m.id)) ? 'Já na Listas Ativas' : 'Adicionar à Lista'}
                                 >
                                   <ShoppingBag className="w-4 h-4" />
                                 </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
            {materiais.filter(m => mostrarTodosPrevisao || calculoPrevisao[m.id]?.total > 0 || m.estoque < 5 || m.favorito).length === 0 && (
              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 font-bold uppercase text-xs">
                Nenhum consumo previsto ou item em falta detectado.
              </div>
            )}

          </motion.div>
        )}

        {activeTab === 'LISTA_COMPRAS' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
             <div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Listas de Compras</h2>
                    <p className="text-xs font-semibold text-slate-500">
                      Gerencie suas listas de compras para os diferentes estabelecimentos.
                    </p>
                  </div>
                  <button onClick={() => setShowNovaListaModal(true)} className="px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold uppercase transition-all tracking-widest shadow-md hover:shadow-lg flex items-center gap-2">
                     <Plus className="w-4 h-4" /> Criar Nova Lista
                  </button>
                </div>
              </div>

              {listasDeCompras.length === 0 ? (
                 <div className="py-16 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border border-slate-200 border-dashed">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 mb-4 text-slate-300">
                       <ShoppingBag className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Nenhuma lista encontrada</p>
                    <p className="text-xs font-semibold text-slate-400">Crie sua primeira lista para organizar as compras.</p>
                 </div>
              ) : (
                 <div className="space-y-4">
                    {listasDeCompras.map(lista => {
                       const isExpanded = expandedListaId === lista.id;
                       const totalValue = lista.itens.reduce((acc, item) => acc + (item.valorPago || 0), 0);
                       const completedCount = lista.itens.filter(i => i.concluido).length;
                       
                       return (
                          <div key={lista.id} className={cn("bg-white border transition-all overflow-hidden relative", isExpanded ? "border-indigo-200 shadow-md rounded-2xl" : "border-slate-200 hover:border-slate-300 rounded-2xl", lista.arquivada && !isExpanded && "opacity-70 bg-slate-50")}>
                             {lista.arquivada && <div className="absolute top-0 left-0 w-1 h-full bg-slate-300"></div>}
                             {!lista.arquivada && <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>}
                             
                             <div 
                                onClick={() => setExpandedListaId(isExpanded ? null : lista.id)}
                                className="p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none"
                             >
                                <div className="flex-1">
                                   <div className="flex items-center gap-3 mb-2">
                                     <h3 className="text-base font-black text-slate-800 tracking-tight uppercase leading-tight">{lista.nome}</h3>
                                     {lista.arquivada ? (
                                        <span className="text-[9px] px-2 py-0.5 bg-slate-200 text-slate-500 font-bold uppercase rounded tracking-widest">Arquivada</span>
                                     ) : (
                                        <span className="text-[9px] px-2 py-0.5 bg-emerald-100 text-emerald-700 font-bold uppercase rounded tracking-widest">Ativa</span>
                                     )}
                                   </div>
                                   <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-500">
                                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400"/> {new Date(lista.dataCriacao).toLocaleDateString('pt-BR')}</span>
                                      {lista.estabelecimento && <span className="flex items-center gap-1.5"><Store className="w-3.5 h-3.5 text-slate-400"/> {lista.estabelecimento}</span>}
                                      {lista.local && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400"/> {lista.local}</span>}
                                   </div>
                                </div>
                                <div className="flex items-center gap-8 md:gap-12">
                                   <div className="text-right">
                                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Itens</div>
                                      <div className="text-sm font-black text-slate-700">{completedCount} <span className="text-slate-400 font-semibold">/ {lista.itens.length}</span></div>
                                   </div>
                                   <div className="text-right">
                                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Salvo</div>
                                      <div className="text-lg font-black text-emerald-600">
                                         {totalValue > 0 ? `R$ ${totalValue.toFixed(2).replace('.', ',')}` : '-'}
                                      </div>
                                   </div>
                                   <div className="text-slate-400">
                                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                   </div>
                                </div>
                             </div>

                             <AnimatePresence>
                                {isExpanded && (
                                   <motion.div 
                                     initial={{ height: 0, opacity: 0 }}
                                     animate={{ height: "auto", opacity: 1 }}
                                     exit={{ height: 0, opacity: 0 }}
                                     className="border-t border-slate-100 bg-slate-50 border-dashed"
                                   >
                                      <div className="p-5">
                                         <div className="flex justify-between items-center mb-6">
                                            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Itens da Lista</h4>
                                            {!lista.arquivada && (
                                               <div className="flex gap-2">
                                                  <button onClick={(e) => { e.stopPropagation(); setListasDeCompras(prev => { const next = prev.map(l => l.id === lista.id ? { ...l, arquivada: true } : l); syncAndSave({ listasDeCompras: next }); return next; }) }} className="px-3 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg text-[10px] font-bold uppercase transition-colors tracking-widest">
                                                     Arquivar Lista
                                                  </button>
                                                  <button onClick={(e) => { e.stopPropagation(); handleManualAddToLista(lista.id); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg text-[10px] font-bold uppercase transition-colors tracking-widest">
                                                     <Plus className="w-3.5 h-3.5" /> Incluir Item
                                                  </button>
                                               </div>
                                            )}
                                         </div>

                                         {lista.itens.length === 0 ? (
                                            <div className="py-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">Sem itens nesta lista ainda.</div>
                                         ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                               {lista.itens.map(item => (
                                                  <div key={item.id} className={cn(
                                                     "p-4 rounded-xl border transition-all", 
                                                     item.concluido ? "bg-white/40 border-slate-200 opacity-70 grayscale-[0.5]" : "bg-white border-slate-200 shadow-sm hover:border-indigo-300"
                                                  )}>
                                                     <div className="flex justify-between items-start mb-3 gap-3">
                                                        <div className="flex items-start gap-3">
                                                           <button 
                                                              onClick={() => handleToggleConcluidoListaCompras(lista.id, item.id)} 
                                                              className={cn(
                                                                 "w-6 h-6 rounded flex items-center justify-center border mt-0.5 transition-colors cursor-pointer shrink-0", 
                                                                 item.concluido ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 bg-slate-50 hover:border-emerald-500"
                                                              )}
                                                           >
                                                              {item.concluido && <div className="w-2.5 h-2.5 bg-white rounded-[2px]" />}
                                                           </button>
                                                           <div>
                                                              <div className={cn("text-xs font-bold text-slate-800 leading-tight", item.concluido && "line-through text-slate-500")}>
                                                                 {item.nome}
                                                              </div>
                                                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                                 {item.categoria}
                                                              </div>
                                                           </div>
                                                        </div>
                                                        {!lista.arquivada && (
                                                           <button onClick={() => handleRemoveFromListaCompras(lista.id, item.id)} className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0">
                                                              <X className="w-4 h-4" />
                                                           </button>
                                                        )}
                                                     </div>
                                                     
                                                     <div className="flex flex-col gap-2 border-t border-slate-100/50 pt-3 mt-3">
                                                        <div className="flex items-center justify-between">
                                                           <div className="text-[10px] font-bold text-slate-500 tracking-wider">QUANTIDADE:</div>
                                                           <div className="flex items-center gap-1.5">
                                                              <input 
                                                                type="number"
                                                                min="0"
                                                                step="any"
                                                                disabled={lista.arquivada}
                                                                value={item.quantidade}
                                                                onChange={e => handleChangeQuantidadeListaCompras(lista.id, item.id, parseFloat(e.target.value) || 0)}
                                                                className={cn("w-20 text-right rounded-lg text-sm font-black py-1 px-2 outline-none focus:ring-2 disabled:bg-transparent", lista.arquivada ? "bg-transparent text-slate-500 border-none" : "bg-slate-50 border border-slate-200 text-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20")}
                                                              />
                                                              <span className="text-[10px] font-bold text-slate-400 w-6">{item.undMedida}</span>
                                                           </div>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                           <div className="text-[10px] font-bold text-slate-500 tracking-wider">VALOR (R$):</div>
                                                           <div className="flex items-center gap-1.5">
                                                              <span className="text-[10px] font-bold text-slate-400">R$</span>
                                                              <input 
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                placeholder="0,00"
                                                                disabled={lista.arquivada}
                                                                value={item.valorPago || ''}
                                                                onChange={e => handleChangeValorPagoListaCompras(lista.id, item.id, parseFloat(e.target.value) || 0)}
                                                                className={cn("w-24 text-right rounded-lg text-sm font-black py-1 px-2 outline-none focus:ring-2 disabled:bg-transparent placeholder:text-slate-300", lista.arquivada ? "bg-transparent text-slate-500 border-none px-0" : "bg-emerald-50/50 border border-emerald-200/50 text-emerald-700 focus:border-emerald-500 focus:ring-emerald-500/20")}
                                                              />
                                                           </div>
                                                        </div>
                                                     </div>
                                                  </div>
                                               ))}
                                            </div>
                                         )}
                                      </div>
                                   </motion.div>
                                )}
                             </AnimatePresence>
                          </div>
                       );
                    })}
                 </div>
              )}
          </motion.div>
        )}
      </div>
      )}

      <AnimatePresence>
        {showAddListaModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                      {manualItemForm.materialId ? "Adicionar à Lista" : "Novo Item"}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500">
                      {manualItemForm.materialId ? "Confirme a quantidade e a unidade desejada." : "Adicione um item manual na lista de compras."}
                    </p>
                  </div>
                  <button onClick={() => setShowAddListaModal(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Descrição do Item</label>
                  <input 
                    autoFocus
                    placeholder="Ex: ARROZ, DETERGENTE..."
                    className="w-full bg-slate-100 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={manualItemForm.nome}
                    onChange={e => handleManualItemNameChange(e.target.value)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onFocus={() => {
                      if (manualItemSuggestions.length > 0) setShowSuggestions(true);
                    }}
                    onKeyDown={e => e.key === 'Enter' && !showSuggestions && handleSaveManualItem()}
                  />
                  
                  <AnimatePresence>
                    {showSuggestions && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[110]"
                      >
                        {manualItemSuggestions.map(m => (
                          <button
                            key={m.id}
                            onClick={() => handleSelectSuggestion(m)}
                            className="w-full p-4 text-left hover:bg-indigo-50 flex items-center justify-between group transition-colors"
                          >
                            <div>
                              <p className="text-sm font-bold text-slate-700">{m.nome}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.categoria} • {m.undMedida}</p>
                            </div>
                            <Plus className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Quantidade</label>
                    <input 
                      type="number"
                      step="any"
                      min="0.1"
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      value={manualItemForm.quantidade}
                      onChange={e => setManualItemForm(prev => ({ ...prev, quantidade: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Unidade</label>
                    <input 
                      placeholder="Ex: KG, UN, PCT"
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      value={manualItemForm.undMedida}
                      onChange={e => setManualItemForm(prev => ({ ...prev, undMedida: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => setShowAddListaModal(false)}
                  className="flex-1 py-3 px-4 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveManualItem}
                  disabled={!manualItemForm.nome.trim()}
                  className="flex-1 py-3 px-4 rounded-2xl bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar Item
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showNovaListaModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Criar Nova Lista</h3>
                    <p className="text-xs font-semibold text-slate-500">Adicione as informações para a nova lista.</p>
                  </div>
                  <button onClick={() => setShowNovaListaModal(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data da Referência</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-100 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={archiveForm.dataCriacao}
                    onChange={e => setArchiveForm(prev => ({ ...prev, dataCriacao: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome / Título da Lista</label>
                  <input 
                    autoFocus
                    placeholder="Ex: Compras da Semana"
                    className="w-full bg-slate-100 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={archiveForm.nome}
                    onChange={e => setArchiveForm(prev => ({ ...prev, nome: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Estabelecimento</label>
                  <input 
                    placeholder="Ex: Dom Atacadista"
                    className="w-full bg-slate-100 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={archiveForm.estabelecimento}
                    onChange={e => setArchiveForm(prev => ({ ...prev, estabelecimento: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Local / Filial</label>
                  <input 
                    placeholder="Ex: Balneário"
                    className="w-full bg-slate-100 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={archiveForm.local}
                    onChange={e => setArchiveForm(prev => ({ ...prev, local: e.target.value }))}
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => setShowNovaListaModal(false)}
                  className="flex-1 py-3 px-4 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleNovaListaCompras}
                  className="flex-1 py-3 px-4 rounded-2xl bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Criar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

