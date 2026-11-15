import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { Badge } from "@/features/operator/ui";
import { modeLabel } from "@/features/operator/types";
import { directory, type PublicOperator } from "./data";

function Reputation({profile:p}:{profile:PublicOperator}) {
  return <p>{p.reputation.completed===0 ? "Operador nuevo · Sin historial" : `${p.reputation.completed} operaciones completadas verificadas`}<br />
    {p.reputation.average===null ? "Sin calificaciones" : `${p.reputation.average} / 5`} · {p.reputation.count} evaluaciones</p>;
}
export async function OperatorDirectory({demo=false,filters={},id}:{demo?:boolean;filters?:Record<string,string>;id?:string}) {
  const profiles = await directory(demo,filters,id);
  if (id && profiles.length===0) notFound();
  const base=demo?"/demo/operadores":"/operadores";
  const content=<>
    <header><div><p className="eyebrow">MARKETPLACE 4PACK</p><h1>{id?profiles[0].trade_name:"Operadores logísticos"}</h1><p>Perfiles comerciales para usuarios de 4PACK. Elegí con información verificable.</p></div></header>
    {id?<Link className="op-text-link" href={base}>← Volver al directorio</Link>:<form className="op-form op-filter-grid" method="get">
      <label>Nombre comercial<input name="q" defaultValue={filters.q} maxLength={150} /></label>
      <label>Modalidad<select name="mode" defaultValue={filters.mode}><option value="">Todas</option><option value="air">Aéreo</option><option value="sea">Marítimo</option><option value="consolidated">Consolidado</option></select></label>
      <label>Especialidad<input name="specialty" defaultValue={filters.specialty} maxLength={100} /></label>
      <label>Cobertura<input name="coverage" defaultValue={filters.coverage} maxLength={100} /></label>
      <button className="op-button" type="submit">Buscar operadores</button><Link href={base}>Limpiar</Link>
    </form>}
    <div className="comparison-grid">{profiles.map(p=><article className="op-panel" key={p.id}>
      {p.logo_url && <img src={p.logo_url} alt={`Logotipo de ${p.trade_name}`} width={64} height={64} referrerPolicy="no-referrer" />}
      <h2><Link href={`${base}/${p.id}`}>{p.trade_name}</Link></h2><Badge status={p.verification_status} />
      {!p.available&&<p>Referencia histórica · No disponible para nuevas cotizaciones.</p>}
      <p>{p.description || "Descripción comercial pendiente."}</p><p>{[p.city,p.province,p.country].filter(Boolean).join(" · ") || "Ubicación general no declarada"}</p>
      <Reputation profile={p} />
      <dl className="op-facts"><dt>Modalidades</dt><dd>{p.modes.map(modeLabel).join(" · ") || "No declaradas"}</dd>
      <dt>Especialidades</dt><dd>{p.specialties.join(" · ") || "No declaradas"}</dd><dt>Cobertura</dt><dd>{p.coverage.join(" · ") || "No declarada"}</dd>
      <dt>Categorías</dt><dd>{p.categories.join(" · ") || "No declaradas"}</dd><dt>Experiencia declarada</dt><dd>{p.experience_years===null?"No declarada":`${p.experience_years} años`}</dd></dl>
      <button className="op-button" disabled title="Disponible en una próxima etapa">Solicitar cotización · Próximamente</button>
      <p className="op-small">La coordinación aduanera no acredita habilitación como despachante de aduana.</p>
    </article>)}</div>
    {!profiles.length&&<div className="empty-state"><h2>No encontramos operadores</h2><p>Probá otra búsqueda o combinación de filtros.</p></div>}
  </>;
  return demo?<main className="content"><Link href="/demo/acceso">4PACK · Demostración</Link>{content}</main>:<DashboardShell active="operators">{content}</DashboardShell>;
}
