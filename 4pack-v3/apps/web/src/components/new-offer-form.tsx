"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type CargoOption = {
  id: string;
  title: string;
  origin: string;
  destination: string;
};

export function NewOfferForm({ cargoOptions }: { cargoOptions: CargoOption[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("La conexión con Supabase no está disponible.");
      setLoading(false);
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      router.replace("/acceso");
      return;
    }

    const validUntil = String(form.get("validUntil"));
    if (new Date(validUntil).getTime() <= Date.now()) {
      setError("La vigencia de la oferta debe ser posterior al momento actual.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("offers").insert({
      cargo_id: String(form.get("cargoId")),
      operator_id: authData.user.id,
      mode: String(form.get("mode")),
      freight_usd: Number(form.get("freightUsd")),
      customs_usd: Number(form.get("customsUsd")),
      other_costs_usd: Number(form.get("otherCostsUsd")),
      estimated_days: Number(form.get("estimatedDays")),
      includes_customs: form.get("includesCustoms") === "on",
      terms: String(form.get("terms")).trim(),
      valid_until: new Date(validUntil).toISOString(),
      status: "submitted"
    });

    if (insertError) {
      setError(insertError.code === "23505" ? "Ya existe una oferta tuya para esa carga y modalidad." : "No pudimos registrar la oferta. Revisá los datos y la vigencia de la carga.");
      setLoading(false);
      return;
    }

    router.replace("/ofertas");
    router.refresh();
  }

  if (cargoOptions.length === 0) {
    return <div className="empty-state"><h3>No hay cargas abiertas para cotizar</h3><p>Cuando un importador publique una solicitud vigente, aparecerá en esta pantalla.</p></div>;
  }

  return (
    <form className="cargo-form" onSubmit={submitOffer}>
      <div className="form-grid">
        <label className="wide">Carga<select name="cargoId" required>{cargoOptions.map((cargo) => <option key={cargo.id} value={cargo.id}>{cargo.title} · {cargo.origin} → {cargo.destination}</option>)}</select></label>
        <label>Modalidad<select name="mode" required><option value="air">Aéreo</option><option value="sea">Marítimo</option><option value="consolidated">Consolidado</option></select></label>
        <label>Tiempo estimado (días)<input min="1" name="estimatedDays" required type="number" /></label>
        <label>Flete (USD)<input min="0" name="freightUsd" required step="0.01" type="number" /></label>
        <label>Aduana (USD)<input defaultValue="0" min="0" name="customsUsd" required step="0.01" type="number" /></label>
        <label>Otros costos (USD)<input defaultValue="0" min="0" name="otherCostsUsd" required step="0.01" type="number" /></label>
        <label>Válida hasta<input name="validUntil" required type="datetime-local" /></label>
        <label className="checkbox-field"><input name="includesCustoms" type="checkbox" /> Incluye gestión aduanera</label>
        <label className="wide">Condiciones<textarea name="terms" required rows={5} /></label>
      </div>
      {error && <div className="form-error offer-error" role="alert">{error}</div>}
      <div className="form-actions"><button className="secondary" onClick={() => router.back()} type="button">Cancelar</button><button disabled={loading} type="submit">{loading ? "Enviando…" : "Enviar oferta"}</button></div>
    </form>
  );
}
