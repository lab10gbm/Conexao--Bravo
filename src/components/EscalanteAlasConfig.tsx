import React, { useState, useEffect } from 'react';
import { parseRank, sortAllBySeniority } from "../lib/rankUtils";
import { useMilitars } from '../contexts/MilitarContext';
import { auth } from "../lib/firebase";
import { Search, Loader2, Plus, X, Users, BookmarkCheck, RotateCcw, ShieldCheck, CheckCircle2, AlertTriangle, AlertCircle, Info, ArrowLeftRight, UserPlus, Building2 } from 'lucide-react';
import { cn, normalizeAlaField, normalizeObm } from '../lib/utils';
import { UserProfile } from '../types';
import { AfastamentosAlaModule } from './AfastamentosAlaModule';

function normalizeRg(rg: string | number | undefined) {
  if (!rg) return '';
  return String(rg).replace(/^0+/, '').replace(/\D/g, '');
}

interface EscalanteAlasConfigProps {
  obmContext: string;
}

const ALAS = ['1', '2', '3', '4', 'EXP'];

export function EscalanteAlasConfig({ obmContext }: EscalanteAlasConfigProps) {
  const { militars, loading, refreshMilitars, updateMilitarLocal } = useMilitars();
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [assigningRg, setAssigningRg] = useState<string | null>(null);

  // Estados para Gestão de Padrão Oficial
  const [savingDefault, setSavingDefault] = useState(false);
  const [restoringDefault, setRestoringDefault] = useState(false);
  const [defaultInfo, setDefaultInfo] = useState<{ hasDefault: boolean; updatedAt: string | null; totalMilitaries: number } | null>(null);
  const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Estados para Transferência / Recebimento de Militar
  const [pendingTransfer, setPendingTransfer] = useState<{
    militar: UserProfile;
    targetAla: string;
    targetObm: string;
  } | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  // Modal de Transferência Direta / Receber Militar
  const [showDirectTransferModal, setShowDirectTransferModal] = useState(false);
  const [directSearch, setDirectSearch] = useState('');
  const [directSelectedMilitar, setDirectSelectedMilitar] = useState<UserProfile | null>(null);
  const [directTargetAla, setDirectTargetAla] = useState('1');

  const fetchDefaultInfo = async () => {
    try {
      const res = await fetch('/api/militar/default-alas-info');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDefaultInfo(data);
        }
      }
    } catch (e) {
      console.warn("Could not fetch default alas info:", e);
    }
  };

  useEffect(() => {
    fetchDefaultInfo();
  }, []);

  // Filter by OBM
  const currentNormalizedCtx = normalizeObm(obmContext || '10º GBM');
  const militarsInObm = militars.filter(m => {
    const rawObm = normalizeObm(m.obm || '10º GBM');
    const isExcluded = ['INATIVO', 'EXCLUÍDO', 'EXCLUIDO', 'DESLIGADO'].some(status => (m.situacao || '').trim().toUpperCase().includes(status));
    
    if (isExcluded) return false;
    if (currentNormalizedCtx === 'GLOBAL') return true;
    return rawObm === currentNormalizedCtx;
  });

  const getMilitarsByAla = (alaId: string) => {
    return militarsInObm.filter(m => normalizeAlaField(m.ala) === alaId).sort(sortAllBySeniority);
  };

  const semAlaMilitars = militarsInObm.filter(m => normalizeAlaField(m.ala) === '');

  const [targetAlaToAdd, setTargetAlaToAdd] = useState<string | null>(null);

  const assignAla = async (rg: string, ala: string) => {
    setAssigningRg(rg);
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      await fetch('/api/militar/role', {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        method: 'POST',
        body: JSON.stringify({ rg, role: 'ala', value: ala })
      });
      setTimeout(() => {
        refreshMilitars();
        setAssigningRg(null);
        setTargetAlaToAdd(null);
      }, 500);
    } catch (e) {
      console.error(e);
      setAssigningRg(null);
    }
  };

  // Executar a transferência de um militar entre unidades
  const executeTransfer = async (militar: UserProfile, targetObm: string, targetAla: string) => {
    setIsTransferring(true);
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const res = await fetch('/api/militar/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          rg: militar.rg,
          targetObm,
          targetAla,
          originObm: militar.obm || '10º GBM'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        updateMilitarLocal(militar.rg, { obm: targetObm, ala: targetAla, situacao: 'Ativo' });
        setFeedbackBanner({
          type: 'success',
          text: `Militar ${parseRank(militar.rank)} ${militar.warName || militar.name} transferido para o ${targetObm} (Ala ${targetAla}) com sucesso!`
        });
        setPendingTransfer(null);
        setShowDirectTransferModal(false);
        setDirectSelectedMilitar(null);
        setDirectSearch('');
        setTargetAlaToAdd(null);
        refreshMilitars();
      } else {
        throw new Error(data.error || 'Falha na transferência');
      }
    } catch (err: any) {
      alert("Erro ao transferir militar: " + err.message);
    } finally {
      setIsTransferring(false);
    }
  };

  // Salvar a Formação Atual como Padrão Oficial
  const handleSaveDefaultAlas = async () => {
    setSavingDefault(true);
    setFeedbackBanner(null);
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      
      const formationMap: Record<string, any> = {};
      for (const m of militars) {
        if (!m.rg) continue;
        formationMap[normalizeRg(m.rg)] = {
          rg: normalizeRg(m.rg),
          name: m.name || '',
          warName: m.warName || m.name || '',
          rank: m.rank || '',
          ala: (m.ala || '').toString().trim(),
          obm: m.obm || null,
          quadro: m.quadro || null
        };
      }

      const res = await fetch('/api/militar/save-default-alas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ formation: formationMap })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbackBanner({
          type: 'success',
          text: `Formação atual das alas (${data.count} militares) registrada com sucesso como Padrão Oficial no banco de dados e servidor!`
        });
        fetchDefaultInfo();
        refreshMilitars();
      } else {
        throw new Error(data.error || 'Falha ao salvar padrão');
      }
    } catch (err: any) {
      console.error(err);
      setFeedbackBanner({
        type: 'error',
        text: `Erro ao salvar padrão oficial: ${err.message || 'Erro de conexão'}`
      });
    } finally {
      setSavingDefault(false);
    }
  };

  // Restaurar a Formação do Padrão Oficial
  const handleRestoreDefaultAlas = async () => {
    setRestoringDefault(true);
    setShowRestoreConfirmModal(false);
    setFeedbackBanner(null);
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const res = await fetch('/api/militar/restore-default-alas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedbackBanner({
          type: 'success',
          text: `Formação oficial padrão restaurada com sucesso! (${data.count} militares sincronizados)`
        });
        refreshMilitars();
      } else {
        throw new Error(data.error || 'Falha ao restaurar padrão');
      }
    } catch (err: any) {
      console.error(err);
      setFeedbackBanner({
        type: 'error',
        text: `Erro ao restaurar formação padrão: ${err.message || 'Erro de conexão'}`
      });
    } finally {
      setRestoringDefault(false);
    }
  };

  const getHeaderColor = (ala: string) => {
    switch (ala) {
      case '1': return 'bg-emerald-600 text-emerald-50';
      case '2': return 'bg-rose-600 text-rose-50';
      case '3': return 'bg-blue-600 text-blue-50';
      case '4': return 'bg-amber-500 text-amber-50';
      case 'EXP': return 'bg-slate-700 text-slate-50';
      default: return 'bg-slate-200 text-slate-800';
    }
  };

  if (loading) {
     return <div className="p-8 flex items-center justify-center text-slate-400 font-black uppercase text-[10px] tracking-widest gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carregando efetivo...</div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Banner de Feedback */}
      {feedbackBanner && (
        <div className={cn(
          "p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold border animate-in fade-in slide-in-from-top-2 duration-300",
          feedbackBanner.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-900" :
          feedbackBanner.type === 'error' ? "bg-rose-50 border-rose-200 text-rose-900" :
          "bg-blue-50 border-blue-200 text-blue-900"
        )}>
          <div className="flex items-center gap-2">
            {feedbackBanner.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
            {feedbackBanner.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
            {feedbackBanner.type === 'info' && <Info className="w-5 h-5 text-blue-600 shrink-0" />}
            <span>{feedbackBanner.text}</span>
          </div>
          <button
            onClick={() => setFeedbackBanner(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Módulo Unificado de Afastamentos e Férias com Abas Completas */}
      <AfastamentosAlaModule obmContext={obmContext} type="atuais" />

      {/* Painel de Gestão e Garantia do Padrão Oficial das Alas + Transferência */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                Controle de Ala & Gestão de Efetivo
                <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full uppercase tracking-widest border border-indigo-500/30">
                  {obmContext} (CBA VII)
                </span>
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Gerencie alocações nas alas e transfira militares entre unidades e DBMs da área do CBA VII.
              </p>
            </div>
          </div>

          {/* Resumo da Composição */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mr-1">Efetivo {obmContext}:</span>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Ala 1: {getMilitarsByAla('1').length}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Ala 2: {getMilitarsByAla('2').length}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Ala 3: {getMilitarsByAla('3').length}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Ala 4: {getMilitarsByAla('4').length}
            </span>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-500/20 text-slate-300 border border-slate-500/30">
              EXP: {getMilitarsByAla('EXP').length}
            </span>
            {semAlaMilitars.length > 0 && (
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Sem Ala: {semAlaMilitars.length}
              </span>
            )}
          </div>

          {defaultInfo?.updatedAt && (
            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5 pt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Último padrão gravado em: <span className="font-mono text-slate-300">{new Date(defaultInfo.updatedAt).toLocaleString('pt-BR')}</span>
            </p>
          )}
        </div>

        {/* Botões de Ação para Gravar, Restaurar e Transferir */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowDirectTransferModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md"
            title="Receber e transferir militar de outra unidade do CBA VII para cá"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Transferir para {obmContext}
          </button>

          <button
            onClick={handleSaveDefaultAlas}
            disabled={savingDefault || restoringDefault}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md disabled:opacity-50"
            title="Registra a formação atual das alas como padrão permanente no banco de dados e servidor"
          >
            {savingDefault ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkCheck className="w-4 h-4" />}
            {savingDefault ? 'Gravando Padrão...' : 'Salvar Padrão Oficial'}
          </button>

          <button
            onClick={() => setShowRestoreConfirmModal(true)}
            disabled={savingDefault || restoringDefault}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 text-slate-200 active:scale-95 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
            title="Restaura a formação padrão oficial caso tenha havido alguma alteração indevida"
          >
            {restoringDefault ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            {restoringDefault ? 'Restaurando...' : 'Restaurar Padrão'}
          </button>
        </div>
      </div>

      {/* POPUP MODAL 1: Confirmação de Transferência disparada ao selecionar militar de outra OBM na Ala */}
      {pendingTransfer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-2xl">
                <ArrowLeftRight className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 tracking-tight">Transferência de Militar (CBA VII)</h4>
                <p className="text-xs text-slate-500 font-medium">Confirmação de recebimento na unidade</p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs font-medium text-amber-950 mb-4 space-y-1">
              <div>
                Militar: <strong className="font-black text-slate-900">{parseRank(pendingTransfer.militar.rank)} {pendingTransfer.militar.warName || pendingTransfer.militar.name}</strong>
              </div>
              <div>
                RG: <span className="font-mono font-bold text-slate-800">{pendingTransfer.militar.rg}</span> • Lotação Atual: <strong className="font-bold text-rose-700">{pendingTransfer.militar.obm || '10º GBM'}</strong>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6 font-medium">
              Este militar está atualmente lotado no <strong>{pendingTransfer.militar.obm || '10º GBM'}</strong>. 
              <br /><br />
              Deseja confirmar a transferência deste militar para o <strong>{obmContext}</strong> e alocá-lo na <strong>ALA {pendingTransfer.targetAla}</strong>?
              <br />
              <span className="text-[11px] text-slate-500 mt-2 block">
                Esta alteração atualizará a OBM do militar no Sistema de Gestão do Efetivo do CBA VII de forma definitiva.
              </span>
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setPendingTransfer(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => executeTransfer(pendingTransfer.militar, pendingTransfer.targetObm, pendingTransfer.targetAla)}
                disabled={isTransferring}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm flex items-center gap-1.5"
              >
                {isTransferring ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirmar Transferência para {obmContext}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL 2: Modal de Transferência Direta / Receber Militar para {obmContext} */}
      {showDirectTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 tracking-tight">Receber / Transferir Militar</h4>
                  <p className="text-xs text-slate-500 font-medium">Destino: {obmContext} (CBA VII)</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDirectTransferModal(false);
                  setDirectSelectedMilitar(null);
                  setDirectSearch('');
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 font-medium">
              Pesquise qualquer militar do CBA VII (10º GBM, 1/10, 2/10, 3/10, 4/10, 26º GBM, etc.) para recebê-lo e transferi-lo para o <strong>{obmContext}</strong>:
            </p>

            {/* Busca de Militar */}
            <div className="space-y-3 mb-6">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar militar por nome ou RG..."
                  value={directSearch}
                  onChange={(e) => setDirectSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  autoFocus
                />
              </div>

              {/* Lista de Sugestões de Busca */}
              {directSearch.length >= 2 && !directSelectedMilitar && (
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-inner">
                  {militars
                    .filter(m => {
                      const searchRg = normalizeRg(directSearch);
                      const matchesRg = searchRg ? normalizeRg(m.rg || '').includes(searchRg) : false;
                      return (m.name || '').toLowerCase().includes(directSearch.toLowerCase()) ||
                             (m.warName || '').toLowerCase().includes(directSearch.toLowerCase()) ||
                             matchesRg;
                    })
                    .slice(0, 15)
                    .map(m => {
                      const mObm = normalizeObm(m.obm || '10º GBM');
                      const isCurrentCtx = mObm === currentNormalizedCtx;

                      return (
                        <div
                          key={m.rg}
                          onClick={() => setDirectSelectedMilitar(m)}
                          className="p-2.5 hover:bg-indigo-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{parseRank(m.rank)} {m.warName || m.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">RG {m.rg}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                              isCurrentCtx ? "bg-slate-100 text-slate-600 border-slate-200" : "bg-amber-100 text-amber-800 border-amber-300"
                            )}>
                              {m.obm || '10º GBM'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Militar Selecionado */}
              {directSelectedMilitar && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black text-indigo-900">
                      {parseRank(directSelectedMilitar.rank)} {directSelectedMilitar.warName || directSelectedMilitar.name}
                    </div>
                    <div className="text-[10px] text-indigo-700 font-medium mt-0.5">
                      RG: {directSelectedMilitar.rg} • Lotação Atual: <strong>{directSelectedMilitar.obm || '10º GBM'}</strong> (Ala: {directSelectedMilitar.ala || 'Sem Ala'})
                    </div>
                  </div>
                  <button
                    onClick={() => setDirectSelectedMilitar(null)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline"
                  >
                    Trocar
                  </button>
                </div>
              )}

              {/* Escolha da Ala de Destino no 2/10 */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                  Ala de Destino no {obmContext}
                </label>
                <select
                  value={directTargetAla}
                  onChange={(e) => setDirectTargetAla(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-black uppercase text-slate-800 outline-none"
                >
                  <option value="1">ALA 1</option>
                  <option value="2">ALA 2</option>
                  <option value="3">ALA 3</option>
                  <option value="4">ALA 4</option>
                  <option value="EXP">EXPEDIENTE</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDirectTransferModal(false);
                  setDirectSelectedMilitar(null);
                  setDirectSearch('');
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => directSelectedMilitar && executeTransfer(directSelectedMilitar, obmContext, directTargetAla)}
                disabled={!directSelectedMilitar || isTransferring}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm flex items-center gap-1.5"
              >
                {isTransferring ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirmar Transferência para {obmContext}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Restaurar Padrão */}
      {showRestoreConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 tracking-tight">Restaurar Formação Padrão?</h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Confirmação de restauração de efetivo</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6 font-medium">
              Esta ação irá restabelecer a distribuição de todos os militares nas respectivas Alas conforme o <strong>Padrão Oficial gravado</strong>, revertendo qualquer alteração não salva ou inconsistência recente.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowRestoreConfirmModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRestoreDefaultAlas}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm"
              >
                Confirmar Restauração
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Título e Pesquisa do Efetivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <h3 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Distribuição do Efetivo nas Alas ({obmContext})
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Mova ou adicione militares entre as alas operacionais.
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar por nome ou RG..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs uppercase font-bold tracking-wider outline-none w-full sm:w-72 transition-all shadow-xs"
          />
        </div>
      </div>

      {/* Grade de Alas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {ALAS.map(ala => {
          const members = getMilitarsByAla(ala).filter(m => {
            if (!searchTerm) return true;
            const searchRg = normalizeRg(searchTerm);
            const matchesRg = searchRg ? normalizeRg(m.rg || '').includes(searchRg) : false;
            return (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                   (m.warName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                   matchesRg;
          });
          const isAdding = targetAlaToAdd === ala;

          return (
            <div key={ala} className="flex flex-col border border-slate-200 rounded-3xl overflow-hidden bg-slate-50/50 relative h-[620px] shadow-xs">
              <div className={cn("p-4 flex items-center justify-between", getHeaderColor(ala))}>
                <div>
                  <h4 className="text-[14px] font-black tracking-wider">ALA {ala}</h4>
                  <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest">{members.length} Militares</p>
                </div>
                <button 
                  onClick={() => {
                    if (isAdding) {
                      setTargetAlaToAdd(null);
                      setLocalSearch('');
                    } else {
                      setTargetAlaToAdd(ala);
                      setLocalSearch('');
                    }
                  }}
                  className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"
                  title={isAdding ? 'Fechar' : `Adicionar militar à Ala ${ala}`}
                >
                  {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>

              {isAdding && (
                <div className="p-3 border-b border-slate-200 bg-white">
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Adicionar à Ala {ala}</div>
                  <div className="relative mb-2">
                    <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Buscar militar de qualquer unidade..."
                      value={localSearch}
                      onChange={(e) => setLocalSearch(e.target.value)}
                      className="pl-7 pr-2 py-1.5 border border-slate-200 focus:border-indigo-400 rounded-lg text-[10px] uppercase font-bold tracking-wider outline-none w-full transition-all"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto pr-1 space-y-1">
                    {(() => {
                      const isExcluded = (m: any) => ['INATIVO', 'EXCLUÍDO', 'EXCLUIDO', 'DESLIGADO'].some(status => (m.situacao || '').trim().toUpperCase().includes(status));
                      
                      const searchPool = militars.filter(m => {
                        if (isExcluded(m)) return false;
                        const mObm = normalizeObm(m.obm || '10º GBM');
                        const ctx = currentNormalizedCtx;
                        
                        // Se já está nesta ala desta OBM, pula
                        if (mObm === ctx && normalizeAlaField(m.ala) === ala) return false;
                        
                        if (!localSearch) {
                          // Padrão: mostra militares desta OBM sem ala ou em outras alas
                          return mObm === ctx;
                        }
                        
                        const searchRg = normalizeRg(localSearch);
                        const matchesRg = searchRg ? normalizeRg(m.rg || '').includes(searchRg) : false;
                        return (m.name || '').toLowerCase().includes(localSearch.toLowerCase()) || 
                               (m.warName || '').toLowerCase().includes(localSearch.toLowerCase()) || 
                               matchesRg;
                      });

                      if (searchPool.length === 0) {
                        return (
                          <div className="p-3 text-center text-[10px] text-slate-400 font-bold uppercase">
                            Nenhum militar encontrado
                          </div>
                        );
                      }

                      return searchPool.slice(0, 20).map(m => {
                        const mObm = normalizeObm(m.obm || '10º GBM');
                        const ctx = currentNormalizedCtx;
                        const isOtherUnit = mObm !== ctx && ctx !== 'GLOBAL';

                        return (
                          <button
                            key={m.rg}
                            onClick={() => {
                              if (isOtherUnit) {
                                setPendingTransfer({
                                  militar: m,
                                  targetAla: ala,
                                  targetObm: obmContext
                                });
                              } else {
                                assignAla(m.rg!, ala);
                              }
                            }}
                            disabled={assigningRg === m.rg}
                            className={cn(
                              "w-full text-left p-2 rounded-xl flex items-center justify-between text-[11px] group transition-colors border mb-1",
                              isOtherUnit 
                                ? "bg-amber-50/70 hover:bg-amber-100 border-amber-200 text-amber-950" 
                                : "hover:bg-indigo-50 border-slate-100"
                            )}
                          >
                            <div className="flex flex-col truncate pr-2">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-bold text-slate-800 truncate">{parseRank(m.rank)} {m.warName || m.name}</span>
                                {isOtherUnit && (
                                  <span className="text-[8px] font-black uppercase text-amber-800 bg-amber-200/80 px-1 py-0.2 rounded border border-amber-300">
                                    {m.obm || '10º GBM'}
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] font-mono text-slate-400">
                                RG {m.rg} • {m.ala ? `Ala ${m.ala}` : 'Sem Ala'}
                              </span>
                            </div>
                            {isOtherUnit ? (
                              <span className="text-[9px] font-black uppercase text-amber-700 bg-white px-1.5 py-0.5 rounded shadow-2xs border border-amber-200 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                Transferir
                              </span>
                            ) : assigningRg === m.rg ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                            )}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* Lista de Membros da Ala */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {members.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                    Nenhum militar
                  </div>
                ) : (
                  members.map((m, idx) => (
                    <div 
                      key={m.rg}
                      className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-300 transition-all flex flex-col gap-1.5 relative group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center text-[9px] font-black text-slate-400 shrink-0">
                            {idx + 1}
                          </div>
                          <span className="text-[12px] font-black text-slate-800 truncate" title={m.name}>
                            {parseRank(m.rank)} {m.warName || (m.name || '').split(' ')[0]}
                          </span>
                        </div>

                        {/* Mover para outra Ala */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                          <select
                            value={ala}
                            onChange={(e) => assignAla(m.rg!, e.target.value)}
                            disabled={assigningRg === m.rg}
                            className="bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded px-1.5 py-0.5 text-[9px] font-black uppercase text-slate-600 outline-none cursor-pointer"
                            title="Mover para outra Ala"
                          >
                            <option value="1">ALA 1</option>
                            <option value="2">ALA 2</option>
                            <option value="3">ALA 3</option>
                            <option value="4">ALA 4</option>
                            <option value="EXP">EXP</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pl-7 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold">RG {m.rg}</span>
                        <span className="truncate">{m.quadro || '-'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Seção de Militares Sem Ala Definida */}
      {semAlaMilitars.length > 0 && (
        <div className="border border-slate-200 rounded-3xl overflow-hidden bg-slate-50/50 shadow-xs">
          <div className="p-4 bg-slate-800 text-slate-50 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black tracking-wider uppercase">Militares de {obmContext} sem Ala Definida</h4>
              <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">
                {semAlaMilitars.length} militares ativos aguardando alocação
              </p>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 max-h-96 overflow-y-auto">
            {semAlaMilitars
              .filter(m => {
                if (!searchTerm) return true;
                const searchRg = normalizeRg(searchTerm);
                const matchesRg = searchRg ? normalizeRg(m.rg || '').includes(searchRg) : false;
                return (
                  (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (m.warName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                  matchesRg
                );
              })
              .sort(sortAllBySeniority)
              .map((m, idx) => (
                <div key={m.rg} className="bg-white p-3 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all shadow-xs flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center text-[9px] font-black text-slate-400 shrink-0">
                        {idx + 1}
                      </div>
                      <span className="text-[11px] font-black text-slate-800 truncate" title={m.name}>
                        {parseRank(m.rank)} {m.warName || (m.name || '').split(' ')[0]}
                      </span>
                    </div>

                    <select
                      value=""
                      onChange={(e) => assignAla(m.rg!, e.target.value)}
                      disabled={assigningRg === m.rg}
                      className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded px-1.5 py-0.5 text-[9px] font-black uppercase text-indigo-700 outline-none cursor-pointer shrink-0"
                      title="Atribuir à Ala"
                    >
                      <option value="">+ ALA</option>
                      <option value="1">ALA 1</option>
                      <option value="2">ALA 2</option>
                      <option value="3">ALA 3</option>
                      <option value="4">ALA 4</option>
                      <option value="EXP">EXP</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between pl-7 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold">{m.rg}</span>
                    <span className="truncate">{m.quadro || '-'}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
