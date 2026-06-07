import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, UserPlus, Search, Save, X, Trash2, ArrowLeft, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useMilitars } from '../contexts/MilitarContext';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { cn, cleanUndefined, normalizeObm } from '../lib/utils';
import { UserProfile } from '../types';

export function GestaoEfetivoModeracaoModule({ user, onBack }: { user: UserProfile; onBack: () => void }) {
  const { militars, refreshMilitars } = useMilitars();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRg, setEditingRg] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [selectedObmFilter, setSelectedObmFilter] = useState<string>('TODOS');
  
  const [formData, setFormData] = useState({
    name: '',
    warName: '',
    rg: '',
    rank: 'SD',
    quadro: '',
    idFuncional: '',
    nascimento: '',
    endereco: '',
    cidade: '',
    cel: '',
    tel: '',
    email: '',
    situacao: 'ATIVO',
    bolMov: '',
    obm: '10º GBM',
    ala: '1',
  });

  const uniqueObms = useMemo(() => {
    const obms = new Set<string>();
    militars.forEach(m => {
      obms.add(normalizeObm(m.obm));
    });
    // Add terceirizados if not there
    obms.add('TERCEIRIZADOS');
    return Array.from(obms).sort();
  }, [militars]);

  const filteredMilitars = useMemo(() => {
    return militars.filter(m => {
      const matchObm = selectedObmFilter === 'TODOS' || normalizeObm(m.obm) === selectedObmFilter;
      
      const s = searchTerm.toLowerCase();
      const matchSearch = (m.name || '').toLowerCase().includes(s) || 
             (m.warName || '').toLowerCase().includes(s) || 
             (m.rg || '').toLowerCase().includes(s) ||
             (m.quadro || '').toLowerCase().includes(s) ||
             (m.cidade || '').toLowerCase().includes(s) ||
             (m.situacao || '').toLowerCase().includes(s);
      return matchObm && matchSearch;
    });
  }, [militars, searchTerm, selectedObmFilter]);

  const handleOpenNew = () => {
    setFormData({
      name: '',
      warName: '',
      rg: '',
      rank: 'SD',
      quadro: '',
      idFuncional: '',
      nascimento: '',
      endereco: '',
      cidade: '',
      cel: '',
      tel: '',
      email: '',
      situacao: 'ATIVO',
      bolMov: '',
      obm: '10º GBM',
      ala: '1',
    });
    setEditingRg(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (m: any) => {
    setFormData({
      name: m.name || '',
      warName: m.warName || '',
      rg: m.rg || '',
      rank: m.rank || 'SD',
      quadro: m.quadro || '',
      idFuncional: m.idFuncional || '',
      nascimento: m.nascimento || m.birthDate || '',
      endereco: m.endereco || '',
      cidade: m.cidade || '',
      cel: m.cel || '',
      tel: m.tel || '',
      email: m.email || '',
      situacao: m.situacao || 'ATIVO',
      bolMov: m.bolMov || '',
      obm: m.obm ? String(m.obm) : '10º GBM',
      ala: m.ala ? String(m.ala) : '1',
    });
    setEditingRg(m.rg || null);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!formData.rg || !formData.name) {
       alert("RG e Nome são obrigatórios.");
       return;
    }
    
    // Server expects normalized RG
    const cleanRg = formData.rg.replace(/[^A-Za-z0-9]/g, '').replace(/^0+/, '').toUpperCase();
    if (!cleanRg) return;

    try {
      const dbDoc = doc(db, 'militaries', cleanRg);
      const toSave = {
        ...formData,
        rg: cleanRg,
        name: formData.name.toUpperCase(),
        warName: formData.warName.toUpperCase(),
        rank: formData.rank.toUpperCase(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(dbDoc, cleanUndefined(toSave), { merge: true });
      
      // Request backend to refresh cache
      await fetch('/api/admin/militaries/bulk-sync', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ militaries: [toSave] })
      }).catch(err => console.warn('Cache sync errored', err));
      
      setIsFormOpen(false);
      refreshMilitars();
    } catch (e: any) {
      alert("Erro ao salvar: " + e.message);
    }
  };

  const handleDelete = async (rg: string) => {
    if (window.confirm("ATENÇÃO: Deseja realmente excluir este militar permanentemente do sistema?")) {
      try {
        const cleanRg = rg.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        await deleteDoc(doc(db, 'militaries', cleanRg));
        refreshMilitars();
      } catch (e: any) {
        alert("Erro ao excluir: " + e.message);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-700" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Gestão de Efetivo - Moderação</h1>
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest">Cadastro Completo</p>
            </div>
          </div>
        </div>
        <button 
          onClick={handleOpenNew}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Militar
        </button>
      </div>

      <div className="p-6 md:p-8 overflow-y-auto w-full max-w-7xl mx-auto flex-1 flex flex-col gap-6">
         <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
           <div className="relative flex-1 w-full">
             <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
             <input 
               type="text" 
               placeholder="Buscar por nome, rg, quadro, cidade, situação..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase transition-all"
             />
           </div>
           <div className="w-full sm:w-auto relative">
             <select
               value={selectedObmFilter}
               onChange={(e) => setSelectedObmFilter(e.target.value)}
               className="w-full sm:w-64 appearance-none pr-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase transition-all"
             >
               <option value="TODOS">TODOS OS OBMs</option>
               {uniqueObms.map(o => (
                 <option key={o} value={o}>{o}</option>
               ))}
             </select>
             <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
           </div>
           <div className="text-xs font-black text-slate-500 bg-slate-100 px-6 py-3 rounded-xl border border-slate-200 uppercase tracking-widest whitespace-nowrap">
             {filteredMilitars.length} Registros
           </div>
         </div>

         <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="overflow-x-auto h-full max-h-[60vh] flex-1">
              <table className="w-full text-left text-[11px] sm:text-xs font-bold uppercase tracking-widest relative">
                 <thead className="sticky top-0 bg-white z-10 shadow-sm">
                   <tr className="text-slate-500 border-b border-slate-200">
                     <th className="px-4 py-4 border-r border-slate-100 w-10 text-center"></th>
                     <th className="px-4 py-4 border-r border-slate-100 w-12 text-center">Nº</th>
                     <th className="px-4 py-4 border-r border-slate-100">Posto/Grad</th>
                     <th className="px-4 py-4 border-r border-slate-100 w-24">RG</th>
                     <th className="px-4 py-4 border-r border-slate-100">Nome Completo</th>
                     <th className="px-4 py-4 border-r border-slate-100">Quadro</th>
                     <th className="px-4 py-4 border-r border-slate-100 w-32">Situação</th>
                     <th className="px-4 py-4 border-r border-slate-100 w-24 text-center">Ala</th>
                     <th className="px-4 py-4 w-32 text-center">Ações</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {filteredMilitars.map((m: any, idx) => (
                     <React.Fragment key={m.rg}>
                       <tr className={cn("hover:bg-indigo-50/50 transition-colors group cursor-pointer", expandedRow === m.rg && "bg-indigo-50/30")} onClick={() => setExpandedRow(expandedRow === m.rg ? null : (m.rg || null))}>
                         <td className="px-4 py-4 border-r border-slate-100 text-center text-slate-400">
                           {expandedRow === m.rg ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                         </td>
                         <td className="px-4 py-4 border-r border-slate-100 text-center text-slate-400">{idx + 1}</td>
                         <td className="px-4 py-4 border-r border-slate-100 text-slate-700 whitespace-nowrap">{m.rank}</td>
                         <td className="px-4 py-4 border-r border-slate-100 text-indigo-600 font-black">{m.rg}</td>
                         <td className="px-4 py-4 border-r border-slate-100 text-slate-800" title={m.name}>{m.name?.substring(0, 30)}{m.name?.length > 30 ? "..." : ""}</td>
                         <td className="px-4 py-4 border-r border-slate-100 text-slate-600">{m.quadro || '-'}</td>
                         <td className="px-4 py-4 border-r border-slate-100 text-slate-600 whitespace-nowrap">
                            <span className={cn("px-2 py-1 rounded", (m.situacao || 'ATIVO').includes('ATIVO') ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                              {m.situacao || 'ATIVO'}
                            </span>
                         </td>
                         <td className="px-4 py-4 border-r border-slate-100 text-center text-slate-600">{m.ala}</td>
                         <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                           <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => handleOpenEdit(m)}
                                className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded flex items-center gap-1 hover:bg-slate-200 hover:text-indigo-600 transition-colors text-[9px] font-black uppercase"
                              >
                                 Editar
                              </button>
                              <button 
                                onClick={() => m.rg && handleDelete(m.rg)}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                         </td>
                       </tr>
                       {expandedRow === m.rg && (
                         <tr className="bg-slate-50/50 border-b-2 border-slate-200">
                           <td colSpan={9} className="px-8 py-6">
                             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 text-[10px] sm:text-xs">
                                <div><span className="text-slate-400 block mb-1">Nome Completo:</span> <span className="text-slate-700 font-black">{m.name || '-'}</span></div>
                                <div><span className="text-slate-400 block mb-1">Nome de Guerra:</span> <span className="text-slate-700 font-black">{m.warName || '-'}</span></div>
                                <div><span className="text-slate-400 block mb-1">ID Funcional:</span> <span className="text-slate-700 font-black">{m.idFuncional || '-'}</span></div>
                                <div><span className="text-slate-400 block mb-1">Nascimento:</span> <span className="text-slate-700 font-black">{m.nascimento || m.birthDate || '-'}</span></div>
                                <div><span className="text-slate-400 block mb-1">Endereço:</span> <span className="text-slate-700 font-black">{m.endereco || '-'}</span></div>
                                <div><span className="text-slate-400 block mb-1">Cidade:</span> <span className="text-slate-700 font-black">{m.cidade || '-'}</span></div>
                                <div><span className="text-slate-400 block mb-1">Celular:</span> <span className="text-slate-700 font-black">{m.cel || '-'}</span></div>
                                <div><span className="text-slate-400 block mb-1">Telefone:</span> <span className="text-slate-700 font-black">{m.tel || '-'}</span></div>
                                <div><span className="text-slate-400 block mb-1">E-mail:</span> <span className="text-slate-700 font-black lowercase">{m.email || '-'}</span></div>
                                <div><span className="text-slate-400 block mb-1">Bol. Movimentação:</span> <span className="text-slate-700 font-black">{m.bolMov || '-'}</span></div>
                                <div><span className="text-slate-400 block mb-1">OBM Principal:</span> <span className="text-slate-700 font-black">{m.obm || '-'}</span></div>
                             </div>
                           </td>
                         </tr>
                       )}
                     </React.Fragment>
                   ))}
                   {filteredMilitars.length === 0 && (
                     <tr>
                       <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                         <Users className="w-8 h-8 opacity-20 mx-auto mb-2" />
                         Nenhum militar encontrado.
                       </td>
                     </tr>
                   )}
                 </tbody>
              </table>
            </div>
         </div>
      </div>

      {/* Cadastrar/Editar Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-full"
            >
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 p-2 rounded-lg">
                    {editingRg ? <Users className="w-5 h-5 text-indigo-700" /> : <UserPlus className="w-5 h-5 text-indigo-700" />}
                  </div>
                  <div>
                     <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">{editingRg ? 'Editar Perfil Completo' : 'Cadastrar Novo Militar'}</h2>
                  </div>
                </div>
                <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-200 text-slate-500 rounded-lg transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                    {/* Identification */}
                    <div className="col-span-1 sm:col-span-2 md:col-span-3 border-b border-slate-100 pb-2 mb-2">
                       <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600">Identificação</h3>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">RG *</label>
                      <input 
                         type="text" 
                         value={formData.rg}
                         onChange={(e) => setFormData(prev => ({...prev, rg: e.target.value}))}
                         disabled={!!editingRg}
                         className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:bg-slate-50"
                         placeholder="Ex: 54444"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">ID Funcional</label>
                      <input 
                         type="text" 
                         value={formData.idFuncional}
                         onChange={(e) => setFormData(prev => ({...prev, idFuncional: e.target.value}))}
                         className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Posto/Graduação</label>
                      <input 
                         type="text" 
                         value={formData.rank}
                         onChange={(e) => setFormData(prev => ({...prev, rank: e.target.value}))}
                         className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                         placeholder="Ex: MAJ, CAP, SGT..."
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Nome Completo *</label>
                      <input 
                         type="text" 
                         value={formData.name}
                         onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                         className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Nome de Guerra</label>
                      <input 
                         type="text" 
                         value={formData.warName}
                         onChange={(e) => setFormData(prev => ({...prev, warName: e.target.value}))}
                         className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Quadro</label>
                      <input 
                         type="text" 
                         value={formData.quadro}
                         onChange={(e) => setFormData(prev => ({...prev, quadro: e.target.value}))}
                         className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                         placeholder="Ex: QOC/11, Q00/98"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Data Nascimento</label>
                      <input 
                         type="text" 
                         value={formData.nascimento}
                         onChange={(e) => setFormData(prev => ({...prev, nascimento: e.target.value}))}
                         className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                         placeholder="DD/MM/AAAA"
                      />
                    </div>

                    {/* Contact details */}
                    <div className="col-span-1 sm:col-span-2 md:col-span-3 border-b border-slate-100 pb-2 mb-2 mt-4">
                       <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600">Contato & Localização</h3>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Endereço</label>
                      <input 
                         type="text" 
                         value={formData.endereco}
                         onChange={(e) => setFormData(prev => ({...prev, endereco: e.target.value}))}
                         className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Cidade</label>
                      <input 
                         type="text" 
                         value={formData.cidade}
                         onChange={(e) => setFormData(prev => ({...prev, cidade: e.target.value}))}
                         className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Celular</label>
                      <input 
                         type="text" 
                         value={formData.cel}
                         onChange={(e) => setFormData(prev => ({...prev, cel: e.target.value}))}
                         className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Telefone / Fixo</label>
                      <input 
                         type="text" 
                         value={formData.tel}
                         onChange={(e) => setFormData(prev => ({...prev, tel: e.target.value}))}
                         className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">E-mail</label>
                      <input 
                         type="email" 
                         value={formData.email}
                         onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                         className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Operational data */}
                    <div className="col-span-1 sm:col-span-2 md:col-span-3 border-b border-slate-100 pb-2 mb-2 mt-4">
                       <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600">Dados Operacionais</h3>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Situação Militar (Afastamento/Férias/Ativo)</label>
                      <input 
                         type="text" 
                         value={formData.situacao}
                         onChange={(e) => setFormData(prev => ({...prev, situacao: e.target.value}))}
                         className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Bol. Movimentação</label>
                      <input 
                         type="text" 
                         value={formData.bolMov}
                         onChange={(e) => setFormData(prev => ({...prev, bolMov: e.target.value}))}
                         className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">OBM Principal</label>
                      <input 
                         type="text" 
                         list="unique-obms"
                         value={formData.obm}
                         onChange={(e) => setFormData(prev => ({...prev, obm: e.target.value}))}
                         className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                         placeholder="Ex: 10º GBM"
                      />
                      <datalist id="unique-obms">
                        {uniqueObms.map(o => (
                          <option key={"dl-"+o} value={o} />
                        ))}
                      </datalist>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Ala / Escala</label>
                      <input 
                         type="text" 
                         value={formData.ala}
                         onChange={(e) => setFormData(prev => ({...prev, ala: e.target.value}))}
                         className="w-full border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 uppercase"
                         placeholder="Ex: 1, 2, 3, 4, EXP"
                      />
                    </div>


                 </div>
              </div>
              
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-3 shrink-0">
                 <button 
                   onClick={() => setIsFormOpen(false)}
                   className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-colors"
                 >
                   Cancelar
                 </button>
                 <button 
                   onClick={handleSave}
                   className="px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                 >
                   <Save className="w-4 h-4" />
                   {editingRg ? 'Salvar Alterações' : 'Cadastrar'}
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

