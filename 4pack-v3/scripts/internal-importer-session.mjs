// Test runner only: requires local filesystem access to the isolated demo key.
// No HTTP entry point, query flag, password or public importer selector.
import { readFile } from "node:fs/promises";
import { createHmac, randomBytes } from "node:crypto";
import path from "node:path";
export async function internalImporterSession(context, base, directory) {
  const url = new URL(base);
  if (
    url.protocol !== "http:" ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    !directory ||
    !path.isAbsolute(directory)
  )
    throw Error("Local isolated test directory required");
  const key = await readFile(path.join(directory, "multirole-session.key"));
  const payload = Buffer.from(
    JSON.stringify({
      role: "importer",
      expires: Date.now() + 3600000,
      nonce: randomBytes(16).toString("hex"),
    }),
  ).toString("base64url");
  await context.addCookies([
    {
      name: "fourpack-multirole",
      value:
        payload +
        "." +
        createHmac("sha256", key).update(payload).digest("base64url"),
      domain: url.hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
}
