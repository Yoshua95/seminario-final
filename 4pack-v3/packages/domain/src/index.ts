export type UserRole = "importer" | "operator" | "admin";

export type CargoStatus =
  | "draft"
  | "open"
  | "awarded"
  | "in_transit"
  | "customs"
  | "delivered"
  | "cancelled";

export type TransportMode = "air" | "sea" | "consolidated";

export type GuaranteeStatus =
  | "pending"
  | "proof_uploaded"
  | "verified"
  | "held_simulated"
  | "released_simulated"
  | "rejected";

export interface CargoRequest {
  id: string;
  title: string;
  origin: string;
  destination: string;
  category: string;
  weightKg: number;
  volumeM3: number;
  fobUsd: number;
  status: CargoStatus;
  hazmatReviewRequired: boolean;
  offersCount: number;
  createdAt: string;
}

export interface LogisticsOffer {
  id: string;
  cargoId: string;
  mode: TransportMode;
  totalUsd: number;
  estimatedDays: number;
  includesCustoms: boolean;
  validUntil: string;
  operatorRating: number;
}

const hazmatTerms = [
  "batería",
  "bateria",
  "litio",
  "líquido",
  "liquido",
  "imán",
  "iman",
  "aerosol",
  "químico",
  "quimico"
];

export function requiresHazmatReview(description: string): boolean {
  const normalized = description.toLocaleLowerCase("es");
  return hazmatTerms.some((term) => normalized.includes(term));
}

export function calculateCommission(totalUsd: number, rate = 0.025): number {
  return Math.round(totalUsd * rate * 100) / 100;
}

