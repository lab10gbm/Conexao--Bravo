import React from 'react';
import { Calendar, FileText, CheckCircle2, History } from 'lucide-react';
import { Vacation } from '../../../types';

export function VacationCard({ vacation }: { vacation: Vacation }) {
  return (
    <div className="group bg-white p-6 rounded-3xl border-2 border-slate-50 shadow-sm hover:border-orange-200 hover:shadow-xl hover:shadow-orange-100/30 transition-all">
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div
          className={`w-16 h-16 rounded-2xl shrink-0 flex flex-col items-center justify-center ${
            vacation.status === 'gozado'
              ? 'bg-slate-100 text-slate-400'
              : 'bg-orange-600 text-white shadow-lg shadow-orange-100'
          }`}
        >
          <Calendar className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase mt-1">
            {vacation.anoRef}
          </span>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">
              {vacation.dataInicio} — {vacation.dataRetorno}
            </h4>
            <span
              className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${
                vacation.status === 'gozado'
                  ? 'bg-slate-100 text-slate-500'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              }`}
            >
              {vacation.status === 'gozado' ? 'Finalizado' : 'Próximo Período'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Bol: {vacation.boletim}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {vacation.ato}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 border-l border-slate-100 pl-6 h-12">
          <div className="text-right">
            <div className="text-xl font-black text-orange-600 leading-none">
              {vacation.diasGozados}
            </div>
            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
              Dias Tirados
            </div>
          </div>
          <div className="text-right border-l border-slate-100 pl-4">
            <div className="text-xl font-black text-slate-800 leading-none">
              {vacation.diasAGozar}
            </div>
            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">
              Saldo Reman.
            </div>
          </div>
        </div>
      </div>
      {vacation.obs && (
        <div className="mt-4 pt-4 border-t border-slate-50">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
            {vacation.obs}
          </p>
        </div>
      )}
    </div>
  );
}

export function VacationEmptyState({ message }: { message: string }) {
  return (
    <div className="py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-8">
      <History className="w-12 h-12 text-slate-200 mb-4" />
      <p className="text-slate-400 text-xs font-black uppercase tracking-widest">
        {message}
      </p>
      <p className="mt-2 text-slate-300 text-[10px] font-bold uppercase tracking-widest">
        Utilize o botão de sincronização para importar dados do DGP.
      </p>
    </div>
  );
}
