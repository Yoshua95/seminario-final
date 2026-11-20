// No card data, access tokens or provider payloads are persisted by this module.
const diagnosticStages = new Set([
  "provider.configuration",
  "seller.request",
  "seller.validate",
  "checkout.claim",
  "preference.request",
  "preference.validate",
  "preference.save",
  "payments.search",
  "payments.detail",
  "payment.validate",
  "payment.record",
  "checkout.intent",
]);
const diagnosticCodes = new Set([
  "TEST_CONFIGURATION_REQUIRED",
  "HTTPS_RETURN_REQUIRED",
  "TEST_SELLER_REQUIRED",
  "PROVIDER_HTTP_ERROR",
  "PROVIDER_TIMEOUT",
  "PROVIDER_TRANSPORT_ERROR",
  "PROVIDER_JSON_INVALID",
  "INVALID_PREFERENCE",
  "INVALID_SANDBOX_URL",
  "CHECKOUT_CREATION_UNCERTAIN",
  "PAYMENT_STORAGE_FAILED",
  "PAYMENT_CONTRACT_MISMATCH",
  "INVALID_PAYMENT_STATUS",
  "INVALID_PAYMENT_ID",
  "INCOMPLETE_PROVIDER_SEARCH",
  "EXISTING_PREFERENCE_REQUIRED",
]);
export async function diagnosticStage(diagnostics, stage, action) {
  const emit = (outcome, error) => {
    if (!diagnosticStages.has(stage)) return;
    const event = { stage, outcome };
    if (error) {
      event.code = diagnosticCodes.has(error.message)
        ? error.message
        : "UNCLASSIFIED";
      if (
        Number.isInteger(error.httpStatus) &&
        error.httpStatus >= 100 &&
        error.httpStatus <= 599
      )
        event.http_status = error.httpStatus;
      if (/^[A-Z0-9]{5}$/.test(error.storageCode ?? ""))
        event.storage_code = error.storageCode;
      if (/^[a-zA-Z0-9_]{1,64}$/.test(error.providerCode ?? ""))
        event.provider_code = error.providerCode;
      if (error.checks) {
        event.checks = Object.fromEntries(
          [
            "seller",
            "test_mode",
            "reference",
            "currency",
            "amount",
            "payment_id",
          ]
            .filter((k) => typeof error.checks[k] === "boolean")
            .map((k) => [k, error.checks[k]]),
        );
      }
      if (error.observation) {
        event.observation = {
          live_mode:
            typeof error.observation.live_mode === "boolean"
              ? error.observation.live_mode
              : "missing_or_invalid",
          status: [
            "pending",
            "approved",
            "rejected",
            "authorized",
            "in_process",
            "in_mediation",
            "cancelled",
            "refunded",
            "charged_back",
          ].includes(error.observation.status)
            ? error.observation.status
            : "unknown",
          ...(/^\d+$/.test(error.observation.provider_payment_id ?? "")
            ? { provider_payment_id: error.observation.provider_payment_id }
            : {}),
        };
      }
      if (error instanceof Error && !error.diagnostic) error.diagnostic = event;
    }
    // Diagnostics must never change checkout behavior or serialize arbitrary errors.
    try {
      diagnostics?.(event);
    } catch {
      /* ignore observer failure */
    }
  };
  emit("start");
  try {
    const value = await action();
    emit("ok");
    return value;
  } catch (error) {
    emit("error", error);
    throw error;
  }
}
export function sandboxUrl(value) {
  const url = new URL(value);
  const legacy =
    url.hostname === "sandbox.mercadopago.com" &&
    url.pathname.startsWith("/mla/checkout/");
  const argentina =
    /^https:\/\/sandbox\.mercadopago\.com\.ar\/checkout\/v1\/redirect(?:\?[^\s#]*)?$/.test(
      value,
    );
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !(legacy || argentina)
  )
    throw Error("INVALID_SANDBOX_URL");
  return url.href;
}
export function verifiedPayment(payment, intent, sellerId) {
  const checks = {
    test_mode: payment.live_mode === false,
    seller: String(payment.collector_id) === String(sellerId),
    reference: payment.external_reference === intent.external_reference,
    currency: payment.currency_id === "ARS",
    amount: Number(payment.transaction_amount) === Number(intent.amount),
    payment_id: /^\d+$/.test(String(payment.id)),
  };
  if (!Object.values(checks).every(Boolean)) {
    const error = Error("PAYMENT_CONTRACT_MISMATCH");
    error.checks = checks;
    error.observation = {
      live_mode: payment.live_mode,
      status: payment.status,
      provider_payment_id: String(payment.id),
    };
    throw error;
  }
  const status = ["authorized", "in_process", "in_mediation"].includes(
    payment.status,
  )
    ? "pending"
    : payment.status;
  if (
    ![
      "pending",
      "approved",
      "rejected",
      "cancelled",
      "refunded",
      "charged_back",
    ].includes(status) ||
    !Number.isFinite(Date.parse(payment.date_last_updated))
  )
    throw Error("INVALID_PAYMENT_STATUS");
  return {
    id: String(payment.id),
    live_mode: false,
    external_reference: payment.external_reference,
    currency_id: "ARS",
    transaction_amount: Number(payment.transaction_amount),
    status,
    date_last_updated: payment.date_last_updated,
  };
}
export function createTestProvider({
  token,
  sellerId,
  returnBase,
  notificationUrl,
  fetcher = fetch,
  diagnostics,
}) {
  if (!token || !/^\d+$/.test(String(sellerId)))
    throw Error("TEST_CONFIGURATION_REQUIRED");
  const base = new URL(returnBase);
  if (
    base.protocol !== "https:" ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  )
    throw Error("HTTPS_RETURN_REQUIRED");
  async function request(path, body) {
    let response;
    try {
      response = await fetcher("https://api.mercadopago.com" + path, {
        method: body ? "POST" : "GET",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(15000),
      });
    } catch (error) {
      throw Error(
        ["AbortError", "TimeoutError"].includes(error?.name)
          ? "PROVIDER_TIMEOUT"
          : "PROVIDER_TRANSPORT_ERROR",
      );
    }
    if (!response.ok) {
      const error = Error("PROVIDER_HTTP_ERROR");
      error.httpStatus = response.status;
      try {
        const body = await response.json();
        if (
          typeof body.error === "string" &&
          /^[a-zA-Z0-9_]{1,64}$/.test(body.error)
        )
          error.providerCode = body.error;
      } catch {
        /* never echo provider bodies */
      }
      throw error;
    }
    try {
      return await response.json();
    } catch {
      throw Error("PROVIDER_JSON_INVALID");
    }
  }
  return {
    async inspectExistingPayment(intent, paymentId) {
      const payment = await diagnosticStage(
        diagnostics,
        "payments.detail",
        () => {
          if (!/^\d+$/.test(String(paymentId)))
            throw Error("INVALID_PAYMENT_ID");
          return request("/v1/payments/" + paymentId);
        },
      );
      return {
        source: "authenticated_payment_detail",
        payment_id:
          String(payment.id) === String(paymentId) ? String(paymentId) : null,
        is_test_present: Object.hasOwn(payment, "is_test"),
        is_test_type: typeof payment.is_test,
        is_test: typeof payment.is_test === "boolean" ? payment.is_test : null,
        live_mode:
          typeof payment.live_mode === "boolean" ? payment.live_mode : null,
        status: [
          "approved",
          "rejected",
          "pending",
          "authorized",
          "in_process",
          "in_mediation",
          "cancelled",
          "refunded",
          "charged_back",
        ].includes(payment.status)
          ? payment.status
          : "unknown",
        checks: {
          payment_id: String(payment.id) === String(paymentId),
          seller: String(payment.collector_id) === String(sellerId),
          reference: payment.external_reference === intent.external_reference,
          currency: payment.currency_id === "ARS" && intent.currency === "ARS",
          amount: Number(payment.transaction_amount) === Number(intent.amount),
        },
      };
    },
    async assertTestSeller() {
      const seller = await diagnosticStage(diagnostics, "seller.request", () =>
        request("/users/me"),
      );
      await diagnosticStage(diagnostics, "seller.validate", () => {
        if (
          String(seller.id) !== String(sellerId) ||
          seller.site_id !== "MLA" ||
          !seller.tags?.includes("test_user")
        )
          throw Error("TEST_SELLER_REQUIRED");
      });
    },
    async create(intent) {
      const back = new URL(base);
      back.searchParams.set("operation", intent.operation_id);
      const result = await diagnosticStage(
        diagnostics,
        "preference.request",
        () =>
          request("/checkout/preferences", {
            external_reference: intent.external_reference,
            ...(notificationUrl ? {notification_url:notificationUrl} : {}),
            metadata: {
              operation_id: intent.operation_id,
              fourpack_test: true,
            },
            items: [
              {
                id: intent.operation_id,
                title: "4PACK - pago de prueba",
                quantity: 1,
                currency_id: "ARS",
                unit_price: Number(intent.amount),
              },
            ],
            back_urls: {
              success: back.href,
              failure: back.href,
              pending: back.href,
            },
            auto_return: "approved",
          }),
      );
      return diagnosticStage(diagnostics, "preference.validate", () => {
        if (!result.id) throw Error("INVALID_PREFERENCE");
        return {
          preference: String(result.id),
          checkout: sandboxUrl(result.sandbox_init_point),
        };
      });
    },
    async payments(intent) {
      const query = new URLSearchParams({
        external_reference: intent.external_reference,
        sort: "date_created",
        criteria: "desc",
        limit: "100",
      });
      const search = await diagnosticStage(
        diagnostics,
        "payments.search",
        async () => {
          const result = await request("/v1/payments/search?" + query);
          if (
            !Array.isArray(result.results) ||
            !result.paging ||
            Number(result.paging.total) > 100
          )
            throw Error("INCOMPLETE_PROVIDER_SEARCH");
          return result;
        },
      );
      const verified = [];
      for (const row of search.results) {
        const payment = await diagnosticStage(
          diagnostics,
          "payments.detail",
          () => {
            if (!/^\d+$/.test(String(row.id)))
              throw Error("INVALID_PAYMENT_ID");
            return request("/v1/payments/" + row.id);
          },
        );
        verified.push(
          await diagnosticStage(diagnostics, "payment.validate", () =>
            verifiedPayment(payment, intent, sellerId),
          ),
        );
      }
      return verified;
    },
  };
}

