import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, RasOpportunity, RasApplication } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { Plus, BriefcaseBusiness, Calendar, Clock, Users, ChevronDown, CheckCircle2, XCircle, Edit, Trash2, Settings, ArrowRight, Check, Sparkles, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { cn, normalizeObm, getUserObmAccess } from '../lib/utils';
import { parsePromotionDate, ALL_RANKS_IN_ORDER, parseRank, sortAllBySeniority } from '../lib/rankUtils';
import { useMilitars } from '../contexts/MilitarContext';
import { RankInsignia } from './RankInsignia';
import { RAS_FUNCTION_MAP, DEFAULT_VIATURAS } from '../constants';

interface RasManagerModuleProps {
  obmContext: string;
  user: UserProfile;
  onNavigateToEscala?: (date?: string) => void;
}

export function RasManagerModule({ obmContext, user, onNavigateToEscala }: RasManagerModuleProps) {
  const [opportunities, setOpportunities] = useState<RasOpportunity[]>([]);
  const [applications, setApplications] = useState<Record<string, RasApplication[]>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'oportunidades' | 'banco-horas'>('oportunidades');
  const [editingHoursRg, setEditingHoursRg] = useState<string | null>(null);
  const [editingHoursValue, setEditingHoursValue] = useState<number>(0);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info'; date?: string } | null>(null);
  const [formData, setFormData] = useState({
    date: '',
    duration: 24 as 12 | 24,
    local: '',
    description: '',
    functions: [] as string[],
    functionVacancies: {} as Record<string, number>,
    deadline: '',
  });

  const availableFunctions = [
    { id: 'condutorAbt', label: 'Condutor ABT' },
    { id: 'condutorAbsl', label: 'Condutor ABSL' },
    { id: 'condutorArc', label: 'Condutor ARC' },
    { id: 'condutorAse', label: 'Condutor ASE' },
    { id: 'condutorAr', label: 'Condutor AR' },
    { id: 'chefeAbt', label: 'Chefe ABT' },
    { id: 'chefeAbsl', label: 'Chefe ABSL' },
    { id: 'ativoMaritimo', label: 'Marítimo' },
    { id: 'mestreAl', label: 'Mestre AL' },
    { id: 'mestreBia', label: 'Mestre BIA' },
    { id: 'opAma', label: 'Op. AMA' },
    { id: 'gvAma', label: 'GV AMA' },
    { id: 'marinheiros', label: 'Marinheiros' },
    { id: 'ativoEnfermeiro', label: 'Enfermeiro' },
    { id: 'ativoComunicante', label: 'Comunicante' },
    { id: 'adjunto', label: 'Adjunto' },
    { id: 'auxRancho', label: 'Aux. Rancho' },
    { id: 'auxAbt', label: 'Aux. ABT' },
    { id: 'auxAbsl', label: 'Aux. ABSL' },
    { id: 'auxArc', label: 'Aux. ARC' },
    { id: 'auxAse', label: 'Aux. ASE' },
  ];

  useEffect(() => {
    if (!obmContext) return;
    const q = query(collection(db, 'ras_opportunities'), where('obm', '==', obmContext));
    const unsub = onSnapshot(q, (snap) => {
      const now = new Date();
      const opps = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RasOpportunity))
        .sort((a, b) => b.createdAt - a.createdAt);
      
      // Auto-close past opportunities
      opps.forEach(opp => {
        if (opp.status === 'open') {
          let shouldClose = false;
          if (opp.deadline) {
            if (new Date(opp.deadline) < now) shouldClose = true;
          } else if (opp.date) {
            const [year, month, day] = opp.date.split('-');
            const oppDate = new Date(Number(year), Number(month) - 1, Number(day));
            oppDate.setHours(23, 59, 59, 999);
            if (oppDate < now) shouldClose = true;
          }
          if (shouldClose) {
            updateDoc(doc(db, 'ras_opportunities', opp.id!), {
              status: 'closed',
              updatedAt: Date.now()
            }).catch(console.error);
          }
        }
      });
      
      setOpportunities(opps);
      
      // Fetch applications for these opps
      opps.forEach(opp => {
        const appQ = query(collection(db, 'ras_applications'), where('rasId', '==', opp.id));
        onSnapshot(appQ, (appSnap) => {
          const apps = appSnap.docs.map(d => ({ id: d.id, ...d.data() } as RasApplication));
          setApplications(prev => ({ ...prev, [opp.id!]: apps }));
        });
      });
    });
    return () => unsub();
  }, [obmContext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || formData.functions.length === 0) return;

    try {
      if (editingId) {
        await updateDoc(doc(db, 'ras_opportunities', editingId), {
          ...formData,
          updatedAt: Date.now(),
        });
      } else {
        await addDoc(collection(db, 'ras_opportunities'), {
          ...formData,
          obm: obmContext,
          status: 'open',
          createdBy: user.rg,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      setIsCreating(false);
      setEditingId(null);
      setFormData({
        date: '',
        duration: 24,
        local: '',
        description: '',
        functions: [],
        functionVacancies: {},
        deadline: '',
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditClick = (opp: RasOpportunity, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData({
      date: opp.date,
      duration: opp.duration,
      local: opp.local || '',
      description: opp.description || '',
      functions: opp.functions || [],
      functionVacancies: opp.functionVacancies || {},
      deadline: opp.deadline || '',
    });
    setEditingId(opp.id!);
    setIsCreating(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'ras_opportunities', id));
      const apps = applications[id] || [];
      for (const app of apps) {
         await deleteDoc(doc(db, 'ras_applications', app.id!));
      }
    } catch (err) {
      console.error(err);
    }
    setDeleteConfirmId(null);
  };

  const toggleFunction = (func: string) => {
    setFormData(prev => {
      const isSelected = prev.functions.includes(func);
      if (isSelected) {
        const newFunctions = prev.functions.filter(f => f !== func);
        const newVacancies = { ...prev.functionVacancies };
        delete newVacancies[func];
        return {
          ...prev,
          functions: newFunctions,
          functionVacancies: newVacancies
        };
      } else {
        return {
          ...prev,
          functions: [...prev.functions, func],
          functionVacancies: { ...prev.functionVacancies, [func]: 1 }
        };
      }
    });
  };

  const handleStatusChange = async (id: string, newStatus: 'open' | 'closed' | 'completed') => {
    try {
      await updateDoc(doc(db, 'ras_opportunities', id), {
        status: newStatus,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplicationStatus = async (app: RasApplication, opp: RasOpportunity, newStatus: 'selected' | 'rejected' | 'applied') => {
    try {
      const prevStatus = app.status;
      await updateDoc(doc(db, 'ras_applications', app.id!), {
        status: newStatus,
        updatedAt: Date.now(),
        ...(newStatus === 'selected' ? { selectedAt: Date.now(), selectedBy: user.rg } : {})
      });

      // Update hours in user's profile
      const userRef = doc(db, 'militaries', app.militarRg);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const currentHours = userData.rasHours || 0;
        let nextHours = currentHours;
        if (newStatus === 'selected' && prevStatus !== 'selected') {
          nextHours = currentHours + opp.duration;
        } else if (newStatus !== 'selected' && prevStatus === 'selected') {
          nextHours = Math.max(0, currentHours - opp.duration);
        }
        if (nextHours !== currentHours) {
          await updateDoc(userRef, { rasHours: nextHours });
        }
      }

      // Synchronize with Escala 24h for opp.date and opp.obm
      const targetObm = opp.obm || obmContext;
      const normalizedObm = targetObm.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const escalaRef = doc(db, `escala24h_${normalizedObm}`, opp.date);
      const escalaSnap = await getDoc(escalaRef);
      const mappedRole = app.functionId ? RAS_FUNCTION_MAP[app.functionId] : undefined;

      if (newStatus === 'selected') {
        if (escalaSnap.exists()) {
          const escalaData = escalaSnap.data();
          const manualRgs: string[] = escalaData.manuallyAddedRgs || [];
          const funcs: Record<string, string[]> = escalaData.selectedFunctions || {};

          let changed = false;
          if (!manualRgs.includes(app.militarRg)) {
            manualRgs.push(app.militarRg);
            changed = true;
          }
          if (mappedRole && (!funcs[app.militarRg] || funcs[app.militarRg].length === 0)) {
            funcs[app.militarRg] = [mappedRole];
            changed = true;
          }
          if (changed) {
            await updateDoc(escalaRef, {
              manuallyAddedRgs: manualRgs,
              selectedFunctions: funcs,
              updatedAt: Date.now()
            });
          }
        } else {
          await setDoc(escalaRef, {
            manuallyAddedRgs: [app.militarRg],
            selectedFunctions: mappedRole ? { [app.militarRg]: [mappedRole] } : {},
            viaturasInfo: DEFAULT_VIATURAS,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        }

        const milName = app.militarWarName || app.militarName;
        const [y, m, d] = opp.date.split('-');
        const dateFormatted = `${d}/${m}/${y}`;
        setNotification({
          message: `${app.militarRank} ${milName} (RG: ${app.militarRg}) contemplado e inserido na Escala 24h de ${dateFormatted}!`,
          type: 'success',
          date: opp.date
        });
      } else if (prevStatus === 'selected') {
        // If it was selected and is now unselected/rejected, clean up from escala24h manuallyAddedRgs
        if (escalaSnap.exists()) {
          const escalaData = escalaSnap.data();
          const manualRgs: string[] = escalaData.manuallyAddedRgs || [];
          const funcs: Record<string, string[]> = escalaData.selectedFunctions || {};

          const newManual = manualRgs.filter(rg => rg !== app.militarRg);
          const newFuncs = { ...funcs };
          if (mappedRole && newFuncs[app.militarRg]?.includes(mappedRole)) {
            newFuncs[app.militarRg] = newFuncs[app.militarRg].filter(f => f !== mappedRole);
            if (newFuncs[app.militarRg].length === 0) {
              delete newFuncs[app.militarRg];
            }
          }

          await updateDoc(escalaRef, {
            manuallyAddedRgs: newManual,
            selectedFunctions: newFuncs,
            updatedAt: Date.now()
          });
        }
      }
    } catch (err) {
      console.error("Error updating application status:", err);
    }
  };

  const handleDeferAllForFunction = async (opp: RasOpportunity, funcId: string, pendingEleitos: RasApplication[]) => {
    for (const app of pendingEleitos) {
      await handleApplicationStatus(app, opp, 'selected');
    }
  };

  // Ranking logic: fewer hours first, then seniority
  const getSortedApplications = (apps: RasApplication[]) => {
    return [...apps].sort((a, b) => {
      // We would need rasHours on the app or joined. Let's assume it's added during application
      const hoursA = (a as any).militarRasHours || 0;
      const hoursB = (b as any).militarRasHours || 0;
      
      if (hoursA !== hoursB) return hoursA - hoursB; // Less hours gets priority
      
      const mObjA = militars.find(m => m.rg === a.militarRg);
      const mObjB = militars.find(m => m.rg === b.militarRg);
      if (mObjA && mObjB) return sortAllBySeniority(mObjA, mObjB);
      
      return 0;
    });
  };

  const handleClearHours = async () => {
    try {
      const batch: Promise<void>[] = [];
      opportunities.forEach(opp => {
        if (opp.status === 'completed') {
          batch.push(deleteDoc(doc(db, 'ras_opportunities', opp.id!)));
          // Delete related applications too
          const apps = applications[opp.id!] || [];
          apps.forEach(app => {
            batch.push(deleteDoc(doc(db, 'ras_applications', app.id!)));
          });
        }
      });
      await Promise.all(batch);
      setShowClearConfirm(false);
    } catch (err) {
      console.error('Error clearing hours:', err);
    }
  };
  
  const handleSaveHours = async (rg: string) => {
    try {
      await addOrUpdateMilitar({ rg, rasHours: editingHoursValue });
      setEditingHoursRg(null);
    } catch (e) {
      console.error(e);
    }
  };

  const { militars, addOrUpdateMilitar } = useMilitars();

  const bancoDeHoras = useMemo(() => {
    const hoursMap: Record<string, { nome: string, rank: string, quadro: string, rg: string, horas: number, numServicos: number, militarObj?: UserProfile }> = {};

    // Initialize with all militaries in this OBM
    militars.forEach(m => {
      if (obmContext === 'GLOBAL' || normalizeObm(m.obm) === normalizeObm(obmContext) || normalizeObm(m.lentTo!) === normalizeObm(obmContext)) {
        hoursMap[m.rg!] = {
          nome: m.warName || m.name,
          rank: m.rank,
          quadro: m.quadro || '',
          rg: m.rg!,
          horas: m.rasHours || 0,
          numServicos: 0,
          militarObj: m
        };
      }
    });

    opportunities.forEach(opp => {
      if (opp.status === 'completed') {
        const oppApps = applications[opp.id!] || [];
        const sorted = getSortedApplications(oppApps);
        
        opp.functions.forEach(f => {
          const funcApps = sorted.filter(a => a.functionId === f);
          const limit = opp.functionVacancies?.[f] || opp.vacancies || 1;
          
          let usedVacancies = 0;

          const addHours = (app: RasApplication) => {
            if (!hoursMap[app.militarRg]) {
              const mObj = militars.find(m => m.rg === app.militarRg);
              hoursMap[app.militarRg] = {
                nome: app.militarWarName || app.militarName,
                rank: app.militarRank,
                quadro: app.militarQuadro || '',
                rg: app.militarRg,
                horas: mObj?.rasHours || 0,
                numServicos: 0,
                militarObj: mObj
              };
            }
            hoursMap[app.militarRg].numServicos += 1;
          };

          // Explicitly selected get priority
          funcApps.forEach(app => {
            if (app.status === 'selected') {
              usedVacancies++;
              addHours(app);
            }
          });

          // Remaining vacancies go to applied
          funcApps.forEach(app => {
            if (app.status === 'applied' && usedVacancies < limit) {
              usedVacancies++;
              addHours(app);
            }
          });
        });
      }
    });

    return Object.values(hoursMap).sort((a, b) => {
      if (a.militarObj && b.militarObj) {
        return sortAllBySeniority(a.militarObj, b.militarObj);
      }
      return 0;
    });
  }, [opportunities, applications, militars, obmContext]);

  return (
    <div className="space-y-6">
      {notification && (
        <div className="bg-emerald-600 text-white p-3.5 px-4 rounded-2xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
            <span className="text-xs font-black uppercase tracking-wide">{notification.message}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {notification.date && onNavigateToEscala && (
              <button
                onClick={() => onNavigateToEscala(notification.date)}
                className="bg-white text-emerald-800 hover:bg-emerald-50 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span>Ver na Escala 24h</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              title="Fechar"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('oportunidades')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'oportunidades' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Oportunidades
          </button>
          <button
            onClick={() => setActiveTab('banco-horas')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'banco-horas' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Banco de Horas
          </button>
        </div>
        
        {activeTab === 'oportunidades' && (
          <button 
            onClick={() => {
              if (isCreating) {
                setIsCreating(false);
                setEditingId(null);
                setFormData({ date: '', duration: 24, local: '', description: '', functions: [], functionVacancies: {}, deadline: '' });
              } else {
                setIsCreating(true);
              }
            }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors"
          >
            {isCreating ? <XCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isCreating ? 'Cancelar' : 'Nova Oportunidade'}
          </button>
        )}
      </div>

      {activeTab === 'banco-horas' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-start">
            <div>
              <h3 className="font-black text-slate-800 uppercase tracking-widest">Banco de Horas (Oportunidades Concluídas)</h3>
              <p className="text-xs text-slate-500 mt-1">Acúmulo de horas baseado nas oportunidades de RAS já finalizadas.</p>
            </div>
            <button 
              onClick={() => setShowClearConfirm(true)}
              className="p-2 bg-slate-200 text-slate-500 hover:bg-rose-100 hover:text-rose-600 rounded-full transition-colors"
              title="Limpar Horas"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          {bancoDeHoras.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-bold">Nenhum registro de horas acumuladas ainda.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {bancoDeHoras.map((m, index) => (
                <div key={m.rg} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs">
                      {index + 1}º
                    </div>
                    <div>
                      <div className="font-black text-slate-800">{m.rank} {m.quadro} {m.nome}</div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">
                        <span>RG: {m.rg}</span>
                        {m.militarObj && (m.militarObj.promotionDate || (m.militarObj.promotions && m.militarObj.promotions.length > 0)) && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span>
                              Promoção: {m.militarObj.promotionDate || m.militarObj.promotions?.[0]?.dataPromocao}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex items-center justify-end gap-3">
                    {editingHoursRg === m.rg ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          className="w-16 px-2 py-1 border-2 border-indigo-200 rounded-lg text-sm text-center outline-none focus:border-indigo-500 font-black text-indigo-700 bg-indigo-50"
                          value={editingHoursValue}
                          onChange={e => setEditingHoursValue(Number(e.target.value))}
                          autoFocus
                          onKeyDown={e => e.key === 'Enter' && handleSaveHours(m.rg)}
                        />
                        <button
                          onClick={() => handleSaveHours(m.rg)}
                          className="p-1.5 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 rounded-lg transition-colors"
                          title="Salvar"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingHoursRg(null)}
                          className="p-1.5 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
                          title="Cancelar"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-black text-indigo-600 text-lg">{m.horas}h</div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-widest">{m.numServicos} Serviço{m.numServicos > 1 || m.numServicos === 0 ? 's' : ''}</div>
                        </div>
                        <button
                          onClick={() => {
                            setEditingHoursValue(m.horas);
                            setEditingHoursRg(m.rg);
                          }}
                          className="p-1.5 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Editar Horas"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'oportunidades' && (
        <>
          <AnimatePresence>
        {isCreating && (
          <motion.form 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleSubmit}
            className="bg-slate-50 border border-indigo-100 p-6 rounded-2xl space-y-4 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Data do Serviço</label>
                <input 
                  type="date" 
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-indigo-400 outline-none text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Duração</label>
                <select 
                  value={formData.duration}
                  onChange={e => setFormData({...formData, duration: Number(e.target.value) as 12 | 24})}
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-indigo-400 outline-none text-sm bg-white"
                >
                  <option value={12}>12 Horas</option>
                  <option value={24}>24 Horas</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Local (OBM/Quartel)</label>
                <input 
                  type="text" 
                  value={formData.local}
                  onChange={e => setFormData({...formData, local: e.target.value})}
                  placeholder="Ex: 10º GBM, 1/10, 26º GBM..."
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-indigo-400 outline-none text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Descrição Adicional</label>
                <input 
                  type="text" 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Ex: Reforço ABT, Apoio Evento..."
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-indigo-400 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Prazo de Inscrição</label>
                <input 
                  type="datetime-local" 
                  value={formData.deadline}
                  onChange={e => setFormData({...formData, deadline: e.target.value})}
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-indigo-400 outline-none text-sm"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Funções Exigidas (Múltiplas escolhas)</label>
              <div className="flex flex-wrap gap-2">
                {availableFunctions.map(func => (
                  <button
                    key={func.id}
                    type="button"
                    onClick={() => toggleFunction(func.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border-2 text-[10px] font-bold uppercase tracking-widest transition-colors",
                      formData.functions.includes(func.id) 
                        ? "bg-indigo-100 border-indigo-600 text-indigo-700"
                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                    )}
                  >
                    {func.label}
                  </button>
                ))}
              </div>
            </div>

            {formData.functions.length > 0 && (
              <div className="pt-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Vagas por Função</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {formData.functions.map(funcId => (
                    <div key={funcId} className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                      <span className="flex-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest truncate">
                         {availableFunctions.find(f => f.id === funcId)?.label || funcId}
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={formData.functionVacancies[funcId] || 1}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          functionVacancies: {
                            ...prev.functionVacancies,
                            [funcId]: Number(e.target.value) || 1
                          }
                        }))}
                        className="w-16 px-2 py-1 border-2 border-slate-200 rounded-lg text-sm text-center outline-none focus:border-indigo-400 font-bold text-slate-700"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="pt-2 flex justify-end">
              <button 
                type="submit"
                className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-md"
              >
                {editingId ? 'Salvar Oportunidade' : 'Criar Oportunidade'}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {opportunities.map(opp => {
          const oppApps = applications[opp.id!] || [];
          const isExpanded = expandedId === opp.id;
          const sortedApps = getSortedApplications(oppApps);
          
          return (
            <div key={opp.id} className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              <div 
                className="p-4 cursor-pointer hover:bg-slate-50 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                onClick={() => setExpandedId(isExpanded ? null : opp.id!)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                    <BriefcaseBusiness className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-lg">{opp.date.split('-').reverse().join('/')}</h4>
                    <div className="flex gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {opp.duration}h</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {opp.functionVacancies ? Object.values(opp.functionVacancies).reduce((a, b) => a + b, 0) : opp.vacancies || 0} VAGAS</span>
                      {opp.deadline && (
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Prazo: {new Date(opp.deadline).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      )}
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-white",
                        opp.status === 'open' ? 'bg-emerald-500' : opp.status === 'closed' ? 'bg-slate-500' : 'bg-indigo-500'
                      )}>
                        {opp.status === 'open' ? 'Aberta' : opp.status === 'closed' ? 'Fechada' : 'Concluída'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row items-end md:items-center gap-4">
                  <div className="flex items-center gap-1.5 md:mr-4">
                    <button 
                      onClick={(e) => handleEditClick(opp, e)}
                      className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(opp.id!, e)}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="block text-xs font-black text-slate-800">{oppApps.length}</span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest">Interessados</span>
                    </div>
                    <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform", isExpanded && "rotate-180")} />
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t-2 border-slate-100 bg-slate-50"
                  >
                    <div className="p-4 space-y-4">
                      <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                        <span className="bg-slate-200 px-2 py-1 rounded">Local: {opp.local || 'N/A'}</span>
                        {opp.description && (
                          <span className="bg-slate-200 px-2 py-1 rounded">Descrição: {opp.description}</span>
                        )}
                        <span className="bg-slate-200 px-2 py-1 rounded">Funções: {opp.functions.map(f => availableFunctions.find(af => af.id === f)?.label || f).join(', ')}</span>
                      </div>

                      <div className="space-y-6">
                        {opp.functions.map(f => {
                          const funcApps = sortedApps.filter(app => app.functionId === f);
                          const funcLabel = availableFunctions.find(af => af.id === f)?.label || f;
                          
                          return (
                            <div key={f} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                              <div className="p-3 bg-slate-100 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Função: {funcLabel}</span>
                                  <span className="text-[9px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">{funcApps.length} Interessados</span>
                                  <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                                    Vagas: {opp.functionVacancies?.[f] || opp.vacancies || 1}
                                  </span>
                                </div>
                                {(() => {
                                  const vacancyLimit = opp.functionVacancies?.[f] || opp.vacancies || 1;
                                  const eleitosPending = funcApps.filter((app, index) => index < vacancyLimit && app.status === 'applied');
                                  if (eleitosPending.length > 0) {
                                    return (
                                      <button
                                        onClick={() => handleDeferAllForFunction(opp, f, eleitosPending)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-sm flex items-center gap-1 transition-all"
                                        title="Deferir todos os candidatos eleitos nesta função e incluir na Escala 24h"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Deferir Eleitos ({eleitosPending.length})
                                      </button>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                              <div className="flex flex-col gap-2 p-2">
                                {funcApps.length === 0 && (
                                  <div className="p-4 text-center text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhum interessado para esta função.</div>
                                )}
                                {funcApps.map((app, index) => {
                                  const vacancyLimit = opp.functionVacancies?.[f] || opp.vacancies || 1;
                                  const isPreviaEleito = index < vacancyLimit && app.status === 'applied';
                                  const isSelected = app.status === 'selected';
                                  const isRejected = app.status === 'rejected';

                                  return (
                                    <div 
                                      key={app.id} 
                                      className={cn(
                                        "p-4 border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl mx-1 mb-1 shadow-xs relative transition-all",
                                        isSelected 
                                          ? "bg-emerald-50/90 border-emerald-400 shadow-emerald-100" 
                                          : isRejected 
                                            ? "bg-rose-50/50 border-rose-200 opacity-60" 
                                            : isPreviaEleito 
                                              ? "bg-amber-50/70 border-amber-300 hover:bg-amber-50" 
                                              : "bg-white border-slate-200 hover:bg-slate-50"
                                      )}
                                    >
                                      {isPreviaEleito && (
                                        <div className="absolute -top-2.5 left-4 bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded shadow-sm border border-amber-600 z-10 flex items-center gap-1">
                                          <Sparkles className="w-2.5 h-2.5" />
                                          Eleito por Antiguidade / Horas (Prévia)
                                        </div>
                                      )}
                                      {isSelected && (
                                        <div className="absolute -top-2.5 left-4 bg-emerald-600 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded shadow-sm border border-emerald-700 z-10 flex items-center gap-1">
                                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                                          Contemplado na Escala 24h ({opp.date.split('-').reverse().join('/')})
                                        </div>
                                      )}

                                      <div className="flex items-center gap-3">
                                        <div className="origin-left shrink-0">
                                          <RankInsignia rankStr={app.militarRank} className="w-7 h-7" />
                                        </div>
                                        <div className="flex flex-col text-left">
                                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-0.5 flex items-center gap-1.5">
                                            {app.militarRank} {app.militarQuadro ? `(${app.militarQuadro})` : ''}
                                            {isSelected && (
                                              <span className="text-[8px] bg-emerald-200/80 text-emerald-800 px-1.5 py-0.2 rounded font-black">
                                                ESCALA 24H
                                              </span>
                                            )}
                                          </span>
                                          <span className="text-lg font-black text-slate-800 uppercase leading-none mb-1 tracking-tight">
                                            {app.militarWarName || app.militarName}
                                          </span>
                                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                            <span>RG: {app.militarRg}</span>
                                            {app.militarPromotionDate && (
                                              <>
                                                <span>•</span>
                                                <span>Prom: {app.militarPromotionDate}</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                                         <div className="flex items-center gap-2">
                                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Banco:</span>
                                           <div className="text-xs font-black text-slate-700 bg-white px-2.5 py-1 rounded-lg shadow-sm border border-slate-200">
                                             {(app as any).militarRasHours || 0}h
                                           </div>
                                         </div>

                                         <div className="flex items-center gap-2">
                                           {app.status === 'applied' && (
                                             <>
                                               <button 
                                                 onClick={() => handleApplicationStatus(app, opp, 'selected')} 
                                                 className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-all shadow-sm font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 active:scale-95" 
                                                 title="Deferir e incluir na Escala 24h"
                                               >
                                                 <CheckCircle2 className="w-4 h-4" />
                                                 Deferir / Contemplar
                                               </button>
                                               <button 
                                                 onClick={() => handleApplicationStatus(app, opp, 'rejected')} 
                                                 className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors font-bold" 
                                                 title="Indeferir"
                                               >
                                                 <XCircle className="w-4 h-4" />
                                               </button>
                                             </>
                                           )}
                                           {isSelected && (
                                             <div className="flex items-center gap-2">
                                               {onNavigateToEscala && (
                                                 <button
                                                   onClick={() => onNavigateToEscala(opp.date)}
                                                   className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border border-indigo-200 transition-colors"
                                                   title="Abrir a data desta oportunidade na Escala 24h"
                                                 >
                                                   <ExternalLink className="w-3 h-3" />
                                                   Ver na Escala 24h
                                                 </button>
                                               )}
                                               <button
                                                 onClick={() => handleApplicationStatus(app, opp, 'applied')}
                                                 className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors"
                                                 title="Reverter para análise"
                                               >
                                                 Reverter
                                               </button>
                                               <button
                                                 onClick={() => handleApplicationStatus(app, opp, 'rejected')}
                                                 className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg transition-colors"
                                                 title="Indeferir e retirar da Escala"
                                               >
                                                 <XCircle className="w-4 h-4" />
                                               </button>
                                             </div>
                                           )}
                                           {isRejected && (
                                             <div className="flex items-center gap-2">
                                               <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                                                 Indeferido
                                               </span>
                                               <button
                                                 onClick={() => handleApplicationStatus(app, opp, 'selected')}
                                                 className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors"
                                                 title="Deferir e incluir na Escala 24h"
                                               >
                                                 Deferir
                                               </button>
                                             </div>
                                           )}
                                         </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="flex justify-end items-center pt-2">
                        <div className="flex items-center gap-3">
                          {opp.status === 'open' && (
                            <button onClick={() => handleStatusChange(opp.id!, 'closed')} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
                              Fechar Inscrições
                            </button>
                          )}
                          {(opp.status === 'open' || opp.status === 'closed') && (
                            <button onClick={() => handleStatusChange(opp.id!, 'completed')} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors">
                              Finalizar Serviço
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
        {opportunities.length === 0 && (
           <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl">
             <BriefcaseBusiness className="w-12 h-12 text-slate-300 mx-auto mb-4" />
             <h3 className="font-black text-slate-400 uppercase tracking-widest">Nenhuma Oportunidade</h3>
             <p className="text-sm font-bold text-slate-400 mt-1">Crie a primeira oportunidade de RAS acima.</p>
           </div>
        )}
      </div>
      </>
      )}
      {deleteConfirmId && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-black text-slate-800 mb-2">Excluir Oportunidade</h3>
            <p className="text-sm text-slate-600 mb-6">Tem certeza que deseja excluir esta oportunidade? Todas as inscrições associadas também serão apagadas. Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => confirmDelete(deleteConfirmId)}
                className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showClearConfirm && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-black text-rose-600 mb-2">Limpar Banco de Horas</h3>
            <p className="text-sm text-slate-600 mb-6">Esta ação apagará permanentemente TODAS as oportunidades de RAS concluídas para este OBM. Tem certeza que deseja zerar o banco de horas?</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleClearHours}
                className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors"
              >
                Sim, Zerar Horas
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
