import React from 'react';
import { Loader2, Check, X, Edit2, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import { Afastamento } from '../types';
import { UserProfile } from '../../../types';
import { cn, normalizeRg } from '../../../lib/utils';
import { parseRank } from '../../../lib/rankUtils';
import { SearchableMilitarSelect } from './SearchableMilitarSelect';

export function formatDateBr(isoStr?: string): string {
  if (!isoStr) return '—';
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoStr;
}

export function parseDdMmYyyyToIso(dateStr?: string): string | null {
  if (!dateStr) return null;
  const parts = dateStr.trim().split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    if (year.length === 4) {
      return `${year}-${month}-${day}`;
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return null;
}

interface AfastamentosTableProps {
  displayedList: Afastamento[];
  loading: boolean;
  searchTerm: string;
  activeTab: string;
  now: string;
  militars: UserProfile[];
  obmContext: string;
  editingId: string | null;
  editData: Partial<Afastamento>;
  setEditData: (data: Partial<Afastamento>) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onStartEdit: (a: Afastamento) => void;
  onDelete: (id: string, source?: string) => void;
  situacoes: string[];
}

export const AfastamentosTable: React.FC<AfastamentosTableProps> = ({
  displayedList,
  loading,
  searchTerm,
  activeTab,
  now,
  militars,
  obmContext,
  editingId,
  editData,
  setEditData,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onDelete,
  situacoes
}) => {
  const getStatusBadge = (a: Afastamento) => {
    if (now >= a.inicio && now <= a.retorno) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
          Ativo Hoje
        </span>
      );
    }
    if (now < a.inicio) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
          <Clock className="w-2.5 h-2.5" />
          Agendado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
        <CheckCircle2 className="w-2.5 h-2.5" />
        Concluído
      </span>
    );
  };

  const getSituacaoBadge = (situacao: string) => {
    const s = (situacao || '').toUpperCase();
    if (s === 'FERIAS') return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">FÉRIAS</span>;
    if (s === 'LICENÇA' || s === 'LICENCA') return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">LICENÇA</span>;
    if (s === 'CURSO') return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">CURSO</span>;
    if (s === 'DISPENSA') return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">DISPENSA</span>;
    return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">{s}</span>;
  };

  const renderRow = (a: Afastamento) => {
    const militar = militars.find(m => normalizeRg(m.rg) === normalizeRg(a.rg));

    if (editingId === a.id) {
      return (
        <tr key={a.id} className="bg-indigo-50/60 border-b border-indigo-200">
          <td className="p-2 border-r border-slate-200">
            <input
              type="date"
              value={editData.inicio || ''}
              onChange={e => setEditData({ ...editData, inicio: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500 font-mono font-bold"
            />
          </td>
          <td className="p-2 border-r border-slate-200">
            <input
              type="date"
              value={editData.retorno || ''}
              onChange={e => setEditData({ ...editData, retorno: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500 font-mono font-bold"
            />
          </td>
          <td className="p-2 border-r border-slate-200">
            <select
              value={editData.ala || '1'}
              onChange={e => setEditData({ ...editData, ala: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500 font-black uppercase"
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="EXP">EXP</option>
            </select>
          </td>
          <td className="p-2 border-r border-slate-200">
            <SearchableMilitarSelect
              value={editData.rg || ''}
              onChange={(val) => setEditData({ ...editData, rg: val })}
              militars={militars}
              obmContext={obmContext}
            />
          </td>
          <td className="p-2 border-r border-slate-200">
            <select
              value={editData.situacao || 'FERIAS'}
              onChange={e => setEditData({ ...editData, situacao: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500 uppercase font-black text-slate-700"
            >
              {situacoes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </td>
          <td className="p-2 border-r border-slate-200">
            <input
              type="text"
              placeholder="Obs..."
              value={editData.obs || ''}
              onChange={e => setEditData({ ...editData, obs: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500 font-medium"
            />
          </td>
          <td className="p-2 text-center">
            <div className="flex items-center justify-center gap-1">
              <button onClick={onSaveEdit} className="text-emerald-700 bg-emerald-100 hover:bg-emerald-200 p-1.5 rounded-lg transition-colors" title="Salvar">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={onCancelEdit} className="text-slate-500 bg-slate-200 hover:bg-slate-300 p-1.5 rounded-lg transition-colors" title="Cancelar">
                <X className="w-4 h-4" />
              </button>
            </div>
          </td>
        </tr>
      );
    }

    return (
      <tr key={a.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
        <td className="px-3 py-1.5 border-r border-slate-100 font-mono font-bold text-slate-700 text-[11px]">
          {formatDateBr(a.inicio)}
        </td>
        <td className="px-3 py-1.5 border-r border-slate-100 font-mono font-bold text-slate-700 text-[11px]">
          {formatDateBr(a.retorno)}
        </td>
        <td className="px-2.5 py-1.5 border-r border-slate-100 text-center">
          <span className={cn(
            "px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase",
            a.ala === '1' ? 'bg-emerald-100 text-emerald-800' :
            a.ala === '2' ? 'bg-rose-100 text-rose-800' :
            a.ala === '3' ? 'bg-blue-100 text-blue-800' :
            a.ala === '4' ? 'bg-amber-100 text-amber-800' :
            'bg-slate-200 text-slate-800'
          )}>
            ALA {a.ala || '—'}
          </span>
        </td>
        <td className="px-3 py-1.5 border-r border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-slate-800 text-[11px]">
              {militar ? `${parseRank(militar.rank)} ${militar.warName || militar.name}` : `Militar RG: ${a.rg}`}
            </span>
            <span className="font-mono text-[9.5px] font-bold text-slate-400">RG {a.rg}</span>
            {militar?.obm && <span className="text-[8.5px] font-bold bg-slate-100 text-slate-500 px-1 rounded">{militar.obm}</span>}
            {a.source === 'dgp' && <span className="text-[8.5px] font-bold bg-sky-50 text-sky-600 border border-sky-200 px-1 rounded">DGP</span>}
          </div>
        </td>
        <td className="px-3 py-1.5 border-r border-slate-100">
          <div className="flex items-center gap-1.5">
            {getSituacaoBadge(a.situacao)}
            {getStatusBadge(a)}
          </div>
        </td>
        <td className="px-3 py-1.5 border-r border-slate-100 font-medium text-[11px] text-slate-600 max-w-[220px] truncate" title={a.obs}>
          {a.obs || '—'}
        </td>
        <td className="px-2.5 py-1.5 text-center">
          <div className="flex items-center justify-center gap-1">
            {a.source !== 'dgp' ? (
              <>
                <button onClick={() => onStartEdit(a)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-1 rounded-md transition-colors" title="Editar">
                  <Edit2 className="w-3 h-3" />
                </button>
                <button onClick={() => onDelete(a.id, a.source)} className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-md transition-colors" title="Excluir">
                  <Trash2 className="w-3 h-3" />
                </button>
              </>
            ) : (
              <span className="text-[9.5px] text-slate-400 font-bold italic" title="Importado via DGP Férias">DGP</span>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="p-0 overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[760px]">
        <thead>
          <tr className="bg-slate-100/90 text-slate-500 uppercase tracking-widest text-[9.5px] font-black border-b border-slate-200">
            <th className="px-3 py-1.5 border-r border-slate-200 w-24">Início</th>
            <th className="px-3 py-1.5 border-r border-slate-200 w-24">Retorno</th>
            <th className="px-2.5 py-1.5 border-r border-slate-200 text-center w-20">ALA</th>
            <th className="px-3 py-1.5 border-r border-slate-200">Militar / RG</th>
            <th className="px-3 py-1.5 border-r border-slate-200 w-48">Situação & Status</th>
            <th className="px-3 py-1.5 border-r border-slate-200">Observações</th>
            <th className="px-2.5 py-1.5 w-14 text-center">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs">
          {loading ? (
            <tr>
              <td colSpan={7} className="p-4 text-center text-slate-400 font-bold uppercase tracking-widest">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  Carregando registros de afastamentos...
                </div>
              </td>
            </tr>
          ) : displayedList.length === 0 ? (
            <tr>
              <td colSpan={7} className="p-4 text-center text-slate-400 font-bold uppercase tracking-widest text-[11px]">
                {searchTerm
                  ? `Nenhum afastamento encontrado para o termo "${searchTerm}".`
                  : `Nenhum afastamento na categoria ${activeTab.toUpperCase()}.`}
              </td>
            </tr>
          ) : (
            displayedList.map(a => renderRow(a))
          )}
        </tbody>
      </table>
    </div>
  );
};
