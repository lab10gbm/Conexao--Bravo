import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserMinus, AlertTriangle, X, Calendar, User } from 'lucide-react';
import { parseRank } from '../../../lib/rankUtils';
import { formatMilitaryName } from '../../../lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConfirmarRemocaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  militar: any;
  selectedDate: string;
}

export function ConfirmarRemocaoModal({
  isOpen,
  onClose,
  onConfirm,
  militar,
  selectedDate
}: ConfirmarRemocaoModalProps) {
  if (!isOpen || !militar) return null;

  let formattedDate = selectedDate;
  try {
    if (selectedDate) {
      formattedDate = format(parseISO(selectedDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    }
  } catch {
    formattedDate = selectedDate;
  }

  const postNome = `${parseRank(militar.rank)} ${militar.warName?.toUpperCase() || formatMilitaryName(militar.name || '')}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0 border-b border-rose-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 text-rose-100 border border-white/20 flex items-center justify-center shadow-inner">
                <UserMinus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black uppercase tracking-tight">
                  Confirmar Remoção
                </h2>
                <p className="text-[11px] text-rose-100/90 font-medium">
                  Alteração temporária na escala do dia
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-rose-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-4">
            {/* Card do Militar */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400">
                    {parseRank(militar.rank)}
                  </span>
                  <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 truncate">
                    {militar.warName || militar.name}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  RG: {militar.rg} • Ala {militar.ala || '1'} • {militar.obm || '10º GBM'}
                </div>
              </div>
            </div>

            {/* Aviso Explicativo */}
            <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
                <p className="font-bold">
                  Deseja remover <span className="underline">{postNome}</span> da relação presente desta escala?
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                  Esta ação é uma correção rápida e temporária para o dia <span className="font-semibold text-slate-800 dark:text-slate-200">{formattedDate}</span>. O cadastro oficial do militar no efetivo não será alterado e as funções atribuídas a ele hoje serão liberadas.
                </p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer"
              >
                <UserMinus className="w-4 h-4" />
                <span>Sim, Remover da Relação</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
