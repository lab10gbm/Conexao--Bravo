import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, BookOpen, Download, Edit2, Check, X, ChevronDown, Settings, Copy, Filter, Ruler, Search, Plus, AlertCircle } from 'lucide-react';
import { UserProfile } from '../types';
import { db } from '../lib/firebase';
import { doc, setDoc, onSnapshot, getDoc, collection, getDocs, query, deleteField } from 'firebase/firestore';
const medidasDgp: Record<string, any> = {};
const epiDgp: Record<string, any> = {};
import { DEFAULT_SOP_SCHEMA } from '../constants';
import { useMilitars } from '../contexts/MilitarContext';
import { LETTER_SIZES, NUMERIC_SIZES } from '../constants';
import { MultiSelectFilter } from './ui/MultiSelectFilter';
import { useNavigate } from 'react-router-dom';
import { exportToExcel } from '../lib/exportUtils';
import { ManualRgModal } from './ManualRgModal';
import { EditableSopCell } from './EditableSopCell';
import { cleanUndefined, normalizeObm } from "../lib/utils";

interface SopMedidasModuleProps {
  user: UserProfile;
  militars: UserProfile[];
  onBack: () => void;
}

export function SopMedidasModule({ user, militars, onBack }: SopMedidasModuleProps) {
  const { militars: globalMilitars } = useMilitars();
  const navigate = useNavigate();
  const [config, setConfig] = useState<{ areas: { id: string, label: string, fields: { id: string, label: string, type?: string }[], targetQBMPs?: string, targetRGs?: string }[] } | null>(null);
  const [allMilitars, setAllMilitars] = useState<UserProfile[]>([]);
  const [sopRoster, setSopRoster] = useState<UserProfile[]>([]);
  const [displayMode, setDisplayMode] = useState<'tudo' | string>('tudo');
  const [isSectionsExpanded, setIsSectionsExpanded] = useState(false);
  const [viewType, setViewType] = useState<'status' | 'tamanho'>('tamanho');
  const [loading, setLoading] = useState(true);
  const [dbDataMap, setDbDataMap] = useState<Record<string, any>>({});
  const [editingCell, setEditingCell] = useState<{ rg: string, field: string, value: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRgs, setSelectedRgs] = useState<string[]>([]);
  const [bulkActionField, setBulkActionField] = useState<string | null>(null);
  const [showColConfig, setShowColConfig] = useState(false);
  const [visibleCols, setVisibleCols] = useState<string[]>([]);
  const [manualRgs, setManualRgs] = useState<string[]>([]);
  const [showManualRgModal, setShowManualRgModal] = useState(false);
  const [showEpiRequestModal, setShowEpiRequestModal] = useState(false);
  const [epiRequestFields, setEpiRequestFields] = useState<string[]>([]);
  const [epiRequestMessage, setEpiRequestMessage] = useState('');
  const [reviewingRequestFor, setReviewingRequestFor] = useState<string | null>(null);

  // Filters State
  const [filterPostoGrad, setFilterPostoGrad] = useState<string[]>([]);
  const [filterQuadro, setFilterQuadro] = useState<string[]>([]);
  const [filterObm, setFilterObm] = useState<string[]>([]);
  const [filterAla, setFilterAla] = useState<string[]>([]);
  const [filterCidade, setFilterCidade] = useState<string[]>([]);
  const [filterSituacao, setFilterSituacao] = useState<string[]>([]);
  const [filterCursos, setFilterCursos] = useState<string[]>([]);
  const [filterMaterialField, setFilterMaterialField] = useState<string>('');
  const [filterMaterialStatus, setFilterMaterialStatus] = useState<string>('');
  const [showOnlyPending, setShowOnlyPending] = useState(false);

  // Derived from config
  const epiArea = config?.areas.find(a => a.id === 'epi');
  const epiFields = epiArea?.fields || [];
  const fardamentoArea = config?.areas.find(a => a.id === 'fardamento');
  const fardamentoFields = fardamentoArea?.fields || [];

  useEffect(() => {
    if (config && visibleCols.length === 0) {
      const allIds = config.areas.flatMap(a => a.fields.map(f => f.id));
      setVisibleCols(['nome', 'status', 'qbmp', 'posto', 'rg', 'idFuncional', ...allIds]);
    }
  }, [config]);

  useEffect(() => {
    let unsubConfig = () => {};
    let unsubRoster = () => {};

    // Config Sync
    unsubConfig = onSnapshot(doc(db, 'config', 'sop_schema'), (snap) => {
      if (snap.exists()) {
        const loadedConfig = snap.data() as any;
        if (!loadedConfig.areas.some((a: any) => a.id === 'epi')) {
           loadedConfig.areas.push({
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
            } as any);
        }
        setConfig(loadedConfig as any);
      } else {
        setConfig(DEFAULT_SOP_SCHEMA as any);
      }
    });

    // Roster Sync
    unsubRoster = onSnapshot(collection(db, 'sop_roster'), (rosterSnap) => {
      const rosterData = rosterSnap.docs.map(d => ({ ...d.data(), docId: d.id })) as any[];
      setSopRoster(rosterData as UserProfile[]);
    });

    if (militars && militars.length > 0) {
      setAllMilitars(militars);
    } else if (globalMilitars && globalMilitars.length > 0) {
      setAllMilitars(globalMilitars);
    }

    return () => {
      unsubConfig();
      unsubRoster();
    };
  }, [militars, globalMilitars]);

  useEffect(() => {
    try {
      setLoading(true);
      const q = query(collection(db, 'medidasAntropometricas'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const dbMap: Record<string, any> = {};
        snapshot.forEach((doc) => {
          dbMap[doc.id] = doc.data();
        });
        setDbDataMap(dbMap);
        setLoading(false);
      }, (err) => {
        console.error("Error fetching db medidas", err);
        setLoading(false);
      });
      
      return () => unsubscribe();
    } catch (e) {
      setLoading(false);
    }
  }, []);

  const handleBulkUpdate = async (value: string) => {
    if (!bulkActionField || selectedRgs.length === 0) return;
    setSaving(true);
    try {
      const batch: any[] = [];
      const newDbMap = { ...dbDataMap };

      for (const rg of selectedRgs) {
        const docRef = doc(db, 'medidasAntropometricas', rg);
        const currentData = dbDataMap[rg] || {};
        const newData = { ...currentData, [bulkActionField]: value };
        batch.push(setDoc(docRef, cleanUndefined({ [bulkActionField]: value }), { merge: true }));
        newDbMap[rg] = newData;
      }

      await Promise.all(batch);
      setDbDataMap(newDbMap);
      setBulkActionField(null);
      setSelectedRgs([]);
      alert(`Atualizado com sucesso ${selectedRgs.length} registros.`);
    } catch (error) {
      console.error("Error in bulk update", error);
      alert("Erro ao realizar atualização em massa.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;
    setSaving(true);
    try {
      const { rg, field, value } = editingCell;
      const rgStr = rg.toString().padStart(5, '0');
      const docRef = doc(db, 'medidasAntropometricas', rgStr);
      
      const currentData = dbDataMap[rgStr] || {};
      const newData = { ...currentData, [field]: value };
      
      await setDoc(docRef, cleanUndefined({ [field]: value }), { merge: true });
      
      // Update local state
      setDbDataMap(prev => ({
        ...prev,
        [rgStr]: newData
      }));
      setEditingCell(null);
    } catch (error) {
      console.error("Error updating medida:", error);
      alert("Erro ao salvar alteração.");
    } finally {
      setSaving(false);
    }
  };

  const combinedMilitars = useMemo(() => {
    const combined = [...allMilitars];
    sopRoster.forEach(custom => {
      if (!combined.some(m => m.rg === custom.rg)) {
        combined.push(custom);
      }
    });
    return combined;
  }, [allMilitars, sopRoster]);

  const applicableMilitars = useMemo(() => {
    return combinedMilitars.filter(p => {
      if (displayMode !== 'tudo' && config) {
        const area = config.areas.find(a => a.id === displayMode);
        if (area) {
          const qbmps = (area.targetQBMPs || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
          const rgs = (area.targetRGs || '').split(',').map(s => s.trim()).filter(Boolean);
          if (qbmps.length > 0 || rgs.length > 0) {
            let userQuadro = (p.quadro || '').toUpperCase().trim();
            userQuadro = userQuadro.split('/')[0].trim();
            const rgKey = (p.rg || '').toString().padStart(5, '0');
            const isApplicable = (rgs.length > 0 && rgs.includes(rgKey)) || (qbmps.length > 0 && userQuadro !== '' && qbmps.some(q => userQuadro.includes(q) || q.includes(userQuadro)));
            if (!isApplicable) return false;
          }
        }
      }
      return true;
    });
  }, [combinedMilitars, displayMode, config]);

  // Derived filter options
  const { uniqueRanks, uniqueQuadros, uniqueAlas, uniqueObms, uniqueCidades, uniqueSituacoes, uniqueCursos } = useMemo(() => {
    return {
      uniqueRanks: Array.from(new Set(applicableMilitars.map(m => m.rank).filter(Boolean))) as string[],
      uniqueQuadros: Array.from(new Set(applicableMilitars.map(m => m.quadro ? m.quadro.split('/')[0].trim() : '').filter(Boolean))) as string[],
      uniqueObms: Array.from(new Set(applicableMilitars.map(m => normalizeObm(m.obm)).filter(Boolean))) as string[],
      uniqueAlas: Array.from(new Set(applicableMilitars.map(m => m.ala?.toString()).filter(v => v && !['ALA', 'ESCALANTE', 'EXP'].includes(v.toUpperCase())))) as string[],
      uniqueCidades: Array.from(new Set(applicableMilitars.map(m => m.cidade).filter(Boolean))) as string[],
      uniqueSituacoes: Array.from(new Set(applicableMilitars.map(m => m.situacao).filter(Boolean))) as string[],
      uniqueCursos: Array.from(new Set(applicableMilitars.flatMap(m => m.cursos ? m.cursos.toUpperCase().split(',').map(s => s.trim()) : []).filter(v => v && v.length > 1))) as string[],
    };
  }, [applicableMilitars]);

  const merged = useMemo(() => {
    return combinedMilitars.map(p => {
      const rgStr = (p.rg || '').toString().padStart(5, '0');
      const dDB = dbDataMap[rgStr] || {};
      const mDgp: any = medidasDgp[rgStr] || {};
      const eDgp: any = epiDgp[rgStr] || {};

      const dynamicData: any = {
        ...p,
        rgStr,
        hasDbData: !!dbDataMap[rgStr],
        statusAlteracao: config?.areas.some(a => dDB[`statusAlteracao_${a.id}`] === 'PENDENTE') ? 'PENDENTE' : 'NENHUM',
        pendingUpdate: dDB.pendingUpdate || {},
      };

      // Populate dynamic fields
      if (config) {
        config.areas.forEach(area => {
          const qbmps = (area.targetQBMPs || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
          const rgs = (area.targetRGs || '').split(',').map(s => s.trim()).filter(Boolean);
          
          let isApplicable = true;
          if (qbmps.length > 0 || rgs.length > 0) {
            let userQuadro = (p.quadro || '').toUpperCase().trim();
            userQuadro = userQuadro.split('/')[0].trim();
            isApplicable = (rgs.length > 0 && rgs.includes(rgStr)) || (qbmps.length > 0 && userQuadro !== '' && qbmps.some(q => userQuadro.includes(q) || q.includes(userQuadro)));
          }

          area.fields.forEach(field => {
            const fieldId = field.id;
            
            if (!isApplicable) {
              dynamicData[fieldId] = '-';
              return;
            }

            let defaultValue = 'NÃO POSSUI';
            if (area.id === 'fardamento') defaultValue = '';
            
            // Try to map dgp logic (hacky but useful for transition)
            let dgpVal: string | undefined = undefined;
            
            const fieldLabel = field.label.toLowerCase();
            if (mDgp[fieldLabel]) {
              dgpVal = mDgp[fieldLabel].toString();
            } else if (eDgp[fieldId]) {
              dgpVal = eDgp[fieldId].toString();
            }

            if (fieldId === 'calca' && mDgp.calça) dgpVal = mDgp.calça.toString();
            if (fieldId === 'calcado' && mDgp.calçado) dgpVal = mDgp.calçado.toString();

            dynamicData[fieldId] = dDB[fieldId] ?? dgpVal ?? defaultValue;
          });
        });
      }

      return dynamicData;
    });
  }, [combinedMilitars, dbDataMap, config, medidasDgp, epiDgp]);

  const filteredMilitars = useMemo(() => {
    return merged.filter(p => {
      if (manualRgs.includes(p.rgStr)) return true;

      // Filter by display mode area applicability
      if (displayMode !== 'tudo' && config) {
        const area = config.areas.find(a => a.id === displayMode);
        if (area) {
          const qbmps = (area.targetQBMPs || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
          const rgs = (area.targetRGs || '').split(',').map(s => s.trim()).filter(Boolean);
          if (qbmps.length > 0 || rgs.length > 0) {
            let userQuadro = (p.quadro || '').toUpperCase().trim();
            userQuadro = userQuadro.split('/')[0].trim();
            const isApplicable = (rgs.length > 0 && rgs.includes(p.rgStr)) || (qbmps.length > 0 && userQuadro !== '' && qbmps.some(q => userQuadro.includes(q) || q.includes(userQuadro)));
            if (!isApplicable) return false;
          }
        }
      }

      const s = searchTerm.toLowerCase();
      const matchesSearch = (
        (p.name || '').toLowerCase().includes(s) ||
        (p.warName || '').toLowerCase().includes(s) ||
        p.rgStr.includes(s) ||
        (p.rank || '').toLowerCase().includes(s)
      );
      
      const matchesPosto = filterPostoGrad.length === 0 || filterPostoGrad.includes(p.rank || '');
      const matchesQuadro = filterQuadro.length === 0 || filterQuadro.includes((p.quadro || '').split('/')[0].trim());
      const matchesObm = filterObm.length === 0 || filterObm.includes(normalizeObm(p.obm));
      const matchesAla = filterAla.length === 0 || filterAla.includes(p.ala?.toString() || '');
      const matchesCidade = filterCidade.length === 0 || filterCidade.includes(p.cidade || '');
      const matchesSituacao = filterSituacao.length === 0 || filterSituacao.includes(p.situacao || '');
      const userCursos = p.cursos ? p.cursos.toUpperCase().split(',').map(s => s.trim()) : [];
      const matchesCursos = filterCursos.length === 0 || filterCursos.some(c => c && userCursos.includes(c.toUpperCase()));

      let matchesMaterial = true;
      if (filterMaterialField && filterMaterialStatus) {
        const rawValue = (p[filterMaterialField] || '').toString().trim().toUpperCase();
        let v = rawValue;
        const conds = ['NOVO', 'BOM', 'RUIM', 'PRECÁRIO', 'PRECARIO'];
        for (const c of conds) {
          if (v.includes(c)) {
             v = v.replace(new RegExp(`(^|\\s)${c}(\\s|$)`, 'i'), ' ');
          }
        }
        v = v.trim();
        
        const isIsento = v === 'NÃO NECESSITA';
        const isNegativo = v.startsWith('NÃO POSSUI') || v === 'NÃO';
        const isPositivo = !isIsento && !isNegativo && v !== '-' && v !== '';

        if (filterMaterialStatus === 'POSSUI') {
          matchesMaterial = isPositivo;
        } else if (filterMaterialStatus === 'NÃO POSSUI') {
          matchesMaterial = isNegativo;
        } else if (filterMaterialStatus === 'NÃO NECESSITA') {
          matchesMaterial = isIsento;
        }
      }

      return matchesSearch && matchesPosto && matchesQuadro && matchesObm && matchesAla && matchesCidade && matchesSituacao && matchesMaterial && matchesCursos && (!showOnlyPending || p.statusAlteracao === 'PENDENTE');
    });
  }, [merged, searchTerm, filterPostoGrad, filterQuadro, filterObm, filterAla, filterCidade, filterSituacao, filterCursos, filterMaterialField, filterMaterialStatus, manualRgs, showOnlyPending]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterPostoGrad, filterQuadro, filterObm, filterAla, filterCidade, filterSituacao, filterCursos, filterMaterialField, filterMaterialStatus, showOnlyPending]);

  const totalPages = Math.max(1, Math.ceil(filteredMilitars.length / itemsPerPage));
  const paginatedMilitars = filteredMilitars.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const pendingCount = useMemo(() => merged.filter(m => m.statusAlteracao === 'PENDENTE').length, [merged]);

  const allFilteredSelected = filteredMilitars.length > 0 && filteredMilitars.every(m => selectedRgs.includes(m.rgStr));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedRgs(prev => prev.filter(rg => !filteredMilitars.map(m => m.rgStr).includes(rg)));
    } else {
      const newSelected = [...selectedRgs];
      filteredMilitars.forEach(m => {
        if (!newSelected.includes(m.rgStr)) newSelected.push(m.rgStr);
      });
      setSelectedRgs(newSelected);
    }
  };

  const toggleSelectOne = (rg: string) => {
    setSelectedRgs(prev => 
      prev.includes(rg) ? prev.filter(r => r !== rg) : [...prev, rg]
    );
  };

  const isModerator = user.isAdmin || user.isEscalante;

  const getColSpan = () => {
    let base = 1; // Checkbox
    if (visibleCols.includes('qbmp')) base++;
    if (visibleCols.includes('posto')) base++;
    if (visibleCols.includes('nome')) base++;
    if (visibleCols.includes('rg')) base++;
    if (visibleCols.includes('idFuncional')) base++;
    if (visibleCols.includes('status')) base++;

    if (!config) return base;
    
    config.areas.forEach(area => {
      if (displayMode === 'tudo' || displayMode === area.id) {
        base += area.fields.filter(f => visibleCols.includes(f.id)).length;
      }
    });
    
    return base;
  };

  const copyTableToClipboard = () => {
    if (!config) return;
    const headers = [];
    if (visibleCols.includes('qbmp')) headers.push("QBMP");
    if (visibleCols.includes('posto')) headers.push("Posto / Grad");
    if (visibleCols.includes('nome')) headers.push("Nome Completo");
    if (visibleCols.includes('rg')) headers.push("RG");
    if (visibleCols.includes('idFuncional')) headers.push("ID Func.");
    if (visibleCols.includes('status')) headers.push("Status");
    
    config.areas.forEach(area => {
      if (displayMode === 'tudo' || displayMode === area.id) {
        area.fields.forEach(f => {
          if (visibleCols.includes(f.id)) headers.push(f.label);
        });
      }
    });

    const rows = filteredMilitars.map(m => {
      const row = [];
      if (visibleCols.includes('qbmp')) row.push((m.quadro || '').split('/')[0].trim());
      if (visibleCols.includes('posto')) row.push(m.rank || '');
      if (visibleCols.includes('nome')) row.push(m.warName || m.name || '');
      if (visibleCols.includes('rg')) row.push(m.rg || '');
      if (visibleCols.includes('idFuncional')) row.push((m as any).idFuncional || '');
      if (visibleCols.includes('status')) row.push(m.hasDbData ? 'FIXADO' : 'DGP');
      
      config.areas.forEach(area => {
        if (displayMode === 'tudo' || displayMode === area.id) {
          area.fields.forEach(f => {
            if (visibleCols.includes(f.id)) row.push((m as any)[f.id] || '');
          });
        }
      });
      return row.join('\t');
    });

    const spreadsheet = [headers.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(spreadsheet);
    alert("Tabela copiada para o clipboard! Você já pode colar no Excel.");
  };

  const handleQuickSave = async (rgStr: string, field: string, newVal: string) => {
    const docRef = doc(db, 'medidasAntropometricas', rgStr);
    const currentData = dbDataMap[rgStr] || {};
    const newData = { ...currentData, [field]: newVal };
    await setDoc(docRef, cleanUndefined({ [field]: newVal }), { merge: true }); // Only merge the specific field to preserve concurrent changes
    setDbDataMap(prev => ({ ...prev, [rgStr]: newData }));
  };

  return (
    <div className="flex flex-col gap-10 w-full max-w-full pb-40">
      <div className="flex flex-col gap-6 lg:gap-8 bg-white p-8 lg:p-10 rounded-[2.5rem] lg:rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
           <Ruler className="w-32 h-32" />
        </div>
        <div className="flex gap-4 lg:gap-6 items-center relative z-10">
            <button 
              onClick={onBack}
              className="w-14 h-14 lg:w-20 lg:h-20 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl lg:rounded-3xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0"
              title="Voltar"
            >
              <ArrowLeft className="w-6 h-6 lg:w-8 lg:h-8" />
            </button>
            <div className="w-14 h-14 lg:w-20 lg:h-20 rounded-2xl lg:rounded-3xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-200 ring-4 lg:ring-8 ring-indigo-50 shrink-0">
               <BookOpen className="w-6 h-6 lg:w-10 lg:h-10" />
            </div>
            <div className="flex flex-col justify-center">
               <h2 className="text-2xl lg:text-4xl font-black text-slate-800 uppercase tracking-tighter leading-tight">Gestão do Efetivo - SOP</h2>
               <p className="text-[10px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Carga Individual e Medidas Antropométricas</p>
            </div>
        </div>

        <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 lg:gap-4 relative z-10 lg:ml-[104px]">
          {isModerator && (
            <>
              <button
                onClick={() => {
                  setEpiRequestMessage('O administrador solicitou que todos os militares revisem e confirmem imediatamente seus dados no sistema. Essa confirmação é necessária.');
                  setEpiRequestFields([]);
                  setShowEpiRequestModal(true);
                }}
                className="flex flex-1 lg:flex-none items-center justify-center gap-2 lg:gap-3 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 px-5 lg:px-6 py-4 lg:py-5 rounded-2xl font-black uppercase text-[9px] lg:text-[10px] tracking-[0.2em] transition-all shadow-sm active:scale-95 group"
                title="Sinalizar que todo o efetivo deve atualizar EPI"
              >
                <AlertCircle className="w-4 h-4 lg:w-5 lg:h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
                <span>Sinalizar Revisão <span className="hidden sm:inline">(EPI)</span></span>
              </button>
              
              <button 
                onClick={() => setShowManualRgModal(true)}
                className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white w-[52px] h-[52px] lg:w-[60px] lg:h-[60px] rounded-2xl transition-all shadow-xl shadow-indigo-200 active:scale-95 shrink-0 hover:rotate-90 duration-300"
                title="Adicionar RG na Relação"
              >
                <Plus className="w-5 h-5 lg:w-6 lg:h-6 font-black" />
              </button>

              <button 
                onClick={() => navigate('/sop-config')}
                className="flex flex-1 lg:flex-none items-center justify-center gap-2 lg:gap-3 bg-slate-900 hover:bg-slate-800 text-white px-5 lg:px-8 py-4 lg:py-5 rounded-2xl font-black uppercase text-[9px] lg:text-[10px] tracking-[0.2em] transition-all shadow-xl shadow-slate-200 active:scale-95 group"
              >
                <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
                <span className="hidden sm:inline">Configurar</span> Sistema
              </button>
            </>
          )}
        </div>
      </div>

      {/* Global Controls & Filters */}
      <div className="flex flex-col gap-6 bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-200/50 w-full">
        <div className="flex flex-col lg:flex-row items-center gap-6 w-full">
          <div className="relative flex-1 w-full group">
            <input 
               type="text"
               placeholder="Pesquisar por nome ou RG..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full bg-white border border-slate-200 rounded-2xl px-14 py-4 font-bold text-slate-700 outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm"
            />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-400 transition-colors" />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm shrink-0 w-full sm:w-auto">
            <button 
              onClick={() => setShowOnlyPending(!showOnlyPending)}
              className={`flex-1 sm:flex-none justify-center flex items-center gap-3 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showOnlyPending ? 'bg-amber-100 text-amber-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <AlertCircle className="w-4 h-4" />
              Solicitações Pendentes {pendingCount > 0 && <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-[9px]">{pendingCount}</span>}
            </button>
            <button 
              onClick={() => setViewType('status')}
              className={`flex-1 sm:flex-none justify-center flex items-center gap-3 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewType === 'status' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Filter className="w-4 h-4" />
              Status
            </button>
            <button 
              onClick={() => setViewType('tamanho')}
              className={`flex-1 sm:flex-none justify-center flex items-center gap-3 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewType === 'tamanho' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Ruler className="w-4 h-4" />
              Tamanhos
            </button>
          </div>
        </div>

        <div className="relative w-full flex items-start gap-2">
          <div className={`flex-1 bg-white p-2 rounded-2xl flex border border-slate-200 shadow-sm transition-all duration-300 gap-1 ${isSectionsExpanded ? 'flex-wrap' : 'overflow-x-auto no-scrollbar scroll-smooth'}`}>
            <button 
              onClick={() => setDisplayMode('tudo')}
              className={`px-8 py-3.5 text-[11px] uppercase tracking-widest font-black rounded-xl transition-all whitespace-nowrap ${displayMode === 'tudo' ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            >
              Visão Geral
            </button>
            {config?.areas.map(area => (
              <button 
                key={area.id}
                onClick={() => setDisplayMode(area.id)}
                className={`px-8 py-3.5 text-[11px] uppercase tracking-widest font-black rounded-xl transition-all whitespace-nowrap ${displayMode === area.id ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              >
                {area.label}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setIsSectionsExpanded(!isSectionsExpanded)}
            className="flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-2xl w-[52px] h-[52px] shrink-0 shadow-sm transition-all"
            title={isSectionsExpanded ? "Recolher Seções" : "Expandir Seções"}
          >
            <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isSectionsExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="flex flex-col gap-6">
           <div className="flex flex-wrap items-center gap-4 flex-1">
              <div className="w-full sm:w-[calc(25%-12px)] min-w-[200px]">
                <MultiSelectFilter label="Posto/Grad" options={uniqueRanks.sort()} selected={filterPostoGrad} onChange={setFilterPostoGrad} />
              </div>
              <div className="w-full sm:w-[calc(25%-12px)] min-w-[200px]">
                <MultiSelectFilter label="Quadro" options={uniqueQuadros.sort()} selected={filterQuadro} onChange={setFilterQuadro} />
              </div>
              <div className="w-full sm:w-[calc(25%-12px)] min-w-[200px]">
                <MultiSelectFilter label="OBM" options={uniqueObms.sort()} selected={filterObm} onChange={setFilterObm} />
              </div>
              <div className="w-full sm:w-[calc(25%-12px)] min-w-[200px]">
                <MultiSelectFilter label="Ala" options={uniqueAlas.sort()} selected={filterAla} onChange={setFilterAla} />
              </div>
              <div className="w-full sm:w-[calc(33.33%-12px)] min-w-[200px]">
                <MultiSelectFilter label="Cidade" options={uniqueCidades.sort()} selected={filterCidade} onChange={setFilterCidade} />
              </div>
              <div className="w-full sm:w-[calc(33.33%-12px)] min-w-[200px]">
                <MultiSelectFilter label="Situação" options={uniqueSituacoes.sort()} selected={filterSituacao} onChange={setFilterSituacao} />
              </div>
              <div className="w-full sm:w-[calc(33.33%-12px)] min-w-[200px] flex items-center gap-2">
                <div className="flex-1"><MultiSelectFilter label="Cursos" options={uniqueCursos.sort()} selected={filterCursos} onChange={setFilterCursos} /></div>
                <button
                  onClick={() => setShowManualRgModal(true)}
                  className="h-[42px] px-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 flex items-center justify-center transition-colors shrink-0 mt-6"
                  title="Adicionar RG manualmente"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="w-full sm:w-[calc(50%-8px)] min-w-[200px] flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Filtrar por Material/Equipamento</label>
                <div className="relative">
                  <select 
                    value={filterMaterialField}
                    onChange={(e) => {
                      setFilterMaterialField(e.target.value);
                      if (!filterMaterialStatus) setFilterMaterialStatus('POSSUI');
                      if (!e.target.value) setFilterMaterialStatus('');
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 appearance-none outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">Selecione um material...</option>
                    {config?.areas.flatMap(a => a.fields).map(f => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              
              <div className="w-full sm:w-[calc(50%-8px)] min-w-[200px] flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Status do Material</label>
                <div className="relative">
                  <select 
                    value={filterMaterialStatus}
                    onChange={(e) => setFilterMaterialStatus(e.target.value)}
                    disabled={!filterMaterialField}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 appearance-none outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50 disabled:bg-slate-50"
                  >
                    <option value="">Selecione um status...</option>
                    <option value="POSSUI">SÓ QUEM POSSUI</option>
                    <option value="NÃO POSSUI">SÓ QUEM NÃO POSSUI</option>
                    <option value="NÃO NECESSITA">SÓ QUEM NÃO NECESSITA</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

           <div className="flex items-center gap-3 justify-end pt-4 border-t border-slate-200/50">
               <div className="relative">
                 <button 
                  onClick={() => setShowColConfig(!showColConfig)}
                  className={`flex items-center justify-center w-14 h-14 rounded-2xl transition-all shadow-sm active:scale-95 border ${showColConfig ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-200' : 'bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-200 border-slate-200'}`}
                  title="Configurar Colunas"
                 >
                    <Settings className="w-6 h-6" />
                 </button>
                 
                 <AnimatePresence>
                  {showColConfig && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm" 
                        onClick={() => setShowColConfig(false)} 
                      />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 30 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl p-8 w-[90vw] max-w-5xl max-h-[85vh] flex flex-col"
                      >
                        <div className="flex items-center justify-between mb-8 shrink-0">
                           <div className="flex flex-col">
                             <h2 className="text-2xl font-black tracking-tight text-slate-900">Visibilidade de Colunas</h2>
                             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Configure os itens do efetivo exibidos na tabela</p>
                           </div>
                           <div className="flex items-center gap-4">
                             <button onClick={() => setVisibleCols(['qbmp', 'posto', 'nome', 'rg', 'idFuncional', 'status', ...(config?.areas.flatMap(a => a.fields.map(f => f.id)) || [])])} className="px-5 py-3 text-[10px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl uppercase tracking-widest transition-colors">
                               Ativar Tudo
                             </button>
                             <button onClick={() => setVisibleCols([])} className="px-5 py-3 text-[10px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl uppercase tracking-widest transition-colors">
                               Desativar Tudo
                             </button>
                             <button onClick={() => setShowColConfig(false)} className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors">
                               <X className="w-5 h-5" />
                             </button>
                           </div>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-4 small-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                           {/* Static Funcional Area */}
                           <div className="flex flex-col">
                             <div className="flex items-center gap-3 mb-4 pb-2 border-b border-slate-100">
                               <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                               <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">Dados Funcionais</p>
                             </div>
                             <div className="grid grid-cols-1 gap-2">
                               {[
                                 { id: 'qbmp', label: 'QBMP' },
                                 { id: 'posto', label: 'Posto / Grad' },
                                 { id: 'nome', label: 'Nome Completo' },
                                 { id: 'rg', label: 'RG' },
                                 { id: 'status', label: 'Status' },
                                 { id: 'idFuncional', label: 'ID Funcional' }
                               ].map(col => (
                                 <label key={col.id} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${visibleCols.includes(col.id) ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                                   <div className="flex items-center gap-4">
                                     <input 
                                       type="checkbox" 
                                       checked={visibleCols.includes(col.id)}
                                       onChange={(e) => {
                                         if (e.target.checked) setVisibleCols([...visibleCols, col.id]);
                                         else setVisibleCols(visibleCols.filter(c => c !== col.id));
                                       }}
                                       className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                                     />
                                     <span className={`text-[11px] font-bold uppercase transition-colors ${visibleCols.includes(col.id) ? 'text-indigo-900' : 'text-slate-600'}`}>
                                       {col.label}
                                     </span>
                                   </div>
                                 </label>
                               ))}
                             </div>
                           </div>

                           {config?.areas.map(area => (
                             <div key={area.id} className="flex flex-col">
                                <div className="flex items-center gap-3 mb-4 pb-2 border-b border-slate-100">
                                  <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">{area.label}</p>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                  {area.fields.map(f => (
                                    <label key={f.id} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${visibleCols.includes(f.id) ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                                      <div className="flex items-center gap-4">
                                        <input 
                                          type="checkbox" 
                                          checked={visibleCols.includes(f.id)}
                                          onChange={(e) => {
                                            if (e.target.checked) setVisibleCols([...visibleCols, f.id]);
                                            else setVisibleCols(visibleCols.filter(c => c !== f.id));
                                          }}
                                          className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer"
                                        />
                                        <span className={`text-[11px] font-bold uppercase transition-colors ${visibleCols.includes(f.id) ? 'text-indigo-900' : 'text-slate-600'}`}>
                                          {f.label}
                                        </span>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                             </div>
                           ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                 </AnimatePresence>
               </div>

               <button 
                onClick={copyTableToClipboard}
                className="flex items-center justify-center gap-3 bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-slate-200 active:scale-95"
               >
                  <Copy className="w-4 h-4" />
                  Copiar
               </button>

               <button 
                onClick={() => {
                  const exportData = filteredMilitars.map(m => {
                    const row: any = {};
                    if (visibleCols.includes('qbmp')) row['QBMP'] = (m.quadro || '').split('/')[0].trim();
                    if (visibleCols.includes('posto')) row['Posto'] = m.rank || '';
                    if (visibleCols.includes('nome')) row['Nome Completo'] = m.warName || m.name || '';
                    if (visibleCols.includes('rg')) row['RG'] = (m as any).rgStr || m.rg || '';
                    if (visibleCols.includes('idFuncional')) row['ID Func.'] = (m as any).idFuncional || '';
                    if (visibleCols.includes('status')) row['Status'] = m.statusAlteracao === 'PENDENTE' ? 'PENDENTE' : (m.hasDbData ? 'FIXADO' : 'DGP');

                    config?.areas.forEach(area => {
                      if (displayMode === 'tudo' || displayMode === area.id) {
                        area.fields.forEach(f => {
                          if (visibleCols.includes(f.id)) {
                            row[f.label] = (m as any)[f.id] || '-';
                          }
                        });
                      }
                    });
                    return row;
                  });
                  exportToExcel(exportData, 'Efetivo_SOP', 'SOP_Gestao');
                }}
                className="flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl shadow-emerald-100 active:scale-95"
               >
                  <Download className="w-4 h-4" />
                  Exportar
               </button>
           </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto border border-slate-200 rounded-[2.5rem] shadow-sm bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest font-black text-slate-500">
                    <th className="p-4 border-r border-slate-100 text-center w-12">
                      <input 
                        type="checkbox" 
                        checked={allFilteredSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </th>
                    {visibleCols.includes('qbmp') && (
                      <th className="p-4 border-r border-slate-100 whitespace-nowrap">QBMP</th>
                    )}
                    {visibleCols.includes('posto') && (
                      <th className="p-4 border-r border-slate-100 whitespace-nowrap">Posto / Grad</th>
                    )}
                    {visibleCols.includes('nome') && (
                      <th className="p-4 border-r border-slate-100 whitespace-nowrap">Nome de Guerra</th>
                    )}
                    {visibleCols.includes('rg') && (
                      <th className="p-4 border-r border-slate-100 whitespace-nowrap">RG</th>
                    )}
                    {visibleCols.includes('idFuncional') && (
                      <th className="p-4 border-r border-slate-100 whitespace-nowrap">ID Func.</th>
                    )}
                    {visibleCols.includes('status') && (
                      <th className="p-4 border-r border-slate-100 whitespace-nowrap text-center">Status</th>
                    )}

                    {config?.areas.map(area => (
                      (displayMode === 'tudo' || displayMode === area.id) && (
                        <React.Fragment key={area.id}>
                          {area.fields.map(f => visibleCols.includes(f.id) && (
                            <th key={f.id} className="p-4 border-r border-slate-100 whitespace-nowrap text-center">
                              {f.label}
                            </th>
                          ))}
                        </React.Fragment>
                      )
                    ))}
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 text-[10px] font-semibold text-slate-700">
                 {loading || !config ? (
                    <tr>
                       <td colSpan={getColSpan()} className="p-20 text-center">
                         <div className="flex flex-col items-center gap-4">
                           <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
                           <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Sincronizando Dados do Efetivo...</span>
                         </div>
                       </td>
                    </tr>
                 ) : paginatedMilitars.length === 0 ? (
                    <tr>
                       <td colSpan={getColSpan()} className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest bg-slate-50/30">
                         <div className="flex flex-col items-center gap-3">
                           <div className="p-4 bg-white rounded-full shadow-sm border border-slate-100">
                             <X className="w-6 h-6 text-slate-200" />
                           </div>
                           <span>Nenhum militar encontrado para os filtros atuais</span>
                         </div>
                       </td>
                    </tr>
                 ) : (
                    paginatedMilitars.map((item, i) => (
                      <tr key={i} className={`hover:bg-slate-50 transition-colors ${selectedRgs.includes(item.rgStr) ? 'bg-emerald-50/40' : ''}`}>
                        <td className="p-4 border-r border-slate-100 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedRgs.includes(item.rgStr)}
                            onChange={() => toggleSelectOne(item.rgStr)}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>
                        {visibleCols.includes('qbmp') && (
                          <td className="p-4 border-r border-slate-100">{item.quadro ? item.quadro.split('/')[0].trim() : '-'}</td>
                        )}
                        {visibleCols.includes('posto') && (
                          <td className="p-4 border-r border-slate-100 uppercase font-black text-slate-600">{item.rank}</td>
                        )}
                        {visibleCols.includes('nome') && (
                          <td className="p-4 border-r border-slate-100 uppercase font-black">{item.warName || item.name}</td>
                        )}
                        {visibleCols.includes('rg') && (
                          <td className="p-4 border-r border-slate-100 text-slate-500 font-mono tracking-wider">{item.rg}</td>
                        )}
                        {visibleCols.includes('idFuncional') && (
                          <td className="p-4 border-r border-slate-100 text-slate-500 font-mono tracking-wider">{item.idFuncional || '-'}</td>
                        )}
                        {visibleCols.includes('status') && (
                          <td className="p-4 border-r border-slate-100 text-center">
                             {item.statusAlteracao === 'PENDENTE' ? (
                               <button 
                                 onClick={() => setReviewingRequestFor(item.rgStr)}
                                 className="inline-flex items-center px-2 py-1 rounded bg-amber-100 text-amber-700 text-[8px] font-black uppercase tracking-widest whitespace-nowrap hover:bg-amber-200 transition-colors"
                               >
                                 REVISAR SOLICITAÇÃO
                               </button>
                             ) : item.hasDbData ? (
                               <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase tracking-widest whitespace-nowrap">FIXADO</span>
                             ) : (
                               <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[8px] font-black uppercase tracking-widest whitespace-nowrap">DGP</span>
                             )}
                          </td>
                        )}

                        {config?.areas.map(area => (
                          (displayMode === 'tudo' || displayMode === area.id) && (
                            <React.Fragment key={area.id}>
                              {area.fields.map(f => visibleCols.includes(f.id) && (
                                <EditableSopCell
                                  key={f.id}
                                  item={item}
                                  field={f.id}
                                  value={(item as any)[f.id]}
                                  isEditing={editingCell?.rg === item.rgStr && editingCell?.field === f.id}
                                  editingValue={editingCell?.rg === item.rgStr && editingCell?.field === f.id ? editingCell.value : ''}
                                  onSetEditing={setEditingCell}
                                  onEditingValueChange={(val) => setEditingCell(prev => prev ? { ...prev, value: val } : null)}
                                  onSaveEdit={handleSaveEdit}
                                  isModerator={user.isAdmin || user.isEscalante || false}
                                  isOwnItem={user.rg === item.rg}
                                  fieldType={f.type || 'text'}
                                  viewType={viewType}
                                  saving={saving}
                                  onQuickSave={handleQuickSave}
                                />
                              ))}
                            </React.Fragment>
                          )
                        ))}
                      </tr>
                    ))
                 )}
               </tbody>
            </table>
          </div>
          {totalPages > 1 && (
             <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-white rounded-b-3xl">
               <button onClick={() => setCurrentPage(c => Math.max(1, c - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-slate-100 transition-colors">Anterior</button>
               <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Página {currentPage} de {totalPages}</span>
               <button onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-slate-100 transition-colors">Próxima</button>
             </div>
          )}

          {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {isModerator && selectedRgs.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-4xl px-4"
          >
            <div className="bg-slate-900 text-white rounded-3xl shadow-2xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 px-2">
                <div className="bg-emerald-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-sm">
                  {selectedRgs.length}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Militares Selecionados</p>
                  <p className="text-xs font-bold text-white">Ação em Massa</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-[300px] justify-center lg:justify-end">
                <div className="relative group/bulk">
                  <select
                    className="bg-slate-800 border-none text-[10px] font-black uppercase tracking-widest py-3 px-6 rounded-2xl cursor-pointer hover:bg-slate-700 transition-all outline-none pr-10 appearance-none"
                    onChange={(e) => setBulkActionField(e.target.value)}
                    value={bulkActionField || ''}
                  >
                    <option value="" disabled>Escolha o Campo...</option>
                    {config?.areas.map(area => (
                       <optgroup key={area.id} label={area.label}>
                         {area.fields.map(f => (
                           <option key={f.id} value={f.id}>{f.label}</option>
                         ))}
                       </optgroup>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>

                {bulkActionField && (
                  <div className="flex items-center gap-1 animate-in slide-in-from-right-4">
                    <div className="h-8 w-px bg-slate-800 mx-2" />
                    <button 
                      onClick={() => handleBulkUpdate('POSSUI')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
                    >
                      Possui
                    </button>
                    <button 
                      onClick={() => handleBulkUpdate('NÃO POSSUI')}
                      className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
                    >
                      Não
                    </button>
                    <button 
                      onClick={() => handleBulkUpdate('NÃO NECESSITA')}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
                    >
                      N.N
                    </button>
                  </div>
                )}

                <button 
                  onClick={() => setSelectedRgs([])}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-400 p-3 rounded-2xl transition-all"
                  title="Limpar Seleção"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEpiRequestModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative"
            >
              <button 
                onClick={() => setShowEpiRequestModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Requerer Atualização</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Configurar aviso ao efetivo</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Mensagem do Alerta</label>
                  <textarea 
                    value={epiRequestMessage}
                    onChange={(e) => setEpiRequestMessage(e.target.value)}
                    className="w-full h-24 bg-slate-100 rounded-xl p-4 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20 focus:bg-white transition-all border border-transparent focus:border-amber-300 resize-none"
                    placeholder="Digite a mensagem que o usuário verá no painel..."
                  />
                </div>

                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Áreas de Atenção (Opcional)</label>
                   <p className="text-xs text-slate-400 mb-3 font-medium">Selecione áreas específicas que deseja que os militares foquem durante a atualização.</p>
                   <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto p-1">
                      {config?.areas.map(area => (
                        <button
                          key={area.id}
                          onClick={() => {
                            if (epiRequestFields.includes(area.id)) {
                              setEpiRequestFields(epiRequestFields.filter(id => id !== area.id));
                            } else {
                              setEpiRequestFields([...epiRequestFields, area.id]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${epiRequestFields.includes(area.id) ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                          {area.label}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
                   <button
                      onClick={async () => {
                         try {
                           setSaving(true);
                           await setDoc(doc(db, 'config', 'epi_request'), cleanUndefined({
                              isActive: true,
                              requestedAt: new Date().toISOString(),
                              message: epiRequestMessage,
                              targetAreas: epiRequestFields.length > 0 ? epiRequestFields : null
                           }));
                           alert("Alerta disparado com sucesso!");
                           setShowEpiRequestModal(false);
                         } catch(e) {
                           console.error(e);
                           alert("Erro ao disparar alerta.");
                         } finally {
                           setSaving(false);
                         }
                      }}
                      disabled={saving}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-amber-200"
                   >
                     {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check className="w-4 h-4" /> Disparar Alerta</>}
                   </button>
                   
                   <button
                      onClick={async () => {
                         try {
                           setSaving(true);
                           await setDoc(doc(db, 'config', 'epi_request'), cleanUndefined({
                              isActive: false,
                              requestedAt: null,
                              message: null,
                              targetAreas: null
                           }));
                           alert("Alerta cancelado.");
                           setShowEpiRequestModal(false);
                         } catch(e) {
                           console.error(e);
                           alert("Erro ao cancelar alerta.");
                         } finally {
                           setSaving(false);
                         }
                      }}
                      disabled={saving}
                      className="px-6 py-4 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-xl transition-all"
                      title="Cancelar Alerta Ativo"
                   >
                     Desativar Alerta
                   </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      <AnimatePresence>
        {reviewingRequestFor && (
          <ReviewRequestModal 
            rg={reviewingRequestFor}
            militar={filteredMilitars.find(m => m.rgStr === reviewingRequestFor)}
            dbDataMap={dbDataMap}
            config={config}
            onClose={() => setReviewingRequestFor(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const ReviewRequestModal = ({ rg, militar, dbDataMap, config, onClose }: any) => {
  const currentData = dbDataMap[rg] || {};
  const [saving, setSaving] = useState(false);

  const changes: any[] = [];
  const payloadToApprove: any = {};
  const payloadToReject: any = {};

  if (config) {
    config.areas.forEach((area: any) => {
      const isPending = currentData[`statusAlteracao_${area.id}`] === 'PENDENTE';
      const pendingAreaUpdate = currentData[`pendingUpdate_${area.id}`] || {};
      
      if (isPending) {
        payloadToApprove[`statusAlteracao_${area.id}`] = deleteField();
        payloadToApprove[`pendingUpdate_${area.id}`] = deleteField();
        payloadToReject[`statusAlteracao_${area.id}`] = deleteField();
        payloadToReject[`pendingUpdate_${area.id}`] = deleteField();

        area.fields.forEach((f: any) => {
          const oldVal = currentData[f.id] || '-';
          const newVal = pendingAreaUpdate[f.id];
          
          if (newVal !== undefined && newVal !== oldVal) {
            changes.push({ label: f.label, oldVal, newVal, area: area.label });
            payloadToApprove[f.id] = newVal; // apply the change
          }
        });
      }
    });
  }

  const handleApprove = async () => {
    setSaving(true);
    const docRef = doc(db, 'medidasAntropometricas', rg);
    await setDoc(docRef, cleanUndefined(payloadToApprove), { merge: true });
    setSaving(false);
    onClose();
  };

  const handleReject = async () => {
    setSaving(true);
    const docRef = doc(db, 'medidasAntropometricas', rg);
    await setDoc(docRef, cleanUndefined(payloadToReject), { merge: true });
    setSaving(false);
    onClose();
  };

  return (
    <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
       <motion.div className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl relative flex flex-col max-h-[90vh]" initial={{scale:0.95, y:20}} animate={{scale:1, y:0}}>
         <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
         <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-1 shrink-0">Revisar Solicitação</h3>
         <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 shrink-0">Militar: {militar?.name || militar?.warName} (RG: {rg})</p>
         
         <div className="space-y-3 mb-8 overflow-y-auto pr-2 small-scrollbar flex-1 min-h-0">
            {changes.length === 0 ? (
              <p className="text-sm font-medium text-slate-500">Nenhuma alteração detectada.</p>
            ) : (
              changes.map((c, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-cyan-600 uppercase tracking-widest bg-cyan-50 px-2 py-0.5 rounded-md">{c.area}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex-1 text-sm font-bold text-rose-500 bg-rose-50 p-2 rounded-lg line-through text-center">{c.oldVal}</span>
                    <ArrowLeft className="w-4 h-4 text-slate-300 rotate-180 shrink-0" />
                    <span className="flex-1 text-sm font-bold text-emerald-600 bg-emerald-50 p-2 rounded-lg text-center">{c.newVal}</span>
                  </div>
                </div>
              ))
            )}
         </div>

         <div className="flex gap-4 shrink-0">
           <button onClick={handleReject} disabled={saving || changes.length === 0} className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
             Rejeitar
           </button>
           <button onClick={handleApprove} disabled={saving || changes.length === 0} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed">
             {saving ? 'Processando...' : 'Aprovar Mudanças'}
           </button>
         </div>
       </motion.div>
    </motion.div>
  );
};
