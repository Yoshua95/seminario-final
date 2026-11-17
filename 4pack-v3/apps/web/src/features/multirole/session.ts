import "server-only";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isMultiroleDemo } from "./environment.mjs";
import { demoDirectory, localDatabase } from "../operator/data";
import { asUser, demoUsers } from "../operator/demo-runtime.mjs";
export type DemoRole = "importer" | "operator" | "admin";
export const rehearsalAccounts = {
  importer: {
    id: demoUsers.importer,
    email: "importador@4pack.demo",
    role: "importer",
  },
  operator: {
    id: demoUsers.multirole,
    email: "operador.multirrol@4pack.demo",
    role: "operator",
  },
  admin: { id: demoUsers.admin, email: "admin@4pack.demo", role: "admin" },
} as const;
const cookieName = "fourpack-multirole";
export function assertMultiroleDemo() {
  if (!isMultiroleDemo()) notFound();
}
export const roleHome = (role: DemoRole) =>
  role === "operator"
    ? "/demo/operador/oportunidades"
    : role === "admin"
      ? "/demo/admin"
      : "/demo/importador";
async function secret() {
  assertMultiroleDemo();
  const directory = demoDirectory();
  if (!path.isAbsolute(directory))
    throw new Error("El ensayo requiere un directorio absoluto y aislado.");
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, "multirole-session.key");
  try {
    return await readFile(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  try {
    await writeFile(file, randomBytes(32), { flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  return readFile(file);
}
export async function openRehearsalSession(role: DemoRole) {
  const payload = Buffer.from(
    JSON.stringify({
      role,
      expires: Date.now() + 86400000,
      nonce: randomBytes(16).toString("hex"),
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", await secret())
    .update(payload)
    .digest("base64url");
  (await cookies()).set(cookieName, payload + "." + signature, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 86400,
  });
}
export async function closeRehearsalSession() {
  assertMultiroleDemo();
  (await cookies()).delete(cookieName);
}
export async function rehearsalSession(expected?: DemoRole) {
  assertMultiroleDemo();
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) redirect("/demo/acceso");
  const [payload, signature, ...extra] = token.split(".");
  if (!payload || !signature || extra.length) redirect("/demo/acceso");
  const actual = Buffer.from(signature, "base64url"),
    wanted = createHmac("sha256", await secret())
      .update(payload)
      .digest();
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted))
    redirect("/demo/acceso");
  let parsed: { role: DemoRole; expires: number };
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    redirect("/demo/acceso");
  }
  if (
    !["importer", "operator", "admin"].includes(parsed.role) ||
    !Number.isFinite(parsed.expires) ||
    parsed.expires < Date.now()
  )
    redirect("/demo/acceso");
  const account = rehearsalAccounts[parsed.role];
  const profile = (
    await asUser<{ role: string }>(
      await localDatabase(),
      account.id,
      "select role from public.profiles where id=auth.uid()",
    )
  ).rows[0];
  if (profile?.role !== account.role)
    throw new Error("La cuenta ficticia no coincide con su rol persistido.");
  if (expected && expected !== account.role) redirect(roleHome(account.role));
  return account;
}
