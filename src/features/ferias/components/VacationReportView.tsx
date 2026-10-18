import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Search,
} from 'lucide-react';
import { cn, normalizeRg } from '../../../lib/utils';
import { parseRank, sortRanks } from '../../../lib/rankUtils';
import { RankInsignia } from '../../../components/RankInsignia';
import { MultiSelectFilter } from '../../../components/ui/MultiSelectFilter';
import { VacationStats } from '../../../components/VacationStats';
import { exportToExcel } from '../../../lib/exportUtils';
import { UserProfile } from '../../../types';

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

export interface VacationReportViewProps {
  filteredMilitarsReport: UserProfile[];
  allPreferences: Record<string, any>;
  reportYear: string;
  setReportYear: (y: string) => void;
  reportSearch: string;
  setReportSearch: (s: string) => void;
  isNavMenuExpanded: boolean;
  setIsNavMenuExpanded: (expanded: boolean) => void;
  uniqueRanks: string[];
  uniqueObms: string[];
  uniqueAlas: string[];
  filterPostoGrad: string[];
  setFilterPostoGrad: (val: string[]) => void;
  filterObm: string[];
  setFilterObm: (val: string[]) => void;
  filterAla: string[];
  setFilterAla: (val: string[]) => void;
  filterStatus: string[];
  setFilterStatus: (val: string[]) => void;
  loading: boolean;
  isSadMode?: boolean;
  onGrantMonth: (rg: string, month: string) => void;
}

