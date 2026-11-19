export type AcceptPayResult = {
  operationId: string;
  status: string;
  checkoutUrl: string | null;
};
export class CheckoutAfterAwardError extends Error {
  constructor(
    public operationId: string,
    message: string,
  ) {
    super(message);
    this.name = "CheckoutAfterAwardError";
  }
}
// The operation survives a provider/network failure; retry uses the same award
// and the backend's existing preference/idempotency mechanism, never a new ID.
export async function acceptOfferAndPay(
  offerId: string,
  deps: {
    award: (id: string) => Promise<string>;
    checkout: (
      id: string,
    ) => Promise<{ status: string; checkout_url: string | null }>;
  },
): Promise<AcceptPayResult> {
  const operationId = await deps.award(offerId);
  try {
    const payment = await deps.checkout(operationId);
    if (payment.status !== "approved" && !payment.checkout_url)
      throw Error("El checkout no devolvio un enlace de prueba.");
    return {
      operationId,
      status: payment.status,
      checkoutUrl: payment.checkout_url,
    };
  } catch (e) {
    throw new CheckoutAfterAwardError(
      operationId,
      e instanceof Error ? e.message : "No se pudo abrir el checkout.",
    );
  }
}
