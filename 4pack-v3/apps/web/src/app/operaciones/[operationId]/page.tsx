import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { OperationControls } from "@/components/operation-controls";
import { OperationChat } from "@/components/operation-chat";
import { getCurrentRole, getOperationDetail } from "@/lib/dashboard-data";

const modeLabel = { air: "Aéreo", sea: "Marítimo", consolidated: "Consolidado" };
const guaranteeLabel = { pending: "Pendiente", proof_uploaded: "Comprobante cargado", verified: "Verificada", held_simulated: "Fondos simulados retenidos", released_simulated: "Fondos simulados liberados", rejected: "Rechazada" };

export default async function OperationDetailPage({ params }: { params: Promise<{ operationId: string }> }) {
  const { operationId } = await params;
  const [operation, role] = await Promise.all([getOperationDetail(operationId), getCurrentRole()]);
  if (!operation) notFound();

  return (
    <DashboardShell active="operations">
      <header><div><p className="eyebrow">OPERACIÓN {operation.id.slice(0, 8).toUpperCase()}</p><h1>{operation.cargoTitle}</h1><p>{operation.route}</p></div><span className="tag">{operation.status.replace("_", " ").toUpperCase()}</span></header>
      <div className="operation-layout">
        <div className="operation-column"><section className="operation-panel"><h2>Historial logístico</h2><div className="timeline">{operation.events.map((event) => <article key={event.id}><h3>{event.title}</h3><p>{event.description}</p><small>{event.location} · {new Date(event.createdAt).toLocaleString("es-AR")}</small></article>)}</div></section><OperationChat messages={operation.messages} operationId={operation.id} /></div>
        <aside className="operation-panel"><h2>Resumen contractual</h2><div className="operation-facts"><div><span>Modalidad</span><strong>{modeLabel[operation.mode]}</strong></div><div><span>Oferta</span><strong>USD {operation.totalUsd.toLocaleString("es-AR")}</strong></div><div><span>Garantía</span><strong>{guaranteeLabel[operation.guaranteeStatus]}</strong></div><div><span>Comisión</span><strong>USD {operation.commissionUsd.toLocaleString("es-AR")}</strong></div></div><OperationControls guaranteeStatus={operation.guaranteeStatus} operationId={operation.id} role={role} status={operation.status} /></aside>
      </div>
    </DashboardShell>
  );
}
