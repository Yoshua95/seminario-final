import { DashboardShell } from "@/components/dashboard-shell";
import { operations } from "@/data/demo";

export default function OperationsPage() {
  return (
    <DashboardShell active="operations">
      <header><div><p className="eyebrow">SEGUIMIENTO</p><h1>Operaciones</h1><p>Estado contractual y logístico de las cargas adjudicadas.</p></div></header>
      <div className="list-panel">
        {operations.map((operation) => (
          <article className="operation" key={operation.id}>
            <div className="operation-head"><div><span className="code">{operation.id}</span><h3>{operation.cargo}</h3><p>{operation.route}</p></div><span className="tag">{operation.status}</span></div>
            <div className="progress"><span style={{ width: `${operation.progress}%` }} /></div>
            <footer><small>{operation.progress}% del circuito registrado</small><button className="link">Abrir operación →</button></footer>
          </article>
        ))}
      </div>
    </DashboardShell>
  );
}
