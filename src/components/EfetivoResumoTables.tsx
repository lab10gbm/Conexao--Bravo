import React, { useState } from "react";
import { UserProfile } from "../types";
import {
  parseRank,
  COLS_OFICIAIS,
  RANKS_PRACAS,
  isOfficer,
  isPraca,
} from "../lib/rankUtils";
import { Columns, LayoutGrid } from "lucide-react";

export function EfetivoResumoTables({
  militars,
  onFilterClick,
}: {
  militars: UserProfile[];
  onFilterClick?: (f: { rank?: string; quadro?: string; ala?: string }) => void;
}) {
  const [viewType, setViewType] = useState<"quadro" | "ala">("quadro");

  const handleCellClick = (f: {
    rank?: string;
    quadro?: string;
    ala?: string;
  }) => {
    if (onFilterClick) onFilterClick(f);
  };

  const getQuadroPrefix = (q?: string) => {
    if (!q) return "S/Q";
    return q.split("/")[0].toUpperCase().trim();
  };

  // --- OFICIAIS ---
  const oficiais = militars.filter((m) => isOfficer(parseRank(m.rank)));
  const quadrosOficiais = Array.from(
    new Set(oficiais.map((m) => getQuadroPrefix(m.quadro))),
  ).sort();

  // Count Oficiais by Quadro
  const ofiCounts: Record<string, Record<string, number>> = {};
  quadrosOficiais.forEach((q) => {
    ofiCounts[q] = {};
    COLS_OFICIAIS.forEach((r) => (ofiCounts[q][r] = 0));
  });
  oficiais.forEach((m) => {
    const q = getQuadroPrefix(m.quadro);
    const r = parseRank(m.rank);
    if (ofiCounts[q] && ofiCounts[q][r] !== undefined) {
      ofiCounts[q][r]++;
    }
  });

  const ofiTotalByRank: Record<string, number> = {};
  COLS_OFICIAIS.forEach((r) => (ofiTotalByRank[r] = 0));
  let ofiGrandTotal = 0;

  // --- PRAÇAS ---
  const pracas = militars.filter((m) => isPraca(parseRank(m.rank)));
  const quadrosPracas = Array.from(
    new Set(pracas.map((m) => getQuadroPrefix(m.quadro))),
  ).sort();

  // Count Praças by Quadro
  const pracasCounts: Record<string, Record<string, number>> = {};
  RANKS_PRACAS.forEach((r) => {
    pracasCounts[r] = {};
    quadrosPracas.forEach((q) => (pracasCounts[r][q] = 0));
  });
  pracas.forEach((m) => {
    const q = getQuadroPrefix(m.quadro);
    const r = parseRank(m.rank);
    if (pracasCounts[r] && pracasCounts[r][q] !== undefined) {
      pracasCounts[r][q]++;
    }
  });

  const pracasTotalByQuadro: Record<string, number> = {};
  quadrosPracas.forEach((q) => (pracasTotalByQuadro[q] = 0));
  let pracasGrandTotal = 0;

  // --- ALA DATA (Praças) ---
  const alas =
    Array.from(new Set(pracas.map((m) => m.ala?.toString() || "S/A"))).sort() ||
    [];

  const pracasAlaRankCounts: Record<string, Record<string, number>> = {};
  RANKS_PRACAS.forEach((r) => {
    pracasAlaRankCounts[r] = {};
    alas.forEach((a) => (pracasAlaRankCounts[r][a] = 0));
  });

  const pracasAlaQuadroCounts: Record<string, Record<string, number>> = {};
  quadrosPracas.forEach((q) => {
    pracasAlaQuadroCounts[q] = {};
    alas.forEach((a) => (pracasAlaQuadroCounts[q][a] = 0));
  });

  pracas.forEach((m) => {
    const q = getQuadroPrefix(m.quadro);
    const r = parseRank(m.rank);
    const a = m.ala?.toString() || "S/A";

    if (pracasAlaRankCounts[r] && pracasAlaRankCounts[r][a] !== undefined) {
      pracasAlaRankCounts[r][a]++;
    }
    if (pracasAlaQuadroCounts[q] && pracasAlaQuadroCounts[q][a] !== undefined) {
      pracasAlaQuadroCounts[q][a]++;
    }
  });

  const pracasAlaTotal: Record<string, number> = {};
  alas.forEach((a) => (pracasAlaTotal[a] = 0));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end mb-2">
        <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setViewType("quadro")}
            className={`px-4 py-1.5 rounded flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors ${viewType === "quadro" ? "bg-white shadow-sm text-indigo-700" : "text-slate-500 hover:bg-slate-200"}`}
          >
            <Columns className="w-4 h-4 inline mr-2" /> Por Quadro
          </button>
          <button
            onClick={() => setViewType("ala")}
            className={`px-4 py-1.5 rounded flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors ${viewType === "ala" ? "bg-white shadow-sm text-indigo-700" : "text-slate-500 hover:bg-slate-200"}`}
          >
            <LayoutGrid className="w-4 h-4 inline mr-2" /> Por Ala
          </button>
        </div>
      </div>

      {viewType === "quadro" && (
        <>
          {/* TABELA DE OFICIAIS */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#8cc63f] to-[#1e3b70] p-3 border-b-4 border-[#1e3b70]">
              <h3 className="text-white font-black text-base sm:text-lg tracking-wider text-center drop-shadow-md">
                OFICIAIS
              </h3>
            </div>
            <div className="overflow-x-auto no-scrollbar relative">
              <div className="sm:hidden mb-2 flex items-center gap-1.5 px-2 py-1 bg-slate-50 border-b border-slate-100">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  Deslize para ver quadro →
                </span>
              </div>
              <table className="w-full text-center border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-100/50 text-[9px] sm:text-[10px] font-black tracking-widest text-slate-700">
                    <th className="border border-slate-200 p-1.5 sm:p-2 uppercase text-left w-32 sm:w-40">
                      QUADRO
                    </th>
                    {COLS_OFICIAIS.map((r) => (
                      <th
                        key={r}
                        className="border border-slate-200 p-1.5 sm:p-2 uppercase"
                      >
                        {r}
                      </th>
                    ))}
                    <th className="border border-slate-200 p-1.5 sm:p-2 uppercase bg-slate-100">
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[11px] sm:text-xs font-medium text-slate-700">
                  {quadrosOficiais.map((q) => {
                    let rowTotal = 0;
                    return (
                      <tr
                        key={q}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="border border-slate-200 p-1.5 sm:p-2 font-bold text-left">
                          {q}
                        </td>
                        {COLS_OFICIAIS.map((r) => {
                          const val = ofiCounts[q][r];
                          rowTotal += val;
                          ofiTotalByRank[r] += val;
                          return (
                            <td
                              key={r}
                              className={`border border-slate-200 p-1.5 sm:p-2 ${val >= 0 ? "text-indigo-600 font-bold cursor-pointer hover:bg-indigo-50" : ""}`}
                              onClick={() =>
                                handleCellClick({ rank: r, quadro: q })
                              }
                            >
                              {val > 0 ? String(val).padStart(2, "0") : "00"}
                            </td>
                          );
                        })}
                        <td
                          className={`border border-slate-200 p-1.5 sm:p-2 font-bold bg-slate-50 cursor-pointer hover:bg-slate-100 ${rowTotal > 0 ? "text-indigo-700" : ""}`}
                          onClick={() => handleCellClick({ quadro: q })}
                        >
                          {rowTotal > 0 ? String(rowTotal).padStart(2, "0") : "00"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 font-black text-[11px] sm:text-xs text-slate-800">
                  <tr>
                    <td className="border border-slate-200 p-1.5 sm:p-2 text-left">
                      TOTAL
                    </td>
                    {COLS_OFICIAIS.map((r) => {
                      ofiGrandTotal += ofiTotalByRank[r];
                      return (
                        <td
                          key={r}
                          className={`border border-slate-200 p-1.5 sm:p-2 ${ofiTotalByRank[r] >= 0 ? "cursor-pointer hover:bg-slate-200" : ""}`}
                          onClick={() => handleCellClick({ rank: r })}
                        >
                          {ofiTotalByRank[r]}
                        </td>
                      );
                    })}
                    <td
                      className="border border-slate-200 p-1.5 sm:p-2 cursor-pointer hover:bg-slate-200 font-black text-indigo-700"
                      onClick={() => handleCellClick({})}
                    >
                      {ofiGrandTotal}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* TABELA DE PRAÇAS */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6">
            <div className="bg-gradient-to-r from-[#8cc63f] to-[#1e3b70] p-3 border-b-4 border-[#1e3b70]">
              <h3 className="text-white font-black text-base sm:text-lg tracking-wider text-center drop-shadow-md">
                PRAÇAS
              </h3>
            </div>
            <div className="overflow-x-auto no-scrollbar relative">
              <div className="sm:hidden mb-2 flex items-center gap-1.5 px-2 py-1 bg-slate-50 border-b border-slate-100">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  Deslize para ver quadro →
                </span>
              </div>
              <table className="w-full text-center border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-100/50 text-[9px] sm:text-[10px] font-black tracking-widest text-slate-700">
                    <th className="border border-slate-200 p-1.5 sm:p-2 uppercase text-left w-32 sm:w-40">
                      QBMP
                    </th>
                    {quadrosPracas.map((q) => (
                      <th
                        key={q}
                        className="border border-slate-200 p-1.5 sm:p-2 uppercase"
                      >
                        {q}
                      </th>
                    ))}
                    <th className="border border-slate-200 p-1.5 sm:p-2 uppercase bg-slate-100">
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[11px] sm:text-xs font-medium text-slate-700">
                  {RANKS_PRACAS.map((r) => {
                    let rowTotal = 0;
                    return (
                      <tr
                        key={r}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="border border-slate-200 p-1.5 sm:p-2 font-bold text-left bg-slate-50">
                          {r}
                        </td>
                        {quadrosPracas.map((q) => {
                          const val = pracasCounts[r][q];
                          rowTotal += val;
                          pracasTotalByQuadro[q] += val;
                          return (
                            <td
                              key={q}
                              className={`border border-slate-200 p-1.5 sm:p-2 ${val >= 0 ? "text-indigo-600 font-bold cursor-pointer hover:bg-indigo-50" : ""}`}
                              onClick={() => handleCellClick({ rank: r, quadro: q })}
                            >
                              {val > 0 ? String(val).padStart(2, "0") : "00"}
                            </td>
                          );
                        })}
                        <td
                          className={`border border-slate-200 p-1.5 sm:p-2 font-bold bg-slate-50 cursor-pointer hover:bg-slate-100 ${rowTotal > 0 ? "text-indigo-700" : ""}`}
                          onClick={() => handleCellClick({ rank: r })}
                        >
                          {rowTotal > 0 ? String(rowTotal).padStart(2, "0") : "00"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 font-black text-[11px] sm:text-xs text-slate-800">
                  <tr>
                    <td className="border border-slate-200 p-1.5 sm:p-2 text-left">
                      TOTAL
                    </td>
                    {quadrosPracas.map((q) => {
                      pracasGrandTotal += pracasTotalByQuadro[q];
                      return (
                        <td
                          key={q}
                          className={`border border-slate-200 p-1.5 sm:p-2 ${pracasTotalByQuadro[q] >= 0 ? "cursor-pointer hover:bg-slate-200" : ""}`}
                          onClick={() => handleCellClick({ quadro: q })}
                        >
                          {pracasTotalByQuadro[q] >= 0
                            ? String(pracasTotalByQuadro[q]).padStart(2, "0")
                            : "00"}
                        </td>
                      );
                    })}
                    <td
                      className="border border-slate-200 p-1.5 sm:p-2 cursor-pointer hover:bg-slate-200 font-black text-indigo-700"
                      onClick={() => handleCellClick({})}
                    >
                      {pracasGrandTotal}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {viewType === "ala" && (
        <>
          {/* TABELA DE PRAÇAS POR ALA (QBMP vs ALA) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-[#1e3b70] to-[#8cc63f] p-3 border-b-4 border-[#8cc63f]">
              <h3 className="text-white font-black text-base sm:text-lg tracking-wider text-center drop-shadow-md">
                PRAÇAS (POSTO vs ALA)
              </h3>
            </div>
            <div className="overflow-x-auto no-scrollbar relative">
              <div className="sm:hidden mb-2 flex items-center gap-1.5 px-2 py-1 bg-slate-50 border-b border-slate-100">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  Deslize para ver ala →
                </span>
              </div>
              <table className="w-full text-center border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-100/50 text-[9px] sm:text-[10px] font-black tracking-widest text-slate-700">
                    <th className="border border-slate-200 p-1.5 sm:p-2 uppercase text-left w-32 sm:w-40">
                      QBMP
                    </th>
                    {alas.map((a) => (
                      <th
                        key={a}
                        className="border border-slate-200 p-1.5 sm:p-2 uppercase"
                      >
                        {a}
                      </th>
                    ))}
                    <th className="border border-slate-200 p-1.5 sm:p-2 uppercase bg-slate-100">
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[11px] sm:text-xs font-medium text-slate-700">
                  {RANKS_PRACAS.map((r) => {
                    let rowTotal = 0;
                    return (
                      <tr
                        key={r}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="border border-slate-200 p-1.5 sm:p-2 font-bold text-left bg-slate-50">
                          {r}
                        </td>
                        {alas.map((a) => {
                          const val = pracasAlaRankCounts[r][a] || 0;
                          rowTotal += val;
                          pracasAlaTotal[a] += val;
                          return (
                            <td
                              key={a}
                              className={`border border-slate-200 p-1.5 sm:p-2 ${val >= 0 ? "text-indigo-600 font-bold cursor-pointer hover:bg-indigo-50" : ""}`}
                              onClick={() => handleCellClick({ rank: r, ala: a })}
                            >
                              {val > 0 ? String(val).padStart(2, "0") : "00"}
                            </td>
                          );
                        })}
                        <td
                          className={`border border-slate-200 p-1.5 sm:p-2 font-bold bg-slate-50 cursor-pointer hover:bg-slate-100 ${rowTotal > 0 ? "text-indigo-700" : ""}`}
                          onClick={() => handleCellClick({ rank: r })}
                        >
                          {rowTotal > 0 ? String(rowTotal).padStart(2, "0") : "00"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 font-black text-[11px] sm:text-xs text-slate-800">
                  <tr>
                    <td className="border border-slate-200 p-1.5 sm:p-2 text-left">
                      TOTAL
                    </td>
                    {alas.map((a) => {
                      return (
                        <td
                          key={a}
                          className={`border border-slate-200 p-1.5 sm:p-2 ${pracasAlaTotal[a] >= 0 ? "cursor-pointer hover:bg-slate-200" : ""}`}
                          onClick={() => handleCellClick({ ala: a })}
                        >
                          {pracasAlaTotal[a] >= 0
                            ? String(pracasAlaTotal[a]).padStart(2, "0")
                            : "00"}
                        </td>
                      );
                    })}
                    <td
                      className="border border-slate-200 p-1.5 sm:p-2 cursor-pointer hover:bg-slate-200 font-black text-indigo-700"
                      onClick={() => handleCellClick({ ala: "TOTAL" })}
                    >
                      {Object.values(pracasAlaTotal).reduce(
                        (acc, curr) => acc + curr,
                        0,
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* TABELA DE PRAÇAS POR ALA (QUADRO vs ALA) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#1e3b70] to-[#8cc63f] p-3 border-b-4 border-[#8cc63f]">
              <h3 className="text-white font-black text-base sm:text-lg tracking-wider text-center drop-shadow-md">
                PRAÇAS (QUADRO vs ALA)
              </h3>
            </div>
            <div className="overflow-x-auto no-scrollbar relative">
              <div className="sm:hidden mb-2 flex items-center gap-1.5 px-2 py-1 bg-slate-50 border-b border-slate-100">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  Deslize para ver ala →
                </span>
              </div>
              <table className="w-full text-center border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-100/50 text-[9px] sm:text-[10px] font-black tracking-widest text-slate-700">
                    <th className="border border-slate-200 p-1.5 sm:p-2 uppercase text-left w-32 sm:w-40">
                      QUADRO
                    </th>
                    {alas.map((a) => (
                      <th
                        key={a}
                        className="border border-slate-200 p-1.5 sm:p-2 uppercase"
                      >
                        {a}
                      </th>
                    ))}
                    <th className="border border-slate-200 p-1.5 sm:p-2 uppercase bg-slate-100">
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[11px] sm:text-xs font-medium text-slate-700">
                  {quadrosPracas.map((q) => {
                    let rowTotal = 0;
                    return (
                      <tr
                        key={q}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="border border-slate-200 p-1.5 sm:p-2 font-bold text-left bg-slate-50">
                          {q}
                        </td>
                        {alas.map((a) => {
                          const val = pracasAlaQuadroCounts[q][a] || 0;
                          rowTotal += val;
                          return (
                            <td
                              key={a}
                              className={`border border-slate-200 p-1.5 sm:p-2 ${val >= 0 ? "text-indigo-600 font-bold cursor-pointer hover:bg-indigo-50" : ""}`}
                              onClick={() => handleCellClick({ quadro: q, ala: a })}
                            >
                              {val > 0 ? String(val).padStart(2, "0") : "00"}
                            </td>
                          );
                        })}
                        <td
                          className={`border border-slate-200 p-1.5 sm:p-2 font-bold bg-slate-50 cursor-pointer hover:bg-slate-100 ${rowTotal > 0 ? "text-indigo-700" : ""}`}
                          onClick={() => handleCellClick({ quadro: q })}
                        >
                          {rowTotal > 0 ? String(rowTotal).padStart(2, "0") : "00"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
