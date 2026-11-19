import { readFile, writeFile } from "node:fs/promises";
const names = [
  "20261119024020_ars_only_new_contracts.sql",
  "20261119180708_offer_capital_reservations.sql",
  "20261119181203_capital_requests_admin_workbench.sql",
  "20261119221524_capital_profile_consistency.sql",
];
const assets = {};
for (const name of names)
  assets[name] = await readFile(
    new URL("../supabase/migrations/" + name, import.meta.url),
    "utf8",
  );
assets["local-capital-fixture.sql"] = await readFile(
  new URL("../supabase/demo/capital-admin-isolated-seed.sql", import.meta.url),
  "utf8",
);
await writeFile(
  new URL(
    "../apps/web/src/features/operator/capital-sql.json",
    import.meta.url,
  ),
  JSON.stringify(assets, null, 2) + "\n",
);
console.log(
  "SQL de ensayo aislado generado; no incluye datos ni configuracion de Supabase.",
);
