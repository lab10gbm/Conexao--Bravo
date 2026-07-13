import React, { useState, useEffect } from 'react';
import { UserProfile, RasOpportunity, RasApplication } from '../types';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, getDocs } from 'firebase/firestore';
import { BriefcaseBusiness, Clock, Users, ArrowRight, CheckCircle2, History, ChevronDown, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { getAuth } from 'firebase/auth';
import { parsePromotionDate, ALL_RANKS_IN_ORDER, parseRank } from '../lib/rankUtils';

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

interface RasClientModuleProps {
  user: UserProfile;
  obmContext: string;
}

export function RasClientModule({ user, obmContext }: RasClientModuleProps) {
  const [opportunities, setOpportunities] = useState<RasOpportunity[]>([]);
  const [applicationsByRas, setApplicationsByRas] = useState<Record<string, RasApplication[]>>({});
  const [myApplications, setMyApplications] = useState<RasApplication[]>([]);

  useEffect(() => {
    // Fetch open opportunities
    const qOpps = query(
      collection(db, 'ras_opportunities'), 
      where('obm', '==', obmContext),
      where('status', '==', 'open')
    );
    const unsubOpps = onSnapshot(qOpps, (snap) => {
      const opps = snap.docs.map(d => ({ id: d.id, ...d.data() } as RasOpportunity)).sort((a,b) => b.createdAt - a.createdAt);
      setOpportunities(opps);
      
      // Fetch applications for these open opportunities to build public lists
      opps.forEach(opp => {
        const appQ = query(collection(db, 'ras_applications'), where('rasId', '==', opp.id));
        onSnapshot(appQ, (appSnap) => {
          const apps = appSnap.docs.map(d => ({ id: d.id, ...d.data() } as RasApplication));
          setApplicationsByRas(prev => ({ ...prev, [opp.id!]: apps }));
        });
      });
    });

    // Fetch user's applications for history
    const qApps = query(
      collection(db, 'ras_applications'),
      where('militarRg', '==', user.rg)
    );
    const unsubApps = onSnapshot(qApps, (snap) => {
      setMyApplications(snap.docs.map(d => ({ id: d.id, ...d.data() } as RasApplication)));
    });

    return () => {
      unsubOpps();
      unsubApps();
    };
  }, [obmContext, user.rg]);

  const handleApply = async (opp: RasOpportunity, functionId: string) => {
    // Basic validation to check if already applied for this specific function
    if (myApplications.some(app => app.rasId === opp.id && app.functionId === functionId)) return;

    try {
      await addDoc(collection(db, 'ras_applications'), {
        rasId: opp.id,
        functionId: functionId,
        militarId: user.uid || '',
        militarRg: user.rg,
        militarName: user.name,
        militarWarName: user.warName || '',
        militarQuadro: user.quadro || '',
        militarRank: user.rank,
        militarPromotionDate: user.promotionDate || '',
        militarRasHours: user.rasHours || 0, // capture snapshot of hours
        status: 'applied',
        appliedAt: Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const hasAppliedForFunction = (oppId: string, functionId: string) => 
    myApplications.some(app => app.rasId === oppId && app.functionId === functionId);

  const getSortedApplications = (apps: RasApplication[]) => {
    return [...apps].sort((a, b) => {
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
    <div className="max-w-4xl mx-auto w-full space-y-6">
      
      {/* Header Card */}
      <div className="bg-white rounded-[2rem] p-8 border-2 border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200 shrink-0">
            <BriefcaseBusiness className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 uppercase tracking-tight">Portal RAS</h1>
            <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Regime Adicional de Serviço</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 relative z-10">
          <History className="w-8 h-8 text-amber-500" />
          <div>
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Suas Horas Acumuladas</div>
            <div className="text-2xl font-black text-slate-800">{user.rasHours || 0}<span className="text-sm ml-1 text-slate-500">h</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <BriefcaseBusiness className="w-4 h-4 text-amber-500" /> Oportunidades Abertas
          </h2>
          
          <div className="space-y-4">
            {opportunities.map(opp => {
              const oppApps = applicationsByRas[opp.id!] || [];
              
              return (
                <div key={opp.id} className="bg-white border-2 border-slate-100 rounded-2xl p-5 sm:p-6 shadow-sm hover:border-amber-100 hover:shadow-md transition-all group">
                  <div className="flex flex-col justify-between gap-4 border-b-2 border-slate-50 pb-4 mb-4">
                    <div>
                      <h3 className="font-black text-slate-800 text-xl">{opp.date.split('-').reverse().join('/')}</h3>
                      {opp.local && (
                        <div className="text-xs font-bold text-slate-600 mt-1 uppercase tracking-widest bg-slate-100 w-max px-2 py-1 rounded">
                          Local: {opp.local}
                        </div>
                      )}
                      <div className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-widest">
                        {opp.description || 'Serviço de Reforço'}
                      </div>
                      
                      <div className="flex gap-4 mt-4">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                          <Clock className="w-3.5 h-3.5 text-amber-500" /> {opp.duration} Horas
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                          <Users className="w-3.5 h-3.5 text-indigo-500" /> {opp.functionVacancies ? Object.values(opp.functionVacancies).reduce((a, b) => a + b, 0) : opp.vacancies || 0} Vagas
                        </div>
                        {opp.deadline && (
                          <div className={cn(
                            "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border",
                            new Date() > new Date(opp.deadline) 
                              ? "bg-red-50 text-red-500 border-red-100" 
                              : "bg-slate-50 text-slate-500 border-slate-100"
                          )}>
                            <Clock className="w-3.5 h-3.5" /> Prazo: {new Date(opp.deadline).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Vagas Disponíveis por Função</h4>
                    {opp.functions.map(f => {
                      const funcApps = oppApps.filter(app => app.functionId === f);
                      const sortedApps = getSortedApplications(funcApps);
                      const applied = hasAppliedForFunction(opp.id!, f);
                      const funcLabel = availableFunctions.find(af => af.id === f)?.label || f;
                      const isPastDeadline = opp.deadline ? new Date() > new Date(opp.deadline) : false;

                      return (
                        <div key={f} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                            <div className="font-black text-slate-700 uppercase tracking-widest text-xs">
                              {funcLabel}
                            </div>
                            
                            <div className="shrink-0">
                              {applied ? (
                                <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 w-max">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span className="text-[9px] font-black uppercase tracking-widest">Inscrito</span>
                                </div>
                              ) : isPastDeadline ? (
                                <div className="flex items-center gap-1 text-red-500 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 w-max opacity-80">
                                  <XCircle className="w-4 h-4" />
                                  <span className="text-[9px] font-black uppercase tracking-widest">Prazo Encerrado</span>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => handleApply(opp, f)}
                                  className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-amber-500 transition-colors shadow-sm"
                                >
                                  <span className="text-[9px] font-black uppercase tracking-widest">Candidatar-se</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 border-t border-slate-200 pt-3">
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
                              <span>Militares Interessados ({sortedApps.length})</span>
                            </div>
                            {sortedApps.length > 0 ? (
                              <div className="flex flex-col gap-2">
                                {sortedApps.map((app, index) => (
                                  <div key={app.id} className="p-4 border-b border-slate-100 last:border-0 flex items-center justify-between bg-[#ffeceb] hover:bg-[#ffe1e0] transition-colors rounded-lg shadow-sm relative">
                                    {index < (opp.functionVacancies?.[f] || opp.vacancies || 1) && app.status === 'applied' && (
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
                                       <div className="flex items-center gap-1 mt-1">
                                          <span className={cn(
                                            "w-2 h-2 rounded-full",
                                            app.status === 'applied' ? "bg-amber-400" :
                                            app.status === 'selected' ? "bg-emerald-500" : "bg-red-500"
                                          )}></span>
                                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                            {app.status === 'applied' ? 'Em Análise' :
                                             app.status === 'selected' ? 'Selecionado' : 'Não Selecionado'}
                                          </span>
                                       </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-[9px] font-bold text-slate-400 italic">Nenhum candidato ainda.</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            
            {opportunities.length === 0 && (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                  <BriefcaseBusiness className="w-8 h-8 text-slate-300" />
                </div>
                <h4 className="font-black text-slate-500 uppercase tracking-widest">Nenhuma oportunidade aberta</h4>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">No momento não há vagas de RAS disponíveis no {obmContext}.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-500" /> Seu Histórico
          </h2>
          
          <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
            {myApplications.length === 0 && (
              <div className="text-center py-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
                Você ainda não se inscreveu em nenhum RAS.
              </div>
            )}
            
            {myApplications.map(app => {
              const funcLabel = availableFunctions.find(af => af.id === app.functionId)?.label || app.functionId || 'Geral';
              return (
                <div key={app.id} className="border-b border-slate-100 last:border-0 pb-4 last:pb-0">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status:</span>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded text-white",
                      app.status === 'applied' ? "bg-amber-400" :
                      app.status === 'selected' ? "bg-emerald-500" : "bg-rose-500"
                    )}>
                      {app.status === 'applied' ? 'Em Análise' :
                       app.status === 'selected' ? 'Selecionado' : 'Não Selecionado'}
                    </span>
                  </div>
                  <div className="text-sm font-black text-slate-800">Inscrição #{app.id?.slice(0,5).toUpperCase()}</div>
                  <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">
                    Função: {funcLabel}
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Data da Inscrição: {new Date(app.appliedAt).toLocaleDateString()}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