export function VacationReportView({
  filteredMilitarsReport,
  allPreferences,
  reportYear,
  setReportYear,
  reportSearch,
  setReportSearch,
  isNavMenuExpanded,
  setIsNavMenuExpanded,
  uniqueRanks,
  uniqueObms,
  uniqueAlas,
  filterPostoGrad,
  setFilterPostoGrad,
  filterObm,
  setFilterObm,
  filterAla,
  setFilterAla,
  filterStatus,
  setFilterStatus,
  loading,
  isSadMode = false,
  onGrantMonth,
}: VacationReportViewProps) {
  const handleExport = () => {
    const exportData = filteredMilitarsReport.map((m) => {
      const data: any = allPreferences[normalizeRg(m.rg)] || {};
      const prefs =
        data.preferences?.[reportYear] ||
        (reportYear === '2026' ? data.months : []) ||
        [];
      const granted = data.granted?.[reportYear] || '-';
      return {
        Militar: `${parseRank(m.rank)} ${m.name}`,
        RG: m.rg,
        'Mês 1': prefs[0] || '-',
        'Mês 2': prefs[1] || '-',
        'Mês 3': prefs[2] || '-',
        'Mês Concedido': granted,
        Contagem: prefs.length,
      };
    });
    exportToExcel(
      exportData,
      `Consolidado_Preferencias_${reportYear}`,
      'Preferencias_Ferias_SAD'
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border-2 border-slate-50 shadow-sm overflow-visible flex flex-col">
        <div className="p-6 sm:p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/50 gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsNavMenuExpanded(!isNavMenuExpanded)}
              className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm shrink-0"
              title={
                isNavMenuExpanded
                  ? 'Minimizar Navegador'
                  : 'Maximizar Navegador'
              }
            >
              {isNavMenuExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight">
                Relatório Consolidado de Preferências
              </h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Lista completa de militares e seus meses de preferência para o escalonamento SAD
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="w-full sm:w-auto px-6 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="sm:hidden">Exportar</span>
              <span className="hidden sm:inline">Exportar Filtrados</span>
            </button>
          </div>
        </div>

        {isNavMenuExpanded && (
          <div className="p-6 sm:p-8 border-b border-slate-50 space-y-6">
            <VacationStats
              militars={filteredMilitarsReport}
              allPreferences={allPreferences}
              reportYear={reportYear}
            />
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 transition-all focus-within:border-indigo-200">
              <Search className="w-6 h-6 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por nome, guerra ou RG..."
                className="bg-transparent outline-none flex-1 text-xs font-bold uppercase tracking-widest text-slate-700"
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
              />
              <div className="w-px h-6 bg-slate-200 mx-2 hidden sm:block"></div>
              <select
                value={reportYear}
                onChange={(e) => setReportYear(e.target.value)}
                className="bg-white border-2 border-slate-200 text-indigo-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
              >
                <option value="2026">Ano 2026</option>
                <option value="2027">Ano 2027</option>
                <option value="2028">Ano 2028</option>
                <option value="2029">Ano 2029</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MultiSelectFilter
                label="Posto/Grad"
                options={uniqueRanks.sort(sortRanks)}
                selected={filterPostoGrad}
                onChange={setFilterPostoGrad}
              />
              <MultiSelectFilter
                label="OBM"
                options={uniqueObms.sort()}
                selected={filterObm}
                onChange={setFilterObm}
              />
              <MultiSelectFilter
                label="Ala"
                options={uniqueAlas.sort()}
                selected={filterAla}
                onChange={setFilterAla}
              />
              <MultiSelectFilter
                label="Status SAD"
                options={['COMPLETO', 'PARCIAL', 'PENDENTE']}
                selected={filterStatus}
                onChange={setFilterStatus}
              />
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/20">
                <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  Militar
                </th>
                <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  RG
                </th>
                <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  Opc 1
                </th>
                <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  Opc 2
                </th>
                <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  Opc 3
                </th>
                <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-center">
                  Status
                </th>
                <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-center">
                  Mês Concedido
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-20 text-center text-[10px] font-black text-slate-300 uppercase animate-pulse"
                  >
                    Cruzando dados de preferências...
                  </td>
                </tr>
              ) : filteredMilitarsReport.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="p-20 text-center text-[10px] font-black text-slate-300 uppercase"
                  >
                    Nenhum militar encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredMilitarsReport.map((m) => {
                  const rg = normalizeRg(m.rg);
                  const data: any = allPreferences[rg] || {};
                  const prefs =
                    data.preferences?.[reportYear] ||
                    (reportYear === '2026' ? data.months : []) ||
                    [];
                  const granted = data.granted?.[reportYear] || '';
                  const isComplete = prefs.length === 3;

                  return (
                    <tr
                      key={m.rg}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="shrink-0 w-8 flex justify-center">
                            <RankInsignia rankStr={parseRank(m.rank)} />
                          </div>
                          <div className="flex flex-col leading-tight">
                            <div className="text-[11px] font-black text-slate-800 uppercase">
                              {parseRank(m.rank)}
                            </div>
                            <div className="text-[14px] font-black text-indigo-600 uppercase tracking-tight">
                              {m.warName || m.name}
                            </div>
                            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">
                              {m.obm}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-[10px] font-bold text-slate-500 font-mono tracking-widest">
                          {m.rg}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {prefs[0] ? (
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border',
                              granted === prefs[0]
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                            )}
                          >
                            {prefs[0]}
                          </span>
                        ) : (
                          <span className="text-slate-200 text-[10px]">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {prefs[1] ? (
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border',
                              granted === prefs[1]
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                            )}
                          >
                            {prefs[1]}
                          </span>
                        ) : (
                          <span className="text-slate-200 text-[10px]">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {prefs[2] ? (
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border',
                              granted === prefs[2]
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                            )}
                          >
                            {prefs[2]}
                          </span>
                        ) : (
                          <span className="text-slate-200 text-[10px]">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {prefs.length > 0 ? (
                          <div
                            className={cn(
                              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border',
                              isComplete
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                : 'bg-amber-50 text-amber-600 border-amber-100'
                            )}
                          >
                            <div
                              className={cn(
                                'w-1.5 h-1.5 rounded-full',
                                isComplete
                                  ? 'bg-emerald-500'
                                  : 'bg-amber-500'
                              )}
                            ></div>
                            {isComplete
                              ? 'Completo'
                              : `${prefs.length}/3`}
                          </div>
                        ) : (
                          <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {isSadMode ? (
                          <select
                            value={granted}
                            onChange={(e) =>
                              onGrantMonth(m.rg, e.target.value)
                            }
                            className={cn(
                              'px-2 py-1.5 border rounded-lg text-[9px] font-black uppercase tracking-widest outline-none transition-colors',
                              granted
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-200'
                            )}
                          >
                            <option value="">- Conceder -</option>
                            {MONTHS.map((mo) => (
                              <option key={mo} value={mo}>
                                {mo} {prefs.includes(mo) ? '★' : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500">
                            {granted || '-'}
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
      </div>
    </div>
  );
}
