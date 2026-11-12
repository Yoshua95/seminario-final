import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import type { CargoStatus } from "@4pack/domain";
import { getOperations } from "@/lib/dashboard-data";

const statusDetails: Record<CargoStatus, { label: string; progress: number }> = {
  draft: { label: "Borrador", progress: 0 },
  open: { label: "Publicada", progress: 10 },
  awarded: { label: "Adjudicada", progress: 25 },
  in_transit: { label: "En tránsito", progress: 65 },
  customs: { label: "Aduana", progress: 85 },
  delivered: { label: "Entregada", progress: 100 },
  cancelled: { label: "Cancelada", progress: 0 }
};

export default async function OperationsPage() {
  const operations = await getOperations();

  return (
    <DashboardShell active="operations">
      <header><div><p className="eyebrow">SEGUIMIENTO</p><h1>Operaciones</h1><p>Estado contractual y logístico de las cargas adjudicadas.</p></div></header>
      <div className="list-panel">
        {operations.map((operation) => {
          const detail = statusDetails[operation.status];
          return (
            <article className="operation" key={operation.id}>
              <div className="operation-head"><div><span className="code">{operation.id.slice(0, 8).toUpperCase()}</span><h3>{operation.cargoTitle}</h3><p>{operation.route}</p></div><span className="tag">{detail.label}</span></div>
              <div className="progress"><span style={{ width: `${detail.progress}%` }} /></div>
              <footer><small>{detail.progress}% del circuito registrado</small><Link className="link" href={`/operaciones/${operation.id}`}>Abrir operación →</Link></footer>
            </article>
          );
        })}
        {operations.length === 0 && <div className="empty-state"><h3>No hay operaciones activas</h3><p>Una operación se crea cuando una oferta es adjudicada.</p></div>}
      </div>
    </DashboardShell>
  );
}
