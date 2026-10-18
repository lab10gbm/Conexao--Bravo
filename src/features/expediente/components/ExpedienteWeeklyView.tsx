import React from 'react';
import { 
  ChevronLeft, ChevronRight, LayoutGrid, List, User, Lock, 
  CheckCircle2, Shield, Clock, Save, ArrowUpDown, AlertCircle, 
  X, XCircle, Calendar, Briefcase, Coffee, Check, ChevronDown 
} from 'lucide-react';
import { format, subWeeks, addWeeks, startOfWeek, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { doc, setDoc } from 'firebase/firestore';
import { cn, cleanUndefined } from '../../../lib/utils';
import { UserProfile } from '../../../types';
import { ExpedienteData, DayStatusResult, WeeklyChangeRequest } from '../types';
import { safeArr, formatPreferenceFunction } from '../lib/expedienteCalculos';

interface ExpedienteWeeklyViewProps {
  selectedWeekMonday: Date;
  setSelectedWeekMonday: React.Dispatch<React.SetStateAction<Date>>;
  fullWeekDays: Date[];
  weekDays: Date[];
  weeklyFilterDays: 'all' | 'weekdays';
  setWeeklyFilterDays: React.Dispatch<React.SetStateAction<'all' | 'weekdays'>>;
  weeklyLayoutMode: 'grid' | 'list';
  handleToggleWeeklyLayoutMode: (mode: 'grid' | 'list') => void;
  isAdmin: boolean;
  user: UserProfile;
  adminTargetRg: string | null;
  setAdminTargetRg: React.Dispatch<React.SetStateAction<string | null>>;
  formatMilitaryName: (name: string) => string;
  expedienteUsers: UserProfile[];
  activeRg: string;
  getDayStatus: (rg: string, dayStr: string) => DayStatusResult;
  monthKey: string;
  monthDocRef: any;
  db: any;
  normalizedObm: string;
  data: ExpedienteData;
  setData: React.Dispatch<React.SetStateAction<ExpedienteData>>;
  extraMonthData: Record<string, any>;
  setExtraMonthData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  getReqAmount: (rg: string) => number;
  getExpQuota: (rg: string) => number;
  isWeeklyLockedForUser: (rg: string, monday: Date) => boolean;
  isOrdinarioLockedForUser: (rg: string, monthKey: string) => boolean;
  getRegimeDisplay: (rg: string) => string;
  handleOpenWeeklyChangeModal: () => void;
  userCurrentWeekRequest?: WeeklyChangeRequest;
  actionFeedback: { type: 'success' | 'error'; message: string } | null;
  setActionFeedback: React.Dispatch<React.SetStateAction<{ type: 'success' | 'error'; message: string } | null>>;
  handleCancelWeeklyChange: (requestId: string, weekKey: string) => Promise<void>;
  allWeeklyChangeRequests: WeeklyChangeRequest[];
  handleRejectWeeklyChange: (req: WeeklyChangeRequest) => Promise<void>;
  handleApproveWeeklyChange: (req: WeeklyChangeRequest) => Promise<void>;
  getAlaForDate: (date: Date) => string | number;
  getAlaColor: (ala: string | number) => string;
  getWorkersForDay: (dayStr: string) => { servicoList: any[]; expedienteList: any[] };
  checkDayHasPermuta: (rg: string, dayStr: string, sourceData: any) => boolean;
  expandedDaysList: Record<string, boolean>;
  setExpandedDaysList: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleSetWeeklyDayStatus: (rg: string, dayStr: string, statusType: 'expediente' | 'servico' | 'folga' | 'cycle') => Promise<void>;
  setMilitaryMoveModal: React.Dispatch<React.SetStateAction<any>>;
  checkNeedFulfilled: (func: string, dayStr: string, qt: number) => boolean;
}

export const ExpedienteWeeklyView: React.FC<ExpedienteWeeklyViewProps> = ({
  selectedWeekMonday,
  setSelectedWeekMonday,
  fullWeekDays,
  weekDays,
  weeklyFilterDays,
  setWeeklyFilterDays,
  weeklyLayoutMode,
  handleToggleWeeklyLayoutMode,
  isAdmin,
  user,
  adminTargetRg,
  setAdminTargetRg,
  formatMilitaryName,
  expedienteUsers,
  activeRg,
  getDayStatus,
  monthKey,
  monthDocRef,
  db,
  normalizedObm,
  data,
  setData,
  extraMonthData,
  setExtraMonthData,
  getReqAmount,
  getExpQuota,
  isWeeklyLockedForUser,
  isOrdinarioLockedForUser,
  getRegimeDisplay,
  handleOpenWeeklyChangeModal,
  userCurrentWeekRequest,
  actionFeedback,
  setActionFeedback,
  handleCancelWeeklyChange,
  allWeeklyChangeRequests,
  handleRejectWeeklyChange,
  handleApproveWeeklyChange,
  getAlaForDate,
  getAlaColor,
  getWorkersForDay,
  checkDayHasPermuta,
  expandedDaysList,
  setExpandedDaysList,
  handleSetWeeklyDayStatus,
  setMilitaryMoveModal,
  checkNeedFulfilled,
}) => {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header Controls da Aba Semanal */}
      <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Navegação Semanal */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
            <button
              onClick={() => setSelectedWeekMonday(subWeeks(selectedWeekMonday, 1))}
              className="p-1.5 hover:bg-white rounded-md transition-colors text-slate-600 hover:text-slate-900 cursor-pointer"
              title="Semana Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-black uppercase text-slate-800 tracking-wider min-w-[170px] text-center select-none">
              {format(fullWeekDays[0], 'dd/MM')} a {format(fullWeekDays[6], 'dd/MM/yyyy')}
            </span>
            <button
              onClick={() => setSelectedWeekMonday(addWeeks(selectedWeekMonday, 1))}
              className="p-1.5 hover:bg-white rounded-md transition-colors text-slate-600 hover:text-slate-900 cursor-pointer"
              title="Próxima Semana"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Atalhos rápidos de semana */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setSelectedWeekMonday(startOfWeek(new Date(), { weekStartsOn: 1 }))}
              className="px-2.5 py-1 rounded hover:bg-white text-slate-600 font-bold transition-colors cursor-pointer"
              title="Ir para a Semana Atual"
            >
              Semana Atual
            </button>
            <button
              onClick={() => setSelectedWeekMonday(startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 }))}
              className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
              title="Ir para a Próxima Semana"
            >
              Próxima Semana
            </button>
          </div>

          {/* Filtro: 7 Dias vs 5 Dias */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setWeeklyFilterDays('all')}
              className={cn(
                "px-2.5 py-1 rounded font-bold transition-colors cursor-pointer",
                weeklyFilterDays === 'all' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              7 Dias (Seg a Dom)
            </button>
            <button
              onClick={() => setWeeklyFilterDays('weekdays')}
              className={cn(
                "px-2.5 py-1 rounded font-bold transition-colors cursor-pointer",
                weeklyFilterDays === 'weekdays' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
            >
              5 Dias (Seg a Sex)
            </button>
          </div>

          {/* Alternador de Visualização: Grade vs Lista (Celular / Modal) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => handleToggleWeeklyLayoutMode('grid')}
              className={cn(
                "px-2.5 py-1 rounded font-bold transition-colors cursor-pointer flex items-center gap-1.5",
                weeklyLayoutMode === 'grid' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
              title="Visualização em Grade / Cards"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grade</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleWeeklyLayoutMode('list')}
              className={cn(
                "px-2.5 py-1 rounded font-bold transition-colors cursor-pointer flex items-center gap-1.5",
                weeklyLayoutMode === 'list' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
              )}
              title="Visualização em Linhas / Lista Compacta (Estilo Celular e Modal)"
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista {weeklyLayoutMode === 'list' ? '(Celular)' : ''}</span>
            </button>
          </div>
        </div>

        {/* Seletor de Militar Alvo para Moderador/Escalante */}
        <div className="flex items-center gap-3">
          {(isAdmin || user.isEscalante) && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider hidden sm:inline">Preenchendo para:</span>
              <select
                className="bg-slate-50 border-2 border-slate-200 text-slate-800 text-xs font-bold p-2 rounded-lg outline-none cursor-pointer hover:border-indigo-400 focus:border-indigo-500 transition-colors"
                value={adminTargetRg || ''}
                onChange={(e) => setAdminTargetRg(e.target.value || null)}
              >
                <option value="">Você ({formatMilitaryName(user.rank ? `${user.rank} ${user.warName || user.name.split(' ')[0]}` : user.name)})</option>
                <optgroup label="Militares do Expediente">
                  {expedienteUsers.filter(u => (u.rg || u.uid) !== 'ESCALANTE_PREF').map((u, i) => {
                    const val = u.rg || u.uid || `usr-${i}`;
                    return (
                      <option key={`opt-wk-${val}`} value={val}>
                        {formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name)} ({u.rg || 'S/RG'})
                      </option>
                    );
                  })}
                </optgroup>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Resumo & Status do Militar */}
      {(() => {
        const targetUserObj = expedienteUsers.find(u => (u.rg || u.uid) === activeRg) || user;
        const targetName = formatMilitaryName(targetUserObj.rank ? `${targetUserObj.rank} ${targetUserObj.warName || targetUserObj.name.split(' ')[0]}` : targetUserObj.name);
        const displayedDaysList = weeklyFilterDays === 'all' ? fullWeekDays : weekDays;

        const weekStatusList = displayedDaysList.map(d => {
          const dStr = format(d, 'yyyy-MM-dd');
          return getDayStatus(activeRg, dStr);
        });
        const weekExpCount = weekStatusList.filter(s => s.type === 'expediente').length;
        const weekSvCount = weekStatusList.filter(s => s.type === 'servico').length;
        const weekFolgaCount = weekStatusList.filter(s => s.type === 'folga').length;

        const currentWeekKey = format(selectedWeekMonday, 'yyyy-MM-dd');
        const weekMondayMonthKey = format(selectedWeekMonday, 'yyyy-MM');
        const weekDocRef = weekMondayMonthKey === monthKey ? monthDocRef : doc(db, `expediente_${normalizedObm}`, weekMondayMonthKey);

        const userSels = safeArr(data.selections[activeRg]);
        const userReq = getReqAmount(activeRg);
        const userExpQuota = getExpQuota(activeRg);
        const isWeekLocked = isWeeklyLockedForUser(activeRg, selectedWeekMonday);
        const isMonthOrdLocked = isOrdinarioLockedForUser(activeRg, weekMondayMonthKey);
        const regimeText = getRegimeDisplay(activeRg);

        return (
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                  Preenchimento Semanal
                </span>
                {regimeText && regimeText !== '-' && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 bg-white/10 px-2 py-0.5 rounded">
                    {regimeText}
                  </span>
                )}
                {/* Status de Bloqueio do Expediente Semanal */}
                {isWeekLocked ? (
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Expediente Semanal Homologado
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Expediente Semanal Aberto
                  </span>
                )}
                {/* Status de Bloqueio da Escala Ordinária 24h */}
                {isMonthOrdLocked ? (
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-300 bg-red-500/20 px-2 py-0.5 rounded border border-red-500/30 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Escala 24h Mensal Fechada
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 bg-white/10 px-2 py-0.5 rounded flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Escala 24h Mensal em Aberto
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-400" /> {targetName}
                {targetUserObj.rg && <span className="text-xs text-slate-400 font-bold">({targetUserObj.rg})</span>}
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Esse ambiente é para escolha dos dias de expedientes de segunda a sexta. (cabendo excepcionalmente a escolha de dias sábado e domingo.)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-start md:justify-end">
              {/* Métricas da Semana */}
              <div className="flex items-center gap-2 bg-white/10 p-2 rounded-lg border border-white/10">
                <div className="flex flex-col items-center px-2 border-r border-white/10">
                  <span className="text-xs font-black text-indigo-300">{weekExpCount}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Exped.</span>
                </div>
                <div className="flex flex-col items-center px-2 border-r border-white/10">
                  <span className="text-xs font-black text-red-300">{weekSvCount}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Serviço</span>
                </div>
                <div className="flex flex-col items-center px-2">
                  <span className="text-xs font-black text-emerald-300">{weekFolgaCount}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Folgas</span>
                </div>
              </div>

              {/* Cota Expediente na Semana */}
              {userExpQuota > 0 && (
                <div className="flex flex-col gap-1 bg-white/10 p-2.5 rounded-lg border border-white/10 min-w-[130px]">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-300 uppercase tracking-wider">Cota Sem. (EXP)</span>
                    <span className="text-white font-black">{weekExpCount} / {userExpQuota} EXP</span>
                  </div>
                  <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={cn("h-full transition-all duration-300", weekExpCount >= userExpQuota ? "bg-emerald-400" : "bg-indigo-400")} 
                      style={{ width: `${Math.min(100, (weekExpCount / userExpQuota) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-right font-black uppercase tracking-wider text-slate-400">
                    {weekExpCount >= userExpQuota ? "✓ Cota Atingida" : `Faltam ${userExpQuota - weekExpCount}`}
                  </span>
                </div>
              )}

              {/* Cota S.24h no Mês */}
              {userReq > 0 && (
                <div className="flex flex-col gap-1 bg-white/10 p-2.5 rounded-lg border border-white/10 min-w-[130px]">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-300 uppercase tracking-wider">Cota Mês (S.24h)</span>
                    <span className="text-white font-black">{userSels.length} / {userReq} SV</span>
                  </div>
                  <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={cn("h-full transition-all duration-300", userSels.length >= userReq ? "bg-emerald-400" : "bg-indigo-400")} 
                      style={{ width: `${Math.min(100, (userSels.length / userReq) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-right font-black uppercase tracking-wider text-slate-400">
                    {userSels.length >= userReq ? "✓ Cota Atingida" : `Faltam ${userReq - userSels.length}`}
                  </span>
                </div>
              )}

              {/* Botão de Bloqueio/Confirmação do Expediente Semanal */}
              {activeRg && activeRg !== 'ESCALANTE_PREF' && (
                !isWeekLocked ? (
                  <button
                    onClick={async () => {
                      const updatePayload = {
                        lockedWeekly: {
                          [currentWeekKey]: {
                            [activeRg]: true
                          }
                        }
                      };
                      if (weekMondayMonthKey === monthKey) {
                        setData(prev => ({
                          ...prev,
                          lockedWeekly: {
                            ...(prev.lockedWeekly || {}),
                            [currentWeekKey]: {
                              ...((prev.lockedWeekly || {})[currentWeekKey] || {}),
                              [activeRg]: true
                            }
                          }
                        }));
                      } else {
                        setExtraMonthData(prev => ({
                          ...prev,
                          [weekMondayMonthKey]: {
                            ...(prev[weekMondayMonthKey] || {}),
                            lockedWeekly: {
                              ...((prev[weekMondayMonthKey]?.lockedWeekly) || {}),
                              [currentWeekKey]: {
                                ...(((prev[weekMondayMonthKey]?.lockedWeekly) || {})[currentWeekKey] || {}),
                                [activeRg]: true
                              }
                            }
                          }
                        }));
                      }
                      await setDoc(weekDocRef, cleanUndefined(updatePayload), { merge: true });
                    }}
                    className="px-3.5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                    title="Confirmar e homologar expediente desta semana"
                  >
                    <Save className="w-3.5 h-3.5" /> Confirmar Expediente da Semana
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-200 text-xs font-bold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-300" /> Semana Homologada
                    </div>
                    <button
                      onClick={handleOpenWeeklyChangeModal}
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer",
                        userCurrentWeekRequest?.status === 'pending'
                          ? "bg-amber-500/30 border border-amber-400 text-amber-200 animate-pulse hover:bg-amber-500/40"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white"
                      )}
                      title="Solicitar troca/alteração desta semana de expediente"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      {userCurrentWeekRequest?.status === 'pending' ? 'Alteração em Análise' : 'Solicitar Alteração'}
                    </button>
                    {(isAdmin || user.isEscalante) && (
                      <button
                        onClick={async () => {
                          const updatePayload = {
                            lockedWeekly: {
                              [currentWeekKey]: {
                                [activeRg]: false
                              }
                            }
                          };
                          if (weekMondayMonthKey === monthKey) {
                            setData(prev => ({
                              ...prev,
                              lockedWeekly: {
                                ...(prev.lockedWeekly || {}),
                                [currentWeekKey]: {
                                  ...((prev.lockedWeekly || {})[currentWeekKey] || {}),
                                  [activeRg]: false
                                }
                              }
                            }));
                          } else {
                            setExtraMonthData(prev => ({
                              ...prev,
                              [weekMondayMonthKey]: {
                                ...(prev[weekMondayMonthKey] || {}),
                                lockedWeekly: {
                                  ...((prev[weekMondayMonthKey]?.lockedWeekly) || {}),
                                  [currentWeekKey]: {
                                    ...(((prev[weekMondayMonthKey]?.lockedWeekly) || {})[currentWeekKey] || {}),
                                    [activeRg]: false
                                  }
                                }
                              }
                            }));
                          }
                          await setDoc(weekDocRef, cleanUndefined(updatePayload), { merge: true });
                        }}
                        className="px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Desbloquear expediente da semana para edição"
                      >
                        <Lock className="w-3.5 h-3.5" /> Desbloquear Semana
                      </button>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        );
      })()}

      {/* Feedback Toast / Mensagem de Ação */}
      {actionFeedback && (
        <div className={cn(
          "p-3 rounded-xl border-2 text-xs font-bold flex items-center justify-between gap-2 shadow-sm animate-in fade-in slide-in-from-top-2",
          actionFeedback.type === 'success' ? "bg-emerald-50 border-emerald-300 text-emerald-900" : "bg-red-50 border-red-300 text-red-900"
        )}>
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <span>{actionFeedback.message}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="p-1 hover:bg-black/5 rounded cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Status da Solicitação do Militar para esta Semana */}
      {userCurrentWeekRequest && (
        <div className={cn(
          "rounded-xl border-2 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm",
          userCurrentWeekRequest.status === 'pending' ? "bg-amber-50 border-amber-300 text-amber-900" :
          userCurrentWeekRequest.status === 'approved' ? "bg-emerald-50 border-emerald-300 text-emerald-900" :
          "bg-red-50 border-red-300 text-red-900"
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              "p-2 rounded-lg text-white shrink-0 mt-0.5",
              userCurrentWeekRequest.status === 'pending' ? "bg-amber-500" :
              userCurrentWeekRequest.status === 'approved' ? "bg-emerald-600" :
              "bg-red-500"
            )}>
              {userCurrentWeekRequest.status === 'pending' ? <Clock className="w-4 h-4" /> :
               userCurrentWeekRequest.status === 'approved' ? <CheckCircle2 className="w-4 h-4" /> :
               <AlertCircle className="w-4 h-4" />}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider">
                  {userCurrentWeekRequest.status === 'pending' ? 'Solicitação de Alteração em Análise' :
                   userCurrentWeekRequest.status === 'approved' ? 'Solicitação de Alteração Aprovada' :
                   'Solicitação de Alteração Recusada'}
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  • {format(new Date(userCurrentWeekRequest.createdAt), "dd/MM/yyyy 'às' HH:mm")}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-bold text-slate-600">Alterações solicitadas:</span>
                {userCurrentWeekRequest.changes.map((c, idx) => (
                  <span key={idx} className="bg-white/80 border border-slate-200 px-2 py-0.5 rounded font-mono text-[10px] font-bold">
                    {c.dayLabel}: <span className="uppercase text-slate-500">{c.currentStatus}</span> ➔ <span className="uppercase text-indigo-700 font-black">{c.proposedStatus}</span>
                  </span>
                ))}
              </div>
              <p className="text-xs italic text-slate-600">
                Motivo: "{userCurrentWeekRequest.reason}"
              </p>
              {userCurrentWeekRequest.status === 'rejected' && userCurrentWeekRequest.rejectionReason && (
                <p className="text-xs font-bold text-red-700">
                  Motivo da recusa: {userCurrentWeekRequest.rejectionReason}
                </p>
              )}
              {userCurrentWeekRequest.status === 'approved' && (
                <p className="text-xs font-bold text-emerald-700">
                  ✓ Aprovado por {userCurrentWeekRequest.reviewedBy || 'Escalante'} {userCurrentWeekRequest.reviewedAt ? `em ${format(new Date(userCurrentWeekRequest.reviewedAt), "dd/MM/yyyy 'às' HH:mm")}` : ''}. Escala atualizada.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {userCurrentWeekRequest.status === 'pending' ? (
              <button
                onClick={() => handleCancelWeeklyChange(userCurrentWeekRequest.id, userCurrentWeekRequest.weekKey)}
                className="px-3 py-1.5 rounded-lg border border-amber-400 bg-white hover:bg-amber-100 text-amber-900 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar Solicitação
              </button>
            ) : (
              <button
                onClick={handleOpenWeeklyChangeModal}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Nova Solicitação
              </button>
            )}
          </div>
        </div>
      )}

      {/* Painel do Escalante / Moderador: Gestão das Solicitações de Alteração */}
      {(isAdmin || user.isEscalante) && allWeeklyChangeRequests.length > 0 && (
        <div className="bg-white rounded-xl border-2 border-indigo-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-indigo-50 border-b-2 border-indigo-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-indigo-700" />
              <h3 className="font-black text-sm uppercase tracking-wider text-indigo-900">
                Solicitações de Alteração de Expediente da Semana
              </h3>
              {allWeeklyChangeRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="bg-amber-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                  {allWeeklyChangeRequests.filter(r => r.status === 'pending').length} Pendente(s)
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Semana {format(fullWeekDays[0], 'dd/MM')} a {format(fullWeekDays[6], 'dd/MM/yyyy')}
            </span>
          </div>

          <div className="p-4 flex flex-col gap-3 max-h-[380px] overflow-y-auto">
            {allWeeklyChangeRequests
              .filter(r => r.weekKey === format(selectedWeekMonday, 'yyyy-MM-dd') || r.status === 'pending')
              .map(req => (
                <div 
                  key={req.id} 
                  className={cn(
                    "p-3.5 rounded-xl border-2 flex flex-col gap-2.5 transition-all",
                    req.status === 'pending' ? "bg-amber-50/50 border-amber-200" :
                    req.status === 'approved' ? "bg-emerald-50/40 border-emerald-200 opacity-90" :
                    "bg-red-50/40 border-red-200 opacity-80"
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-800">{req.userName}</span>
                      <span className="text-[10px] font-bold text-slate-400">({req.rg})</span>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                        Semana: {req.weekLabel}
                      </span>
                    </div>
                    <span className={cn(
                      "text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wider",
                      req.status === 'pending' ? "bg-amber-100 text-amber-800 border border-amber-300" :
                      req.status === 'approved' ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                      "bg-red-100 text-red-800 border border-red-300"
                    )}>
                      {req.status === 'pending' ? 'Pendente de Aprovação' :
                       req.status === 'approved' ? 'Aprovado' : 'Recusado'}
                    </span>
                  </div>

                  {/* Comparativo de dias alterados */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {req.changes.map((c, i) => (
                      <div key={i} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1.5 px-2 text-[10px]">
                        <span className="font-bold text-slate-700">{c.dayLabel}:</span>
                        <span className="px-1.5 py-0.5 rounded uppercase font-black bg-slate-100 text-slate-500">{c.currentStatus}</span>
                        <span className="text-slate-400 font-bold">➔</span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded uppercase font-black",
                          c.proposedStatus === 'expediente' ? "bg-indigo-100 text-indigo-800" :
                          c.proposedStatus === 'servico' ? "bg-red-100 text-red-800" :
                          "bg-slate-200 text-slate-700"
                        )}>
                          {c.proposedStatus}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Motivo informado */}
                  <div className="text-xs text-slate-600 bg-white/70 p-2 rounded-lg border border-slate-100">
                    <span className="font-black text-slate-700">Justificativa: </span>
                    <span className="italic">{req.reason}</span>
                  </div>

                  {/* Ações do Escalante */}
                  {req.status === 'pending' ? (
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/60">
                      <button
                        onClick={() => handleRejectWeeklyChange(req)}
                        className="px-3 py-1.5 rounded-lg border border-red-300 bg-white hover:bg-red-50 text-red-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Rejeitar
                      </button>
                      <button
                        onClick={() => handleApproveWeeklyChange(req)}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar Alteração
                      </button>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 font-bold text-right">
                      {req.reviewedBy && `Avaliado por ${req.reviewedBy}`}
                      {req.reviewedAt && ` em ${format(new Date(req.reviewedAt), "dd/MM/yyyy HH:mm")}`}
                      {req.rejectionReason && ` • Motivo: ${req.rejectionReason}`}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Grade ou Lista Semanal de Dias */}
      {(() => {
        const displayedDays = weeklyFilterDays === 'all' ? fullWeekDays : weekDays;

        return (
          <div className="flex flex-col gap-3">
            {/* Barra Superior com título e botão de alternância de visualização */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1 pb-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  Dias da Semana
                </span>
                <span className="text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                  {weeklyLayoutMode === 'list' ? 'Visualização em Linhas (Celular)' : 'Visualização em Grade'}
                </span>
              </div>

              {/* Botão de Alternar Forma de Visualização no topo dos dias */}
              <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => handleToggleWeeklyLayoutMode('grid')}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                    weeklyLayoutMode === 'grid' ? "bg-white text-indigo-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  )}
                  title="Visualizar em Grade (Cards)"
                >
                  <LayoutGrid className="w-3 h-3" />
                  <span>Grade</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleWeeklyLayoutMode('list')}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer",
                    weeklyLayoutMode === 'list' ? "bg-white text-indigo-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  )}
                  title="Visualizar em Linhas / Lista Compacta (Estilo Celular e Modal)"
                >
                  <List className="w-3 h-3" />
                  <span>Lista {weeklyLayoutMode === 'list' ? '(Ativo)' : ''}</span>
                </button>
              </div>
            </div>

            {weeklyLayoutMode === 'list' ? (
              /* MODO LISTA / LINHAS (Estilo Popup Modal de Solicitar Alteração) */
              <div className="flex flex-col gap-2.5">
                {displayedDays.map(day => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const dayMonthKey = dayStr.substring(0, 7);
                  const dataSource = dayMonthKey === monthKey ? data : (extraMonthData[dayMonthKey] || {});
                  const isToday = isSameDay(day, new Date());
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const alaOfDay = getAlaForDate(day);
                  const alaColor = getAlaColor(alaOfDay);

                  const dayStatus = getDayStatus(activeRg, dayStr);
                  const isPreferred = safeArr(dataSource.selections?.['ESCALANTE_PREF']).includes(dayStr);
                  const prefDetails = (dataSource.preferencesDetails?.[dayStr] || {}) as Record<string, number>;
                  const totalVagas = Object.values(prefDetails).reduce((sum: number, q: number) => sum + Number(q || 0), 0);

                  const { servicoList, expedienteList } = getWorkersForDay(dayStr);
                  const dayDate = new Date(`${dayStr}T12:00:00`);
                  const dayMonday = startOfWeek(dayDate, { weekStartsOn: 1 });
                  const isWeekLocked = isWeeklyLockedForUser(activeRg, dayMonday);
                  const isOrd24hLocked = isOrdinarioLockedForUser(activeRg, dayMonthKey);
                  const isDay24hLocked = (isOrd24hLocked && dayStatus.type === 'servico') || Boolean(dayStatus.isPermuta);
                  const canEdit = (isAdmin || user.isEscalante || (!isWeekLocked && !isDay24hLocked && activeRg === (user.rg || user.uid))) && dayStatus.type !== 'afastamento';
                  const isExpandedDetails = !!expandedDaysList[dayStr];
                  const hasPermutaForDay = Boolean(dayStatus.isPermuta || (isDay24hLocked && checkDayHasPermuta(activeRg, dayStr, dataSource)));

                  return (
                    <div
                      key={dayStr}
                      className={cn(
                        "rounded-xl border-2 transition-all p-3 sm:p-3.5 bg-white shadow-2xs flex flex-col gap-2",
                        dayStatus.type === 'expediente' && "border-indigo-300 bg-indigo-50/20",
                        dayStatus.type === 'servico' && "border-red-300 bg-red-50/20",
                        dayStatus.type === 'folga' && "border-slate-200 hover:border-slate-300",
                        dayStatus.type === 'afastamento' && "border-orange-300 bg-orange-50/50",
                        isToday && "ring-2 ring-indigo-600 ring-offset-1"
                      )}
                    >
                      {/* Linha Principal: Dia, Status Atual e Botões Rápidos */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Ala Badge */}
                          <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-black text-slate-600 shrink-0">
                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", alaColor)} />
                            <span>Ala {alaOfDay}</span>
                          </div>

                          {/* Nome do Dia e Data */}
                          <span className={cn(
                            "text-xs sm:text-sm font-black capitalize text-slate-800 tracking-tight min-w-[130px]",
                            isWeekend && "text-amber-800"
                          )}>
                            {format(day, 'EEEE', { locale: ptBR })} ({format(day, 'dd/MM')})
                          </span>

                          {/* Badges de Hoje / FDS */}
                          {isToday && (
                            <span className="text-[8px] font-black uppercase tracking-widest bg-indigo-600 text-white px-1.5 py-0.5 rounded">
                              Hoje
                            </span>
                          )}
                          {isWeekend && !isToday && (
                            <span className="text-[8px] font-bold uppercase tracking-widest bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                              FDS
                            </span>
                          )}

                          {/* Badge de Status Atual (Estilo Modal de Solicitação) */}
                          <span className={cn(
                            "text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs",
                            dayStatus.isPermuta && dayStatus.type === 'servico' ? "bg-purple-100 text-purple-800 border border-purple-200" :
                            dayStatus.type === 'expediente' ? "bg-indigo-100 text-indigo-700 border border-indigo-200" :
                            dayStatus.type === 'servico' ? "bg-red-100 text-red-700 border border-red-200" :
                            dayStatus.type === 'afastamento' ? "bg-orange-100 text-orange-700 border border-orange-200" :
                            "bg-slate-200 text-slate-700 border border-slate-300"
                          )}>
                            {dayStatus.isPermuta && dayStatus.type === 'servico' ? <Shield className="w-3 h-3 text-purple-600" /> :
                             dayStatus.type === 'expediente' ? <Briefcase className="w-3 h-3 text-indigo-600" /> :
                             dayStatus.type === 'servico' ? <Shield className="w-3 h-3 text-red-600" /> :
                             dayStatus.type === 'folga' ? <Coffee className="w-3 h-3 text-slate-500" /> :
                             <AlertCircle className="w-3 h-3 text-orange-600" />}
                            Atual: {dayStatus.isPermuta && dayStatus.type === 'servico' ? dayStatus.text : dayStatus.type === 'expediente' ? 'EXP' : dayStatus.type === 'servico' ? 'SV' : dayStatus.type === 'afastamento' ? 'AFASTADO' : 'FOLGA'}
                          </span>

                          {/* 24h Homologado se aplicável */}
                          {isDay24hLocked && (isAdmin || user.isEscalante) && (
                            <span className={cn(
                              "text-[9px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-1 border",
                              hasPermutaForDay ? "text-purple-800 bg-purple-100 border-purple-200" : "text-red-700 bg-red-100 border-red-200"
                            )}>
                              <Lock className="w-2.5 h-2.5" /> {dayStatus.isPermuta ? dayStatus.text : "S.24h Mensal Homologado"}
                            </span>
                          )}

                          {/* Vaga prioritária se aplicável */}
                          {isPreferred && (
                            <span className="text-[9px] font-black text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded flex items-center gap-1" title="Vagas prioritárias do dia">
                              ★ Prioritária {totalVagas > 0 && `(${totalVagas})`}
                            </span>
                          )}
                        </div>

                        {/* Botões Rápidos: EXP, SV, FOLGA ou Botão de Solicitar Alteração */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          {canEdit ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSetWeeklyDayStatus(activeRg, dayStr, 'expediente')}
                                className={cn(
                                  "px-3 sm:px-3.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1",
                                  dayStatus.type === 'expediente'
                                    ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400"
                                    : "bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300"
                                )}
                                title="Marcar como Expediente"
                              >
                                {dayStatus.type === 'expediente' && <Check className="w-3 h-3" />}
                                EXP
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isOrd24hLocked && !isAdmin && !user.isEscalante) {
                                    alert("A escala ordinária (24h) deste mês já está fechada. Apenas o Escalante pode alterar serviços operacionais de 24h.");
                                    return;
                                  }
                                  handleSetWeeklyDayStatus(activeRg, dayStr, 'servico');
                                }}
                                className={cn(
                                  "px-3 sm:px-3.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1",
                                  dayStatus.type === 'servico'
                                    ? "bg-red-600 text-white shadow-sm ring-2 ring-red-400"
                                    : isOrd24hLocked && !isAdmin && !user.isEscalante
                                      ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
                                      : "bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                                )}
                                title={isOrd24hLocked && !isAdmin && !user.isEscalante ? "Escala 24h fechada" : "Marcar como Serviço 24h"}
                              >
                                {dayStatus.type === 'servico' && <Check className="w-3 h-3" />}
                                SV
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetWeeklyDayStatus(activeRg, dayStr, 'folga')}
                                className={cn(
                                  "px-3 sm:px-3.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1",
                                  dayStatus.type === 'folga'
                                    ? "bg-slate-700 text-white shadow-sm ring-2 ring-slate-400"
                                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                                )}
                                title="Marcar como Folga"
                              >
                                {dayStatus.type === 'folga' && <Check className="w-3 h-3" />}
                                FOLGA
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {isDay24hLocked && !isAdmin && !user.isEscalante ? (
                                <div 
                                  className={cn(
                                    "py-1 px-2.5 rounded-lg text-[10px] font-black flex items-center gap-1 shadow-2xs",
                                    hasPermutaForDay 
                                      ? "bg-purple-50 border border-purple-200 text-purple-700" 
                                      : "bg-red-50 border border-red-200 text-red-700"
                                  )}
                                  title={hasPermutaForDay ? "Serviço 24h assumido via Permuta Homologada" : "Serviço 24h Ordinário escolhido no Calendário Mensal e Homologado"}
                                >
                                  <Shield className={cn("w-3 h-3 shrink-0", hasPermutaForDay ? "text-purple-600" : "text-red-600")} />
                                  <span>{dayStatus.isPermuta ? dayStatus.text : "S.24h Mensal Homologado"}</span>
                                </div>
                              ) : isWeekLocked && !isAdmin && !user.isEscalante ? (
                                <button
                                  type="button"
                                  onClick={handleOpenWeeklyChangeModal}
                                  className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                                  title="Solicitar alteração desta semana ao escalante"
                                >
                                  <ArrowUpDown className="w-3.5 h-3.5" />
                                  <span>Solicitar Alteração</span>
                                </button>
                              ) : (
                                dayStatus.type === 'afastamento' && (
                                  <div className="py-1 px-2.5 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 text-[10px] font-black flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 text-orange-600 shrink-0" />
                                    <span>Afastamento</span>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Detalhes Expansíveis: Efetivo no Dia & Vagas Prioritárias */}
                      {(servicoList.length > 0 || expedienteList.length > 0 || isPreferred) && (
                        <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                            <button
                              type="button"
                              onClick={() => setExpandedDaysList(prev => ({ ...prev, [dayStr]: !prev[dayStr] }))}
                              className="flex items-center gap-1.5 text-slate-600 hover:text-indigo-600 font-black cursor-pointer transition-colors"
                            >
                              <span className="text-[9px] uppercase tracking-wider">Efetivo Escalado ({servicoList.length + expedienteList.length}):</span>
                              <span className="text-red-700 font-bold">{servicoList.length} SV</span>
                              <span>•</span>
                              <span className="text-indigo-700 font-bold">{expedienteList.length} EXP</span>
                              <ChevronDown className={cn("w-3 h-3 transition-transform text-slate-400", isExpandedDetails && "rotate-180")} />
                            </button>

                            {isPreferred && totalVagas > 0 && (
                              <span className="text-[9px] font-bold text-red-600 flex items-center gap-1">
                                ★ {totalVagas} vaga(s) necessária(s)
                              </span>
                            )}
                          </div>

                          {isExpandedDetails && (
                            <div className="flex flex-col gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 animate-in fade-in">
                              {servicoList.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[8px] font-black uppercase text-red-600 shrink-0">Serviço:</span>
                                  {servicoList.map((w, idx) => (
                                    <button 
                                      key={idx}
                                      type="button"
                                      onClick={() => {
                                        if (isAdmin || user.isEscalante) {
                                          setMilitaryMoveModal({
                                            isOpen: true,
                                            type: 'semanal_exp',
                                            militarRg: w.rg,
                                            militarName: w.name,
                                            currentDayStr: dayStr,
                                            currentStatus: 'servico'
                                          });
                                        }
                                      }}
                                      className={cn(
                                        "bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded text-[8px] font-bold flex items-center gap-1 transition-colors",
                                        (isAdmin || user.isEscalante) && "hover:bg-red-100 hover:border-red-400 cursor-pointer"
                                      )}
                                      title={(isAdmin || user.isEscalante) ? `Mudar posição / status de ${w.name}` : w.name}
                                    >
                                      {w.isGrd && '🛡️ '}{w.name}
                                      {(isAdmin || user.isEscalante) && <ArrowUpDown className="w-2.5 h-2.5 text-red-600" />}
                                    </button>
                                  ))}
                                </div>
                              )}
                              {expedienteList.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[8px] font-black uppercase text-indigo-600 shrink-0">Expediente:</span>
                                  {expedienteList.map((w, idx) => (
                                    <button 
                                      key={idx}
                                      type="button"
                                      onClick={() => {
                                        if (isAdmin || user.isEscalante) {
                                          setMilitaryMoveModal({
                                            isOpen: true,
                                            type: 'semanal_exp',
                                            militarRg: w.rg,
                                            militarName: w.name,
                                            currentDayStr: dayStr,
                                            currentStatus: 'expediente'
                                          });
                                        }
                                      }}
                                      className={cn(
                                        "bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded text-[8px] font-bold flex items-center gap-1 transition-colors",
                                        (isAdmin || user.isEscalante) && "hover:bg-indigo-100 hover:border-indigo-400 cursor-pointer"
                                      )}
                                      title={(isAdmin || user.isEscalante) ? `Mudar posição / status de ${w.name}` : w.name}
                                    >
                                      {w.name}
                                      {(isAdmin || user.isEscalante) && <ArrowUpDown className="w-2.5 h-2.5 text-indigo-600" />}
                                    </button>
                                  ))}
                                </div>
                              )}
                              {isPreferred && Object.keys(prefDetails).length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200/60">
                                  <span className="text-[8px] font-black uppercase text-red-700 shrink-0">Vagas Prioritárias:</span>
                                  {Object.entries(prefDetails).map(([func, qtRaw]) => {
                                    const qt = typeof qtRaw === 'number' ? qtRaw : Number(qtRaw || 1);
                                    return (
                                      <span key={func} className="bg-red-100/80 text-red-800 border border-red-200 px-1.5 py-0.5 rounded text-[8px] font-bold">
                                        ★ {qt}x {func}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* MODO GRADE / CARDS CLÁSSICO */
              <div className={cn(
                "grid gap-4",
                weeklyFilterDays === 'all' 
                  ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7" 
                  : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
              )}>
                {displayedDays.map(day => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const dayMonthKey = dayStr.substring(0, 7);
                  const dataSource = dayMonthKey === monthKey ? data : (extraMonthData[dayMonthKey] || {});
                  const isToday = isSameDay(day, new Date());
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const alaOfDay = getAlaForDate(day);
                  const alaColor = getAlaColor(alaOfDay);

                  const dayStatus = getDayStatus(activeRg, dayStr);
                  const isPreferred = safeArr(dataSource.selections?.['ESCALANTE_PREF']).includes(dayStr);
                  const prefDetails = (dataSource.preferencesDetails?.[dayStr] || {}) as Record<string, number>;
                  const totalVagas = Object.values(prefDetails).reduce((sum: number, q: number) => sum + Number(q || 0), 0);

                  const { servicoList, expedienteList } = getWorkersForDay(dayStr);
                  const dayDate = new Date(`${dayStr}T12:00:00`);
                  const dayMonday = startOfWeek(dayDate, { weekStartsOn: 1 });
                  const isWeekLocked = isWeeklyLockedForUser(activeRg, dayMonday);
                  const isOrd24hLocked = isOrdinarioLockedForUser(activeRg, dayMonthKey);
                  const isDay24hLocked = isOrd24hLocked && dayStatus.type === 'servico';
                  const canEdit = (isAdmin || user.isEscalante || (!isWeekLocked && !isDay24hLocked && activeRg === (user.rg || user.uid))) && dayStatus.type !== 'afastamento';
                  const hasPermutaForDay = isDay24hLocked && checkDayHasPermuta(activeRg, dayStr, dataSource);

                  return (
                    <div
                      key={dayStr}
                      onClick={() => {
                        if (canEdit) {
                          handleSetWeeklyDayStatus(activeRg, dayStr, 'cycle');
                        } else if (isDay24hLocked && !isAdmin && !user.isEscalante) {
                          if (hasPermutaForDay) {
                            alert("Este dia é um Serviço (24h) homologado via Permuta. Não pode ser alterado diretamente.");
                          } else {
                            alert("Este dia é um S.24h Mensal Homologado. Para trocá-lo, utilize a solicitação de Permuta de Serviço.");
                          }
                        } else if (isWeekLocked && !isAdmin && !user.isEscalante) {
                          alert("O expediente desta semana já foi confirmado e está bloqueado.");
                        }
                      }}
                      className={cn(
                        "relative flex flex-col rounded-xl border-2 transition-all p-3.5 select-none bg-white",
                        canEdit ? "cursor-pointer hover:shadow-md" : "cursor-default",
                        dayStatus.type === 'expediente' && "border-indigo-400 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-300",
                        dayStatus.type === 'servico' && "border-red-400 bg-red-50/50 shadow-sm ring-1 ring-red-300",
                        dayStatus.type === 'folga' && "border-slate-200 hover:border-slate-300",
                        dayStatus.type === 'afastamento' && "border-orange-300 bg-orange-50/60 opacity-90",
                        isToday && "ring-2 ring-indigo-600 ring-offset-2"
                      )}
                    >
                      {/* Cabeçalho do Dia */}
                      <div className="flex items-start justify-between gap-1.5 pb-2 border-b border-slate-100">
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-wider",
                            isWeekend ? "text-amber-700" : "text-slate-500"
                          )}>
                            {format(day, 'EEEE', { locale: ptBR }).split('-')[0]}
                          </span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className={cn(
                              "text-xl font-black leading-none",
                              dayStatus.type === 'expediente' ? "text-indigo-900" : dayStatus.type === 'servico' ? "text-red-900" : "text-slate-800"
                            )}>
                              {format(day, 'dd')}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {format(day, 'MMM', { locale: ptBR })}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          {/* Ala badge */}
                          <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-black text-slate-600">
                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", alaColor)} />
                            <span>Ala {alaOfDay}</span>
                          </div>

                          {/* Tags: Hoje / Fim de Semana */}
                          {isToday && (
                            <span className="text-[8px] font-black uppercase tracking-widest bg-indigo-600 text-white px-1.5 py-0.5 rounded">
                              Hoje
                            </span>
                          )}
                          {isWeekend && !isToday && (
                            <span className="text-[8px] font-bold uppercase tracking-widest bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                              FDS
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Vagas Preferenciais se houver */}
                      {isPreferred && (
                        <div className="my-2 bg-red-100/70 border border-red-200 rounded-lg p-1.5 flex flex-col gap-1">
                          <span className="text-[9px] font-black text-red-700 uppercase tracking-widest flex items-center gap-1">
                            ★ Vaga Prioritária {totalVagas > 0 && `(${totalVagas})`}
                          </span>
                          {Object.entries(prefDetails).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(prefDetails).map(([func, qtRaw]) => {
                                const qt = typeof qtRaw === 'number' ? qtRaw : Number(qtRaw || 1);
                                const parsedFunc = formatPreferenceFunction(func, qt);
                                const isFulfilled = checkNeedFulfilled(func, dayStr, qt);
                                
                                if (isFulfilled) {
                                  return (
                                    <span key={func} className="text-[8px] font-bold bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-300 flex flex-col min-w-0" title={`Suprida por militares escalados: ${qt}x ${func}`}>
                                      <span className="text-[7.5px] text-emerald-600 font-black truncate leading-tight uppercase tracking-wider">Necessidade Suprida</span>
                                      <span className="text-[9px] text-emerald-950 font-black truncate leading-tight line-through opacity-70">{parsedFunc.line2}</span>
                                    </span>
                                  );
                                }
                                
                                return (
                                  <span key={func} className="text-[8px] font-bold bg-white text-red-800 px-1.5 py-0.5 rounded border border-red-200 flex flex-col min-w-0" title={`${qt}x ${func}`}>
                                    <span className="text-[7.5px] text-red-600 font-bold truncate leading-tight">{parsedFunc.line1}</span>
                                    <span className="text-[9px] text-red-950 font-black truncate leading-tight">{parsedFunc.line2}</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Status Atual do Militar */}
                      <div className="my-3 flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-colors min-h-[70px] bg-slate-50/50">
                        {dayStatus.type === 'expediente' ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1.5 text-indigo-700 font-black text-xs uppercase tracking-wider">
                              <Briefcase className="w-3.5 h-3.5" /> EXPEDIENTE
                            </div>
                            <span className="text-[9px] font-bold text-indigo-500">08h às 17h</span>
                          </div>
                        ) : dayStatus.type === 'servico' ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1.5 text-red-700 font-black text-xs uppercase tracking-wider">
                              <Shield className="w-3.5 h-3.5 text-red-600" /> SERVIÇO 24H
                            </div>
                            <span className="text-[9px] font-bold text-red-500">09h às 09h</span>
                            {isOrd24hLocked && (isAdmin || user.isEscalante) && (
                              <span className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded border flex items-center gap-1 mt-0.5", dayStatus.isPermuta ? "text-purple-700 bg-purple-100 border-purple-200" : "text-red-700 bg-red-100 border-red-200")}>
                                <Lock className="w-2.5 h-2.5" /> {dayStatus.isPermuta ? dayStatus.text : "S.24h Mensal Homologado"}
                              </span>
                            )}
                          </div>
                        ) : dayStatus.type === 'afastamento' ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1.5 text-orange-700 font-black text-xs uppercase tracking-wider">
                              <AlertCircle className="w-3.5 h-3.5" /> {dayStatus.text}
                            </div>
                            <span className="text-[9px] font-bold text-orange-600">Afastamento</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1.5 text-slate-500 font-black text-xs uppercase tracking-wider">
                              <Coffee className="w-3.5 h-3.5 text-slate-400" /> FOLGA
                            </div>
                            <span className="text-[9px] font-bold text-slate-400">Sem escala</span>
                          </div>
                        )}
                      </div>

                      {/* Controles Rápidos: Botões EXP / SV / FOLGA ou aviso de bloqueio */}
                      {canEdit ? (
                        <div 
                          className="grid grid-cols-3 gap-1 mb-3 pt-1 border-t border-slate-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleSetWeeklyDayStatus(activeRg, dayStr, 'expediente')}
                            className={cn(
                              "py-1.5 px-1 rounded text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-0.5 transition-colors cursor-pointer",
                              dayStatus.type === 'expediente'
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                            )}
                            title="Marcar como Expediente"
                          >
                            {dayStatus.type === 'expediente' && <Check className="w-2.5 h-2.5" />} EXP
                          </button>
                          <button
                            onClick={() => {
                              if (isOrd24hLocked && !isAdmin && !user.isEscalante) {
                                alert("A escala ordinária (24h) deste mês já está fechada. Apenas o Escalante pode alterar serviços operacionais de 24h.");
                                return;
                              }
                              handleSetWeeklyDayStatus(activeRg, dayStr, 'servico');
                            }}
                            className={cn(
                              "py-1.5 px-1 rounded text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-0.5 transition-colors cursor-pointer",
                              dayStatus.type === 'servico'
                                ? "bg-red-600 text-white shadow-sm"
                                : isOrd24hLocked && !isAdmin && !user.isEscalante
                                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                  : "bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-700"
                            )}
                            title={isOrd24hLocked && !isAdmin && !user.isEscalante ? "Escala 24h fechada" : "Marcar como Serviço"}
                          >
                            {dayStatus.type === 'servico' && <Check className="w-2.5 h-2.5" />} SV
                          </button>
                          <button
                            onClick={() => handleSetWeeklyDayStatus(activeRg, dayStr, 'folga')}
                            className={cn(
                              "py-1.5 px-1 rounded text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-0.5 transition-colors cursor-pointer",
                              dayStatus.type === 'folga'
                                ? "bg-slate-700 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                            title="Marcar como Folga"
                          >
                            {dayStatus.type === 'folga' && <Check className="w-2.5 h-2.5" />} FOLGA
                          </button>
                        </div>
                      ) : (
                        <div className="mb-3 pt-1 border-t border-slate-100 text-center text-[9px] font-bold">
                          {isDay24hLocked && !isAdmin && !user.isEscalante ? (
                            <div 
                              className={cn(
                                "py-1 px-1.5 rounded text-[9px] font-black flex items-center justify-center gap-1 shadow-2xs",
                                hasPermutaForDay 
                                  ? "bg-purple-50 border border-purple-200 text-purple-700" 
                                  : "bg-red-50 border border-red-200 text-red-700"
                              )}
                              title={hasPermutaForDay ? "Serviço 24h assumido via Permuta Homologada" : "Serviço 24h Ordinário escolhido no Calendário Mensal e Homologado"}
                            >
                              <Shield className={cn("w-3 h-3 shrink-0", hasPermutaForDay ? "text-purple-600" : "text-red-600")} />
                              <span>{dayStatus.isPermuta ? dayStatus.text : "S.24h Mensal Homologado"}</span>
                            </div>
                          ) : isWeekLocked && !isAdmin && !user.isEscalante ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenWeeklyChangeModal();
                              }}
                              className="w-full py-1 px-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded text-amber-800 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              title="Clique para solicitar alteração desta semana ao escalante"
                            >
                              <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Semana Homologada (Solicitar)</span>
                            </button>
                          ) : (
                            dayStatus.type === 'afastamento' && (
                              <div className="py-1 px-1.5 bg-orange-50 border border-orange-200 rounded text-orange-700 flex items-center justify-center gap-1">
                                <AlertCircle className="w-3 h-3 text-orange-600 shrink-0" />
                                <span>Afastamento</span>
                              </div>
                            )
                          )}
                        </div>
                      )}

                      {/* Efetivo Escalado neste dia */}
                      <div 
                        className="mt-auto pt-2 border-t border-slate-100 flex flex-col gap-1 text-[9px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between text-slate-400 font-bold uppercase tracking-widest text-[8px]">
                          <span>Efetivo no Dia</span>
                          <span>{servicoList.length + expedienteList.length}</span>
                        </div>

                        {servicoList.length > 0 && (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-black text-red-600 uppercase text-[8px]">
                              Serviço ({servicoList.length}):
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {servicoList.slice(0, 3).map((w, idx) => (
                                <span 
                                  key={idx} 
                                  className="bg-red-50 text-red-700 border border-red-200 px-1 py-0.5 rounded font-bold text-[8px] truncate max-w-full"
                                  title={w.name}
                                >
                                  {w.isGrd && '🛡️ '}{w.name}
                                </span>
                              ))}
                              {servicoList.length > 3 && (
                                <span className="text-[8px] font-black text-slate-400 self-center">
                                  +{servicoList.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {expedienteList.length > 0 && (
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            <span className="font-black text-indigo-600 uppercase text-[8px]">
                              Expediente ({expedienteList.length}):
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {expedienteList.slice(0, 3).map((w, idx) => (
                                <span 
                                  key={idx} 
                                  className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-1 py-0.5 rounded font-bold text-[8px] truncate max-w-full"
                                  title={w.name}
                                >
                                  {w.name}
                                </span>
                              ))}
                              {expedienteList.length > 3 && (
                                <span className="text-[8px] font-black text-slate-400 self-center">
                                  +{expedienteList.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {servicoList.length === 0 && expedienteList.length === 0 && (
                          <span className="text-slate-400 italic text-[8px]">Nenhum militar registrado</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};
