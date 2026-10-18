import React from 'react';
import { X, FastForward, Check } from 'lucide-react';

interface PermutaActionButtonsProps {
  onIndeferir: () => void;
  onSkip: () => void;
  onDeferir: () => void;
}

export const PermutaActionButtons: React.FC<PermutaActionButtonsProps> = ({
  onIndeferir,
  onSkip,
  onDeferir,
}) => {
  return (
    <div className="w-full pt-8 pb-4 shrink-0 flex justify-center items-center gap-4 sm:gap-6 z-10">
      <button 
        onClick={onIndeferir}
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border-2 border-red-100 border-b-[4px] text-red-500 flex items-center justify-center hover:bg-red-50 hover:border-red-200 hover:-translate-y-1 active:translate-y-0 active:border-b-2 transition-all shadow-sm cursor-pointer"
        title="Indeferir"
      >
        <X className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={3} />
      </button>
      
      <button 
        onClick={onSkip}
        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white border-2 border-slate-200 border-b-[4px] text-slate-500 flex items-center justify-center hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-1 active:translate-y-0 active:border-b-2 transition-all shadow-sm cursor-pointer"
        title="Pular"
      >
        <FastForward className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={3} />
      </button>

      <button 
        onClick={onDeferir}
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border-2 border-emerald-100 border-b-[4px] text-emerald-500 flex items-center justify-center hover:bg-emerald-50 hover:border-emerald-200 hover:-translate-y-1 active:translate-y-0 active:border-b-2 transition-all shadow-sm cursor-pointer"
        title="Deferir"
      >
        <Check className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={3} />
      </button>
    </div>
  );
};
