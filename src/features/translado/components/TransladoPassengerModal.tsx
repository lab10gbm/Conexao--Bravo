import React, { useState } from "react";
import { Plus, X, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { UserProfile } from "../../../types";
import { cn } from "../../../lib/utils";
import { abbrevRank, getShortName } from "../utils";

interface TransladoPassengerModalProps {
  searchForms: "driver" | number | null;
  currentBoardingOptions: string[];
  selectedBoardingPoint: string;
  setSelectedBoardingPoint: (val: string) => void;
  selectedDutyStatus: string;
  setSelectedDutyStatus: (val: string) => void;
  user: UserProfile;
  militars: UserProfile[];
  onSelectMilitar: (
    militar: UserProfile,
    type: "driver" | number,
    bPoint?: string,
    dStatus?: string,
  ) => void;
  onClose: () => void;
}

export const TransladoPassengerModal: React.FC<TransladoPassengerModalProps> = ({
  searchForms,
  currentBoardingOptions,
  selectedBoardingPoint,
  setSelectedBoardingPoint,
  selectedDutyStatus,
  setSelectedDutyStatus,
  user,
  militars,
  onSelectMilitar,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  if (searchForms === null) return null;

  const filteredMilitars = militars
    .filter((m) => {
      if (!searchTerm) return false;
      const term = searchTerm.toLowerCase();
      return (
        (m.rg?.toString() || "").toLowerCase().includes(term) ||
        (m.name || "").toLowerCase().includes(term) ||
        (m.warName || "").toLowerCase().includes(term)
      );
    })
    .slice(0, 10);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative flex flex-col max-h-[90vh]"
      >
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-500" />
            {searchForms === "driver"
              ? "Selecionar Condutor"
              : `Selecionar Assento ${typeof searchForms === "number" ? searchForms + 1 : ""}`}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto pr-1 flex-1">
          {currentBoardingOptions.length > 0 && (
            <div className="mb-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                <MapPin className="w-3 h-3 text-blue-500" /> Descrição do
                Trajeto
              </div>
              <div className="flex items-stretch gap-3">
                <div className="flex flex-col items-center py-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shrink-0" />
                  <div className="w-0.5 h-6 bg-slate-300 my-1 rounded-full shrink-0" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shrink-0" />
                </div>
                <div className="flex flex-col justify-between text-xs font-bold text-slate-700 uppercase py-0.5">
                  <div>
                    <span className="text-slate-400 font-medium mr-1">
                      Início:
                    </span>{" "}
                    {currentBoardingOptions[0]}
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium mr-1">
                      Fim:
                    </span>{" "}
                    {currentBoardingOptions[currentBoardingOptions.length - 1]}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentBoardingOptions.length > 0 && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Ponto de Embarque
              </label>
              <select
                value={selectedBoardingPoint}
                onChange={(e) => setSelectedBoardingPoint(e.target.value)}
                className="w-full bg-slate-50 p-3 rounded-xl text-sm font-bold text-slate-700 outline-none uppercase border border-slate-200 focus:border-blue-500 transition-colors"
              >
                {currentBoardingOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Status de Serviço
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedDutyStatus("não estou de serviço")}
                className={cn(
                  "p-3 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all flex flex-col items-center justify-center text-center leading-tight gap-1 cursor-pointer",
                  selectedDutyStatus === "não estou de serviço"
                    ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100",
                )}
              >
                Não estou de Serviço
              </button>
              <button
                type="button"
                onClick={() => setSelectedDutyStatus("estou entrando de serviço")}
                className={cn(
                  "p-3 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all flex flex-col items-center justify-center text-center leading-tight gap-1 cursor-pointer",
                  selectedDutyStatus === "estou entrando de serviço"
                    ? "bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/10"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100",
                )}
              >
                Entrando de Serviço
              </button>
              <button
                type="button"
                onClick={() => setSelectedDutyStatus("estou saindo de serviço")}
                className={cn(
                  "p-3 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all flex flex-col items-center justify-center text-center leading-tight gap-1 cursor-pointer",
                  selectedDutyStatus === "estou saindo de serviço"
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/10"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100",
                )}
              >
                Saindo de Serviço
              </button>
            </div>
          </div>

          <div>
            <button
              onClick={() =>
                onSelectMilitar(
                  user,
                  searchForms,
                  selectedBoardingPoint,
                  selectedDutyStatus,
                )
              }
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-blue-500/15 cursor-pointer"
            >
              Me inscrever
            </button>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Buscar Outro Militar
            </label>
            <input
              type="text"
              placeholder="Digite nome ou RG..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 p-3 rounded-xl text-sm font-bold outline-none uppercase border border-slate-200 focus:border-blue-500 transition-colors"
            >
            </input>

            {searchTerm && (
              <div className="mt-2 max-h-48 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-100">
                {filteredMilitars.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400 font-bold uppercase">
                    Nenhum militar encontrado
                  </div>
                ) : (
                  filteredMilitars.map((m) => (
                    <button
                      key={m.rg}
                      onClick={() =>
                        onSelectMilitar(
                          m,
                          searchForms,
                          selectedBoardingPoint,
                          selectedDutyStatus,
                        )
                      }
                      className="w-full p-3 text-left hover:bg-blue-50 text-xs font-bold text-slate-700 uppercase transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span className="bg-slate-200 text-slate-650 px-1.5 py-0.5 rounded text-[9px] font-black shrink-0">
                        {abbrevRank(m.rank)}
                      </span>
                      <span className="truncate">
                        {getShortName(m.name, m.warName)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
