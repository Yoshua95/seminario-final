"use client";
import { useActionState } from "react";
import { serviceTaxonomy, type NormalizedQuote } from "@4pack/domain";
import { operatorAction } from "./actions";
import { localDateTime } from "./types";

export function QuoteEditor({demo,cargoId,draftId,replacesOfferId,initial={},deadline}:{demo:boolean;cargoId:string;draftId?:string;replacesOfferId?:string;initial?:Partial<NormalizedQuote>;deadline?:string|null}) {
  const [state,action,pending]=useActionState(operatorAction.bind(null,demo,"quote"),{ok:false,message:""});
  const textFields=[['scope','Alcance del servicio'],['insurance','Seguro / cobertura'],['payment_terms','Condiciones de pago'],['responsibilities','Responsabilidades'],['observations','Observaciones']] as const;
  const listFields=[['included','Incluye'],['excluded','No incluye'],['required_documents','Documentación requerida']] as const;
  return <form action={action} className="op-form op-quote-editor">
    <input type="hidden" name="cargo_id" value={cargoId} /><input type="hidden" name="draft_id" value={state.ok && state.message==="Borrador guardado."?state.id??draftId??"":draftId??""} /><input type="hidden" name="replaces_offer_id" value={replacesOfferId??""} />
    <label>Modalidad<select name="mode" defaultValue={initial.mode??"sea"}><option value="sea">Marítimo</option><option value="air">Aéreo</option><option value="consolidated">Consolidado</option></select></label>
    <fieldset><legend>Servicios</legend><div className="op-checkboxes">{Object.entries(serviceTaxonomy).map(([key,label])=><label key={key}><input type="checkbox" name="services" value={key} defaultChecked={initial.services?.includes(key as keyof typeof serviceTaxonomy)} />{label}</label>)}</div></fieldset>
    <div className="op-form-grid"><label>Precio total<input name="amount" type="number" min="0.01" max="999999999" step="0.01" defaultValue={initial.amount} /></label>
    <label>Moneda contractual<select name="currency" defaultValue={initial.currency??"USD"}><option>USD</option><option>ARS</option></select></label>
    <label>Plazo estimado (días)<input name="estimated_days" type="number" min="1" max="365" step="1" defaultValue={initial.estimated_days} /></label>
    <label>Vigencia<input type="datetime-local" name="valid_until" defaultValue={initial.valid_until&&Number.isFinite(Date.parse(initial.valid_until))?localDateTime(new Date(initial.valid_until)).slice(0,16):""} max={deadline?localDateTime(new Date(deadline)).slice(0,16):undefined} /></label></div>
    {textFields.map(([key,label])=><label key={key}>{label}<textarea name={key} maxLength={2000} defaultValue={initial[key]??""} /></label>)}
    {listFields.map(([key,label])=><label key={key}>{label}<textarea name={key} placeholder="Un concepto por línea. Declarar expresamente si no corresponde." maxLength={5000} defaultValue={initial[key]?.join("\n")??""} /></label>)}
    <p className="op-small">La coordinación aduanera no equivale a actuar como despachante habilitado. Una propuesta presentada queda sellada; retirarla o reemplazarla conserva su historial. Todos los términos son obligatorios al presentar.</p>
    {state.message&&<p role={state.ok?"status":"alert"}>{state.message}</p>}
    <div className="op-modal-actions"><button className="op-button secondary" name="intent" value="save" disabled={pending}>Guardar borrador</button><button className="op-button" name="intent" value="submit" disabled={pending}>Enviar Oferta Ciega</button></div>
  </form>;
}
export function WithdrawQuote({demo,id}:{demo:boolean;id:string}) {
  const [state,action,pending]=useActionState(operatorAction.bind(null,demo,"quote"),{ok:false,message:""});
  return <form action={action}><input name="offer_id" type="hidden" value={id} /><button className="op-button secondary" name="intent" value="withdraw" disabled={pending}>Retirar oferta</button>{state.message&&<p role={state.ok?"status":"alert"}>{state.message}</p>}</form>;
}
