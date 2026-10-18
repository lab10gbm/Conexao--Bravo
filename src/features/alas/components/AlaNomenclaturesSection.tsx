import React from 'react';
import { Tag, CheckCircle2, RotateCcw, BookmarkCheck, Loader2 } from 'lucide-react';
import { DEFAULT_ALA_NOMENCLATURES } from '../../../lib/alaUtils';
import { UserProfile } from '../../../types';
import { cn } from '../../../lib/utils';

interface AlaNomenclaturesSectionProps {
  alaNames: Record<string, string>;
  setAlaNames: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  savingNames: boolean;
  namesFeedback: string | null;
  onResetNames: () => void;
  onSaveNames: () => void;
  getMilitarsByAla: (ala: string) => UserProfile[];
}

export const AlaNomenclaturesSection: React.FC<AlaNomenclaturesSectionProps> = ({
  alaNames,
  setAlaNames,
  savingNames,
  namesFeedback,
  onResetNames,
  onSaveNames,
  getMilitarsByAla,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs transition-all space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl shadow-sm">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              Nomenclatura Oficial das Alas
              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200 uppercase tracking-widest">
                Padrão CBMERJ
              </span>
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              Denominação oficial das alas operacionais (exibida no Gerar Escala, impressão e cartões de guarnição).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {namesFeedback && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              {namesFeedback}
            </span>
          )}
          <button
            type="button"
            onClick={onResetNames}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
            title="Restaurar as nomenclaturas oficiais padrão"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrão
          </button>
          <button
            type="button"
            onClick={onSaveNames}
            disabled={savingNames}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer"
          >
            {savingNames ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookmarkCheck className="w-3.5 h-3.5" />}
            Salvar Nomes
          </button>
        </div>
      </div>

      {/* Grade de Nomenclatura das 4 Alas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          {
            ala: '1',
            label: 'ALA 1',
            colorBadge: 'bg-emerald-600 text-white border-emerald-700',
            cardBg: 'bg-emerald-50/50 border-emerald-200 focus-within:border-emerald-500',
            inputBorder: 'border-emerald-200 focus:border-emerald-500 focus:ring-emerald-200',
            defaultName: DEFAULT_ALA_NOMENCLATURES['1'],
          },
          {
            ala: '2',
            label: 'ALA 2',
            colorBadge: 'bg-rose-600 text-white border-rose-700',
            cardBg: 'bg-rose-50/50 border-rose-200 focus-within:border-rose-500',
            inputBorder: 'border-rose-200 focus:border-rose-500 focus:ring-rose-200',
            defaultName: DEFAULT_ALA_NOMENCLATURES['2'],
          },
          {
            ala: '3',
            label: 'ALA 3',
            colorBadge: 'bg-blue-600 text-white border-blue-700',
            cardBg: 'bg-blue-50/50 border-blue-200 focus-within:border-blue-500',
            inputBorder: 'border-blue-200 focus:border-blue-500 focus:ring-blue-200',
            defaultName: DEFAULT_ALA_NOMENCLATURES['3'],
          },
          {
            ala: '4',
            label: 'ALA 4',
            colorBadge: 'bg-amber-600 text-white border-amber-700',
            cardBg: 'bg-amber-50/50 border-amber-200 focus-within:border-amber-500',
            inputBorder: 'border-amber-200 focus:border-amber-500 focus:ring-amber-200',
            defaultName: DEFAULT_ALA_NOMENCLATURES['4'],
          },
        ].map(item => (
          <div
            key={item.ala}
            className={cn(
              "p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5",
              item.cardBg
            )}
          >
            <div className="flex items-center justify-between">
              <span className={cn("px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-2xs", item.colorBadge)}>
                {item.label}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {getMilitarsByAla(item.ala).length} militares
              </span>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                Nomenclatura / Título:
              </label>
              <input
                type="text"
                value={alaNames[item.ala] ?? item.defaultName}
                onChange={(e) => {
                  const val = e.target.value;
                  setAlaNames(prev => ({ ...prev, [item.ala]: val }));
                }}
                placeholder={item.defaultName}
                className={cn(
                  "w-full bg-white px-3 py-2 rounded-xl text-xs font-black text-slate-800 border outline-none transition-all shadow-2xs focus:ring-2",
                  item.inputBorder
                )}
              />
            </div>

            <div className="text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-200/60 truncate">
              Padrão: <span className="font-semibold text-slate-600">{item.defaultName}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
