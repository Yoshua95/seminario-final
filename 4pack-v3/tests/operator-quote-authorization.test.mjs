import test from 'node:test';import assert from 'node:assert/strict';
import{initialQuoteSelection,quoteAuthorizationError,quoteRejectionMessage}from'../apps/web/src/features/operator/quote-authorization.mjs';
const authorization={modes:['air'],services:['international_transport']};
test('LC-10004 precarga air y solo el servicio solicitado y autorizado',()=>{
 assert.deepEqual(initialQuoteSelection({}, {mode:'air',services:['international_transport']},authorization),{mode:'air',services:['international_transport']});
 assert.deepEqual(initialQuoteSelection({}, {mode:'air',services:['international_transport','origin_handling']},authorization).services,['international_transport']);
});
test('un borrador incompatible no se reescribe silenciosamente y exige quitar el servicio',()=>{
 const q=initialQuoteSelection({mode:'air',services:['international_transport','origin_handling']},{},authorization);
 assert.equal(q.services.includes('origin_handling'),true);
 assert.match(quoteAuthorizationError(q,authorization,{origin_handling:'Manipulación en origen'}),/Manipulación en origen.*Quitalos.*Perfil empresarial/);
});
test('modalidad incompatible y falta de habilitación fallan de forma recuperable',()=>{
 assert.match(quoteAuthorizationError({mode:'sea',services:['international_transport']},authorization),/modalidad.*no está habilitada/);
 assert.match(quoteAuthorizationError({mode:'air',services:['international_transport']},null),/Actualizá.*Perfil empresarial/);
 assert.equal(quoteAuthorizationError({mode:'air',services:['international_transport']},authorization),null);
});
test('rechazo real del backend conserva el control y explica cómo corregir o actualizar',()=>{
 assert.match(quoteRejectionMessage('La oferta excede los servicios o modalidades habilitados'),/servidor rechazó.*Actualizá.*quitá.*volvé a enviar/);
 assert.equal(quoteRejectionMessage('La licitación está cerrada'),'La licitación está cerrada');
});
