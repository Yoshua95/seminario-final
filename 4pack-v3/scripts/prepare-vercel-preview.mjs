import { cp, readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from 'node:url';
import "./prepare-demo-assets.mjs";
const root = fileURLToPath(new URL('../',import.meta.url));
const source = path.join(root, "apps/web");
const target = path.join(root, ".4pack-demo", "vercel-preview-package");
if (!target.startsWith(path.join(root, ".4pack-demo") + path.sep))
  throw new Error("Destino de empaquetado inválido");
await mkdir(target, { recursive: true });
const exclude = (entry) => {
  const name = path.basename(entry);
  return (
    !name.startsWith(".env") &&
    ![".npmrc", ".vercel", ".aws"].includes(name) &&
    !/[.](pem|key|p12|pfx)$/i.test(name)
  );
};
await cp(path.join(source, "src"), path.join(target, "src"), {
  recursive: true,
  filter: exclude,
});
await mkdir(path.join(target, "packages"), { recursive: true });
await cp(
  path.join(root, "packages/domain"),
  path.join(target, "packages/domain"),
  {
    recursive: true,
    filter: (entry) =>
      exclude(entry) && !entry.split(path.sep).includes("node_modules"),
  },
);
for (const file of [
  "tsconfig.json",
  "next-env.d.ts",
  "eslint.config.mjs",
  ".vercelignore",
])
  await cp(path.join(source, file), path.join(target, file));
const config = (
  await readFile(path.join(source, "next.config.ts"), "utf8")
).replace(
  "../../packages/domain/src/operator.ts",
  "./packages/domain/src/operator.ts",
);
await writeFile(path.join(target, "next.config.ts"), config);
const packageJson = JSON.parse(
  await readFile(path.join(source, "package.json"), "utf8"),
);
packageJson.dependencies["@4pack/domain"] = "file:./packages/domain";
packageJson.overrides = { react: "19.1.0", "react-dom": "19.1.0" };
await writeFile(
  path.join(target, "package.json"),
  JSON.stringify(packageJson, null, 2) + "\n",
);
await writeFile(
  path.join(target, "vercel.json"),
  JSON.stringify(
    {
      framework: "nextjs",
      buildCommand: "npm run build",
      installCommand: "npm ci --no-audit --no-fund",
    },
    null,
    2,
  ) + "\n",
);
await writeFile(
  path.join(target, ".gitignore"),
  ".env*\nnode_modules/\n.next/\n.vercel/\n",
);
async function check(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (!exclude(absolute))
      throw new Error("Archivo privado no permitido en el paquete");
    if (
      entry.isDirectory() &&
      !["node_modules", ".next", ".vercel"].includes(entry.name)
    )
      await check(absolute);
  }
}
await check(target);
console.log(
  "Paquete autónomo de apps/web preparado en .4pack-demo/vercel-preview-package. Sin entornos, credenciales, base local ni documentos del equipo.",
);
