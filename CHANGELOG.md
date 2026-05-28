# 📜 Changelog

## v5.2.0 (unreleased) — R3 Engine Event Contract 📡

Event contract hardening (Round 3). Focus: structured skill events in the match stream and structured judge fields in the tournament manifest, verified by fake-backend integration tests.

### Changed
- **Skill events now emitted inside the match stream** (`engine/v5/run-v5.mjs`) — sedimentation runs *before* `match_end` so the `skill` event lands in `events.jsonl` with `{ status: saved|rejected|skipped|error, skillPath?, auditedBy?, reason? }`. Frontend can read skill outcome without polling `meta.json`.
- **`match_end` is guaranteed to be the final event** — the ordering contract (`match_start → turns → skill → match_end`) is now enforced and tested.
- **Tournament manifest `judge` field is now structured** (`engine/v5/tournament.mjs`) — adds `scores: [{regime, score}]` sorted descending, and `topRegime: string|null`, extracted from the judge's markdown table. `provider` and `resultPath` are preserved. Frontend no longer has to re-parse `result.md` to show a leaderboard.
- **Backend omitted from judge section header** — judge sees `### china/tang (exit 0)` not `(backend native, exit 0)`, preventing backend identity from leaking into a blind evaluation.

### Added
- **`parseJudgeScores(output, civRegimes)`** (exported from `tournament.mjs`) — lenient markdown-table parser; handles exact regime match, slug match, and returns `[]` gracefully on unparseable output.
- **`buildSkillEvent(result)`** (exported from `run-v5.mjs`) — converts a `sediment()` result into the skill event payload; truncates `reason` at 200 chars.
- **`schemas/match-event.schema.json`** — `skill` event now has defined properties: `status` (enum), `skillPath`, `auditedBy`, `reason`. Added a `skill` example event.
- **`test/integration-event-contract.test.mjs`** — 13 new tests (32 → 45): fake-backend spawning of `run-v5` and `tournament`, concurrent-civ isolation proof, `parseJudgeScores` unit tests, `buildSkillEvent` unit tests.

---

## v5.1.0 (unreleased) — R1 Engine Robustness 🔧

Backend robustness pass (iteration plan: [ITERATION_PLAN.md](./ITERATION_PLAN.md), Round 1). Focus: correctness, concurrency safety, and removing the hard external dependency on Gemini.

### Fixed
- **Tournament concurrency (P0)** — parallel civilizations previously shared a single global `~/.civagent/.active-regime` file (`switch` then `run`), so racing civs could all run as the same regime. `tournament.mjs` now spawns `run-v5.mjs` directly with an explicit regime + backend + match id per civ. No shared mutable state. (`engine/v5/tournament.mjs`)
- **Gemini removed end-to-end (P0)** — Gemini was hard-coded as the tournament judge and the skill auditor, and was a civ backend in the team config. All paths now route through `engine/v5/judge.mjs`, which excludes Gemini structurally (it is filtered out of any provider chain). Generated CLAUDE.md, orchestration mode docs, and `providers.json` scrubbed too.
- **Skill audit ordering** — cheap deterministic guards (injection + frontmatter) now run *before* spending an audit call; the auditor prefers a different engine than the extractor (codex) to avoid self-endorsement.

### Added
- **`engine/v5/backends.mjs`** — pluggable civ backend routing (`--backend`): maps `native`/`cn:*` ids to Claude-Code-compatible binaries. Fails fast on forbidden (gemini), incompatible (codex/opencode), or unknown backends instead of silently falling back to `claude`. Wires the previously-inert per-civ backend config into `run-v5.mjs`.
- **`engine/v5/judge.mjs`** — evaluation/review provider with retry + fallback (codex → opencode reviewer → cc-glm). Never Gemini.
- **`engine/v5/events.mjs` + `schemas/match-event.schema.json`** — structured per-match event stream (`~/.civagent/matches/<id>/events.jsonl` + `meta.json`) and tournament `manifest.json`. This is the stable contract the frontend consumes.
- **Tests** — 9 → 32: backend routing, judge provider selection + gemini-exclusion guarantee, tournament spawn contract (proves no global `switch`), `run-v5` arg parsing. `skill-sediment` test now imports the real helpers instead of hand-copied regexes.

