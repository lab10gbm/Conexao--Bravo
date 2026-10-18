import React from 'react';
import { ArrowLeftRight, X, Search, Loader2, CheckCircle2 } from 'lucide-react';
import { UserProfile } from '../../../types';
import { COSTA_VERDE_OBMS } from '../types';
import { isPracaElegivel } from '../lib/alasUtils';
import { parseRank, sortAllBySeniority, stripRankPrefix } from '../../../lib/rankUtils';
import { cn, normalizeObm, normalizeRg } from '../../../lib/utils';

interface DirectTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  obmContext: string;
  militars: UserProfile[];
  directSelectedMilitar: UserProfile | null;
  setDirectSelectedMilitar: (m: UserProfile | null) => void;
  directSearch: string;
  setDirectSearch: (s: string) => void;
  directTargetObm: string;
  setDirectTargetObm: (obm: string) => void;
  directTargetAla: string;
  setDirectTargetAla: (ala: string) => void;
  isTransferring: boolean;
  onExecuteTransfer: (militar: UserProfile, targetObm: string, targetAla: string) => void;
  currentNormalizedCtx: string;
}

export const DirectTransferModal: React.FC<DirectTransferModalProps> = ({
  isOpen,
  onClose,
  obmContext,
  militars,
  directSelectedMilitar,
  setDirectSelectedMilitar,
  directSearch,
  setDirectSearch,
  directTargetObm,
  setDirectTargetObm,
  directTargetAla,
  setDirectTargetAla,
  isTransferring,
  onExecuteTransfer,
  currentNormalizedCtx,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 tracking-tight">Transferir Militar na Costa Verde (CBA VII)</h4>
              <p className="text-xs text-slate-500 font-medium">Envie ou receba militares entre 10º GBM, 1/10, 2/10, 3/10, 4/10, 26º GBM e 1/26</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-600 mb-4 font-medium">
          Selecione o militar (do <strong>{obmContext}</strong> ou de outra unidade) e escolha para qual <strong>OBM da Costa Verde</strong> e <strong>Ala</strong> deseja enviá-lo:
        </p>

        {/* Busca e Seleção de Militar + Destino */}
        <div className="space-y-3.5 mb-6">
          {!directSelectedMilitar && (
            <>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar praça por nome de guerra, nome ou RG..."
                  value={directSearch}
                  onChange={(e) => setDirectSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  autoFocus
                />
              </div>

              {/* Lista de Sugestões */}
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-inner">
                {(() => {
                  const isExcluded = (m: any) => ['INATIVO', 'EXCLUÍDO', 'EXCLUIDO', 'DESLIGADO'].some(status => (m.situacao || '').trim().toUpperCase().includes(status));
                  const filtered = militars
                    .filter(m => {
                      if (isExcluded(m)) return false;
                      if (!isPracaElegivel(m)) return false;
                      if (!directSearch.trim()) {
                        return normalizeObm(m.obm || '10º GBM') === currentNormalizedCtx || currentNormalizedCtx === 'GLOBAL';
                      }
                      const searchRg = normalizeRg(directSearch);
                      const matchesRg = searchRg ? normalizeRg(m.rg || '').includes(searchRg) : false;
                      return (m.name || '').toLowerCase().includes(directSearch.toLowerCase()) ||
                             (m.warName || '').toLowerCase().includes(directSearch.toLowerCase()) ||
                             matchesRg;
                    })
                    .sort(sortAllBySeniority)
                    .slice(0, 25);

                  if (filtered.length === 0) {
                    return (
                      <div className="p-4 text-center text-xs text-slate-400 font-bold">
                        Nenhum militar encontrado.
                      </div>
                    );
                  }

                  return filtered.map(m => {
                    const mObm = normalizeObm(m.obm || '10º GBM');
                    const isCurrentCtx = mObm === currentNormalizedCtx;
                    const cleanWar = stripRankPrefix(m.warName || '') || stripRankPrefix(m.name || '').split(' ')[0];

                    return (
                      <div
                        key={m.rg}
                        onClick={() => {
                          setDirectSelectedMilitar(m);
                          if (mObm === directTargetObm) {
                            setDirectTargetObm(mObm === '10º GBM' ? '2/10' : '10º GBM');
                          }
                        }}
                        className="p-2.5 hover:bg-indigo-50 cursor-pointer flex items-center justify-between gap-2 text-xs transition-colors"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-slate-800 break-words leading-snug">{parseRank(m.rank)} {cleanWar}</span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                            RG {m.rg} • {m.ala ? `Ala ${m.ala}` : 'Sem Ala'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={cn(
                            "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                            isCurrentCtx ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-amber-100 text-amber-800 border-amber-300"
                          )}>
                            {m.obm || '10º GBM'}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </>
          )}

          {/* Militar Selecionado */}
          {directSelectedMilitar && (
            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black text-indigo-900">
                  {parseRank(directSelectedMilitar.rank)} {stripRankPrefix(directSelectedMilitar.warName || '') || stripRankPrefix(directSelectedMilitar.name || '').split(' ')[0]}
                </div>
                <div className="text-[10px] text-indigo-700 font-medium mt-0.5">
                  RG: {directSelectedMilitar.rg} • Lotação Atual: <strong>{directSelectedMilitar.obm || '10º GBM'}</strong> (Ala: {directSelectedMilitar.ala || 'Sem Ala'})
                </div>
              </div>
              <button
                onClick={() => setDirectSelectedMilitar(null)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer shrink-0"
              >
                Trocar militar
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Escolha da OBM de Destino na Costa Verde */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                OBM de Destino (Costa Verde)
              </label>
              <select
                value={directTargetObm}
                onChange={(e) => setDirectTargetObm(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-black uppercase text-slate-800 outline-none cursor-pointer"
              >
                {COSTA_VERDE_OBMS.map(obmItem => (
                  <option key={obmItem.id} value={obmItem.id}>
                    {obmItem.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Escolha da Ala de Destino */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                Ala de Destino no {directTargetObm}
              </label>
              <select
                value={directTargetAla}
                onChange={(e) => setDirectTargetAla(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-black uppercase text-slate-800 outline-none cursor-pointer"
              >
                <option value="1">ALA 1</option>
                <option value="2">ALA 2</option>
                <option value="3">ALA 3</option>
                <option value="4">ALA 4</option>
                <option value="EXP">EXPEDIENTE</option>
                <option value="">SEM ALA</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={() => directSelectedMilitar && onExecuteTransfer(directSelectedMilitar, directTargetObm, directTargetAla)}
            disabled={!directSelectedMilitar || isTransferring}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            {isTransferring ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Confirmar Envio para {directTargetObm}
          </button>
        </div>
      </div>
    </div>
  );
};
