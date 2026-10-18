import React from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileJson,
  FileSpreadsheet,
  Filter,
  Loader2,
  X,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { UserProfile, Vacation } from '../../../types';
import { GroupedVacationYear } from '../types';

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export interface VacationIndividualViewProps {
  selectedMilitar: UserProfile;
  vacations: Vacation[];
  activeYear: string;
  userGrantedMonths: Record<string, string>;
  userGrantedMonth: string | null;
  isSubmitted: boolean;
  preferencesEnabled: boolean;
  userPrefs: string[];
  savingPrefs: boolean;
  isPowerUser: boolean;
  toggleGlobalPreferences: () => void;
  toggleMonthPreference: (month: string) => void;
  handleInitiateSubmit: () => void;
  showConfirmDialog: boolean;
  setShowConfirmDialog: (open: boolean) => void;
  handleSubmitPreferences: () => void;
  showHiddenAsseguradas: boolean;
  setShowHiddenAsseguradas: (val: boolean) => void;
  handleExportExcel: () => void;
  missingYears: number[];
  pendingYears: { year: number; pending: number }[];
  loading: boolean;
  groupedVacations: GroupedVacationYear[];
  expandedYears: Record<string, boolean>;
  toggleYearGroup: (anoRef: string) => void;
  deleteVacation: (id: string) => void;
}

