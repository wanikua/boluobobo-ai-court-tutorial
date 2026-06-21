import { test } from "node:test";
import assert from "node:assert/strict";
import { CN_CC_BACKENDS, checkCnCc, CN_CC_REPO } from "../engine/cn-cc.mjs";

test("CN_CC_BACKENDS maps cn:* civ backends to cn-cc cc-* launchers", () => {
  assert.ok(Object.keys(CN_CC_BACKENDS).length >= 6, "expect the cn:* fleet");
  assert.equal(CN_CC_BACKENDS["cn:doubao"], "cc-doubao");
  assert.equal(CN_CC_BACKENDS["cn:glm"], "cc-glm");
  // every value is a cc-* launcher
  for (const cmd of Object.values(CN_CC_BACKENDS)) assert.match(cmd, /^cc-/);
  // claude / codex / opencode are NOT cn-cc-provided backends
  assert.ok(!("claude" in CN_CC_BACKENDS));
  assert.ok(!("codex" in CN_CC_BACKENDS));
});

test("checkCnCc returns a structured, non-throwing result", () => {
  const r = checkCnCc();
  assert.equal(typeof r.ok, "boolean");
  assert.ok(Array.isArray(r.present) && Array.isArray(r.missing));
  assert.equal(
    r.present.length + r.missing.length,
    Object.keys(CN_CC_BACKENDS).length,
  );
  assert.equal(r.repo, CN_CC_REPO);
  assert.ok(typeof r.install === "string" && r.install.includes("install.sh"));
});
