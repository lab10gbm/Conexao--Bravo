import React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { UserProfile } from '../../../types';
import { parseRank, sortAllBySeniority, stripRankPrefix } from '../../../lib/rankUtils';
import { normalizeRg } from '../../../lib/utils';

interface SemAlaSectionProps {
  semAlaMilitars: UserProfile[];
  searchTerm: string;
  obmContext: string;
  assigningRg: string | null;
  onAssignAla: (rg: string, ala: string) => void;
  onOpenDirectTransfer: (m: UserProfile) => void;
}

export const SemAlaSection: React.FC<SemAlaSectionProps> = ({
  semAlaMilitars,
  searchTerm,
  obmContext,
  assigningRg,
  onAssignAla,
  onOpenDirectTransfer,
}) => {
  if (semAlaMilitars.length === 0) return null;

  const filtered = semAlaMilitars
    .filter(m => {
      if (!searchTerm) return true;
      const searchRg = normalizeRg(searchTerm);
      const matchesRg = searchRg ? normalizeRg(m.rg || '').includes(searchRg) : false;
      return (
        (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.warName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        matchesRg
      );
    })
    .sort(sortAllBySeniority);

  return (
    <div className="border border-slate-200 rounded-3xl overflow-hidden bg-slate-50/50 shadow-xs">
      <div className="p-4 bg-slate-800 text-slate-50 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-black tracking-wider uppercase">Militares de {obmContext} sem Ala Definida</h4>
          <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">
            {semAlaMilitars.length} praças ativos aguardando alocação
          </p>
        </div>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 max-h-96 overflow-y-auto">
        {filtered.map((m, idx) => {
          const cleanWar = stripRankPrefix(m.warName || '') || stripRankPrefix(m.name || '').split(' ')[0];

          return (
            <div key={m.rg} className="bg-white p-3 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all shadow-xs flex flex-col justify-between gap-2">
              <div className="flex items-start justify-between gap-1.5 min-w-0">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <div className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center text-[9px] font-black text-slate-400 shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <span className="text-[11.5px] font-black text-slate-800 leading-snug break-words flex-1">
                    {parseRank(m.rank)} {cleanWar}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenDirectTransfer(m)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-colors cursor-pointer shrink-0"
                  title="Transferir para outra OBM da Costa Verde (ex: 2/10)"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-1.5 pl-7 pt-1 border-t border-slate-100 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold">RG {m.rg}</span>
                  <span>{m.quadro || '-'}</span>
                </div>

                <select
                  value=""
                  onChange={(e) => onAssignAla(m.rg!, e.target.value)}
                  disabled={assigningRg === m.rg}
                  className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded px-1.5 py-0.5 text-[9px] font-black uppercase text-indigo-700 outline-none cursor-pointer shrink-0"
                  title="Atribuir à Ala"
                >
                  <option value="">+ ALA</option>
                  <option value="1">ALA 1</option>
                  <option value="2">ALA 2</option>
                  <option value="3">ALA 3</option>
                  <option value="4">ALA 4</option>
                  <option value="EXP">EXP</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
