import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentRole, getOffers } from "@/lib/dashboard-data";

const modeLabel = { air: "Aéreo", sea: "Marítimo", consolidated: "Consolidado" };
const statusLabel: Record<string, string> = {
  submitted: "En evaluación",
  accepted: "Aceptada",
  rejected: "Rechazada",
  expired: "Vencida",
  withdrawn: "Retirada"
};

export default async function OffersPage() {
  const [offers, role] = await Promise.all([getOffers(), getCurrentRole()]);
  const title = role === "importer" ? "Ofertas recibidas" : role === "admin" ? "Todas las ofertas" : "Mis ofertas";

  return (
    <DashboardShell active="offers">
      <header>
        <div><p className="eyebrow">LICITACIÓN INVERSA</p><h1>{title}</h1><p>Propuestas visibles según tu rol y participación.</p></div>
        {role === "operator" && <Link className="header-action" href="/ofertas/nueva">+ Crear oferta</Link>}
      </header>
      <div className="list-panel">
        {offers.map((offer) => {
          return (
            <article className="list-row" key={offer.id}>
              <div><span className="code">{offer.id.slice(0, 8).toUpperCase()}</span><h3>{offer.cargoTitle}</h3><p>{modeLabel[offer.mode]} · {offer.estimatedDays} días</p></div>
              <div className="row-value"><small>Total cotizado</small><strong>USD {offer.totalUsd.toLocaleString("es-AR")}</strong></div>
              <span className={offer.status === "rejected" || offer.status === "expired" ? "tag warning" : "tag"}>{statusLabel[offer.status] ?? offer.status}</span>
              {role === "importer" ? <Link className="link" href={`/ofertas/${offer.cargoId}`}>Comparar →</Link> : <span className="link">Detalle disponible</span>}
            </article>
          );
        })}
        {offers.length === 0 && <div className="empty-state"><h3>No hay ofertas disponibles</h3><p>Las propuestas se mostrarán cuando una carga reciba una cotización.</p></div>}
      </div>
    </DashboardShell>
  );
}
