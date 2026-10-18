import React, { useEffect, useRef, useState } from "react";
import { Truck, ClipboardList, Settings, RotateCcw, ChevronDown, Eraser } from "lucide-react";
import { cn } from "../lib/utils";
import { SorteioScope } from "../lib/sorteioFuncoes";

export interface SorteioActionBarProps {
  onSortear: (scope: SorteioScope) => void;
  onConfig: () => void;
  onLimpar: (scope: SorteioScope | "tudo") => void;
  /** Versão compacta para cabeçalhos de seção */
  compact?: boolean;
}

export function SorteioActionBar({ onSortear, onConfig, onLimpar, compact }: SorteioActionBarProps) {
  const [limparOpen, setLimparOpen] = useState(false);
  const limparRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!limparOpen) return;
    const handler = (e: MouseEvent) => {
      if (limparRef.current && !limparRef.current.contains(e.target as Node)) setLimparOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [limparOpen]);

  const h = compact ? "h-7" : "h-8";
  const text = compact ? "text-[10px]" : "text-[10.5px]";
  const icon = compact ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* Cluster Sortear */}
      <div className="flex items-center rounded-lg shadow-2xs border border-amber-500/40 overflow-hidden shrink-0">
        <button
          onClick={() => onSortear("viaturas")}
          className={cn(h, text, "px-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer")}
          title="Sortear funções de VIATURA (condutores, chefes, auxiliares…)"
        >
          <Truck className={icon} />
          <span className={compact ? "hidden lg:inline" : ""}>Sortear</span>
          <span>Viaturas</span>
        </button>
        <button
          onClick={() => onSortear("administrativas")}
          className={cn(h, text, "px-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-black uppercase tracking-wider flex items-center gap-1.5 border-l border-orange-300/40 transition-all active:scale-95 cursor-pointer")}
          title="Sortear funções ADMINISTRATIVAS (adjunto, sgt dia, comunicante, faxina…)"
        >
          <ClipboardList className={icon} />
          <span className={compact ? "hidden lg:inline" : ""}>Sortear</span>
          <span>Admin.</span>
        </button>
        <button
          onClick={onConfig}
          className={cn(h, "px-2 bg-orange-600 hover:bg-orange-500 text-white border-l border-orange-400/40 flex items-center justify-center transition-colors cursor-pointer")}
          title="Pré-definições fixas por militar"
        >
          <Settings className={icon} />
        </button>
      </div>

      {/* Limpar com menu */}
      <div className="relative shrink-0" ref={limparRef}>
        <button
          onClick={() => setLimparOpen((o) => !o)}
          className={cn(h, text, "px-2.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 font-black uppercase tracking-wider shadow-2xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer", limparOpen && "bg-rose-50 text-rose-700 border-rose-200")}
          title="Limpar funções da escala"
        >
          <RotateCcw className={cn(icon, "text-rose-500")} />
          <span>Limpar</span>
          <ChevronDown className={cn("w-3 h-3 transition-transform", limparOpen && "rotate-180")} />
        </button>
        {limparOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-xl border border-slate-200 shadow-2xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-1">
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
              O que deseja limpar?
            </div>
            {([
              { id: "viaturas", label: "Funções de viatura", desc: "Condutores, chefes e auxiliares", Icon: Truck, color: "text-orange-500" },
              { id: "administrativas", label: "Funções administrativas", desc: "Adjunto, SGT dia, faxina…", Icon: ClipboardList, color: "text-indigo-500" },
              { id: "tudo", label: "Limpar tudo", desc: "Todas as funções (sentinela preservada)", Icon: Eraser, color: "text-rose-500" },
            ] as const).map(({ id, label, desc, Icon, color }) => (
              <button
                key={id}
                onClick={() => { setLimparOpen(false); onLimpar(id); }}
                className={cn("w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-rose-50/60 transition-colors cursor-pointer border-b border-slate-100 last:border-0", id === "tudo" && "bg-rose-50/30")}
              >
                <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", color)} />
                <span className="flex flex-col">
                  <span className="text-[11px] font-black uppercase tracking-wide text-slate-800">{label}</span>
                  <span className="text-[10px] font-medium text-slate-500">{desc}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
