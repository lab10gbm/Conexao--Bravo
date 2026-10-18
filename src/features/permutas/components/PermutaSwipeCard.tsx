import React from 'react';
import { motion } from 'motion/react';
import { PermutaRequest, UserProfile } from '../../../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRightLeft, CalendarDays, Star, Activity, Users, ChevronUp, Eye } from 'lucide-react';
import { RankInsignia } from '../../../components/RankInsignia';
import { CapabilitiesView } from './CapabilitiesView';
import { matchMilitar, countCommonCapabilities } from '../lib/permutaUtils';
import { cn, getAlaForDate, getOppositeAla } from '../../../lib/utils';

const SUB_FUNCTIONS = [
  'ADJUNTO', 'CONDUTOR ABT', 'CONDUTOR ABSL', 'CONDUTOR AR', 'CONDUTOR ASE', 'CONDUTOR ARC',
  'CHEFE ABT', 'CHEFE ABSL', 'AUXILIAR ABT', 'AUXILIAR ABSL', 'AUXILIAR/CHEFE ARC', 'AUXILIAR ASE',
  'ENFERMEIRO', 'MESTRE L', 'MESTRE BIA', 'OPERADOR AMA', 'GV AMA', 'SGT DIA', 'CMT GUARDA',
  'CB GUARDA', 'CB DIA', 'COMUNICANTE', 'SENTINELA', 'AUX RANCHO', 'FAXINA'
];

interface PermutaSwipeCardProps {
  currentCard: PermutaRequest;
  direction: 'left' | 'right' | null;
  facilitadasIds: Set<string>;
  toggleFacilitada: (pairKey: string) => void;
  isExpanded: boolean;
  setIsExpanded: (val: boolean) => void;
  selectedSubFunctions: string[] | undefined;
  setSelectedSubFunctions: React.Dispatch<React.SetStateAction<string[]>>;
  militars: UserProfile[];
}

