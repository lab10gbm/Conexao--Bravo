import React from "react";
import { TransladoVehicle, TransladoTrip } from "../types";
import { UserProfile } from "../../../types";
import { TransladoSeatItem } from "./TransladoSeatItem";

interface TransladoVanLayoutProps {
  vehicle: TransladoVehicle;
  tripData: TransladoTrip;
  searchForms: "driver" | number | null;
  currentUserRg?: string;
  militars: UserProfile[];
  onSelectSeat: (type: "driver" | number) => void;
  onDeselectSeat: () => void;
  onRemoveSeat: (type: "driver" | number) => void;
}

export const TransladoVanLayout: React.FC<TransladoVanLayoutProps> = ({
  vehicle,
  tripData,
  searchForms,
  currentUserRg,
  militars,
  onSelectSeat,
  onDeselectSeat,
  onRemoveSeat,
}) => {
  return (
    <div className="flex-1 p-4 sm:p-8 relative min-w-0">
      {/* Front windshield representation */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-8 bg-blue-100/50 rounded-b-[2rem] border-b-2 border-blue-200"></div>

      {vehicle.isPrivate ? (
        <div className="flex flex-col gap-6 mt-6 min-w-0 max-w-sm mx-auto">
          {/* Frente */}
          <div className="flex justify-between items-center gap-4 sm:gap-8 min-w-0">
            {/* Driver on the left */}
            <div className="flex-1 relative min-w-0">
              <TransladoSeatItem
                type="driver"
                data={tripData.driver}
                isSelectedForm={searchForms === "driver"}
                currentUserRg={currentUserRg}
                militars={militars}
                onSelect={() => onSelectSeat("driver")}
                onDeselect={onDeselectSeat}
                onRemove={() => onRemoveSeat("driver")}
              />
            </div>
            {/* Front passenger on the right if capacity > 0 */}
            <div className="flex-1 relative min-w-0">
              {vehicle.capacity && vehicle.capacity > 0 ? (
                <TransladoSeatItem
                  type="passenger"
                  data={tripData.passengers[0]}
                  idx={0}
                  isSelectedForm={searchForms === 0}
                  currentUserRg={currentUserRg}
                  militars={militars}
                  onSelect={() => onSelectSeat(0)}
                  onDeselect={onDeselectSeat}
                  onRemove={() => onRemoveSeat(0)}
                />
              ) : (
                <div className="h-24 w-full bg-slate-300/20 border-2 border-dashed border-slate-300/55 rounded-2xl flex items-center justify-center text-slate-400 font-black uppercase text-[8px] tracking-widest text-center">
                  Sem Vaga
                </div>
              )}
            </div>
          </div>

          {/* Corredor de separação ou linha de trás */}
          {vehicle.capacity && vehicle.capacity > 1 ? (
            <div className="grid grid-cols-2 gap-3 mt-2 bg-slate-100/40 p-3 sm:p-4 rounded-3xl min-w-0">
              {Array.from({
                length: vehicle.capacity - 1,
              }).map((_, i) => {
                const seatIdx = i + 1; // back seats start from index 1 up to capacity - 1
                return (
                  <div key={seatIdx} className="relative min-w-0">
                    <TransladoSeatItem
                      type="passenger"
                      data={tripData.passengers[seatIdx]}
                      idx={seatIdx}
                      isSelectedForm={searchForms === seatIdx}
                      currentUserRg={currentUserRg}
                      militars={militars}
                      onSelect={() => onSelectSeat(seatIdx)}
                      onDeselect={onDeselectSeat}
                      onRemove={() => onRemoveSeat(seatIdx)}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 bg-slate-100/30 border border-dashed border-slate-300/40 rounded-2xl text-center text-xs text-slate-400 font-bold uppercase tracking-wider">
              Este veículo só tem a vaga do carona na frente.
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6 mt-4 min-w-0">
          {/* Linha 1 (Frente) */}
          <div className="flex justify-between items-center gap-4 sm:gap-8 min-w-0">
            <div className="flex-[1] relative min-w-0">
              <TransladoSeatItem
                type="driver"
                data={tripData.driver}
                isSelectedForm={searchForms === "driver"}
                currentUserRg={currentUserRg}
                militars={militars}
                onSelect={() => onSelectSeat("driver")}
                onDeselect={onDeselectSeat}
                onRemove={() => onRemoveSeat("driver")}
              />
            </div>
            <div className="w-4 sm:w-8 shrink-0"></div>
            <div className="flex-[2] flex gap-2 sm:gap-4 min-w-0">
              <div className="flex-1 relative min-w-0">
                <TransladoSeatItem
                  type="passenger"
                  data={tripData.passengers[0]}
                  idx={0}
                  isSelectedForm={searchForms === 0}
                  currentUserRg={currentUserRg}
                  militars={militars}
                  onSelect={() => onSelectSeat(0)}
                  onDeselect={onDeselectSeat}
                  onRemove={() => onRemoveSeat(0)}
                />
              </div>
              <div className="flex-1 relative min-w-0">
                <TransladoSeatItem
                  type="passenger"
                  data={tripData.passengers[1]}
                  idx={1}
                  isSelectedForm={searchForms === 1}
                  currentUserRg={currentUserRg}
                  militars={militars}
                  onSelect={() => onSelectSeat(1)}
                  onDeselect={onDeselectSeat}
                  onRemove={() => onRemoveSeat(1)}
                />
              </div>
            </div>
          </div>

          {/* DEMAIS LINHAS */}
          {/* Linha 2 */}
          <div className="flex justify-between items-center gap-4 sm:gap-8 min-w-0">
            <div className="flex-[2] flex gap-2 sm:gap-4 min-w-0">
              <div className="flex-1 relative min-w-0">
                <TransladoSeatItem
                  type="passenger"
                  data={tripData.passengers[2]}
                  idx={2}
                  isSelectedForm={searchForms === 2}
                  currentUserRg={currentUserRg}
                  militars={militars}
                  onSelect={() => onSelectSeat(2)}
                  onDeselect={onDeselectSeat}
                  onRemove={() => onRemoveSeat(2)}
                />
              </div>
              <div className="flex-1 relative min-w-0">
                <TransladoSeatItem
                  type="passenger"
                  data={tripData.passengers[3]}
                  idx={3}
                  isSelectedForm={searchForms === 3}
                  currentUserRg={currentUserRg}
                  militars={militars}
                  onSelect={() => onSelectSeat(3)}
                  onDeselect={onDeselectSeat}
                  onRemove={() => onRemoveSeat(3)}
                />
              </div>
            </div>
            <div className="w-4 sm:w-12 shrink-0 border-x border-dashed border-slate-300"></div>
            <div className="flex-[1] relative min-w-0">
              <TransladoSeatItem
                type="passenger"
                data={tripData.passengers[4]}
                idx={4}
                isSelectedForm={searchForms === 4}
                currentUserRg={currentUserRg}
                militars={militars}
                onSelect={() => onSelectSeat(4)}
                onDeselect={onDeselectSeat}
                onRemove={() => onRemoveSeat(4)}
              />
            </div>
          </div>

          {/* Linha 3 */}
          <div className="flex justify-between items-center gap-4 sm:gap-8 min-w-0">
            <div className="flex-[2] flex gap-2 sm:gap-4 min-w-0">
              <div className="flex-1 relative min-w-0">
                <TransladoSeatItem
                  type="passenger"
                  data={tripData.passengers[5]}
                  idx={5}
                  isSelectedForm={searchForms === 5}
                  currentUserRg={currentUserRg}
                  militars={militars}
                  onSelect={() => onSelectSeat(5)}
                  onDeselect={onDeselectSeat}
                  onRemove={() => onRemoveSeat(5)}
                />
              </div>
              <div className="flex-1 relative min-w-0">
                <TransladoSeatItem
                  type="passenger"
                  data={tripData.passengers[6]}
                  idx={6}
                  isSelectedForm={searchForms === 6}
                  currentUserRg={currentUserRg}
                  militars={militars}
                  onSelect={() => onSelectSeat(6)}
                  onDeselect={onDeselectSeat}
                  onRemove={() => onRemoveSeat(6)}
                />
              </div>
            </div>
            <div className="w-4 sm:w-12 shrink-0 border-x border-dashed border-slate-300"></div>
            <div className="flex-[1] relative min-w-0">
              <TransladoSeatItem
                type="passenger"
                data={tripData.passengers[7]}
                idx={7}
                isSelectedForm={searchForms === 7}
                currentUserRg={currentUserRg}
                militars={militars}
                onSelect={() => onSelectSeat(7)}
                onDeselect={onDeselectSeat}
                onRemove={() => onRemoveSeat(7)}
              />
            </div>
          </div>

          {/* Linha 4 */}
          <div className="flex justify-between items-center gap-4 sm:gap-8 min-w-0">
            <div className="flex-[2] flex gap-2 sm:gap-4 min-w-0">
              <div className="flex-1 relative min-w-0">
                <TransladoSeatItem
                  type="passenger"
                  data={tripData.passengers[8]}
                  idx={8}
                  isSelectedForm={searchForms === 8}
                  currentUserRg={currentUserRg}
                  militars={militars}
                  onSelect={() => onSelectSeat(8)}
                  onDeselect={onDeselectSeat}
                  onRemove={() => onRemoveSeat(8)}
                />
              </div>
              <div className="flex-1 relative min-w-0">
                <TransladoSeatItem
                  type="passenger"
                  data={tripData.passengers[9]}
                  idx={9}
                  isSelectedForm={searchForms === 9}
                  currentUserRg={currentUserRg}
                  militars={militars}
                  onSelect={() => onSelectSeat(9)}
                  onDeselect={onDeselectSeat}
                  onRemove={() => onRemoveSeat(9)}
                />
              </div>
            </div>
            <div className="w-4 sm:w-12 shrink-0 border-x border-dashed border-slate-300"></div>
            <div className="flex-[1] relative min-w-0">
              <TransladoSeatItem
                type="passenger"
                data={tripData.passengers[10]}
                idx={10}
                isSelectedForm={searchForms === 10}
                currentUserRg={currentUserRg}
                militars={militars}
                onSelect={() => onSelectSeat(10)}
                onDeselect={onDeselectSeat}
                onRemove={() => onRemoveSeat(10)}
              />
            </div>
          </div>

          {/* Linha 5 (Fundo) */}
          <div className="flex justify-between items-center gap-2 sm:gap-4 mt-4 bg-slate-300/30 p-3 sm:p-5 rounded-3xl min-w-0">
            <div className="flex-1 relative min-w-0">
              <TransladoSeatItem
                type="passenger"
                data={tripData.passengers[11]}
                idx={11}
                isSelectedForm={searchForms === 11}
                currentUserRg={currentUserRg}
                militars={militars}
                onSelect={() => onSelectSeat(11)}
                onDeselect={onDeselectSeat}
                onRemove={() => onRemoveSeat(11)}
              />
            </div>
            <div className="flex-1 relative min-w-0">
              <TransladoSeatItem
                type="passenger"
                data={tripData.passengers[12]}
                idx={12}
                isSelectedForm={searchForms === 12}
                currentUserRg={currentUserRg}
                militars={militars}
                onSelect={() => onSelectSeat(12)}
                onDeselect={onDeselectSeat}
                onRemove={() => onRemoveSeat(12)}
              />
            </div>
            <div className="flex-1 relative min-w-0">
              <TransladoSeatItem
                type="passenger"
                data={tripData.passengers[13]}
                idx={13}
                isSelectedForm={searchForms === 13}
                currentUserRg={currentUserRg}
                militars={militars}
                onSelect={() => onSelectSeat(13)}
                onDeselect={onDeselectSeat}
                onRemove={() => onRemoveSeat(13)}
              />
            </div>
            <div className="flex-1 relative min-w-0">
              <TransladoSeatItem
                type="passenger"
                data={tripData.passengers[14]}
                idx={14}
                isSelectedForm={searchForms === 14}
                currentUserRg={currentUserRg}
                militars={militars}
                onSelect={() => onSelectSeat(14)}
                onDeselect={onDeselectSeat}
                onRemove={() => onRemoveSeat(14)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
