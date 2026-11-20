import{test}from'node:test';import assert from'node:assert/strict';
import{deriveOperationTask}from'../packages/domain/src/operation-work.mjs';
const base={phase:'confirmed',paymentMode:'mercado_pago_test',paymentApproved:true,requiredDocuments:['Packing list'],documents:[]};
test('packing list tiene el mismo responsable en Android, operador y admin',()=>{
 assert.equal(deriveOperationTask({...base,role:'importer'}).label,'Subir Packing list');
 for(const role of ['operator','admin'])assert.equal(deriveOperationTask({...base,role}).label,'Esperando Packing list del importador');
 assert.equal(deriveOperationTask({...base,role:'operator',documents:[{type:'Packing list',status:'pending'}]}).label,'Iniciar servicio');
});
test('entrega sin evidencia no invita a confirmar y el reclamo tiene prioridad',()=>{
 const f={...base,requiredDocuments:[],phase:'awaiting_delivery_confirmation',role:'importer'};
 assert.equal(deriveOperationTask(f).action,'wait_delivery');
 assert.equal(deriveOperationTask({...f,deliveryProof:true}).action,'confirm_delivery');
 assert.equal(deriveOperationTask({...f,deliveryProof:true,openClaims:1}).responsible,'admin');
});
test('retorno sin confirmacion backend conserva Continuar pago; cierre distingue liberacion',()=>{
 assert.equal(deriveOperationTask({...base,role:'importer',paymentApproved:false}).label,'Continuar pago');
 assert.equal(deriveOperationTask({...base,role:'operator',phase:'completed',protectionState:'released_test'}).tone,'green');
 assert.equal(deriveOperationTask({...base,role:'operator',phase:'completed',protectionState:'in_review'}).responsible,'admin');
});
