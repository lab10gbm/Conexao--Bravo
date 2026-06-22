import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, CalendarDays, ArrowRight, ArrowRightLeft, Search, CheckCircle2, AlertCircle, FileSignature } from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAlaForDate, getAlaColor, getAlaLightColor, cn } from '../lib/utils';
import { UserProfile } from '../types';
import { useMilitars } from '../contexts/MilitarContext';

interface SimuladorProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

export function Simulador48x144({ user, isOpen, onClose }: SimuladorProps) {
  const { militars: militaries, loading } = useMilitars();
  const [partnerRg, setPartnerRg] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(addDays(new Date(), 60), 'yyyy-MM-dd'));
  const [starterId, setStarterId] = useState<string>(user.rg);
  const [searchMode, setSearchMode] = useState<'rg' | 'announce'>('rg');
  const [proposalSent, setProposalSent] = useState(false);
  const [announcementMade, setAnnouncementMade] = useState(false);

  const userAlaNum = parseInt(user.ala?.toString() || '0');
  const availableAlas = useMemo(() => {
    const alas = [];
    if (userAlaNum > 0) {
      const prev = userAlaNum === 1 ? 4 : userAlaNum - 1;
      const next = userAlaNum === 4 ? 1 : userAlaNum + 1;
      alas.push(prev, next);
    }
    return alas;
  }, [userAlaNum]);

  useEffect(() => {
    if (isOpen) {
      setPartnerRg('');
      setProposalSent(false);
      setAnnouncementMade(false);
    }
  }, [isOpen]);

  const partner = React.useMemo(() => militaries.find(m => m.rg === partnerRg), [militaries, partnerRg]);
  const isPartnerValid = partner && availableAlas.includes(parseInt(partner.ala.toString()));

  // Generate simulation days
  let simulationDays: { date: Date, ala: number, workingIds: string[] }[] = [];
  
  if (startDate && endDate && (isPartnerValid || searchMode === 'announce')) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.min(Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1, 180); // max 180 days simulation
    
    // Fallback if announcing without specific partner ala
    const partnerAlaNum = isPartnerValid && partner ? parseInt(partner.ala.toString()) : availableAlas[0];
    
    let currentWorkerId = starterId;
    
    for (let i = 0; i < diffDays; i++) {
        const d = addDays(start, i);
        const alaOfDay = getAlaForDate(d);
        
        let workingIds = [];
        
        if (alaOfDay === userAlaNum || alaOfDay === partnerAlaNum) {
            workingIds.push(currentWorkerId);
            
            const isSecondDayInBlock = 
                (userAlaNum === 1 && partnerAlaNum === 2 && alaOfDay === 2) ||
                (userAlaNum === 2 && partnerAlaNum === 1 && alaOfDay === 2) ||
                (userAlaNum === 2 && partnerAlaNum === 3 && alaOfDay === 3) ||
                (userAlaNum === 3 && partnerAlaNum === 2 && alaOfDay === 3) ||
                (userAlaNum === 3 && partnerAlaNum === 4 && alaOfDay === 4) ||
                (userAlaNum === 4 && partnerAlaNum === 3 && alaOfDay === 4) ||
                (userAlaNum === 4 && partnerAlaNum === 1 && alaOfDay === 1) ||
                (userAlaNum === 1 && partnerAlaNum === 4 && alaOfDay === 1);
                
            if (isSecondDayInBlock) {
               currentWorkerId = currentWorkerId === user.rg ? (partner ? partner.rg : 'PARCEIRO') : user.rg;
            }
        }
        
        simulationDays.push({
            date: d,
            ala: alaOfDay,
            workingIds
        });
    }
  }

  const handlePropose = () => {
    setProposalSent(true);
    setTimeout(() => {
       alert(`Contrato de parceria 48x144 enviado para ${partner?.rank} ${partner?.warName || partner?.name}. Aguardando aceite do militar e deferimento do escalante.`);
    }, 500);
  };
  
  const handleAnnounce = () => {
    setAnnouncementMade(true);
    setTimeout(() => {
       alert(`Sua vaga de parceria foi anunciada no mural! Outros militares das Alas ${availableAlas.join(' ou ')} poderão se candidatar.`);
    }, 500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white rounded-3xl shadow-xl w-full max-w-5xl overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-indigo-600 p-6 flex items-center justify-between text-white">
               <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                     <ArrowRightLeft className="w-6 h-6" /> Escala 48h x 144h
                  </h2>
                  <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mt-1">
                     Firmar contrato de parceria de escala
                  </p>
               </div>
               <button onClick={onClose} className="p-2 bg-indigo-700/50 hover:bg-indigo-700 rounded-full transition-colors text-white">
                 <X className="w-5 h-5" />
               </button>
            </div>

            <div className="p-6 flex flex-col md:flex-row gap-6">
               <div className="flex-1">
                 <div className="flex gap-2 mb-6">
                    <button 
                      onClick={() => { setSearchMode('rg'); setAnnouncementMade(false); setPartnerRg(''); }}
                      className={cn("flex-1 p-3 rounded-xl font-black uppercase tracking-widest text-xs transition", searchMode === 'rg' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
                    >
                      Indicar Parceiro (RG)
                    </button>
                    <button 
                      onClick={() => { setSearchMode('announce'); setPartnerRg(''); setProposalSent(false); }}
                      className={cn("flex-1 p-3 rounded-xl font-black uppercase tracking-widest text-xs transition flex items-center justify-center gap-2", searchMode === 'announce' ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
                    >
                      <Search className="w-4 h-4" /> Anunciar Vaga
                    </button>
                 </div>

                 <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                    {searchMode === 'rg' ? (
                       <div>
                         <label className="block text-[10px] font-black tracking-widest uppercase text-slate-400 mb-2">RG do Parceiro (Ala {availableAlas.join(' ou ')})</label>
                         <input 
                           type="text"
                           placeholder="Digite o RG..."
                           className="w-full p-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                           value={partnerRg}
                           onChange={(e) => setPartnerRg(e.target.value)}
                         />
                         {partnerRg && !isPartnerValid && (
                            <p className="text-red-500 text-xs font-bold mt-2 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Militar não encontrado ou pertence à Ala incorreta.</p>
                         )}
                         {isPartnerValid && partner && (
                            <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-3">
                               <div className="w-10 h-10 bg-indigo-200 text-indigo-800 rounded-full flex items-center justify-center font-black">
                                 {partner.ala}
                               </div>
                               <div>
                                 <p className="font-bold text-indigo-900">{partner.rank} {partner.warName || partner.name}</p>
                                 <p className="text-xs text-indigo-700">Ala {partner.ala} • RG: {partner.rg}</p>
                               </div>
                               <CheckCircle2 className="w-6 h-6 text-indigo-600 ml-auto" />
                            </div>
                         )}
                       </div>
                    ) : (
                       <div className="text-center py-4 text-slate-500">
                          <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm font-bold">Você anunciará sua disponibilidade.</p>
                          <p className="text-xs mt-1">Qualquer militar das Alas {availableAlas.join(' ou ')} poderá aceitar o convite.</p>
                       </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-[10px] font-black tracking-widest uppercase text-slate-400 mb-2">Início do Contrato</label>
                          <input 
                            type="date"
                            className="w-full p-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                          />
                       </div>
                       <div>
                          <label className="block text-[10px] font-black tracking-widest uppercase text-slate-400 mb-2">Fim do Contrato</label>
                          <input 
                            type="date"
                            className="w-full p-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                          />
                       </div>
                    </div>

                    <div>
                       <label className="block text-[10px] font-black tracking-widest uppercase text-slate-400 mb-2">Quem tira o 1º Serviço?</label>
                       <select 
                         className="w-full p-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none"
                         value={starterId}
                         onChange={(e) => setStarterId(e.target.value)}
                       >
                         <option value={user.rg}>Eu ({user.rank} {user.warName || user.name})</option>
                         <option value={isPartnerValid ? partnerRg : 'PARCEIRO'}>
                            O Parceiro {isPartnerValid ? `(${partner?.rank} ${partner?.warName || partner?.name})` : ''}
                         </option>
                       </select>
                    </div>

                 </div>

                 <div className="mt-6">
                    {searchMode === 'rg' && isPartnerValid ? (
                       <button 
                          onClick={handlePropose}
                          disabled={proposalSent}
                          className={cn("w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition flex items-center justify-center gap-2", proposalSent ? "bg-emerald-500 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30")}
                       >
                          {proposalSent ? <><CheckCircle2 className="w-5 h-5" /> Proposta Enviada</> : <><FileSignature className="w-5 h-5" /> Firmar Contrato com Parceiro</>}
                       </button>
                    ) : searchMode === 'announce' ? (
                       <button 
                          onClick={handleAnnounce}
                          disabled={announcementMade}
                          className={cn("w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition flex items-center justify-center gap-2", announcementMade ? "bg-emerald-500 text-white" : "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30")}
                       >
                          {announcementMade ? <><CheckCircle2 className="w-5 h-5" /> Vaga Anunciada</> : <><Users className="w-5 h-5" /> Anunciar Vaga de Parceiro</>}
                       </button>
                    ) : (
                       <div className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest bg-slate-100 text-slate-400 text-center flex justify-center items-center gap-2 border border-slate-200">
                           <AlertCircle className="w-5 h-5" /> Preencha as informações
                       </div>
                    )}
                 </div>
               </div>

               <div className="flex-1 border-t md:border-t-0 md:border-l border-slate-200 md:pl-6 pt-6 md:pt-0">
                 {simulationDays.length > 0 ? (
                    <div>
                       <h3 className="text-lg font-black uppercase tracking-tighter text-slate-800 mb-4 border-b pb-2">Prévia da Escala (Simulação)</h3>
                       <div className="bg-white sticky top-0 pb-2 z-10">
                         <div className="flex items-center gap-4 text-[10px] font-black tracking-widest uppercase">
                            <div className="flex items-center gap-1.5">
                               <div className="w-3 h-3 rounded bg-indigo-600"></div>
                               <span>Você</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                               <div className="w-3 h-3 rounded bg-amber-500"></div>
                               <span>Parceiro</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                               <div className="w-3 h-3 rounded bg-slate-100 border border-slate-200"></div>
                               <span>Folga</span>
                            </div>
                         </div>
                       </div>
                       <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 lg:grid-cols-5 gap-2 overflow-y-auto max-h-[500px] p-2 bg-slate-50 rounded-2xl border border-slate-200 pr-2 pb-8">
                          {simulationDays.map(day => {
                             const isMyWork = day.workingIds.includes(user.rg);
                             const isPartnerWork = day.workingIds.includes(isPartnerValid ? partner.rg : 'PARCEIRO');
                             const partnerAlaNum = isPartnerValid && partner ? parseInt(partner.ala.toString()) : availableAlas[0];
                             const isA = day.ala === userAlaNum;
                             const isB = day.ala === partnerAlaNum;
                             const isWorkDay = isA || isB;
                             
                             return (
                                <div key={day.date.toISOString()} className={cn(
                                   "aspect-square rounded-xl p-2 flex flex-col justify-between border cursor-default transition-all duration-200",
                                   !isWorkDay ? "bg-white border-slate-200 text-slate-400" :
                                   isMyWork ? "bg-indigo-600 border-indigo-700 text-white shadow-md shadow-indigo-600/30 font-bold" :
                                   isPartnerWork ? "bg-amber-500 border-amber-600 text-white shadow-md shadow-amber-500/30 font-bold" : "bg-white"
                                )}>
                                   <div className="flex justify-between items-start">
                                      <span className={cn("font-black text-sm", (isMyWork || isPartnerWork) ? "text-white" : "text-slate-700")}>{format(day.date, 'dd/MM')}</span>
                                   </div>
                                   <div className="flex justify-between items-end">
                                     <span className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded", !isWorkDay ? "bg-slate-100 text-slate-500" : (isMyWork || isPartnerWork) ? "bg-white/20 text-white" : "")}>
                                        Ala {day.ala}
                                     </span>
                                     {(isMyWork || isPartnerWork) && (
                                        <div className="text-[10px] font-black text-right uppercase tracking-widest leading-none">
                                           {isMyWork ? 'Você' : 'Parc.'}
                                        </div>
                                     )}
                                   </div>
                                </div>
                             )
                          })}
                       </div>
                    </div>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                       <CalendarDays className="w-12 h-12 mb-4 opacity-50" />
                       <p className="font-black uppercase tracking-widest text-xs">Simulação Indisponível</p>
                       <p className="text-xs w-2/3 mt-2">Informe as datas e identifique um parceiro para visualizar a prévia da sua escala 48x144.</p>
                    </div>
                 )}
               </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

