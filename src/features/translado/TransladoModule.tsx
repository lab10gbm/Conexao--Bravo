import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../lib/firebase";
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  deleteDoc,
  runTransaction,
} from "firebase/firestore";
import { UserProfile } from "../../types";
import { useMilitars } from "../../contexts/MilitarContext";
import {
  ArrowLeft,
  Bus,
  Loader2,
  Calendar,
  Plus,
  ArrowRight,
  Car,
} from "lucide-react";
import { motion } from "motion/react";
import { cn, cleanUndefined, getLocalIsoDateString } from "../../lib/utils";
import {
  TransladoModuleProps,
  TransladoVehicle,
  TransladoTrip,
  SeatData,
} from "./types";
import { abbrevRank, getShortName, getPriorityValue } from "./utils";
import { TransladoVehicleCard } from "./components/TransladoVehicleCard";
import { TransladoVanLayout } from "./components/TransladoVanLayout";
import { TransladoTripTimeline } from "./components/TransladoTripTimeline";
import { TransladoManifesto } from "./components/TransladoManifesto";
import { TransladoPassengerModal } from "./components/TransladoPassengerModal";
import { TransladoVehicleModal } from "./components/TransladoVehicleModal";
import { TransladoPrivateVehicleModal } from "./components/TransladoPrivateVehicleModal";
import { TransladoDeleteModal } from "./components/TransladoDeleteModal";

