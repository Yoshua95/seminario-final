"use client";

import { requiresHazmatReview } from "@4pack/domain";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type CargoForm = {
  title: string;
  description: string;
  origin: string;
  destination: string;
  category: string;
  weightKg: string;
  volumeM3: string;
  fobUsd: string;
  preferredMode: "air" | "sea" | "consolidated";
  biddingDeadline: string;
};

const initialForm: CargoForm = {
  title: "",
  description: "",
  origin: "",
  destination: "",
  category: "",
  weightKg: "",
  volumeM3: "",
  fobUsd: "",
  preferredMode: "air",
  biddingDeadline: ""
};

export function NewCargoForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const hazmatReviewRequired = useMemo(
    () => requiresHazmatReview(`${form.title} ${form.description} ${form.category}`),
    [form.category, form.description, form.title]
  );

  function updateField<K extends keyof CargoForm>(field: K, value: CargoForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitCargo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

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

    const { error: insertError } = await supabase.from("cargo_requests").insert({
      importer_id: authData.user.id,
      title: form.title.trim(),
      description: form.description.trim(),
      origin: form.origin.trim(),
      destination: form.destination.trim(),
      category: form.category.trim(),
      weight_kg: Number(form.weightKg),
      volume_m3: Number(form.volumeM3),
      fob_usd: Number(form.fobUsd),
      preferred_mode: form.preferredMode,
      status: "open",
      hazmat_review_required: hazmatReviewRequired,
      msds_required: hazmatReviewRequired,
      bidding_deadline: form.biddingDeadline ? new Date(form.biddingDeadline).toISOString() : null
    });

    if (insertError) {
      setError("No pudimos publicar la carga. Revisá los datos e intentá nuevamente.");
      setLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form className="cargo-form" onSubmit={submitCargo}>
      <div className="form-grid">
        <label className="wide">Título<input onChange={(event) => updateField("title", event.target.value)} required value={form.title} /></label>
        <label>Origen<input onChange={(event) => updateField("origin", event.target.value)} placeholder="Guangzhou, China" required value={form.origin} /></label>
        <label>Destino<input onChange={(event) => updateField("destination", event.target.value)} placeholder="CABA, Argentina" required value={form.destination} /></label>
        <label>Categoría<input onChange={(event) => updateField("category", event.target.value)} required value={form.category} /></label>
        <label>Modalidad preferida<select onChange={(event) => updateField("preferredMode", event.target.value as CargoForm["preferredMode"])} value={form.preferredMode}><option value="air">Aéreo</option><option value="sea">Marítimo</option><option value="consolidated">Consolidado</option></select></label>
        <label>Peso (kg)<input min="0.01" onChange={(event) => updateField("weightKg", event.target.value)} required step="0.01" type="number" value={form.weightKg} /></label>
        <label>Volumen (m³)<input min="0.001" onChange={(event) => updateField("volumeM3", event.target.value)} required step="0.001" type="number" value={form.volumeM3} /></label>
        <label>Valor FOB (USD)<input min="0" onChange={(event) => updateField("fobUsd", event.target.value)} required step="0.01" type="number" value={form.fobUsd} /></label>
        <label>Cierre de ofertas<input onChange={(event) => updateField("biddingDeadline", event.target.value)} type="datetime-local" value={form.biddingDeadline} /></label>
        <label className="wide">Descripción<textarea onChange={(event) => updateField("description", event.target.value)} required rows={5} value={form.description} /></label>
      </div>

      <div className={hazmatReviewRequired ? "hazmat-alert active" : "hazmat-alert"}>
        <strong>{hazmatReviewRequired ? "Revisión HAZMAT requerida" : "Carga general"}</strong>
        <p>{hazmatReviewRequired ? "La descripción contiene un término sensible. Será obligatorio adjuntar MSDS antes de adjudicar." : "No detectamos términos que requieran documentación HAZMAT adicional."}</p>
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="form-actions"><button className="secondary" onClick={() => router.back()} type="button">Cancelar</button><button disabled={loading} type="submit">{loading ? "Publicando…" : "Publicar carga"}</button></div>
    </form>
  );
}
