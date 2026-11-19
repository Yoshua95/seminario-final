"use server";
import { uploadAuthorizedDocument } from "@/lib/document-upload";
import { validateDocumentBytes } from "../../../../../supabase/functions/_shared/document-validation.mjs";
import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { validateOffer, validateDocument } from "@4pack/domain";
import { validateQuote, assertNewContractCurrency, type NormalizedQuote } from "@4pack/domain";
import {
  loadSnapshot,
  executeCommand,
  executeQuoteCommand,
  executeVolumeProposal,
  submitOperatorRating,
  registerDemoDocument,
  operatorSession,
  demoIdentity,
  demoDirectory,
  demoAward,
  assertDemo,
} from "./data";
import type { ActionResult } from "./types";

export async function proposeVolume(demo:boolean,_previous:ActionResult,form:FormData):Promise<ActionResult>{
 try{
  const volume=Number(form.get('volume_m3')),cargo=String(form.get('cargo_id')??'');
  if(!Number.isFinite(volume)||volume<=0||volume>=1000000)throw Error('Ingresá un volumen válido.');
  const id=await executeVolumeProposal(demo,cargo,volume);revalidatePath(demo?'/demo/operador':'/operador','layout');
  return{ok:true,id,message:'Volumen propuesto. El importador debe confirmarlo antes de reservar capacidad.'};
 }catch(error){unstable_rethrow(error);return{ok:false,message:error instanceof Error?error.message:'No se pudo proponer el volumen.'};}
}

