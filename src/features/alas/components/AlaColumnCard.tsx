import React from 'react';
import { Plus, X, Search, Loader2, ArrowLeftRight, UserPlus } from 'lucide-react';
import { UserProfile } from '../../../types';
import { PendingTransfer } from '../types';
import { isPracaElegivel } from '../lib/alasUtils';
import { parseRank, stripRankPrefix } from '../../../lib/rankUtils';
import { cn, normalizeAlaField, normalizeObm, normalizeRg } from '../../../lib/utils';

interface AlaColumnCardProps {
  ala: string;
  members: UserProfile[];
  alaName: string;
  headerColor: string;
  isAdding: boolean;
  onToggleAdding: () => void;
  localSearch: string;
  setLocalSearch: (s: string) => void;
  militars: UserProfile[];
  currentNormalizedCtx: string;
  obmContext: string;
  assigningRg: string | null;
  onAssignAla: (rg: string, ala: string) => void;
  onPendingTransfer: (transfer: PendingTransfer) => void;
  onOpenDirectTransfer: (m: UserProfile) => void;
  onOpenAddMilitar?: (ala: string) => void;
}

export const AlaColumnCard: React.FC<AlaColumnCardProps> = ({
  ala,
  members,
  alaName,
  headerColor,
  isAdding,
  onToggleAdding,
  localSearch,
  setLocalSearch,
  militars,
  currentNormalizedCtx,
  obmContext,
  assigningRg,
  onAssignAla,
  onPendingTransfer,
  onOpenDirectTransfer,
  onOpenAddMilitar,
}) => {
  return (
    <div className="flex flex-col border border-slate-200 rounded-3xl overflow-hidden bg-slate-50/50 relative h-[620px] shadow-xs">
      <div className={cn("p-4 flex items-center justify-between gap-2", headerColor)}>
        <div className="min-w-0 pr-1">
          <h4 className="text-[12px] sm:text-[12.5px] font-black tracking-wide leading-tight break-words" title={alaName}>
            {alaName}
          </h4>
          <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest mt-0.5">{members.length} Militares</p>
        </div>
        <button 
          onClick={onToggleAdding}
          className="p-1.5 hover:bg-white/20 rounded-xl transition-colors shrink-0 cursor-pointer"
          title={isAdding ? 'Fechar' : `Adicionar militar à Ala ${ala}`}
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {isAdding && (
        <div className="p-3 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              Adicionar à Ala {ala}
            </span>
            {onOpenAddMilitar && (
              <button
                type="button"
                onClick={() => onOpenAddMilitar(ala)}
                className="text-[9px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer hover:underline"
                title="Cadastrar novo militar no banco e adicionar nesta ala"
              >
                <UserPlus className="w-3 h-3" />
                <span>+ Novo no Banco</span>
              </button>
            )}
          </div>
          <div className="relative mb-2">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar praça de qualquer unidade..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-7 pr-2 py-1.5 border border-slate-200 focus:border-indigo-400 rounded-lg text-[10px] uppercase font-bold tracking-wider outline-none w-full transition-all"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto pr-1 space-y-1">
            {(() => {
              const isExcluded = (m: any) => ['INATIVO', 'EXCLUÍDO', 'EXCLUIDO', 'DESLIGADO'].some(status => (m.situacao || '').trim().toUpperCase().includes(status));
              
              const searchPool = militars.filter(m => {
                if (isExcluded(m)) return false;
                if (!isPracaElegivel(m)) return false;
                const mObm = normalizeObm(m.obm || '10º GBM');
                const ctx = currentNormalizedCtx;
                
                if (mObm === ctx && normalizeAlaField(m.ala) === ala) return false;
                
                if (!localSearch) {
                  return mObm === ctx;
                }
                
                const searchRg = normalizeRg(localSearch);
                const matchesRg = searchRg ? normalizeRg(m.rg || '').includes(searchRg) : false;
                return (m.name || '').toLowerCase().includes(localSearch.toLowerCase()) || 
                       (m.warName || '').toLowerCase().includes(localSearch.toLowerCase()) || 
                       matchesRg;
              });

              if (searchPool.length === 0) {
                return (
                  <div className="p-3 text-center flex flex-col items-center gap-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      Nenhum militar encontrado
                    </p>
                    {onOpenAddMilitar && (
                      <button
                        type="button"
                        onClick={() => onOpenAddMilitar(ala)}
                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Cadastrar no banco (Ala {ala})
                      </button>
                    )}
                  </div>
                );
              }

              return searchPool.slice(0, 20).map(m => {
                const mObm = normalizeObm(m.obm || '10º GBM');
                const ctx = currentNormalizedCtx;
                const isOtherUnit = mObm !== ctx && ctx !== 'GLOBAL';
                const cleanWar = stripRankPrefix(m.warName || '') || stripRankPrefix(m.name || '').split(' ')[0];

                return (
                  <button
                    key={m.rg}
                    onClick={() => {
                      if (isOtherUnit) {
                        onPendingTransfer({
                          militar: m,
                          targetAla: ala,
                          targetObm: obmContext
                        });
                      } else {
                        onAssignAla(m.rg!, ala);
                      }
                    }}
                    disabled={assigningRg === m.rg}
                    className={cn(
                      "w-full text-left p-2 rounded-xl flex items-center justify-between gap-2 text-[11px] group transition-colors border mb-1 cursor-pointer",
                      isOtherUnit 
                        ? "bg-amber-50/70 hover:bg-amber-100 border-amber-200 text-amber-950" 
                        : "hover:bg-indigo-50 border-slate-100"
                    )}
                  >
                    <div className="flex flex-col min-w-0 pr-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-slate-800 break-words leading-snug">{parseRank(m.rank)} {cleanWar}</span>
                        {isOtherUnit && (
                          <span className="text-[8px] font-black uppercase text-amber-800 bg-amber-200/80 px-1 py-0.2 rounded border border-amber-300 shrink-0">
                            {m.obm || '10º GBM'}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 mt-0.5">
                        RG {m.rg} • {m.ala ? `Ala ${m.ala}` : 'Sem Ala'}
                      </span>
                    </div>
                    {isOtherUnit ? (
                      <span className="text-[9px] font-black uppercase text-amber-700 bg-white px-1.5 py-0.5 rounded shadow-2xs border border-amber-200 group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0">
                        Transferir
                      </span>
                    ) : assigningRg === m.rg ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 shrink-0" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                    )}
                  </button>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Lista de Membros da Ala */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {members.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
            Nenhum militar
          </div>
        ) : (
          members.map((m, idx) => {
            const cleanWar = stripRankPrefix(m.warName || '') || stripRankPrefix(m.name || '').split(' ')[0];

            return (
              <div 
                key={m.rg}
                className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-300 transition-all flex flex-col gap-2 relative group"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <div className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center text-[9px] font-black text-slate-400 shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <span className="text-[11.5px] font-black text-slate-800 leading-snug break-words flex-1">
                      {parseRank(m.rank)} {cleanWar}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenDirectTransfer(m)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-colors cursor-pointer"
                      title="Transferir para outra OBM da Costa Verde (ex: 2/10)"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onAssignAla(m.rg!, '')}
                      disabled={assigningRg === m.rg}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                      title="Remover militar desta Ala (enviar para Sem Ala)"
                    >
                      {assigningRg === m.rg ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-1.5 pl-7 pt-1 border-t border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold shrink-0">RG {m.rg}</span>
                    <span className="text-slate-400">{m.quadro || '-'}</span>
                  </div>

                  <select
                    value={ala}
                    onChange={(e) => onAssignAla(m.rg!, e.target.value)}
                    disabled={assigningRg === m.rg}
                    className="bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-600 outline-none cursor-pointer shrink-0"
                    title="Mover para outra Ala"
                  >
                    <option value="1">ALA 1</option>
                    <option value="2">ALA 2</option>
                    <option value="3">ALA 3</option>
                    <option value="4">ALA 4</option>
                    <option value="EXP">EXP</option>
                    <option value="">SEM ALA</option>
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
