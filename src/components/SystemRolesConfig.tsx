import React, { useState, useMemo } from 'react';
import { Search, ShieldAlert, CheckSquare, Square, Loader2, Settings, X, Tag } from 'lucide-react';
import { useMilitars } from '../contexts/MilitarContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { OBM_HIERARCHY } from '../constants';
import { cleanUndefined } from "../lib/utils";

function normalizeRg(rg: string | number) {
  if (!rg) return '';
  return String(rg).replace(/^0+/, '').replace(/\D/g, '');
}


function RoleConfigModal({ 
  militar, 
  onClose, 
  onSave 
}: { 
  militar: any; 
  onClose: () => void; 
  onSave: (updates: any) => void;
}) {
  const [isAdmin, setIsAdmin] = useState(militar.isAdmin || false);
  const [adminObms, setAdminObms] = useState<string[]>(militar.adminObms || []);

  const [isEscalante, setIsEscalante] = useState(militar.isEscalante || false);
  const [escalanteObms, setEscalanteObms] = useState<string[]>(militar.escalanteObms || []);

  const [isRefeitorioAdmin, setIsRefeitorioAdmin] = useState(militar.isRefeitorioAdmin || false);

  const obms = Object.keys(OBM_HIERARCHY);

  const toggleArray = (arr: string[], val: string, setter: any) => {
     if (arr.includes(val)) setter(arr.filter(x => x !== val));
     else setter([...arr, val]);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-indigo-50 flex items-center justify-center rounded-2xl text-indigo-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-slate-800 uppercase tracking-tight">{militar.rank} {militar.name}</h3>
            <p className="text-[10px] font-bold text-slate-400 font-mono uppercase">Configuração de Permissões</p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
           {/* Admin Section */}
           <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 relative">
              <h4 className="text-xs font-black text-indigo-800 uppercase tracking-widest mb-4">Administrador</h4>
              
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200/50">
                 <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Acesso Global (Todas as OBMs)</span>
                 <button 
                    onClick={() => setIsAdmin(!isAdmin)}
                    className={cn("p-1.5 rounded-lg transition-colors border", isAdmin ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-300 text-slate-300")}
                 >
                    {isAdmin ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                 </button>
              </div>

              {!isAdmin && (
                 <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unidades Específicas (Admin Regional)</span>
                    <div className="flex flex-wrap gap-2">
                       {obms.map(o => (
                          <button
                            key={o}
                            onClick={() => toggleArray(adminObms, o, setAdminObms)}
                            className={cn("px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all", 
                              adminObms.includes(o) ? "bg-indigo-100 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100")}
                          >
                            {o}
                          </button>
                       ))}
                    </div>
                 </div>
              )}
           </div>

           {/* Escalante Section */}
           <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 relative">
              <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest mb-4">Escalante</h4>
              
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200/50">
                 <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Escalante Global</span>
                 <button 
                    onClick={() => setIsEscalante(!isEscalante)}
                    className={cn("p-1.5 rounded-lg transition-colors border", isEscalante ? "bg-emerald-600 border-emerald-600 text-white" : "bg-white border-slate-300 text-slate-300")}
                 >
                    {isEscalante ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                 </button>
              </div>

              {!isEscalante && (
                 <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unidades Específicas (Escalante Regional)</span>
                    <div className="flex flex-wrap gap-2">
                       {obms.map(o => (
                          <button
                            key={o}
                            onClick={() => toggleArray(escalanteObms, o, setEscalanteObms)}
                            className={cn("px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all", 
                              escalanteObms.includes(o) ? "bg-emerald-100 border-emerald-200 text-emerald-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-100")}
                          >
                            {o}
                          </button>
                       ))}
                    </div>
                 </div>
              )}
           </div>

           {/* Refeitorio Admin Section */}
           <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 relative">
              <h4 className="text-xs font-black text-rose-800 uppercase tracking-widest mb-4">Administração Refeitório</h4>
              
              <div className="flex items-center justify-between">
                 <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Gestor do Refeitório</span>
                 <button 
                    onClick={() => setIsRefeitorioAdmin(!isRefeitorioAdmin)}
                    className={cn("p-1.5 rounded-lg transition-colors border", isRefeitorioAdmin ? "bg-rose-600 border-rose-600 text-white" : "bg-white border-slate-300 text-slate-300")}
                 >
                    {isRefeitorioAdmin ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                 </button>
              </div>
           </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
           <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors">Cancelar</button>
           <button onClick={() => onSave({ isAdmin, adminObms, isEscalante, escalanteObms, isRefeitorioAdmin })} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-colors">Salvar Configurações</button>
        </div>
      </div>
    </div>
  );
}

export function SystemRolesConfig() {
  const { militars, refreshMilitars, updateMilitarLocal } = useMilitars();
  const [search, setSearch] = useState('');
  const [selectedObm, setSelectedObm] = useState<string>('Todos');
  const [showOnlyPrivileged, setShowOnlyPrivileged] = useState(true);
  const [processingRg, setProcessingRg] = useState<string | null>(null);
  const [configuringRg, setConfiguringRg] = useState<string | null>(null);

  const availableObms = useMemo(() => {
    const obms = new Set<string>();
    militars.forEach(m => {
      if (m.obm) obms.add(m.obm);
    });
    Object.keys(OBM_HIERARCHY).forEach(k => obms.add(k));
    return Array.from(obms).sort();
  }, [militars]);

  const filteredMilitars = useMemo(() => {
    return militars.filter(m => {
       // Filter by Privileged Roles
       const isPriv = m.isAdmin || m.isEscalante || m.isRefeitorioAdmin || (m.adminObms && m.adminObms.length > 0) || (m.escalanteObms && m.escalanteObms.length > 0);
       
       if (showOnlyPrivileged && !search && selectedObm === 'Todos') {
         if (!isPriv) return false;
       }
       if (showOnlyPrivileged && (selectedObm !== 'Todos' || search)) { // If checking specifically but with filter
         const s = search.toLowerCase();
         const isSearchMatch = search && ((m.name || '').toLowerCase().includes(s) || m.rg?.includes(search));
         if (!isPriv && !isSearchMatch) {
            return false;
         }
       }

       // Filter by OBM
       if (selectedObm !== 'Todos' && m.obm !== selectedObm) return false;

       // Filter by Search
       if (search) {
         const s = search.toLowerCase();
         if (!(m.name || '').toLowerCase().includes(s) && !m.rg?.includes(search)) return false;
       }

       return true;
    }).sort((a, b) => {
       if (a.obm !== b.obm) return (a.obm || '').localeCompare(b.obm || '');
       return (a.name || '').localeCompare(b.name || '');
    }).slice(0, 100);
  }, [militars, search, selectedObm, showOnlyPrivileged]);

  // Group by OBM for display
  const groupedMilitars = useMemo(() => {
    const groups: Record<string, typeof filteredMilitars> = {};
    filteredMilitars.forEach(m => {
       const obm = m.obm || 'Sem OBM';
       if (!groups[obm]) groups[obm] = [];
       groups[obm].push(m);
    });
    return groups;
  }, [filteredMilitars]);

  const saveRoles = async (rg: string, updates: any) => {
     if (!rg) return;
     setProcessingRg(rg);
     setConfiguringRg(null);
     
     updateMilitarLocal(rg, updates);
     
     try {
       const safeRg = normalizeRg(rg);
       
       const promises = Object.keys(updates).map(k => 
         fetch('/api/militar/role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rg, role: k, value: updates[k] })
         })
       );
       
       if (db) {
         try {
           await setDoc(doc(db, 'militaries', safeRg), cleanUndefined(updates), { merge: true });
         } catch(err) {
           console.warn('Failed writing to Firestore directly', err);
         }
       }
       
       await Promise.all(promises);
       
       setTimeout(() => {
          refreshMilitars(rg);
          setProcessingRg(null);
       }, 300);
     } catch (e) {
       console.error("Erro ao atualizar papeis", e);
       refreshMilitars(rg);
       setProcessingRg(null);
     }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            Gestão de Cargos e Perfis
          </h3>
          <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
            Atribua funções de Administração, Escalante e Refeitório ao efetivo
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
           <div className="flex gap-2 items-center bg-slate-100 p-1 rounded-xl">
             <button
               onClick={() => setShowOnlyPrivileged(true)}
               className={cn("px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors", showOnlyPrivileged ? "bg-white shadow text-indigo-600" : "text-slate-500 hover:text-slate-700")}
             >
               Com Cargos
             </button>
             <button
               onClick={() => setShowOnlyPrivileged(false)}
               className={cn("px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors", !showOnlyPrivileged ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700")}
             >
               Todos
             </button>
           </div>
           
           <select
             value={selectedObm}
             onChange={(e) => setSelectedObm(e.target.value)}
             className="px-3 py-2 border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest focus:border-indigo-400 outline-none transition-colors bg-white text-slate-700 whitespace-nowrap"
           >
             <option value="Todos">Todas as OBMs</option>
             {availableObms.map(obm => (
               <option key={obm} value={obm}>{obm}</option>
             ))}
           </select>

           <div className="relative w-full sm:w-72">
             <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
             <input
               type="text"
               placeholder="Busque por Nome ou RG..."
               value={search}
               onChange={e => setSearch(e.target.value)}
               className="w-full pl-9 pr-4 py-2 border-2 border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest focus:border-indigo-400 outline-none transition-colors"
             />
          </div>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
         <div className="max-h-[500px] overflow-y-auto">
            {Object.keys(groupedMilitars).length === 0 ? (
               <div className="p-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {search ? 'Nenhum militar encontrado com este nome ou RG.' : (!showOnlyPrivileged ? 'Nenhum militar encontrado.' : 'Nenhum militar com cargo no momento. Use a busca acima para encontrar um RG e adicionar.')}
               </div>
            ) : (
               <div className="flex flex-col">
                  {Object.entries(groupedMilitars).map(([obm, members]) => (
                     <div key={obm} className="flex flex-col">
                        <div className="bg-slate-100 px-4 py-2 border-y border-slate-200 sticky top-0 z-10 first:border-t-0 flex items-center justify-between">
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{obm}</span>
                           <span className="text-[9px] font-bold text-slate-400">{members.length} Militares</span>
                        </div>
                        <table className="w-full text-left">
                           <thead className="bg-slate-50/50 hidden">
                              <tr>
                                 <th className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500">Militar</th>
                                 <th className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center w-28">Escalante</th>
                                 <th className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center w-28">Administração</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                               {members.map(m => (
                                  <tr key={m.rg} className="hover:bg-indigo-50/30 transition-colors">
                                     <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                           <div className="flex flex-col">
                                              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">{m.rank} {m.name}</span>
                                              <span className="text-[9px] font-bold text-slate-400 font-mono">{m.rg}</span>
                                           </div>
                                           <div className="flex flex-wrap gap-1 mt-1">
                                              {m.isAdmin && <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Admin Global</span>}
                                              {m.isEscalante && <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Escalante Global</span>}
                                              {m.isRefeitorioAdmin && <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Admin Rancho</span>}
                                              {m.adminObms?.map(o => <span key={o} className="bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Admin: {o}</span>)}
                                              {m.escalanteObms?.map(o => <span key={o} className="bg-emerald-50 text-emerald-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Escalante: {o}</span>)}
                                           </div>
                                        </div>
                                     </td>
                                     <td className="px-4 py-3 text-right" colSpan={2}>
                                        <button 
                                          onClick={() => setConfiguringRg(m.rg || null)}
                                          disabled={processingRg === m.rg}
                                          className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors inline-flex items-center gap-2", 
                                            processingRg === m.rg ? "bg-slate-100 text-slate-400" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100")}
                                        >
                                           {processingRg === m.rg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                                           Configurar
                                        </button>
                                     </td>
                                  </tr>
                               ))}
                            </tbody>
                        </table>
                     </div>
                  ))}
               </div>
            )}
         </div>
      </div>

      {configuringRg && (
         <RoleConfigModal 
           militar={militars.find(m => m.rg === configuringRg)} 
           onClose={() => setConfiguringRg(null)}
           onSave={(updates) => saveRoles(configuringRg, updates)}
         />
      )}
    </div>
  );
}

