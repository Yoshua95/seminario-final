import type { CargoStatus } from "@4pack/domain";
import { supabase } from "./supabase";

export type MobileCargo = {
  id: string;
  title: string;
  route: string;
  weightKg: number;
  volumeM3: number;
  hazmatReviewRequired: boolean;
};

export type MobileOperation = {
  id: string;
  title: string;
  route: string;
  status: CargoStatus;
};

type CargoRow = {
  id: string;
  title: string;
  origin: string;
  destination: string;
  weight_kg: number;
  volume_m3: number;
  hazmat_review_required: boolean;
};

type OperationRow = {
  id: string;
  status: CargoStatus;
  cargo_requests: Array<{ title: string; origin: string; destination: string }> | null;
};

export async function loadOpenCargos(): Promise<MobileCargo[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("cargo_requests")
    .select("id, title, origin, destination, weight_kg, volume_m3, hazmat_review_required")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as CargoRow[]).map((cargo) => ({
    id: cargo.id,
    title: cargo.title,
    route: `${cargo.origin} → ${cargo.destination}`,
    weightKg: cargo.weight_kg,
    volumeM3: cargo.volume_m3,
    hazmatReviewRequired: cargo.hazmat_review_required
  }));
}

export async function loadOperations(): Promise<MobileOperation[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("operations")
    .select("id, status, cargo_requests(title, origin, destination)")
    .order("awarded_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as OperationRow[]).map((operation) => {
    const cargo = operation.cargo_requests?.[0];
    return {
      id: operation.id,
      title: cargo?.title ?? "Carga sin título",
      route: cargo ? `${cargo.origin} → ${cargo.destination}` : "Ruta no disponible",
      status: operation.status
    };
  });
}
