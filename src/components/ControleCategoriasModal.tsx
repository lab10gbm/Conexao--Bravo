import React, { useState, useEffect } from "react";
import { X, Save, Plus, Trash2, Loader2, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { cleanUndefined, cn } from "../lib/utils";

export interface FunctionConfig {
  id: string;
  name: string;
}

export interface CategoryConfig {
  id: string;
  name: string;
  activeProperty: string;
  functions: FunctionConfig[];
}

export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  {
    id: "condutores",
    name: "Condutores",
    activeProperty: "ativoCondutor",
    functions: [
      { id: "viaturas.ABT", name: "ABT" },
      { id: "viaturas.ABSL", name: "ABSL" },
      { id: "viaturas.ASE", name: "ASE" },
      { id: "viaturas.AR", name: "AR" },
      { id: "viaturas.ARC", name: "ARC" },
      { id: "ativoEncarregado", name: "Encerr." },
      { id: "ativoAbastecedor", name: "Abast." }
    ]
  },
  {
    id: "chefes",
    name: "Chefes de Guarnição",
    activeProperty: "ativoChefeGua",
    functions: [
      { id: "chefeAbt", name: "Chefe ABT" },
      { id: "chefeAbsl", name: "Chefe ABSL" }
    ]
  },
  {
    id: "maritimos",
    name: "Marítimos",
    activeProperty: "ativoMaritimo",
    functions: [
      { id: "mestreAl", name: "Mestre AL" },
      { id: "mestreBia", name: "Mestre BIA" },
      { id: "opAma", name: "Op AMA" },
      { id: "gvAma", name: "GV AMA" },
      { id: "marinheiros", name: "Marinheiros" }
    ]
  },
  {
    id: "enfermeiros",
    name: "Enfermeiros",
    activeProperty: "ativoEnfermeiro",
    functions: []
  },
  {
    id: "comunicantes",
    name: "Comunicantes",
    activeProperty: "ativoComunicante",
    functions: []
  },
  {
    id: "graduados",
    name: "Graduados",
    activeProperty: "ativoGraduado",
    functions: [
      { id: "adjunto", name: "Adjunto" },
      { id: "sgtDia", name: "Sgt Dia" },
      { id: "cmtGuarda", name: "Cmt Guarda" },
      { id: "disponivel1", name: "Disponível 1" },
      { id: "disponivel2", name: "Disponível 2" }
    ]
  },
  {
    id: "cbs_sds",
    name: "Cbs E Sds",
    activeProperty: "ativoCbsSds",
    functions: [
      { id: "faxina", name: "Resp Faxina" },
      { id: "sentinela", name: "Sentinela" },
      { id: "deposito", name: "Dia ao Depósito" },
      { id: "toqueDeFogo", name: "Toque de Fogo" },
      { id: "auxRancho", name: "Aux Rancho" },
      { id: "cbGuarda", name: "Cb Guarda" },
      { id: "cbDia", name: "Cb Dia" },
      { id: "disponivelCbsSds", name: "Disponível" }
    ]
  },
  {
    id: "auxiliares",
    name: "Auxiliares VTR",
    activeProperty: "ativoAuxiliar",
    functions: [
      { id: "auxAbt", name: "Aux ABT" },
      { id: "auxAbsl", name: "Aux ABSL" },
      { id: "auxArc", name: "Aux ARC" },
      { id: "auxAse", name: "Aux ASE" },
      { id: "disponivelAux", name: "Disponível" }
    ]
  },
  {
    id: "mostruario",
    name: "Mostruário Geral",
    activeProperty: "",
    functions: []
  }
];

interface ControleCategoriasModalProps {
  isOpen: boolean;
  onClose: () => void;
  obmContext: string;
  initialCategories: any[];
}

