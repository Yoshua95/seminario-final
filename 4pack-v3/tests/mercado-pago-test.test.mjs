import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acceptedSandboxUrls,
  rejectedSandboxUrls,
} from "./payment-url-fixture.mjs";
import {
  createTestProvider,
  verifiedPayment,
  sandboxUrl,
  runTestCheckout,
  diagnosticStage,
} from "../supabase/functions/_shared/mercado-pago-test.mjs";
const intent = {
  operation_id: "op",
  external_reference: "reference",
  amount: 250000,
};
const payment = {
  id: 123,
  collector_id: 42,
  external_reference: "reference",
  transaction_amount: 250000,
  currency_id: "ARS",
  live_mode: false,
  status: "approved",
  date_last_updated: "2026-11-18T00:00:00Z",
};
test("read-only inspection gets exactly the pinned payment and preserves is_test types", async () => {
  for (const [fields, type, value, present] of [
    [{}, "undefined", null, false],
    [{ is_test: false }, "boolean", false, true],
    [{ is_test: "true" }, "string", null, true],
    [{ is_test: true }, "boolean", true, true],
  ]) {
    const calls = [];
    const provider = createTestProvider({
      token: "private-fixture",
      sellerId: "42",
      returnBase: "https://example.org/return",
      fetcher: async (url, init) => {
        calls.push({ url, method: init.method });
        return Response.json({
          ...payment,
          ...fields,
          live_mode: true,
          email: "NEVER_RETURN",
        });
      },
    });
    const result = await provider.inspectExistingPayment(
      { ...intent, currency: "ARS" },
      "123",
    );
    assert.deepEqual(calls, [
      { url: "https://api.mercadopago.com/v1/payments/123", method: "GET" },
    ]);
    assert.equal(result.is_test_type, type);
    assert.equal(result.is_test, value);
    assert.equal(result.is_test_present, present);
    assert.equal(result.live_mode, true);
    assert(Object.values(result.checks).every(Boolean));
    assert(!JSON.stringify(result).includes("NEVER_RETURN"));
  }
});
for (const [name, fields] of Object.entries({
  absent: {},
  falseBoolean: { is_test: false },
  textTrue: { is_test: "true" },
})) {
  test("unverified is_test cannot admit live_mode=true: " + name, () => {
    assert.throws(
      () =>
        verifiedPayment({ ...payment, ...fields, live_mode: true }, intent, 42),
      /PAYMENT_CONTRACT_MISMATCH/,
    );
  });
}
test("sync diagnostics identify search, detail, contract and storage errors without unsafe payloads", async () => {
  for (const failure of ["search", "detail", "validate", "record"]) {
    const events = [];
    const diagnostics = (e) => events.push(e);
    const provider = createTestProvider({
      token: "private-token",
      sellerId: "42",
      returnBase: "https://example.org/return",
      diagnostics,
      fetcher: async (url) => {
        if (url.endsWith("/users/me"))
          return Response.json({ id: 42, site_id: "MLA", tags: ["test_user"] });
        if (url.includes("/search?"))
          return failure === "search"
            ? Response.json(
                { error: "bad_request", private: "NEVER_LOG" },
                { status: 400 },
              )
            : Response.json({ results: [{ id: 123 }], paging: { total: 1 } });
        if (failure === "detail")
          return Response.json({ private: "NEVER_LOG" }, { status: 403 });
        return Response.json({
          ...payment,
          ...(failure === "validate" ? { live_mode: true } : {}),
        });
      },
    });
    const store = {
      operation: async () => ({
        payment_mode: "mercado_pago_test",
        contract_currency: "ARS",
      }),
      intent: async () => ({
        ...intent,
        preference_id: "existing",
        preference_state: "ready",
      }),
      record: async () => {
        const e = Error("PAYMENT_STORAGE_FAILED");
        e.storageCode = "42501";
        throw e;
      },
    };
    const expected = {
      search: "payments.search",
      detail: "payments.detail",
      validate: "payment.validate",
      record: "payment.record",
    }[failure];
    await assert.rejects(
      runTestCheckout({
        action: "sync",
        actor: "owner",
        operationId: "op",
        store,
        provider,
        diagnostics,
        requireExistingPreference: true,
      }),
      (e) => {
        assert.equal(e.diagnostic.stage, expected);
        if (failure === "validate") {
          assert.equal(e.diagnostic.checks.test_mode, false);
          assert.deepEqual(e.diagnostic.observation, {
            live_mode: true,
            status: "approved",
            provider_payment_id: "123",
          });
        }
        if (failure === "record")
          assert.equal(e.diagnostic.storage_code, "42501");
        return true;
      },
    );
    assert(!JSON.stringify(events).includes("private-token"));
    assert(!JSON.stringify(events).includes("NEVER_LOG"));
  }
});
test("sync-only recovery requires an existing ready preference", async () => {
  let queried = false;
  await assert.rejects(
    runTestCheckout({
      action: "sync",
      actor: "owner",
      operationId: "op",
      requireExistingPreference: true,
      store: {
        operation: async () => ({
          payment_mode: "mercado_pago_test",
          contract_currency: "ARS",
        }),
        intent: async () => null,
      },
      provider: {
        assertTestSeller: async () => {},
        payments: async () => {
          queried = true;
          return [];
        },
      },
    }),
    /EXISTING_PREFERENCE_REQUIRED/,
  );
  assert.equal(queried, false);
});
test("observed Argentina sandbox preference is saved once and reused without recreating", async () => {
  const events = [];
  const diagnostics = (event) => events.push(event);
  let creates = 0,
    saves = 0,
    claimed = false;
  const provider = createTestProvider({
    token: "fixture-token",
    sellerId: "42",
    returnBase: "https://example.org/pagos/retorno",
    diagnostics,
    fetcher: async (url) => {
      if (url.endsWith("/users/me"))
        return Response.json({ id: 42, site_id: "MLA", tags: ["test_user"] });
      creates++;
      return Response.json({
        id: "existing-fixture-preference",
        sandbox_init_point:
          "https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=existing-fixture-preference",
      });
    },
  });
  const store = {
    operation: async () => ({
      payment_mode: "mercado_pago_test",
      contract_currency: "ARS",
    }),
    claim: async () => {
      if (saves)
        return {
          ...intent,
          status: "pending",
          preference_state: "ready",
          checkout_url: acceptedSandboxUrls[2],
        };
      const first = !claimed;
      claimed = true;
      return {
        ...intent,
        status: "pending",
        preference_state: "creating",
        claimed: first,
      };
    },
    save: async () => {
      saves++;
    },
  };
  const options = {
    action: "checkout",
    actor: "owner",
    operationId: "op",
    store,
    provider,
    diagnostics,
  };
  assert.equal(
    (await runTestCheckout(options)).checkout_url,
    acceptedSandboxUrls[2].replace("fixture", "existing-fixture-preference"),
  );
  assert(
    events.some((e) => e.stage === "preference.request" && e.outcome === "ok"),
  );
  assert(
    events.some((e) => e.stage === "preference.validate" && e.outcome === "ok"),
  );
  assert.equal(saves, 1);
  await runTestCheckout(options);
  assert.equal(creates, 1);
});
test("backend URL guard preserves sandbox formats and rejects production and deceptive URLs", () => {
  for (const url of acceptedSandboxUrls) assert.equal(sandboxUrl(url), url);
  for (const url of rejectedSandboxUrls) assert.throws(() => sandboxUrl(url));
});
test("backend accepts only a test seller from Argentina", async () => {
  for (const seller of [
    { id: 42, site_id: "MLA", tags: [] },
    { id: 43, site_id: "MLA", tags: ["test_user"] },
    { id: 42, site_id: "MLB", tags: ["test_user"] },
  ]) {
    const p = createTestProvider({
      token: "private-test-token",
      sellerId: "42",
      returnBase: "https://example.org/pagos/retorno",
      fetcher: async () => Response.json(seller),
    });
    await assert.rejects(p.assertTestSeller(), /TEST_SELLER_REQUIRED/);
  }
});

