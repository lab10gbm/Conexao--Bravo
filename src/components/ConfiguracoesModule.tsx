import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, writeBatch, collection, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { motion } from 'motion/react';
import { 
  Calendar, 
  Check, 
  Save, 
  ShieldCheck, 
  Users, 
  Trash2, 
  Plus, 
  Building2, 
  Folder, 
  ArrowLeft, 
  ChevronRight, 
  Settings2, 
  Shield, 
  Sliders, 
  Lock,
  Layers,
  Sparkles,
  ArrowRight,
  Clock,
  RefreshCw,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  SlidersHorizontal,
  Info,
  ArrowUpRight,
  Zap,
  Play
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PermutaRequest } from '../types';
import { AppVisibilityConfig } from './AppVisibilityConfig';
import { SystemRolesConfig } from './SystemRolesConfig';
import { KeepAliveConfigCard } from './KeepAliveConfigCard';
import { EmailSmtpConfigCard } from './EmailSmtpConfigCard';
import { ComandoAreaManager } from './config/ComandoAreaManager';
import { useAppConfig } from '../contexts/ConfigContext';
import { 
  cleanUndefined, 
  normalizeRg, 
  cn,
  getStartAlaForYear, 
  getAlaForDate, 
  getProjectedYearAlas, 
  ANCHOR_REF_YEAR, 
  ANCHOR_START_ALA, 
  isMonthOpenForDate 
} from "../lib/utils";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRV3PAwJrGMQOUaUabnYNlbebEgrsE9wEnQ8Qpu0h-8ZT5WOgL3oyVIeQopb_X7g7PDByvP8OPy9upD/pub?gid=1221046524&single=true&output=csv";

interface ConfiguracoesModuleProps {
  onBack: () => void;
}

type ConfigCategory = 'hub' | 'comando_area' | 'calendario' | 'governanca' | 'servicos' | 'manutencao';

