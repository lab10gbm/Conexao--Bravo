import React from 'react';
import { CalendarDays, Check, Loader2 } from 'lucide-react';
import { SearchableMilitarSelect } from './SearchableMilitarSelect';
import { normalizeAlaField } from '../../../lib/utils';
import { UserProfile } from '../../../types';

export interface AfastamentoAddFormProps {
  newRg: string;
  setNewRg: (val: string) => void;
  newInicio: string;
  setNewInicio: (val: string) => void;
  newRetorno: string;
  setNewRetorno: (val: string) => void;
  newAla: string;
  setNewAla: (val: string) => void;
  newSituacao: string;
  setNewSituacao: (val: string) => void;
  newObs: string;
  setNewObs: (val: string) => void;
  isAdding: boolean;
  onSave: () => void;
  militars: UserProfile[];
  obmContext: string;
  situacoes: string[];
}

export const AfastamentoAddForm: React.FC<AfastamentoAddFormProps> = ({
  newRg,
  setNewRg,
  newInicio,
  setNewInicio,
  newRetorno,
  setNewRetorno,
  newAla,
  setNewAla,
  newSituacao,
  setNewSituacao,
  newObs,
  setNewObs,
  isAdding,
  onSave,
  militars,
  obmContext,
  situacoes,
}) => {
  return (
    <div className="p-3 bg-indigo-50/40 border-b border-indigo-100 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="text-[11px] font-black uppercase tracking-wider text-indigo-900 mb-2 flex items-center gap-1.5">
        <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
        Cadastrar Novo Afastamento / Férias
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5">
        <div className="md:col-span-2">
          <label className="text-[9.5px] font-black uppercase tracking-widest text-slate-500 block mb-0.5">Militar</label>
          <SearchableMilitarSelect
            value={newRg}
            onChange={setNewRg}
            militars={militars}
            obmContext={obmContext}
            onMilitarSelected={(m) => {
              if (m.ala) setNewAla(normalizeAlaField(m.ala) || '1');
            }}
          />
        </div>

        <div>
          <label className="text-[9.5px] font-black uppercase tracking-widest text-slate-500 block mb-0.5">Início</label>
          <input
            type="date"
            value={newInicio}
            onChange={e => setNewInicio(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded px-2 py-1 text-xs font-bold text-slate-700 outline-none"
          />
        </div>

        <div>
          <label className="text-[9.5px] font-black uppercase tracking-widest text-slate-500 block mb-0.5">Retorno</label>
          <input
            type="date"
            value={newRetorno}
            onChange={e => setNewRetorno(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded px-2 py-1 text-xs font-bold text-slate-700 outline-none"
          />
        </div>

        <div>
          <label className="text-[9.5px] font-black uppercase tracking-widest text-slate-500 block mb-0.5">Ala Operacional</label>
          <select
            value={newAla}
            onChange={e => setNewAla(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded px-2 py-1 text-xs font-black uppercase text-slate-700 outline-none"
          >
            <option value="1">ALA 1</option>
            <option value="2">ALA 2</option>
            <option value="3">ALA 3</option>
            <option value="4">ALA 4</option>
            <option value="EXP">EXPEDIENTE</option>
          </select>
        </div>

        <div>
          <label className="text-[9.5px] font-black uppercase tracking-widest text-slate-500 block mb-0.5">Motivo / Situação</label>
          <select
            value={newSituacao}
            onChange={e => setNewSituacao(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded px-2 py-1 text-xs font-black uppercase text-slate-700 outline-none"
          >
            {situacoes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="md:col-span-5">
          <label className="text-[9.5px] font-black uppercase tracking-widest text-slate-500 block mb-0.5">Observações (Opcional)</label>
          <input
            type="text"
            placeholder="Ex: Portaria nº 123, Curso de Salvamento Marítimo, etc."
            value={newObs}
            onChange={e => setNewObs(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded px-2 py-1 text-xs font-medium text-slate-700 outline-none"
          />
        </div>

        <div className="md:col-span-1 flex items-end">
          <button
            onClick={onSave}
            disabled={isAdding}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded px-3 py-1.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-colors shadow-xs"
          >
            {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};
