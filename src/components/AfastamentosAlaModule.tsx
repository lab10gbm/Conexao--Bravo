import React, { useState, useEffect, useMemo } from 'react';
import { getLocalIsoDateString, normalizeAlaField, cn, normalizeObm, getUserObmAccess, normalizeRg } from '../lib/utils';
import { useMilitars } from '../contexts/MilitarContext';
import { db } from '../lib/firebase';
import { collection, setDoc, doc, deleteDoc, onSnapshot, getDocs } from 'firebase/firestore';
import { Plus, Calendar, X, Search, AlertCircle, CheckCircle2, UserPlus } from 'lucide-react';
import { Afastamento } from '../features/ferias/types';
import { AfastamentoAddForm } from '../features/ferias/components/AfastamentoAddForm';
import { AfastamentosTable, formatDateBr, parseDdMmYyyyToIso } from '../features/ferias/components/AfastamentosTable';
import { isPracaForAla } from '../features/ferias/components/SearchableMilitarSelect';
import { AdicionarMilitarModal } from './AdicionarMilitarModal';

export { normalizeRg, isPracaForAla };
export type { Afastamento };

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
  const [showAddMilitarModal, setShowAddMilitarModal] = useState(false);
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header com gradiente sutil e informações */}
      <div className="py-2 px-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-rose-100 text-rose-700 rounded-xl shadow-xs">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Afastamentos e Férias
            </h3>
            <span className="text-[9.5px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-widest">
              {obmContext}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddMilitarModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-black uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer"
            title="Adicionar novo militar ao banco de dados e servidor"
          >
            <UserPlus className="w-3 h-3" />
            <span>Adicionar Militar</span>
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-black uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            {showAddForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showAddForm ? 'Fechar Cadastro' : 'Novo Afastamento'}
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="px-3.5 py-1.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          {saveSuccessMsg}
        </div>
      )}

      {/* Formulário Retrátil para Adicionar Afastamento */}
      {showAddForm && (
        <AfastamentoAddForm
          newRg={newRg}
          setNewRg={setNewRg}
          newInicio={newInicio}
          setNewInicio={setNewInicio}
          newRetorno={newRetorno}
          setNewRetorno={setNewRetorno}
          newAla={newAla}
          setNewAla={setNewAla}
          newSituacao={newSituacao}
          setNewSituacao={setNewSituacao}
          newObs={newObs}
          setNewObs={setNewObs}
          isAdding={isAdding}
          onSave={handleAdd}
          militars={militars}
          obmContext={obmContext}
          situacoes={SITUACOES}
        />
      )}

      {/* Barra de Abas e Filtros de Pesquisa */}
      <div className="py-2 px-3 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('atuais')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1 whitespace-nowrap",
              activeTab === 'atuais'
                ? "bg-rose-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            Atuais
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[9.5px] font-black",
              activeTab === 'atuais' ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            )}>
              {atuais.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('proximos')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1 whitespace-nowrap",
              activeTab === 'proximos'
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            Próximos
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[9.5px] font-black",
              activeTab === 'proximos' ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            )}>
              {proximos.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('passados')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1 whitespace-nowrap",
              activeTab === 'passados'
                ? "bg-slate-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            Histórico
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[9.5px] font-black",
              activeTab === 'passados' ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            )}>
              {passados.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('todos')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1 whitespace-nowrap",
              activeTab === 'todos'
                ? "bg-teal-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            Todos
            <span className={cn(
              "px-1.5 py-0.2 rounded-full text-[9.5px] font-black",
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
            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10.5px] font-black uppercase text-slate-600 outline-none"
          >
            <option value="TODAS">TODOS MOTIVOS</option>
            {SITUACOES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Busca por Militar */}
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar militar ou RG..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 pr-2.5 py-1 bg-white border border-slate-200 focus:border-indigo-400 rounded-lg text-xs font-bold text-slate-700 outline-none w-44 sm:w-52"
            />
          </div>
        </div>
      </div>

      {/* Banner se Atuais estiver vazio */}
      {activeTab === 'atuais' && atuais.length === 0 && !loading && (
        <div className="py-2 px-3.5 bg-amber-50/70 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-amber-800 text-[11px] font-bold">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              Nenhum militar em afastamento ativo hoje ({formatDateBr(now)}). Existem <strong className="font-black text-indigo-700">{proximos.length} agendados</strong> e <strong className="font-black text-slate-700">{passados.length} no histórico</strong>.
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {proximos.length > 0 && (
              <button
                onClick={() => setActiveTab('proximos')}
                className="px-2.5 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[9.5px] font-black uppercase tracking-wider transition-colors shadow-xs"
              >
                Ver Próximos ({proximos.length})
              </button>
            )}
            <button
              onClick={() => setActiveTab('todos')}
              className="px-2.5 py-0.5 bg-slate-700 hover:bg-slate-800 text-white rounded text-[9.5px] font-black uppercase tracking-wider transition-colors shadow-xs"
            >
              Ver Todos ({allCombinedAfastamentos.length})
            </button>
          </div>
        </div>
      )}

      {/* Tabela de Resultados */}
      <AfastamentosTable
        displayedList={displayedList}
        loading={loading}
        searchTerm={searchTerm}
        activeTab={activeTab}
        now={now}
        militars={militars}
        obmContext={obmContext}
        editingId={editingId}
        editData={editData}
        setEditData={setEditData}
        onSaveEdit={saveEdit}
        onCancelEdit={cancelEditing}
        onStartEdit={startEditing}
        onDelete={handleDelete}
        situacoes={SITUACOES}
      />

      {/* Modal para Adicionar Militar Diretamente ao Banco de Dados e Servidor */}
      <AdicionarMilitarModal
        isOpen={showAddMilitarModal}
        onClose={() => setShowAddMilitarModal(false)}
        obmContext={obmContext}
        initialAla={filterAla || '1'}
        onSuccess={() => {
          setSaveSuccessMsg('Militar cadastrado com sucesso no banco de dados e servidor!');
          setTimeout(() => setSaveSuccessMsg(''), 4000);
        }}
      />
    </div>
  );
}
