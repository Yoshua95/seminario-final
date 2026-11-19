import test from "node:test";
import assert from "node:assert/strict";
import {sameQuoteScope,validateQuote,serviceTaxonomy} from "../.test-dist/quotes.js";
import {quoteFixture} from "./quote-fixture.mjs";
test("cotización completa exige moneda, conceptos, cobertura y responsabilidades",()=>{
 assert.equal(validateQuote(quoteFixture()),null);
 for(const changes of [{currency:"USD/ARS"},{amount:"NaN"},{amount:"1.234"},{mode:"truck"},{included:[]},{insurance:""},{responsibilities:""},{services:["unknown"]}])assert.ok(validateQuote(quoteFixture(changes)));
 assert.equal(Object.keys(serviceTaxonomy).length,9);
});
test("comparación advierte alcances distintos sin confundir precio o moneda",()=>{
 const a=quoteFixture();assert.equal(sameQuoteScope(a,quoteFixture({amount:"2000",currency:"ARS"})),true);
 for(const changes of [{scope:"Solo entrega"},{services:["storage"]},{included:["Aduana"]},{excluded:["Transporte"]},{insurance:"Con seguro"},{mode:"sea"}])assert.equal(sameQuoteScope(a,quoteFixture(changes)),false);
 assert.equal(sameQuoteScope(a,null),false);
});
