"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AwardOfferButton({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function awardOffer() {
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      setError("No hay conexión disponible.");
      return;
    }

    const { error: awardError } = await supabase.rpc("award_offer", { target_offer_id: offerId });
    setLoading(false);
    if (awardError) {
      setError("No pudimos adjudicar la oferta. Verificá que la carga siga abierta.");
      return;
    }
    router.push("/operaciones");
    router.refresh();
  }

  return <div><button className="award-button" disabled={loading} onClick={awardOffer} type="button">{loading ? "Adjudicando…" : "Adjudicar"}</button>{error && <div className="form-error offer-error" role="alert">{error}</div>}</div>;
}