export function ConfiguracoesModule({ onBack }: ConfiguracoesModuleProps) {
  const { 
    activeMonths: ctxActiveMonths, 
    activePeriods: ctxActivePeriods, 
    autoRolloverMonths: ctxAutoRollover, 
    alaConfig: ctxAlaConfig, 
    escalanteRGs: ctxEscalanteRGs, 
    refreshConfigs: ctxRefreshConfigs 
  } = useAppConfig();

  const [activeCategory, setActiveCategory] = useState<ConfigCategory>('hub');
  const [openMonths, setOpenMonths] = useState<number[]>([]);
  const [activePeriods, setActivePeriods] = useState<string[]>([]);
  const [autoRollover, setAutoRollover] = useState(true);
  const [planningYear, setPlanningYear] = useState<number>(() => new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');

  const [alaConfig, setAlaConfig] = useState({ 
    referenceYear: 2026, 
    startAla: 2, 
    autoTransition: true 
  });
  const [savingAla, setSavingAla] = useState(false);

  // Escalantes
  const [escalanteRGs, setEscalanteRGs] = useState<string[]>([]);
  const [confirmClear, setConfirmClear] = useState<number>(0);

  useEffect(() => {
    if (ctxActiveMonths) setOpenMonths(ctxActiveMonths.map(Number));
    if (ctxActivePeriods && ctxActivePeriods.length > 0) {
      setActivePeriods(ctxActivePeriods);
    } else if (ctxActiveMonths && ctxActiveMonths.length > 0) {
      const curYear = new Date().getFullYear();
      setActivePeriods(ctxActiveMonths.map(m => `${curYear}-${String(Number(m) + 1).padStart(2, '0')}`));
    }
    if (ctxAutoRollover !== undefined) setAutoRollover(ctxAutoRollover);
    if (ctxAlaConfig) {
      setAlaConfig({ 
        referenceYear: ctxAlaConfig.referenceYear || 2026, 
        startAla: ctxAlaConfig.startAla || 2,
        autoTransition: ctxAlaConfig.autoTransition !== false
      });
    }
    if (ctxEscalanteRGs) setEscalanteRGs(ctxEscalanteRGs);
  }, [ctxActiveMonths, ctxActivePeriods, ctxAutoRollover, ctxAlaConfig, ctxEscalanteRGs]);

  const togglePeriod = (year: number, monthIndex: number) => {
    const periodKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    setActivePeriods(prev => {
      const exists = prev.includes(periodKey);
      const next = exists ? prev.filter(p => p !== periodKey) : [...prev, periodKey];
      
      // Sincroniza openMonths para compatibilidade retroativa com clientes legados
      const derivedMonths = Array.from(new Set(next.map(p => {
        const m = parseInt(p.split('-')[1], 10) - 1;
        return m;
      }))).sort((a, b) => a - b);
      setOpenMonths(derivedMonths);

      return next;
    });
  };

  const removePeriod = (periodKey: string) => {
    setActivePeriods(prev => {
      const next = prev.filter(p => p !== periodKey);
      const derivedMonths = Array.from(new Set(next.map(p => parseInt(p.split('-')[1], 10) - 1))).sort((a, b) => a - b);
      setOpenMonths(derivedMonths);
      return next;
    });
  };

  const applyPresetTransition = () => {
    // Preset para planejamento da virada de ano (Out/Nov/Dez de 2026 e Jan/Fev de 2027)
    const curYear = new Date().getFullYear();
    const nextYear = curYear + 1;
    const preset = [
      `${curYear}-10`,
      `${curYear}-11`,
      `${curYear}-12`,
      `${nextYear}-01`,
      `${nextYear}-02`
    ];
    setActivePeriods(prev => Array.from(new Set([...prev, ...preset])).sort());
    setOpenMonths(prev => Array.from(new Set([...prev, 0, 1, 9, 10, 11])).sort((a, b) => a - b));
  };

  const toggleAllMonthsOfYear = (year: number, open: boolean) => {
    setActivePeriods(prev => {
      let next = [...prev];
      for (let m = 0; m < 12; m++) {
        const key = `${year}-${String(m + 1).padStart(2, '0')}`;
        if (open) {
          if (!next.includes(key)) next.push(key);
        } else {
          next = next.filter(p => p !== key);
        }
      }
      next.sort();
      const derivedMonths = Array.from(new Set(next.map(p => parseInt(p.split('-')[1], 10) - 1))).sort((a, b) => a - b);
      setOpenMonths(derivedMonths);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const sortedMonths = [...openMonths].sort((a, b) => a - b);
      const sortedPeriods = [...activePeriods].sort();

      await setDoc(doc(db, 'config', 'active_months'), cleanUndefined({
        months: sortedMonths,
        activePeriods: sortedPeriods,
        autoRollover: autoRollover,
        updatedAt: new Date().toISOString()
      }));
      
      const pSnapshot = await getDocs(query(collection(db, 'permutas'), where('status', '==', 'scheduled')));
      const batch = writeBatch(db);
      let batchCount = 0;
      pSnapshot.forEach(d => {
        const permuta = d.data() as PermutaRequest;
        if (isMonthOpenForDate(permuta.date, sortedMonths, sortedPeriods)) {
          batch.update(d.ref, {
             status: 'pending',
             updatedAt: serverTimestamp()
          });
          batchCount++;
        }
      });
      if (batchCount > 0) {
         await batch.commit();
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (ctxRefreshConfigs) {
        await ctxRefreshConfigs();
      }
      setSaving(false);
    }
  };

  const handleSaveAlaConfig = async (override?: Partial<typeof alaConfig>) => {
    setSavingAla(true);
    try {
      const target = { ...alaConfig, ...(override || {}) };
      await setDoc(doc(db, 'config', 'ala_config'), cleanUndefined({
        referenceYear: target.referenceYear,
        startAla: target.startAla,
        autoTransition: target.autoTransition !== false,
        anchorYear: ANCHOR_REF_YEAR,
        anchorStartAla: ANCHOR_START_ALA,
        updatedAt: new Date().toISOString()
      }));
      if (override) {
        setAlaConfig(target);
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (ctxRefreshConfigs) {
        await ctxRefreshConfigs();
      }
      setSavingAla(false);
    }
  };

  const handleClearAllPermutas = async () => {
    if (confirmClear < 2) {
      setConfirmClear(prev => prev + 1);
      return;
    }
    setSyncing(true);
    setSyncStatus('Apagando permutas...');
    try {
      const pSnapshot = await getDocs(query(collection(db, 'permutas')));
      let count = 0;
      let currentBatch = writeBatch(db);
      
      for (const d of pSnapshot.docs) {
         currentBatch.delete(d.ref);
         count++;
         if (count % 400 === 0) {
           await currentBatch.commit();
           currentBatch = writeBatch(db);
         }
      }
      
      if (count % 400 !== 0) {
         await currentBatch.commit();
      }
      
      setSyncStatus(`Sucesso! ${count} permutas apagadas.`);
      setConfirmClear(0);
      setTimeout(() => {
         setSyncStatus('');
         window.location.reload();
      }, 2000);
    } catch(e) {
      console.error(e);
      setSyncStatus('Erro ao apagar');
    } finally {
      setTimeout(() => setSyncing(false), 2000);
    }
  };

  const months = [
    { index: 0, name: 'Janeiro' },
    { index: 1, name: 'Fevereiro' },
    { index: 2, name: 'Março' },
    { index: 3, name: 'Abril' },
    { index: 4, name: 'Maio' },
    { index: 5, name: 'Junho' },
    { index: 6, name: 'Julho' },
    { index: 7, name: 'Agosto' },
    { index: 8, name: 'Setembro' },
    { index: 9, name: 'Outubro' },
    { index: 10, name: 'Novembro' },
    { index: 11, name: 'Dezembro' }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto w-full px-4 pb-16"
    >
      {/* Botão Superior para Voltar ao Portal Principal */}
      <div className="mb-4 pt-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] group mt-6"
        >
          <span className="w-4 h-4 group-hover:-translate-x-1 transition-transform">
            &larr;
          </span>
          Voltar ao Portal Principal
        </button>
      </div>

      {/* ========================================================================= */}
      {/* HUB PRINCIPAL: PASTAS / CATEGORIAS ENCAPSULADAS                           */}
      {/* ========================================================================= */}
      {activeCategory === 'hub' && (
        <div className="space-y-6 mt-4">
          {/* Cabeçalho do Painel */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 shadow-inner flex items-center justify-center text-amber-400">
                  <Sliders className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Painel de Moderação
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                    Configurações do Sistema e App
                  </h1>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    Selecione uma pasta para gerenciar a estrutura territorial, parâmetros de escala, governança e serviços
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Grid de Pastas Encapsuladas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* PASTA 1: COMANDO DE ÁREA (SOLICITADA PELO USUÁRIO) */}
            <motion.div
              whileHover={{ scale: 1.02, translateY: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveCategory('comando_area')}
              className="bg-slate-900 border-2 border-amber-500/60 hover:border-amber-400 rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl group-hover:bg-amber-500/25 transition-colors"></div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 border border-amber-500/40 text-amber-300">
                    Estrutura Territorial
                  </span>
                </div>

                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Pasta
                </span>
                <h3 className="text-lg font-black text-white uppercase tracking-tight group-hover:text-amber-400 transition-colors mt-0.5">
                  Comando de Área
                </h3>
                <p className="text-xs text-slate-400 mt-2 font-medium leading-relaxed">
                  Todos os 10 Comandos de Área do CBMERJ. Acesse as pastas de OBMs e DBMs e cadastre novos quartéis.
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-amber-400">
                <span>10 CBAs • OBMs e DBMs</span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Abrir Pasta <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </motion.div>

            {/* PASTA 2: PARÂMETROS DE ESCALA E PERMUTAS */}
            <motion.div
              whileHover={{ scale: 1.02, translateY: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveCategory('calendario')}
              className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                    <Calendar className="w-7 h-7" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                    Escalas
                  </span>
                </div>

                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Pasta
                </span>
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight group-hover:text-indigo-500 transition-colors mt-0.5">
                  Parâmetros de Escala
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium leading-relaxed">
                  Meses autorizados para abertura de permutas e definição da ala de referência anual (01/01).
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-indigo-500">
                <span>Permutas & Alas</span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Configurar <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </motion.div>

            {/* PASTA 3: GOVERNANÇA E ACESSOS */}
            <motion.div
              whileHover={{ scale: 1.02, translateY: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveCategory('governanca')}
              className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    Acessos
                  </span>
                </div>

                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Pasta
                </span>
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight group-hover:text-emerald-500 transition-colors mt-0.5">
                  Governança & Permissões
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium leading-relaxed">
                  Designação de escalantes por quartel, moderadores gerais e visibilidade de módulos no menu.
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-emerald-500">
                <span>Roles & Visibilidade</span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Configurar <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </motion.div>

            {/* PASTA 4: SERVIÇOS DE SERVIDOR E SMTP */}
            <motion.div
              whileHover={{ scale: 1.02, translateY: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveCategory('servicos')}
              className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                    <Settings2 className="w-7 h-7" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                    Serviços
                  </span>
                </div>

                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Pasta
                </span>
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight group-hover:text-blue-500 transition-colors mt-0.5">
                  Serviços de Servidor
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium leading-relaxed">
                  Robô anti-hibernação do Render (06h às 23h) e parâmetros de SMTP para recuperação de senhas.
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-blue-500">
                <span>Keep-Alive & E-mail</span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Configurar <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </motion.div>

            {/* PASTA 5: ZONA DE MANUTENÇÃO */}
            <motion.div
              whileHover={{ scale: 1.02, translateY: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveCategory('manutencao')}
              className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-red-400 dark:hover:border-red-500 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                    <Trash2 className="w-7 h-7" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300">
                    Perigo
                  </span>
                </div>

                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Pasta
                </span>
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight group-hover:text-red-500 transition-colors mt-0.5">
                  Zona de Manutenção
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium leading-relaxed">
                  Operações controladas de limpeza de base e reset de dados de teste para produção.
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-red-500">
                <span>Limpeza de Dados</span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Acessar <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEÇÃO 1: COMANDO DE ÁREA (GERENCIADOR HIERÁRQUICO COMPLETO)               */}
      {/* ========================================================================= */}
      {activeCategory === 'comando_area' && (
        <ComandoAreaManager onBackToConfig={() => setActiveCategory('hub')} />
      )}

      {/* ========================================================================= */}
      {/* SEÇÃO 2: CALENDÁRIO E REGRAS DE ESCALA                                    */}
      {/* ========================================================================= */}
      {activeCategory === 'calendario' && (
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveCategory('hub')}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-black uppercase tracking-wider transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Configurações
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-amber-400 text-xs font-black uppercase tracking-wider">
                Parâmetros de Escala
              </span>
            </div>
            <button 
              onClick={() => setActiveCategory('hub')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-700 transition-colors"
            >
              Voltar às Pastas
            </button>
          </div>

          {/* ========================================================================= */}
          {/* CARD 1: CONFIGURAÇÃO DE PERÍODOS ABERTOS COM PLANEJAMENTO DE VIRADA      */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                      Períodos Abertos para Permuta
                    </h3>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-black rounded-md border border-amber-200 uppercase tracking-wider">
                      Multi-Ano & Virada
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">
                    Autorize solicitações para {planningYear} e antecipe a abertura para o próximo ano
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-slate-800 hover:bg-black text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 transition-all shadow-sm"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Gravando...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Salvar Meses Selecionados
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Seletor de Ano de Planejamento e Ações Rápidas */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60 mb-4 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0 mr-1 flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" /> Ano de Planejamento:
                </span>
                {[2026, 2027, 2028].map(yr => {
                  const isCurrent = yr === new Date().getFullYear();
                  const countInYear = activePeriods.filter(p => p.startsWith(`${yr}-`)).length;
                  return (
                    <button
                      key={yr}
                      onClick={() => setPlanningYear(yr)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap",
                        planningYear === yr
                          ? "bg-amber-500 text-white shadow-sm"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      )}
                    >
                      <span>{yr}</span>
                      {isCurrent && <span className="text-[9px] px-1 py-0.2 bg-black/20 rounded font-normal">Vigente</span>}
                      {yr === 2027 && <span className="text-[9px] px-1 py-0.2 bg-black/20 rounded font-normal">Virada</span>}
                      <span className="text-[10px] opacity-80">({countInYear})</span>
                    </button>
                  );
                })}
              </div>

              {/* Botões de Ação Rápida */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={applyPresetTransition}
                  title="Abre automaticamente Out/2026, Nov/2026, Dez/2026, Jan/2027 e Fev/2027"
                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-indigo-600" />
                  Preset Virada (Out/26 a Fev/27)
                </button>
                <button
                  onClick={() => toggleAllMonthsOfYear(planningYear, true)}
                  className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                >
                  Abrir Todo {planningYear}
                </button>
                <button
                  onClick={() => toggleAllMonthsOfYear(planningYear, false)}
                  className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                >
                  Limpar {planningYear}
                </button>
              </div>
            </div>

            {/* Faixa com Resumo de Todos os Períodos Ativos no Sistema */}
            {activePeriods.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-800/40 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-400 mr-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Períodos Ativos ({activePeriods.length}):
                </span>
                {activePeriods.map(p => {
                  const [yStr, mStr] = p.split('-');
                  const y = parseInt(yStr, 10);
                  const mIdx = parseInt(mStr, 10) - 1;
                  const monthName = months[mIdx]?.name || p;
                  return (
                    <span 
                      key={p} 
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 rounded-lg text-[10px] font-black uppercase tracking-wider"
                    >
                      <span>{monthName.slice(0, 3)}/{y}</span>
                      <button
                        onClick={() => removePeriod(p)}
                        className="hover:text-red-600 transition-colors ml-0.5"
                        title={`Remover ${monthName}/${y}`}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Grade de 12 Meses do Ano Selecionado */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {months.map((m) => {
                const periodKey = `${planningYear}-${String(m.index + 1).padStart(2, '0')}`;
                const isActive = activePeriods.includes(periodKey);
                return (
                  <button
                    key={`${planningYear}-${m.index}`}
                    onClick={() => togglePeriod(planningYear, m.index)}
                    className={cn(
                      "p-3 rounded-xl border text-[10px] font-black uppercase tracking-tighter transition-all flex items-center justify-between",
                      isActive 
                        ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 shadow-sm ring-1 ring-amber-400/30' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 opacity-60 grayscale hover:grayscale-0 hover:border-slate-300'
                    )}
                  >
                    <div className="flex flex-col text-left">
                      <span>{m.name}</span>
                      <span className="text-[8px] font-semibold opacity-70 tracking-widest">{planningYear}</span>
                    </div>
                    {isActive && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                  </button>
                );
              })}
            </div>

            {/* Opção de Rollover Automático */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoRollover}
                  onChange={(e) => setAutoRollover(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Rollover Automático dos Meses
                </span>
                <span className="text-[9px] text-slate-400 hidden sm:inline">
                  (Fecha automaticamente períodos civis expirados e avança a janela operacional)
                </span>
              </label>
              <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">
                Recomendado
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CARD 2: REFERÊNCIA DE ALAS & VIRADA AUTOMÁTICA (ROTAÇÃO PERPÉTUA 24x72)   */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                      Referência de Alas & Rotação Contínua 24x72
                    </h3>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-md border border-indigo-200 uppercase tracking-wider">
                      Ciclo Perpétuo
                    </span>
                  </div>
                  <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">
                    Virada de ano automática com cálculo matemático contínuo das 4 alas
                  </p>
                </div>
              </div>
              <button 
                onClick={() => handleSaveAlaConfig()}
                disabled={savingAla}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 transition-all shadow-sm"
              >
                {savingAla ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Gravando...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Salvar Regra
                  </>
                )}
              </button>
            </div>

            {/* Banner de Status da Automação */}
            <div className={cn(
              "p-4 rounded-xl border mb-6 transition-all",
              alaConfig.autoTransition
                ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
            )}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-3 h-3 rounded-full animate-pulse",
                    alaConfig.autoTransition ? "bg-emerald-500" : "bg-amber-500"
                  )} />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                      {alaConfig.autoTransition 
                        ? "Passagem Automática Ativa (Transição Contínua Sem Fricção)" 
                        : "Modo de Referência Manual"}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      {alaConfig.autoTransition
                        ? "O sistema avança automaticamente para 2027 às 00:00h de 01/01/2027 com ALA 3. Não é necessária intervenção humana."
                        : "A virada de ano e a ala inicial dependerão de ajuste manual pelo escalante."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => {
                      const nextAuto = !alaConfig.autoTransition;
                      setAlaConfig(prev => ({ ...prev, autoTransition: nextAuto }));
                      handleSaveAlaConfig({ autoTransition: nextAuto });
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border",
                      alaConfig.autoTransition
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    {alaConfig.autoTransition ? "Desativar Automação" : "Ativar Modo Automático"}
                  </button>
                </div>
              </div>
            </div>

            {/* Linha do Tempo Visual da Virada de Ano (Visual Timeline Projeção) */}
            <div className="mb-6">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 pl-1">
                Linha do Tempo da Rotação 24x72 (Projeção da Virada)
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 2026 */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border-2 border-indigo-200 dark:border-indigo-800 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-slate-800 dark:text-white">ANO 2026</span>
                    <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[9px] font-black rounded uppercase">
                      Vigente
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">01/01/2026:</span>
                      <span className="font-black text-rose-600">ALA 2</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">31/12/2026:</span>
                      <span className="font-black text-rose-600">ALA 2</span>
                    </div>
                  </div>
                  <div className="mt-2 text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
                    365 dias (ano normal)
                  </div>
                </div>

                {/* 2027 (Virada Próxima) */}
                <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/40 rounded-xl border-2 border-amber-300 dark:border-amber-700 relative overflow-hidden ring-2 ring-amber-400/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-amber-900 dark:text-amber-200">ANO 2027</span>
                    <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[9px] font-black rounded uppercase shadow-sm">
                      Próxima Virada
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] font-bold text-amber-950 dark:text-amber-100">
                    <div className="flex justify-between">
                      <span className="opacity-70">01/01/2027:</span>
                      <span className="font-black text-blue-600">ALA 3 ➔</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">31/12/2027:</span>
                      <span className="font-black text-blue-600">ALA 3</span>
                    </div>
                  </div>
                  <div className="mt-2 text-[9px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                    365 dias (avanço +1 dia)
                  </div>
                </div>

                {/* 2028 (Bissexto) */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-slate-800 dark:text-white">ANO 2028</span>
                    <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-black rounded uppercase">
                      Bissexto
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">01/01/2028:</span>
                      <span className="font-black text-amber-600">ALA 4</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">31/12/2028:</span>
                      <span className="font-black text-emerald-600">ALA 1</span>
                    </div>
                  </div>
                  <div className="mt-2 text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
                    366 dias (avanço +2 dias)
                  </div>
                </div>

                {/* 2029 */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-slate-800 dark:text-white">ANO 2029</span>
                    <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-black rounded uppercase">
                      Futuro
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">01/01/2029:</span>
                      <span className="font-black text-rose-600">ALA 2</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">31/12/2029:</span>
                      <span className="font-black text-rose-600">ALA 2</span>
                    </div>
                  </div>
                  <div className="mt-2 text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
                    365 dias (ciclo recomeça)
                  </div>
                </div>
              </div>
            </div>

            {/* Ações Imediatas para o Escalante */}
            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                  Avanço Imediato de Referência
                </h5>
                <p className="text-[10px] text-slate-500 font-medium">
                  Se desejar aplicar o ano de 2027 antecipadamente para testes ou escalas imediatas:
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (window.confirm("Deseja avançar imediatamente a referência global para 2027 (iniciando na ALA 3)?")) {
                      handleSaveAlaConfig({ referenceYear: 2027, startAla: 3 });
                    }
                  }}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Avançar p/ 2027 (ALA 3)
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Deseja manter / reverter a referência global para 2026 (ALA 2)?")) {
                      handleSaveAlaConfig({ referenceYear: 2026, startAla: 2 });
                    }
                  }}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                >
                  Manter 2026 (ALA 2)
                </button>
              </div>
            </div>

            {/* Campos de Ajuste Manual */}
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Ano de Referência Configurado
                </label>
                <input
                  type="number"
                  value={alaConfig.referenceYear}
                  onChange={(e) => {
                    const yr = parseInt(e.target.value) || 2026;
                    const calculated = getStartAlaForYear(yr);
                    setAlaConfig({ ...alaConfig, referenceYear: yr, startAla: calculated });
                  }}
                  className="w-full border-2 border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold text-slate-700 dark:text-white bg-slate-50 dark:bg-slate-800 outline-none focus:border-indigo-400"
                />
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Qual Ala trabalha em 01/01 de {alaConfig.referenceYear}?
                </label>
                <select
                  value={alaConfig.startAla}
                  onChange={(e) => setAlaConfig({ ...alaConfig, startAla: parseInt(e.target.value) || 1 })}
                  className="w-full border-2 border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm font-bold text-slate-700 dark:text-white bg-slate-50 dark:bg-slate-800 outline-none focus:border-indigo-400"
                >
                  <option value={1}>ALA 1</option>
                  <option value={2}>ALA 2</option>
                  <option value={3}>ALA 3</option>
                  <option value={4}>ALA 4</option>
                </select>
              </div>
            </div>
            
            <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed border-l-2 border-indigo-200 dark:border-indigo-800 pl-3">
              Essa configuração molda a distribuição de todas as escalas (de 1/1 até 31/12). Ao salvar, os dados passarão a utilizar a escala partindo do dia 1 de janeiro do ano de referência até o próximo. Com a Passagem Automática ativada, a transição entre anos ocorre de forma ininterrupta e matematicamente precisa.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEÇÃO 3: GOVERNANÇA E ACESSOS                                             */}
      {/* ========================================================================= */}
      {activeCategory === 'governanca' && (
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveCategory('hub')}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-black uppercase tracking-wider transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Configurações
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-amber-400 text-xs font-black uppercase tracking-wider">
                Governança & Permissões
              </span>
            </div>
            <button 
              onClick={() => setActiveCategory('hub')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-700 transition-colors"
            >
              Voltar às Pastas
            </button>
          </div>

          <SystemRolesConfig />
          <AppVisibilityConfig />
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEÇÃO 4: SERVIÇOS & INFRAESTRUTURA                                        */}
      {/* ========================================================================= */}
      {activeCategory === 'servicos' && (
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveCategory('hub')}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-black uppercase tracking-wider transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Configurações
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-amber-400 text-xs font-black uppercase tracking-wider">
                Serviços de Servidor
              </span>
            </div>
            <button 
              onClick={() => setActiveCategory('hub')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-700 transition-colors"
            >
              Voltar às Pastas
            </button>
          </div>

          <KeepAliveConfigCard />
          <EmailSmtpConfigCard />
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEÇÃO 5: ZONA DE MANUTENÇÃO                                               */}
      {/* ========================================================================= */}
      {activeCategory === 'manutencao' && (
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveCategory('hub')}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-black uppercase tracking-wider transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Configurações
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-red-400 text-xs font-black uppercase tracking-wider">
                Zona de Manutenção
              </span>
            </div>
            <button 
              onClick={() => setActiveCategory('hub')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-700 transition-colors"
            >
              Voltar às Pastas
            </button>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-red-600" />
                <div>
                  <h3 className="text-sm font-black text-red-900 uppercase tracking-tight">Zona de Perigo: Apagar Registros</h3>
                  <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest leading-normal">
                    Esta ação apaga <b>TODAS AS PERMUTAS JÁ REGISTRADAS NO SISTEMA</b>.
                    Útil para limpar a base de testes antes de entrar em produção.
                    Para prevenir acidentes, clique 3 vezes no botão.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <button 
                  onClick={handleClearAllPermutas}
                  disabled={syncing}
                  className={`px-6 py-3 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 transition-all border-b-4 active:border-b-0 active:translate-y-1 min-w-[200px] justify-center ${
                    confirmClear === 0 ? 'bg-slate-800 text-white border-slate-900 hover:bg-slate-700' :
                    confirmClear === 1 ? 'bg-amber-600 text-white border-amber-800 hover:bg-amber-700 animate-pulse' :
                    'bg-red-600 text-white border-red-800 hover:bg-red-700 animate-bounce'
                  }`}
                >
                  {syncing ? syncStatus :
                   confirmClear === 0 ? 'Apagar Todas as Permutas' :
                   confirmClear === 1 ? 'Tem certeza? Clique novamente' :
                   'CONFIRMAR EXCLUSÃO! (Sem Volta)'}
                </button>
                {syncing && syncStatus.includes('Apagando') && <div className="text-[8px] text-red-600 font-black animate-pulse">LIMPANDO BASE...</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
