import React, { useState, useEffect, useMemo, useRef } from "react";
import { useMilitars } from "../contexts/MilitarContext";
import { PermutaRequest, PermutaStatus } from "../types";
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

import { parseRank } from "../lib/rankUtils";
import { RankInsignia } from "./RankInsignia";
import { EscalaPrintView } from "./EscalaPrintView";
import { RequestPermuta } from "./RequestPermuta";
import { AfastamentosAlaModule } from "./AfastamentosAlaModule";
import { Calendar as CalendarIcon, Users, ArrowRightLeft, ArrowRight, Shield, CheckCircle2, AlertCircle, Truck, ChevronDown, Check, X, Clock, Printer, Shuffle, Plus, Settings, Activity, TrendingDown, PieChart } from 'lucide-react';

import { motion } from "framer-motion";
import { cleanUndefined, getUserObmAccess, normalizeObm, getAlaForDate, cn, getAlaColor, getAlaName, formatMilitaryName, normalizeAlaField } from '../lib/utils';


const normalizeFnName = (s: string) => {
  if (!s) return "";
  return s.replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim().toUpperCase();
};

function FuncoesMultiSelect({
  selected,
  onChange,
  allowedOptions,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
  allowedOptions?: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');

  const allOptions = [
    'ADJUNTO', 'ENCARREGADO DE MOTORISTA', 'CONDUTOR AR', 'CONDUTOR ABSL', 'CONDUTOR ABT', 
    'CONDUTOR ASE', 'CONDUTOR ARC', 'CHEFE ABSL', 'CHEFE ABT', 'AUXILIAR/CHEFE ARC', 
    'AUXILIAR ABT', 'AUXILIAR ABSL', 'ENFERMEIRO', 'MESTRE L', 'MESTRE BIA', 
    'MARINHEIRO L', 'MARINHEIRO BIA', 'OPERADOR AMA', 'GV AMA', 'AUXILIAR RANCHO', 'TOQUE DE FOGO', 
    'DIA AO DEPOSITO', 'RESP FAXINA', 'ABASTECEDOR', 'SGT DIA', 'CMT GUARDA', 
    'CB GUARDA', 'CB DIA', 'COMUNICANTE', 'PRECARIO', 'ESCALANTE', 'PRECARIO ADM', 
    'SENTINELA'
  ];

  const options = search ? allOptions.filter(o => o.toLowerCase().includes(search.toLowerCase())) : allOptions;

  const qualifiedOptions = options.filter(o => allowedOptions?.includes(o) || selected.includes(o));
  const otherOptions = options.filter(o => !allowedOptions?.includes(o) && !selected.includes(o));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none text-[9px] font-black uppercase tracking-wider text-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 flex items-center justify-between min-w-[140px]"
      >
        <span className="truncate pr-2">
          {selected.length === 0 ? "-- SELECIONE --" : selected.join(", ")}
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-white border border-slate-200 rounded shadow-lg z-50 flex flex-col max-h-[300px]">
          <div className="p-2 border-b border-slate-100 sticky top-0 bg-slate-50/90 backdrop-blur z-10 shrink-0">
            <input 
              type="text" 
              placeholder="Buscar função..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[9px] uppercase tracking-wider outline-none focus:border-indigo-400"
            />
          </div>
          <div className="overflow-y-auto p-1 flex-1">
            {qualifiedOptions.length > 0 && (
               <>
                 <div className="px-2 py-1 text-[8px] font-black text-emerald-600 bg-emerald-50 rounded uppercase tracking-widest mt-1 mb-1">
                    Qualificado / Atual
                 </div>
                 {qualifiedOptions.map((opt) => (
                   <button
                     key={opt}
                     onClick={() => {
                       if (selected.includes(opt))
                         onChange(selected.filter((x) => x !== opt));
                       else onChange([...selected, opt]);
                     }}
                     className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded w-full"
                   >
                     <span className="text-[9px] font-black uppercase tracking-wider text-slate-700">
                       {opt}
                     </span>
                     {selected.includes(opt) && (
                       <Check className="w-3 h-3 text-indigo-600 shrink-0 ml-1" />
                     )}
                   </button>
                 ))}
               </>
            )}
            
            {otherOptions.length > 0 && (
               <>
                 <div className="px-2 py-1 text-[8px] font-black text-slate-400 bg-slate-50 rounded uppercase tracking-widest mt-2 mb-1">
                    Outras Funções
                 </div>
                 {otherOptions.map((opt) => (
                   <button
                     key={opt}
                     onClick={() => {
                       if (selected.includes(opt))
                         onChange(selected.filter((x) => x !== opt));
                       else onChange([...selected, opt]);
                     }}
                     className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded w-full opacity-60 hover:opacity-100 transition-opacity"
                   >
                     <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                       {opt}
                     </span>
                     {selected.includes(opt) && (
                       <Check className="w-3 h-3 text-indigo-600 shrink-0 ml-1" />
                     )}
                   </button>
                 ))}
               </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { UserProfile } from "../types";

interface EscalaEspelhoModuleProps {
  obmContext: string;
  user: UserProfile;
}

const DEFAULT_VIATURAS: any[] = [
  { id: "ABT-183", vtr: "ABT-183", ativa: true, exibir: true, maritima: false, condutor: true, g1: true, g2: true, g3: true, g4: false, cg: true, blocked: [] },
  { id: "ABSL-152", vtr: "ABSL-152", ativa: true, exibir: true, maritima: false, condutor: true, g1: true, g2: true, g3: false, g4: false, cg: true, blocked: [] },
  { id: "ASE-404", vtr: "ASE-404", ativa: true, exibir: true, maritima: false, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "ARC-162", vtr: "ARC-162", ativa: true, exibir: true, maritima: false, condutor: true, g1: true, g2: null, g3: null, g4: null, cg: null, blocked: ["g2", "g3", "g4", "cg"] },
  { id: "AR-583", vtr: "AR-583", ativa: true, exibir: true, maritima: false, condutor: true, g1: null, g2: null, g3: null, g4: null, cg: null, blocked: ["g1", "g2", "g3", "g4", "cg"] },
  { id: "L-09", vtr: "L-09", ativa: true, exibir: true, maritima: true, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "BIA-006", vtr: "BIA-006", ativa: true, exibir: true, maritima: true, condutor: true, g1: true, g2: true, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "BIA-013", vtr: "BIA-013", ativa: false, exibir: false, maritima: true, condutor: false, g1: false, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "ABT-12", vtr: "ABT-12", ativa: false, exibir: false, maritima: false, condutor: false, g1: false, g2: false, g3: false, g4: false, cg: false, blocked: [] },
];

export function EscalaEspelhoModule({ obmContext, user }: EscalaEspelhoModuleProps) {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const { militars, loading: militarsLoading } = useMilitars();
  const [permutas, setPermutas] = useState<PermutaRequest[]>([]);
  const [afastamentos, setAfastamentos] = useState<any[]>([]);
  const [isPermutaModalOpen, setIsPermutaModalOpen] = useState(false);
  const [loadingPermutas, setLoadingPermutas] = useState(false);
  const [manuallyAddedRgs, setManuallyAddedRgs] = useState<Record<string, string[]>>({});
  const [expedienteRgs, setExpedienteRgs] = useState<string[]>([]);
  const [addMilitarSearch, setAddMilitarSearch] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [extraMilitars, setExtraMilitars] = useState<any[]>([]);

  useEffect(() => {
    if (addMilitarSearch.length >= 2) {
      const delay = setTimeout(() => {
        fetch(`/api/militar/search?q=${encodeURIComponent(addMilitarSearch)}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.militaries) {
              setGlobalSearchResults(data.militaries);
            }
          })
          .catch(err => console.error("Global search failed:", err));
      }, 400);
      return () => clearTimeout(delay);
    } else {
      setGlobalSearchResults([]);
    }
  }, [addMilitarSearch]);
  const addMenuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!selectedDate || !obmContext || obmContext === 'GLOBAL') {
        setExpedienteRgs([]);
        return;
    }
    const normalizedObm = obmContext.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const monthKey = selectedDate.substring(0, 7); // yyyy-MM
    
    const docRef = doc(db, `expediente_${normalizedObm}`, monthKey);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
         const data = docSnap.data();
         const sels = data.selections || {};
         const rgsInDay: string[] = [];
         
         Object.keys(sels).forEach(rg => {
            if (rg === 'ESCALANTE_PREF') return;
            const days = sels[rg] || [];
            if (days.includes(selectedDate)) {
               rgsInDay.push(rg);
            }
         });
         setExpedienteRgs(rgsInDay);
      } else {
         setExpedienteRgs([]);
      }
    });
    
    return () => unsub();
  }, [selectedDate, obmContext]);

  const [selectedFunctions, setSelectedFunctions] = useState<
    Record<string, string[]>
  >({});

  const [viaturasInfo, setViaturasInfo] = useState<any[]>(DEFAULT_VIATURAS);

  const isFirstLoad = useRef(true);
  const previousDate = useRef(selectedDate);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showPrintView, setShowPrintView] = useState(false);
  const [correlation, setCorrelation] = useState<Record<string, Record<string, number>>>({});
  const [roleQtds, setRoleQtds] = useState<Record<string, number>>({});
  const [predefinicoes, setPredefinicoes] = useState<Record<string, string[]>>({});
  const [isPreferenciasModalOpen, setIsPreferenciasModalOpen] = useState(false);

  // Load correlation matrix, quantities and predefinicoes
  useEffect(() => {
    if (!obmContext || obmContext === 'GLOBAL') return;
    const loadSettings = async () => {
      try {
        const docRef = doc(db, "obm_settings", obmContext);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.escala_regras) {
            setCorrelation(data.escala_regras.correlation || {});
            setRoleQtds(data.escala_regras.qtds || {});
          } else {
            setCorrelation({});
            setRoleQtds({});
          }
          if (data.escala_preferencias) {
            setPredefinicoes(data.escala_preferencias || {});
          } else {
            setPredefinicoes({});
          }
        } else {
          setCorrelation({});
          setRoleQtds({});
          setPredefinicoes({});
        }
      } catch (e) {
        console.error("Error loading obm settings", e);
      }
    };
    loadSettings();
  }, [obmContext]);

  // Sync state from Firebase when date changes
  useEffect(() => {
    if (!selectedDate || !obmContext || obmContext === 'GLOBAL') return;
    
    // Reset state locally if date changed
    if (previousDate.current !== selectedDate) {
       setSelectedFunctions({});
       setManuallyAddedRgs({});
       setViaturasInfo(DEFAULT_VIATURAS);
       previousDate.current = selectedDate;
       isFirstLoad.current = true;
    }
    
    const normalizedObm = obmContext.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const docRef = doc(db, `escala24h_${normalizedObm}`, selectedDate);
    
    let isMounted = true;
    const loadState = async () => {
       try {
           const snap = await getDoc(docRef);
           let savedViaturas: any[] | null = null;

           if (snap.exists() && isMounted) {
               const data = snap.data();
               if (data.selectedFunctions) setSelectedFunctions(data.selectedFunctions);
               if (data.manuallyAddedRgs) {
                   setManuallyAddedRgs(prev => ({...prev, [selectedDate]: data.manuallyAddedRgs}));
               }
               if (data.viaturasInfo) {
                   savedViaturas = data.viaturasInfo;
               }
           }
           
           if (isMounted) {
               const settingsRef = doc(db, "obm_settings", obmContext);
               const settingsSnap = await getDoc(settingsRef);
               let baseVtrs = DEFAULT_VIATURAS;
               
               if (settingsSnap.exists() && settingsSnap.data()?.viaturas_config) {
                   const vtrs = settingsSnap.data().viaturas_config;
                   const filtered = vtrs.filter((v: any) => 
                       v.tipo !== 'administrativa' && 
                       (!v.obm || normalizeObm(v.obm) === normalizeObm(obmContext))
                   );
                   if (filtered.length > 0) baseVtrs = filtered;
               }

               if (savedViaturas) {
                   const merged = baseVtrs.map(base => {
                       const saved = savedViaturas!.find((s: any) => s.id === base.id);
                       if (saved) {
                           return { 
                               ...base, 
                               ativa: saved.ativa !== undefined ? saved.ativa : base.ativa,
                               condutor: saved.condutor !== undefined ? saved.condutor : base.condutor,
                               g1: saved.g1 !== undefined ? saved.g1 : base.g1,
                               g2: saved.g2 !== undefined ? saved.g2 : base.g2,
                               g3: saved.g3 !== undefined ? saved.g3 : base.g3,
                               g4: saved.g4 !== undefined ? saved.g4 : base.g4,
                               cg: saved.cg !== undefined ? saved.cg : base.cg
                           };
                       }
                       return base;
                   });
                   setViaturasInfo(merged);
               } else {
                   setViaturasInfo(baseVtrs);
               }
               
               isFirstLoad.current = false;
           }
       } catch (e) {
           console.error("Error loading escala24h state:", e);
           if (isMounted) isFirstLoad.current = false;
       }
    };
    
    loadState();
    
    return () => { isMounted = false; };
  }, [selectedDate, obmContext]);

  // Auto-save state to Firebase
  useEffect(() => {
    if (isFirstLoad.current) return;
    if (!selectedDate || !obmContext || obmContext === 'GLOBAL') return;
    
    setSavingState('saving');
    const timeout = setTimeout(async () => {
      try {
          const normalizedObm = obmContext.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
          const docRef = doc(db, `escala24h_${normalizedObm}`, selectedDate);
          await setDoc(docRef, {
             selectedFunctions,
             viaturasInfo,
             manuallyAddedRgs: manuallyAddedRgs[selectedDate] || []
          });
          
          setSavingState('saved');
          setTimeout(() => setSavingState('idle'), 2000);
      } catch(e) {
          console.error("Error saving escala24h state:", e);
          setSavingState('idle');
      }
    }, 1000);
    
    return () => clearTimeout(timeout);
  }, [selectedFunctions, viaturasInfo, manuallyAddedRgs, selectedDate, obmContext]);

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingPermutas(true);
    const qDate = query(
      collection(db, "permutas"),
      where("date", "==", selectedDate)
    );

    const unsubPermutas = onSnapshot(qDate, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PermutaRequest[];
      const filtered = data.filter(
        (p) => (!p.obm || getUserObmAccess(normalizeObm(obmContext), normalizeObm(obmContext) === 'GLOBAL').includes(normalizeObm(p.obm))) && p.status !== "cancelled"
      );
      setPermutas(filtered);
      setLoadingPermutas(false);
    });

    const qAfast = query(
      collection(db, "afastamentos_alas"),
      where("obm", "==", normalizeObm(obmContext))
    );

    const unsubAfast = onSnapshot(qAfast, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAfastamentos(data);
    });

    return () => {
      unsubPermutas();
      unsubAfast();
    };
  }, [selectedDate, obmContext]);

  // Sincroniza funções pré-definidas nas permutas quando elas carregam
  const autoFilledPermutas = useRef(new Set<string>());

  useEffect(() => {
    if (permutas.length > 0) {
      setSelectedFunctions(prev => {
        const next = { ...prev };
        let changed = false;
        permutas.forEach(p => {
          if (p.id && !autoFilledPermutas.current.has(p.id) && p.status === 'accepted' && p.substituteFunctions && p.substituteFunctions.length > 0 && p.requesterRg) {
            // Só aplica se ainda não houver função definida manualmente para este RG nesta sessão ou se queremos que a permuta mande
            // Como é um dashboard de triagem, faz sentido a permuta mandar no valor inicial
            if (!next[p.requesterRg] || next[p.requesterRg].length === 0) {
               next[p.requesterRg] = p.substituteFunctions;
               changed = true;
               autoFilledPermutas.current.add(p.id);
            }
          }
        });
        return changed ? next : prev;
      });
    }
  }, [permutas]);

  const handleStatusChange = async (permuta: PermutaRequest, newStatus: PermutaStatus) => {
    if (!permuta.id) return;
    try {
      await updateDoc(doc(db, "permutas", permuta.id), cleanUndefined({
              status: newStatus,
              updatedAt: serverTimestamp()
            }));
    } catch (error) {
      console.error("Update Status Error:", error);
    }
  };

  const targetDateObj = parseISO(selectedDate);
  const identifiedAla = getAlaForDate(targetDateObj);
  const identifiedAlaStr = identifiedAla.toString();

  // Base Roster for the identified Ala
  const baseRoster = useMemo(() => {
    const manualRgs = manuallyAddedRgs[selectedDate] || [];
    const allMilitarsPool = [...militars, ...extraMilitars];
    // Remove duplicates
    const uniquePool = Array.from(new Map(allMilitarsPool.map(m => [m.rg, m])).values());
    
    return uniquePool
      .filter((m) => {
        const rawObm = m.obm ? m.obm.trim().toUpperCase() : "10º GBM";
        const ctx = (obmContext || "").trim().toUpperCase();
        const isInCtx = ctx === "GLOBAL" || rawObm === ctx;
        
        const isActive = !m.situacao || m.situacao.trim().toUpperCase().startsWith('ATIVO');

        const isAla = isInCtx && normalizeAlaField(m.ala) === identifiedAlaStr;
        const isManual = manualRgs.includes(m.rg || '');
        const isExpediente = isInCtx && expedienteRgs.includes(m.rg || '');
        
        if (!isActive && !isManual) return false;
        if (!isAla && !isManual && !isExpediente) return false;
        
        // Verifica se há afastamento para o militar na data selecionada
        const hasAfastamento = afastamentos.some((a) => {
          if (a.rg === m.rg) {
             return selectedDate >= a.inicio && selectedDate <= a.retorno;
          }
          return false;
        });

        return !hasAfastamento;
      })
      .sort((a, b) => {
        const isManualA = manualRgs.includes(a.rg || '');
        const isManualB = manualRgs.includes(b.rg || '');
        
        if (isManualA && !isManualB) return 1;
        if (!isManualA && isManualB) return -1;

        const rgA = parseInt((a.rg || "").replace(/\D/g, "") || "0");
        const rgB = parseInt((b.rg || "").replace(/\D/g, "") || "0");
        return rgA - rgB;
      });
  }, [militars, extraMilitars, identifiedAlaStr, afastamentos, selectedDate, manuallyAddedRgs, expedienteRgs, obmContext]);

  // Map to easily find if a militar is swapping out
  const permutasOut = useMemo(() => {
    const map = new Map<string, PermutaRequest>();
    permutas.forEach((p) => {
      if (p.requesterRg) map.set(p.requesterRg, p);
    });
    return map;
  }, [permutas]);

  // Mostruario Generator
  const getMostruario = (militar: any) => {
    const funcs = [];
    
    if (militar.ativoCondutor) {
      funcs.push("CONDUTOR");
      if (militar.ativoEncarregado) funcs.push("ENC MOTORISTA");
      if (militar.ativoAbastecedor) funcs.push("ABASTECEDOR");
    }
    
    if (militar.ativoChefeGua) {
      funcs.push("CHEFE GUA");
      if (militar.chefeAbsl) funcs.push("CHEFE ABSL");
      if (militar.chefeAbt) funcs.push("CHEFE ABT");
    }
    
    if (militar.ativoAuxiliar) {
      funcs.push("AUX GUA");
      if (militar.auxAbt) funcs.push("AUX ABT");
      if (militar.auxAbsl) funcs.push("AUX ABSL");
      if (militar.auxArc) funcs.push("AUX ARC");
      if (militar.auxAse) funcs.push("AUX ASE");
    }
    
    if (militar.ativoEnfermeiro) {
      funcs.push("ENFERMEIRO");
    }
    
    if (militar.ativoMaritimo) {
      funcs.push("MARITIMO");
      if (militar.mestreAl) funcs.push("MESTRE L");
      if (militar.mestreBia) funcs.push("MESTRE BIA");
      if (militar.marinheiros) {
        funcs.push("MARINHEIRO L");
        funcs.push("MARINHEIRO BIA");
      }
      if (militar.opAma) funcs.push("OP AMA");
      if (militar.gvAma) funcs.push("GV AMA");
    }
    
    if (militar.ativoGraduado) {
      if (militar.adjunto) funcs.push("ADJUNTO");
      if (militar.sgtDia) funcs.push("SGT DIA");
      if (militar.cmtGuarda) funcs.push("CMT GUARDA");
      if (militar.disponivel1) funcs.push("DISP 1");
      if (militar.disponivel2) funcs.push("DISP 2");
    }
    
    if (militar.ativoCbsSds) {
      if (militar.cbGuarda) funcs.push("CB GUARDA");
      if (militar.cbDia) funcs.push("CB DIA");
      if (militar.sentinela) funcs.push("SENTINELA");
      if (militar.auxRancho) funcs.push("AUX RANCHO");
      if (militar.toqueDeFogo) funcs.push("T. FOGO");
      if (militar.deposito) funcs.push("DEPOSITO");
      if (militar.faxina) funcs.push("FAXINA");
      if (militar.disponivelCbsSds) funcs.push("DISP");
    }
    
    if (militar.ativoComunicante) {
      funcs.push("COMUNICANTE");
    }

    return funcs.join(", ") || "NÃO CONFIGURADO";
  };

  const getAllowedOptions = (militar: any) => {
    if (!militar) return undefined;
    const allowed = new Set<string>();
    
    if (militar.ativoCondutor) {
      allowed.add('CONDUTOR');
      if (militar.ativoEncarregado) allowed.add('ENCARREGADO DE MOTORISTA');
      if (militar.ativoAbastecedor) allowed.add('ABASTECEDOR');
      
      if (militar.viaturas?.AR) allowed.add('CONDUTOR AR');
      if (militar.viaturas?.ABSL) allowed.add('CONDUTOR ABSL');
      if (militar.viaturas?.ABT) allowed.add('CONDUTOR ABT');
      if (militar.viaturas?.ASE) allowed.add('CONDUTOR ASE');
      if (militar.viaturas?.ARC) allowed.add('CONDUTOR ARC');
    }
    
    if (militar.ativoChefeGua) {
      allowed.add('CHEFE GUA');
      if (militar.chefeAbsl) allowed.add('CHEFE ABSL');
      if (militar.chefeAbt) allowed.add('CHEFE ABT');
      allowed.add('AUXILIAR/CHEFE ARC');
    }
    
    if (militar.ativoAuxiliar) {
      allowed.add('AUXILIAR GUA');
      if (militar.auxAbt) allowed.add('AUXILIAR ABT');
      if (militar.auxAbsl) allowed.add('AUXILIAR ABSL');
      if (militar.auxArc) allowed.add('AUXILIAR/CHEFE ARC');
      if (militar.auxAse) allowed.add('AUXILIAR ASE');
    }
    
    if (militar.ativoEnfermeiro) {
      allowed.add('ENFERMEIRO');
    }
    
    if (militar.ativoMaritimo) {
      if (militar.mestreAl) allowed.add('MESTRE L');
      if (militar.mestreBia) allowed.add('MESTRE BIA');
      if (militar.marinheiros) {
        allowed.add('MARINHEIRO L');
        allowed.add('MARINHEIRO BIA');
      }
      if (militar.opAma) allowed.add('OPERADOR AMA');
      if (militar.gvAma) allowed.add('GV AMA');
    }
    
    if (militar.ativoGraduado) {
      if (militar.adjunto) allowed.add('ADJUNTO');
      if (militar.sgtDia) allowed.add('SGT DIA');
      if (militar.cmtGuarda) allowed.add('CMT GUARDA');
      if (militar.disponivel1) allowed.add('DISPONIVEL 1');
      if (militar.disponivel2) allowed.add('DISPONIVEL 2');
    }
    
    if (militar.ativoCbsSds) {
      if (militar.cbGuarda) allowed.add('CB GUARDA');
      if (militar.cbDia) allowed.add('CB DIA');
      if (militar.sentinela) allowed.add('SENTINELA');
      if (militar.auxRancho) allowed.add('AUXILIAR RANCHO');
      if (militar.toqueDeFogo) allowed.add('TOQUE DE FOGO');
      if (militar.deposito) allowed.add('DIA AO DEPOSITO');
      if (militar.faxina) allowed.add('RESP FAXINA');
      if (militar.disponivelCbsSds) allowed.add('DISPONIVEL CBS/SDS');
    }
    
    if (militar.ativoComunicante) {
      allowed.add('COMUNICANTE');
    }
    
    if (militar.isEscalante) {
      allowed.add('ESCALANTE');
    }

    
    const allowedArr = Array.from(allowed);
    viaturasInfo.forEach(v => {
      if (!v.ativa) return;
      ['condutor', 'g1', 'g2', 'g3', 'g4', 'cg'].forEach(slot => {
         if (v.customNames?.[slot]?.trim()) {
            const baseName = getDefaultName(v, slot);
            if (allowedArr.includes(baseName)) {
               allowed.add(getSlotDisplayName(v, slot));
            }
         }
      });
    });
    return Array.from(allowed);

  };

  
  const isVtrType = (vtrName: string, prefix: string) => {
    const name = (vtrName || "").trim().toUpperCase();
    const p = prefix.trim().toUpperCase();
    if (p === 'AR-' || p === 'AR') return (name.startsWith('AR-') || name.startsWith('AR ') || name === 'AR') && !name.startsWith('ARC');
    if (p === 'L-' || p === 'L') return name.startsWith('L-') || name.startsWith('L ') || name === 'L';
    if (p === 'BIA-' || p === 'BIA') return name.startsWith('BIA');
    return name.startsWith(p) || name.includes(p);
  };

  const isMaritima = (v: any) => {
    if (v.maritima !== undefined) return v.maritima;
    return isVtrType(v.vtr, "L-") || isVtrType(v.vtr, "BIA-");
  };

  const getDefaultName = (v: any, slot: string) => {
    const vtrName = (v.vtr || "").toUpperCase();
    const maritima = isMaritima(v);
    
    if (slot === 'condutor') {
      if (maritima) return vtrName.startsWith('BIA') ? 'MESTRE BIA' : 'MESTRE L';
      if (isVtrType(vtrName, 'AR')) return 'CONDUTOR AR';
      if (isVtrType(vtrName, 'ABSL')) return 'CONDUTOR ABSL';
      if (isVtrType(vtrName, 'ABT')) return 'CONDUTOR ABT';
      if (isVtrType(vtrName, 'ASE')) return 'CONDUTOR ASE';
      if (isVtrType(vtrName, 'ARC')) return 'CONDUTOR ARC';
      return 'CONDUTOR';
    }
    if (slot === 'cg') {
      if (isVtrType(vtrName, 'ABSL')) return 'CHEFE ABSL';
      if (isVtrType(vtrName, 'ABT')) return 'CHEFE ABT';
      if (isVtrType(vtrName, 'ARC')) return 'AUXILIAR/CHEFE ARC';
      return 'CHEFE GUA';
    }
    // Auxiliares (g1, g2, g3, g4)
    if (maritima) return vtrName.startsWith('BIA') ? 'MARINHEIRO BIA' : 'MARINHEIRO L';
    return 'AUXILIAR GUA';
  };

  const getSlotDisplayName = (v: any, slot: string) => {
    if (v.customNames?.[slot]?.trim()) {
      const custom = v.customNames[slot].trim().toUpperCase();
      const sigla = (v.vtr || "").split('-')[0].trim();
      if (custom === 'ENFERMEIRO') return 'ENFERMEIRO';
      if (custom === 'AUXILIAR/CHEFE ARC' || custom === 'AUXILIAR / CHEFE ARC') return 'AUXILIAR/CHEFE ARC';
      if (custom === 'MESTRE L' || custom === 'MESTRE BIA') return custom;
      if (custom.endsWith(sigla)) return custom;
      if (slot === 'cg' && custom === 'CHEFE') return `CHEFE ${sigla}`;
      return `${custom} ${sigla}`.trim();
    }
    return getDefaultName(v, slot);
  };

  
  const dynamicRequirements = useMemo(() => {
    let reqs: {name: string, genericName: string, req: number, category: string}[] = [
      { name: "ADJUNTO", genericName: "ADJUNTO", req: roleQtds["ADJUNTO"] ?? 1, category: 'admin' },
      { name: "ENCARREGADO DE MOTORISTA", genericName: "ENCARREGADO DE MOTORISTA", req: roleQtds["ENCARREGADO DE MOTORISTA"] ?? 1, category: 'admin' },
    ];
    
    const vtrReqs: Record<string, {req: number, category: string, genericName: string}> = {};
    viaturasInfo.forEach(v => {
      if (!v.ativa) return;
      ['condutor', 'g1', 'g2', 'g3', 'g4', 'cg'].forEach(slot => {
        if (v[slot as keyof typeof v] === true) {
          const roleName = getSlotDisplayName(v, slot);
          let cat = 'auxiliar';
          const isMar = isMaritima(v);
          if (slot === 'condutor') cat = isMar ? 'condutor_maritimo' : 'condutor';
          else if (slot === 'cg') cat = isMar ? 'chefe_maritimo' : 'chefe';
          else cat = isMar ? 'auxiliar_maritimo' : 'auxiliar';
          
          const genericName = getDefaultName(v, slot);
          if (!vtrReqs[roleName]) {
             vtrReqs[roleName] = { req: 0, category: cat, genericName };
          }
          vtrReqs[roleName].req += 1;
        }
      });
    });

    Object.entries(vtrReqs).forEach(([name, data]) => {
      reqs.push({ name, genericName: data.genericName, req: data.req, category: data.category });
    });

    reqs.push({ name: "AUXILIAR RANCHO", genericName: "AUXILIAR RANCHO", req: roleQtds["AUXILIAR RANCHO"] ?? 1, category: 'admin' });
    reqs.push({ name: "TOQUE DE FOGO", genericName: "TOQUE DE FOGO", req: roleQtds["TOQUE DE FOGO"] ?? 1, category: 'admin' });
    reqs.push({ name: "DIA AO DEPOSITO", genericName: "DIA AO DEPOSITO", req: roleQtds["DIA AO DEPOSITO"] ?? 2, category: 'admin' });
    reqs.push({ name: "RESP FAXINA", genericName: "RESP FAXINA", req: roleQtds["RESP FAXINA"] ?? 1, category: 'admin' });
    reqs.push({ name: "ABASTECEDOR", genericName: "ABASTECEDOR", req: roleQtds["ABASTECEDOR"] ?? 1, category: 'admin' });

    reqs.push({ name: "SGT DIA", genericName: "SGT DIA", req: roleQtds["SGT DIA"] ?? 1, category: 'admin' });
    reqs.push({ name: "CMT GUARDA", genericName: "CMT GUARDA", req: roleQtds["CMT GUARDA"] ?? 1, category: 'admin' });
    reqs.push({ name: "CB GUARDA", genericName: "CB GUARDA", req: roleQtds["CB GUARDA"] ?? 1, category: 'admin' });
    reqs.push({ name: "CB DIA", genericName: "CB DIA", req: roleQtds["CB DIA"] ?? 1, category: 'admin' });
    reqs.push({ name: "COMUNICANTE", genericName: "COMUNICANTE", req: roleQtds["COMUNICANTE"] ?? 2, category: 'admin' });
    reqs.push({ name: "ESCALANTE", genericName: "ESCALANTE", req: roleQtds["ESCALANTE"] ?? 1, category: 'admin' });
    reqs.push({ name: "SENTINELA", genericName: "SENTINELA", req: roleQtds["SENTINELA"] ?? 4, category: 'admin' });

    return reqs;

  }, [viaturasInfo, roleQtds]);

  
  const estudoTecnico = useMemo(() => {
    const realRoster = baseRoster.map(m => {
       const isSwapped = permutasOut.has(m.rg || '');
       return isSwapped ? (militars.find(x => x.rg === permutasOut.get(m.rg || '')?.substituteRg) || m) : m;
    });

    const allSlots: {name: string, genericName: string, category: string}[] = [];
    dynamicRequirements.forEach(req => {
      for (let i = 0; i < req.req; i++) {
        allSlots.push({ name: req.name, genericName: req.genericName, category: req.category });
      }
    });

    const militarCapabilities = realRoster.map(m => ({
      rg: m.rg || '',
      rank: m.rank || '',
      allowed: getAllowedOptions(m) || [],
      assignedRoles: [] as string[]
    }));

    const slotOptionsCount = allSlots.map(slot => {
       const count = militarCapabilities.filter(m => m.allowed.includes(slot.genericName)).length;
       return { slot, count };
    });

    // Sort strategy for predictive assignment:
    // 1. Priority to Operational over Admin
    // 2. Fewest capable militars first (fill hardest slots first)
    slotOptionsCount.sort((a, b) => {
       const aIsAdmin = a.slot.category === 'admin';
       const bIsAdmin = b.slot.category === 'admin';
       if (aIsAdmin && !bIsAdmin) return 1;
       if (!aIsAdmin && bIsAdmin) return -1;
       return a.count - b.count;
    });

    const unfulfilledSlots: {name: string, category: string}[] = [];
    
    let reqCondutores = 0, reqCondutoresMaritimos = 0, reqChefes = 0, reqChefesMaritimos = 0, reqAuxiliares = 0, reqAuxiliaresMaritimos = 0, reqAdmin = 0;
    let unfulfilledCondutores = 0, unfulfilledCondutoresMaritimos = 0, unfulfilledChefes = 0, unfulfilledChefesMaritimos = 0, unfulfilledAuxiliares = 0, unfulfilledAuxiliaresMaritimos = 0, unfulfilledAdmin = 0;
    let reqEfetivo = allSlots.length;
    let unfulfilledEfetivo = 0;

    slotOptionsCount.forEach(({ slot }) => {
       if (slot.category === 'admin') reqAdmin++;
       else if (slot.category === 'condutor') reqCondutores++;
       else if (slot.category === 'condutor_maritimo') reqCondutoresMaritimos++;
       else if (slot.category === 'chefe') reqChefes++;
       else if (slot.category === 'chefe_maritimo') reqChefesMaritimos++;
       else if (slot.category === 'auxiliar') reqAuxiliares++;
       else if (slot.category === 'auxiliar_maritimo') reqAuxiliaresMaritimos++;

       const available = militarCapabilities.filter(m => { 
          if (!m.allowed.includes(slot.genericName)) return false; 
          if (m.assignedRoles.includes(slot.genericName)) return false; 
          for (const role of m.assignedRoles) { 
             const isSentinelaAux = (
                (slot.genericName === 'SENTINELA' && ['AUXILIAR ABT', 'AUXILIAR ABSL', 'AUXILIAR/CHEFE ARC'].includes(role)) ||
                (role === 'SENTINELA' && ['AUXILIAR ABT', 'AUXILIAR ABSL', 'AUXILIAR/CHEFE ARC'].includes(slot.genericName))
             );
             
             if (isSentinelaAux) {
                const arcRole = slot.genericName === 'AUXILIAR/CHEFE ARC' || role === 'AUXILIAR/CHEFE ARC';
                if (arcRole) {
                   if (m.rank === 'Soldado') continue;
                } else {
                   continue;
                }
             }

             const val1 = correlation[slot.genericName]?.[role] ?? 0; 
             const val2 = correlation[role]?.[slot.genericName] ?? 0; 
             if (val1 === 0 || val2 === 0) return false; 
          } 
          return true; 
       });

       if (available.length > 0) { 
          // Advanced Selection: Pick the most specialized militar available (fewest total allowed roles)
          available.sort((a, b) => {
              if (a.allowed.length !== b.allowed.length) return a.allowed.length - b.allowed.length;
              return a.assignedRoles.length - b.assignedRoles.length;
          });
          available[0].assignedRoles.push(slot.genericName);
       } else {
          unfulfilledSlots.push(slot);
       }
    });

    unfulfilledSlots.forEach(slot => {
       unfulfilledEfetivo++;
       if (slot.category === 'admin') unfulfilledAdmin++;
       else if (slot.category === 'condutor') unfulfilledCondutores++;
       else if (slot.category === 'condutor_maritimo') unfulfilledCondutoresMaritimos++;
       else if (slot.category === 'chefe') unfulfilledChefes++;
       else if (slot.category === 'chefe_maritimo') unfulfilledChefesMaritimos++;
       else if (slot.category === 'auxiliar') unfulfilledAuxiliares++;
       else if (slot.category === 'auxiliar_maritimo') unfulfilledAuxiliaresMaritimos++;
    });

    const calcChance = (deficit: number, req: number) => req > 0 ? Math.min(100, Math.round((deficit / req) * 100)) : 0;

    let unfulfilledOperacional = unfulfilledCondutores + unfulfilledCondutoresMaritimos + unfulfilledChefes + unfulfilledChefesMaritimos + unfulfilledAuxiliares + unfulfilledAuxiliaresMaritimos;
    let reqOperacional = reqCondutores + reqCondutoresMaritimos + reqChefes + reqChefesMaritimos + reqAuxiliares + reqAuxiliaresMaritimos;

    return {
      efetivoOperacional: { req: reqOperacional, deficit: unfulfilledOperacional, chance: calcChance(unfulfilledOperacional, reqOperacional) },
      efetivoAdministrativo: { req: reqAdmin, deficit: unfulfilledAdmin, chance: calcChance(unfulfilledAdmin, reqAdmin) },
      efetivo: { req: reqEfetivo, deficit: unfulfilledEfetivo, chance: calcChance(unfulfilledEfetivo, reqEfetivo) },
      condutores: { req: reqCondutores, deficit: unfulfilledCondutores, chance: calcChance(unfulfilledCondutores, reqCondutores) },
      condutores_maritimos: { req: reqCondutoresMaritimos, deficit: unfulfilledCondutoresMaritimos, chance: calcChance(unfulfilledCondutoresMaritimos, reqCondutoresMaritimos) },
      chefes: { req: reqChefes, deficit: unfulfilledChefes, chance: calcChance(unfulfilledChefes, reqChefes) },
      chefes_maritimos: { req: reqChefesMaritimos, deficit: unfulfilledChefesMaritimos, chance: calcChance(unfulfilledChefesMaritimos, reqChefesMaritimos) },
      auxiliares: { req: reqAuxiliares, deficit: unfulfilledAuxiliares, chance: calcChance(unfulfilledAuxiliares, reqAuxiliares) },
      auxiliares_maritimos: { req: reqAuxiliaresMaritimos, deficit: unfulfilledAuxiliaresMaritimos, chance: calcChance(unfulfilledAuxiliaresMaritimos, reqAuxiliaresMaritimos) },
      admin: { req: reqAdmin, deficit: unfulfilledAdmin, chance: calcChance(unfulfilledAdmin, reqAdmin) }
    };

  }, [baseRoster, permutasOut, militars, dynamicRequirements, correlation]);

  const handleAddViaturaExtra = () => {
     const name = window.prompt("Qual o nome/prefixo da viatura extra? (ex: ABT-999)");
     if (!name || name.trim() === '') return;
     const id = name.trim().toUpperCase();
     if (viaturasInfo.some(v => v.id === id)) {
        alert("Viatura já existe na lista!");
        return;
     }
     
     const maritima = id.startsWith("L-") || id.startsWith("BIA-");
     
     const newVtr = {
        id,
        vtr: id,
        ativa: true,
        exibir: true,
        maritima,
        condutor: true,
        g1: true,
        g2: true,
        g3: true,
        g4: false,
        cg: true,
        blocked: []
     };
     
     setViaturasInfo([...viaturasInfo, newVtr]);
  };

  const handleSortear = () => {
    const newSelected = { ...selectedFunctions };
    
    // 1. Determine all missing slots based on dynamicRequirements
    const missingSlots: string[] = [];
    dynamicRequirements.forEach(req => {
      const currentCount = Object.values(newSelected).flat().filter(f => normalizeFnName(f) === normalizeFnName(req.name)).length;
      if (req.req > currentCount) {
        for (let i = 0; i < req.req - currentCount; i++) {
          missingSlots.push(req.name);
        }
      }
    });

    if (missingSlots.length === 0) {
      // Todas as funções obrigatórias já estão preenchidas
      return;
    }
    
    // 1.5 Aplicar Predefinições
    baseRoster.forEach(m => {
       const isSwapped = permutasOut.has(m.rg || '');
       const actualMilitar = isSwapped ? (militars.find(x => x.rg === permutasOut.get(m.rg || '')?.substituteRg) || m) : m;
       const rg = m.rg || '';
       const pref = predefinicoes[rg] || [];
       if ((!newSelected[rg] || newSelected[rg].length === 0) && pref.length > 0) {
          const allowed = getAllowedOptions(actualMilitar) || [];
          pref.forEach(p => {
             if (allowed.includes(p) && missingSlots.includes(p)) {
                newSelected[rg] = [...(newSelected[rg] || []), p];
                const idx = missingSlots.indexOf(p);
                if (idx !== -1) missingSlots.splice(idx, 1);
             }
          });
       }
    });

    if (missingSlots.length === 0) {
       setSelectedFunctions(newSelected);
       return;
    }

    // 2. Pre-calculate eligible militars for each role
    const availableMilitars = baseRoster.map(m => {
       const isSwapped = permutasOut.has(m.rg || '');
       const actualMilitar = isSwapped ? (militars.find(x => x.rg === permutasOut.get(m.rg || '')?.substituteRg) || m) : m;
       return {
         rg: m.rg || '',
         actualMilitar,
         allowed: getAllowedOptions(actualMilitar) || []
       };
    });

    const getRoleCount = (rg: string) => (newSelected[rg] || []).length;

    let remainingSlots = [...missingSlots];
    let slotsFilledCount = 0;
    
    // Process slots one by one to ensure dynamic updates to getRoleCount
    while (remainingSlots.length > 0) {
       // Recalculate eligible counts for each slot dynamically
       const slotOptions = remainingSlots.map((slot, index) => {
          const eligible = availableMilitars.filter(m => {
             if (!m.allowed.includes(slot)) return false;
             // Verify compatibility with already selected roles
             const existingRoles = newSelected[m.rg] || [];
             if (existingRoles.includes(slot)) return false; // Prevent assigning same role twice to the same person
             
             let isCompatible = true;
             for (const role of existingRoles) {
               const isSentinelaAux = (
                  (slot === 'SENTINELA' && ['AUXILIAR ABT', 'AUXILIAR ABSL', 'AUXILIAR/CHEFE ARC'].includes(role)) ||
                  (role === 'SENTINELA' && ['AUXILIAR ABT', 'AUXILIAR ABSL', 'AUXILIAR/CHEFE ARC'].includes(slot))
               );
               
               if (isSentinelaAux) {
                  const arcRole = slot === 'AUXILIAR/CHEFE ARC' || role === 'AUXILIAR/CHEFE ARC';
                  if (arcRole) {
                     if (m.actualMilitar.rank === 'Soldado') continue;
                  } else {
                     continue;
                  }
               }

               const val1 = correlation[slot]?.[role] ?? 0;
               const val2 = correlation[role]?.[slot] ?? 0;
               if (val1 === 0 || val2 === 0) {
                 isCompatible = false; // incompatible according to rules
                 break;
               }
             }
             if (!isCompatible) return false;
             return true;
          });
          return { slot, index, eligible };
       });
       
       const getSlotPriority = (slotName: string) => {
          const req = dynamicRequirements.find(r => r.name === slotName);
          if (!req) return 99;
          if (req.category === 'condutor' || req.category === 'condutor_maritimo') return 1;
          if (req.category === 'chefe' || req.category === 'chefe_maritimo' || slotName === 'COMUNICANTE' || slotName === 'ENFERMEIRO') return 2;
          if (req.category === 'auxiliar' || req.category === 'auxiliar_maritimo') return 3;
          return 4; // admin / other
       };

       // Sort slots by priority first, then by number of eligible candidates (ascending).
       // We must fill the most important and hardest-to-fill slots first.
       slotOptions.sort((a, b) => {
          const pA = getSlotPriority(a.slot);
          const pB = getSlotPriority(b.slot);
          if (pA !== pB) return pA - pB;
          return a.eligible.length - b.eligible.length;
       });
       
       const toFill = slotOptions[0];
       remainingSlots.splice(toFill.index, 1);
       
       if (toFill.eligible.length === 0) {
          continue; // Cannot fill this slot with current constraints, skip
       }
       
       // Strategy: Priority 1 - Fewest roles assigned so far.
       //           Priority 2 - Most specialized (fewer allowed options total).
       // By doing this, we avoid assigning generalists to easy slots and saving them for hard slots.
       toFill.eligible.sort((a, b) => {
         const countDiff = getRoleCount(a.rg) - getRoleCount(b.rg);
         if (countDiff !== 0) return countDiff; // less assigned roles first
         return a.allowed.length - b.allowed.length; // more specialized first
       });
       
       const bestCandidateCount = getRoleCount(toFill.eligible[0].rg);
       const bestCandidateAllowed = toFill.eligible[0].allowed.length;
       
       // Find all candidates that tie for best so we can randomly pick among them to vary scales
       const topCandidates = toFill.eligible.filter(
         m => getRoleCount(m.rg) === bestCandidateCount && m.allowed.length === bestCandidateAllowed
       );
       
       const chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)];
       
       newSelected[chosen.rg] = [...(newSelected[chosen.rg] || []), toFill.slot];
       slotsFilledCount++;
    }
    
    if (slotsFilledCount > 0) {
       setSelectedFunctions(newSelected);
    } else {
       // Não foi possível sortear funções adicionais
    }
  };

  const handleGerarEscala = async () => {
    // Check if the scale is for the current day
    const today = format(new Date(), "yyyy-MM-dd");
    if (selectedDate === today) {
      try {
        const ativasData: Record<string, { rg: string, role: string }[]> = {};
        const activeVtrs = viaturasInfo.filter(v => v.ativa);
        
        activeVtrs.forEach(v => {
           const vtrName = (v.vtr || "").toUpperCase();
           if (!vtrName) return;
           const rgsForVtr: { rg: string, role: string }[] = [];
           
           ['condutor', 'g1', 'g2', 'g3', 'g4', 'cg'].forEach(slot => {
              if (v[slot as keyof typeof v] === true) {
                 const roleName = getSlotDisplayName(v, slot);
                 // find any RGs that have this role
                 Object.entries(selectedFunctions).forEach(([rg, roles]) => {
                    if (roles.includes(roleName) && !rgsForVtr.find(r => r.rg === rg)) {
                       rgsForVtr.push({ rg, role: roleName });
                    }
                 });
              }
           });
           
           ativasData[vtrName] = rgsForVtr;
        });

        await setDoc(doc(db, 'guarnicoes', 'ativas'), cleanUndefined(ativasData), { merge: false });
      } catch (e) {
        console.error("Erro ao sincronizar com Painel do Comunicante:", e);
      }
    }
    
    setShowPrintView(true);
  };

  const addMenuOptions = useMemo(() => {
    if (addMilitarSearch.length < 2) return [];
    const s = addMilitarSearch.toLowerCase();
    
    // Combine local militars and globalSearchResults
    const combinedPool = [...militars, ...globalSearchResults];
    // Remove duplicates by rg
    const uniquePool = Array.from(new Map(combinedPool.map(m => [m.rg, m])).values());

    return uniquePool
      .filter(m => {
        return (m.name || '').toLowerCase().includes(s) || 
               (m.warName || '').toLowerCase().includes(s) || 
               (m.rg || '').toString().includes(addMilitarSearch);
      })
      .filter(m => !baseRoster.some(br => br.rg === m.rg))
      .slice(0, 10);
  }, [addMilitarSearch, militars, globalSearchResults, baseRoster]);

  return (
    <div className="flex flex-col bg-slate-50 relative">
      {/* Top Control Bar */}
      <div className="bg-white border-b-2 border-slate-200 p-4 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 z-10 shadow-sm relative">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-50 border-2 border-indigo-100 rounded-xl p-2 px-4 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-colors">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">
              Data da Escala
            </span>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-indigo-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none outline-none text-sm font-black text-indigo-900 tracking-wider cursor-pointer"
              />
            </div>
          </div>

          <div
            className={cn(
              "rounded-xl p-2 px-6 border-2 shadow-sm flex flex-col items-center justify-center transition-colors",
              getAlaColor(identifiedAla),
              "border-transparent text-slate-900",
            )}
          >
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
              Identificação Automática
            </span>
            <span className="text-xl font-black tracking-tighter">
              {getAlaName(identifiedAla)}
            </span>
          </div>
          
          <div className="flex flex-col items-start ml-2">
            {savingState === 'saving' && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 animate-pulse">
                Salvando alterações...
              </span>
            )}
            {savingState === 'saved' && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                Salvo na nuvem ✓
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex text-[10px] font-black uppercase tracking-widest text-slate-400 gap-6">
            <div className="flex flex-col items-end">
              <span>Militars na Ala Base</span>
              <span className="text-sm text-slate-800">{baseRoster.length}</span>
            </div>
            <div className="flex flex-col items-end">
              <span>Permutas Deferidas</span>
              <span className="text-sm text-emerald-600">{permutas.length}</span>
            </div>
          </div>
          <button
            onClick={() => setIsPermutaModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Gerar Permuta
          </button>
          <button
            onClick={() => {
              setSelectedFunctions({});
            }}
            className="bg-red-500 hover:bg-red-400 text-white font-black uppercase tracking-widest text-[10px] px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
          >
            <X className="w-4 h-4" />
            Limpar
          </button>
          <button
            onClick={() => setIsPreferenciasModalOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white font-black uppercase tracking-widest text-[10px] px-3 py-2.5 rounded-lg shadow-sm flex items-center justify-center transition-colors"
            title="Pré-definições de Sorteio"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={handleSortear}
            className="bg-orange-500 hover:bg-orange-400 text-white font-black uppercase tracking-widest text-[10px] px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
          >
            <Shuffle className="w-4 h-4" />
            Sortear Funções
          </button>
          <button
            onClick={handleGerarEscala}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Gerar Escala
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* SECTION 1: IMPORT_PERMUTA (Permutas Deferidas) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-visible relative z-40">
          <div className="bg-emerald-50 rounded-t-2xl border-b border-emerald-100 p-3 px-4 flex items-center justify-between">
            <h3 className="text-xs font-black text-emerald-900 uppercase tracking-widest flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
              Import Permuta (Substituições Aprovadas)
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPermutaModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] px-3 py-1.5 rounded shadow-sm flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Nova Permuta
              </button>
            </div>
            {loadingPermutas && (
              <span className="text-[10px] font-bold text-emerald-600 animate-pulse uppercase tracking-widest">
                Sincronizando...
              </span>
            )}
          </div>
          <div className=" pb-48 no-scrollbar relative min-h-[150px]">
            <table className="w-full table-fixed border-collapse border-2 shadow-xl text-[10px] uppercase font-bold min-w-[500px] border-[#1e293b]">
              <colgroup>
                <col className="w-[30px]" />
                <col className="w-[160px]" />
                <col className="w-[30px]" />
                <col className="w-[160px]" />
                <col className="w-[30px]" />
                <col className="w-[180px]" />
                <col className="w-[130px]" />
                <col className="w-[40px]" />
              </colgroup>
              <thead className="bg-[#1e293b] text-white">
                 <tr className="bg-[#ced6e3] text-slate-900 border-b border-slate-900 text-[10px] font-black italic">
                    <th className="border-r border-slate-900 py-1.5 text-center px-0">✓</th>
                    <th className="border-r border-slate-900 py-1.5 text-center px-1">SAI</th>
                    <th className="border-r border-slate-900 py-1.5 text-center uppercase text-[12px] font-black px-0">X</th>
                    <th className="border-r border-slate-900 py-1.5 text-center px-1">ENTRA</th>
                    <th className="border-r border-slate-900 py-1.5 text-center px-0">✓</th>
                    <th className="border-r border-slate-900 py-1.5 text-center px-1">FUNÇÃO</th>
                    <th className="border-r border-slate-900 py-1.5 tracking-tighter text-center px-1">STATUS</th>
                    <th className="py-1.5 text-center px-1">RESP.</th>
                 </tr>
              </thead>
              <tbody>
                {permutas.filter(p => !p.isLookingForSubstitute || (p.requesterRg && p.substituteRg)).map((p) => {
                  const requesterData = militars.find(m => m.rg === p.requesterRg);
                  const substituteData = militars.find(m => m.rg === p.substituteRg);
                  const reqRank = requesterData?.rank || '';
                  const subRank = substituteData?.rank || '';
                  
                  const removeRankFromName = (name: string, rank: string) => {
                    if (!name) return '';
                    let resultName = name.toUpperCase().trim();
                    const upRank = rank?.toUpperCase().trim();
                    if (upRank && resultName.startsWith(upRank)) {
                      resultName = resultName.substring(upRank.length).trim();
                    }
                    const prefixes = ['SOLDADO ', 'SD ', 'CABO ', 'CB ', '3º SGT ', '3SGT ', '3 SGT ', '2º SGT ', '2SGT ', '2 SGT ', '1º SGT ', '1SGT ', '1 SGT ', 'SUBTENENTE ', 'SUBTEN ', 'ST ', 'ASP OF ', 'ASPIRANTE ', 'ASP ', '2º TEN ', '2TEN ', '2 TEN ', '1º TEN ', '1TEN ', '1 TEN ', 'CAPITÃO ', 'CAPITAO ', 'CAP ', 'MAJOR ', 'MAJ ', 'TEN CEL ', 'TEN CORONEL ', 'TC ', 'CORONEL ', 'CEL '];
                    for (const prefix of prefixes) {
                       if (resultName.startsWith(prefix)) {
                          resultName = resultName.substring(prefix.length).trim();
                          break;
                       }
                    }
                    return resultName;
                  };
                  
                  const displayReqName = requesterData?.warName?.toUpperCase() || removeRankFromName(p.requesterName || "", reqRank);
                  const displaySubName = substituteData?.warName?.toUpperCase() || removeRankFromName(p.substituteName || "", subRank);

                  const getStatusText = () => {
                    if (p.status === 'accepted') return 'DEFERIDO';
                    if (p.status === 'rejected') return 'INDEFERIDO';
                    if (p.status === 'cancelled') return 'CANCELADA';
                    const fullySigned = p.requesterSigned && p.substituteSigned;
                    if (fullySigned) return 'EM ANÁLISE';
                    return '1/2 PENDENTE';
                  };

                  const getRowBgColor = () => {
                    if (p.status === 'cancelled') return 'opacity-40 grayscale bg-white';
                    if (p.status === 'scheduled') return 'bg-amber-50';
                    if (p.status === 'accepted') return 'bg-emerald-100';
                    if (p.status === 'rejected') return 'bg-red-100';
                    if (p.status === 'pending') {
                      if (p.requesterSigned && p.substituteSigned) return 'bg-yellow-100';
                      return 'bg-red-100';
                    }
                    return 'bg-white';
                  };

                  const getSelectBgColor = () => {
                    if (p.status === 'accepted') return 'bg-emerald-100 text-emerald-900 border-emerald-300';
                    if (p.status === 'rejected') return 'bg-red-100 text-red-900 border-red-300';
                    if (p.status === 'scheduled') return 'bg-amber-100 text-amber-900 border-amber-300';
                    if (p.status === 'pending') {
                      if (p.requesterSigned && p.substituteSigned) return 'bg-yellow-100 text-yellow-900 border-yellow-300';
                      return 'bg-red-100 text-red-900 border-red-300';
                    }
                    return 'bg-slate-50 text-slate-800 border-slate-200';
                  };

                  return (
                    <tr
                      key={p.id}
                      className={cn(
                        "border-b border-slate-300 hover:opacity-80 transition-colors h-12",
                        getRowBgColor()
                      )}
                    >
                      <td className="border-r border-slate-300 px-0.5 py-1 text-center">
                        {p.requesterSigned ? (
                          <div className="w-4 h-4 bg-slate-900 rounded flex items-center justify-center mx-auto shadow-sm">
                             <Check className="w-3 h-3 text-white stroke-[3]" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <div className="w-4 h-4 border-[1.5px] border-slate-300 rounded mx-auto" />
                          </div>
                        )}
                      </td>
                      <td className="border-r border-slate-300 p-2 align-middle">
                        <div className="flex text-left justify-center items-center gap-2 max-w-[200px] mx-auto opacity-75">
                          {reqRank && (
                            <div className="origin-left shrink-0">
                              <RankInsignia rankStr={reqRank} />
                            </div>
                          )}
                          <div className="flex flex-col text-left justify-center py-1 min-w-0">
                            <span className="text-[11px] font-black uppercase text-indigo-500 tracking-widest leading-none mb-0.5 whitespace-nowrap">{reqRank || 'MIL'}</span>
                            <span className="text-[15px] font-black uppercase tracking-tight text-slate-800 leading-none truncate block mt-0.5">{displayReqName}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 font-mono leading-none whitespace-nowrap">RG: {p.requesterRg}</span>
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded leading-none">
                                {requesterData?.quadro?.split('/')[0] || 'S/Q'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="border-r border-slate-300 p-1 text-center bg-transparent mix-blend-multiply align-middle">
                        <div className="flex items-center justify-center w-full h-full min-h-[32px]">
                          <X className="w-4 h-4 text-red-600 opacity-60 font-black stroke-[3]" />
                        </div>
                      </td>
                      <td className="border-r border-slate-300 p-2 align-middle">
                        <div className="flex text-left justify-center items-center gap-2 max-w-[200px] mx-auto">
                          {subRank && (
                            <div className="origin-left shrink-0">
                              <RankInsignia rankStr={subRank} />
                            </div>
                          )}
                          <div className="flex flex-col text-left justify-center py-1 min-w-0">
                            <span className="text-[11px] font-black uppercase text-indigo-500 tracking-widest leading-none mb-0.5 whitespace-nowrap">{subRank || 'MIL'}</span>
                            <span className="text-[15px] font-black uppercase tracking-tight text-slate-800 leading-none truncate block mt-0.5">{displaySubName}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 font-mono leading-none whitespace-nowrap">RG: {p.substituteRg}</span>
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-emerald-50 px-1.5 py-0.5 rounded leading-none">
                                {substituteData?.quadro?.split('/')[0] || 'S/Q'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="border-r border-slate-300 px-0.5 py-1 text-center relative group">
                        {p.substituteSigned ? (
                          <div className="w-4 h-4 bg-slate-900 rounded flex items-center justify-center mx-auto shadow-sm">
                             <Check className="w-3 h-3 text-white stroke-[3]" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-[1.5px] border-slate-300 rounded mx-auto" />
                          </div>
                        )}
                      </td>
                      <td className="border-r border-slate-300 p-1 px-1 text-center align-middle bg-white/50">
                        <FuncoesMultiSelect 
                           selected={p.substituteFunctions || []}
                           allowedOptions={getAllowedOptions(militars.find(m => m.rg === p.substituteRg))}
                           onChange={async (newFuncs) => {
                             if (!p.id) return;
                             try {
                               await updateDoc(doc(db, "permutas", p.id), {
                                 substituteFunctions: newFuncs,
                                 updatedAt: serverTimestamp()
                               });
                             } catch (err) {
                               console.error("Update Permuta Functions Error:", err);
                             }
                           }}
                        />
                      </td>
                      <td className="border-r border-slate-300 p-1 px-2 text-center align-middle">
                             <select 
                               className={cn(
                                 "w-[120px] border-2 rounded px-1 py-1 text-[8px] font-black uppercase outline-none focus:border-slate-500 cursor-pointer mx-auto block mt-1",
                                 getSelectBgColor()
                               )}
                               value={(p.status === 'pending' || p.status === 'scheduled') ? p.status : p.status}
                               onChange={(e) => handleStatusChange(p, e.target.value as PermutaStatus)}
                             >
                               <option value="pending" className={
                                 (p.requesterSigned && p.substituteSigned) 
                                   ? 'bg-yellow-100 text-yellow-900' 
                                   : 'bg-red-100 text-red-900'
                               }>
                                 {getStatusText() === 'DEFERIDO' || getStatusText() === 'INDEFERIDO' ? 'PENDENTE' : getStatusText()}
                               </option>
                               <option value="scheduled" className="bg-amber-100 text-amber-900">EM ANÁLISE</option>
                               <option value="accepted" className="bg-emerald-100 text-emerald-900">DEFER.</option>
                               <option value="rejected" className="bg-red-100 text-red-900">INDEF.</option>
                             </select>
                      </td>
                      <td className="p-1 text-center">
                         <div className={cn(
                           "w-4 h-4 mx-auto border-2 rounded transition-all flex items-center justify-center shadow-inner",
                           p.status === 'accepted' || p.status === 'rejected' ? "bg-emerald-500 border-emerald-600" : 
                           p.status === 'scheduled' ? "bg-amber-400 border-amber-500" :
                           p.status === 'cancelled' ? "bg-red-500 border-red-600" : 
                           "bg-white border-slate-200"
                         )}>
                            {(p.status === 'accepted' || p.status === 'rejected') && <Check className="w-3 h-3 text-white stroke-[4]" />}
                            {p.status === 'cancelled' && <X className="w-3 h-3 text-white stroke-[4]" />}
                            {p.status === 'scheduled' && <Clock className="w-3 h-3 text-white stroke-[3]" />}
                         </div>
                      </td>
                    </tr>
                  )
                })}
                {permutas.filter(p => !p.isLookingForSubstitute || (p.requesterRg && p.substituteRg)).length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-slate-400 font-black text-xs uppercase tracking-widest bg-slate-50"
                    >
                      NENHUMA PERMUTA CADASTRADA PARA ESTA DATA
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 2: TAB_PERMUTA (Escala Espelho Base) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-visible relative z-30">
          <div className="bg-indigo-50 rounded-t-2xl border-b border-indigo-100 p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2 shrink-0">
              <Users className="w-4 h-4 text-indigo-600" />
              Tab Permuta (Construção da Escala)
            </h3>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64 z-20" ref={addMenuRef}>
                <input
                  type="text"
                  placeholder="Buscar militar..."
                  value={addMilitarSearch}
                  onChange={(e) => {
                    setAddMilitarSearch(e.target.value);
                    setShowAddMenu(true);
                  }}
                  onFocus={() => setShowAddMenu(true)}
                  className="w-full text-xs bg-white border border-indigo-200 rounded px-3 py-1.5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-400 text-slate-800 font-bold"
                />
                {showAddMenu && addMilitarSearch.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded shadow-xl max-h-48 overflow-y-auto">
                    {addMenuOptions.map((m) => (
                        <button
                          key={m.rg}
                          onClick={() => {
                            if (!militars.some(local => local.rg === m.rg) && !extraMilitars.some(extra => extra.rg === m.rg)) {
                                setExtraMilitars(prev => [...prev, m]);
                            }
                            setManuallyAddedRgs(prev => {
                              const curr = prev[selectedDate] || [];
                              return {
                                ...prev,
                                [selectedDate]: [...curr, m.rg || '']
                              };
                            });
                            setAddMilitarSearch('');
                            setShowAddMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 text-[10px] font-bold text-slate-700 hover:bg-indigo-50 border-b border-slate-100 last:border-0 flex flex-col"
                        >
                          <div className="flex items-center justify-between">
                            <span className="uppercase">{parseRank(m.rank)} {m.warName}</span>
                            <span className="text-[8px] font-black uppercase text-slate-400 bg-slate-100 px-1 py-0.5 rounded">{m.obm?.split(' ')[0] || 'S/Q'}</span>
                          </div>
                          <span className="text-[9px] text-slate-400 font-medium">RG: {m.rg}</span>
                        </button>
                    ))}
                    {addMenuOptions.length === 0 && (
                        <div className="px-3 py-2 text-[10px] font-medium text-slate-500 text-center">
                          Nenhum militar encontrado
                        </div>
                    )}
                  </div>
                )}
              </div>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0">
                {baseRoster.length} Militares
              </span>
            </div>
          </div>
          <div className=" relative min-h-[300px] pb-48">
            {militarsLoading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest animate-pulse">
                  Carregando EFETIVO...
                </span>
              </div>
            )}
            <table className="w-full text-left text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
              <thead className="bg-[#1e293b] text-white">
                <tr>
                  <th
                    className="p-3 px-4 border-r border-slate-700 w-12 text-center"
                    title="Substituído por Permuta?"
                  >
                    S.Perm
                  </th>
                  <th className="p-3 px-4 border-r border-slate-700 w-64">
                    Escalado Origem
                  </th>
                  <th className="p-3 px-4 border-r border-slate-700 w-64 text-indigo-300 bg-indigo-900/20">
                    Substituto (Permuta)
                  </th>
                  <th className="p-3 px-4 border-r border-slate-700 w-48 text-center">
                    Função Desempenhada
                  </th>
                  <th className="p-3 px-4 text-center">
                    Mostruário de Habilidades
                  </th>
                </tr>
              </thead>
              <tbody>
                {baseRoster.map((militar) => {
                  const rg = militar.rg || "";
                  const permuta = permutasOut.get(rg);
                  const isSwapped = !!permuta;

                  return (
                    <tr
                      key={rg}
                      className={cn(
                        "border-b border-slate-100 transition-colors",
                        isSwapped ? "bg-amber-50" : "hover:bg-slate-50",
                      )}
                    >
                      <td className="p-2 border-r border-slate-100 text-center align-middle">
                        {isSwapped ? (
                          <div className="w-4 h-4 bg-amber-500 rounded text-white flex items-center justify-center mx-auto shadow-sm">
                            ✓
                          </div>
                        ) : (
                          <div className="w-4 h-4 border-2 border-slate-300 rounded mx-auto" />
                        )}
                      </td>

                      <td className="p-2 px-4 border-r border-slate-100 relative group">
                        <div
                          className={cn(
                            "flex items-center gap-3",
                            isSwapped ? "opacity-40" : "",
                          )}
                        >
                          <RankInsignia
                            rankStr={militar.rank}
                            className="w-5 h-5 flex-shrink-0"
                          />
                          <div className="flex flex-col text-left">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">
                              {parseRank(militar.rank)}
                            </span>
                            <span
                              className={cn(
                                "text-[14px] font-black leading-none mb-1 uppercase tracking-tight",
                                isSwapped
                                  ? "text-slate-600 line-through"
                                  : "text-slate-800",
                              )}
                            >
                              {militar.warName?.toUpperCase() || formatMilitaryName(militar.name || "")}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] text-slate-400 font-mono tracking-widest leading-none">
                                RG: {rg}
                              </span>
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded">
                                {militar.quadro?.split('/')[0] || 'S/Q'}
                              </span>
                            </div>
                            {expedienteRgs.includes(rg) && (
                              <span className="mt-1 text-[8px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded w-max uppercase tracking-widest">
                                EXPEDIENTE
                              </span>
                            )}
                          </div>
                        </div>
                        {manuallyAddedRgs[selectedDate]?.includes(rg) && (
                          <button
                            onClick={() => {
                              setManuallyAddedRgs(prev => {
                                const curr = prev[selectedDate] || [];
                                return {
                                  ...prev,
                                  [selectedDate]: curr.filter(r => r !== rg)
                                };
                              });
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                            title="Remover Adição Manual"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </td>

                      <td
                        className={cn(
                          "p-2 px-4 border-r border-slate-100",
                          !isSwapped && "bg-slate-50/50",
                        )}
                      >
                        {isSwapped ? (
                          <div className="flex items-center gap-3">
                            {/* TODO: If you have substitute rank stored in permuta, use it. Usually it's not stored securely.  If you have it, pass it. Let's assume we don't have it easily or use a default one for now or just the text.*/}
                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500">
                              <ArrowRightLeft className="w-3 h-3" />
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest leading-none mb-1">
                                SUBSTITUTO
                              </span>
                              <span className="text-[14px] font-black text-indigo-700 leading-none mb-1 uppercase tracking-tight">
                                {(()=>{
                                  const subData = militars.find(m => m.rg === permuta.substituteRg);
                                  return subData?.warName?.toUpperCase() || formatMilitaryName(permuta.substituteName || "");
                                })()}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] text-indigo-400/80 font-mono tracking-widest leading-none">
                                  RG: {permuta.substituteRg}
                                </span>
                                <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-100/50 px-1.5 py-0.5 rounded">
                                  {militars.find(m => m.rg === permuta.substituteRg)?.quadro?.split('/')[0] || 'S/Q'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-slate-300">-</div>
                        )}
                      </td>

                      <td className="p-2 border-r border-slate-100 bg-white">
                        <FuncoesMultiSelect
                          selected={selectedFunctions[rg] || []}
                          allowedOptions={getAllowedOptions(isSwapped ? (militars.find(m => m.rg === permuta.substituteRg) || militar) : militar)}
                          onChange={(newVal) =>
                            setSelectedFunctions((prev) => ({
                              ...prev,
                              [rg]: newVal,
                            }))
                          }
                        />
                      </td>
                      <td className="p-2 px-4 text-[8px] text-slate-500 max-w-[200px]">
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                             const actualMilitar = isSwapped ? (militars.find(m => m.rg === permuta.substituteRg) || militar) : militar;
                             const allowed = getAllowedOptions(actualMilitar);
                             const selected = selectedFunctions[rg] || [];
                             if (!allowed || allowed.length === 0) return <span>NÃO CONFIGURADO</span>;
                             return allowed.map(opt => {
                                const isSelected = selected.includes(opt);
                                return (
                                  <span key={opt} className={cn("px-1.5 py-0.5 rounded uppercase tracking-tighter whitespace-nowrap", isSelected ? "bg-indigo-100 text-indigo-700 font-black border border-indigo-200" : "bg-slate-100 text-slate-500 font-medium")}>
                                    {opt}
                                  </span>
                                );
                             });
                          })()}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {baseRoster.length === 0 && !militarsLoading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-slate-400 font-black text-xs uppercase tracking-widest"
                    >
                      NENHUM MILITAR CADASTRADO NESTA ALA
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 2.5: AFASTAMENTOS DA ALA */}
        <AfastamentosAlaModule obmContext={obmContext} type="atuais" filterAla={identifiedAlaStr} />

        {/* SECTION 3: QUANT_MILITARES1 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-visible relative z-20">
          <div className="bg-amber-50 rounded-t-2xl border-b border-amber-100 p-3 px-4 flex items-center justify-between">
            <h3 className="text-xs font-black text-amber-900 uppercase tracking-widest flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Prontidão Operacional (Quant_Militares1)
            </h3>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-widest">
              Resumo Automático
            </span>
          </div>
          <div className="p-4 sm:p-6 bg-slate-50 relative">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
              
              {/* OPERACIONAIS */}
              <div>
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-500" />
                  Funções Operacionais
                </h4>
                <table className="w-full text-left text-[10px] font-bold uppercase tracking-wider bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                  <thead className="bg-[#1e293b] text-white text-[11px]">
                    <tr>
                      <th className="p-2.5 px-4 border-b border-slate-700">Função</th>
                      <th className="p-2.5 px-4 border-b border-slate-700 w-20 text-center">Atual</th>
                      <th className="p-2.5 px-4 border-b border-slate-700 w-20 text-center">Nec.</th>
                      <th className="p-2.5 px-4 border-b border-slate-700 w-20 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dynamicRequirements
                      .filter(f => f.category !== 'admin')
                      .map(f => {
                        const currentCount = Object.values(selectedFunctions).flat().filter((v) => normalizeFnName(v) === normalizeFnName(f.name)).length;
                        return { ...f, currentCount, isOk: currentCount >= f.req };
                      })
                      .filter(f => f.req > 0 || f.currentCount > 0)
                      .sort((a, b) => {
                        if (a.isOk === b.isOk) return 0;
                        return a.isOk ? 1 : -1;
                      })
                      .map((funcao) => {
                      const currentCount = funcao.currentCount;
                      const isOk = funcao.isOk;
                      return (
                        <tr key={funcao.name} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 px-4 tracking-tighter text-slate-800 text-[11px]">{funcao.name}</td>
                          <td className="p-2.5 px-4 text-center">
                            <span className={cn("px-2 py-1 rounded-md text-[10px] font-black", currentCount > 0 ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-400")}>
                              {currentCount}
                            </span>
                          </td>
                          <td className="p-2.5 px-4 text-center text-slate-500 font-black">{funcao.req}</td>
                          <td className="p-2.5 px-4 text-center">
                            {isOk ? (
                              <span className="text-emerald-500 font-black flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" /> OK
                              </span>
                            ) : (
                              <span className="text-rose-500 font-black flex items-center justify-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 stroke-[3]" /> DEF
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ADMINISTRATIVAS */}
              <div>
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Printer className="w-4 h-4 text-slate-500" />
                  Funções Administrativas
                </h4>
                <table className="w-full text-left text-[10px] font-bold uppercase tracking-wider bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                  <thead className="bg-[#1e293b] text-white text-[11px]">
                    <tr>
                      <th className="p-2.5 px-4 border-b border-slate-700">Função</th>
                      <th className="p-2.5 px-4 border-b border-slate-700 w-20 text-center">Atual</th>
                      <th className="p-2.5 px-4 border-b border-slate-700 w-20 text-center">Nec.</th>
                      <th className="p-2.5 px-4 border-b border-slate-700 w-20 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dynamicRequirements
                      .filter(f => f.category === 'admin')
                      .map(f => {
                        const currentCount = Object.values(selectedFunctions).flat().filter((v) => normalizeFnName(v) === normalizeFnName(f.name)).length;
                        return { ...f, currentCount, isOk: currentCount >= f.req };
                      })
                      .filter(f => f.req > 0 || f.currentCount > 0)
                      .sort((a, b) => {
                        if (a.isOk === b.isOk) return 0;
                        return a.isOk ? 1 : -1;
                      })
                      .map((funcao) => {
                      const currentCount = funcao.currentCount;
                      const isOk = funcao.isOk;
                      return (
                        <tr key={funcao.name} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 px-4 tracking-tighter text-slate-800 text-[11px]">{funcao.name}</td>
                          <td className="p-2.5 px-4 text-center">
                            <span className={cn("px-2 py-1 rounded-md text-[10px] font-black", currentCount > 0 ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-400")}>
                              {currentCount}
                            </span>
                          </td>
                          <td className="p-2.5 px-4 text-center text-slate-500 font-black">{funcao.req}</td>
                          <td className="p-2.5 px-4 text-center">
                            {isOk ? (
                              <span className="text-emerald-500 font-black flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" /> OK
                              </span>
                            ) : (
                              <span className="text-rose-500 font-black flex items-center justify-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 stroke-[3]" /> DEF
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ESTUDO TÉCNICO */}
              <div className="lg:col-span-1">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-4 h-4 text-rose-500" />
                    Previsão Algorítmica
                  </h4>
                  <button 
                    onClick={() => navigate('/estudo-tecnico-guarnicoes')}
                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[10px] font-bold tracking-wider transition-colors"
                  >
                    Estudo Plurianual <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm flex flex-col h-full">
                   <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                         <TrendingDown className="w-4 h-4 text-rose-400" />
                         Risco de Déficit
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-700/50">
                         PREVISÃO
                      </span>
                   </div>
                   <div className="p-4 space-y-4 flex-1">
                      {/* Efetivo Global */}
                      <div>
                        <div className="flex justify-between items-end mb-1">
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Efetivo Global (Total)</span>
                           <span className={cn("text-[11px] font-black", estudoTecnico.efetivo.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                             {estudoTecnico.efetivo.chance}% Vazio
                           </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                           <div className={cn("h-full rounded-full transition-all duration-500", estudoTecnico.efetivo.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${estudoTecnico.efetivo.chance}%` }} />
                        </div>
                        <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                           <span>Lacunas: {estudoTecnico.efetivo.deficit}</span>
                           <span>Nec: {estudoTecnico.efetivo.req}</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 block w-full pb-1 mb-2">Funções Operacionais</span>
                      </div>
                      
                      {/* Efetivo Operacional */}
                      <div>
                        <div className="flex justify-between items-end mb-1">
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Operacional</span>
                           <span className={cn("text-[11px] font-black", estudoTecnico.efetivoOperacional.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                             {estudoTecnico.efetivoOperacional.chance}% Vazio
                           </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                           <div className={cn("h-full rounded-full transition-all duration-500", estudoTecnico.efetivoOperacional.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${estudoTecnico.efetivoOperacional.chance}%` }} />
                        </div>
                        <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                           <span>Lacunas: {estudoTecnico.efetivoOperacional.deficit}</span>
                           <span>Nec: {estudoTecnico.efetivoOperacional.req}</span>
                        </div>
                      </div>
                      
                      {/* Condutores */}
                      <div>
                        <div className="flex justify-between items-end mb-1">
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Condutores</span>
                           <span className={cn("text-[11px] font-black", estudoTecnico.condutores.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                             {estudoTecnico.condutores.chance}% Vazio
                           </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                           <div className={cn("h-full rounded-full transition-all duration-500", estudoTecnico.condutores.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${estudoTecnico.condutores.chance}%` }} />
                        </div>
                        <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                           <span>Lacunas: {estudoTecnico.condutores.deficit}</span>
                           <span>Nec: {estudoTecnico.condutores.req}</span>
                        </div>
                      </div>

                      {estudoTecnico.condutores_maritimos.req > 0 && (
                      <div>
                        <div className="flex justify-between items-end mb-1">
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mestres (Marítimo)</span>
                           <span className={cn("text-[11px] font-black", estudoTecnico.condutores_maritimos.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                             {estudoTecnico.condutores_maritimos.chance}% Vazio
                           </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                           <div className={cn("h-full rounded-full transition-all duration-500", estudoTecnico.condutores_maritimos.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${estudoTecnico.condutores_maritimos.chance}%` }} />
                        </div>
                        <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                           <span>Lacunas: {estudoTecnico.condutores_maritimos.deficit}</span>
                           <span>Nec: {estudoTecnico.condutores_maritimos.req}</span>
                        </div>
                      </div>
                      )}

                      {/* Chefes */}
                      <div>
                        <div className="flex justify-between items-end mb-1">
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chefes de Guarnição</span>
                           <span className={cn("text-[11px] font-black", estudoTecnico.chefes.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                             {estudoTecnico.chefes.chance}% Vazio
                           </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                           <div className={cn("h-full rounded-full transition-all duration-500", estudoTecnico.chefes.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${estudoTecnico.chefes.chance}%` }} />
                        </div>
                        <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                           <span>Lacunas: {estudoTecnico.chefes.deficit}</span>
                           <span>Nec: {estudoTecnico.chefes.req}</span>
                        </div>
                      </div>

                      {estudoTecnico.chefes_maritimos.req > 0 && (
                      <div>
                        <div className="flex justify-between items-end mb-1">
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chefes (Marítimo)</span>
                           <span className={cn("text-[11px] font-black", estudoTecnico.chefes_maritimos.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                             {estudoTecnico.chefes_maritimos.chance}% Vazio
                           </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                           <div className={cn("h-full rounded-full transition-all duration-500", estudoTecnico.chefes_maritimos.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${estudoTecnico.chefes_maritimos.chance}%` }} />
                        </div>
                        <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                           <span>Lacunas: {estudoTecnico.chefes_maritimos.deficit}</span>
                           <span>Nec: {estudoTecnico.chefes_maritimos.req}</span>
                        </div>
                      </div>
                      )}

                      {/* Auxiliares */}
                      <div>
                        <div className="flex justify-between items-end mb-1">
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Auxiliares / Geral</span>
                           <span className={cn("text-[11px] font-black", estudoTecnico.auxiliares.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                             {estudoTecnico.auxiliares.chance}% Vazio
                           </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                           <div className={cn("h-full rounded-full transition-all duration-500", estudoTecnico.auxiliares.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${estudoTecnico.auxiliares.chance}%` }} />
                        </div>
                        <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                           <span>Lacunas: {estudoTecnico.auxiliares.deficit}</span>
                           <span>Nec: {estudoTecnico.auxiliares.req}</span>
                        </div>
                      </div>

                      {estudoTecnico.auxiliares_maritimos.req > 0 && (
                      <div>
                        <div className="flex justify-between items-end mb-1">
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Marinheiros (Marítimo)</span>
                           <span className={cn("text-[11px] font-black", estudoTecnico.auxiliares_maritimos.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                             {estudoTecnico.auxiliares_maritimos.chance}% Vazio
                           </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                           <div className={cn("h-full rounded-full transition-all duration-500", estudoTecnico.auxiliares_maritimos.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${estudoTecnico.auxiliares_maritimos.chance}%` }} />
                        </div>
                        <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                           <span>Lacunas: {estudoTecnico.auxiliares_maritimos.deficit}</span>
                           <span>Nec: {estudoTecnico.auxiliares_maritimos.req}</span>
                        </div>
                      </div>
                      )}

                      <div className="pt-4">
                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 block w-full pb-1 mb-2">Funções Administrativas</span>
                      </div>

                      {/* Efetivo Administrativo */}
                      <div>
                        <div className="flex justify-between items-end mb-1">
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Administrativo</span>
                           <span className={cn("text-[11px] font-black", estudoTecnico.efetivoAdministrativo.chance > 0 ? "text-rose-500" : "text-emerald-500")}>
                             {estudoTecnico.efetivoAdministrativo.chance}% Vazio
                           </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                           <div className={cn("h-full rounded-full transition-all duration-500", estudoTecnico.efetivoAdministrativo.chance > 0 ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${estudoTecnico.efetivoAdministrativo.chance}%` }} />
                        </div>
                        <div className="flex justify-between mt-1 text-[9px] text-slate-400 font-bold">
                           <span>Lacunas: {estudoTecnico.efetivoAdministrativo.deficit}</span>
                           <span>Nec: {estudoTecnico.efetivoAdministrativo.req}</span>
                        </div>
                      </div>

                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: CONTROLE DE VIATURAS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-visible relative z-10">
          <div className="bg-slate-800 rounded-t-2xl border-b border-slate-700 p-3 px-4 flex items-center justify-between">
            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Truck className="w-4 h-4 text-slate-400" />
              Distribuição (Viaturas)
            </h3>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleAddViaturaExtra}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 rounded-md transition-colors border border-emerald-400/20"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar VTR Extra
              </button>
              <span className="text-[10px] font-bold text-slate-300 bg-slate-700 px-2 py-0.5 rounded-full uppercase tracking-widest">
                Manual
              </span>
            </div>
          </div>

          <div className=" p-4 sm:p-6 bg-slate-50 relative">
            <table className="w-full text-left text-[10px] font-bold uppercase tracking-wider bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm min-w-[700px]">
              <thead className="bg-[#1e293b] text-white text-[11px]">
                <tr>
                  <th
                    className="p-3 px-2 border-b border-r border-[#334155] w-12 text-center"
                    title="Exibir VTR na escala gerada?"
                  >
                    Exibição
                  </th>
                  <th
                    className="p-3 px-2 border-b border-r border-[#334155] w-12 text-center"
                    title="Ativar VTR?"
                  >
                    Ativar
                  </th>
                  <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-24">
                    Viaturas
                  </th>
                  <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-20">
                    Situação
                  </th>
                  <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-16">
                    Condutor
                  </th>
                  <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-12">
                    G1
                  </th>
                  <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-12">
                    G2
                  </th>
                  <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-12">
                    G3
                  </th>
                  <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-12">
                    G4
                  </th>
                  <th className="p-3 px-2 border-b border-[#334155] text-center w-12">
                    CG
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {viaturasInfo.map((vtr) => {
                  const isAtiva = vtr.ativa;
                  const isExibir = vtr.exibir ?? vtr.ativa;

                  const toggleVtr = () => {
                    setViaturasInfo((prev) =>
                      prev.map((v) =>
                        v.id === vtr.id ? { ...v, ativa: !v.ativa } : v,
                      ),
                    );
                  };

                  const toggleExibir = () => {
                    setViaturasInfo((prev) =>
                      prev.map((v) =>
                        v.id === vtr.id ? { ...v, exibir: !(v.exibir ?? v.ativa) } : v,
                      ),
                    );
                  };

                  const toggleCheck = (
                    field: "condutor" | "g1" | "g2" | "g3" | "g4" | "cg",
                  ) => {
                    if (vtr.blocked.includes(field)) return;
                    setViaturasInfo((prev) =>
                      prev.map((v) =>
                        v.id === vtr.id ? { ...v, [field]: !v[field] } : v,
                      ),
                    );
                  };

                  const renderCheckbox = (
                    field: "condutor" | "g1" | "g2" | "g3" | "g4" | "cg",
                  ) => {
                    if (vtr.blocked.includes(field)) {
                      return (
                        <div className="bg-slate-700 opacity-90 w-full h-full min-h-[32px] flex items-center justify-center"></div>
                      );
                    }
                    return (
                      <div
                        className="flex items-center justify-center h-full p-2"
                        onClick={() => toggleCheck(field)}
                      >
                        {vtr[field] ? (
                          <div className="w-3.5 h-3.5 bg-slate-700/80 rounded-[3px] text-white flex items-center justify-center shadow-sm cursor-pointer hover:bg-slate-800 transition">
                            <span className="text-[10px]">✓</span>
                          </div>
                        ) : (
                          <div className="w-3.5 h-3.5 border border-slate-300 rounded-[3px] cursor-pointer hover:border-slate-500 transition" />
                        )}
                      </div>
                    );
                  };

                  return (
                    <tr
                      key={vtr.id}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td
                        className="p-1 border-r border-slate-200 text-center align-middle"
                        onClick={toggleExibir}
                      >
                        {isExibir ? (
                          <div className="w-3.5 h-3.5 bg-slate-700/80 rounded-[3px] text-white flex items-center justify-center mx-auto shadow-sm cursor-pointer hover:bg-slate-800 transition">
                            <span className="text-[10px]">✓</span>
                          </div>
                        ) : (
                          <div className="w-3.5 h-3.5 border border-slate-300 rounded-[3px] mx-auto cursor-pointer hover:border-slate-500 transition" />
                        )}
                      </td>
                      <td
                        className="p-1 border-r border-slate-200 text-center align-middle"
                        onClick={toggleVtr}
                      >
                        {isAtiva ? (
                          <div className="w-3.5 h-3.5 bg-slate-700/80 rounded-[3px] text-white flex items-center justify-center mx-auto shadow-sm cursor-pointer hover:bg-slate-800 transition">
                            <span className="text-[10px]">✓</span>
                          </div>
                        ) : (
                          <div className="w-3.5 h-3.5 border border-slate-300 rounded-[3px] mx-auto cursor-pointer hover:border-slate-500 transition" />
                        )}
                      </td>
                      <td className="p-1.5 border-r border-slate-200 text-center text-slate-700 font-black">
                        {vtr.vtr}
                      </td>
                      <td className="p-1 px-2 border-r border-slate-200 text-center align-middle">
                        {isAtiva ? (
                          <span className="bg-[#2c533e] text-emerald-50 px-2 py-1 text-[9px] w-full block rounded-[3px]">
                            ATIVA
                          </span>
                        ) : (
                          <span className="bg-[#fac7b0] text-[#783f2a] px-2 py-1 text-[9px] w-full block rounded-[3px] font-black">
                            INATIVA
                          </span>
                        )}
                      </td>
                      <td className="p-0 border-r border-slate-200 align-middle">
                        {renderCheckbox("condutor")}
                      </td>
                      <td className="p-0 border-r border-slate-200 align-middle">
                        {renderCheckbox("g1")}
                      </td>
                      <td className="p-0 border-r border-slate-200 align-middle">
                        {renderCheckbox("g2")}
                      </td>
                      <td className="p-0 border-r border-slate-200 align-middle">
                        {renderCheckbox("g3")}
                      </td>
                      <td className="p-0 border-r border-slate-200 align-middle">
                        {renderCheckbox("g4")}
                      </td>
                      <td className="p-0 align-middle">
                        {renderCheckbox("cg")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 5: AFASTAMENTOS DA ALA */}
      </div>

      {isPreferenciasModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  Pré-definições de Funções (Fixo)
                </h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                  Defina as funções preferenciais para o sorteio automático
                </p>
              </div>
              <button onClick={() => setIsPreferenciasModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-slate-100 shrink-0">
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Busque o militar e selecione a função que ele deve assumir prioritariamente no sorteio.</p>
            </div>

            <div className="p-0 overflow-y-auto flex-1 bg-slate-50 pb-48">
              <table className="w-full text-left text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                <thead className="bg-[#1e293b] text-white sticky top-0 z-10">
                   <tr>
                     <th className="p-3 px-4 border-r border-slate-700 w-1/2">Militar</th>
                     <th className="p-3 px-4 border-r border-slate-700 w-1/2">Função Predefinida</th>
                   </tr>
                </thead>
                <tbody>
                  {baseRoster.map((militar) => (
                    <tr key={militar.rg} className="border-b border-slate-200 bg-white hover:bg-slate-50">
                      <td className="p-3 px-4 border-r border-slate-200">
                        <div className="flex items-center gap-3">
                          <RankInsignia rankStr={militar.rank} className="w-5 h-5 flex-shrink-0" />
                          <div className="flex flex-col text-left">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">
                              {parseRank(militar.rank)}
                            </span>
                            <span className="text-[14px] font-black leading-none mb-1 uppercase tracking-tight text-slate-800">
                              {militar.warName?.toUpperCase() || formatMilitaryName(militar.name || "")}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono tracking-widest leading-none">
                              RG: {militar.rg}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 px-4 relative" style={{ overflow: 'visible' }}>
                         <FuncoesMultiSelect
                            selected={predefinicoes[militar.rg || ''] || []}
                            allowedOptions={getAllowedOptions(militar)}
                            onChange={async (newVal) => {
                               const newPref = { ...predefinicoes, [militar.rg || '']: newVal };
                               setPredefinicoes(newPref);
                               try {
                                 await updateDoc(doc(db, "obm_settings", obmContext), cleanUndefined({
                                    escala_preferencias: newPref
                                 }));
                               } catch(e) {
                                 console.error("Error saving predefinicoes", e);
                               }
                            }}
                         />
                      </td>
                    </tr>
                  ))}
                  {baseRoster.length === 0 && (
                     <tr>
                        <td colSpan={2} className="p-8 text-center text-slate-400 font-black text-xs uppercase tracking-widest">
                           NENHUM MILITAR CADASTRADO NESTA ALA
                        </td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setIsPreferenciasModalOpen(false)}
                className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrintView && (
        <EscalaPrintView
          selectedDate={selectedDate}
          identifiedAla={identifiedAla}
          obmContext={obmContext}
          baseRoster={baseRoster}
          permutasOut={permutasOut}
          militars={militars}
          selectedFunctions={selectedFunctions}
          viaturasInfo={viaturasInfo}
          onClose={() => setShowPrintView(false)}
        />
      )}
      <RequestPermuta 
        isOpen={isPermutaModalOpen}
        setIsOpen={setIsPermutaModalOpen}
        user={user}
        obmContext={obmContext}
        initialDate={selectedDate ? new Date(selectedDate + "T00:00:00") : null}
      />
    </div>
  );
}
