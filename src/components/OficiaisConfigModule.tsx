import React, { useState, useEffect, useMemo } from 'react';
import { useMilitars } from '../contexts/MilitarContext';
import { db } from '../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Settings, ShieldCheck, Anchor, Stethoscope, Search, Check, Users } from 'lucide-react';
import { parseRank, COLS_OFICIAIS, sortOfficersBySeniority } from '../lib/rankUtils';
import { UserProfile } from '../types';
import { format } from 'date-fns';

interface OficiaisConfigModuleProps {
  obmContext: string;
}

export function OficiaisConfigModule({ obmContext }: OficiaisConfigModuleProps) {
  const { militars } = useMilitars();
  const [config, setConfig] = useState<Record<string, string[]>>({
    servicosGrd: [],
    nucleoNautico: [],
    oficiaisMedicos: []
  });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const docId = (obmContext || '10º GBM').replace(/\//g, '_').replace(/\s/g, '_');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'officer_pool_config', docId), (snap) => {
      if (snap.exists()) {
        setConfig(snap.data() as Record<string, string[]>);
      } else {
        setConfig({ servicosGrd: [], nucleoNautico: [], oficiaisMedicos: [] });
      }
    });
    return () => unsub();
  }, [docId]);

  const allOfficers = useMemo(() => {
    return militars.filter(m => {
       const rawMObm = m.obm ? m.obm : '10º GBM';
       const mObm = rawMObm.replace(/º/g, '°').trim().toUpperCase();
       const ctxObm = (obmContext || '').replace(/º/g, '°').trim().toUpperCase();
       if (ctxObm && ctxObm !== 'GLOBAL' && mObm !== ctxObm) return false;
       const r = parseRank(m.rank);
       return COLS_OFICIAIS.includes(r);
    }).sort(sortOfficersBySeniority);
  }, [militars, obmContext]);

  const filteredOfficers = allOfficers.filter(o => 
    !searchTerm || `${o.rank} ${o.warName || o.name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOfficer = async (moduleKey: string, rg: string) => {
    setSaving(true);
    try {
      const currentList = config[moduleKey] || [];
      const newList = currentList.includes(rg) 
        ? currentList.filter(r => r !== rg) 
        : [...currentList, rg];
      
      const newConfig = { ...config, [moduleKey]: newList };
      await setDoc(doc(db, 'officer_pool_config', docId), newConfig, { merge: true });
    } catch(err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            Configuração de Efetivo (Oficiais)
          </h3>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Selecione quais oficiais estarão disponíveis para escala em cada módulo.
          </p>
        </div>
        <div className="relative min-w-[250px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar oficial..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="py-3 px-4 font-black uppercase text-slate-500 tracking-wider">Oficial</th>
              <th className="py-3 px-4 text-center">
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <span className="font-black uppercase tracking-wider text-[10px] text-slate-600">Serviços e GRD</span>
                </div>
              </th>
              <th className="py-3 px-4 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Anchor className="w-5 h-5 text-cyan-600" />
                  <span className="font-black uppercase tracking-wider text-[10px] text-slate-600">Núcleo Náutico</span>
                </div>
              </th>
              <th className="py-3 px-4 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Stethoscope className="w-5 h-5 text-rose-600" />
                  <span className="font-black uppercase tracking-wider text-[10px] text-slate-600">Oficiais Médicos</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOfficers.map(o => {
              const inGrd = (config.servicosGrd || []).includes(o.rg);
              const inNautico = (config.nucleoNautico || []).includes(o.rg);
              const inMedico = (config.oficiaisMedicos || []).includes(o.rg);
              
              return (
                <tr key={o.rg} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-800 uppercase tracking-tight">{o.rank} {o.warName || o.name}</div>
                    <div className="text-[10px] font-bold text-slate-400">RG: {o.rg}</div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button 
                      onClick={() => toggleOfficer('servicosGrd', o.rg)}
                      className={`w-6 h-6 rounded border flex items-center justify-center mx-auto transition-colors ${inGrd ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 hover:border-indigo-400'}`}
                    >
                      {inGrd && <Check className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button 
                      onClick={() => toggleOfficer('nucleoNautico', o.rg)}
                      className={`w-6 h-6 rounded border flex items-center justify-center mx-auto transition-colors ${inNautico ? 'bg-cyan-600 border-cyan-600 text-white' : 'bg-white border-slate-300 hover:border-cyan-400'}`}
                    >
                      {inNautico && <Check className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button 
                      onClick={() => toggleOfficer('oficiaisMedicos', o.rg)}
                      className={`w-6 h-6 rounded border flex items-center justify-center mx-auto transition-colors ${inMedico ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-300 hover:border-rose-400'}`}
                    >
                      {inMedico && <Check className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredOfficers.length === 0 && (
          <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-sm">
            Nenhum oficial encontrado
          </div>
        )}
      </div>
      {saving && <div className="absolute top-4 right-4 text-xs font-bold text-indigo-500 animate-pulse uppercase">Salvando...</div>}
    </div>
  );
}
