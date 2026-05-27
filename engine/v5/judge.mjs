// judge.mjs — pluggable evaluation/review provider for CivAgent.
//
// Used by tournament.mjs (rank civilizations) and skill-sediment.mjs (audit a
// proposed learned skill). Provides retry + provider fallback so a single flaky
// engine doesn't sink the whole pipeline.
//
// HARD RULE: gemini is NEVER a provider here (project policy). It is absent from
// the table AND filtered out of any caller-supplied chain, so it cannot be
// reintroduced by accident or by a stale config.

import { spawnSync } from "node:child_process";

// id → how to invoke it. Prompt is always passed as the final positional arg so
// callers don't have to worry about stdin plumbing.
export const JUDGE_PROVIDERS = {
  codex: { cmd: "codex", args: (prompt) => ["exec", "--skip-git-repo-check", prompt] },
  "opencode-reviewer": { cmd: "opencode", args: (prompt) => ["run", "--agent", "reviewer", prompt] },
  "cn-glm": { cmd: "cc-glm", args: (prompt) => ["-p", prompt] },
};

// Default order: codex (strongest reasoner) → opencode reviewer → glm fork.
export const DEFAULT_JUDGE_CHAIN = ["codex", "opencode-reviewer", "cn-glm"];

export function hasBinary(cmd, _spawn = spawnSync) {
  return _spawn("which", [cmd], { stdio: "ignore" }).status === 0;
}

// Resolve an ordered, gemini-free, de-duplicated, known-only provider chain.
export function resolveJudgeChain(preferred = DEFAULT_JUDGE_CHAIN) {
  const seen = new Set();
  const chain = [];
  for (const idRaw of preferred) {
    const id = String(idRaw);
    if (id.toLowerCase() === "gemini") continue; // hard rule: never gemini
    if (!JUDGE_PROVIDERS[id] || seen.has(id)) continue;
    seen.add(id);
    chain.push(id);
  }
  return chain;
}

// Run the first available provider in the chain, retrying each `retries` times
// before falling through to the next. Returns { provider, attempt, output }.
// Throws only if every provider is unavailable or fails.
export function runJudge(prompt, {
  providers = DEFAULT_JUDGE_CHAIN,
  timeout = 300_000,
  retries = 1,
  _spawn = spawnSync,
  _has = hasBinary,
} = {}) {
  const resolved = resolveJudgeChain(providers);
  const available = resolved.filter((id) => _has(JUDGE_PROVIDERS[id].cmd, _spawn));
  if (available.length === 0) {
    throw new Error(
      `no judge provider available (chain: ${resolved.join(", ") || "none"}); ` +
        `gemini is disabled by policy`,
    );
  }
  const errors = [];
  for (const id of available) {
    const { cmd, args } = JUDGE_PROVIDERS[id];
    for (let attempt = 0; attempt <= retries; attempt++) {
      const r = _spawn(cmd, args(prompt), { encoding: "utf8", timeout, env: process.env });
      if (r.status === 0 && r.stdout != null) {
        return { provider: id, attempt, output: String(r.stdout).trim() };
      }
      errors.push(`${id}#${attempt}: ${r.stderr?.toString().trim() || r.error?.message || `exit ${r.status}`}`);
    }
  }
  throw new Error(`all judge providers failed:\n${errors.join("\n")}`);
}
