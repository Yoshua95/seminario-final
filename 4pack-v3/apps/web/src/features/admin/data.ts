import "server-only";
import { capacityAdmin } from "../capacity/admin-data";
import { asUser } from "../operator/demo-runtime.mjs";
import { localDatabase } from "../operator/data";
import { rehearsalSession } from "../multirole/session";
import type { Workbench } from "./types";
export async function adminRpc(
  demo: boolean,
  name: string,
  args: Record<string, unknown> = {},
) {
  const client = await capacityAdmin(demo);
  if (client) {
    const r = await client.rpc(name, args);
    if (r.error)
      throw Error(
        r.error.code === "P0001"
          ? r.error.message
          : "No se pudo completar la acción administrativa.",
      );
    return r.data;
  }
  const actor = await rehearsalSession("admin");
  const allowed: Record<string, string> = {
    admin_workbench: "select public.admin_workbench() data",
    admin_review_capital:
      "select public.admin_review_capital($1,$2,$3::numeric,$4,$5) data",
    admin_review_operator:
      "select public.admin_review_operator($1,$2,$3::numeric,$4,$5::jsonb,$6) data",
    admin_manage_claim: "select public.admin_manage_claim($1,$2,$3,$4,$5) data",
    admin_activate_importer:
      "select public.admin_activate_importer($1,$2,$3) data",
    set_approved_capital:
      "select public.set_approved_capital($1,$2::numeric,$3) data",
    reconcile_offer_capital: "select public.reconcile_offer_capital() data",
    admin_capacity_terminal_transition:
      "select public.admin_capacity_terminal_transition($1,$2,$3,$4) data",
  };
  if (!allowed[name]) throw Error("Acción no disponible");
  return (
    await asUser<{ data: unknown }>(
      await localDatabase(),
      actor.id,
      allowed[name],
      Object.values(args).map((v) =>
        v !== null && typeof v === "object" ? JSON.stringify(v) : v,
      ),
    )
  ).rows[0].data;
}
export async function loadWorkbench(demo: boolean) {
  return (await adminRpc(demo, "admin_workbench")) as Workbench;
}
