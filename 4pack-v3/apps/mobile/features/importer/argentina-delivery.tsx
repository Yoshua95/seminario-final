import {useState} from "react";
import * as Clipboard from "expo-clipboard";
import {warehouseAddress,type DestinationAgreement} from "@4pack/domain";
import {Card,Copy,Action,Tag} from "./ui";
export function ArgentinaDeliveryCard({agreement,operationId}:{agreement:DestinationAgreement;operationId:string}){
 const [copied,setCopied]=useState(false),[error,setError]=useState("");
 const address=agreement.agreed_mode==="pickup"?warehouseAddress({...agreement.pickup_snapshot,address_zh:agreement.pickup_snapshot.address},operationId):[agreement.delivery_address?.address,agreement.delivery_address?.city,agreement.delivery_address?.province,"Argentina"].filter(Boolean).join("\n");
 return <Card><Tag tone="brand">Entrega acordada · Argentina</Tag><Copy>{agreement.agreed_mode==="pickup"?"Retiro en el depósito del operador":"Envío a domicilio"}</Copy><Copy>Importación: ARS {Number(agreement.import_fee).toLocaleString("es-AR")}</Copy>{agreement.agreed_mode==="home"&&<Copy>Envío a domicilio: ARS {Number(agreement.delivery_fee).toLocaleString("es-AR")}</Copy>}<Copy>Total acordado: ARS {Number(agreement.total).toLocaleString("es-AR")}</Copy><Copy>{address}</Copy><Action secondary label={copied?"Dirección copiada":"Copiar dirección de Argentina"} onPress={()=>void Clipboard.setStringAsync(address).then(()=>setCopied(true)).catch(()=>setError("No se pudo copiar la dirección."))}/>{error&&<Copy>{error}</Copy>}</Card>;
}
