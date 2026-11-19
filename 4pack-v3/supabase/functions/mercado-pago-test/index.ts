import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import {
  createTestProvider,
  runTestCheckout,
  diagnosticStage,
} from "../_shared/mercado-pago-test.mjs";

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const enabled = Deno.env.get("MP_TEST_ENABLED") === "true";
  const configuredSyncOperation = Deno.env.get("MP_TEST_SYNC_OPERATION_ID");
  const syncOperation =
    configuredSyncOperation &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      configuredSyncOperation,
    )
      ? configuredSyncOperation
      : undefined;
  if (!enabled && !syncOperation)
    return Response.json(
      { error: "Pagos de prueba no configurados" },
      { status: 503 },
    );
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const session = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: {
        headers: { Authorization: request.headers.get("Authorization") ?? "" },
      },
      auth: { persistSession: false },
    });
    const {
      data: { user },
      error,
    } = await session.auth.getUser();
    if (error || !user)
      return Response.json({ error: "Sesion requerida" }, { status: 401 });
    if (Number(request.headers.get("content-length")) > 2048)
      return new Response(null, { status: 413 });
    const text = await request.text();
    if (text.length > 2048) return new Response(null, { status: 413 });
    const body = JSON.parse(text);
    if (
      !["checkout", "sync", "inspect"].includes(body.action) ||
      typeof body.operation_id !== "string" ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
        body.operation_id,
      ) ||
      Object.keys(body).some((k) => !["action", "operation_id"].includes(k))
    )
      return Response.json({ error: "Solicitud invalida" }, { status: 400 });
    if (
      !enabled &&
      (!["sync", "inspect"].includes(body.action) ||
        (body.operation_id !== syncOperation &&
          !(
            body.action === "sync" &&
            body.operation_id === "be3e0432-3802-4dff-bc30-e2819894ad10"
          )))
    )
      return Response.json(
        { error: "Creacion de checkouts desactivada" },
        { status: 503 },
      );
    // Recovery bridge for the one verified, existing test-account payment.
    // It cannot claim/create preferences and revalidates the owner/provider link
    // in the case-bound function. The configured allowlist remains server-owned.
    if (
      !enabled &&
      body.action === "sync" &&
      (body.operation_id === syncOperation ||
        body.operation_id === "be3e0432-3802-4dff-bc30-e2819894ad10")
    ) {
      if (url !== "https://umiracgmhjglqoftoljn.supabase.co")
        return Response.json(
          { error: "Entorno de prueba requerido" },
          { status: 503 },
        );
      const legacy =
        body.operation_id === "be3e0432-3802-4dff-bc30-e2819894ad10";
      const response = await fetch(
        url +
          "/functions/v1/" +
          (legacy
            ? "mercado-pago-reconcile-existing"
            : "mercado-pago-reconcile-registered-test"),
        {
          method: "POST",
          headers: {
            Authorization: request.headers.get("Authorization") ?? "",
            apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            legacy
              ? { action: "reconcile" }
              : { action: "reconcile", operation_id: body.operation_id },
          ),
          signal: AbortSignal.timeout(60000),
        },
      );
      return new Response(await response.text(), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }
    const admin = createClient(
      // Inspection is gated separately below and never writes a payment.
      url,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const rpc = async (name: string, args: Record<string, unknown>) => {
      const r = await admin.rpc(name, args);
      if (r.error) {
        const error = Object.assign(Error("PAYMENT_STORAGE_FAILED"), {
          storageCode: r.error.code,
        });
        throw error;
      }
      return r.data;
    };
    const store = {
      async operation(actor: string, id: string) {
        const r = await session
          .from("operations")
          .select("id,payment_mode,contract_currency")
          .eq("id", id)
          .eq("importer_id", actor)
          .single();
        if (r.error) throw Error("OPERATION_FORBIDDEN");
        return r.data;
      },
      claim: (actor: string, id: string) =>
        rpc("claim_mp_test_checkout", { actor, target: id }),
      save: (
        actor: string,
        id: string,
        p: { preference: string; checkout: string },
      ) => rpc("save_mp_test_preference", { actor, target: id, ...p }),
      async intent(_actor: string, id: string) {
        const r = await session
          .from("mp_test_checkouts")
          .select("*")
          .eq("operation_id", id)
          .maybeSingle();
        if (r.error) throw Error("PAYMENT_STORAGE_FAILED");
        return r.data;
      },
      record: (actor: string, id: string, payment: unknown) =>
        rpc("record_mp_test_payment", { actor, target: id, payment }),
    };
    const requestId = crypto.randomUUID();
    const diagnostics = (event: Record<string, unknown>) =>
      console.info(
        JSON.stringify({
          event: "mp_test_diagnostic",
          request_id: requestId,
          operation_id: body.operation_id,
          ...event,
        }),
      );
    const provider = await diagnosticStage(
      diagnostics,
      "provider.configuration",
      () =>
        createTestProvider({
          token: Deno.env.get("MP_TEST_ACCESS_TOKEN"),
          sellerId: Deno.env.get("MP_TEST_SELLER_ID"),
          returnBase: Deno.env.get("MP_TEST_RETURN_BASE"),
          diagnostics,
        }),
    );
    if (body.action === "inspect") {
      const inspectPaymentId = Deno.env.get("MP_TEST_INSPECT_PAYMENT_ID");
      if (
        body.operation_id !== syncOperation ||
        !/^\d+$/.test(inspectPaymentId ?? "")
      )
        return Response.json(
          { error: "Inspeccion no configurada" },
          { status: 503 },
        );
      await store.operation(user.id, body.operation_id);
      const intent = await store.intent(user.id, body.operation_id);
      if (!intent?.preference_id || intent.preference_state !== "ready")
        throw Error("EXISTING_PREFERENCE_REQUIRED");
      await provider.assertTestSeller();
      return Response.json(
        await provider.inspectExistingPayment(intent, inspectPaymentId),
      );
    }
    const result = await runTestCheckout({
      action: body.action,
      actor: user.id,
      operationId: body.operation_id,
      store,
      provider,
      diagnostics,
      requireExistingPreference: !enabled,
    });
    return Response.json(result);
  } catch (error) {
    const diagnostic =
      error instanceof Error
        ? (error as Error & { diagnostic?: Record<string, unknown> }).diagnostic
        : undefined;
    if (
      error instanceof Error &&
      error.message === "CHECKOUT_CREATION_UNCERTAIN"
    ) {
      return Response.json(
        {
          error:
            "El checkout está en preparación o requiere revisión administrativa. No inicies otro pago para esta operación.",
        },
        { status: 409 },
      );
    }
    // Never echo provider response bodies, tokens, user details or DB internals.
    return Response.json(
      {
        error:
          "No se pudo verificar el pago de prueba. Reintenta desde la operacion; no se confirmo por el retorno.",
        ...(diagnostic ? { diagnostic } : {}),
      },
      { status: 409 },
    );
  }
});
