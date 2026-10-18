import React from "react";
import { parseRank } from "../../lib/rankUtils";

export const abbrevRank = (rankStr?: string): string => {
  if (!rankStr) return "";
  const parsed = parseRank(rankStr).toUpperCase().trim();
  if (parsed === "CORONEL") return "CEL";
  if (parsed === "TENENTE CORONEL") return "TC";
  if (parsed === "MAJOR") return "MJ";
  if (parsed === "CAPITÃO" || parsed === "CAPITAO") return "CAP";
  if (parsed === "1º TEN" || parsed === "1º TENENTE") return "1º TENENTE";
  if (parsed === "2º TEN" || parsed === "2º TENENTE") return "2º TENENTE";
  if (parsed === "ASP OF" || parsed === "ASPIRANTE") return "ASP";
  if (parsed === "SUBTENENTE") return "ST";
  if (parsed === "1º SGT" || parsed === "1º SARGENTO") return "1º SARGENTO";
  if (parsed === "2º SGT" || parsed === "2º SARGENTO") return "2º SARGENTO";
  if (parsed === "3º SGT" || parsed === "3º SARGENTO") return "3º SARGENTO";
  if (parsed === "CABO") return "CB";
  if (parsed === "SOLDADO") return "SD";
  return parsed;
};

export const getShortName = (name?: string, warName?: string): string => {
  if (warName && warName.trim()) return warName.trim().toUpperCase();
  if (!name) return "MILITAR";
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length > 2) {
    return parts[0].toUpperCase();
  }
  return trimmed.toUpperCase();
};

export const SteeringWheelIcon = ({ className }: { className?: string }) => (
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

export const ALL_RANKS_SENIORITY = [
  "CORONEL",
  "TENENTE CORONEL",
  "MAJOR",
  "CAPITÃO",
  "1º TENENTE",
  "2º TENENTE",
  "ASP OF",
  "SUBTENENTE",
  "1º SARGENTO",
  "2º SARGENTO",
  "3º SARGENTO",
  "CABO",
  "SOLDADO",
];

export const getRankSeniority = (rankStr?: string): number => {
  if (!rankStr) return 999;
  const parsed = parseRank(rankStr);
  const idx = ALL_RANKS_SENIORITY.indexOf(parsed);
  return idx !== -1 ? idx : 999;
};

export const getPriorityValue = (p: { rank: string; dutyStatus?: string }): number => {
  const isOnDuty =
    p.dutyStatus === "estou entrando de serviço" ||
    p.dutyStatus === "estou saindo de serviço";
  const dutyPoints = isOnDuty ? 10000 : 0;
  const rankPoints = 1000 - getRankSeniority(p.rank);
  return dutyPoints + rankPoints;
};
