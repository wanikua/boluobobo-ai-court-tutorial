# Credits & Attribution / 致谢

## Original Project / 原始项目

> **This project is built upon [AI 朝廷](https://github.com/wanikua/boluobobo-ai-court-tutorial)
> by [@wanikua](https://github.com/wanikua) (菠萝菠菠).**

The original "AI 朝廷" project pioneered the brilliant concept of mapping ancient Chinese
governmental structures to modern AI multi-agent collaboration. First published February 22, 2026.

The Tang Dynasty (唐朝三省六部制) configuration in `regimes/china/tang/` is the original
author's work, preserved unchanged with full attribution.

We extend our deepest gratitude for this creative and inspiring open-source contribution.

## Extended Project / 扩展项目

**CivAgent** (AI 文明) extends the original concept to cover 20 Chinese dynasties
and 37 global empires, creating a universal multi-regime governance platform.

- Fork maintained by [@LeoLin990405](https://github.com/LeoLin990405) — a data professional & online part-time history undergraduate & AI programming enthusiast
- Original concept and Tang Dynasty implementation: [@wanikua](https://github.com/wanikua)

## Runtime Dependency / 运行时依赖

CivAgent uses **[cn-cc-workflow](https://github.com/LeoLin990405/cn-cc-workflow)** (Apache-2.0) as its multi-agent **execution engine**: the `cn:*` civ backends (`cn:doubao`, `cn:glm`, …) are the `cc-*` launchers that project provides. CivAgent stays the orchestration / regime / dashboard layer on top; cn-cc-workflow runs the implementers. See `engine/cn-cc.mjs` (dependency check) and the contract at [cn-cc-workflow/docs/INTEGRATIONS.md](https://github.com/LeoLin990405/cn-cc-workflow/blob/main/docs/INTEGRATIONS.md).

> Two clean repos (not merged): licenses differ (CivAgent MIT, cn-cc-workflow Apache-2.0). Install the engine: `git clone https://github.com/LeoLin990405/cn-cc-workflow && cd cn-cc-workflow && ./backends/install.sh`.

## Inspirations & Key References / 灵感来源 & 主要参考

- **[@wanikua](https://github.com/wanikua)** — The original [AI 朝廷](https://github.com/wanikua/boluobobo-ai-court-tutorial) project that started it all
- **[Sid Meier's *Civilization*](https://civilization.com/)** — The "choose your civilization" concept that inspired CivAgent's core interaction model

### Chinese Political History / 中国政治制度史
- 钱穆《中国历代政治得失》 — 五代政治制度的经典对比分析，本项目最核心的灵感
- 钱穆《国史大纲》 · 吕思勉《中国制度史》 · 白钢 主编《中国政治制度史》
- 阎步克《品位与职位》 · 田余庆《东晋门阀政治》 · 黄仁宇《万历十五年》
- 杨宽《战国史》 · 姚大力《读史的智慧》 · 陈寅恪《唐代政治史述论稿》《隋唐制度渊源略论稿》
- 邓小南《祖宗之法》 · 萧启庆《蒙元史新研》 · 茅海建《天朝的崩溃》

### Western Political Theory / 西方政治理论
- Aristotle, *Politics* · Montesquieu, *The Spirit of the Laws*
- Max Weber, *Economy and Society* · S.N. Eisenstadt, *The Political Systems of Empires*
- Francis Fukuyama, *The Origins of Political Order*
- Charles Tilly, *Coercion, Capital, and European States*
- Douglass North, *Institutions, Institutional Change and Economic Performance*
- Perry Anderson, *Lineages of the Absolutist State*
- Samuel Huntington, *Political Order in Changing Societies*

### Multi-Agent Systems & Organizational Theory / 多 Agent 系统 & 组织理论
- Wooldridge & Jennings, "Intelligent Agents: Theory and Practice" (1995)
- Dorri et al., "Multi-Agent Systems: A Survey" (2018)
- Herbert Simon, *Administrative Behavior* (1947)
- Henry Mintzberg, *The Structuring of Organizations* (1979)

### Courses & Documentaries / 课程 & 纪录片
- Yale Open Courses: Donald Kagan (*Ancient Greek History*), Steven B. Smith (*Political Philosophy*)
- HarvardX ChinaX · 中国大学 MOOC 北京大学 (阎步克、邓小南)
- BBC *The Story of China* (Michael Wood) · CCTV《中国通史》· PBS *Empires* series

Full reference list (with per-regime citations): see [灵感来源 & 参考文献](./README.md#灵感来源--参考文献) in README

## Framework

Built on [OpenClaw](https://github.com/openclaw/openclaw) by the OpenClaw team.

## License

MIT License — same as the original project.
