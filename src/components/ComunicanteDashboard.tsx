import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Radio, 
  BellRing, 
  Users, 
  Truck, 
  Activity, 
  Edit3, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Volume2, 
  VolumeX, 
  Shield, 
  Flame, 
  RotateCcw, 
  BellOff, 
  CheckCircle2 
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  serverTimestamp, 
  setDoc, 
  doc, 
  getDoc, 
  updateDoc 
} from 'firebase/firestore';
import { useMilitars } from '../contexts/MilitarContext';
import { UserProfile } from '../types';
import { ViaturaManagerModal } from './ViaturaManagerModal';
import { 
  cleanUndefined, 
  normalizeObm, 
  getAlaForDate, 
  getAlaColor, 
  getAlaLightColor 
} from "../lib/utils";
import { getDefaultViaturasForObm, ViaturaConfig } from '../features/viaturas/types';

interface ComunicanteDashboardProps {
  user: UserProfile;
  onBack: () => void;
}

export function ComunicanteDashboard({ user, onBack }: ComunicanteDashboardProps) {
  const { militars } = useMilitars();
  const [onlineCount, setOnlineCount] = useState(0);
  
  // Controle de Data selecionada (padrão: hoje em horário local)
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Ala calculada para o dia selecionado
  const alaOfDay = useMemo(() => getAlaForDate(selectedDate), [selectedDate]);

  // Data formatada por extenso em português
  const formattedDateStr = useMemo(() => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Identificação e normalização da OBM
  const cleanObm = useMemo(() => normalizeObm(user?.obm || '10º GBM'), [user?.obm]);
  const normalizedObm = useMemo(() => cleanObm.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(), [cleanObm]);

  // Frota de viaturas configurada para a OBM
  const [viaturasList, setViaturasList] = useState<ViaturaConfig[]>(() => {
    try {
      const localKeys = [
        `custom_default_viaturas_${cleanObm}`,
        `viaturas_config_${cleanObm}`,
      ];
      for (const k of localKeys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const op = parsed.filter((v: any) => v.tipo !== 'administrativa' && v.ativa !== false);
            if (op.length > 0) return op;
          }
        }
      }
    } catch {}
    const defaultFleet = getDefaultViaturasForObm(cleanObm);
    return defaultFleet.filter((v) => v.tipo !== 'administrativa' && v.ativa !== false);
  });

  // Atualizar viaturas caso a OBM mude ou configurações sejam atualizadas
  useEffect(() => {
    const defaultFleet = getDefaultViaturasForObm(cleanObm);
    const activeFleet = defaultFleet.filter((v) => v.tipo !== 'administrativa' && v.ativa !== false);
    setViaturasList(activeFleet);
  }, [cleanObm]);

  // Alertas e estado de brado em tempo real
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [isAlerting, setIsAlerting] = useState<Record<string, boolean>>({});
  const [lastAlertIds, setLastAlertIds] = useState<Record<string, string>>({});
  const [alertSecondsLeft, setAlertSecondsLeft] = useState<Record<string, number>>({});

  // Viatura sendo gerenciada no modal
  const [managingViatura, setManagingViatura] = useState<string | null>(null);

  // Estado das guarnições para a data selecionada
  const [guarnicoesDoDia, setGuarnicoesDoDia] = useState<Record<string, { rg: string; role?: string }[]>>({});

  // Controle de som mudo no navegador
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cbmerj_alert_sound_muted') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('cbmerj_alert_sound_muted', String(next));
        window.dispatchEvent(new Event('cbmerj_alert_sound_toggle'));
      } catch {}
      return next;
    });
  }, []);

  // Escuta alteração externa de mudo
  useEffect(() => {
    const handleSync = () => {
      try {
        setIsMuted(localStorage.getItem('cbmerj_alert_sound_muted') === 'true');
      } catch {}
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('cbmerj_alert_sound_toggle', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('cbmerj_alert_sound_toggle', handleSync);
    };
  }, []);

  // Escuta presenças (militars online)
  useEffect(() => {
    const q = query(collection(db, 'presence'));
    const unsub = onSnapshot(q, (snap) => {
      let count = 0;
      const now = Date.now();
      snap.forEach((d) => {
        const data = d.data();
        if (data.lastActive) {
          const lastActive = data.lastActive.toMillis?.() || data.lastActive;
          if (now - lastActive < 2 * 60 * 1000) {
            count++;
          }
        }
      });
      setOnlineCount(count);
    });
    return () => unsub();
  }, []);

  // Escuta alertas recentes de viaturas
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'viatura_alerts'), (snap) => {
      const alerts = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
      const now = Date.now();
      const recent = alerts.filter((a) => {
        if (a.active === false || a.cancelled === true) return false;
        const time = a.timestamp?.toMillis?.() || a.timestamp || 0;
        return now - time < 20000;
      });
      setActiveAlerts(recent);

      const newIsAlerting: Record<string, boolean> = {};
      const newLastIds: Record<string, string> = {};
      const newSecLeft: Record<string, number> = {};

      recent.forEach((a) => {
        const time = a.timestamp?.toMillis?.() || a.timestamp || 0;
        const elapsed = Math.floor((now - time) / 1000);
        const remaining = Math.max(0, 20 - elapsed);
        if (remaining > 0) {
          newIsAlerting[a.viatura] = true;
          newLastIds[a.viatura] = a.id;
          newSecLeft[a.viatura] = remaining;
        }
      });

      setIsAlerting(newIsAlerting);
      setLastAlertIds((prev) => ({ ...prev, ...newLastIds }));
      setAlertSecondsLeft(newSecLeft);
    });
    return () => unsub();
  }, []);

  // Contador de segundos para desarmar alerta visual suavemente
  useEffect(() => {
    const hasActive = Object.values(isAlerting).some(Boolean);
    if (!hasActive) return;

    const timer = setInterval(() => {
      setAlertSecondsLeft((prev) => {
        const updated: Record<string, number> = {};
        let hasChanges = false;
        for (const [vtr, sec] of Object.entries(prev)) {
          if (sec > 1) {
            updated[vtr] = sec - 1;
            hasChanges = true;
          } else {
            hasChanges = true;
          }
        }
        if (hasChanges) {
          const nextAlerting: Record<string, boolean> = {};
          for (const [vtr, sec] of Object.entries(updated)) {
            if (sec > 0) nextAlerting[vtr] = true;
          }
          setIsAlerting(nextAlerting);
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAlerting]);

  // Carregar e sincronizar as guarnições para a data selecionada
  useEffect(() => {
    let isCancelled = false;

    // 1. Escuta em tempo real documento específico de guarnição da data/OBM
    const docKey = `${normalizedObm}_${selectedDate}`;
    const guarnicaoDocRef = doc(db, 'guarnicoes_comunicante', docKey);

    const unsubGuarnicao = onSnapshot(guarnicaoDocRef, async (docSnap) => {
      if (isCancelled) return;

      if (docSnap.exists()) {
        const data = docSnap.data();
        const normalizedData: Record<string, { rg: string; role?: string }[]> = {};
        for (const [vtr, list] of Object.entries(data)) {
          if (Array.isArray(list)) {
            normalizedData[vtr] = list.map((item) => {
              if (typeof item === 'string') return { rg: item };
              return item;
            });
          }
        }
        setGuarnicoesDoDia(normalizedData);
      } else {
        // Se ainda não houver guarnição customizada salva para esta data,
        // tenta buscar na escala 24h dessa data oficial!
        try {
          let escalaData: any = null;

          // Tentativa A: API Backend
          try {
            const res = await fetch(`/api/escala24h?obm=${encodeURIComponent(cleanObm)}&date=${encodeURIComponent(selectedDate)}`);
            if (res.ok) {
              const json = await res.json();
              if (json.success && json.exists && json.data) {
                escalaData = json.data;
              }
            }
          } catch {}

          // Tentativa B: Firestore Client
          if (!escalaData) {
            const escalaSnap = await getDoc(doc(db, `escala24h_${normalizedObm}`, selectedDate));
            if (escalaSnap.exists()) {
              escalaData = escalaSnap.data();
            }
          }

          if (isCancelled) return;

          if (escalaData?.selectedFunctions) {
            // Mapear militares das viaturas a partir de selectedFunctions
            const mappedGuarnicoes: Record<string, { rg: string; role?: string }[]> = {};
            const sf = escalaData.selectedFunctions as Record<string, string>;

            // Inicializar com viaturas conhecidas
            viaturasList.forEach((v) => {
              mappedGuarnicoes[v.vtr] = [];
            });

            for (const [key, rgVal] of Object.entries(sf)) {
              if (!rgVal || typeof rgVal !== 'string') continue;
              const militarRg = rgVal.trim();
              if (!militarRg) continue;

              // Analisar chaves no formato [VTR]_[FUNCAO] (ex: ABT-143_CONDUTOR, L-09_CONDUTOR, ARC-162_G1)
              for (const vtr of viaturasList) {
                const prefixA = `${vtr.vtr}_`;
                const prefixB = `${vtr.id}_`;
                let roleSuffix = '';

                if (key.startsWith(prefixA)) {
                  roleSuffix = key.slice(prefixA.length);
                } else if (key.startsWith(prefixB)) {
                  roleSuffix = key.slice(prefixB.length);
                }

                if (roleSuffix) {
                  let roleLabel = roleSuffix;
                  const upperSuffix = roleSuffix.toUpperCase();
                  if (upperSuffix.includes('CONDUTOR') || upperSuffix.includes('MESTRE')) {
                    roleLabel = vtr.maritima ? 'Mestre' : 'Condutor';
                  } else if (upperSuffix.includes('CHEFE') || upperSuffix.includes('CG')) {
                    roleLabel = 'Chefe de Guarnição';
                  } else if (upperSuffix.startsWith('G')) {
                    const slotKey = upperSuffix.toLowerCase() as 'g1' | 'g2' | 'g3' | 'g4';
                    roleLabel = vtr.customNames?.[slotKey] || (vtr.maritima ? `Marinheiro ${upperSuffix}` : upperSuffix);
                  }

                  if (!mappedGuarnicoes[vtr.vtr]) mappedGuarnicoes[vtr.vtr] = [];
                  if (!mappedGuarnicoes[vtr.vtr].some((m) => m.rg === militarRg)) {
                    mappedGuarnicoes[vtr.vtr].push({ rg: militarRg, role: roleLabel });
                  }
                  break;
                }
              }
            }

            setGuarnicoesDoDia(mappedGuarnicoes);
          } else if (selectedDate === todayStr) {
            // Fallback legado para o dia de hoje caso nada esteja cadastrado
            const ativasSnap = await getDoc(doc(db, 'guarnicoes', 'ativas'));
            if (isCancelled) return;
            if (ativasSnap.exists()) {
              const data = ativasSnap.data();
              const normalizedData: Record<string, { rg: string; role?: string }[]> = {};
              for (const [vtr, list] of Object.entries(data)) {
                if (Array.isArray(list)) {
                  normalizedData[vtr] = list.map((item) => (typeof item === 'string' ? { rg: item } : item));
                }
              }
              setGuarnicoesDoDia(normalizedData);
            } else {
              setGuarnicoesDoDia({});
            }
          } else {
            setGuarnicoesDoDia({});
          }
        } catch (e) {
          console.warn('Erro ao resolver escala do dia para guarnições:', e);
          setGuarnicoesDoDia({});
        }
      }
    });

    return () => {
      isCancelled = true;
      unsubGuarnicao();
    };
  }, [cleanObm, normalizedObm, selectedDate, todayStr, viaturasList]);

  // Ação de Bradar Viatura
  const handleBradarViatura = async (viatura: string) => {
    try {
      const docRef = await addDoc(
        collection(db, 'viatura_alerts'),
        cleanUndefined({
          viatura,
          emittedBy: `Centro de Comunicações (${user.warName || user.name?.split(' ')[0] || 'Operador'})`,
          obm: cleanObm,
          active: true,
          cancelled: false,
          timestamp: serverTimestamp(),
        })
      );

      // Feedback imediato no estado local
      setIsAlerting((prev) => ({ ...prev, [viatura]: true }));
      setLastAlertIds((prev) => ({ ...prev, [viatura]: docRef.id }));
      setAlertSecondsLeft((prev) => ({ ...prev, [viatura]: 20 }));
    } catch (e) {
      console.error('Erro ao bradar viatura:', e);
      alert('Erro ao acionar a viatura. Verifique a conexão.');
    }
  };

  // Ação de Desarmar / Cancelar Brado
  const handleDesarmarAlerta = async (viatura: string) => {
    const alertId = lastAlertIds[viatura];
    try {
      if (alertId) {
        await updateDoc(doc(db, 'viatura_alerts', alertId), {
          active: false,
          cancelled: true,
        });
      }
      setIsAlerting((prev) => ({ ...prev, [viatura]: false }));
      setAlertSecondsLeft((prev) => ({ ...prev, [viatura]: 0 }));
    } catch (e) {
      console.error('Erro ao desarmar alerta:', e);
      // Desarma visualmente mesmo se houver falha de rede
      setIsAlerting((prev) => ({ ...prev, [viatura]: false }));
      setAlertSecondsLeft((prev) => ({ ...prev, [viatura]: 0 }));
    }
  };

  // Ação de Adicionar ou Remover Militar na Guarnição do Dia
  const handleToggleMilitar = async (
    rg: string,
    viatura: string,
    isAdding: boolean,
    role?: string
  ) => {
    const currentList = guarnicoesDoDia[viatura] || [];
    let newList = [...currentList];

    if (isAdding) {
      if (!newList.find((i) => i.rg === rg)) newList.push({ rg, role });
    } else {
      newList = newList.filter((i) => i.rg !== rg);
    }

    // Atualização local imediata
    setGuarnicoesDoDia((prev) => ({ ...prev, [viatura]: newList }));

    try {
      const docKey = `${normalizedObm}_${selectedDate}`;
      await setDoc(
        doc(db, 'guarnicoes_comunicante', docKey),
        cleanUndefined({
          [viatura]: newList,
          obm: cleanObm,
          date: selectedDate,
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );

      // Se for o dia de hoje, mantém sincronizado com o documento ativo legado
      if (selectedDate === todayStr) {
        await setDoc(
          doc(db, 'guarnicoes', 'ativas'),
          cleanUndefined({
            [viatura]: newList,
          }),
          { merge: true }
        );
      }
    } catch (e) {
      console.error('Erro ao salvar guarnição do dia:', e);
      alert('Erro ao atualizar guarnições. Tente novamente.');
    }
  };

  // Navegação no tempo entre dias / alas
  const handlePrevDay = () => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      dateObj.setDate(dateObj.getDate() - 1);
      setSelectedDate(dateObj.toLocaleDateString('en-CA'));
    } catch {}
  };

  const handleNextDay = () => {
    try {
      const [y, m, d] = selectedDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      dateObj.setDate(dateObj.getDate() + 1);
      setSelectedDate(dateObj.toLocaleDateString('en-CA'));
    } catch {}
  };

  const handleToday = () => {
    setSelectedDate(todayStr);
  };

  // Identificar a viatura atualmente sendo gerenciada
  const currentManagingConfig = useMemo(() => {
    if (!managingViatura) return undefined;
    return viaturasList.find((v) => v.vtr === managingViatura || v.id === managingViatura);
  }, [managingViatura, viaturasList]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-6 sm:pt-10">
      {/* Botão Voltar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar ao Início
        </button>

        {/* Botão de Mudo no Navegador */}
        <button
          onClick={handleToggleMute}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-xs ${
            isMuted
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
          }`}
          title={
            isMuted
              ? 'Sirene silenciada neste navegador. Clique para ativar o som do brado.'
              : 'Sirene ativa neste navegador. Clique para silenciar o som.'
          }
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          <span>{isMuted ? 'Sirene Silenciada' : 'Sirene com Som'}</span>
        </button>
      </div>

      {/* Banner Principal Operacional */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl border border-slate-800 relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 mb-2 flex-wrap">
              <Radio className="w-5 h-5 animate-pulse text-indigo-400" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Painel Operacional</h2>
              <span className="text-slate-600">•</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                {cleanObm}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white mb-2">
              Centro de Comunicações
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-400 max-w-xl">
              Acione rapidamente as guarnições. Os dispositivos dos militares designados para a viatura irão tocar imediatamente.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 backdrop-blur-sm self-stretch sm:self-auto min-w-[200px]">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
              <Activity className="w-6 h-6 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Efetivo Online</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{onlineCount}</span>
                <span className="text-xs font-bold text-emerald-400">conectados</span>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Navegação Temporal e Escala de Ala */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Badge da Ala Operacional do Dia */}
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-white shadow-md font-black shrink-0 ${getAlaColor(alaOfDay)}`}>
              <span className="text-[9px] tracking-widest uppercase opacity-85 leading-none">ALA</span>
              <span className="text-xl leading-none mt-0.5">{alaOfDay}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight capitalize">
                  {formattedDateStr}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
                  <Flame className="w-3 h-3 text-amber-400" />
                  ALA {alaOfDay} DE SERVIÇO
                </span>
                {selectedDate === todayStr && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Hoje
                  </span>
                )}
              </div>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                Guarnições escaladas para o plantão desta data
              </p>
            </div>
          </div>

          {/* Controles de Navegação no Tempo (Avançar e Voltar) */}
          <div className="flex items-center gap-1.5 self-center sm:self-auto bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700">
            <button
              onClick={handlePrevDay}
              className="p-2 rounded-xl hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Dia anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={handleToday}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
                selectedDate === todayStr
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              Hoje
            </button>

            <button
              onClick={handleNextDay}
              className="p-2 rounded-xl hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Próximo dia"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="relative pl-1 border-l border-slate-700">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="bg-transparent text-slate-200 text-xs font-black uppercase tracking-wider px-2 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                title="Selecionar data específica"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Viaturas da OBM */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {viaturasList.map((viaturaConfig) => {
          const viaturaNome = viaturaConfig.vtr;
          const alerting = Boolean(isAlerting[viaturaNome]);
          const secondsRemaining = alertSecondsLeft[viaturaNome] || 0;
          const assignedMilitars = guarnicoesDoDia[viaturaNome] || [];

          return (
            <motion.div
              key={viaturaConfig.id || viaturaNome}
              whileHover={{ y: -4 }}
              className={`relative overflow-hidden rounded-3xl p-6 sm:p-7 flex flex-col items-center justify-center text-center transition-all ${
                alerting
                  ? 'bg-rose-600 text-white shadow-rose-600/40 shadow-2xl border-2 border-rose-300'
                  : 'bg-white dark:bg-slate-900 shadow-xl hover:shadow-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900'
              }`}
            >
              {/* Efeito de pulso suave durante o brado (sem travar a tela) */}
              {alerting && (
                <div className="absolute inset-0 bg-white/15 animate-pulse rounded-3xl pointer-events-none"></div>
              )}

              {/* Ícone da Viatura */}
              <div
                className={`w-18 h-18 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-5 transition-colors shadow-inner ${
                  alerting ? 'bg-white/20' : 'bg-slate-50 dark:bg-slate-800'
                }`}
              >
                <Truck className={`w-9 h-9 sm:w-10 sm:h-10 ${alerting ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`} />
              </div>

              {/* Nome da Viatura */}
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`text-3xl sm:text-4xl font-black uppercase tracking-tight ${alerting ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                  {viaturaNome}
                </h3>
                {viaturaConfig.maritima && (
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                    alerting ? 'bg-rose-700 text-white' : 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300'
                  }`}>
                    Marítima
                  </span>
                )}
              </div>

              {/* Quantidade de Militares na Guarnição */}
              <p className={`text-xs font-bold uppercase tracking-widest mb-6 ${alerting ? 'text-rose-100' : 'text-slate-400'}`}>
                {assignedMilitars.length} {assignedMilitars.length === 1 ? 'Militar' : 'Militares'} na Guarnição
              </p>

              {/* Botões de Ação do Alerta */}
              <div className="w-full space-y-2">
                <button
                  onClick={() => handleBradarViatura(viaturaNome)}
                  className={`w-full py-3.5 sm:py-4 rounded-2xl font-black uppercase tracking-[0.15em] text-[11px] transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 cursor-pointer ${
                    alerting
                      ? 'bg-white text-rose-700 hover:bg-rose-50 shadow-white/30'
                      : 'bg-slate-900 dark:bg-slate-800 text-white hover:bg-rose-600 dark:hover:bg-rose-600 hover:shadow-rose-500/30'
                  }`}
                >
                  <BellRing className={`w-4 h-4 ${alerting ? 'animate-bounce text-rose-600' : ''}`} />
                  <span>{alerting ? `Viatura Bradada (${secondsRemaining}s)` : 'Bradar Viatura'}</span>
                </button>

                {/* Opção de Desarmar Alerta caso esteja tocando */}
                {alerting && (
                  <button
                    onClick={() => handleDesarmarAlerta(viaturaNome)}
                    className="w-full py-2.5 rounded-xl bg-black/25 hover:bg-black/40 text-white font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-1.5 border border-white/20 active:scale-95 cursor-pointer"
                    title="Desarmar alarme sonoro desta viatura imediatamente"
                  >
                    <BellOff className="w-3.5 h-3.5 text-amber-300" />
                    <span>Desarmar / Silenciar</span>
                  </button>
                )}

                {/* Botão de Gerenciamento da Guarnição */}
                <button
                  onClick={() => setManagingViatura(viaturaNome)}
                  className={`w-full py-3 rounded-xl border font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    alerting
                      ? 'border-white/30 text-white hover:bg-white/10'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Gerenciar Guarnição</span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Modal de Gerenciamento com as Funções Configuradas no Módulo de Viaturas */}
      <AnimatePresence>
        {managingViatura && (
          <ViaturaManagerModal
            viatura={managingViatura}
            viaturaConfig={currentManagingConfig}
            militars={militars}
            assignedRgs={guarnicoesDoDia[managingViatura] || []}
            currentAla={alaOfDay}
            onClose={() => setManagingViatura(null)}
            onToggleMilitar={handleToggleMilitar}
          />
        )}
      </AnimatePresence>
    </div>
  );
}