"use server";
import {revalidatePath} from "next/cache";
import {operatorSession} from "./data";
export async function chinaAction(command:string,requestId:string,payload:Record<string,unknown>):Promise<{ok:boolean;message:string}>{
 const {client}=await operatorSession();
 const args:Record<string,Record<string,unknown>>={
  warehouse:{request_id:requestId,payload},
  argentina_warehouse:{request_id:requestId,payload},
  dispatch:{target_operation:payload.operation_id,request_id:requestId,tracking_reference:payload.tracking_reference},
  receipt:{target_operation:payload.operation_id,request_id:requestId,measurements:payload.measurements},
  revision:{target_operation:payload.operation_id,request_id:requestId,payload},
 };
 const names:Record<string,string>={warehouse:"save_china_warehouse",argentina_warehouse:"save_argentina_depot",dispatch:"record_china_dispatch",receipt:"confirm_china_receipt",revision:"propose_china_revision"};
 if(!names[command])return {ok:false,message:"Acción no disponible."};
 const result=await client.rpc(names[command],args[command]);
 if(result.error)return {ok:false,message:result.error.code==="P0001"?result.error.message:"No se pudo guardar. Revisá los datos y reintentá."};
 revalidatePath("/operador","layout");
 return {ok:true,message:"Cambio registrado. La recepción en China no confirma la entrega final."};
}
