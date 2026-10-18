import React from 'react';
import { Star } from 'lucide-react';
import { UserProfile } from '../../../types';
import { cn } from '../../../lib/utils';

export function getCapabilities(m: UserProfile) {
  return [
    {
      active: m.ativoCondutor,
      label: "Motorista",
      color: "bg-emerald-100 text-emerald-700 border-emerald-200",
      items: [
        ...(m.viaturas?.ABT ? ["ABT"] : []),
        ...(m.viaturas?.ABSL ? ["ABSL"] : []),
        ...(m.viaturas?.ASE ? ["ASE"] : []),
        ...(m.viaturas?.AR ? ["AR"] : []),
        ...(m.viaturas?.ARC ? ["ARC"] : []),
        ...(m.ativoEncarregado ? ["ENCARR."] : []),
        ...(m.ativoAbastecedor ? ["ABAST."] : []),
      ],
    },
    {
      active: m.ativoChefeGua,
      label: "Chefe",
      color: "bg-blue-100 text-blue-700 border-blue-200",
      items: [
        ...(m.chefeAbt ? ["ABT"] : []),
        ...(m.chefeAbsl ? ["ABSL"] : []),
      ],
    },
    {
      active: m.ativoMaritimo,
      label: "Marítimo",
      color: "bg-cyan-100 text-cyan-700 border-cyan-200",
      items: [
        ...(m.mestreAl ? ["MESTRE L"] : []),
        ...(m.mestreBia ? ["MESTRE BIA"] : []),
        ...(m.opAma ? ["OP. AMA"] : []),
        ...(m.gvAma ? ["GV AMA"] : []),
        ...(m.marinheiros ? ["MARINHEIRO"] : []),
      ],
    },
    {
      active: m.ativoEnfermeiro,
      label: "Enfermeiro",
      color: "bg-rose-100 text-rose-700 border-rose-200",
      items: [],
    },
    {
      active: m.ativoComunicante,
      label: "Comunicante",
      color: "bg-amber-100 text-amber-700 border-amber-200",
      items: [],
    },
    {
      active: m.ativoGraduado,
      label: "Graduado",
      color: "bg-purple-100 text-purple-700 border-purple-200",
      items: [
        ...(m.adjunto ? ["ADJUNTO"] : []),
        ...(m.sgtDia ? ["SGT DIA"] : []),
        ...(m.cmtGuarda ? ["CMT GUARDA"] : []),
        ...(m.disponivel1 ? ["DISP 1"] : []),
        ...(m.disponivel2 ? ["DISP 2"] : []),
      ],
    },
    {
      active: m.ativoCbsSds,
      label: "Sentinela/CbDia",
      color: "bg-indigo-100 text-indigo-700 border-indigo-200",
      items: [
        ...(m.faxina ? ["FAXINA"] : []),
        ...(m.sentinela ? ["SENTINELA"] : []),
        ...(m.deposito ? ["DEPÓSITO"] : []),
        ...(m.toqueDeFogo ? ["TQ FOGO"] : []),
        ...(m.auxRancho ? ["AUX RANCHO"] : []),
        ...(m.cbGuarda ? ["CB GUARDA"] : []),
        ...(m.cbDia ? ["CB DIA"] : []),
        ...(m.disponivelCbsSds ? ["DISP"] : []),
      ],
    },
    {
      active: m.ativoAuxiliar,
      label: "Auxiliar VTR",
      color: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
      items: [
        ...(m.auxAbt ? ["ABT"] : []),
        ...(m.auxAbsl ? ["ABSL"] : []),
        ...(m.auxArc ? ["ARC"] : []),
        ...(m.auxAse ? ["ASE"] : []),
        ...(m.disponivelAux ? ["DISP"] : []),
      ],
    },
  ];
}

export function CapabilitiesView({ 
  militar, 
  otherMilitar 
}: { 
  militar: UserProfile | undefined; 
  otherMilitar?: UserProfile | undefined;
}) {
  if (!militar) return <div className="text-xs text-slate-400 p-2 text-center">Nenhum dado encontrado para as funções.</div>;
  
  const mCapabilities = getCapabilities(militar);
  const otherCapabilities = otherMilitar ? getCapabilities(otherMilitar) : null;
  
  let commonSubItemsCount = 0;

  const capabilitiesWithCommonFlags = mCapabilities.filter(c => c.active).map(cap => {
    const otherCap = otherCapabilities?.find(oc => oc.label === cap.label && oc.active);
    const isParentCommon = !!otherCap && cap.items.length === 0 && otherCap.items.length === 0;

    const items = cap.items.map(item => {
      const isCommon = otherCap ? otherCap.items.includes(item) : false;
      if (isCommon) commonSubItemsCount++;
      return { text: item, isCommon };
    });

    return {
      ...cap,
      isParentCommon,
      items
    };
  });

  return (
    <div className="w-full mt-2 pt-2 border-t border-slate-200/50 flex flex-col gap-1.5">
      <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 mb-0.5">
        <Star className="w-2.5 h-2.5" /> Funções Operacionais
      </h3>
      {capabilitiesWithCommonFlags.length === 0 ? (
        <div className="text-center py-2 text-slate-500 text-[10px] font-bold bg-white/50 rounded-lg border border-slate-100">
          Nenhuma função operacional cadastrada.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {capabilitiesWithCommonFlags.map(cap => (
            <div key={cap.label} className={cn("p-2 rounded-lg border flex flex-col relative", cap.color, cap.isParentCommon && "bg-yellow-100 border-yellow-300 text-yellow-900")}>
               <div className="font-black uppercase tracking-wider text-[11px] leading-none mb-1">{cap.label}</div>
               {cap.items.length > 0 && (
                 <div className="flex flex-wrap gap-1 mt-1">
                   {cap.items.map(item => (
                     <span 
                        key={item.text} 
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest leading-none border", 
                          item.isCommon 
                            ? "bg-yellow-300 text-yellow-900 border-yellow-400 shadow-[0_1px_4px_-1px_rgba(234,179,8,0.5)]" 
                            : "bg-white/50 border-transparent shadow-none"
                        )}
                     >
                       {item.text}
                     </span>
                   ))}
                 </div>
               )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
