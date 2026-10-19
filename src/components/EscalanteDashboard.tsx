import React, { useState, useTransition, Suspense } from 'react';
import { UserProfile } from '../types';
import {
  Users,
  Shield,
  UserCheck,
  LayoutGrid,
  CalendarRange,
  Truck,
  Smartphone,
  Palmtree,
  CalendarOff,
  BriefcaseBusiness,
  Loader2,
} from 'lucide-react';
import { ModuleHeader } from './ui/ModuleHeader';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

// Lazy loading dos submódulos do Escalante para code-splitting e performance instantânea
const EscalanteAlasConfig = React.lazy(() => import('./EscalanteAlasConfig').then(m => ({ default: m.EscalanteAlasConfig })));
const ControleDeFuncoes = React.lazy(() => import('./ControleDeFuncoes').then(m => ({ default: m.ControleDeFuncoes })));
const ControleViaturasModule = React.lazy(() => import('./ControleViaturasModule').then(m => ({ default: m.ControleViaturasModule })));
const EscalaEspelhoModule = React.lazy(() => import('./EscalaEspelhoModule').then(m => ({ default: m.EscalaEspelhoModule })));
const AfastamentosAlaModule = React.lazy(() => import('./AfastamentosAlaModule').then(m => ({ default: m.AfastamentosAlaModule })));
const VacationModule = React.lazy(() => import('./VacationModule').then(m => ({ default: m.VacationModule })));
const GrdModule = React.lazy(() => import('./GrdModule').then(m => ({ default: m.GrdModule })));
const ExpedienteScheduler = React.lazy(() => import('../features/expediente/ExpedienteScheduler').then(m => ({ default: m.ExpedienteScheduler })));
const ControlePermutasMobile = React.lazy(() => import('./ControlePermutasMobile').then(m => ({ default: m.ControlePermutasMobile })));
const RasManagerModule = React.lazy(() => import('./RasManagerModule').then(m => ({ default: m.RasManagerModule })));
const EfetivoPanel = React.lazy(() => import('./EfetivoPanel').then(m => ({ default: m.EfetivoPanel })));
const RegistroEscalasModule = React.lazy(() => import('./RegistroEscalasModule').then(m => ({ default: m.RegistroEscalasModule })));

interface EscalanteDashboardProps {
  user: UserProfile;
  obmContext: string;
  setObmContext?: (obm: string) => void;
  availableObms?: string[];
  onBack: () => void;
}

const ESCALANTE_APPS = [
  { id: 'alas', label: 'Controle de Ala', description: 'Configurar e Distribuir', icon: Users, color: 'bg-emerald-600 shadow-emerald-200' },
  { id: 'funcoes', label: 'Controle de Função', description: 'Viaturas e Condutores', icon: Shield, color: 'bg-amber-600 shadow-amber-200' },
  { id: 'viaturas', label: 'Controle de Viaturas e Postos', description: 'Cadastro de Socorro e Postos', icon: Truck, color: 'bg-rose-600 shadow-rose-200' },
  { id: 'escala', label: 'Escala 24h', description: 'Geração e Ajustes', icon: CalendarRange, color: 'bg-indigo-600 shadow-indigo-200' },
  { id: 'expediente', label: 'Escala do Expediente', description: 'Gestão de Serviços EXP', icon: CalendarRange, color: 'bg-indigo-400 shadow-indigo-100' },
  { id: 'afastamentos', label: 'Afastamentos', description: 'Controle Anual', icon: Palmtree, color: 'bg-teal-600 shadow-teal-200' },
  { id: 'ferias-sad', label: 'Controle Férias SAD', description: 'Gestão Geral de Férias', icon: CalendarOff, color: 'bg-sky-600 shadow-sky-200' },
  { id: 'grd', label: 'GRD', description: 'Atendimento de Reforço', icon: Shield, color: 'bg-cyan-600 shadow-cyan-200' },
  { id: 'permutas_mobile', label: 'Permutas Mobile', description: 'Triagem Rápida', icon: Smartphone, color: 'bg-pink-600 shadow-pink-200' },
  { id: 'ras', label: 'Controle de RAS', description: 'Regime Adicional de Serviço', icon: BriefcaseBusiness, color: 'bg-amber-500 shadow-amber-200' },
  { id: 'efetivo', label: 'Efetivo Geral', description: 'Relacionamento', icon: UserCheck, color: 'bg-violet-600 shadow-violet-200' },
  { id: 'registro', label: 'Registro', description: 'Livro de Escalas', icon: LayoutGrid, color: 'bg-stone-600 shadow-stone-200' },
  { id: 'relatorios', label: 'Relatórios', description: 'Estatísticas', icon: LayoutGrid, color: 'bg-rose-600 shadow-rose-200', disabled: true },
];

function ModuleLoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center p-20 gap-3 text-slate-400 bg-white rounded-3xl border border-slate-200 shadow-xs">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Carregando módulo...</span>
    </div>
  );
}

export function EscalanteDashboard({ user, obmContext, setObmContext, availableObms, onBack }: EscalanteDashboardProps) {
  const [activeApp, setActiveApp] = useState<string | null>(null);
  const [escalaInitialDate, setEscalaInitialDate] = useState<string | undefined>(undefined);
  const [isPending, startTransition] = useTransition();

  const handleObmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (setObmContext) {
      startTransition(() => {
        setObmContext(val);
      });
    }
  };

  const closeModule = () => setActiveApp(null);

  const renderActiveModule = () => {
    switch (activeApp) {
      case 'alas':
        return (
          <>
            <ModuleHeader
              title="Controle de Ala"
              subtitle="Configuração e distribuição do efetivo nas alas operacionais."
              icon={Users}
              iconClassName="w-8 h-8 text-emerald-600 p-1.5 bg-emerald-100 rounded-lg"
              obmContext={obmContext}
              availableObms={availableObms}
              onObmChange={handleObmChange}
              isObmPending={isPending}
              onBack={closeModule}
            />
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col">
              <div className="w-full">
                <EscalanteAlasConfig obmContext={obmContext} />
              </div>
            </div>
          </>
        );

      case 'funcoes':
        return (
          <>
            <ModuleHeader
              title="Controle de Função"
              subtitle="Gerencie as funções operacionais, como condutores e habilitações."
              icon={Truck}
              iconClassName="w-8 h-8 text-amber-600 p-1.5 bg-amber-100 rounded-lg"
              obmContext={obmContext}
              availableObms={availableObms}
              onObmChange={handleObmChange}
              isObmPending={isPending}
              onBack={closeModule}
            />
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col">
              <div className="w-full p-2 sm:p-6">
                <ControleDeFuncoes obmContext={obmContext} />
              </div>
            </div>
          </>
        );

      case 'viaturas':
        return (
          <>
            <ModuleHeader
              title="Controle de Viaturas e Postos"
              subtitle="Cadastro e configuração de viaturas de socorro e postos de serviço."
              icon={Truck}
              iconClassName="w-8 h-8 text-rose-600 p-1.5 bg-rose-100 rounded-lg"
              obmContext={obmContext}
              availableObms={availableObms}
              onObmChange={handleObmChange}
              isObmPending={isPending}
              onBack={closeModule}
            />
            <ControleViaturasModule obmContext={obmContext} />
          </>
        );

      case 'escala':
        return (
          <>
            <ModuleHeader
              title="Escala 24h"
              subtitle="Montagem da escala de serviço (Escala Espelho)."
              icon={CalendarRange}
              iconClassName="w-8 h-8 text-indigo-600 p-1.5 bg-indigo-100 rounded-lg"
              obmContext={obmContext}
              availableObms={availableObms}
              onObmChange={handleObmChange}
              isObmPending={isPending}
              onBack={closeModule}
            />
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col">
              <div className="w-full p-2 sm:p-6">
                <EscalaEspelhoModule obmContext={obmContext} user={user} initialDate={escalaInitialDate} />
              </div>
            </div>
          </>
        );

      case 'afastamentos':
        return (
          <>
            <ModuleHeader
              title="Controle de Afastamentos"
              subtitle="Gestão de férias e afastamentos anuais do efetivo."
              icon={Palmtree}
              iconClassName="w-8 h-8 text-teal-600 p-1.5 bg-teal-100 rounded-lg"
              obmContext={obmContext}
              availableObms={availableObms}
              onObmChange={handleObmChange}
              isObmPending={isPending}
              onBack={closeModule}
            />
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col p-6">
              <div className="w-full p-6">
                <AfastamentosAlaModule obmContext={obmContext} type="anual" />
              </div>
            </div>
          </>
        );

      case 'ferias-sad':
        return (
          <>
            <ModuleHeader
              title="Controle Férias SAD"
              subtitle="Gestão Geral de Férias e Afastamentos SAD."
              icon={CalendarOff}
              iconClassName="w-8 h-8 text-sky-600 p-1.5 bg-sky-100 rounded-lg"
              obmContext={obmContext}
              availableObms={availableObms}
              onObmChange={handleObmChange}
              isObmPending={isPending}
              onBack={closeModule}
            />
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col">
              <div className="w-full p-2 sm:p-6">
                <VacationModule user={user} isSadMode={true} onBackToPortal={closeModule} />
              </div>
            </div>
          </>
        );

      case 'grd':
        return (
          <>
            <ModuleHeader
              title="GRD"
              subtitle="Gestão da Guarnição de Resposta em Disponibilidade (Ala Oposta)."
              icon={Shield}
              iconClassName="w-8 h-8 text-cyan-600 p-1.5 bg-cyan-100 rounded-lg"
              obmContext={obmContext}
              availableObms={availableObms}
              onObmChange={handleObmChange}
              isObmPending={isPending}
              onBack={closeModule}
            />
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col">
              <div className="w-full">
                <GrdModule obmContext={obmContext} />
              </div>
            </div>
          </>
        );

      case 'expediente':
        return (
          <>
            <ModuleHeader
              title="Escala do Expediente"
              subtitle="Gestão de Serviços EXP."
              icon={CalendarRange}
              iconClassName="w-8 h-8 text-indigo-400 p-1.5 bg-indigo-50 rounded-lg"
              obmContext={obmContext}
              availableObms={availableObms}
              onObmChange={handleObmChange}
              isObmPending={isPending}
              onBack={closeModule}
            />
            <div className="flex flex-col">
              <div className="w-full pr-2">
                <ExpedienteScheduler user={user} obmContext={obmContext} forceExpanded={true} />
              </div>
            </div>
          </>
        );

      case 'permutas_mobile':
        return (
          <>
            <ModuleHeader
              title="Permutas Mobile"
              subtitle="Triagem rápida e ágil de solicitações de permuta."
              icon={Smartphone}
              iconClassName="w-8 h-8 text-pink-600 p-1.5 bg-pink-100 rounded-lg"
              obmContext={obmContext}
              availableObms={availableObms}
              onObmChange={handleObmChange}
              isObmPending={isPending}
              onBack={closeModule}
            />
            <div className="bg-slate-50 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center items-center">
              <div className="w-full flex justify-center bg-slate-900 sm:rounded-3xl">
                <ControlePermutasMobile obmContext={obmContext} user={user} />
              </div>
            </div>
          </>
        );

      case 'ras':
        return (
          <>
            <ModuleHeader
              title="Controle de RAS"
              subtitle="Gestão de Regime Adicional de Serviço para Praças."
              icon={BriefcaseBusiness}
              iconClassName="w-8 h-8 text-amber-600 p-1.5 bg-amber-100 rounded-lg"
              obmContext={obmContext}
              availableObms={availableObms}
              onObmChange={handleObmChange}
              isObmPending={isPending}
              onBack={closeModule}
            />
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col">
              <div className="w-full p-4 sm:p-6">
                <RasManagerModule
                  obmContext={obmContext}
                  user={user}
                  onNavigateToEscala={(date) => {
                    if (date) setEscalaInitialDate(date);
                    setActiveApp('escala');
                  }}
                />
              </div>
            </div>
          </>
        );

      case 'efetivo':
        return (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col min-h-[600px] overflow-hidden relative px-6 pb-6">
            <EfetivoPanel user={user} obmContext={obmContext} onBack={closeModule} />
          </div>
        );

      case 'registro':
        return (
          <>
            <ModuleHeader
              title="Registro"
              subtitle="Livro e histórico de escalas homologadas."
              icon={LayoutGrid}
              iconClassName="w-8 h-8 text-stone-600 p-1.5 bg-stone-100 rounded-lg"
              obmContext={obmContext}
              availableObms={availableObms}
              onObmChange={handleObmChange}
              isObmPending={isPending}
              onBack={closeModule}
            />
            <RegistroEscalasModule obmContext={obmContext} />
          </>
        );

      default:
        return null;
    }
  };

  if (activeApp) {
    return (
      <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Suspense fallback={<ModuleLoadingFallback />}>
          {renderActiveModule()}
        </Suspense>
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ModuleHeader
        title="Painel do Escalante"
        subtitle="Selecione uma aplicação do seu painel de gestão."
        obmContext={obmContext}
        availableObms={availableObms}
        onObmChange={handleObmChange}
        isObmPending={isPending}
        onBack={onBack}
        backLabel="Voltar à Home"
      />

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
                "bg-white border border-slate-200/90 dark:border-slate-700/80 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 shadow-xs transition-all text-center group relative overflow-hidden cursor-pointer",
                app.disabled ? "opacity-50 grayscale cursor-not-allowed" : "hover:shadow-lg hover:border-indigo-400/80"
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

export default EscalanteDashboard;
