import React from 'react';
import { UserProfile } from '../types';
import { SmartDataTable, ColumnDef } from './ui/SmartDataTable';
import { RankInsignia } from './RankInsignia';
import { ArrowRightLeft, Shield } from 'lucide-react';

interface EfetivoUnifiedModeProps {
  militars: UserProfile[];
  isAdmin: boolean;
  onLendRequested: (m: UserProfile) => void;
  onRowClick: (m: UserProfile) => void;
  orderedColumns: { id: string; label: string }[];
  visibleColumns: string[];
}

export function EfetivoUnifiedMode({ militars, isAdmin, onLendRequested, onRowClick, orderedColumns, visibleColumns }: EfetivoUnifiedModeProps) {
  
  const columns: ColumnDef<UserProfile>[] = React.useMemo(() => {
    return orderedColumns.filter(c => visibleColumns.includes(c.id)).map(col => {
      return {
        id: col.id,
        label: col.label,
        render: (m) => {
          if (col.id === 'insignia') {
            return (
              <td className="p-1.5 sm:p-3">
                <div className="min-w-[30px] sm:min-w-[40px] flex items-center justify-center">
                  <RankInsignia rankStr={m.rank} className="scale-75 sm:scale-100" />
                </div>
              </td>
            );
          }
          if (col.id === 'rank') {
            return (
              <td className="p-1.5 sm:p-3 text-[10px] sm:text-[11px] font-bold text-slate-800 flex items-center gap-2">
                {m.rank}
              </td>
            );
          }
          if (col.id === 'warName') {
             return (
               <td className="p-1.5 sm:p-3 text-[10px] sm:text-xs text-slate-800 flex items-center gap-2">
                 {m.warName || m.name}
               </td>
             );
          }
          
          const val = m[col.id as keyof UserProfile] as string;
          if (['quadro', 'ala', 'obm', 'situacao'].includes(col.id)) {
             return <td className="p-1.5 sm:p-3 text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase">{val || '-'}</td>;
          }
          return <td className="p-1.5 sm:p-3 text-[10px] sm:text-xs text-slate-800">{val || '-'}</td>;
        }
      };
    });
  }, []);

  return (
    <SmartDataTable 
      data={militars}
      columns={columns}
      onRowClick={onRowClick}
      searchPlaceholder="Buscar na tabela unificada..."
      onSearch={(m, term) => {
         const t = term.toLowerCase();
         return Boolean(m.name?.toLowerCase().includes(t) || m.warName?.toLowerCase().includes(t) || m.rg?.includes(t));
      }}
      renderActions={isAdmin ? (m) => (
        <button
          onClick={() => onLendRequested(m)}
          className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 transition-colors px-2 py-1 rounded"
        >
          Emprestar <ArrowRightLeft size={12} />
        </button>
      ) : undefined}
    />
  );
}
