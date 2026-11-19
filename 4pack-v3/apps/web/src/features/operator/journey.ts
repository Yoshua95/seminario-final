import type { CapacitySnapshot } from "../capacity/types";
import type { Guarantee, Movement, Operation } from "./types";

export function capacityWarnings(
  capacity: CapacitySnapshot | undefined,
  price: number,
  capital: number,
  weight: number,
  volume: number | null,
  now = Date.now(),
) {
  if (!capacity)
    return ["No pudimos verificar tus límites. Se comprobarán al adjudicar."];
  const l = capacity.limits,
    c = capacity.currencies.find((x) => x.currency === "ARS"),
    u = capacity.usage.currencies?.ARS;
  const reasons: string[] = [];
  const active = (x: {
    status: string;
    valid_from: string;
    valid_until: string | null;
  }) =>
    x.status === "active" &&
    Date.parse(x.valid_from) <= now &&
    (!x.valid_until || Date.parse(x.valid_until) > now);
  if (!l || !c || !active(l) || !active(c))
    reasons.push("Faltan límites ARS aprobados y vigentes.");
  if (capacity.usage.requires_review)
    reasons.push(
      "Hay reservas históricas pendientes de revisión administrativa.",
    );
  if (l && capacity.usage.operations + 1 > l.max_operations)
    reasons.push("No quedan cupos de operaciones activas.");
  if (c && price > c.max_per_operation)
    reasons.push("El precio supera el máximo por operación.");
  if (c && price + Number(u?.exposure ?? 0) > c.max_exposure)
    reasons.push("La exposición total superaría el límite aprobado.");
  if (u?.working_capital === null)
    reasons.push(
      "El capital comprometido requiere revisión; no se puede calcular el disponible.",
    );
  else if (
    c &&
    capital + Number(u?.working_capital ?? 0) > c.approved_working_capital
  )
    reasons.push(
      "El capital propio requerido supera el disponible para comprometer.",
    );
  if (
    l?.max_weight_kg != null &&
    capacity.usage.weight_kg + weight > l.max_weight_kg
  )
    reasons.push("El peso supera tu capacidad disponible.");
  if (volume === null)
    reasons.push(
      "El importador debe confirmar el volumen antes de reservar Capacity.",
    );
  else if (
    l?.max_volume_m3 != null &&
    capacity.usage.volume_m3 + volume > l.max_volume_m3
  )
    reasons.push("El volumen supera tu capacidad disponible.");
  return reasons;
}

export function nextOperationStep(phase: string, paid: boolean) {
  if (["completed", "cancelled", "failed"].includes(phase))
    return "Operación cerrada. Consultá su historial.";
  if (phase === "disputed")
    return "La operación está en controversia. Esperá la intervención de 4PACK.";
  if (!paid)
    return "El importador debe confirmar el pago o la garantía pendiente.";
  if (phase === "awaiting_delivery_confirmation")
    return "El importador debe confirmar la entrega.";
  return "Registrá el próximo hito con su evidencia y actualizá el estado cuando corresponda.";
}

// Wallet movements in this product are simulated. Provider approvals are not disbursable balances.
export function collectionSummary(
  guarantees: Guarantee[],
  movements: Movement[],
) {
  return {
    simulatedAvailable: movements
      .filter((m) => m.currency === "ARS")
      .reduce((n, m) => n + Number(m.amount), 0),
    simulatedPending: guarantees
      .filter((g) => g.currency === "ARS" && g.status === "held_simulated")
      .reduce((n, g) => n + Number(g.amount_usd) - Number(g.commission_usd), 0),
  };
}
export function isProviderTest(operation: Pick<Operation, "payment_mode">) {
  return operation.payment_mode === "mercado_pago_test";
}
