#!/bin/bash
# ============================================
# 🏛️ AI 朝廷一键部署脚本
# 适用于 Oracle Cloud ARM / Ubuntu 22.04+
# ============================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}🏛️  AI 朝廷一键部署${NC}"
echo "================================"
echo ""

# ---- 1. 系统更新 ----
echo -e "${YELLOW}[1/6] 系统更新...${NC}"
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# ---- 2. 防火墙 ----
echo -e "${YELLOW}[2/6] 配置防火墙...${NC}"
# Oracle Cloud 默认 iptables 规则会阻断流量，清掉
sudo iptables -F INPUT 2>/dev/null || true
sudo iptables -F FORWARD 2>/dev/null || true
sudo netfilter-persistent save 2>/dev/null || true

# ---- 3. Swap（小内存机器需要）----
echo -e "${YELLOW}[3/6] 配置 Swap...${NC}"
if [ ! -f /swapfile ]; then
    sudo fallocate -l 4G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab > /dev/null
    echo -e "  ${GREEN}✓ 4GB Swap 已创建${NC}"
else
    echo -e "  ${GREEN}✓ Swap 已存在，跳过${NC}"
fi

# ---- 4. Node.js ----
echo -e "${YELLOW}[4/6] 安装 Node.js 22...${NC}"
if command -v node &>/dev/null && [[ "$(node -v)" == v22* ]]; then
    echo -e "  ${GREEN}✓ Node.js $(node -v) 已安装${NC}"
else
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - > /dev/null 2>&1
    sudo apt-get install -y nodejs -qq
    echo -e "  ${GREEN}✓ Node.js $(node -v) 安装完成${NC}"
fi

# ---- 5. Clawdbot ----
echo -e "${YELLOW}[5/6] 安装 Clawdbot...${NC}"
if command -v clawdbot &>/dev/null; then
    CURRENT_VER=$(clawdbot --version 2>/dev/null || echo "unknown")
    echo -e "  ${GREEN}✓ Clawdbot 已安装 ($CURRENT_VER)，更新中...${NC}"
fi
sudo npm install -g clawdbot --loglevel=error
echo -e "  ${GREEN}✓ Clawdbot $(clawdbot --version 2>/dev/null) 安装完成${NC}"

# ---- 6. 初始化工作区 ----
echo -e "${YELLOW}[6/6] 初始化朝廷工作区...${NC}"
WORKSPACE="$HOME/clawd"
mkdir -p "$WORKSPACE"
cd "$WORKSPACE"

# 下载朝廷模板配置
TEMPLATE_URL="https://raw.githubusercontent.com/wanikua/buoluobobo-ai-court-tutorial/main/templates"

# SOUL.md
if [ ! -f SOUL.md ]; then
cat > SOUL.md << 'SOUL_EOF'
# SOUL.md - 朝廷行为准则

## 铁律
1. 废话不要多 — 说重点
2. 汇报要及时 — 做完就说
3. 做事要靠谱 — 先想后做

## 沟通风格
- 中文为主
- 直接说结论，需要细节再展开
SOUL_EOF
echo -e "  ${GREEN}✓ SOUL.md 已创建${NC}"
fi

# IDENTITY.md
if [ ! -f IDENTITY.md ]; then
cat > IDENTITY.md << 'ID_EOF'
# IDENTITY.md - 朝廷架构

## 模型分层
| 层级 | 模型 | 说明 |
|---|---|---|
| 调度层 | Claude Sonnet | 日常对话，快速响应 |
| 执行层（重） | Claude Opus | 编码、深度分析 |
| 执行层（轻） | Qwen Plus | 轻量任务，省钱 |

## 六部
- 兵部：软件工程、系统架构
- 户部：财务预算、电商运营
- 礼部：品牌营销、内容创作
- 工部：DevOps、服务器运维
- 吏部：项目管理、创业孵化
- 刑部：法务合规、知识产权
ID_EOF
echo -e "  ${GREEN}✓ IDENTITY.md 已创建${NC}"
fi

# USER.md
if [ ! -f USER.md ]; then
cat > USER.md << 'USER_EOF'
# USER.md - 关于你

- **称呼:** （填你的称呼）
- **语言:** 中文
- **风格:** 简洁高效
USER_EOF
echo -e "  ${GREEN}✓ USER.md 已创建${NC}"
fi

