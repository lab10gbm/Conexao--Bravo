import React from 'react';
import { Table, Trash2, Check } from 'lucide-react';
import { PatrimonioItem } from '../types';

interface PatrimonySpreadsheetViewProps {
  selectedSectionId: string;
  isCustomSection: boolean;
  pastedText: string;
  setPastedText: (text: string) => void;
  parsedRows: string[][];
  ignoreFirstRow: boolean;
  setIgnoreFirstRow: (val: boolean) => void;
  columnMappings: number[];
  setColumnMappings: React.Dispatch<React.SetStateAction<number[]>>;
  getFinalParsedItems: () => PatrimonioItem[];
  onResetToDefault: () => void;
  onSaveSpreadsheetData: () => void;
  onCancel: () => void;
}

export function PatrimonySpreadsheetView({
  selectedSectionId,
  isCustomSection,
  pastedText,
  setPastedText,
  parsedRows,
  ignoreFirstRow,
  setIgnoreFirstRow,
  columnMappings,
  setColumnMappings,
  getFinalParsedItems,
  onResetToDefault,
  onSaveSpreadsheetData,
  onCancel,
}: PatrimonySpreadsheetViewProps) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h4 className="font-black text-slate-800 uppercase text-xs tracking-wider mb-1 flex items-center gap-2">
            <Table className="w-4 h-4 text-cyan-600 animate-pulse" />
            Copiar e Colar Planilha Excel
          </h4>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Selecione e copie as colunas da sua planilha Excel (ID, descrição e quantidade) e cole-as no campo de texto abaixo.
          </p>
        </div>
        
        {isCustomSection && (
          <button
            onClick={onResetToDefault}
            className="px-3 py-1.5 text-xs font-black uppercase tracking-wider text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl flex items-center gap-1.5 transition-all border border-red-200 shadow-sm bg-white shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reverter para o Padrão
          </button>
        )}
      </div>
      
      <div>
        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest">
          Área de Colagem (Pressione Ctrl+V ou Cmd+V aqui)
        </label>
        <textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder={`Exemplo de colagem do Excel:
01	Armário de Aço Cinza com Prateleiras	2
02	Mesa de Escritório Tipo L	1
03	Cadeira de Escritório Giratória Azul	3`}
          rows={5}
          className="w-full bg-white border border-slate-200 rounded-xl p-4 font-mono text-xs focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 focus:outline-none transition-all placeholder-slate-300 resize-y"
        />
      </div>
      
      {parsedRows.length > 0 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-4 py-3 border border-slate-100 rounded-xl shadow-sm gap-2 font-sans">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ignoreFirstRow}
                onChange={(e) => setIgnoreFirstRow(e.target.checked)}
                className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              Desconsiderar primeira linha (Cabeçalho da Planilha)
            </label>
            
            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600 bg-cyan-50 px-2 py-1 rounded-lg shrink-0">
              {getFinalParsedItems().length} itens detectados
            </span>
          </div>

          {/* Column mapping selection */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm font-sans">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-sans">
              Mapeador de Colunas Detectadas
            </h5>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {["Coluna ID / Código", "Coluna Descrição", "Coluna Quantidade"].map((colTitle, colMapIdx) => (
                <div key={colTitle} className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 font-sans">{colTitle}</span>
                  <select
                    value={columnMappings[colMapIdx]}
                    onChange={(e) => {
                      const newVal = parseInt(e.target.value, 10);
                      setColumnMappings(prev => {
                        const next = [...prev];
                        next[colMapIdx] = newVal;
                        return next;
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-cyan-500 font-sans"
                  >
                    <option value={-1}>
                      {colMapIdx === 0 ? "Gerar ID automático (01, 02...)" : colMapIdx === 2 ? "Fixar quantidade como 1" : "Ignorar coluna"}
                    </option>
                    {parsedRows[0]?.map((colSample, cellIdx) => (
                      <option key={cellIdx} value={cellIdx}>
                        Coluna {cellIdx + 1} ({colSample.length > 20 ? colSample.substring(0, 17) + "..." : colSample || "vazia"})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Final outputs preview table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-60 overflow-y-auto shadow-sm font-sans">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="px-4 py-2.5">ID final</th>
                  <th className="px-4 py-2.5">Descrição do Item Mapeado</th>
                  <th className="px-4 py-2.5 text-right pr-6">Qtd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                {getFinalParsedItems().map((item, idx) => (
                  <tr key={`${item.id}-${idx}`} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 text-cyan-600 font-extrabold">{item.id}</td>
                    <td className="px-4 py-2 max-w-sm truncate text-slate-600">{item.descricao}</td>
                    <td className="px-4 py-2 text-right pr-6 text-slate-950 font-black">{item.quantidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Actions bar */}
          <div className="flex gap-3 justify-end pt-2 font-sans">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Cancelar
            </button>
            <button
              onClick={onSaveSpreadsheetData}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Confirmar e Salvar Carga
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
