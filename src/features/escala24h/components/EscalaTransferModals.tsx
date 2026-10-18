import React, { useState } from 'react';
import { ArrowLeftRight, UserPlus, Search, X, Loader2, CheckCircle2 } from 'lucide-react';
import { parseRank } from '../../../lib/rankUtils';
import { normalizeObm, normalizeRg, cn } from '../../../lib/utils';

export interface EscalaTransferModalsProps {
  obmContext: string;
  identifiedAlaStr?: string;
  pendingTransferMilitar: any | null;
  onCancelPending: () => void;
  onExecuteTransfer: (militar: any, targetObm: string, isPermanent: boolean, targetAla?: string) => Promise<void>;
  isTransferring: boolean;
  showTransferSearchModal: boolean;
  onCloseTransferSearchModal: () => void;
  militars: any[];
}

export function EscalaTransferModals({
  obmContext,
  identifiedAlaStr,
  pendingTransferMilitar,
  onCancelPending,
  onExecuteTransfer,
  isTransferring,
  showTransferSearchModal,
  onCloseTransferSearchModal,
  militars,
}: EscalaTransferModalsProps) {
  const [transferModalSearch, setTransferModalSearch] = useState('');
  const [transferModalSelectedMilitar, setTransferModalSelectedMilitar] = useState<any | null>(null);
  const [transferModalTargetAla, setTransferModalTargetAla] = useState('1');

  const handleCloseSearchModal = () => {
    onCloseTransferSearchModal();
    setTransferModalSelectedMilitar(null);
    setTransferModalSearch('');
  };

  return (
    <>
      {/* POPUP MODAL 1: Aviso de Militar em Outra Unidade (Transferência / Escalar) */}
      {pendingTransferMilitar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl shrink-0">
                <ArrowLeftRight className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 tracking-tight">
                  Militar Lotado em Outra Unidade (CBA VII)
                </h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Operando no ambiente do {obmContext}
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-xs text-amber-950 mb-5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-600">Militar:</span>
                <strong className="font-black text-slate-900 uppercase">
                  {parseRank(pendingTransferMilitar.rank)} {pendingTransferMilitar.warName || pendingTransferMilitar.name}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-600">RG:</span>
                <span className="font-mono font-bold text-slate-800">{pendingTransferMilitar.rg}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-600">Lotação Atual no Cadastro:</span>
                <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  {pendingTransferMilitar.obm || '10º GBM'} {pendingTransferMilitar.ala ? `(Ala ${pendingTransferMilitar.ala})` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-600">Unidade de Destino:</span>
                <span className="font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                  {obmContext} (Ala {identifiedAlaStr || '1'})
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6 font-medium">
              Este militar está registrado no <strong>{pendingTransferMilitar.obm || '10º GBM'}</strong>. 
              Como você está organizando a escala do <strong>{obmContext}</strong>, deseja confirmar a <strong>transferência definitiva para cá</strong> (atualizando a lotação no Sistema de Gestão do Efetivo do CBA VII) ou deseja apenas escalá-lo nesta data?
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onCancelPending}
                disabled={isTransferring}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors order-3 sm:order-1 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => onExecuteTransfer(pendingTransferMilitar, obmContext, false)}
                disabled={isTransferring}
                className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black uppercase tracking-wider transition-colors order-2 cursor-pointer"
                title="Escala somente hoje sem mudar unidade definitiva"
              >
                Apenas Nesta Data (Reforço)
              </button>
              <button
                type="button"
                onClick={() => onExecuteTransfer(pendingTransferMilitar, obmContext, true)}
                disabled={isTransferring}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm flex items-center justify-center gap-1.5 order-1 sm:order-3 cursor-pointer"
              >
                {isTransferring ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Transferir para {obmContext} e Escalar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL 2: Modal de Transferência Direta / Receber Militar para obmContext */}
      {showTransferSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 tracking-tight">Receber / Transferir Militar</h4>
                  <p className="text-xs text-slate-500 font-medium">Destino: {obmContext} (CBA VII)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseSearchModal}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 font-medium">
              Pesquise qualquer militar do CBA VII (10º GBM, 1/10, 2/10, 3/10, 4/10, 26º GBM, etc.) para recebê-lo e transferi-lo para o <strong>{obmContext}</strong>:
            </p>

            <div className="space-y-3 mb-6">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar militar por nome ou RG..."
                  value={transferModalSearch}
                  onChange={(e) => setTransferModalSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  autoFocus
                />
              </div>

              {transferModalSearch.length >= 2 && !transferModalSelectedMilitar && (
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-inner">
                  {militars
                    .filter(m => {
                      const searchRg = normalizeRg(transferModalSearch);
                      const matchesRg = searchRg ? normalizeRg(m.rg || '').includes(searchRg) : false;
                      return (m.name || '').toLowerCase().includes(transferModalSearch.toLowerCase()) ||
                             (m.warName || '').toLowerCase().includes(transferModalSearch.toLowerCase()) ||
                             matchesRg;
                    })
                    .slice(0, 15)
                    .map(m => {
                      const mObm = normalizeObm(m.obm || '10º GBM');
                      const isCurrentCtx = mObm === normalizeObm(obmContext || '10º GBM');

                      return (
                        <div
                          key={m.rg}
                          onClick={() => setTransferModalSelectedMilitar(m)}
                          className="p-2.5 hover:bg-indigo-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{parseRank(m.rank)} {m.warName || m.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">RG {m.rg}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                              isCurrentCtx ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-amber-100 text-amber-800 border-amber-300"
                            )}>
                              {m.obm || '10º GBM'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {transferModalSelectedMilitar && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black text-indigo-900">
                      {parseRank(transferModalSelectedMilitar.rank)} {transferModalSelectedMilitar.warName || transferModalSelectedMilitar.name}
                    </div>
                    <div className="text-[10px] text-indigo-700 font-medium mt-0.5">
                      RG: {transferModalSelectedMilitar.rg} • Lotação Atual: <strong>{transferModalSelectedMilitar.obm || '10º GBM'}</strong> (Ala: {transferModalSelectedMilitar.ala || 'Sem Ala'})
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTransferModalSelectedMilitar(null)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                  >
                    Trocar
                  </button>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                  Ala de Destino no {obmContext}
                </label>
                <select
                  value={transferModalTargetAla}
                  onChange={(e) => setTransferModalTargetAla(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-black uppercase text-slate-800 outline-none cursor-pointer"
                >
                  <option value="1">ALA 1</option>
                  <option value="2">ALA 2</option>
                  <option value="3">ALA 3</option>
                  <option value="4">ALA 4</option>
                  <option value="EXP">EXPEDIENTE</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseSearchModal}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => transferModalSelectedMilitar && onExecuteTransfer(transferModalSelectedMilitar, obmContext, true, transferModalTargetAla)}
                disabled={!transferModalSelectedMilitar || isTransferring}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                {isTransferring ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirmar Transferência para {obmContext}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
