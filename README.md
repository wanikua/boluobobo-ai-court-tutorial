# 🏛️ 30 分钟搭建你的 AI 朝廷

用一台免费服务器 + Clawdbot，搭建一个 AI 团队帮你干活。

写代码、管财务、搞营销、写日报——你只需要发一条消息。

![系统架构](./images/flow-architecture.png)

---

## 一键部署

领好 [Oracle Cloud 免费服务器](https://www.oracle.com/cloud/free/) 后，SSH 连上，跑这一行：

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/wanikua/buoluobobo-ai-court-tutorial/main/install.sh)
```

脚本会自动完成：
- ✅ 系统更新 + 防火墙配置
- ✅ 4GB Swap
- ✅ Node.js 22 安装
- ✅ Clawdbot 安装
- ✅ 朝廷工作区初始化（SOUL.md / IDENTITY.md / clawdbot.json）

跑完后你只需要填两样东西：
1. **Anthropic API Key** → [console.anthropic.com](https://console.anthropic.com)
2. **Discord Bot Token** → [discord.com/developers](https://discord.com/developers/applications)

然后 `clawdbot gateway start`，朝廷就上线了。

---

## 这是什么？

一个 **多 AI 协作系统**，灵感来自明朝六部制度：

- **兵部** — 写代码、搞架构（Claude Opus）
- **户部** — 算账、管预算（Claude Opus）
- **礼部** — 写文案、搞营销（Claude Sonnet）
- **工部** — 运维、部署
- **吏部** — 项目管理
- **刑部** — 法务合规

每个"部门"是一个独立的 AI Agent，绑定到 Discord 不同频道。
在兵部频道问代码问题 → 编程专家回答。
在户部频道聊财务 → 财务专家回答。

![朝廷架构](./images/discord-architecture.png)

---

## 费用

| 项目 | 费用 |
|---|---|
| Oracle Cloud 服务器 | **免费**（永久，ARM 4核 24GB） |
| Anthropic API | 约 **¥30-50/月** |
| Discord | 免费 |

对比 ChatGPT Plus ¥149/月，更便宜，还能同时跑多个专家。

---

## 详细教程

如果你想了解每一步的细节，看这些：

| 文件 | 内容 |
|---|---|
| [基础篇](./小红书教程%20-%20基础篇.txt) | 从零开始：申请服务器 → 安装 → 配置 → 跑起来 |
| [进阶篇](./小红书教程%20-%20进阶篇.txt) | tmux、GitHub、Notion、定时任务、Discord 集成 |
| [配图指引](./小红书教程%20-%20配图指引.md) | 每一步该截什么图 |

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

v3.1 | MIT License
