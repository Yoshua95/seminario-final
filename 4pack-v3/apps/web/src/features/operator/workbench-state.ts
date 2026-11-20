import type { Snapshot } from "./types";
import { deriveOperationTask } from "@4pack/domain";

export function netCollections(data: Snapshot) {
  const released = new Set(
    data.operations
      .filter(
        (o) =>
          o.phase === "completed" &&
          (o.workflow_version !== "mvp_delivery_v1" ||
            data.protection?.some(
              (p) => p.operation_id === o.id && p.state === "released_test",
            ) === true) &&
          data.guarantees.some(
            (g) =>
              g.operation_id === o.id &&
              g.currency === "ARS" &&
              g.status === "released_simulated",
          ),
      )
      .map((o) => o.id),
  );
  const credits = data.movements
    .filter(
      (m) =>
        m.currency === "ARS" &&
        m.kind === "release" &&
        m.operation_id &&
        released.has(m.operation_id),
    )
    .reduce((n, m) => n + Number(m.amount), 0);
  const debits = data.movements
    .filter(
      (m) =>
        m.currency === "ARS" &&
        Number(m.amount) < 0 &&
        (m.operation_id === null || released.has(m.operation_id)),
    )
    .reduce((n, m) => n + Number(m.amount), 0);
  const pending = data.guarantees.filter(
    (g) =>
      g.currency === "ARS" &&
      ["pending", "proof_uploaded", "verified", "held_simulated"].includes(
        g.status,
      ) &&
      data.operations.some(
        (o) =>
          o.id === g.operation_id &&
          o.workflow_version !== "mvp_delivery_v1" &&
          !["completed", "cancelled", "failed"].includes(o.phase),
      ),
  );
  const protectedPending = (data.protection ?? []).filter(
    (p) => p.state === "pending_delivery" && p.provider_payment_id,
  );
  const reviewing = (data.protection ?? []).filter(
    (p) => p.state === "in_review" && p.provider_payment_id,
  );
  return {
    available: Math.max(0, credits + debits),
    pending: pending.reduce(
      (n, g) => n + Number(g.amount_usd) - Number(g.commission_usd),
      protectedPending.reduce(
        (n, p) => n + Number(p.amount) - Number(p.commission),
        0,
      ),
    ),
    pendingCount: pending.length + protectedPending.length,
    inReview: reviewing.reduce(
      (n, p) => n + Number(p.amount) - Number(p.commission),
      0,
    ),
    reviewCount: reviewing.length,
    testBalance: true,
  };
}
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
export function operationWork(data: Snapshot, id: string) {
  const op = data.operations.find((o) => o.id === id);
  if (!op) throw Error("Operación no disponible");
  const events = data.events
    .filter((e) => e.operation_id === id)
    .sort(
      (a, b) =>
        Date.parse(b.occurred_at || b.created_at) -
        Date.parse(a.occurred_at || a.created_at),
    );
  const last = events[0] ?? null,
    physical = events.find((e) =>
      [
        "Aduana",
        "Liberación",
        "En distribución",
        "Entregada",
        "Arribo al país",
        "En tránsito",
        "Despacho en origen",
      ].includes(e.event_type),
    );
  let stage =
    (
      {
        created: "Adjudicada",
        confirmed: "Confirmada",
        in_progress: "Servicio en curso",
        awaiting_delivery_confirmation: "Entrega por confirmar",
        completed: "Completada",
        disputed: "En controversia",
        cancelled: "Cancelada",
        failed: "No completada",
      } as Record<string, string>
    )[op.phase] ?? "Estado por verificar";
  const contractStage = stage;
  if (["confirmed", "in_progress"].includes(op.phase) && physical) {
    stage =
      physical.event_type === "Aduana" ? "En aduana" : physical.event_type;
  }
  const result = (
    action: string,
    responsible: string,
    target: "operation" | "chat" | "document" | "support" | "collections",
    tone: "green" | "orange",
    button: string,
    documentType?: string,
  ) => ({
    stage,
    contractStage,
    last,
    action,
    responsible,
    target,
    tone,
    button,
    documentType,
  });
  const g = data.guarantees.find((g) => g.operation_id === id);
  if (op.workflow_version === "mvp_delivery_v1") {
    const next = deriveOperationTask({
      role: "operator",
      phase: op.phase,
      paymentMode: op.payment_mode,
      paymentApproved: (data.payments ?? []).some(
        (p) => p.operation_id === id && p.status === "approved",
      ),
      openClaims: (data.tickets ?? []).filter(
        (t) =>
          t.operation_id === id && !["closed", "resolved"].includes(t.status),
      ).length,
      deliveryProof: events.some(
        (e) => e.event_type === "Entregada" && !!e.attachment_id,
      ),
      deliveryConfirmed: (data.deliveryConfirmations ?? []).some(
        (d) => d.operation_id === id,
      ),
      protectionState: data.protection?.find((p) => p.operation_id === id)
        ?.state,
      requiredDocuments:
        data.contracts.find((c) => c.operation_id === id)?.content?.quote
          ?.required_documents ?? null,
      documents: data.documents
        .filter((d) => d.operation_id === id)
        .map((d) => ({ type: d.document_type, status: d.validation_status })),
    });
    const owner = {
      importer: "Importador",
      operator: "Operador",
      admin: "Administración",
      none: "Sin tarea pendiente",
    }[next.responsible];
    return result(
      next.label,
      owner,
      next.action === "upload_document"
        ? "document"
        : next.action.includes("claim")
          ? "support"
          : next.action === "history"
            ? "collections"
            : "operation",
      next.tone,
      next.label,
      next.documentType ?? undefined,
    );
  }
  if (op.phase === "completed")
    return g?.status === "released_simulated"
      ? result(
          "Cierre y liberación registrados",
          "Sin tarea pendiente",
          "collections",
          "green",
          "Ver cobro",
        )
      : result(
          "Revisar liberación pendiente",
          "Administración",
          "collections",
          "orange",
          "Ver cobro",
        );
  if (["cancelled", "failed"].includes(op.phase))
    return result(
      "Consultar el cierre registrado",
      "Operador",
      "operation",
      "green",
      "Ver cierre",
    );
  if (op.phase === "disputed")
    return result(
      "Resolver la controversia",
      "Administración",
      "support",
      "orange",
      "Ver soporte",
    );
  if (
    data.capacity?.reservations.some(
      (r) => r.operation_id === id && r.state === "requires_review",
    )
  )
    return result(
      "Revisar la reserva de Capacity",
      "Administración",
      "operation",
      "orange",
      "Ver reserva",
    );
  const test = op.payment_mode === "mercado_pago_test",
    approved = data.payments?.some(
      (p) => p.operation_id === id && p.status === "approved",
    );
  if (test && (data.paymentsUnavailable || !approved))
    return result(
      data.paymentsUnavailable
        ? "Verificar el estado del pago"
        : "Completar el pago de prueba",
      data.paymentsUnavailable ? "Administración" : "Importador",
      "chat",
      "orange",
      "Enviar mensaje",
    );
  if (g?.status !== "held_simulated")
    return result(
      "Confirmar la garantía pendiente",
      "Importador",
      "chat",
      "orange",
      "Enviar mensaje",
    );
  if (op.phase === "awaiting_delivery_confirmation")
    return result(
      "Confirmar la entrega",
      "Importador",
      "operation",
      "orange",
      "Ver entrega",
    );
  const cargo = data.cargos.find((c) => c.id === op.cargo_id),
    quote = data.contracts.find((c) => c.operation_id === id)?.content?.quote;
  const required = [
    ...new Set([
      ...(cargo?.required_documents ?? []),
      ...(quote?.required_documents ?? []),
    ]),
  ];
  const docs = data.documents.filter(
    (d) =>
      (d.operation_id === id || (!!cargo && d.cargo_id === cargo.id)) &&
      !data.documents.some((next) => next.replaces_id === d.id),
  );
  for (const type of required) {
    const doc = docs.find(
      (d) => normalize(d.document_type) === normalize(type),
    );
    if (!doc || doc.validation_status === "rejected") {
      const operator =
        normalize(type).includes("entrega") ||
        normalize(type).includes("guia") ||
        normalize(type).includes("embarque");
      return result(
        `${doc ? "Reemplazar" : "Adjuntar"} ${type}`,
        operator ? "Operador" : "Importador",
        operator ? "document" : "chat",
        "orange",
        operator ? `Subir ${type}` : "Solicitar documento",
        type,
      );
    }
  }
  if (docs.some((d) => d.validation_status === "pending"))
    return result(
      "Revisar la documentación adjunta",
      "Administración",
      "operation",
      "orange",
      "Ver documentos",
    );
  if (op.phase === "confirmed")
    return result(
      "Iniciar el servicio",
      "Operador",
      "operation",
      "orange",
      "Iniciar servicio",
    );
  return result(
    "Sin tareas pendientes registradas; seguir el avance",
    "Operador",
    "operation",
    "green",
    "Ver seguimiento",
  );
}
