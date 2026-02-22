# 🏛️ AI 朝廷搭建教程

Clawdbot 朝廷完整教程 - 从零基础到进阶，30 分钟搭建你的 AI 团队！

> 📕 配套小红书笔记：[被 5 万+ 人围观的 AI 朝廷，教程来了！](https://www.xiaohongshu.com/explore/699afe4e0000000028008ef0)

---

## 📚 教程文件

| 文件 | 说明 |
|---|---|
| [基础篇](./小红书教程%20-%20基础篇.txt) | 30 分钟从零搭建，含服务器申请、安装、配置 |
| [进阶篇](./小红书教程%20-%20进阶篇.txt) | tmux、GitHub、Notion、cron、Discord 集成 |
| [配图指引](./小红书教程%20-%20配图指引.md) | 29 张配图详细说明 |

## 📝 小红书文案

| 文件 | 说明 |
|---|---|
| [文案 - 基础篇](./小红书文案%20-%20基础篇.txt) | 小红书发帖用文案 |
| [文案 - 进阶篇](./小红书文案%20-%20进阶篇.txt) | 小红书发帖用文案 |

---

## 🚀 快速开始

```bash
# 1. SSH 连接 Oracle Cloud 免费服务器
# 2. 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. 安装 Clawdbot
sudo npm install -g clawdbot

# 4. 配置 API Key
echo 'export ANTHROPIC_API_KEY="你的密钥"' >> ~/.bashrc
source ~/.bashrc

# 5. 初始化并启动
mkdir -p ~/clawd && cd ~/clawd
clawdbot gateway start
```

详细步骤见教程文件。

---

## 🔗 相关链接

- [Clawdbot 官方文档](https://docs.clawd.bot)
- [Clawdbot GitHub](https://github.com/clawdbot/clawdbot)
- [Oracle Cloud 免费套餐](https://www.oracle.com/cloud/free/)
- [Anthropic API](https://console.anthropic.com)

---

**版本：** v3.0  
**更新日期：** 2026-02-22  
**许可：** MIT
