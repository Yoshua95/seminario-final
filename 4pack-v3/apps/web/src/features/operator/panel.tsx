import { OperationRow } from "./operation-row";
import { Drawer } from "./drawer";
import { OffersList } from "./offers-list";
import { Collections } from "./collections";
import { nextOperationStep, isProviderTest } from "./journey";
import { CapacityView } from "../capacity/view";
import { CommercialEditor } from "./commercial-editor";
import { QuoteTerms } from "@/features/marketplace/quote-terms";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  documentTypes,
  milestoneTypes,
  operationTransitions,
  phaseLabels,
  reputation,
} from "@4pack/domain";
import { loadSnapshot } from "./data";
import { isVercelPreview } from "./demo-environment.mjs";
import { OperatorShell } from "./shell";
import {
  ActionForm,
  OfferForm,
  DocumentButton,
  LiveUpdates,
  MarkRead,
  MessageList,
} from "./forms";
import { Badge, Hazmat, Icon, Empty, Fact, PageHeader } from "./ui";
import type { Snapshot, Cargo, Section } from "./types";
import {
  code,
  date,
  money,
  number,
  localDateTime,
  modeLabel,
  sections,
} from "./types";
export type Search = Record<string, string | string[] | undefined>;
const val = (search: Search, key: string) =>
  typeof search[key] === "string" ? (search[key] as string) : "";
