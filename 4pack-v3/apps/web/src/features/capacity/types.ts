export type CapacityLimits = {
  max_operations: number;
  max_weight_kg: number | null;
  max_volume_m3: number | null;
  status: string;
  valid_from: string;
  valid_until: string | null;
  reason: string;
};
export type CurrencyLimit = {
  currency: string;
  max_per_operation: number;
  max_exposure: number;
  declared_working_capital: number;
  approved_working_capital: number;
  status: string;
  valid_from: string;
  valid_until: string | null;
};
export type CapacitySnapshot = {
  limits: CapacityLimits | null;
  currencies: CurrencyLimit[];
  usage: {
    operations: number;
    weight_kg: number;
    volume_m3: number;
    requires_review: number;
    currencies: Record<
      string,
      { exposure: number; working_capital: number | null }
    > | null;
  };
  reservations: {
    public_code?: string;
    operation_id: string;
    currency: string;
    contract_exposure: number;
    working_capital_required: number | null;
    weight_kg: number;
    volume_m3: number;
    state: string;
    reserved_at: string;
    released_at: string | null;
    release_reason: string | null;
  }[];
  events: {
    id: string;
    action: string;
    reason: string;
    created_at: string;
    payload: unknown;
  }[];
};
