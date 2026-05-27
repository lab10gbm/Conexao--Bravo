import React, { useState, useTransition } from 'react';
import { UserProfile } from '../types';
import { ArrowLeft, Users, Shield, UserCheck, LayoutGrid, CalendarRange, Truck } from 'lucide-react';
import { EscalanteAlasConfig } from './EscalanteAlasConfig';
import { ControleDeFuncoes } from './ControleDeFuncoes';
import { GrdModule } from './GrdModule';
import { EscalaEspelhoModule } from './EscalaEspelhoModule';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface EscalanteDashboardProps {
  user: UserProfile;
  obmContext: string;
  setObmContext?: (obm: string) => void;
  availableObms?: string[];
  onBack: () => void;
}

const ESCALANTE_APPS = [
  { id: 'alas', label: 'Controle de Ala', description: 'Configurar e Distribuir', icon: Users, color: 'bg-emerald-600 shadow-emerald-200' },
  { id: 'funcoes', label: 'Controle de Função', description: 'Viaturas e Condutores', icon: Truck, color: 'bg-amber-600 shadow-amber-200' },
  { id: 'escala', label: 'Escala 24h', description: 'Geração e Ajustes', icon: CalendarRange, color: 'bg-indigo-600 shadow-indigo-200' },
  { id: 'grd', label: 'GRD', description: 'Atendimento de Reforço', icon: Shield, color: 'bg-cyan-600 shadow-cyan-200' },
  { id: 'efetivo', label: 'Efetivo Geral', description: 'Relacionamento', icon: UserCheck, color: 'bg-violet-600 shadow-violet-200', disabled: true },
  { id: 'relatorios', label: 'Relatórios', description: 'Estatísticas', icon: LayoutGrid, color: 'bg-rose-600 shadow-rose-200', disabled: true },
];

export function EscalanteDashboard({ user, obmContext, setObmContext, availableObms, onBack }: EscalanteDashboardProps) {
  const [activeApp, setActiveApp] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleObmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (setObmContext) {
      startTransition(() => {
        setObmContext(val);
      });
    }
  };

  const renderHeaderActions = (onClose?: () => void) => (
    <div className="flex items-center gap-3 shrink-0">
      {availableObms && availableObms.length > 1 && setObmContext && (
        <select
          value={obmContext}
          onChange={handleObmChange}
          disabled={isPending}
          className="px-3 py-2 bg-white border-2 border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all cursor-pointer disabled:opacity-50"
        >
          {availableObms.map(o => (
             <option key={o} value={o}>{o}</option>
          ))}
        </select>
      )}
      <button 
        onClick={onClose || onBack}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        {onClose ? "Voltar ao Painel" : "Voltar à Home"}
      </button>
    </div>
  );

  if (activeApp === 'alas') {
    return (
      <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-emerald-600 p-1.5 bg-emerald-100 rounded-lg" />
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                Controle de Ala <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded uppercase tracking-widest ml-2">{obmContext}</span>
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-1">Configuração e distribuição do efetivo nas alas operacionais.</p>
            </div>
          </div>
          {renderHeaderActions(() => setActiveApp(null))}
        </div>

        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
           <div className="absolute inset-0 overflow-y-auto">
             <EscalanteAlasConfig obmContext={obmContext} />
           </div>
        </div>
      </div>
    );
  }

  if (activeApp === 'funcoes') {
    return (
      <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Truck className="w-8 h-8 text-amber-600 p-1.5 bg-amber-100 rounded-lg" />
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                Controle de Função <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded uppercase tracking-widest ml-2">{obmContext}</span>
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-1">Gerencie as funções operacionais, como condutores e habilitações.</p>
            </div>
          </div>
          {renderHeaderActions(() => setActiveApp(null))}
        </div>

        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
           <div className="absolute inset-0 overflow-hidden flex flex-col">
             <ControleDeFuncoes obmContext={obmContext} />
           </div>
        </div>
      </div>
    );
  }

  if (activeApp === 'escala') {
    return (
      <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <CalendarRange className="w-8 h-8 text-indigo-600 p-1.5 bg-indigo-100 rounded-lg" />
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                Escala 24h <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded uppercase tracking-widest ml-2">{obmContext}</span>
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-1">Montagem da escala de serviço (Escala Espelho).</p>
            </div>
          </div>
          {renderHeaderActions(() => setActiveApp(null))}
        </div>

        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
           <div className="absolute inset-0 overflow-hidden flex flex-col">
             <EscalaEspelhoModule obmContext={obmContext} />
           </div>
        </div>
      </div>
    );
  }

  if (activeApp === 'grd') {
    return (
      <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-cyan-600 p-1.5 bg-cyan-100 rounded-lg" />
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                GRD <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded uppercase tracking-widest ml-2">{obmContext}</span>
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-1">Gestão da Guarnição de Resposta em Disponibilidade (Ala Oposta).</p>
            </div>
          </div>
          {renderHeaderActions(() => setActiveApp(null))}
        </div>

        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
           <div className="absolute inset-0 overflow-hidden">
             <GrdModule obmContext={obmContext} />
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            Painel do Escalante <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded uppercase tracking-widest ml-2">{obmContext}</span>
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Selecione uma aplicação do seu painel de gestão.</p>
        </div>
        {renderHeaderActions()}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 w-full">
        {ESCALANTE_APPS.map(app => {
          const Icon = app.icon;
          return (
            <motion.button
              key={app.id}
              whileHover={app.disabled ? {} : { y: -5, scale: 1.02 }}
              whileTap={app.disabled ? {} : { scale: 0.98 }}
              onClick={() => !app.disabled && setActiveApp(app.id)}
              disabled={app.disabled}
              className={cn(
                "bg-white border-2 border-slate-100 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-4 shadow-sm transition-all text-center group relative overflow-hidden",
                app.disabled ? "opacity-50 grayscale cursor-not-allowed" : "hover:shadow-xl hover:border-indigo-100"
              )}
            >
              {app.disabled && (
                <div className="absolute top-2 right-3">
                  <div className="bg-slate-100 text-slate-400 text-[8px] font-black py-0.5 px-2 rounded-full uppercase tracking-widest outline outline-1 outline-slate-200">
                    Off
                  </div>
                </div>
              )}
              <div className={cn(
                `w-16 h-16 rounded-2xl ${app.color} flex items-center justify-center text-white shadow-lg transition-transform`,
                !app.disabled && "group-hover:rotate-6"
              )}>
                <Icon className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-tighter text-sm leading-tight">{app.label}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 transition-colors group-hover:text-slate-500">
                  {app.description}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
