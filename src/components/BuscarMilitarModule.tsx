import React, { useState, useMemo, useDeferredValue, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronLeft, User, Building2, Contact, Mail, Phone, MapPin, MapPinned, Calendar, Briefcase, Award, Shield, CheckCircle2, ArrowRightLeft, X, UserCheck, Plane, PlaneTakeoff, Sun } from 'lucide-react';
import { UserProfile, Vacation } from '../types';
import { useMilitars } from '../contexts/MilitarContext';
import { RankInsignia } from './RankInsignia';
import { parseRank } from '../lib/rankUtils';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface BuscarMilitarModuleProps {
  viewer: UserProfile;
  onBack: () => void;
}

function InfoRow({ 
  label, 
  value, 
  icon: Icon, 
  lowercase = false,
  fullWidth = false
}: { 
  label: string, 
  value?: string, 
  icon?: any,
  lowercase?: boolean,
  fullWidth?: boolean
}) {
  if (!value || value === '-') return null;
  
  return (
    <div className={`flex flex-col gap-0.5 ${fullWidth ? 'w-full' : ''}`}>
      <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em]">{label}</span>
      <div className="flex items-center gap-2 min-h-[24px]">
        {Icon && <Icon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
        <span className={`text-[11px] font-bold text-slate-700 ${lowercase ? '' : 'uppercase'}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

export function BuscarMilitarModule({ viewer, onBack }: BuscarMilitarModuleProps) {
  const { militars, loading } = useMilitars();
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [selectedMilitar, setSelectedMilitar] = useState<UserProfile | null>(null);
  
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [loadingVacations, setLoadingVacations] = useState(false);

  useEffect(() => {
    let unsub = () => {};
    if (selectedMilitar?.rg) {
      setLoadingVacations(true);
      const q = query(collection(db, 'vacations'), where('militarRg', '==', selectedMilitar.rg));
      unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vacation));
        setVacations(data);
        setLoadingVacations(false);
      }, (error) => {
        console.error("Error fetching vacations", error);
        setLoadingVacations(false);
      });
    } else {
      setVacations([]);
    }
    return () => unsub();
  }, [selectedMilitar?.rg]);

  const filteredMilitars = useMemo(() => {
    if (!deferredSearchTerm) return [];
    
    const term = deferredSearchTerm.toLowerCase();
    
    const order = ['CORONEL', 'TEN CEL', 'MAJOR', 'CAPITÃO', '1º TEN', '2º TEN', 'ASP OF', 'SUBTEN', '1º SGT', '2º SGT', '3º SGT', 'CABO', 'SOLDADO'];
    const rankMap = new Map(order.map((r, i) => [r, i]));
    const getRankIdx = (rankStr: string | undefined) => {
       const mapped = parseRank(rankStr || '');
       const idx = rankMap.get(mapped);
       return idx !== undefined ? idx : 99;
    };

    const results = [];
    for (const m of militars) {
      if (
        (m.name?.toLowerCase() || '').includes(term) ||
        (m.warName?.toLowerCase() || '').includes(term) ||
        (m.rg?.toString().toLowerCase() || '').includes(term) ||
        (m.rank?.toLowerCase() || '').includes(term)
      ) {
        results.push(m);
      }
    }

    results.sort((a, b) => {
      const idxA = getRankIdx(a.rank);
      const idxB = getRankIdx(b.rank);
      if (idxA !== idxB) return idxA - idxB;
      return (a.name || '').localeCompare(b.name || '');
    });

    return results.slice(0, 50); // limit for fast DOM render
  }, [militars, deferredSearchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-indigo-700 text-white p-4 sm:p-6 shadow-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button 
            onClick={() => {
               if (selectedMilitar) setSelectedMilitar(null);
               else onBack();
            }}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Buscar Militar</h1>
            <p className="text-[10px] sm:text-xs text-indigo-200 font-bold uppercase tracking-widest mt-0.5">
              Diretório de Perfis e Contatos
            </p>
          </div>
          
          <AnimatePresence>
            {selectedMilitar && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setSelectedMilitar(null)}
                className="flex items-center gap-2 p-2 sm:px-4 sm:py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
              >
                <Search className="w-5 h-5" />
                <span className="hidden sm:inline text-xs font-bold uppercase tracking-widest">Nova Busca</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 flex flex-col gap-6 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {!selectedMilitar ? (
            <motion.div 
              key="search-view"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col gap-6"
            >
              {/* Search Bar */}
              <div className="relative max-w-2xl mx-auto w-full">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-indigo-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-11 pr-4 py-4 bg-white border-2 border-indigo-100 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium shadow-sm"
                  placeholder="Digite o nome de guerra, RG, posto ou nome completo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Results */}
              <div className="flex-1">
                {loading ? (
                  <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                     <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mb-4"></div>
                     <p className="font-bold uppercase tracking-widest text-xs">Carregando diretório...</p>
                  </div>
                ) : searchTerm === '' ? (
                  <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-center">
                    <User className="w-16 h-16 mb-4 opacity-50" />
                    <h3 className="font-black text-lg text-slate-600 uppercase tracking-tight">Pesquisa Rápida</h3>
                    <p className="font-bold text-xs uppercase tracking-widest mt-2 max-w-md">
                      Utilize a barra acima para encontrar as informações de perfil, quadro e contatos de qualquer militar da corporação.
                    </p>
                  </div>
                ) : filteredMilitars.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-center">
                    <Search className="w-12 h-12 mb-4 opacity-50" />
                    <h3 className="font-black text-lg text-slate-600 uppercase tracking-tight">Nenhum resultado</h3>
                    <p className="font-bold text-xs uppercase tracking-widest mt-2">
                      Não encontramos nenhum militar correspondente a "{searchTerm}".
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredMilitars.map((militar, index) => (
                      <motion.button
                        key={militar.rg || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => setSelectedMilitar(militar)}
                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all text-left flex items-center gap-4 group"
                      >
                        <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden relative">
                          {militar.photoURL ? (
                             <img src={militar.photoURL} alt={militar.name} className="w-full h-full object-cover" />
                          ) : (
                             <RankInsignia rankStr={militar.rank} className="scale-110" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded">
                              {militar.rank}
                            </span>
                            {militar.obm && (
                              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Building2 className="w-3 h-3" /> {militar.obm}
                              </span>
                            )}
                          </div>
                          <h4 className="font-black text-slate-800 uppercase truncate group-hover:text-indigo-700 transition-colors">
                            {militar.warName || militar.name}
                          </h4>
                          <p className="text-[11px] font-bold text-slate-400 capitalize truncate mt-0.5 font-mono">
                            RG: {militar.rg}
                          </p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="profile-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 w-full max-w-4xl mx-auto"
            >
              <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-200">
                {/* Header/Cover */}
                <div className="h-28 sm:h-36 bg-gradient-to-r from-indigo-600 to-indigo-800 relative shrink-0" />

                {/* Profile Avatar & Basic Info */}
                <div className="px-6 sm:px-10 pb-10 relative">
                  <div className="flex flex-col sm:flex-row gap-6 -mt-16 sm:-mt-12 items-center sm:items-end">
                    <div className="relative shrink-0">
                      <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-white p-1.5 sm:p-2 shadow-xl">
                        <div className="w-full h-full rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-slate-50 relative">
                          {selectedMilitar.photoURL ? (
                            <img src={selectedMilitar.photoURL} alt={selectedMilitar.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center justify-center">
                               <RankInsignia rankStr={selectedMilitar.rank} className="scale-150 mb-4" />
                               <User className="w-16 h-16 text-slate-300 -mt-2" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-white p-1 shadow-lg">
                        <div className={`w-full h-full rounded-full flex items-center justify-center font-black text-sm ${
                          selectedMilitar.ala === 'EXP' ? 'bg-slate-500 text-white' : 
                          selectedMilitar.ala === '1' ? 'bg-green-500 text-white' :
                          selectedMilitar.ala === '2' ? 'bg-rose-500 text-white' :
                          selectedMilitar.ala === '3' ? 'bg-blue-500 text-white' :
                          selectedMilitar.ala === '4' ? 'bg-amber-500 text-white' : 'bg-indigo-500 text-white'
                        }`}>
                          {selectedMilitar.ala}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 text-center sm:text-left pb-2">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-2">
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 uppercase tracking-tight">
                          {selectedMilitar.rank} {selectedMilitar.warName || (selectedMilitar.name || '').split(' ')[0]}
                        </h2>
                        {selectedMilitar.situacao?.toUpperCase() === 'ATIVO' && (
                          <span className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Ativo</span>
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 font-bold uppercase text-[11px] tracking-widest flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <span className="flex items-center gap-1 opacity-80"><Building2 className="w-4 h-4 text-indigo-500" /> {selectedMilitar.obm || '10º GBM'}</span>
                        {selectedMilitar.lentTo && (
                           <span className="text-amber-700 flex items-center gap-1 bg-amber-100 px-2.5 py-0.5 rounded shadow-sm border border-amber-200">
                             <ArrowRightLeft className="w-3.5 h-3.5" /> <span>Emprestado para </span>{selectedMilitar.lentTo}
                           </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Content Sections */}
                  <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                    
                    {/* Férias (Nove Section) */}
                    <section className="md:col-span-2">
                      <h3 className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2 pb-2 border-b border-indigo-100">
                        <Sun className="w-4 h-4" /> Plano de Férias e Afastamentos
                      </h3>
                      <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 p-4 sm:p-6 shadow-sm">
                         {loadingVacations ? (
                            <div className="flex items-center gap-3 text-indigo-400">
                              <div className="w-5 h-5 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin" />
                              <span className="font-bold text-xs uppercase tracking-widest">Buscando registros...</span>
                            </div>
                         ) : vacations.length > 0 ? (
                           <div className="space-y-4">
                             {vacations.map(vac => (
                                <div key={vac.id} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-4 rounded-xl border border-indigo-100/60 shadow-sm relative overflow-hidden">
                                   <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-400" />
                                   <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-widest">Ano Ref: {vac.anoRef}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ato: {vac.ato}</span>
                                      </div>
                                      <div className="flex items-center gap-3 mt-2 font-bold text-sm text-slate-700">
                                        <div className="flex items-center gap-1.5">
                                          <PlaneTakeoff className="w-4 h-4 text-slate-400" />
                                          {vac.dataInicio}
                                        </div>
                                        <div className="h-px bg-slate-200 w-4 hidden sm:block" />
                                        <div className="flex items-center gap-1.5 opacity-60">
                                          {vac.dataRetorno}
                                        </div>
                                      </div>
                                   </div>
                                   <div className="flex flex-row sm:flex-col gap-3 sm:gap-1 text-right border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-4">
                                      <div>
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dias Gozados</div>
                                        <div className="text-lg font-black text-slate-700">{vac.diasGozados}</div>
                                      </div>
                                      <div>
                                        <div className="text-[9px] font-black text-emerald-500/70 uppercase tracking-widest">A Gozar</div>
                                        <div className="text-lg font-black text-emerald-600">{vac.diasAGozar}</div>
                                      </div>
                                   </div>
                                </div>
                             ))}
                           </div>
                         ) : (
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             <Calendar className="w-4 h-4" /> Nenhum registro de férias encontrado para este militar.
                           </p>
                         )}
                      </div>
                    </section>

                    {/* Column 1: Physical/Personal */}
                    <div className="space-y-8">
                      <section>
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2 pb-2 border-b border-slate-100">
                          <Contact className="w-4 h-4" /> Identificação e Dados
                        </h3>
                        <div className="space-y-4">
                          <InfoRow label="Nome Completo" value={selectedMilitar.name} />
                          <div className="grid grid-cols-2 gap-4">
                            <InfoRow label="RG" value={selectedMilitar.rg} />
                            <InfoRow label="ID Funcional" value={selectedMilitar.idFuncional} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <InfoRow label="Nascimento" value={selectedMilitar.nascimento} icon={Calendar} />
                            <InfoRow label="Quadro" value={selectedMilitar.quadro} icon={Briefcase} />
                          </div>
                        </div>
                      </section>

                      <section>
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2 pb-2 border-b border-slate-100">
                          <Mail className="w-4 h-4" /> Contato
                        </h3>
                        <div className="space-y-4">
                          <InfoRow label="E-mail" value={selectedMilitar.email} icon={Mail} lowercase />
                          <div className="grid grid-cols-2 gap-4">
                            <InfoRow label="Celular" value={selectedMilitar.cel} icon={Phone} />
                            <InfoRow label="Telefone" value={selectedMilitar.tel} icon={Phone} />
                          </div>
                          <InfoRow label="Endereço" value={selectedMilitar.endereco} icon={MapPin} fullWidth />
                          <InfoRow label="Cidade" value={selectedMilitar.cidade} icon={MapPinned} />
                        </div>
                      </section>
                    </div>

                    {/* Column 2: Professional/Competencies */}
                    <div className="space-y-8">
                      <section>
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2 pb-2 border-b border-slate-100">
                          <Award className="w-4 h-4" /> Especialidades
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedMilitar.specializations && selectedMilitar.specializations.length > 0 ? (
                            selectedMilitar.specializations.map(spec => (
                              <span 
                                key={spec}
                                className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-widest rounded-lg"
                              >
                                {spec}
                              </span>
                            ))
                          ) : (
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Nenhuma especialidade</p>
                          )}
                        </div>
                      </section>

                      <section>
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2 pb-2 border-b border-slate-100">
                          <UserCheck className="w-4 h-4" /> Funções e Aptidões
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { key: 'ativoCondutor', label: 'Condutor' },
                            { key: 'ativoEncarregado', label: 'Encarregado' },
                            { key: 'ativoAbastecedor', label: 'Abastecedor' },
                            { key: 'ativoChefeGua', label: 'Chefe GUA' },
                            { key: 'ativoMaritimo', label: 'Marítimo' },
                            { key: 'ativoEnfermeiro', label: 'Enfermeiro' },
                            { key: 'ativoComunicante', label: 'Comunicante' },
                            { key: 'ativoGraduado', label: 'Grad Dia' },
                            { key: 'ativoCbsSds', label: 'Cb/Sd Dia' },
                            { id: 'auxRancho', label: 'Aux Rancho' },
                            { id: 'toqueDeFogo', label: 'T. Fogo' },
                            { id: 'sentinela', label: 'Sentinela' }
                          ].map(item => {
                            const isActive = (selectedMilitar as any)[item.key || (item as any).id];
                            return (
                              <div 
                                key={item.key || (item as any).id}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] font-black uppercase transition-all ${
                                  isActive 
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700 shadow-sm' 
                                    : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
                                }`}
                              >
                                {isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                {item.label}
                              </div>
                            );
                          })}
                        </div>
                      </section>

                      {selectedMilitar.cursos && (
                        <section>
                          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2 pb-2 border-b border-slate-100">
                            <Shield className="w-4 h-4" /> Cursos Extras
                          </h3>
                          <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                            <p className="text-xs font-medium text-slate-600 leading-relaxed italic">"{selectedMilitar.cursos}"</p>
                          </div>
                        </section>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

