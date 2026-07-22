// events.mjs — structured per-match event log + metadata.
//
// This is the stable contract the frontend (antigravity) consumes. A match writes
// JSONL events to ~/.civagent/matches/<matchId>/events.jsonl and a meta.json
// summary. See schemas/match-event.schema.json for the line format.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

export const ROOT = path.join(os.homedir(), ".civagent");

export const EVENT_TYPES = ["match_start", "turn", "tool", "judge", "skill", "match_end"];

// ── OTel-style envelope (schema v2) ─────────────────────────────────────────
// Added back-compatibly: every event keeps its legacy fields (matchId, seq, ts,
// type, ...) and additionally carries a trace/span envelope so event streams can
// be correlated across matches, judges, and skill sedimentation.
export const SCHEMA_VERSION = "2.0";

// Fine-grained kind per legacy coarse type. Coexists with `type`; consumers that
// only know `type` are unaffected.
export const KIND_BY_TYPE = {
  match_start: "match_start",
  turn: "turn",
  tool: "tool_call",
  judge: "judge_score",
  skill: "skill_commit",
  match_end: "match_end",
};

// Default producer per type when the emitter doesn't pass an explicit actor.
const DEFAULT_ACTOR_BY_TYPE = {
  judge: "judge",
  skill: "skill-learner",
  match_end: "system",
};

// sha256 of `input`, truncated to 16 hex chars (64 bits) — enough to detect
// prompt/payload drift without storing the full digest.
export function hashShort(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex").slice(0, 16);
}

// 16 hex chars, mirroring OTel span-id width.
export function newSpanId() {
  return crypto.randomBytes(8).toString("hex");
}

export function matchDir(matchId) {
  const dir = path.join(ROOT, "matches", String(matchId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function eventsPath(matchId) {
  return path.join(matchDir(matchId), "events.jsonl");
}

export function metaPath(matchId) {
  return path.join(matchDir(matchId), "meta.json");
}

// Append-only JSONL writer with a monotonic seq per match.
export class EventLog {
  constructor(matchId) {
    this.matchId = String(matchId);
    this.path = eventsPath(this.matchId);
    this.stream = fs.createWriteStream(this.path, { flags: "a" });
    this.seq = 0;
    // Root span of this trace; match_start adopts it, all other events default
    // to being its children unless the caller passes an explicit parent.
    this.rootSpanId = newSpanId();
  }

  emit(type, fields = {}) {
    if (!EVENT_TYPES.includes(type)) throw new Error(`unknown event type: ${type}`);
    const isRoot = type === "match_start";
    // Hash only the caller-supplied payload (the type-specific fields), not the
    // envelope itself.
    const payload_hash = hashShort(JSON.stringify(fields));
    const ev = {
      // legacy fields — untouched contract
      matchId: this.matchId,
      seq: this.seq++,
      ts: Date.now(),
      type,
      // OTel-style envelope (schema v2, all additive)
      event_id: crypto.randomUUID(),
      schema_version: SCHEMA_VERSION,
      trace_id: this.matchId,
      span_id: fields.span_id || (isRoot ? this.rootSpanId : newSpanId()),
      parent_span_id: fields.parent_span_id ?? (isRoot ? null : this.rootSpanId),
      actor: fields.actor || DEFAULT_ACTOR_BY_TYPE[type] || "system",
      kind: fields.kind || KIND_BY_TYPE[type] || type,
      payload_hash,
      // Optional observability fields, passed through when the caller has them:
      // model, model_version, prompt_hash, tokens, cost — spread below.
      ...fields,
    };
    this.stream.write(JSON.stringify(ev) + "\n");
    return ev;
  }

  close() {
    return new Promise((resolve) => this.stream.end(resolve));
  }
}

// Merge-write meta.json (so partial updates across a match accumulate).
export function writeMeta(matchId, meta) {
  const p = metaPath(matchId);
  let existing = {};
  try {
    existing = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    /* first write */
  }
  const merged = { matchId: String(matchId), ...existing, ...meta };
  fs.writeFileSync(p, JSON.stringify(merged, null, 2));
  return p;
}

// Reconstruct the trailing conversation text from an events.jsonl file
// (concatenated `turn` texts). Used by the judge and skill sedimentation.
export function readMatchText(matchId, maxChars = Infinity) {
  const p = eventsPath(matchId);
  if (!fs.existsSync(p)) return "";
  const out = [];
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    if (!line) continue;
    try {
      const ev = JSON.parse(line);
      if (ev.type === "turn" && typeof ev.text === "string") out.push(ev.text);
    } catch {
      /* tolerate a torn final line */
    }
  }
  const text = out.join("");
  return maxChars === Infinity ? text : text.slice(-maxChars);
}
