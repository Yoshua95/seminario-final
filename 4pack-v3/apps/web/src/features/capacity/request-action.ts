"use server";
import { unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { operatorSession, localDatabase, demoIdentity } from "../operator/data";
import { asUser } from "../operator/demo-runtime.mjs";
export async function requestCapital(
  demo: boolean,
  _previous: { ok: boolean; message: string },
  form: FormData,
) {
  try {
    const key = String(form.get("request_key")),
      total = String(form.get("total")),
      docs = form.getAll("documents").map(String);
    if (demo) {
      const actor = await demoIdentity();
      await asUser(
        await localDatabase(),
        actor,
        "select public.request_capital_increase($1,$2::numeric,$3::uuid[])",
        [key, total, docs],
      );
    } else {
      const { client } = await operatorSession();
      const r = await client.rpc("request_capital_increase", {
        request_key: key,
        requested_total: total,
        evidence: docs,
      });
      if (r.error)
        throw Error(
          r.error.code === "P0001"
            ? r.error.message
            : "No se pudo enviar la solicitud.",
        );
    }
    revalidatePath(demo ? "/demo/operador/perfil" : "/operador/perfil");
    return {
      ok: true,
      message: "Solicitud enviada. Podés seguir su estado en esta pantalla.",
    };
  } catch (e) {
    unstable_rethrow(e);
    return {
      ok: false,
      message: e instanceof Error ? e.message : "No se pudo solicitar.",
    };
  }
}
