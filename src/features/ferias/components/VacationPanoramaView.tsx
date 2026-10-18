import React from 'react';
import { Loader2, Search, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { cn, normalizeRg } from '../../../lib/utils';
import { RankInsignia } from '../../../components/RankInsignia';
import { exportToExcel } from '../../../lib/exportUtils';
import { PanoramaData, PanoramaRow } from '../types';

export interface VacationPanoramaViewProps {
  panoramaData: PanoramaData;
  loadingPanorama: boolean;
  panoramaSearch: string;
  setPanoramaSearch: (val: string) => void;
  panoramaObmFilter: string;
  setPanoramaObmFilter: (val: string) => void;
  panoramaStatusFilter: 'PENDENTES' | 'REGULARIZADOS' | 'VALIDADOS';
  setPanoramaStatusFilter: (val: 'PENDENTES' | 'REGULARIZADOS' | 'VALIDADOS') => void;
  panoramaSortMode: 'dias' | 'graduacao';
  setPanoramaSortMode: (val: 'dias' | 'graduacao') => void;
  panoramaValidations: Record<string, any>;
  onOpenValidationModal: (rg: string, name: string) => void;
}

export function VacationPanoramaView({
  panoramaData,
  loadingPanorama,
  panoramaSearch,
  setPanoramaSearch,
  panoramaObmFilter,
  setPanoramaObmFilter,
  panoramaStatusFilter,
  setPanoramaStatusFilter,
  panoramaSortMode,
  setPanoramaSortMode,
  panoramaValidations,
  onOpenValidationModal,
}: VacationPanoramaViewProps) {
  if (loadingPanorama) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-12 h-12 text-orange-400 mx-auto animate-spin mb-4" />
        <div className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
          Sintetizando Histórico de Férias Global
        </div>
      </div>
    );
  }

  const renderPanoramaTable = (rows: PanoramaRow[], typeLabel: string) => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/20">
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                Militar
              </th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-center">
                Carreira (Est.)
              </th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                Lapsos de Registro (0 dias)
              </th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                Saldos Parciais Pendentes
              </th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-center">
                Dias a Cumprir
              </th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-center">
                Validação
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-16 text-center text-[10px] font-black text-slate-400 uppercase"
                >
                  Nenhuma pendência para {typeLabel}.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isVal = panoramaValidations[normalizeRg(row.militar.rg)];
                return (
                  <tr
                    key={row.militar.rg}
                    className="hover:bg-slate-50/50 transition-colors"
                    id={`panorama-row-${row.militar.rg}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="shrink-0 w-8 flex justify-center">
                          <RankInsignia rankStr={row.militar.rank} />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                            {row.militar.rank}
                          </div>
                          <div className="text-xs font-black text-slate-800 uppercase leading-none">
                            {row.militar.warName || row.militar.name}
                          </div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            RG: {row.militar.rg} • {row.militar.obm}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-[9px] font-black px-2 py-1 bg-slate-100 text-slate-500 rounded uppercase">
                        {new Date().getFullYear() - row.startYear} anos ({row.startYear})
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {row.missingYears.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {row.missingYears.map((y) => (
                            <span
                              key={y}
                              className="text-[8px] font-black bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100"
                            >
                              {y}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {row.pendingBalances.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {row.pendingBalances.map((p) => (
                            <span
                              key={p.year}
                              className="text-[8px] font-black bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100"
                            >
                              {p.year} ({p.days}d)
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={cn(
                          "text-sm font-black px-3 py-1 rounded-lg border inline-block min-w-[3rem]",
                          row.totalPendingDays > 100
                            ? "bg-red-50 text-red-600 border-red-200"
                            : row.totalPendingDays > 50
                              ? "bg-orange-50 text-orange-600 border-orange-200"
                              : "bg-indigo-50 text-indigo-600 border-indigo-200"
                        )}
                      >
                        {row.totalPendingDays}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isVal ? (
                        <div className="flex flex-col items-center">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mb-0.5" />
                          <span className="text-[8px] font-black uppercase text-emerald-600 leading-tight">
                            Validado<br />
                            {isVal.validatorName || isVal.validatorRg}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            onOpenValidationModal(row.militar.rg, row.militar.warName || row.militar.name);
                          }}
                          className="px-3 py-1 text-[9px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded uppercase tracking-wider transition-colors"
                        >
                          Validar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-sm flex flex-col justify-center">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
            Total de Dias Pendentes (Geral)
          </h3>
          <div className="text-5xl font-black text-red-500 tracking-tighter">
            {(
              panoramaData.oficiais.reduce((acc, row) => acc + row.totalPendingDays, 0) +
              panoramaData.pracas.reduce((acc, row) => acc + row.totalPendingDays, 0)
            ).toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-sm flex flex-col justify-center">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
            Militares c/ Alta Pendência (&gt;60 dias)
          </h3>
          <div className="text-5xl font-black text-orange-500 tracking-tighter">
            {
              panoramaData.oficiais.filter((r) => r.totalPendingDays > 60).length +
              panoramaData.pracas.filter((r) => r.totalPendingDays > 60).length
            }
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-sm flex flex-col justify-center">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
            Anos de Lapsos Totais Registrados
          </h3>
          <div className="text-5xl font-black text-indigo-500 tracking-tighter">
            {
              panoramaData.oficiais.reduce((acc, row) => acc + row.missingYears.length, 0) +
              panoramaData.pracas.reduce((acc, row) => acc + row.missingYears.length, 0)
            }
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-sm overflow-visible flex flex-col">
        <div className="p-6 sm:p-8 border-b border-slate-50 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              Panorama Global SAD
            </h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Visão geral sobre férias atrasadas, organizadas pelas maiores pendências
            </p>
          </div>
          <button
            onClick={() => {
              const combined = [...panoramaData.oficiais, ...panoramaData.pracas].sort((a, b) => b.totalPendingDays - a.totalPendingDays);
              const exportData = combined.map((row) => ({
                Militar: `${row.militar.rank} ${row.militar.name}`,
                RG: row.militar.rg,
                'Admissão Estimada': row.startYear,
                'Lapsos (Anos Sem Registro)': row.missingYears.join(', '),
                'Saldos Parciais': row.pendingBalances.map((p) => `${p.year} (${p.days}d)`).join('; '),
                'Total Dias Pendentes': row.totalPendingDays,
              }));
              exportToExcel(exportData, 'Panorama_Global_SAD', 'PanoramaGlobalSAD');
            }}
            className="px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
          >
            <FileSpreadsheet className="w-4 h-4" /> Exportar Planilha
          </button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:px-8 bg-slate-50 border-b border-slate-100">
          <div className="flex flex-col gap-2 flex-1">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Filtrar por OBM:</span>
            <div className="flex flex-wrap gap-1.5">
              {['TODAS', '10º GBM', '2/10', '3/10', '4/10', '1/26', '26º GBM'].map((obm) => (
                <button
                  key={obm}
                  onClick={() => setPanoramaObmFilter(obm)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border',
                    panoramaObmFilter === obm
                      ? 'bg-orange-600 border-orange-600 text-white shadow-md shadow-orange-200/50 scale-[1.02]'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  )}
                >
                  {obm}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome ou RG..."
              value={panoramaSearch}
              onChange={(e) => setPanoramaSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-slate-700 outline-none focus:border-orange-400 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="p-4 sm:px-8 bg-white border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setPanoramaStatusFilter('PENDENTES')}
              className={cn(
                'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border',
                panoramaStatusFilter === 'PENDENTES' ? 'bg-amber-100 border-amber-200 text-amber-800 shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-50'
              )}
            >
              Pendentes
            </button>
            <button
              onClick={() => setPanoramaStatusFilter('REGULARIZADOS')}
              className={cn(
                'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border',
                panoramaStatusFilter === 'REGULARIZADOS' ? 'bg-emerald-100 border-emerald-200 text-emerald-800 shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-50'
              )}
            >
              Regularizados
            </button>
            <button
              onClick={() => setPanoramaStatusFilter('VALIDADOS')}
              className={cn(
                'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border',
                panoramaStatusFilter === 'VALIDADOS' ? 'bg-blue-100 border-blue-200 text-blue-800 shadow-sm' : 'bg-white text-slate-500 hover:bg-slate-50'
              )}
            >
              Validados
            </button>
          </div>
          
          {panoramaStatusFilter === 'PENDENTES' && (
            <div className="flex gap-2 items-center">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Ordenar por:</span>
              <button
                onClick={() => setPanoramaSortMode('dias')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border',
                  panoramaSortMode === 'dias' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white text-slate-500 hover:bg-slate-50'
                )}
              >
                Maior Pendência
              </button>
              <button
                onClick={() => setPanoramaSortMode('graduacao')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border',
                  panoramaSortMode === 'graduacao' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white text-slate-500 hover:bg-slate-50'
                )}
              >
                Graduação
              </button>
            </div>
          )}
        </div>

        {(() => {
          const displayOficiais = panoramaStatusFilter === 'PENDENTES' ? panoramaData.oficiais : panoramaStatusFilter === 'REGULARIZADOS' ? panoramaData.regularizadosOficiais : panoramaData.validadosOficiais;
          const displayPracas = panoramaStatusFilter === 'PENDENTES' ? panoramaData.pracas : panoramaStatusFilter === 'REGULARIZADOS' ? panoramaData.regularizadosPracas : panoramaData.validadosPracas;

          return (
            <>
              {/* OFICIAIS Section */}
              <div className="border-b-4 border-slate-100">
                <div className="p-6 sm:p-8 bg-slate-50/30 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-6 bg-orange-600 rounded-full"></div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      OFICIAIS ({displayOficiais.length})
                    </h4>
                  </div>
                </div>
                {renderPanoramaTable(displayOficiais, 'Oficiais')}
              </div>

              {/* PRAÇAS Section */}
              <div>
                <div className="p-6 sm:p-8 bg-slate-50/30 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-6 bg-indigo-600 rounded-full"></div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                      PRAÇAS ({displayPracas.length})
                    </h4>
                  </div>
                </div>
                {renderPanoramaTable(displayPracas, 'Praças')}
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
