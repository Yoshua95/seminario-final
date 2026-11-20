export const argentinaProvinces = ["Buenos Aires","Catamarca","Chaco","Chubut","Córdoba","Corrientes","Entre Ríos","Formosa","Jujuy","La Pampa","La Rioja","Mendoza","Misiones","Neuquén","Río Negro","Salta","San Juan","San Luis","Santa Cruz","Santa Fe","Santiago del Estero","Tierra del Fuego","Tucumán","CABA"];
export function measuredVolume({packages,length_cm,width_cm,height_cm}) {
  const values=[packages,length_cm,width_cm,height_cm].map(Number);
  if(values.some(v=>!Number.isFinite(v)||v<=0)||!Number.isInteger(values[0])||values[0]>10000||values.slice(1).some(v=>v>10000))throw Error("Revisá cantidad y dimensiones por bulto en centímetros.");
  const volume=values.reduce((n,v)=>n*v,1)/1000000;
  if(volume<=0||volume>=1000000)throw Error("El volumen calculado está fuera de rango.");
  return volume;
}
export function validateChinaPlan(plan) {
  if(plan?.version===2){
    if(!['agent','private_supplier','store','other'].includes(plan.sender_type)||!String(plan.sender_name??'').trim())return 'Elegí el remitente e indicá su nombre.';
    if(plan.handoff==='pickup')return 'El operador solo recibe en China; no realiza retiro en origen.';
    if(!String(plan.origin?.province??'').trim()&&!String(plan.origin?.city??'').trim())return 'Indicá provincia o localidad de origen.';
    if(!String(plan.origin?.address??'').trim())return 'Completá Dirección de origen.';
    if(!argentinaProvinces.includes(plan.destination?.province)||!String(plan.destination?.city??'').trim())return 'Elegí provincia y localidad de Argentina.';
    if(!['pickup','home'].includes(plan.destination?.delivery_mode))return 'Elegí retiro en depósito o envío a domicilio.';
    if(plan.destination.delivery_mode==='home'&&String(plan.destination.address??'').trim().length<5)return 'Completá la dirección de entrega a domicilio.';
    try{positiveDeclared(plan.measurements?.weight_kg,2);positiveDeclared(plan.measurements?.volume_m3,3);}catch(e){return e.message;}
    if(!Number.isInteger(plan.measurements?.packages)||plan.measurements.packages<1||plan.measurements.packages>10000)return 'Revisá la cantidad de bultos.';
    return null;
  }
  if(!plan||!['agent','supplier'].includes(plan.kind))return 'Elegí cómo llegará el paquete al depósito del operador.';
  if((plan.kind==='agent'&&!['agent_sends','pickup'].includes(plan.handoff))||(plan.kind==='supplier'&&plan.handoff!=='supplier_sends'))return 'Elegí quién despacha o retira el paquete.';
  if(plan.kind==='agent'&&[plan.agent_name,plan.origin?.province,plan.origin?.city,plan.origin?.address].some(v=>!String(v??'').trim()))return 'Completá agente, provincia, ciudad y dirección donde está el paquete.';
  if(plan.kind==='supplier'&&!String(plan.origin?.province??'').trim()&&!String(plan.origin?.city??'').trim())return 'Indicá la provincia o ciudad desde la que despacha el proveedor.';
  if(!argentinaProvinces.includes(plan.destination?.province)||!String(plan.destination?.city??'').trim())return 'Elegí la provincia y localidad de destino en Argentina.';
  try{measuredVolume(plan.measurements);}catch(e){return e.message;}
  if(!Number.isFinite(Number(plan.measurements?.weight_kg))||Number(plan.measurements.weight_kg)<=0||Number(plan.measurements.weight_kg)>1000000||typeof plan.measurements.estimated!=='boolean')return 'Revisá el peso total e indicá si las medidas son estimadas o medidas.';
  return null;
}
export function positiveDeclared(value,decimals=3){
 const text=String(value??'').trim();
 if(!/^\d+([.,]\d+)?$/.test(text))throw Error('Ingresá peso y volumen positivos con coma o punto decimal.');
 const n=Number(text.replace(',','.'));
 if(!Number.isFinite(n)||n<=0||n>999999999||Math.abs(n*10**decimals-Math.round(n*10**decimals))>0.000001)throw Error('Revisá peso y volumen positivos y sus decimales.');
 return n;
}
export function senderLabel(sender){return ({agent:'Agente o depósito',private_supplier:'Proveedor particular',store:'Tienda o plataforma de compras',other:'Otro remitente'})[sender]??'Remitente';}
export function warehouseAddress(warehouse,reference='') {
  if(!warehouse)return '';
  return [warehouse.recipient,warehouse.phone,warehouse.province,warehouse.city,warehouse.district,warehouse.postal_code,warehouse.address_zh,reference&&'Referencia: '+reference,warehouse.instructions].filter(Boolean).join('\n');
}
