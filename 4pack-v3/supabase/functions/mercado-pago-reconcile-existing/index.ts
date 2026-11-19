import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import { linkedTestCase as c, verifyLinkedTestPayment } from "../_shared/mercado-pago-linked-test.mjs";

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  let stage = "authorization";
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    if (url !== "https://" + c.project + ".supabase.co" || Deno.env.get("MP_TEST_ENABLED") !== "false") throw Error("TEST_ONLY_CHECKOUT_MUST_BE_DISABLED");
    const session = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } }, auth: { persistSession: false } });
    const auth = await session.auth.getUser(); if (auth.error || !auth.data.user) return new Response(null, { status: 401 });
    const text = await request.text(); if (text.length > 100) return new Response(null, { status: 413 });
    const body = JSON.parse(text);
    if (Object.keys(body).length !== 1 || !["inspect", "reconcile"].includes(body.action)) return new Response(null, { status: 400 });
    const operation = await session.from("operations").select("importer_id,payment_mode,contract_currency").eq("id", c.operation).eq("importer_id", auth.data.user.id).single();
    if (operation.error || operation.data.payment_mode !== "mercado_pago_test" || operation.data.contract_currency !== "ARS") return new Response(null, { status: 403 });
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const settings = await admin.from("mp_test_settings").select("enabled").single();
    if (settings.error || settings.data.enabled !== false) throw Error("CHECKOUT_MUST_BE_DISABLED");
    const intent = await session.from("mp_test_checkouts").select("operation_id,preference_id,preference_state,external_reference,amount,currency").eq("operation_id", c.operation).single();
    if (intent.error) throw Error("EXISTING_INTENT_REQUIRED");
    const calls: Array<{ path: string; status: number }> = [];
    const hashes: Record<string, string> = {};
    async function get(name: string, path: string) {
      stage = name;
      const response = await fetch("https://api.mercadopago.com" + path, { method: "GET", headers: { Authorization: "Bearer " + Deno.env.get("MP_TEST_ACCESS_TOKEN") }, signal: AbortSignal.timeout(15000) });
      calls.push({ path, status: response.status });
      if (!response.ok) throw Error("PROVIDER_HTTP_" + response.status);
      const data = await response.json();
      hashes[name] = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(data))))).map(v => v.toString(16).padStart(2, "0")).join("");
      return data;
    }
    const payment = await get("payment", "/v1/payments/" + c.payment);
    if (!/^\d+$/.test(String(payment.order?.id))) throw Error("ORDER_LINK_MISSING");
    const order = await get("order", "/merchant_orders/" + String(payment.order.id));
    const preference = await get("preference", "/checkout/preferences/" + encodeURIComponent(intent.data.preference_id));
    const seller = await get("seller", "/users/me");
    const buyer = await get("buyer", "/users/" + c.buyer);
    stage = "validation";
    const verified = verifyLinkedTestPayment({ payment, order, preference, seller, buyer, intent: intent.data });
    verified.classification_evidence.checked_at = new Date().toISOString();
    verified.classification_evidence.provider_response_sha256 = hashes;
    if (body.action === "reconcile") {
      stage = "record";
      const result = await admin.rpc("record_mp_test_payment", { actor: auth.data.user.id, target: c.operation, payment: verified });
      if (result.error) throw Object.assign(Error("PAYMENT_STORAGE_FAILED"), { storageCode: result.error.code });
    }
    return Response.json({ action: body.action, operation_id: c.operation, payment_id: c.payment, status: verified.status, live_mode: verified.live_mode, internal_classification: verified.internal_classification, evidence: verified.classification_evidence, calls });
  } catch (error) {
    const e = error as Error & { checks?: Record<string, boolean>; storageCode?: string };
    return Response.json({ error: /^[A-Z_0-9]+$/.test(e.message) ? e.message : "RECONCILIATION_FAILED", stage, ...(e.checks ? { checks: e.checks } : {}), ...(/^[A-Z0-9]{5}$/.test(e.storageCode ?? "") ? { storage_code: e.storageCode } : {}) }, { status: 409 });
  }
});
