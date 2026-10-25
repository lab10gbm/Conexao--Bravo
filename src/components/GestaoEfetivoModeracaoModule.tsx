import React, { useState, useMemo, useEffect } from 'react';
import { parseRank, sortAllBySeniority } from "../lib/rankUtils";
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Save, 
  X, 
  Trash2, 
  ArrowLeft, 
  Plus, 
  ChevronDown, 
  ChevronUp,
  Filter,
  RotateCcw,
  Stethoscope,
  Shield,
  HeartPulse,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Mail,
  Phone,
  SlidersHorizontal,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useMilitars } from '../contexts/MilitarContext';
import { cn, normalizeObm, normalizeRg } from '../lib/utils';
import { UserProfile } from '../types';
import { resolveCanonicalScope, formatScopeLabel, CANONICAL_REGIONAL_COMMANDS } from '../lib/canonicalScope';

// Eixos Organizacionais do CBMERJ
export type OrgAxis = 'ALL' | 'SAUDE' | 'TERRITORIAL_CBA' | 'COMANDO_GERAL' | 'ESPECIALIZADO' | 'TERCEIRIZADOS';

export interface MilitarClassification {
  axis: OrgAxis;
  axisLabel: string;
  isMedico: boolean;
  healthBranch?: string;
  cbaId: string;
  cbaLabel: string;
  rankCategory: 'OFICIAL_SUPERIOR' | 'OFICIAL_SUBALTERNO' | 'SARGENTO_SUBTEN' | 'CABO_SOLDADO' | 'CIVIL';
  situacaoCategory: 'PRONTO' | 'FERIAS' | 'SAUDE_LTS' | 'LICENCA_ESPECIAL' | 'OUTROS';
}

export function classifyMilitar(m: any): MilitarClassification {
  const isMed = Boolean(
    m.isMedico === true ||
    (m.quadro && (m.quadro.includes('Méd') || m.quadro.includes('MED') || m.quadro.includes('QOS'))) ||
    (m.rank && m.rank.includes('MED'))
  );

  const obmUpper = String(m.obm || '').toUpperCase().trim();
  const rankUpper = String(m.rank || '').toUpperCase().trim();
  const situacaoUpper = String(m.situacao || 'ATIVO').toUpperCase().trim();

  // 1. Determina Eixo Organizacional
  let axis: OrgAxis = 'TERRITORIAL_CBA';
  let axisLabel = 'Comando Regional (Operacional)';
  let healthBranch: string | undefined = undefined;

  if (m.isOutsourced || obmUpper.includes('TERCEIRIZAD') || rankUpper === 'CIVIL') {
    axis = 'TERCEIRIZADOS';
    axisLabel = 'Terceirizados (Civis)';
  } else if (
    isMed ||
    obmUpper.includes('GSE') ||
    obmUpper.includes('SOCORRO DE EMERGÊNCIA') ||
    obmUpper.includes('HCAP') ||
    obmUpper.includes('ARISTARCHO PESSOA') ||
    obmUpper.includes('HOSPITAL') ||
    obmUpper.includes('DGS') ||
    obmUpper.includes('DIRETORIA-GERAL DE SAÚDE') ||
    obmUpper.includes('DIRETORIA GERAL DE SAUDE') ||
    obmUpper.includes('POLICLÍNICA') ||
    obmUpper.includes('POLICLINICA') ||
    obmUpper.includes('COAPH') ||
    obmUpper.includes('CPM') ||
    obmUpper.includes('PERÍCIAS') ||
    obmUpper.includes('PERICIAS') ||
    obmUpper.includes('POSTOS MÉDICOS') ||
    obmUpper.includes('POSTOS MEDICOS') ||
    obmUpper.includes('SUSAU') ||
    obmUpper.includes('SAÚDE') ||
    obmUpper.includes('SAUDE')
  ) {
    axis = 'SAUDE';
    axisLabel = 'Diretoria-Geral de Saúde (DGS)';

    if (obmUpper.includes('GSE') || obmUpper.includes('SOCORRO DE EMERGÊNCIA')) {
      healthBranch = 'GSE - Socorro de Emergência';
    } else if (obmUpper.includes('HCAP') || obmUpper.includes('ARISTARCHO PESSOA') || obmUpper.includes('HOSPITAL')) {
      healthBranch = 'HCAP - Hospital Central';
    } else if (obmUpper.includes('DGS') || obmUpper.includes('DIRETORIA-GERAL DE SAÚDE') || obmUpper.includes('DIRETORIA GERAL DE SAUDE')) {
      healthBranch = 'DGS - Diretoria-Geral de Saúde';
    } else if (obmUpper.includes('1ª POLICLÍNICA') || obmUpper.includes('1 POLICLINICA')) {
      healthBranch = '1ª Policlínica (Campinho)';
    } else if (obmUpper.includes('2ª POLICLÍNICA') || obmUpper.includes('2 POLICLINICA')) {
      healthBranch = '2ª Policlínica (Nova Iguaçu)';
    } else if (obmUpper.includes('3ª POLICLÍNICA') || obmUpper.includes('3 POLICLINICA')) {
      healthBranch = '3ª Policlínica (Niterói)';
    } else if (obmUpper.includes('4ª POLICLÍNICA') || obmUpper.includes('4 POLICLINICA')) {
      healthBranch = '4ª Policlínica (Campos)';
    } else if (obmUpper.includes('COAPH')) {
      healthBranch = 'COAPH - Pré-Hospitalar';
    } else if (obmUpper.includes('CPM') || obmUpper.includes('PERÍCIAS')) {
      healthBranch = 'CPM - Perícias Médicas';
    } else if (obmUpper.includes('SUSAU')) {
      healthBranch = 'SUSAU - Superintendência de Saúde';
    } else if (obmUpper.includes('COORDENAÇÃO') || obmUpper.includes('POSTOS')) {
      healthBranch = 'Coordenações & Postos Médicos';
    } else if (isMed) {
      healthBranch = 'Oficial Médico Alocado em OBM';
    } else {
      healthBranch = 'Outras Unidades de Saúde';
    }
  } else if (
    obmUpper.includes('GMAR') ||
    obmUpper.includes('SALVAMENTO MARÍTIMO') ||
    obmUpper.includes('GOPP') ||
    obmUpper.includes('GBS') ||
    obmUpper.includes('PRODUTOS PERIGOSOS') ||
    obmUpper.includes('AÉREAS') ||
    obmUpper.includes('GOA')
  ) {
    axis = 'ESPECIALIZADO';
    axisLabel = 'Salvamento Marítimo / Especializado';
  } else if (
    obmUpper.includes('DGP') ||
    obmUpper.includes('COMANDO-GERAL') ||
    obmUpper.includes('COMANDO GERAL') ||
    obmUpper.includes('ESTADO-MAIOR') ||
    obmUpper.includes('ALERJ') ||
    obmUpper.includes('PGE') ||
    obmUpper.includes('TRIBUNAL') ||
    obmUpper.includes('PREFEITURA') ||
    obmUpper.includes('SECRETARIA') ||
    obmUpper.includes('ASPLO') ||
    obmUpper.includes('SUOP')
  ) {
    axis = 'COMANDO_GERAL';
    axisLabel = 'Comando-Geral & Órgãos Especiais';
  }

  // 2. Determina CBA Canônico
  let resolvedScope = m.scope;
  if (!resolvedScope || !resolvedScope.cbaId) {
    resolvedScope = resolveCanonicalScope(m.obm);
  }
  const cbaId = resolvedScope?.cbaId || 'cbmerj_geral';
  const cbaObj = CANONICAL_REGIONAL_COMMANDS[cbaId];
  const cbaLabel = cbaObj?.shortName || (cbaId === 'cba_vii' ? 'CBA VII' : cbaId.toUpperCase().replace('_', ' '));

  // 3. Determina Categoria Hierárquica
  let rankCategory: MilitarClassification['rankCategory'] = 'CABO_SOLDADO';
  if (rankUpper === 'CIVIL') {
    rankCategory = 'CIVIL';
  } else if (rankUpper.includes('CEL') || rankUpper.includes('CORONEL') || rankUpper.includes('TC') || rankUpper.includes('MAJ') || rankUpper.includes('MAJOR')) {
    rankCategory = 'OFICIAL_SUPERIOR';
  } else if (rankUpper.includes('CAP') || rankUpper.includes('TEN') || rankUpper.includes('ASP')) {
    rankCategory = 'OFICIAL_SUBALTERNO';
  } else if (rankUpper.includes('SUB') || rankUpper.includes('ST') || rankUpper.includes('SGT') || rankUpper.includes('SARGENTO')) {
    rankCategory = 'SARGENTO_SUBTEN';
  } else {
    rankCategory = 'CABO_SOLDADO';
  }

  // 4. Determina Categoria da Situação
  let situacaoCategory: MilitarClassification['situacaoCategory'] = 'PRONTO';
  if (situacaoUpper.includes('FÉRIAS') || situacaoUpper.includes('FERIAS')) {
    situacaoCategory = 'FERIAS';
  } else if (situacaoUpper.includes('SAÚDE') || situacaoUpper.includes('SAUDE') || situacaoUpper.includes('LTS') || situacaoUpper.includes('DTS')) {
    situacaoCategory = 'SAUDE_LTS';
  } else if (situacaoUpper.includes('LICENÇA ESPECIAL') || situacaoUpper.includes('LICENCA ESPECIAL')) {
    situacaoCategory = 'LICENCA_ESPECIAL';
  } else if (situacaoUpper !== 'ATIVO' && !situacaoUpper.startsWith('ATIVO')) {
    situacaoCategory = 'OUTROS';
  }

  return {
    axis,
    axisLabel,
    isMedico: isMed,
    healthBranch,
    cbaId,
    cbaLabel,
    rankCategory,
    situacaoCategory
  };
}

