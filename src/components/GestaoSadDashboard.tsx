import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Settings2, Users, CalendarOff, BriefcaseBusiness, ChevronRight } from 'lucide-react';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';

interface GestaoSadDashboardProps {
  user: UserProfile;
  onNavigate?: (path: string) => void;
  onBack?: () => void;
}

export function GestaoSadDashboard({ user, onNavigate, onBack }: GestaoSadDashboardProps) {
  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      handleNavigate('/');
    }
  };

  const sadModules = [
    {
      id: 'oficiais-config',
      label: 'Configurar Oficiais',
      description: 'Efetivo e Escalas',
      icon: Settings2,
      color: 'bg-slate-800 shadow-slate-300'
    },
    {
      id: 'terceirizados',
      label: 'Terceirizados',
      description: 'Gestão de Civis',
      icon: Users,
      color: 'bg-fuchsia-600 shadow-fuchsia-200'
    },
    {
      id: 'dgp-sync',
      label: 'DGP Sync',
      description: 'Sincronizador Universal',
      icon: Users,
      color: 'bg-emerald-600 shadow-emerald-200'
    }
  ];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto w-full">
      <div className="mb-4 pt-12">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] group mt-6"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar ao Portal Principal
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <BriefcaseBusiness className="w-6 h-6 text-indigo-800" />
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Gestão SAD</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        {sadModules.map((mod) => {
          const Icon = mod.icon;
          return (
            <button
              key={mod.id}
              onClick={() => handleNavigate(`/${mod.id}`)}
              className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-4 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all text-center group relative overflow-hidden"
            >
              <div className={cn(
                `w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:rotate-6`,
                mod.color
              )}>
                <Icon className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-tighter text-sm leading-tight">{mod.label}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 transition-colors group-hover:text-slate-500">
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