export function ControleCategoriasModal({ isOpen, onClose, obmContext, initialCategories }: ControleCategoriasModalProps) {
  const [categories, setCategories] = useState<CategoryConfig[]>(DEFAULT_CATEGORIES);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      if (initialCategories && initialCategories.length > 0) {
        // Migrate data format if needed
        const migrated = initialCategories.map((cat: any) => {
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
          
          return {
            id: cat.id,
            name: cat.name,
            activeProperty: activeProp,
            functions: newFunctions
          };
        });
        setCategories(migrated);
      } else {
        setCategories(DEFAULT_CATEGORIES);
      }
    }
  }, [isOpen, initialCategories]);

  const handleSave = async () => {
    if (!db) return;
    setSaving(true);
    try {
      const docRef = doc(db, "obm_settings", obmContext);
      await setDoc(docRef, cleanUndefined({ categorias_funcoes: categories }), { merge: true });
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar categorias.");
    } finally {
      setSaving(false);
    }
  };

  const addCategory = () => {
    const id = `cat_${Date.now()}`;
    setCategories([...categories, { id, name: "Nova Categoria", activeProperty: `dynamicFunctions.ativo_${id}`, functions: [] }]);
  };

  const removeCategory = (id: string) => {
    if (window.confirm("Deseja realmente remover esta categoria?")) {
      setCategories(categories.filter(c => c.id !== id));
    }
  };

  const updateCategoryName = (id: string, name: string) => {
    setCategories(categories.map(c => c.id === id ? { ...c, name } : c));
  };

  const addFunction = (catId: string) => {
    const fnId = `dynamicFunctions.fn_${Date.now()}`;
    setCategories(categories.map(c => {
      if (c.id === catId) {
        return { ...c, functions: [...c.functions, { id: fnId, name: "Nova Função" }] };
      }
      return c;
    }));
  };

  const removeFunction = (catId: string, fnId: string) => {
    setCategories(categories.map(c => {
      if (c.id === catId) {
        return { ...c, functions: c.functions.filter(f => f.id !== fnId) };
      }
      return c;
    }));
  };

  const updateFunctionName = (catId: string, fnId: string, name: string) => {
    setCategories(categories.map(c => {
      if (c.id === catId) {
        return {
          ...c,
          functions: c.functions.map(f => f.id === fnId ? { ...f, name } : f)
        };
      }
      return c;
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-slate-50 rounded-2xl shadow-xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border border-slate-200"
        >
          <div className="bg-white p-4 shrink-0 flex items-center justify-between border-b border-slate-200">
            <div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">
                Gerenciar Categorias e Funções
              </h2>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Adicione, remova e renomeie as categorias de escalas.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6">
            {categories.map((cat, index) => (
              <div key={cat.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <GripVertical className="w-4 h-4 text-slate-400 cursor-move" />
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => updateCategoryName(cat.id, e.target.value)}
                      className="bg-transparent font-bold text-slate-700 outline-none border-b border-transparent focus:border-indigo-400 focus:text-indigo-600 transition-colors w-full max-w-xs px-1"
                    />
                  </div>
                  <button
                    onClick={() => removeCategory(cat.id)}
                    className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                    title="Remover Categoria"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="p-4 bg-white space-y-2">
                  <div className="mb-4">
                    <span className="text-xs font-bold text-slate-500 block mb-1 uppercase tracking-wider">Coluna Ativo da Categoria</span>
                    <p className="text-xs text-slate-400">Esta categoria possui uma coluna de "ATIVO" principal dedicada aos militares nela alocados.</p>
                  </div>
                  
                  <span className="text-xs font-bold text-slate-500 block mb-1 uppercase tracking-wider mt-4">Funções (Opcional)</span>
                  {cat.functions.length === 0 ? (
                    <div className="text-center py-4 text-xs font-semibold text-slate-400 border border-dashed border-slate-200 rounded-lg">
                      Nenhuma função adicionada nesta categoria.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {cat.functions.map(fn => (
                        <div key={fn.id} className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden group">
                          <input
                            type="text"
                            value={fn.name}
                            onChange={(e) => updateFunctionName(cat.id, fn.id, e.target.value)}
                            className="bg-transparent text-sm font-semibold text-slate-600 outline-none w-full px-3 py-1.5 border-r border-slate-200 focus:bg-white"
                          />
                          <button
                            onClick={() => removeFunction(cat.id, fn.id)}
                            className="px-2 py-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="pt-2">
                    <button
                      onClick={() => addFunction(cat.id)}
                      className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Adicionar Função
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addCategory}
              className="w-full py-4 border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-all"
            >
              <Plus className="w-5 h-5" /> Adicionar Nova Categoria
            </button>
          </div>

          <div className="bg-white p-4 shrink-0 border-t border-slate-200 flex items-center justify-end shadow-sm gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 py-2.5 text-sm font-black flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
