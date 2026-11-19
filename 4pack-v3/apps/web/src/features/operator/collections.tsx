import Link from "next/link";
import type { Snapshot } from "./types";
import { money, code, date } from "./types";
import { Badge, PageHeader, Empty } from "./ui";
import { isProviderTest } from "./journey";
import { netCollections } from "./workbench-state";

export function Collections({ data, demo }: { data: Snapshot; demo: boolean }) {
  const base = demo ? "/demo/operador" : "/operador";
  const ars = data.operations.filter(
    (o) =>
      o.contract_currency === "ARS" ||
      data.offers.find((f) => f.id === o.accepted_offer_id)
        ?.payment_currency === "ARS",
  );
  const amounts = netCollections(data);
  const approved = (data.payments ?? []).filter(
    (p) => p.currency === "ARS" && p.status === "approved",
  );
  return (
    <>
      <PageHeader
        title="Cobros"
        description="Qué se confirmó, qué sigue pendiente y qué importe te corresponde por operación."
      />
      <div className="op-summary-grid op-net-balances">
        <section className="op-panel balance-available">
          <span>Disponible por operaciones completadas</span>
          <strong className="mono">{money(amounts.available, "ARS")}</strong>
          <small className="op-balance-source">Saldo de prueba</small>
          <p>
            Liberaciones netas registradas en el libro, descontando los débitos
            registrados. No es saldo bancario.
          </p>
        </section>
        <section className="op-panel balance-pending">
          <span>Pendiente de liberación</span>
          <strong className="mono">{money(amounts.pending, "ARS")}</strong>
          <small className="op-balance-source">Saldo de prueba</small>
          <p>
            {amounts.pendingCount} operaciones: completar el servicio y
            confirmar la entrega. Si hay controversia, requiere resolución.
            Liberación por hitos aún no disponible.
          </p>
        </section>
      </div>
      <details className="op-panel op-section-gap">
        <summary>
          Pagos de prueba aprobados · detalle del cobro al comprador
        </summary>
        <strong className="mono">
          {data.paymentsUnavailable
            ? "No disponible"
            : money(
                approved.reduce((n, p) => n + Number(p.amount), 0),
                "ARS",
              )}
        </strong>
        <p>
          Verificados por backend. Es el total cobrado al comprador, no el neto
          disponible para el operador.
        </p>
      </details>
      <p className="op-small">
        No hay saldo bancario disponible certificado por 4PACK.{" "}
        <Link href={`${base}/historial`}>
          Consultar históricos en USD en Historial →
        </Link>
      </p>
      <div className="op-table-wrap">
        <table className="op-table op-collections-table">
          <thead>
            <tr>
              <th>Operación / ruta</th>
              <th>Monto acordado</th>
              <th>Comisión</th>
              <th>Neto</th>
              <th>Estado y condición de liberación</th>
            </tr>
          </thead>
          <tbody>
            {ars.map((o) => {
              const cargo = data.cargos.find((c) => c.id === o.cargo_id),
                offer = data.offers.find((f) => f.id === o.accepted_offer_id),
                g = data.guarantees.find((g) => g.operation_id === o.id),
                payments = (data.payments ?? []).filter(
                  (p) => p.operation_id === o.id,
                ),
                test = isProviderTest(o),
                amount = g
                  ? Number(g.amount_usd)
                  : Number(offer?.total_usd ?? 0),
                commission = g ? Number(g.commission_usd) : null;
              return (
                <tr key={o.id}>
                  <td>
                    <Link href={`${base}/operaciones/${o.id}`}>#{code(o)}</Link>
                    <small>
                      {cargo?.origin} → {cargo?.destination}
                    </small>
                  </td>
                  <td className="op-number">{money(amount, "ARS")}</td>
                  <td className="op-number">
                    {commission === null
                      ? "Por verificar"
                      : money(commission, "ARS")}
                  </td>
                  <td className="op-number">
                    {commission === null
                      ? "Por verificar"
                      : money(amount - commission, "ARS")}
                  </td>
                  <td>
                    {test ? (
                      <>
                        <strong>Pago de prueba</strong>
                        <p>
                          {data.paymentsUnavailable
                            ? "No pudimos consultar la verificación"
                            : payments.some((p) => p.status === "approved")
                              ? "Aprobado · verificado por backend"
                              : payments.length
                                ? payments.map((p) => p.status).join(" · ")
                                : "Sin pago verificado"}
                        </p>
                        <small>
                          Liberación por hitos aún no disponible. Un pago
                          aprobado no acredita un desembolso al operador.
                        </small>
                      </>
                    ) : (
                      <>
                        <Badge status={g?.status ?? "pending"} />
                        <small>
                          Saldo simulado. Se libera en el libro al confirmar la
                          entrega y cerrar la operación; una controversia lo
                          mantiene pendiente.
                        </small>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!ars.length && <Empty title="Sin cobros en ARS registrados" />}
      </div>
      <details className="op-panel op-section-gap">
        <summary>Movimientos simulados en ARS</summary>
        {data.movements
          .filter((m) => m.currency === "ARS")
          .map((m) => (
            <div className="op-fact" key={m.id}>
              <span>
                {date(m.created_at)} · {m.description}
              </span>
              <strong className="mono">{money(m.amount, "ARS")}</strong>
            </div>
          ))}
      </details>
    </>
  );
}
