import { NextResponse } from "next/server";
import { capacityAdmin } from "@/features/capacity/admin-data";
export async function GET(request: Request) {
  const client = await capacityAdmin(false),
    id = new URL(request.url).searchParams.get("id");
  if (!client || !id || !/^[0-9a-f-]{36}$/i.test(id))
    return new Response("No disponible", { status: 404 });
  const doc = await client
    .from("documents")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (doc.error || !doc.data)
    return new Response("No disponible", { status: 404 });
  const signed = await client.storage
    .from("documents")
    .createSignedUrl(doc.data.storage_path, 60);
  if (signed.error || !signed.data?.signedUrl)
    return new Response("No disponible", { status: 404 });
  return NextResponse.redirect(signed.data.signedUrl, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
