import Link from "next/link";
import type { Snapshot } from "./types";
import { operationWork } from "./workbench-state";
import { code, money, date } from "./types";
export function OperationRow({
  data,
  id,
  base,
}: {
  data: Snapshot;
  id: string;
  base: string;
}) {
  const op = data.operations.find((o) => o.id === id)!,
    cargo = data.cargos.find((c) => c.id === op.cargo_id),
    offer = data.offers.find((f) => f.id === op.accepted_offer_id),
    work = operationWork(data, id);
  const href =
    work.target === "collections"
      ? base + "/billetera"
      : work.target === "document"
        ? `${base}/documentos?operacion=${id}&tipo=${encodeURIComponent(work.documentType ?? "")}`
        : work.target === "support"
          ? `${base}/soporte?operacion=${id}`
          : `${base}/operaciones/${id}${work.target === "chat" ? "?panel=chat" : ""}`;
  return (
    <article className={`op-panel op-work-row ${work.tone}`}>
      <div>
        <span className="op-caption">#{code(op)}</span>
        <h2>
          {cargo?.origin} → {cargo?.destination}
        </h2>
        <p>{cargo?.title}</p>
        <strong className="mono">
          {offer?.payment_currency}{" "}
          {money(offer?.total_usd ?? 0, offer?.payment_currency ?? "ARS")}
        </strong>
      </div>
      <div>
        <span className="op-caption">ETAPA ACTUAL</span>
        <h3>{work.stage}</h3><small>Estado contractual: {work.contractStage}</small>
        <p>Último hito: {work.last?.title ?? "Sin hitos registrados"}</p>
        {work.last && (
          <small>
            {date(work.last.occurred_at)} ·{" "}
            {work.last.created_by === op.operator_id
              ? "Operador"
              : work.last.created_by === op.importer_id
                ? "Importador"
                : "Responsable no informado"}
          </small>
        )}
      </div>
      <div className="op-work-action">
        <span className="op-caption">PRÓXIMA ACCIÓN</span>
        <h3>{work.action}</h3>
        <p>Responsable: {work.responsible}</p>
        <Link className="op-button" href={href}>
          {work.button} →
        </Link>
      </div>
    </article>
  );
}
