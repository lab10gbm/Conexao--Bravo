import React, { useState, useMemo } from 'react';
import { Settings2, Save, X, Search, Building2, UserCog, Maximize2, Minimize2 } from 'lucide-react';
import { useMilitars } from '../contexts/MilitarContext';
import { UserProfile } from '../types';
import { COLS_OFICIAIS, parseRank, sortOfficersBySeniority } from '../lib/rankUtils';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const OFFICER_CATEGORIES = [
  { id: 'COMBATENTE', label: 'Oficiais Combatentes' },
  { id: 'MEDICO', label: 'Oficiais Médicos' },
  { id: 'ADMINISTRATIVO', label: 'Oficiais Administrativos' },
  { id: 'SEM_CATEGORIA', label: 'Sem Categoria Definida' }
];

const getCategory = (o: UserProfile) => {
   const role = (o.officerRole || '').toUpperCase();
   if (role.includes('MÉDICO') || role.includes('MEDICO')) return 'MEDICO';
   if (role.includes('ADMINISTRATIVO')) return 'ADMINISTRATIVO';
   if (role.includes('COMBATENTE')) return 'COMBATENTE';
   
   // Fallbacks via Quadro
   const q = (o.quadro || '').toUpperCase();
   if (q.includes('QOS')) return 'MEDICO';
   if (q.includes('QOA')) return 'ADMINISTRATIVO';
   if (q.includes('QOC')) return 'COMBATENTE';
   
   return 'SEM_CATEGORIA';
};

