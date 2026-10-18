import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface RestoreDefaultConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const RestoreDefaultConfirmModal: React.FC<RestoreDefaultConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-black text-slate-900 tracking-tight">Restaurar Formação Padrão?</h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Confirmação de restauração de efetivo</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed mb-6 font-medium">
          Esta ação irá restabelecer a distribuição de todos os militares nas respectivas Alas conforme o <strong>Padrão Oficial gravado</strong>, revertendo qualquer alteração não salva ou inconsistência recente.
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
          >
            Confirmar Restauração
          </button>
        </div>
      </div>
    </div>
  );
};
