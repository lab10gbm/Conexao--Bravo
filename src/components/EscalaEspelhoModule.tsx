import React, { useState, useEffect, useMemo, useRef } from "react";
import { useMilitars } from "../contexts/MilitarContext";
import { PermutaRequest, PermutaStatus } from "../types";
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  getAlaForDate,
  getAlaName,
  getAlaColor,
  cn,
  formatMilitaryName,
} from "../lib/utils";
import { parseRank } from "../lib/rankUtils";
import { RankInsignia } from "./RankInsignia";
import { EscalaPrintView } from "./EscalaPrintView";
import {
  Calendar as CalendarIcon,
  Users,
  ArrowRightLeft,
  Shield,
  CheckCircle2,
  AlertCircle,
  Truck,
  ChevronDown,
  Check,
  X,
  Clock,
  Printer,
  Shuffle
} from "lucide-react";

import { motion } from "framer-motion";
import { cleanUndefined } from "../lib/utils";

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
    'CONDUTOR ASE', 'CONDUTOR ARC', 'CHEFE ABSL', 'CHEFE ABT', 'AUXILIAR / CHEFE ARC', 
    'AUXILIAR ABT', 'AUXILIAR ABSL', 'ENFERMEIRO', 'MESTRE AL', 'MESTRE BIA', 
    'MARINHEIRO', 'OPERADOR AMA', 'GV AMA', 'AUXILIAR RANCHO', 'TOQUE DE FOGO', 
    'DIA AO DEPOSITO', 'RESP FAXINA', 'ABASTECEDOR', 'SGT DIA', 'CMT GUARDA', 
    'CB GUARDA', 'CB DIA', 'COMUNICANTE', 'PRECARIO', 'ESCALANTE', 'PRECARIO ADM', 
    'SENTINELA'
  ];

  let filteredOptions = allOptions;
  if (allowedOptions) {
    filteredOptions = allOptions.filter(o => allowedOptions.includes(o) || selected.includes(o));
  }

  const options = search ? filteredOptions.filter(o => o.toLowerCase().includes(search.toLowerCase())) : filteredOptions;

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
            {options.map((opt) => (
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
          </div>
        </div>
      )}
    </div>
  );
}

interface EscalaEspelhoModuleProps {
  obmContext: string;
}

const DEFAULT_VIATURAS = [
  { id: "ABT-183", vtr: "ABT-183", ativa: true, condutor: true, g1: true, g2: true, g3: true, g4: false, cg: true, blocked: [] },
  { id: "ABSL-152", vtr: "ABSL-152", ativa: true, condutor: true, g1: true, g2: true, g3: false, g4: false, cg: true, blocked: [] },
  { id: "ASE-404", vtr: "ASE-404", ativa: true, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "ARC-162", vtr: "ARC-162", ativa: true, condutor: true, g1: true, g2: null, g3: null, g4: null, cg: null, blocked: ["g2", "g3", "g4", "cg"] },
  { id: "AR-583", vtr: "AR-583", ativa: true, condutor: true, g1: null, g2: null, g3: null, g4: null, cg: null, blocked: ["g1", "g2", "g3", "g4", "cg"] },
  { id: "L-09", vtr: "L-09", ativa: true, condutor: true, g1: true, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "BIA-006", vtr: "BIA-006", ativa: true, condutor: true, g1: true, g2: true, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "BIA-013", vtr: "BIA-013", ativa: false, condutor: false, g1: false, g2: false, g3: null, g4: null, cg: null, blocked: ["g3", "g4", "cg"] },
  { id: "ABT-12", vtr: "ABT-12", ativa: false, condutor: false, g1: false, g2: false, g3: false, g4: false, cg: false, blocked: [] },
];

