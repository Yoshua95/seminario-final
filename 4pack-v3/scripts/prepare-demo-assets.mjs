import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url);
const migrations = {};
for (const name of (await readdir(new URL("supabase/migrations/", root)))
  .filter((n) => n.endsWith(".sql"))
  .sort())
  migrations[name] = await readFile(
    new URL("supabase/migrations/" + name, root),
    "utf8",
  );
const assets = {
  note: "Generated exclusively from the simulated seed and versioned schema. No environment files or local database contents.",
  bootstrap: await readFile(
    new URL("supabase/demo/bootstrap.sql", root),
    "utf8",
  ),
  migrations,
  capacity_seed: await readFile(new URL("supabase/demo/stage2b-capacity-seed.sql",root),"utf8"),
  seed: await readFile(
    new URL("supabase/demo/operator-seed.sql", root),
    "utf8",
  ),
  scenarios: (await readFile(
    new URL("supabase/demo/operator-scenarios.sql", root),
    "utf8",
  )) + "\n" + await readFile(new URL("supabase/demo/stage2a-scenarios.sql",root),"utf8"),
};
const target = new URL("apps/web/src/features/operator/demo-sql.json", root);
const text = JSON.stringify(assets, null, 2) + "\n";
if ((await readFile(target, "utf8").catch(() => null)) !== text)
  await writeFile(target, text);
if (process.argv[1] === fileURLToPath(import.meta.url))
  console.log(
    "Esquema y semilla simulada empaquetados; no se incluyeron datos locales ni variables de entorno.",
  );
