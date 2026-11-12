import type { CargoStatus, TransportMode, UserRole } from "@4pack/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CargoSummary = {
  id: string;
  title: string;
  origin: string;
  destination: string;
  category: string;
  weightKg: number;
  volumeM3: number;
  fobUsd: number;
  hazmatReviewRequired: boolean;
  offersCount: number;
};

export type OfferSummary = {
  id: string;
  cargoTitle: string;
  mode: TransportMode;
  totalUsd: number;
  estimatedDays: number;
  status: string;
};

export type OperationSummary = {
  id: string;
  cargoTitle: string;
  route: string;
  status: CargoStatus;
};

type CargoRow = {
  id: string;
  title: string;
  origin: string;
  destination: string;
  category: string;
  weight_kg: number;
  volume_m3: number;
  fob_usd: number;
  hazmat_review_required: boolean;
  offers: Array<{ count: number }> | null;
};

type OfferRow = {
  id: string;
  mode: TransportMode;
  total_usd: number;
  estimated_days: number;
  status: string;
  cargo_requests: Array<{ title: string }> | null;
};

type OperationRow = {
  id: string;
  status: CargoStatus;
  cargo_requests: Array<{ title: string; origin: string; destination: string }> | null;
};

export async function getCurrentRole(): Promise<UserRole | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const { data } = await supabase.from("profiles").select("role").eq("id", authData.user.id).single();
  return (data?.role as UserRole | undefined) ?? null;
}

export async function getOpenCargoRequests(): Promise<CargoSummary[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("cargo_requests")
    .select("id, title, origin, destination, category, weight_kg, volume_m3, fob_usd, hazmat_review_required, offers(count)")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  return ((data ?? []) as CargoRow[]).map((cargo) => ({
    id: cargo.id,
    title: cargo.title,
    origin: cargo.origin,
    destination: cargo.destination,
    category: cargo.category,
    weightKg: cargo.weight_kg,
    volumeM3: cargo.volume_m3,
    fobUsd: cargo.fob_usd,
    hazmatReviewRequired: cargo.hazmat_review_required,
    offersCount: cargo.offers?.[0]?.count ?? 0
  }));
}

export async function getOffers(): Promise<OfferSummary[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("offers")
    .select("id, mode, total_usd, estimated_days, status, cargo_requests(title)")
    .order("created_at", { ascending: false });

  return ((data ?? []) as OfferRow[]).map((offer) => ({
    id: offer.id,
    cargoTitle: offer.cargo_requests?.[0]?.title ?? "Carga sin título",
    mode: offer.mode,
    totalUsd: offer.total_usd,
    estimatedDays: offer.estimated_days,
    status: offer.status
  }));
}

export async function getOperations(): Promise<OperationSummary[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("operations")
    .select("id, status, cargo_requests(title, origin, destination)")
    .order("awarded_at", { ascending: false });

  return ((data ?? []) as OperationRow[]).map((operation) => ({
    id: operation.id,
    cargoTitle: operation.cargo_requests?.[0]?.title ?? "Carga sin título",
    route: operation.cargo_requests?.[0]
      ? `${operation.cargo_requests[0].origin} → ${operation.cargo_requests[0].destination}`
      : "Ruta no disponible",
    status: operation.status
  }));
}
