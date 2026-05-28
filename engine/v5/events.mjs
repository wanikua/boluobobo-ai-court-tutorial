// events.mjs — structured per-match event log + metadata.
//
// This is the stable contract the frontend (antigravity) consumes. A match writes
// JSONL events to ~/.civagent/matches/<matchId>/events.jsonl and a meta.json
// summary. See schemas/match-event.schema.json for the line format.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export const ROOT = path.join(os.homedir(), ".civagent");

export const EVENT_TYPES = ["match_start", "turn", "tool", "judge", "skill", "match_end"];

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
  }

  emit(type, fields = {}) {
    if (!EVENT_TYPES.includes(type)) throw new Error(`unknown event type: ${type}`);
    const ev = { matchId: this.matchId, seq: this.seq++, ts: Date.now(), type, ...fields };
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
