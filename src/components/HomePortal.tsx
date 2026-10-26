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
  Anchor,
  Stethoscope,
  Folder,
  FolderKanban,
  X,
  ExternalLink,
  Bell,
  PenTool,
  Building2,
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
import { useNotificacoesMilitar } from '../hooks/useNotificacoesMilitar';
import { OperationalDutyWidget } from './OperationalDutyWidget';

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
  isFolder?: boolean;
  subModules?: any[];
  onMoveLeft?: (e: React.MouseEvent) => void;
  onMoveRight?: (e: React.MouseEvent) => void;
}

const ModuleIcon: React.FC<ModuleIconProps> = ({ 
  label, 
  icon: Icon, 
  color, 
  onClick, 
  description, 
  disabled, 
  comingSoon, 
  alertText, 
  inDevelopment, 
  isFolder,
  subModules,
  onMoveLeft, 
  onMoveRight 
}) => {
  return (
    <motion.button
      whileHover={disabled ? {} : { y: -4, scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={disabled ? undefined : onClick}
      className={cn(
        "bg-white dark:bg-[#141c2e] border border-slate-300 dark:border-slate-700/80 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-3 sm:p-4 md:p-4.5 flex flex-col items-center justify-center gap-2 sm:gap-3 shadow-xs hover:shadow-md transition-all text-center group relative overflow-hidden cursor-pointer",
        disabled ? "opacity-50 grayscale cursor-not-allowed" : "hover:shadow-lg",
        isFolder && "border border-indigo-300 dark:border-indigo-500/60 bg-gradient-to-b from-white to-indigo-50/30 dark:from-slate-900/40 dark:to-indigo-950/30 hover:border-indigo-500"
      )}
    >
      {(onMoveLeft || onMoveRight) && (
        <div className="absolute top-2 left-0 right-0 flex justify-between px-2.5 z-30">
          <div
            onClick={onMoveLeft}
            className={cn("p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:text-indigo-600 transition text-slate-400 opacity-0 group-hover:opacity-100", !onMoveLeft && "hidden")}
          >
             <ChevronLeft className="w-3.5 h-3.5" />
          </div>
          <div
            onClick={onMoveRight}
            className={cn("p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:text-indigo-600 transition text-slate-400 opacity-0 group-hover:opacity-100", !onMoveRight && "hidden")}
          >
             <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      )}

      {isFolder && (
        <div className="absolute top-2 sm:top-2.5 right-2 sm:right-2.5 bg-indigo-100/90 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[7px] sm:text-[8px] font-black py-0.5 px-2 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-2xs z-10">
          <Folder className="w-2.5 h-2.5" />
          <span>3 Apps</span>
        </div>
      )}

      {comingSoon && (
        <div className="absolute top-2 sm:top-3 right-[-35px] sm:right-[-30px] bg-amber-500 text-white text-[7px] sm:text-[8px] font-black py-1 px-10 rotate-45 uppercase tracking-widest shadow-sm z-10">
          Breve
        </div>
      )}

      {alertText && (
        <div className="absolute top-3 right-3 bg-rose-500 w-3 h-3 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center shadow-md animate-pulse z-20" title={alertText}>
        </div>
      )}

      {inDevelopment && (
        <div className="absolute top-2 sm:top-3 right-[-40px] sm:right-[-35px] bg-indigo-500 text-white text-[6px] sm:text-[7px] font-black py-1 px-12 rotate-45 uppercase tracking-widest shadow-sm z-10">
          Dev
        </div>
      )}
      
      {disabled && !comingSoon && !inDevelopment && (
        <div className="absolute top-2 right-2.5">
          <div className="bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[7px] sm:text-[8px] font-black py-0.5 px-1.5 rounded-full uppercase tracking-widest outline outline-1 outline-slate-200 dark:outline-slate-700">
            Off
          </div>
        </div>
      )}

      {isFolder ? (
        <div className="w-10 h-10 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-900 to-slate-900 p-1 sm:p-1.5 flex items-center justify-center text-white shadow-md transition-all group-hover:scale-105 border border-indigo-400/40">
          <div className="grid grid-cols-2 gap-1 w-full h-full">
            <div className="bg-indigo-600 rounded flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
            </div>
            <div className="bg-cyan-600 rounded flex items-center justify-center shadow-xs">
              <Anchor className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
            </div>
            <div className="bg-rose-600 rounded flex items-center justify-center shadow-xs">
              <Stethoscope className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
            </div>
            <div className="bg-slate-800/90 rounded flex items-center justify-center shadow-xs">
              <Folder className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-300" />
            </div>
          </div>
        </div>
      ) : (
        <div className={cn(
          `w-10 h-10 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-xl sm:rounded-2xl ${color} flex items-center justify-center text-white shadow-md transition-transform`,
          !disabled && "group-hover:rotate-6"
        )}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
        </div>
      )}
      <div className="w-full">
        <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter text-[11px] sm:text-xs md:text-sm leading-tight truncate px-1">
          {label}
        </h3>
        {description && (
          <p className={cn(
            "text-[8px] sm:text-[9.5px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5 sm:mt-1 transition-colors line-clamp-1",
            !disabled && "group-hover:text-slate-600 dark:group-hover:text-slate-300"
          )}>
            {description}
          </p>
        )}
      </div>
    </motion.button>
  );
};

interface HomePortalProps {
  user: UserProfile;
  isAdminRaw?: boolean;
  isEscalanteRaw?: boolean;
  onLaunchModule: (moduleId: string) => void;
  obmContext?: string;
}

export function HomePortal({ user, isAdminRaw, isEscalanteRaw, onLaunchModule, obmContext }: HomePortalProps) {
  const { appVisibility: visibilityConfig } = useAppConfig();
  const { pendingMySignature } = useNotificacoesMilitar(user);
  const [isEditMode, setIsEditMode] = useState(false);
  const [operacionalOrder, setOperacionalOrder] = useState<string[]>(() => {
     const saved = localStorage.getItem('operacionalModuleOrder');
     if (!saved) return [];
     try {
       const parsed = JSON.parse(saved);
       if (Array.isArray(parsed) && !parsed.includes('servico-de-oficiais')) {
         const oldIdx = parsed.findIndex(id => id === 'servicos-grd' || id === 'nucleo-nautico' || id === 'oficiais-medicos');
         if (oldIdx !== -1) {
           const updated = parsed.filter(id => id !== 'servicos-grd' && id !== 'nucleo-nautico' && id !== 'oficiais-medicos');
           updated.splice(oldIdx, 0, 'servico-de-oficiais');
           return updated;
         }
       }
       return parsed;
     } catch {
       return [];
     }
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
  if (!isOfficerUser) userGroups.push('PRACAS');
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

    if (moduleId === 'servico-de-oficiais') {
      if (visibilityConfig && visibilityConfig[moduleId] !== undefined) {
        const allowedGroups = visibilityConfig[moduleId];
        if (allowedGroups.length === 0) return false;
        const localRgStr = user.rg?.toString().trim();
        if (localRgStr && allowedGroups.some(g => g === `RG:${localRgStr}`)) return true;
        return allowedGroups.some(g => userGroups.includes(g));
      }
      return isVisible('servicos-grd', ['OFICIAIS', 'ADMIN', 'ESCALANTE']) || 
             isVisible('nucleo-nautico', ['OFICIAIS', 'ADMIN', 'ESCALANTE']) || 
             isVisible('escala-oficiais-medicos', ['OFICIAIS', 'ADMIN', 'ESCALANTE']) ||
             isVisible('oficiais-medicos', ['OFICIAIS', 'ADMIN', 'ESCALANTE']);
    }
    
    let allowedGroups = defaultVisibilityGroups;
    if (visibilityConfig && visibilityConfig[moduleId] !== undefined) {
      allowedGroups = visibilityConfig[moduleId];
    } else if (moduleId === 'gestao-sad' && visibilityConfig && visibilityConfig['ferias-sad'] !== undefined) {
      allowedGroups = visibilityConfig['ferias-sad'];
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
      id: 'servico-de-oficiais',
      label: 'Serviço de Oficiais',
      description: 'GRD, Náutico & Médicos',
      icon: Folder,
      color: 'bg-indigo-800 shadow-indigo-300',
      isFolder: true,
      defaultGroups: ['OFICIAIS', 'ADMIN', 'ESCALANTE'],
      subModules: [
        {
          id: 'servicos-grd',
          label: 'Serviços e GRD',
          description: 'Escala de Oficiais e Oficial de Dia',
          icon: ShieldCheck,
          color: 'bg-indigo-700 shadow-indigo-200',
          badge: 'Geral & Sobreaviso',
          defaultGroups: ['OFICIAIS', 'ADMIN', 'ESCALANTE']
        },
        {
          id: 'nucleo-nautico',
          label: 'Núcleo Náutico',
          description: 'Serviços Especializados e GRD Marítima',
          icon: Anchor,
          color: 'bg-cyan-600 shadow-cyan-200',
          badge: 'Operações Náuticas',
          defaultGroups: ['OFICIAIS', 'ADMIN', 'ESCALANTE']
        },
        {
          id: 'escala-oficiais-medicos',
          label: 'Oficiais Médicos',
          description: 'Serviços e Escala Médica Hospitalar',
          icon: Stethoscope,
          color: 'bg-rose-700 shadow-rose-200',
          badge: 'Corpo de Saúde',
          defaultGroups: ['OFICIAIS', 'ADMIN', 'ESCALANTE']
        }
      ]
    },
    {
      id: 'ras',
      label: 'RAS',
      description: 'Regime Adicional de Serviço',
      icon: BriefcaseBusiness,
      color: 'bg-amber-600 shadow-amber-200',
      defaultGroups: ['PRACAS', 'ADMIN', 'ESCALANTE']
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
    },
    {
      id: 'comando-area',
      label: 'Comando de Área',
      description: 'CBAs, OBMs e DBMs',
      icon: Building2,
      color: 'bg-amber-600 shadow-amber-200',
      defaultGroups: ['ADMIN', 'ESCALANTE']
    },
    {
      id: 'gestao-oficiais-medicos',
      label: 'Oficiais Médicos',
      description: 'Efetivo Médico e GSE',
      icon: Stethoscope,
      color: 'bg-rose-700 shadow-rose-200',
      defaultGroups: ['ADMIN', 'ESCALANTE']
    },
    {
      id: 'configuracoes',
      label: 'Configurações',
      description: 'Sistema e App',
      icon: Settings2,
      color: 'bg-slate-800 shadow-slate-200',
      defaultGroups: ['ADMIN']
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
      {isAdmin && (
        <div className="flex justify-end mb-4">
          <button 
            onClick={() => setIsEditMode(!isEditMode)}
            className={cn("px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-colors shadow-sm cursor-pointer",
              isEditMode ? "bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-500" : "bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            )}
          >
            {isEditMode ? "Concluir Edição" : "Editar Ordem"}
          </button>
        </div>
      )}

      {/* Banner Social de Permutas Pendentes de Assinatura */}
      {pendingMySignature.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white shadow-lg shadow-amber-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-amber-400/50"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 text-white">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-red-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                  Ação Obrigatória
                </span>
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider">
                  {pendingMySignature.length === 1
                    ? "1 Solicitação de Permuta Aguardando Você"
                    : `${pendingMySignature.length} Solicitações de Permutas Aguardando Você`}
                </span>
              </div>
              <p className="text-xs text-amber-100 font-medium mt-1 leading-relaxed">
                Um militar solicitou permuta com você. Sua assinatura é necessária para validar e enviar ao Escalante.
              </p>
            </div>
          </div>
          <button
            onClick={() => onLaunchModule("permutas")}
            className="w-full sm:w-auto px-4 py-2.5 bg-white text-amber-900 hover:bg-amber-50 rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all shrink-0 cursor-pointer active:scale-95 flex items-center justify-center gap-2"
          >
            <PenTool className="w-4 h-4 text-amber-700" />
            <span>Revisar e Assinar</span>
          </button>
        </motion.div>
      )}

      <div className="mb-5 sm:mb-6 group">
        <button 
          onClick={() => setShowMural(!showMural)}
          className={cn(
            "w-full flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all shadow-xs relative overflow-hidden cursor-pointer",
            showMural 
              ? "bg-white dark:bg-[#141c2e] border-slate-300 dark:border-slate-700 shadow-sm" 
              : "bg-gradient-to-r from-indigo-600 via-indigo-700 to-slate-900 border-indigo-500/60 text-white shadow-sm hover:shadow-indigo-500/20 hover:border-indigo-400"
          )}
        >
          {showMural && <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 dark:bg-indigo-950/40 blur-2xl -translate-y-1/2 translate-x-1/4 rounded-full pointer-events-none"></div>}
          
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={cn(
              "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 backdrop-blur-sm transition-colors",
              showMural ? "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400" : "bg-white/20 text-white"
            )}>
              <Megaphone className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-left">
              <h3 className={cn("text-xs sm:text-sm md:text-base font-black uppercase tracking-tight", showMural ? "text-slate-800 dark:text-slate-100" : "text-white")}>
                Mural de Avisos & Prazos
              </h3>
              <p className={cn("text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-widest mt-0.5", showMural ? "text-indigo-600 dark:text-indigo-400" : "text-white/80")}>
                {showMural ? "Informações Institucionais" : "Visualizar avisos do dia"}
              </p>
            </div>
          </div>
          <div className={cn(
            "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all",
            showMural ? "bg-slate-100 dark:bg-slate-800 text-slate-400 rotate-180" : "bg-white/20 text-white"
          )}>
            <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </button>

        <AnimatePresence>
          {showMural && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: "auto", opacity: 1, marginTop: 10 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              className="overflow-hidden"
            >
              <MuralAvisos isAdminOrEscalante={!!(isAdminRaw || isEscalanteRaw)} userName={user.name} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {visibleOperacionalModules.length > 0 && (
         <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-200/90 dark:border-slate-800">
               <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Shield className="w-3.5 h-3.5" />
               </div>
               <h2 className="text-xs sm:text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-[0.2em]">Operacional</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4">
              {visibleOperacionalModules.map((mod, index) => (
                <ModuleIcon
                  key={mod.id}
                  id={mod.id}
                  label={mod.label}
                  description={mod.description}
                  icon={mod.icon}
                  color={mod.color}
                  isFolder={(mod as any).isFolder}
                  subModules={(mod as any).subModules}
                  disabled={(mod as any).disabled}
                  comingSoon={(mod as any).comingSoon}
                  inDevelopment={(mod as any).inDevelopment}
                  alertText={mod.id === 'medidas' && epiRequestActive ? epiRequestMessage : undefined}
                  onClick={() => !isEditMode && onLaunchModule(mod.id)}
                  onMoveLeft={isEditMode && index > 0 ? (e) => { e.stopPropagation(); moveItem(visibleOperacionalModules, mod.id, -1, 'operacional'); } : undefined}
                  onMoveRight={isEditMode && index < visibleOperacionalModules.length - 1 ? (e) => { e.stopPropagation(); moveItem(visibleOperacionalModules, mod.id, 1, 'operacional'); } : undefined}
                />
              ))}
            </div>
         </div>
      )}

      {visibleInformativoModules.length > 0 && (
         <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-200/90 dark:border-slate-800">
               <div className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-950/50 border border-teal-200/80 dark:border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                  <BookOpen className="w-3.5 h-3.5" />
               </div>
               <h2 className="text-xs sm:text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-[0.2em]">Informativo</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4">
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
              {/* Em Breve placeholder ao lado do app Refeitório */}
              {!isEditMode && (
                <div className="col-span-1 border-2 border-dashed border-slate-300 dark:border-slate-700/80 rounded-2xl p-3 sm:p-4 md:p-4.5 flex flex-col items-center justify-center gap-2 opacity-60 min-h-[110px] text-center">
                   <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-slate-400" />
                   <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Em Breve</span>
                </div>
              )}
            </div>
         </div>
      )}

      {visibleEscalanteModules.length > 0 && (
         <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-200/90 dark:border-slate-800">
               <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
               </div>
               <h2 className="text-xs sm:text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-[0.2em]">Espaço do Escalante / Admin</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4">
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
         <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-200/90 dark:border-slate-800">
               <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-500/30 flex items-center justify-center text-indigo-800 dark:text-indigo-400 shrink-0">
                  <Shield className="w-3.5 h-3.5" />
               </div>
               <h2 className="text-xs sm:text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-[0.2em]">Painel de Moderação</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4">
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

      {/* Indicativo de Turno Operacional, Ala do Dia e Relação de Militares por OBM (Última Seção da Homepage) */}
      <div className="mt-8 mb-6">
        <OperationalDutyWidget user={user} obmContext={obmContext} />
      </div>

         <div className="mt-8 p-4 sm:p-5 bg-slate-100/80 dark:bg-slate-900/60 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-center sm:text-left">
               <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-xs shrink-0 border border-slate-200 dark:border-slate-700">
                  <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
               </div>
               <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Ambiente Seguro</h4>
                  <p className="text-[8.5px] sm:text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">Sua conexão está criptografada e autenticada.</p>
               </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-center">
               <div className="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-[8px] sm:text-[9.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest shadow-2xs">
                  v2.4.0
               </div>
               <div className="px-3 py-1.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-[8px] sm:text-[9.5px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest shadow-2xs">
                  10º GBM - Angra
               </div>
            </div>
         </div>
      </div>
   );
}
