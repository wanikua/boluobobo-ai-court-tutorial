// events-envelope.test.mjs — unit tests for the OTel-style event envelope
// (schema v2) added on top of the legacy match-event contract.
//
// Pure helpers (hashShort, newSpanId, KIND_BY_TYPE) are tested in-process.
// EventLog.emit is exercised in a child process with HOME pointed at a temp
// dir so no real ~/.civagent state is touched.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { hashShort, newSpanId, KIND_BY_TYPE, SCHEMA_VERSION, EVENT_TYPES } from "../engine/v5/events.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVENTS_MJS = path.join(__dirname, "..", "engine", "v5", "events.mjs");

test("hashShort returns deterministic 16-hex sha256 prefix", () => {
  const h = hashShort("hello judge prompt");
  assert.match(h, /^[0-9a-f]{16}$/);
  assert.equal(hashShort("hello judge prompt"), h, "same input → same hash");
  assert.notEqual(hashShort("hello judge prompt!"), h, "different input → different hash");
});

test("newSpanId returns unique 16-hex ids", () => {
  const a = newSpanId();
  const b = newSpanId();
  assert.match(a, /^[0-9a-f]{16}$/);
  assert.notEqual(a, b);
});

test("KIND_BY_TYPE maps every legacy type to a fine-grained kind", () => {
  for (const t of EVENT_TYPES) {
    assert.ok(KIND_BY_TYPE[t], `kind mapping missing for type ${t}`);
  }
  assert.equal(KIND_BY_TYPE.judge, "judge_score");
  assert.equal(KIND_BY_TYPE.skill, "skill_commit");
  assert.equal(KIND_BY_TYPE.turn, "turn");
  assert.equal(KIND_BY_TYPE.tool, "tool_call");
});

test("EventLog emits the full v2 envelope with a consistent trace", { timeout: 30_000 }, async () => {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "civagent-envelope-"));
  const matchId = `envelope-unit-${Date.now()}`;
  const script = `
    import { EventLog } from ${JSON.stringify(`file://${EVENTS_MJS}`)};
    const log = new EventLog(${JSON.stringify(matchId)});
    const start = log.emit("match_start", { regime: "china/tang", actor: "china/tang" });
    const turn  = log.emit("turn", { text: "hello", actor: "china/tang" });
    const judge = log.emit("judge", { provider: "codex", prompt_hash: "abc123" });
    const end   = log.emit("match_end", { exitCode: 0 });
    await log.close();
    console.log(JSON.stringify({ events: [start, turn, judge, end], path: log.path }));
  `;
  try {
    const { code, out, err } = await new Promise((resolve, reject) => {
      const proc = spawn("node", ["--input-type=module", "-e", script], {
        env: { ...process.env, HOME: tempHome },
        stdio: ["ignore", "pipe", "pipe"],
      });
      let out = "", err = "";
      proc.stdout.on("data", (d) => { out += d; });
      proc.stderr.on("data", (d) => { err += d; });
      proc.on("error", reject);
      proc.on("close", (code) => resolve({ code, out, err }));
    });
    assert.equal(code, 0, `child must exit 0; stderr: ${err}`);
    const { events, path: evPath } = JSON.parse(out.trim());
    assert.equal(events.length, 4);

    const start = events[0];
    for (const ev of events) {
      // Envelope presence
      assert.match(ev.event_id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/, "event_id must be a UUID");
      assert.equal(ev.schema_version, SCHEMA_VERSION);
      assert.equal(ev.trace_id, matchId, "trace_id must equal the match id");
      assert.match(ev.span_id, /^[0-9a-f]{16}$/, "span_id must be 16 hex chars");
      assert.match(ev.payload_hash, /^[0-9a-f]{16}$/, "payload_hash must be 16 hex chars");
      // Legacy contract untouched
      assert.equal(ev.matchId, matchId);
      assert.equal(typeof ev.seq, "number");
      assert.equal(typeof ev.ts, "number");
      assert.ok(EVENT_TYPES.includes(ev.type));
    }
    // Unique ids per event
    assert.equal(new Set(events.map((e) => e.event_id)).size, 4);
    assert.equal(new Set(events.map((e) => e.span_id)).size, 4);

    // Trace topology: match_start is the root, the rest are its children.
    assert.equal(start.parent_span_id, null, "match_start must be the trace root");
    for (const ev of events.slice(1)) {
      assert.equal(ev.parent_span_id, start.span_id, `${ev.type} must be a child of match_start`);
    }

    // kind coexists with type
    assert.equal(start.kind, "match_start");
    assert.equal(events[1].kind, "turn");
    assert.equal(events[2].kind, "judge_score");
    assert.equal(events[3].kind, "match_end");

    // actor defaults + explicit actor
    assert.equal(start.actor, "china/tang");
    assert.equal(events[2].actor, "judge", "judge events default to actor=judge");
    assert.equal(events[2].prompt_hash, "abc123", "explicit prompt_hash passes through");
    assert.equal(events[3].actor, "system", "match_end defaults to actor=system");

    // The on-disk JSONL matches the returned events.
    const lines = fs.readFileSync(evPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    assert.equal(lines.length, 4);
    assert.deepEqual(lines.map((l) => l.event_id), events.map((e) => e.event_id));
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
});
