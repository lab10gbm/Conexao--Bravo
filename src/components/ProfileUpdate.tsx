import React, { useState } from 'react';
import { UserProfile } from '../types';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Save, UserCircle2, Phone, MapPin, Building, Lock, Calendar, Award, Shield, Briefcase, UserCheck, Settings2, Trash2 } from 'lucide-react';
import { RankInsignia } from './RankInsignia';
import { cleanUndefined } from "../lib/utils";
import { TagInput } from './TagInput';

interface ProfileUpdateProps {
  user: UserProfile;
  onUpdate: (user: UserProfile) => void;
  onBack: () => void;
}

export function ProfileUpdate({ user, onUpdate, onBack }: ProfileUpdateProps) {
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: user.name || '',
    warName: user.warName || '',
    rank: user.rank || '',
    rg: user.rg || '',
    ala: user.ala || '',
    quadro: user.quadro || '',
    idFuncional: user.idFuncional || (user as any).id_funcional || '',
    cel: user.cel || '',
    cel2: user.cel2 || '',
    tel: user.tel || '',
    endereco: user.endereco || '',
    cidade: user.cidade || '',
    email: user.email || '',
    email2: user.email2 || '',
    nascimento: user.nascimento || (user as any).birthDate || '',
    promotionDate: user.promotionDate || (user as any).ultimaPromocao || '',
    cursos: user.cursos || '',
    specializations: user.specializations || [],
    obm: user.obm || '',
    // Funções
    ativoCondutor: user.ativoCondutor || false,
    ativoEncarregado: user.ativoEncarregado || false,
    ativoAbastecedor: user.ativoAbastecedor || false,
    ativoChefeGua: user.ativoChefeGua || false,
    ativoMaritimo: user.ativoMaritimo || false,
    ativoEnfermeiro: user.ativoEnfermeiro || false,
    ativoComunicante: user.ativoComunicante || false,
    ativoGraduado: user.ativoGraduado || false,
    ativoCbsSds: user.ativoCbsSds || false,
    adjunto: user.adjunto || false,
    sgtDia: user.sgtDia || false,
    cmtGuarda: user.cmtGuarda || false,
    cbGuarda: user.cbGuarda || false,
    cbDia: user.cbDia || false,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Sync formData with prop updates (e.g. when App.tsx refreshes profile from Firestore)
  React.useEffect(() => {
    setFormData(prev => ({
      ...prev,
      name: user.name || prev.name,
      warName: user.warName || prev.warName,
      rank: user.rank || prev.rank,
      rg: user.rg || prev.rg,
      ala: user.ala || prev.ala,
      quadro: user.quadro || (user as any).QUADRO || prev.quadro,
      idFuncional: user.idFuncional || (user as any).id_funcional || (user as any).ID_FUNCIONAL || prev.idFuncional,
      nascimento: user.nascimento || (user as any).birthDate || (user as any).NASCIMENTO || prev.nascimento,
      promotionDate: user.promotionDate || (user as any).ultimaPromocao || (user as any).PROMOTED || prev.promotionDate,
      obm: user.obm || prev.obm,
      email: user.email || prev.email,
      cel: user.cel || prev.cel,
      endereco: user.endereco || prev.endereco,
      cidade: user.cidade || prev.cidade,
    }));
  }, [user]);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData({ ...formData, [name]: checkbox.checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSpecializationsChange = (value: string) => {
    setFormData({ ...formData, specializations: value.split(',').map(s => s.trim()).filter(Boolean) });
  };

  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'Não informado';
    
    // Handle Firestore Timestamp object
    if (typeof dateValue === 'object' && dateValue.seconds) {
      return new Date(dateValue.seconds * 1000).toLocaleDateString('pt-BR');
    }

    // Handle number (timestamp)
    if (typeof dateValue === 'number') {
      return new Date(dateValue).toLocaleDateString('pt-BR');
    }

    if (typeof dateValue === 'string') {
      // If already in DD/MM/YYYY or D/M/YYYY format, return as is
      if (dateValue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) return dateValue;

      // Handle ISO format YYYY-MM-DD or YYYY-M-D
      if (dateValue.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
        const [year, month, day] = dateValue.split('-');
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      }

      // Fallback to native Date parsing if it looks like a date string
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('pt-BR');
      }
    }

    return dateValue.toString();
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
      
      const response = await fetch('/api/militar/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rg: user.rg,
          data: updatePayload
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Erro ao sincronizar com o servidor');
      
      onUpdate({ ...user, ...updatePayload } as UserProfile);
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
    <div className="max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700 pt-10">
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

        <form onSubmit={handleSubmit} className="p-8 space-y-12">
           {error && (
             <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold uppercase tracking-wider border border-red-200">
               {error}
             </div>
           )}
           {success && (
             <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-xs font-bold uppercase tracking-wider border border-emerald-200">
               Dados atualizados com sucesso!
             </div>
           )}

           {/* SECTION 1: IDENTIFICAÇÃO E DADOS BÁSICOS */}
           <div className="space-y-6">
              <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-tighter border-b border-slate-100 pb-2">
                <UserCircle2 className="w-4 h-4 text-indigo-600" /> Identificação e Dados Básicos (Apenas Leitura)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Nome Completo
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Nome de Guerra
                  </label>
                  <input
                    type="text"
                    name="warName"
                    value={formData.warName}
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> RG (Militar)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.rg}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Posto/Graduação
                  </label>
                  <input
                    type="text"
                    name="rank"
                    value={formData.rank}
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> ID Funcional
                  </label>
                  <input
                    type="text"
                    name="idFuncional"
                    value={formData.idFuncional}
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Data de Nascimento
                  </label>
                  <input
                    type="text"
                    name="nascimento"
                    value={formatDate(formData.nascimento)}
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Quadro
                  </label>
                  <input
                    type="text"
                    name="quadro"
                    value={formData.quadro}
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Última Promoção
                  </label>
                  <input
                    type="text"
                    name="promotionDate"
                    value={formatDate(formData.promotionDate)}
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase py-2 px-3 bg-slate-50 rounded-lg flex items-center gap-2">
                <Shield className="w-3 h-3 text-slate-400" /> Estes dados são oficiais do cadastro e só podem ser alterados pelo setor de pessoal ou administrador.
              </p>
           </div>

           {/* SECTION 2: CARREIRA E LOTAÇÃO */}
           <div className="space-y-6">
              <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-tighter border-b border-slate-100 pb-2">
                <Building className="w-4 h-4 text-indigo-600" /> Carreira e Lotação (Apenas Leitura)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Ala (Escala)
                  </label>
                  <input
                    type="text"
                    name="ala"
                    value={formData.ala === 'EXP' ? 'EXPEDIENTE' : formData.ala ? `${formData.ala}ª ALA` : 'Não informada'}
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Unidade (OBM)
                  </label>
                  <input
                    type="text"
                    name="obm"
                    value={formData.obm || '10º GBM'}
                    readOnly
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>
              </div>
           </div>

           {/* SECTION 3: CONTATO E LOCALIZAÇÃO */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                 <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-tighter border-b border-slate-100 pb-2">
                   <Phone className="w-4 h-4 text-indigo-600" /> Contato
                 </h4>
                 
                 <div className="space-y-4">
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
                     <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Email (Google Login)</label>
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
              </div>

              <div className="space-y-6">
                 <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-tighter border-b border-slate-100 pb-2">
                   <MapPin className="w-4 h-4 text-indigo-600" /> Endereço Residencial
                 </h4>
                 
                 <div className="space-y-4">
                   <div className="space-y-1">
                     <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Endereço Completo</label>
                     <textarea
                       name="endereco"
                       value={formData.endereco}
                       onChange={handleChange}
                       rows={3}
                       placeholder="Rua, Número, Complemento, Bairro"
                       className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
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
           </div>

           {/* SECTION 4: QUALIFICAÇÃO E ESPECIALIDADES */}
           <div className="space-y-6">
              <h4 className="flex items-center gap-2 text-sm font-black text-slate-800 uppercase tracking-tighter border-b border-slate-100 pb-2">
                <Award className="w-4 h-4 text-indigo-600" /> Qualificações Profissionais
              </h4>
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Especialidades (Tags)</label>
                  <TagInput
                    value={(formData.specializations || []).join(', ')}
                    onChange={handleSpecializationsChange}
                    placeholder="Adicione especialidades (Ex: MERGULHO, SALVAMENTO, COMBATE A INCÊNDIO)"
                  />
                  <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">Pressione Enter ou vírgula para adicionar cada tag</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Cursos e Observações Profissionais</label>
                  <textarea
                    name="cursos"
                    value={formData.cursos}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Descreva cursos realizados, certificados e outras informações relevantes para sua escala."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
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
                 Cancelar
               </button>
               <button
                 type="submit"
                 disabled={loading}
                 className="flex-1 sm:flex-none px-10 py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest text-xs hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
               >
                 {loading ? 'Processando...' : (
                   <>
                     <Save className="w-5 h-5" />
                     Salvar e Confirmar Todos os Dados
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