test("diagnostics distinguish request, response validation and storage without leaking payloads", async () => {
  for (const failure of ["http", "timeout", "json", "url", "save"]) {
    const events = [];
    let creates = 0;
    const diagnostics = (event) => events.push(event);
    const provider = createTestProvider({
      token: "secret-not-for-logs",
      sellerId: "42",
      returnBase: "https://example.org/return",
      diagnostics,
      fetcher: async (url) => {
        if (url.endsWith("/users/me"))
          return Response.json({ id: 42, site_id: "MLA", tags: ["test_user"] });
        creates++;
        if (failure === "http")
          return new Response("secret provider response", { status: 400 });
        if (failure === "timeout")
          throw new DOMException("secret timeout detail", "TimeoutError");
        if (failure === "json") return new Response("private invalid JSON");
        return Response.json({
          id: "pref",
          sandbox_init_point:
            failure === "url"
              ? "https://www.mercadopago.com.ar/checkout/private"
              : "https://sandbox.mercadopago.com/mla/checkout/pay?pref_id=pref",
        });
      },
    });
    let claimed = false,
      saves = 0;
    const store = {
      operation: async () => ({
        payment_mode: "mercado_pago_test",
        contract_currency: "ARS",
      }),
      claim: async () => {
        const first = !claimed;
        claimed = true;
        return {
          ...intent,
          status: "pending",
          preference_state: "creating",
          claimed: first,
        };
      },
      save: async () => {
        saves++;
        throw Error("PAYMENT_STORAGE_FAILED");
      },
    };
    const options = {
      action: "checkout",
      actor: "owner",
      operationId: "op",
      store,
      provider,
      diagnostics,
    };
    await assert.rejects(runTestCheckout(options));
    const stage =
      failure === "save"
        ? "preference.save"
        : failure === "url"
          ? "preference.validate"
          : "preference.request";
    const failed = events.find((e) => e.outcome === "error");
    assert.equal(failed.stage, stage);
    if (failure === "http") assert.equal(failed.http_status, 400);
    assert.equal(saves, failure === "save" ? 1 : 0);
    await assert.rejects(
      runTestCheckout(options),
      /CHECKOUT_CREATION_UNCERTAIN/,
    );
    assert.equal(creates, 1, "uncertain claim cannot POST another preference");
    assert(!JSON.stringify(events).includes("secret"));
    assert(!JSON.stringify(events).includes("private"));
  }
});

