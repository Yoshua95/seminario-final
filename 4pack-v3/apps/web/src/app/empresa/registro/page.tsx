"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { CompanyApplication } from "@/features/operator/company-application";
export default function OperatorRegistration() {
  const [confirmed, setConfirmed] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const client = createSupabaseBrowserClient();
    if (!client) return;
    void (async () => {
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const r = await client.auth.exchangeCodeForSession(code);
        if (r.error)
          setMessage("No se pudo confirmar el enlace. Solicitá uno nuevo.");
        else window.history.replaceState({}, "", "/empresa/registro");
      }
      const r = await client.auth.getUser();
      setConfirmed(!!r.data.user?.email_confirmed_at);
    })();
    const { data } = client.auth.onAuthStateChange((_event, session) =>
      setConfirmed(!!session?.user.email_confirmed_at),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  return (
    <main className="access-shell">
      <section className="access-intro">
        <Link className="brand" href="/">
          <BrandMark />
        </Link>
        <h1>Registrá tu empresa</h1>
        <p>
          Confirmá tu correo y presentá la ficha. Podrás cotizar cuando
          Administración habilite tus rutas y servicios.
        </p>
        <Link href="/acceso">Ya tengo cuenta</Link>
      </section>
      <section className="access-panel">
        {confirmed ? (
          <CompanyApplication />
        ) : (
          <form
            className="op-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget),
                client = createSupabaseBrowserClient();
              if (!client) {
                setMessage("Conexión no configurada.");
                return;
              }
              setBusy(true);
              try {
                const r = await client.auth.signUp({
                  email: String(data.get("email")),
                  password: String(data.get("password")),
                  options: {
                    data: { full_name: String(data.get("name")) },
                    emailRedirectTo:
                      window.location.origin + "/empresa/registro",
                  },
                });
                if (r.error)
                  throw Error(
                    "No se pudo crear la cuenta. Revisá tus datos o usá el acceso existente.",
                  );
                setConfirmed(!!r.data.user?.email_confirmed_at);
                setMessage(
                  "Revisá tu correo y abrí el enlace de confirmación para continuar con la ficha.",
                );
              } catch (error) {
                setMessage(
                  error instanceof Error
                    ? error.message
                    : "No se pudo crear la cuenta.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <h2>Crear cuenta de empresa</h2>
            <label>
              Responsable
              <input name="name" required minLength={3} />
            </label>
            <label>
              Correo
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <label>
              Contraseña
              <input
                name="password"
                type="password"
                minLength={12}
                required
                autoComplete="new-password"
              />
            </label>
            <p>
              La contraseña requiere al menos 12 caracteres. No compartas claves
              personales.
            </p>
            {message && <p role="status">{message}</p>}
            <button className="op-button primary" disabled={busy}>
              {busy ? "Creando…" : "Crear cuenta y confirmar correo"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