export function GestaoEfetivoModeracaoModule({ 
  user, 
  onBack, 
  isEscalanteContext, 
  obmContext 
}: { 
  user: UserProfile; 
  onBack: () => void; 
  isEscalanteContext?: boolean; 
  obmContext?: string;
}) {
  const { militars, deleteMilitar, addOrUpdateMilitar } = useMilitars();

  // ==========================================
  // FILTROS PRINCIPAIS (NÍVEL 1)
  // ==========================================
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAxis, setSelectedAxis] = useState<OrgAxis>('ALL');
  const [selectedCba, setSelectedCba] = useState<string>('TODOS');

  // ==========================================
  // FILTROS DETALHADOS (NÍVEL 2 - DEPENDENTES)
  // ==========================================
  const [selectedHealthBranch, setSelectedHealthBranch] = useState<string>('TODOS');
  const [selectedObmFilter, setSelectedObmFilter] = useState<string>(isEscalanteContext && obmContext ? obmContext : 'TODOS');
  const [selectedRankCategory, setSelectedRankCategory] = useState<string>('TODOS');
  const [selectedSituacao, setSelectedSituacao] = useState<string>('TODOS');
  const [selectedAla, setSelectedAla] = useState<string>('TODOS');
  const [selectedQuadro, setSelectedQuadro] = useState<string>('TODOS');
  
  // Painel de Filtros Avançados
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [activeQuickPill, setActiveQuickPill] = useState<string>('ALL');

  // Estados de Tabela e Formulário
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRg, setEditingRg] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const [formData, setFormData] = useState({
    name: '',
    warName: '',
    rg: '',
    rank: 'SD',
    quadro: '',
    idFuncional: '',
    nascimento: '',
    endereco: '',
    cidade: '',
    cel: '',
    tel: '',
    email: '',
    situacao: 'ATIVO',
    bolMov: '',
    obm: '10º GBM',
    ala: '1',
  });

  // Mapeamento enriquecido de todos os militares com classificação calculada
  const militarsWithMeta = useMemo(() => {
    return militars.map(m => ({
      ...m,
      meta: classifyMilitar(m)
    }));
  }, [militars]);

  // Contadores globais para os Quick Pills
  const counts = useMemo(() => {
    let total = militarsWithMeta.length;
    let medicos = 0;
    let saude = 0;
    let cbaVii = 0;
    let gse = 0;
    let hcap = 0;
    let prontos = 0;
    let afastados = 0;

    militarsWithMeta.forEach(m => {
      if (m.meta.isMedico) medicos++;
      if (m.meta.axis === 'SAUDE') saude++;
      if (m.meta.cbaId === 'cba_vii') cbaVii++;
      if (m.meta.healthBranch?.includes('GSE')) gse++;
      if (m.meta.healthBranch?.includes('HCAP')) hcap++;
      if (m.meta.situacaoCategory === 'PRONTO') prontos++;
      else afastados++;
    });

    return { total, medicos, saude, cbaVii, gse, hcap, prontos, afastados };
  }, [militarsWithMeta]);

  // =========================================================================
  // NÍVEL 1: BASE FILTRADA PELOS FILTROS PRINCIPAIS (Busca + Eixo + CBA)
  // Todos os filtros detalhados usam esta base para construir suas opções!
  // =========================================================================
  const primaryFilteredMilitars = useMemo(() => {
    return militarsWithMeta.filter(m => {
      // 1. Busca por texto livre
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const matchSearch = 
          (m.name || '').toLowerCase().includes(s) || 
          (m.warName || '').toLowerCase().includes(s) || 
          (m.rg || '').toLowerCase().includes(s) ||
          (m.quadro || '').toLowerCase().includes(s) ||
          (m.cidade || '').toLowerCase().includes(s) ||
          (m.situacao || '').toLowerCase().includes(s) ||
          (m.idFuncional || '').toLowerCase().includes(s) ||
          (m.obm || '').toLowerCase().includes(s) ||
          (m.email || '').toLowerCase().includes(s) ||
          (m.cel || '').toLowerCase().includes(s);
        if (!matchSearch) return false;
      }

      // 2. Filtro de Eixo Organizacional
      if (selectedAxis !== 'ALL') {
        if (m.meta.axis !== selectedAxis) return false;
      }

      // 3. Filtro de Comando Regional (CBA)
      if (selectedCba !== 'TODOS') {
        if (m.meta.cbaId !== selectedCba) return false;
      }

      return true;
    });
  }, [militarsWithMeta, searchTerm, selectedAxis, selectedCba]);

  // =========================================================================
  // OPÇÕES DOS FILTROS DETALHADOS DERIVADAS DOS FILTROS PRINCIPAIS
  // =========================================================================

  // CBAs únicos disponíveis na seleção de Eixo
  const uniqueCbas = useMemo(() => {
    const cbaMap = new Map<string, { id: string; name: string; count: number }>();
    
    // Se selecionou um eixo específico, conta apenas dentro do eixo
    const pool = selectedAxis === 'ALL' 
      ? militarsWithMeta 
      : militarsWithMeta.filter(m => m.meta.axis === selectedAxis);

    pool.forEach(m => {
      const id = m.meta.cbaId;
      const cbaObj = CANONICAL_REGIONAL_COMMANDS[id];
      const name = cbaObj?.name || (id === 'cba_vii' ? 'CBA VII – Costa Verde' : id.toUpperCase().replace('_', ' '));
      const curr = cbaMap.get(id) || { id, name, count: 0 };
      curr.count++;
      cbaMap.set(id, curr);
    });
    return Array.from(cbaMap.values()).sort((a, b) => b.count - a.count);
  }, [militarsWithMeta, selectedAxis]);

  // OBMs disponíveis: APENAS AS QUE EXISTEM DENTRO DO EIXO / CBA / BUSCA ATUAIS!
  const availableObms = useMemo(() => {
    const obmMap = new Map<string, { raw: string; label: string; count: number }>();
    
    primaryFilteredMilitars.forEach(m => {
      const raw = normalizeObm(m.obm) || 'SEM_OBM';
      const existing = obmMap.get(raw);
      if (existing) {
        existing.count++;
      } else {
        const canonical = resolveCanonicalScope(m.obm);
        const label = raw === 'SEM_OBM' ? 'Sem OBM / Não Vinculado' : formatScopeLabel(canonical);
        obmMap.set(raw, { raw, label, count: 1 });
      }
    });

    return Array.from(obmMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [primaryFilteredMilitars]);

  // Ramos da Saúde disponíveis: APENAS OS QUE EXISTEM NO FILTRO ATUAL!
  const availableHealthBranches = useMemo(() => {
    const branchMap = new Map<string, number>();
    primaryFilteredMilitars.forEach(m => {
      if (m.meta.healthBranch) {
        branchMap.set(m.meta.healthBranch, (branchMap.get(m.meta.healthBranch) || 0) + 1);
      }
    });
    return Array.from(branchMap.entries()).sort((a, b) => b[1] - a[1]);
  }, [primaryFilteredMilitars]);

  // Contadores de situação dentro do filtro principal
  const situacaoCounts = useMemo(() => {
    let prontos = 0;
    let ferias = 0;
    let saudeLts = 0;
    let licencaEspecial = 0;
    let outros = 0;

    primaryFilteredMilitars.forEach(m => {
      if (m.meta.situacaoCategory === 'PRONTO') prontos++;
      else if (m.meta.situacaoCategory === 'FERIAS') ferias++;
      else if (m.meta.situacaoCategory === 'SAUDE_LTS') saudeLts++;
      else if (m.meta.situacaoCategory === 'LICENCA_ESPECIAL') licencaEspecial++;
      else outros++;
    });

    return { prontos, ferias, saudeLts, licencaEspecial, outros };
  }, [primaryFilteredMilitars]);

  // Alas únicas disponíveis no filtro principal
  const availableAlas = useMemo(() => {
    const alaMap = new Map<string, number>();
    primaryFilteredMilitars.forEach(m => {
      const a = String(m.ala || '').trim();
      if (a) {
        alaMap.set(a, (alaMap.get(a) || 0) + 1);
      }
    });
    return Array.from(alaMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [primaryFilteredMilitars]);

  // Quadros únicos disponíveis no filtro principal
  const availableQuadros = useMemo(() => {
    const quadroMap = new Map<string, number>();
    primaryFilteredMilitars.forEach(m => {
      const q = String(m.quadro || '').trim();
      if (q) {
        quadroMap.set(q, (quadroMap.get(q) || 0) + 1);
      }
    });
    return Array.from(quadroMap.entries()).sort((a, b) => b[1] - a[1]);
  }, [primaryFilteredMilitars]);

  // Contadores de postos disponíveis no filtro principal
  const availableRankCounts = useMemo(() => {
    let superiores = 0;
    let subalternos = 0;
    let sargentos = 0;
    let cabosSoldados = 0;

    primaryFilteredMilitars.forEach(m => {
      if (m.meta.rankCategory === 'OFICIAL_SUPERIOR') superiores++;
      else if (m.meta.rankCategory === 'OFICIAL_SUBALTERNO') subalternos++;
      else if (m.meta.rankCategory === 'SARGENTO_SUBTEN') sargentos++;
      else if (m.meta.rankCategory === 'CABO_SOLDADO') cabosSoldados++;
    });

    return { superiores, subalternos, sargentos, cabosSoldados };
  }, [primaryFilteredMilitars]);

  // =========================================================================
  // SINCRONIZAÇÃO / AUTO-RESET DOS FILTROS DETALHADOS
  // Se o usuário mudar o CBA ou Eixo e uma OBM/Ramo selecionado não existir mais
  // na nova seleção, reseta automaticamente para 'TODOS'!
  // =========================================================================
  useEffect(() => {
    if (selectedObmFilter !== 'TODOS') {
      const exists = availableObms.some(o => o.raw === selectedObmFilter);
      if (!exists) {
        setSelectedObmFilter('TODOS');
      }
    }
  }, [availableObms, selectedObmFilter]);

  useEffect(() => {
    if (selectedHealthBranch !== 'TODOS') {
      const exists = availableHealthBranches.some(([b]) => b === selectedHealthBranch);
      if (!exists) {
        setSelectedHealthBranch('TODOS');
      }
    }
  }, [availableHealthBranches, selectedHealthBranch]);

  useEffect(() => {
    if (selectedAla !== 'TODOS') {
      const exists = availableAlas.some(([a]) => a === selectedAla);
      if (!exists) {
        setSelectedAla('TODOS');
      }
    }
  }, [availableAlas, selectedAla]);

  useEffect(() => {
    if (selectedQuadro !== 'TODOS') {
      if (selectedQuadro === 'QOS') {
        const hasMedicos = primaryFilteredMilitars.some(m => m.meta.isMedico);
        if (!hasMedicos) setSelectedQuadro('TODOS');
      } else {
        const exists = availableQuadros.some(([q]) => q === selectedQuadro);
        if (!exists) setSelectedQuadro('TODOS');
      }
    }
  }, [availableQuadros, primaryFilteredMilitars, selectedQuadro]);

  // =========================================================================
  // NÍVEL 2: FILTRAGEM FINAL COMPLETA (Filtros Principais + Filtros Detalhados)
  // =========================================================================
  const filteredMilitars = useMemo(() => {
    return primaryFilteredMilitars.filter(m => {
      // 1. Filtro de Ramo da Saúde
      if (selectedHealthBranch !== 'TODOS') {
        if (m.meta.healthBranch !== selectedHealthBranch) return false;
      }

      // 2. Filtro de OBM
      if (selectedObmFilter !== 'TODOS') {
        if (normalizeObm(m.obm) !== selectedObmFilter) return false;
      }

      // 3. Filtro de Categoria Hierárquica / Posto
      if (selectedRankCategory !== 'TODOS') {
        if (['OFICIAL_SUPERIOR', 'OFICIAL_SUBALTERNO', 'SARGENTO_SUBTEN', 'CABO_SOLDADO', 'CIVIL'].includes(selectedRankCategory)) {
          if (m.meta.rankCategory !== selectedRankCategory) return false;
        } else {
          const p = parseRank(m.rank);
          if (p !== selectedRankCategory && m.rank !== selectedRankCategory) return false;
        }
      }

      // 4. Filtro de Situação
      if (selectedSituacao !== 'TODOS') {
        if (selectedSituacao === 'PRONTO' && m.meta.situacaoCategory !== 'PRONTO') return false;
        if (selectedSituacao === 'FERIAS' && m.meta.situacaoCategory !== 'FERIAS') return false;
        if (selectedSituacao === 'SAUDE_LTS' && m.meta.situacaoCategory !== 'SAUDE_LTS') return false;
        if (selectedSituacao === 'LICENCA_ESPECIAL' && m.meta.situacaoCategory !== 'LICENCA_ESPECIAL') return false;
      }

      // 5. Filtro de Ala
      if (selectedAla !== 'TODOS') {
        if (String(m.ala || '').trim() !== selectedAla) return false;
      }

      // 6. Filtro de Quadro
      if (selectedQuadro !== 'TODOS') {
        if (selectedQuadro === 'QOS') {
          if (!m.meta.isMedico) return false;
        } else {
          if (!m.quadro || !m.quadro.toUpperCase().includes(selectedQuadro.toUpperCase())) return false;
        }
      }

      return true;
    }).sort(sortAllBySeniority);
  }, [
    primaryFilteredMilitars,
    selectedHealthBranch,
    selectedObmFilter,
    selectedRankCategory,
    selectedSituacao,
    selectedAla,
    selectedQuadro
  ]);

  // Verifica quantidade de filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (selectedAxis !== 'ALL') count++;
    if (selectedCba !== 'TODOS') count++;
    if (selectedHealthBranch !== 'TODOS') count++;
    if (selectedObmFilter !== 'TODOS') count++;
    if (selectedRankCategory !== 'TODOS') count++;
    if (selectedSituacao !== 'TODOS') count++;
    if (selectedAla !== 'TODOS') count++;
    if (selectedQuadro !== 'TODOS') count++;
    return count;
  }, [searchTerm, selectedAxis, selectedCba, selectedHealthBranch, selectedObmFilter, selectedRankCategory, selectedSituacao, selectedAla, selectedQuadro]);

  // Função para limpar todos os filtros
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedAxis('ALL');
    setSelectedCba('TODOS');
    setSelectedHealthBranch('TODOS');
    setSelectedObmFilter('TODOS');
    setSelectedRankCategory('TODOS');
    setSelectedSituacao('TODOS');
    setSelectedAla('TODOS');
    setSelectedQuadro('TODOS');
    setActiveQuickPill('ALL');
  };

  // Ativador de Quick Pills (sincroniza diretamente os filtros principais)
  const applyQuickPill = (pill: string) => {
    handleClearFilters();
    setActiveQuickPill(pill);
    if (pill === 'MEDICOS') {
      setSelectedAxis('SAUDE');
      setSelectedQuadro('QOS');
    } else if (pill === 'CBA_VII') {
      setSelectedCba('cba_vii');
    } else if (pill === 'GSE') {
      setSelectedAxis('SAUDE');
      setSelectedHealthBranch('GSE - Socorro de Emergência');
    } else if (pill === 'HCAP') {
      setSelectedAxis('SAUDE');
      setSelectedHealthBranch('HCAP - Hospital Central');
    } else if (pill === 'PRONTOS') {
      setSelectedSituacao('PRONTO');
    } else if (pill === 'AFASTADOS') {
      setSelectedSituacao('FERIAS');
    }
  };

  // Resetar página ao mudar qualquer filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm, 
    selectedAxis, 
    selectedCba, 
    selectedHealthBranch, 
    selectedObmFilter, 
    selectedRankCategory, 
    selectedSituacao, 
    selectedAla, 
    selectedQuadro
  ]);

  const totalPages = Math.ceil(filteredMilitars.length / itemsPerPage);
  const paginatedMilitars = filteredMilitars.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenNew = () => {
    setFormData({
      name: '',
      warName: '',
      rg: '',
      rank: 'SD',
      quadro: '',
      idFuncional: '',
      nascimento: '',
      endereco: '',
      cidade: '',
      cel: '',
      tel: '',
      email: '',
      situacao: 'ATIVO',
      bolMov: '',
      obm: '10º GBM',
      ala: '1',
    });
    setEditingRg(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (m: any) => {
    setFormData({
      name: m.name || '',
      warName: m.warName || '',
      rg: m.rg || '',
      rank: m.rank || 'SD',
      quadro: m.quadro || '',
      idFuncional: m.idFuncional || '',
      nascimento: m.nascimento || m.birthDate || '',
      endereco: m.endereco || '',
      cidade: m.cidade || '',
      cel: m.cel || '',
      tel: m.tel || '',
      email: m.email || '',
      situacao: m.situacao || 'ATIVO',
      bolMov: m.bolMov || '',
      obm: m.obm ? String(m.obm) : '10º GBM',
      ala: m.ala ? String(m.ala) : '1',
    });
    setEditingRg(m.rg || null);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!formData.rg || !formData.name) {
       alert("RG e Nome são obrigatórios.");
       return;
    }
    
    const cleanRg = formData.rg.replace(/[^A-Za-z0-9]/g, '').replace(/^0+/, '').toUpperCase();
    if (!cleanRg) return;

    try {
      const canonical = resolveCanonicalScope(formData.obm);
      const toSave = {
        ...formData,
        rg: cleanRg,
        name: formData.name.toUpperCase(),
        warName: (formData.warName || formData.name).toUpperCase(),
        rank: formData.rank.toUpperCase(),
        scope: canonical,
      };
      
      const ok = await addOrUpdateMilitar(toSave as any);
      if (ok) {
        setIsFormOpen(false);
      } else {
        alert("Erro ao salvar militar.");
      }
    } catch (e: any) {
      alert("Erro ao salvar: " + e.message);
    }
  };

  const handleDelete = async (rg: string) => {
    if (window.confirm("ATENÇÃO: Deseja realmente excluir este militar permanentemente do sistema?")) {
      try {
        const cleanRg = normalizeRg(rg);
        const ok = await deleteMilitar(cleanRg);
        if (!ok) {
          alert("Não foi possível excluir o militar.");
        }
      } catch (e: any) {
        alert("Erro ao excluir: " + e.message);
      }
    }
  };

  // Label amigável do contexto atual para exibir aos usuários
  const currentContextDescription = useMemo(() => {
    const parts: string[] = [];
    if (selectedAxis !== 'ALL') {
      if (selectedAxis === 'SAUDE') parts.push('🩺 Rede de Saúde (DGS)');
      else if (selectedAxis === 'TERRITORIAL_CBA') parts.push('🚒 Operacional / CBAs');
      else if (selectedAxis === 'COMANDO_GERAL') parts.push('🏛️ Comando-Geral');
      else if (selectedAxis === 'ESPECIALIZADO') parts.push('🌊 Salv. Marítimo');
      else if (selectedAxis === 'TERCEIRIZADOS') parts.push('👷 Terceirizados');
    }
    if (selectedCba !== 'TODOS') {
      const cbaObj = CANONICAL_REGIONAL_COMMANDS[selectedCba];
      parts.push(`📍 ${cbaObj?.shortName || selectedCba.toUpperCase()}`);
    }
    if (parts.length === 0) return 'Corporação Completa (Todos os Eixos & CBAs)';
    return parts.join(' ➔ ');
  }, [selectedAxis, selectedCba]);

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top Header */}
      <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors"
            title="Voltar ao Painel"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Gestão de Efetivo - Moderação</h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-md border border-indigo-200 uppercase tracking-wider">
                  Filtros Inteligentes
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest">
                Catálogo Geral & Controle Organizacional Integrado
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={handleClearFilters}
              className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Limpar Filtros</span> ({activeFiltersCount})
            </button>
          )}
          <button 
            onClick={handleOpenNew}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Militar
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 md:p-8 overflow-y-auto w-full max-w-7xl mx-auto flex-1 flex flex-col gap-5">
        
        {/* Faixa de Quick-Pills (Filtros Rápidos em 1 Toque) */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 shrink-0 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Destaques:
          </span>
          <button
            onClick={() => applyQuickPill('ALL')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border",
              selectedAxis === 'ALL' && selectedCba === 'TODOS' && activeFiltersCount === 0
                ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            )}
          >
            Todos ({counts.total})
          </button>
          <button
            onClick={() => applyQuickPill('MEDICOS')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border flex items-center gap-1.5",
              selectedAxis === 'SAUDE' && selectedCba === 'TODOS'
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            )}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            Oficiais Médicos / Saúde ({counts.medicos})
          </button>
          <button
            onClick={() => applyQuickPill('CBA_VII')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border flex items-center gap-1.5",
              selectedCba === 'cba_vii'
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            )}
          >
            <Shield className="w-3.5 h-3.5" />
            CBA VII - Costa Verde ({counts.cbaVii})
          </button>
          <button
            onClick={() => applyQuickPill('GSE')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border flex items-center gap-1.5",
              selectedHealthBranch === 'GSE - Socorro de Emergência'
                ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
            )}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            GSE Pré-Hospitalar ({counts.gse})
          </button>
          <button
            onClick={() => applyQuickPill('HCAP')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border flex items-center gap-1.5",
              selectedHealthBranch === 'HCAP - Hospital Central'
                ? "bg-cyan-600 text-white border-cyan-600 shadow-sm"
                : "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100"
            )}
          >
            <Building2 className="w-3.5 h-3.5" />
            HCAP Hospital Central ({counts.hcap})
          </button>
          <button
            onClick={() => applyQuickPill('PRONTOS')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border flex items-center gap-1.5",
              selectedSituacao === 'PRONTO'
                ? "bg-green-600 text-white border-green-600 shadow-sm"
                : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Prontos p/ Escala ({counts.prontos})
          </button>
          <button
            onClick={() => applyQuickPill('AFASTADOS')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border flex items-center gap-1.5",
              selectedSituacao === 'FERIAS'
                ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Férias & Licenças ({counts.afastados})
          </button>
        </div>

        {/* Bloco Principal de Filtros */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col gap-4">
          
          {/* Nível 1: FILTROS PRINCIPAIS (Busca + Eixo + CBA) */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" /> Filtros Principais (Direcionadores de Escopo)
              </span>
              <span className="text-[10px] font-bold text-indigo-600 uppercase">
                {currentContextDescription}
              </span>
            </div>

            <div className="flex flex-col lg:flex-row gap-3 items-center">
              {/* Input de Busca */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="BUSCAR POR NOME, RG, QUADRO, OBM, CIDADE, SITUAÇÃO, ID FUNCIONAL..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase transition-all"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filtro Principal 1: Eixo Organizacional */}
              <div className="w-full lg:w-72 relative">
                <select
                  value={selectedAxis}
                  onChange={(e) => {
                    setSelectedAxis(e.target.value as OrgAxis);
                    setActiveQuickPill('CUSTOM');
                  }}
                  className="w-full appearance-none pr-9 pl-4 py-3 bg-slate-50 border-2 border-indigo-100 hover:border-indigo-300 rounded-xl text-xs sm:text-sm font-black text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase transition-all"
                >
                  <option value="ALL">TODOS OS EIXOS ({counts.total})</option>
                  <option value="SAUDE">🩺 REDE DE SAÚDE / DGS ({counts.saude})</option>
                  <option value="TERRITORIAL_CBA">🚒 COMANDOS REGIONAIS (CBAs) ({militarsWithMeta.filter(m => m.meta.axis === 'TERRITORIAL_CBA').length})</option>
                  <option value="COMANDO_GERAL">🏛️ COMANDO-GERAL & ÓRGÃOS ESPECIAIS</option>
                  <option value="ESPECIALIZADO">🌊 SALVAMENTOS MARÍTIMOS (GMAR)</option>
                  <option value="TERCEIRIZADOS">👷 TERCEIRIZADOS (CIVIS)</option>
                </select>
                <ChevronDown className="w-4 h-4 text-indigo-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Filtro Principal 2: Comando Regional (CBA) */}
              <div className="w-full lg:w-64 relative">
                <select
                  value={selectedCba}
                  onChange={(e) => {
                    setSelectedCba(e.target.value);
                    setActiveQuickPill('CUSTOM');
                  }}
                  className="w-full appearance-none pr-9 pl-4 py-3 bg-slate-50 border-2 border-indigo-100 hover:border-indigo-300 rounded-xl text-xs sm:text-sm font-black text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase transition-all"
                >
                  <option value="TODOS">TODOS OS CBAs ({primaryFilteredMilitars.length})</option>
                  {uniqueCbas.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.count})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-indigo-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Botão de Toggle Filtros Detalhados */}
              <button
                onClick={() => setShowAdvanced(prev => !prev)}
                className={cn(
                  "px-4 py-3 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-all w-full lg:w-auto justify-center",
                  showAdvanced || activeFiltersCount > 2
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                <Filter className="w-4 h-4" />
                <span>Filtros Detalhados</span>
                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Nível 2: FILTROS DETALHADOS (Dependentes dos Filtros Principais) */}
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden pt-3 border-t border-slate-100"
              >
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 mb-2">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                    <span>Filtros Detalhados</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="text-indigo-600">
                      Adaptados automaticamente para: {primaryFilteredMilitars.length} militares no escopo principal
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Filtro Detalhado 1: OBM ESPECÍFICA (Apenas OBMs do CBA/Eixo selecionado!) */}
                    <div className="sm:col-span-2">
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 pl-1">
                        🏢 OBM Específica ({availableObms.length} opções neste escopo)
                      </label>
                      <div className="relative">
                        <select
                          value={selectedObmFilter}
                          onChange={(e) => {
                            setSelectedObmFilter(e.target.value);
                            setActiveQuickPill('CUSTOM');
                          }}
                          className="w-full appearance-none pr-8 pl-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 uppercase focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="TODOS">
                            TODAS AS OBMs {selectedCba !== 'TODOS' ? `DO ${selectedCba.toUpperCase().replace('_', ' ')}` : ''} ({primaryFilteredMilitars.length})
                          </option>
                          {availableObms.map(o => (
                            <option key={o.raw} value={o.raw}>
                              {o.label} ({o.count})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Filtro Detalhado 2: Ramo da Saúde (DGS) */}
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 pl-1">
                        🩺 Ramo da Saúde / DGS
                      </label>
                      <div className="relative">
                        <select
                          value={selectedHealthBranch}
                          disabled={availableHealthBranches.length === 0}
                          onChange={(e) => {
                            setSelectedHealthBranch(e.target.value);
                            setActiveQuickPill('CUSTOM');
                          }}
                          className={cn(
                            "w-full appearance-none pr-8 pl-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 uppercase focus:border-indigo-500 focus:outline-none",
                            availableHealthBranches.length === 0 && "opacity-50 bg-slate-100 cursor-not-allowed"
                          )}
                        >
                          <option value="TODOS">
                            {availableHealthBranches.length === 0 ? 'NÃO APLICÁVEL AO ESCOPO' : `TODOS OS RAMOS SAÚDE (${availableHealthBranches.reduce((acc, curr) => acc + curr[1], 0)})`}
                          </option>
                          {availableHealthBranches.map(([branch, cnt]) => (
                            <option key={branch} value={branch}>
                              {branch} ({cnt})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Filtro Detalhado 3: Posto / Categoria Hierárquica */}
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 pl-1">
                        ⭐ Posto / Categoria
                      </label>
                      <div className="relative">
                        <select
                          value={selectedRankCategory}
                          onChange={(e) => {
                            setSelectedRankCategory(e.target.value);
                            setActiveQuickPill('CUSTOM');
                          }}
                          className="w-full appearance-none pr-8 pl-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 uppercase focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="TODOS">TODOS OS POSTOS/GRADS ({primaryFilteredMilitars.length})</option>
                          <optgroup label="Grupos Hierárquicos">
                            <option value="OFICIAL_SUPERIOR">⭐ Oficiais Superiores ({availableRankCounts.superiores})</option>
                            <option value="OFICIAL_SUBALTERNO">🎖️ Oficiais Subalternos/Intermed. ({availableRankCounts.subalternos})</option>
                            <option value="SARGENTO_SUBTEN">🛡️ Subtenentes & Sargentos ({availableRankCounts.sargentos})</option>
                            <option value="CABO_SOLDADO">🚒 Cabos & Soldados ({availableRankCounts.cabosSoldados})</option>
                          </optgroup>
                          <optgroup label="Postos Específicos">
                            <option value="CORONEL">Coronel</option>
                            <option value="TENENTE CORONEL">Tenente Coronel</option>
                            <option value="MAJOR">Major</option>
                            <option value="CAPITÃO">Capitão</option>
                            <option value="1º TENENTE">1º Tenente</option>
                            <option value="2º TENENTE">2º Tenente</option>
                            <option value="SUBTEN">Subtenente</option>
                            <option value="1ºSGT">1º Sargento</option>
                            <option value="2ºSGT">2º Sargento</option>
                            <option value="3ºSGT">3º Sargento</option>
                            <option value="CB">Cabo</option>
                            <option value="SD">Soldado</option>
                          </optgroup>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Filtro Detalhado 4: Situação Operacional */}
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 pl-1">
                        📋 Situação Operacional
                      </label>
                      <div className="relative">
                        <select
                          value={selectedSituacao}
                          onChange={(e) => {
                            setSelectedSituacao(e.target.value);
                            setActiveQuickPill('CUSTOM');
                          }}
                          className="w-full appearance-none pr-8 pl-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 uppercase focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="TODOS">TODAS AS SITUAÇÕES ({primaryFilteredMilitars.length})</option>
                          <option value="PRONTO">🟢 Pronto para o Serviço ({situacaoCounts.prontos})</option>
                          <option value="FERIAS">🏖️ Em Férias ({situacaoCounts.ferias})</option>
                          <option value="SAUDE_LTS">🏥 Licença Saúde LTS/DTS ({situacaoCounts.saudeLts})</option>
                          {situacaoCounts.licencaEspecial > 0 && (
                            <option value="LICENCA_ESPECIAL">⭐ Licença Especial ({situacaoCounts.licencaEspecial})</option>
                          )}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Filtro Detalhado 5: Ala / Escala */}
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 pl-1">
                        ⏰ Ala / Escala
                      </label>
                      <div className="relative">
                        <select
                          value={selectedAla}
                          onChange={(e) => {
                            setSelectedAla(e.target.value);
                            setActiveQuickPill('CUSTOM');
                          }}
                          className="w-full appearance-none pr-8 pl-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 uppercase focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="TODOS">TODAS AS ALAS ({primaryFilteredMilitars.length})</option>
                          {availableAlas.map(([a, count]) => (
                            <option key={a} value={a}>Ala {a} ({count})</option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Filtro Detalhado 6: Quadro */}
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 pl-1">
                        🎖️ Quadro / Especialidade
                      </label>
                      <div className="relative">
                        <select
                          value={selectedQuadro}
                          onChange={(e) => {
                            setSelectedQuadro(e.target.value);
                            setActiveQuickPill('CUSTOM');
                          }}
                          className="w-full appearance-none pr-8 pl-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 uppercase focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="TODOS">TODOS OS QUADROS ({primaryFilteredMilitars.length})</option>
                          <option value="QOS">🩺 QOS/MÉD (OFICIAIS MÉDICOS)</option>
                          <option value="QOC">🚒 QOC (OFICIAIS COMBATENTES)</option>
                          <option value="QBM">🛡️ QBM (PRAÇAS COMBATENTES)</option>
                          {availableQuadros.map(([q, count]) => (
                            <option key={q} value={q}>{q} ({count})</option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Botão de Reset rápido */}
                    <div className="flex items-end">
                      <button
                        onClick={handleClearFilters}
                        className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restaurar Filtros
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Resumo Dinâmico dos Militares Encontrados */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-black text-slate-800 uppercase tracking-wider">
                {filteredMilitars.length} {filteredMilitars.length === 1 ? 'militar listado' : 'militares listados'}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500 font-bold">
                {militarsWithMeta.length} total cadastrado
              </span>
            </div>

            {/* Badges Rápidos de Contagem do Filtro Atual */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-black uppercase">
                🩺 {filteredMilitars.filter(m => m.meta.isMedico).length} Médicos
              </span>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-black uppercase">
                🟢 {filteredMilitars.filter(m => m.meta.situacaoCategory === 'PRONTO').length} Prontos
              </span>
              {filteredMilitars.filter(m => m.meta.situacaoCategory !== 'PRONTO').length > 0 && (
                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-black uppercase">
                  🏖️ {filteredMilitars.filter(m => m.meta.situacaoCategory !== 'PRONTO').length} Férias/LTS
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabela de Dados */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto h-full max-h-[60vh] flex-1">
            <table className="w-full text-left text-[11px] sm:text-xs font-bold uppercase tracking-widest relative">
              <thead className="sticky top-0 bg-white z-10 shadow-sm">
                <tr className="text-slate-500 border-b border-slate-200">
                  <th className="px-3 py-4 border-r border-slate-100 w-10 text-center"></th>
                  <th className="px-3 py-4 border-r border-slate-100 w-12 text-center">Nº</th>
                  <th className="px-3 py-4 border-r border-slate-100 w-28">Posto/Grad</th>
                  <th className="px-3 py-4 border-r border-slate-100 w-24">RG</th>
                  <th className="px-4 py-4 border-r border-slate-100 min-w-[14rem]">Nome Completo</th>
                  <th className="px-3 py-4 border-r border-slate-100 w-24">Quadro</th>
                  <th className="px-3 py-4 border-r border-slate-100 w-32">Eixo / CBA</th>
                  <th className="px-3 py-4 border-r border-slate-100 min-w-[12rem]">OBM / Lotação</th>
                  <th className="px-3 py-4 border-r border-slate-100 w-28">Situação</th>
                  <th className="px-3 py-4 border-r border-slate-100 w-16 text-center">Ala</th>
                  <th className="px-3 py-4 w-28 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedMilitars.map((m: any, idx) => {
                  const isExpanded = expandedRow === m.rg;
                  const isMed = m.meta.isMedico;
                  const isPronto = m.meta.situacaoCategory === 'PRONTO';
                  const isFerias = m.meta.situacaoCategory === 'FERIAS';
                  const isLts = m.meta.situacaoCategory === 'SAUDE_LTS';

                  return (
                    <React.Fragment key={m.rg}>
                      <tr 
                        className={cn(
                          "hover:bg-indigo-50/50 transition-colors group cursor-pointer",
                          isExpanded && "bg-indigo-50/30"
                        )} 
                        onClick={() => setExpandedRow(isExpanded ? null : (m.rg || null))}
                      >
                        <td className="px-3 py-3.5 border-r border-slate-100 text-center text-slate-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4" />}
                        </td>
                        <td className="px-3 py-3.5 border-r border-slate-100 text-center text-slate-400">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td className="px-3 py-3.5 border-r border-slate-100 text-slate-700 whitespace-nowrap">
                          <span className={cn(
                            "font-black",
                            m.meta.rankCategory === 'OFICIAL_SUPERIOR' ? "text-indigo-900" :
                            m.meta.rankCategory === 'OFICIAL_SUBALTERNO' ? "text-indigo-700" : "text-slate-700"
                          )}>
                            {parseRank(m.rank)}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 border-r border-slate-100 text-indigo-600 font-black">
                          {m.rg}
                        </td>
                        <td className="px-4 py-3.5 border-r border-slate-100 text-slate-800" title={m.name}>
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900">{m.name?.substring(0, 32)}{m.name?.length > 32 ? "..." : ""}</span>
                            {m.warName && m.warName !== m.name && (
                              <span className="text-[10px] text-slate-400 font-bold lowercase">
                                guerra: <b className="uppercase">{m.warName}</b>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3.5 border-r border-slate-100 text-slate-600 whitespace-nowrap">
                          {isMed ? (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-black text-[10px]">
                              {m.quadro || 'QOS/MÉD'}
                            </span>
                          ) : (
                            <span>{m.quadro || '-'}</span>
                          )}
                        </td>
                        <td className="px-3 py-3.5 border-r border-slate-100 whitespace-nowrap">
                          {m.meta.axis === 'SAUDE' ? (
                            <span className="px-2 py-0.5 rounded-md font-black text-[10px] bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 w-fit">
                              <Stethoscope className="w-3 h-3 text-blue-600" />
                              DGS / SAÚDE
                            </span>
                          ) : m.meta.cbaId === 'cba_vii' ? (
                            <span className="px-2 py-0.5 rounded-md font-black text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                              <Shield className="w-3 h-3 text-emerald-600" />
                              CBA VII
                            </span>
                          ) : m.meta.cbaId === 'cba_i' ? (
                            <span className="px-2 py-0.5 rounded-md font-black text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1 w-fit">
                              CBA I
                            </span>
                          ) : m.meta.cbaId === 'cba_viii' ? (
                            <span className="px-2 py-0.5 rounded-md font-black text-[10px] bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-fit">
                              CBA VIII
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md font-black text-[10px] bg-slate-100 text-slate-700 border border-slate-200 w-fit">
                              {m.meta.cbaLabel || 'GERAL'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3.5 border-r border-slate-100 text-slate-700" title={m.obm}>
                          <div className="flex flex-col">
                            <span className="font-bold text-[11px] leading-tight">{m.obm || '-'}</span>
                            {m.meta.healthBranch && m.meta.healthBranch !== m.obm && (
                              <span className="text-[9px] text-blue-600 font-black mt-0.5">
                                {m.meta.healthBranch}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3.5 border-r border-slate-100">
                          <span className={cn(
                            "px-2 py-1 rounded text-[10px] font-black inline-block text-center whitespace-normal leading-tight",
                            isPronto ? "bg-green-100 text-green-800 border border-green-200" :
                            isFerias ? "bg-amber-100 text-amber-800 border border-amber-200" :
                            isLts ? "bg-rose-100 text-rose-800 border border-rose-200" :
                            "bg-slate-100 text-slate-700 border border-slate-200"
                          )}>
                            {m.situacao || 'ATIVO'}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 border-r border-slate-100 text-center text-slate-600 font-black">
                          {m.ala || '-'}
                        </td>
                        <td className="px-3 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button 
                              onClick={() => handleOpenEdit(m)}
                              className="px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg flex items-center gap-1 hover:bg-indigo-600 hover:text-white transition-all text-[9px] font-black uppercase shadow-xs"
                              title="Editar militar"
                            >
                              Editar
                            </button>
                            <button 
                              onClick={() => m.rg && handleDelete(m.rg)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir militar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Linha Expandida de Detalhes Completos */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 border-b-2 border-indigo-100">
                          <td colSpan={11} className="px-6 py-5">
                            <div className="space-y-4">
                              {/* Header da ficha expandida */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs">
                                    {m.meta.isMedico ? <Stethoscope className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-black text-slate-900 uppercase">
                                      {m.rank} {m.name} {m.warName ? `(${m.warName})` : ''} — RG {m.rg}
                                    </h4>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">
                                      {m.meta.axisLabel} • {m.meta.cbaLabel} • {m.obm || 'Sem OBM'}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider",
                                    isPronto ? "bg-green-100 text-green-800 border border-green-300" :
                                    isFerias ? "bg-amber-100 text-amber-800 border border-amber-300" :
                                    "bg-rose-100 text-rose-800 border border-rose-300"
                                  )}>
                                    Status: {m.situacao || 'ATIVO'}
                                  </span>
                                </div>
                              </div>

                              {/* Grid de dados detalhados */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-[10px] sm:text-xs">
                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                                  <span className="text-slate-400 block mb-1 font-black uppercase tracking-wider">Organização & Escopo</span>
                                  <p className="text-slate-800 font-bold">Eixo: <b className="text-indigo-600">{m.meta.axisLabel}</b></p>
                                  <p className="text-slate-800 font-bold">Comando de Área: <b>{m.meta.cbaLabel}</b></p>
                                  <p className="text-slate-800 font-bold">OBM: <b>{m.obm || '-'}</b></p>
                                  <p className="text-slate-800 font-bold">Ala / Escala: <b>{m.ala || '-'}</b></p>
                                </div>

                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                                  <span className="text-slate-400 block mb-1 font-black uppercase tracking-wider">Identificação Militar</span>
                                  <p className="text-slate-800 font-bold">Posto/Grad: <b>{parseRank(m.rank)}</b></p>
                                  <p className="text-slate-800 font-bold">RG Militar: <b>{m.rg}</b></p>
                                  <p className="text-slate-800 font-bold">ID Funcional: <b>{m.idFuncional || '-'}</b></p>
                                  <p className="text-slate-800 font-bold">Quadro: <b>{m.quadro || '-'}</b></p>
                                </div>

                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                                  <span className="text-slate-400 block mb-1 font-black uppercase tracking-wider">Contatos</span>
                                  <p className="text-slate-800 font-bold flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-slate-400" /> Celular: <b>{m.cel || '-'}</b>
                                  </p>
                                  <p className="text-slate-800 font-bold flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-slate-400" /> Fixo: <b>{m.tel || '-'}</b>
                                  </p>
                                  <p className="text-slate-800 font-bold flex items-center gap-1">
                                    <Mail className="w-3 h-3 text-slate-400" /> E-mail: <b className="lowercase">{m.email || '-'}</b>
                                  </p>
                                </div>

                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                                  <span className="text-slate-400 block mb-1 font-black uppercase tracking-wider">Localização & Movimentação</span>
                                  <p className="text-slate-800 font-bold flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400" /> Cidade: <b>{m.cidade || '-'}</b>
                                  </p>
                                  <p className="text-slate-800 font-bold">Endereço: <b>{m.endereco || '-'}</b></p>
                                  <p className="text-slate-800 font-bold flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-400" /> Nascimento: <b>{m.nascimento || m.birthDate || '-'}</b>
                                  </p>
                                  <p className="text-slate-800 font-bold">Bol. Movimentação: <b>{m.bolMov || '-'}</b></p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {paginatedMilitars.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-6 py-16 text-center text-slate-400">
                      <Users className="w-10 h-10 opacity-20 mx-auto mb-3" />
                      <p className="text-sm font-black text-slate-600 uppercase tracking-wider">Nenhum militar encontrado</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Tente ajustar os termos de busca ou restaurar os filtros aplicados.
                      </p>
                      {activeFiltersCount > 0 && (
                        <button
                          onClick={handleClearFilters}
                          className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-100 transition-colors inline-flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Limpar Todos os Filtros
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50 mt-auto">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(c => Math.max(1, c - 1))} 
                  disabled={currentPage === 1} 
                  className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-40 hover:bg-slate-100 transition-colors shadow-xs"
                >
                  Anterior
                </button>
                <button 
                  onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))} 
                  disabled={currentPage === totalPages} 
                  className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-40 hover:bg-slate-100 transition-colors shadow-xs"
                >
                  Próxima
                </button>
              </div>

              <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                Página {currentPage} de {totalPages} • ({filteredMilitars.length} registros)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Cadastrar / Editar Militar */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-full"
            >
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 p-2 rounded-xl">
                    {editingRg ? <Users className="w-5 h-5 text-indigo-700" /> : <UserPlus className="w-5 h-5 text-indigo-700" />}
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                      {editingRg ? 'Editar Perfil Militar Completo' : 'Cadastrar Novo Militar no Sistema'}
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {editingRg ? `RG ${editingRg}` : 'Alocação Organizacional e Dados Funcionais'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsFormOpen(false)} 
                  className="p-2 hover:bg-slate-200 text-slate-500 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                  {/* Identificação */}
                  <div className="col-span-1 sm:col-span-2 md:col-span-3 border-b border-slate-100 pb-2 mb-1">
                    <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
                      <Shield className="w-4 h-4" /> 1. Identificação Militar & Hierarquia
                    </h3>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">RG Militar *</label>
                    <input 
                      type="text" 
                      value={formData.rg}
                      onChange={(e) => setFormData(prev => ({...prev, rg: e.target.value}))}
                      disabled={!!editingRg}
                      className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:bg-slate-50 uppercase"
                      placeholder="Ex: 54444"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">ID Funcional</label>
                    <input 
                      type="text" 
                      value={formData.idFuncional}
                      onChange={(e) => setFormData(prev => ({...prev, idFuncional: e.target.value}))}
                      className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                      placeholder="Ex: 51515520"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Posto / Graduação *</label>
                    <input 
                      type="text" 
                      value={formData.rank}
                      onChange={(e) => setFormData(prev => ({...prev, rank: e.target.value}))}
                      className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                      placeholder="Ex: CEL, TC, MAJ, CAP, TEN, SGT, CB, SD..."
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Nome Completo *</label>
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                      className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Nome de Guerra</label>
                    <input 
                      type="text" 
                      value={formData.warName}
                      onChange={(e) => setFormData(prev => ({...prev, warName: e.target.value}))}
                      className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                      placeholder="Ex: BERNARDO"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Quadro</label>
                    <input 
                      type="text" 
                      value={formData.quadro}
                      onChange={(e) => setFormData(prev => ({...prev, quadro: e.target.value}))}
                      className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                      placeholder="Ex: QOS/Méd/02, QOC, QBM..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Data Nascimento</label>
                    <input 
                      type="text" 
                      value={formData.nascimento}
                      onChange={(e) => setFormData(prev => ({...prev, nascimento: e.target.value}))}
                      className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                      placeholder="DD/MM/AAAA"
                    />
                  </div>

                  {/* Lotação & Dados Operacionais */}
                  <div className="col-span-1 sm:col-span-2 md:col-span-3 border-b border-slate-100 pb-2 mb-1 mt-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" /> 2. Lotação, OBM & Escala
                    </h3>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">OBM Principal / Lotação *</label>
                    <input 
                      type="text" 
                      list="unique-obms-form"
                      value={formData.obm}
                      onChange={(e) => setFormData(prev => ({...prev, obm: e.target.value}))}
                      className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                      placeholder="Ex: 10º GBM, HCAP, GSE, DGS, 1/10, etc."
                    />
                    <datalist id="unique-obms-form">
                      {availableObms.map(o => (
                        <option key={"dl-" + o.raw} value={o.raw} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Ala / Escala</label>
                    <input 
                      type="text" 
                      value={formData.ala}
                      onChange={(e) => setFormData(prev => ({...prev, ala: e.target.value}))}
                      className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                      placeholder="Ex: 1, 2, 3, 4, EXP, OFICIAIS"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Situação Militar (Ativo, Férias, LTS...)</label>
                    <input 
                      type="text" 
                      value={formData.situacao}
                      onChange={(e) => setFormData(prev => ({...prev, situacao: e.target.value}))}
                      className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                      placeholder="Ex: ATIVO, ATIVO - FERIAS Retorno em 31/10/2026"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Boletim de Movimentação</label>
                    <input 
                      type="text" 
                      value={formData.bolMov}
                      onChange={(e) => setFormData(prev => ({...prev, bolMov: e.target.value}))}
                      className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                      placeholder="Ex: BOL 004/2024"
                    />
                  </div>

                  {/* Contato & Endereço */}
                  <div className="col-span-1 sm:col-span-2 md:col-span-3 border-b border-slate-100 pb-2 mb-1 mt-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
                      <Mail className="w-4 h-4" /> 3. Contatos & Localização
                    </h3>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">E-mail de Contato</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                      className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 lowercase"
                      placeholder="militar@cbmerj.rj.gov.br"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Celular</label>
                    <input 
                      type="text" 
                      value={formData.cel}
                      onChange={(e) => setFormData(prev => ({...prev, cel: e.target.value}))}
                      className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                      placeholder="(24) 99999-9999"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Telefone Fixo</label>
                    <input 
                      type="text" 
                      value={formData.tel}
                      onChange={(e) => setFormData(prev => ({...prev, tel: e.target.value}))}
                      className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Endereço Residencial</label>
                    <input 
                      type="text" 
                      value={formData.endereco}
                      onChange={(e) => setFormData(prev => ({...prev, endereco: e.target.value}))}
                      className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Cidade</label>
                    <input 
                      type="text" 
                      value={formData.cidade}
                      onChange={(e) => setFormData(prev => ({...prev, cidade: e.target.value}))}
                      className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                      placeholder="Ex: Angra dos Reis"
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3 shrink-0">
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingRg ? 'Salvar Alterações' : 'Cadastrar Militar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
