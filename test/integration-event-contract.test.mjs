// integration-event-contract.test.mjs
// Fake-backend integration tests — verifies the v5 event contract
// (events.jsonl, meta.json, tournament manifest.json) without requiring
// real model CLIs (claude, codex, opencode, etc.).
//
// Strategy: create a temp dir containing a fake `claude` script that prints
// a few lines and exits 0. Spawn run-v5.mjs / tournament.mjs with that dir
// prepended to PATH. Since skill-sediment uses hasBinary("codex") before
// calling codex, and no codex is available, sedimentation gracefully skips.

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
const MATCHES_DIR = path.join(os.homedir(), ".civagent", "matches");
const TOURNAMENTS_DIR = path.join(os.homedir(), ".civagent", "tournaments");

// ── helpers ──────────────────────────────────────────────────────────────────

// Create a temp dir containing a fake `claude` that prints two lines and exits 0.
function makeFakeBin() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "civagent-fake-"));
  const fakeClaude = path.join(dir, "claude");
  fs.writeFileSync(
    fakeClaude,
    "#!/bin/sh\necho 'fake-output line one'\necho 'fake-output line two'\nexit 0\n"
  );
  fs.chmodSync(fakeClaude, 0o755);
  return dir;
}

// Spawn a command and collect stdout/stderr; resolves with { code, out, err }.
// Rejects if the process fails to start.
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

// ── parseJudgeScores unit test ────────────────────────────────────────────────

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

// ── buildSkillEvent unit test ─────────────────────────────────────────────────

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

// ── integration: run-v5 event stream ─────────────────────────────────────────

