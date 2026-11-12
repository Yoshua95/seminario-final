import type { CargoStatus, GuaranteeStatus, TransportMode, UserRole } from "@4pack/domain";
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

export type OperationDetail = {
  id: string;
  cargoTitle: string;
  route: string;
  status: CargoStatus;
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
  ratingRecipient: { id: string; name: string } | null;
  existingRating: { score: number; comment: string } | null;
};

export type DocumentSummary = {
  id: string;
  kind: "invoice" | "packing_list" | "msds" | "payment_proof" | "operator_credential" | "other";
  storagePath: string;
  originalName: string;
  targetLabel: string;
  createdAt: string;
};

export type DocumentTarget = { id: string; type: "cargo" | "operation"; label: string };

export type AdminDashboard = {
  pendingOperators: number;
  activeOperations: number;
  deliveredOperations: number;
  documentsCount: number;
  securedVolumeUsd: number;
  commissionUsd: number;
  guarantees: Array<{
    id: string;
    operationId: string;
    cargoTitle: string;
    operationStatus: CargoStatus;
    guaranteeStatus: GuaranteeStatus;
    amountUsd: number;
    commissionUsd: number;
    createdAt: string;
  }>;
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

export async function getAdminDashboard(): Promise<AdminDashboard | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", authData.user.id).single();
  if (profile?.role !== "admin") return null;

  const [{ data: operators }, { data: operations }, { data: guarantees }, { count: documentsCount }] = await Promise.all([
    supabase.from("operator_profiles").select("verification_status"),
    supabase.from("operations").select("id, status"),
    supabase.from("payment_guarantees").select("id, operation_id, amount_usd, commission_usd, status, created_at, operations(status, cargo_requests(title))").order("created_at", { ascending: false }).limit(8),
    supabase.from("documents").select("id", { count: "exact", head: true })
  ]);

  const guaranteeRows = guarantees ?? [];
  return {
    pendingOperators: (operators ?? []).filter((operator) => operator.verification_status === "pending").length,
    activeOperations: (operations ?? []).filter((operation) => !["delivered", "cancelled"].includes(operation.status)).length,
    deliveredOperations: (operations ?? []).filter((operation) => operation.status === "delivered").length,
    documentsCount: documentsCount ?? 0,
    securedVolumeUsd: guaranteeRows.reduce((total, guarantee) => total + Number(guarantee.amount_usd), 0),
    commissionUsd: guaranteeRows.reduce((total, guarantee) => total + Number(guarantee.commission_usd), 0),
    guarantees: guaranteeRows.map((guarantee) => {
      const operation = Array.isArray(guarantee.operations) ? guarantee.operations[0] : guarantee.operations;
      const cargo = Array.isArray(operation?.cargo_requests) ? operation?.cargo_requests[0] : operation?.cargo_requests;
      return {
        id: guarantee.id,
        operationId: guarantee.operation_id,
        cargoTitle: cargo?.title ?? "Carga sin título",
        operationStatus: (operation?.status ?? "awarded") as CargoStatus,
        guaranteeStatus: guarantee.status as GuaranteeStatus,
        amountUsd: Number(guarantee.amount_usd),
        commissionUsd: Number(guarantee.commission_usd),
        createdAt: guarantee.created_at
      };
    })
  };
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

export async function getOperationDetail(operationId: string): Promise<OperationDetail | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: authData } = await supabase.auth.getUser();
  const { data: operation } = await supabase
    .from("operations")
    .select("id, cargo_id, accepted_offer_id, importer_id, operator_id, status")
    .eq("id", operationId)
    .maybeSingle();
  if (!operation) return null;

  const recipientId = authData.user?.id === operation.importer_id ? operation.operator_id : authData.user?.id === operation.operator_id ? operation.importer_id : null;
  const [{ data: cargo }, { data: offer }, { data: guarantee }, { data: events }, { data: messages }, { data: recipient }, { data: rating }] = await Promise.all([
    supabase.from("cargo_requests").select("title, origin, destination").eq("id", operation.cargo_id).single(),
    supabase.from("offers").select("mode, total_usd").eq("id", operation.accepted_offer_id).single(),
    supabase.from("payment_guarantees").select("amount_usd, commission_usd, status").eq("operation_id", operation.id).single(),
    supabase.from("tracking_events").select("id, status, title, description, location, created_at").eq("operation_id", operation.id).order("created_at", { ascending: false }),
    supabase.from("messages").select("id, sender_id, body, created_at, profiles(full_name)").eq("operation_id", operation.id).order("created_at", { ascending: true }),
    recipientId ? supabase.from("profiles").select("id, full_name").eq("id", recipientId).maybeSingle() : Promise.resolve({ data: null }),
    authData.user ? supabase.from("ratings").select("score, comment").eq("operation_id", operation.id).eq("author_id", authData.user.id).maybeSingle() : Promise.resolve({ data: null })
  ]);

  if (!cargo || !offer || !guarantee) return null;
  return {
    id: operation.id,
    cargoTitle: cargo.title,
    route: `${cargo.origin} → ${cargo.destination}`,
    status: operation.status as CargoStatus,
    mode: offer.mode as TransportMode,
    totalUsd: Number(offer.total_usd),
    guaranteeAmountUsd: Number(guarantee.amount_usd),
    commissionUsd: Number(guarantee.commission_usd),
    guaranteeStatus: guarantee.status as GuaranteeStatus,
    events: (events ?? []).map((event) => ({
      id: event.id,
      status: event.status as CargoStatus,
      title: event.title,
      description: event.description ?? "Sin observaciones adicionales",
      location: event.location ?? "Sin ubicación informada",
      createdAt: event.created_at
    })),
    messages: (messages ?? []).map((message) => {
      const sender = Array.isArray(message.profiles) ? message.profiles[0] : message.profiles;
      return {
        id: message.id,
        senderId: message.sender_id,
        senderName: sender?.full_name ?? "Participante",
        body: message.body,
        createdAt: message.created_at
      };
    }),
    ratingRecipient: recipient ? { id: recipient.id, name: recipient.full_name } : null,
    existingRating: rating ? { score: rating.score, comment: rating.comment ?? "" } : null
  };
}

