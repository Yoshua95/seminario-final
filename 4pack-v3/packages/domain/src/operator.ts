import contract from "./operation-contract.json" with { type: "json" };
export type OperatorStatus = "pending" | "approved" | "rejected" | "suspended";
export type OperationPhase = keyof typeof contract;
export const operationTransitions = Object.fromEntries(Object.entries(contract).map(([key,value]) => [key,value.next])) as unknown as Record<OperationPhase, readonly OperationPhase[]>;
export const phaseLabels = Object.fromEntries(Object.entries(contract).map(([key,value]) => [key,value.label])) as Record<OperationPhase,string>;
export const milestoneTypes = [
  "Carga recibida en origen",
  "Documentación validada",
  "Despacho en origen",
  "En tránsito",
  "Arribo al país",
  "Aduana",
  "Liberación",
  "En distribución",
  "Entregada",
  "Incidencia",
] as const;
export const documentTypes = [
  "MSDS",
  "UN38.3",
  "Packing list",
  "Factura comercial",
  "Guía aérea",
  "Conocimiento de embarque",
  "Constancia de entrega",
  "Credencial del operador",
  "Otro",
] as const;
export function canOperate(role: string, status: OperatorStatus): boolean {
  return role === "operator" && status === "approved";
}
export function canTransition(
  from: OperationPhase,
  to: OperationPhase,
): boolean {
  return operationTransitions[from].includes(to);
}
export function validateOffer(
  input: {
    amount: number;
    days: number;
    mode: string;
    status: OperatorStatus;
    closesAt: string | null;
    cargoStatus: string;
    hasActiveOffer: boolean;
  },
  now = Date.now(),
): string | null {
  if (!canOperate("operator", input.status))
    return "Tu empresa debe estar aprobada para cotizar.";
  if (
    input.cargoStatus !== "open" ||
    (input.closesAt !== null &&
      (!Number.isFinite(Date.parse(input.closesAt)) ||
        Date.parse(input.closesAt) <= now))
  )
    return "La licitación está cerrada.";
  if (input.hasActiveOffer) return "Ya presentaste una oferta para esta carga.";
  if (
    !Number.isFinite(input.amount) ||
    input.amount <= 0 ||
    input.amount > 999999999 ||
    Math.abs(input.amount * 100 - Math.round(input.amount * 100)) > 0.00001
  )
    return "Ingresá una tarifa positiva con hasta dos decimales.";
  if (!Number.isInteger(input.days) || input.days < 1 || input.days > 365)
    return "El plazo debe ser de 1 a 365 días.";
  if (!["air", "sea"].includes(input.mode))
    return "Seleccioná una modalidad válida.";
  return null;
}
export function validateDocument(
  name: string,
  size: number,
  type: string,
): string | null {
  if (size <= 0 || size > 10 * 1024 * 1024)
    return "El archivo debe pesar entre 1 byte y 10 MB.";
  const extensions: Record<string, string[]> = {
    "application/pdf": ["pdf"],
    "image/jpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
  };
  return extensions[type]?.includes(name.split(".").pop()?.toLowerCase() ?? "")
    ? null
    : "Adjuntá un PDF, JPG o PNG válido.";
}
export function reputation(scores: readonly number[]): {
  average: number | null;
  count: number;
  rank: string;
} {
  const valid = scores.filter(
    (score) => Number.isInteger(score) && score >= 1 && score <= 5,
  );
  const average = valid.length
    ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10
    : null;
  return {
    average,
    count: valid.length,
    rank:
      valid.length === 0
        ? "Sin historial"
        : average! >= 4.8
          ? "Platinum"
          : average! >= 4.5
            ? "Gold"
            : "Silver",
  };
}
export function simulatedNet(amount: number, rate = 0.025): number {
  if (!Number.isFinite(amount) || amount <= 0 || rate < 0 || rate > 1)
    throw new Error("Importe o comisión inválidos");
  return (
    Math.round((amount - Math.round(amount * rate * 100) / 100) * 100) / 100
  );
}
