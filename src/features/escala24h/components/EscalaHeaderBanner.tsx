import React from 'react';
import { 
  Calendar as CalendarIcon, CalendarRange, Users, ArrowRightLeft, 
  Shield, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, 
  Clock, Printer, UserPlus, Settings 
} from 'lucide-react';
import { format, parseISO, addDays, subDays, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, getAlaName } from '../../../lib/utils';
import { SorteioScope } from '../types';
import { SorteioActionBar } from '../../../components/SorteioActionBar';

export interface UpcomingDayItem {
  iso: string;
  label: string;
  dayNumber: string;
  alaNum: number;
}

export interface EscalaHeaderBannerProps {
  selectedDate: string;
  onSelectDate: (d: string) => void;
  identifiedAla: number | string;
  baseRosterCount: number;
  permutasCount: number;
  savingState: 'idle' | 'saving' | 'saved';
  onOpenPermutaModal: () => void;
  onOpenAddMilitar?: () => void;
  onOpenSorteio: (scope: SorteioScope) => void;
  onOpenPredefinicoes: () => void;
  onOpenConfigModal?: () => void;
  onLimparFuncoes: (scope: SorteioScope | 'tudo') => void;
  onGerarEscala: () => void;
  isDashboardExpanded: boolean;
  setIsDashboardExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  dashboardMonth: Date;
  setDashboardMonth: React.Dispatch<React.SetStateAction<Date>>;
  upcomingDays: UpcomingDayItem[];
  children?: React.ReactNode;
}

