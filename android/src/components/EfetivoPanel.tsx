import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Search, ArrowRightLeft, MapPin, Loader2, Building2, Maximize2, Minimize2, Columns, LayoutGrid, ListTree, List, FileSpreadsheet, Copy, Check, BookOpen, Ruler, Plus } from 'lucide-react';
import { UserProfile } from '../types';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { RankInsignia } from './RankInsignia';
import { MilitaryProfile } from './MilitaryProfile';
import { INITIAL_COLUMNS, GROUPS, OBM_HIERARCHY } from '../constants';
import { parseRank, isOfficer } from '../lib/rankUtils';
import { EfetivoGridMode } from './EfetivoGridMode';
import { EfetivoTableObmMode } from './EfetivoTableObmMode';
import { EfetivoUnifiedMode } from './EfetivoUnifiedMode';
import { EfetivoResumoTables } from './EfetivoResumoTables';
import { EfetivoPlanoChamada } from './EfetivoPlanoChamada';
import { SopMedidasModule } from './SopMedidasModule';
import { LendMilitarModal } from './LendMilitarModal';
import { ManualRgModal } from './ManualRgModal';
import { useMilitars } from '../contexts/MilitarContext';
import { exportToExcel, copyTableToClipboard } from '../lib/exportUtils';

import { MultiSelectFilter } from './ui/MultiSelectFilter';

import { EfetivoToolbar, ViewMode } from './EfetivoToolbar';

interface EfetivoPanelProps {
  user: UserProfile;
  obmContext?: string;
  onBack: () => void;
}

