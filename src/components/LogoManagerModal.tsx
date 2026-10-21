import React, { useState, useEffect } from 'react';
import { X, Upload, Link, RotateCcw, Check, Image as ImageIcon, Shield, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { LogoDecimoGbm, OFFICIAL_10GBM_LOGO } from './LogoDecimoGbm';
import { LogoCbaSete, OFFICIAL_CBA7_LOGO } from './LogoCbaSete';

export const OFFICIAL_CBMERJ_LOGO = '/brasao-cbmerj-watermark.png';

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

  // Marca d'Água Central da Escala
  const [watermarkCustom, setWatermarkCustom] = useState<string | null>(() => {
    try {
      return localStorage.getItem('escala_watermark_custom');
    } catch {
      return null;
    }
  });

  const [watermarkEnabled, setWatermarkEnabled] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem('escala_watermark_enabled');
      return val !== null ? val === 'true' : true;
    } catch {
      return true;
    }
  });

  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(() => {
    try {
      const val = localStorage.getItem('escala_watermark_opacity');
      return val ? parseFloat(val) : 0.08;
    } catch {
      return 0.08;
    }
  });

  const [watermarkUrl, setWatermarkUrl] = useState('');

  // Sincronização com o Firestore (Banco de Dados Central)
  const syncToFirestore = async (updates: Record<string, any>) => {
    try {
      await setDoc(doc(db, 'system_config', 'escala_logos'), {
        ...updates,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.warn('Nota: Sincronização offline ou erro Firestore:', err);
    }
  };

  useEffect(() => {
    // 1. Ouvinte para eventos locais
    const handleUpdate = () => {
      try {
        setGbmCustom(localStorage.getItem('logo_10gbm_custom'));
        setCbaCustom(localStorage.getItem('logo_cba7_custom'));
        setWatermarkCustom(localStorage.getItem('escala_watermark_custom'));
        const en = localStorage.getItem('escala_watermark_enabled');
        setWatermarkEnabled(en !== null ? en === 'true' : true);
        const op = localStorage.getItem('escala_watermark_opacity');
        setWatermarkOpacity(op ? parseFloat(op) : 0.08);
      } catch {}
    };
    window.addEventListener('logos_updated', handleUpdate);

    // 2. Ouvinte em tempo real do banco de dados (Firestore)
    let unsubFirestore: (() => void) | undefined;
    try {
      unsubFirestore = onSnapshot(doc(db, 'system_config', 'escala_logos'), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          let changed = false;

          if (d.logo_10gbm !== undefined) {
            const current = localStorage.getItem('logo_10gbm_custom');
            if (current !== d.logo_10gbm) {
              if (d.logo_10gbm) localStorage.setItem('logo_10gbm_custom', d.logo_10gbm);
              else localStorage.removeItem('logo_10gbm_custom');
              setGbmCustom(d.logo_10gbm || null);
              changed = true;
            }
          }

          if (d.logo_cba7 !== undefined) {
            const current = localStorage.getItem('logo_cba7_custom');
            if (current !== d.logo_cba7) {
              if (d.logo_cba7) localStorage.setItem('logo_cba7_custom', d.logo_cba7);
              else localStorage.removeItem('logo_cba7_custom');
              setCbaCustom(d.logo_cba7 || null);
              changed = true;
            }
          }

          if (d.watermark_enabled !== undefined) {
            const current = localStorage.getItem('escala_watermark_enabled');
            const strVal = d.watermark_enabled ? 'true' : 'false';
            if (current !== strVal) {
              localStorage.setItem('escala_watermark_enabled', strVal);
              setWatermarkEnabled(Boolean(d.watermark_enabled));
              changed = true;
            }
          }

          if (d.watermark !== undefined) {
            const current = localStorage.getItem('escala_watermark_custom');
            if (current !== d.watermark) {
              if (d.watermark) localStorage.setItem('escala_watermark_custom', d.watermark);
              else localStorage.removeItem('escala_watermark_custom');
              setWatermarkCustom(d.watermark || null);
              changed = true;
            }
          }

          if (d.watermark_opacity !== undefined) {
            const current = localStorage.getItem('escala_watermark_opacity');
            const opStr = d.watermark_opacity.toString();
            if (current !== opStr) {
              localStorage.setItem('escala_watermark_opacity', opStr);
              setWatermarkOpacity(Number(d.watermark_opacity));
              changed = true;
            }
          }

          if (changed) {
            window.dispatchEvent(new Event('logos_updated'));
          }
        }
      }, (err) => {
        console.warn('Nota Firestore escala_logos:', err);
      });
    } catch {}

    return () => {
      window.removeEventListener('logos_updated', handleUpdate);
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  const handleSelectPreset = (type: '10gbm' | 'cba7' | 'watermark', presetSrc: string) => {
    if (type === '10gbm') {
      localStorage.setItem('logo_10gbm_custom', presetSrc);
      setGbmCustom(presetSrc);
      syncToFirestore({ logo_10gbm: presetSrc });
      showToast('Logo do 10º GBM atualizado no banco e na escala!');
    } else if (type === 'cba7') {
      localStorage.setItem('logo_cba7_custom', presetSrc);
      setCbaCustom(presetSrc);
      syncToFirestore({ logo_cba7: presetSrc });
      showToast('Logo do CBA VII atualizado no banco e na escala!');
    } else if (type === 'watermark') {
      localStorage.setItem('escala_watermark_custom', presetSrc);
      localStorage.setItem('escala_watermark_enabled', 'true');
      setWatermarkCustom(presetSrc);
      setWatermarkEnabled(true);
      syncToFirestore({ watermark: presetSrc, watermark_enabled: true });
      showToast('Marca d\'água atualizada no banco e na escala!');
    }
    window.dispatchEvent(new Event('logos_updated'));
  };

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
          syncToFirestore({ logo_10gbm: dataUrl });
          showToast('Brasão do 10º GBM salvo no banco e aplicado!');
        } else {
          localStorage.setItem('logo_cba7_custom', dataUrl);
          setCbaCustom(dataUrl);
          syncToFirestore({ logo_cba7: dataUrl });
          showToast('Brasão do CBA VII salvo no banco e aplicado!');
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
      syncToFirestore({ logo_10gbm: url });
      showToast('Link do 10º GBM salvo e aplicado!');
    } else {
      localStorage.setItem('logo_cba7_custom', url);
      setCbaCustom(url);
      setCbaUrl('');
      syncToFirestore({ logo_cba7: url });
      showToast('Link do CBA VII salvo e aplicado!');
    }
    window.dispatchEvent(new Event('logos_updated'));
  };

  const handleReset = (type: '10gbm' | 'cba7') => {
    if (type === '10gbm') {
      localStorage.removeItem('logo_10gbm_custom');
      setGbmCustom(null);
      syncToFirestore({ logo_10gbm: null });
      showToast('Brasão do 10º GBM restaurado para o padrão oficial.');
    } else {
      localStorage.removeItem('logo_cba7_custom');
      setCbaCustom(null);
      syncToFirestore({ logo_cba7: null });
      showToast('Brasão do CBA VII restaurado para o padrão oficial.');
    }
    window.dispatchEvent(new Event('logos_updated'));
  };

  const handleWatermarkFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        localStorage.setItem('escala_watermark_custom', dataUrl);
        localStorage.setItem('escala_watermark_enabled', 'true');
        setWatermarkCustom(dataUrl);
        setWatermarkEnabled(true);
        syncToFirestore({ watermark: dataUrl, watermark_enabled: true });
        showToast("Marca d'água salva no banco e aplicada com sucesso!");
        window.dispatchEvent(new Event('logos_updated'));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleWatermarkUrlSubmit = () => {
    const url = watermarkUrl.trim();
    if (!url) return;

    localStorage.setItem('escala_watermark_custom', url);
    localStorage.setItem('escala_watermark_enabled', 'true');
    setWatermarkCustom(url);
    setWatermarkEnabled(true);
    setWatermarkUrl('');
    syncToFirestore({ watermark: url, watermark_enabled: true });
    showToast("Link da marca d'água salvo e aplicado!");
    window.dispatchEvent(new Event('logos_updated'));
  };

  const handleToggleWatermark = (enabled: boolean) => {
    localStorage.setItem('escala_watermark_enabled', enabled ? 'true' : 'false');
    setWatermarkEnabled(enabled);
    syncToFirestore({ watermark_enabled: enabled });
    showToast(enabled ? "Marca d'água ativada na escala!" : "Marca d'água desativada/removida da escala!");
    window.dispatchEvent(new Event('logos_updated'));
  };

  const handleChangeOpacity = (opacity: number) => {
    localStorage.setItem('escala_watermark_opacity', opacity.toString());
    setWatermarkOpacity(opacity);
    syncToFirestore({ watermark_opacity: opacity });
    window.dispatchEvent(new Event('logos_updated'));
  };

  const handleResetWatermark = () => {
    localStorage.removeItem('escala_watermark_custom');
    localStorage.setItem('escala_watermark_enabled', 'true');
    localStorage.setItem('escala_watermark_opacity', '0.08');
    setWatermarkCustom(null);
    setWatermarkEnabled(true);
    setWatermarkOpacity(0.08);
    syncToFirestore({ watermark: null, watermark_enabled: true, watermark_opacity: 0.08 });
    showToast("Marca d'água restaurada para o Brasão Oficial CBMERJ padrão!");
    window.dispatchEvent(new Event('logos_updated'));
  };

  const handleRemoveWatermarkCustom = () => {
    localStorage.removeItem('escala_watermark_custom');
    setWatermarkCustom(null);
    syncToFirestore({ watermark: null });
    showToast("Imagem personalizada removida. Voltando ao brasão oficial padrão.");
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
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
                Gerenciador de Brasões & Marca d'Água
              </h2>
              <p className="text-xs text-slate-400">
                Brasões do cabeçalho (10º GBM / CBA VII) e marca d'água central de fundo da escala
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
            Personalize os brasões do cabeçalho e a marca d'água central da escala (<strong>PNG, JPG, SVG ou WebP</strong>). As configurações ficam salvas no seu navegador e são aplicadas na visualização em tela e na impressão física/PDF.
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
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    !gbmCustom || gbmCustom === OFFICIAL_10GBM_LOGO
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : gbmCustom === OFFICIAL_CBA7_LOGO
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : gbmCustom === OFFICIAL_CBMERJ_LOGO
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : gbmCustom === 'vector'
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {!gbmCustom || gbmCustom === OFFICIAL_10GBM_LOGO
                      ? 'Oficial 10º GBM'
                      : gbmCustom === OFFICIAL_CBA7_LOGO
                      ? 'Oficial CBA VII'
                      : gbmCustom === OFFICIAL_CBMERJ_LOGO
                      ? 'Brasão CBMERJ'
                      : gbmCustom === 'vector'
                      ? 'Vetor Clássico'
                      : 'Personalizado'}
                  </span>
                </div>

                {/* Preview Box */}
                <div className="h-36 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-2 mb-3 relative overflow-hidden group shadow-inner">
                  <LogoDecimoGbm className="max-h-full max-w-full object-contain" />
                </div>

                {/* Banco de Logos do Programa */}
                <div className="mb-3 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-red-500" />
                    Banco de Logos do Programa:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('10gbm', OFFICIAL_10GBM_LOGO)}
                      className={cn(
                        "p-1.5 rounded-lg border text-left flex flex-col items-center gap-1 transition-all cursor-pointer",
                        (!gbmCustom || gbmCustom === OFFICIAL_10GBM_LOGO)
                          ? "bg-red-50/90 border-red-500 ring-1 ring-red-400 font-black shadow-2xs"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                      )}
                      title="Escolher Brasão Oficial do 10º GBM - Angra dos Reis"
                    >
                      <img src={OFFICIAL_10GBM_LOGO} alt="10º GBM" className="w-8 h-8 object-contain" />
                      <span className="text-[9px] text-center leading-tight">10º GBM</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectPreset('10gbm', OFFICIAL_CBA7_LOGO)}
                      className={cn(
                        "p-1.5 rounded-lg border text-left flex flex-col items-center gap-1 transition-all cursor-pointer",
                        gbmCustom === OFFICIAL_CBA7_LOGO
                          ? "bg-emerald-50/90 border-emerald-500 ring-1 ring-emerald-400 font-black shadow-2xs"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                      )}
                      title="Escolher Brasão Oficial do CBA VII - Costa Verde"
                    >
                      <img src={OFFICIAL_CBA7_LOGO} alt="CBA VII" className="w-8 h-8 object-contain" />
                      <span className="text-[9px] text-center leading-tight">CBA VII</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectPreset('10gbm', OFFICIAL_CBMERJ_LOGO)}
                      className={cn(
                        "p-1.5 rounded-lg border text-left flex flex-col items-center gap-1 transition-all cursor-pointer",
                        gbmCustom === OFFICIAL_CBMERJ_LOGO
                          ? "bg-amber-50/90 border-amber-500 ring-1 ring-amber-400 font-black shadow-2xs"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                      )}
                      title="Escolher Brasão Oficial CBMERJ"
                    >
                      <img src={OFFICIAL_CBMERJ_LOGO} alt="CBMERJ" className="w-8 h-8 object-contain" />
                      <span className="text-[9px] text-center leading-tight">CBMERJ</span>
                    </button>
                  </div>
                </div>

                {/* Upload Action */}
                <div className="space-y-2">
                  <label className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs">
                    <Upload className="w-4 h-4" />
                    <span>Carregar Outro Arquivo PNG/JPG</span>
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
                  className="mt-3 text-slate-600 hover:text-red-700 text-xs font-bold flex items-center justify-center gap-1.5 pt-2 border-t border-slate-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restaurar Padrão Oficial 10º GBM
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
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    !cbaCustom || cbaCustom === OFFICIAL_CBA7_LOGO
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : cbaCustom === OFFICIAL_10GBM_LOGO
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : cbaCustom === OFFICIAL_CBMERJ_LOGO
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : cbaCustom === 'vector'
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {!cbaCustom || cbaCustom === OFFICIAL_CBA7_LOGO
                      ? 'Oficial CBA VII'
                      : cbaCustom === OFFICIAL_10GBM_LOGO
                      ? 'Oficial 10º GBM'
                      : cbaCustom === OFFICIAL_CBMERJ_LOGO
                      ? 'Brasão CBMERJ'
                      : cbaCustom === 'vector'
                      ? 'Vetor Clássico'
                      : 'Personalizado'}
                  </span>
                </div>

                {/* Preview Box */}
                <div className="h-36 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-2 mb-3 relative overflow-hidden group shadow-inner">
                  <LogoCbaSete className="max-h-full max-w-full object-contain" />
                </div>

                {/* Banco de Logos do Programa */}
                <div className="mb-3 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-500" />
                    Banco de Logos do Programa:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('cba7', OFFICIAL_CBA7_LOGO)}
                      className={cn(
                        "p-1.5 rounded-lg border text-left flex flex-col items-center gap-1 transition-all cursor-pointer",
                        (!cbaCustom || cbaCustom === OFFICIAL_CBA7_LOGO)
                          ? "bg-emerald-50/90 border-emerald-500 ring-1 ring-emerald-400 font-black shadow-2xs"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                      )}
                      title="Escolher Brasão Oficial do CBA VII - Costa Verde"
                    >
                      <img src={OFFICIAL_CBA7_LOGO} alt="CBA VII" className="w-8 h-8 object-contain" />
                      <span className="text-[9px] text-center leading-tight">CBA VII</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectPreset('cba7', OFFICIAL_10GBM_LOGO)}
                      className={cn(
                        "p-1.5 rounded-lg border text-left flex flex-col items-center gap-1 transition-all cursor-pointer",
                        cbaCustom === OFFICIAL_10GBM_LOGO
                          ? "bg-red-50/90 border-red-500 ring-1 ring-red-400 font-black shadow-2xs"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                      )}
                      title="Escolher Brasão Oficial do 10º GBM - Angra dos Reis"
                    >
                      <img src={OFFICIAL_10GBM_LOGO} alt="10º GBM" className="w-8 h-8 object-contain" />
                      <span className="text-[9px] text-center leading-tight">10º GBM</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectPreset('cba7', OFFICIAL_CBMERJ_LOGO)}
                      className={cn(
                        "p-1.5 rounded-lg border text-left flex flex-col items-center gap-1 transition-all cursor-pointer",
                        cbaCustom === OFFICIAL_CBMERJ_LOGO
                          ? "bg-amber-50/90 border-amber-500 ring-1 ring-amber-400 font-black shadow-2xs"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                      )}
                      title="Escolher Brasão Oficial CBMERJ"
                    >
                      <img src={OFFICIAL_CBMERJ_LOGO} alt="CBMERJ" className="w-8 h-8 object-contain" />
                      <span className="text-[9px] text-center leading-tight">CBMERJ</span>
                    </button>
                  </div>
                </div>

                {/* Upload Action */}
                <div className="space-y-2">
                  <label className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs">
                    <Upload className="w-4 h-4" />
                    <span>Carregar Outro Arquivo PNG/JPG</span>
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
                  className="mt-3 text-slate-600 hover:text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 pt-2 border-t border-slate-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restaurar Padrão Oficial CBA VII
                </button>
              )}
            </div>

          </div>

          {/* SEÇÃO MARCA D'ÁGUA CENTRAL DA ESCALA */}
          <div className="border border-slate-200 rounded-xl p-5 bg-gradient-to-br from-slate-50 via-white to-amber-50/20 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase text-slate-800 tracking-tight flex items-center gap-2">
                      Marca d'Água Central da Escala
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Insignia/brasão no fundo central da folha, leve e transparente (visível em tela e impressões)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    !watermarkEnabled
                      ? 'bg-slate-200 text-slate-600'
                      : watermarkCustom
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {!watermarkEnabled ? 'Desativada' : watermarkCustom ? 'Personalizada' : 'Padrão CBMERJ'}
                  </span>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggleWatermark(!watermarkEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      watermarkEnabled ? 'bg-amber-600' : 'bg-slate-300'
                    }`}
                    role="switch"
                    aria-checked={watermarkEnabled}
                    title={watermarkEnabled ? "Clique para desativar/ocultar da escala" : "Clique para ativar na escala"}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        watermarkEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Grid: Preview + Controls */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Preview Column */}
                <div className="md:col-span-5 flex flex-col">
                  <div className="text-[11px] font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                    <span>Prévia na Folha</span>
                    <span className="text-amber-800 font-extrabold">{Math.round(watermarkOpacity * 100)}% opacidade</span>
                  </div>
                  <div className="h-48 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center p-3 relative overflow-hidden shadow-inner select-none">
                    {/* Simulated scale lines in background */}
                    <div className="absolute inset-0 opacity-15 pointer-events-none p-3 space-y-2 flex flex-col justify-between">
                      <div className="h-2 bg-slate-400 rounded-sm w-3/4"></div>
                      <div className="h-2 bg-slate-300 rounded-sm w-full"></div>
                      <div className="h-2 bg-slate-300 rounded-sm w-5/6"></div>
                      <div className="h-2 bg-slate-400 rounded-sm w-full"></div>
                      <div className="h-2 bg-slate-300 rounded-sm w-4/5"></div>
                      <div className="h-2 bg-slate-300 rounded-sm w-full"></div>
                    </div>

                    {watermarkEnabled ? (
                      <img
                        src={watermarkCustom || '/brasao-cbmerj-watermark.png'}
                        alt="Prévia Marca d'água"
                        className="max-h-40 max-w-full object-contain relative z-10 transition-opacity duration-150"
                        style={{ opacity: watermarkOpacity }}
                      />
                    ) : (
                      <div className="text-xs text-slate-400 font-semibold italic z-10 text-center">
                        Marca d'água desativada
                      </div>
                    )}
                  </div>
                </div>

                {/* Settings Column */}
                <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                  {/* Opacity Slider & Presets */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between mb-1">
                      <span>Transparência / Opacidade</span>
                      <span className="text-slate-500 font-medium">{Math.round(watermarkOpacity * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min="0.02"
                      max="0.25"
                      step="0.01"
                      value={watermarkOpacity}
                      onChange={(e) => handleChangeOpacity(parseFloat(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                    />
                    <div className="flex items-center justify-between mt-1.5 gap-1 flex-wrap">
                      {[
                        { label: 'Muito Leve', val: 0.04 },
                        { label: 'Padrão (8%)', val: 0.08 },
                        { label: 'Médio', val: 0.12 },
                        { label: 'Destacado', val: 0.18 }
                      ].map(preset => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => handleChangeOpacity(preset.val)}
                          className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                            Math.abs(watermarkOpacity - preset.val) < 0.01
                              ? 'bg-amber-600 text-white border-amber-600 font-bold'
                              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Banco de Logos para Marca d'Água */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Escolher do Banco de Logos:
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectPreset('watermark', OFFICIAL_CBMERJ_LOGO)}
                        className={cn(
                          "p-1.5 rounded-lg border text-left flex flex-col items-center gap-1 transition-all cursor-pointer",
                          (!watermarkCustom || watermarkCustom === OFFICIAL_CBMERJ_LOGO)
                            ? "bg-amber-50/90 border-amber-500 ring-1 ring-amber-400 font-black shadow-2xs"
                            : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                        )}
                        title="Usar Brasão Tradicional CBMERJ como marca d'água"
                      >
                        <img src={OFFICIAL_CBMERJ_LOGO} alt="CBMERJ" className="w-8 h-8 object-contain" />
                        <span className="text-[9px] text-center leading-tight">CBMERJ Geral</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectPreset('watermark', OFFICIAL_10GBM_LOGO)}
                        className={cn(
                          "p-1.5 rounded-lg border text-left flex flex-col items-center gap-1 transition-all cursor-pointer",
                          watermarkCustom === OFFICIAL_10GBM_LOGO
                            ? "bg-red-50/90 border-red-500 ring-1 ring-red-400 font-black shadow-2xs"
                            : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                        )}
                        title="Usar Brasão Oficial do 10º GBM como marca d'água"
                      >
                        <img src={OFFICIAL_10GBM_LOGO} alt="10º GBM" className="w-8 h-8 object-contain" />
                        <span className="text-[9px] text-center leading-tight">10º GBM</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectPreset('watermark', OFFICIAL_CBA7_LOGO)}
                        className={cn(
                          "p-1.5 rounded-lg border text-left flex flex-col items-center gap-1 transition-all cursor-pointer",
                          watermarkCustom === OFFICIAL_CBA7_LOGO
                            ? "bg-emerald-50/90 border-emerald-500 ring-1 ring-emerald-400 font-black shadow-2xs"
                            : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                        )}
                        title="Usar Brasão Oficial do CBA VII como marca d'água"
                      >
                        <img src={OFFICIAL_CBA7_LOGO} alt="CBA VII" className="w-8 h-8 object-contain" />
                        <span className="text-[9px] text-center leading-tight">CBA VII</span>
                      </button>
                    </div>
                  </div>

                  {/* Upload & Link Controls */}
                  <div className="space-y-2">
                    <label className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs">
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>Carregar Outro Arquivo PNG/JPG</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={handleWatermarkFileUpload}
                      />
                    </label>

                    <div className="flex gap-1.5">
                      <input
                        type="url"
                        placeholder="Ou colar link da imagem..."
                        value={watermarkUrl}
                        onChange={(e) => setWatermarkUrl(e.target.value)}
                        className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden bg-white"
                      />
                      <button
                        onClick={handleWatermarkUrlSubmit}
                        disabled={!watermarkUrl.trim()}
                        className="bg-slate-800 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors"
                      >
                        <Link className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Reset / Remove Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                    {watermarkCustom ? (
                      <button
                        type="button"
                        onClick={handleRemoveWatermarkCustom}
                        className="text-slate-600 hover:text-amber-800 font-bold flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Voltar ao Brasão CBMERJ
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResetWatermark}
                        className="text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restaurar Padrão
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleToggleWatermark(!watermarkEnabled)}
                      className={`font-bold transition-colors ${
                        watermarkEnabled ? 'text-red-600 hover:text-red-800' : 'text-emerald-700 hover:text-emerald-800'
                      }`}
                    >
                      {watermarkEnabled ? 'Desativar / Ocultar' : 'Ativar Marca d\'Água'}
                    </button>
                  </div>
                </div>
              </div>
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
