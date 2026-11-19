import { NewCargoForm } from "@/components/new-cargo-form";
import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import type { NormalizedQuote } from "@4pack/domain";
import { QuoteTerms } from "../marketplace/quote-terms";
import { money, date } from "../operator/types";
import { localDatabase } from "../operator/data";
import { asUser } from "../operator/demo-runtime.mjs";
import { rehearsalAccounts, rehearsalSession, type DemoRole } from "./session";
import { enterRehearsal, leaveRehearsal } from "./actions";
import { RehearsalForm } from "./forms";
type CargoRow = {
  id: string;
  public_code: string;
  title: string;
  origin: string;
  destination: string;
  weight_kg: number;
  volume_m3: number;
  status: string;
};
type OfferRow = {
  backed?: boolean;
  id: string;
  operator_id: string;
  payment_currency: string;
  total_usd: number;
  status: string;
  normalized_quote: NormalizedQuote | null;
};
type OperationRow = {
  id: string;
  public_code: string;
  cargo_id: string;
  accepted_offer_id: string;
  operator_id: string;
  phase: string;
  contract_currency: string;
};
async function rows<T>(role: DemoRole, sql: string, params: unknown[] = []) {
  const account = await rehearsalSession(role);
  return (await asUser<T>(await localDatabase(), account.id, sql, params)).rows;
}
function uuid(value: string) {
  if (!/^[0-9a-f-]{36}$/i.test(value)) notFound();
  return value;
}
export function MultiroleAccess() {
  return (
    <main className="op-demo-access">
      <section className="op-panel">
        <h1>4PACK · Ensayo multirrol local</h1>
        <p>
          Cuentas ficticias con sesiones separadas. PGlite local; no valida
          Supabase Auth ni mueve fondos reales.
        </p>
        <p>
          Usá una ventana o perfil de navegador separado por rol para grabar el
          recorrido.
        </p>
        <form action={enterRehearsal} className="op-form">
          <label>
            Cuenta ficticia
            <select name="account">
              <option value="importer">
                Importador · {rehearsalAccounts.importer.email}
              </option>
              <option value="operator">
                Operador · {rehearsalAccounts.operator.email}
              </option>
              <option value="admin">
                Administrador · {rehearsalAccounts.admin.email}
              </option>
            </select>
          </label>
          <button className="op-button">Entrar al ensayo multirrol</button>
        </form>
      </section>
    </main>
  );
}
export async function RehearsalShell({
  role,
  children,
}: {
  role: DemoRole;
  children: ReactNode;
}) {
  const account = await rehearsalSession(role);
  return (
    <main className="op-content">
      <header className="op-panel">
        <p>4PACK · Ensayo aislado local · garantía y pagos simulados</p>
        <p>
          Sesión: {account.email} · {role}
        </p>
        <nav>
          {role === "importer" ? (
            <>
              <Link href="/demo/importador">Mis cargas y operaciones</Link>
              {" · "}
              <Link href="/demo/importador/cargas/nueva">Publicar carga</Link>
            </>
          ) : (
            <>
              <Link href="/demo/admin">Administración</Link>
              {" · "}
              <Link href="/demo/admin/operadores">Verificar operadores</Link>
              {" · "}
              <Link href="/demo/admin/capacidad">Configurar Capacity</Link>
            </>
          )}
        </nav>
        <form action={leaveRehearsal}>
          <button className="op-button secondary">
            Cerrar sesión ficticia
          </button>
        </form>
      </header>
      {children}
    </main>
  );
}
export async function ImporterScreen({ parts }: { parts: string[] }) {
  await rehearsalSession("importer");
  if (parts.length === 0) {
    const cargos = await rows<CargoRow>(
      "importer",
      "select id,public_code,title,origin,destination,weight_kg,volume_m3,status from public.cargo_requests order by created_at desc",
    );
    const operations = await rows<OperationRow>(
      "importer",
      "select id,public_code,cargo_id,accepted_offer_id,operator_id,phase,contract_currency from public.operations order by awarded_at desc",
    );
    return (
      <RehearsalShell role="importer">
        <section className="op-panel">
          <h1>Mis cargas</h1>
          {cargos.map((c) => (
            <article key={c.id}>
              <Link href={"/demo/importador/cargas/" + c.id}>
                {c.public_code} · {c.title}
              </Link>
              <p>
                {c.origin} → {c.destination} · {c.status}
              </p>
            </article>
          ))}
        </section>
        <section className="op-panel">
          <h2>Mis operaciones</h2>
          {operations.map((o) => (
            <p key={o.id}>
              <Link href={"/demo/importador/operaciones/" + o.id}>
                {o.public_code} · {o.phase}
              </Link>
            </p>
          ))}
        </section>
      </RehearsalShell>
    );
  }
  if (parts[0] === "cargas" && parts[1] === "nueva" && parts.length === 2)
    return (
      <RehearsalShell role="importer">
        <section className="op-panel">
          <h1>Publicar carga</h1>
          <NewCargoForm demo />
        </section>
      </RehearsalShell>
    );
  if (parts[0] === "cargas" && parts.length === 2) {
    const id = uuid(parts[1]);
    const cargo = (
      await rows<CargoRow>(
        "importer",
        "select id,public_code,title,origin,destination,weight_kg,volume_m3,status from public.cargo_requests where id=$1 and importer_id=auth.uid()",
        [id],
      )
    )[0];
    if (!cargo) notFound();
    const offers = await rows<OfferRow>(
      "importer",
      process.env.FOURPACK_CAPITAL_ADMIN === "1"
        ? "select f.id,f.operator_id,f.payment_currency,f.total_usd,f.status,f.normalized_quote,b.backed from public.offers f join public.offer_backing($1) b on b.offer_id=f.id where f.cargo_id=$1 order by f.created_at"
        : "select id,operator_id,payment_currency,total_usd,status,normalized_quote from public.offers where cargo_id=$1 order by created_at",
      [id],
    );
    const operation = (
      await rows<{ id: string }>(
        "importer",
        "select id from public.operations where cargo_id=$1 and importer_id=auth.uid()",
        [id],
      )
    )[0];
    return (
      <RehearsalShell role="importer">
        <section className="op-panel">
          <h1>
            {cargo.public_code} · {cargo.title}
          </h1>
          <p>
            {cargo.origin} → {cargo.destination} · {cargo.weight_kg} kg ·{" "}
            {cargo.volume_m3} m³
          </p>
          <h2>Comparar propuestas privadas</h2>
          <p>
            Compará alcance y moneda, no solo el precio. La capacidad se reserva
            al enviar y se transfiere al adjudicar.
          </p>
          {operation && (
            <div>
              <p role="status">Operación creada con capacidad reservada.</p>
              <Link
                className="op-button"
                href={"/demo/importador/operaciones/" + operation.id}
              >
                Ver operación creada
              </Link>
            </div>
          )}
          {offers.length === 0 && <p>Sin propuestas presentadas.</p>}
          {offers.map((o) => (
            <article key={o.id} className="op-panel">
              <h3>
                Propuesta · {o.payment_currency}{" "}
                {money(o.total_usd, o.payment_currency)}
              </h3>
              <p>
                {o.status} ·{" "}
                {o.backed === true
                  ? "Capital reservado"
                  : o.status === "submitted"
                    ? "Respaldo pendiente"
                    : "Oferta cerrada"}
              </p>
              <QuoteTerms quote={o.normalized_quote} />
              {o.status === "submitted" &&
                cargo.status === "open" &&
                (process.env.FOURPACK_CAPITAL_ADMIN !== "1" ||
                  o.backed === true) && (
                  <RehearsalForm
                    command="award"
                    label="Adjudicar oferta"
                    linkBase="/demo/importador/operaciones"
                    linkLabel="Ver operación creada"
                  >
                    <input type="hidden" name="offer_id" value={o.id} />
                  </RehearsalForm>
                )}
            </article>
          ))}
        </section>
      </RehearsalShell>
    );
  }
  if (parts[0] === "operaciones" && parts.length === 2) {
    const id = uuid(parts[1]);
    const op = (
      await rows<OperationRow>(
        "importer",
        "select id,public_code,cargo_id,accepted_offer_id,operator_id,phase,contract_currency from public.operations where id=$1 and importer_id=auth.uid()",
        [id],
      )
    )[0];
    if (!op) notFound();
    const guarantee = (
      await rows<{
        status: string;
        amount_usd: number;
        commission_usd: number;
      }>(
        "importer",
        "select status,amount_usd,commission_usd from public.payment_guarantees where operation_id=$1",
        [id],
      )
    )[0];
    const events = await rows<{
      id: string;
      title: string;
      description: string;
      created_at: string;
      attachment_id: string | null;
    }>(
      "importer",
      "select id,title,description,created_at,attachment_id from public.tracking_events where operation_id=$1 order by created_at",
      [id],
    );
    const documents = await rows<{ id: string; original_name: string }>(
      "importer",
      "select id,original_name from public.documents where operation_id=$1",
      [id],
    );
    const rating = (
      await rows<{ score: number; comment: string | null }>(
        "importer",
        "select score,comment from public.ratings where operation_id=$1 and author_id=auth.uid()",
        [id],
      )
    )[0];
    const labels: Record<string, string> = {
      pending: "Pendiente",
      held_simulated: "Retenida · simulación",
      released_simulated: "Liberada · simulación",
    };
    return (
      <RehearsalShell role="importer">
        <section className="op-panel">
          <h1>Operación {op.public_code}</h1>
          <p data-testid="operation-phase">{op.phase}</p>
          <h2>Garantía simulada</h2>
          <p data-testid="guarantee-status" data-state={guarantee?.status}>
            {labels[guarantee?.status] ?? guarantee?.status}
          </p>
          <p>
            {op.contract_currency}{" "}
            {money(guarantee?.amount_usd ?? 0, op.contract_currency)} · comisión
            simulada{" "}
            {money(guarantee?.commission_usd ?? 0, op.contract_currency)}
          </p>
          <p>No representa fondos custodiados.</p>
          {guarantee?.status === "pending" && (
            <RehearsalForm
              command="guarantee"
              label="Confirmar garantía simulada"
            >
              <input name="id" type="hidden" value={id} />
            </RehearsalForm>
          )}
          {op.phase === "awaiting_delivery_confirmation" && (
            <RehearsalForm
              command="complete"
              label="Confirmar recepción y finalizar"
            >
              <input name="id" type="hidden" value={id} />
            </RehearsalForm>
          )}
          <h2>Hitos y evidencia</h2>
          {events.map((e) => (
            <article key={e.id}>
              <h3>{e.title}</h3>
              <p>
                {e.description} · {date(e.created_at)}
              </p>
              {e.attachment_id &&
                documents.some((d) => d.id === e.attachment_id) && (
                  <Link href={"/demo/multirole/documentos/" + e.attachment_id}>
                    Ver evidencia del hito
                  </Link>
                )}
            </article>
          ))}
          {op.phase === "completed" && (
            <>
              <h2>Evaluar al operador</h2>
              {rating ? (
                <p data-testid="sent-rating">
                  Evaluación enviada: {rating.score}/5 · {rating.comment}
                </p>
              ) : (
                <RehearsalForm command="rate" label="Enviar evaluación">
                  <input name="id" type="hidden" value={id} />
                  <label>
                    Puntaje
                    <select name="score">
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Comentario
                    <textarea name="comment" maxLength={500} />
                  </label>
                </RehearsalForm>
              )}
            </>
          )}
        </section>
      </RehearsalShell>
    );
  }
  notFound();
}
export async function AdminScreen({
  operators = false,
}: {
  operators?: boolean;
}) {
  await rehearsalSession("admin");
  const accounts = await rows<{
    user_id: string;
    company_name: string;
    verification_status: string;
  }>(
    "admin",
    "select o.user_id,o.company_name,o.verification_status from public.operator_profiles o join public.profiles p on p.id=o.user_id where p.role='operator' order by o.company_name",
  );
  return (
    <RehearsalShell role="admin">
      <section className="op-panel">
        <h1>
          {operators
            ? "Verificación administrativa"
            : "Administración del ensayo"}
        </h1>
        <p>
          La aprobación documental no configura límites económicos. Configurá
          Capacity en su pantalla separada.
        </p>
        {accounts.map((o) => (
          <article
            className="op-panel"
            key={o.user_id}
            data-operator-id={o.user_id}
          >
            <h2>{o.company_name}</h2>
            <p>Verificación: {o.verification_status}</p>
            <RehearsalForm command="verify" label="Guardar verificación">
              <input type="hidden" name="id" value={o.user_id} />
              <label>
                Estado
                <select
                  name="status"
                  defaultValue={
                    o.verification_status === "approved"
                      ? "approved"
                      : "rejected"
                  }
                >
                  <option value="approved">Aprobado</option>
                  <option value="rejected">Rechazado</option>
                </select>
              </label>
            </RehearsalForm>
            <Link href={"/demo/admin/capacidad?operator=" + o.user_id}>
              Configurar Capacity de esta cuenta
            </Link>
          </article>
        ))}
      </section>
    </RehearsalShell>
  );
}
