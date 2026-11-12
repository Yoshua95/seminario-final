import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentRole, getOffers, getOpenCargoRequests, getOperations } from "@/lib/dashboard-data";

const actionLabel = {
  importer: "+ Nueva carga",
  operator: "+ Nueva oferta",
  admin: "Panel administrativo"
};

export default async function Home() {
  const [opportunities, offers, operations, role] = await Promise.all([getOpenCargoRequests(), getOffers(), getOperations(), getCurrentRole()]);

  return (
    <DashboardShell active="opportunities">
        <header>
          <div>
            <p className="eyebrow">MESA DE LICITACIONES</p>
            <h1>Oportunidades disponibles</h1>
            <p>Solicitudes activas en la ruta China–Argentina.</p>
          </div>
          {role === "importer" && <Link className="header-action" href="/cargas/nueva">{actionLabel.importer}</Link>}
          {role === "operator" && <Link className="header-action" href="/ofertas">{actionLabel.operator}</Link>}
          {role === "admin" && <Link className="header-action" href="/admin">{actionLabel.admin}</Link>}
        </header>

        <div className="metrics">
          <article><span>Solicitudes abiertas</span><strong>{opportunities.length}</strong><small>Visibles para tu cuenta</small></article>
          <article><span>Ofertas disponibles</span><strong>{offers.length}</strong><small>Según tu participación</small></article>
          <article><span>Operaciones activas</span><strong>{operations.length}</strong><small>Con seguimiento habilitado</small></article>
        </div>

        <div className="section-title">
          <div><h2>Cargas recientes</h2><p>Los datos de contacto permanecen protegidos hasta la adjudicación.</p></div>
          <button className="secondary">Filtrar</button>
        </div>

        <div className="cards">
          {opportunities.map((cargo) => (
            <article className="cargo" key={cargo.id}>
              <div className="cargo-top">
                <span className="code">{cargo.id}</span>
                <span className={cargo.hazmatReviewRequired ? "tag warning" : "tag"}>
                  {cargo.hazmatReviewRequired ? "Revisión HAZMAT" : "Carga general"}
                </span>
              </div>
              <h3>{cargo.title}</h3>
              <p>{cargo.origin} <b>→</b> {cargo.destination}</p>
              <dl>
                <div><dt>Peso</dt><dd>{cargo.weightKg} kg</dd></div>
                <div><dt>Volumen</dt><dd>{cargo.volumeM3} m³</dd></div>
                <div><dt>Valor FOB</dt><dd>USD {cargo.fobUsd.toLocaleString("es-AR")}</dd></div>
              </dl>
              <footer><span>{cargo.offersCount} ofertas recibidas</span><button className="link">Ver y cotizar →</button></footer>
            </article>
          ))}
          {opportunities.length === 0 && <div className="empty-state"><h3>No hay cargas abiertas</h3><p>Las nuevas solicitudes aparecerán acá cuando estén publicadas.</p></div>}
        </div>
    </DashboardShell>
  );
}
