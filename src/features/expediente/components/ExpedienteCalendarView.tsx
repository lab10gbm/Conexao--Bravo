import React from 'react';
import { motion } from 'framer-motion';
import { format, isSameMonth, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  AlertCircle, Check, Shield, CheckCircle2, UserPlus, 
  User, Save, Lock, ArrowUpDown 
} from 'lucide-react';
import { setDoc } from 'firebase/firestore';
import { cn, cleanUndefined } from '../../../lib/utils';
import { UserProfile } from '../../../types';
import { ExpedienteData } from '../types';
import { safeArr } from '../lib/expedienteCalculos';

interface ExpedienteCalendarViewProps {
  currentMonthDays: Date[];
  currentMonth: Date;
  data: ExpedienteData;
  setData: React.Dispatch<React.SetStateAction<ExpedienteData>>;
  monthDocRef: any;
  monthKey: string;
  isAdmin: boolean;
  user: UserProfile;
  setViewMode: (mode: any) => void;
  checkNeedFulfilled: (func: string, dayStr: string, qt: number) => boolean;
  handleToggleDay: (day: Date) => void;
  weekdays: string[];
  days: Date[];
  activeRg: string;
  expedienteUsers: UserProfile[];
  splitMilitaryRankAndWarName: (found?: UserProfile | null, rawFallbackName?: string) => { rank: string; name: string };
  formatMilitaryName: (name: string) => string;
  getAlaForDate: (date: Date) => string | number;
  getAlaLightColor: (ala: string | number) => string;
  getAlaColor: (ala: string | number) => string;
  setQuickAddSearch: React.Dispatch<React.SetStateAction<string>>;
  setQuickAddModal: React.Dispatch<React.SetStateAction<any>>;
  formatPreferenceFunction: (func: string, qt: number) => { line1: string; line2: string };
  isExp: boolean;
  activeMilitaryName: string;
  adminTargetRg: string | null;
  setAdminTargetRg: React.Dispatch<React.SetStateAction<string | null>>;
  userSels: string[];
  userReq: number;
  progress: number;
  getExpQuota: (rg: string) => number;
  isOrdinarioLockedForUser: (rg: string, monthKey: string) => boolean;
  confirmLock: boolean;
  setConfirmLock: React.Dispatch<React.SetStateAction<boolean>>;
  setShowSwapModal: React.Dispatch<React.SetStateAction<boolean>>;
  getReqAmount: (rg: string) => number;
  getRegime: (rg: string) => string;
  getSector: (rg: string) => string;
}

