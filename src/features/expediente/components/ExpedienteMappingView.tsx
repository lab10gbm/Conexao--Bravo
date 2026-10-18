import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Map as MapIcon,
  Table,
  List,
  Columns,
  ArrowUpDown,
  CheckCircle2,
  Copy,
  CalendarRange,
  Shield
} from 'lucide-react';
import { cn, formatMilitaryName } from '../../../lib/utils';
import { UserProfile } from '../../../types';
import { ExpedienteData, Afastamento } from '../types';

interface ExpedienteMappingViewProps {
  mapeamentoSubView: 'table' | 'lista' | 'escala_sv';
  setMapeamentoSubView: (v: 'table' | 'lista' | 'escala_sv') => void;
  transposeTable: boolean;
  setTransposeTable: (v: boolean) => void;
  handleCopyTables: () => void;
  copyStatus: boolean;
  handleAutoFillExp: () => void;
  autoExpStatus: boolean;
  isAdmin: boolean;
  user: UserProfile;
  expedienteUsers: UserProfile[];
  currentMonthDays: Date[];
  data: ExpedienteData;
  activeRg: string | null;
  afastamentos: Afastamento[];
  getReqAmount: (rg: string) => number;
  getExpQuota: (rg: string) => number;
  updateExpQuota: (rg: string, quota: number) => Promise<void>;
  handleCycleCellStatus: (rg: string, dayStr: string) => Promise<void>;
}

