import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, AlertCircle, Send, Key, Server, Shield, HelpCircle, Eye, EyeOff, Save, RefreshCw } from 'lucide-react';

interface SmtpStatus {
  configured: boolean;
  source: 'env' | 'firestore' | 'none';
  host: string;
  port: number;
  secure: boolean;
  user: string;
  rawUser: string;
  from: string;
  appUrl: string;
}

export function EmailSmtpConfigCard() {
  const [status, setStatus] = useState<SmtpStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; text: string } | null>(null);

  const [formData, setFormData] = useState({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    from: '"Portal CBMERJ" <no-reply@cbmerj.rj.gov.br>',
    appUrl: window.location.origin,
    testEmail: '',
  });

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/admin/smtp');
      const data = await res.json();
      setStatus(data);
      if (data.configured) {
        setFormData((prev) => ({
          ...prev,
          host: data.host || prev.host,
          port: data.port || prev.port,
          secure: data.secure !== undefined ? data.secure : prev.secure,
          user: data.rawUser || prev.user,
          from: data.from || prev.from,
          appUrl: data.appUrl || prev.appUrl,
          testEmail: prev.testEmail || data.rawUser || '',
        }));
      }
    } catch (e) {
      console.error('Failed to load SMTP status', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: formData.host,
          port: Number(formData.port),
          secure: formData.secure,
          user: formData.user,
          pass: formData.pass,
          from: formData.from,
          appUrl: formData.appUrl,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'Configurações de SMTP salvas com sucesso no banco de dados!' });
        await loadStatus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao salvar configurações de SMTP.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Erro de conexão com o servidor ao salvar.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    const dest = formData.testEmail.trim() || formData.user.trim();
    if (!dest || !dest.includes('@')) {
      setTestResult({
        success: false,
        text: 'Por favor, informe um endereço de e-mail de destino válido para testar o envio.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/smtp-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEmail: dest,
          host: formData.host,
          port: Number(formData.port),
          secure: formData.secure,
          user: formData.user,
          pass: formData.pass,
          from: formData.from,
        }),
      });

      const data = await res.json();
      setTestResult({
        success: !!data.success,
        text: data.message || (data.success ? 'E-mail de teste enviado com sucesso!' : 'Falha no teste.'),
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        text: 'Erro de comunicação ao disparar o teste de e-mail.',
      });
    } finally {
      setTesting(false);
    }
  };

  const applyGmailDefaults = () => {
    setFormData((prev) => ({
      ...prev,
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      from: prev.user ? `"Portal CBMERJ" <${prev.user}>` : prev.from,
    }));
  };

  const applyOutlookDefaults = () => {
    setFormData((prev) => ({
      ...prev,
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      from: prev.user ? `"Portal CBMERJ" <${prev.user}>` : prev.from,
    }));
  };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-xl p-6 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center border border-red-200 shadow-sm shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              Envio de E-mails e Recuperação de Senha (SMTP)
              {status?.configured ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Ativo ({status.source === 'env' ? 'Variáveis de Ambiente' : 'Configurado'})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-300">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  Modo de Demonstração (Não configurado)
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Permite o envio automático de códigos e links de recuperação de senha diretamente para o e-mail cadastrado de cada militar.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="text-xs font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-800 flex items-center gap-1 self-start sm:self-auto px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
        >
          <HelpCircle className="w-4 h-4" />
          {showGuide ? 'Ocultar Guia Gmail' : 'Como Gerar Senha de App'}
        </button>
      </div>

      {showGuide && (
        <div className="mt-5 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl text-xs text-slate-700 space-y-3">
          <div className="font-black uppercase tracking-wider text-blue-900 flex items-center gap-2 text-sm">
            <Key className="w-4 h-4 text-blue-600" />
            Passo a Passo: Como usar o Gmail (Gratuito e Imediato)
          </div>
          <p className="text-slate-600 leading-relaxed">
            O Google não aceita sua senha pessoal comum para envios automatizados por segurança. Ele exige uma <strong>Senha de Aplicativo (App Password)</strong> de 16 caracteres. Veja como criar:
          </p>
          <ol className="list-decimal list-inside space-y-2 font-medium text-slate-700">
            <li>
              Acesse sua conta Google em <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-blue-700 font-bold underline">myaccount.google.com/security</a>.
            </li>
            <li>
              Certifique-se de que a <strong>"Verificação em duas etapas"</strong> esteja ativada na sua conta.
            </li>
            <li>
              Na barra de pesquisa da Conta Google (no topo), digite <strong>"Senhas de app"</strong> (ou acesse diretamente <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-blue-700 font-bold underline">myaccount.google.com/apppasswords</a>).
            </li>
            <li>
              Em <strong>"Nome do app"</strong>, digite <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-bold">Portal CBMERJ</code> e clique em <strong>Criar</strong>.
            </li>
            <li>
              O Google exibirá um código de 16 letras amarelas (ex: <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-blue-900">abcd efgh ijkl mnop</code>).
            </li>
            <li>
              Copie esse código de 16 letras e cole no campo <strong>"Senha de Aplicativo"</strong> abaixo (sem espaços).
            </li>
          </ol>
        </div>
      )}

      {message && (
        <div
          className={`mt-4 p-4 rounded-lg text-xs font-bold uppercase tracking-tight text-center ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="mt-6 space-y-5">
        <div className="flex flex-wrap gap-2 mb-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center mr-2">
            Preenchimento Rápido:
          </span>
          <button
            type="button"
            onClick={applyGmailDefaults}
            className="text-[10px] font-black uppercase px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors border border-slate-300"
          >
            Usar Padrão Gmail
          </button>
          <button
            type="button"
            onClick={applyOutlookDefaults}
            className="text-[10px] font-black uppercase px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors border border-slate-300"
          >
            Usar Padrão Outlook / Hotmail
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
              Servidor SMTP (Host)
            </label>
            <input
              type="text"
              required
              placeholder="smtp.gmail.com"
              value={formData.host}
              onChange={(e) => setFormData({ ...formData, host: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded font-mono text-xs text-slate-800 focus:border-red-600 focus:bg-white outline-none"
            />
            <span className="text-[9px] text-slate-400 mt-1 block">Gmail: smtp.gmail.com | Outlook: smtp.office365.com</span>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
              Porta SMTP
            </label>
            <input
              type="number"
              required
              placeholder="587"
              value={formData.port}
              onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 587 })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded font-mono text-xs text-slate-800 focus:border-red-600 focus:bg-white outline-none"
            />
            <span className="text-[9px] text-slate-400 mt-1 block">587 (TLS/STARTTLS padrão) ou 465 (SSL)</span>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
              Conexão Segura Direta (SSL)
            </label>
            <select
              value={formData.secure ? 'true' : 'false'}
              onChange={(e) => setFormData({ ...formData, secure: e.target.value === 'true' })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-800 focus:border-red-600 focus:bg-white outline-none"
            >
              <option value="false">Não (Porta 587 - STARTTLS Padrão)</option>
              <option value="true">Sim (Porta 465 - SSL Direto)</option>
            </select>
            <span className="text-[9px] text-slate-400 mt-1 block">Para porta 587 use "Não". Para 465 use "Sim".</span>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
              Usuário / E-mail de Envio
            </label>
            <input
              type="email"
              required
              placeholder="ex: seu-email@gmail.com"
              value={formData.user}
              onChange={(e) => {
                const val = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  user: val,
                  from: prev.from.includes('<') ? `"Portal CBMERJ" <${val}>` : prev.from,
                }));
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded font-mono text-xs text-slate-800 focus:border-red-600 focus:bg-white outline-none"
            />
            <span className="text-[9px] text-slate-400 mt-1 block">Seu endereço de e-mail completo</span>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
              Senha de Aplicativo (App Password)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required={!status?.configured}
                placeholder={status?.configured ? "•••••••••••••••• (Salva e ativa - deixe vazio para manter)" : "16 letras geradas no Google"}
                value={formData.pass}
                onChange={(e) => setFormData({ ...formData, pass: e.target.value.replace(/\s+/g, '') })}
                className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-200 rounded font-mono text-xs text-slate-800 focus:border-red-600 focus:bg-white outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <span className="text-[9px] text-slate-400 mt-1 block">
              {status?.configured ? "Senha ativa no sistema. Preencha apenas se desejar trocá-la." : "Senha de app de 16 caracteres (sem espaços)"}
            </span>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
              Nome e Remetente (From)
            </label>
            <input
              type="text"
              required
              placeholder='"Portal CBMERJ" <no-reply@cbmerj.rj.gov.br>'
              value={formData.from}
              onChange={(e) => setFormData({ ...formData, from: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded font-mono text-xs text-slate-800 focus:border-red-600 focus:bg-white outline-none"
            />
            <span className="text-[9px] text-slate-400 mt-1 block">Exibição de quem envia a mensagem</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 gap-4">
          <div className="text-[11px] text-slate-500 font-medium">
            {status?.configured ? (
              <span className="text-emerald-700 font-bold">
                ✓ Serviço configurado. Os e-mails são despachados via SMTP.
              </span>
            ) : (
              <span className="text-amber-700 font-bold">
                ⚠️ Enquanto não configurado, os códigos de recuperação são exibidos na tela de teste.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-lg font-black text-xs uppercase tracking-wider transition-colors shadow-md disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </div>
      </form>

      {/* Teste de Envio em Tempo Real */}
      <div className="mt-6 pt-5 border-t border-slate-200">
        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Send className="w-4 h-4 text-slate-500" />
          Testar Envio de E-mail Imediato
        </h4>
        <p className="text-xs text-slate-500 mb-3">
          Envie um e-mail de teste para verificar se o Google/servidor aceitou as credenciais e se a mensagem chega na sua caixa de entrada.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="Digite seu e-mail para receber o teste (ex: seuemail@gmail.com)"
            value={formData.testEmail}
            onChange={(e) => setFormData({ ...formData, testEmail: e.target.value })}
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded font-mono text-xs text-slate-800 focus:border-red-600 focus:bg-white outline-none"
          />
          <button
            type="button"
            disabled={testing}
            onClick={handleTestEmail}
            className="px-5 py-2 bg-slate-800 hover:bg-black text-white rounded font-black text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
          >
            {testing ? <RefreshCw className="w-4 h-4 animate-spin text-amber-400" /> : <Send className="w-4 h-4 text-emerald-400" />}
            {testing ? 'Testando Conexão...' : 'Enviar E-mail de Teste'}
          </button>
        </div>

        {testResult && (
          <div
            className={`mt-3 p-3.5 rounded-lg text-xs leading-relaxed ${
              testResult.success
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold'
                : 'bg-red-50 text-red-900 border border-red-300'
            }`}
          >
            <div className="font-black uppercase tracking-wider mb-1 flex items-center gap-1.5">
              {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
              {testResult.success ? 'Conexão e Envio Bem-Sucedidos!' : 'Falha na Conexão SMTP:'}
            </div>
            <p>{testResult.text}</p>
          </div>
        )}
      </div>
    </div>
  );
}
