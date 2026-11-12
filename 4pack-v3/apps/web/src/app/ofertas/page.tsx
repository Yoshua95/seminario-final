import { DashboardShell } from "@/components/dashboard-shell";
import { offers, opportunities } from "@/data/demo";

const modeLabel = { air: "Aéreo", sea: "Marítimo", consolidated: "Consolidado" };

export default function OffersPage() {
  return (
    <DashboardShell active="offers">
      <header>
        <div><p className="eyebrow">LICITACIÓN INVERSA</p><h1>Mis ofertas</h1><p>Propuestas enviadas y vigentes.</p></div>
        <button>+ Crear oferta</button>
      </header>
      <div className="list-panel">
        {offers.map((offer) => {
          const cargo = opportunities.find((item) => item.id === offer.cargoId);
          return (
            <article className="list-row" key={offer.id}>
              <div><span className="code">{offer.id}</span><h3>{cargo?.title}</h3><p>{modeLabel[offer.mode]} · {offer.estimatedDays} días</p></div>
              <div className="row-value"><small>Total cotizado</small><strong>USD {offer.totalUsd}</strong></div>
              <span className="tag">En evaluación</span>
              <button className="link">Ver detalle →</button>
            </article>
          );
        })}
      </div>
    </DashboardShell>
  );
}
