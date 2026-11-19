import Link from "next/link";
import type { CapacitySnapshot } from "./types";
import { money, date } from "../operator/types";
export function CapacityView({
  data,
  operationBase,
}: {
  data: CapacitySnapshot;
  operationBase: string;
}) {
  const { limits: l, usage: u } = data;
  const ars = data.currencies.find(c => c.currency === "ARS");
  const committed = u.currencies?.ARS?.working_capital;
  const available = (maximum: number, used: number) =>
    Math.max(0, Number(maximum) - Number(used));
  const valid = (row: {
    status: string;
    valid_from: string;
    valid_until: string | null;
  }) =>
    row.status === "active" &&
    Date.parse(row.valid_from) <= Date.now() &&
    (!row.valid_until || Date.parse(row.valid_until) > Date.now());
  return (
    <section className="op-panel capacity-panel">
      <h1>Capacidad</h1>
      <p>
        Tu capital propio para ejecutar servicios. Los límites aprobados no son un saldo bancario ni dinero de tus clientes.
      </p>
      <div className="op-summary-grid op-section-gap">
        <section className="op-panel"><span>Capital propio disponible · ARS</span><strong className="mono">{!l || !ars || committed === null || u.requires_review || !valid(l) || !valid(ars) ? "Requiere revisión" : money(available(ars.approved_working_capital,committed??0),"ARS")}</strong><p>Capital aprobado menos lo comprometido. Se vuelve a comprobar al adjudicar.</p></section>
        <section className="op-panel"><span>Capital ya comprometido · ARS</span><strong className="mono">{committed===null?"No determinado":money(committed??0,"ARS")}</strong><p>Reservas activas de tus operaciones.</p></section>
        <section className="op-panel"><span>Próximo paso</span><h2>{u.requires_review?"Solicitá revisión administrativa":!l||!ars?"Solicitá límites aprobados":u.operations>=l.max_operations?"Completá una operación para liberar un cupo":"Podés revisar nuevas cargas"}</h2><Link className="op-button secondary" href={operationBase.replace(/\/operaciones$/, "/oportunidades")}>Ver cargas disponibles</Link></section>
      </div>
      {!l ? (
        <p role="status">Pendiente de aprobacion: sin limites configurados.</p>
      ) : (
        <>
          <h2>Capacidad operativa global</h2>
          <p>
            Estado: {valid(l) ? "Activa" : "Inactiva o fuera de vigencia"}.
            Desde {date(l.valid_from)}. Hasta{" "}
            {l.valid_until ? date(l.valid_until) : "Sin vencimiento"}.
          </p>
          <p>
            Operaciones: {u.operations} / {l.max_operations}; disponibles:{" "}
            {available(l.max_operations, u.operations)}.
          </p>
          <p>
            Peso activo: {u.weight_kg} kg; limite:{" "}
            {l.max_weight_kg ?? "Sin limite"}; disponible:{" "}
            {l.max_weight_kg === null
              ? "Sin limite"
              : available(l.max_weight_kg, u.weight_kg)}
            .
          </p>
          <p>
            Volumen activo: {u.volume_m3} m3; limite:{" "}
            {l.max_volume_m3 ?? "Sin limite"}; disponible:{" "}
            {l.max_volume_m3 === null
              ? "Sin limite"
              : available(l.max_volume_m3, u.volume_m3)}
            .
          </p>
        </>
      )}
      {u.requires_review > 0 && (
        <p role="alert">
          Requiere revision: {u.requires_review} reservas historicas con capital
          desconocido. No se habilitan nuevas reservas.
        </p>
      )}
      <h2>Limites por moneda</h2>
      {data.currencies.length === 0 && <p>Sin aprobacion por moneda.</p>}
      {data.currencies.map((c) => {
        const used = u.currencies?.[c.currency];
        return (
          <article key={c.currency}>
            <h3>
              {c.currency} ·{" "}
              {valid(c) ? "Activa" : "Inactiva o fuera de vigencia"}
            </h3>
            <p>
              Precio maximo por operacion:{" "}
              {money(c.max_per_operation, c.currency)}.
            </p>
            <p>
              Exposicion contractual: {money(used?.exposure ?? 0, c.currency)} /{" "}
              {money(c.max_exposure, c.currency)}; disponible:{" "}
              {money(
                available(c.max_exposure, used?.exposure ?? 0),
                c.currency,
              )}
              .
            </p>
            <p>
              Capital declarado: {money(c.declared_working_capital, c.currency)}
              ; aprobado: {money(c.approved_working_capital, c.currency)};
              requerido activo:{" "}
              {used?.working_capital === null
                ? "Requiere revision"
                : money(used?.working_capital ?? 0, c.currency)}
              ; disponible:{" "}
              {used?.working_capital === null
                ? "Requiere revision"
                : money(
                    available(
                      c.approved_working_capital,
                      used?.working_capital ?? 0,
                    ),
                    c.currency,
                  )}
              .
            </p>
          </article>
        );
      })}
      <h2>Reservas</h2>
      {data.reservations.length === 0 && <p>Sin reservas.</p>}
      {data.reservations.map((r) => (
        <article key={r.operation_id}>
          <Link href={`${operationBase}/${r.operation_id}`}>
            Operacion {r.public_code ?? "Ver detalle"}
          </Link>
          <p>
            {r.state} · {money(r.contract_exposure, r.currency)} · Capital:{" "}
            {r.working_capital_required === null
              ? "Requiere revision"
              : money(r.working_capital_required, r.currency)}{" "}
            · {r.weight_kg} kg · {r.volume_m3} m3
          </p>
          <p>
            Reserva: {date(r.reserved_at)}
            {r.released_at &&
              ` · Liberacion: ${date(r.released_at)} · ${r.release_reason}`}
          </p>
        </article>
      ))}
      <h2>Historial de capacidad</h2>
      {data.events.length === 0 && <p>Sin eventos.</p>}
      {data.events.map((e) => (
        <details key={e.id}>
          <summary>
            {date(e.created_at)} · {e.action} · {e.reason}
          </summary>
          <pre>{JSON.stringify(e.payload, null, 2)}</pre>
        </details>
      ))}
    </section>
  );
}
