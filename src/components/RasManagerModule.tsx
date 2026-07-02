import React, { useState, useEffect } from 'react';
import { UserProfile, RasOpportunity, RasApplication } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { Plus, BriefcaseBusiness, Calendar, Clock, Users, ChevronDown, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { parsePromotionDate, ALL_RANKS_IN_ORDER, parseRank } from '../lib/rankUtils';

interface RasManagerModuleProps {
  obmContext: string;
  user: UserProfile;
}

export function RasManagerModule({ obmContext, user }: RasManagerModuleProps) {
  const [opportunities, setOpportunities] = useState<RasOpportunity[]>([]);
  const [applications, setApplications] = useState<Record<string, RasApplication[]>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: '',
    duration: 24 as 12 | 24,
    description: '',
    functions: [] as string[],
    vacancies: 1,
  });

  const availableFunctions = [
    { id: 'ativoCondutor', label: 'Condutor (Geral)' },
    { id: 'condutorAbt', label: 'Condutor ABT' },
    { id: 'condutorAbsl', label: 'Condutor ABSL' },
    { id: 'condutorArc', label: 'Condutor ARC' },
    { id: 'condutorAse', label: 'Condutor ASE' },
    { id: 'condutorAr', label: 'Condutor AR' },
    { id: 'ativoChefeGua', label: 'Chefe de Guarnição' },
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
      const opps = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RasOpportunity))
        .sort((a, b) => b.createdAt - a.createdAt);
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || formData.functions.length === 0) return;

    try {
      await addDoc(collection(db, 'ras_opportunities'), {
        ...formData,
        obm: obmContext,
        status: 'open',
        createdBy: user.rg,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setIsCreating(false);
      setFormData({
        date: '',
        duration: 24,
        description: '',
        functions: [],
        vacancies: 1,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const toggleFunction = (func: string) => {
    setFormData(prev => ({
      ...prev,
      functions: prev.functions.includes(func) 
        ? prev.functions.filter(f => f !== func)
        : [...prev.functions, func]
    }));
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

  const handleApplicationStatus = async (app: RasApplication, opp: RasOpportunity, newStatus: 'selected' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'ras_applications', app.id!), {
        status: newStatus
      });

      // Update hours if selected
      if (newStatus === 'selected') {
        const userRef = doc(db, 'militaries', app.militarRg);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const currentHours = userData.rasHours || 0;
          await updateDoc(userRef, {
            rasHours: currentHours + opp.duration
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Ranking logic: fewer hours first, then seniority
  const getSortedApplications = (apps: RasApplication[]) => {
    return [...apps].sort((a, b) => {
      // We would need rasHours on the app or joined. Let's assume it's added during application
      const hoursA = (a as any).militarRasHours || 0;
      const hoursB = (b as any).militarRasHours || 0;
      
      if (hoursA !== hoursB) return hoursA - hoursB; // Less hours gets priority
      
      // Tie breaker 1: Rank (Graduação)
      const rankA = ALL_RANKS_IN_ORDER.indexOf(parseRank(a.militarRank));
      const rankB = ALL_RANKS_IN_ORDER.indexOf(parseRank(b.militarRank));
      const rA = rankA >= 0 ? rankA : 99;
      const rB = rankB >= 0 ? rankB : 99;
      if (rA !== rB) return rA - rB;

      // Tie breaker 2: Seniority (Data de Promoção)
      const dateA = a.militarPromotionDate || '';
      const dateB = b.militarPromotionDate || '';
      const timeA = parsePromotionDate(dateA);
      const timeB = parsePromotionDate(dateB);
      if (timeA !== timeB && timeA !== 0 && timeB !== 0) return timeA - timeB; // Older promotion date first
      
      // Tie breaker 3: RG
      const rgA = parseInt((a.militarRg || '').replace(/\D/g, '') || '0', 10);
      const rgB = parseInt((b.militarRg || '').replace(/\D/g, '') || '0', 10);
      return rgA - rgB;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-black text-slate-800 uppercase tracking-widest text-lg">Oportunidades RAS</h3>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors"
        >
          {isCreating ? <XCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isCreating ? 'Cancelar' : 'Nova Oportunidade'}
        </button>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.form 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleCreate}
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
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Vagas</label>
                <input 
                  type="number" 
                  min="1"
                  value={formData.vacancies}
                  onChange={e => setFormData({...formData, vacancies: Number(e.target.value)})}
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-indigo-400 outline-none text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Descrição / Local</label>
                <input 
                  type="text" 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Ex: Reforço ABT, Apoio Evento..."
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-indigo-400 outline-none text-sm"
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
            
            <div className="pt-2 flex justify-end">
              <button 
                type="submit"
                className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-md"
              >
                Criar Oportunidade
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
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {opp.vacancies} VAGAS</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-white",
                        opp.status === 'open' ? 'bg-emerald-500' : opp.status === 'closed' ? 'bg-slate-500' : 'bg-indigo-500'
                      )}>
                        {opp.status === 'open' ? 'Aberta' : opp.status === 'closed' ? 'Fechada' : 'Concluída'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="block text-xs font-black text-slate-800">{oppApps.length}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest">Interessados</span>
                  </div>
                  <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform", isExpanded && "rotate-180")} />
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
                        <span className="bg-slate-200 px-2 py-1 rounded">Descrição: {opp.description || 'N/A'}</span>
                        <span className="bg-slate-200 px-2 py-1 rounded">Funções: {opp.functions.map(f => availableFunctions.find(af => af.id === f)?.label || f).join(', ')}</span>
                      </div>

                      <div className="space-y-6">
                        {opp.functions.map(f => {
                          const funcApps = sortedApps.filter(app => app.functionId === f);
                          const funcLabel = availableFunctions.find(af => af.id === f)?.label || f;
                          
                          return (
                            <div key={f} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                              <div className="p-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Função: {funcLabel}</span>
                                <span className="text-[9px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">{funcApps.length} Interessados</span>
                              </div>
                              <div className="flex flex-col gap-2">
                                {funcApps.length === 0 && (
                                  <div className="p-4 text-center text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhum interessado para esta função.</div>
                                )}
                                {funcApps.map((app, index) => (
                                  <div key={app.id} className="p-4 border-b border-slate-100 last:border-0 flex items-center justify-between bg-[#ffeceb] hover:bg-[#ffe1e0] transition-colors rounded-lg mx-2 mb-2 shadow-sm relative">
                                    {index < (opp.vacancies || 1) && app.status === 'applied' && (
                                      <div className="absolute -top-2 left-4 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm border border-emerald-600 z-10">
                                        Eleito (Prévia)
                                      </div>
                                    )}
                                    <div className="flex items-center gap-4">
                                      <ChevronDown className="w-6 h-6 text-rose-400 stroke-[3]" />
                                      <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-0.5">
                                          {app.militarRank} {app.militarQuadro ? `${app.militarQuadro}` : ''}
                                        </span>
                                        <span className="text-xl font-black text-slate-800 uppercase leading-none mb-1">
                                          {app.militarWarName || app.militarName}
                                        </span>
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">RG: {app.militarRg}</span>
                                      </div>
                                    </div>
                                    
                                    <div className="flex flex-col items-end gap-2">
                                       <div className="flex items-center gap-2">
                                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Horas:</span>
                                         <div className="text-sm font-black text-slate-700 bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-200">
                                           {(app as any).militarRasHours || 0}h
                                         </div>
                                       </div>
                                       <div className="flex items-center gap-2 mt-1">
                                         {app.status === 'applied' && (
                                           <>
                                             <button onClick={() => handleApplicationStatus(app, opp, 'selected')} className="p-1.5 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 rounded-lg transition-colors" title="Aprovar">
                                               <CheckCircle2 className="w-5 h-5" />
                                             </button>
                                             <button onClick={() => handleApplicationStatus(app, opp, 'rejected')} className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors" title="Rejeitar">
                                               <XCircle className="w-5 h-5" />
                                             </button>
                                           </>
                                         )}
                                         {app.status !== 'applied' && (
                                            <span className={cn(
                                              "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full",
                                              app.status === 'selected' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                            )}>
                                              {app.status === 'selected' ? 'Selecionado' : 'Rejeitado'}
                                            </span>
                                         )}
                                       </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
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
    </div>
  );
}
