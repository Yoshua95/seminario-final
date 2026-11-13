import { requiresHazmatReview, type CargoStatus, type GuaranteeStatus, type TransportMode, type UserRole } from "@4pack/domain";
import { supabase } from "./supabase";

export type MobileProfile = {
  id: string;
  fullName: string;
  role: UserRole;
  verificationStatus: "pending" | "approved" | "rejected" | null;
};

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

export type MobileCargoDetail = MobileCargo & {
  description: string;
  category: string;
  fobUsd: number;
  preferredMode: TransportMode | null;
  msdsRequired: boolean;
  biddingDeadline: string | null;
  ownOffer: {
    id: string;
    totalUsd: number;
    estimatedDays: number;
    status: string;
  } | null;
};

export type MobileOperationDetail = MobileOperation & {
  role: UserRole;
  mode: TransportMode;
  totalUsd: number;
  guaranteeAmountUsd: number;
  commissionUsd: number;
  guaranteeStatus: GuaranteeStatus;
  events: Array<{
    id: string;
    status: CargoStatus;
    title: string;
    description: string;
    location: string;
    createdAt: string;
  }>;
  messages: Array<{
    id: string;
    senderId: string;
    senderName: string;
    body: string;
    createdAt: string;
  }>;
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
  cargo_requests: { title: string; origin: string; destination: string } | Array<{ title: string; origin: string; destination: string }> | null;
};

export async function loadCurrentProfile(): Promise<MobileProfile | null> {
  if (!supabase) return null;
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", authData.user.id)
    .single();
  if (error) throw error;

  const { data: operator } = profile.role === "operator"
    ? await supabase
        .from("operator_profiles")
        .select("verification_status")
        .eq("user_id", profile.id)
        .maybeSingle()
    : { data: null };

  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role as UserRole,
    verificationStatus: operator?.verification_status ?? null
  };
}

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
    const cargo = Array.isArray(operation.cargo_requests)
      ? operation.cargo_requests[0]
      : operation.cargo_requests;
    return {
      id: operation.id,
      title: cargo?.title ?? "Carga sin título",
      route: cargo ? `${cargo.origin} → ${cargo.destination}` : "Ruta no disponible",
      status: operation.status
    };
  });
}

export async function loadCargoDetail(cargoId: string): Promise<MobileCargoDetail | null> {
  if (!supabase) return null;
  const profile = await loadCurrentProfile();
  if (!profile) return null;

  const { data: cargo, error } = await supabase
    .from("cargo_requests")
    .select("id, title, description, origin, destination, category, weight_kg, volume_m3, fob_usd, preferred_mode, hazmat_review_required, msds_required, bidding_deadline")
    .eq("id", cargoId)
    .maybeSingle();
  if (error) throw error;
  if (!cargo) return null;

  const { data: offer } = profile.role === "operator"
    ? await supabase
        .from("offers")
        .select("id, total_usd, estimated_days, status")
        .eq("cargo_id", cargoId)
        .eq("operator_id", profile.id)
        .maybeSingle()
    : { data: null };

  return {
    id: cargo.id,
    title: cargo.title,
    description: cargo.description,
    route: `${cargo.origin} → ${cargo.destination}`,
    category: cargo.category,
    weightKg: Number(cargo.weight_kg),
    volumeM3: Number(cargo.volume_m3),
    fobUsd: Number(cargo.fob_usd),
    preferredMode: cargo.preferred_mode as TransportMode | null,
    hazmatReviewRequired: cargo.hazmat_review_required,
    msdsRequired: cargo.msds_required,
    biddingDeadline: cargo.bidding_deadline,
    ownOffer: offer ? {
      id: offer.id,
      totalUsd: Number(offer.total_usd),
      estimatedDays: offer.estimated_days,
      status: offer.status
    } : null
  };
}

