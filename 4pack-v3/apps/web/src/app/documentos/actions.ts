"use server";
import { revalidatePath } from "next/cache";
import { uploadAuthorizedDocument } from "@/lib/document-upload";

export async function uploadImporterDocument(form: FormData) {
  try {
    await uploadAuthorizedDocument(form);
    revalidatePath("/documentos");
    return { ok: true, message: "Documento cargado y vinculado correctamente." };
  } catch {
    return { ok: false, message: "No pudimos subir el documento. Revisá archivo y permisos." };
  }
}
