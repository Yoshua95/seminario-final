// One rule for importer Android, operator web and administration. Its inputs
// come from persisted operation/payment/document/claim evidence, not UI state.
export function deriveOperationTask(input) {
  const {
    role,
    phase,
    paymentMode,
    paymentApproved,
    openClaims = 0,
    deliveryProof = false,
    deliveryConfirmed = false,
    requiredDocuments,
    documents = [],
    protectionState,
  } = input;
  const task = (label, responsible, action, documentType = null) => ({
    label,
    responsible,
    action,
    documentType,
    tone: action === "history" || action === "evaluate" ? "green" : "orange",
  });
  if (openClaims > 0 || phase === "disputed" || protectionState === "in_review")
    return task(
      role === "admin"
        ? "Revisar reclamo y evidencia"
        : "Reclamo en revisión por Administración",
      "admin",
      role === "admin" ? "resolve_claim" : "view_claim",
    );
  if (
    ["cancelled", "failed"].includes(phase) ||
    protectionState === "refunded_test"
  )
    return task("Consultar resolución e historial", "none", "history");
  if (phase === "completed")
    return protectionState === "released_test"
      ? task(
          role === "importer"
            ? "Entrega confirmada. Evaluá al operador"
            : "Liberación de prueba registrada",
          role === "importer" ? "importer" : "none",
          role === "importer" ? "evaluate" : "history",
        )
      : task("Revisar la condición de liberación", "admin", "review_release");
  if (paymentMode === "mercado_pago_test" && !paymentApproved)
    return task(
      role === "importer" ? "Continuar pago" : "Esperando pago del importador",
      "importer",
      role === "importer" ? "continue_payment" : "view_payment",
    );
  if (!Array.isArray(requiredDocuments))
    return task("Contrato pendiente de revisión", "admin", "review_contract");
  if(input.chinaOrigin){
    const origin=input.chinaOrigin;
    if(origin.revisionPending)return task(role==="importer"?"Decidir ajuste de recepción":"Esperando aceptación del importador","importer","china_revision");
    if(origin.economicAdjustment)return task("Conciliación adicional del ajuste pendiente","admin","review_adjustment");
    if(origin.state==="awaiting_dispatch")return task(origin.handoff==="pickup"?"Registrar retiro en China":"Registrar envío al depósito de China",origin.handoff==="pickup"?"operator":"importer","china_dispatch");
    if(origin.state==="in_transit_to_warehouse")return task("Confirmar recepción y medidas en China","operator","china_receipt");
  }
  const normalize = (s) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  for (const type of requiredDocuments) {
    if (normalize(type).includes("entrega")) continue;
    const doc = documents.find(
      (d) => normalize(d.type) === normalize(type) && d.status !== "rejected",
    );
    if (!doc) {
      const owner = /entrega|guia|embarque/.test(normalize(type))
        ? "operator"
        : "importer";
      return task(
        role === owner
          ? "Subir " + type
          : "Esperando " +
              type +
              " del " +
              (owner === "importer" ? "importador" : "operador"),
        owner,
        role === owner ? "upload_document" : "wait_document",
        type,
      );
    }
  }
  if (phase === "awaiting_delivery_confirmation") {
    if (!deliveryProof)
      return task(
        role === "operator"
          ? "Registrar entrega con evidencia"
          : "Esperando evidencia de entrega del operador",
        "operator",
        role === "operator" ? "record_delivery" : "wait_delivery",
      );
    if (!deliveryConfirmed)
      return task(
        role === "importer"
          ? "Confirmar entrega"
          : "Esperando confirmación de entrega del importador",
        "importer",
        role === "importer" ? "confirm_delivery" : "wait_confirmation",
      );
  }
  if (phase === "confirmed")
    return task(
      role === "operator"
        ? "Iniciar servicio"
        : "Esperando inicio del operador",
      "operator",
      role === "operator" ? "start_service" : "view_progress",
    );
  return task(
    role === "operator" ? "Registrar próximo hito" : "Ver avance del operador",
    "operator",
    role === "operator" ? "record_milestone" : "view_progress",
  );
}
