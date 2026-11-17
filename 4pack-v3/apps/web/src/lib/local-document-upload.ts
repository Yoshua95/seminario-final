import "server-only";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateDocumentBytes } from "../../../../supabase/functions/_shared/document-validation.mjs";
import { localDatabase, demoDirectory } from "@/features/operator/data";

// Local implementation of the same trusted boundary as the Edge gateway.
// Caller must derive actor from a signed session, never from a browser field.
export async function uploadLocalAuthorizedDocument(
  actor: string,
  cargoId: string,
  file: File,
  uploadId: string,
) {
  if (!/^[a-f0-9-]{36}$/i.test(uploadId))
    throw new Error("Reintento inválido.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = validateDocumentBytes(file.name, file.type, bytes);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const storagePath = `${actor}/${uploadId}.${extension}`;
  const payload = {
    id: cargoId,
    target_type: "cargo",
    document_type: "MSDS",
    kind: "msds",
    storage_path: storagePath,
    sha256,
    original_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
  };
  const db = await localDatabase();
  return db.transaction(async (tx) => {
    const allowed = await tx.query<{ allowed: boolean }>(
      "select public.document_upload_target($1,$2::jsonb) allowed",
      [actor, JSON.stringify(payload)],
    );
    if (!allowed.rows[0].allowed)
      throw new Error("Destino documental no autorizado.");
    const existing = await tx.query<{ user_metadata: { sha256: string } }>(
      "select user_metadata from storage.objects where bucket_id='documents' and name=$1",
      [storagePath],
    );
    if (existing.rows[0] && existing.rows[0].user_metadata.sha256 !== sha256)
      throw new Error("El reintento debe conservar el mismo archivo.");
    const folder = path.join(demoDirectory(), "files", actor);
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, `${uploadId}.${extension}`), bytes);
    if (!existing.rows.length)
      await tx.query(
        "insert into storage.objects(bucket_id,name,owner_id,metadata,user_metadata) values('documents',$1,$2,$3,$4)",
        [
          storagePath,
          actor,
          JSON.stringify({ size: file.size, mimetype: file.type }),
          JSON.stringify({ uploaded_by: actor, sha256 }),
        ],
      );
    return (
      await tx.query<{ id: string }>(
        "select public.register_document_upload($1,$2::jsonb) id",
        [actor, JSON.stringify(payload)],
      )
    ).rows[0].id;
  });
}
