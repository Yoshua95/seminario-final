"use server";
import { unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminRpc } from "./data";
export async function adminAction(
  demo: boolean,
  _previous: { ok: boolean; message: string },
  form: FormData,
) {
  try {
    const t = (k: string) => String(form.get(k) ?? "").trim();
    let name = "",
      args: Record<string, unknown> = {};
    switch (t("command")) {
      case "operator":
        name = "admin_review_company";
        args = {
          target_operator: t("id"),
          decision: t("decision"),
          reason: t("reason"),
          checklist: {
            identity: form.has("identity"),
            company: form.has("company"),
            documents: form.has("documents"),
          },
          request_key: t("request_key"),
        };
        break;
      case "claim":
        name = "admin_resolve_operation_claim";
        args = {
          target_ticket: t("id"),
          next_status: t("status"),
          responsible: t("responsible"),
          reason: t("reason"),
          resolution_policy: t("resolution_policy") || "resume",
          request_key: t("request_key"),
        };
        break;
      case "activate":
        name = "admin_activate_importer";
        args = {
          target_importer: t("id"),
          reason: t("reason"),
          request_key: t("request_key"),
        };
        break;
      case "terminal":
        name = "admin_capacity_terminal_transition";
        args = {
          target_operation: t("id"),
          next_phase: t("phase"),
          reason: t("reason"),
          consequences: t("consequences"),
        };
        break;
      default:
        throw Error("Acción no disponible");
    }
    await adminRpc(demo, name, args);
    revalidatePath(demo ? "/demo" : "/admin", "layout");
    return {
      ok: true,
      message: "Decisión registrada. Los datos se actualizaron.",
    };
  } catch (e) {
    unstable_rethrow(e);
    return {
      ok: false,
      message: e instanceof Error ? e.message : "No se pudo guardar.",
    };
  }
}
