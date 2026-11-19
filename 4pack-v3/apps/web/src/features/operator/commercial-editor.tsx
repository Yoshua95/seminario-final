import { ActionForm } from "./forms";
import type { CommercialProfile } from "./types";
export function CommercialEditor({demo,profile:p}:{demo:boolean;profile:CommercialProfile|null}) {
  return <section className="op-panel"><h2>Perfil comercial público</h2>
    <p className="op-small">Visible para usuarios autenticados cuando tu empresa esté aprobada y el perfil publicado. No incluyas CUIT, domicilio exacto, teléfonos, correos o documentos en estos campos.</p>
    {p?.admin_hidden&&<p role="status">La administración ocultó este perfil del directorio.</p>}
    <ActionForm demo={demo} command="commercial_profile" label="Guardar perfil comercial">
      <div className="op-form-grid"><label>Nombre comercial público<input name="trade_name" defaultValue={p?.trade_name??""} minLength={3} maxLength={150} required /></label>
      <label>Logotipo (URL HTTPS pública)<input name="logo_url" type="url" defaultValue={p?.logo_url??""} maxLength={500} /></label>
      <label>Ciudad<input name="city" defaultValue={p?.city??""} maxLength={100} /></label><label>Provincia<input name="province" defaultValue={p?.province??""} maxLength={100} /></label><label>País<input name="country" defaultValue={p?.country??""} maxLength={100} /></label>
      <label>Años de experiencia declarados<input name="experience_years" type="number" min="0" max="150" defaultValue={p?.experience_years??""} /></label></div>
      <label>Descripción comercial<textarea name="description" defaultValue={p?.description??""} maxLength={2000} /></label>
      <fieldset><legend>Modalidades comerciales</legend><div className="op-checkboxes">{["sea","air","consolidated"].map(m=><label key={m}><input name="modes" type="checkbox" value={m} defaultChecked={p?.modes.includes(m)} />{m==="sea"?"Marítimo":m==="air"?"Aéreo":"Consolidado"}</label>)}</div></fieldset>
      {([['specialties','Especialidades'],['coverage','Cobertura'],['categories','Categorías atendidas']] as const).map(([key,label])=><label key={key}>{label} (separar con comas)<input name={key} maxLength={2000} defaultValue={p?.[key].join(", ")??""} /></label>)}
      <label><input name="published" type="checkbox" defaultChecked={p?.published??false} /> Publicar cuando esté aprobado</label>
    </ActionForm>
  </section>;
}
