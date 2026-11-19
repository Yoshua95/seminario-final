"use client";
import { useActionState, type ReactNode } from "react";
import { adminAction } from "./actions";
export function AdminForm({
  demo,
  children,
  label = "Registrar decisión",
}: {
  demo: boolean;
  children: ReactNode;
  label?: string;
}) {
  const [state, action, pending] = useActionState(
    adminAction.bind(null, demo),
    { ok: false, message: "" },
  );
  return (
    <form action={action} className="op-form admin-decision">
      {children}
      <button className="op-button" disabled={pending}>
        {pending ? "Guardando…" : label}
      </button>
      {state.message && (
        <p role={state.ok ? "status" : "alert"}>{state.message}</p>
      )}
    </form>
  );
}
