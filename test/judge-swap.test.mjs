// judge-swap.test.mjs — unit tests for blind double evaluation (order swap)
// and the anchored rubric in tournament.mjs's judge step.
//
// The real judge CLI chain is never invoked: judge() accepts an injected
// _runJudge, and a mock eventLog captures the judge_score audit events.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  judge,
  judgeSwapEnabled,
  parseJudgeJsonScores,
  aggregateJudgePasses,
  buildJudgePrompt,
  JUDGE_RUBRIC_PROMPT,
  RUBRIC_DIMENSIONS,
} from "../engine/v5/tournament.mjs";

const CIVS = [
  { regime: "china/tang", backend: "native", matchId: "swap-test-no-such-match-a", code: 0, logFile: "/nonexistent-a" },
  { regime: "china/qin", backend: "native", matchId: "swap-test-no-such-match-b", code: 0, logFile: "/nonexistent-b" },
];

function mockLog() {
  return {
    events: [],
    emit(type, fields) { this.events.push({ type, ...fields }); },
  };
}

function jsonOutput(tangDims, qinDims) {
  return JSON.stringify({
    scores: [
      { civilization: "china/tang", ...tangDims, reason: "tang reason" },
      { civilization: "china/qin", ...qinDims, reason: "qin reason" },
    ],
    verdict: "tang wins",
  });
}

// ── judgeSwapEnabled ─────────────────────────────────────────────────────────

test("judgeSwapEnabled defaults to on, CIVAGENT_JUDGE_SWAP=0 disables", () => {
  assert.equal(judgeSwapEnabled({}), true);
  assert.equal(judgeSwapEnabled({ CIVAGENT_JUDGE_SWAP: "1" }), true);
  assert.equal(judgeSwapEnabled({ CIVAGENT_JUDGE_SWAP: "0" }), false);
});

// ── rubric prompt ────────────────────────────────────────────────────────────

test("rubric prompt anchors a 4-point scale on the three existing dimensions", () => {
  for (const d of RUBRIC_DIMENSIONS) {
    assert.ok(JUDGE_RUBRIC_PROMPT.includes(d), `rubric must keep dimension ${d}`);
  }
  assert.match(JUDGE_RUBRIC_PROMPT, /1 = /);
  assert.match(JUDGE_RUBRIC_PROMPT, /4 = /);
  assert.ok(JUDGE_RUBRIC_PROMPT.includes("JSON"), "judge must be asked for structured JSON");
  const full = buildJudgePrompt("the task", "sections here");
  assert.ok(full.includes("## Task\nthe task"));
  assert.ok(full.includes("sections here"));
});

// ── parseJudgeJsonScores ─────────────────────────────────────────────────────

test("parseJudgeJsonScores parses valid rubric JSON and maps names to regimes", () => {
  const out = parseJudgeJsonScores(jsonOutput(
    { legality: 4, feasibility: 3, resilience: 2 },
    { legality: 2, feasibility: 2, resilience: 3 },
  ), ["china/tang", "china/qin"]);
  assert.equal(out.scores.length, 2);
  assert.equal(out.scores[0].regime, "china/tang");
  assert.deepEqual(out.scores[0].dims, { legality: 4, feasibility: 3, resilience: 2 });
  assert.equal(out.verdict, "tang wins");
});

test("parseJudgeJsonScores tolerates prose around the JSON object", () => {
  const noisy = `Here are my scores.\n${jsonOutput({ legality: 3, feasibility: 3, resilience: 3 }, { legality: 1, feasibility: 1, resilience: 1 })}\nDone.`;
  const out = parseJudgeJsonScores(noisy, ["china/tang", "china/qin"]);
  assert.equal(out.scores.length, 2);
});

test("parseJudgeJsonScores returns null for non-JSON or invalid scores", () => {
  assert.equal(parseJudgeJsonScores("| 1 | tang | 9.0 | md table |", ["china/tang"]), null);
  assert.equal(parseJudgeJsonScores("", ["china/tang"]), null);
  assert.equal(parseJudgeJsonScores('{"scores":[]}', ["china/tang"]), null);
  // Out-of-range dimension → entry dropped → no valid scores → null
  assert.equal(
    parseJudgeJsonScores('{"scores":[{"civilization":"china/tang","legality":9,"feasibility":3,"resilience":3}]}', ["china/tang"]),
    null,
  );
});

// ── aggregateJudgePasses ─────────────────────────────────────────────────────

test("aggregateJudgePasses averages score and dims across passes", () => {
  const passes = [
    { swapped: false, perRegime: { "china/tang": { score10: 10, dims: { legality: 4, feasibility: 4, resilience: 4 } }, "china/qin": { score10: 5 } } },
    { swapped: true,  perRegime: { "china/tang": { score10: 5,  dims: { legality: 2, feasibility: 2, resilience: 2 } }, "china/qin": { score10: 7.6 } } },
  ];
  const out = aggregateJudgePasses(passes, ["china/tang", "china/qin"]);
  assert.equal(out.length, 2);
  const tang = out.find((s) => s.regime === "china/tang");
  assert.ok(Math.abs(tang.score - 7.5) < 0.001);
  assert.deepEqual(tang.dims, { legality: 3, feasibility: 3, resilience: 3 });
  const qin = out.find((s) => s.regime === "china/qin");
  assert.ok(Math.abs(qin.score - 6.3) < 0.001);
  assert.equal(qin.dims, undefined, "dims omitted when no rubric data");
  // Sorted descending
  assert.equal(out[0].regime, "china/tang");
});

// ── judge(): swap behavior, audit events, aggregation ────────────────────────

