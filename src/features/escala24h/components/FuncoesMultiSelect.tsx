import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, Star, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { normalizeFnName } from '../lib/escalaCalculos';

export interface FuncoesMultiSelectProps {
  selected: string[];
  onChange: (v: string[]) => void;
  allowedOptions?: string[];
  extraOptions?: string[];
  preferredOptions?: string[];
  onlyActiveScaleOptions?: boolean;
  overLimitSet?: Set<string>;
}

export function FuncoesMultiSelect({
  selected,
  onChange,
  allowedOptions,
  extraOptions,
  preferredOptions,
  onlyActiveScaleOptions,
  overLimitSet,
}: FuncoesMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');

  const isOptPreferred = (opt: string) => {
    if (!preferredOptions || preferredOptions.length === 0) return false;
    const oNorm = normalizeFnName(opt);
    return preferredOptions.some(p => {
      const pNorm = normalizeFnName(p);
      return pNorm !== "" && (pNorm === oNorm || oNorm.includes(pNorm) || pNorm.includes(oNorm));
    });
  };

  const isOptOverLimit = (opt: string) => {
    if (!overLimitSet) return false;
    return overLimitSet.has(normalizeFnName(opt));
  };

  const hasPreferredSelected = selected.some(isOptPreferred);
  const hasOverLimitSelected = selected.some(isOptOverLimit);

  const allOptions = useMemo(() => {
    const base = onlyActiveScaleOptions
      ? []
      : [
          'ADJUNTO', 'ENCARREGADO DE MOTORISTA', 'CONDUTOR AR', 'CONDUTOR ABSL', 'CONDUTOR ABT', 
          'CONDUTOR ASE', 'CONDUTOR ARC', 'CHEFE ABSL', 'CHEFE ABT', 'AUXILIAR/CHEFE ARC', 
          'AUXILIAR ABT', 'AUXILIAR ABSL', 'AUXILIAR ASE', 'ENFERMEIRO', 'MESTRE L', 'MESTRE BIA', 
          'MARINHEIRO L', 'MARINHEIRO BIA', 'OPERADOR AMA', 'GV AMA', 'AUXILIAR RANCHO', 'TOQUE DE FOGO', 
          'DIA AO DEPOSITO', 'ENC. FAXINA', 'RESP FAXINA', 'ABASTECEDOR', 'SGT DIA', 'CMT GUARDA', 
          'CB GUARDA', 'CB DIA', 'COMUNICANTE', 'PRECARIO', 'ESCALANTE', 'PRECARIO ADM', 
          'SENTINELA'
        ];
    const set = new Set<string>(base);
    (allowedOptions || []).forEach(o => { if (o?.trim()) set.add(o.trim().toUpperCase()); });
    (extraOptions || []).forEach(o => { if (o?.trim()) set.add(o.trim().toUpperCase()); });
    (selected || []).forEach(o => { if (o?.trim()) set.add(o.trim().toUpperCase()); });
    return Array.from(set);
  }, [onlyActiveScaleOptions, extraOptions, allowedOptions, selected]);

  const options = search ? allOptions.filter(o => o.toLowerCase().includes(search.toLowerCase())) : allOptions;

  const qualifiedOptions = options.filter(o => allowedOptions?.includes(o) || selected.includes(o));
  const otherOptions = options.filter(o => !allowedOptions?.includes(o) && !selected.includes(o));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < 280 && rect.top > 250);
    }
    setOpen((prev) => !prev);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleToggle}
        title={
          hasOverLimitSelected
            ? "⚠️ Quantidade de militares selecionados excede o limite configurado desta função"
            : hasPreferredSelected
            ? "★ Escalado conforme preferência configurada pelo escalante"
            : undefined
        }
        className={cn(
          "w-full rounded px-2 py-1 outline-none text-[9px] font-black uppercase tracking-wider flex items-center justify-between min-w-[140px] border transition-colors",
          hasOverLimitSelected
            ? "bg-red-100 border-red-400 text-red-700 ring-1 ring-red-300/70 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            : hasPreferredSelected
            ? "bg-amber-50/80 border-amber-300 text-amber-950 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            : "bg-slate-50 border-slate-200 text-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        )}
      >
        <span className="truncate pr-2 flex items-center gap-1">
          {hasPreferredSelected && (
            <Star className={cn("w-3 h-3 shrink-0", hasOverLimitSelected ? "fill-red-500 text-red-600" : "fill-amber-400 text-amber-500")} />
          )}
          <span className="truncate">
            {selected.length === 0 ? "-- SELECIONE --" : selected.join(", ")}
          </span>
        </span>
        <ChevronDown className={cn("w-3 h-3 shrink-0", hasOverLimitSelected ? "text-red-500" : "text-slate-400")} />
      </button>
      {open && (
        <div className={cn(
          "absolute left-0 min-w-[200px] bg-white border border-slate-200 rounded shadow-lg z-50 flex flex-col max-h-[300px]",
          openUp ? "bottom-full mb-1" : "top-full mt-1"
        )}>
          <div className="p-2 border-b border-slate-100 sticky top-0 bg-slate-50/90 backdrop-blur z-10 shrink-0">
            <input 
              type="text" 
              placeholder="Buscar função..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[9px] uppercase tracking-wider outline-none focus:border-indigo-400"
            />
          </div>
          <div className="overflow-y-auto p-1 flex-1">
            {qualifiedOptions.length > 0 && (
               <>
                 <div className="px-2 py-1 text-[8px] font-black text-emerald-600 bg-emerald-50 rounded uppercase tracking-widest mt-1 mb-1">
                    Qualificado / Atual
                 </div>
                 {qualifiedOptions.map((opt) => {
                   const isPref = isOptPreferred(opt);
                   const isSel = selected.includes(opt);
                   const isOver = isSel && isOptOverLimit(opt);
                   return (
                     <button
                       key={opt}
                       onClick={() => {
                         if (isSel)
                           onChange(selected.filter((x) => x !== opt));
                         else onChange([...selected, opt]);
                       }}
                       className={cn(
                         "flex items-center justify-between px-2 py-1.5 rounded w-full cursor-pointer",
                         isOver ? "bg-red-50 hover:bg-red-100/80" : "hover:bg-slate-50"
                       )}
                     >
                       <span className={cn(
                         "text-[9px] font-black uppercase tracking-wider flex items-center gap-1",
                         isOver ? "text-red-700" : "text-slate-700"
                       )}>
                         {isPref && <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500 shrink-0" />}
                         {opt}
                       </span>
                       {isSel && (
                         <Check className={cn("w-3 h-3 shrink-0 ml-1", isOver ? "text-red-600" : "text-indigo-600")} />
                       )}
                     </button>
                   );
                 })}
               </>
            )}
            
            {otherOptions.length > 0 && (
               <>
                 <div className="px-2 py-1 text-[8px] font-black text-slate-400 bg-slate-50 rounded uppercase tracking-widest mt-2 mb-1">
                    Outras Funções
                 </div>
                 {otherOptions.map((opt) => {
                   const isPref = isOptPreferred(opt);
                   return (
                     <button
                       key={opt}
                       onClick={() => {
                         if (selected.includes(opt))
                           onChange(selected.filter((x) => x !== opt));
                         else onChange([...selected, opt]);
                       }}
                       className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded w-full opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                     >
                       <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                         {isPref && <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500 shrink-0" />}
                         {opt}
                       </span>
                       {selected.includes(opt) && (
                         <Check className="w-3 h-3 text-indigo-600 shrink-0 ml-1" />
                       )}
                     </button>
                   );
                 })}
               </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
