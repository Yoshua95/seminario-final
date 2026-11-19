"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { assertNewContractCurrency } from "@4pack/domain";

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

    const offer=await supabase.from("offers").select("payment_currency").eq("id",offerId).single();
    try {if(offer.error)throw offer.error;assertNewContractCurrency(offer.data.payment_currency);}catch{setError("Las nuevas adjudicaciones deben contratarse en ARS.");setLoading(false);return;}
    const { error: awardError } = await supabase.rpc("award_offer", { target_offer_id: offerId });
    setLoading(false);
    if (awardError) {
      const capacityMessage = "El operador no dispone actualmente de capacidad suficiente para asumir esta operación.";
      setError(awardError.code === "P0001" && awardError.message === capacityMessage
        ? capacityMessage
        : "No pudimos adjudicar la oferta. Verificá que la carga siga abierta.");
      return;
    }
    router.push("/operaciones");
    router.refresh();
  }

  return <div><button className="award-button" disabled={loading} onClick={awardOffer} type="button">{loading ? "Adjudicando…" : "Adjudicar"}</button>{error && <div className="form-error offer-error" role="alert">{error}</div>}</div>;
}