test(
  "run-v5 emits match_start, turn, skill, and match_end events via fake backend",
  { timeout: 50_000 },
  async () => {
    const tmpBin = makeFakeBin();
    const matchId = `test-r3-run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const env = {
      ...process.env,
      PATH: `${tmpBin}:${process.env.PATH}`,
      CIVAGENT_MATCH_ID: matchId,
    };

    try {
      const { code } = await spawnAwait(
        "node",
        [RUN_V5, "--backend", "native", "china/tang", "r3-integration-task"],
        env
      );

      const eventsFile = path.join(MATCHES_DIR, matchId, "events.jsonl");
      assert.ok(fs.existsSync(eventsFile), `events.jsonl must exist: ${eventsFile}`);

      const events = readJsonl(eventsFile);
      const types = events.map((e) => e.type);

      // Required envelope fields on every event
      for (const ev of events) {
        assert.equal(typeof ev.matchId, "string", `matchId must be string in: ${JSON.stringify(ev)}`);
        assert.equal(typeof ev.seq, "number", `seq must be number`);
        assert.equal(typeof ev.ts, "number", `ts must be number`);
        assert.ok(ev.ts > 0, "ts must be positive");
        assert.ok(ev.matchId === matchId, `all events must reference the right matchId`);
      }

      // match_start exists with regime/backend fields
      const startEv = events.find((e) => e.type === "match_start");
      assert.ok(startEv, "must have match_start");
      assert.equal(startEv.regime, "china/tang");
      assert.equal(startEv.backend, "native");

      // At least one turn event (fake claude printed two lines)
      assert.ok(types.includes("turn"), "must have at least one turn event");

      // skill event exists with valid status
      const skillEv = events.find((e) => e.type === "skill");
      assert.ok(skillEv, "must have a skill event");
      assert.ok(
        ["saved", "rejected", "skipped", "error"].includes(skillEv.status),
        `skill.status must be one of saved/rejected/skipped/error, got: ${skillEv.status}`
      );

      // match_end is the FINAL event (frontend stops reading on it)
      assert.ok(types.includes("match_end"), "must have match_end");
      assert.equal(
        types[types.length - 1],
        "match_end",
        `match_end must be the last event; order was: ${types.join(", ")}`
      );

      // meta.json exists with required fields
      const metaFile = path.join(MATCHES_DIR, matchId, "meta.json");
      assert.ok(fs.existsSync(metaFile), "meta.json must exist");
      const meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
      assert.equal(meta.matchId, matchId);
      assert.equal(meta.regime, "china/tang");
      assert.equal(typeof meta.startedAt, "number", "meta.startedAt must be number");
      assert.equal(typeof meta.endedAt, "number", "meta.endedAt must be number");
      assert.ok(meta.endedAt >= meta.startedAt, "endedAt >= startedAt");
      assert.ok(["done", "failed"].includes(meta.status), `meta.status must be done|failed, got ${meta.status}`);
    } finally {
      rmrf(path.join(MATCHES_DIR, matchId));
      rmrf(tmpBin);
    }
  }
);

// ── integration: concurrent civs — no shared active-regime state ──────────────

test(
  "concurrent civs produce isolated event streams (no shared active-regime state)",
  { timeout: 60_000 },
  async () => {
    const tmpBin = makeFakeBin();
    const ts = Date.now();
    const suffix = Math.random().toString(36).slice(2, 6);
    const idA = `test-r3-concA-${ts}-${suffix}`;
    const idB = `test-r3-concB-${ts}-${suffix}`;

    const baseEnv = { ...process.env, PATH: `${tmpBin}:${process.env.PATH}` };

    try {
      const [resA, resB] = await Promise.all([
        spawnAwait("node", [RUN_V5, "--backend", "native", "china/tang", "civ-a-task"], {
          ...baseEnv, CIVAGENT_MATCH_ID: idA,
        }),
        spawnAwait("node", [RUN_V5, "--backend", "native", "china/qin", "civ-b-task"], {
          ...baseEnv, CIVAGENT_MATCH_ID: idB,
        }),
      ]);

      const evFileA = path.join(MATCHES_DIR, idA, "events.jsonl");
      const evFileB = path.join(MATCHES_DIR, idB, "events.jsonl");
      assert.ok(fs.existsSync(evFileA), "civ-A events.jsonl must exist");
      assert.ok(fs.existsSync(evFileB), "civ-B events.jsonl must exist");

      const eventsA = readJsonl(evFileA);
      const eventsB = readJsonl(evFileB);

      // All events reference the correct matchId — no cross-contamination
      assert.ok(
        eventsA.every((e) => e.matchId === idA),
        "all events in A must reference match id A"
      );
      assert.ok(
        eventsB.every((e) => e.matchId === idB),
        "all events in B must reference match id B"
      );

      // The regimes are distinct — no state bleed
      const startA = eventsA.find((e) => e.type === "match_start");
      const startB = eventsB.find((e) => e.type === "match_start");
      assert.ok(startA, "civ-A must have match_start");
      assert.ok(startB, "civ-B must have match_start");
      assert.equal(startA.regime, "china/tang");
      assert.equal(startB.regime, "china/qin");
      assert.notEqual(startA.regime, startB.regime, "regimes must differ");

      // Both metas are independent
      const metaA = JSON.parse(fs.readFileSync(path.join(MATCHES_DIR, idA, "meta.json"), "utf8"));
      const metaB = JSON.parse(fs.readFileSync(path.join(MATCHES_DIR, idB, "meta.json"), "utf8"));
      assert.equal(metaA.matchId, idA);
      assert.equal(metaB.matchId, idB);
      assert.notEqual(metaA.regime, metaB.regime);
    } finally {
      rmrf(path.join(MATCHES_DIR, idA));
      rmrf(path.join(MATCHES_DIR, idB));
      rmrf(tmpBin);
    }
  }
);

// ── integration: tournament manifest structure ────────────────────────────────

test(
  "tournament writes manifest.json with required structured judge fields",
  { timeout: 90_000 },
  async () => {
    const tmpBin = makeFakeBin();
    const taskStr = "r3-manifest-structure-test";
    const env = { ...process.env, PATH: `${tmpBin}:${process.env.PATH}` };

    let tournamentId;
    try {
      const { code, out, err } = await spawnAwait(
        "node",
        [TOURNAMENT_MJS, "--civs", "china/tang,china/qin", taskStr],
        env,
        85_000
      );

      // Tournament logs its id to stderr: "[tournament] <id>  civs=..."
      const combined = out + err;
      const idMatch = combined.match(/\[tournament\]\s+(\S+)\s/);
      assert.ok(idMatch, `should log tournament ID; stderr was:\n${err.slice(0, 1000)}`);
      tournamentId = idMatch[1];

      const manifestFile = path.join(TOURNAMENTS_DIR, tournamentId, "manifest.json");
      assert.ok(fs.existsSync(manifestFile), `manifest.json must exist at ${manifestFile}`);

      const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));

      // Top-level fields
      assert.equal(typeof manifest.id, "string", "manifest.id must be string");
      assert.equal(manifest.task, taskStr, "manifest.task must match");
      assert.equal(typeof manifest.createdAt, "number", "manifest.createdAt must be number");
      assert.ok(Array.isArray(manifest.civs), "manifest.civs must be array");
      assert.equal(manifest.civs.length, 2, "must have 2 civs");

      // Each civ entry
      for (const civ of manifest.civs) {
        assert.equal(typeof civ.regime, "string", "civ.regime must be string");
        assert.equal(typeof civ.matchId, "string", "civ.matchId must be string");
        assert.equal(typeof civ.backend, "string", "civ.backend must be string");
        assert.equal(typeof civ.events, "string", "civ.events must be a file path");
      }

      // Civs have distinct matchIds — no shared active-regime state
      assert.notEqual(
        manifest.civs[0].matchId,
        manifest.civs[1].matchId,
        "each civ must get its own matchId"
      );

      // Judge section — required structured fields
      assert.equal(typeof manifest.judge, "object", "manifest.judge must be object");
      assert.equal(typeof manifest.judge.resultPath, "string", "judge.resultPath must be string");
      assert.ok(Array.isArray(manifest.judge.scores), "judge.scores must be array");
      // topRegime is string or null
      const tr = manifest.judge.topRegime;
      assert.ok(
        tr === null || typeof tr === "string",
        `judge.topRegime must be string|null, got ${JSON.stringify(tr)}`
      );
      // provider is string or null (null when no judge is available)
      const p = manifest.judge.provider;
      assert.ok(
        p === null || typeof p === "string",
        `judge.provider must be string|null, got ${JSON.stringify(p)}`
      );

      // result.md exists alongside manifest
      assert.ok(
        fs.existsSync(manifest.judge.resultPath),
        `result.md must exist at ${manifest.judge.resultPath}`
      );
    } finally {
      if (tournamentId) rmrf(path.join(TOURNAMENTS_DIR, tournamentId));
      rmrf(tmpBin);
    }
  }
);
