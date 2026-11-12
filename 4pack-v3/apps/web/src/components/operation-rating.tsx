"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function OperationRating({ operationId, recipientId, recipientName, existingRating }: { operationId: string; recipientId: string; recipientName: string; existingRating: { score: number; comment: string } | null }) {
  const router = useRouter();
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submitRating(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return setError("No hay conexión disponible.");
    setLoading(true);
    setError("");
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setLoading(false);
      setError("La sesión no está disponible.");
      return;
    }
    const { error: ratingError } = await supabase.from("ratings").insert({ operation_id: operationId, author_id: authData.user.id, recipient_id: recipientId, score, comment: comment.trim() || null });
    setLoading(false);
    if (ratingError) {
      setError("No pudimos registrar la calificación. Cada participante puede calificar una sola vez al finalizar.");
      return;
    }
    router.refresh();
  }

  if (existingRating) return <section className="rating-panel"><p className="eyebrow">REPUTACIÓN</p><h3>Calificación enviada</h3><div className="stars" aria-label={`${existingRating.score} de 5 estrellas`}>{"★".repeat(existingRating.score)}{"☆".repeat(5 - existingRating.score)}</div><p>{existingRating.comment || "Sin comentario"}</p></section>;

  return <form className="rating-panel" onSubmit={submitRating}><p className="eyebrow">REPUTACIÓN BILATERAL</p><h3>Calificá a {recipientName}</h3><div className="rating-options">{[1, 2, 3, 4, 5].map((value) => <button aria-label={`${value} estrellas`} className={score === value ? "selected" : ""} key={value} onClick={() => setScore(value)} type="button">★</button>)}</div><textarea maxLength={500} onChange={(event) => setComment(event.target.value)} placeholder="Contá brevemente cómo fue la experiencia" value={comment} /><button disabled={loading} type="submit">{loading ? "Guardando…" : "Enviar calificación"}</button>{error && <div className="form-error" role="alert">{error}</div>}</form>;
}
