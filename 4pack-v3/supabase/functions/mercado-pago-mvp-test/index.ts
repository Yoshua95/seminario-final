import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import {
  createTestProvider,
  runTestCheckout,
  sandboxUrl,
} from "../_shared/mercado-pago-test.mjs";
import { reconcileRegisteredPayment } from "../_shared/mercado-pago-registered.mjs";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization,apikey,x-client-info,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};
Deno.serve(async (request: Request) => {
  const json = (data: unknown, status = 200) =>
    Response.json(data, { status, headers: cors });
  if (request.method === "OPTIONS")
    return new Response(null, { headers: cors });
  if (request.method !== "POST")
    return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  let stage = "authorization";
  try {
    const url = Deno.env.get("SUPABASE_URL")!,
      anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const session = createClient(url, anon, {
      global: {
        headers: { Authorization: request.headers.get("Authorization") ?? "" },
      },
      auth: { persistSession: false },
    });
    const auth = await session.auth.getUser();
    if (auth.error || !auth.data.user)
      return json({ error: "Sesion requerida" }, 401);
    const text = await request.text();
    if (text.length > 2048) return json({ error: "REQUEST_TOO_LARGE" }, 413);
    const body = JSON.parse(text);
    if (
      !body ||
      typeof body !== "object" ||
      Object.keys(body).some((k) => !["action", "operation_id"].includes(k)) ||
      !["checkout", "sync"].includes(body.action) ||
      !/^([a-f0-9]{8}-)([a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(
        body.operation_id ?? "",
      )
    )
      return json({ error: "INVALID_REQUEST" }, 400);
    const actor = auth.data.user.id,
      target = body.operation_id;
    const operation = await session
      .from("operations")
      .select("id,importer_id,payment_mode,contract_currency,workflow_version")
      .eq("id", target)
      .eq("importer_id", actor)
      .single();
    if (
      operation.error ||
      operation.data.payment_mode !== "mercado_pago_test" ||
      operation.data.contract_currency !== "ARS" ||
      operation.data.workflow_version !== "mvp_delivery_v1"
    )
      return json({ error: "Operacion no autorizada" }, 403);
    const admin = createClient(
      url,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const [settings, binding, intentResponse] = await Promise.all([
      admin.from("mp_test_settings").select("enabled").single(),
      admin.from("mp_test_provider_binding").select("*").single(),
      session
        .from("mp_test_checkouts")
        .select("*")
        .eq("operation_id", target)
        .maybeSingle(),
    ]);
    if (settings.error || binding.error || intentResponse.error)
      throw Error("TEST_CONFIGURATION_UNAVAILABLE");
    const config = binding.data;
    if (
      url !== `https://${config.project_ref}.supabase.co` ||
      Deno.env.get("MP_TEST_SELLER_ID") !== config.seller_id
    )
      throw Error("TEST_PROJECT_OR_SELLER_MISMATCH");
    const rpc = async (name: string, args: Record<string, unknown>) => {
      stage = "storage." + name;
      const r = await admin.rpc(name, args);
      if (r.error)
        throw Object.assign(Error("PAYMENT_STORAGE_FAILED"), {
          storageCode: r.error.code,
        });
      return r.data;
    };
    const intent = intentResponse.data;
    if (body.action === "checkout") {
      if (intent?.status === "approved")
        return json({
          status: "approved",
          checkout_url: null,
          operation_id: target,
        });
      if (intent?.preference_state === "ready") {
        sandboxUrl(intent.checkout_url);
        return json({
          status: intent.status,
          checkout_url: intent.checkout_url,
          operation_id: target,
        });
      }
      if (
        Deno.env.get("MP_TEST_ENABLED") !== "true" ||
        settings.data.enabled !== true
      )
        return json(
          {
            error:
              "Creación de pagos de prueba desactivada; conservá la operación y reintentá cuando esté disponible.",
          },
          503,
        );
      stage = "provider.configuration";
      const provider = createTestProvider({
        token: Deno.env.get("MP_TEST_ACCESS_TOKEN"),
        sellerId: config.seller_id,
        returnBase: Deno.env.get("MP_TEST_RETURN_BASE"),
        notificationUrl: url + "/functions/v1/mercado-pago-mvp-webhook",
      });
      const store = {
        operation: async () => operation.data,
        claim: () => rpc("claim_mp_test_checkout", { actor, target }),
        save: (
          _actor: string,
          _target: string,
          p: { preference: string; checkout: string },
        ) => rpc("save_mp_test_preference", { actor, target, ...p }),
        intent: async () => intent,
        record: () => {
          throw Error("CHECKOUT_CANNOT_RECORD_PAYMENT");
        },
      };
      stage = "checkout";
      return json({
        ...(await runTestCheckout({
          action: "checkout",
          actor,
          operationId: target,
          store,
          provider,
        })),
        operation_id: target,
      });
    }
    if (
      settings.data.enabled !== false ||
      Deno.env.get("MP_TEST_ENABLED") !== "false"
    )
      throw Error("CHECKOUT_CREATION_MUST_BE_DISABLED_FOR_RECONCILIATION");
    if (!intent?.preference_id)
      return json({
        status: "pending",
        operation_id: target,
        checkout_url: null,
      });
    const provider = {
      get: async (path: string) => {
        stage = "provider." + path.split("/").slice(1, 3).join(".");
        const r = await fetch("https://api.mercadopago.com" + path, {
          headers: {
            Authorization: "Bearer " + Deno.env.get("MP_TEST_ACCESS_TOKEN"),
          },
          signal: AbortSignal.timeout(15000),
        });
        if (!r.ok) throw Error("PROVIDER_HTTP_" + r.status);
        return r.json();
      },
    };
    const verified = await reconcileRegisteredPayment({
      intent,
      binding: config,
      provider,
      record: (payment: unknown) =>
        rpc("record_mp_test_payment", { actor, target, payment }),
    });
    const stored = await session
      .from("mp_test_checkouts")
      .select("status,checked_at")
      .eq("operation_id", target)
      .single();
    if (stored.error) throw Error("PAYMENT_STATE_UNAVAILABLE");
    return json({
      ...verified,
      status: stored.data.status,
      checked_at: stored.data.checked_at,
      checkout_url: null,
    });
  } catch (error) {
    const candidate =
      error instanceof Error ? error.message : "PAYMENT_TEST_ERROR";
    const code = /^[A-Z0-9_.-]{1,100}$/.test(candidate)
      ? candidate
      : "PAYMENT_TEST_ERROR";
    const storageCode =
      (error as { storageCode?: string })?.storageCode ?? null;
    console.warn(
      JSON.stringify({
        event: "mp_mvp_diagnostic",
        stage,
        code,
        storage_code: storageCode,
      }),
    );
    return json(
      {
        error:
          "No se pudo confirmar el pago de prueba. Conservá esta operación y reintentá.",
        diagnostic: { stage, code, storage_code: storageCode },
      },
      409,
    );
  }
});