export async function runTestCheckout({
  action,
  actor,
  operationId,
  store,
  provider,
  diagnostics,
  requireExistingPreference = false,
}) {
  // Authorization precedes provider calls and must be implemented by the store.
  const operation = await store.operation(actor, operationId);
  if (
    operation.payment_mode !== "mercado_pago_test" ||
    operation.contract_currency !== "ARS"
  )
    throw Error("ARS_TEST_OPERATION_REQUIRED");
  await provider.assertTestSeller();
  if (action === "checkout") {
    const intent = await diagnosticStage(diagnostics, "checkout.claim", () =>
      store.claim(actor, operationId),
    );
    if (intent.status === "approved")
      return { status: "approved", checkout_url: null };
    if (intent.preference_state === "ready")
      return {
        status: intent.status,
        checkout_url: sandboxUrl(intent.checkout_url),
      };
    if (!intent.claimed) throw Error("CHECKOUT_CREATION_UNCERTAIN");
    // After an uncertain network failure the claim is NOT automatically reset:
    // Preferences API is not assumed to provide an idempotent creation contract.
    const preference = await provider.create(intent);
    await diagnosticStage(diagnostics, "preference.save", () =>
      store.save(actor, operationId, preference),
    );
    return { status: "pending", checkout_url: preference.checkout };
  }
  if (action !== "sync") throw Error("INVALID_ACTION");
  const intent = await diagnosticStage(
    diagnostics,
    "checkout.intent",
    async () => {
      const result = await store.intent(actor, operationId);
      if (
        requireExistingPreference &&
        (!result?.preference_id || result.preference_state !== "ready")
      )
        throw Error("EXISTING_PREFERENCE_REQUIRED");
      return result;
    },
  );
  if (!intent) return { status: "pending", checkout_url: null };
  for (const payment of await provider.payments(intent))
    await diagnosticStage(diagnostics, "payment.record", () =>
      store.record(actor, operationId, payment),
    );
  const refreshed = await store.intent(actor, operationId);
  return {
    status: refreshed.status,
    checked_at: refreshed.checked_at,
    checkout_url: null,
  };
}
