import React from 'react';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Trash2, X, Search } from 'lucide-react';
import { cn, getAlaForDate, getAlaLightColor, getThemeColors, getOppositeAla } from '../../../lib/utils';
import { parseRank, sortAllBySeniority } from '../../../lib/rankUtils';
import { RankInsignia } from '../../../components/RankInsignia';
import { UserProfile } from '../../../types';

export interface GrdSpreadsheetViewProps {
  filteredMonthDays: Date[];
  mainTab: 'grd' | 'officers';
  slotCount: number;
  grdData: Record<string, string[]>;
  officerData: Record<string, Record<string, string>>;
  militars: UserProfile[];
  obmContext: string;
  readonly?: boolean;
  activeSearchDay: { date: string; index: number | string } | null;
  setActiveSearchDay: (val: { date: string; index: number | string } | null) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  updateDayGrd: (dateStr: string, rgs: string[]) => void;
  updateOfficerDay: (dateStr: string, field: string, value: string) => void;
  getAvailableMilitarsByDay: (date: Date, excludeRgs: string[], forcedSearch?: string) => UserProfile[];
}

export function GrdSpreadsheetView({
  filteredMonthDays,
  mainTab,
  slotCount,
  grdData,
  officerData,
  militars,
  obmContext,
  readonly = false,
  activeSearchDay,
  setActiveSearchDay,
  searchTerm,
  setSearchTerm,
  updateDayGrd,
  updateOfficerDay,
  getAvailableMilitarsByDay,
}: GrdSpreadsheetViewProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 w-16 text-center">Dia</th>
              {mainTab === 'grd' ? (
                <>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 w-24 text-center border-l">Ala / Alvo</th>
                  {Array.from({ length: slotCount }).map((_, i) => (
                    <th key={i} className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 border-l">Vaga {i + 1}</th>
                  ))}
                </>
              ) : (
                <>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 border-l">Oficial de Dia / CMT OP / Sobreaviso 1 / GRD 1</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 border-l">Sobreaviso 2 / GRD 2</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredMonthDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const alaNum = getAlaForDate(day);
              const targetAlaNum = getOppositeAla(alaNum);
              const theme = getThemeColors(targetAlaNum);
              
              if (mainTab === 'grd') {
                const teamRgs = grdData[dateStr] || [];
                return (
                  <tr key={dateStr} className={cn("transition-all duration-200", theme.panel, "hover:bg-black/5")}>
                    <td className="px-3 py-4 text-center border-r border-black/5">
                      <span className={cn(
                        "text-sm font-black",
                        isToday(day) ? "text-cyan-600" : "text-slate-400"
                      )}>
                        {format(day, 'dd/MM')}
                      </span>
                      <div className="text-[8px] font-black uppercase text-slate-300 mt-1">
                        {format(day, 'eee', { locale: ptBR })}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center border-l bg-black/5">
                      <div className="flex flex-col items-center gap-2">
                        <span className={cn(
                          "text-[9px] font-black uppercase px-1.5 py-0.5 rounded outline outline-1",
                          getAlaLightColor(alaNum)
                        )}>
                          ALA {alaNum}
                        </span>
                        <div className="h-px w-4 bg-slate-200"></div>
                        <span className={cn(
                          "text-[9px] font-black uppercase px-1.5 py-0.5 rounded outline outline-1",
                          getAlaLightColor(targetAlaNum)
                        )}>
                          GRD {targetAlaNum}
                        </span>
                      </div>
                    </td>
                    {Array.from({ length: slotCount }).map((_, index) => {
                      const currentRg = teamRgs[index];
                      const m = currentRg ? militars.find(mil => mil.rg === currentRg) : null;
                      const isActiveSearch = activeSearchDay?.date === dateStr && activeSearchDay?.index === index;
                      
                      return (
                        <td key={index} className="px-2 py-2 border-l border-black/5 w-40 relative">
                          {m ? (
                            <div className="group relative flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2 shadow-sm">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <RankInsignia rankStr={parseRank(m.rank)} className="scale-[0.4] origin-center shrink-0 -ml-2" />
                                <div className="min-w-0">
                                  <p className="text-[10px] font-black text-slate-700 truncate">
                                    {m.warName || (m.name || '').split(' ')[0]}
                                  </p>
                                  <p className="text-[8px] font-bold text-slate-400 font-mono">RG: {m.rg}</p>
                                </div>
                              </div>
                              {!readonly && (
                                <button 
                                  onClick={() => {
                                    const newRgs = [...teamRgs];
                                    newRgs[index] = "";
                                    updateDayGrd(dateStr, newRgs);
                                  }}
                                  className="p-1 text-slate-300 hover:text-rose-500 rounded transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ) : readonly ? (
                            <div className="w-full flex items-center justify-center p-2 rounded-lg border border-dashed border-slate-200 text-slate-300 text-[10px] font-black uppercase tracking-widest bg-slate-50 opacity-50">
                              Vazio
                            </div>
                          ) : (
                            <div className="relative">
                              <button
                                onClick={() => {
                                  setActiveSearchDay({ date: dateStr, index });
                                  setSearchTerm('');
                                }}
                                className="w-full flex items-center justify-center gap-2 p-2 rounded-lg border border-dashed border-slate-200 text-slate-300 hover:border-cyan-300 hover:text-cyan-400 hover:bg-cyan-50/50 transition-all text-[10px] font-black uppercase tracking-widest"
                              >
                                <Plus className="w-3 h-3" />
                                SELECIONAR
                              </button>

                              {isActiveSearch && (
                                <div className="absolute top-0 left-0 w-64 bg-white shadow-2xl border border-slate-200 rounded-xl z-50 p-2 mt-10">
                                  <div className="relative mb-2">
                                    <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                                    <input
                                      autoFocus
                                      type="text"
                                      placeholder="Buscar..."
                                      value={searchTerm}
                                      onChange={(e) => setSearchTerm(e.target.value)}
                                      className="w-full p-2 pl-7 text-[10px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    />
                                    <button 
                                      onClick={() => setActiveSearchDay(null)}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"
                                    >
                                      <X className="w-3 h-3 text-slate-400" />
                                    </button>
                                  </div>
                                  <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                                    {(() => {
                                      const filteredMilitars = getAvailableMilitarsByDay(day, teamRgs, searchTerm)
                                        .filter(mil => {
                                          const searchLower = searchTerm.trim().toLowerCase();
                                          const searchValue = searchTerm.trim();
                                          if (!searchValue) return true;
                                          const nameMatch = (mil.name || '').toLowerCase().includes(searchLower);
                                          const warNameMatch = (mil.warName || '').toLowerCase().includes(searchLower);
                                          const rankMatch = (mil.rank || '').toLowerCase().includes(searchLower);
                                          const rgMatch = (mil.rg || '').includes(searchValue);
                                          return nameMatch || warNameMatch || rankMatch || rgMatch;
                                        });
                                        
                                      if (filteredMilitars.length === 0) {
                                        return (
                                          <div className="text-center py-4 text-slate-400 italic text-[10px]">
                                            Nenhuma possibilidade.
                                          </div>
                                        );
                                      }
                                      
                                      return filteredMilitars.slice(0, 30).map(mil => (
                                        <button
                                          key={mil.rg}
                                          onClick={() => {
                                            const newRgs = [...teamRgs];
                                            newRgs[index] = mil.rg;
                                            updateDayGrd(dateStr, newRgs);
                                            setActiveSearchDay(null);
                                          }}
                                          className="w-full text-left p-2 hover:bg-cyan-50 rounded-lg transition-all flex items-center gap-2 group"
                                        >
                                          <div className="w-6 shrink-0 flex justify-center">
                                            <RankInsignia rankStr={mil.rank} className="scale-[0.35] origin-center shrink-0" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-slate-700 truncate leading-tight uppercase">{mil.rank} {mil.warName || (mil.name || '').split(' ')[0]}</p>
                                            <p className="text-[8px] font-bold text-slate-400 font-mono italic">RG: {mil.rg}</p>
                                          </div>
                                          <Plus className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100" />
                                        </button>
                                      ));
                                    })()}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              } else {
                // Officer View
                const offDay = officerData[dateStr] || { oficialDia: '', sobreaviso: '' };
                return (
                  <tr key={dateStr} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-4 text-center">
                      <span className={cn("text-sm font-black", isToday(day) ? "text-indigo-600" : "text-slate-400")}>
                        {format(day, 'dd/MM')}
                      </span>
                      <div className="text-[8px] font-black uppercase text-slate-300 mt-1">
                        {format(day, 'eee', { locale: ptBR })}
                      </div>
                    </td>
                  {['oficialDia', 'sobreaviso'].map((field) => {
                    const val = offDay[field as keyof typeof offDay] || '';
                    const isActiveSearch = activeSearchDay?.date === dateStr && activeSearchDay?.index === field;
                    
                    return (
                      <td key={field} className="px-2 py-2 border-l border-slate-100 w-64 relative">
                        <div className="group relative flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <button
                              disabled={readonly}
                              onClick={() => {
                                setActiveSearchDay({ date: dateStr, index: field });
                                setSearchTerm('');
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 text-[11px] font-black uppercase border rounded-lg transition-all truncate flex items-center justify-between group",
                                readonly ? "cursor-default border-slate-100 bg-slate-50 text-slate-500" :
                                val 
                                  ? "bg-white border-slate-200 text-slate-700" 
                                  : "bg-slate-50 border-dashed border-slate-200 text-slate-300 hover:border-indigo-300 hover:text-indigo-400"
                              )}
                            >
                              <span>{val || (readonly ? "Vazio" : "Selecionar Oficial...")}</span>
                              {val && !readonly && (
                                <X 
                                  className="w-3 h-3 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all shrink-0" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateOfficerDay(dateStr, field, '');
                                  }}
                                />
                              )}
                            </button>
                          </div>

                          {isActiveSearch && (
                            <div className="absolute top-0 left-0 w-64 bg-white shadow-2xl border border-slate-200 rounded-xl z-50 p-2 mt-10">
                              <div className="relative mb-2">
                                <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                                <input
                                  autoFocus
                                  type="text"
                                  placeholder="Buscar Oficial..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="w-full p-2 pl-7 text-[10px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button 
                                  onClick={() => setActiveSearchDay(null)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"
                                >
                                  <X className="w-3 h-3 text-slate-400" />
                                </button>
                              </div>
                              <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                                {(() => {
                                  const filteredMilitars = militars
                                    .filter(m => {
                                      if (!m.name) return false;
                                      const rawMObm = m.obm ? m.obm : '10º GBM';
                                      const mObm = rawMObm.replace(/º/g, '°').trim().toUpperCase();
                                      const ctxObm = (obmContext || '').replace(/º/g, '°').trim().toUpperCase();
                                      if (ctxObm && ctxObm !== 'GLOBAL' && mObm !== ctxObm) return false;
                                      
                                      const searchLower = searchTerm.trim().toLowerCase();
                                      const searchValue = searchTerm.trim();
                                      const nameMatch = (m.name || '').toLowerCase().includes(searchLower);
                                      const warNameMatch = (m.warName || '').toLowerCase().includes(searchLower);
                                      const rankMatch = (m.rank || '').toLowerCase().includes(searchLower);
                                      const rgMatch = (m.rg || '').includes(searchValue);
                                      
                                      const isOfficer = ['MAJ', 'CAP', 'TEN', 'CEL'].some(r => (m.rank || '').includes(r));
                                      const matchesSearch = nameMatch || warNameMatch || rankMatch || rgMatch;
                                      
                                      if (!searchValue) return isOfficer;
                                      
                                      return matchesSearch && (isOfficer || searchValue.length > 2);
                                    })
                                    .sort(sortAllBySeniority);
                                    
                                  if (filteredMilitars.length === 0) {
                                    return (
                                      <div className="text-center py-4 text-slate-400 italic text-[10px]">
                                        Nenhuma possibilidade.
                                      </div>
                                    );
                                  }
                                    
                                  return filteredMilitars.slice(0, 15).map(mil => (
                                    <button
                                      key={mil.rg}
                                      onClick={() => {
                                        updateOfficerDay(dateStr, field, `${mil.rank} ${mil.warName || (mil.name || '').split(' ')[0]}`);
                                        setActiveSearchDay(null);
                                      }}
                                      className="w-full text-left p-2 hover:bg-indigo-50 rounded-lg transition-all flex items-center gap-2 group"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black text-slate-700 truncate leading-tight uppercase">
                                          {mil.rank} {mil.name}
                                        </p>
                                        <p className="text-[8px] font-bold text-slate-400 font-mono">RG: {mil.rg}</p>
                                      </div>
                                      <Plus className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100" />
                                    </button>
                                  ));
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  </tr>
                );
              }
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
