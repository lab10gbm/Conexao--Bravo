import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Mail, Phone, MapPin, Calendar, Contact, 
  Award, Briefcase, Building2, Shield, ArrowRightLeft,
  User, CheckCircle2, MapPinned
} from 'lucide-react';
import { UserProfile } from '../types';
import { RankInsignia } from './RankInsignia';

interface MilitaryProfileProps {
  militar: UserProfile;
  viewer: UserProfile;
  onClose: () => void;
  onLendRequested?: (militar: UserProfile) => void;
}

export function MilitaryProfile({ militar, viewer, onClose, onLendRequested }: MilitaryProfileProps) {
  const isAdmin = viewer.isAdmin;

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
        {/* Header/Cover */}
        <div className="h-24 sm:h-32 bg-gradient-to-r from-indigo-600 to-indigo-800 relative shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-20"
          >
            <X className="w-5 h-5" />
          </button>
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
            {/* Column 1: Physical/Personal */}
            <div className="space-y-6">
              <section>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Contact className="w-4 h-4" /> Identificação e Dados
                </h3>
                <div className="space-y-3">
                  <InfoRow label="Nome Completo" value={militar.name} />
                  <InfoRow label="RG" value={militar.rg} />
                  <InfoRow label="ID Funcional" value={militar.idFuncional} />
                  <InfoRow label="Nascimento" value={militar.nascimento} icon={Calendar} />
                  <InfoRow label="Quadro" value={militar.quadro} icon={Briefcase} />
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
                  <InfoRow label="Cidade" value={militar.cidade} icon={MapPinned} />
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
            </div>
          </div>
        </div>
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
