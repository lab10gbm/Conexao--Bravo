import React, { useState, useEffect, useMemo } from 'react';
import { getLocalIsoDateString, normalizeAlaField, cn, normalizeObm, getUserObmAccess } from '../lib/utils';
import { useMilitars } from '../contexts/MilitarContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, setDoc, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Plus, Trash2, Calendar, Loader2, Edit2, Check, X, Search, Filter, AlertCircle, Clock, CheckCircle2, CalendarDays } from 'lucide-react';
import { parseRank, sortAllBySeniority } from '../lib/rankUtils';

export function normalizeRg(rg: string | number | undefined) {
  if (!rg) return '';
  return String(rg).replace(/^0+/, '').replace(/\D/g, '');
}

function parseDdMmYyyyToIso(dateStr?: string): string | null {
  if (!dateStr) return null;
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    if (year.length === 4) {
      return `${year}-${month}-${day}`;
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return null;
}

function formatDateBr(isoStr?: string): string {
  if (!isoStr) return '—';
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoStr;
}

function SearchableMilitarSelect({ 
  value, 
  onChange, 
  militars, 
  obmContext,
  onMilitarSelected
}: {
  value: string;
  onChange: (val: string) => void;
  militars: any[];
  obmContext: string;
  onMilitarSelected?: (militar: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allowedObms = getUserObmAccess(normalizeObm(obmContext), normalizeObm(obmContext) === 'GLOBAL');
  const filteredMilitars = militars
    .filter(m => !m.obm || allowedObms.includes(normalizeObm(m.obm)) || normalizeObm(obmContext) === 'GLOBAL')
    .sort(sortAllBySeniority);

  const selectedMilitar = filteredMilitars.find(m => normalizeRg(m.rg) === value);
  const displayValue = open 
    ? search 
    : (selectedMilitar ? `${parseRank(selectedMilitar.rank)} ${selectedMilitar.warName || selectedMilitar.name} (${selectedMilitar.rg})` : '');

  const normalizeString = (str: string) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const searchWords = normalizeString(search).split(/\s+/).filter(Boolean);
  
  const searchResults = filteredMilitars.filter(m => {
    const text = normalizeString(`${m.rank} ${parseRank(m.rank)} ${m.name} ${m.warName || ''} ${m.rg}`);
    return searchWords.every(word => text.includes(word));
  });

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
        placeholder="Selecione ou busque..."
        value={displayValue}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setSearch('');
        }}
      />
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
          {searchResults.length > 0 ? (
            searchResults.map(m => {
              const val = normalizeRg(m.rg);
              return (
                <div
                  key={val}
                  className="px-3 py-2 text-xs cursor-pointer hover:bg-indigo-50 text-slate-700 font-bold transition-colors"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(val);
                    if (onMilitarSelected) onMilitarSelected(m);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span>{parseRank(m.rank)} {m.warName || m.name}</span>
                    <span className="font-mono text-[10px] text-slate-400">RG {m.rg}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-3 py-2 text-xs text-slate-500 text-center font-medium">Nenhum militar encontrado</div>
          )}
        </div>
      )}
    </div>
  );
}

export interface Afastamento {
  id: string;
  rg: string;
  ala: string;
  inicio: string;
  retorno: string;
  situacao: string;
  obs: string;
  obm: string;
  isAutomatic?: boolean;
  source?: 'manual' | 'dgp';
}

interface AfastamentosAlaModuleProps {
  obmContext: string;
  type?: 'atuais' | 'anual';
  filterAla?: string;
  targetDate?: string;
}

const SITUACOES = ['FERIAS', 'LICENÇA', 'CURSO', 'NÚPCIAS', 'LUTO', 'DISPENSA', 'OUTROS'];

export function AfastamentosAlaModule({ obmContext, type = 'atuais', filterAla, targetDate }: AfastamentosAlaModuleProps) {
  const { militars } = useMilitars();
  const [afastamentos, setAfastamentos] = useState<Afastamento[]>([]);
  const [dgpVacations, setDgpVacations] = useState<Afastamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'atuais' | 'proximos' | 'passados' | 'todos'>(type === 'atuais' ? 'atuais' : 'todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSituacao, setFilterSituacao] = useState('TODAS');

  // New entry state
  const [newInicio, setNewInicio] = useState(targetDate || getLocalIsoDateString());
  const [newRetorno, setNewRetorno] = useState('');
  const [newAla, setNewAla] = useState(() => (filterAla ? normalizeAlaField(filterAla) || '1' : '1'));
  const [newRg, setNewRg] = useState('');
  const [newSituacao, setNewSituacao] = useState('FERIAS');
  const [newObs, setNewObs] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Afastamento>>({});

  useEffect(() => {
    if (filterAla) {
      setNewAla(normalizeAlaField(filterAla) || '1');
    }
  }, [filterAla]);

  // Real-time listener for afastamentos_alas
  useEffect(() => {
    if (!obmContext) return;
    setLoading(true);

    const q = collection(db, 'afastamentos_alas');
    const unsub = onSnapshot(q, (snap) => {
      const allowedObms = getUserObmAccess(normalizeObm(obmContext), normalizeObm(obmContext) === 'GLOBAL');
      const isGlobal = !obmContext || normalizeObm(obmContext) === 'GLOBAL';

      const rawData: Afastamento[] = [];
      snap.forEach(docSnap => {
        rawData.push({ id: docSnap.id, source: 'manual', ...docSnap.data() } as Afastamento);
      });

      // Deduplicate identical records (same RG, inicio, retorno, situacao)
      const seen = new Set<string>();
      const uniqueManual: Afastamento[] = [];
      for (const item of rawData) {
        const key = `${normalizeRg(item.rg)}_${item.inicio}_${item.retorno}_${(item.situacao || '').toUpperCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueManual.push(item);
        }
      }

      // Filter by OBM Context
      const filteredByObm = uniqueManual.filter(a => {
        if (isGlobal) return true;
        const docObm = a.obm ? normalizeObm(a.obm) : '';
        if (docObm && allowedObms.includes(docObm)) return true;
        const m = militars.find(mil => normalizeRg(mil.rg) === normalizeRg(a.rg));
        if (m && m.obm && allowedObms.includes(normalizeObm(m.obm))) return true;
        if (!docObm && !m?.obm) return true;
        return false;
      });

      setAfastamentos(filteredByObm);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching afastamentos:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [obmContext, militars]);

  // Load vacations from DGP / vacations collection
  useEffect(() => {
    let active = true;
    const fetchDgp = async () => {
      try {
        const vSnap = await getDocs(collection(db, 'vacations'));
        if (!active) return;
        const allowedObms = getUserObmAccess(normalizeObm(obmContext), normalizeObm(obmContext) === 'GLOBAL');
        const isGlobal = !obmContext || normalizeObm(obmContext) === 'GLOBAL';

        const list: Afastamento[] = [];
        vSnap.forEach(d => {
          const vData = d.data();
          const cleanRg = normalizeRg(vData.militarRg);
          if (!cleanRg) return;

          const militar = militars.find(m => normalizeRg(m.rg) === cleanRg);
          if (!isGlobal) {
            const mObm = militar?.obm ? normalizeObm(militar.obm) : '';
            if (mObm && !allowedObms.includes(mObm)) return;
          }

          const isoInicio = parseDdMmYyyyToIso(vData.dataInicio);
          const isoRetorno = parseDdMmYyyyToIso(vData.dataRetorno);
          if (!isoInicio || !isoRetorno) return;

          list.push({
            id: `dgp_${d.id}`,
            rg: cleanRg,
            ala: normalizeAlaField(militar?.ala) || '',
            inicio: isoInicio,
            retorno: isoRetorno,
            situacao: 'FERIAS',
            obs: vData.boletim ? `DGP Boletim: ${vData.boletim}` : 'Férias DGP',
            obm: militar?.obm || obmContext,
            source: 'dgp'
          });
        });

        setDgpVacations(list);
      } catch (e) {
        console.warn("Could not load DGP vacations in AfastamentosAlaModule:", e);
      }
    };

    fetchDgp();
    return () => { active = false; };
  }, [obmContext, militars]);

  // Combine manual afastamentos and DGP vacations (avoiding duplicates)
  const allCombinedAfastamentos = useMemo(() => {
    const manualKeys = new Set(
      afastamentos.map(a => `${normalizeRg(a.rg)}_${a.inicio}_${a.retorno}`)
    );

    const merged = [...afastamentos];
    for (const dgp of dgpVacations) {
      const key = `${normalizeRg(dgp.rg)}_${dgp.inicio}_${dgp.retorno}`;
      if (!manualKeys.has(key)) {
        merged.push(dgp);
      }
    }
    return merged;
  }, [afastamentos, dgpVacations]);

  const handleAdd = async () => {
    if (!newRg || !newInicio || !newRetorno) {
      alert("Por favor preencha RG do militar, Data de Início e Data de Retorno.");
      return;
    }
    
    setIsAdding(true);
    try {
      const militar = militars.find(m => normalizeRg(m.rg) === normalizeRg(newRg));
      const targetObm = militar?.obm ? normalizeObm(militar.obm) : normalizeObm(obmContext);
      const targetAla = newAla ? normalizeAlaField(newAla) : (militar?.ala ? normalizeAlaField(militar.ala) : '1');

      const newRef = doc(collection(db, 'afastamentos_alas'));
      await setDoc(newRef, {
        rg: normalizeRg(newRg),
        ala: targetAla,
        inicio: newInicio,
        retorno: newRetorno,
        situacao: newSituacao,
        tipoAfastamento: newSituacao,
        obs: newObs,
        obm: targetObm,
        createdAt: new Date().toISOString()
      });
      
      setSaveSuccessMsg(`Afastamento registrado com sucesso para o RG ${newRg}!`);
      setTimeout(() => setSaveSuccessMsg(''), 4000);

      setNewRetorno('');
      setNewRg('');
      setNewObs('');
      setShowAddForm(false);
      setActiveTab('todos');
    } catch (e: any) {
      console.error(e);
      alert("Erro ao adicionar afastamento: " + (e.message || 'Erro desconhecido'));
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string, source?: string) => {
    if (source === 'dgp') {
      alert("Registros importados do DGP devem ser alterados diretamente no módulo de Férias.");
      return;
    }
    if (!confirm("Tem certeza que deseja excluir este registro de afastamento?")) return;
    try {
      await deleteDoc(doc(db, 'afastamentos_alas', id));
    } catch (e: any) {
      console.error(e);
      alert("Erro ao excluir: " + e.message);
    }
  };

  const startEditing = (a: Afastamento) => {
    if (a.source === 'dgp') {
      alert("Registros de Férias DGP não podem ser editados manualmente nesta tela.");
      return;
    }
    setEditingId(a.id);
    setEditData({ ...a });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const updatedAla = editData.ala ? (normalizeAlaField(editData.ala) || editData.ala) : undefined;
      const updatedSituacao = editData.situacao || 'FERIAS';
      await setDoc(doc(db, 'afastamentos_alas', editingId), {
        ...editData,
        ala: updatedAla,
        situacao: updatedSituacao,
        tipoAfastamento: updatedSituacao,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setEditingId(null);
      setEditData({});
    } catch (e) {
      console.error(e);
    }
  };

  // Categorize based on current reference date
  const now = targetDate || getLocalIsoDateString(); // YYYY-MM-DD
  
  const passados: Afastamento[] = [];
  const atuais: Afastamento[] = [];
  const proximos: Afastamento[] = [];

  allCombinedAfastamentos.forEach(a => {
    const militar = militars.find(m => normalizeRg(m.rg) === normalizeRg(a.rg));
    const militarAla = normalizeAlaField(a.ala || militar?.ala);
    if (filterAla && militarAla && militarAla !== normalizeAlaField(filterAla)) return;
    
    if (now > a.retorno) {
      passados.push(a);
    } else if (now >= a.inicio && now <= a.retorno) {
      atuais.push(a);
    } else {
      proximos.push(a);
    }
  });

  const sortByInicioDesc = (a: Afastamento, b: Afastamento) => b.inicio.localeCompare(a.inicio);
  const sortByInicioAsc = (a: Afastamento, b: Afastamento) => a.inicio.localeCompare(b.inicio);
  passados.sort((a,b) => b.retorno.localeCompare(a.retorno)); // Recentes primeiro
  atuais.sort(sortByInicioAsc);
  proximos.sort(sortByInicioAsc);

  // Filter based on active tab, search term, and situacao
  const getTabList = () => {
    switch (activeTab) {
      case 'atuais': return atuais;
      case 'proximos': return proximos;
      case 'passados': return passados;
      case 'todos': return allCombinedAfastamentos.sort(sortByInicioDesc);
      default: return atuais;
    }
  };

  const displayedList = getTabList().filter(a => {
    const militar = militars.find(m => normalizeRg(m.rg) === normalizeRg(a.rg));
    if (filterSituacao !== 'TODAS' && a.situacao !== filterSituacao) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase().trim();
    const cleanRgTerm = normalizeRg(searchTerm);
    const matchesRg = cleanRgTerm ? normalizeRg(a.rg).includes(cleanRgTerm) : false;
    const nameMatch = (militar?.name || '').toLowerCase().includes(term) || (militar?.warName || '').toLowerCase().includes(term);
    const obsMatch = (a.obs || '').toLowerCase().includes(term);
    return matchesRg || nameMatch || obsMatch;
  });

  const getStatusBadge = (a: Afastamento) => {
    if (now >= a.inicio && now <= a.retorno) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
          Ativo Hoje
        </span>
      );
    }
    if (now < a.inicio) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
          <Clock className="w-2.5 h-2.5" />
          Agendado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
        <CheckCircle2 className="w-2.5 h-2.5" />
        Concluído
      </span>
    );
  };

  const getSituacaoBadge = (situacao: string) => {
    const s = (situacao || '').toUpperCase();
    if (s === 'FERIAS') return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">FÉRIAS</span>;
    if (s === 'LICENÇA' || s === 'LICENCA') return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">LICENÇA</span>;
    if (s === 'CURSO') return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">CURSO</span>;
    if (s === 'DISPENSA') return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">DISPENSA</span>;
    return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">{s}</span>;
  };

  const renderRow = (a: Afastamento) => {
    const militar = militars.find(m => normalizeRg(m.rg) === normalizeRg(a.rg));
    
    if (editingId === a.id) {
      return (
        <tr key={a.id} className="bg-indigo-50/60 border-b border-indigo-200">
          <td className="p-2 border-r border-slate-200">
            <input type="date" value={editData.inicio || ''} onChange={e => setEditData({...editData, inicio: e.target.value})} className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500 font-mono font-bold" />
          </td>
          <td className="p-2 border-r border-slate-200">
            <input type="date" value={editData.retorno || ''} onChange={e => setEditData({...editData, retorno: e.target.value})} className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500 font-mono font-bold" />
          </td>
          <td className="p-2 border-r border-slate-200">
            <select value={editData.ala || '1'} onChange={e => setEditData({...editData, ala: e.target.value})} className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500 font-black uppercase">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="EXP">EXP</option>
            </select>
          </td>
          <td className="p-2 border-r border-slate-200">
            <SearchableMilitarSelect
              value={editData.rg || ''}
              onChange={(val) => setEditData({ ...editData, rg: val })}
              militars={militars}
              obmContext={obmContext}
            />
          </td>
          <td className="p-2 border-r border-slate-200">
            <select value={editData.situacao || 'FERIAS'} onChange={e => setEditData({...editData, situacao: e.target.value})} className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500 uppercase font-black text-slate-700">
              {SITUACOES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </td>
          <td className="p-2 border-r border-slate-200">
            <input type="text" placeholder="Obs..." value={editData.obs || ''} onChange={e => setEditData({...editData, obs: e.target.value})} className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500 font-medium" />
          </td>
          <td className="p-2 text-center">
            <div className="flex items-center justify-center gap-1">
              <button onClick={saveEdit} className="text-emerald-700 bg-emerald-100 hover:bg-emerald-200 p-1.5 rounded-lg transition-colors" title="Salvar">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={cancelEditing} className="text-slate-500 bg-slate-200 hover:bg-slate-300 p-1.5 rounded-lg transition-colors" title="Cancelar">
                <X className="w-4 h-4" />
              </button>
            </div>
          </td>
        </tr>
      );
    }

    return (
      <tr key={a.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
        <td className="px-4 py-3 border-r border-slate-100 font-mono font-bold text-slate-700 text-xs">
          {formatDateBr(a.inicio)}
        </td>
        <td className="px-4 py-3 border-r border-slate-100 font-mono font-bold text-slate-700 text-xs">
          {formatDateBr(a.retorno)}
        </td>
        <td className="px-3 py-3 border-r border-slate-100 text-center">
          <span className={cn(
            "px-2 py-1 rounded-md text-[10px] font-black uppercase",
            a.ala === '1' ? 'bg-emerald-100 text-emerald-800' :
            a.ala === '2' ? 'bg-rose-100 text-rose-800' :
            a.ala === '3' ? 'bg-blue-100 text-blue-800' :
            a.ala === '4' ? 'bg-amber-100 text-amber-800' :
            'bg-slate-200 text-slate-800'
          )}>
            ALA {a.ala || '—'}
          </span>
        </td>
        <td className="px-4 py-3 border-r border-slate-100">
          <div className="flex flex-col">
            <span className="font-black text-slate-800 text-xs">
              {militar ? `${parseRank(militar.rank)} ${militar.warName || militar.name}` : `Militar RG: ${a.rg}`}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[10px] font-bold text-slate-400">RG {a.rg}</span>
              {militar?.obm && <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1 rounded">{militar.obm}</span>}
              {a.source === 'dgp' && <span className="text-[9px] font-bold bg-sky-50 text-sky-600 border border-sky-200 px-1 rounded">DGP</span>}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 border-r border-slate-100">
          <div className="flex items-center gap-2">
            {getSituacaoBadge(a.situacao)}
            {getStatusBadge(a)}
          </div>
        </td>
        <td className="px-4 py-3 border-r border-slate-100 font-medium text-[11px] text-slate-600 max-w-[220px] truncate" title={a.obs}>
          {a.obs || '—'}
        </td>
        <td className="px-3 py-3 text-center">
          <div className="flex items-center justify-center gap-1">
            {a.source !== 'dgp' ? (
              <>
                <button onClick={() => startEditing(a)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors" title="Editar">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(a.id, a.source)} className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors" title="Excluir">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <span className="text-[10px] text-slate-400 font-bold italic" title="Importado via DGP Férias">DGP</span>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col mb-6">
      {/* Header com gradiente sutil e informações */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-100 text-rose-700 rounded-2xl shadow-sm">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
                Afastamentos e Férias
              </h3>
              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-widest">
                {obmContext}
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
              Controle unificado de férias, licenças e cursos operacionais com histórico completo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
          >
            {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showAddForm ? 'Fechar Cadastro' : 'Novo Afastamento'}
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {saveSuccessMsg}
        </div>
      )}

      {/* Formulário Retrátil para Adicionar Afastamento */}
      {showAddForm && (
        <div className="p-4 sm:p-5 bg-indigo-50/40 border-b border-indigo-100 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="text-xs font-black uppercase tracking-wider text-indigo-900 mb-3 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-600" />
            Cadastrar Novo Afastamento / Férias
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Militar</label>
              <SearchableMilitarSelect
                value={newRg}
                onChange={setNewRg}
                militars={militars}
                obmContext={obmContext}
                onMilitarSelected={(m) => {
                  if (m.ala) setNewAla(normalizeAlaField(m.ala) || '1');
                }}
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Início</label>
              <input
                type="date"
                value={newInicio}
                onChange={e => setNewInicio(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Retorno</label>
              <input
                type="date"
                value={newRetorno}
                onChange={e => setNewRetorno(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Ala Operacional</label>
              <select
                value={newAla}
                onChange={e => setNewAla(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded px-2.5 py-1.5 text-xs font-black uppercase text-slate-700 outline-none"
              >
                <option value="1">ALA 1</option>
                <option value="2">ALA 2</option>
                <option value="3">ALA 3</option>
                <option value="4">ALA 4</option>
                <option value="EXP">EXPEDIENTE</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Motivo / Situação</label>
              <select
                value={newSituacao}
                onChange={e => setNewSituacao(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded px-2.5 py-1.5 text-xs font-black uppercase text-slate-700 outline-none"
              >
                {SITUACOES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="md:col-span-5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Observações (Opcional)</label>
              <input
                type="text"
                placeholder="Ex: Portaria nº 123, Curso de Salvamento Marítimo, etc."
                value={newObs}
                onChange={e => setNewObs(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none"
              />
            </div>

            <div className="md:col-span-1 flex items-end">
              <button
                onClick={handleAdd}
                disabled={isAdding}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded px-3 py-2 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Abas e Filtros de Pesquisa */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('atuais')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap",
              activeTab === 'atuais'
                ? "bg-rose-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            Atuais
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-black",
              activeTab === 'atuais' ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            )}>
              {atuais.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('proximos')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap",
              activeTab === 'proximos'
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            Próximos
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-black",
              activeTab === 'proximos' ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            )}>
              {proximos.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('passados')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap",
              activeTab === 'passados'
                ? "bg-slate-700 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            Histórico
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-black",
              activeTab === 'passados' ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            )}>
              {passados.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('todos')}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap",
              activeTab === 'todos'
                ? "bg-teal-700 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            Todos
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-black",
              activeTab === 'todos' ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            )}>
              {allCombinedAfastamentos.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Filtro Situação */}
          <select
            value={filterSituacao}
            onChange={(e) => setFilterSituacao(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-black uppercase text-slate-600 outline-none"
          >
            <option value="TODAS">TODOS MOTIVOS</option>
            {SITUACOES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Busca por Militar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar militar ou RG..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 focus:border-indigo-400 rounded-xl text-xs font-bold text-slate-700 outline-none w-48 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* Banner se Atuais estiver vazio */}
      {activeTab === 'atuais' && atuais.length === 0 && !loading && (
        <div className="p-4 bg-amber-50/70 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Nenhum militar em afastamento ativo hoje ({formatDateBr(now)}). Existem <strong className="font-black text-indigo-700">{proximos.length} agendados</strong> para o futuro e <strong className="font-black text-slate-700">{passados.length} no histórico</strong>.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {proximos.length > 0 && (
              <button
                onClick={() => setActiveTab('proximos')}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shadow-xs"
              >
                Ver Próximos ({proximos.length})
              </button>
            )}
            <button
              onClick={() => setActiveTab('todos')}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shadow-xs"
            >
              Ver Todos ({allCombinedAfastamentos.length})
            </button>
          </div>
        </div>
      )}

      {/* Tabela de Resultados */}
      <div className="p-0 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-slate-100/90 text-slate-500 uppercase tracking-widest text-[10px] font-black border-b border-slate-200">
              <th className="px-4 py-3 border-r border-slate-200 w-28">Início</th>
              <th className="px-4 py-3 border-r border-slate-200 w-28">Retorno</th>
              <th className="px-3 py-3 border-r border-slate-200 text-center w-24">ALA</th>
              <th className="px-4 py-3 border-r border-slate-200">Militar / RG</th>
              <th className="px-4 py-3 border-r border-slate-200 w-52">Situação & Status</th>
              <th className="px-4 py-3 border-r border-slate-200">Observações</th>
              <th className="px-3 py-3 w-16 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    Carregando registros de afastamentos...
                  </div>
                </td>
              </tr>
            ) : displayedList.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest">
                  {searchTerm
                    ? `Nenhum afastamento encontrado para o termo "${searchTerm}".`
                    : `Nenhum afastamento na categoria ${activeTab.toUpperCase()}.`}
                </td>
              </tr>
            ) : (
              displayedList.map(a => renderRow(a))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
