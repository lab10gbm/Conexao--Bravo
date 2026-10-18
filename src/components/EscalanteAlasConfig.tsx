import React, { useState, useEffect } from 'react';
import { parseRank, sortAllBySeniority } from "../lib/rankUtils";
import { useMilitars } from '../contexts/MilitarContext';
import { auth, db } from "../lib/firebase";
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Search, Loader2, X, Users, BookmarkCheck, RotateCcw, ShieldCheck, CheckCircle2, AlertTriangle, Info, ArrowLeftRight } from 'lucide-react';
import { cn, normalizeAlaField, normalizeObm, normalizeRg } from '../lib/utils';
import { DEFAULT_ALA_NOMENCLATURES, getStoredAlaNomenclatures, saveStoredAlaNomenclatures } from '../lib/alaUtils';
import { UserProfile } from '../types';
import { AfastamentosAlaModule } from './AfastamentosAlaModule';

import { ALAS, PendingTransfer, DefaultAlasInfo } from '../features/alas/types';
import { isPracaElegivel, getHeaderColor } from '../features/alas/lib/alasUtils';
import { DirectTransferModal } from '../features/alas/components/DirectTransferModal';
import { RestoreDefaultConfirmModal } from '../features/alas/components/RestoreDefaultConfirmModal';
import { PendingTransferConfirmModal } from '../features/alas/components/PendingTransferConfirmModal';
import { AlaNomenclaturesSection } from '../features/alas/components/AlaNomenclaturesSection';
import { AlaColumnCard } from '../features/alas/components/AlaColumnCard';
import { SemAlaSection } from '../features/alas/components/SemAlaSection';

export { isPracaElegivel };

interface EscalanteAlasConfigProps {
  obmContext: string;
}

