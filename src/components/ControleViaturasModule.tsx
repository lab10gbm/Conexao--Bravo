import React, { useState, useEffect } from 'react';
import { Truck, Plus, Trash2, Save, RotateCcw, Edit2, Check, X } from 'lucide-react';
import { doc, onSnapshot, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface ControleViaturasModuleProps {
  obmContext: string;
}

export interface ViaturaConfig {
  id: string;
  vtr: string;
  ativa: boolean;
  obm?: string;
  tipo?: 'operacional' | 'administrativa';
  maritima?: boolean;
  condutor: boolean | null;
  g1: boolean | null;
  g2: boolean | null;
  g3: boolean | null;
  g4: boolean | null;
  cg: boolean | null;
  blocked: string[];
  customNames?: {
    condutor?: string;
    g1?: string;
    g2?: string;
    g3?: string;
    g4?: string;
    cg?: string;
  };
}

const OBM_OPTIONS = [
  "10º GBM",
  "DBM 1/10",
  "DBM 2/10",
  "DBM 3/10",
  "DBM 4/10",
  "26º GBM",
  "DBM 1/26"
];

const DEFAULT_VIATURAS: ViaturaConfig[] = [
  { id: "ABT-183", vtr: "ABT-183", ativa: true, obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: true, g3: true, g4: false, cg: true, blocked: [] },
  { id: "ABSL-152", vtr: "ABSL-152", ativa: true, obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: true, g3: false, g4: false, cg: true, blocked: [] },
  { id: "ASE-404", vtr: "ASE-404", ativa: true, obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "ARC-162", vtr: "ARC-162", ativa: true, obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: null, g3: null, g4: null, cg: null, blocked: ["g2", "g3", "g4", "cg"] },
  { id: "AR-583", vtr: "AR-583", ativa: true, obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: null, g2: null, g3: null, g4: null, cg: null, blocked: ["g1", "g2", "g3", "g4", "cg"] },
  { id: "L-09", vtr: "L-09", ativa: true, obm: "10º GBM", tipo: 'operacional', maritima: true, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "BIA-006", vtr: "BIA-006", ativa: true, obm: "10º GBM", tipo: 'operacional', maritima: true, condutor: true, g1: true, g2: true, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "BIA-013", vtr: "BIA-013", ativa: false, obm: "10º GBM", tipo: 'operacional', maritima: true, condutor: false, g1: false, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "ABT-12", vtr: "ABT-12", ativa: false, obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: false, g1: false, g2: false, g3: false, g4: false, cg: false, blocked: [] },
];

export function ControleViaturasModule({ obmContext }: ControleViaturasModuleProps) {
  const [viaturas, setViaturas] = useState<ViaturaConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingVtr, setEditingVtr] = useState<ViaturaConfig | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);

  useEffect(() => {
    if (!db || !obmContext) return;
    const docRef = doc(db, "obm_settings", obmContext);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().viaturas_config) {
        setViaturas(docSnap.data().viaturas_config);
      } else {
        setViaturas(DEFAULT_VIATURAS);
      }
      setLoading(false);
    }, (err) => {
      console.error("Erro ao buscar viaturas config:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [obmContext]);

  const handleSave = async () => {
    if (!obmContext) return;
    setSaving(true);
    try {
      const docRef = doc(db, "obm_settings", obmContext);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        await updateDoc(docRef, { viaturas_config: viaturas });
      } else {
        await setDoc(docRef, { viaturas_config: viaturas });
      }
    } catch (err) {
      console.error("Erro ao salvar viaturas:", err);
      alert("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefaults = () => {
    setViaturas(DEFAULT_VIATURAS);
    setConfirmRestore(false);
  };

  const toggleProperty = (vtrId: string, property: keyof ViaturaConfig) => {
    setViaturas(prev => prev.map(v => {
      if (v.id === vtrId) {
        if (property === 'ativa') {
          return { ...v, ativa: !v.ativa };
        }
        
        // Handle positions (condutor, g1, g2, g3, g4, cg)
        if (v.blocked.includes(property as string)) {
          // Blocked -> False
          const newBlocked = v.blocked.filter(p => p !== property);
          return { ...v, [property]: false, blocked: newBlocked };
        } else {
          const currentValue = v[property];
          if (currentValue === false) {
             // False -> True
             return { ...v, [property]: true };
          } else {
             // True -> Blocked
             const newBlocked = [...v.blocked, property as string];
             return { ...v, [property]: null, blocked: newBlocked };
          }
        }
      }
      return v;
    }));
  };

  const handleObmChange = (vtrId: string, newObm: string) => {
    setViaturas(prev => prev.map(v => v.id === vtrId ? { ...v, obm: newObm } : v));
  };

  const handleOpenAddVtr = () => {
    setEditingVtr({
      id: Date.now().toString(),
      vtr: '',
      ativa: true,
      obm: "10º GBM",
      tipo: 'operacional',
      maritima: false,
      condutor: false,
      g1: false,
      g2: false,
      g3: false,
      g4: false,
      cg: false,
      blocked: [],
      customNames: {}
    });
    setIsAdding(true);
  };

  const handleDeleteVtr = (id: string) => {
    setViaturas(prev => prev.filter(v => v.id !== id));
    setConfirmDeleteId(null);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">Carregando...</div>;
  }

  const renderTable = (viaturasList: ViaturaConfig[], title: string, subtitle: string) => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="bg-slate-800 border-b border-slate-700 p-3 px-4 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Truck className="w-4 h-4 text-slate-400" />
            {title}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">{subtitle}</p>
        </div>
        <span className="text-[10px] font-bold text-slate-300 bg-slate-700 px-2 py-0.5 rounded-full uppercase tracking-widest">
          Manual
        </span>
      </div>

      <div className="p-4 sm:p-6 bg-slate-50 relative overflow-x-auto">
        <table className="w-full text-left text-[10px] font-bold uppercase tracking-wider bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm min-w-[700px]">
          <thead className="bg-[#1e293b] text-white text-[11px]">
            <tr>
              <th className="p-3 px-2 border-b border-r border-[#334155] w-12 text-center" title="Ativar VTR?">
                Ativar
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-32">
                Viaturas
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-28">
                OBM
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-20">
                Situação
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-16">
                Condutor
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-12">
                G1
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-12">
                G2
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-12">
                G3
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-12">
                G4
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-12">
                CG
              </th>
              <th className="p-3 px-2 border-b border-[#334155] text-center w-24">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {viaturasList.map((vtr, idx) => (
              <tr key={vtr.id} className={cn("border-b border-slate-100 hover:bg-slate-50 transition-colors", idx % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                <td className="p-2 border-r border-slate-100 text-center">
                  <input
                    type="checkbox"
                    checked={vtr.ativa}
                    onChange={() => toggleProperty(vtr.id, 'ativa')}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </td>
                <td className="p-2 border-r border-slate-100 text-center font-black text-slate-800">
                  {vtr.vtr}
                </td>
                <td className="p-2 border-r border-slate-100 text-center">
                  <select
                    value={vtr.obm || "10º GBM"}
                    onChange={(e) => handleObmChange(vtr.id, e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[10px] font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
                  >
                    {OBM_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </td>
                <td className="p-2 border-r border-slate-100 text-center">
                  <button
                    onClick={() => toggleProperty(vtr.id, 'ativa')}
                    className={cn(
                      "px-3 py-1 rounded w-full text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer border",
                      vtr.ativa
                        ? "bg-[#354f3e] text-white border-[#2c4234] hover:bg-[#2c4234]"
                        : "bg-[#e8cbb6] text-[#8b5a36] border-[#d4b59f] hover:bg-[#d4b59f]"
                    )}
                  >
                    {vtr.ativa ? 'Ativa' : 'Inativa'}
                  </button>
                </td>
                
                {['condutor', 'g1', 'g2', 'g3', 'g4', 'cg'].map((prop) => {
                  const isBlocked = vtr.blocked.includes(prop);
                  const isChecked = vtr[prop as keyof ViaturaConfig] === true;
                  
                  return (
                    <td 
                      key={prop} 
                      className={cn(
                        "p-2 border-r border-slate-100 text-center cursor-pointer transition-colors",
                        isBlocked && "bg-[#525e6e] hover:bg-[#475261]"
                      )}
                      onClick={() => toggleProperty(vtr.id, prop as keyof ViaturaConfig)}
                      title="Clique para alternar: Desmarcado -> Selecionado -> Bloqueado"
                    >
                      {!isBlocked && (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none"
                        />
                      )}
                    </td>
                  );
                })}
                
                <td className="p-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => {
                        setEditingVtr(vtr);
                        setIsAdding(false);
                      }}
                      className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Editar viatura"
                    >
                      <Edit2 className="w-4 h-4 mx-auto" />
                    </button>
                    {confirmDeleteId === vtr.id ? (
                      <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                        <button
                          onClick={() => handleDeleteVtr(vtr.id)}
                          className="p-1.5 text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
                          title="Confirmar exclusão"
                        >
                          <Check className="w-4 h-4 mx-auto" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="p-1.5 text-slate-500 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
                          title="Cancelar"
                        >
                          <X className="w-4 h-4 mx-auto" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(vtr.id)}
                        className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remover viatura"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {viaturasList.length === 0 && (
              <tr>
                <td colSpan={11} className="p-8 text-center text-slate-400 font-bold">
                  Nenhuma viatura cadastrada nesta categoria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );


  return (
    <div className="flex flex-col gap-6">
      {editingVtr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button 
              onClick={() => {
                setEditingVtr(null);
                setIsAdding(false);
              }}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-800 mb-4">
              {isAdding ? "Adicionar Viatura" : "Editar Viatura"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Nome da Viatura</label>
                <input 
                  type="text" 
                  value={editingVtr.vtr}
                  onChange={(e) => setEditingVtr({...editingVtr, vtr: e.target.value.toUpperCase()})}
                  className="w-full p-2 mt-1 border border-slate-200 rounded-xl uppercase font-bold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                  placeholder="Ex: ABT-999"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Tipo</label>
                  <select 
                    value={editingVtr.tipo || 'operacional'}
                    onChange={(e) => setEditingVtr({...editingVtr, tipo: e.target.value as 'operacional' | 'administrativa'})}
                    className="w-full p-2 mt-1 border border-slate-200 rounded-xl uppercase font-bold bg-white text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                  >
                    <option value="operacional">Operacional</option>
                    <option value="administrativa">Administrativa</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 p-2 px-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors h-[42px] mb-[1px]">
                    <input
                      type="checkbox"
                      checked={editingVtr.maritima || false}
                      onChange={e => setEditingVtr({...editingVtr, maritima: e.target.checked})}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700 uppercase">Marítima</span>
                  </label>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-black uppercase text-slate-700 mb-2">Nomes Customizados das Funções</h3>
                <p className="text-[10px] text-slate-400 mb-4">
                  O texto escrito será somado à sigla da viatura. Ex: (ABT-999) a função de G1 preenchida como "AUXILIAR" será lida como "AUXILIAR ABT". O chefe preenchido como "CHEFE" será lido como "CHEFE-ABT". Se deixado em branco, o sistema usará o nome padrão.
                </p>
                
                {['condutor', 'g1', 'g2', 'g3', 'g4', 'cg'].map(slot => {
                  if (editingVtr.blocked.includes(slot)) return null;
                  
                  let ph = slot.toUpperCase();
                  if (slot === 'condutor') ph = 'CONDUTOR, MESTRE, OPERADOR, ETC';
                  else if (slot === 'g1') ph = 'AUXILIAR, MARINHEIRO, ENFERMEIRO';
                  else if (['g2', 'g3', 'g4'].includes(slot)) ph = 'AUXILIAR, MARINHEIRO, ETC';
                  else if (slot === 'cg') ph = 'CHEFE';

                  return (
                    <div key={slot} className="mb-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Nome p/ {slot === 'cg' ? 'Chefe Guarnição' : slot}</label>
                      <input 
                        type="text" 
                        value={editingVtr.customNames?.[slot as keyof typeof editingVtr.customNames] || ''}
                        onChange={(e) => {
                          const newNames = { ...(editingVtr.customNames || {}) };
                          newNames[slot as keyof typeof newNames] = e.target.value.toUpperCase();
                          setEditingVtr({...editingVtr, customNames: newNames});
                        }}
                        placeholder={`Ex: ${ph}`}
                        className="w-full p-2 mt-1 bg-slate-50 border border-slate-200 rounded-lg text-xs uppercase outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  if (!editingVtr.vtr.trim()) {
                    alert("O nome da viatura é obrigatório.");
                    return;
                  }
                  if (viaturas.some(v => v.vtr === editingVtr.vtr && v.id !== editingVtr.id)) {
                    alert("Já existe outra viatura com este nome.");
                    return;
                  }
                  if (isAdding) {
                    setViaturas(prev => [...prev, editingVtr]);
                  } else {
                    setViaturas(prev => prev.map(v => v.id === editingVtr.id ? editingVtr : v));
                  }
                  setEditingVtr(null);
                  setIsAdding(false);
                }}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-indigo-700 transition-colors"
              >
                {isAdding ? "Adicionar" : "Salvar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      
      <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
         <div className="flex-1 w-full max-w-xl">
           <button
             onClick={handleOpenAddVtr}
             className="bg-rose-600 hover:bg-rose-700 text-white py-2.5 px-6 rounded-xl font-bold uppercase tracking-widest text-xs transition-all shadow-sm flex items-center justify-center gap-2"
           >
             <Plus className="w-4 h-4" /> Adicionar Viatura
           </button>
         </div>

         <div className="flex gap-3 w-full lg:w-auto">
           {confirmRestore ? (
             <div className="flex items-center gap-1">
               <button
                 onClick={handleRestoreDefaults}
                 className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white border border-rose-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-sm"
               >
                 <Check className="w-4 h-4" /> Confirmar
               </button>
               <button
                 onClick={() => setConfirmRestore(false)}
                 className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-sm"
               >
                 <X className="w-4 h-4" />
               </button>
             </div>
           ) : (
             <button
               onClick={() => setConfirmRestore(true)}
               className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all"
             >
               <RotateCcw className="w-4 h-4" /> Padrão
             </button>
           )}
           <button
             onClick={handleSave}
             disabled={saving}
             className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-slate-800 text-white shadow-sm rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all disabled:opacity-50"
           >
             <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Configuração"}
           </button>
         </div>
      </div>

      {renderTable(
        viaturas.filter(v => v.tipo !== 'administrativa'), 
        "Viaturas Operacionais", 
        "Viaturas destinadas ao socorro e atividades de resposta a emergências"
      )}

      {renderTable(
        viaturas.filter(v => v.tipo === 'administrativa'), 
        "Viaturas Administrativas", 
        "Viaturas destinadas a apoio, vistorias e atividades administrativas"
      )}

    </div>
  );
}
