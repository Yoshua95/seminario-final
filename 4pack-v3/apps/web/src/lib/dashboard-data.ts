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
  cargoId: string;
  cargoTitle: string;
  mode: TransportMode;
  totalUsd: number;
  estimatedDays: number;
  status: string;
};

export type OfferComparison = {
  id: string;
  operatorName: string;
  companyName: string;
  rating: number;
  completedOperations: number;
  mode: TransportMode;
  freightUsd: number;
  customsUsd: number;
  otherCostsUsd: number;
  totalUsd: number;
  estimatedDays: number;
  includesCustoms: boolean;
  terms: string;
  validUntil: string;
  status: string;
};

export type CargoOfferComparison = {
  id: string;
  title: string;
  route: string;
  status: CargoStatus;
  offers: OfferComparison[];
};

export type OperationSummary = {
  id: string;
  cargoTitle: string;
  route: string;
  status: CargoStatus;
};

export type AccountProfile = {
  id: string;
  fullName: string;
  phone: string;
  role: UserRole;
  companyName: string;
  taxId: string;
  description: string;
  verificationStatus: "pending" | "approved" | "rejected" | null;
};

export type OperatorReview = {
  userId: string;
  fullName: string;
  companyName: string;
  taxId: string;
  description: string;
  verificationStatus: "pending" | "approved" | "rejected";
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
  cargo_id: string;
  mode: TransportMode;
  total_usd: number;
  estimated_days: number;
  status: string;
  cargo_requests: Array<{ title: string }> | { title: string } | null;
};

type OperationRow = {
  id: string;
  status: CargoStatus;
  cargo_requests: Array<{ title: string; origin: string; destination: string }> | { title: string; origin: string; destination: string } | null;
};

export async function getCurrentRole(): Promise<UserRole | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const { data } = await supabase.from("profiles").select("role").eq("id", authData.user.id).single();
  return (data?.role as UserRole | undefined) ?? null;
}

export async function getAccountProfile(): Promise<AccountProfile | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const { data: profile } = await supabase.from("profiles").select("id, full_name, phone, role").eq("id", authData.user.id).single();
  if (!profile) return null;

  const { data: operator } = profile.role === "operator"
    ? await supabase.from("operator_profiles").select("company_name, tax_id, description, verification_status").eq("user_id", profile.id).maybeSingle()
    : { data: null };

  return {
    id: profile.id,
    fullName: profile.full_name,
    phone: profile.phone ?? "",
    role: profile.role as UserRole,
    companyName: operator?.company_name ?? "",
    taxId: operator?.tax_id ?? "",
    description: operator?.description ?? "",
    verificationStatus: operator?.verification_status ?? null
  };
}

export async function getOperatorReviews(): Promise<OperatorReview[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("operator_profiles")
    .select("user_id, company_name, tax_id, description, verification_status, profiles(full_name)")
    .order("verification_status", { ascending: false });

  return (data ?? []).map((operator) => {
    const relatedProfile = Array.isArray(operator.profiles) ? operator.profiles[0] : operator.profiles;
    return {
      userId: operator.user_id,
      fullName: relatedProfile?.full_name ?? "Operador",
      companyName: operator.company_name,
      taxId: operator.tax_id,
      description: operator.description ?? "Sin descripción",
      verificationStatus: operator.verification_status
    };
  });
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
    .select("id, cargo_id, mode, total_usd, estimated_days, status, cargo_requests(title)")
    .order("created_at", { ascending: false });

  return ((data ?? []) as OfferRow[]).map((offer) => {
    const cargo = Array.isArray(offer.cargo_requests) ? offer.cargo_requests[0] : offer.cargo_requests;
    return {
      id: offer.id,
      cargoId: offer.cargo_id,
      cargoTitle: cargo?.title ?? "Carga sin título",
      mode: offer.mode,
      totalUsd: offer.total_usd,
      estimatedDays: offer.estimated_days,
      status: offer.status
    };
  });
}

export async function getCargoOfferComparison(cargoId: string): Promise<CargoOfferComparison | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: cargo } = await supabase
    .from("cargo_requests")
    .select("id, title, origin, destination, status")
    .eq("id", cargoId)
    .maybeSingle();
  if (!cargo) return null;

  const { data: offers } = await supabase
    .from("offers")
    .select("id, operator_id, mode, freight_usd, customs_usd, other_costs_usd, total_usd, estimated_days, includes_customs, terms, valid_until, status")
    .eq("cargo_id", cargoId)
    .order("total_usd", { ascending: true });

  const operatorIds = [...new Set((offers ?? []).map((offer) => offer.operator_id))];
  const { data: profiles } = operatorIds.length > 0
    ? await supabase.from("profiles").select("id, full_name, operator_profiles(company_name, rating, completed_operations)").in("id", operatorIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return {
    id: cargo.id,
    title: cargo.title,
    route: `${cargo.origin} → ${cargo.destination}`,
    status: cargo.status as CargoStatus,
    offers: (offers ?? []).map((offer) => {
      const profile = profileById.get(offer.operator_id);
      const operatorProfile = Array.isArray(profile?.operator_profiles) ? profile?.operator_profiles[0] : profile?.operator_profiles;
      return {
        id: offer.id,
        operatorName: profile?.full_name ?? "Operador logístico",
        companyName: operatorProfile?.company_name ?? "Empresa pendiente",
        rating: Number(operatorProfile?.rating ?? 0),
        completedOperations: Number(operatorProfile?.completed_operations ?? 0),
        mode: offer.mode,
        freightUsd: Number(offer.freight_usd),
        customsUsd: Number(offer.customs_usd),
        otherCostsUsd: Number(offer.other_costs_usd),
        totalUsd: Number(offer.total_usd),
        estimatedDays: offer.estimated_days,
        includesCustoms: offer.includes_customs,
        terms: offer.terms,
        validUntil: offer.valid_until,
        status: offer.status
      };
    })
  };
}

export async function getOperations(): Promise<OperationSummary[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("operations")
    .select("id, status, cargo_requests(title, origin, destination)")
    .order("awarded_at", { ascending: false });

  return ((data ?? []) as OperationRow[]).map((operation) => {
    const cargo = Array.isArray(operation.cargo_requests) ? operation.cargo_requests[0] : operation.cargo_requests;
    return {
      id: operation.id,
      cargoTitle: cargo?.title ?? "Carga sin título",
      route: cargo ? `${cargo.origin} → ${cargo.destination}` : "Ruta no disponible",
      status: operation.status
    };
  });
}
