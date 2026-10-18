import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUpDown, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserProfile } from '../../../types';
import { SwapRequest, ExpedienteData } from '../types';
import { formatMilitaryName } from '../../../lib/utils';

interface ExpedienteSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRg: string | null;
  user: UserProfile;
  data: ExpedienteData;
  currentMonthDays: Date[];
  onSubmitSwap: (newReq: SwapRequest) => Promise<void>;
}

export function ExpedienteSwapModal({
  isOpen,
  onClose,
  activeRg,
  user,
  data,
  currentMonthDays,
  onSubmitSwap
}: ExpedienteSwapModalProps) {
  if (!isOpen || !activeRg) return null;

  const userSelections = Array.isArray(data.selections[activeRg]) ? data.selections[activeRg] : [];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const fromDay = formData.get('fromDay') as string;
    const toDay = formData.get('toDay') as string;

    if (!fromDay || !toDay) {
      alert("Selecione os dois dias.");
      return;
    }
    if (fromDay === toDay) {
      alert("Os dias devem ser diferentes.");
      return;
    }

    const newReq: SwapRequest = {
      id: Math.random().toString(36).substring(2, 11),
      rg: activeRg,
      userName: formatMilitaryName(user.rank ? `${user.rank} ${user.warName || user.name.split(' ')[0]}` : user.name),
      fromDay,
      toDay,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await onSubmitSwap(newReq);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-indigo-600" />
              Solicitar Troca do Dia de Serviço (24h)
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Saindo de (Serviço Atual)
              </label>
              <select
                name="fromDay"
                required
                className="w-full text-sm p-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500"
              >
                <option value="">Selecione o serviço atual...</option>
                {[...userSelections].sort().map(d => (
                  <option key={d} value={d}>
                    {format(new Date(`${d}T12:00:00`), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Entrando em (Novo Serviço)
              </label>
              <select
                name="toDay"
                required
                className="w-full text-sm p-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500"
              >
                <option value="">Selecione o novo serviço...</option>
                {currentMonthDays.map(d => {
                  const dStr = format(d, 'yyyy-MM-dd');
                  if (userSelections.includes(dStr)) return null;
                  return (
                    <option key={dStr} value={dStr}>
                      {format(d, "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-lg transition-colors shadow-md cursor-pointer"
              >
                Enviar Solicitação
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
