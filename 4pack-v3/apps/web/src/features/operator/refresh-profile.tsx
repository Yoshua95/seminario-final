"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
export function RefreshProfile() {
  const router = useRouter(),
    [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="op-button secondary small"
      onClick={() => start(() => router.refresh())}
      disabled={pending}
    >
      {pending ? "Actualizando…" : "Actualizar perfil y capital"}
    </button>
  );
}
