import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../engine/v5/run-v5.mjs";

test("parseArgs: regime + prompt, default backend native", () => {
  const r = parseArgs(["china/tang", "handle", "a", "famine"], {});
  assert.equal(r.backend, "native");
  assert.equal(r.regimeRaw, "china/tang");
  assert.equal(r.prompt, "handle a famine");
});

test("parseArgs: --backend flag is pulled out, leaving regime + prompt intact", () => {
  const r = parseArgs(["--backend", "cn:glm", "china/tang", "task"], {});
  assert.equal(r.backend, "cn:glm");
  assert.equal(r.regimeRaw, "china/tang");
  assert.equal(r.prompt, "task");
});

test("parseArgs: $CIVAGENT_BACKEND is honored when no flag", () => {
  const r = parseArgs(["china/tang"], { CIVAGENT_BACKEND: "cn:doubao" });
  assert.equal(r.backend, "cn:doubao");
});

test("parseArgs: --backend flag overrides the env var", () => {
  const r = parseArgs(["--backend", "cn:glm", "china/tang"], { CIVAGENT_BACKEND: "cn:doubao" });
  assert.equal(r.backend, "cn:glm");
});

test("parseArgs: no prompt is fine (interactive run)", () => {
  const r = parseArgs(["china/tang"], {});
  assert.equal(r.prompt, "");
});
