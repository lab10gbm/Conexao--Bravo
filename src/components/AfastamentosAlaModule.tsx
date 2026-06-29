import React, { useState, useEffect } from 'react';
import { useMilitars } from '../contexts/MilitarContext';
import { db } from '../lib/firebase';
import { collection, query, getDocs, setDoc, doc, deleteDoc, where, onSnapshot } from 'firebase/firestore';
import { Plus, Trash2, Calendar, Loader2, Lock, Edit2, Check, X } from 'lucide-react';
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Afastamento>>({});

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
      alert("Erro ao salvar edição");
    }
  };

  useEffect(() => {
    if (type === 'anual' && obmContext) {
      const isImported = localStorage.getItem('auto_import_afastamentos_v2');
      if (!isImported) {
        localStorage.setItem('auto_import_afastamentos_v2', 'true');
        setTimeout(() => {
           handleImport(true);
        }, 1500);
      }
    }
  }, [type, obmContext]);

  const handleImport = async (silent = false) => {
    if (!silent && !confirm("Deseja substituir a carga inicial de afastamentos? Isso apagará a importação anterior.")) return;
    setIsAdding(true);
    
    // Deletar os antigos importados automaticamente
    try {
      const q = query(collection(db, 'afastamentos_alas'), where('isAutomatic', '==', true), where('obm', '==', obmContext.toUpperCase()));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {
      console.error("Erro ao apagar antigos:", e);
    }

    const dataGroups = [
      { ala: '4', raw: `02/02/2026	14/02/2026	61109	SOLDADO MATHEUS SANTOS	CURSO	CTRM
27/04/2026	09/05/2026	61385	SOLDADO F LOPES	CURSO	CTRM
27/04/2026	09/05/2026	61417	SOLDADO AZEREDO	CURSO	CTRM
02/03/2026	20/03/2026	61385	SOLDADO F LOPES	CURSO	CBSOC
23/03/2026	10/04/2026	61109	SOLDADO MATHEUS SANTOS	CURSO	CBSOC
01/04/2026	01/10/2026	49628	CABO TEIXEIRA	LICENÇA	L. ESPECIAL
28/01/2026	31/10/2026	54409	SOLDADO RENAN GOMES	CURSO	Csmar
	01/05/2026	54320	SOLDADO VICTOR HUGO	FERIAS	FERIAS
02/05/2026	31/05/2026	20960	SUBTENENTE GONCALVES	FERIAS	FERIAS`},
      { ala: '3', raw: `06/04/2026	18/04/2026	61427	SOLDADO ELIAS	CURSO	CTRM
27/04/2026	09/05/2026	61302	SOLDADO OLIVEIRA	CURSO	CTRM
02/03/2026	20/03/2026	61302	SOLDADO OLIVEIRA	CURSO	CBSOC
	29/04/2026	54325	SOLDADO L RODRIGUES	LICENÇA	
01/04/2026	01/10/2026	32102	1º SARGENTO LUIS	LICENÇA	L. ESPECIAL
	01/05/2026	31610	1º SARGENTO S JUNIOR	FERIAS	`},
      { ala: '2', raw: `02/02/2026	14/02/2026	61207	SOLDADO R ALVES	CURSO	CTRM
23/03/2026	04/04/2026	61205	SOLDADO WANDERMUREM	CURSO	CTRM
23/03/2026	10/04/2026	61207	SOLDADO R ALVES	CURSO	CBSOC
05/10/2026	24/10/2026	61205	SOLDADO WANDERMUREM	CURSO	CBSOC
01/04/2026	01/05/2026	23458	SUBTENENTE SENAS	FERIAS	
01/04/2026	01/05/2026	54755	SOLDADO DOS SANTOS	FERIAS	
01/04/2026	01/05/2026	2200842	SOLDADO YAN GUEDES	FERIAS	
02/05/2026	31/05/2026	54236	SOLDADO ABREU	FERIAS	FERIAS
02/05/2026	31/05/2026	53772	SOLDADO ALBUQUERQUE	FERIAS	FERIAS`}
    ];

    let added = 0;
    for (const group of dataGroups) {
      const lines = group.raw.trim().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        let parts = line.split('\t');
        if (parts.length < 5) continue;
        
        const inicio = parts[0];
        const retorno = parts[1];
        const rgRaw = parts[2];
        const situacao = parts[4];
        const obs = parts[5] || '';
        
        const normRg = normalizeRg(rgRaw);
        if (!normRg) continue;
        
        const parseDate = (d: string) => {
          if (!d || !d.trim()) return '';
          const p = d.trim().split('/');
          if (p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
          return d.trim();
        };
        
        let iniParsed = parseDate(inicio);
        let retParsed = parseDate(retorno);
        if (!iniParsed && retParsed) iniParsed = retParsed;
        if (!retParsed && iniParsed) retParsed = iniParsed;
        
        let obm = obmContext.toUpperCase();
        let ala = group.ala; // Force based on requested list
        const m = militars.find(m => normalizeRg(m.rg) === normRg);
        if (m) {
          if (m.obm) obm = m.obm.toUpperCase();
        }
        
        try {
          const newRef = doc(collection(db, 'afastamentos_alas'));
          await setDoc(newRef, {
            rg: normRg,
            ala: ala,
            inicio: iniParsed,
            retorno: retParsed,
            situacao: situacao.trim().toUpperCase(),
            obs: obs.trim(),
            obm: obm,
            createdAt: new Date().toISOString(),
            isAutomatic: true
          });
          added++;
        } catch (e) {
          console.error(e);
        }
      }
    }
    if (!silent) alert(`Importados ${added} registros com sucesso! As alas 2, 3 e 4 foram definidas conforme a lista.`);
    setIsAdding(false);
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
                        <select value={editData.rg || ''} onChange={e => setEditData({...editData, rg: e.target.value})} className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400">
                          <option value="">Selecione o Militar...</option>
                          {militars.filter(m => !m.obm || m.obm.toUpperCase() === obmContext.toUpperCase() || obmContext.toUpperCase() === 'GLOBAL').sort((a,b) => (a.name||'').localeCompare(b.name||'')).map(m => (
                            <option key={m.rg} value={normalizeRg(m.rg)}>{m.rank} {m.warName || m.name} ({m.rg})</option>
                          ))}
                        </select>
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
