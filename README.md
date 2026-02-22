# 🏛️ AI 朝廷搭建教程

Clawdbot 朝廷完整教程 - 从零基础到进阶，30 分钟搭建你的 AI 团队！

---

## 📚 教程目录

### 基础篇（30 分钟搭建）
1. 领免费服务器（Oracle Cloud）
2. 连接服务器（SSH）
3. 一键安装 Clawdbot
4. 配置 API Key
5. 搭建朝廷架构
6. 启动并测试
7. 常见问题 Q&A

### 进阶篇（效率提升 500%）
1. tmux - 远程编程神器
2. GitHub 自动化 - 代码自动备份
3. Notion 数据库 - 朝廷自动写奏折
4. cron - 定时任务自动执行
5. Discord - 朝廷总部设置
6. Prompt 技巧 - 让朝廷更懂你

---

## 📥 下载教程

### 完整版（推荐）
- [小红书教程 - 完整版（纯文字）-v2.txt](./小红书教程 - 完整版（纯文字）-v2.txt) - 8000 字完整教程
- [小红书教程 - 完整版（纯文字）-v2.txt.gz](./小红书教程 - 完整版（纯文字）-v2.txt.gz) - 压缩版

### 分篇下载
- [基础篇.txt](./小红书教程 - 基础篇.txt) - 16KB
- [进阶篇.txt](./小红书教程 - 进阶篇.txt) - 43KB

### 其他资料
- [教程修正报告.txt](./教程修正报告.txt) - 修正记录
- [配图指引.md](./小红书教程 - 配图指引.md) - 29 张配图详细说明

---

## 🚀 快速开始

### 1. 获取免费服务器
访问 [Oracle Cloud](https://signup.cloud.oracle.com) 注册账号，领取永久免费云服务器（4 核 24GB）

### 2. 安装 Clawdbot
```bash
# SSH 连接服务器后
sudo npm install -g clawdbot
```

### 3. 配置 API Key
```bash
# 获取 Anthropic API Key：https://console.anthropic.com
echo 'export ANTHROPIC_API_KEY="sk-ant-api03-你的密钥"' >> ~/.bashrc
source ~/.bashrc
```

### 4. 创建朝廷架构
```bash
cd ~/clawd
# 创建 SOUL.md, IDENTITY.md, USER.md
# 配置 clawdbot.json
clawdbot gateway start
```

详细步骤请查看完整教程！

---

## 💡 成本对比

| 方案 | 月成本 | 响应速度 | 专业度 |
|---|---|---|---|
| ChatGPT Plus | ¥149 | 快 | 一般 |
| Claude Pro | ¥160 | 快 | 好 |
| **你的朝廷** | **¥30-50** | 飞快 | **专家级** |

---

## ⚠️ 重要提示

1. **Notion 数据库 ID**：教程中的示例 ID 需要替换为你自己的数据库 ID
2. **Discord Bot 邀请**：按照进阶篇第 5 章的完整流程操作
3. **API Key 安全**：不要泄露你的 API Key 和 Token

---

## 📖 更新日志

### v2.0 (2026-02-22)
- ✅ 修正 Notion 数据库 ID 说明（添加替换提示）
- ✅ 补充 Discord Bot 邀请完整流程
- ✅ 新增 3 个常见问题 Q&A
- ✅ 基础篇检查通过（无需修正）

### v1.0 (2026-02-22)
- 初始版本发布

---

## 🔗 相关链接

- [Clawdbot 官方文档](https://docs.clawd.bot)
- [Clawdbot GitHub](https://github.com/clawdbot/clawdbot)
- [Oracle Cloud 免费套餐](https://www.oracle.com/cloud/free/)
- [Anthropic API](https://console.anthropic.com)
- [tmux 使用指南](https://github.com/tmux/tmux/wiki)

---

## 💬 问题反馈

有问题欢迎在 GitHub Issues 提问，或在小红书评论区留言！

---

**版本：** v2.0  
**更新日期：** 2026-02-22  
**作者：** 菠萝王朝·礼部  
**许可：** MIT
