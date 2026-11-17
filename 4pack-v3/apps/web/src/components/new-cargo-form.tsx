"use client";

import { requiresHazmatReview } from "@4pack/domain";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useRef, useState } from "react";
import { submitCargoPublication } from "@/app/cargas/nueva/actions";
import Link from "next/link";

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

export function NewCargoForm({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const attempt = useRef<{requestId:string;uploadId:string} | null>(null);
  const [publishedId, setPublishedId] = useState("");
  const [msdsFile, setMsdsFile] = useState<File | null>(null);

  const hazmatReviewRequired = useMemo(
    () => requiresHazmatReview(`${form.title} ${form.description} ${form.category}`),
    [form.category, form.description, form.title]
  );

  function updateField<K extends keyof CargoForm>(field: K, value: CargoForm[K]) {
    attempt.current = null;
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitCargo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      attempt.current ??= {requestId: crypto.randomUUID(), uploadId: crypto.randomUUID()};
      const files = new FormData();
      if (msdsFile) files.set("file", msdsFile);
      const result = await submitCargoPublication({
        title: form.title.trim(), description: form.description.trim(), origin: form.origin.trim(),
        destination: form.destination.trim(), category: form.category.trim(), weight_kg: Number(form.weightKg),
        volume_m3: Number(form.volumeM3), fob_usd: Number(form.fobUsd), preferred_mode: form.preferredMode,
        bidding_deadline: form.biddingDeadline ? new Date(form.biddingDeadline).toISOString() : "",
      }, attempt.current, files);
      if (!result.ok || !result.id) { setError(result.message); return; }
      if (demo) setPublishedId(result.id);
      else { router.replace("/"); router.refresh(); }
    } catch {
      setError("No se pudo completar la solicitud. Reintenta con los mismos datos y archivo.");
    } finally { setLoading(false); }
  }

  return (
    <form className="cargo-form" data-command="cargo" onSubmit={submitCargo}>
      <div className="form-grid">
        <label className="wide">Título<input name="title" onChange={(event) => updateField("title", event.target.value)} required value={form.title} /></label>
        <label>Origen<input name="origin" onChange={(event) => updateField("origin", event.target.value)} placeholder="Guangzhou, China" required value={form.origin} /></label>
        <label>Destino<input name="destination" onChange={(event) => updateField("destination", event.target.value)} placeholder="CABA, Argentina" required value={form.destination} /></label>
        <label>Categoría<input name="category" onChange={(event) => updateField("category", event.target.value)} required value={form.category} /></label>
        <label>Modalidad preferida<select onChange={(event) => updateField("preferredMode", event.target.value as CargoForm["preferredMode"])} value={form.preferredMode}><option value="air">Aéreo</option><option value="sea">Marítimo</option><option value="consolidated">Consolidado</option></select></label>
        <label>Peso (kg)<input min="0.01" name="weight_kg" onChange={(event) => updateField("weightKg", event.target.value)} required step="0.01" type="number" value={form.weightKg} /></label>
        <label>Volumen (m³)<input min="0.001" name="volume_m3" onChange={(event) => updateField("volumeM3", event.target.value)} required step="0.001" type="number" value={form.volumeM3} /></label>
        <label>Valor FOB (USD)<input min="0" name="fob_usd" onChange={(event) => updateField("fobUsd", event.target.value)} required step="0.01" type="number" value={form.fobUsd} /></label>
        <label>Cierre de ofertas<input onChange={(event) => updateField("biddingDeadline", event.target.value)} type="datetime-local" value={form.biddingDeadline} /></label>
        <label className="wide">Descripción<textarea name="description" onChange={(event) => updateField("description", event.target.value)} required rows={5} value={form.description} /></label>
        {hazmatReviewRequired && <label className="wide">Ficha MSDS (PDF, máximo 10 MB)<input accept="application/pdf" name="file" onChange={(event) => { if(attempt.current) attempt.current.uploadId=crypto.randomUUID(); setMsdsFile(event.target.files?.[0] ?? null); }} required type="file" /></label>}
      </div>

      <div className={hazmatReviewRequired ? "hazmat-alert active" : "hazmat-alert"}>
        <strong>{hazmatReviewRequired ? "Revisión HAZMAT requerida" : "Carga general"}</strong>
        <p>{hazmatReviewRequired ? "La descripción contiene un término sensible. Será obligatorio adjuntar MSDS antes de publicar y adjudicar." : "No detectamos términos que requieran documentación HAZMAT adicional."}</p>
      </div>

      {publishedId && <Link href={"/demo/importador/cargas/" + publishedId}>Ver carga publicada</Link>}
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="form-actions"><button className="secondary" onClick={() => router.back()} type="button">Cancelar</button><button disabled={loading} type="submit">{loading ? "Publicando…" : "Publicar carga"}</button></div>
    </form>
  );
}
