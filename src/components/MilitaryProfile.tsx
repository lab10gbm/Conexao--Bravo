import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Mail, Phone, MapPin, Calendar, Contact, 
  Award, Briefcase, Building2, Shield, ArrowRightLeft,
  User, CheckCircle2, MapPinned, UserCheck, Sun, PlaneTakeoff
} from 'lucide-react';
import { UserProfile, Vacation } from '../types';
import { RankInsignia } from './RankInsignia';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface MilitaryProfileProps {
  militar: UserProfile;
  viewer: UserProfile;
  onClose: () => void;
  onLendRequested?: (militar: UserProfile) => void;
  inline?: boolean;
}

export function MilitaryProfile({ militar, viewer, onClose, onLendRequested, inline = false }: MilitaryProfileProps) {
  const isAdmin = viewer.isAdmin;
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [loadingVacations, setLoadingVacations] = useState(true);

  useEffect(() => {
    if (!militar?.rg) {
      setVacations([]);
      setLoadingVacations(false);
      return;
    }
    setLoadingVacations(true);
    const q = query(collection(db, 'vacations'), where('militarRg', '==', militar.rg));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vacation));
      setVacations(data);
      setLoadingVacations(false);
    }, (error) => {
      console.error("Error fetching vacations", error);
      setLoadingVacations(false);
    });
    return () => unsub();
  }, [militar?.rg]);

  const content = (
    <>
      {/* Header/Cover */}
      <div className="h-24 sm:h-32 bg-gradient-to-r from-indigo-600 to-indigo-800 relative shrink-0">
        {!inline && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-20"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Profile Avatar & Basic Info */}
      <div className="px-6 sm:px-8 pb-6 sm:pb-8 relative flex-1 overflow-y-auto overflow-x-hidden pt-4 custom-scrollbar">
        <div className="flex flex-col sm:flex-row gap-6 -mt-16 sm:-mt-12 items-center sm:items-center">
          <div className="relative shrink-0">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-white p-1.5 sm:p-2 shadow-xl">
              <div className="w-full h-full rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-slate-50 relative">
                {militar.photoURL ? (
                  <img src={militar.photoURL} alt={militar.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center">
                     <RankInsignia rankStr={militar.rank} className="scale-150 mb-4" />
                     <User className="w-12 h-12 text-slate-300 -mt-2" />
                  </div>
                )}
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-white p-1 shadow-lg">
              <div className={`w-full h-full rounded-full flex items-center justify-center font-black text-xs ${
                militar.ala === 'EXP' ? 'bg-slate-500 text-white' : 
                militar.ala === '1' ? 'bg-green-500 text-white' :
                militar.ala === '2' ? 'bg-rose-500 text-white' :
                militar.ala === '3' ? 'bg-blue-500 text-white' :
                militar.ala === '4' ? 'bg-amber-500 text-white' : 'bg-indigo-500 text-white'
              }`}>
                {militar.ala}
              </div>
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">
                {militar.rank} {militar.warName || (militar.name || '').split(' ')[0]}
              </h2>
              {militar.situacao?.toUpperCase() === 'ATIVO' && (
                <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> <span className="hidden xs:inline">Ativo</span>
                </span>
              )}
            </div>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest flex items-center justify-center sm:justify-start gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" /> {militar.obm || '10º GBM'}
              {militar.lentTo && (
                 <span className="text-amber-600 font-black flex items-center gap-1 bg-amber-50 px-2 rounded">
                   <ArrowRightLeft className="w-3 h-3" /> <span className="hidden xs:inline">Emprestado para </span>{militar.lentTo}
                 </span>
              )}
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => militar && onLendRequested?.(militar)}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
            >
              <ArrowRightLeft className="w-4 h-4" /> Emprestar
            </button>
          )}
        </div>

        {/* Content Tabs/Grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Férias (Full Width) */}
          <section className="md:col-span-2">
            <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2 pb-2 border-b border-indigo-100">
              <Sun className="w-4 h-4" /> Plano de Férias e Afastamentos
            </h3>
            <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 p-4 shadow-sm">
               {loadingVacations ? (
                  <div className="flex items-center gap-3 text-indigo-400">
                    <div className="w-5 h-5 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin" />
                    <span className="font-bold text-[10px] uppercase tracking-widest">Buscando registros...</span>
                  </div>
               ) : vacations.length > 0 ? (
                 <div className="space-y-3">
                   {vacations.map(vac => (
                      <div key={vac.id} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-3 rounded-xl border border-indigo-100/60 shadow-sm relative overflow-hidden">
                         <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-400" />
                         <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-widest">Ano Ref: {vac.anoRef}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ato: {vac.ato}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 font-bold text-xs text-slate-700">
                              <div className="flex items-center gap-1.5">
                                <PlaneTakeoff className="w-3.5 h-3.5 text-slate-400" />
                                {vac.dataInicio}
                              </div>
                              <div className="h-px bg-slate-200 w-3 hidden sm:block" />
                              <div className="flex items-center gap-1.5 opacity-60">
                                {vac.dataRetorno}
                              </div>
                            </div>
                         </div>
                         <div className="flex flex-row sm:flex-col gap-3 sm:gap-1 text-right border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-3">
                            <div>
                              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Dias Tirados</div>
                              <div className="text-base font-black text-slate-700">{vac.diasGozados}</div>
                            </div>
                            <div>
                              <div className="text-[8px] font-black text-emerald-500/70 uppercase tracking-widest">A Tirar</div>
                              <div className="text-base font-black text-emerald-600">{vac.diasAGozar}</div>
                            </div>
                         </div>
                      </div>
                   ))}
                 </div>
               ) : (
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <Calendar className="w-3.5 h-3.5" /> Nenhum registro de férias encontrado.
                 </p>
               )}
            </div>
          </section>

          {/* Column 1: Physical/Personal */}
          <div className="space-y-6">
            <section>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Contact className="w-4 h-4" /> Identificação e Dados
              </h3>
              <div className="space-y-3">
                <InfoRow label="Nome Completo" value={militar.name} />
                <InfoRow label="Pai" value={militar.pai} />
                <InfoRow label="Mãe" value={militar.mae} />
                <InfoRow label="RG" value={militar.rg} />
                <InfoRow label="CPF" value={militar.cpf} />
                <InfoRow label="ID Funcional" value={militar.idFuncional} />
                <InfoRow label="Nascimento" value={militar.nascimento} icon={Calendar} />
                <InfoRow label="Quadro" value={militar.quadro} icon={Briefcase} />
                <InfoRow label="Última Promoção" value={militar.promotionDate} icon={Award} />
                <InfoRow label="CNH" value={militar.cnh} />
                <InfoRow label="Cat CNH" value={militar.cnhCat} />
                <InfoRow label="Instrução" value={militar.grauInstrucao} />
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Mail className="w-4 h-4" /> Contato
              </h3>
              <div className="space-y-3">
                <InfoRow label="E-mail" value={militar.email} icon={Mail} lowercase />
                <InfoRow label="Celular" value={militar.cel} icon={Phone} />
                <InfoRow label="Telefone" value={militar.tel} icon={Phone} />
                <InfoRow label="Endereço" value={militar.endereco} icon={MapPin} fullWidth />
                <InfoRow label="Bairro" value={militar.bairro} icon={MapPinned} />
                <InfoRow label="Cidade" value={militar.cidade} icon={MapPinned} />
                <InfoRow label="CEP" value={militar.cep} />
              </div>
            </section>
          </div>

           {/* Column 2: Professional/Competencies */}
           <div className="space-y-6">
             <section>
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <Award className="w-4 h-4" /> Competências e Especialidades
               </h3>
               <div className="flex flex-wrap gap-2">
                 {militar.specializations && militar.specializations.length > 0 ? (
                   militar.specializations.map(spec => (
                     <span 
                       key={spec}
                       className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-tight rounded-lg hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors cursor-default"
                     >
                       {spec}
                     </span>
                   ))
                 ) : (
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Nenhuma especialidade registrada</p>
                 )}
               </div>
             </section>

             <section>
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <UserCheck className="w-4 h-4" /> Funções e Aptidões
               </h3>
               <div className="grid grid-cols-2 gap-2">
                 {[
                   { key: 'ativoCondutor', label: 'Condutor' },
                   { key: 'ativoEncarregado', label: 'Encarregado' },
                   { key: 'ativoAbastecedor', label: 'Abastecedor' },
                   { key: 'ativoChefeGua', label: 'Chefe GUA' },
                   { key: 'ativoMaritimo', label: 'Marítimo' },
                   { key: 'ativoEnfermeiro', label: 'Enfermeiro' },
                   { key: 'ativoComunicante', label: 'Comunicante' },
                   { key: 'ativoGraduado', label: 'Grad Dia' },
                   { key: 'ativoCbsSds', label: 'Cb/Sd Dia' },
                   { id: 'auxRancho', label: 'Aux Rancho' },
                   { id: 'toqueDeFogo', label: 'T. Fogo' },
                   { id: 'sentinela', label: 'Sentinela' }
                 ].map(item => {
                   const isActive = (militar as any)[item.key || (item as any).id];
                   return (
                     <div 
                       key={item.key || (item as any).id}
                       className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-[9px] font-black uppercase transition-all ${
                         isActive 
                           ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                           : 'bg-slate-50 border-slate-100 text-slate-400 opacity-50'
                       }`}
                     >
                       {isActive ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
                       {item.label}
                     </div>
                   );
                 })}
               </div>
             </section>

             {militar.cursos && (
               <section>
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                   <Shield className="w-4 h-4" /> Cursos Extras
                 </h3>
                 <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                   <p className="text-xs font-medium text-slate-600 italic">"{militar.cursos}"</p>
                 </div>
               </section>
             )}

             {militar.promotions && militar.promotions.length > 0 && (
               <section>
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                   <Award className="w-4 h-4" /> Histórico de Promoções
                 </h3>
                 <div className="space-y-3">
                   {militar.promotions.map((promo: any, idx: number) => (
                     <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-1">
                       <div className="flex justify-between items-center">
                         <span className="font-bold text-slate-700 text-xs">{promo.posto}</span>
                         <span className="text-[10px] font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{promo.dataPromocao}</span>
                       </div>
                       <div className="flex justify-between items-center mt-1">
                         <span className="text-[10px] font-medium text-slate-500">{promo.criterio}</span>
                         <span className="text-[10px] font-medium text-indigo-600">{promo.boletim}</span>
                       </div>
                     </div>
                   ))}
                 </div>
               </section>
             )}
           </div>
        </div>
      </div>
    </>
  );

  if (inline) {
    return (
      <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-200 flex flex-col w-full h-full">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white sm:rounded-3xl w-full h-full sm:h-auto sm:max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-screen sm:max-h-[90vh]"
      >
        {content}
      </motion.div>
    </div>
  );
}

function InfoRow({ 
  label, 
  value, 
  icon: Icon, 
  lowercase = false,
  fullWidth = false
}: { 
  label: string, 
  value?: string, 
  icon?: any,
  lowercase?: boolean,
  fullWidth?: boolean
}) {
  if (!value || value === '-') return null;
  
  return (
    <div className={`flex flex-col gap-0.5 ${fullWidth ? 'w-full' : ''}`}>
      <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em]">{label}</span>
      <div className="flex items-center gap-2 min-h-[24px]">
        {Icon && <Icon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
        <span className={`text-[11px] font-bold text-slate-700 ${lowercase ? '' : 'uppercase'}`}>
          {value}
        </span>
      </div>
    </div>
  );
}
