import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { resolveCanonicalScope, formatScopeLabel } from '../../lib/canonicalScope';

interface ModuleHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  obmContext?: string;
  availableObms?: string[];
  onObmChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  isObmPending?: boolean;
  onBack: () => void;
  backLabel?: string;
  children?: React.ReactNode;
}

export function ModuleHeader({
  title,
  subtitle,
  icon: Icon,
  iconClassName = 'w-8 h-8 text-indigo-600 p-1.5 bg-indigo-100 rounded-lg',
  obmContext,
  availableObms,
  onObmChange,
  isObmPending,
  onBack,
  backLabel = 'Voltar ao Painel',
  children,
}: ModuleHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200/90 dark:border-slate-800">
      <div className="flex items-center gap-3">
        {Icon && <Icon className={iconClassName} />}
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            {title}
            {obmContext && (
              <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded uppercase tracking-widest ml-2">
                {obmContext}
              </span>
            )}
          </h2>
          {subtitle && (
            <p className="text-sm font-medium text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {children}
        {availableObms && availableObms.length > 1 && onObmChange && (
          <select
            value={obmContext}
            onChange={onObmChange}
            disabled={isObmPending}
            className="px-3 py-2 bg-white border-2 border-indigo-200 hover:border-indigo-400 rounded-xl text-xs font-black uppercase tracking-widest text-indigo-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
            title="Selecione a Unidade Operacional / DBM no CBA VII"
          >
            {availableObms.map((o) => {
              const label = o === 'GLOBAL' ? '🌐 TODAS AS UNIDADES' : formatScopeLabel(resolveCanonicalScope(o));
              return (
                <option key={o} value={o}>
                  {label}
                </option>
              );
            })}
          </select>
        )}
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          {backLabel}
        </button>
      </div>
    </div>
  );
}
