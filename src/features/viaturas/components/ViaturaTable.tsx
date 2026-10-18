import React from 'react';
import { Truck } from 'lucide-react';
import { ViaturaConfig } from '../types';
import { ViaturaTableRow } from './ViaturaTableRow';

interface ViaturaTableProps {
  viaturasList: ViaturaConfig[];
  title: string;
  subtitle: string;
  onMoveUp: (vtrId: string) => void;
  onMoveDown: (vtrId: string) => void;
  onToggleExibir: (vtrId: string) => void;
  onSetEspaco: (vtrId: string, espaco: '1' | '1/2' | '1/3') => void;
  onToggleAtiva: (vtrId: string) => void;
  onObmChange: (vtrId: string, newObm: string) => void;
  onToggleSlot: (vtrId: string, prop: keyof ViaturaConfig) => void;
  onEdit: (vtr: ViaturaConfig) => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  onDelete: (id: string) => void;
  availableFunctions: Array<{ id: string; name: string; scaleName: string; categoryId: string }>;
}

export const ViaturaTable: React.FC<ViaturaTableProps> = ({
  viaturasList,
  title,
  subtitle,
  onMoveUp,
  onMoveDown,
  onToggleExibir,
  onSetEspaco,
  onToggleAtiva,
  onObmChange,
  onToggleSlot,
  onEdit,
  confirmDeleteId,
  setConfirmDeleteId,
  onDelete,
  availableFunctions,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="bg-slate-800 border-b border-slate-700 p-3 px-4 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Truck className="w-4 h-4 text-slate-400" />
            {title}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">{subtitle}</p>
        </div>
        <span className="text-[10px] font-bold text-slate-300 bg-slate-700 px-2 py-0.5 rounded-full uppercase tracking-widest">
          Configuração OBM
        </span>
      </div>

      <div className="p-4 sm:p-6 bg-slate-50 relative overflow-x-auto">
        <table className="w-full text-left text-[10px] font-bold uppercase tracking-wider bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm min-w-[760px]">
          <thead className="bg-[#1e293b] text-white text-[11px]">
            <tr>
              <th className="p-3 px-2 border-b border-r border-[#334155] w-14 text-center" title="Alterar ordem da viatura">
                Ordem
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] w-36 text-center" title="Exibir VTR na escala gerada e definir espaço (1, 1/2 ou 1/3)">
                Exibição
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] w-12 text-center" title="Ativar VTR?">
                Ativar
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-28">
                Viaturas
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-28">
                OBM
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-20">
                Situação
              </th>
              <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-20" title="Condutor (Viatura Terrestre) ou Mestre (Embarcação Marítima)">
                Cond. / Mestre
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
              <th className="p-3 px-2 border-b border-r border-[#334155] text-center w-12">
                CG
              </th>
              <th className="p-3 px-2 border-b border-[#334155] text-center w-20">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {viaturasList.map((vtr, idx) => (
              <ViaturaTableRow
                key={vtr.id}
                vtr={vtr}
                idx={idx}
                isFirst={idx === 0}
                isLast={idx === viaturasList.length - 1}
                onMoveUp={() => onMoveUp(vtr.id)}
                onMoveDown={() => onMoveDown(vtr.id)}
                onToggleExibir={() => onToggleExibir(vtr.id)}
                onSetEspaco={(espaco) => onSetEspaco(vtr.id, espaco)}
                onToggleAtiva={() => onToggleAtiva(vtr.id)}
                onObmChange={(newObm) => onObmChange(vtr.id, newObm)}
                onToggleSlot={(prop) => onToggleSlot(vtr.id, prop)}
                onEdit={() => onEdit(vtr)}
                confirmDeleteId={confirmDeleteId}
                onAskDelete={() => setConfirmDeleteId(vtr.id)}
                onConfirmDelete={() => onDelete(vtr.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
                availableFunctions={availableFunctions}
              />
            ))}
            {viaturasList.length === 0 && (
              <tr>
                <td colSpan={13} className="p-8 text-center text-slate-400 font-bold">
                  Nenhuma viatura cadastrada nesta categoria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
