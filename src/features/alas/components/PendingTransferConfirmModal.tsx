import React from 'react';
import { ArrowLeftRight, Loader2, CheckCircle2 } from 'lucide-react';
import { PendingTransfer } from '../types';
import { parseRank } from '../../../lib/rankUtils';

interface PendingTransferConfirmModalProps {
  pendingTransfer: PendingTransfer | null;
  onClose: () => void;
  onConfirm: () => void;
  isTransferring: boolean;
}

export const PendingTransferConfirmModal: React.FC<PendingTransferConfirmModalProps> = ({
  pendingTransfer,
  onClose,
  onConfirm,
  isTransferring,
}) => {
  if (!pendingTransfer) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-black text-slate-900 tracking-tight">Transferência de Militar (CBA VII)</h4>
            <p className="text-xs text-slate-500 font-medium">Confirmação de movimentação entre unidades</p>
          </div>
        </div>

        <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs font-medium text-amber-950 mb-4 space-y-1">
          <div>
            Militar: <strong className="font-black text-slate-900">{parseRank(pendingTransfer.militar.rank)} {pendingTransfer.militar.warName || pendingTransfer.militar.name}</strong>
          </div>
          <div>
            RG: <span className="font-mono font-bold text-slate-800">{pendingTransfer.militar.rg}</span> • Lotação Atual: <strong className="font-bold text-rose-700">{pendingTransfer.militar.obm || '10º GBM'}</strong>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed mb-6 font-medium">
          Este militar está atualmente lotado no <strong>{pendingTransfer.militar.obm || '10º GBM'}</strong>. 
          <br /><br />
          Deseja confirmar a transferência deste militar para o <strong>{pendingTransfer.targetObm}</strong> e alocá-lo na <strong>{pendingTransfer.targetAla ? `ALA ${pendingTransfer.targetAla}` : 'SEM ALA'}</strong>?
          <br />
          <span className="text-[11px] text-slate-500 mt-2 block">
            Esta alteração atualizará a OBM do militar no Sistema de Gestão do Efetivo do CBA VII de forma definitiva.
          </span>
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isTransferring}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            {isTransferring ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Confirmar Transferência para {pendingTransfer.targetObm}
          </button>
        </div>
      </div>
    </div>
  );
};
