import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentRole, getOpenCargoRequests } from "@/lib/dashboard-data";

const actionLabel = {
  importer: "+ Nueva carga",
  operator: "+ Nueva oferta",
  admin: "Panel administrativo"
};

export default async function Home() {
  const [opportunities, role] = await Promise.all([getOpenCargoRequests(), getCurrentRole()]);

  return (
    <DashboardShell active="opportunities">
        <header>
          <div>
            <p className="eyebrow">MESA DE LICITACIONES</p>
            <h1>Oportunidades disponibles</h1>
            <p>Solicitudes activas en la ruta China–Argentina.</p>
          </div>
          <button>{role ? actionLabel[role] : "Acción principal"}</button>
        </header>

        <div className="metrics">
          <article><span>Solicitudes abiertas</span><strong>12</strong><small>+3 esta semana</small></article>
          <article><span>Ofertas enviadas</span><strong>08</strong><small>4 en evaluación</small></article>
          <article><span>Operaciones activas</span><strong>03</strong><small>Sin demoras críticas</small></article>
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
