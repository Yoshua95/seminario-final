"use client";

import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AccessForm({ admin = false }: { admin?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("La conexión segura todavía no fue configurada.");
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (signInError) {
      setError(
        "No pudimos validar esos datos. Revisalos e intentá nuevamente.",
      );
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", auth.user?.id ?? "")
      .single();
    if (profile?.role !== (admin ? "admin" : "operator")) {
      await supabase.auth.signOut();
      setError(
        admin
          ? "Esta cuenta no tiene acceso administrativo."
          : "Este acceso es exclusivo del operador. El importador usa Android.",
      );
      return;
    }
    router.replace(admin ? "/admin" : "/operador/oportunidades");
    router.refresh();
  }

  return (
    <main className="access-shell">
      <section className="access-intro">
        <Link className="brand" href="/">
          <BrandMark />
        </Link>
        <div>
          <p className="eyebrow">LOGÍSTICA CHINA–ARGENTINA</p>
          <h1>{admin ? "Acceso administrativo" : "Ingresar como operador"}</h1>
          <p className="access-copy">
            Cada actor visualiza únicamente la información y las acciones
            correspondientes a su rol.
          </p>
        </div>
      </section>
      <section className="access-panel">
        <div className="access-card">
          <p className="eyebrow">BIENVENIDO</p>
          <h2>Ingresá a 4PACK</h2>
          <p>Usá las credenciales asociadas con tu organización.</p>
          {process.env.NODE_ENV !== "production" && (
            <p>
              <Link href="/demo/acceso" className="op-text-link">
                Revisar demostración local persistente →
              </Link>
            </p>
          )}
          <form onSubmit={handleSubmit}>
            <label>
              Correo electrónico
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <label>
              Contraseña
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button className="access-submit" disabled={loading} type="submit">
              {loading ? "Validando…" : "Ingresar"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
