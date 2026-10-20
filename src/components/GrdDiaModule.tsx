import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Plus, 
  Minus, 
  Trash2, 
  ArrowLeftRight, 
  Search, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle,
  UserPlus
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { parseRank, sortAllBySeniority } from '../lib/rankUtils';
import { RankInsignia } from './RankInsignia';
import { cn, normalizeObm, normalizeRg, cleanUndefined, normalizeAlaField } from '../lib/utils';
import { UserProfile } from '../types';

export interface GrdDiaModuleProps {
  obmContext: string;
  selectedDate: string;
  militars: any[];
  afastamentos?: any[];
  baseRoster?: any[];
  onGrdChange?: (rgs: string[], slotsCount: number) => void;
  onOpenPrintView?: () => void;
  readonly?: boolean;
  user?: UserProfile | null;
}

export function GrdDiaModule({
  obmContext,
  selectedDate,
  militars = [],
  afastamentos = [],
  baseRoster = [],
  onGrdChange,
  readonly = false
}: GrdDiaModuleProps) {
  // Normalize IDs
  const cleanObm = normalizeObm(obmContext || '10º GBM');
  const obmId = cleanObm.replace(/\//g, '_').replace(/\s/g, '_');
  
  const monthKey = useMemo(() => {
    try {
      if (!selectedDate) return format(new Date(), 'yyyy-MM');
      return format(parseISO(selectedDate), 'yyyy-MM');
    } catch {
      return format(new Date(), 'yyyy-MM');
    }
  }, [selectedDate]);

  const docId = `${obmId}_${monthKey}`;
  const localCacheKey = `escala_grd_vagas_${obmId}_${selectedDate}`;

  // State
  const [slotsCount, setSlotsCount] = useState<number>(() => {
    try {
      const cached = localStorage.getItem(localCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (typeof parsed.count === 'number') return parsed.count;
      }
    } catch {}
    return 4; // padrão 4 vagas
  });

  const [grdDayRgs, setGrdDayRgs] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem(localCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed.rgs)) return parsed.rgs;
      }
    } catch {}
    return ['', '', '', ''];
  });

  const [saving, setSaving] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAla, setFilterAla] = useState<string>('TODAS');

  // Listen to Firestore grd_configs for this month
  useEffect(() => {
    if (!docId || !selectedDate) return;

    // Fast initial fetch from backend API
    fetch(`/api/officer-scales?collection=grd_configs&docId=${docId}`)
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data) {
          const data = result.data;
          const serverRgs: string[] = data.days?.[selectedDate] || [];
          const savedSlotsCount: number = data.slots?.[selectedDate] !== undefined 
            ? data.slots[selectedDate] 
            : (data.vagas?.[selectedDate] !== undefined ? data.vagas[selectedDate] : serverRgs.length || 4);

          const count = Math.max(0, savedSlotsCount);
          const paddedRgs: string[] = Array.from({ length: count }, (_, i) => serverRgs[i] || '');

          setSlotsCount(count);
          setGrdDayRgs(paddedRgs);
          onGrdChange?.(paddedRgs, count);
        }
      })
      .catch(() => {});

    if (!db) return;
    const unsub = onSnapshot(doc(db, 'grd_configs', docId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const serverRgs: string[] = data.days?.[selectedDate] || [];
        const savedSlotsCount: number = data.slots?.[selectedDate] !== undefined 
          ? data.slots[selectedDate] 
          : (data.vagas?.[selectedDate] !== undefined ? data.vagas[selectedDate] : serverRgs.length || 4);

        const count = Math.max(0, savedSlotsCount);
        const paddedRgs: string[] = Array.from({ length: count }, (_, i) => serverRgs[i] || '');

        setSlotsCount(count);
        setGrdDayRgs(paddedRgs);

        // Notify parent
        onGrdChange?.(paddedRgs, count);

        // Cache locally
        try {
          localStorage.setItem(localCacheKey, JSON.stringify({ count, rgs: paddedRgs }));
        } catch {}
      }
    }, (err) => {
      console.warn("Aviso ao sincronizar GRD do dia:", err);
    });

    return () => unsub();
  }, [docId, selectedDate, localCacheKey]);

  // Persist helper
  const persistGrd = async (newRgs: string[], newCount: number) => {
    setGrdDayRgs(newRgs);
    setSlotsCount(newCount);
    onGrdChange?.(newRgs, newCount);

    try {
      localStorage.setItem(localCacheKey, JSON.stringify({ count: newCount, rgs: newRgs }));
    } catch {}

    const payload = cleanUndefined({
      days: {
        [selectedDate]: newRgs
      },
      slots: {
        [selectedDate]: newCount
      }
    });

    setSaving(true);
    try {
      // 1. Backend API persistence
      await fetch('/api/officer-scales/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionName: 'grd_configs',
          docId,
          data: payload,
          merge: true
        })
      }).catch(err => console.warn('[GrdDiaModule] Backend API warning:', err));

      // 2. Client setDoc for real-time reactivity
      if (db) {
        try {
          await setDoc(doc(db, 'grd_configs', docId), payload, { merge: true });
        } catch (dbErr) {
          console.warn('[GrdDiaModule] Client setDoc warning (handled):', dbErr);
        }
      }
    } catch (error) {
      console.error("Erro salvando vagas de GRD:", error);
    } finally {
      setSaving(false);
    }
  };

  // Change slot count
  const handleSetSlotsCount = async (count: number) => {
    const targetCount = Math.max(0, Math.min(12, count));
    let nextRgs = [...grdDayRgs];

    if (targetCount > nextRgs.length) {
      const diff = targetCount - nextRgs.length;
      nextRgs = [...nextRgs, ...Array(diff).fill('')];
    } else if (targetCount < nextRgs.length) {
      nextRgs = nextRgs.slice(0, targetCount);
    }

    await persistGrd(nextRgs, targetCount);
  };

  // Assign militar to slot
  const handleSelectMilitarForSlot = async (rg: string) => {
    if (activeSlotIndex === null) return;
    const cleanRg = normalizeRg(rg);
    const nextRgs = [...grdDayRgs];
    nextRgs[activeSlotIndex] = cleanRg;

    await persistGrd(nextRgs, slotsCount);
    setSearchModalOpen(false);
    setActiveSlotIndex(null);
    setSearchTerm('');
  };

  // Clear a specific slot
  const handleClearSlot = async (index: number) => {
    const nextRgs = [...grdDayRgs];
    nextRgs[index] = '';
    await persistGrd(nextRgs, slotsCount);
  };

  // Computed details
  const filledCount = grdDayRgs.filter(rg => Boolean(rg && rg.trim())).length;
  const emptyCount = Math.max(0, slotsCount - filledCount);

  // Militars map
  const militarsMap = useMemo(() => {
    const map = new Map<string, any>();
    militars.forEach(m => {
      map.set(normalizeRg(m.rg), m);
    });
    return map;
  }, [militars]);

  // Militars on duty in Ala today
  const baseRosterRgs = useMemo(() => {
    return new Set((baseRoster || []).map((m: any) => normalizeRg(m.rg || m.militar?.rg)));
  }, [baseRoster]);

  // Militars currently afastados
  const afastadosRgs = useMemo(() => {
    const set = new Set<string>();
    (afastamentos || []).forEach((a: any) => {
      if (selectedDate >= a.inicio && selectedDate <= a.retorno) {
        set.add(normalizeRg(a.rg));
      }
    });
    return set;
  }, [afastamentos, selectedDate]);

  // Filtered militars for selection
  const candidateMilitars = useMemo(() => {
    let list = [...militars];

    // Filter by ala
    if (filterAla !== 'TODAS') {
      list = list.filter(m => {
        const alaNorm = normalizeAlaField(m.ala);
        return alaNorm === filterAla;
      });
    }

    // Filter by search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(m => {
        const nameMatch = (m.name || '').toLowerCase().includes(term);
        const warMatch = (m.warName || '').toLowerCase().includes(term);
        const rgMatch = (m.rg || '').toString().includes(term);
        const rankMatch = (m.rank || '').toLowerCase().includes(term);
        return nameMatch || warMatch || rgMatch || rankMatch;
      });
    }

    return list.sort((a, b) => sortAllBySeniority(a, b));
  }, [militars, filterAla, searchTerm]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col transition-all">
      {/* HEADER COMPACTO DA SEÇÃO DE GRD */}
      <div className="p-2 sm:p-2.5 px-3 sm:px-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white">
        {/* Lado Esquerdo: Título e Status Resumido */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h3 className="text-xs font-black uppercase tracking-wider text-white truncate">
              Guarnição de Reforço (GRD)
            </h3>
            <span className="text-[9px] bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 px-1.5 py-0.2 rounded font-mono font-bold">
              {cleanObm}
            </span>
            <span className="text-[10px] text-cyan-200/90 font-medium">
              · {slotsCount === 0 ? (
                <span className="text-slate-400">Sem GRD</span>
              ) : (
                <>
                  <strong className="text-white font-bold">{filledCount}/{slotsCount}</strong> preenchida(s)
                  {emptyCount > 0 && <span className="text-amber-300 ml-1">({emptyCount} livre)</span>}
                </>
              )}
            </span>
          </div>
        </div>

        {/* Lado Direito: Controles Compactos de Vagas */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {/* Stepper de Vagas Compacto */}
          <div className="bg-white/10 border border-white/15 rounded-xl p-1 px-2 flex items-center gap-2 shadow-inner">
            <span className="text-[9px] font-black uppercase tracking-wider text-cyan-200">
              Vagas:
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleSetSlotsCount(slotsCount - 1)}
                disabled={readonly || slotsCount <= 0 || saving}
                className="w-5 h-5 rounded bg-white/15 hover:bg-white/25 disabled:opacity-30 text-white flex items-center justify-center transition-colors cursor-pointer text-xs"
                title="Reduzir 1 vaga"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              
              <span className="w-5 text-center font-black text-xs text-white font-mono leading-none">
                {slotsCount}
              </span>

              <button
                type="button"
                onClick={() => handleSetSlotsCount(slotsCount + 1)}
                disabled={readonly || slotsCount >= 12 || saving}
                className="w-5 h-5 rounded bg-white/15 hover:bg-white/25 disabled:opacity-30 text-white flex items-center justify-center transition-colors cursor-pointer text-xs"
                title="Adicionar 1 vaga"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Presets Rápidos Compactos */}
          <div className="flex items-center gap-1 bg-white/10 rounded-xl p-0.5 border border-white/15">
            {[0, 2, 4, 6].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleSetSlotsCount(num)}
                disabled={readonly || saving}
                className={cn(
                  "px-2 py-0.5 text-[9px] font-black rounded-lg transition-all cursor-pointer",
                  slotsCount === num
                    ? "bg-cyan-400 text-cyan-950 shadow-2xs"
                    : "text-white/80 hover:bg-white/15 hover:text-white"
                )}
                title={num === 0 ? "Sem GRD no dia" : `Definir ${num} vagas`}
              >
                {num === 0 ? '0' : `${num}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL COMPACTO: VAGAS DE GRD */}
      <div className="p-2 sm:p-2.5 bg-slate-50/60">
        {slotsCount === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-xl p-2 px-3 flex items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2 min-w-0">
              <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-[11px] font-medium truncate">
                Nenhuma vaga de GRD aberta hoje (escala constará como <em>"Sem GRD no dia"</em>).
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleSetSlotsCount(2)}
                className="bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-black text-[10px] uppercase px-2.5 py-1 rounded-lg transition-colors cursor-pointer border border-cyan-200"
              >
                + 2 Vagas
              </button>
              <button
                type="button"
                onClick={() => handleSetSlotsCount(4)}
                className="bg-sky-50 hover:bg-sky-100 text-sky-700 font-black text-[10px] uppercase px-2.5 py-1 rounded-lg transition-colors cursor-pointer border border-sky-200"
              >
                + 4 Vagas
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {Array.from({ length: slotsCount }).map((_, index) => {
              const rg = grdDayRgs[index] || '';
              const cleanRg = normalizeRg(rg);
              const militar = cleanRg ? militarsMap.get(cleanRg) : null;
              const isOccupied = Boolean(militar || cleanRg);

              if (!isOccupied) {
                // Card de Vaga Vazia Compacto
                return (
                  <div
                    key={index}
                    onClick={() => {
                      if (readonly || saving) return;
                      setActiveSlotIndex(index);
                      setSearchModalOpen(true);
                    }}
                    className="border border-dashed border-slate-300 hover:border-cyan-400 bg-white hover:bg-cyan-50/30 rounded-xl p-1.5 px-2.5 flex items-center justify-between gap-2 transition-all cursor-pointer group min-h-[46px]"
                    title="Clique para escalar militar nesta vaga"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 font-mono text-[9px] font-black flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400 group-hover:text-cyan-700 transition-colors truncate">
                        Vaga {index + 1} Livre
                      </span>
                    </div>

                    <span className="text-[9px] font-black uppercase text-cyan-700 bg-cyan-50 group-hover:bg-cyan-600 group-hover:text-white border border-cyan-200 group-hover:border-cyan-600 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all shrink-0">
                      <Plus className="w-2.5 h-2.5" /> Escalar
                    </span>
                  </div>
                );
              }

              // Card de Vaga Ocupada Compacto
              return (
                <div
                  key={index}
                  className="border border-cyan-200/90 bg-white hover:border-cyan-400 rounded-xl p-1.5 px-2.5 shadow-2xs flex items-center justify-between gap-2 transition-all min-h-[46px]"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="w-5 h-5 rounded-md bg-cyan-100 text-cyan-800 font-mono text-[9px] font-black flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    {militar?.rank && (
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        <RankInsignia rankStr={parseRank(militar.rank)} className="scale-[0.35] origin-center -ml-1" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[11px] font-black uppercase text-slate-900 truncate">
                          {parseRank(militar?.rank || '')} {militar?.warName || militar?.name || cleanRg}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[8.5px] text-slate-400 font-mono">
                        <span>RG: {cleanRg}</span>
                        {militar?.ala && (
                          <span className="text-indigo-600 font-bold uppercase font-sans">
                            · A{militar.ala}
                          </span>
                        )}
                        {baseRosterRgs.has(cleanRg) && (
                          <span className="text-amber-600 font-bold uppercase font-sans" title="Militar escalado na Ala hoje">
                            · Plantão
                          </span>
                        )}
                        {afastadosRgs.has(cleanRg) && (
                          <span className="text-rose-600 font-bold uppercase font-sans" title="Militar afastado">
                            · Afastado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações Compactas */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSlotIndex(index);
                        setSearchModalOpen(true);
                      }}
                      disabled={readonly || saving}
                      className="p-1 text-slate-400 hover:text-cyan-700 hover:bg-cyan-50 rounded transition-colors cursor-pointer"
                      title="Trocar por outro militar"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClearSlot(index)}
                      disabled={readonly || saving}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      title="Remover militar desta vaga"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE SELEÇÃO DE MILITAR */}
      {searchModalOpen && activeSlotIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                    Escalar para a Vaga {activeSlotIndex + 1} da GRD
                  </h3>
                  <p className="text-[9.5px] text-cyan-200/80 font-medium">
                    Selecione o militar que assumirá a vaga de reforço
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearchModalOpen(false);
                  setActiveSlotIndex(null);
                  setSearchTerm('');
                }}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Search & Filters */}
            <div className="p-3 border-b border-slate-100 bg-slate-50 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Buscar militar por nome de guerra, nome completo, posto ou RG..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2 pl-8 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Filtros por Ala */}
              <div className="flex items-center gap-1 flex-wrap text-[9.5px]">
                <span className="font-bold text-slate-400 uppercase tracking-wider mr-1">Filtrar:</span>
                {[
                  { id: 'TODAS', label: 'Todas' },
                  { id: '1', label: 'Ala 1' },
                  { id: '2', label: 'Ala 2' },
                  { id: '3', label: 'Ala 3' },
                  { id: '4', label: 'Ala 4' },
                  { id: 'EXP', label: 'Expediente' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilterAla(item.id)}
                    className={cn(
                      "px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer",
                      filterAla === item.id
                        ? "bg-cyan-600 text-white shadow-2xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Candidates List */}
            <div className="p-2 overflow-y-auto flex-1 divide-y divide-slate-100">
              {candidateMilitars.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  <p className="text-xs font-bold uppercase tracking-wider">Nenhum militar encontrado</p>
                  <p className="text-[10px] mt-1">Verifique o termo pesquisado ou altere o filtro de Ala</p>
                </div>
              ) : (
                candidateMilitars.map((m) => {
                  const mCleanRg = normalizeRg(m.rg);
                  const isAlreadyInGrd = grdDayRgs.some((rg, idx) => idx !== activeSlotIndex && normalizeRg(rg) === mCleanRg);
                  const isCurrentSlotMilitar = normalizeRg(grdDayRgs[activeSlotIndex]) === mCleanRg;
                  const isAfastado = afastadosRgs.has(mCleanRg);
                  const isBaseRoster = baseRosterRgs.has(mCleanRg);

                  return (
                    <div
                      key={m.rg || m.id}
                      onClick={() => {
                        if (isAlreadyInGrd) return;
                        handleSelectMilitarForSlot(m.rg);
                      }}
                      className={cn(
                        "p-2.5 rounded-xl flex items-center justify-between gap-2.5 transition-all cursor-pointer",
                        isCurrentSlotMilitar
                          ? "bg-cyan-50/80 border border-cyan-300"
                          : isAlreadyInGrd
                          ? "opacity-40 cursor-not-allowed bg-slate-50"
                          : "hover:bg-cyan-50/40 hover:border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                          <RankInsignia rankStr={parseRank(m.rank)} className="scale-[0.5] origin-center" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black uppercase text-slate-900">
                              {parseRank(m.rank)} {m.warName || m.name}
                            </span>
                            {m.ala && (
                              <span className="text-[8.5px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.2 rounded uppercase">
                                Ala {m.ala}
                              </span>
                            )}
                          </div>
                          <p className="text-[9.5px] text-slate-500 font-mono">
                            RG: {m.rg} {m.name && m.warName && m.name !== m.warName ? `· ${m.name}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isAlreadyInGrd && (
                          <span className="text-[8.5px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            Já nesta GRD
                          </span>
                        )}
                        {isBaseRoster && !isAlreadyInGrd && (
                          <span className="text-[8.5px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded" title="Militar escalado na Ala hoje">
                            Plantão Hoje
                          </span>
                        )}
                        {isAfastado && (
                          <span className="text-[8.5px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded" title="Militar possui afastamento nesta data">
                            Afastado
                          </span>
                        )}
                        {isCurrentSlotMilitar && (
                          <span className="text-[8.5px] font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded">
                            Atual
                          </span>
                        )}

                        <button
                          type="button"
                          disabled={isAlreadyInGrd}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase transition-all",
                            isAlreadyInGrd
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                              : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-2xs"
                          )}
                        >
                          Selecionar
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-2.5 sm:p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-[9.5px] text-slate-500 font-bold">
                {candidateMilitars.length} militar(es) disponível(is)
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearchModalOpen(false);
                  setActiveSlotIndex(null);
                  setSearchTerm('');
                }}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
