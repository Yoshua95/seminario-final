import { sameQuoteScope, type NormalizedQuote } from "@4pack/domain";
export type ImporterOffer = {
  eligible?: boolean;
  capitalBacked?: boolean;
  backingReason?: string;
  id: string;
  operatorId: string;
  amount: number;
  currency: string;
  days: number;
  status: string;
  validUntil: string;
  quote: NormalizedQuote | null;
};
export function compareImporterOffers(offers: ImporterOffer[]) {
  const active = offers.filter((o) => o.status === "submitted");
  return (
    active.length > 1 &&
    active.some(
      (o) =>
        o.currency !== active[0].currency ||
        !sameQuoteScope(active[0].quote, o.quote),
    )
  );
}
export function validateImporterRating(score: number, comment: string) {
  if (
    !Number.isInteger(score) ||
    score < 1 ||
    score > 5 ||
    comment.trim().length > 500
  )
    throw new Error(
      "Evaluación inválida: elegí de 1 a 5 estrellas y hasta 500 caracteres.",
    );
}
export async function importerOperationAction(
  action: "award" | "guarantee" | "complete",
  id: string,
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
) {
  const [name, args] =
    action === "award"
      ? ["award_offer", { target_offer_id: id }]
      : action === "guarantee"
        ? ["simulate_guarantee", { target_operation_id: id }]
        : ["transition_operation", { target: id, next_phase: "completed" }];
  const result = await rpc(name as string, args as Record<string, unknown>);
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
