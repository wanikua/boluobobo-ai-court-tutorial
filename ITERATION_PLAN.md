# CivAgent 优化迭代计划（三方协作）

> 制定日期：2026-05-28 · 基线版本：v5.0.1 (`3c5a598`)
> 三方分工：**后端 = Claude Code** · **前端 = antigravity** · **审查 = Codex app**
> 本轮首要目标：**工程健壮性**（先让系统真正跑对、跑稳，再谈展示与研究严谨性）

---

## 0. 现状诊断

CivAgent v5 是跑在 Claude Code runtime 上的多智能体编排系统：57 个历史政体（20 中国王朝 + 37 全球帝国），每个政体由 `metadata.json` / `IDENTITY.md` / `SOUL.md` / `openclaw.json.template` 描述，引擎把政体转成 CC 的 `--agents` JSON 并按 6 种编排模式运行；v5 增加了「跨局学习闭环」：隔离 HOME、transcript 记录、对局后把治理经验沉淀成 skill 文件。

**基线健康度（已实测）：**
- ✅ `npm test` 9/9 通过、`lint:syntax` 通过、`validate:regimes` 57/57 通过
- ⚠️ 但测试只覆盖**纯函数**（`validateRegime` / `cleanTranscript` / 注入正则 / `ensureCivHome` 重 seed），**编排层零覆盖**

## 1. 核心问题清单（按严重度 + 本轮优先级排序）

| # | 问题 | 位置 | 严重度 | 本轮处理 |
|---|---|---|---|---|
| P0-1 | **锦标赛并发 bug**：并行跑各文明时靠全局 `~/.civagent/.active-regime` 文件传递当前政体，`Promise.all` 内互相覆盖 → 多个文明可能实际跑成同一个 | `engine/v5/tournament.mjs:30-50` + `bin/civagent:139-148` | P0 | ✅ 后端 R1 |
| P0-2 | **硬编码 Gemini**：裁判（tournament）与 skill 审稿（sediment）都直接 `spawnSync("gemini", ...)`，违反「禁用 Gemini」硬规矩；team 配置里 `civ-athens` 后端也是 gemini | `tournament.mjs:61`、`skill-sediment.mjs:91`、teams/civagent-v5 | P0 | ✅ 后端 R1 |
| P0-3 | **多模型后端没接通**：team 配置给每个文明指定 doubao/mimo/codex 等后端，但 `run-v5.mjs` 永远只 `spawn("claude")`，配置形同虚设 | `engine/v5/run-v5.mjs:67` | P0 | ✅ 后端 R1 |
| P1-1 | **编排层零测试**：tournament / run-v5 / 多后端路由没有任何单测或集成测试，回归无保护 | `test/` | P1 | ✅ 后端 R1 |
| P1-2 | **transcript 脆弱**：只把 CC stdout 原始 chunk 落成 JSONL，无对局元数据、无结构化轮次；既难复现也无法喂前端 | `run-v5.mjs:69-73` | P1 | ✅ 后端 R1（前端依赖） |
| P1-3 | **外部调用无重试/静默失败**：codex/gemini 调用 300s 超时但失败即 throw；sediment 失败只 `console.error` 吞掉 | `skill-sediment.mjs:42-54`、`run-v5.mjs:85-87` | P1 | ✅ 后端 R1 |
| P2-1 | `cmd_setup` 仍在检测 gemini、未检测 opencode；provider 清单与硬规矩不一致 | `bin/civagent:230-235`、`engine/models/providers.json:5` | P2 | ✅ 后端 R1 |
| P2-2 | 政体→单 agent 的制度压缩（多部门拍成一个 SOUL.md）；REVIEW-FINDINGS 里 Byzantine/Roman/Prussia/Ottoman 的史实问题待修 | `regimes/*`、`REVIEW-FINDINGS-v5.md` | P2 | R2+（非健壮性，延后） |
| P2-3 | `skill-sediment` 测试靠**手抄复制**正则（注释明说"drift 时 CI 才发现"），易与实现脱节 | `test/skill-sediment.test.mjs:4-7` | P2 | ✅ 后端 R1（顺手） |

---

## 2. 三方分工总览

```
            ┌─────────────────────────────────────────────────┐
            │  Claude Code (后端 + 集成 + 质量门)               │
            │  ├ 引擎健壮性：并发/后端路由/去 Gemini/测试       │
            │  └ 定义并实现 前端↔后端 数据契约（事件流 + 读 API）│
            └───────────────┬─────────────────────────────────┘
                            │ 契约 = schemas/*.json + 本地读 API
            ┌───────────────┴───────────────┐
            ▼                               ▼
   ┌──────────────────┐          ┌──────────────────────┐
   │ antigravity (前端)│          │ Codex app (审查)      │
   │ 按序三形态：       │          │ 交叉审：后端←Codex     │
   │ ① 观战 Dashboard  │  ◀────▶  │        前端←Codex      │
   │ ② 政体可视化       │          │ R1 重点：并发安全/     │
   │ ③ 全功能控制台     │          │ provider 抽象/注入防护 │
   └──────────────────┘          └──────────────────────┘
```

