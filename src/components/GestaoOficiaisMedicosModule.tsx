import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  Stethoscope, 
  Search, 
  Filter, 
  Building2, 
  MapPin, 
  ShieldCheck, 
  Award, 
  UserPlus, 
  RefreshCw, 
  ChevronRight, 
  ArrowLeft,
  Calendar, 
  Users, 
  FileText, 
  Check, 
  X, 
  ExternalLink,
  Phone,
  Mail,
  Clock,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { UserProfile } from '../types';
import { useMilitars } from '../contexts/MilitarContext';
import { parseRank, stripRankPrefix } from '../lib/rankUtils';
import { cn } from '../lib/utils';
import { OfficerMedicosModule } from './OfficerMedicosModule';

interface GestaoOficiaisMedicosModuleProps {
  user: UserProfile;
  obmContext: string;
  setObmContext?: (obm: string) => void;
  availableObms?: string[];
  onBack: () => void;
}

const REGIOES_LIST = [
  'TODAS',
  'GSE (Estadual)',
  'Costa Verde',
  'Capital (Complexo de Saúde)',
  'Capital (Campinho)',
  'Baixada Fluminense',
  'Sul Fluminense',
  'Serrana',
  'Norte-Noroeste',
  'Baixada Litorânea',
  'Metropolitana',
  'Salvamento Marítimo',
  'Órgãos Externos / DGP',
];

const POSTOS_LIST = [
  'TODOS',
  'CORONEL',
  'TENENTE CORONEL',
  'MAJOR',
  'CAPITÃO'
];

