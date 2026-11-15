import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import path from "node:path";
import { tmpdir } from "node:os";
import { mkdir } from "node:fs/promises";
import type { PGlite } from "@electric-sql/pglite";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Snapshot } from "./types";
import {
  createLocalDatabase,
  asUser,
  demoUsers,
  demoSchemaVersion,
  refreshLocalSchema,
} from "./demo-runtime.mjs";
import { isDemoEnabled, isVercelPreview } from "./demo-environment.mjs";

const localGlobal = globalThis as typeof globalThis & {
  operatorDemoDb?: Promise<PGlite>;
  operatorDemoVersion?: string;
};
export function assertDemo() {
  if (!isDemoEnabled())
    throw new Error("La demostración está deshabilitada en producción.");
}
export function demoDirectory() {
  assertDemo();
  if (isVercelPreview()) return path.join(tmpdir(), "fourpack-preview-demo");
  return (
    process.env.FOURPACK_DEMO_DIRECTORY ??
    path.resolve(/* turbopackIgnore: true */ process.cwd(), "../../.4pack-demo")
  );
}
export async function localDatabase() {
  assertDemo();
  if (
    localGlobal.operatorDemoDb &&
    localGlobal.operatorDemoVersion !== demoSchemaVersion
  ) {
    localGlobal.operatorDemoDb = localGlobal.operatorDemoDb.then(async (db) => {
      await refreshLocalSchema(db);
      return db;
    });
    localGlobal.operatorDemoVersion = demoSchemaVersion;
  }
  if (!localGlobal.operatorDemoDb)
    localGlobal.operatorDemoDb = (async () => {
      await mkdir(demoDirectory(), { recursive: true });
      const db = await createLocalDatabase(
        path.join(demoDirectory(), "database"),
      );
      localGlobal.operatorDemoVersion = demoSchemaVersion;
      return db;
    })().catch((error) => {
      localGlobal.operatorDemoDb = undefined;
      throw error;
    });
  return localGlobal.operatorDemoDb;
}
export async function demoIdentity() {
  assertDemo();
  const identity = (await cookies()).get("fourpack-demo")?.value;
  if (!identity || !["operator", "pending", "suspended"].includes(identity))
    redirect("/demo/acceso");
  return demoUsers[identity as "operator" | "pending" | "suspended"];
}
export const operatorSession = cache(async () => {
  // A Preview is exclusively a simulated environment, even if its project has environment variables.
  if (isVercelPreview()) redirect("/demo/acceso");
  const client = await createSupabaseServerClient();
  if (!client) redirect("/acceso?configuracion=pendiente");
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) redirect("/acceso");
  const profile = await client
    .from("profiles")
    .select("id,role")
    .eq("id", data.user.id)
    .single();
  if (profile.error)
    throw new Error("No pudimos verificar los permisos de tu cuenta.");
  if (profile.data.role !== "operator")
    redirect(profile.data.role === "admin" ? "/admin" : "/");
  return { client, user: data.user };
});
export const loadSnapshot = cache(async (demo = false): Promise<Snapshot> => {
  if (demo) {
    const user = await demoIdentity();
    const db = await localDatabase();
    const result = await asUser<{ data: Snapshot }>(
      db,
      user,
      "select public.operator_snapshot() as data",
    );
    const snapshot = result.rows[0].data;
    snapshot.profile.email =
      user === demoUsers.operator ? "operador@4pack.demo" : "cuenta@4pack.demo";
    return snapshot;
  }
  const { client, user } = await operatorSession();
  const { data, error } = await client.rpc("operator_snapshot");
  if (error)
    throw new Error(
      "No pudimos cargar el panel. Intentá nuevamente o contactá a soporte.",
    );
  const snapshot = data as Snapshot;
  snapshot.profile.email = user.email;
  return snapshot;
});
export async function executeCommand(
  demo: boolean,
  command: string,
  payload: Record<string, unknown>,
) {
  if (demo) {
    const user = await demoIdentity();
    const db = await localDatabase();
    const result = await asUser<{ result: { id?: string } }>(
      db,
      user,
      "select public.operator_command($1,$2::jsonb) as result",
      [command, JSON.stringify(payload)],
    );
    return result.rows[0].result;
  }
  const { client } = await operatorSession();
  const { data, error } = await client.rpc("operator_command", {
    command,
    payload,
  });
  if (error)
    throw new Error(
      error.code === "P0001"
        ? error.message
        : "No pudimos guardar los cambios. Revisá los datos e intentá nuevamente.",
    );
  return data as { id?: string };
}

export async function executeQuoteCommand(demo: boolean, command: string, payload: Record<string, unknown>) {
  if (demo) {
    const actor = await demoIdentity();
    const db = await localDatabase();
    const result = await asUser<{result:{id:string}}>(db,actor,"select public.quote_command($1,$2::jsonb) as result",[command,JSON.stringify(payload)]);
    return result.rows[0].result;
  }
  const {client} = await operatorSession();
  const {data,error} = await client.rpc("quote_command",{command,payload});
  if (error) throw new Error(error.code==="P0001"?error.message:"No pudimos guardar la cotización.");
  return data as {id:string};
}
export async function demoAward(offerId: string) {
  const snapshot = await loadSnapshot(true);
  if (
    snapshot.operator.verification_status !== "approved" ||
    !snapshot.offers.some(
      (o) =>
        o.id === offerId &&
        o.operator_id === snapshot.profile.id &&
        o.status === "submitted",
    )
  )
    throw new Error(
      "La oferta no está disponible para adjudicar en esta demostración.",
    );
  const db = await localDatabase();
  const result = await asUser<{ id: string }>(
    db,
    demoUsers.importer,
    "select public.award_offer($1) as id",
    [offerId],
  );
  await asUser(db, demoUsers.importer, "select public.simulate_guarantee($1)", [
    result.rows[0].id,
  ]);
  return result.rows[0].id;
}

// Only local/Preview: mirrors the trusted Edge gateway after byte validation.
export async function registerDemoDocument(payload: Record<string, unknown>, bytes: Uint8Array) {
  const actor = await demoIdentity();
  const db = await localDatabase();
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return db.transaction(async tx => {
    await tx.query("insert into storage.objects(bucket_id,name,owner_id,metadata,user_metadata) values('documents',$1,$2,$3,$4)",
      [payload.storage_path,actor,JSON.stringify({size:bytes.length,mimetype:payload.mime_type}),JSON.stringify({uploaded_by:actor,sha256})]);
    await tx.query("select public.register_document_upload($1,$2::jsonb)",[actor,JSON.stringify({...payload,sha256})]);
  });
}
