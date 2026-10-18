import React from 'react';
import { ArrowRightLeft, Plus, Check, X, Clock } from 'lucide-react';
import { PermutaRequest, PermutaStatus } from '../types';
import { RankInsignia } from '../../../components/RankInsignia';
import { FuncoesMultiSelect } from './FuncoesMultiSelect';
import { cn } from '../../../lib/utils';

export interface EscalaPermutasSectionProps {
  permutas: PermutaRequest[];
  militars: any[];
  loadingPermutas: boolean;
  onOpenNewPermutaModal: () => void;
  onStatusChange: (permuta: PermutaRequest, status: PermutaStatus) => void;
  onUpdateFunctions: (permutaId: string, funcs: string[]) => Promise<void>;
  getAllowedOptions: (militar: any) => string[] | undefined;
}

export function EscalaPermutasSection({
  permutas,
  militars,
  loadingPermutas,
  onOpenNewPermutaModal,
  onStatusChange,
  onUpdateFunctions,
  getAllowedOptions,
}: EscalaPermutasSectionProps) {
  const activePermutas = permutas.filter(p => !p.isLookingForSubstitute || (p.requesterRg && p.substituteRg));

  const removeRankFromName = (name: string, rank: string) => {
    if (!name) return '';
    let resultName = name.toUpperCase().trim();
    const upRank = rank?.toUpperCase().trim();
    if (upRank && resultName.startsWith(upRank)) {
      resultName = resultName.substring(upRank.length).trim();
    }
    const prefixes = [
      'SOLDADO ', 'SD ', 'CABO ', 'CB ', '3º SGT ', '3SGT ', '3 SGT ', 
      '2º SGT ', '2SGT ', '2 SGT ', '1º SGT ', '1SGT ', '1 SGT ', 
      'SUBTENENTE ', 'SUBTEN ', 'ST ', 'ASP OF ', 'ASPIRANTE ', 'ASP ', 
      '2º TEN ', '2TEN ', '2 TEN ', '1º TEN ', '1TEN ', '1 TEN ', 
      'CAPITÃO ', 'CAPITAO ', 'CAP ', 'MAJOR ', 'MAJ ', 'TEN CEL ', 
      'TEN CORONEL ', 'TC ', 'CORONEL ', 'CEL '
    ];
    for (const prefix of prefixes) {
      if (resultName.startsWith(prefix)) {
        resultName = resultName.substring(prefix.length).trim();
        break;
      }
    }
    return resultName;
  };

  const getStatusText = (p: PermutaRequest) => {
    if (p.status === 'accepted') return 'DEFERIDO';
    if (p.status === 'rejected') return 'INDEFERIDO';
    if (p.status === 'cancelled') return 'CANCELADA';
    const fullySigned = p.requesterSigned && p.substituteSigned;
    if (fullySigned) return 'EM ANÁLISE';
    return '1/2 PENDENTE';
  };

  const getRowBgColor = (p: PermutaRequest) => {
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

  const getSelectBgColor = (p: PermutaRequest) => {
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
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-visible relative z-50">
      <div className="bg-emerald-50 rounded-t-2xl border-b border-emerald-100 py-2 px-3.5 flex items-center justify-between">
        <h3 className="text-[11px] font-black text-emerald-900 uppercase tracking-widest flex items-center gap-2">
          <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600" />
          SOLICITAÇÕES DE PERMUTAS
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenNewPermutaModal}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[9.5px] px-2.5 py-1 rounded shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            Nova Permuta
          </button>
        </div>
        {loadingPermutas && (
          <span className="text-[9.5px] font-bold text-emerald-600 animate-pulse uppercase tracking-widest">
            Sincronizando...
          </span>
        )}
      </div>
      <div className="overflow-x-auto no-scrollbar relative">
        <table className="w-full table-fixed border-collapse border-2 shadow-sm text-[10px] uppercase font-bold min-w-[500px] border-[#1e293b]">
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
            <tr className="bg-[#ced6e3] text-slate-900 border-b border-slate-900 text-[9.5px] font-black italic">
              <th className="border-r border-slate-900 py-1 text-center px-0">✓</th>
              <th className="border-r border-slate-900 py-1 text-center px-1">SAI</th>
              <th className="border-r border-slate-900 py-1 text-center uppercase text-[11px] font-black px-0">X</th>
              <th className="border-r border-slate-900 py-1 text-center px-1">ENTRA</th>
              <th className="border-r border-slate-900 py-1 text-center px-0">✓</th>
              <th className="border-r border-slate-900 py-1 text-center px-1">FUNÇÃO</th>
              <th className="border-r border-slate-900 py-1 tracking-tighter text-center px-1">STATUS</th>
              <th className="py-1 text-center px-1">RESP.</th>
            </tr>
          </thead>
          <tbody>
            {activePermutas.map((p) => {
              const requesterData = militars.find(m => m.rg === p.requesterRg);
              const substituteData = militars.find(m => m.rg === p.substituteRg);
              const reqRank = requesterData?.rank || '';
              const subRank = substituteData?.rank || '';
              
              const displayReqName = requesterData?.warName?.toUpperCase() || removeRankFromName(p.requesterName || "", reqRank);
              const displaySubName = substituteData?.warName?.toUpperCase() || removeRankFromName(p.substituteName || "", subRank);

              return (
                <tr
                  key={p.id}
                  className={cn(
                    "border-b border-slate-300 hover:opacity-80 transition-colors h-9",
                    getRowBgColor(p)
                  )}
                >
                  <td className="border-r border-slate-300 px-0.5 py-0.5 text-center">
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
                  <td className="border-r border-slate-300 p-1 align-middle">
                    <div className="flex text-left justify-center items-center gap-2 max-w-[200px] mx-auto opacity-75">
                      {reqRank && (
                        <div className="origin-left shrink-0">
                          <RankInsignia rankStr={reqRank} />
                        </div>
                      )}
                      <div className="flex flex-col text-left justify-center py-0.5 min-w-0">
                        <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest leading-none whitespace-nowrap">{reqRank || 'MIL'}</span>
                        <span className="text-xs font-black uppercase tracking-tight text-slate-800 leading-none truncate block mt-0.5">{displayReqName}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9.5px] font-bold uppercase tracking-widest text-slate-400 font-mono leading-none whitespace-nowrap">RG: {p.requesterRg}</span>
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-1 py-0.2 rounded leading-none">
                            {requesterData?.quadro?.split('/')[0] || 'S/Q'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="border-r border-slate-300 p-1 text-center bg-transparent mix-blend-multiply align-middle">
                    <div className="flex items-center justify-center w-full h-full">
                      <X className="w-3.5 h-3.5 text-red-600 opacity-60 font-black stroke-[3]" />
                    </div>
                  </td>
                  <td className="border-r border-slate-300 p-1 align-middle">
                    <div className="flex text-left justify-center items-center gap-2 max-w-[200px] mx-auto">
                      {subRank && (
                        <div className="origin-left shrink-0">
                          <RankInsignia rankStr={subRank} />
                        </div>
                      )}
                      <div className="flex flex-col text-left justify-center py-0.5 min-w-0">
                        <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest leading-none whitespace-nowrap">{subRank || 'MIL'}</span>
                        <span className="text-xs font-black uppercase tracking-tight text-slate-800 leading-none truncate block mt-0.5">{displaySubName}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9.5px] font-bold uppercase tracking-widest text-slate-400 font-mono leading-none whitespace-nowrap">RG: {p.substituteRg}</span>
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest bg-emerald-50 px-1 py-0.2 rounded leading-none">
                            {substituteData?.quadro?.split('/')[0] || 'S/Q'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="border-r border-slate-300 px-0.5 py-0.5 text-center relative group">
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
                      onChange={(newFuncs) => {
                        if (p.id) onUpdateFunctions(p.id, newFuncs);
                      }}
                    />
                  </td>
                  <td className="border-r border-slate-300 p-1 px-2 text-center align-middle">
                    <select 
                      className={cn(
                        "w-[120px] border-2 rounded px-1 py-0.5 text-[8px] font-black uppercase outline-none focus:border-slate-500 cursor-pointer mx-auto block",
                        getSelectBgColor(p)
                      )}
                      value={p.status}
                      onChange={(e) => onStatusChange(p, e.target.value as PermutaStatus)}
                    >
                      <option value="pending" className={
                        (p.requesterSigned && p.substituteSigned) 
                          ? 'bg-yellow-100 text-yellow-900' 
                          : 'bg-red-100 text-red-900'
                      }>
                        {getStatusText(p) === 'DEFERIDO' || getStatusText(p) === 'INDEFERIDO' ? 'PENDENTE' : getStatusText(p)}
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
              );
            })}
            {activePermutas.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="p-2.5 text-center text-slate-400 font-bold text-[11px] uppercase tracking-wider bg-slate-50/70"
                >
                  Nenhuma permuta cadastrada para esta data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
