import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveBackend, isKnownBackend } from "../engine/v5/backends.mjs";

test("resolveBackend maps native + cc forks to commands", () => {
  assert.equal(resolveBackend("native"), "claude");
  assert.equal(resolveBackend("claude"), "claude");
  assert.equal(resolveBackend("cn:doubao"), "cc-doubao");
  assert.equal(resolveBackend("cn:glm"), "cc-glm");
  assert.equal(resolveBackend("cn:mimo"), "cc-mimo");
});

test("resolveBackend defaults empty/undefined to native", () => {
  assert.equal(resolveBackend(undefined), "claude");
  assert.equal(resolveBackend(""), "claude");
  assert.equal(resolveBackend("  "), "claude");
});

test("resolveBackend rejects gemini (hard rule) with a policy message", () => {
  assert.throws(() => resolveBackend("gemini"), /forbidden backend.*policy/i);
  assert.throws(() => resolveBackend("GEMINI"), /forbidden/i);
});

test("resolveBackend rejects non-claude-compatible engines (codex/opencode)", () => {
  assert.throws(() => resolveBackend("codex"), /unsupported backend/i);
  assert.throws(() => resolveBackend("opencode"), /unsupported backend/i);
});

test("resolveBackend rejects unknown backends instead of silently using claude", () => {
  assert.throws(() => resolveBackend("totally-made-up"), /unknown backend/i);
});

test("isKnownBackend reflects resolveBackend", () => {
  assert.ok(isKnownBackend("cn:kimi"));
  assert.ok(!isKnownBackend("gemini"));
  assert.ok(!isKnownBackend("nope"));
});
