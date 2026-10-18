import React from "react";
import { X, Save, Car } from "lucide-react";
import { motion } from "motion/react";
import { TransladoVehicle } from "../types";
import { TagInput } from "../../../components/TagInput";

interface TransladoPrivateVehicleModalProps {
  isOpen: boolean;
  privateFormData: Partial<TransladoVehicle>;
  setPrivateFormData: React.Dispatch<
    React.SetStateAction<Partial<TransladoVehicle>>
  >;
  savedMyVehicle: Partial<TransladoVehicle> | null;
  saveAsTemplate: boolean;
  setSaveAsTemplate: (val: boolean) => void;
  onSave: () => void;
  onClose: () => void;
}

export const TransladoPrivateVehicleModal: React.FC<
  TransladoPrivateVehicleModalProps
> = ({
  isOpen,
  privateFormData,
  setPrivateFormData,
  savedMyVehicle,
  saveAsTemplate,
  setSaveAsTemplate,
  onSave,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">
            {privateFormData.id
              ? "Editar Veículo Particular"
              : "Cadastrar Veículo Particular"}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:bg-slate-100 p-2 rounded-full cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {savedMyVehicle && !privateFormData.id && (
            <button
              type="button"
              onClick={() =>
                setPrivateFormData((prev) => ({
                  ...prev,
                  ...savedMyVehicle,
                }))
              }
              className="w-full bg-emerald-50 text-emerald-700 py-3 rounded-xl border border-emerald-200 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors mb-2 shadow-sm cursor-pointer"
            >
              <Car className="w-4 h-4" /> Utilizar meu veículo salvo
            </button>
          )}

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Nome / Descrição do Veículo
            </label>
            <input
              type="text"
              value={privateFormData.name || ""}
              onChange={(e) =>
                setPrivateFormData({
                  ...privateFormData,
                  name: e.target.value,
                })
              }
              placeholder="Ex: Corolla do Sgt Silva, Civic Prata"
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
                value={privateFormData.origin || ""}
                onChange={(e) =>
                  setPrivateFormData({
                    ...privateFormData,
                    origin: e.target.value,
                  })
                }
                placeholder="Ex: Itaguaí"
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold uppercase outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Destino
              </label>
              <input
                type="text"
                value={privateFormData.destination || ""}
                onChange={(e) =>
                  setPrivateFormData({
                    ...privateFormData,
                    destination: e.target.value,
                  })
                }
                placeholder="Ex: 10º GBM"
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold uppercase outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Data de Ida
              </label>
              <input
                type="date"
                value={privateFormData.date || ""}
                onChange={(e) =>
                  setPrivateFormData({
                    ...privateFormData,
                    date: e.target.value,
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold uppercase outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Data de Volta (Opcional)
              </label>
              <input
                type="date"
                value={privateFormData.returnDate || ""}
                onChange={(e) =>
                  setPrivateFormData({
                    ...privateFormData,
                    returnDate: e.target.value,
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold uppercase outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Vagas Disponíveis (Passageiros)
            </label>
            <input
              type="number"
              min="1"
              max="15"
              value={privateFormData.capacity || 4}
              onChange={(e) =>
                setPrivateFormData({
                  ...privateFormData,
                  capacity: Math.max(
                    1,
                    Math.min(15, parseInt(e.target.value) || 1),
                  ),
                })
              }
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold uppercase outline-none focus:border-emerald-500"
            />
            <p className="text-[10px] mt-1 uppercase font-bold text-slate-400">
              Quantidade de assentos livres além do condutor.
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Pontos de Embarque Intermediários (Paradas)
            </label>
            <TagInput
              value={privateFormData.waypoints || ""}
              onChange={(val) =>
                setPrivateFormData({ ...privateFormData, waypoints: val })
              }
              placeholder="Digite o ponto e aperte ENTER..."
            />
            <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase">
              * Os pontos de embarque ficam no trajeto entre a origem e o
              destino.
            </p>
          </div>

          {!privateFormData.id && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
              <input
                type="checkbox"
                id="saveTemplate"
                checked={saveAsTemplate}
                onChange={(e) => setSaveAsTemplate(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <label
                htmlFor="saveTemplate"
                className="text-xs font-bold uppercase text-slate-600 select-none cursor-pointer"
              >
                Salvar em "Meus Veículos" para facilitar os próximos usos
              </label>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl text-xs font-black uppercase text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              className="px-6 py-3 rounded-xl text-xs font-black uppercase bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Salvar Veículo
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
