import React from 'react';
import { format, addMonths, subMonths, addWeeks, subWeeks, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarRange, Columns, Copy, CheckCircle2, Printer } from 'lucide-react';
import { cn, formatMilitaryName } from '../../../lib/utils';
import { UserProfile } from '../../../types';
import { DayStatusResult } from '../types';

interface ExpedienteReportsViewProps {
  reportType: 'mensal' | 'semanal';
  setReportType: (t: 'mensal' | 'semanal') => void;
  currentMonth: Date;
  setCurrentMonth: React.Dispatch<React.SetStateAction<Date>>;
  selectedWeekMonday: Date;
  setSelectedWeekMonday: React.Dispatch<React.SetStateAction<Date>>;
  weekDays: Date[];
  selectedObm: string;
  expedienteUsers: UserProfile[];
  getSector: (rg: string) => string;
  getRegimeDisplay: (rg: string) => string;
  getServicosOrdinariosDisplay: (u: UserProfile) => string;
  getDayStatus: (rg: string, dayStr: string) => DayStatusResult;
  handleCycleWeeklyStatus: (rg: string, dayStr: string) => void;
  handleCopyTables: () => void;
  copyStatus: boolean;
  isAdmin: boolean;
  isEscalante: boolean;
}

export function ExpedienteReportsView({
  reportType,
  setReportType,
  currentMonth,
  setCurrentMonth,
  selectedWeekMonday,
  setSelectedWeekMonday,
  weekDays,
  selectedObm,
  expedienteUsers,
  getSector,
  getRegimeDisplay,
  getServicosOrdinariosDisplay,
  getDayStatus,
  handleCycleWeeklyStatus,
  handleCopyTables,
  copyStatus,
  isAdmin,
  isEscalante
}: ExpedienteReportsViewProps) {
  const effectiveUsers = expedienteUsers.filter(u => (u.rg || u.uid) !== 'ESCALANTE_PREF');

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Barra Superior de Ações e Sub-Abas */}
      <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-4 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          {/* Alternador de Sub-Aba: Mensal vs Semanal */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setReportType('mensal')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer",
                reportType === 'mensal' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Escala Mensal</span>
            </button>
            <button
              type="button"
              onClick={() => setReportType('semanal')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer",
                reportType === 'semanal' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Escala Semanal</span>
            </button>
          </div>

          {/* Navegação de Mês (Relatório Mensal) */}
          {reportType === 'mensal' ? (
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1.5 hover:bg-white rounded-md transition-colors text-slate-600 hover:text-slate-900 cursor-pointer"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-black uppercase text-slate-700 tracking-wider min-w-[140px] text-center select-none">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1.5 hover:bg-white rounded-md transition-colors text-slate-600 hover:text-slate-900 cursor-pointer"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Navegação de Semana (Relatório Semanal) */
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedWeekMonday(subWeeks(selectedWeekMonday, 1))}
                  className="p-1.5 hover:bg-white rounded-md transition-colors text-slate-600 hover:text-slate-900 cursor-pointer"
                  title="Semana Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 text-xs font-black uppercase text-slate-700 tracking-wider min-w-[170px] text-center select-none">
                  {format(weekDays[0], 'dd/MM')} a {format(weekDays[4], 'dd/MM/yyyy')}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedWeekMonday(addWeeks(selectedWeekMonday, 1))}
                  className="p-1.5 hover:bg-white rounded-md transition-colors text-slate-600 hover:text-slate-900 cursor-pointer"
                  title="Próxima Semana"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedWeekMonday(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                  className="px-2.5 py-1 rounded hover:bg-white text-slate-600 font-bold transition-colors cursor-pointer"
                  title="Ir para a Semana Atual"
                >
                  Semana Atual
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedWeekMonday(startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 }))}
                  className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                  title="Ir para a Próxima Semana (a publicar)"
                >
                  Próxima Semana
                </button>
              </div>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-slate-600 text-xs font-bold">
            <span>Total no Efetivo: <strong className="text-indigo-700">{effectiveUsers.length}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyTables}
            className="px-3.5 py-2 rounded-lg border-2 text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-2 bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer shadow-sm"
            title="Copiar tabela formatada para colar no Word / LibreOffice"
          >
            {copyStatus ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
            <span>{copyStatus ? 'Copiado!' : 'Copiar Tabela'}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-sm"
            title="Imprimir relatório da escala"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Folha do Relatório Oficial */}
      <div 
        id="relatorios-container" 
        className="bg-white rounded-xl border-2 border-slate-300 shadow-md p-6 sm:p-10 w-full max-w-5xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none"
      >
        {reportType === 'mensal' ? (
          <>
            {/* Cabeçalho CBMERJ / CBA VII / OBM - Relatório Mensal */}
            <div data-report-header="true" className="text-center font-bold font-sans text-xs sm:text-sm leading-relaxed uppercase text-black mb-6 select-text">
              <p>CORPO DE BOMBEIROS MILITAR DO ESTADO DO RIO DE JANEIRO</p>
              <p>COMANDO DE ÁREA DE BOMBEIRO-MILITAR VII - COSTA VERDE</p>
              <p>{selectedObm.toLowerCase().includes('10') ? 'GRUPAMENTO DE BOMBEIRO MILITAR-ANGRA DOS REIS' : selectedObm.toUpperCase()}</p>
              <p className="mt-5 font-black text-sm sm:text-base tracking-wide border-b-2 border-black pb-3">
                ESCALA DE EXPEDIENTE DO MÊS DE {format(currentMonth, 'MMMM', { locale: ptBR }).toUpperCase()} DE {format(currentMonth, 'yyyy')}
              </p>
            </div>

            {/* Tabela Mensal de 5 Colunas */}
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse border-2 border-black text-black font-sans text-xs sm:text-sm select-text">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-black text-black font-black uppercase text-center">
                    <th className="border border-black py-2.5 px-3 text-center tracking-wider w-[24%]">NOME</th>
                    <th className="border border-black py-2.5 px-2 text-center tracking-wider w-[12%]">RG</th>
                    <th className="border border-black py-2.5 px-2 text-center tracking-wider w-[12%]">FUNÇÃO</th>
                    <th className="border border-black py-2.5 px-3 text-center tracking-wider w-[26%]">REGIME</th>
                    <th className="border border-black py-2.5 px-3 text-center tracking-wider w-[26%]">SERVIÇOS ORDINÁRIOS</th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="border border-black py-8 text-center text-slate-500 italic text-xs">
                        Nenhum militar cadastrado no expediente para esta OBM neste mês.
                      </td>
                    </tr>
                  ) : (
                    effectiveUsers.map((u) => {
                      const rg = u.rg || u.uid || '';
                      const nome = formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name);
                      const funcao = getSector(rg) || (u.specializations && u.specializations.length > 0 ? u.specializations[0] : '') || u.officerRole || '';
                      const regime = getRegimeDisplay(rg);
                      const servicos = getServicosOrdinariosDisplay(u);

                      return (
                        <tr key={rg} className="hover:bg-slate-50 transition-colors">
                          <td className="border border-black py-2 px-3 text-center font-bold">
                            {nome}
                          </td>
                          <td className="border border-black py-2 px-2 text-center font-medium">
                            {rg}
                          </td>
                          <td className="border border-black py-2 px-2 text-center font-bold">
                            {funcao}
                          </td>
                          <td className="border border-black py-2 px-3 text-center">
                            {regime}
                          </td>
                          <td className="border border-black py-2 px-3 text-center font-bold">
                            {servicos}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            {/* Cabeçalho CBMERJ / CBA VII / OBM - Escala Semanal de Expediente */}
            <div data-report-header="true" className="text-center font-bold font-sans text-xs sm:text-sm leading-relaxed uppercase text-black mb-6 select-text">
              <p>CORPO DE BOMBEIROS MILITAR DO ESTADO DO RIO DE JANEIRO</p>
              <p>COMANDO DE ÁREA DE BOMBEIRO-MILITAR VII - COSTA VERDE</p>
              <p>{selectedObm.toLowerCase().includes('10') ? 'GRUPAMENTO DE BOMBEIRO MILITAR-ANGRA DOS REIS' : selectedObm.toUpperCase()}</p>
              <p className="mt-5 font-black text-sm sm:text-base tracking-wide border-b-2 border-black pb-3">
                ESCALA SEMANAL DE EXPEDIENTE
              </p>
            </div>

            {/* Tabela Semanal de Segunda a Sexta */}
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse border-2 border-black text-black font-sans text-xs sm:text-sm select-text">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-black text-black font-black uppercase text-center">
                    <th className="border border-black py-2.5 px-3 text-center tracking-wider w-[22%]">NOME</th>
                    <th className="border border-black py-2.5 px-2 text-center tracking-wider w-[10%]">RG</th>
                    {weekDays.map((day, idx) => {
                      const dayNames = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA'];
                      return (
                        <th key={idx} className="border border-black py-2.5 px-2 text-center tracking-wider w-[13.6%]">
                          {dayNames[idx]} {format(day, 'dd/MM')}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {effectiveUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border border-black py-8 text-center text-slate-500 italic text-xs">
                        Nenhum militar cadastrado no expediente para esta OBM.
                      </td>
                    </tr>
                  ) : (
                    effectiveUsers.map((u) => {
                      const rg = u.rg || u.uid || '';
                      const nome = formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name);

                      return (
                        <tr key={rg} className="hover:bg-slate-50 transition-colors">
                          <td className="border border-black py-2 px-3 text-center font-bold">
                            {nome}
                          </td>
                          <td className="border border-black py-2 px-2 text-center font-medium">
                            {rg}
                          </td>
                          {weekDays.map((day, dIdx) => {
                            const dayStr = format(day, 'yyyy-MM-dd');
                            const cell = getDayStatus(rg, dayStr);
                            const canEdit = isAdmin || isEscalante;

                            return (
                              <td
                                key={dIdx}
                                onClick={() => canEdit && handleCycleWeeklyStatus(rg, dayStr)}
                                className={cn(
                                  "border border-black py-2 px-1 text-center font-bold transition-colors select-none",
                                  canEdit && "cursor-pointer hover:bg-slate-100",
                                  cell.type === 'servico' && (cell.isPermuta ? "bg-purple-100/90 text-purple-950 font-black border-purple-300" : "bg-slate-100 font-black"),
                                  cell.type === 'folga' && (cell.isPermuta ? "text-purple-700 bg-purple-50/50 font-semibold" : "text-slate-600 font-semibold"),
                                  cell.type === 'expediente' && "font-black",
                                  cell.type === 'afastamento' && "bg-orange-50/70 text-orange-900"
                                )}
                                title={canEdit ? (cell.isPermuta ? cell.text : "Clique para alternar: EXPEDIENTE -> SERVIÇO -> FOLGA") : (cell.isPermuta ? cell.text : undefined)}
                              >
                                {cell.isPermuta && cell.type === 'servico' ? (
                                  <div className="flex flex-col items-center justify-center leading-tight">
                                    <span>SERVIÇO</span>
                                    <span className="text-[9px] font-black text-purple-700 uppercase tracking-tighter">
                                      ({cell.text === 'PERMUTA PENDENTE' ? 'PENDENTE' : cell.text === 'PERMUTA DEFERIDA' ? 'DEFERIDA' : 'PERMUTA'})
                                    </span>
                                  </div>
                                ) : (
                                  cell.text
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
