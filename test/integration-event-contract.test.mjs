// integration-event-contract.test.mjs
// Fake-backend integration tests — verifies the v5 event contract
// (events.jsonl, meta.json, tournament manifest.json) without requiring
// real model CLIs (claude, codex, opencode, etc.).
//
// Isolation guarantee:
//   • Each test creates a fresh temp HOME dir so all ~/.civagent writes go to
//     an OS-temp location and never touch the user's real CivAgent state.
//   • Each test creates a temp bin dir populated with fake executables that
//     shadow every real CLI (claude, codex, opencode, cc-glm).  Real binaries
//     are never reachable from within the spawned child processes.
//   • Both dirs are deleted in finally blocks regardless of pass/fail.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const RUN_V5 = path.join(PROJECT_ROOT, "engine/v5/run-v5.mjs");
const TOURNAMENT_MJS = path.join(PROJECT_ROOT, "engine/v5/tournament.mjs");

// ── helpers ──────────────────────────────────────────────────────────────────

function writeExe(dir, name, content) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, content);
  fs.chmodSync(p, 0o755);
}

// Create a temp bin dir with fake executables for every CLI the engine may call:
//   claude  — prints >200 chars of deterministic output and exits 0.
//   codex   — outputs a judge table (for tournament) + APPROVE (for audit).
//             "NO_PATTERN" causes skill-sediment to skip extraction gracefully.
//   opencode — exits 1 (never used by engine; here for safety shadow).
//   cc-glm   — exits 1 (fallback judge; here so PATH lookup fails fast).
function makeFakeBin() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "civagent-fakebin-"));

  writeExe(dir, "claude", [
    "#!/bin/sh",
    // Two long lines — combined length >200 chars to pass skill-sediment's
    // minimum transcript length guard.
    "echo 'fake-output line one — deterministic output from the fake test backend, long enough to pass the minimum transcript length check for CivAgent skill sedimentation pipeline.'",
    "echo 'fake-output line two — second deterministic line from the fake governance model, providing additional fake transcript content for the CivAgent integration test suite.'",
    "exit 0",
  ].join("\n") + "\n");

  // Single script that serves three call sites:
  //   extraction  — "NO_PATTERN" causes sediment to skip (no skill saved).
  //   judging     — the markdown table is parsed by parseJudgeScores.
  //   auditing    — "APPROVE" satisfies the auditor check (but extraction
  //                 already skipped, so audit is never actually reached).
  // Quoted heredoc delimiter ('CIVAGENT_FAKE_END') prevents shell variable
  // expansion inside the body.
  writeExe(dir, "codex", [
    "#!/bin/sh",
    "cat <<'CIVAGENT_FAKE_END'",
    "NO_PATTERN",
    "",
    "| Rank | Civilization | Score /10 | Reason |",
    "|------|-------------|-----------|--------|",
    "| 1 | tang | 9.0 | decisive governance |",
    "| 2 | qin  | 7.0 | efficient but harsh |",
    "",
    "## Verdict",
    "tang leads with institutional breadth.",
    "APPROVE",
    "CIVAGENT_FAKE_END",
    "exit 0",
  ].join("\n") + "\n");

  writeExe(dir, "opencode", "#!/bin/sh\nexit 1\n");
  writeExe(dir, "cc-glm",   "#!/bin/sh\nexit 1\n");

  return dir;
}

// Build an isolated child env: fake bin first in PATH, HOME pointed at a
// temp dir, and all CIVAGENT_* / XDG_* vars cleared so child processes
// start fresh.  extras overrides any key afterwards.
function makeChildEnv(fakeBin, tempHome, extras = {}) {
  const env = { ...process.env };
  // Strip env vars that would bleed into child or pollute HOME resolution.
  for (const k of [
    "CIVAGENT_MATCH_ID",
    "CIVAGENT_BACKEND",
    "XDG_CONFIG_HOME",
    "XDG_DATA_HOME",
    "XDG_CACHE_HOME",
  ]) {
    delete env[k];
  }
  env.HOME = tempHome;
  env.PATH = `${fakeBin}:${process.env.PATH}`;
  return Object.assign(env, extras);
}

