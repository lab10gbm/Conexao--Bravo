import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  ArrowRightLeft, 
  Users, 
  FileText, 
  Settings, 
  ShieldCheck, 
  Calendar,
  LayoutGrid,
  Library,
  BookOpen,
  MessageSquare,
  CalendarRange,
  Package,
  Ruler,
  Shield,
  CalendarOff,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Settings2,
  AlertCircle,
  Search,
  UtensilsCrossed,
  Radio,
  Bus,
  ShoppingCart,
  Megaphone,
  ChevronDown,
  BriefcaseBusiness,
  Anchor
} from 'lucide-react';
import { UserProfile } from '../types';
import { db } from '../lib/firebase';
import { getAuth } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { isOfficer } from '../lib/rankUtils';

import { AppVisibilityConfig } from './AppVisibilityConfig';
import { SystemRolesConfig } from './SystemRolesConfig';
import { useAppConfig } from '../contexts/ConfigContext';
import { MuralAvisos } from './MuralAvisos';

interface ModuleIconProps {
  id: string;
  label: string;
  icon: any;
  color: string;
  onClick: () => void;
  description?: string;
  disabled?: boolean;
  comingSoon?: boolean;
  alertText?: string;
  inDevelopment?: boolean;
  onMoveLeft?: (e: React.MouseEvent) => void;
  onMoveRight?: (e: React.MouseEvent) => void;
}

