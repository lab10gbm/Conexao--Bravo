import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Save, MoveUp, MoveDown, Layout, Type, Layers, Users, UserPlus, Search, Info } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, setDoc, collection, onSnapshot, getDocs, deleteDoc } from 'firebase/firestore';
import { DEFAULT_SOP_SCHEMA } from '../constants';
import { UserProfile } from '../types';
import { cleanUndefined } from "../lib/utils";

interface SopField {
  id: string;
  label: string;
  type?: 'letter' | 'number' | 'unique' | 'text';
}

interface SopArea {
  id: string;
  label: string;
  fields: SopField[];
  targetQBMPs?: string;
  targetRGs?: string;
}

interface SopConfig {
  areas: SopArea[];
}

export function SopConfigModule({ user, onBack }: { user: UserProfile, onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'schema' | 'roster'>('schema');
  const [config, setConfig] = useState<SopConfig>({ areas: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Roster Management State
  const [roster, setRoster] = useState<any[]>([]);
  const [rosterSearch, setRosterSearch] = useState('');
  const [newMilitar, setNewMilitar] = useState({ rg: '', name: '', quadro: 'QBMP 1', rank: 'SD' });

  useEffect(() => {
    setLoading(true);
    let unsubConfig = () => {};
    let unsubRoster = () => {};

    // Load Schema with onSnapshot
    unsubConfig = onSnapshot(doc(db, 'config', 'sop_schema'), (snap) => {
      if (snap.exists()) {
        const loadedConfig = snap.data() as SopConfig;
        // Merge fallback EPI if it doesn't exist
        if (!loadedConfig.areas.some(a => a.id === 'epi')) {
           loadedConfig.areas.push({
              id: 'epi',
              label: 'Carga EPI',
              fields: [
                { id: 'capaceteIncendio', label: 'Cap Incêndio', type: 'text' },
                { id: 'jaquetaCalca', label: 'Jaq & Calça', type: 'text' },
                { id: 'luvaVaqueta', label: 'Luva Vaqueta', type: 'text' },
                { id: 'capaceteSalvamento', label: 'Cap Salvamento', type: 'text' },
                { id: 'balaclava', label: 'Balaclava', type: 'text' },
                { id: 'capaChuva', label: 'Capa Chuva', type: 'text' },
                { id: 'luvaAp', label: 'Luva AP', type: 'text' },
                { id: 'coturnoAp', label: 'Coturno AP', type: 'text' },
                { id: 'oculosAbrasao', label: 'Óculos Abr.', type: 'text' },
                { id: 'camisaLycra', label: 'Lycra', type: 'text' },
                { id: 'oculosSolar', label: 'Óculos Sol', type: 'text' },
                { id: 'garrafaTermica', label: 'Garrafa T.', type: 'text' },
                { id: 'apito', label: 'Apito', type: 'text' }
              ]
            });
        }
        setConfig(loadedConfig);
      } else {
        setConfig(DEFAULT_SOP_SCHEMA);
      }
      setLoading(false); // Can put loading false here conceptually
    });

    // Load Roster with onSnapshot
    unsubRoster = onSnapshot(collection(db, 'sop_roster'), (rosterSnap) => {
      const rosterData = rosterSnap.docs.map(d => ({ ...d.data(), docId: d.id }));
      setRoster(rosterData);
    });

    return () => {
      unsubConfig();
      unsubRoster();
    };
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'config', 'sop_schema'), cleanUndefined(config));
      alert('Configuração salva com sucesso!');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Erro ao salvar configuração.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMilitar = async () => {
    if (!newMilitar.rg || !newMilitar.name) {
      alert('RG e Nome são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const docId = newMilitar.rg.padStart(5, '0');
      const militarData = {
        rg: docId,
        name: newMilitar.name.toUpperCase(),
        warName: newMilitar.name.split(' ')[0].toUpperCase(),
        quadro: newMilitar.quadro,
        rank: newMilitar.rank,
        isCustom: true
      };
      await setDoc(doc(db, 'sop_roster', docId), cleanUndefined(militarData));
      setRoster(prev => [...prev.filter(r => r.rg !== docId), { ...militarData, docId }]);
      setNewMilitar({ rg: '', name: '', quadro: 'QBMP 1', rank: 'SD' });
    } catch (e) {
      console.error(e);
      alert('Erro ao adicionar militar');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMilitar = async (docId: string) => {
    if (!confirm('Deseja remover este militar da lista extra?')) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'sop_roster', docId));
      setRoster(prev => prev.filter(r => r.docId !== docId));
    } catch (e) {
      alert('Erro ao remover');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (areaId: string, fieldId: string, updates: Partial<SopField>) => {
    setConfig(prev => ({
      ...prev,
      areas: prev.areas.map(a => a.id === areaId ? { 
        ...a, 
        fields: a.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f) 
      } : a)
    }));
  };

  const addArea = () => {
    const id = `area_${Date.now()}`;
    setConfig(prev => ({
      ...prev,
      areas: [...prev.areas, { id, label: 'Nova Área', fields: [] }]
    }));
  };

  const removeArea = (id: string) => {
    if (!confirm('Deseja remover esta área e todos os seus campos?')) return;
    setConfig(prev => ({
      ...prev,
      areas: prev.areas.filter(a => a.id !== id)
    }));
  };

  const updateAreaLabel = (id: string, label: string) => {
    setConfig(prev => ({
      ...prev,
      areas: prev.areas.map(a => a.id === id ? { ...a, label } : a)
    }));
  };

  const updateAreaSettings = (id: string, updates: Partial<SopArea>) => {
    setConfig(prev => ({
      ...prev,
      areas: prev.areas.map(a => a.id === id ? { ...a, ...updates } : a)
    }));
  };

  const addField = (areaId: string) => {
    const id = `field_${Date.now()}`;
    setConfig(prev => ({
      ...prev,
      areas: prev.areas.map(a => a.id === areaId ? { 
        ...a, 
        fields: [...a.fields, { id, label: 'Novo Campo', type: 'text' }] 
      } : a)
    }));
  };

  const removeField = (areaId: string, fieldId: string) => {
    setConfig(prev => ({
      ...prev,
      areas: prev.areas.map(a => a.id === areaId ? { 
        ...a, 
        fields: a.fields.filter(f => f.id !== fieldId) 
      } : a)
    }));
  };

  const updateFieldLabel = (areaId: string, fieldId: string, label: string) => {
    setConfig(prev => ({
      ...prev,
      areas: prev.areas.map(a => a.id === areaId ? { 
        ...a, 
        fields: a.fields.map(f => f.id === fieldId ? { ...f, label } : f) 
      } : a)
    }));
  };

  const moveArea = (index: number, direction: -1 | 1) => {
    const newAreas = [...config.areas];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newAreas.length) return;
    [newAreas[index], newAreas[targetIndex]] = [newAreas[targetIndex], newAreas[index]];
    setConfig(prev => ({ ...prev, areas: newAreas }));
  };

  const moveField = (areaIndex: number, fieldIndex: number, direction: -1 | 1) => {
    const newAreas = [...config.areas];
    const area = { ...newAreas[areaIndex] };
    const newFields = [...area.fields];
    const targetIndex = fieldIndex + direction;
    if (targetIndex < 0 || targetIndex >= newFields.length) return;
    [newFields[fieldIndex], newFields[targetIndex]] = [newFields[targetIndex], newFields[fieldIndex]];
    area.fields = newFields;
    newAreas[areaIndex] = area;
    setConfig(prev => ({ ...prev, areas: newAreas }));
  };

  const moveFieldToArea = (sourceAreaId: string, fieldId: string, targetAreaId: string) => {
    if (!targetAreaId) return;
    setConfig(prev => {
      const newAreas = [...prev.areas];
      const sourceAreaIndex = newAreas.findIndex(a => a.id === sourceAreaId);
      const targetAreaIndex = newAreas.findIndex(a => a.id === targetAreaId);
      
      if (sourceAreaIndex === -1 || targetAreaIndex === -1) return prev;
      
      const sourceArea = { ...newAreas[sourceAreaIndex] };
      const targetArea = { ...newAreas[targetAreaIndex] };
      
      const fieldIndex = sourceArea.fields.findIndex(f => f.id === fieldId);
      if (fieldIndex === -1) return prev;
      
      const field = sourceArea.fields[fieldIndex];
      
      sourceArea.fields = sourceArea.fields.filter(f => f.id !== fieldId);
      targetArea.fields = [...targetArea.fields, field];
      
      newAreas[sourceAreaIndex] = sourceArea;
      newAreas[targetAreaIndex] = targetArea;
      
      return { ...prev, areas: newAreas };
    });
  };

  if (loading) return <div className="p-20 text-center">
    <div className="flex flex-col items-center gap-6">
      <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
      <div className="font-black animate-pulse uppercase tracking-[0.3em] text-slate-400">Sincronizando Sistema de Gestão...</div>
    </div>
  </div>;

  return (
    <div className="flex flex-col gap-10 w-full max-w-6xl mx-auto pb-40">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex gap-6 items-center">
           <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl">
              <Layers className="w-8 h-8" />
           </div>
           <div>
              <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Painel Administrativo</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Configuração de Schema e Gerenciamento de Tropa</p>
           </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="flex items-center justify-center gap-3 px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          
          <button 
            onClick={handleSaveConfig}
            disabled={saving || activeTab !== 'schema'}
            className="flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-emerald-100 disabled:grayscale disabled:opacity-30"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Salvar Schema'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-3xl border border-slate-200 w-fit mx-auto lg:mx-0">
        <button 
          onClick={() => setActiveTab('schema')}
          className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'schema' ? 'bg-white shadow-lg text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Layout className="w-4 h-4" />
          Colunas e Campos
        </button>
        <button 
          onClick={() => setActiveTab('roster')}
          className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'roster' ? 'bg-white shadow-lg text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Users className="w-4 h-4" />
          Gestão de Tropa
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'schema' ? (
          <motion.div 
            key="schema"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-6"
          >
            <button 
              onClick={addArea}
              className="flex items-center justify-center gap-3 p-6 border-4 border-dashed border-slate-100 rounded-[2.5rem] text-slate-300 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50/50 transition-all font-black uppercase text-xs tracking-widest group"
            >
              <Plus className="w-5 h-5 group-hover:scale-125 transition-transform" />
              Criar Novo Grupo de Colunas
            </button>

            <div className="grid grid-cols-1 gap-8">
              {config.areas.map((area, aIdx) => (
                <div 
                  key={area.id}
                  className="bg-white border-2 border-slate-50 rounded-[3rem] p-10 shadow-sm relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-8 flex items-center gap-2">
                    <button onClick={() => moveArea(aIdx, -1)} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all"><MoveUp className="w-5 h-5" /></button>
                    <button onClick={() => moveArea(aIdx, 1)} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-all"><MoveDown className="w-5 h-5" /></button>
                    <button onClick={() => removeArea(area.id)} className="p-3 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all ml-2"><Trash2 className="w-5 h-5" /></button>
                  </div>

                  <div className="flex items-center gap-5 mb-6 max-w-xl">
                    <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
                      <Layout className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                      <input 
                        type="text"
                        value={area.label}
                        onChange={(e) => updateAreaLabel(area.id, e.target.value)}
                        className="w-full bg-transparent border-b-2 border-slate-100 focus:border-indigo-500 outline-none text-2xl font-black uppercase tracking-tight text-slate-800 py-1 transition-all"
                        placeholder="NOME DA ÁREA"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 bg-slate-50/50 p-6 rounded-[2rem] border-2 border-slate-100/50">
                    <div className="flex flex-col gap-2">
                       <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 pl-2">Destinar a QBMPs específicos (Opcional)</label>
                       <input 
                         type="text"
                         placeholder="Ex: Q08, Q10 (separados por vírgula)"
                         value={area.targetQBMPs || ''}
                         onChange={(e) => updateAreaSettings(area.id, { targetQBMPs: e.target.value })}
                         className="bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300"
                       />
                    </div>
                    <div className="flex flex-col gap-2">
                       <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 pl-2">Destinar a RGs específicos (Opcional)</label>
                       <input 
                         type="text"
                         placeholder="Ex: 12345, 67890 (separados por vírgula)"
                         value={area.targetRGs || ''}
                         onChange={(e) => updateAreaSettings(area.id, { targetRGs: e.target.value })}
                         className="bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300"
                       />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {area.fields.map((field, fIdx) => (
                      <div 
                        key={field.id}
                        className="flex flex-col gap-3 bg-slate-50/50 p-6 rounded-[2rem] border-2 border-transparent hover:border-slate-100 hover:bg-white transition-all group/field"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-300 shadow-sm border border-slate-50"><Type className="w-5 h-5" /></div>
                          <input 
                            type="text"
                            value={field.label}
                            onChange={(e) => updateFieldLabel(area.id, field.id, e.target.value)}
                            className="bg-transparent border-b border-transparent focus:border-indigo-300 outline-none text-xs font-black uppercase tracking-widest text-slate-700 flex-1"
                          />
                          <button onClick={() => removeField(area.id, field.id)} className="p-2 text-slate-200 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>

                         <div className="flex items-center gap-2 pt-2 border-t border-slate-100/50">
                           <select 
                             value={field.type || 'text'}
                             onChange={(e) => updateField(area.id, field.id, { type: e.target.value as any })}
                             className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none cursor-pointer"
                           >
                             <option value="text">Texto Livre</option>
                             <option value="letter">Letras (P/M/G...)</option>
                             <option value="number">Números (38/40...)</option>
                             <option value="unique">Tamanho Único</option>
                             <option value="status">Apenas Status</option>
                           </select>
                           <div className="flex-1" />
                           <select
                             value=""
                             onChange={(e) => moveFieldToArea(area.id, field.id, e.target.value)}
                             className="bg-white border border-slate-100 rounded-lg px-2 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400 focus:outline-none cursor-pointer max-w-[100px] truncate"
                           >
                             <option value="">👉 Mover...</option>
                             {config.areas.filter(a => a.id !== area.id).map(a => (
                               <option key={a.id} value={a.id}>{a.label}</option>
                             ))}
                           </select>
                           <div className="flex items-center gap-1">
                              <button onClick={() => moveField(aIdx, fIdx, -1)} className="p-2 text-slate-200 hover:text-indigo-600 bg-white rounded-lg border border-slate-100 shadow-sm"><MoveUp className="w-3.5 h-3.5" /></button>
                              <button onClick={() => moveField(aIdx, fIdx, 1)} className="p-2 text-slate-200 hover:text-indigo-600 bg-white rounded-lg border border-slate-100 shadow-sm"><MoveDown className="w-3.5 h-3.5" /></button>
                           </div>
                        </div>
                      </div>
                    ))}
                    
                    <button 
                      onClick={() => addField(area.id)}
                      className="flex items-center justify-center gap-3 p-6 border-2 border-dashed border-slate-100 rounded-[2rem] text-slate-300 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50/30 transition-all font-black uppercase text-[10px] tracking-widest"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Campo
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="roster"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-8"
          >
            {/* New Militar Form */}
            <div className="bg-white border-2 border-slate-50 rounded-[2.5rem] p-10 shadow-sm">
               <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cadastro Individual</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Adicione militares extras ao sistema</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Registro Geral (RG)</label>
                    <input 
                      type="text" 
                      placeholder="00000"
                      value={newMilitar.rg}
                      onChange={e => setNewMilitar({...newMilitar, rg: e.target.value})}
                      className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Posto / Graduação</label>
                    <select 
                      value={newMilitar.rank}
                      onChange={e => setNewMilitar({...newMilitar, rank: e.target.value})}
                      className="bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none"
                    >
                      {['CORONEL', 'TEN CEL', 'MAJOR', 'CAPITÃO', '1º TEN', '2º TEN', 'SUBTEN', '1º SGT', '2º SGT', '3º SGT', 'CABO', 'SD'].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">Nome de Guerra</label>
                    <div className="flex gap-4">
                      <input 
                        type="text" 
                        placeholder="NOME COMPLETO"
                        value={newMilitar.name}
                        onChange={e => setNewMilitar({...newMilitar, name: e.target.value})}
                        className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                      />
                      <button 
                        onClick={handleAddMilitar}
                        disabled={saving}
                        className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50"
                      >
                         Adicionar
                      </button>
                    </div>
                  </div>
               </div>
            </div>

            {/* Roster List */}
            <div className="bg-white border-2 border-slate-50 rounded-[2.5rem] p-10 shadow-sm flex flex-col gap-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                      <Users className="w-5 h-5" />
                   </div>
                   <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Militares Cadastrados <span className="text-indigo-600 ml-2">({roster.length})</span></h3>
                </div>

                <div className="relative max-w-sm w-full">
                  <input 
                    type="text"
                    placeholder="Filtrar por RG ou Nome..."
                    value={rosterSearch}
                    onChange={e => setRosterSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-12 py-3.5 text-[11px] font-bold text-slate-600 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                </div>
              </div>

              <div className="bg-slate-50/50 rounded-3xl border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-slate-100">
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Posto</th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Nome</th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">RG</th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Origem</th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roster
                      .filter(r => (r.name || '').toLowerCase().includes(rosterSearch.toLowerCase()) || r.rg.includes(rosterSearch))
                      .map(r => (
                        <tr key={r.rg} className="hover:bg-white transition-colors group">
                           <td className="p-5">
                             <span className="bg-slate-100 text-slate-600 text-[9px] font-black px-2 py-1 rounded-md">{r.rank}</span>
                           </td>
                           <td className="p-5 text-[11px] font-bold text-slate-800 uppercase">{r.name}</td>
                           <td className="p-5 text-[11px] font-mono font-bold text-slate-400">{r.rg}</td>
                           <td className="p-5">
                             <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">Manual</span>
                           </td>
                           <td className="p-5 text-right">
                             <button 
                               onClick={() => handleRemoveMilitar(r.docId)}
                               className="p-3 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                             >
                               <Trash2 className="w-4 h-4" />
                             </button>
                           </td>
                        </tr>
                      ))}
                    {roster.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-20 text-center">
                          <div className="flex flex-col items-center gap-4 opacity-30 grayscale">
                             <Info className="w-10 h-10" />
                             <p className="text-[10px] font-black uppercase tracking-widest">Nenhum militar cadastrado manualmente</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
