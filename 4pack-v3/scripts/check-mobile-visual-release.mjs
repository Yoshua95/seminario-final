import {readdir,readFile} from "node:fs/promises";
import path from "node:path";
const root=path.resolve("apps/mobile/dist/android");
let bundles=0;
async function check(directory){
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const file=path.join(directory,entry.name);
  if(entry.isDirectory())await check(file);
  else if(/\.(hbc|js|map)$/.test(file)){
   const content=await readFile(file);bundles++;
   for(const marker of ["FOURPACK_VISUAL_FIXTURE_BLOCK04_ONLY","visual-operation-04","MSDS-ficticia.pdf"])
    if(content.includes(Buffer.from(marker)))throw new Error("Fixture de desarrollo presente en entrega: "+file);
  }
 }
}
await check(root);
if(!bundles)throw new Error("No hay bundles Android para verificar.");
console.log(`Entrega Android: ${bundles} bundles/mapas revisados; fixtures visuales ausentes.`);