export function TransladoModule({ user, onBack }: TransladoModuleProps) {
  const [vehicles, setVehicles] = useState<TransladoVehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  const [date, setDate] = useState<string>(() => getLocalIsoDateString());
  const [selectedVehicle, setSelectedVehicle] =
    useState<TransladoVehicle | null>(null);
  const [direction, setDirection] = useState<"ida" | "volta">("ida");

  const [tripData, setTripData] = useState<TransladoTrip>({
    driver: null,
    passengers: Array(15).fill(null),
  });
  const [loadingTrip, setLoadingTrip] = useState(false);

  // Modal / Form state for Vehicles
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<TransladoVehicle>>({});

  // Modal / Form state for Private Vehicles
  const [showPrivateForm, setShowPrivateForm] = useState(false);
  const [privateFormData, setPrivateFormData] = useState<
    Partial<TransladoVehicle>
  >({});
  const [deleteVehicleId, setDeleteVehicleId] = useState<{
    id: string;
    isPrivate: boolean;
  } | null>(null);

  const [savedMyVehicle, setSavedMyVehicle] =
    useState<Partial<TransladoVehicle> | null>(() => {
      try {
        const saved = localStorage.getItem("translado_my_vehicle_template");
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    });
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  const { militars } = useMilitars();

  // Load Vehicles
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "translado_vehicles"),
      async (snap) => {
        const v: TransladoVehicle[] = [];
        snap.forEach((d) =>
          v.push({ id: d.id, ...d.data() } as TransladoVehicle),
        );
        v.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

        if (snap.empty && !loadingVehicles) {
          // Auto-seed
          await setDoc(
            doc(db, "translado_vehicles", "van_10"),
            cleanUndefined({
              name: "Van 10º GBM",
              unit: "10º GBM",
              origin: "Itaguaí",
              destination: "10º GBM",
              waypoints: "Verolme",
              status: "OPERANTE",
            }),
          );
          await setDoc(
            doc(db, "translado_vehicles", "van_16"),
            cleanUndefined({
              name: "Van 16º OBM",
              unit: "16º OBM",
              origin: "Itaguaí",
              destination: "16º OBM",
              waypoints: "Verolme",
              status: "OPERANTE",
            }),
          );
        } else {
          // Auto migration to add Verolme and ensure 10º GBM destination
          const van10 = v.find((van) => van.id === "van_10");
          if (
            van10 &&
            (van10.waypoints === "" ||
              !van10.waypoints ||
              van10.waypoints === "Verone" ||
              van10.destination !== "10º GBM")
          ) {
            await setDoc(
              doc(db, "translado_vehicles", "van_10"),
              cleanUndefined({ waypoints: "Verolme", destination: "10º GBM" }),
              { merge: true },
            );
          }
          const van16 = v.find((van) => van.id === "van_16");
          if (
            van16 &&
            (van16.waypoints === "" ||
              !van16.waypoints ||
              van16.waypoints === "Verone")
          ) {
            await setDoc(
              doc(db, "translado_vehicles", "van_16"),
              cleanUndefined({ waypoints: "Verolme" }),
              { merge: true },
            );
          }
          setVehicles(v);
          setLoadingVehicles(false);
        }
      },
    );
    return () => unsub();
  }, [loadingVehicles]);

  // Load Trip Data
  useEffect(() => {
    if (!selectedVehicle) return;

    let activeDirection = direction;
    if (selectedVehicle.isPrivate) {
      const matchIda = selectedVehicle.date === date;
      const matchVolta = selectedVehicle.returnDate === date;
      if (matchIda && !matchVolta) {
        activeDirection = "ida";
        if (direction !== "ida") setDirection("ida");
      } else if (matchVolta && !matchIda) {
        activeDirection = "volta";
        if (direction !== "volta") setDirection("volta");
      }
    }

    setLoadingTrip(true);
    const tripId = `${selectedVehicle.id}_${date}_${activeDirection}`;
    const unsub = onSnapshot(doc(db, "translado_trips", tripId), (snap) => {
      const cap = selectedVehicle.capacity || 15;
      if (snap.exists()) {
        const d = snap.data();
        setTripData({
          driver: d.driver || null,
          passengers:
            d.passengers && Array.isArray(d.passengers)
              ? [...d.passengers, ...Array(cap)].slice(0, cap)
              : Array(cap).fill(null),
        });
      } else {
        setTripData({ driver: null, passengers: Array(cap).fill(null) });
      }
      setLoadingTrip(false);
    });
    return () => unsub();
  }, [selectedVehicle, date, direction]);

  const handleSaveVehicle = async () => {
    if (!formData.name || !formData.origin || !formData.destination)
      return alert("Preencha os campos obrigatórios (Nome, Origem, Destino)");
    const id = formData.id || `veh_${Date.now()}`;
    await setDoc(
      doc(db, "translado_vehicles", id),
      cleanUndefined({
        name: formData.name,
        unit: formData.unit || "",
        origin: formData.origin,
        destination: formData.destination,
        waypoints: formData.waypoints || "",
        status: formData.status || "OPERANTE",
      }),
    );
    setShowForm(false);
    setFormData({});
  };

  const handleDeleteVehicle = (id: string) => {
    setDeleteVehicleId({ id, isPrivate: false });
  };

  const handleSavePrivateVehicle = async () => {
    if (
      !privateFormData.name ||
      !privateFormData.origin ||
      !privateFormData.destination
    ) {
      return alert(
        "Preencha os campos obrigatórios (Veículo/Modelo, Origem, Destino)",
      );
    }

    if (saveAsTemplate) {
      const template = {
        name: privateFormData.name,
        origin: privateFormData.origin,
        destination: privateFormData.destination,
        waypoints: privateFormData.waypoints || "",
        capacity: privateFormData.capacity || 4,
      };
      localStorage.setItem(
        "translado_my_vehicle_template",
        JSON.stringify(template),
      );
      setSavedMyVehicle(template);
    }

    const id = privateFormData.id || `veh_priv_${Date.now()}`;
    const capVal = Number(privateFormData.capacity) || 4;

    const ownerShortName = privateFormData.createdByName
      ? getShortName(privateFormData.createdByName)
      : getShortName(user.name, user.warName);

    await setDoc(
      doc(db, "translado_vehicles", id),
      cleanUndefined({
        name: privateFormData.name,
        unit: user.obm || "Particular",
        origin: privateFormData.origin,
        destination: privateFormData.destination,
        waypoints: privateFormData.waypoints || "",
        status: "OPERANTE",
        isPrivate: true,
        capacity: capVal,
        date: privateFormData.date || date,
        returnDate: privateFormData.returnDate || "",
        createdByRg: privateFormData.createdByRg || user.rg || "",
        createdByName: ownerShortName,
        createdByRank: privateFormData.createdByRank || user.rank || "",
      }),
    );
    setShowPrivateForm(false);
    setPrivateFormData({});
  };

  const handleDeletePrivateVehicle = (id: string) => {
    setDeleteVehicleId({ id, isPrivate: true });
  };

  const handleSaveTrip = async (newData: TransladoTrip) => {
    if (!selectedVehicle) return;
    const tripId = `${selectedVehicle.id}_${date}_${direction}`;

    try {
      await runTransaction(db, async (transaction) => {
        const tripRef = doc(db, "translado_trips", tripId);
        transaction.set(tripRef, newData);
      });
    } catch (e) {
      console.error("Failed to save trip:", e);
      await setDoc(doc(db, "translado_trips", tripId), cleanUndefined(newData));
    }
  };

  const isModerator = useMemo(() => {
    return !!(user.isAdmin || user.isEscalante);
  }, [user]);

  const officialVehicles = useMemo(() => {
    return vehicles.filter((v) => !v.isPrivate);
  }, [vehicles]);

  const privateVehicles = useMemo(() => {
    return vehicles.filter(
      (v) => !!v.isPrivate && (v.date === date || v.returnDate === date),
    );
  }, [vehicles, date]);

  // Seat Assignment State
  const [searchForms, setSearchForms] = useState<"driver" | number | null>(
    null,
  );
  const [selectedBoardingPoint, setSelectedBoardingPoint] =
    useState<string>("");
  const [selectedDutyStatus, setSelectedDutyStatus] = useState<string>(
    "não estou de serviço",
  );

  const waypointsList = useMemo(() => {
    return selectedVehicle?.waypoints
      ? selectedVehicle.waypoints
          .split(",")
          .map((w) => w.trim())
          .filter(Boolean)
      : [];
  }, [selectedVehicle?.waypoints]);

  const boardingOptionsIda = useMemo(() => {
    return selectedVehicle
      ? [selectedVehicle.origin, ...waypointsList, selectedVehicle.destination]
      : [];
  }, [selectedVehicle, waypointsList]);

  const boardingOptionsVolta = useMemo(() => {
    return selectedVehicle
      ? [
          selectedVehicle.destination,
          ...[...waypointsList].reverse(),
          selectedVehicle.origin,
        ]
      : [];
  }, [selectedVehicle, waypointsList]);

  const currentBoardingOptions = useMemo(() => {
    return direction === "ida" ? boardingOptionsIda : boardingOptionsVolta;
  }, [direction, boardingOptionsIda, boardingOptionsVolta]);

  useEffect(() => {
    if (
      currentBoardingOptions.length > 0 &&
      !currentBoardingOptions.includes(selectedBoardingPoint)
    ) {
      setSelectedBoardingPoint(currentBoardingOptions[0]);
    }
  }, [currentBoardingOptions, selectedBoardingPoint]);

  useEffect(() => {
    if (searchForms !== null) {
      if (currentBoardingOptions.length > 0) {
        setSelectedBoardingPoint(currentBoardingOptions[0]);
      }
      setSelectedDutyStatus("não estou de serviço");
    }
  }, [searchForms, currentBoardingOptions]);

  const selectMilitar = (
    militar: UserProfile,
    type: "driver" | number,
    bPoint?: string,
    dStatus?: string,
  ) => {
    const shortNameVal = getShortName(militar.name, militar.warName);
    const seatData: SeatData = {
      rg: militar.rg,
      name: shortNameVal,
      rank: militar.rank || "",
      boardingPoint: bPoint,
      dutyStatus: dStatus || "não estou de serviço",
    };
    const newData = { ...tripData, passengers: [...tripData.passengers] };

    if (type === "driver") {
      // Check if militar is already registered as a passenger
      const alreadyIdx = tripData.passengers.findIndex(
        (p) => p?.rg === militar.rg,
      );
      if (alreadyIdx !== -1) {
        alert(
          `Atenção!\n\nO militar ${abbrevRank(militar.rank)} ${shortNameVal} (${militar.rg}) já está cadastrado nesta viatura no Assento ${alreadyIdx + 1}.\n\nRemova-o do assento antes de defini-lo como condutor.`,
        );
        return;
      }
      newData.driver = seatData;
    } else {
      // Check if militar is already in the van
      if (tripData.driver?.rg === militar.rg) {
        alert(
          `Atenção!\n\nO militar ${abbrevRank(militar.rank)} ${shortNameVal} (${militar.rg}) já está cadastrado nesta viatura como Condutor.`,
        );
        return;
      }
      const alreadyIdx = tripData.passengers.findIndex(
        (p) => p?.rg === militar.rg,
      );
      if (alreadyIdx !== -1 && alreadyIdx !== type) {
        alert(
          `Atenção!\n\nO militar ${abbrevRank(militar.rank)} ${shortNameVal} (${militar.rg}) já está cadastrado nesta viatura no Assento ${alreadyIdx + 1}.`,
        );
        return;
      }

      // Find if there is an empty seat
      const firstEmptySeatIdx = tripData.passengers.findIndex(
        (p) => p === null,
      );
      if (firstEmptySeatIdx !== -1) {
        const targetIdx =
          tripData.passengers[type] === null ? type : firstEmptySeatIdx;
        newData.passengers[targetIdx] = seatData;
      } else {
        // No empty seats! Find the occupant with lowest priority
        let lowestIdx = -1;
        let lowestPriority = Infinity;
        tripData.passengers.forEach((p, idx) => {
          if (p) {
            const pval = getPriorityValue(p);
            if (pval < lowestPriority) {
              lowestPriority = pval;
              lowestIdx = idx;
            }
          }
        });

        if (lowestIdx !== -1) {
          const candidatePriority = getPriorityValue(seatData);
          const occupantPriority = getPriorityValue(
            tripData.passengers[lowestIdx]!,
          );
          if (candidatePriority > occupantPriority) {
            const kicked = tripData.passengers[lowestIdx]!;
            newData.passengers[lowestIdx] = seatData;
            alert(
              `Inscrição realizada com sucesso!\n\nO militar ${abbrevRank(kicked.rank)} ${getShortName(kicked.name)} foi retirado do assento ${lowestIdx + 1} por ter menor prioridade/antiguidade.`,
            );
          } else {
            alert(
              "Viatura lotada!\n\nNão foi possível realizar a inscrição: todos os militares na viatura possuem maior prioridade/antiguidade que você nesta rota.",
            );
            return;
          }
        } else {
          alert("Viatura lotada!");
          return;
        }
      }
    }

    setTripData(newData);
    setSearchForms(null);
    handleSaveTrip(newData);
  };

  const removeSeat = (type: "driver" | number) => {
    const seat =
      type === "driver" ? tripData.driver : tripData.passengers[type];
    if (!seat) return;
    if (seat.rg !== user.rg) {
      alert("Apenas o próprio militar pode cancelar sua inscrição!");
      return;
    }
    const newData = { ...tripData, passengers: [...tripData.passengers] };
    if (type === "driver") newData.driver = null;
    else newData.passengers[type] = null;
    setTripData(newData);
    handleSaveTrip(newData);
  };

  const handleEntrarNaViatura = () => {
    // Check if user is already in the van
    if (tripData.driver?.rg === user.rg)
      return alert("Você já está cadastrado como motorista desta viatura.");
    if (tripData.passengers.some((p) => p?.rg === user.rg))
      return alert("Você já está na viatura.");

    // Find first empty passenger seat
    const emptyIdx = tripData.passengers.findIndex((p) => p === null);
    if (emptyIdx !== -1) {
      setSearchForms(emptyIdx);
    } else {
      // If full, find passenger with lowest priority
      let lowestIdx = -1;
      let lowestPriority = Infinity;
      tripData.passengers.forEach((p, idx) => {
        if (p) {
          const pval = getPriorityValue(p);
          if (pval < lowestPriority) {
            lowestPriority = pval;
            lowestIdx = idx;
          }
        }
      });

      if (lowestIdx !== -1) {
        setSearchForms(lowestIdx);
      } else {
        return alert("Viatura lotada!");
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar ao Portal
        </button>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
              <Bus className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-800">
                Translado OBM
              </h1>
              <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mt-1">
                Gestão Diária de Viaturas Administrativas e Lotações
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <Calendar className="w-5 h-5 text-slate-400 ml-2" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent border-none outline-none font-bold text-slate-700 uppercase p-2 cursor-pointer w-full sm:w-auto"
            />
          </div>
        </div>

        {!selectedVehicle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-12"
          >
            {/* SEÇÃO 1: VIATURAS OFICIAIS */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">
                    Viaturas Disponíveis (Oficiais)
                  </h2>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                    Frota administrativa e operacional da corporação
                  </p>
                </div>
                {isModerator && (
                  <button
                    onClick={() => {
                      setFormData({});
                      setShowForm(true);
                    }}
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-xl text-xs font-bold uppercase flex items-center gap-2 transition-colors shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Viatura
                  </button>
                )}
              </div>

              {loadingVehicles ? (
                <div className="py-10 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                </div>
              ) : officialVehicles.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <Bus className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Nenhuma viatura oficial cadastrada
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {officialVehicles.map((v) => (
                    <TransladoVehicleCard
                      key={v.id}
                      vehicle={v}
                      isModerator={isModerator}
                      currentUserRg={user.rg}
                      onSelect={() => setSelectedVehicle(v)}
                      onEdit={() => {
                        setFormData(v);
                        setShowForm(true);
                      }}
                      onDelete={() => handleDeleteVehicle(v.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* SEÇÃO 2: VEÍCULOS PARTICULARES */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">
                    Veículos Particulares (Caronas)
                  </h2>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">
                    Caronas oferecidas por militares de forma voluntária
                  </p>
                </div>
                <button
                  onClick={() => {
                    setPrivateFormData({ capacity: 4, date: date });
                    setShowPrivateForm(true);
                  }}
                  className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2 rounded-xl text-xs font-bold uppercase flex items-center gap-2 transition-colors shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Cadastrar Particular
                </button>
              </div>

              {loadingVehicles ? (
                <div className="py-10 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                </div>
              ) : privateVehicles.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <Car className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Nenhum veículo particular cadastrado
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Seja o primeiro a oferecer carona no seu trajeto!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {privateVehicles.map((v) => (
                    <TransladoVehicleCard
                      key={v.id}
                      vehicle={v}
                      isModerator={isModerator}
                      currentUserRg={user.rg}
                      onSelect={() => setSelectedVehicle(v)}
                      onEdit={() => {
                        setPrivateFormData(v);
                        setShowPrivateForm(true);
                      }}
                      onDelete={() => handleDeletePrivateVehicle(v.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {selectedVehicle && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="bg-slate-800 text-white p-6 sm:p-8 rounded-[2rem] shadow-xl shadow-slate-900/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Bus className="w-48 h-48 -rotate-12 translate-x-12 -translate-y-12" />
              </div>

              <div className="relative z-10">
                <button
                  onClick={() => {
                    setSelectedVehicle(null);
                    setSearchForms(null);
                  }}
                  className="text-slate-400 hover:text-white flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-6 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" /> Ver Outras Viaturas
                </button>

                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                    {selectedVehicle.unit}
                  </span>
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                      selectedVehicle.status === "INOPERANTE"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                        : selectedVehicle.status === "MANUTENÇÃO"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
                    )}
                  >
                    {selectedVehicle.status || "OPERANTE"}
                  </span>
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tight mb-8">
                  {selectedVehicle.name}
                </h2>

                {selectedVehicle.isPrivate ? (
                  <div className="flex flex-col sm:flex-row bg-slate-700/50 p-1 rounded-2xl inline-flex mb-2 max-w-full overflow-x-auto">
                    {selectedVehicle.date === date && (
                      <button
                        onClick={() => setDirection("ida")}
                        className={cn(
                          "flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                          direction === "ida"
                            ? "bg-blue-500 text-white shadow-lg"
                            : "text-slate-300 hover:text-white hover:bg-slate-700",
                        )}
                      >
                        {selectedVehicle.origin}{" "}
                        <ArrowRight className="w-4 h-4" />{" "}
                        {selectedVehicle.destination} (Ida)
                      </button>
                    )}
                    {selectedVehicle.returnDate &&
                      selectedVehicle.returnDate === date && (
                        <button
                          onClick={() => setDirection("volta")}
                          className={cn(
                            "flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                            direction === "volta"
                              ? "bg-emerald-500 text-white shadow-lg"
                              : "text-slate-300 hover:text-white hover:bg-slate-700",
                          )}
                        >
                          {selectedVehicle.destination}{" "}
                          <ArrowRight className="w-4 h-4" />{" "}
                          {selectedVehicle.origin} (Volta)
                        </button>
                      )}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row bg-slate-700/50 p-1 rounded-2xl inline-flex mb-2 max-w-full overflow-x-auto">
                    <button
                      onClick={() => setDirection("ida")}
                      className={cn(
                        "flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                        direction === "ida"
                          ? "bg-blue-500 text-white shadow-lg"
                          : "text-slate-300 hover:text-white hover:bg-slate-700",
                      )}
                    >
                      {selectedVehicle.origin}{" "}
                      <ArrowRight className="w-4 h-4" />{" "}
                      {selectedVehicle.destination}
                    </button>
                    <button
                      onClick={() => setDirection("volta")}
                      className={cn(
                        "flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                        direction === "volta"
                          ? "bg-emerald-500 text-white shadow-lg"
                          : "text-slate-300 hover:text-white hover:bg-slate-700",
                      )}
                    >
                      {selectedVehicle.destination}{" "}
                      <ArrowRight className="w-4 h-4" />{" "}
                      {selectedVehicle.origin}
                    </button>
                  </div>
                )}
                <div className="text-[10px] text-slate-400 font-bold uppercase ml-2 mt-2">
                  * Você está gerindo os lugares para o dia{" "}
                  {date.split("-").reverse().join("/")}
                </div>
              </div>
            </div>

            {loadingTrip ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col items-center w-full max-w-3xl mx-auto gap-4 pb-4">
                <button
                  onClick={handleEntrarNaViatura}
                  className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-600 font-black text-white text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 mb-8 transition-transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3 cursor-pointer"
                >
                  <Bus className="w-5 h-5" /> Entrar na Viatura
                </button>

                <div className="bg-slate-200/50 rounded-[3rem] border-4 border-slate-300/40 shadow-inner w-full flex flex-col md:flex-row items-stretch min-w-0 overflow-hidden">
                  <TransladoVanLayout
                    vehicle={selectedVehicle}
                    tripData={tripData}
                    searchForms={searchForms}
                    currentUserRg={user.rg}
                    militars={militars}
                    onSelectSeat={(type) => setSearchForms(type)}
                    onDeselectSeat={() => setSearchForms(null)}
                    onRemoveSeat={(type) => removeSeat(type)}
                  />

                  <TransladoTripTimeline
                    currentBoardingOptions={currentBoardingOptions}
                    direction={direction}
                  />
                </div>

                <TransladoManifesto
                  tripData={tripData}
                  selectedVehicle={selectedVehicle}
                  date={date}
                  direction={direction}
                  currentUserRg={user.rg}
                  militars={militars}
                  onRemoveSeat={(type) => removeSeat(type)}
                />
              </div>
            )}
          </motion.div>
        )}
      </div>

      <TransladoPassengerModal
        searchForms={searchForms}
        currentBoardingOptions={currentBoardingOptions}
        selectedBoardingPoint={selectedBoardingPoint}
        setSelectedBoardingPoint={setSelectedBoardingPoint}
        selectedDutyStatus={selectedDutyStatus}
        setSelectedDutyStatus={setSelectedDutyStatus}
        user={user}
        militars={militars}
        onSelectMilitar={selectMilitar}
        onClose={() => setSearchForms(null)}
      />

      <TransladoVehicleModal
        isOpen={showForm}
        formData={formData}
        setFormData={setFormData}
        onSave={handleSaveVehicle}
        onClose={() => setShowForm(false)}
      />

      <TransladoPrivateVehicleModal
        isOpen={showPrivateForm}
        privateFormData={privateFormData}
        setPrivateFormData={setPrivateFormData}
        savedMyVehicle={savedMyVehicle}
        saveAsTemplate={saveAsTemplate}
        setSaveAsTemplate={setSaveAsTemplate}
        onSave={handleSavePrivateVehicle}
        onClose={() => setShowPrivateForm(false)}
      />

      <TransladoDeleteModal
        deleteVehicleId={deleteVehicleId}
        onCancel={() => setDeleteVehicleId(null)}
        onConfirm={async () => {
          if (!deleteVehicleId) return;
          const { id } = deleteVehicleId;
          setDeleteVehicleId(null);
          await deleteDoc(doc(db, "translado_vehicles", id));
          if (selectedVehicle?.id === id) setSelectedVehicle(null);
        }}
      />
    </div>
  );
}
export default TransladoModule;
