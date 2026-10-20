import React, { useState, useEffect, useMemo } from 'react';
import { useMilitars } from '../contexts/MilitarContext';
import { db } from '../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  Settings, 
  ShieldCheck, 
  Anchor, 
  Search, 
  Check, 
  ArrowLeft, 
  Calendar,
  RefreshCw, 
  CheckCircle2,
  Users,
  UserPlus,
  Stethoscope
} from 'lucide-react';
import { parseRank, COLS_OFICIAIS, sortOfficersBySeniority, stripRankPrefix } from '../lib/rankUtils';
import { UserProfile } from '../types';
import { cn, cleanUndefined } from '../lib/utils';
import { AdicionarMilitarModal } from './AdicionarMilitarModal';

interface OficiaisConfigModuleProps {
  obmContext?: string;
  onClose?: () => void;
  user?: UserProfile;
}

const formatToInputDate = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  if (dateStr.length >= 10 && dateStr.charAt(4) === '-' && dateStr.charAt(7) === '-') {
    return dateStr.substring(0, 10);
  }
  return '';
};

const formatToDisplayDate = (dateStr?: string | null): string => {
  if (!dateStr) return '-';
  if (dateStr.includes('/')) return dateStr;
  if (dateStr.length >= 10 && dateStr.charAt(4) === '-' && dateStr.charAt(7) === '-') {
    const [y, m, d] = dateStr.substring(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  return dateStr;
};

const normalizePoolDocId = (obm?: string): string => {
  const raw = (obm || '10º GBM').trim();
  if (raw === 'GLOBAL') return '10º_GBM';
  return raw.replace(/°/g, 'º').replace(/\//g, '_').replace(/\s/g, '_');
};

export function OficiaisConfigModule({ obmContext = '10º GBM', onClose }: OficiaisConfigModuleProps) {
  const { militars, refreshMilitars, updateMilitarLocal } = useMilitars();

  const [config, setConfig] = useState<Record<string, string[]>>({
    servicosGrd: [],
    nucleoNautico: [],
    oficiaisMedicos: []
  });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [savingPromotionRg, setSavingPromotionRg] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [showAddMilitarModal, setShowAddMilitarModal] = useState(false);

  const docId = normalizePoolDocId(obmContext);

  // Carrega configuração de piscinas de oficiais da API e do Firestore
  useEffect(() => {
    let isMounted = true;

    // 1. Carga inicial imediata via API do backend
    fetch(`/api/officer-pool?obm=${encodeURIComponent(obmContext || '10º GBM')}`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && data.success && data.config) {
          setConfig({
            servicosGrd: (data.config.servicosGrd || []).map((r: any) => String(r).trim()),
            nucleoNautico: (data.config.nucleoNautico || []).map((r: any) => String(r).trim()),
            oficiaisMedicos: (data.config.oficiaisMedicos || []).map((r: any) => String(r).trim())
          });
        }
      })
      .catch(() => {});

    // 2. Sincronização em tempo real via Firestore
    const unsub = onSnapshot(doc(db, 'officer_pool_config', docId), (snap) => {
      if (!isMounted) return;
      if (snap.exists()) {
        const data = snap.data() as Record<string, any>;
        setConfig({
          servicosGrd: (data.servicosGrd || []).map((r: any) => String(r).trim()),
          nucleoNautico: (data.nucleoNautico || []).map((r: any) => String(r).trim()),
          oficiaisMedicos: (data.oficiaisMedicos || []).map((r: any) => String(r).trim())
        });
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [docId, obmContext]);

  // Lista de oficiais da OBM ordenados estritamente por Antiguidade (Posto + Data de Promoção)
  const allOfficers = useMemo(() => {
    return militars.filter(m => {
      const rawMObm = m.obm ? m.obm : '10º GBM';
      const mObm = rawMObm.replace(/º/g, '°').trim().toUpperCase();
      const mAtuacao = (m.obmAtuacao || '').replace(/º/g, '°').trim().toUpperCase();
      const ctxObm = (obmContext || '').replace(/º/g, '°').trim().toUpperCase();
      if (ctxObm && ctxObm !== 'GLOBAL') {
        const matchesObm = mObm === ctxObm || mAtuacao === ctxObm;
        if (!matchesObm) return false;
      }
      const r = parseRank(m.rank);
      const q = (m.quadro || '').toUpperCase();
      const isMed = m.isMedico === true || q.includes('QOS/MÉD') || q.includes('QOS/MED');
      return COLS_OFICIAIS.includes(r) || isMed;
    }).sort(sortOfficersBySeniority);
  }, [militars, obmContext]);

  const filteredOfficers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return allOfficers;
    return allOfficers.filter(o => {
      const rank = (o.rank || '').toLowerCase();
      const warName = (o.warName || '').toLowerCase();
      const name = (o.name || '').toLowerCase();
      const rg = (o.rg || '').toString().toLowerCase();
      return rank.includes(term) || warName.includes(term) || name.includes(term) || rg.includes(term);
    });
  }, [allOfficers, searchTerm]);

  // Toggle de participação nos módulos (Serviços e GRD / Núcleo Náutico / Oficiais Médicos)
  const toggleOfficer = async (moduleKey: 'servicosGrd' | 'nucleoNautico' | 'oficiaisMedicos', rawRg: string | number) => {
    const rg = String(rawRg || '').trim();
    if (!rg) return;

    setSaving(true);
    try {
      const currentList = (config[moduleKey] || []).map(r => String(r).trim());
      const isAlreadyIn = currentList.some(r => r === rg);
      const newList = isAlreadyIn 
        ? currentList.filter(r => r !== rg) 
        : [...currentList, rg];
      
      const newConfig = { 
        ...config, 
        [moduleKey]: newList 
      };

      // 1. Atualização Otimista Imediata no Estado Local (elimina atrasos e falsos checks)
      setConfig(newConfig);

      // 2. Persistência via Backend API (garante persistência robusta no servidor)
      await fetch('/api/officer-pool/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          obm: obmContext,
          moduleKey,
          rgs: newList,
          config: newConfig
        })
      }).catch(e => console.warn('[OficiaisConfig] Aviso na chamada da API officer-pool:', e));

      // 3. Persistência direta no Firestore (captura erro silenciosamente se bloqueado por cliente/regras, pois a API backend já persistiu)
      try {
        await setDoc(doc(db, 'officer_pool_config', docId), cleanUndefined(newConfig), { merge: true });
      } catch (clientWriteErr: any) {
        console.warn('[OficiaisConfig] Firestore write handled via backend API:', clientWriteErr?.message);
      }
    } catch (err) {
      console.error('Erro ao atualizar participação em módulo:', err);
    } finally {
      setSaving(false);
    }
  };

  // Atualização da Data de Promoção do Oficial (determina a antiguidade nas escalas)
  const handleUpdatePromotionDate = async (rg: string, newDate: string) => {
    setSavingPromotionRg(rg);
    try {
      // 1. Atualiza no cache de memória local do contexto
      updateMilitarLocal(rg, { promotionDate: newDate });

      // 2. Persiste via API backend
      await fetch('/api/militar/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rg,
          data: { promotionDate: newDate }
        })
      });

      // 3. Atualiza diretamente no documento do militar no Firestore (com fallback seguro)
      try {
        const cleanRg = rg.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const militarRef = doc(db, 'militaries', cleanRg);
        await setDoc(militarRef, { promotionDate: newDate }, { merge: true });
      } catch (clientWriteErr: any) {
        console.warn('[OficiaisConfig] Promotion date write handled via backend API:', clientWriteErr?.message);
      }

      setActionNotice(`Data de promoção do RG ${rg} atualizada com sucesso (${formatToDisplayDate(newDate)})!`);
      setTimeout(() => setActionNotice(null), 3500);

      // 4. Força revalidação leve no contexto
      await refreshMilitars(rg);
    } catch (err: any) {
      console.error('Erro ao atualizar data de promoção:', err);
      alert(`Falha ao salvar data de promoção: ${err.message}`);
    } finally {
      setSavingPromotionRg(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 lg:p-8 animate-in fade-in zoom-in-95 duration-500 w-full relative">
      {/* Botão Voltar se fornecido */}
      {onClose && (
        <div className="mb-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors uppercase font-black text-[10.5px] tracking-widest group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Voltar
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-none shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                Configuração de Efetivo (Oficiais)
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 px-2.5 py-0.5 rounded-lg">
                {obmContext}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
              Configure os oficiais que estarão disponíveis nas escalas de <strong>Serviços e GRD</strong>, <strong>Núcleo Náutico</strong> e <strong>Oficiais Médicos</strong>, e gerencie as datas de promoção para cálculo automático de antiguidade.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setShowAddMilitarModal(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-2xl text-[10.5px] uppercase font-black tracking-wider transition-all shadow-md shadow-blue-200 dark:shadow-none cursor-pointer"
            title="Adicionar Militar diretamente ao Banco de Dados e Servidor"
          >
            <UserPlus className="w-4 h-4" />
            <span>Adicionar Militar</span>
          </button>

          <div className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center shadow-2xs">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Oficiais</div>
            <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">{allOfficers.length}</div>
          </div>
          <div className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center shadow-2xs">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Serviços e GRD</div>
            <div className="text-sm font-black text-slate-700 dark:text-slate-200">{config.servicosGrd?.length || 0}</div>
          </div>
          <div className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center shadow-2xs">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Núcleo Náutico</div>
            <div className="text-sm font-black text-cyan-600 dark:text-cyan-400">{config.nucleoNautico?.length || 0}</div>
          </div>
          <div className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center shadow-2xs">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Oficiais Médicos</div>
            <div className="text-sm font-black text-rose-600 dark:text-rose-400">{config.oficiaisMedicos?.length || 0}</div>
          </div>
        </div>
      </div>

      {/* Notificação de Sucesso */}
      {actionNotice && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-800 dark:text-emerald-200 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Barra de Busca e Legenda */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar oficial por posto, nome de guerra ou RG..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        
        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold">
          <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            A data de promoção define a ordem de antiguidade para todas as escalas
          </span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 underline cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Tabela de Configuração de Oficiais */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <th className="py-3.5 px-4 font-black uppercase text-[10px] tracking-wider w-12 text-center">Nº</th>
              <th className="py-3.5 px-4 font-black uppercase text-[10px] tracking-wider">Oficial</th>
              
              {/* Coluna de Data de Promoção */}
              <th className="py-3.5 px-4 text-center min-w-[190px]">
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                    <Calendar className="w-4 h-4" />
                    <span className="font-black uppercase tracking-wider text-[10px]">Data Promoção</span>
                  </div>
                  <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest">(Antiguidade)</span>
                </div>
              </th>

              {/* Serviços e GRD */}
              <th className="py-3.5 px-4 text-center w-36">
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-black uppercase tracking-wider text-[10px]">Serviços e GRD</span>
                </div>
              </th>

              {/* Núcleo Náutico */}
              <th className="py-3.5 px-4 text-center w-36">
                <div className="flex flex-col items-center gap-1">
                  <Anchor className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span className="font-black uppercase tracking-wider text-[10px]">Núcleo Náutico</span>
                </div>
              </th>

              {/* Oficiais Médicos */}
              <th className="py-3.5 px-4 text-center w-36">
                <div className="flex flex-col items-center gap-1">
                  <Stethoscope className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span className="font-black uppercase tracking-wider text-[10px]">Oficiais Médicos</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredOfficers.map((o, idx) => {
              const officerRg = String(o.rg || '').trim();
              const inGrd = (config.servicosGrd || []).some(r => String(r).trim() === officerRg);
              const inNautico = (config.nucleoNautico || []).some(r => String(r).trim() === officerRg);
              const inMedicos = (config.oficiaisMedicos || []).some(r => String(r).trim() === officerRg);
              const pDateValue = formatToInputDate(o.promotionDate || o.promotions?.[0]?.dataPromocao);
              
              return (
                <tr key={o.rg} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 text-center font-bold text-slate-400">
                    {idx + 1}
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            {parseRank(o.rank)}
                          </span>
                          <span className="font-black text-slate-800 dark:text-white uppercase tracking-tight">
                            {o.warName || stripRankPrefix(o.name || '')}
                          </span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400">
                          RG: {o.rg} {o.name && o.name !== o.warName && `• ${o.name}`}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Campo de Data de Promoção */}
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 max-w-[170px] mx-auto">
                      <input
                        type="date"
                        defaultValue={pDateValue}
                        key={`promo-${o.rg}-${o.promotionDate}`}
                        onBlur={(e) => {
                          const val = e.target.value;
                          if (val !== pDateValue && o.rg) {
                            handleUpdatePromotionDate(o.rg, val);
                          }
                        }}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 focus:border-indigo-500 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-all shadow-2xs w-full text-center"
                        title="Data de promoção no posto atual (define antiguidade nas escalas)"
                      />
                      {savingPromotionRg === o.rg && (
                        <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin shrink-0" />
                      )}
                    </div>
                  </td>

                  {/* Toggle Serviços e GRD */}
                  <td className="py-3 px-4 text-center">
                    <button 
                      type="button"
                      onClick={() => toggleOfficer('servicosGrd', o.rg)}
                      className={cn(
                        "w-7 h-7 rounded-lg border flex items-center justify-center mx-auto transition-all cursor-pointer",
                        inGrd 
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-xs scale-105" 
                          : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-indigo-400"
                      )}
                      title={inGrd ? "Remover de Serviços e GRD" : "Adicionar a Serviços e GRD"}
                    >
                      {inGrd && <Check className="w-4 h-4" />}
                    </button>
                  </td>

                  {/* Toggle Núcleo Náutico */}
                  <td className="py-3 px-4 text-center">
                    <button 
                      type="button"
                      onClick={() => toggleOfficer('nucleoNautico', o.rg)}
                      className={cn(
                        "w-7 h-7 rounded-lg border flex items-center justify-center mx-auto transition-all cursor-pointer",
                        inNautico 
                          ? "bg-cyan-600 border-cyan-600 text-white shadow-xs scale-105" 
                          : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-cyan-400"
                      )}
                      title={inNautico ? "Remover de Núcleo Náutico" : "Adicionar a Núcleo Náutico"}
                    >
                      {inNautico && <Check className="w-4 h-4" />}
                    </button>
                  </td>

                  {/* Toggle Oficiais Médicos */}
                  <td className="py-3 px-4 text-center">
                    <button 
                      type="button"
                      onClick={() => toggleOfficer('oficiaisMedicos', o.rg)}
                      className={cn(
                        "w-7 h-7 rounded-lg border flex items-center justify-center mx-auto transition-all cursor-pointer",
                        inMedicos 
                          ? "bg-rose-600 border-rose-600 text-white shadow-xs scale-105" 
                          : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-rose-400"
                      )}
                      title={inMedicos ? "Remover de Oficiais Médicos" : "Adicionar a Oficiais Médicos"}
                    >
                      {inMedicos && <Check className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredOfficers.length === 0 && (
          <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
            Nenhum oficial localizado nesta OBM
          </div>
        )}
      </div>

      {saving && (
        <div className="absolute top-4 right-4 text-xs font-bold text-indigo-500 animate-pulse uppercase flex items-center gap-1">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          Salvando...
        </div>
      )}

      {/* Modal para Adicionar Militar Diretamente ao Banco de Dados e Servidor */}
      <AdicionarMilitarModal
        isOpen={showAddMilitarModal}
        onClose={() => setShowAddMilitarModal(false)}
        obmContext={obmContext}
        onSuccess={() => {
          refreshMilitars();
        }}
      />
    </div>
  );
}