test("swap mode calls the judge twice with reversed presentation order", async () => {
  const prompts = [];
  const log = mockLog();
  const fakeRunJudge = (prompt) => {
    prompts.push(prompt);
    return { provider: "codex", output: jsonOutput({ legality: 4, feasibility: 4, resilience: 4 }, { legality: 2, feasibility: 2, resilience: 2 }) };
  };
  const v = await judge("task-x", CIVS, { swap: true, eventLog: log, _runJudge: fakeRunJudge });

  assert.equal(prompts.length, 2, "judge must be called twice when swap is on");
  const pos = (p) => [p.indexOf("### china/tang"), p.indexOf("### china/qin")];
  const [t1, q1] = pos(prompts[0]);
  const [t2, q2] = pos(prompts[1]);
  assert.ok(t1 >= 0 && q1 >= 0, "both sections present");
  assert.ok(t1 < q1, "pass 1 presents tang before qin");
  assert.ok(t2 > q2, "pass 2 (swapped) presents qin before tang");

  // Audit events: two judge_score events with correct swap flags + prompt hashes.
  const judgeEvents = log.events.filter((e) => e.type === "judge");
  assert.equal(judgeEvents.length, 2);
  assert.equal(judgeEvents[0].kind, "judge_score");
  assert.equal(judgeEvents[0].actor, "judge");
  assert.equal(judgeEvents[0].swapped, false);
  assert.equal(judgeEvents[1].swapped, true);
  assert.deepEqual(judgeEvents[0].order, ["china/tang", "china/qin"]);
  assert.deepEqual(judgeEvents[1].order, ["china/qin", "china/tang"]);
  for (const ev of judgeEvents) {
    assert.match(ev.prompt_hash, /^[0-9a-f]{16}$/, "prompt_hash must be sha256[:16]");
    assert.equal(ev.provider, "codex");
    assert.equal(ev.model, "codex");
    assert.ok(ev.parent_span_id, "judge_score events must hang under the judge span");
  }
  assert.notEqual(judgeEvents[0].prompt_hash, judgeEvents[1].prompt_hash, "swapped order changes the prompt");

  // Identical scores in both passes → same aggregate; verdict recorded in md.
  assert.equal(v.passes, 2);
  assert.equal(v.swap, true);
  assert.equal(v.scores[0].regime, "china/tang");
  assert.ok(Math.abs(v.scores[0].score - 10) < 0.001);
  assert.ok(v.md.includes("## Verdict"));
});

test("swap averages divergent pass scores (mean aggregation)", async () => {
  let call = 0;
  const fakeRunJudge = () => {
    call++;
    return call === 1
      ? { provider: "codex", output: jsonOutput({ legality: 4, feasibility: 4, resilience: 4 }, { legality: 2, feasibility: 2, resilience: 2 }) }
      : { provider: "codex", output: jsonOutput({ legality: 2, feasibility: 2, resilience: 2 }, { legality: 4, feasibility: 4, resilience: 4 }) };
  };
  const v = await judge("task-x", CIVS, { swap: true, eventLog: mockLog(), _runJudge: fakeRunJudge });
  const tang = v.scores.find((s) => s.regime === "china/tang");
  const qin = v.scores.find((s) => s.regime === "china/qin");
  // pass 1: tang 4.0 avg → 10; pass 2: tang 2.0 avg → 5 → mean 7.5
  assert.ok(Math.abs(tang.score - 7.5) < 0.001);
  assert.ok(Math.abs(qin.score - 7.5) < 0.001);
  assert.deepEqual(tang.dims, { legality: 3, feasibility: 3, resilience: 3 });
});

test("swap disabled (CIVAGENT_JUDGE_SWAP=0 semantics) calls the judge once", async () => {
  let calls = 0;
  const log = mockLog();
  const fakeRunJudge = () => { calls++; return { provider: "codex", output: jsonOutput({ legality: 3, feasibility: 3, resilience: 3 }, { legality: 1, feasibility: 1, resilience: 1 }) }; };
  const v = await judge("task-x", CIVS, { swap: false, eventLog: log, _runJudge: fakeRunJudge });
  assert.equal(calls, 1, "single pass when swap is off");
  assert.equal(v.passes, 1);
  assert.equal(v.swap, false);
  const judgeEvents = log.events.filter((e) => e.type === "judge");
  assert.equal(judgeEvents.length, 1);
  assert.equal(judgeEvents[0].swapped, false);
});

test("judge falls back to the legacy markdown table parser", async () => {
  const md = `| Rank | Civilization | Score /10 | Reason |
|---|---|---|---|
| 1 | china/tang | 9.0 | decisive |
| 2 | china/qin | 7.0 | harsh |`;
  const fakeRunJudge = () => ({ provider: "codex", output: md });
  const v = await judge("task-x", CIVS, { swap: false, eventLog: mockLog(), _runJudge: fakeRunJudge });
  assert.equal(v.scores.length, 2);
  assert.equal(v.scores[0].regime, "china/tang");
  assert.ok(Math.abs(v.scores[0].score - 9.0) < 0.001);
  assert.equal(v.scores[0].dims, undefined, "no rubric dims from legacy output");
});

test("judge unavailable → provider null, empty scores, error event recorded", async () => {
  const log = mockLog();
  const fakeRunJudge = () => { throw new Error("all judge providers failed"); };
  const v = await judge("task-x", CIVS, { swap: true, eventLog: log, _runJudge: fakeRunJudge });
  assert.equal(v.provider, null);
  assert.deepEqual(v.scores, []);
  assert.ok(v.md.includes("judge unavailable"));
  const judgeEvents = log.events.filter((e) => e.type === "judge");
  assert.equal(judgeEvents.length, 1, "stops after the first failed pass");
  assert.match(judgeEvents[0].error, /all judge providers failed/);
});
