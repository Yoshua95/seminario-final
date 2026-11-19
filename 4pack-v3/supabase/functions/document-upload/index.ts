// Supabase Edge runtime supplies the service credential. It is never sent to the browser.
import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import { validateDocumentBytes } from "../_shared/document-validation.mjs";

Deno.serve(async (request: Request) => {
  try {
    if (request.method !== "POST") return new Response(null, { status: 405 });
    const url = Deno.env.get("SUPABASE_URL")!;
    const authorization = request.headers.get("Authorization") ?? "";
    const client = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return Response.json({ error: "Sesión requerida" }, { status: 401 });
    if (Number(request.headers.get("content-length")) > 11 * 1024 * 1024)
      return Response.json({ error: "Archivo demasiado grande" }, { status: 413 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 1 || file.size > 10485760) throw new Error("Archivo inválido");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extension = validateDocumentBytes(file.name,file.type,bytes);
    const payload: Record<string,unknown> = {};
    for (const key of ["id","target_type","document_type","kind","replaces_id"]) {
      const value = form.get(key);
      if (typeof value === "string") payload[key] = value;
    }
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: allowed, error: targetError } = await admin.rpc("document_upload_target", { actor: user.id, payload });
    if (targetError || !allowed) return Response.json({ error: "Destino no autorizado" }, { status: 403 });
    const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map(n=>n.toString(16).padStart(2,"0")).join("");
    const uploadId = form.get("upload_request_id") ?? crypto.randomUUID();
    if (typeof uploadId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(uploadId)) throw new Error("Reintento inválido");
    const storage_path = `${user.id}/${uploadId}.${extension}`;
    const { error: uploadError } = await admin.storage.from("documents").upload(storage_path, bytes, {
      contentType: file.type, upsert: false, metadata: { uploaded_by: user.id, sha256 },
    });
    // A retry can encounter an object whose first response was lost. The RPC
    // verifies its uploader, hash, bytes metadata and exact target before reuse.
    if (uploadError && String(uploadError.statusCode) !== "409") throw new Error("No se pudo subir el archivo");
    const { data: id, error } = await admin.rpc("register_document_upload", { actor: user.id, payload: {
      ...payload, storage_path, sha256, original_name: file.name, mime_type: file.type, size_bytes: file.size,
    }});
    if (error) {
      // A transport error may hide a committed registration. Keep the private
      // object for a safe retry rather than deleting potentially bound evidence.
      throw new Error("No se pudo vincular el documento");
    }
    return Response.json({ id });
  } catch {
    return Response.json({ error: "No se pudo completar la subida. Revisá archivo y destino." }, { status: 400 });
  }
});