export function GestaoOficiaisMedicosModule({
  user,
  obmContext,
  setObmContext,
  availableObms = ['10º GBM', 'DBM 1/10', 'DBM 2/10', 'DBM 3/10', 'DBM 4/10', '26º GBM', 'DBM 1/26'],
  onBack,
}: GestaoOficiaisMedicosModuleProps) {
  const { militars, refreshMilitars } = useMilitars();

  // Estado local para armazenar os 549 médicos do estado diretamente da API
  const [medicosList, setMedicosList] = useState<UserProfile[]>([]);
  const [isLoadingMedicos, setIsLoadingMedicos] = useState(true);

  const fetchMedicosData = useCallback(async () => {
    setIsLoadingMedicos(true);
    try {
      const res = await fetch('/api/militar/medicos', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.medicos)) {
          setMedicosList(data.medicos);
        }
      }
    } catch (e) {
      console.error('[GestaoOficiaisMedicosModule] Erro ao carregar médicos:', e);
    } finally {
      setIsLoadingMedicos(false);
    }
  }, []);

  useEffect(() => {
    fetchMedicosData();
  }, [fetchMedicosData]);

  const [activeTab, setActiveTab] = useState<'efetivo' | 'escala'>('efetivo');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegiao, setSelectedRegiao] = useState('TODAS');
  const [selectedPosto, setSelectedPosto] = useState('TODOS');
  const [gseFilter, setGseFilter] = useState<'TODOS' | 'GSE' | 'NAO_GSE'>('TODOS');
  const [selectedObmFilter, setSelectedObmFilter] = useState('TODAS');

  // Modal de Designação / Vinculação para OBM
  const [assigningMilitar, setAssigningMilitar] = useState<UserProfile | null>(null);
  const [targetObm, setTargetObm] = useState<string>(obmContext && obmContext !== 'GLOBAL' ? obmContext : '10º GBM');
  const [targetAla, setTargetAla] = useState<string>('EXP');
  const [isSavingAssign, setIsSavingAssign] = useState(false);
  const [assignNotice, setAssignNotice] = useState<string | null>(null);

  // Modal de Detalhes do Médico
  const [viewingMilitar, setViewingMilitar] = useState<UserProfile | null>(null);

  // Sincronização em massa
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Filtra apenas médicos: usa medicosList prioritariamente (todos os 549 do estado)
  const allMedicos = useMemo(() => {
    if (medicosList.length > 0) {
      return medicosList;
    }
    return militars.filter(m => {
      const q = (m.quadro || '').toUpperCase();
      return m.isMedico === true || q.includes('QOS/MÉD') || q.includes('QOS/MED');
    });
  }, [medicosList, militars]);

  // Estatísticas do Efetivo Médico
  const stats = useMemo(() => {
    const total = allMedicos.length;
    const gseCount = allMedicos.filter(m => m.gse || (m.obm || '').toUpperCase().includes('GSE')).length;
    const coronelCount = allMedicos.filter(m => (m.rank || '').toUpperCase() === 'CORONEL').length;
    const tenCelCount = allMedicos.filter(m => (m.rank || '').toUpperCase().includes('TEN') && (m.rank || '').toUpperCase().includes('CEL')).length;
    const majorCount = allMedicos.filter(m => (m.rank || '').toUpperCase() === 'MAJOR').length;
    const capitaoCount = allMedicos.filter(m => (m.rank || '').toUpperCase().includes('CAP')).length;
    const vinculadosObmCount = allMedicos.filter(m => m.obm && (m.obm.includes('GBM') || m.obm.includes('DBM'))).length;

    return {
      total,
      gseCount,
      superiores: coronelCount + tenCelCount + majorCount,
      coronelCount,
      tenCelCount,
      majorCount,
      capitaoCount,
      vinculadosObmCount,
    };
  }, [allMedicos]);

  // Lista filtrada
  const filteredMedicos = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return allMedicos.filter(m => {
      // Busca textual
      if (term) {
        const name = (m.name || '').toLowerCase();
        const war = (m.warName || '').toLowerCase();
        const rg = (m.rg || '').toString().toLowerCase();
        const idFunc = (m.idFuncional || '').toLowerCase();
        const obm = (m.obm || '').toLowerCase();
        const regiao = (m.regiao || '').toLowerCase();
        const quadro = (m.quadro || '').toLowerCase();
        const matchesText = 
          name.includes(term) ||
          war.includes(term) ||
          rg.includes(term) ||
          idFunc.includes(term) ||
          obm.includes(term) ||
          regiao.includes(term) ||
          quadro.includes(term);
        if (!matchesText) return false;
      }

      // Filtro de Região
      if (selectedRegiao !== 'TODAS') {
        const mReg = (m.regiao || '').toLowerCase();
        const targetReg = selectedRegiao.toLowerCase();
        if (!mReg.includes(targetReg) && targetReg !== 'gse (estadual)' && !targetReg.includes(mReg)) {
          if (targetReg.includes('gse') && !(m.gse || (m.obm || '').toUpperCase().includes('GSE'))) {
            return false;
          } else if (!targetReg.includes('gse')) {
            return false;
          }
        }
      }

      // Filtro de Posto
      if (selectedPosto !== 'TODOS') {
        const rk = parseRank(m.rank);
        if (rk !== selectedPosto) return false;
      }

      // Filtro GSE
      if (gseFilter === 'GSE') {
        const isGse = m.gse || (m.obm || '').toUpperCase().includes('GSE');
        if (!isGse) return false;
      } else if (gseFilter === 'NAO_GSE') {
        const isGse = m.gse || (m.obm || '').toUpperCase().includes('GSE');
        if (isGse) return false;
      }

      // Filtro OBM de Atuação
      if (selectedObmFilter !== 'TODAS') {
        if ((m.obm || '') !== selectedObmFilter && (m.obmAtuacao || '') !== selectedObmFilter) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Ordena por antiguidade / posto
      const rankOrder: Record<string, number> = {
        'CORONEL': 1,
        'TENENTE CORONEL': 2,
        'MAJOR': 3,
        'CAPITÃO': 4
      };
      const rA = rankOrder[parseRank(a.rank)] || 99;
      const rB = rankOrder[parseRank(b.rank)] || 99;
      if (rA !== rB) return rA - rB;
      return (a.warName || a.name || '').localeCompare(b.warName || b.name || '');
    });
  }, [allMedicos, searchTerm, selectedRegiao, selectedPosto, gseFilter, selectedObmFilter]);

  // Executa vinculação do médico a uma OBM
  const handleConfirmAssign = async () => {
    if (!assigningMilitar) return;
    setIsSavingAssign(true);
    try {
      const res = await fetch('/api/militar/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rg: assigningMilitar.rg,
          data: {
            obm: targetObm,
            obmAtuacao: targetObm,
            ala: targetAla,
            isOficial: true,
            isMedico: true,
            gse: assigningMilitar.gse ?? true,
            obmOrigem: assigningMilitar.obmOrigem || assigningMilitar.obm,
          }
        })
      });

      if (res.ok) {
        setAssignNotice(`Dr. ${assigningMilitar.warName || assigningMilitar.name} vinculado com sucesso ao ${targetObm} (Ala ${targetAla})!`);
        setMedicosList(prev => prev.map(m => {
          if (m.rg === assigningMilitar.rg) {
            return {
              ...m,
              obm: targetObm,
              obmAtuacao: targetObm,
              ala: targetAla,
            };
          }
          return m;
        }));
        setTimeout(() => setAssignNotice(null), 4000);
        await refreshMilitars(assigningMilitar.rg);
        setAssigningMilitar(null);
      } else {
        alert('Falha ao vincular militar à OBM. Tente novamente.');
      }
    } catch (e: any) {
      alert(`Erro ao vincular: ${e.message}`);
    } finally {
      setIsSavingAssign(false);
    }
  };

  // Sincronização direta com a base CSV
  const handleSyncDatabase = async () => {
    setIsSyncing(true);
    setSyncNotice('Sincronizando 549 médicos na plataforma...');
    try {
      const res = await fetch('/api/militar/sync-medicos', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncNotice(`Sincronização concluída com sucesso! ${data.count} médicos atualizados.`);
        await fetchMedicosData();
        await refreshMilitars();
        setTimeout(() => setSyncNotice(null), 4000);
      } else {
        setSyncNotice(`Erro na sincronização: ${data.error || 'Falha no servidor'}`);
      }
    } catch (e: any) {
      setSyncNotice(`Erro na comunicação: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Voltar à tela inicial"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-700 via-rose-600 to-red-500 text-white flex items-center justify-center shadow-md shadow-rose-200 dark:shadow-rose-950/50 shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Oficiais Médicos
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 text-[10px] font-black uppercase tracking-wider">
                    Corpo de Saúde • GSE
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Gestão do efetivo médico estadual, distribuição por regiões e registro nas OBMs
                </p>
              </div>
            </div>
          </div>

          {/* Abas e Ações */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('efetivo')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                  activeTab === 'efetivo'
                    ? "bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Efetivo & Lotações ({allMedicos.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('escala')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                  activeTab === 'escala'
                    ? "bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Escala Médica (OD / Sobreaviso)</span>
              </button>
            </div>

            <button
              onClick={handleSyncDatabase}
              disabled={isSyncing}
              className="p-2 sm:px-3 sm:py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Sincronizar base de dados de médicos do CSV"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-rose-600", isSyncing && "animate-spin")} />
              <span className="hidden sm:inline">Sincronizar CSV</span>
            </button>
          </div>
        </div>
      </header>

      {/* Alertas flutuantes */}
      {assignNotice && (
        <div className="fixed top-18 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border border-emerald-500/40 flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
          <span>{assignNotice}</span>
        </div>
      )}

      {syncNotice && (
        <div className="fixed top-18 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl border border-indigo-500/40 flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {activeTab === 'escala' ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6">
            <OfficerMedicosModule 
              user={user} 
              obmContext={obmContext} 
              setObmContext={setObmContext} 
              availableObms={availableObms} 
            />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Total de Médicos
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">
                    {stats.total}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 mt-0.5 block">
                    Cadastrados na plataforma
                  </span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 border border-rose-100 dark:border-rose-900 flex items-center justify-center shrink-0">
                  <Stethoscope className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    GSE (Emergência)
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
                    {stats.gseCount}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 mt-0.5 block">
                    Atuação em todas as OBMs
                  </span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Oficiais Superiores
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-indigo-700 dark:text-indigo-400">
                    {stats.superiores}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 mt-0.5 block">
                    {stats.coronelCount} Cel • {stats.tenCelCount} Ten Cel • {stats.majorCount} Maj
                  </span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Capitães Médicos
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-slate-700 dark:text-slate-300">
                    {stats.capitaoCount}
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {stats.vinculadosObmCount} registrados em OBMs
                  </span>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Painel de Filtros e Busca */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Pesquise por Nome, Nome de Guerra, RG, ID Funcional, OBM..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtro por GSE */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setGseFilter('TODOS')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      gseFilter === 'TODOS'
                        ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-2xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                    )}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setGseFilter('GSE')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1",
                      gseFilter === 'GSE'
                        ? "bg-rose-600 text-white shadow-2xs"
                        : "text-slate-500 hover:text-rose-600"
                    )}
                  >
                    <Award className="w-3 h-3" />
                    <span>Apenas GSE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGseFilter('NAO_GSE')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      gseFilter === 'NAO_GSE'
                        ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-2xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                    )}
                  >
                    Outras Unidades
                  </button>
                </div>
              </div>

              {/* Linha 2 de Filtros: Região, Posto e OBM */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Região Geográfica / Polo de Saúde
                  </label>
                  <select
                    value={selectedRegiao}
                    onChange={(e) => setSelectedRegiao(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-rose-500 cursor-pointer"
                  >
                    {REGIOES_LIST.map(reg => (
                      <option key={reg} value={reg}>
                        {reg === 'TODAS' ? 'Todas as Regiões' : reg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Posto / Graduação
                  </label>
                  <select
                    value={selectedPosto}
                    onChange={(e) => setSelectedPosto(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-rose-500 cursor-pointer"
                  >
                    {POSTOS_LIST.map(p => (
                      <option key={p} value={p}>
                        {p === 'TODOS' ? 'Todos os Postos' : p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    OBM Operacional de Atuação
                  </label>
                  <select
                    value={selectedObmFilter}
                    onChange={(e) => setSelectedObmFilter(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-rose-500 cursor-pointer"
                  >
                    <option value="TODAS">Todas as Lotações</option>
                    {availableObms.map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Cabeçalho da Listagem */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                Mostrando <strong>{filteredMedicos.length}</strong> de {allMedicos.length} médicos
              </span>
              {(selectedRegiao !== 'TODAS' || selectedPosto !== 'TODOS' || gseFilter !== 'TODOS' || selectedObmFilter !== 'TODAS' || searchTerm) && (
                <button
                  onClick={() => {
                    setSelectedRegiao('TODAS');
                    setSelectedPosto('TODOS');
                    setGseFilter('TODOS');
                    setSelectedObmFilter('TODAS');
                    setSearchTerm('');
                  }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                >
                  Limpar todos os filtros
                </button>
              )}
            </div>

            {/* Tabela de Médicos */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-black uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-4">Posto / Nome de Guerra</th>
                      <th className="py-3 px-3">RG / ID Funcional</th>
                      <th className="py-3 px-3">Quadro</th>
                      <th className="py-3 px-3">OBM Origem & Região</th>
                      <th className="py-3 px-3">Lotação / OBM Atual</th>
                      <th className="py-3 px-3">Status GSE</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {isLoadingMedicos && filteredMedicos.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-400">
                          <RefreshCw className="w-8 h-8 mx-auto mb-2 text-rose-500 animate-spin" />
                          <p className="font-bold text-xs uppercase text-slate-600 dark:text-slate-300">Carregando efetivo médico estadual...</p>
                        </td>
                      </tr>
                    ) : filteredMedicos.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-400">
                          <Stethoscope className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                          <p className="font-bold text-xs uppercase">Nenhum oficial médico localizado com os filtros selecionados</p>
                        </td>
                      </tr>
                    ) : (
                      filteredMedicos.map((m) => {
                        const isGse = m.gse || (m.obm || '').toUpperCase().includes('GSE');
                        const isRegisteredInLocalObm = (m.obm || '').includes('GBM') || (m.obm || '').includes('DBM');

                        return (
                          <tr 
                            key={m.rg} 
                            className="hover:bg-rose-50/30 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                                  {parseRank(m.rank)}
                                </span>
                                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                  {m.warName || stripRankPrefix(m.name || '')}
                                </span>
                                <span className="text-[10.5px] text-slate-400 font-medium truncate max-w-xs">
                                  {m.name}
                                </span>
                                {m.funcao && (
                                  <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded w-fit mt-0.5 border border-amber-200">
                                    {m.funcao}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="flex flex-col">
                                <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-200">
                                  {m.rg}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ID: {m.idFuncional || 'S/ID'}
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider">
                                {m.quadro || 'QOS/Méd'}
                              </span>
                            </td>

                            <td className="py-3 px-3">
                              <div className="flex flex-col max-w-xs">
                                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate" title={m.obmOrigem || m.obm}>
                                  {m.obmOrigem || m.obm || 'Não informada'}
                                </span>
                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                  <MapPin className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                                  <span>{m.regiao || 'Geral CBMERJ'}</span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border inline-flex items-center gap-1",
                                isRegisteredInLocalObm
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                                  : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                              )}>
                                <Building2 className="w-3 h-3" />
                                <span>{m.obm || 'GSE Central'}</span>
                              </span>
                            </td>

                            <td className="py-3 px-3">
                              {isGse ? (
                                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 text-[9.5px] font-black uppercase tracking-widest inline-flex items-center gap-1 shadow-2xs">
                                  <Award className="w-3 h-3" />
                                  <span>GSE</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-bold uppercase">
                                  Outro Corpo
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setViewingMilitar(m)}
                                  className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10.5px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                                  title="Ver ficha completa do médico"
                                >
                                  Ficha
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAssigningMilitar(m);
                                    setTargetObm(obmContext && obmContext !== 'GLOBAL' ? obmContext : (m.obm || '10º GBM'));
                                    setTargetAla(m.ala ? String(m.ala) : 'EXP');
                                  }}
                                  className="px-2.5 py-1 text-white bg-rose-600 hover:bg-rose-700 rounded-lg text-[10.5px] font-black uppercase tracking-wider transition-all shadow-2xs flex items-center gap-1 cursor-pointer active:scale-95"
                                  title="Vincular este médico a uma OBM (ex: 10º GBM, 26º GBM)"
                                >
                                  <Building2 className="w-3 h-3" />
                                  <span>Registrar na OBM</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {/* MODAL 1: Designar / Vincular Médico para OBM */}
      {assigningMilitar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Registrar Médico na OBM
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Vincule o oficial médico para atuar e aparecer nas escalas da unidade
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssigningMilitar(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Card do Militar Selecionado */}
            <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 rounded-2xl">
              <span className="text-[10px] font-black uppercase text-rose-700 dark:text-rose-400 block mb-0.5">
                {parseRank(assigningMilitar.rank)} • {assigningMilitar.quadro || 'QOS/Méd'}
              </span>
              <div className="text-xs font-black text-slate-900 dark:text-white uppercase">
                {assigningMilitar.warName || assigningMilitar.name}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-1">
                RG: <strong>{assigningMilitar.rg}</strong> • Lotação de Origem: <strong>{assigningMilitar.obmOrigem || assigningMilitar.obm}</strong>
              </div>
              {assigningMilitar.gse && (
                <div className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-black uppercase bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                  <Award className="w-3 h-3" />
                  <span>Médico GSE • Socorro de Emergência</span>
                </div>
              )}
            </div>

            {/* Seletores de OBM e Ala */}
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                  Selecione a OBM de Atuação
                </label>
                <select
                  value={targetObm}
                  onChange={(e) => setTargetObm(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-rose-500 cursor-pointer uppercase"
                >
                  {availableObms.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                  <option value="Grupamento de Socorro de Emergência - GSE">Grupamento de Socorro de Emergência - GSE</option>
                  <option value="Hospital Central Aristarcho Pessoa - HCAP">Hospital Central Aristarcho Pessoa - HCAP</option>
                </select>
                <p className="text-[9.5px] text-slate-400 mt-1">
                  O médico passará a compor o efetivo cadastrado nesta OBM.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                  Ala de Atuação na OBM
                </label>
                <select
                  value={targetAla}
                  onChange={(e) => setTargetAla(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-rose-500 cursor-pointer uppercase"
                >
                  <option value="EXP">EXPEDIENTE</option>
                  <option value="1">ALA 1</option>
                  <option value="2">ALA 2</option>
                  <option value="3">ALA 3</option>
                  <option value="4">ALA 4</option>
                </select>
              </div>
            </div>

            {/* Botões do Modal */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAssigningMilitar(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAssign}
                disabled={isSavingAssign}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                {isSavingAssign ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Confirmar Registro na OBM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Ficha Completa do Médico */}
      {viewingMilitar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Ficha do Oficial Médico
                  </h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    CBMERJ • Corpo de Oficiais de Saúde
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingMilitar(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-1">
                <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400">
                  {parseRank(viewingMilitar.rank)}
                </span>
                <div className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {viewingMilitar.name}
                </div>
                <div className="text-xs text-slate-500 font-bold">
                  Nome de Guerra: <strong>{viewingMilitar.warName}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">RG Militar</span>
                  <span className="font-mono font-black text-slate-800 dark:text-slate-200 text-sm">{viewingMilitar.rg}</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">ID Funcional</span>
                  <span className="font-mono font-black text-slate-800 dark:text-slate-200 text-sm">{viewingMilitar.idFuncional || 'Não informado'}</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Quadro</span>
                  <span className="font-black text-rose-600 uppercase text-xs">{viewingMilitar.quadro || 'QOS/Méd'}</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Ingresso no CBMERJ</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">{viewingMilitar.admissionDate || viewingMilitar.ingresso || 'Não informado'}</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1.5">
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 block">OBM Administrativa (Origem)</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{viewingMilitar.obmOrigem || viewingMilitar.obm}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 block">Região / Polo de Saúde</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{viewingMilitar.regiao || 'Geral CBMERJ'} ({viewingMilitar.cba || 'CBMERJ'})</span>
                </div>
                {viewingMilitar.funcao && (
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 block">Cargo / Função Exercida</span>
                    <span className="font-bold text-amber-700 dark:text-amber-400 text-xs">{viewingMilitar.funcao}</span>
                    {viewingMilitar.tempoFuncao && (
                      <span className="text-[10px] text-slate-500 block">Tempo na Função: {viewingMilitar.tempoFuncao}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewingMilitar(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
