import React from "react";
import { motion } from "motion/react";

interface TransladoDeleteModalProps {
  deleteVehicleId: { id: string; isPrivate: boolean } | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export const TransladoDeleteModal: React.FC<TransladoDeleteModalProps> = ({
  deleteVehicleId,
  onCancel,
  onConfirm,
}) => {
  if (!deleteVehicleId) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-100 shadow-2xl"
      >
        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">
          Excluir{" "}
          {deleteVehicleId.isPrivate ? "Veículo Particular" : "Viatura"}?
        </h3>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6 leading-relaxed">
          Esta ação irá excluir permanentemente este veículo e toda a sua lotação
          futura para este dia e trajeto. Deseja continuar?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20 cursor-pointer"
          >
            Confirmar
          </button>
        </div>
      </motion.div>
    </div>
  );
};
