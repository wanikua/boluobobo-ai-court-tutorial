import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveJudgeChain, runJudge, JUDGE_PROVIDERS, DEFAULT_JUDGE_CHAIN } from "../engine/v5/judge.mjs";

test("resolveJudgeChain drops gemini, unknowns, and duplicates while preserving order", () => {
  assert.deepEqual(
    resolveJudgeChain(["gemini", "codex", "codex", "made-up", "opencode-reviewer"]),
    ["codex", "opencode-reviewer"],
  );
});

test("default chain contains no gemini and only known providers", () => {
  const chain = resolveJudgeChain(DEFAULT_JUDGE_CHAIN);
  assert.ok(!chain.includes("gemini"));
  for (const id of chain) assert.ok(JUDGE_PROVIDERS[id], `${id} is a known provider`);
});

test("runJudge picks the first AVAILABLE provider", () => {
  const has = (cmd) => cmd === "opencode"; // only opencode-reviewer available
  const spawn = (cmd, args) => {
    assert.equal(cmd, "opencode");
    return { status: 0, stdout: "looks good\nAPPROVE" };
  };
  const r = runJudge("prompt", { _has: has, _spawn: spawn });
  assert.equal(r.provider, "opencode-reviewer");
  assert.match(r.output, /APPROVE$/);
});

test("runJudge retries then falls through to the next provider", () => {
  const calls = [];
  const has = () => true; // all available
  const spawn = (cmd) => {
    calls.push(cmd);
    if (cmd === "codex") return { status: 1, stderr: "boom" }; // always fails
    return { status: 0, stdout: "ok" };
  };
  const r = runJudge("p", { _has: has, _spawn: spawn, retries: 1 });
  // codex tried retries+1 = 2 times, then opencode succeeds
  assert.deepEqual(calls, ["codex", "codex", "opencode"]);
  assert.equal(r.provider, "opencode-reviewer");
});

test("runJudge throws (not silently) when no provider is available", () => {
  assert.throws(
    () => runJudge("p", { _has: () => false, _spawn: () => ({ status: 0, stdout: "" }) }),
    /no judge provider available/i,
  );
});

test("runJudge can never be coerced into using gemini", () => {
  let spawned = null;
  const spawn = (cmd) => {
    spawned = cmd;
    return { status: 0, stdout: "x" };
  };
  // Even if a caller passes gemini explicitly and claims it's available,
  // the chain filters it out, leaving nothing to run.
  assert.throws(() => runJudge("p", { providers: ["gemini"], _has: () => true, _spawn: spawn }), /gemini is disabled/i);
  assert.equal(spawned, null, "gemini must never be spawned");
});
