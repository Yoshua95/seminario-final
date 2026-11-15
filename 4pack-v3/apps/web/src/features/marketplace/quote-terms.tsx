import { serviceTaxonomy, type NormalizedQuote } from "@4pack/domain";
export function QuoteTerms({quote:q}:{quote:NormalizedQuote|null}) {
  if(!q) return <p className="op-notice warning">Cotización histórica · Requiere revisión de alcance y condiciones. No se completaron datos desconocidos.</p>;
  return <dl className="op-facts"><dt>Servicios</dt><dd>{q.services.map(s=>serviceTaxonomy[s]).join(" · ")}</dd><dt>Alcance</dt><dd>{q.scope}</dd>
  <dt>Capital de trabajo estimado</dt><dd>{q.working_capital_amount==null?"Requiere revision":`${q.working_capital_currency} ${q.working_capital_amount}`}</dd><dt>Precio total</dt><dd>{q.currency} {q.amount}</dd><dt>Plazo</dt><dd>{q.estimated_days} días</dd><dt>Vigencia</dt><dd>{new Date(q.valid_until).toLocaleString("es-AR",{timeZone:"America/Argentina/Buenos_Aires"})}</dd>
  <dt>Incluye</dt><dd>{q.included.join(" · ")}</dd><dt>No incluye</dt><dd>{q.excluded.join(" · ")}</dd><dt>Seguro / cobertura</dt><dd>{q.insurance}</dd>
  <dt>Condiciones de pago</dt><dd>{q.payment_terms}</dd><dt>Documentación requerida</dt><dd>{q.required_documents.join(" · ")}</dd><dt>Responsabilidades</dt><dd>{q.responsibilities}</dd><dt>Observaciones</dt><dd>{q.observations}</dd></dl>;
}
