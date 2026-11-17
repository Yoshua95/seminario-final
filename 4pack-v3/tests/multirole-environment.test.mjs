import test from "node:test";
import assert from "node:assert/strict";
import { isMultiroleDemo } from "../apps/web/src/features/multirole/environment.mjs";
const local = {
  NODE_ENV: "development",
  FOURPACK_MULTIROLE_DEMO: "1",
  FOURPACK_DEMO_DIRECTORY: "C:/isolated-fictional-demo",
};
test("ensayo multirrol exige opt-in y directorio de datos propio", () => {
  assert.equal(isMultiroleDemo(local), true);
  assert.equal(
    isMultiroleDemo({ ...local, FOURPACK_MULTIROLE_DEMO: undefined }),
    false,
  );
  assert.equal(
    isMultiroleDemo({ ...local, FOURPACK_DEMO_DIRECTORY: undefined }),
    false,
  );
});
test("ensayo multirrol permanece bloqueado en produccion y Vercel Preview", () => {
  assert.equal(isMultiroleDemo({ ...local, NODE_ENV: "production" }), false);
  assert.equal(
    isMultiroleDemo({ ...local, VERCEL: "1", VERCEL_ENV: "preview" }),
    false,
  );
  assert.equal(isMultiroleDemo({ ...local, VERCEL_ENV: "production" }), false);
  assert.equal(isMultiroleDemo({ ...local, VERCEL: "1" }), false);
});
