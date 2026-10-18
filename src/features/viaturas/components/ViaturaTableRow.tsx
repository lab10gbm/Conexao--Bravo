import React from 'react';
import { Edit2, Trash2, Check, X } from 'lucide-react';
import { ViaturaConfig, OBM_OPTIONS } from '../types';
import { cn } from '../../../lib/utils';
import { buildModalFunctionsFromVtr, getFunctionRoleCategory } from '../lib/viaturaUtils';

interface ViaturaTableRowProps {
  vtr: ViaturaConfig;
  idx: number;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleExibir: () => void;
  onSetEspaco: (espaco: '1' | '1/2' | '1/3') => void;
  onToggleAtiva: () => void;
  onObmChange: (newObm: string) => void;
  onToggleSlot: (prop: keyof ViaturaConfig) => void;
  onEdit: () => void;
  confirmDeleteId: string | null;
  onAskDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  availableFunctions: Array<{ id: string; name: string; scaleName: string; categoryId: string }>;
}

export const ViaturaTableRow: React.FC<ViaturaTableRowProps> = ({
  vtr,
  idx,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onToggleExibir,
  onSetEspaco,
  onToggleAtiva,
  onObmChange,
  onToggleSlot,
  onEdit,
  confirmDeleteId,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
  availableFunctions,
}) => {
  const isAtiva = Boolean(vtr.ativa);
  const isExibir = vtr.exibir !== undefined ? Boolean(vtr.exibir) : true;
  const vtrEspaco: '1' | '1/2' | '1/3' = vtr.espaco === '1/3' ? '1/3' : (vtr.espaco === '1/2' ? '1/2' : '1');

  return (
    <tr className={cn("hover:bg-slate-50 transition-colors group", idx % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
      {/* Ordem */}
      <td className="p-1 px-1.5 border-r border-slate-200 text-center align-middle">
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={isFirst}
            className={cn(
              "w-5 h-5 rounded flex items-center justify-center text-[10px] font-black transition-colors cursor-pointer",
              isFirst
                ? "text-slate-300 cursor-not-allowed"
                : "bg-slate-100 hover:bg-slate-700 hover:text-white text-slate-700 shadow-xs"
            )}
            title="Mover viatura para cima"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={isLast}
            className={cn(
              "w-5 h-5 rounded flex items-center justify-center text-[10px] font-black transition-colors cursor-pointer",
              isLast
                ? "text-slate-300 cursor-not-allowed"
                : "bg-slate-100 hover:bg-slate-700 hover:text-white text-slate-700 shadow-xs"
            )}
            title="Mover viatura para baixo"
          >
            ▼
          </button>
        </div>
      </td>

      {/* Exibição */}
      <td className="p-1 px-2 border-r border-slate-200 text-center align-middle">
        <div className="flex items-center justify-center gap-1.5">
          <div
            onClick={(e) => { e.stopPropagation(); onToggleExibir(); }}
            title={isExibir ? "Viatura exibida na escala gerada" : "Viatura oculta na escala gerada"}
            className="cursor-pointer shrink-0"
          >
            {isExibir ? (
              <div className="w-4 h-4 bg-slate-700/80 rounded-[3px] text-white flex items-center justify-center shadow-sm hover:bg-slate-800 transition">
                <span className="text-[10px]">✓</span>
              </div>
            ) : (
              <div className="w-4 h-4 border border-slate-300 rounded-[3px] hover:border-slate-500 transition" />
            )}
          </div>

          <div
            className={cn(
              "inline-flex items-center rounded border border-slate-200 overflow-hidden bg-slate-100 text-[9px] font-black transition-opacity",
              !isExibir && "opacity-40"
            )}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSetEspaco('1'); }}
              className={cn(
                "px-1.5 py-0.5 transition-colors cursor-pointer",
                vtrEspaco === '1'
                  ? "bg-slate-800 text-white font-black"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              )}
              title="1 espaço completo (coluna inteira)"
            >
              1
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSetEspaco('1/2'); }}
              className={cn(
                "px-1 py-0.5 border-l border-slate-200 transition-colors cursor-pointer",
                vtrEspaco === '1/2'
                  ? "bg-slate-800 text-white font-black"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              )}
              title="1/2 espaço (meia coluna compartilhada)"
            >
              1/2
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSetEspaco('1/3'); }}
              className={cn(
                "px-1 py-0.5 border-l border-slate-200 transition-colors cursor-pointer",
                vtrEspaco === '1/3'
                  ? "bg-slate-800 text-white font-black"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              )}
              title="1/3 espaço (terço de coluna compartilhada)"
            >
              1/3
            </button>
          </div>
        </div>
      </td>

      {/* Ativar */}
      <td
        className="p-1 border-r border-slate-200 text-center align-middle cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onToggleAtiva(); }}
        title={isAtiva ? "Viatura ativa" : "Viatura inativa"}
      >
        {isAtiva ? (
          <div className="w-4 h-4 bg-slate-700/80 rounded-[3px] text-white flex items-center justify-center mx-auto shadow-sm hover:bg-slate-800 transition">
            <span className="text-[10px]">✓</span>
          </div>
        ) : (
          <div className="w-4 h-4 border border-slate-300 rounded-[3px] mx-auto hover:border-slate-500 transition" />
        )}
      </td>

      {/* Viatura Nome + Resumo de Funções */}
      <td className="p-2 border-r border-slate-200 text-center">
        <div className="font-black text-slate-800">{vtr.vtr}</div>
        <div className="flex flex-col items-center justify-center gap-1 mt-1">
          {buildModalFunctionsFromVtr(vtr, availableFunctions).map((fnRow) => {
            const found = availableFunctions.find(f => f.id === fnRow.fnId);
            const label = fnRow.fnId === '__CUSTOM__'
              ? (fnRow.customName || 'CUSTOM')
              : (found?.scaleName || found?.name || 'FUNÇÃO');
            const roleCat = getFunctionRoleCategory(fnRow.fnId, fnRow.customName, availableFunctions);
            const qtyLabel = roleCat === 'auxiliar' ? `ATÉ ${fnRow.maxQty}` : '1';
            return (
              <span
                key={fnRow.uid}
                className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[8px] font-bold text-slate-700 uppercase leading-tight whitespace-nowrap"
              >
                {label} ({qtyLabel})
              </span>
            );
          })}
        </div>
      </td>

      {/* OBM */}
      <td className="p-2 border-r border-slate-200 text-center">
        <select
          value={vtr.obm || "10º GBM"}
          onChange={(e) => onObmChange(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[10px] font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
        >
          {OBM_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </td>

      {/* Situação */}
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

      {/* Slots: Condutor, G1, G2, G3, G4, CG */}
      {(['condutor', 'g1', 'g2', 'g3', 'g4', 'cg'] as const).map((prop) => {
        const isBlocked = vtr.blocked.includes(prop);
        const isChecked = vtr[prop] === true;

        if (isBlocked) {
          return (
            <td
              key={prop}
              className="bg-slate-700 opacity-90 p-0 border-r border-slate-200 text-center cursor-pointer"
              onClick={() => onToggleSlot(prop)}
              title="Clique para alternar: Bloqueado -> Desmarcado"
            >
              <div className="w-full h-full min-h-[32px] flex items-center justify-center"></div>
            </td>
          );
        }

        return (
          <td
            key={prop}
            className="p-1 border-r border-slate-200 text-center align-middle cursor-pointer"
            onClick={() => onToggleSlot(prop)}
            title="Clique para alternar: Desmarcado -> Marcado -> Bloqueado"
          >
            <div className="flex items-center justify-center h-full p-2">
              {isChecked ? (
                <div className="w-3.5 h-3.5 bg-slate-700/80 rounded-[3px] text-white flex items-center justify-center shadow-sm hover:bg-slate-800 transition">
                  <span className="text-[10px]">✓</span>
                </div>
              ) : (
                <div className="w-3.5 h-3.5 border border-slate-300 rounded-[3px] hover:border-slate-500 transition" />
              )}
            </div>
          </td>
        );
      })}

      {/* Ações */}
      <td className="p-2 text-center">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
            title="Editar viatura"
          >
            <Edit2 className="w-4 h-4 mx-auto" />
          </button>
          {confirmDeleteId === vtr.id ? (
            <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
              <button
                onClick={onConfirmDelete}
                className="p-1.5 text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors cursor-pointer"
                title="Confirmar exclusão"
              >
                <Check className="w-4 h-4 mx-auto" />
              </button>
              <button
                onClick={onCancelDelete}
                className="p-1.5 text-slate-500 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Cancelar"
              >
                <X className="w-4 h-4 mx-auto" />
              </button>
            </div>
          ) : (
            <button
              onClick={onAskDelete}
              className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Remover viatura"
            >
              <Trash2 className="w-4 h-4 mx-auto" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};
