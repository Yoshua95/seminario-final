import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import {
  acceptedSandboxUrls,
  rejectedSandboxUrls,
} from "./payment-url-fixture.mjs";
// Exercise the actual Edge entry point without claiming Deno or hosted execution.
let handler,
  authUser = null,
  enabled = "true",
  syncOperation = undefined,
  calls = 0;
globalThis.__mpTestClient = () => {
  calls++;
  return {
    auth: {
      getUser: async () => ({
        data: { user: authUser },
        error: authUser ? null : { message: "no session" },
      }),
    },
  };
};
globalThis.Deno = {
  env: {
    get: (key) =>
      key === "MP_TEST_ENABLED"
        ? enabled
        : key === "MP_TEST_SYNC_OPERATION_ID"
          ? syncOperation
          : "local-test-config",
  },
  serve: (h) => {
    handler = h;
  },
};
let source = await readFile(
  new URL("../supabase/functions/mercado-pago-test/index.ts", import.meta.url),
  "utf8",
);
source = source
  .replace(
    /import\s*\{\s*createClient\s*\}\s*from\s*["']npm:@supabase\/supabase-js@2\.119\.0["'];/,
    "const createClient=globalThis.__mpTestClient;",
  )
  .replace(
    /["']\.\.\/_shared\/mercado-pago-test\.mjs["']/,
    JSON.stringify(
      new URL(
        "../supabase/functions/_shared/mercado-pago-test.mjs",
        import.meta.url,
      ).href,
    ),
  );
const entryCompilation = ts.transpileModule(source, {
  reportDiagnostics: true,
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
});
assert.deepEqual(
  entryCompilation.diagnostics ?? [],
  [],
  "Edge entry point must have no TypeScript syntax errors",
);
await import(
  "data:text/javascript;base64," +
    Buffer.from(entryCompilation.outputText).toString("base64")
);
after(() => {
  delete globalThis.Deno;
  delete globalThis.__mpTestClient;
});
const request = (body) =>
  new Request("https://example.invalid/function", {
    method: "POST",
    body: JSON.stringify(body),
  });
test("recovery allowlist cannot enable checkout or sync another operation", async () => {
  enabled = "false";
  syncOperation = "be3e0432-3802-4dff-bc30-e2819894ad10";
  authUser = { id: "owner" };
  for (const body of [
    { action: "checkout", operation_id: syncOperation },
    { action: "sync", operation_id: "11111111-1111-4111-8111-111111111111" },
    { action: "inspect", operation_id: "11111111-1111-4111-8111-111111111111" },
  ])
    assert.equal((await handler(request(body))).status, 503);
  authUser = null;
  assert.equal(
    (await handler(request({ action: "sync", operation_id: syncOperation })))
      .status,
    401,
  );
  syncOperation = undefined;
  enabled = "true";
});
test("entry point refuses disabled integration before contacting clients", async () => {
  enabled = "false";
  calls = 0;
  assert.equal((await handler(request({}))).status, 503);
  assert.equal(calls, 0);
  enabled = "true";
});

test("pinned sync bridge forwards only reconciliation while checkout stays disabled", async () => {
  const originalFetch = globalThis.fetch, originalGet = Deno.env.get;
  let forwarded = 0;
  try {
    enabled = "false";
    syncOperation = "be3e0432-3802-4dff-bc30-e2819894ad10";
    authUser = { id: "owner" };
    Deno.env.get = key => key === "SUPABASE_URL" ? "https://umiracgmhjglqoftoljn.supabase.co" : originalGet(key);
    globalThis.fetch = async (url, options) => {
      forwarded++;
      assert.equal(url, "https://umiracgmhjglqoftoljn.supabase.co/functions/v1/mercado-pago-reconcile-existing");
      assert.deepEqual(JSON.parse(options.body), { action: "reconcile" });
      return Response.json({ status: "approved" });
    };
    const r = await handler(request({ action: "sync", operation_id: syncOperation }));
    assert.equal(r.status, 200); assert.equal((await r.json()).status, "approved");
    assert.equal((await handler(request({ action: "checkout", operation_id: syncOperation }))).status, 503);
    assert.equal(forwarded, 1);
  } finally {
    globalThis.fetch = originalFetch; Deno.env.get = originalGet;
    enabled = "true"; syncOperation = undefined; authUser = null;
  }
});
test("entry point requires real Auth validation", async () => {
  authUser = null;
  assert.equal(
    (
      await handler(
        request({
          action: "sync",
          operation_id: "11111111-1111-1111-1111-111111111111",
        }),
      )
    ).status,
    401,
  );
});
test("client amount, status or payment ID cannot enter the verification contract", async () => {
  authUser = { id: "owner" };
  for (const extra of [
    { amount: 1 },
    { status: "approved" },
    { payment_id: "123" },
  ])
    assert.equal(
      (
        await handler(
          request({
            action: "sync",
            operation_id: "11111111-1111-1111-1111-111111111111",
            ...extra,
          }),
        )
      ).status,
      400,
    );
});
test("GET and oversized JSON cannot mutate payment state", async () => {
  assert.equal(
    (await handler(new Request("https://example.invalid/function"))).status,
    405,
  );
  assert.equal(
    (await handler(request({ action: "sync", payload: "a".repeat(3000) })))
      .status,
    413,
  );
});
test("actual Android payment adapter accepts both sandboxes and rejects unsafe checkout URLs", async () => {
  let checkout;
  globalThis.__mobilePaymentClient = {
    functions: {
      invoke: async () => ({
        data: { status: "pending", checkout_url: checkout },
        error: null,
      }),
    },
  };
  try {
    const source = (
      await readFile(
        new URL("../apps/mobile/lib/test-payments.ts", import.meta.url),
        "utf8",
      )
    ).replace(
      'import { supabase } from "./supabase";',
      "const supabase=globalThis.__mobilePaymentClient;",
    );
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
      },
    }).outputText;
    const { testPayment } = await import(
      "data:text/javascript;base64," + Buffer.from(compiled).toString("base64")
    );
    for (const url of acceptedSandboxUrls) {
      checkout = url;
      assert.equal(
        (await testPayment("operation", "checkout")).checkout_url,
        url,
      );
    }
    for (const url of rejectedSandboxUrls) {
      checkout = url;
      await assert.rejects(testPayment("operation", "checkout"));
    }
  } finally {
    delete globalThis.__mobilePaymentClient;
  }
});
