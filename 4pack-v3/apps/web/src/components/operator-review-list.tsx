"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OperatorReview } from "@/lib/dashboard-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const labels = { pending: "Pendiente", approved: "Aprobado", rejected: "Rechazado" };

export function OperatorReviewList({ operators }: { operators: OperatorReview[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  async function updateStatus(userId: string, status: "approved" | "rejected") {
    setBusyId(userId);
    setError("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setBusyId("");
      setError("La conexión con Supabase no está disponible.");
      return;
    }
    const { data: authData } = await supabase.auth.getUser();
    const { error: updateError } = await supabase.from("operator_profiles").update({
      verification_status: status,
      verified_at: new Date().toISOString(),
      verified_by: authData.user?.id
    }).eq("user_id", userId);
    setBusyId("");
    if (updateError) return setError("No pudimos actualizar la validación del operador.");
    router.refresh();
  }

  return <div className="review-list">
    {error && <div className="form-error" role="alert">{error}</div>}
    {operators.map((operator) => <article className="review-card" key={operator.userId}>
      <div><span className={`tag ${operator.verificationStatus === "pending" ? "warning" : ""}`}>{labels[operator.verificationStatus]}</span><h3>{operator.companyName}</h3><p>{operator.fullName} · {operator.taxId}</p><small>{operator.description}</small></div>
      <div className="review-actions"><button className="secondary" disabled={busyId === operator.userId} onClick={() => updateStatus(operator.userId, "rejected")}>Rechazar</button><button disabled={busyId === operator.userId} onClick={() => updateStatus(operator.userId, "approved")}>Aprobar</button></div>
    </article>)}
    {operators.length === 0 && <div className="empty-state"><h3>No hay operadores registrados</h3><p>Las nuevas solicitudes aparecerán en esta pantalla.</p></div>}
  </div>;
}
