// backends.mjs — resolve a civilization's execution backend to a runnable command.
//
// CivAgent civ coordinators run on a Claude-Code-compatible CLI: either `claude`
// itself or one of the cn-cc forks (cc-doubao, cc-glm, ...), which accept the same
// `--agents` / `-p` flags. Evaluation/review engines (codex, opencode) are NOT civ
// backends — they live in judge.mjs.
//
// HARD RULE: gemini is never a valid backend (project policy). It is rejected
// explicitly so a stale team config can't silently route a civilization to it.

// Backend id (as used in team config / --backend) → claude-compatible binary.
export const BACKEND_COMMANDS = {
  native: "claude",
  claude: "claude",
  "cc-opus": "claude",
  "cc-sonnet": "claude",
  "cn:doubao": "cc-doubao",
  "cn:qwen": "cc-qwen",
  "cn:kimi": "cc-kimi",
  "cn:glm": "cc-glm",
  "cn:stepfun": "cc-stepfun",
  "cn:minimax": "cc-minimax",
  "cn:mimo": "cc-mimo",
};

// Tools that exist but are NOT compatible with the `claude --agents` invocation
// run-v5 uses. Rejected with a specific, actionable message instead of a silent
// fallback to `claude` (which would make a misconfiguration invisible).
const INCOMPATIBLE = {
  codex:
    "codex is a code/eval engine, not a Claude-Code-compatible civ backend; use it as a judge (engine/v5/judge.mjs), not as --backend",
  opencode:
    "opencode is a review engine, not a civ backend; use it as a judge, not as --backend",
};

const FORBIDDEN = {
  gemini:
    "gemini is disabled by project policy and is never a valid backend or judge",
};

// Resolve a backend id to its command. Throws (fail-fast) on forbidden,
// incompatible, or unknown backends — never silently degrades to `claude`.
export function resolveBackend(idRaw) {
  const id = String(idRaw ?? "native").trim() || "native";
  const key = id.toLowerCase();
  if (key in FORBIDDEN) throw new Error(`forbidden backend "${id}": ${FORBIDDEN[key]}`);
  if (key in INCOMPATIBLE) throw new Error(`unsupported backend "${id}": ${INCOMPATIBLE[key]}`);
  const cmd = BACKEND_COMMANDS[id] ?? BACKEND_COMMANDS[key];
  if (!cmd) {
    throw new Error(
      `unknown backend "${id}"; known: ${Object.keys(BACKEND_COMMANDS).join(", ")}`,
    );
  }
  return cmd;
}

export function isKnownBackend(id) {
  try {
    resolveBackend(id);
    return true;
  } catch {
    return false;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const id = process.argv[2];
  if (!id) {
    console.error("usage: backends.mjs <backend-id>");
    process.exit(1);
  }
  console.log(resolveBackend(id));
}
