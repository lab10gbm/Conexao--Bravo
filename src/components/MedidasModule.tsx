import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Ruler, Shield, AlertCircle, Info, Database, Layout } from 'lucide-react';
import { UserProfile } from '../types';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
const medidasDgp: Record<string, any> = {};
const epiDgp: Record<string, any> = {};
import { DEFAULT_SOP_SCHEMA } from '../constants';
import { cleanUndefined } from "../lib/utils";

type EpiValue = { status: string; num: string; letter: string; cond: string };

const defaultEpi = (): EpiValue => ({ status: 'NÃO POSSUI', num: '', letter: '', cond: '' });

function parseEpiValue(val: string | undefined): EpiValue {
  if (!val) return defaultEpi();
  const upS = val.trim().toUpperCase();
  let status = 'POSSUI';
  let parseString = val;
  let cond = '';

  const conds = ['NOVO', 'BOM', 'RUIM', 'PRECÁRIO', 'PRECARIO'];
  for (const c of conds) {
    if (upS.includes(c)) {
      cond = c === 'PRECARIO' ? 'PRECÁRIO' : c;
      const regex = new RegExp(`(^|\\s)${c}(\\s|$)`, 'i');
      parseString = parseString.replace(regex, ' ');
      break;
    }
  }

  if (upS === 'NÃO POSSUI' || upS === 'NÃO' || upS === '-') {
    return { status: 'NÃO POSSUI', num: '', letter: '', cond: '' };
  } else if (upS === 'NÃO NECESSITA' || upS === 'N.N') {
    return { status: 'NÃO NECESSITA', num: '', letter: '', cond: '' };
  } else if (upS.includes('NÃO POSSUI')) {
    status = 'NÃO POSSUI';
    parseString = parseString.replace(/NÃO POSSUI/i, '');
  } else if (upS.includes('POSSUI')) {
    status = 'POSSUI';
    parseString = parseString.replace(/POSSUI/i, '');
  } else if (upS.includes('SIM')) {
    status = 'POSSUI';
    parseString = parseString.replace(/SIM/i, '');
  }
  
  let remainder = parseString.trim();
  if (remainder.startsWith(',') || remainder.startsWith('-')) {
     remainder = remainder.substring(1).trim();
  }
  
  const parts = remainder.split(',').map(x => x.trim()).filter(Boolean);
  let num = '';
  let letter = '';
  
  if (parts.length > 0) {
    for (const part of parts) {
      if (/^\d{1,3}$/.test(part)) num = part;
      else letter = part;
    }
  } else if (remainder) {
    const spaceParts = remainder.split(/\s+/).map(x => x.trim()).filter(Boolean);
    for (const part of spaceParts) {
       if (/^\d{1,3}$/.test(part)) num = part;
       else letter = part;
    }
    if (!num && !letter) {
      if (/^\d{1,3}$/.test(remainder)) num = remainder;
      else letter = remainder;
    }
  }
  
  if (num === '' && letter === '' && upS !== 'POSSUI' && upS !== 'SIM' && remainder.length > 0 && !remainder.includes('NÃO')) {
    letter = remainder.substring(0, 8);
  }
  
  return { status, num, letter, cond };
}

function serializeEpiValue(obj: EpiValue, type?: string): string {
  if (obj.status === 'NÃO NECESSITA') return obj.status;
  
  const parts = [];
  if (type !== 'unique') {
    if (obj.num) parts.push(obj.num);
    if (obj.letter) parts.push(obj.letter.toUpperCase());
  }
  if (obj.cond && obj.status === 'POSSUI') parts.push(obj.cond.toUpperCase());
  
  const sizeStr = parts.join(' ');
  
  if (obj.status === 'NÃO POSSUI') return sizeStr ? `NÃO POSSUI ${sizeStr}` : 'NÃO POSSUI';
  if (sizeStr) return sizeStr;
  return 'POSSUI';
}

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

interface MedidasModuleProps {
  user: UserProfile;
  onBack: () => void;
}

