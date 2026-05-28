#!/usr/bin/env node
// run-v5.mjs — CivAgent v5 entry: backend routing + isolated civ HOME + structured
// event stream + skill sedimentation.
//
// Usage: run-v5.mjs [--backend <id>] <region/regime-id> [prompt...]
//   --backend  Claude-Code-compatible backend (native, cn:doubao, cn:glm, ...).
//              Defaults to $CIVAGENT_BACKEND or "native". See engine/v5/backends.mjs.

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ensureCivHome, validateRegime } from "./civ-memory.mjs";
import { sediment } from "./skill-sediment.mjs";
import { resolveBackend } from "./backends.mjs";
import { EventLog, writeMeta, eventsPath } from "./events.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function newMatchId() {
  const d = new Date();
  const stamp = d.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${stamp}-${Math.random().toString(36).slice(2, 6)}`;
}

// Pure arg parser (exported for tests): pulls --backend out of argv, leaving the
// regime + prompt. Backend precedence: --backend flag > $CIVAGENT_BACKEND > native.
export function parseArgs(argv, env = process.env) {
  let backend = env.CIVAGENT_BACKEND || "native";
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--backend" && argv[i + 1] != null) {
      backend = argv[++i];
    } else {
      rest.push(argv[i]);
    }
  }
  const [regimeRaw, ...promptParts] = rest;
  return { backend, regimeRaw, prompt: promptParts.join(" ").trim() };
}

async function main() {
  const { backend, regimeRaw, prompt } = parseArgs(process.argv.slice(2));
  if (!regimeRaw) {
    console.error("usage: run-v5.mjs [--backend <id>] <region/regime-id> [prompt...]");
    process.exit(1);
  }
  const regime = validateRegime(regimeRaw);

  // Fail-fast on a bad/forbidden backend rather than silently running `claude`.
  let command;
  try {
    command = resolveBackend(backend);
  } catch (e) {
    console.error(`[v5] ${e.message}`);
    process.exit(2);
  }

  const regimeDir = path.join(PROJECT_ROOT, "regimes", regime);
  if (!fs.existsSync(regimeDir)) {
    console.error(`regime not found: ${regimeDir}`);
    process.exit(1);
  }

  // Honor an externally-assigned match id (the tournament uses this to correlate
  // its civs); otherwise mint our own.
  const matchId = process.env.CIVAGENT_MATCH_ID || newMatchId();
  const home = ensureCivHome(regime, regimeDir);
  const log = new EventLog(matchId);
  const startedAt = Date.now();

  console.error(`[v5] regime=${regime} backend=${backend} command=${command} match=${matchId}`);
  console.error(`[v5] HOME=${home}`);
  console.error(`[v5] events=${eventsPath(matchId)}`);

  writeMeta(matchId, { regime, backend, command, task: prompt, startedAt, status: "running" });
  log.emit("match_start", { regime, backend, command, task: prompt });

  // Generate agent definitions via v4's converter, piped to CC's --agents.
  const agentsJson = await new Promise((resolve, reject) => {
    const p = spawn("node", [path.join(PROJECT_ROOT, "engine", "regime-to-cc.mjs"), regimeDir], {
      stdio: ["ignore", "pipe", "inherit"],
    });
    let out = "";
    p.stdout.on("data", (d) => {
      out += d;
    });
    p.on("close", (c) => (c === 0 ? resolve(out) : reject(new Error(`regime-to-cc exited ${c}`))));
  });

  // Isolate XDG paths too — some CC builds read config from XDG_CONFIG_HOME
  // independently of HOME, which would leak the outer user's state.
  const env = {
    ...process.env,
    HOME: home,
    XDG_CONFIG_HOME: path.join(home, ".config"),
    XDG_DATA_HOME: path.join(home, ".local", "share"),
    XDG_CACHE_HOME: path.join(home, ".cache"),
    CIVAGENT_MATCH_ID: matchId,
    CIVAGENT_BACKEND: backend,
  };
  fs.mkdirSync(env.XDG_CONFIG_HOME, { recursive: true });
  const ccArgs = ["--agents", agentsJson];
  if (prompt) ccArgs.push("-p", prompt);

  const cc = spawn(command, ccArgs, { env, stdio: ["inherit", "pipe", "inherit"] });
  cc.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
    log.emit("turn", { text: chunk.toString() });
  });

  let exitCode;
  try {
    exitCode = await new Promise((res, rej) => {
      cc.on("error", rej);
      cc.on("close", res);
    });
  } catch (err) {
    // Binary not found or failed to spawn (e.g. ENOENT).
    console.error(`[v5] backend spawn failed: ${err.message}`);
    log.emit("match_end", { exitCode: null, error: err.message });
    await log.close();
    writeMeta(matchId, { endedAt: Date.now(), exitCode: null, status: "failed", error: err.message });
    process.exit(2);
  }
  log.emit("match_end", { exitCode });
  await log.close();

  console.error(`[v5] backend exited ${exitCode}, running skill sedimentation...`);
  const skillsDir = path.join(regimeDir, "skills");
  let sedimentResult;
  try {
    sedimentResult = await sediment({
      matchId,
      regime,
      regimeDir,
      transcriptPath: eventsPath(matchId),
      existingSkillsDir: skillsDir,
    });
    console.error(`[v5] sediment:`, JSON.stringify(sedimentResult));
  } catch (e) {
    sedimentResult = { error: e.message };
    console.error(`[v5] sediment failed: ${e.message}`);
  }

  writeMeta(matchId, { endedAt: Date.now(), exitCode, status: "done", sediment: sedimentResult });
  process.exit(exitCode ?? 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