export const PermutaSwipeCard: React.FC<PermutaSwipeCardProps> = ({
  currentCard,
  direction,
  facilitadasIds,
  toggleFacilitada,
  isExpanded,
  setIsExpanded,
  selectedSubFunctions = [],
  setSelectedSubFunctions,
  militars,
}) => {
  const reqM = matchMilitar(militars, currentCard.requesterId, currentCard.requesterRg, currentCard.requesterName);
  const subM = matchMilitar(militars, currentCard.substituteId, currentCard.substituteRg, currentCard.substituteName);
  const commonCount = countCommonCapabilities(reqM, subM);
  const pairKey = `${currentCard.requesterId}-${currentCard.substituteId}`;

  const fallbackReqRank = currentCard.requesterName?.split(' ')[0] || '-';
  const fallbackReqName = currentCard.requesterName?.split(' ').slice(1).join(' ') || '-';

  const fallbackSubRank = currentCard.substituteName?.split(' ')[0] || '-';
  const fallbackSubName = currentCard.substituteName?.split(' ').slice(1).join(' ') || '-';

  return (
    <motion.div
      key={currentCard.id}
      initial={{ scale: 0.95, opacity: 0, y: 10 }}
      animate={{ 
        scale: 1, 
        opacity: 1, 
        y: 0,
        x: direction === 'left' ? -200 : direction === 'right' ? 200 : 0,
        rotate: direction === 'left' ? -15 : direction === 'right' ? 15 : 0
      }}
      exit={{ 
        opacity: 0, 
        scale: 0.9,
        transition: { duration: 0.2 }
      }}
      className="w-full max-w-[400px] mx-auto bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 flex flex-col overflow-hidden shrink-0"
    >
      {/* Card Header */}
      <div className="bg-slate-800 text-white p-4 flex justify-between items-center relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <ArrowRightLeft className="w-24 h-24" />
        </div>
        <div className="z-10">
          <div className="flex flex-col gap-0.5 mb-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            <div className="flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest bg-emerald-100 rounded px-1.5 py-0.5">
                Ala {getAlaForDate(parseISO(currentCard.date))}
              </span>
              <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest bg-indigo-100 rounded px-1.5 py-0.5">
                GRD {getOppositeAla(getAlaForDate(parseISO(currentCard.date)))}
              </span>
            </div>
          </div>
          <div className="text-xl font-black tracking-tight leading-none mb-1">
            {format(parseISO(currentCard.date), 'dd/MM/yyyy')}
          </div>
          <div className="text-[11px] text-slate-300 capitalize font-medium flex items-center gap-2">
            {format(parseISO(currentCard.date), 'EEEE', { locale: ptBR })}
          </div>
        </div>
        
        <button 
          onClick={() => toggleFacilitada(pairKey)}
          className="z-10 bg-slate-700 hover:bg-slate-600 p-2 rounded-full transition-colors cursor-pointer"
          title="Marcar como Permuta Facilitada para o futuro"
        >
          <Star className={cn("w-5 h-5", facilitadasIds.has(pairKey) ? "fill-amber-400 text-amber-400" : "text-slate-400")} />
        </button>
      </div>

      {/* Contexto Estrutural do Dia */}
      <div className="bg-slate-50 p-3 grid grid-cols-2 gap-x-2 gap-y-3 border-b border-slate-100 text-[10px] shrink-0">
        <div className="flex flex-col gap-0.5">
          <div className="font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <Star className="w-3 h-3 text-indigo-400" /> Oficial de Dia
          </div>
          <div className="font-bold text-slate-700 truncate">A definir (Busca futura)</div>
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <Users className="w-3 h-3 text-cyan-500" /> GRDs Escala
          </div>
          <div className="font-bold text-slate-700">0 Cadastrados</div>
        </div>

        <div className="flex flex-col gap-0.5 col-span-2 mt-1">
          <div className="font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <Activity className="w-3 h-3 text-amber-500" /> Alertas Sistêmicos da Permuta
          </div>
          <div className="flex gap-2 mt-1">
             <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-black uppercase shadow-sm">Interstício OK</span>
             <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-black uppercase shadow-sm">Efetivo OK</span>
          </div>
        </div>
      </div>

      {/* Card Body - Swap Details */}
      <div className="p-4 flex flex-col gap-4 flex-1">
        <div className="flex flex-col gap-3">
          {/* SAI */}
          <div className="shrink-0 bg-red-50/80 border border-red-100 rounded-2xl p-4 flex flex-col relative w-full overflow-hidden shadow-sm">
            <div className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-widest text-red-500 opacity-80 z-10 flex items-center gap-1">
               Sai
            </div>
            
            <div className="flex flex-col w-full relative z-0">
              <div className="flex items-center gap-3 w-full mt-2">
                <div className="w-12 flex items-center justify-center shrink-0">
                  <RankInsignia rankStr={reqM?.rank || fallbackReqRank} className="scale-[1.15] origin-center" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[11px] font-bold text-slate-500 uppercase leading-none mb-1">
                    {reqM?.rank || fallbackReqRank}
                  </span>
                  <span className="text-sm font-black text-slate-800 uppercase tracking-wider leading-none">
                    {reqM?.warName || fallbackReqName}
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {(reqM?.rg || currentCard.requesterRg) && (
                      <span className="text-[10px] font-bold text-slate-400 font-mono">
                        RG: {reqM?.rg || currentCard.requesterRg}
                      </span>
                    )}
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-200/80 px-1.5 py-0.5 rounded">
                      {reqM?.quadro?.toUpperCase() || 'S/Q'}
                    </span>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-200/80 px-1.5 py-0.5 rounded">
                      Ala {currentCard.originalAla}
                    </span>
                  </div>
                </div>
              </div>
              
              {isExpanded && (
                <CapabilitiesView 
                   militar={reqM}
                   otherMilitar={subM}
                />
              )}
            </div>
          </div>
          
          {/* Separador de Troca */}
          <div className="shrink-0 text-slate-300 flex justify-center -my-3 z-10 relative">
            <div className="bg-white rounded-full p-1.5 px-2 border border-slate-100 shadow-sm flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </div>
              <span className={cn(
                "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest whitespace-nowrap border",
                commonCount > 0 ? "bg-yellow-100 text-yellow-800 border-yellow-200" : "bg-slate-100 text-slate-400 border-slate-200"
              )}>
                {commonCount}
              </span>

              <span className="w-px h-4 bg-slate-200 mx-1"></span>

              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                title={isExpanded ? "Recolher detalhes de funções" : "Expandir detalhes de funções"}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* ENTRA */}
          <div className="shrink-0 bg-emerald-50/80 border border-emerald-100 rounded-2xl p-4 flex flex-col relative w-full overflow-hidden shadow-sm">
            <div className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-widest text-emerald-600 opacity-80 z-10 flex items-center gap-1">
               Entra
            </div>
            
            <div className="flex flex-col w-full relative z-0">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 w-full mt-2">
                  <div className="w-12 flex items-center justify-center shrink-0">
                    <RankInsignia rankStr={subM?.rank || fallbackSubRank} className="scale-[1.15] origin-center" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[11px] font-bold text-slate-500 uppercase leading-none mb-1">
                      {subM?.rank || fallbackSubRank}
                    </span>
                    <span className="text-sm font-black text-slate-800 uppercase tracking-wider leading-none">
                      {subM?.warName || fallbackSubName}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {(subM?.rg || currentCard.substituteRg) && (
                        <span className="text-[10px] font-bold text-slate-400 font-mono">
                          RG: {subM?.rg || currentCard.substituteRg}
                        </span>
                      )}
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-emerald-200/50 px-1.5 py-0.5 rounded">
                        {subM?.quadro?.toUpperCase() || 'S/Q'}
                      </span>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-emerald-200/50 px-1.5 py-0.5 rounded">
                        Ala {subM?.ala || 'S/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Seletor de Funções Mobile */}
                <div className="mt-2 bg-white rounded-xl p-3 border border-emerald-100 shadow-sm">
                  <h4 className="text-[9px] font-black text-emerald-800 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Activity className="w-2.5 h-2.5" /> Funções para este serviço
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {SUB_FUNCTIONS.map(f => {
                      const isSelected = selectedSubFunctions.includes(f);
                      return (
                        <button
                          key={f}
                          onClick={() => {
                            setSelectedSubFunctions(prev => 
                              isSelected ? prev.filter(x => x !== f) : [...prev, f]
                            );
                          }}
                          className={cn(
                            "px-2 py-1 rounded text-[8px] font-black tracking-widest border transition-all cursor-pointer",
                            isSelected 
                              ? "bg-emerald-600 text-white border-emerald-700 shadow-[0_2px_8px_-2px_rgba(5,150,105,0.4)]" 
                              : "bg-slate-50 text-slate-400 border-slate-200 hover:border-emerald-300"
                          )}
                        >
                          {f}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setSelectedSubFunctions([])}
                      className={cn(
                        "px-2 py-1 rounded text-[8px] font-black tracking-widest border transition-all cursor-pointer",
                        selectedSubFunctions.length === 0
                          ? "bg-slate-800 text-white border-slate-900"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      )}
                    >
                      DEFINIR DEPOIS
                    </button>
                  </div>
                </div>
              </div>
              
              {isExpanded && (
                <CapabilitiesView 
                  militar={subM} 
                  otherMilitar={reqM}
                />
              )}
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-100 w-full flex-shrink-0" />

        {/* Historicos */}
        <div className="flex flex-col gap-3">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
            <Activity className="w-3 h-3" /> Histórico Operacional Estimado
          </h3>
          
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="text-[11px] font-bold text-slate-700 mb-2 truncate">
              Parceria: {currentCard.requesterName?.split(' ')[0]} ↔ {currentCard.substituteName?.split(' ')[0]}
            </div>
            <div className="flex gap-4">
              <div>
                <div className="text-lg font-black text-indigo-600 leading-none">0</div>
                <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1">Permutas Realizadas</div>
              </div>
              <div>
                <div className="text-lg font-black text-emerald-600 leading-none">100%</div>
                <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1">Taxa Deferimento</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="text-[11px] font-bold text-slate-700 mb-2 truncate">Substituto na Função (A implementar):</div>
            <div className="flex gap-4">
              <div>
                <div className="text-lg font-black text-amber-600 leading-none">0</div>
                <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1">Serviços na Função</div>
              </div>
              <div>
                <div className="text-lg font-black text-emerald-600 leading-none">100%</div>
                <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1">Assiduidade</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
