import React from "react";
import { MapPin, X } from "lucide-react";
import { SeatData } from "../types";
import { UserProfile } from "../../../types";
import { abbrevRank, SteeringWheelIcon } from "../utils";
import { cn } from "../../../lib/utils";
import { RankInsignia } from "../../../components/RankInsignia";

interface TransladoSeatItemProps {
  type: "driver" | "passenger";
  data: SeatData | null;
  idx?: number;
  isSelectedForm: boolean;
  currentUserRg?: string;
  militars: UserProfile[];
  onSelect: () => void;
  onDeselect: () => void;
  onRemove: () => void;
}

export const TransladoSeatItem: React.FC<TransladoSeatItemProps> = ({
  type,
  data,
  idx,
  isSelectedForm,
  currentUserRg,
  militars,
  onSelect,
  onDeselect,
  onRemove,
}) => {
  if (data) {
    const mil = militars.find((m) => m.rg === data.rg);
    const warName = mil?.warName || data.name || "";
    return (
      <div className="bg-white p-2 sm:p-3 rounded-2xl border-2 border-indigo-200 shadow-sm flex flex-col justify-center group relative overflow-hidden h-24 w-full min-w-0">
        <div className="absolute top-0 right-0 bottom-0 w-1 bg-emerald-400" />
        <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1 mb-1 truncate">
          <MapPin className="w-2.5 h-2.5 text-emerald-500 shrink-0" />{" "}
          {data.boardingPoint || "Padrão"}
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="shrink-0 max-h-4 flex items-center scale-[0.8] origin-left -ml-0.5">
            <RankInsignia rankStr={data.rank} />
          </div>
          <div className="text-[10px] sm:text-xs font-bold text-slate-800 leading-tight truncate uppercase">
            {abbrevRank(data.rank)} {warName}
          </div>
        </div>
        <div className="text-[8px] sm:text-[9px] font-black text-slate-400 mt-1 uppercase truncate flex items-center gap-1.5 flex-wrap">
          <span>{type === "driver" ? "Condutor" : `Assento ${idx! + 1}`}</span>
          {data.dutyStatus && data.dutyStatus !== "não estou de serviço" && (
            <span
              className={cn(
                "px-1 py-0.2 rounded text-[7px] font-black uppercase text-center shrink-0 tracking-wider",
                data.dutyStatus === "estou entrando de serviço"
                  ? "bg-amber-100 text-amber-700 border border-amber-200"
                  : "bg-blue-100 text-blue-700 border border-blue-200",
              )}
            >
              {data.dutyStatus === "estou entrando de serviço"
                ? "Entrando"
                : "Saindo"}
            </span>
          )}
        </div>
        {data.rg === currentUserRg && (
          <button
            onClick={onRemove}
            className="absolute right-1 top-1 w-5 h-5 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  if (isSelectedForm) {
    return (
      <button
        onClick={onDeselect}
        className="bg-blue-50 border-2 border-blue-400 p-2 rounded-2xl flex flex-col items-center justify-center text-blue-500 transition-colors h-24 w-full relative group animate-pulse"
      >
        <span className="text-[10px] text-center font-black uppercase tracking-widest mb-1">
          Selecionando...
        </span>
        <span className="text-[8px] font-bold uppercase bg-blue-100 px-2 py-1 rounded-md text-blue-600 border border-blue-200">
          {type === "driver" ? "Condutor" : `Assento ${idx! + 1}`}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onSelect}
      className="bg-slate-50/50 border-2 border-dashed border-slate-200 p-2 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors h-24 w-full relative group"
    >
      <span className="text-[10px] text-center font-black uppercase tracking-widest mb-1 group-hover:scale-110 transition-transform">
        {type === "driver" ? (
          <SteeringWheelIcon className="w-6 h-6 text-slate-300 group-hover:text-blue-400" />
        ) : (
          "Livre"
        )}
      </span>
      <span className="text-[8px] font-bold uppercase bg-white px-2 py-1 rounded-md text-slate-400 border border-slate-100">
        {type === "driver" ? "Assumir" : `Assento ${idx! + 1}`}
      </span>
    </button>
  );
};