export function MedidasModule({ user, onBack }: MedidasModuleProps) {
  const [config, setConfig] = useState<SopConfig | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  
  // Dynamic form state
  const [formData, setFormData] = useState<Record<string, any>>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedData, setSavedData] = useState(false);
  const [source, setSource] = useState<'DGP' | 'PLATAFORMA'>('DGP');
  const [highlightAreas, setHighlightAreas] = useState<string[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!db || !user.rg) {
        setIsLoading(false);
        return;
      }
      try {
        let currentConfig: SopConfig;
        const configSnap = await getDoc(doc(db, 'config', 'sop_schema'));
        if (configSnap.exists()) {
          currentConfig = configSnap.data() as SopConfig;
          
          if (!currentConfig.areas.some(a => a.id === 'epi')) {
             currentConfig.areas.push({
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
        } else {
          // Fallback schema
          currentConfig = DEFAULT_SOP_SCHEMA;
        }
        
        if (currentConfig.areas) {
          currentConfig.areas = currentConfig.areas.filter(area => {
            const qbmps = (area.targetQBMPs || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
            const rgs = (area.targetRGs || '').split(',').map(s => s.trim()).filter(Boolean);
            
            if (qbmps.length === 0 && rgs.length === 0) return true;
            
            const userQuadro = (user.quadro || '').toUpperCase().trim();
            const userRg = (user.rg || '').trim();
            
            if (rgs.includes(userRg)) return true;
            if (qbmps.some(q => userQuadro.includes(q) || q.includes(userQuadro))) return true;
            
            return false;
          });
        }
        
        setConfig(currentConfig);
        if (currentConfig.areas.length > 0) {
          setActiveTab(currentConfig.areas[0].id);
        }

        const rgStr = user.rg.toString().padStart(5, '0');
        const docRef = doc(db, 'medidasAntropometricas', rgStr);
        
        let initialData: Record<string, any> = {};
        
        import('firebase/firestore').then(({ onSnapshot }) => {
          onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              currentConfig.areas.forEach(area => {
                area.fields.forEach(f => {
                  if (area.id !== 'fardamento') {
                    initialData[f.id] = parseEpiValue(data[f.id]);
                  } else {
                    initialData[f.id] = data[f.id] || '';
                  }
                });
              });
              setFormData({...initialData});
              setSource('PLATAFORMA');
            } else {
              const dgpData = medidasDgp[rgStr] || {};
              const epiData = epiDgp[rgStr] || {};
              currentConfig.areas.forEach(area => {
                area.fields.forEach(f => {
                  if (area.id !== 'fardamento') {
                    const val = (epiData as any)[f.id] || 'NÃO POSSUI';
                    initialData[f.id] = parseEpiValue(val);
                  } else {
                    initialData[f.id] = (dgpData as any)[f.id] || (dgpData as any)[f.label.toLowerCase()] || '';
                  }
                });
              });
              setFormData({...initialData});
              setSource('DGP');
            }
            
            // Check EPI request
            getDoc(doc(db, 'config', 'epi_request')).then((epiMap) => {
              if (epiMap.exists()) {
                const reqData = epiMap.data();
                if (reqData.isActive && reqData.requestedAt) {
                  let needsUpdate = true;
                  if (docSnap.exists()) {
                    const userData = docSnap.data();
                    if (userData.updatedAt) {
                       const reqDate = new Date(reqData.requestedAt).getTime();
                       const updateDate = new Date(userData.updatedAt).getTime();
                       if (updateDate >= reqDate) {
                         needsUpdate = false;
                       }
                    }
                  }
                  if (needsUpdate && reqData.targetAreas && Array.isArray(reqData.targetAreas)) {
                    setHighlightAreas(reqData.targetAreas);
                    // Optionally set active tab to the first highlighted area
                    if (reqData.targetAreas.length > 0) {
                      setActiveTab(reqData.targetAreas[0]);
                    }
                  } else {
                    setHighlightAreas([]);
                  }
                }
              }
            }).catch(console.error).finally(() => {
              setIsLoading(false);
            });
            
          }, (error) => {
            console.error("Error fetching realtime medidas:", error);
            setIsLoading(false);
          });
        });

      } catch (error) {
        console.error("Error fetching config:", error);
        setIsLoading(false);
      }
    }
    fetchData();
  }, [user.rg]);

  const handleSave = async () => {
    if (!db || !user.rg || !config) return;
    setIsSaving(true);
    try {
      const rgStr = user.rg.toString().padStart(5, '0');
      const docRef = doc(db, 'medidasAntropometricas', rgStr);
      const dataToSave: Record<string, any> = {
        updatedAt: new Date().toISOString(),
        updatedBy: rgStr
      };
      
      config.areas.forEach(area => {
        area.fields.forEach(f => {
          if (area.id !== 'fardamento') {
             dataToSave[f.id] = formData[f.id] ? serializeEpiValue(formData[f.id], f.type) : '';
          } else {
             if (formData[f.id] === 'NÃO NECESSITA') {
               dataToSave[f.id] = 'NÃO NECESSITA';
             } else {
               dataToSave[f.id] = f.type === 'unique' ? 'TAMANHO ÚNICO' : (formData[f.id] || '');
             }
          }
        });
      });
      
      await setDoc(docRef, cleanUndefined(dataToSave), { merge: true });
      setSource('PLATAFORMA');
      setSavedData(true);
      setHighlightAreas([]);
      setTimeout(() => setSavedData(false), 3000);
    } catch (error) {
      console.error("Error saving medidas:", error);
    }
    setIsSaving(false);
  };

  const updateFieldStr = (id: string, val: string) => {
    setFormData(prev => ({ ...prev, [id]: val }));
  };

  const updateFieldEpi = (id: string, val: EpiValue) => {
    setFormData(prev => ({ ...prev, [id]: val }));
  };

  const EpiInputGroup = ({ label, value, setter, type }: { label: string, value: EpiValue, setter: (v: EpiValue) => void, type?: string }) => {
    return (
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
        <label className="text-[10px] uppercase tracking-widest font-black text-slate-700">{label}</label>
        
        <div className="flex gap-2 w-full">
          <select 
            value={value?.status || 'NÃO POSSUI'}
            onChange={(e) => setter({ ...(value || defaultEpi()), status: e.target.value })}
            className={`flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black outline-none transition-colors ${(value?.status || '') === 'POSSUI' ? 'text-emerald-600 border-emerald-200 bg-emerald-50/50' : 'text-slate-500'}`}
          >
            <option value="POSSUI">POSSUI</option>
            <option value="NÃO POSSUI">NÃO POSSUI</option>
          </select>
        </div>
        
        <div className="flex flex-col gap-3 mt-1 animate-in fade-in slide-in-from-top-2 duration-200">
          {type !== 'unique' && (
            <div className="flex gap-2 w-full">
              <div className="flex-1 space-y-1">
                 <label className="text-[9px] uppercase font-bold text-slate-400 pl-1">Número</label>
                 <select 
                   value={value?.num || ''}
                   onChange={(e) => setter({ ...value, num: e.target.value })}
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-cyan-500 transition-colors cursor-pointer"
                 >
                   <option value="">Selecione...</option>
                   <option value="T. ÚNICO">T. ÚNICO</option>
                   {Array.from({length: 30}, (_, i) => 32 + i).map(n => (
                     <option key={n} value={n.toString()}>{n}</option>
                   ))}
                 </select>
              </div>
              <div className="flex-1 space-y-1">
                 <label className="text-[9px] uppercase font-bold text-slate-400 pl-1">Letra</label>
                 <select 
                   value={value?.letter || ''}
                   onChange={(e) => setter({ ...value, letter: e.target.value })}
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-cyan-500 transition-colors uppercase cursor-pointer"
                 >
                   <option value="">Selecione...</option>
                   <option value="T. ÚNICO">T. ÚNICO</option>
                   {["PP", "P", "M", "G", "GG", "XG", "XXG", "EXG"].map(opt => (
                     <option key={opt} value={opt}>{opt}</option>
                   ))}
                 </select>
              </div>
            </div>
          )}
          
          {value?.status === 'POSSUI' && (
            <div className="w-full space-y-1 mt-1">
               <label className="text-[9px] uppercase font-bold text-slate-400 pl-1">Estado</label>
               <select 
                 value={value?.cond || ''}
                 onChange={(e) => setter({ ...value, cond: e.target.value })}
                 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-cyan-500 transition-colors cursor-pointer"
               >
                 <option value="">Informe o estado...</option>
                 <option value="NOVO">NOVO</option>
                 <option value="BOM">BOM</option>
                 <option value="RUIM">RUIM</option>
                 <option value="PRECÁRIO">PRECÁRIO</option>
               </select>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto min-h-[60vh] pb-12">
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-cyan-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar ao Portal Principal
        </button>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 opacity-60 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-6">
            <div className="flex gap-4 items-center">
               <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center text-cyan-600">
                  <Ruler className="w-6 h-6" />
               </div>
               <div>
                 <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Carga Individual</h2>
                 <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Medidas de Fardamento e Distribuição de EPIs</p>
               </div>
            </div>

            {config && config.areas.length > 0 && (
              <div className="flex bg-slate-100 p-1 rounded-xl self-start overflow-x-auto no-scrollbar max-w-full">
                {config.areas.map(area => (
                  <button
                    key={area.id}
                    onClick={() => setActiveTab(area.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap relative ${activeTab === area.id ? 'bg-white shadow-sm text-cyan-700' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {highlightAreas.includes(area.id) && (
                       <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-pulse border-2 border-slate-100"></span>
                    )}
                    {area.id === 'epi' ? <Shield className="w-4 h-4" /> : <Layout className="w-4 h-4" />}
                    {area.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={`p-4 rounded-xl border mb-8 flex gap-4 items-start ${source === 'DGP' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
            {source === 'DGP' ? (
               <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            ) : (
               <Database className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            )}
            <div>
               <h4 className={`text-sm font-black uppercase tracking-tight ${source === 'DGP' ? 'text-amber-800' : 'text-emerald-800'}`}>
                 {source === 'DGP' ? 'Atenção: Dados Atuais Importados da DGP' : 'Ótimo! Dados Cadastrados na Plataforma'}
               </h4>
               <p className={`text-xs font-medium mt-1 leading-relaxed ${source === 'DGP' ? 'text-amber-700/80' : 'text-emerald-700/80'}`}>
                 {source === 'DGP' 
                   ? 'As informações abaixo foram pré-inseridas através da última planilha enviada pela DGP. Por favor, verifique se estão corretas e faça as alterações necessárias, em seguida clique em salvar para registrar sua confirmação no sistema.'
                   : 'Suas medidas e registros de EPI foram validados e salvos de forma persistente através do sistema. Você pode modificá-las a qualquer momento que for necessário.'}
               </p>
            </div>
          </div>

          {isLoading || !config ? (
            <div className="animate-pulse flex flex-col gap-4">
              <div className="h-12 bg-slate-100 rounded-xl"></div>
              <div className="h-12 bg-slate-100 rounded-xl"></div>
              <div className="h-12 bg-slate-100 rounded-xl"></div>
              <div className="h-12 bg-slate-100 rounded-xl"></div>
            </div>
          ) : (
             <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 relative overflow-visible flex-1">
                {config.areas.map(area => {
                  if (area.id !== activeTab) return null;
                  
                  if (area.id !== 'fardamento') {
                    const visibleEpiFields = area.fields.filter(f => {
                      const val = formData[f.id] as EpiValue | undefined;
                      return val?.status !== 'NÃO NECESSITA';
                    });

                    if (visibleEpiFields.length === 0) {
                      return (
                        <div key={area.id} className="text-sm font-bold text-slate-500 animate-in fade-in py-8 text-center bg-slate-100/50 rounded-xl border border-dashed border-slate-300">
                          Todos os itens desta seção estão marcados como não necessários.
                        </div>
                      );
                    }

                    return (
                      <div key={area.id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-200">
                         {visibleEpiFields.map(f => (
                           <EpiInputGroup 
                             key={f.id} 
                             label={f.label} 
                             value={formData[f.id] || defaultEpi()} 
                             setter={(val) => updateFieldEpi(f.id, val)} 
                             type={f.type}
                           />
                         ))}
                      </div>
                    );
                  }
                  
                  const visibleTextFields = area.fields.filter(f => formData[f.id] !== 'NÃO NECESSITA');

                  if (visibleTextFields.length === 0) {
                    return (
                      <div key={area.id} className="text-sm font-bold text-slate-500 animate-in fade-in py-8 text-center bg-slate-100/50 rounded-xl border border-dashed border-slate-300">
                        Todos os itens desta seção estão marcados como não necessários.
                      </div>
                    );
                  }

                  return (
                    <div key={area.id} className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-200">
                      {visibleTextFields.map(f => (
                        <div key={f.id} className="space-y-2 relative">
                          <label className="text-[10px] uppercase tracking-widest font-black text-slate-500 ml-1">{f.label}</label>
                          {f.type === 'unique' ? (
                            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-emerald-600 shadow-sm flex items-center justify-center">
                              Tamanho Único
                            </div>
                          ) : (
                            <select
                              value={formData[f.id] || ''}
                              onChange={(e) => updateFieldStr(f.id, e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-lg font-bold text-slate-700 outline-none focus:border-cyan-500 transition-colors shadow-sm cursor-pointer"
                            >
                              <option value="">Selecione...</option>
                              <option value="NÃO POSSUI">NÃO POSSUI</option>
                              {f.type === 'letter' && ["PP", "P", "M", "G", "GG", "XG", "XXG", "EXG"].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              {f.type === 'number' && Array.from({length: 30}, (_, i) => 32 + i).map(n => <option key={n} value={n.toString()}>{n}</option>)}
                              {f.type !== 'letter' && f.type !== 'number' && ["PP", "P", "M", "G", "GG", "XG", "XXG", "EXG"].map(opt => <option key={opt} value={`Tamanho ${opt}`}>Tamanho {opt}</option>)}
                              {f.type !== 'letter' && f.type !== 'number' && Array.from({length: 30}, (_, i) => 32 + i).map(n => <option key={`num-${n}`} value={n.toString()}>{n}</option>)}
                            </select>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
             </div>
          )}

          <div className="mt-8 flex justify-end shrink-0">
            <button 
              onClick={handleSave} 
              disabled={isLoading || isSaving}
              className="flex items-center gap-3 bg-cyan-600 text-white px-8 py-3.5 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-cyan-700 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>Salvando...</>
              ) : savedData ? (
                <>
                  <Check className="w-5 h-5" />
                  Atualizado com Sucesso
                </>
              ) : (
                <>Confirmar Informações</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

