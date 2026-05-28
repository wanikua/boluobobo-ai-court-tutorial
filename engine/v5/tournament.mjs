#!/usr/bin/env node
// tournament.mjs — run one governance task against N civilizations in parallel,
// collect each civ's event stream, and have a judge rank the outcomes.
//
// Concurrency: each civ is launched as its own `run-v5.mjs` process with an
// explicitly-passed regime, backend, and match id. There is NO shared mutable
// "active regime" state, so parallel civs cannot clobber each other.
//
// Civ syntax: "region/regime-id" or "region/regime-id#backend"
//   e.g. --civs china/tang,china/qin#cn:doubao,global/athens#cn:glm

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateRegime } from "./civ-memory.mjs";
import { runJudge } from "./judge.mjs";
import { readMatchText, eventsPath } from "./events.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const RUN_V5 = path.join(__dirname, "run-v5.mjs");
const TOURNAMENTS_DIR = path.join(os.homedir(), ".civagent", "tournaments");

const JUDGE_PROMPT = `You are the judge of a CivAgent governance tournament.
Each civilization received the same task and produced a transcript of how its
governance system responded. Rank them on:
  - legality (did they respect their own rules?)
  - feasibility (are the actions executable?)
  - resilience (would this survive second-order effects?)

Output ONLY a markdown table with columns: Rank | Civilization | Score /10 | One-line reason.
Then one paragraph: "## Verdict" explaining the top choice.`;

function newTournamentId() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 23); // ms precision
  return `${stamp}-${Math.random().toString(36).slice(2, 6)}`;
}

// Parse "regime" or "regime#backend" into { regime, backend }.
export function parseCiv(token) {
  const [regimeRaw, backend = "native"] = String(token).split("#");
  const regime = validateRegime(regimeRaw.trim());
  return { regime, backend: backend.trim() || "native" };
}

// Pure: build the exact child spec used to launch one civ. Exported so tests can
// prove we invoke run-v5 directly (not `civagent switch`) and that each civ gets
// a distinct match id + isolated env.
export function civSpawnSpec({ regime, backend, matchId, runV5 = RUN_V5 }) {
  return {
    command: "node",
    args: [runV5, "--backend", backend, regime],
    env: { CIVAGENT_MATCH_ID: matchId },
  };
}

function civMatchId(regime, tournamentId) {
  return `${tournamentId}__${regime.replace(/\//g, "-")}`;
}

function runCiv({ regime, backend }, task, tournamentId, outDir) {
  const matchId = civMatchId(regime, tournamentId);
  const spec = civSpawnSpec({ regime, backend, matchId });
  return new Promise((resolve) => {
    const logFile = path.join(outDir, `${regime.replace(/\//g, "-")}.log`);
    const out = fs.createWriteStream(logFile);
    const proc = spawn(spec.command, [...spec.args, task], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...spec.env },
    });
    proc.stdout.pipe(out, { end: false });
    proc.stderr.pipe(out, { end: false });
    proc.on("close", (code) => {
      out.end();
      resolve({ regime, backend, matchId, code, logFile });
    });
  });
}

async function judge(task, civResults) {
  const sections = civResults
    .map((r) => {
      // Prefer the structured event stream; fall back to the raw process log.
      const text =
        readMatchText(r.matchId, 6000) ||
        (fs.existsSync(r.logFile) ? fs.readFileSync(r.logFile, "utf8").slice(-6000) : "(no output)");
      return `### ${r.regime} (backend ${r.backend}, exit ${r.code})\n\n\`\`\`\n${text}\n\`\`\``;
    })
    .join("\n\n---\n\n");

  const prompt = `${JUDGE_PROMPT}\n\n## Task\n${task}\n\n## Civilization Transcripts\n\n${sections}`;
  try {
    const r = runJudge(prompt);
    return {
      provider: r.provider,
      md: `# Tournament — ${new Date().toISOString()}\n\n**Task:** ${task}\n**Judge:** ${r.provider}\n\n${r.output}`,
    };
  } catch (e) {
    return {
      provider: null,
      md:
        `# Tournament Result — judge unavailable\n\n${e.message}\n\n` +
        `Raw civ exit codes:\n${civResults.map((c) => `- ${c.regime} (${c.backend}): ${c.code}`).join("\n")}`,
    };
  }
}

export async function runTournament({ civs, task }) {
  if (!civs.length || !task) throw new Error("need --civs and a task");
  const parsed = civs.map(parseCiv);

  const id = newTournamentId();
  const outDir = path.join(TOURNAMENTS_DIR, id);
  fs.mkdirSync(outDir, { recursive: true });

  console.error(`[tournament] ${id}  civs=${parsed.map((c) => c.regime).join(",")}  out=${outDir}`);
  const results = await Promise.all(parsed.map((c) => runCiv(c, task, id, outDir)));

  const verdict = await judge(task, results);
  const resultFile = path.join(outDir, "result.md");
  fs.writeFileSync(resultFile, verdict.md);

  // Manifest is the frontend's entry point into a tournament.
  const manifest = {
    id,
    task,
    createdAt: Date.now(),
    civs: results.map((r) => ({
      regime: r.regime,
      backend: r.backend,
      matchId: r.matchId,
      exitCode: r.code,
      events: eventsPath(r.matchId),
    })),
    judge: { provider: verdict.provider, resultPath: resultFile },
  };
  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log(`\n==== Tournament ${id} ====`);
  console.log(verdict.md);
  return { id, resultFile, results, manifest };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  let civs = [];
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--civs" && args[i + 1]) {
      civs = args[++i].split(",").map((s) => s.trim()).filter(Boolean);
    } else {
      rest.push(args[i]);
    }
  }
  const task = rest.join(" ").trim();
  runTournament({ civs, task }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