export async function startDemo(form: FormData) {
  assertDemo();
  const value = String(form.get("scenario"));
  const identity = ["operator", "pending", "suspended"].includes(value)
    ? value
    : "operator";
  (await cookies()).set("fourpack-demo", identity, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 86400,
  });
  redirect("/demo/operador/oportunidades");
}
export async function signOutOperator(demo: boolean) {
  if (demo) {
    assertDemo();
    if((await import("../multirole/environment.mjs")).isMultiroleDemo()) { await (await import("../multirole/session")).closeRehearsalSession(); redirect("/demo/acceso"); }
    (await cookies()).delete("fourpack-demo");
    redirect("/demo/acceso");
  }
  const { client } = await operatorSession();
  const { error } = await client.auth.signOut();
  if (error) throw new Error("No pudimos cerrar tu sesión.");
  redirect("/acceso");
}
export async function operatorAction(
  demo: boolean,
  command: string,
  _previous: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  try {
    const allowed = [
      "rating",
      "quote",
      "commercial_profile",
      "offer",
      "advance",
      "milestone",
      "message",
      "read",
      "withdraw",
      "ticket",
      "support_message",
      "profile",
      "document",
      "demo_award",
    ];
    if (!allowed.includes(command)) throw new Error("Acción no disponible.");
    const payload: Record<string, unknown> = {};
    for (const [key, value] of form.entries())
      if (typeof value === "string") payload[key] = value.trim();
    if(command==='rating'){
      const result=await submitOperatorRating(demo,String(payload.id??''),Number(payload.score),String(payload.comment??''));
      revalidatePath(demo?'/demo/operador':'/operador','layout');
      return {ok:true,message:'Evaluación del importador registrada.',id:result.id};
    }
    if (command === "quote") {
      const intent=String(form.get("intent") ?? "submit");
      const lines=(key:string)=>String(form.get(key)??"").split(/\n/).map(s=>s.trim()).filter(Boolean);
      const input:Record<string,unknown>={cargo_id:String(form.get("cargo_id")??""),draft_id:String(form.get("draft_id")??""),replaces_offer_id:String(form.get("replaces_offer_id")??""),offer_id:String(form.get("offer_id")??"")};
      let validUntil=String(form.get("valid_until")??"");
      if (validUntil && !/Z$|[+-]\d{2}:\d{2}$/.test(validUntil)) validUntil += (validUntil.length===16?":00":"")+"-03:00";
      const quote={working_capital_amount:String(form.get("working_capital_amount")??""),working_capital_currency:String(form.get("working_capital_currency")??""),mode:String(form.get("mode")??""),services:form.getAll("services").map(String),scope:String(form.get("scope")??""),amount:String(form.get("amount")??""),currency:String(form.get("currency")??""),included:lines("included"),excluded:lines("excluded"),insurance:String(form.get("insurance")??""),estimated_days:String(form.get("estimated_days")??""),valid_until:validUntil,payment_terms:String(form.get("payment_terms")??""),required_documents:lines("required_documents"),responsibilities:String(form.get("responsibilities")??""),observations:String(form.get("observations")??"")} as NormalizedQuote;
      if (intent !== "withdraw") {
        assertNewContractCurrency(quote.currency);
        assertNewContractCurrency(quote.working_capital_currency);
        if(intent!=="save") {const error=validateQuote(quote); if(error) throw new Error(error);}
        input.quote=quote;
      }
      const result=await executeQuoteCommand(demo,intent,input);
      revalidatePath(demo?"/demo/operador":"/operador","layout");
      return {ok:true,message:intent==="save"?"Borrador guardado.":intent==="withdraw"?"Oferta retirada.":"Oferta presentada y sellada.",id:result.id};
    }
    if (command === "commercial_profile") {
      const commercial:Record<string,unknown>={};
      for(const key of ["trade_name","logo_url","description","city","province","country","experience_years"]) commercial[key]=String(form.get(key)??"").trim();
      for(const key of ["specialties","coverage","categories"]) commercial[key]=String(form.get(key)??"").split(",").map(s=>s.trim()).filter(Boolean);
      commercial.modes=form.getAll("modes").map(String);
      commercial.published=form.get("published")==="on";
      await executeCommand(demo,"commercial_profile",commercial);
      revalidatePath(demo?"/demo/operador":"/operador","layout");
      revalidatePath(demo?"/demo/operadores":"/operadores","layout");
      return {ok:true,message:"Perfil comercial guardado."};
    }
    if (command === "profile")
      payload.modes = form
        .getAll("modes")
        .filter(
          (v): v is string =>
            typeof v === "string" && ["air", "sea"].includes(v),
        );
    if (
      command === "milestone" &&
      typeof payload.occurred_at === "string" &&
      !/Z$|[+-]\d{2}:\d{2}$/.test(payload.occurred_at)
    )
      payload.occurred_at +=
        (payload.occurred_at.length === 16 ? ":00" : "") + "-03:00";
    if (command === "offer") {
      assertNewContractCurrency(payload.currency);
      const snapshot = await loadSnapshot(demo);
      const cargo = snapshot.cargos.find((c) => c.id === payload.id);
      if (!cargo) throw new Error("La carga ya no está disponible.");
      const error = validateOffer({
        amount: Number(payload.amount),
        days: Number(payload.days),
        mode: String(payload.mode),
        status: snapshot.operator.verification_status,
        closesAt: cargo.bidding_deadline,
        cargoStatus: cargo.status,
        hasActiveOffer: snapshot.offers.some(
          (o) =>
            o.cargo_id === cargo.id &&
            ["submitted", "accepted"].includes(o.status),
        ),
      });
      if (error) throw new Error(error);
    }
    if (command === "document") {
      const file = form.get("file");
      if (!(file instanceof File)) throw new Error("Seleccioná un archivo.");
      const error = validateDocument(file.name, file.size, file.type);
      if (error) throw new Error(error);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const extension = validateDocumentBytes(file.name,file.type,bytes);
      const userId = demo
        ? await demoIdentity()
        : (await operatorSession()).user.id;
      const filename = `${crypto.randomUUID()}.${extension}`;
      const storagePath = `${userId}/${filename}`;
      Object.assign(payload, {
        storage_path: storagePath,
        original_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
      });
      if (demo) {
        const folder = path.join(demoDirectory(), "files", userId);
        await mkdir(folder, { recursive: true });
        const localPath = path.join(folder, filename);
        await writeFile(localPath, bytes);
        try {
          await registerDemoDocument(payload, bytes);
        } catch (error) {
          await unlink(localPath);
          throw error;
        }
      } else {
        const upload = new FormData();
        for (const key of ["id", "target_type", "document_type", "replaces_id"])
          if (typeof payload[key] === "string") upload.set(key, payload[key]);
        upload.set("file", file);
        await uploadAuthorizedDocument(upload);
      }
    } else if (command === "demo_award") {
      if (!demo)
        throw new Error("Función disponible únicamente en la demostración.");
      await demoAward(String(payload.id));
    } else {
      const result = await executeCommand(demo, command, payload);
      revalidatePath(demo ? "/demo/operador" : "/operador", "layout");
      return {
        ok: true,
        message:
          command === "offer"
            ? "Oferta presentada y sellada."
            : command === "withdraw"
              ? "Solicitud simulada registrada. No se movió dinero real."
              : "Cambios guardados.",
        id: result.id,
      };
    }
    revalidatePath(demo ? "/demo/operador" : "/operador", "layout");
    return {
      ok: true,
      message:
        command === "demo_award"
          ? "Adjudicación de demostración confirmada. Consultá Operaciones."
          : "Documento guardado.",
    };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false,
      message:
        error instanceof Error
          ? "code" in error &&
            typeof error.code === "string" &&
            error.code !== "P0001"
            ? "No pudimos guardar los cambios. Revisá los datos e intentá nuevamente."
            : error.message
          : "No pudimos completar la acción. Intentá nuevamente.",
    };
  }
}
export async function documentUrl(
  demo: boolean,
  id: string,
): Promise<ActionResult> {
  try {
    const snapshot = await loadSnapshot(demo);
    const document = snapshot.documents.find((d) => d.id === id);
    if (!document)
      throw new Error("No tenés permiso para acceder a este documento.");
    if (demo)
      return {
        ok: true,
        message: "Documento disponible.",
        url: `/demo/documentos/${encodeURIComponent(id)}`,
      };
    const { client } = await operatorSession();
    const { data, error } = await client.storage
      .from("documents")
      .createSignedUrl(document.storage_path, 60);
    if (error) throw new Error("No pudimos generar un enlace seguro.");
    return {
      ok: true,
      message: "Enlace válido durante 60 segundos.",
      url: data.signedUrl,
    };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Documento no disponible.",
    };
  }
}
export async function readDemoFile(id: string) {
  const snapshot = await loadSnapshot(true);
  const document = snapshot.documents.find((d) => d.id === id);
  if (!document) throw new Error("Documento no disponible");
  const expected = path.resolve(demoDirectory(), "files");
  const filePath = path.resolve(expected, document.storage_path);
  if (!filePath.startsWith(expected + path.sep))
    throw new Error("Ruta inválida");
  return { document, bytes: await readFile(filePath) };
}