export function EfetivoPanel({ user, obmContext, onBack }: EfetivoPanelProps) {
  const { militars, loading, refreshMilitars } = useMilitars();
  const [search, setSearch] = useState('');
  const [selectedLendGroup, setSelectedLendGroup] = useState('');
  const [isLending, setIsLending] = useState(false);
  const [selectedMilitar, setSelectedMilitar] = useState<UserProfile | null>(null);
  const [lendingMilitar, setLendingMilitar] = useState<UserProfile | null>(null);
  
  // Custom states added
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  
  // View mode states
  type ViewMode = 'cards' | 'table_obm' | 'table_unified' | 'summary' | 'plano_chamada' | 'medidas_sop';
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [showManualRgModal, setShowManualRgModal] = useState(false);
  const [orderedColumns, setOrderedColumns] = useState(INITIAL_COLUMNS);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(INITIAL_COLUMNS.map(c => c.id));
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);

  const [filterPostoGrad, setFilterPostoGrad] = useState<string[]>([]);
  const [filterQuadro, setFilterQuadro] = useState<string[]>([]);
  const [filterObm, setFilterObm] = useState<string[]>([]);
  const [filterAla, setFilterAla] = useState<string[]>([]);
  const [filterCidade, setFilterCidade] = useState<string[]>([]);
  const [filterSituacao, setFilterSituacao] = useState<string[]>([]);
  const [filterCursos, setFilterCursos] = useState<string[]>([]);
  const [cursoFiltroAditivo, setCursoFiltroAditivo] = useState(true);
  const [manualRgs, setManualRgs] = useState<string[]>([]);
  
  const [copied, setCopied] = useState(false);

  const filters = { filterPostoGrad, filterQuadro, filterObm, filterAla, filterCidade, filterSituacao, filterCursos, manualRgs, cursoFiltroAditivo };

  const filteredMilitars = React.useMemo(() => {
    return militars.filter(m => {
      const rgNum = m.rg?.replace(/\D/g, '').padStart(5, '0') || '';
      if (manualRgs.includes(rgNum)) return true;

      const term = search.toLowerCase();
      const matchesSearch = (m.name?.toLowerCase().includes(term) || m.warName?.toLowerCase().includes(term) || m.rg?.includes(term));
      const matchesPosto = filterPostoGrad.length === 0 || filterPostoGrad.includes(m.rank || '');
      const matchesQuadro = filterQuadro.length === 0 || filterQuadro.includes(m.quadro || '');
      const matchesObm = filterObm.length === 0 || filterObm.includes(m.obm || '');
      const matchesAla = filterAla.length === 0 || filterAla.includes(m.ala?.toString() || '');
      const matchesCidade = filterCidade.length === 0 || filterCidade.includes(m.cidade || '');
      const matchesSituacao = filterSituacao.length === 0 || filterSituacao.includes(m.situacao || '');
      
      // Admin contextualize (GLOBAL shows everything, specific OBM filters)
      const allowedViews = (!obmContext || obmContext === 'GLOBAL') ? null : (OBM_HIERARCHY[obmContext] || [obmContext]);
      const matchesContext = allowedViews ? (allowedViews.includes(m.obm || '') || allowedViews.includes(m.lentTo!)) : true;

      const userCursos = m.cursos ? m.cursos.toUpperCase().split(',').map(s => s.trim()) : [];
      const hasSelectedCurso = filterCursos.length > 0 && filterCursos.some(c => c && userCursos.includes(c.toUpperCase()));
      
      const hasBaseFilter = search !== '' || filterPostoGrad.length > 0 || filterQuadro.length > 0 || filterObm.length > 0 || filterAla.length > 0 || filterCidade.length > 0 || filterSituacao.length > 0;
      const baseMatches = matchesSearch && matchesPosto && matchesQuadro && matchesObm && matchesAla && matchesCidade && matchesSituacao;

      if (!matchesContext) return false;

      if (filterCursos.length > 0) {
        if (cursoFiltroAditivo) {
          if (hasBaseFilter) {
            return baseMatches || hasSelectedCurso;
          }
          return hasSelectedCurso;
        } else {
          return baseMatches && hasSelectedCurso;
        }
      }

      return baseMatches;
    });
  }, [militars, search, filterPostoGrad, filterQuadro, filterObm, filterAla, filterCidade, filterSituacao, filterCursos, manualRgs, obmContext, cursoFiltroAditivo]);

  const handleExportExcel = () => {
    const exportData = filteredMilitars.map(m => ({
      'Posto/Grad': m.rank || '',
      'Nome': m.name || '',
      'Nome de Guerra': m.warName || m.name || '',
      'RG': m.rg || '',
      'Quadro': m.quadro || '',
      'OBM': m.obm || '',
      'Ala': m.ala || '',
      'Situação': m.situacao || '',
      'Cidade': m.cidade || '',
      'Contato': m.cel || m.tel || ''
    }));
    exportToExcel(exportData, 'Efetivo', 'Planilha_Efetivo');
  };

  const handleCopyClipboard = async () => {
    const headers = ['Posto/Grad', 'Nome', 'Nome de Guerra', 'RG', 'Quadro', 'OBM', 'Ala', 'Situação', 'Cidade', 'Contato'];
    const keys = ['rank', 'name', 'warName', 'rg', 'quadro', 'obm', 'ala', 'situacao', 'cidade', 'cel'];
    const success = await copyTableToClipboard(filteredMilitars, headers, keys);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSummaryFilterClick = (f: { rank?: string, quadro?: string, ala?: string }) => {
     if (f.rank !== undefined) setFilterPostoGrad(f.rank ? [f.rank] : []);
     if (f.quadro !== undefined) setFilterQuadro(f.quadro ? [f.quadro] : []);
     if (f.ala !== undefined) setFilterAla(f.ala ? [f.ala] : []);
     setViewMode('table_unified');
  };

  const currentGroups = React.useMemo(() => GROUPS.map(g => {
    const defaultObm = (m: UserProfile) => {
      return m.obm || '';
    };

    const membersAtGroup = militars.filter(m => {
       const currentObm = m.lentTo ? m.lentTo : defaultObm(m);
       return currentObm === g.id;
    });

    const membersOriginallyAtGroup = militars.filter(m => defaultObm(m) === g.id);

    const lentIn = membersAtGroup.filter(m => defaultObm(m) !== g.id).length;
    const lentOut = membersOriginallyAtGroup.filter(m => m.lentTo && m.lentTo !== g.id).length;

    return {
      id: g.id,
      name: g.label,
      members: membersAtGroup,
      totalOriginal: membersOriginallyAtGroup.length,
      lentIn,
      lentOut
    };
  }), [militars]);

  const { uniqueRanks, uniqueQuadros, uniqueObms, uniqueAlas, uniqueCidades, uniqueSituacoes, uniqueCursos } = React.useMemo(() => {
    const cursosSet = new Set<string>();
    militars.forEach(m => {
      if (m.cursos) {
        (m.cursos || '').split(',').forEach(c => {
          const tc = c.trim();
          if (tc) cursosSet.add(tc);
        });
      }
    });
    return {
      uniqueRanks: Array.from(new Set(militars.map(m => m.rank).filter(Boolean))) as string[],
      uniqueQuadros: Array.from(new Set(militars.map(m => m.quadro).filter(Boolean))) as string[],
      uniqueObms: Array.from(new Set(militars.map(m => m.obm).filter(Boolean))) as string[],
      uniqueAlas: Array.from(new Set(militars.map(m => m.ala?.toString()).filter(v => v && v.toUpperCase() !== 'ALA'))) as string[],
      uniqueCidades: Array.from(new Set(militars.map(m => m.cidade).filter(Boolean))) as string[],
      uniqueSituacoes: Array.from(new Set(militars.map(m => m.situacao).filter(Boolean))) as string[],
      uniqueCursos: Array.from(cursosSet).sort()
    };
  }, [militars]);

  const handleLend = async (militar: UserProfile, newGroup: string) => {
    setIsLending(true);
    const targetLentTo = newGroup === (militar.obm || '') ? null : newGroup;
    try {
      const safeRg = militar.rg ? militar.rg.toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^0+/, '') : '';

      const res = await fetch(`/api/militar/emprestar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rg: militar.rg,
          lentTo: targetLentTo 
        })
      });
      if (res.ok) {
        setLendingMilitar(null);
        setSelectedLendGroup('');
        await refreshMilitars();
      } else {
        alert('Erro ao emprestar militar');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao emprestar militar');
    } finally {
      setIsLending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
             <Users className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600" />
             Painel do Efetivo
          </h2>
          <p className="text-[10px] sm:text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">
             Gestão de Militares e Subunidades
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <EfetivoToolbar viewMode={viewMode} setViewMode={setViewMode} />

          <div className="flex items-center gap-2">
             <button 
                onClick={handleCopyClipboard}
                title="Copiar Tabela"
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] uppercase font-black text-slate-600 hover:bg-slate-50 tracking-widest transition-colors h-[34px]"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />} 
                <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar'}</span>
              </button>

              <button 
                onClick={handleExportExcel}
                title="Exportar para Excel"
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] uppercase font-black hover:bg-emerald-100 tracking-widest transition-colors h-[34px]"
              >
                <FileSpreadsheet size={14} /> <span className="hidden sm:inline">Excel</span>
              </button>
          </div>

          {viewMode !== 'cards' && viewMode !== 'summary' && viewMode !== 'plano_chamada' && (
            <div className="relative">
              <button 
                onClick={() => setShowColumnsMenu(!showColumnsMenu)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                <Columns size={14} /> Colunas
              </button>
              {showColumnsMenu && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-lg shadow-xl p-3 z-50 w-56 flex flex-col gap-2">
                  <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1 border-b border-slate-100 pb-1">Colunas Visíveis</div>
                  {orderedColumns.map((col, index) => (
                     <div 
                         key={col.id} 
                         draggable
                         onDragStart={(e) => {
                            e.dataTransfer.setData('origIndex', index.toString());
                         }}
                         onDragOver={(e) => {
                            e.preventDefault();
                         }}
                         onDrop={(e) => {
                            e.preventDefault();
                            const origIndex = parseInt(e.dataTransfer.getData('origIndex'), 10);
                            if (origIndex !== index) {
                                const newOrder = [...orderedColumns];
                                const [dragged] = newOrder.splice(origIndex, 1);
                                newOrder.splice(index, 0, dragged);
                                setOrderedColumns(newOrder);
                            }
                         }}
                         className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-grab hover:bg-slate-50 py-1.5 px-3 border-b border-slate-50 last:border-0"
                      >
                       <div className="text-slate-300 w-4 flex flex-col justify-center items-center gap-0.5" title="Arraste para reordenar">
                          <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                          <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                          <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                       </div>
                       <input 
                         type="checkbox" 
                         className="accent-indigo-500 rounded-sm w-3 h-3"
                         checked={visibleColumns.includes(col.id)}
                         onChange={(e) => {
                           if (e.target.checked) setVisibleColumns([...visibleColumns, col.id]);
                           else setVisibleColumns(visibleColumns.filter(id => id !== col.id));
                         }}
                       />
                       <span className="flex-1">{col.label}</span>
                     </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button 
             onClick={onBack}
             className="px-4 py-2 bg-white border-2 border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 h-[34px]"
          >
            <span className="hidden sm:inline">Voltar</span>
            <span className="sm:hidden">&times;</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
         <Search className="w-5 h-5 text-slate-400" />
         <input 
            type="text"
            placeholder="Buscar por nome, nome de guerra ou RE..."
            className="flex-1 outline-none text-slate-700 font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
         />
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-start">
         <div className="flex-1 min-w-[200px]"><MultiSelectFilter label="Posto/Grad" options={uniqueRanks.sort()} selected={filterPostoGrad} onChange={setFilterPostoGrad} /></div>
         <div className="flex-1 min-w-[200px]"><MultiSelectFilter label="Quadro" options={uniqueQuadros.sort()} selected={filterQuadro} onChange={setFilterQuadro} /></div>
         <div className="flex-1 min-w-[200px]"><MultiSelectFilter label="OBM" options={uniqueObms.sort()} selected={filterObm} onChange={setFilterObm} /></div>
         <div className="flex-1 min-w-[200px]"><MultiSelectFilter label="Ala" options={uniqueAlas.sort()} selected={filterAla} onChange={setFilterAla} /></div>
         <div className="flex-1 min-w-[200px]"><MultiSelectFilter label="Cidade" options={uniqueCidades.sort()} selected={filterCidade} onChange={setFilterCidade} /></div>
         <div className="flex-1 min-w-[200px]"><MultiSelectFilter label="Situação" options={uniqueSituacoes.sort()} selected={filterSituacao} onChange={setFilterSituacao} /></div>
         <div className="flex-1 min-w-[200px] flex flex-col gap-1">
            <div className="flex items-center gap-2">
               <div className="flex-1"><MultiSelectFilter label="Cursos" options={uniqueCursos} selected={filterCursos} onChange={setFilterCursos} /></div>
               <button
                  onClick={() => setShowManualRgModal(true)}
                  className="h-[42px] px-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 flex items-center justify-center transition-colors shrink-0"
                  title="Adicionar RG manualmente"
               >
                  <Plus className="w-5 h-5" />
               </button>
            </div>
            <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 cursor-pointer w-max" title="Se marcado, o filtro de cursos adiciona resultados. Se desmarcado, restringe os resultados existentes.">
               <input 
                  type="checkbox" 
                  className="accent-indigo-500 rounded-sm w-3 h-3"
                  checked={cursoFiltroAditivo}
                  onChange={(e) => setCursoFiltroAditivo(e.target.checked)}
               />
               Modo Aditivo
            </label>
         </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
           <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
           <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">Carregando efetivo...</p>
        </div>
      ) : viewMode === 'plano_chamada' ? (
        <EfetivoPlanoChamada militars={filteredMilitars} />
      ) : viewMode === 'medidas_sop' ? (
        <SopMedidasModule user={user} militars={filteredMilitars} onBack={() => setViewMode('cards')} />
      ) : viewMode === 'summary' ? (
        <div className="mt-6">
           <EfetivoResumoTables militars={filteredMilitars} onFilterClick={handleSummaryFilterClick} />
        </div>
      ) : viewMode === 'table_unified' ? (
        <EfetivoUnifiedMode 
           militars={filteredMilitars}
           isAdmin={user.isAdmin || false} 
           onLendRequested={setLendingMilitar} 
           onRowClick={setSelectedMilitar} 
        />
      ) : viewMode === 'table_obm' ? (
        <EfetivoTableObmMode 
          currentGroups={currentGroups} 
          search={search} 
          filters={filters} 
          expandedGroup={expandedGroup} 
          setExpandedGroup={setExpandedGroup} 
          onRowClick={setSelectedMilitar}
          orderedColumns={orderedColumns}
          visibleColumns={visibleColumns}
          isAdmin={user.isAdmin || false}
          onLendRequested={setLendingMilitar}
        />
      ) : (
        <EfetivoGridMode 
          currentGroups={currentGroups} 
          search={search} 
          filters={filters} 
          expandedGroup={expandedGroup} 
          setExpandedGroup={setExpandedGroup} 
          onRowClick={setSelectedMilitar}
        />
      )}

      {/* Modal para Emprestar */}
      {lendingMilitar && (
        <LendMilitarModal
          lendingMilitar={lendingMilitar}
          onClose={() => setLendingMilitar(null)}
          onLendConfirm={handleLend}
          isLending={isLending}
        />
      )}

      {/* Profile Modal */}
      <AnimatePresence>
        {selectedMilitar && (
          <MilitaryProfile 
            militar={selectedMilitar}
            viewer={user}
            onClose={() => setSelectedMilitar(null)}
            onLendRequested={(m) => {
              setSelectedMilitar(null);
              setLendingMilitar(m);
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal para Adição de RG */}
      <AnimatePresence>
        {showManualRgModal && (
          <ManualRgModal
            onClose={() => setShowManualRgModal(false)}
            onConfirm={(rg) => {
              const rgNum = rg.replace(/\D/g, '').padStart(5, '0');
              if (!manualRgs.includes(rgNum)) setManualRgs([...manualRgs, rgNum]);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
