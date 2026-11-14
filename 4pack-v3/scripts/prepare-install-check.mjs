import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
const target = path.resolve(".4pack-demo/install-check");
await mkdir(target, { recursive: true });
for (const file of [
  "package.json",
  "package-lock.json",
  "apps/web/package.json",
  "apps/mobile/package.json",
  "packages/domain/package.json",
]) {
  const destination = path.join(target, file);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(path.resolve(file), destination);
}
console.log(
  "Manifiestos copiados a .4pack-demo/install-check; no se toca node_modules del entorno activo.",
);