export function ExpedienteMappingView({
  mapeamentoSubView,
  setMapeamentoSubView,
  transposeTable,
  setTransposeTable,
  handleCopyTables,
  copyStatus,
  handleAutoFillExp,
  autoExpStatus,
  isAdmin,
  user,
  expedienteUsers,
  currentMonthDays,
  data,
  activeRg,
  afastamentos,
  getReqAmount,
  getExpQuota,
  updateExpQuota,
  handleCycleCellStatus
}: ExpedienteMappingViewProps) {
  const safeArr = (val: any) => (Array.isArray(val) ? val : []);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Sub-navegação interna de Mapeamento */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border-2 border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-1 flex items-center gap-1.5">
            <MapIcon className="w-3.5 h-3.5 text-indigo-600" /> Modo:
          </span>
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setMapeamentoSubView('table')}
              className={cn(
                "px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer",
                mapeamentoSubView === 'table' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Table className="w-3.5 h-3.5" /> <span>Tabela</span>
            </button>
            <button
              type="button"
              onClick={() => setMapeamentoSubView('lista')}
              className={cn(
                "px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer",
                mapeamentoSubView === 'lista' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <List className="w-3.5 h-3.5" /> <span>Lista</span>
            </button>
            <button
              type="button"
              onClick={() => setMapeamentoSubView('escala_sv')}
              className={cn(
                "px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer",
                mapeamentoSubView === 'escala_sv' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Columns className="w-3.5 h-3.5" /> <span>Escala SV</span>
            </button>
          </div>
        </div>

        {/* Ações contextuais de acordo com o sub-modo ativo */}
        <div className="flex flex-wrap items-center gap-2">
          {mapeamentoSubView === 'table' && (
            <button
              type="button"
              onClick={() => setTransposeTable(!transposeTable)}
              className={cn(
                "px-3 py-1.5 rounded-lg border-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 cursor-pointer",
                transposeTable ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
              )}
              title="Inverter Linhas e Colunas da Tabela"
            >
              <ArrowUpDown className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Inverter Tabela</span><span className="sm:hidden">Inverter</span>
            </button>
          )}

          {(mapeamentoSubView === 'escala_sv' || mapeamentoSubView === 'table') && (
            <button
              type="button"
              onClick={handleCopyTables}
              className="px-3 py-1.5 rounded-lg border-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 shrink-0 cursor-pointer"
              title={mapeamentoSubView === 'escala_sv' ? "Copiar Escala SV formatada" : "Copiar Tabela formatada"}
            >
              {copyStatus ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />} 
              <span>{copyStatus ? 'Copiado!' : mapeamentoSubView === 'escala_sv' ? 'Copiar Escala' : 'Copiar Tabela'}</span>
            </button>
          )}

          {(mapeamentoSubView === 'escala_sv' || mapeamentoSubView === 'table') && (isAdmin || user.isEscalante) && (
            <button
              type="button"
              onClick={handleAutoFillExp}
              className={cn(
                "px-3 py-1.5 rounded-lg border-2 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer",
                autoExpStatus ? "bg-green-50 border-green-200 text-green-700" : "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
              )}
              title="Preencher Dias de Expediente Automaticamente"
            >
              {autoExpStatus ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <CalendarRange className="w-3.5 h-3.5" />}
              <span>{autoExpStatus ? 'Preenchido' : 'Auto EXP'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Renderização do sub-modo ativo */}
      {mapeamentoSubView === 'table' ? (
        <div id="table-view-container" className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-x-auto custom-scrollbar">
          {transposeTable ? (
            <table className="w-full text-left border-collapse min-w-[max-content]">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-500">
                  <th className="py-2 px-4 sticky left-0 z-30 bg-slate-100 border-r-2 border-slate-200 text-[10px] font-black uppercase tracking-widest min-w-[70px] shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)]">
                    Dia
                  </th>
                  {expedienteUsers.map(u => {
                    const rg = u.rg || u.uid || '';
                    const isEscalantePref = rg === 'ESCALANTE_PREF';

                    return (
                      <th
                        key={rg}
                        className={cn(
                          "py-2 px-3 border-r-2 border-slate-200 text-[10px] font-black uppercase text-center min-w-[90px] xl:min-w-[120px]",
                          isEscalantePref ? "bg-red-50 text-red-700" : ""
                        )}
                      >
                        {isEscalantePref ? (
                          <div className="flex flex-col items-center gap-1">
                            <span>PREF.</span>
                            <span className="text-red-600 font-bold text-[9px] normal-case bg-red-100 px-1.5 py-0.5 rounded">
                              {safeArr(data.selections[rg]).length} dias
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="truncate max-w-[120px]">
                              {formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name)}
                            </span>
                            <span className={cn(
                              "text-[9px] normal-case px-1.5 py-0.5 rounded font-bold",
                              safeArr(data.selections[rg]).length >= getReqAmount(rg) && getReqAmount(rg) > 0
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            )}>
                              {safeArr(data.selections[rg]).length} / {getReqAmount(rg) || '?'} SV
                            </span>
                            {getExpQuota(rg) > 0 && (
                              <span className="text-[8px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-1 rounded">
                                {getExpQuota(rg)} EXP/sem
                              </span>
                            )}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {currentMonthDays.map((day, i) => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const isPreferredDate = safeArr(data.selections['ESCALANTE_PREF']).includes(dayStr);
                  const isEven = i % 2 === 0;

                  return (
                    <tr
                      key={dayStr}
                      className={cn(
                        "border-b border-slate-100 transition-colors hover:bg-slate-200/50",
                        isWeekend ? "bg-orange-50/80 hover:bg-orange-100/80" : "",
                        isPreferredDate ? "bg-red-50/50 hover:bg-red-100/50" : ""
                      )}
                    >
                      <td className={cn(
                        "py-2 px-3 sticky left-0 z-20 border-r-2 border-slate-200 text-[11px] sm:text-[12px] font-black shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)]",
                        isWeekend ? "bg-orange-100 text-orange-950 border-r-orange-300" :
                        isPreferredDate ? "bg-red-100 text-red-900 border-r-red-300" :
                        isEven ? "bg-slate-100 text-slate-800" : "bg-white text-slate-800"
                      )}>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className={cn(
                              "text-[9px] font-black uppercase leading-none mb-0.5",
                              isPreferredDate ? "text-red-500" :
                              isWeekend ? "text-orange-800" : "text-slate-400"
                            )}>
                              {format(day, 'eee', { locale: ptBR }).slice(0, 3)}
                            </span>
                            <span className={cn(
                              isPreferredDate ? "text-red-700" :
                              isWeekend ? "text-orange-950 font-black" : ""
                            )}>
                              {format(day, 'd')}
                            </span>
                          </div>
                          {isPreferredDate && <span className="text-red-500 text-[14px]">★</span>}
                        </div>
                      </td>

                      {expedienteUsers.map(u => {
                        const rg = u.rg || u.uid || '';
                        const isEscalantePref = rg === 'ESCALANTE_PREF';
                        const userSels = safeArr(data.selections[rg]);
                        const isSelected = userSels.includes(dayStr);
                        const isExp = safeArr(data.expedienteDays?.[rg]).includes(dayStr);
                        const isGrd = !isEscalantePref && data.grdData?.[dayStr]?.includes(rg);
                        const isTargetUser = activeRg === rg;
                        const canEdit = isAdmin || user.isEscalante || isTargetUser;

                        const isSwapDay = !isEscalantePref && data.swapRequests?.some(
                          r => r.rg === rg && r.status === 'pending' && (r.fromDay === dayStr || r.toDay === dayStr)
                        );

                        const afastamentoAtivo = !isEscalantePref && afastamentos.find(
                          a => a.rg === rg && dayStr >= a.inicio && dayStr <= a.retorno
                        );
                        const cellCanEdit = canEdit && !afastamentoAtivo;

                        return (
                          <td
                            key={`${dayStr}-${rg}`}
                            onClick={() => {
                              if (cellCanEdit) {
                                handleCycleCellStatus(rg, dayStr);
                              }
                            }}
                            className={cn(
                              "py-1 px-1 border-r text-center relative select-none group",
                              isPreferredDate && !isSelected && !isEscalantePref ? "bg-red-50/70 border-r-red-100" : "",
                              isWeekend && !isPreferredDate ? "bg-orange-100/50 hover:bg-orange-200/50 border-r-orange-200/50" : "border-r-slate-100",
                              isSwapDay ? "bg-orange-100 border-orange-300 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.4)]" : "",
                              isGrd && !afastamentoAtivo ? "bg-emerald-50/50" : "",
                              cellCanEdit ? "cursor-pointer hover:bg-indigo-200 hover:shadow-inner" : "cursor-default hover:bg-slate-100",
                              afastamentoAtivo && "bg-orange-100/80 cursor-not-allowed"
                            )}
                          >
                            {afastamentoAtivo ? (
                              <div className="mx-auto w-[90%] h-5 sm:h-6 px-0.5 rounded flex items-center justify-center bg-orange-100 text-orange-700 border border-orange-200 shadow-sm relative overflow-hidden" title={afastamentoAtivo.situacao}>
                                <span className="text-[7px] font-black leading-none uppercase truncate">{afastamentoAtivo.situacao}</span>
                              </div>
                            ) : (
                              <>
                                {isSelected && (
                                  <div className={cn(
                                    "mx-auto w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center shadow-sm relative",
                                    isEscalantePref ? "bg-red-500 text-white border border-red-600 shadow-red-200" :
                                    isSwapDay ? "bg-orange-500 text-white shadow-orange-200 border border-orange-600 animate-pulse" :
                                    isTargetUser ? "bg-indigo-500 text-white" : "bg-slate-600 text-white"
                                  )}>
                                    <span className={cn("text-[10px] font-black leading-none pt-[1px]", isEscalantePref && "text-white")}>
                                      {isEscalantePref ? '★' : 'X'}
                                    </span>
                                  </div>
                                )}
                                {isExp && (
                                  <div className="mx-auto w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm relative">
                                    <span className="text-[8px] font-black leading-none">EXP</span>
                                  </div>
                                )}
                                {isGrd && !isSelected && !isExp && (
                                  <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none group-hover:opacity-20 transition-opacity">
                                    <span data-no-copy="true" className="text-[8px] font-black text-emerald-600 bg-emerald-100/50 px-1 rounded border border-emerald-200 shadow-sm">GRD</span>
                                  </div>
                                )}
                              </>
                            )}
                            {!isSelected && !isExp && isSwapDay && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-80">
                                <ArrowUpDown className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                              </div>
                            )}
                            {isPreferredDate && !isSelected && !isEscalantePref && !isSwapDay && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                                <span className="text-[14px] text-red-500">★</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse min-w-[max-content]">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-500">
                  <th className="py-2 px-3 sticky left-0 z-30 bg-slate-100 border-r-2 border-slate-200 text-[10px] font-black uppercase tracking-widest min-w-[150px] shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)]">
                    Militar
                  </th>
                  <th className="py-2 px-3 border-r-2 border-slate-200 text-[10px] font-black uppercase text-center min-w-[60px]">
                    Total
                  </th>
                  {currentMonthDays.map(day => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    const isPreferredDate = safeArr(data.selections['ESCALANTE_PREF']).includes(dayStr);
                    return (
                      <th
                        key={day.toISOString()}
                        className={cn(
                          "py-2 px-1 border-r text-center min-w-[32px] sm:min-w-[40px] text-[10px] font-black transition-colors",
                          isWeekend ? "bg-orange-200 text-orange-950 border-r-orange-300 border-b-2 border-b-orange-400" : "bg-slate-50 border-r-slate-200 text-slate-500",
                          isPreferredDate ? "bg-red-50/80 border-red-200 text-red-700 shadow-[inset_0_-2px_0_rgba(239,68,68,0.3)]" : ""
                        )}
                      >
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-[8px] font-black uppercase leading-none mb-0.5",
                            isPreferredDate ? "text-red-500" :
                            isWeekend ? "text-orange-800" : "text-slate-400"
                          )}>
                            {format(day, 'eee', { locale: ptBR }).slice(0, 3)}
                          </span>
                          <span className={cn(
                            "text-[10px] sm:text-[11px] font-black",
                            isPreferredDate ? "text-red-700" :
                            isWeekend ? "text-orange-950" : ""
                          )}>
                            {format(day, 'd')}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {expedienteUsers.map((u, i) => {
                  const rg = u.rg || u.uid || '';
                  const isEscalantePref = rg === 'ESCALANTE_PREF';
                  const userSels = safeArr(data.selections[rg]);
                  const reqAmount = getReqAmount(rg);
                  const isTargetUser = activeRg === rg;
                  const canEdit = isAdmin || user.isEscalante || isTargetUser;
                  const isEven = i % 2 === 0;

                  return (
                    <tr
                      key={rg}
                      className={cn(
                        "border-b border-slate-100 transition-colors hover:bg-slate-200/50",
                        isEscalantePref ? "bg-red-50/50 hover:bg-red-100/50" : ""
                      )}
                    >
                      <td className={cn(
                        "py-2 px-3 sticky left-0 z-20 border-r-2 border-slate-200 text-[10px] sm:text-[11px] font-black truncate max-w-[200px] shadow-[3px_0_6px_-2px_rgba(0,0,0,0.15)]",
                        isEscalantePref ? "bg-red-100 text-red-900" :
                        isTargetUser ? "bg-indigo-100 text-indigo-950" :
                        isEven ? "bg-slate-100 text-slate-800" : "bg-white text-slate-800"
                      )}>
                        {isEscalantePref ? '🌟 PREFERÊNCIAS (ESCALANTE)' : formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name)}
                      </td>
                      <td className={cn(
                        "py-2 px-3 border-r-2 border-slate-200 text-[10px] font-black text-center whitespace-nowrap",
                        isEven && !isTargetUser && !isEscalantePref ? "bg-slate-50/50" : ""
                      )}>
                        {isEscalantePref ? (
                          <span className="text-red-600 font-bold">{userSels.length} d</span>
                        ) : (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={cn(
                              userSels.length >= reqAmount && reqAmount > 0 ? "text-green-600 font-black" : "text-amber-600 font-black"
                            )}>
                              {userSels.length} / {reqAmount || '?'} SV
                            </span>
                            {getExpQuota(rg) > 0 && (
                              <span className="text-[8px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1 rounded">
                                {getExpQuota(rg)} EXP/sem
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      {currentMonthDays.map(day => {
                        const dayStr = format(day, 'yyyy-MM-dd');
                        const isSelected = userSels.includes(dayStr);
                        const isExp = safeArr(data.expedienteDays?.[rg]).includes(dayStr);
                        const isGrd = !isEscalantePref && data.grdData?.[dayStr]?.includes(rg);
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        const isPreferredDate = !isEscalantePref && safeArr(data.selections['ESCALANTE_PREF']).includes(dayStr);
                        const isSwapDay = !isEscalantePref && data.swapRequests?.some(
                          r => r.rg === rg && r.status === 'pending' && (r.fromDay === dayStr || r.toDay === dayStr)
                        );

                        const afastamentoAtivo = !isEscalantePref && afastamentos.find(
                          a => a.rg === rg && dayStr >= a.inicio && dayStr <= a.retorno
                        );
                        const cellCanEdit = canEdit && !afastamentoAtivo;

                        return (
                          <td
                            key={dayStr}
                            onClick={() => {
                              if (cellCanEdit) {
                                handleCycleCellStatus(rg, dayStr);
                              }
                            }}
                            className={cn(
                              "py-1 px-1 border-r text-center relative max-w-[40px] select-none group",
                              isPreferredDate && !isSelected ? "bg-red-50/70 border-r-red-100" :
                              isWeekend && !isPreferredDate ? "bg-orange-100/60 hover:bg-orange-200/70 border-r-orange-200/70" : "border-r-slate-100",
                              isEven && !isPreferredDate && !isEscalantePref && !isWeekend ? "bg-slate-50/30" : "",
                              isSwapDay ? "bg-orange-100 border-orange-300 shadow-[inset_0_0_0_1px_rgba(249,115,22,0.4)]" : "",
                              isGrd && !afastamentoAtivo ? "bg-emerald-50/30" : "",
                              cellCanEdit ? "cursor-pointer hover:bg-indigo-200 hover:shadow-inner" : "hover:bg-slate-100",
                              afastamentoAtivo && "bg-orange-100/80 cursor-not-allowed"
                            )}
                          >
                            {afastamentoAtivo ? (
                              <div className="mx-auto w-[90%] h-5 sm:h-6 px-0.5 rounded flex items-center justify-center bg-orange-100 text-orange-700 border border-orange-200 shadow-sm relative overflow-hidden" title={afastamentoAtivo.situacao}>
                                <span className="text-[7px] font-black leading-none uppercase truncate">{afastamentoAtivo.situacao}</span>
                              </div>
                            ) : (
                              <>
                                {isSelected && (
                                  <div className={cn(
                                    "mx-auto w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center shadow-sm relative",
                                    isEscalantePref ? "bg-red-500 text-white border border-red-600 shadow-red-200" :
                                    isSwapDay ? "bg-orange-500 text-white shadow-orange-200 border border-orange-600 animate-pulse" :
                                    isTargetUser ? "bg-indigo-500 text-white" : "bg-slate-600 text-white"
                                  )}>
                                    <span className={cn("text-[10px] font-black leading-none pt-[1px]", isEscalantePref && "text-white")}>
                                      {isEscalantePref ? '★' : 'X'}
                                    </span>
                                  </div>
                                )}
                                {isExp && (
                                  <div className="mx-auto w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm relative">
                                    <span className="text-[8px] font-black leading-none">EXP</span>
                                  </div>
                                )}
                                {!isSelected && !isExp && isGrd && (
                                  <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none group-hover:opacity-20 transition-opacity">
                                    <span className="text-[8px] font-black text-emerald-600 bg-emerald-100/50 px-1 rounded border border-emerald-200 shadow-sm">GRD</span>
                                  </div>
                                )}
                              </>
                            )}
                            {!isSelected && !isExp && isSwapDay && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-80">
                                <ArrowUpDown className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                              </div>
                            )}
                            {isPreferredDate && !isSelected && !isSwapDay && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                                <span className="text-[12px] text-red-500">★</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : mapeamentoSubView === 'lista' ? (
        <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6 overflow-y-auto font-mono text-sm text-slate-800">
          <div className="flex flex-col mb-8">
            {currentMonthDays.map(day => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const dayNum = format(day, 'dd');

              return (
                <div key={dayStr} className="flex min-h-[1.5rem]">
                  <span className="w-8 shrink-0">{dayNum}-</span>
                  <span>
                    {expedienteUsers
                      .filter(u => u.rg !== 'ESCALANTE_PREF' && safeArr(data.selections[u.rg || u.uid]).includes(dayStr))
                      .map((u, idx, arr) => {
                        const rg = u.rg || u.uid || '';
                        const isGrd = data.grdData?.[dayStr]?.includes(rg);
                        const name = formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name);
                        return (
                          <span key={rg}>
                            {name}
                            {isGrd && <span data-no-copy="true"> (🛡️ GRD)</span>}
                            {idx < arr.length - 1 && " / "}
                          </span>
                        );
                      })}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col pt-6 border-t font-semibold border-slate-200 border-dashed">
            {expedienteUsers.filter(u => u.rg !== 'ESCALANTE_PREF').map(u => {
              const rg = u.rg || u.uid || '';
              const count = safeArr(data.selections[rg]).length;
              const req = getReqAmount(rg);
              const isDTS = req === 0 && count === 0;
              const name = formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name);
              const suffix = isDTS ? "DTS" : `${count} serv.`;
              return (
                <div key={rg} className="flex">
                  <span>{name} - {suffix}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div id="escala-sv-container" className="flex flex-col gap-8 w-full">
          {Array.from({ length: Math.ceil(expedienteUsers.filter(u => u.rg !== 'ESCALANTE_PREF').length / 7) }).map((_, tableIndex) => {
            const tableUsers = expedienteUsers.filter(u => u.rg !== 'ESCALANTE_PREF').slice(tableIndex * 7, tableIndex * 7 + 7);
            const paddedUsers = [...tableUsers];
            while (paddedUsers.length < 7) {
              paddedUsers.push(null as any);
            }
            return (
              <div key={tableIndex} className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-300">
                      <th className="py-2 px-3 border-r-2 border-slate-200 text-[10px] font-black uppercase text-center text-slate-500 w-[16%] bg-slate-200/50">
                        DATA
                      </th>
                      {paddedUsers.map((u, i) => (
                        <th key={u ? (u.rg || u.uid) : `empty-${i}`} className="py-2 px-2 border-r-2 border-slate-200 text-[9px] sm:text-[10px] font-black uppercase text-center text-slate-700 bg-slate-100 w-[12%]">
                          {u ? (
                            <div className="flex flex-col items-center gap-1">
                              <span>{formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name)}</span>
                              {(isAdmin || user.isEscalante) && (
                                <div data-no-copy="true" className="flex items-center gap-1 justify-center mt-0.5" onClick={e => e.stopPropagation()}>
                                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">EXP/Sem:</span>
                                  <input 
                                    type="number" 
                                    min="0" 
                                    max="7"
                                    value={data.expQuotas?.[u.rg || u.uid] !== undefined ? data.expQuotas[u.rg || u.uid] : getExpQuota(u.rg || u.uid)}
                                    onChange={(e) => updateExpQuota(u.rg || u.uid, parseInt(e.target.value) || 0)}
                                    placeholder="0"
                                    className={cn(
                                      "w-8 h-4 text-[9px] font-black text-center border-b-2 bg-transparent outline-none focus:border-indigo-500",
                                      data.expQuotas?.[u.rg || u.uid] !== undefined ? "border-indigo-400 text-indigo-700" : "border-slate-300 text-slate-500"
                                    )}
                                    title={data.expQuotas?.[u.rg || u.uid] !== undefined ? "Cota manual (modificada)" : "Cota do Regime (automática)"}
                                  />
                                </div>
                              )}
                            </div>
                          ) : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentMonthDays.map((day) => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      return (
                        <tr key={dayStr} className={cn("border-b border-slate-200", isWeekend ? "bg-amber-100/40" : "bg-white")}>
                          <td className={cn("py-1.5 px-3 border-r-2 border-slate-200 text-[11px] font-black whitespace-nowrap text-center", isWeekend ? "text-amber-900 border-amber-300/50" : "text-slate-700")}>
                            {format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
                          </td>
                          {paddedUsers.map((u, i) => {
                            const isSelected = u && safeArr(data.selections[u.rg || u.uid]).includes(dayStr);
                            const isExp = u && safeArr(data.expedienteDays?.[u.rg || u.uid]).includes(dayStr);
                            const isGrd = u && data.grdData?.[dayStr]?.includes(u.rg || u.uid);
                            const afastamentoAtivo = u ? afastamentos.find(a => a.rg === (u.rg || u.uid) && dayStr >= a.inicio && dayStr <= a.retorno) : null;
                            const canClick = u && (isAdmin || user.isEscalante) && !afastamentoAtivo;
                            return (
                              <td 
                                key={u ? (u.rg || u.uid) : `empty-${i}`} 
                                onClick={() => {
                                  if (canClick && u) {
                                    handleCycleCellStatus(u.rg || u.uid, dayStr);
                                  }
                                }}
                                className={cn(
                                  "py-1.5 px-3 border-r-2 border-slate-200 text-center text-[11px] font-black transition-colors", 
                                  isWeekend && "border-amber-300/50", 
                                  canClick && "cursor-pointer hover:bg-slate-100",
                                  isGrd && !afastamentoAtivo && "bg-emerald-50 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.2)]",
                                  afastamentoAtivo && "bg-orange-50 cursor-not-allowed"
                                )}
                              >
                                {afastamentoAtivo ? (
                                  <span className="inline-flex items-center justify-center text-orange-700 bg-orange-100 px-2 py-0.5 rounded mx-1 whitespace-nowrap min-w-[38px] text-[9px] uppercase tracking-tighter border border-orange-200">
                                    {afastamentoAtivo.situacao}
                                  </span>
                                ) : (
                                  <>
                                    {isSelected && <span className="inline-flex items-center justify-center text-red-600 font-bold mx-1 bg-red-50 px-2 py-0.5 rounded whitespace-nowrap min-w-[38px]">SV.</span>}
                                    {isExp && <span className="inline-flex items-center justify-center text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded mx-1 whitespace-nowrap min-w-[38px]">EXP.</span>}
                                    {isGrd && (
                                      <span data-no-copy="true" className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded mx-0.5 border border-emerald-200 shadow-sm text-[8px] font-black uppercase tracking-tighter flex items-center gap-0.5">
                                        <Shield className="w-2 h-2 fill-emerald-500" /> GRD
                                      </span>
                                    )}
                                  </>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
