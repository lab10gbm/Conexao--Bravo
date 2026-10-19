import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserPlus, 
  X, 
  Save, 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Building2, 
  Users, 
  Check,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';
import { useMilitars } from '../contexts/MilitarContext';
import { UserProfile } from '../types';
import { normalizeObm, normalizeRg, cleanUndefined } from '../lib/utils';
import { parseRank } from '../lib/rankUtils';
import { OBM_HIERARCHY } from '../constants';

interface AdicionarMilitarModalProps {
  isOpen: boolean;
  onClose: () => void;
  obmContext?: string;
  initialAla?: string;
  onSuccess?: (militar: UserProfile) => void;
}

const COMMON_RANKS = [
  'SD', 'CB', '3º SGT', '2º SGT', '1º SGT', 'SUBTEN',
  '2º TEN', '1º TEN', 'CAP', 'MAJ', 'TC', 'CEL'
];

const COSTA_VERDE_OBMS = [
  '10º GBM',
  '1/10',
  '2/10',
  '3/10',
  '4/10',
  '26º GBM',
  '1/26'
];

const COMMON_QUADROS = [
  'Q00/98', 'Q01/01', 'Q02/08', 'QOC/11', 'QOC/14', 'QOA', 'QOS', 'QOE'
];

export function AdicionarMilitarModal({
  isOpen,
  onClose,
  obmContext = '10º GBM',
  initialAla = '1',
  onSuccess
}: AdicionarMilitarModalProps) {
  const { militars, addOrUpdateMilitar, refreshMilitars } = useMilitars();

  const [rg, setRg] = useState('');
  const [name, setName] = useState('');
  const [warName, setWarName] = useState('');
  const [rank, setRank] = useState('SD');
  const [quadro, setQuadro] = useState('Q00/98');
  const [idFuncional, setIdFuncional] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [obm, setObm] = useState(() => normalizeObm(obmContext) || '10º GBM');
  const [ala, setAla] = useState(() => initialAla || '1');
  const [situacao, setSituacao] = useState('ATIVO');
  
  // Contato & Localização
  const [cel, setCel] = useState('');
  const [tel, setTel] = useState('');
  const [email, setEmail] = useState('');
  const [cidade, setCidade] = useState('');
  const [endereco, setEndereco] = useState('');
  
  // Opção para registrar no padrão do servidor
  const [saveToDefaultAlas, setSaveToDefaultAlas] = useState(true);
  
  // Estados de controle
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  // Redefinir valores quando o modal é aberto
  useEffect(() => {
    if (isOpen) {
      setRg('');
      setName('');
      setWarName('');
      setRank('SD');
      setQuadro('Q00/98');
      setIdFuncional('');
      setNascimento('');
      setObm(normalizeObm(obmContext) || '10º GBM');
      setAla(initialAla || '1');
      setSituacao('ATIVO');
      setCel('');
      setTel('');
      setEmail('');
      setCidade('');
      setEndereco('');
      setSaveToDefaultAlas(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      setShowOptionalFields(false);
    }
  }, [isOpen, obmContext, initialAla]);

  // Verificar se o RG digitado já existe no banco de dados
  const existingMilitar = useMemo(() => {
    const clean = normalizeRg(rg);
    if (!clean || clean.length < 3) return null;
    return militars.find(m => normalizeRg(m.rg) === clean) || null;
  }, [rg, militars]);

  // Auto-preencher nome de guerra quando o nome completo for digitado
  const handleNameBlur = () => {
    if (!warName && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length > 0) {
        setWarName(parts[parts.length - 1].toUpperCase());
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanRg = normalizeRg(rg);
    if (!cleanRg) {
      setErrorMessage('Por favor, informe o RG do militar.');
      return;
    }

    if (!name.trim()) {
      setErrorMessage('Por favor, informe o Nome Completo.');
      return;
    }

    setIsSubmitting(true);

    try {
      const resolvedWarName = (warName.trim() || name.trim().split(/\s+/).pop() || name.trim()).toUpperCase();
      const resolvedRank = rank.trim().toUpperCase() || 'SD';
      const resolvedObm = normalizeObm(obm || obmContext || '10º GBM');
      const resolvedAla = ala ? ala.toString().trim() : '1';

      const militarData: Partial<UserProfile> & { rg: string } = {
        rg: cleanRg,
        name: name.trim().toUpperCase(),
        warName: resolvedWarName,
        rank: resolvedRank,
        quadro: quadro.trim().toUpperCase(),
        idFuncional: idFuncional.trim(),
        nascimento: nascimento.trim(),
        obm: resolvedObm,
        ala: resolvedAla,
        situacao: (situacao || 'ATIVO').toUpperCase(),
        cel: cel.trim(),
        tel: tel.trim(),
        email: email.trim().toLowerCase(),
        cidade: cidade.trim().toUpperCase(),
        endereco: endereco.trim().toUpperCase(),
        updatedAt: new Date().toISOString()
      };

      // 1. Salva no banco de dados (Firestore e Cache do Servidor via addOrUpdateMilitar)
      const success = await addOrUpdateMilitar(militarData);

      if (!success) {
        throw new Error('Falha ao comunicar com o servidor para salvar o militar.');
      }

      // 2. Se a opção de padrão das alas estiver ativa, sincroniza também na rota do padrão
      if (saveToDefaultAlas && resolvedAla) {
        try {
          const token = (await import('../lib/firebase')).auth.currentUser 
            ? await (await import('../lib/firebase')).auth.currentUser?.getIdToken() 
            : '';
          
          await fetch('/api/militar/update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-rg': cleanRg,
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              rg: cleanRg,
              data: {
                ...militarData,
                saveToDefaultAlas: true
              }
            })
          });
        } catch (syncErr) {
          console.warn('[AdicionarMilitarModal] Aviso ao sincronizar com padrão:', syncErr);
        }
      }

      await refreshMilitars();

      setSuccessMessage(
        `Militar ${parseRank(resolvedRank)} ${resolvedWarName} (RG: ${cleanRg}) adicionado com sucesso ao servidor!`
      );

      if (onSuccess) {
        onSuccess(militarData as UserProfile);
      }

      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error('[AdicionarMilitarModal] Erro ao cadastrar:', err);
      setErrorMessage(err.message || 'Erro inesperado ao salvar militar no servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        >
          {/* Header do Modal */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center shadow-inner">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black uppercase tracking-tight flex items-center gap-2">
                  Adicionar Militar ao Banco de Dados
                  <span className="text-[9px] font-bold bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30 uppercase tracking-widest">
                    Servidor & DB
                  </span>
                </h2>
                <p className="text-[11px] text-slate-300 font-medium">
                  Cadastro definitivo no servidor sem precisar ir em Gestão do Efetivo.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feedback Banners */}
          {errorMessage && (
            <div className="bg-rose-50 border-b border-rose-200 px-5 py-3 text-rose-800 text-xs font-bold flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-3 text-emerald-800 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Alerta de militar existente */}
          {existingMilitar && (
            <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 text-amber-900 text-xs font-medium flex items-center gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Atenção:</strong> RG <strong>{normalizeRg(rg)}</strong> já cadastrado para{' '}
                <strong>{parseRank(existingMilitar.rank)} {existingMilitar.warName || existingMilitar.name}</strong>{' '}
                ({existingMilitar.obm} - Ala {existingMilitar.ala || 'S/A'}). Salvar irá atualizar seus dados.
              </span>
            </div>
          )}

          {/* Formulário com Scroll Suave */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
            {/* Bloco 1: Identificação Básica */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  1. Identificação Principal
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">* Campos obrigatórios</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Campo RG */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    RG Militar *
                  </label>
                  <input
                    type="text"
                    required
                    value={rg}
                    onChange={(e) => setRg(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
                    placeholder="Ex: 54444"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-xl text-xs font-bold text-slate-900 outline-none transition-all uppercase placeholder:normal-case"
                  />
                </div>

                {/* Campo Posto / Graduação */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Posto / Graduação *
                  </label>
                  <select
                    value={rank}
                    onChange={(e) => setRank(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-xl text-xs font-bold text-slate-900 outline-none transition-all cursor-pointer uppercase"
                  >
                    {COMMON_RANKS.map(r => (
                      <option key={r} value={r}>{parseRank(r)} ({r})</option>
                    ))}
                    <option value="CEL">Coronel (CEL)</option>
                    <option value="TC">Tenente Coronel (TC)</option>
                    <option value="MAJ">Major (MAJ)</option>
                    <option value="CAP">Capitão (CAP)</option>
                    <option value="1º TEN">1º Tenente (1º TEN)</option>
                    <option value="2º TEN">2º Tenente (2º TEN)</option>
                    <option value="ASP">Aspirante (ASP)</option>
                    <option value="SUBTEN">Subtenente (SUBTEN)</option>
                    <option value="1º SGT">1º Sargento (1º SGT)</option>
                    <option value="2º SGT">2º Sargento (2º SGT)</option>
                    <option value="3º SGT">3º Sargento (3º SGT)</option>
                    <option value="CB">Cabo (CB)</option>
                    <option value="SD">Soldado (SD)</option>
                  </select>
                </div>

                {/* Campo Quadro */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Quadro
                  </label>
                  <input
                    type="text"
                    value={quadro}
                    onChange={(e) => setQuadro(e.target.value)}
                    list="modal-quadros-list"
                    placeholder="Ex: Q00/98"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-xl text-xs font-bold text-slate-900 outline-none transition-all uppercase"
                  />
                  <datalist id="modal-quadros-list">
                    {COMMON_QUADROS.map(q => <option key={q} value={q} />)}
                  </datalist>
                </div>

                {/* Campo Nome Completo */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleNameBlur}
                    placeholder="Ex: SILVIO SANTOS DE OLIVEIRA"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-xl text-xs font-bold text-slate-900 outline-none transition-all uppercase placeholder:normal-case"
                  />
                </div>

                {/* Campo Nome de Guerra */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Nome de Guerra
                  </label>
                  <input
                    type="text"
                    value={warName}
                    onChange={(e) => setWarName(e.target.value)}
                    placeholder="Ex: SILVIO"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:bg-white rounded-xl text-xs font-bold text-slate-900 outline-none transition-all uppercase placeholder:normal-case"
                  />
                </div>
              </div>
            </div>

            {/* Bloco 2: Alocação Operacional & OBM */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  2. Alocação Operacional
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* OBM Principal */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    OBM Principal
                  </label>
                  <select
                    value={obm}
                    onChange={(e) => setObm(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl text-xs font-bold text-slate-900 outline-none transition-all cursor-pointer uppercase"
                  >
                    {COSTA_VERDE_OBMS.map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                    <option value="CBA VII">CBA VII (Costa Verde)</option>
                    <option value="TERCEIRIZADOS">TERCEIRIZADOS</option>
                  </select>
                </div>

                {/* Ala / Escala */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Ala / Escala
                  </label>
                  <select
                    value={ala}
                    onChange={(e) => setAla(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl text-xs font-bold text-slate-900 outline-none transition-all cursor-pointer uppercase font-mono"
                  >
                    <option value="1">Ala 1</option>
                    <option value="2">Ala 2</option>
                    <option value="3">Ala 3</option>
                    <option value="4">Ala 4</option>
                    <option value="EXP">EXP (Expediente Administrativo)</option>
                    <option value="">Sem Ala (Aguardando Alocação)</option>
                  </select>
                </div>

                {/* Situação Militar */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    Situação
                  </label>
                  <select
                    value={situacao}
                    onChange={(e) => setSituacao(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl text-xs font-bold text-slate-900 outline-none transition-all cursor-pointer uppercase"
                  >
                    <option value="ATIVO">ATIVO (Pronto para Serviço)</option>
                    <option value="FÉRIAS">FÉRIAS</option>
                    <option value="LICENÇA">LICENÇA</option>
                    <option value="DISPENSA">DISPENSA</option>
                    <option value="CURSO">CURSO</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bloco 3: Opção para expandir campos complementares */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowOptionalFields(!showOptionalFields)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer select-none transition-colors"
              >
                <span>{showOptionalFields ? '- Ocultar Contatos e Documentos' : '+ Adicionar Contatos, ID Funcional e Endereço (Opcional)'}</span>
              </button>

              {showOptionalFields && (
                <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      ID Funcional
                    </label>
                    <input
                      type="text"
                      value={idFuncional}
                      onChange={(e) => setIdFuncional(e.target.value)}
                      placeholder="Ex: 12345678"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      Data de Nascimento
                    </label>
                    <input
                      type="text"
                      value={nascimento}
                      onChange={(e) => setNascimento(e.target.value)}
                      placeholder="DD/MM/AAAA"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      Celular / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={cel}
                      onChange={(e) => setCel(e.target.value)}
                      placeholder="(24) 99999-9999"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      Telefone Fixo
                    </label>
                    <input
                      type="text"
                      value={tel}
                      onChange={(e) => setTel(e.target.value)}
                      placeholder="(24) 3365-0000"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="militar@cbmerj.rj.gov.br"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      Cidade
                    </label>
                    <input
                      type="text"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      placeholder="Angra dos Reis"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none uppercase"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      Endereço
                    </label>
                    <input
                      type="text"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      placeholder="Rua, número, bairro..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none uppercase"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Checkbox de Padrão do Servidor */}
            <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-200/80 flex items-start gap-3">
              <input
                type="checkbox"
                id="check-save-default"
                checked={saveToDefaultAlas}
                onChange={(e) => setSaveToDefaultAlas(e.target.checked)}
                className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="check-save-default" className="text-xs text-slate-700 cursor-pointer select-none">
                <span className="font-bold text-indigo-950 block">
                  Gravar definitivamente na Composição Padrão Oficial do Servidor
                </span>
                <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
                  Salva no banco de dados, no Firestore e no arquivo de contingência do servidor, garantindo que o militar não suma mesmo se o padrão oficial for restaurado.
                </span>
              </label>
            </div>
          </form>

          {/* Footer do Modal */}
          <div className="bg-slate-50 border-t border-slate-200 px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-200/80 transition-all cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando no Servidor...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Adicionar ao Servidor</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default AdicionarMilitarModal;
