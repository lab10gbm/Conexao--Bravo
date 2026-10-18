import React from "react";
import { MapPin } from "lucide-react";
import { TransladoVehicle, TransladoTrip, SubscribedPassenger } from "../types";
import { UserProfile } from "../../../types";
import { abbrevRank } from "../utils";
import { sortAllBySeniority } from "../../../lib/rankUtils";
import { cn } from "../../../lib/utils";
import { RankInsignia } from "../../../components/RankInsignia";

interface TransladoManifestoProps {
  tripData: TransladoTrip;
  selectedVehicle: TransladoVehicle;
  date: string;
  direction: "ida" | "volta";
  currentUserRg?: string;
  militars: UserProfile[];
  onRemoveSeat: (type: "driver" | number) => void;
}

export const TransladoManifesto: React.FC<TransladoManifestoProps> = ({
  tripData,
  selectedVehicle,
  date,
  direction,
  currentUserRg,
  militars,
  onRemoveSeat,
}) => {
  const subscribedList: SubscribedPassenger[] = [];

  if (tripData.driver) {
    subscribedList.push({
      type: "driver",
      label: "Condutor",
      ...tripData.driver,
    });
  }

  tripData.passengers.forEach((p, idx) => {
    if (p) {
      subscribedList.push({
        type: idx,
        label: `Assento ${idx + 1}`,
        ...p,
      });
    }
  });

  subscribedList.sort(sortAllBySeniority);

  const totalOccupied =
    (tripData.driver ? 1 : 0) + tripData.passengers.filter(Boolean).length;
  const maxSeats =
    (selectedVehicle.capacity || (selectedVehicle.isPrivate ? 4 : 15)) + 1;
  const enteringDutyCount = subscribedList.filter(
    (s) => s.dutyStatus === "estou entrando de serviço",
  ).length;
  const leavingDutyCount = subscribedList.filter(
    (s) => s.dutyStatus === "estou saindo de serviço",
  ).length;

  return (
    <div className="w-full bg-white rounded-[2rem] border border-slate-200 p-6 sm:p-8 mt-4 shadow-xs select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            Militares Inscritos na Viatura
          </h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
            Manifesto de Translado ({direction === "ida" ? "Ida" : "Volta"}) •{" "}
            {date.split("-").reverse().join("/")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border border-slate-200">
            Ocupação: {totalOccupied} / {maxSeats}
          </span>
          {enteringDutyCount > 0 && (
            <span className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border border-amber-200">
              Entrando: {enteringDutyCount}
            </span>
          )}
          {leavingDutyCount > 0 && (
            <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border border-blue-200">
              Saindo: {leavingDutyCount}
            </span>
          )}
        </div>
      </div>

      {subscribedList.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="font-bold text-slate-400 text-xs uppercase tracking-wider">
            Nenhum militar inscrito nesta rota
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
          {subscribedList.map((m) => {
            const mil = militars.find((item) => item.rg === m.rg);
            const warName = mil?.warName || m.name;
            return (
              <div
                key={`${m.rg}-${m.type}`}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0 hover:bg-slate-50/50 rounded-xl px-2 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <RankInsignia rankStr={m.rank} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-800 uppercase flex items-center gap-2">
                      <span>
                        {abbrevRank(m.rank)} {warName}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400">
                        ({m.rg})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400 mt-1 flex-wrap">
                      <span
                        className={cn(
                          "bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 uppercase text-[8px] font-black",
                          m.type === "driver" &&
                            "bg-emerald-50 text-emerald-700 border-emerald-100",
                        )}
                      >
                        {m.label}
                      </span>
                      {m.boardingPoint && (
                        <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 text-[8px] font-black uppercase">
                          <MapPin className="w-2.5 h-2.5 text-slate-500 shrink-0" />{" "}
                          {m.boardingPoint}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  {m.dutyStatus && m.dutyStatus !== "não estou de serviço" && (
                    <span
                      className={cn(
                        "px-2.5 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase border",
                        m.dutyStatus === "estou entrando de serviço"
                          ? "bg-amber-100 text-amber-700 border-amber-200"
                          : "bg-blue-100 text-blue-700 border-blue-200",
                      )}
                    >
                      {m.dutyStatus === "estou entrando de serviço"
                        ? "Entrando de Serviço"
                        : "Saindo de Serviço"}
                    </span>
                  )}

                  {m.rg === currentUserRg && (
                    <button
                      onClick={() => onRemoveSeat(m.type)}
                      className="text-[9px] font-black uppercase bg-rose-50 text-rose-500 border border-rose-200 hover:bg-rose-100 px-2.5 py-1.5 rounded-xl transition-all self-center ml-auto sm:ml-0 cursor-pointer"
                    >
                      Sair da Viatura
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
