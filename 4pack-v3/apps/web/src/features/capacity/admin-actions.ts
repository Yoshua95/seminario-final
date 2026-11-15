"use server";
import { unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { capacityAdminRpc } from "./admin-data";
export async function capacityAction(
  demo: boolean,
  _previous: { message: string; ok: boolean },
  form: FormData,
) {
  try {
    const text = (key: string) => String(form.get(key) ?? "").trim();
    const command = text("command");
    if (command === "configure") {
      const payload: Record<string, string> = {};
      for (const key of [
        "operational_status",
        "operational_valid_from",
        "operational_valid_until",
        "currency",
        "max_operations",
        "max_weight_kg",
        "max_volume_m3",
        "max_per_operation",
        "max_exposure",
        "declared_working_capital",
        "approved_working_capital",
        "status",
        "valid_from",
        "valid_until",
        "reason",
      ])
        payload[key] = text(key);
      await capacityAdminRpc(demo, "configure_operator_capacity", {
        target_operator: text("operator_id"),
        payload,
      });
    } else if (command === "review")
      await capacityAdminRpc(demo, "review_historical_capacity", {
        target_operation: text("operation_id"),
        capital_amount: text("capital_amount"),
        reason: text("reason"),
      });
    else if (command === "terminal")
      await capacityAdminRpc(demo, "admin_capacity_terminal_transition", {
        target_operation: text("operation_id"),
        next_phase: text("next_phase"),
        reason: text("reason"),
        consequences: text("consequences"),
      });
    else throw new Error("Accion no disponible");
    revalidatePath(demo ? "/demo/admin/capacidad" : "/admin/capacidad");
    revalidatePath(demo ? "/demo/operador" : "/operador", "layout");
    return { ok: true, message: "Capacidad actualizada y auditada." };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo guardar.",
    };
  }
}
