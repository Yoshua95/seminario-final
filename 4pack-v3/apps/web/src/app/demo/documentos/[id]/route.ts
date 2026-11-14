import { readDemoFile } from "@/features/operator/actions";
import { isDemoEnabled } from "@/features/operator/demo-environment.mjs";
export const maxDuration = 60;
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDemoEnabled()) return new Response("No disponible", { status: 404 });
  try {
    const { id } = await params;
    const { document, bytes } = await readDemoFile(id);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": document.mime_type,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(document.original_name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new Response("Documento no disponible", { status: 404 });
  }
}
