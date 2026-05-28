#!/usr/bin/env node

/**
 * regime-to-cc.mjs — Convert a CivAgent regime to Claude Code --agents JSON
 *
 * Reads metadata.json + IDENTITY.md + SOUL.md from a regime directory
 * and generates a CC-compatible agents definition.
 */

import fs from "node:fs";
import path from "node:path";

// Historical metadata used non-canonical pattern names. Normalize to the 6
// mode files under engine/modes/ so template references resolve correctly.
const PATTERN_ALIASES = {
  "centralized-hierarchy": "centralized",
  "democratic-council": "democratic",
  "federated-autonomy": "federation",
  "dual-power": "dual-track",
};
function normalizePattern(p) {
  return PATTERN_ALIASES[p] || p || "centralized";
}

const ROLE_MODEL_MAP = {
  coordinator:  { model: "sonnet",  role: "coordinator" },
  engineering:  { model: "opus",    role: "engineering" },
  review:       { model: "opus",    role: "review" },
  research:     { model: "opus",    role: "research" },
  data:         { model: "sonnet",  role: "data" },
  devops:       { model: "sonnet",  role: "devops" },
  content:      { model: "sonnet",  role: "content" },
  legal:        { model: "sonnet",  role: "legal" },
  management:   { model: "sonnet",  role: "management" },
};

// Map Chinese role keywords to functional roles
const ROLE_KEYWORDS = {
  "调度": "coordinator", "总管": "coordinator", "司礼监": "coordinator",
  "编码": "engineering", "开发": "engineering", "工程": "engineering", "兵部": "engineering",
  "审查": "review", "监察": "review", "都察院": "review",
  "研究": "research", "文档": "research", "翰林": "research",
  "财务": "data", "数据": "data", "分析": "data", "户部": "data",
  "运维": "devops", "部署": "devops", "工部": "devops",
  "营销": "content", "内容": "content", "品牌": "content", "礼部": "content",
  "法务": "legal", "合规": "legal", "刑部": "legal",
  "项目": "management", "管理": "management", "吏部": "management",
  // English keywords
  "engineer": "engineering", "code": "engineering", "develop": "engineering",
  "review": "review", "audit": "review", "inspect": "review",
  "research": "research", "document": "research", "scholar": "research",
  "finance": "data", "treasury": "data", "data": "data",
  "ops": "devops", "deploy": "devops", "infrastructure": "devops",
  "marketing": "content", "content": "content", "brand": "content",
  "legal": "legal", "law": "legal", "compliance": "legal",
  "manage": "management", "project": "management", "coordinate": "management",
  "command": "coordinator", "dispatch": "coordinator", "emperor": "coordinator",
};

function detectRole(agentDef) {
  const text = `${agentDef.name || ""} ${agentDef.id || ""} ${agentDef.identity?.theme || ""} ${agentDef.description || ""}`.toLowerCase();
  for (const [keyword, role] of Object.entries(ROLE_KEYWORDS)) {
    if (text.includes(keyword)) return role;
  }
  return "content"; // default to lightweight role
}

