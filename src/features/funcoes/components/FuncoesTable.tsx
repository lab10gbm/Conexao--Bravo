import React from 'react';
import { BadgeInfo } from 'lucide-react';
import { UserProfile } from '../../../types';
import { CategoryConfig } from '../../../components/ControleCategoriasModal';
import { RankInsignia } from '../../../components/RankInsignia';
import { parseRank } from '../../../lib/rankUtils';
import { cn } from '../../../lib/utils';

interface FuncoesTableProps {
  displayMilitars: UserProfile[];
  activeCategoryData: CategoryConfig | undefined;
  processing: string | null;
  onToggleValue: (militar: UserProfile, path: string) => void;
  onToggleColumnAll: (path: string) => void;
  getValue: (militar: UserProfile, path: string) => boolean;
}

export const FuncoesTable: React.FC<FuncoesTableProps> = ({
  displayMilitars,
  activeCategoryData,
  processing,
  onToggleValue,
  onToggleColumnAll,
  getValue,
}) => {
  const ColumnHeaderToggle = ({ field, label }: { field: string; label: React.ReactNode }) => (
    <div className="flex flex-col items-center justify-center gap-1 group">
      <span>{label}</span>
      {field && (
        <button
          onClick={() => onToggleColumnAll(field)}
          title="Marcar/Desmarcar todos"
          className="px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase font-bold bg-slate-200 text-slate-500 opacity-50 xl:group-hover:opacity-100 hover:bg-indigo-500 hover:text-white hover:opacity-100 transition-all shadow-sm cursor-pointer"
        >
          LOTE
        </button>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-slate-100 border-b border-slate-200">
            <tr>
              {activeCategoryData?.activeProperty && (
                <th className="w-16 px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">
                  <ColumnHeaderToggle field={activeCategoryData.activeProperty} label="Ativo" />
                </th>
              )}
              <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                Militar
              </th>
              {activeCategoryData?.functions.map(fn => (
                <th key={fn.id} className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200 bg-slate-50">
                  <ColumnHeaderToggle field={fn.id} label={fn.name} />
                </th>
              ))}
              <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200">
                Ala
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayMilitars.length === 0 ? (
              <tr>
                <td colSpan={(activeCategoryData?.functions.length || 0) + 3} className="px-4 py-8 text-center text-slate-400">
                  <BadgeInfo className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">Nenhum militar encontrado nesta visão.</p>
                  <p className="text-xs mt-1">Pesquise por nome ou altere os filtros.</p>
                </td>
              </tr>
            ) : null}
            {displayMilitars.map((m) => {
              const isProcessing = processing === m.rg?.replace(/\D/g, "").replace(/^0+/, "");
              const isActive = activeCategoryData?.activeProperty ? getValue(m, activeCategoryData.activeProperty) : false;

              return (
                <tr key={m.rg} className={cn("hover:bg-indigo-50/30 transition-colors", isActive ? "bg-emerald-50/10" : "")}>
                  {activeCategoryData?.activeProperty && (
                    <td className="px-3 py-2 text-center border-r border-slate-100 bg-white">
                      <button
                        onClick={() => onToggleValue(m, activeCategoryData.activeProperty)}
                        disabled={isProcessing}
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center transition-colors mx-auto ring-2 ring-offset-1 cursor-pointer",
                          isActive
                            ? "bg-emerald-500 text-white ring-emerald-200 shadow-sm"
                            : "bg-white text-slate-200 ring-slate-100 hover:bg-slate-50",
                          isProcessing && "opacity-50",
                        )}
                      >
                        {isActive && "✓"}
                      </button>
                    </td>
                  )}
                  
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 flex shrink-0 justify-center">
                        <RankInsignia rankStr={parseRank(m.rank)} className="scale-75 origin-center" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-1">
                          {parseRank(m.rank)}
                        </span>
                        <span className="text-xs font-black text-slate-700 uppercase tracking-wider leading-none">
                          {m.warName || (m.name || "").split(" ")[0]}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold text-slate-400 font-mono">
                            RG: {m.rg}
                          </span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1 rounded">
                            {m.quadro ? m.quadro.split('/')[0] : (m.specializations?.[0] || '-')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {activeCategoryData?.functions.map(fn => {
                    const isChecked = getValue(m, fn.id);
                    return (
                      <td key={fn.id} className="px-3 py-2 text-center border-l border-slate-100 bg-slate-50/50">
                        <button
                          onClick={() => onToggleValue(m, fn.id)}
                          disabled={isProcessing}
                          className={cn(
                            "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto cursor-pointer",
                            isChecked
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50",
                            isProcessing && "opacity-50",
                          )}
                        >
                          {isChecked && "✓"}
                        </button>
                      </td>
                    );
                  })}

                  <td className="px-3 py-2 text-center border-l border-slate-200">
                    {m.lentTo ? (
                      <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest">
                        {m.lentTo}
                      </span>
                    ) : m.ala ? (
                      <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                        Ala {m.ala}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
