"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const roles = [
  { title: "Importador", description: "Publicá cargas, compará ofertas y seguí operaciones." },
  { title: "Operador", description: "Cotizá oportunidades y administrá servicios adjudicados." },
  { title: "Administrador", description: "Validá operadores, comprobantes y estados sensibles." }
];

export default function AccessPage() {
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
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (signInError) {
      setError("No pudimos validar esos datos. Revisalos e intentá nuevamente.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="access-shell">
      <section className="access-intro">
        <Link className="brand" href="/">4PACK<span>●</span></Link>
        <div>
          <p className="eyebrow">LOGÍSTICA CHINA–ARGENTINA</p>
          <h1>Una operación clara comienza con un acceso seguro.</h1>
          <p className="access-copy">Cada actor visualiza únicamente la información y las acciones correspondientes a su rol.</p>
        </div>
        <div className="role-grid">
          {roles.map((role) => <article key={role.title}><strong>{role.title}</strong><p>{role.description}</p></article>)}
        </div>
      </section>
      <section className="access-panel">
        <div className="access-card">
          <p className="eyebrow">BIENVENIDO</p>
          <h2>Ingresá a 4PACK</h2>
          <p>Usá las credenciales asociadas con tu organización.</p>
          <form onSubmit={handleSubmit}>
            <label>Correo electrónico<input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
            <label>Contraseña<input autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="access-submit" disabled={loading} type="submit">{loading ? "Validando…" : "Ingresar"}</button>
          </form>
        </div>
      </section>
    </main>
  );
}
