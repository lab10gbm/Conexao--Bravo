import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Calendar as CalendarIcon, X, Users, BadgeInfo, Trash2, Search, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAlaLightColor, cn } from '../../../lib/utils';
import { parseRank } from '../../../lib/rankUtils';
import { RankInsignia } from '../../../components/RankInsignia';
import { UserProfile } from '../../../types';

export interface GrdSideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  obmContext: string;
  currentAlaOfDay: number;
  targetAla: number;
  currentTeam: UserProfile[];
  availableMilitars: UserProfile[];
  readonly?: boolean;
  saving?: boolean;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onToggleMilitar: (rg: string) => void;
}

export function GrdSideDrawer({
  isOpen,
  onClose,
  selectedDate,
  obmContext,
  currentAlaOfDay,
  targetAla,
  currentTeam,
  availableMilitars,
  readonly = false,
  saving = false,
  searchTerm,
  onSearchTermChange,
  onToggleMilitar,
}: GrdSideDrawerProps) {
  if (!isOpen || !selectedDate) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 right-0 w-full lg:w-[400px] bg-white shadow-2xl border-l z-20 flex flex-col"
      >
        <div className="p-6 border-b bg-cyan-600 text-white flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 opacity-70" />
              {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-100 mt-1">
              Configuração de GRD • {obmContext}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-cyan-700/50 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* Day Info Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ala do Dia</span>
                <span className={cn(
                  "text-xs font-black uppercase px-2 py-1 rounded inline-flex mt-1 outline outline-1",
                  getAlaLightColor(currentAlaOfDay)
                )}>
                  ALA {currentAlaOfDay}
                </span>
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600">Alvo do GRD (Oposta)</span>
                <span className={cn(
                  "text-xs font-black uppercase px-2 py-1 rounded inline-flex mt-1 outline outline-1",
                  getAlaLightColor(targetAla)
                )}>
                  ALA {targetAla}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Users className="w-3 h-3" /> Guarnição do GRD ({currentTeam.length}/6)
              </h4>
              
              {currentTeam.length === 0 ? (
                <div className="text-center py-8 px-4 bg-white rounded-xl border border-dashed border-slate-300">
                  <BadgeInfo className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-400">Nenhum militar escalado para este dia.</p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Selecione abaixo da Ala {targetAla}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentTeam.map(m => (
                    <div key={m.rg} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 group">
                      <div className="w-8 h-8 flex shrink-0 justify-center items-center bg-slate-50 rounded-lg">
                        <RankInsignia rankStr={parseRank(m.rank)} className="scale-50 origin-center" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-1">{parseRank(m.rank)}</p>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-tight truncate leading-none">
                          {m.warName || (m.name || '').split(' ')[0]}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 font-mono mt-1">RG: {m.rg}</p>
                      </div>
                      {!readonly && (
                        <button 
                          disabled={saving}
                          onClick={() => onToggleMilitar(m.rg)}
                          className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selection Area */}
          {!readonly && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Disponíveis na Ala {targetAla}</h4>
                 <div className="relative w-32">
                   <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                   <input 
                     type="text" 
                     placeholder="Buscar..."
                     className="w-full pl-7 pr-2 py-1 text-[10px] border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
                     value={searchTerm}
                     onChange={(e) => onSearchTermChange(e.target.value)}
                   />
                 </div>
              </div>

            <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {availableMilitars.length === 0 ? (
                <div className="text-center py-4 text-slate-400 italic text-[10px]">
                  Nenhum militar disponível para seleção.
                </div>
              ) : (
                availableMilitars.map(m => (
                  <button
                    key={m.rg}
                    onClick={() => onToggleMilitar(m.rg)}
                    disabled={saving || currentTeam.length >= 6}
                    className="p-2.5 rounded-xl border border-slate-100 hover:border-cyan-200 hover:bg-cyan-50 transition-all flex items-center gap-3 text-left group disabled:opacity-50"
                  >
                    <div className="w-10 flex shrink-0 justify-center">
                      <RankInsignia rankStr={parseRank(m.rank)} className="scale-75 origin-center" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-1 block">{parseRank(m.rank)}</span>
                      <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight block">
                        {m.warName || (m.name || '').split(' ')[0]}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 font-mono mt-0.5 block italic">RG: {m.rg}</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300 group-hover:text-cyan-600 transition-colors">
                      <Plus className="w-4 h-4" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
          )}
        </div>

        <div className="p-6 border-t bg-slate-50 flex items-center justify-between">
           <div className="flex flex-col">
             <span className="text-[9px] font-black uppercase text-slate-400">Dica</span>
             <p className="text-[10px] text-slate-500 italic max-w-[200px]">Mínimo recomendado de 4 militares para garantir o serviço completo.</p>
           </div>
           {saving && (
             <div className="flex items-center gap-2 text-cyan-600">
               <Loader2 className="w-4 h-4 animate-spin" />
               <span className="text-[10px] font-black uppercase">Salvando...</span>
             </div>
           )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
