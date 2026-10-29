import React, { useState, useEffect, useMemo } from 'react';
import { parseRank } from "../lib/rankUtils";
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, UserPlus, UserMinus, ShieldCheck, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';
import type { ViaturaConfig } from '../features/viaturas/types';

interface ViaturaManagerModalProps {
  viatura: string;
  viaturaConfig?: ViaturaConfig;
  militars: UserProfile[];
  assignedRgs: { rg: string, role?: string }[];
  currentAla?: string | number;
  onClose: () => void;
  onToggleMilitar: (rg: string, viatura: string, isAdding: boolean, role?: string) => void;
}

export function ViaturaManagerModal({
  viatura,
  viaturaConfig,
  militars,
  assignedRgs,
  currentAla,
  onClose,
  onToggleMilitar,
}: ViaturaManagerModalProps) {
  const [search, setSearch] = useState('');

  // 1. Extrair dinamicamente as funções configuradas para esta viatura específica
  const availableRoles = useMemo(() => {
    if (!viaturaConfig) {
      return ['Chefe de Guarnição', 'Condutor', 'G1', 'G2', 'G3', 'G4', 'Auxiliar'];
    }

    const rolesList: string[] = [];
    const isMaritima = Boolean(viaturaConfig.maritima || viatura.startsWith('L-') || viatura.startsWith('BIA'));

    // 1. Chefe de Guarnição / Comandante
    if (!viaturaConfig.blocked?.includes('cg') && viaturaConfig.cg !== null && viaturaConfig.cg !== false) {
      const cgName = viaturaConfig.customNames?.cg || (isMaritima ? 'Comandante da Embarcação' : 'Chefe de Guarnição');
      rolesList.push(cgName);
    }

    // 2. Condutor / Mestre
    if (!viaturaConfig.blocked?.includes('condutor') && viaturaConfig.condutor !== null && viaturaConfig.condutor !== false) {
      const condName = viaturaConfig.customNames?.condutor || (isMaritima ? 'Mestre' : 'Condutor');
      rolesList.push(condName);
    }

    // 3. Auxiliares / Guarnição (G1, G2, G3, G4)
    const gSlots = ['g1', 'g2', 'g3', 'g4'] as const;
    gSlots.forEach((slot, idx) => {
      if (!viaturaConfig.blocked?.includes(slot) && viaturaConfig[slot] !== null && viaturaConfig[slot] !== false) {
        const customName = viaturaConfig.customNames?.[slot];
        if (customName) {
          if (!rolesList.includes(customName)) rolesList.push(customName);
        } else if (isMaritima) {
          const mRole = `Marinheiro ${idx + 1}`;
          if (!rolesList.includes(mRole)) rolesList.push(mRole);
        } else {
          const gRole = slot.toUpperCase();
          if (!rolesList.includes(gRole)) rolesList.push(gRole);
        }
      }
    });

    if (rolesList.length === 0) {
      return ['Condutor', 'Auxiliar'];
    }

    return rolesList;
  }, [viaturaConfig, viatura]);

  const [selectedRole, setSelectedRole] = useState(availableRoles[0] || 'Condutor');

  useEffect(() => {
    if (availableRoles.length > 0 && !availableRoles.includes(selectedRole)) {
      setSelectedRole(availableRoles[0]);
    }
  }, [availableRoles]);

  // Capacidade máxima configurada na viatura
  const maxCapacity = useMemo(() => {
    if (!viaturaConfig) return 6;
    let count = 0;
    if (!viaturaConfig.blocked?.includes('cg') && viaturaConfig.cg !== null && viaturaConfig.cg !== false) count++;
    if (!viaturaConfig.blocked?.includes('condutor') && viaturaConfig.condutor !== null && viaturaConfig.condutor !== false) count++;
    (['g1', 'g2', 'g3', 'g4'] as const).forEach((slot) => {
      if (!viaturaConfig.blocked?.includes(slot) && viaturaConfig[slot] !== null && viaturaConfig[slot] !== false) count++;
    });
    return Math.max(1, count || 6);
  }, [viaturaConfig]);

  const assignedMilitars = useMemo(() => {
    return assignedRgs.map(item => {
      const m = militars.find(m => m.rg === item.rg);
      if (!m) return null;
      return { ...m, role: item.role };
    }).filter(Boolean) as (UserProfile & { role?: string })[];
  }, [militars, assignedRgs]);

  const availableMilitars = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return [];
    
    const unassigned = militars.filter(m => {
      // Not already assigned
      if (assignedRgs.find(a => a.rg === m.rg)) return false;
      
      const matchName = (m.name || '').toLowerCase().includes(term);
      const matchWarName = (m.warName || '').toLowerCase().includes(term);
      const matchRg = (m.rg || '').toString().includes(term);
      return matchName || matchWarName || matchRg;
    });

    // Se houver currentAla, priorizar militares pertencentes a essa ala no topo
    if (currentAla) {
      const curAlaStr = String(currentAla);
      unassigned.sort((a, b) => {
        const aMatches = String(a.ala) === curAlaStr;
        const bMatches = String(b.ala) === curAlaStr;
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
        return 0;
      });
    }

    return unassigned.slice(0, 8);
  }, [militars, search, assignedRgs, currentAla]);

  const isFull = assignedMilitars.length >= maxCapacity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative flex flex-col max-h-[90vh]"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800">
            Guarnição {viatura}
          </h2>
          {viaturaConfig?.maritima && (
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
              Marítima
            </span>
          )}
        </div>
        
        <p className="text-xs font-bold text-slate-500 mb-5 uppercase tracking-widest flex items-center gap-2">
          <span>{assignedMilitars.length} / {maxCapacity} Militares Escalados</span>
          {currentAla && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black">
              Ala {currentAla} de Serviço
            </span>
          )}
        </p>

        {/* Assigned List */}
        <div className="flex-1 overflow-y-auto min-h-[140px] mb-6 pr-2 custom-scrollbar">
          {assignedMilitars.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <ShieldCheck className="w-10 h-10 mb-2 opacity-30 text-indigo-600" />
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Nenhum militar escalado nesta viatura</p>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">Busque abaixo para adicionar militares à guarnição</p>
            </div>
          ) : (
            <div className="space-y-2">
              {assignedMilitars.map(m => (
                <div key={m.rg} className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100/70 transition-colors">
                  <div className="min-w-0 pr-2">
                    <p className="font-black text-slate-800 text-sm uppercase tracking-tight truncate">
                      {parseRank(m.rank)} {m.warName || m.name.split(' ')[0]}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                        RG: {m.rg}
                      </span>
                      {m.role && (
                        <span className="bg-indigo-100 text-indigo-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border border-indigo-200">
                          {m.role}
                        </span>
                      )}
                      {m.ala && (
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          String(m.ala) === String(currentAla) ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          Ala {m.ala}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleMilitar(m.rg, viatura, false)}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-100 hover:text-rose-600 transition-colors shrink-0"
                    title="Remover da Viatura"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <hr className="border-slate-100 mb-5" />

        {/* Add Militar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Adicionar Militar à Guarnição
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              Funções da Viatura
            </span>
          </div>

          <div className="flex gap-2 mb-3">
             <div className="relative flex-1">
               <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
               <input
                 type="text"
                 placeholder="Buscar por nome ou RG..."
                 value={search}
                 onChange={e => setSearch(e.target.value)}
                 className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all uppercase tracking-tight"
               />
             </div>
             
             {/* Opções configuradas no módulo de viaturas! */}
             <select
               value={selectedRole}
               onChange={e => setSelectedRole(e.target.value)}
               className="w-2/5 px-2.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all uppercase tracking-tight truncate cursor-pointer"
               title="Função na Viatura"
             >
               {availableRoles.map(r => (
                 <option key={r} value={r}>{r}</option>
               ))}
             </select>
          </div>

          <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar">
            {availableMilitars.map(m => {
              const isFromCurrentAla = currentAla && String(m.ala) === String(currentAla);
              return (
                <div key={m.rg} className="flex items-center justify-between p-2.5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-200 transition-all">
                  <div className="min-w-0 pr-2">
                    <p className="font-black text-slate-800 text-xs sm:text-sm uppercase tracking-tight truncate flex items-center gap-1.5">
                      <span>{parseRank(m.rank)} {m.warName || m.name.split(' ')[0]}</span>
                      {isFromCurrentAla && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                          Ala {m.ala}
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 font-mono">
                      RG: {m.rg} {!isFromCurrentAla && m.ala ? `• Ala ${m.ala}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => onToggleMilitar(m.rg, viatura, true, selectedRole)}
                    disabled={isFull}
                    className={`p-2 rounded-xl transition-colors shrink-0 ${
                      isFull 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95'
                    }`}
                    title={isFull ? `Viatura lotada (máx ${maxCapacity})` : `Adicionar como ${selectedRole}`}
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
            {search && availableMilitars.length === 0 && (
              <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest py-3">
                Nenhum militar encontrado
              </p>
            )}
            {isFull && (
              <p className="text-center text-xs font-bold text-rose-500 uppercase tracking-widest mt-2 flex items-center justify-center gap-1">
                <X className="w-3 h-3" /> Limite de {maxCapacity} militares atingido
              </p>
            )}
          </div>
        </div>

      </motion.div>
    </div>
  );
}