export async function createCargo(input: {
  title: string;
  description: string;
  origin: string;
  destination: string;
  category: string;
  weightKg: number;
  volumeM3: number;
  fobUsd: number;
  preferredMode: TransportMode;
}) {
  if (!supabase) throw new Error("La conexión no está disponible.");
  const profile = await loadCurrentProfile();
  if (!profile || profile.role !== "importer") throw new Error("Sólo un importador puede publicar cargas.");

  const requiresReview = requiresHazmatReview(input.description);
  const { data, error } = await supabase
    .from("cargo_requests")
    .insert({
      importer_id: profile.id,
      title: input.title,
      description: input.description,
      origin: input.origin,
      destination: input.destination,
      category: input.category,
      weight_kg: input.weightKg,
      volume_m3: input.volumeM3,
      fob_usd: input.fobUsd,
      preferred_mode: input.preferredMode,
      status: "open",
      hazmat_review_required: requiresReview,
      msds_required: requiresReview,
      bidding_deadline: new Date(Date.now() + 7 * 86400000).toISOString()
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function submitOffer(cargoId: string, input: {
  mode: TransportMode;
  freightUsd: number;
  customsUsd: number;
  otherCostsUsd: number;
  estimatedDays: number;
  includesCustoms: boolean;
  terms: string;
}) {
  if (!supabase) throw new Error("La conexión no está disponible.");
  const profile = await loadCurrentProfile();
  if (!profile || profile.role !== "operator") throw new Error("Sólo un operador puede cotizar.");
  if (profile.verificationStatus !== "approved") throw new Error("El operador todavía no fue aprobado.");

  const { error } = await supabase.from("offers").insert({
    cargo_id: cargoId,
    operator_id: profile.id,
    mode: input.mode,
    freight_usd: input.freightUsd,
    customs_usd: input.customsUsd,
    other_costs_usd: input.otherCostsUsd,
    estimated_days: input.estimatedDays,
    includes_customs: input.includesCustoms,
    terms: input.terms,
    valid_until: new Date(Date.now() + 7 * 86400000).toISOString()
  });
  if (error) throw error;
}

export async function loadOperationDetail(operationId: string): Promise<MobileOperationDetail | null> {
  if (!supabase) return null;
  const profile = await loadCurrentProfile();
  if (!profile) return null;

  const { data: operation, error } = await supabase
    .from("operations")
    .select("id, cargo_id, accepted_offer_id, status")
    .eq("id", operationId)
    .maybeSingle();
  if (error) throw error;
  if (!operation) return null;

  const [cargoResult, offerResult, guaranteeResult, eventsResult, messagesResult] = await Promise.all([
    supabase.from("cargo_requests").select("title, origin, destination").eq("id", operation.cargo_id).single(),
    supabase.from("offers").select("mode, total_usd").eq("id", operation.accepted_offer_id).single(),
    supabase.from("payment_guarantees").select("amount_usd, commission_usd, status").eq("operation_id", operation.id).single(),
    supabase.from("tracking_events").select("id, status, title, description, location, created_at").eq("operation_id", operation.id).order("created_at", { ascending: false }),
    supabase.from("messages").select("id, sender_id, body, created_at, profiles(full_name)").eq("operation_id", operation.id).order("created_at", { ascending: true })
  ]);

  if (cargoResult.error) throw cargoResult.error;
  if (offerResult.error) throw offerResult.error;
  if (guaranteeResult.error) throw guaranteeResult.error;
  if (eventsResult.error) throw eventsResult.error;
  if (messagesResult.error) throw messagesResult.error;

  const cargo = cargoResult.data;
  const offer = offerResult.data;
  const guarantee = guaranteeResult.data;
  return {
    id: operation.id,
    title: cargo.title,
    route: `${cargo.origin} → ${cargo.destination}`,
    status: operation.status as CargoStatus,
    role: profile.role,
    mode: offer.mode as TransportMode,
    totalUsd: Number(offer.total_usd),
    guaranteeAmountUsd: Number(guarantee.amount_usd),
    commissionUsd: Number(guarantee.commission_usd),
    guaranteeStatus: guarantee.status as GuaranteeStatus,
    events: (eventsResult.data ?? []).map((event) => ({
      id: event.id,
      status: event.status as CargoStatus,
      title: event.title,
      description: event.description ?? "Sin observaciones adicionales",
      location: event.location ?? "Sin ubicación informada",
      createdAt: event.created_at
    })),
    messages: (messagesResult.data ?? []).map((message) => {
      const sender = Array.isArray(message.profiles) ? message.profiles[0] : message.profiles;
      return {
        id: message.id,
        senderId: message.sender_id,
        senderName: sender?.full_name ?? "Participante",
        body: message.body,
        createdAt: message.created_at
      };
    })
  };
}

export async function simulateGuarantee(operationId: string) {
  if (!supabase) throw new Error("La conexión no está disponible.");
  const { error } = await supabase.rpc("simulate_guarantee", { target_operation_id: operationId });
  if (error) throw error;
}

export async function advanceOperation(operationId: string, nextStatus: CargoStatus, title: string, location: string) {
  if (!supabase) throw new Error("La conexión no está disponible.");
  const { error } = await supabase.rpc("advance_operation", {
    target_operation_id: operationId,
    next_status: nextStatus,
    event_title: title,
    event_location: location || null
  });
  if (error) throw error;
}

export async function sendOperationMessage(operationId: string, body: string) {
  if (!supabase) throw new Error("La conexión no está disponible.");
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw authError ?? new Error("La sesión no está disponible.");
  const { error } = await supabase.from("messages").insert({
    operation_id: operationId,
    sender_id: authData.user.id,
    body
  });
  if (error) throw error;
}
