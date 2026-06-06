const assert = require('assert');
const {
  classifyAgentRole,
  classifyProvider,
  recommendProviderSplit,
  applyRecommendations
} = require('../scripts/provider-advisor');

function createConfig(overrides = {}) {
  return {
    models: {
      providers: {
        'cloud-primary': {
          baseUrl: 'https://api.example.com/v1',
          models: [
            { id: 'fast-model', name: '快速模型', contextWindow: 8192, maxTokens: 2048 },
            { id: 'strong-model', name: '强力模型', contextWindow: 200000, maxTokens: 8192 }
          ]
        },
        'local-ollama': {
          baseUrl: 'http://127.0.0.1:11434/v1',
          models: [
            { id: 'qwen2.5:14b', name: '本地中模型', contextWindow: 32768, maxTokens: 4096 },
            { id: 'qwen2.5:7b', name: '本地轻模型', contextWindow: 32768, maxTokens: 2048 }
          ]
        }
      }
    },
    agents: {
      list: [
        { id: 'neige', model: { primary: 'cloud-primary/fast-model' } },
        { id: 'duchayuan', model: { primary: 'cloud-primary/fast-model' } },
        { id: 'libu', model: { primary: 'cloud-primary/fast-model' } },
        { id: 'gongbu', model: { primary: 'cloud-primary/fast-model' } }
      ]
    },
    ...overrides
  };
}

describe('Provider Advisor', () => {
  it('classifies agent roles correctly', () => {
    assert.strictEqual(classifyAgentRole('neige'), 'critical');
    assert.strictEqual(classifyAgentRole('duchayuan'), 'critical');
    assert.strictEqual(classifyAgentRole('gongbu'), 'operation');
    assert.strictEqual(classifyAgentRole('unknown_agent'), 'operation');
  });

  it('classifies providers correctly', () => {
    assert.strictEqual(
      classifyProvider('local-ollama', { baseUrl: 'http://127.0.0.1:11434/v1' }),
      'local'
    );
    assert.strictEqual(
      classifyProvider('cloud-primary', { baseUrl: 'https://api.example.com/v1' }),
      'cloud'
    );
  });

  it('recommends cloud for critical and local for operation agents', () => {
    const config = createConfig();
    const result = recommendProviderSplit(config);
    const byAgent = new Map(result.assignments.map((item) => [item.agentId, item]));

    assert.strictEqual(result.summary.cloudProvider, 'cloud-primary');
    assert.strictEqual(result.summary.localProvider, 'local-ollama');
    assert.strictEqual(byAgent.get('neige').recommendedModel, 'cloud-primary/strong-model');
    assert.strictEqual(byAgent.get('duchayuan').recommendedModel, 'cloud-primary/strong-model');
    assert.strictEqual(byAgent.get('libu').recommendedModel, 'local-ollama/qwen2.5:7b');
    assert.strictEqual(byAgent.get('gongbu').recommendedModel, 'local-ollama/qwen2.5:7b');
  });

  it('falls back to cloud when no local provider exists', () => {
    const config = createConfig({
      models: {
        providers: {
          'cloud-primary': {
            baseUrl: 'https://api.example.com/v1',
            models: [{ id: 'strong-model', name: '强力模型', contextWindow: 200000, maxTokens: 8192 }]
          }
        }
      }
    });
    const result = recommendProviderSplit(config);
    const libu = result.assignments.find((item) => item.agentId === 'libu');

    assert(result.warnings.some((item) => item.includes('No local provider detected')));
    assert.strictEqual(libu.recommendedModel, 'cloud-primary/strong-model');
  });

  it('applies recommendations without mutating original config', () => {
    const config = createConfig();
    const result = recommendProviderSplit(config);
    const updated = applyRecommendations(config, result);
    const oldNeige = config.agents.list.find((item) => item.id === 'neige');
    const newNeige = updated.agents.list.find((item) => item.id === 'neige');
    const newLibu = updated.agents.list.find((item) => item.id === 'libu');

    assert.strictEqual(oldNeige.model.primary, 'cloud-primary/fast-model');
    assert.strictEqual(newNeige.model.primary, 'cloud-primary/strong-model');
    assert.strictEqual(newLibu.model.primary, 'local-ollama/qwen2.5:7b');
  });
});
