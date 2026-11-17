import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Plus,
  Trash2,
  Loader2,
  UtensilsCrossed,
  Briefcase,
  MapPin,
  Mail,
  KeyRound,
  Edit2,
  RotateCcw,
  Check,
  X,
  Lock
} from 'lucide-react';
import { UserProfile } from '../types';
import { OBM_HIERARCHY } from '../constants';
import { cleanUndefined } from "../lib/utils";

export function TerceirizadosModule({ user, onBack }: { user: UserProfile, onBack: () => void }) {
  const [terceirizados, setTerceirizados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  
  // Formulário (Criação e Edição)
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [email, setEmail] = useState('');
  const [obm, setObm] = useState(Object.keys(OBM_HIERARCHY)[0] || '10º GBM');
  const [role, setRole] = useState<'rancho' | 'expediente'>('rancho');
  const [passwordMode, setPasswordMode] = useState<'keep' | 'default' | 'custom'>('default');
  const [customPasswordInput, setCustomPasswordInput] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteData, setDeleteData] = useState<{ id: string; name: string } | null>(null);
  const [resetConfirmProfile, setResetConfirmProfile] = useState<any | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!feedbackMessage) return;
    const timer = setTimeout(() => setFeedbackMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [feedbackMessage]);

  const fetchTerceirizados = async () => {
    try {
      const res = await fetch('/api/outsourced', { cache: 'no-store' });
      const data = await res.json();
      if (data?.success && Array.isArray(data.items)) {
        setTerceirizados(data.items);
        setLoading(false);
      }
    } catch {}
  };

  useEffect(() => {
    setLoading(true);
    fetchTerceirizados();
    const q = collection(db, 'outsourced_users');
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (data.length > 0) {
        setTerceirizados(data);
      }
      setLoading(false);
    }, (e) => {
      console.error(e);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingProfile(null);
    setName('');
    setLogin('');
    setEmail('');
    setObm(Object.keys(OBM_HIERARCHY)[0] || '10º GBM');
    setRole('rancho');
    setPasswordMode('default');
    setCustomPasswordInput('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (t: any) => {
    setEditingProfile(t);
    setName(t.name || '');
    setLogin(t.login || t.id || '');
    setEmail(t.email || '');
    setObm(t.obm || Object.keys(OBM_HIERARCHY)[0] || '10º GBM');
    setRole(t.isRefeitorioAdmin && !t.isAdmin ? 'rancho' : 'expediente');
    setPasswordMode('keep');
    setCustomPasswordInput('');
    setIsModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !login) return;

    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      alert('Informe um endereço de e-mail válido ou deixe o campo em branco.');
      return;
    }

    if (passwordMode === 'custom' && customPasswordInput.trim().length < 6) {
      alert('A senha personalizada deve ter no mínimo 6 caracteres.');
      return;
    }
    
    setSaving(true);
    const safeLogin = login.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const existing = editingProfile || terceirizados.find(t => t.id === safeLogin || t.login === safeLogin);

    let effectivePassword = existing?.customPassword || '000000';
    let hasCustomPassword = Boolean(existing?.hasCustomPassword && effectivePassword !== '000000');
    let mustChangePassword = Boolean(existing?.mustChangePassword);

    if (passwordMode === 'default') {
      effectivePassword = '000000';
      hasCustomPassword = false;
      mustChangePassword = true;
    } else if (passwordMode === 'custom') {
      effectivePassword = customPasswordInput.trim();
      hasCustomPassword = true;
      mustChangePassword = false;
    } else if (!existing) {
      effectivePassword = '000000';
      hasCustomPassword = false;
      mustChangePassword = true;
    }
    
    const payload = cleanUndefined({
      uid: safeLogin,
      rg: safeLogin,
      login: safeLogin,
      name: name.trim().toUpperCase(),
      warName: name.trim().toUpperCase(),
      email: cleanEmail,
      rank: 'CIVIL',
      ala: 'EXP',
      customPassword: effectivePassword,
      previousPassword: '000000',
      hasCustomPassword,
      mustChangePassword,
      isOutsourced: true,
      obm: obm,
      isRefeitorioAdmin: role === 'rancho',
      isAdmin: role === 'expediente',
      isEscalante: role === 'expediente',
    });

    try {
      await fetch('/api/outsourced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: safeLogin, data: payload }),
      }).catch(() => {});

      await setDoc(doc(db, 'outsourced_users', safeLogin), {
        ...payload,
        updatedAt: serverTimestamp(),
      }, { merge: true }).catch(() => {});

      setIsModalOpen(false);
      setEditingProfile(null);
      setFeedbackMessage(
        editingProfile
          ? `Dados de ${name.trim().toUpperCase()} atualizados com sucesso!`
          : `Perfil ${name.trim().toUpperCase()} criado com sucesso!`
      );
      fetchTerceirizados();
    } catch (err) {
      console.error('Erro ao salvar terceirizado:', err);
      alert('Erro ao salvar usuário.');
    } finally {
       setSaving(false);
    }
  };

  const handleConfirmResetPassword = async () => {
    if (!resetConfirmProfile) return;
    const t = resetConfirmProfile;
    const safeId = t.login || t.id;
    const payload = cleanUndefined({
      uid: safeId,
      rg: safeId,
      login: safeId,
      name: t.name || safeId,
      warName: t.warName || t.name || safeId,
      customPassword: '000000',
      previousPassword: '000000',
      hasCustomPassword: false,
      mustChangePassword: true,
      passwordChangedAt: Date.now(),
      isOutsourced: true,
    });

    try {
      await fetch('/api/outsourced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: safeId, data: payload }),
      }).catch(() => {});

      await setDoc(doc(db, 'outsourced_users', t.id), {
        ...payload,
        updatedAt: serverTimestamp(),
      }, { merge: true }).catch(() => {});

      setResetConfirmProfile(null);
      setFeedbackMessage(`Senha de ${t.name || safeId} redefinida para "000000"!`);
      fetchTerceirizados();
    } catch (e) {
      console.error('Erro ao resetar senha:', e);
      alert('Erro ao redefinir a senha.');
    }
  };

  const handleToggleRole = async (t: any) => {
    const nextIsExpediente = Boolean(t.isRefeitorioAdmin || !t.isAdmin);
    const safeId = t.login || t.id;
    const payload = cleanUndefined({
      uid: safeId,
      rg: safeId,
      login: safeId,
      name: t.name || safeId,
      warName: t.warName || t.name || safeId,
      rank: 'CIVIL',
      ala: 'EXP',
      isOutsourced: true,
      isRefeitorioAdmin: !nextIsExpediente,
      isAdmin: nextIsExpediente,
      isEscalante: nextIsExpediente,
    });
    try {
      await fetch('/api/outsourced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: safeId, data: payload }),
      }).catch(() => {});

      await setDoc(doc(db, 'outsourced_users', t.id), {
        ...payload,
        updatedAt: serverTimestamp(),
      }, { merge: true }).catch(() => {});

      setFeedbackMessage(`Papel de ${t.name || safeId} alterado para ${nextIsExpediente ? 'Expediente / Admin' : 'Rancho'}!`);
      fetchTerceirizados();
    } catch (e) {
      console.error('Erro ao atualizar papel do terceirizado:', e);
      alert('Erro ao atualizar permissões do perfil.');
    }
  };

  const handleDelete = async () => {
    if (!deleteData) return;
    
    try {
      await fetch(`/api/outsourced/${encodeURIComponent(deleteData.id)}`, {
        method: 'DELETE',
      }).catch(() => {});

      await deleteDoc(doc(db, 'outsourced_users', deleteData.id)).catch(() => {});
      setDeleteData(null);
      setFeedbackMessage(`Perfil ${deleteData.name} removido.`);
      fetchTerceirizados();
    } catch (e) {
      console.error(e);
      alert('Erro ao excluir usuário.');
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      {feedbackMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-7 h-7 rounded-xl bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold">{feedbackMessage}</p>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-full bg-fuchsia-100 flex items-center justify-center">
             <Users className="w-5 h-5 text-fuchsia-600" />
           </div>
           <div>
             <h2 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Terceirizados</h2>
             <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Gestão de Contas Não Militares, E-mail e Senhas</p>
           </div>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="bg-fuchsia-600 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-fuchsia-700 transition flex items-center gap-2 shadow-sm cursor-pointer"
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
            {terceirizados.map(t => {
              const isDefaultPass = !t.customPassword || t.customPassword === '000000' || !t.hasCustomPassword;
              return (
                <div key={t.id} className="border-2 border-slate-100 rounded-2xl p-5 relative group hover:border-fuchsia-200 transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-full bg-fuchsia-50 border border-fuchsia-100 flex items-center justify-center text-fuchsia-600 font-black text-sm shrink-0">
                          {(t.name || t.login || '?').charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm leading-tight truncate">{t.name}</h3>
                          <p className="text-[10px] text-fuchsia-600 font-bold uppercase tracking-widest mt-0.5">
                            Login: {t.login || t.id} {t.obm ? `• ${t.obm}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(t)}
                          className="p-2 text-slate-400 hover:text-fuchsia-600 hover:bg-fuchsia-50 rounded-xl transition-all cursor-pointer"
                          title="Editar informações, e-mail, OBM e senha"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setResetConfirmProfile(t)}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all cursor-pointer"
                          title="Resetar senha para o padrão (000000)"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => setDeleteData({ id: t.id, name: t.name })}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                          title="Remover Acesso"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Informações de E-mail e Senha */}
                    <div className="space-y-1.5 bg-slate-50 rounded-xl p-3 border border-slate-100 text-[10px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-bold text-slate-500 uppercase tracking-wider shrink-0">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          E-mail:
                        </span>
                        <span className={`font-bold truncate ${t.email ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                          {t.email || 'Não cadastrado'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-bold text-slate-500 uppercase tracking-wider shrink-0">
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          Senha:
                        </span>
                        <span className={`font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                          isDefaultPass
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isDefaultPass ? 'Padrão (000000)' : 'Pessoal Ativa'}
                        </span>
                      </div>
                    </div>
                  </div>
                   
                  <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-slate-100">
                    {t.isRefeitorioAdmin && !t.isAdmin ? (
                      <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-2 py-1 rounded-md">
                        <UtensilsCrossed className="w-3 h-3" /> Rancho / Aprovisionamento
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                        <Briefcase className="w-3 h-3" /> Expediente / Admin
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleRole(t)}
                        className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-fuchsia-600 px-2 py-1 rounded-md hover:bg-fuchsia-50 transition-colors cursor-pointer"
                        title="Alternar papel entre Rancho e Expediente/Admin"
                      >
                        Alternar Papel
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">
                {editingProfile ? 'Editar Perfil Terceirizado' : 'Criar Perfil Terceirizado'}
              </h3>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 border-l-2 border-fuchsia-300 pl-3">
                {editingProfile
                  ? `Gerencie nome, e-mail, lotação, papel e senha de ${editingProfile.login || editingProfile.id}.`
                  : 'A senha padrão inicial para novos perfis será "000000".'}
              </p>
              
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                       setName(e.target.value);
                       if (!editingProfile && (!login || login === name.split(' ')[0])) {
                          setLogin(e.target.value.split(' ')[0].replace(/[^a-zA-Z0-9]/g, ''));
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
                    disabled={!!editingProfile}
                    value={login}
                    onChange={(e) => setLogin(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                    placeholder="Sem espaços"
                    className="w-full px-4 py-3 bg-fuchsia-50 border border-fuchsia-100 rounded-xl focus:border-fuchsia-400 focus:ring-0 transition-all text-sm font-bold text-fuchsia-800 uppercase disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">E-mail de Recuperação / Contato</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="exemplo@email.com (opcional)"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-fuchsia-400 focus:ring-0 transition-all text-sm font-bold text-slate-700 lowercase"
                    />
                  </div>
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
                      className={`p-3 border-2 rounded-xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${role === 'rancho' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-100 text-slate-400 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      <UtensilsCrossed className="w-5 h-5" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Rancho</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('expediente')}
                      className={`p-3 border-2 rounded-xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${role === 'expediente' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      <Briefcase className="w-5 h-5" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-center">Exp. / Admin</span>
                    </button>
                  </div>
                </div>

                {/* Controle de Senha */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Senha de Acesso
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {editingProfile && (
                      <button
                        type="button"
                        onClick={() => setPasswordMode('keep')}
                        className={`px-3 py-2.5 rounded-xl border text-left text-[10px] font-black uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer ${
                          passwordMode === 'keep'
                            ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-800'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <span>Manter senha atual</span>
                        {passwordMode === 'keep' && <Check className="w-3.5 h-3.5 text-fuchsia-600" />}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setPasswordMode('default')}
                      className={`px-3 py-2.5 rounded-xl border text-left text-[10px] font-black uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer ${
                        passwordMode === 'default'
                          ? 'border-amber-500 bg-amber-50 text-amber-800'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5" />
                        {editingProfile ? 'Resetar para Senha Padrão ("000000")' : 'Usar Senha Padrão Inicial ("000000")'}
                      </span>
                      {passwordMode === 'default' && <Check className="w-3.5 h-3.5 text-amber-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPasswordMode('custom')}
                      className={`px-3 py-2.5 rounded-xl border text-left text-[10px] font-black uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer ${
                        passwordMode === 'custom'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5" />
                        Definir Nova Senha Manualmente
                      </span>
                      {passwordMode === 'custom' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </button>
                  </div>

                  {passwordMode === 'custom' && (
                    <div className="mt-2.5">
                      <input
                        type="text"
                        value={customPasswordInput}
                        onChange={(e) => setCustomPasswordInput(e.target.value)}
                        placeholder="Digite a nova senha (mín. 6 caracteres)"
                        className="w-full px-4 py-2.5 bg-indigo-50/50 border border-indigo-200 rounded-xl focus:border-indigo-500 focus:ring-0 transition-all text-xs font-bold text-slate-800"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingProfile(null);
                    }}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition text-center cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-3 bg-fuchsia-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-fuchsia-700 transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                    {editingProfile ? 'Salvar Alterações' : 'Confirmar Criação'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {resetConfirmProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Resetar Senha</h3>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 leading-relaxed">
                Deseja redefinir a senha de <span className="text-amber-700 underline">{resetConfirmProfile.name}</span> para a senha padrão inicial <span className="font-black text-slate-800">"000000"</span>?
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setResetConfirmProfile(null)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmResetPassword}
                  className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-amber-700 transition shadow-md cursor-pointer"
                >
                  Sim, Resetar
                </button>
              </div>
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
