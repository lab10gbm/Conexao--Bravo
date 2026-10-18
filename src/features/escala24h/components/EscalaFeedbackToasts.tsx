import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, RotateCcw, X, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { SorteioFeedback } from '../types';

export interface EscalaFeedbackToastsProps {
  sortearFeedback: SorteioFeedback | null;
  onCloseSortearFeedback: () => void;
  undoSnapshot: Record<string, string[]> | null;
  onUndoFuncoes: () => void;
  actionNotice: string | null;
}

export function EscalaFeedbackToasts({
  sortearFeedback,
  onCloseSortearFeedback,
  undoSnapshot,
  onUndoFuncoes,
  actionNotice,
}: EscalaFeedbackToastsProps) {
  return (
    <>
      {sortearFeedback && (
        <div className={cn(
          "fixed bottom-6 right-6 z-[90] max-w-md p-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-5",
          sortearFeedback.type === 'success' ? "bg-slate-900/95 border-emerald-500/50 text-white" :
          sortearFeedback.type === 'warning' ? "bg-slate-900/95 border-amber-500/50 text-white" :
          "bg-slate-900/95 border-indigo-500/50 text-white"
        )}>
          <div className="flex items-start gap-3">
            {sortearFeedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> :
             sortearFeedback.type === 'warning' ? <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" /> :
             <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />}
            <div className="flex-1 text-xs">
              <p className="font-bold leading-relaxed">{sortearFeedback.message}</p>
              {sortearFeedback.undoable && undoSnapshot && (
                <button
                  type="button"
                  onClick={onUndoFuncoes}
                  className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Desfazer
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={onCloseSortearFeedback}
              className="p-1 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {actionNotice && !sortearFeedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700">
          <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
          <span>{actionNotice}</span>
        </div>
      )}
    </>
  );
}
