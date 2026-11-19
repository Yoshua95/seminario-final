import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/dashboard-data";
import { moderateProfile } from "@/features/marketplace/moderation-action";
import type { CommercialProfile } from "@/features/operator/types";
export default async function Page() {
  if(await getCurrentRole()!=="admin") redirect("/");
  const client=await createSupabaseServerClient();
  const result=await client!.from("operator_commercial_profiles").select("*").order("trade_name");
  if(result.error) throw new Error("No se pudo consultar la moderación comercial.");
  return <DashboardShell active="admin"><h1>Moderación de perfiles comerciales</h1>{(result.data as CommercialProfile[]).map(p=><section className="op-panel" key={p.public_id}>
    <form className="op-form" action={moderateProfile}><input name="id" value={p.public_id} type="hidden" /><label>Nombre comercial<input name="trade_name" defaultValue={p.trade_name} minLength={3} required /></label><label>Descripción<textarea name="description" defaultValue={p.description} /></label>
    <label><input name="admin_hidden" type="checkbox" defaultChecked={p.admin_hidden} /> Ocultar del directorio</label><button className="op-button">Guardar moderación</button></form>
  </section>)}</DashboardShell>;
}
