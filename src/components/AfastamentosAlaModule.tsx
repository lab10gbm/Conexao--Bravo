import React, { useState, useEffect } from 'react';
import { useMilitars } from '../contexts/MilitarContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, setDoc, doc, deleteDoc, where, onSnapshot } from 'firebase/firestore';
import { Plus, Trash2, Calendar, Loader2, Lock, Edit2, Check, X } from 'lucide-react';
import { cn, normalizeObm, getUserObmAccess } from '../lib/utils';
import { parseRank, sortAllBySeniority } from '../lib/rankUtils';

export function normalizeRg(rg: string | number | undefined) {
  if (!rg) return '';
  return String(rg).replace(/^0+/, '').replace(/\D/g, '');
}

function SearchableMilitarSelect({ 
  value, 
  onChange, 
  militars, 
  obmContext 
}: {
  value: string;
  onChange: (val: string) => void;
  militars: any[];
  obmContext: string;
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
        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400"
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
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded shadow-lg max-h-48 overflow-y-auto">
          {searchResults.length > 0 ? (
            searchResults.map(m => {
              const val = normalizeRg(m.rg);
              return (
                <div
                  key={val}
                  className="px-2 py-1.5 text-xs cursor-pointer hover:bg-indigo-50 text-slate-700 font-bold border-b border-slate-100 last:border-0"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(val);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  {parseRank(m.rank)} {m.warName || m.name} ({m.rg})
                </div>
              );
            })
          ) : (
            <div className="px-2 py-2 text-xs text-slate-500 text-center">Nenhum encontrado</div>
          )}
        </div>
      )}
    </div>
  );
}

interface Afastamento {
  id: string;
  rg: string;
  ala: string;
  inicio: string;
  retorno: string;
  situacao: string;
  obs: string;
  obm: string;
  isAutomatic?: boolean;
}

interface AfastamentosAlaModuleProps {
  obmContext: string;
  type: 'atuais' | 'anual';
  filterAla?: string;
}

const SITUACOES = ['FERIAS', 'LICENÇA', 'CURSO', 'NÚPCIAS', 'LUTO', 'DISPENSA', 'OUTROS'];

