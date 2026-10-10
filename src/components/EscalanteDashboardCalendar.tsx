import React, { useState, useEffect, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  CheckCircle2,
  AlertCircle,
  Shield,
  Users,
  BriefcaseBusiness,
  Truck,
  Activity,
  Sparkles,
  ArrowRight,
  Award,
  Anchor,
  Stethoscope,
  HeartPulse,
} from 'lucide-react';
import {
  cn,
  getAlaForDate,
  getAlaColor,
  getAlaLightColor,
  normalizeAlaField,
  normalizeRg,
  normalizeObm,
} from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { parseRank } from '../lib/rankUtils';
import { RankInsignia } from './RankInsignia';

export interface EscalanteDashboardCalendarProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  obmContext: string;
  militars: any[];
  afastamentos: any[];
  permutas: any[];
  baseRoster: any[];
  expedienteMilitars: any[];
  dynamicRequirements?: any[];
  selectedFunctions?: Record<string, string[] | string>;
  oficialDiaValue?: string;
  nauticoOficialValue?: string;
  medicoOficialValue?: string;
  estudoTecnico?: any;
}

export function EscalanteDashboardCalendar({
  selectedDate,
  onSelectDate,
  obmContext,
  militars = [],
  afastamentos = [],
  permutas = [],
  baseRoster = [],
  expedienteMilitars = [],
  dynamicRequirements = [],
  selectedFunctions = {},
  oficialDiaValue = '',
  nauticoOficialValue = '',
  medicoOficialValue = '',
  estudoTecnico,
}: EscalanteDashboardCalendarProps) {
  // Estado de expansão do dashboard (ao iniciar o módulo escala 24h, começa recolhido conforme solicitado)
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  // Mês de visualização no calendário
  const selectedDateObj = useMemo(() => {
    try {
      return selectedDate ? parseISO(selectedDate) : new Date();
    } catch {
      return new Date();
    }
  }, [selectedDate]);

  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(selectedDateObj));

  // Sincroniza mês se a data selecionada mudar de mês
  useEffect(() => {
    if (selectedDateObj && !isNaN(selectedDateObj.getTime())) {
      const monthOfSelected = startOfMonth(selectedDateObj);
      if (monthOfSelected.getTime() !== currentMonth.getTime()) {
        setCurrentMonth(monthOfSelected);
      }
    }
  }, [selectedDate]);

  const nextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));
  const prevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(startOfMonth(today));
    onSelectDate(format(today, 'yyyy-MM-dd'));
  };

  // Carrega em tempo real os dados de expediente do mês (selections, expedienteDays, preferencesDetails)
  const [monthExpedienteData, setMonthExpedienteData] = useState<{
    selections: Record<string, string[]>;
    expedienteDays: Record<string, string[]>;
    preferencesDetails: Record<string, Record<string, number>>;
  }>({
    selections: {},
    expedienteDays: {},
    preferencesDetails: {},
  });

  useEffect(() => {
    if (!obmContext || obmContext === 'GLOBAL') return;
    try {
      const cleanObm = normalizeObm(obmContext || '10º GBM');
      const normalizedObm = cleanObm.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const monthKey = format(currentMonth, 'yyyy-MM');
      const docRef = doc(db, `expediente_${normalizedObm}`, monthKey);

      const unsub = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setMonthExpedienteData({
            selections: d.selections || {},
            expedienteDays: d.expedienteDays || {},
            preferencesDetails: d.preferencesDetails || {},
          });
        } else {
          setMonthExpedienteData({
            selections: {},
            expedienteDays: {},
            preferencesDetails: {},
          });
        }
      });
      return () => unsub();
    } catch (err) {
      console.error('Erro ao carregar dados do mês no Expediente:', err);
    }
  }, [obmContext, currentMonth]);

  // Dias da grade do calendário
  const weekdays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  // Ala e estatísticas do dia selecionado
  const selectedAlaNumber = useMemo(() => getAlaForDate(selectedDateObj), [selectedDateObj]);
  const selectedAlaStr = `ALA ${selectedAlaNumber}`;

  // Informações resumidas do dia selecionado
  const selectedDayIntelligence = useMemo(() => {
    const dayStr = selectedDate;
    // Militares da Ala
    const alaMilitars = militars.filter(
      (m) => normalizeAlaField(m.ala) === normalizeAlaField(selectedAlaStr)
    );

    // Afastamentos ativos na Ala
    const activeAfastamentos = afastamentos.filter((a: any) => {
      if (dayStr < a.inicio || dayStr > a.retorno) return false;
      const mil = militars.find((m: any) => normalizeRg(m.rg) === normalizeRg(a.rg));
      const effAla = normalizeAlaField(a.ala || mil?.ala);
      return effAla === normalizeAlaField(selectedAlaStr);
    });

    // Permutas aprovadas no dia
    const permutasAtivas = permutas.filter((p: any) => {
      const pDate = p.date || p.data;
      return pDate === dayStr && (p.status === 'APROVADA' || !p.status);
    });

    // Expediente 24h & Expediente Admin
    const exp24hMilitars = Object.entries(monthExpedienteData.selections || {})
      .filter(([rg, days]) => rg !== 'ESCALANTE_PREF' && Array.isArray(days) && days.includes(dayStr))
      .map(([rg]) => {
        const found = militars.find((m) => normalizeRg(m.rg) === normalizeRg(rg));
        return { rg, name: found?.warName || found?.name || rg, militar: found };
      });

    const expAdminMilitars = Object.entries(monthExpedienteData.expedienteDays || {})
      .filter(([rg, days]) => rg !== 'ESCALANTE_PREF' && Array.isArray(days) && days.includes(dayStr))
      .map(([rg]) => {
        const found = militars.find((m) => normalizeRg(m.rg) === normalizeRg(rg));
        return { rg, name: found?.warName || found?.name || rg, militar: found };
      });

    // Prontidão operacional
    const totalOperacional = baseRoster.length;
    const totalExpediente = expedienteMilitars.length;
    const totalGeral = totalOperacional + totalExpediente;

    // Funções críticas
    const reqMotoristas = dynamicRequirements.find(
      (r) => r.name.toLowerCase().includes('motorista') || r.name.toLowerCase().includes('condutor')
    );
    const reqResgatistas = dynamicRequirements.find(
      (r) => r.name.toLowerCase().includes('socorrista') || r.name.toLowerCase().includes('resgate')
    );
    const reqCombate = dynamicRequirements.find(
      (r) => r.name.toLowerCase().includes('combate') || r.name.toLowerCase().includes('abt')
    );

    const countMotoristas = Object.values(selectedFunctions)
      .flat()
      .filter((fn) => typeof fn === 'string' && (fn.toLowerCase().includes('motorista') || fn.toLowerCase().includes('condutor'))).length;

    const countResgatistas = Object.values(selectedFunctions)
      .flat()
      .filter((fn) => typeof fn === 'string' && (fn.toLowerCase().includes('socorrista') || fn.toLowerCase().includes('resgate'))).length;

    const countCombate = Object.values(selectedFunctions)
      .flat()
      .filter((fn) => typeof fn === 'string' && (fn.toLowerCase().includes('combate') || fn.toLowerCase().includes('chefe') || fn.toLowerCase().includes('linha'))).length;

    // Verificação de alertas
    const alerts: { type: 'ok' | 'warning' | 'alert'; message: string }[] = [];

    if (!oficialDiaValue) {
      alerts.push({
        type: 'warning',
        message: 'Oficial de Dia ainda não selecionado para este plantão.',
      });
    }

    if (activeAfastamentos.length > 0) {
      alerts.push({
        type: 'alert',
        message: `${activeAfastamentos.length} ${activeAfastamentos.length === 1 ? 'militar da ala está afastado' : 'militares da ala estão afastados'} (Férias/Licença).`,
      });
    }

    if (permutasAtivas.length > 0) {
      alerts.push({
        type: 'ok',
        message: `${permutasAtivas.length} ${permutasAtivas.length === 1 ? 'permuta ativa autorizada' : 'permutas ativas autorizadas'} para este dia.`,
      });
    }

    if (totalOperacional >= 10) {
      alerts.push({
        type: 'ok',
        message: `Prontidão operacional quantitativa dentro do padrão com ${totalOperacional} militares operacionais.`,
      });
    } else if (totalOperacional > 0) {
      alerts.push({
        type: 'warning',
        message: `Efetivo operacional reduzido (${totalOperacional} militares). Avaliar reforço ou GRD.`,
      });
    }

    return {
      alaMilitars,
      activeAfastamentos,
      permutasAtivas,
      exp24hMilitars,
      expAdminMilitars,
      totalOperacional,
      totalExpediente,
      totalGeral,
      countMotoristas,
      reqMotoristas: reqMotoristas?.req || 0,
      countResgatistas,
      reqResgatistas: reqResgatistas?.req || 0,
      countCombate,
      reqCombate: reqCombate?.req || 0,
      alerts,
    };
  }, [
    selectedDate,
    selectedAlaStr,
    militars,
    afastamentos,
    permutas,
    monthExpedienteData,
    baseRoster,
    expedienteMilitars,
    dynamicRequirements,
    selectedFunctions,
    oficialDiaValue,
  ]);

  // Nome da Ala com cor temática
  const getAlaThemeName = (ala: number) => {
    switch (ala) {
      case 1:
        return 'VERDE';
      case 2:
        return 'VERMELHA';
      case 3:
        return 'AZUL';
      case 4:
        return 'AMARELA';
      default:
        return 'ADMIN';
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col mb-6 transition-all">
      {/* BARRA SUPERIOR DO DASHBOARD (HEADER EXPANSÍVEL) */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0 shadow-inner">
            <CalendarRange className="w-6 h-6 text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                Dashboard Mensal do Escalante • Escala 24h
              </h2>
              <span className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 tracking-widest flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-indigo-300" />
                Inteligência Operacional
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-300 font-bold uppercase tracking-wide mt-0.5">
              {obmContext || '10º GBM'} • Visão Mensal Completa, Acompanhamento de Efetivo & Sincronização Diária
            </p>
          </div>
        </div>

        {/* NAVEGAÇÃO DE MÊS & BOTÃO DE EXPANDIR / RECOLHER */}
        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          {/* Navegador de Mês */}
          <div className="flex items-center bg-slate-800/80 rounded-xl p-1 border border-slate-700/80 shadow-xs">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/80 transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-[11px] font-black uppercase tracking-widest text-slate-200 min-w-[130px] text-center select-none font-mono">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/80 transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={goToToday}
            className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            title="Ir para o dia de hoje"
          >
            Hoje
          </button>

          {/* Toggle Expandir / Recolher */}
          <button
            onClick={toggleExpanded}
            className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer border border-indigo-400/40"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span className="hidden sm:inline">Recolher</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span className="hidden sm:inline">Expandir Dashboard</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* MINI BARRA RESUMO QUANDO RECOLHIDO */}
      {!isExpanded && (
        <div className="p-3 px-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Data Ativa:
              </span>
              <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                {selectedDate.split('-').reverse().join('/')}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Ala:
              </span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider',
                  getAlaLightColor(selectedAlaNumber)
                )}
              >
                {selectedAlaStr} ({getAlaThemeName(selectedAlaNumber)})
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Efetivo Total:
              </span>
              <span className="font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                {selectedDayIntelligence.totalGeral} Militares
              </span>
            </div>
          </div>

          <button
            onClick={toggleExpanded}
            className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 tracking-wider flex items-center gap-1 cursor-pointer"
          >
            Abrir Visualização Mensal Completa <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* CORPO EXPANDIDO DO DASHBOARD: CALENDÁRIO À ESQUERDA + INTELIGÊNCIA À DIREITA */}
      {isExpanded && (
        <div className="p-4 sm:p-6 bg-slate-100/60 flex flex-col lg:flex-row gap-6">
          {/* COLUNA DO CALENDÁRIO MENSAL (LADO ESQUERDO) */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            {/* CABEÇALHO DO CALENDÁRIO (DIAS DA SEMANA) */}
            <div className="p-3 sm:p-4 pb-2 border-b border-slate-100 bg-slate-50/70">
              <div className="grid grid-cols-7 text-center">
                {weekdays.map((wd) => (
                  <div
                    key={wd}
                    className="text-[10px] sm:text-[11px] font-black text-slate-500 uppercase tracking-widest py-1"
                  >
                    {wd}
                  </div>
                ))}
              </div>
            </div>

            {/* GRADE DE CÉLULAS DO MÊS (7 COLUNAS) */}
            <div className="p-2 sm:p-3 grid grid-cols-7 gap-1.5 sm:gap-2 flex-1">
              {calendarDays.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const outsideMonth = !isSameMonth(day, currentMonth);
                const isSelected = selectedDate === dayStr;
                const isToday = isSameDay(day, new Date());

                // Informações calculadas para este dia
                const alaOfDay = getAlaForDate(day);
                const alaPointColorClass = getAlaColor(alaOfDay);
                const alaLightColorClass = getAlaLightColor(alaOfDay);

                // Militares da Ala no dia
                const dayAlaMilitars = (militars || []).filter(
                  (m) => normalizeAlaField(m.ala) === normalizeAlaField(`ALA ${alaOfDay}`)
                );

                // Afastamentos ativos no dia
                const dayAfastamentos = (afastamentos || []).filter((a: any) => {
                  if (dayStr < a.inicio || dayStr > a.retorno) return false;
                  const mil = (militars || []).find((m: any) => normalizeRg(m.rg) === normalizeRg(a.rg));
                  const effAla = normalizeAlaField(a.ala || mil?.ala);
                  return effAla === normalizeAlaField(`ALA ${alaOfDay}`);
                });

                // Permutas no dia
                const dayPermutas = (permutas || []).filter((p: any) => {
                  const pDate = p.date || p.data;
                  return pDate === dayStr && (p.status === 'APROVADA' || !p.status);
                });

                // Expediente no dia
                const exp24hCount = Object.entries(monthExpedienteData.selections || {}).filter(
                  ([rg, days]) =>
                    rg !== 'ESCALANTE_PREF' && Array.isArray(days) && days.includes(dayStr)
                ).length;

                const expAdminCount = Object.entries(monthExpedienteData.expedienteDays || {}).filter(
                  ([rg, days]) =>
                    rg !== 'ESCALANTE_PREF' && Array.isArray(days) && days.includes(dayStr)
                ).length;

                // Vagas / Preferências do Escalante
                const prefDetails = monthExpedienteData.preferencesDetails?.[dayStr] || {};
                const totalVagas = Object.values(prefDetails).reduce(
                  (sum: number, qt: any) => sum + (typeof qt === 'number' ? qt : Number(qt || 1)),
                  0
                );

                // Efetivo total do dia
                const efetivoBase = Math.max(0, dayAlaMilitars.length - dayAfastamentos.length);
                const totalEfetivoDia = efetivoBase + exp24hCount;

                return (
                  <div
                    key={dayStr}
                    onClick={() => {
                      if (!outsideMonth) {
                        onSelectDate(dayStr);
                      }
                    }}
                    className={cn(
                      'relative flex flex-col p-1.5 sm:p-2 rounded-xl transition-all min-h-[95px] sm:min-h-[110px] md:min-h-[120px] select-none border-2',
                      outsideMonth
                        ? 'opacity-25 bg-slate-50 border-transparent cursor-default pointer-events-none'
                        : isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-md ring-2 ring-indigo-400/40 z-10 cursor-pointer'
                        : cn(
                            alaLightColorClass,
                            'border-transparent hover:border-indigo-300 shadow-2xs hover:shadow-xs cursor-pointer'
                          ),
                      isToday && !isSelected && 'ring-2 ring-indigo-400 ring-offset-1'
                    )}
                  >
                    {/* CABEÇALHO DA CÉLULA: DIA, PONTO DA ALA E CHECK DE SELEÇÃO */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'text-xs sm:text-sm font-black',
                            isSelected ? 'text-indigo-900 font-extrabold' : 'text-slate-700'
                          )}
                        >
                          {format(day, 'd')}
                        </span>
                        {!outsideMonth && (
                          <div
                            className={cn('w-2 h-2 rounded-full shrink-0', alaPointColorClass)}
                            title={`Ala ${alaOfDay}`}
                          />
                        )}
                      </div>

                      {/* Ícone de check se selecionado (idêntico à imagem de referência) */}
                      {!outsideMonth && isSelected && (
                        <div className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* CORPO DA CÉLULA: TAGS INFORMATIVAS (ALA, EFETIVO, EXPEDIENTE, AFASTAMENTOS) */}
                    {!outsideMonth && (
                      <div className="flex flex-col gap-1 mt-auto">
                        {/* TAG DA ALA */}
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider bg-white/90 border border-slate-200/80 text-slate-700 shadow-2xs truncate">
                            ALA {alaOfDay}
                          </span>

                          {/* TAG DE QUANTIDADE TOTAL DE MILITARES */}
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded text-[8px] sm:text-[8.5px] font-black uppercase tracking-wider shadow-2xs truncate',
                              totalEfetivoDia > 0
                                ? 'bg-slate-800 text-white'
                                : 'bg-slate-200 text-slate-600'
                            )}
                            title={`Total de Efetivo: ${totalEfetivoDia} militares`}
                          >
                            {totalEfetivoDia} Mil.
                          </span>
                        </div>

                        {/* TAGS INFORMATIVAS COMPLEMENTARES */}
                        <div className="flex items-center gap-1 flex-wrap">
                          {/* Tag Expediente */}
                          {(exp24hCount > 0 || expAdminCount > 0) && (
                            <span
                              className="px-1 py-0.2 rounded text-[7.5px] sm:text-[8px] font-bold bg-sky-100 text-sky-800 border border-sky-200"
                              title={`${exp24hCount} em 24h / ${expAdminCount} administrativo`}
                            >
                              EXP:{exp24hCount + expAdminCount}
                            </span>
                          )}

                          {/* Tag Afastamentos */}
                          {dayAfastamentos.length > 0 && (
                            <span
                              className="px-1 py-0.2 rounded text-[7.5px] sm:text-[8px] font-bold bg-rose-100 text-rose-800 border border-rose-200"
                              title={`${dayAfastamentos.length} militar(es) afastado(s)`}
                            >
                              AFAST:{dayAfastamentos.length}
                            </span>
                          )}

                          {/* Tag Permutas */}
                          {dayPermutas.length > 0 && (
                            <span
                              className="px-1 py-0.2 rounded text-[7.5px] sm:text-[8px] font-bold bg-amber-100 text-amber-800 border border-amber-200"
                              title={`${dayPermutas.length} permuta(s) autorizada(s)`}
                            >
                              PERM:{dayPermutas.length}
                            </span>
                          )}

                          {/* Tag Necessidades Prioritárias */}
                          {totalVagas > 0 && (
                            <span
                              className="px-1 py-0.2 rounded text-[7.5px] sm:text-[8px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"
                              title={`${totalVagas} vagas prioritárias cadastradas`}
                            >
                              ★{totalVagas}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* PAINEL DE INTELIGÊNCIA RESUMIDA DO DIA PARA O ESCALANTE (LADO DIREITO) */}
          <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-4 shrink-0">
            {/* CARD PRINCIPAL DO PLANTÃO SELECIONADO */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 text-white shadow-md border border-slate-800 flex flex-col gap-3 relative overflow-hidden">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
                    Plantão Selecionado
                  </span>
                  <h3 className="text-sm sm:text-base font-black uppercase text-white mt-0.5">
                    {format(selectedDateObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </h3>
                  <div className="text-[10px] text-slate-300 font-bold uppercase tracking-wider mt-0.5">
                    {format(selectedDateObj, 'EEEE', { locale: ptBR })}
                  </div>
                </div>

                <span
                  className={cn(
                    'px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm border',
                    getAlaLightColor(selectedAlaNumber)
                  )}
                >
                  {selectedAlaStr}
                </span>
              </div>

              {/* STATUS DE SINCRONIZAÇÃO DA ESCALA */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px]">
                <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Sincronizado na Escala 24h
                </span>
                <span className="text-indigo-300 font-black uppercase font-mono">
                  {selectedDayIntelligence.totalGeral} Efetivo Total
                </span>
              </div>
            </div>

            {/* MÉTRICAS RÁPIDAS DE EFETIVO (GRID 2x2) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-indigo-500" /> Operacional 24h
                </span>
                <span className="text-lg font-black text-slate-800 mt-1">
                  {selectedDayIntelligence.totalOperacional}
                </span>
                <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                  Militares na Prontidão
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <BriefcaseBusiness className="w-3 h-3 text-sky-500" /> Expediente
                </span>
                <span className="text-lg font-black text-slate-800 mt-1">
                  {selectedDayIntelligence.totalExpediente}
                </span>
                <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                  Reforço / Administrativo
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-rose-500" /> Afastamentos
                </span>
                <span className="text-lg font-black text-rose-600 mt-1">
                  {selectedDayIntelligence.activeAfastamentos.length}
                </span>
                <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                  Férias / Licenças na Ala
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <Users className="w-3 h-3 text-amber-500" /> Permutas
                </span>
                <span className="text-lg font-black text-amber-600 mt-1">
                  {selectedDayIntelligence.permutasAtivas.length}
                </span>
                <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                  Autorizadas no Plantão
                </span>
              </div>
            </div>

            {/* CONEXÃO DE OFICIAIS DO PLANTÃO */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                Oficiais Escalados no Dia
              </span>
              <div className="flex flex-col gap-1.5 text-xs">
                {/* Oficial de Dia */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Award className="w-3 h-3 text-amber-500" /> Of. de Dia:
                  </span>
                  <span className="font-black text-slate-800 text-[11px] truncate max-w-[160px] uppercase">
                    {oficialDiaValue || (
                      <span className="text-slate-400 font-bold text-[10px] italic">Não Definido</span>
                    )}
                  </span>
                </div>

                {/* Núcleo Náutico */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Anchor className="w-3 h-3 text-cyan-500" /> Náutico:
                  </span>
                  <span className="font-black text-slate-800 text-[11px] truncate max-w-[160px] uppercase">
                    {nauticoOficialValue || (
                      <span className="text-slate-400 font-bold text-[10px] italic">Não Definido</span>
                    )}
                  </span>
                </div>

                {/* Oficial Médico */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Stethoscope className="w-3 h-3 text-rose-500" /> Médico:
                  </span>
                  <span className="font-black text-slate-800 text-[11px] truncate max-w-[160px] uppercase">
                    {medicoOficialValue || (
                      <span className="text-slate-400 font-bold text-[10px] italic">Não Definido</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* PRONTIDÃO DE FUNÇÕES CRÍTICAS (CONDUTORES, RESGATISTAS, COMBATE) */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <Truck className="w-3.5 h-3.5 text-indigo-500" />
                Prontidão Operacional (Quant_Militares1)
              </span>

              <div className="flex flex-col gap-2">
                {/* Motoristas */}
                <div>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase">
                    <span className="text-slate-600">Condutores / Motoristas</span>
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded font-mono',
                        selectedDayIntelligence.countMotoristas >= selectedDayIntelligence.reqMotoristas
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      )}
                    >
                      {selectedDayIntelligence.countMotoristas} / {selectedDayIntelligence.reqMotoristas || '2'}
                    </span>
                  </div>
                </div>

                {/* Resgatistas */}
                <div>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase">
                    <span className="text-slate-600">Resgate / Socorristas</span>
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded font-mono',
                        selectedDayIntelligence.countResgatistas >= selectedDayIntelligence.reqResgatistas
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      )}
                    >
                      {selectedDayIntelligence.countResgatistas} / {selectedDayIntelligence.reqResgatistas || '3'}
                    </span>
                  </div>
                </div>

                {/* Combate a Incêndio */}
                <div>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase">
                    <span className="text-slate-600">Combate a Incêndio</span>
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded font-mono',
                        selectedDayIntelligence.countCombate >= selectedDayIntelligence.reqCombate
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      )}
                    >
                      {selectedDayIntelligence.countCombate} / {selectedDayIntelligence.reqCombate || '4'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ALERTAS INTELIGENTES DO ESCALANTE */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Inteligência da Escala 24h
              </span>

              <div className="flex flex-col gap-1.5">
                {selectedDayIntelligence.alerts.length === 0 ? (
                  <div className="text-[10px] text-slate-500 italic">
                    Nenhum alerta crítico para esta escala.
                  </div>
                ) : (
                  selectedDayIntelligence.alerts.map((al, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'p-2 rounded-lg text-[10px] font-bold flex items-start gap-1.5 border leading-tight',
                        al.type === 'ok'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : al.type === 'warning'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      )}
                    >
                      {al.type === 'ok' ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <span>{al.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
