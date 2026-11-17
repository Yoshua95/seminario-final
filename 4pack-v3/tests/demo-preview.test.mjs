import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  isDemoEnabled,
  isVercelPreview,
} from "../apps/web/src/features/operator/demo-environment.mjs";
import {
  createLocalDatabase,
  asUser,
  demoUsers,
} from "../scripts/local-database.mjs";
import assets from "../apps/web/src/features/operator/demo-sql.json" with { type: "json" };
test("demo sólo en desarrollo local o Vercel Preview; producción siempre bloqueada", () => {
  for (const env of [{ NODE_ENV: "development" }, { NODE_ENV: "test" }, {}])
    assert.equal(isDemoEnabled(env), true);
  assert.equal(
    isDemoEnabled({
      NODE_ENV: "production",
      VERCEL: "1",
      VERCEL_ENV: "preview",
    }),
    true,
  );
  for (const env of [
    { NODE_ENV: "production" },
    { NODE_ENV: "development", VERCEL: "1", VERCEL_ENV: "production" },
    { NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "production" },
    { NODE_ENV: "development", VERCEL: "1", VERCEL_ENV: "development" },
    { NODE_ENV: "development", VERCEL_ENV: "preview" },
    { NODE_ENV: "development", VERCEL: "1" },
  ])
    assert.equal(isDemoEnabled(env), false, JSON.stringify(env));
  assert.equal(isVercelPreview({ VERCEL: "1", VERCEL_ENV: "preview" }), true);
});
test("paquete demo contiene exactamente las migraciones y semillas versionadas", async () => {
  const names = (
    await readdir(new URL("../supabase/migrations/", import.meta.url))
  )
    .filter((n) => n.endsWith(".sql"))
    .sort();
  assert.deepEqual(Object.keys(assets.migrations), names);
  for (const name of names)
    assert.equal(
      assets.migrations[name],
      await readFile(
        new URL("../supabase/migrations/" + name, import.meta.url),
        "utf8",
      ),
    );
  assert.equal(
    assets.seed,
    await readFile(
      new URL("../supabase/demo/operator-seed.sql", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(assets.scenarios,(await readFile(new URL("../supabase/demo/operator-scenarios.sql",import.meta.url),"utf8"))+"\n"+(await readFile(new URL("../supabase/demo/stage2a-scenarios.sql",import.meta.url),"utf8")));
  assert.equal(assets.multirole_seed,await readFile(new URL("../supabase/demo/multirole-seed.sql",import.meta.url),"utf8"));
  assert.equal(assets.capacity_seed,await readFile(new URL("../supabase/demo/stage2b-capacity-seed.sql",import.meta.url),"utf8"));
});
test("runtime Preview inicia desde el paquete SQL y un directorio temporal, sin Supabase", async () => {
  const saved = {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };
  Object.assign(process.env, {
    NODE_ENV: "production",
    VERCEL: "1",
    VERCEL_ENV: "preview",
  });
  let db;
  try {
    await mkdir(".4pack-demo", { recursive: true });
    const dir = await mkdtemp(path.resolve(".4pack-demo/preview-unit-"));
    db = await createLocalDatabase(path.join(dir, "database"));
    const result = await asUser(
      db,
      demoUsers.operator,
      "select public.operator_snapshot() as data",
    );
    const data = result.rows[0].data;
    assert.equal(data.operator.company_name, "Marítima Rivera S.A.");
    assert.equal(data.cargos.filter((c) => c.status === "open").length, 4);
    assert.equal(
      data.documents.find((d) => d.id === "f0000000-0000-0000-0000-000000000001")?.id,
      "f0000000-0000-0000-0000-000000000001",
    );
  } finally {
    await db?.close();
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
test("el runtime impide crear una base de demo en producción", async () => {
  const saved = {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };
  Object.assign(process.env, {
    NODE_ENV: "production",
    VERCEL: "1",
    VERCEL_ENV: "production",
  });
  try {
    await assert.rejects(createLocalDatabase(), /demostración/);
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
