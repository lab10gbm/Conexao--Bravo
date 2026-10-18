import React from 'react';
import { Settings, X } from 'lucide-react';
import { RankInsignia } from '../../../components/RankInsignia';
import { parseRank } from '../../../lib/rankUtils';
import { formatMilitaryName } from '../../../lib/utils';
import { FuncoesMultiSelect } from './FuncoesMultiSelect';
import { getRawAllowedOptions } from '../lib/escalaCalculos';
import { CategoryConfig, SelectableControlFunction } from '../../../components/ControleCategoriasModal';

export interface EscalaPredefinicoesModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseRoster: any[];
  predefinicoes: Record<string, string[]>;
  onUpdatePredefinicao: (militarRg: string, funcs: string[]) => void;
  categories: CategoryConfig[];
  availableControlFunctions: SelectableControlFunction[];
  viaturasInfo: any[];
  extraFuncOptions?: string[];
}

export function EscalaPredefinicoesModal({
  isOpen,
  onClose,
  baseRoster,
  predefinicoes,
  onUpdatePredefinicao,
  categories,
  availableControlFunctions,
  viaturasInfo,
  extraFuncOptions,
}: EscalaPredefinicoesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
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
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 border-b border-slate-100 shrink-0">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            Busque o militar e selecione a função que ele deve assumir prioritariamente no sorteio.
          </p>
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
                      allowedOptions={getRawAllowedOptions(militar, categories, availableControlFunctions, viaturasInfo)}
                      extraOptions={extraFuncOptions}
                      onChange={(newVal) => onUpdatePredefinicao(militar.rg || '', newVal)}
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
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
