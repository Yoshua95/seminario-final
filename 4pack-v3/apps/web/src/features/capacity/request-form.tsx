"use client";
import { useActionState } from "react";
import { requestCapital } from "./request-action";
export function CapitalRequestForm({
  demo,
  requestKey,
  documents,
}: {
  demo: boolean;
  requestKey: string;
  documents: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(
    requestCapital.bind(null, demo),
    { ok: false, message: "" },
  );
  return (
    <form action={action} className="op-form">
      <input name="request_key" type="hidden" value={requestKey} />
      <label>
        Nuevo capital total solicitado · ARS
        <input name="total" type="number" min="0.01" step="0.01" required />
      </label>
      <p>
        Elegí la documentación vigente de tu empresa. Para adjuntar otra, usá
        Perfil empresarial.
      </p>
      {documents.map((d) => (
        <label key={d.id}>
          <input name="documents" type="checkbox" value={d.id} />
          {d.name}
        </label>
      ))}
      {documents.length === 0 && (
        <p>
          Primero adjuntá la documentación y esperá su validación
          administrativa.
        </p>
      )}
      <button className="op-button" disabled={pending || !documents.length}>
        {pending ? "Enviando…" : "Solicitar ampliación"}
      </button>
      {state.message && (
        <p role={state.ok ? "status" : "alert"}>{state.message}</p>
      )}
    </form>
  );
}
