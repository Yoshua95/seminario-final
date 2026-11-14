"use client";
import type { OperationPhase, GuaranteeStatus, UserRole } from "@4pack/domain";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
export function OperationControls({ operationId, role, phase, guaranteeStatus }: {
  operationId: string; role: UserRole | null; phase: OperationPhase; guaranteeStatus: GuaranteeStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function runRpc(name: string, args: Record<string,string>) {
    setLoading(true); setError("");
    try {
      const client = createSupabaseBrowserClient();
      if (!client) throw new Error("Sin conexión");
      const { error } = await client.rpc(name,args);
      if (error) throw error;
      router.refresh();
    } catch { setError("No pudimos actualizar la operación. Revisá estado y permisos."); }
    finally { setLoading(false); }
  }
  if (role !== "importer") return null;
  const pending = phase === "created" && guaranteeStatus === "pending";
  const delivery = phase === "awaiting_delivery_confirmation";
  if (!pending && !delivery) return null;
  return <div className="operation-control">
    <p>{pending ? "La garantía es una simulación académica. No mueve dinero real." : "Confirmá la recepción para finalizar y liberar el pago simulado."}</p>
    <button disabled={loading} onClick={() => pending
      ? runRpc("simulate_guarantee", {target_operation_id: operationId})
      : runRpc("transition_operation", {target: operationId, next_phase: "completed"})}>
      {loading ? "Actualizando…" : pending ? "Simular garantía de pago" : "Confirmar recepción y finalizar"}
    </button>
    {error && <div className="form-error" role="alert">{error}</div>}
  </div>;
}
