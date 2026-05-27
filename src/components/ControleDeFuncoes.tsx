import React, { useState, useMemo } from 'react';
import { useMilitars } from '../contexts/MilitarContext';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Search, Loader2, Truck, ShieldAlert, BadgeInfo, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';
import { RankInsignia } from './RankInsignia';
import { MultiSelectFilter } from './ui/MultiSelectFilter';

interface ControleDeFuncoesProps {
  obmContext: string;
}

const VIATURAS = ['ABT', 'ABSL', 'ASE', 'AR', 'ARC'] as const;

export function ControleDeFuncoes({ obmContext }: ControleDeFuncoesProps) {
  const { militars, refreshMilitars, updateMilitarLocal } = useMilitars();
  const [search, setSearch] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'condutores' | 'chefes' | 'maritimos' | 'enfermeiros' | 'comunicantes' | 'graduados' | 'cbs_sds' | 'auxiliares' | 'mostruario'>('condutores');

  const [filterPostoGrad, setFilterPostoGrad] = useState<string[]>([]);
  const [filterQuadro, setFilterQuadro] = useState<string[]>([]);
  const [filterAla, setFilterAla] = useState<string[]>([]);
  const [filterSituacao, setFilterSituacao] = useState<string[]>([]);
  const [filterCursos, setFilterCursos] = useState<string[]>([]);
  const [somenteAtivos, setSomenteAtivos] = useState(false);

  const { uniqueRanks, uniqueQuadros, uniqueAlas, uniqueSituacoes, uniqueCursos } = useMemo(() => {
    const cursosSet = new Set<string>();
    militars.forEach(m => {
      const isSameObm = !obmContext || obmContext === 'GLOBAL' || m.obm === obmContext;
      if (isSameObm && m.cursos) {
        m.cursos.split(',').forEach(c => {
          const tc = c.trim();
          if (tc) cursosSet.add(tc);
        });
      }
    });

    const contextMilitars = militars.filter(m => !obmContext || obmContext === 'GLOBAL' || m.obm === obmContext);

    return {
      uniqueRanks: Array.from(new Set(contextMilitars.map(m => m.rank).filter(Boolean))) as string[],
      uniqueQuadros: Array.from(new Set(contextMilitars.map(m => m.quadro).filter(Boolean))) as string[],
      uniqueAlas: Array.from(new Set(contextMilitars.map(m => m.ala?.toString()).filter(v => v && v.toUpperCase() !== 'ALA'))) as string[],
      uniqueSituacoes: Array.from(new Set(contextMilitars.map(m => m.situacao).filter(Boolean))) as string[],
      uniqueCursos: Array.from(cursosSet).sort()
    };
  }, [militars, obmContext]);

  // Filter only militars from this OBM by default, but allow search to override
  const filteredMilitars = useMemo(() => {
    return militars.filter(m => {
      const isSameObm = !obmContext || obmContext === 'GLOBAL' || m.obm === obmContext;
      if (!isSameObm) return false;

      const isActiveInCurrentTab = () => {
         if (activeTab === 'condutores') return !!m.ativoCondutor;
         if (activeTab === 'chefes') return !!m.ativoChefeGua;
         if (activeTab === 'maritimos') return !!m.ativoMaritimo;
         if (activeTab === 'enfermeiros') return !!m.ativoEnfermeiro;
         if (activeTab === 'graduados') return !!m.ativoGraduado;
         if (activeTab === 'cbs_sds') return !!m.ativoCbsSds;
         if (activeTab === 'auxiliares') return !!m.ativoAuxiliar;
         if (activeTab === 'mostruario') {
            const r = (m.rank || '').toUpperCase().trim();
            const isOfficer = ['CEL', 'CORONEL', 'TC', 'TENENTE CORONEL', 'TENENTE-CORONEL', 'MAJ', 'MAJOR', 'CAP', 'CAPITÃO', '1º TEN', '1º TENENTE', '2º TEN', '2º TENENTE', 'ASP', 'ASPIRANTE'].includes(r);
            return !isOfficer;
         }
         return !!m.ativoComunicante;
      };

      const active = isActiveInCurrentTab();

      // Basic filtering logic
      let matches = true;
      if (search.length >= 2) {
        const s = search.toLowerCase();
        matches = matches && ((m.name || '').toLowerCase().includes(s) || (m.rg || '').toString().includes(search));
      }
      if (filterPostoGrad.length > 0) matches = matches && filterPostoGrad.includes(m.rank || '');
      if (filterQuadro.length > 0) matches = matches && filterQuadro.includes(m.quadro || '');
      if (filterAla.length > 0) matches = matches && filterAla.includes(m.ala?.toString() || '');
      if (filterSituacao.length > 0) matches = matches && filterSituacao.includes(m.situacao || '');
      if (filterCursos.length > 0) {
        const userCursos = m.cursos ? m.cursos.toUpperCase().split(',').map(s => s.trim()) : [];
        matches = matches && filterCursos.some(c => c && userCursos.includes(c.toUpperCase()));
      }

      if (!matches) return false;

      // They match the filters. Should we show them?
      // By default we ONLY show active people.
      // But if "Exibir Não Ativos" is checked, OR they are searching by name, we show everyone.
      if (somenteAtivos) return true;
      if (search.length >= 2) return true;

      return active;
    }).sort((a, b) => {
       const rankWeights: Record<string, number> = {
         'CORONEL': 1, 'CEL': 1,
         'TENENTE CORONEL': 2, 'TENENTE-CORONEL': 2, 'TC': 2,
         'MAJOR': 3, 'MAJ': 3,
         'CAPITÃO': 4, 'CAP': 4,
         '1º TENENTE': 5, '1º TEN': 5,
         '2º TENENTE': 6, '2º TEN': 6,
         'ASPIRANTE': 7, 'ASP': 7,
         'SUBTENENTE': 8, 'SUB TENENTE': 8, 'ST': 8,
         '1º SARGENTO': 9, '1º SGT': 9,
         '2º SARGENTO': 10, '2º SGT': 10,
         '3º SARGENTO': 11, '3º SGT': 11,
         'CABO': 12, 'CB': 12,
         'SOLDADO': 13, 'SD': 13
       };
       const getWeight = (r: string) => rankWeights[r?.toUpperCase()?.trim()] || 99;
       
       const weightA = getWeight(a.rank || '');
       const weightB = getWeight(b.rank || '');
       if (weightA !== weightB) return weightA - weightB;

       const rgA = parseInt(a.rg?.toString().replace(/\D/g, '') || '0', 10);
       const rgB = parseInt(b.rg?.toString().replace(/\D/g, '') || '0', 10);
       return rgA - rgB;
    }).slice(0, 100);
  }, [militars, search, obmContext, activeTab, filterPostoGrad, filterQuadro, filterAla, filterSituacao, filterCursos, somenteAtivos]);

  const displayMilitars = filteredMilitars;

  const updateData = async (militar: UserProfile, data: Partial<UserProfile>) => {
    if (!militar.rg) return;
    const safeRg = String(militar.rg).replace(/^0+/, '').replace(/\D/g, '');
    setProcessing(safeRg);
    
    // Instantly reflect state
    updateMilitarLocal(safeRg, data);
    
    try {
      // 1. API Fallback update (updates Server memory cache)
      const fetchPromise = fetch('/api/militar/update', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ rg: safeRg, data })
      });

      // 2. Client update
      if (db) {
         try {
           await setDoc(doc(db, 'militaries', safeRg), data, { merge: true });
         } catch(e) {}
      }
      
      await fetchPromise;

      setTimeout(() => {
        refreshMilitars();
        setProcessing(null);
      }, 300);

    } catch (e) {
      console.error(e);
      refreshMilitars(); // rollback local mutation
      setProcessing(null);
    }
  };

  const toggleViatura = (militar: UserProfile, viat: string) => {
    const currentViaturas = militar.viaturas || {};
    const newState = !currentViaturas[viat as keyof typeof currentViaturas];
    updateData(militar, {
      viaturas: {
        [viat]: newState
      } // With { merge: true } this will only update the toggled key
    });
  };

  const toggleFunction = (militar: UserProfile, field: 'ativoCondutor' | 'ativoEncarregado' | 'ativoAbastecedor' | 'ativoChefeGua' | 'chefeAbt' | 'chefeAbsl' | 'ativoMaritimo' | 'mestreAl' | 'mestreBia' | 'opAma' | 'gvAma' | 'marinheiros' | 'ativoEnfermeiro' | 'ativoComunicante' | 'ativoGraduado' | 'adjunto' | 'sgtDia' | 'cmtGuarda' | 'disponivel1' | 'disponivel2' | 'ativoCbsSds' | 'faxina' | 'sentinela' | 'deposito' | 'toqueDeFogo' | 'auxRancho' | 'cbGuarda' | 'cbDia' | 'disponivelCbsSds' | 'ativoAuxiliar' | 'auxAbt' | 'auxAbsl' | 'auxArc' | 'auxAse' | 'disponivelAux') => {
    updateData(militar, {
      [field]: !militar[field]
    });
  };

  const toggleColumnAll = async (field: keyof UserProfile) => {
    if (displayMilitars.length === 0) return;
    const allChecked = displayMilitars.every(m => m[field]);
    const newState = !allChecked;
    
    // 1. Optimistic UI update locally
    displayMilitars.forEach(m => {
      if (m.rg) {
        const safeRg = String(m.rg).replace(/^0+/, '').replace(/\D/g, '');
        updateMilitarLocal(safeRg, { [field]: newState });
      }
    });

    // 2. Background sync with backend
    await Promise.all(displayMilitars.map(m => {
      if (!m.rg) return Promise.resolve();
      const safeRg = String(m.rg).replace(/^0+/, '').replace(/\D/g, '');
      return fetch('/api/militar/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rg: safeRg, data: { [field]: newState } })
      }).catch(() => {});
    }));
  };

  const toggleViaturaAll = async (viat: string) => {
    if (displayMilitars.length === 0) return;
    const allChecked = displayMilitars.every(m => !!m.viaturas?.[viat as keyof typeof m.viaturas]);
    const newState = !allChecked;
    
    displayMilitars.forEach(m => {
      if (m.rg) {
        const safeRg = String(m.rg).replace(/^0+/, '').replace(/\D/g, '');
        updateMilitarLocal(safeRg, { viaturas: { ...m.viaturas, [viat]: newState } });
      }
    });

    await Promise.all(displayMilitars.map(m => {
      if (!m.rg) return Promise.resolve();
      const safeRg = String(m.rg).replace(/^0+/, '').replace(/\D/g, '');
      return fetch('/api/militar/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rg: safeRg, data: { viaturas: { [viat]: newState } } })
      }).catch(() => {});
    }));
  };

  const ColumnHeaderToggle = ({ field, label }: { field: keyof UserProfile, label: React.ReactNode }) => (
    <div className="flex flex-col items-center justify-center gap-1 group">
      <span>{label}</span>
      <button 
        onClick={() => toggleColumnAll(field)}
        title="Marcar/Desmarcar todos"
        className="px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase font-bold bg-slate-200 text-slate-500 opacity-50 xl:group-hover:opacity-100 hover:bg-indigo-500 hover:text-white hover:opacity-100 transition-all shadow-sm"
      >
        LOTE
      </button>
    </div>
  );

  const ViaturaHeaderToggle = ({ viat }: { viat: string }) => (
    <div className="flex flex-col items-center justify-center gap-1 group">
      <span>{viat}</span>
      <button 
        onClick={() => toggleViaturaAll(viat)}
        title="Marcar/Desmarcar todos"
        className="px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase font-bold bg-slate-200 text-slate-500 opacity-50 xl:group-hover:opacity-100 hover:bg-indigo-500 hover:text-white hover:opacity-100 transition-all shadow-sm"
      >
        LOTE
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 sm:p-6 bg-white border-b border-slate-200 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-600" />
              Controle de Funções
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Gerencie habilitações, viaturas e funções operacionais da {obmContext}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => { setActiveTab('condutores'); setSearch(''); }}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                  activeTab === 'condutores' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Condutores
              </button>
              <button
                onClick={() => { setActiveTab('chefes'); setSearch(''); }}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                  activeTab === 'chefes' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Chefes de Guarnição
              </button>
              <button
                onClick={() => { setActiveTab('maritimos'); setSearch(''); }}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                  activeTab === 'maritimos' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Marítimos
              </button>
              <button
                onClick={() => { setActiveTab('enfermeiros'); setSearch(''); }}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                  activeTab === 'enfermeiros' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Enfermeiros
              </button>
              <button
                onClick={() => { setActiveTab('comunicantes'); setSearch(''); }}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                  activeTab === 'comunicantes' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Comunicantes
              </button>
              <button
                onClick={() => { setActiveTab('graduados'); setSearch(''); }}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap",
                  activeTab === 'graduados' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Graduados
              </button>
              <button
                onClick={() => { setActiveTab('cbs_sds'); setSearch(''); }}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap",
                  activeTab === 'cbs_sds' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Cbs E Sds
              </button>
              <button
                onClick={() => { setActiveTab('auxiliares'); setSearch(''); }}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap",
                  activeTab === 'auxiliares' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Auxiliares VTR
              </button>
              <button
                onClick={() => { setActiveTab('mostruario'); setSearch(''); }}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap",
                  activeTab === 'mostruario' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Mostruário Geral
              </button>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar militar por RG ou nome..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border-2 border-slate-200 rounded-lg text-xs font-medium focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex flex-wrap items-start gap-4 p-4 bg-slate-50 border-2 border-slate-200 rounded-xl">
           <div className="text-[10px] font-black uppercase text-slate-400 self-center w-full sm:w-auto">Filtros:</div>
           <div className="flex-1 min-w-[150px]"><MultiSelectFilter label="Posto/Grad" options={uniqueRanks} selected={filterPostoGrad} onChange={setFilterPostoGrad} /></div>
           <div className="flex-1 min-w-[150px]"><MultiSelectFilter label="Quadro" options={uniqueQuadros} selected={filterQuadro} onChange={setFilterQuadro} /></div>
           <div className="flex-1 min-w-[150px]"><MultiSelectFilter label="Ala" options={uniqueAlas} selected={filterAla} onChange={setFilterAla} /></div>
           <div className="flex-1 min-w-[150px]"><MultiSelectFilter label="Situação" options={uniqueSituacoes} selected={filterSituacao} onChange={setFilterSituacao} /></div>
           <div className="flex-1 min-w-[200px]"><MultiSelectFilter label="Cursos" options={uniqueCursos} selected={filterCursos} onChange={setFilterCursos} /></div>
           <div className="flex items-center gap-2 self-center shrink-0">
             <input
               type="checkbox"
               id="somenteAtivos"
               checked={somenteAtivos}
               onChange={(e) => setSomenteAtivos(e.target.checked)}
               className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
             />
             <label htmlFor="somenteAtivos" className="text-xs font-semibold text-slate-700 select-none cursor-pointer">
               Exibir Não Ativos
             </label>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {activeTab === 'condutores' && (
              <table className="w-full text-left min-w-[1000px]">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 w-16 text-center">Ativo</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Militar</th>
                    <th colSpan={5} className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200 bg-slate-50">
                      Viaturas Habilitadas
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200">Encerr.</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Abast.</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200">Ala</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200 w-16">Ações</th>
                  </tr>
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <th colSpan={2} className="px-3 py-1 bg-white"></th>
                    {VIATURAS.map(v => (
                      <th key={v} className="px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center border-l border-slate-200 first:border-l-0">
                        <ViaturaHeaderToggle viat={v} />
                      </th>
                    ))}
                    <th colSpan={4} className="bg-white border-l border-slate-200"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayMilitars.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-4 py-8 text-center text-slate-400">
                        <BadgeInfo className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium">Nenhum militar encontrado nesta visão.</p>
                        <p className="text-xs mt-1">Pesquise por nome ou RG para adicionar novos condutores.</p>
                      </td>
                    </tr>
                  ) : null}
                  {displayMilitars.map(m => {
                    const isProcessing = processing === m.rg?.replace(/\D/g, '').replace(/^0+/, '');
                    
                    return (
                      <tr key={m.rg} className={cn("hover:bg-indigo-50/30 transition-colors", m.ativoCondutor ? "bg-emerald-50/10" : "")}>
                        <td className="px-3 py-2 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={!!m.ativoCondutor}
                              onChange={() => toggleFunction(m, 'ativoCondutor')}
                              disabled={isProcessing}
                            />
                            <div className={cn(
                              "w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all",
                              m.ativoCondutor ? "bg-emerald-500" : "",
                              isProcessing ? "opacity-50" : ""
                            )}></div>
                          </label>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 flex shrink-0 justify-center">
                              <RankInsignia rankStr={m.rank} className="scale-75 origin-center" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-1">{m.rank}</span>
                              <span className="text-xs font-black text-slate-700 uppercase tracking-wider leading-none">
                                {m.warName || (m.name || '').split(' ')[0]}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-bold text-slate-400 font-mono">RG: {m.rg}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1 rounded">{m.quadro || m.specializations?.[0] || '-'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        {/* Viaturas */}
                        {VIATURAS.map(v => {
                          const hasViat = !!m.viaturas?.[v as keyof typeof m.viaturas];
                          return (
                            <td key={v} className="px-2 py-2 text-center border-l border-slate-100 bg-slate-50/50">
                              <button
                                onClick={() => toggleViatura(m, v)}
                                disabled={isProcessing}
                                className={cn(
                                  "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto",
                                  hasViat ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50",
                                  isProcessing && "opacity-50"
                                )}
                              >
                                {hasViat && "✓"}
                              </button>
                            </td>
                          );
                        })}

                        {/* Encarregado */}
                        <td className="px-3 py-2 text-center border-l border-slate-200">
                          <button
                            onClick={() => toggleFunction(m, 'ativoEncarregado')}
                            disabled={isProcessing}
                            className={cn(
                              "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto",
                              m.ativoEncarregado ? "bg-amber-500 text-white shadow-sm" : "bg-slate-100 text-slate-300 hover:bg-slate-200",
                              isProcessing && "opacity-50"
                            )}
                          >
                            {m.ativoEncarregado && "✓"}
                          </button>
                        </td>

                        {/* Abastecedor */}
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => toggleFunction(m, 'ativoAbastecedor')}
                            disabled={isProcessing}
                            className={cn(
                              "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto",
                              m.ativoAbastecedor ? "bg-rose-500 text-white shadow-sm" : "bg-slate-100 text-slate-300 hover:bg-slate-200",
                              isProcessing && "opacity-50"
                            )}
                          >
                            {m.ativoAbastecedor && "✓"}
                          </button>
                        </td>

                        <td className="px-3 py-2 text-center border-l border-slate-200">
                          {m.lentTo ? (
                            <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest">
                              {m.lentTo}
                            </span>
                          ) : m.ala ? (
                            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                              Ala {m.ala}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            {activeTab === 'chefes' && (
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 w-16 text-center">Ativo</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Militar</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200 bg-slate-50">
                      <ColumnHeaderToggle field="chefeAbt" label="Chefe ABT" />
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center bg-slate-50">
                      <ColumnHeaderToggle field="chefeAbsl" label="Chefe ABSL" />
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200">Ala</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200 w-16">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayMilitars.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        <BadgeInfo className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium">Nenhum militar encontrado nesta visão.</p>
                        <p className="text-xs mt-1">Pesquise por nome ou RG para adicionar novos chefes.</p>
                      </td>
                    </tr>
                  ) : null}
                  {displayMilitars.map(m => {
                    const isProcessing = processing === m.rg?.replace(/\D/g, '').replace(/^0+/, '');
                    
                    return (
                      <tr key={m.rg} className={cn("hover:bg-indigo-50/30 transition-colors", m.ativoChefeGua ? "bg-emerald-50/10" : "")}>
                        <td className="px-3 py-2 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={!!m.ativoChefeGua}
                              onChange={() => toggleFunction(m, 'ativoChefeGua')}
                              disabled={isProcessing}
                            />
                            <div className={cn(
                              "w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all",
                              m.ativoChefeGua ? "bg-emerald-500" : "",
                              isProcessing ? "opacity-50" : ""
                            )}></div>
                          </label>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 flex shrink-0 justify-center">
                              <RankInsignia rankStr={m.rank} className="scale-75 origin-center" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-1">{m.rank}</span>
                              <span className="text-xs font-black text-slate-700 uppercase tracking-wider leading-none">
                                {m.warName || (m.name || '').split(' ')[0]}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-bold text-slate-400 font-mono">RG: {m.rg}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1 rounded">{m.quadro || m.specializations?.[0] || '-'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-3 py-2 text-center border-l border-slate-100 bg-slate-50/50">
                          <button
                            onClick={() => toggleFunction(m, 'chefeAbt')}
                            disabled={isProcessing}
                            className={cn(
                              "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto",
                              m.chefeAbt ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50",
                              isProcessing && "opacity-50"
                            )}
                          >
                            {m.chefeAbt && "✓"}
                          </button>
                        </td>
                        
                        <td className="px-3 py-2 text-center bg-slate-50/50">
                          <button
                            onClick={() => toggleFunction(m, 'chefeAbsl')}
                            disabled={isProcessing}
                            className={cn(
                              "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto",
                              m.chefeAbsl ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50",
                              isProcessing && "opacity-50"
                            )}
                          >
                            {m.chefeAbsl && "✓"}
                          </button>
                        </td>

                        <td className="px-3 py-2 text-center border-l border-slate-200">
                          {m.lentTo ? (
                            <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest">
                              {m.lentTo}
                            </span>
                          ) : m.ala ? (
                            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                              Ala {m.ala}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center border-l border-slate-200">
                          <button
                            onClick={() => toggleFunction(m, 'ativoChefeGua')}
                            disabled={isProcessing}
                            className={cn(
                              "text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-50"
                            )}
                            title="Remover deste controle"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
            {activeTab === 'maritimos' && (
              <table className="w-full text-left min-w-[900px]">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 w-16 text-center">Ativo</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Militar</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200 bg-slate-50"><ColumnHeaderToggle field="mestreAl" label="Mestre AL" /></th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center bg-slate-50"><ColumnHeaderToggle field="mestreBia" label="Mestre BIA" /></th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center bg-slate-50"><ColumnHeaderToggle field="opAma" label="OP. AMA" /></th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center bg-slate-50"><ColumnHeaderToggle field="gvAma" label="GV. AMA" /></th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center bg-slate-50"><ColumnHeaderToggle field="marinheiros" label="Marinheiros" /></th>
                    <th className="px-3 py-3 text-[10px) font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200">Ala</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200 w-16">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayMilitars.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                        <BadgeInfo className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium">Nenhum militar encontrado nesta visão.</p>
                        <p className="text-xs mt-1">Pesquise por nome ou RG para adicionar novos maritimos.</p>
                      </td>
                    </tr>
                  ) : null}
                  {displayMilitars.map(m => {
                    const isProcessing = processing === m.rg?.replace(/\D/g, '').replace(/^0+/, '');
                    
                    return (
                      <tr key={m.rg} className={cn("hover:bg-indigo-50/30 transition-colors", m.ativoMaritimo ? "bg-emerald-50/10" : "")}>
                        <td className="px-3 py-2 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={!!m.ativoMaritimo}
                              onChange={() => toggleFunction(m, 'ativoMaritimo')}
                              disabled={isProcessing}
                            />
                            <div className={cn(
                              "w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all",
                              m.ativoMaritimo ? "bg-emerald-500" : "",
                              isProcessing ? "opacity-50" : ""
                            )}></div>
                          </label>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 flex shrink-0 justify-center">
                              <RankInsignia rankStr={m.rank} className="scale-75 origin-center" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-1">{m.rank}</span>
                              <span className="text-xs font-black text-slate-700 uppercase tracking-wider leading-none">
                                {m.warName || (m.name || '').split(' ')[0]}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-bold text-slate-400 font-mono">RG: {m.rg}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1 rounded">{m.quadro || m.specializations?.[0] || '-'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-3 py-2 text-center border-l border-slate-100 bg-slate-50/50">
                          <button onClick={() => toggleFunction(m, 'mestreAl')} disabled={isProcessing} className={cn("w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto", m.mestreAl ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50", isProcessing && "opacity-50")}>
                            {m.mestreAl && "✓"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center bg-slate-50/50">
                          <button onClick={() => toggleFunction(m, 'mestreBia')} disabled={isProcessing} className={cn("w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto", m.mestreBia ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50", isProcessing && "opacity-50")}>
                            {m.mestreBia && "✓"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center bg-slate-50/50">
                          <button onClick={() => toggleFunction(m, 'opAma')} disabled={isProcessing} className={cn("w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto", m.opAma ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50", isProcessing && "opacity-50")}>
                            {m.opAma && "✓"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center bg-slate-50/50">
                          <button onClick={() => toggleFunction(m, 'gvAma')} disabled={isProcessing} className={cn("w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto", m.gvAma ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50", isProcessing && "opacity-50")}>
                            {m.gvAma && "✓"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center bg-slate-50/50">
                          <button onClick={() => toggleFunction(m, 'marinheiros')} disabled={isProcessing} className={cn("w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto", m.marinheiros ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50", isProcessing && "opacity-50")}>
                            {m.marinheiros && "✓"}
                          </button>
                        </td>

                        <td className="px-3 py-2 text-center border-l border-slate-200">
                          {m.lentTo ? (
                            <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest">
                              {m.lentTo}
                            </span>
                          ) : m.ala ? (
                            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                              Ala {m.ala}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center border-l border-slate-200">
                          <button
                            onClick={() => toggleFunction(m, 'ativoMaritimo')}
                            disabled={isProcessing}
                            className={cn(
                              "text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-50"
                            )}
                            title="Remover deste controle"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
            
            {activeTab === 'enfermeiros' && (
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 w-16 text-center">Ativo</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Militar</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200">Ala</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200 w-16">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayMilitars.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        <BadgeInfo className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium">Nenhum militar encontrado nesta visão.</p>
                      </td>
                    </tr>
                  ) : null}
                  {displayMilitars.map(m => {
                    const isProcessing = processing === m.rg?.replace(/\D/g, '').replace(/^0+/, '');
                    return (
                      <tr key={m.rg} className={cn("hover:bg-indigo-50/30 transition-colors", m.ativoEnfermeiro ? "bg-emerald-50/10" : "")}>
                        <td className="px-3 py-2 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={!!m.ativoEnfermeiro}
                              onChange={() => toggleFunction(m, 'ativoEnfermeiro')}
                              disabled={isProcessing}
                            />
                            <div className={cn(
                              "w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all",
                              m.ativoEnfermeiro ? "bg-emerald-500" : "",
                              isProcessing ? "opacity-50" : ""
                            )}></div>
                          </label>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 flex shrink-0 justify-center">
                              <RankInsignia rankStr={m.rank} className="scale-75 origin-center" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-1">{m.rank}</span>
                              <span className="text-xs font-black text-slate-700 uppercase tracking-wider leading-none">
                                {m.warName || (m.name || '').split(' ')[0]}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-bold text-slate-400 font-mono">RG: {m.rg}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1 rounded">{m.quadro || m.specializations?.[0] || '-'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center border-l border-slate-200">
                          {m.lentTo ? (
                            <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest">
                              {m.lentTo}
                            </span>
                          ) : m.ala ? (
                            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                              Ala {m.ala}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center border-l border-slate-200">
                          <button
                            onClick={() => toggleFunction(m, 'ativoEnfermeiro')}
                            disabled={isProcessing}
                            className={cn(
                              "text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-50"
                            )}
                            title="Remover deste controle"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
            
            {activeTab === 'comunicantes' && (
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 w-16 text-center">Ativo</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Militar</th>
                    <th className="px-3 py-3 text-[10px) font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200">Ala</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200 w-16">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayMilitars.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        <BadgeInfo className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium">Nenhum militar encontrado nesta visão.</p>
                      </td>
                    </tr>
                  ) : null}
                  {displayMilitars.map(m => {
                    const isProcessing = processing === m.rg?.replace(/\D/g, '').replace(/^0+/, '');
                    return (
                      <tr key={m.rg} className={cn("hover:bg-indigo-50/30 transition-colors", m.ativoComunicante ? "bg-emerald-50/10" : "")}>
                        <td className="px-3 py-2 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={!!m.ativoComunicante}
                              onChange={() => toggleFunction(m, 'ativoComunicante')}
                              disabled={isProcessing}
                            />
                            <div className={cn(
                              "w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all",
                              m.ativoComunicante ? "bg-emerald-500" : "",
                              isProcessing ? "opacity-50" : ""
                            )}></div>
                          </label>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 flex shrink-0 justify-center">
                              <RankInsignia rankStr={m.rank} className="scale-75 origin-center" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-1">{m.rank}</span>
                              <span className="text-xs font-black text-slate-700 uppercase tracking-wider leading-none">
                                {m.warName || (m.name || '').split(' ')[0]}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-bold text-slate-400 font-mono">RG: {m.rg}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1 rounded">{m.quadro || m.specializations?.[0] || '-'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center border-l border-slate-200">
                          {m.lentTo ? (
                            <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest">
                              {m.lentTo}
                            </span>
                          ) : m.ala ? (
                            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                              Ala {m.ala}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center border-l border-slate-200">
                          <button
                            onClick={() => toggleFunction(m, 'ativoComunicante')}
                            disabled={isProcessing}
                            className={cn(
                              "text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-50"
                            )}
                            title="Remover deste controle"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            {activeTab === 'graduados' && (
              <table className="w-full text-left min-w-[1000px]">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 w-16 text-center">Ativo</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Militar</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200 bg-slate-50">
                      <ColumnHeaderToggle field="adjunto" label="Adjunto" />
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center bg-slate-50">
                      <ColumnHeaderToggle field="sgtDia" label="Sgt Dia" />
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center bg-slate-50">
                      <ColumnHeaderToggle field="cmtGuarda" label="Cmt Guarda" />
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200 bg-slate-50">
                      <ColumnHeaderToggle field="disponivel1" label="Disponível" />
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center bg-slate-50">
                      <ColumnHeaderToggle field="disponivel2" label="Disponível 2" />
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200">Ala</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200 w-16">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayMilitars.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                        <BadgeInfo className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium">Nenhum militar encontrado nesta visão.</p>
                      </td>
                    </tr>
                  ) : null}
                  {displayMilitars.map(m => {
                    const isProcessing = processing === m.rg?.replace(/\D/g, '').replace(/^0+/, '');
                    return (
                      <tr key={m.rg} className={cn("hover:bg-indigo-50/30 transition-colors", m.ativoGraduado ? "bg-emerald-50/10" : "")}>
                        <td className="px-3 py-2 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={!!m.ativoGraduado}
                              onChange={() => toggleFunction(m, 'ativoGraduado')}
                              disabled={isProcessing}
                            />
                            <div className={cn(
                              "w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all",
                              m.ativoGraduado ? "bg-emerald-500" : "",
                              isProcessing ? "opacity-50" : ""
                            )}></div>
                          </label>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 flex shrink-0 justify-center">
                              <RankInsignia rankStr={m.rank} className="scale-75 origin-center" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-1">{m.rank}</span>
                              <span className="text-xs font-black text-slate-700 uppercase tracking-wider leading-none">
                                {m.warName || (m.name || '').split(' ')[0]}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-bold text-slate-400 font-mono">RG: {m.rg}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1 rounded">{m.quadro || m.specializations?.[0] || '-'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center border-l border-slate-100 bg-slate-50/50">
                          <button
                            onClick={() => toggleFunction(m, 'adjunto')}
                            disabled={isProcessing}
                            className={cn(
                              "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto",
                              m.adjunto ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50",
                              isProcessing && "opacity-50"
                            )}
                          >
                            {m.adjunto && "✓"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center bg-slate-50/50">
                          <button
                            onClick={() => toggleFunction(m, 'sgtDia')}
                            disabled={isProcessing}
                            className={cn(
                              "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto",
                              m.sgtDia ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50",
                              isProcessing && "opacity-50"
                            )}
                          >
                            {m.sgtDia && "✓"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center bg-slate-50/50">
                          <button
                            onClick={() => toggleFunction(m, 'cmtGuarda')}
                            disabled={isProcessing}
                            className={cn(
                              "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto",
                              m.cmtGuarda ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50",
                              isProcessing && "opacity-50"
                            )}
                          >
                            {m.cmtGuarda && "✓"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center border-l border-slate-100 bg-slate-50/50">
                          <button
                            onClick={() => toggleFunction(m, 'disponivel1')}
                            disabled={isProcessing}
                            className={cn(
                              "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto",
                              m.disponivel1 ? "bg-yellow-500 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50",
                              isProcessing && "opacity-50"
                            )}
                          >
                            {m.disponivel1 && "✓"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center bg-slate-50/50">
                          <button
                            onClick={() => toggleFunction(m, 'disponivel2')}
                            disabled={isProcessing}
                            className={cn(
                              "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto",
                              m.disponivel2 ? "bg-red-500 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50",
                              isProcessing && "opacity-50"
                            )}
                          >
                            {m.disponivel2 && "✓"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center border-l border-slate-200">
                          {m.lentTo ? (
                            <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest">
                              {m.lentTo}
                            </span>
                          ) : m.ala ? (
                            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                              Ala {m.ala}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center border-l border-slate-200">
                          <button
                            onClick={() => toggleFunction(m, 'ativoGraduado')}
                            disabled={isProcessing}
                            className={cn(
                              "text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-50"
                            )}
                            title="Remover deste controle"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
            {activeTab === 'cbs_sds' && (
              <table className="w-full text-left min-w-[1200px]">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 w-16 text-center">Ativo</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Militar</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200 bg-slate-50">
                      <ColumnHeaderToggle field="faxina" label="Faxina" />
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center bg-slate-50">
                      <ColumnHeaderToggle field="sentinela" label="Sentinela" />
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center bg-slate-50">
                      <ColumnHeaderToggle field="deposito" label="Depósito" />
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center bg-slate-50">
                      <ColumnHeaderToggle field="toqueDeFogo" label="Tq Fogo" />
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200 bg-slate-50">
                      <ColumnHeaderToggle field="auxRancho" label="Aux Rancho" />
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center bg-slate-50">
                      <ColumnHeaderToggle field="cbGuarda" label="Cb Guarda" />
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center bg-slate-50">
                      <ColumnHeaderToggle field="cbDia" label="Cb Dia" />
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200 bg-slate-50">
                      <ColumnHeaderToggle field="disponivelCbsSds" label="Disponível" />
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200">Ala</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200 w-16">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayMilitars.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-4 py-8 text-center text-slate-400">
                        <BadgeInfo className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium">Nenhum militar encontrado nesta visão.</p>
                      </td>
                    </tr>
                  ) : null}
                  {displayMilitars.map(m => {
                    const isProcessing = processing === m.rg?.replace(/\D/g, '').replace(/^0+/, '');
                    return (
                      <tr key={m.rg} className={cn("hover:bg-indigo-50/30 transition-colors", m.ativoCbsSds ? "bg-emerald-50/10" : "")}>
                        <td className="px-3 py-2 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={!!m.ativoCbsSds}
                              onChange={() => toggleFunction(m, 'ativoCbsSds')}
                              disabled={isProcessing}
                            />
                            <div className={cn(
                              "w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all",
                              m.ativoCbsSds ? "bg-emerald-500" : "",
                              isProcessing ? "opacity-50" : ""
                            )}></div>
                          </label>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 flex shrink-0 justify-center">
                              <RankInsignia rankStr={m.rank} className="scale-75 origin-center" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-1">{m.rank}</span>
                              <span className="text-xs font-black text-slate-700 uppercase tracking-wider leading-none">
                                {m.warName || (m.name || '').split(' ')[0]}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-bold text-slate-400 font-mono">RG: {m.rg}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1 rounded">{m.quadro || m.specializations?.[0] || '-'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center border-l border-slate-100 bg-slate-50/50">
                          <button
                            onClick={() => toggleFunction(m, 'faxina')}
                            disabled={isProcessing}
                            className={cn(
                              "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto",
                              m.faxina ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50",
                              isProcessing && "opacity-50"
                            )}
                          >
                            {m.faxina && "✓"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center bg-slate-50/50">
                          <button
                            onClick={() => toggleFunction(m, 'sentinela')}
                            disabled={isProcessing}
                            className={cn(
                              "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto",
                              m.sentinela ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50",
                              isProcessing && "opacity-50"
                            )}
                          >
                            {m.sentinela && "✓"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center bg-slate-50/50">
                          <button
                            onClick={() => toggleFunction(m, 'deposito')}
                            disabled={isProcessing}
                            className={cn(
                              "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto",
                              m.deposito ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50",
                              isProcessing && "opacity-50"
                            )}
                          >
                            {m.deposito && "✓"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center bg-slate-50/50">
                          <button
                            onClick={() => toggleFunction(m, 'toqueDeFogo')}
                            disabled={isProcessing}
                            className={cn(
                              "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto",
                              m.toqueDeFogo ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50",
                              isProcessing && "opacity-50"
                            )}
                          >
                            {m.toqueDeFogo && "✓"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center border-l border-slate-100 bg-slate-50/50">
                          <button
                            onClick={() => toggleFunction(m, 'auxRancho')}
                            disabled={isProcessing}
                            className={cn(
                              "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto",
                              m.auxRancho ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50",
                              isProcessing && "opacity-50"
                            )}
                          >
                            {m.auxRancho && "✓"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center bg-slate-50/50">
                          <button
                            onClick={() => toggleFunction(m, 'cbGuarda')}
                            disabled={isProcessing}
                            className={cn(
                              "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto",
                              m.cbGuarda ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50",
                              isProcessing && "opacity-50"
                            )}
                          >
                            {m.cbGuarda && "✓"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center bg-slate-50/50">
                          <button
                            onClick={() => toggleFunction(m, 'cbDia')}
                            disabled={isProcessing}
                            className={cn(
                              "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto",
                              m.cbDia ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50",
                              isProcessing && "opacity-50"
                            )}
                          >
                            {m.cbDia && "✓"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center border-l border-slate-100 bg-slate-50/50">
                          <button
                            onClick={() => toggleFunction(m, 'disponivelCbsSds')}
                            disabled={isProcessing}
                            className={cn(
                              "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto",
                              m.disponivelCbsSds ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50",
                              isProcessing && "opacity-50"
                            )}
                          >
                            {m.disponivelCbsSds && "✓"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center border-l border-slate-200">
                          {m.lentTo ? (
                            <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest">
                              {m.lentTo}
                            </span>
                          ) : m.ala ? (
                            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                              Ala {m.ala}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center border-l border-slate-200">
                          <button
                            onClick={() => toggleFunction(m, 'ativoCbsSds')}
                            disabled={isProcessing}
                            className={cn(
                              "text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-50"
                            )}
                            title="Remover deste controle"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            {activeTab === 'auxiliares' && (
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 w-16 text-center">Ativo</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Militar</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200 bg-slate-50">
                      <ColumnHeaderToggle field="auxAbt" label="ABT" />
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center bg-slate-50">
                      <ColumnHeaderToggle field="auxAbsl" label="ABSL" />
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center bg-slate-50">
                      <ColumnHeaderToggle field="auxArc" label="ARC" />
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center bg-slate-50">
                      <ColumnHeaderToggle field="auxAse" label="ASE" />
                    </th>
                    <th className="px-3 py-3 text-[10px) font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200 bg-slate-50">
                      <ColumnHeaderToggle field="disponivelAux" label="Disponível" />
                    </th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200">Ala</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200 w-16">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayMilitars.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                        <BadgeInfo className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium">Nenhum militar encontrado nesta visão.</p>
                      </td>
                    </tr>
                  ) : null}
                  {displayMilitars.map(m => {
                    const isProcessing = processing === m.rg?.replace(/\D/g, '').replace(/^0+/, '');
                    return (
                      <tr key={m.rg} className={cn("hover:bg-indigo-50/30 transition-colors", m.ativoAuxiliar ? "bg-emerald-50/10" : "")}>
                        <td className="px-3 py-2 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={!!m.ativoAuxiliar}
                              onChange={() => toggleFunction(m, 'ativoAuxiliar')}
                              disabled={isProcessing}
                            />
                            <div className={cn(
                              "w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all",
                              m.ativoAuxiliar ? "bg-emerald-500" : "",
                              isProcessing ? "opacity-50" : ""
                            )}></div>
                          </label>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 flex shrink-0 justify-center">
                              <RankInsignia rankStr={m.rank} className="scale-75 origin-center" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-1">{m.rank}</span>
                              <span className="text-xs font-black text-slate-700 uppercase tracking-wider leading-none">
                                {m.warName || (m.name || '').split(' ')[0]}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-bold text-slate-400 font-mono">RG: {m.rg}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1 rounded">{m.quadro || m.specializations?.[0] || '-'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center border-l border-slate-100 bg-slate-50/50">
                          <button
                            onClick={() => toggleFunction(m, 'auxAbt')}
                            disabled={isProcessing}
                            className={cn(
                              "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto",
                              m.auxAbt ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50",
                              isProcessing && "opacity-50"
                            )}
                          >
                            {m.auxAbt && "✓"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center bg-slate-50/50">
                          <button
                            onClick={() => toggleFunction(m, 'auxAbsl')}
                            disabled={isProcessing}
                            className={cn(
                              "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto",
                              m.auxAbsl ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50",
                              isProcessing && "opacity-50"
                            )}
                          >
                            {m.auxAbsl && "✓"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center bg-slate-50/50">
                          <button
                            onClick={() => toggleFunction(m, 'auxArc')}
                            disabled={isProcessing}
                            className={cn(
                              "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto",
                              m.auxArc ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50",
                              isProcessing && "opacity-50"
                            )}
                          >
                            {m.auxArc && "✓"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center bg-slate-50/50">
                          <button
                            onClick={() => toggleFunction(m, 'auxAse')}
                            disabled={isProcessing}
                            className={cn(
                              "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto",
                              m.auxAse ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50",
                              isProcessing && "opacity-50"
                            )}
                          >
                            {m.auxAse && "✓"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center border-l border-slate-100 bg-slate-50/50">
                          <button
                            onClick={() => toggleFunction(m, 'disponivelAux')}
                            disabled={isProcessing}
                            className={cn(
                              "w-6 h-6 rounded flex items-center justify-center transition-colors mx-auto",
                              m.disponivelAux ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-300 border border-slate-200 hover:bg-slate-50",
                              isProcessing && "opacity-50"
                            )}
                          >
                            {m.disponivelAux && "✓"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-center border-l border-slate-200">
                          {m.lentTo ? (
                            <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest">
                              {m.lentTo}
                            </span>
                          ) : m.ala ? (
                            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                              Ala {m.ala}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center border-l border-slate-200">
                          <button
                            onClick={() => toggleFunction(m, 'ativoAuxiliar')}
                            disabled={isProcessing}
                            className={cn(
                              "text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-50"
                            )}
                            title="Remover deste controle"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
            {activeTab === 'mostruario' && (
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Militar</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200">Capacidades / Funções</th>
                    <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-l border-slate-200">Ala</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayMilitars.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                        <BadgeInfo className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium">Nenhum militar encontrado nesta visão.</p>
                      </td>
                    </tr>
                  ) : null}
                  {displayMilitars.map(m => {
                    const capabilities = [
                      { 
                        active: m.ativoCondutor, 
                        label: 'Motorista', 
                        color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                        items: [
                          ...(m.viaturas?.ABT ? ['ABT'] : []),
                          ...(m.viaturas?.ABSL ? ['ABSL'] : []),
                          ...(m.viaturas?.ASE ? ['ASE'] : []),
                          ...(m.viaturas?.AR ? ['AR'] : []),
                          ...(m.viaturas?.ARC ? ['ARC'] : []),
                          ...(m.ativoEncarregado ? ['ENCARR.'] : []),
                          ...(m.ativoAbastecedor ? ['ABAST.'] : [])
                        ]
                      },
                      { 
                        active: m.ativoChefeGua, 
                        label: 'Chefe', 
                        color: 'bg-blue-100 text-blue-700 border-blue-200',
                        items: [
                          ...(m.chefeAbt ? ['ABT'] : []),
                          ...(m.chefeAbsl ? ['ABSL'] : [])
                        ]
                      },
                      { 
                        active: m.ativoMaritimo, 
                        label: 'Marítimo', 
                        color: 'bg-cyan-100 text-cyan-700 border-cyan-200',
                        items: [
                          ...(m.mestreAl ? ['MESTRE AL'] : []),
                          ...(m.mestreBia ? ['MESTRE BIA'] : []),
                          ...(m.opAma ? ['OP. AMA'] : []),
                          ...(m.gvAma ? ['GV AMA'] : []),
                          ...(m.marinheiros ? ['MARINHEIRO'] : [])
                        ]
                      },
                      { active: m.ativoEnfermeiro, label: 'Enfermeiro', color: 'bg-rose-100 text-rose-700 border-rose-200', items: [] },
                      { active: m.ativoComunicante, label: 'Comunicante', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', items: [] },
                      { 
                        active: m.ativoGraduado, 
                        label: 'Graduado', 
                        color: 'bg-slate-100 text-slate-700 border-slate-200',
                        items: [
                          ...(m.adjunto ? ['ADJUNTO'] : []),
                          ...(m.sgtDia ? ['SGT DIA'] : []),
                          ...(m.cmtGuarda ? ['CMT GUARDA'] : []),
                          ...(m.disponivel1 ? ['DISP 1'] : []),
                          ...(m.disponivel2 ? ['DISP 2'] : [])
                        ]
                      },
                      { 
                        active: m.ativoCbsSds, 
                        label: 'Sentinela/CbDia', 
                        color: 'bg-slate-100 text-slate-700 border-slate-200',
                        items: [
                          ...(m.faxina ? ['FAXINA'] : []),
                          ...(m.sentinela ? ['SENTINELA'] : []),
                          ...(m.deposito ? ['DEPÓSITO'] : []),
                          ...(m.toqueDeFogo ? ['FOGO'] : []),
                          ...(m.auxRancho ? ['RANCHO'] : []),
                          ...(m.cbGuarda ? ['CB GUARDA'] : []),
                          ...(m.cbDia ? ['CB DIA'] : []),
                          ...(m.disponivelCbsSds ? ['DISP'] : [])
                        ]
                      },
                      { 
                        active: m.ativoAuxiliar, 
                        label: 'Auxiliar VTR', 
                        color: 'bg-amber-100 text-amber-700 border-amber-200',
                        items: [
                          ...(m.auxAbt ? ['ABT'] : []),
                          ...(m.auxAbsl ? ['ABSL'] : []),
                          ...(m.auxArc ? ['ARC'] : []),
                          ...(m.auxAse ? ['ASE'] : []),
                          ...(m.disponivelAux ? ['DISP'] : [])
                        ]
                      },
                    ].filter(c => c.active);

                    return (
                      <tr key={m.rg} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 flex shrink-0 justify-center">
                              <RankInsignia rankStr={m.rank} className="scale-75 origin-center" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-1">{m.rank}</span>
                              <span className="text-xs font-black text-slate-700 uppercase tracking-wider leading-none">
                                {m.warName || (m.name || '').split(' ')[0]}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-bold text-slate-400 font-mono">RG: {m.rg}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1 rounded">{m.quadro || m.specializations?.[0] || '-'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 border-l border-slate-200">
                          <div className="flex flex-col gap-2">
                            {capabilities.length > 0 ? (
                              capabilities.map(cap => (
                                <div key={cap.label} className="flex flex-wrap items-center gap-1.5">
                                  <span 
                                    className={cn(
                                      "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border shrink-0",
                                      cap.color
                                    )}
                                  >
                                    {cap.label}
                                  </span>
                                  {cap.items.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {cap.items.map(item => (
                                        <span key={item} className="text-[8px] font-bold text-slate-400 border border-slate-200 rounded px-1 lowercase italic">
                                          {item}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic text-center block">Nenhuma capacidade atribuída</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center border-l border-slate-200">
                          {m.lentTo ? (
                            <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest">
                              {m.lentTo}
                            </span>
                          ) : m.ala ? (
                            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                              Ala {m.ala}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
