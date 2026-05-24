import React, { useState, useMemo } from 'react';
import { X, CalendarCheck, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAlaForDate, getOppositeAla, cn } from '../lib/utils';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface PermutaGrdModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  grdData: Record<string, string[]>;
  meusDiasDeGrd: { dateStr: string; date: Date; index: number }[];
  militars: UserProfile[];
  monthDaysOnly: Date[];
}

export function PermutaGrdModal({
  isOpen,
  onClose,
  user,
  grdData,
  meusDiasDeGrd,
  militars,
  monthDaysOnly
}: PermutaGrdModalProps) {
  const [selectedMyDay, setSelectedMyDay] = useState<string | null>(null);
  const [selectedTargetDay, setSelectedTargetDay] = useState<string | null>(null);
  const [selectedTargetMilitar, setSelectedTargetMilitar] = useState<string | null>(null);

  // The day the user picked of their own service
  const myDay = useMemo(() => {
    return meusDiasDeGrd.find(d => d.dateStr === selectedMyDay) || null;
  }, [meusDiasDeGrd, selectedMyDay]);

  // Determine which vaga rule applies. 0 -> vaga 1. 1 -> vaga 2. >= 2 -> vaga 3,4,5.
  const isVagaMatch = (myIndex: number, targetIndex: number) => {
    if (myIndex === 0) return targetIndex === 0;
    if (myIndex === 1) return targetIndex === 1;
    if (myIndex >= 2) return targetIndex >= 2;
    return false;
  };

  // Find all possible target permutations
  const availableOptions = useMemo(() => {
    if (!myDay) return [];
    
    // my target ala on myDay is getOppositeAla(getAlaForDate(myDay.date)) -> but this is actually target ala for that day. 
    // the user wants to permute.
    // If I give my day to TargetUser, TargetUser CANNOT be in their regular ala shift on myDay.date.
    // If I take TargetUser's day, I CANNOT be in my regular ala shift on TargetUser's day.
    
    const myRegularAla = parseInt(user.ala?.toString() || '0');
    
    const options: { dateStr: string, date: Date, targetRg: string, targetName: string, targetVaga: number }[] = [];
    
    for (const d of monthDaysOnly) {
      const dateStr = format(d, 'yyyy-MM-dd');
      if (dateStr === myDay.dateStr) continue; // can't swap with same day
      
      const dayAla = getAlaForDate(d);
      
      // If I take this day (d), I cannot have my regular shift on day d.
      // My regular shift is myRegularAla.
      // But wait! This is GRD. According to rules: "um militar da ala 2 não pode ser escolhido para uma dia que ele está de serviço na ala 2"
      // If myRegularAla == dayAla, I am working my regular shift on day d. I cannot do GRD on day d.
      if (myRegularAla !== 0 && myRegularAla === dayAla) continue;
      
      const dayRgs = grdData[dateStr] || [];
      dayRgs.forEach((rg, index) => {
        if (!rg) return;
        if (rg === user.rg) return; // can't swap with myself 
        
        // Check Vaga Match
        if (!isVagaMatch(myDay.index, index)) return;
        
        const targetUser = militars.find(m => m.rg === rg);
        if (!targetUser) return;
        
        // TargetUser cannot be in their regular ala shift on myDay.date
        const targetRegularAla = parseInt(targetUser.ala?.toString() || '0');
        const myDayAla = getAlaForDate(myDay.date);
        
        if (targetRegularAla !== 0 && targetRegularAla === myDayAla) return; // Target user is working their regular shift on my day
        
        options.push({
          dateStr,
          date: d,
          targetRg: rg,
          targetName: `${targetUser.rank || ''} ${targetUser.warName || targetUser.name}`.trim(),
          targetVaga: index + 1
        });
      });
    }
    
    // Group by Date for better UI?
    return options.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [myDay, monthDaysOnly, grdData, user, militars]);

  // Handle closing and reset state
  const handleClose = () => {
    setSelectedMyDay(null);
    setSelectedTargetDay(null);
    setSelectedTargetMilitar(null);
    onClose();
  };

  const handleRequest = () => {
    if (!selectedMyDay || !selectedTargetMilitar) return;
    alert("Permuta solicitada com sucesso! (Fluxo em desenvolvimento)");
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col"
        >
          <div className="p-4 sm:p-6 bg-gradient-to-r from-amber-500 to-amber-600 border-b flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <ArrowRightLeft className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter shadow-sm">Solicitar Permuta GRD (Extraordinária)</h2>
                <p className="text-[11px] font-bold text-amber-100 uppercase tracking-widest mt-0.5">Módulo de Troca de Serviço</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 flex-1 overflow-y-auto max-h-[70vh]">
            <div className="space-y-6">
              
              {/* Passo 1 */}
              <div>
                 <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-500 mb-3 border-b-2 border-slate-100 pb-2">
                    1. Qual serviço você deseja passar?
                 </h3>
                 
                 {meusDiasDeGrd.length === 0 ? (
                    <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-center">
                       <p className="text-[11px] font-bold text-slate-500">Você não possui serviços de GRD neste mês.</p>
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                       {meusDiasDeGrd.map(d => (
                         <button
                           key={d.dateStr}
                           onClick={() => {
                             setSelectedMyDay(d.dateStr);
                             setSelectedTargetDay(null);
                             setSelectedTargetMilitar(null);
                           }}
                           className={cn(
                             "p-3 rounded-xl border-2 text-left flex items-start gap-3 transition-colors",
                             selectedMyDay === d.dateStr 
                               ? "bg-amber-50 border-amber-500 shadow-sm" 
                               : "bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/30"
                           )}
                         >
                           <CalendarCheck className={cn("w-5 h-5 shrink-0 mt-0.5", selectedMyDay === d.dateStr ? "text-amber-600" : "text-slate-400")} />
                           <div>
                              <p className={cn("text-[14px] font-black leading-none", selectedMyDay === d.dateStr ? "text-amber-900" : "text-slate-700")}>
                                {format(d.date, "dd 'de' MMMM", { locale: ptBR })}
                              </p>
                              <p className={cn("text-[10px] font-bold uppercase mt-1", selectedMyDay === d.dateStr ? "text-amber-700" : "text-slate-500")}>
                                Vaga {d.index + 1}
                              </p>
                           </div>
                         </button>
                       ))}
                    </div>
                 )}
              </div>

              {/* Passo 2 */}
              {selectedMyDay && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-500 mb-3 border-b-2 border-slate-100 pb-2 mt-2">
                    2. Com qual militar (e serviço) você deseja trocar?
                  </h3>
                  
                  <div className="bg-slate-50 p-3 rounded-lg mb-4 flex gap-2 items-start text-[10px] font-bold text-slate-600 border border-slate-200">
                     <AlertCircle className="w-4 h-4 text-blue-500 shrink-0" />
                     <p>Regras aplicadas: Trocas devem respeitar nível de vaga (V1 com V1, V2 com V2, e V3/V4/V5 entre si). Não é possível permutar para um dia em que você (ou o alvo) já possua escala-fim.</p>
                  </div>
                  
                  {availableOptions.length === 0 ? (
                     <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-center">
                       <p className="text-[11px] font-bold text-slate-500">Nenhuma opção de troca viável encontrada para essa vaga neste mês.</p>
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
                        {availableOptions.map(opt => {
                           const key = `${opt.dateStr}-${opt.targetRg}`;
                           const isSelected = selectedTargetDay === opt.dateStr && selectedTargetMilitar === opt.targetRg;
                           
                           return (
                             <button
                               key={key}
                               onClick={() => {
                                 setSelectedTargetDay(opt.dateStr);
                                 setSelectedTargetMilitar(opt.targetRg);
                               }}
                               className={cn(
                                 "p-3 rounded-xl border-2 text-left flex items-center justify-between transition-colors",
                                 isSelected 
                                   ? "bg-indigo-50 border-indigo-500 shadow-sm" 
                                   : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
                               )}
                             >
                               <div className="flex flex-col">
                                  <span className={cn("text-[13px] font-black uppercase", isSelected ? "text-indigo-900" : "text-slate-700")}>
                                     {opt.targetName}
                                  </span>
                                  <span className={cn("text-[10px] font-bold", isSelected ? "text-indigo-700" : "text-slate-500")}>
                                     Dia {format(opt.date, 'dd/MM')} — Vaga {opt.targetVaga}
                                  </span>
                               </div>
                               
                               {isSelected && (
                                 <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center shadow-sm">
                                   <ArrowRightLeft className="w-3 h-3 text-white" />
                                 </div>
                               )}
                             </button>
                           );
                        })}
                     </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6 border-t bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
            <button
              onClick={handleClose}
              className="px-6 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              disabled={!selectedMyDay || !selectedTargetMilitar}
              onClick={handleRequest}
              className="px-6 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2"
            >
              Confirmar Permuta
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
