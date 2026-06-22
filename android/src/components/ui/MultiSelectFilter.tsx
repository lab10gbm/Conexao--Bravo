import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface MultiSelectFilterProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}

export function MultiSelectFilter({ 
  label, 
  options, 
  selected, 
  onChange 
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`flex flex-col gap-2 relative ${open ? 'z-[100]' : 'z-10'}`} ref={ref}>
       <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">{label}</label>
       <button 
         type="button"
         onClick={() => setOpen(!open)}
         className={`flex items-center justify-between border-2 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest transition-all outline-none w-full text-left h-14 ${open ? 'bg-white border-indigo-500 ring-8 ring-indigo-500/5 shadow-sm text-indigo-700' : 'bg-white border-slate-100 hover:border-slate-200 text-slate-500 shadow-sm'}`}
       >
          <span className="truncate pr-4">
            {selected.length === 0 
              ? 'Todos / Geral' 
              : selected.length === 1 
                ? selected[0] 
                : `${selected.length} Selecionados`}
          </span>
          <ChevronDown size={16} className={`transition-transform duration-300 ${open ? 'rotate-180 text-indigo-500' : 'text-slate-300'}`} />
       </button>
       
       {open && (
         <div className="absolute top-full left-0 mt-3 min-w-[100%] w-max max-w-[320px] bg-white border border-slate-200 shadow-2xl rounded-3xl z-[100] max-h-[350px] overflow-y-auto flex flex-col p-3 animate-in fade-in slide-in-from-top-2 duration-200 small-scrollbar">
            <div className="flex flex-col gap-1">
              <button 
                 onClick={() => onChange([])}
                 className={`flex items-center justify-between p-3 rounded-xl transition-all ${selected.length === 0 ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-500'}`}
              >
                 <span className="text-[10px] font-black uppercase tracking-widest">Todos / Geral</span>
                 {selected.length === 0 && <Check size={14} />}
              </button>
              
              <div className="h-px bg-slate-100 my-2" />

              {options.map(opt => (
                <button 
                  key={opt} 
                  onClick={() => {
                    if (selected.includes(opt)) onChange(selected.filter(x => x !== opt));
                    else onChange([...selected, opt]);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all ${selected.includes(opt) ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-500'}`}
                >
                   <span className="text-[10px] font-black uppercase tracking-widest break-words pr-2">{opt}</span>
                   {selected.includes(opt) && <Check size={14} />}
                </button>
              ))}
            </div>
         </div>
       )}
    </div>
  );
}
