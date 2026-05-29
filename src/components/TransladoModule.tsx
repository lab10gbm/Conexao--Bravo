import React, { useState, useEffect, useMemo } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  deleteDoc,
  runTransaction,
} from "firebase/firestore";
import { UserProfile } from "../types";
import { useMilitars } from "../contexts/MilitarContext";
import {
  ArrowLeft,
  Bus,
  Save,
  Loader2,
  Navigation,
  MapPin,
  Calendar,
  Plus,
  Edit,
  X,
  ArrowRight,
  UserPlus,
  Car,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { parseRank } from "../lib/rankUtils";
import { RankInsignia } from "./RankInsignia";

const abbrevRank = (rankStr?: string): string => {
  if (!rankStr) return "";
  const parsed = parseRank(rankStr).toUpperCase().trim();
  if (parsed === "CORONEL") return "CEL";
  if (parsed === "TEN CEL" || parsed === "TENENTE CORONEL") return "TC";
  if (parsed === "MAJOR") return "MJ";
  if (parsed === "CAPITÃO" || parsed === "CAPITAO") return "CAP";
  if (parsed === "1º TEN" || parsed === "1º TENENTE") return "1º TEN";
  if (parsed === "2º TEN" || parsed === "2º TENENTE") return "2º TEN";
  if (parsed === "ASP OF" || parsed === "ASPIRANTE") return "ASP";
  if (parsed === "SUBTEN" || parsed === "SUBTENENTE") return "ST";
  if (parsed === "1º SGT" || parsed === "1º SARGENTO") return "1º SGT";
  if (parsed === "2º SGT" || parsed === "2º SARGENTO") return "2º SGT";
  if (parsed === "3º SGT" || parsed === "3º SARGENTO") return "3º SGT";
  if (parsed === "CABO") return "CB";
  if (parsed === "SOLDADO") return "SD";
  return parsed;
};

const getShortName = (name?: string, warName?: string): string => {
  if (warName && warName.trim()) return warName.trim().toUpperCase();
  if (!name) return "MILITAR";
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length > 2) {
    return parts[0].toUpperCase();
  }
  return trimmed.toUpperCase();
};

const SteeringWheelIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="3" />
    <line x1="12" y1="2" x2="12" y2="9" />
    <line x1="3.3" y1="17" x2="9.4" y2="13.5" />
    <line x1="20.7" y1="17" x2="14.6" y2="13.5" />
  </svg>
);

const ALL_RANKS_SENIORITY = [
  "CORONEL",
  "TEN CEL",
  "MAJOR",
  "CAPITÃO",
  "1º TEN",
  "2º TEN",
  "ASP OF",
  "SUBTEN",
  "1º SGT",
  "2º SGT",
  "3º SGT",
  "CABO",
  "SOLDADO",
];

const getRankSeniority = (rankStr?: string): number => {
  if (!rankStr) return 999;
  const parsed = parseRank(rankStr);
  const idx = ALL_RANKS_SENIORITY.indexOf(parsed);
  return idx !== -1 ? idx : 999;
};

const getPriorityValue = (p: { rank: string; dutyStatus?: string }): number => {
  const isOnDuty =
    p.dutyStatus === "estou entrando de serviço" ||
    p.dutyStatus === "estou saindo de serviço";
  const dutyPoints = isOnDuty ? 10000 : 0;
  const rankPoints = 1000 - getRankSeniority(p.rank);
  return dutyPoints + rankPoints;
};
import { TagInput } from "./TagInput";

interface TransladoModuleProps {
  user: UserProfile;
  onBack: () => void;
}

interface TransladoVehicle {
  id: string;
  name: string;
  unit: string;
  origin: string;
  destination: string;
  waypoints: string; // comma separated for simplicity in DB
  status?: "OPERANTE" | "INOPERANTE" | "MANUTENÇÃO";
  isPrivate?: boolean;
  capacity?: number;
  date?: string;
  returnDate?: string;
  createdByRg?: string;
  createdByName?: string;
  createdByRank?: string;
}

interface SeatData {
  rg: string;
  name: string;
  rank: string;
  boardingPoint?: string;
  dutyStatus?: string;
}

interface TransladoTrip {
  driver: SeatData | null;
  passengers: (SeatData | null)[];
}

