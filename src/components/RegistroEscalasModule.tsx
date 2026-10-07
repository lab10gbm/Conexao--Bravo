import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format } from 'date-fns';
import { FileText, Eye } from 'lucide-react';
import { parseRank } from '../lib/rankUtils';

export function RegistroEscalasModule({ obmContext }: { obmContext?: string }) {
  const [escalas, setEscalas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEscalas = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'registro_escalas_24h'),
          where('obm', '==', obmContext || '10º GBM')
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // sort locally by date descending
        data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEscalas(data);
      } catch(err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEscalas();
  }, [obmContext]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-stone-900 text-white p-4">
        <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
          <FileText className="w-5 h-5 text-stone-400" />
          Livro de Registro de Escalas (24h)
        </h2>
        <p className="text-xs font-medium text-stone-400 mt-1">
          Escalas assinadas e arquivadas pelo Escalante.
        </p>
      </div>
      
      <div className="p-4">
        {loading ? (
          <div className="p-8 text-center text-slate-500 font-bold animate-pulse">Carregando registros...</div>
        ) : escalas.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-bold border-2 border-dashed border-slate-200 rounded-xl">
            Nenhuma escala registrada encontrada.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {escalas.map(esc => (
              <div key={esc.id} className="border border-slate-200 rounded-xl p-4 hover:border-stone-400 transition-colors shadow-sm bg-slate-50">
                <div className="text-sm font-black text-slate-800 mb-1">
                  Escala do dia {format(new Date(esc.date + "T00:00:00"), 'dd/MM/yyyy')}
                </div>
                <div className="text-[10px] font-bold text-slate-500 mb-3">
                  Registrado em {format(new Date(esc.registeredAt), 'dd/MM/yyyy HH:mm')}
                </div>
                
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <div className="text-[9px] uppercase tracking-wider font-bold text-stone-500 mb-1">Assinada por:</div>
                  <div className="text-xs font-bold text-slate-700">
                    {parseRank(esc.registeredBy?.rank)} {esc.registeredBy?.name}
                  </div>
                </div>
                
                <button className="mt-3 w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs py-2 rounded flex items-center justify-center gap-2 transition-colors">
                  <Eye className="w-3.5 h-3.5" /> Ver Espelho Salvo
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
