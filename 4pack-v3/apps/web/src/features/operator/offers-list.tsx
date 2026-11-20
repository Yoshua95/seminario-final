import Link from "next/link";
import type { Snapshot } from "./types";
import { code, money, offerStatus, date } from "./types";
import { PageHeader, Badge, Empty } from "./ui";
import { Drawer } from "./drawer";
import { OfferDetail } from "./offer-detail";
import { QuoteEditor, WithdrawQuote } from "./quote-editor";
import { ActionForm } from "./forms";

export function OffersList({
  data,
  demo,
  search,
}: {
  data: Snapshot;
  demo: boolean;
  search: Record<string, string | string[] | undefined>;
}) {
  const base = demo ? "/demo/operador" : "/operador",
    q = typeof search.q === "string" ? search.q.toLocaleLowerCase("es") : "";
  const rows = data.offers.filter((o) => {
    const c = data.cargos.find((c) => c.id === o.cargo_id);
    return (
      (!search.offer || o.id === search.offer) &&
      (!search.status || offerStatus(o) === search.status) &&
      (!q ||
        `${c?.origin} ${c?.destination} ${c?.public_code} ${c?.title}`
          .toLocaleLowerCase("es")
          .includes(q))
    );
  });
  return (
    <>
      <PageHeader
        title="Mis ofertas"
        description="Cada propuesta, su estado y la próxima acción. La decisión de adjudicar corresponde al importador."
      />
      {data.drafts.map((d) => (
        <details className="op-panel" key={d.id}>
          <summary>
            Borrador · {data.cargos.find((c) => c.id === d.cargo_id)?.title}
          </summary>
          <QuoteEditor
            warehouses={data.chinaWarehouses}
            chinaPlan={data.cargos.find(c=>c.id===d.cargo_id)?.origin_plan}
            authorization={data.quoteAuthorization}
            requestedMode={data.cargos.find(c=>c.id===d.cargo_id)?.preferred_mode}
            requestedServices={data.cargos.find(c=>c.id===d.cargo_id)?.requested_services}
            demo={demo}
            cargoId={d.cargo_id}
            draftId={d.id}
            replacesOfferId={d.replaces_offer_id ?? undefined}
            initial={d.content}
            capacity={data.capacity}
            deadline={
              data.cargos.find((c) => c.id === d.cargo_id)?.bidding_deadline
            }
          />
        </details>
      ))}
      <form method="get" className="op-search-bar">
        <label>
          Ruta o carga
          <input name="q" defaultValue={q} placeholder="Buscar tus ofertas" />
        </label>
        <label>
          Estado
          <select
            name="status"
            defaultValue={
              typeof search.status === "string" ? search.status : ""
            }
          >
            <option value="">Todos</option>
            {[
              "submitted",
              "under_review",
              "awarded",
              "rejected",
              "expired",
              "cancelled",
            ].map((s) => (
              <option key={s} value={s}>
                {
                  {
                    submitted: "Presentada",
                    under_review: "Bajo revisión",
                    awarded: "Adjudicada",
                    rejected: "Rechazada",
                    expired: "Vencida",
                    cancelled: "Cancelada",
                  }[s]
                }
              </option>
            ))}
          </select>
        </label>
        <button className="op-button secondary">Filtrar</button>
      </form>
      <div className="op-table-wrap">
        <table className="op-table">
          <thead>
            <tr>
              <th>Carga / ruta</th>
              <th>Precio</th>
              <th>Plazo</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => {
              const c = data.cargos.find((c) => c.id === o.cargo_id),
                operation = data.operations.find(
                  (p) => p.accepted_offer_id === o.id,
                ),
                editable =
                  c?.status === "open" &&
                  (!c.bidding_deadline ||
                    Date.parse(c.bidding_deadline) > Date.now()) &&
                  Date.parse(o.valid_until) > Date.now() &&
                  ["submitted", "withdrawn"].includes(o.status) &&
                  !data.offers.some((n) => n.replaces_offer_id === o.id);
              return (
                <tr key={o.id}>
                  <td>
                    <strong>
                      {c?.origin} → {c?.destination}
                    </strong>
                    <small>
                      #{c ? code(c) : "Sin referencia"} · {c?.title}
                    </small>
                  </td>
                  <td className="op-number">
                    {o.payment_currency}{" "}
                    {money(o.total_usd, o.payment_currency)}
                  </td>
                  <td className="op-number">{o.estimated_days} días</td>
                  <td>
                    <Badge status={offerStatus(o)} />
                  </td>
                  <td>
                    <div className="op-row-actions">
                      {operation && (
                        <Link
                          className="op-button"
                          href={`${base}/operaciones/${operation.id}`}
                        >
                          Ver operación
                        </Link>
                      )}
                      <Drawer
                        label="Ver detalle"
                        title={`Detalle de oferta · ${c?.public_code ?? "Carga"}`}
                        wide
                      >
                        <p>
                          Sellada el {date(o.created_at)} · Revisión{" "}
                          {o.revision}
                        </p>
                        <OfferDetail quote={o.normalized_quote} />
                        {editable && (
                          <>
                            {o.status === "submitted" && (
                              <WithdrawQuote demo={demo} id={o.id} />
                            )}
                            <details>
                              <summary>Reemplazar con nueva revisión</summary>
                              <QuoteEditor
                                warehouses={data.chinaWarehouses}
                                chinaPlan={c?.origin_plan}
                                authorization={data.quoteAuthorization}
                                requestedMode={c?.preferred_mode}
                                requestedServices={c?.requested_services}
                                demo={demo}
                                cargoId={o.cargo_id}
                                replacesOfferId={o.id}
                                initial={o.normalized_quote ?? {}}
                                deadline={c?.bidding_deadline}
                                capacity={data.capacity}
                                weight={c?.weight_kg}
                                volume={c?.volume_m3}
                              />
                            </details>
                          </>
                        )}
                        {demo &&
                          !data.multirole &&
                          o.status === "submitted" &&
                          o.normalized_quote && (
                            <ActionForm
                              demo
                              command="demo_award"
                              label="Simular adjudicación del importador"
                              confirm
                            >
                              <input type="hidden" name="id" value={o.id} />
                              <p>Solo demo: cambia el estado simulado.</p>
                            </ActionForm>
                          )}
                      </Drawer>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && (
          <Empty title="Sin ofertas para estos filtros">
            Cotizá desde Cargas disponibles.
          </Empty>
        )}
      </div>
    </>
  );
}
