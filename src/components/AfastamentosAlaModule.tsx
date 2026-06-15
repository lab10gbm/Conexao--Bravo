import React, { useState, useEffect } from 'react';
import { useMilitars } from '../contexts/MilitarContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, setDoc, doc, deleteDoc, where, onSnapshot } from 'firebase/firestore';
import { Plus, Trash2, Calendar, Loader2, Lock } from 'lucide-react';
import { cn } from '../lib/utils';

export function normalizeRg(rg: string | number | undefined) {
  if (!rg) return '';
  return String(rg).replace(/^0+/, '').replace(/\D/g, '');
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
}

const SITUACOES = ['FERIAS', 'LICENÇA', 'CURSO', 'NÚPCIAS', 'LUTO', 'DISPENSA', 'OUTROS'];

export function AfastamentosAlaModule({ obmContext, type }: AfastamentosAlaModuleProps) {
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

  useEffect(() => {
    if (!obmContext) return;
    const q = query(collection(db, 'afastamentos_alas'), where('obm', '==', obmContext.toUpperCase()));
    
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
      alert("Preencha RG, Início e Retorno");
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
        obm: obmContext.toUpperCase(),
        createdAt: new Date().toISOString()
      });
      
      setNewInicio('');
      setNewRetorno('');
      setNewRg('');
      setNewObs('');
    } catch (e) {
      console.error(e);
      alert("Erro ao adicionar");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja remover este afastamento?")) return;
    try {
      await deleteDoc(doc(db, 'afastamentos_alas', id));
    } catch (e) {
      console.error(e);
      alert("Erro ao remover");
    }
  };

  // Filtrar baseados no "type" e logic
  const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const filtered = afastamentos.filter(a => {
     if (type === 'atuais') {
       // Se o periodo atual bate com a data
       const ini = a.inicio;
       const ret = a.retorno;
       return now >= ini && now <= ret;
     } else {
       // anual = todos, ou podemos filtrar por ano. vamos mostrar todos na tabela "Cadastro Anual"
       return true; 
     }
  });

  if (type === 'atuais' && filtered.length === 0) {
      return null;
  }

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
            {loading ? (
              <tr><td colSpan={7} className="p-4 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse"><Loader2 className="w-4 h-4 mx-auto animate-spin" /></td></tr>
            ) : filtered.length === 0 && type !== 'anual' ? (
              <tr><td colSpan={7} className="p-4 text-center text-slate-400 font-bold uppercase tracking-widest">Nenhum militar afastado</td></tr>
            ) : (
              filtered.map(a => {
                const militar = militars.find(m => normalizeRg(m.rg) === a.rg);
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
                    <td className="px-4 py-2 border-r border-slate-100 font-mono text-[10px] text-slate-500 max-w-[200px] truncate">{a.obs}</td>
                    <td className="px-4 py-2 border-slate-100 text-center">
                      <button onClick={() => handleDelete(a.id)} className="text-slate-300 hover:text-rose-500 transition-colors p-1 rounded-md hover:bg-rose-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}

            {/* Nova Linha para Cadastro Anual */}
            {type === 'anual' && (
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
                    <select value={newRg} onChange={e => setNewRg(e.target.value)} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400">
                      <option value="">Selecione o Militar...</option>
                      {militars.filter(m => !m.obm || m.obm.toUpperCase() === obmContext.toUpperCase() || obmContext.toUpperCase() === 'GLOBAL').sort((a,b) => (a.name||'').localeCompare(b.name||'')).map(m => (
                        <option key={m.rg} value={normalizeRg(m.rg)}>{m.rank} {m.warName || m.name} ({m.rg})</option>
                      ))}
                    </select>
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
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
