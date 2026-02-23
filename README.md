# 🏛️ 30 分钟搭建你的 AI 朝廷

用一台免费服务器 + Clawdbot，搭建一个 AI 团队帮你干活。

写代码、管财务、搞营销、写日报——你只需要发一条消息。

![系统架构](./images/flow-architecture.png)

---

## 一键部署

领好 [Oracle Cloud 免费服务器](https://www.oracle.com/cloud/free/) 后，SSH 连上，跑这一行：

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/wanikua/boluobobo-ai-court-tutorial/main/install.sh)
```

脚本会自动完成：
- ✅ 系统更新 + Oracle 防火墙清理
- ✅ 4GB Swap
- ✅ Node.js 22
- ✅ GitHub CLI（gh）
- ✅ Clawdbot
- ✅ 朝廷工作区初始化（SOUL.md / IDENTITY.md / clawdbot.json 含多 Agent 模板）

跑完后你只需要填两样东西：
1. **Anthropic API Key** → [console.anthropic.com](https://console.anthropic.com)
2. **Discord Bot Token** → [discord.com/developers](https://discord.com/developers/applications)

然后 `sudo systemctl start clawdbot`，朝廷就上线了（开机自动启动）。

---

## 这是什么？

> 不是框架，不用写代码。是一套开箱即用的私有 AI 团队方案。

跟 AutoGPT / CrewAI / MetaGPT 的区别：它们是开发框架，你得写代码来编排 Agent。
这个是**成品**——跑个脚本就能用，在 Discord 里发消息就能指挥。

一个 **多 AI 协作系统**，灵感来自明朝六部制度：

- **兵部** — 写代码、搞架构（Claude Opus）
- **户部** — 算账、管预算（Claude Opus）
- **礼部** — 写文案、搞营销（Claude Sonnet）
- **工部** — 运维、部署
- **吏部** — 项目管理
- **刑部** — 法务合规

每个"部门"是一个独立的 AI Agent，绑定到 Discord 不同频道：

```
你在 #兵部 频道：帮我写个用户登录的 API
→ 兵部（Opus）：直接给你完整代码 + 架构建议

你在 #户部 频道：这个月 API 花了多少钱
→ 户部（Opus）：按类别列出费用明细 + 优化建议

你在 #礼部 频道：写一条小红书推广文案
→ 礼部（Sonnet）：给你三版文案 + 配图建议
```

一个 Bot，不同频道自动切换专家。你不需要指定找谁，系统自动路由。

![朝廷架构](./images/discord-architecture.png)

---

## 核心能力

### 多 Agent 协作
不同频道绑定不同 AI 专家，一个 Bot 自动路由，不需要手动切换。

### 自动 Prompt 优化
不用手动调 Prompt。每个 Agent 有独立的身份文件，系统自动注入上下文：

```json
"identity": {"theme": "你是兵部尚书，专精软件工程。回答用中文，直接给方案。"}
```

Clawdbot 自动结合行为准则（SOUL.md）、组织架构（IDENTITY.md）和工作区文件，生成完整的系统提示。Agent 越用越懂你——它能读取记忆文件（memory/），自动积累项目知识。

### 工具集成
AI 不只是聊天——能写代码（Claude Code）、管仓库（GitHub）、写文档（Notion）、搜信息（浏览器）、定时执行任务（Cron）。

### 自动汇报
配置 Cron，AI 每天自动写日报、每周写周报，发到 Discord + 存到 Notion，你不用管。

---

## 详细教程

基础篇（服务器申请→安装→配置→跑起来）和进阶篇（tmux、GitHub、Notion、Cron、Discord）见小红书系列笔记。

---

## 常见问题

**Q: 需要会写代码吗？**
不需要。一键脚本搞定安装，配置文件填几个 Key 就行。

**Q: 服务器真的免费吗？**
Oracle Cloud Always Free 套餐，ARM 4核 24GB，永久免费。需要信用卡注册但不扣费。

**Q: 和直接用 ChatGPT 有什么区别？**
ChatGPT 是一个通才。这套系统是多个专家——每个 Agent 有自己的专业领域、记忆和工具权限。能自动写代码、管 GitHub、写 Notion 文档。

**Q: 能用其他模型吗？**
能。Clawdbot 支持 Anthropic、OpenAI、Google、Qwen 等。在 `clawdbot.json` 里改 model 就行。

---

## 相关链接

- [Clawdbot 官方文档](https://docs.clawd.bot)
- [Clawdbot GitHub](https://github.com/clawdbot/clawdbot)
- [Oracle Cloud 免费套餐](https://www.oracle.com/cloud/free/)
- [Anthropic API](https://console.anthropic.com)

---

v3.2 | MIT License
