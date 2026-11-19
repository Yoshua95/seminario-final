import type { NormalizedQuote } from "@4pack/domain";
import { serviceTaxonomy } from "@4pack/domain";
import { money, date } from "./types";
export function OfferDetail({ quote: q }: { quote: NormalizedQuote | null }) {
  if (!q)
    return (
      <p>
        Oferta histórica: alcance pendiente de revisión. No se completan
        condiciones desconocidas.
      </p>
    );
  return (
    <div className="op-offer-detail">
      <div className="op-offer-hero">
        <div>
          <small>Precio total</small>
          <strong>
            {q.currency} {money(Number(q.amount), q.currency)}
          </strong>
        </div>
        <div>
          <small>Plazo estimado</small>
          <strong>{q.estimated_days} días</strong>
        </div>
        <div>
          <small>Vigente hasta</small>
          <strong>{date(q.valid_until)}</strong>
        </div>
      </div>
      <section>
        <h3>Alcance y servicios</h3>
        <p>{q.scope}</p>
        <ul>
          {q.services.map((s) => (
            <li key={s}>{serviceTaxonomy[s]}</li>
          ))}
        </ul>
      </section>
      <section className="op-detail-columns">
        <div>
          <h3>Incluye</h3>
          <ul>
            {q.included.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>No incluye</h3>
          <ul>
            {q.excluded.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      </section>
      <section>
        <h3>Condiciones y documentación</h3>
        <dl>
          <dt>Pago</dt>
          <dd>{q.payment_terms}</dd>
          <dt>Seguro</dt>
          <dd>{q.insurance}</dd>
          <dt>Responsabilidades</dt>
          <dd>{q.responsibilities}</dd>
          <dt>Documentos requeridos</dt>
          <dd>{q.required_documents.join(" · ")}</dd>
        </dl>
      </section>
      <section>
        <h3>Excepciones y observaciones</h3>
        <p>{q.observations}</p>
      </section>
    </div>
  );
}
