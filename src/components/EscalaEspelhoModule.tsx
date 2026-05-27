import React, { useState, useEffect, useMemo } from "react";
import { useMilitars } from "../contexts/MilitarContext";
import { PermutaRequest, PermutaStatus } from "../types";
import { collection, query, where, onSnapshot } from "firebase/firestore";
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
} from "lucide-react";

import { motion } from "framer-motion";

function FuncoesMultiSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (v: string[]) => void;
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

  const options = search ? allOptions.filter(o => o.toLowerCase().includes(search.toLowerCase())) : allOptions;

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

export function EscalaEspelhoModule({ obmContext }: EscalaEspelhoModuleProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
  );
  const { militars, loading: militarsLoading } = useMilitars();
  const [permutas, setPermutas] = useState<PermutaRequest[]>([]);
  const [loadingPermutas, setLoadingPermutas] = useState(false);

  const [selectedFunctions, setSelectedFunctions] = useState<
    Record<string, string[]>
  >({});

  const [viaturasInfo, setViaturasInfo] = useState([
    {
      id: "ABT-183",
      vtr: "ABT-183",
      ativa: true,
      condutor: true,
      g1: true,
      g2: true,
      g3: true,
      g4: false,
      cg: true,
      blocked: [],
    },
    {
      id: "ABSL-152",
      vtr: "ABSL-152",
      ativa: true,
      condutor: true,
      g1: true,
      g2: true,
      g3: false,
      g4: false,
      cg: true,
      blocked: [],
    },
    {
      id: "ASE-404",
      vtr: "ASE-404",
      ativa: true,
      condutor: true,
      g1: true,
      g2: false,
      g3: null,
      g4: null,
      cg: null,
      blocked: ["g3", "g4", "cg"],
    },
    {
      id: "ARC-162",
      vtr: "ARC-162",
      ativa: true,
      condutor: true,
      g1: true,
      g2: null,
      g3: null,
      g4: null,
      cg: null,
      blocked: ["g2", "g3", "g4", "cg"],
    },
    {
      id: "AR-583",
      vtr: "AR-583",
      ativa: true,
      condutor: true,
      g1: null,
      g2: null,
      g3: null,
      g4: null,
      cg: null,
      blocked: ["g1", "g2", "g3", "g4", "cg"],
    },
    {
      id: "L-09",
      vtr: "L-09",
      ativa: true,
      condutor: true,
      g1: true,
      g2: false,
      g3: null,
      g4: null,
      cg: null,
      blocked: ["g3", "g4", "cg"],
    },
    {
      id: "BIA-006",
      vtr: "BIA-006",
      ativa: true,
      condutor: true,
      g1: true,
      g2: true,
      g3: null,
      g4: null,
      cg: null,
      blocked: ["g3", "g4", "cg"],
    },
    {
      id: "BIA-013",
      vtr: "BIA-013",
      ativa: false,
      condutor: false,
      g1: false,
      g2: false,
      g3: null,
      g4: null,
      cg: null,
      blocked: ["g3", "g4", "cg"],
    },
    {
      id: "ABT-12",
      vtr: "ABT-12",
      ativa: false,
      condutor: false,
      g1: false,
      g2: false,
      g3: false,
      g4: false,
      cg: false,
      blocked: [],
    },
  ]);

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingPermutas(true);
    const qDate = query(
      collection(db, "permutas"),
      where("date", "==", selectedDate),
      where("status", "==", PermutaStatus.ACCEPTED),
    );

    const unsub = onSnapshot(qDate, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PermutaRequest[];
      const filtered = data.filter(
        (p) => !p.obm || p.obm === obmContext || p.obm === "10º GBM",
      );
      setPermutas(filtered);
      setLoadingPermutas(false);
    });

    return () => unsub();
  }, [selectedDate, obmContext]);

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
    return militarsInObm
      .filter((m) => normalizeAlaField(m.ala) === identifiedAlaStr)
      .sort((a, b) => {
        const rgA = parseInt((a.rg || "").replace(/\D/g, "") || "0");
        const rgB = parseInt((b.rg || "").replace(/\D/g, "") || "0");
        return rgA - rgB;
      });
  }, [militarsInObm, identifiedAlaStr]);

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
    if (militar.adjunto) funcs.push("ADJUNTO");
    if (militar.ativoEncarregado) funcs.push("ENCARREGADO MOTORISTA");
    if (militar.ativoChefeGua) funcs.push("CHEFE GUA");
    if (militar.chefeAbsl) funcs.push("CHEFE ABSL");
    if (militar.chefeAbt) funcs.push("CHEFE ABT");
    if (militar.ativoCondutor) funcs.push("CONDUTOR");
    if (militar.ativoAuxiliar) funcs.push("AUXILIAR GUA");
    if (militar.auxAbt) funcs.push("AUXILIAR ABT");
    if (militar.auxAbsl) funcs.push("AUXILIAR ABSL");
    if (militar.auxArc) funcs.push("AUXILIAR ARC");
    if (militar.auxAse) funcs.push("AUXILIAR ASE");
    if (militar.ativoEnfermeiro) funcs.push("ENFERMEIRO");
    if (militar.ativoMaritimo) funcs.push("MARITIMO");
    if (militar.marinheiros) funcs.push("MARINHEIRO");
    if (militar.mestreAl) funcs.push("MESTRE AL");
    if (militar.mestreBia) funcs.push("MESTRE BIA");
    if (militar.opAma) funcs.push("OPERADOR AMA");
    if (militar.gvAma) funcs.push("GV AMA");
    if (militar.auxRancho) funcs.push("AUX RANCHO");
    if (militar.toqueDeFogo) funcs.push("TOQUE DE FOGO");
    if (militar.deposito) funcs.push("DIA DEPOSITO");
    if (militar.faxina) funcs.push("RESP FAXINA");
    if (militar.sgtDia) funcs.push("SGT DIA");
    if (militar.cmtGuarda) funcs.push("CMT GUARDA");
    if (militar.cbGuarda) funcs.push("CB GUARDA");
    if (militar.cbDia) funcs.push("CB DIA");
    if (militar.ativoComunicante) funcs.push("COMUNICANTE");
    if (militar.sentinela) funcs.push("SENTINELA");
    return funcs.join(", ") || "NÃO CONFIGURADO";
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
        </div>

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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
              <thead className="bg-emerald-600 text-white">
                <tr>
                  <th className="p-3 px-4 border-r border-emerald-500 w-64">
                    Substituído (Sai)
                  </th>
                  <th className="p-3 border-r border-emerald-500 w-8 text-center text-emerald-200">
                    X
                  </th>
                  <th className="p-3 px-4 border-r border-emerald-500 w-64">
                    Substituto (Entra)
                  </th>
                  <th className="p-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {permutas.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-2 px-4 border-r border-slate-100">
                      <div className="flex items-center gap-3 opacity-60 grayscale">
                        <div className="flex flex-col text-left">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">
                            EFETIVO
                          </span>
                          <span className="text-xs font-black text-slate-800 leading-none mb-1 line-through">
                            {formatMilitaryName(p.requesterName || "")}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono tracking-widest leading-none">
                            RG: {p.requesterRg}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-2 border-r border-slate-100 text-center text-slate-300">
                      X
                    </td>
                    <td className="p-2 px-4 border-r border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col text-left">
                          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest leading-none mb-1">
                            PERMUTA APROVADA
                          </span>
                          <span className="text-xs font-black text-emerald-700 leading-none mb-1">
                            {formatMilitaryName(p.substituteName || "")}
                          </span>
                          <span className="text-[9px] text-emerald-600/80 font-mono tracking-widest leading-none">
                            RG: {p.substituteRg}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-2 px-4 text-center">
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[8px] font-black">
                        DEFERIDO
                      </span>
                    </td>
                  </tr>
                ))}
                {permutas.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-4 text-center text-slate-400 font-black text-[10px]"
                    >
                      NENHUMA PERMUTA DEFERIDA PARA ESTA DATA
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 2: TAB_PERMUTA (Escala Espelho Base) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-indigo-50 border-b border-indigo-100 p-3 px-4 flex items-center justify-between">
            <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Tab Permuta (Construção da Escala)
            </h3>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-widest">
              {baseRoster.length} Militares
            </span>
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

                      <td className="p-2 px-4 border-r border-slate-100">
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
                                "text-xs font-black leading-none mb-1",
                                isSwapped
                                  ? "text-slate-600 line-through"
                                  : "text-slate-800",
                              )}
                            >
                              {formatMilitaryName(militar.name || "")}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono tracking-widest leading-none">
                              RG: {rg}
                            </span>
                          </div>
                        </div>
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
                              <span className="text-xs font-black text-indigo-700 leading-none mb-1">
                                {formatMilitaryName(
                                  permuta.substituteName || "",
                                )}
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
                        title={getMostruario(militar)}
                      >
                        {getMostruario(militar)}
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
                  {[
                    { name: "ADJUNTO", req: 1 },
                    { name: "ENCARREGADO DE MOTORISTA", req: 1 },
                    { name: "CONDUTOR AR", req: 1 },
                    { name: "CONDUTOR ABSL", req: 1 },
                    { name: "CONDUTOR ABT", req: 1 },
                    { name: "CONDUTOR ASE", req: 1 },
                    { name: "CONDUTOR ARC", req: 1 },
                    { name: "CHEFE ABSL", req: 1 },
                    { name: "CHEFE ABT", req: 1 },
                    { name: "AUXILIAR / CHEFE ARC", req: 1 },
                    { name: "AUXILIAR ABT", req: 3 },
                    { name: "AUXILIAR ABSL", req: 3 },
                    { name: "ENFERMEIRO", req: 1 },
                    { name: "MESTRE AL", req: 1 },
                    { name: "MESTRE BIA", req: 1 },
                    { name: "MARINHEIRO", req: 4 },
                    { name: "AUXILIAR RANCHO", req: 1 },
                    { name: "TOQUE DE FOGO", req: 1 },
                    { name: "DIA AO DEPOSITO", req: 2 },
                    { name: "RESP FAXINA", req: 1 },
                    { name: "ABASTECEDOR", req: 1 },
                    { name: "SGT DIA", req: 1 },
                    { name: "CMT GUARDA", req: 1 },
                    { name: "CB GUARDA", req: 1 },
                    { name: "CB DIA", req: 1 },
                    { name: "COMUNICANTE", req: 2 },
                    { name: "ESCALANTE", req: 1 },
                    { name: "SENTINELA", req: 4 },
                  ].map((funcao) => {
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
    </div>
  );
}
