"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { serviceTaxonomy } from "@4pack/domain";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
export function CompanyApplication({
  companyName = "",
  taxId = "",
  documentIds = [],
}: {
  companyName?: string;
  taxId?: string;
  documentIds?: string[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [initial, setInitial] = useState<Record<string, unknown> | null>(null);
  const [requestId] = useState(() => crypto.randomUUID());
  useEffect(() => {
    const client = createSupabaseBrowserClient();
    if (!client) return;
    void client.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const r = await client
        .from("company_applications")
        .select("*")
        .eq("operator_id", data.user.id)
        .maybeSingle();
      if (r.data) setInitial(r.data);
    });
  }, []);
  return (
    <section className="op-panel" id="habilitacion">
      <h2>Ficha de habilitación</h2>
      <p>
        Declarás empresa, ruta y servicios una sola vez. El sistema comprueba
        formato de CUIT, duplicados y correo confirmado. Administración coteja
        la documentación y decide la habilitación; no se acredita una consulta a
        registros externos.
      </p>
      {initial && (
        <p role="status">
          Estado:{" "}
          {(
            {
              pending: "En revisión",
              approved: "Habilitada",
              correction: "Requiere corrección",
              rejected: "Rechazada",
            } as Record<string, string>
          )[String(initial.state)] ?? String(initial.state)}
          . {String(initial.correction ?? "")}
        </p>
      )}
      <form
        key={initial ? String(initial.declared_at) : "new"}
        className="op-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget),
            client = createSupabaseBrowserClient();
          if (!client) {
            setMessage("Conexión no configurada. Volvé a intentar.");
            return;
          }
          setBusy(true);
          setMessage("");
          try {
            const payload = {
              company_name: String(data.get("company_name")),
              tax_id: String(data.get("tax_id")),
              origin: String(data.get("origin")),
              destination: String(data.get("destination")),
              modes: data.getAll("modes").map(String),
              services: data.getAll("services").map(String),
              document_ids: documentIds,
              description: String(data.get("description") ?? ""),
            };
            const r = await client.rpc("submit_company_application", {
              request_id: requestId,
              payload,
            });
            if (r.error)
              throw Error(
                r.error.code === "P0001"
                  ? r.error.message
                  : "No se pudo presentar la ficha. Reintentá sin cerrar esta pantalla.",
              );
            setMessage(
              "Ficha presentada. Administración revisará la ruta y los servicios declarados.",
            );
            router.refresh();
            if (window.location.pathname.startsWith("/empresa/"))
              router.replace("/operador/perfil");
          } catch (error) {
            setMessage(
              error instanceof Error
                ? error.message
                : "No se pudo presentar la ficha.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="op-form-grid">
          <label>
            Razón social
            <input
              required
              minLength={3}
              name="company_name"
              defaultValue={String(initial?.company_name ?? companyName)}
            />
          </label>
          <label>
            CUIT
            <input
              required
              name="tax_id"
              inputMode="numeric"
              defaultValue={String(initial?.tax_id ?? taxId)}
              placeholder="30-00000000-0"
            />
          </label>
          <label>
            Origen
            <select
              name="origin"
              defaultValue={String(initial?.origin ?? "China")}
            >
              <option>China</option>
              <option>Argentina</option>
            </select>
          </label>
          <label>
            Destino
            <select
              name="destination"
              defaultValue={String(initial?.destination ?? "Argentina")}
            >
              <option>Argentina</option>
              <option>China</option>
            </select>
          </label>
        </div>
        <fieldset>
          <legend>Modalidades declaradas</legend>
          {[
            ["air", "Aéreo"],
            ["sea", "Marítimo"],
            ["consolidated", "Consolidado"],
          ].map(([value, label]) => (
            <label key={value}>
              <input
                type="checkbox"
                name="modes"
                value={value}
                defaultChecked={
                  Array.isArray(initial?.modes)
                    ? initial.modes.includes(value)
                    : value === "sea"
                }
              />
              {label}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Servicios declarados</legend>
          {Object.entries(serviceTaxonomy).map(([value, label]) => (
            <label key={value}>
              <input
                type="checkbox"
                name="services"
                value={value}
                defaultChecked={
                  Array.isArray(initial?.services)
                    ? initial.services.includes(value)
                    : value === "international_transport"
                }
              />
              {label}
            </label>
          ))}
        </fieldset>
        <label>
          Presentación y aclaraciones
          <textarea
            name="description"
            defaultValue={String(initial?.description ?? "")}
            maxLength={2000}
          />
        </label>
        <p>
          {documentIds.length} documentos existentes vinculados. Los documentos
          empresariales se adjuntan desde Perfil empresarial y se reutilizan al
          presentar una corrección.
        </p>
        {message && <p role="status">{message}</p>}
        <button
          className="op-button primary"
          disabled={
            busy ||
            initial?.state === "approved" ||
            initial?.state === "rejected"
          }
        >
          {busy ? "Presentando…" : "Presentar ficha para revisión"}
        </button>
      </form>
    </section>
  );
}
