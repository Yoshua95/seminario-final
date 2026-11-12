import { DashboardShell } from "@/components/dashboard-shell";
import { documents } from "@/data/demo";

export default function DocumentsPage() {
  return (
    <DashboardShell active="documents">
      <header><div><p className="eyebrow">REPOSITORIO</p><h1>Documentos</h1><p>Archivos vinculados con cargas y operaciones.</p></div><button>+ Subir documento</button></header>
      <div className="list-panel">
        {documents.map((document) => (
          <article className="list-row documents-row" key={document.name}>
            <div><h3>{document.name}</h3><p>{document.kind} · {document.operation}</p></div>
            <span className={document.status === "Pendiente" ? "tag warning" : "tag"}>{document.status}</span>
            <button className="link">Descargar</button>
          </article>
        ))}
      </div>
    </DashboardShell>
  );
}
