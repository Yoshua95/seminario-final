import { supabase } from "./supabase";

export async function testPayment(
  operationId: string,
  action: "checkout" | "sync",
) {
  if (!supabase) throw new Error("La conexión no está disponible.");
  const { data, error } = await supabase.functions.invoke("mercado-pago-test", {
    body: { operation_id: operationId, action },
  });
  if (error || !data || typeof data.status !== "string") {
    if (error?.context instanceof Response) {
      const response = await error.context.json().catch(() => null);
      if (typeof response?.error === "string") throw new Error(response.error);
    }
    throw new Error(
      "No se pudo consultar Mercado Pago de prueba. El retorno no confirma el pago.",
    );
  }
  if (action === "checkout" && data.checkout_url) {
    const url = new URL(data.checkout_url);
    const legacy =
      url.hostname === "sandbox.mercadopago.com" &&
      url.pathname.startsWith("/mla/checkout/");
    const argentina =
      /^https:\/\/sandbox\.mercadopago\.com\.ar\/checkout\/v1\/redirect(?:\?[^\s#]*)?$/.test(
        data.checkout_url,
      );
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !(legacy || argentina)
    )
      throw new Error("Checkout de prueba no válido.");
  }
  return data as {
    status: string;
    checkout_url: string | null;
    checked_at?: string;
  };
}
