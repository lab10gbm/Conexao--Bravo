import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Users, 
  Clock, 
  Calendar, 
  Shield, 
  Radio, 
  CheckCircle2, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Wifi,
  WifiOff,
  Flame,
  LayoutGrid,
  Columns2,
  Filter,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { UserProfile } from '../types';
import { useMilitars } from '../contexts/MilitarContext';
import { useOnlinePresence, OnlineMilitaryUser } from '../hooks/usePresence';
import { 
  getCurrentDutyShift, 
  getAlaColor, 
  getAlaName, 
  normalizeObm, 
  normalizeAlaField, 
  normalizeRg, 
  cn, 
  getUserObmAccess 
} from '../lib/utils';
import { resolveCanonicalScope, formatScopeLabel } from '../lib/canonicalScope';
import { sortAllBySeniority, parseRank } from '../lib/rankUtils';
import { RankInsignia } from './RankInsignia';

interface OperationalDutyWidgetProps {
  user: UserProfile;
  obmContext?: string;
}

export function OperationalDutyWidget({ user, obmContext }: OperationalDutyWidgetProps) {
  const { militars } = useMilitars();
  const { onlineUsers, totalOnlineCount, isUserOnline } = useOnlinePresence(user);

  // Relógio ao vivo atualizado a cada segundo
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Ala de serviço e informações de turno (regra das 09:00 do CBMERJ)
  const dutyShift = useMemo(() => getCurrentDutyShift(currentTime), [currentTime]);

  // Estados de visualização do widget
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('op_duty_widget_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<'efetivo_dia' | 'online_obm'>('efetivo_dia');
  const [viewMode, setViewMode] = useState<'tabs' | 'split'>('tabs');
  const [searchTerm, setSearchTerm] = useState('');
  const [efetivoFilter, setEfetivoFilter] = useState<'all' | 'online_only' | 'prontos_only'>('all');

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('op_duty_widget_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const effectiveObm = obmContext || user.obm || '10º GBM';
  const isGlobal = effectiveObm === 'GLOBAL';
  const canonicalScope = resolveCanonicalScope(effectiveObm);
  const obmLabel = isGlobal ? 'Todas as Unidades (GLOBAL)' : formatScopeLabel(canonicalScope);

  // 1. FILTRAGEM: Militares da OBM pertencentes à Ala de Serviço do Dia (Efetivo do Dia)
  const dutyMilitars = useMemo(() => {
    const dutyAlaStr = String(dutyShift.dutyAla);
    const accessibleObms = isGlobal ? null : getUserObmAccess(effectiveObm, false, true);

    return militars.filter(m => {
      // 1. Filtro de OBM
      if (!isGlobal && accessibleObms) {
        const cleanObm = normalizeObm(m.obm);
        if (!accessibleObms.includes(cleanObm)) return false;
      }

      // 2. Filtro de Ala da escala de serviço (regra das 09:00)
      const militarAla = normalizeAlaField(m.ala);
      if (militarAla !== dutyAlaStr) return false;

      return true;
    }).sort(sortAllBySeniority);
  }, [militars, effectiveObm, isGlobal, dutyShift.dutyAla]);

  // 2. FILTRAGEM: Militares da OBM atualmente Online no aplicativo
  const obmOnlineUsers = useMemo(() => {
    const accessibleObms = isGlobal ? null : getUserObmAccess(effectiveObm, false, true);

    return onlineUsers.filter(u => {
      if (isGlobal) return true;
      if (!accessibleObms) return true;
      const cleanObm = normalizeObm(u.obm);
      return accessibleObms.includes(cleanObm);
    });
  }, [onlineUsers, effectiveObm, isGlobal]);

  // Contadores de prontidão do Efetivo do Dia
  const dutyOnlineCount = useMemo(() => {
    return dutyMilitars.filter(m => isUserOnline(m.rg)).length;
  }, [dutyMilitars, isUserOnline]);

  const dutyProntosCount = useMemo(() => {
    return dutyMilitars.filter(m => {
      const sit = (m.situacao || '').toUpperCase();
      return sit === 'ATIVO' || sit.startsWith('ATIVO') && !sit.includes('FERIAS') && !sit.includes('FÉRIAS') && !sit.includes('LTS') && !sit.includes('LICENÇA');
    }).length;
  }, [dutyMilitars]);

  const readinessPercent = dutyMilitars.length > 0 
    ? Math.round((dutyOnlineCount / dutyMilitars.length) * 100) 
    : 0;

  // Filtros aplicados à Tabela 2 (Efetivo do Dia)
  const filteredDutyMilitars = useMemo(() => {
    return dutyMilitars.filter(m => {
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const match = 
          (m.name || '').toLowerCase().includes(s) ||
          (m.warName || '').toLowerCase().includes(s) ||
          (m.rg || '').toLowerCase().includes(s) ||
          (m.rank || '').toLowerCase().includes(s);
        if (!match) return false;
      }

      if (efetivoFilter === 'online_only' && !isUserOnline(m.rg)) {
        return false;
      }

      if (efetivoFilter === 'prontos_only') {
        const sit = (m.situacao || '').toUpperCase();
        if (sit.includes('FERIAS') || sit.includes('FÉRIAS') || sit.includes('LTS') || sit.includes('LICENÇA')) return false;
      }

      return true;
    });
  }, [dutyMilitars, searchTerm, efetivoFilter, isUserOnline]);

  // Filtros aplicados à Tabela 1 (Militares Online da OBM)
  const filteredObmOnlineUsers = useMemo(() => {
    return obmOnlineUsers.filter(u => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        (u.name || '').toLowerCase().includes(s) ||
        (u.warName || '').toLowerCase().includes(s) ||
        (u.rg || '').toLowerCase().includes(s) ||
        (u.rank || '').toLowerCase().includes(s)
      );
    });
  }, [obmOnlineUsers, searchTerm]);

  // Estilos de cor da Ala de serviço
  const alaColorClass = useMemo(() => {
    switch (dutyShift.dutyAla) {
      case 1: return { bg: 'bg-emerald-600', light: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300', badge: 'bg-emerald-500' };
      case 2: return { bg: 'bg-rose-600', light: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300', badge: 'bg-rose-500' };
      case 3: return { bg: 'bg-blue-600', light: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300', badge: 'bg-blue-500' };
      case 4: return { bg: 'bg-amber-600', light: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300', badge: 'bg-amber-500' };
      default: return { bg: 'bg-slate-700', light: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200', badge: 'bg-slate-600' };
    }
  }, [dutyShift.dutyAla]);

  return (
    <div className="w-full mb-6 transition-all duration-300">
      <div className="bg-white dark:bg-[#141c2e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        
        {/* ========================================================================= */}
        {/* CABEÇALHO DO WIDGET: DATA, HORA, ALA DE SERVIÇO (REGRA 09:00) E MÉTRICAS */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/80 dark:from-[#111827] dark:via-[#141c2e] dark:to-[#111827]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Lado Esquerdo: Data, Relógio e Identificação da Ala de Serviço */}
            <div className="flex items-start sm:items-center gap-3.5">
              <div className={cn(
                "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex flex-col items-center justify-center text-white shadow-md shrink-0 font-black",
                alaColorClass.bg
              )}>
                <span className="text-[10px] tracking-widest uppercase opacity-80 leading-none">ALA</span>
                <span className="text-xl sm:text-2xl leading-none mt-0.5">{dutyShift.dutyAla}</span>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                    {format(currentTime, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                  
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white font-mono shadow-xs">
                    <Clock className="w-3 h-3 text-amber-400" />
                    {format(currentTime, "HH:mm:ss")}
                  </span>

                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border",
                    alaColorClass.light
                  )}>
                    <Flame className="w-3 h-3" />
                    {dutyShift.dutyAlaName} DE SERVIÇO
                  </span>
                </div>

                {/* Subtítulo Operacional da Regra das 09h */}
                <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5 flex-wrap">
                  <span>Passagem às 09:00:</span>
                  {dutyShift.passedTodayNineAm ? (
                    <span className="text-indigo-600 dark:text-indigo-400">
                      Plantão assumido hoje às 09:00h • Passagem amanhã às 09:00h para a {dutyShift.nextAlaName} (~{dutyShift.hoursUntilTransition}h restantes)
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-black">
                      Plantão de ontem em finalização • Passagem HOJE às 09:00h para a {dutyShift.nextAlaName} (~{dutyShift.hoursUntilTransition}h restantes)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Lado Direito: Métricas Rápidas & Botão de Recolher */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-between lg:justify-end">
              
              {/* Card 1: Militares Online no Aplicativo */}
              <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div className="text-left">
                  <div className="text-xs sm:text-sm font-black text-emerald-900 dark:text-emerald-200 leading-none">
                    {totalOnlineCount} Online
                  </div>
                  <div className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider leading-none mt-0.5">
                    {obmOnlineUsers.length} na {effectiveObm}
                  </div>
                </div>
              </div>

              {/* Card 2: Efetivo do Dia na OBM */}
              <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="text-left">
                  <div className="text-xs sm:text-sm font-black text-slate-800 dark:text-white leading-none">
                    {dutyMilitars.length} na {dutyShift.dutyAlaName}
                  </div>
                  <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none mt-0.5">
                    {dutyOnlineCount} conectados ({readinessPercent}%)
                  </div>
                </div>
              </div>

              {/* Botão de Toggle Minimizar/Expandir */}
              <button
                onClick={toggleCollapsed}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title={isCollapsed ? "Expandir Painel de Efetivo & Presença" : "Recolher Painel"}
              >
                {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CORPO EXPANDÍVEL DO WIDGET: TABELAS DE EFETIVO DO DIA & ONLINE NA OBM    */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="p-4 sm:p-5 space-y-4">
                
                {/* Barra de Ferramentas: Seletor de Abas, Busca e Modo de Visualização */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  
                  {/* Seletor de Abas */}
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
                    <button
                      onClick={() => setActiveTab('efetivo_dia')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap",
                        activeTab === 'efetivo_dia'
                          ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                      )}
                    >
                      <Shield className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Efetivo do Dia ({dutyMilitars.length})</span>
                      {dutyOnlineCount > 0 && (
                        <span className="px-1.5 py-0.2 bg-emerald-500 text-white rounded-full text-[9px] font-black">
                          {dutyOnlineCount} on
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setActiveTab('online_obm')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap",
                        activeTab === 'online_obm'
                          ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                      )}
                    >
                      <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Militares Online ({obmOnlineUsers.length})</span>
                    </button>
                  </div>

                  {/* Campo de Busca Rápida */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="BUSCAR NOME OU RG..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 uppercase outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>

                    {/* Filtro do Efetivo do Dia */}
                    {activeTab === 'efetivo_dia' && (
                      <select
                        value={efetivoFilter}
                        onChange={(e) => setEfetivoFilter(e.target.value as any)}
                        className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 outline-none"
                      >
                        <option value="all">TODOS DA ALA ({dutyMilitars.length})</option>
                        <option value="online_only">🟢 APENAS ONLINE ({dutyOnlineCount})</option>
                        <option value="prontos_only">PRONTOS P/ SERVIÇO ({dutyProntosCount})</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* ===================================================================== */}
                {/* TABELA 1: MILITARES ONLINE DA OBM                                     */}
                {/* ===================================================================== */}
                {activeTab === 'online_obm' && (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-3">Posto/Grad</th>
                          <th className="py-2.5 px-3">Nome de Guerra & Completo</th>
                          <th className="py-2.5 px-3">RG</th>
                          <th className="py-2.5 px-3">Ala do Militar</th>
                          <th className="py-2.5 px-3">Unidade / OBM</th>
                          <th className="py-2.5 px-3 text-right">Status no Aplicativo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#141c2e]">
                        {filteredObmOnlineUsers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 font-bold uppercase tracking-widest text-[11px]">
                              Nenhum militar online encontrado com os filtros atuais.
                            </td>
                          </tr>
                        ) : (
                          filteredObmOnlineUsers.map((u) => {
                            const isDutyDayAla = normalizeAlaField(u.ala) === String(dutyShift.dutyAla);
                            const alaClean = normalizeAlaField(u.ala) || 'EXP';
                            const alaNameFormatted = getAlaName(alaClean);

                            return (
                              <tr 
                                key={u.rg} 
                                className={cn(
                                  "hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors",
                                  u.isCurrentUser && "bg-indigo-50/30 dark:bg-indigo-950/20"
                                )}
                              >
                                {/* Posto */}
                                <td className="py-2.5 px-3 font-black text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <RankInsignia rankStr={u.rank} className="w-4 h-4 shrink-0" />
                                    <span>{parseRank(u.rank)}</span>
                                  </div>
                                </td>

                                {/* Nome */}
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-black text-slate-800 dark:text-white uppercase">
                                      {u.warName || u.name}
                                    </span>
                                    {u.isCurrentUser && (
                                      <span className="px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[9px] font-black rounded uppercase">
                                        Você
                                      </span>
                                    )}
                                    {isDutyDayAla && (
                                      <span className="px-1.5 py-0.2 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-[9px] font-black rounded uppercase border border-amber-300 dark:border-amber-700 flex items-center gap-0.5">
                                        <Flame className="w-2.5 h-2.5 text-amber-600" /> De Serviço Hoje
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 uppercase font-medium">
                                    {u.name}
                                  </div>
                                </td>

                                {/* RG */}
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                  {u.rg}
                                </td>

                                {/* Ala */}
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-white",
                                    getAlaColor(alaClean)
                                  )}>
                                    {alaNameFormatted}
                                  </span>
                                </td>

                                {/* OBM */}
                                <td className="py-2.5 px-3 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase whitespace-nowrap">
                                  {u.obm || effectiveObm}
                                </td>

                                {/* Status */}
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    {u.lastActiveFormatted}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ===================================================================== */}
                {/* TABELA 2: EFETIVO DO DIA ATIVO (GUARNIÇÃO DE SERVIÇO DA ALA)          */}
                {/* ===================================================================== */}
                {activeTab === 'efetivo_dia' && (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-3">Posto/Grad</th>
                          <th className="py-2.5 px-3">Nome de Guerra & Completo</th>
                          <th className="py-2.5 px-3">RG</th>
                          <th className="py-2.5 px-3">Quadro</th>
                          <th className="py-2.5 px-3">Situação Operacional</th>
                          <th className="py-2.5 px-3 text-right">Conexão no Aplicativo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#141c2e]">
                        {filteredDutyMilitars.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 font-bold uppercase tracking-widest text-[11px]">
                              Nenhum militar da {dutyShift.dutyAlaName} encontrado na unidade {effectiveObm}.
                            </td>
                          </tr>
                        ) : (
                          filteredDutyMilitars.map((m) => {
                            const online = isUserOnline(m.rg);
                            const sitUpper = (m.situacao || 'ATIVO').toUpperCase();
                            const isAway = sitUpper.includes('FERIAS') || sitUpper.includes('FÉRIAS') || sitUpper.includes('LTS') || sitUpper.includes('LICENÇA');
                            const isSelf = normalizeRg(m.rg) === normalizeRg(user.rg);

                            return (
                              <tr 
                                key={m.rg} 
                                className={cn(
                                  "hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors",
                                  online && "bg-emerald-50/20 dark:bg-emerald-950/10",
                                  isSelf && "ring-1 ring-inset ring-indigo-400/30"
                                )}
                              >
                                {/* Posto */}
                                <td className="py-2.5 px-3 font-black text-slate-700 dark:text-slate-200 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <RankInsignia rankStr={m.rank} className="w-4 h-4 shrink-0" />
                                    <span>{parseRank(m.rank)}</span>
                                  </div>
                                </td>

                                {/* Nome */}
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-black text-slate-800 dark:text-white uppercase">
                                      {m.warName || m.name}
                                    </span>
                                    {isSelf && (
                                      <span className="px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[9px] font-black rounded uppercase">
                                        Você
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 uppercase font-medium">
                                    {m.name}
                                  </div>
                                </td>

                                {/* RG */}
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                  {m.rg}
                                </td>

                                {/* Quadro */}
                                <td className="py-2.5 px-3 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase whitespace-nowrap">
                                  {m.quadro || 'QBM'}
                                </td>

                                {/* Situação */}
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  {isAway ? (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300">
                                      {m.situacao}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-300 border border-green-200 dark:border-green-800">
                                      PRONTO P/ SERVIÇO
                                    </span>
                                  )}
                                </td>

                                {/* Conexão no Aplicativo */}
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  {online ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                      🟢 ONLINE NO APP
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                                      Desconectado
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
