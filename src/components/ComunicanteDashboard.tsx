import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Radio, BellRing, Users, Truck, Activity, Edit3 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, query, onSnapshot, serverTimestamp, setDoc, doc, Timestamp, getDoc } from 'firebase/firestore';
import { useMilitars } from '../contexts/MilitarContext';
import { UserProfile } from '../types';
import { ViaturaManagerModal } from './ViaturaManagerModal';
import { cleanUndefined } from "../lib/utils";

interface ComunicanteDashboardProps {
  user: UserProfile;
  onBack: () => void;
}

const VIATURAS = ['ABT', 'ABSL', 'ASE', 'AR', 'ARC'];

export function ComunicanteDashboard({ user, onBack }: ComunicanteDashboardProps) {
  const { militars } = useMilitars();
  const [onlineCount, setOnlineCount] = useState(0);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [isAlerting, setIsAlerting] = useState<Record<string, boolean>>({});
  const [managingViatura, setManagingViatura] = useState<string | null>(null);
  
  // Real-time estado das guarnições para o dia atual (ou contínuo até ser limpo)
  const [guarnicoesAtuais, setGuarnicoesAtuais] = useState<Record<string, string[]>>({});

  useEffect(() => {
    // Escuta presenças (heartbeat).
    const q = query(collection(db, 'presence'));
    const unsub = onSnapshot(q, (snap) => {
      let count = 0;
      const now = Date.now();
      snap.forEach(d => {
        const data = d.data();
        if (data.lastActive) {
          const lastActive = data.lastActive.toMillis?.() || data.lastActive;
          // Consider online if active in the last 2 minutes
          if (now - lastActive < 2 * 60 * 1000) {
            count++;
          }
        }
      });
      setOnlineCount(count);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Escuta as guarnições ativas no Firestore
    // Documento fixo "guarnicoes/ativas" para manter o estado em tempo real.
    const unsub = onSnapshot(doc(db, 'guarnicoes', 'ativas'), (docSnap) => {
      if (docSnap.exists()) {
        setGuarnicoesAtuais(docSnap.data() as Record<string, string[]>);
      } else {
        setGuarnicoesAtuais({});
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Listen to recent alerts for feedback
    const unsub = onSnapshot(collection(db, 'viatura_alerts'), (snap) => {
      const alerts = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      // Keep only alerts from the last 15 seconds
      const recent = alerts.filter(a => {
        const time = a.timestamp?.toMillis?.() || a.timestamp || 0;
        return Date.now() - time < 15000;
      });
      setActiveAlerts(recent);
      
      const newIsAlerting: Record<string, boolean> = {};
      recent.forEach(a => {
        newIsAlerting[a.viatura] = true;
      });
      setIsAlerting(newIsAlerting);
    });
    return () => unsub();
  }, []);

  const handleBradarViatura = async (viatura: string) => {
    try {
      await addDoc(collection(db, 'viatura_alerts'), cleanUndefined({
              viatura,
              emittedBy: 'Centro de Comunicações',
              timestamp: serverTimestamp()
            }));
    } catch (e) {
      console.error('Erro ao bradar viatura:', e);
      alert('Erro ao acionar a viatura.');
    }
  };

  const handleToggleMilitar = async (rg: string, viatura: string, isAdding: boolean) => {
    const currentList = guarnicoesAtuais[viatura] || [];
    let newList = [...currentList];
    
    if (isAdding) {
      if (!newList.includes(rg)) newList.push(rg);
    } else {
      newList = newList.filter(id => id !== rg);
    }
    
    // Update local state instantly
    setGuarnicoesAtuais(prev => ({ ...prev, [viatura]: newList }));
    
    try {
      await setDoc(doc(db, 'guarnicoes', 'ativas'), cleanUndefined({
              [viatura]: newList
            }), { merge: true });
    } catch (e) {
      console.error('Erro ao salvar guarnição', e);
      alert('Erro ao atualizar guarnições. Tente novamente.');
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar
        </button>
      </div>

      <div className="bg-slate-900 rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-800 relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 text-indigo-400 mb-2">
              <Radio className="w-6 h-6 animate-pulse" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Painel Operacional</h2>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white mb-2">Centro de Comunicações</h1>
            <p className="text-sm font-medium text-slate-400 max-w-xl">Acione rapidamente as guarnições. Os dispositivos dos militares designados para a viatura irão tocar imediatamente.</p>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-sm self-stretch md:self-auto min-w-[200px]">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Efetivo Online</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{onlineCount}</span>
                <span className="text-xs font-bold text-emerald-400">ativos agora</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {VIATURAS.map(viatura => {
          const alerting = isAlerting[viatura];
          const assignedRgs = guarnicoesAtuais[viatura] || [];

          return (
            <motion.div 
              key={viatura}
              whileHover={{ y: -5 }}
              className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all ${
                alerting 
                  ? 'bg-rose-500 text-white shadow-rose-500/50 shadow-2xl scale-105 z-10' 
                  : 'bg-white shadow-xl hover:shadow-2xl border border-slate-100 hover:border-rose-100'
              }`}
            >
              {alerting && (
                 <div className="absolute inset-0 bg-white/20 animate-ping rounded-3xl"></div>
              )}
              
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors shadow-inner ${
                alerting ? 'bg-white/20' : 'bg-slate-50'
              }`}>
                <Truck className={`w-10 h-10 ${alerting ? 'text-white' : 'text-slate-700'}`} />
              </div>
              
              <h3 className={`text-4xl font-black uppercase tracking-tight mb-2 ${alerting ? 'text-white' : 'text-slate-800'}`}>
                {viatura}
              </h3>
              
              <p className={`text-xs font-bold uppercase tracking-widest mb-8 ${alerting ? 'text-rose-100' : 'text-slate-400'}`}>
                {assignedRgs.length} {assignedRgs.length === 1 ? 'Militar' : 'Militares'} na Guarnição
              </p>
              
              <button
                onClick={() => handleBradarViatura(viatura)}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 ${
                  alerting
                    ? 'bg-white text-rose-600 shadow-white/20 pointer-events-none'
                    : 'bg-slate-900 text-white hover:bg-rose-600 hover:shadow-rose-500/30'
                }`}
              >
                <BellRing className={`w-4 h-4 ${alerting ? 'animate-bounce' : ''}`} />
                {alerting ? 'Viatura Tocou!' : 'Bradar Viatura'}
              </button>

              <button
                onClick={() => setManagingViatura(viatura)}
                className="mt-3 w-full py-3 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Gerenciar Guarnição
              </button>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {managingViatura && (
          <ViaturaManagerModal
            viatura={managingViatura}
            militars={militars}
            assignedRgs={guarnicoesAtuais[managingViatura] || []}
            onClose={() => setManagingViatura(null)}
            onToggleMilitar={handleToggleMilitar}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
