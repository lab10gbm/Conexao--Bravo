import React from 'react';
import { UserProfile } from '../types';
import { Building2, Maximize2, Minimize2, Shield } from 'lucide-react';
import { RankInsignia } from './RankInsignia';

interface EfetivoTableObmModeProps {
  currentGroups: any[];
  search: string;
  filters: any;
  expandedGroup: string | null;
  setExpandedGroup: (id: string | null) => void;
  onRowClick: (m: UserProfile) => void;
  orderedColumns: any[];
  visibleColumns: string[];
  isAdmin: boolean;
  onLendRequested: (m: UserProfile) => void;
}

export function EfetivoTableObmMode({ 
  currentGroups, 
  search, 
  filters, 
  expandedGroup, 
  setExpandedGroup, 
  onRowClick,
  orderedColumns,
  visibleColumns,
  isAdmin,
  onLendRequested
}: EfetivoTableObmModeProps) {

  const applyFilters = (m: UserProfile) => {
    const rgNum = m.rg?.replace(/\D/g, '').padStart(5, '0') || '';
    if (filters.manualRgs && filters.manualRgs.includes(rgNum)) return true;

    const term = search.toLowerCase();
    const matchesSearch = (m.name?.toLowerCase().includes(term) || m.warName?.toLowerCase().includes(term) || m.rg?.includes(term));
    const matchesPosto = filters.filterPostoGrad.length === 0 || filters.filterPostoGrad.includes(m.rank || '');
    const matchesQuadro = filters.filterQuadro.length === 0 || filters.filterQuadro.includes(m.quadro || '');
    const matchesObm = filters.filterObm.length === 0 || filters.filterObm.includes(m.obm ? m.obm : '10º GBM');
    const matchesAla = filters.filterAla.length === 0 || filters.filterAla.includes(m.ala?.toString() || '');
    const matchesCidade = filters.filterCidade.length === 0 || filters.filterCidade.includes(m.cidade || '');
    const matchesSituacao = filters.filterSituacao.length === 0 || filters.filterSituacao.includes(m.situacao || '');
    
    const userCursos = m.cursos ? m.cursos.toUpperCase().split(',').map(s => s.trim()) : [];
    const filterCursosList = filters.filterCursos || [];
    const matchesCursos = filterCursosList.length === 0 || filterCursosList.some((c: string) => c && userCursos.includes(c.toUpperCase()));

    return matchesSearch && matchesPosto && matchesQuadro && matchesObm && matchesAla && matchesCidade && matchesSituacao && matchesCursos;
  };

  const visibleColumnsList = React.useMemo(() => {
    return orderedColumns.filter(c => visibleColumns.includes(c.id));
  }, [orderedColumns, visibleColumns]);

  return (
    <div className={`grid gap-6 ${expandedGroup ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
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
                 <div className="flex-1 overflow-x-auto no-scrollbar content-start max-h-[80vh] relative">
                    <div className="sm:hidden sticky left-0 right-0 top-0 z-20 flex items-center gap-1.5 px-3 py-1 bg-slate-50 border-b border-slate-100">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Deslize para ver detalhes →</span>
                    </div>
                    <table className="w-full text-left border-collapse whitespace-nowrap min-w-[400px]">
                      <thead className="bg-slate-100 text-slate-500 sticky top-0 z-10 text-[9px] sm:text-[10px] uppercase font-black tracking-widest border-b border-slate-200">
                        <tr>
                           {visibleColumnsList.map(col => (
                             <th key={col.id} className="p-1.5 sm:p-2 px-3 sm:px-4 whitespace-nowrap">{col.label}</th>
                           ))}
                           {isAdmin && <th className="p-1.5 sm:p-2 px-3 sm:px-4 whitespace-nowrap">Ações</th>}
                        </tr>
                     </thead>
                     <tbody className="text-[11px] sm:text-sm divide-y divide-slate-100">
                        {filteredMembers.map(m => (
                           <tr key={m.rg} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => onRowClick(m)}>
                             {visibleColumnsList.map(col => {
                               if (col.id === 'insignia') {
                                 return (
                                   <td key={col.id} className="p-1 sm:p-2 px-2 sm:px-4">
                                     <div className="min-w-[20px] sm:min-w-[30px] flex items-center justify-center">
                                       <RankInsignia rankStr={m.rank} className="scale-75 sm:scale-100" />
                                     </div>
                                   </td>
                                 );
                               }
                               if (col.id === 'rank') {
                                 return (
                                   <td key={col.id} className="p-1 sm:p-2 px-2 sm:px-4 text-[9px] sm:text-[11px] font-bold text-slate-800 uppercase">
                                     {m.rank}
                                   </td>
                                 );
                               }
                               if (col.id === 'warName') {
                                 return (
                                   <td key={col.id} className="p-1 sm:p-2 px-2 sm:px-4 text-[9px] sm:text-[11px] text-slate-800 flex items-center gap-2 h-full">
                                     {m.warName || m.name}
                                   </td>
                                 );
                               }
                               let val = m[col.id as keyof UserProfile] as string;
                               if (['quadro', 'ala', 'obm', 'situacao'].includes(col.id)) {
                                  return <td key={col.id} className="p-1 sm:p-2 px-2 sm:px-4 text-[9px] sm:text-[11px] font-bold text-slate-500 uppercase">{val || '-'}</td>;
                               }
                               return <td key={col.id} className="p-1 sm:p-2 px-2 sm:px-4 text-[9px] sm:text-[11px] text-slate-800">{val || '-'}</td>;
                             })}
                             {isAdmin && (
                               <td className="p-1 sm:p-2 px-2 sm:px-4 text-[9px] sm:text-[11px] text-slate-800" onClick={e => e.stopPropagation()}>
                                  <button
                                    onClick={() => onLendRequested(m)}
                                    className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors px-1.5 sm:px-2 py-0.5 sm:py-1 rounded"
                                  >
                                    Emprestar
                                  </button>
                               </td>
                             )}
                           </tr>
                        ))}
                        {filteredMembers.length === 0 && (
                           <tr>
                              <td colSpan={visibleColumns.length + (isAdmin ? 1 : 0)} className="p-6 sm:p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-[9px] sm:text-[10px]">
                                 Nenhum militar
                              </td>
                           </tr>
                        )}
                     </tbody>
                   </table>
                 </div>
               )}
            </div>
          );
       })}
    </div>
  );
}
