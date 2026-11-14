import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const base=process.argv[2];if(!base?.startsWith('https://')&&!base?.startsWith('http://localhost:'))throw new Error('Indicá una URL de revisión válida.');
const browser=await chromium.connectOverCDP('http://localhost:9222');
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();const errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 const response=await page.goto(base+'/demo/acceso',{timeout:60000});assert.equal(response.status(),200);await page.locator('select[name=scenario]').waitFor();console.log('OK /demo/acceso · público, sin autenticación Vercel');
 await page.locator('form button').click();await page.waitForURL('**/demo/operador/oportunidades',{timeout:60000});await page.locator('.op-content').waitFor({timeout:60000});
 const paths=['oportunidades','oportunidades/b0000000-0000-0000-0000-000000009477','mis-ofertas','operaciones','operaciones/d0000000-0000-0000-0000-000000006291','documentos','historial','billetera','soporte','soporte/e0000000-0000-0000-0000-000000000001','perfil'];
 for(const route of paths){const response=await page.goto(base+'/demo/operador/'+route,{timeout:60000});assert.equal(response.status(),200,route);await page.locator('.op-content').waitFor({timeout:60000});assert.ok((await page.locator('body').innerText()).includes('Marítima Rivera S.A.'),route);console.log('OK /demo/operador/'+route+' · '+await page.locator('h1').innerText());}
 const document=await context.request.get(base+'/demo/documentos/f0000000-0000-0000-0000-000000000001',{timeout:60000});assert.equal(document.status(),200);assert.equal(document.headers()['content-type'],'application/pdf');assert.ok((await document.body()).subarray(0,5).toString()==='%PDF-');console.log('OK documento de muestra aislado · PDF');
 for(const scenario of ['pending','suspended']){await page.goto(base+'/demo/acceso');await page.locator('select[name=scenario]').selectOption(scenario);await page.locator('form button').click();await page.getByRole('heading',{name:'Estado de tu cuenta',exact:true}).waitFor({timeout:60000});assert.equal(await page.locator('.op-cargo-row').count(),0);console.log('OK bloqueo del escenario '+scenario);}
 await page.goto(base+'/acceso');assert.equal(new URL(page.url()).pathname,'/demo/acceso');console.log('OK aislamiento: acceso real redirige a demo');
 assert.deepEqual(errors,[]);console.log('Rutas de demostración verificadas; sin errores JavaScript.');
}catch(error){console.log('Última página:',page.url(),(await page.locator('body').innerText()).slice(0,1800));throw error}finally{await context.close();await browser.close();}
