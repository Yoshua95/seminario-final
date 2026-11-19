import { rehearsalSession } from "@/features/multirole/session";
import { localDatabase, demoDirectory } from "@/features/operator/data";
import { asUser } from "@/features/operator/demo-runtime.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await rehearsalSession();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return new Response("Documento no disponible", { status: 404 });
  const row = (
    await asUser<{
      storage_path: string;
      original_name: string;
      mime_type: string;
    }>(
      await localDatabase(),
      session.id,
      "select d.storage_path,d.original_name,d.mime_type from public.documents d join storage.objects o on o.name=d.storage_path and o.bucket_id='documents' where d.id=$1",
      [id],
    )
  ).rows[0];
  if (!row) return new Response("Documento no disponible", { status: 404 });
  const root = path.resolve(demoDirectory(), "files"),
    file = path.resolve(root, row.storage_path);
  if (!file.startsWith(root + path.sep))
    return new Response("Documento no disponible", { status: 404 });
  try {
    return new Response(new Uint8Array(await readFile(file)), {
      headers: {
        "Content-Type": row.mime_type,
        "Content-Disposition": 'inline; filename="evidencia.pdf"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Documento no disponible", { status: 404 });
  }
}