export function TransladoModule({ user, onBack }: TransladoModuleProps) {
  const [vehicles, setVehicles] = useState<TransladoVehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  const [date, setDate] = useState<string>(
    () => new Date().toISOString().split("T")[0],
  );
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
        v.sort((a, b) => a.name.localeCompare(b.name));

        if (snap.empty && !loadingVehicles) {
          // Auto-seed
          await setDoc(doc(db, "translado_vehicles", "van_10"), {
            name: "Van 10º GBM",
            unit: "10º GBM",
            origin: "Itaguaí",
            destination: "10º GBM",
            waypoints: "Verolme",
            status: "OPERANTE",
          });
          await setDoc(doc(db, "translado_vehicles", "van_16"), {
            name: "Van 16º OBM",
            unit: "16º OBM",
            origin: "Itaguaí",
            destination: "16º OBM",
            waypoints: "Verolme",
            status: "OPERANTE",
          });
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
              { waypoints: "Verolme", destination: "10º GBM" },
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
              { waypoints: "Verolme" },
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
    await setDoc(doc(db, "translado_vehicles", id), {
      name: formData.name,
      unit: formData.unit || "",
      origin: formData.origin,
      destination: formData.destination,
      waypoints: formData.waypoints || "",
      status: formData.status || "OPERANTE",
    });
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

    await setDoc(doc(db, "translado_vehicles", id), {
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
    });
    setShowPrivateForm(false);
    setPrivateFormData({});
  };

  const handleDeletePrivateVehicle = (id: string) => {
    setDeleteVehicleId({ id, isPrivate: true });
  };

  const handleSaveTrip = async (newData: TransladoTrip) => {
    if (!selectedVehicle) return;
    const tripId = `${selectedVehicle.id}_${date}_${direction}`;

    // Use transaction to ensure safe concurrent updates of the passengers array
    try {
      await runTransaction(db, async (transaction) => {
        const tripRef = doc(db, "translado_trips", tripId);
        const tripDoc = await transaction.get(tripRef);

        // Always overwrite with the specific state changes made by this user,
        // but base it on the latest data if possible?
        // Wait, if we just write newData without merging, it's not concurrent safe.
        // If we want concurrent safety, we shouldn't just pass newData, we should pass the change intent!
        // For now, let's just write newData since we don't have intent.
        transaction.set(tripRef, newData);
      });
    } catch (e) {
      console.error("Failed to save trip:", e);
      // Fallback
      await setDoc(doc(db, "translado_trips", tripId), newData);
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
  const [searchTerm, setSearchTerm] = useState("");
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
  }, [searchForms]);

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
        // There is room! Use either the specific clicked type or firstEmptySeatIdx
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
    setSearchTerm("");
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
      // Assign to first empty seat by opening the form
      setSearchForms(emptyIdx);
    } else {
      // If full, find the passenger with the lowest priority value
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
        // Open form for this lowest idx
        setSearchForms(lowestIdx);
      } else {
        return alert("Viatura lotada!");
      }
    }
  };

  const filteredMilitars = militars
    .filter((m) => {
      if (!searchTerm) return false;
      const term = searchTerm.toLowerCase();
      return (
        m.rg.toLowerCase().includes(term) ||
        m.name.toLowerCase().includes(term) ||
        (m.warName || "").toLowerCase().includes(term)
      );
    })
    .slice(0, 10);

  const SeatRenderer = ({
    type,
    data,
    idx,
  }: {
    type: "driver" | "passenger";
    data: SeatData | null;
    idx?: number;
  }) => {
    const isSelectedForm =
      type === "driver" ? searchForms === "driver" : searchForms === idx;

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
            <span>
              {type === "driver" ? "Condutor" : `Assento ${idx! + 1}`}
            </span>
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
          {data.rg === user.rg && (
            <button
              onClick={() => removeSeat(type === "driver" ? "driver" : idx!)}
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
          onClick={() => {
            setSearchForms(null);
            setSearchTerm("");
          }}
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
        onClick={() => {
          setSearchForms(type === "driver" ? "driver" : idx!);
          setSearchTerm("");
        }}
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors uppercase font-black text-[10px] tracking-[0.2em] group"
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
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-xl text-xs font-bold uppercase flex items-center gap-2 transition-colors shrink-0"
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
                    <div
                      key={v.id}
                      className="group relative bg-white border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 rounded-3xl p-6 transition-all cursor-pointer overflow-hidden"
                      onClick={() => setSelectedVehicle(v)}
                    >
                      {isModerator && (
                        <div className="absolute top-4 right-4 flex items-center gap-1 z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormData(v);
                              setShowForm(true);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVehicle(v.id);
                            }}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                          <Bus className="w-6 h-6" />
                        </div>
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border",
                            v.status === "INOPERANTE"
                              ? "bg-rose-50 text-rose-600 border-rose-100"
                              : v.status === "MANUTENÇÃO"
                                ? "bg-amber-50 text-amber-600 border-amber-100"
                                : "bg-emerald-50 text-emerald-600 border-emerald-100",
                          )}
                        >
                          {v.status || "OPERANTE"}
                        </span>
                      </div>
                      <div className="text-[10px] uppercase font-black tracking-widest text-blue-500 mb-1">
                        {v.unit || "GERAL"}
                      </div>
                      <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-4">
                        {v.name}
                      </h3>

                      <div className="bg-slate-50 p-3 rounded-xl w-full">
                        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-600 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />{" "}
                          <span className="truncate">{v.origin}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 truncate">
                          <Navigation className="w-3.5 h-3.5 text-slate-400 shrink-0" />{" "}
                          <span className="truncate">{v.destination}</span>
                        </div>
                      </div>
                    </div>
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
                  className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2 rounded-xl text-xs font-bold uppercase flex items-center gap-2 transition-colors shrink-0"
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
                  {privateVehicles.map((v) => {
                    const canEditOrDelete =
                      isModerator || v.createdByRg === user.rg;
                    return (
                      <div
                        key={v.id}
                        className="group relative bg-white border border-slate-200 hover:border-emerald-300 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 rounded-3xl p-6 transition-all cursor-pointer overflow-hidden"
                        onClick={() => setSelectedVehicle(v)}
                      >
                        {canEditOrDelete && (
                          <div className="absolute top-4 right-4 flex items-center gap-1 z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPrivateFormData(v);
                                setShowPrivateForm(true);
                              }}
                              className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePrivateVehicle(v.id);
                              }}
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                            <Car className="w-6 h-6" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border bg-sky-50 text-sky-600 border-sky-100">
                              {v.capacity || 4} vagas
                            </span>
                            <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border bg-emerald-50 text-emerald-600 border-emerald-100">
                              CARONA
                            </span>
                          </div>
                        </div>
                        <div className="text-[10px] uppercase font-black tracking-widest text-emerald-600 mb-1">
                          Proprietário:{" "}
                          {v.createdByRank ? abbrevRank(v.createdByRank) : ""}{" "}
                          {getShortName(v.createdByName)}
                        </div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-4">
                          {v.name}
                        </h3>

                        <div className="bg-slate-50 p-3 rounded-xl w-full">
                          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-600 truncate">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />{" "}
                            <span className="truncate">{v.origin}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 truncate">
                            <Navigation className="w-3.5 h-3.5 text-slate-400 shrink-0" />{" "}
                            <span className="truncate">{v.destination}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                  className="text-slate-400 hover:text-white flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-6 transition-colors"
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
                          "flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
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
                            "flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
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
                        "flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
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
                        "flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
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
                  className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-600 font-black text-white text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 mb-8 transition-transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3"
                >
                  <Bus className="w-5 h-5" /> Entrar na Viatura
                </button>

                <div className="bg-slate-200/50 rounded-[3rem] border-4 border-slate-300/40 shadow-inner w-full flex flex-col md:flex-row items-stretch min-w-0 overflow-hidden">
                  {/* Left: The Seats structure */}
                  <div className="flex-1 p-4 sm:p-8 relative min-w-0">
                    {/* Front windshield representation */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-8 bg-blue-100/50 rounded-b-[2rem] border-b-2 border-blue-200"></div>

                    {selectedVehicle.isPrivate ? (
                      <div className="flex flex-col gap-6 mt-6 min-w-0 max-w-sm mx-auto">
                        {/* Frente */}
                        <div className="flex justify-between items-center gap-4 sm:gap-8 min-w-0">
                          {/* Driver on the left */}
                          <div className="flex-1 relative min-w-0">
                            <SeatRenderer
                              type="driver"
                              data={tripData.driver}
                            />
                          </div>
                          {/* Front passenger on the right if capacity > 0 */}
                          <div className="flex-1 relative min-w-0">
                            {selectedVehicle.capacity &&
                            selectedVehicle.capacity > 0 ? (
                              <SeatRenderer
                                type="passenger"
                                data={tripData.passengers[0]}
                                idx={0}
                              />
                            ) : (
                              <div className="h-24 w-full bg-slate-300/20 border-2 border-dashed border-slate-300/55 rounded-2xl flex items-center justify-center text-slate-400 font-black uppercase text-[8px] tracking-widest text-center">
                                Sem Vaga
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Corredor de separação ou linha de trás */}
                        {selectedVehicle.capacity &&
                        selectedVehicle.capacity > 1 ? (
                          <div className="grid grid-cols-2 gap-3 mt-2 bg-slate-100/40 p-3 sm:p-4 rounded-3xl min-w-0">
                            {Array.from({
                              length: selectedVehicle.capacity - 1,
                            }).map((_, i) => {
                              const seatIdx = i + 1; // back seats start from index 1 up to capacity - 1
                              return (
                                <div key={seatIdx} className="relative min-w-0">
                                  <SeatRenderer
                                    type="passenger"
                                    data={tripData.passengers[seatIdx]}
                                    idx={seatIdx}
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
                            <SeatRenderer
                              type="driver"
                              data={tripData.driver}
                            />
                          </div>
                          <div className="w-4 sm:w-8 shrink-0"></div>
                          <div className="flex-[2] flex gap-2 sm:gap-4 min-w-0">
                            <div className="flex-1 relative min-w-0">
                              <SeatRenderer
                                type="passenger"
                                data={tripData.passengers[0]}
                                idx={0}
                              />
                            </div>
                            <div className="flex-1 relative min-w-0">
                              <SeatRenderer
                                type="passenger"
                                data={tripData.passengers[1]}
                                idx={1}
                              />
                            </div>
                          </div>
                        </div>

                        {/* DEMAIS LINHAS */}
                        {/* Linha 2 */}
                        <div className="flex justify-between items-center gap-4 sm:gap-8 min-w-0">
                          <div className="flex-[2] flex gap-2 sm:gap-4 min-w-0">
                            <div className="flex-1 relative min-w-0">
                              <SeatRenderer
                                type="passenger"
                                data={tripData.passengers[2]}
                                idx={2}
                              />
                            </div>
                            <div className="flex-1 relative min-w-0">
                              <SeatRenderer
                                type="passenger"
                                data={tripData.passengers[3]}
                                idx={3}
                              />
                            </div>
                          </div>
                          <div className="w-4 sm:w-12 shrink-0 border-x border-dashed border-slate-300"></div>
                          <div className="flex-[1] relative min-w-0">
                            <SeatRenderer
                              type="passenger"
                              data={tripData.passengers[4]}
                              idx={4}
                            />
                          </div>
                        </div>

                        {/* Linha 3 */}
                        <div className="flex justify-between items-center gap-4 sm:gap-8 min-w-0">
                          <div className="flex-[2] flex gap-2 sm:gap-4 min-w-0">
                            <div className="flex-1 relative min-w-0">
                              <SeatRenderer
                                type="passenger"
                                data={tripData.passengers[5]}
                                idx={5}
                              />
                            </div>
                            <div className="flex-1 relative min-w-0">
                              <SeatRenderer
                                type="passenger"
                                data={tripData.passengers[6]}
                                idx={6}
                              />
                            </div>
                          </div>
                          <div className="w-4 sm:w-12 shrink-0 border-x border-dashed border-slate-300"></div>
                          <div className="flex-[1] relative min-w-0">
                            <SeatRenderer
                              type="passenger"
                              data={tripData.passengers[7]}
                              idx={7}
                            />
                          </div>
                        </div>

                        {/* Linha 4 */}
                        <div className="flex justify-between items-center gap-4 sm:gap-8 min-w-0">
                          <div className="flex-[2] flex gap-2 sm:gap-4 min-w-0">
                            <div className="flex-1 relative min-w-0">
                              <SeatRenderer
                                type="passenger"
                                data={tripData.passengers[8]}
                                idx={8}
                              />
                            </div>
                            <div className="flex-1 relative min-w-0">
                              <SeatRenderer
                                type="passenger"
                                data={tripData.passengers[9]}
                                idx={9}
                              />
                            </div>
                          </div>
                          <div className="w-4 sm:w-12 shrink-0 border-x border-dashed border-slate-300"></div>
                          <div className="flex-[1] relative min-w-0">
                            <SeatRenderer
                              type="passenger"
                              data={tripData.passengers[10]}
                              idx={10}
                            />
                          </div>
                        </div>

                        {/* Linha 5 (Fundo) */}
                        <div className="flex justify-between items-center gap-2 sm:gap-4 mt-4 bg-slate-300/30 p-3 sm:p-5 rounded-3xl min-w-0">
                          <div className="flex-1 relative min-w-0">
                            <SeatRenderer
                              type="passenger"
                              data={tripData.passengers[11]}
                              idx={11}
                            />
                          </div>
                          <div className="flex-1 relative min-w-0">
                            <SeatRenderer
                              type="passenger"
                              data={tripData.passengers[12]}
                              idx={12}
                            />
                          </div>
                          <div className="flex-1 relative min-w-0">
                            <SeatRenderer
                              type="passenger"
                              data={tripData.passengers[13]}
                              idx={13}
                            />
                          </div>
                          <div className="flex-1 relative min-w-0">
                            <SeatRenderer
                              type="passenger"
                              data={tripData.passengers[14]}
                              idx={14}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Panel: Integrated Path Timeline */}
                  <div className="w-full md:w-36 lg:w-44 shrink-0 border-t-4 md:border-t-0 md:border-l-4 border-dashed border-slate-300/60 bg-slate-200/20 p-4 relative flex flex-col justify-center min-h-[350px]">
                    <div className="text-[10px] font-black uppercase text-slate-550 tracking-widest text-center absolute top-4 left-0 w-full">
                      Trajeto
                    </div>
                    <div className="flex-1 relative flex flex-col justify-between items-center py-8 w-full mt-4">
                      {/* the line */}
                      <div className="absolute inset-y-8 left-1/2 -translate-x-1/2 w-1 bg-slate-300 rounded-full" />

                      {currentBoardingOptions.map((point, index) => {
                        const total = currentBoardingOptions.length;

                        // Determine percentage position
                        let topPercent =
                          total > 1 ? (index / (total - 1)) * 100 : 50;

                        // Specific rule for Verolme to be at 75% of the distance between Itaguaí and 10º GBM
                        if (total === 3 && index === 1) {
                          if (
                            point.toLowerCase().includes("ver") ||
                            point.toLowerCase().includes("ang")
                          ) {
                            if (direction === "ida") {
                              topPercent = 75;
                            } else {
                              topPercent = 25;
                            }
                          }
                        }

                        return (
                          <div
                            key={point}
                            className="absolute w-full px-2 flex flex-col items-center gap-1.5"
                            style={{
                              top: `${topPercent}%`,
                              transform: "translateY(-50%)",
                            }}
                          >
                            <div className="w-3.5 h-3.5 rounded-full border-4 border-slate-200 shadow-sm flex items-center justify-center bg-blue-500 relative z-10 animate-pulse" />
                            <span className="text-[9px] font-black text-slate-600 block text-center leading-tight bg-white px-2 py-1 rounded-lg max-w-full z-10 break-words w-full shadow-xs uppercase">
                              {point}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Relação de Militares Inscritos / Manifesto de Translado */}
                {(() => {
                  const subscribedList: {
                    type: "driver" | number;
                    label: string;
                    rg: string;
                    name: string;
                    rank: string;
                    boardingPoint?: string;
                    dutyStatus?: string;
                  }[] = [];

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

                  subscribedList.sort((a, b) => {
                    const rankDiff =
                      getRankSeniority(a.rank) - getRankSeniority(b.rank);
                    if (rankDiff !== 0) return rankDiff;
                    return a.name.localeCompare(b.name);
                  });

                  const totalOccupied =
                    (tripData.driver ? 1 : 0) +
                    tripData.passengers.filter(Boolean).length;
                  const maxSeats =
                    (selectedVehicle.capacity ||
                      (selectedVehicle.isPrivate ? 4 : 15)) + 1;
                  const enteringDutyCount = subscribedList.filter(
                    (s) => s.dutyStatus === "estou entrando de serviço",
                  ).length;
                  const leavingDutyCount = subscribedList.filter(
                    (s) => s.dutyStatus === "estou saindo de serviço",
                  ).length;

                  return (
                    <div className="w-full bg-white rounded-[2rem] border border-slate-205 p-6 sm:p-8 mt-4 shadow-xs select-none">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                            Militares Inscritos na Viatura
                          </h3>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                            Manifesto de Translado (
                            {direction === "ida" ? "Ida" : "Volta"}) •{" "}
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
                            const mil = militars.find(
                              (item) => item.rg === m.rg,
                            );
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
                                          "bg-slate-100 text-slate-705 px-2 py-0.5 rounded border border-slate-200 uppercase text-[8px] font-black",
                                          m.type === "driver" &&
                                            "bg-emerald-50 text-emerald-700 border-emerald-100",
                                        )}
                                      >
                                        {m.label}
                                      </span>
                                      {m.boardingPoint && (
                                        <span className="flex items-center gap-1 bg-slate-100 text-slate-605 px-2 py-0.5 rounded border border-slate-200 text-[8px] font-black uppercase">
                                          <MapPin className="w-2.5 h-2.5 text-slate-500 shrink-0" />{" "}
                                          {m.boardingPoint}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                  {m.dutyStatus &&
                                    m.dutyStatus !== "não estou de serviço" && (
                                      <span
                                        className={cn(
                                          "px-2.5 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase border",
                                          m.dutyStatus ===
                                            "estou entrando de serviço"
                                            ? "bg-amber-100 text-amber-700 border-amber-200"
                                            : "bg-blue-100 text-blue-700 border-blue-200",
                                        )}
                                      >
                                        {m.dutyStatus ===
                                        "estou entrando de serviço"
                                          ? "Entrando de Serviço"
                                          : "Saindo de Serviço"}
                                      </span>
                                    )}

                                  {m.rg === user.rg && (
                                    <button
                                      onClick={() => removeSeat(m.type)}
                                      className="text-[9px] font-black uppercase bg-rose-50 text-rose-500 border border-rose-200 hover:bg-rose-100 px-2.5 py-1.5 rounded-xl transition-all self-center ml-auto sm:ml-0"
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
                })()}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {searchForms !== null && (
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
                onClick={() => {
                  setSearchForms(null);
                  setSearchTerm("");
                }}
                className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"
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
                        {
                          currentBoardingOptions[
                            currentBoardingOptions.length - 1
                          ]
                        }
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
                    onClick={() =>
                      setSelectedDutyStatus("não estou de serviço")
                    }
                    className={cn(
                      "p-3 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all flex flex-col items-center justify-center text-center leading-tight gap-1",
                      selectedDutyStatus === "não estou de serviço"
                        ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100",
                    )}
                  >
                    Não estou de Serviço
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDutyStatus("estou entrando de serviço")
                    }
                    className={cn(
                      "p-3 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all flex flex-col items-center justify-center text-center leading-tight gap-1",
                      selectedDutyStatus === "estou entrando de serviço"
                        ? "bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/10"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100",
                    )}
                  >
                    Entrando de Serviço
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedDutyStatus("estou saindo de serviço")
                    }
                    className={cn(
                      "p-3 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all flex flex-col items-center justify-center text-center leading-tight gap-1",
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
                    selectMilitar(
                      user,
                      searchForms,
                      selectedBoardingPoint,
                      selectedDutyStatus,
                    )
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-blue-500/15"
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
                />

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
                            selectMilitar(
                              m,
                              searchForms,
                              selectedBoardingPoint,
                              selectedDutyStatus,
                            )
                          }
                          className="w-full p-3 text-left hover:bg-blue-50 text-xs font-bold text-slate-700 uppercase transition-colors flex items-center gap-2"
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
      )}

      {showForm && (
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
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"
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
                            "p-3 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all flex flex-col items-center justify-center text-center leading-tight gap-1",
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
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 rounded-xl text-xs font-black uppercase text-slate-500 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveVehicle}
                  className="px-6 py-3 rounded-xl text-xs font-black uppercase bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Salvar Viatura
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showPrivateForm && (
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
                onClick={() => setShowPrivateForm(false)}
                className="text-slate-400 hover:bg-slate-100 p-2 rounded-full"
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
                  className="w-full bg-emerald-50 text-emerald-700 py-3 rounded-xl border border-emerald-200 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors mb-2 shadow-sm"
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
                <p className="text-[10px] text-slate-405 mt-1 uppercase font-bold text-slate-400">
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
                  onClick={() => setShowPrivateForm(false)}
                  className="px-6 py-3 rounded-xl text-xs font-black uppercase text-slate-500 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePrivateVehicle}
                  className="px-6 py-3 rounded-xl text-xs font-black uppercase bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Salvar Veículo
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {deleteVehicleId && (
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
              Esta ação irá excluir permanentemente este veículo e toda a sua
              lotação futura para este dia e trajeto. Deseja continuar?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteVehicleId(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const { id } = deleteVehicleId;
                  setDeleteVehicleId(null);
                  await deleteDoc(doc(db, "translado_vehicles", id));
                  if (selectedVehicle?.id === id) setSelectedVehicle(null);
                }}
                className="flex-1 py-3 bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20"
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
