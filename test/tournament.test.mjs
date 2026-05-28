import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCiv, civSpawnSpec } from "../engine/v5/tournament.mjs";

test("parseCiv handles plain regime and regime#backend", () => {
  assert.deepEqual(parseCiv("china/tang"), { regime: "china/tang", backend: "native" });
  assert.deepEqual(parseCiv("china/qin#cn:doubao"), { regime: "china/qin", backend: "cn:doubao" });
  assert.deepEqual(parseCiv(" global/athens#cn:glm "), { regime: "global/athens", backend: "cn:glm" });
});

test("parseCiv rejects path-traversal regimes", () => {
  assert.throws(() => parseCiv("../../etc#native"));
  assert.throws(() => parseCiv("china"));
});

test("civSpawnSpec launches run-v5 directly (NOT `civagent switch`)", () => {
  const spec = civSpawnSpec({
    regime: "china/qin",
    backend: "cn:doubao",
    matchId: "T1__china-qin",
    runV5: "/x/run-v5.mjs",
  });
  assert.equal(spec.command, "node");
  assert.deepEqual(spec.args, ["/x/run-v5.mjs", "--backend", "cn:doubao", "china/qin"]);
  // The whole point of the P0 fix: no global "switch" step that civs could race on.
  assert.ok(!spec.args.includes("switch"));
  assert.ok(!JSON.stringify(spec).includes("civagent"));
});

test("each civ gets its own match id via env — no shared mutable state", () => {
  const a = civSpawnSpec({ regime: "china/tang", backend: "native", matchId: "T__china-tang" });
  const b = civSpawnSpec({ regime: "china/qin", backend: "native", matchId: "T__china-qin" });
  assert.notEqual(a.env.CIVAGENT_MATCH_ID, b.env.CIVAGENT_MATCH_ID);
  assert.equal(a.env.CIVAGENT_MATCH_ID, "T__china-tang");
});
