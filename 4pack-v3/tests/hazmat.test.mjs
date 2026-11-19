import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import {
  createLocalDatabase,
  asUser,
  demoUsers as users,
} from "../scripts/local-database.mjs";
import { validateDocumentBytes } from "../supabase/functions/_shared/document-validation.mjs";
import { quoteFixture } from "./quote-fixture.mjs";
let db;
before(async () => {
  db = await createLocalDatabase();
});
after(async () => {
  await db?.close();
});
const q = (sql, values = [], actor = users.importer) =>
  asUser(db, actor, sql, values);
const payload = (extra = {}) => ({
  title: "Baterias de litio",
  description: "Celdas para equipos",
  origin: "Shenzhen",
  destination: "Buenos Aires",
  category: "Tecnologia",
  weight_kg: 10,
  volume_m3: 1,
  fob_usd: 2000,
  preferred_mode: "sea",
  ...extra,
});
async function prepare(data = payload(), key = randomUUID()) {
  return (
    await q("select public.prepare_cargo_publication($1,$2::jsonb) id", [
      key,
      JSON.stringify(data),
    ])
  ).rows[0].id;
}
async function upload(
  id,
  {
    actor = users.importer,
    type = "application/pdf",
    bytes = Buffer.from("%PDF-1.4\nMSDS de prueba\n"),
    key = randomUUID(),
    kind = "msds",
  } = {},
) {
  validateDocumentBytes("msds.pdf", type, bytes);
  const sha256 = createHash("sha256").update(bytes).digest("hex"),
    storage_path = `${actor}/${key}.pdf`;
  const data = {
    id,
    target_type: "cargo",
    document_type: "MSDS",
    kind,
    storage_path,
    sha256,
    original_name: "msds.pdf",
    mime_type: type,
    size_bytes: bytes.length,
  };
  return db.transaction(async (tx) => {
    if (
      !(
        await tx.query(
          "select public.document_upload_target($1,$2::jsonb) ok",
          [actor, JSON.stringify(data)],
        )
      ).rows[0].ok
    )
      throw Error("Destino no autorizado");
    if (
      !(
        await tx.query("select id from storage.objects where name=$1", [
          storage_path,
        ])
      ).rows.length
    )
      await tx.query(
        "insert into storage.objects(bucket_id,name,owner_id,metadata,user_metadata) values('documents',$1,$2,$3,$4)",
        [
          storage_path,
          actor,
          JSON.stringify({ size: bytes.length, mimetype: type }),
          JSON.stringify({ uploaded_by: actor, sha256 }),
        ],
      );
    return (
      await tx.query(
        "select public.register_document_upload($1,$2::jsonb) id",
        [actor, JSON.stringify(data)],
      )
    ).rows[0].id;
  });
}
const publish = (id) => q("select public.publish_cargo($1) id", [id]);
test("PDF valido vinculado permite publicar; prepare/upload/publish repetidos no duplican", async () => {
  const key = randomUUID(),
    fileKey = randomUUID(),
    data = payload(),
    id = await prepare(data, key);
  const document = await upload(id, { key: fileKey });
  assert.equal(await upload(id, { key: fileKey }), document);
  await publish(id);
  await publish(id);
  assert.equal(await prepare(data, key), id);
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from public.documents where cargo_id=$1",
        [id],
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (
      await db.query("select status from public.cargo_requests where id=$1", [
        id,
      ])
    ).rows[0].status,
    "open",
  );
  await assert.rejects(prepare({ ...data, title: "Otro" }, key), /conservar/);
});
test("ausencia y PDF invalido no publican; no se pueden falsear flags ni insertar open", async () => {
  const id = await prepare();
  await assert.rejects(publish(id), /MSDS/);
  await assert.rejects(
    upload(id, { bytes: Buffer.from("esto no es un PDF") }),
    /signature/,
  );
  await assert.rejects(
    q(
      "update public.cargo_requests set status='open',msds_required=false,hazmat_review_required=false where id=$1",
      [id],
    ),
    /MSDS/,
  );
  await assert.rejects(
    q(
      "insert into public.cargo_requests(importer_id,title,description,origin,destination,category,weight_kg,volume_m3,fob_usd,status) values(auth.uid(),'Litio','Carga de prueba','China','Argentina','General',1,1,100,'open')",
    ),
    /MSDS/,
  );
  assert.equal(
    (
      await db.query("select status from public.cargo_requests where id=$1", [
        id,
      ])
    ).rows[0].status,
    "draft",
  );
});
test("fallo de subida conserva borrador; reintento recupera la misma carga y documento", async () => {
  const key = randomUUID(),
    data = payload(),
    id = await prepare(data, key),
    fileKey = randomUUID();
  // Transport/storage failure before any trusted registration.
  await assert.rejects(
    db.transaction(async (tx) => {
      await tx.query(
        "insert into storage.objects(bucket_id,name) values('documents',$1)",
        [`${users.importer}/${fileKey}.pdf`],
      );
      throw new Error("storage unavailable");
    }),
    /storage unavailable/,
  );
  await assert.rejects(publish(id), /MSDS/);
  assert.equal(await prepare(data, key), id);
  await upload(id, { key: fileKey });
  await upload(id, { key: fileKey });
  await publish(id);
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from public.documents where cargo_id=$1",
        [id],
      )
    ).rows[0].n,
    1,
  );
});
test("otro importador u operador no puede publicar ni vincular documentos ajenos", async () => {
  const id = await prepare();
  const stranger = randomUUID();
  await db.query(
    'insert into auth.users(id,email,raw_user_meta_data) values($1,$2,\'{"full_name":"Importador ajeno ficticio"}\')',
    [stranger, `${stranger}@4pack.demo`],
  );
  await assert.rejects(upload(id, { actor: stranger }), /autorizado/);
  await assert.rejects(
    q("select public.publish_cargo($1)", [id], stranger),
    /autorizada/,
  );
  assert.equal(
    (
      await q(
        "select id from public.cargo_requests where id=$1",
        [id],
        users.operator,
      )
    ).rows.length,
    0,
  );
  await assert.rejects(upload(id, { actor: users.operator }), /autorizado/);
  await assert.rejects(
    q("select public.publish_cargo($1)", [id], users.operator),
    /autorizada/,
  );
  await assert.rejects(
    q(
      "select public.prepare_cargo_publication($1,$2::jsonb)",
      [randomUUID(), JSON.stringify(payload())],
      users.operator,
    ),
    /importador/,
  );
  await assert.rejects(
    q("select public.register_document_upload($1,$2::jsonb)", [
      users.importer,
      JSON.stringify({ id }),
    ]),
    /permission denied/,
  );
});
test("adjudicacion rechaza MSDS rechazado, aun para una carga abierta anteriormente", async () => {
  const id = await prepare();
  const document = await upload(id);
  await publish(id);
  const offered = await asUser(
    db,
    users.operator,
    "select public.quote_command('submit',$1::jsonb) r",
    [JSON.stringify({ cargo_id: id, quote: quoteFixture() })],
  );
  await db.query(
    "update public.documents set validation_status='rejected',rejection_reason='Ficha ilegible de prueba' where id=$1",
    [document],
  );
  assert.equal(
    (
      await db.query("select status from public.cargo_requests where id=$1", [
        id,
      ])
    ).rows[0].status,
    "draft",
  );
  await assert.rejects(
    q("select public.award_offer($1)", [offered.rows[0].r.id]),
    /MSDS/,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from public.operations where cargo_id=$1",
        [id],
      )
    ).rows[0].n,
    0,
  );
});
test("adjudicacion sin objeto vinculado no crea operacion, garantia ni reserva", async () => {
  const id = await prepare(),
    document = await upload(id);
  await publish(id);
  const offered = await asUser(
    db,
    users.operator,
    "select public.quote_command('submit',$1::jsonb) r",
    [JSON.stringify({ cargo_id: id, quote: quoteFixture() })],
  );
  await db.query("delete from public.document_objects where document_id=$1", [
    document,
  ]);
  await assert.rejects(
    q("select public.award_offer($1)", [offered.rows[0].r.id]),
    /MSDS/,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from public.operations where cargo_id=$1",
        [id],
      )
    ).rows[0].n,
    0,
  );
});
test("documento no MSDS, otra carga y MIME incorrecto no satisfacen el requisito", async () => {
  const id = await prepare(),
    other = await prepare();
  await upload(other);
  await assert.rejects(publish(id), /MSDS/);
  await upload(id, { kind: "other" });
  await assert.rejects(publish(id), /MSDS/);
});
test("carga estandar publica sin documento; titulo y categoria tambien detectan HAZMAT", async () => {
  const standard = await prepare(
    payload({
      title: "Textiles",
      description: "Prendas de algodon",
      category: "Indumentaria",
    }),
  );
  await publish(standard);
  const category = await prepare(
    payload({
      title: "Producto industrial",
      description: "Embalaje nuevo",
      category: "Aerosoles",
    }),
  );
  await assert.rejects(publish(category), /MSDS/);
});
