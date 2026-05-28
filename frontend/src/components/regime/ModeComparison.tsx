import React, { useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import type { RegimeDetail } from '../../types/api';

interface ModeComparisonProps {
  regimes: RegimeDetail[];
}

interface PatternInfo {
  id: string;
  zhName: string;
  enName: string;
  description: string;
  color: string;
  borderColor: string;
}

const PATTERNS_CATALOG: PatternInfo[] = [
  {
    id: 'centralized',
    zhName: '星型中央集权制',
    enName: 'Centralized Star Topology',
    description: '由中心单一协调者直接下达指令、直辖所有执行节点，决策效率与执行速度极高，但缺乏容错与分布式制衡。',
    color: 'rgba(255, 46, 147, 0.08)',
    borderColor: 'rgba(255, 46, 147, 0.35)',
  },
  {
    id: 'checks-and-balances',
    zhName: '分权制衡管道制',
    enName: 'Checks & Balances Pipeline',
    description: '采用起草、审核、执行等管道式级联流程与否决权反馈环，具有高度容错与纠错机制，适用于重特大高危决策。',
    color: 'rgba(255, 215, 0, 0.08)',
    borderColor: 'rgba(255, 215, 0, 0.35)',
  },
  {
    id: 'democratic',
    zhName: '民主合议投票制',
    enName: 'Democratic Voting Consensus',
    description: '平行多智能体协作合议，通过多种投票计票表决算法汇聚共识，重视过程正当性与偏好分散对齐。',
    color: 'rgba(0, 240, 255, 0.08)',
    borderColor: 'rgba(0, 240, 255, 0.35)',
  },
  {
    id: 'dual-track',
    zhName: '双轨相互独立制',
    enName: 'Dual-Track Redundancy',
    description: '两条或多条互相独立的平行执行/决策链条并行，提供高度的信息冗余、独立监管与决策双向热备份。',
    color: 'rgba(189, 0, 255, 0.08)',
    borderColor: 'rgba(189, 0, 255, 0.35)',
  },
  {
    id: 'federation',
    zhName: '联邦分布式自治',
    enName: 'Federation Decentralization',
    description: '中心协调枢纽与各异构自治子节点并存，极具弹性，适用于局部高度专业化与高度差异性的分布式场景。',
    color: 'rgba(57, 255, 20, 0.08)',
    borderColor: 'rgba(57, 255, 20, 0.35)',
  },
  {
    id: 'theocratic',
    zhName: '神权对齐解释制',
    enName: 'Theocratic Alignment Hierarchy',
    description: '基于一致性最高宪法/原则，带有单一神学或终极解释权的层级治理，确保执行层绝对信仰与价值对齐。',
    color: 'rgba(251, 191, 36, 0.08)',
    borderColor: 'rgba(251, 191, 36, 0.35)',
  },
];

export const ModeComparison: React.FC<ModeComparisonProps> = ({ regimes }) => {
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);

  // Group regimes by pattern
  const getRegimesByPattern = (patternId: string) => {
    return regimes.filter(r => r.metadata?.orchestrationPattern === patternId);
  };

  // Get max count for chart scaling
  const maxCount = Math.max(...PATTERNS_CATALOG.map(p => getRegimesByPattern(p.id).length), 1);

  const toggleExpand = (patternId: string) => {
    if (expandedPattern === patternId) {
      setExpandedPattern(null);
    } else {
      setExpandedPattern(patternId);
    }
  };

  return (
    <div className="space-y-6 overflow-y-auto max-h-[500px] pr-2 scroll-fade-y animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxHeight: '500px', overflowY: 'auto' }}>
      
      {/* Top Section: Quick bar chart */}
      <div className="glass-panel p-5 bg-[rgba(10,11,16,0.35)] border-[rgba(255,255,255,0.05)] rounded-xl" style={{ padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(10,11,16,0.35)' }}>
        <div className="flex items-center gap-2 mb-4 text-[var(--accent-cyan)] font-heading" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', marginBottom: '16px' }}>
          <BarChart3 size={15} />
          <h4 className="text-xs font-bold uppercase tracking-wider">
            CANONICAL ORCHESTRATION DISTRIBUTION
          </h4>
        </div>

        {/* Dynamic bar charts */}
        <div className="space-y-3.5" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {PATTERNS_CATALOG.map((p) => {
            const list = getRegimesByPattern(p.id);
            const percent = ((list.length / maxCount) * 100).toFixed(0);
            
            return (
              <div key={p.id} className="space-y-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)]" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>{p.zhName} ({p.id})</span>
                  <span className="font-mono">{list.length} Regimes ({percent}%)</span>
                </div>
                {/* Visual Bar container */}
                <div className="w-full bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] h-3 rounded-full overflow-hidden" style={{ width: '100%', height: '12px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '999px' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percent}%`,
                      height: '100%',
                      background: `linear-gradient(to right, ${p.borderColor.replace('0.35', '0.2')}, ${p.borderColor.replace('0.35', '0.8')})`,
                      boxShadow: `0 0 10px ${p.borderColor.replace('0.35', '0.4')}`
                    }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mode Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {PATTERNS_CATALOG.map((p) => {
          const list = getRegimesByPattern(p.id);
          const isExpanded = expandedPattern === p.id;

          return (
            <div
              key={p.id}
              className="glass-panel p-5 flex flex-col justify-between transition-all"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '20px',
                borderRadius: '12px',
                backgroundColor: p.color,
                borderColor: p.borderColor,
                boxShadow: `0 0 15px ${p.borderColor.replace('0.35', '0.04')}`
              }}
            >
              <div className="space-y-3" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Header */}
                <div className="flex items-center justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]" style={{ fontSize: '14px', fontWeight: 700 }}>
                      {p.zhName}
                    </h3>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider block">
                      {p.enName}
                    </span>
                  </div>
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs"
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${p.borderColor}`,
                      color: p.borderColor.replace('0.35', '1')
                    }}
                  >
                    {list.length}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed" style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  {p.description}
                </p>
              </div>

              {/* Collapsible Regimes trigger */}
              <div className="border-t border-[rgba(255,255,255,0.05)] pt-3.5 mt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '14px', marginTop: '20px' }}>
                <button
                  onClick={() => toggleExpand(p.id)}
                  className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-muted)] hover:text-white uppercase tracking-wider"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, background: 'none', border: 'none' }}
                >
                  {isExpanded ? (
                    <>
                      Hide Regimes <ChevronUp size={12} />
                    </>
                  ) : (
                    <>
                      Show Mapped Regimes ({list.length}) <ChevronDown size={12} />
                    </>
                  )}
                </button>

                {/* Expanded list of chips */}
                {isExpanded && (
                  <div className="flex flex-wrap gap-1.5 mt-3 animate-fade-in" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
                    {list.map((r) => {
                      const name = r.id.split('/').pop()?.replace('-', ' ') || '';
                      const isChina = r.metadata?.region === 'china';

                      return (
                        <span
                          key={r.id}
                          className="text-[9px] px-2 py-0.5 rounded font-mono border"
                          style={{
                            fontSize: '9px',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(0,0,0,0.25)',
                            borderColor: isChina ? 'rgba(0,240,255,0.15)' : 'rgba(189,0,255,0.15)',
                            color: isChina ? 'var(--accent-cyan)' : '#d8b4fe'
                          }}
                        >
                          {name}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
export default ModeComparison;
