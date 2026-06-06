#!/usr/bin/env node
/**
 * Provider Advisor - Agent Provider 分工建议与自动应用
 *
 * 用法：
 *   node scripts/provider-advisor.js recommend --config openclaw.json
 *   node scripts/provider-advisor.js recommend --config openclaw.json --apply
 *   node scripts/provider-advisor.js recommend --config openclaw.json --apply --output new-openclaw.json
 */

const fs = require('fs');
const path = require('path');

const CRITICAL_AGENT_PATTERNS = [
  /^silijian$/,
  /^neige$/,
  /^duchayuan$/,
  /^bingbu$/,
  /^hanlin_zhang$/
];

const OPERATION_AGENT_PATTERNS = [
  /^libu$/,
  /^libu2$/,
  /^gongbu$/,
  /^xingbu$/,
  /^hubu$/,
  /^qijuzhu$/,
  /^guozijian$/,
  /^taiyiyuan$/,
  /^neiwufu$/,
  /^yushanfang$/,
  /^hanlin_/
];

function classifyAgentRole(agentId) {
  if (!agentId) return 'operation';
  if (CRITICAL_AGENT_PATTERNS.some((pattern) => pattern.test(agentId))) {
    return 'critical';
  }
  if (OPERATION_AGENT_PATTERNS.some((pattern) => pattern.test(agentId))) {
    return 'operation';
  }
  return 'operation';
}

function classifyProvider(providerId, provider) {
  const source = `${providerId || ''} ${provider?.baseUrl || ''}`.toLowerCase();
  const isLocal =
    source.includes('localhost') ||
    source.includes('127.0.0.1') ||
    source.includes('0.0.0.0') ||
    source.includes('11434') ||
    source.includes('ollama') ||
    source.includes('local');
  return isLocal ? 'local' : 'cloud';
}

function scoreModel(model, role) {
  const source = `${model?.id || ''} ${model?.name || ''}`.toLowerCase();
  const strongPattern =
    /(strong|reason|pro|ultra|opus|sonnet|gpt-4|gpt-5|claude|r1|70b|72b|32b|deep)/;
  const fastPattern = /(fast|cheap|mini|small|lite|flash|haiku|8b|7b|3b|1\.5b)/;
  const base = role === 'critical' ? 50 : 30;
  const strongScore = strongPattern.test(source) ? 40 : 0;
  const fastScore = fastPattern.test(source) ? 40 : 0;
  const contextScore = Number(model?.contextWindow || 0) > 65536 ? 10 : 0;
  const maxTokenScore = Number(model?.maxTokens || 0) > 4096 ? 5 : 0;
  if (role === 'critical') {
    return base + strongScore + contextScore + maxTokenScore - fastScore;
  }
  return base + fastScore + (strongScore > 0 ? -10 : 0);
}

function pickBestModel(provider, role) {
  const models = provider?.models;
  if (!Array.isArray(models) || models.length === 0) return null;
  const sorted = [...models].sort((a, b) => scoreModel(b, role) - scoreModel(a, role));
  return sorted[0];
}

function normalizeConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid config: expected object');
  }
  if (!config.models || typeof config.models !== 'object') {
    throw new Error('Invalid config: missing models');
  }
  if (!config.models.providers || typeof config.models.providers !== 'object') {
    throw new Error('Invalid config: missing models.providers');
  }
  if (!config.agents || typeof config.agents !== 'object' || !Array.isArray(config.agents.list)) {
    throw new Error('Invalid config: missing agents.list');
  }
  return config;
}

function selectProviders(config) {
  const providers = Object.entries(config.models.providers);
  const localProviders = providers.filter(([providerId, provider]) => classifyProvider(providerId, provider) === 'local');
  const cloudProviders = providers.filter(([providerId, provider]) => classifyProvider(providerId, provider) === 'cloud');
  return {
    local: localProviders[0] || null,
    cloud: cloudProviders[0] || null
  };
}