export const ExpedienteCalendarView: React.FC<ExpedienteCalendarViewProps> = ({
  currentMonthDays,
  currentMonth,
  data,
  setData,
  monthDocRef,
  monthKey,
  isAdmin,
  user,
  setViewMode,
  checkNeedFulfilled,
  handleToggleDay,
  weekdays,
  days,
  activeRg,
  expedienteUsers,
  splitMilitaryRankAndWarName,
  formatMilitaryName,
  getAlaForDate,
  getAlaLightColor,
  getAlaColor,
  setQuickAddSearch,
  setQuickAddModal,
  formatPreferenceFunction,
  isExp,
  activeMilitaryName,
  adminTargetRg,
  setAdminTargetRg,
  userSels,
  userReq,
  progress,
  getExpQuota,
  isOrdinarioLockedForUser,
  confirmLock,
  setConfirmLock,
  setShowSwapModal,
  getReqAmount,
  getRegime,
  getSector,
}) => {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Calendar Column */}
      <div className="flex-1 bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-2 sm:p-4 flex-1 flex flex-col overflow-y-auto sm:overflow-visible bg-slate-50 sm:bg-transparent">
          <div className="flex flex-col flex-1 pb-1">
            {(() => {
              const preferredDays = currentMonthDays.filter(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const isPreferred = safeArr(data.selections['ESCALANTE_PREF']).includes(dayStr);
                if (!isPreferred) return false;
                const details = data.preferencesDetails?.[dayStr] || {};
                const totalVagas = Object.values(details).reduce((sum, qt) => sum + qt, 0);
                return totalVagas > 0;
              });
              
              if (preferredDays.length === 0) return null;
              
              return (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3 text-red-500" /> Vagas Preferenciais
                    </span>
                    {(isAdmin || user.isEscalante) && (
                      <button 
                        onClick={() => setViewMode('necessidades')}
                        className="text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        Ver Detalhes
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {preferredDays.map(day => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const details = data.preferencesDetails?.[dayStr] || {};
                      const needs = Object.entries(details);
                      const totalVagas = needs.reduce((sum, [_, qt]) => sum + (typeof qt === 'number' ? qt : Number(qt || 1)), 0);
                      
                      const isAllFulfilled = needs.length > 0 && needs.every(([func, qtRaw]) => {
                        const qt = typeof qtRaw === 'number' ? qtRaw : Number(qtRaw || 1);
                        return checkNeedFulfilled(func, dayStr, qt);
                      });

                      return (
                        <button 
                          key={dayStr}
                          onClick={() => handleToggleDay(day)}
                          className={cn(
                            "relative flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-colors py-2 px-3 min-w-[54px] sm:min-w-[64px]",
                            isAllFulfilled ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100" : "border-red-200 bg-red-50 hover:bg-red-100"
                          )}
                          title={isAllFulfilled ? "Todas as necessidades supridas!" : `${totalVagas} necessidades pendentes`}
                        >
                          <span className={cn("text-sm font-black leading-none mb-0.5", isAllFulfilled ? "text-emerald-800" : "text-red-800")}>{format(day, 'dd')}</span>
                          <span className={cn("text-[9px] font-bold uppercase tracking-widest leading-none", isAllFulfilled ? "text-emerald-600" : "text-red-600")}>{format(day, 'MMM', {locale: ptBR})}</span>
                          <div className={cn(
                            "absolute -top-1.5 -right-1.5 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-sm",
                            isAllFulfilled ? "bg-emerald-500" : "bg-red-500"
                          )}>
                            {isAllFulfilled ? <Check className="w-2.5 h-2.5" strokeWidth={4} /> : totalVagas}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="hidden sm:grid grid-cols-7 mb-2 px-1 text-center">
              {weekdays.map((wd) => (
                <div key={wd} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {wd}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 sm:gap-2 flex-1">
              {days.map((day) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const outsideMonth = !isSameMonth(day, currentMonth);
                const isToday = isSameDay(day, new Date());
                const isTargetUserSelected = activeRg && safeArr(data.selections[activeRg]).includes(dayStr);
                const isPreferredDate = safeArr(data.selections['ESCALANTE_PREF']).includes(dayStr);
                const isGrd = activeRg && data.grdData?.[dayStr]?.includes(activeRg);
                
                const workersOnThisDay = Object.entries(data.selections)
                  .filter(([rg, sels]: [string, any]) => rg !== 'ESCALANTE_PREF' && Array.isArray(sels) && sels.includes(dayStr))
                  .map(([rg, _]) => {
                    const found = expedienteUsers.find(u => (u.rg || u.uid) === rg);
                    const parsed = splitMilitaryRankAndWarName(found, data.userNames?.[rg]);
                    return {
                      rg,
                      rank: parsed.rank,
                      name: parsed.name,
                      fullName: found?.name || data.userNames?.[rg] || `${parsed.rank} ${parsed.name}`.trim(),
                      isGrd: !!(data.grdData?.[dayStr]?.includes(rg))
                    };
                  });

                const alaOfDay = getAlaForDate(day);
                const alaLightColorClass = getAlaLightColor(alaOfDay);
                const alaPointColorClass = getAlaColor(alaOfDay);
                
                return (
                  <motion.div 
                    key={day.toISOString()}
                    whileHover={!outsideMonth ? { scale: 1.02 } : {}}
                    onClick={() => !outsideMonth && handleToggleDay(day)}
                    className={cn(
                      "relative flex flex-col p-3 sm:p-2 border-2 rounded-xl sm:rounded-lg transition-all sm:min-h-[120px]",
                      outsideMonth 
                        ? "hidden sm:flex opacity-30 bg-slate-50 border-transparent cursor-default pointer-events-none text-slate-400" 
                        : isPreferredDate && !isTargetUserSelected ? "border-red-200 cursor-pointer bg-red-50 hover:border-red-300 shadow-sm sm:shadow-none"
                        : isTargetUserSelected ? "bg-indigo-50 border-indigo-500 shadow-md sm:shadow-sm" 
                        : cn(alaLightColorClass, "cursor-pointer hover:border-indigo-300 shadow-sm sm:shadow-none"),
                      isToday && !outsideMonth && "ring-2 ring-indigo-500 ring-offset-2"
                    )}
                  >
                    <div className="flex justify-between items-center sm:items-start mb-2 sm:mb-1.5">
                      <div className="flex items-center gap-2 border-b-0 pb-0">
                        {isGrd && <Shield className="w-5 h-5 sm:w-4 sm:h-4 text-emerald-600 fill-emerald-100" />}
                        <span className={cn(
                          "text-base sm:text-sm font-black text-slate-700",
                          isTargetUserSelected && "text-indigo-700",
                          isPreferredDate && !isTargetUserSelected && "text-red-700"
                        )}>
                          {format(day, 'd')}
                        </span>
                        {!outsideMonth && (
                          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", alaPointColorClass)} title={`Ala ${alaOfDay}`} />
                        )}
                        <span className="text-[11px] font-black text-slate-400 sm:hidden uppercase tracking-widest">
                          {format(day, 'EEEE', {locale: ptBR}).split('-')[0]}
                        </span>
                      </div>
                      {!outsideMonth && (
                        <div className="flex items-center gap-1">
                          {(isAdmin || user.isEscalante) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuickAddSearch('');
                                setQuickAddModal({
                                  isOpen: true,
                                  type: 'mensal_s24h',
                                  dayStr
                                });
                              }}
                              className="p-1 rounded-md bg-white/90 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-400 text-slate-500 hover:text-indigo-700 transition-colors shadow-2xs cursor-pointer"
                              title={`Adicionar/escalar militar no serviço 24h deste dia (${format(day, 'dd/MM')})`}
                            >
                              <UserPlus className="w-3 h-3" />
                            </button>
                          )}
                          <span className="text-[18px] sm:text-[14px] leading-none text-red-500">
                            {isPreferredDate && "★"}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {!outsideMonth && (
                      <div className="flex flex-col gap-2 sm:gap-1.5 mt-1 sm:mt-auto">
                        {(safeArr(data.selections['ESCALANTE_PREF']).includes(dayStr)) && Object.entries(data.preferencesDetails?.[dayStr] || {}).length > 0 && (
                          <div className="flex flex-col gap-1.5 sm:gap-1 w-full min-w-0">
                            {Object.entries(data.preferencesDetails?.[dayStr] || {}).map(([func, qtRaw]) => {
                              const qt = typeof qtRaw === "number" ? qtRaw : Number(qtRaw || 1);
                              const parsedFunc = formatPreferenceFunction(func, qt);
                              const isFulfilled = checkNeedFulfilled(func, dayStr, qt);
                              
                              if (isFulfilled) {
                                return (
                                  <span 
                                    key={func} 
                                    className="w-full text-left bg-emerald-100/90 text-emerald-800 border border-emerald-300/90 px-2 py-1 sm:px-1.5 sm:py-1 rounded-md uppercase cursor-help max-w-full flex flex-col justify-center shadow-xs transition-colors hover:bg-emerald-200/80" 
                                    title={`Suprida por militares escalados: ${qt}x ${func}`}
                                  >
                                    <span className="flex items-center gap-1 text-[8px] sm:text-[7.5px] font-black text-emerald-700 leading-tight truncate tracking-wider">
                                      <span className="truncate">NECESSIDADE SUPRIDA</span>
                                    </span>
                                    <span className="text-[10px] sm:text-[9.5px] font-black text-emerald-950 leading-tight truncate tracking-tight mt-0.5 line-through opacity-70">
                                      {parsedFunc.line2}
                                    </span>
                                  </span>
                                );
                              }

                              return (
                                <span 
                                  key={func} 
                                  className="w-full text-left bg-red-100/90 text-red-800 border border-red-200/90 px-2 py-1 sm:px-1.5 sm:py-1 rounded-md uppercase cursor-help max-w-full flex flex-col justify-center shadow-xs transition-colors hover:bg-red-200/80" 
                                  title={`${qt}x ${func}`}
                                >
                                  <span className="flex items-center gap-1 text-[8px] sm:text-[7.5px] font-bold text-red-700 leading-tight truncate">
                                    <span className="truncate">{parsedFunc.line1}</span>
                                  </span>
                                  <span className="text-[10px] sm:text-[9.5px] font-black text-red-950 leading-tight truncate tracking-tight mt-0.5">
                                    {parsedFunc.line2}
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {workersOnThisDay.length > 0 && (
                          <div className="flex flex-col gap-1.5 sm:gap-1 sm:mt-1 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0 w-full min-w-0">
                            {workersOnThisDay.map((w, i) => (
                              <span 
                                key={i} 
                                className={cn(
                                  "w-full text-left bg-slate-800 text-white px-2 py-1 sm:px-1.5 sm:py-1 rounded-md uppercase cursor-help max-w-full flex flex-col justify-center shadow-xs transition-all hover:bg-slate-900 border border-slate-700/60 hover:border-slate-500",
                                  i >= 5 ? "hidden" : ""
                                )} 
                                title={`${w.rank ? w.rank + ' ' : ''}${w.fullName || w.name}`}
                              >
                                {w.rank ? (
                                  <>
                                    <span className="flex items-center gap-1 text-[8px] sm:text-[7.5px] font-bold text-slate-300 leading-tight truncate">
                                      {w.isGrd && <Shield className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400 shrink-0" />}
                                      <span className="truncate">{w.rank}</span>
                                    </span>
                                    <span className="text-[10px] sm:text-[9.5px] font-black text-white leading-tight truncate tracking-tight">
                                      {w.name}
                                    </span>
                                  </>
                                ) : (
                                  <span className="flex items-center gap-1 text-[9.5px] sm:text-[9px] font-black text-white leading-tight truncate">
                                    {w.isGrd && <Shield className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400 shrink-0" />}
                                    <span className="truncate">{w.name}</span>
                                  </span>
                                )}
                              </span>
                            ))}
                            {workersOnThisDay.length > 5 && (
                              <span className="text-[10px] sm:text-[9px] font-black text-slate-500 px-1 py-1">+ {workersOnThisDay.length - 5}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {!outsideMonth && isTargetUserSelected && (
                      <div className="absolute top-2 right-2 sm:top-2 sm:right-2 flex items-center justify-center p-1 sm:p-0.5 bg-indigo-500 text-white rounded-full shadow-sm">
                        <CheckCircle2 className="w-4 h-4 sm:w-4 sm:h-4" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legend / Status Column */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        {/* User Status Card */}
        {(isExp || isAdmin || user.isEscalante) && user.rg && (
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl p-4 text-white shadow-md relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
            <div className="flex flex-col gap-2 mb-3">
              <div className="flex justify-between items-start">
                <h3 className="font-black text-[11px] uppercase tracking-widest flex items-center gap-1.5 shrink-0">
                  <User className="w-3.5 h-3.5" /> {activeMilitaryName}
                </h3>
                {activeRg && typeof data.regimes?.[activeRg] === 'string' && data.regimes[activeRg] !== '' && (
                  <span className="text-[8px] font-black bg-white/20 px-1.5 py-0.5 rounded uppercase tracking-tighter truncate max-w-[120px] text-right ml-2 leading-tight">
                    {data.regimes[activeRg] as string}
                  </span>
                )}
              </div>
              {(isAdmin || user.isEscalante) && (
                <select
                  className="w-full mt-1 bg-white/10 border border-white/20 text-white text-[10px] font-bold p-1.5 rounded outline-none cursor-pointer hover:bg-white/20 transition-colors"
                  value={adminTargetRg || ''}
                  onChange={(e) => setAdminTargetRg(e.target.value || null)}
                >
                  <option value="" className="text-slate-800">Você (Default)</option>
                  <optgroup label="Preferências (Escalante)" className="text-slate-800">
                    <option value="ESCALANTE_PREF" className="text-red-700 font-bold bg-red-50">★ DATAS PREFERENCIAIS</option>
                  </optgroup>
                  {(isAdmin || user.isEscalante) && (
                    <optgroup label="Militares do Expediente" className="text-slate-800">
                      {expedienteUsers.filter(u => (u.rg || u.uid) !== 'ESCALANTE_PREF').map((u, i) => {
                        const val = u.rg || u.uid || `usr-${i}`;
                        return <option key={`opt-${val}`} value={val}>{formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name)}</option>
                      })}
                    </optgroup>
                  )}
                </select>
              )}
            </div>
            
            <div className="flex items-end gap-1.5 mb-2">
              <span className="text-3xl font-black leading-none">{userSels.length}</span>
              {activeRg !== 'ESCALANTE_PREF' && <span className="text-sm font-bold opacity-80 leading-snug">/ {userReq}</span>}
              <span className="text-[9px] font-black uppercase tracking-widest opacity-70 ml-auto mb-1 border border-white/20 px-1.5 py-0.5 rounded">
                {activeRg === 'ESCALANTE_PREF' ? 'Datas Preferenciais' : 'Serviços (24h)'}
              </span>
            </div>
            
            {activeRg !== 'ESCALANTE_PREF' && (
              <div className="w-full bg-black/20 rounded-full h-1.5 mb-2.5">
                <div className="bg-green-400 h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, progress)}%` }}></div>
              </div>
            )}

            {activeRg && activeRg !== 'ESCALANTE_PREF' && getExpQuota(activeRg) > 0 && (
              <div className="flex items-center justify-between text-[10px] font-bold bg-white/10 px-2.5 py-1 rounded mb-2.5 border border-white/10">
                <span className="opacity-80">Cota Semanal Expediente:</span>
                <span className="font-black text-indigo-200">{getExpQuota(activeRg)} EXP/sem</span>
              </div>
            )}
            
            {activeRg === 'ESCALANTE_PREF' ? (
              <p className="text-[9px] font-bold text-red-200 flex items-start gap-1 leading-tight mt-2">
                <AlertCircle className="w-3 h-3 shrink-0 text-red-300" />
                Marque no calendário as datas sugeridas para este mês.
              </p>
            ) : userReq === 0 ? (
              <p className="text-[9px] font-bold text-amber-200 flex items-start gap-1 leading-tight">
                <AlertCircle className="w-3 h-3 shrink-0" />
                Aguardando adm definir vagas.
              </p>
            ) : userSels.length >= userReq ? (
              <p className="text-[9px] font-bold text-green-300 flex items-center gap-1 object-center">
                <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" /> Cota cumprida.
              </p>
            ) : (
              <p className="text-[9px] font-bold opacity-80 uppercase tracking-wide">
                Mais {userReq - userSels.length} dia{userReq - userSels.length > 1 ? 's' : ''}.
              </p>
            )}

            {activeRg && activeRg !== 'ESCALANTE_PREF' && userReq > 0 && (
              <div className="mt-4 pt-3 border-t border-white/20">
                {!isOrdinarioLockedForUser(activeRg, monthKey) ? (
                  userSels.length >= userReq ? (
                    !confirmLock ? (
                      <button 
                        onClick={() => setConfirmLock(true)}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm"
                      >
                        <Save className="w-3.5 h-3.5" /> Enviar Escolhas (Escala 24h)
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] text-white/80 font-bold text-center">Confirmar o envio definitivo da escala 24h?</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setConfirmLock(false)}
                            className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border border-white/20"
                          >
                            Cancelar
                          </button>
                          <button 
                            onClick={async () => {
                              const newMonthData = {
                                lockedOrdinario: {
                                  [activeRg!]: true
                                },
                                locked: {
                                  [activeRg!]: true
                                }
                              };
                              setData(prev => ({
                                ...prev,
                                lockedOrdinario: {
                                  ...(prev.lockedOrdinario || {}),
                                  [activeRg!]: true
                                },
                                locked: {
                                  ...(prev.locked || {}),
                                  [activeRg!]: true
                                }
                              }));
                              await setDoc(monthDocRef, cleanUndefined(newMonthData), { merge: true });
                              setConfirmLock(false);
                            }}
                            className="flex-1 bg-green-500 hover:bg-green-400 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm"
                          >
                            SIM, ENVIAR
                          </button>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="bg-amber-500/20 border border-amber-500/40 rounded-lg p-2.5 text-center flex flex-col gap-1">
                      <span className="text-[10px] font-black text-amber-200 uppercase tracking-wider">
                        Cota: {userSels.length} de {userReq} serviço{userReq > 1 ? 's' : ''}
                      </span>
                      <span className="text-[9px] text-amber-100/90 font-medium leading-snug">
                        Selecione mais {userReq - userSels.length} dia{userReq - userSels.length > 1 ? 's' : ''} no calendário para completar antes de enviar.
                      </span>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="bg-green-500/20 border border-green-500/30 rounded p-2 flex items-center justify-center gap-2 text-green-100 text-[10px] font-bold uppercase text-center">
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                      <span>Escala 24h Confirmada ({userSels.length}/{userReq})</span>
                    </div>
                    {(isAdmin || user.isEscalante) && (
                      <button
                        onClick={async () => {
                          const newMonthData = {
                            lockedOrdinario: {
                              [activeRg!]: false
                            },
                            locked: {
                              [activeRg!]: false
                            }
                          };
                          setData(prev => ({
                            ...prev,
                            lockedOrdinario: {
                              ...(prev.lockedOrdinario || {}),
                              [activeRg!]: false
                            },
                            locked: {
                              ...(prev.locked || {}),
                              [activeRg!]: false
                            }
                          }));
                          await setDoc(monthDocRef, cleanUndefined(newMonthData), { merge: true });
                        }}
                        className="w-full flex items-center justify-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors border border-amber-500/30 cursor-pointer"
                        title="Desbloquear escala 24h para edição"
                      >
                        <Lock className="w-3 h-3" /> Desbloquear 24h (Admin)
                      </button>
                    )}
                    <button 
                      onClick={() => setShowSwapModal(true)}
                      className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors border border-white/20"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" /> Solicitar Troca do Dia de Serviço (24h)
                    </button>
                  </div>
                )}

                {/* Display user's own pending swap requests */}
                {data.swapRequests && data.swapRequests.some(r => r.rg === activeRg && r.status === 'pending') && (
                  <div className="mt-4 flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest text-center border-b border-white/10 pb-1">Permutas Pendentes</span>
                    {data.swapRequests.filter(r => r.rg === activeRg && r.status === 'pending').map(req => (
                      <div key={req.id} className="bg-white/5 border border-white/10 rounded-lg p-2.5 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-white">
                          <div className="flex items-center gap-1.5 w-full justify-center">
                            <span className="text-red-300">{format(new Date(`${req.fromDay}T12:00:00`), 'dd/MM')}</span>
                            <ArrowUpDown className="w-3 h-3 text-white/50 rotate-90" />
                            <span className="text-green-300">{format(new Date(`${req.toDay}T12:00:00`), 'dd/MM')}</span>
                          </div>
                        </div>
                        <button 
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const updatedRequests = data.swapRequests!.filter(r => r.id !== req.id);
                            await setDoc(monthDocRef, cleanUndefined({ swapRequests: updatedRequests }), { merge: true });
                          }}
                          className="w-full py-1.5 bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-200 text-[9px] font-black uppercase tracking-widest rounded transition-colors mt-1 z-20 relative cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Legend Panel */}
        <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm flex flex-col flex-1 max-h-[600px] overflow-hidden">
          <div className="p-4 border-b-2 border-slate-100">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-800 flex justify-between items-center">
              Militares do Expediente
            </h3>
          </div>
          <div className="flex flex-col flex-1 overflow-y-auto p-4 gap-6 custom-scrollbar">
            {expedienteUsers.length === 0 && (
              <div className="text-center py-4 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                <p className="text-[10px] font-black opacity-50 uppercase tracking-widest text-slate-500">Nenhum militar do expediente encontrado</p>
              </div>
            )}
            
            {(() => {
              const activeMembers = expedienteUsers.filter(u => u.rg !== 'ESCALANTE_PREF');

              const hasPendingSwap = (u: any) => {
                const rg = u.rg || u.uid;
                return data.swapRequests?.some(r => r.rg === rg && r.status === 'pending');
              };

              const swappingMembers = activeMembers.filter(hasPendingSwap);

              const completedMembers = activeMembers.filter(u => {
                if (hasPendingSwap(u)) return false;
                const rg = u.rg || u.uid;
                const reqAmount = getReqAmount(rg);
                const sels = safeArr(data.selections[rg]);
                const regime = getRegime(rg);
                const isExento = reqAmount === 0 && (regime.includes('Readaptado') || regime.includes('Redução'));
                return isExento || (reqAmount > 0 && sels.length >= reqAmount);
              });

              const pendingMembers = activeMembers.filter(u => {
                if (hasPendingSwap(u)) return false;
                const rg = u.rg || u.uid;
                const reqAmount = getReqAmount(rg);
                const sels = safeArr(data.selections[rg]);
                const regime = getRegime(rg);
                const isExento = reqAmount === 0 && (regime.includes('Readaptado') || regime.includes('Redução'));
                return !isExento && !(reqAmount > 0 && sels.length >= reqAmount);
              });

              const renderMember = (u: UserProfile) => {
                const rg = u.rg || u.uid;
                const reqAmount = getReqAmount(rg);
                const sels = safeArr(data.selections[rg]);
                const sector = getSector(rg);
                const regime = getRegime(rg);
                const isExento = reqAmount === 0 && (regime.includes('Readaptado') || regime.includes('Redução'));
                const isComplete = isExento || (reqAmount > 0 && sels.length >= reqAmount);
                
                return (
                  <div key={rg} className="flex flex-col p-3 rounded-lg border border-slate-100 bg-slate-50 relative">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col leading-tight mr-2">
                        <span className="text-[12px] font-black text-slate-800">{formatMilitaryName(u.rank ? `${u.rank} ${u.warName || u.name.split(' ')[0]}` : u.name)}</span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">RG: {rg}</span>
                          {sector && <span className="text-[9px] font-black text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded shadow-sm">{sector}</span>}
                          {regime && <span className="text-[8px] font-black text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded uppercase tracking-tighter">{regime}</span>}
                        </div>
                      </div>
                      
                      <div className={cn("text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm shrink-0", isComplete ? (isExento ? "bg-slate-300 text-slate-700" : "bg-green-100 text-green-700") : "bg-amber-100 text-amber-700")}>
                        {isExento ? "DTS" : `${sels.length} / ${reqAmount > 0 ? reqAmount : '?'}`}
                      </div>
                    </div>
                    
                    {!isExento && reqAmount > 0 && (
                      <div className="w-full bg-slate-200 rounded-full h-1 mt-1">
                        <div className={cn("h-1 rounded-full", isComplete ? "bg-green-500" : "bg-amber-500")} style={{ width: `${reqAmount > 0 ? Math.min(100, (sels.length / reqAmount) * 100) : 0}%` }}></div>
                      </div>
                    )}
                  </div>
                );
              };

              return (
                <>
                  {swappingMembers.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest border-b border-orange-100 pb-1 flex items-center gap-2">
                        <ArrowUpDown className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                        Solicitando Troca ({swappingMembers.length})
                      </h4>
                      {swappingMembers.map(renderMember)}
                    </div>
                  )}
                  
                  {pendingMembers.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest border-b border-amber-100 pb-1 flex items-center gap-2 mt-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                        Com Pendências ({pendingMembers.length})
                      </h4>
                      {pendingMembers.map(renderMember)}
                    </div>
                  )}
                  
                  {completedMembers.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <h4 className="text-[10px] font-black text-green-600 uppercase tracking-widest border-b border-green-100 pb-1 flex items-center gap-2 mt-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Sem Pendências ({completedMembers.length})
                      </h4>
                      {completedMembers.map(renderMember)}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
        
        {/* Escalante Admin Panel for Swap Requests */}
        {(isAdmin || user.isEscalante) && data.swapRequests && data.swapRequests.length > 0 && (
          <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm flex flex-col mt-6 overflow-hidden">
            <div className="p-4 border-b-2 border-slate-100 bg-amber-50">
              <h3 className="font-black text-sm uppercase tracking-widest text-amber-800 flex justify-between items-center">
                Solicitações de Permuta
              </h3>
            </div>
            <div className="flex flex-col p-4 gap-3 max-h-[300px] overflow-y-auto">
              {data.swapRequests.map(req => (
                <div key={req.id} className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black text-slate-800">{req.userName}</span>
                    <span className={cn(
                      "text-[9px] font-black uppercase px-2 py-0.5 rounded",
                      req.status === 'pending' ? "bg-amber-100 text-amber-700" :
                      req.status === 'approved' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                      {req.status === 'pending' ? 'Pendente' : req.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                    <span className="text-red-500 line-through">{format(new Date(`${req.fromDay}T12:00:00`), 'dd/MM (eee)', {locale: ptBR})}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400 rotate-90" />
                    <span className="text-green-600">{format(new Date(`${req.toDay}T12:00:00`), 'dd/MM (eee)', {locale: ptBR})}</span>
                  </div>
                  {req.status === 'pending' && (
                    <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200">
                      <button 
                        onClick={async () => {
                          // Approve
                          const userSelsArr = safeArr(data.selections[req.rg]);
                          if (!userSelsArr.includes(req.fromDay)) {
                            alert("O militar não possui mais o serviço original agendado. Permuta não pode ser concluída.");
                            return;
                          }
                          
                          const updatedRequests = data.swapRequests!.map(r => r.id === req.id ? { ...r, status: 'approved' as const } : r);
                          
                          // Update selections
                          const newSels = userSelsArr.filter(d => d !== req.fromDay);
                          if (!newSels.includes(req.toDay)) newSels.push(req.toDay);

                          const newMonthData = {
                            swapRequests: updatedRequests,
                            selections: {
                              [req.rg]: newSels
                            }
                          };
                          await setDoc(monthDocRef, cleanUndefined(newMonthData), { merge: true });
                        }}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white text-[9px] font-black uppercase py-1.5 rounded transition-colors"
                      >
                        Aprovar
                      </button>
                      <button 
                        onClick={async () => {
                          // Reject
                          const updatedRequests = data.swapRequests!.map(r => r.id === req.id ? { ...r, status: 'rejected' as const } : r);
                          await setDoc(monthDocRef, cleanUndefined({ swapRequests: updatedRequests }), { merge: true });
                        }}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white text-[9px] font-black uppercase py-1.5 rounded transition-colors"
                      >
                        Rejeitar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
