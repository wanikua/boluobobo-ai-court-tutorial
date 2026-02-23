# 🏛️ 30 分钟搭建你的 AI 朝廷

用一台免费服务器 + Clawdbot，搭建一个 AI 团队帮你干活。

写代码、管财务、搞营销、写日报——你只需要发一条消息。

![系统架构](./images/flow-architecture.png)

---

## 这是什么？

一个 **多 AI 协作系统**，灵感来自明朝六部制度：

- **兵部** — 写代码、搞架构
- **户部** — 算账、管预算
- **礼部** — 写文案、搞营销
- **工部** — 运维、部署
- ...还有更多

每个"部门"是一个独立的 AI Agent，各司其职，互不干扰。

![朝廷架构](./images/discord-architecture.png)

---

## 需要什么？

| 项目 | 费用 |
|---|---|
| Oracle Cloud 服务器 | **免费**（永久，4核 24GB） |
| Anthropic API | 约 **¥30-50/月** |
| Discord | 免费 |

对比 ChatGPT Plus ¥149/月，这套方案更便宜，还能同时跑多个专家模型。

---

## 快速开始

```bash
# 1. 申请 Oracle Cloud 免费服务器，SSH 连上

# 2. 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. 安装 Clawdbot
sudo npm install -g clawdbot

# 4. 配置 API Key
echo 'export ANTHROPIC_API_KEY="你的密钥"' >> ~/.bashrc
source ~/.bashrc

# 5. 启动
mkdir -p ~/clawd && cd ~/clawd
clawdbot gateway start
```

详细步骤看下面的教程文件。

---

## 📚 教程

| 文件 | 内容 |
|---|---|
| [基础篇](./小红书教程%20-%20基础篇.txt) | 从零开始：申请服务器 → 安装 → 配置 → 跑起来 |
| [进阶篇](./小红书教程%20-%20进阶篇.txt) | tmux、GitHub、Notion、定时任务、Discord 集成 |
| [配图指引](./小红书教程%20-%20配图指引.md) | 每一步该截什么图 |

## 📝 配套文案

| 文件 | 用途 |
|---|---|
| [文案 - 基础篇](./小红书文案%20-%20基础篇.txt) | 小红书发帖用 |
| [文案 - 进阶篇](./小红书文案%20-%20进阶篇.txt) | 小红书发帖用 |

---

## 核心功能

### 多 Agent 协作
不同频道绑定不同 AI 专家。在兵部频道问代码问题，AI 自动用编程专家回答；在户部频道聊财务，AI 自动切换成财务专家。

### 自动汇报
配置定时任务，AI 每天自动写日报、每周写周报，发到 Discord + 存到 Notion。

### 工具集成
AI 不只是聊天——能写代码（Claude Code）、管仓库（GitHub）、写文档（Notion）、搜信息（浏览器）。

---

## 常见问题

**Q: 需要会写代码吗？**
A: 不需要。教程是复制粘贴级别的，跟着做就行。

**Q: 服务器真的免费吗？**
A: Oracle Cloud 的 Always Free 套餐，ARM 4核 24GB，永久免费。需要信用卡注册但不会扣费。

**Q: 和直接用 ChatGPT 有什么区别？**
A: ChatGPT 是一个通才。这套系统是多个专家——每个 Agent 有自己的专业领域、记忆和工具权限。而且能自动执行任务，不用你手动操作。

**Q: API 费用大概多少？**
A: 日常使用约 ¥30-50/月。轻量任务用便宜模型（Sonnet/Qwen），重要任务才用贵的（Opus）。

---

## 相关链接

- [Clawdbot 官方文档](https://docs.clawd.bot)
- [Clawdbot GitHub](https://github.com/clawdbot/clawdbot)
- [Oracle Cloud 免费套餐](https://www.oracle.com/cloud/free/)
- [Anthropic API](https://console.anthropic.com)

---

## 配套小红书

这套教程配套小红书系列笔记，从概念到实操全覆盖：

[🏛️ 被 5 万+ 人围观的 AI 朝廷，教程来了！](https://www.xiaohongshu.com/explore/699afe4e0000000028008ef0)

---

v3.0 | MIT License
