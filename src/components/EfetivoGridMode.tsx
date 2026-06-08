import React from 'react';
import { UserProfile } from '../types';
import { MapPin, Building2, Maximize2, Minimize2, Shield } from 'lucide-react';
import { GROUPS } from '../constants';
import { RankInsignia } from './RankInsignia';
import { parseRank, isOfficer } from '../lib/rankUtils';

import { normalizeObm } from '../lib/utils';

interface EfetivoGridModeProps {
  currentGroups: any[];
  search: string;
  filters: any;
  expandedGroup: string | null;
  setExpandedGroup: (id: string | null) => void;
  onRowClick: (m: UserProfile) => void;
}

export function EfetivoGridMode({ currentGroups, search, filters, expandedGroup, setExpandedGroup, onRowClick }: EfetivoGridModeProps) {
  
  const applyFilters = (m: UserProfile) => {
    const rgNum = m.rg?.replace(/\D/g, '').padStart(5, '0') || '';
    if (filters.manualRgs && filters.manualRgs.includes(rgNum)) return true;

    const term = search.toLowerCase();
    const matchesSearch = (m.name?.toLowerCase().includes(term) || m.warName?.toLowerCase().includes(term) || m.rg?.includes(term));
    const matchesPosto = filters.filterPostoGrad.length === 0 || filters.filterPostoGrad.includes(m.rank || '');
    const matchesQuadro = filters.filterQuadro.length === 0 || filters.filterQuadro.includes(m.quadro || '');
    const matchesObm = filters.filterObm.length === 0 || filters.filterObm.includes(normalizeObm(m.obm));
    const matchesAla = filters.filterAla.length === 0 || filters.filterAla.includes(m.ala?.toString() || '');
    const matchesCidade = filters.filterCidade.length === 0 || filters.filterCidade.includes(m.cidade || '');
    const matchesSituacao = filters.filterSituacao.length === 0 || filters.filterSituacao.includes(m.situacao || '');
    
    const userCursos = m.cursos ? m.cursos.toUpperCase().split(',').map(s => s.trim()) : [];
    const filterCursosList = filters.filterCursos || [];
    const matchesCursos = filterCursosList.length === 0 || filterCursosList.some((c: string) => c && userCursos.includes(c.toUpperCase()));

    return matchesSearch && matchesPosto && matchesQuadro && matchesObm && matchesAla && matchesCidade && matchesSituacao && matchesCursos;
  };

  return (
    <div className={`grid gap-6 ${expandedGroup ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
       {currentGroups.map(group => {
          const filteredMembers = group.members.filter(applyFilters);

          if (filteredMembers.length === 0 && (search || filters.filterPostoGrad.length > 0 || filters.filterQuadro.length > 0 || filters.filterObm.length > 0 || filters.filterAla.length > 0 || filters.filterCidade.length > 0 || filters.filterSituacao.length > 0 || (filters.filterCursos && filters.filterCursos.length > 0))) return null;

          const isExpanded = expandedGroup === group.id;
          const isMinimized = expandedGroup !== null && !isExpanded;

          return (
            <div key={group.name} className={`bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col transition-all ${isExpanded ? 'ring-2 ring-indigo-500 shadow-lg' : ''}`}>
               <div className="bg-slate-50 border-b-2 border-slate-200 p-3 sm:p-4 flex items-center justify-between">
                  <h3 className="font-black text-slate-800 text-sm sm:text-base flex items-center gap-2">
                     <Building2 className="w-4 h-4 sm:w-5 h-5 text-indigo-600" />
                     {group.name}
                  </h3>
                  <div className="flex items-center gap-2">
                     {group.lentIn > 0 && (
                        <span className="bg-indigo-50 border border-indigo-200 px-2 py-1 rounded text-[10px] font-black text-indigo-700 uppercase tracking-widest hidden sm:inline-block" title={`${group.lentIn} Recebido(s)`}>
                           +{group.lentIn}
                        </span>
                     )}
                     {group.lentOut > 0 && (
                        <span className="bg-amber-50 border border-amber-200 px-2 py-1 rounded text-[10px] font-black text-amber-700 uppercase tracking-widest hidden sm:inline-block" title={`${group.lentOut} Cedido(s)`}>
                           -{group.lentOut}
                        </span>
                     )}
                     <span className="bg-white border border-slate-200 px-3 py-1 rounded-full text-xs font-black text-slate-600" title="Efetivo Presente">
                        {group.members.length}
                     </span>
                     <button
                       onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                       className="p-1.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors ml-1"
                       title={isExpanded ? "Minimizar" : "Expandir"}
                     >
                       {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                     </button>
                  </div>
               </div>
               {!isMinimized && (
                 <div className={`flex-1 overflow-y-auto content-start ${isExpanded ? 'p-4 max-h-[80vh] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'p-4 max-h-[600px] flex flex-col gap-3'}`}>
                    {(isExpanded ? filteredMembers : filteredMembers.slice(0, 30)).map(m => {
                         const parsedRank = parseRank(m.rank);
                         const isOff = isOfficer(parsedRank);
                       return (
                     <div 
                       key={m.rg} 
                       onClick={() => onRowClick(m)}
                       className={`p-2.5 border border-slate-200 rounded-xl bg-white transition-all shrink-0 relative overflow-hidden group hover:border-indigo-400 hover:shadow-md cursor-pointer flex flex-col justify-between ${isOff ? 'h-[135px] sm:h-[145px]' : 'h-[90px] sm:h-[100px]'}`}
                     >
                        <div className={`relative z-10 w-full h-full flex ${isOff ? 'flex-col items-center justify-center pb-4' : 'items-center gap-4'}`}>
                           <div className={`flex-shrink-0 flex items-center justify-center ${isOff ? 'mb-2' : 'w-12 sm:w-16'}`}>
                             <RankInsignia rankStr={m.rank} className={`${isOff ? 'scale-[1.6] sm:scale-[1.8]' : 'scale-[1.5] sm:scale-[1.8]'} origin-center`} />
                           </div>
                           <div className={`flex flex-col flex-1 overflow-hidden ${isOff ? 'items-center text-center px-1 w-full justify-start' : 'justify-center pr-5'}`}>
                             <div className={`text-[9px] sm:text-[11px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1 truncate ${isOff ? 'w-full' : ''}`}>{m.rank}</div>
                             <div className={`font-black text-slate-800 text-xs sm:text-[15px] leading-tight uppercase truncate ${isOff ? 'w-full' : ''}`}>{m.warName || m.name}</div>
                             <div className={`text-[9px] text-slate-400 mt-0.5 sm:mt-1 truncate font-medium ${isOff ? 'w-full' : ''}`}>RG: {m.rg}</div>
                           </div>
                           <div className="absolute top-0 right-0 flex flex-col gap-1 items-end">
                             <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center font-black text-slate-500 text-[9px] shadow-sm">
                                {m.ala === 'EXP' ? 'E' : m.ala === 'ESCALANTE' ? 'ESC' : m.ala}
                             </div>
                           </div>
                        </div>
                        
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 z-10">
                           {/* GRD badge removed */}
                        </div>
                        
                        <div className="absolute bottom-2 right-2 flex items-center gap-1 z-10">
                           {m.lentTo ? (
                              <span className="text-[8px] font-black uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 flex items-center gap-1 max-w-[80px] truncate">
                                <MapPin className="w-2.5 h-2.5 flex-shrink-0" /> Empr.
                              </span>
                           ) : m.obm && m.obm !== group.id ? (
                              <span className="text-[8px] font-black uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 max-w-[80px] truncate">
                                {GROUPS.find(g => g.id === m.obm)?.label?.split('-')[0]?.trim() || m.obm}
                              </span>
                           ) : null}
                        </div>
                     </div>
                   );
                 })}
                 {filteredMembers.length === 0 && (
                     <div className="text-center py-6 text-slate-400 text-[10px] font-black uppercase tracking-widest col-span-full">
                        Nenhum militar
                     </div>
                 )}
                 {!isExpanded && filteredMembers.length > 30 && (
                     <button onClick={() => setExpandedGroup(group.id)} className="w-full mt-2 py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-slate-500 hover:text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex justify-center sticky bottom-0 z-20 shadow-[0_-10px_10px_rgba(255,255,255,0.8)]">
                        Ver +{filteredMembers.length - 30}
                     </button>
                 )}
               </div>
               )}
            </div>
          );
       })}
    </div>
  );
}
