import Link from "next/link";
import { sameQuoteScope } from "@4pack/domain";
import { QuoteTerms } from "@/features/marketplace/quote-terms";
import { notFound } from "next/navigation";
import { AwardOfferButton } from "@/components/award-offer-button";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCargoOfferComparison, getCurrentRole } from "@/lib/dashboard-data";

const modeLabel = { air: "Aéreo", sea: "Marítimo", consolidated: "Consolidado" };

export default async function OfferComparisonPage({ params }: { params: Promise<{ cargoId: string }> }) {
  const { cargoId } = await params;
  const [cargo, role] = await Promise.all([getCargoOfferComparison(cargoId), getCurrentRole()]);
  if (!cargo || role !== "importer") notFound();
  const canAward = cargo.status === "open";

  return (
    <DashboardShell active="offers">
      <header><div><p className="eyebrow">COMPARADOR DE OFERTAS</p><h1>{cargo.title}</h1><p>{cargo.route} · Propuestas ordenadas por costo total.</p></div></header>
      {!canAward && <div className="comparison-notice">Esta carga ya fue adjudicada y no admite nuevas selecciones.</div>}
      {cargo.offers.length>1 && cargo.offers.some(o=>!sameQuoteScope(cargo.offers[0].normalizedQuote,o.normalizedQuote)) && <p className="op-notice warning" role="status">Alcances diferentes: estos precios no son directamente equivalentes. Revisá incluidos, exclusiones y cobertura.</p>}
      {new Set(cargo.offers.map(o=>o.currency)).size>1&&<p className="op-notice warning">Monedas diferentes: los precios se presentan por separado, sin conversión ni suma.</p>}
      <div className="comparison-grid">
        {cargo.offers.map((offer, index) => <article className={`comparison-card ${index === 0 && cargo.offers.every(o => o.currency === offer.currency && sameQuoteScope(offer.normalizedQuote,o.normalizedQuote)) ? "best" : ""}`} key={offer.id}>
          <div>{index === 0 && cargo.offers.every(o => o.currency === offer.currency) && <span className="tag">MEJOR PRECIO</span>}<h3>{offer.publicProfileId?<Link href={"/operadores/"+offer.publicProfileId}>{offer.companyName}</Link>:offer.companyName}</h3><p>{offer.operatorName} · {offer.rating === null ? "Sin historial" : offer.rating.toFixed(1) + " ★"} ({offer.ratingsCount} evaluaciones) · {offer.completedOperations} operaciones</p><small>{offer.terms}</small></div>
          <div className="comparison-value"><span>Modalidad</span><strong>{modeLabel[offer.mode]}</strong></div>
          <div className="comparison-value"><span>Entrega</span><strong>{offer.estimatedDays} días</strong></div>
          <QuoteTerms quote={offer.normalizedQuote} />
          <div className="comparison-value"><span>Total</span><strong>{offer.currency} {offer.totalUsd.toLocaleString("es-AR")}</strong></div>
          {canAward && offer.status === "submitted" && !!offer.normalizedQuote && Date.parse(offer.validUntil)>Date.now() ? <AwardOfferButton offerId={offer.id} /> : <span className="tag">{offer.status === "accepted" ? "ADJUDICADA" : "CERRADA"}</span>}
        </article>)}
        {cargo.offers.length === 0 && <div className="empty-state"><h3>Esta carga todavía no recibió ofertas</h3><p>Las propuestas aparecerán aquí para compararlas.</p></div>}
      </div>
    </DashboardShell>
  );
}
