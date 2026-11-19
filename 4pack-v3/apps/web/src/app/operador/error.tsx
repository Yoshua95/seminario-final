"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="op-demo-access">
      <section className="op-panel">
        <h1>No pudimos cargar el panel</h1>
        <p>
          Revisá tu conexión e intentá nuevamente. Si el problema continúa,
          contactá al equipo de soporte de 4PACK.
        </p>
        <button className="op-button primary op-section-gap" onClick={reset}>
          Reintentar
        </button>
        <Link className="op-text-link" href="/acceso">
          Volver al acceso
        </Link>
      </section>
    </main>
  );
}
