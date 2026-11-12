import { DashboardShell } from "@/components/dashboard-shell";
import { DocumentRepository } from "@/components/document-repository";
import { getDocumentTargets, getDocuments } from "@/lib/dashboard-data";

export default async function DocumentsPage() {
  const [documents, targets] = await Promise.all([getDocuments(), getDocumentTargets()]);
  return (
    <DashboardShell active="documents">
      <header><div><p className="eyebrow">REPOSITORIO SEGURO</p><h1>Documentos</h1><p>PDF privados vinculados con cargas y operaciones.</p></div></header>
      <DocumentRepository documents={documents} targets={targets} />
    </DashboardShell>
  );
}
