import type { CapacitySnapshot } from "../capacity/types";
import type {
  OperationPhase,
  OperatorStatus,
  NormalizedQuote,
} from "@4pack/domain";
export type CommercialProfile = {
  public_id: string;
  trade_name: string;
  logo_url: string | null;
  description: string;
  city: string | null;
  province: string | null;
  country: string | null;
  modes: string[];
  specialties: string[];
  coverage: string[];
  categories: string[];
  experience_years: number | null;
  published: boolean;
  admin_hidden: boolean;
};
export type QuoteDraft = {
  id: string;
  cargo_id: string;
  content: Partial<NormalizedQuote>;
  replaces_offer_id: string | null;
};
export type ContractSnapshot = {
  operation_id: string;
  state: "complete" | "requires_review";
  content: { quote: NormalizedQuote; revision: number } | null;
};
export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  role: string;
  created_at: string;
  email?: string;
};
export type Company = {
  user_id: string;
  company_name: string;
  tax_id: string;
  description: string;
  verification_status: OperatorStatus;
  trade_name: string;
  address: string;
  modes: string[];
  routes: string;
  certifications: string;
  rejection_reason: string | null;
  suspended_at?: string | null;
  suspension_action?: string | null;
  rating: number;
  completed_operations: number;
};
export type Cargo = {
  corridor_version?: string;
  origin_plan?: import("@4pack/domain").ChinaPlan;
  id: string;
  public_code: string | null;
  title: string;
  origin: string;
  destination: string;
  category: string;
  weight_kg: number;
  volume_m3: number | null;
  fob_usd: number;
  status: string;
  hazmat_review_required: boolean;
  msds_required: boolean;
  description: string;
  packages: number;
  units_description: string;
  required_documents: string[];
  restrictions: string;
  preferred_mode: string | null;
  requested_services?: string[];
  bidding_deadline: string | null;
  created_at: string;
  reputation: { average: number | null; count: number; completed: number };
};
export type Offer = {
  normalized_quote: NormalizedQuote | null;
  revision: number;
  replaces_offer_id: string | null;
  id: string;
  cargo_id: string;
  operator_id: string;
  mode: string;
  total_usd: number;
  estimated_days: number;
  terms: string;
  documentation_terms: string;
  payment_currency: string;
  valid_until: string;
  status: string;
  created_at: string;
  review_started_at: string | null;
};
export type Operation = {
  workflow_version?: string;
  payment_mode?: "legacy_simulated" | "mercado_pago_test";
  contract_currency?: string;
  id: string;
  public_code?: string;
  cargo_id: string;
  accepted_offer_id: string;
  operator_id: string;
  importer_id: string;
  importer_name: string;
  importer_phone: string | null;
  phase: OperationPhase;
  status: string;
  awarded_at: string;
  completed_at: string | null;
  commission_rate: number;
};
export type Milestone = {
  created_by?: string;
  id: string;
  operation_id: string;
  status: string;
  title: string;
  event_type: string;
  description: string | null;
  location: string | null;
  occurred_at: string;
  created_at: string;
  attachment_id: string | null;
};
export type Message = {
  id: string;
  operation_id: string;
  sender_id: string;
  sender_name: string;
  body: string;
  created_at: string;
};
export type DocumentRecord = {
  id: string;
  public_code?: string;
  support_ticket_id?: string | null;
  cargo_id: string | null;
  operation_id: string | null;
  operator_id: string | null;
  uploaded_by: string;
  document_type: string;
  original_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  validation_status: string;
  rejection_reason: string | null;
  replaces_id: string | null;
  created_at: string;
};
export type Guarantee = {
  currency: "USD" | "ARS";
  id: string;
  operation_id: string;
  amount_usd: number;
  commission_usd: number;
  status: string;
  created_at: string;
};
export type Rating = {
  id: string;
  operation_id: string;
  author_id: string;
  recipient_id: string;
  score: number;
  comment: string | null;
};
export type Movement = {
  id: string;
  operation_id: string | null;
  kind: string;
  amount: number;
  currency: string;
  description: string;
  created_at: string;
};
export type Withdrawal = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
};
export type Ticket = {
  id: string;
  public_code?: string;
  operation_id: string | null;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
};
export type SupportMessage = {
  id: string;
  ticket_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
export type Snapshot = {
  chinaWarehouses?: import("@4pack/domain").ChinaWarehouse[];
  chinaCoordination?: import("@4pack/domain").ChinaCoordination[];
  chinaRevisions?: import("@4pack/domain").ChinaRevision[];
  protection?: {
    operation_id: string;
    provider_payment_id: string | null;
    state: string;
    amount: number;
    commission: number;
    currency: string;
    released_at: string | null;
  }[];
  deliveryConfirmations?: {
    operation_id: string;
    importer_id: string;
    confirmed_at: string;
  }[];
  payments?: {
    operation_id: string;
    status: string;
    amount: number;
    currency: string;
    provider_payment_id: string;
  }[];
  paymentsUnavailable?: boolean;
  multirole?: boolean;
  capacity?: CapacitySnapshot;
  quoteAuthorization?: import("./quote-authorization.mjs").QuoteAuthorization | null;
  commercial: CommercialProfile | null;
  drafts: QuoteDraft[];
  contracts: ContractSnapshot[];
  profile: Profile;
  operator: Company;
  cargos: Cargo[];
  offers: Offer[];
  operations: Operation[];
  events: Milestone[];
  messages: Message[];
  documents: DocumentRecord[];
  guarantees: Guarantee[];
  ratings: Rating[];
  movements: Movement[];
  withdrawals: Withdrawal[];
  tickets: Ticket[];
  support_messages: SupportMessage[];
  reads: { operation_id: string; user_id: string; read_at: string }[];
};
export type ActionResult = {
  ok: boolean;
  message: string;
  id?: string;
  url?: string;
};
export type Section =
  | "capacidad"
  | "oportunidades"
  | "mis-ofertas"
  | "operaciones"
  | "documentos"
  | "historial"
  | "billetera"
  | "soporte"
  | "perfil";
export const sections: readonly Section[] = [
  "capacidad",
  "oportunidades",
  "mis-ofertas",
  "operaciones",
  "documentos",
  "historial",
  "billetera",
  "soporte",
  "perfil",
];
export const money = (n: number, currency = "USD") =>
  !["USD", "ARS"].includes(currency)
    ? "Moneda por revisar"
    : new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(Number(n));
export const date = (s: string | null) =>
  s
    ? new Intl.DateTimeFormat("es-AR", {
        dateStyle: "medium",
        timeStyle: "short",
        hourCycle: "h23",
        timeZone: "America/Argentina/Buenos_Aires",
      }).format(new Date(s))
    : "Sin fecha de cierre";
export const code = (item: { id: string; public_code?: string | null }) =>
  item.public_code ?? "Referencia no disponible";
export const number = (value: number, digits = 1) =>
  new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value));
export const localDateTime = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}`;
};
export const modeLabel = (mode: string | null) =>
  ({ air: "Aéreo", sea: "Marítimo", consolidated: "Consolidado" })[
    mode ?? ""
  ] ?? "Sin preferencia";
export const offerStatus = (offer: Offer) =>
  offer.status === "accepted"
    ? "awarded"
    : offer.status === "withdrawn"
      ? "cancelled"
      : offer.status === "submitted" &&
          Date.parse(offer.valid_until) < Date.now()
        ? "expired"
        : offer.status === "submitted" && offer.review_started_at
          ? "under_review"
          : offer.status;
