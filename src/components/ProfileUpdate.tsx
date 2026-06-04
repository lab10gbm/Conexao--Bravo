import React, { useState } from 'react';
import { UserProfile } from '../types';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Save, UserCircle2, Phone, MapPin, Building, Lock } from 'lucide-react';
import { RankInsignia } from './RankInsignia';
import { cleanUndefined } from "../lib/utils";

interface ProfileUpdateProps {
  user: UserProfile;
  onUpdate: (user: UserProfile) => void;
  onBack: () => void;
}

export function ProfileUpdate({ user, onUpdate, onBack }: ProfileUpdateProps) {
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    tel: user.tel || '',
    cel: user.cel || '',
    cel2: user.cel2 || '',
    endereco: user.endereco || '',
    cidade: user.cidade || '',
    email: user.email || '',
    email2: user.email2 || '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      if (!user.rg) throw new Error('Usuário sem RG cadastrado. Contate o administrador.');
      
      const updatePayload = {
        ...formData,
        lastProfileUpdate: Date.now()
      };
      const userRef = doc(db, 'militaries', user.rg.toString());
      await updateDoc(userRef, cleanUndefined(updatePayload));
      
      onUpdate({ ...user, ...updatePayload });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao atualizar dados: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess(false);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('A nova senha e a confirmação não coincidem.');
      setPasswordLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres.');
      setPasswordLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rg: user.rg,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Erro ao alterar senha.');
      }
      setPasswordSuccess(true);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-3 mb-8">
        <UserCircle2 className="w-6 h-6 text-indigo-600" />
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Atualização Cadastral</h2>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-8 flex items-center gap-6 border-b-4 border-indigo-500">
          <RankInsignia rankStr={user.rank} className="scale-[2.5] origin-left drop-shadow-md" />
          <div className="flex flex-col ml-12">
            <span className="text-sm font-black uppercase tracking-widest text-indigo-300 mb-0.5">
              {user.rank}
            </span>
            <h3 className="text-2xl font-black uppercase tracking-tighter text-white">
              {user.warName || (user.name || '').split(' ')[0]}
            </h3>
            <div className="flex gap-3 mt-2">
              <span className="bg-white/10 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest text-indigo-100">
                RG: {user.rg}
              </span>
              <span className="bg-white/10 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest text-indigo-100">
                {user.obm || '10º GBM'}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
           {error && (
             <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-xs font-bold uppercase tracking-wider border border-red-200">
               {error}
             </div>
           )}
           {success && (
             <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl mb-6 text-xs font-bold uppercase tracking-wider border border-emerald-200">
               Dados atualizados com sucesso!
             </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-4">
                 <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-tighter border-b border-slate-100 pb-2">
                   <Phone className="w-4 h-4 text-indigo-600" /> Contato
                 </h4>
                 
                 <div className="space-y-1">
                   <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Celular Principal / WhatsApp</label>
                   <input
                     type="text"
                     name="cel"
                     value={formData.cel}
                     onChange={handleChange}
                     placeholder="(XX) XXXXX-XXXX"
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                   />
                 </div>
                 
                 <div className="space-y-1">
                   <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Celular Secundário</label>
                   <input
                     type="text"
                     name="cel2"
                     value={formData.cel2}
                     onChange={handleChange}
                     placeholder="(XX) XXXXX-XXXX"
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                   />
                 </div>
                 
                 <div className="space-y-1">
                   <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Telefone Fixo (Opcional)</label>
                   <input
                     type="text"
                     name="tel"
                     value={formData.tel}
                     onChange={handleChange}
                     placeholder="(XX) XXXX-XXXX"
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                   />
                 </div>

                 <div className="space-y-1">
                   <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center justify-between">
                     Email (Google)
                   </label>
                   <input
                     type="email"
                     name="email"
                     value={formData.email}
                     onChange={handleChange}
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                   />
                 </div>

                 <div className="space-y-1">
                   <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Email Alternativo</label>
                   <input
                     type="email"
                     name="email2"
                     value={formData.email2}
                     onChange={handleChange}
                     placeholder="seu.email@exemplo.com"
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                   />
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-tighter border-b border-slate-100 pb-2">
                   <MapPin className="w-4 h-4 text-indigo-600" /> Endereço
                 </h4>
                 
                 <div className="space-y-1">
                   <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Endereço Completo</label>
                   <input
                     type="text"
                     name="endereco"
                     value={formData.endereco}
                     onChange={handleChange}
                     placeholder="Rua, Número, Complemento, Bairro"
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                   />
                 </div>

                 <div className="space-y-1">
                   <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Cidade</label>
                   <input
                     type="text"
                     name="cidade"
                     value={formData.cidade}
                     onChange={handleChange}
                     placeholder="Ex: Angra dos Reis, Rio Claro..."
                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                   />
                 </div>
              </div>

           </div>

           <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
             <div className="w-full sm:w-auto text-left">
               {user.lastProfileUpdate && (
                 <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                   <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                   Última atualização: {new Date(user.lastProfileUpdate).toLocaleDateString('pt-BR')} às {new Date(user.lastProfileUpdate).toLocaleTimeString('pt-BR')}
                 </p>
               )}
             </div>
             <div className="flex gap-3 w-full sm:w-auto">
               <button
                 type="button"
                 onClick={onBack}
                 className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-slate-600 font-bold uppercase tracking-widest text-xs hover:bg-slate-100 transition-colors"
               >
                 Voltar
               </button>
               <button
                 type="submit"
                 disabled={loading}
                 className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-indigo-600 text-white font-black uppercase tracking-widest text-xs hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
               >
                 {loading ? 'Salvando...' : (
                   <>
                     <Save className="w-4 h-4" />
                     Salvar e Confirmar Dados
                   </>
                 )}
               </button>
             </div>
           </div>
        </form>

        <form onSubmit={handlePasswordSubmit} className="p-8 border-t-8 border-slate-50 bg-slate-50/50">
           {passwordError && (
             <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-xs font-bold uppercase tracking-wider border border-red-200">
               {passwordError}
             </div>
           )}
           {passwordSuccess && (
             <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl mb-6 text-xs font-bold uppercase tracking-wider border border-emerald-200">
               Senha alterada com sucesso!
             </div>
           )}

           <div className="space-y-6">
              <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-tighter border-b border-slate-200 pb-2">
                <Lock className="w-4 h-4 text-indigo-600" /> Segurança (Alterar Senha)
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="space-y-1">
                   <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Senha Atual</label>
                   <input
                     type="password"
                     name="currentPassword"
                     required
                     value={passwordData.currentPassword}
                     onChange={handlePasswordChange}
                     placeholder="Senha atual"
                     className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                   />
                 </div>
                 
                 <div className="space-y-1">
                   <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Nova Senha</label>
                   <input
                     type="password"
                     name="newPassword"
                     required
                     value={passwordData.newPassword}
                     onChange={handlePasswordChange}
                     placeholder="Mínimo 6 caracteres"
                     className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                   />
                 </div>
                 
                 <div className="space-y-1">
                   <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Confirmar Senha</label>
                   <input
                     type="password"
                     name="confirmPassword"
                     required
                     value={passwordData.confirmPassword}
                     onChange={handlePasswordChange}
                     placeholder="Digite novamente"
                     className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                   />
                 </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-6 py-3 rounded-xl bg-slate-800 text-white font-black uppercase tracking-widest text-xs hover:bg-black shadow-md shadow-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {passwordLoading ? 'Alterando...' : 'Alterar Senha'}
                </button>
              </div>
           </div>
        </form>
      </div>
    </div>
  );
}
