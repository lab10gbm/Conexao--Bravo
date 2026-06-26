import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Settings, Ruler, ChevronRight, Library } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';

interface PainelMilitarDashboardProps {
  user: UserProfile;
}

export function PainelMilitarDashboard({ user }: PainelMilitarDashboardProps) {
  const navigate = useNavigate();

  const painelModules = [
    {
       id: 'atualizacao',
       label: 'Atualização Cadastral',
       description: 'Seus Dados',
       icon: Settings,
       color: 'bg-teal-600 shadow-teal-200'
    },
    {
       id: 'medidas',
       label: 'Medidas Antropométricas',
       description: 'Tamanhos e Fardamento',
       icon: Ruler,
       color: 'bg-indigo-600 shadow-indigo-200'
    },
    {
      id: 'ferias',
      label: 'Controle de Férias',
      description: 'Seu Escalonamento Anual',
      icon: Library,
      color: 'bg-orange-600 shadow-orange-200'
    }
  ];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto w-full">
      <div className="mb-4 pt-12">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-400 hover:text-teal-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] group mt-6"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar ao Portal Principal
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-teal-800" />
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Painel do Militar</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        {painelModules.map((mod) => {
          const Icon = mod.icon;
          return (
            <button
              key={mod.id}
              onClick={() => navigate(`/${mod.id}`)}
              className="bg-white border-2 border-slate-100 rounded-3xl sm:rounded-[2rem] p-4 sm:p-6 flex flex-col items-center justify-center gap-2 sm:gap-4 shadow-sm hover:shadow-xl hover:border-teal-100 transition-all text-center group relative overflow-hidden"
            >
              {mod.inDevelopment && (
                <div className="absolute top-2 sm:top-3 right-[-40px] sm:right-[-35px] bg-indigo-500 text-white text-[6px] sm:text-[7px] font-black py-1 px-12 rotate-45 uppercase tracking-widest shadow-sm z-10">
                  Dev
                </div>
              )}
              <div className={cn(
                `w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:rotate-6`,
                mod.color
              )}>
                <Icon className="w-6 h-6 sm:w-8 sm:h-8" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-tighter text-xs sm:text-sm leading-tight">{mod.label}</h3>
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 sm:mt-1 transition-colors group-hover:text-slate-500">
                  {mod.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
