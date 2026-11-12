import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { getAdminDashboard } from "@/lib/dashboard-data";

const guaranteeLabels = {
  pending: "Pendiente",
  proof_uploaded: "Comprobante cargado",
  verified: "Verificada",
  held_simulated: "Retenida · simulación",
  released_simulated: "Liberada · simulación",
  rejected: "Rechazada"
};

export default async function AdminPage() {
  const dashboard = await getAdminDashboard();
  if (!dashboard) redirect("/");

  return <DashboardShell active="admin">
    <header><div><p className="eyebrow">CONTROL OPERATIVO</p><h1>Panel administrativo</h1><p>Métricas, garantías y validaciones de la plataforma.</p></div><Link className="header-action" href="/admin/operadores">Revisar operadores</Link></header>
    <div className="metrics admin-metrics">
      <article><span>Operadores pendientes</span><strong>{dashboard.pendingOperators}</strong><small>Requieren decisión administrativa</small></article>
      <article><span>Operaciones activas</span><strong>{dashboard.activeOperations}</strong><small>{dashboard.deliveredOperations} operaciones finalizadas</small></article>
      <article><span>Documentos privados</span><strong>{dashboard.documentsCount}</strong><small>Archivos visibles según permisos</small></article>
    </div>
    <div className="admin-financial">
      <article><span>Volumen garantizado simulado</span><strong>USD {dashboard.securedVolumeUsd.toLocaleString("es-AR")}</strong><small>No representa fondos custodiados</small></article>
      <article><span>Comisiones proyectadas</span><strong>USD {dashboard.commissionUsd.toLocaleString("es-AR")}</strong><small>Calculadas sobre operaciones adjudicadas</small></article>
    </div>
    <div className="section-title"><div><h2>Registro de garantías</h2><p>Trazabilidad económica de las operaciones recientes.</p></div></div>
    <div className="list-panel admin-ledger">
      {dashboard.guarantees.map((guarantee) => <article className="list-row" key={guarantee.id}>
        <div><span className="code">{guarantee.operationId.slice(0, 8).toUpperCase()}</span><h3>{guarantee.cargoTitle}</h3><p>{new Date(guarantee.createdAt).toLocaleString("es-AR")}</p></div>
        <div className="row-value"><small>Garantía</small><strong>USD {guarantee.amountUsd.toLocaleString("es-AR")}</strong></div>
        <div className="row-value"><small>Comisión</small><strong>USD {guarantee.commissionUsd.toLocaleString("es-AR")}</strong></div>
        <div><span className="tag">{guaranteeLabels[guarantee.guaranteeStatus]}</span><Link className="link admin-operation-link" href={`/operaciones/${guarantee.operationId}`}>Abrir operación →</Link></div>
      </article>)}
      {dashboard.guarantees.length === 0 && <div className="empty-state"><h3>Sin garantías registradas</h3><p>Las operaciones adjudicadas aparecerán en este registro.</p></div>}
    </div>
  </DashboardShell>;
}
