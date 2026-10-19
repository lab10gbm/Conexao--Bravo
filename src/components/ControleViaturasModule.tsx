import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Save, RotateCcw, Check, X, BookmarkCheck, Truck, Palmtree } from 'lucide-react';
import { doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn, normalizeObm, getObmSettingsDocKey, getObmSettingsFallbackKeys } from '../lib/utils';
import { CategoryConfig, DEFAULT_CATEGORIES, getAvailableControlFunctions } from './ControleCategoriasModal';

import { ViaturaConfig, VtrModalFunctionRow, DEFAULT_VIATURAS } from '../features/viaturas/types';
import { cleanUndefined, formatDateTime, buildModalFunctionsFromVtr } from '../features/viaturas/lib/viaturaUtils';
import { ViaturaTable } from '../features/viaturas/components/ViaturaTable';
import { ViaturaEditModal } from '../features/viaturas/components/ViaturaEditModal';
import { ViaturaNewDefaultModal } from '../features/viaturas/components/ViaturaNewDefaultModal';
import { ViaturaRestoreModal } from '../features/viaturas/components/ViaturaRestoreModal';
import { PostosManagerPanel } from '../features/postos/components/PostosManagerPanel';

export type { ViaturaConfig, VtrModalFunctionRow };

interface ControleViaturasModuleProps {
  obmContext: string;
}

