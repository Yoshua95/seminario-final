"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function moderateProfile(form: FormData) {
  const client=await createSupabaseServerClient();
  if(!client || !(await client.auth.getUser()).data.user) throw new Error("Sesión requerida");
  const {error}=await client.rpc("moderate_commercial_profile",{target:String(form.get("id")),payload:{admin_hidden:form.get("admin_hidden")==="on",trade_name:String(form.get("trade_name")??""),description:String(form.get("description")??"")}});
  if(error) throw new Error("No se pudo moderar el perfil. Revisá permisos y contenido.");
  revalidatePath("/admin/operadores/comercial");revalidatePath("/operadores","layout");
}
