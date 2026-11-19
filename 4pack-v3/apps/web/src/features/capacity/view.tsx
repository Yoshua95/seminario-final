import Link from "next/link";
import { randomUUID } from "node:crypto";
import type { CapacitySnapshot } from "./types";
import { money, date } from "../operator/types";
import { CapitalRequestForm } from "./request-form";
export function CapacityView({
  data,
  operationBase,
}: {
  data: CapacitySnapshot;
  operationBase: string;
}) {
  const c = data.capital,
    demo = operationBase.startsWith("/demo/"),
    base = operationBase.replace(/\/operaciones$/, "");
  return (
    <section className="op-panel capacity-panel">
      <h2>Capital operativo</h2>
      <p>
        Tu capital propio para respaldar ofertas y ejecutar operaciones. No es
        dinero de clientes ni un saldo bancario.
      </p>
      <div className="op-summary-grid">
        {[
          ["Capital total aprobado", c?.approved],
          ["Capital comprometido", c?.committed],
          ["Capital disponible", c?.available],
        ].map(([label, value]) => (
          <article className="op-panel" key={String(label)}>
            <span>{label} · ARS</span>
            <strong className="mono">
              {typeof value === "number"
                ? money(value, "ARS")
                : "Requiere revisión"}
            </strong>
          </article>
        ))}
      </div>
      <p
        data-testid="capital-breakdown"
        data-offers={c?.offers}
        data-operations={c?.operations}
        data-available={c?.available ?? "review"}
      >
        Comprometido en ofertas vigentes: {money(c?.offers ?? 0, "ARS")} ·
        Operaciones activas: {money(c?.operations ?? 0, "ARS")}.
      </p>
      {c?.inconsistent && (
        <p role="alert">
          Inconsistencia: el comprometido supera el aprobado. No se permiten
          nuevos compromisos. Administración debe revisar límites y reservas.
        </p>
      )}
      <p>
        Valor contractual de operaciones activas:{" "}
        {money(c?.contract_value ?? 0, "ARS")}. No equivale a capital
        comprometido ni a cobros.
      </p>
      {c?.requires_review ? (
        <p role="alert">
          Hay reservas históricas con capital no determinado. Requieren revisión
          administrativa; no se inventa capital ni se habilitan nuevas ofertas.
        </p>
      ) : (
        <p>
          El capital se reserva al enviar la oferta y se transfiere a la
          operación sin descontarlo dos veces.
        </p>
      )}
      <Link className="op-button secondary" href={base + "/oportunidades"}>
        Ver cargas disponibles
      </Link>
      <details>
        <summary>Solicitar ampliación</summary>
        <CapitalRequestForm
          demo={demo}
          requestKey={randomUUID()}
          documents={data.capital_documents ?? []}
        />
      </details>
      <h2>Mis solicitudes</h2>
      {!data.requests?.length && <p>No hay solicitudes registradas.</p>}
      {data.requests?.map((r) => (
        <article className="op-panel" key={r.id}>
          <p>
            {date(r.created_at)} · Nuevo total solicitado:{" "}
            {money(r.requested_total, "ARS")}
          </p>
          <strong>
            {(
              {
                submitted: "Pendiente",
                approved: "Aprobada",
                rejected: "Rechazada",
                correction: "Requiere corrección",
              } as Record<string, string>
            )[r.status] ?? r.status}
          </strong>
          {r.reason && <p>{r.reason}</p>}
          {r.approved_total !== null && (
            <p>Nuevo total aprobado: {money(r.approved_total, "ARS")}</p>
          )}
        </article>
      ))}
      <details>
        <summary>Reservas e historial por moneda</summary>
        {data.reservations.map((r) => (
          <p key={r.operation_id}>
            <Link href={operationBase + "/" + r.operation_id}>
              {r.public_code ?? r.operation_id.slice(0, 8)}
            </Link>{" "}
            · {r.currency} · Capital{" "}
            {r.working_capital_required === null
              ? "No determinado"
              : money(r.working_capital_required, r.currency)}{" "}
            · {r.state} · {date(r.reserved_at)}
          </p>
        ))}
        {data.events.map((e) => (
          <p key={e.id}>
            {date(e.created_at)} · {e.action} · {e.reason}
          </p>
        ))}
      </details>
    </section>
  );
}
