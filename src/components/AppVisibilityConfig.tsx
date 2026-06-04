import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { LayoutGrid, Save, Lock } from 'lucide-react';
import { useAppConfig } from '../contexts/ConfigContext';
import { cleanUndefined } from "../lib/utils";

export interface ModuleVisibilityConfig {
  [moduleId: string]: string[];
}

const DEFAULT_CONFIG: ModuleVisibilityConfig = {
  permutas: ['TODOS'],
  efetivo: ['TODOS'],
  agenda: ['TODOS'],
  ferias: ['TODOS'],
  atualizacao: ['TODOS'],
  documentos: ['TODOS'],
  patrimonio: ['TODOS'],
  medidas: ['TODOS'],
  refeitorio: ['TODOS'],
  'sop-medidas': ['ADMIN', 'ESCALANTE'],
  expediente: ['EXP', 'ADMIN', 'ESCALANTE'],
  relatorio: ['ADMIN', 'ESCALANTE'],
  'ferias-sad': ['ADMIN', 'ESCALANTE'],
  'escalante-gerenciar': ['ADMIN', 'ESCALANTE']
};

const MODULE_NAMES: Record<string, string> = {
  permutas: 'Permutas de Escala',
  efetivo: 'Gestão de Efetivo',
  agenda: 'Agenda Operacional',
  ferias: 'Controle de Férias Pessoal',
  atualizacao: 'Atualização Cadastral',
  documentos: 'Documentos',
  patrimonio: 'Bens Patrimoniais',
  medidas: 'Medidas Antropométricas',
  refeitorio: 'Refeitório',
  'sop-medidas': 'Gestão de Efetivo - SOP',
  expediente: 'Escala do Expediente',
  relatorio: 'Relatórios BI',
  'ferias-sad': 'Controle Férias SAD',
  'escalante-gerenciar': 'Painel do Escalante',
};

const AVAILABLE_GROUPS = [
  { id: 'TODOS', label: 'Todos os Militares' },
  { id: 'OFICIAIS', label: 'Apenas Oficiais' },
  { id: 'EXP', label: 'Expediente' },
  { id: 'PRONTIDAO', label: 'Prontidão (Alas 1 a 4)' },
  { id: 'ADMIN', label: 'Administradores' },
  { id: 'ESCALANTE', label: 'Escalantes' },
];

export function AppVisibilityConfig() {
  const { refreshConfigs } = useAppConfig();
  const [config, setConfig] = useState<ModuleVisibilityConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'app_visibility'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.visibility) {
          setConfig({ ...DEFAULT_CONFIG, ...data.visibility });
        }
      }
    });
    return () => unsub();
  }, []);

  const toggleGroup = (moduleId: string, groupId: string) => {
    setConfig(prev => {
      const currentGroups = prev[moduleId] || [];
      const isTodos = groupId === 'TODOS';
      
      let newGroups = [...currentGroups];

      if (isTodos) {
        if (newGroups.includes('TODOS')) {
           newGroups = newGroups.filter(g => g.startsWith('RG:')); // Keep RGs but remove regular groups
           if (newGroups.length === 0) newGroups = [];
        } else {
           newGroups = ['TODOS', ...newGroups.filter(g => g.startsWith('RG:'))];
        }
      } else {
        // Toggle specific group
        if (newGroups.includes(groupId)) {
          newGroups = newGroups.filter(g => g !== groupId);
        } else {
          newGroups = newGroups.filter(g => g !== 'TODOS'); // Remove TODOS if explicitly setting groups
          newGroups.push(groupId);
        }
      }

      return {
        ...prev,
        [moduleId]: newGroups
      };
    });
  };

  const updateModuleRGs = (moduleId: string, rgsList: string) => {
    setConfig(prev => {
      const currentGroups = prev[moduleId] || [];
      const nonRggroups = currentGroups.filter(g => !g.startsWith('RG:'));
      
      const newRgs = rgsList.split(',')
        .map(s => s.trim())
        .filter(s => s)
        .map(rg => `RG:${rg}`);
        
      return {
        ...prev,
        [moduleId]: [...nonRggroups, ...newRgs]
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'config', 'app_visibility'), cleanUndefined({
              visibility: config,
              updatedAt: new Date().toISOString()
            }), { merge: true });
    } catch (e) {
      console.error('Error saving visibility', e);
    } finally {
      if (refreshConfigs) {
        await refreshConfigs();
      }
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="text-sm font-black text-indigo-900 uppercase tracking-tight">Visibilidade de Aplicativos (Home)</h3>
            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">Defina para quais grupos cada módulo é exibido</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 text-white px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-all"
        >
          {saving ? 'Gravando...' : (
            <>
              <Save className="w-3.5 h-3.5" />
              Salvar Visibilidades
            </>
          )}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {Object.entries(MODULE_NAMES).map(([id, name]) => {
          const activeGroups = config[id] || [];
          const activeRGs = activeGroups.filter(g => g.startsWith('RG:')).map(g => g.replace('RG:', ''));
          const nonRggroups = activeGroups.filter(g => !g.startsWith('RG:'));
          
          return (
            <div key={id} className="flex flex-col border border-slate-100 rounded-lg p-4 bg-slate-50 gap-3">
               <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-800 tracking-tight">{name}</span>
               </div>
               <div className="flex flex-wrap gap-2">
                  {AVAILABLE_GROUPS.map(grp => {
                     const isActive = nonRggroups.includes(grp.id);
                     return (
                        <button
                           key={grp.id}
                           onClick={() => toggleGroup(id, grp.id)}
                           className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter transition-all border ${
                             isActive 
                               ? 'bg-indigo-100 border-indigo-300 text-indigo-900 shadow-sm' 
                               : 'bg-white border-slate-200 text-slate-400 opacity-70 hover:opacity-100'
                           }`}
                        >
                           {grp.label}
                        </button>
                     );
                  })}
                  {activeGroups.length === 0 && (
                     <div className="flex items-center gap-1 text-[9px] font-black text-red-500 uppercase px-2 py-1">
                        <Lock className="w-3 h-3" />
                        Acesso Restrito (Oculto para todos)
                     </div>
                  )}
               </div>
               <div className="mt-2">
                 <input
                   type="text"
                   value={activeRGs.join(', ')}
                   onChange={(e) => updateModuleRGs(id, e.target.value)}
                   placeholder="Destinar também por RG (separados por vírgula)"
                   className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 placeholder:text-slate-300"
                 />
               </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed border-l-2 border-indigo-200 pl-3">
        Defina os grupos. Se "Somente Oficiais" ou "Administradores" estiver marcado, militares de outras qualificações não visualizarão o aplicativo em sua Home.
      </p>
    </div>
  );
}
