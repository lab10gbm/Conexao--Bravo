import React from "react";
import { X, Save } from "lucide-react";
import { motion } from "motion/react";
import { TransladoVehicle } from "../types";
import { TagInput } from "../../../components/TagInput";
import { cn } from "../../../lib/utils";

interface TransladoVehicleModalProps {
  isOpen: boolean;
  formData: Partial<TransladoVehicle>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<TransladoVehicle>>>;
  onSave: () => void;
  onClose: () => void;
}

export const TransladoVehicleModal: React.FC<TransladoVehicleModalProps> = ({
  isOpen,
  formData,
  setFormData,
  onSave,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">
            {formData.id ? "Editar Viatura" : "Nova Viatura"}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:bg-slate-100 p-2 rounded-full cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Nome da Viatura / Rota
            </label>
            <input
              type="text"
              value={formData.name || ""}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ex: Van 10º GBM, Micro-ônibus OBM"
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold uppercase outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Unidade (Ex: 10º GBM, 16º OBM)
            </label>
            <input
              type="text"
              value={formData.unit || ""}
              onChange={(e) =>
                setFormData({ ...formData, unit: e.target.value })
              }
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold uppercase outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Origem
              </label>
              <input
                type="text"
                value={formData.origin || ""}
                onChange={(e) =>
                  setFormData({ ...formData, origin: e.target.value })
                }
                placeholder="Ex: Itaguaí"
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold uppercase outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Destino
              </label>
              <input
                type="text"
                value={formData.destination || ""}
                onChange={(e) =>
                  setFormData({ ...formData, destination: e.target.value })
                }
                placeholder="Ex: 10º GBM"
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold uppercase outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Status da Viatura
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["OPERANTE", "INOPERANTE", "MANUTENÇÃO"] as const).map(
                (st) => {
                  const isSelected = (formData.status || "OPERANTE") === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, status: st })
                      }
                      className={cn(
                        "p-3 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all flex flex-col items-center justify-center text-center leading-tight gap-1 cursor-pointer",
                        isSelected
                          ? st === "OPERANTE"
                            ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                            : st === "INOPERANTE"
                              ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                              : "bg-amber-500 text-white border-amber-500 shadow-sm"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100",
                      )}
                    >
                      {st}
                    </button>
                  );
                },
              )}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Pontos de Embarque Intermediários
            </label>
            <TagInput
              value={formData.waypoints || ""}
              onChange={(val) =>
                setFormData({ ...formData, waypoints: val })
              }
              placeholder="Digite o ponto e aperte ENTER..."
            />
            <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase">
              * Os pontos de embarque ficam no trajeto entre a origem e o
              destino.
            </p>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl text-xs font-black uppercase text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              className="px-6 py-3 rounded-xl text-xs font-black uppercase bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Salvar Viatura
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
