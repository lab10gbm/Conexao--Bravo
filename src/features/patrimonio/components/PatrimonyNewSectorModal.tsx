import React from 'react';
import { Plus, X, Check } from 'lucide-react';
import { parseRank } from '../../../lib/rankUtils';

interface PatrimonyNewSectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  newSectorName: string;
  setNewSectorName: (val: string) => void;
  newSectorObm: string;
  setNewSectorObm: (val: string) => void;
  newSectorDate: string;
  setNewSectorDate: (val: string) => void;
  newSectorResponsible: string;
  setNewSectorResponsible: (val: string) => void;
  militars: any[];
  onCreateSector: (e: React.FormEvent) => void;
}

export function PatrimonyNewSectorModal({
  isOpen,
  onClose,
  newSectorName,
  setNewSectorName,
  newSectorObm,
  setNewSectorObm,
  newSectorDate,
  setNewSectorDate,
  newSectorResponsible,
  setNewSectorResponsible,
  militars,
  onCreateSector,
}: PatrimonyNewSectorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 flex flex-col animate-in zoom-in-95 duration-250 font-sans">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">
                Cadastrar Seção / Setor
              </h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Bens Patrimoniais por OBM
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onCreateSector} className="space-y-5">
          {/* Nome do Setor */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest font-sans">
              Nome do Novo Setor / Seção <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="EX: SEÇÃO DE COMUNICAÇÃO SOCIAL"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-600 uppercase font-sans tracking-wide"
              value={newSectorName}
              onChange={(e) => setNewSectorName(e.target.value)}
            />
          </div>

          {/* Subunidade (OBM) e Data de criação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest font-sans">
                Subunidade (OBM)
                <span className="text-red-500"> *</span>
              </label>
              <select
                value={newSectorObm}
                onChange={(e) => setNewSectorObm(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-600 font-sans"
              >
                {['10º', '1/10', '2/10', '3/10', '4/10', '26º', '1/26'].map(obmId => (
                  <option key={obmId} value={obmId}>
                    {obmId === '10º' ? '10º GBM Sede (Angra)' :
                     obmId === '1/10' ? `${obmId} DBM (Itaguaí)` :
                     obmId === '2/10' ? `${obmId} DBM (Mambucaba)` :
                     obmId === '3/10' ? `${obmId} DBM (Frade)` :
                     obmId === '4/10' ? `${obmId} DBM (Mangaratiba)` :
                     obmId === '26º' ? '26º GBM Sede (Paraty)' :
                     `${obmId} DBM (Paraty)`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest font-sans">
                Data de Criação / Cadastro <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-600 font-sans"
                value={newSectorDate}
                onChange={(e) => setNewSectorDate(e.target.value)}
              />
            </div>
          </div>

          {/* Responsável pelo Setor (Militars) */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 tracking-widest font-sans">
              Oficial ou Praça Responsável (Opcional)
            </label>
            <select
              value={newSectorResponsible}
              onChange={(e) => setNewSectorResponsible(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-600 font-sans"
            >
              <option value="">Selecione um oficial/praça cadastrado...</option>
              {militars.map((m) => (
                <option key={m.rg} value={m.rg}>
                  {parseRank(m.rank)} {m.warName || m.name} (RG: {m.rg})
                </option>
              ))}
            </select>
            <span className="text-[10px] font-bold text-slate-400 mt-1 block">
              Você também pode reconfigurar ou alterar o oficial responsável depois, no painel administrativo do setor.
            </span>
          </div>

          {/* Modais Actions */}
          <div className="flex gap-3 pt-3 border-t border-slate-100 flex-col-reverse sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all uppercase tracking-widest font-sans"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/15 uppercase tracking-widest font-sans"
            >
              <Check className="w-4 h-4" />
              Salvar Setor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