export function VacationIndividualView({
  selectedMilitar,
  vacations,
  activeYear,
  userGrantedMonths,
  userGrantedMonth,
  isSubmitted,
  preferencesEnabled,
  userPrefs,
  savingPrefs,
  isPowerUser,
  toggleGlobalPreferences,
  toggleMonthPreference,
  handleInitiateSubmit,
  showConfirmDialog,
  setShowConfirmDialog,
  handleSubmitPreferences,
  showHiddenAsseguradas,
  setShowHiddenAsseguradas,
  handleExportExcel,
  missingYears,
  pendingYears,
  loading,
  groupedVacations,
  expandedYears,
  toggleYearGroup,
  deleteVacation,
}: VacationIndividualViewProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
      {/* Sidebar Stats */}
      <div className="xl:col-span-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-6">
        <div className="bg-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-xl relative overflow-visible flex flex-col items-center justify-center text-center">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-600/20 rounded-full blur-3xl"></div>
          <h3 className="text-orange-400 font-black text-[10px] sm:text-xs uppercase tracking-[0.3em] mb-4">
            Resumo Anual
          </h3>
          <div className="flex items-center justify-center gap-6 w-full">
            <div className="flex-1 flex flex-col items-center">
              <div className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Total Dias Tirados
              </div>
              <div className="text-3xl sm:text-4xl font-black tracking-tighter">
                {vacations.reduce(
                  (acc, v) => acc + (v.diasGozados || 0),
                  0
                )}
              </div>
            </div>
            <div className="w-px h-12 sm:h-16 bg-white/10 shrink-0"></div>
            <div className="flex-1 flex flex-col items-center">
              <div className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Total Saldo a Tirar
              </div>
              <div className="text-3xl sm:text-4xl font-black tracking-tighter text-orange-500">
                {vacations.reduce((acc, v) => acc + (v.diasAGozar || 0), 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Próximos Afastamentos */}
        <div className="bg-white rounded-2xl p-5 border-2 border-slate-50 shadow-sm">
          <h3 className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
            Próximos Afastamentos
          </h3>
          <div className="space-y-3">
            {vacations.filter((v) => v.status === 'marcado').length > 0 || isSubmitted || userGrantedMonth ? (
              <>
                {vacations
                  .filter((v) => v.status === 'marcado')
                  .map((v) => {
                    const isCurrentActiveYear = v.anoRef === activeYear;
                    const isGranted = isCurrentActiveYear ? !!userGrantedMonths[v.anoRef || ''] : true;
                    
                    return (
                      <div
                        key={v.id}
                        className={cn('px-4 py-2 rounded-xl border flex items-center justify-between gap-4', isGranted ? 'bg-orange-50 border-orange-100' : 'bg-indigo-50 border-indigo-100')}
                      >
                        <div className="flex flex-col">
                          <div className={cn('text-[9px] font-black uppercase', isGranted ? 'text-orange-600' : 'text-indigo-600')}>
                            Ref: {v.anoRef}
                          </div>
                          <div className={cn('text-[8px] font-bold uppercase tracking-widest', isGranted ? 'text-orange-400' : 'text-amber-500')}>
                            {isCurrentActiveYear ? (isGranted ? 'Confirmado Escalonamento' : 'A Decidir') : 'Confirmado'}
                          </div>
                        </div>
                        <div className="text-xs font-black text-slate-800 uppercase text-right">
                          {isCurrentActiveYear 
                            ? (isGranted ? `MÊS: ${userGrantedMonths[v.anoRef || '']}` : 'A DEFINIR')
                            : v.dataInicio}
                        </div>
                      </div>
                    );
                  })}
                {!vacations.some(v => v.status === 'marcado' && v.anoRef === activeYear) && (isSubmitted || userGrantedMonth) && (
                  <div className={cn('px-4 py-2 rounded-xl border flex items-center justify-between gap-4', userGrantedMonth ? 'bg-emerald-50 border-emerald-100' : 'bg-indigo-50 border-indigo-100')}>
                    <div className="flex flex-col">
                      <div className={cn('text-[9px] font-black uppercase', userGrantedMonth ? 'text-emerald-600' : 'text-indigo-600')}>
                        Ref: {activeYear}
                      </div>
                      <div className={cn('text-[8px] font-bold uppercase tracking-widest', userGrantedMonth ? 'text-emerald-500' : 'text-amber-500')}>
                        {userGrantedMonth ? 'Confirmado Escalonamento' : 'A Decidir'}
                      </div>
                    </div>
                    <div className="text-xs font-black text-slate-800 uppercase text-right">
                      {userGrantedMonth ? `Mês: ${userGrantedMonth}` : 'A Definir'}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-[10px] font-black text-slate-300 uppercase text-center py-4">
                Nenhum agendamento
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Content Area */}
      <div className="xl:col-span-3 space-y-8">
        {/* Preferences Section - Always visible but controlled */}
        <div
          className={cn(
            'bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 border-2 border-dashed shadow-sm relative group overflow-visible transition-all',
            preferencesEnabled
              ? 'border-indigo-200'
              : 'border-slate-100 opacity-80'
          )}
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Calendar className="w-16 h-16 text-indigo-600" />
          </div>

          <div className="flex items-center justify-between mb-2">
            <h3
              className={cn(
                'font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2',
                preferencesEnabled ? 'text-indigo-600' : 'text-slate-400'
              )}
            >
              Escalonamento de Férias {activeYear}
              {savingPrefs && (
                <Loader2 className="w-3 h-3 animate-spin mx-2" />
              )}
              {!preferencesEnabled && (
                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[8px]">
                  Período Encerrado
                </span>
              )}
            </h3>
            {isPowerUser && (
              <button
                onClick={toggleGlobalPreferences}
                className="text-[9px] font-bold text-indigo-600 hover:underline uppercase tracking-widest"
              >
                {preferencesEnabled ? 'Encerrar Coleta' : 'Abrir Coleta'}
              </button>
            )}
          </div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-6">
            {preferencesEnabled
              ? 'Escolha 3 meses de sua preferência para gozo de férias (Sincronizado com SAD)'
              : 'A escolha de meses está temporariamente desativada pelo administrador.'}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
            {MONTHS.map((month) => {
              const isSelected = userPrefs.includes(month);
              const selIndex = userPrefs.indexOf(month);
              const canSelect = preferencesEnabled || isPowerUser;
              const isDisabled =
                isSubmitted ||
                (!isSelected && userPrefs.length >= 3 && !isPowerUser);

              return (
                <button
                  key={month}
                  onClick={() => toggleMonthPreference(month)}
                  disabled={isDisabled || !canSelect}
                  className={cn(
                    'py-2.5 px-3 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all flex items-center justify-between border-2',
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                      : 'bg-white text-slate-500 border-slate-50 hover:border-indigo-100'
                  )}
                >
                  {month}
                  {isSelected && (
                    <span className="flex items-center gap-1">
                      <span className="text-[8px] opacity-80">
                        {selIndex + 1}º Opção
                      </span>
                      <CheckCircle2 className="w-3 h-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {preferencesEnabled &&
            !isSubmitted &&
            userPrefs.length === 3 && (
              <div className="mt-6 flex flex-col items-end">
                <button
                  onClick={handleInitiateSubmit}
                  disabled={savingPrefs}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-100 disabled:opacity-50"
                >
                  {savingPrefs ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Confirmar e Enviar Opções
                </button>
                
                {showConfirmDialog && (
                  <div className="fixed z-50 inset-0 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowConfirmDialog(false)} />
                    <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full relative z-10 shadow-2xl border-2 border-indigo-50 animate-in fade-in zoom-in-95 duration-200">
                       <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter">Confirmar Envio</h3>
                       <p className="text-sm text-slate-500 mb-6 leading-relaxed font-medium">Após enviar, será necessário solicitar ao administrador caso queira alterar as suas opções. Deseja continuar?</p>
                       <div className="flex items-center gap-3 w-full">
                         <button 
                           onClick={() => setShowConfirmDialog(false)}
                           className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
                         >
                           Cancelar
                         </button>
                         <button 
                           onClick={handleSubmitPreferences}
                           className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
                         >
                           Sim, Enviar
                         </button>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          {isSubmitted && (
            <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Suas opções foram enviadas e estão bloqueadas para alteração.
              </span>
            </div>
          )}
        </div>

        {/* History Table */}
        <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-sm overflow-visible flex flex-col">
          <div className="p-6 sm:p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/50 gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                Histórico de Férias (DGP)
              </h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Registros oficiais sincronizados via DGP (Diretoria Geral de Pessoal)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setShowHiddenAsseguradas(!showHiddenAsseguradas)
                }
                className={cn(
                  'flex-1 sm:flex-none px-4 py-2 border rounded-xl flex items-center justify-center gap-2 transition-colors text-[10px] font-black uppercase tracking-widest',
                  showHiddenAsseguradas
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                )}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">
                  Asseguradas Ocultas
                </span>
                <span className="sm:hidden">Ass. Ocultas</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="flex-1 sm:flex-none px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors text-[10px] font-black uppercase tracking-widest px-4"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar Planilha</span>
                <span className="sm:hidden">Excel</span>
              </button>
              <button className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Report Header */}
          {vacations.length > 0 && (
            <div className="m-6 sm:m-8 p-6 bg-indigo-50/50 rounded-[2rem] border-2 border-indigo-100 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">
                  Relatório Analítico de Pendências
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Missing Years */}
                <div className="bg-white p-4 rounded-3xl shadow-sm border border-indigo-50">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">
                    Anos Faltantes (Lapsos)
                  </span>
                  {missingYears.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {missingYears.map((y) => (
                        <span
                          key={y}
                          className="px-3 py-1.5 bg-red-50 border border-red-100 text-red-600 text-[10px] font-black rounded-lg"
                        >
                          {y}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-[10px] font-black text-emerald-600 uppercase">
                        Nenhum lapso identificado
                      </span>
                    </div>
                  )}
                </div>
                {/* Pending balances */}
                <div className="bg-white p-4 rounded-3xl shadow-sm border border-indigo-50">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-3">
                    Anos com Saldo Pendente
                  </span>
                  {pendingYears.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {pendingYears.map((p) => (
                        <span
                          key={p.year}
                          className="px-3 py-1.5 bg-orange-50 border border-orange-100 text-orange-600 text-[10px] font-black rounded-lg"
                        >
                          {p.year} <span className="opacity-70 mx-1">•</span> {p.pending} dias
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-[10px] font-black text-emerald-600 uppercase">
                        Férias em dia
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/20">
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    Ano Ref.
                  </th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    Período
                  </th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    Dias Goz.
                  </th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    Saldo / Ass.
                  </th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    Boletim / OBS
                  </th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-20 text-center text-[10px] font-black text-slate-300 uppercase animate-pulse"
                    >
                      Carregando dados...
                    </td>
                  </tr>
                ) : groupedVacations.length > 0 ? (
                  groupedVacations.map((group) => {
                    const isExpanded = expandedYears[group.anoRef];
                    const v = group.items[0];
                    const dateParts = (v.dataInicio || '').split('/');
                    let displayStatus: string = v.status;
                    if (dateParts.length === 3) {
                      const d = new Date(
                        parseInt(dateParts[2], 10),
                        parseInt(dateParts[1], 10) - 1,
                        parseInt(dateParts[0], 10)
                      );
                      displayStatus = d > new Date() ? 'marcado' : 'gozado';
                    }
                    if (v.ato && v.ato.toUpperCase().includes('ASSEGURADAS')) {
                      displayStatus = 'asseguradas';
                    }

                    return (
                      <React.Fragment key={group.anoRef}>
                        <tr
                          onClick={() => toggleYearGroup(group.anoRef)}
                          className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-lg italic">
                                {group.anoRef}
                              </span>
                              {group.items.length > 1 && (
                                <span className="bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded-md text-[8px] font-black">
                                  +{group.items.length - 1} acts
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="text-xs font-black text-slate-800 uppercase tracking-tighter">
                              {v.dataInicio || '—'}{' '}
                              {v.dataRetorno && (
                                <>
                                  <span className="text-slate-300 mx-1">➜</span>{' '}
                                  {v.dataRetorno}
                                </>
                              )}
                            </div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                              {v.ato} (Mais recente)
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-700">
                                {group.totalGozados}
                              </span>
                              {group.totalGozados > 0 &&
                                group.totalGozados < 30 && (
                                  <span className="text-[8px] text-amber-500 font-bold">
                                    Parcial
                                  </span>
                                )}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div
                              className={cn(
                                'text-xs font-black',
                                group.pending > 0
                                  ? 'text-emerald-600'
                                  : 'text-slate-400'
                              )}
                            >
                              {group.pending}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="text-[10px] font-black text-slate-600 uppercase">
                              {v.boletim || '—'}
                            </div>
                            <div className="text-[8px] font-bold text-slate-300 uppercase leading-none mt-0.5">
                              {v.boletimOrigem}
                            </div>
                            {v.obs && (
                              <div
                                className="text-[9px] font-bold text-amber-600 uppercase leading-none mt-1 truncate max-w-xs"
                                title={v.obs}
                              >
                                {v.obs}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            <div
                              className={`
                                  inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest
                                  ${displayStatus === 'gozado' ? 'bg-emerald-50 text-emerald-600' : displayStatus === 'marcado' ? 'bg-indigo-50 text-indigo-600' : displayStatus === 'cancelado' ? 'bg-rose-50 text-rose-600' : displayStatus === 'interrompido' ? 'bg-orange-50 text-orange-600' : displayStatus === 'presumida' ? 'bg-slate-100 text-slate-600' : displayStatus === 'abono' ? 'bg-teal-50 text-teal-600' : 'bg-amber-50 text-amber-600'}
                               `}
                            >
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${displayStatus === 'gozado' ? 'bg-emerald-500' : displayStatus === 'marcado' ? 'bg-indigo-500' : displayStatus === 'cancelado' ? 'bg-rose-500' : displayStatus === 'interrompido' ? 'bg-orange-500' : displayStatus === 'presumida' ? 'bg-slate-400' : displayStatus === 'abono' ? 'bg-teal-500' : 'bg-amber-500'}`}
                              ></div>
                              {displayStatus}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-2 text-slate-400">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteVacation(v.id);
                                }}
                                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              {group.items.length > 1 ? (
                                isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )
                              ) : (
                                <div className="w-4 h-4"></div>
                              )}
                            </div>
                          </td>
                        </tr>

                        {isExpanded &&
                          group.items.length > 1 &&
                          group.items.slice(1).map((subV) => {
                            const sdParts = (subV.dataInicio || '').split('/');
                            let subStatus: string = subV.status;
                            if (sdParts.length === 3) {
                              const d = new Date(
                                parseInt(sdParts[2], 10),
                                parseInt(sdParts[1], 10) - 1,
                                parseInt(sdParts[0], 10)
                              );
                              subStatus = d > new Date() ? 'marcado' : 'gozado';
                            }
                            if (
                              subV.ato &&
                              subV.ato.toUpperCase().includes('ASSEGURADAS')
                            ) {
                              subStatus = 'asseguradas';
                            }

                            return (
                              <tr
                                key={subV.id}
                                className="bg-slate-50 border-t border-slate-100/50 group"
                              >
                                <td className="px-6 py-3"></td>
                                <td className="px-6 py-3">
                                  <div className="text-xs font-bold text-slate-600 uppercase tracking-tighter opacity-80">
                                    {subV.dataInicio || '—'}{' '}
                                    {subV.dataRetorno && (
                                      <>
                                        <span className="text-slate-300 mx-1">
                                          ➜
                                        </span>{' '}
                                        {subV.dataRetorno}
                                      </>
                                    )}
                                  </div>
                                  <div className="text-[9px] font-bold text-slate-400 uppercase">
                                    {subV.ato}
                                  </div>
                                </td>
                                <td className="px-6 py-3 text-xs font-bold text-slate-600 opacity-80">
                                  {subV.diasGozados}
                                </td>
                                <td className="px-6 py-3"></td>
                                <td className="px-6 py-3">
                                  <div className="text-[9px] font-black text-slate-500 uppercase">
                                    {subV.boletim || '—'}
                                  </div>
                                  <div className="text-[8px] font-bold text-slate-300 uppercase leading-none">
                                    {subV.boletimOrigem}
                                  </div>
                                  {subV.obs && (
                                    <div className="text-[8px] font-bold text-amber-600/80 uppercase leading-none mt-1 truncate max-w-xs">
                                      {subV.obs}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-3">
                                  <div
                                    className={`
                                      inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest
                                      ${subStatus === 'gozado' ? 'text-emerald-500' : subStatus === 'marcado' ? 'text-indigo-500' : 'text-amber-500'}
                                  `}
                                  >
                                    {subStatus}
                                  </div>
                                </td>
                                <td className="px-6 py-3 text-right">
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      deleteVacation(subV.id);
                                    }}
                                    className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-24 text-center">
                      <div className="max-w-xs mx-auto opacity-30">
                        <FileJson className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">
                          Sem Dados Sincronizados
                        </h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">
                          Clique em 'Sincronizar DGP' acima para importar o histórico deste militar.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
