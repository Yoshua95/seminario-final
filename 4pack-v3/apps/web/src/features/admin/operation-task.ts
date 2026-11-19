import type { Workbench } from "./types";
export function operationStage(
  data: Workbench,
  op: Workbench["operations"][number],
  contractLabel: string,
) {
  if (!["confirmed", "in_progress"].includes(op.phase)) return contractLabel;
  const e = data.events
    .filter(
      (e) =>
        e.operation_id === op.id &&
        [
          "Aduana",
          "Liberación",
          "En distribución",
          "Entregada",
          "Arribo al país",
          "En tránsito",
          "Despacho en origen",
        ].includes(e.event_type),
    )
    .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))[0];
  return e
    ? e.event_type === "Aduana"
      ? "En aduana"
      : e.event_type
    : contractLabel;
}
export function operationTask(
  data: Workbench,
  op: Workbench["operations"][number],
) {
  if (["completed", "cancelled", "failed"].includes(op.phase))
    return {
      label: "Consultar cierre e historial",
      owner: "Sin tarea pendiente",
    };
  if (
    op.phase === "disputed" ||
    data.claims.some(
      (c) =>
        c.operation_id === op.id && !["resolved", "closed"].includes(c.status),
    )
  )
    return { label: "Revisar reclamo y evidencia", owner: "Administración" };
  // Legacy operations can have no contract row, SQL/JSON null content, or
  // incomplete quote terms. Missing terms never mean "no documents required".
  const contract = data.contracts?.find((c) => c.operation_id === op.id);
  const required = contract?.content?.quote?.required_documents;
  if (
    !Array.isArray(required) ||
    required.some((type) => typeof type !== "string")
  ) {
    if (op.phase === "awaiting_delivery_confirmation")
      return { label: "Confirmar recepción", owner: "Importador" };
    const guarantee = data.guarantees?.find((g) => g.operation_id === op.id);
    if (
      guarantee &&
      ["pending", "proof_uploaded", "verified", "rejected"].includes(
        guarantee.status,
      )
    )
      return {
        label: "Confirmar pago o garantía pendiente",
        owner: "Importador",
      };
    return { label: "Contrato pendiente de revisión", owner: "Administración" };
  }
  const documents = data.documents.filter(
    (d) => d.operation_id === op.id || d.cargo_id === op.cargo_id,
  );
  for (const type of required) {
    const d = documents.find(
      (d) => d.document_type === type && d.validation_status !== "rejected",
    );
    if (!d)
      return {
        label: "Adjuntar " + type,
        owner: [
          "Constancia de entrega",
          "Guía aérea",
          "Conocimiento de embarque",
        ].includes(type)
          ? "Operador"
          : "Importador",
      };
    if (d.validation_status === "pending")
      return { label: "Validar " + type, owner: "Administración" };
  }
  if (op.phase === "awaiting_delivery_confirmation")
    return { label: "Confirmar recepción", owner: "Importador" };
  if (
    !data.guarantees?.some(
      (g) =>
        g.operation_id === op.id &&
        ["held_simulated", "released_simulated"].includes(g.status),
    )
  )
    return {
      label: "Confirmar pago o garantía pendiente",
      owner: "Importador",
    };
  return {
    label:
      op.phase === "confirmed"
        ? "Iniciar el servicio"
        : "Registrar el próximo hito con evidencia",
    owner: "Operador",
  };
}
