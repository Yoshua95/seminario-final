import { isMultiroleDemo } from "../multirole/environment.mjs";
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
  if(isMultiroleDemo()) return (await (await import("../multirole/session")).rehearsalSession("operator")).id;
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
    snapshot.multirole = isMultiroleDemo();
    snapshot.profile.email =
      user === demoUsers.operator ? "operador@4pack.demo" : "cuenta@4pack.demo";
    const capacity = await asUser<{data: Snapshot["capacity"]}>(db,user,"select public.operator_capacity_snapshot() as data");
    snapshot.capacity = capacity.rows[0].data;
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
  const capacity = await client.rpc("operator_capacity_snapshot");
  if (capacity.error) throw new Error("No pudimos cargar capacidad.");
  snapshot.capacity = capacity.data;
  const payments = await client.from("mp_test_payments").select("operation_id,status,amount,currency,provider_payment_id");
  snapshot.payments = payments.data ?? [];
  snapshot.paymentsUnavailable = !!payments.error;
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
export async function executeVolumeProposal(demo:boolean,cargo:string,volume:number){
 if(demo){const actor=await demoIdentity(),db=await localDatabase();const r=await asUser<{id:string}>(db,actor,'select public.propose_cargo_volume($1,$2) id',[cargo,volume]);return r.rows[0].id;}
 const{client}=await operatorSession();const r=await client.rpc('propose_cargo_volume',{target_cargo:cargo,proposed_volume:volume});
 if(r.error)throw new Error(r.error.code==='P0001'?r.error.message:'No pudimos proponer el volumen.');return r.data as string;
}
export async function demoAward(offerId: string) {
  if(isMultiroleDemo()) throw new Error("La adjudicacion corresponde a la sesion del importador.");
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

export async function submitOperatorRating(demo:boolean,operationId:string,score:number,comment:string){
  if(!Number.isInteger(score)||score<1||score>5||comment.length>500)throw new Error('Puntaje o comentario inválido.');
  if(demo){
    const actor=await demoIdentity();
    const result=await asUser<{id:string}>(await localDatabase(),actor,`with eligible as (
      select id,importer_id from public.operations where id=$1 and operator_id=auth.uid() and phase='completed'
    ), inserted as (
      insert into public.ratings(operation_id,author_id,recipient_id,score,comment)
      select id,auth.uid(),importer_id,$2,$3 from eligible
      on conflict(operation_id,author_id) do nothing returning id
    ) select id from inserted union all select r.id from public.ratings r join eligible e on e.id=r.operation_id where r.author_id=auth.uid() limit 1`,[operationId,score,comment||null]);
    if(!result.rows[0])throw new Error('La evaluación requiere una operación completada propia.');
    return result.rows[0];
  }
  const {client,user}=await operatorSession();
  const operation=await client.from('operations').select('importer_id,phase').eq('id',operationId).eq('operator_id',user.id).single();
  if(operation.error||operation.data.phase!=='completed')throw new Error('La evaluación requiere una operación completada propia.');
  const existing=await client.from('ratings').select('id').eq('operation_id',operationId).eq('author_id',user.id).maybeSingle();
  if(existing.error)throw new Error('No se pudo consultar la evaluación.');
  if(existing.data)return existing.data;
  const result=await client.from('ratings').insert({operation_id:operationId,author_id:user.id,recipient_id:operation.data.importer_id,score,comment:comment||null}).select('id').single();
  if(result.error)throw new Error('No se pudo registrar la evaluación.');
  return result.data;
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