export function EscalaEspelhoModule({ obmContext }: EscalaEspelhoModuleProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const { militars, loading: militarsLoading } = useMilitars();
  const [permutas, setPermutas] = useState<PermutaRequest[]>([]);
  const [afastamentos, setAfastamentos] = useState<any[]>([]);
  const [loadingPermutas, setLoadingPermutas] = useState(false);
  const [manuallyAddedRgs, setManuallyAddedRgs] = useState<Record<string, string[]>>({});
  const [expedienteRgs, setExpedienteRgs] = useState<string[]>([]);
  const [addMilitarSearch, setAddMilitarSearch] = useState('');
  const [showAddMenu, setShowAddMenu] = useState(false);
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

  const [viaturasInfo, setViaturasInfo] = useState(DEFAULT_VIATURAS);

  const isFirstLoad = useRef(true);
  const previousDate = useRef(selectedDate);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showPrintView, setShowPrintView] = useState(false);
  const [correlation, setCorrelation] = useState<Record<string, Record<string, number>>>({});
  const [roleQtds, setRoleQtds] = useState<Record<string, number>>({});

  // Load correlation matrix and quantities
  useEffect(() => {
    if (!obmContext || obmContext === 'GLOBAL') return;
    const loadCorrelation = async () => {
      try {
        const docRef = doc(db, "obm_settings", obmContext);
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data()?.escala_regras) {
          setCorrelation(snap.data().escala_regras.correlation || {});
          setRoleQtds(snap.data().escala_regras.qtds || {});
        } else {
          setCorrelation({});
          setRoleQtds({});
        }
      } catch (e) {
        console.error("Error loading correlation rules", e);
      }
    };
    loadCorrelation();
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
           if (snap.exists() && isMounted) {
               const data = snap.data();
               if (data.selectedFunctions) setSelectedFunctions(data.selectedFunctions);
               if (data.viaturasInfo) setViaturasInfo(data.viaturasInfo);
               if (data.manuallyAddedRgs) {
                   setManuallyAddedRgs(prev => ({...prev, [selectedDate]: data.manuallyAddedRgs}));
               }
           }
           if (isMounted) isFirstLoad.current = false;
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
          }, { merge: true });
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
        (p) => (!p.obm || p.obm === obmContext || p.obm === "10º GBM") && p.status !== "cancelled"
      );
      setPermutas(filtered);
      setLoadingPermutas(false);
    });

    const qAfast = query(
      collection(db, "afastamentos_alas"),
      where("obm", "==", obmContext.toUpperCase())
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
  useEffect(() => {
    if (permutas.length > 0) {
      setSelectedFunctions(prev => {
        const next = { ...prev };
        let changed = false;
        permutas.forEach(p => {
          if (p.status === 'accepted' && p.substituteFunctions && p.substituteFunctions.length > 0 && p.requesterRg) {
            // Só aplica se ainda não houver função definida manualmente para este RG nesta sessão ou se queremos que a permuta mande
            // Como é um dashboard de triagem, faz sentido a permuta mandar no valor inicial
            if (!next[p.requesterRg] || next[p.requesterRg].length === 0) {
               next[p.requesterRg] = p.substituteFunctions;
               changed = true;
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

  // Função helper
  function normalizeAlaField(ala: string | number | undefined): string {
    if (!ala) return "";
    const a = String(ala).toUpperCase();
    if (a.includes("1")) return "1";
    if (a.includes("2")) return "2";
    if (a.includes("3")) return "3";
    if (a.includes("4")) return "4";
    return "";
  }

  const militarsInObm = militars.filter((m) => {
    const rawObm = m.obm ? m.obm.trim().toUpperCase() : "10º GBM";
    const ctx = (obmContext || "").trim().toUpperCase();
    if (ctx === "GLOBAL") return true;
    return rawObm === ctx;
  });

  // Base Roster for the identified Ala
  const baseRoster = useMemo(() => {
    const manualRgs = manuallyAddedRgs[selectedDate] || [];
    return militarsInObm
      .filter((m) => {
        const isAla = normalizeAlaField(m.ala) === identifiedAlaStr;
        const isManual = manualRgs.includes(m.rg || '');
        const isExpediente = expedienteRgs.includes(m.rg || '');
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
        const rgA = parseInt((a.rg || "").replace(/\D/g, "") || "0");
        const rgB = parseInt((b.rg || "").replace(/\D/g, "") || "0");
        return rgA - rgB;
      });
  }, [militarsInObm, identifiedAlaStr, afastamentos, selectedDate, manuallyAddedRgs, expedienteRgs]);

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
      if (militar.mestreAl) funcs.push("MESTRE AL");
      if (militar.mestreBia) funcs.push("MESTRE BIA");
      if (militar.marinheiros) funcs.push("MARINHEIRO");
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
      if (militar.ativoEncarregado) allowed.add('ENCARREGADO DE MOTORISTA');
      if (militar.ativoAbastecedor) allowed.add('ABASTECEDOR');
      
      if (militar.viaturas?.AR) allowed.add('CONDUTOR AR');
      if (militar.viaturas?.ABSL) allowed.add('CONDUTOR ABSL');
      if (militar.viaturas?.ABT) allowed.add('CONDUTOR ABT');
      if (militar.viaturas?.ASE) allowed.add('CONDUTOR ASE');
      if (militar.viaturas?.ARC) allowed.add('CONDUTOR ARC');
    }
    
    if (militar.ativoChefeGua) {
      if (militar.chefeAbsl) allowed.add('CHEFE ABSL');
      if (militar.chefeAbt) allowed.add('CHEFE ABT');
      allowed.add('AUXILIAR / CHEFE ARC');
    }
    
    if (militar.ativoAuxiliar) {
      if (militar.auxAbt) allowed.add('AUXILIAR ABT');
      if (militar.auxAbsl) allowed.add('AUXILIAR ABSL');
      if (militar.auxArc) allowed.add('AUXILIAR / CHEFE ARC');
      if (militar.auxAse) allowed.add('AUXILIAR ASE');
    }
    
    if (militar.ativoEnfermeiro) {
      allowed.add('ENFERMEIRO');
    }
    
    if (militar.ativoMaritimo) {
      if (militar.mestreAl) allowed.add('MESTRE AL');
      if (militar.mestreBia) allowed.add('MESTRE BIA');
      if (militar.marinheiros) allowed.add('MARINHEIRO');
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
    
    allowed.add('PRECARIO');
    allowed.add('PRECARIO ADM');
    allowed.add('ESCALANTE');

    return Array.from(allowed);
  };

  const dynamicRequirements = useMemo(() => {
    let reqs = [
      { name: "ADJUNTO", req: roleQtds["ADJUNTO"] ?? 1 },
      { name: "ENCARREGADO DE MOTORISTA", req: roleQtds["ENCARREGADO DE MOTORISTA"] ?? 1 },
    ];

    const getReq = (vtrId: string, type: 'condutor' | 'cg' | 'g1' | 'g2' | 'g3' | 'g4', defaultVal: number = 0) => {
       const vtr = viaturasInfo.find(v => v.id === vtrId || v.vtr === vtrId);
       if (!vtr || !vtr.ativa) return 0;
       if (vtr[type] === true) return 1;
       if (vtr[type] === false) return 0;
       return defaultVal; 
    };

    const countCondutor = (prefix: string) => viaturasInfo.filter(v => v.ativa && v.vtr.startsWith(prefix) && v.condutor).length;
    const countChefe = (prefix: string) => viaturasInfo.filter(v => v.ativa && v.vtr.startsWith(prefix) && v.cg).length;
    const countAux = (prefix: string) => {
        let count = 0;
        viaturasInfo.filter(v => v.ativa && v.vtr.startsWith(prefix)).forEach(v => {
            if (v.g1) count++;
            if (v.g2) count++;
            if (v.g3) count++;
            if (v.g4) count++;
        });
        return count;
    };

    reqs.push({ name: "CONDUTOR AR", req: roleQtds["CONDUTOR AR"] ?? getReq("AR-583", "condutor") });
    reqs.push({ name: "CONDUTOR ABSL", req: roleQtds["CONDUTOR ABSL"] ?? countCondutor("ABSL") });
    reqs.push({ name: "CONDUTOR ABT", req: roleQtds["CONDUTOR ABT"] ?? countCondutor("ABT") });
    reqs.push({ name: "CONDUTOR ASE", req: roleQtds["CONDUTOR ASE"] ?? countCondutor("ASE") });
    reqs.push({ name: "CONDUTOR ARC", req: roleQtds["CONDUTOR ARC"] ?? countCondutor("ARC") });
    
    reqs.push({ name: "CHEFE ABSL", req: roleQtds["CHEFE ABSL"] ?? countChefe("ABSL") });
    reqs.push({ name: "CHEFE ABT", req: roleQtds["CHEFE ABT"] ?? countChefe("ABT") });
    
    reqs.push({ name: "AUXILIAR / CHEFE ARC", req: roleQtds["AUXILIAR / CHEFE ARC"] ?? countAux("ARC") });
    
    reqs.push({ name: "AUXILIAR ABT", req: roleQtds["AUXILIAR ABT"] ?? countAux("ABT") });
    reqs.push({ name: "AUXILIAR ABSL", req: roleQtds["AUXILIAR ABSL"] ?? countAux("ABSL") });
    
    reqs.push({ name: "ENFERMEIRO", req: roleQtds["ENFERMEIRO"] ?? countAux("ASE") });
    
    reqs.push({ name: "MESTRE AL", req: roleQtds["MESTRE AL"] ?? countCondutor("L-") });
    reqs.push({ name: "MESTRE BIA", req: roleQtds["MESTRE BIA"] ?? countCondutor("BIA-") });
    
    reqs.push({ name: "MARINHEIRO", req: roleQtds["MARINHEIRO"] ?? (countAux("L-") + countAux("BIA-")) });
    
    reqs.push({ name: "AUXILIAR RANCHO", req: roleQtds["AUXILIAR RANCHO"] ?? 1 });
    reqs.push({ name: "TOQUE DE FOGO", req: roleQtds["TOQUE DE FOGO"] ?? 1 });
    reqs.push({ name: "DIA AO DEPOSITO", req: roleQtds["DIA AO DEPOSITO"] ?? 2 });
    reqs.push({ name: "RESP FAXINA", req: roleQtds["RESP FAXINA"] ?? 1 });
    reqs.push({ name: "ABASTECEDOR", req: roleQtds["ABASTECEDOR"] ?? 1 });

    reqs.push({ name: "SGT DIA", req: roleQtds["SGT DIA"] ?? 1 });
    reqs.push({ name: "CMT GUARDA", req: roleQtds["CMT GUARDA"] ?? 1 });
    reqs.push({ name: "CB GUARDA", req: roleQtds["CB GUARDA"] ?? 1 });
    reqs.push({ name: "CB DIA", req: roleQtds["CB DIA"] ?? 1 });
    reqs.push({ name: "COMUNICANTE", req: roleQtds["COMUNICANTE"] ?? 2 });
    reqs.push({ name: "ESCALANTE", req: roleQtds["ESCALANTE"] ?? 1 });
    reqs.push({ name: "SENTINELA", req: roleQtds["SENTINELA"] ?? 4 });

    return reqs;
  }, [viaturasInfo, roleQtds]);

  const handleSortear = () => {
    const newSelected = { ...selectedFunctions };
    
    // 1. Determine all missing slots based on dynamicRequirements
    const missingSlots: string[] = [];
    dynamicRequirements.forEach(req => {
      const currentCount = Object.values(newSelected).flat().filter(f => f === req.name).length;
      if (req.req > currentCount) {
        for (let i = 0; i < req.req - currentCount; i++) {
          missingSlots.push(req.name);
        }
      }
    });

    if (missingSlots.length === 0) {
      alert("Todas as funções obrigatórias já estão preenchidas!");
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
             for (const role of existingRoles) {
               if (correlation[slot]?.[role] === 1 || correlation[role]?.[slot] === 1) {
                 return false; // incompatible according to rules
               }
             }
             return true;
          });
          return { slot, index, eligible };
       });
       
       // Sort slots by number of eligible candidates (ascending).
       // We must fill the hardest-to-fill slots first (fewer candidates).
       slotOptions.sort((a, b) => a.eligible.length - b.eligible.length);
       
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
       alert(`Sorteio concluído! ${slotsFilledCount} função(ões) preenchida(s) respeitando as restrições.`);
    } else {
       alert("Não foi possível sortear funções adicionais com o efetivo disponível e as restrições impostas.");
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 relative overflow-hidden">
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
            onClick={() => {
              if (window.confirm("Tem certeza que deseja limpar todas as funções selecionadas?")) {
                setSelectedFunctions({});
              }
            }}
            className="bg-red-500 hover:bg-red-400 text-white font-black uppercase tracking-widest text-[10px] px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
          >
            <X className="w-4 h-4" />
            Limpar
          </button>
          <button
            onClick={handleSortear}
            className="bg-orange-500 hover:bg-orange-400 text-white font-black uppercase tracking-widest text-[10px] px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
          >
            <Shuffle className="w-4 h-4" />
            Sortear Funções
          </button>
          <button
            onClick={() => setShowPrintView(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Gerar Escala
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* SECTION 1: IMPORT_PERMUTA (Permutas Deferidas) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-emerald-50 border-b border-emerald-100 p-3 px-4 flex items-center justify-between">
            <h3 className="text-xs font-black text-emerald-900 uppercase tracking-widest flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
              Import Permuta (Substituições Aprovadas)
            </h3>
            {loadingPermutas && (
              <span className="text-[10px] font-bold text-emerald-600 animate-pulse uppercase tracking-widest">
                Sincronizando...
              </span>
            )}
          </div>
          <div className="overflow-x-auto pb-4 no-scrollbar relative min-h-[150px]">
            <table className="w-full table-fixed border-collapse border-2 shadow-xl text-[10px] uppercase font-bold min-w-[500px] border-[#1e293b]">
              <colgroup>
                <col className="w-[30px]" />
                <col className="w-auto" />
                <col className="w-[30px]" />
                <col className="w-auto" />
                <col className="w-[30px]" />
                <col className="w-[120px]" />
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
                            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 font-mono leading-none mt-1 whitespace-nowrap">RG: {p.requesterRg}</span>
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
                            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 font-mono leading-none mt-1 whitespace-nowrap">RG: {p.substituteRg}</span>
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-indigo-50 border-b border-indigo-100 p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                    {militars
                      .filter(m => {
                        const s = addMilitarSearch.toLowerCase();
                        return (m.name || '').toLowerCase().includes(s) || 
                               (m.warName || '').toLowerCase().includes(s) || 
                               (m.rg || '').toString().includes(addMilitarSearch);
                      })
                      .filter(m => !baseRoster.some(br => br.rg === m.rg))
                      .slice(0, 10)
                      .map((m) => (
                        <button
                          key={m.rg}
                          onClick={() => {
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
                          <span className="uppercase">{m.rank} {m.warName}</span>
                          <span className="text-[9px] text-slate-400 font-medium">RG: {m.rg}</span>
                        </button>
                    ))}
                    {militars.filter(m => {
                        const s = addMilitarSearch.toLowerCase();
                        return (m.name || '').toLowerCase().includes(s) || 
                               (m.warName || '').toLowerCase().includes(s) || 
                               (m.rg || '').toString().includes(addMilitarSearch);
                      }).filter(m => !baseRoster.some(br => br.rg === m.rg)).length === 0 && (
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
          <div className="overflow-x-auto relative min-h-[300px]">
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
                            <span className="text-[9px] text-slate-400 font-mono tracking-widest leading-none">
                              RG: {rg}
                            </span>
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
                              <span className="text-[9px] text-indigo-400/80 font-mono tracking-widest leading-none">
                                RG: {permuta.substituteRg}
                              </span>
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
                      <td
                        className="p-2 px-4 text-[8px] text-slate-500 truncate max-w-[200px]"
                        title={getMostruario(isSwapped ? (militars.find(m => m.rg === permuta.substituteRg) || militar) : militar)}
                      >
                        {getMostruario(isSwapped ? (militars.find(m => m.rg === permuta.substituteRg) || militar) : militar)}
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

        {/* SECTION 3: QUANT_MILITARES1 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-amber-50 border-b border-amber-100 p-3 px-4 flex items-center justify-between">
            <h3 className="text-xs font-black text-amber-900 uppercase tracking-widest flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Prontidão Operacional (Quant_Militares1)
            </h3>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-widest">
              Resumo Automático
            </span>
          </div>

          <div className="overflow-x-auto p-4 sm:p-6 bg-slate-50 relative">
            <div className="max-w-xl mx-auto">
              <table className="w-full text-left text-[10px] font-bold uppercase tracking-wider bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                <thead className="bg-[#1e293b] text-white text-[11px]">
                  <tr>
                    <th className="p-2.5 px-4 border-b border-slate-700">
                      Função
                    </th>
                    <th className="p-2.5 px-4 border-b border-slate-700 w-24 text-center">
                      Atual
                    </th>
                    <th className="p-2.5 px-4 border-b border-slate-700 w-24 text-center">
                      Necessária
                    </th>
                    <th className="p-2.5 px-4 border-b border-slate-700 w-24 text-center">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dynamicRequirements.filter(f => f.req > 0).map((funcao) => {
                    const currentCount = Object.values(selectedFunctions)
                      .flat()
                      .filter((v) => v === funcao.name).length;
                    const isOk = currentCount >= funcao.req;
                    return (
                      <tr
                        key={funcao.name}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="p-2.5 px-4 tracking-tighter text-slate-800 text-[11px]">
                          {funcao.name}
                        </td>
                        <td className="p-2.5 px-4 text-center">
                          <span
                            className={cn(
                              "px-2 py-1 rounded-md text-[10px] font-black",
                              currentCount > 0
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-slate-100 text-slate-400",
                            )}
                          >
                            {currentCount}
                          </span>
                        </td>
                        <td className="p-2.5 px-4 text-center text-slate-500 font-black">
                          {funcao.req}
                        </td>
                        <td className="p-2.5 px-4 text-center">
                          {isOk ? (
                            <span className="text-emerald-500 font-black flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />{" "}
                              OK
                            </span>
                          ) : (
                            <span className="text-rose-500 font-black flex items-center justify-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 stroke-[3]" />{" "}
                              DEF
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SECTION 4: CONTROLE DE VIATURAS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-800 border-b border-slate-700 p-3 px-4 flex items-center justify-between">
            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Truck className="w-4 h-4 text-slate-400" />
              Distribuição (Viaturas)
            </h3>
            <span className="text-[10px] font-bold text-slate-300 bg-slate-700 px-2 py-0.5 rounded-full uppercase tracking-widest">
              Manual
            </span>
          </div>

          <div className="overflow-x-auto p-4 sm:p-6 bg-slate-50 relative">
            <table className="w-full text-left text-[10px] font-bold uppercase tracking-wider bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm min-w-[700px]">
              <thead className="bg-[#1e293b] text-white text-[11px]">
                <tr>
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

                  const toggleVtr = () => {
                    setViaturasInfo((prev) =>
                      prev.map((v) =>
                        v.id === vtr.id ? { ...v, ativa: !v.ativa } : v,
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
      </div>

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
    </div>
  );
}
