"use client";
import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { rehearsalAction } from "./actions";
export function RehearsalForm({
  command,
  label,
  children,
  linkBase,
  linkLabel,
}: {
  command: string;
  label: string;
  children: ReactNode;
  linkBase?: string;
  linkLabel?: string;
}) {
  const [state, action, pending] = useActionState(
    rehearsalAction.bind(null, command),
    { ok: false, message: "" },
  );
  return (
    <form action={action} className="op-form" data-command={command}>
      {children}
      <button className="op-button" disabled={pending}>
        {label}
      </button>
      {state.message && (
        <p role={state.ok ? "status" : "alert"}>{state.message}</p>
      )}
      {state.ok && state.id && linkBase && (
        <Link className="op-button secondary" href={linkBase + "/" + state.id}>
          {linkLabel ?? "Ver detalle"}
        </Link>
      )}
    </form>
  );
}
