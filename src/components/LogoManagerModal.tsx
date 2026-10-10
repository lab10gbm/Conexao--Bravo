import React, { useState, useEffect } from 'react';
import { X, Upload, Link, RotateCcw, Check, Image as ImageIcon, Shield, Sparkles } from 'lucide-react';
import { LogoDecimoGbm } from './LogoDecimoGbm';
import { LogoCbaSete } from './LogoCbaSete';

interface LogoManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LogoManagerModal({ isOpen, onClose }: LogoManagerModalProps) {
  const [gbmCustom, setGbmCustom] = useState<string | null>(() => {
    try {
      return localStorage.getItem('logo_10gbm_custom');
    } catch {
      return null;
    }
  });

  const [cbaCustom, setCbaCustom] = useState<string | null>(() => {
    try {
      return localStorage.getItem('logo_cba7_custom');
    } catch {
      return null;
    }
  });

  const [gbmUrl, setGbmUrl] = useState('');
  const [cbaUrl, setCbaUrl] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      try {
        setGbmCustom(localStorage.getItem('logo_10gbm_custom'));
        setCbaCustom(localStorage.getItem('logo_cba7_custom'));
      } catch {}
    };
    window.addEventListener('logos_updated', handleUpdate);
    return () => window.removeEventListener('logos_updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const handleFileUpload = (type: '10gbm' | 'cba7', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        if (type === '10gbm') {
          localStorage.setItem('logo_10gbm_custom', dataUrl);
          setGbmCustom(dataUrl);
          showToast('Brasão do 10º GBM carregado com sucesso!');
        } else {
          localStorage.setItem('logo_cba7_custom', dataUrl);
          setCbaCustom(dataUrl);
          showToast('Brasão do CBA VII carregado com sucesso!');
        }
        window.dispatchEvent(new Event('logos_updated'));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUrlSubmit = (type: '10gbm' | 'cba7') => {
    const url = type === '10gbm' ? gbmUrl.trim() : cbaUrl.trim();
    if (!url) return;

    if (type === '10gbm') {
      localStorage.setItem('logo_10gbm_custom', url);
      setGbmCustom(url);
      setGbmUrl('');
      showToast('Link do 10º GBM aplicado com sucesso!');
    } else {
      localStorage.setItem('logo_cba7_custom', url);
      setCbaCustom(url);
      setCbaUrl('');
      showToast('Link do CBA VII aplicado com sucesso!');
    }
    window.dispatchEvent(new Event('logos_updated'));
  };

  const handleReset = (type: '10gbm' | 'cba7') => {
    if (type === '10gbm') {
      localStorage.removeItem('logo_10gbm_custom');
      setGbmCustom(null);
      showToast('Brasão do 10º GBM restaurado para o vetor padrão.');
    } else {
      localStorage.removeItem('logo_cba7_custom');
      setCbaCustom(null);
      showToast('Brasão do CBA VII restaurado para o vetor padrão.');
    }
    window.dispatchEvent(new Event('logos_updated'));
  };

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
                Gerenciador de Brasões e Logos
              </h2>
              <p className="text-xs text-slate-400">
                Cabeçalho oficial da escala de serviço (10º GBM e CBA VII)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success toast notification */}
        {successMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex items-center gap-2 text-xs font-bold text-emerald-800 animate-in slide-in-from-top-1">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Info banner */}
        <div className="bg-amber-50/80 border-b border-amber-200/80 px-5 py-3 text-xs text-amber-900 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            Carregue as imagens dos brasões (<strong>PNG, JPG, SVG ou WebP</strong>) direto do seu computador/celular ou cole um link. Elas ficarão salvas no seu navegador e serão aplicadas automaticamente em todas as visualizações e impressões físicas.
          </p>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 10º GBM CARD */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="font-black text-sm uppercase text-slate-800 tracking-tight flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                    10º GBM (Esquerdo)
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${gbmCustom ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-700'}`}>
                    {gbmCustom ? 'Personalizado' : 'Vetor Padrão'}
                  </span>
                </div>

                {/* Preview Box */}
                <div className="h-36 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-2 mb-4 relative overflow-hidden group shadow-inner">
                  <LogoDecimoGbm className="max-h-full max-w-full object-contain" />
                </div>

                {/* Upload Action */}
                <div className="space-y-2.5">
                  <label className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 px-3 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs">
                    <Upload className="w-4 h-4" />
                    <span>Escolher Imagem do 10º GBM</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => handleFileUpload('10gbm', e)}
                    />
                  </label>

                  {/* URL Input */}
                  <div className="flex gap-1.5">
                    <input
                      type="url"
                      placeholder="Ou colar link da imagem..."
                      value={gbmUrl}
                      onChange={(e) => setGbmUrl(e.target.value)}
                      className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-red-500 focus:outline-hidden bg-white"
                    />
                    <button
                      onClick={() => handleUrlSubmit('10gbm')}
                      disabled={!gbmUrl.trim()}
                      className="bg-slate-800 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors"
                    >
                      <Link className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {gbmCustom && (
                <button
                  onClick={() => handleReset('10gbm')}
                  className="mt-4 text-slate-600 hover:text-red-700 text-xs font-bold flex items-center justify-center gap-1.5 pt-2 border-t border-slate-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restaurar Brasão Original
                </button>
              )}
            </div>

            {/* CBA VII CARD */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="font-black text-sm uppercase text-slate-800 tracking-tight flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    CBA VII (Direito)
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cbaCustom ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-700'}`}>
                    {cbaCustom ? 'Personalizado' : 'Vetor Padrão'}
                  </span>
                </div>

                {/* Preview Box */}
                <div className="h-36 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-2 mb-4 relative overflow-hidden group shadow-inner">
                  <LogoCbaSete className="max-h-full max-w-full object-contain" />
                </div>

                {/* Upload Action */}
                <div className="space-y-2.5">
                  <label className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-3 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs">
                    <Upload className="w-4 h-4" />
                    <span>Escolher Imagem do CBA VII</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => handleFileUpload('cba7', e)}
                    />
                  </label>

                  {/* URL Input */}
                  <div className="flex gap-1.5">
                    <input
                      type="url"
                      placeholder="Ou colar link da imagem..."
                      value={cbaUrl}
                      onChange={(e) => setCbaUrl(e.target.value)}
                      className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
                    />
                    <button
                      onClick={() => handleUrlSubmit('cba7')}
                      disabled={!cbaUrl.trim()}
                      className="bg-slate-800 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors"
                    >
                      <Link className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {cbaCustom && (
                <button
                  onClick={() => handleReset('cba7')}
                  className="mt-4 text-slate-600 hover:text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 pt-2 border-t border-slate-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restaurar Brasão Original
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500">
            Dica: No cabeçalho da escala, você também pode passar o mouse e clicar diretamente em qualquer um dos dois brasões para trocar.
          </p>
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2 rounded-xl text-xs transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
