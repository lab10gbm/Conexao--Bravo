import React from "react";
import { Bus, Car, Edit, X, MapPin, Navigation } from "lucide-react";
import { TransladoVehicle } from "../types";
import { abbrevRank, getShortName } from "../utils";
import { cn } from "../../../lib/utils";

interface TransladoVehicleCardProps {
  vehicle: TransladoVehicle;
  isModerator: boolean;
  currentUserRg?: string;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const TransladoVehicleCard: React.FC<TransladoVehicleCardProps> = ({
  vehicle,
  isModerator,
  currentUserRg,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const isPrivate = !!vehicle.isPrivate;
  const canEditOrDelete = isPrivate
    ? isModerator || vehicle.createdByRg === currentUserRg
    : isModerator;

  return (
    <div
      className={cn(
        "group relative bg-white border border-slate-200 shadow-sm hover:shadow-xl rounded-3xl p-6 transition-all cursor-pointer overflow-hidden",
        isPrivate
          ? "hover:border-emerald-300 hover:shadow-emerald-500/10"
          : "hover:border-blue-300 hover:shadow-blue-500/10",
      )}
      onClick={onSelect}
    >
      {canEditOrDelete && (
        <div className="absolute top-4 right-4 flex items-center gap-1 z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className={cn(
              "p-2 text-slate-400 rounded-lg cursor-pointer",
              isPrivate
                ? "hover:text-emerald-500 hover:bg-emerald-50"
                : "hover:text-blue-500 hover:bg-blue-50",
            )}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center",
            isPrivate
              ? "bg-emerald-50 text-emerald-600"
              : "bg-blue-50 text-blue-600",
          )}
        >
          {isPrivate ? <Car className="w-6 h-6" /> : <Bus className="w-6 h-6" />}
        </div>

        {isPrivate ? (
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border bg-sky-50 text-sky-600 border-sky-100">
              {vehicle.capacity || 4} vagas
            </span>
            <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border bg-emerald-50 text-emerald-600 border-emerald-100">
              CARONA
            </span>
          </div>
        ) : (
          <span
            className={cn(
              "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border",
              vehicle.status === "INOPERANTE"
                ? "bg-rose-50 text-rose-600 border-rose-100"
                : vehicle.status === "MANUTENÇÃO"
                  ? "bg-amber-50 text-amber-600 border-amber-100"
                  : "bg-emerald-50 text-emerald-600 border-emerald-100",
            )}
          >
            {vehicle.status || "OPERANTE"}
          </span>
        )}
      </div>

      {isPrivate ? (
        <div className="text-[10px] uppercase font-black tracking-widest text-emerald-600 mb-1 truncate">
          Proprietário:{" "}
          {vehicle.createdByRank ? abbrevRank(vehicle.createdByRank) : ""}{" "}
          {getShortName(vehicle.createdByName)}
        </div>
      ) : (
        <div className="text-[10px] uppercase font-black tracking-widest text-blue-500 mb-1 truncate">
          {vehicle.unit || "GERAL"}
        </div>
      )}

      <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-4 truncate">
        {vehicle.name}
      </h3>

      <div className="bg-slate-50 p-3 rounded-xl w-full">
        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-600 truncate">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />{" "}
          <span className="truncate">{vehicle.origin}</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 truncate">
          <Navigation className="w-3.5 h-3.5 text-slate-400 shrink-0" />{" "}
          <span className="truncate">{vehicle.destination}</span>
        </div>
      </div>
    </div>
  );
};
