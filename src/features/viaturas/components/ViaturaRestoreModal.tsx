import React from 'react';
import { X, RotateCcw, BookmarkCheck, ShieldCheck } from 'lucide-react';
import { ViaturaConfig } from '../types';
import { formatDateTime } from '../lib/viaturaUtils';

interface ViaturaRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreCustom: () => void;
  onRestoreFactory: () => void;
  customDefault: ViaturaConfig[] | null;
  customDefaultDate: string | null;
}

export const ViaturaRestoreModal: React.FC<ViaturaRestoreModalProps> = ({
  isOpen,
  onClose,
  onRestoreCustom,
  onRestoreFactory,
  customDefault,
  customDefaultDate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight text-slate-800">
              Retornar ao Padrão
            </h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Selecione a referência a restaurar
            </p>
          </div>
        </div>

        <div className="space-y-3 my-2">
          {customDefault && customDefault.length > 0 ? (
            <>
              {/* Opção 1: Novo Padrão Definido */}
              <div
                onClick={onRestoreCustom}
                className="p-4 rounded-2xl border-2 border-emerald-500/40 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                    Restaurar Meu Novo Padrão
                  </span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                    Ativo
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-snug">
                  Restaura o padrão personalizado definido para esta OBM ({customDefault.length} viaturas
                  {customDefaultDate ? ` • salvo em ${formatDateTime(customDefaultDate)}` : ''}).
                </p>
              </div>

              {/* Opção 2: Padrão Original de Fábrica */}
              <div
                onClick={onRestoreFactory}
                className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-slate-500" />
                    Restaurar Padrão de Fábrica
                  </span>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    Original
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Redefine para o padrão inicial do sistema (9 viaturas originais do Corpo de Bombeiros).
                </p>
              </div>
            </>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 leading-relaxed">
              <p className="font-bold text-slate-900 mb-1">Padrão Inicial do Sistema</p>
              Ainda não foi definido um novo padrão personalizado para esta OBM. Deseja restaurar a configuração para o padrão original de fábrica (9 viaturas)?
              <div className="mt-4 flex gap-2">
                <button
                  onClick={onRestoreFactory}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black uppercase text-xs tracking-wider py-2.5 rounded-xl transition"
                >
                  Restaurar Padrão de Fábrica
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
