import {useState} from "react";
import * as Clipboard from "expo-clipboard";
import {Action,Copy} from "./ui";
export function AddressCopy({address,label="Copiar dirección"}:{address:string;label?:string}){
 const [copied,setCopied]=useState(""),[error,setError]=useState("");
 async function copy(){setError("");try{await Clipboard.setStringAsync(address);if(await Clipboard.getStringAsync()!==address)throw Error("La copia no conservó todos los caracteres. Reintentá.");setCopied(address);}catch(e){setError(e instanceof Error?e.message:"No se pudo copiar.");}}
 return <><Action secondary label={copied===address?"Dirección copiada y verificada":label} onPress={()=>void copy()}/>{error&&<Copy style={{color:"#fb7185"}}>{error}</Copy>}</>;
}