export function EscalaHeaderBanner({
  selectedDate,
  onSelectDate,
  identifiedAla,
  baseRosterCount,
  permutasCount,
  savingState,
  onOpenPermutaModal,
  onOpenAddMilitar,
  onOpenSorteio,
  onOpenPredefinicoes,
  onOpenConfigModal,
  onLimparFuncoes,
  onGerarEscala,
  isDashboardExpanded,
  setIsDashboardExpanded,
  dashboardMonth,
  setDashboardMonth,
  upcomingDays,
  children,
}: EscalaHeaderBannerProps) {
  return (
    <div className="bg-white dark:bg-[#141c2e] border-b border-slate-200 dark:border-slate-800 p-2.5 sm:p-3 shrink-0 flex flex-col gap-2 z-10 shadow-xs relative escala-header-banner">
      {/* LINHA 1: BANNER ESCURO DA ALA: Data da Escala, Controles < >, Ala em Serviço, Militares Base, Permutas e Nuvem */}
      <div className="w-full flex items-center flex-wrap xl:flex-nowrap justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl py-2 px-3 border border-slate-800 shadow-sm gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
        
        <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 sm:gap-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80">
          {/* Segmento: Data da Escala + Botões < > */}
          <div className="flex items-center gap-1.5 pr-1 sm:pr-2.5 shrink-0">
            <div className="bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 rounded-lg py-1 px-2.5 shadow-inner flex items-center gap-2 transition-colors">
              <div className="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <CalendarIcon className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[8.5px] font-black text-indigo-300 uppercase tracking-widest leading-none">
                  Data da Escala
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => onSelectDate(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs font-black text-white tracking-wider cursor-pointer mt-0.5 [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Setas de navegação rápida dia anterior / próximo */}
            <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700/80 shrink-0">
              <button
                type="button"
                onClick={() => {
                  try {
                    const prev = subDays(parseISO(selectedDate), 1);
                    onSelectDate(format(prev, "yyyy-MM-dd"));
                  } catch {}
                }}
                className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/80 transition-colors cursor-pointer"
                title="Dia anterior (-1d)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    const next = addDays(parseISO(selectedDate), 1);
                    onSelectDate(format(next, "yyyy-MM-dd"));
                  } catch {}
                }}
                className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/80 transition-colors cursor-pointer"
                title="Próximo dia (+1d)"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Segmento 1: Ala de Serviço com Insígnia e Cor */}
          <div className="flex items-center gap-2 pl-2.5 sm:pl-3 pr-1 sm:pr-2.5 shrink-0">
            <div
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shadow-sm shrink-0 transition-transform",
                identifiedAla === 1 && "bg-emerald-500 text-slate-950 shadow-emerald-500/30 ring-1 ring-emerald-400/40",
                identifiedAla === 2 && "bg-rose-500 text-white shadow-rose-500/30 ring-1 ring-rose-400/40",
                identifiedAla === 3 && "bg-sky-500 text-slate-950 shadow-sky-500/30 ring-1 ring-sky-400/40",
                identifiedAla === 4 && "bg-amber-400 text-slate-950 shadow-amber-400/30 ring-1 ring-amber-300/40",
                typeof identifiedAla !== "number" && "bg-slate-700 text-white"
              )}
            >
              <Shield className="w-4 h-4 fill-current/20" />
            </div>
            <div className="flex flex-col">
              <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 leading-none">
                Ala em Serviço
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs sm:text-sm font-black tracking-tight text-white uppercase font-mono">
                  {getAlaName(identifiedAla)}
                </span>
                <span
                  className={cn(
                    "text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest font-mono",
                    identifiedAla === 1 && "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
                    identifiedAla === 2 && "bg-rose-500/20 text-rose-300 border border-rose-500/30",
                    identifiedAla === 3 && "bg-sky-500/20 text-sky-300 border border-sky-500/30",
                    identifiedAla === 4 && "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  )}
                >
                  {identifiedAla === 1
                    ? "VERDE"
                    : identifiedAla === 2
                    ? "VERMELHA"
                    : identifiedAla === 3
                    ? "AZUL"
                    : identifiedAla === 4
                    ? "AMARELA"
                    : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Segmento 2: Militares na Ala Base */}
          <div className="flex items-center gap-2 pl-2.5 sm:pl-3 pr-1 sm:pr-2.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-300 shrink-0">
              <Users className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 leading-none">
                Militares na Ala Base
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs sm:text-sm font-black tracking-tight text-sky-300 font-mono">
                  {baseRosterCount}
                </span>
                <span className="text-[8.5px] font-bold text-slate-400 uppercase">
                  efetivo
                </span>
              </div>
            </div>
          </div>

          {/* Segmento 3: Quantidade de Permutas Solicitadas */}
          <div 
            className="flex items-center gap-2 pl-2.5 sm:pl-3 shrink-0"
            title={`Permutas para ${selectedDate ? selectedDate.split('-').reverse().join('/') : 'a data selecionada'}`}
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 leading-none">
                Permutas Solicitadas
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs sm:text-sm font-black tracking-tight text-emerald-400 font-mono">
                  {permutasCount}
                </span>
                <span
                  className={cn(
                    "text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest font-mono",
                    permutasCount > 0
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  )}
                >
                  {permutasCount === 1 ? "1 ativa" : `${permutasCount} ativas`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Nuvem */}
        <div className="flex items-center gap-1.5 pl-2 shrink-0">
          {savingState === "saving" && (
            <div className="flex items-center gap-1 text-amber-400 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
              <span className="text-[8.5px] font-bold uppercase tracking-widest">Salvando...</span>
            </div>
          )}
          {savingState === "saved" && (
            <div className="flex items-center gap-1 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span className="text-[8.5px] font-bold uppercase tracking-widest text-emerald-400">Salvo ✓</span>
            </div>
          )}
        </div>
      </div>

      {/* LINHA 2: Botões Operacionais à esquerda + Controles Unificados do Dashboard Mensal à direita */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center flex-wrap gap-2">
          {/* Botão Gerar Permuta */}
          <button
            type="button"
            onClick={onOpenPermutaModal}
            className="h-8 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider text-[10.5px] shadow-2xs hover:shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
            title="Abrir solicitação e gestão de permutas"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Gerar Permuta</span>
          </button>

          {/* Botão Adicionar Militar ao Servidor */}
          {onOpenAddMilitar && (
            <button
              type="button"
              onClick={onOpenAddMilitar}
              className="h-8 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider text-[10.5px] shadow-2xs hover:shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0 border border-blue-400/30"
              title="Cadastrar novo militar definitivamente no servidor e banco de dados"
            >
              <UserPlus className="w-3.5 h-3.5 text-blue-100" />
              <span>Adicionar Militar</span>
            </button>
          )}

          {/* Sorteio dividido (Viaturas | Administrativas | ⚙) + Limpar ▾ */}
          <SorteioActionBar
            onSortear={onOpenSorteio}
            onConfig={onOpenPredefinicoes}
            onLimpar={onLimparFuncoes}
          />

          {/* Botão de Engrenagem: Configurar Seções da Escala 24h */}
          {onOpenConfigModal && (
            <button
              type="button"
              onClick={onOpenConfigModal}
              className="h-8 px-2.5 sm:px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-black uppercase tracking-wider text-[10.5px] border border-slate-700 shadow-2xs hover:shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0 group ring-1 ring-slate-700/50"
              title="Configurar todas as seções da escala 24h (oficiais de dia, viaturas operacionais e administrativas)"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
              <span className="hidden sm:inline">Configurações</span>
              <span className="sm:hidden">Config</span>
            </button>
          )}

          {/* Botão Principal: Gerar Escala */}
          <button
            type="button"
            onClick={onGerarEscala}
            className="h-8 px-4 py-1 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 hover:from-indigo-500 hover:via-indigo-600 hover:to-slate-800 text-white font-black uppercase tracking-widest text-[10.5px] shadow-sm hover:shadow flex items-center justify-center gap-1.5 transition-all active:scale-95 ring-1 ring-indigo-500/20 cursor-pointer shrink-0"
            title="Gerar e Imprimir Escala de Serviço 24h"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-200" />
            <span>Gerar Escala</span>
          </button>
        </div>

        {/* Controles Unificados do Dashboard Mensal: Botão "DASHBOARD MENSAL v" + Seletor de Mês */}
        <div className="flex items-center gap-1.5 flex-wrap ml-auto">
          <button
            type="button"
            onClick={() => setIsDashboardExpanded((prev) => !prev)}
            className={cn(
              "h-8 px-3 py-1 rounded-lg font-black uppercase tracking-wider text-[10.5px] shadow-2xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0 border",
              isDashboardExpanded
                ? "bg-indigo-600 text-white border-indigo-500 ring-2 ring-indigo-500/20"
                : "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 hover:from-slate-800 hover:to-slate-800 text-white border-slate-800"
            )}
            title={isDashboardExpanded ? "Recolher Dashboard Mensal" : "Expandir Dashboard Mensal"}
          >
            <CalendarRange className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
            <span>DASHBOARD MENSAL</span>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-indigo-300 transition-transform duration-200 shrink-0",
                isDashboardExpanded && "rotate-180"
              )}
            />
          </button>

          {/* Seletor de Mês */}
          <div className="h-8 flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 shadow-2xs shrink-0">
            <button
              type="button"
              onClick={() => {
                setDashboardMonth((prev) => subMonths(prev, 1));
                if (!isDashboardExpanded) setIsDashboardExpanded(true);
              }}
              className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-[10px] font-black uppercase tracking-widest text-slate-100 min-w-[105px] text-center select-none font-mono">
              {format(dashboardMonth, "MMMM yyyy", { locale: ptBR })}
            </span>
            <button
              type="button"
              onClick={() => {
                setDashboardMonth((prev) => addMonths(prev, 1));
                if (!isDashboardExpanded) setIsDashboardExpanded(true);
              }}
              className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* LINHA 3: Faixa de Navegação Rápida com os Próximos Dias */}
      <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar max-w-full">
        <div className="flex items-center gap-1.5 text-slate-400 shrink-0 pr-1">
          <Clock className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Próximos Dias:
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {upcomingDays.map((item) => {
            const isSelected = item.iso === selectedDate;
            return (
              <button
                key={item.iso}
                type="button"
                onClick={() => onSelectDate(item.iso)}
                className={cn(
                  "px-2.5 py-1 rounded-xl flex flex-col items-center justify-center gap-0.5 border transition-all cursor-pointer active:scale-95 shrink-0 min-w-[74px]",
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs ring-1 ring-indigo-400/40"
                    : "bg-slate-50 dark:bg-slate-800/80 hover:bg-indigo-50/50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500"
                )}
                title={`Ir para ${item.label} (${item.dayNumber}) - Ala ${item.alaNum}`}
              >
                <span
                  className={cn(
                    "text-[8px] font-black uppercase tracking-wider leading-none",
                    isSelected ? "text-indigo-200" : "text-slate-400 dark:text-slate-400"
                  )}
                >
                  {item.label}
                </span>
                <div className="flex items-center gap-1.5 leading-none mt-0.5">
                  <span
                    className={cn(
                      "text-[11px] font-black font-mono",
                      isSelected ? "text-white" : "text-slate-800 dark:text-slate-100"
                    )}
                  >
                    {item.dayNumber}
                  </span>
                  <span
                    className={cn(
                      "text-[8px] font-black font-mono px-1 py-0.2 rounded",
                      item.alaNum === 1 && "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300",
                      item.alaNum === 2 && "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300",
                      item.alaNum === 3 && "bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300",
                      item.alaNum === 4 && "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                    )}
                  >
                    A{item.alaNum}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}
