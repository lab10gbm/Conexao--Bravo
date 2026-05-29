import React from 'react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';
import { WeeklyMonitor } from './WeeklyMonitor';
import { AdminPanel } from './AdminPanel';
import { ExpedienteScheduler } from './ExpedienteScheduler';
import { CalendarHighlights } from './CalendarHighlights';
import { OfficerDashboard } from './OfficerDashboard';
import { ArrowLeft } from 'lucide-react';

interface PermutaModuleProps {
  user: UserProfile;
  obmContext: string;
  isOfficerMode: boolean;
  adminModeActive: boolean;
  onToggleAdminMode: () => void;
  onDateClick: (date?: Date) => void;
  onMonthSelect: (month: number | null) => void;
  onBackToPortal: () => void;
}

export function PermutaModule({
  user,
  obmContext,
  isOfficerMode,
  adminModeActive,
  onToggleAdminMode,
  onDateClick,
  onMonthSelect,
  onBackToPortal
}: PermutaModuleProps) {
  const [forceProntidao, setForceProntidao] = React.useState(false);
  const effectiveOfficerMode = isOfficerMode && !forceProntidao;

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="mb-4 flex items-center justify-between">
        <button 
          onClick={onBackToPortal}
          className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar ao Portal Principal
        </button>

        {isOfficerMode && (
          <button
            onClick={() => setForceProntidao(!forceProntidao)}
            className="text-[10px] uppercase font-black px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg tracking-widest transition-colors shadow-sm"
          >
            {forceProntidao ? "Voltar ao Modo Oficiais" : "Modo Prontidão"}
          </button>
        )}
      </div>

      {!effectiveOfficerMode && (
        <>
          <WeeklyMonitor user={user} obmContext={obmContext} onRequestPermuta={onDateClick} />
          
          <div className="grid grid-cols-1 gap-6 sm:gap-12 mt-6 sm:mt-12">
            {user.isAdmin && (
              <section id="admin-panel">
                 <AdminPanel adminModeActive={adminModeActive} onToggleAdminMode={onToggleAdminMode} />
              </section>
            )}

            <section id="expediente-scheduler">
               <ExpedienteScheduler user={user} obmContext={obmContext} />
            </section>
            
            <section id="status-dashboard" className="scroll-mt-32">
              <CalendarHighlights user={user} obmContext={obmContext} onDateClick={onDateClick} onMonthSelect={onMonthSelect} />
            </section>
          </div>
        </>
      )}

      {effectiveOfficerMode && (
        <section id="officer-dashboard" className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <OfficerDashboard user={user} obmContext={obmContext} />
        </section>
      )}
    </div>
  );
}
