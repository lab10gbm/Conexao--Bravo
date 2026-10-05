import React, { useState, useEffect } from 'react';
import { Truck, Plus, Trash2, Save, RotateCcw, Edit2, Check, X, BookmarkCheck, Star, ShieldCheck, Info, Sparkles } from 'lucide-react';
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
  exibir?: boolean;
  espaco?: '1' | '1/2' | '1/3';
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
  { id: "ABT-183", vtr: "ABT-183", ativa: true, exibir: true, espaco: "1", obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: true, g3: true, g4: false, cg: true, blocked: [] },
  { id: "ABSL-152", vtr: "ABSL-152", ativa: true, exibir: true, espaco: "1", obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: true, g3: false, g4: false, cg: true, blocked: [] },
  { id: "ASE-404", vtr: "ASE-404", ativa: true, exibir: true, espaco: "1", obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "ARC-162", vtr: "ARC-162", ativa: true, exibir: true, espaco: "1/2", obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: true, g2: null, g3: null, g4: null, cg: null, blocked: ["g2", "g3", "g4", "cg"] },
  { id: "AR-583", vtr: "AR-583", ativa: true, exibir: true, espaco: "1/2", obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: true, g1: null, g2: null, g3: null, g4: null, cg: null, blocked: ["g1", "g2", "g3", "g4", "cg"] },
  { id: "L-09", vtr: "L-09", ativa: true, exibir: true, espaco: "1/3", obm: "10º GBM", tipo: 'operacional', maritima: true, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "BIA-006", vtr: "BIA-006", ativa: true, exibir: true, espaco: "1/3", obm: "10º GBM", tipo: 'operacional', maritima: true, condutor: true, g1: true, g2: true, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "BIA-013", vtr: "BIA-013", ativa: false, exibir: false, espaco: "1/3", obm: "10º GBM", tipo: 'operacional', maritima: true, condutor: false, g1: false, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "ABT-12", vtr: "ABT-12", ativa: false, exibir: false, espaco: "1", obm: "10º GBM", tipo: 'operacional', maritima: false, condutor: false, g1: false, g2: false, g3: false, g4: false, cg: false, blocked: [] },
];

function cleanUndefined(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  if (obj !== null && typeof obj === 'object') {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        res[key] = cleanUndefined(val);
      }
    }
    return res;
  }
  return obj;
}