// Spawn a command and collect stdout/stderr; resolves with { code, out, err }.
function spawnAwait(cmd, args, env, timeoutMs = 45_000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { env, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`spawn timed out after ${timeoutMs}ms: ${cmd} ${args.join(" ")}`));
    }, timeoutMs);
    proc.stdout.on("data", (d) => { out += d; });
    proc.stderr.on("data", (d) => { err += d; });
    proc.on("error", (e) => { clearTimeout(timer); reject(e); });
    proc.on("close", (code) => { clearTimeout(timer); resolve({ code, out, err }); });
  });
}

function readJsonl(filePath) {
  return fs.readFileSync(filePath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function rmrf(p) {
  try { fs.rmSync(p, { recursive: true, force: true }); } catch { /* ignore */ }
}

// ── parseJudgeScores unit tests ───────────────────────────────────────────────

import { parseJudgeScores } from "../engine/v5/tournament.mjs";

test("parseJudgeScores extracts scores from a standard Rank|Regime|Score table", () => {
  const output = `
| Rank | Civilization | Score /10 | Reason |
|------|-------------|-----------|--------|
| 1    | china/tang  | 9.0       | strong deliberation |
| 2    | china/qin   | 7.5       | effective but harsh |
| 3    | global/athens | 6.0    | democratic but slow |

## Verdict
Tang wins.
`;
  const scores = parseJudgeScores(output, ["china/tang", "china/qin", "global/athens"]);
  assert.equal(scores.length, 3);
  assert.equal(scores[0].regime, "china/tang");
  assert.ok(Math.abs(scores[0].score - 9.0) < 0.001);
  assert.equal(scores[1].regime, "china/qin");
  assert.ok(Math.abs(scores[1].score - 7.5) < 0.001);
  assert.equal(scores[2].regime, "global/athens");
});

test("parseJudgeScores returns [] on unparseable or empty output", () => {
  assert.deepEqual(parseJudgeScores("", ["china/tang"]), []);
  assert.deepEqual(parseJudgeScores(null, ["china/tang"]), []);
  assert.deepEqual(parseJudgeScores("## Verdict\nno table here", ["china/tang"]), []);
});

test("parseJudgeScores sorts descending by score", () => {
  const output = `
| 1 | china/qin  | 8.0 | good |
| 2 | china/tang | 9.5 | better |
`;
  const scores = parseJudgeScores(output, ["china/tang", "china/qin"]);
  assert.equal(scores[0].regime, "china/tang");
  assert.equal(scores[1].regime, "china/qin");
});

test("parseJudgeScores matches by slug when full regime not in cell", () => {
  const output = `| 1 | tang | 8.0 | great |`;
  const scores = parseJudgeScores(output, ["china/tang"]);
  assert.equal(scores.length, 1);
  assert.equal(scores[0].regime, "china/tang");
});

test("parseJudgeScores deduplicates — keeps first occurrence", () => {
  const output = `
| 1 | china/tang | 9.0 | first |
| 2 | china/tang | 5.0 | duplicate |
| 3 | china/qin  | 7.0 | other |
`;
  const scores = parseJudgeScores(output, ["china/tang", "china/qin"]);
  assert.equal(scores.length, 2);
  // After sort desc, tang (9.0) comes first; duplicate (5.0) is dropped
  assert.equal(scores[0].regime, "china/tang");
  assert.ok(Math.abs(scores[0].score - 9.0) < 0.001);
});

// ── buildSkillEvent unit tests ─────────────────────────────────────────────────

import { buildSkillEvent } from "../engine/v5/run-v5.mjs";

test("buildSkillEvent maps saved result correctly", () => {
  const ev = buildSkillEvent({ saved: "/some/skill.md", auditedBy: "codex" });
  assert.deepEqual(ev, { status: "saved", skillPath: "/some/skill.md", auditedBy: "codex" });
});

test("buildSkillEvent maps rejected result correctly", () => {
  const ev = buildSkillEvent({ rejected: "too generic", auditedBy: "opencode-reviewer" });
  assert.deepEqual(ev, { status: "rejected", reason: "too generic", auditedBy: "opencode-reviewer" });
});

test("buildSkillEvent maps skipped result correctly", () => {
  const ev = buildSkillEvent({ skipped: "no pattern" });
  assert.deepEqual(ev, { status: "skipped", reason: "no pattern" });
});

test("buildSkillEvent maps error result correctly", () => {
  const ev = buildSkillEvent({ error: "codex ENOENT" });
  assert.deepEqual(ev, { status: "error", reason: "codex ENOENT" });
});

test("buildSkillEvent returns null for empty/null input", () => {
  assert.equal(buildSkillEvent(null), null);
  assert.equal(buildSkillEvent({}), null);
  assert.equal(buildSkillEvent(undefined), null);
});

test("buildSkillEvent truncates reason at 200 chars", () => {
  const longMsg = "x".repeat(300);
  const ev = buildSkillEvent({ skipped: longMsg });
  assert.equal(ev.reason.length, 200);
});

test("buildSkillEvent saved: auditedBy defaults to null when absent", () => {
  const ev = buildSkillEvent({ saved: "/skill.md" });
  assert.equal(ev.status, "saved");
  assert.equal(ev.auditedBy, null);
});

// ── integration: run-v5 event stream ─────────────────────────────────────────

test(
  "run-v5 emits match_start, turn, skill, and match_end events via fake backend",
  { timeout: 50_000 },
  async () => {
    const fakeBin  = makeFakeBin();
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "civagent-home-"));
    const matchId  = `test-r3-run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const env = makeChildEnv(fakeBin, tempHome, { CIVAGENT_MATCH_ID: matchId });
    // Paths are derived from the isolated tempHome, not os.homedir().
    const matchDir  = path.join(tempHome, ".civagent", "matches", matchId);

    try {
      await spawnAwait(
        "node",
        [RUN_V5, "--backend", "native", "china/tang", "r3-integration-task"],
        env
      );

      const eventsFile = path.join(matchDir, "events.jsonl");
      assert.ok(fs.existsSync(eventsFile), `events.jsonl must exist: ${eventsFile}`);

      const events = readJsonl(eventsFile);
      const types  = events.map((e) => e.type);

      // Every event must carry the required envelope fields.
      for (const ev of events) {
        assert.equal(typeof ev.matchId, "string",  `matchId must be string in: ${JSON.stringify(ev)}`);
        assert.equal(typeof ev.seq,     "number",  "seq must be number");
        assert.equal(typeof ev.ts,      "number",  "ts must be number");
        assert.ok(ev.ts > 0,                       "ts must be positive");
        assert.equal(ev.matchId, matchId,          "all events must reference the right matchId");
      }

      // match_start with regime/backend fields.
      const startEv = events.find((e) => e.type === "match_start");
      assert.ok(startEv,                        "must have match_start");
      assert.equal(startEv.regime,  "china/tang");
      assert.equal(startEv.backend, "native");

      // At least one turn event (fake claude prints two lines).
      assert.ok(types.includes("turn"),          "must have at least one turn event");

      // Skill event with a valid status enum value.
      const skillEv = events.find((e) => e.type === "skill");
      assert.ok(skillEv,                         "must have a skill event");
      assert.ok(
        ["saved", "rejected", "skipped", "error"].includes(skillEv.status),
        `skill.status must be one of saved/rejected/skipped/error, got: ${skillEv.status}`
      );

      // match_end must be the FINAL event.
      assert.ok(types.includes("match_end"),     "must have match_end");
      assert.equal(
        types[types.length - 1],
        "match_end",
        `match_end must be the last event; order was: ${types.join(", ")}`
      );

      // meta.json with required fields.
      const metaFile = path.join(matchDir, "meta.json");
      assert.ok(fs.existsSync(metaFile),         "meta.json must exist");
      const meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
      assert.equal(meta.matchId,         matchId);
      assert.equal(meta.regime,          "china/tang");
      assert.equal(typeof meta.startedAt, "number", "meta.startedAt must be number");
      assert.equal(typeof meta.endedAt,   "number", "meta.endedAt must be number");
      assert.ok(meta.endedAt >= meta.startedAt,   "endedAt >= startedAt");
      assert.ok(
        ["done", "failed"].includes(meta.status),
        `meta.status must be done|failed, got ${meta.status}`
      );
    } finally {
      rmrf(tempHome);
      rmrf(fakeBin);
    }
  }
);

// ── integration: concurrent civs — no shared active-regime state ──────────────

test(
  "concurrent civs produce isolated event streams (no shared active-regime state)",
  { timeout: 60_000 },
  async () => {
    const fakeBin  = makeFakeBin();
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "civagent-home-"));
    const ts     = Date.now();
    const suffix = Math.random().toString(36).slice(2, 6);
    const idA    = `test-r3-concA-${ts}-${suffix}`;
    const idB    = `test-r3-concB-${ts}-${suffix}`;

    const baseEnv = makeChildEnv(fakeBin, tempHome);

    try {
      await Promise.all([
        spawnAwait("node", [RUN_V5, "--backend", "native", "china/tang", "civ-a-task"], {
          ...baseEnv, CIVAGENT_MATCH_ID: idA,
        }),
        spawnAwait("node", [RUN_V5, "--backend", "native", "china/qin", "civ-b-task"], {
          ...baseEnv, CIVAGENT_MATCH_ID: idB,
        }),
      ]);

      const matchesBase = path.join(tempHome, ".civagent", "matches");
      const evFileA = path.join(matchesBase, idA, "events.jsonl");
      const evFileB = path.join(matchesBase, idB, "events.jsonl");
      assert.ok(fs.existsSync(evFileA), "civ-A events.jsonl must exist");
      assert.ok(fs.existsSync(evFileB), "civ-B events.jsonl must exist");

      const eventsA = readJsonl(evFileA);
      const eventsB = readJsonl(evFileB);

      // No cross-contamination: every event in A references matchId A (and vice versa).
      assert.ok(
        eventsA.every((e) => e.matchId === idA),
        "all events in A must reference match id A"
      );
      assert.ok(
        eventsB.every((e) => e.matchId === idB),
        "all events in B must reference match id B"
      );

      // The regimes are distinct — no state bleed between concurrent civs.
      const startA = eventsA.find((e) => e.type === "match_start");
      const startB = eventsB.find((e) => e.type === "match_start");
      assert.ok(startA, "civ-A must have match_start");
      assert.ok(startB, "civ-B must have match_start");
      assert.equal(startA.regime,  "china/tang");
      assert.equal(startB.regime,  "china/qin");
      assert.notEqual(startA.regime, startB.regime, "regimes must differ");

      // Both meta.json files are independent (different matchIds and regimes).
      const metaA = JSON.parse(
        fs.readFileSync(path.join(matchesBase, idA, "meta.json"), "utf8")
      );
      const metaB = JSON.parse(
        fs.readFileSync(path.join(matchesBase, idB, "meta.json"), "utf8")
      );
      assert.equal(metaA.matchId, idA);
      assert.equal(metaB.matchId, idB);
      assert.notEqual(metaA.regime, metaB.regime);
    } finally {
      rmrf(tempHome);
      rmrf(fakeBin);
    }
  }
);

// ── integration: tournament manifest structure ────────────────────────────────

test(
  "tournament writes manifest.json with required structured judge fields",
  { timeout: 90_000 },
  async () => {
    const fakeBin  = makeFakeBin();
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "civagent-home-"));
    const taskStr  = "r3-manifest-structure-test";
    const env      = makeChildEnv(fakeBin, tempHome);

    let tournamentId;
    try {
      const { out, err } = await spawnAwait(
        "node",
        [TOURNAMENT_MJS, "--civs", "china/tang,china/qin", taskStr],
        env,
        85_000
      );

      // tournament.mjs logs its id to stderr: "[tournament] <id>  civs=..."
      const combined = out + err;
      const idMatch  = combined.match(/\[tournament\]\s+(\S+)\s/);
      assert.ok(idMatch, `should log tournament ID; combined output:\n${combined.slice(0, 1000)}`);
      tournamentId = idMatch[1];

      const tourDir      = path.join(tempHome, ".civagent", "tournaments", tournamentId);
      const manifestFile = path.join(tourDir, "manifest.json");
      assert.ok(fs.existsSync(manifestFile), `manifest.json must exist at ${manifestFile}`);

      const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));

      // ── top-level fields ──
      assert.equal(typeof manifest.id,        "string", "manifest.id must be string");
      assert.equal(manifest.task,              taskStr,  "manifest.task must match");
      assert.equal(typeof manifest.createdAt, "number", "manifest.createdAt must be number");
      assert.ok(Array.isArray(manifest.civs),            "manifest.civs must be array");
      assert.equal(manifest.civs.length, 2,              "must have 2 civs");

      // ── per-civ entries ──
      for (const civ of manifest.civs) {
        assert.equal(typeof civ.regime,  "string", "civ.regime must be string");
        assert.equal(typeof civ.matchId, "string", "civ.matchId must be string");
        assert.equal(typeof civ.backend, "string", "civ.backend must be string");
        assert.equal(typeof civ.events,  "string", "civ.events must be a file path");
      }

      // Each civ gets its own matchId — no shared active-regime state.
      assert.notEqual(
        manifest.civs[0].matchId,
        manifest.civs[1].matchId,
        "each civ must get its own matchId"
      );

      // ── judge section — structured fields ──
      const j = manifest.judge;
      assert.equal(typeof j,             "object", "manifest.judge must be object");
      assert.equal(typeof j.resultPath,  "string", "judge.resultPath must be string");
      assert.ok(Array.isArray(j.scores),            "judge.scores must be array");
      assert.ok(
        j.topRegime === null || typeof j.topRegime === "string",
        `judge.topRegime must be string|null, got ${JSON.stringify(j.topRegime)}`
      );
      assert.ok(
        j.provider === null || typeof j.provider === "string",
        `judge.provider must be string|null, got ${JSON.stringify(j.provider)}`
      );

      // ── deterministic judge assertions (fake codex outputs a fixed table) ──
      // Fake codex outputs tang=9.0, qin=7.0 — so provider must be "codex"
      // and scores must parse correctly.
      assert.equal(j.provider, "codex",
        `expected provider=codex (fake bin), got ${j.provider}`);
      assert.equal(j.scores.length, 2,
        `expected 2 scores from fake judge table, got ${j.scores.length}`);
      assert.equal(j.scores[0].regime, "china/tang",
        `expected tang to rank first (score 9.0), got ${j.scores[0].regime}`);
      assert.ok(Math.abs(j.scores[0].score - 9.0) < 0.001,
        `expected tang score 9.0, got ${j.scores[0].score}`);
      assert.equal(j.scores[1].regime, "china/qin",
        `expected qin to rank second (score 7.0), got ${j.scores[1].regime}`);
      assert.ok(Math.abs(j.scores[1].score - 7.0) < 0.001,
        `expected qin score 7.0, got ${j.scores[1].score}`);
      assert.equal(j.topRegime, "china/tang",
        `expected topRegime=china/tang, got ${j.topRegime}`);

      // result.md must exist alongside manifest.
      assert.ok(
        fs.existsSync(j.resultPath),
        `result.md must exist at ${j.resultPath}`
      );
    } finally {
      rmrf(tempHome);
      rmrf(fakeBin);
    }
  }
);

// ── integration: civSpawnSpec contract ───────────────────────────────────────

import { civSpawnSpec, parseCiv } from "../engine/v5/tournament.mjs";

test("civSpawnSpec invokes run-v5 directly — not civagent switch", () => {
  const spec = civSpawnSpec({ regime: "china/tang", backend: "native", matchId: "m-001" });
  assert.equal(spec.command, "node",           "must use node as command");
  assert.ok(spec.args[0].endsWith("run-v5.mjs"), "first arg must be run-v5.mjs");
  assert.ok(spec.args.includes("--backend"),   "must pass --backend");
  assert.ok(spec.args.includes("native"),      "must pass backend value");
  assert.ok(spec.args.includes("china/tang"),  "must pass regime");
  // Critically: no 'switch' anywhere in the args.
  assert.ok(!spec.args.some((a) => a === "switch"), "must NOT call civagent switch");
});

test("civSpawnSpec sets CIVAGENT_MATCH_ID in env — each civ gets distinct id", () => {
  const specA = civSpawnSpec({ regime: "china/tang", backend: "native", matchId: "m-A" });
  const specB = civSpawnSpec({ regime: "china/qin",  backend: "native", matchId: "m-B" });
  assert.equal(specA.env.CIVAGENT_MATCH_ID, "m-A");
  assert.equal(specB.env.CIVAGENT_MATCH_ID, "m-B");
  assert.notEqual(specA.env.CIVAGENT_MATCH_ID, specB.env.CIVAGENT_MATCH_ID);
});

test("parseCiv parses regime#backend token correctly", () => {
  const { regime, backend } = parseCiv("china/tang#cn:doubao");
  assert.equal(regime,  "china/tang");
  assert.equal(backend, "cn:doubao");
});

test("parseCiv defaults backend to native when omitted", () => {
  const { regime, backend } = parseCiv("china/tang");
  assert.equal(regime,  "china/tang");
  assert.equal(backend, "native");
});
