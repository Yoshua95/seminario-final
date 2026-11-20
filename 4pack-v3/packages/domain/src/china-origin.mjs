export const argentinaProvinces = ["Buenos Aires","Catamarca","Chaco","Chubut","Córdoba","Corrientes","Entre Ríos","Formosa","Jujuy","La Pampa","La Rioja","Mendoza","Misiones","Neuquén","Río Negro","Salta","San Juan","San Luis","Santa Cruz","Santa Fe","Santiago del Estero","Tierra del Fuego","Tucumán","CABA"];
export function measuredVolume({packages,length_cm,width_cm,height_cm}) {
  const values=[packages,length_cm,width_cm,height_cm].map(Number);
  if(values.some(v=>!Number.isFinite(v)||v<=0)||!Number.isInteger(values[0])||values[0]>10000||values.slice(1).some(v=>v>10000))throw Error("Revisá cantidad y dimensiones por bulto en centímetros.");
  const volume=values.reduce((n,v)=>n*v,1)/1000000;
  if(volume<=0||volume>=1000000)throw Error("El volumen calculado está fuera de rango.");
  return volume;
}
export function validateChinaPlan(plan) {
  if(!plan||!['agent','supplier'].includes(plan.kind))return 'Elegí cómo llegará el paquete al depósito del operador.';
  if((plan.kind==='agent'&&!['agent_sends','pickup'].includes(plan.handoff))||(plan.kind==='supplier'&&plan.handoff!=='supplier_sends'))return 'Elegí quién despacha o retira el paquete.';
  if(plan.kind==='agent'&&[plan.agent_name,plan.origin?.province,plan.origin?.city,plan.origin?.address].some(v=>!String(v??'').trim()))return 'Completá agente, provincia, ciudad y dirección donde está el paquete.';
  if(plan.kind==='supplier'&&!String(plan.origin?.province??'').trim()&&!String(plan.origin?.city??'').trim())return 'Indicá la provincia o ciudad desde la que despacha el proveedor.';
  if(!argentinaProvinces.includes(plan.destination?.province)||!String(plan.destination?.city??'').trim())return 'Elegí la provincia y localidad de destino en Argentina.';
  try{measuredVolume(plan.measurements);}catch(e){return e.message;}
  if(!Number.isFinite(Number(plan.measurements?.weight_kg))||Number(plan.measurements.weight_kg)<=0||Number(plan.measurements.weight_kg)>1000000||typeof plan.measurements.estimated!=='boolean')return 'Revisá el peso total e indicá si las medidas son estimadas o medidas.';
  return null;
}
export function warehouseAddress(warehouse,reference='') {
  if(!warehouse)return '';
  return [warehouse.recipient,warehouse.phone,warehouse.province,warehouse.city,warehouse.district,warehouse.postal_code,warehouse.address_zh,reference&&'Referencia: '+reference,warehouse.instructions].filter(Boolean).join('\n');
}
