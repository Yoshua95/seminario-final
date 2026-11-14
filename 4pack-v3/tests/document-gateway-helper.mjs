// Test double for the trusted Edge boundary, not an authenticated-client escape hatch.
import { createHash, randomUUID } from "node:crypto";
export async function gatewayDocument(db, actor, payload) {
  if (!payload.storage_path?.startsWith(actor + "/")) throw new Error("Archivo invalido");
  const bytes = Buffer.from("%PDF-1.4\nTest document\n");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const path = `${actor}/${randomUUID()}.pdf`;
  return db.transaction(async tx => {
    await tx.query("insert into storage.objects(bucket_id,name,owner_id,metadata,user_metadata) values('documents',$1,$2,$3,$4)",
      [path,actor,JSON.stringify({size:payload.size_bytes,mimetype:payload.mime_type}),JSON.stringify({uploaded_by:actor,sha256})]);
    const result = await tx.query("select public.register_document_upload($1,$2::jsonb) as id",[actor,JSON.stringify({...payload,storage_path:path,sha256})]);
    return {rows:[{result:{id:result.rows[0].id}}]};
  });
}
