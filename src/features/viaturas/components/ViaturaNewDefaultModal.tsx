import React from 'react';
import { X, BookmarkCheck, Sparkles, Info } from 'lucide-react';
import { ViaturaConfig } from '../types';

interface ViaturaNewDefaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  saving: boolean;
  obmContext: string;
  viaturas: ViaturaConfig[];
}

export const ViaturaNewDefaultModal: React.FC<ViaturaNewDefaultModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  saving,
  obmContext,
  viaturas,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <BookmarkCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight text-slate-800">
              Criar Novo Padrão de Viaturas
            </h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Unidade: {obmContext}
            </p>
          </div>
        </div>

        <div className="space-y-4 my-2">
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs text-emerald-900 leading-relaxed font-medium">
            <p className="font-bold text-emerald-950 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Nova Referência Padrão Permanente
            </p>
            Você está prestes a definir a configuração atual como o <strong>novo padrão de referência</strong> para esta OBM. Uma vez definido:
            <ul className="list-disc pl-5 mt-2 space-y-1 text-[11px]">
              <li>Ao clicar em <strong>"Retornar ao Padrão"</strong> (aqui ou na escala diária de 24h), esta nova referência será restaurada.</li>
              <li>Novas escalas geradas herdarão esta ordem, visualizações e guarnições.</li>
            </ul>
          </div>

          {/* Resumo da Configuração Atual */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-3">
              Resumo da Configuração que se tornará o Novo Padrão:
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Total VTRs</span>
                <span className="text-base font-black text-slate-800">{viaturas.length}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Ativas</span>
                <span className="text-base font-black text-emerald-600">{viaturas.filter(v => v.ativa).length}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Exibidas</span>
                <span className="text-base font-black text-indigo-600">{viaturas.filter(v => v.exibir !== false).length}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Espaços</span>
                <span className="text-[11px] font-black text-slate-700 block mt-0.5">
                  {viaturas.filter(v => (v.espaco || '1') === '1').length} [1] • {viaturas.filter(v => v.espaco === '1/2').length} [½] • {viaturas.filter(v => v.espaco === '1/3').length} [⅓]
                </span>
              </div>
            </div>

            <div className="mt-3 text-[10px] text-slate-500 font-semibold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              A ordem atual das viaturas também ficará gravada como padrão permanente.
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-colors shadow-sm disabled:opacity-50"
          >
            <BookmarkCheck className="w-4 h-4" />
            {saving ? "Salvando..." : "Confirmar e Definir Novo Padrão"}
          </button>
        </div>
      </div>
    </div>
  );
};
