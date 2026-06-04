import React, { useState, useEffect } from "react";
import { Settings, X, Save, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { cleanUndefined } from "../lib/utils";

export interface FuncaoConfig {
  name: string;
  qtdNecessaria: number;
}

// In a real app this would go to Firestore,
// for now we make it stateful or persist to localStorage to show intention.

const INITIAL_FUNCOES = [
  "ADJUNTO",
  "ENCARREGADO DE MOTORISTA",
  "CONDUTOR AR",
  "CONDUTOR ABSL",
  "CONDUTOR ABT",
  "CONDUTOR ASE",
  "CONDUTOR ARC",
  "CHEFE ABSL",
  "CHEFE ABT",
  "AUXILIAR / CHEFE ARC",
  "AUXILIAR ABT",
  "AUXILIAR ABSL",
  "ENFERMEIRO",
  "MESTRE AL",
  "MESTRE BIA",
  "MARINHEIRO",
  "OPERADOR AMA",
  "GV AMA",
  "AUXILIAR RANCHO",
  "TOQUE DE FOGO",
  "DIA AO DEPOSITO",
  "RESP FAXINA",
  "ABASTECEDOR",
  "SGT DIA",
  "CMT GUARDA",
  "CB GUARDA",
  "CB DIA",
  "COMUNICANTE",
  "PRECARIO",
  "ESCALANTE",
  "PRECARIO ADM",
  "SENTINELA",
];

interface CorrelacaoFuncoesModalProps {
  isOpen: boolean;
  onClose: () => void;
  obmContext: string;
}

export function CorrelacaoFuncoesModal({
  isOpen,
  onClose,
  obmContext,
}: CorrelacaoFuncoesModalProps) {
  // Matriz de correlação: correlation[funcao1][funcao2] = 0 (compatível) ou 1 (incompatível)
  const [correlation, setCorrelation] = useState<
    Record<string, Record<string, number>>
  >({});
  const [qtds, setQtds] = useState<Record<string, number>>({});
  const [hoveredCell, setHoveredCell] = useState<{
    row: string | null;
    col: string | null;
  }>({ row: null, col: null });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!isOpen) return;
      setLoading(true);

      try {
        const docRef = doc(db, "obm_settings", obmContext);
        const snapshot = await getDoc(docRef);

        let loadedCorr = snapshot.exists()
          ? snapshot.data()?.escala_regras?.correlation
          : null;
        let loadedQtds = snapshot.exists()
          ? snapshot.data()?.escala_regras?.qtds
          : null;

        // Always build defaults
        const initialCorr: Record<string, Record<string, number>> = {};
        const initialQtd: Record<string, number> = {};

        INITIAL_FUNCOES.forEach((f1) => {
          initialCorr[f1] = {};
          INITIAL_FUNCOES.forEach((f2) => {
            initialCorr[f1][f2] = loadedCorr?.[f1]?.[f2] ?? 0;
          });
          initialQtd[f1] = loadedQtds?.[f1] ?? 1;
        });

        // Apply fallback mock if no data exists at all
        if (!loadedCorr) {
          if (initialCorr["ADJUNTO"]) {
            initialCorr["ADJUNTO"]["CHEFE ABSL"] = 1;
            initialCorr["ADJUNTO"]["CHEFE ABT"] = 1;
            initialCorr["ADJUNTO"]["CMT GUARDA"] = 1;
          }
          if (initialCorr["ENCARREGADO DE MOTORISTA"]) {
            initialCorr["ENCARREGADO DE MOTORISTA"]["CONDUTOR ABSL"] = 1;
            initialCorr["ENCARREGADO DE MOTORISTA"]["CONDUTOR ABT"] = 1;
          }
        }

        if (!loadedQtds) {
          initialQtd["SENTINELA"] = 4;
          initialQtd["AUXILIAR ABT"] = 3;
          initialQtd["AUXILIAR ABSL"] = 3;
        }

        setCorrelation(initialCorr);
        setQtds(initialQtd);
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isOpen, obmContext]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, "obm_settings", obmContext);
      await setDoc(
        docRef,
        cleanUndefined({
                  escala_regras: {
                    correlation,
                    qtds,
                  },
                }),
        { merge: true },
      );
      onClose(); // Optional: close after save
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (f1: string, f2: string) => {
    setCorrelation((prev) => ({
      ...prev,
      [f1]: {
        ...prev[f1],
        [f2]: prev[f1][f2] === 1 ? 0 : 1,
      },
      [f2]: {
        ...prev[f2],
        [f1]: prev[f1][f2] === 1 ? 0 : 1, // Symmetric
      },
    }));
  };

  const handleQtdChange = (f: string, val: number) => {
    setQtds((prev) => ({
      ...prev,
      [f]: val,
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-[95vw] h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-slate-800 p-4 shrink-0 flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center border border-slate-600 shadow-inner">
                <Settings className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white tracking-tight uppercase">
                  Matriz de Correlação de Funções
                </h2>
                <p className="text-xs font-semibold text-slate-400 tracking-wider">
                  Configure Incompatibilidades (1) e Compatibilidades (0)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-700/50 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-auto bg-slate-50 relative p-4">
            <div className="w-max mx-auto bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
              <table className="text-[10px] font-bold text-center border-collapse">
                <thead>
                  <tr>
                    <th className="sticky top-0 left-0 z-20 bg-slate-100 p-2 border-b border-slate-200 border-r w-48 text-left text-slate-700 uppercase tracking-widest shadow-sm">
                      Funções
                    </th>
                    {INITIAL_FUNCOES.map((col) => (
                      <th
                        key={col}
                        className={cn(
                          "sticky top-0 z-10 p-2 border-b border-r w-8 rotate-180 transition-colors",
                          hoveredCell.col === col
                            ? "bg-indigo-500 text-white border-indigo-600"
                            : "bg-[#1e293b] text-white border-slate-700",
                        )}
                        style={{ writingMode: "vertical-rl" }}
                      >
                        <span className="tracking-widest opacity-90">
                          {col}
                        </span>
                      </th>
                    ))}
                    <th
                      className="sticky top-0 z-10 bg-emerald-600 text-emerald-50 p-2 border-b border-emerald-700 w-12 shadow-sm"
                      style={{
                        writingMode: "vertical-rl",
                        transform: "rotate(180deg)",
                      }}
                    >
                      <span className="tracking-widest">QTD MAX</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {INITIAL_FUNCOES.map((row) => (
                    <tr key={row} className="group">
                      <td
                        className={cn(
                          "sticky left-0 z-10 border-r border-b p-2 text-left w-48 shadow-sm transition-colors",
                          hoveredCell.row === row
                            ? "bg-indigo-100 border-indigo-200"
                            : "bg-slate-50 border-slate-200 group-hover:bg-indigo-50",
                        )}
                      >
                        <span
                          className={cn(
                            "truncate block font-black transition-colors",
                            hoveredCell.row === row
                              ? "text-indigo-900"
                              : "text-slate-700",
                          )}
                        >
                          {row}
                        </span>
                      </td>
                      {INITIAL_FUNCOES.map((col) => {
                        const isSelf = row === col;
                        const val = correlation[row]?.[col] ?? 0;
                        const isIncompatible = val === 1;

                        const isIntersecting =
                          hoveredCell.row === row || hoveredCell.col === col;
                        const isHovered =
                          hoveredCell.row === row && hoveredCell.col === col;

                        return (
                          <td
                            key={col}
                            onMouseEnter={() => setHoveredCell({ row, col })}
                            onMouseLeave={() =>
                              setHoveredCell({ row: null, col: null })
                            }
                            className={cn(
                              "border-r border-b p-0 m-0 w-8 h-8 transition-colors cursor-pointer relative",
                              isSelf
                                ? "bg-slate-200 cursor-not-allowed"
                                : isIncompatible
                                  ? isIntersecting
                                    ? "bg-rose-200 text-rose-800"
                                    : "bg-rose-100 text-rose-700"
                                  : isIntersecting
                                    ? "bg-indigo-50 text-indigo-700"
                                    : "bg-white text-slate-400",
                              isHovered &&
                                !isSelf &&
                                "ring-2 ring-indigo-500 ring-inset z-10 bg-indigo-100",
                            )}
                            onClick={() => !isSelf && handleToggle(row, col)}
                          >
                            <span
                              className={cn(
                                "flex items-center justify-center w-full h-full text-xs font-black",
                                isSelf && "opacity-0",
                              )}
                            >
                              {isSelf ? "-" : val}
                            </span>
                          </td>
                        );
                      })}
                      <td className="border-b border-slate-200 bg-emerald-50 w-12 p-1">
                        <input
                          type="number"
                          min="0"
                          max="99"
                          value={qtds[row] || 0}
                          onChange={(e) =>
                            handleQtdChange(row, parseInt(e.target.value) || 0)
                          }
                          className="w-full h-full bg-transparent text-center font-black text-emerald-900 border-none outline-none focus:bg-emerald-100 rounded"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-4 shrink-0 border-t border-slate-200 flex items-center justify-between shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
            <div className="text-xs font-medium text-slate-500 max-w-lg">
              <strong>0</strong> = Compatível (Pode acumular) |{" "}
              <strong>1</strong> = Incompatível (Restrito). Alterações nesta
              matriz impactarão a validação da Escala Espelho.
            </div>
            <button
              onClick={handleSave}
              disabled={loading || saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 py-2.5 text-[11px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Salvando..." : "Salvar Configuração"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
