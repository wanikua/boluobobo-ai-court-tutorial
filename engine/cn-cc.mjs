// cn-cc.mjs — CivAgent's explicit dependency on cn-cc-workflow.
//
// CivAgent's `cn:*` civ backends (cn:doubao, cn:glm, ...) are NOT implemented
// here — they are the `cc-*` launchers provided by the cn-cc-workflow project,
// which CivAgent uses as its multi-agent EXECUTION ENGINE. CivAgent stays the
// orchestration / regime / dashboard layer on top.
//
//   cn-cc-workflow: https://github.com/LeoLin990405/cn-cc-workflow
//   contract:       <that repo>/docs/INTEGRATIONS.md
//
// This module makes the dependency explicit and checkable (instead of failing
// late inside a spawned cc-* process).
import { execSync } from "node:child_process";
import { BACKEND_COMMANDS } from "./v5/backends.mjs";

export const CN_CC_REPO = "https://github.com/LeoLin990405/cn-cc-workflow";
export const CN_CC_INSTALL =
  `git clone ${CN_CC_REPO} && cd cn-cc-workflow && ./backends/install.sh  # keys in ~/.config/cc-model-secrets.env`;

// Every backend id whose command is a cn-cc `cc-*` launcher.
export const CN_CC_BACKENDS = Object.fromEntries(
  Object.entries(BACKEND_COMMANDS).filter(([, cmd]) => cmd.startsWith("cc-")),
);

function onPath(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Verify the cn-cc-workflow launchers this CivAgent install relies on are present.
// Returns { ok, present[], missing[], repo, install } — never throws.
export function checkCnCc() {
  const present = [];
  const missing = [];
  for (const [id, cmd] of Object.entries(CN_CC_BACKENDS)) {
    (onPath(cmd) ? present : missing).push({ id, cmd });
  }
  return {
    ok: missing.length === 0,
    present,
    missing,
    repo: CN_CC_REPO,
    install: CN_CC_INSTALL,
  };
}
