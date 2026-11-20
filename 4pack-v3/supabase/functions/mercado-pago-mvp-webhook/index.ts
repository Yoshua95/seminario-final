import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import {
  reconcileRegisteredPayment,
  verifyMercadoPagoWebhook,
} from "../_shared/mercado-pago-registered.mjs";
// Provider endpoint has no user JWT. HMAC authentication is mandatory before GETs
// or storage writes. Body/redirect status never approves a payment.
Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  let stage = "signature";
  try {
    const uri = new URL(request.url),
      id = uri.searchParams.get("data.id") ?? "";
    const valid = await verifyMercadoPagoWebhook({
      signature: request.headers.get("x-signature"),
      requestId: request.headers.get("x-request-id"),
      paymentId: id,
      secret: Deno.env.get("MP_TEST_WEBHOOK_SECRET"),
    });
    if (!valid) return new Response(null, { status: 401 });
    const text = await request.text();
    if (text.length > 20000) return new Response(null, { status: 413 });
    const body = JSON.parse(text);
    if (body.type !== "payment" || String(body.data?.id) !== id)
      return new Response(null, { status: 400 });
    const url = Deno.env.get("SUPABASE_URL")!,
      admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
        auth: { persistSession: false },
      });
    const [binding, settings] = await Promise.all([
      admin.from("mp_test_provider_binding").select("*").single(),
      admin.from("mp_test_settings").select("enabled").single(),
    ]);
    if (
      binding.error ||
      settings.error ||
      settings.data.enabled !== false ||
      Deno.env.get("MP_TEST_ENABLED") !== "false"
    )
      throw Error("TEST_RECONCILIATION_NOT_READY");
    if (
      url !== `https://${binding.data.project_ref}.supabase.co` ||
      Deno.env.get("MP_TEST_SELLER_ID") !== binding.data.seller_id
    )
      throw Error("TEST_BINDING_MISMATCH");
    const provider = {
      get: async (path: string) => {
        stage = "provider";
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
    const payment = await provider.get("/v1/payments/" + id);
    const intent = await admin
      .from("mp_test_checkouts")
      .select("*")
      .eq("external_reference", payment.external_reference)
      .single();
    if (intent.error) throw Error("REGISTERED_PREFERENCE_REQUIRED");
    const op = await admin
      .from("operations")
      .select("importer_id,payment_mode,workflow_version")
      .eq("id", intent.data.operation_id)
      .single();
    if (
      op.error ||
      op.data.payment_mode !== "mercado_pago_test" ||
      op.data.workflow_version !== "mvp_delivery_v1"
    )
      throw Error("OPERATION_NOT_ALLOWED");
    await reconcileRegisteredPayment({
      intent: intent.data,
      binding: binding.data,
      provider,
      onlyPaymentId: id,
      record: async (payment: unknown) => {
        stage = "storage";
        const r = await admin.rpc("record_mp_test_payment", {
          actor: op.data.importer_id,
          target: intent.data.operation_id,
          payment,
        });
        if (r.error) throw Error("PAYMENT_STORAGE_FAILED");
      },
    });
    return Response.json({ received: true });
  } catch (error) {
    const value = error instanceof Error ? error.message : "WEBHOOK_ERROR";
    const code = /^[A-Z0-9_.-]{1,100}$/.test(value) ? value : "WEBHOOK_ERROR";
    console.warn(JSON.stringify({ event: "mp_mvp_webhook", stage, code }));
    return Response.json({ received: false, stage, code }, { status: 409 });
  }
});