export function ControleViaturasModule({ obmContext }: ControleViaturasModuleProps) {
  const [activeTab, setActiveTab] = useState<'viaturas' | 'postos'>('viaturas');
  const [viaturas, setViaturas] = useState<ViaturaConfig[]>([]);
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingVtr, setEditingVtr] = useState<ViaturaConfig | null>(null);
  const [modalFunctions, setModalFunctions] = useState<VtrModalFunctionRow[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isNewDefaultModalOpen, setIsNewDefaultModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [customDefault, setCustomDefault] = useState<ViaturaConfig[] | null>(null);
  const [customDefaultDate, setCustomDefaultDate] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const availableFunctions = useMemo(() => getAvailableControlFunctions(categories), [categories]);
  const groupedFunctions = useMemo(() => {
    const groups: { categoryId: string; categoryName: string; items: typeof availableFunctions }[] = [];
    for (const fn of availableFunctions) {
      let grp = groups.find(g => g.categoryId === fn.categoryId);
      if (!grp) {
        grp = { categoryId: fn.categoryId, categoryName: fn.categoryName, items: [] };
        groups.push(grp);
      }
      grp.items.push(fn);
    }
    return groups;
  }, [availableFunctions]);

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

    const cleanObm = normalizeObm(obmContext);
    const docKey = getObmSettingsDocKey(obmContext);
    const docRef = doc(db, "obm_settings", docKey);
    
    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      let data = docSnap.exists() ? docSnap.data() : null;

      // Fallback para outras chaves conhecidas se a chave direta não existir
      if (!data || !data.categorias_funcoes) {
        const fallbackKeys = getObmSettingsFallbackKeys(obmContext);
        for (const fk of fallbackKeys) {
          if (fk === docKey) continue;
          try {
            const snapFallback = await getDoc(doc(db, "obm_settings", fk));
            if (snapFallback.exists()) {
              const fbData = snapFallback.data();
              data = { ...fbData, ...(data || {}) };
              if (data?.categorias_funcoes && (data?.viaturas_config || data?.viaturas_custom_default)) {
                break;
              }
            }
          } catch {}
        }
      }

      if (data) {
        if (data.categorias_funcoes && Array.isArray(data.categorias_funcoes)) {
          const migrated = data.categorias_funcoes.map((cat: any) => {
            if (cat.activeProperty !== undefined) return cat;
            let activeProp = `dynamicFunctions.ativo_${cat.id}`;
            const newFunctions = [...(cat.functions || [])];
            const ativoIndex = newFunctions.findIndex((f: any) => f.name.toLowerCase() === "ativo");
            if (ativoIndex >= 0) {
              activeProp = newFunctions[ativoIndex].id;
              newFunctions.splice(ativoIndex, 1);
            } else {
              const defCat = DEFAULT_CATEGORIES.find(d => d.id === cat.id);
              if (defCat) activeProp = defCat.activeProperty;
            }
            return { ...cat, activeProperty: activeProp, functions: newFunctions };
          });
          setCategories(migrated);
        } else {
          setCategories(DEFAULT_CATEGORIES);
        }

        if (data.viaturas_custom_default && Array.isArray(data.viaturas_custom_default)) {
          const loadedDef: ViaturaConfig[] = data.viaturas_custom_default;
          setCustomDefault(loadedDef);
          setCustomDefaultDate(data.viaturas_custom_default_date || null);
          localStorage.setItem(`custom_default_viaturas_${obmContext}`, JSON.stringify(loadedDef));
          localStorage.setItem(`custom_default_viaturas_${cleanObm}`, JSON.stringify(loadedDef));
          if (data.viaturas_custom_default_date) {
            localStorage.setItem(`custom_default_viaturas_date_${obmContext}`, data.viaturas_custom_default_date);
            localStorage.setItem(`custom_default_viaturas_date_${cleanObm}`, data.viaturas_custom_default_date);
          }
        }

        const candidateList = data.viaturas_config || data.viaturas_custom_default;
        if (candidateList && Array.isArray(candidateList)) {
          const loaded: ViaturaConfig[] = candidateList;
          const normalized = loaded.map(v => ({
            ...v,
            exibir: v.exibir !== undefined ? v.exibir : true,
            espaco: v.espaco || (v.maritima || v.vtr?.startsWith('L-') || v.vtr?.startsWith('BIA') ? '1/3' : (v.vtr?.startsWith('AR') || v.vtr?.startsWith('ARC') ? '1/2' : '1'))
          }));
          setViaturas(normalized);
        } else {
          setViaturas(localDef || DEFAULT_VIATURAS);
        }
      } else {
        setCategories(DEFAULT_CATEGORIES);
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
    const nowIso = new Date().toISOString();
    try {
      const payload = cleanUndefined({ 
        viaturas_config: viaturas,
        viaturas_custom_default: viaturas,
        viaturas_custom_default_date: nowIso,
        updatedAt: nowIso
      });
      const cleanObm = normalizeObm(obmContext);
      if (db) {
        const docKeys = Array.from(new Set([
          obmContext.replace(/\//g, '_').replace(/\s/g, '_'),
          cleanObm.replace(/\//g, '_').replace(/\s/g, '_'),
          cleanObm.replace(/º/g, '°').replace(/\//g, '_').replace(/\s/g, '_'),
          cleanObm.replace(/°/g, 'º').replace(/\//g, '_').replace(/\s/g, '_'),
          cleanObm.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
          '10º_GBM',
          '10°_GBM',
          '10__gbm',
          '10_gbm',
          '10_GBM'
        ]));
        for (const key of docKeys) {
          try {
            const docRef = doc(db, "obm_settings", key);
            await setDoc(docRef, payload, { merge: true });
          } catch (e) {
            console.warn("Erro salvando key em obm_settings:", key, e);
          }
        }
      }
      const allLocalKeys = [
        `custom_default_viaturas_${obmContext}`,
        `custom_default_viaturas_${cleanObm}`,
        `custom_default_viaturas_${cleanObm.replace(/º/g, '°')}`,
        `custom_default_viaturas_${cleanObm.replace(/°/g, 'º')}`,
        `custom_default_viaturas_10º GBM`,
        `custom_default_viaturas_10° GBM`,
        `custom_default_viaturas_global_active`,
        `viaturas_config_${obmContext}`,
        `viaturas_config_${cleanObm}`,
        `viaturas_config_${cleanObm.replace(/º/g, '°')}`,
        `viaturas_config_${cleanObm.replace(/°/g, 'º')}`,
        `viaturas_config_10º GBM`,
        `viaturas_config_10° GBM`,
        `viaturas_config_global_active`
      ];
      for (const k of allLocalKeys) {
        localStorage.setItem(k, JSON.stringify(viaturas));
      }
      localStorage.setItem(`custom_default_viaturas_date_${obmContext}`, nowIso);
      localStorage.setItem(`custom_default_viaturas_date_${cleanObm}`, nowIso);
      
      setCustomDefault(viaturas);
      setCustomDefaultDate(nowIso);

      window.dispatchEvent(new CustomEvent('obm_viaturas_pattern_updated', {
        detail: { obmContext, viaturas, date: nowIso }
      }));

      setSuccessMessage("Configuração de viaturas salva com sucesso! Novo padrão sincronizado para as escalas.");
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
        viaturas_custom_default_date: nowIso,
        updatedAt: nowIso
      });
      const cleanObm = normalizeObm(obmContext);
      if (db) {
        const docKeys = Array.from(new Set([
          obmContext.replace(/\//g, '_').replace(/\s/g, '_'),
          cleanObm.replace(/\//g, '_').replace(/\s/g, '_'),
          cleanObm.replace(/º/g, '°').replace(/\//g, '_').replace(/\s/g, '_'),
          cleanObm.replace(/°/g, 'º').replace(/\//g, '_').replace(/\s/g, '_'),
          cleanObm.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
          '10º_GBM',
          '10°_GBM',
          '10__gbm',
          '10_gbm',
          '10_GBM'
        ]));
        for (const key of docKeys) {
          try {
            const docRef = doc(db, "obm_settings", key);
            await setDoc(docRef, payload, { merge: true });
          } catch (e) {
            console.warn("Erro salvando novo padrão na key:", key, e);
          }
        }
      }
      const allLocalKeys = [
        `custom_default_viaturas_${obmContext}`,
        `custom_default_viaturas_${cleanObm}`,
        `custom_default_viaturas_${cleanObm.replace(/º/g, '°')}`,
        `custom_default_viaturas_${cleanObm.replace(/°/g, 'º')}`,
        `custom_default_viaturas_10º GBM`,
        `custom_default_viaturas_10° GBM`,
        `custom_default_viaturas_global_active`,
        `viaturas_config_${obmContext}`,
        `viaturas_config_${cleanObm}`,
        `viaturas_config_${cleanObm.replace(/º/g, '°')}`,
        `viaturas_config_${cleanObm.replace(/°/g, 'º')}`,
        `viaturas_config_10º GBM`,
        `viaturas_config_10° GBM`,
        `viaturas_config_global_active`
      ];
      for (const k of allLocalKeys) {
        localStorage.setItem(k, JSON.stringify(viaturas));
      }
      localStorage.setItem(`custom_default_viaturas_date_${obmContext}`, nowIso);
      localStorage.setItem(`custom_default_viaturas_date_${cleanObm}`, nowIso);
      
      setCustomDefault(viaturas);
      setCustomDefaultDate(nowIso);
      setIsNewDefaultModalOpen(false);
      setSuccessMessage("Novo padrão criado com sucesso! Agora esta é a sua referência padrão ao retornar ao padrão.");

      window.dispatchEvent(new CustomEvent('obm_viaturas_pattern_updated', {
        detail: { obmContext, viaturas, date: nowIso }
      }));
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
          const newBlocked = v.blocked.filter(p => p !== property);
          return { ...v, [property]: false, blocked: newBlocked };
        } else {
          const currentValue = v[property];
          if (currentValue === false) {
             return { ...v, [property]: true };
          } else {
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

  const moveViaturaUp = (vtrId: string) => {
    setViaturas(prev => {
      const idxA = prev.findIndex(v => v.id === vtrId);
      if (idxA <= 0) return prev;
      const next = [...prev];
      const temp = next[idxA];
      next[idxA] = next[idxA - 1];
      next[idxA - 1] = temp;
      return next;
    });
  };

  const moveViaturaDown = (vtrId: string) => {
    setViaturas(prev => {
      const idxA = prev.findIndex(v => v.id === vtrId);
      if (idxA < 0 || idxA >= prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[idxA];
      next[idxA] = next[idxA + 1];
      next[idxA + 1] = temp;
      return next;
    });
  };

  const handleOpenAddVtr = () => {
    const newVtr: ViaturaConfig = {
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
      g2: true,
      g3: true,
      g4: null,
      cg: true,
      blocked: ['g4'],
      customNames: {},
      customFunctions: {}
    };
    setEditingVtr(newVtr);
    setModalFunctions(buildModalFunctionsFromVtr(newVtr, availableFunctions));
    setIsAdding(true);
  };

  const handleDeleteVtr = (id: string) => {
    setViaturas(prev => prev.filter(v => v.id !== id));
    setConfirmDeleteId(null);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">Carregando...</div>;
  }

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

      {/* Seletor de Ambiente do Módulo: Viaturas vs Postos de Serviço */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 self-start shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('viaturas')}
          className={cn(
            "flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
            activeTab === 'viaturas'
              ? "bg-white text-rose-700 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          )}
        >
          <Truck className="w-4 h-4" />
          <span>Viaturas de Socorro</span>
          <span className={cn(
            "text-[9.5px] px-2 py-0.5 rounded-full font-black",
            activeTab === 'viaturas' ? "bg-rose-100 text-rose-800" : "bg-slate-200 text-slate-600"
          )}>
            {viaturas.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('postos')}
          className={cn(
            "flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
            activeTab === 'postos'
              ? "bg-white text-teal-700 shadow-sm border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          )}
        >
          <Palmtree className="w-4 h-4" />
          <span>Postos de Serviço</span>
          <span className={cn(
            "text-[9.5px] px-2 py-0.5 rounded-full font-black",
            activeTab === 'postos' ? "bg-teal-100 text-teal-800" : "bg-slate-200 text-slate-600"
          )}>
            Praia / Salvamar
          </span>
        </button>
      </div>

      {activeTab === 'postos' ? (
        <PostosManagerPanel obmContext={obmContext} />
      ) : (
        <>
          {/* Modal Criar Novo Padrão */}
      <ViaturaNewDefaultModal
        isOpen={isNewDefaultModalOpen}
        onClose={() => setIsNewDefaultModalOpen(false)}
        onConfirm={handleCreateNewDefault}
        saving={saving}
        obmContext={obmContext}
        viaturas={viaturas}
      />

      {/* Modal Retornar ao Padrão */}
      <ViaturaRestoreModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        onRestoreCustom={handleRestoreCustomDefault}
        onRestoreFactory={handleRestoreFactoryDefault}
        customDefault={customDefault}
        customDefaultDate={customDefaultDate}
      />

      {/* Modal Adicionar / Editar Viatura */}
      {editingVtr && (
        <ViaturaEditModal
          editingVtr={editingVtr}
          isAdding={isAdding}
          modalFunctions={modalFunctions}
          setModalFunctions={setModalFunctions}
          setEditingVtr={setEditingVtr}
          onClose={() => {
            setEditingVtr(null);
            setIsAdding(false);
          }}
          onSave={(syncedVtr) => {
            if (viaturas.some(v => v.vtr === syncedVtr.vtr && v.id !== syncedVtr.id)) {
              alert("Já existe outra viatura com este nome.");
              return;
            }
            if (isAdding) {
              setViaturas(prev => [...prev, syncedVtr]);
            } else {
              setViaturas(prev => prev.map(v => v.id === syncedVtr.id ? syncedVtr : v));
            }
            setEditingVtr(null);
            setIsAdding(false);
          }}
          availableFunctions={availableFunctions}
          groupedFunctions={groupedFunctions}
        />
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

      <ViaturaTable
        viaturasList={viaturas.filter(v => v.tipo !== 'administrativa')}
        title="Viaturas Operacionais"
        subtitle="Viaturas destinadas ao socorro e atividades de resposta a emergências"
        onMoveUp={moveViaturaUp}
        onMoveDown={moveViaturaDown}
        onToggleExibir={(id) => setViaturas(prev => prev.map(v => v.id === id ? { ...v, exibir: !(v.exibir !== undefined ? Boolean(v.exibir) : true) } : v))}
        onSetEspaco={(id, esp) => setViaturas(prev => prev.map(v => v.id === id ? { ...v, espaco: esp } : v))}
        onToggleAtiva={(id) => toggleProperty(id, 'ativa')}
        onObmChange={handleObmChange}
        onToggleSlot={toggleProperty}
        onEdit={(vtr) => {
          setEditingVtr(vtr);
          setModalFunctions(buildModalFunctionsFromVtr(vtr, availableFunctions));
          setIsAdding(false);
        }}
        confirmDeleteId={confirmDeleteId}
        setConfirmDeleteId={setConfirmDeleteId}
        onDelete={handleDeleteVtr}
        availableFunctions={availableFunctions}
      />

      <ViaturaTable
        viaturasList={viaturas.filter(v => v.tipo === 'administrativa')}
        title="Viaturas Administrativas"
        subtitle="Viaturas destinadas a apoio, vistorias e atividades administrativas"
        onMoveUp={moveViaturaUp}
        onMoveDown={moveViaturaDown}
        onToggleExibir={(id) => setViaturas(prev => prev.map(v => v.id === id ? { ...v, exibir: !(v.exibir !== undefined ? Boolean(v.exibir) : true) } : v))}
        onSetEspaco={(id, esp) => setViaturas(prev => prev.map(v => v.id === id ? { ...v, espaco: esp } : v))}
        onToggleAtiva={(id) => toggleProperty(id, 'ativa')}
        onObmChange={handleObmChange}
        onToggleSlot={toggleProperty}
        onEdit={(vtr) => {
          setEditingVtr(vtr);
          setModalFunctions(buildModalFunctionsFromVtr(vtr, availableFunctions));
          setIsAdding(false);
        }}
        confirmDeleteId={confirmDeleteId}
        setConfirmDeleteId={setConfirmDeleteId}
        onDelete={handleDeleteVtr}
        availableFunctions={availableFunctions}
      />
        </>
      )}
    </div>
  );
}
