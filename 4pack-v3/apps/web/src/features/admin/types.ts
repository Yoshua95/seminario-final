export type Capital = {
  inconsistent?: boolean;
  contract_value?: number;
  review_reason?: string | null;
  approved: number;
  committed: number;
  offers: number;
  operations: number;
  available: number | null;
  requires_review: number;
};
export type Workbench = {
  contracts?: {
    operation_id: string;
    content: { quote?: { required_documents?: string[] } };
  }[];
  guarantees?: { operation_id: string; status: string }[];
  actor: string;
  profiles: {
    id: string;
    role: string;
    full_name: string;
    phone: string | null;
    importer_access_status: string;
  }[];
  operators: {
    user_id: string;
    company_name: string;
    tax_id: string;
    description: string | null;
    verification_status: string;
    application_state: string;
    application_note: string | null;
    capital: Capital;
  }[];
  requests: {
    reviewed_by?: string | null;
    reviewed_at?: string | null;
    id: string;
    operator_id: string;
    previous_total: number;
    requested_total: number;
    approved_total: number | null;
    evidence: string[];
    status: string;
    reason: string | null;
    created_at: string;
  }[];
  operations: {
    id: string;
    operator_id: string;
    importer_id: string;
    cargo_id: string;
    phase: string;
    contract_currency: string;
    public_code: string;
    awarded_at: string;
  }[];
  cargos: {
    id: string;
    public_code: string;
    title: string;
    origin: string;
    destination: string;
  }[];
  events: {
    id: string;
    operation_id: string;
    title: string;
    event_type: string;
    description: string;
    created_by: string;
    occurred_at: string;
    attachment_id: string | null;
  }[];
  documents: {
    id: string;
    operator_id: string | null;
    operation_id: string | null;
    cargo_id: string | null;
    support_ticket_id: string | null;
    original_name: string;
    validation_status: string;
    document_type: string;
  }[];
  claims: {
    id: string;
    operation_id: string | null;
    operator_id: string;
    subject: string;
    category: string;
    status: string;
    assigned_to: string | null;
    resolution: string | null;
    created_at: string;
  }[];
  messages: {
    id: string;
    ticket_id: string;
    sender_id: string;
    body: string;
    created_at: string;
  }[];
  ratings: { recipient_id: string; score: number }[];
  decisions: {
    id: string;
    entity_id: string;
    actor_id: string;
    action: string;
    reason: string;
    created_at: string;
    payload: unknown;
  }[];
};
