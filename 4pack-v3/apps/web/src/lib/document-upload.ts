import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function uploadAuthorizedDocument(form: FormData) {
  const client = await createSupabaseServerClient();
  if (!client) throw new Error("Conexión no disponible.");
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) throw new Error("Sesión requerida.");
  // Byte validation and trusted Storage writes happen in the upload gateway.
  const { data, error } = await client.functions.invoke("document-upload", { body: form });
  if (error || !data?.id) throw new Error("No pudimos subir el archivo. Revisá formato, tamaño y destino.");
  return data.id as string;
}