export function EscalanteAlasConfig({ obmContext }: EscalanteAlasConfigProps) {
  const { militars, loading, refreshMilitars, updateMilitarLocal } = useMilitars();
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [assigningRg, setAssigningRg] = useState<string | null>(null);

  // Estados para Gestão de Padrão Oficial
  const [savingDefault, setSavingDefault] = useState(false);
  const [restoringDefault, setRestoringDefault] = useState(false);
  const [defaultInfo, setDefaultInfo] = useState<DefaultAlasInfo | null>(null);
  const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Estados para Transferência / Recebimento de Militar
  const [pendingTransfer, setPendingTransfer] = useState<PendingTransfer | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  // Modal de Transferência Direta (Enviar ou Receber Militar entre OBMs da Costa Verde)
  const [showDirectTransferModal, setShowDirectTransferModal] = useState(false);
  const [directSearch, setDirectSearch] = useState('');
  const [directSelectedMilitar, setDirectSelectedMilitar] = useState<UserProfile | null>(null);
  const [directTargetObm, setDirectTargetObm] = useState<string>(() => {
    const norm = normalizeObm(obmContext || '10º GBM');
    return norm === '10º GBM' ? '2/10' : '10º GBM';
  });
  const [directTargetAla, setDirectTargetAla] = useState('1');

  const openTransferModalForMilitar = (m?: UserProfile) => {
    const currentNorm = normalizeObm(obmContext || '10º GBM');
    if (m) {
      setDirectSelectedMilitar(m);
      const milObm = normalizeObm(m.obm || currentNorm);
      setDirectTargetObm(milObm === '10º GBM' ? '2/10' : '10º GBM');
      setDirectTargetAla(normalizeAlaField(m.ala) || '1');
    } else {
      setDirectSelectedMilitar(null);
      setDirectTargetObm(currentNorm === '10º GBM' ? '2/10' : '10º GBM');
      setDirectTargetAla('1');
    }
    setDirectSearch('');
    setShowDirectTransferModal(true);
  };

  // Estados para Nomenclatura das Alas (Padrão Oficial CBMERJ)
  const [alaNames, setAlaNames] = useState<Record<string, string>>(() => getStoredAlaNomenclatures());
  const [savingNames, setSavingNames] = useState(false);
  const [namesFeedback, setNamesFeedback] = useState<string | null>(null);

  // Sincroniza nomenclaturas das alas com Firestore e localStorage
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_config', 'ala_nomenclatures'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.names) {
          setAlaNames(prev => ({ ...prev, ...data.names }));
          saveStoredAlaNomenclatures({ ...DEFAULT_ALA_NOMENCLATURES, ...data.names });
        }
      }
    }, (err) => console.warn('Could not listen to ala_nomenclatures in EscalanteAlasConfig:', err));

    return () => unsub();
  }, []);

  const handleSaveAlaNames = async () => {
    setSavingNames(true);
    setNamesFeedback(null);
    try {
      saveStoredAlaNomenclatures(alaNames);
      await setDoc(doc(db, 'system_config', 'ala_nomenclatures'), {
        names: alaNames,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setNamesFeedback('Nomenclaturas salvas com sucesso!');
      setTimeout(() => setNamesFeedback(null), 4000);
    } catch (e: any) {
      console.error('Erro ao salvar nomenclaturas no Firestore:', e);
      setNamesFeedback('Salvo localmente com sucesso!');
      setTimeout(() => setNamesFeedback(null), 4000);
    } finally {
      setSavingNames(false);
    }
  };

  const handleResetAlaNames = () => {
    setAlaNames({ ...DEFAULT_ALA_NOMENCLATURES });
    saveStoredAlaNomenclatures(DEFAULT_ALA_NOMENCLATURES);
    setNamesFeedback('Padrão oficial restaurado!');
    setTimeout(() => setNamesFeedback(null), 3000);
  };

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

  // Filter by OBM and only Praças (de Soldado até Subtenente)
  const currentNormalizedCtx = normalizeObm(obmContext || '10º GBM');
  const militarsInObm = militars.filter(m => {
    const rawObm = normalizeObm(m.obm || '10º GBM');
    const isExcluded = ['INATIVO', 'EXCLUÍDO', 'EXCLUIDO', 'DESLIGADO'].some(status => (m.situacao || '').trim().toUpperCase().includes(status));
    
    if (isExcluded) return false;
    if (!isPracaElegivel(m)) return false;
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
    updateMilitarLocal(rg, { ala });
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
            onClick={() => openTransferModalForMilitar()}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
            title="Enviar ou receber militar entre OBMs da Região da Costa Verde (10º GBM, 1/10, 2/10, 3/10, 4/10, 26º GBM, 1/26)"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Transferir entre OBMs (Costa Verde)
          </button>

          <button
            onClick={handleSaveDefaultAlas}
            disabled={savingDefault || restoringDefault}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md disabled:opacity-50 cursor-pointer"
            title="Registra a formação atual das alas como padrão permanente no banco de dados e servidor"
          >
            {savingDefault ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkCheck className="w-4 h-4" />}
            {savingDefault ? 'Gravando Padrão...' : 'Salvar Padrão Oficial'}
          </button>

          <button
            onClick={() => setShowRestoreConfirmModal(true)}
            disabled={savingDefault || restoringDefault}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 text-slate-200 active:scale-95 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
            title="Restaura a formação padrão oficial caso tenha havido alguma alteração indevida"
          >
            {restoringDefault ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            {restoringDefault ? 'Restaurando...' : 'Restaurar Padrão'}
          </button>
        </div>
      </div>

      {/* POPUP MODAL 1: Confirmação de Transferência disparada ao selecionar militar de outra OBM na Ala */}
      <PendingTransferConfirmModal
        pendingTransfer={pendingTransfer}
        onClose={() => setPendingTransfer(null)}
        onConfirm={() => {
          if (pendingTransfer) {
            executeTransfer(pendingTransfer.militar, pendingTransfer.targetObm, pendingTransfer.targetAla);
          }
        }}
        isTransferring={isTransferring}
      />

      {/* POPUP MODAL 2: Modal de Transferência entre OBMs da Região da Costa Verde (CBA VII) */}
      <DirectTransferModal
        isOpen={showDirectTransferModal}
        onClose={() => {
          setShowDirectTransferModal(false);
          setDirectSelectedMilitar(null);
          setDirectSearch('');
        }}
        obmContext={obmContext}
        militars={militars}
        directSelectedMilitar={directSelectedMilitar}
        setDirectSelectedMilitar={setDirectSelectedMilitar}
        directSearch={directSearch}
        setDirectSearch={setDirectSearch}
        directTargetObm={directTargetObm}
        setDirectTargetObm={setDirectTargetObm}
        directTargetAla={directTargetAla}
        setDirectTargetAla={setDirectTargetAla}
        isTransferring={isTransferring}
        onExecuteTransfer={executeTransfer}
        currentNormalizedCtx={currentNormalizedCtx}
      />

      {/* Modal de Confirmação para Restaurar Padrão */}
      <RestoreDefaultConfirmModal
        isOpen={showRestoreConfirmModal}
        onClose={() => setShowRestoreConfirmModal(false)}
        onConfirm={handleRestoreDefaultAlas}
      />

      {/* SEÇÃO: NOMENCLATURA DAS ALAS (ENTRE AS SEÇÕES) */}
      <AlaNomenclaturesSection
        alaNames={alaNames}
        setAlaNames={setAlaNames}
        savingNames={savingNames}
        namesFeedback={namesFeedback}
        onResetNames={handleResetAlaNames}
        onSaveNames={handleSaveAlaNames}
        getMilitarsByAla={getMilitarsByAla}
      />

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
            <AlaColumnCard
              key={ala}
              ala={ala}
              members={members}
              alaName={alaNames[ala] || `ALA ${ala}`}
              headerColor={getHeaderColor(ala)}
              isAdding={isAdding}
              onToggleAdding={() => {
                if (isAdding) {
                  setTargetAlaToAdd(null);
                  setLocalSearch('');
                } else {
                  setTargetAlaToAdd(ala);
                  setLocalSearch('');
                }
              }}
              localSearch={localSearch}
              setLocalSearch={setLocalSearch}
              militars={militars}
              currentNormalizedCtx={currentNormalizedCtx}
              obmContext={obmContext}
              assigningRg={assigningRg}
              onAssignAla={assignAla}
              onPendingTransfer={setPendingTransfer}
              onOpenDirectTransfer={openTransferModalForMilitar}
            />
          );
        })}
      </div>

      {/* Seção de Militares Sem Ala Definida */}
      <SemAlaSection
        semAlaMilitars={semAlaMilitars}
        searchTerm={searchTerm}
        obmContext={obmContext}
        assigningRg={assigningRg}
        onAssignAla={assignAla}
        onOpenDirectTransfer={openTransferModalForMilitar}
      />
    </div>
  );
}