### Notes
- Civ backends are Claude-Code-compatible CLIs only (`claude`, `cc-*`). Codex/opencode are judges, not civ backends; the team config's `civ-rome` "codex" backend is an Agent-Team delegation hint, not a `run-v5` backend.

---

## v5.0.1 (2026-04-14) — Engine Data Source Fix 🩹

### Critical fix
- **engine/regime-to-cc.mjs**: The v4 engine preferred `openclaw.json.template` (legacy) over `IDENTITY.md`. This made the L-stage canonical rewrite of all 57 regimes (v5.0.0) have zero effect on actual agent generation — every regime produced v4 default agents.

### Effect
After this one-line flip (PR #7), every civilization's Agent Team authentically reflects its historical governance:
- **tang**: emperor → zhongshu-sheren (中书舍人, Tang drafter) → 6 ministries (replaced anachronistic 司礼监)
- **byzantine**: basileus, patriarch, logothete-dromos/genikon, domestikos, eparch, protoasecretis
- **roman-republic**: consul-a/b (双头制), senate, tribune, praetor, censor, quaestor, aedile
- **soviet**: gensec, politburo, gosplan, kgb, pravda, army, supreme
- ... and 53 more

All 57 verified to generate ≥5 agents from the canonical role mapping table.

---

## v5.0.0 (2026-04-14) — Learning Loop 🧠

Inspired by [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent). CivAgent gains a **cross-match learning loop**: civilizations now accumulate governance skills as they play.

### New
- **Civilization memory isolation** — each regime runs in its own `~/.civagent/envs/<region>-<id>/` with isolated `HOME` + `XDG_*` paths. No cross-contamination between civs.
- **Automatic skill sedimentation** — after each match, `codex` extracts reusable governance patterns from the transcript, `gemini` audits them for shape/quality, and approved skills are written to `regimes/<civ>/skills/learned-<date>-<topic>-<matchId>.md` for use in future matches.
- **Prompt-injection guard** on learned skills — rejects patterns containing role-redirection tokens, jailbreak strings, or missing frontmatter. Each skill file carries a provenance banner.
- **New CLI**: `civagent run --v5`, `civagent skills <regime>`, `civagent match-log`, `civagent tournament`.
- **Tournament mode** — spawn 4 civilizations against the same task in parallel, auto-judge governance quality.
- **package.json + unit tests + CI** — `npm test`, GitHub Actions pipeline on PR.

### Design notes
- v5 is fully opt-in via `--v5` flag; v4 behavior preserved.
- Three independent AI review passes (Codex → Gemini → Kimi) shaped the final design. See [docs/V5-DESIGN.md](./docs/V5-DESIGN.md).

### Limitations documented
- Compressing a governance system to one agent's `SOUL.md` is lossy; multi-department sub-agent splits are a v5.2 candidate.
- `regimes/` has no time-dimension; anachronistic comparisons are a feature, not a bug.

---

## v3.5.2 (2026-03-13)

### Bug 修复
- **H-01** `install.sh` — nvm/volta/fnm 环境下不再使用 sudo 安装全局 npm 包，避免系统 npm 与用户 npm 路径冲突
- **H-05** `gui/server/index.js` — `/api/health` 中 wss/sseClients/metricsBuffer 引用改为 optional chaining，消除死代码风险
- **H-06** `openclaw.example.json` — `$HOME/clawd` 替换为 `/home/YOUR_USERNAME/clawd` 占位符，JSON 不再依赖 shell 变量展开
- **H-07** `install.sh` — heredoc 中 `$HOME` 增加空值保护（`${HOME:-/root}`）及空格路径警告
- **H-09** `gui/server/index.js` — `countSessionFile` 从同步 readSync 改为异步 readline stream，不再阻塞 Node 事件循环；新增 50MB 文件大小上限跳过

---

## v3.5.1 (2026-03-12)

### 优化
- **README 重构** — 精简为 ~400 行引导页，详细教程拆分到 `docs/` 目录
- 修复飞书权限数量描述（8→9 个）
- 飞书排查权限表补全 `contact:user.employee_id:readonly`
- 修复 Sandbox 锚点链接
- 插入 mascot 图片
- OpenClaw Hub 链接统一为 OpenClaw Skill 生态
- `clawdhub install` 命令更新为 `openclaw skill install`
- 基础篇/进阶篇 txt 转 markdown 格式（`docs/tutorial-basics.md`、`docs/tutorial-advanced.md`）
- 新增 `docs/` 文档索引和多个拆分文档

---

## v3.5 (2026-03-12)

### 新功能
- **预装 7 个 Skill** — weather / github / notion / hacker-news / browser-use / quadrants / openviking
- **飞书配置全面优化** — 所有示例统一 dmPolicy/groupPolicy/botName，权限表补全到 8 项
- **GUI 品牌可配置** — 通过 `VITE_BRAND_NAME` 环境变量自定义品牌名
- **install.sh 安装后自动运行 doctor.sh** 健康检查
- **新增 CONTRIBUTING.md** 贡献指南和 skills/README.md 索引

### Bug 修复
- README 飞书配置示例缺 groupPolicy、结构过时（appId 不在 accounts 里）
- README/README_EN 排查指南权限表从 3 个补全到 8 个
- README 架构图司礼监标注 (main) → (silijian)
- Court.tsx core agent filter 未包含 silijian
- openclaw.example.json 缺少翰林院的 Discord account 和 binding
- Dockerfile `COPY skills/` 路径硬编码
- docker-compose.yml 移除废弃的 `version: '3.8'`
- 基础篇.txt 云服务商占位符替换为 Oracle Cloud 实际链接

### 优化
- doctor.sh 新增 dmPolicy 和顶层 groupPolicy 检查项
- install.sh 飞书安装指引补权限步骤和文档链接
- README_EN 同步预装 Skill 章节和 60+ Skill 措辞

---

## v3.4 (2026-03-11)

### 新功能
- **飞书配置指南** — 完整的飞书接入文档（500+ 行）
- **doctor.sh 飞书诊断** — 自动检测飞书 appId/appSecret/权限/事件订阅
- **GUI 多框架支持** — 自动检测 OpenClaw/Clawdbot CLI 和配置目录
- **Docker 部署** — Dockerfile + docker-compose + entrypoint 初始化

### Bug 修复
- GUI 部门映射修正（libu=礼部, libu2=吏部）
- GUI 兼容 `.openclaw` 和 `.clawdbot` 配置目录
- GUI 支持 silijian 和 main 两种 agent id
- Dockerfile/docker-compose 路径参数化

---

## v3.0 (2026-03-10)

### 新功能
- **一键安装脚本三合一** — install.sh (Linux) / install-lite.sh / install-mac.sh
- **多部署模式** — Discord 多Bot / 飞书多Bot / 纯 WebUI
- **Web GUI** — React + TypeScript Dashboard（朝堂、会话、Token、Cron 等）
- **OpenViking Skill** — 向量知识库集成
- **Quadrants Skill** — 四象限任务管理

---

## v2.0 (2026-02-22)

### 首次发布
- 三省六部制 × OpenClaw 多 Agent 架构
- 10 Agent 模板（司礼监 + 内阁 + 都察院 + 六部 + 翰林院）
- 内置审批流程（代码→都察院审查，重大决策→内阁审议）
- Discord 多 Bot 模式
- 小红书系列教程配套文字稿