const basePath = (demo: boolean) => (demo ? "/demo/operador" : "/operador");
function cargoById(data: Snapshot, id: string) {
  return data.cargos.find((c) => c.id === id);
}
function RatingCard({ average, count }: { average: number | null; count: number }) {
  return (
    <div className="op-reputation">
      <div className="op-icon-box">
        <Icon name="profile" />
      </div>
      <div>
        <strong>Reputación del Importador</strong>
        <small>Identidad protegida hasta la adjudicación</small>
      </div>
      <span className="op-score">
        <Icon name="star" />
        {count === 0 ? "Sin historial" : number(average ?? 0)}
      </span>
      <div>
        <small>Calificaciones:</small>
        <strong>{count}</strong>
      </div>
    </div>
  );
}
function Manifest({
  cargo,
  children,
}: {
  cargo: Cargo;
  children?: React.ReactNode;
}) {
  return (
    <section className="op-panel op-manifest">
      <div className="op-panel-heading">
        <div className="op-icon-box">
          <Icon name="lock" />
        </div>
        <div>
          <h2>{cargo.title}</h2>
          <p>Manifiesto declarado para licitación internacional</p>
        </div>
        <span className="op-badge mono">#{code(cargo)}</span>
      </div>
      <div className="op-facts">
        <Fact label="Modalidad solicitada">{modeLabel(cargo.preferred_mode)}</Fact>
        <Fact icon="pin" label="Origen de Carga">
          {cargo.origin}
        </Fact>
        <Fact icon="pin" label="Destino">
          {cargo.destination}
        </Fact>
        <Fact icon="cargo" label="Categoría Arancelaria">
          {cargo.category}
        </Fact>
        <Fact icon="weight" label="Peso Neto Bruto">
          {Number(cargo.weight_kg).toLocaleString("es-AR")} kg
        </Fact>
        <Fact icon="volume" label="Volumen Métrico">
          {cargo.volume_m3===null?'Por confirmar':`${number(cargo.volume_m3, 2)} m³`}
        </Fact>
        <Fact icon="offers" label="Unidades / Bultos">
          {cargo.units_description || `${cargo.packages} bultos`}
        </Fact>
      </div>
      <div className="op-declared">
        <span className="op-caption">
          DESCRIPCIÓN DECLARADA POR EL IMPORTADOR:
        </span>
        <p>“{cargo.description}”</p>
      </div>
      <RatingCard
        average={cargo.reputation.average}
        count={cargo.reputation.count}
      />
      {cargo.hazmat_review_required && (
        <div className="op-notice warning">
          <Icon name="shield" />
          <div>
            <strong>
              Restricción de Transporte: Mercancía Clasificada Peligrosa
            </strong>
            <p>
              Esta carga requiere documentación técnica respaldatoria para el
              flete internacional. Revisá la hoja MSDS y los requisitos de
              transporte.
            </p>
          </div>
        </div>
      )}
      <details className="op-extra-details">
        <summary>
          Fechas, modalidad y restricciones <Icon name="arrow" />
        </summary>
        <Fact label="Modalidad preferida">
          {modeLabel(cargo.preferred_mode)}
        </Fact>
        <Fact label="Publicación">{date(cargo.created_at)}</Fact>
        <Fact label="Cierre de licitación">{date(cargo.bidding_deadline)}</Fact>
        <Fact label="Estado">
          <Badge status={cargo.status} />
        </Fact>
        <Fact label="Documentación requerida">
          {cargo.required_documents.join(" · ") ||
            "Sin requisitos adicionales declarados"}
        </Fact>
        <Fact label="Restricciones operativas">
          {cargo.restrictions || "Sin restricciones adicionales declaradas"}
        </Fact>
        <Fact label="Operaciones previas del importador">
          {cargo.reputation.completed}
        </Fact>
      </details>
      {children}
    </section>
  );
}
function Opportunities({
  data,
  demo,
  id,
  search,
}: {
  data: Snapshot;
  demo: boolean;
  id?: string;
  search: Search;
}) {
  const query = val(search, "q").toLocaleLowerCase("es");
  const cargos = data.cargos
    .filter(
      (c) =>
        c.status === "open" &&
        (!c.bidding_deadline || Date.parse(c.bidding_deadline) > Date.now()),
    )
    .filter(
      (c) =>
        (!query ||
          `${c.public_code} ${c.origin} ${c.title}`
            .toLocaleLowerCase("es")
            .includes(query)) &&
        (!val(search, "category") || c.category === val(search, "category")) &&
        (!val(search, "mode") || c.preferred_mode === val(search, "mode")) &&
        (!val(search, "hazmat") ||
          c.hazmat_review_required === (val(search, "hazmat") === "yes")) &&
        (!val(search, "minWeight") ||
          Number(c.weight_kg) >= Number(val(search, "minWeight"))) &&
        (!val(search, "maxWeight") ||
          Number(c.weight_kg) <= Number(val(search, "maxWeight"))) &&
        (!val(search, "closes") ||
          (!!c.bidding_deadline &&
            localDateTime(new Date(c.bidding_deadline)).slice(0, 10) <=
              val(search, "closes"))),
    );
  const selected = id ? cargos.find((c) => c.id === id) : cargos[0];
  if (id && !data.cargos.some((c) => c.id === id)) notFound();
  const base = basePath(demo);
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(search))
    if (typeof v === "string" && v) params.set(k, v);
  const suffix = params.size ? `?${params}` : "";
  return (
    <div className="op-market-layout">
      <div className="op-market-main">
        <PageHeader
          title="Cargas disponibles"
          description="Revisá la carga y prepará una oferta en ARS. La ficha permanece visible mientras cotizás."
          action={
            <span className="op-blind-label">
              <Icon name="eye" />
              Licitación Ciega Activa
            </span>
          }
        />
        <details className="op-filters" open={params.size > 0}>
          <summary>
            <Icon name="volume" /> Filtrar oportunidades{" "}
            <span>{params.size > 0 ? "Filtros activos" : ""}</span>
          </summary>
          <form
            method="get"
            action={`${base}/oportunidades`}
            className="op-filter-grid"
          >
            <label>
              Origen, depósito o identificador
              <input
                name="q"
                placeholder="Buscar carga…"
                defaultValue={val(search, "q")}
              />
            </label>
            <label>
              Categoría
              <select name="category" defaultValue={val(search, "category")}>
                <option value="">Todas</option>
                {[...new Set(data.cargos.map((c) => c.category))].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Modalidad
              <select name="mode" defaultValue={val(search, "mode")}>
                <option value="">Todas</option>
                <option value="air">Aéreo</option>
                <option value="sea">Marítimo</option>
                <option value="consolidated">Consolidado</option>
              </select>
            </label>
            <label>
              Mercancía peligrosa
              <select name="hazmat" defaultValue={val(search, "hazmat")}>
                <option value="">Todas</option>
                <option value="yes">Con HAZMAT</option>
                <option value="no">Carga general</option>
              </select>
            </label>
            <label>
              Peso mínimo (kg)
              <input
                type="number"
                name="minWeight"
                min="0"
                defaultValue={val(search, "minWeight")}
              />
            </label>
            <label>
              Peso máximo (kg)
              <input
                type="number"
                name="maxWeight"
                min="0"
                defaultValue={val(search, "maxWeight")}
              />
            </label>
            <label>
              Cierre hasta
              <input
                type="date"
                name="closes"
                defaultValue={val(search, "closes")}
              />
            </label>
            <div className="op-filter-actions">
              <button className="op-button secondary">Aplicar filtros</button>
              <Link href={`${base}/oportunidades`} className="op-text-link">
                Limpiar
              </Link>
            </div>
          </form>
        </details>
        <section className="op-cargo-list">
          <h2 className="op-caption">
            CARGAS DISPONIBLES EN MESA ({cargos.length})
          </h2>
          {cargos.map((c) => (
            <Link
              className={`op-cargo-row ${selected?.id === c.id ? "selected" : ""}`}
              href={`${base}/oportunidades/${c.id}${suffix}`}
              key={c.id}
              aria-current={selected?.id === c.id ? "page" : undefined}
            >
              <span className="op-icon-box">
                <Icon name="lock" />
              </span>
              <div className="op-cargo-copy">
                <div>
                  <strong className="mono">#{code(c)}</strong>
                  <span> • {c.category}</span>
                </div>
                <p>
                  {c.origin} → {c.destination} · {c.title} —{" "}
                  {Number(c.weight_kg).toLocaleString("es-AR")} kg /{" "}
                  {c.volume_m3===null?'Volumen por confirmar':`${number(c.volume_m3, 2)} m³`}
                </p>
              </div>
              <div className="op-cargo-tags">
                {c.hazmat_review_required && <Hazmat />}
                <span
                  className={`op-badge mono ${selected?.id === c.id ? "selected" : ""}`}
                >
                  {selected?.id === c.id ? "Auditando" : "Ver Carga"}
                </span>
              </div>
            </Link>
          ))}
          {cargos.length === 0 && (
            <Empty title="No hay cargas para estos filtros">
              Probá otra búsqueda o volvé a consultar cuando se publiquen nuevas
              oportunidades.
            </Empty>
          )}
        </section>
        {selected && (
          <Manifest cargo={selected}>
            {data.documents.filter((d) => d.cargo_id === selected.id).length >
              0 && (
              <div className="op-linked-docs">
                <h3>Documentación disponible</h3>
                {data.documents
                  .filter((d) => d.cargo_id === selected.id)
                  .map((d) => (
                    <div className="op-document-inline" key={d.id}>
                      <span>{d.document_type}</span>
                      <DocumentButton demo={demo} document={d} />
                    </div>
                  ))}
              </div>
            )}
          </Manifest>
        )}
      </div>
      {selected && (
        <OfferForm
          capacity={data.capacity}
          key={selected.id}
          demo={demo}
          cargo={selected}
          alreadyOffered={data.offers.some(
            (o) =>
              o.cargo_id === selected.id &&
              ["submitted", "accepted"].includes(o.status),
          )}
        />
      )}
    </div>
  );
}
function Offers(props: {data:Snapshot;demo:boolean;search:Search}) { return <OffersList {...props}/>; }
function Operations({
  data,
  demo,
  id,
  search,
}: {
  data: Snapshot;
  demo: boolean;
  id?: string;
  search: Search;
}) {
  const base = basePath(demo);
  const active = data.operations.filter(
    (o) => !["completed", "cancelled", "failed"].includes(o.phase),
  );
  const filtered = (val(search,"estado")==="completed" ? data.operations.filter(o=>o.phase==="completed") : active).filter(
    (o) => !val(search, "estado") || o.phase === val(search, "estado"),
  );
  if (!id)
    return (
      <>
        <PageHeader
          title="Operaciones Adjudicadas"
          description="Gestioná los servicios confirmados, sus documentos y el avance de cada envío."
        />
        <div className="op-summary-grid" aria-label="Resumen de operaciones">
          <section className="op-panel">
            <strong>{active.length}</strong>
            <p>Operaciones activas</p>
          </section>
          <section className="op-panel">
            <strong>
              {active.filter((o) => o.phase === "in_progress").length}
            </strong>
            <p>En tránsito</p>
          </section>
          <section className="op-panel">
            <strong>
              {active.filter((o) => o.phase === "disputed").length}
            </strong>
            <p>Requieren atención</p>
          </section>
        </div>
        <form className="op-search-bar" method="get">
          <label>
            Estado de operación
            <select name="estado" defaultValue={val(search, "estado")}>
              <option value="">Todos los estados activos</option>
              {Object.entries(phaseLabels)
                .filter(([key]) => !["cancelled", "failed"].includes(key))
                .map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
            </select>
          </label>
          <button className="op-button secondary">Filtrar operaciones</button>
          <Link href={`${base}/operaciones`} className="op-text-link">
            Limpiar
          </Link>
        </form>
        <div className="op-stack">
          {filtered.map(o=><OperationRow key={o.id} data={data} id={o.id} base={base}/>)}
          {filtered.length === 0 && (
            <Empty title="Sin operaciones activas">
              Tus ofertas adjudicadas aparecerán acá.
            </Empty>
          )}
        </div>
      </>
    );
  const operation = data.operations.find((o) => o.id === id);
  if (!operation) notFound();
  const cargo = cargoById(data, operation.cargo_id);
  const offer = data.offers.find((o) => o.id === operation.accepted_offer_id);
  const guarantee = data.guarantees.find((g) => g.operation_id === id);
  const documents = data.documents.filter((d) => d.operation_id === id);
  const events = data.events.filter((e) => e.operation_id === id);
  const next = operationTransitions[operation.phase].filter(
    (p) => !["disputed", "cancelled", "confirmed", "completed", "failed"].includes(p),
  );
  return (
    <>
      <Link className="op-back" href={`${base}/operaciones`}>
        ← Volver a operaciones
      </Link>
      <PageHeader
        title={`${cargo?.origin ?? "Origen"} → ${cargo?.destination ?? "Destino"}`}
        description={`#${code(operation)} · ${cargo?.title ?? "Operación"}`}
        action={<Badge status={operation.phase} />}
      />
      <section className="op-panel op-next-step"><div><p className="op-caption">PRÓXIMO PASO</p><h2>{nextOperationStep(operation.phase, guarantee?.status === "held_simulated")}</h2></div><a href="#registrar-hito" className="op-button secondary">Ver acciones de esta operación</a></section>
      <div className="op-operation-layout">
        <div className="op-stack">
          <section className="op-panel">
            <div className="op-panel-heading">
              <Icon name="history" />
              <h2>Línea de tiempo de la operación</h2>
            </div>
            <div className="op-timeline">
              {events.map((e) => (
                <article
                  key={e.id}
                  className={e.event_type === "Incidencia" ? "incident" : ""}
                >
                  <span className="op-timeline-dot" />
                  <time>{date(e.occurred_at)}</time>
                  <h3>
                    {e.title.startsWith("Estado: ")
                      ? `Estado: ${phaseLabels[e.event_type as keyof typeof phaseLabels] ?? "Actualizado"}`
                      : e.title}
                  </h3>
                  <p>{e.description}</p><small>Responsable: {e.created_by === data.profile.id ? data.profile.full_name : e.created_by === operation.importer_id ? operation.importer_name : e.created_by ? `Cuenta ${e.created_by}` : "No informado en el registro histórico"}</small>
                  <small>
                    <Icon name="pin" />
                    {e.location || "Sin ubicación informada"}
                  </small>
                  {e.attachment_id &&
                    documents.find((d) => d.id === e.attachment_id) && (
                      <DocumentButton
                        demo={demo}
                        document={documents.find(
                          (d) => d.id === e.attachment_id,
                        )!}
                      />
                    )}
                </article>
              ))}
            </div>
          </section>
          {!["completed", "cancelled", "failed"].includes(operation.phase) && (
            <section className="op-panel" id="registrar-hito">
              <h2>Registrar hito</h2>
              <p className="op-small">
                Los hitos publicados quedan auditados y no se editan. No
                sustituyen una transición de estado.
              </p>
              <ActionForm
                demo={demo}
                command="milestone"
                label="Publicar hito"
                reset
              >
                <input type="hidden" name="id" value={id} />
                <div className="op-form-grid">
                  <label>
                    Tipo de evento
                    <select name="event_type" required>
                      {milestoneTypes.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Fecha y hora
                    <input
                      type="datetime-local"
                      name="occurred_at"
                      step="1"
                      required
                      defaultValue={localDateTime()}
                    />
                  </label>
                  <label>
                    Ubicación
                    <input
                      name="location"
                      maxLength={300}
                      placeholder="Depósito, ciudad o terminal"
                    />
                  </label>
                  <label>
                    Comprobante adjunto
                    <select name="attachment_id">
                      <option value="">Sin adjunto</option>
                      {documents.map((d) => (
                        <option value={d.id} key={d.id}>
                          {d.original_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="op-wide">
                    Descripción
                    <textarea
                      name="description"
                      minLength={3}
                      maxLength={2000}
                      required
                      placeholder="Describí lo ocurrido…"
                    />
                  </label>
                </div>
              </ActionForm>
            </section>
          )}
          <Drawer label="Enviar mensaje" title="Chat de esta operación" initialOpen={val(search,"panel")==="chat"} wide><section className="op-panel op-chat">
            <div className="op-chat-header">
              <span className="op-avatar">
                {operation.importer_name?.slice(0, 2).toUpperCase() || "IM"}
              </span>
              <div>
                <h2>{operation.importer_name || "Importador"}</h2>
                <p>Conversación privada de la operación</p>
              </div>
              <LiveUpdates demo={demo} operationId={id} />
            </div>
            <MessageList>
              {data.messages
                .filter((m) => m.operation_id === id)
                .map((m) => (
                  <article
                    key={m.id}
                    className={`op-message ${m.sender_id === data.profile.id ? "mine" : ""}`}
                  >
                    <small>
                      {m.sender_id === data.profile.id
                        ? "Vos"
                        : m.sender_name || "Importador"}{" "}
                      · {date(m.created_at)}
                    </small>
                    <p>{m.body}</p>
                  </article>
                ))}
              {!data.messages.some((m) => m.operation_id === id) && (
                <Empty title="Iniciá la conversación">
                  Los mensajes quedan asociados a esta operación.
                </Empty>
              )}
            </MessageList>
            <ActionForm
              demo={demo}
              command="message"
              label="Enviar mensaje"
              reset
              className="op-message-form"
            >
              <input type="hidden" name="id" value={id} />
              <label className="sr-only" htmlFor="operation-message">
                Mensaje
              </label>
              <textarea
                id="operation-message"
                name="body"
                placeholder="Escribí un mensaje para el importador…"
                required
                maxLength={2000}
                rows={2}
              />
            </ActionForm>
            <MarkRead demo={demo} id={id} />
          </section></Drawer>
        </div>
        <aside className="op-stack">
          {operation.phase === "completed" && (
            <section className="op-panel">
              <h2>Evaluar al importador</h2>
              {data.ratings.some(
                (r) => r.operation_id === id && r.author_id === data.profile.id,
              ) ? (
                <p>Tu evaluación del importador está registrada.</p>
              ) : (
                <ActionForm demo={demo} command="rating" label="Enviar evaluación al importador">
                  <input type="hidden" name="id" value={id} />
                  <label>
                    Puntaje
                    <select name="score">
                      {[5, 4, 3, 2, 1].map((n) => <option key={n}>{n}</option>)}
                    </select>
                  </label>
                  <label>
                    Comentario
                    <textarea name="comment" maxLength={500} />
                  </label>
                </ActionForm>
              )}
            </section>
          )}
          <section className="op-panel">
            <h2>Resumen contractual</h2>
            <Fact label="Importador">{operation.importer_name}</Fact>
            <Fact label="Contacto autorizado">
              {operation.importer_phone ? (
                <a href={`tel:${operation.importer_phone}`}>
                  {operation.importer_phone}
                </a>
              ) : (
                "El importador no informó un teléfono. Usá la mensajería privada de esta operación o contactá a soporte."
              )}
            </Fact>
            <Fact label="Modalidad">{modeLabel(offer?.mode ?? null)}</Fact>
            <Drawer label="Ver contrato" title={`Contrato · ${code(operation)}`} wide><h3>{cargo?.origin} → {cargo?.destination}</h3><QuoteTerms quote={data.contracts.find(c=>c.operation_id===operation.id)?.content?.quote??null} /></Drawer>
            <Fact label="Precio acordado">{money(offer?.total_usd ?? 0, offer?.payment_currency ?? "USD")}</Fact>
            <Fact label={isProviderTest(operation)?"Pago de prueba":"Garantía simulada"}>
              {isProviderTest(operation) ? <span>{data.paymentsUnavailable?"Verificación no disponible":data.payments?.some(p=>p.operation_id===id&&p.status==="approved")?"Aprobado · verificado por backend":"Pendiente de pago verificado"}</span> : <Badge status={guarantee?.status ?? "pending"} />}
            </Fact>
            <Fact label="Comisión 4PACK">
              {money(guarantee?.commission_usd ?? 0, guarantee?.currency ?? "USD")}
            </Fact>
            <Fact label="Adjudicación">{date(operation.awarded_at)}</Fact>
            <p className="op-small">
              {isProviderTest(operation)?"Pago de prueba. Liberación por hitos aún no disponible.":"Garantía simulada: no representa fondos custodiados."}
            </p>
          </section>
          <section className="op-panel">
            <h2>Próxima acción requerida</h2>
            {next.length > 0 && guarantee?.status === "held_simulated" ? (
              next.map((p) => (
                <ActionForm
                  demo={demo}
                  command="advance"
                  variant="secondary"
                  key={p}
                  label={
                    p === "awaiting_delivery_confirmation"
                      ? "Marcar como lista para entrega"
                      : `Marcar como ${phaseLabels[p].toLocaleLowerCase("es-AR")}`
                  }
                  confirm
                >
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="phase" value={p} />
                  <label>
                    Observación
                    <input
                      name="description"
                      maxLength={2000}
                      placeholder="Detalle de la transición"
                    />
                  </label>
                  <label>
                    Ubicación
                    <input name="location" maxLength={300} />
                  </label>
                </ActionForm>
              ))
            ) : (
              <p className="op-small">
                {["completed", "cancelled", "failed"].includes(operation.phase)
                  ? "Esta operación está cerrada."
                  : operation.phase === "disputed"
                    ? "La operación requiere intervención del equipo 4PACK."
                    : "Esperando la confirmación de garantía del importador."}
              </p>
            )}
            {operationTransitions[operation.phase].includes("disputed") && (
              <details className="op-dispute">
                <summary>
                  <Icon name="alert" /> Informar disputa
                </summary>
                <ActionForm
                  demo={demo}
                  command="advance"
                  label="Registrar disputa"
                  variant="destructive"
                  confirm
                >
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="phase" value="disputed" />
                  <label>
                    Motivo
                    <textarea
                      name="description"
                      minLength={5}
                      required
                      maxLength={2000}
                    />
                  </label>
                </ActionForm>
              </details>
            )}
          </section>
          <section className="op-panel">
            <h2>Documentación de la operación</h2><p className="op-small">Packing list y factura: el importador aporta los datos de la mercadería. Podés adjuntar el archivo recibido; comprobantes del servicio: operador.</p>
            {[...new Set(["Packing list",...(cargo?.required_documents??[]),...(cargo?.msds_required?["MSDS"]:[])])].map(type=>{const doc=documents.find(d=>d.document_type.toLowerCase()===type.toLowerCase())??data.documents.find(d=>d.cargo_id===cargo?.id&&d.document_type.toLowerCase()===type.toLowerCase());return <div className="op-document-task" key={type}><strong>{type}</strong><small>Responsable: {type==="Comprobante de entrega"?"Operador":"Importador"}</small><span>{doc?<Badge status={doc.validation_status}/>:"Falta adjuntar"}</span></div>;})}
            {documents.map((d) => (
              <div className="op-document-inline" key={d.id}>
                <div>
                  <strong>{d.document_type}</strong>
                  <Badge status={d.validation_status} />
                </div>
                <DocumentButton demo={demo} document={d} />
              </div>
            ))}
            <Link
              href={`${base}/documentos?operacion=${id}&tipo=${encodeURIComponent("Packing list")}`}
              className="op-text-link"
            >
              Subir packing list <Icon name="arrow" />
            </Link>
          </section>
        </aside>
      </div>
    </>
  );
}
function Documents({
  data,
  demo,
  search,
}: {
  data: Snapshot;
  demo: boolean;
  search: Search;
}) {
  const replacing = data.documents.find(
    (d) => d.id === val(search, "reemplazar"),
  );
  const items = data.documents.filter(
    (d) =>
      !d.support_ticket_id &&
      !data.documents.some((v) => v.replaces_id === d.id),
  );
  const versions = (document: Snapshot["documents"][number]) => {
    const history = [];
    const visited = new Set<string>();
    let previous = document.replaces_id;
    while (previous && !visited.has(previous)) {
      visited.add(previous);
      const item = data.documents.find((v) => v.id === previous);
      if (!item) break;
      history.push(item);
      previous = item.replaces_id;
    }
    return history;
  };
  return (
    <>
      <PageHeader
        title="Archivo documental"
        description="Consulta secundaria y carga contextual. La documentación propia se administra desde Perfil empresarial."
      />
      <section className="op-panel">
        <h2>{replacing ? "Reemplazar documento" : "Subir documentación"}</h2>
        {replacing && (
          <p className="op-small">
            Se conservará la versión anterior y su trazabilidad:{" "}
            {replacing.original_name}.
          </p>
        )}
        <ActionForm
          key={replacing?.id ?? "new-document"}
          demo={demo}
          command="document"
          label="Subir documento"
          reset
        >
          <input type="hidden" name="replaces_id" value={replacing?.id ?? ""} />
          <div className="op-form-grid">
            <label>
              Destino
              <select
                name="target_type"
                defaultValue={
                  replacing?.operation_id || val(search, "operacion")
                    ? "operation"
                    : "operator"
                }
              >
                <option value="operator">Documentación empresarial</option>
                {data.operations.length > 0 && (
                  <option value="operation">Operación adjudicada</option>
                )}
              </select>
            </label>
            <label>
              Operación (si corresponde)
              <select
                name="id"
                defaultValue={
                  replacing?.operation_id ?? val(search, "operacion")
                }
              >
                <option value="">Seleccioná una operación</option>
                {data.operations.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{code(o)} · {cargoById(data, o.cargo_id)?.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tipo documental
              <select
                name="document_type"
                defaultValue={replacing?.document_type ?? val(search,"tipo")}
              >
                {documentTypes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Archivo · PDF, JPG o PNG · máx. 10 MB
              <input
                type="file"
                name="file"
                accept="application/pdf,image/jpeg,image/png"
                required
              />
            </label>
          </div>
        </ActionForm>
      </section>
      <div className="op-stack op-section-gap">
        {items.map((d) => (
          <article className="op-panel op-document-row" key={d.id}>
            <span className="op-icon-box">
              <Icon name="offers" />
            </span>
            <div>
              <h3>
                <span className="op-caption">{code(d)}</span> ·{" "}
                {d.original_name}
              </h3>
              <p>
                {d.document_type} ·{" "}
                {d.operation_id
                  ? code(
                      data.operations.find((o) => o.id === d.operation_id) ?? {
                        id: d.operation_id,
                      },
                    )
                  : d.cargo_id
                    ? code(
                        data.cargos.find((c) => c.id === d.cargo_id) ?? {
                          id: d.cargo_id,
                        },
                      )
                    : "Empresa"}{" "}
                ·{" "}
                {d.operator_id
                  ? "Documento empresarial"
                  : d.cargo_id
                    ? "Documento de carga"
                    : "Documento de operación"}
              </p>
              <small>
                {date(d.created_at)} ·{" "}
                {Math.max(1, Math.round(Number(d.size_bytes) / 1024))} KB
              </small>
              <p className="op-small">
                Responsable:{" "}
                {d.uploaded_by === data.profile.id
                  ? data.profile.full_name
                  : d.cargo_id
                    ? "Importador de la carga"
                    : "Participante autorizado"}
              </p>
              {versions(d).length > 0 && (
                <details className="op-version-history">
                  <summary>
                    Historial de versiones ({versions(d).length + 1})
                  </summary>
                  <p>
                    Versión actual: {code(d)} · {date(d.created_at)}
                  </p>
                  {versions(d).map((v) => (
                    <div key={v.id}>
                      <strong>
                        {code(v)} · {v.original_name}
                      </strong>
                      <p>
                        {date(v.created_at)} · {v.document_type}
                      </p>
                      <Badge status={v.validation_status} />
                      {v.rejection_reason && (
                        <p>Motivo: {v.rejection_reason}</p>
                      )}
                      <DocumentButton demo={demo} document={v} />
                    </div>
                  ))}
                </details>
              )}
              {d.rejection_reason && (
                <p className="op-error-text">Motivo: {d.rejection_reason}</p>
              )}
            </div>
            <Badge status={d.validation_status} />
            <DocumentButton demo={demo} document={d} />
            {d.uploaded_by === data.profile.id &&
              d.validation_status !== "approved" && (
                <Link
                  className="op-text-link"
                  href={`${basePath(demo)}/documentos?reemplazar=${d.id}`}
                >
                  Reemplazar
                </Link>
              )}
          </article>
        ))}
        {items.length === 0 && (
          <Empty title="Todavía no hay documentos">
            Subí la documentación de tu empresa o los comprobantes de una
            operación.
          </Empty>
        )}
      </div>
    </>
  );
}
function History({ data, demo }: { data: Snapshot; demo: boolean }) {
  const operations = data.operations.filter((o) =>
    o.phase === "completed" || data.offers.find(f=>f.id===o.accepted_offer_id)?.payment_currency === "USD",
  );
  const scores = data.ratings.filter((r) => r.recipient_id === data.profile.id && data.operations.some(o=>o.id===r.operation_id && o.phase==="completed"));
  const rep = reputation(scores.map((r) => Number(r.score)));
  return (
    <>
      <PageHeader
        title="Historial de Operaciones"
        description="Operaciones cerradas e históricos en USD, conservando moneda e importes originales."
      />
      <div className="op-rank-card">
        <span className="op-icon-box">
          <Icon name="star" />
        </span>
        <div>
          <h2>
            Escala de Reputación 4PACK: <span>Nivel {rep.rank}</span>
          </h2>
          <p>
            La reputación se calcula a partir de calificaciones registradas al
            finalizar tus operaciones.
          </p>
        </div>
        <div className="op-rank-score">
          <strong>
            {rep.count === 0 ? "Sin historial" : number(rep.average ?? 0)} <small>/ 5,0</small>
          </strong>
          <span>
            ({operations.length} operaciones · {rep.count} calificaciones)
          </span>
        </div>
      </div>
      <div
        className="op-table-wrap"
        tabIndex={0}
        role="region"
        aria-label="Historial de operaciones"
      >
        <table className="op-table">
          <thead>
            <tr>
              <th>ID VIAJE / DATOS PAQUETE</th>
              <th>RUTA / CARGA</th>
              <th>MODALIDAD DE COBRO</th>
              <th>ESTADO</th>
              <th>PUNTUACIÓN RECIBIDA</th>
            </tr>
          </thead>
          <tbody>
            {operations.map((o) => {
              const cargo = cargoById(data, o.cargo_id);
              const offer = data.offers.find(
                (f) => f.id === o.accepted_offer_id,
              );
              const rating = scores.find((r) => r.operation_id === o.id);
              return (
                <tr key={o.id}>
                  <td>
                    <Link
                      href={`${basePath(demo)}/operaciones/${o.id}`}
                      className="op-text-link mono"
                    >
                      #{code(o)}
                    </Link>
                    <small>
                      Físico: {cargo?.weight_kg} kg / {cargo?.volume_m3} m³
                    </small>
                    <small>
                      Bultos: {cargo?.packages} · HAZMAT:{" "}
                      {cargo?.hazmat_review_required ? "SÍ" : "NO"}
                    </small>
                  </td>
                  <td>
                    <strong>
                      {cargo?.origin} → {cargo?.destination}
                    </strong>
                    <small>
                      {cargo?.category} · {modeLabel(offer?.mode ?? null)}
                    </small>
                  </td>
                  <td>
                    {offer?.payment_currency ?? "USD"}
                    <small>Cobro simulado</small>
                  </td>
                  <td>
                    <Badge status={o.phase} />
                  </td>
                  <td>
                    <strong className="op-rating">
                      <Icon name="star" />
                      {rating ? number(rating.score) : "Sin calificar"}
                    </strong>
                    <small>
                      {rating?.comment ??
                        "Esperando calificación del importador"}
                    </small>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {operations.length === 0 && (
          <Empty title="Tu historial comienza con la primera entrega" />
        )}
      </div>
    </>
  );
}
function Wallet(props:{data:Snapshot;demo:boolean}) { return <Collections {...props}/>; }
function Support({
  data,
  demo,
  id,
  search,
}: {
  data: Snapshot;
  demo: boolean;
  id?: string;
  search: Search;
}) {
  const base = basePath(demo);
  const tickets = data.tickets.filter(
    (t) => !val(search, "estado") || t.status === val(search, "estado"),
  );
  const selected = id ? data.tickets.find((t) => t.id === id) : tickets[0];
  if (id && !selected) notFound();
  return (
    <>
      <PageHeader
        title="Soporte Técnico Operadores"
        description="Mesa de ayuda directa con el equipo de control de 4PACK."
      />
      <details
        className="op-panel op-new-ticket"
        open={data.tickets.length === 0}
      >
        <summary>
          <Icon name="support" /> Crear un ticket de soporte
        </summary>
        <ActionForm demo={demo} command="ticket" label="Crear ticket" reset>
          <div className="op-form-grid">
            <label>
              Asunto
              <input name="subject" minLength={5} maxLength={150} required />
            </label>
            <label>
              Categoría
              <select name="category">
                <option>Documentación</option>
                <option>Licitaciones</option>
                <option>Operaciones</option>
                <option>Garantías simuladas</option>
                <option>Cuenta</option>
                <option>General</option>
              </select>
            </label>
            <label>
              Prioridad
              <select name="priority">
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </label>
            <label>
              Operación relacionada
              <select name="id">
                <option value="">Sin operación relacionada</option>
                {data.operations.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{code(o)}
                  </option>
                ))}
              </select>
            </label>
            <label className="op-wide">
              Consulta
              <textarea
                name="body"
                required
                minLength={3}
                maxLength={2000}
                placeholder="Contanos qué necesitás resolver…"
              />
            </label>
          </div>
        </ActionForm>
      </details>
      <form className="op-search-bar" method="get">
        <label>
          Estado del ticket
          <select name="estado" defaultValue={val(search, "estado")}>
            <option value="">Todos</option>
            <option value="open">Abierto</option>
            <option value="in_progress">En proceso</option>
            <option value="waiting_user">Espera tu respuesta</option>
            <option value="resolved">Resuelto</option>
            <option value="closed">Cerrado</option>
          </select>
        </label>
        <button className="op-button secondary">Filtrar tickets</button>
      </form>
      <div className="op-support-layout">
        <div className="op-ticket-list">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`${base}/soporte/${t.id}`}
              className={`op-panel ${t.id === selected?.id ? "selected" : ""}`}
            >
              <span className="op-caption">
                #{code(t)} · {t.category}
              </span>
              <h3>{t.subject}</h3>
              <div>
                <Badge status={t.status} />
                <small>
                  {t.priority === "urgent"
                    ? "Urgente"
                    : t.priority === "high"
                      ? "Alta prioridad"
                      : "Prioridad normal"}
                </small>
              </div>
              <small>{date(t.created_at)}</small>
            </Link>
          ))}
        </div>
        {selected ? (
          <section className="op-panel op-chat">
            <div className="op-chat-header">
              <span className="op-avatar brand">4P</span>
              <div>
                <h2>Mesa de Control 4PACK</h2>
                <p>{selected.subject}</p>
              </div>
              <Badge status={selected.status} />
            </div>
            <div className="op-chat-status">
              <Icon name="lock" /> CONVERSACIÓN PRIVADA · #{code(selected)}
            </div>
            <div className="op-ticket-meta">
              <Fact label="Operación relacionada">
                {selected.operation_id ? (
                  <Link href={`${base}/operaciones/${selected.operation_id}`}>
                    {code(
                      data.operations.find(
                        (o) => o.id === selected.operation_id,
                      ) ?? { id: selected.operation_id },
                    )}
                  </Link>
                ) : (
                  "Sin operación relacionada"
                )}
              </Fact>
              <Fact label="Prioridad">
                {selected.priority === "urgent"
                  ? "Urgente"
                  : selected.priority === "high"
                    ? "Alta"
                    : "Normal"}
              </Fact>
            </div>
            <MessageList>
              {data.support_messages
                .filter((m) => m.ticket_id === selected.id)
                .map((m) => (
                  <article
                    className={`op-message ${m.sender_id === data.profile.id ? "mine" : ""}`}
                    key={m.id}
                  >
                    <small>
                      {m.sender_id === data.profile.id ? "Vos" : "Equipo 4PACK"}{" "}
                      · {date(m.created_at)}
                    </small>
                    <p>{m.body}</p>
                  </article>
                ))}
            </MessageList>
            {!["resolved", "closed"].includes(selected.status) ? (
              <ActionForm
                demo={demo}
                command="support_message"
                label="Enviar mensaje"
                reset
                className="op-message-form"
              >
                <input type="hidden" name="id" value={selected.id} />
                <label className="sr-only" htmlFor="support-message">
                  Mensaje a soporte
                </label>
                <textarea
                  id="support-message"
                  aria-label="Mensaje a soporte"
                  name="body"
                  placeholder="Escribí un mensaje para la mesa de ayuda técnica…"
                  required
                  maxLength={2000}
                  rows={2}
                />
              </ActionForm>
            ) : (
              <div className="op-notice success">
                Este ticket está cerrado. Creá uno nuevo si necesitás ayuda.
              </div>
            )}
            <div className="op-ticket-attachments">
              <h3>Adjuntos del ticket</h3>
              {data.documents
                .filter((d) => d.support_ticket_id === selected.id)
                .map((d) => (
                  <div className="op-document-inline" key={d.id}>
                    <div>
                      <strong>
                        {code(d)} · {d.original_name}
                      </strong>
                      <p>{date(d.created_at)}</p>
                    </div>
                    <DocumentButton demo={demo} document={d} />
                  </div>
                ))}
              {!["resolved", "closed"].includes(selected.status) && (
                <details>
                  <summary>Adjuntar un archivo (opcional)</summary>
                  <ActionForm
                    demo={demo}
                    command="document"
                    label="Adjuntar al ticket"
                    reset
                  >
                    <input type="hidden" name="target_type" value="support" />
                    <input type="hidden" name="id" value={selected.id} />
                    <input type="hidden" name="document_type" value="Otro" />
                    <label>
                      Archivo · PDF, JPG o PNG · máx. 10 MB
                      <input
                        name="file"
                        type="file"
                        accept="application/pdf,image/jpeg,image/png"
                        required
                      />
                    </label>
                  </ActionForm>
                </details>
              )}
            </div>
          </section>
        ) : (
          <Empty title="Tu mesa de ayuda está lista">
            Creá un ticket y el equipo 4PACK podrá responder desde su cuenta
            administrativa.
          </Empty>
        )}
      </div>
    </>
  );
}
function Profile({ data, demo }: { data: Snapshot; demo: boolean }) {
  const c = data.operator;
  return (
    <>
      <PageHeader
        title="Perfil Empresarial"
        description="Tu identidad logística, alcance operativo y documentación de validación."
        action={<Badge status={c.verification_status} />}
      />
      <section className="op-panel"><h2>Documentos de tu empresa</h2><p>Certificaciones e identidad empresarial para revisión administrativa.</p><Link className="op-button secondary" href={`${basePath(demo)}/documentos?empresa=1`}>Gestionar documentación empresarial</Link><Link className="op-text-link" href={`${basePath(demo)}/documentos`}>Consultar archivo general</Link></section>
      <CommercialEditor demo={demo} profile={data.commercial} />
      <div className="op-profile-layout">
        <section className="op-panel">
          <h2>Datos de la empresa</h2>
          {c.verification_status === "approved" && (
            <p className="op-small">
              La razón social y el CUIT están validados.{" "}
              <Link className="op-text-link" href={`${basePath(demo)}/soporte`}>
                Solicitar un cambio de datos jurídicos
              </Link>
              .
            </p>
          )}
          <ActionForm demo={demo} command="profile">
            <div className="op-form-grid">
              <label>
                Razón social
                <input
                  name="company_name"
                  defaultValue={c.company_name}
                  readOnly={c.verification_status === "approved"}
                  required
                  minLength={3}
                  maxLength={150}
                />
              </label>
              <label>
                CUIT
                <input
                  name="tax_id"
                  defaultValue={c.tax_id}
                  readOnly={c.verification_status === "approved"}
                  required
                  minLength={7}
                  maxLength={30}
                />
              </label>
              <label>
                Nombre comercial
                <input
                  name="trade_name"
                  defaultValue={c.trade_name}
                  maxLength={150}
                />
              </label>
              <label>
                Responsable
                <input
                  name="full_name"
                  defaultValue={data.profile.full_name}
                  required
                  minLength={3}
                  maxLength={150}
                />
              </label>
              <label>
                Correo de acceso
                <input
                  readOnly
                  value={data.profile.email ?? ""}
                  aria-label="Correo de acceso"
                />
              </label>
              <label>
                Teléfono
                <input
                  name="phone"
                  defaultValue={data.profile.phone ?? ""}
                  maxLength={60}
                />
              </label>
              <label>
                Dirección
                <input
                  name="address"
                  defaultValue={c.address}
                  maxLength={300}
                />
              </label>
              <label className="op-wide">
                Descripción
                <textarea
                  name="description"
                  defaultValue={c.description}
                  maxLength={2000}
                />
              </label>
              <fieldset className="op-wide">
                <legend>Modalidades ofrecidas</legend>
                <div className="op-checkboxes">
                  {["air", "sea"].map((m) => (
                    <label key={m}>
                      <input
                        type="checkbox"
                        name="modes"
                        value={m}
                        defaultChecked={c.modes.includes(m)}
                      />
                      {modeLabel(m)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="op-wide">
                Rutas
                <input name="routes" defaultValue={c.routes} maxLength={500} />
              </label>
              <label className="op-wide">
                Certificaciones
                <textarea
                  name="certifications"
                  defaultValue={c.certifications}
                  maxLength={1000}
                />
              </label>
            </div>
          </ActionForm>
        </section>
        <aside className="op-stack">
          <section className="op-panel">
            <span className="op-avatar large">
              {c.company_name.slice(0, 2).toUpperCase()}
            </span>
            <h2>{c.company_name}</h2>
            <Fact label="Cuenta">Operador logístico</Fact>
            <Fact label="Estado">
              <Badge status={c.verification_status} />
            </Fact>
            <Fact label="Reputación">
              <span>
                <Icon name="star" /> {data.ratings.some(r=>r.recipient_id===data.profile.id) ? number(c.rating) : "Sin historial"} / 5
              </span>
            </Fact>
            <Fact label="Operaciones finalizadas">
              {c.completed_operations}
            </Fact>
            <Fact label="Fecha de alta">{date(data.profile.created_at)}</Fact>
            <p className="op-small">
              El rol, la aprobación y la reputación son administrados por 4PACK.
              Tu sesión está asociada al correo con el que ingresaste.
            </p>
            {c.rejection_reason && (
              <div className="op-notice danger">{c.rejection_reason}</div>
            )}
          </section>
          <section className="op-panel">
            <h2>Checklist documental</h2>
            <p className="op-small">
              La aprobación de cada archivo corresponde al equipo 4PACK.
            </p>
            {[
              "Credencial del operador",
              ...new Set(
                data.documents
                  .filter(
                    (d) =>
                      d.operator_id === data.profile.id &&
                      !data.documents.some((v) => v.replaces_id === d.id),
                  )
                  .map((d) => d.document_type)
                  .filter((type) => type !== "Credencial del operador"),
              ),
            ].map((type) => {
              const doc = data.documents.find(
                (d) =>
                  d.operator_id === data.profile.id &&
                  d.document_type === type &&
                  !data.documents.some((v) => v.replaces_id === d.id),
              );
              return (
                <div className="op-document-inline" key={type}>
                  <div>
                    <strong>{type}</strong>
                    <p>{doc ? code(doc) : "Falta presentar"}</p>
                    {doc?.rejection_reason && (
                      <p className="op-error-text">{doc.rejection_reason}</p>
                    )}
                  </div>
                  <Badge status={doc?.validation_status ?? "pending"} />
                </div>
              );
            })}
          </section>
          <Link
            className="op-button secondary"
            href={`${basePath(demo)}/documentos`}
          >
            <Icon name="offers" />
            Documentación empresarial
          </Link>
        </aside>
      </div>
    </>
  );
}
export async function OperatorPanel({
  demo = false,
  section,
  id,
  search = {},
}: {
  demo?: boolean;
  section: string;
  id?: string;
  search?: Search;
}) {
  if (!sections.includes(section as Section)) notFound();
  const data = await loadSnapshot(demo);
  const unread = data.messages.filter(
    (m) =>
      m.sender_id !== data.profile.id &&
      Date.parse(m.created_at) >
        Date.parse(
          data.reads.find((r) => r.operation_id === m.operation_id)?.read_at ??
            "1970-01-01",
        ),
  ).length;
  const operational = !["perfil", "documentos", "soporte", "capacidad"].includes(section);
  const blocked =
    data.operator.verification_status !== "approved" && operational;
  return (
    <OperatorShell
      company={data.operator}
      profile={data.profile}
      demo={demo}
      unread={unread}
      previewDemo={demo && isVercelPreview()}
    >
      {blocked ? (
        <>
          <PageHeader
            title="Estado de tu cuenta"
            description="El acceso operativo requiere la aprobación del equipo 4PACK."
          />
          <section
            className={`op-panel op-account-state ${data.operator.verification_status === "suspended" ? "op-suspended" : ""}`}
            role="status"
            aria-live="polite"
          >
            <span className="op-icon-box">
              <Icon name="shield" />
            </span>
            <Badge status={data.operator.verification_status} />
            <h2>
              {data.operator.verification_status === "pending"
                ? "Tu empresa está en revisión"
                : data.operator.verification_status === "suspended"
                  ? "Tu acceso operativo está suspendido"
                  : "Tu validación requiere atención"}
            </h2>
            <p>
              {data.operator.rejection_reason ??
                (data.operator.verification_status === "suspended"
                  ? "Tu cuenta fue suspendida. El equipo 4PACK te informará el motivo por soporte si todavía no está disponible."
                  : "Podés revisar tu perfil, presentar documentación y contactar a soporte. Las oportunidades y la presentación de ofertas se habilitan únicamente para operadores aprobados.")}
            </p>
            {data.operator.verification_status === "suspended" && (
              <div className="op-suspension-details">
                <Fact label="Fecha de suspensión">
                  {data.operator.suspended_at
                    ? date(data.operator.suspended_at)
                    : "Consultá la fecha al equipo de soporte"}
                </Fact>
                <Fact label="Consecuencias">
                  No podés consultar oportunidades, presentar ofertas ni
                  gestionar operaciones o retiros mientras dure la suspensión.
                </Fact>
                <Fact label="Acción necesaria">
                  {data.operator.suspension_action ||
                    "Contactá a soporte para conocer la documentación o medida necesaria y solicitar la revisión de tu cuenta."}
                </Fact>
              </div>
            )}
            <Link
              className="op-button primary"
              href={`${basePath(demo)}/perfil`}
            >
              Revisar perfil
            </Link>
            <Link
              className="op-button secondary"
              href={`${basePath(demo)}/soporte`}
            >
              Contactar soporte
            </Link>
          </section>
        </>
      ) : section === "capacidad" ? (
        <CapacityView data={data.capacity} operationBase={`${basePath(demo)}/operaciones`} />
      ) : section === "oportunidades" ? (
        <Opportunities data={data} demo={demo} id={id} search={search} />
      ) : section === "mis-ofertas" ? (
        <Offers data={data} demo={demo} search={search} />
      ) : section === "operaciones" ? (
        <Operations data={data} demo={demo} id={id} search={search} />
      ) : section === "documentos" ? (
        <Documents data={data} demo={demo} search={search} />
      ) : section === "historial" ? (
        <History data={data} demo={demo} />
      ) : section === "billetera" ? (
        <Wallet data={data} demo={demo} />
      ) : section === "soporte" ? (
        <Support data={data} demo={demo} id={id} search={search} />
      ) : (
        <Profile data={data} demo={demo} />
      )}
      <div className="op-realtime-footer">
        <LiveUpdates demo={demo} />
      </div>
    </OperatorShell>
  );
}
