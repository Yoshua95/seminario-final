// Opt-in native UI smoke review, only on the clearly labelled visual fixture.
import {execFileSync} from "node:child_process";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const adb=process.env.ADB_EXECUTABLE??path.join(process.env.LOCALAPPDATA,"Android/Sdk/platform-tools/adb.exe");
const output=path.resolve("docs/informes/bloque-04-diseno-mobile/capturas");
await mkdir(output,{recursive:true});
const run=(args,encoding="utf8")=>execFileSync(adb,["-s","emulator-5554",...args],{encoding,windowsHide:true,timeout:30000});
async function snapshot(){
 run(["shell","uiautomator","dump","/sdcard/fourpack-visual.xml"]);
 const xml=run(["shell","cat","/sdcard/fourpack-visual.xml"]);
 assert.ok(xml.includes("FOURPACK_VISUAL_FIXTURE_BLOCK04_ONLY"),"No se interactua fuera de la vista ficticia.");
 return xml;
}
async function tap(text){
 const xml=await snapshot();
 const nodes=xml.match(/<node\b[^>]*>/g)??[];
 const node=nodes.find(n=>n.includes(`text="${text}"`));assert.ok(node,"No visible: "+text);
 const [,x1,y1,x2,y2]=node.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/).map(Number);
 run(["shell","input","tap",String(Math.round((x1+x2)/2)),String(Math.round((y1+y2)/2))]);
}
const checks=[];
await writeFile(path.join(output,"revision.json"),JSON.stringify({passed:false,checks,running:true},null,2));
async function capture(name,expected){
 const xml=await snapshot();assert.ok(xml.includes(expected),expected);
 await writeFile(path.join(output,name+".xml"),xml);
 await writeFile(path.join(output,name+".png"),run(["exec-out","screencap","-p"],null));
 checks.push(name);console.log("PASS",name);
 await writeFile(path.join(output,"revision.json"),JSON.stringify({passed:false,checks,running:true},null,2));
}
await tap("Inicio");await capture("01-inicio","Nueva carga");
await tap("Publicar");await capture("02-publicacion","¿Qué vas a importar?");
await tap("Continuar");await capture("02b-dimensiones","Peso (kg)");
// Scroll until the continuation action is visible on the long second step.
run(["shell","input","swipe","540","1900","540","650","350"]);
await tap("Continuar");await capture("02c-revision","Carga general");
await tap("Ofertas");await capture("03-ofertas","USD 1.250");
await tap("Seguimiento");await capture("04-seguimiento","Tu próximo paso");
await tap("Escenario 1");await capture("04b-garantia","Confirmar garantía simulada");
await tap("Escenario 4");await capture("04c-evaluacion","Evaluar al operador");
await tap("Escenario 3");await capture("04d-entrega","Confirmar entrega");
await tap("Publicar");
await tap("Repuestos para mi taller");
run(["shell","input","keyevent","123"]);
run(["shell","input","keyevent",...Array(50).fill("67")]);
run(["shell","input","text","Baterias%sde%slitio"]);
run(["shell","input","keyevent","4"]);
await tap("Continuar");
assert.ok((await snapshot()).includes("Peso (kg)"));
run(["shell","input","swipe","540","1900","540","650","350"]);
await tap("Continuar");await capture("02d-msds","Seleccionar PDF MSDS");
await tap("Inicio");
await writeFile(path.join(output,"revision.json"),JSON.stringify({passed:true,checks,backendConnected:false,device:"Pixel_7 / emulator-5554",fixture:true},null,2));
