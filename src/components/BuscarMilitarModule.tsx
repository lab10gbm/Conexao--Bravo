import React, { useState, useMemo, useDeferredValue, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronLeft, User, Building2 } from 'lucide-react';
import { UserProfile } from '../types';
import { useMilitars } from '../contexts/MilitarContext';
import { RankInsignia } from './RankInsignia';
import { parseRank } from '../lib/rankUtils';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { MilitaryProfile } from './MilitaryProfile';

interface BuscarMilitarModuleProps {
  viewer: UserProfile;
  onBack: () => void;
}

export function BuscarMilitarModule({ viewer, onBack }: BuscarMilitarModuleProps) {
  const { militars, loading } = useMilitars();
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [selectedMilitarId, setSelectedMilitarId] = useState<string | null>(null);
  const selectedMilitar = useMemo(() => militars.find(m => m.rg === selectedMilitarId) || null, [militars, selectedMilitarId]);

  const filteredMilitars = useMemo(() => {
    if (!deferredSearchTerm) return [];
    
    const term = deferredSearchTerm.toLowerCase();
    
    const order = ['CORONEL', 'TENENTE CORONEL', 'MAJOR', 'CAPITÃO', '1º TENENTE', '2º TENENTE', 'ASP OF', 'SUBTENENTE', '1º SARGENTO', '2º SARGENTO', '3º SARGENTO', 'CABO', 'SOLDADO'];
    const rankMap = new Map(order.map((r, i) => [r, i]));
    const getRankIdx = (rankStr: string | undefined) => {
       const mapped = parseRank(rankStr || '');
       const idx = rankMap.get(mapped);
       return idx !== undefined ? idx : 99;
    };

    const results = [];
    for (const m of militars) {
      if (
        (m.name?.toLowerCase() || '').includes(term) ||
        (m.warName?.toLowerCase() || '').includes(term) ||
        (m.rg?.toString().toLowerCase() || '').includes(term) ||
        (m.rank?.toLowerCase() || '').includes(term)
      ) {
        results.push(m);
      }
    }

    results.sort((a, b) => {
      const idxA = getRankIdx(a.rank);
      const idxB = getRankIdx(b.rank);
      if (idxA !== idxB) return idxA - idxB;
      return (a.name || '').localeCompare(b.name || '');
    });

    return results.slice(0, 50); // limit for fast DOM render
  }, [militars, deferredSearchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-indigo-700 text-white p-4 sm:p-6 shadow-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button 
            onClick={() => {
               if (selectedMilitar) setSelectedMilitarId(null);
               else onBack();
            }}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Buscar Militar</h1>
            <p className="text-[10px] sm:text-xs text-indigo-200 font-bold uppercase tracking-widest mt-0.5">
              Diretório de Perfis e Contatos
            </p>
          </div>
          
          <AnimatePresence>
            {selectedMilitar && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setSelectedMilitarId(null)}
                className="flex items-center gap-2 p-2 sm:px-4 sm:py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
              >
                <Search className="w-5 h-5" />
                <span className="hidden sm:inline text-xs font-bold uppercase tracking-widest">Nova Busca</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 flex flex-col gap-6 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {!selectedMilitar ? (
            <motion.div 
              key="search-view"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col gap-6"
            >
              {/* Search Bar */}
              <div className="relative max-w-2xl mx-auto w-full">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-indigo-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-11 pr-4 py-4 bg-white border-2 border-indigo-100 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium shadow-sm"
                  placeholder="Digite o nome de guerra, RG, posto ou nome completo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Results */}
              <div className="flex-1">
                {loading ? (
                  <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                     <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mb-4"></div>
                     <p className="font-bold uppercase tracking-widest text-xs">Carregando diretório...</p>
                  </div>
                ) : searchTerm === '' ? (
                  <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-center">
                    <User className="w-16 h-16 mb-4 opacity-50" />
                    <h3 className="font-black text-lg text-slate-600 uppercase tracking-tight">Pesquisa Rápida</h3>
                    <p className="font-bold text-xs uppercase tracking-widest mt-2 max-w-md">
                      Utilize a barra acima para encontrar as informações de perfil, quadro e contatos de qualquer militar da corporação.
                    </p>
                  </div>
                ) : filteredMilitars.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-center">
                    <Search className="w-12 h-12 mb-4 opacity-50" />
                    <h3 className="font-black text-lg text-slate-600 uppercase tracking-tight">Nenhum resultado</h3>
                    <p className="font-bold text-xs uppercase tracking-widest mt-2">
                      Não encontramos nenhum militar correspondente a "{searchTerm}".
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredMilitars.map((militar, index) => (
                      <motion.button
                        key={militar.rg || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => setSelectedMilitarId(militar.rg || null)}
                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all text-left flex items-center gap-4 group"
                      >
                        <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden relative">
                          {militar.photoURL ? (
                             <img src={militar.photoURL} alt={militar.name} className="w-full h-full object-cover" />
                          ) : (
                             <RankInsignia rankStr={militar.rank} className="scale-110" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded">
                              {militar.rank}
                            </span>
                            {militar.obm && (
                              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Building2 className="w-3 h-3" /> {militar.obm}
                              </span>
                            )}
                          </div>
                          <h4 className="font-black text-slate-800 uppercase truncate group-hover:text-indigo-700 transition-colors">
                            {militar.warName || militar.name}
                          </h4>
                          <p className="text-[11px] font-bold text-slate-400 capitalize truncate mt-0.5 font-mono">
                            RG: {militar.rg}
                          </p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="profile-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 w-full max-w-4xl mx-auto"
            >
              <MilitaryProfile
                inline
                militar={selectedMilitar}
                viewer={viewer}
                onClose={() => setSelectedMilitarId(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

