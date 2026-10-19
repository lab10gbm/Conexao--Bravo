import React, { useState, useEffect } from 'react';
import { 
  Palmtree, Plus, Save, RotateCcw, Check, X, BookmarkCheck, 
  Trash2, Edit2, ArrowUp, ArrowDown, Eye, EyeOff, Shield, Info, Sparkles 
} from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { cn, normalizeObm, getObmSettingsDocKey, getObmSettingsFallbackKeys, cleanUndefined } from '../../../lib/utils';
import { PostoConfig, DEFAULT_POSTOS } from '../types';
import { PostoEditModal } from './PostoEditModal';

interface PostosManagerPanelProps {
  obmContext: string;
}

export function PostosManagerPanel({ obmContext }: PostosManagerPanelProps) {
  const [postos, setPostos] = useState<PostoConfig[]>([]);
  const [postosAtivoObm, setPostosAtivoObm] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPosto, setEditingPosto] = useState<PostoConfig | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [customDefault, setCustomDefault] = useState<PostoConfig[] | null>(null);
  const [customDefaultDate, setCustomDefaultDate] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 4500);
    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (!obmContext) return;
    const cleanObm = normalizeObm(obmContext);

    // Carregamento inicial do localStorage para agilidade
    const localPostosStr = localStorage.getItem(`postos_config_${obmContext}`) || localStorage.getItem(`postos_config_${cleanObm}`);
    const localAtivoStr = localStorage.getItem(`postos_ativo_${obmContext}`) || localStorage.getItem(`postos_ativo_${cleanObm}`);
    const localDefStr = localStorage.getItem(`custom_default_postos_${obmContext}`) || localStorage.getItem(`custom_default_postos_${cleanObm}`);
    const localDefDate = localStorage.getItem(`custom_default_postos_date_${obmContext}`);

    if (localPostosStr) {
      try {
        setPostos(JSON.parse(localPostosStr));
      } catch {}
    }
    if (localAtivoStr !== null) {
      setPostosAtivoObm(localAtivoStr === 'true');
    }
    if (localDefStr) {
      try {
        setCustomDefault(JSON.parse(localDefStr));
        setCustomDefaultDate(localDefDate || null);
      } catch {}
    }

    if (!db) {
      if (!localPostosStr) setPostos(DEFAULT_POSTOS);
      setLoading(false);
      return;
    }

    const docKey = getObmSettingsDocKey(obmContext);
    const docRef = doc(db, "obm_settings", docKey);

    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      let data = docSnap.exists() ? docSnap.data() : null;

      if (!data || data.postos_config === undefined) {
        const fallbackKeys = getObmSettingsFallbackKeys(obmContext);
        for (const fk of fallbackKeys) {
          if (fk === docKey) continue;
          try {
            const snapFallback = await getDoc(doc(db, "obm_settings", fk));
            if (snapFallback.exists()) {
              const fbData = snapFallback.data();
              if (fbData?.postos_config !== undefined) {
                data = { ...fbData, ...(data || {}) };
                break;
              }
            }
          } catch {}
        }
      }

      if (data) {
        if (data.postos_ativo_obm !== undefined) {
          setPostosAtivoObm(Boolean(data.postos_ativo_obm));
        } else {
          // Padrão: desativado para 10º GBM, ativado se houver postos cadastrados
          const isDecimo = cleanObm === '10º GBM' || cleanObm.includes('10');
          setPostosAtivoObm(!isDecimo && (data.postos_config && data.postos_config.length > 0));
        }

        if (data.postos_custom_default && Array.isArray(data.postos_custom_default)) {
          setCustomDefault(data.postos_custom_default);
          setCustomDefaultDate(data.postos_custom_default_date || null);
        }

        if (data.postos_config && Array.isArray(data.postos_config)) {
          setPostos(data.postos_config);
        } else if (data.postos_custom_default && Array.isArray(data.postos_custom_default)) {
          setPostos(data.postos_custom_default);
        } else {
          // Se não houver nada salvo, usar padrão
          setPostos(localPostosStr ? JSON.parse(localPostosStr) : DEFAULT_POSTOS);
        }
      } else {
        setPostos(DEFAULT_POSTOS);
      }
      setLoading(false);
    }, (err) => {
      console.error("Erro ao carregar postos:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [obmContext]);

  const handleSave = async (updatedPostos = postos, updatedAtivo = postosAtivoObm) => {
    if (!obmContext) return;
    setSaving(true);
    const nowIso = new Date().toISOString();
    try {
      const payload = cleanUndefined({
        postos_config: updatedPostos,
        postos_ativo_obm: updatedAtivo,
        updatedAt: nowIso
      });

      const cleanObm = normalizeObm(obmContext);
      if (db) {
        const docKeys = Array.from(new Set([
          obmContext.replace(/\//g, '_').replace(/\s/g, '_'),
          cleanObm.replace(/\//g, '_').replace(/\s/g, '_'),
          cleanObm.replace(/º/g, '°').replace(/\//g, '_').replace(/\s/g, '_'),
          cleanObm.replace(/°/g, 'º').replace(/\//g, '_').replace(/\s/g, '_'),
          cleanObm.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
          '10º_GBM',
          '10°_GBM'
        ]));
        for (const key of docKeys) {
          try {
            await setDoc(doc(db, "obm_settings", key), payload, { merge: true });
          } catch (e) {
            console.warn("Erro salvando key em obm_settings:", key, e);
          }
        }
      }

      // Salva no localStorage
      localStorage.setItem(`postos_config_${obmContext}`, JSON.stringify(updatedPostos));
      localStorage.setItem(`postos_config_${cleanObm}`, JSON.stringify(updatedPostos));
      localStorage.setItem(`postos_ativo_${obmContext}`, String(updatedAtivo));
      localStorage.setItem(`postos_ativo_${cleanObm}`, String(updatedAtivo));

      window.dispatchEvent(new CustomEvent('obm_postos_pattern_updated', {
        detail: { obmContext, postos: updatedPostos, ativo: updatedAtivo }
      }));

      setSuccessMessage("Configurações de postos salvas com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar postos:", err);
      alert("Erro ao salvar configurações de postos.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewDefault = async () => {
    if (!obmContext) return;
    setSaving(true);
    const nowIso = new Date().toISOString();
    try {
      const payload = cleanUndefined({
        postos_config: postos,
        postos_custom_default: postos,
        postos_custom_default_date: nowIso,
        postos_ativo_obm: postosAtivoObm,
        updatedAt: nowIso
      });

      const cleanObm = normalizeObm(obmContext);
      if (db) {
        const docKeys = Array.from(new Set([
          obmContext.replace(/\//g, '_').replace(/\s/g, '_'),
          cleanObm.replace(/\//g, '_').replace(/\s/g, '_'),
          '10º_GBM',
          '10°_GBM'
        ]));
        for (const key of docKeys) {
          try {
            await setDoc(doc(db, "obm_settings", key), payload, { merge: true });
          } catch {}
        }
      }

      localStorage.setItem(`custom_default_postos_${obmContext}`, JSON.stringify(postos));
      localStorage.setItem(`custom_default_postos_${cleanObm}`, JSON.stringify(postos));
      localStorage.setItem(`custom_default_postos_date_${obmContext}`, nowIso);

      setCustomDefault(postos);
      setCustomDefaultDate(nowIso);
      setSuccessMessage("Novo padrão de postos criado com sucesso para esta OBM!");
    } catch (err) {
      console.error("Erro ao criar novo padrão de postos:", err);
      alert("Erro ao salvar novo padrão de postos.");
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefault = () => {
    if (customDefault && customDefault.length > 0) {
      setPostos(customDefault);
      setSuccessMessage("Postos restaurados para o Padrão da OBM!");
    } else {
      setPostos(DEFAULT_POSTOS);
      setSuccessMessage("Postos restaurados para o padrão inicial do sistema.");
    }
  };

  const handleOpenAddPosto = () => {
    const newPosto: PostoConfig = {
      id: `posto-${Date.now()}`,
      nome: '',
      tipo: 'praia',
      obm: obmContext || "10º GBM",
      ativa: true,
      exibir: true,
      funcoes: [
        { id: `fn-${Date.now()}-1`, nome: 'CHEFE DO POSTO', vagas: 1 },
        { id: `fn-${Date.now()}-2`, nome: 'GUARDA-VIDAS 1', vagas: 1 },
        { id: `fn-${Date.now()}-3`, nome: 'GUARDA-VIDAS 2', vagas: 1 },
        { id: `fn-${Date.now()}-4`, nome: 'CONDUTOR', vagas: 1 }
      ]
    };
    setEditingPosto(newPosto);
    setIsAdding(true);
  };

  const handleDeletePosto = (id: string) => {
    setPostos(prev => prev.filter(p => p.id !== id));
    setConfirmDeleteId(null);
  };

  const movePostoUp = (idx: number) => {
    if (idx <= 0) return;
    setPostos(prev => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx - 1];
      copy[idx - 1] = temp;
      return copy;
    });
  };

  const movePostoDown = (idx: number) => {
    if (idx >= postos.length - 1) return;
    setPostos(prev => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[idx + 1];
      copy[idx + 1] = temp;
      return copy;
    });
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">
        Carregando ambiente de postos...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Toast Notificação */}
      {successMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-7 h-7 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold">{successMessage}</p>
          <button
            onClick={() => setSuccessMessage(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal Adicionar / Editar Posto */}
      {editingPosto && (
        <PostoEditModal
          editingPosto={editingPosto}
          isAdding={isAdding}
          onClose={() => {
            setEditingPosto(null);
            setIsAdding(false);
          }}
          onSave={(savedPosto) => {
            if (isAdding) {
              setPostos(prev => [...prev, savedPosto]);
            } else {
              setPostos(prev => prev.map(p => p.id === savedPosto.id ? savedPosto : p));
            }
            setEditingPosto(null);
            setIsAdding(false);
          }}
          obmContext={obmContext}
        />
      )}

      {/* Card Informativo e Switch Mestre da OBM */}
      <div className="bg-gradient-to-r from-teal-50 via-cyan-50 to-slate-50 rounded-2xl p-5 border border-teal-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Palmtree className="w-5 h-5 text-teal-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Módulo de Postos de Serviço (Posto de Praia / Salvamar)
              </h3>
              <span className={cn(
                "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                postosAtivoObm 
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-slate-200 text-slate-600 border-slate-300"
              )}>
                {postosAtivoObm ? "Ativado na OBM" : "Desativado na OBM"}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
              No 10º GBM os postos vêm desativados por padrão. Ative caso esta OBM utilize escalas de postos (ex: postos de praia ou destacamentos).
            </p>
          </div>
        </div>

        {/* Switch Ativação da OBM */}
        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs self-end md:self-auto shrink-0">
          <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-700">
            Habilitar Postos no {obmContext}:
          </span>
          <button
            type="button"
            onClick={() => {
              const nextVal = !postosAtivoObm;
              setPostosAtivoObm(nextVal);
              handleSave(postos, nextVal);
            }}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer",
              postosAtivoObm ? "bg-teal-600" : "bg-slate-300"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-xs",
                postosAtivoObm ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
      </div>

      {/* Barra de Ações Superior */}
      <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleOpenAddPosto}
            className="bg-teal-600 hover:bg-teal-700 text-white py-2.5 px-5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Adicionar Posto
          </button>

          <button
            type="button"
            onClick={handleCreateNewDefault}
            className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            title="Definir esta lista de postos e funções como o padrão da OBM"
          >
            <BookmarkCheck className="w-4 h-4" /> Criar Novo Padrão
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          <button
            type="button"
            onClick={handleRestoreDefault}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 shadow-sm rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" /> Retornar ao Padrão
          </button>

          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 text-white shadow-sm rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Postos"}
          </button>
        </div>
      </div>

      {/* Lista de Postos Cadastrados */}
      <div className="space-y-4">
        {postos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <Palmtree className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-black uppercase text-slate-700 mb-1">
              Nenhum posto cadastrado
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4 font-medium">
              Clique no botão abaixo para cadastrar o primeiro posto de serviço (ex: Posto de Praia 01) e definir as funções da sua guarnição.
            </p>
            <button
              onClick={handleOpenAddPosto}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Cadastrar Primeiro Posto
            </button>
          </div>
        ) : (
          postos.map((posto, idx) => (
            <div
              key={posto.id}
              className={cn(
                "bg-white rounded-2xl border transition-all shadow-xs overflow-hidden",
                posto.ativa ? "border-slate-200" : "border-slate-200 bg-slate-50/70 opacity-75"
              )}
            >
              {/* Header do Card do Posto */}
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-black text-xs shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black uppercase text-slate-800 tracking-wide">
                        {posto.nome || "POSTO SEM NOME"}
                      </h4>
                      <span className="text-[8.5px] font-black uppercase px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                        {posto.tipo === 'praia' ? 'Praia / Salvamar' : (posto.tipo?.toUpperCase() || 'POSTO')}
                      </span>
                      <span className="text-[8.5px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {posto.obm || obmContext}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Guarnição: {posto.funcoes?.length || 0} vagas configuradas
                    </span>
                  </div>
                </div>

                {/* Controles de Ação do Posto */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                  {/* Reordenação */}
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => movePostoUp(idx)}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Mover para cima"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => movePostoDown(idx)}
                      disabled={idx === postos.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Mover para baixo"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Toggle Ativar / Desativar Posto */}
                  <button
                    type="button"
                    onClick={() => {
                      setPostos(prev =>
                        prev.map(p => (p.id === posto.id ? { ...p, ativa: !p.ativa } : p))
                      );
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1 transition-all border cursor-pointer",
                      posto.ativa
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200"
                    )}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full", posto.ativa ? "bg-emerald-500" : "bg-slate-400")} />
                    {posto.ativa ? "Ativo" : "Inativo"}
                  </button>

                  {/* Toggle Exibir */}
                  <button
                    type="button"
                    onClick={() => {
                      setPostos(prev =>
                        prev.map(p => (p.id === posto.id ? { ...p, exibir: !p.exibir } : p))
                      );
                    }}
                    className={cn(
                      "p-1.5 rounded-lg border text-xs transition-colors cursor-pointer",
                      posto.exibir !== false
                        ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                        : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                    )}
                    title={posto.exibir !== false ? "Exibindo na escala" : "Oculto na escala"}
                  >
                    {posto.exibir !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>

                  {/* Editar */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPosto(posto);
                      setIsAdding(false);
                    }}
                    className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    title="Editar Posto e Funções"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Excluir com Confirmação */}
                  {confirmDeleteId === posto.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDeletePosto(posto.id)}
                        className="px-2 py-1 bg-red-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-red-700 cursor-pointer"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-1.5 py-1 bg-slate-200 text-slate-700 rounded-lg text-[9px] font-bold hover:bg-slate-300 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(posto.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir Posto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Corpo do Card: Funções da Guarnição */}
              <div className="p-4 sm:p-5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2 block">
                  Funções a Escalar no Posto:
                </span>
                <div className="flex flex-wrap gap-2">
                  {posto.funcoes && posto.funcoes.length > 0 ? (
                    posto.funcoes.map((fn, fIdx) => (
                      <span
                        key={fn.id || fIdx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-900 text-[10.5px] font-black tracking-wide shadow-2xs"
                      >
                        <Shield className="w-3 h-3 text-teal-600" />
                        {fn.nome}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      Nenhuma função cadastrada. Clique em editar para adicionar funções.
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
