"use server";
import {
  publishCargoWithMsds,
  requiresHazmatReview,
  type PublicationAttempt,
} from "@4pack/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uploadAuthorizedDocument } from "@/lib/document-upload";
import { uploadLocalAuthorizedDocument } from "@/lib/local-document-upload";
import { isMultiroleDemo } from "@/features/multirole/environment.mjs";
import { rehearsalSession } from "@/features/multirole/session";
import { localDatabase } from "@/features/operator/data";
import { asUser } from "@/features/operator/demo-runtime.mjs";
import { validateDocumentBytes } from "../../../../../../supabase/functions/_shared/document-validation.mjs";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

export async function submitCargoPublication(
  payload: Record<string, string | number>,
  attempt: PublicationAttempt,
  files: FormData,
) {
  try {
    const required = requiresHazmatReview(
      `${payload.title} ${payload.description} ${payload.category}`,
    );
    const selected = files.get("file");
    const file =
      selected instanceof File && selected.size > 0 ? selected : null;
    if (required && file)
      validateDocumentBytes(
        file.name,
        file.type,
        new Uint8Array(await file.arrayBuffer()),
      );
    const local = isMultiroleDemo();
    const actor = local ? (await rehearsalSession("importer")).id : null;
    const client = local ? null : await createSupabaseServerClient();
    if (!local && !client) throw new Error("La conexión no está disponible.");
    async function rpc(name: string, args: Record<string, unknown>) {
      if (local && actor) {
        const sql =
          name === "prepare_cargo_publication"
            ? "select public.prepare_cargo_publication($1,$2::jsonb) id"
            : "select public.publish_cargo($1) id";
        const values =
          name === "prepare_cargo_publication"
            ? [args.request_id, JSON.stringify(args.payload)]
            : [args.target];
        return (
          await asUser<{ id: string }>(
            await localDatabase(),
            actor,
            sql,
            values,
          )
        ).rows[0].id;
      }
      const { data, error } = await client!.rpc(name, args);
      if (error)
        throw new Error(
          error.code === "P0001"
            ? error.message
            : "No se pudo guardar la carga.",
        );
      return data as string;
    }
    const id = await publishCargoWithMsds(
      attempt,
      required,
      file ? { name: file.name, mimeType: file.type, size: file.size } : null,
      {
        prepare: (key) =>
          rpc("prepare_cargo_publication", { request_id: key, payload }),
        upload: async (cargoId, uploadId) => {
          if (local && actor) {
            await uploadLocalAuthorizedDocument(
              actor,
              cargoId,
              file!,
              uploadId,
            );
            return;
          }
          const form = new FormData();
          form.set("id", cargoId);
          form.set("target_type", "cargo");
          form.set("document_type", "MSDS");
          form.set("kind", "msds");
          form.set("upload_request_id", uploadId);
          form.set("file", file!);
          await uploadAuthorizedDocument(form);
        },
        publish: async (target) => {
          await rpc("publish_cargo", { target });
        },
      },
    );
    revalidatePath(local ? "/demo/importador" : "/", "layout");
    return {
      ok: true,
      id,
      message: "Carga publicada con su documentación requerida.",
    };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo publicar. Reintentá con los mismos datos y archivo.",
    };
  }
}
