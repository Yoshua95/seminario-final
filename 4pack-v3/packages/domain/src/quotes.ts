import services from "./services.json" with { type: "json" };
export const serviceTaxonomy = services;
export type ServiceKind = keyof typeof services;
export type ContractCurrency = "USD" | "ARS";
export type NormalizedQuote = {
  mode: "air" | "sea" | "consolidated";
  services: ServiceKind[];
  scope: string;
  amount: string;
  currency: ContractCurrency;
  working_capital_amount?: string | null;
  working_capital_currency?: ContractCurrency | null;
  included: string[];
  excluded: string[];
  insurance: string;
  estimated_days: string;
  valid_until: string;
  payment_terms: string;
  required_documents: string[];
  responsibilities: string;
  observations: string;
};
export function sameQuoteScope(a: NormalizedQuote | null, b: NormalizedQuote | null): boolean {
  if (!a || !b) return false;
  const scope = (q: NormalizedQuote) => JSON.stringify({mode:q.mode,services:[...q.services].sort(),scope:q.scope.trim().toLocaleLowerCase("es"),included:[...q.included].sort(),excluded:[...q.excluded].sort(),insurance:q.insurance,responsibilities:q.responsibilities,payment_terms:q.payment_terms,required_documents:[...q.required_documents].sort()});
  return scope(a) === scope(b);
}
export function validateQuote(q: NormalizedQuote): string | null {
  if (!q.working_capital_amount || !/^[0-9]+(\.[0-9]{1,2})?$/.test(q.working_capital_amount) || Number(q.working_capital_amount)>Number(q.amount)) return "Declarar capital de trabajo estimado entre cero y el precio del servicio.";
  if (q.working_capital_currency !== q.currency) return "La moneda del capital debe coincidir con la contractual.";
  if (!["air","sea","consolidated"].includes(q.mode)) return "Elegí una modalidad válida.";
  if (!["USD","ARS"].includes(q.currency)) return "Elegí USD o ARS, sin combinar monedas.";
  if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(q.amount) || Number(q.amount)<=0 || Number(q.amount)>999999999) return "Revisá el precio.";
  if (!q.services.length || q.services.some(s=>!(s in services))) return "Seleccioná el servicio.";
  if (!q.included.length || !q.excluded.length || !q.required_documents.length) return "Detallá incluidos, excluidos y documentación.";
  if (q.included.some(i=>q.excluded.some(e=>i.trim().toLowerCase()===e.trim().toLowerCase()))) return "Un concepto no puede estar incluido y excluido.";
  if (![q.scope,q.insurance,q.payment_terms,q.responsibilities,q.observations].every(v=>v.trim())) return "Completá los términos de la cotización.";
  if (!Number.isInteger(Number(q.estimated_days)) || Number(q.estimated_days)<1 || Number(q.estimated_days)>365 || !Number.isFinite(Date.parse(q.valid_until))) return "Revisá plazo y vigencia.";
  return null;
}
