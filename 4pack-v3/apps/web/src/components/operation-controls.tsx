"use client";

import type { CargoStatus, GuaranteeStatus, UserRole } from "@4pack/domain";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const nextStep: Partial<Record<CargoStatus, { status: CargoStatus; label: string; title: string }>> = {
  awarded: { status: "in_transit", label: "Iniciar tránsito", title: "Carga en tránsito" },
  in_transit: { status: "customs", label: "Registrar aduana", title: "Carga en aduana" },
  customs: { status: "delivered", label: "Confirmar entrega", title: "Carga entregada" }
};

export function OperationControls({ operationId, role, status, guaranteeStatus }: { operationId: string; role: UserRole | null; status: CargoStatus; guaranteeStatus: GuaranteeStatus }) {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const step = nextStep[status];

  async function runRpc(name: "simulate_guarantee" | "advance_operation", args: Record<string, string | null>) {
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      setError("No hay conexión disponible.");
      return;
    }
    const { error: rpcError } = await supabase.rpc(name, args);
    setLoading(false);
    if (rpcError) {
      setError("No pudimos actualizar la operación. Revisá el estado actual.");
      return;
    }
    setLocation("");
    router.refresh();
  }

  if (role === "importer" && guaranteeStatus === "pending") {
    return <div className="operation-control"><p>Confirmá la garantía académica para habilitar el traslado. No mueve dinero real.</p><button disabled={loading} onClick={() => runRpc("simulate_guarantee", { target_operation_id: operationId })}>{loading ? "Confirmando…" : "Simular garantía de pago"}</button>{error && <div className="form-error">{error}</div>}</div>;
  }

  if (role === "operator" && step) {
    return <div className="operation-control"><input aria-label="Ubicación del hito" onChange={(event) => setLocation(event.target.value)} placeholder="Ubicación del hito" value={location} /><button disabled={loading || guaranteeStatus !== "held_simulated"} onClick={() => runRpc("advance_operation", { target_operation_id: operationId, next_status: step.status, event_title: step.title, event_location: location || null })}>{loading ? "Actualizando…" : step.label}</button>{guaranteeStatus !== "held_simulated" && <p>La operación se habilita cuando el importador confirma la garantía simulada.</p>}{error && <div className="form-error">{error}</div>}</div>;
  }

  return null;
}
