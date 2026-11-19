"use client";

import { uploadImporterDocument } from "@/app/documentos/actions";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { DocumentSummary, DocumentTarget } from "@/lib/dashboard-data";

const kindLabels = {
  invoice: "Factura comercial",
  packing_list: "Packing list",
  msds: "MSDS",
  payment_proof: "Comprobante de pago",
  operator_credential: "Credencial del operador",
  other: "Otro"
};

export function DocumentRepository({ documents, targets }: { documents: DocumentSummary[]; targets: DocumentTarget[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<keyof typeof kindLabels>("invoice");
  const [targetValue, setTargetValue] = useState(targets[0] ? `${targets[0].type}:${targets[0].id}` : "");
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const selectedTarget = useMemo(() => targets.find((target) => `${target.type}:${target.id}` === targetValue), [targetValue, targets]);

  async function uploadDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !selectedTarget) {
      setError("Seleccioná un PDF y una carga u operación.");
      return;
    }
    if (file.type !== "application/pdf" || file.size > 10 * 1024 * 1024) {
      setError("El archivo debe ser PDF y pesar como máximo 10 MB.");
      return;
    }

    const formElement = event.currentTarget;
    setLoading(true); setError(""); setSuccess("");
    const form = new FormData();
    form.set("file", file); form.set("id", selectedTarget.id);
    form.set("target_type", selectedTarget.type); form.set("kind", kind);
    form.set("document_type", kindLabels[kind]);
    try {
      const result = await uploadImporterDocument(form);
      if (!result.ok) { setError(result.message); return; }
      setFile(null); setSuccess(result.message); formElement.reset(); router.refresh();
    } catch { setError("No pudimos subir el documento."); }
    finally { setLoading(false); }
  }

  async function downloadDocument(document: DocumentSummary) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return setError("No hay conexión disponible.");
    setDownloadingId(document.id);
    setError("");
    const { data, error: signedError } = await supabase.storage.from("documents").createSignedUrl(document.storagePath, 60);
    setDownloadingId("");
    if (signedError || !data?.signedUrl) {
      setError("No pudimos generar la descarga segura.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return <>
    <form className="document-upload" onSubmit={uploadDocument}>
      <div><label htmlFor="document-kind">Tipo</label><select id="document-kind" onChange={(event) => setKind(event.target.value as keyof typeof kindLabels)} value={kind}>{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div><label htmlFor="document-target">Vincular a</label><select disabled={targets.length === 0} id="document-target" onChange={(event) => setTargetValue(event.target.value)} value={targetValue}>{targets.map((target) => <option key={`${target.type}:${target.id}`} value={`${target.type}:${target.id}`}>{target.label}</option>)}</select></div>
      <div><label htmlFor="document-file">Archivo PDF</label><input accept="application/pdf,.pdf" id="document-file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" /></div>
      <button disabled={loading || targets.length === 0} type="submit">{loading ? "Subiendo…" : "+ Subir documento"}</button>
      {error && <div className="form-error" role="alert">{error}</div>}
      {success && <div className="form-success">{success}</div>}
    </form>
    <div className="list-panel">
      {documents.map((document) => <article className="list-row documents-row" key={document.id}>
        <div><h3>{document.originalName}</h3><p>{kindLabels[document.kind]} · {document.targetLabel}</p><small>Cargado el {new Date(document.createdAt).toLocaleString("es-AR")}</small></div>
        <span className="tag">Protegido</span>
        <button className="link" disabled={downloadingId === document.id} onClick={() => downloadDocument(document)}>{downloadingId === document.id ? "Generando…" : "Descargar"}</button>
      </article>)}
      {documents.length === 0 && <div className="empty-state"><h3>Sin documentos disponibles</h3><p>Los archivos vinculados con tus cargas y operaciones aparecerán acá.</p></div>}
    </div>
  </>;
}
