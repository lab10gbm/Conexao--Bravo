import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Clock, 
  CheckCircle2, 
  RefreshCw, 
  Server, 
  ShieldCheck, 
  Zap, 
  Copy, 
  Check, 
  AlertCircle
} from 'lucide-react';

interface HealthData {
  status: string;
  uptime: number;
  brasilia?: {
    time: string;
    hour: number;
    isOperatingHours: boolean;
    window: string;
    mode?: string;
  };
  keepAlive?: {
    lastPingAt: string | null;
    lastPingSource: string;
    totalPings: number;
    robotStatus: string;
    mode?: string;
    renderTargetUrl: string;
  };
}

export function KeepAliveConfigCard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [testingPing, setTestingPing] = useState(false);
  const [testResult, setTestResult] = useState<{ status: string; latencyMs: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [localBrTime, setLocalBrTime] = useState<string>('');

  // Calculate live Brasilia time in UI
  useEffect(() => {
    const updateTime = () => {
      try {
        const timeStr = new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).format(new Date());
        setLocalBrTime(timeStr);
      } catch {
        setLocalBrTime(new Date().toLocaleTimeString('pt-BR'));
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (err) {
      console.warn('Erro ao consultar healthcheck:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const timer = setInterval(fetchHealth, 30000); // refresh every 30s
    return () => clearInterval(timer);
  }, []);

  const handleTestPing = async () => {
    setTestingPing(true);
    setTestResult(null);
    const start = performance.now();
    try {
      const res = await fetch('/api/health', { 
        cache: 'no-store',
        headers: { 'X-Keep-Alive': 'admin-manual-test-24h' }
      });
      const end = performance.now();
      const latency = Math.round(end - start);
      setTestResult({
        status: res.ok ? '200 OK' : `HTTP ${res.status}`,
        latencyMs: latency
      });
      fetchHealth();
    } catch (err: any) {
      setTestResult({
        status: `Falha: ${err.message}`,
        latencyMs: 0
      });
    } finally {
      setTestingPing(false);
    }
  };

  const getHealthUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/health`;
    }
    return 'https://seu-app.onrender.com/api/health';
  };

  const copyHealthUrl = () => {
    navigator.clipboard.writeText(getHealthUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Format uptime in hours and minutes
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                Robô Anti-Desativação (Render Keep-Alive)
              </h3>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Modo 24 Horas Ininterrupto Ativo
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
              Site mantido 100% acordado dia e noite para uso exclusivo deste projeto
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="p-2 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
            title="Atualizar status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleTestPing}
            disabled={testingPing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all active:scale-95"
          >
            <Activity className={`w-3.5 h-3.5 ${testingPing ? 'animate-pulse' : ''}`} />
            {testingPing ? 'Testando...' : 'Testar Ping Agora'}
          </button>
        </div>
      </div>

      {/* Test feedback */}
      {testResult && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-emerald-800 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Resposta do Servidor: <b>{testResult.status}</b></span>
          </div>
          <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
            Latência: {testResult.latencyMs} ms
          </span>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Hora Oficial Brasília */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Hora Brasília (GMT-3)</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-slate-800 font-mono">
            {localBrTime || '--:--:--'}
          </div>
          <div className="text-[9px] text-emerald-600 font-bold mt-1">
            Ciclo de Ping: <b>24h / 7 dias por semana</b>
          </div>
        </div>

        {/* Status Render */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Estado do Serviço</span>
            <Server className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-base font-black text-slate-800 uppercase tracking-tight">
              {health?.status === 'ok' ? 'Online 24/7' : 'Conectando...'}
            </span>
          </div>
          <div className="text-[9px] text-slate-500 font-semibold mt-1">
            Uptime: <b>{health ? formatUptime(health.uptime) : '...'}</b>
          </div>
        </div>

        {/* Último Keep-Alive */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Último Ping Recebido</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-sm font-black text-slate-800 font-mono truncate" title={health?.keepAlive?.lastPingAt || 'Nenhum ainda'}>
            {health?.keepAlive?.lastPingAt 
              ? new Date(health.keepAlive.lastPingAt).toLocaleTimeString('pt-BR') 
              : 'Iniciando ciclo...'}
          </div>
          <div className="text-[9px] text-slate-500 font-semibold mt-1 truncate">
            Origem: <b>{health?.keepAlive?.lastPingSource || 'sistema'}</b>
          </div>
        </div>

        {/* Economia de Cota */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Cota Render (750h/mês)</span>
            <ShieldCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-base font-black text-blue-900 font-mono">
            744h / 750h
          </div>
          <div className="text-[9px] text-blue-700 font-bold mt-1">
            Projeto Exclusivo (Dentro dos 750h)
          </div>
        </div>
      </div>

      {/* Os 3 Modos Ativos 24/7 */}
      <div className="space-y-3">
        <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Camadas 24 Horas Ativas neste Repositório
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Modo 1 */}
          <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/70 hover:bg-white transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black flex items-center justify-center">1</span>
              <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Auto-Ping Node.js (24/7)</h5>
            </div>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              O backend dispara um ping interno contínuo a cada <b>10 minutos</b> dia e noite, impedindo que o Render atinja o limite de 15 minutos de inatividade.
            </p>
            <div className="mt-2 text-[9px] font-black text-indigo-700 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 inline-block">
              Interno • server.ts
            </div>
          </div>

          {/* Modo 2 */}
          <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/70 hover:bg-white transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black flex items-center justify-center">2</span>
              <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">GitHub Actions (24/7)</h5>
            </div>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              Workflow agendado no GitHub que acorda o site a cada <b>12 minutos</b> 24h por dia. Se o Render sofrer qualquer reinicialização, o GitHub o acorda imediatamente.
            </p>
            <div className="mt-2 text-[9px] font-black text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 inline-block">
              Nuvem • .github/workflows
            </div>
          </div>

          {/* Modo 3 */}
          <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/70 hover:bg-white transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black flex items-center justify-center">3</span>
              <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Heartbeat nos Clientes</h5>
            </div>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              Pulsos a cada <b>6 minutos</b> de qualquer usuário com a aba aberta ou ao desbloquear o celular, garantindo zero atraso durante os atendimentos.
            </p>
            <div className="mt-2 text-[9px] font-black text-amber-700 uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded border border-amber-100 inline-block">
              Cliente • useKeepAliveHeartbeat
            </div>
          </div>
        </div>
      </div>

      {/* Camada 4 Opcional (UptimeRobot / Cron-job.org) */}
      <div className="border border-dashed border-slate-300 rounded-lg p-4 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
              Camada 4 Opcional (UptimeRobot ou Cron-job.org)
            </span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed max-w-xl">
            Se quiser monitoramento com aviso no seu e-mail caso haja instabilidade no Render, você pode cadastrar a URL abaixo no <b>UptimeRobot</b> (grátis):
          </p>
          <div className="font-mono text-[10px] text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded max-w-fit break-all">
            {getHealthUrl()}
          </div>
        </div>

        <button
          onClick={copyHealthUrl}
          className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3.5 py-2 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shrink-0 transition-all shadow-xs"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'URL Copiada!' : 'Copiar URL do Healthcheck'}
        </button>
      </div>
    </div>
  );
}
