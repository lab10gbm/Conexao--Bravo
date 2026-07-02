import React, { useState } from 'react';
import { parseRank } from "../lib/rankUtils";
import { useMilitars } from '../contexts/MilitarContext';
import { Search, Loader2, Plus, X, ArrowRight, Users } from 'lucide-react';
import { cn } from '../lib/utils';
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

function normalizeAlaField(ala: string | number | undefined): string {
  if (!ala) return '';
  const a = String(ala).toUpperCase();
  if (a.includes('EXP') || a === 'E' || a === 'EXPEDIENTE') return 'EXP';
  if (a.includes('1')) return '1';
  if (a.includes('2')) return '2';
  if (a.includes('3')) return '3';
  if (a.includes('4')) return '4';
  return '';
}

export function EscalanteAlasConfig({ obmContext }: EscalanteAlasConfigProps) {
  const { militars, loading, refreshMilitars } = useMilitars();
  const [searchTerm, setSearchTerm] = useState('');
  const [assigningRg, setAssigningRg] = useState<string | null>(null);

  // Filter by OBM
  const militarsInObm = militars.filter(m => {
    const rawObm = m.obm ? m.obm.trim().toUpperCase() : '10º GBM';
    const ctx = (obmContext || '').trim().toUpperCase();
    
    if (ctx === 'GLOBAL') return true;
    
    return rawObm === ctx;
  });

  const getMilitarsByAla = (alaId: string) => {
    return militarsInObm.filter(m => normalizeAlaField(m.ala) === alaId).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  };

  const [targetAlaToAdd, setTargetAlaToAdd] = useState<string | null>(null);

  const assignAla = async (rg: string, ala: string) => {
    setAssigningRg(rg);
    try {
      await fetch('/api/militar/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    <div className="p-6">
      <AfastamentosAlaModule obmContext={obmContext} type="atuais" />

      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Distribuição do Efetivo ({obmContext})</h3>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar por nome ou RG..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 border-2 border-slate-200 focus:border-indigo-400 rounded-xl text-[10px] uppercase font-black tracking-widest outline-none w-64 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {ALAS.map(ala => {
          const members = getMilitarsByAla(ala).filter(m => 
            !searchTerm || 
            (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
            normalizeRg(m.rg || '').includes(normalizeRg(searchTerm))
          );
          const isAdding = targetAlaToAdd === ala;

          return (
            <div key={ala} className="flex flex-col border-2 border-slate-200 rounded-2xl overflow-hidden bg-slate-50 relative h-[600px]">
              <div className={cn("p-4 flex items-center justify-between", getHeaderColor(ala))}>
                <div>
                  <h4 className="text-[14px] font-black tracking-wider">ALA {ala}</h4>
                  <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest">{members.length} Militares</p>
                </div>
                <button 
                  onClick={() => setTargetAlaToAdd(isAdding ? null : ala)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>

              {isAdding && (
                <div className="p-3 border-b-2 border-slate-200 bg-white">
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Adicionar à Ala {ala}</div>
                  <div className="max-h-40 overflow-y-auto pr-1">
                    {militarsInObm.filter(m => normalizeAlaField(m.ala) !== ala && (!searchTerm || (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || normalizeRg(m.rg || '').includes(normalizeRg(searchTerm)))).slice(0, 10).map(m => (
                      <button
                        key={m.rg}
                        onClick={() => assignAla(m.rg!, ala)}
                        disabled={assigningRg === m.rg}
                        className="w-full text-left p-2 rounded-lg hover:bg-slate-100 flex items-center justify-between group transition-colors mb-1"
                      >
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-[10px] font-black text-slate-700 truncate">{parseRank(m.rank)} {m.warName || (m.name || '').split(' ')[0]}</span>
                          <span className="text-[8px] font-bold text-slate-400 font-mono tracking-wider">{m.rg} • {m.quadro || 'Sem Quadro'}</span>
                        </div>
                        {assigningRg === m.rg ? (
                          <Loader2 className="w-3 h-3 text-indigo-400 animate-spin flex-shrink-0" />
                        ) : (
                          <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                        )}
                      </button>
                    ))}
                    {militarsInObm.filter(m => normalizeAlaField(m.ala) !== ala).length === 0 && (
                      <div className="p-2 text-center text-[9px] font-bold text-slate-400 uppercase">Todos os militares configurados.</div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {members.map((m, idx) => (
                  <div key={m.rg} className="bg-white p-3 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors shadow-sm relative group flex items-start flex-col gap-1">
                    <div className="flex items-center gap-2 w-full justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center text-[9px] font-black text-slate-400">
                          {idx + 1}
                        </div>
                        <span className="text-[11px] font-black text-slate-700 truncate" title={m.name}>{parseRank(m.rank)} {m.warName || (m.name || '').split(' ')[0]}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-7 w-full text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                       <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{m.rg}</span>
                       <span className="truncate">{m.quadro || '-'}</span>
                    </div>
                    
                    {/* Action to change to EXP or another ala easily? Just use the plus menu in the target ala. */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button 
                        onClick={() => assignAla(m.rg!, '')}
                        title="Remover da Ala"
                        disabled={assigningRg === m.rg}
                        className="w-6 h-6 bg-rose-50 text-rose-500 rounded flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {members.length === 0 && !isAdding && (
                  <div className="h-full flex items-center justify-center flex-col gap-2 opacity-40 p-4 text-center">
                     <Users className="w-8 h-8 text-slate-400" />
                     <span className="text-[10px] font-black tracking-widest uppercase text-slate-500">Nenhum militar</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <AfastamentosAlaModule obmContext={obmContext} type="anual" />
      </div>
    </div>
  );
}