test("diagnostic logger allowlists errors and observer failure cannot affect payment behavior", async () => {
  const events = [];
  await assert.rejects(
    diagnosticStage(
      (e) => events.push(e),
      "preference.save",
      () => {
        throw Error("password=private@example.org token=secret");
      },
    ),
  );
  assert.deepEqual(events, [
    { stage: "preference.save", outcome: "start" },
    { stage: "preference.save", outcome: "error", code: "UNCLASSIFIED" },
  ]);
  assert.equal(
    await diagnosticStage(
      () => {
        throw Error("observer down");
      },
      "preference.request",
      () => 42,
    ),
    42,
  );
  await diagnosticStage(
    (e) => events.push(e),
    "untrusted arbitrary stage",
    () => 42,
  );
  assert.equal(events.length, 2);
});
test("preference uses only the server amount and sandbox URL", async () => {
  let body;
  const p = createTestProvider({
    token: "private-test-token",
    sellerId: "42",
    returnBase: "https://example.org/pagos/retorno",
    fetcher: async (_url, init) => {
      body = JSON.parse(init.body);
      return Response.json({
        id: "pref",
        sandbox_init_point:
          "https://sandbox.mercadopago.com/mla/checkout/pay?pref_id=pref",
      });
    },
  });
  const r = await p.create(intent);
  assert.equal(body.items[0].unit_price, 250000);
  assert.equal(body.items[0].currency_id, "ARS");
  assert.equal(body.external_reference, "reference");
  assert.equal(
    new URL(body.back_urls.success).searchParams.get("operation"),
    "op",
  );
  assert.match(r.checkout, /sandbox/);
});
for (const [name, change] of Object.entries({
  live: { live_mode: true },
  amount: { transaction_amount: 1 },
  currency: { currency_id: "USD" },
  seller: { collector_id: 43 },
  reference: { external_reference: "other" },
  missingReference: { external_reference: undefined },
}))
  test("reject provider mismatch " + name, () =>
    assert.throws(
      () => verifiedPayment({ ...payment, ...change }, intent, 42),
      /MISMATCH/,
    ),
  );