const ModuleIcon: React.FC<ModuleIconProps> = ({ label, icon: Icon, color, onClick, description, disabled, comingSoon, alertText, inDevelopment, onMoveLeft, onMoveRight }) => {
  return (
    <motion.button
      whileHover={disabled ? {} : { y: -5, scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={disabled ? undefined : onClick}
      className={cn(
        "bg-white border-2 border-slate-100 rounded-3xl sm:rounded-[2rem] p-3 sm:p-6 flex flex-col items-center justify-center gap-2 sm:gap-4 shadow-sm transition-all text-center group relative overflow-hidden",
        disabled ? "opacity-50 grayscale cursor-not-allowed" : "hover:shadow-xl hover:border-indigo-100"
      )}
    >
      {(onMoveLeft || onMoveRight) && (
        <div className="absolute top-2 left-0 right-0 flex justify-between px-3 z-30">
          <div
            onClick={onMoveLeft}
            className={cn("p-1.5 rounded-full bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 transition text-slate-400 opacity-0 group-hover:opacity-100", !onMoveLeft && "hidden")}
          >
             <ChevronLeft className="w-4 h-4" />
          </div>
          <div
            onClick={onMoveRight}
            className={cn("p-1.5 rounded-full bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 transition text-slate-400 opacity-0 group-hover:opacity-100", !onMoveRight && "hidden")}
          >
             <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {comingSoon && (
        <div className="absolute top-2 sm:top-3 right-[-35px] sm:right-[-30px] bg-amber-500 text-white text-[7px] sm:text-[8px] font-black py-1 px-10 rotate-45 uppercase tracking-widest shadow-sm z-10">
          Breve
        </div>
      )}

      {alertText && (
        <div className="absolute top-4 right-4 bg-rose-500 w-3 h-3 border-2 border-white rounded-full flex items-center justify-center shadow-md animate-pulse z-20" title={alertText}>
        </div>
      )}

      {inDevelopment && (
        <div className="absolute top-2 sm:top-3 right-[-40px] sm:right-[-35px] bg-indigo-500 text-white text-[6px] sm:text-[7px] font-black py-1 px-12 rotate-45 uppercase tracking-widest shadow-sm z-10">
          Dev
        </div>
      )}
      
      {disabled && !comingSoon && !inDevelopment && (
        <div className="absolute top-2 right-3">
          <div className="bg-slate-100 text-slate-400 text-[7px] sm:text-[8px] font-black py-0.5 px-2 rounded-full uppercase tracking-widest outline outline-1 outline-slate-200">
            Off
          </div>
        </div>
      )}

      <div className={cn(
        `w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl ${color} flex items-center justify-center text-white shadow-lg transition-transform`,
        !disabled && "group-hover:rotate-6"
      )}>
        <Icon className="w-5 h-5 sm:w-8 sm:h-8" />
      </div>
      <div>
        <h3 className="font-black text-slate-800 uppercase tracking-tighter text-[11px] sm:text-sm leading-tight">{label}</h3>
        {description && (
          <p className={cn(
            "text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 sm:mt-1 transition-colors",
            !disabled && "group-hover:text-slate-500"
          )}>
            {description}
          </p>
        )}
      </div>
    </motion.button>
  );
}

interface HomePortalProps {
  user: UserProfile;
  isAdminRaw?: boolean;
  isEscalanteRaw?: boolean;
  onLaunchModule: (moduleId: string) => void;
}

export function HomePortal({ user, isAdminRaw, isEscalanteRaw, onLaunchModule }: HomePortalProps) {
  const { appVisibility: visibilityConfig } = useAppConfig();
  const [isEditMode, setIsEditMode] = useState(false);
  const [operacionalOrder, setOperacionalOrder] = useState<string[]>(() => {
     const saved = localStorage.getItem('operacionalModuleOrder');
     return saved ? JSON.parse(saved) : [];
  });
  const [informativoOrder, setInformativoOrder] = useState<string[]>(() => {
     const saved = localStorage.getItem('informativoModuleOrder');
     return saved ? JSON.parse(saved) : [];
  });
  const [escalanteOrder, setEscalanteOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('escalanteModuleOrder');
    return saved ? JSON.parse(saved) : [];
  });
  const [moderadorOrder, setModeradorOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('moderadorModuleOrder');
    return saved ? JSON.parse(saved) : [];
  });
  const [adminTab, setAdminTab] = useState<'apps' | 'roles'>('apps');
  const [epiRequestActive, setEpiRequestActive] = useState(false);
  const [epiRequestMessage, setEpiRequestMessage] = useState('');
  const [showMural, setShowMural] = useState(true);

  useEffect(() => {
    if (!user?.rg || !db) return;
    
    const userRgStr = user.rg.toString().padStart(5, '0');
    let unsubscribeConfig: () => void;
    let unsubscribeUser: () => void;

    let currentReqData: any = null;
    let currentUserData: any = null;

    const handleUpdate = () => {
      if (currentReqData && currentReqData.isActive && currentReqData.requestedAt) {
        let needsUpdate = true;
        if (currentUserData && currentUserData.updatedAt) {
          const reqDate = new Date(currentReqData.requestedAt).getTime();
          const updateDate = new Date(currentUserData.updatedAt).getTime();
          if (updateDate >= reqDate) {
            needsUpdate = false;
          }
        }
        setEpiRequestActive(needsUpdate);
        if (currentReqData.message) {
          setEpiRequestMessage(currentReqData.message);
        } else {
          setEpiRequestMessage('Por favor, revise e confirme seus dados no sistema.');
        }
      } else {
        setEpiRequestActive(false);
      }
    };

    const setupListeners = () => {
      const auth = getAuth();
      if (!auth.currentUser) {
         setTimeout(setupListeners, 1000);
         return;
      }
      
      try {
        unsubscribeConfig = onSnapshot(doc(db, 'config', 'epi_request'), (snap) => {
          currentReqData = snap.exists() ? snap.data() : null;
          handleUpdate();
        }, (err) => console.error("Error epi config:", err));
        
        unsubscribeUser = onSnapshot(doc(db, 'medidasAntropometricas', userRgStr), (snap) => {
          currentUserData = snap.exists() ? snap.data() : null;
          handleUpdate();
        }, (err) => console.error("Error epi user:", err));
      } catch (err) {
        console.error("Setup error:", err);
      }
    };

    setupListeners();

    return () => {
      if (unsubscribeConfig) unsubscribeConfig();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, [user?.rg]);

  const userRgStr = user.rg?.toString().trim().toUpperCase() || '';
  const isAdmin = (isAdminRaw || isEscalanteRaw) && !user.isOutsourced;
  const alaCheck = (user.ala?.toString() || '').toUpperCase();
  const isExp = alaCheck.includes('EXP') || alaCheck === 'E' || alaCheck === 'EXPEDIENTE';
  const isOfficerUser = isOfficer(user.rank || '');

  const userGroups = ['TODOS'];
  if (isAdminRaw) userGroups.push('ADMIN');
  if (isEscalanteRaw) userGroups.push('ESCALANTE');
  if (isOfficerUser) userGroups.push('OFICIAIS');
  if (isExp) userGroups.push('EXP');
  if (user.isRefeitorioAdmin) userGroups.push('REFEITORIO_ADMIN');
  
  if (['1', '2', '3', '4'].includes(alaCheck)) {
    userGroups.push('PRONTIDAO');
  }

  const isVisible = (moduleId: string, defaultVisibilityGroups: string[] = ['TODOS']) => {
    if (user.isOutsourced && !user.isAdmin) {
      if (user.isRefeitorioAdmin) {
        return moduleId === 'refeitorio';
      }
      return false;
    }
    
    if (isOfficerUser && moduleId === 'grd') return false;
    
    let allowedGroups = defaultVisibilityGroups;
    if (visibilityConfig && visibilityConfig[moduleId] !== undefined) {
      allowedGroups = visibilityConfig[moduleId];
    }
    if (allowedGroups.length === 0) return false;

    // Check specific RGs
    const localRgStr = user.rg?.toString().trim();
    if (localRgStr && allowedGroups.some(g => g === `RG:${localRgStr}`)) {
       return true;
    }

    return allowedGroups.some(g => userGroups.includes(g));
  };

  const operacionalModulesDef = [
    {
      id: 'permutas',
      label: 'Permutas de Escala',
      description: 'Gestão de Trocas',
      icon: ArrowRightLeft,
      color: 'bg-indigo-600 shadow-indigo-200',
      defaultGroups: ['TODOS']
    },
    {
      id: 'agenda',
      label: 'Agenda Operacional',
      description: 'Calendário Integrado',
      icon: Calendar,
      color: 'bg-amber-500 shadow-amber-200',
      defaultGroups: ['TODOS']
    },
    {
      id: 'expediente',
      label: 'Escala do Expediente',
      description: 'Gestão de Serviços EXP',
      icon: CalendarRange,
      color: 'bg-indigo-400 shadow-indigo-100',
      defaultGroups: ['EXP', 'ADMIN', 'ESCALANTE', 'OFICIAIS']
    },
    {
      id: 'servicos-grd',
      label: 'Serviços e GRD',
      description: 'Escala de Oficiais',
      icon: ShieldCheck,
      color: 'bg-indigo-700 shadow-indigo-200',
      defaultGroups: ['OFICIAIS', 'ADMIN', 'ESCALANTE']
    },
    {
      id: 'nucleo-nautico',
      label: 'Núcleo Náutico',
      description: 'Serviços e GRD',
      icon: Anchor,
      color: 'bg-cyan-600 shadow-cyan-200',
      defaultGroups: ['OFICIAIS', 'ADMIN', 'ESCALANTE']
    }
  ];

  const informativoModulesDef = [
    {
       id: 'painel-militar',
       label: 'Painel do Militar',
       description: 'Seus Dados e Medidas',
       icon: Settings,
       color: 'bg-teal-600 shadow-teal-200',
       defaultGroups: ['TODOS']
    },
    {
       id: 'documentos',
       label: 'Documentos',
       description: 'Boletins e Manuais',
       icon: BookOpen,
       color: 'bg-slate-700 shadow-slate-200',
       disabled: true,
       defaultGroups: ['TODOS']
    },
    {
      id: 'refeitorio',
      label: 'Refeitório',
      description: 'Cardápio do Dia',
      icon: UtensilsCrossed,
      color: 'bg-rose-500 shadow-rose-200',
      defaultGroups: ['TODOS']
    }
  ];

  const escalanteModulesDef = [
    {
       id: 'buscar-militar',
       label: 'Buscar Militar',
       description: 'Diretório de Perfis',
       icon: Search,
       color: 'bg-blue-600 shadow-blue-200',
       defaultGroups: ['ADMIN', 'ESCALANTE', 'OFICIAIS']
    },
    {
      id: 'aprovisionamento',
      label: 'Aprovisionamento',
      description: 'Cardápio e Estoque',
      icon: ShoppingCart,
      color: 'bg-amber-600 shadow-amber-200',
      defaultGroups: ['ADMIN', 'ESCALANTE', 'OFICIAIS', 'REFEITORIO_ADMIN']
    },
    {
      id: 'efetivo',
      label: 'Gestão de Efetivo',
      description: 'Mapa e Subunidades',
      icon: Users,
      color: 'bg-emerald-600 shadow-emerald-200',
      defaultGroups: ['ADMIN', 'ESCALANTE', 'OFICIAIS']
    },
    {
       id: 'patrimonio',
       label: 'Bens Patrimoniais',
       description: 'Carga e Inventário',
       icon: Package,
       color: 'bg-cyan-600 shadow-cyan-200',
       defaultGroups: ['ADMIN', 'ESCALANTE', 'OFICIAIS']
    },
    {
      id: 'relatorio',
      label: 'Relatórios do Efetivo',
      description: 'Mapas e Gráficos',
      icon: FileText,
      color: 'bg-rose-600 shadow-rose-200',
      disabled: true,
      defaultGroups: ['ADMIN', 'ESCALANTE', 'OFICIAIS']
    },
    {
      id: 'escalante-gerenciar',
      label: 'Painel do Escalante',
      description: 'Gerenciar Escala',
      icon: UserCheck,
      color: 'bg-violet-600 shadow-violet-200',
      defaultGroups: ['ADMIN', 'ESCALANTE', 'OFICIAIS'],
      inDevelopment: true
    },
    {
      id: 'gestao-sad',
      label: 'Gestão SAD',
      description: 'Oficiais, Terceirizados, Férias...',
      icon: BriefcaseBusiness,
      color: 'bg-emerald-800 shadow-emerald-200',
      defaultGroups: ['ADMIN', 'ESCALANTE']
    }
  ];

  const moderadorModulesDef = [
    {
      id: 'grd',
      label: 'GRD',
      description: 'Guarnição de Resgate e Defesa',
      icon: Shield,
      color: 'bg-emerald-700 shadow-emerald-200',
      defaultGroups: ['EXP', 'PRONTIDAO', 'ADMIN', 'ESCALANTE']
    },
    {
      id: 'translado',
      label: 'Translado OBM',
      description: 'Viaturas Administrativas',
      icon: Bus,
      color: 'bg-blue-500 shadow-blue-200',
      defaultGroups: ['ADMIN', 'ESCALANTE']
    },
    {
      id: 'comunicacao',
      label: 'Painel do Comunicante',
      description: 'Acionar Viaturas',
      icon: Radio,
      color: 'bg-rose-600 shadow-rose-200',
      defaultGroups: ['ADMIN', 'ESCALANTE']
    }
  ];

  type SectionType = 'operacional' | 'informativo' | 'escalante' | 'moderador';
  
  const moveItem = (modules: any[], id: string, direction: -1 | 1, section: SectionType) => {
     const currentIds = modules.map(m => m.id);
     const idx = currentIds.indexOf(id);
     if (idx < 0) return;
     if (idx === 0 && direction === -1) return;
     if (idx === currentIds.length - 1 && direction === 1) return;
     
     const newIds = [...currentIds];
     const temp = newIds[idx];
     newIds[idx] = newIds[idx + direction];
     newIds[idx + direction] = temp;
     
     if (section === 'escalante') {
        setEscalanteOrder(newIds);
        localStorage.setItem('escalanteModuleOrder', JSON.stringify(newIds));
     } else if (section === 'operacional') {
        setOperacionalOrder(newIds);
        localStorage.setItem('operacionalModuleOrder', JSON.stringify(newIds));
     } else if (section === 'moderador') {
        setModeradorOrder(newIds);
        localStorage.setItem('moderadorModuleOrder', JSON.stringify(newIds));
     } else {
        setInformativoOrder(newIds);
        localStorage.setItem('informativoModuleOrder', JSON.stringify(newIds));
     }
  };

  const visibleOperacionalModulesRaw = operacionalModulesDef.filter(mod => isVisible(mod.id, mod.defaultGroups));
  const visibleInformativoModulesRaw = informativoModulesDef.filter(mod => isVisible(mod.id, mod.defaultGroups));
  const visibleEscalanteModulesRaw = escalanteModulesDef.filter(mod => isVisible(mod.id, mod.defaultGroups));
  const visibleModeradorModulesRaw = moderadorModulesDef.filter(mod => isVisible(mod.id, mod.defaultGroups));

  const sortModules = (raw: any[], orderList: string[]) => {
    return [...raw].sort((a, b) => {
      const idxA = orderList.indexOf(a.id);
      const idxB = orderList.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });
  };

  const visibleOperacionalModules = sortModules(visibleOperacionalModulesRaw, operacionalOrder);
  const visibleInformativoModules = sortModules(visibleInformativoModulesRaw, informativoOrder);
  const visibleEscalanteModules = sortModules(visibleEscalanteModulesRaw, escalanteOrder);
  const visibleModeradorModules = sortModules(visibleModeradorModulesRaw, moderadorOrder);

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-5 h-5 text-indigo-600" />
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Painel de Aplicações</h2>
        </div>
        {isAdmin && (
           <button 
             onClick={() => setIsEditMode(!isEditMode)}
             className={cn("px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-colors shadow-sm",
               isEditMode ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
             )}
           >
             {isEditMode ? "Concluir Edição" : "Editar Ordem"}
           </button>
        )}
      </div>

      <div className="mb-6 group">
        <button 
          onClick={() => setShowMural(!showMural)}
          className={cn(
            "w-full flex items-center justify-between p-3 sm:p-4 rounded-3xl border-2 transition-all shadow-md relative overflow-hidden",
            showMural 
              ? "bg-white border-indigo-100 ring-2 ring-indigo-50/50" 
              : "bg-gradient-to-r from-indigo-500 to-indigo-700 border-transparent text-white hover:shadow-indigo-100"
          )}
        >
          {showMural && <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 blur-2xl -translate-y-1/2 translate-x-1/4 rounded-full pointer-events-none"></div>}
          
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 backdrop-blur-sm transition-colors",
              showMural ? "bg-indigo-100 text-indigo-600" : "bg-white/20 text-white"
            )}>
              <Megaphone className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className={cn("text-sm sm:text-base font-black uppercase tracking-tight", showMural ? "text-slate-800" : "text-white")}>
                Mural de Avisos & Prazos
              </h3>
              <p className={cn("text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-0.5", showMural ? "text-indigo-600" : "text-white/80")}>
                {showMural ? "Informações Institucionais" : "Visualizar avisos do dia"}
              </p>
            </div>
          </div>
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-all",
            showMural ? "bg-slate-100 text-slate-400 rotate-180" : "bg-white/20 text-white"
          )}>
            <ChevronDown className="w-4 h-4" />
          </div>
        </button>

        <AnimatePresence>
          {showMural && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: "auto", opacity: 1, marginTop: 12 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              className="overflow-hidden"
            >
              <MuralAvisos isAdminOrEscalante={!!(isAdminRaw || isEscalanteRaw)} userName={user.name} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {visibleOperacionalModules.length > 0 && (
         <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
               <Shield className="w-5 h-5 text-indigo-600" />
               <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Operacional</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {visibleOperacionalModules.map((mod, index) => (
                <ModuleIcon
                  key={mod.id}
                  id={mod.id}
                  label={mod.label}
                  description={mod.description}
                  icon={mod.icon}
                  color={mod.color}
                  disabled={(mod as any).disabled}
                  comingSoon={(mod as any).comingSoon}
                  inDevelopment={(mod as any).inDevelopment}
                  alertText={mod.id === 'medidas' && epiRequestActive ? epiRequestMessage : undefined}
                  onClick={() => !isEditMode && onLaunchModule(mod.id)}
                  onMoveLeft={isEditMode && index > 0 ? (e) => { e.stopPropagation(); moveItem(visibleOperacionalModules, mod.id, -1, 'operacional'); } : undefined}
                  onMoveRight={isEditMode && index < visibleOperacionalModules.length - 1 ? (e) => { e.stopPropagation(); moveItem(visibleOperacionalModules, mod.id, 1, 'operacional'); } : undefined}
                />
              ))}
              {/* Coming Soon placeholders */}
              {!isEditMode && visibleOperacionalModules.length < 4 && (
                <div className="col-span-1 border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center gap-2 opacity-40 min-h-[140px]">
                   <MessageSquare className="w-8 h-8 text-slate-300" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Em Breve</span>
                </div>
              )}
            </div>
         </div>
      )}

      {visibleInformativoModules.length > 0 && (
         <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
               <BookOpen className="w-5 h-5 text-teal-600" />
               <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Informativo</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {visibleInformativoModules.map((mod, index) => (
                <ModuleIcon
                  key={mod.id}
                  id={mod.id}
                  label={mod.label}
                  description={mod.description}
                  icon={mod.icon}
                  color={mod.color}
                  disabled={(mod as any).disabled}
                  comingSoon={(mod as any).comingSoon}
                  inDevelopment={(mod as any).inDevelopment}
                  alertText={mod.id === 'medidas' && epiRequestActive ? epiRequestMessage : undefined}
                  onClick={() => !isEditMode && onLaunchModule(mod.id)}
                  onMoveLeft={isEditMode && index > 0 ? (e) => { e.stopPropagation(); moveItem(visibleInformativoModules, mod.id, -1, 'informativo'); } : undefined}
                  onMoveRight={isEditMode && index < visibleInformativoModules.length - 1 ? (e) => { e.stopPropagation(); moveItem(visibleInformativoModules, mod.id, 1, 'informativo'); } : undefined}
                />
              ))}
            </div>
         </div>
      )}

      {visibleEscalanteModules.length > 0 && (
         <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
               <ShieldCheck className="w-5 h-5 text-rose-600" />
               <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Espaço do Escalante / Admin</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {visibleEscalanteModules.map((mod, index) => (
                <ModuleIcon
                  key={mod.id}
                  id={mod.id}
                  label={mod.label}
                  description={mod.description}
                  icon={mod.icon}
                  color={mod.color}
                  disabled={(mod as any).disabled}
                  comingSoon={(mod as any).comingSoon}
                  inDevelopment={(mod as any).inDevelopment}
                  alertText={mod.id === 'medidas' && epiRequestActive ? epiRequestMessage : undefined}
                  onClick={() => !isEditMode && onLaunchModule(mod.id)}
                  onMoveLeft={isEditMode && index > 0 ? (e) => { e.stopPropagation(); moveItem(visibleEscalanteModules, mod.id, -1, 'escalante'); } : undefined}
                  onMoveRight={isEditMode && index < visibleEscalanteModules.length - 1 ? (e) => { e.stopPropagation(); moveItem(visibleEscalanteModules, mod.id, 1, 'escalante'); } : undefined}
                />
              ))}
            </div>
         </div>
      )}

      {isAdmin && visibleModeradorModules.length > 0 && (
         <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
               <Shield className="w-5 h-5 text-indigo-800" />
               <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Painel de Moderação</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {visibleModeradorModules.map((mod, index) => (
                <ModuleIcon
                  key={mod.id}
                  id={mod.id}
                  label={mod.label}
                  description={mod.description}
                  icon={mod.icon}
                  color={mod.color}
                  disabled={(mod as any).disabled}
                  comingSoon={(mod as any).comingSoon}
                  inDevelopment={(mod as any).inDevelopment}
                  alertText={mod.id === 'medidas' && epiRequestActive ? epiRequestMessage : undefined}
                  onClick={() => !isEditMode && onLaunchModule(mod.id)}
                  onMoveLeft={isEditMode && index > 0 ? (e) => { e.stopPropagation(); moveItem(visibleModeradorModules, mod.id, -1, 'moderador'); } : undefined}
                  onMoveRight={isEditMode && index < visibleModeradorModules.length - 1 ? (e) => { e.stopPropagation(); moveItem(visibleModeradorModules, mod.id, 1, 'moderador'); } : undefined}
                />
              ))}
            </div>
         </div>
      )}

         <div className="mt-12 p-6 sm:p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
               <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
                  <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
               </div>
               <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-tight">Ambiente Seguro</h4>
                  <p className="text-[9px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5 sm:mt-0">Sua conexão está criptografada e autenticada.</p>
               </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-center">
               <div className="px-3 sm:px-4 py-2 bg-white rounded-xl border border-slate-200 text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest shadow-sm">
                  v2.4.0
               </div>
               <div className="px-3 sm:px-4 py-2 bg-white rounded-xl border border-slate-200 text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest shadow-sm">
                  10º GBM - Angra
               </div>
            </div>
         </div>

         {isAdmin && (
           <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row border-b border-slate-200 mb-6 pb-2 gap-4">
                 <button
                   onClick={() => setAdminTab('apps')}
                   className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors", adminTab === 'apps' ? "bg-indigo-50 text-indigo-700" : "text-slate-400 hover:bg-slate-50")}
                 >
                   Visibilidade de Apps
                 </button>
                 <button
                   onClick={() => setAdminTab('roles')}
                   className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors", adminTab === 'roles' ? "bg-emerald-50 text-emerald-700" : "text-slate-400 hover:bg-slate-50")}
                 >
                   Cargos e Perfis
                 </button>
              </div>
              
              {adminTab === 'apps' ? <AppVisibilityConfig /> : <SystemRolesConfig />}
           </div>
         )}
      </div>
   );
}
