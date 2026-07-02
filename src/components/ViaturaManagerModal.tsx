import React, { useState, useEffect, useMemo } from 'react';
import { parseRank } from "../lib/rankUtils";
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, UserPlus, UserMinus, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';

interface ViaturaManagerModalProps {
  viatura: string;
  militars: UserProfile[];
  assignedRgs: string[];
  onClose: () => void;
  onToggleMilitar: (rg: string, viatura: string, isAdding: boolean) => void;
}

export function ViaturaManagerModal({ viatura, militars, assignedRgs, onClose, onToggleMilitar }: ViaturaManagerModalProps) {
  const [search, setSearch] = useState('');

  const assignedMilitars = useMemo(() => {
    return assignedRgs.map(rg => militars.find(m => m.rg === rg)).filter(Boolean) as UserProfile[];
  }, [militars, assignedRgs]);

  const availableMilitars = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return [];
    
    return militars.filter(m => {
      // Not already assigned
      if (assignedRgs.includes(m.rg)) return false;
      
      const matchName = (m.name || '').toLowerCase().includes(term);
      const matchWarName = (m.warName || '').toLowerCase().includes(term);
      const matchRg = (m.rg || '').toString().includes(term);
      return matchName || matchWarName || matchRg;
    }).slice(0, 5); // max 5 results
  }, [militars, search, assignedRgs]);

  const isFull = assignedMilitars.length >= 6;

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

        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800 mb-1">
          Guarnição {viatura}
        </h2>
        <p className="text-sm font-bold text-slate-500 mb-6 uppercase tracking-widest">
          {assignedMilitars.length} / 6 Militares
        </p>

        {/* Assigned List */}
        <div className="flex-1 overflow-y-auto min-h-[150px] mb-6 pr-2 custom-scrollbar">
          {assignedMilitars.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8">
              <ShieldCheck className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-bold uppercase tracking-widest">Nenhum militar escalado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {assignedMilitars.map(m => (
                <div key={m.rg} className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50">
                  <div>
                    <p className="font-black text-slate-800 text-sm uppercase tracking-tight">
                      {parseRank(m.rank)} {m.warName || m.name.split(' ')[0]}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      RG: {m.rg}
                    </p>
                  </div>
                  <button
                    onClick={() => onToggleMilitar(m.rg, viatura, false)}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-100 hover:text-rose-600 transition-colors"
                    title="Remover da Viatura"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <hr className="border-slate-100 mb-6" />

        {/* Add Militar */}
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
            Adicionar Militar
          </h3>
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou RG..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all uppercase tracking-tight"
            />
          </div>

          <div className="space-y-2">
            {availableMilitars.map(m => (
              <div key={m.rg} className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-white">
                <div>
                  <p className="font-black text-slate-800 text-sm uppercase tracking-tight">
                    {parseRank(m.rank)} {m.warName || m.name.split(' ')[0]}
                  </p>
                </div>
                <button
                  onClick={() => onToggleMilitar(m.rg, viatura, true)}
                  disabled={isFull}
                  className={`p-2 rounded-xl transition-colors ${
                    isFull 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                      : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                  }`}
                  title={isFull ? "Viatura lotada" : "Adicionar à Viatura"}
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>
            ))}
            {search && availableMilitars.length === 0 && (
              <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest py-4">
                Nenhum militar encontrado
              </p>
            )}
            {isFull && (
              <p className="text-center text-xs font-bold text-rose-500 uppercase tracking-widest mt-2 flex items-center justify-center gap-1">
                <X className="w-3 h-3" /> Limite de 6 militares atingido
              </p>
            )}
          </div>
        </div>

      </motion.div>
    </div>
  );
}
