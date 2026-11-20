import { verifyLinkedTestPayment } from "./mercado-pago-linked-test.mjs";
export async function reconcileRegisteredPayment({
  intent,
  binding,
  provider,
  record,
  onlyPaymentId,
  now = () => new Date(),
}) {
  if (
    !intent ||
    intent.preference_state !== "ready" ||
    !intent.preference_id ||
    intent.currency !== "ARS" ||
    !(Number(intent.amount) > 0)
  )
    throw Error("REGISTERED_PREFERENCE_REQUIRED");
  if (
    !/^[a-z]{20}$/.test(binding.project_ref) ||
    !/^\d+$/.test(binding.seller_id) ||
    !/^\d+$/.test(binding.buyer_id) ||
    binding.seller_id === binding.buyer_id
  )
    throw Error("INVALID_TEST_BINDING");
  const hashes = {};
  async function get(name, path) {
    const value = await provider.get(path);
    hashes[name] = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(JSON.stringify(value)),
        ),
      ),
    )
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
    return value;
  }
  let ids;
  if (onlyPaymentId) {
    if (!/^\d+$/.test(onlyPaymentId)) throw Error("INVALID_PAYMENT_ID");
    ids = [onlyPaymentId];
  } else {
    const search = await get(
      "search",
      "/v1/payments/search?" +
        new URLSearchParams({
          external_reference: intent.external_reference,
          sort: "date_created",
          criteria: "desc",
          limit: "100",
        }),
    );
    if (
      !Array.isArray(search.results) ||
      search.paging?.total !== search.results.length ||
      search.results.length > 100
    )
      throw Error("PAYMENT_SEARCH_INCOMPLETE");
    ids = [...new Set(search.results.map((p) => String(p.id)))];
  }
  const preference = await get(
    "preference",
    "/checkout/preferences/" + encodeURIComponent(intent.preference_id),
  );
  const seller = await get("seller", "/users/me"),
    buyer = await get("buyer", "/users/" + binding.buyer_id);
  const verified = [];
  for (const id of ids) {
    if (!/^\d+$/.test(id)) throw Error("INVALID_PAYMENT_ID");
    const payment = await get("payment", "/v1/payments/" + id);
    if (!/^\d+$/.test(String(payment.order?.id)))
      throw Error("ORDER_LINK_MISSING");
    const order = await get("order", "/merchant_orders/" + payment.order.id);
    const result = verifyLinkedTestPayment(
      { payment, order, preference, seller, buyer, intent },
      {
        project: binding.project_ref,
        operation: intent.operation_id,
        payment: id,
        preference: intent.preference_id,
        reference: intent.external_reference,
        seller: binding.seller_id,
        buyer: binding.buyer_id,
        amount: Number(intent.amount),
      },
    );
    result.classification_evidence.checked_at = now().toISOString();
    result.classification_evidence.provider_response_sha256 = { ...hashes };
    verified.push(result);
  }
  // Validate all responses before the first write; no partially accepted mismatch.
  for (const payment of verified) await record(payment);
  return {
    operation_id: intent.operation_id,
    amount: Number(intent.amount),
    currency: "ARS",
    payments: verified.map((p) => ({
      id: p.id,
      status: p.status,
      provider_live_mode: p.live_mode,
    })),
  };
}
export async function verifyMercadoPagoWebhook({
  signature,
  requestId,
  paymentId,
  secret,
  now = Date.now(),
}) {
  if (
    typeof secret !== "string" ||
    secret.length < 16 ||
    !/^\d+$/.test(paymentId ?? "") ||
    typeof requestId !== "string" ||
    !requestId ||
    requestId.length > 150
  )
    return false;
  const parts = String(signature ?? "")
    .split(",")
    .map((v) => v.trim().split("="));
  if (parts.length !== 2 || new Set(parts.map((p) => p[0])).size !== 2)
    return false;
  const fields = Object.fromEntries(parts),
    ts = fields.ts,
    v1 = fields.v1;
  if (!/^\d{10,13}$/.test(ts ?? "") || !/^[a-f0-9]{64}$/i.test(v1 ?? ""))
    return false;
  const timestamp = Number(ts) * (ts.length <= 10 ? 1000 : 1);
  if (Math.abs(now - timestamp) > 5 * 60 * 1000) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    Uint8Array.from(v1.match(/../g), (h) => parseInt(h, 16)),
    new TextEncoder().encode(
      `id:${paymentId};request-id:${requestId};ts:${ts};`,
    ),
  );
}
