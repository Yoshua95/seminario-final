import {useRef,useState} from "react";
import {View} from "react-native";
import {router} from "expo-router";
import {randomUUID} from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import {argentinaProvinces,measuredVolume,validateChinaPlan,requiresHazmatReview,type ChinaPlan,type TransportMode} from "@4pack/domain";
import {createCargo} from "../../lib/dashboard";
import type {NativeMsds} from "../../lib/cargo-publication";
import {Page,Card,Copy,Field,Action,Tag} from "./ui";

export function ChinaCargoForm(){
 const [step,setStep]=useState(0),[kind,setKind]=useState<ChinaPlan["kind"]>("agent"),[pickup,setPickup]=useState(false);
 const [f,setF]=useState({title:"",description:"",category:"Otro",agent:"",reference:"",province:"",city:"",district:"",address:"",arProvince:"CABA",arCity:"",arAddress:"",packages:"",weight:"",length:"",width:"",height:"",fob:""});
 const [estimated,setEstimated]=useState(true),[mode,setMode]=useState<TransportMode>("air"),[file,setFile]=useState<NativeMsds|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const attempt=useRef({requestId:randomUUID(),uploadId:randomUUID()});
 function change(key:keyof typeof f,value:string){setF(old=>({...old,[key]:value}));attempt.current={requestId:randomUUID(),uploadId:randomUUID()};}
 function choice(fn:()=>void){fn();attempt.current={requestId:randomUUID(),uploadId:randomUUID()};}
 const num=(v:string)=>Number(v.replace(",","."));
 const measurements={packages:num(f.packages),weight_kg:num(f.weight),length_cm:num(f.length),width_cm:num(f.width),height_cm:num(f.height),estimated};
 const plan:ChinaPlan={kind,handoff:pickup?"pickup":kind==="agent"?"agent_sends":"supplier_sends",agent_name:f.agent.trim(),package_reference:f.reference.trim(),origin:{province:f.province.trim(),city:f.city.trim(),district:f.district.trim(),address:f.address.trim()},destination:{province:f.arProvince,city:f.arCity.trim(),address:f.arAddress.trim()},measurements};
 let volume:number|null=null;
 try{volume=measuredVolume(measurements);}catch{/* Incomplete dimensions remain editable. */}
 const msds=requiresHazmatReview(`${f.title} ${f.description} ${f.category}`);
 async function pick(){try{const r=await DocumentPicker.getDocumentAsync({type:"application/pdf",copyToCacheDirectory:true,multiple:false});if(r.canceled)return;const a=r.assets[0];setFile({uri:a.uri,name:a.name,mimeType:a.mimeType??"application/pdf",size:a.size??0});attempt.current.uploadId=randomUUID();}catch{setError("No se pudo abrir el selector. Reintentá.");}}
 async function publish(){
  const invalid=validateChinaPlan(plan);
  if(invalid||!f.title.trim()||!f.description.trim()||!Number.isFinite(num(f.fob))||num(f.fob)<0||!f.fob.trim()){setError(invalid??"Completá mercadería, descripción y FOB válido.");return;}
  if(msds&&!file){setError("Adjuntá el PDF MSDS obligatorio.");return;}
  setBusy(true);setError("");
  try{const id=await createCargo({title:f.title.trim(),description:f.description.trim(),category:f.category,origin:"China",destination:"Argentina",weightKg:measurements.weight_kg,volumeM3:volume,fobUsd:num(f.fob),preferredMode:mode,originPlan:plan},attempt.current,file);router.replace(`/cargo/${id}`);}
  catch(e){setError(e instanceof Error?e.message:"No se pudo publicar. Reintentá sin cambiar los datos.");}finally{setBusy(false);}
 }
 const field=(label:string,key:keyof typeof f,number=false)=><Field key={key} label={label} value={f[key]} onChange={v=>change(key,v)} number={number}/>;
 return <Page title="Nueva carga" centered subtitle="China → Argentina" error={error} loading={busy} back={()=>step?setStep(step-1):router.back()}>
  <Tag tone="brand">Paso {step+1} de 3 · Países fijos</Tag>
  {step===0&&<><Card><Copy>¿Cómo va a llegar tu paquete al depósito del operador en China?</Copy><Action label="Ya está en un agente o depósito" secondary={kind!=="agent"} onPress={()=>choice(()=>setKind("agent"))}/><Action label="Mi proveedor lo enviará directamente" secondary={kind!=="supplier"} onPress={()=>choice(()=>{setKind("supplier");setPickup(false);})}/></Card>
   <Card><Copy>Origen · China</Copy>{kind==="agent"&&<>{field("Nombre del agente o depósito","agent")}{field("Referencia del paquete","reference")}</>}
   {field("Provincia o división equivalente","province")}{field("Ciudad o localidad","city")}{field("Distrito (opcional)","district")}{field(kind==="agent"?"Dirección del agente":"Dirección del proveedor (opcional)","address")}
   {kind==="agent"&&<><Action label="El agente envía al depósito del operador" secondary={pickup} onPress={()=>choice(()=>setPickup(false))}/><Action label="Necesito retiro en el agente" secondary={!pickup} onPress={()=>choice(()=>setPickup(true))}/><Copy muted>El retiro requiere un operador habilitado y debe estar incluido en su oferta.</Copy></>}</Card>
   <Action label="Continuar con la carga" onPress={()=>setStep(1)}/></>}
  {step===1&&<><Card>{field("Nombre de la mercadería","title")}
   <View style={{gap:8}}>{["Indumentaria y textiles","Marroquinería","Electrónica","Hogar","Repuestos","Otro"].map(c=><Action key={c} label={c} secondary={f.category!==c} onPress={()=>change("category",c)}/>)}</View>
   {field("Descripción de la mercadería","description")}{field("Cantidad de bultos iguales","packages",true)}{field("Peso total (kg)","weight",true)}
   {field("Largo por bulto (cm)","length",true)}{field("Ancho por bulto (cm)","width",true)}{field("Alto por bulto (cm)","height",true)}
   <Copy>Volumen calculado: {volume===null?"Completá las medidas":`${volume.toFixed(3)} m³`}</Copy>
   <Action label={estimated?"Medidas estimadas ✓":"Medidas estimadas"} secondary={!estimated} onPress={()=>choice(()=>setEstimated(true))}/><Action label={!estimated?"Medidas confirmadas ✓":"Medidas confirmadas"} secondary={estimated} onPress={()=>choice(()=>setEstimated(false))}/>
   <Field label="FOB declarado" value={f.fob} onChange={v=>change("fob",v)} number suffix="USD"/>
   <Copy muted>Las cotizaciones y el contrato se expresan en ARS.</Copy></Card><Action label="Continuar con el destino" onPress={()=>setStep(2)}/></>}
  {step===2&&<><Card><Copy>Destino · Argentina</Copy><Copy muted>Provincia o CABA</Copy>{argentinaProvinces.map(p=><Action key={p} label={p} secondary={f.arProvince!==p} onPress={()=>change("arProvince",p)}/>)}
    {field("Ciudad o localidad de destino","arCity")}{field("Dirección de destino (opcional)","arAddress")}
    {(["air","sea","consolidated"] as const).map(m=><Action key={m} label={{air:"Aéreo · prioriza rapidez",sea:"Marítimo · cargas de mayor volumen",consolidated:"Consolidado · comparte espacio"}[m]} secondary={mode!==m} onPress={()=>choice(()=>setMode(m))}/>)}
   </Card>{msds&&<Card><Copy>Esta mercadería requiere MSDS antes de publicarse.</Copy><Action label={file?.name??"Adjuntar PDF MSDS"} secondary onPress={()=>void pick()}/></Card>}
   <Card><Copy>{f.title||"Mercadería"} · {kind==="agent"?"Desde agente":"Desde proveedor"} · {pickup?"Con retiro":"Envío al depósito"}</Copy><Copy>{f.city||f.province}, China → {f.arCity}, {f.arProvince}, Argentina</Copy><Copy>{f.packages} bultos · {f.weight} kg · {volume?.toFixed(3)??"—"} m³ {estimated?"estimados":"medidos"} · FOB USD {f.fob}</Copy><Copy muted>La dirección del depósito del operador se habilita después de adjudicar. La recepción en China no es entrega final.</Copy></Card>
   <Action label={busy?"Publicando…":"Publicar carga"} disabled={busy} onPress={()=>void publish()}/></>}
 </Page>;
}
