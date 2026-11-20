import Link from "next/link";
import { randomUUID } from "node:crypto";
import { BrandMark } from "@/components/brand-mark";
import { loadWorkbench } from "./data";
import { AdminForm } from "./form";
import { date } from "../operator/types";
import { phaseLabels } from "@4pack/domain";
import type { Workbench } from "./types";
import { operationTask, operationStage } from "./operation-task";
import { leaveRehearsal } from "../multirole/actions";
import { SessionProfile } from "@/components/session-profile";
export type AdminSection =
  | "inicio"
  | "operadores"
  | "operaciones"
  | "reclamos"
  | "importadores"
  | "perfil";
const navigation = [
  ["inicio", "Inicio"],
  ["operadores", "Operadores"],
  ["operaciones", "Operaciones"],
  ["reclamos", "Reclamos"],
  ["importadores", "Importadores"],
  ["perfil", "Mi perfil"],
] as const;
const labels: Record<string, string> = {
  suspended: "Suspendido",
  pending: "Pendiente",
  submitted: "Pendiente",
  correction: "Requiere corrección",
  approved: "Aprobado",
  rejected: "Rechazado",
  open: "Abierto",
  in_progress: "En revisión",
  waiting_user: "Esperando información",
  resolved: "Resuelto",
  closed: "Cerrado",
  active: "Activa",
};
const tag = (s: string) => (
  <span
    className={`admin-state ${["approved", "resolved", "closed", "active"].includes(s) ? "green" : ["rejected", "suspended"].includes(s) ? "red" : "orange"}`}
  >
    {labels[s] ?? s}
  </span>
);
function Meta({ command, id }: { command: string; id?: string }) {
  return (
    <>
      <input type="hidden" name="command" value={command} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="request_key" value={randomUUID()} />
    </>
  );
}
function Reason() {
  return (
    <label>
      Motivo o información que falta
      <textarea name="reason" minLength={5} maxLength={2000} required />
    </label>
  );
}
function Choices() {
  return (
    <label>
      Decisión
      <select name="decision">
        <option value="approved">Aprobar</option>
        <option value="correction">Pedir corrección</option>
        <option value="rejected">Rechazar</option>
      </select>
    </label>
  );
}
function DocList({
  data,
  ids,
  demo,
}: {
  data: Workbench;
  ids: string[];
  demo: boolean;
}) {
  return (
    <ul>
      {ids.length === 0 && <li>Sin documentos registrados</li>}
      {data.documents
        .filter((d) => ids.includes(d.id))
        .map((d) => (
          <li key={d.id}>
            <a
              href={
                demo
                  ? "/demo/multirole/documentos/" + d.id
                  : "/admin/archivos?id=" + d.id
              }
              target="_blank"
              rel="noreferrer"
            >
              {d.original_name}
            </a>{" "}
            · {tag(d.validation_status)}
          </li>
        ))}
    </ul>
  );
}
export async function AdminWorkspace({
  section = "inicio",
  demo = false,
  searchParams,
}: {
  section?: AdminSection;
  demo?: boolean;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const p = (await searchParams) ?? {},
    data = await loadWorkbench(demo),
    base = demo ? "/demo/admin" : "/admin";
  const url = (s: string, query = "") =>
      base + (s === "inicio" ? "" : "/" + s) + query,
    name = (id: string) =>
      data.profiles.find((x) => x.id === id)?.full_name ??
      "Cuenta no informada",
    company = (id: string) =>
      data.operators.find((x) => x.user_id === id)?.company_name ?? name(id);
  const stats = (id: string, role: "operator" | "importer") => {
    const ops = data.operations.filter(
      (o) => (role === "operator" ? o.operator_id : o.importer_id) === id,
    );
    return {
      total: ops.length,
      active: ops.filter(
        (o) => !["completed", "cancelled", "failed"].includes(o.phase),
      ).length,
      done: ops.filter((o) => o.phase === "completed").length,
    };
  };
  const docs = (id: string) =>
      data.documents.filter((d) => d.operator_id === id).map((d) => d.id),
    selected = data.operators.find((o) => o.user_id === p.id);
  const application = data.applications?.find(
    (a) => a.operator_id === selected?.user_id,
  );
  return (
    <main className="shell admin-workspace">
      <aside className="sidebar">
        <Link className="brand" href={base}>
          <BrandMark />
        </Link>
        <nav aria-label="Administración">
          {navigation.map(([key, label]) => (
            <Link
              className={section === key ? "active" : undefined}
              href={url(key)}
              key={key}
            >
              {label}
            </Link>
          ))}
        </nav>
        <p>Administración · {name(data.actor)}</p>
        {demo && <p>Ensayo aislado · datos ficticios</p>}
        {demo ? (
          <form action={leaveRehearsal}>
            <button className="op-button secondary">
              Cerrar sesión de ensayo
            </button>
          </form>
        ) : (
          <SessionProfile />
        )}
      </aside>
      <section className="content op-content">
        <header className="admin-heading">
          <p className="eyebrow">4PACK · ADMINISTRACIÓN</p>
          <h1>{navigation.find((n) => n[0] === section)?.[1]}</h1>
          <p>Encontrá el caso, revisá el contexto y registrá tu decisión.</p>
        </header>
        {section === "inicio" && (
          <div className="op-summary-grid">
            {[
              [
                "Postulaciones nuevas",
                data.operators.filter(
                  (o) =>
                    o.application_state === "pending" &&
                    !["approved", "suspended"].includes(o.verification_status),
                ).length,
                url("operadores", "?tab=postulaciones&status=pending"),
              ],
              [
                "Correcciones pendientes",
                data.operators.filter(
                  (o) => o.application_state === "correction",
                ).length,
                url("operadores", "?tab=postulaciones&status=correction"),
              ],
              [
                "Reclamos abiertos",
                data.claims.filter(
                  (r) => !["resolved", "closed"].includes(r.status),
                ).length,
                url("reclamos", "?status=pending"),
              ],
            ].map(([label, count, href]) => (
              <Link
                className="op-panel admin-counter"
                key={label}
                href={String(href)}
              >
                <span>{label}</span>
                <strong>{count}</strong>
                <span>Revisar bandeja →</span>
              </Link>
            ))}
          </div>
        )}
        {section === "operadores" && (
          <>
            <nav className="admin-tabs">
              <Link href={url("operadores")}>Registrados</Link>
              <Link href={url("operadores", "?tab=postulaciones")}>
                Postulaciones
              </Link>
            </nav>
            <form className="admin-filters">
              <input type="hidden" name="tab" value={p.tab ?? ""} />
              <label>
                Buscar empresa
                <input name="q" defaultValue={p.q} />
              </label>
              <button className="op-button secondary">Buscar</button>
            </form>
            <table className="op-table">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Estado</th>
                  <th>Adjudicadas / activas / completadas</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {data.operators
                  .filter(
                    (o) =>
                      (p.tab === "postulaciones"
                        ? !["approved", "suspended"].includes(
                            o.verification_status,
                          )
                        : ["approved", "suspended"].includes(
                            o.verification_status,
                          )) &&
                      (!p.status || o.application_state === p.status) &&
                      o.company_name
                        .toLowerCase()
                        .includes((p.q ?? "").toLowerCase()),
                  )
                  .map((o) => {
                    const s = stats(o.user_id, "operator");
                    return (
                      <tr key={o.user_id}>
                        <td>{o.company_name}</td>
                        <td>
                          {tag(
                            o.verification_status === "suspended"
                              ? "suspended"
                              : o.application_state,
                          )}
                        </td>
                        <td>
                          {s.total} / {s.active} / {s.done}
                        </td>
                        <td>
                          <Link
                            href={url(
                              "operadores",
                              `?tab=${p.tab ?? ""}&id=${o.user_id}`,
                            )}
                          >
                            Abrir ficha →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {selected && (
              <article className="op-panel">
                <h2>{selected.company_name}</h2>
                <p>
                  CUIT: {selected.tax_id} · {selected.description}
                </p>
                <p>{selected.application_note}</p>
                {application && (
                  <section className="op-panel">
                    <h3>Alcance declarado</h3>
                    <p>
                      {application.origin} → {application.destination}
                    </p>
                    <p>
                      Modalidades:{" "}
                      {application.modes
                        .map(
                          (m) =>
                            ({
                              air: "Aéreo",
                              sea: "Marítimo",
                              consolidated: "Consolidado",
                            })[m] ?? m,
                        )
                        .join(" · ")}
                    </p>
                    <p>
                      Servicios:{" "}
                      {application.services
                        .map(
                          (s) =>
                            ({
                              international_transport:
                                "Transporte internacional",
                              origin_handling: "Gestión en origen",
                              customs_coordination: "Coordinación aduanera",
                              destination_handling: "Gestión en destino",
                              domestic_delivery: "Entrega nacional",
                              storage: "Almacenamiento",
                              insurance: "Seguro",
                              integrated_service: "Servicio integral",
                              other: "Otro",
                            })[s] ?? s,
                        )
                        .join(" · ")}
                    </p>
                    <h4>Comprobaciones del sistema</h4>
                    <p>
                      Correo:{" "}
                      {application.system_checks.email_confirmed
                        ? "Confirmado"
                        : "Pendiente"}{" "}
                      · Formato de CUIT:{" "}
                      {application.system_checks.cuit_format
                        ? "Válido"
                        : "Pendiente"}
                    </p>
                    <p>
                      Inscripción o identidad en registros externos: no
                      verificada automáticamente. La decisión manual queda
                      identificada con responsable, fecha y motivo.
                    </p>
                  </section>
                )}
                <DocList data={data} ids={docs(selected.user_id)} demo={demo} />
                {["approved", "suspended"].includes(
                  selected.verification_status,
                ) ? (
                  <>
                    <Link
                      href={url("operaciones", "?operator=" + selected.user_id)}
                    >
                      Ver todas sus operaciones
                    </Link>{" "}
                    ·{" "}
                    <Link
                      href={url("reclamos", "?operator=" + selected.user_id)}
                    >
                      Ver reclamos
                    </Link>
                  </>
                ) : (
                  <AdminForm demo={demo}>
                    <Meta command="operator" id={selected.user_id} />
                    {["identity", "company", "documents"].map((k, i) => (
                      <label key={k}>
                        <input type="checkbox" name={k} />
                        {
                          [
                            "Identidad cotejada",
                            "Datos de empresa cotejados",
                            "Documentación vigente revisada",
                          ][i]
                        }
                      </label>
                    ))}
                    <Choices />
                    <Reason />
                  </AdminForm>
                )}
                <h3>Historial de decisiones</h3>
                {data.decisions
                  .filter((d) => d.entity_id === selected.user_id)
                  .map((d) => (
                    <p key={d.id}>
                      {date(d.created_at)} · {name(d.actor_id)} · {d.reason}
                    </p>
                  ))}
              </article>
            )}
          </>
        )}
        {section === "operaciones" && (
          <>
            <form className="admin-filters">
              <label>
                ID de operación
                <input name="q" defaultValue={p.q} />
              </label>
              <label>
                Operador
                <select name="operator" defaultValue={p.operator ?? ""}>
                  <option value="">Todos</option>
                  {data.operators.map((o) => (
                    <option key={o.user_id} value={o.user_id}>
                      {o.company_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Etapa
                <select name="phase" defaultValue={p.phase ?? ""}>
                  <option value="">Todas</option>
                  {Object.entries(phaseLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <input
                  name="claims"
                  type="checkbox"
                  defaultChecked={p.claims === "on"}
                />
                Con reclamos
              </label>
              <button className="op-button secondary">Filtrar</button>
            </form>
            <table className="op-table">
              <thead>
                <tr>
                  <th>Operación / importador</th>
                  <th>Ruta y etapa</th>
                  <th>Último hito</th>
                  <th>Atención</th>
                </tr>
              </thead>
              <tbody>
                {data.operations
                  .filter(
                    (o) =>
                      (!p.operator || o.operator_id === p.operator) &&
                      (!p.phase || o.phase === p.phase) &&
                      (!p.q ||
                        (o.public_code ?? o.id)
                          .toLowerCase()
                          .includes(p.q.toLowerCase()) ||
                        o.id.includes(p.q)) &&
                      (!p.claims ||
                        data.claims.some((t) => t.operation_id === o.id)),
                  )
                  .map((o) => {
                    const c = data.cargos.find((c) => c.id === o.cargo_id),
                      e = data.events.find((e) => e.operation_id === o.id),
                      claim = data.claims.some(
                        (t) =>
                          t.operation_id === o.id &&
                          !["resolved", "closed"].includes(t.status),
                      );
                    return (
                      <tr key={o.id}>
                        <td>
                          <Link href={url("operaciones", "?id=" + o.id)}>
                            {o.public_code ?? o.id.slice(0, 8)} →
                          </Link>
                          <p>{name(o.importer_id)}</p>
                        </td>
                        <td>
                          {c?.origin} → {c?.destination}
                          <p>
                            {operationStage(
                              data,
                              o,
                              phaseLabels[
                                o.phase as keyof typeof phaseLabels
                              ] ?? o.phase,
                            )}
                          </p>
                        </td>
                        <td>
                          {e?.title ?? "Sin hito"}
                          <p>{e && date(e.occurred_at)}</p>
                        </td>
                        <td>
                          {tag(claim ? "open" : "active")}
                          {claim
                            ? "Reclamo pendiente"
                            : "Sin reclamos abiertos"}
                          <p>
                            <strong>{operationTask(data, o).label}</strong> ·{" "}
                            {operationTask(data, o).owner}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {data.operations
              .filter((o) => o.id === p.id)
              .map((o) => (
                <article className="op-panel" key={o.id}>
                  <h2>Ficha de operación · {o.public_code ?? o.id}</h2>
                  <p>
                    Importador: {name(o.importer_id)} · Operador:{" "}
                    {company(o.operator_id)} · Moneda: {o.contract_currency}
                  </p>
                  <h3>Documentación</h3>
                  <DocList
                    data={data}
                    ids={data.documents
                      .filter(
                        (d) =>
                          d.operation_id === o.id || d.cargo_id === o.cargo_id,
                      )
                      .map((d) => d.id)}
                    demo={demo}
                  />
                  <h3>Hitos acreditados</h3>
                  {data.events
                    .filter((e) => e.operation_id === o.id)
                    .map((e) => (
                      <p key={e.id}>
                        {date(e.occurred_at)} · {e.title} · {name(e.created_by)}{" "}
                        · {e.description}
                      </p>
                    ))}
                  <Link href={url("reclamos", "?operation=" + o.id)}>
                    Abrir reclamos relacionados →
                  </Link>
                  <details>
                    <summary>Registrar cierre excepcional</summary>
                    <p>
                      Solo se ofrecen cancelación o fallo con consecuencias
                      contractuales. No se borran hitos ni se cambia el pago.
                    </p>
                    <AdminForm demo={demo}>
                      <Meta command="terminal" id={o.id} />
                      <label>
                        Resultado
                        <select name="phase">
                          <option value="cancelled">Cancelada</option>
                          <option value="failed">No completada</option>
                        </select>
                      </label>
                      <Reason />
                      <label>
                        Consecuencias contractuales
                        <textarea name="consequences" minLength={10} required />
                      </label>
                    </AdminForm>
                  </details>
                </article>
              ))}
          </>
        )}
        {section === "reclamos" && (
          <>
            <form className="admin-filters">
              <label>
                Estado
                <select name="status" defaultValue={p.status ?? ""}>
                  <option value="">Todos</option>
                  <option value="pending">Pendientes de resolución</option>
                  {[
                    "open",
                    "in_progress",
                    "waiting_user",
                    "resolved",
                    "closed",
                  ].map((s) => (
                    <option value={s} key={s}>
                      {labels[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Operador
                <select name="operator" defaultValue={p.operator ?? ""}>
                  <option value="">Todos</option>
                  {data.operators.map((o) => (
                    <option value={o.user_id} key={o.user_id}>
                      {o.company_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Importador
                <select name="importer" defaultValue={p.importer ?? ""}>
                  <option value="">Todos</option>
                  {data.profiles
                    .filter((a) => a.role === "importer")
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.full_name}
                      </option>
                    ))}
                </select>
              </label>
              <button className="op-button secondary">Filtrar</button>
            </form>
            {data.claims
              .filter(
                (t) =>
                  (!p.status ||
                    (p.status === "pending"
                      ? !["resolved", "closed"].includes(t.status)
                      : t.status === p.status)) &&
                  (!p.operator || t.operator_id === p.operator) &&
                  (!p.operation || t.operation_id === p.operation) &&
                  (!p.importer ||
                    data.operations.some(
                      (o) =>
                        o.id === t.operation_id && o.importer_id === p.importer,
                    )),
              )
              .map((t) => (
                <article key={t.id} className="op-panel">
                  <h2>{t.subject}</h2>
                  {tag(t.status)}
                  <p>
                    Presentado por{" "}
                    {t.opened_by ? name(t.opened_by) : company(t.operator_id)} ·{" "}
                    {date(t.created_at)} · {t.category}
                  </p>
                  {t.operation_id && (
                    <Link href={url("operaciones", "?id=" + t.operation_id)}>
                      Ver operación vinculada →
                    </Link>
                  )}
                  <DocList
                    data={data}
                    ids={data.documents
                      .filter((d) => d.support_ticket_id === t.id)
                      .map((d) => d.id)}
                    demo={demo}
                  />
                  {data.messages
                    .filter((m) => m.ticket_id === t.id)
                    .map((m) => (
                      <p key={m.id}>
                        {name(m.sender_id)} · {date(m.created_at)}: {m.body}
                      </p>
                    ))}
                  {["resolved", "closed"].includes(t.status) ? (
                    <p>Resolución: {t.resolution}</p>
                  ) : (
                    <AdminForm demo={demo}>
                      <Meta command="claim" id={t.id} />
                      <label>
                        Consecuencia al resolver
                        <select name="resolution_policy">
                          <option value="resume">
                            Continuar el servicio; mantener la condición de
                            entrega
                          </option>
                          <option value="release_test">
                            Liberar en prueba después de entrega confirmada
                          </option>
                          <option value="refund_test">
                            Registrar reintegro en prueba, sin ordenar
                            devolución al proveedor
                          </option>
                        </select>
                      </label>
                      <label>
                        Responsable
                        <select
                          name="responsible"
                          defaultValue={t.assigned_to ?? data.actor}
                        >
                          {data.profiles
                            .filter((a) => a.role === "admin")
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.full_name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        Próximo estado
                        <select name="status">
                          <option value="in_progress">En revisión</option>
                          <option value="waiting_user">
                            Pedir información
                          </option>
                          <option value="resolved">Resolver</option>
                          <option value="closed">Cerrar</option>
                        </select>
                      </label>
                      <Reason />
                    </AdminForm>
                  )}
                </article>
              ))}
          </>
        )}
        {section === "importadores" && (
          <>
            <p>
              Alta individual de identidades existentes de Auth. No duplica
              usuarios. Las invitaciones por correo requieren configurar el
              servicio de Auth del entorno separado.
            </p>
            <table className="op-table">
              <thead>
                <tr>
                  <th>Importador</th>
                  <th>Estado</th>
                  <th>Total / activas / completadas</th>
                  <th>Reclamos / reputación</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {data.profiles
                  .filter((a) => a.role === "importer")
                  .map((a) => {
                    const s = stats(a.id, "importer"),
                      ratings = data.ratings.filter(
                        (r) => r.recipient_id === a.id,
                      ),
                      claims = data.claims.filter(
                        (t) =>
                          data.operations.some(
                            (o) =>
                              o.id === t.operation_id && o.importer_id === a.id,
                          ) && !["resolved", "closed"].includes(t.status),
                      );
                    return (
                      <tr key={a.id}>
                        <td>{a.full_name}</td>
                        <td>{tag(a.importer_access_status)}</td>
                        <td>
                          {s.total} / {s.active} / {s.done}
                        </td>
                        <td>
                          <Link href={url("reclamos", "?importer=" + a.id)}>
                            {claims.length} abiertos
                          </Link>
                          <p>
                            {ratings.length
                              ? (
                                  ratings.reduce((n, r) => n + r.score, 0) /
                                  ratings.length
                                ).toFixed(1) +
                                " / 5 · promedio de " +
                                ratings.length +
                                " evaluaciones"
                              : "Sin calificaciones"}
                          </p>
                        </td>
                        <td>
                          {a.importer_access_status !== "active" && (
                            <AdminForm demo={demo} label="Dar de alta">
                              <Meta command="activate" id={a.id} />
                              <Reason />
                            </AdminForm>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </>
        )}
        {section === "perfil" && (
          <article className="op-panel">
            <h2>{name(data.actor)}</h2>
            <p>Rol: Administración</p>
            <p>
              Teléfono:{" "}
              {data.profiles.find((a) => a.id === data.actor)?.phone ??
                "Sin informar"}
            </p>
            <Link href={demo ? "/demo/acceso" : "/perfil"}>
              Acciones de cuenta →
            </Link>
          </article>
        )}
      </section>
    </main>
  );
}
