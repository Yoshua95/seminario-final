import { PGlite } from "@electric-sql/pglite";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import assets from "./demo-sql.json" with { type: "json" };
import { isDemoEnabled } from "./demo-environment.mjs";
export const demoUsers = {
  operator: "a0000000-0000-0000-0000-000000000001",
  importer: "a0000000-0000-0000-0000-000000000002",
  admin: "a0000000-0000-0000-0000-000000000003",
  competitor: "a0000000-0000-0000-0000-000000000004",
  pending: "a0000000-0000-0000-0000-000000000005",
  suspended: "a0000000-0000-0000-0000-000000000006",
};
export const demoSchemaVersion = createHash("sha256")
  .update(JSON.stringify(assets.migrations))
  .digest("hex");
export async function refreshLocalSchema(db) {
  if (!isDemoEnabled()) throw new Error("La demostración no está disponible.");
  for (const [name, sql] of Object.entries(assets.migrations)) {
    const checksum = createHash("sha256").update(sql).digest("hex");
    const applied = await db.query(
      "select checksum from public.local_demo_versions where name=$1",
      [name],
    );
    if (applied.rows.length === 0) {
      await db.exec(sql);
      await db.query(
        "insert into public.local_demo_versions(name,checksum) values($1,$2) on conflict(name) do update set checksum=excluded.checksum",
        [name, checksum],
      );
    }
  }
  await db.exec(assets.scenarios);
}

export async function createLocalDatabase(directory) {
  if (!isDemoEnabled())
    throw new Error(
      "La demostración sólo está disponible en desarrollo local o Vercel Preview.",
    );
  const db = new PGlite(directory);
  await db.waitReady;
  await db.exec("do $$ begin if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if; end $$;");
  if ((await db.query("select to_regclass('storage.objects') as name")).rows[0].name)
    await db.exec("alter table storage.objects add column if not exists metadata jsonb; alter table storage.objects add column if not exists user_metadata jsonb");
  const initialized = await db.query(
    "select to_regclass('public.operator_profiles') as name",
  );
  if (!initialized.rows[0].name) {
    await db.exec(assets.bootstrap);
    for (const [file, source] of Object.entries(assets.migrations)) {
      try {
        await db.exec(
          source.replace(/create extension if not exists "pgcrypto";/i, ""),
        );
      } catch (error) {
        await db.close();
        throw new Error(file + ": " + error.message, { cause: error });
      }
    }
    await db.exec(assets.seed);
  }
  await db.exec(
    "create table if not exists public.local_demo_versions(name text primary key)",
  );
  await db.exec(
    "alter table public.local_demo_versions add column if not exists checksum text",
  );
  const versions = await db.query(
    "select name from public.local_demo_versions",
  );
  if (versions.rows.length === 0) {
    for (const name of Object.keys(assets.migrations).filter(
      (n) => !initialized.rows[0].name || n < "0013",
    ))
      await db.query(
        "insert into public.local_demo_versions(name,checksum) values($1,$2) on conflict do nothing",
        [name, createHash("sha256").update(assets.migrations[name]).digest("hex")],
      );
  }
  for (const [name, sql] of Object.entries(assets.migrations)) {
    const checksum = createHash("sha256").update(sql).digest("hex");
    const applied = await db.query(
      "select checksum from public.local_demo_versions where name=$1",
      [name],
    );
    if (applied.rows.length === 0) {
      await db.exec(sql);
      await db.query(
        "insert into public.local_demo_versions(name,checksum) values($1,$2) on conflict(name) do update set checksum=excluded.checksum",
        [name, checksum],
      );
    }
  }
  if (directory) {
    await db.exec(assets.scenarios);
    const samplePath = demoUsers.importer + "/msds-demostracion.pdf";
    if (
      (
        await db.query(
          "select id from public.documents where storage_path=$1",
          [samplePath],
        )
      ).rows.length === 0
    ) {
      const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      ];
      const text =
        "BT /F1 20 Tf 50 760 Td (4PACK - Documento de demostracion) Tj 0 -35 Td /F1 12 Tf (MSDS de prueba. Sin validez tecnica ni regulatoria.) Tj ET";
      objects.push(
        "<< /Length " + text.length + " >>\nstream\n" + text + "\nendstream",
      );
      let pdf = "%PDF-1.4\n";
      const offsets = [0];
      for (let i = 0; i < objects.length; i++) {
        offsets.push(Buffer.byteLength(pdf));
        pdf += i + 1 + " 0 obj\n" + objects[i] + "\nendobj\n";
      }
      const xref = Buffer.byteLength(pdf);
      pdf +=
        "xref\n0 6\n0000000000 65535 f \n" +
        offsets
          .slice(1)
          .map((n) => String(n).padStart(10, "0") + " 00000 n \n")
          .join("") +
        "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" +
        xref +
        "\n%%EOF";
      const folder = path.join(
        path.dirname(directory),
        "files",
        demoUsers.importer,
      );
      await mkdir(folder, { recursive: true });
      await writeFile(path.join(folder, "msds-demostracion.pdf"), pdf);
      await db.query(
        "insert into public.documents(id,cargo_id,uploaded_by,kind,document_type,storage_path,original_name,mime_type,size_bytes,validation_status) values('f0000000-0000-0000-0000-000000000001',$1,$2,'msds','MSDS',$3,'MSDS - demostración.pdf','application/pdf',$4,'approved')",
        [
          "b0000000-0000-0000-0000-000000009477",
          demoUsers.importer,
          samplePath,
          Buffer.byteLength(pdf),
        ],
      );
    }
  }

  return db;
}
export async function asUser(db, userId, query, params = []) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
      userId,
    ]);
    return tx.query(query, params);
  });
}
