"use client";

import { FormEvent, useState } from "react";
import type { AccountProfile } from "@/lib/dashboard-data";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const roleLabels = { importer: "Importador", operator: "Operador logístico", admin: "Administrador" };
const statusLabels = { pending: "Pendiente de validación", approved: "Operador aprobado", rejected: "Validación rechazada" };

export function ProfileForm({ profile }: { profile: AccountProfile }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      setError("La conexión con Supabase no está disponible.");
      return;
    }

    const { error: profileError } = await supabase.from("profiles").update({
      full_name: String(form.get("fullName")).trim(),
      phone: String(form.get("phone")).trim() || null
    }).eq("id", profile.id);

    let operatorError = null;
    if (!profileError && profile.role === "operator") {
      const result = await supabase.from("operator_profiles").upsert({
        user_id: profile.id,
        company_name: String(form.get("companyName")).trim(),
        tax_id: String(form.get("taxId")).trim(),
        description: String(form.get("description")).trim() || null,
        verification_status: profile.verificationStatus ?? "pending"
      });
      operatorError = result.error;
    }

    setLoading(false);
    if (profileError || operatorError) return setError("No pudimos guardar el perfil. Revisá los datos e intentá nuevamente.");
    setMessage("Perfil actualizado correctamente.");
  }

  return (
    <form className="cargo-form" onSubmit={saveProfile}>
      <div className="profile-status"><div><span>ROL</span><strong>{roleLabels[profile.role]}</strong></div>{profile.verificationStatus && <div><span>ESTADO</span><strong>{statusLabels[profile.verificationStatus]}</strong></div>}</div>
      <div className="form-grid">
        <label>Nombre completo<input defaultValue={profile.fullName} name="fullName" required /></label>
        <label>Teléfono<input defaultValue={profile.phone} name="phone" /></label>
        {profile.role === "operator" && <>
          <label>Empresa<input defaultValue={profile.companyName} name="companyName" required /></label>
          <label>CUIT / identificación fiscal<input defaultValue={profile.taxId} name="taxId" required /></label>
          <label className="wide">Descripción comercial<textarea defaultValue={profile.description} name="description" rows={5} /></label>
        </>}
      </div>
      {error && <div className="form-error profile-message" role="alert">{error}</div>}
      {message && <div className="form-success profile-message">{message}</div>}
      <div className="form-actions"><button disabled={loading} type="submit">{loading ? "Guardando…" : "Guardar perfil"}</button></div>
    </form>
  );
}