test("approved and rejected are provider observations, not return parameters", () => {
  assert.equal(verifiedPayment(payment, intent, 42).status, "approved");
  assert.equal(
    verifiedPayment({ ...payment, status: "rejected" }, intent, 42).status,
    "rejected",
  );
  assert.equal(
    verifiedPayment({ ...payment, status: "authorized" }, intent, 42).status,
    "pending",
  );
});
test("reject production and deceptive checkout URLs", () => {
  for (const value of [
    "https://www.mercadopago.com.ar/checkout",
    "https://sandbox.mercadopago.com.evil/mla/checkout/pay",
    "https://user:pass@sandbox.mercadopago.com/mla/checkout/pay",
  ])
    assert.throws(() => sandboxUrl(value));
});
test("reconciliation searches then fetches payment from backend", async () => {
  const calls = [];
  const p = createTestProvider({
    token: "private-test-token",
    sellerId: "42",
    returnBase: "https://example.org/return",
    fetcher: async (url) => {
      calls.push(url);
      return Response.json(
        url.includes("/search?")
          ? { results: [{ id: 123, status: "approved" }], paging: { total: 1 } }
          : { ...payment, status: "rejected" },
      );
    },
  });
  const result = await p.payments(intent);
  assert.equal(result[0].status, "rejected");
  assert(calls[0].includes("external_reference=reference"));
  assert(calls[1].endsWith("/v1/payments/123"));
});
test("authorization precedes all provider requests", async () => {
  let called = false;
  await assert.rejects(
    runTestCheckout({
      action: "checkout",
      actor: "other",
      operationId: "op",
      store: {
        operation: async () => {
          throw Error("forbidden");
        },
      },
      provider: {
        assertTestSeller: async () => {
          called = true;
        },
      },
    }),
    /forbidden/,
  );
  assert.equal(called, false);
});
test("retry reuses a stored preference; uncertain creation is never repeated", async () => {
  let creates = 0;
  const base = {
    action: "checkout",
    actor: "owner",
    operationId: "op",
    provider: {
      assertTestSeller: async () => {},
      create: async () => {
        creates++;
        throw Error("timeout");
      },
    },
    store: {
      operation: async () => ({
        payment_mode: "mercado_pago_test",
        contract_currency: "ARS",
      }),
      claim: async () => ({
        ...intent,
        status: "pending",
        preference_state: "ready",
        checkout_url:
          "https://sandbox.mercadopago.com/mla/checkout/pay?pref_id=pref",
      }),
    },
  };
  await runTestCheckout(base);
  assert.equal(creates, 0);
  base.store.claim = async () => ({
    ...intent,
    status: "pending",
    preference_state: "creating",
    claimed: false,
  });
  await assert.rejects(runTestCheckout(base), /UNCERTAIN/);
  assert.equal(creates, 0);
});
test("sync ignores forged return status and persists only verified provider data", async () => {
  const recorded = [];
  const store = {
    operation: async () => ({
      payment_mode: "mercado_pago_test",
      contract_currency: "ARS",
    }),
    intent: async () => ({
      ...intent,
      status: recorded.length ? "rejected" : "pending",
    }),
    record: async (_actor, _id, p) => recorded.push(p),
  };
  const r = await runTestCheckout({
    action: "sync",
    status: "approved",
    actor: "owner",
    operationId: "op",
    store,
    provider: {
      assertTestSeller: async () => {},
      payments: async () => [{ ...payment, status: "rejected" }],
    },
  });
  assert.equal(r.status, "rejected");
  assert.equal(recorded.length, 1);
});