export function ControleViaturasModule({ obmContext }: ControleViaturasModuleProps) {
  const [viaturas, setViaturas] = useState<ViaturaConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingVtr, setEditingVtr] = useState<ViaturaConfig | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isNewDefaultModalOpen, setIsNewDefaultModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [customDefault, setCustomDefault] = useState<ViaturaConfig[] | null>(null);
  const [customDefaultDate, setCustomDefaultDate] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => {
      setSuccessMessage(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (!obmContext) return;
    
    // Check local storage first for immediate access
    const localDefStr = localStorage.getItem(`custom_default_viaturas_${obmContext}`);
    const localDefDate = localStorage.getItem(`custom_default_viaturas_date_${obmContext}`);
    let localDef: ViaturaConfig[] | null = null;
    if (localDefStr) {
      try {
        localDef = JSON.parse(localDefStr);
        setCustomDefault(localDef);
        setCustomDefaultDate(localDefDate || null);
      } catch (e) {
        console.error("Erro ao carregar padrão local:", e);
      }
    }

    if (!db) {
      setViaturas(localDef || DEFAULT_VIATURAS);
      setLoading(false);
      return;
    }

    const docRef = doc(db, "obm_settings", obmContext);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.viaturas_custom_default && Array.isArray(data.viaturas_custom_default)) {
          const loadedDef: ViaturaConfig[] = data.viaturas_custom_default;
          setCustomDefault(loadedDef);
          setCustomDefaultDate(data.viaturas_custom_default_date || null);
          localStorage.setItem(`custom_default_viaturas_${obmContext}`, JSON.stringify(loadedDef));
          if (data.viaturas_custom_default_date) {
            localStorage.setItem(`custom_default_viaturas_date_${obmContext}`, data.viaturas_custom_default_date);
          }
        }

        if (data.viaturas_config && Array.isArray(data.viaturas_config)) {
          const loaded: ViaturaConfig[] = data.viaturas_config;
          const normalized = loaded.map(v => ({
            ...v,
            exibir: v.exibir !== undefined ? v.exibir : true,
            espaco: v.espaco || (v.maritima || v.vtr?.startsWith('L-') || v.vtr?.startsWith('BIA') ? '1/3' : (v.vtr?.startsWith('AR') || v.vtr?.startsWith('ARC') ? '1/2' : '1'))
          }));
          setViaturas(normalized);
        } else if (data.viaturas_custom_default && Array.isArray(data.viaturas_custom_default)) {
          setViaturas(data.viaturas_custom_default);
        } else {
          setViaturas(localDef || DEFAULT_VIATURAS);
        }
      } else {
        setViaturas(localDef || DEFAULT_VIATURAS);
      }
      setLoading(false);
    }, (err) => {
      console.error("Erro ao buscar viaturas config:", err);
      setViaturas(localDef || DEFAULT_VIATURAS);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [obmContext]);

  const handleSave = async () => {
    if (!obmContext) return;
    setSaving(true);
    try {
      if (db) {
        const docRef = doc(db, "obm_settings", obmContext);
        const snap = await getDoc(docRef);
        const payload = cleanUndefined({ viaturas_config: viaturas });
        if (snap.exists()) {
          await updateDoc(docRef, payload);
        } else {
          await setDoc(docRef, payload);
        }
      }
      localStorage.setItem(`viaturas_config_${obmContext}`, JSON.stringify(viaturas));
      setSuccessMessage("Configuração de viaturas salva com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar viaturas:", err);
      alert("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewDefault = async () => {
    if (!obmContext) return;
    setSaving(true);
    const nowIso = new Date().toISOString();
    try {
      const payload = cleanUndefined({
        viaturas_config: viaturas,
        viaturas_custom_default: viaturas,
        viaturas_custom_default_date: nowIso
      });
      if (db) {
        const docRef = doc(db, "obm_settings", obmContext);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          await updateDoc(docRef, payload);
        } else {
          await setDoc(docRef, payload);
        }
      }
      localStorage.setItem(`custom_default_viaturas_${obmContext}`, JSON.stringify(viaturas));
      localStorage.setItem(`custom_default_viaturas_date_${obmContext}`, nowIso);
      localStorage.setItem(`viaturas_config_${obmContext}`, JSON.stringify(viaturas));
      
      setCustomDefault(viaturas);
      setCustomDefaultDate(nowIso);
      setIsNewDefaultModalOpen(false);
      setSuccessMessage("Novo padrão criado com sucesso! Agora esta é a sua referência padrão ao retornar ao padrão.");
    } catch (err) {
      console.error("Erro ao criar novo padrão:", err);
      alert("Erro ao salvar novo padrão.");
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreCustomDefault = () => {
    if (customDefault && customDefault.length > 0) {
      setViaturas(customDefault);
      setSuccessMessage("Viaturas restauradas com sucesso para o seu Novo Padrão de Referência!");
    } else {
      setViaturas(DEFAULT_VIATURAS);
      setSuccessMessage("Viaturas restauradas para o padrão inicial de fábrica.");
    }
    setIsRestoreModalOpen(false);
  };

  const handleRestoreFactoryDefault = () => {
    setViaturas(DEFAULT_VIATURAS);
    setSuccessMessage("Viaturas restauradas para o padrão original de fábrica do sistema.");
    setIsRestoreModalOpen(false);
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

  const moveViaturaUp = (vtrId: string, currentList: ViaturaConfig[]) => {
    const listIdx = currentList.findIndex(v => v.id === vtrId);
    if (listIdx <= 0) return;
    const targetId = currentList[listIdx - 1].id;
    setViaturas(prev => {
      const idxA = prev.findIndex(v => v.id === vtrId);
      const idxB = prev.findIndex(v => v.id === targetId);
      if (idxA === -1 || idxB === -1) return prev;
      const next = [...prev];
      const temp = next[idxA];
      next[idxA] = next[idxB];
      next[idxB] = temp;
      return next;
    });
  };

  const moveViaturaDown = (vtrId: string, currentList: ViaturaConfig[]) => {
    const listIdx = currentList.findIndex(v => v.id === vtrId);
    if (listIdx < 0 || listIdx >= currentList.length - 1) return;
    const targetId = currentList[listIdx + 1].id;
    setViaturas(prev => {
      const idxA = prev.findIndex(v => v.id === vtrId);
      const idxB = prev.findIndex(v => v.id === targetId);
      if (idxA === -1 || idxB === -1) return prev;
      const next = [...prev];
      const temp = next[idxA];
      next[idxA] = next[idxB];
      next[idxB] = temp;
      return next;
    });
  };

  const handleOpenAddVtr = () => {
    setEditingVtr({
      id: Date.now().toString(),
      vtr: '',
      ativa: true,
      exibir: true,
      espaco: '1',
      obm: obmContext || "10º GBM",
      tipo: 'operacional',
      maritima: false,
      condutor: true,
      g1: true,
      g2: false,
      g3: false,
      g4: false,
      cg: true,
      blocked: [],
      customNames: {}
    });
    setIsAdding(true);
  };

  const handleDeleteVtr = (id: string) => {
    setViaturas(prev => prev.filter(v => v.id !== id));
    setConfirmDeleteId(null);
  };

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
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
          Configuração OBM
        </span>
      </div>

      <div className="p-4 sm:p-6 bg-slate-50 relative overflow-x-auto">
        <table className="w-full text-left text-[10px] font-bold uppercase tracking-wider bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm min-w-[760px]">
          <thead className="bg-[#1e293b] text-white text-[11px]">
            <tr>
              <th className="p-3 px-2 border-b border-r border-[#334155] w-14 text-center" title="Alterar ordem da viatura">
                Ordem
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] w-36 text-center" title="Exibir VTR na escala gerada e definir espaço (1, 1/2 ou 1/3)">
                Exibição
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] w-12 text-center" title="Ativar VTR?">
                Ativar
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-28">
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
              <th className="p-3 px-2 border-b border-[#334155] text-center w-20">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {viaturasList.map((vtr, idx) => {
              const isAtiva = Boolean(vtr.ativa);
              const isExibir = vtr.exibir !== undefined ? Boolean(vtr.exibir) : true;
              const vtrEspaco: '1' | '1/2' | '1/3' = vtr.espaco === '1/3' ? '1/3' : (vtr.espaco === '1/2' ? '1/2' : '1');

              const isFirst = idx === 0;
              const isLast = idx === viaturasList.length - 1;

              const setEspaco = (e: React.MouseEvent, esp: '1' | '1/2' | '1/3') => {
                e.stopPropagation();
                setViaturas(prev => prev.map(v => v.id === vtr.id ? { ...v, espaco: esp } : v));
              };

              const toggleExibir = (e: React.MouseEvent) => {
                e.stopPropagation();
                setViaturas(prev => prev.map(v => v.id === vtr.id ? { ...v, exibir: !(v.exibir !== undefined ? Boolean(v.exibir) : true) } : v));
              };

              const toggleVtr = (e: React.MouseEvent) => {
                e.stopPropagation();
                toggleProperty(vtr.id, 'ativa');
              };

              return (
                <tr key={vtr.id} className={cn("hover:bg-slate-50 transition-colors group", idx % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                  {/* Ordem */}
                  <td className="p-1 px-1.5 border-r border-slate-200 text-center align-middle">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveViaturaUp(vtr.id, viaturasList); }}
                        disabled={isFirst}
                        className={cn(
                          "w-5 h-5 rounded flex items-center justify-center text-[10px] font-black transition-colors cursor-pointer",
                          isFirst
                            ? "text-slate-300 cursor-not-allowed"
                            : "bg-slate-100 hover:bg-slate-700 hover:text-white text-slate-700 shadow-xs"
                        )}
                        title="Mover viatura para cima"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveViaturaDown(vtr.id, viaturasList); }}
                        disabled={isLast}
                        className={cn(
                          "w-5 h-5 rounded flex items-center justify-center text-[10px] font-black transition-colors cursor-pointer",
                          isLast
                            ? "text-slate-300 cursor-not-allowed"
                            : "bg-slate-100 hover:bg-slate-700 hover:text-white text-slate-700 shadow-xs"
                        )}
                        title="Mover viatura para baixo"
                      >
                        ▼
                      </button>
                    </div>
                  </td>

                  {/* Exibição */}
                  <td className="p-1 px-2 border-r border-slate-200 text-center align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                      <div
                        onClick={toggleExibir}
                        title={isExibir ? "Viatura exibida na escala gerada" : "Viatura oculta na escala gerada"}
                        className="cursor-pointer shrink-0"
                      >
                        {isExibir ? (
                          <div className="w-4 h-4 bg-slate-700/80 rounded-[3px] text-white flex items-center justify-center shadow-sm hover:bg-slate-800 transition">
                            <span className="text-[10px]">✓</span>
                          </div>
                        ) : (
                          <div className="w-4 h-4 border border-slate-300 rounded-[3px] hover:border-slate-500 transition" />
                        )}
                      </div>

                      <div
                        className={cn(
                          "inline-flex items-center rounded border border-slate-200 overflow-hidden bg-slate-100 text-[9px] font-black transition-opacity",
                          !isExibir && "opacity-40"
                        )}
                      >
                        <button
                          type="button"
                          onClick={(e) => setEspaco(e, '1')}
                          className={cn(
                            "px-1.5 py-0.5 transition-colors cursor-pointer",
                            vtrEspaco === '1'
                              ? "bg-slate-800 text-white font-black"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                          )}
                          title="1 espaço completo (coluna inteira)"
                        >
                          1
                        </button>
                        <button
                          type="button"
                          onClick={(e) => setEspaco(e, '1/2')}
                          className={cn(
                            "px-1 py-0.5 border-l border-slate-200 transition-colors cursor-pointer",
                            vtrEspaco === '1/2'
                              ? "bg-slate-800 text-white font-black"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                          )}
                          title="1/2 espaço (meia coluna compartilhada)"
                        >
                          1/2
                        </button>
                        <button
                          type="button"
                          onClick={(e) => setEspaco(e, '1/3')}
                          className={cn(
                            "px-1 py-0.5 border-l border-slate-200 transition-colors cursor-pointer",
                            vtrEspaco === '1/3'
                              ? "bg-slate-800 text-white font-black"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                          )}
                          title="1/3 espaço (terço de coluna compartilhada)"
                        >
                          1/3
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* Ativar */}
                  <td
                    className="p-1 border-r border-slate-200 text-center align-middle cursor-pointer"
                    onClick={toggleVtr}
                    title={isAtiva ? "Viatura ativa" : "Viatura inativa"}
                  >
                    {isAtiva ? (
                      <div className="w-4 h-4 bg-slate-700/80 rounded-[3px] text-white flex items-center justify-center mx-auto shadow-sm hover:bg-slate-800 transition">
                        <span className="text-[10px]">✓</span>
                      </div>
                    ) : (
                      <div className="w-4 h-4 border border-slate-300 rounded-[3px] mx-auto hover:border-slate-500 transition" />
                    )}
                  </td>

                  {/* Viatura Nome */}
                  <td className="p-2 border-r border-slate-200 text-center font-black text-slate-800">
                    {vtr.vtr}
                  </td>

                  {/* OBM */}
                  <td className="p-2 border-r border-slate-200 text-center">
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

                  {/* Situação */}
                  <td className="p-1 px-2 border-r border-slate-200 text-center align-middle">
                    {isAtiva ? (
                      <span className="bg-[#2c533e] text-emerald-50 px-2 py-1 text-[9px] w-full block rounded-[3px]">
                        ATIVA
                      </span>
                    ) : (
                      <span className="bg-[#fac7b0] text-[#783f2a] px-2 py-1 text-[9px] w-full block rounded-[3px] font-black">
                        INATIVA
                      </span>
                    )}
                  </td>

                  {/* Slots: Condutor, G1, G2, G3, G4, CG */}
                  {['condutor', 'g1', 'g2', 'g3', 'g4', 'cg'].map((prop) => {
                    const isBlocked = vtr.blocked.includes(prop);
                    const isChecked = vtr[prop as keyof ViaturaConfig] === true;

                    if (isBlocked) {
                      return (
                        <td
                          key={prop}
                          className="bg-slate-700 opacity-90 p-0 border-r border-slate-200 text-center cursor-pointer"
                          onClick={() => toggleProperty(vtr.id, prop as keyof ViaturaConfig)}
                          title="Clique para alternar: Bloqueado -> Desmarcado"
                        >
                          <div className="w-full h-full min-h-[32px] flex items-center justify-center"></div>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={prop}
                        className="p-1 border-r border-slate-200 text-center align-middle cursor-pointer"
                        onClick={() => toggleProperty(vtr.id, prop as keyof ViaturaConfig)}
                        title="Clique para alternar: Desmarcado -> Marcado -> Bloqueado"
                      >
                        <div className="flex items-center justify-center h-full p-2">
                          {isChecked ? (
                            <div className="w-3.5 h-3.5 bg-slate-700/80 rounded-[3px] text-white flex items-center justify-center shadow-sm hover:bg-slate-800 transition">
                              <span className="text-[10px]">✓</span>
                            </div>
                          ) : (
                            <div className="w-3.5 h-3.5 border border-slate-300 rounded-[3px] hover:border-slate-500 transition" />
                          )}
                        </div>
                      </td>
                    );
                  })}

                  {/* Ações */}
                  <td className="p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => {
                          setEditingVtr(vtr);
                          setIsAdding(false);
                        }}
                        className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Editar viatura"
                      >
                        <Edit2 className="w-4 h-4 mx-auto" />
                      </button>
                      {confirmDeleteId === vtr.id ? (
                        <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                          <button
                            onClick={() => handleDeleteVtr(vtr.id)}
                            className="p-1.5 text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Confirmar exclusão"
                          >
                            <Check className="w-4 h-4 mx-auto" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="p-1.5 text-slate-500 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Cancelar"
                          >
                            <X className="w-4 h-4 mx-auto" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(vtr.id)}
                          className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remover viatura"
                        >
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {viaturasList.length === 0 && (
              <tr>
                <td colSpan={13} className="p-8 text-center text-slate-400 font-bold">
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
      {/* Toast de Notificação */}
      {successMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold">{successMessage}</p>
          <button
            onClick={() => setSuccessMessage(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal Criar Novo Padrão */}
      {isNewDefaultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsNewDefaultModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <BookmarkCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-slate-800">
                  Criar Novo Padrão de Viaturas
                </h2>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Unidade: {obmContext}
                </p>
              </div>
            </div>

            <div className="space-y-4 my-2">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs text-emerald-900 leading-relaxed font-medium">
                <p className="font-bold text-emerald-950 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Nova Referência Padrão Permanente
                </p>
                Você está prestes a definir a configuração atual como o <strong>novo padrão de referência</strong> para esta OBM. Uma vez definido:
                <ul className="list-disc pl-5 mt-2 space-y-1 text-[11px]">
                  <li>Ao clicar em <strong>"Retornar ao Padrão"</strong> (aqui ou na escala diária de 24h), esta nova referência será restaurada.</li>
                  <li>Novas escalas geradas herdarão esta ordem, visualizações e guarnições.</li>
                </ul>
              </div>

              {/* Resumo da Configuração Atual */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-3">
                  Resumo da Configuração que se tornará o Novo Padrão:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Total VTRs</span>
                    <span className="text-base font-black text-slate-800">{viaturas.length}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Ativas</span>
                    <span className="text-base font-black text-emerald-600">{viaturas.filter(v => v.ativa).length}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Exibidas</span>
                    <span className="text-base font-black text-indigo-600">{viaturas.filter(v => v.exibir !== false).length}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Espaços</span>
                    <span className="text-[11px] font-black text-slate-700 block mt-0.5">
                      {viaturas.filter(v => (v.espaco || '1') === '1').length} [1] • {viaturas.filter(v => v.espaco === '1/2').length} [½] • {viaturas.filter(v => v.espaco === '1/3').length} [⅓]
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-[10px] text-slate-500 font-semibold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  A ordem atual das viaturas também ficará gravada como padrão permanente.
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsNewDefaultModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateNewDefault}
                disabled={saving}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-colors shadow-sm disabled:opacity-50"
              >
                <BookmarkCheck className="w-4 h-4" />
                {saving ? "Salvando..." : "Confirmar e Definir Novo Padrão"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Retornar ao Padrão */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsRestoreModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-slate-800">
                  Retornar ao Padrão
                </h2>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Selecione a referência a restaurar
                </p>
              </div>
            </div>

            <div className="space-y-3 my-2">
              {customDefault && customDefault.length > 0 ? (
                <>
                  {/* Opção 1: Novo Padrão Definido */}
                  <div
                    onClick={handleRestoreCustomDefault}
                    className="p-4 rounded-2xl border-2 border-emerald-500/40 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                        <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                        Restaurar Meu Novo Padrão
                      </span>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                        Ativo
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-snug">
                      Restaura o padrão personalizado definido para esta OBM ({customDefault.length} viaturas
                      {customDefaultDate ? ` • salvo em ${formatDateTime(customDefaultDate)}` : ''}).
                    </p>
                  </div>

                  {/* Opção 2: Padrão Original de Fábrica */}
                  <div
                    onClick={handleRestoreFactoryDefault}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-slate-500" />
                        Restaurar Padrão de Fábrica
                      </span>
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        Original
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Redefine para o padrão inicial do sistema (9 viaturas originais do Corpo de Bombeiros).
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 leading-relaxed">
                  <p className="font-bold text-slate-900 mb-1">Padrão Inicial do Sistema</p>
                  Ainda não foi definido um novo padrão personalizado para esta OBM. Deseja restaurar a configuração para o padrão original de fábrica (9 viaturas)?
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={handleRestoreFactoryDefault}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black uppercase text-xs tracking-wider py-2.5 rounded-xl transition"
                    >
                      Restaurar Padrão de Fábrica
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar / Editar Viatura */}
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
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Espaço na Escala</label>
                  <select 
                    value={editingVtr.espaco || '1'}
                    onChange={(e) => setEditingVtr({...editingVtr, espaco: e.target.value as '1' | '1/2' | '1/3'})}
                    className="w-full p-2 mt-1 border border-slate-200 rounded-xl uppercase font-bold bg-white text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                  >
                    <option value="1">1 (Espaço Completo)</option>
                    <option value="1/2">1/2 (Meia Coluna Compartilhada)</option>
                    <option value="1/3">1/3 (Terço de Coluna Compartilhada)</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 p-2 px-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors h-[42px] mb-[1px]">
                    <input
                      type="checkbox"
                      checked={editingVtr.exibir !== undefined ? editingVtr.exibir : true}
                      onChange={e => setEditingVtr({...editingVtr, exibir: e.target.checked})}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700 uppercase">Exibir na Escala</span>
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

      {/* Barra de Ações Superior com ferramenta Criar Novo Padrão */}
      <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
         <div className="flex flex-wrap items-center gap-3">
           <button
             onClick={handleOpenAddVtr}
             className="bg-rose-600 hover:bg-rose-700 text-white py-2.5 px-5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
           >
             <Plus className="w-4 h-4" /> Adicionar Viatura
           </button>

           {/* Ferramenta: Criar Novo Padrão */}
           <button
             type="button"
             onClick={() => setIsNewDefaultModalOpen(true)}
             className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
             title="Definir esta configuração (ordem, exibição, espaços e guarnições) como o Novo Padrão Permanente da OBM"
           >
             <BookmarkCheck className="w-4 h-4" /> Criar Novo Padrão
           </button>
         </div>

         {/* Status do Padrão Atual & Botões de Ação */}
         <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
           {/* Chip informativo do padrão ativo */}
           <div
             className={cn(
               "flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-2xs",
               customDefault
                 ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                 : "bg-slate-100 text-slate-600 border-slate-200"
             )}
             title={customDefault ? `Padrão salvo em ${formatDateTime(customDefaultDate)}` : "Padrão de fábrica do sistema"}
           >
             <span
               className={cn(
                 "w-2 h-2 rounded-full",
                 customDefault ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
               )}
             />
             <span>
               {customDefault ? "Novo Padrão OBM Ativo" : "Padrão de Fábrica"}
             </span>
           </div>

           {/* Botão Retornar ao Padrão */}
           <button
             type="button"
             onClick={() => setIsRestoreModalOpen(true)}
             className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 shadow-sm rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
             title="Restaurar para a referência padrão (Novo Padrão ou Padrão de Fábrica)"
           >
             <RotateCcw className="w-4 h-4 text-slate-500" /> Retornar ao Padrão
           </button>

           {/* Botão Salvar Configuração */}
           <button
             onClick={handleSave}
             disabled={saving}
             className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 text-white shadow-sm rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all disabled:opacity-50 cursor-pointer"
             title="Salvar alterações na configuração ativa"
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