**交叉审查矩阵**（遵循 CLAUDE.md 规约 + 禁用 Gemini）：

| 谁写的 | 谁审查 |
|---|---|
| 后端（Claude Code） | **Codex app**（主），opencode `reviewer`（备） |
| 前端（antigravity） | **Codex app** |
| 不合格 | 打回改 prompt，最多 2 轮；2 轮不过 Claude Code 自己接管 |

---

## 3. 后端路线图（Claude Code 负责）

### Round 1 — 工程健壮性（本轮重点，全部 P0/P1）

> 原则：**先建测试护栏，再改编排**。每个任务都带可执行验收标准。

**B1 · 去除 Gemini，裁判/审稿走可插拔 provider**
- 新增 `engine/v5/judge.mjs`：抽象「评审 provider」，默认 `codex exec`，备选 opencode `reviewer`；provider 从 `engine/models/providers.json` 读，禁止任何 `gemini` 兜底。
- 改 `tournament.mjs:61` 与 `skill-sediment.mjs:91`：调用 `judge.mjs`，删除 `spawnSync("gemini",...)`。
- 改 `providers.json`：`strong[]` 移除 gemini 条目，`research.alt`/`long_context` 用 cn:kimi、cn:mimo 取代 gemini。
- 改 team 配置 `civ-athens` 后端 gemini → codex 或 cn:glm（雅典民主多模型投票里换非 gemini 成员）。
- **验收**：全仓 `grep -ri gemini engine/ bin/ test/` 仅剩文档说明；裁判/审稿在无 gemini 二进制时仍可跑。

**B2 · 修锦标赛并发 bug**
- `tournament.mjs` 不再 `civagent switch` + `run --v5`（依赖全局 `.active-regime`）。改为**直接** `spawn("node", ["engine/v5/run-v5.mjs", regime, task])`——`run-v5.mjs` 本来就接受 regime 作参数，每个文明进程自带隔离 HOME，天然并发安全。
- `bin/civagent switch` 保留给交互单局；锦标赛路径与它解耦。
- **验收**：新增集成测试，并行跑 3 个 mock 文明，断言各自 transcript 的 regime 标记互不串台。

**B3 · 接通多模型后端**
- `run-v5.mjs` 增加 `--backend <id>` / 读 regime 配置里的 `backend` 字段，按 `providers.json` 映射到真实命令（`claude` / `cc-doubao` / `cc-mimo` / `codex` …）而非写死 `claude`。
- backend 不可用时 fail-fast 并给出清晰提示（不要静默退回 claude）。
- **验收**：`civagent run --v5 --backend cc-doubao "..."` 实际起 doubao；缺二进制时报错明确。

**B4 · 结构化 transcript / 事件流（前端依赖，先行交付契约）**
- 定义 `schemas/match-event.schema.json`：对局事件统一格式
  ```jsonc
  // 每行一个事件（JSONL），字段稳定供前端消费
  { "matchId","regime","backend","ts","type", // type: match_start|turn|tool|judge|skill|match_end
    "seq","actor","text","meta" }
  ```
- `run-v5.mjs` 落 `~/.civagent/matches/<matchId>/events.jsonl` + `meta.json`（regime/backend/task/起止/退出码）。
- `tournament.mjs` 落 `~/.civagent/tournaments/<id>/manifest.json`（参赛文明、各自 matchId、裁判结果指针）。
- **验收**：事件文件通过 schema 校验；旧 `cleanTranscript` 仍兼容老格式。

**B5 · 编排层测试覆盖（补 P1-1 / P2-3）**
- 新增 `test/tournament.test.mjs`、`test/run-v5.test.mjs`、`test/judge.test.mjs`：用 mock 后端（一个回声脚本冒充 claude/codex）跑通编排，不依赖真实模型。
- 修 `test/skill-sediment.test.mjs`：从 `skill-sediment.mjs` **import** 真实 helper，删掉手抄副本。
- **验收**：`npm test` 覆盖编排关键路径；CI 里 mock 后端可跑（不需真实 API key）。

**B6 · 错误处理 / 超时 / 重试**
- `judge.mjs` 与 sediment 外部调用：超时可配、失败重试 1 次、最终失败写入事件流（`type: judge`/`skill` + `error` 字段）而非静默吞。
- `run-v5.mjs` sediment 失败要在 meta.json 标记 `sediment: "failed: <reason>"`。
- **验收**：注入一个必失败的 fake provider，断言对局不崩、错误被记录。

**B7 · setup / provider 清单对齐**
- `cmd_setup` 删 gemini 检测，加 opencode（`reviewer` agent）与 `cc-*` 全家桶探测；输出与 `providers.json` 一致。
- **验收**：`civagent setup` 不再提示 gemini，准确反映可用后端。

