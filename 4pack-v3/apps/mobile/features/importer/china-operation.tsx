import {useRef,useState} from "react";
import * as Clipboard from "expo-clipboard";
import {randomUUID} from "expo-crypto";
import {warehouseAddress,type ChinaCoordination,type ChinaRevision} from "@4pack/domain";
import {supabase} from "../../lib/supabase";
import {Card,Copy,Action,Field,Tag} from "./ui";
export function ChinaOperationCard({coord,revisions,refresh}:{coord:ChinaCoordination;revisions:ChinaRevision[];refresh:()=>void}){
 const [tracking,setTracking]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false),[copied,setCopied]=useState(false);
 const keys=useRef<Record<string,string>>({});
 async function run(command:string,args:Record<string,unknown>,key:string){
  if(!supabase)return;setBusy(true);setError("");keys.current[key]??=randomUUID();
  try{const r=await supabase.rpc(command,{...args,request_id:keys.current[key]});if(r.error)throw Error(r.error.message);refresh();}catch(e){setError(e instanceof Error?e.message:"No se pudo registrar. Reintentá.");}finally{setBusy(false);}
 }
 return <Card><Tag tone={coord.state==="received_in_china"?"green":"yellow"}>{coord.state==="awaiting_dispatch"?"Envío al depósito pendiente":coord.state==="in_transit_to_warehouse"?"En camino al depósito":"Recibido en China"}</Tag>
  <Copy>Operación {coord.operation_id}</Copy><Copy>{coord.origin_plan.handoff==="pickup"?"El operador debe retirar el paquete en tu agente.":"Coordiná con tu agente o proveedor el envío a esta dirección."}</Copy>
  <Copy>{warehouseAddress(coord.warehouse_snapshot,[coord.operation_id,coord.origin_plan.package_reference].filter(Boolean).join(" · "))}</Copy>
  <Action secondary label={copied?"Dirección copiada":"Copiar dirección de envío"} onPress={()=>void Clipboard.setStringAsync(warehouseAddress(coord.warehouse_snapshot,[coord.operation_id,coord.origin_plan.package_reference].filter(Boolean).join(" · "))).then(()=>setCopied(true)).catch(()=>setError("No se pudo copiar la dirección."))}/>
  <Copy muted>Recibir en China no confirma la entrega en Argentina ni libera fondos.</Copy>
  {coord.state==="awaiting_dispatch"&&coord.origin_plan.handoff!=="pickup"&&<><Field label="Seguimiento o referencia del despacho (opcional)" value={tracking} onChange={v=>{setTracking(v);delete keys.current.dispatch;}}/><Action label="Registrar envío al depósito" disabled={busy} onPress={()=>void run("record_china_dispatch",{target_operation:coord.operation_id,tracking_reference:tracking},"dispatch")}/></>}
  {coord.tracking_reference&&<Copy>Seguimiento local: {coord.tracking_reference}</Copy>}
  {coord.measured&&<Copy>{coord.origin_plan.version===2?"Peso y volumen declarados":"Medidas recibidas"}: {coord.measured.packages} bultos · {coord.measured.weight_kg} kg · {coord.measured.volume_m3} m³. Fecha de recepción: {coord.received_at}</Copy>}
  {revisions.map(r=><Card key={r.id}><Copy>Ajuste {r.status==="proposed"?"pendiente de tu decisión":r.status==="accepted"?"aceptado":"rechazado"}</Copy><Copy>ARS {Number(r.amount_ars).toLocaleString("es-AR")} · {r.estimated_days} días</Copy><Copy>{r.reason}</Copy><Copy>{r.conditions}</Copy>
   {r.status==="proposed"&&<><Copy muted>El contrato y pago originales se conservan. Si cambia el precio, hace falta conciliación adicional antes de continuar.</Copy><Action label="Aceptar ajuste" disabled={busy} onPress={()=>void run("decide_china_revision",{target_revision:r.id,accept:true},r.id+"accept")}/><Action label="Rechazar ajuste" secondary disabled={busy} onPress={()=>void run("decide_china_revision",{target_revision:r.id,accept:false},r.id+"reject")}/></>}</Card>)}
  {!!error&&<Copy style={{color:"#fb7185"}}>{error}</Copy>}
 </Card>;
}
