import {test} from "node:test";
import assert from "node:assert/strict";
import {isImporterVisualPreview} from "../apps/mobile/lib/visual-environment.mjs";
test("vista visual exige desarrollo y opt-in explicito",()=>{
 assert.equal(isImporterVisualPreview(true,"1"),true);
 for(const flag of [undefined,"","0","true"])assert.equal(isImporterVisualPreview(true,flag),false);
});
test("vista visual permanece bloqueada en entrega aunque exista la variable",()=>{
 assert.equal(isImporterVisualPreview(false,"1"),false);
 assert.equal(isImporterVisualPreview(false,undefined),false);
});