# clawdbot.json 模板
if [ ! -f clawdbot.json ]; then
cat > clawdbot.json << 'CONFIG_EOF'
{
  "agents": {
    "defaults": {
      "workspace": "~/clawd",
      "model": "anthropic/claude-sonnet-4-5",
      "sandbox": { "mode": "non-main" }
    },
    "list": [
      {
        "id": "main",
        "name": "司礼监",
        "model": "anthropic/claude-sonnet-4-5",
        "sandbox": { "mode": "off" }
      },
      {
        "id": "bingbu",
        "name": "兵部",
        "model": "anthropic/claude-opus-4-6",
        "identity": {"theme": "你是兵部尚书，专精软件工程、系统架构、代码审查。回答用中文，直接给方案。"},
        "sandbox": { "mode": "all", "scope": "agent" }
      },
      {
        "id": "hubu",
        "name": "户部",
        "model": "anthropic/claude-opus-4-6",
        "identity": {"theme": "你是户部尚书，专精财务分析、成本管控、电商运营。回答用中文，数据驱动。"},
        "sandbox": { "mode": "all", "scope": "agent" }
      },
      {
        "id": "libu",
        "name": "礼部",
        "model": "anthropic/claude-sonnet-4-5",
        "identity": {"theme": "你是礼部尚书，专精品牌营销、社交媒体、内容创作。回答用中文，风格活泼。"},
        "sandbox": { "mode": "all", "scope": "agent" }
      }
    ]
  },
  "providers": {
    "anthropic": {
      "apiKey": "YOUR_ANTHROPIC_API_KEY"
    }
  },
  "channels": {
    "discord": {
      "enabled": true,
      "token": "YOUR_DISCORD_BOT_TOKEN",
      "guilds": {
        "YOUR_GUILD_ID": {
          "channels": { "*": { "allow": true } }
        }
      }
    }
  },
  "bindings": [
    {
      "agentId": "bingbu",
      "match": { "channel": "discord", "guildId": "YOUR_GUILD_ID", "peer": { "kind": "channel", "id": "YOUR_BINGBU_CHANNEL_ID" } }
    },
    {
      "agentId": "hubu",
      "match": { "channel": "discord", "guildId": "YOUR_GUILD_ID", "peer": { "kind": "channel", "id": "YOUR_HUBU_CHANNEL_ID" } }
    },
    {
      "agentId": "libu",
      "match": { "channel": "discord", "guildId": "YOUR_GUILD_ID", "peer": { "kind": "channel", "id": "YOUR_LIBU_CHANNEL_ID" } }
    }
  ]
}
CONFIG_EOF
echo -e "  ${GREEN}✓ clawdbot.json 模板已创建${NC}"
fi

# 创建 memory 目录
mkdir -p memory

echo ""
echo "================================"
echo -e "${GREEN}🎉 部署完成！${NC}"
echo "================================"
echo ""
echo "接下来你需要完成以下配置："
echo ""
echo -e "  ${YELLOW}1. 设置 API Key${NC}"
echo "     编辑 ~/clawd/clawdbot.json"
echo "     把 YOUR_ANTHROPIC_API_KEY 替换成你的 Anthropic API Key"
echo "     获取地址：https://console.anthropic.com"
echo ""
echo -e "  ${YELLOW}2. 设置 Discord Bot${NC}"
echo "     a) 访问 https://discord.com/developers/applications"
echo "     b) 创建 Application → Bot → 复制 Token"
echo "     c) 把 YOUR_DISCORD_BOT_TOKEN 替换成你的 Token"
echo "     d) 把 YOUR_GUILD_ID 替换成你的服务器 ID"
echo "     e) 把 YOUR_*_CHANNEL_ID 替换成对应频道 ID"
echo "     f) 邀请 Bot 到你的服务器（需要 Send Messages + Read Messages 权限）"
echo ""
echo -e "  ${YELLOW}3. 启动朝廷${NC}"
echo "     cd ~/clawd"
echo "     clawdbot gateway start"
echo ""
echo -e "  ${YELLOW}4. 验证${NC}"
echo "     clawdbot gateway status"
echo "     然后在 Discord 频道 @你的Bot 说话试试"
echo ""
echo -e "完整教程：${BLUE}https://github.com/wanikua/buoluobobo-ai-court-tutorial${NC}"
echo ""
