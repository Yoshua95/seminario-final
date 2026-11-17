"use server";
import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requiresHazmatReview } from "@4pack/domain";
import {
  openRehearsalSession,
  closeRehearsalSession,
  rehearsalSession,
  roleHome,
  type DemoRole,
} from "./session";
import { localDatabase } from "../operator/data";
import { asUser } from "../operator/demo-runtime.mjs";
export async function enterRehearsal(form: FormData) {
  const role = String(form.get("account"));
  if (!["importer", "operator", "admin"].includes(role))
    throw new Error("Cuenta de ensayo no disponible.");
  await openRehearsalSession(role as DemoRole);
  redirect(roleHome(role as DemoRole));
}
export async function leaveRehearsal() {
  await closeRehearsalSession();
  redirect("/demo/acceso");
}
export type RehearsalResult = { ok: boolean; message: string; id?: string };
export async function rehearsalAction(
  command: string,
  _previous: RehearsalResult,
  form: FormData,
): Promise<RehearsalResult> {
  try {
    const session = await rehearsalSession(
      command === "verify" ? "admin" : "importer",
    );
    const db = await localDatabase();
    const text = (key: string) => String(form.get(key) ?? "").trim();
    const query = async <T>(sql: string, params: unknown[] = []) =>
      asUser<T>(db, session.id, sql, params);
    let id: string | undefined;
    if (command === "cargo") {
      const title = text("title"),
        description = text("description"),
        origin = text("origin"),
        destination = text("destination"),
        category = text("category");
      const weight = Number(text("weight_kg")),
        volume = Number(text("volume_m3")),
        fob = Number(text("fob_usd"));
      if (
        ![title, description, origin, destination, category].every(
          (s) => s.length >= 2 && s.length <= 2000,
        ) ||
        ![weight, volume, fob].every(Number.isFinite) ||
        weight <= 0 ||
        volume <= 0 ||
        fob < 0
      )
        throw new Error("Revisá los datos y dimensiones de la carga.");
      if (requiresHazmatReview(title + " " + description + " " + category))
        throw new Error(
          "Este ensayo admite carga estándar. HAZMAT/MSDS queda para el siguiente bloque.",
        );
      id = (
        await query<{ id: string }>(
          "insert into public.cargo_requests(importer_id,title,description,origin,destination,category,weight_kg,volume_m3,fob_usd,status,bidding_deadline) values(auth.uid(),$1,$2,$3,$4,$5,$6,$7,$8,'open',now()+interval '7 days') returning id",
          [
            title,
            description,
            origin,
            destination,
            category,
            weight,
            volume,
            fob,
          ],
        )
      ).rows[0].id;
    } else if (command === "verify") {
      const status = text("status");
      if (!["approved", "rejected"].includes(status))
        throw new Error("Estado no disponible.");
      const row = await query<{ user_id: string }>(
        "update public.operator_profiles set verification_status=$2,verified_at=now(),verified_by=auth.uid() where user_id=$1 and exists(select 1 from public.profiles p where p.id=user_id and p.role='operator') returning user_id",
        [text("id"), status],
      );
      if (!row.rows.length) throw new Error("Operador no disponible.");
    } else if (command === "award") {
      id = (
        await query<{ id: string }>("select public.award_offer($1) id", [
          text("offer_id"),
        ])
      ).rows[0].id;
    } else if (command === "guarantee") {
      // Replay returns the existing outcome without repeating a money movement.
      const existing = (
        await query<{ status: string }>(
          "select status from public.payment_guarantees where operation_id=$1",
          [text("id")],
        )
      ).rows[0];
      if (!existing) throw new Error("Operación no disponible.");
      if (existing.status === "pending")
        await query("select public.simulate_guarantee($1)", [text("id")]);
      else if (
        !["held_simulated", "released_simulated"].includes(existing.status)
      )
        throw new Error("Garantía no disponible.");
    } else if (command === "complete") {
      const existing = (
        await query<{ phase: string }>(
          "select phase from public.operations where id=$1 and importer_id=auth.uid()",
          [text("id")],
        )
      ).rows[0];
      if (!existing) throw new Error("Operación no disponible.");
      if (existing.phase !== "completed")
        await query("select public.transition_operation($1,'completed')", [
          text("id"),
        ]);
    } else if (command === "rate") {
      const score = Number(text("score")),
        comment = text("comment");
      if (
        !Number.isInteger(score) ||
        score < 1 ||
        score > 5 ||
        comment.length > 500
      )
        throw new Error("Puntaje o comentario inválido.");
      const op = (
        await query<{ operator_id: string; phase: string }>(
          "select operator_id,phase from public.operations where id=$1 and importer_id=auth.uid()",
          [text("id")],
        )
      ).rows[0];
      if (!op || op.phase !== "completed")
        throw new Error(
          "La evaluación requiere una operación completada propia.",
        );
      const existing = (
        await query(
          "select id from public.ratings where operation_id=$1 and author_id=auth.uid()",
          [text("id")],
        )
      ).rows[0];
      if (!existing)
        await query(
          "insert into public.ratings(operation_id,author_id,recipient_id,score,comment) values($1,auth.uid(),$2,$3,$4)",
          [text("id"), op.operator_id, score, comment || null],
        );
    } else throw new Error("Acción no disponible.");
    revalidatePath("/demo/importador", "layout");
    revalidatePath("/demo/admin", "layout");
    revalidatePath("/demo/operador", "layout");
    return {
      ok: true,
      message:
        command === "cargo"
          ? "Carga estándar publicada."
          : command === "award"
            ? "Operación creada con capacidad reservada."
            : command === "guarantee"
              ? "Garantía simulada confirmada."
              : command === "complete"
                ? "Entrega confirmada y operación completada."
                : command === "rate"
                  ? "Evaluación registrada."
                  : "Verificación administrativa guardada.",
      id,
    };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo completar la acción.",
    };
  }
}
