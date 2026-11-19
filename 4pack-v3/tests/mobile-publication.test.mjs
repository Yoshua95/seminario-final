import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(
  new URL("../apps/mobile/lib/cargo-publication.ts", import.meta.url),
  "utf8",
);
const target = new URL("../.test-dist/mobile-publication.mjs", import.meta.url);
const domain = new URL("../.test-dist/index.js", import.meta.url).href;
await writeFile(
  target,
  ts.transpileModule(
    source.replace('"@4pack/domain"', JSON.stringify(domain)),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
      },
    },
  ).outputText,
);
const { publishMobileCargo } = await import(target.href);
const file = {
  uri: "file:///cache/msds.pdf",
  name: "msds.pdf",
  mimeType: "application/pdf",
  size: 100,
};
const keys = { requestId: "request-1", uploadId: "file-1" };
const hazmat = {
  title: "Litio",
  description: "Celdas industriales",
  category: "General",
};
function fixture() {
  const calls = [],
    requests = new Map(),
    documents = new Map(),
    published = new Set();
  let failUpload = false,
    loseResponse = false;
  const api = {
    async rpc(name, args) {
      calls.push([name, args]);
      if (name === "prepare_cargo_publication") {
        if (!requests.has(args.request_id))
          requests.set(args.request_id, "cargo-" + requests.size);
        return { data: requests.get(args.request_id), error: null };
      }
      published.add(args.target);
      if (loseResponse) {
        loseResponse = false;
        return { data: null, error: { message: "response lost" } };
      }
      return { data: args.target, error: null };
    },
    async upload(form) {
      calls.push(["document-upload", form]);
      if (failUpload) {
        failUpload = false;
        return { data: null, error: { message: "storage unavailable" } };
      }
      const key = form.get("upload_request_id");
      if (!documents.has(key)) documents.set(key, "doc-" + documents.size);
      return { data: { id: documents.get(key) }, error: null };
    },
  };
  // Native FormData descriptor captured without replacing publication logic.
  const makeForm = () => new MapForm();
  return {
    api,
    makeForm,
    calls,
    requests,
    documents,
    published,
    failUpload: () => {
      failUpload = true;
    },
    loseResponse: () => {
      loseResponse = true;
    },
  };
}
class MapForm {
  values = new Map();
  append(k, v) {
    this.values.set(k, v);
  }
  get(k) {
    return this.values.get(k);
  }
}
test("mobile: MSDS ausente, MIME, extension y tamano invalidos impiden preparar", async () => {
  for (const selected of [
    null,
    { ...file, mimeType: "text/plain" },
    { ...file, name: "msds.exe" },
    { ...file, size: 0 },
    { ...file, size: 10485761 },
  ]) {
    const f = fixture();
    await assert.rejects(
      publishMobileCargo(hazmat, keys, selected, f.api, f.makeForm),
      /MSDS/,
    );
    assert.equal(f.calls.length, 0);
  }
});
test("mobile: PDF usa gateway autenticado y descriptor URI; publica solo despues de subir", async () => {
  const f = fixture();
  await publishMobileCargo(hazmat, keys, file, f.api, f.makeForm);
  assert.deepEqual(
    f.calls.map((c) => c[0]),
    ["prepare_cargo_publication", "document-upload", "publish_cargo"],
  );
  const form = f.calls[1][1];
  assert.equal(form.get("kind"), "msds");
  assert.equal(form.get("document_type"), "MSDS");
  assert.equal(form.get("target_type"), "cargo");
  assert.equal(form.get("upload_request_id"), keys.uploadId);
  assert.deepEqual(form.get("file"), {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  });
});
test("mobile: fallo de subida no publica; reintento conserva claves, carga y documento", async () => {
  const f = fixture();
  f.failUpload();
  await assert.rejects(
    publishMobileCargo(hazmat, keys, file, f.api, f.makeForm),
    /borrador/,
  );
  assert.equal(f.published.size, 0);
  await publishMobileCargo(hazmat, keys, file, f.api, f.makeForm);
  await publishMobileCargo(hazmat, keys, file, f.api, f.makeForm);
  assert.equal(f.requests.size, 1);
  assert.equal(f.documents.size, 1);
  assert.equal(f.published.size, 1);
});
test("mobile: respuesta de publicacion perdida permite reintentar la misma carga", async () => {
  const f = fixture();
  f.loseResponse();
  await assert.rejects(
    publishMobileCargo(hazmat, keys, file, f.api, f.makeForm),
    /response lost/,
  );
  assert.equal(
    await publishMobileCargo(hazmat, keys, file, f.api, f.makeForm),
    "cargo-0",
  );
  assert.equal(f.requests.size, 1);
  assert.equal(f.documents.size, 1);
  assert.equal(f.published.size, 1);
});
test("mobile: carga estandar no usa gateway y HAZMAT en categoria tambien exige PDF", async () => {
  const f = fixture();
  await publishMobileCargo(
    { title: "Textiles", description: "Algodon", category: "Ropa" },
    keys,
    null,
    f.api,
    f.makeForm,
  );
  assert.deepEqual(
    f.calls.map((c) => c[0]),
    ["prepare_cargo_publication", "publish_cargo"],
  );
  await assert.rejects(
    publishMobileCargo(
      { title: "Carga", description: "Producto", category: "Aerosoles" },
      keys,
      null,
      f.api,
      f.makeForm,
    ),
    /MSDS/,
  );
});
