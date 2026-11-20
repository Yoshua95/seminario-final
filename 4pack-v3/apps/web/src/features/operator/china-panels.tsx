"use client";
import {useRef,useState,type ReactNode,type FormEvent} from "react";
import {warehouseAddress,type ChinaWarehouse,type ChinaCoordination,type ChinaRevision} from "@4pack/domain";
import {chinaAction} from "./china-actions";
function ChinaForm({command,payload,label,children}:{command:string;payload?:Record<string,unknown>;label:string;children:ReactNode}){
 const key=useRef<string|null>(null),[busy,setBusy]=useState(false),[status,setStatus]=useState<{ok:boolean;message:string}|null>(null);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!key.current)key.current=crypto.randomUUID();const f=new FormData(e.currentTarget);const data:Record<string,unknown>={...payload,...Object.fromEntries(f)};
  for(const name of ["active","is_default"])if(f.has(name))data[name]=f.get(name)==="true";
  if(command==="receipt")data.measurements={packages:Number(f.get("packages")),weight_kg:Number(f.get("weight_kg")),length_cm:Number(f.get("length_cm")),width_cm:Number(f.get("width_cm")),height_cm:Number(f.get("height_cm")),estimated:false};
  setBusy(true);try{setStatus(await chinaAction(command,key.current,data));}catch{setStatus({ok:false,message:"No se pudo conectar. Reintentá sin cambiar los datos."});}finally{setBusy(false);}
 }
 return <form className="op-form" onSubmit={e=>void submit(e)} onChange={()=>{key.current=null;setStatus(null);}}>{children}<button className="op-button" disabled={busy}>{busy?"Guardando…":label}</button>{status&&<p role={status.ok?"status":"alert"}>{status.message}</p>}</form>;
}
export function ChinaWarehouses({warehouses}:{warehouses:ChinaWarehouse[]}){
 const fields:Record<string,string>={alias:"Nombre interno",recipient:"Destinatario",phone:"Teléfono",province:"Provincia",city:"Ciudad",district:"Distrito",postal_code:"Código postal",address_zh:"Dirección exacta en chino",instructions:"Instrucciones de recepción"};
 function editor(w?:ChinaWarehouse){return <ChinaForm key={w?.id??"new"} command="warehouse" payload={w?{id:w.id}:undefined} label={w?"Guardar depósito":"Agregar depósito"}>
  {Object.entries(fields).map(([name,label])=><label key={name}>{label}<input name={name} defaultValue={w?.[name as keyof ChinaWarehouse]?.toString()??""} required={!["district","postal_code"].includes(name)} maxLength={name==="address_zh"||name==="instructions"?2000:250}/></label>)}
  <label>Estado<select name="active" defaultValue={String(w?.active??true)}><option value="true">Activo</option><option value="false">Inactivo</option></select></label>
  <label>Predeterminado<select name="is_default" defaultValue={String(w?.is_default??false)}><option value="false">No</option><option value="true">Sí</option></select></label>
 </ChinaForm>;}
 return <section className="op-panel" id="depositos-china"><h2>Depósitos en China</h2><p>La dirección completa solo se entrega al importador al adjudicar. Editar o desactivar no modifica operaciones anteriores.</p>
  {warehouses.map(w=><details key={w.id}><summary>{w.alias} · {w.city} · {w.active?"Activo":"Inactivo"} {w.is_default?"· Predeterminado":""}</summary>{editor(w)}</details>)}<details><summary>Agregar depósito</summary>{editor()}</details>
 </section>;
}
export function ChinaOperationPanel({coord,revisions}:{coord:ChinaCoordination;revisions:ChinaRevision[]}){
 const [copyError,setCopyError]=useState("");
 return <section className="op-panel"><h2>Coordinación en China</h2><p><strong>{coord.state==="awaiting_dispatch"?coord.origin_plan.handoff==="pickup"?"Próximo paso: operador retira en el agente":"Próximo paso: importador coordina el despacho":coord.state==="in_transit_to_warehouse"?"Próximo paso: operador confirma recepción y medidas":"Recibido en el depósito de China"}</strong></p>
  <p>Operación {coord.operation_id} · La recepción en origen no es entrega en Argentina ni libera fondos.</p><p>{coord.origin_plan.kind==="agent"?"Agente":"Proveedor"}: {coord.origin_plan.agent_name} · {coord.origin_plan.origin.city||coord.origin_plan.origin.province} · {coord.origin_plan.origin.address} · Referencia: {coord.origin_plan.package_reference||"Sin referencia"}</p>
  <pre style={{whiteSpace:"pre-wrap"}}>{warehouseAddress(coord.warehouse_snapshot,[coord.operation_id,coord.origin_plan.package_reference].filter(Boolean).join(" · "))}</pre><button className="op-button secondary" onClick={()=>void navigator.clipboard.writeText(warehouseAddress(coord.warehouse_snapshot,[coord.operation_id,coord.origin_plan.package_reference].filter(Boolean).join(" · "))).catch(()=>setCopyError("No se pudo copiar. Seleccioná el texto de la dirección."))}>Copiar dirección</button>{copyError&&<p role="alert">{copyError}</p>}
  {coord.tracking_reference&&<p>Seguimiento local: {coord.tracking_reference}</p>}
  {coord.state==="awaiting_dispatch"&&coord.origin_plan.handoff==="pickup"&&<ChinaForm command="dispatch" payload={{operation_id:coord.operation_id}} label="Registrar retiro"><label>Referencia del retiro<input name="tracking_reference" maxLength={250}/></label></ChinaForm>}
  {coord.state==="in_transit_to_warehouse"&&<ChinaForm command="receipt" payload={{operation_id:coord.operation_id}} label="Confirmar recepción en China"><h3>Medidas reales recibidas</h3>{Object.entries({packages:"Bultos",weight_kg:"Peso total (kg)",length_cm:"Largo por bulto (cm)",width_cm:"Ancho por bulto (cm)",height_cm:"Alto por bulto (cm)"}).map(([key,label])=><label key={key}>{label}<input type="number" name={key} min="0.001" step={key==="packages"?"1":"any"} required defaultValue={coord.origin_plan.measurements[key as keyof typeof coord.origin_plan.measurements]?.toString()}/></label>)}</ChinaForm>}
  {coord.measured&&<p>Recibidos: {coord.measured.packages} bultos · {coord.measured.weight_kg} kg · {coord.measured.volume_m3} m³ · {coord.received_at}</p>}
  {revisions.map(r=><article key={r.id}><h3>Ajuste {r.status==="proposed"?"pendiente del importador":r.status==="accepted"?"aceptado":"rechazado"}</h3><p>ARS {r.amount_ars} · {r.estimated_days} días · {r.conditions}</p><p>{r.reason}</p></article>)}
  {coord.state==="received_in_china"&&!revisions.some(r=>r.status==="proposed")&&<details><summary>Proponer ajuste de precio, plazo o condiciones</summary><p>El importador debe aceptarlo. Un cambio de importe requiere conciliación adicional; no altera el pago original.</p><ChinaForm command="revision" payload={{operation_id:coord.operation_id,currency:"ARS"}} label="Enviar ajuste al importador"><label>Nuevo total ARS<input name="amount_ars" type="number" min="0.01" step="0.01" required/></label><label>Plazo en días<input name="estimated_days" type="number" min="1" max="365" required/></label><label>Condiciones<textarea name="conditions" minLength={5} required/></label><label>Motivo<textarea name="reason" minLength={5} required/></label></ChinaForm></details>}
 </section>;
}
