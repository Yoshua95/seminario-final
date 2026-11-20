import {useRef,useState} from "react";
import {View} from "react-native";
import {router} from "expo-router";
import {randomUUID} from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import {argentinaProvinces,measuredVolume,positiveDeclared,validateChinaPlan,requiresHazmatReview,senderLabel,type ChinaPlan,type SenderType,type TransportMode} from "@4pack/domain";
import {createCargo} from "../../lib/dashboard";
import type {NativeMsds} from "../../lib/cargo-publication";
import {Page,Card,Copy,Field,Action,Tag} from "./ui";

export function ChinaCargoForm(){
 const [step,setStep]=useState(0),[sender,setSender]=useState<SenderType>("agent"),[delivery,setDelivery]=useState<"pickup"|"home">("pickup"),[calculator,setCalculator]=useState(false),[showProvinces,setShowProvinces]=useState(false);
 const [f,setF]=useState({title:"",description:"",category:"Otro",sender:"",reference:"",province:"",city:"",district:"",address:"",arProvince:"CABA",arCity:"",arAddress:"",packages:"1",weight:"",volume:"",length:"",width:"",height:"",fob:""});
 const [mode,setMode]=useState<TransportMode>("air"),[file,setFile]=useState<NativeMsds|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const attempt=useRef({requestId:randomUUID(),uploadId:randomUUID()});
 const resetAttempt=()=>{attempt.current={requestId:randomUUID(),uploadId:randomUUID()};};
 function change(key:keyof typeof f,value:string){setF(old=>({...old,[key]:value}));resetAttempt();}
 function choice(fn:()=>void){fn();resetAttempt();}
 const number=(v:string)=>Number(v.replace(",","."));
 const plan:ChinaPlan={version:2,sender_type:sender,sender_name:f.sender.trim(),kind:sender==="agent"?"agent":"supplier",handoff:sender==="agent"?"agent_sends":"supplier_sends",package_reference:f.reference.trim(),origin:{province:f.province.trim(),city:f.city.trim(),district:f.district.trim(),address:f.address.trim()},destination:{province:f.arProvince,city:f.arCity.trim(),address:delivery==="home"?f.arAddress.trim():"",delivery_mode:delivery},measurements:{packages:number(f.packages),weight_kg:number(f.weight),volume_m3:number(f.volume)}};
 const msds=requiresHazmatReview(`${f.title} ${f.description} ${f.category}`);
 async function pick(){try{const r=await DocumentPicker.getDocumentAsync({type:"application/pdf",copyToCacheDirectory:true,multiple:false});if(r.canceled)return;const a=r.assets[0];setFile({uri:a.uri,name:a.name,mimeType:a.mimeType??"application/pdf",size:a.size??0});attempt.current.uploadId=randomUUID();}catch{setError("No se pudo abrir el selector. Reintentá.");}}
 function calculate(){try{const volume=measuredVolume({packages:number(f.packages),length_cm:number(f.length),width_cm:number(f.width),height_cm:number(f.height)});change("volume",volume.toFixed(3));setCalculator(false);setError("");}catch(e){setError(e instanceof Error?e.message:"Revisá las dimensiones.");}}
 async function publish(){
  const invalid=validateChinaPlan(plan);
  if(invalid||!f.title.trim()||!f.description.trim()||!f.fob.trim()||!Number.isFinite(number(f.fob))||number(f.fob)<0){setError(invalid??"Completá mercadería, descripción y FOB válido.");return;}
  if(msds&&!file){setError("Adjuntá el PDF MSDS obligatorio.");return;}
  setBusy(true);setError("");
  try{const id=await createCargo({title:f.title.trim(),description:f.description.trim(),category:f.category,origin:"China",destination:"Argentina",weightKg:positiveDeclared(f.weight,2),volumeM3:positiveDeclared(f.volume,3),fobUsd:number(f.fob),preferredMode:mode,originPlan:plan},attempt.current,file);router.replace(`/cargo/${id}`);}
  catch(e){setError(e instanceof Error?e.message:"No se pudo publicar. Reintentá sin cambiar los datos.");}finally{setBusy(false);}
 }
 const field=(label:string,key:keyof typeof f,numeric=false)=><Field key={key} label={label} value={f[key]} onChange={v=>change(key,v)} number={numeric}/>;
 return <Page title="Nueva carga" centered subtitle="China → Argentina" error={error} loading={busy} back={()=>step?setStep(step-1):router.back()}>
  <Tag tone="brand">Paso {step+1} de 3 · Países fijos</Tag>
  {step===0&&<><Card><Copy>¿Quién despacha al depósito del operador en China?</Copy>{(["agent","private_supplier","store","other"] as SenderType[]).map(s=><Action key={s} label={senderLabel(s)} secondary={sender!==s} onPress={()=>choice(()=>setSender(s))}/>)}</Card>
   <Card><Copy>Origen · China</Copy>{field(sender==="agent"?"Nombre del agente o depósito":sender==="private_supplier"?"Nombre del proveedor particular":sender==="store"?"Nombre de la tienda o plataforma":"Nombre del remitente","sender")}
    {field("Referencia del paquete (opcional)","reference")}{field("Provincia o división equivalente","province")}{field("Ciudad o localidad","city")}{field("Distrito (opcional)","district")}{field("Dirección de origen","address")}
    <Copy muted>La dirección admite caracteres chinos, latinos y tildes. El remitente envía al depósito acordado; el operador solo recibe en China.</Copy></Card>
   <Action label="Continuar con la carga" onPress={()=>setStep(1)}/></>}
  {step===1&&<><Card>{field("Nombre de la mercadería","title")}<View style={{gap:8}}>{["Indumentaria y textiles","Marroquinería","Electrónica","Hogar","Repuestos","Otro"].map(c=><Action key={c} label={c} secondary={f.category!==c} onPress={()=>change("category",c)}/>)}</View>
   {field("Descripción de la mercadería","description")}{field("Cantidad de bultos","packages",true)}{field("Peso total (kg)","weight",true)}{field("Volumen total (m³)","volume",true)}
   <Copy muted>Peso y volumen son obligatorios. Aceptamos coma o punto decimal. La cotización usa estos valores declarados.</Copy>
   <Action secondary label={calculator?"Ocultar ayuda de volumen":"Ayuda: calcular volumen por dimensiones"} onPress={()=>setCalculator(!calculator)}/>
   {calculator&&<>{field("Largo por bulto (cm)","length",true)}{field("Ancho por bulto (cm)","width",true)}{field("Alto por bulto (cm)","height",true)}<Copy muted>Solo para bultos iguales. Revisá el resultado antes de confirmarlo.</Copy><Action secondary label="Confirmar volumen calculado" onPress={calculate}/></>}
   <Field label="FOB declarado" value={f.fob} onChange={v=>change("fob",v)} number suffix="USD"/><Copy muted>Ofertas y contrato nuevos en ARS.</Copy></Card><Action label="Continuar con el destino" onPress={()=>{try{positiveDeclared(f.weight,2);positiveDeclared(f.volume,3);setError("");setStep(2);}catch(e){setError(e instanceof Error?e.message:"Completá peso y volumen.");}}}/></>}
  {step===2&&<><Card><Copy>Destino · Argentina</Copy><Copy muted>Provincia o CABA</Copy><Action secondary label={"Provincia: "+f.arProvince} onPress={()=>setShowProvinces(!showProvinces)}/>{showProvinces&&argentinaProvinces.map(p=><Action key={p} label={p} secondary={f.arProvince!==p} onPress={()=>{change("arProvince",p);setShowProvinces(false);}}/>)}{field("Ciudad o localidad de destino","arCity")}
   <Action label="Retiro en el depósito del operador" secondary={delivery!=="pickup"} onPress={()=>choice(()=>setDelivery("pickup"))}/><Action label="Envío a domicilio" secondary={delivery!=="home"} onPress={()=>choice(()=>setDelivery("home"))}/>
   {delivery==="home"&&<>{field("Dirección de entrega","arAddress")}<Copy muted>Podés recibir una oferta de domicilio o de solo retiro. Esa condición se muestra antes de aceptar.</Copy></>}
   {(["air","sea","consolidated"] as const).map(m=><Action key={m} label={{air:"Aéreo · prioriza rapidez",sea:"Marítimo · cargas de mayor volumen",consolidated:"Consolidado · comparte espacio"}[m]} secondary={mode!==m} onPress={()=>choice(()=>setMode(m))}/>)}</Card>
   {msds&&<Card><Copy>Esta mercadería requiere MSDS.</Copy><Action secondary label={file?.name??"Adjuntar PDF MSDS"} onPress={()=>void pick()}/></Card>}
   <Card><Copy>{f.title||"Mercadería"} · {senderLabel(sender)}</Copy><Copy>{f.city||f.province}, China → {f.arCity}, {f.arProvince}, Argentina</Copy><Copy>{f.packages} bultos · {f.weight} kg · {f.volume} m³ declarados · FOB USD {f.fob}</Copy><Copy>{delivery==="home"?"Envío a domicilio: "+f.arAddress:"Retiro en el depósito del operador en Argentina"}</Copy><Copy muted>Confirmás peso y volumen al publicar. Recibir en China no es la entrega final.</Copy></Card>
   {!!error&&<Copy style={{color:"#fb7185"}}>{error}</Copy>}<Action label={busy?"Publicando…":"Publicar carga"} disabled={busy} onPress={()=>void publish()}/></>}
 </Page>;
}