export function AfastamentosAlaModule({ obmContext, type, filterAla }: AfastamentosAlaModuleProps) {
  const { militars } = useMilitars();
  const [afastamentos, setAfastamentos] = useState<Afastamento[]>([]);
  const [loading, setLoading] = useState(true);

  // New entry state
  const [newInicio, setNewInicio] = useState('');
  const [newRetorno, setNewRetorno] = useState('');
  const [newAla, setNewAla] = useState('1');
  const [newRg, setNewRg] = useState('');
  const [newSituacao, setNewSituacao] = useState('FERIAS');
  const [newObs, setNewObs] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Afastamento>>({});

  useEffect(() => {
    if (!obmContext) return;
    const q = query(collection(db, 'afastamentos_alas'), where('obm', '==', normalizeObm(obmContext)));
    
    // Using snapshot for real-time updates
    const unsub = onSnapshot(q, (snap) => {
      const data: Afastamento[] = [];
      snap.forEach(doc => {
         data.push({ id: doc.id, ...doc.data() } as Afastamento);
      });
      setAfastamentos(data);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching afastamentos:", err);
      setLoading(false);
    });
    
    return () => unsub();
  }, [obmContext]);

  const handleAdd = async () => {
    if (!newRg || !newInicio || !newRetorno) {
      console.warn("Preencha RG, Início e Retorno");
      return;
    }
    
    setIsAdding(true);
    try {
      const newRef = doc(collection(db, 'afastamentos_alas'));
      await setDoc(newRef, {
        rg: normalizeRg(newRg),
        ala: newAla,
        inicio: newInicio,
        retorno: newRetorno,
        situacao: newSituacao,
        obs: newObs,
        obm: normalizeObm(obmContext),
        createdAt: new Date().toISOString()
      });
      
      setNewInicio('');
      setNewRetorno('');
      setNewRg('');
      setNewObs('');
    } catch (e) {
      console.error(e);
      console.warn("Erro ao adicionar");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'afastamentos_alas', id));
    } catch (e) {
      console.error(e);
    }
  };

  const startEditing = (a: Afastamento) => {
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
      await setDoc(doc(db, 'afastamentos_alas', editingId), editData, { merge: true });
      setEditingId(null);
      setEditData({});
    } catch (e) {
      console.error(e);
    }
  };

  // Categorizar e ordenar
  const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  const passados: Afastamento[] = [];
  const atuais: Afastamento[] = [];
  const proximos: Afastamento[] = [];

  afastamentos.forEach(a => {
    if (filterAla && a.ala !== filterAla) return; // Filtra por ala se fornecido
    
    if (now > a.retorno) {
      passados.push(a);
    } else if (now >= a.inicio && now <= a.retorno) {
      atuais.push(a);
    } else {
      proximos.push(a);
    }
  });

  const sortByInicioDesc = (a: Afastamento, b: Afastamento) => b.inicio.localeCompare(a.inicio);
  passados.sort((a,b) => b.retorno.localeCompare(a.retorno)); // Recentes primeiro
  atuais.sort(sortByInicioDesc);
  proximos.sort(sortByInicioDesc);

  const filtered = type === 'atuais' ? atuais : afastamentos;

  const renderRow = (a: Afastamento) => {
    const militar = militars.find(m => normalizeRg(m.rg) === a.rg);
    
    if (editingId === a.id) {
      return (
        <tr key={a.id} className="bg-indigo-50/50">
          <td className="p-2 border-r border-slate-200">
            <input type="date" value={editData.inicio || ''} onChange={e => setEditData({...editData, inicio: e.target.value})} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-400" />
          </td>
          <td className="p-2 border-r border-slate-200">
            <input type="date" value={editData.retorno || ''} onChange={e => setEditData({...editData, retorno: e.target.value})} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-400" />
          </td>
          <td className="p-2 border-r border-slate-200">
            <select value={editData.ala || '1'} onChange={e => setEditData({...editData, ala: e.target.value})} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-400 uppercase">
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
            <select value={editData.situacao || 'FERIAS'} onChange={e => setEditData({...editData, situacao: e.target.value})} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-400 uppercase font-bold text-slate-600">
              {SITUACOES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </td>
          <td className="p-2 border-r border-slate-200">
            <input type="text" placeholder="Obs..." value={editData.obs || ''} onChange={e => setEditData({...editData, obs: e.target.value})} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-400" />
          </td>
          <td className="p-2 text-center flex items-center justify-center gap-1">
            <button onClick={saveEdit} className="text-emerald-500 hover:bg-emerald-50 p-1 rounded transition-colors">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={cancelEditing} className="text-slate-400 hover:bg-slate-100 p-1 rounded transition-colors">
              <X className="w-4 h-4" />
            </button>
          </td>
        </tr>
      );
    }

    return (
      <tr key={a.id} className="hover:bg-slate-50">
        <td className="px-4 py-2 border-r border-slate-100 font-mono text-slate-600">{a.inicio}</td>
        <td className="px-4 py-2 border-r border-slate-100 font-mono text-slate-600">{a.retorno}</td>
        <td className="px-4 py-2 border-r border-slate-100 font-black text-slate-700 text-center">{a.ala}</td>
        <td className="px-4 py-2 border-r border-slate-100">
          <div className="flex flex-col">
            <span className="font-bold text-slate-700">{militar ? `${militar.rank} ${militar.warName || militar.name}` : a.rg}</span>
            {militar && <span className="font-mono text-[9px] text-slate-400">{a.rg}</span>}
          </div>
        </td>
        <td className="px-4 py-2 border-r border-slate-100 font-black text-slate-600">{a.situacao}</td>
        <td className="px-4 py-2 border-r border-slate-100 font-mono text-[10px] text-slate-500 max-w-[200px] truncate" title={a.obs}>{a.obs}</td>
        <td className="px-4 py-2 border-slate-100 text-center flex items-center justify-center gap-1">
          <button onClick={() => startEditing(a)} className="text-slate-300 hover:text-indigo-500 transition-colors p-1 rounded-md hover:bg-indigo-50" title="Editar">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(a.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1 rounded-md hover:bg-rose-50" title="Excluir">
            <Trash2 className="w-4 h-4" />
          </button>
        </td>
      </tr>
    );
  };

  const renderGroup = (list: Afastamento[], title: string, badgeColor: string) => {
    if (list.length === 0) return null;
    return (
      <>
        <tr className="bg-slate-50/80 border-y border-slate-200">
          <td colSpan={7} className="px-4 py-2 font-black text-[10px] uppercase tracking-widest text-slate-500">
             {title} <span className={cn("ml-2 px-2 py-0.5 rounded-full text-[10px]", badgeColor)}>{list.length}</span>
          </td>
        </tr>
        {list.map(a => renderRow(a))}
      </>
    );
  };

  const renderAddRow = () => {
    if (type !== 'anual') return null;
    return (
      <tr className="bg-indigo-50/30">
        <td className="p-2 border-r border-slate-200">
          <input type="date" value={newInicio} onChange={e => setNewInicio(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-400" />
        </td>
        <td className="p-2 border-r border-slate-200">
          <input type="date" value={newRetorno} onChange={e => setNewRetorno(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-400" />
        </td>
        <td className="p-2 border-r border-slate-200">
          <select value={newAla} onChange={e => setNewAla(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-400 uppercase">
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="EXP">EXP</option>
          </select>
        </td>
        <td className="p-2 border-r border-slate-200">
           <SearchableMilitarSelect
             value={newRg}
             onChange={setNewRg}
             militars={militars}
             obmContext={obmContext}
           />
        </td>
        <td className="p-2 border-r border-slate-200">
          <select value={newSituacao} onChange={e => setNewSituacao(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-400 uppercase font-bold text-slate-600">
            {SITUACOES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </td>
        <td className="p-2 border-r border-slate-200">
          <input type="text" placeholder="Obs..." value={newObs} onChange={e => setNewObs(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-400" />
        </td>
        <td className="p-2 text-center">
          <button onClick={handleAdd} disabled={isAdding} className="w-8 h-8 mx-auto bg-indigo-600 text-white rounded flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 shadow-sm">
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col mb-6">
      <div className={cn(

        "p-4 border-b flex items-center justify-between",
        type === 'atuais' ? "bg-rose-50 border-rose-100" : "bg-emerald-50 border-emerald-100"
      )}>
        <div className="flex items-center gap-3">
          <Calendar className={cn("w-6 h-6", type === 'atuais' ? "text-rose-600" : "text-emerald-600")} />
          <div>
            <h3 className={cn("text-sm font-black uppercase tracking-widest", type === 'atuais' ? "text-rose-700" : "text-emerald-700")}>
              {type === 'atuais' ? 'Afastamentos e Férias (Atuais)' : 'Cadastro Anual de Afastamentos / Férias'}
            </h3>
          </div>
        </div>
      </div>
      
      <div className="p-0 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">Início</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">Retorno</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">ALA</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200 w-64">RG / Militar</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">Situação</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-200">Obs</th>
              <th className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200 w-12 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {renderAddRow()}
            {loading ? (
              <tr><td colSpan={7} className="p-4 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse"><Loader2 className="w-4 h-4 mx-auto animate-spin" /></td></tr>
            ) : filtered.length === 0 && type !== 'anual' ? (
              <tr><td colSpan={7} className="p-4 text-center text-slate-400 font-bold uppercase tracking-widest">Nenhum militar afastado</td></tr>
            ) : type === 'anual' ? (
              <>
                {renderGroup(atuais, 'Em Andamento', 'bg-emerald-100 text-emerald-700')}
                {renderGroup(proximos, 'Próximos Afastamentos', 'bg-indigo-100 text-indigo-700')}
                {renderGroup(passados, 'Histórico (Passados)', 'bg-slate-200 text-slate-700')}
              </>
            ) : (
              filtered.map(a => renderRow(a))
            )}

            {/* Nova Linha para Cadastro Anual */}
            {renderAddRow()}
          </tbody>
        </table>
      </div>
    </div>
  );
}