export function OfficerConfigModule({ onClose }: { onClose: () => void }) {
  const { militars, updateMilitarLocal, refreshMilitars } = useMilitars();
  const [searchTerm, setSearchTerm] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const officers = useMemo(() => {
    return militars.filter(m => {
      const r = parseRank(m.rank);
      return COLS_OFICIAIS.includes(r);
    }).sort(sortOfficersBySeniority);
  }, [militars]);

  const filteredOfficers = useMemo(() => {
    return officers.filter(o => 
      (o.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (o.warName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.rg || '').includes(searchTerm)
    );
  }, [officers, searchTerm]);

  const groups = useMemo(() => {
     return OFFICER_CATEGORIES.map(cat => ({
        ...cat,
        members: filteredOfficers.filter(o => getCategory(o) === cat.id)
     }));
  }, [filteredOfficers]);

  const handleUpdate = async (id: string, field: string, value: string) => {
    setSavingId(id);
    try {
      // 1. Instantly update local UI
      updateMilitarLocal(id, { [field]: value });

      // 2. Update Firestore document (using normalizeRg to ensure it targets the right document)
      const cleanRg = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const militarRef = doc(db, 'militaries', cleanRg);
      await updateDoc(militarRef, { [field]: value });
      
      // 3. Inform Backend Server to update its internal cache immediately
      await fetch('/api/admin/militaries/bulk-sync', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ militaries: [{ rg: cleanRg, [field]: value }] })
      }).catch(err => console.warn('Cache sync non-fatal err:', err));

    } catch (err) {
      console.error("Error updating officer config", err);
      // Rollback local change implicitly via a fresh fetch if there's an error
      refreshMilitars();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in slide-in-from-bottom-4 duration-700 overflow-hidden">
      <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <UserCog className="w-5 h-5 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Configuração de Oficiais</h1>
            <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest">OBM, Data de Promoção e Categoria</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 overflow-y-auto flex-1">
        <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar oficial..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all uppercase"
            />
          </div>
          <div className="text-xs font-black text-slate-500 bg-slate-100 px-4 py-2 rounded-lg border border-slate-200 uppercase tracking-widest">
            {filteredOfficers.length} Oficiais
          </div>
        </div>

        <div className={`grid gap-6 ${expandedGroup ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'}`}>
           {groups.map(group => {
              if (group.members.length === 0 && group.id === 'SEM_CATEGORIA') return null;
              
              const isExpanded = expandedGroup === group.id;
              const isMinimized = expandedGroup !== null && !isExpanded;

              return (
                 <div key={group.id} className={`bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col transition-all ${isExpanded ? 'ring-2 ring-indigo-500 shadow-lg' : ''}`}>
                    <div className="bg-slate-50 border-b-2 border-slate-200 p-4 flex items-center justify-between">
                       <h3 className="font-black text-slate-800 text-sm sm:text-base flex items-center gap-2 uppercase tracking-tighter">
                          <Building2 className="w-5 h-5 text-indigo-600" />
                          {group.label}
                       </h3>
                       <div className="flex items-center gap-3">
                          <span className="bg-white border border-slate-200 px-3 py-1 rounded-full text-xs font-black text-slate-600">
                             {group.members.length}
                          </span>
                          <button
                            onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                            className="p-1.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                          </button>
                       </div>
                    </div>
                    {!isMinimized && (
                       <div className="overflow-x-auto">
                          <table className="w-full text-left text-[11px] sm:text-[10px] font-bold uppercase tracking-widest">
                             <thead>
                               <tr className="bg-white text-slate-500 border-b border-slate-200">
                                 <th className="px-4 py-3 border-r border-slate-200 w-12 text-center">Nº</th>
                                 <th className="px-4 py-3 border-r border-slate-200 w-48">Oficial</th>
                                 <th className="px-4 py-3 border-r border-slate-200 w-40">Categoria</th>
                                 <th className="px-4 py-3 border-r border-slate-200 w-32">OBM</th>
                                 <th className="px-4 py-3">Data Promoção</th>
                               </tr>
                             </thead>
                             <tbody>
                               {group.members.map((officer, idx) => (
                                 <tr key={officer.rg} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${savingId === officer.rg ? 'opacity-50' : ''}`}>
                                   <td className="px-4 py-2 border-r border-slate-200 text-center text-slate-400">{idx + 1}</td>
                                   <td className="px-4 py-2 border-r border-slate-200">
                                     <div className="text-slate-800 text-[11px]">{officer.rank} {officer.warName || (officer.name || '').split(' ')[0]}</div>
                                     <div className="text-[9px] text-slate-400 mt-0.5">RG: {officer.rg}</div>
                                   </td>
                                   <td className="px-4 py-2 border-r border-slate-200">
                                     <select
                                        defaultValue={getCategory(officer)}
                                        onChange={(e) => {
                                           if (e.target.value !== getCategory(officer)) {
                                              let val = 'OFICIAL COMBATENTE';
                                              if (e.target.value === 'MEDICO') val = 'OFICIAL MÉDICO';
                                              if (e.target.value === 'ADMINISTRATIVO') val = 'OFICIAL ADMINISTRATIVO';
                                              if (e.target.value === 'SEM_CATEGORIA') val = '';
                                              if (officer.rg) {
                                                handleUpdate(officer.rg, 'officerRole', val);
                                              }
                                           }
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-700 text-[10px] font-black cursor-pointer"
                                     >
                                        <option value="COMBATENTE">Combatente</option>
                                        <option value="MEDICO">Médico</option>
                                        <option value="ADMINISTRATIVO">Administrativo</option>
                                        <option value="SEM_CATEGORIA">Sem Categoria</option>
                                     </select>
                                   </td>
                                   <td className="px-4 py-2 border-r border-slate-200">
                                     <input 
                                       type="text" 
                                       defaultValue={officer.obm || ''}
                                       onBlur={(e) => {
                                         if (e.target.value !== officer.obm && officer.rg) {
                                           handleUpdate(officer.rg, 'obm', e.target.value);
                                         }
                                       }}
                                       className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-700 text-[10px]"
                                       placeholder="10º GBM"
                                     />
                                   </td>
                                   <td className="px-4 py-2">
                                     <input 
                                       type="date" 
                                       defaultValue={officer.promotionDate || ''}
                                       onBlur={(e) => {
                                         if (e.target.value !== officer.promotionDate && officer.rg) {
                                           handleUpdate(officer.rg, 'promotionDate', e.target.value);
                                         }
                                       }}
                                       className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-700 text-[10px] cursor-pointer"
                                     />
                                   </td>
                                 </tr>
                               ))}
                               {group.members.length === 0 && (
                                 <tr>
                                   <td colSpan={5} className="px-4 py-6 text-center text-slate-400">Nenhum oficial nesta categoria.</td>
                                 </tr>
                               )}
                             </tbody>
                          </table>
                       </div>
                    )}
                 </div>
              );
           })}
        </div>
      </div>
    </div>
  );
}

