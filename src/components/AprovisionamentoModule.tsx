import React, { useState, useMemo, useEffect } from 'react';
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
  BookOpen
} from 'lucide-react';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { RefeitorioModule } from './RefeitorioModule';
import { AprovisionamentoCatalogo, GastoIngrediente } from './AprovisionamentoCatalogo';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRefeitorioData } from '../hooks/useRefeitorioData';


type CategoriaMaterial = 'MERCADO' | 'PROTEINA' | 'SACOLAO' | 'LIMPEZA';
type TipoUso = 'imediato' | 'prolongado';

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
  const [activeTab, setActiveTab] = useState<'CADASTRO' | 'RECEITAS' | 'CARDAPIO' | 'PREVISAO' | 'CATALOGO'>('CADASTRO');
  
  const [materiais, setMateriais] = useState<Material[]>(MOCK_MATERIAIS);
  const [receitas, setReceitas] = useState<Receita[]>(MOCK_RECEITAS);
  const [cardapio, setCardapio] = useState<CardapioDia[]>(MOCK_CARDAPIO);
  const [cadastroFiltroMsg, setCadastroFiltroMsg] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaMaterial>('MERCADO');
  const [gastosCatalogo, setGastosCatalogo] = useState<Record<string, GastoIngrediente[]>>({});

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

  const [datasEstoque, setDatasEstoque] = useState<string[]>(['27/05']);
  const [showNovaDataPopup, setShowNovaDataPopup] = useState(false);
  const [novaDataValue, setNovaDataValue] = useState('');

  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    const fetchDados = async () => {
      try {
        // Fetch Gastos
        const docRefGastos = doc(db, 'aprovisionamento', 'gastos_catalogo');
        const snapGastos = await getDoc(docRefGastos);
        if (snapGastos.exists()) {
          setGastosCatalogo(snapGastos.data().gastos || {});
        }

        // Fetch Dados Principais
        const docRefDados = doc(db, 'aprovisionamento', 'dados');
        const snapDados = await getDoc(docRefDados);
        if (snapDados.exists()) {
          const data = snapDados.data();
          if (data.materiais) setMateriais(data.materiais);
          if (data.receitas) setReceitas(data.receitas);
          if (data.cardapio) setCardapio(data.cardapio);
        }
      } catch (e) {
        console.error("Error fetching aprovisionamento dados:", e);
      } finally {
        setIsDataLoaded(true);
      }
    };
    fetchDados();
  }, []);

  useEffect(() => {
    if (!isDataLoaded) return;
    const saveDados = async () => {
      try {
        await setDoc(doc(db, 'aprovisionamento', 'dados'), {
          materiais,
          receitas,
          cardapio
        }, { merge: true });
      } catch (e) {
        console.error("Error saving aprovisionamento dados:", e);
      }
    };
    const timeout = setTimeout(saveDados, 2000);
    return () => clearTimeout(timeout);
  }, [materiais, receitas, cardapio, isDataLoaded]);

  const handleAddDataEstoque = () => {
    if (novaDataValue && !datasEstoque.includes(novaDataValue)) {
      const novaData = novaDataValue;
      setDatasEstoque(prev => [...prev, novaData]);
      
      const latestData = datasEstoque[datasEstoque.length - 1];
      setMateriais(prev => prev.map(m => {
        const estoques = m.estoquesPorData || { '27/05': m.estoque };
        const val = estoques[latestData] ?? m.estoque;
        return {
          ...m,
          estoquesPorData: { ...estoques, [novaData]: val },
          estoque: val
        };
      }));
    }
    setShowNovaDataPopup(false);
    setNovaDataValue('');
  };

  const handleRemoveDataEstoque = (dataToRemove: string) => {
    if (datasEstoque.length > 1) {
      setDatasEstoque(prev => prev.filter(dt => dt !== dataToRemove));
    }
  };

  // Cálculos de Previsão
  const calculoPrevisao = useMemo(() => {
    // Dias a considerar: hoje até +3, +5, +10 dias
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    
    const needsByMaterialId: Record<string, { in3Days: number, in5Days: number, in10Days: number, total: number }> = {};
    
    materiais.forEach(m => {
      needsByMaterialId[m.id] = { in3Days: 0, in5Days: 0, in10Days: 0, total: 0 };
    });

    filteredMenus.forEach(menu => {
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
      
      const isPast = cDate.getTime() < hoje.getTime();
      const diffTime = cDate.getTime() - hoje.getTime(); // Not using absolute, so negative for past
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Default to 60 for now if pax is not specified in menu
      const paxForDay = menu.qtdMilitares || 60;

      // Extract all dishes names configured for this day
      const itemsOfDay: string[] = [];
      const addDishes = (dishes: string) => {
        if (!dishes || dishes === '-') return;
        dishes.split(',').forEach(dStr => {
           const trimmed = dStr.trim();
           if (trimmed) itemsOfDay.push(trimmed);
        });
      };
      
      // Almoço
      if (menu.almoco) {
        if (menu.almoco.principal) itemsOfDay.push(menu.almoco.principal.trim());
        addDishes(menu.almoco.acompanhamentos);
        addDishes(menu.almoco.saladas);
        if (menu.almoco.sobremesa && menu.almoco.sobremesa !== '-') itemsOfDay.push(menu.almoco.sobremesa.trim());
      }
      
      // Jantar
      if (menu.jantar) {
        if (menu.jantar.principal) itemsOfDay.push(menu.jantar.principal.trim());
        addDishes(menu.jantar.acompanhamentos);
        addDishes(menu.jantar.saladas);
        if (menu.jantar.ceia && menu.jantar.ceia !== '-') itemsOfDay.push(menu.jantar.ceia.trim());
      }
      
      // Para cada prato, checamos se existe configuracao em gastos_catalogo
      itemsOfDay.forEach(itemName => {
         const regrasGasto = gastosCatalogo[itemName];
         if (!regrasGasto) return;
         
         const dayOfWeek = cDate.getDay();
         const isFds = dayOfWeek === 0 || dayOfWeek === 6;

         regrasGasto.forEach(gasto => {
            const mat = materiais.find(m => m.nome === gasto.nome);
            if (!mat || !needsByMaterialId[mat.id]) return;

            let qtdCost = 0;
            const multiplier = isFds ? gasto.quantidadeFDS : gasto.quantidadeSemana;
            if (gasto.metodologia === 'por_dia') {
              qtdCost = multiplier; // Fixed daily total for this dish
            } else if (gasto.metodologia === 'por_prato') {
              qtdCost = multiplier * paxForDay; // Multiplied by pax
            }

            if (qtdCost > 0 && !isPast) {
              needsByMaterialId[mat.id].total += qtdCost;
              if (diffDays >= 0 && diffDays < 3) needsByMaterialId[mat.id].in3Days += qtdCost;
              if (diffDays >= 0 && diffDays < 5) needsByMaterialId[mat.id].in5Days += qtdCost;
              if (diffDays >= 0 && diffDays < 10) needsByMaterialId[mat.id].in10Days += qtdCost;
            }
         });
      });
    });

    // Gastos Diários globais (Itens Alimentação e Não Alimentares)
    const currentGastosGlobais = [
      ...(gastosCatalogo['Itens Alimentação'] || []),
      ...(gastosCatalogo['Itens Não Alimentares'] || [])
    ];

    const uniqueDates = Array.from(new Set(filteredMenus.map((m: any) => m.date).filter(Boolean)));

    uniqueDates.forEach(dateStr => {
      const parts = dateStr.split('/');
      if (parts.length < 2) return;
      const d = parseInt(parts[0]);
      const mo = parseInt(parts[1]);
      if (isNaN(d) || isNaN(mo)) return;
      
      let year = hoje.getFullYear();
      if (hoje.getMonth() === 0 && mo === 12) year--;
      else if (hoje.getMonth() === 11 && mo === 1) year++;
      
      const cDate = new Date(year, mo - 1, d);
      cDate.setHours(0,0,0,0);
      
      const dayOfWeek = cDate.getDay();
      const isFds = dayOfWeek === 0 || dayOfWeek === 6;
      
      const isPast = cDate.getTime() < hoje.getTime();
      const diffTime = cDate.getTime() - hoje.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Consider global pax
      const findMenu = filteredMenus.find((m: any) => m.date === dateStr);
      const paxForDay = findMenu?.qtdMilitares || 60;

      currentGastosGlobais.forEach(gasto => {
        const mat = materiais.find(m => m.nome === gasto.nome);
        if (!mat || !needsByMaterialId[mat.id]) return;

        let qtdCost = 0;
        const multiplier = isFds ? gasto.quantidadeFDS : gasto.quantidadeSemana;
        if (gasto.metodologia === 'por_dia') {
          qtdCost = multiplier;
        } else if (gasto.metodologia === 'por_prato') {
          qtdCost = multiplier * paxForDay;
        }

        if (qtdCost > 0 && !isPast) {
          needsByMaterialId[mat.id].total += qtdCost;
          if (diffDays >= 0 && diffDays < 3) needsByMaterialId[mat.id].in3Days += qtdCost;
          if (diffDays >= 0 && diffDays < 5) needsByMaterialId[mat.id].in5Days += qtdCost;
          if (diffDays >= 0 && diffDays < 10) needsByMaterialId[mat.id].in10Days += qtdCost;
        }
      });
    });

    return needsByMaterialId;
  }, [filteredMenus, materiais, gastosCatalogo]);

  const updateMaterial = (id: string, updates: Partial<Material>) => {
    setMateriais(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const tabs = [
    { id: 'CADASTRO', label: 'Cadastro & Estoque', icon: Package },
    { id: 'RECEITAS', label: 'Planejamento Semanal', icon: ChefHat },
    { id: 'CATALOGO', label: 'Catálogo', icon: BookOpen },
    { id: 'CARDAPIO', label: 'Cardápio / Simulação', icon: CalendarDays },
    { id: 'PREVISAO', label: 'Listas e Previsão', icon: ClipboardList },
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
    <div className="w-full max-w-7xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
                      <td className="py-2.5 px-2"></td>
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
            
            <button className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 text-xs font-bold uppercase hover:bg-slate-50 hover:border-slate-400 hover:text-slate-700 transition-colors w-full justify-center">
              <Plus className="w-4 h-4" /> Adicionar Novo Material
            </button>
          </motion.div>
        )}

        {activeTab === 'CARDAPIO' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Simulador de Consumo</h2>
                <p className="text-xs font-semibold text-slate-500">
                  Planejamento do Cardápio importado do <span className="text-rose-600 font-bold bg-rose-50 px-1 rounded">Planejamento Semanal</span>. A conversão usa os parâmetros do <span className="text-amber-600 font-bold bg-amber-50 px-1 rounded">Catálogo</span>.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {filteredMenus.map((menu: any, index: number) => {
                if (!menu.date) return null;
                const paxForDay = menu.qtdMilitares || 60; // defaulting to 60 if not specified
                const isFds = menu.weekday?.toLowerCase().includes('sáb') || menu.weekday?.toLowerCase().includes('dom');

                // Extract all dishes
                const itemsOfDay: string[] = [];
                const addDishes = (dishes: string) => {
                  if (!dishes || dishes === '-') return;
                  dishes.split(',').forEach(dStr => {
                    const trimmed = dStr.trim();
                    if (trimmed) itemsOfDay.push(trimmed);
                  });
                };
                if (menu.almoco) {
                  if (menu.almoco.principal) itemsOfDay.push(menu.almoco.principal.trim());
                  addDishes(menu.almoco.acompanhamentos);
                  addDishes(menu.almoco.saladas);
                  if (menu.almoco.sobremesa && menu.almoco.sobremesa !== '-') itemsOfDay.push(menu.almoco.sobremesa.trim());
                }
                if (menu.jantar) {
                  if (menu.jantar.principal) itemsOfDay.push(menu.jantar.principal.trim());
                  addDishes(menu.jantar.acompanhamentos);
                  addDishes(menu.jantar.saladas);
                  if (menu.jantar.ceia && menu.jantar.ceia !== '-') itemsOfDay.push(menu.jantar.ceia.trim());
                }
                
                // Calculate simulation needed for these dishes
                const simulacaoData: { nomeIngrediente: string; needed: number; und: string }[] = [];
                itemsOfDay.forEach(itemName => {
                   const regrasGasto = gastosCatalogo[itemName];
                   if (regrasGasto) {
                      regrasGasto.forEach(gasto => {
                         const mat = materiais.find(m => m.nome === gasto.nome);
                         if (mat) {
                            const multiplier = isFds ? gasto.quantidadeFDS : gasto.quantidadeSemana;
                            let qtd = 0;
                            if (gasto.metodologia === 'por_dia') qtd = multiplier;
                            else if (gasto.metodologia === 'por_prato') qtd = multiplier * paxForDay;
                            
                            if (qtd > 0) {
                               const existing = simulacaoData.find(s => s.nomeIngrediente === mat.nome);
                               if (existing) {
                                  existing.needed += qtd;
                               } else {
                                  simulacaoData.push({ nomeIngrediente: mat.nome, needed: qtd, und: mat.undMedida });
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
                currentGastos.forEach(gasto => {
                   const mat = materiais.find(m => m.nome === gasto.nome);
                   if (mat) {
                      const multiplier = isFds ? gasto.quantidadeFDS : gasto.quantidadeSemana;
                      let qtd = 0;
                      if (gasto.metodologia === 'por_dia') qtd = multiplier;
                      else if (gasto.metodologia === 'por_prato') qtd = multiplier * paxForDay;
                      if (qtd > 0) {
                         const existing = simulacaoData.find(s => s.nomeIngrediente === mat.nome);
                         if (existing) {
                            existing.needed += qtd;
                         } else {
                            simulacaoData.push({ nomeIngrediente: mat.nome, needed: qtd, und: mat.undMedida });
                         }
                      }
                   }
                });

                if (itemsOfDay.length === 0 && currentGastos.length === 0) return null;

                return (
                  <div key={index} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm group">
                    <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center">
                      <div className="flex gap-4 items-center">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data</span>
                          <span className="text-sm font-black text-slate-800">{menu.weekday} ({menu.date})</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pratos do Dia</span>
                          <span className="text-sm font-black text-rose-600 line-clamp-1 max-w-sm">{itemsOfDay.join(', ')}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Qtd Militares</span>
                          <span className="text-sm font-black text-slate-700">{paxForDay} pax</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-5 bg-white flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                        <Calculator className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Simulação Consolidada do Dia</h4>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {simulacaoData.length === 0 ? (
                            <span className="text-slate-400 italic font-semibold">Nenhum ingrediente mapeado para os pratos de hoje no Catálogo.</span>
                          ) : (
                            simulacaoData.map(item => (
                              <div key={item.nomeIngrediente} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1">
                                <span className="font-semibold text-slate-600">{item.nomeIngrediente}:</span>
                                <span className="font-black font-mono text-slate-800">{item.needed.toFixed(2)} {item.und}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
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
                            const mat = materiais.find(m => m.nome === gasto.nome);
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
                              const paxForDay = findMenu?.qtdMilitares || 60;
                              const multiplier = isFds ? gasto.quantidadeFDS : gasto.quantidadeSemana;
                              
                              if (gasto.metodologia === 'por_dia') {
                                totalQtdCost += multiplier;
                              } else if (gasto.metodologia === 'por_prato') {
                                totalQtdCost += multiplier * paxForDay;
                              }
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
                <p className="text-xs font-semibold text-slate-500">
                  Subtração lógica do Estoque atual contra a necessidade extraída dos próximos dias no Cardápio.
                </p>
              </div>

              {['MERCADO', 'PROTEINA', 'SACOLAO', 'LIMPEZA'].map(cat => {
              const catItems = [...materiais]
                .filter(m => m.categoria === cat)
                .filter(m => calculoPrevisao[m.id]?.total > 0 || m.estoque < 5 || m.favorito)
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
                          <th className="py-3 px-4 font-black text-right">Estoque Atual</th>
                          <th className="py-3 px-4 font-black text-right border-l border-slate-700 bg-slate-700/50">Prev. 3 Dias</th>
                          <th className="py-3 px-4 font-black text-right border-l border-slate-700 bg-slate-700/30">Prev. 5 Dias</th>
                          <th className="py-3 px-4 font-black text-right border-l border-slate-700 bg-slate-700/10">Total Planejado</th>
                          <th className="py-3 px-4 font-black text-right bg-amber-600/20 text-amber-200">Saldo/Déficit</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm font-semibold text-slate-700 divide-y divide-slate-100">
                        {catItems.map(m => {
                          const needs = calculoPrevisao[m.id] || { in3Days: 0, in5Days: 0, in10Days: 0, total: 0 };
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
                              <td className="py-2.5 px-4 text-right bg-slate-50 font-mono font-semibold text-slate-500 border-l border-slate-100">
                                {needs.in3Days > 0 ? needs.in3Days.toFixed(2) : '-'}
                              </td>
                              <td className="py-2.5 px-4 text-right bg-slate-50 font-mono font-semibold text-slate-500 border-l border-slate-100">
                                {needs.in5Days > 0 ? needs.in5Days.toFixed(2) : '-'}
                              </td>
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
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
            {materiais.filter(m => calculoPrevisao[m.id]?.total > 0 || m.estoque < 5 || m.favorito).length === 0 && (
              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 font-bold uppercase text-xs">
                Nenhum consumo previsto ou item em falta detectado.
              </div>
            )}

          </motion.div>
        )}
      </div>
      )}
    </div>
  );
}

