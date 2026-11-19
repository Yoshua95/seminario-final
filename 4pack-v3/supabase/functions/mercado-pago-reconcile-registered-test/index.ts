import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import { verifyLinkedTestPayment } from "../_shared/mercado-pago-linked-test.mjs";

// No checkout creation or provider mutations. Test project and owner-confirmed test identities only.
Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  let stage = "authorization";
  try {
    const project = "umiracgmhjglqoftoljn",
      url = Deno.env.get("SUPABASE_URL")!;
    if (
      url !== `https://${project}.supabase.co` ||
      Deno.env.get("MP_TEST_ENABLED") !== "false"
    )
      throw Error("TEST_ONLY_CHECKOUT_MUST_BE_DISABLED");
    const session = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: {
        headers: { Authorization: request.headers.get("Authorization") ?? "" },
      },
      auth: { persistSession: false },
    });
    const auth = await session.auth.getUser();
    if (auth.error || !auth.data.user)
      return new Response(null, { status: 401 });
    const text = await request.text();
    if (text.length > 256) return new Response(null, { status: 413 });
    const body = JSON.parse(text);
    if (
      Object.keys(body).some((k) => !["action", "operation_id"].includes(k)) ||
      !["inspect", "reconcile"].includes(body.action) ||
      typeof body.operation_id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        body.operation_id,
      )
    )
      return new Response(null, { status: 400 });
    if (body.operation_id !== Deno.env.get("MP_TEST_SYNC_OPERATION_ID"))
      return new Response(null, { status: 403 });
    const op = await session
      .from("operations")
      .select("importer_id,payment_mode,contract_currency")
      .eq("id", body.operation_id)
      .eq("importer_id", auth.data.user.id)
      .single();
    if (
      op.error ||
      op.data.payment_mode !== "mercado_pago_test" ||
      op.data.contract_currency !== "ARS"
    )
      return new Response(null, { status: 403 });
    const admin = createClient(
      url,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const setting = await admin
      .from("mp_test_settings")
      .select("enabled")
      .single();
    if (setting.error || setting.data.enabled !== false)
      throw Error("CHECKOUT_MUST_BE_DISABLED");
    const stored = await session
      .from("mp_test_checkouts")
      .select(
        "operation_id,external_reference,preference_id,preference_state,amount,currency",
      )
      .eq("operation_id", body.operation_id)
      .single();
    if (
      stored.error ||
      stored.data.preference_state !== "ready" ||
      !stored.data.preference_id ||
      stored.data.currency !== "ARS" ||
      Number(stored.data.amount) <= 0
    )
      throw Error("REGISTERED_PREFERENCE_REQUIRED");
    const intent = stored.data,
      sellerId = "3858067934",
      buyerId = "3858067936";
    if (Deno.env.get("MP_TEST_SELLER_ID") !== sellerId)
      throw Error("TEST_SELLER_REQUIRED");
    const hashes: Record<string, string> = {},
      calls: Array<{ path: string; status: number }> = [];
    async function get(name: string, path: string) {
      stage = name;
      const r = await fetch("https://api.mercadopago.com" + path, {
        method: "GET",
        headers: {
          Authorization: "Bearer " + Deno.env.get("MP_TEST_ACCESS_TOKEN"),
        },
        signal: AbortSignal.timeout(15000),
      });
      calls.push({ path, status: r.status });
      if (!r.ok) throw Error("PROVIDER_HTTP_" + r.status);
      const value = await r.json();
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
      typeof search.paging?.total !== "number" ||
      search.paging.total !== search.results.length ||
      search.results.length > 100
    )
      throw Error("PAYMENT_SEARCH_INCOMPLETE");
    const preference = await get(
        "preference",
        "/checkout/preferences/" + encodeURIComponent(intent.preference_id),
      ),
      seller = await get("seller", "/users/me"),
      buyer = await get("buyer", "/users/" + buyerId);
    const verified = [];
    for (const hit of search.results) {
      if (!/^\d+$/.test(String(hit.id))) throw Error("INVALID_PAYMENT_ID");
      const payment = await get("payment", "/v1/payments/" + hit.id);
      if (!/^\d+$/.test(String(payment.order?.id)))
        throw Error("ORDER_LINK_MISSING");
      const order = await get("order", "/merchant_orders/" + payment.order.id);
      stage = "validation";
      const result = verifyLinkedTestPayment(
        { payment, order, preference, seller, buyer, intent },
        {
          project,
          operation: intent.operation_id,
          payment: String(payment.id),
          preference: intent.preference_id,
          reference: intent.external_reference,
          seller: sellerId,
          buyer: buyerId,
          amount: Number(intent.amount),
        },
      );
      result.classification_evidence.checked_at = new Date().toISOString();
      result.classification_evidence.provider_response_sha256 = { ...hashes };
      verified.push(result);
    }
    // Validate every returned payment before recording any; no partial writes on a discrepancy.
    if (body.action === "reconcile") {
      const allowedPayment = Deno.env.get("MP_TEST_RECONCILE_PAYMENT_ID");
      const selected = verified.filter(p => p.id === allowedPayment);
      if (!/^\d+$/.test(allowedPayment ?? "") || selected.length !== 1)
        throw Error("EXISTING_PAYMENT_ALLOWLIST_REQUIRED");
      for (const payment of selected) {
        stage = "record";
        const r = await admin.rpc("record_mp_test_payment", {
          actor: auth.data.user.id,
          target: intent.operation_id,
          payment,
        });
        if (r.error)
          throw Object.assign(Error("PAYMENT_STORAGE_FAILED"), {
            storageCode: r.error.code,
          });
      }
    }
    stage = "result";
    const current = await session.from("mp_test_checkouts").select("status,checked_at").eq("operation_id",intent.operation_id).single();
    if(current.error || typeof current.data?.status !== "string") throw Error("PAYMENT_STATUS_UNAVAILABLE");
    return Response.json({
      status: current.data.status,
      checkout_url: null,
      checked_at: current.data.checked_at,
      action: body.action,
      operation_id: intent.operation_id,
      preference_id: intent.preference_id,
      payments: verified.map((p) => ({
        payment_id: p.id,
        status: p.status,
        live_mode: p.live_mode,
        classification: p.internal_classification,
        evidence: p.classification_evidence,
      })),
      calls,
    });
  } catch (error) {
    const e = error as Error & {
      checks?: Record<string, boolean>;
      storageCode?: string;
    };
    return Response.json(
      {
        error: /^[A-Z_0-9]+$/.test(e.message)
          ? e.message
          : "RECONCILIATION_FAILED",
        stage,
        ...(e.checks ? { checks: e.checks } : {}),
        ...(/^[A-Z0-9]{5}$/.test(e.storageCode ?? "")
          ? { storage_code: e.storageCode }
          : {}),
      },
      { status: 409 },
    );
  }
});