export async function getDocuments(): Promise<DocumentSummary[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("documents")
    .select("id, kind, storage_path, original_name, created_at, cargo_requests(title), operations(cargo_requests(title))")
    .order("created_at", { ascending: false });

  return (data ?? []).map((document) => {
    const cargo = Array.isArray(document.cargo_requests) ? document.cargo_requests[0] : document.cargo_requests;
    const operation = Array.isArray(document.operations) ? document.operations[0] : document.operations;
    const operationCargo = Array.isArray(operation?.cargo_requests) ? operation?.cargo_requests[0] : operation?.cargo_requests;
    return {
      id: document.id,
      kind: document.kind,
      storagePath: document.storage_path,
      originalName: document.original_name,
      targetLabel: cargo?.title ? `Carga · ${cargo.title}` : operationCargo?.title ? `Operación · ${operationCargo.title}` : "Registro vinculado",
      createdAt: document.created_at
    };
  });
}

export async function getDocumentTargets(): Promise<DocumentTarget[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const [{ data: cargos }, { data: operations }] = await Promise.all([
    supabase.from("cargo_requests").select("id, title").order("created_at", { ascending: false }),
    supabase.from("operations").select("id, cargo_requests(title)").order("awarded_at", { ascending: false })
  ]);
  return [
    ...(cargos ?? []).map((cargo) => ({ id: cargo.id, type: "cargo" as const, label: `Carga · ${cargo.title}` })),
    ...(operations ?? []).map((operation) => {
      const cargo = Array.isArray(operation.cargo_requests) ? operation.cargo_requests[0] : operation.cargo_requests;
      return { id: operation.id, type: "operation" as const, label: `Operación · ${cargo?.title ?? operation.id.slice(0, 8)}` };
    })
  ];
}