function recommendProviderSplit(config) {
  normalizeConfig(config);
  const selected = selectProviders(config);
  const warnings = [];

  if (!selected.cloud) {
    warnings.push('No cloud provider detected; critical agents will keep existing model settings.');
  }
  if (!selected.local) {
    warnings.push('No local provider detected; operation agents will fall back to cloud provider.');
  }

  const fallbackCloud = selected.cloud;
  const effectiveLocal = selected.local || fallbackCloud;
  const assignments = config.agents.list.map((agent) => {
    const role = classifyAgentRole(agent.id);
    const targetProviderTuple = role === 'critical' ? fallbackCloud : effectiveLocal;
    if (!targetProviderTuple) {
      return {
        agentId: agent.id,
        role,
        currentModel: agent?.model?.primary || null,
        recommendedModel: agent?.model?.primary || null,
        changed: false,
        reason: 'No provider available, keeping current model.'
      };
    }
    const [providerId, providerConfig] = targetProviderTuple;
    const selectedModel = pickBestModel(providerConfig, role);
    if (!selectedModel) {
      return {
        agentId: agent.id,
        role,
        currentModel: agent?.model?.primary || null,
        recommendedModel: agent?.model?.primary || null,
        changed: false,
        reason: `Provider ${providerId} has no models, keeping current model.`
      };
    }
    const recommendedModel = `${providerId}/${selectedModel.id}`;
    const currentModel = agent?.model?.primary || null;
    return {
      agentId: agent.id,
      role,
      currentModel,
      recommendedModel,
      changed: currentModel !== recommendedModel,
      reason:
        role === 'critical'
          ? 'Critical agent uses stronger cloud model for planning/review quality.'
          : 'Operation agent uses lower-cost local/fast model for routine tasks.'
    };
  });

  return {
    summary: {
      cloudProvider: selected.cloud?.[0] || null,
      localProvider: selected.local?.[0] || null,
      totalAgents: assignments.length,
      changes: assignments.filter((item) => item.changed).length
    },
    warnings,
    assignments
  };
}

function applyRecommendations(config, recommendations) {
  const nextConfig = JSON.parse(JSON.stringify(config));
  const byAgent = new Map(recommendations.assignments.map((item) => [item.agentId, item]));
  nextConfig.agents.list = nextConfig.agents.list.map((agent) => {
    const recommendation = byAgent.get(agent.id);
    if (!recommendation || !recommendation.recommendedModel) return agent;
    return {
      ...agent,
      model: {
        ...(agent.model || {}),
        primary: recommendation.recommendedModel
      }
    };
  });
  return nextConfig;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args[0] || 'help';
  const configIndex = args.indexOf('--config');
  const outputIndex = args.indexOf('--output');
  return {
    command,
    configPath: configIndex >= 0 ? args[configIndex + 1] : null,
    outputPath: outputIndex >= 0 ? args[outputIndex + 1] : null,
    apply: args.includes('--apply')
  };
}

function runCli() {
  const parsed = parseArgs(process.argv);
  if (parsed.command !== 'recommend' || !parsed.configPath) {
    console.log('Provider Advisor');
    console.log('Usage: node scripts/provider-advisor.js recommend --config <openclaw.json> [--apply] [--output <file>]');
    process.exit(parsed.command === 'help' ? 0 : 1);
  }

  const resolvedConfigPath = path.resolve(process.cwd(), parsed.configPath);
  const raw = fs.readFileSync(resolvedConfigPath, 'utf8');
  const config = JSON.parse(raw);
  const recommendations = recommendProviderSplit(config);

  if (!parsed.apply) {
    console.log(JSON.stringify(recommendations, null, 2));
    return;
  }

  const nextConfig = applyRecommendations(config, recommendations);
  const outputPath = parsed.outputPath
    ? path.resolve(process.cwd(), parsed.outputPath)
    : resolvedConfigPath;
  fs.writeFileSync(outputPath, JSON.stringify(nextConfig, null, 2) + '\n', 'utf8');
  console.log(
    `✅ Applied ${recommendations.summary.changes} model recommendation(s) to ${outputPath}`
  );
}

if (require.main === module) {
  runCli();
}

module.exports = {
  classifyAgentRole,
  classifyProvider,
  recommendProviderSplit,
  applyRecommendations
};
