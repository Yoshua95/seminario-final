import { RefreshProfile } from "./refresh-profile";
import {ChinaWarehouses} from "./china-panels";
import Link from "next/link";
import type { Snapshot } from "./types";
import { Badge, PageHeader } from "./ui";
import { ActionForm, DocumentButton } from "./forms";
import { CommercialEditor } from "./commercial-editor";
import { CompanyApplication } from "./company-application";
export function CompanyProfile({
  data,
  demo,
}: {
  data: Snapshot;
  demo: boolean;
}) {
  const c = data.operator,
    base = demo ? "/demo/operador" : "/operador",
    docs = data.documents.filter(
      (d) =>
        d.operator_id === data.profile.id &&
        !data.documents.some((n) => n.replaces_id === d.id),
    ),
    missing = !docs.some(
      (d) =>
        d.document_type === "Credencial del operador" &&
        d.validation_status === "approved",
    );
  return (
    <>
      <PageHeader
        title="Perfil empresarial"
        description="Tu empresa, sus rutas, servicios y documentación."
        action={<Badge status={c.verification_status} />}
      />
      <section className="op-panel profile-overview">
        <h2>{c.company_name}</h2>
        <p>
          {c.verification_status === "approved"
            ? "Empresa habilitada. Podés cotizar en tus rutas y servicios autorizados."
            : c.verification_status === "suspended"
              ? "Cuenta suspendida. Contactá a Administración para su revisión."
              : "Administración debe revisar tu postulación."}
        </p>
        {missing && (
          <p role="status">
            Falta presentar o validar la credencial del operador.
          </p>
        )}
        {c.rejection_reason && <p role="alert">{c.rejection_reason}</p>}
        <nav aria-label="Secciones del perfil">
          <a href="#empresa">Datos de la empresa</a>
          <a href="#documentacion">Documentación</a>
        </nav>
        <RefreshProfile />
      </section>
      {!demo && (
        <CompanyApplication
          companyName={c.company_name}
          taxId={c.tax_id}
          documentIds={docs.map((d) => d.id)}
        />
      )}
      <section className="op-panel" id="empresa">
        {!demo&&<ChinaWarehouses warehouses={data.chinaWarehouses??[]}/>}
        <h2>Datos de la empresa</h2>
        <dl className="profile-facts">
          <div>
            <dt>Razón social</dt>
            <dd>{c.company_name}</dd>
          </div>
          <div>
            <dt>CUIT</dt>
            <dd>{c.tax_id}</dd>
          </div>
          <div>
            <dt>Responsable</dt>
            <dd>{data.profile.full_name}</dd>
          </div>
          <div>
            <dt>Contacto</dt>
            <dd>{data.profile.phone || "Sin informar"}</dd>
          </div>
        </dl>
        <details>
          <summary>Editar datos de la empresa</summary>
          <ActionForm demo={demo} command="profile" label="Guardar datos">
            <div className="op-form-grid">
              {[
                ["company_name", "Razón social", c.company_name],
                ["tax_id", "CUIT", c.tax_id],
                ["full_name", "Responsable", data.profile.full_name],
                ["phone", "Teléfono", data.profile.phone ?? ""],
              ].map(([key, label, value]) => (
                <label key={key}>
                  {label}
                  <input
                    name={key}
                    defaultValue={value}
                    readOnly={
                      ["company_name", "tax_id"].includes(key) &&
                      c.verification_status === "approved"
                    }
                    required={key !== "phone"}
                  />
                </label>
              ))}
            </div>
            <details>
              <summary>Información comercial opcional</summary>
              {[
                ["trade_name", "Nombre comercial", c.trade_name],
                ["address", "Dirección", c.address],
                ["routes", "Rutas", c.routes],
                ["certifications", "Certificaciones", c.certifications],
              ].map(([key, label, value]) => (
                <label key={key}>
                  {label}
                  <input name={key} defaultValue={value ?? ""} />
                </label>
              ))}
            </details>
            <label>
              Descripción
              <textarea name="description" defaultValue={c.description ?? ""} />
            </label>
            <fieldset>
              <legend>Modalidades</legend>
              {["air", "sea", "consolidated"].map((m) => (
                <label key={m}>
                  <input
                    type="checkbox"
                    name="modes"
                    value={m}
                    defaultChecked={c.modes.includes(m)}
                  />
                  {
                    (
                      {
                        air: "Aéreo",
                        sea: "Marítimo",
                        consolidated: "Consolidado",
                      } as Record<string, string>
                    )[m]
                  }
                </label>
              ))}
            </fieldset>
          </ActionForm>
        </details>
        <details>
          <summary>Editar presentación pública</summary>
          <CommercialEditor demo={demo} profile={data.commercial} />
        </details>
      </section>
      <section className="op-panel" id="documentacion">
        <h2>Documentación</h2>
        <p>
          Documentos vigentes de tu empresa. Los archivos de una operación se
          gestionan en esa operación.
        </p>
        {docs.map((d) => (
          <div className="op-document-inline" key={d.id}>
            <div>
              <strong>{d.document_type}</strong>
              <p>{d.original_name}</p>
              {d.rejection_reason && <p>{d.rejection_reason}</p>}
            </div>
            <Badge status={d.validation_status} />
            <DocumentButton demo={demo} document={d} />
          </div>
        ))}
        {!docs.length && <p>Sin documentación presentada.</p>}
        <details>
          <summary>Adjuntar documentación empresarial</summary>
          <ActionForm demo={demo} command="document" label="Subir documento">
            <input type="hidden" name="target_type" value="operator" />
            <input type="hidden" name="id" value={data.profile.id} />
            <label>
              Tipo
              <select name="document_type">
                <option>Credencial del operador</option>
                <option>Otro</option>
              </select>
            </label>
            <label>
              Archivo PDF, JPG o PNG · hasta 10 MB
              <input
                type="file"
                name="file"
                accept="application/pdf,image/jpeg,image/png"
                required
              />
            </label>
          </ActionForm>
        </details>
        <Link className="op-text-link" href={base + "/documentos?empresa=1"}>
          Consultar versiones o reemplazar un archivo →
        </Link>
      </section>
    </>
  );
}
