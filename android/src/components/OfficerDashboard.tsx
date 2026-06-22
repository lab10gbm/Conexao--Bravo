import { collection, query, onSnapshot, orderBy, doc, getDocs, where, setDoc, getDoc } from 'firebase/firestore';
import { subDays, format, addDays } from 'date-fns';
import React, { useState, useEffect } from 'react';
import { UserProfile, PermutaRequest, PermutaStatus } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Shield, ShieldAlert, FileClock, UserCheck, Phone, CheckCircle2, XCircle, ArrowRightLeft, FileSpreadsheet } from 'lucide-react';
import { ptBR } from 'date-fns/locale';
import { exportToExcel } from '../lib/exportUtils';

interface OfficerDashboardProps {
  user: UserProfile;
  obmContext: string;
}

export function OfficerDashboard({ user, obmContext }: OfficerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'escalas' | 'permutas'>('escalas');
  const [officerPermutas, setOfficerPermutas] = useState<PermutaRequest[]>([]);
  const [sobreavisoScales, setSobreavisoScales] = useState<any[]>([]);

  const exportarLivroOficial = () => {
    const data = officerPermutas.map(p => ({
      "Data da Permuta": format(new Date(p.date + 'T00:00:00'), 'dd/MM/yyyy'),
      "Requerente": p.requesterName,
      "Substituto": p.substituteName,
      "Status": p.status.toUpperCase(),
      "Unidade": p.obm
    }));
    exportToExcel(data, "Livro de Permutas", `Livro_Permutas_Oficiais_${format(new Date(), 'yyyy_MM')}`);
  };

  useEffect(() => {
    if (!obmContext) return;
    
    // Fetch Officer Permutas (Type: Officer)
    const normalizedObm = obmContext.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    
    let isMounted = true;
    
    async function loadOfficerData() {
       try {
         const sixtyDaysAgo = format(subDays(new Date(), 60), 'yyyy-MM-dd');
         const qPermutas = query(collection(db, 'permutas'), where('date', '>=', sixtyDaysAgo), orderBy('date', 'asc'));
         const snapshot = await getDocs(qPermutas);
         
         if (!isMounted) return;
         
         const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as PermutaRequest[];
         const officerData = data.filter(p => (p.obm === obmContext || p.obm === '10º GBM') && (p.isOfficer || true));
         setOfficerPermutas(officerData);
         
         const ref = doc(db, `officer_scales_${normalizedObm}`, 'current');
         const snap = await getDoc(ref);
         if (snap.exists() && isMounted) {
            setSobreavisoScales(snap.data().scales || []);
         } else if (isMounted) {
            setSobreavisoScales([]);
         }
       } catch (error) {
         if (isMounted) console.error('Failed to load officer data:', error);
       }
    }
    
    loadOfficerData();

    return () => { isMounted = false; };
  }, [obmContext]);

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto">
      {/* Officer Navigation */}
      <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('escalas')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'escalas' 
              ? 'bg-amber-500 text-white shadow-md' 
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> Escalas
        </button>
        <button
          onClick={() => setActiveTab('permutas')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'permutas' 
              ? 'bg-amber-500 text-white shadow-md' 
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" /> Permutas de Oficiais
        </button>
      </div>

      {activeTab === 'escalas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="flex items-center gap-2 text-slate-800 font-black uppercase tracking-widest mb-6">
              <Shield className="w-5 h-5 text-amber-500" />
              Oficial de Dia
            </h3>
            
            {sobreavisoScales.filter(s => s.type === 'oficial_dia').length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm font-medium">Nenhuma escala de Oficial de Dia registrada.</p>
              </div>
            ) : (
              <div className="space-y-4">
                 {/* Render Scales... */}
              </div>
            )}
          </div>

          <div className="bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-700">
            <h3 className="flex items-center gap-2 text-white font-black uppercase tracking-widest mb-6">
              <Phone className="w-5 h-5 text-emerald-400" />
              Sobreaviso
            </h3>
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm font-medium">Nenhuma escala de Sobreaviso registrada.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'permutas' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-8">
            <h3 className="flex items-center gap-2 text-slate-800 font-black uppercase tracking-widest">
              <ArrowRightLeft className="w-5 h-5 text-amber-500" />
              Gestão de Permutas (Oficiais)
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={exportarLivroOficial}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" /> Excel Oficial
              </button>
              <button className="px-4 py-2 bg-[var(--color-brand-red)] hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm transition-colors">
                Nova Permuta
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto border rounded-xl rounded-b-none">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b">
                <tr>
                  <th className="p-4">Data</th>
                  <th className="p-4">Solicitante</th>
                  <th className="p-4">Substituto</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {officerPermutas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Nenhuma solicitação de permuta encontrada para Oficiais nesta OBM.
                    </td>
                  </tr>
                ) : (
                  officerPermutas.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-800">{format(new Date(p.date + 'T00:00:00'), 'dd/MM/yyyy')}</td>
                      <td className="p-4">{p.requesterName}</td>
                      <td className="p-4">{p.substituteName}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded bg-amber-100 text-amber-700`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button className="text-amber-600 hover:text-amber-800 font-bold uppercase text-[10px] tracking-widest px-3 py-1 bg-amber-50 rounded">
                          Ver Detalhes
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