### Round 2 — 评测严谨性 + 学习闭环质量（前端②上线后并行）
- 多裁判 / 盲评：N 个非 gemini provider 各打分后聚合，消除单裁判偏差（解决 V5-DESIGN 里"裁判=单一 gemini"的可信度问题）。
- skill 沉淀质量度量：去重相似 skill、跨局重复 pattern 检测、沉淀产出率指标。
- 对局可复现：固定题库 + 记录 provider/版本/seed，支持 `civagent replay <matchId>`。

### Round 3 — 控制台后端能力（前端③上线）
- 写 API：发起对局/锦标赛、在线编辑 regime（带 schema 校验 + 史实审稿入环）、管理 skill 库（启用/禁用/删除）。
- 安全：写操作鉴权、regime 编辑的注入/越权防护（复用现有注入正则 + 路径校验）。

---

## 4. 前端路线图（antigravity 负责，三形态按序一个一个来）

> **统一契约**：前端**只读** `~/.civagent/` 下的结构化文件（B4 定义的 schema），或后端提供的本地只读 HTTP/JSON API。前端不直接调模型、不直接读写 regime 源文件（R3 写操作走后端 API）。技术栈 antigravity 自选（建议 Vite + 轻框架），但须吃 `schemas/*.json` 契约。

### 形态 ① 对局观战 Dashboard（R1，最先做）
- 实时看 N 个文明并行跑同一题：并排面板、流式 transcript（消费 `events.jsonl`）。
- 裁判评分榜（消费 tournament `manifest.json` + 裁判结果）。
- skill 沉淀时间线 + 历史对局回放（消费 `matches/<id>/`）。
- **依赖**：后端 B4 事件流契约 + 一个最小读 API（B4 附带交付）。
- **验收**：跑一场 4 文明锦标赛，Dashboard 实时显示 4 路 transcript + 终评榜。

### 形态 ② 政体可视化浏览器（R2）
- 57 政体图谱：组织架构图（从 `IDENTITY.md` 角色表渲染）、6 种编排模式对比、政体/制度关系网。
- 偏教学/展示，纯读 `regimes/` + `metadata.json`。

### 形态 ③ 全功能控制台（R3）
- 在 ①② 基础上加：发起对局/锦标赛、在线编辑 regime、管理 skill 库。
- 所有写操作走后端 R3 的写 API（带鉴权 + 校验）。

---

## 5. 审查机制（Codex app 负责）

- **每轮每个 PR 必过 Codex 审**，后端代码与前端代码都审。
- **R1 后端审查重点**（对应首要目标=健壮性）：
  1. 并发安全：B2 是否真正消除全局状态竞态（构造并行场景验证）。
  2. provider 抽象正确性 + **全仓无残留 gemini 调用**（硬规矩）。
  3. 多后端路由：缺二进制是否 fail-fast、不静默退回。
  4. 注入防护：B4 新事件流 / R3 regime 编辑是否绕过现有注入正则。
  5. 测试有效性：mock 是否真覆盖编排路径，还是只是"绿而无效"。
- **R1 前端审查重点**：是否严格只读契约、是否硬编码路径、XSS（transcript 原样渲染）。
- 流程：不合格打回 → 改 prompt 重试（≤2 轮）→ 仍不过 Claude Code 接管。

---

## 6. 里程碑

| 轮次 | 后端（Claude Code） | 前端（antigravity） | 审查（Codex app） | 完成标志 |
|---|---|---|---|---|
| **R1** | B1–B7 健壮性 + B4 契约 | 形态① 观战 Dashboard | 并发/去 gemini/路由/测试 | 4 文明锦标赛跑对跑稳 + Dashboard 实时观战 + 全绿测试 |
| **R2** | 多裁判盲评 + 沉淀质量 + replay | 形态② 政体可视化 | 评测偏差/复现性 | 裁判无单点偏差、对局可复现 |
| **R3** | 写 API + 安全 | 形态③ 全功能控制台 | 鉴权/越权/注入 | 控制台可发起对局并管理 regime/skill |

## 7. 待决策 / 风险

- **Git 工作流**（硬规矩）：每次开 PR/合并前先 `git fetch` + merge/rebase `origin/main` 再 push，避免分叉冲突。本计划文件与各轮改动均走分支 + PR。
- **team 配置归属**：`~/.claude/teams/civagent-v5/config.json` 在仓库外，B1 改 `civ-athens` 后端需同步更新它（不在 git 里，单独维护）。
- **史实修订（P2-2）** 明确延后到 R2+，不混进健壮性轮，避免 PR 过大。
- **前端技术栈** 由 antigravity 定，但必须以 `schemas/*.json` 为唯一契约，避免前后端耦合。

---

_本文件是三方协作的单一事实源。每轮开工前先读它，完成后由 Claude Code 更新进度与勾选项。_
