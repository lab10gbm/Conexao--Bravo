import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, ShieldCheck, Trash2, ArrowLeft, Loader2, UtensilsCrossed, Briefcase, MapPin } from 'lucide-react';
import { UserProfile } from '../types';
import { OBM_HIERARCHY } from '../constants';
import { cleanUndefined } from "../lib/utils";

export function TerceirizadosModule({ user, onBack }: { user: UserProfile, onBack: () => void }) {
  const [terceirizados, setTerceirizados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Novo formulário
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [obm, setObm] = useState(Object.keys(OBM_HIERARCHY)[0] || '10º GBM');
  const [role, setRole] = useState<'rancho' | 'expediente'>('rancho');
  const [saving, setSaving] = useState(false);

  const [deleteData, setDeleteData] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    const q = collection(db, 'outsourced_users');
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTerceirizados(data);
      setLoading(false);
    }, (e) => {
      console.error(e);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const fetchTerceirizados = async () => {
    // Deprecated in favor of the real-time effect above
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !login) return;
    
    setSaving(true);
    const safeLogin = login.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    try {
      await setDoc(doc(db, 'outsourced_users', safeLogin), cleanUndefined({
              login: safeLogin,
              name: name.toUpperCase(),
              customPassword: '000000',
              isOutsourced: true,
              obm: obm,
              // Configurações de acordo com o papel
              isRefeitorioAdmin: role === 'rancho',
              isAdmin: role === 'expediente',
              isEscalante: role === 'expediente',
              updatedAt: serverTimestamp()
            }), { merge: true });

      setIsModalOpen(false);
      setName('');
      setLogin('');
      fetchTerceirizados();
    } catch (err) {
      console.error('Erro ao criar terceirizado:', err);
      alert('Erro ao criar usuário.');
    } finally {
       setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteData) return;
    
    try {
      await deleteDoc(doc(db, 'outsourced_users', deleteData.id));
      setDeleteData(null);
      fetchTerceirizados();
    } catch (e) {
      console.error(e);
      alert('Erro ao excluir usuário.');
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-full bg-fuchsia-100 flex items-center justify-center">
             <Users className="w-5 h-5 text-fuchsia-600" />
           </div>
           <div>
             <h2 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Terceirizados</h2>
             <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Gestão de Contas Não Militares</p>
           </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-fuchsia-600 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-fuchsia-700 transition flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Perfil
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm min-h-[50vh]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-fuchsia-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Carregando Perfis...</span>
          </div>
        ) : terceirizados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-center">
            <Users className="w-12 h-12 mb-4 opacity-20" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 max-w-sm">Nenhum terceirizado cadastrado no sistema. Clique acima para adicionar.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {terceirizados.map(t => (
              <div key={t.id} className="border-2 border-slate-100 rounded-2xl p-5 relative group hover:border-fuchsia-100 transition-colors">
                 <button 
                   onClick={() => setDeleteData({ id: t.id, name: t.name })}
                   className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-100 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                   title="Remover Acesso"
                 >
                   <Trash2 className="w-4 h-4" />
                 </button>
                 
                 <div className="flex items-center gap-4 mb-4">
                   <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black text-sm">
                     {t.name.charAt(0)}
                   </div>
                   <div>
                     <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm leading-tight">{t.name}</h3>
                     <p className="text-[10px] text-fuchsia-500 font-bold uppercase tracking-widest">Login: {t.login} {t.obm ? `• ${t.obm}` : ''}</p>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                   {t.isRefeitorioAdmin ? (
                     <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-2 py-1 rounded-md">
                       <UtensilsCrossed className="w-3 h-3" /> Rancho / Aprovisionamento
                     </span>
                   ) : (
                     <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                       <Briefcase className="w-3 h-3" /> Expediente / Admin
                     </span>
                   )}
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
            >
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Criar Perfil Terceirizado</h3>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 border-l-2 border-fuchsia-300 pl-3">
                A senha padrão inicial para novos perfis será "000000".
              </p>
              
              <form onSubmit={handleCreate} className="space-y-5">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                       setName(e.target.value);
                       // Auto-sugere o login como o primeiro nome, sem espaços
                       if (!login || login === name.split(' ')[0]) {
                          setLogin(e.target.value.split(' ')[0].replace(/[^a-zA-Z]/g, ''));
                       }
                    }}
                    placeholder="Ex: Fernanda"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-fuchsia-400 focus:ring-0 transition-all text-sm font-bold text-slate-700 uppercase"
                  />
                </div>
                
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Login de Acesso</label>
                  <input
                    type="text"
                    required
                    value={login}
                    onChange={(e) => setLogin(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                    placeholder="Sem espaços"
                    className="w-full px-4 py-3 bg-fuchsia-50 border border-fuchsia-100 rounded-xl focus:border-fuchsia-400 focus:ring-0 transition-all text-sm font-bold text-fuchsia-800 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Lotação (OBM)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={obm}
                      onChange={(e) => setObm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-fuchsia-400 focus:ring-0 transition-all text-sm font-bold text-slate-700 uppercase appearance-none"
                    >
                      {Object.keys(OBM_HIERARCHY).map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Atribuição de Papel</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('rancho')}
                      className={`p-3 border-2 rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${role === 'rancho' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-100 text-slate-400 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      <UtensilsCrossed className="w-5 h-5" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Rancho</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('expediente')}
                      className={`p-3 border-2 rounded-xl flex flex-col items-center justify-center gap-2 transition-all ${role === 'expediente' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      <Briefcase className="w-5 h-5" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-center">Exp. / Admin</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-6 border-t border-slate-100 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-3 bg-fuchsia-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-fuchsia-700 transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                  >
                    {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                    Confirmar Criação
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {deleteData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Confirmar Exclusão</h3>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-8 leading-relaxed">
                Tem certeza que deseja remover o acesso de <span className="text-red-600 underline">{deleteData.name}</span>? Esta ação não pode ser desfeita.
              </p>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDeleteData(null)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition"
                >
                  Manter
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-700 transition shadow-md shadow-red-200"
                >
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
