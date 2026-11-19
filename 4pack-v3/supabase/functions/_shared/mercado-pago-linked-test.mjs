export const linkedTestCase = Object.freeze({
  project: "umiracgmhjglqoftoljn", operation: "be3e0432-3802-4dff-bc30-e2819894ad10",
  payment: "190397769098", preference: "3858067934-647084a7-99bb-474b-ade1-2b05e80c460b",
  reference: "b54a4c92-d31f-4729-8af9-3f7c79ce3a3e", seller: "3858067934", buyer: "3858067936", amount: 250000,
});

// The buyer ID is the test-account ID supplied by the owner; its public API
// does not expose test_user. Never represent that missing tag as provider proof.
// Optional context is supplied only by the authenticated backend from its stored preference.
export function verifyLinkedTestPayment({ payment, order, preference, seller, buyer, intent }, c = linkedTestCase) {
  const checks = {
    registered_operation: intent.operation_id === c.operation,
    registered_preference: intent.preference_id === c.preference && intent.preference_state === "ready",
    registered_reference: intent.external_reference === c.reference,
    registered_amount: Number(intent.amount) === c.amount && intent.currency === "ARS",
    payment_id: String(payment.id) === c.payment,
    seller: String(payment.collector_id) === c.seller && String(seller.id) === c.seller,
    seller_test_account: seller.site_id === "MLA" && seller.tags?.includes("test_user") === true,
    expected_buyer: String(payment.payer?.id) === c.buyer && String(buyer.id) === c.buyer && buyer.site_id === "MLA" && c.seller !== c.buyer,
    reference: payment.external_reference === c.reference,
    currency: payment.currency_id === "ARS",
    amount: typeof payment.transaction_amount === "number" && payment.transaction_amount === c.amount,
    live_mode_boolean: typeof payment.live_mode === "boolean",
    order_id: /^\d+$/.test(String(payment.order?.id)) && String(order.id) === String(payment.order.id),
    order_payment: order.payments?.some(p => String(p.id) === c.payment && p.status === payment.status && Number(p.transaction_amount) === c.amount) === true,
    order_seller: String(order.collector?.id ?? order.collector_id) === c.seller,
    order_buyer: String(order.payer?.id) === c.buyer,
    order_preference: order.preference_id === c.preference,
    order_reference: order.external_reference === c.reference,
    order_amount: Number(order.total_amount) === c.amount,
    preference_id: preference.id === c.preference,
    preference_seller: String(preference.collector_id) === c.seller,
    preference_reference: preference.external_reference === c.reference,
    preference_operation: preference.metadata?.operation_id === c.operation,
    preference_test_marker: preference.metadata?.fourpack_test === true,
    preference_item: preference.items?.length === 1 && preference.items[0].id === c.operation && preference.items[0].currency_id === "ARS" && Number(preference.items[0].quantity) === 1 && Number(preference.items[0].unit_price) === c.amount,
  };
  if (!Object.values(checks).every(v => v === true)) throw Object.assign(Error("LINKED_TEST_EVIDENCE_MISMATCH"), { checks });
  const status = ["authorized", "in_process", "in_mediation"].includes(payment.status) ? "pending" : payment.status;
  if (!["pending", "approved", "rejected", "cancelled", "refunded", "charged_back"].includes(status) || !Number.isFinite(Date.parse(payment.date_last_updated))) throw Error("INVALID_PAYMENT_STATUS");
  const evidence = {
    version: 1, classification: "test_accounts_linked_preference", project_ref: c.project,
    operation_id: c.operation, payment_id: c.payment, preference_id: c.preference,
    order_id: String(order.id), seller_id: c.seller, buyer_id: c.buyer, external_reference: c.reference,
    amount: c.amount, currency: "ARS", seller_test_user: true,
    buyer_identity_source: "owner_supplied_test_account_id_confirmed_by_provider",
    buyer_test_user_tag: Array.isArray(buyer.tags) && buyer.tags.includes("test_user"),
    provider_live_mode: payment.live_mode,
    provider_is_test_present: Object.hasOwn(payment, "is_test"),
    provider_is_test: typeof payment.is_test === "boolean" ? payment.is_test : null,
    checks,
  };
  return {
    id: String(payment.id), live_mode: payment.live_mode,
    external_reference: payment.external_reference, currency_id: payment.currency_id,
    transaction_amount: payment.transaction_amount, status, date_last_updated: payment.date_last_updated,
    collector_id: String(payment.collector_id), payer_id: String(payment.payer.id), order_id: String(order.id),
    internal_classification: evidence.classification, classification_evidence: evidence,
  };
}
