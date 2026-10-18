import { UserProfile } from "../../types";

export interface TransladoModuleProps {
  user: UserProfile;
  onBack: () => void;
}

export interface TransladoVehicle {
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

export interface SeatData {
  rg: string;
  name: string;
  rank: string;
  boardingPoint?: string;
  dutyStatus?: string;
}

export interface TransladoTrip {
  driver: SeatData | null;
  passengers: (SeatData | null)[];
}

export interface SubscribedPassenger extends SeatData {
  type: "driver" | number;
  label: string;
}