function parseIdentityTable(identityMd) {
  // Parse the role mapping table from IDENTITY.md
  const lines = identityMd.split("\n");
  const agents = [];
  let inTable = false;

  for (const line of lines) {
    if (line.includes("Agent ID") || line.includes("agent_id")) {
      inTable = true;
      continue;
    }
    if (inTable && line.startsWith("|")) {
      const cells = line.split("|").map(c => c.trim()).filter(Boolean);
      if (cells.length >= 3 && !cells[0].startsWith("-")) {
        const historicalRole = cells[0];
        const agentId = cells[1].replace(/`/g, "");
        const aiRole = cells[2];
        const modelHint = cells[3] || "";
        agents.push({ historicalRole, agentId, aiRole, modelHint });
      }
    } else if (inTable && !line.startsWith("|") && line.trim()) {
      inTable = false;
    }
  }
  return agents;
}

export function convertRegime(regimeDir) {
  const metadataPath = path.join(regimeDir, "metadata.json");
  const identityPath = path.join(regimeDir, "IDENTITY.md");
  const soulPath = path.join(regimeDir, "SOUL.md");

  if (!fs.existsSync(metadataPath)) {
    throw new Error(`No metadata.json in ${regimeDir}`);
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  const identity = fs.existsSync(identityPath) ? fs.readFileSync(identityPath, "utf8") : "";
  const soul = fs.existsSync(soulPath) ? fs.readFileSync(soulPath, "utf8") : "";

  // Try to parse agent table from IDENTITY.md
  const tableAgents = parseIdentityTable(identity);

  // Also check openclaw.json.template for agent definitions
  const oclawPath = path.join(regimeDir, "openclaw.json.template");
  let oclawAgents = [];
  if (fs.existsSync(oclawPath)) {
    try {
      const oclaw = JSON.parse(fs.readFileSync(oclawPath, "utf8"));
      oclawAgents = oclaw.agents?.list || [];
    } catch { /* ignore parse errors in templates */ }
  }

  // v5.1: IDENTITY.md canonical role mapping is the source of truth.
  // openclaw.json.template remains only as a legacy fallback for regimes that
  // haven't been rewritten yet (should be zero after the L-stage PR).
  const sourceAgents = tableAgents.length > 0 ? tableAgents : oclawAgents;
  const ccAgents = {};

  for (const agent of sourceAgents) {
    const id = agent.agentId || agent.id;
    const name = agent.historicalRole || agent.name || id;
    const description = agent.aiRole || agent.identity?.theme || agent.description || "";
    const role = agent.id ? detectRole(agent) : detectFunctionalRole(agent.aiRole || "");
    const modelConfig = ROLE_MODEL_MAP[role] || ROLE_MODEL_MAP.content;

    ccAgents[id] = {
      description: `[${metadata.name?.zh || metadata.id}] ${name} — ${description}`.slice(0, 200),
      prompt: buildAgentPrompt(metadata, soul, name, description, role),
      model: modelConfig.model,
    };
  }

  // Generate system prompt for CLAUDE.md
  const claudeMd = buildClaudeMd(metadata, soul, identity);

  return {
    metadata,
    agents: ccAgents,
    claudeMd,
    orchestrationPattern: metadata.orchestrationPattern || "centralized-hierarchy",
  };
}

function detectFunctionalRole(aiRole) {
  const text = aiRole.toLowerCase();
  for (const [keyword, role] of Object.entries(ROLE_KEYWORDS)) {
    if (text.includes(keyword)) return role;
  }
  return "content";
}

function buildAgentPrompt(metadata, soul, name, description, role) {
  const regime = metadata.name?.zh || metadata.id;
  const era = metadata.era?.zh || "";
  const system = metadata.system?.zh || "";

  return `You are ${name} in the ${regime} (${era}) governance system.
System: ${system}

Your role: ${description}

${soul}

---
Respond in the language the user uses. Be concise and professional.
When your task is complete, report results clearly.
If a task is outside your jurisdiction, say so and suggest the appropriate agent.`;
}

function buildClaudeMd(metadata, soul, identity) {
  const regime = metadata.name?.zh || metadata.id;
  const regimeEn = metadata.name?.en || metadata.id;
  const era = metadata.era?.zh || "";
  const system = metadata.system?.zh || "";
  const pattern = normalizePattern(metadata.orchestrationPattern);

  return `# CivAgent v4 — ${regime} (${regimeEn})

> ${era} | ${system} | Mode: ${pattern}

## Active Regime

${metadata.description?.zh || ""}

## Behavioral Rules (SOUL)

${soul}

## Organization (IDENTITY)

${identity}

## Orchestration

This regime uses the **${pattern}** orchestration pattern.
Refer to engine/modes/${pattern}.md for execution flow.

## Multi-Model Routing

- Strong tasks (engineering, review, research): Claude Opus / Codex
- Fast tasks (content, management, devops): Claude Sonnet / CN models
- SQL / data: cn:qwen (via cn-cc plugin)
- Long documents: cn:kimi / cn:mimo (1M ctx)
- Math / logic: cn:stepfun
- Code review: codex:review or codex:adversarial-review
`;
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith("regime-to-cc.mjs")) {
  const regimeDir = process.argv[2];
  if (!regimeDir) {
    console.error("Usage: node regime-to-cc.mjs <regime-dir> [--agents|--claude-md]");
    process.exit(1);
  }

  const outputMode = process.argv[3] || "--agents";
  const result = convertRegime(path.resolve(regimeDir));

  if (outputMode === "--claude-md") {
    console.log(result.claudeMd);
  } else if (outputMode === "--agents") {
    console.log(JSON.stringify(result.agents, null, 2));
  } else if (outputMode === "--all") {
    console.log(JSON.stringify(result, null, 2));
  }
}
